import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthorizationPolicy } from '../src/authorization.mjs';
import { createCapability } from '../src/capability.mjs';
import { createEventLog } from '../src/event.mjs';
import { createRuntime } from '../src/runtime.mjs';
import { createToolDefinition, createToolRegistry, createToolRouter } from '../src/tool-router.mjs';

function setup({ requiresApproval=true, allowed=true }={}) {
  const events = createEventLog();
  const capability = createCapability({ id:'notes.read', action:'read', resourceType:'note' });
  const policy = createAuthorizationPolicy({
    rules: allowed ? [{subject:'personal-assistant',resource:'notes',action:'read',effect:'ALLOW'}] : []
  });
  const runtime = createRuntime({ authorizationPolicy:policy, eventLog:events });
  const registry = createToolRegistry();
  let calls = 0;
  registry.register(createToolDefinition({
    id:'notes.read', description:'Read a note', resource:'notes', resourceType:'note',
    action:'read', capability, requiresApproval, handler:input => { calls += 1; return { noteId:input.noteId }; }
  }));
  return { events, registry, router:createToolRouter({runtime,registry,eventLog:events}), getCalls:()=>calls };
}

test('tool proposal is not execution authority and requires approval by default', () => {
  const {router,getCalls,events} = setup();
  const proposal = router.propose({toolId:'notes.read',input:{noteId:'n1'}});
  assert.equal(router.execute(proposal.id).status,'approval_required');
  assert.equal(getCalls(),0);
  assert.equal(router.getProposal(proposal.id).status,'pending');
  assert.ok(events.list().some(event => event.type === 'TOOL_PROPOSED'));
});

test('explicit approval executes through the governed runtime once', () => {
  const {router,getCalls,events} = setup();
  const proposal = router.propose({toolId:'notes.read',input:{noteId:'n2'}});
  const result = router.approve(proposal.id);
  assert.equal(result.status,'completed');
  assert.deepEqual(result.result,{noteId:'n2'});
  assert.equal(getCalls(),1);
  assert.throws(()=>router.approve(proposal.id),error=>error.code==='PROPOSAL_NOT_PENDING');
  assert.ok(events.list().some(event => event.type === 'EXECUTION_COMPLETED'));
  assert.ok(events.list().some(event => event.type === 'TOOL_APPROVED'));
});

test('explicitly read-only tool can execute without a confirmation prompt', () => {
  const {router,getCalls} = setup({requiresApproval:false});
  const proposal = router.propose({toolId:'notes.read',input:{noteId:'n3'}});
  assert.equal(router.execute(proposal.id).status,'completed');
  assert.equal(getCalls(),1);
});

test('authorization denial prevents handler invocation', () => {
  const {router,getCalls} = setup({requiresApproval:false,allowed:false});
  const proposal = router.propose({toolId:'notes.read',input:{noteId:'n4'}});
  assert.throws(()=>router.execute(proposal.id),error=>error.code==='AUTHORIZATION_DENIED');
  assert.equal(getCalls(),0);
});

test('unknown tools and malformed inputs are rejected', () => {
  const {router} = setup();
  assert.throws(()=>router.propose({toolId:'shell.exec',input:{command:'whoami'}}),error=>error.code==='UNKNOWN_TOOL');
  assert.throws(()=>router.propose({toolId:'notes.read',input:['not','an','object']}),/plain object/);
  const cyclic={}; cyclic.self=cyclic;
  assert.throws(()=>router.propose({toolId:'notes.read',input:cyclic}),/JSON serializable/);
});

test('rejected proposals cannot execute and input values are not copied into proposal audit metadata', () => {
  const {router,events,getCalls} = setup();
  const proposal = router.propose({toolId:'notes.read',input:{noteId:'sensitive-value'}});
  router.reject(proposal.id);
  assert.throws(()=>router.execute(proposal.id),error=>error.code==='PROPOSAL_NOT_PENDING');
  assert.equal(getCalls(),0);
  const proposedEvent=events.list().find(event=>event.type==='TOOL_PROPOSED');
  assert.deepEqual(proposedEvent.payload.inputKeys,['noteId']);
  assert.equal(JSON.stringify(proposedEvent).includes('sensitive-value'),false);
});

test('tool definition rejects mismatched capability contracts', () => {
  assert.throws(()=>createToolDefinition({
    id:'bad',resource:'x',action:'write',capability:createCapability({id:'read',action:'read'}),handler:()=>{}
  }),/matching its action/);
});
