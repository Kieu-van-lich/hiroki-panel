#!/usr/bin/env node
/**
 * HIROKI PANEL - LOCAL ED25519 KEYPAIR GENERATOR (CLI ONLY)
 * Chạy trên máy local: node scripts/generate-ed25519-keys.mjs
 * Sinh 2 cặp khóa Ed25519 (k1: khóa chính, k2: khóa dự phòng xoay vòng)
 * Khóa riêng (Private Key) CHỈ lưu trong biến môi trường Vercel / .env.local,
 * tuyệt đối không lưu trong Database và không truyền qua mạng từ trang Admin.
 */

import crypto from 'node:crypto';

function generateEd25519Pair(kid) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

  const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
  const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });
  const spkiDer = publicKey.export({ type: 'spki', format: 'der' });
  const rawPub32Bytes = spkiDer.subarray(spkiDer.length - 32);

  return {
    kid,
    privDerB64: Buffer.from(privDer).toString('base64'),
    pubSpkiB64: Buffer.from(spkiDer).toString('base64'),
    privPemB64: Buffer.from(privPem, 'utf8').toString('base64'),
    pubPemB64: Buffer.from(pubPem, 'utf8').toString('base64'),
    rawPubHex: rawPub32Bytes.toString('hex'),
    rawPubB64: rawPub32Bytes.toString('base64')
  };
}

const k1 = generateEd25519Pair('k1');
const k2 = generateEd25519Pair('k2');
const sessionSecret = crypto.randomBytes(32).toString('hex');

console.log('============================================================================');
console.log('🔐 HIROKI PANEL - CẶP KHÓA CHỮ KÝ SỐ ED25519 (DÙNG CHO .env.local & VERCEL)');
console.log('============================================================================\n');

console.log('# Dán các dòng dưới đây vào .env.local hoặc Vercel Environment Variables:');
console.log(`ADMIN_SESSION_SECRET="${sessionSecret}"`);
console.log(`ED25519_ACTIVE_KID="k1"`);
console.log(`ED25519_PRIVATE_KEY_K1_B64="${k1.privDerB64}"`);
console.log(`ED25519_PUBLIC_KEY_K1_SPKI_B64="${k1.pubSpkiB64}"`);
console.log(`ED25519_PRIVATE_KEY_K2_B64="${k2.privDerB64}"`);
console.log(`ED25519_PUBLIC_KEY_K2_SPKI_B64="${k2.pubSpkiB64}"\n`);

console.log('============================================================================');
console.log('📱 PUBLIC KEY ĐỂ NHÚNG SẴN VÀO GAME CLIENT (NHÚNG CẢ K1 VÀ K2 DỰ PHÒNG)');
console.log('============================================================================');
console.log(`[KID = "k1" (Primary)]`);
console.log(`  - Raw 32-byte Hex   : ${k1.rawPubHex}`);
console.log(`  - Raw 32-byte Base64: ${k1.rawPubB64}`);
console.log(`  - SPKI PEM Base64   : ${k1.pubPemB64}\n`);

console.log(`[KID = "k2" (Backup)]`);
console.log(`  - Raw 32-byte Hex   : ${k2.rawPubHex}`);
console.log(`  - Raw 32-byte Base64: ${k2.rawPubB64}`);
console.log(`  - SPKI PEM Base64   : ${k2.pubPemB64}`);
console.log('============================================================================');

