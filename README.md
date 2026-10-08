# Nexus Foundation

Nexus Foundation is a neutral public reference implementation for explicit system composition, lifecycle control, resources, interfaces, relationships, evidence, provenance, authorization, execution, synchronization, persistence, and extensions.

The public model is domain-neutral. It does not contain personal applications, private ontology, personal data, private vocabulary, secrets, or private system configuration.

## Design evidence

1. Function: what a component does.
2. Sequence: what must happen before what.
3. Interface: what a component accepts and exposes.
4. Hardware: the physical or operating-system mechanism grounding the function.

## Core architecture

Platform → Initialization → Firmware → Boot → Kernel → Interfaces → Resources → Runtime → Extensions → Applications → State/Events → Shutdown

The public core binds those lifecycle concepts through executable primitives:

Entity → Resource → Interface → Capability → Authorization → Execution
Relationship ← Event ← Evidence ← Provenance
State ↔ Synchronize / Reconcile ↔ Persistence

## Guarantees and boundaries

The library makes state transitions explicit and rejects invalid transitions. Evidence is required for state promotion. Authentication and authorization are separate concepts. Events carry evidence and provenance rather than becoming truth automatically. Synchronization reports conflicts instead of silently choosing an answer.

The implementation is intentionally in-process and standard-library-only. Network protocols, operating-system control, databases, and domain applications belong in adapters or extensions.

## Specification traceability

Normative executable domains follow: SPEC → SOURCE → TEST → CI

See docs/architecture.md for the component map and docs/public-release.md for release controls.

## CLI

npm test
npm run cli -- status
npm run cli -- sequence
