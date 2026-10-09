'use client';

import { useEffect, useMemo, useState } from 'react';
import { CITIES, getDistricts, getKhoroos, getKhoroosForDistricts } from '../lib/locationData';
// 🗺 Дүүрэг нэмэх/хасах ДҮРЭМ (2026-10-04 (28)) — 2026-10-03-аас хойш цорын
//    ГАНЦ эх сурвалж (`HomeClient`-ийн хуучин `toggleDistrict` ч үүнийг
//    дууддаг байв). Сайдбарын чипүүд хасгдаж, сонголт БҮХЭН энэ пикер рүү
//    шилжсэн ч дүрэм (шинэ массив · хоосон утгыг алгасах · давхцуулахгүй)
//    ХЭВЭЭР — URL (`?district=…`), DB (`district=in.(…)`) хоёулаа ижил ✓
import { toggleDistrictValue } from '../lib/districtFilter.mjs';

/* ============================================================
   📍 БАЙРШЛЫН ПИКЕР (modal) — 2026-10-04 (27)
   ------------------------------------------------------------
   ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (жишээ зурагтай): «Бүх байршил хэсэгт байршилаа
   солих боломжтой болго» — толгойн мөр дэх «📍 Бүх байршил» товч дарахад
   `жишиг сайт`-ийн «Байршлаа сонгоно уу» цонх шиг КАСКАД (Хот/Аймаг →
   Дүүрэг → Хороо) сонголттой цонх нээгдэнэ ✓.

   ⚠️ Утгын загвар нь HomeClient-ийн `filters`-тэй ЯГ ИЖИЛ:
        { city: string, districts: string[], khoroos: string[] }
      • `city`      — НЭГ (радио) сонголт
      • `districts` — ОЛОН (checkbox) — апп-д аль хэдийн олон дүүрэг дэмжигддэг ✓
      • `khoroos`   — ОЛОН (checkbox) — `getKhoroosForDistricts`-ийн НЭГДЭЛ
      ⇒ тусдаа логик БИШ — `lib/locationData.js` (нэг эх сурвалж) ашиглана ✓

   ⚠️ Утгууд нь ЗӨВХӨН НООРОЙ (draft) дээр солигдоно; «Байршлыг хэрэглэх»
      дарахад л `onApply(draft)` дуудагдаж, эцэг (HomeClient) `filters`-ээ
      шинэчилнэ ✓ (талбарыг хаах/ESC дарахад ХӨНДӨГДӨХГҮЙ ✓)
   ============================================================ */

/** Нэг сонголтын мөр (радио — зөвхөн хотод) */
function RadioRow({ label, active, arrow, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[15px] transition ${
        active ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[12px] ${
          active ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white'
        }`}
      >
        {active ? '✓' : ''}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {arrow && <span aria-hidden="true" className="shrink-0 text-gray-400">›</span>}
    </button>
  );
}

/**
 * Олон сонголтын мөр (checkbox — дүүрэг/хороо).
 * @param {string} [hook] · @param {string} [hookValue] — CDP дэгээ (2026-10-04
 *   (28)): `data-district-value` (дүүрэг) / `data-khoroo-value` (хороо).
 *   ⚠️ ХОРООНЫ дэгээ ЗААВАЛ хэрэгтэй — хуучин `scripts/cdp-districts.mjs`
 *      нь хорооны мөрийг ЗӨВХӨН текстээр (`/хороо$/`) олдог байв. Одоо
 *      пикер дээр дүүргийн мөр ч, чип ч байгаа тул текстээр ялгах боломжгүй ✗
 */
function CheckRow({ label, checked, onClick, hook, hookValue }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      {...(hook && hookValue != null ? { [hook]: hookValue } : {})}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[15px] transition ${
        checked ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border text-[13px] ${
          checked ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white'
        }`}
      >
        {checked ? '✓' : ''}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}

/** Сонгосон утгын чип (✕ дарж хасна) */
function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-3 py-1.5 text-[14px] font-medium text-white">
      {label}
      <button type="button" aria-label={`${label} — арилгах`} onClick={onRemove} className="text-white/80 hover:text-white">✕</button>
    </span>
  );
}

/**
 * 📱 МОБАЙЛ (<640px) DRILL-DOWN — ХОТ/АЙМГИЙН мөр (радио + `›` — дотор орох).
 * ⚠️ `data-mobile-city` — CDP-ийн дүүргийн дэгээг (`data-district-value`)
 *    ДАВХАР тоолохгүйн тулд ТУСДАА нэршил (`AddListingClient.jsx`-ийн ЯГ
 *    ИЖИЛ арга ✓; тэнд `data-mobile-option` нь `data-picker`-ыг хөндөхгүй ✓)
 */
function MobileCityRow({ label, active, hasChildren, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      data-mobile-city={label}
      className="flex w-full items-center gap-3 border-b border-gray-100 px-1 py-3 text-left text-[15px] last:border-b-0"
    >
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[12px] ${
          active ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white'
        }`}
      >
        {active ? '✓' : ''}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hasChildren && <span aria-hidden="true" className="shrink-0 text-gray-300">›</span>}
    </button>
  );
}

/**
 * 📱 МОБАЙЛ DRILL-DOWN — ОЛОН СОНГОЛТТОЙ мөр (дүүрэг/хороо).
 *
 * ⚠️ `жишиг сайт`-ийн ЯГ ИЖИЛ ХОЁР ХҮРЭХ ЦЭГ (хороотой дүүрэг дээр):
 *   • ЗҮҮН checkbox (жижиг) — ЗӨВХӨН сонгох/хасах (`aria-pressed`)
 *   • НЭР + `›` (мөрийн ихэнх) — ДОТОР ОРОХ (хорооны дэлгэц рүү)
 * ⚠️ ЯАГААД (2026-10-04 (30) хэрэглэгчийн гомдол): «гар утсаас хороо нь
 *    гарч ирэхгүй байх юм» — өмнө нь ЗӨВХӨН жижиг `›` дарж байж хороо
 *    гардаг байв. Хэрэглэгч НЭРИЙГ дарсан тул зөвхөн checkbox солигдож,
 *    хорооны дэлгэц НЭЭГДЭХГҮЙ байв ✗ ⇒ одоо НЭР дархад л дотор орно ✓
 * ⚠️ NESTED `<button>` ХОРИОТОЙ тул мөр нь `<div>` дотор 2 `<button>` ✓
 * ⚠️ Хорооны мөрөнд (`onDrill` БАЙХГҮЙ) БҮТЭН мөр нь нэг товч (сонгох) ✓
 */
function MobileRow({ label, checked, onToggle, onDrill, hook, hookValue }) {
  const hooks = hook && hookValue != null ? { [hook]: hookValue } : {};
  const box = (
    <span
      aria-hidden="true"
      className={`grid h-5 w-5 shrink-0 place-items-center rounded-[5px] border text-[13px] ${
        checked ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 bg-white'
      }`}
    >
      {checked ? '✓' : ''}
    </span>
  );
  if (!onDrill) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        {...hooks}
        className="flex w-full items-center gap-3 border-b border-gray-100 px-1 py-3 text-left text-[15px] last:border-b-0"
      >
        {box}
        <span className="min-w-0 flex-1 truncate">{label}</span>
      </button>
    );
  }
  return (
    <div className="flex items-center border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        {...hooks}
        aria-label={`${label} — сонгох`}
        className="grid shrink-0 place-items-center px-1 py-3"
      >
        {box}
      </button>
      <button
        type="button"
        onClick={onDrill}
        aria-label={`${label} — хороо руу орох`}
        className="flex min-w-0 flex-1 items-center gap-2 px-1 py-3 text-left text-[15px]"
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <span aria-hidden="true" className="shrink-0 text-gray-300">›</span>
      </button>
    </div>
  );
}

export default function LocationPicker({ open, onClose, city, districts, khoroos, onApply }) {
  const [draftCity, setDraftCity] = useState(city || '');
  const [draftDistricts, setDraftDistricts] = useState(() => (Array.isArray(districts) ? [...districts] : []));
  const [draftKhoroos, setDraftKhoroos] = useState(() => (Array.isArray(khoroos) ? [...khoroos] : []));
  const [q, setQ] = useState('');
  // 📱 Мобайл (<640px) drill-down-ийн ШАТЛАЛ (2026-10-04 (29)):
  //    'city' → 'district' → 'khoroo' (`mFocus` — хорооны дэлгэцийн ГАРЧИГ:
  //    аль дүүрэг рүү орсон). 🖥 ≥640px дээр ашиглагдахгүй (каскад багана ✓)
  const [mStep, setMStep] = useState('city');
  const [mFocus, setMFocus] = useState('');

  // ⚠️ Нээгдэх БҮРД одоогийн `filters`-ээс ШИНЭ хуулбар авна (өмнөх
  //    «цуцлагдсан» ноорог үлдэхгүй ✓)
  useEffect(() => {
    if (!open) return;
    setDraftCity(city || '');
    setDraftDistricts(Array.isArray(districts) ? [...districts] : []);
    setDraftKhoroos(Array.isArray(khoroos) ? [...khoroos] : []);
    setQ('');
    setMStep('city');
    setMFocus('');
  }, [open, city, districts, khoroos]);

  // ESC → хаах (modal-ийн жишиг зан төлөв ✓)
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const districtOptions = useMemo(() => getDistricts(draftCity), [draftCity]);
  const khorooOptions = useMemo(
    () => getKhoroosForDistricts(draftCity, draftDistricts),
    [draftCity, draftDistricts]
  );

  if (!open) return null;

  const ql = q.trim().toLowerCase();
  const match = (s) => !ql || s.toLowerCase().includes(ql);
  const cityList = CITIES.filter(match);
  const districtList = districtOptions.filter(match);
  const khorooList = khorooOptions.filter(match);

  const pickCity = (c) => {
    if (c === draftCity) { setDraftCity(''); setDraftDistricts([]); setDraftKhoroos([]); return; }
    setDraftCity(c);
    setDraftDistricts([]);
    setDraftKhoroos([]);
  };
  const toggleDistrict = (d) => {
    // ⚠️ Дүрэм нь `lib/districtFilter.mjs → toggleDistrictValue()` — нэг эх
    //    сурвалж (шинэ массив ✓ давхцалгүй ✓ хоосон утга алгасна ✓)
    setDraftDistricts((prev) => toggleDistrictValue(prev, d));
    // ⚠️ Дүүрэг солигдвол хороодын НЭГДЭЛ жагсаалт өөр болно → цэвэрлэнэ
    //    (`HomeClient`-ийн `setF('districts')`-ийн ЯГ ИЖИЛ дүрэм ✓)
    setDraftKhoroos([]);
  };
  const toggleKhoroo = (k) => {
    setDraftKhoroos((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };
  const clearDraft = () => {
    setDraftCity('');
    setDraftDistricts([]);
    setDraftKhoroos([]);
    setMStep('city');
    setMFocus('');
  };

  // 📱 Мобайл (<640px) drill-down (2026-10-04 (29)) — хэрэглэгчийн хүсэлт:
  //    «…нэг нэг хуудсаар оруулдаг болгооч» ⇒ ХОТ сонгоход (дүүрэгтэй бол)
  //    ДАРААГИЙН дэлгэц рүү шилжинэ; дүүргийн `›` дарахад хорооны дэлгэц
  //    рүү орох ба тухайн дүүргийг ЗААВАЛ сонгоно (эс бөгөөс хорооны
  //    жагсаалт хоосон гарна ✗)
  const pickCityMobile = (c) => {
    // ⚠️ ЗӨВХӨН хот СОЛИГДСОН үед дүүрэг/хороог цэвэрлэнэ (`HomeClient`-ийн
    //    `k === 'city'` дүрэмтэй ИЖИЛ ✓). Ижил хот дээр дахин дарахад ноорог
    //    ХЭВЭЭР — зөвхөн дотор нь орох (эс бөгөөс хэрэглэгчийн сонгосон
    //    дүүрэг/хороо санамсаргүй арилна ✗)
    if (c !== draftCity) {
      setDraftCity(c);
      setDraftDistricts([]);
      setDraftKhoroos([]);
    }
    setMFocus('');
    setMStep(getDistricts(c).length > 0 ? 'district' : 'city');
  };
  const openKhorooStep = (d) => {
    if (!draftDistricts.includes(d)) {
      // ⚠️ Дүрэм нь desktop-тай НЭГ (`toggleDistrict`): дүүрэг солигдвол
      //    хорооны НЭГДЭЛ өөр болно → цэвэрлэнэ ✓
      setDraftDistricts((prev) => toggleDistrictValue(prev, d));
      setDraftKhoroos([]);
    }
    setMFocus(d);
    setMStep('khoroo');
  };
  const mobileBack = () => {
    setMStep((s) => (s === 'khoroo' ? 'district' : 'city'));
    setMFocus('');
  };
  const mobileTitle =
    mStep === 'district' ? (draftCity || 'Дүүрэг / Сум')
      : mStep === 'khoroo' ? (mFocus || (draftDistricts.length === 1 ? draftDistricts[0] : 'Хороо'))
        : 'Байршлаа сонгоно уу';

  const apply = () => {
    onApply({ city: draftCity, districts: draftDistricts, khoroos: draftKhoroos });
    onClose();
  };

  const hasSelection = Boolean(draftCity) || draftDistricts.length > 0 || draftKhoroos.length > 0;


  return (
    <div
      className="fixed inset-0 z-[1500] flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Байршлаа сонгоно уу"
      data-location-picker
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="my-2 w-full max-w-[1000px] rounded-2xl bg-white shadow-card-hover">
        {/* ===== ТОЛГОЙ ===== */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            {/* 📱 Мобайл: дээш шатлалд буцах (`<sm` дээр л харагдана ✓) */}
            {mStep !== 'city' && (
              <button
                type="button"
                onClick={mobileBack}
                aria-label="Буцах"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[18px] text-gray-700 transition hover:bg-gray-100 sm:hidden"
              >
                ←
              </button>
            )}
            {/* ⚠️ Гарчиг нь мобайлд ШАТЛАЛААР солигдоно (Хот/Аймаг → Улаанбаатар
                → Хан-Уул); 🖥 ≥640px дээр үргэлж «Байршлаа сонгоно уу» ✓
                ⚠️ ХОЁР `<span>` — `sm:hidden` / `hidden sm:inline` (нэг DOM,
                   зөвхөн CSS-ээр солигдоно — AddListingClient-ийн ИЖИЛ арга ✓) */}
            <h2 className="min-w-0 truncate text-[22px] font-bold text-gray-900">
              <span className="sm:hidden">{mobileTitle}</span>
              <span className="hidden sm:inline">Байршлаа сонгоно уу</span>
            </h2>
          </div>
          <button
            type="button"
            aria-label="Хаах"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[18px] text-gray-500 transition hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="px-5">
          {/* ===== ХАЙЛТЫН ТАЛБАР ===== */}
          <div className="flex items-center gap-2.5 rounded-xl border border-gray-300 px-3.5 py-3 focus-within:border-primary">
            <span aria-hidden="true" className="text-[16px] text-gray-400">🔍</span>
            <label className="sr-only" htmlFor="location-search">Байршлын нэр</label>
            <input
              id="location-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Байршлын нэрийг бичиж эхлээрэй"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>

          {/* ===== СОНГОСОН ЧИПҮҮД ===== */}
          {hasSelection && (
            <div className="mt-3 flex flex-wrap gap-2">
              {draftCity && <Chip label={draftCity} onRemove={clearDraft} />}
              {draftDistricts.map((d) => (
                <Chip key={`d-${d}`} label={d} onRemove={() => toggleDistrict(d)} />
              ))}
              {draftKhoroos.map((k) => (
                <Chip key={`k-${k}`} label={k} onRemove={() => toggleKhoroo(k)} />
              ))}
            </div>
          )}
        </div>


        {/* ===== КАСКАД БАГАНУУД (🖥 ЗӨВХӨН ≥640px) =====
            ⚠️ `hidden … sm:flex` — мобайл (<640px) дээр 3 баганын оронд
               доорх drill-down блок харагдана (2026-10-04 (29) хүсэлт) ✓
            ⚠️ DOM-д ХЭВЭЭР (зөвхөн CSS) — CDP-ийн `[data-district-value]`
               тоо (9) мобайл дээр ч хадгалагдана ✓ */}
        <div className="mt-3 hidden gap-3 border-t border-gray-100 px-5 py-4 sm:flex">
          {/* ① Хот/Аймаг */}
          <div className="flex min-w-0 flex-1 flex-col" data-location-col="city">
            <span className="mb-1 block px-3 text-[13px] font-semibold text-gray-500">Хот / Аймаг</span>
            <div className="max-h-[50vh] overflow-y-auto pr-1">
              {cityList.length === 0 && <p className="px-3 py-2 text-[14px] text-gray-400">Олдсонгүй</p>}
              {cityList.map((c) => (
                <RadioRow
                  key={c}
                  label={c}
                  active={c === draftCity}
                  arrow={getDistricts(c).length > 0}
                  onClick={() => pickCity(c)}
                />
              ))}
            </div>
          </div>

          {/* ② Дүүрэг/Сум
              ⚠️ `data-district-filter` + `role="group"` + `aria-label="Дүүрэг"`
                 нь CDP тестийн (`scripts/cdp-districts.mjs`) дэгээ — 2026-10-04
                 (28)-аас сайдбараас ЭНД шилжсэн (УСТГАХГҮЙ ✓) */}
          {districtOptions.length > 0 && (
            <div
              className="flex min-w-0 flex-1 flex-col border-l border-gray-100 pl-3"
              data-location-col="district"
              data-district-filter
              role="group"
              aria-label="Дүүрэг"
            >
              <span className="mb-1 block px-3 text-[13px] font-semibold text-gray-500">Дүүрэг / Сум</span>
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                {districtList.length === 0 && <p className="px-3 py-2 text-[14px] text-gray-400">Олдсонгүй</p>}
                {districtList.map((d) => (
                  <CheckRow
                    key={d}
                    label={d}
                    checked={draftDistricts.includes(d)}
                    onClick={() => toggleDistrict(d)}
                    hook="data-district-value"
                    hookValue={d}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ③ Хороо (дүүрэг сонгосон үед)
              ⚠️ `data-khoroo-value` — хорооны мөр нь «…хороо» гэж ТӨГСДӨГ тул
                 текстээр ялгах боломжгүй (дүүрэг/чип ч байж болно) ✓ */}
          {districtOptions.length > 0 && draftDistricts.length > 0 && (
            <div className="flex min-w-0 flex-1 flex-col border-l border-gray-100 pl-3" data-location-col="khoroo">
              <span className="mb-1 block px-3 text-[13px] font-semibold text-gray-500">Хороо</span>
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                {khorooList.length === 0 && <p className="px-3 py-2 text-[14px] text-gray-400">Олдсонгүй</p>}
                {khorooList.map((k) => (
                  <CheckRow
                    key={k}
                    label={k}
                    checked={draftKhoroos.includes(k)}
                    onClick={() => toggleKhoroo(k)}
                    hook="data-khoroo-value"
                    hookValue={k}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 💡 ЗААВАР (2026-10-04 (28)) — сайдбарын Байршил блок нь 2 шатлалтай
            байсан тул «Эхлээд хот/аймгаа сонгоно уу» гэсэн ЗААВАР бичигддэг
            байв. Пикер рүү шилжсэн ч заавар нь ХЭРЭГТЭЙ (хэрэглэгч дүүрэг
            сонгоогүй бол хорооны багана огт харагдахгүй — яагаад гэдгийг
            тайлбарлана ✓); хот сонгосон үед л харуулна (эс бөгөөс мэдээлэл
            илүүдэл ✗) */}
        {draftCity && draftDistricts.length === 0 && (
          /* ⚠️ `hidden … sm:block` — мобайлд (drill-down) энэ зөвлөгөө илүүц
             (шатлал нь өөрөө ойлгомжтой ✓); 🖥 ≥640px дээр ХЭВЭЭР ✓ */
          <p className="hidden px-5 pb-1 text-[13px] text-gray-500 sm:block">
            💡 Дүүрэг сонгоход хорооны жагсаалт нээгдэнэ.
          </p>
        )}

        {/* ===== 📱 МОБАЙЛ (<640px) — НЭГ ДЭЛГЭЦЭД НЭГ ШАТЛАЛ (drill-down) =====
            ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (жишээ зурагтай, 2026-10-04 (29)): «гар утсан
            дээр ийм лалын харагдаад байна … нэг нэг хуудсаар оруулдаг болгооч»
            ⇒ мобайлд 3 багана биш, `жишиг сайт`-ийн «Байршлаа сонгоно уу» шиг
            ДЭЛГЭЦ БҮРД НЭГ ШАТЛАЛ: Хот/Аймаг → Дүүрэг → Хороо (мөр баруун
            талдаа `›`). 🖥 ≥640px дээр дээрх каскад багана ХЭВЭЭР ✓
            ⚠️ `data-mobile-*` — CDP-ийн `[data-district-value]` (=9) тоог
               хөндөхгүйн тулд ТУСДАА нэршил (энд хуучин дэгээ ХЭРЭГЛЭХГҮЙ ✗)
            🔍 Хайх үг: data-mobile-location, mStep, drill-down, нэг нэг хуудас */}
        <div data-mobile-location className="sm:hidden">
          <div className="mt-3 max-h-[55vh] overflow-y-auto border-t border-gray-100 px-5 py-3">
            {mStep === 'city' && (
              <>
                <p className="mb-1 px-1 text-[13px] font-semibold text-gray-500">Хот / Аймаг</p>
                {cityList.length === 0 && <p className="px-1 py-3 text-[14px] text-gray-400">Олдсонгүй</p>}
                {cityList.map((c) => (
                  <MobileCityRow
                    key={c}
                    label={c}
                    active={c === draftCity}
                    hasChildren={getDistricts(c).length > 0}
                    onClick={() => pickCityMobile(c)}
                  />
                ))}
              </>
            )}

            {mStep === 'district' && (
              <>
                <p className="mb-1 px-1 text-[13px] font-semibold text-gray-500">Дүүрэг / Сум</p>
                {districtList.length === 0 && <p className="px-1 py-3 text-[14px] text-gray-400">Олдсонгүй</p>}
                {districtList.map((d) => (
                  <MobileRow
                    key={d}
                    label={d}
                    checked={draftDistricts.includes(d)}
                    onToggle={() => toggleDistrict(d)}
                    /* ⚠️ Хороо БАЙВАЛ нэр дархад ДОТОР ОРНО (жишиг сайт шиг);
                       байхгүй бол (ж: аймгийн сум) бүтэн мөр нь зөвхөн
                       сонгоно ✓ — `MobileRow` нь `onDrill`-ээр ялгана */
                    onDrill={getKhoroos(draftCity, d).length > 0 ? () => openKhorooStep(d) : undefined}
                    hook="data-mobile-district-value"
                    hookValue={d}
                  />
                ))}
              </>
            )}

            {mStep === 'khoroo' && (
              <>
                <p className="mb-1 px-1 text-[13px] font-semibold text-gray-500">Хороо</p>
                {khorooList.length === 0 && <p className="px-1 py-3 text-[14px] text-gray-400">Олдсонгүй</p>}
                {khorooList.map((k) => (
                  <MobileRow
                    key={k}
                    label={k}
                    checked={draftKhoroos.includes(k)}
                    onToggle={() => toggleKhoroo(k)}
                    hook="data-mobile-khoroo-value"
                    hookValue={k}
                  />
                ))}
              </>
            )}
          </div>
        </div>


        {/* ===== ДООД ҮЙЛДЛИЙН МӨР ===== */}
        <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={clearDraft}
            data-clear-location
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-[15px] font-semibold text-gray-800 transition hover:bg-gray-200"
          >
            ✕ Цэвэрлэх
          </button>
          {/* ⚠️ `data-apply-location` — CDP тестийн дэгээ (2026-10-04 (28)):
                 пикер нь ЗӨВХӨН энэ товчоор `filters`-ийг сольдог тул тест
                 «сонгосон → хэрэглэх → URL/DB» замыг БҮРЭН шалгана ✓ */}
          <button
            type="button"
            onClick={apply}
            data-apply-location
            className="min-w-0 flex-1 rounded-xl bg-gray-900 px-5 py-3 text-[15px] font-bold text-white transition hover:bg-gray-800"
          >
            Байршлыг хэрэглэх
          </button>
        </div>
      </div>
    </div>
  );
}

