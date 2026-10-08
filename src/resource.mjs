import { createEntity, isEntity } from './entity.mjs';

const STATES = Object.freeze(['UNKNOWN','AVAILABLE','ACTIVE','UNAVAILABLE','RECOVERING','DISABLED','RETIRED']);

const TRANSITIONS = Object.freeze({
  UNKNOWN: Object.freeze(['AVAILABLE','UNAVAILABLE','DISABLED','RETIRED']),
  AVAILABLE: Object.freeze(['ACTIVE','UNAVAILABLE','DISABLED','RETIRED']),
  ACTIVE: Object.freeze(['AVAILABLE','UNAVAILABLE','RECOVERING','DISABLED','RETIRED']),
  UNAVAILABLE: Object.freeze(['RECOVERING','DISABLED','RETIRED']),
  RECOVERING: Object.freeze(['AVAILABLE','UNAVAILABLE','DISABLED','RETIRED']),
  DISABLED: Object.freeze(['AVAILABLE','RETIRED']),
  RETIRED: Object.freeze([])
});

export function createResource({ id, resourceType='generic', state='UNKNOWN', provenance=null, accessPolicy=null, attributes={} } = {}) {
  if (typeof resourceType !== 'string' || !resourceType.trim()) throw new TypeError('resourceType must be non-empty');
  if (!STATES.includes(state)) throw new TypeError(`Unknown resource state: ${state}`);
  const entity = createEntity({ id, type:'RESOURCE', attributes });
  return Object.freeze({
    ...entity,
    schema:'nexus.resource.v1',
    resourceType,
    state,
    provenance,
    accessPolicy
  });
}

export function canTransitionResource(from, to) {
  return STATES.includes(from) && STATES.includes(to) && (from === to || TRANSITIONS[from].includes(to));
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
    setState(id,state) {
      if (!STATES.includes(state)) throw new TypeError(`Unknown resource state: ${state}`);
      const current = resources.get(id);
      if (!current) throw new Error(`Unknown resource: ${id}`);
      if (!canTransitionResource(current.state,state)) {
        throw new Error(`Invalid resource state transition: ${current.state} -> ${state}`);
      }
      const next = Object.freeze({...current,state});
      resources.set(id,next);
      return next;
    }
  });
}

export { STATES as RESOURCE_STATES, TRANSITIONS as RESOURCE_STATE_TRANSITIONS };