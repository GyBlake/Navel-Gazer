# Navel Gazer

Navel Gazer is an open project developing a private, local-first personal AI assistant backed by a neutral, governed runtime. The goal is practical capability with user-controlled memory, explicit permissions, evidence-aware execution, and local operation by default.

**Product status:** in development. The repository provides runtime primitives, local agent interfaces, durable local conversation storage, and an early browser-based local assistant interface. An Electron desktop wrapper is now included for development; signed installers and a production release are not yet available.

## Project principles

- **Local first:** prefer inference and storage on the user's device.
- **User-controlled memory:** make saved information inspectable, editable, exportable, and deletable.
- **Governed actions:** model output is not authority; tool execution must pass explicit capability and authorization checks.
- **Evidence and provenance:** distinguish observations from assumptions and preserve lineage for governed operations.
- **Failure containment:** model or connector failures should not silently compromise unrelated resources.
- **Public benefit:** explore responsible applications that improve human well-being and planetary conditions, measuring outcomes rather than assuming benefit.

## Current foundation

The runtime provides explicit system composition, lifecycle control, resources, interfaces, relationships, evidence, provenance, authorization, execution, synchronization, persistence, extensions, observability, local agent mounting, and a governed tool router. Model-proposed actions are proposals only: registered tools pass through capability and authorization checks, and consequential actions require host-mediated user approval.

Architecture lifecycle:

Platform → Initialization → Firmware → Boot → Kernel → Interfaces → Resources → Runtime → Extensions → Applications → State/Events → Shutdown

The core is model-independent. The initial local model path uses Ollama as a provider adapter. The local UI MVP includes chat, conversation management, explicit memory controls, settings, and diagnostics. Settings now include a user-owned hardware/task profile, installed-model selection, and a transparent heuristic recommendation for models already available in Ollama. The profile does not download models or enable remote access. MCP preferences are recorded for planning, but a general MCP connection manager is not yet implemented; see [Personal AI Profile and MCP Roadmap](docs/personal-ai-profile-and-mcp.md). Run `npm install` then `npm run desktop` for the Electron wrapper, or `npm run app` for the browser interface. Unsigned development build configuration is included; signed release packaging and first-run onboarding remain planned work.

## Memory contract

The versioned memory API in `src/memory.mjs` supports explicit records, scopes, kinds, expiry, local JSON persistence, and export. The conversation-session API in `src/session.mjs` provides bounded chat history, and `src/conversation-store.mjs` adds versioned in-memory and local JSON persistence, restoration, export, deletion, and retention pruning. Sessions can persist messages through an explicit host-provided store callback. Conversations are not automatically promoted to saved user memories, and the local JSON adapter does not encrypt files. A user-facing application must ask before adding memories and provide inspection, editing, export, and deletion controls. See [Conversation Sessions](docs/conversation-sessions.md) and [Governed Tool Execution](docs/governed-tool-execution.md).

## Community website

A dependency-free static website preview lives in `website/`. Open `website/index.html` locally to preview it. The page contains no analytics, external font imports, or third-party scripts.

The website deployment workflow is configured, but a live URL will only be announced after repository Pages settings and a successful deployment are verified. See `docs/community-website.md`.

## Development

Requirements: Node.js 24 or newer.

```sh
npm install
npm run desktop
# or: npm run app
npm test
npm run cli -- status
npm run cli -- sequence
```

See [Product Strategy](docs/product-strategy.md), [Architecture](docs/architecture.md), [Local Agent Mounting](docs/local-agent-mounting.md), [Privacy](PRIVACY.md), and [Security](SECURITY.md).

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Use synthetic examples, do not commit personal data or private configuration, and label proposals separately from implemented features.
