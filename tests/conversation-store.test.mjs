import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createConversationRecord, createConversationStore, createFileConversationStore } from '../src/conversation-store.mjs';
import { createConversationSession, restoreConversationSession } from '../src/session.mjs';
import { createAgentProfile, createAgentMount } from '../src/agent.mjs';

const now='2026-10-08T12:00:00.000Z';
function testAgent(chat=async () => ({content:'answer'}), id='persist-agent') {
  const profile=createAgentProfile({id,name:'Persistence Test Agent'});
  return createAgentMount({profile,provider:{chat}});
}
function record(id='c1', updatedAt=now) {
  return createConversationRecord({id,agentId:'persist-agent',createdAt:now,updatedAt,messages:[{role:'user',content:'hello'}]});
}

test('conversation store validates records and supports listing, export, delete, and retention pruning', async () => {
  const store=createConversationStore({records:[record('old','2026-10-01T00:00:00.000Z'),record('new',now)],clock:()=>now});
  assert.equal(store.list({limit:1})[0].id,'new');
  assert.equal(store.list({agentId:'persist-agent'}).length,2);
  assert.equal(store.export().schema,'nexus.conversation-store.v1');
  assert.equal(await store.pruneBefore('2026-10-05T00:00:00.000Z'),1);
  assert.equal(store.get('old'),undefined);
  assert.equal(await store.delete('new'),true);
  assert.equal(await store.delete('missing'),false);
});

test('file conversation store atomically persists with restrictive file mode and reloads', async () => {
  const dir=await mkdtemp(join(tmpdir(),'navel-gazer-conversations-'));
  const path=join(dir,'nested','sessions.json');
  try {
    const adapter=createFileConversationStore({path});
    const store=await adapter.load({clock:()=>now});
    await store.save(record('saved'));
    const parsed=JSON.parse(await readFile(path,'utf8'));
    assert.equal(parsed.schema,'nexus.conversation-store.v1');
    assert.equal(parsed.records[0].id,'saved');
    const reloaded=await adapter.load({clock:()=>now});
    assert.equal(reloaded.get('saved').messages[0].content,'hello');
  } finally {
    await rm(dir,{recursive:true,force:true});
  }
});

test('session persists user and assistant messages and can be restored', async () => {
  const store=createConversationStore({clock:()=>now});
  const agent=testAgent(async ({messages})=>({content:'reply to '+messages.filter(m=>m.role==='user').length}));
  const session=createConversationSession({
    id:'durable-1',agent,clock:()=>now,onChange:record=>store.save(record)
  });
  await session.send('first message');
  assert.equal(store.get('durable-1').messages.length,2);
  const restored=restoreConversationSession({store,id:'durable-1',agent,clock:()=>now});
  await restored.send('second message');
  assert.equal(store.get('durable-1').messages.length,4);
  await restored.clear();
  assert.deepEqual(store.get('durable-1').messages,[]);
});

test('restore rejects missing conversations and agent mismatch', () => {
  const store=createConversationStore({clock:()=>now});
  assert.throws(()=>restoreConversationSession({store,id:'missing',agent:testAgent()}),error=>error.code==='CONVERSATION_NOT_FOUND');
  assert.throws(()=>restoreConversationSession({store,id:'c1',agent:testAgent()}),error=>error.code==='CONVERSATION_NOT_FOUND');
});

test('failed model request still durably records the submitted user message', async () => {
  const store=createConversationStore({clock:()=>now});
  const session=createConversationSession({
    id:'failed-send',agent:testAgent(async()=>{throw new Error('provider offline')}),clock:()=>now,
    onChange:record=>store.save(record)
  });
  await assert.rejects(session.send('keep this request'));
  assert.deepEqual(store.get('failed-send').messages,[{role:'user',content:'keep this request'}]);
});
