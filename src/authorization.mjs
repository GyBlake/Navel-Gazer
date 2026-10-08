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
  const matchesForDecision = policy.rules.filter(rule =>
    matches(rule.subject,subject) && matches(rule.resource,resource) && matches(rule.action,action)
  );
  const decision = matchesForDecision.at(-1);
  return decision?.effect ?? policy.defaultEffect;
}
