'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  activePair, keyboardValue, moveHandle, nearestHandle, parseNum, pctToValue,
  priceQuickPicks, rangeLabel, toFilterPair, valueToPct, withDynamicBounds,
} from '../lib/rangeSlider.mjs';

/** Толгойнуудын хажуугийн зай (px) — `inset-x-[9px]`-тай ЯГ ИЖИЛ байх ёстой */
const HANDLE_INSET = 9;

/**
 * 🎚 RangeSlider — «чирж тохируулдаг» ХОЁР ТОЛГОЙТ хүрээ (2026-09-30).
 *
 * ✅ Хэрэглэгчийн хүсэлт: «дээд доод үнэ, талбай гэх мэтийн тоог mouse юмуу,
 *    touchpad аас чирээд тохируулдаг байвал их гоё харагдах байна».
 *    → Үнэ (₮), Талбай (м²), оны хүрээ (📅/📥) гурвуулаа ЭНЭ компонентоор
 *      солигдов (`components/HomeClient.jsx`).
 *
 * ⚠️ ЯАГААД «нэг удаагийн commit» ВЭ (хамгийн чухал шийдвэр):
 *    Шүүлт нь АМЬД (real-time) — шүүлт солигдох БҮРД `fetchListings` дуудагдаж,
 *    `count: 'exact'`-тай query явдаг (`lib/queries.js`). Хэрэв чирэх БҮРД
 *    `onChange` дуудвал нэг чирэлтэд ДАРААГААР 20-50 query явж, DB ба сүлжээ
 *    ХЭТЭРХИЙ ачаалагдана ✗
 *    ✅ Тиймээс: чирэх үед ЗӨВХӨН дотоод төлөв (`drag`) шинэчлэгдэж, толгойн
 *       шошго ба тоон оролтууд АМЬДААР харагдана; харин `onChange` нь
 *       ХУЛГАНАА СУЛЛАХ (pointerup) эсвэл ГАРЫН ТОВЧНЫ үед л дуудагдана ✓
 *    ⚠️ Гарын товч (←/→/PageUp/Home/End) нь нэг товчлол = нэг зориудын
 *       үйлдэл тул тэр даруй commit хийгдэнэ (a11y — слайдерийг гаараа
 *       удирдах боломж ЗААВАЛ байх ёстой ✓).
 *
 * ⚠️ УТГЫН ЭЗЭН НЬ ГАРААР БИЧСЭН ТООН ОРОЛТ ХЭВЭЭР:
 *    Хоёр `<input>` нь компонентын ДОТОР хэвээр (хасагдаагүй) ✓ — хэрэглэгч
 *    «250000000» гэж яг таг бичих боломжтой; слайдер нь зөвхөн НЭМЭЛТ
 *    (хурдан, ойлгомжтой) удирдлага. Оруулсан утга хилээс ГАРВАЛ слайдер
 *    динамикаар сунана (`withDynamicBounds`) — утга нь ДАРАГДАХГҮЙ ✓
 *    ⚠️ Бичиж дуусахад (⏎ / blur) л хүчинтэй — үсэг бүрт query явахгүй
 *       (`components/TextFilter.jsx`-ийн адил дүрэм ✓)
 *
 * ⚠️ ХИЛ ДЭЭР БАЙГАА ТАЛ = «ШҮҮЛТ БАЙХГҮЙ» (`toFilterPair`): хэрэглэгч
 *    доод толгойг хамгийн зүүнд, дээдийг хамгийн баруунд тавибал шүүлт
 *    ЧИМЭЭГҮЙ АРИЛНА (URL/DB цэвэр, chip нь худал харагдахгүй) ✓
 *
 * @param {object} props
 * @param {string} props.label      Блокийн нэр (aria-label ба `data-slider`)
 * @param {string} props.from       Одоогийн доод хязгаар (`''` = хязгааргүй)
 * @param {string} props.to         Одоогийн дээд хязгаар (`''` = хязгааргүй)
 * @param {(from:string, to:string)=>void} props.onChange  Commit (шүүлт тавих)
 * @param {{min:number,max:number,step:number}} props.bounds АНХДАГЧ хил
 * @param {string} [props.unit]     Нэгж: `'₮'`, `'м²'`, `'он'`
 * @param {'int'|'decimal'|'year'} [props.mode] Оролтын төрөл (шүүлтүүр)
 * @param {(n:number)=>string} [props.short] Товч форматлагч (`shortPrice`)
 * @param {boolean} [props.quickPicks] Түргэн сонгох хүрээнүүд (₮-д тохирно)
 */
export default function RangeSlider({
  label,
  from = '',
  to = '',
  onChange,
  bounds,
  unit = '',
  mode = 'int',
  short,
  quickPicks = false,
}) {
  const trackRef = useRef(null);
  /** Чирэх үеийн АМЬД хос (`null` = чирэхгүй) */
  const [drag, setDrag] = useState(null);
  /** Зөвхөн энэ хоёр талын бичсэн текст (`null` = бичихгүй) */
  const [typing, setTyping] = useState(null);
  /** pointermove/up нь ДАХИН рендэр дундуур уншихгүйн тулд ref-ээр */
  const dragHandleRef = useRef(null);
  const dragPairRef = useRef(null);

  // ---- ③ Харагдах утгууд (шүүлтийн мөрүүд → тоо) ----
  const shown = drag || activePair(from, to, bounds);
  // ④ Гараар бичсэн утга хилээс гарвал слайдер сунах (утга АЛДАГДАХГҮЙ)
  const dyn = useMemo(() => withDynamicBounds(bounds, shown.from, shown.to), [bounds, shown.from, shown.to]);
  const pf = valueToPct(shown.from, dyn);
  const pt = valueToPct(shown.to, dyn);

  const picks = useMemo(
    () => (quickPicks ? priceQuickPicks(bounds, short || ((n) => String(n))) : []),
    [quickPicks, bounds, short]
  );

  /** Утгуудыг шүүлт болгож ХҮЧИНТЭЙ болгох (нэг л газар — бүх зам энд ирнэ) */
  const commit = useCallback((pair) => {
    const f = toFilterPair(pair.from, pair.to, bounds);
    setDrag(null);
    setTyping(null);
    onChange(f.from, f.to);
  }, [bounds, onChange]);

  /** Чирсэн x координат → АЛХАМД тааруулсан утга */
  const valueFromX = (clientX) => {
    const el = trackRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    // ⚠️ Толгойнууд нь 9px дотогш (`inset-x-[9px]`) аялдаг тул ЯГ тэр зайг
    //    хасна — эс бөгөөс чирсэн цэг ба утга ХОЁР ӨӨР гарна ✗
    const usable = Math.max(1, rect.width - HANDLE_INSET * 2);
    const pct = ((clientX - rect.left - HANDLE_INSET) / usable) * 100;
    return pctToValue(pct, dyn);
  };

  /** Чирж эхлэх — ХАМГИЙН ОЙР толгойг барьж авна (аль ч талд ажиллана ✓) */
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return; // баруун/дунд товч
    const v = valueFromX(e.clientX);
    if (v === null) return;
    const handle = nearestHandle(v, shown.from, shown.to);
    const pair = moveHandle(handle, v, shown.from, shown.to, dyn);
    dragHandleRef.current = handle;
    dragPairRef.current = pair;
    setDrag(pair);
    // ⚠️ capture — хэрэглэгч толгойгоос ГАДНА хулганаа зөөсөн ч чирэлт
    //    ҮРГЭЛЖИЛНЭ (pointer нь энэ элемент рүү чиглэгдэнэ ✓)
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* эртний browser */ }
    e.preventDefault(); // ⚠️ текст/зураг сонгохгүй
  };

  const onPointerMove = (e) => {
    if (!dragHandleRef.current) return;
    const v = valueFromX(e.clientX);
    if (v === null) return;
    const cur = dragPairRef.current || shown;
    const pair = moveHandle(dragHandleRef.current, v, cur.from, cur.to, dyn);
    dragPairRef.current = pair;
    setDrag(pair); // ⚠️ ЗӨВХӨН харагдац — сүлжээний query ЯВАХГҮЙ ✓
  };

  /** Чирэлт дуусах — ЭНД л шүүлт хүчинтэй болно (нэг query ✓) */
  const onPointerUp = () => {
    const handle = dragHandleRef.current;
    const pair = dragPairRef.current;
    dragHandleRef.current = null;
    dragPairRef.current = null;
    if (!handle || !pair) return;
    commit(pair);
  };

  /** Гарын товч — нэг товчлол = нэг алхам (шууд commit) */
  const onKeyDown = (handle) => (e) => {
    const cur = handle === 'from' ? shown.from : shown.to;
    const v = keyboardValue(e.key, cur, dyn);
    if (v === null) return;
    e.preventDefault();
    commit(moveHandle(handle, v, shown.from, shown.to, dyn));
  };

  // ---- Тоон оролтууд (гараар бичих) ----
  const sanitize = (raw) => {
    const s = String(raw == null ? '' : raw);
    if (mode === 'decimal') return s.replace(/[^\d.,]/g, '').slice(0, 8);
    if (mode === 'year') return s.replace(/\D/g, '').slice(0, 4);
    return s.replace(/\D/g, '').slice(0, 12);
  };

  // ⚠️ ХИЛ ДЭЭР байгаа тал нь ХООСОН харагдана (`''` = хязгааргүй) — одоогийн
  //    «Эхлэх / Дуусах» оролтын зан төлөв хэвээр ✓
  const fromText = typing && typing.from !== undefined
    ? typing.from
    : (shown.from === bounds.min ? '' : String(shown.from));
  const toText = typing && typing.to !== undefined
    ? typing.to
    : (shown.to === bounds.max ? '' : String(shown.to));

  const onInput = (side) => (e) => {
    const v = sanitize(e.target.value);
    setTyping((t) => ({ ...(t || {}), [side]: v }));
  };

  /** ⏎ эсвэл талбараас гарахад л хүчинтэй (шүүлт тавих) */
  const commitInputs = () => {
    if (!typing) return;
    const rawFrom = typing.from !== undefined ? typing.from : fromText;
    const rawTo = typing.to !== undefined ? typing.to : toText;
    const f = parseNum(rawFrom);
    const t = parseNum(rawTo);
    let fromN = f === null ? bounds.min : f;
    const toN = t === null ? bounds.max : t;
    // ③ Буруу бичсэн (`from > to`) бол ЗАСНА — слайдер гажихгүй ✓
    if (fromN > toN) fromN = toN;
    commit({ from: fromN, to: toN });
  };

  const shownLabel = rangeLabel(shown.from, shown.to, { unit, short });
  const handleCls = 'absolute top-1/2 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-white shadow-card transition-transform duration-100 ease-out hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';

  /** ⏎ дээр commit хийх туслах (хоёр оролтод ижил) */
  const onInputKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commitInputs(); }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* ---- ① Гараар бичих хос оролт (одоогийн зан төлөв ХЭВЭЭР) ---- */}
      <div className="flex items-center gap-2">
        <input
          className="form-input"
          type="text"
          inputMode={mode === 'decimal' ? 'decimal' : 'numeric'}
          placeholder="Эхлэх"
          aria-label={`${label} (эхлэх)`}
          data-range-input="from"
          value={fromText}
          onChange={onInput('from')}
          onBlur={commitInputs}
          onKeyDown={onInputKeyDown}
        />
        <input
          className="form-input"
          type="text"
          inputMode={mode === 'decimal' ? 'decimal' : 'numeric'}
          placeholder="Дуусах"
          aria-label={`${label} (дуусах)`}
          data-range-input="to"
          value={toText}
          onChange={onInput('to')}
          onBlur={commitInputs}
          onKeyDown={onInputKeyDown}
        />
      </div>

      {/* ---- ② Одоогийн хүрээ (уншигдах) + чирэх зам ---- */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11.5px] font-bold text-gray-600" data-range-label>{shownLabel}</span>
        <span className="text-[10.5px] text-gray-400">↔ чирнэ</span>
      </div>
      <div
        ref={trackRef}
        className="relative h-6 cursor-pointer touch-none select-none"
        data-slider={label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Зам — толгойнууд 9px дотогш аялдаг тул ЯГ тэр зайгаар дотогш */}
        <div className="pointer-events-none absolute inset-x-[9px] top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gray-200" />
        <div className="absolute inset-x-[9px] inset-y-0">
          {/* Идэвхтэй хүрээ (2 толгойн хооронд) */}
          <div
            className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
            style={{ left: `${pf}%`, right: `${100 - pt}%` }}
          />
          <button
            type="button"
            role="slider"
            tabIndex={0}
            data-handle="from"
            aria-label={`${label} — доод хязгаар`}
            aria-valuemin={dyn.min}
            aria-valuemax={dyn.max}
            aria-valuenow={shown.from}
            aria-valuetext={rangeLabel(shown.from, shown.from, { unit, short })}
            title="Чирж тохируулна (эсвэл ← → товчоор)"
            onKeyDown={onKeyDown('from')}
            className={handleCls}
            style={{ left: `${pf}%` }}
          />
          <button
            type="button"
            role="slider"
            tabIndex={0}
            data-handle="to"
            aria-label={`${label} — дээд хязгаар`}
            aria-valuemin={dyn.min}
            aria-valuemax={dyn.max}
            aria-valuenow={shown.to}
            aria-valuetext={rangeLabel(shown.to, shown.to, { unit, short })}
            title="Чирж тохируулна (эсвэл ← → товчоор)"
            onKeyDown={onKeyDown('to')}
            className={handleCls}
            style={{ left: `${pt}%` }}
          />
        </div>
      </div>

      {/* ---- ③ Түргэн сонгох хүрээнүүд (нэг дарж — eBay-ийн «Under ₮…») ---- */}
      {picks.length > 0 && (
        <div className="grid grid-cols-2 gap-1">
          {picks.map((p) => {
            const on = shown.from === p.from && shown.to === p.to;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={on}
                data-quick-pick={p.key}
                onClick={() => commit(p)}
                className={`rounded-md border px-1.5 py-1 text-[11px] font-semibold leading-tight transition ${
                  on
                    ? 'border-primary bg-primary text-white'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-primary/60 hover:text-primary'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
