# Relationship Specification

A relationship is a bounded association between two addressable entities.

DISCOVERING → IDENTIFIED → CONNECTED → HANDSHAKEN → AUTHENTICATED → AUTHORIZED → ESTABLISHED → NEGOTIATING → ACTIVE → SYNCHRONIZING → SYNCHRONIZED → EXCHANGING → RECONCILING → INTEGRATED

Teardown: ACTIVE / INTEGRATED → TEARING_DOWN → DISCONNECTED

Connection does not imply authorization. Authentication establishes identity evidence. Authorization establishes permitted operations. Synchronization does not imply semantic equivalence. Exchange does not imply ownership. Integration is optional.

Runtime implementation: src/relationship.mjs.

## Relationship record

A relationship contains source and target addresses plus lifecycle state, permissions, capabilities, and provenance metadata. The public resource registry can resolve those addresses without embedding domain-specific semantics in the relationship module.