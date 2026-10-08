# Navel Gazer Product Strategy

## Product direction

Navel Gazer is being developed as a desktop-first, local-first personal AI assistant backed by a reusable, model-independent governed runtime.

**Product promise:** Your personal AI. Your machine. Your rules.

The user-facing app is the first product. The runtime remains separate so future interfaces can reuse agent configuration, memory, permissions, and evidence contracts.

## Initial audience

Everyday users who want a useful personal assistant without depending on a paid AI API or sending private conversations to a cloud provider by default.

## MVP boundary

- Local interface MVP with chat, model selection, diagnostics, and local model connection.
- Electron desktop wrapper for the local interface.
- Signed installers and guided first-run setup.
- Ollama as the first model-runner adapter, with model choice kept configurable.
- Personalized agent profiles and conversation sessions.
- Explicit user-controlled memory with inspect, edit, export, and delete operations.
- Local-first data handling and clear network behavior.
- Small, permissioned tool set, initially read-only.
- Diagnostics, backups, and bounded recovery.

Defer always-listening audio, unrestricted shell or computer control, background autonomy, multi-device sync, foundation-model training, and OS replacement.

## Architecture principles

1. Keep UI separate from the core runtime.
2. Default to local inference and local storage.
3. Treat network access as an explicit policy decision.
4. Store only memory deliberately added through an explicit application flow.
5. Treat model output and retrieved content as untrusted input.
6. Route governed actions through capability checks, authorization, execution, and evidence logging.
7. Keep providers and interface layers replaceable.
8. Avoid telemetry by default; future diagnostics sharing must be opt-in and documented.

## Public benefit and community

The project website should explain AI governance in accessible language, invite contributions, publish a transparent roadmap, and explore responsible applications that improve human well-being and planetary conditions. Environmental claims should be evidence-led and distinguish measured results from aspirations.

## Release gates

- No prompts, memory, or telemetry leave the device without explicit authorization.
- Users can inspect, edit, export, and delete saved memory.
- Model output cannot bypass authorization.
- Model and tool failures do not corrupt unrelated state.
- A nontechnical user can complete first-run setup.
- Core use does not require a paid model API.
- User data and agent profiles have documented export formats.
