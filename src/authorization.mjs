function key(subject, resource, action) { return `${subject}\\0${resource}\\0${action}`; }

export function createAuthorizationPolicy({ defaultEffect='DENY', rules=[] } = {}) {
  if (!['ALLOW','DENY'].includes(defaultEffect)) throw new TypeError('defaultEffect must be ALLOW or DENY');
  const normalized = rules.map(rule => {
    if (!rule || typeof rule.subject !== 'string' || typeof rule.resource !== 'string' || typeof rule.action !== 'string') {
      throw new TypeError('authorization rule requires subject, resource, and action');
    }
    const effect = rule.effect ?? 'DENY';
    if (!['ALLOW','DENY'].includes(effect)) throw new TypeError('rule effect must be ALLOW or DENY');
    return Object.freeze({ subject: rule.subject, resource: rule.resource, action: rule.action, effect });
  });
  return Object.freeze({ schema: 'nexus.authorization.v1', defaultEffect, rules: Object.freeze(normalized) });
}

export function authorize(policy, { subject, resource, action }) {
  if (!policy || policy.schema !== 'nexus.authorization.v1') throw new TypeError('Nexus authorization policy required');
  const exact = policy.rules.find(rule => key(rule.subject,rule.resource,rule.action) === key(subject,resource,action));
  if (exact) return exact.effect;
  return policy.defaultEffect;
}
