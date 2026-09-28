'use client';

// ============================================================
// messagesClient.js — МЕССЕЖИЙН UI талын туслах (React hook + event)
//
// ⚠️ ЯАГААД ЦЭВЭР ЛОГИКООС ТУСДАА ВЭ:
//   `lib/messages.mjs` нь зөвхөн тооцоолол (Node тестэд ШУУД ажиллана ✓),
//   харин энэ файл нь React hook + Supabase query ашигладаг тул 'use client'
//   шаардана. Хоёрыг нэг файлд хийвэл `npm run test:messages` нь React-ийг
//   татах шаардлагатай болно ✗
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { CONVERSATION_CHANGED_EVENT } from './messages.mjs';
import { fetchUnreadCount } from './queries';

/**
 * Мессеж/яриа өөрчлөгдсөнийг БҮХ компонентод мэдэгдэнэ
 * (nav-ийн badge, /messages хуудас — `useFavorites`-ийн EVENT-тэй ижил загвар).
 */
export function notifyMessagesChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CONVERSATION_CHANGED_EVENT));
}

/**
 * Уншаагүй мессежийн тоог амьдаар хадгална (мобайл/десктоп nav-ийн badge).
 *
 * ⚠️ ЯАГААД POLLING ВЭ: Supabase Realtime-ийг асаахад `publication` тохиргоо
 *    шаардана (нэмэлт migration). Энэ апп нь «миграцгүй ч ажиллана» зарчмыг
 *    баримталдаг тул энгийн polling + `focus`/`event` дээр шинэчлэх нь
 *    хангалттай (мессеж бичих/унших үед ШУУД шинэчлэгдэнэ ✓)
 *
 * @param {string|null|undefined} userId
 * @returns {number} уншаагүй мессежийн тоо (миграцгүй/нэвтрээгүй бол 0)
 */
export function useUnreadMessages(userId, { pollMs = 60000 } = {}) {
  const [count, setCount] = useState(0);

  const load = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    try {
      setCount(await fetchUnreadCount(userId));
    } catch (err) {
      // ⚠️ Чимээгүй 0 — мессежийн badge нь аппыг эвдэх ёсгүй
      console.warn('[messages] уншаагүйн тоог аваагүй:', (err && err.message) || err);
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

    window.addEventListener(CONVERSATION_CHANGED_EVENT, run);
    window.addEventListener('focus', run);
    const timer = window.setInterval(run, pollMs);
    return () => {
      alive = false;
      window.removeEventListener(CONVERSATION_CHANGED_EVENT, run);
      window.removeEventListener('focus', run);
      window.clearInterval(timer);
    };
  }, [userId, pollMs, load]);

  return count;
}
