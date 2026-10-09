import test from 'node:test';
import assert from 'node:assert/strict';
import { createProvenance, lineage } from '../src/provenance.mjs';

function node(source, parent=null) {
  return { schema:'nexus.provenance.v1', source, parent };
}

test('lineage detects malformed nodes and cyclic references', () => {
  const cyclic = node('cycle');
  cyclic.parent = cyclic;
  assert.throws(() => lineage(cyclic), /cycle detected/i);
  assert.throws(() => lineage({ schema:'wrong', source:'bad' }), /Valid provenance required/);
});

test('lineage enforces a caller-controlled maximum depth', () => {
  const root = createProvenance({ source:'root' });
  const child = createProvenance({ source:'child', parent:root });
  assert.equal(lineage(child).length, 2);
  assert.throws(() => lineage(child, { maxDepth:1 }), /exceeds maxDepth/);
  assert.throws(() => lineage(root, { maxDepth:0 }), /maxDepth must be a positive integer/);
});

test('lineage supports an empty origin', () => {
  assert.deepEqual(lineage(null), []);
});
