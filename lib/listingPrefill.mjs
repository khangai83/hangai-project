// ============================================================
// listingPrefill.mjs — 🎯 «ЗАР НЭМЭХ» ФОРМ РУУ АНГИЛАЛ УРЬДЧИЛАН БӨГЛӨХ
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-06): «Хэрэглэгч зар нэмэх товч дархад, тэр нь
//    ямар нэг ангилалд явж байвал зар нэмэх хэсэгт нь тохируулагдсан байдлаар
//    орж ирдэг байвал зүгээр юм байна. Жишээ нь Бүх зар › Ажил, Үйлчилгээ ›
//    Барилга & Засвар үйлчилгээ › Гагнуурын үйлчилгээ, Энд явж байгаад Зар
//    нэмэхээ дархад Энэ ангилал нь сонгогдсон эхэлдэг байвал сайхан юм шиг
//    санагдаж байна.» ⇒ форм нь ТУХАЙН АНГИЛАЛ дээр сонгогдсон байдлаар нээгдэнэ ✓
//
// ХАМРАХ ХҮРЭЭ (цэвэр — Node тест `scripts/test-prefill.mjs` шууд import хийнэ):
//   ① `listingPrefillFromSearch(search)` — нүүр хуудсны URL-ийн шүүлтээс
//      ангилалыг (`section`/`category`/`type`) уншина; ХҮЧИНГҮЙ утгыг ХАЯНА
//   ② `newListingHref(prefill)`      — `/listings/new?section=…&type=…` угсарна
//   ③ `applyPrefill(form, prefill)`  — формыг (анхдагч утга дээр) бөглөнө
//   ④ `prefillMobileCatStep(prefill)` — 📱 drill-down-ийн АНХНЫ дэлгэц
//
// ⚠️ ЗӨВХӨН АНГИЛАЛ — байршил (`city`/`district`/`khoroo`), өрөө, үнэ зэрэг
//    бусад шүүлт УРЬДЧИЛАН ОРУУЛАХГҮЙ (хэрэглэгчийн баталгаажуулалт,
//    2026-10-06: «Зөвхөн ангилал»). Шалтгаан: байршил/өрөө нь ЗАР БҮРД өөр
//    байдаг (ж: «Баянзүрх» шүүлтээр явж байгаа хэрэглэгч өөр дүүргийн зар
//    нэмэх нь элбэг) ⇒ буруу утга бөглөгдөх эрсдэлтэй ✗
//
// ⚠️ БҮЛЭГ (ж: «Барилга & Засвар үйлчилгээ») нь ТУСДАА ТАЛБАР БИШ — дэд төрөл
//    (`type`) сонгоход форм нь `findSubtypeGroup()`-оор бүлгээ өөрөө олж,
//    `openGroup`-оо АВТОМАТААР нээнэ ✓ (`AddListingClient` → `useEffect`).
//    Тиймээс URL-д бүлгийн нэр ХАДГАЛАХ ШААРДЛАГАГҮЙ (нэг эх сурвалж: дэд төрөл)
//
// ⚠️ ХҮЧИНГҮЙ утга (ж: шинэ дэд төрөл нэмэгдэхээс өмнөх хуучин линк) нь
//    ЧИМЭЭГҮЙ ХАЯГДАНА — форм ХУДАЛ утга сонгосон байдлаар нээгдэхгүй ✓
//    (⚠️ `section` нь зөв бол `category`/`type` бие даан хаягдана)
//
// ⚠️ DB / query / URL бүтэц / migration ХӨНДӨӨГДӨХГҮЙ — зөвхөн форм дээрх
//    НЭГ УДААГИЙН АНХНЫ СОНГОЛТ ✓ (зарын `section`/`property_type` нь
//    хэрэглэгч хадгалах үед л бичигдэнэ)
// ============================================================
import { SECTIONS, getSubtypes, hasCategoryChoice } from './locationData.js';

/** Хүчинтэй хэсгүүд (`real-estate`, `auto`, `services` …) — URL-ийн `section` шалгалт */
const SECTION_VALUES = SECTIONS.map((s) => s.value);

/**
 * Формд зөвшөөрөгдөх «Зарах / Түрээслэх» утга.
 * ⚠️ «Бүгд» (`all`) ХАМААРАХГҮЙ — зар нь үргэлж `sell`/`rent` байдаг тул
 *    формд утгагүй (`AddListingClient` → `categoryItems` ч `all`-ыг хасдаг ✓)
 */
const CATEGORY_VALUES = ['sell', 'rent'];

/**
 * Нүүр хуудсны ХАЙЛТЫН URL → ангилалын урьдчилсан бөглөлт.
 *
 * @param {string} search `window.location.search` (`?section=…&type=…`) эсвэл
 *   зөвхөн query мөр (`section=…`); `?` нь байсан ч/байхгүй ч зөв уншина ✓
 * @returns {{section?: string, category?: string, type?: string}} ХҮЧИНТЭЙ
 *   утгууд л орно — бөглөх юмгүй бол `{}` (⚠️ `/listings/new` ЦЭВЭР линк ✓)
 */
export function listingPrefillFromSearch(search) {
  let sp;
  try {
    sp = new URLSearchParams(typeof search === 'string' ? search : '');
  } catch {
    return {}; // ⚠️ эвдэрсэн мөр — крашгүй, бөглөлтгүй ✓
  }

  const sectionRaw = sp.get('section') || '';
  const categoryRaw = sp.get('category') || '';
  const typeRaw = (sp.get('type') || '').trim();
  const out = {};

  if (SECTION_VALUES.includes(sectionRaw)) {
    out.section = sectionRaw;
    // 🗄 «Зарах / Түрээслэх» — ⚠️ ЗӨВХӨН сонголттой хэсэгт (үл хөдлөх).
    //    ⚠️ `HomeClient` ч `category`-г зөвхөн `real-estate` үед уншдаг —
    //    ижил дүрэм (шүүлт ба форм хоёр зөрөхгүй ✓)
    if (hasCategoryChoice(sectionRaw) && CATEGORY_VALUES.includes(categoryRaw)) {
      out.category = categoryRaw;
    }
    // 🗂 Дэд төрөл нь ТУХАЙН хэсгийн жагсаалтад байгаа эсэх
    //    (ж: «Гагнуурын үйлчилгээ» нь `services`-д ✓, `auto`-д ✗)
    if (typeRaw && getSubtypes(sectionRaw).includes(typeRaw)) out.type = typeRaw;
    return out;
  }

  // ⚠️ `section` БАЙХГҮЙ ч `type` бичигдсэн линк байдаг — нүүр хуудсны
  //    анхдагч нь үл хөдлөх (`HomeClient`: `?type=Орон сууц`, `section` нь `all`).
  //    Тиймээс ЗӨВХӨН үл хөдлөхийн дэд төрөл бол түүнийг уншина; өөр хэсгийн
  //    төрөл (ж: `?type=Суудлын машин` ганцаараа) нь АЛЬ ХЭСЭГТ харьяалагдах
  //    нь тодорхойгүй тул ХАЯГДАНА ✓ (`?type=Бусад` олон хэсэгт байдаг ✗)
  //
  // ⚠️ `section` нь ТОДОРХОЙ бичигдсэн (хоосон БИШ) ч ТАНИГДСАН хэсэг БИШ бол
  //    (хуучин/буруу линк) ЮУ Ч бөглөхгүй — «аль хэсэгт хамаарах нь
  //    тодорхойгүй» типээс ТААМАГЛАХГҮЙ ✓ (форм анхдагч хэвээр нээгдэнэ)
  if (sectionRaw) return out;
  if (typeRaw && getSubtypes('real-estate').includes(typeRaw)) {
    out.section = 'real-estate';
    out.type = typeRaw;
  }
  return out;
}

/**
 * Урьдчилсан бөглөлтөөс «Зар нэмэх» хуудасны ЛИНК угсарна.
 * ⚠️ `?step=` НЬ ОРУУЛАХГҮЙ — хэрэглэгч 1-р алхмаас (ангилал) эхэлнэ ✓
 * ⚠️ Утга нь `encodeURIComponent`-оор кодлогдоно (кирилл + зай → `%20`) ⇒
 *    линк нь харагдац дээр ч, хуваалцахад ч цэвэр ✓
 * @param {{section?: string, category?: string, type?: string}} [prefill]
 * @returns {string} `'/listings/new'` эсвэл `'/listings/new?section=…&type=…'`
 */
export function newListingHref(prefill = {}) {
  const p = prefill && typeof prefill === 'object' ? prefill : {};
  const parts = [];
  if (p.section) parts.push(`section=${encodeURIComponent(p.section)}`);
  if (p.category) parts.push(`category=${encodeURIComponent(p.category)}`);
  if (p.type) parts.push(`type=${encodeURIComponent(p.type)}`);
  return parts.length ? `/listings/new?${parts.join('&')}` : '/listings/new';
}

/**
 * Форм дээр урьдчилсан бөглөлтийг ХИЙНЭ (шинэ объект буцаана — өөрчлөхгүй ✓).
 *
 * ⚠️ `preserve` дүрэм: бөглөлт нь ЗӨВХӨН өөртөө БАЙГАА утгыг тавина; байхгүй
 *    талбарыг ХӨНДӨХГҮЙ (ж: зөвхөн `section` ирвэл `propertyType` хэвээр) ✓
 * ⚠️ Гэхдээ `section` нь солигдвол «Зарах / Түрээслэх» нь форм-ийн дүрмээр
 *    дахин тооцогдоно: сонголт байхгүй хэсэгт үргэлж `sell`
 *    (`AddListingClient → pickSection`-ийн ЯГ ижил дүрэм ✓)
 * ⚠️ `attrs`/`payments` нь хэсэг бүрд өөр (`pickSection` цэвэрлэдэг) — шинэ
 *    зар дээр анхдагч нь аль хэдийн `{}`/`[]` тул энд хөндөх шаардлагагүй ✓
 *
 * @param {object} form `AddListingClient`-ийн `emptyForm()` (эсвэл түүнтэй төстэй)
 * @param {{section?: string, category?: string, type?: string}} prefill
 * @returns {object} бөглөгдсөн форм (бөглөлтгүй бол ИРСЭН объект ХЭВЭЭР)
 */
export function applyPrefill(form, prefill) {
  const base = form && typeof form === 'object' ? form : {};
  if (!prefill || !prefill.section) return base;

  const next = { ...base, section: prefill.section };
  // «Зарах / Түрээслэх» — зөвхөн үл хөдлөхөд утгатай (бусад хэсэгт `sell`)
  next.category = hasCategoryChoice(prefill.section) && CATEGORY_VALUES.includes(prefill.category)
    ? prefill.category
    : 'sell';
  // Дэд төрөл — ⚠️ хамгаалалттай (`listingPrefillFromSearch` шүүсэн ч
  //    гараар угсарсан объект ирж болзошгүй ⇒ дахин шалгана ✓)
  if (prefill.type && getSubtypes(prefill.section).includes(prefill.type)) {
    next.propertyType = prefill.type;
  }
  return next;
}

/**
 * 📱 <640px drill-down-ийн АНХНЫ дэлгэц — аль асуултаас эхлэх вэ.
 *
 * ⚠️ `type` (дэд төрөл) сонгогдсон бол ШУУД «Төрөл» дэлгэц рүү — хэрэглэгч
 *    сонголтоо хараад «Үргэлжлүүлэх» дарж л болно ✓; бусад тохиолдолд эхний
 *    («Хэсэг») дэлгэцээс эхэлнэ (хэрэглэгч сонголтоо харж, «← Буцах»-аар бүх
 *    түвшинд буцаж чадна ✓)
 * @param {{type?: string}} [prefill]
 * @returns {'section'|'subtype'} `mobileCatStep`-ийн утга
 */
export function prefillMobileCatStep(prefill) {
  return prefill && prefill.type ? 'subtype' : 'section';
}
