function stable(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}';
}

export function diffStates(local, remote) {
  const left = local ?? {};
  const right = remote ?? {};
  if (typeof left !== 'object' || typeof right !== 'object' || Array.isArray(left) || Array.isArray(right)) {
    throw new TypeError('local and remote states must be objects');
  }
  const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
  return keys.filter(key => stable(left[key]) !== stable(right[key])).map(key => ({
    key, local:left[key], remote:right[key]
  }));
}

export function reconcileStates(local, remote, { resolver='reject-conflicts' } = {}) {
  const differences = diffStates(local,remote);
  if (!differences.length) return Object.freeze({status:'SYNCHRONIZED',state:{...local},conflicts:[]});
  if (resolver === 'prefer-local') return Object.freeze({status:'RECONCILED',state:{...remote,...local},conflicts:[]});
  if (resolver === 'prefer-remote') return Object.freeze({status:'RECONCILED',state:{...local,...remote},conflicts:[]});
  if (resolver !== 'reject-conflicts') throw new TypeError(`Unknown resolver: ${resolver}`);
  return Object.freeze({status:'CONFLICT',state:null,conflicts:differences});
}
