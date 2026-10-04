'use client';

import { useEffect, useMemo, useState } from 'react';
// 🏷️ Үйлдвэрлэгчийн жагсаалт — sidebar / форм бүгд ЯГ нэг эх сурвалжаас
//    (`lib/locationData.js → CAR_BRANDS`) ✓
import { CAR_BRANDS } from '../lib/locationData';
// 🚗🌈 БРЭНД → ЗАГВАР газрын зураг (форм дээр ч ЯГ ижил модуль ✓)
import { getCarModels } from '../lib/carModels.mjs';
// 🚙🌂 ОЛОН СОНГОЛТТОЙ ЗАГВАР (2026-10-04 (36)) — массив унших/toggle хийх/
//    товчлох дүрэм нь ЯГ нэг эх сурвалж (`parseAttrList`, `toggleAttrValue`,
//    `attrListFilterLabel`) — HomeClient-ийн чипүүд ч үүнийг дуудна ✓
import { parseAttrList, toggleAttrValue, attrListFilterLabel } from '../lib/attrMultiFilter.mjs';

/* ============================================================
   🏷️🚙 МАШИНЫ ПИКЕР (modal) — 2026-10-04 (35)
   ------------------------------------------------------------
   ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Автомашины хайлтын Үйлдвэрлэгч, Загварыг
   Байршил шиг хайдаг болгоод өг».

   🔴 АСУУДАЛ (хуучин): сайдбарт 🏷️ Үйлдвэрлэгч ба 🚙 Загвар нь ХОЁР
      тусдаа талбар байв (`SearchableSelect` → 95 брэнд, дараа нь
      `TextFilter`/combo) — мобайл дээр бөглөхөд төвөгтэй, юу
      сонгосноо нэг дор харах боломжгүй ✗
   ✅ ШИЙДЭЛ: 📍 Байршил (`components/LocationPicker.jsx`, 2026-10-04
      (27)/(28)/(29)) шиг **НЭГ товч → цонх** — дарахад нээгдэж, ХАЙЛТЫН
      талбараар бичиж шүүнэ, Үйлдвэрлэгч → Загвар КАСКАД сонгоно,
      сонгосон нь чип хэлбэрээр толгойд харагдана, доод мөрд
      «✕ Цэвэрлэх» + «Машиныг хэрэглэх» ✓

   ⚠️ Утгын загвар нь `HomeClient`-ийн `filters.attrs`-тай ЯГ ИЖИЛ:
        { brand: string, model: string[] }   ← 🚙 Загвар нь ОЛОН СОНГОЛТТОЙ
      • `brand`  — 🏷️ Үйлдвэрлэгч (ж: `'Toyota'`) — НЭГ утга (каскадын эцэг)
      • `model`  — 🚙 Загвар (ж: `['Prius 30','Harrier']`) — 2026-10-04 (36)
        хэрэглэгчийн хүсэлт: «машины загвараас олоныг сонгох боломжтой болго»
        ⇒ ОЛОН утгыг зэрэг сонгоно (OR — аль нэг загвартай зар ✓)
        ⚠️ ГАРААР БИЧИХ боломж ХЭВЭЭР (жагсаалтад байхгүй утга: «Тосны шүүр»,
        шинэ брэнд) ✓
      ⇒ тусдаа логик/DB БИШ — `lib/queries.js` нь `attrs->>brand` /
        `attrs->>model`-ыг `ilike %…%`-ээр шүүнэ; 1 загвар нь ХУУЧИН
        скаляр замтай ЯГ ижил, 2+ загвар нь
        `or=(attrs->>model.ilike.%A%,attrs->>model.ilike.%B%)`
        (`lib/attrMultiFilter.mjs → applyAttrMultiLikeFilter`) —
        migration ШААРДЛАГАГҮЙ ✓

   ⚠️ Утгууд нь ЗӨВХӨН НООРОЙ (draft) дээр солигдоно; «Машиныг хэрэглэх»
      дарахад л `onApply(draft)` дуудагдаж, эцэг (HomeClient) `filters`-ээ
      шинэчилнэ ✓ (талбарыг хаах/ESC дарахад ХӨНДӨГДӨХГҮЙ ✓)
   ⚠️ Брэнд солигдоход хуучин ЗАГВАР ЦЭВЭРЛЭГДЭНЭ (`cascadeAttrs`-ийн
      дүрэмтэй ИЖИЛ — «{brand:'Nissan', model:'Prius 30'}» гэсэн зөрчсөн
      хос үүсэхгүй ✓)
   ============================================================ */

/**
 * Нэг сонголтын мөр.
 *
 * ⚠️ `multi` (2026-10-04 (36)): 🚙 «Загвар» нь ОЛОН сонголттой тул мөр нь
 *    радио (дугуй) БИШ, checkbox (дөрвөлжин) харагдана — хэрэглэгч хэдэн
 *    загвар зэрэг сонгосноо нүдээрээ ялгана ✓ (`aria-pressed` ХОЁУЛАНД нь
 *    ижил — CDP тестийн дэгээ хөндөгдөхгүй ✓)
 */
function PickRow({ label, active, arrow, onClick, hook, hookValue, multi = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      {...(hook && hookValue != null ? { [hook]: hookValue } : {})}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[15px] transition ${
        active ? 'bg-gray-100 font-semibold text-gray-900' : 'text-gray-700 hover:bg-gray-50'
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid h-5 w-5 shrink-0 place-items-center border text-[12px] ${
          multi ? 'rounded-md' : 'rounded-full'
        } ${active ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white'}`}
      >
        {active ? '✓' : ''}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {arrow && <span aria-hidden="true" className="shrink-0 text-gray-400">›</span>}
    </button>
  );
}

/**
 * 🔍 ГАРААР БИЧСЭН УТГАА ХЭРЭГЛЭХ мөр — `SearchableSelect`-ийн
 * «🔍 «toy» гэж хайх» мөрийн ЯГ ИЖИЛ санаа: жагсаалтад байхгүй
 * утгыг (ж: шинэ брэнд «Zeekr», загвар «Тосны шүүр») ч ашиглаж болно ✓
 *
 * ⚠️ `active` (2026-10-04 (36)) — 🚙 Загвар нь ОЛОН сонголттой тул энэ мөр
 *    ч checkbox шиг ажиллана: аль хэдийн сонгосон утга дээр «✓ Сонгосон» ✓
 */
function FreeRow({ text, onClick, hook, active = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      {...(hook ? { [hook]: text } : {})}
      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] font-medium text-primary transition hover:bg-gray-50"
    >
      <span aria-hidden="true">{active ? '✓' : '🔍'}</span>
      <span className="min-w-0 flex-1 truncate">
        «{text}» {active ? '— сонгосон' : 'гэж хайх'}
      </span>
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

export default function CarPicker({ open, onClose, brand, models, onApply }) {
  const [draftBrand, setDraftBrand] = useState(brand || '');
  // 🚙🌂 «Загвар» нь ОЛОН СОНГОЛТТОЙ — төлөв нь ҮРГЭЛЖ массив
  //    (`parseAttrList` скаляр/`''`/`null` утгыг ч массив болгоно ✓)
  const [draftModels, setDraftModels] = useState(() => parseAttrList(models));
  const [q, setQ] = useState('');
  // 📱 Мобайл (<640px) drill-down-ийн ШАТЛАЛ: 'brand' → 'model'
  //    (🖥 ≥640px дээр 2 каскад багана — энэ төлөв ашиглагдахгүй ✓)
  const [mStep, setMStep] = useState('brand');

  // ⚠️ Нээгдэх БҮРД одоогийн `filters`-ээс ШИНЭ хуулбар авна (өмнөх
  //    «цуцлагдсан» ноорог үлдэхгүй ✓ — `LocationPicker`-ийн ЯГ ИЖИЛ дүрэм)
  useEffect(() => {
    if (!open) return;
    setDraftBrand(brand || '');
    setDraftModels(parseAttrList(models));
    setQ('');
    setMStep('brand');
  }, [open, brand, models]);

  // ESC → хаах (modal-ийн жишиг зан төлөв ✓)
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  /**
   * Сонгосон брэндийн загварууд — `lib/carModels.mjs` (нэг эх сурвалж ✓)
   * ⚠️ Гарчгийн НЭР чухал: `models` гэдэг нь проп (`filters`-ээс ирсэн
   *    СОНГОСОН загварууд) тул энэ жагсаалтыг `modelOptions` гэж нэрлэв —
   *    эс бөгөөс ижил нэр 2 удаа зарлагдаж build унана ✗
   */
  const modelOptions = useMemo(() => getCarModels(draftBrand), [draftBrand]);

  /**
   * ⚠️ Аль брэндэд бэлэн загварын жагсаалт БАЙГАА вэ — мобайлд `›` (дотор
   *    орох) тэмдгийг зөвхөн тэдэнд харуулна (ж: «Bosch» сэлбэг → жагсаалт
   *    байхгүй тул `›` ч байхгүй ✓)
   */
  const brandsWithModels = useMemo(
    () => new Set(CAR_BRANDS.filter((b) => getCarModels(b).length > 0)),
    []
  );

  if (!open) return null;

  const ql = q.trim().toLowerCase();
  const qtext = q.trim();
  const match = (s) => !ql || String(s).toLowerCase().includes(ql);
  const brandList = CAR_BRANDS.filter(match);
  const modelList = modelOptions.filter(match);
  const hasExactBrand = CAR_BRANDS.some((b) => b.toLowerCase() === ql);
  const hasExactModel = modelOptions.some((m) => m.toLowerCase() === ql);

  /**
   * 🏷️ Брэнд солих — ⚠️ ижил брэнд дээр дахин дарахад ЦУЦЛАГДАНА; өөр
   *    брэнд сонгоход хуучин ЗАГВАРУУД ЦЭВЭРЛЭГДЭНЭ (`cascadeAttrs`-ийн
   *    дүрэмтэй ИЖИЛ — «{brand:'Nissan', model:['Prius 30']}» гэсэн
   *    зөрчсөн хос үүсэхгүй ✓)
   */
  const pickBrand = (b) => {
    if (b === draftBrand) { setDraftBrand(''); setDraftModels([]); return; }
    setDraftBrand(b);
    setDraftModels([]);
  };
  /**
   * 🚙🌂 Загвар — ОЛОН СОНГОЛТ (2026-10-04 (36)): дарах бүрд НЭМЭГДЭНЭ эсвэл
   *    ХАСАГДАНА (`toggleAttrValue` — нэг эх сурвалж; HomeClient-ийн
   *    «🎨 Өнгө» товчтой ЯГ ижил зан төлөв ✓).
   *    ⚠️ Ижил утгыг дахин дарах нь ЦУЦЛАХ = checkbox-ийн хүлээлт ✓
   */
  const pickModel = (m) => setDraftModels((prev) => toggleAttrValue(prev, m));
  /** ✍️ Жагсаалтгүй брэнд (сэлбэг/шинэ) — бичсэн текстийг загварууд болгоно */
  const setFreeModel = (text) => setDraftModels(parseAttrList(text));

  const clearDraft = () => { setDraftBrand(''); setDraftModels([]); setQ(''); setMStep('brand'); };

  // 📱 Мобайл: брэнд дээр дарахад ЗАГВАРЫН дэлгэц рүү шилжинэ
  //    ⚠️ Ижил брэнд дээр дахин дарахад ноорог ХЭВЭЭР — зөвхөн дотор нь орно
  //       (эс бөгөөс сонгосон загварууд санамсаргүй арилна ✗)
  const pickBrandMobile = (b) => {
    if (b !== draftBrand) { setDraftBrand(b); setDraftModels([]); }
    setQ('');
    setMStep('model');
  };
  const mobileBack = () => { setMStep('brand'); setQ(''); };

  // 📱 Толгойн гарчиг — сонгосон загварын ТОО ч харагдана (олон сонголттой
  //    үед «Toyota · 3» — хэрэглэгч хэдэн загвар тэмдэглэснээ мэдэж байх ✓)
  const mobileTitle = mStep === 'model'
    ? `${draftBrand || 'Загвар'}${draftModels.length ? ` · ${draftModels.length}` : ''}`
    : 'Машинаа сонгоно уу';

  const apply = () => {
    // 🚙 Загвар нь МАССИВ (`[]` = сонгоогүй — `HomeClient.applyCar` нь
    //    хоосныг `delete` хийнэ ✓)
    onApply({ brand: draftBrand, model: draftModels });
    onClose();
  };

  const hasSelection = Boolean(draftBrand) || draftModels.length > 0;

  /**
   * 🚙 Загварын мөрүүд — 🖥 багана БА 📱 дэлгэц ХОЁУЛАА энэ нэг эх сурвалжийг
   *  ашиглана (давхардсан логик БАЙХГҮЙ ✓).
   *
   * ⚠️ CDP дэгээ нь ПАРАМЕТРЭЭР ирнэ: 🖥 `data-car-model-value` · 📱
   *    `data-mobile-car-model` — эс бөгөөс мобайл дээр (багана нь DOM-д хэвээр
   *    байдаг тул) `[data-car-model-value]` ХОЁР дахин тоологдоно ✗
   *    (`LocationPicker`-ийн `data-mobile-*` зарчим ✓)
   */
  const modelRows = (hookValue, hookFree) => (
    <>
      {qtext && !hasExactModel && (
        <FreeRow
          text={qtext}
          onClick={() => pickModel(qtext)}
          hook={hookFree}
          active={draftModels.includes(qtext)}
        />
      )}
      {modelList.length === 0 && !qtext && (
        <p className="px-3 py-2 text-[14px] text-gray-400">Олдсонгүй</p>
      )}
      {modelList.map((m) => (
        <PickRow
          key={m}
          label={m}
          active={draftModels.includes(m)}
          multi
          onClick={() => pickModel(m)}
          hook={hookValue}
          hookValue={m}
        />
      ))}
    </>
  );


  return (
    <div
      className="fixed inset-0 z-[1500] flex items-start justify-center overflow-y-auto bg-black/40 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Машинаа сонгоно уу"
      data-car-picker
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="my-2 w-full max-w-[900px] rounded-2xl bg-white shadow-card-hover">
        {/* ===== ТОЛГОЙ ===== */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="flex min-w-0 items-center gap-2">
            {/* 📱 Мобайл: брэндийн жагсаалт руу буцах (`<sm` дээр л) */}
            {mStep !== 'brand' && (
              <button
                type="button"
                onClick={mobileBack}
                aria-label="Буцах"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[18px] text-gray-700 transition hover:bg-gray-100 sm:hidden"
              >
                ←
              </button>
            )}
            {/* ⚠️ ХОЁР `<span>` — `sm:hidden` / `hidden sm:inline` (нэг DOM,
                зөвхөн CSS-ээр солигдоно — `LocationPicker`-ийн ИЖИЛ арга ✓) */}
            <h2 className="min-w-0 truncate text-[22px] font-bold text-gray-900">
              <span className="sm:hidden">{mobileTitle}</span>
              <span className="hidden sm:inline">Машинаа сонгоно уу</span>
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
            <label className="sr-only" htmlFor="car-search">Үйлдвэрлэгч эсвэл загвар</label>
            <input
              id="car-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Үйлдвэрлэгч эсвэл загвараа бичиж эхлээрэй"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>

          {/* ===== СОНГОСОН ЧИПҮҮД =====
              ⚠️ 🚙 Загвар нь ОЛОН сонголттой (2026-10-04 (36)) тул чип нь
                 утга БҮРД тусдаа — «✕» нь ЗӨВХӨН тэр загварыг хасна ✓ */}
          {hasSelection && (
            <div className="mt-3 flex flex-wrap gap-2" data-car-chips>
              {draftBrand && <Chip label={draftBrand} onRemove={() => pickBrand(draftBrand)} />}
              {draftModels.map((m) => (
                <Chip key={m} label={m} onRemove={() => pickModel(m)} />
              ))}
            </div>
          )}
        </div>


        {/* ===== КАСКАД БАГАНУУД (🖥 ЗӨВХӨН ≥640px) =====
            ⚠️ `hidden … sm:flex` — мобайл (<640px) дээр доорх drill-down
               блок харагдана (`LocationPicker`-ийн ИЖИЛ зарчим ✓)
            ⚠️ DOM-д ХЭВЭЭР (зөвхөн CSS) — CDP-ийн `[data-car-brand-value]`
               тоо мобайл дээр ч хадгалагдана ✓ */}
        <div className="mt-3 hidden gap-3 border-t border-gray-100 px-5 py-4 sm:flex">
          {/* ① 🏷️ Үйлдвэрлэгч
              ⚠️ `data-car-brand-filter` + `role="group"` + `aria-label`
                 — CDP тестийн ТОГТВОРТОЙ дэгээ (`cdp-picker.mjs` §7) ✓ */}
          <div
            className="flex min-w-0 flex-1 flex-col"
            data-car-col="brand"
            data-car-brand-filter
            role="group"
            aria-label="Үйлдвэрлэгч"
          >
            <span className="mb-1 block px-3 text-[13px] font-semibold text-gray-500">Үйлдвэрлэгч</span>
            <div className="max-h-[50vh] overflow-y-auto pr-1">
              {qtext && !hasExactBrand && (
                <FreeRow text={qtext} onClick={() => pickBrand(qtext)} hook="data-car-brand-free" />
              )}
              {brandList.length === 0 && <p className="px-3 py-2 text-[14px] text-gray-400">Олдсонгүй</p>}
              {brandList.map((b) => (
                <PickRow
                  key={b}
                  label={b}
                  active={b === draftBrand}
                  onClick={() => pickBrand(b)}
                  hook="data-car-brand-value"
                  hookValue={b}
                />
              ))}
            </div>
          </div>

          {/* ② 🚙 Загвар — брэнд сонгосон үед л */}
          {draftBrand && (
            <div
              className="flex min-w-0 flex-1 flex-col border-l border-gray-100 pl-3"
              data-car-col="model"
              data-car-model-filter
              role="group"
              aria-label="Загвар"
            >
              <span className="mb-1 flex items-center gap-2 px-3 text-[13px] font-semibold text-gray-500">
                Загвар
                {/* 🚙🌂 ОЛОН СОНГОЛТ — сонгосон тоо + сануулга (2026-10-04 (36)) */}
                <span className="font-normal text-gray-400">— олон сонгож болно</span>
                {draftModels.length > 0 && (
                  <span
                    data-car-model-count={draftModels.length}
                    className="rounded-full bg-primary px-2 py-0.5 text-[12px] font-bold text-white"
                  >
                    {draftModels.length}
                  </span>
                )}
              </span>
              {modelOptions.length === 0 ? (
                /* ⚠️ Жагсаалтгүй брэнд (ж: сэлбэгийн «Bosch», шинэ брэнд) →
                   ЧӨЛӨӨТ ТЕКСТ (өмнөх зан төлөв хадгалагдана ✓).
                   ⚠️ Утга нь ч массив — `setFreeModel` нь таслалаар
                   олон утга бичихийг ч дэмжинэ (`parseAttrList` ✓) */
                <div className="px-3 py-2">
                  <input
                    type="text"
                    aria-label="Загвар"
                    value={draftModels.join(', ')}
                    onChange={(e) => setFreeModel(e.target.value)}
                    placeholder="Загвараа бичнэ үү"
                    className="form-input"
                  />
                  <p className="mt-1 text-[12px] text-gray-500">
                    💡 Энэ үйлдвэрлэгчийн бэлэн жагсаалт байхгүй — бичээд хайна.
                  </p>
                </div>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto pr-1">
                  {modelRows('data-car-model-value', 'data-car-model-free')}
                </div>
              )}
            </div>
          )}
        </div>


        {/* ===== 📱 МОБАЙЛ (<640px) — НЭГ ДЭЛГЭЦЭД НЭГ ШАТЛАЛ (drill-down) =====
            ⚠️ `data-mobile-car-*` — CDP-ийн `[data-car-*]` тоог хөндөхгүйн
               тулд ТУСДАА нэршил (`LocationPicker`-ийн ИЖИЛ арга ✓) */}
        <div data-mobile-car className="sm:hidden">
          <div className="mt-3 max-h-[55vh] overflow-y-auto border-t border-gray-100 px-5 py-3">
            {mStep === 'brand' && (
              <>
                <p className="mb-1 px-1 text-[13px] font-semibold text-gray-500">Үйлдвэрлэгч</p>
                {qtext && !hasExactBrand && (
                  <FreeRow text={qtext} onClick={() => pickBrandMobile(qtext)} hook="data-mobile-car-brand-free" />
                )}
                {brandList.length === 0 && <p className="px-1 py-3 text-[14px] text-gray-400">Олдсонгүй</p>}
                {brandList.map((b) => (
                  <PickRow
                    key={b}
                    label={b}
                    active={b === draftBrand}
                    arrow={brandsWithModels.has(b)}
                    onClick={() => pickBrandMobile(b)}
                    hook="data-mobile-car-brand"
                    hookValue={b}
                  />
                ))}
              </>
            )}

            {mStep === 'model' && (
              <>
                <p className="mb-1 flex items-center gap-2 px-1 text-[13px] font-semibold text-gray-500">
                  Загвар
                  <span className="font-normal text-gray-400">— олон сонгож болно</span>
                  {draftModels.length > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[12px] font-bold text-white">
                      {draftModels.length}
                    </span>
                  )}
                </p>
                {modelOptions.length === 0 ? (
                  <div className="py-2">
                    <input
                      type="text"
                      aria-label="Загвар"
                      value={draftModels.join(', ')}
                      onChange={(e) => setFreeModel(e.target.value)}
                      placeholder="Загвараа бичнэ үү"
                      className="form-input"
                    />
                  </div>
                ) : (
                  modelRows('data-mobile-car-model', 'data-mobile-car-model-free')
                )}
              </>
            )}
          </div>
        </div>

        {/* ===== ДООД ҮЙЛДЛИЙН МӨР ===== */}
        <div className="flex items-center gap-3 border-t border-gray-100 px-5 py-4">
          <button
            type="button"
            onClick={clearDraft}
            data-clear-car
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gray-100 px-5 py-3 text-[15px] font-semibold text-gray-800 transition hover:bg-gray-200"
          >
            ✕ Цэвэрлэх
          </button>
          {/* ⚠️ `data-apply-car` — CDP тестийн дэгээ: пикер нь ЗӨВХӨН энэ
                 товчоор `filters`-ийг сольдог тул тест «сонгосон → хэрэглэх →
                 URL» замыг БҮРЭН шалгана ✓
              ⚠️ Шошго нь сонгосон тоог ч харуулна («Машиныг хэрэглэх (2)») —
                 олон загвар сонгоход хэрэглэгч зөв эсэхийг батлана ✓ */}
          <button
            type="button"
            onClick={apply}
            data-apply-car
            className="min-w-0 flex-1 rounded-xl bg-gray-900 px-5 py-3 text-[15px] font-bold text-white transition hover:bg-gray-800"
          >
            Машиныг хэрэглэх{draftModels.length > 1 ? ` (${attrListFilterLabel(draftModels, 'загвар')})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

