import { promises as fs } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const ROLES = Object.freeze(['user','assistant']);

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' must be a non-empty string');
  return value.trim();
}

function validTimestamp(value, name) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) throw new TypeError(name + ' must be a valid date-time string');
  return new Date(value).toISOString();
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages) || !messages.every(message =>
    message && ROLES.includes(message.role) && typeof message.content === 'string')) {
    throw new TypeError('messages must contain only user or assistant text messages');
  }
  return messages.map(({role,content}) => Object.freeze({role,content}));
}

export function createConversationRecord({ id, agentId, createdAt, updatedAt, messages=[] } = {}) {
  id = required(id, 'id');
  agentId = required(agentId, 'agentId');
  createdAt = validTimestamp(createdAt, 'createdAt');
  updatedAt = validTimestamp(updatedAt ?? createdAt, 'updatedAt');
  return Object.freeze({
    schema:'nexus.conversation-record.v1', id, agentId, createdAt, updatedAt,
    messages:Object.freeze(normalizeMessages(messages))
  });
}

export function isConversationRecord(value) {
  return Boolean(value && value.schema === 'nexus.conversation-record.v1' &&
    typeof value.id === 'string' && typeof value.agentId === 'string' &&
    Array.isArray(value.messages) && value.messages.every(message =>
      message && ROLES.includes(message.role) && typeof message.content === 'string'));
}

export function createConversationStore({ records=[], clock=() => new Date().toISOString(), persist=null } = {}) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  if (persist !== null && typeof persist !== 'function') throw new TypeError('persist must be a function or null');
  const items = new Map();
  for (const item of records) {
    if (!isConversationRecord(item)) throw new TypeError('Valid conversation records required');
    if (items.has(item.id)) throw new Error('Duplicate conversation id: ' + item.id);
    items.set(item.id, createConversationRecord(item));
  }

  async function commit(nextItems) {
    if (persist) await persist([...nextItems.values()]);
  }

  return Object.freeze({
    get(id) { return items.get(id); },
    list({ limit, before, after, agentId } = {}) {
      let values = [...items.values()];
      if (before !== undefined) {
        const boundary = validTimestamp(before, 'before');
        values = values.filter(item => item.updatedAt < boundary);
      }
      if (after !== undefined) {
        const boundary = validTimestamp(after, 'after');
        values = values.filter(item => item.updatedAt > boundary);
      }
      if (agentId !== undefined) values = values.filter(item => item.agentId === agentId);
      values.sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
      if (limit !== undefined) {
        if (!Number.isInteger(limit) || limit < 1) throw new TypeError('limit must be a positive integer');
        values = values.slice(0,limit);
      }
      return values;
    },
    async save(record) {
      if (!isConversationRecord(record)) throw new TypeError('Valid conversation record required');
      const normalized = createConversationRecord(record);
      const next = new Map(items);
      next.set(normalized.id, normalized);
      await commit(next);
      items.clear();
      for (const [id,item] of next) items.set(id,item);
      return normalized;
    },
    async delete(id) {
      if (!items.has(id)) return false;
      const next = new Map(items);
      next.delete(id);
      await commit(next);
      items.clear();
      for (const [key,item] of next) items.set(key,item);
      return true;
    },
    async clear() {
      const count = items.size;
      await commit(new Map());
      items.clear();
      return count;
    },
    async pruneBefore(timestamp) {
      const boundary = validTimestamp(timestamp, 'timestamp');
      const next = new Map([...items].filter(([,item]) => item.updatedAt >= boundary));
      const removed = items.size - next.size;
      await commit(next);
      items.clear();
      for (const [id,item] of next) items.set(id,item);
      return removed;
    },
    export() {
      return Object.freeze({
        schema:'nexus.conversation-store.v1',
        exportedAt:validTimestamp(clock(), 'clock'),
        records:[...items.values()]
      });
    }
  });
}

export function createFileConversationStore({ path } = {}) {
  path = required(path, 'path');
  return Object.freeze({
    async load({ clock=() => new Date().toISOString() } = {}) {
      let parsed;
      try { parsed = JSON.parse(await fs.readFile(path,'utf8')); }
      catch (error) {
        if (error?.code === 'ENOENT') parsed = { schema:'nexus.conversation-store.v1', records:[] };
        else throw error;
      }
      if (!parsed || parsed.schema !== 'nexus.conversation-store.v1' || !Array.isArray(parsed.records)) {
        throw new Error('Unsupported conversation store schema');
      }
      const writeRecords = async records => {
        const directory = dirname(path);
        const temporary = join(directory, '.' + basename(path) + '.' + process.pid + '.tmp');
        await fs.mkdir(directory,{recursive:true});
        try {
          await fs.writeFile(temporary,JSON.stringify({
            schema:'nexus.conversation-store.v1',
            exportedAt:validTimestamp(clock(),'clock'),
            records
          },null,2)+'\n',{encoding:'utf8',mode:0o600});
          await fs.rename(temporary,path);
        } catch (error) {
          await fs.rm(temporary,{force:true}).catch(()=>{});
          throw error;
        }
      };
      return createConversationStore({records:parsed.records,clock,persist:writeRecords});
    }
  });
}
