# State Model

OBSERVED → PARSED → NORMALIZED → VALIDATED → DERIVED

UNKNOWN / BLOCKED / INCONCLUSIVE

Information is promoted only when required evidence exists. Unknown, blocked, and inconclusive are terminal uncertainty states and must not be silently promoted.

Runtime implementation: src/state.mjs.

## Invariant

A transition to PARSED, NORMALIZED, VALIDATED, or DERIVED requires a non-null evidence value. The module records that evidence was supplied; it does not claim the evidence is true.