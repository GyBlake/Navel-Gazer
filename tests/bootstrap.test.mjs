import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOT_STAGES, createBootState, advanceBoot, canAdvance, sequence } from '../src/bootstrap.mjs';

test('boot sequence is explicit', () => assert.deepEqual(sequence(), BOOT_STAGES));

test('invalid boot transition is rejected', () =>
  assert.throws(() => advanceBoot(createBootState(), 'KERNEL'))
);

test('boot completes only at SHUTDOWN', () => {
  let state = createBootState();
  for (const stage of BOOT_STAGES.slice(1)) state = advanceBoot(state, stage);
  assert.equal(state.stage, 'SHUTDOWN');
  assert.equal(state.complete, true);
});

test('pre-terminal stages are not marked complete', () => {
  let state = createBootState();
  for (const stage of BOOT_STAGES.slice(1, -1)) state = advanceBoot(state, stage);
  assert.equal(state.stage, 'STATE_EVENTS');
  assert.equal(state.complete, false);
});

test('shutdown has no outgoing transition', () => {
  assert.equal(canAdvance('SHUTDOWN', 'PLATFORM'), false);
});
