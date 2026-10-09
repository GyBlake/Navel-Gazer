const IMPLEMENTATIONS = Object.freeze(['agent','service','sensor','validator','coordinator','resource-controller']);
const CONCURRENCY_POLICIES = Object.freeze(['parallel','serial','exclusive']);
const FAILURE_POLICIES = Object.freeze(['halt-dependent','continue-independent','manual-review']);
const RELATION_DIRECTIONS = Object.freeze(['outbound','inbound','bidirectional']);

function nonEmpty(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' must be a non-empty string');
  return value.trim();
}
function stringList(value, name) {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || !item.trim())) {
    throw new TypeError(name + ' must be an array of non-empty strings');
  }
  const normalized = value.map(item => item.trim());
  if (new Set(normalized).size !== normalized.length) throw new TypeError(name + ' must not contain duplicates');
  return normalized;
}
function coordinates(value) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('coordinates must be an object or null');
  const result = {};
  for (const axis of ['x','y','z']) {
    if (value[axis] !== undefined) {
      if (typeof value[axis] !== 'number' || !Number.isFinite(value[axis])) throw new TypeError('coordinates.' + axis + ' must be finite');
      result[axis] = value[axis];
    }
  }
  if (!Object.keys(result).length) throw new TypeError('coordinates must include at least one finite x, y, or z value');
  return Object.freeze(result);
}

export function createTopologyNode({
  nodeId, responsibility, implementation='agent', capabilities=[], inputs=[], outputs=[],
  dependencies=[], relationships=[], memoryScopes=['task'], concurrencyPolicy='parallel',
  failurePolicy='halt-dependent', provenancePolicy='preserve-input-lineage', coordinates:position=null,
  metadata={}
} = {}) {
  nodeId = nonEmpty(nodeId, 'nodeId');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(nodeId)) throw new TypeError('nodeId must be a stable identifier (letters, digits, dot, underscore, colon, hyphen)');
  responsibility = nonEmpty(responsibility, 'responsibility');
  if (!IMPLEMENTATIONS.includes(implementation)) throw new TypeError('Unknown implementation type: ' + implementation);
  if (!CONCURRENCY_POLICIES.includes(concurrencyPolicy)) throw new TypeError('Unknown concurrency policy: ' + concurrencyPolicy);
  if (!FAILURE_POLICIES.includes(failurePolicy)) throw new TypeError('Unknown failure policy: ' + failurePolicy);
  if (!Array.isArray(relationships)) throw new TypeError('relationships must be an array');
  const normalizedRelationships = relationships.map((relationship, index) => {
    if (!relationship || typeof relationship !== 'object' || Array.isArray(relationship)) throw new TypeError('relationships[' + index + '] must be an object');
    const targetNodeId = nonEmpty(relationship.targetNodeId, 'relationships[' + index + '].targetNodeId');
    const relationType = nonEmpty(relationship.relationType, 'relationships[' + index + '].relationType');
    const direction = relationship.direction ?? 'outbound';
    if (!RELATION_DIRECTIONS.includes(direction)) throw new TypeError('Unknown relationship direction: ' + direction);
    return Object.freeze({ targetNodeId, relationType, direction });
  });
  const ids = normalizedRelationships.map(item => item.targetNodeId + '|' + item.relationType + '|' + item.direction);
  if (new Set(ids).size !== ids.length) throw new TypeError('relationships must not contain duplicates');
  if (!Array.isArray(metadata) && (!metadata || typeof metadata !== 'object')) throw new TypeError('metadata must be an object');
  if (Array.isArray(metadata)) throw new TypeError('metadata must be an object');
  return Object.freeze({
    schema:'navel-gazer.topology-node.v1',
    nodeId,
    responsibility,
    implementation,
    capabilities:Object.freeze(stringList(capabilities, 'capabilities')),
    inputs:Object.freeze(stringList(inputs, 'inputs')),
    outputs:Object.freeze(stringList(outputs, 'outputs')),
    dependencies:Object.freeze(stringList(dependencies, 'dependencies')),
    relationships:Object.freeze(normalizedRelationships),
    memoryScopes:Object.freeze(stringList(memoryScopes, 'memoryScopes')),
    concurrencyPolicy,
    failurePolicy,
    provenancePolicy:nonEmpty(provenancePolicy, 'provenancePolicy'),
    coordinates:coordinates(position),
    metadata:Object.freeze({...metadata})
  });
}

export function isTopologyNode(value) {
  return Boolean(value && value.schema === 'navel-gazer.topology-node.v1' &&
    typeof value.nodeId === 'string' && typeof value.responsibility === 'string');
}

export function createAgenticTopology({ topologyId='default', version='1.0.0', nodes=[] } = {}) {
  topologyId = nonEmpty(topologyId, 'topologyId');
  version = nonEmpty(version, 'version');
  if (!Array.isArray(nodes)) throw new TypeError('nodes must be an array');
  const registry = new Map();
  for (const node of nodes) {
    const normalized = isTopologyNode(node) ? node : createTopologyNode(node);
    if (registry.has(normalized.nodeId)) throw new Error('Duplicate topology node: ' + normalized.nodeId);
    registry.set(normalized.nodeId, normalized);
  }

  function validate() {
    const errors = [];
    for (const node of registry.values()) {
      for (const dependency of node.dependencies) {
        if (!registry.has(dependency)) errors.push({ code:'DEPENDENCY_NOT_FOUND', nodeId:node.nodeId, targetNodeId:dependency });
        if (dependency === node.nodeId) errors.push({ code:'SELF_DEPENDENCY', nodeId:node.nodeId, targetNodeId:dependency });
      }
      for (const relationship of node.relationships) {
        if (!registry.has(relationship.targetNodeId)) errors.push({ code:'RELATIONSHIP_TARGET_NOT_FOUND', nodeId:node.nodeId, targetNodeId:relationship.targetNodeId });
      }
    }

    const colors = new Map();
    const path = [];
    const cycles = [];
    function visit(nodeId) {
      const color = colors.get(nodeId) ?? 0;
      if (color === 2) return;
      if (color === 1) {
        const start = path.indexOf(nodeId);
        cycles.push(path.slice(start).concat(nodeId));
        return;
      }
      colors.set(nodeId, 1);
      path.push(nodeId);
      const node = registry.get(nodeId);
      if (node) for (const dependency of node.dependencies) if (registry.has(dependency)) visit(dependency);
      path.pop();
      colors.set(nodeId, 2);
    }
    for (const nodeId of registry.keys()) visit(nodeId);
    for (const cycle of cycles) errors.push({ code:'DEPENDENCY_CYCLE', path:cycle });
    return Object.freeze({ valid:errors.length === 0, errors:Object.freeze(errors.map(error => Object.freeze(error))), nodeCount:registry.size });
  }

  return Object.freeze({
    schema:'navel-gazer.agentic-topology.v1',
    topologyId,
    version,
    register(node) {
      const normalized = isTopologyNode(node) ? node : createTopologyNode(node);
      if (registry.has(normalized.nodeId)) throw new Error('Topology node already registered: ' + normalized.nodeId);
      registry.set(normalized.nodeId, normalized);
      return normalized;
    },
    get(nodeId) { return registry.get(nodeId); },
    has(nodeId) { return registry.has(nodeId); },
    list() { return [...registry.values()]; },
    validate,
    export() {
      return Object.freeze({
        schema:'navel-gazer.agentic-topology.v1',
        topologyId,
        version,
        nodes:[...registry.values()]
      });
    }
  });
}

export { IMPLEMENTATIONS as TOPOLOGY_IMPLEMENTATIONS, CONCURRENCY_POLICIES, FAILURE_POLICIES, RELATION_DIRECTIONS };
