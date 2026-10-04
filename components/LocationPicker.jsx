'use client';

import { useEffect, useMemo, useState } from 'react';
import { CITIES, getDistricts, getKhoroosForDistricts } from '../lib/locationData';

/* ============================================================
   📍 БАЙРШЛЫН ПИКЕР (modal) — 2026-10-04 (27)
   ------------------------------------------------------------
   ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (жишээ зурагтай): «Бүх байршил хэсэгт байршилаа
   солих боломжтой болго» — толгойн мөр дэх «📍 Бүх байршил» товч дарахад
   `unegui.mn`-ийн «Байршлаа сонгоно уу» цонх шиг КАСКАД (Хот/Аймаг →
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

/** Олон сонголтын мөр (checkbox — дүүрэг/хороо) */
function CheckRow({ label, checked, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
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

export default function LocationPicker({ open, onClose, city, districts, khoroos, onApply }) {
  const [draftCity, setDraftCity] = useState(city || '');
  const [draftDistricts, setDraftDistricts] = useState(() => (Array.isArray(districts) ? [...districts] : []));
  const [draftKhoroos, setDraftKhoroos] = useState(() => (Array.isArray(khoroos) ? [...khoroos] : []));
  const [q, setQ] = useState('');

  // ⚠️ Нээгдэх БҮРД одоогийн `filters`-ээс ШИНЭ хуулбар авна (өмнөх
  //    «цуцлагдсан» ноорог үлдэхгүй ✓)
  useEffect(() => {
    if (!open) return;
    setDraftCity(city || '');
    setDraftDistricts(Array.isArray(districts) ? [...districts] : []);
    setDraftKhoroos(Array.isArray(khoroos) ? [...khoroos] : []);
    setQ('');
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
    setDraftDistricts((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    // ⚠️ Дүүрэг солигдвол хороодын НЭГДЭЛ жагсаалт өөр болно → цэвэрлэнэ
    //    (`setF('districts')`-ийн ЯГ ИЖИЛ дүрэм ✓)
    setDraftKhoroos([]);
  };
  const toggleKhoroo = (k) => {
    setDraftKhoroos((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };
  const clearDraft = () => { setDraftCity(''); setDraftDistricts([]); setDraftKhoroos([]); };

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
          <h2 className="text-[22px] font-bold text-gray-900">Байршлаа сонгоно уу</h2>
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


        {/* ===== КАСКАД БАГАНУУД ===== */}
        <div className="mt-3 flex gap-3 border-t border-gray-100 px-5 py-4">
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

          {/* ② Дүүрэг/Сум */}
          {districtOptions.length > 0 && (
            <div className="flex min-w-0 flex-1 flex-col border-l border-gray-100 pl-3" data-location-col="district">
              <span className="mb-1 block px-3 text-[13px] font-semibold text-gray-500">Дүүрэг / Сум</span>
              <div className="max-h-[50vh] overflow-y-auto pr-1">
                {districtList.length === 0 && <p className="px-3 py-2 text-[14px] text-gray-400">Олдсонгүй</p>}
                {districtList.map((d) => (
                  <CheckRow
                    key={d}
                    label={d}
                    checked={draftDistricts.includes(d)}
                    onClick={() => toggleDistrict(d)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ③ Хороо (дүүрэг сонгосон үед) */}
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
                  />
                ))}
              </div>
            </div>
          )}
        </div>


        {/* ===== ДООД ҮЙЛДЛИЙН МӨР ===== */}
        <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={clearDraft}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-[15px] font-semibold text-gray-800 transition hover:bg-gray-200"
          >
            ✕ Цэвэрлэх
          </button>
          <button
            type="button"
            onClick={apply}
            className="min-w-0 flex-1 rounded-xl bg-gray-900 px-5 py-3 text-[15px] font-bold text-white transition hover:bg-gray-800"
          >
            Байршлыг хэрэглэх
          </button>
        </div>
      </div>
    </div>
  );
}

