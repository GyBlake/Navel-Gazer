import { isEvidence } from './evidence.mjs';

export function createProvenance({ source, method='unspecified', observedAt=new Date().toISOString(), evidence=null, parent=null } = {}) {
  if (typeof source !== 'string' || !source.trim()) throw new TypeError('source must be non-empty');
  if (evidence !== null && !isEvidence(evidence)) throw new TypeError('evidence must be Nexus evidence');
  if (parent !== null && !isProvenance(parent)) throw new TypeError('parent must be Nexus provenance');
  return Object.freeze({
    schema: 'nexus.provenance.v1',
    source: source.trim(),
    method,
    observedAt,
    evidence,
    parent
  });
}

export function isProvenance(value) {
  return Boolean(value && value.schema === 'nexus.provenance.v1' && typeof value.source === 'string');
}

/**
 * Return a provenance chain from the supplied node to its ancestors.
 * Reject cycles and chains beyond maxDepth rather than looping forever or
 * allowing malformed input to consume unbounded time and memory.
 */
export function lineage(provenance, { maxDepth=10_000 } = {}) {
  if (!Number.isInteger(maxDepth) || maxDepth < 1) {
    throw new TypeError('maxDepth must be a positive integer');
  }
  if (provenance !== null && provenance !== undefined && !isProvenance(provenance)) {
    throw new TypeError('Valid provenance required');
  }

  const result = [];
  const visited = new Set();
  let cursor = provenance ?? null;
  while (cursor) {
    if (!isProvenance(cursor)) throw new TypeError('Invalid provenance node in lineage');
    if (visited.has(cursor)) throw new Error('Provenance lineage cycle detected');
    if (result.length >= maxDepth) throw new RangeError('Provenance lineage exceeds maxDepth');
    visited.add(cursor);
    result.push(cursor);
    cursor = cursor.parent ?? null;
  }
  return result;
}
