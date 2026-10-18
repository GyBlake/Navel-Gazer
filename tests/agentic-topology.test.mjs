import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

test('registry revalidates objects that claim the topology schema', () => {
  const topology = createAgenticTopology();
  assert.throws(() => topology.register({
    schema:'navel-gazer.topology-node.v1',
    nodeId:'forged',
    responsibility:'Bypass validation',
    dependencies:'not-an-array'
  }));
});

test('checked-in public topology is populated and every node and relationship resolves', async () => {
  const fixture = JSON.parse(await readFile(new URL('../specs/agentic-topology.v1.json', import.meta.url), 'utf8'));
  assert.equal(fixture.schema, 'navel-gazer.agentic-topology.v1');
  assert.equal(fixture.version, '1.0.0');
  assert.ok(fixture.provenance?.sourceId, 'public topology must identify its source class');
  assert.ok(fixture.provenance?.sourceVersion, 'public topology must record source version');
  assert.ok(Array.isArray(fixture.nodes) && fixture.nodes.length >= 15, 'canonical public map must be populated');

  const topology = createAgenticTopology(fixture);
  const verdict = topology.validate();
  assert.equal(verdict.valid, true, JSON.stringify(verdict.errors));
  assert.equal(verdict.nodeCount, fixture.nodes.length);
  assert.equal(new Set(fixture.nodes.map(node => node.nodeId)).size, fixture.nodes.length, 'node IDs must be unique');

  const knownIds = new Set(fixture.nodes.map(node => node.nodeId));
  for (const node of fixture.nodes) {
    assert.ok(knownIds.has(node.nodeId), 'registered node missing: ' + node.nodeId);
    for (const dependency of node.dependencies ?? []) {
      assert.ok(knownIds.has(dependency), node.nodeId + ' has missing dependency ' + dependency);
    }
    for (const relationship of node.relationships ?? []) {
      assert.ok(knownIds.has(relationship.targetNodeId), node.nodeId + ' has missing relationship target ' + relationship.targetNodeId);
    }
  }
});

test('public topology contains no private crew names or internal protocols', async () => {
  const content = await readFile(new URL('../specs/agentic-topology.v1.json', import.meta.url), 'utf8');
  const privateTerm = /dreamcorp|siren|nyx|amærah|amaerah|jelani|imani(?:\\s+vale)?|phidelity|omniglyph|asecii|raptor/i;
  assert.equal(privateTerm.test(content), false, 'public topology must contain only neutral capability vocabulary');
});
