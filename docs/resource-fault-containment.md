# Resource Fault Containment

Nexus treats external resources as failure domains. A resource becoming unavailable does not imply that the foundation, unrelated resources, or other execution paths have failed.

## Availability lifecycle

`UNKNOWN → AVAILABLE → ACTIVE`

A resource can enter:

`AVAILABLE/ACTIVE → UNAVAILABLE → RECOVERING → AVAILABLE`

Terminal administrative states are `DISABLED` and `RETIRED`.

Invalid transitions are rejected. In particular, an unavailable resource cannot jump directly to active execution.

## Failure recording

The resource health module provides:

- `markResourceUnavailable`
- `beginResourceRecovery`
- `markResourceRecovered`
- `recordResourceReadFailure`

Each state transition produces structured evidence, provenance, and an event. Read failures are recorded independently so an adapter can report an error before changing availability state.

## Isolation rule

External failure is local:

1. adapter operation fails or times out;
2. the affected resource may become `UNAVAILABLE`;
3. the failure is recorded with evidence and provenance;
4. unrelated resources remain registered and usable;
5. recovery may return the resource to `AVAILABLE`.

The foundation does not silently retry forever and does not treat an external outage as global system failure.

## Boundary

This module records and governs resource health. It does not itself perform network retries, service discovery, or provider-specific recovery. Those behaviors belong in adapters and must remain bounded, authorized, and observable.
