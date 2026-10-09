import test from 'node:test';
import assert from 'node:assert/strict';
import { authorize, createAuthorizationPolicy } from '../src/authorization.mjs';

test('authorization decisions preserve last matching rule semantics', () => {
  const policy = createAuthorizationPolicy({ rules:[
    {subject:'*',resource:'files',action:'read',effect:'ALLOW'},
    {subject:'agent-a',resource:'files',action:'read',effect:'DENY'},
    {subject:'agent-a',resource:'files',action:'read',effect:'ALLOW'}
  ]});
  assert.equal(authorize(policy,{subject:'agent-a',resource:'files',action:'read'}),'ALLOW');
  assert.equal(authorize(policy,{subject:'agent-b',resource:'files',action:'read'}),'ALLOW');
  assert.equal(authorize(policy,{subject:'agent-a',resource:'files',action:'write'}),'DENY');
});

test('authorization memoization does not change policy decisions', () => {
  const policy = createAuthorizationPolicy({ rules:[
    {subject:'*',resource:'*',action:'read',effect:'ALLOW'},
    {subject:'private-agent',resource:'private',action:'read',effect:'DENY'}
  ]});
  for (let i=0;i<5;i++) {
    assert.equal(authorize(policy,{subject:'public-agent',resource:'docs',action:'read'}),'ALLOW');
    assert.equal(authorize(policy,{subject:'private-agent',resource:'private',action:'read'}),'DENY');
  }
});
