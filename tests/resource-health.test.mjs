import test from 'node:test';
import assert from 'node:assert/strict';
import { createResource, createResourceRegistry, canTransitionResource } from '../src/resource.mjs';
import { createEventLog } from '../src/event.mjs';
import { markResourceUnavailable, beginResourceRecovery, markResourceRecovered, recordResourceReadFailure } from '../src/resource-health.mjs';

const clock = () => '2026-01-01T00:00:00.000Z';

test('resource health states enforce bounded recovery transitions', () => {
  assert.equal(canTransitionResource('AVAILABLE','UNAVAILABLE'), true);
  assert.equal(canTransitionResource('UNAVAILABLE','RECOVERING'), true);
  assert.equal(canTransitionResource('RECOVERING','AVAILABLE'), true);
  assert.equal(canTransitionResource('UNAVAILABLE','ACTIVE'), false);
  assert.equal(canTransitionResource('RETIRED','AVAILABLE'), false);
});

test('resource outage and recovery are isolated and auditable', () => {
  const registry = createResourceRegistry();
  const events = createEventLog();
  registry.register(createResource({id:'remote-1', resourceType:'remote', state:'AVAILABLE'}));

  const unavailable = markResourceUnavailable({registry,eventLog:events,resourceId:'remote-1',reason:'connection timeout',clock});
  assert.equal(unavailable.resource.state,'UNAVAILABLE');
  assert.equal(unavailable.event.type,'RESOURCE_UNAVAILABLE');

  const recovering = beginResourceRecovery({registry,eventLog:events,resourceId:'remote-1',reason:'retry window opened',clock});
  assert.equal(recovering.resource.state,'RECOVERING');
  assert.equal(recovering.event.type,'RESOURCE_RECOVERY_STARTED');

  const recovered = markResourceRecovered({registry,eventLog:events,resourceId:'remote-1',reason:'connection restored',clock});
  assert.equal(recovered.resource.state,'AVAILABLE');
  assert.equal(recovered.event.type,'RESOURCE_RECOVERED');
  assert.equal(events.list().length,3);
});

test('read failures are recorded without exposing full external payloads', () => {
  const registry = createResourceRegistry();
  const events = createEventLog();
  registry.register(createResource({id:'remote-2', resourceType:'remote', state:'AVAILABLE'}));
  const event = recordResourceReadFailure({registry,eventLog:events,resourceId:'remote-2',error:new Error('timeout'),clock});
  assert.equal(event.type,'RESOURCE_READ_FAILED');
  assert.equal(event.evidence.data.error,'timeout');
  assert.equal(registry.get('remote-2').state,'AVAILABLE');
});
