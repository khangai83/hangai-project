// ============================================================
// statsClient.js — 👁/❤️ тоолуурын КЛИЕНТ тал (browser)
//
// Хоёр үүрэг:
//   1) getDeviceId() — энэ browser-ийн тогтмол uuid (зочин хүнийг таних,
//      сервер дээр нэг хүн 2 удаа тоологдохгүйн тулд)
//   2) postStats()  — /api/listings/[id]/{view|like} руу хүсэлт илгээх.
//      Нэвтэрсэн бол `access_token`-оор (сервер батална), эс бөгөөс device id-гаар.
//
// ⚠️ Энэ файл client тал. Сервер талын логик нь lib/listingStats.js.
// ============================================================
import { getSupabase } from './supabaseClient';

const DEVICE_KEY = 'zarmn_device_v1';

/** Энэ browser-ийн тогтмол id (localStorage-д нэг удаа үүснэ) */
export function getDeviceId() {
  if (typeof window === 'undefined') return '';
  try {
    let id = window.localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id =
        window.crypto && typeof window.crypto.randomUUID === 'function'
          ? window.crypto.randomUUID()
          : `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch (e) {
    return ''; // private mode — зочин хэвээр
  }
}

/** Нэвтэрсэн бол `Authorization: Bearer …` буцаана */
async function authHeaders() {
  try {
    const sb = getSupabase();
    if (!sb) return {};
    const { data } = await sb.auth.getSession();
    const token = data && data.session ? data.session.access_token : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (e) {
    return {};
  }
}

/**
 * Тоолуурын API руу хүсэлт.
 * ⚠️ Алдааг ШИДЭХГҮЙ — тоолуур нь косметик, UI-д саад болохгүй.
 * @returns {Promise<object|null>} серверийн хариу (ж: { ok, likes, views })
 */
export async function postStats(path, body = {}) {
  try {
    const headers = { 'Content-Type': 'application/json', ...(await authHeaders()) };
    const res = await fetch(path, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ...body, device: getDeviceId() }),
      keepalive: true,
    });
    return res.ok ? await res.json() : null;
  } catch (e) {
    return null;
  }
}

/**
 * 👁 Дэлгэрэнгүй хуудас нээгдэхэд «үзсэн» гэж бүртгүүлнэ.
 * @returns {Promise<number|null>} шинэ «үзсэн» тоо (миграцгүй бол null)
 */
export async function trackListingView(id) {
  if (!id) return null;
  const data = await postStats(`/api/listings/${id}/view`);
  return data && typeof data.views === 'number' ? data.views : null;
}
