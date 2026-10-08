# Desktop Wrapper

Navel Gazer now has an optional Electron desktop shell around the local assistant interface.

## Run locally

Requirements: Node.js 24 or newer, npm, and Ollama with a local model installed.

```sh
npm install
npm run desktop
```

Electron is pinned to a stable release in `package.json`. The first install downloads the Electron runtime. Once installed, the assistant's model requests and conversation/memory storage remain local according to the selected local-only configuration.

For a browser-only run without the desktop wrapper:

```sh
npm run app
```

## Desktop security settings

- Node integration is disabled in the renderer.
- Context isolation and Chromium sandboxing are enabled.
- The renderer uses the loopback-only application server.
- New windows and navigation away from the local app are denied.
- The local server is closed when the desktop app quits.

## Release status and limits

This is a development wrapper, not a signed installer. Auto-update, notarization, code signing, OS-specific installers, packaging reproducibility, and an onboarding wizard are not yet implemented. Conversation and memory files are local but not encrypted by this prototype.
