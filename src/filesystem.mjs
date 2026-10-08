import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createCapability } from './capability.mjs';
import { createResource } from './resource.mjs';
import { createRuntime } from './runtime.mjs';

function normalizeRelativePath(input) {
  if (typeof input !== 'string' || !input.trim()) throw new TypeError('path must be a non-empty string');
  const value = input.replaceAll('\\', '/');
  if (value.startsWith('/') || /^[A-Za-z]:\//.test(value)) {
    throw new Error('Absolute paths are not allowed');
  }
  const normalized = path.posix.normalize(value);
  if (normalized === '..' || normalized.startsWith('../')) {
    throw new Error('Path escapes adapter root');
  }
  return normalized === '.' ? '' : normalized;
}

function resourceId(relativePath) {
  return `file:${relativePath || '.'}`;
}

async function resolveContained(root, relativePath) {
  const target = path.resolve(root, relativePath);
  const rootReal = await fs.realpath(root);
  const targetReal = await fs.realpath(target);
  const relative = path.relative(rootReal, targetReal);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Resolved path escapes adapter root');
  }
  return { target, targetReal };
}

function digest(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function createFilesystemAdapter({
  root,
  authorizationPolicy,
  eventLog,
  clock=() => new Date().toISOString(),
  maxBytes=1024 * 1024
} = {}) {
  if (typeof root !== 'string' || !root.trim()) throw new TypeError('root is required');
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new TypeError('maxBytes must be a positive integer');

  const runtime = createRuntime({ authorizationPolicy, eventLog, clock });
  const capability = createCapability({
    id:'filesystem.read',
    action:'read',
    resourceType:'file',
    description:'Read a file within the adapter root.'
  });

  return Object.freeze({
    capability,
    async register(relativePath) {
      const relative = normalizeRelativePath(relativePath);
      const { targetReal } = await resolveContained(root, relative);
      const stat = await fs.stat(targetReal);
      if (!stat.isFile()) throw new Error('Resource is not a regular file');
      return createResource({
        id:resourceId(relative),
        resourceType:'file',
        state:'AVAILABLE',
        attributes:Object.freeze({
          path:relative || '.',
          size:stat.size,
          modifiedAt:stat.mtime.toISOString()
        })
      });
    },
    async read({ relativePath, subject, input={} } = {}) {
      const relative = normalizeRelativePath(relativePath);
      const resource = await this.register(relative);
      if (resource.attributes.size > maxBytes) {
        const error = new Error(`File exceeds maxBytes: ${resource.attributes.size}`);
        error.code = 'RESOURCE_TOO_LARGE';
        throw error;
      }
      const { targetReal } = await resolveContained(root, relative);
      const data = await fs.readFile(targetReal);
      const contentDigest = `sha256:${digest(data)}`;
      const execution = runtime.execute({
        id:`filesystem-read-${resource.id}`,
        subject,
        resource:resource.id,
        resourceType:resource.resourceType,
        action:'read',
        capability,
        input,
        handler:() => Object.freeze({
          resource:resource.id,
          path:relative || '.',
          content:data.toString('utf8')
        }),
        evidenceData:Object.freeze({
          resource:resource.id,
          path:relative || '.',
          bytes:data.byteLength,
          digest:contentDigest
        })
      });
      return Object.freeze({
        ...execution,
        digest:contentDigest,
        bytes:data.byteLength
      });
    }
  });
}
