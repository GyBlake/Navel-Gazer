export function createCapability({ id, action, resourceType='*', description='' } = {}) {
  if (typeof id !== 'string' || !id.trim()) throw new TypeError('id must be non-empty');
  if (typeof action !== 'string' || !action.trim()) throw new TypeError('action must be non-empty');
  return Object.freeze({
    schema: 'nexus.capability.v1',
    id: id.trim(),
    action: action.trim(),
    resourceType,
    description
  });
}

export function capabilityMatches(capability, action, resource) {
  return Boolean(
    capability &&
    capability.action === action &&
    (capability.resourceType === '*' || capability.resourceType === resource?.resourceType)
  );
}
