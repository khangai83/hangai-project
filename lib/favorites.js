// ============================================================
// favorites.js — «Таалагдсан зарууд» (browser-ийн localStorage)
//
// ЯАГААД localStorage ВЭ: сервер/DB тохиргоо (хүснэгт, RLS) шаардахгүй, тэр
// дороо ажиллана. Нэг браузер дотор хадгалагдана.
//
// ❤️ Дарсан тоо (нийт хэдэн хүн) нь СЕРВЕР дээр `listings.likes` баганад
//    хадгалагдана → POST /api/listings/[id]/like (0006_listing_stats.sql).
//
// 👉 Олон төхөөрөмж дээр синхрон болгохыг хүсвэл
//    `supabase/migrations/0005_listings_update_policy.sql` файлын доод хэсэгт
//    бэлэн `favorites` хүснэгтийн SQL байгаа — түүнийг ажиллуулаад энэ файлыг
//    DB хувилбар руу сольж болно.
// ============================================================
import { useEffect, useState } from 'react';
import { postStats } from './statsClient';

const KEY = 'zarmn_favorites_v1';
const EVENT = 'zarmn:favorites-changed';
const LIKES_EVENT = 'zarmn:listing-likes'; // серверээс шинэ тоо ирэхэд


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

/**
 * Сервер дээрх «таалагдсан» тоог шинэчилж, шинэ тоог бүх компонентод тараана.
 *    like   → сервер `listing_likes`-д мөр нэмнэ
 *    unlike → мөр устгана
 * (lib/statsClient.js → postStats, 0007_listing_likes_views.sql)
 * ⚠️ Алдааг чимээгүй өнгөрөөнө — товч дарах нь хэзээ ч эвдрэхгүй.
 */
function notifyServerLike(listingId, liked) {
  if (typeof window === 'undefined' || !listingId) return;
  postStats(`/api/listings/${listingId}/like`, { action: liked ? 'like' : 'unlike' }).then((data) => {
    if (data && typeof data.likes === 'number') {
      // Бүх карт/detail хуудас энэ тоог шууд шинэчилнэ (useLikeCount)
      window.dispatchEvent(new CustomEvent(LIKES_EVENT, { detail: { id: listingId, likes: data.likes } }));
    }
  });
}

/** ❤ / 🤍 солих → шинэ жагсаалт буцаана. Сервер дээрх тоог ч ±1 болгоно. */
export function toggleFavorite(listingId) {
  const ids = read();
  const liked = !ids.includes(listingId); // одоо ❤️ болж байна уу?
  const next = liked ? [listingId, ...ids] : ids.filter((x) => x !== listingId);
  write(next);
  notifyServerLike(listingId, liked);
  return next;
}

export function removeFavorite(listingId) {
  const next = read().filter((x) => x !== listingId);
  write(next);
  notifyServerLike(listingId, false);
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

/**
 * Сервер дээрх «таалагдсан» тоог ажиглах hook.
 *
 * @param {string} listingId  — зарын id
 * @param {number} serverLikes — жагсаалтаас ирсэн анхны утга (listings.likes)
 * @returns {number} одоогийн тоо (хэн нэгэн ❤️ дарахад автоматаар шинэчлэгдэнэ)
 *
 * Ажиллах зарчим: `toggleFavorite` → сервер → шинэ тоо → LIKES_EVENT →
 * энэ hook шинэчлэгдэнэ. Ингэснээр карт болон detail хуудас дээрх тоо
 * refresh хийлгүйгээр шууд өөрчлөгдөнө.
 */
export function useLikeCount(listingId, serverLikes) {
  const [count, setCount] = useState(Number(serverLikes) || 0);

  // Жагсаалт дахин ачаалагдвал сервер дээрх утгыг барина
  useEffect(() => {
    setCount(Number(serverLikes) || 0);
  }, [serverLikes]);

  useEffect(() => {
    const onLikes = (e) => {
      if (e.detail && e.detail.id === listingId && typeof e.detail.likes === 'number') {
        setCount(e.detail.likes);
      }
    };
    window.addEventListener(LIKES_EVENT, onLikes);
    return () => window.removeEventListener(LIKES_EVENT, onLikes);
  }, [listingId]);

  return count;
}
