# Runtime benchmarks and invariants

## Purpose

The runtime baseline script provides repeatable local measurements for state-record allocation, repeated authorization lookups, and provenance-lineage traversal. It also reports process memory and event-loop delay telemetry.

Run with Node 24 or later:

```sh
npm test
npm run bench:runtime
```

Set `BENCH_ITERATIONS` to change the operation count, for example `BENCH_ITERATIONS=100000 npm run bench:runtime`.

## Interpreting results

- Run on an otherwise idle machine and record Node version, operating system, architecture, iteration count, and model/application workload.
- Perform multiple runs; compare medians rather than a single fastest result.
- Use the same environment and workload for before/after comparisons.
- These microbenchmarks do not measure Ollama inference, UI responsiveness under real workloads, durable disk latency, or production graph workloads.
- The authorization case measures repeated identical keys after the first lookup; it is not a general policy-throughput result.
- Event-loop delay is a coarse process-level signal, not a proof of absence of blocking work.

## Invariants

- Authorization remains on the critical path for every protected execution.
- Required state and dependency constraints must be validated before a transition is treated as accepted.
- Non-critical enrichment, indexing, and analytics may be asynchronous only when their delay cannot change an authorization or validity decision.
- Provenance traversal is iterative, detects cyclic references, and has a configurable depth bound.
- No cryptographic integrity guarantee is implied by sequence numbers or this benchmark suite.
- Do not add object pools, worker threads, binary schemas, CSR graph storage, or Merkle batching without a measured workload and an explicit migration rationale.

## Current limitation

This is a baseline harness, not evidence that any optimization improved performance. Capture a baseline first, then make one change at a time and compare results. Avoid publishing raw machine-specific numbers as universal performance claims.
