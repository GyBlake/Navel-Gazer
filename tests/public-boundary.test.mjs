import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

test('public repository does not expose known private application names in core source', () => {
  const forbidden = [
    'Dreamguard',
    'Lithica',
    'Siren',
    'Omniom',
    'Veridex',
    'Gyasi',
    'Axis Prime'
  ];

  const files = [
    'README.md',
    'docs/architecture.md',
    'docs/reconstruction.md',
    'specs/state.md',
    'specs/relationship.md',
    'specs/hardware-grounding.md',
    'src/bootstrap.mjs',
    'src/hardware.mjs',
    'src/relationship.mjs',
    'src/state.mjs'
  ];

  for (const relative of files) {
    const content = fs.readFileSync(path.join(root, relative), 'utf8').toLowerCase();
    for (const term of forbidden) {
      assert.equal(content.includes(term.toLowerCase()), false, `private term exposed in ${relative}: ${term}`);
    }
  }
});
