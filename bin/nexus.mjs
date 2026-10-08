#!/usr/bin/env node
import { BOOT_STAGES } from '../src/bootstrap.mjs';
import { STATE_STAGES } from '../src/state.mjs';
import { RELATIONSHIP_STATES } from '../src/relationship.mjs';
import { createReferenceApplication } from '../src/reference.mjs';

const command = process.argv[2] ?? 'status';
switch (command) {
  case 'status':
    console.log(JSON.stringify({
      name:'nexus-foundation',
      version:'0.2.0',
      modules:['boot','state','relationship','entity','resource','interface','capability','evidence','provenance','event','authorization','runtime','sync','persistence','extensions','observability','http','ipc','agent','memory','session'],
      referenceApplication:'available'
    }, null, 2));
    break;
  case 'sequence':
    console.log(JSON.stringify({ boot:BOOT_STAGES, state:STATE_STAGES, relationship:RELATIONSHIP_STATES }, null, 2));
    break;
  case 'demo': {
    const app = createReferenceApplication({ clock:()=> '2026-01-01T00:00:00.000Z' });
    const execution = app.execute({ source:'cli', operation:'read' });
    console.log(JSON.stringify({
      resource:execution.result.resource,
      result:execution.result,
      event:{ id:execution.event.id, type:execution.event.type, evidence:execution.event.evidence, provenance:execution.event.provenance }
    }, null, 2));
    break;
  }
  case 'help':
  case '--help':
  case '-h':
    console.log('Usage: nexus [status|sequence|demo|help]');
    break;
  default:
    console.error('Unknown command: ' + command);
    process.exitCode = 2;
}
