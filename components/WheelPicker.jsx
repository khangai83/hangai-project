'use client';

import { useEffect, useRef, useState } from 'react';
import { nearestChoiceIndex, indexFromScroll, scrollTopForIndex } from '../lib/numberChoices.mjs';

/**
 * 🎡 iOS TIMER МАЯГИЙН ДУГУЙ СОНГОГЧ (2026-10-02)
 *
 * 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «…жагсаалтаас сонгоод оруулдаг байя, жишээ нь
 *    барилгийн давхар 1 2 3 4 … 26-аас сонгуулах … эсвэл iPhone timer-ийн
 *    тоо сонгодог шиг хийж чадах уу, тийм бол тэр нь гоё санагдаж байна»
 *    ⇒ 📱 гар утсанд тоон талбар дээр дарахад ЭНЭ дугуй нээгдэж,
 *    хэрэглэгч утгаа төв рүү гүйлгэн сонгоно (гараар бичих шаардлагагүй ✓)
 *
 * ⚠️ ХЭРХЭН АЖИЛЛАДАГ ВЭ:
 *    • Гүйлгэх хэсэг нь `snap-y` — мөр бүр ЗӨВХӨН төв дээр зогсоно
 *      (`scroll-snap`, iOS Timer-ийн мэдрэмж ✓)
 *    • Гүйлгээ ЗОГССОНЫ дараа (`SETTLE_MS`) төвд байгаа утгыг `onPick`-ээр
 *      дамжуулна ⇒ «Болсон» дарах шаардлагагүй (iOS-ийн зан ✓), гэхдээ
 *      «Болсон» товч нь хаах зорилгоор байгаа (хэрэглэгчид ойлгомжтой ✓)
 *    • Мөр дээр ШУУД дарвал тэр мөр төв рүү шилжиж сонгогдоно ✓
 *    • `Escape` ба АРД талын бараан хэсэг дарахад хаагдана ✓
 *
 * ⚠️ `<form>` ДОТОР байрладаг тул БҮХ товч `type="button"` — эс бөгөөс
 *    дугуйг гүйлгэх бүрд формоо submit хийх байсан ✗
 * ⚠️ Талбарууд (CDP/тестийн тогтвортой selector):
 *    `[data-wheel]` · `[data-wheel-backdrop]` · `[data-wheel-title]` ·
 *    `[data-wheel-done]` · `[data-wheel-scroll]` · `[data-wheel-value="…"]` ·
 *    `[data-wheel-marker]`
 * 🔍 Хайх үг: WheelPicker, data-wheel, iOS Timer, дугуй сонгогч, snap-y
 *
 * @param {boolean}  open    нээлттэй эсэх (`false` үед DOM-д ОГТ гарахгүй ✓)
 * @param {string}   title   талбарын нэр (ж: «Барилгын нийт давхар»)
 * @param {Array}    items   `[{ value, label }]` — `lib/numberChoices.mjs`
 *   → `toChoiceItems()`; ⚠️ `value: ''` нь «хоосон» мөр (ж: `'—'`) ✓
 * @param {string}   value   одоогийн утга (дугуй нээгдэхэд эндээс эхэлнэ ✓)
 * @param {string}   [hint]  дугуйн толгойд гарах жижиг тайлбар
 * @param {Function} onPick  сонгосон утга (гүйлгээ зогсох бүрд дуудагдана)
 * @param {Function} onClose хаах (мөр/товч/`Escape` бүгд энэ рүү ✓)
 */
const ITEM_H = 40;        // нэг мөрийн өндөр (px)
const VISIBLE = 5;        // үзэгдэх мөрийн тоо (төв 1 + дээш 2 + доош 2)
const PAD = (VISIBLE - 1) / 2;
const SETTLE_MS = 140;    // гүйлгээ зогссоныг хүлээх хугацаа

export default function WheelPicker({
  open = false, title = '', items = [], value = '', hint = '', onPick, onClose,
}) {
  const scrollRef = useRef(null);
  const timerRef = useRef(null);
  const [active, setActive] = useState(0);
  /** ⚠️ `items` нь render бүрд ШИНЭ массив тул эффект нь утгуудаараа харна ✓ */
  const itemsKey = items.map((it) => it.value).join('|');

  /** ① Нээгдэхэд (эсвэл жагсаалт солигдоход) сонгосон утга дээрээ БАЙРЛАНА */
  useEffect(() => {
    if (!open) return undefined;
    const idx = nearestChoiceIndex(items.map((it) => it.value), value);
    setActive(idx);
    const sc = scrollRef.current;
    if (sc) sc.scrollTop = scrollTopForIndex(idx, ITEM_H);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, itemsKey]);

  /** ② `Escape` → хаана */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /** ③ Хүлээгдэж буй таймерыг цэвэрлэнэ (unmount) ✓ */
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!open) return null;

  /** Төвд байгаа мөрийг СОНГОНО (уншиж байгаа утгатай ижил бол дахин дуудахгүй ✓) */
  const commit = (idx) => {
    setActive(idx);
    const it = items[idx];
    if (it && it.value !== value) onPick?.(it.value);
  };

  /** Гүйлгээ ЗОГССОНЫ дараа төвд байгаа мөрийг сонгоно */
  const settle = () => {
    const sc = scrollRef.current;
    if (!sc) return;
    /** ⚠️ Математик нь ЦЭВЭР модульд (`numberChoices.mjs`) — Node тестээр түгжигдсэн ✓ */
    commit(indexFromScroll(sc.scrollTop, ITEM_H, items.length - 1));
  };

  const handleScroll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(settle, SETTLE_MS);
  };

  /** Мөр дээр ШУУД дарах — тэр мөр төв рүү шилжиж, шууд сонгогдоно ✓ */
  const pickItem = (idx) => {
    const sc = scrollRef.current;
    if (sc) sc.scrollTop = scrollTopForIndex(idx, ITEM_H);
    if (timerRef.current) clearTimeout(timerRef.current);
    commit(idx);
  };


  return (
    <div data-wheel className="fixed inset-0 z-[1500] flex items-end justify-center sm:items-center">
      {/* Ард тал — дарвал хаагдана */}
      <button
        type="button"
        data-wheel-backdrop
        aria-label="Хаах"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 w-full max-w-md rounded-t-2xl border border-gray-200 bg-white px-4 pb-5 pt-4 shadow-xl sm:rounded-2xl sm:pb-4"
      >
        {/* Толгой — талбарын нэр + «Болсон» */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="min-w-0">
            <h3 data-wheel-title className="truncate text-[16px] font-bold text-gray-900">{title}</h3>
            {hint ? <p className="form-hint mt-1">{hint}</p> : null}
          </div>
          <button type="button" data-wheel-done onClick={onClose} className="btn btn-primary shrink-0">
            Болсон
          </button>
        </div>
        {/* Дугуй */}
        <div className="relative mt-4 select-none" style={{ height: ITEM_H * VISIBLE }}>
          <div
            data-wheel-marker
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-xl border-y border-primary/40 bg-primary-light/40"
            style={{ height: ITEM_H }}
          />
          <div
            ref={scrollRef}
            data-wheel-scroll
            role="listbox"
            aria-label={title}
            tabIndex={-1}
            onScroll={handleScroll}
            className="relative h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain"
          >
            {/* Дээд/доод зай — эхний ба сүүлийн мөр ч ТӨВД очиж чадна ✓ */}
            <div aria-hidden="true" style={{ height: ITEM_H * PAD }} />
            {items.map((it, idx) => (
              <button
                key={it.value === '' ? '__empty' : it.value}
                type="button"
                role="option"
                aria-selected={idx === active}
                data-wheel-value={it.value}
                onClick={() => pickItem(idx)}
                className={`flex w-full snap-center items-center justify-center text-[18px] tabular-nums transition ${
                  idx === active ? 'font-bold text-primary' : 'text-gray-400'
                }`}
                style={{ height: ITEM_H }}
              >
                {it.label}
              </button>
            ))}
            <div aria-hidden="true" style={{ height: ITEM_H * PAD }} />
          </div>
        </div>
        <p className="mt-2 text-center text-[12px] text-gray-400">
          Утгаа гүйлгээд төвд нь ирүүлнэ үү
          {items.some((it) => it.value === '') ? ' · «—» = хоосон үлдээх' : ''}
        </p>
      </div>
    </div>
  );
}
