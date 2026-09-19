// ============================================================
// authApi.js — Клиент талаас /api/auth/* руу хандах туслах функцууд
//
// Эдгээр route-ууд нь сервер талд verify.mn болон Supabase Admin-тай
// ажилладаг (API key / service_role түлхүүр browser-д хэзээ ч орохгүй).
// ============================================================

async function request(path, options) {
  let res;
  try {
    res = await fetch(path, { cache: 'no-store', ...(options || {}) });
  } catch (err) {
    return { error: `Сүлжээний алдаа: ${(err && err.message) || err}` };
  }

  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }

  if (!res.ok || data.ok === false) {
    return {
      error: data.error || `Алдаа гарлаа (HTTP ${res.status}).`,
      code: data.code || null,
    };
  }
  return { data };
}

function postJson(path, payload) {
  return request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/** Бүртгэл/нэвтрэлт бэлэн эсэх (Phone provider, VERIFY_MN_API_KEY) */
export function fetchAuthStatus() {
  return request('/api/auth/status');
}

/** Бүртгэлийн SMS баталгаажуулалт эхлүүлэх → session + requestToken */
export function startPhoneVerification({ phone, name }) {
  return postJson('/api/auth/register/start', { phone, name });
}

/** SMS баталгаажуулалтын төлөв шалгах (3 сек тутам дуудна) */
export function checkPhoneVerification(sessionId) {
  return request(`/api/auth/register/status?sessionId=${encodeURIComponent(sessionId)}`);
}

/** SMS баталгаажсаны дараа бүртгэлийг дуусгах (хэрэглэгч үүсгэх) */
export function completeRegistration({ name, phone, password, requestToken }) {
  return postJson('/api/auth/register/complete', { name, phone, password, requestToken });
}
