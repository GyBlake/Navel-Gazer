import { isEvidence } from './evidence.mjs';
import { isProvenance } from './provenance.mjs';

export function createEvent({ id, type, source, subject=null, payload={}, evidence, provenance, timestamp=new Date().toISOString() } = {}) {
  for (const [name,value] of Object.entries({id,type,source})) {
    if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${name} must be non-empty`);
  }
  if (!isEvidence(evidence)) throw new TypeError('event evidence is required');
  if (!isProvenance(provenance)) throw new TypeError('event provenance is required');
  return Object.freeze({
    schema:'nexus.event.v1',
    id:id.trim(),
    type:type.trim(),
    source:source.trim(),
    subject,
    payload,
    evidence,
    provenance,
    timestamp
  });
}

export function createEventLog() {
  const events = [];
  return Object.freeze({
    append(event) {
      if (!event || event.schema !== 'nexus.event.v1' ||
          typeof event.id !== 'string' || typeof event.type !== 'string' ||
          typeof event.source !== 'string' || !isEvidence(event.evidence) ||
          !isProvenance(event.provenance)) {
        throw new TypeError('Complete Nexus event required');
      }
      events.push(event);
      return event;
    },
    list() { return events.slice(); },
    since(timestamp) { return events.filter(e => e.timestamp >= timestamp); },
    clear() { events.length = 0; }
  });
}
