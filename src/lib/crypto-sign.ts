import 'server-only';
import crypto from 'node:crypto';

/**
 * Alphabet for key generation without ambiguous characters (0/O, 1/I/L).
 */
const SAFE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGIT_CHARS = '0123456789';
const ALL_ALPHANUMERIC = LOWERCASE_CHARS + UPPERCASE_CHARS + DIGIT_CHARS;

/**
 * Format duration in seconds into a clean uppercase tag (12H, 24H, 3D, 7D, 30D, LIFETIME).
 */
export function formatDurationTag(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds <= 0) return 'LIFETIME';
  if (seconds % 86400 === 0) return `${seconds / 86400}D`;
  if (seconds % 3600 === 0) return `${seconds / 3600}H`;
  if (seconds % 60 === 0) return `${seconds / 60}M`;
  return `${seconds}S`;
}

/**
 * Generate key in official Hiroki format:
 * Hiroki_(thời gian in hoa)_(số thiết bị TB)_(12 ký tự ngẫu nhiên gồm: chữ thường, chữ in hoa, số)
 * Example: Hiroki_12H_1TB_js38PZ45Dwlg
 */
export function generateHirokiKey(
  durationStr = '12H',
  devices: number | string = 1,
  randomLength = 12
): string {
  let randomPart = '';
  // Ensure the 12 characters contain lowercase, uppercase, and numbers
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

/**
 * Generate a high-entropy random key using Node CSPRNG (crypto.randomBytes).
 * Example: generateRandomKeyCode('HIROKI', 3, 4) -> 'HIROKI-8F9A-K2M4-P7X3'
 */
export function generateRandomKeyCode(
  prefix = 'HIROKI',
  groups = 3,
  charsPerGroup = 4
): string {
  const totalChars = groups * charsPerGroup;
  const randomBytes = crypto.randomBytes(totalChars);
  const groupStrings: string[] = [];

  for (let g = 0; g < groups; g++) {
    let segment = '';
    for (let c = 0; c < charsPerGroup; c++) {
      const idx = randomBytes[g * charsPerGroup + c] % SAFE_ALPHABET.length;
      segment += SAFE_ALPHABET[idx];
    }
    groupStrings.push(segment);
  }

  const cleanPrefix = prefix.trim().replace(/-+$/, '');
  return cleanPrefix ? `${cleanPrefix}-${groupStrings.join('-')}` : groupStrings.join('-');
}

/**
 * Canonical JSON serialization (recursively sorts all object keys alphabetically).
 * Ensures deterministic byte-for-byte representation across any language/SDK.
 */
export function toCanonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return '[' + value.map((item) => toCanonicalJson(item)).join(',') + ']';
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  const entries = sortedKeys.map(
    (k) => `${JSON.stringify(k)}:${toCanonicalJson(obj[k])}`
  );
  return '{' + entries.join(',') + '}';
}

interface Ed25519KeySet {
  activeKid: 'k1' | 'k2';
  privateKeys: Record<string, crypto.KeyObject>;
  publicKeys: Record<string, crypto.KeyObject>;
  publicKeysSpkiB64: Record<string, string>;
}

let cachedKeySet: Ed25519KeySet | null = null;

/**
 * Loads Ed25519 keypairs (k1 primary, k2 backup) from environment variables,
 * or generates deterministic ephemeral development keys if running in dev/test without env configured.
 */
export function getEd25519KeySet(): Ed25519KeySet {
  if (cachedKeySet) {
    return cachedKeySet;
  }

  const activeKid = (process.env.ED25519_ACTIVE_KID === 'k2' ? 'k2' : 'k1') as 'k1' | 'k2';
  const privateKeys: Record<string, crypto.KeyObject> = {};
  const publicKeys: Record<string, crypto.KeyObject> = {};
  const publicKeysSpkiB64: Record<string, string> = {};

  const k1PrivB64 = process.env.ED25519_PRIVATE_KEY_K1_B64 || process.env.ED25519_PRIVATE_KEY_K1;
  const k2PrivB64 = process.env.ED25519_PRIVATE_KEY_K2_B64 || process.env.ED25519_PRIVATE_KEY_K2;

  function loadPrivateKey(b64OrPem: string): crypto.KeyObject {
    try {
      const buf = Buffer.from(b64OrPem, 'base64');
      const text = buf.toString('utf8');
      if (text.includes('BEGIN PRIVATE KEY')) {
        return crypto.createPrivateKey({ key: text, format: 'pem', type: 'pkcs8' });
      }
      return crypto.createPrivateKey({ key: buf, format: 'der', type: 'pkcs8' });
    } catch {
      return crypto.createPrivateKey({ key: b64OrPem, format: 'pem' });
    }
  }

  if (k1PrivB64) {
    const privKey = loadPrivateKey(k1PrivB64);
    const pubKey = crypto.createPublicKey(privKey);
    privateKeys.k1 = privKey;
    publicKeys.k1 = pubKey;
    publicKeysSpkiB64.k1 = (pubKey.export({ format: 'der', type: 'spki' }) as Buffer).toString('base64');
  } else {
    // Fallback deterministic seed for dev/testing when env is not set
    const seed = crypto.createHash('sha256').update('hiroki-dev-ed25519-k1-seed').digest();
    const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
    const privDer = Buffer.concat([pkcs8Header, seed]);
    const privKey = crypto.createPrivateKey({ key: privDer, format: 'der', type: 'pkcs8' });
    const pubKey = crypto.createPublicKey(privKey);
    privateKeys.k1 = privKey;
    publicKeys.k1 = pubKey;
    publicKeysSpkiB64.k1 = (pubKey.export({ format: 'der', type: 'spki' }) as Buffer).toString('base64');
  }

  if (k2PrivB64) {
    const privKey = loadPrivateKey(k2PrivB64);
    const pubKey = crypto.createPublicKey(privKey);
    privateKeys.k2 = privKey;
    publicKeys.k2 = pubKey;
    publicKeysSpkiB64.k2 = (pubKey.export({ format: 'der', type: 'spki' }) as Buffer).toString('base64');
  } else {
    const seed = crypto.createHash('sha256').update('hiroki-dev-ed25519-k2-seed').digest();
    const pkcs8Header = Buffer.from('302e020100300506032b657004220420', 'hex');
    const privDer = Buffer.concat([pkcs8Header, seed]);
    const privKey = crypto.createPrivateKey({ key: privDer, format: 'der', type: 'pkcs8' });
    const pubKey = crypto.createPublicKey(privKey);
    privateKeys.k2 = privKey;
    publicKeys.k2 = pubKey;
    publicKeysSpkiB64.k2 = (pubKey.export({ format: 'der', type: 'spki' }) as Buffer).toString('base64');
  }

  cachedKeySet = {
    activeKid,
    privateKeys,
    publicKeys,
    publicKeysSpkiB64,
  };

  return cachedKeySet;
}

export interface SignedLicenseEnvelope<T = Record<string, unknown>> {
  kid: 'k1' | 'k2';
  payload: T & { kid: 'k1' | 'k2' };
  payload_b64: string;
  signature: string;
}

/**
 * Signs a response payload using Ed25519 over the base64url-encoded Canonical JSON string.
 * Game clients verify `signature` directly over `Buffer.from(payload_b64, 'utf8')`
 * (or over the decoded canonical JSON bytes—here we sign the exact canonical JSON UTF-8 bytes
 * encoded inside `payload_b64` so the client simply base64url-decodes `payload_b64`, verifies
 * the Ed25519 signature over those exact bytes, and parses the JSON).
 */
export function signLicensePayload<T extends Record<string, unknown>>(
  data: T,
  forceKid?: 'k1' | 'k2'
): SignedLicenseEnvelope<T> {
  const keySet = getEd25519KeySet();
  const kid = forceKid || keySet.activeKid;
  const privKey = keySet.privateKeys[kid];

  const payloadWithKid = {
    ...data,
    kid,
  };

  const canonicalJson = toCanonicalJson(payloadWithKid);
  const canonicalBytes = Buffer.from(canonicalJson, 'utf8');
  const payload_b64 = canonicalBytes.toString('base64url');
  const sigBytes = crypto.sign(null, canonicalBytes, privKey);
  const signature = sigBytes.toString('base64url');

  return {
    kid,
    payload: payloadWithKid,
    payload_b64,
    signature,
  };
}

/**
 * Verifies an Ed25519 signed envelope (used by heartbeat session_token & self-tests).
 */
export function verifyLicenseEnvelope<T = Record<string, unknown>>(
  payload_b64: string,
  signature: string,
  kid?: string
): { valid: boolean; payload: T | null } {
  try {
    const keySet = getEd25519KeySet();
    const canonicalBytes = Buffer.from(payload_b64, 'base64url');
    const sigBytes = Buffer.from(signature, 'base64url');

    const candidateKids = kid && keySet.publicKeys[kid] ? [kid] : ['k1', 'k2'];
    for (const candidate of candidateKids) {
      const pubKey = keySet.publicKeys[candidate];
      if (!pubKey) continue;
      const isOk = crypto.verify(null, canonicalBytes, pubKey, sigBytes);
      if (isOk) {
        const parsed = JSON.parse(canonicalBytes.toString('utf8')) as T;
        return { valid: true, payload: parsed };
      }
    }
    return { valid: false, payload: null };
  } catch {
    return { valid: false, payload: null };
  }
}

export interface HeartbeatSessionClaims {
  key_id: string;
  key_code: string;
  game_package: string;
  device_id: string;
  key_expires_at: string | null; // ISO timestamp or null for lifetime
  iat: number;
  next_db_check_at: number; // Unix seconds when server must re-query DB (every 5 minutes)
  exp: number; // Hard token expiry (e.g. iat + 360s)
}

/**
 * Creates a compact signed session_token (`<kid>.<payload_b64>.<signature>`) for `/api/v1/heartbeat`.
 */
export function createHeartbeatSessionToken(claims: HeartbeatSessionClaims): string {
  const signed = signLicensePayload(claims as unknown as Record<string, unknown>);
  return `${signed.kid}.${signed.payload_b64}.${signed.signature}`;
}

/**
 * Verifies a compact `session_token` from `/api/v1/heartbeat`.
 */
export function verifyHeartbeatSessionToken(
  token: string
): { valid: boolean; claims: HeartbeatSessionClaims | null } {
  if (!token || typeof token !== 'string') {
    return { valid: false, claims: null };
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, claims: null };
  }
  const [kid, payload_b64, signature] = parts;
  const res = verifyLicenseEnvelope<HeartbeatSessionClaims>(payload_b64, signature, kid);
  if (!res.valid || !res.payload) {
    return { valid: false, claims: null };
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof res.payload.exp !== 'number' || res.payload.exp < nowSec) {
    return { valid: false, claims: null };
  }
  return { valid: true, claims: res.payload };
}

/**
 * HMAC-SHA256 helper for signing browser cookies (`hiroki_claim_sid`, `hiroki_active_keys`).
 */
function getCookieHmacSecret(): string {
  return (
    process.env.ADMIN_JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'hiroki-dev-cookie-hmac-secret-key-32bytes'
  );
}

export function signCookieValue(data: unknown): string {
  const json = JSON.stringify(data);
  const b64 = Buffer.from(json, 'utf8').toString('base64url');
  const mac = crypto
    .createHmac('sha256', getCookieHmacSecret())
    .update(b64)
    .digest('base64url');
  return `${b64}.${mac}`;
}

export function verifyCookieValue<T>(cookieStr: string | undefined | null): T | null {
  if (!cookieStr || typeof cookieStr !== 'string') return null;
  const dotIdx = cookieStr.lastIndexOf('.');
  if (dotIdx <= 0) return null;
  const b64 = cookieStr.slice(0, dotIdx);
  const mac = cookieStr.slice(dotIdx + 1);
  const expectedMac = crypto
    .createHmac('sha256', getCookieHmacSecret())
    .update(b64)
    .digest('base64url');

  const macBuf = Buffer.from(mac);
  const expBuf = Buffer.from(expectedMac);
  if (macBuf.length !== expBuf.length || !crypto.timingSafeEqual(macBuf, expBuf)) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

