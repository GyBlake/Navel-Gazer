# Personal AI Profile, Model Selection, and MCP Roadmap

## User-owned profile

The local application stores a profile beside model settings. It includes platform, approximate system-memory tier, task preferences, optimization target, and preferred integration style. Values are user-provided hints, not hardware measurements or guarantees. The profile does not automatically download models, change privacy policy, or grant tool permissions.

## Model selection and recommendation

The model selector is populated from the configured local Ollama endpoint's installed-model listing. Users may select an installed model or enter a compatible model identifier manually. The current recommendation is deliberately a transparent heuristic using reported model size and name hints for selected tasks. It is not a model-quality benchmark, and model file size is not the same as runtime RAM/VRAM use. It must never be presented as a performance guarantee.

A later model catalog should contain verified runtime compatibility, license, quantization, context capabilities, tool-call/vision support, and measured benchmarks for named hardware. Unknown attributes must remain unknown. Downloads should require a separate, explicit user action.

## MCP integration boundary

The current profile can record that a user wants MCP-compatible or custom tools, but this preference does **not** establish a connection. The current desktop app remains local-only and has no general-purpose MCP connection manager yet.

The first MCP management slice is now implemented on the feature branch:
- A local registry persists server names, stdio command/arguments, and per-tool grants under the app data directory with owner-only file permissions where supported.
- Registering a server does not launch it. The user must explicitly press Connect.
- The stdio adapter launches without a shell, uses a restricted environment, applies request timeouts and message/output bounds, and discovers tools through MCP JSON-RPC.
- Each discovered tool is denied by default. Grants are per server/tool, persisted, and individually revocable. Every tool invocation requires a separate user confirmation in the UI.
- Tool descriptions and outputs are labeled untrusted; tool results are not automatically injected into model context.
- The current slice supports **stdio tools only**. HTTP/SSE transports, MCP resources/prompts, credential management, model-initiated tool loops, and sandboxing of server code are not implemented. Adding a server launches arbitrary local code when the user explicitly connects it, so only configure commands you trust.

The broader implementation target for MCP remains a governed adapter layer with:
- Explicit server configuration and transport support, with supported transports named in the UI. (The current implementation supports stdio only.)
- User-visible server identity, available tools/resources/prompts, connection health, and provenance.
- Least-privilege per-server and per-tool grants; deny by default.
- Explicit approval for consequential actions, with revocation and disconnect controls.
- Input/output size limits, timeouts, cancellation, and fault containment.
- Credential isolation and no secret exposure to model context or logs.
- A clear local/remote boundary. Remote MCP endpoints or network-enabled model providers must require a separate opt-in and must never be enabled by merely choosing a profile preference.
- Tests for hostile tool descriptions, malformed responses, timeout, revocation, cross-origin boundaries, and attempted privilege escalation.

Model selection and MCP authorization remain independent. A model may propose a tool call; only the governed runtime can authorize and execute it.
