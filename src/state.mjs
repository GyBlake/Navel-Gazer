export const STATE_STAGES = Object.freeze([
  'OBSERVED',
  'PARSED',
  'NORMALIZED',
  'VALIDATED',
  'DERIVED',
  'UNKNOWN',
  'BLOCKED',
  'INCONCLUSIVE'
]);

const next = Object.freeze({
  OBSERVED: ['PARSED', 'UNKNOWN', 'BLOCKED', 'INCONCLUSIVE'],
  PARSED: ['NORMALIZED', 'UNKNOWN', 'BLOCKED', 'INCONCLUSIVE'],
  NORMALIZED: ['VALIDATED', 'DERIVED', 'UNKNOWN', 'BLOCKED', 'INCONCLUSIVE'],
  VALIDATED: ['DERIVED'],
  DERIVED: [],
  UNKNOWN: [],
  BLOCKED: [],
  INCONCLUSIVE: []
});

export function canAdvanceState(from, to) {
  return Boolean(next[from]?.includes(to));
}

export function createState(stage = 'OBSERVED', evidence = undefined) {
  if (!STATE_STAGES.includes(stage)) throw new Error(`Unknown state stage: ${stage}`);
  return Object.freeze({ stage, evidence });
}

export function advanceState(state, to, evidence) {
  if (!state || typeof state !== 'object') throw new TypeError('State required');
  if (!canAdvanceState(state.stage, to)) {
    throw new Error(`Invalid state transition: ${state.stage} -> ${to}`);
  }
  if (evidence === undefined || evidence === null) {
    throw new Error(`Evidence required for state transition: ${state.stage} -> ${to}`);
  }
  return createState(to, evidence);
}

export function sequence() {
  return [...STATE_STAGES];
}
