#!/usr/bin/env node
import { BOOT_STAGES } from '../src/bootstrap.mjs';
import { STATE_STAGES } from '../src/state.mjs';
import { RELATIONSHIP_STATES } from '../src/relationship.mjs';

const command = process.argv[2] ?? 'status';
switch (command) {
  case 'status':
    console.log(JSON.stringify({ name:'nexus-foundation', version:'0.2.0', modules:['boot','state','relationship','entity','resource','interface','capability','evidence','provenance','event','authorization','runtime','sync','persistence','extensions','observability'] }, null, 2));
    break;
  case 'sequence':
    console.log(JSON.stringify({ boot:BOOT_STAGES, state:STATE_STAGES, relationship:RELATIONSHIP_STATES }, null, 2));
    break;
  case 'help':
  case '--help':
  case '-h':
    console.log('Usage: nexus [status|sequence|help]');
    break;
  default:
    console.error('Unknown command: ' + command);
    process.exitCode = 2;
}
