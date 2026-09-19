// ============================================================
// verifyMn.js — verify.mn (MO SMS баталгаажуулалт) сервер талын клиент
//
// verify.mn нь Монголын бүх үүрэн операторыг нэгтгэсэн MO (Mobile-Originated)
// SMS gateway. Хэрэглэгч 144773 дугаар руу SMS ИЛГЭЭЖ, verify.mn бидэнд
// мэдэгдэнэ. Урсгал:
//
//   1) POST https://api.verify.mn/sessions
//      → { sessionId, phone, shortcode, text, smsUri, displayInstruction, expiresAt }
//   2) UI дээр `displayInstruction`-ийг ҮГЧЛЭН харуулж, `smsUri`-г tap-to-open
//      холбоосоор өгнө. Хэрэглэгч 144773 руу `text`-ийг SMS-ээр илгээнэ.
//   3) GET https://api.verify.mn/sessions/{sessionId}
//      → { sessionId, sessionStatus: PENDING|VERIFIED|EXPIRED, callbackStatus,
//          verifiedAt, expiresAt }
//
// ⚠️ ЗӨВХӨН СЕРВЕР ТАЛД ажиллана. `VERIFY_MN_API_KEY` нь НУУЦ түлхүүр тул
//    NEXT_PUBLIC_ угтваргүй, browser-д хэзээ ч илгээгдэхгүй.
//
// Турших: node scripts/check-verify-mn.js 99112233
// ============================================================
const fs = require('fs');
const path = require('path');
const { toLocalPhone, isValidMnPhone, normalizePhone } = require('./phoneEmail');

const DEFAULT_BASE_URL = 'https://api.verify.mn';
const SHORTCODE = '144773';
const TTL_SECONDS = 300; // verify.mn session-ийн үндсэн TTL (5 минут)
const POLL_INTERVAL_MS = 3000; // GET /sessions/{id}-г 3 секундээс хурдан бүү шалга (docs)

// ---- Багахан .env.local parser (dotenv-гүй; зөвхөн CLI-д хэрэгтэй) ----
function loadEnvLocal() {
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    content.split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
  } catch (e) {
    /* .env.local байхгүй — Next дотор process.env аль хэдийн ачаалагдсан байна */
  }
}

function getBaseUrl() {
  loadEnvLocal();
  return (process.env.VERIFY_MN_API_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

/** API түлхүүр (байхгүй бол null). GET /sessions/{id} нь auth шаарддаггүй. */
function getApiKey() {
  loadEnvLocal();
  const key = process.env.VERIFY_MN_API_KEY;
  if (!key) return null;
  const clean = key.trim();
  if (!clean || clean.includes('tanii_verify_mn')) return null;
  return clean;
}

/** API түлхүүрийг шаардана (байхгүй бол ойлгомжтой алдаа шидэнэ) */
function requireApiKey() {
  const key = getApiKey();
  if (!key) {
    // ⚠️ Мессеж нь ОРЧНООС хамаарч өөр байх ёстой: deploy дээр ".env.local / dev server"
    // гэж хэлэх нь төөрөгдүүлдэг (Vercel дээр .env.local файл байхгүй, redeploy хэрэгтэй).
    const deployed = !!(
      process.env.VERCEL ||
      process.env.VERCEL_ENV ||
      process.env.NETLIFY ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.RENDER
    );
    const err = new Error(
      deployed
        ? 'VERIFY_MN_API_KEY тохируулаагүй байна. Deploy хийсэн орчин дээр env хувьсагчийг ' +
            'нэмнэ үү (Vercel → Project → Settings → Environment Variables → VERIFY_MN_API_KEY) ' +
            'тэгээд ДАХИН DEPLOY хийнэ (Deployments → ⋯ → Redeploy). ' +
            'Зөвхөн save/restart хангалтгүй.'
        : 'VERIFY_MN_API_KEY тохируулаагүй байна. .env.local файлд ' +
            'VERIFY_MN_API_KEY=<түлхүүр> нэмээд dev server-ээ дахин эхлүүлнэ үү.'
    );
    err.code = 'VERIFY_MN_KEY_MISSING';
    throw err;
  }
  return key;
}

// ---------------- Утасны дугаарын туслах функцууд ----------------
// (нэг эх сурвалж: lib/phoneEmail.js — сервер болон клиент хоёулаа ашиглана)
//   toLocalPhone() / isValidMnPhone() / normalizePhone() нь дээр require хийгдсэн.

/** 6 оронтой санамсаргүй код (verify.mn session бүрт шинээр) */
function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ---------------- HTTP ----------------
async function apiFetch(pathname, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${requireApiKey()}`;

  let res;
  try {
    res = await fetch(`${getBaseUrl()}${pathname}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch (cause) {
    const err = new Error(`verify.mn-д холбогдож чадсангүй (${cause.message}).`);
    err.code = 'VERIFY_MN_NETWORK';
    err.cause = cause;
    throw err;
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = { raw: text };
  }

  if (!res.ok) {
    const detail = (data && (data.message || data.error)) || text.slice(0, 200) || `HTTP ${res.status}`;
    const err = new Error(`verify.mn алдаа (HTTP ${res.status}): ${detail}`);
    err.status = res.status;
    err.body = data;
    err.code =
      res.status === 401 ? 'VERIFY_MN_UNAUTHORIZED' : res.status === 409 ? 'VERIFY_MN_CONFLICT' : 'VERIFY_MN_ERROR';
    throw err;
  }
  return data;
}

/**
 * Session үүсгэх (auth шаардана).
 * @returns {Promise<{sessionId:string, phone:string, shortcode:string, text:string,
 *                    smsUri:string, displayInstruction:string, expiresAt:string}>}
 */
async function createSession({ phone, text, callback }) {
  const local = toLocalPhone(phone);
  if (!isValidMnPhone(local)) {
    const err = new Error('Утасны дугаар буруу байна. Жишээ: 99112233');
    err.code = 'INVALID_PHONE';
    throw err;
  }
  const smsText = String(text == null ? '' : text).trim();
  if (!smsText) {
    const err = new Error('SMS-ийн текст хоосон байна.');
    err.code = 'EMPTY_TEXT';
    throw err;
  }

  const body = { phone: local, text: smsText };
  if (callback) body.callback = callback;

  return apiFetch('/sessions', { method: 'POST', body, auth: true });
}

/**
 * Session-ийн төлөв (auth шаардахгүй).
 * @returns {Promise<{sessionId:string, sessionStatus:'PENDING'|'VERIFIED'|'EXPIRED',
 *                    callbackStatus:string, verifiedAt:string|null, expiresAt:string}>}
 */
async function getSession(sessionId) {
  if (!sessionId) {
    const err = new Error('sessionId хоосон байна.');
    err.code = 'MISSING_SESSION_ID';
    throw err;
  }
  return apiFetch(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'GET', auth: false });
}

/** session VERIFIED болсон эсэх (алдаа гарвал false) */
async function isSessionVerified(sessionId) {
  try {
    const s = await getSession(sessionId);
    return s && s.sessionStatus === 'VERIFIED';
  } catch (e) {
    return false;
  }
}

/**
 * Бүртгэлийн урсгалд зориулсан туслах: шинэ 6 оронтой код үүсгэж session нээнэ.
 * 409 (ижил дугаар+тексттэй идэвхтэй session) гарвал шинэ кодоор дахин оролдоно.
 */
async function startVerification(phone, { callback } = {}) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = generateCode();
    try {
      const session = await createSession({ phone, text: code, callback });
      return session;
    } catch (err) {
      lastError = err;
      if (err.code !== 'VERIFY_MN_CONFLICT') throw err;
    }
  }
  throw lastError;
}

/**
 * session VERIFIED болтол 3 секунд тутам шалгана (сервер талын хүлээлт).
 *
 *   • Хамгийн эхний шалгалтыг ШУУД хийнэ (хэрэглэгч аль хэдийн илгээсэн байж болно).
 *   • VERIFIED болмогц ШУУД буцаана (цаашид нэг ч хүсэлт явуулахгүй).
 *   • EXPIRED бол эсвэл `timeoutMs` хүрвэл `false` (шидэхгүй — graceful fail).
 *   • Түр сүлжээний алдаа гарвал дахин оролдоно (deadline хүртэл).
 *
 * @param {string} sessionId
 * @param {{timeoutMs?:number, intervalMs?:number, onTick?:Function}} [opts]
 * @returns {Promise<boolean>}
 */
async function waitForVerification(
  sessionId,
  { timeoutMs = TTL_SECONDS * 1000, intervalMs = POLL_INTERVAL_MS, onTick } = {}
) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  for (;;) {
    try {
      const s = await getSession(sessionId); // эхний шалгалтыг шууд хийнэ
      lastError = null;
      if (typeof onTick === 'function') onTick(s);
      if (s && s.sessionStatus === 'VERIFIED') return true;
      if (s && s.sessionStatus === 'EXPIRED') return false;
    } catch (err) {
      // 401 = API түлхүүрийн алдаа → тохиргооны асуудал, `false` болгож бүү нуу
      if (err && (err.code === 'VERIFY_MN_UNAUTHORIZED' || err.code === 'VERIFY_MN_KEY_MISSING')) throw err;
      lastError = err;
    }

    if (Date.now() + intervalMs > deadline) {
      if (lastError) console.warn('[verifyMn] хүлээлт дууслаа, сүүлийн алдаа:', lastError.message);
      return false;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

/**
 * Нэг дуудлагаар утасны дугаарыг баталгаажуулах (сервер талын helper).
 *
 *   const ok = await verifyMn.verifyPhone('99112233', {
 *     onSession: (s) => showInstruction(s.displayInstruction, s.smsUri),
 *   });
 *   if (ok) { ...утас баталгаажсан... }
 *
 * Урсгал:
 *   1) 6 оронтой санамсаргүй код үүсгэж POST /sessions (300с TTL)
 *   2) `onSession(session)` — UI нь `displayInstruction`-ийг ҮГЧЛЭН харуулж,
 *      `smsUri` (sms:144773?body=...) -г tap-to-open холбоосоор өгнө
 *   3) GET /sessions/{sessionId} -г 3 секунд тутам шалгана
 *   4) sessionStatus === 'VERIFIED' болмогц зогсоож `true` буцаана
 *
 * ⚠️ Алдааны бодлого (санаатай):
 *   • Хэрэглэгчээс хамаарах үр дүн (баталгаажуулаагүй / хугацаа дууссан /
 *     сүлжээний түр алдаа) → `false`. Шидэхгүй.
 *   • ТОХИРГООНЫ алдаа (VERIFY_MN_API_KEY дутуу эсвэл буруу = 401, дугаар буруу)
 *     → `Error` ШИДНЭ. Учир нь `false` болгож нуувал "хэрэглэгч баталгаажуулаагүй"
 *     гэж андуурч, буруу оношилгоо өгнө.
 *
 * @param {string} phone 99112233 | +97699112233 | 976 9911-2233
 * @param {{onSession?:Function, onTick?:Function, intervalMs?:number, timeoutMs?:number, callback?:string}} [options]
 *        `onSession` — session үүсэхэд нэг удаа; `onTick` — poll бүрт (лог/UI)
 * @returns {Promise<boolean>} зөвхөн дугаар баталгаажсан үед `true`
 */
async function verifyPhone(
  phone,
  { onSession, onTick, intervalMs = POLL_INTERVAL_MS, timeoutMs = TTL_SECONDS * 1000, callback } = {}
) {
  // createSession нь тохиргооны алдаа (401/түлхүүр дутуу/дугаар буруу) гарвал шидэнэ
  const session = await startVerification(phone, { callback });

  if (typeof onSession === 'function') {
    try {
      await onSession(session);
    } catch (err) {
      // UI/лог харуулах давхаргын алдаа баталгаажуулалтыг зогсоохгүй
      console.warn('[verifyMn] onSession алдаа:', (err && err.message) || err);
    }
  }

  return waitForVerification(session.sessionId, { timeoutMs, intervalMs, onTick });
}

module.exports = {
  DEFAULT_BASE_URL,
  SHORTCODE,
  TTL_SECONDS,
  POLL_INTERVAL_MS,
  getBaseUrl,
  getApiKey,
  requireApiKey,
  toLocalPhone,
  isValidMnPhone,
  normalizePhone,
  generateCode,
  createSession,
  getSession,
  isSessionVerified,
  startVerification,
  waitForVerification,
  verifyPhone,
};

