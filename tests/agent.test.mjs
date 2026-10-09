import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgentProfile, createAgentRegistry, createAgentMount } from '../src/agent.mjs';
import { createOllamaProvider } from '../src/ollama.mjs';

test('agent profiles are explicit and local by default', () => {
  const profile=createAgentProfile({id:'agent.local',name:'Local Agent'});
  assert.equal(profile.provider,'ollama');
  assert.equal(profile.model,'qwen3:8b');
  assert.equal(profile.mode,'local');
  assert.equal(profile.privacy,'LOCAL_ONLY');
});

test('LOCAL_ONLY profiles reject remote endpoints and remote mode', () => {
  assert.throws(() => createAgentProfile({ id:'remote-1', name:'Unsafe', endpoint:'https://example.com' }), /loopback/);
  assert.throws(() => createAgentProfile({ id:'remote-2', name:'Unsafe', mode:'remote' }), /requires local mode/);
  assert.throws(() => createAgentProfile({ id:'remote-3', name:'Unsafe', endpoint:'http://user:pass@127.0.0.1:11434' }), /credential-free/);
  const allowed = createAgentProfile({ id:'remote-4', name:'Explicit remote', mode:'remote', privacy:'NETWORK_ALLOWED', endpoint:'https://example.com' });
  assert.equal(allowed.endpoint, 'https://example.com');
});

test('agent registry mounts and lists profiles', () => {
  const registry=createAgentRegistry();
  const profile=createAgentProfile({id:'a1',name:'Personal'});
  registry.register(profile);
  assert.equal(registry.get('a1').name,'Personal');
  assert.throws(()=>registry.register(profile));
});

test('ollama provider sends a non-streaming local chat request', async () => {
  let request;
  const fetchImpl=async (url,options) => {
    request={url,options};
    return {
      ok:true,
      status:200,
      async json(){ return {model:'qwen3:8b',message:{content:'local response'}}; }
    };
  };
  const profile=createAgentProfile({id:'a2',name:'Local',systemPrompt:'Be concise'});
  const provider=createOllamaProvider({fetchImpl,timeoutMs:1000});
  const result=await provider.chat({profile,messages:[{role:'user',content:'Hello'}]});
  assert.equal(result.content,'local response');
  assert.equal(request.url,'http://127.0.0.1:11434/api/chat');
  const body=JSON.parse(request.options.body);
  assert.equal(body.stream,false);
  assert.equal(body.model,'qwen3:8b');
  assert.equal(body.messages[0].role,'system');
});

test('ollama provider exposes bounded timeout failures', async () => {
  const fetchImpl=async (_url,{signal}) => await new Promise((_resolve,reject) => {
    signal.addEventListener('abort',()=>{ const e=new Error('aborted'); e.name='AbortError'; reject(e); });
  });
  const profile=createAgentProfile({id:'a3',name:'Local'});
  const provider=createOllamaProvider({fetchImpl,timeoutMs:5});
  await assert.rejects(provider.chat({profile,messages:[]}), error => error.code==='MODEL_PROVIDER_TIMEOUT');
});

test('agent mount delegates to the selected provider', async () => {
  const profile=createAgentProfile({id:'a4',name:'Mounted'});
  const mount=createAgentMount({profile,provider:{chat:async ({profile})=>({content:profile.name})}});
  const result=await mount.chat({messages:[]});
  assert.equal(result.content,'Mounted');
});

test('Ollama provider forwards tool schemas and returns proposals without executing them', async()=>{
  let requestBody;
  const fetchImpl=async (_url,options)=>{
    requestBody=JSON.parse(options.body);
    return {ok:true,status:200,async json(){return {model:'qwen3:8b',message:{content:'I propose a lookup.',tool_calls:[{function:{name:'mcp_tool_0',arguments:{query:'example'}}}]}};}};
  };
  const profile=createAgentProfile({id:'tool-proposal',name:'Proposal Assistant'});
  const provider=createOllamaProvider({fetchImpl,timeoutMs:1000});
  const tools=[{type:'function',function:{name:'mcp_tool_0',description:'Lookup a record',parameters:{type:'object',properties:{query:{type:'string'}}}}}];
  const result=await provider.chat({profile,messages:[{role:'user',content:'Find a record'}],tools});
  assert.deepEqual(requestBody.tools,tools);
  assert.equal(result.content,'I propose a lookup.');
  assert.deepEqual(result.toolCalls,[{name:'mcp_tool_0',arguments:{query:'example'}}]);
});
