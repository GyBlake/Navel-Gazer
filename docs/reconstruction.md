# Public Reconstruction Method

Navel-Gazer is the public reference layer for a neutral infrastructure model. It is reconstructed independently from private application systems.

## Evidence boundary

Only four evidence classes are admissible to the public core:

1. **Function**: observable behavior and responsibility.
2. **Sequence**: ordering and dependency between operations.
3. **Interface**: inputs, outputs, capabilities, and boundaries.
4. **Hardware**: physical or operating-system mechanisms that ground the behavior.

Private terminology, personal applications, personal data, symbolic mappings, and private configuration are not translated into this model. They are outside the public reconstruction boundary.

## Core rule

A public abstraction must be defensible without knowledge of any private implementation or private ontology.

When an abstraction cannot be justified by observable function, sequence, interface, or hardware/OS behavior, it remains outside the core until independently evidenced.

## Domain boundary

The core provides neutral lifecycle, state, relationship, provenance, and interface scaffolding. Domain-specific behavior belongs in applications or extensions.

## Hardware boundary

Hardware grounding is descriptive and traceable. The project does not claim to emulate physical hardware. A storage medium is distinguished from the executable firmware or boot component stored on it.

## Release boundary

The repository must not contain:

- personal or private application data;
- conversation exports or account records;
- credentials, tokens, private keys, or secrets;
- private configuration;
- unauthorized third-party material;
- undocumented copied source code;
- domain-specific private ontology.

This document describes engineering controls, not a legal opinion. Public releases must be reviewed for applicable licensing, privacy, security, export, accessibility, consumer-protection, and other obligations based on the intended use and jurisdiction.
