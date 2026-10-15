import test from 'node:test';
import assert from 'node:assert/strict';
import { createLifeGoal, confirmMilestone, summarizeLifeGoals } from '../src/life-navigation.mjs';

let sequence = 0;
const idFactory = () => 'id-' + (++sequence);
const clock = () => '2026-10-15T12:00:00.000Z';

test('creates a local life goal with explicit milestone states', () => {
  const goal = createLifeGoal({ title: 'Earn a certificate', domain: 'education', milestones: ['Compare programs', 'Enroll'] }, { idFactory, clock });
  assert.equal(goal.schema, 'nexus.life-goal.v1');
  assert.equal(goal.status, 'active');
  assert.equal(goal.milestones[0].status, 'pending');
  assert.equal(goal.milestones[0].confirmation, null);
});

test('rejects invalid domains, duplicate milestones, and oversized plans', () => {
  assert.throws(() => createLifeGoal({ title: 'Goal', domain: 'surveillance' }, { idFactory, clock }), /domain/);
  assert.throws(() => createLifeGoal({ title: 'Goal', milestones: ['Apply', 'Apply'] }, { idFactory, clock }), /unique/);
  assert.throws(() => createLifeGoal({ title: 'Goal', milestones: Array(21).fill('Step') }, { idFactory, clock }), /20 milestones/);
});

test('milestone completion requires explicit user confirmation and never claims external verification', () => {
  const goal = createLifeGoal({ title: 'Find housing', domain: 'housing', milestones: ['Prepare documents'] }, { idFactory, clock });
  assert.throws(() => confirmMilestone(goal, goal.milestones[0].id, { confirmed: false }, { clock }), /confirmation/);
  const next = confirmMilestone(goal, goal.milestones[0].id, { confirmed: true, evidenceNote: 'Documents gathered' }, { clock });
  assert.equal(next.status, 'complete');
  assert.equal(next.milestones[0].confirmation, 'user-confirmed');
  assert.equal(next.milestones[0].evidenceNote, 'Documents gathered');
  assert.equal(summarizeLifeGoals([next]).xp, 10);
});

test('summaries count only completed milestones and describe XP as motivational', () => {
  const goal = createLifeGoal({ title: 'Build savings', domain: 'finance', milestones: ['Set target', 'Review budget'] }, { idFactory, clock });
  const summary = summarizeLifeGoals([goal]);
  assert.equal(summary.xp, 0);
  assert.match(summary.xpBasis, /not a measure of human worth/);
});
