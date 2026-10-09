# Parallel Stack Orchestration

## Status
The initial bounded DAG runner is implemented in `src/parallel-stack.mjs`. The runner schedules callback work; it does not itself grant capabilities, enforce MCP permissions, persist audit records, or isolate processes. The supplied `execute` callback must use the governed runtime for external operations.

## Execution model
A stack is a bounded workflow over topology nodes. Execution dependencies form a directed acyclic graph. Conceptual relationships do not automatically impose scheduling order.

Required scheduler features:
- deterministic dependency readiness and bounded concurrency;
- fan-out and fan-in;
- task deadlines and cancellation;
- node concurrency policy and resource budgets;
- distinct states for pending, ready, running, succeeded, failed, cancelled, blocked, and inconclusive;
- explicit handling of independent branches after failures;
- stable task IDs and duplicate-task protection;
- structured outputs with evidence and provenance references;
- reconciliation that preserves disagreement and partial results;
- shutdown without claiming unfinished tasks succeeded.

## Governance
Workers cannot grant capabilities or bypass authorization. Tool calls use the existing governed execution path, including required user approval and audit persistence. Tool descriptions, retrieved content, and model-produced arguments are untrusted data.

## Delivery sequence
1. Validate topology and worker contracts.
2. Implement a sequential runner as reference behavior.
3. Add bounded concurrency and fan-out/fan-in.
4. Test timeout, cancellation, failure, and duplicate-execution behavior.
5. Add telemetry and target-hardware benchmarks.
6. Bind canonical nodes to implementations only after the authoritative map is imported.

## Acceptance criteria
No dependency executes before prerequisites succeed. Independent branches may run concurrently within configured limits. Failed prerequisites block dependent work. Independent branches follow explicit failure policy. Every outcome remains distinguishable, and execution never implies authorization.


## Current runner behavior
The runner validates task IDs, dependencies, and acyclicity; executes ready tasks with bounded concurrency; passes successful dependency results to downstream tasks; blocks tasks whose prerequisites fail; supports `continue-independent` and `halt-on-failure`; accepts an AbortSignal; and can apply a per-task timeout. Cancellation is cooperative: callbacks should observe the provided signal and stop their own work. A timed-out callback that ignores cancellation may continue outside the runner's control.

The runner returns structured per-task status, output/error metadata, and aggregate counts. It is an in-process execution primitive, not a distributed scheduler.
