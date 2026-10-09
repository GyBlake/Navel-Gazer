import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { createState } from '../src/state.mjs';
import { createProvenance, lineage } from '../src/provenance.mjs';
import { createAuthorizationPolicy, authorize } from '../src/authorization.mjs';

const iterations = Math.max(1_000, Number.parseInt(process.env.BENCH_ITERATIONS ?? '50000', 10) || 50_000);
const delay = monitorEventLoopDelay({ resolution: 10 });
delay.enable();

function measure(name, fn, count=iterations) {
  const start = performance.now();
  for (let i=0; i<count; i++) fn(i);
  const elapsedMs = performance.now() - start;
  return { name, iterations:count, elapsedMs:Number(elapsedMs.toFixed(3)), opsPerSecond:Math.round(count / (elapsedMs / 1000)) };
}

const policy = createAuthorizationPolicy({
  rules:[{ subject:'benchmark-agent', resource:'benchmark-resource', action:'read', effect:'ALLOW' }]
});
const root = createProvenance({ source:'benchmark-root' });
let chain = root;
for (let i=0; i<100; i++) chain = createProvenance({ source:'benchmark-node-' + i, parent:chain });

const results = [
  measure('state record allocation', () => createState('OBSERVED')),
  measure('authorization repeated-key (cache hit after warmup)', () =>
    authorize(policy, { subject:'benchmark-agent', resource:'benchmark-resource', action:'read' })),
  measure('lineage traversal (101 nodes)', () => lineage(chain), Math.max(100, Math.floor(iterations / 100)))
];

await new Promise(resolve => setImmediate(resolve));
delay.disable();
const memory = process.memoryUsage();
process.stdout.write(JSON.stringify({
  schema:'navel-gazer.benchmark-report.v1',
  node:process.version,
  platform:process.platform,
  arch:process.arch,
  note:'Microbenchmark only. Not a production workload or a before/after performance claim.',
  results,
  memoryBytes:{ rss:memory.rss, heapUsed:memory.heapUsed, heapTotal:memory.heapTotal, external:memory.external },
  eventLoopDelayMs:{ mean:Number.isFinite(delay.mean) ? Number((delay.mean / 1e6).toFixed(3)) : null, max:Number((delay.max / 1e6).toFixed(3)) }
}, null, 2) + '\n');
