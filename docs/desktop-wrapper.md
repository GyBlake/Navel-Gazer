# Desktop Wrapper

Navel Gazer now has an optional Electron desktop shell around the local assistant interface.

## Run locally

Requirements: Node.js 24 or newer, npm, and Ollama with a local model installed.

```sh
npm install
npm run desktop
```

Electron is pinned to a stable release in `package.json`. The first install downloads the Electron runtime. Once installed, the assistant's model requests and conversation/memory storage remain local according to the selected local-only configuration.

Build development installers on the matching target platform with `npm run dist:mac`, `npm run dist:win`, or `npm run dist:linux`. The GitHub Actions workflow can build unsigned artifacts for macOS (x64 and arm64), Windows (x64), and Linux (x64) as workflow artifacts. It does not publish a public release automatically.

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

These are unsigned development builds. Code signing, macOS notarization, verified checksums, auto-update, and an onboarding wizard are not yet implemented. Conversation and memory files are local but not encrypted by this prototype.
