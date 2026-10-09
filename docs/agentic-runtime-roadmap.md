# Agentic Runtime Implementation Roadmap

This roadmap covers the next layer above the existing local-first governed runtime.

## Phase 1: Topology contract
- [x] Define extensible public node contract.
- [x] Validate node identity, dependency references, relationship references, and dependency cycles.
- [ ] Import the authoritative canonical node map with provenance and version.
- [ ] Review the public/private terminology boundary.

## Phase 2: Stack execution
- [ ] Define worker input/output/result envelopes.
- [ ] Build a sequential reference runner.
- [ ] Add bounded DAG scheduling, fan-out/fan-in, cancellation, deadlines, and partial-failure policies.
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
