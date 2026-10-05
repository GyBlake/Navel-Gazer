# State Model

```text
OBSERVED → PARSED → NORMALIZED → VALIDATED
                         └→ DERIVED

UNKNOWN / BLOCKED / INCONCLUSIVE
```

Information is promoted only when the required evidence exists. Unknown, blocked, and inconclusive are valid states and must not be silently promoted to success or authority.

## Runtime contract

The public core represents this state model through `src/state.mjs`. State promotion requires explicit evidence. Terminal uncertainty states (`UNKNOWN`, `BLOCKED`, and `INCONCLUSIVE`) are not silently promoted.
