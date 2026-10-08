export function createTelemetry() {
  const records = [];
  return Object.freeze({
    record(type, data={}) {
      const entry = Object.freeze({ timestamp:new Date().toISOString(), type, data });
      records.push(entry);
      return entry;
    },
    list() { return records.slice(); },
    clear() { records.length = 0; }
  });
}
