export function createOllamaProvider({ fetchImpl=globalThis.fetch, timeoutMs=120000 } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new TypeError('timeoutMs must be a positive integer');

  return Object.freeze({
    async chat({profile,messages=[],options={}}={}) {
      if (!profile || profile.provider!=='ollama') throw new TypeError('Ollama agent profile required');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(profile.endpoint + '/api/chat', {
          method:'POST',
          headers:{'content-type':'application/json'},
          body:JSON.stringify({
            model:profile.model,
            messages: profile.systemPrompt
              ? [{role:'system',content:profile.systemPrompt},...messages]
              : messages,
            stream:false,
            options
          }),
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
