# Navel Gazer

Navel Gazer is an open project developing a private, local-first personal AI assistant backed by a neutral, governed runtime. The goal is practical capability with user-controlled memory, explicit permissions, evidence-aware execution, and local operation by default.

**Product status:** in development. The repository currently provides runtime primitives and local agent interfaces. The full desktop assistant is not yet released.

## Project principles

- **Local first:** prefer inference and storage on the user's device.
- **User-controlled memory:** make saved information inspectable, editable, exportable, and deletable.
- **Governed actions:** model output is not authority; tool execution must pass explicit capability and authorization checks.
- **Evidence and provenance:** distinguish observations from assumptions and preserve lineage for governed operations.
- **Failure containment:** model or connector failures should not silently compromise unrelated resources.
- **Public benefit:** explore responsible applications that improve human well-being and planetary conditions, measuring outcomes rather than assuming benefit.

## Current foundation

The runtime provides explicit system composition, lifecycle control, resources, interfaces, relationships, evidence, provenance, authorization, execution, synchronization, persistence, extensions, observability, and local agent mounting.

Architecture lifecycle:

Platform → Initialization → Firmware → Boot → Kernel → Interfaces → Resources → Runtime → Extensions → Applications → State/Events → Shutdown

The core is model-independent. The initial local model path uses Ollama as a provider adapter. User-facing desktop packaging and onboarding remain planned work.

## Memory contract

The versioned memory API in `src/memory.mjs` supports explicit records, scopes, kinds, expiry, local JSON persistence, and export. The conversation-session API in `src/session.mjs` provides bounded in-process chat history and permits only explicitly selected saved memories to be included in a prompt. Neither module automatically saves conversations or infers consent. A user-facing application must ask before adding memories and provide inspection, editing, export, and deletion controls. See [Conversation Sessions](docs/conversation-sessions.md).

## Community website

A dependency-free static website preview lives in `website/`. Open `website/index.html` locally to preview it. The page contains no analytics, external font imports, or third-party scripts.

Publishing to GitHub Pages requires repository configuration and has not been assumed complete. See `docs/community-website.md`.

## Development

Requirements: Node.js 24 or newer.

```sh
npm test
npm run cli -- status
npm run cli -- sequence
```

See [Product Strategy](docs/product-strategy.md), [Architecture](docs/architecture.md), [Local Agent Mounting](docs/local-agent-mounting.md), [Privacy](PRIVACY.md), and [Security](SECURITY.md).

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Use synthetic examples, do not commit personal data or private configuration, and label proposals separately from implemented features.
