'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  formatGroupedInput, isRangeActive, parseNum, priceQuickPicks, rangeLabel, toFilterPair,
} from '../lib/rangeFilter.mjs';

/**
 * 🔢 RangeInput — «ДООД / ДЭЭД» ХОС ТООН ОРОЛТ (2026-09-30, хоёр дахь эргэлт).
 *
 * ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (ЧУХАЛ): «энэ дээд доод үнэ, талбай дээр чирдэгээ
 *    больё, харин оруул байгаа тоог цэгээр тусгаарладаг болгоод өгчих»
 *    → өмнөх 🎚 чирдэг хүрээ (`RangeSlider`, commit `f326ca0`) БҮРЭН ХАСАГДАВ:
 *      зам/толгой/handle/pointerCapture байхгүй — зөвхөн ХОЁР ОРОЛТ ✓
 *    → оруулж байгаа тоо нь БИЧИХ ЯВЦАД нь цэгээр тусгаарлагдана:
 *      «3000000» → «3.000.000» (`formatGroupedInput` — цэвэр логик нь
 *      `lib/rangeFilter.mjs`, тестээр түгжсэн ✓)
 *
 * ⚠️ ЯАГААД ХҮРЭЭГ ТООНЫ ОРЛОТ ХЭВЭЭР Л БАЙЛГАВ:
 *    ① Гараар «1.250.000» гэж бичих нь чирэхээс ХУРДАН бөгөөд ЯГ ТАГ утга
 *       өгнө (слайдер нь «2.950.000» гэх мэт дугуй бус утга руу чирдэг) ✓
 *    ② Мобайл дээр чирэх нь хуудас гүйлгэх/сонгохтой мөргөлддөг байв ✗
 *    ③ a11y: текст оролт нь ямар ч браузер/дэлгэц уншигчид дэмжигдэнэ ✓
 *    ⚠️ 4 «түргэн хүрээ» товч (₮-д) ХЭВЭЭР — тэр нь чирэх биш, НЭГ ДАРЖ
 *       сонгох товч тул хэрэглэгчийн хүсэлтэд харшилдахгүй ✓ (eBay-ийн
 *       «Under ₮…» мөртэй ижил)
 *
 * ⚠️ ШҮҮЛТ БИЧИХ ЯВЦАД ЯВАХГҮЙ:
 *    ⏎ (Enter) эсвэл талбараас ГАРАХ үед (blur) л `onChange` дуудагдана —
 *    эс бөгөөс «250000000» бичихэд 9 query явж, DB дэмий ачаалагдана ✗
 *    (`components/TextFilter.jsx`-ийн адил дүрэм ✓)
 * ⚠️ Esc → бичсэнээ БОЛИХ (өмнөх утга буцна); ✕ → шүүлтийг бүрэн арилгана
 *    (зөвхөн шүүлт идэвхтэй үед харагдана)
 * ⚠️ ХИЛ (`bounds`) нь ЗӨВХӨН түргэн хүрээг бодох ба «хязгааргүй» талыг
 *    тодорхойлоход хэрэглэгдэнэ — хэрэглэгчийн бичсэн утгыг ХЭЗЭЭ Ч
 *    хязгаарлахгүй ✓ (ж: 5 тэрбумын хил дээр 6 тэрбум бичиж болно)
 *
 * @param {object} props
 * @param {string} props.label      Блокийн нэр (aria-label-д)
 * @param {string} props.from       Одоогийн доод хязгаар (`''` = хязгааргүй)
 * @param {string} props.to         Одоогийн дээд хязгаар (`''` = хязгааргүй)
 * @param {(from:string, to:string)=>void} props.onChange Commit (шүүлт тавих)
 * @param {{min:number,max:number,step:number}} props.bounds Анхдагч хил
 * @param {string} [props.unit]     Нэгж: `'₮'`, `'м²'`, `'он'`
 * @param {'int'|'decimal'|'year'} [props.mode] Оролтын төрөл
 * @param {(n:number)=>string} [props.short] Товч форматлагч (`shortPrice`)
 * @param {boolean} [props.quickPicks] Түргэн сонгох хүрээнүүд (₮-д тохирно)
 */
export default function RangeInput({
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
  /** Зөвхөн энэ хоёр талын бичсэн текст (`null` = бичихгүй, гаднаас удирдана) */
  const [typing, setTyping] = useState(null);

  /**
   * ⚠️ Гаднаас утга солигдвол (chip ✕, «Хайлтыг цэвэрлэх», URL-аас ирсэн
   *    шүүлт, түргэн хүрээ) бичсэн текстийг ЗААВАЛ арилгана — эс бөгөөс
   *    талбарт хуучин тоо үлдэж, хэрэглэгч шүүлт арилсныг мэдэхгүй ✗
   */
  useEffect(() => { setTyping(null); }, [from, to]);

  /** Тухайн талын ХАРАГДАХ текст (бичиж байгаа бол бичсэн нь) */
  const textOf = (side) => {
    if (typing && typing[side] !== undefined) return typing[side];
    return formatGroupedInput(side === 'from' ? from : to, { mode });
  };

  /** Бичих — утга нь ШУУД бүлэглэгдэнэ («3000000» → «3.000.000») */
  const onInput = (side) => (e) => {
    const v = formatGroupedInput(e.target.value, { mode });
    setTyping((t) => ({ ...(t || {}), [side]: v }));
  };

  /**
   * ⏎ / blur → ШҮҮЛТ ХҮЧИНТЭЙ болно (нэг л commit — нэг query ✓).
   * ⚠️ Хоосон тал = «хязгааргүй» → `bounds.min` / `bounds.max` →
   *    `toFilterPair()` нь `''` буцаана (URL/DB цэвэр) ✓
   * ⚠️ «from > to» гэж буруу бичвэл дээд талыг өргөж ЗАСНА — эс бөгөөс
   *    `price >= 5000000 AND price <= 1000000` гэсэн ХООСОН query явна ✗
   */
  const commit = () => {
    if (!typing) return;
    const rawFrom = typing.from !== undefined ? typing.from : from;
    const rawTo = typing.to !== undefined ? typing.to : to;
    const f = parseNum(rawFrom);
    const t = parseNum(rawTo);
    const lo = f === null ? bounds.min : f;
    const hi = t === null ? bounds.max : t;
    const pair = toFilterPair(lo, Math.max(lo, hi), bounds);
    setTyping(null);
    // ⚠️ Ижил утгад дахин `onChange` дуудахгүй (дэмий query явуулахгүй ✓)
    if (pair.from !== (from || '') || pair.to !== (to || '')) onChange(pair.from, pair.to);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); return; }
    // Esc → бичсэнээ болиод хадгалагдсан утга руу буцна
    if (e.key === 'Escape') { e.preventDefault(); setTyping(null); }
  };

  /** ✕ — хоёр талыг НЭГ дор арилгана (шүүлт байхгүй болно) */
  const clear = () => { setTyping(null); onChange('', ''); };

  /** ₮-ийн 4 түргэн хүрээ — НЭГ ДАРЖ сонгоно (идэвхтэйг дарахад арилна) */
  const picks = useMemo(
    () => (quickPicks ? priceQuickPicks(bounds, short || ((n) => String(n))) : []),
    [quickPicks, bounds, short]
  );
  const curFrom = from || '';
  const curTo = to || '';
  const isPickOn = (p) => {
    const f = toFilterPair(p.from, p.to, bounds);
    return f.from === curFrom && f.to === curTo;
  };

  const active = isRangeActive(from, to);
  /** Шүүлт идэвхтэй үед л уншигдах шошго харуулна (хоосон үед дуу чимээ) */
  const hint = active
    ? rangeLabel(parseNum(from) ?? bounds.min, parseNum(to) ?? bounds.max, { unit, short })
    : '';

  return (
    <div className="flex flex-col gap-1.5" data-range-filter={label}>
      {/* ---- ① Гараар бичих хос оролт (тоо нь ЦЭГЭЭР тусгаарлагдана) ---- */}
      <div className="flex items-center gap-2">
        <input
          className="form-input"
          type="text"
          autoComplete="off"
          inputMode={mode === 'decimal' ? 'decimal' : 'numeric'}
          placeholder="Эхлэх"
          aria-label={`${label} (эхлэх)`}
          data-range-input="from"
          value={textOf('from')}
          onChange={onInput('from')}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
        <input
          className="form-input"
          type="text"
          autoComplete="off"
          inputMode={mode === 'decimal' ? 'decimal' : 'numeric'}
          placeholder="Дуусах"
          aria-label={`${label} (дуусах)`}
          data-range-input="to"
          value={textOf('to')}
          onChange={onInput('to')}
          onBlur={commit}
          onKeyDown={onKeyDown}
        />
      </div>

      {/* ---- ② Шүүлт идэвхтэй үед: уншигдах хүрээ + ✕ арилгах ---- */}
      {active && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] font-bold text-gray-600" data-range-label>{hint}</span>
          <button
            type="button"
            onClick={clear}
            data-range-clear={label}
            aria-label={`${label}: шүүлтийг арилгах`}
            className="rounded-md px-1 text-[11px] font-bold text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            ✕ арилгах
          </button>
        </div>
      )}

      {/* ---- ③ ₮-ийн түргэн хүрээнүүд (нэг дарж — eBay-ийн «Under ₮…») ---- */}
      {picks.length > 0 && (
        <div className="grid grid-cols-2 gap-1">
          {picks.map((p) => {
            const on = isPickOn(p);
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={on}
                data-quick-pick={p.key}
                onClick={() => {
                  const f = toFilterPair(p.from, p.to, bounds);
                  // ⚠️ Идэвхтэй товчийг дахин дарвал шүүлт АРИЛНА (toggle —
                  //    бусад чипүүдтэй нэг дүрэм ✓)
                  if (on) onChange('', '');
                  else onChange(f.from, f.to);
                }}
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

