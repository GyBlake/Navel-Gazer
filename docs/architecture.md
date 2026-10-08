# Architecture

Nexus Foundation is a neutral reference implementation for explicit system composition, execution lifecycle, interfaces, state, provenance, and relationships.

## Reconstruction rule

The public architecture is independently reconstructable from four evidence classes:

- **Function**: what a component does.
- **Sequence**: what must happen before what.
- **Interface**: what a component accepts and exposes.
- **Hardware**: the physical or operating-system mechanism grounding the function.

Private terminology and private application semantics are not part of this model.

## Execution lifecycle

~~~text
PLATFORM → INITIALIZE → FIRMWARE → BOOT → KERNEL → INTERFACES
→ RESOURCES → RUNTIME → EXTENSIONS → APPLICATIONS → STATE/EVENTS → SHUTDOWN
~~~

### Platform
Physical or virtual execution substrate: CPU/SoC, memory, storage controller, system interconnect, and device interfaces.

### Initialization and firmware
Initialization establishes a known machine state. Firmware provides the persistent executable instructions used to initialize hardware. Firmware storage is the medium; firmware is the executable content.

### Boot
A boot manager or boot program transfers control from initialized hardware into the operating environment.

### Kernel and services
The operating-system kernel manages processes, memory, devices, scheduling, permissions, filesystems, and networking.

### Interfaces
Explicit boundaries expose resources and capabilities through filesystem, network, IPC, API, process, and device interfaces.

### Resources
Resources are addressable entities with identifiers, type, state, provenance where applicable, and access policy.

### Runtime
The runtime executes authorized work against resources.

### Extensions
Extensions add capabilities without forcing domain-specific interfaces into the core.

### Applications
Applications contain domain-specific behavior and remain outside the neutral core.

### State and events
State represents validated current information. Events represent observations or changes and carry evidence/provenance. An event is not automatically authoritative truth.

## Specification traceability

Normative executable domains follow:

~~~text
SPEC → SOURCE → TEST → CI
~~~

| Specification | Source | Tests | CI |
|---|---|---|---|
| `specs/state.md` | `src/state.mjs` | `tests/state.test.mjs` | `npm test` |
| `specs/relationship.md` | `src/relationship.mjs` | `tests/relationship.test.mjs` | `npm test` |
| execution lifecycle | `src/bootstrap.mjs` | `tests/bootstrap.test.mjs` | `npm test` |
| `specs/hardware-grounding.md` | `src/hardware.mjs` | `tests/hardware.test.mjs` | `npm test` |
| public boundary | repository source | `tests/public-boundary.test.mjs` | `npm test` |

Hardware grounding is descriptive and traceable. The implementation does not emulate physical hardware.

## Domain boundary

The core provides neutral lifecycle, state, relationship, provenance, and interface scaffolding. Domain-specific semantics belong in extensions or applications.
