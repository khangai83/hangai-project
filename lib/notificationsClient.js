'use client';

// ============================================================
// notificationsClient.js — 🔔 МЭДЭГДЛИЙН UI талын туслах
//                          (React hook + event + Supabase query)
//
// ⚠️ ЯАГААД ЦЭВЭР ЛОГИКООС ТУСДАА ВЭ (`lib/messagesClient.js`-ийн ЯГ ИЖИЛ):
//   `lib/notifications.mjs` нь зөвхөн тооцоолол (Node тестэд ШУУД ажиллана ✓),
//   харин энэ файл нь React hook + query ашигладаг тул 'use client' шаардана ✗
//
// 📌 ХОЁР hook:
//   • `useUnreadNotifications(userId)` — ЗӨВХӨН тоо (хонхны badge, polling)
//   • `useNotifications(user)`          — ЖАГСААЛТ + уншсан болгох/устгах
//     (хонхны dropdown ба `/notifications` хуудас хоёулаа үүнийг хэрэглэнэ ✓)
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import {
  NOTIFICATIONS_EVENT, normalizeNotificationRow, sortNotifications, unreadCount,
} from './notifications.mjs';
import {
  clearNotifications, deleteNotification, fetchNotifications,
  fetchUnreadNotificationCount, markNotificationsRead,
} from './queries';

/**
 * Мэдэгдэл өөрчлөгдсөнийг БҮХ компонентод мэдэгдэнэ
 * (хонхны badge ШУУД шинэчлэгдэнэ — `notifyMessagesChanged`-ийн ЯГ ИЖИЛ загвар).
 */
export function notifyNotificationsChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
}

/**
 * 🔔 Уншаагүй мэдэгдлийн тоог амьдаар хадгална (хонхны badge).
 *
 * ⚠️ ЯАГААД POLLING ВЭ: Supabase Realtime нь `publication` тохиргоо
 *    (нэмэлт migration) шаарддаг бол энэ апп «миграцгүй ч ажиллана» зарчмыг
 *    баримталдаг ⇒ polling + `focus`/`event` хангалттай ✓
 *
 * @param {string|null|undefined} userId
 * @param {{pollMs?:number}} [opts]
 * @returns {number} уншаагүй тоо (нэвтрээгүй/миграцгүй бол 0)
 */
export function useUnreadNotifications(userId, { pollMs = 60000 } = {}) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    try {
      setCount(await fetchUnreadNotificationCount(userId));
    } catch (err) {
      // ⚠️ Чимээгүй 0 — хонхны badge нь аппыг эвдэх ёсгүй
      console.warn('[notifications] уншаагүйн тоог аваагүй:', (err && err.message) || err);
      setCount(0);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setCount(0);
      return undefined;
    }
    let alive = true;
    const run = async () => {
      if (!alive || typeof document === 'undefined' || document.visibilityState === 'hidden') return;
      await load();
    };
    run();

    window.addEventListener(NOTIFICATIONS_EVENT, run);
    window.addEventListener('focus', run);
    const timer = window.setInterval(run, pollMs);
    return () => {
      alive = false;
      window.removeEventListener(NOTIFICATIONS_EVENT, run);
      window.removeEventListener('focus', run);
      window.clearInterval(timer);
    };
  }, [userId, pollMs, load]);

  return count;
}

/**
 * 🔔 Миний мэдэгдлийн ЖАГСААЛТ + үйлдлүүд.
 *
 * ⚠️ `error` нь ХООСОН БИШ бол `/notifications` хуудас «0040 migration
 *    ажиллуул» гэсэн зааврыг, хонхны самбар «ачаалж чадсангүй» гэсэн
 *    богино мессежийг харуулна ✓
 * ⚠️ Үйлдэл бүр `notifyNotificationsChanged()`-ийг дуудна ⇒ хонхны badge нь
 *    ДАРУЙ шинэчлэгдэнэ (хуудсыг дахин ачаалах шаардлагагүй ✓)
 *
 * @param {{id:string}|null|undefined} user
 * @param {{limit?:number, pollMs?:number}} [opts]
 */
export function useNotifications(user, { limit, pollMs = 60000 } = {}) {
  const userId = (user && user.id) || null;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!userId) {
      setItems([]);
      setError('');
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const rows = await fetchNotifications(userId, limit ? { limit } : undefined);
      setItems(sortNotifications(rows.map(normalizeNotificationRow).filter(Boolean)));
      setError('');
    } catch (err) {
      setError((err && err.message) || 'Мэдэгдлийг ачаалж чадсангүй.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    let alive = true;
    if (!userId) {
      setItems([]);
      setError('');
      setLoading(false);
      return undefined;
    }
    const run = async () => {
      if (!alive || typeof document === 'undefined' || document.visibilityState === 'hidden') return;
      await load({ silent: true });
    };
    load();

    window.addEventListener(NOTIFICATIONS_EVENT, run);
    window.addEventListener('focus', run);
    const timer = window.setInterval(run, pollMs);
    return () => {
      alive = false;
      window.removeEventListener(NOTIFICATIONS_EVENT, run);
      window.removeEventListener('focus', run);
      window.clearInterval(timer);
    };
  }, [userId, pollMs, load]);

  /** Уншсан болгох: `ids` өгөхгүй бол БҮГДИЙГ ✓ */
  const markRead = useCallback(async (ids = null) => {
    if (!userId) return 0;
    const list = Array.isArray(ids) ? ids.filter(Boolean) : null;
    if (list && !list.length) return 0;
    try {
      const n = await markNotificationsRead(userId, list);
      const stamp = new Date().toISOString();
      setItems((prev) => prev.map((r) => {
        if (r.readAt) return r;
        if (list && !list.includes(r.id)) return r;
        return { ...r, readAt: stamp };
      }));
      notifyNotificationsChanged();
      return n;
    } catch (err) {
      setError((err && err.message) || 'Уншсан болгож чадсангүй.');
      return 0;
    }
  }, [userId]);

  /** Нэг мэдэгдлийг устгах */
  const remove = useCallback(async (id) => {
    if (!id || !userId) return false;
    try {
      await deleteNotification(id, userId);
      setItems((prev) => prev.filter((r) => r.id !== id));
      notifyNotificationsChanged();
      return true;
    } catch (err) {
      setError((err && err.message) || 'Устгаж чадсангүй.');
      return false;
    }
  }, [userId]);

  /** БҮГДИЙГ устгах */
  const clear = useCallback(async () => {
    if (!userId) return false;
    try {
      await clearNotifications(userId);
      setItems([]);
      setError('');
      notifyNotificationsChanged();
      return true;
    } catch (err) {
      setError((err && err.message) || 'Устгаж чадсангүй.');
      return false;
    }
  }, [userId]);

  return {
    items,
    loading,
    error,
    unread: unreadCount(items),
    reload: load,
    markRead,
    markAllRead: () => markRead(null),
    remove,
    clear,
  };
}
