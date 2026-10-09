import test from 'node:test';
import assert from 'node:assert/strict';
import { runParallelStack } from '../src/parallel-stack.mjs';

test('runs independent tasks concurrently and waits for dependencies', async () => {
  const finished = [];
  const result = await runParallelStack({
    tasks:[
      {taskId:'a',payload:2},
      {taskId:'b',payload:3},
      {taskId:'c',dependencies:['a','b']}
    ],
    maxConcurrency:2,
    execute:async ({task,dependencies}) => {
      finished.push(task.taskId);
      if (task.taskId === 'c') return dependencies.a.output + dependencies.b.output;
      return task.payload * 2;
    }
  });
  assert.equal(result.status,'SUCCEEDED');
  assert.equal(result.counts.SUCCEEDED,3);
  assert.equal(result.results.find(item => item.taskId === 'c').output,10);
  assert.ok(finished.indexOf('c') > finished.indexOf('a'));
  assert.ok(finished.indexOf('c') > finished.indexOf('b'));
});

test('blocks dependent tasks after a prerequisite fails but continues independent work', async () => {
  const result = await runParallelStack({
    tasks:[
      {taskId:'bad'},
      {taskId:'dependent',dependencies:['bad']},
      {taskId:'independent'}
    ],
    maxConcurrency:2,
    execute:async ({task}) => {
      if (task.taskId === 'bad') throw new Error('expected failure');
      return task.taskId;
    }
  });
  assert.equal(result.status,'INCOMPLETE');
  assert.equal(result.results.find(item => item.taskId === 'dependent').status,'BLOCKED');
  assert.equal(result.results.find(item => item.taskId === 'independent').status,'SUCCEEDED');
});

test('halt-on-failure blocks tasks not yet started', async () => {
  const result = await runParallelStack({
    tasks:[{taskId:'bad'},{taskId:'later',dependencies:['bad']},{taskId:'also-later'}],
    maxConcurrency:1,
    failureMode:'halt-on-failure',
    execute:async ({task}) => { if (task.taskId === 'bad') throw new Error('stop'); return true; }
  });
  assert.equal(result.results.find(item => item.taskId === 'later').status,'BLOCKED');
  assert.equal(result.results.find(item => item.taskId === 'also-later').status,'BLOCKED');
});

test('rejects unknown dependencies, cycles, and duplicate tasks', async () => {
  const execute = async () => true;
  await assert.rejects(runParallelStack({tasks:[{taskId:'a',dependencies:['x']}],execute}), /Unknown dependency/);
  await assert.rejects(runParallelStack({tasks:[
    {taskId:'a',dependencies:['b']},{taskId:'b',dependencies:['a']}
  ],execute}), /cycle/);
  await assert.rejects(runParallelStack({tasks:[{taskId:'a'},{taskId:'a'}],execute}), /Duplicate task/);
});

test('reports timeout as failure and does not start dependent work', async () => {
  const result = await runParallelStack({
    tasks:[{taskId:'slow'},{taskId:'next',dependencies:['slow']}],
    maxConcurrency:1,
    taskTimeoutMs:10,
    execute:async ({task,signal}) => {
      if (task.taskId === 'slow') return await new Promise((resolve,reject) => {
        const timer = setTimeout(() => resolve('late'),100);
        signal.addEventListener('abort',() => { clearTimeout(timer); reject(new Error('aborted')); },{once:true});
      });
      return 'next';
    }
  });
  assert.equal(result.results.find(item => item.taskId === 'slow').status,'FAILED');
  assert.equal(result.results.find(item => item.taskId === 'slow').error.code,'STACK_TASK_TIMEOUT');
  assert.equal(result.results.find(item => item.taskId === 'next').status,'BLOCKED');
});

test('respects an already-aborted caller signal', async () => {
  const controller = new AbortController();
  controller.abort();
  const result = await runParallelStack({tasks:[{taskId:'a'}],execute:async () => true,signal:controller.signal});
  assert.equal(result.results[0].status,'CANCELLED');
});
