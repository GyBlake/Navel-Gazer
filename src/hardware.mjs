export const HARDWARE_GROUNDING = Object.freeze({
  compute: 'CPU / SoC',
  initializationData: 'firmware storage',
  hardwareInitialization: 'BIOS / UEFI',
  bootTransition: 'EFI boot manager / boot program',
  executionManagement: 'operating-system kernel',
  stateTransport: 'system interconnect / bus',
  durableStorage: 'SSD / filesystem',
  localIO: 'device and controller interfaces',
  activeWork: 'process / runtime environment',
  addedCapability: 'driver / module / plugin'
});

export function hardwareGrounding() {
  return Object.freeze({ ...HARDWARE_GROUNDING });
}

export function validateHardwareGrounding() {
  const entries = Object.entries(HARDWARE_GROUNDING);
  return entries.length > 0 && entries.every(([name, grounding]) => Boolean(name && grounding));
}
