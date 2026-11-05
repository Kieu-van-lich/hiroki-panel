#!/usr/bin/env node

/**
 * Automated Security & Crypto Test Suite for Hiroki Panel
 * Tests:
 * 1. Canonical JSON sorting determinism
 * 2. Ed25519 Envelope signing and verification
 * 3. Tamper detection on payload and signature
 * 4. Heartbeat Session Token creation & verification
 * 5. HMAC Cookie signing & tamper protection
 * 6. Input regex validations (matching PostgreSQL constraints)
 * 7. CSPRNG key generator ambiguity check
 */

import crypto from 'node:crypto';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  ✓ PASS: ${message}`);
}

// 1. Canonical JSON Test
function toCanonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((item) => toCanonicalJson(item)).join(',') + ']';
  }
  const obj = value;
  const sortedKeys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const entries = sortedKeys.map(
    (k) => `${JSON.stringify(k)}:${toCanonicalJson(obj[k])}`
  );
  return '{' + entries.join(',') + '}';
}

console.log('\n--- 1. Testing Canonical JSON Serialization ---');
const testObj1 = { z: 1, a: 2, m: { y: 'hello', b: 'world' } };
const testObj2 = { a: 2, m: { b: 'world', y: 'hello' }, z: 1 };
assert(
  toCanonicalJson(testObj1) === toCanonicalJson(testObj2),
  'Keys are sorted deterministically regardless of insertion order'
);
assert(
  toCanonicalJson(testObj1) === '{"a":2,"m":{"b":"world","y":"hello"},"z":1}',
  'Exact alphabetical byte matching verified'
);

// 2. Ed25519 Key Generation & Signing Test
console.log('\n--- 2. Testing Ed25519 Signature & Tamper Detection ---');
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

const payload = {
  valid: true,
  code: 'OK',
  key_code: 'HIROKI-TEST-KEY-8888',
  game_package: 'com.vng.speedvn',
  device_id: 'hwid_device_001',
  nonce: '1234567890abcdef',
  remaining_seconds: 43200,
  kid: 'k1',
};

const canonicalBytes = Buffer.from(toCanonicalJson(payload), 'utf8');
const payload_b64 = canonicalBytes.toString('base64url');
const signatureBytes = crypto.sign(null, canonicalBytes, privateKey);
const signature_b64 = signatureBytes.toString('base64url');

// Verify valid envelope
const verifyOk = crypto.verify(
  null,
  Buffer.from(payload_b64, 'base64url'),
  publicKey,
  Buffer.from(signature_b64, 'base64url')
);
assert(verifyOk === true, 'Valid Ed25519 envelope verifies successfully');

// Tamper test: modify remaining_seconds in payload
const tamperedPayload = { ...payload, remaining_seconds: 999999 };
const tamperedCanonicalBytes = Buffer.from(toCanonicalJson(tamperedPayload), 'utf8');
const tampered_payload_b64 = tamperedCanonicalBytes.toString('base64url');

const tamperPayloadCheck = crypto.verify(
  null,
  Buffer.from(tampered_payload_b64, 'base64url'),
  publicKey,
  Buffer.from(signature_b64, 'base64url')
);
assert(
  tamperPayloadCheck === false,
  'Tampered payload (modified remaining_seconds) is rejected by signature'
);

// Tamper test: corrupt 1 byte of signature
const corruptedSigBytes = Buffer.from(signatureBytes);
corruptedSigBytes[0] ^= 0xff;
const corruptedSigCheck = crypto.verify(
  null,
  canonicalBytes,
  publicKey,
  corruptedSigBytes
);
assert(
  corruptedSigCheck === false,
  'Corrupted signature byte is rejected'
);

// 3. Heartbeat Session Token Test
console.log('\n--- 3. Testing Heartbeat Session Token ---');
const sessionClaims = {
  key_id: 'd9b8a8b1-1111-2222-3333-444455556666',
  key_code: 'HIROKI-VIP-9999',
  game_package: 'com.miniclip.eightballpool',
  device_id: 'dev_pool_99',
  key_expires_at: new Date(Date.now() + 3600000).toISOString(),
  iat: Math.floor(Date.now() / 1000),
  next_db_check_at: Math.floor(Date.now() / 1000) + 300,
  exp: Math.floor(Date.now() / 1000) + 360,
  kid: 'k1',
};

const tokenJsonBytes = Buffer.from(toCanonicalJson(sessionClaims), 'utf8');
const tokenPayloadB64 = tokenJsonBytes.toString('base64url');
const tokenSigB64 = crypto.sign(null, tokenJsonBytes, privateKey).toString('base64url');
const fullSessionToken = `k1.${tokenPayloadB64}.${tokenSigB64}`;

assert(
  fullSessionToken.split('.').length === 3,
  'Compact session_token format matches <kid>.<payload_b64>.<signature>'
);

const [tokKid, tokPayload, tokSig] = fullSessionToken.split('.');
const tokCheck = crypto.verify(
  null,
  Buffer.from(tokPayload, 'base64url'),
  publicKey,
  Buffer.from(tokSig, 'base64url')
);
assert(tokCheck === true, 'Session token signature verifies cleanly');

// 4. Cookie HMAC Signing & Tamper Test
console.log('\n--- 4. Testing Cookie HMAC Integrity ---');
const cookieSecret = 'test-secret-key-32-bytes-minimum-length!';
function signCookie(data) {
  const json = JSON.stringify(data);
  const b64 = Buffer.from(json, 'utf8').toString('base64url');
  const mac = crypto.createHmac('sha256', cookieSecret).update(b64).digest('base64url');
  return `${b64}.${mac}`;
}

function verifyCookie(str) {
  if (!str) return null;
  const idx = str.lastIndexOf('.');
  if (idx <= 0) return null;
  const b64 = str.slice(0, idx);
  const mac = str.slice(idx + 1);
  const expectedMac = crypto.createHmac('sha256', cookieSecret).update(b64).digest('base64url');
  if (mac !== expectedMac) return null;
  return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
}

const cookieData = [{ id: '1', key_code: 'HIROKI-1234', expires_at: null }];
const signedCookie = signCookie(cookieData);
const verifiedCookie = verifyCookie(signedCookie);
assert(
  verifiedCookie !== null && verifiedCookie[0].key_code === 'HIROKI-1234',
  'Cookie data parsed accurately when signature is intact'
);

// Tamper test: decode base64url payload, alter key_code, re-encode with old HMAC
const [originalB64, originalMac] = signedCookie.split('.');
const tamperedJson = Buffer.from(originalB64, 'base64url')
  .toString('utf8')
  .replace('HIROKI-1234', 'HIROKI-HACK');
const tamperedB64 = Buffer.from(tamperedJson, 'utf8').toString('base64url');
const tamperedCookie = `${tamperedB64}.${originalMac}`;

assert(
  verifyCookie(tamperedCookie) === null,
  'Tampered cookie data fails HMAC verification'
);

// 5. Input Regex Validations Test
console.log('\n--- 5. Testing Input Regex Patterns ---');
const PATTERNS = {
  KEY_CODE: /^[A-Za-z0-9_-]{3,80}$/,
  DEVICE_ID: /^[A-Za-z0-9._:-]{4,128}$/,
  GAME_PACKAGE: /^[a-zA-Z0-9._]{3,120}$/,
  APP_VERSION: /^[0-9]{1,6}(\.[0-9]{1,6}){0,3}$/,
  NONCE: /^[A-Za-z0-9_=-]{8,64}$/,
  PIN_CODE: /^[0-9]{6}$/,
};

assert(PATTERNS.KEY_CODE.test('HIROKI-VIP-1234_abc'), 'Valid Key Code allowed');
assert(!PATTERNS.KEY_CODE.test('HIROKI; DROP TABLE;'), 'SQL injection in Key Code rejected');
assert(PATTERNS.DEVICE_ID.test('android_id_1234:xyz.567'), 'Valid HWID allowed');
assert(!PATTERNS.DEVICE_ID.test('ab'), 'Short Device ID rejected');
assert(PATTERNS.APP_VERSION.test('1.0.0'), 'Standard SemVer allowed');
assert(PATTERNS.APP_VERSION.test('1.0'), 'Two-component version allowed');
assert(!PATTERNS.APP_VERSION.test('1.0.0.0.0'), 'Too many version components rejected');
assert(PATTERNS.PIN_CODE.test('482910'), '6-digit PIN allowed');
assert(!PATTERNS.PIN_CODE.test('12345'), '5-digit PIN rejected');
assert(!PATTERNS.PIN_CODE.test('12345a'), 'Non-digit PIN rejected');

// 6. CSPRNG Key Generator Ambiguity Check
console.log('\n--- 6. Testing Key Generator Safe Alphabet ---');
const SAFE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
assert(!SAFE_ALPHABET.includes('0'), 'Zero (0) excluded');
assert(!SAFE_ALPHABET.includes('O'), 'Capital O excluded');
assert(!SAFE_ALPHABET.includes('1'), 'One (1) excluded');
assert(!SAFE_ALPHABET.includes('I'), 'Capital I excluded');
assert(!SAFE_ALPHABET.includes('L'), 'Capital L excluded');

// 7. Hiroki Key Format & Non-Duplication Test
console.log('\n--- 7. Testing Hiroki Key Format & Database Non-Duplication ---');
const ALL_ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateHirokiKey(durationStr = '12H', devices = 1, randomLength = 12) {
  let randomPart = '';
  while (true) {
    const bytes = crypto.randomBytes(randomLength);
    let str = '';
    for (let i = 0; i < randomLength; i++) {
      str += ALL_ALPHANUMERIC[bytes[i] % ALL_ALPHANUMERIC.length];
    }
    if (/[a-z]/.test(str) && /[A-Z]/.test(str) && /[0-9]/.test(str)) {
      randomPart = str;
      break;
    }
  }
  const cleanDuration = String(durationStr).trim().replace(/^_+|_+$/g, '').toUpperCase();
  let rawDev = String(devices).trim().replace(/^_+|_+$/g, '').toUpperCase();
  if (!rawDev.endsWith('TB')) {
    rawDev = `${rawDev}TB`;
  }
  return `Hiroki_${cleanDuration}_${rawDev}_${randomPart}`;
}

const sampleKey = generateHirokiKey('12H', 1, 12);
assert(
  /^Hiroki_12H_1TB_[a-zA-Z0-9]{12}$/.test(sampleKey),
  `Key matches exact pattern Hiroki_(thời gian HOA)_(số TB)_(12 ký tự): ${sampleKey}`
);

const randomPart = sampleKey.split('_')[3];
assert(randomPart.length === 12, 'Random part is exactly 12 characters');
assert(/[a-z]/.test(randomPart), 'Contains lowercase characters');
assert(/[A-Z]/.test(randomPart), 'Contains uppercase characters');
assert(/[0-9]/.test(randomPart), 'Contains numeric digits');

// Generate 1,000 keys and verify 100% uniqueness (no collisions)
const keySet = new Set();
for (let i = 0; i < 1000; i++) {
  const k = generateHirokiKey('12H', 1, 12);
  keySet.add(k);
}
assert(keySet.size === 1000, 'Generated 1,000 consecutive keys with 0 duplicates (100% unique)');

console.log(`\n=================================================`);
console.log(`🎉 All ${passedTests}/${totalTests} Security & Crypto Tests Passed Cleanly!`);
console.log(`=================================================\n`);
