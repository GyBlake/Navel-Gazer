import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalAppServer } from '../src/local-app-server.mjs';

async function withApp(run) {
  const dataDir=await mkdtemp(join(tmpdir(),'navel-gazer-app-'));
  const app=await createLocalAppServer({host:'127.0.0.1',port:0,dataDir,fetchImpl:async()=>{throw new Error('offline')}});
  const address=await app.listen();
  try { await run('http://127.0.0.1:'+address.port); }
  finally { await app.close(); await rm(dataDir,{recursive:true,force:true}); }
}

test('local app serves a hardened UI and reports offline model runner without failing',async()=>{
  await withApp(async base=>{
    const page=await fetch(base+'/');
    assert.equal(page.status,200);
    assert.match(page.headers.get('content-security-policy'),/default-src 'self'/);
    assert.match(await page.text(),/A personal assistant/i);
    const status=await (await fetch(base+'/api/status')).json();
    assert.equal(status.mode,'LOCAL_ONLY');
    assert.equal(status.ollamaConnected,false);
  });
});

test('local app enforces loopback endpoints, explicit memory consent, and conversation deletion',async()=>{
  await withApp(async base=>{
    const remote=await fetch(base+'/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({endpoint:'https://example.com',model:'example:latest'})});
    assert.equal(remote.status,400);
    const memory=await fetch(base+'/api/memory',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({content:'not consented',kind:'fact'})});
    assert.equal(memory.status,400);
    const created=await (await fetch(base+'/api/conversations',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).json();
    const id=created.conversation.id;
    const deleted=await fetch(base+'/api/conversations/'+id,{method:'DELETE'});
    assert.equal(deleted.status,200);
    const missing=await fetch(base+'/api/conversations/'+id);
    assert.equal(missing.status,404);
  });
});

test('local app rejects cross-origin API requests and non-JSON writes',async()=>{
  await withApp(async base=>{
    const cross=await fetch(base+'/api/conversations',{headers:{origin:'https://evil.example'}});
    assert.equal(cross.status,403);
    const invalid=await fetch(base+'/api/conversations',{method:'POST',body:'{}'});
    assert.equal(invalid.status,415);
  });
});

test('personal model profile preferences are validated and persisted with local settings',async()=>{
  await withApp(async base=>{
    const profile={platform:'windows',ramGb:16,priority:'efficient',tasks:['coding','everyday'],toolsPreference:'mcp'};
    const saved=await fetch(base+'/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model:'qwen3:8b',profile})});
    assert.equal(saved.status,200);
    assert.deepEqual((await saved.json()).profile,profile);
    const loaded=await (await fetch(base+'/api/settings')).json();
    assert.deepEqual(loaded.profile,profile);
    const invalid=await fetch(base+'/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({profile:{...profile,toolsPreference:'unrestricted'}})});
    assert.equal(invalid.status,400);
  });
});
