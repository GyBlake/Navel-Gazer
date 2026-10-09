import { createHash, randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, basename, join } from 'node:path';
import { createEvidence } from './evidence.mjs';
import { createEvent, createEventLog } from './event.mjs';
import { createProvenance } from './provenance.mjs';

const MAX_AUDIT_RECORDS = 5000;
const MAX_ARGUMENT_BYTES = 64_000;
const CHALLENGE_TTL_MS = 60_000;

function digest(value) {
  return createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
}
function cleanArgs(args) {
  if (!args || typeof args !== 'object' || Array.isArray(args)) throw new TypeError('Tool arguments must be a JSON object');
  const encoded = JSON.stringify(args);
  const bytes = Buffer.byteLength(encoded, 'utf8');
  if (bytes > MAX_ARGUMENT_BYTES) throw new RangeError('Tool arguments exceed 64 KB');
  return { args: JSON.parse(encoded), encoded, bytes };
}
async function atomicWrite(path, value) {
  await fs.mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temp = join(dirname(path), '.' + basename(path) + '.' + process.pid + '.tmp');
  try {
    await fs.writeFile(temp, JSON.stringify(value, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 });
    await fs.rename(temp, path);
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

/**
 * The broker is the only app-layer path for manual MCP execution.
 * It uses one-time, short-lived challenges, rechecks grants at execution time,
 * and writes privacy-preserving evidence before and after invoking a tool.
 */
export async function createMcpExecutionBroker({ manager, auditPath, clock = () => new Date().toISOString(), now = () => Date.now() } = {}) {
  if (!manager || typeof manager.list !== 'function' || typeof manager.callTool !== 'function') throw new TypeError('MCP manager required');
  if (typeof auditPath !== 'string' || !auditPath) throw new TypeError('MCP audit path required');
  const events = createEventLog();
  const records = [];
  const challenges = new Map();

  try {
    const saved = JSON.parse(await fs.readFile(auditPath, 'utf8'));
    if (!saved || saved.schema !== 'navel-gazer.mcp-audit.v1' || !Array.isArray(saved.records)) throw new Error('Invalid audit file');
    for (const record of saved.records.slice(-MAX_AUDIT_RECORDS)) {
      if (record && typeof record.id === 'string' && typeof record.type === 'string' && typeof record.timestamp === 'string') records.push(record);
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw new Error('MCP audit log is invalid');
  }

  async function writeAudit(type, metadata) {
    const timestamp = clock();
    const evidence = createEvidence({
      source: 'navel-gazer.mcp-broker',
      observedAt: timestamp,
      method: 'governed-tool-execution',
      data: metadata
    });
    const provenance = createProvenance({
      source: 'navel-gazer.mcp-broker',
      method: type,
      observedAt: timestamp,
      evidence
    });
    const event = createEvent({
      id: randomUUID(),
      type,
      source: 'navel-gazer.mcp-broker',
      subject: metadata.serverId + ':' + metadata.toolName,
      payload: metadata,
      evidence,
      provenance,
      timestamp
    });
    const record = { id: event.id, type: event.type, timestamp, subject: event.subject, payload: metadata, evidence, provenance };
    records.push(record);
    if (records.length > MAX_AUDIT_RECORDS) records.splice(0, records.length - MAX_AUDIT_RECORDS);
    try {
      await atomicWrite(auditPath, { schema: 'navel-gazer.mcp-audit.v1', updatedAt: timestamp, records });
    } catch (error) {
      records.pop();
      const failure = new Error('Could not persist MCP audit record; execution blocked');
      failure.code = 'MCP_AUDIT_WRITE_FAILED';
      throw failure;
    }
    events.append(event);
    return record;
  }

  let auditQueue = Promise.resolve();
  async function audit(type, metadata) {
    const operation = auditQueue.then(() => writeAudit(type, metadata));
    auditQueue = operation.catch(() => {});
    return operation;
  }

  function requireApprovedTool(serverId, toolName) {
    const server = manager.list().find(item => item.id === serverId);
    if (!server || !server.connected) throw new Error('MCP server is not connected');
    const tool = server.tools.find(item => item.name === toolName);
    if (!tool) throw new Error('Tool is not in the current discovered tool list');
    if (!tool.approved) {
      const error = new Error('Tool is not authorized; grant it explicitly first');
      error.code = 'MCP_TOOL_DENIED';
      throw error;
    }
    return { server, tool };
  }

  return Object.freeze({
    async prepare({ serverId, toolName, arguments: rawArgs = {} } = {}) {
      const { server, tool } = requireApprovedTool(serverId, toolName);
      const { args, encoded, bytes } = cleanArgs(rawArgs);
      const id = randomUUID();
      challenges.set(id, {
        serverId, toolName, args, argumentDigest: digest(encoded), argumentBytes: bytes,
        toolFingerprint: digest({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema }),
        expiresAt: now() + CHALLENGE_TTL_MS
      });
      for (const [key, value] of challenges) if (value.expiresAt <= now()) challenges.delete(key);
      return {
        challengeId: id,
        expiresInMs: CHALLENGE_TTL_MS,
        server: server.name,
        tool: tool.name,
        description: tool.description,
        arguments: args,
        argumentBytes: bytes
      };
    },

    async execute({ challengeId } = {}) {
      if (typeof challengeId !== 'string' || !challenges.has(challengeId)) {
        const error = new Error('Missing, expired, or already used execution challenge');
        error.code = 'MCP_CHALLENGE_INVALID';
        throw error;
      }
      const challenge = challenges.get(challengeId);
      challenges.delete(challengeId);
      if (challenge.expiresAt <= now()) {
        const error = new Error('Execution challenge expired; prepare it again');
        error.code = 'MCP_CHALLENGE_EXPIRED';
        throw error;
      }
      const { server, tool } = requireApprovedTool(challenge.serverId, challenge.toolName);
      const fingerprint = digest({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema });
      if (fingerprint !== challenge.toolFingerprint) {
        const error = new Error('Tool definition changed after review; prepare it again');
        error.code = 'MCP_TOOL_CHANGED';
        throw error;
      }
      const metadata = {
        serverId: challenge.serverId,
        serverName: server.name,
        toolName: challenge.toolName,
        argumentBytes: challenge.argumentBytes,
        argumentDigest: challenge.argumentDigest
      };
      await audit('MCP_TOOL_EXECUTION_REQUESTED', metadata);
      let invocation;
      try {
        invocation = await manager.callTool(challenge.serverId, challenge.toolName, challenge.args);
      } catch (error) {
        await audit('MCP_TOOL_EXECUTION_FAILED', { ...metadata, errorCode: typeof error.code === 'string' ? error.code : 'MCP_TOOL_ERROR' });
        throw error;
      }
      const resultJson = JSON.stringify(invocation.result ?? null);
      try {
        await audit('MCP_TOOL_EXECUTION_COMPLETED', {
          ...metadata,
          outputBytes: Buffer.byteLength(resultJson, 'utf8'),
          outputDigest: digest(resultJson)
        });
      } catch (error) {
        error.executed = true;
        throw error;
      }
      return { ...invocation, auditRecorded: true };
    },

    listAudit({ limit = 100 } = {}) {
      const boundedLimit = Number.isInteger(limit) ? Math.max(1, Math.min(500, limit)) : 100;
      return records.slice(-boundedLimit).map(record => JSON.parse(JSON.stringify(record))).reverse();
    },
    close() { challenges.clear(); }
  });
}
