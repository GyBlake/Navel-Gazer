function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' must be a non-empty string');
  return value.trim();
}
function uniqueStrings(values, name) {
  if (!Array.isArray(values) || values.some(value => typeof value !== 'string' || !value.trim())) throw new TypeError(name + ' must be an array of non-empty strings');
  const result = values.map(value => value.trim());
  if (new Set(result).size !== result.length) throw new TypeError(name + ' must not contain duplicates');
  return result;
}
function recordOrder(a, b) {
  const at = Date.parse(a.createdAt ?? a.updatedAt ?? '') || Number.MAX_SAFE_INTEGER;
  const bt = Date.parse(b.createdAt ?? b.updatedAt ?? '') || Number.MAX_SAFE_INTEGER;
  return at - bt || String(a.id).localeCompare(String(b.id));
}

// Representation-level normalization only. This is not semantic similarity.
export function normalizeExactMemoryContent(content) {
  if (typeof content !== 'string' || !content.trim()) throw new TypeError('memory content must be non-empty');
  return content.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

// Suggest duplicate groups without modifying the source records.
export function findExactDuplicateGroups(records) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  const groups = new Map();
  for (const record of records) {
    if (!record || typeof record.id !== 'string' || !record.id.trim()) throw new TypeError('each memory record needs a non-empty id');
    const normalized = normalizeExactMemoryContent(record.content);
    if (!groups.has(normalized)) groups.set(normalized, []);
    groups.get(normalized).push(record);
  }
  return [...groups.entries()].filter(([, group]) => group.length > 1).map(([normalizedContent, group]) => {
    const ordered = [...group].sort(recordOrder);
    return Object.freeze({
      normalizedContent,
      canonicalId:ordered[0].id,
      duplicateIds:Object.freeze(ordered.slice(1).map(record => record.id)),
      recordIds:Object.freeze(ordered.map(record => record.id))
    });
  });
}

export function estimateTokensConservatively(text) {
  if (typeof text !== 'string') throw new TypeError('text must be a string');
  return Math.max(1, Math.ceil(text.length / 4));
}

export function calculateMemoryContextBudget({ contextWindowTokens, targetFraction=0.7, reservedTokens=0 } = {}) {
  if (!Number.isInteger(contextWindowTokens) || contextWindowTokens < 1) throw new TypeError('contextWindowTokens must be a positive integer');
  if (typeof targetFraction !== 'number' || !Number.isFinite(targetFraction) || targetFraction <= 0 || targetFraction > 1) throw new TypeError('targetFraction must be greater than 0 and at most 1');
  if (!Number.isInteger(reservedTokens) || reservedTokens < 0) throw new TypeError('reservedTokens must be a non-negative integer');
  return Math.max(0, Math.floor(contextWindowTokens * targetFraction) - reservedTokens);
}

// Select working-context items only. Durable records are never mutated by this planner.
export function planMemoryContext({ records, tokenBudget, selectedIds=[], pinnedIds=[], relevanceScores={}, tokenEstimator=estimateTokensConservatively } = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  if (!Number.isInteger(tokenBudget) || tokenBudget < 0) throw new TypeError('tokenBudget must be a non-negative integer');
  if (typeof tokenEstimator !== 'function') throw new TypeError('tokenEstimator must be a function');
  selectedIds = uniqueStrings(selectedIds, 'selectedIds');
  pinnedIds = uniqueStrings(pinnedIds, 'pinnedIds');
  if (!relevanceScores || typeof relevanceScores !== 'object' || Array.isArray(relevanceScores)) throw new TypeError('relevanceScores must be an object');
  const seen = new Set();
  const candidates = records.map((record, index) => {
    if (!record || typeof record.id !== 'string' || !record.id.trim()) throw new TypeError('each memory record needs a non-empty id');
    if (seen.has(record.id)) throw new Error('Duplicate memory id: ' + record.id);
    seen.add(record.id);
    if (typeof record.content !== 'string') throw new TypeError('memory content must be a string');
    const tokens = tokenEstimator(record.content);
    if (!Number.isInteger(tokens) || tokens < 0) throw new TypeError('tokenEstimator must return a non-negative integer');
    const score = relevanceScores[record.id] ?? 0;
    if (typeof score !== 'number' || !Number.isFinite(score)) throw new TypeError('relevance scores must be finite numbers');
    return { record, index, tokens, score, pinned:pinnedIds.includes(record.id), selected:selectedIds.includes(record.id), updatedAt:Date.parse(record.updatedAt ?? '') || 0 };
  });
  candidates.sort((a,b) => Number(b.pinned)-Number(a.pinned) || Number(b.selected)-Number(a.selected) || b.score-a.score || b.updatedAt-a.updatedAt || a.record.id.localeCompare(b.record.id) || a.index-b.index);
  let usedTokens = 0;
  const included = [];
  const skipped = [];
  for (const candidate of candidates) {
    if (usedTokens + candidate.tokens <= tokenBudget) {
      usedTokens += candidate.tokens;
      included.push(Object.freeze({ id:candidate.record.id, record:candidate.record, tokens:candidate.tokens }));
    } else {
      skipped.push(Object.freeze({ id:candidate.record.id, tokens:candidate.tokens, reason:candidate.pinned ? 'PINNED_ITEM_EXCEEDS_REMAINING_BUDGET' : candidate.selected ? 'SELECTED_ITEM_EXCEEDS_REMAINING_BUDGET' : 'CONTEXT_BUDGET_EXCEEDED' }));
    }
  }
  return Object.freeze({
    schema:'navel-gazer.memory-context-plan.v1',
    tokenBudget,
    usedTokens,
    remainingTokens:tokenBudget-usedTokens,
    included:Object.freeze(included),
    skipped:Object.freeze(skipped),
    durableRecordsMutated:false
  });
}
