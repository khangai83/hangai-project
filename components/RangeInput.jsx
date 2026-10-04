'use client';

import { useEffect, useState } from 'react';
import {
  formatGroupedInput, isRangeActive, parseNum, rangeLabel, toFilterPair,
} from '../lib/rangeFilter.mjs';

/**
 * 🔢 RangeInput — «ДООД / ДЭЭД» ХОС ТООН ОРОЛТ (2026-09-30, гурав дахь эргэлт).
 *
 * ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (ЧУХАЛ): «энэ дээд доод үнэ, талбай дээр чирдэгээ
 *    больё, харин оруул байгаа тоог цэгээр тусгаарладаг болгоод өгчих»
 *    → өмнөх 🎚 чирдэг хүрээ (`RangeSlider`, commit `f326ca0`) БҮРЭН ХАСАГДАВ:
 *      зам/толгой/handle/pointerCapture байхгүй — зөвхөн ХОЁР ОРОЛТ ✓
 *    → оруулж байгаа тоо нь БИЧИХ ЯВЦАД нь цэгээр тусгаарлагдана:
 *      «3000000» → «3.000.000» (`formatGroupedInput` — цэвэр логик нь
 *      `lib/rangeFilter.mjs`, тестээр түгжсэн ✓)
 *
 * ⚠️ 2026-09-30 (3) — хэрэглэгчийн хүсэлт: «Орон сууц хайлтын **Үнэ** дээр
 *    эхлэх дуусах биш **Дээд Доод** гэе. Бас тэр доор нь санал болгоод байгаа
 *    тоог байхгүй болго»:
 *      ① 🏷 ШОШГО: «Эхлэх / Дуусах» → **«Доод / Дээд»** (placeholder ба
 *         aria-label ХОЁУЛАА; CDP-ээр DOM дээр батлагдсан ✓)
 *         ⚠️ ЗҮҮН тал нь `from` = ХАМГИЙН БАГА үнэ (`price=gte.…`),
 *            БАРУУН тал нь `to` = ХАМГИЙН ИХ үнэ (`price=lte.…`) — утгын
 *            утга ХЭВЭЭР, зөвхөн ШОШГО солигдов ✓
 *      ② 🗑 Оролтын доорх «түргэн хүрээ» 4 тоон товч (`₮25 сая хүртэл` …)
 *         БҮРЭН ХАСАГДАВ — `priceQuickPicks()` ба `quickPicks` проп ч хамт
 *         (өөр хэрэглэгч байхгүй байв). Одоо оролтын доор ЗӨВХӨН шүүлт
 *         идэвхтэй үеийн уншигдах шошго + `✕ арилгах` гарна ✓
 *         ⇒ Sidebar нь 2 мөр тоон оролт + (идэвхтэй үед) 1 мөр шошго —
 *           «санал болгосон тоо» ямар ч хэлбэрээр БАЙХГҮЙ ✓
 *
 * ⚠️ ЯАГААД ХҮРЭЭГ ТООНЫ ОРЛОТ ХЭВЭЭР Л БАЙЛГАВ:
 *    ① Гараар «1.250.000» гэж бичих нь чирэхээс ХУРДАН бөгөөд ЯГ ТАГ утга
 *       өгнө (слайдер нь «2.950.000» гэх мэт дугуй бус утга руу чирдэг) ✓
 *    ② Мобайл дээр чирэх нь хуудас гүйлгэх/сонгохтой мөргөлддөг байв ✗
 *    ③ a11y: текст оролт нь ямар ч браузер/дэлгэц уншигчид дэмжигдэнэ ✓
 *
 * ⚠️ ШҮҮЛТ БИЧИХ ЯВЦАД ЯВАХГҮЙ:
 *    ⏎ (Enter) эсвэл талбараас ГАРАХ үед (blur) л `onChange` дуудагдана —
 *    эс бөгөөс «250000000» бичихэд 9 query явж, DB дэмий ачаалагдана ✗
 *    (`components/TextFilter.jsx`-ийн адил дүрэм ✓)
 * ⚠️ Esc → бичсэнээ БОЛИХ (өмнөх утга буцна); ✕ → шүүлтийг бүрэн арилгана
 *    (зөвхөн шүүлт идэвхтэй үед харагдана)
 * ⚠️ ХИЛ (`bounds`) нь ЗӨВХӨН «хязгааргүй ТАЛ»-ыг тодорхойлоход хэрэглэгдэнэ —
 *    тухайн талын утга хилтэйгээ тэнцвэл `''` (шүүлт БАЙХГҮЙ), мөн хоосон
 *    оролтын уншигдах шошгыг бодоход ✓; хэрэглэгчийн бичсэн утгыг ХЭЗЭЭ Ч
 *    хязгаарлахгүй (ж: 5 тэрбумын хил дээр 6 тэрбум бичиж болно ✓)
 *
 * @param {object} props
 * @param {string} props.label      Блокийн нэр (aria-label-д)
 * @param {string} props.from       Одоогийн доод хязгаар (`''` = хязгааргүй)
 * @param {string} props.to         Одоогийн дээд хязгаар (`''` = хязгааргүй)
 * @param {(from:string, to:string)=>void} props.onChange Commit (шүүлт тавих)
 * @param {{min:number,max:number}} props.bounds Анхдагч хил
 * @param {string} [props.unit]     Нэгж: `'₮'`, `'м²'`, `'он'`
 * @param {'int'|'decimal'|'year'} [props.mode] Оролтын төрөл
 * @param {(n:number)=>string} [props.short] Шошго форматлагч (`shortPrice`) —
 *        зөвхөн ИДЭВХТЭЙ шүүлтийн уншигдах хүрээг бодоход (товч БАЙХГҮЙ ✓)
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
}) {
  /** Зөвхөн энэ хоёр талын бичсэн текст (`null` = бичихгүй, гаднаас удирдана) */
  const [typing, setTyping] = useState(null);

  /**
   * ⚠️ Гаднаас утга солигдвол (chip ✕, «Хайлтыг цэвэрлэх», URL-аас ирсэн
   *    шүүлт) бичсэн текстийг ЗААВАЛ арилгана — эс бөгөөс
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
          placeholder="Доод"
          aria-label={`${label} (доод хязгаар)`}
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
          placeholder="Дээд"
          aria-label={`${label} (дээд хязгаар)`}
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
          <span className="text-[13px] font-bold text-gray-600" data-range-label>{hint}</span>
          <button
            type="button"
            onClick={clear}
            data-range-clear={label}
            aria-label={`${label}: шүүлтийг арилгах`}
            className="rounded-md px-1 text-[12.5px] font-bold text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            ✕ арилгах
          </button>
        </div>
      )}
    </div>
  );
}

