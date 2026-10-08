export function createEvidence({ source, observedAt=new Date().toISOString(), data, method='unspecified' } = {}) {
  if (typeof source !== 'string' || !source.trim()) throw new TypeError('source must be non-empty');
  if (data === undefined) throw new TypeError('data is required');
  return Object.freeze({
    schema: 'nexus.evidence.v1',
    source: source.trim(),
    observedAt,
    method,
    data
  });
}

export function isEvidence(value) {
  return Boolean(value && value.schema === 'nexus.evidence.v1' && typeof value.source === 'string');
}
