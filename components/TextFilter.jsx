'use client';

import { useEffect, useState } from 'react';

/**
 * ✍️ ХАЙЛТТАЙ ТЕКСТ ШҮҮЛТ — sidebar-д бичиж хайдаг талбар (`ilike %…%`).
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-09-28, хэрэглэгчийн хүсэлт):
 *   «Автомашины хайлт дээр загварыг оруул».
 *
 * 🔴 АСУУДАЛ: 🚙 Загвар нь `attrFields`-д байсан ч `attrFilters`-д ОРООГҮЙ
 *    байв → хэрэглэгч «Prius» гэж хайх боломжгүй, зөвхөн брэндээр шүүх ✗
 * ✅ ШИЙДЭЛ: Загвар нь ТОГТМОЛ ЖАГСААЛТ БИШ (95 брэнд × олон загвар — 1000+)
 *    тул `SearchableSelect` (dropdown) тохирохгүй. Харин чөлөөт текст
 *    шүүлт хэрэгтэй: бичнэ → `lib/queries.js` нь `attrs->>model ilike %prius%`
 *    болгож, «Prius 30», «Prius 20» бүгдийг ОЛНО ✓
 *
 * ⚠️ Утга нь ⏎ (Enter) эсвэл талбараас ГАРАХ үед (blur) л хүчинтэй болно —
 *    эс бөгөөс үсэг бүрт `fetchListings()` query явж, сүлжээ дэмий ачаална ✗
 *    (`SearchableSelect`-ийн шүүлт горимтой ижил зарчим ✓)
 * ⚠️ Esc → бичсэнээ БОЛИХ (өмнөх утга руу буцна); ✕ → шүүлтийг бүрэн арилгана
 *
 * @param {object} props
 * @param {string} props.value                    Одоогийн утга ('' = шүүлтгүй)
 * @param {(v: string) => void} props.onChange    Утга хүчинтэй болоход ('' = цэвэрлэх)
 * @param {string} [props.placeholder]            Хоосон үеийн текст
 * @param {string} [props.ariaLabel]              Дэлгэц уншигчид зориулсан нэр
 * @param {string} [props.type='text']            `'number'` ч байж болно
 * @param {string} [props.className='form-input'] Оролтын CSS класс
 */
export default function TextFilter({
  value = '',
  onChange,
  placeholder = '',
  ariaLabel = '',
  type = 'text',
  className = 'form-input',
}) {
  const [text, setText] = useState(value || '');

  /**
   * ⚠️ Гаднаас утга солигдвол (чип ✕, «Хайлтыг цэвэрлэх», URL-аас ирсэн шүүлт)
   *    текстийг ЗААВАЛ синхрончилно — эс бөгөөс талбарт хуучин утга үлдэж,
   *    хэрэглэгч шүүлт арилсаныг мэдэхгүй ✗
   */
  useEffect(() => { setText(value || ''); }, [value]);

  /** Утга хүчинтэй болгох — ⚠️ ижил утгад дахин `onChange` дуудахгүй */
  const commit = (next) => {
    const v = String(next || '').trim();
    setText(v);
    if (v !== (value || '')) onChange(v);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter') {
      // ⚠️ Форм дотор Enter нь «Хадгалах»-ыг дарахгүйн тулд зогсооно
      e.preventDefault();
      commit(text);
      return;
    }
    if (e.key === 'Escape') setText(value || '');
  };

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-gray-400"
      >
        🔎
      </span>
      <input
        type={type}
        aria-label={ariaLabel}
        autoComplete="off"
        className={`${className} pl-8 ${text ? 'pr-8' : ''}`}
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        // ⚠️ Гадна дарж/товч дарахад бичсэнээ ХҮЧИНТЭЙ болгоно (Enter-ийг
        //    мартахад ч ажиллана ✓) — `SearchableSelect`-ийн шүүлт режимтэй ижил
        onBlur={() => commit(text)}
      />
      {text && (
        <button
          type="button"
          aria-label="Шүүлтийг цэвэрлэх"
          // ⚠️ `onMouseDown` + `preventDefault` — дарах үед focus алдагдахгүй
          //    тул blur нь даралтыг дарж чадахгүй ✓ (combobox-той ижил)
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => commit('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 text-[14px] text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          ✕
        </button>
      )}
    </div>
  );
}
