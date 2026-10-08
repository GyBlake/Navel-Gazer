import { createEntity, isEntity } from './entity.mjs';

const STATES = Object.freeze(['UNKNOWN','AVAILABLE','ACTIVE','DISABLED','RETIRED']);

export function createResource({ id, resourceType='generic', state='UNKNOWN', provenance=null, accessPolicy=null, attributes={} } = {}) {
  if (typeof resourceType !== 'string' || !resourceType.trim()) throw new TypeError('resourceType must be non-empty');
  if (!STATES.includes(state)) throw new TypeError(`Unknown resource state: ${state}`);
  const entity = createEntity({ id, type: 'RESOURCE', attributes });
  return Object.freeze({
    schema: 'nexus.resource.v1',
    ...entity,
    resourceType,
    state,
    provenance,
    accessPolicy
  });
}

export function createResourceRegistry() {
  const resources = new Map();
  return Object.freeze({
    register(resource) {
      if (!isEntity(resource) || resource.type !== 'RESOURCE' || resource.schema !== 'nexus.resource.v1') {
        throw new TypeError('Valid Nexus resource required');
      }
      if (resources.has(resource.id)) throw new Error(`Resource already registered: ${resource.id}`);
      resources.set(resource.id, resource);
      return resource;
    },
    get(id) { return resources.get(id); },
    has(id) { return resources.has(id); },
    list() { return [...resources.values()]; },
    setState(id, state) {
      if (!STATES.includes(state)) throw new TypeError(`Unknown resource state: ${state}`);
      const current = resources.get(id);
      if (!current) throw new Error(`Unknown resource: ${id}`);
      const next = Object.freeze({ ...current, state });
      resources.set(id, next);
      return next;
    }
  });
}

export { STATES as RESOURCE_STATES };
