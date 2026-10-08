import test from 'node:test';
import assert from 'node:assert/strict';
import { createNexusSystem } from '../src/system.mjs';
import { createNexusHttpServer } from '../src/http.mjs';
import { createIpcChannel } from '../src/ipc.mjs';

test('HTTP adapter exposes read-only health and status surfaces', async () => {
  const system = createNexusSystem();
  const api = createNexusHttpServer({system});
  const address = await api.listen();
  try {
    const base = `http://127.0.0.1:${address.port}`;
    const health = await fetch(base + '/health').then(r => r.json());
    const status = await fetch(base + '/status').then(r => r.json());
    const missing = await fetch(base + '/missing');
    assert.equal(health.status,'ok');
    assert.equal(status.schema,'nexus.status.v1');
    assert.equal(missing.status,404);
  } finally {
    await api.close();
  }
});

test('IPC channel uses explicit envelopes and unsubscribe', () => {
  const ipc = createIpcChannel();
  const seen = [];
  const unsubscribe = ipc.subscribe(message => seen.push(message));
  const envelope = ipc.send({type:'PING',payload:{ok:true}});
  assert.equal(envelope.schema,'nexus.ipc.v1');
  assert.equal(seen.length,1);
  unsubscribe();
  ipc.send({type:'PONG'});
  assert.equal(seen.length,1);
});
