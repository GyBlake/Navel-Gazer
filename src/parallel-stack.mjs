const FAILURE_MODES = Object.freeze(['continue-independent','halt-on-failure']);
const TERMINAL = new Set(['SUCCEEDED','FAILED','CANCELLED','BLOCKED']);

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' must be a non-empty string');
  return value.trim();
}
function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) throw new TypeError('tasks must be an array');
  const byId = new Map();
  for (const task of tasks) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) throw new TypeError('each task must be an object');
    const taskId = required(task.taskId, 'taskId');
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/.test(taskId)) throw new TypeError('taskId must be a stable identifier');
    if (!Array.isArray(task.dependencies ?? [])) throw new TypeError('task dependencies must be an array');
    const dependencies = (task.dependencies ?? []).map(value => required(value, 'dependency'));
    if (new Set(dependencies).size !== dependencies.length) throw new TypeError('task dependencies must not contain duplicates');
    if (dependencies.includes(taskId)) throw new TypeError('task cannot depend on itself: ' + taskId);
    if (byId.has(taskId)) throw new Error('Duplicate task: ' + taskId);
    byId.set(taskId, Object.freeze({ taskId, dependencies:Object.freeze(dependencies), payload:task.payload ?? null }));
  }
  for (const task of byId.values()) {
    for (const dependency of task.dependencies) if (!byId.has(dependency)) {
      const error = new Error('Unknown dependency "' + dependency + '" for task "' + task.taskId + '"');
      error.code = 'STACK_DEPENDENCY_NOT_FOUND';
      throw error;
    }
  }
  const colors = new Map();
  function visit(taskId) {
    const color = colors.get(taskId) ?? 0;
    if (color === 1) {
      const error = new Error('Task dependency cycle detected at ' + taskId);
      error.code = 'STACK_DEPENDENCY_CYCLE';
      throw error;
    }
    if (color === 2) return;
    colors.set(taskId, 1);
    for (const dependency of byId.get(taskId).dependencies) visit(dependency);
    colors.set(taskId, 2);
  }
  for (const taskId of byId.keys()) visit(taskId);
  return byId;
}
function errorRecord(error) {
  return Object.freeze({
    code:typeof error?.code === 'string' ? error.code : 'STACK_TASK_FAILED',
    message:typeof error?.message === 'string' ? error.message.slice(0, 1000) : 'Task failed'
  });
}

/**
 * Run a dependency DAG with bounded concurrency. This runner schedules work only;
 * authorization for any external operation remains the responsibility of the
 * governed runtime/tool broker used by the supplied execute callback.
 */
export async function runParallelStack({
  tasks, execute, maxConcurrency=4, failureMode='continue-independent',
  taskTimeoutMs=0, signal=null, clock=() => new Date().toISOString()
} = {}) {
  if (typeof execute !== 'function') throw new TypeError('execute callback required');
  if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1 || maxConcurrency > 256) {
    throw new TypeError('maxConcurrency must be an integer between 1 and 256');
  }
  if (!FAILURE_MODES.includes(failureMode)) throw new TypeError('Unknown failureMode: ' + failureMode);
  if (!Number.isInteger(taskTimeoutMs) || taskTimeoutMs < 0) throw new TypeError('taskTimeoutMs must be a non-negative integer');
  if (signal !== null && (typeof signal !== 'object' || typeof signal.aborted !== 'boolean' || typeof signal.addEventListener !== 'function')) {
    throw new TypeError('signal must be an AbortSignal or null');
  }
  if (typeof clock !== 'function') throw new TypeError('clock must be a function');

  const byId = normalizeTasks(tasks ?? []);
  const states = new Map([...byId.keys()].map(taskId => [taskId, {
    taskId, status:'PENDING', output:null, error:null, startedAt:null, finishedAt:null
  }]));
  let halted = false;

  function finish(taskId, status, { output=null, error=null, startedAt=null } = {}) {
    const current = states.get(taskId);
    states.set(taskId, {
      taskId, status, output, error,
      startedAt:startedAt ?? current.startedAt,
      finishedAt:clock()
    });
  }

  async function runOne(task) {
    const startedAt = clock();
    states.set(task.taskId, { ...states.get(task.taskId), status:'RUNNING', startedAt });
    const controller = new AbortController();
    let timer = null;
    let timeoutReject;
    let abortReject;
    const timeoutPromise = new Promise((_, reject) => { timeoutReject = reject; });
    const abortPromise = new Promise((_, reject) => { abortReject = reject; });
    const onAbort = () => {
      const error = new Error('Stack execution cancelled');
      error.code = 'STACK_CANCELLED';
      abortReject(error);
      controller.abort(signal?.reason);
    };
    if (signal?.aborted) onAbort();
    else signal?.addEventListener('abort', onAbort, { once:true });
    if (taskTimeoutMs > 0) {
      timer = setTimeout(() => {
        const error = new Error('Task timed out after ' + taskTimeoutMs + ' ms');
        error.code = 'STACK_TASK_TIMEOUT';
        timeoutReject(error);
        controller.abort(error);
      }, taskTimeoutMs);
    }
    const dependencyResults = Object.freeze(Object.fromEntries(task.dependencies.map(id => [id, states.get(id)])));
    try {
      const work = Promise.resolve().then(() => execute({
        task,
        dependencies:dependencyResults,
        signal:controller.signal
      }));
      const races = [work];
      if (taskTimeoutMs > 0) races.push(timeoutPromise);
      if (signal) races.push(abortPromise);
      const output = await Promise.race(races);
      finish(task.taskId, 'SUCCEEDED', { output, startedAt });
    } catch (error) {
      const record = errorRecord(error);
      const status = record.code === 'STACK_CANCELLED' ? 'CANCELLED' : 'FAILED';
      finish(task.taskId, status, { error:record, startedAt });
    } finally {
      if (timer !== null) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  while ([...states.values()].some(state => state.status === 'PENDING' || state.status === 'RUNNING')) {
    if (signal?.aborted) {
      for (const [taskId, state] of states) if (state.status === 'PENDING') finish(taskId, 'CANCELLED', {
        error:Object.freeze({code:'STACK_CANCELLED',message:'Stack execution cancelled before task started'})
      });
      break;
    }
    if (failureMode === 'halt-on-failure' && [...states.values()].some(state => state.status === 'FAILED' || state.status === 'CANCELLED')) halted = true;
    if (halted) {
      for (const [taskId, state] of states) if (state.status === 'PENDING') finish(taskId, 'BLOCKED', {
        error:Object.freeze({code:'STACK_HALTED',message:'Stack halted after a task failure'})
      });
      break;
    }

    let changed = false;
    for (const [taskId, state] of states) {
      if (state.status !== 'PENDING') continue;
      const dependencyStates = byId.get(taskId).dependencies.map(id => states.get(id));
      if (dependencyStates.some(item => TERMINAL.has(item.status) && item.status !== 'SUCCEEDED')) {
        finish(taskId, 'BLOCKED', { error:Object.freeze({code:'STACK_DEPENDENCY_FAILED',message:'A prerequisite did not succeed'}) });
        changed = true;
      }
    }
    if (changed) continue;

    const ready = [...byId.values()].filter(task =>
      states.get(task.taskId).status === 'PENDING' &&
      task.dependencies.every(id => states.get(id).status === 'SUCCEEDED')
    ).slice(0, maxConcurrency);
    if (!ready.length) {
      for (const [taskId, state] of states) if (state.status === 'PENDING') finish(taskId, 'BLOCKED', {
        error:Object.freeze({code:'STACK_NO_PROGRESS',message:'Task could not become ready'})
      });
      break;
    }
    await Promise.all(ready.map(runOne));
  }

  const results = [...states.values()].map(state => Object.freeze({...state}));
  const counts = Object.fromEntries(['SUCCEEDED','FAILED','CANCELLED','BLOCKED'].map(status => [
    status, results.filter(result => result.status === status).length
  ]));
  return Object.freeze({
    schema:'navel-gazer.parallel-stack-result.v1',
    status:counts.FAILED || counts.CANCELLED ? 'INCOMPLETE' : counts.BLOCKED ? 'BLOCKED' : 'SUCCEEDED',
    startedAt:results.find(result => result.startedAt)?.startedAt ?? null,
    completedAt:clock(),
    maxConcurrency,
    failureMode,
    counts:Object.freeze(counts),
    results:Object.freeze(results)
  });
}

export { FAILURE_MODES as STACK_FAILURE_MODES };
