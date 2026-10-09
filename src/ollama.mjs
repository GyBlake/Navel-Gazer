export function createOllamaProvider({ fetchImpl=globalThis.fetch, timeoutMs=120000 } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new TypeError('timeoutMs must be a positive integer');

  return Object.freeze({
    async chat({profile,messages=[],options={},tools=[]}={}) {
      if (!profile || profile.provider!=='ollama') throw new TypeError('Ollama agent profile required');
      if (!Array.isArray(tools) || tools.length > 32) throw new TypeError('tools must be an array of at most 32 definitions');
      const requestBody = {
        model:profile.model,
        messages: profile.systemPrompt
          ? [{role:'system',content:profile.systemPrompt},...messages]
          : messages,
        stream:false,
        options
      };
      if (tools.length) requestBody.tools = tools;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(profile.endpoint + '/api/chat', {
          method:'POST',
          headers:{'content-type':'application/json'},
          body:JSON.stringify(requestBody),
          signal:controller.signal
        });
        if (!response.ok) {
          const error=new Error('Local model provider returned HTTP ' + response.status);
          error.code='MODEL_PROVIDER_HTTP_ERROR';
          error.status=response.status;
          throw error;
        }
        const payload=await response.json();
        return Object.freeze({
          content: payload?.message?.content ?? '',
          toolCalls: Array.isArray(payload?.message?.tool_calls) ? payload.message.tool_calls.slice(0,32).map(call=>({name:call?.function?.name,arguments:call?.function?.arguments})) : [],
          model: payload?.model ?? profile.model,
          provider:'ollama',
          raw: payload
        });
      } catch (error) {
        if (error?.name==='AbortError') {
          const timeout=new Error('Local model provider timed out');
          timeout.code='MODEL_PROVIDER_TIMEOUT';
          throw timeout;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
  });
}
