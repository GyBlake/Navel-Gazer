import { authorize } from './authorization.mjs';
import { capabilityMatches } from './capability.mjs';
import { createEvidence } from './evidence.mjs';
import { createEvent } from './event.mjs';
import { createProvenance } from './provenance.mjs';

export function createRuntime({ authorizationPolicy, eventLog, clock=() => new Date().toISOString() } = {}) {
  if (!eventLog || typeof eventLog.append !== 'function') throw new TypeError('eventLog required');
  return Object.freeze({
    execute({ id, subject, resource, resourceType='*', action, capability=null, input={}, handler, evidenceData=null }) {
      if (typeof handler !== 'function') throw new TypeError('handler must be a function');
      if (capability && !capabilityMatches(capability,action,{resourceType})) {
        const error = new Error('Capability does not authorize requested action');
        error.code = 'CAPABILITY_DENIED';
        throw error;
      }
      const decision = authorize(authorizationPolicy,{subject,resource,action});
      const time = clock();
      if (decision !== 'ALLOW') {
        const evidence = createEvidence({source:'nexus.runtime',observedAt:time,method:'authorization',data:{decision,subject,resource,action}});
        const provenance = createProvenance({source:'nexus.runtime',method:'authorization',observedAt:time,evidence});
        eventLog.append(createEvent({id:`${id}:denied`,type:'EXECUTION_DENIED',source:'nexus.runtime',subject:resource,payload:{subject,action},evidence,provenance,timestamp:time}));
        const error = new Error('Execution denied');
        error.code = 'AUTHORIZATION_DENIED';
        throw error;
      }
      const result = handler(input);
      const evidence = createEvidence({source:'nexus.runtime',observedAt:time,method:'execution',data:evidenceData ?? {subject,resource,action,result}});
      const provenance = createProvenance({source:'nexus.runtime',method:'execution',observedAt:time,evidence});
      const event = createEvent({id:`${id}:completed`,type:'EXECUTION_COMPLETED',source:'nexus.runtime',subject:resource,payload:{subject,action,result},evidence,provenance,timestamp:time});
      eventLog.append(event);
      return Object.freeze({result,event});
    }
  });
}
