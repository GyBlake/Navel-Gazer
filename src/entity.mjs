const TYPES = Object.freeze(['ENTITY','RESOURCE']);

function assertId(id, label='id') {
  if (typeof id !== 'string' || id.trim() === '') throw new TypeError(`${label} must be a non-empty string`);
  return id.trim();
}

export function createEntity({ id, type='ENTITY', attributes={} } = {}) {
  id = assertId(id);
  if (!TYPES.includes(type)) throw new TypeError(`Unsupported entity type: ${type}`);
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) {
    throw new TypeError('attributes must be an object');
  }
  return Object.freeze({ schema: 'nexus.entity.v1', id, type, attributes: Object.freeze({ ...attributes }) });
}

export function isEntity(value) {
  return Boolean(value && typeof value === 'object' && typeof value.id === 'string' && TYPES.includes(value.type));
}
