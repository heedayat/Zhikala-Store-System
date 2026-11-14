import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SECURITY_PIN,
  isValidPin,
  normalizePinInput,
  resolveUserPin,
  verifySecurityPin,
} from './pin';

test('normalizePinInput strips non-digits and limits length to 4', () => {
  assert.equal(normalizePinInput('12a34b56'), '1234');
  assert.equal(normalizePinInput('  07-50 '), '0750');
  assert.equal(normalizePinInput('abc'), '');
});

test('isValidPin accepts strictly 4 numeric digits', () => {
  assert.equal(isValidPin('1234'), true);
  assert.equal(isValidPin('0009'), true);
  assert.equal(isValidPin('123'), false);
  assert.equal(isValidPin('12345'), false);
  assert.equal(isValidPin('12a4'), false);
  assert.equal(isValidPin(null), false);
});

test('resolveUserPin defaults to 1234 when unset and prefers Firestore user PIN over cache', () => {
  assert.equal(resolveUserPin(null, null), DEFAULT_SECURITY_PIN);
  assert.equal(resolveUserPin({ pin: undefined }, null), '1234');
  assert.equal(resolveUserPin({ pin: undefined }, '9876'), '9876');
  assert.equal(resolveUserPin({ pin: '4321' }, '9876'), '4321');
});

test('verifySecurityPin validates against resolved user PIN', () => {
  assert.equal(verifySecurityPin('1234', { pin: undefined }, null), true);
  assert.equal(verifySecurityPin('0000', { pin: undefined }, null), false);
  assert.equal(verifySecurityPin('5678', { pin: '5678' }, null), true);
  assert.equal(verifySecurityPin('1234', { pin: '5678' }, null), false);
  assert.equal(verifySecurityPin('567', { pin: '5678' }, null), false);
});
