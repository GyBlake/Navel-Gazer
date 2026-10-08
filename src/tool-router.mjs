import { randomUUID } from 'node:crypto';
import { createEvidence } from './evidence.mjs';
import { createEvent } from './event.mjs';
import { createProvenance } from './provenance.mjs';

function required(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(name + ' must be a non-empty string');
  return value.trim();
}

function validateInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('tool input must be a plain object');
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) throw new TypeError('tool input must be a plain object');
  try {
    const encoded = JSON.stringify(input);
    if (encoded === undefined) throw new TypeError('tool input must be JSON serializable');
    return JSON.parse(encoded);
  } catch {
    throw new TypeError('tool input must be JSON serializable');
  }
}

export function createToolDefinition({
  id, description='', resource, resourceType='*', action, capability, requiresApproval=true, handler
} = {}) {
  id = required(id, 'id');
  resource = required(resource, 'resource');
  action = required(action, 'action');
  if (typeof description !== 'string') throw new TypeError('description must be a string');
  if (typeof requiresApproval !== 'boolean') throw new TypeError('requiresApproval must be a boolean');
  if (!capability || capability.schema !== 'nexus.capability.v1' || capability.action !== action) {
    throw new TypeError('tool requires a capability matching its action');
  }
  if (capability.resourceType !== '*' && resourceType !== '*' && capability.resourceType !== resourceType) {
    throw new TypeError('tool resource type must match its capability');
  }
  if (typeof handler !== 'function') throw new TypeError('tool handler must be a function');
  return Object.freeze({
    schema:'nexus.tool-definition.v1', id, description, resource, resourceType, action,
    capability, requiresApproval, handler
  });
}

export function createToolRegistry() {
  const tools = new Map();
  return Object.freeze({
    register(tool) {
      if (!tool || tool.schema !== 'nexus.tool-definition.v1') throw new TypeError('Valid tool definition required');
      if (tools.has(tool.id)) throw new Error('Tool already registered: ' + tool.id);
      tools.set(tool.id, tool);
      return tool;
    },
    get(id) { return tools.get(id); },
    has(id) { return tools.has(id); },
    list() { return [...tools.values()].map(({handler, ...metadata}) => Object.freeze(metadata)); },
    remove(id) { return tools.delete(id); }
  });
}

export function createToolRouter({ runtime, registry, eventLog, subject='personal-assistant', clock=() => new Date().toISOString() } = {}) {
  if (!runtime || typeof runtime.execute !== 'function') throw new TypeError('governed runtime required');
  if (!registry || typeof registry.get !== 'function') throw new TypeError('tool registry required');
  if (!eventLog || typeof eventLog.append !== 'function') throw new TypeError('event log required');
  subject = required(subject, 'subject');

  const proposals = new Map();

  function record(type, proposal, extra={}) {
    const time = clock();
    const evidence = createEvidence({
      source:'navel-gazer.tool-router', observedAt:time, method:'tool-governance',
      data:{ proposalId:proposal.id, toolId:proposal.toolId, action:proposal.action, ...extra }
    });
    const provenance = createProvenance({
      source:'navel-gazer.tool-router', method:'tool-governance', observedAt:time, evidence
    });
    eventLog.append(createEvent({
      id:proposal.id + ':' + type.toLowerCase(), type, source:'navel-gazer.tool-router',
      subject:proposal.toolId, payload:{ proposalId:proposal.id, toolId:proposal.toolId, ...extra },
      evidence, provenance, timestamp:time
    }));
  }

  function executeStored(proposal, tool) {
    proposal.status = 'executing';
    try {
      const execution = runtime.execute({
        id:proposal.id, subject, resource:tool.resource, resourceType:tool.resourceType,
        action:tool.action, capability:tool.capability, input:proposal.input, handler:tool.handler,
        evidenceData:{ proposalId:proposal.id, toolId:tool.id, action:tool.action, approval:tool.requiresApproval ? 'user-approved' : 'not-required' }
      });
      proposal.status = 'completed';
      record('TOOL_EXECUTION_COMPLETED', proposal);
      return Object.freeze({ status:'completed', proposalId:proposal.id, result:execution.result, event:execution.event });
    } catch (error) {
      proposal.status = 'failed';
      record('TOOL_EXECUTION_FAILED', proposal, { errorCode:error.code ?? 'TOOL_EXECUTION_FAILED' });
      throw error;
    }
  }

  return Object.freeze({
    propose({ toolId, input={} } = {}) {
      toolId = required(toolId, 'toolId');
      const tool = registry.get(toolId);
      if (!tool) {
        const error = new Error('Unknown tool: ' + toolId);
        error.code = 'UNKNOWN_TOOL';
        throw error;
      }
      const normalizedInput = validateInput(input);
      const proposal = {
        id:'tool-proposal-' + randomUUID(), toolId, action:tool.action, input:normalizedInput,
        requiresApproval:tool.requiresApproval, status:'pending', createdAt:clock()
      };
      proposals.set(proposal.id, proposal);
      record('TOOL_PROPOSED', proposal, { requiresApproval:tool.requiresApproval, inputKeys:Object.keys(normalizedInput) });
      return Object.freeze({
        id:proposal.id, toolId:proposal.toolId, action:proposal.action,
        description:tool.description, input:normalizedInput, requiresApproval:proposal.requiresApproval,
        status:proposal.status
      });
    },
    execute(proposalId) {
      const proposal = proposals.get(proposalId);
      if (!proposal) {
        const error = new Error('Unknown tool proposal: ' + proposalId);
        error.code = 'UNKNOWN_PROPOSAL';
        throw error;
      }
      if (proposal.status !== 'pending') {
        const error = new Error('Tool proposal is no longer pending');
        error.code = 'PROPOSAL_NOT_PENDING';
        throw error;
      }
      const tool = registry.get(proposal.toolId);
      if (!tool) {
        proposal.status = 'failed';
        const error = new Error('Tool is no longer registered');
        error.code = 'UNKNOWN_TOOL';
        throw error;
      }
      if (tool.requiresApproval) return Object.freeze({ status:'approval_required', proposalId:proposal.id, toolId:tool.id });
      return executeStored(proposal, tool);
    },
    approve(proposalId) {
      const proposal = proposals.get(proposalId);
      if (!proposal) {
        const error = new Error('Unknown tool proposal: ' + proposalId);
        error.code = 'UNKNOWN_PROPOSAL';
        throw error;
      }
      if (proposal.status !== 'pending') {
        const error = new Error('Tool proposal is no longer pending');
        error.code = 'PROPOSAL_NOT_PENDING';
        throw error;
      }
      const tool = registry.get(proposal.toolId);
      if (!tool) {
        const error = new Error('Tool is no longer registered');
        error.code = 'UNKNOWN_TOOL';
        throw error;
      }
      proposal.status = 'approved';
      record('TOOL_APPROVED', proposal);
      return executeStored(proposal, tool);
    },
    reject(proposalId) {
      const proposal = proposals.get(proposalId);
      if (!proposal) {
        const error = new Error('Unknown tool proposal: ' + proposalId);
        error.code = 'UNKNOWN_PROPOSAL';
        throw error;
      }
      if (proposal.status !== 'pending') {
        const error = new Error('Tool proposal is no longer pending');
        error.code = 'PROPOSAL_NOT_PENDING';
        throw error;
      }
      proposal.status = 'rejected';
      record('TOOL_REJECTED', proposal);
      return Object.freeze({ status:'rejected', proposalId:proposal.id });
    },
    getProposal(proposalId) {
      const proposal = proposals.get(proposalId);
      if (!proposal) return undefined;
      return Object.freeze({
        id:proposal.id, toolId:proposal.toolId, action:proposal.action,
        input:proposal.input, requiresApproval:proposal.requiresApproval,
        status:proposal.status, createdAt:proposal.createdAt
      });
    },
    listProposals() {
      return [...proposals.keys()].map(id => this.getProposal(id));
    }
  });
}
