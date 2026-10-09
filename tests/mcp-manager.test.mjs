import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMcpManager } from '../src/mcp-manager.mjs';

function fakeSpawn() {
  const child=new EventEmitter();
  child.stdout=new PassThrough();child.stderr=new PassThrough();
  child.stdin={write(line){
    const message=JSON.parse(line);
    if(message.id===undefined)return true;
    let result={};
    if(message.method==='initialize')result={protocolVersion:'2025-03-26',capabilities:{tools:{}},serverInfo:{name:'test',version:'1'}};
    if(message.method==='tools/list')result={tools:[{name:'echo',description:'Returns arguments',inputSchema:{type:'object',properties:{value:{type:'string'}}}}]};
    if(message.method==='tools/call')result={content:[{type:'text',text:JSON.stringify(message.params.arguments)}]};
    queueMicrotask(()=>child.stdout.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result})+'\n'));
    return true;
  }};
  child.kill=()=>{if(!child.exited){child.exited=true;child.emit('exit',0,null);}return true;};
  return child;
}
async function withManager(run) {
  const dir=await mkdtemp(join(tmpdir(),'navel-mcp-'));
  const path=join(dir,'mcp-registry.json');
  const manager=await createMcpManager({path,spawnImpl:()=>fakeSpawn(),timeoutMs:1000});
  try{await run(manager,path);}finally{await manager.close();await rm(dir,{recursive:true,force:true});}
}

test('MCP server registration does not launch a process and grants default to deny',async()=>{
  await withManager(async manager=>{
    const server=await manager.add({name:'Example',command:'/trusted/example-mcp',args:['--stdio']});
    assert.equal(server.connected,false);
    assert.deepEqual(server.tools,[]);
    await assert.rejects(()=>manager.callTool(server.id,'echo',{}),/not connected/);
    assert.equal(manager.list().length,1);
  });
});

test('MCP stdio discovery requires explicit per-tool grant before invocation',async()=>{
  await withManager(async manager=>{
    const server=await manager.add({name:'Example',command:'/trusted/example-mcp',args:[]});
    const connected=await manager.connect(server.id);
    assert.equal(connected.connected,true);
    assert.equal(connected.tools.length,1);
    assert.equal(connected.tools[0].approved,false);
    await assert.rejects(()=>manager.callTool(server.id,'echo',{value:'no'}),error=>error.code==='MCP_TOOL_DENIED');
    await manager.setToolGrant(server.id,'echo',true);
    const result=await manager.callTool(server.id,'echo',{value:'yes'});
    assert.equal(result.untrusted,true);
    assert.equal(result.toolName,'echo');
    assert.match(result.result.content[0].text,/yes/);
    await manager.setToolGrant(server.id,'echo',false);
    await assert.rejects(()=>manager.callTool(server.id,'echo',{}),error=>error.code==='MCP_TOOL_DENIED');
  });
});

test('MCP configuration rejects invalid arguments and persists without secrets',async()=>{
  await withManager(async(manager,path)=>{
    await assert.rejects(()=>manager.add({name:'Bad',command:'node',args:[{secret:'no'}]}),/Arguments/);
    const server=await manager.add({name:'Persisted',command:'/trusted/tool',args:['--stdio']});
    const saved=JSON.parse(await (await import('node:fs/promises')).readFile(path,'utf8'));
    assert.equal(saved.schema,'navel-gazer.mcp-registry.v1');
    assert.equal(saved.servers[0].id,server.id);
    assert.deepEqual(saved.servers[0].grants,[]);
    assert.equal(JSON.stringify(saved).includes('secret'),false);
  });
});
