import test from 'node:test';
import assert from 'node:assert/strict';
import { createReferenceApplication } from '../src/reference.mjs';

test('reference application completes a full authorized execution lineage', () => {
  const app = createReferenceApplication({ clock:()=> '2026-01-01T00:00:00.000Z' });
  const execution = app.execute({ request:'hello-navel' });
  assert.equal(execution.result.resource, 'reference-document');
  assert.equal(execution.result.acceptedInput.request, 'hello-navel');
  assert.equal(execution.result.state, 'AVAILABLE');
  assert.equal(execution.event.type, 'EXECUTION_COMPLETED');
  assert.equal(execution.event.evidence.schema, 'nexus.evidence.v1');
  assert.equal(execution.event.provenance.schema, 'nexus.provenance.v1');
  assert.equal(execution.event.provenance.evidence, execution.event.evidence);
  assert.equal(app.system.events.list().length, 1);
});
