# Local Agent Mounting

Nexus supports user-owned reasoning agents as replaceable runtime components. The foundation does not require a specific model vendor or model family.

## Reference local stack

The reference profile uses Ollama as a local model runtime and Qwen3 as the default model profile:

`Ollama → qwen3:8b → Nexus agent mount`

A user can change the model string without changing the Nexus agent contract.

## Privacy boundary

Agent profiles explicitly declare:

- `mode`: `local` or `remote`
- `privacy`: `LOCAL_ONLY` or `NETWORK_ALLOWED`
- `endpoint`
- `model`
- `systemPrompt`
- declared capabilities

The default is local-only. The public foundation does not silently upload prompts or profile data to an external provider.

## Provider contract

Providers implement:

`chat({ profile, messages, options })`

The included Ollama provider uses the local Ollama HTTP API and Node's built-in `fetch`. It has no npm runtime dependency.

Provider failures are bounded. Timeouts surface as `MODEL_PROVIDER_TIMEOUT` rather than hanging indefinitely.

## Personalization

A user can create a profile that supplies a system instruction and declared capabilities while keeping the underlying model replaceable. Future layers can attach memory, tools, voice, vision, scheduling, and user-specific resources through the existing authorization and provenance system.

## Security boundary

The model does not receive unrestricted system authority merely because it is mounted. Model output must pass through Nexus capabilities, authorization, runtime execution, and resource boundaries before performing governed actions.
