const MODES = Object.freeze(['local','remote']);
const PRIVACY = Object.freeze(['LOCAL_ONLY','NETWORK_ALLOWED']);

function clean(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' must be non-empty');
  return value.trim();
}

export function createAgentProfile({
  id,
  name,
  provider='ollama',
  model='qwen3:8b',
  endpoint='http://127.0.0.1:11434',
  mode='local',
  privacy='LOCAL_ONLY',
  systemPrompt='',
  capabilities=[],
  metadata={}
} = {}) {
  id=clean(id,'id'); name=clean(name,'name'); provider=clean(provider,'provider'); model=clean(model,'model');
  if (!MODES.includes(mode)) throw new TypeError('Unknown agent mode: ' + mode);
  if (!PRIVACY.includes(privacy)) throw new TypeError('Unknown privacy policy: ' + privacy);
  if (!Array.isArray(capabilities)) throw new TypeError('capabilities must be an array');
  if (typeof systemPrompt !== 'string') throw new TypeError('systemPrompt must be a string');
  if (typeof endpoint !== 'string' || !endpoint.trim()) throw new TypeError('endpoint must be non-empty');
  return Object.freeze({
    schema:'nexus.agent-profile.v1',
    id, name, provider, model, endpoint: endpoint.replace(/\/$/, ''),
    mode, privacy, systemPrompt, capabilities:[...capabilities], metadata
  });
}

export function createAgentRegistry() {
  const agents=new Map();
  return Object.freeze({
    register(profile) {
      if (!profile || profile.schema!=='nexus.agent-profile.v1') throw new TypeError('Valid Nexus agent profile required');
      if (agents.has(profile.id)) throw new Error('Agent already registered: ' + profile.id);
      agents.set(profile.id,profile);
      return profile;
    },
    get(id){ return agents.get(id); },
    has(id){ return agents.has(id); },
    list(){ return [...agents.values()]; },
    remove(id){ return agents.delete(id); }
  });
}

export function createAgentMount({ profile, provider }) {
  if (!profile || profile.schema!=='nexus.agent-profile.v1') throw new TypeError('Valid agent profile required');
  if (!provider || typeof provider.chat!=='function') throw new TypeError('Agent provider with chat() required');
  return Object.freeze({
    profile,
    async chat({messages=[], options={}}={}) {
      if (!Array.isArray(messages)) throw new TypeError('messages must be an array');
      return provider.chat({profile,messages,options});
    }
  });
}

export { MODES as AGENT_MODES, PRIVACY as AGENT_PRIVACY };
