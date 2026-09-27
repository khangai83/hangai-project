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
const { normalizePhone, toLocalPhone, phoneToEmail } = require('./phoneEmail');

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
 *
 * Гурван хэлбэрийг шалгана (аль нэг нь таарвал олдсон гэж үзнэ):
 *   1) `user.phone`            — phone provider-ээр бүртгэгдсэн
 *   2) `user.email`            — дотоод имэйл (`976...@phone.zarmn.mn`)
 *   3) `user_metadata.phone`   — дотоод имэйлээр бүртгэгдсэн хэрэглэгч
 *
 * @returns {Promise<object|null>} олдвол auth user, эс бөгөөс null
 */
async function findUserByPhone(phone) {
  const admin = getAdminClient();
  const local = toLocalPhone(phone);
  const candidates = new Set([`+976${local}`, `976${local}`, local]);
  const email = phoneToEmail(local);

  const perPage = 1000;
  const maxPages = 10; // хамгийн ихдээ 10,000 хэрэглэгч хүртэл хайна

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = (data && data.users) || [];
    const hit = users.find((u) => {
      if (u.phone && candidates.has(String(u.phone).trim())) return true;
      if (u.email && String(u.email).trim().toLowerCase() === email) return true;
      const metaPhone = u.user_metadata && u.user_metadata.phone;
      if (metaPhone && candidates.has(String(metaPhone).trim())) return true;
      return false;
    });
    if (hit) return hit;
    if (users.length < perPage) break;
  }
  return null;
}

/** Аль нэг auth provider идэвхгүйгээс болж нурсан эсэх (ж: `phone_provider_disabled`) */
function isProviderDisabledError(error) {
  const msg = `${(error && error.code) || ''} ${(error && error.message) || ''}`.toLowerCase();
  return msg.includes('provider_disabled') || msg.includes('logins are disabled');
}

/** Supabase-ийн алдааг ойлгомжтой `Error` болгох */
function toAuthError(error) {
  const err = new Error(friendlyAuthError(error));
  err.code = error.code || error.status || 'AUTH_ERROR';
  err.cause = error;
  return err;
}

/** Утас баталгаажсаны дараа хэрэглэгч үүсгэх (нууц үг + нэртэй) */
async function createVerifiedUser({ phone, password, name }) {
  const admin = getAdminClient();
  const e164 = normalizePhone(phone);

  // ⚠️ ЧУХАЛ (туршилтаар илэрсэн):
  // Supabase Admin API нь phone provider ИДЭВХГҮЙ байхад ч `phone`-той
  // хэрэглэгч ҮҮСГЭЖ ЧАДДАГ. ГЭХДЭЭ тэр хэрэглэгч `signInWithPassword({phone})`
  // -ээр НЭВТЭРЧ ЧАДАХГҮЙ (HTTP 422 `phone_provider_disabled`).
  // Тиймээс шийдвэрийг "үүсгэх алдаа"-аар биш, provider-ийн БОДИТ төлвөөр гаргана.
  const phoneMode = await isPhoneProviderEnabled();

  if (phoneMode) {
    const { data, error } = await admin.auth.admin.createUser({
      phone: e164,
      password,
      phone_confirm: true, // SMS-ийг verify.mn-ээр бид баталгаажуулсан
      user_metadata: { name: name || null },
    });
    if (error) throw toAuthError(error);
    return data.user;
  }

  // ---------- Phone provider идэвхгүй → ДОТООД имэйлээр (Email provider) ----------
  // Dashboard дээр ямар ч тохиргоо солихгүйгээр ажиллана.
  const fallbackEmail = phoneToEmail(e164);
  console.warn(
    `[authServer] Phone provider идэвхгүй → дотоод имэйлээр бүртгэж байна (${fallbackEmail}). ` +
      'Утасны нэвтрэлтийг Dashboard → Authentication → Providers → Phone-оос асааж болно.'
  );

  const { data, error } = await admin.auth.admin.createUser({
    email: fallbackEmail,
    password,
    email_confirm: true,
    user_metadata: { name: name || null, phone: e164 },
  });
  if (error) throw toAuthError(error);
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

// ---------------- НУУЦ ҮГ СЭРГЭЭХ (verify.mn-ийн дараа) ----------------

/**
 * Хэрэглэгчийн нууц үгийг СОЛИХ (Admin API, service_role).
 *
 * ⚠️ Хэрэглэгч нэвтэрсэн байх ШААРДЛАГАГҮЙ — утсаа verify.mn-ээр
 * баталгаажуулсан тул бид «тэр хүн мөн» гэж үзнэ (бүртгэлийн урсгалтай
 * ижил зарчим). Тиймээс энэ функцийг ЗӨВХӨН `verifyPhoneSession()`-ийг
 * амжилттай шалгасны ДАРАА дуудна!
 */
async function updateUserPassword(userId, password) {
  if (!userId) throw new Error('Хэрэглэгчийн id дутуу байна.');
  if (!password || String(password).length < 6) {
    throw new Error('Нууц үг хэт богино байна (хамгийн багадаа 6 тэмдэгт).');
  }

  const admin = getAdminClient();
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    password: String(password),
  });

  if (error) {
    const msg = `${error.code || ''} ${error.message || ''}`.toLowerCase();
    if (msg.includes('password') && (msg.includes('weak') || msg.includes('length') || msg.includes('short'))) {
      throw new Error('Нууц үг хэт богино байна. Хамгийн багадаа 6 тэмдэгт оруулна уу.');
    }
    throw new Error(`Нууц үг солиход алдаа гарлаа: ${error.message || 'тодорхойгүй'}`);
  }
  return data.user;
}

/** Профайл (хоч нэр + зураг + элссэн огноо) — сервер талаас */
async function getProfile(userId) {
  if (!userId) return null;
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .select('id, name, display_name, avatar_url, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ---------------- SMS ХЯЗГААР (0015 — auth_events) ----------------
// ⚠️ ЯАГААД ЧУХАЛ ВЭ: verify.mn-ийн SMS нь МӨНГӨ ЗАРЦУУЛДАГ. Хязгааргүй бол
// хэн нэгэн скриптээр олон мянган SMS илгээж үлдэгдлийг шавхана.

/** Утас тус бүрээр 1 цагт */
const SMS_PER_PHONE_PER_HOUR = 3;
/** IP тус бүрээр 1 цагт (нэг IP-ээс олон утас туршсан тохиолдол) */
const SMS_PER_IP_PER_HOUR = 10;

/** `auth_events`-д үйл явдал бүртгэх (хязгаарын тооцоонд) */
async function recordAuthEvent({ kind, phone = null, ip = null }) {
  if (!kind) return;
  try {
    const admin = getAdminClient();
    const local = toLocalPhone(phone);
    await admin.from('auth_events').insert({ kind, phone: local || null, ip: ip || null });
  } catch (e) {
  // ⚠️ 0015 migration ороогүй байж болно — урсгалыг ЗОГСООХГҮЙ
    console.warn('[authServer] auth_events бичих алдаа (0015 ороогүй байж магадгүй):', e.message || e);
  }
}

/**
 * SMS хязгаарыг шалгана. Хэтэрсэн бол `RATE_LIMIT` кодтой Error шиднэ.
 * ⚠️ 0015 ороогүй / DB алдаа гарвал ШИДЭХГҮЙ (зөвхөн лог) — сайт ажиллах ёстой.
 */
async function assertAuthRateLimit({ kind, phone, ip }) {
  const limitError = (n, unit) => {
    const err = new Error(
      `Хэт олон удаа код авах хүсэлт. ${unit} тус бүрээр 1 цагт ${n} удаа ` +
        'зөвшөөрөгдөнө. Түр хүлээгээд дахин оролдоно уу.'
    );
    err.code = 'RATE_LIMIT';
    return err;
  };

  try {
    const admin = getAdminClient();
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const local = toLocalPhone(phone);

    if (local) {
      const { count } = await admin
        .from('auth_events')
        .select('id', { count: 'exact', head: true })
        .eq('kind', kind)
        .eq('phone', local)
        .gte('created_at', since);
      if ((count || 0) >= SMS_PER_PHONE_PER_HOUR) throw limitError(SMS_PER_PHONE_PER_HOUR, 'Дугаар');
    }

    if (ip) {
      const { count } = await admin
        .from('auth_events')
        .select('id', { count: 'exact', head: true })
        .eq('kind', kind)
        .eq('ip', ip)
        .gte('created_at', since);
      if ((count || 0) >= SMS_PER_IP_PER_HOUR) throw limitError(SMS_PER_IP_PER_HOUR, 'IP');
    }
  } catch (e) {
  // ⚠️ Бидний хязгаарын алдааг ДАМЖУУЛНА; бусад (DB/схем) алдааг зөвхөн лог
    if (e && e.code === 'RATE_LIMIT') throw e;
    console.warn('[authServer] хязгаар шалгах алдаа (0015 ороогүй байж магадгүй):', e.message || e);
  }
}

/** Хүсэлтээс IP гаргах (Vercel/Next.js — `x-forwarded-for` эхний утга) */
function getClientIp(req) {
  try {
    const fwd = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '';
    return String(fwd).split(',')[0].trim() || null;
  } catch (e) {
    return null;
  }
}

module.exports = {
  SESSION_TOKEN_TTL_MS,
  SMS_PER_PHONE_PER_HOUR,
  SMS_PER_IP_PER_HOUR,
  loadEnvLocal,
  getAdminClient,
  signPhoneSession,
  verifyPhoneSession,
  findUserByPhone,
  createVerifiedUser,
  isProviderDisabledError,
  isPhoneProviderEnabled,
  friendlyAuthError,
  updateUserPassword,
  getProfile,
  recordAuthEvent,
  assertAuthRateLimit,
  getClientIp,
};
