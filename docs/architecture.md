# Architecture

## Layers

| Layer | Implementation | Purpose |
|---|---|---|
| Platform / boot | src/bootstrap.mjs | Explicit machine/execution lifecycle |
| State | src/state.mjs | Evidence-gated state promotion |
| Entity | src/entity.mjs | Addressable identity |
| Resource | src/resource.mjs | Typed addressable resources and policy metadata |
| Interface | src/interface.mjs | Explicit capability-bearing boundaries |
| Capability | src/capability.mjs | Named operations and resource scope |
| Relationship | src/relationship.mjs | Connection, authorization, synchronization, integration lifecycle |
| Evidence | src/evidence.mjs | Structured observation records |
| Provenance | src/provenance.mjs | Lineage of evidence and derived records |
| Event | src/event.mjs | Observation/change records |
| Authorization | src/authorization.mjs | Explicit allow/deny policy |
| Runtime | src/runtime.mjs | Authorization-gated work execution and result events |
| Synchronization | src/sync.mjs | State comparison and explicit conflict reporting |
| Persistence | src/persistence.mjs | Snapshot serialization/recovery boundary |
| Extensions | src/extensions.mjs | Optional capability additions outside the core |
| Observability | src/observability.mjs | In-process structured telemetry |
| System | src/system.mjs | Composition root for the public primitives |

## Boot lifecycle

PLATFORM → INITIALIZE → FIRMWARE → BOOT → KERNEL → INTERFACES → RESOURCES → RUNTIME → EXTENSIONS → APPLICATIONS → STATE_EVENTS → SHUTDOWN

## Relationship lifecycle

DISCOVERING → IDENTIFIED → CONNECTED → HANDSHAKEN → AUTHENTICATED → AUTHORIZED → ESTABLISHED → NEGOTIATING → ACTIVE → SYNCHRONIZING → SYNCHRONIZED → EXCHANGING → RECONCILING → INTEGRATED

Teardown: ACTIVE / INTEGRATED → TEARING_DOWN → DISCONNECTED

Connection does not imply authorization. Authentication establishes identity evidence. Authorization establishes permitted operations. Synchronization does not imply semantic equivalence. Exchange does not imply ownership. Integration is optional.

## Event/state contract

Events record observations or changes. State represents accepted current information. An event therefore does not automatically authorize a state transition. State promotion requires evidence.

## Resource and interface contract

Resources are addressable typed objects. Interfaces are explicit boundaries owned by an entity and may expose named capabilities. Domain-specific protocols remain outside the core.

## Synchronization contract

The sync module compares two state objects and returns SYNCHRONIZED, RECONCILED, or CONFLICT. The default resolver never silently selects a winner.

## Persistence contract

Snapshots are JSON-serializable records with schema versioning. File persistence is an adapter boundary, not a database engine.

## Hardware grounding

| Function | Hardware / OS grounding |
|---|---|
| Compute | CPU / SoC |
| Persistent initialization data | firmware storage |
| Hardware initialization | BIOS / UEFI |
| Boot transition | EFI boot manager / boot program |
| Execution management | kernel |
| State transport | system interconnect / bus |
| Durable storage | SSD / filesystem |
| Local I/O | device/controller interfaces |
| Active work | process/runtime |
| Added capability | driver/module/plugin |

The neutral core describes these substrates; it does not simulate a motherboard or replace an operating system.