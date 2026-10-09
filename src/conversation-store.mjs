import { promises as fs } from 'node:fs';
import { basename, dirname, join } from 'node:path';

const ROLES = Object.freeze(['user','assistant']);
const EVENT_SCHEMA = 'nexus.conversation-event.v1';
const COMPACT_AFTER_EVENTS = 128;

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

  let mutationTail = Promise.resolve();
  function mutate(operation) {
    const result = mutationTail.then(operation);
    mutationTail = result.catch(() => {});
    return result;
  }

  async function commit(nextItems, change) {
    if (persist) await persist([...nextItems.values()], change);
    items.clear();
    for (const [id,item] of nextItems) items.set(id,item);
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
    save(record) {
      return mutate(async () => {
        if (!isConversationRecord(record)) throw new TypeError('Valid conversation record required');
        const normalized = createConversationRecord(record);
        const next = new Map(items);
        next.set(normalized.id, normalized);
        await commit(next,{type:'upsert',record:normalized});
        return normalized;
      });
    },
    delete(id) {
      return mutate(async () => {
        if (!items.has(id)) return false;
        const next = new Map(items);
        next.delete(id);
        await commit(next,{type:'delete',id});
        return true;
      });
    },
    clear() {
      return mutate(async () => {
        const count = items.size;
        await commit(new Map(),{type:'clear'});
        return count;
      });
    },
    pruneBefore(timestamp) {
      return mutate(async () => {
        const boundary = validTimestamp(timestamp, 'timestamp');
        const next = new Map([...items].filter(([,item]) => item.updatedAt >= boundary));
        const removed = items.size - next.size;
        await commit(next,{type:'replace',records:[...next.values()]});
        return removed;
      });
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
  const journalPath = path + '.ndjson';
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
      const recovered = new Map(parsed.records.map(record => {
        if (!isConversationRecord(record)) throw new Error('Invalid conversation record in snapshot');
        return [record.id,createConversationRecord(record)];
      }));
      let journalText = '';
      try { journalText = await fs.readFile(journalPath,'utf8'); }
      catch (error) { if (error?.code !== 'ENOENT') throw error; }
      let journalEntries = 0;
      for (const [index,line] of journalText.split('\n').entries()) {
        if (!line.trim()) continue;
        let event;
        try { event = JSON.parse(line); }
        catch { throw new Error('Conversation journal is corrupt at line ' + (index + 1)); }
        if (!event || event.schema !== EVENT_SCHEMA || typeof event.type !== 'string') {
          throw new Error('Unsupported conversation journal event at line ' + (index + 1));
        }
        if (event.type === 'upsert' && isConversationRecord(event.record)) recovered.set(event.record.id,createConversationRecord(event.record));
        else if (event.type === 'delete' && typeof event.id === 'string') recovered.delete(event.id);
        else if (event.type === 'clear') recovered.clear();
        else if (event.type === 'replace' && Array.isArray(event.records) && event.records.every(isConversationRecord)) {
          recovered.clear();
          for (const record of event.records) recovered.set(record.id,createConversationRecord(record));
        } else throw new Error('Invalid conversation journal event at line ' + (index + 1));
        journalEntries += 1;
      }

      const atomicSnapshot = async records => {
        const directory = dirname(path);
        const temporary = join(directory, '.' + basename(path) + '.' + process.pid + '.tmp');
        await fs.mkdir(directory,{recursive:true,mode:0o700});
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

      let persisted = new Map(recovered);
      let persistTail = Promise.resolve();
      const writeEvent = (records,change) => {
        const operation = persistTail.then(async () => {
          if (!change || !['upsert','delete','clear','replace'].includes(change.type)) {
            await atomicSnapshot(records);
            persisted = new Map(records.map(record => [record.id,record]));
            const handle = await fs.open(journalPath,'w',0o600);
            await handle.close();
            journalEntries = 0;
            return;
          }
          const event = {schema:EVENT_SCHEMA,recordedAt:validTimestamp(clock(),'clock'),...change};
          await fs.mkdir(dirname(journalPath),{recursive:true,mode:0o700});
          const handle = await fs.open(journalPath,'a',0o600);
          try {
            await handle.writeFile(JSON.stringify(event)+'\n','utf8');
            await handle.sync();
          } finally { await handle.close(); }
          if (change.type === 'upsert') persisted.set(change.record.id,change.record);
          else if (change.type === 'delete') persisted.delete(change.id);
          else if (change.type === 'clear') persisted.clear();
          else if (change.type === 'replace') persisted = new Map(change.records.map(record => [record.id,record]));
          journalEntries += 1;
          if (journalEntries >= COMPACT_AFTER_EVENTS) {
            await atomicSnapshot([...persisted.values()]);
            const truncate = await fs.open(journalPath,'w',0o600);
            try { await truncate.sync(); } finally { await truncate.close(); }
            journalEntries = 0;
          }
        });
        persistTail = operation.catch(() => {});
        return operation;
      };
      return createConversationStore({records:[...recovered.values()],clock,persist:writeEvent});
    }
  });
}
