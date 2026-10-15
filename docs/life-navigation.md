# Life Navigation and Experience Layer

The Life Navigation layer is a local-first application feature mounted inside Navel Gazer's existing desktop wrapper. It helps a person translate self-chosen goals into small milestones, keep plans visible, and reflect on progress across education, career, housing, finance, wellbeing, and personal projects.

## Governing invariant

The material person remains the source of truth and final authority. The virtual representation is provisional, consent-based, correctable, portable, and deletable. The system must not treat a model inference as a fact or an unverified intention as a completed outcome.

## MVP behavior

- Goals and milestones are stored in the existing per-user local data directory.
- Users choose each goal, its domain, optional target date, and milestone list.
- Milestones begin as pending. A completion requires an explicit user confirmation.
- Completion records are labelled `user-confirmed`, not independently verified. Optional evidence notes are user-provided and do not constitute external verification.
- XP is a small motivational counter derived from user-confirmed milestones. It is not a measure of worth, employability, health, or overall life success.
- Users can edit or delete data through local storage controls as the feature evolves; no cloud account, analytics, external service, or model call is required for basic goal tracking.
- No automated actions are performed against schools, banks, landlords, employers, or public services.

## Cross-platform desktop

The feature runs in the existing Electron wrapper and loopback-only local app server. The same static interface can also run in a desktop browser for development. Packaging targets are inherited from the repository's Electron Builder configuration: macOS DMG/ZIP (x64 and arm64), Windows NSIS (x64), Linux AppImage/DEB (x64). This documents configured targets, not a claim that installers have been built, signed, or tested on every OS.

## Future stages

1. Personal goal and milestone tracking with explicit user-confirmed state.
2. Dependency maps, schedules, and scenario planning, all labelled as recommendations.
3. User-approved resource research and document checklists.
4. Integrations that remain disabled until separately configured and authorized.
5. Outcome verification only where a trustworthy source or user-reviewed evidence exists.
6. SIP-compatible contribution provenance only through a separate, granular opt-in. Personal goals, notes, and life history must never become shared training data by default.

## Acceptance criteria

- Data remains under the existing local data directory.
- HTTP server binds to loopback only.
- Invalid domains, malformed dates, oversized plans, and missing confirmation are rejected.
- A user-confirmed milestone is never described as externally verified.
- XP is derived, not directly editable, and carries a clear non-worth disclaimer.
- Existing Electron navigation allows only same-origin local app navigation; external navigation remains blocked.
- Tests cover validation, consent, completion state, summary calculation, and API persistence.
