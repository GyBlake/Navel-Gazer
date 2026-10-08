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

export function lineage(provenance) {
  const result = [];
  let cursor = provenance;
  while (cursor) {
    result.push(cursor);
    cursor = cursor.parent ?? null;
  }
  return result;
}
