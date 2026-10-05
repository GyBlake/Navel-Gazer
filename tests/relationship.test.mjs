import test from 'node:test';
import assert from 'node:assert/strict';
import { createRelationship, transitionRelationship } from '../src/relationship.mjs';

test('relationship lifecycle reaches ESTABLISHED', () => {
  let r = createRelationship({ id: 'r1', source: 'a', target: 'b' });
  for (const state of ['IDENTIFIED', 'CONNECTED', 'HANDSHAKEN', 'AUTHENTICATED', 'AUTHORIZED', 'ESTABLISHED']) {
    r = transitionRelationship(r, state);
  }
  assert.equal(r.state, 'ESTABLISHED');
});

test('relationship lifecycle supports integration and teardown', () => {
  let r = createRelationship({ id: 'r1', source: 'a', target: 'b' });
  for (const state of [
    'IDENTIFIED', 'CONNECTED', 'HANDSHAKEN', 'AUTHENTICATED', 'AUTHORIZED',
    'ESTABLISHED', 'NEGOTIATING', 'ACTIVE', 'SYNCHRONIZING', 'SYNCHRONIZED',
    'EXCHANGING', 'RECONCILING', 'INTEGRATED', 'TEARING_DOWN', 'DISCONNECTED'
  ]) r = transitionRelationship(r, state);
  assert.equal(r.state, 'DISCONNECTED');
});

test('connection does not imply authorization', () => {
  const r = createRelationship({ id: 'r1', source: 'a', target: 'b' });
  const connected = transitionRelationship(transitionRelationship(r, 'IDENTIFIED'), 'CONNECTED');
  assert.equal(connected.state, 'CONNECTED');
  assert.throws(() => transitionRelationship(connected, 'ACTIVE'));
});

test('invalid relationship transition is rejected', () => {
  const r = createRelationship({ id: 'r1', source: 'a', target: 'b' });
  assert.throws(() => transitionRelationship(r, 'ACTIVE'));
});
