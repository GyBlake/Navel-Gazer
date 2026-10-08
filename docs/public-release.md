# Public Release Controls

Before release:
- verify source provenance;
- identify third-party code and licenses;
- confirm no private material, personal data, credentials, or private configuration;
- use synthetic or appropriately licensed examples;
- review dependencies;
- enable secret scanning, push protection, code scanning, dependency alerts, and security updates where available;
- run tests and interface/state-transition validation;
- maintain security and privacy documentation;
- preserve third-party notices.

The core intentionally avoids a network server, database vendor, external identity provider, or domain application. Those belong in adapters/extensions.

This is an engineering control, not a legal opinion or guarantee of compliance with every jurisdiction. Deployment, distribution, commercialization, and regulated use require context-specific legal review.