import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createEventLog } from '../src/event.mjs';
import { createAuthorizationPolicy } from '../src/authorization.mjs';
import { createFilesystemAdapter } from '../src/filesystem.mjs';

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'nexus-fs-'));
  await mkdir(path.join(root, 'nested'));
  await writeFile(path.join(root, 'nested', 'hello.txt'), 'hello from navel');
  return root;
}

test('filesystem adapter reads a contained file through authorization and runtime', async () => {
  const root = await fixture();
  try {
    const events = createEventLog();
    const policy = createAuthorizationPolicy({
      rules:[{subject:'reader', resource:'file:nested/hello.txt', action:'read', effect:'ALLOW'}]
    });
    const adapter = createFilesystemAdapter({
      root,
      authorizationPolicy:policy,
      eventLog:events,
      clock:()=> '2026-01-02T00:00:00.000Z'
    });
    const execution = await adapter.read({
      relativePath:'nested/hello.txt',
      subject:'reader',
      input:{requestId:'r-1'}
    });
    assert.equal(execution.result.content, 'hello from navel');
    assert.equal(execution.bytes, 16);
    assert.match(execution.digest, /^sha256:[0-9a-f]{64}$/);
    assert.equal(execution.event.type, 'EXECUTION_COMPLETED');
    assert.equal(execution.event.provenance.evidence, execution.event.evidence);
    assert.equal(events.list().length, 1);
  } finally {
    await rm(root, {recursive:true,force:true});
  }
});

test('filesystem adapter denies unauthorized reads', async () => {
  const root = await fixture();
  try {
    const events = createEventLog();
    const policy = createAuthorizationPolicy();
    const adapter = createFilesystemAdapter({root, authorizationPolicy:policy, eventLog:events});
    await assert.rejects(
      adapter.read({relativePath:'nested/hello.txt', subject:'unknown'}),
      error => error.code === 'AUTHORIZATION_DENIED'
    );
    assert.equal(events.list()[0].type, 'EXECUTION_DENIED');
  } finally {
    await rm(root, {recursive:true,force:true});
  }
});

test('filesystem adapter rejects path traversal and symlink escape', async () => {
  const root = await fixture();
  const outside = await mkdtemp(path.join(tmpdir(), 'nexus-outside-'));
  try {
    await writeFile(path.join(outside, 'secret.txt'), 'outside');
    const events = createEventLog();
    const policy = createAuthorizationPolicy({
      rules:[{subject:'reader', resource:'*', action:'read', effect:'ALLOW'}]
    });
    const adapter = createFilesystemAdapter({root, authorizationPolicy:policy, eventLog:events});
    await assert.rejects(
      adapter.read({relativePath:'../../etc/passwd', subject:'reader'}),
      /Path escapes adapter root/
    );
    await symlink(path.join(outside, 'secret.txt'), path.join(root, 'escape.txt'));
    await assert.rejects(
      adapter.read({relativePath:'escape.txt', subject:'reader'}),
      /Resolved path escapes adapter root/
    );
    assert.equal(events.list().length, 0);
  } finally {
    await rm(root, {recursive:true,force:true});
    await rm(outside, {recursive:true,force:true});
  }
});
