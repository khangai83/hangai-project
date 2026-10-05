// ============================================================
// 🔎 ХАЙЛТЫН САНАЛ (autocomplete) — цэвэр, тестлэгддэг туслах
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (жишээ зурагтай): хайлтын хайрцагт бичихэд доор нь
//   «Цемент — 🧱 Барилгын материал» гэх мэт САНАЛУУД гарч, дарахад шууд
//   хайлт хийдэг болгох (unegui.mn-ийн хэв).
//
// 📐 САНАЛЫН 2 ТӨРӨЛ:
//   ① `type`    — ХЭСЭГ/ДЭД ТӨРӨЛ (статик, `lib/locationData.js`-ээс).
//                 ж: «Цемент» → hint «🧱 Барилгын материал» (аль хэсгийнх вэ)
//   ② `listing` — DB дээрх ЗАРЫН ГАРЧИГ (динамик, `title` ilike).
//                 ж: «Hyundai цемент шахмагц» → hint «Суудлын машин · …»
//
// ⚠️ `type` санал нь ЗӨВХӨН статик өгөгдөл тул DB-гүй ч ажиллана (сүлжээ
//    унасан/удаан үед ч хэрэглэгч ямар нэг санал харна ✓).
// ⚠️ `value` нь дарахад хайлтын хайрцагт ОРЖ, шууд хайгдах УТГА («Цемент»,
//    «Hyundai цемент шахмагц») — шошго ба утга ялгаатай байж болно.
// ============================================================
import { SECTIONS, getSubtypes } from './locationData.js';

/** Хэсгийн icon+нэр (`real-estate` → «🏠 Үл хөдлөх») — hint-д зориулав. */
export function sectionLabel(section) {
  const sec = SECTIONS.find((s) => s.value === section);
  return sec ? `${sec.icon} ${sec.label}` : '';
}

/** Зарын мөрийн hint: «Дэд төрөл · Дүүрэг/Хот» (байгаа хэсгийг л залгана). */
export function listingHint(listing) {
  if (!listing) return '';
  return [listing.property_type, listing.district || listing.city]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Хэсэг/дэд төрлөөс санал угсарна (статик, DB хэрэггүй).
 * Хэсгийн НЭР болон дэд төрөл тус бүрийг хайлтын үгтэй харьцуулна.
 *
 * @param {string} q           хайлтын үг
 * @param {{limit?:number}} [opts]
 * @returns {{kind:'type',value:string,label:string,hint:string}[]}
 */
export function suggestTypes(q, { limit = 5 } = {}) {
  const term = String(q == null ? '' : q).trim().toLowerCase();
  // ⚠️ 1 үсэгт хайлт нь бараг БҮХ зүйлтэй таарч, санал дүүрнэ ✗ → 2+
  if (term.length < 2) return [];

  const out = [];
  const seen = new Set();
  const push = (value, hint) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind: 'type', value, label: value, hint });
  };

  for (const sec of SECTIONS) {
    const hint = `${sec.icon} ${sec.label}`;
    if (sec.label.toLowerCase().includes(term)) push(sec.label, hint);
    for (const sub of getSubtypes(sec.value)) {
      if (sub.toLowerCase().includes(term)) push(sub, hint);
    }
  }
  return out.slice(0, limit);
}

/**
 * Статик БА динамик саналуудыг НЭГТГЭНЭ: давхардлыг (`value`) хасч,
 * эхний `limit`-ийг л буцаана. ⚠️ `type` санал тэргүүнд (илүү найдвартай).
 *
 * @param {Array} types      `suggestTypes()`-ийн үр дүн
 * @param {Array} listings   DB-ээс татсан зар (`title`-тай)
 * @param {number} [limit]
 * @returns {{kind:string,value:string,label:string,hint:string}[]}
 */
export function mergeSuggestions(types, listings, limit = 8) {
  const out = [];
  const seen = new Set();
  const add = (item) => {
    if (!item || !item.value) return;
    const key = String(item.value).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(item);
  };

  (types || []).forEach(add);
  (listings || []).forEach((l) => {
    if (!l || !l.title) return;
    add({ kind: 'listing', value: l.title, label: l.title, hint: listingHint(l) });
  });
  return out.slice(0, limit);
}
