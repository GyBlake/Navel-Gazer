# Conversation Sessions

The conversation-session contract connects a mounted agent to a bounded, in-process message history.

## Scope

- Holds user and assistant text messages in session memory.
- Uses a configurable maximum message count.
- Prevents overlapping requests within the same session.
- Allows selected saved memory records to be included explicitly in a request.
- Does not automatically save conversations to disk or write inferred memories.
- Does not provide a user interface or durable session-history store yet.

## Memory use

A caller must provide memory record IDs to include saved memory. The session checks that each record exists and has not expired, then labels it as user-selected reference data. Saved memory content is untrusted data, not a policy or instruction source.

The session never automatically promotes conversation text into saved memory. A future application must ask for consent before storing a preference or fact and must expose review, edit, export, and delete controls.

## Limits

This is a core contract, not a complete chat application. Durable conversation storage, encryption-at-rest policy, migration, UI, streaming, cancellation, and recovery after process restart remain future work. Until durable storage and key management are implemented, applications should not describe chat history as encrypted at rest.

## Example

```js
import { createAgentProfile, createAgentMount } from '../src/agent.mjs';
import { createOllamaProvider } from '../src/ollama.mjs';
import { createConversationSession } from '../src/session.mjs';

const profile = createAgentProfile({ id:'personal', name:'Personal Assistant' });
const agent = createAgentMount({ profile, provider:createOllamaProvider() });
const session = createConversationSession({ agent });
const answer = await session.send('Help me organize my day');
console.log(answer.message.content);
```
