# Personal AI Profile, Model Selection, and MCP Roadmap

## User-owned profile

The local application stores a profile beside model settings. It includes platform, approximate system-memory tier, task preferences, optimization target, and preferred integration style. Values are user-provided hints, not hardware measurements or guarantees. The profile does not automatically download models, change privacy policy, or grant tool permissions.

## Model selection and recommendation

The model selector is populated from the configured local Ollama endpoint's installed-model listing. Users may select an installed model or enter a compatible model identifier manually. The current recommendation is deliberately a transparent heuristic using reported model size and name hints for selected tasks. It is not a model-quality benchmark, and model file size is not the same as runtime RAM/VRAM use. It must never be presented as a performance guarantee.

A later model catalog should contain verified runtime compatibility, license, quantization, context capabilities, tool-call/vision support, and measured benchmarks for named hardware. Unknown attributes must remain unknown. Downloads should require a separate, explicit user action.

## MCP integration boundary

The current profile can record that a user wants MCP-compatible or custom tools, but this preference does **not** establish a connection. The current desktop app remains local-only and has no general-purpose MCP connection manager yet.

The implementation target for MCP is a governed adapter layer with:
- Explicit server configuration and transport support, with supported transports named in the UI.
- User-visible server identity, available tools/resources/prompts, connection health, and provenance.
- Least-privilege per-server and per-tool grants; deny by default.
- Explicit approval for consequential actions, with revocation and disconnect controls.
- Input/output size limits, timeouts, cancellation, and fault containment.
- Credential isolation and no secret exposure to model context or logs.
- A clear local/remote boundary. Remote MCP endpoints or network-enabled model providers must require a separate opt-in and must never be enabled by merely choosing a profile preference.
- Tests for hostile tool descriptions, malformed responses, timeout, revocation, cross-origin boundaries, and attempted privilege escalation.

Model selection and MCP authorization remain independent. A model may propose a tool call; only the governed runtime can authorize and execute it.
