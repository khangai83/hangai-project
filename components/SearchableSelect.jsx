'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * 🔎 ХАЙЛТТАЙ СОНГОЛТ (combobox) — урт жагсаалтаас ХАЙЖ олох + ГАРААР БИЧИХ.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-09-27, хэрэглэгчийн хүсэлт):
 *   «Суудлын машин сонгоод брэндээс хайж олох төвөгтэй байдлыг шийдэж, мөн
 *    гараас хайх боломжтой болгож болох уу».
 *
 * 🔴 АСУУДАЛ (хуучин): `<select>` дотор **95+ автомашины брэнд** (`CAR_BRANDS`)
 *    байсан тул хэрэглэгч:
 *      • гүйлгэж (scroll) хайх — мобайл дээр ялангуяа төвөгтэй ✗
 *      • «toyota» гэж жижиг үсгээр/бүрэн бус бичих — БОЛОМЖГҮЙ ✗
 *      • жагсаалтад байхгүй брэндээ бичих — БОЛОМЖГҮЙ ✗
 *
 * ✅ ШИЙДЭЛ: бичнэ → жагсаалт ШУУД шүүгдэнэ (case-insensitive) → Enter/дарж
 *    сонгоно. Олдоогүй бол «🔍 «…» гэж хайх» мөрийг дарж ТҮҮХИЙ утгаа
 *    (гараар бичсэн) хэрэглэнэ — `lib/queries.js` нь `searchable` талбарт
 *    `ilike %…%` хийдэг тул бүрэн бус бичлэг ч заруудыг ОЛНО ✓
 *
 * @param {object} props
 * @param {string} props.value              Одоогийн утга ('' = шүүлт тавиагүй)
 * @param {(v: string) => void} props.onChange  Утга солигдоход ('' = цэвэрлэх)
 * @param {string[]} props.options          Сонголтуудын жагсаалт (урт байж болно)
 * @param {string} [props.placeholder]      Хоосон үеийн текст
 * @param {string} [props.ariaLabel]        Дэлгэц уншигчид зориулсан нэр
 * @param {boolean} [props.allowFreeText=true] Жагсаалтад БАЙХГҮЙ утгыг бичихийг зөвшөөрөх
 * @param {boolean} [props.commitOnType=false]
 *   ⚠️ `true` (форм дотор) — бичих БҮРД `onChange` дуудагдана (сервер рүү
 *      ямар ч query явахгүй тул аюулгүй ✓).
 *   ⚠️ `false` (шүүлт) — ЗӨВХӨН сонгох/Enter/blur үед л `onChange` дуудагдана.
 *      Эс бөгөөс үсэг бүрт жагсаалтын query явж, сүлжээ дэмий ачаална ✗
 * @param {number} [props.maxVisible=60]    Дээд тал нь хэдэн мөр харуулах
 * @param {string} [props.className='form-input'] Оролтын CSS класс (`form-input`)
 */
export default function SearchableSelect({
  value = '',
  onChange,
  options = [],
  placeholder = '',
  ariaLabel = '',
  allowFreeText = true,
  commitOnType = false,
  maxVisible = 60,
  className = 'form-input',
}) {
  const [text, setText] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1); // ↑↓ товчоор гүйлгэсэн мөрийн дугаар
  const boxRef = useRef(null);
  const listId = useId();

  /**
   * ⚠️ Гаднаас утга солигдвол (чип ✕ дарах, «Хайлтыг цэвэрлэх», URL-аас
   *    ирсэн хуучин шүүлт) текстийг ЗААВАЛ синхрончилно — эс бөгөөс талбар нь
   *    хуучин утгаа харуулж, хэрэглэгч шүүлт тавигдсаныг мэдэхгүй ✗
   *    (бичиж байх үед `value` хөндөгдөхгүй тул давталт үүсэхгүй ✓).
   */
  useEffect(() => { setText(value || ''); }, [value]);

  const q = text.trim().toLowerCase();

  /** Бичсэн текстээр шүүсэн сонголтууд (жижиг/том үсэг ЯЛГАХГҮЙ) */
  const filtered = useMemo(() => {
    if (!q) return options.slice(0, maxVisible);
    return options
      .filter((o) => String(o).toLowerCase().includes(q))
      .slice(0, maxVisible);
  }, [options, q, maxVisible]);

  const hasExact = useMemo(
    () => options.some((o) => String(o).toLowerCase() === q),
    [options, q]
  );

  /**
   * Мөрүүд — эхний мөр нь «гараар бичсэн» утга (зөвхөн жагсаалтад ЯГ ТААРАХГҮЙ
   * үед). Учир нь хэрэглэгч шинэ брэнд бичиж болно (ж: «Zeekr»).
   */
  const rows = useMemo(() => {
    const out = filtered.map((o) => ({ value: String(o), label: String(o) }));
    if (allowFreeText && q && !hasExact) {
      out.unshift({ value: text.trim(), label: `🔍 «${text.trim()}» гэж хайх`, free: true });
    }
    return out;
  }, [filtered, allowFreeText, q, hasExact, text]);

  // Гадна дарахад хаана (ховор алдаа: dropdown нээлттэй үлдэх)
  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  /** Утга сонгох/цэвэрлэх — ⚠️ давхар `onChange` дуудахгүй (тэнцүү бол алгасна) */
  const commit = (next) => {
    const v = next || '';
    setText(v);
    setOpen(false);
    setHi(-1);
    if ((value || '') !== v) onChange(v);
  };

  const onInput = (e) => {
    const v = e.target.value;
    setText(v);
    setOpen(true);
    setHi(-1);
    // ⚠️ Форм дотор (commitOnType) шууд хадгална — шүүлтэд (false) хүлээнэ
    if (commitOnType) onChange(v);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) { setOpen(true); return; }
      setHi((h) => {
        const n = rows.length;
        if (!n) return -1;
        const dir = e.key === 'ArrowDown' ? 1 : -1;
        const next = h + dir;
        if (next < 0) return n - 1;
        if (next >= n) return 0;
        return next;
      });
      return;
    }
    if (e.key === 'Enter') {
      // ⚠️ Форм дотор Enter нь «Хадгалах»-ыг дарахгүйн тулд ЗААВАЛ зогсооно
      e.preventDefault();
      if (open && hi >= 0 && rows[hi]) commit(rows[hi].value);
      else commit(text.trim());
      return;
    }
    if (e.key === 'Escape') { setOpen(false); setHi(-1); }
  };

  /**
   * ⚠️ 2026-10-01: `!pl-9` / `!pr-10` — `!` (important) ЗААВАЛ байх ёстой!
   *    Форм дотор (`AddListingClient`) энэ оролт нь `.form-group`-ийн дотор
   *    байрладаг ба `app/globals.css`-ийн
   *    `.form-group :is(input, select, textarea):not([type="checkbox"]):not([type="radio"])`
   *    дүрэм нь specificity (0,3,1) — энгийн `pl-8` (0,1,0)-ыг ДАВЖ,
   *    `padding-left`-ыг 0.75rem (12px) болгочихдог байв → 🔎 дүрс (left-3 =
   *    12px) нь бичсэн текстийн ЭХНИЙ ҮСЭГТЭЙ ЯГ ДАВХАРДАЖ байв ✗
   *    (хэрэглэгчийн гомдол: «🔎 нь text-ийнхээ эхний үсэгтэй давхардаад байна»).
   *    `!pl-9` (2.25rem = 36px) нь дүрсний дараа ~8px зай үлдээнэ ✓
   *    (ижил шалтгаанаар цэвэрлэх ✕ товчны зай нь `!pr-10` = 40px ✓)
   */
  const inputClass = `${className} !pl-9 ${text ? '!pr-10' : ''}`;

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-gray-400"
        >
          🔎
        </span>
        <input
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          autoComplete="off"
          className={inputClass}
          placeholder={placeholder}
          value={text}
          onChange={onInput}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            // ⚠️ Шүүлт горимд: гадна дарж/товч дарахад бичсэнээ ХҮЧИНТЭЙ болгоно
            //    (Enter дарахыг мартахад ч ажиллана ✓)
            if (commitOnType) return;
            if (text.trim() !== (value || '')) commit(text.trim());
          }}
        />
        {text && (
          <button
            type="button"
            aria-label="Арилгах"
            onClick={() => commit('')}
            className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-[14px] text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-card"
        >
          {rows.length === 0 && (
            <p className="px-3 py-2 text-[14px] text-gray-500">Олдсонгүй — өөр үсгээр бичнэ үү</p>
          )}
          {rows.map((r, i) => {
            const on = r.value === value;
            return (
              <button
                key={`${r.value}-${i}`}
                type="button"
                role="option"
                aria-selected={on}
                // ⚠️ `preventDefault` — input-ийн focus алдагдахгүй тул
                //    `onBlur`-ийн commit нь даралтыг дарж чадахгүй ✓
                onMouseDown={(e) => { e.preventDefault(); commit(r.value); }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[14px] transition ${
                  i === hi
                    ? 'bg-primary-light text-primary-dark'
                    : r.free
                      ? 'font-medium text-primary hover:bg-gray-50'
                      : 'text-gray-800 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{r.label}</span>
                {on && <span aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
