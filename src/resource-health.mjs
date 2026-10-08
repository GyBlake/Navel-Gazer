import { createEvidence } from './evidence.mjs';
import { createEvent } from './event.mjs';
import { createProvenance } from './provenance.mjs';

function assertInputs({ registry, eventLog, resourceId, clock }) {
  if (!registry || typeof registry.get !== 'function' || typeof registry.setState !== 'function') throw new TypeError('resource registry required');
  if (!eventLog || typeof eventLog.append !== 'function') throw new TypeError('event log required');
  if (typeof resourceId !== 'string' || !resourceId.trim()) throw new TypeError('resourceId must be non-empty');
  if (typeof clock !== 'function') throw new TypeError('clock must be a function');
}

function transition({ registry, eventLog, resourceId, state, eventType, source='nexus.resource-health', reason, metadata={}, clock }) {
  assertInputs({ registry, eventLog, resourceId, clock });
  const current = registry.get(resourceId);
  if (!current) throw new Error(`Unknown resource: ${resourceId}`);
  const time = clock();
  const next = registry.setState(resourceId, state);
  const data = { resourceId, from: current.state, to: next.state, reason, ...metadata };
  const evidence = createEvidence({ source, observedAt: time, method:'resource-state-transition', data });
  const provenance = createProvenance({ source, method:'resource-state-transition', observedAt:time, evidence });
  const event = createEvent({
    id:`${resourceId}:${eventType.toLowerCase()}:${Date.parse(time)}`,
    type:eventType,
    source,
    subject:resourceId,
    payload:data,
    evidence,
    provenance,
    timestamp:time
  });
  eventLog.append(event);
  return Object.freeze({ resource:next, event });
}

export function markResourceUnavailable(args) {
  return transition({...args,state:'UNAVAILABLE',eventType:'RESOURCE_UNAVAILABLE'});
}

export function beginResourceRecovery(args) {
  return transition({...args,state:'RECOVERING',eventType:'RESOURCE_RECOVERY_STARTED'});
}

export function markResourceRecovered(args) {
  return transition({...args,state:'AVAILABLE',eventType:'RESOURCE_RECOVERED'});
}

export function recordResourceReadFailure({ registry, eventLog, resourceId, error, metadata={}, clock=() => new Date().toISOString() } = {}) {
  assertInputs({ registry, eventLog, resourceId, clock });
  const time = clock();
  const message = error instanceof Error ? error.message : String(error ?? 'unknown resource read failure');
  const resource = registry.get(resourceId);
  if (!resource) throw new Error(`Unknown resource: ${resourceId}`);
  const data = { resourceId, error:message, ...metadata };
  const evidence = createEvidence({ source:'nexus.resource-health', observedAt:time, method:'resource-read', data });
  const provenance = createProvenance({ source:'nexus.resource-health', method:'resource-read', observedAt:time, evidence });
  const event = createEvent({
    id:`${resourceId}:resource-read-failed:${Date.parse(time)}`,
    type:'RESOURCE_READ_FAILED',
    source:'nexus.resource-health',
    subject:resourceId,
    payload:data,
    evidence,
    provenance,
    timestamp:time
  });
  eventLog.append(event);
  return event;
}