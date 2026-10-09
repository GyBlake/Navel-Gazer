import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgenticTopology, createTopologyNode, isTopologyNode } from '../src/agentic-topology.mjs';

test('topology nodes preserve stable identity, role, coordinates, and policy', () => {
  const node = createTopologyNode({
    nodeId:'node.research',
    responsibility:'Collect source-backed evidence',
    implementation:'agent',
    capabilities:['web.read'],
    inputs:['question'],
    outputs:['evidence-set'],
    coordinates:{x:1,y:2,z:0},
    memoryScopes:['task'],
    concurrencyPolicy:'parallel'
  });
  assert.equal(node.schema, 'navel-gazer.topology-node.v1');
  assert.deepEqual(node.coordinates, {x:1,y:2,z:0});
  assert.equal(isTopologyNode(node), true);
  assert.throws(() => createTopologyNode({nodeId:'',responsibility:'x'}));
  assert.throws(() => createTopologyNode({nodeId:'x',responsibility:'x',coordinates:{x:Infinity}}));
});

test('topology is extensible and reports missing dependency and relationship targets', () => {
  const topology = createAgenticTopology({topologyId:'public-map',version:'1.0.0'});
  topology.register({nodeId:'alpha',responsibility:'First node'});
  topology.register({
    nodeId:'beta',
    responsibility:'Second node',
    dependencies:['missing'],
    relationships:[{targetNodeId:'also-missing',relationType:'returns-to'}]
  });
  const result = topology.validate();
  assert.equal(topology.list().length, 2);
  assert.equal(result.valid, false);
  assert.deepEqual(result.errors.map(error => error.code).sort(), ['DEPENDENCY_NOT_FOUND','RELATIONSHIP_TARGET_NOT_FOUND']);
  assert.equal(topology.export().nodes.length, 2);
});

test('topology rejects duplicate node IDs and dependency cycles', () => {
  assert.throws(() => createAgenticTopology({nodes:[
    {nodeId:'alpha',responsibility:'A'},
    {nodeId:'alpha',responsibility:'Duplicate'}
  ]}), /Duplicate topology node/);
  const topology = createAgenticTopology({nodes:[
    {nodeId:'alpha',responsibility:'A',dependencies:['beta']},
    {nodeId:'beta',responsibility:'B',dependencies:['alpha']}
  ]});
  assert.equal(topology.validate().valid, false);
  assert.ok(topology.validate().errors.some(error => error.code === 'DEPENDENCY_CYCLE'));
});

test('valid dependencies and typed relationships validate without fixing node count', () => {
  const topology = createAgenticTopology({nodes:[
    {nodeId:'anchor',responsibility:'Reconcile outcomes'},
    {nodeId:'worker',responsibility:'Perform bounded task',dependencies:['anchor'],relationships:[
      {targetNodeId:'anchor',relationType:'returns-to',direction:'outbound'}
    ]}
  ]});
  assert.deepEqual(topology.validate(), {valid:true,errors:[],nodeCount:2});
  topology.register({nodeId:'sensor',responsibility:'Observe inputs',implementation:'sensor'});
  assert.equal(topology.validate().nodeCount, 3);
});
