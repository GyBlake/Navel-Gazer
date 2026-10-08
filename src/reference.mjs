import { createNexusSystem } from './system.mjs';
import { createResource } from './resource.mjs';
import { createCapability } from './capability.mjs';
import { createAuthorizationPolicy } from './authorization.mjs';
import { createRuntime } from './runtime.mjs';

export function createReferenceApplication({ clock=() => new Date().toISOString() } = {}) {
  const system = createNexusSystem({
    authorizationPolicy: createAuthorizationPolicy({
      rules: [{ subject:'reference-agent', resource:'reference-document', action:'read', effect:'ALLOW' }]
    })
  });
  const resource = createResource({
    id:'reference-document',
    resourceType:'document',
    state:'AVAILABLE',
    attributes:{ title:'Navel Gazer reference resource', format:'json' }
  });
  system.resources.register(resource);
  const capability = createCapability({
    id:'document.read',
    action:'read',
    resourceType:'document',
    description:'Read a registered document resource.'
  });
  const runtime = createRuntime({ authorizationPolicy:system.authorizationPolicy, eventLog:system.events, clock });
  return Object.freeze({
    system, resource, capability,
    execute(input={}) {
      return runtime.execute({
        id:'reference-read', subject:'reference-agent', resource:resource.id,
        resourceType:resource.resourceType, action:'read', capability, input,
        handler:value => Object.freeze({resource:resource.id,acceptedInput:value,state:resource.state})
      });
    }
  });
}
