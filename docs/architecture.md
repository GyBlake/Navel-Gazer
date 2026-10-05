# Architecture

## Platform
Physical or virtual execution substrate: CPU/SoC, memory, storage controller, system interconnect, and device interfaces.

## Initialization
Establishes a known machine state through hardware initialization and firmware configuration.

## Boot
Transfers control from initialized hardware into the operating environment through a boot manager or boot program.

## Kernel and services
Manages processes, memory, devices, scheduling, permissions, filesystems, and networking.

## Interfaces
Explicit boundaries for resources and capabilities: filesystem, network, IPC, API, process, and device interfaces.

## Resources
Addressable things with identifiers, type, state, provenance where applicable, and access policy.

## Runtime
Executes authorized work against resources.

## Extensions
Add capabilities without forcing the core to own domain-specific interfaces.

## Applications
Domain-specific software remains outside the neutral core.

## State and events
State represents validated current information. Events represent observations or changes and carry evidence/provenance. An event is not automatically authoritative truth.

## Specification traceability

The repository treats normative executable domains as a four-part chain:

```text
SPEC → SOURCE → TEST → CI
```

Current executable mappings:

| Specification | Source | Tests | CI |
|---|---|---|---|
| `specs/state.md` | `src/state.mjs` | `tests/state.test.mjs` | `npm test` |
| `specs/relationship.md` | `src/relationship.mjs` | `tests/relationship.test.mjs` | `npm test` |
| boot lifecycle described by the architecture | `src/bootstrap.mjs` | `tests/bootstrap.test.mjs` | `npm test` |
| `specs/hardware-grounding.md` | architectural reference | not applicable | not applicable |

Hardware grounding is intentionally descriptive in the neutral core. It defines the physical/OS substrate against which the lifecycle is reasoned about; it does not introduce a simulated hardware abstraction API.
