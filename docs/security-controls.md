# Security Controls

The public reference implementation follows a defense-in-depth baseline.

## Source and contribution controls

- Keep secrets, credentials, personal data, and private configuration out of source control.
- Require review of changes to core lifecycle and relationship behavior.
- Preserve provenance for externally supplied state and events.
- Treat unknown, blocked, and inconclusive states as explicit outcomes.
- Validate input at trust boundaries.
- Do not bypass authentication or authorization controls.

## Supply-chain controls

- Dependabot monitors npm and GitHub Actions dependencies.
- Pull requests run dependency review.
- CI runs the test suite.
- Release review checks third-party notices and dependency licenses.
- Lockfiles should be committed when dependencies are introduced.

## Release controls

A release candidate should pass tests and the public-release checklist before publication. Security-sensitive changes should be accompanied by a clear threat and impact assessment.

These controls are aligned with established secure-development guidance, including NIST SP 800-218, but are not a certification or guarantee of compliance with any law or regulation.
