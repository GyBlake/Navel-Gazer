import test from 'node:test';
import assert from 'node:assert/strict';
import { createEntity } from '../src/entity.mjs';
import { createResource, createResourceRegistry } from '../src/resource.mjs';
import { createInterface } from '../src/interface.mjs';
import { createCapability, capabilityMatches } from '../src/capability.mjs';
import { createEvidence } from '../src/evidence.mjs';
import { createProvenance, lineage } from '../src/provenance.mjs';
import { createEvent, createEventLog } from '../src/event.mjs';
import { createAuthorizationPolicy, authorize } from '../src/authorization.mjs';
import { createRuntime } from '../src/runtime.mjs';
import { diffStates, reconcileStates } from '../src/sync.mjs';
import { createSnapshot, saveSnapshot, loadSnapshot } from '../src/persistence.mjs';
import { createExtensionRegistry } from '../src/extensions.mjs';
import { createTelemetry } from '../src/observability.mjs';
import { createNexusSystem } from '../src/system.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('resource registry resolves typed resources', () => {
  const registry = createResourceRegistry();
  const resource = createResource({ id:'r1', resourceType:'document', state:'AVAILABLE' });
  registry.register(resource);
  assert.equal(registry.get('r1').resourceType, 'document');
  assert.throws(() => registry.register(resource));
});

test('interfaces and capabilities compose without domain coupling', () => {
  const cap = createCapability({ id:'read', action:'read', resourceType:'document' });
  const iface = createInterface({ id:'i1', owner:'agent-a', type:'api', capabilities:[cap.id] });
  const resource = createResource({ id:'r1', resourceType:'document' });
  assert.deepEqual(iface.capabilities, ['read']);
  assert.equal(capabilityMatches(cap, 'read', resource), true);
  assert.equal(capabilityMatches(cap, 'write', resource), false);
});

test('evidence and provenance form a lineage chain', () => {
  const e = createEvidence({ source:'test', data:{ value:42 } });
  const p = createProvenance({ source:'test', evidence:e });
  const child = createProvenance({ source:'derived', evidence:e, parent:p });
  assert.equal(lineage(child).length, 2);
  assert.equal(lineage(child)[1].source, 'test');
});

test('events require structured evidence and provenance', () => {
  const e = createEvidence({ source:'test', data:{ ok:true } });
  const p = createProvenance({ source:'test', evidence:e });
  const event = createEvent({ id:'e1', type:'OBSERVED', source:'test', evidence:e, provenance:p });
  const log = createEventLog();
  log.append(event);
  assert.equal(log.list().length, 1);
  assert.throws(() => log.append({ schema:'nexus.event.v1' }));
});

test('authorization is explicit and deny-by-default', () => {
  const policy = createAuthorizationPolicy({ rules:[{ subject:'a', resource:'r1', action:'read', effect:'ALLOW' }] });
  assert.equal(authorize(policy, {subject:'a',resource:'r1',action:'read'}), 'ALLOW');
  assert.equal(authorize(policy, {subject:'a',resource:'r1',action:'write'}), 'DENY');
});

test('runtime executes allowed work and records an event', () => {
  const log = createEventLog();
  const policy = createAuthorizationPolicy({ rules:[{ subject:'a', resource:'r1', action:'read', effect:'ALLOW' }] });
  const runtime = createRuntime({ authorizationPolicy:policy, eventLog:log, clock:()=> '2026-01-01T00:00:00.000Z' });
  const result = runtime.execute({ id:'x1', subject:'a', resource:'r1', action:'read', input:{n:2}, handler:({n})=>n*2 });
  assert.equal(result.result, 4);
  assert.equal(log.list()[0].type, 'EXECUTION_COMPLETED');
});

test('runtime rejects unauthorized work and records denial', () => {
  const log = createEventLog();
  const policy = createAuthorizationPolicy();
  const runtime = createRuntime({ authorizationPolicy:policy, eventLog:log });
  assert.throws(() => runtime.execute({ id:'x2', subject:'a', resource:'r1', action:'write', handler:()=>1 }), error => error.code === 'AUTHORIZATION_DENIED');
  assert.equal(log.list()[0].type, 'EXECUTION_DENIED');
});

test('sync reports equal, reconciled, and conflicting states explicitly', () => {
  assert.deepEqual(diffStates({a:1},{a:1}), []);
  assert.equal(reconcileStates({a:1},{a:2}).status, 'CONFLICT');
  assert.equal(reconcileStates({a:1},{a:2},{resolver:'prefer-local'}).status, 'RECONCILED');
});

test('snapshot round-trips through JSON persistence', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nexus-'));
  const path = join(dir, 'snapshot.json');
  try {
    const snapshot = createSnapshot({ resources:[{id:'r1'}], metadata:{test:true} });
    await saveSnapshot(path, snapshot);
    const loaded = await loadSnapshot(path);
    assert.equal(loaded.schema, 'nexus.snapshot.v1');
    assert.equal(loaded.resources[0].id, 'r1');
  } finally { await rm(dir, {recursive:true,force:true}); }
});

test('extensions and telemetry are observable and bounded', () => {
  const extensions = createExtensionRegistry();
  extensions.register({ id:'demo', version:'1.0.0', capabilities:['demo'] });
  assert.equal(extensions.list().length, 1);
  const telemetry = createTelemetry();
  telemetry.record('TEST', {ok:true});
  assert.equal(telemetry.list()[0].type, 'TEST');
});

test('system composes the foundation', () => {
  const system = createNexusSystem();
  for (const stage of ['INITIALIZE','FIRMWARE','BOOT']) system.advanceBoot(stage);
  const resource = createResource({ id:'r1', resourceType:'document' });
  system.resources.register(resource);
  assert.equal(system.boot.stage, 'BOOT');
  assert.equal(system.resources.get('r1').id, 'r1');
  assert.ok(system.telemetry.list().length >= 3);
});
