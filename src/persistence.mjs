import { promises as fs } from 'node:fs';

export async function saveSnapshot(path, snapshot) {
  if (typeof path !== 'string' || !path) throw new TypeError('path required');
  await fs.writeFile(path, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
}

export async function loadSnapshot(path) {
  const raw = await fs.readFile(path, 'utf8');
  const value = JSON.parse(raw);
  return value;
}

export function createSnapshot({ boot, resources=[], events=[], relationships=[], metadata={} } = {}) {
  return Object.freeze({
    schema: 'nexus.snapshot.v1',
    createdAt: new Date().toISOString(),
    metadata,
    boot,
    resources,
    relationships,
    events
  });
}
