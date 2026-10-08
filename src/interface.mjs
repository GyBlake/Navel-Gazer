const TYPES = Object.freeze(['filesystem','network','ipc','api','process','device','custom']);

export function createInterface({ id, owner, type='custom', endpoint=null, capabilities=[], metadata={} } = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('id must be non-empty');
  if (typeof owner !== 'string' || !owner.trim()) throw new TypeError('owner must be non-empty');
  if (!TYPES.includes(type)) throw new TypeError(`Unsupported interface type: ${type}`);
  if (!Array.isArray(capabilities) || capabilities.some(c => typeof c !== 'string' || !c.trim())) {
    throw new TypeError('capabilities must be an array of non-empty strings');
  }
  return Object.freeze({
    schema: 'nexus.interface.v1',
    id: id.trim(),
    owner: owner.trim(),
    type,
    endpoint,
    capabilities: Object.freeze([...new Set(capabilities)]),
    metadata: Object.freeze({ ...metadata })
  });
}

export const INTERFACE_TYPES = TYPES;
