import { createBootState, advanceBoot, BOOT_STAGES } from './bootstrap.mjs';
import { createResourceRegistry } from './resource.mjs';
import { createRelationshipRegistry } from './relationship.mjs';
import { createEventLog } from './event.mjs';
import { createExtensionRegistry } from './extensions.mjs';
import { createTelemetry } from './observability.mjs';

export function createNexusSystem({ authorizationPolicy=null } = {}) {
  const resources = createResourceRegistry();
  const relationships = createRelationshipRegistry();
  const events = createEventLog();
  const extensions = createExtensionRegistry();
  const telemetry = createTelemetry();
  let boot = createBootState();

  return Object.freeze({
    get boot() { return boot; },
    advanceBoot(to) {
      const from = boot.stage;
      boot = advanceBoot(boot,to);
      telemetry.record('BOOT_TRANSITION',{from,to});
      return boot;
    },
    bootSequence() { return [...BOOT_STAGES]; },
    resources,
    relationships,
    events,
    extensions,
    telemetry,
    authorizationPolicy
  });
}
