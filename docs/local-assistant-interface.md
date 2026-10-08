# Local Assistant Interface

The first Navel Gazer interface is a dependency-free local web UI served by the Node runtime. It is a development MVP, not a packaged desktop application.

## Run

Requirements: Node.js 24 or newer and Ollama installed locally with a model downloaded.

```sh
npm run app
```

Open the loopback URL printed by the command. The app binds to `127.0.0.1` and stores data under `~/.navel-gazer` by default. Set `NAVEL_GAZER_HOME` to choose a different data directory.

## Included

- Chat with a locally served Ollama model.
- Create, restore, and delete conversation sessions.
- Choose an installed model and configure a loopback-only endpoint.
- Inspect, explicitly save, edit, and delete memory records.
- Diagnostics for model connectivity and local data footprint.
- No analytics, third-party scripts, external fonts, or cloud AI API.
- Content Security Policy, loopback binding, host validation, cross-origin rejection, JSON request limits, and restrictive data-file permissions where supported.

## Important limits

The app does not encrypt conversation or memory files. It is not yet packaged as an installable desktop app, and the interface does not yet expose arbitrary tools. Do not use it on a shared or untrusted device with sensitive records. The server does not provide multi-user authentication, OS sandboxing, cross-process storage locks, or encrypted backups. The local-only claim refers to model requests configured through this app; it does not guarantee that the underlying operating system or other installed software is offline.
