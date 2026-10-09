# Agentic Runtime Implementation Roadmap

This roadmap covers the next layer above the existing local-first governed runtime.

## Phase 1: Topology contract
- [x] Define extensible public node contract.
- [x] Validate node identity, dependency references, relationship references, and dependency cycles.
- [ ] Import the authoritative canonical node map with provenance and version.
- [ ] Review the public/private terminology boundary.

## Phase 2: Stack execution
- [x] Define a minimal task/result envelope for the in-process runner; richer worker contracts remain pending.
- [x] Provide a bounded DAG runner that also supports sequential execution with `maxConcurrency: 1`.
- [x] Add bounded DAG scheduling, dependency-aware fan-out/fan-in, cancellation signals, task deadlines, and partial-failure policies.
- [ ] Add concurrency enforcement for node-level `serial` and `exclusive` policies and resource budgets.
- [ ] Preserve evidence and provenance across handoffs.
- [ ] Test duplicate jobs, worker failures, revoked permissions, cross-task contamination, and audit-write failures.

## Phase 3: Memory lifecycle
- [ ] Add lifecycle metadata and migration.
- [ ] Implement exact deduplication with provenance preservation.
- [ ] Add supersession, archival, quarantine, and adjudication records.
- [ ] Add token-aware context selection, separate from durable deletion.
- [ ] Validate policy against contradictory, stale, adversarial, and unsupported records.

## Phase 4: Hardening and measurement
- [ ] Run tests and benchmarks on supported target hardware.
- [ ] Evaluate local data-at-rest protection and process isolation.
- [ ] Verify website deployment and release artifacts before public claims.
- [ ] Document resource budgets and recovery behavior.

## Constraints
The canonical map is the source of truth. Do not hard-code a 15-node limit or reconstruct missing nodes from a partial historical outline. Agent roles do not imply capabilities; model proposals do not imply permission; context eviction does not imply durable deletion.


The current runner is a first in-process primitive. It does not yet bind canonical map nodes to workers, enforce per-node concurrency policy, persist task state, or provide process isolation.
