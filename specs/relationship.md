# Relationship Specification

A relationship is a bounded association between two addressable entities.

```text
DISCOVERING → IDENTIFIED → CONNECTED → HANDSHAKEN → AUTHENTICATED
→ AUTHORIZED → ESTABLISHED → NEGOTIATING → ACTIVE → SYNCHRONIZING
→ SYNCHRONIZED → EXCHANGING → RECONCILING → INTEGRATED
```

Teardown:

```text
ACTIVE / INTEGRATED → TEARING_DOWN → DISCONNECTED
```

Connection does not imply authorization. Authentication establishes identity evidence. Authorization establishes permitted operations. Synchronization does not imply semantic equivalence. Exchange does not imply ownership. Integration is optional.

Domain-specific interface types belong to extensions, not the core.
