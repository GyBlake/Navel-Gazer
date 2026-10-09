# Agentic Topology Specification

## Status

Initial public contract. This specification intentionally does not enumerate the canonical product nodes. The authoritative map must be supplied and versioned separately; no historical partial list is treated as complete.

## Purpose

Represent the canonical map as an extensible, machine-readable topology. Node identity and relationships are stable across model substitutions. A node may be implemented by a reasoning agent, deterministic service, sensor, validator, coordinator, or resource controller.

## Node contract

The initial schema is `navel-gazer.topology-node.v1` and includes:

- `nodeId`: stable, unique identifier independent of model/provider.
- `responsibility`: human-readable jurisdiction.
- `implementation`: implementation class, not authority.
- `capabilities`, `inputs`, `outputs`: declared interface.
- `dependencies`: directed execution prerequisites.
- `relationships`: typed topology relationships, separate from execution dependencies.
- `memoryScopes`: explicitly named memory scopes available to the node.
- `concurrencyPolicy`: `parallel`, `serial`, or `exclusive`.
- `failurePolicy`: `halt-dependent`, `continue-independent`, or `manual-review`.
- `provenancePolicy`: required lineage behavior.
- `coordinates`: optional finite x/y/z coordinates when the source map has spatial placement.
- `metadata`: extension point for versioned public metadata.

## Invariants

1. Node count is not fixed. Additions require unique stable IDs and topology validation.
2. A node ID does not imply a model, tool grant, or permission.
3. Relationship semantics and execution dependencies are distinct. A conceptual relationship does not automatically mean a task must wait for another task.
4. All dependency targets and relationship targets must resolve before a topology is considered valid.
5. Dependency cycles are rejected for executable DAGs. Non-execution conceptual relationships may be cyclic.
6. A node's memory scope and capabilities must be enforced by the runtime, not trusted because they appear in model output or node metadata.
7. Model output is untrusted input. It cannot alter topology, grant permissions, or approve consequential actions.
8. Preserve source-map identity and provenance during import. Never infer missing nodes from an incomplete list.
9. Public IDs and descriptions must not disclose private Dreamguard terminology, proprietary agents, or private implementation details.

## Parallelism

The topology records concurrency policy and dependencies, but scheduling is a separate runtime concern. A scheduler may run independent nodes concurrently only when their declared policies and resource budgets permit it. Results must be reconciled with provenance, errors, and partial-completion status intact.

## Versioning and import

Every imported canonical map must carry a source identifier, version, and provenance record. A changed map should produce a reviewed topology version/diff. Existing node identities should remain stable when responsibilities move; breaking identity changes require an explicit migration record.

## Current implementation

`src/agentic-topology.mjs` validates node contracts, uniqueness, dependency references, relationship targets, and dependency cycles. It is a registry and validator, not yet a parallel execution scheduler and not yet populated with the canonical map.
