import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalAppServer } from '../src/local-app-server.mjs';

async function withApp(run) {
  const dataDir=await mkdtemp(join(tmpdir(),'navel-gazer-life-'));
  const app=await createLocalAppServer({host:'127.0.0.1',port:0,dataDir,fetchImpl:async()=>{throw new Error('offline')}});
  const address=await app.listen();
  try { await run('http://127.0.0.1:'+address.port,dataDir); }
  finally { await app.close(); await rm(dataDir,{recursive:true,force:true}); }
}

test('life navigation assets are served from the hardened local app',async()=>{
  await withApp(async base=>{
    const page=await fetch(base+'/life.html');
    assert.equal(page.status,200);
    assert.match(page.headers.get('content-security-policy'),/default-src 'self'/);
    assert.match(await page.text(),/Make your next chapter/);
    assert.equal((await fetch(base+'/life.css')).status,200);
    assert.equal((await fetch(base+'/life.mjs')).status,200);
  });
});

test('life goals require confirmation, persist locally, and reward only confirmed milestones',async()=>{
  await withApp(async(base,dataDir)=>{
    const headers={'content-type':'application/json'};
    const denied=await fetch(base+'/api/life/goals',{method:'POST',headers,body:JSON.stringify({title:'Earn certificate',domain:'education',milestones:['Compare programs']})});
    assert.equal(denied.status,400);

    const created=await fetch(base+'/api/life/goals',{method:'POST',headers,body:JSON.stringify({title:'Earn certificate',domain:'education',milestones:['Compare programs','Enroll'],confirmed:true})});
    assert.equal(created.status,201);
    const goal=(await created.json()).goal;
    assert.equal(goal.status,'active');
    assert.equal(goal.milestones.length,2);

    const unconfirmed=await fetch(base+'/api/life/goals/'+goal.id+'/milestones/'+goal.milestones[0].id,{method:'PATCH',headers,body:JSON.stringify({confirmed:false})});
    assert.equal(unconfirmed.status,400);

    const completed=await fetch(base+'/api/life/goals/'+goal.id+'/milestones/'+goal.milestones[0].id,{method:'PATCH',headers,body:JSON.stringify({confirmed:true,evidenceNote:'Reviewed program requirements'})});
    assert.equal(completed.status,200);
    const summary=(await completed.json()).summary;
    assert.equal(summary.xp,10);
    assert.match(summary.xpBasis,/not a measure of human worth/);

    const stored=JSON.parse(await readFile(join(dataDir,'life-goals.json'),'utf8'));
    assert.equal(stored.schema,'nexus.life-goals.v1');
    assert.equal(stored.goals[0].milestones[0].confirmation,'user-confirmed');

    const deleted=await fetch(base+'/api/life/goals/'+goal.id,{method:'DELETE',headers,body:JSON.stringify({confirmed:true})});
    assert.equal(deleted.status,200);
    const empty=await (await fetch(base+'/api/life/goals')).json();
    assert.equal(empty.goals.length,0);
    assert.equal(empty.summary.xp,0);
  });
});

test('life navigation rejects malformed goals and unknown milestones',async()=>{
  await withApp(async base=>{
    const headers={'content-type':'application/json'};
    const invalid=await fetch(base+'/api/life/goals',{method:'POST',headers,body:JSON.stringify({title:'Bad domain',domain:'surveillance',confirmed:true})});
    assert.equal(invalid.status,400);
    const missing=await fetch(base+'/api/life/goals/unknown/milestones/unknown',{method:'PATCH',headers,body:JSON.stringify({confirmed:true})});
    assert.equal(missing.status,404);
    const deniedDelete=await fetch(base+'/api/life/goals/unknown',{method:'DELETE',headers,body:JSON.stringify({})});
    assert.equal(deniedDelete.status,400);
  });
});
