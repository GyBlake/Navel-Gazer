export function createExtensionRegistry() {
  const extensions = new Map();
  return Object.freeze({
    register(extension) {
      if (!extension || typeof extension.id !== 'string' || !extension.id.trim()) throw new TypeError('extension id required');
      if (typeof extension.version !== 'string' || !extension.version.trim()) throw new TypeError('extension version required');
      if (extensions.has(extension.id)) throw new Error(`Extension already registered: ${extension.id}`);
      const normalized = Object.freeze({
        schema:'nexus.extension.v1',
        id:extension.id.trim(),
        version:extension.version.trim(),
        capabilities:Object.freeze([...(extension.capabilities ?? [])]),
        initialize: typeof extension.initialize === 'function' ? extension.initialize : null
      });
      extensions.set(normalized.id, normalized);
      if (normalized.initialize) normalized.initialize();
      return normalized;
    },
    get(id) { return extensions.get(id); },
    list() { return [...extensions.values()]; },
    unregister(id) { return extensions.delete(id); }
  });
}
