function stable(value) { return JSON.stringify(value, Object.keys(value ?? {}).sort()); }

export function diffStates(local, remote) {
  const keys = [...new Set([...Object.keys(local ?? {}), ...Object.keys(remote ?? {})])].sort();
  return keys.filter(key => stable(local?.[key]) !== stable(remote?.[key])).map(key => ({
    key,
    local: local?.[key],
    remote: remote?.[key]
  }));
}

export function reconcileStates(local, remote, { resolver='reject-conflicts' } = {}) {
  const differences = diffStates(local, remote);
  if (!differences.length) return Object.freeze({ status:'SYNCHRONIZED', state:{ ...(local ?? {}) }, conflicts:[] });
  if (resolver === 'prefer-local') return Object.freeze({ status:'RECONCILED', state:{ ...(remote ?? {}), ...(local ?? {}) }, conflicts:[] });
  if (resolver === 'prefer-remote') return Object.freeze({ status:'RECONCILED', state:{ ...(local ?? {}), ...(remote ?? {}) }, conflicts:[] });
  return Object.freeze({ status:'CONFLICT', state:null, conflicts:differences });
}
