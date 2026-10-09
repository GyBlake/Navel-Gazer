const decisionCaches = new WeakMap();
const MAX_CACHED_DECISIONS = 2048;

function matches(ruleValue, actual) {
  return ruleValue === '*' || ruleValue === actual;
}

export function createAuthorizationPolicy({ defaultEffect='DENY', rules=[] } = {}) {
  if (!['ALLOW','DENY'].includes(defaultEffect)) throw new TypeError('defaultEffect must be ALLOW or DENY');
  if (!Array.isArray(rules)) throw new TypeError('rules must be an array');
  const normalized = rules.map(rule => {
    if (!rule || typeof rule.subject !== 'string' || typeof rule.resource !== 'string' || typeof rule.action !== 'string') {
      throw new TypeError('authorization rule requires subject, resource, and action');
    }
    const effect = rule.effect ?? 'DENY';
    if (!['ALLOW','DENY'].includes(effect)) throw new TypeError('rule effect must be ALLOW or DENY');
    return Object.freeze({ subject:rule.subject, resource:rule.resource, action:rule.action, effect });
  });
  return Object.freeze({ schema:'nexus.authorization.v1', defaultEffect, rules:Object.freeze(normalized) });
}

export function authorize(policy, { subject, resource, action } = {}) {
  if (!policy || policy.schema !== 'nexus.authorization.v1') throw new TypeError('Nexus authorization policy required');
  if (![subject,resource,action].every(v => typeof v === 'string' && v.length)) throw new TypeError('subject, resource, and action are required');
  let cache = decisionCaches.get(policy);
  if (!cache) {
    cache = new Map();
    decisionCaches.set(policy, cache);
  }
  const key = JSON.stringify([subject,resource,action]);
  if (cache.has(key)) {
    const result = cache.get(key);
    cache.delete(key);
    cache.set(key,result);
    return result;
  }
  let result = policy.defaultEffect;
  for (let i=policy.rules.length-1;i>=0;i--) {
    const rule=policy.rules[i];
    if (matches(rule.subject,subject) && matches(rule.resource,resource) && matches(rule.action,action)) {
      result=rule.effect;
      break;
    }
  }
  cache.set(key,result);
  if (cache.size > MAX_CACHED_DECISIONS) cache.delete(cache.keys().next().value);
  return result;
}
