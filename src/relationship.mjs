export const RELATIONSHIP_STATES = Object.freeze([
  'DISCOVERING','IDENTIFIED','CONNECTED','HANDSHAKEN','AUTHENTICATED','AUTHORIZED',
  'ESTABLISHED','NEGOTIATING','ACTIVE','SYNCHRONIZING','SYNCHRONIZED','EXCHANGING',
  'RECONCILING','INTEGRATED','TEARING_DOWN','DISCONNECTED'
]);

const transitions = Object.freeze({
  DISCOVERING:['IDENTIFIED','DISCONNECTED'],
  IDENTIFIED:['CONNECTED','DISCONNECTED'],
  CONNECTED:['HANDSHAKEN','DISCONNECTED'],
  HANDSHAKEN:['AUTHENTICATED','DISCONNECTED'],
  AUTHENTICATED:['AUTHORIZED','DISCONNECTED'],
  AUTHORIZED:['ESTABLISHED','DISCONNECTED'],
  ESTABLISHED:['NEGOTIATING','ACTIVE','TEARING_DOWN'],
  NEGOTIATING:['AUTHORIZED','ACTIVE','DISCONNECTED'],
  ACTIVE:['SYNCHRONIZING','EXCHANGING','RECONCILING','INTEGRATED','TEARING_DOWN'],
  SYNCHRONIZING:['SYNCHRONIZED','RECONCILING','DISCONNECTED'],
  SYNCHRONIZED:['ACTIVE','EXCHANGING','RECONCILING','TEARING_DOWN'],
  EXCHANGING:['ACTIVE','RECONCILING','TEARING_DOWN'],
  RECONCILING:['ACTIVE','SYNCHRONIZED','INTEGRATED','DISCONNECTED'],
  INTEGRATED:['ACTIVE','TEARING_DOWN'],
  TEARING_DOWN:['DISCONNECTED'],
  DISCONNECTED:[]
});

export function canTransition(from,to) {
  return Boolean(transitions[from]?.includes(to));
}

export function createRelationship({ id, source, target } = {}) {
  for (const [name,value] of Object.entries({id,source,target})) {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be a non-empty string`);
  }
  if (source === target) throw new Error('Relationship endpoints must differ');
  return Object.freeze({
    schema:'nexus.relationship.v1',
    id:id.trim(),
    source:source.trim(),
    target:target.trim(),
    state:'DISCOVERING',
    permissions:[],
    capabilities:[],
    provenance:null
  });
}

export function transitionRelationship(relationship,to) {
  if (!relationship || typeof relationship !== 'object') throw new TypeError('Relationship required');
  if (!canTransition(relationship.state,to)) throw new Error(`Invalid relationship transition: ${relationship.state} -> ${to}`);
  return Object.freeze({ ...relationship, state:to });
}

export function createRelationshipRegistry() {
  const relationships = new Map();
  return Object.freeze({
    register(relationship) {
      if (!relationship || relationship.schema !== 'nexus.relationship.v1') throw new TypeError('Nexus relationship required');
      if (relationships.has(relationship.id)) throw new Error(`Relationship already registered: ${relationship.id}`);
      relationships.set(relationship.id, relationship);
      return relationship;
    },
    get(id) { return relationships.get(id); },
    has(id) { return relationships.has(id); },
    list() { return [...relationships.values()]; },
    transition(id,to) {
      const current = relationships.get(id);
      if (!current) throw new Error(`Unknown relationship: ${id}`);
      const next = transitionRelationship(current,to);
      relationships.set(id,next);
      return next;
    }
  });
}
