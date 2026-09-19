// ============================================================
// authServer.js — Бүртгэл/нэвтрэлтийн СЕРВЕР талын логик
//
//   • Supabase Admin client (service_role) — RLS-ыг тойрох, зөвхөн сервер талд
//   • Утасны дугаараар хэрэглэгч хайх
//   • SMS баталгаажсаны ДАРАА хэрэглэгч үүсгэх (Supabase-ийн өөрийн SMS
//     илгээгчийг ашиглахгүй — verify.mn-ээр бид өөрсдөө баталгаажуулна)
//   • `requestToken` — (sessionId ↔ утас) хосыг серверт гарын үсэг зурж хадгалах
//     богино хугацааны токен. Ингэснээр нэг дугаараар баталгаажуулаад өөр
//     дугаар бүртгэхийг хориглоно.
//
// ⚠️ ЗӨВХӨН СЕРВЕР ТАЛД. `SUPABASE_SERVICE_ROLE_KEY` нь НУУЦ.
// ============================================================
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { normalizePhone, toLocalPhone } = require('./verifyMn');

const SESSION_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 минут

// ---- Багахан .env.local parser (dotenv-гүй) ----
function loadEnvLocal() {
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    content.split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
  } catch (e) {
    /* .env.local байхгүй */
  }
}

/** Supabase Admin (service_role) client */
function getAdminClient() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('TANII_PROJECT_REF') || key.includes('service_role')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY-ээ .env.local-д бөглөнө үү.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---------------- requestToken (гарын үсэгтэй, богино хугацаатай) ----------------

function getTokenSecret() {
  loadEnvLocal();
  const secret = process.env.AUTH_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || secret.includes('service_role')) {
    throw new Error('AUTH_SESSION_SECRET (эсвэл SUPABASE_SERVICE_ROLE_KEY) тохируулаагүй байна.');
  }
  return secret;
}

/**
 * (sessionId, phone) хосыг гарын үсэг зурж нэг мөрөнд буцаана.
 * Формат: base64url(JSON).base64url(HMAC-SHA256)
 */
function signPhoneSession({ sessionId, phone }, ttlMs = SESSION_TOKEN_TTL_MS) {
  if (!sessionId) throw new Error('sessionId хоосон байна.');
  const now = Date.now();
  const payload = Buffer.from(
    JSON.stringify({ sessionId, phone: toLocalPhone(phone), iat: now, exp: now + ttlMs })
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', getTokenSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

/** Токеныг шалгаж { sessionId, phone, iat, exp } буцаана; хүчингүй бол null */
function verifyPhoneSession(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const payload = parts[0];
  const sig = parts[1];

  let expected;
  try {
    expected = crypto.createHmac('sha256', getTokenSecret()).update(payload).digest('base64url');
  } catch (e) {
    return null;
  }

  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch (e) {
    return null;
  }

  if (!data || !data.sessionId || !data.phone) return null;
  if (!data.exp || data.exp < Date.now()) return null;
  return data;
}

// ---------------- Хэрэглэгч ----------------

/**
 * Утасны дугаараар хэрэглэгч хайх (Admin API).
 * ГЭХДЭЭ: Supabase Admin API нь утсаар шүүх боломжгүй тул хуудсуудыг
 * (page × perPage) гүйлгэж хайна. Хэрэв төсөл маш том болвол `phone`-ыг
 * тусад нь хүснэгтэд хөтлөх шаардлагатай болно.
 * @returns {Promise<object|null>} олдвол auth user, эс бөгөөс null
 */
async function findUserByPhone(phone) {
  const admin = getAdminClient();
  const local = toLocalPhone(phone);
  const candidates = new Set([`+976${local}`, `976${local}`, local]);

  const perPage = 1000;
  const maxPages = 10; // хамгийн ихдээ 10,000 хэрэглэгч хүртэл хайна

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = (data && data.users) || [];
    const hit = users.find((u) => u.phone && candidates.has(String(u.phone).trim()));
    if (hit) return hit;
    if (users.length < perPage) break;
  }
  return null;
}

/** Утас баталгаажсаны дараа хэрэглэгч үүсгэх (нууц үг + нэртэй) */
async function createVerifiedUser({ phone, password, name }) {
  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    phone: normalizePhone(phone),
    password,
    phone_confirm: true, // SMS-ийг verify.mn-ээр бид баталгаажуулсан
    user_metadata: { name: name || null },
  });

  if (error) {
    const err = new Error(friendlyAuthError(error));
    err.code = error.code || error.status || 'AUTH_ERROR';
    err.cause = error;
    throw err;
  }
  return data.user;
}

/** Supabase-ийн англи алдааг хэрэглэгчид ойлгомжтой Монгол мессеж болгох */
function friendlyAuthError(error) {
  const msg = `${error && error.code ? error.code : ''} ${error && error.message ? error.message : ''}`.toLowerCase();
  if (msg.includes('already') || msg.includes('exists') || msg.includes('duplicate')) {
    return 'Энэ дугаар аль хэдийн бүртгэгдсэн байна. «Нэвтрэх» хэсгээр нэвтэрнэ үү.';
  }
  if (msg.includes('password') && (msg.includes('weak') || msg.includes('length') || msg.includes('6'))) {
    return 'Нууц үг хэт богино байна. Хамгийн багадаа 6 тэмдэгт оруулна уу.';
  }
  if (msg.includes('phone')) {
    return `Утасны дугаартай холбоотой алдаа: ${error.message}`;
  }
  return `Хэрэглэгч үүсгэхэд алдаа гарлаа: ${(error && error.message) || 'тодорхойгүй'}`;
}

/**
 * Supabase төсөлд утасны (phone) нэвтрэлт идэвхтэй эсэх.
 * `/auth/v1/settings` → `external.phone`. Идэвхгүй бол хэрэглэгч бүртгүүлж
 * чадахгүй (нууц үгээр нэвтрэх нь 422 phone_provider_disabled буцаана).
 * Тиймээс SMS илгээхээс ӨМНӨ шалгаж, ойлгомжтой мессеж өгнө.
 */
async function isPhoneProviderEnabled() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return false;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: anonKey },
      cache: 'no-store',
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!(data && data.external && data.external.phone);
  } catch (e) {
    // Сүлжээний алдаа — шалгаж чадсангүй гэж үзээд үргэлжлүүлнэ
    return true;
  }
}

module.exports = {
  SESSION_TOKEN_TTL_MS,
  loadEnvLocal,
  getAdminClient,
  signPhoneSession,
  verifyPhoneSession,
  findUserByPhone,
  createVerifiedUser,
  isPhoneProviderEnabled,
  friendlyAuthError,
};
