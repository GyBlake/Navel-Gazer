const $=selector=>document.querySelector(selector);
const state={view:'chat',conversationId:null,conversations:[],records:[],busy:false,settings:{model:'qwen3:8b',endpoint:'http://127.0.0.1:11434',profile:{}},models:[],status:null,toastTimer:null};

async function api(path,options={}) {
  const response=await fetch(path,{...options,headers:{...(options.body?{'content-type':'application/json'}:{}),...(options.headers??{})}});
  const payload=await response.json().catch(()=>({error:'The local app returned an invalid response'}));
  if(!response.ok) throw new Error(payload.error||'Request failed ('+response.status+')');
  return payload;
}
function toast(message) {
  const element=$('#toast');element.textContent=message;element.classList.add('show');
  clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>element.classList.remove('show'),3200);
}
function element(tag,className,text) {
  const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node;
}
function formatDate(value) {
  try{return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));}
  catch{return value;}
}
async function refreshStatus() {
  try {
    state.status=await api('/api/status');
    $('#connection-dot').className='dot '+(state.status.ollamaConnected?'online':'offline');
    $('#connection-label').textContent=state.status.ollamaConnected?'Local model connected':'Ollama not responding';
  } catch {
    $('#connection-dot').className='dot offline';$('#connection-label').textContent='Local service unavailable';
  }
  if(state.view==='diagnostics')renderDiagnostics();
}
async function refreshConversations() {
  const payload=await api('/api/conversations');state.conversations=payload.conversations;renderConversationList();
}
function renderConversationList() {
  const list=$('#conversation-list');list.replaceChildren();
  if(!state.conversations.length){list.append(element('p','muted small','Your conversations will appear here.'));return;}
  for(const item of state.conversations) {
    const button=element('button','conversation-item'+(item.id===state.conversationId?' active':''));
    button.type='button';button.dataset.id=item.id;
    button.append(element('strong','',item.preview||'New conversation'),element('small','',formatDate(item.updatedAt)+' · '+item.messageCount+' messages'));
    button.addEventListener('click',()=>openConversation(item.id));list.append(button);
  }
}
function showView(view) {
  state.view=view;
  for(const name of ['chat','memory','settings','mcp','diagnostics'])$('#'+name+'-view').hidden=name!==view;
  document.querySelectorAll('[data-view]').forEach(button=>button.classList.toggle('active',button.dataset.view===view));
  $('#view-title').textContent=({chat:'A little more room to think.',memory:'Your memory, your rules.',settings:'Tune your local assistant.',mcp:'Manage explicitly authorized tools.',diagnostics:'Clear eyes on system status.'})[view];
  $('#clear-chat').hidden=view!=='chat';
  if(view==='memory')loadMemory().catch(error=>toast(error.message));
  if(view==='settings')loadSettings().catch(error=>toast(error.message));
  if(view==='mcp'){loadMcpServers().catch(error=>toast(error.message));loadMcpAudit().catch(error=>toast(error.message));}
  if(view==='diagnostics')refreshStatus().then(renderDiagnostics);
}
function renderMessages(messages) {
  const container=$('#messages');container.replaceChildren();
  for(const message of messages) {
    const row=element('article','message '+message.role);
    row.append(element('div','message-avatar',message.role==='user'?'●':'◎'));
    const body=element('div','message-body');
    body.append(element('div','message-meta',message.role==='user'?'YOU':'LOCAL ASSISTANT'),element('div','',message.content));
    row.append(body);container.append(row);
  }
  $('#welcome').hidden=messages.length>0;
  container.scrollIntoView({block:'end',behavior:'smooth'});
}
async function openConversation(id) {
  try {
    const payload=await api('/api/conversations/'+id);
    state.conversationId=id;renderMessages(payload.conversation.messages);
    renderConversationList();showView('chat');$('#message-input').focus();
  } catch(error){toast(error.message);}
}
async function newConversation() {
  try {
    const payload=await api('/api/conversations',{method:'POST',body:'{}'});
    state.conversationId=payload.conversation.id;renderMessages([]);await refreshConversations();showView('chat');$('#message-input').focus();
  } catch(error){toast(error.message);}
}
async function sendMessage(content) {
  if(state.busy||!content.trim())return;
  state.busy=true;$('#send-button').disabled=true;$('#message-input').disabled=true;
  try {
    if(!state.conversationId)await newConversation();
    const current=await api('/api/conversations/'+state.conversationId);
    const optimistic=[...current.conversation.messages,{role:'user',content:content.trim()}];
    renderMessages(optimistic);$('#message-input').value='';
    const payload=await api('/api/conversations/'+state.conversationId+'/messages',{method:'POST',body:JSON.stringify({content:content.trim()})});
    renderMessages(payload.conversation.messages);await refreshConversations();
  } catch(error) {
    toast(error.message);
    if(state.conversationId) {
      try{const current=await api('/api/conversations/'+state.conversationId);renderMessages(current.conversation.messages);}catch{}
    }
  } finally {
    state.busy=false;$('#send-button').disabled=false;$('#message-input').disabled=false;$('#message-input').focus();
  }
}
async function loadMemory() {
  const payload=await api('/api/memory');state.records=payload.records;renderMemory();
}
function renderMemory() {
  const list=$('#memory-list');list.replaceChildren();
  if(!state.records.length){list.append(element('p','muted','No saved memories yet. That is entirely okay.'));return;}
  for(const record of state.records) {
    const card=element('article','memory-card');
    const meta=element('div','memory-meta');meta.append(element('span','',record.kind.toUpperCase()+' · '+record.scope.toUpperCase()),element('span','',formatDate(record.updatedAt)));
    const content=element('p','',record.content);
    const actions=element('div','memory-actions');
    const edit=element('button','','Edit');edit.type='button';edit.addEventListener('click',async()=>{
      const next=window.prompt('Edit this saved memory:',record.content);if(next===null)return;
      if(!next.trim()){toast('Memory text cannot be empty.');return;}
      try{await api('/api/memory/'+record.id,{method:'PATCH',body:JSON.stringify({content:next.trim()})});await loadMemory();toast('Memory updated.');}catch(error){toast(error.message);}
    });
    const remove=element('button','','Delete');remove.type='button';remove.addEventListener('click',async()=>{
      if(!window.confirm('Delete this saved memory?'))return;
      try{await api('/api/memory/'+record.id,{method:'DELETE'});await loadMemory();toast('Memory deleted.');}catch(error){toast(error.message);}
    });
    actions.append(edit,remove);card.append(meta,content,actions);list.append(card);
  }
}
async function loadSettings() {
  const settings=await api('/api/settings');state.settings=settings;
  $('#endpoint').value=settings.endpoint;$('#model').value=settings.model;
  const p=settings.profile??{};
  $('#profile-platform').value=p.platform??'detect';$('#profile-ram').value=String(p.ramGb??'unknown');
  $('#profile-priority').value=p.priority??'balanced';$('#profile-tools').value=p.toolsPreference??'none';
  document.querySelectorAll('[name="profile-task"]').forEach(input=>{input.checked=Array.isArray(p.tasks)&&p.tasks.includes(input.value);});
  await refreshModels();
}
async function loadMcpServers() {
  const payload=await api('/api/mcp/servers');renderMcpServers(payload.servers);
}
function renderModelProposals(payload) {
  const list=$('#mcp-proposal-list');list.replaceChildren();
  if(payload.content)list.append(element('p','',payload.content));
  if(!payload.proposals.length){list.append(element('p','muted','The model did not propose a tool call. No action was taken.'));return;}
  for(const proposal of payload.proposals) {
    const card=element('article','memory-card');
    card.append(element('strong','',proposal.serverName+' / '+proposal.toolName));
    card.append(element('p','small muted',proposal.description||'No description supplied.'));
    const args=element('pre','mcp-proposal-args',JSON.stringify(proposal.arguments,null,2));card.append(args);
    card.append(element('p','small muted','PROPOSAL ONLY · NOT EXECUTED'));
    const run=element('button','primary-button','Review and approve…');run.type='button';
    run.addEventListener('click',async()=>{
      run.disabled=true;
      try {
        const prepared=await api('/api/mcp/servers/'+encodeURIComponent(proposal.serverId)+'/tools/'+encodeURIComponent(proposal.toolName)+'/prepare',{method:'POST',body:JSON.stringify({arguments:proposal.arguments})});
        const item=prepared.proposal;
        const approved=window.confirm('Review proposed tool call. Nothing runs unless you approve.\\n\\nServer: '+item.server+'\\nTool: '+item.tool+'\\nDescription: '+item.description+'\\nArguments:\\n'+JSON.stringify(item.arguments,null,2)+'\\n\\nApprove this exact call?');
        if(!approved)return;
        const result=await api('/api/mcp/servers/'+encodeURIComponent(proposal.serverId)+'/tools/'+encodeURIComponent(proposal.toolName)+'/call',{method:'POST',body:JSON.stringify({challengeId:item.challengeId,confirmed:true})});
        window.alert(('Tool result (untrusted data):\\n\\n'+JSON.stringify(result.invocation.result,null,2)).slice(0,12000));
        await loadMcpAudit();
      } catch(error){toast(error.message);}
      finally{run.disabled=false;}
    });
    card.append(run);list.append(card);
  }
}
async function loadMcpAudit() {
  const payload=await api('/api/mcp/audit?limit=100');
  const list=$('#mcp-audit-list');list.replaceChildren();
  if(!payload.records.length){list.append(element('p','muted','No tool execution records yet.'));return;}
  for(const record of payload.records) {
    const card=element('article','memory-card');
    card.append(element('strong','',record.type.replaceAll('_',' ')));
    card.append(element('p','small muted',record.timestamp+' · '+record.subject));
    const details=record.payload||{};
    const summary=[];
    if(details.argumentBytes!==undefined)summary.push('Input: '+details.argumentBytes+' bytes');
    if(details.outputBytes!==undefined)summary.push('Output: '+details.outputBytes+' bytes');
    if(details.errorCode)summary.push('Error: '+details.errorCode);
    if(details.argumentDigest)summary.push('Input digest: '+details.argumentDigest.slice(0,16)+'…');
    if(details.outputDigest)summary.push('Output digest: '+details.outputDigest.slice(0,16)+'…');
    if(summary.length)card.append(element('p','small muted',summary.join(' · ')));
    list.append(card);
  }
}
function renderMcpServers(servers) {
  const list=$('#mcp-server-list');list.replaceChildren();
  if(!servers.length){list.append(element('p','muted','No MCP servers configured. Add one only if you trust the local executable.'));return;}
  for(const server of servers) {
    const card=element('article','memory-card');
    const meta=element('div','memory-meta');
    meta.append(element('strong','',server.name),element('span','',server.connected?'CONNECTED':'DISCONNECTED'));
    card.append(meta,element('p','small muted',server.command+' '+server.args.join(' ')));
    const actions=element('div','memory-actions');
    const connection=element('button','',server.connected?'Disconnect':'Connect');
    connection.type='button';connection.addEventListener('click',async()=>{
      try {
        if(server.connected)await api('/api/mcp/servers/'+encodeURIComponent(server.id)+'/disconnect',{method:'POST',body:'{}'});
        else {
          if(!window.confirm('Launch this local MCP process?\\n\\n'+server.command+' '+server.args.join(' ')))return;
          await api('/api/mcp/servers/'+encodeURIComponent(server.id)+'/connect',{method:'POST',body:'{}'});
        }
        await loadMcpServers();toast(server.connected?'MCP server disconnected.':'MCP server connected and tools discovered.');
      } catch(error){toast(error.message);await loadMcpServers().catch(()=>{});}
    });
    const remove=element('button','danger','Remove');remove.type='button';remove.addEventListener('click',async()=>{
      if(!window.confirm('Disconnect and remove '+server.name+'?'))return;
      try{await api('/api/mcp/servers/'+encodeURIComponent(server.id),{method:'DELETE'});await loadMcpServers();toast('MCP server removed.');}catch(error){toast(error.message);}
    });
    actions.append(connection,remove);card.append(actions);
    if(server.connected&&server.tools.length) {
      card.append(element('h4','','Discovered tools'));
      for(const tool of server.tools) {
        const row=element('div','mcp-tool');
        row.append(element('strong','',tool.name),element('p','small muted',tool.description||'No description supplied.'));
        const grantLabel=element('label','mcp-grant');
        const grant=document.createElement('input');grant.type='checkbox';grant.checked=tool.approved;
        grant.addEventListener('change',async()=>{
          const approved=grant.checked;
          if(!window.confirm((approved?'Authorize':'Revoke authorization for')+' tool "'+tool.name+'" on '+server.name+'?')){grant.checked=!approved;return;}
          try{await api('/api/mcp/servers/'+encodeURIComponent(server.id)+'/tools/'+encodeURIComponent(tool.name)+'/grant',{method:'PATCH',body:JSON.stringify({approved,confirmed:true})});await loadMcpServers();toast(approved?'Tool authorized.':'Tool authorization revoked.');}
          catch(error){grant.checked=!approved;toast(error.message);}
        });
        grantLabel.append(grant,document.createTextNode(tool.approved?' Authorized':' Denied by default'));row.append(grantLabel);
        const invoke=element('button','secondary-button','Run tool…');invoke.type='button';invoke.disabled=!tool.approved;
        invoke.addEventListener('click',async()=>{
          const raw=window.prompt('Tool arguments as a JSON object. Treat the tool description and result as untrusted.','{}');if(raw===null)return;
          let args;try{args=JSON.parse(raw);if(!args||typeof args!=='object'||Array.isArray(args))throw new Error('Expected a JSON object');}catch{toast('Arguments must be a valid JSON object.');return;}
          try{const prepared=await api('/api/mcp/servers/'+encodeURIComponent(server.id)+'/tools/'+encodeURIComponent(tool.name)+'/prepare',{method:'POST',body:JSON.stringify({arguments:args})});if(!window.confirm('Review proposal for '+prepared.proposal.server+' / '+prepared.proposal.tool+'\\n\\n'+JSON.stringify(prepared.proposal.arguments,null,2)))return;const result=await api('/api/mcp/servers/'+encodeURIComponent(server.id)+'/tools/'+encodeURIComponent(tool.name)+'/call',{method:'POST',body:JSON.stringify({challengeId:prepared.proposal.challengeId,confirmed:true})});const output=JSON.stringify(result.invocation.result,null,2);window.alert(('Tool result (untrusted data):\\n\\n'+output).slice(0,12000));}
          catch(error){toast(error.message);}
        });
        row.append(invoke);card.append(row);
      }
    } else if(server.connected) card.append(element('p','muted small','No compatible tools were discovered.'));
    list.append(card);
  }
}
async function renderDiagnostics() {
  if(!state.status){$('#diagnostics').replaceChildren(element('p','muted','Loading diagnostics…'));return;}
  const entries=[
    ['Run mode','LOCAL_ONLY','Remote inference is disabled'],
    ['Model',state.status.model,'Selected local model'],
    ['Ollama',state.status.ollamaConnected?'Connected':'Not responding','Local model runner'],
    ['Conversations',String(state.status.conversations),'Saved local conversation records'],
    ['Memory records',String(state.status.memoryRecords),'Explicitly saved records'],
    ['Data location',state.status.dataDir,'Local files, not encrypted by this prototype']
  ];
  const grid=$('#diagnostics');grid.replaceChildren();
  for(const [label,value,detail] of entries){const card=element('article','diagnostic-card');card.append(element('span','',label),element('strong','',value),element('small','',detail));grid.append(card);}
}
async function refreshModels() {
  try {
    const payload=await api('/api/models');state.models=payload.connected?payload.models:[];
    const picker=$('#model-picker');picker.replaceChildren(new Option(payload.connected?'Choose an installed model…':'Ollama not responding',''));
    for(const item of state.models)picker.append(new Option(item.name+(item.size?' · '+(item.size/1e9).toFixed(1)+' GB':''),item.name));
    picker.value=state.models.some(item=>item.name===$('#model').value)?$('#model').value:'';
    $('#settings-message').textContent=!payload.connected?'Ollama is not responding at this endpoint.':state.models.length?'Found '+state.models.length+' installed model(s).':'Ollama is connected, but no models were found.';
  } catch(error){$('#settings-message').textContent=error.message;}
}
function recommendModel() {
  const ram=$('#profile-ram').value,priority=$('#profile-priority').value;
  const tasks=[...document.querySelectorAll('[name="profile-task"]:checked')].map(input=>input.value);
  if(!state.models.length){$('#recommendation-message').textContent='No installed models to compare. Install a compatible model in Ollama and refresh. Nothing is downloaded automatically.';return;}
  const limit=ram==='8'?4.8e9:ram==='16'?9e9:ram==='32'?20e9:ram==='64'?40e9:Infinity;
  const ranked=state.models.map(item=>{const n=item.name.toLowerCase(),size=Number(item.size)||0;let score=size&&size<=limit?4:size>limit?-8:0;
    if(priority==='efficient')score-=size/1e10;if(priority==='capable')score+=size/1e10;if(priority==='fast')score-=size/2e10;
    if(tasks.includes('coding')&&/(coder|code)/.test(n))score+=2;
    if(tasks.includes('vision')&&/(vision|llava|qwen.*vl)/.test(n))score+=2;
    if(tasks.includes('reasoning')&&/(reason|thinking|qwq|deepseek-r1)/.test(n))score+=2;
    if(tasks.includes('everyday')&&/(instruct|qwen|llama|gemma)/.test(n))score+=1;
    return {item,size,score};}).sort((a,b)=>b.score-a.score||a.size-b.size);
  const best=ranked[0];$('#model').value=best.item.name;$('#model-picker').value=best.item.name;
  $('#recommendation-message').textContent='Suggested installed model: '+best.item.name+(best.size?' ('+(best.size/1e9).toFixed(1)+' GB on disk)':'')+'. Heuristic only, not a quality benchmark or guarantee of runtime memory fit. You can override this choice.';
}
$('#mcp-proposal-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const prompt=$('#mcp-proposal-prompt').value.trim();
  if(!prompt)return;
  const submit=$('#mcp-proposal-form button[type="submit"]');submit.disabled=true;
  const list=$('#mcp-proposal-list');list.replaceChildren(element('p','muted','Asking the local model for proposals…'));
  try {
    const payload=await api('/api/mcp/propose',{method:'POST',body:JSON.stringify({prompt})});
    renderModelProposals(payload);
  } catch(error){list.replaceChildren(element('p','muted',error.message));}
  finally{submit.disabled=false;}
});
$('#mcp-server-form').addEventListener('submit',async event=>{
  event.preventDefault();
  let args;try{args=JSON.parse($('#mcp-args').value||'[]');if(!Array.isArray(args)||args.some(value=>typeof value!=='string'))throw new Error();}catch{toast('Arguments must be a JSON array of strings.');return;}
  const command=$('#mcp-command').value.trim(),name=$('#mcp-name').value.trim();
  if(!window.confirm('Save this local process configuration? It will not launch until you press Connect.\\n\\n'+command+' '+args.join(' ')))return;
  try{await api('/api/mcp/servers',{method:'POST',body:JSON.stringify({name,command,args,confirmed:true})});$('#mcp-name').value='';$('#mcp-command').value='';$('#mcp-args').value='[]';await loadMcpServers();toast('MCP server configuration saved.');}
  catch(error){toast(error.message);}
});
$('#refresh-mcp').addEventListener('click',()=>loadMcpServers().catch(error=>toast(error.message)));
$('#refresh-mcp-audit').addEventListener('click',()=>loadMcpAudit().catch(error=>toast(error.message)));
$('#new-chat').addEventListener('click',newConversation);
$('#clear-chat').addEventListener('click',async()=>{
  if(!state.conversationId)return;
  if(!window.confirm('Clear messages from this conversation?'))return;
  try{await api('/api/conversations/'+state.conversationId,{method:'DELETE'});state.conversationId=null;renderMessages([]);await refreshConversations();toast('Conversation deleted.');}catch(error){toast(error.message);}
});
document.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>showView(button.dataset.view)));
document.querySelectorAll('[data-prompt]').forEach(button=>button.addEventListener('click',()=>{showView('chat');$('#message-input').value=button.dataset.prompt;$('#message-input').focus();}));
$('#chat-form').addEventListener('submit',event=>{event.preventDefault();sendMessage($('#message-input').value);});
$('#message-input').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();$('#chat-form').requestSubmit();}});
$('#memory-form').addEventListener('submit',async event=>{
  event.preventDefault();const content=$('#memory-content').value.trim();if(!content)return;
  if(!window.confirm('Save this information to local memory? You can edit or delete it later.'))return;
  try{await api('/api/memory',{method:'POST',body:JSON.stringify({content,kind:$('#memory-kind').value,scope:$('#memory-scope').value,confirmed:true})});$('#memory-content').value='';await loadMemory();toast('Memory saved on this device.');}
  catch(error){toast(error.message);}
});
$('#clear-memory').addEventListener('click',async()=>{
  if(!window.confirm('Permanently remove all saved memory records from this local store?'))return;
  try{await api('/api/memory',{method:'DELETE'});await loadMemory();toast('All saved memories deleted.');}catch(error){toast(error.message);}
});
$('#settings-form').addEventListener('submit',async event=>{
  event.preventDefault();
  try {
    const profile={platform:$('#profile-platform').value,ramGb:$('#profile-ram').value==='unknown'?'unknown':Number($('#profile-ram').value),
      priority:$('#profile-priority').value,tasks:[...document.querySelectorAll('[name="profile-task"]:checked')].map(input=>input.value),toolsPreference:$('#profile-tools').value};
    const payload=await api('/api/settings',{method:'POST',body:JSON.stringify({endpoint:$('#endpoint').value,model:$('#model').value,profile})});
    state.settings=payload;$('#settings-message').textContent='Profile saved. Local-only mode remains enforced.';await refreshStatus();toast('Profile saved.');
  } catch(error){$('#settings-message').textContent=error.message;}
});
$('#model-picker').addEventListener('change',()=>{if($('#model-picker').value)$('#model').value=$('#model-picker').value;});
$('#recommend-model').addEventListener('click',recommendModel);
$('#refresh-models').addEventListener('click',refreshModels);
await Promise.all([refreshConversations().catch(error=>toast(error.message)),refreshStatus()]);
showView('chat');
