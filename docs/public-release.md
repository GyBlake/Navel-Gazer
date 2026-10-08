# Public Release Controls

This repository is intended to remain a neutral public reference implementation. A release is not considered public-ready solely because the code builds.

## Required release checks

### Provenance and intellectual property
- Verify source provenance for every newly added file or substantial implementation.
- Identify third-party source, dependencies, assets, and licenses.
- Preserve required copyright and license notices.
- Do not copy private, proprietary, or unauthorized third-party material into the repository.

### Privacy and personal data
- Confirm that examples and fixtures use synthetic or appropriately licensed data.
- Confirm that no personal conversation exports, account records, credentials, tokens, private keys, or private configuration are present.
- Do not publish secrets or data obtained without authorization.

### Security
- Run the complete test suite.
- Run dependency review on pull requests.
- Maintain Dependabot configuration and security reporting procedures.
- Review trust boundaries, input validation, authorization behavior, and dependency changes.
- Use GitHub secret scanning, push protection, code scanning, and branch/ruleset protections when available for the repository.

### Safety and misuse
- Do not include credential theft, authentication bypass, destructive automation, malware, or mechanisms intended to evade security controls.
- Document security-sensitive behavior and foreseeable misuse.
- Keep the core domain-neutral so applications can add their own safety controls without changing core semantics.

### Legal and regulatory review
The project does not claim universal legal compliance. Before a release or deployment, assess obligations that apply to the actual use case and jurisdiction, including as applicable:

- copyright and open-source licensing;
- privacy and data-protection law;
- security and breach-notification obligations;
- accessibility requirements;
- consumer-protection requirements;
- export and sanctions controls;
- sector-specific regulation;
- contractual and third-party terms.

Where the intended deployment is regulated, handles personal data, or creates material safety or security consequences, obtain appropriate professional review before release.

These controls are engineering safeguards, not legal advice or a certification of compliance.
