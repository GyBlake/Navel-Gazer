import test from 'node:test';
import assert from 'node:assert/strict';
import { HARDWARE_GROUNDING, hardwareGrounding, validateHardwareGrounding } from '../src/hardware.mjs';

test('hardware grounding exposes concrete computational substrates', () => {
  assert.equal(HARDWARE_GROUNDING.compute, 'CPU / SoC');
  assert.equal(HARDWARE_GROUNDING.hardwareInitialization, 'BIOS / UEFI');
  assert.equal(HARDWARE_GROUNDING.bootTransition, 'EFI boot manager / boot program');
  assert.equal(HARDWARE_GROUNDING.durableStorage, 'SSD / filesystem');
  assert.equal(validateHardwareGrounding(), true);
});

test('hardware grounding is returned without mutable internal state', () => {
  const snapshot = hardwareGrounding();
  assert.notEqual(snapshot, HARDWARE_GROUNDING);
  assert.deepEqual(snapshot, HARDWARE_GROUNDING);
});
