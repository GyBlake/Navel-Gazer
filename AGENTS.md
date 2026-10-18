# Agent Instructions

For any UI, dashboard, app screen, website, graphic, infographic, diagram, report, or other visual deliverable, follow `DESIGN_TOOLCHAIN.md` as the visual-quality contract.

- Think as a design director, implementation engineer, and accessibility/visual-QA reviewer.
- Inspect existing styles, assets, and components before introducing new ones.
- Use Figma for editable designs and handoff; Product Design for flows/prototypes; Adobe for image refinement; Playwright MCP for local browser QA when authorized and actually available.
- Never claim an integration was used or a screenshot/design/test was produced without evidence from the current execution.
- Keep real text and chart data editable in code/SVG/native components; do not fabricate values.
- Check mobile and desktop layouts, contrast, focus/keyboard use, overflow, hit areas, and loading/empty/error states.
- Keep secrets, personal data, and confidential assets out of Git and public issue text.

## Project-specific visual direction
Keep the public product surface plain-language, user-centered, local-first, and privacy-conscious. Visually communicate capability, permissions, evidence, status, and user control without exposing private terminology or claiming unimplemented features. Favor polished desktop and responsive web UI.

Keep changes scoped, preserve existing behavior, and get explicit authorization before destructive operations, publishing, or other consequential external side effects.
