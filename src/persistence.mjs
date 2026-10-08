import { promises as fs } from 'node:fs';

export function createSnapshot({ boot, resources=[], relationships=[], events=[], metadata={} } = {}) {
  return Object.freeze({
    schema:'nexus.snapshot.v1',
    createdAt:new Date().toISOString(),
    metadata,
    boot,
    resources:[...resources],
    relationships:[...relationships],
    events:[...events]
  });
}

export async function saveSnapshot(path, snapshot) {
  if (typeof path !== 'string' || !path) throw new TypeError('path required');
  if (!snapshot || snapshot.schema !== 'nexus.snapshot.v1') throw new TypeError('Nexus snapshot required');
  await fs.writeFile(path, JSON.stringify(snapshot,null,2)+'\n','utf8');
}

export async function loadSnapshot(path) {
  const raw = await fs.readFile(path,'utf8');
  const value = JSON.parse(raw);
  if (!value || value.schema !== 'nexus.snapshot.v1') throw new Error('Unsupported snapshot schema');
  return value;
}
