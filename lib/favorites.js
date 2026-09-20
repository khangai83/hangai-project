// ============================================================
// favorites.js — «Таалагдсан зарууд» (browser-ийн localStorage)
//
// ЯАГААД localStorage ВЭ: сервер/DB тохиргоо (хүснэгт, RLS) шаардахгүй, тэр
// дороо ажиллана. Нэг браузер дотор хадгалагдана.
//
// 👉 Олон төхөөрөмж дээр синхрон болгохыг хүсвэл
//    `supabase/migrations/0005_listings_update_policy.sql` файлын доод хэсэгт
//    бэлэн `favorites` хүснэгтийн SQL байгаа — түүнийг ажиллуулаад энэ файлыг
//    DB хувилбар руу сольж болно.
// ============================================================
import { useEffect, useState } from 'react';

const KEY = 'zarmn_favorites_v1';
const EVENT = 'zarmn:favorites-changed';

/** localStorage-аас id-нуудыг унших (алдаа гарвал хоосон массив) */
function read() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch (e) {
    return [];
  }
}

function write(ids) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
    // Нэг хуудасны бүх компонентыг мэдэгдэнэ (useFavorites-ууд шинэчлэгдэнэ)
    window.dispatchEvent(new Event(EVENT));
  } catch (e) {
    /* private mode гэх мэт — чимээгүй өнгөрөөнө */
  }
}

/** Бүх таалагдсан зарын id (хамгийн сүүлд нэмсэн нь эхэнд) */
export function getFavoriteIds() {
  return read();
}

export function isFavorite(listingId) {
  return read().includes(listingId);
}

/** ❤ / 🤍 солих → шинэ жагсаалт буцаана */
export function toggleFavorite(listingId) {
  const ids = read();
  const next = ids.includes(listingId) ? ids.filter((x) => x !== listingId) : [listingId, ...ids];
  write(next);
  return next;
}

export function removeFavorite(listingId) {
  const next = read().filter((x) => x !== listingId);
  write(next);
  return next;
}

export function clearFavorites() {
  write([]);
}

/**
 * React hook — таалагдсан id-нуудыг төлөв болгон буцаана.
 * (Өөр компонент/таб өөрчлөхөд автоматаар шинэчлэгдэнэ.)
 */
export function useFavorites() {
  const [ids, setIds] = useState([]);

  useEffect(() => {
    const sync = () => setIds(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync); // өөр tab-аас өөрчлөгдсөн үед
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return ids;
}
