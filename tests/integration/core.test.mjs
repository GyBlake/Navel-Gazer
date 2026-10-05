import test from 'node:test';
import assert from 'node:assert/strict';
import { createBootState, advanceBoot, createRelationship, transitionRelationship, createState, advanceState } from '../../src/index.mjs';

test('core domains compose without collapsing their state models', () => {
  let boot = createBootState();
  boot = advanceBoot(boot, 'INITIALIZE');
  boot = advanceBoot(boot, 'FIRMWARE');
  assert.equal(boot.complete, false);

  let relationship = createRelationship({ id: 'r1', source: 'a', target: 'b' });
  relationship = transitionRelationship(relationship, 'IDENTIFIED');

  let state = createState();
  state = advanceState(state, 'PARSED', { source: 'integration-test' });

  assert.equal(relationship.state, 'IDENTIFIED');
  assert.equal(state.stage, 'PARSED');
});
