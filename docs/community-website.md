# Community Website

## Purpose

The Navel Gazer website has three jobs:

1. Explain the product and its privacy-first architecture.
2. Build a welcoming community around responsible AI governance and practical capabilities.
3. Connect the project to public-benefit work that can improve human well-being and planetary conditions.

## Initial information architecture

- **Home:** plain-language mission, product status, core principles, and participation links.
- **Product:** what works today, what is planned, and how local-first operation works.
- **AI governance:** privacy, authorization, transparency, provenance, reliability, and human oversight.
- **Human and planetary benefit:** use cases and research questions in accessibility, education, public services, environmental observation, resource efficiency, and resilience.
- **Community:** contribution instructions, discussions, code of conduct, and transparent roadmap.
- **Transparency:** security reporting, privacy statement, release status, and evidence behind public claims.

## Publishing principles

- Clearly label shipped features, experiments, proposals, and aspirations.
- Do not claim AI is inherently beneficial or environmentally sustainable.
- Distinguish measured outcomes from goals and hypotheses.
- Do not publish private user data, internal agent identities, secrets, or private architecture.
- Avoid trackers and third-party scripts by default.
- Keep community participation welcoming, accessible, and behavior-focused.

## Static preview

The website directory is a dependency-free static site. Open website/index.html or serve it with a static file server. The files do not submit user data to a backend.

## Publishing

The repository includes a GitHub Actions deployment workflow at `.github/workflows/pages.yml`. The repository must have GitHub Pages configured to use GitHub Actions. After a website change reaches `main`, verify the deployment run and its published URL before advertising the site as live. Do not add a custom domain or claim a production deployment until it is configured and verified.
