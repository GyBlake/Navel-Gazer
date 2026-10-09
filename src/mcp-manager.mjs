import { spawn as nodeSpawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { dirname, basename, join } from 'node:path';

const MAX_LINE_BYTES = 1_000_000;
const MAX_STDERR_BYTES = 16_000;
const MAX_TOOLS = 256;
const MAX_TOOL_OUTPUT_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,79}$/;
const ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;

function validateConfig(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Server configuration must be an object');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const command = typeof input.command === 'string' ? input.command.trim() : '';
  const args = input.args ?? [];
  if (!NAME_RE.test(name)) throw new TypeError('Server name must be 1–80 safe characters');
  if (!command || command.length > 2048 || command.includes('\0')) throw new TypeError('A valid executable path or command is required');
  if (!Array.isArray(args) || args.length > 64 || args.some(arg => typeof arg !== 'string' || arg.length > 4096 || arg.includes('\0'))) {
    throw new TypeError('Arguments must be an array of at most 64 strings');
  }
  return { id: typeof input.id === 'string' && ID_RE.test(input.id) ? input.id : randomUUID(), name, transport: 'stdio', command, args: [...args] };
}

function cleanTool(tool) {
  if (!tool || typeof tool !== 'object' || typeof tool.name !== 'string' || !ID_RE.test(tool.name)) return null;
  const description = typeof tool.description === 'string' ? tool.description.slice(0, 4000) : '';
  const inputSchema = tool.inputSchema && typeof tool.inputSchema === 'object' && !Array.isArray(tool.inputSchema)
    ? tool.inputSchema : { type: 'object', properties: {} };
  return { name: tool.name, description, inputSchema };
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
 * Governed MCP stdio manager. Servers are never launched on registration;
 * connect() is a separate explicit action. Tool execution is denied unless
 * the exact server/tool pair has an active user grant.
 */
export async function createMcpManager({
  path,
  spawnImpl = nodeSpawn,
  clock = () => new Date().toISOString(),
  timeoutMs = DEFAULT_TIMEOUT_MS
} = {}) {
  if (typeof path !== 'string' || !path) throw new TypeError('MCP registry path required');
  if (typeof spawnImpl !== 'function') throw new TypeError('spawn implementation required');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) throw new TypeError('Invalid MCP timeout');
  const registryPath = path;
  const servers = new Map();
  const runtimes = new Map();

  try {
    const saved = JSON.parse(await fs.readFile(registryPath, 'utf8'));
    if (saved?.schema === 'navel-gazer.mcp-registry.v1' && Array.isArray(saved.servers)) {
      for (const item of saved.servers) {
        const config = validateConfig(item);
        servers.set(config.id, { ...config, grants: Array.isArray(item.grants) ? item.grants.filter(g => typeof g === 'string' && ID_RE.test(g)) : [], createdAt: item.createdAt ?? clock() });
      }
    } else throw new Error('Invalid MCP registry');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw new Error('MCP registry is invalid');
  }

  async function persist() {
    await atomicWrite(registryPath, {
      schema: 'navel-gazer.mcp-registry.v1',
      updatedAt: clock(),
      servers: [...servers.values()].map(({ id, name, transport, command, args, grants, createdAt }) => ({ id, name, transport, command, args, grants, createdAt }))
    });
  }

  function publicServer(server) {
    const runtime = runtimes.get(server.id);
    return {
      id: server.id, name: server.name, transport: server.transport,
      command: server.command, args: [...server.args],
      connected: Boolean(runtime && !runtime.closed),
      tools: runtime ? [...runtime.tools.values()].map(tool => ({ ...tool, approved: server.grants.includes(tool.name) })) : [],
      createdAt: server.createdAt
    };
  }

  function request(runtime, method, params = {}) {
    if (runtime.closed) return Promise.reject(new Error('MCP server is disconnected'));
    const id = ++runtime.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        runtime.pending.delete(id);
        reject(Object.assign(new Error('MCP request timed out'), { code: 'MCP_TIMEOUT' }));
      }, timeoutMs);
      runtime.pending.set(id, { resolve, reject, timer });
      try {
        runtime.child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
      } catch (error) {
        clearTimeout(timer);
        runtime.pending.delete(id);
        reject(error);
      }
    });
  }

  function closeRuntime(id, reason = 'Disconnected') {
    const runtime = runtimes.get(id);
    if (!runtime) return;
    runtime.closed = true;
    for (const pending of runtime.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(reason));
    }
    runtime.pending.clear();
    runtimes.delete(id);
    try { runtime.child.kill(); } catch {}
  }

  function receiveLine(runtime, line) {
    if (!line.trim()) return;
    let message;
    try { message = JSON.parse(line); } catch {
      closeRuntime(runtime.id, 'MCP server emitted invalid JSON on stdout');
      return;
    }
    if (!message || message.jsonrpc !== '2.0') return;
    if (message.id !== undefined && runtime.pending.has(message.id)) {
      const pending = runtime.pending.get(message.id);
      clearTimeout(pending.timer);
      runtime.pending.delete(message.id);
      if (message.error) pending.reject(Object.assign(new Error(String(message.error.message ?? 'MCP request failed').slice(0, 1000)), { code: 'MCP_REMOTE_ERROR' }));
      else pending.resolve(message.result);
    }
    // Server notifications and tool descriptions are informational, never authority.
  }

  async function connect(id) {
    const server = servers.get(id);
    if (!server) throw new Error('Unknown MCP server');
    if (runtimes.has(id)) return publicServer(server);
    const child = spawnImpl(server.command, server.args, {
      shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
      env: { PATH: process.env.PATH ?? '', HOME: process.env.HOME ?? '', USERPROFILE: process.env.USERPROFILE ?? '', SYSTEMROOT: process.env.SYSTEMROOT ?? '' }
    });
    const runtime = { id, child, nextId: 0, pending: new Map(), tools: new Map(), closed: false, buffer: '', stderrBytes: 0, stderr: '' };
    runtimes.set(id, runtime);
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', chunk => {
      runtime.buffer += chunk;
      if (Buffer.byteLength(runtime.buffer, 'utf8') > MAX_LINE_BYTES) return closeRuntime(id, 'MCP message exceeded size limit');
      let index;
      while ((index = runtime.buffer.indexOf('\n')) >= 0) {
        const line = runtime.buffer.slice(0, index);
        runtime.buffer = runtime.buffer.slice(index + 1);
        receiveLine(runtime, line);
        if (runtime.closed) break;
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', chunk => {
      runtime.stderrBytes += Buffer.byteLength(chunk, 'utf8');
      if (runtime.stderrBytes <= MAX_STDERR_BYTES) runtime.stderr += chunk;
    });
    child.on('error', () => closeRuntime(id, 'MCP server process failed to start'));
    child.on('exit', () => closeRuntime(id, 'MCP server process exited'));
    try {
      await request(runtime, 'initialize', {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'Navel Gazer', version: '0.1.0' }
      });
      if (runtime.closed) throw new Error('MCP server disconnected during initialization');
      child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
      const result = await request(runtime, 'tools/list', {});
      const tools = Array.isArray(result?.tools) ? result.tools.slice(0, MAX_TOOLS).map(cleanTool).filter(Boolean) : [];
      runtime.tools = new Map(tools.map(tool => [tool.name, tool]));
      return publicServer(server);
    } catch (error) {
      closeRuntime(id, 'MCP initialization failed');
      throw error;
    }
  }

  return Object.freeze({
    list() { return [...servers.values()].map(publicServer); },
    async add(input) {
      const config = validateConfig(input);
      if (servers.has(config.id)) throw new Error('MCP server ID already exists');
      const server = { ...config, grants: [], createdAt: clock() };
      servers.set(server.id, server);
      try { await persist(); } catch (error) { servers.delete(server.id); throw error; }
      return publicServer(server);
    },
    async remove(id) {
      if (!servers.has(id)) return false;
      closeRuntime(id);
      const server = servers.get(id);
      servers.delete(id);
      try { await persist(); } catch (error) { servers.set(id, server); throw error; }
      return true;
    },
    connect,
    disconnect(id) { closeRuntime(id); return servers.has(id); },
    async refreshTools(id) {
      const server = servers.get(id);
      const runtime = runtimes.get(id);
      if (!server || !runtime || runtime.closed) throw new Error('Connect to the MCP server first');
      const result = await request(runtime, 'tools/list', {});
      const tools = Array.isArray(result?.tools) ? result.tools.slice(0, MAX_TOOLS).map(cleanTool).filter(Boolean) : [];
      runtime.tools = new Map(tools.map(tool => [tool.name, tool]));
      return publicServer(server);
    },
    async setToolGrant(id, toolName, approved) {
      const server = servers.get(id);
      if (!server) throw new Error('Unknown MCP server');
      if (typeof toolName !== 'string' || !ID_RE.test(toolName)) throw new TypeError('Invalid MCP tool name');
      const grants = new Set(server.grants);
      if (approved) {
        const runtime = runtimes.get(id);
        if (!runtime || runtime.closed || !runtime.tools.has(toolName)) throw new Error('Discover the tool from a connected server before granting it');
        grants.add(toolName);
      } else grants.delete(toolName);
      const previous = server.grants;
      server.grants = [...grants];
      try { await persist(); } catch (error) { server.grants = previous; throw error; }
      return publicServer(server);
    },
    async callTool(id, toolName, args = {}) {
      const server = servers.get(id);
      const runtime = runtimes.get(id);
      if (!server || !runtime || runtime.closed) throw new Error('MCP server is not connected');
      if (!server.grants.includes(toolName)) throw Object.assign(new Error('Tool is not authorized; grant it explicitly first'), { code: 'MCP_TOOL_DENIED' });
      if (!runtime.tools.has(toolName)) throw new Error('Tool is not present in the latest discovered tool list');
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new TypeError('Tool arguments must be a JSON object');
      const serialized = JSON.stringify(args);
      if (Buffer.byteLength(serialized, 'utf8') > 64_000) throw new RangeError('Tool arguments exceed 64 KB');
      const result = await request(runtime, 'tools/call', { name: toolName, arguments: args });
      const output = JSON.stringify(result ?? null);
      if (Buffer.byteLength(output, 'utf8') > MAX_TOOL_OUTPUT_BYTES) throw new RangeError('MCP tool output exceeds size limit');
      return { serverId: id, serverName: server.name, toolName, invokedAt: clock(), result, untrusted: true };
    },
    async close() {
      for (const id of [...runtimes.keys()]) closeRuntime(id, 'Navel Gazer is shutting down');
    }
  });
}
