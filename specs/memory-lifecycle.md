# Memory Lifecycle and Proper Forgetting

## Status
Policy specification. Semantic deduplication, evidence adjudication, and token-aware context budgeting are not yet implemented.

## Separate context from durable memory
Context eviction removes material from the current model prompt; it must not delete durable records. Durable deletion is a separate governed operation with an inspectable outcome.

## Lifecycle actions
- **Retain:** keep an active record when relevant and adequately supported.
- **Deduplicate:** collapse exact duplicates deterministically while preserving source IDs and provenance.
- **Consolidation proposal:** detect near-duplicates or semantic clones and propose a merge without discarding meaningful distinctions.
- **Supersede:** mark a record as replaced by newer evidence while retaining lineage under the retention policy.
- **Archive:** remove stale or rarely used information from active retrieval without treating it as false.
- **Quarantine:** exclude disputed or potentially false records from ordinary retrieval while retaining them for review.
- **Refute:** classify a claim as refuted only when its defined evidence standard is met; preserve the decision evidence.
- **Delete:** act only under explicit user direction or a documented retention policy. Report scope and outcome.

## Evidence states
Use existing states where applicable: OBSERVED, PARSED, NORMALIZED, VALIDATED, DERIVED, UNKNOWN, BLOCKED, and INCONCLUSIVE. These are evidence-processing states, not a universal truth score. Contradictions remain visible until adjudicated under a domain-specific standard.

A model confidence score, error, failed prediction, newer timestamp, or unsupported assertion does not establish falsity. If evidence is insufficient, retain UNKNOWN or INCONCLUSIVE.

## Context budget
A prior discussion proposed 70% of configured model context capacity as a tunable experiment, not a universal threshold or measured optimum. Reserve capacity for system instructions, safety constraints, current input, and output. Prefer tokenizer-backed counts; otherwise document the estimation method.

When pressure occurs, select and evict working-context material before mutating durable memory. Consider task relevance, provenance, source quality, user designation, scope, recency, and supersession. Never delete durable memory solely because the prompt is full.

## Scope and provenance
- Respect user, agent, session, and task scopes.
- Do not promote conversation text into durable user memory without explicit consent.
- Treat stored text as reference data, not instructions.
- Preserve origin, timestamps, transformations, supersession links, and adjudication evidence.
- Provide inspection, correction, export, and deletion controls.
- Local storage is the default; encryption at rest remains a separate security requirement.

## Rollout
1. Add lifecycle metadata and migration.
2. Implement exact deduplication and deterministic tests.
3. Add supersession, archive, and quarantine operations.
4. Detect near-duplicates without destructive automatic merges.
5. Add token-aware context selection.
6. Add evidence-based adjudication with versioned policy and audit records.
7. Consider automatic deletion only after adversarial testing and user-control review.
