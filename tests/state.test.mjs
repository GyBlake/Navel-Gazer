import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, advanceState, canAdvanceState, sequence } from '../src/state.mjs';

test('state model exposes explicit stages', () => {
  assert.deepEqual(sequence(), [
    'OBSERVED', 'PARSED', 'NORMALIZED', 'VALIDATED', 'DERIVED',
    'UNKNOWN', 'BLOCKED', 'INCONCLUSIVE'
  ]);
});

test('validated state requires evidence', () => {
  let state = createState();
  state = advanceState(state, 'PARSED', { source: 'test' });
  state = advanceState(state, 'NORMALIZED', { source: 'test' });
  state = advanceState(state, 'VALIDATED', { source: 'test' });
  assert.equal(state.stage, 'VALIDATED');
});

test('promotion without evidence is rejected', () => {
  const state = createState('OBSERVED');
  assert.throws(() => advanceState(state, 'PARSED'));
});

test('uncertain states are not silently promoted', () => {
  const unknown = createState('UNKNOWN', { reason: 'insufficient evidence' });
  assert.equal(canAdvanceState(unknown.stage, 'VALIDATED'), false);
  assert.throws(() => advanceState(unknown, 'VALIDATED', { source: 'test' }));
});

test('normalized state may derive only with evidence', () => {
  const normalized = createState('NORMALIZED', { source: 'test' });
  const derived = advanceState(normalized, 'DERIVED', { source: 'test' });
  assert.equal(derived.stage, 'DERIVED');
});
