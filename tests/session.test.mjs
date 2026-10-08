import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversationSession } from '../src/session.mjs';
import { createMemoryRecord, createMemoryStore } from '../src/memory.mjs';
import { createAgentProfile, createAgentMount } from '../src/agent.mjs';

const time = '2026-10-08T12:00:00.000Z';
function agentFor(chat) {
  const profile = createAgentProfile({ id:'session-agent', name:'Session Agent' });
  return createAgentMount({ profile, provider:{ chat } });
}

test('session retains bounded user and assistant history', async () => {
  const agent = agentFor(async ({messages}) => ({content:'reply-' + messages.filter(m => m.role === 'user').length}));
  const session = createConversationSession({ id:'s1', agent, maxMessages:3, clock:() => time });
  assert.equal((await session.send('one')).message.content, 'reply-1');
  await session.send('two');
  assert.equal(session.getMessages().length, 3);
  assert.equal(session.getMessages()[0].content, 'reply-1');
  session.clear();
  assert.deepEqual(session.getMessages(), []);
});

test('session does not save memory automatically and can attach selected memory explicitly', async () => {
  let captured;
  const agent = agentFor(async ({messages}) => { captured = messages; return {content:'noted'}; });
  const store = createMemoryStore({ clock:() => time });
  store.add(createMemoryRecord({ id:'pref1', content:'Prefers concise answers', kind:'preference', createdAt:time }));
  const session = createConversationSession({ id:'s2', agent, memoryStore:store, clock:() => time });
  await session.send('Help me plan');
  assert.equal(store.list().length, 1);
  await session.send('Use my preference', { memoryIds:['pref1'] });
  assert.equal(captured[0].role, 'system');
  assert.match(captured[0].content, /user-selected saved context/);
  assert.match(captured[0].content, /Prefers concise answers/);
  assert.equal(store.list().length, 1);
});

test('session rejects missing selected memory and concurrent sends', async () => {
  const store = createMemoryStore({ clock:() => time });
  const session = createConversationSession({
    id:'s3', agent:agentFor(async () => ({content:'ok'})), memoryStore:store, clock:() => time
  });
  await assert.rejects(session.send('hello', { memoryIds:['missing'] }), error => error.code === 'MEMORY_NOT_AVAILABLE');
  let release;
  const slow = createConversationSession({
    id:'s4',
    agent:agentFor(() => new Promise(resolve => { release = () => resolve({content:'done'}); })),
    clock:() => time
  });
  const pending = slow.send('first');
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(slow.send('second'), error => error.code === 'SESSION_BUSY');
  release();
  await pending;
});

test('session rejects invalid messages and caps history size', async () => {
  const agent = agentFor(async () => ({content:'ok'}));
  assert.throws(() => createConversationSession({ agent, initialMessages:[{role:'tool',content:'x'}] }));
  const session = createConversationSession({ agent, maxMessages:2, clock:() => time });
  await session.send('one');
  await session.send('two');
  assert.equal(session.getMessages().length, 2);
});
