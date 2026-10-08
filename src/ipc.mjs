export function createIpcChannel() {
  const listeners = new Set();
  return Object.freeze({
    send(message) {
      if (!message || typeof message !== 'object') throw new TypeError('IPC message must be an object');
      const envelope = Object.freeze({ schema:'nexus.ipc.v1', message });
      for (const listener of listeners) listener(envelope);
      return envelope;
    },
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    listenerCount() { return listeners.size; }
  });
}
