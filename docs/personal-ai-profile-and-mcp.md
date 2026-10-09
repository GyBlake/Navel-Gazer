# Personal AI Profile, Model Selection, and MCP Roadmap

## User-owned profile

The local application stores a profile beside model settings. It includes platform, approximate system-memory tier, task preferences, optimization target, and preferred integration style. Values are user-provided hints, not hardware measurements or guarantees. The profile does not automatically download models, change privacy policy, or grant tool permissions.

## Model selection and recommendation

The model selector is populated from the configured local Ollama endpoint's installed-model listing. Users may select an installed model or enter a compatible model identifier manually. The current recommendation is deliberately a transparent heuristic using reported model size and name hints for selected tasks. It is not a model-quality benchmark, and model file size is not the same as runtime RAM/VRAM use. It must never be presented as a performance guarantee.

A later model catalog should contain verified runtime compatibility, license, quantization, context capabilities, tool-call/vision support, and measured benchmarks for named hardware. Unknown attributes must remain unknown. Downloads should require a separate, explicit user action.

## MCP integration boundary

The current profile can record that a user wants MCP-compatible or custom tools, but this preference does **not** establish a connection. The current desktop app remains local-only and has no general-purpose MCP connection manager yet.

The local model can now propose tool calls without receiving execution authority:
- A proposal request is sent to the configured local Ollama model, with only tools that are connected and already authorized.
- The endpoint returns structured proposals only. It never invokes a tool.
- Each proposal is reviewed by the user and passed through the broker's one-time challenge, live grant check, and audit path.
- Unapproved tools are not exposed to the model's proposal endpoint. The model cannot grant itself permissions or expand its tool list.
- This is human-approved orchestration, not an autonomous tool loop. Tool descriptions and model-generated arguments remain untrusted and must be reviewed.

The execution path now includes an audited broker:
- Tool arguments are prepared into a short-lived, one-time challenge. The UI reviews the proposal and only then submits the challenge for execution.
- The broker rechecks the live server connection, tool grant, and discovered tool-definition fingerprint at execution time.
- A grant revoked after preparation, an expired/replayed challenge, or a changed tool definition blocks execution.
- A local audit file records request/completion/failure events with Nexus evidence and provenance. It stores argument/output sizes and SHA-256 digests, not raw argument or result bodies.
- The MCP screen displays the recent audit records. Audit persistence failure blocks a new tool invocation; if writing the completion record fails after a tool has already run, the error is marked as executed and must not be interpreted as proof the tool did not run.

The first MCP management slice is now implemented on the feature branch:
- A local registry persists server names, stdio command/arguments, and per-tool grants under the app data directory with owner-only file permissions where supported.
- Registering a server does not launch it. The user must explicitly press Connect.
- The stdio adapter launches without a shell, uses a restricted environment, applies request timeouts and message/output bounds, and discovers tools through MCP JSON-RPC.
- Each discovered tool is denied by default. Grants are per server/tool definition, persisted, and individually revocable. A change to the discovered name, description, or input schema invalidates the previous grant. Every tool invocation requires a separate user confirmation in the UI.
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
