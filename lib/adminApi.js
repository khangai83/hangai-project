// ============================================================
// adminApi.js — Клиент талаас /api/admin/* руу хандах туслах
//
// Нэвтэрсэн хэрэглэгчийн access token-ыг Authorization header-т илгээнэ.
// Сервер нь `app_metadata.is_admin`-аар эрхийг шалгана.
// ============================================================
import { getSupabase } from './supabaseClient';

async function authedFetch(path, options = {}) {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase тохиргоо алга.' };

  const { data } = await sb.auth.getSession();
  const token = data && data.session && data.session.access_token;
  if (!token) return { error: 'Эхлээд нэвтрэх шаардлагатай.' };

  let res;
  try {
    res = await fetch(path, {
      cache: 'no-store',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    return { error: `Сүлжээний алдаа: ${(err && err.message) || err}` };
  }

  let body = {};
  try {
    body = await res.json();
  } catch (e) {
    body = {};
  }
  if (!res.ok || body.ok === false) {
    return { error: body.error || `Алдаа (HTTP ${res.status}).`, status: res.status };
  }
  return { data: body };
}

/** Одоогийн хэрэглэгч админ эсэх */
export function fetchAdminMe() {
  return authedFetch('/api/admin/me');
}

/** Бүртгэгдсэн хэрэглэгчдийн жагсаалт + статистик */
export function fetchAdminUsers() {
  return authedFetch('/api/admin/users');
}

/** Хэрэглэгчид админ эрх олгох / авах */
export function updateUserAdmin(userId, isAdmin) {
  return authedFetch(`/api/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ isAdmin }),
  });
}
