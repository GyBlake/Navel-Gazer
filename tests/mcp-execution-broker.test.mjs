import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMcpExecutionBroker } from '../src/mcp-execution-broker.mjs';

async function withBroker(run) {
  const dir=await mkdtemp(join(tmpdir(),'navel-mcp-broker-'));
  const auditPath=join(dir,'audit.json');
  let approved=true;
  let description='Read a record';
  let calls=0;
  const manager={
    list(){return [{id:'local.notes',name:'Local Notes',connected:true,tools:[{name:'read_record',description,inputSchema:{type:'object',properties:{query:{type:'string'}}},approved}]}];},
    async callTool(id,name,args){calls++;return {serverId:id,serverName:'Local Notes',toolName:name,invokedAt:'2026-10-09T00:00:00.000Z',result:{content:[{type:'text',text:'PRIVATE_RESULT '+args.query}]},untrusted:true};}
  };
  let currentTime=1000;
  const broker=await createMcpExecutionBroker({manager,auditPath,clock:()=>new Date(currentTime).toISOString(),now:()=>currentTime});
  try{await run({broker,auditPath,setApproved:value=>{approved=value;},setDescription:value=>{description=value;},advance:value=>{currentTime+=value;},getCalls:()=>calls});}
  finally{broker.close();await rm(dir,{recursive:true,force:true});}
}

test('MCP broker requires a prepared one-time challenge and records redacted provenance',async()=>{
  await withBroker(async({broker,auditPath,getCalls})=>{
    const proposal=await broker.prepare({serverId:'local.notes',toolName:'read_record',arguments:{query:'PRIVATE_INPUT'}});
    assert.equal(getCalls(),0);
    const result=await broker.execute({challengeId:proposal.challengeId});
    assert.equal(getCalls(),1);
    assert.equal(result.auditRecorded,true);
    await assert.rejects(()=>broker.execute({challengeId:proposal.challengeId}),error=>error.code==='MCP_CHALLENGE_INVALID');
    const records=broker.listAudit({limit:20});
    assert.deepEqual(records.map(record=>record.type),['MCP_TOOL_EXECUTION_COMPLETED','MCP_TOOL_EXECUTION_REQUESTED']);
    assert.ok(records.every(record=>record.evidence.schema==='nexus.evidence.v1'&&record.provenance.schema==='nexus.provenance.v1'));
    const saved=await readFile(auditPath,'utf8');
    assert.equal(saved.includes('PRIVATE_INPUT'),false);
    assert.equal(saved.includes('PRIVATE_RESULT'),false);
    assert.match(saved,/argumentDigest/);
    assert.match(saved,/outputDigest/);
  });
});

test('MCP broker refuses execution if authorization is revoked after preparation',async()=>{
  await withBroker(async({broker,setApproved,getCalls})=>{
    const proposal=await broker.prepare({serverId:'local.notes',toolName:'read_record',arguments:{query:'test'}});
    setApproved(false);
    await assert.rejects(()=>broker.execute({challengeId:proposal.challengeId}),error=>error.code==='MCP_TOOL_DENIED');
    assert.equal(getCalls(),0);
  });
});

test('MCP broker challenges expire and tool-definition changes require a fresh review',async()=>{
  await withBroker(async({broker,advance,setDescription})=>{
    const expired=await broker.prepare({serverId:'local.notes',toolName:'read_record',arguments:{}});
    advance(60_001);
    await assert.rejects(()=>broker.execute({challengeId:expired.challengeId}),error=>error.code==='MCP_CHALLENGE_EXPIRED');
    const changed=await broker.prepare({serverId:'local.notes',toolName:'read_record',arguments:{}});
    setDescription('Delete all records');
    await assert.rejects(()=>broker.execute({challengeId:changed.challengeId}),error=>error.code==='MCP_TOOL_CHANGED');
  });
});
