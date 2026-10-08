import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileMemoryStore, createMemoryRecord, createMemoryStore } from '../src/memory.mjs';

const fixed = '2026-10-08T12:00:00.000Z';

test('memory records require explicit content and use versioned schemas', () => {
  const record = createMemoryRecord({ id:'pref-1', content:'Prefers concise answers', kind:'preference', createdAt:fixed });
  assert.equal(record.schema, 'nexus.memory-record.v1');
  assert.equal(record.scope, 'user');
  assert.throws(() => createMemoryRecord({ id:'x', content:' ' }));
  assert.throws(() => createMemoryRecord({ id:'x', content:'ok', kind:'secret' }));
});

test('memory store supports scoped listing, update, deletion, and export', () => {
  let now = fixed;
  const store = createMemoryStore({ clock:() => now });
  store.add(createMemoryRecord({ id:'p1', content:'Local by default', kind:'preference', createdAt:fixed }));
  store.add(createMemoryRecord({ id:'s1', content:'Current task', kind:'task', scope:'session', createdAt:fixed }));
  assert.equal(store.list().length, 2);
  assert.equal(store.list({ scope:'session' }).length, 1);
  assert.equal(store.update('p1', { content:'Local-only by default' }).content, 'Local-only by default');
  assert.throws(() => store.add(createMemoryRecord({ id:'p1', content:'Duplicate', createdAt:fixed })));
  assert.equal(store.export().schema, 'nexus.memory-store.v1');
  assert.equal(store.remove('s1'), true);
  assert.equal(store.get('s1'), undefined);
});

test('expired memory is hidden by default and can be explicitly inspected', () => {
  const store = createMemoryStore({ clock:() => '2026-10-10T00:00:00.000Z' });
  store.add(createMemoryRecord({ id:'old', content:'Temporary note', createdAt:fixed, expiresAt:'2026-10-09T00:00:00.000Z' }));
  assert.equal(store.list().length, 0);
  assert.equal(store.list({ includeExpired:true }).length, 1);
});

test('file memory store persists locally and reloads versioned data', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nexus-memory-'));
  const path = join(directory, 'memory.json');
  try {
    const adapter = createFileMemoryStore({ path });
    const store = await adapter.load({ clock:() => fixed });
    store.add(createMemoryRecord({ id:'p1', content:'User-approved preference', createdAt:fixed }));
    await adapter.save(store);
    const raw = await readFile(path, 'utf8');
    assert.match(raw, /nexus.memory-store.v1/);
    const loaded = await adapter.load({ clock:() => fixed });
    assert.equal(loaded.get('p1').content, 'User-approved preference');
  } finally { await rm(directory, { recursive:true, force:true }); }
});
