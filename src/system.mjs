import { createBootState, advanceBoot, BOOT_STAGES } from './bootstrap.mjs';
import { createResourceRegistry } from './resource.mjs';
import { createEventLog } from './event.mjs';
import { createExtensionRegistry } from './extensions.mjs';
import { createTelemetry } from './observability.mjs';

export function createNexusSystem({ authorizationPolicy=null } = {}) {
  const resources = createResourceRegistry();
  const events = createEventLog();
  const extensions = createExtensionRegistry();
  const telemetry = createTelemetry();
  let boot = createBootState();

  return Object.freeze({
    get boot() { return boot; },
    advanceBoot(to) {
      boot = advanceBoot(boot, to);
      telemetry.record('BOOT_TRANSITION', { to });
      return boot;
    },
    bootSequence() { return [...BOOT_STAGES]; },
    resources,
    events,
    extensions,
    telemetry,
    authorizationPolicy
  });
}
