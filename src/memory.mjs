import { promises as fs } from 'node:fs';
import { dirname, basename, join } from 'node:path';

const KINDS = Object.freeze(['preference','fact','task','summary']);
const SCOPES = Object.freeze(['user','agent','session']);

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' must be a non-empty string');
  return value.trim();
}

function timestamp(value, name) {
  const candidate = value ?? new Date().toISOString();
  if (typeof candidate !== 'string' || !Number.isFinite(Date.parse(candidate))) throw new TypeError(name + ' must be a valid date-time string');
  return new Date(candidate).toISOString();
}

export function createMemoryRecord({ id, content, kind='fact', scope='user', source='user-approved', createdAt, updatedAt, expiresAt=null, metadata={} } = {}) {
  id = required(id, 'id');
  content = required(content, 'content');
  source = required(source, 'source');
  if (!KINDS.includes(kind)) throw new TypeError('Unknown memory kind: ' + kind);
  if (!SCOPES.includes(scope)) throw new TypeError('Unknown memory scope: ' + scope);
  const created = timestamp(createdAt, 'createdAt');
  const updated = timestamp(updatedAt ?? created, 'updatedAt');
  const expiry = expiresAt === null ? null : timestamp(expiresAt, 'expiresAt');
  if (expiry && Date.parse(expiry) <= Date.parse(created)) throw new TypeError('expiresAt must be later than createdAt');
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new TypeError('metadata must be an object');
  return Object.freeze({ schema:'nexus.memory-record.v1', id, content, kind, scope, source, createdAt:created, updatedAt:updated, expiresAt:expiry, metadata:{...metadata} });
}

export function isMemoryRecord(value) {
  return Boolean(value && value.schema === 'nexus.memory-record.v1' && typeof value.id === 'string' &&
    typeof value.content === 'string' && KINDS.includes(value.kind) && SCOPES.includes(value.scope));
}

export function createMemoryStore({ records=[], clock=() => new Date().toISOString() } = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  const items = new Map();
  for (const record of records) {
    if (!isMemoryRecord(record)) throw new TypeError('Valid Nexus memory records required');
    if (items.has(record.id)) throw new Error('Duplicate memory id: ' + record.id);
    items.set(record.id, record);
  }
  function current(record) { return !record.expiresAt || Date.parse(record.expiresAt) > Date.parse(clock()); }
  return Object.freeze({
    add(record) {
      if (!isMemoryRecord(record)) throw new TypeError('Valid Nexus memory record required');
      if (items.has(record.id)) throw new Error('Memory already exists: ' + record.id);
      items.set(record.id, record);
      return record;
    },
    get(id) { const record = items.get(id); return record && current(record) ? record : undefined; },
    list({ scope, kind, includeExpired=false } = {}) {
      if (scope !== undefined && !SCOPES.includes(scope)) throw new TypeError('Unknown memory scope: ' + scope);
      if (kind !== undefined && !KINDS.includes(kind)) throw new TypeError('Unknown memory kind: ' + kind);
      return [...items.values()].filter(record => (includeExpired || current(record)) &&
        (scope === undefined || record.scope === scope) && (kind === undefined || record.kind === kind));
    },
    update(id, changes={}) {
      const previous = items.get(id);
      if (!previous) return undefined;
      const next = createMemoryRecord({ ...previous, ...changes, id, createdAt:previous.createdAt, updatedAt:clock() });
      items.set(id, next);
      return next;
    },
    remove(id) { return items.delete(id); },
    clear({ scope } = {}) {
      if (scope !== undefined && !SCOPES.includes(scope)) throw new TypeError('Unknown memory scope: ' + scope);
      let removed = 0;
      for (const [id, record] of items) if (scope === undefined || record.scope === scope) { items.delete(id); removed += 1; }
      return removed;
    },
    export() { return Object.freeze({ schema:'nexus.memory-store.v1', exportedAt:timestamp(clock(), 'clock'), records:[...items.values()] }); }
  });
}

export function createFileMemoryStore({ path } = {}) {
  path = required(path, 'path');
  return Object.freeze({
    async load({ clock } = {}) {
      let parsed;
      try { parsed = JSON.parse(await fs.readFile(path, 'utf8')); }
      catch (error) { if (error?.code === 'ENOENT') return createMemoryStore({ clock }); throw error; }
      if (!parsed || parsed.schema !== 'nexus.memory-store.v1' || !Array.isArray(parsed.records)) throw new Error('Unsupported memory store schema');
      return createMemoryStore({ records:parsed.records, clock });
    },
    async save(store) {
      if (!store || typeof store.export !== 'function') throw new TypeError('Memory store required');
      const directory = dirname(path);
      const temporary = join(directory, '.' + basename(path) + '.' + process.pid + '.tmp');
      await fs.mkdir(directory, { recursive:true });
      try {
        await fs.writeFile(temporary, JSON.stringify(store.export(), null, 2) + '\n', { encoding:'utf8', mode:0o600 });
        await fs.rename(temporary, path);
      } catch (error) {
        await fs.rm(temporary, { force:true }).catch(() => {});
        throw error;
      }
    }
  });
}

export { KINDS as MEMORY_KINDS, SCOPES as MEMORY_SCOPES };
