import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMemoryContextBudget,
  estimateTokensConservatively,
  findExactDuplicateGroups,
  normalizeExactMemoryContent,
  planMemoryContext
} from '../src/memory-lifecycle.mjs';

test('exact deduplication suggests a deterministic survivor without mutating source records', () => {
  const records = [
    {id:'later',content:'Same  note',createdAt:'2026-10-08T00:00:00Z'},
    {id:'first',content:'Same note',createdAt:'2026-10-07T00:00:00Z'},
    {id:'different-case',content:'same note',createdAt:'2026-10-06T00:00:00Z'}
  ];
  const groups = findExactDuplicateGroups(records);
  assert.equal(groups.length,1);
  assert.equal(groups[0].canonicalId,'first');
  assert.deepEqual(groups[0].duplicateIds,['later']);
  assert.equal(records.length,3);
  assert.equal(normalizeExactMemoryContent('  Same\n note  '),'Same note');
  assert.notEqual(normalizeExactMemoryContent('Same note'),normalizeExactMemoryContent('same note'));
});

test('context budget is configurable and reserves capacity', () => {
  assert.equal(calculateMemoryContextBudget({contextWindowTokens:10000}),7000);
  assert.equal(calculateMemoryContextBudget({contextWindowTokens:10000,reservedTokens:1500}),5500);
  assert.throws(() => calculateMemoryContextBudget({contextWindowTokens:100,targetFraction:2}));
  assert.equal(estimateTokensConservatively('12345678'),2);
});

test('context planner ranks pinned, selected, and relevant records without mutating durable memory', () => {
  const records = [
    {id:'low',content:'12345678'},
    {id:'selected',content:'abcd'},
    {id:'pinned',content:'xy'},
    {id:'relevant',content:'1234'}
  ];
  const plan = planMemoryContext({
    records, tokenBudget:3, selectedIds:['selected'], pinnedIds:['pinned'],
    relevanceScores:{relevant:100},
    tokenEstimator:text => text.length
  });
  assert.deepEqual(plan.included.map(item => item.id),['pinned','selected']);
  assert.deepEqual(plan.skipped.map(item => item.id),['relevant','low']);
  assert.equal(plan.usedTokens,3);
  assert.equal(plan.durableRecordsMutated,false);
  assert.equal(records.length,4);
});

test('context planner rejects duplicate IDs and invalid token estimates', () => {
  assert.throws(() => planMemoryContext({records:[{id:'x',content:'a'},{id:'x',content:'b'}],tokenBudget:10}));
  assert.throws(() => planMemoryContext({records:[{id:'x',content:'a'}],tokenBudget:10,tokenEstimator:() => -1}));
});
