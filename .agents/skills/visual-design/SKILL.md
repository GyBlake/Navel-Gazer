---
name: visual-design
description: Design and implement polished visual artifacts, including product UI, graphics, dashboards, diagrams, storyboards, and image assets. Use whenever a task has a visual output or needs visual-quality review.
---

# Visual Design Workflow

Use this skill for visual work in this repository. Follow `DESIGN_TOOLCHAIN.md` and existing project conventions.

## 1. Frame the work
- Identify audience, communication goal, output surface, content, constraints, and acceptance criteria.
- Inspect existing UI, components, visual tokens, brand assets, and responsive conventions before creating a new style.
- Define hierarchy, focal point, semantic color roles, type scale, grid/spacing, and imagery/motion before implementing.
- For exploration requests, present two or three meaningfully different directions with trade-offs.

## 2. Choose and use the right tools
- **Figma** for editable design source of truth, components, variables, diagrams, critique, and handoff.
- **Product Design** for product directions, flow audits, clickable prototypes, and interaction exploration.
- **Adobe** for image retouching, background work, cropping/expansion, and final asset refinement.
- **Playwright MCP** for browser interactions, responsive review, screenshots, and checks against a running local web app.
- **Code-native SVG/HTML/native UI** for exact text, diagrams, charts, and production layouts that must remain editable.
- Use integrations only when exposed and authorized in the current environment. Never claim a tool was used without execution evidence.

## 3. Implement with intent
- Reuse current components and semantic tokens; add new ones only for a real design gap.
- Avoid generic AI gradients, excessive glass effects, unmotivated icon sets, gratuitous cards, and template-like decoration.
- Keep critical text, labels, and data editable rather than baked into an image.
- Never fabricate data, metrics, research, testimonials, logos, or product capabilities.
- Keep credentials, personal user data, and confidential assets out of Git.

## 4. Review the rendered artifact
- Run the relevant documented local preview when possible.
- For responsive interfaces inspect one narrow/mobile viewport and one desktop viewport.
- Check layout and crop, line breaks, hierarchy, contrast, keyboard and focus behavior, reduced motion, hit areas, overflow, loading/empty/error states, and broken media.
- Use Playwright evidence when possible. Source inspection alone is not visual QA.
- Clean up placeholders, report the tests and outputs actually produced, and list meaningful unknowns.

## Project-specific direction
Keep public product visuals plain-language, transparent, privacy-conscious, and user-centered. Communicate status, permissions, evidence, and control; never expose private vocabulary or present unimplemented capabilities as live.

## Completion gate
Finish only when the result satisfies the brief, respects the project’s design conventions, and has been reviewed as far as this environment permits. Obtain explicit approval before publishing, destructive edits, source-of-truth overwrite, or external asset upload.
