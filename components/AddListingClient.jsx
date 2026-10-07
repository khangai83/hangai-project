'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useToast, useUI } from './AppProviders';
import { createListing, updateListing, uploadImages, fetchListingById } from '../lib/queries';
import { CITIES, getDistricts, getKhoroos, hasApartmentFields, hasFloorFields, hasRoomsFields, hasBathroomFields, hasSimpleForm, BALCONY_OPTIONS, GARAGE_OPTIONS, SECTIONS, getSection, getSubtypes, hasCategoryChoice, getSectionCategories, getSubtypeGroups, findSubtypeGroup, getAttrFields, PROPERTY_TYPE_ICONS } from '../lib/locationData';
import { normalizePhone, getPropertyTypeLabel, formatThousands, digitCount, shortPrice, isNegotiablePrice, NEGOTIABLE_PRICE_LABEL, NEGOTIABLE_SALARY_LABEL, MAX_LISTING_TITLE_LENGTH } from '../lib/format';
import phoneEmail from '../lib/phoneEmail';
import YouTubeField from './YouTubeField';
import SearchableSelect from './SearchableSelect';
// 🗺 ГАЗРЫН ЗУРАГ ДЭЭРХ ПИН-ПИКЕР (2026-10-06) — `unegui.mn` мэт modal
import LocationMapPicker from './LocationMapPicker';
import { parseYouTube } from '../lib/youtube.mjs';
import { compressImages, formatBytes } from '../lib/imageUtils';
/**
 * 📝 НООРОГ (2026-10-05, 54) — хэрэглэгчийн гомдол: «зар нэмж байх үедээ гар
 *    утасны browser санамсаргүй refresh хийхэд оруулж байсан мэдээлэл байхгүй
 *    болж байна» ⇒ форм нь зөвхөн React-ийн санах ойд байсан тул хуудас дахин
 *    ачаалагдмагц бүх талбар алга болдог байв ✗
 * ✅ Одоо оруулсан утга нь `localStorage`-д ноорог болж хадгалагдана
 *    (анхдагч/TTL/whitelist/`editId` дүрэм БҮГД `lib/listingDraft.mjs` — цэвэр
 *    модуль, `npm run test:draft` шалгана ✓)
 */
import {
  draftKey, serializeDraft, parseDraft, isMeaningfulDraft, draftNoticeText,
} from '../lib/listingDraft.mjs';
/**
 * 📍 Байршил сонгохгүй (2026-10-06, хэрэглэгчийн хүсэлт: «зарим хэрэглэгч
 *    зарын Байршилаа оруулахыг хүсэхгүй байж магадгүй … Байршил хэсэгт
 *    “Байршил хэрэглэхгүй” гэсэн сонголт (Check box) оруулж өгье») —
 *    2-р алхмын чекбокс. ⚠️ Дүрэм нь ЦЭВЭР модуль дотор (форм · шалгалт ·
 *    харуулалт ГУРВУУЛАА нэг эх сурвалж; `scripts/test-location-optional.mjs`)
 */
import {
  DEFAULT_CITY, NO_LOCATION_TITLE, NO_LOCATION_HINT, NO_LOCATION_SUMMARY,
  isNoLocation, locationMissing, noLocationPatch, bankedLocation,
  restoreLocationPatch, locationPathText,
} from '../lib/listingLocation.mjs';
/**
 * 🗺 ЗАРЫН ГАЗРЫН ЗУРГИЙН КООРДИНАТ (2026-10-06) — хэрэглэгчийн гомдол:
 *    «Газрын зураг дээр 📍 23-р хороо, Хан-Уул, Улаанбаатар … энэ зар чинь
 *    харагдахгүй байна даа».
 *    ⚠️ ШАЛТГААН: `components/MapView.jsx` нь зөвхөн `latitude`/`longitude`
 *    ТАЙ зарыг зурдаг байсан ч форм солбицол ОГТ цуглуулдаггүй байв ✗
 *    ✅ Одоо 2-р алхамд `unegui.mn` мэт пин-пикер (`LocationMapPicker`) ба
 *    дүүрэг сонгомогц газрын зураг тэр дүүргийн төв рүү автоматаар
 *    төвлөрнө. Солбицол нь `listings.latitude`/`longitude` (0001 — аль
 *    хэдийн байгаа багана) руу хадгалагдана ✓ (migration 0)
 *    ⚠️ Цэвэр дүрэм нь `lib/locationGeo.mjs` (`npm run test:location-map`)
 */
import { coordOf, hasCoords, districtCenter, khorooCenter, autoCenterFor, sameCoord, mapCenterFor, PICK_ZOOM, DEFAULT_MAP_ZOOM } from '../lib/locationGeo.mjs';
/**
 * 📋 GOOGLE MAPS «Copy link» → СОЛБИЦОЛ (2026-10-07) — хэрэглэгчийн хүсэлт:
 *    «… газрын зураг дээр заах хэсэг дээр оруулах сонголтоос гадна,
 *    нэмэлтээр google maps аас авсан Copy link ээ оруулдаг хэсэгтэй байвал
 *    болох уу» ⇒ пин тавих ХОЁР дахь гарц: линкээс солбицол задлана
 *    (`parseGoogleMapsLink` — цэвэр модуль, `npm run test:location-map`)
 *    ⚠️ DB ӨӨРЧЛӨЛТ 0 — аль хэдийн байгаа `latitude`/`longitude` руу бичнэ ✓
 */
import {
  parseGoogleMapsLink, isShortMapsLink,
  MAP_LINK_LABEL, MAP_LINK_PLACEHOLDER, MAP_LINK_BTN,
  MAP_LINK_OK, MAP_LINK_ERR, MAP_LINK_SHORT_HINT, MAP_LINK_RESOLVING,
} from '../lib/locationGeo.mjs';
/**
 * 🎯 АНГИЛАЛ УРЬДЧИЛАН БӨГЛӨХ (2026-10-06) — «Зар нэмэх» товч (`AppProviders`)
 *    нь хэрэглэгч аль ангилалд явж байсныг URL-д (`?section=…&category=…&type=…`)
 *    дамжуулна ⇒ форм тэр ангилал дээр СОНГОГДСОН байдлаар нээгдэнэ ✓
 *    (дэлгэрэнгүй дүрэм: `lib/listingPrefill.mjs` — цэвэр модуль, тесттэй ✓)
 */
import {
  listingPrefillFromSearch, applyPrefill, prefillMobileCatStep,
} from '../lib/listingPrefill.mjs';

// 🚗🌈 БРЭНДЭЭС ХАМААРАХ ЗАГВАР (2026-10-01) — зөвхөн ЭНЭ модулийн туслахууд:
//    `lookupMap` (талбарын `optionsMap`-аас сонголт), `cascadeAttrs`
//    (брэнд солигдоход хуучирсан загварыг цэвэрлэх НЭГ дүрэм — sidebar-тай ижил) ✓
import { lookupMap, cascadeAttrs } from '../lib/carModels.mjs';
// 📱 «Өрөө»-ний сонголтууд (мобайл drill-down) — ⚠️ шүүлтийн (sidebar) ЯГ ИЖИЛ
//    утга/шошго (`'1'`…`'5'`, «+5 өрөө») ашиглана: нэг эх сурвалж → зөрүү үгүй ✓
import { ROOM_VALUES, roomOptionLabel } from '../lib/roomFilter.mjs';
// 💳 «ТӨЛБӨРИЙН НӨХЦӨЛ» (2026-10-03) — ⚠️ шүүлтийн (sidebar/`HomeClient`) ЯГ
//    ИЖИЛ утга (`lease`/`cash`/`loan`/`barter`) ба шошго (`PAYMENT_OPTIONS`):
//    нэг эх сурвалж → sidebar-тай зөрүү гарахгүй ✓
//    `paymentTermsForAttrs(section, list)` — хадгалах дүрэм (`attrs.payment_terms`
//    массив эсвэл `null` ⇒ түлхүүр УСТАНА) нь бас нэг газар бичигдэнэ ✓
import {
  PAYMENT_OPTIONS, hasPaymentTerms, togglePaymentValue,
  countPayments, parsePaymentList, paymentTermsForAttrs, paymentOptionLabel,
} from '../lib/paymentFilter.mjs';
/**
 * 🔢🎡 СОНГОЛТТОЙ ТООН ТАЛБАР (2026-10-02) — хэрэглэгчийн хүсэлт: «…барилгийн
 *    давхар 1 2 3 4 … 26-аас сонгуулах … ашиглалтанд орсон он 1980-аас 2026 …
 *    эсвэл iPhone timer-ийн тоо сонгодог шиг» ⇒ 📱 мобайлд талбар дарахад
 *    iOS Timer маягийн ДУГУЙ (`WheelPicker`) нээгдэж, утгаа төвд нь гүйлгэн
 *    сонгоно; 🖥 ≥640px дээр гар бичилт ХЭВЭЭР ✓
 * ⚠️ Жагсаалтууд нь `lib/numberChoices.mjs` (цэвэр модуль) — форм/дугуй/тест
 *    БҮГД нэг эх сурвалжтай ✓
 */
import {
  YEAR_FROM, YEAR_TO, FLOOR_MAX, BATHROOM_MAX, PLUS_VALUE,
  countChoices, floorChoices, yearChoices, toChoiceItems, choiceText,
} from '../lib/numberChoices.mjs';
import WheelPicker from './WheelPicker';

/**
 * 🪜 «ЗАР НЭМЭХ» — ТУСДАА ХУУДАС (`/listings/new`) + АЛХАМТ ФОРМ (2026-10-01)
 *
 *  Хэрэглэгчийн хүсэлт: «бүх мэдээлэл оруулах талбарыг нэг дор харуулахгүй,
 *  хэсэг хэсгээр ойлгомжтой харуулах» ба «хэрэглэгчид ХААНА ЯВААГАА мэдэгдүүлэх»
 *  (unegui.mn / eBay загвар).
 *
 *  ⚠️ ӨМНӨ МОДАЛ байсан (`AddListingModal`) — одоо ТУСДАА ХУУДАС:
 *     • «хаана явж байна» нь URL (`/listings/new?step=2`) + breadcrumb +
 *       алхмын заагч (stepper) дээр ГУРВАНААС харагдана ✓
 *     • refresh / линк хуваалцсан ч тухайн алхам дээр нээгдэнэ ✓
 *     • засах горим: `/listings/new?edit=<id>` — зарыг id-аар татаж бөглөнө ✓
 *     • мобайл доод цэс / header товч нь `openAdd()` → энэ хуудас руу шилжүүлнэ
 *       (`AppProviders` → `router.push('/listings/new')`) ✓
 *
 *  ⚠️ Алхмууд нь ТОГТМОЛ 5 — хэсэг/дэд төрөл солигдоход тоо нь ХӨДӨЛӨХГҮЙ
 *     (тиймээс `form`-оос хамаарахгүй). «Дэлгэрэнгүй» алхам дээр тухайн хэсэгт
 *     тохирох талбарууд л харагдана; тохирох талбаргүй бол «Үргэлжлүүлэх»
 *     дарж болно (алдаа ГАРАХГҮЙ ✓).
 *  ⚠️ «Одоогийн алхам» нь URL-аас уншигдана (`step`), `setStep` гэж БАЙХГҮЙ ✓
 *     Дууссан алхам дээр дарж ХОЙШ буцаж болно (зөвхөн `i < step`).
 */
/**
 * ⚠️ 2026-10-01: `short` (алхамын товч тайлбар — «Юу зарах вэ?» …) ХАСАГДАВ —
 *    форм дотрох «1/5-Р АЛХАМ · Ангилал · Юу зарах вэ?» гарчиг бүхэлдээ
 *    хасагдсан тул ашиглагдахгүй болсон ✓ (git түүхэд хэвээр байна)
 */
/**
 * 📍 2026-10-01 — АЛХМЫН ДАРААЛАЛ СОЛИГДОВ (хэрэглэгчийн хүсэлт:
 *    «Байршлыг 3т биш 2т оруулдаг мэдээлэл болго, ингэхдээ 1т зар оруулж
 *    байгаатай адилхан форматтай болгоорой»): «📍 Байршил» нь 3-Р АЛХМААС
 *    **2-Р АЛХАМ** руу шилжиж, «📋 Дэлгэрэнгүй» 3-р алхам болов (бусдын
 *    байрлал хэвээр).
 *    ⚠️ УЧИРЛАЛТАЙ ЗАСВАРУУД (алхмыг `step` индексээр удирддаг тул):
 *       • `{step === N && ( … )}` блок бүр дээр N-ийг СОЛИНО ✓
 *       • `validateStep`/`firstInvalidStep` нь `STEPS[i].key`-ээр ажилладаг →
 *         өөрчлөлт ШААРДЛАГАГҮЙ (нэг эх сурвалж ✓)
 *       • URL хэрэглэгчид 1-based хэвээр: `?step=2` = **Байршил** ✓
 *       • `scripts/cdp-picker.mjs` ⑥⑦-г шинэ дугаарлалтад тааруулав ✓
 */
const STEPS = [
  { key: 'category', label: 'Ангилал' },
  { key: 'location', label: 'Байршил' },
  { key: 'details',  label: 'Дэлгэрэнгүй' },
  { key: 'price',    label: 'Үнэ' },
  { key: 'media',    label: 'Зураг' },
];

/**
 * 🖥 ≥640px (Tailwind-ийн `sm`) эсэхийг мэдэх жижиг hook (2026-10-05 (57)).
 *
 * ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ: 🖥 дээр «3-р алхам (📋 Дэлгэрэнгүй)» · «4-р алхам
 *    (💰 Үнэ + 📝 Тайлбар + ☎️ утас)» · «5-р алхам (🖼 Зураг)» нь НЭГ
 *    хуудас болж НЭГТГЭГДДЭГ (хэрэглэгчийн хүсэлт: «step 3, 4, 5-ыг нэг
 *    болго»), харин 📱 <640px дээр ХУУЧИН 5 дэлгэцээрээ (тусдаа) үлдэнэ.
 *    Тиймээс 3-р алхам (сүүлийн хуудас) дээрх доод товч нь 🖥 дээр
 *    «✅ Зар нийтлэх» (submit), 📱 дээр «Үргэлжлүүлэх →» (next) байх ёстой —
 *    ⚠️ энэ нь ЗӨВХӨН CSS-ээр шийдэгдэхгүй ✗ (товчны `type` ба бичиг
 *    ХОЁУЛАА өөр) ⇒ JS хэрэгтэй ✓
 * ⚠️ SSR ба эхний client render нь ХОЁУЛАА `false` (📱 хувилбар) гарна ⇒
 *    hydration зөрөхгүй ✓, дараа нь `useEffect` залруулна ✓
 *    (⏳ `initial = window.matchMedia…` гэвэл hydration mismatch ✗)
 * ⚠️ Эхний render-д (hydration-аас өмнө) 🖥 дээр 3-р алхамд товч
 *    «Үргэлжлүүлэх →» байж, дараа нь «✅ Зар нийтлэх» болж солигдоно —
 *    хормын ⏱ (хүлээн зөвшөөрөхүйц ✓)
 * 🔍 Хайх үг: useIsDesktop, lastStepIndex, нэгтгэсэн 3-р хуудас
 */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return isDesktop;
}

/** Зарын DB мөр → форм (засах горимд) */
function listingToForm(l) {
  return {
    category: l.category || 'sell',
    // ---- ХЭСЭГ ба attr (0016) ----
    section: l.section || 'real-estate',
    attrs: (l.attrs && typeof l.attrs === 'object') ? { ...l.attrs } : {},
    propertyType: l.property_type || '',
    rooms: l.rooms ? String(l.rooms) : '',
    // 💳 Төлбөрийн нөхцөл (2026-10-03) — `attrs.payment_terms` МАССИВ-аас
    //    ЦЭВЭР код болгож уншина (таслалтай мөр, ганц утга г.м. ч эвдрэхгүй ✓).
    //    ⚠️ `parsePaymentList` нь хүчингүй/хоосон утгыг ЧИМЭЭГҮЙ хасна ✓
    payments: parsePaymentList(l.attrs && l.attrs.payment_terms),
    area: l.area ? String(l.area) : '',
    // ⚠️ `|| DEFAULT_CITY` БИШ — байршилгүй зар (`city === ''`) нь засах
    //    горимд «Улаанбаатар» болж ХУУРАМЧ харагдах ёсгүй ✗; зөвхөн мөр
    //    бүтэн байхгүй (`undefined` — `select('*')` тул практикт байхгүй) үед
    //    анхдагчийг хэрэглэнэ ✓
    city: typeof l.city === 'string' ? l.city : DEFAULT_CITY,
    district: l.district || '',
    khoroo: l.khoroo || '',
    // 📍 «Байршил сонгохгүй» — DB-д ийм багана БАЙХГҮЙ (0 migration) тул
    //    зөвхөн хоосон хотоос сэргээнэ ✓ (`city === ''` ⇒ чекбокс асаалттай)
    noLocation: !l.city,
    // 🗺 Солбицол (2026-10-06) — газрын зураг дээрх пингийн утга.
    //    ⚠️ DB багана (0001) ХЭВЭЭР — зөвхөн форм руу уншина ✓
    latitude: typeof l.latitude === 'number' ? l.latitude : null,
    longitude: typeof l.longitude === 'number' ? l.longitude : null,
    price: l.price ? String(l.price) : '',
    // 🤝 «Үнэ тохирно» — үнэ 0/хоосон бол чекбокс асаалттай нээгдэнэ (lib/format.js)
    negotiable: isNegotiablePrice(l),
    priceType: l.price_type || 'total',
    phone: phoneEmail.toLocalPhone(l.phone),
    contactName: l.contact_name || '',
    // 🏷️ ЗАРЫН ГАРЧИГ (0027_listing_title.sql) — 3-р алхам (📋 Дэлгэрэнгүй).
    //    ⚠️ Хуучин зарууд дээр `null` байж болно → `''` (хоосон талбар ✓)
    title: l.title || '',
    description: l.description || '',
    // YouTube видео линк (0011). Хадгалагдсан нь КАНОНИК линк байна.
    videoUrl: l.video_url || '',
    // ---- Орон сууцны нэмэлт мэдээлэл ----
    buildYear: l.build_year ? String(l.build_year) : '',
    floor: l.floor ? String(l.floor) : '',
    totalFloors: l.total_floors ? String(l.total_floors) : '',
    balconies: l.balconies ? String(l.balconies) : '',
    hasGarage: l.has_garage === true ? 'yes' : l.has_garage === false ? 'no' : '',
    // Угаалгын өрөөний тоо (0012) — зөвхөн 3+ өрөөтэй орон сууц / АОС/хаус дээр
    bathrooms: l.bathrooms ? String(l.bathrooms) : '',
  };
}

/**
 * 🗺 Дүүрэг/хот солиход формын СОЛБИЦЛЫГ шинэ ТӨВ рүү шилжүүлэх нэмэлт.
 *
 * ⚠️ АВТОМАТ дүүргэлт (үндсэн гомдлын шууд шийдэл): хэрэглэгч газрын зураг
 *    дээр пин тавихгүй ч зар нь СОНГОСОН ДҮҮРГИЙН ТӨВ дээр газрын зураг дээр
 *    ГАРАХ болно ✓ (⏳ урьд нь форм солбицол цуглуулдаггүй тул форм-оос
 *    үүссэн БҮХ зар `latitude = null` болж, газрын зураг дээр ОГТ
 *    гарахгүй байв ✗)
 * ⚠️ Хэрэглэгч дараа нь `LocationMapPicker`-ээр пин тавибал ТҮҮНИЙ утга
 *    давамгайлна (энэ нь зөвхөн анхдагч/дүүрэг солих үеийн утга ✓)
 * @param {string} city @param {string} district
 * @returns {{latitude: number|null, longitude: number|null}}
 */
function centerPatch(city, district) {
  const c = districtCenter(city, district);
  return c ? { latitude: c.lat, longitude: c.lng } : { latitude: null, longitude: null };
}

/**
 * 🗺 Хороо сонгомогц СОЛБИЦЛЫГ тухайн хорооны ОЙРОЛЦОО төв рүү шилжүүлэх
 *    нэмэлт (2026-10-06 — 4 дэх засвар, хэрэглэгчийн хүсэлт: «хороо
 *    dropdown-той холбож, ойролцоо төвд ойртуулах»).
 *    ⇒ Хэрэглэгч дүүрэг + хороогоо сонгомогц зар нь зөвхөн ДҮҮРГИЙН төвд БИШ,
 *      тухайн ХОРООНЫ ойролцоо цэг дээр гарна ✓ (хороо тус бүр ялгаатай цэг)
 * ⚠️ Хороо тодорхойгүй бол дүүргийн төв хэвээр (`centerPatch`) — солбицол
 *    алдагдахгүй ✓
 * @param {string} city @param {string} district @param {string} khoroo
 * @returns {{latitude: number|null, longitude: number|null}}
 */
function khorooPatch(city, district, khoroo) {
  const c = khorooCenter(city, district, khoroo);
  return c ? { latitude: c.lat, longitude: c.lng } : centerPatch(city, district);
}

/**
 * 🗂 «КАТЕГОРИО СОНГОНО УУ» — unegui.mn загварын 3 БАГАНАТ сонголтын БАГАНА
 * (2026-10-01, хэрэглэгчийн хүсэлт: «Эхний хэсгийг ийм болго» — `unegui.mn/post_ad/`).
 *
 *  ⚠️ ЯАГААД `<select>` БИШ ВЭ: 12 хэсэг × 26 хүртэл дэд төрөл нь select-д
 *     «юу байгаа нь харагдахгүй» (зөвхөн нээсэн үед) — хэрэглэгч 3 түвшний
 *     модоо НЭГ ДЭЛГЭЦЭЭР харж, дараалан сонгох боломжтой боллоо ✓
 *
 *  ⚠️ 2026-10-01 (**4 ДЭХ ЗАСВАР**, хэрэглэгчийн хүсэлт: «сонгосон хэсгийг дээд
 *     талд нь ДАВХАР гаргаж байгааг болиё»): баганын ДЭЭД ЦЭНХЭР ТОЛГОЙ
 *     (`[data-picker-title]`) **БҮХЭЛДЭЭ ХАСАГДАВ** — сонгосон утга нь
 *     баганын ЖАГСААЛТЫН мөр дээр аль хэдийн цэнхэрээр (`aria-pressed`) байдаг
 *     тул толгойд дахин гарах нь ЗҮГЭЭР ДАВХАРДАЛ байв ✗
 *     ⇒ Сонгосон утга нь ЗӨВХӨН 2 газар харагдана: ① мөрийн цэнхэр дэвсгэр
 *        ② доорх «Сонгосон: …» дүгнэлтийн мөр (`[data-picker-summary]` /
 *        `[data-location-summary]`) ✓ — давхардал **0**
 *     ℹ️ `title` проп бүрэн хасагдсан (label3/level2-ийн `…Title` тооцооллууд ч
 *        хамт) — CDP нь одоо толгой ОГТ БАЙХГҮЙ (`[data-picker-title]` = 0)
 *        гэдгийг шалгана ✓
 *  @param {string}   [p.mobileLabel] 320–640px дээр гарах баганын жижиг шошго
 *     (`Хот / Аймаг`, `Дүүрэг / Сум`, `Төрөл` …) — `sm`-ээс ДЭЭШ ГАРАХГҮЙ ✓
 *     (сонгосон утга БИШ — тогтмол нэр тул давхардал үүсгэхгүй ✓)
 *  @param {string}   p.pickRole  `data-picker` утга (`section`|`level2`|`level3`) —
 *     ⚠️ CDP/тестийн тогтвортой selector (`[data-picker="section"] button`) ✓
 *  @param {Array}    p.items     `{ value, label, icon?, badge? }`
 *  @param {string}   p.value     сонгогдсон утга (`items[].value`-тай тэнцэнэ)
 *  @param {Function} p.onPick    утга сонгоход дуудагдана
 *  @param {string}   [p.emptyText] хоосон үеийн тайлбар
 *  @param {string}   [p.className] нэмэлт класс (баганын хүрээ/хуваалт)
 */
function PickerColumn({ pickRole, mobileLabel, items, value, onPick, emptyText = 'Дараагийн баганаас сонгоно уу', className = '' }) {
  return (
    <div data-picker={pickRole} className={`flex min-h-[220px] flex-col ${className}`}>
      {/* ⚠️ 2026-10-01 (4 дэх засвар) — ДЭЭД ЦЭНХЭР ТОЛГОЙ ХАСАГДАВ: толгойд
          гардаг байсан бичиг нь ЯГ доорх жагсаалтын цэнхэр мөртэй ижил
          (сонгосон утга) байсан тул давхардал үүсгэж байв ✗ */}
      {mobileLabel ? (
        <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400 sm:hidden">
          {mobileLabel}
        </div>
      ) : null}
      <ul className="max-h-[300px] flex-1 overflow-y-auto p-1">
        {items.length === 0 && (
          <li className="px-2.5 py-3 text-[12.5px] leading-snug text-gray-400">{emptyText}</li>
        )}
        {items.map((it) => {
          const active = it.value === value;
          return (
            <li key={it.value}>
              <button
                type="button"
                data-picker-value={it.value}
                onClick={() => onPick(it.value)}
                aria-pressed={active}
                className={`flex w-full items-center gap-1.5 rounded-md px-2.5 py-2 text-left text-[13px] leading-snug transition ${
                  active
                    ? 'bg-primary font-semibold text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {it.icon ? <span aria-hidden="true">{it.icon}</span> : null}
                <span className="min-w-0 flex-1">{it.label}</span>
                {typeof it.badge === 'number' && it.badge > 0 ? (
                  <span className={`shrink-0 rounded-full px-1.5 text-[10px] font-semibold ${active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {it.badge}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * 📱 «АСУУЛГА БҮР НЭГ ДЭЛГЭЦ» — МОБАЙЛ (<640px) DRILL-DOWN (2026-10-02)
 * ──────────────────────────────────────────────────────────────────────────
 * Хэрэглэгчийн хүсэлт: «гар утсаас зар оруулахад ийм асуудаг формоо нэг
 * нэгээр нь харуулаад яв» (unegui.mn/post_ad-ийн дэлгэцүүд) ⇒ мобайлд
 * сонголтууд нь БАГАНА БИШ, **ДЭЛГЭЦ БҮРД НЭГ АСУУЛТ** болж дараалан
 * харагдана: `Зар нийтлэх` → (сонгосон хэсэг) → (сонгосон бүлэг) → … мөр
 * бүр баруун талдаа `›` товчтой — unegui.mn-ийн ЯГ ИЖИЛ харагдац ✓
 *
 * ⚠️ ЗӨВХӨН `<640px` (`sm:hidden`) — 🖥 ≥640px дээр хуучин **3 БАГАНАТ**
 *    харагдац ХЭВЭЭР (CDP тестүүд (`scripts/cdp-picker.mjs`) тэнд ажиллана) ✓
 * ⚠️ `data-mobile-*` атрибутууд — CDP-ийн `[data-picker]` (=3) тоог
 *    хөндөхгүйн тулд ТУСДАА нэршил (`data-picker` ХЭРЭГЛЭХГҮЙ ✗)
 * ⚠️ Хайлтын талбар нь ЗӨВХӨН энэ дэлгэцийн жагсаалтыг шүүнэ (state нь
 *    компонентийн дотроо — дэлгэц солигдоход `key`-ээр шинээр монтажлагдана)
 * 🔍 Хайх үг: data-mobile-question, data-mobile-value, mobileCatStep, mobileLocStep
 */
function MobileQuestion({ title, items, value, onPick, onBack, emptyText = 'Сонголт байхгүй' }) {
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  const shown = needle
    ? items.filter((it) => String(it.label).toLowerCase().includes(needle))
    : items;
  return (
    <div data-mobile-question className="sm:hidden">
      {/* Толгой — ← (дээш алхмаар буцах) + юу асууж байгаа */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <button
          type="button"
          data-mobile-back
          onClick={onBack}
          aria-label="Буцах"
          className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-gray-700 active:bg-gray-100"
        >
          ←
        </button>
        <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold text-gray-900">{title}</h2>
      </div>
      {/* 🔎 Хайлт (unegui.mn-ийн «Хайх зүйлсээ бичнэ үү») */}
      <div className="relative mt-3">
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          🔍
        </span>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Хайх зүйлсээ бичнэ үү"
          aria-label="Хайх"
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>
      <ul className="mt-2">
        {shown.length === 0 && (
          <li className="px-1 py-4 text-[13px] text-gray-400">{emptyText}</li>
        )}
        {shown.map((it) => (
          <li key={it.value} className="border-b border-gray-100 last:border-b-0">
            <button
              type="button"
              data-mobile-value={it.value}
              aria-pressed={it.value === value}
              onClick={() => onPick(it.value)}
              className={`flex w-full items-center gap-2 px-1 py-3.5 text-left text-[15px] leading-snug ${
                it.value === value ? 'font-semibold text-primary' : 'text-gray-800'
              }`}
            >
              {it.icon ? <span aria-hidden="true">{it.icon}</span> : null}
              <span className="min-w-0 flex-1">{it.label}</span>
              <span aria-hidden="true" className="text-gray-300">›</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 📱 Мобайл drill-down-ийн «Алгасах» мөр (`rooms` нь заавал биш) — утга нь `''` */
const MOBILE_SKIP = '__skip__';

/**
 * 📝 Нооргийн авто-хадгалалтын ХҮЛЭЭЛТ (ms) — 2026-10-05 (54).
 * ⚠️ Хэт БАГА (0-100ms) бол гар бичилтийн ҮСЭГ БҮРД бичих болно (`localStorage`
 *    нь синхрон ⇒ том текст дээр гацах ✗); хэт ИХ (2с+) бол хэрэглэгч refresh
 *    хийх тэр мөчид сүүлийн үсгүүд бичигдээгүй үлдэж болно ✗
 * ⇒ 400ms нь «бичиж дуусаад» бичих баланс (мөн CDP тестийн 500ms хүлээлтэд
 *    багтана ✓)
 */
const DRAFT_SAVE_DELAY = 400;


/**
 * 🎡 УРТ жагсаалтад (ж: 📅 1980–2026 он = 48 мөр, 🏢 1–150 давхар = 151 мөр)
 *    «🎡 Гүйлгээд сонгох» товчийг ГАРГАНА — 2 баганат жагсаалт нь үндсэн
 *    сонголт (unegui.mn-ийн хэв ✓), харин маш урт жагсаалтыг гүйлгэхээс
 *    хурдан сонгох боломж ХЭВЭЭР (`WheelPicker` — 2026-10-02-ны хүсэлт) ✓
 * ⚠️ Богино жагсаалт (ж: ⚙️ Автомат/Механик, 🎨 12 өнгө) дээр товч ГАРАХГҮЙ —
 *    жагсаалт дангаараа хангалттай (илүүц товч ✗)
 */
const WHEEL_LINK_MIN = 40;

/**
 * 📱 2 БАГАНАТ СОНГОЛТЫН ЖАГСААЛТ — 3-р алхам (📋 Дэлгэрэнгүй), ЗӨВХӨН <640px
 * ──────────────────────────────────────────────────────────────────────────
 * 🎯 2026-10-03 (17) — хэрэглэгчийн хүсэлт: «chamd heden jishee zurag yawuulj
 *    bn. chi haraad iimerhuu bolgood ug doo» (unegui.mn-ийн мобайл формын
 *    6 зураг: `Нөхцөл` · `Төрөл` · `Хурд` · `Үйлдвэрлэсэн он`) ⇒ мобайлд
 *    сонголттой талбар нь «Сонгох» ТОВЧ (`choice-trigger` → iOS дугуй) эсвэл
 *    `<select>` БИШ, харин **2 баганат шууд дардаг жагсаалт** болов ✓
 *
 * ⚠️ Сонголт дээр ДАРАХАД утга бичигдээд ШУУД дараагийн асуулт руу шилжинэ
 *    (дэлгэцийн доорх «Алгасах / Үргэлжлүүлэх» товчнууд ХАРАГДАХГҮЙ —
 *    unegui.mn-ийн ЯГ ИЖИЛ зан). Тиймээс `onPick` нь «утга бичих + дараагийн
 *    дэлгэц» хоёуланг нь хийх ёстой (`pickDetail()` туслахыг үзнэ үү ✓)
 * ⚠️ Идэвхтэй сонголт нь `aria-pressed="true"` + өмнө нь `✓` (unegui-д цэнхэрээр
 *    ялгардаг — бидэнд брэнд өнгө + тод ✓)
 * ⚠️ Хоосон мөрийг (`'—'`) ЭНД ГАРГАХГҮЙ — утга цэвэрлэх нь «Алгасах»
 *    (`data-mobile-option-skip`) ✓
 * ⚠️ `data-mobile-option` нь CDP-ийн ТОГТВОРТОЙ selector (`scripts/cdp-*.mjs`)
 * ⚠️ ЗӨВХӨН `sm:hidden` — 🖥 ≥640px дээр хуучин `<select>`/гар бичилт ХЭВЭЭР ✓
 * 🔍 Хайх үг: MobileOptions, data-mobile-options, mob-option, 2 баганат жагсаалт
 */
function MobileOptions({ items = [], value = '', onPick, skip = false, onSkip }) {
  /** ⚠️ Хоосон мөр нь сонголт БИШ (цэвэрлэх нь «Алгасах») — хасаж харуулна ✓ */
  const rows = items.filter((it) => String(it.value) !== '');
  if (!rows.length) return null;
  return (
    <div data-mobile-options className="sm:hidden">
      <div className="mob-options" data-mobile-options-grid role="group">
        {rows.map((it) => {
          const on = String(value) === String(it.value);
          return (
            <button
              key={it.value}
              type="button"
              data-mobile-option={it.value}
              aria-pressed={on}
              onClick={() => onPick(it.value)}
              className={`mob-option${on ? ' mob-option-on' : ''}`}
            >
              {on ? <span aria-hidden="true">✓</span> : null}
              <span className="min-w-0 truncate">{it.label}</span>
            </button>
          );
        })}
      </div>
      {skip ? (
        <button type="button" data-mobile-option-skip onClick={onSkip} className="mob-skip">
          Алгасах
        </button>
      ) : null}
    </div>
  );
}

/**
 * 📱 «ӨМНӨХ ХАРИУЛТУУД» — 3-р алхмын толгойн ДОР (unegui.mn-ийн хэв, 2026-10-03)
 * ──────────────────────────────────────────────────────────────────────────
 * 🎯 Хэрэглэгчийн хүсэлт: «unegui.mn шиг: өмнөх хариултууд ✏️-тэй мөр болж,
 *    одоогийн асуултын сонголтууд 2 баганат шууд цэнхэр линк» ⇒ аль хэдийн
 *    хариулсан асуулт БҮР (ангилал · байршил · гарчиг · брэнд · он · …) нэг
 *    мөр болж, БАРУУН талын ✏️ дарж тэр дэлгэц рүү буцаж засна ✓
 *
 * ⚠️ ЗӨВХӨН хариулттай (хоосон БИШ) асуулт мөр болно (`rows`-ыг дуудагч шүүнэ)
 * ⚠️ ОДООГИЙН асуулт мөр болж ГАРАХГҮЙ — тэр нь доор асуугдаж байгаа ✓
 * ⚠️ `sm:hidden` — 🖥 ≥640px дээр хуучин харагдац ХЭВЭЭР ✓
 * ⚠️ `data-mobile-answer-edit` нь CDP-ийн ТОГТВОРТОЙ selector
 * 🔍 Хайх үг: MobileAnswers, data-mobile-answers, data-mobile-answer-edit, ✏️
 */
function MobileAnswers({ rows = [], onEdit }) {
  if (!rows.length) return null;
  return (
    <div data-mobile-answers className="sm:hidden">
      <ul className="mb-3">
        {rows.map((r) => (
          <li key={r.key} className="border-b border-gray-100 last:border-b-0">
            <button
              type="button"
              data-mobile-answer-edit={r.key}
              onClick={() => onEdit(r.key)}
              className="flex w-full items-center gap-2 py-2.5 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold leading-snug text-gray-900">{r.label}</span>
                {r.value ? (
                  <span className="mt-0.5 block truncate text-[15px] leading-snug text-gray-600">
                    {r.value}
                  </span>
                ) : null}
              </span>
              <span aria-hidden="true" className="shrink-0 text-gray-300">✏️</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 🖥 «СОНГОСОН АНГИЛАЛ · БАЙРШИЛ» — ≥640px ДЭЭР (2026-10-05)
 * ──────────────────────────────────────────────────────────────────────────
 * 🎯 Хэрэглэгчийн хүсэлт: «Зар нэмэх форм дээр сонгосон категори/байршил
 *    КОМПЬЮТЕР дээр харагдахгүй байна» ⇒ 📱 `MobileAnswers` (`sm:hidden`) нь
 *    ЗӨВХӨН <640px дээр байсан тул 🖥 1440px дээр 2-р алхмаас хойш (📋
 *    Дэлгэрэнгүй · 💰 Үнэ · 🖼 Зураг) юу сонгосноо харах газар БАЙХГҮЙ байв ✗
 *
 * ⚠️ ЗӨВХӨН ≥640px (`hidden sm:flex`) — 📱 дээр `MobileAnswers` ХЭВЭЭР ✓
 * ⚠️ 2026-10-05 (2 дахь засвар — «🖥 АЛХАМТ БУЦАВ»): «🖥 нэг урт хуудас»
 *    (бүх 5 алхам ЗЭРЭГ) нь АЛДАА байв ✗ — сонгосон категори/байршлын ХЭСЭГ
 *    дараагийн алхамд МӨН харагдаж, «өмнөх алхмын хэсэг дахин гарч ирэх»
 *    болсон тул ХҮЧИНГҮЙ БОЛОВ ⇒ 🖥 дээр ч 📱 шиг ЗӨВХӨН ОДООГИЙН алхам
 *    харагдана. Тиймээс хүснэгт нь `step`-ээр АЛХАМ АЛХМААР нээгдэнэ:
 *      • `step < 1` (🗂 Ангилал) → ГАРАХГҮЙ (сонгосон зам нь баганын цэнхэр
 *        мөр + `[data-picker-summary]` дээр бий — давхардал үүсгэхгүй ✓)
 *      • `step >= 1` → 🗂 Ангилал
 *      • `step >= 2` → 🗂 Ангилал + 📍 Зарын байршил
 * ⚠️ Утга нь формойн state-ээс ШУУД (`pickedCategoryPath`/`pickedLocationPath`)
 *    — шинэ DB багана / хадгалалт БАЙХГҮЙ ✓
 * ⚠️ `data-desktop-summary` — CDP/тестийн ТОГТВОРТОЙ selector ✓
 * 🆕 2026-10-05 (52, хэрэглэгчийн хүсэлт: «бусад мэдээлэл оруулах хэсэг гарч
 *    байгаа хуудсан дээрээс дээрх 2-оо засах боломжтой байх товч тус тусд
 *    нь»): мөр БҮРД ✏️ **Засах** товч нэмэгдэв — 🗂 Ангилал →
 *    `[data-desktop-summary-edit="category"]` (1-р алхам) · 📍 Зарын дэд
 *    байршил → `[data-desktop-summary-edit="location"]` (2-р алхам) ✓
 *    ⚠️ `type="button"` — хүснэгт нь `<form onSubmit>` ДОТОР тул `submit`
 *    болж кетэхээс сэргийлнэ ✓ · `onEdit` нь 📱 `MobileAnswers`-ийн
 *    `mobileAnswerEdit`-тай **НЭГ ЭХ СУРВАЛЖ** (`step-category` /
 *    `step-location` түлхүүрүүд — `gotoStep(0)`/`gotoStep(1)`) ✓
 * 🔍 Хайх үг: DesktopSummary, data-desktop-summary, data-desktop-summary-edit
 */
function DesktopSummary({ categoryPath, locationPath, step = 0, onEdit }) {
  // ⚠️ 1-р алхамд ОГТ ГАРАХГҮЙ — сонгосон зам нь 1-р алхмын picker-ийн
  //    цэнхэр мөр ба `[data-picker-summary]` дээр харагдана ✓
  if (step < 1) return null;
  /** ✏️ Засах товчны хэв — БҮХ мөрөнд ИЖИЛ (`mb-3` дор биш, жижиг pill) ✓
   *  🆕 2026-10-06 (6): НОГООН дэвсгэртэй болов (хэрэглэгчийн хүсэлт:
   *  «Засах гэсэн товчийг ногоон дэвсгэр өнгөтэй болгочих») — `btn-success`-тэй
   *  НЭГ ижил токен (`success` / `success-dark`) ⇒ апп даяар нэг ногоон ✓
   *  ⚠️ Хэмжээ/байрлал/`type="button"`/`data-desktop-summary-edit` ХӨНДӨӨГДӨӨГҮЙ ✓ */
  const editBtn = (key, label) => (
    <button
      type="button"
      data-desktop-summary-edit={key}
      onClick={() => onEdit && onEdit(key === 'category' ? 'step-category' : 'step-location')}
      aria-label={`${label} засах`}
      className="shrink-0 rounded-md border border-success-dark bg-success px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white transition hover:bg-success-dark"
    >
      ✏️ Засах
    </button>
  );
  return (
    <div
      data-desktop-summary
      className="mb-3 hidden flex-wrap items-center gap-x-5 gap-y-1.5 rounded-lg bg-gray-50 px-3 py-2.5 text-[13px] text-gray-600 sm:flex"
    >
      {/* ① 🗂 АНГИЛАЛ — `step >= 1` (Ангилал алхмаас хойш) + ✏️ Засах ✓ */}
      <span className="inline-flex items-center gap-1.5">
        <span>
          🗂 Ангилал:{' '}
          {categoryPath
            ? <b className="font-semibold text-gray-900">{categoryPath}</b>
            : <span className="text-gray-400">сонгоогүй</span>}
        </span>
        {editBtn('category', 'Ангиллыг')}
      </span>
      {/* ② 📍 БАЙРШИЛ — `step >= 2` (Байршил алхмаас хойш) + ✏️ Засах ✓ */}
      {step >= 2 && (
        <span data-desktop-summary-location className="inline-flex items-center gap-1.5">
          <span>
            📍 Зарын байршил:{' '}
            {locationPath
              ? <b className="font-semibold text-gray-900">{locationPath}</b>
              : <span className="text-gray-400">сонгоогүй</span>}
          </span>
          {editBtn('location', 'Байршлыг')}
        </span>
      )}
    </div>
  );
}

/** 📱 «Өрөөний тоо» дэлгэцийн мөрүүд — утга нь шүүлттэй ЯГ ИЖИЛ (`'1'`…`'5'`) ✓ */
const MOBILE_ROOM_ITEMS = [
  ...ROOM_VALUES.map((v) => ({ value: v, label: roomOptionLabel(v) })),
  { value: MOBILE_SKIP, label: 'Алгасах' },
];

/**
 * 💳 «ТӨЛБӨРИЙН НӨХЦӨЛ» — ЗААВАЛ сонгох мессеж (2026-10-03).
 * ⚠️ НЭГ ЭХ СУРВАЛЖ: 📱 `mobileDetailNext` (3-р алхмын дэлгэц солих) ба
 *    🖥 `validateStep('details')` (товч дарах) хоёулаа ЭНЭ мөрийг л ашиглана
 *    — өөр газарт дахин бичихгүй ✓ (`Зарын гарчигаа оруулна уу`-тай ижил
 *    зарчим: `validateStep('details')`-тэй нийцсэн байх ёстой)
 * ⚠️ ЗААВАЛ болгосон шалтгаан: хэрэглэгчийн хүсэлт «Зар оруулах үед
 *    хэрэглэгч үүнийг СОНГОЖ ӨГӨХ ЁСТОЙ» — тэмдэглээгүй зар дээр шүүлт
 *    (jsonb `cs`) ажиллахгүй тул хоосон орхигдуулахгүй ✓
 * ⚠️ ЗӨВХӨН ШИНЭ ЗАРД (`!isEdit`) — `Зарын гарчиг`-тай ЯГ ИЖИЛ: энэ
 *    функц орохоос өмнөх хуучин зарууд `attrs.payment_terms`-гүй тул
 *    засахад хэрэглэгчийг БЛОКЛОХГҮЙ ✓
 */
const PAYMENT_REQUIRED_MSG = 'Төлбөрийн нөхцөлөө сонгоно уу (олныг сонгож болно)';

/**
 * 🔢🎡 СОНГОЛТТОЙ ТООН ТАЛБАРЫН МӨРҮҮД (2026-10-02)
 *
 * Хэрэглэгчийн хүсэлт: «…барилгийн давхар 1 2 3 4 … 26-аас сонгуулах …
 * ашиглалтанд орсон он 1980-аас 2026 … эсвэл iPhone timer-ийн тоо сонгодог
 * шиг» ⇒ эдгээр нь модулийн түвшинд НЭГ УДАА бэлдэгдэнэ ✓
 *   • ⚡ `WheelPicker` нь `itemsKey`-ээр (утгуудын нийлбэр) эффектээ хянадаг
 *     тул мөрүүд ТОГТВОРТОЙ байх ёстой — render бүрд шинэ массив үүсгэвэл
 *     дугуй нээгдэх бүрд дахин байрлал тааруулж, мэдрэмж муудна ✗
 *   • ⚠️ `'—'` хэлбэрийн ХООСОН мөр нь ЗӨВХӨН ЗААВАЛ БИШ талбаруудад
 *     (iOS Timer-ийн зан — «сонгохгүй үлдээх» боломж ✓)
 * 🔍 Хайх үг: YEAR_ITEMS, FLOOR_ITEMS, BALCONY_ITEMS, BATHROOM_ITEMS
 */
const EMPTY_ROW = '—';
/** 📅 Онууд — `1980…2026`, БУУРАХ (шинэ он эхэнд) ✓ */
const YEAR_ITEMS = toChoiceItems(yearChoices(), { emptyLabel: EMPTY_ROW });
/** 🏢 Нийт давхар `1…150` (`FLOOR_MAX` — 2026-10-03-нд 26 → 150 болов) ✓ */
const FLOOR_ITEMS = toChoiceItems(countChoices(1, FLOOR_MAX), { emptyLabel: EMPTY_ROW });
/** 🌇 Тагт — `BALCONY_OPTIONS` (`1…4` ба «+5», нэг эх сурвалж) — desktop
 *  `<select>`-ийн шошготой ЯГ ижил («2 тагт», «+5 тагт») ✓ */
const BALCONY_ITEMS = toChoiceItems(BALCONY_OPTIONS, { emptyLabel: EMPTY_ROW, unit: 'тагт', plusValue: PLUS_VALUE });
/** 🚿 Угаалгын өрөө — `1, 2, 3, 4, +5` (`BATHROOM_MAX` = «+5» хүрээ) ✓ */
const BATHROOM_ITEMS = toChoiceItems(countChoices(1, BATHROOM_MAX), { emptyLabel: EMPTY_ROW, plusValue: PLUS_VALUE });

/**
 * 📅 Оны мөрүүд — хэрэв ОДООГИЙН утга хүрээнээс ГАДУУР байвал (ж: хуучин
 * зар «1965») түүнийг жагсаалтын ТӨГСГӨЛД нэмнэ ✓ — засах үед утга нь
 * ХӨДӨЛӨХГҮЙ, гэхдээ хэрэглэгч өөр он сонгож болно.
 * ⚠️ Хуучин утга байхгүй бол ДЭЭРХ ТОГТМОЛ массив буцаана (тогтвортой ✓)
 */
const yearItemsFor = (value) => {
  const v = String(value ?? '').trim();
  if (!v || YEAR_ITEMS.some((it) => it.value === v)) return YEAR_ITEMS;
  return toChoiceItems(yearChoices(YEAR_FROM, YEAR_TO, v), { emptyLabel: EMPTY_ROW });
};

/** 🏢 Давхрын мөрүүд — «Тухайн байрны давхар» нь НИЙТ ДАВХРААС хэтрэхгүй ✓ */
const floorItemsFor = (value, totalFloors) => {
  const list = floorChoices(totalFloors || FLOOR_MAX, String(value ?? '').trim());
  return toChoiceItems(list, { emptyLabel: EMPTY_ROW });
};

/**
 * 🎛 `choices` МЕТАТАЙ attr талбарын (`lib/locationData.js`) дугуйн мөрүүд/нэгж.
 * ⚠️ Одоогоор ийм талбар нь зөвхөн ОН (`type: 'number'`, `choices: YEAR_CHOICES`)
 *    тул он нь `yearItemsFor` (хүрээнээс гадуур хуучин утгыг хамгаална ✓);
 *    ирээдүйд `type: 'select' + choices` нэмэгдвэл `f.choiceUnit`-аар нэгж өгнө ✓
 */
const attrWheelItems = (f, value) => (f.type === 'number'
  ? yearItemsFor(value)
  : toChoiceItems(f.choices || [], { emptyLabel: EMPTY_ROW, unit: f.choiceUnit || '' }));

/** 🏷️ Дугуйн товч/мөр дээрх нэгж (`'он'` · `'давхар'` · `''`) */
const attrWheelUnit = (f) => f.choiceUnit || (f.type === 'number' ? 'он' : '');

/**
 * 🔢 СОНГОЛТТОЙ ТООН ТАЛБАР (2026-10-02) — форм дээрх НЭГ талбарын харагдац.
 *
 * 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «…жагсаалтаас сонгоод оруулдаг байя, жишээ нь
 *    барилгийн давхар 1 2 3 4 … 26-аас сонгуулах … эсвэл iPhone timer-ийн тоо
 *    сонгодог шиг хийж чадах уу» ⇒
 *      • 📱 `<640px`: сонголттой талбар нь 2 БАГАНАТ ШУУД ЖАГСААЛТ
 *        (`MobileOptions`, 2026-10-03 (17)); жагсаалт нь `WHEEL_LINK_MIN`-ээс
 *        урт үед нэмж «🎡 Гүйлгээд сонгох» холбоос гарна
 *        ⚠️ `mobileInput` үед энэ хоёрын оронд ГАР БИЧИЛТ (тоон оролт) шууд
 *        харагдана — 🆕 2026-10-05 (53) (ж: 📅 он · 🏢 нийт давхар · 🏠 давхар) ✓
 *      • 🖥 `≥640px`: ГАР БИЧИЛТ (`.hide-below-sm`-тэй; `mobileInput` үед тэр
 *        дүрэм ч хүчингүй) (`<input type="number">`, эсвэл
 *        `desktopControl="select"` бол `<select>`) ХЭВЭЭР ажиллана —
 *        desktop-ийн зан төлөв ХӨНДӨГДӨХГҮЙ ✓
 *
 * ⚠️ ХОЁР ХҮҮХЭД нь нэг `div` (флекс) дотор — `[data-form-row="details"]`
 *    мөрийн CDP геометрийн шалгалтууд (`scripts/cdp-picker.mjs`) нь мөр
 *    доторх ЭХНИЙ `input|select|textarea|div`-ийг хэмждэг тул тэр нь
 *    БҮТЭН ӨРГӨНТЭЙ флекс хүрээ байх ёстой ✓ (мобайлд ч, десктопд ч)
 * ⚠️ Утга нь ЯГ ИЖИЛ бичлэгээр (`'5'` текст) — форм/DB/URL хөндөгдөхгүй ✓
 * ⚠️ Хоосон утга → товч «Сонгох» (`data-empty="true"` — цайвар үсэг) ✓
 * 🔍 Хайх үг: ChoiceField, data-choice-trigger, data-choice-input, WheelPicker
 *
 * @param {string}   label     талбарын нэр (label)
 * @param {string}   [icon]    нэрийн өмнөх дүрс (ж: `'📅'`)
 * @param {string}   [hint]    оролтын доорх 💡 тайлбар
 * @param {string}   [wheelHint] дугуйн толгойд гарах тайлбар (хоосон бол `hint`)
 * @param {string}   value     одоогийн утга
 * @param {Array}    items     `[{ value, label }]` (дугуйн мөрүүд — хоосон
 *   мөр нь `value: ''` байж БОЛНО ✓)
 * @param {string}   [unit]    товч дээрх нэгж (ж: `'давхар'`, `'он'`)
 * @param {string}   [plusValue] «+5» ХҮРЭЭНИЙ утга (ж: `'5'`) — товч дээр
 *   «+5 тагт» / «+5 өрөө» гэж гаргана (`items`-ийн шошго нь ч мөн адил) ✓
 * @param {string}   [testId]  `data-choice-trigger`/`data-choice-input`-ийн утга
 * @param {string}   [placeholder] 🖥 гар бичилтийн placeholder
 * @param {number}   [min]/[max] 🖥 гар бичилтийн хязгаар
 * @param {string}   [desktopControl] `'select'` бол 🖥 дээр жагсаалт (ж: тагт)
 * @param {Function} onChange  утга солигдоход (🖥 бичих бүрд, 📱 дугуйнаас)
 * @param {Function} openWheel дугуйг нээх state setter (spec-ээ өөрөө бэлдэнэ)
 * @param {string}   [fieldKey] 📱 «нэг дэлгэцэд НЭГ талбар» (3-р алхам)-ийн
 *   түлхүүр → `.form-group` дээр `data-detail-field="…"` (CDP-ийн тогтвортой
 *   selector + `data-mobile-active`-ийн хамт) ✓
 * @param {boolean}  [mobileActive] талбар нь ОДООНЫ мобайл дэлгэц мөн эсэх —
 *   `false` үед 📱 <640px дээр `globals.css`-ийн дүрмээр `display:none`
 *   (🖥 ≥640px дээр ДҮРЭМ ҮЙЛЧЛЭХГҮЙ тул бүх талбар хэвээр ✓)
 * @param {boolean}  [mobileInput] 🆕 2026-10-05 (53) — `true` бол 📱 <640px
 *   дээр 2 баганат жагсаалт (`MobileOptions`) РЕНДЭРЛЭГДЭХГҮЙ, оронд нь
 *   `.hide-below-sm`-ГҮЙ ТООН ОРУУЛГА (гараас бичих) ШУУД харагдана;
 *   🎡 дугуйн холбоос ХЭВЭЭР (нэмэлт боломж). Зорилго: 📅 он · 🏢 нийт
 *   давхар · 🏠 давхар зэрэг УРТ жагсаалтыг мобайлд гараас бичих
 *   (хэрэглэгчийн хүсэлт 2026-10-05) ✓
 *   ⚠️ `pick: true`-той ХАМТ хэрэглэж БОЛОХГҮЙ: бичилт дээр `MobileOptions`
 *      байхгүй тул «дармагц дараагийн асуулт» боломжгүй ⇒ доод
 *      «Алгасах / Үргэлжлүүлэх» товч ГАРАХ ЁСТОЙ (`pick: false` ✓)
 */
function ChoiceField({
  label, icon = '', hint = '', wheelHint = '', value = '', items = [], unit = '',
  testId, placeholder = '', min, max, desktopControl = 'input', onChange,
  onPick, onSkip, openWheel, fieldKey = '', mobileActive, plusValue = '',
  mobileInput = false,
}) {
  /** 🎛 Товч/дугуй дээрх бичиг: `'5 давхар'` · `'2015 он'` · `'+5 тагт'` */
  const shown = choiceText(value, unit, plusValue);
  /** ⚠️ Жагсаалтад БАЙХГҮЙ хуучин утга — `<select>`-д мөр нэмнэ (алга болохгүй ✓) */
  const legacy = value && !items.some((it) => it.value === String(value)) ? String(value) : '';
  return (
    <div
      className="form-group"
      /* 📱 2026-10-02 — «нэг дэлгэцэд НЭГ талбар» (3-р алхам): `data-detail-field`
         нь CDP-ийн тогтвортой selector, `data-mobile-active="false"` нь 📱
         `<640px` дээр `globals.css`-ээр `display:none` (🖥 ≥640px хэвээр ✓) */
      data-detail-field={fieldKey || undefined}
      data-mobile-active={mobileActive === undefined ? undefined : (mobileActive ? 'true' : 'false')}
    >
      <label>{icon ? `${icon} ` : ''}{label}</label>
      <div className="flex w-full items-stretch gap-2">
        {/* ═ 🖥 ≥640px: ГАР БИЧИЛТ (өмнөх зан төлөв ХЭВЭЭР) ═ */}
        {desktopControl === 'select' ? (
          <select
            className="hide-below-sm min-w-0 flex-1"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-choice-input={testId}
          >
            <option value="">Сонгох</option>
            {legacy ? <option value={legacy}>{legacy}</option> : null}
            {items.filter((it) => it.value !== '').map((it) => (
              <option key={it.value} value={it.value}>{it.label}</option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            inputMode="numeric"
            /* ⚠️ `mobileInput` үед `.hide-below-sm` ХАСАГДАНА ⇒ 📱 <640px дээр
               ч ГАР БИЧИЛТ харагдана (🆕 2026-10-05 (53) ✓) */
            className={mobileInput ? 'min-w-0 flex-1' : 'hide-below-sm min-w-0 flex-1'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            min={min}
            max={max}
            data-choice-input={testId}
            data-mobile-input={mobileInput ? 'true' : undefined}
          />
        )}
        {/* ═ 📱 <640px: «Сонгох» ТОВЧ БАЙХГҮЙ — 2 баганат ШУУД жагсаалт
            (unegui.mn-ийн хэв, 2026-10-03 (17)). Сонголт дээр дарахад утга
            бичигдээд ШУУД дараагийн асуулт руу шилжинэ ✓ ═ */}
      </div>
      {/* 📱 <640px: 2 БАГАНАТ ШУУД ЖАГСААЛТ (`MobileOptions`) — ⚠️ `mobileInput`
          (🆕 2026-10-05 (53)) үед ОГТ рендэрлэгдэхгүй: оронд нь дээрх
          ГАР БИЧИЛТ (тоон оролт) л харагдана ✓ */}
      {mobileInput ? null : (
        <MobileOptions
          items={items}
          value={value}
          onPick={onPick || onChange}
          skip
          onSkip={onSkip}
        />
      )}
      {/* 🎡 УРТ жагсаалт (📅 1980–2026 он · 🏢 1–150 давхар) — 2 баганат
          жагсаалт нь үндсэн сонголт; гүйлгэхээс хурдан сонгох БОЛОМЖ
          ХЭВЭЭР үлдэнэ (`WheelPicker`, 2026-10-02-ны хүсэлт ✓) */}
      {items.length > WHEEL_LINK_MIN ? (
        <button
          type="button"
          data-choice-trigger={testId}
          data-empty={shown ? 'false' : 'true'}
          aria-haspopup="dialog"
          onClick={() => openWheel({
            title: `${icon ? `${icon} ` : ''}${label}`,
            items,
            value,
            hint: wheelHint || hint,
            onPick: onChange,
          })}
          className="mob-wheel-link sm:hidden"
        >
          🎡 Гүйлгээд сонгох
        </button>
      ) : null}
      {hint ? <p className="form-hint">{hint}</p> : null}
    </div>
  );
}

export default function AddListingClient() {
  const { user, profileName, authLoading } = useAuth();
  const { showToast } = useToast();
  const { openAuth, notifyListingsChanged } = useUI();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 🪜 URL-ААР УДИРДАНА: `/listings/new?step=2` (засах: `?edit=<id>`).
  //    ⚠️ Ингэснээр «хаана явж байна» нь ХАЯГ дээр ч харагдана, refresh хийсэн ч,
  //    линк хуваалцсан ч тухайн алхам дээр нээгдэнэ ✓ (модал байсан үеийн
  //    хэрэглэгчид хаана байгаагаа мэдэхгүй байсан гол дутагдлыг зассан)
  const editId = searchParams.get('edit') || '';
  const stepRaw = Number(searchParams.get('step') || '1');
  const step = Math.min(STEPS.length - 1, Math.max(0, (Number.isFinite(stepRaw) ? stepRaw : 1) - 1));
  /**
   * 🎯 УРЬДЧИЛСАН АНГИЛАЛ (`/listings/new?section=…&type=…`) — «Зар нэмэх»
   *    товч нь хэрэглэгч аль ангилалд явж байсныг энэ 2 параметрээр дамжуулна.
   *    ⚠️ `?step=` шиг URL-ААР удирдагдана: refresh/линк хуваалцсан ч,
   *    «Хамгаалалт» (`?step=`) буцах ч ангилал БИЧИГДСЭН хэвээр үлдэнэ ✓
   *    ⚠️ Засах горим (`?edit=`) дээр ХҮЧИНГҮЙ — DB-ийн зарын утга лавлагдана
   *    (`listingToForm`), тэгэхдээ `?edit=` линк дээр эдгээр параметр
   *    байхгүй тул `prefill` нь `{}` (нөлөөгүй ✓)
   */
  const prefill = listingPrefillFromSearch(searchParams.toString());

  const userId = user ? user.id : null;
  const displayName = profileName || (user && user.phone) || '';
  const userPhone = (user && user.phone) || '';

  // Засах горимд зарыг id-аар татна (шууд линк/refresh ч ажиллана)
  const [editing, setEditing] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const isEdit = !!(editing && editing.id);

  const emptyForm = () => ({
    category: 'sell',
    // ---- ХЭСЭГ ба attr (0016) — анхдагч нь үл хөдлөх ----
    section: 'real-estate',
    attrs: {},
    propertyType: '',
    rooms: '',
    // 💳 Төлбөрийн нөхцөл (2026-10-03) — ОЛОН сонголттой МАССИВ. Хоосон
    //    массив = сонгоогүй; хадгалах үед `paymentTermsForAttrs()` нь
    //    хэсэг дэмжихгүй/хоосон бол `null` ⇒ `attrs`-аас түлхүүр УСТАНА ✓
    payments: [],
    area: '',
    /**
     * 📍 БАЙРШИЛ (2026-10-06 — «Байршил сонгохгүй» чекбокс):
     *    ⚠️ `city: ''` + `noLocation: true` = «зар дээр байршил харагдахгүй».
     *    ⚠️ `emptyForm()`-ийн түлхүүрүүд нь нооргийн түлхүүрүүд
     *       (`Object.keys(emptyForm())`) тул `noLocation` нь ноорогт
     *       АВТОМАТААР орно ✓ (нооргийн ХУВИЛБАР хөндөх шаардлагагүй —
     *       хуучин ноорогт тэр түлхүүр байхгүй ⇒ `false` мэт уншигдана ✓)
     */
    city: DEFAULT_CITY,
    district: '',
    khoroo: '',
    noLocation: false,
    /**
     * 🗺 ГАЗРЫН ЗУРАГ ДЭЭРХ ПИН (2026-10-06) — `LocationMapPicker`-ийн утга.
     *    ⚠️ `null` = пин тавиагүй. `changeDistrict` нь дүүрэг сонгомогц энийг
     *       тухайн дүүргийн ТӨВөөр дүүргэнэ (зар газрын зураг дээр гарна ✓);
     *       хэрэглэгч пин тавибал тэр нь давамгайлна ✓
     *    ⚠️ DB талбар нь `latitude`/`longitude` (0001_schema — nullable) тул
     *       migration ХЭРЭГГҮЙ ✓
     */
    latitude: null,
    longitude: null,
    price: '',
    // 🤝 «Үнэ тохирно» — үнэ нь ЗААВАЛ БИШ (2026-09-29). Шинэ зар дээр
    //    анхдагчаар УНТРААЛТТАЙ (хэрэглэгч үнэ бичих нь элбэг ✓).
    negotiable: false,
    priceType: 'total',
    // ⚠️ ЗАСВАР: өмнө нь энд `displayName` (хэрэглэгчийн НЭР) орж байсан нь алдаа байв —
    // «Холбоо барих утас» талбарт нэр бөглөгдөж харагддаг байсан.
    // Одоо нэвтэрсэн хэрэглэгчийн БОДИТ утасны дугаарыг бөглөнө ('+97688093663' → '88093663').
    phone: phoneEmail.toLocalPhone(userPhone),
    // Нэр нь «Холбоо барих хүн» (contact_name) талбарт хэвээр — тэр талбар нуугдсан ч
    // зар хадгалахдаа нэрийг хамт хадгална.
    contactName: displayName || '',
    // 🏷️ ЗАРЫН ГАРЧИГ (0027_listing_title.sql) — ШИНЭ ЗАРД ЗААВАЛ
    //    (`validateStep('details')`), карт дээр үнийн доор харагдана ✓
    title: '',
    description: '',
    videoUrl: '', // YouTube линк (сонголтоор) — Storage-д файл хадгалахгүй
    // ---- Орон сууцны нэмэлт мэдээлэл ----
    buildYear: '',    // Ашиглалтанд орсон он
    floor: '',        // Тухайн байр хэдэн давхарт
    totalFloors: '',  // Барилгын нийт давхар
    balconies: '',    // Тагтны тоо (1-4)
    hasGarage: '',    // '' | 'yes' | 'no'
    bathrooms: '',    // Угаалгын өрөөний тоо (3+ өрөө / АОС/хаус)
  });

  const [form, setForm] = useState(emptyForm);
  const [pending, setPending] = useState([]); // {file,url} — шинээр нэмэх зурагнууд
  const [existingImages, setExistingImages] = useState([]); // засах үед үлдээх хуучин зургууд
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false); // 🗜 зураг шахаж байна
  const [lastReport, setLastReport] = useState(null); // сүүлийн шахалтын тайлан
  const [error, setError] = useState('');
  /**
   * 🗂 3 БАГАНАТ сонголт (2026-10-01) — 2 дахь баганад дарагдсан БҮЛЭГ (3 дахь
   *    түвшин). ⚠️ ЗӨВХӨН бүлэгтэй хэсэгт (💻 computers, ⚡ electric, 🛠️ services)
   *    ашиглагдана; хавтгай хэсэгт `''` хэвээр (багана 2 нь шууд дэд төрөл) ✓
   * ⚠️ Сонгосон LEAF (`form.propertyType`) нь тусад нь `form` дотор байгаа тул
   *    давхар хадгалахгүй ✓ — `openGroup` нь зөвхөн «аль бүлэг нээлттэй вэ»-г л
   *    хэлнэ (`useEffect` доор — засах горимд бүлгийг автоматаар нээнэ ✓)
   */
  const [openGroup, setOpenGroup] = useState('');
  /**
   * 📱 Мобайл (<640px) drill-down-ийн «аль дэлгэц дээр байна» (2026-10-02) —
   *    ⚠️ ТҮВШНИЙ ДУГААР БИШ, ТҮЛХҮҮР (`'section'`/`'category'`/`'group'`/
   *    `'subtype'`/`'rooms'`, `'city'`/`'district'`/`'khoroo'`) хадгална: түвшин
   *    нь сонголтоос хамаарч 2–4 дэлгэц болж ХУВИРДАГ (ж: бүлэгтэй хэсэгт
   *    «Дэд бүлэг» нэг дэлгэц нэмэгдэнэ) тул тоо нь эвдрэхэд амар ✗
   *    🖥 ≥640px дээр эдгээр нь ХЭРЭГЛЭГДЭХГҮЙ (баганат харагдац хэвээр) ✓
   */
  const [mobileCatStep, setMobileCatStep] = useState('section');
  const [mobileLocStep, setMobileLocStep] = useState('city');
  /**
   * 📱 3-р алхам (📋 Дэлгэрэнгүй)-ийн МОБАЙЛ дэлгэц (2026-10-02) — 1 ба 2-р
   *    алхам шиг «асуулт бүр НЭГ ДЭЛГЭЦ» болгов (хэрэглэгчийн хүсэлт: «зарын
   *    гарчиг, талбай, угаалгын өрөө, ашиглалтанд орсон он … бүгдийг нь нэг
   *    нэгээр нь харуул»). Утга нь `detailScreens[].key` (`'title'`,
   *    `'area'`, `'buildYear'` …).
   *    ⚠️ ТҮВШНИЙ ДУГААР БИШ ТҮЛХҮҮР — сонгосон хэсэг/төрлөөс хамаарч дэлгэцийн
   *       тоо ХУВИРДАГ (ж: 🏠 Газар дээр зөвхөн «Зарын гарчиг») тул тоо эвдрэхэд
   *       амар ✗ (1/2-р алхмын `mobileCatStep`/`mobileLocStep`-тэй ЯГ ИЖИЛ зарчим)
   *    ⚠️ Жагсаалтад байхгүй түлхүүр (ж: хэсэг солигдсоны дараа) → эхний дэлгэц ✓
   *    🖥 ≥640px дээр ЭНЭ нь ажиллахгүй: бүх талбарыг харуулна (`data-mobile-active`
   *       дүрэм нь зөвхөн `<640px` media query дотор ✓)
   */
  const [mobileDetailStep, setMobileDetailStep] = useState('title');
  /**
   * 🔢🎡 СОНГОЛТТОЙ ТООН ТАЛБАРЫН ДУГУЙ (2026-10-02) — нэг л дугуй байна, түүнд
   *    ОДОО нээлттэй талбарын бүх мэдээлэл (`{title, items, value, hint,
   *    onPick}`) хадгалагдана ✓ (талбар бүрд тусдаа state хийвэл 6+ ширхэг
   *    болж, «аль дугуй нээлттэй вэ» логик хүндэрнэ ✗)
   *    ⚠️ `null` = хаалттай (DOM-д огт гарахгүй ✓); `onPick` нь тухайн
   *       талбарын `set(...)`-ийг барьсан closure тул дахин render хийхэд
   *       ч зөв талбарт бичнэ ✓ — туршилтаар (CDP) шалгасан
   */
  const [wheel, setWheel] = useState(null);
  const baselineRef = useRef(''); // анхны төлөв (өөрчлөгдсөн эсэхийг шалгах)
  // ══════════════════════════════════════════════════════════════════════
  // 📝 НООРОГ (2026-10-05, 54) — санамсаргүй REFRESH / апп солихоос хамгаалалт
  //    ⚠️ `localStorage` (session биш): 📱 дээр хэрэглэгч апп сольж, browser
  //       память чөлөөлөхөд session-ийг ХААЖ болно — тэгэхэд ноорог алга болно ✗
  //    ⚠️ Түлхүүр нь ХЭРЭГЛЭГЧ БҮРД (мөн засах горимд ЗАР БҮРД) тусдаа —
  //       нэг утсан дээр хэдэн хүн нэвтэрдэг тул холилдох ёсгүй ✓
  //    ℹ️ Ноорог нь зөвхөн ТЕКСТ талбаруудыг хадгална: зураг (`File`) нь
  //       `localStorage`-д багтахгүй — зөвхөн ТОО нь сануулга болж үлдэнэ ✓
  /** localStorage-ийн түлхүүр (`''` = нэвтрээгүй ⇒ огт бичихгүй ✓) */
  const draftStorageKey = draftKey(userId, editId);
  /** 📝 «Ноорог сэргээгдлээ» мэдэгдэл (`null` = байхгүй ⇒ DOM-д ГАРАХГҮЙ ✓) */
  const [draftNotice, setDraftNotice] = useState(null);
  /**
   * ⚠️ СЭРГЭЭЛТ ДУУССАН эсэх — яагаад STATE ВЭ (ref биш):
   *    «Хамгаалалт» (`?step=` → эхний дутуу алхам) нь эффект дотор
   *    `firstInvalidStep()`-ийг ДУУДДАГ ба тэр нь форм ХООСОН үед 1-р алхам
   *    руу буцаадаг. Ноорог сэргээлт нь `setForm`-оор хожуу ирдэг тул
   *    сэргээлт дуусахаас өмнө хамгаалалт ажиллавал хэрэглэгч refresh бүрд
   *    1-р алхмаас ЭХЭЛНЭ ✗ (ноорог байсан ч). Тиймээс хамгаалалт нь энэ
   *    флагыг хүлээнэ ✓ (ref байвал дахин render үүсэхгүй ⇒ эффект дахин
   *    ажиллахгүй ✗ — state нь ЗААВАЛ)
   */
  const [draftReady, setDraftReady] = useState(false);
  /** Нэг л удаа сэргээх (`editId`/хэрэглэгч солигдоход дахин ажиллана ✓) */
  const draftCheckedRef = useRef('');
  /**
   * ⚠️ Зар АМЖИЛТТАЙ хадгалагдсаны дараа авто-хадгалалтыг ЗОГСООНО.
   *    `handleSubmit` нь нооргийг `removeItem`-ээр устгадаг ч, хэрэглэгч
   *    сүүлийн талбараа бичээд 400ms (`DRAFT_SAVE_DELAY`)-ийн дотор
   *    «Нийтлэх» дарсан бол ТЭР timer хожуу ажиллаж, нийтлэгдсэн зарын
   *    мэдээллийг ноорог болгож ДАХИН бичих байсан ✗ ⇒ дараагийн удаа
   *    «📝 ноорог сэргээгдлээ» гэж дэмий гарч ирнэ
   */
  const draftDoneRef = useRef(false);

  /**
   * 🖥🪜📄 3, 4 ба 5-Р АЛХАМ НЭГ БОЛОВ — ЗӨВХӨН 🖥 ДЭЭР (2026-10-05 (57),
   *    хэрэглэгчийн хүсэлт: «step 1, 2 нь тусдаа хуудас — энэ зөв; step 3 нь
   *    1, 2-ын араас орж ирдэг; харин step 3, 4, 5-ыг НЭГ болго»).
   *
   * ⚠️ ЮУ СОЛИГДОВ: 🖥 ≥640px дээр форм нь **3 хуудастай** болов —
   *    ① Ангилал → ② Байршил →
   *    **③ 📋 Дэлгэрэнгүй + 💰 Үнэ + 📝 Тайлбар + ☎️ утас + 🖼 Зураг**
   *    (нэгтгэсэн) ⏳ өмнө нь 🖥 дээр ч 5 хуудас байв
   *    (③ Дэлгэрэнгүй · ④ Үнэ+Тайлбар · ⑤ Зураг) ✗
   * ⚠️ 📱 <640px дээр ХӨНДӨГДӨХГҮЙ — 3-р алхам «асуулт бүр нэг дэлгэц» +
   *    4 дэх дэлгэц (💰 Үнэ ба 📝 Тайлбар) + 5 дахь дэлгэц (🖼 Зураг) ✓
   * ⚠️ `STEPS` массив (5) ХЭВЭЭР — зөвхөн 🖥 дээрх СҮҮЛИЙН ХУУДАСНЫ индекс
   *    (`lastStepIndex`) 2 болно ✓ (алхмын ШАЛГАЛТ (`validateStep`) нь
   *    `STEPS[i].key`-ээр ажилладаг тул ХӨНДӨГДӨХГҮЙ ✓ — 📱 дээрх 5 дахь
   *    алхам ч (`media` → утас) хэвээр ✓)
   * ⚠️ Блокны харагдац нь ЗӨВХӨН CSS-ээр шийдэгдэнэ (`hidden sm:block`) ⇒
   *    SSR дээр ч 🖥-ийн нэгтгэсэн хуудас ЗӨВ гарна ✓ (hydrate хүлээхгүй ✓)
   * ⚠️ Бүх талбар НЭГ хуудсанд байгаа ч алхмын ШАЛГАЛТ ХЭВЭЭР: «Зар
   *    нийтлэх» дархад `handleSubmit` → `firstInvalidStep()` нь 3, 4, 5-р
   *    алхмыг ДАРААЛАН шалгаж, дутуу талбарыг ЗААЖ өгнө ✓
   * 🔍 Хайх үг: lastStepIndex, нэгтгэсэн 3-р хуудас, hidden sm:block
   */
  const isDesktop = useIsDesktop();
  /** 🖥 дээр 2 (нэгтгэсэн ③), 📱 дээр 4 (5 дахь дэлгэц) — сүүлийн хуудас */
  const lastStepIndex = isDesktop ? STEPS.length - 3 : STEPS.length - 1;


  // 🪜 Хуудас ачаалахад: нэвтэрсэн бол шинэ/засах формыг бэлдэнэ.
  //    «Одоогийн алхам» нь URL-аас (`?step=`) уншигдана — энд `setStep` БАЙХГҮЙ ✓
  useEffect(() => {
    if (authLoading || !userId) return undefined;

    if (!editId) {
      /**
       * 🎯 УРЬДЧИЛСАН АНГИЛАЛ (2026-10-06) — «Зар нэмэх» товчийг дарахад
       *    URL-д ирсэн ангилал (`?section=…&type=…`) формо дээр ШУУД
       *    сонгогдоно (`applyPrefill` — хүчингүй утгыг хаяна ✓).
       *    ⚠️ БҮЛЭГ нь автоматаар нээгдэнэ — доорх `useEffect`
       *    (`findSubtypeGroup`) `openGroup`-ыг дэд төрлөөс олдог ✓
       *    ⚠️ Анхдагч (`baselineRef`) нь Ч БӨГЛӨГДСӨН форм байна ⇒ зөвхөн
       *    урьдчилсан утгатай форм нь «бохир» БИШ (ноорог бичигдэхгүй ✓)
       */
      const initial = applyPrefill(emptyForm(), prefill);
      setEditing(null);
      setForm(initial);
      setPending([]);
      setExistingImages([]);
      setError('');
      // 📱 <640px: дэд төрөл сонгогдсон бол ШУУД «Төрөл» дэлгэцээс эхэлнэ
      setMobileCatStep(prefillMobileCatStep(prefill));
      baselineRef.current = JSON.stringify(initial);
      setLoadingEdit(false);
      return undefined;
    }

    let mounted = true;
    setLoadingEdit(true);
    (async () => {
      try {
        const l = await fetchListingById(editId);
        if (!mounted) return;
        if (!l) { setError('Зар олдсонгүй эсвэл устгагдсан байна.'); return; }
        if (l.user_id !== userId) { setError('Энэ зарыг засах эрх танд байхгүй.'); return; }
        setEditing(l);
        const initial = listingToForm(l);
        setForm(initial);
        setPending([]);
        setExistingImages(Array.isArray(l.images) ? l.images : []);
        setError('');
        baselineRef.current = JSON.stringify(initial);
      } catch (err) {
        if (mounted) setError((err && err.message) || 'Зарыг татахад алдаа гарлаа');
      } finally {
        if (mounted) setLoadingEdit(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId, editId]);

  /**
   * 📝 НООРОГ СЭРГЭЭХ (2026-10-05, 54) — хуудас дахин ачаалагдмагц (refresh,
   *    📱 апп солих, browser-ийн «память чөлөөлөх» …) localStorage-д үлдсэн
   *    утгыг формоо буцааж тавина ✓
   *
   * ⚠️ ДАРААЛАЛ ЧУХАЛ: энэ нь ДЭЭРХ «формыг бэлдэх» эффектийн ДАРАА
   *    бичигдсэн (React нь эффектүүдийг дарааллаар нь ажиллуулна) — тиймээс
   *    `emptyForm()` / `listingToForm(l)` утгыг дарж, нооргийн утга ЛАВЛАГДАНА ✓
   * ⚠️ `authLoading`/`loadingEdit` дуустал ХҮЛЭЭНЭ: засах горимд зарын утга
   *    татагдаж дуусахаас өмнө сэргээвэл DB-ийн утга нооргийг дарна ✗
   * ⚠️ `draft.form` нь whitelist-ээр шүүгдсэн (зөвхөн форм-ийн мэдэгдэж буй
   *    түлхүүрүүд) — `{...f, ...draft.form}` нь танихгүй түлхүүр оруулахгүй ✓
   */
  useEffect(() => {
    if (authLoading || !userId || !draftStorageKey) return;
    if (loadingEdit) return; // 🛠 засах горим: зарын утга ирэхийг хүлээнэ
    if (draftCheckedRef.current === draftStorageKey) return; // ⚠️ нэг л удаа
    draftCheckedRef.current = draftStorageKey;

    let raw = null;
    try { raw = window.localStorage.getItem(draftStorageKey); } catch { raw = null; }
    /** 🧹 Нооргийг устгана (Safari private / квот дүүрсэн ч алдаа шидэхгүй ✓) */
    const drop = () => { try { window.localStorage.removeItem(draftStorageKey); } catch { /* ignore */ } };

    const draft = parseDraft(raw, { keys: Object.keys(emptyForm()), editId });
    if (!draft) {
      // ⚠️ Эвдэрсэн / хуучирсан / өөр хэрэглэгч-зарын ноорог → ХОГ үлдээхгүй ✓
      if (raw) drop();
      setDraftReady(true);
      return;
    }
    // ⚠️ Анхдагч (шинэ) эсвэл DB-ийн (засах) утгатай ЯГ ИЖИЛ бол сэргээх
    //    юмгүй — тэр үед бас устгана ✓ (`baselineRef` нь дээрх эффектэд тавигдсан)
    if (!isMeaningfulDraft(draft, baselineRef.current)) {
      drop();
      setDraftReady(true);
      return;
    }

    setForm((f) => ({ ...f, ...draft.form }));
    // 📱 3-р алхмын «аль асуулт дээр байсан» — асуултын түлхүүр нь хадгалагдана
    //    (⚠️ буруу/хуучирсан түлхүүр нь эхний дэлгэц рүү унана — код нь
    //    `findIndex < 0 → 0` хамгаалалттай ✓)
    if (draft.mobileDetailStep) setMobileDetailStep(draft.mobileDetailStep);
    setDraftNotice({ pendingCount: draft.pendingCount, savedAt: draft.savedAt });
    setDraftReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId, loadingEdit, editId, editing, draftStorageKey]);

  /**
   * 💾 НООРОГ БИЧИХ (авто-хадгалалт) — форм ХӨДЛӨХ бүрд (debounce) localStorage
   *    руу бичнэ. Хэрэглэгч «Хадгалах» товч ДАРАХ ШААРДЛАГАГҮЙ — 📱 дээр товч
   *    дарах боломжгүй мөч (refresh/апп солих) байдаг тул АВТОМАТ ✓
   *
   * ⚠️ `draftReady` дуустал ЮУ Ч ХИЙХГҮЙ (бичих ч, УСТГАХ ч БИШ):
   *    эс бөгөөс сэргээлт эхлэхээс өмнө «форм анхдагчтай тэнцүү» гэж үзээд
   *    нооргийг устгачихна ✗ (форм эхний commit-д хоосон байдаг)
   * ⚠️ `!isDirty()` (анхдагч/DB-ийн утгатай ижил) → ноорог УСТГАНА: бүх талбараа
   *    цэвэрлэсэн хэрэглэгчид дараагийн удаа «сэргээгдлээ» гэж гарахгүй ✓
   * ⚠️ Зураг (`pending`) нь зөвхөн ТООГООР хадгалагдана — `File` объект
   *    `localStorage`-д орохгүй (мэдэгдэл нь хэрэглэгчид сануулна ✓)
   */
  useEffect(() => {
    if (authLoading || loadingEdit || !userId || !draftStorageKey || !draftReady) return undefined;
    const t = setTimeout(() => {
      try {
        if (draftDoneRef.current) return; // ⚠️ зар НИЙТЛЭГДСЭН — ноорог хэрэггүй ✓
        if (!isDirty()) { window.localStorage.removeItem(draftStorageKey); return; }
        const raw = serializeDraft({
          form,
          keys: Object.keys(emptyForm()),
          pendingCount: pending.length,
          mobileDetailStep,
          editId,
        });
        if (raw) window.localStorage.setItem(draftStorageKey, raw);
      } catch { /* ⚠️ Safari private горим / квот — чимээгүй өнгөрөөнө ✓ */ }
    }, DRAFT_SAVE_DELAY);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftReady, authLoading, loadingEdit, userId, editId, draftStorageKey, form, pending, existingImages, mobileDetailStep]);


  /**
   * 🗂 3 БАГАНАТ сонголт — сонгосон ДЭД ТӨРЛИЙН БҮЛГИЙГ автоматаар нээнэ.
   * ⚠️ Засах горимд (`?edit=<id>`) `form.propertyType` нь ХОЖИМ (fetch дууссаны
   *    дараа) бөглөгддөг тул `useState`-ийн анхны утгаар шийдэж болохгүй ✗ —
   *    effect-ээр синк хийнэ ✓
   * ⚠️ Хэрэглэгч 2 дахь баганаас БҮЛЭГ дээр дарахад `propertyType` ХӨДӨЛӨХГҮЙ
   *    (зөвхөн `openGroup` солигдоно) тул энэ effect түүнийг ДАРАХГҮЙ ✓
   */
  useEffect(() => {
    const s = form.section || 'real-estate';
    const g = findSubtypeGroup(s, form.propertyType);
    if (g) { setOpenGroup(g.label); return; }
    // ⚠️ Доод түвшингүй бүлэг («💻 Чихэвч») нь ӨӨРӨӨ leaf тул
    //    `findSubtypeGroup` нь `null` буцаана — тэр тохиолдлыг тусад нь барина ✓
    const leaf = getSubtypeGroups(s).find((x) => !x.items.length && x.label === form.propertyType);
    if (leaf) setOpenGroup(leaf.label);
  }, [form.section, form.propertyType]);

  const originalImageCount = isEdit && Array.isArray(editing.images) ? editing.images.length : 0;
  const isDirty = () =>
    JSON.stringify(form) !== baselineRef.current ||
    pending.length > 0 ||
    existingImages.length !== originalImageCount;

  /**
   * Хуудсаас гарах. ⚠️ Оруулсан мэдээлэл алдагдахаас сэргийлж: өөрчлөлт байвал
   * баталгаажуулна. ⚠️ Модал байсан тул `onClose()` байсныг ОДОО NAVIGATION
   * болгосон (`/my-listings` эсвэл нүүр хуудас) ✓
   * 📝 2026-10-05 (54): гарахад оруулсан мэдээлэл нь НООРОГ болж `localStorage`-д
   *    ҮЛДЭНЭ (алга болохгүй ✓) — тиймээс мессеж нь «УСТАНА» биш, «ноорог
   *    болж хадгалагдана» гэж хэлнэ (хэрэглэгчийг төөрөгдүүлэхгүй ✓)
   */
  const goHome = () => router.push(isEdit ? '/my-listings' : '/');
  const requestCancel = () => {
    if (submitting) return;
    if (isDirty() && !window.confirm('Оруулсан мэдээлэл НООРОГ болж ХАДГАЛАГДАНА — дараа нь энэ хуудсанд орход «📝 Хадгалагдсан ноорог сэргээгдлээ» гэж буцаж ирнэ. Гарахдаа итгэлтэй байна уу?')) {
      return;
    }
    goHome();
  };

  /**
   * 🗑 «Ноорог устгах» (2026-10-05, 54) — мэдэгдэл дээрх товч. localStorage-ийн
   *    нооргийг устгаад, формоо АНХДАГЧ (шинэ зар) эсвэл DB-ийн (засах) утга
   *    руу буцаана ✓
   * ⚠️ Зөвхөн ТЕКСТ талбарууд устна — сонгосон зургууд (`pending`) нь сэргээлтэд
   *    ороогүй байсан тул энд ч хөндөхгүй үлдээнэ (`baselineRef`-ийг шинэчилснээр
   *    «өөрчлөгдсөн» төлөв зөв тооцоологдоно ✓)
   */
  const discardDraft = () => {
    try { window.localStorage.removeItem(draftStorageKey); } catch { /* ignore */ }
    const initial = isEdit ? listingToForm(editing) : emptyForm();
    setForm(initial);
    baselineRef.current = JSON.stringify(initial);
    setDraftNotice(null);
    setMobileDetailStep('title');
    setWheel(null);
    setError('');
    if (!isEdit) gotoStep(0);
  };


  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /**
   * 💳 ТӨЛБӨРИЙН НӨХЦӨЛ — нэг дарж нэмэх/хасах (checkbox мэт, ОЛОН сонголт).
   * ⚠️ Дүрэм нь `lib/paymentFilter.mjs → togglePaymentValue()` (нэг эх
   *    сурвалж — sidebar-ийн `togglePayments`-тай ЯГ ИЖИЛ) ✓
   * ⚠️ `set('payments', …)` БИШ — өмнөх утга дээр тулгуурлана ✓
   */
  const togglePayment = (value) => setForm((f) => ({ ...f, payments: togglePaymentValue(f.payments, value) }));

  /**
   * 📍 Байршил сонгохгүй — 2-р алхмын ЧЕКБОКС (2026-10-06, хэрэглэгчийн
   *    хүсэлт: «зарим хэрэглэгч зарын Байршилаа оруулахыг хүсэхгүй хүн байж
   *    магадгүй … Байршил хэсэгт “Байршил хэрэглэхгүй” гэсэн сонголт оруулъя»)
   *
   * ⚠️ Төлөв нь ЗӨВХӨН `form.noLocation` — `city === ''` ганцаараа
   *    «сонгоогүй» (алдаа) ба «заахгүй гэж ШИЙДСЭН» гэсэн ХОЁРЫГ ялгаж
   *    чадахгүй ✗ (дүрэм: `lib/listingLocation.mjs → locationMissing`)
   *    ⇒ `validateStep('location')` нь чекбоксоор дамжина ✓
   *
   * АСААХАД: хот/дүүрэг/хороо ЦЭВЭРЛЭГДЭнэ (`noLocationPatch`) ба өмнөх
   *    сонголт нь `bankedLocationRef`-д хадгалагдана ✓
   * УНТРААХАД: хадгалагдсан байршил (эсвэл анхдагч хот) БУЦАЖ ирнэ
   *    (`restoreLocationPatch`) — «хоосон орхиод дараа нь алдаа харуулах» нь
   *    хэрэглэгчийг төөрөгдүүлэх тул сонгов ✓
   * ⚠️ DB рүү `noLocation` ЯВАХГҮЙ: `handleSubmit` нь формыг бүтнээр
   *    `payload` болгоно ч `lib/queries.js → listingPayloadToRow()` нь
   *    танихгүй түлхүүрийг ШҮҮН ХАЯНА ⇒ DB өөрчлөлт/migration 0 ✓
   */
  const bankedLocationRef = useRef(null);
  const toggleNoLocation = (on) => {
    setError('');
    if (on) {
      bankedLocationRef.current = bankedLocation(form);
      setForm((f) => ({ ...f, ...noLocationPatch() }));
      // 📱 Drill-down-ийг эхний дэлгэц рүү буцаана — чекбокс унтраахад
      //    «Хот/Аймаг» дэлгэцээс эхэлнэ (дунд дэлгэц дээр гацахгүй ✓)
      setMobileLocStep('city');
      return;
    }
    setForm((f) => ({ ...f, ...restoreLocationPatch(bankedLocationRef.current) }));
    bankedLocationRef.current = null;
  };

  /**
   * 🗺 Хот/дүүрэг солиход хуучин пин ХҮЧИНГҮЙ — шинэ дүүргийн ТӨВ рүү
   *    шилжинэ (`centerPatch` — 2026-10-06). Ингэснээр пин тавиагүй ч зар
   *    газрын зураг дээр сонгосон дүүрэг дээрээ гарна ✓
   */
  const changeCity = (city) => setForm((f) => ({
    ...f, city, district: '', khoroo: '', ...centerPatch(city, ''),
  }));
  const changeDistrict = (district) => setForm((f) => ({
    ...f, district, khoroo: '', ...centerPatch(f.city, district),
  }));
  /**
   * 🗺 Хороо солиход солбицлыг ТУХАЙН ХОРООНЫ ойролцоо төв рүү шилжүүлнэ
   *    (2026-10-06 — 4 дэх засвар, хэрэглэгчийн хүсэлт «хороо dropdown-той
   *    холбож, ойролцоо төвд ойртуулах»).
   * ⚠️ Хэрэглэгч өөрөө пин ТАВЬСАН бол (солбицол нь авто төвөөс ЯЛГААТАЙ)
   *    түүнийг ХӨНДӨХГҮЙ — зөвхөн хороог солино ✓ (пин давамгайлна)
   */
  const changeKhoroo = (khoroo) => setForm((f) => {
    const cur = coordOf(f);
    const isAuto = !cur || sameCoord(cur, autoCenterFor(f));
    return isAuto
      ? { ...f, khoroo, ...khorooPatch(f.city, f.district, khoroo) }
      : { ...f, khoroo };
  });

  const districts = getDistricts(form.city);
  const khoroos = getKhoroos(form.city, form.district);

  /**
   * 📍⏭ «Байршил сонгохгүй» чекбокс асаалттай эсэх (2026-10-06) — зөвхөн
   *    ОДООГИЙН алхам/хураангуйн харагдацад нөлөөлнө (🖥 багана идэвхгүй,
   *    📱 дэлгэцүүд гарахгүй, хураангуй текстийн өнгө) ✓
   * ⚠️ Дүрэм нь ЦЭВЭР модуль дотор (`isNoLocation`) — шалгалт (`locationMissing`)
   *    ба нооргийн сэргээлттэй ЯГ ижил эх сурвалж ✓
   */
  const noLoc = isNoLocation(form);

  /* ==========================================================================
     🗺 ГАЗРЫН ЗУРАГ ДЭЭРХ ПИН (2026-10-06) — `LocationMapPicker`
     --------------------------------------------------------------
     ⚠️ ЯАГААД ЭНД (2-р алхам): хэрэглэгч байршлаа сонгосон даруйд газрын
        зургийг нээж, зөв цэг дээр пин тавих боломжтой (unegui.mn-ийн адил) ✓
     ⚠️ Солбицол нь ЗААВАЛ БИШ — `null` бол зар газрын зураг дээр гарахгүй;
        гэхдээ `changeDistrict` нь дүүргийн төвөөр автоматаар дүүргэдэг тул
        пин тавиагүй ч зар дүүрэг дээрээ ойролцоогоор харагдана ✓
     ========================================================================== */
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const mapPickCenter = mapCenterFor(form);
  const mapPickSubtitle = locationPathText(form) || 'Байршлаа газрын зураг дээр заана уу';
  const mapPickZoom = (hasCoords(form) || form.district) ? PICK_ZOOM : DEFAULT_MAP_ZOOM;
  /** ✅ Пин-пикерээс сонгосон солбицлыг форм руу бичих */
  const applyMapPick = (coords) => {
    setForm((f) => ({ ...f, latitude: coords.lat, longitude: coords.lng }));
    setMapPickerOpen(false);
  };
  /** 🗑 Пингүй болгох (солбицлыг цэвэрлэнэ) */
  const clearMapPick = () => setForm((f) => ({ ...f, latitude: null, longitude: null }));
  /**
   * 📋 GOOGLE MAPS ЛИНКЭЭС СОЛБИЦОЛ (2026-10-07) — хэрэглэгчийн хүсэлт:
   *    пин тавихаас ГАДНА, Google Maps-ийн «Copy link»-ийг тавьж бас болно.
   *    ⚠️ Линк өөрөө ХАДГАЛАГДАХГҮЙ — зөвхөн `lat`/`lng` нь задарч
   *    `form.latitude`/`longitude` руу бичигдэнэ (DB migration 0 ✓)
   *    🆕 (2026-10-07) БОГИНО линк (`maps.app.goo.gl/…`): хөтөч дээр солбицол
   *    өгдөггүй тул СЕРВЕР (`/api/resolve-map-link`) дамжиж задална —
   *    амжилттай бол солбицол бичигдэнэ, эс бөгөөс `MAP_LINK_SHORT_HINT` ✓
   */
  const [mapLink, setMapLink] = useState('');
  const [mapLinkMsg, setMapLinkMsg] = useState({ kind: '', text: '' });
  const changeMapLink = (value) => {
    setMapLink(value);
    if (mapLinkMsg.kind) setMapLinkMsg({ kind: '', text: '' });
  };
  const applyMapLink = async () => {
    const raw = mapLink.trim();
    if (!raw) {
      setMapLinkMsg({ kind: '', text: '' });
      return;
    }
    // ① ШУУД задалж үзнэ (бүрэн линк / «lat,lng» текст)
    const c = parseGoogleMapsLink(raw);
    if (c) {
      setForm((f) => ({ ...f, latitude: c.lat, longitude: c.lng }));
      setMapLinkMsg({ kind: 'ok', text: MAP_LINK_OK });
      return;
    }
    // ② БОГИНО линк (`maps.app.goo.gl/…`) — СЕРВЕРЭЭР задална (2026-10-07)
    if (isShortMapsLink(raw)) {
      setMapLinkMsg({ kind: 'loading', text: MAP_LINK_RESOLVING });
      try {
        const res = await fetch(`/api/resolve-map-link?url=${encodeURIComponent(raw)}`);
        const data = await res.json();
        if (data && data.ok && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
          setForm((f) => ({ ...f, latitude: data.lat, longitude: data.lng }));
          setMapLinkMsg({ kind: 'ok', text: MAP_LINK_OK });
          return;
        }
      } catch (e) { /* сүлжээний алдаа — доор зөвлөмж гаргана */ }
      setMapLinkMsg({ kind: 'err', text: MAP_LINK_SHORT_HINT });
      return;
    }
    // ③ Солбицолгүй энгийн текст
    setMapLinkMsg({ kind: 'err', text: MAP_LINK_ERR });
  };
  /**
   * 🗺 Одоогийн солбицол нь АВТОМАТ (ойролцоо) төв — хороо/дүүрэг/хот —
   *    эсэх (хэрэглэгч пин тавиагүй). UI дээр «(ойролцоо)» гэж ялгаж
   *    харуулахад хэрэглэнэ ✓ (2026-10-06: хороо сонгомогц ч ойролцоо)
   */
  const mapPickIsApprox = (() => {
    const c = coordOf(form);
    if (!c) return false;
    return sameCoord(c, autoCenterFor(form));
  })();

  /* ==========================================================================
     📍 2-Р АЛХАМ («Байршил») — 3 БАГАНАТ СОНГОЛТ (2026-10-01, хэрэглэгчийн
     хүсэлт: «Байршлыг 3т биш 2т оруулдаг мэдээлэл болго, ингэхдээ 1т зар оруулж
     байгаатай адилхан форматтай болгоорой»).
     ⚠️ Формат нь 1-р алхмын `PickerColumn`-той ЯГ ИЖИЛ — `<select>` БИШ:
        ① Хот / Аймаг  ② Дүүрэг  ③ Хороо — 🆕 2026-10-05: БҮХ хэсэгт 3 багана
        Багана бүрийн мөр дээр дарахад сонгогдоно (1-р алхамтай ижил зан төлөв ✓)
     ⚠️ 2026-10-01 (4 дэх засвар): ДЭЭД ЦЭНХЭР ТОЛГОЙ ХАСАГДАВ (1-р алхамтай
        хамт) — сонгосон утга нь зөвхөн мөрийн цэнхэр дэвсгэр + доорх
        «Сонгосон: 📍 … » мөрөнд харагдана ✓
     ⚠️ Дараалсан сонголт: хот солиход дүүрэг+хороо, дүүрэг солиход хороо
        ЦЭВЭРЛЭГДЭНЭ (дээрх `changeCity`/`changeDistrict`) — 1-р алхмын
        «бүлэг солиход leaf цэвэрлэгддэг» зантай ижил ✓
     ========================================================================== */
  const cityItems = CITIES.map((c) => ({ value: c, label: c }));
  const districtItems = districts.map((d) => ({ value: d, label: d }));
  const khorooItems = khoroos.map((k) => ({ value: k, label: k }));

  // ===== ХЭСЭГ ба ATTR (0016) =====
  // ⚠️ `real-estate` нь уламжлалт: дэд төрөл нь `PROPERTY_TYPES`, нэмэлт
  //    талбарууд нь `rooms`/`floor`/`build_year` … тусдаа БАГАНА дээр.
  //    Бусад хэсэг (авто/ажил/компьютер/бараа/үйлчилгээ) нь `attrs` jsonb.
  const isRealEstate = (form.section || 'real-estate') === 'real-estate';
  const subtypes = getSubtypes(form.section || 'real-estate');
  /**
   * 🛠 БҮЛГҮҮД (3 дахь түвшин, 2026-09-27) — зөвхөн `services` хэсэгт.
   * ⚠️ Формд `optgroup` болгож харуулна: 30 дэд төрөл нь нэг хавтгай
   *    `<select>`-д ойлгомжгүй болно ✗; `optgroup` нь браузерын төрөлх
   *    бүлэглэлт (нэмэлт CSS/JS шаардлагагүй ✓).
   * ⚠️ Доод түвшингүй бүлэг (ж: «Хэвлэл, реклам, медиа») нь ШУУД
   *    сонгогдох `<option>` болно (тэр нь хамгийн доод түвшин).
   * ⚠️ Бүлгийн `collapsed` туг (💻 компьютерийн 4 бүлэг, 2026-09-29) нь
   *    ЗӨВХӨН шүүлтийн панелийн (`HomeClient`) харагдацын анхдагч төлөв —
   *    формд ХҮЧИНГҮЙ ✓: энд бүх 45 дэд төрөл `<optgroup>`-оор бүгд
   *    харагдана (хэрэглэгч зар нэмэхдээ бүх сонголтыг харах ёстой ✓)
   */
  const subtypeGroups = getSubtypeGroups(form.section || 'real-estate');

  /* ==========================================================================
     🗂 3 БАГАНАТ «КАТЕГОРИО СОНГОНО УУ» — unegui.mn загварын СОНГОЛТ (2026-10-01)
     ──────────────────────────────────────────────────────────────────────────
     Хэрэглэгчийн хүсэлт: «Эхний хэсгийг ийм болго» (`unegui.mn/post_ad/`).
     ⚠️ ӨМНӨ нь 2–3 `<select>` байсныг 3 БАГАНАТ жагсаалт болгов:
        ① ХЭСЭГ (12)  ② «Зарах/Түрээслэх» (зөвхөн үл хөдлөх) эсвэл БҮЛЭГ
        эсвэл хавтгай дэд төрөл  ③ LEAF дэд төрөл
     ⚠️ 2026-10-01 (4 дэх засвар): багана БҮРИЙН ДЭЭД ТОЛГОЙ ХАСАГДАВ — толгойд
        гарч байсан бичиг нь доорх жагсаалтын цэнхэр мөртэй ЯГ ИЖИЛ (сонгосон
        утга) байсан тул давхардал үүсгэж байв ✗ (хэрэглэгчийн хүсэлт:
        «сонгосон хэсгийг дээд талд нь ДАВХАР гаргаж байгааг болиё»).
        Сонгосон утга нь зөвхөн ① мөрийн цэнхэр дэвсгэр ② доорх «Сонгосон: …»
        мөрөнд харагдана ✓
     ⚠️ Хавтгай хэсэгт (`subtypeGroups` хоосон) 3 дахь багана ГАРАХГҮЙ ✓
     ========================================================================== */
  const sectionValue = form.section || 'real-estate';
  const sectionDef = getSection(sectionValue);
  const sectionItems = SECTIONS.map((s) => ({ value: s.value, label: s.label, icon: s.icon }));
  /** «Зарах / Түрээслэх» — ⚠️ ЗӨВХӨН үл хөдлөхөд (`hasCategoryChoice`).
   *  ⚠️ «Бүгд» (`all`) нь зарын формд УТГАГҮЙ — зар нь үргэлж `sell`/`rent` тул хасна ✓ */
  const showCategoryChoice = hasCategoryChoice(sectionValue);
  const categoryItems = getSectionCategories(sectionValue)
    .filter((c) => c.value !== 'all')
    .map((c) => ({ value: c.value, label: c.label }));
  const hasGroups = subtypeGroups.length > 0;
  /** 3 дахь багана харагдах эсэх (бүлэгтэй хэсэг эсвэл үл хөдлөх) */
  const hasThirdColumn = showCategoryChoice || hasGroups;
  /* ② дахь багана — үл хөдлөх: «Зарах/Түрээслэх»; бүлэгтэй: БҮЛЭГ; бусад: дэд төрөл */
  const level2Items = showCategoryChoice
    ? categoryItems
    : hasGroups
      ? subtypeGroups.map((g) => ({ value: g.label, label: g.label, badge: g.items.length }))
      : subtypes.map((t) => ({ value: t, label: getPropertyTypeLabel(t, form.category) }));
  const level2Value = showCategoryChoice ? form.category : hasGroups ? openGroup : form.propertyType;
  /* ③ дахь багана (leaf) — үл хөдлөх: бүх төрөл; бүлэгтэй: нээлттэй бүлгийн item-үүд */
  const level3Items = showCategoryChoice
    ? subtypes.map((t) => ({ value: t, label: getPropertyTypeLabel(t, form.category), icon: PROPERTY_TYPE_ICONS[t] || '' }))
    : (subtypeGroups.find((g) => g.label === openGroup)?.items || []).map((t) => ({ value: t, label: t }));
  /**
   * ⚠️ 2026-10-01 (**4 дэх засвар**): баганын толгой (`columnTitleOf` /
   *    `level2Title` / `level3Title`) БҮХЭЛДЭЭ ХАСАГДАВ — хэрэглэгчийн хүсэлт
   *    «сонгосон хэсгийг дээд талд нь ДАВХАР гаргаж байгааг болиё». Толгойд
   *    гарч байсан бичиг нь ЯГ доорх жагсаалтын цэнхэр мөртэй ижил байсан тул
   *    давхардал байв ✗. Сонгосон утга нь ① мөрийн цэнхэр дэвсгэр ② доорх
   *    «Сонгосон: …» мөрөнд харагдана ✓ (ℹ️ (3 дахь засварын «сонгосон
   *    категорио баганын толгойд харуул» хүсэлт энэ засвараар ХҮЧИНГҮЙ болов)
   */
  const selectedLeafLabel = form.propertyType ? getPropertyTypeLabel(form.propertyType, form.category) : '';
  /**
   * 🥖 БҮТЭН ЗАМНЫ «БҮЛЭГ» хэсэг — сонгосон leaf нь аль бүлэгт харьяалагдах вэ.
   * ⚠️ Чихэвч шиг доод ТҮВШИНГҮЙ бүлэг нь ӨӨРӨӨ leaf тул `findSubtypeGroup` NULL
   *    буцаана — `''` болж, замд «Чихэвч › Чихэвч» гэж ДАВХАРДАХГҮЙ ✓
   */
  const selectedGroupLabel = form.propertyType
    ? (findSubtypeGroup(sectionValue, form.propertyType)?.label || '')
    : '';

  /** ① ХЭСЭГ солих — дэд төрөл/attr цэвэрлэнэ, «Зарах/Түрээслэх» зөвхөн үл хөдлөхөд */
  const pickSection = (next) => {
    // ⚠️ 2 дахь баганын «нээлттэй бүлэг» нь хэсэг бүрд ӨӨР байна — заавал
    //    цэвэрлэнэ (эс бөгөөс шинэ хэсэгт хоосон/буруу багана гарна ✗)
    setOpenGroup('');
    setForm((f) => ({
      ...f,
      section: next,
      propertyType: '',
      attrs: {},
      // 💳 Төлбөрийн нөхцөл (2026-10-03) — шинэ хэсэгт ХҮЧИНГҮЙ (ж: «Ажил»
      //    хэсэгт лизинг гэж байхгүй) тул `attrs`-тай ХАМТ цэвэрлэнэ ✓
      payments: [],
      // ⚠️ «Зарах / Түрээслэх» нь зөвхөн үл хөдлөхөд — бусад хэсэгт `sell` болж буцна ✓
      category: hasCategoryChoice(next) ? f.category : 'sell',
    }));
  };

  /** ② Баганаас сонгох — БҮЛЭГ дээр дарахад ЗӨВХӨН нээнэ (leaf биш) ✓ */
  const pickLevel2 = (v) => {
    if (showCategoryChoice) { set('category', v); return; }
    if (!hasGroups) { set('propertyType', v); setOpenGroup(''); return; }
    const g = subtypeGroups.find((x) => x.label === v);
    if (!g) return;
    setOpenGroup(v);
    // ⚠️ Доод түвшингүй бүлэг («💻 Чихэвч», «⚡ Хөргөгч, хөлдөөгч») нь ӨӨРӨӨ
    //    leaf болно — `propertyType`-д хадгалагдана (хуучин `<select>`-ийн зан ✓)
    if (!g.items.length) { set('propertyType', v); return; }
    // ⚠️ Өөр бүлэг рүү шилжихэд хуучин leaf нь тэр бүлэгт БАЙХГҮЙ бол цэвэрлэнэ
    //    (эс бөгөөс «2-р багана А бүлэг, доорх сонголт Б бүлгийн leaf» → зөрүү ✗)
    if (!g.items.includes(form.propertyType)) set('propertyType', '');
  };

  /**
   * Тухайн хэсгийн attr талбарууд (форм автоматаар үүсгэнэ).
   *
   * ⚠️ 2026-09-30 (6): `getAttrFields(section, subtype)` — талбар нь
   *    `onlySubtypes` жагсаалттай бол ЗӨВХӨН тэр дэд төрөлд харагдана
   *    (💻 Notebook-ийн Дэлгэц/CPU/RAM/Хард — хэрэглэгчийн хүсэлт ✓).
   *    `onlySubtypes` байхгүй талбар нь өмнөх шигээ бүх дэд төрөлд ✓
   */
  const attrFields = getAttrFields(form.section || 'real-estate', form.propertyType);
  /**
   * 💼 АЖЛЫН ЗАРТ «ҮНЭ» БИШ — ЦАЛИН (2026-10-03 (9), хэрэглэгчийн хүсэлт).
   * ⚠️ Хэрэглэгч: «Жич Энд Үнэ биш Цалин байх юм шүү хавсралтыг хараарай» ⇒
   *    4-р алхмын үнийн талбар нь ажлын зар дээр «Цалингийн хэмжээ» болж,
   *    «Үнэ тохирно» чекбокс нь «Цалин тохиролцоно» болно ✓
   *    (уншигдах текст 3 газар — доор нэг л удаа тодорхойлж хэрэглэнэ)
   */
  const jobsSection = form.section === 'jobs';
  const priceFieldTitle = jobsSection ? 'Цалингийн хэмжээ' : 'Үнэ';
  const priceNegotiableText = jobsSection ? NEGOTIABLE_SALARY_LABEL : NEGOTIABLE_PRICE_LABEL;

  /**
   * ⚡ ХЯЛБАР ФОРМ (2026-09-29, хэрэглэгчийн хүсэлт; ⚠️ 2026-09-30 (5)-д өргөжсөн) —
   *    `lib/locationData.js` → `hasSimpleForm(section)`. Одоогоор 7 хэсэг:
   *    ⚽ `hobby` (**«Спорт бараа»** — 19 дэд төрөл; ✏️ 2026-10-07 (51)), 🧺 `home` (Гэр ахуйн бараа —
   *    «мөн адил ийм форматтай болго»), ⚡ `electric` (Цахилгаан бараа), 🧱
   *    `construction` (Барилгын материал), 🏭 `equipment` (Тоног төхөөрөмж) ба
   *    🆕 🛋️ `furniture` (Тавилга) / 🧳 `travel` (Аяны бараа — 2026-09-30 (5)-д
   *    «Аяллын хэрэгсэл»-ээс тусдаа хэсэг болсон ✓).
   * ⚠️ Ийм хэсэгт форм нь ЗӨВХӨН байршил (хот + дүүрэг + **хороо**) ·
   *    шинэ/хуучин · үнэ · утас · тайлбар · зураг асууна — ЗӨВХӨН 🎥 YouTube
   *    видео линк ХАРАГДАХГҮЙ (хэрэглэгчийн хүсэлт: «зөвхөн … асуудаг байя»).
   * 🆕 2026-10-05: **ХОРОО нь `simpleForm`-оос ХАМААРАХГҮЙ болов** —
   *    хэрэглэгчийн гомдол: «Барилгын материалын зар оруулхад Улаанбаатарын
   *    дүүргийн хороо оруулах хэсэг гарч ирэхгүй байна» ⇒ байршил нь БҮХ
   *    хэсэгт ЯГ ИЖИЛ 3 шат (Хот/Аймаг → Дүүрэг → Хороо) ✓
   * ⚠️ ХАДГАЛАХ үед далд талбарын ХУУЧИН утга УСТАХГҮЙ (payload-д
   *    `form`-оосоо хэвээр явна) — зөвхөн UI-д харагдахгүй ✓
   * ⚠️ 2026-10-01: «Дэлгэрэнгүй хаяг» (`addressDetail`) БҮРЭН ХАСАГДАВ —
   *    форм · DB бичилт · хайлт · админ/экспорт БҮГДЭЭС (хэрэглэгчийн
   *    хүсэлт: «бүр байхгүй болго, дахин ашиглахгүй») ✓
   */
  const simpleForm = hasSimpleForm(form.section || 'real-estate');

  /**
   * 🔗 ХАМААРАЛТАЙ (cascading) attr утга тавих — 🚗 форм (2026-10-01).
   *
   * ⚠️ Форм дээрх БҮХ attr талбар энэ функцээр утгаа тавина (энгийн `setAttr`
   *    БАЙХГҮЙ — `optionsFrom` БАЙХГҮЙ талбарт нь дээрх «хүү» давталт хоосон
   *    ажиллаад ЗӨВХӨН өөрийн утгаа тавина ✓, тул нэг л зам байх нь
   *    зөрүү үүсгэхгүй).
   *
   * 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «автошин дээр Үйлдвэрлэгчийг сонгоход түүний
   *    үйлдвэрлэсэн машинуудыг Загвар дээр нь гаргаад ирж чадах уу».
   *
   * ⚠️ ЯАГААД ШУУД `attrs[key] = value` ХИЙХГҮЙ ВЭ: «эцэг» талбар (`f.optionsFrom`,
   *    ж: 🏷️ Үйлдвэрлэгч) солигдоход «хүү» талбарын (ж: 🚙 Загвар) ХУУЧИН утга
   *    шинэ жагсаалтад БАЙХГҮЙ бол ЦЭВЭРЛЭНЭ — эс бөгөөс DB-д
   *    `{ brand: 'Nissan', model: 'Prius 30' }` гэсэн ЗӨРЧСӨН зар хадгалагдана ✗
   * ⚠️ ГАРААР бичсэн загвар (аль ч жагсаалтад байхгүй, ж: «Тосны шүүр») ба
   *    шинэ брэндэд жагсаалт байхгүй тохиолдолд утга ХӨНДӨГДӨХГҮЙ ✓
   *    (дүрэм нь `lib/carModels.mjs → keepDependentValue` — тестээр түгжсэн ✓)
   */
  const setAttrCascade = (field, value) => {
    setForm((f) => {
      const prev = f.attrs || {};
      const attrs = { ...prev };
      if (value !== '') attrs[field.key] = value;
      else delete attrs[field.key];
      // 🔗 Энэ талбараас хамаарах «хүү» талбаруудыг (ж: Загвар ← Брэнд) цэвэрлэнэ
      return { ...f, attrs: cascadeAttrs(attrs, prev, field.key, attrFields) };
    });
  };

  // Орон сууцны нэмэлт талбарууд төрлөөс хамаарч харагдана
  const showApartment = hasApartmentFields(form.propertyType);
  const showFloors = hasFloorFields(form.propertyType);
  const showRooms = hasRoomsFields(form.propertyType); // ← зөвхөн Орон сууц, АОС/хаус
  // «Угаалгын өрөө» — АОС/хаус төрөлд үргэлж, 3+ өрөөтэй орон сууцанд нэмж харагдана
  const showBathrooms = hasBathroomFields(form.propertyType, form.rooms);
  /**
   * 💳 «ТӨЛБӨРИЙН НӨХЦӨЛ» талбар харагдах эсэх (2026-10-03).
   * ⚠️ ЗӨВХӨН «Үл хөдлөх зарна» (түрээслүүлнэ) ба «Автомашин зарна» хэсэгт —
   *    хэрэглэгчийн хүсэлт («Төлбөрийн нөхцөлийг Үл хөдлөх зарна, Автомашин
   *    зарна гэсэн дээр… гардаг болгоё»). Бусад хэсэгт лизинг/бартер гэсэн
   *    ойлголт байхгүй тул форм дээр Ч ХАРАГДАХГҮЙ ✓ (нэг эх сурвалж:
   *    `lib/paymentFilter.mjs → hasPaymentTerms`)
   * ⚠️ Хэсэг солиход `pickSection` нь `form.payments`-ыг ЦЭВЭРЛЭНЭ — эс
   *    бөгөөс «үл хөдлөх» дээр сонгосон лизинг «ажил» руу шилжихэд үлдэж,
   *    хадгалалт дээр `paymentTermsForAttrs` нь `null` буцаасан ч форм дээр
   *    харагдахгүй «далд» утга үлдэнэ ✗
   */
  const showPayments = hasPaymentTerms(form.section);

  /* ==========================================================================
     📱 МОБАЙЛ (<640px) — «АСУУЛГА БҮР НЭГ ДЭЛГЭЦ» (2026-10-02)
     ──────────────────────────────────────────────────────────────────────────
     Хэрэглэгчийн хүсэлт: «гар утсаас зар оруулахад ийм асуудаг формоо нэг
     нэгээр нь харуулаад яв» (`unegui.mn/post_ad/`-ийн дэлгэцүүд) ⇒ мобайлд
     ① Хэсэг → ② «Зарах / Түрээслэх» эсвэл Дэд бүлэг → ③ Төрөл → ④ Өрөө
     (зөвхөн өрөөтэй төрөлд) гэж ДАРААЛАН, дэлгэц бүрд НЭГ асуулт харагдана.
     Байршил ч мөн адил: Хот/Аймаг → Дүүрэг/Сум → Хороо.
     ⚠️ Сүүлийн дэлгэц дээр сонгосны дараа ДАРААГИЙН АЛХАМ руу ШУУД шилжинэ
        (unegui.mn-ийн зан) — тул «Үргэлжлүүлэх» дарах шаардлагагүй ✓
        ⚠️ Шилжилт нь `validateStep`-ээр БИШ, ШУУД `gotoStep(1)`/`(2)`: дөнгөж
           сонгосон утга нь `form`-д ороогүй хэвээр байгаа тул `validateStep`
           хуучин төлөвийг харж «сонгоно уу» гэж БУРУУ алдаа өгнө ✗
     ⚠️ 🖥 ≥640px дээр ЭДГЭЭР дэлгэцүүд ХАРАГДАХГҮЙ (`MobileQuestion` нь
        `sm:hidden`) — баганат сонголт ХЭВЭЭР ✓
     🔍 Хайх үг: mobileCatStep, mobileLocStep, finishMobileCategory, catScreens
     ========================================================================== */
  /** 📱 Төрлийн дараа → дараагийн алхам (📍 Байршил) */
  const finishMobileCategory = () => { setError(''); gotoStep(1); };
  /** 📱 Байршлын дараа → дараагийн алхам (📋 Дэлгэрэнгүй) */
  const finishMobileLocation = () => { setError(''); gotoStep(2); };

  /**
   * 📱 Төрөл сонгох — өрөөтэй төрөл (`hasRoomsFields`) бол «Өрөө» дэлгэц,
   *    эс бөгөөс шууд дараагийн алхам.
   * ⚠️ `hasRoomsFields(v)` — ШИНЭ утгаар ШУУД шалгана: `set('propertyType', v)`
   *    нь async тул энэ render дээр `showRooms` ХУУЧИН хэвээр байна ✗
   */
  const pickSubtypeMobile = (v) => {
    set('propertyType', v);
    if (hasRoomsFields(v)) setMobileCatStep('rooms');
    else finishMobileCategory();
  };

  const catVerb = form.category === 'rent' ? 'түрээслүүлнэ' : 'зарна';

  /**
   * 📱 1-р алхмын дэлгэцүүд — сонголтоос хамаарч 2–4 ширхэг.
   * `key` нь `mobileCatStep`-тэй таарна; `find` олдохгүй бол эхнийх ✓
   */
  const catScreens = (() => {
    const out = [
      {
        key: 'section',
        title: 'Зар нийтлэх',
        items: sectionItems,
        value: sectionValue,
        onPick: (v) => {
          pickSection(v);
          // ① ХЭСЭГ → ② «Зарах/Түрээслэх» | Дэд бүлэг | Төрөл
          const next = hasCategoryChoice(v) ? 'category' : getSubtypeGroups(v).length ? 'group' : 'subtype';
          setMobileCatStep(next);
        },
      },
    ];
    if (showCategoryChoice) {
      out.push({
        key: 'category',
        // unegui.mn-ийн 2 дахь дэлгэц: «Үл хөдлөх зарна / Үл хөдлөх түрээслүүлнэ»
        title: 'Зар нийтлэх',
        items: categoryItems.map((c) => ({
          ...c,
          label: `${sectionDef.label} ${c.value === 'rent' ? 'түрээслүүлнэ' : 'зарна'}`,
        })),
        value: form.category,
        onPick: (v) => { set('category', v); setMobileCatStep('subtype'); },
      });
    } else if (hasGroups) {
      out.push({
        key: 'group',
        title: sectionDef.label,
        items: subtypeGroups.map((g) => ({ value: g.label, label: g.label, badge: g.items.length })),
        value: openGroup,
        onPick: (v) => {
          pickLevel2(v);
          const g = subtypeGroups.find((x) => x.label === v);
          // ⚠️ Доод түвшингүй бүлэг («💻 Чихэвч») нь ӨӨРӨӨ leaf → шууд үргэлжилнэ
          if (g && g.items.length) setMobileCatStep('subtype');
          else finishMobileCategory();
        },
      });
    }
    out.push({
      key: 'subtype',
      // unegui.mn-ийн 3 дахь дэлгэцийн толгой = өмнөх сонголт («Үл хөдлөх зарна»)
      title: showCategoryChoice
        ? `${sectionDef.label} ${catVerb}`
        : (hasGroups ? openGroup : '') || sectionDef.label,
      items: showCategoryChoice || hasGroups ? level3Items : level2Items,
      value: form.propertyType,
      onPick: pickSubtypeMobile,
    });
    if (showRooms) {
      out.push({
        key: 'rooms',
        // unegui.mn-ийн 4 дэх дэлгэц: «Орон сууц зарна» → 1 өрөө … +5 өрөө
        title: selectedLeafLabel || 'Өрөөний тоо',
        items: MOBILE_ROOM_ITEMS,
        value: form.rooms,
        onPick: (v) => { set('rooms', v === MOBILE_SKIP ? '' : v); finishMobileCategory(); },
      });
    }
    return out;
  })();
  const mobileCatScreen = catScreens.find((s) => s.key === mobileCatStep) || catScreens[0];

  /**
   * 📱 2-р алхмын дэлгэцүүд — Хот/Аймаг → Дүүрэг → **Хороо** (🆕 2026-10-05: 3
   *    дэлгэц, БҮХ хэсэгт).
   *
   * 🎯 ХЭРЭГЛЭГЧИЙН ГОМДОЛ: «Барилгын материалын зар оруулхад Улаанбаатарын
   *    дүүргийн хороо оруулах хэсэг гарч ирэхгүй байна» ⇒ өмнө нь ⚡ `simpleForm`
   *    хэсэгт (🧱 construction, 🏭 equipment, ⚽ hobby, 🧺 home, 🛋️ furniture,
   *    🧳 travel, ⚡ electric) хороо нь форм · мобайл · дэлгэц БҮГДЭЭС
   *    хасагддаг байв ✗ → одоо **БҮХ хэсэгт ЯГ ИЖИЛ 3 дэлгэц** ✓
   *    ⚠️ `simpleForm` нь ЗӨВХӨН `attrFields` (зөвхөн ✅ «Шинэ / Шинэвтэр /
   *       Хуучин») ба 🎥 YouTube линкэд л үйлчилнэ — байршилд ОГТ үйлчлэхгүй ✓
   *    ⚠️ «Үл хөдлөх»-ийн зан ХӨНДӨГДӨӨГҮЙ (тэнд ч 3 дэлгэц байсан ✓) —
   *       `validateStep('location')` нь зөвхөн `city`-г шаарддаг тул хороо
   *       сонгохгүй ч урагшлах боломж ХЭВЭЭР ✓
   */
  const locScreens = [
    {
      key: 'city',
      title: 'Зар нийтлэх',
      items: cityItems,
      value: form.city,
      onPick: (v) => { changeCity(v); setMobileLocStep('district'); },
    },
    {
      key: 'district',
      title: form.city || 'Дүүрэг',
      items: districtItems,
      value: form.district,
      onPick: (v) => { changeDistrict(v); setMobileLocStep('khoroo'); },
    },
    {
      key: 'khoroo',
      title: form.district || 'Хороо',
      items: khorooItems,
      value: form.khoroo,
      onPick: (v) => { changeKhoroo(v); finishMobileLocation(); },
    },
  ];
  const mobileLocScreen = locScreens.find((s) => s.key === mobileLocStep) || locScreens[0];

  /* ==========================================================================
     📱 3-Р АЛХАМ (📋 Дэлгэрэнгүй) — «АСУУЛТ БҮР НЭГ ДЭЛГЭЦ» (2026-10-02)
     ──────────────────────────────────────────────────────────────────────────
     Хэрэглэгчийн хүсэлт: «зарын гарчиг, талбай, угаалгын өрөө, ашиглалтанд
     орсон он … бүгдийг нь нэг нэгээр нь харуул» ⇒ мобайлд эдгээр талбар нь
     3-р алхам дээр ЦУВААГААР БИШ, **дэлгэц бүрд НЭГ** (1/2-р алхамын
     `MobileQuestion`-тэй ЯГ ИЖИЛ зарчим) харагдана.

     ⚙️ ХЭРХЭН АЖИЛЛАДАГ ВЭ (нэг DOM — ХУУЛБАР БИШ):
        • Талбар бүр нь `.form-group` дээр `data-detail-field="<key>"` +
          `data-mobile-active="true|false"` атрибуттай
        • `app/globals.css` → 📱 `<640px` дээр `data-mobile-active="false"`
          талбар/мөрийг `display:none` ⇒ ЗӨВХӨН идэвхтэй дэлгэцийн талбар
          харагдана; 🖥 ≥640px дээр дүрэм ҮЙЛЧЛЭХГҮЙ ⇒ хуучин харагдац ХЭВЭЭР ✓
        ⚠️ Ингэснээр утга/`form`/DB/`validateStep` ХӨНДӨГДӨХГҮЙ (нэг эх сурвалж)
        ⚠️ Талбарыг ХОЁР ДАХИН рендэрлэхгүй (CDP-ийн `[data-choice-trigger]`
           тоо хэвээр — cdp-wheel.mjs эвдрэхгүй ✓)

     ⚠️ «Өрөө» ЭНД БАЙХГҮЙ (`rooms`): 1-р алхмын drill-down-д асуудаг болсон
        (unegui.mn-ийн 4 дэх дэлгэц) тул 3-р алхамд ДАВХАРДАХГҮЙ ✓ (🖥 дээр
        `hide-below-sm`-ээр хуучин байдал хэвээр)
     ⚠️ Заавал талбар нь («Зарын гарчиг») дэлгэцээ солихдоо шалгагдана —
        `validateStep('details')`-тэй ИЖИЛ мессеж (нэг эх сурвалж) ✓
     🔍 Хайх үг: mobileDetailStep, detailScreens, data-detail-field,
        data-mobile-active, data-mobile-detail-head
     ========================================================================== */
  /**
   * 📱 Мобайлд «2 БАГАНАТ ШУУД ЖАГСААЛТ»-аар сонгогдох талбар уу? (2026-10-03)
   * ⚠️ 🎛 ЧИП талбар (`formChips`, ж: 💼 ажлын 4 талбар) нь мобайлд ч
   *    ЧИП хэвээр (2026-10-03 (11)-ийн хэрэглэгчийн хүсэлт + unegui-гийн АЖЛЫН
   *    форм) тул жагсаалт руу ОРУУЛАХГҮЙ — ⚠️ тэдгээр нь `type: 'select'` (!)
   *    тул шалгалтаас ЗААВАЛ хасна, эс бөгөөс доод товч нь хуурамчаар
   *    нуугдаж, мобайлд ЧИП талбар дээр урагшлах боломж ҮЛДЭХГҮЙ ✗
   *    (`cdp:chips` тестээр илэрсэн ✓)
   *    🆕 2026-10-03 (19): ⚠️ ЗӨВХӨН `formChips`-ыг шалгана (`f.chips` БИШ) —
   *       `chips: true` нь **зөвхөн ХАЙЛТЫН sidebar**-ийн туг (ж: 🎨 «Өнгө»)
   *       тул тэр талбар нь ФОРМ дээр хэвээр `<select>` ба мобайлд 2 баганат
   *       жагсаалттай (`isAttrPick` = true) байх ЁСТОЙ ✓
   * ⚠️ 🔎 ХАЙЛТТАЙ сонголт (`searchable`, ж: 🏷️ Үйлдвэрлэгч) нь бичиж хайдаг
   *    тул гар бичилт ХЭВЭЭР; 🚙 «Загвар» нь `optionsFrom` (брэндээс хамаарах
   *    combo) — ч бичилт ХЭВЭЭР ✓
   * ⚠️ JSX-ийн салбарын ДАРААЛАЛТАЙ ИЖИЛ байх ЁСТОЙ: `formChips` →
   *    `choices` → `searchable` → `optionsFrom` → `select` → input ✓
   */
  const isAttrPick = (f) => f.type === 'select' && !f.searchable && !f.optionsFrom
    && !f.formChips;
  const detailScreens = (() => {
    /** ⚠️ `required` — зөвхөн ШИНЭ зард (засах горимд `validateStep` ч шаарддаггүй ✓) */
    const out = [{ key: 'title', title: 'Зарын гарчиг', group: 'title', required: !isEdit }];
    /** Хэсгийн нэмэлт талбарууд (брэнд/он/гүйлт/компьютер …) — нэг нэгээрээ */
    attrFields.forEach((f) => out.push({
      key: `attr-${f.key}`,
      title: `${f.icon ? `${f.icon} ` : ''}${f.label}`,
      group: 'attrs',
      /** 📱 Сонголттой бол дарж сонгоод ШУУД дараагийн асуулт (товч ХАРАГДАХГҮЙ) */
      pick: isAttrPick(f),
    }));
    /**
     * 💳 «Төлбөрийн нөхцөл» — 📱 мобайлд ӨӨРИЙН дэлгэцтэй (`required: true`).
     * ⚠️ Дараалал нь DOM-той ИЖИЛ: аттрибутуудын дараа, «Талбай»-н өмнө ✓
     * ⚠️ ЗӨВХӨН `showPayments` (үл хөдлөх/авто) — бусад хэсэгт дэлгэц нэмэхгүй ✓
     */
    if (showPayments) out.push({
      key: 'payments',
      title: '💳 Төлбөрийн нөхцөл',
      group: 'payments',
      required: !isEdit,
    });
    if (isRealEstate) out.push({ key: 'area', title: 'Талбай (м²)', group: 'area' });
    /**
     * 🆕 2026-10-05 (53) — 📅 АШИГЛАЛТАНД ОРСОН ОН · 🏢 НИЙТ ДАВХАР ·
     *    🏠 БАЙРНЫ ДАВХАР нь 📱 мобайлд ГАРААС БИЧИГДЭНЭ
     *    (`ChoiceField`-ийн `mobileInput` ✓) тул эдгээр дэлгэцэд `pick: true`
     *    БАЙХГҮЙ: `MobileOptions` рендэрлэгдэхгүй тул «дармагц дараагийн
     *    асуулт» боломжгүй ⇒ доод «Алгасах / Үргэлжлүүлэх →» товч ГАРАХААР
     *    байна (`activePick` — «Талбай» (`area`) дэлгэцийн ЯГ ИЖИЛ зан ✓)
     * ⚠️ ЗӨВХӨН 📱 <640px: 🖥 ≥640px дээр эдгээр талбар аль хэдийн ГАР
     *    БИЧИЛТТЭЙ байсан тул desktop-ийн зан төлөв ХӨНДӨГДӨХГҮЙ ✓
     */
    if (showFloors && showApartment) out.push({ key: 'buildYear', title: 'Ашиглалтанд орсон он', group: 'floors-1' });
    if (showFloors) out.push({ key: 'totalFloors', title: 'Барилгын нийт давхар', group: 'floors-1' });
    if (showFloors) out.push({ key: 'floor', title: 'Байрны давхар', group: 'floors-2' });
    /**
     * 🚿 «Угаалгын өрөөний тоо» — 🆕 2026-10-03 (хэрэглэгчийн хүсэлт:
     *    «тагтны өмнө угаалгын өрөөний тоо оруулах хэсгийг оруул») ⇒
     *    ТАГТНЫ ЯГ ӨМНӨ, DOM-той ИЖИЛ дарааллаар ✓
     * ⚠️ Мобайл дэлгэц нь `floors-2` бүлэгтэй — талбар нь ч мөн тэр мөрөнд
     *    (`data-detail-row="floors-2"`); мөр ба талбарын `data-mobile-active`
     *    хоёр ТУСДАА тул «нэг дэлгэцэд нэг талбар» ХЭВЭЭР ✓
     */
    if (showBathrooms) out.push({ key: 'bathrooms', title: 'Угаалгын өрөөний тоо', group: 'floors-2', pick: true });
    if (showFloors && showApartment) out.push({ key: 'balconies', title: 'Тагт', group: 'floors-2', pick: true });
    if (showApartment) out.push({ key: 'garage', title: 'Гараж', group: 'garage', pick: true });
    return out;
  })();
  /** ⚠️ Түлхүүр олдохгүй бол (ж: хэсэг солигдов) → ЭХНИЙ дэлгэц (`title`) ✓ */
  const detailIdxRaw = detailScreens.findIndex((s) => s.key === mobileDetailStep);
  const detailIdx = detailIdxRaw < 0 ? 0 : detailIdxRaw;
  const activeDetail = detailScreens[detailIdx];
  const isFirstDetail = detailIdx === 0;
  const isLastDetail = detailIdx === detailScreens.length - 1;
  /** 📱 Мөр/талбар «энэ дэлгэцэн дээр байна уу» → `data-mobile-active` (CSS ✓) */
  const detailRowActive = (group) => (activeDetail.group === group ? 'true' : 'false');
  const detailFieldActive = (key) => (activeDetail.key === key ? 'true' : 'false');
  /** 📱 Одоогийн асуулт нь «дарж сонгох» жагсаалттай юу → доод товч ХАРАГДАХГҮЙ ✓ */
  const activePick = !!activeDetail.pick;

  /**
   * 📱 «Өмнөх хариулт» мөрийн УТГА (unegui.mn-ийн мөрийн доод текст) — 2026-10-03.
   * ⚠️ Утга нь формойн state-ээс ШУУД (`form.*`, `form.attrs.*`) — шинэ
   *    хадгалалт/DB багана НЭМЭГДЭХГҮЙ ✓
   * ⚠️ Хоосон утга → `''` ⇒ мөр ГАРАХГҮЙ (хариулаагүй асуулт мөр болохгүй ✓)
   */
  const detailAnswerText = (key) => {
    if (key === 'title') return String(form.title || '').trim();
    if (key === 'payments') return form.payments.map((v) => paymentOptionLabel(v)).join(', ');
    if (key === 'area') return form.area ? `${form.area} м²` : '';
    if (key === 'buildYear') return form.buildYear ? choiceText(form.buildYear, 'он') : '';
    if (key === 'totalFloors') return form.totalFloors ? choiceText(form.totalFloors, 'давхар') : '';
    if (key === 'floor') return form.floor ? choiceText(form.floor, 'давхар') : '';
    if (key === 'bathrooms') return form.bathrooms ? choiceText(form.bathrooms, '', PLUS_VALUE) : '';
    if (key === 'balconies') return form.balconies ? choiceText(form.balconies, 'тагт', PLUS_VALUE) : '';
    if (key === 'garage') {
      const g = GARAGE_OPTIONS.find((x) => x.value === form.hasGarage);
      return g ? g.label : '';
    }
    if (key.startsWith('attr-')) {
      const f = attrFields.find((x) => `attr-${x.key}` === key);
      const v = f ? String((form.attrs || {})[f.key] || '') : '';
      if (!v) return '';
      /** 📅 ОН нь «2015 он», 🛣️ ГҮЙЛТ нь «146,000» (картын мөртэй ижил ✓) */
      if (f.type === 'number') {
        return /^\d+$/.test(v) ? Number(v).toLocaleString('en-US') : v;
      }
      return v;
    }
    return '';
  };

  /**
   * 🖥 ① 🗂 АНГИЛАЛ · ② 📍 ЗАРЫН ДЭД БАЙРШИЛ — СОНГОСОН ЗАМ (2026-10-05)
   * ────────────────────────────────────────────────────────────────────────
   * 🎯 Хэрэглэгчийн хүсэлт: «Зар нэмэх форм дээр сонгосон категори/байршил
   *    КОМПЬЮТЕР дээр харагдахгүй байна» ⇒ өмнө нь энэ зам нь ЗӨВХӨН
   *    📱 `MobileAnswers` (`sm:hidden`) дотор байсан тул 🖥 ≥640px дээр
   *    «Дэлгэрэнгүй / Үнэ / Зураг» алхмууд дээр юу сонгосноо харах газар
   *    ОГТ БАЙХГҮЙ байв ✗ ⇒ 🆕 `DesktopSummary` (`hidden sm:flex`) нэмэгдэв ✓
   *
   * ⚠️ НЭГ ЭХ СУРВАЛЖ: 📱 `mobileAnswerRows` (MobileAnswers) ба 🖥
   *    `DesktopSummary` ХОЁУЛАА энэ хоёр утгыг л ашиглана — хоёр газарт
   *    тусад нь бичвэл нэг нь мартагдаж, мобайл ба десктоп дээр өөр зам
   *    харагдана ✗ (📱 ` ▸ ` ба ` — ` тусгаарлагч нь ХЭВЭЭР ✓)
   * ⚠️ Формойн state-ээс ШУУД — шинэ DB багана / хадгалалт БАЙХГҮЙ ✓
   */
  const pickedCategoryPath = form.propertyType
    ? [
      `${sectionDef.icon} ${sectionDef.label}`,
      showCategoryChoice ? categoryItems.find((c) => c.value === form.category)?.label : '',
      selectedGroupLabel,
      selectedLeafLabel,
    ].filter(Boolean).join(' ▸ ')
    : '';
  /**
   * 📍 Зарын байршлын мөр (🖥 3-р алхмын «📍 Зарын байршил» / 📱 дэлгэрэнгүй).
   * ⚠️ Чекбокс («Байршил сонгохгүй») асаалттай бол «Байршил заагаагүй» —
   *    эс бөгөөс «хот — дүүрэг — хороо». Дүрэм нь ЦЭВЭР модуль дотор
   *    (`locationPathText`) ⇒ хураангуй ба шалгалт ЗӨРӨХГҮЙ ✓
   * ⚠️ Хоосон мөр (`''`) үлдвэл 🖥 хураангуй дээр 📍 мөр ХООСОН харагдана ✗
   */
  const pickedLocationPath = locationPathText(form);

  /**
   * 📱 3-р алхмын толгойн ДОРХ мөрүүд (unegui.mn-ийн хэв, 2026-10-03 (17)):
   *   ① 🗂 Ангилал (unegui-гийн «Автомашин ▸ Автомашин зарна ▸ Toyota ▸ 4Runner»)
   *   ② 📍 Зарын байршил («Улаанбаатар — Багануур — 1-р хороо»)
   *   ③ хариулсан асуулт БҮР (ОДООГИЙНХООС бусад) — утгатай нь л ✓
   * ⚠️ Түлхүүр нь `detailScreens[].key` (`'step-category'`/`'step-location'` нь
   *    тусдаа — `✏️` нь 1/2-р АЛХАМ руу буцаана ✓)
   */
  const mobileAnswerRows = (() => {
    const rows = [];
    // ⚠️ Зам нь 🖥 `DesktopSummary`-тай НЭГ ЭХ СУРВАЛЖ (`pickedCategoryPath` /
    //    `pickedLocationPath`, дээр) — энд дахин бодохгүй ✓
    if (pickedCategoryPath) rows.push({ key: 'step-category', label: 'Ангилал', value: pickedCategoryPath });
    if (pickedLocationPath) rows.push({ key: 'step-location', label: 'Зарын байршил', value: pickedLocationPath });
    detailScreens.forEach((s) => {
      if (s.key === activeDetail.key) return;
      const value = detailAnswerText(s.key);
      if (value) rows.push({ key: s.key, label: s.title, value });
    });
    return rows;
  })();

  /**
   * 📱 ← товч — нэг дэлгэцээр ДЭЭШ буцаана; хамгийн эхний дэлгэц дээр
   *    `goBack()` (алхмаас гарна: 1-р алхамд «Цуцлах», бусад алхамд «← Буцах»)
   *    ⚠️ Буцах үед СОНГОЛТ ЦЭВЭРЛЭГДЭХГҮЙ — дэлгэц дээр цэнхэрээр (aria-pressed)
   *       тэмдэглэгдсэн хэвээр үлдэнэ (unegui.mn-ийн зан ✓)
   */
  const mobileStepBack = (screens, current, setStepKey) => {
    setError('');
    const idx = screens.findIndex((s) => s.key === current.key);
    if (idx > 0) setStepKey(screens[idx - 1].key);
    else goBack();
  };
  const mobileCatBack = () => mobileStepBack(catScreens, mobileCatScreen, setMobileCatStep);
  const mobileLocBack = () => mobileStepBack(locScreens, mobileLocScreen, setMobileLocStep);

  /**
   * 📱🖥 3-р алхмын «ЗААВАЛ» талбарын шалгалт — НЭГ ЭХ СУРВАЛЖ (2026-10-03).
   *
   * ⚠️ ЯАГААД ФУНКЦ ВЭ: 📱 `mobileDetailNext` (дэлгэц солих) ба 🖥
   *    `validateStep('details')` (товч дарах / `firstInvalidStep`) хоёулаа
   *    ЯГ ИЖИЛ дүрмийг мөрдөх ёстой — хоёр газарт тусад нь бичвэл нэг нь
   *    мартагдаж, «дэлгэц дээр алдаа гарахгүй ч товч дарж болохгүй» (эсвэл
   *    эсрэгээрээ) зөрүү үүснэ ✗
   * ⚠️ `key` нь `detailScreens[].key` (`'title'`, `'payments'`, …) — зөвхөн
   *    `required: true` талбарт дуудагдана ✓
   *   • `title`  — «Зарын гарчиг» ЗААВАЛ (ШИНЭ зард: `isEdit` үед хуучин
   *      зард гарчиг байхгүй байж болох тул шаардахгүй ✓)
   *   • `payments` — «Төлбөрийн нөхцөл» ЗААВАЛ (мөн ШИНЭ зард л — хуучин
   *      зарууд `attrs.payment_terms`-гүй ✓)
   */
  const requiredDetailMsg = (key) => {
    if (key === 'title' && !isEdit && !String(form.title || '').trim()) {
      return 'Зарын гарчигаа оруулна уу';
    }
    if (key === 'payments' && !isEdit && showPayments && !form.payments.length) {
      return PAYMENT_REQUIRED_MSG;
    }
    return '';
  };

  /**
   * 📱 3-р алхмын «Дараагийн асуулт» — талбар бүр НЭГ ДЭЛГЭЦ (2026-10-02).
   * ⚠️ Заавал талбар хоосон бол ДАРААГИЙН ДЭЛГЭЦ РУУ ЯВАХГҮЙ ✗ —
   *    `validateStep('details')`-тэй ИЖИЛ мессеж (нэг эх сурвалж:
   *    `requiredDetailMsg` ✓)
   * ⚠️ СҮҮЛИЙН дэлгэцээс цааш `goNext()` (дараагийн АЛХАМ): энэ салбар нь
   *    зөвхөн аюулгүйн зам — 📱 дээр сүүлийн дэлгэцэд wizard-ийн товч
   *    ХАРАГДАХГҮЙ (доорх `hide-below-sm`) ба хуучин «Үргэлжлүүлэх» л үлддэг ✓
   */
  const mobileDetailNext = () => {
    const cur = detailScreens[detailIdx];
    const req = cur && cur.required ? requiredDetailMsg(cur.key) : '';
    if (req) {
      setError(req);
      return;
    }
    setError('');
    if (isLastDetail) { goNext(); return; }
    setMobileDetailStep(detailScreens[detailIdx + 1].key);
  };
  /**
   * 📱 «← » — нэг дэлгэцээр ДЭЭШ буцаана; ХАМГИЙН ЭХНИЙ дэлгэц дээр `goBack()`
   *    (2-р алхам «📍 Байршил» руу) — `mobileStepBack`-тэй ИЖИЛ зан ✓
   * ⚠️ Буцах үед оруулсан утга ЦЭВЭРЛЭГДЭХГҮЙ (form хэвээр ✓)
   */
  const mobileDetailBack = () => {
    setError('');
    if (isFirstDetail) { goBack(); return; }
    setMobileDetailStep(detailScreens[detailIdx - 1].key);
  };

  /**
   * 📱 Сонголт дээр дарах үйлдэл — «утга бичих → ШУУД дараагийн асуулт»
   *    (unegui.mn-ийн зан: «Алгасах / Үргэлжлүүлэх» товч ШААРДЛАГАГҮЙ ✓)
   * ⚠️ `apply` нь `set(...)`/`setAttrCascade(...)` — хоёулаа state-д бичнэ;
   *    `mobileDetailNext()` нь дараагийн дэлгэцийн ТҮЛХҮҮРИЙГ одоогийн
   *    render-ийн `detailIdx`-ээс боддог тул шинэ утга шаардахгүй ✓
   * ⚠️ Заавал талбар («Зарын гарчиг», «Төлбөрийн нөхцөл») нь жагсаалттай БИШ
   *    (`pick: false`) тул энэ зам руу орохгүй — `requiredDetailMsg` ХӨНДӨГДӨХГҮЙ ✓
   */
  const pickDetail = (apply) => (v) => { apply(String(v)); mobileDetailNext(); };
  /** 📱 «Алгасах» — утгыг ЦЭВЭРЛЭЭД дараагийн асуулт (бүх сонголттой талбар заавал БИШ ✓) */
  const skipDetail = (apply) => () => { apply(''); mobileDetailNext(); };

  /**
   * 📱🖥 ✏️ — «Алдсан хариултаа засах» товч (unegui.mn-ийн харандаа).
   *   ① `step-category` → 1-р алхам (Ангилал) ② `step-location` → 2-р алхам
   *   ③ бусад нь 3-р алхмын ТУХАЙН дэлгэц (`setMobileDetailStep`) ✓
   * ⚠️ 📱 `MobileAnswers` БА 🖥 `DesktopSummary` ХОЁУЛАА энэ НЭГ handler-ыг
   *    дуудна (🆕 2026-10-05 (52) — 🖥 хураангуйн «✏️ Засах») ⇒ давхардсан
   *    логик байхгүй ✓
   * ⚠️ Утга нь ХАДГАЛАГДАНА (form хэвээр) — буцаж засаад дахин сонгоход л
   *    солигдоно (өмнөх зан төлөв ХЭВЭЭР ✓)
   */
  const mobileAnswerEdit = (key) => {
    setError('');
    setWheel(null);
    if (key === 'step-category') { gotoStep(0); return; }
    if (key === 'step-location') { gotoStep(1); return; }
    setMobileDetailStep(key);
  };

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (pending.length + files.length > 10) {
      setError('Хамгийн ихдээ 10 зураг оруулах боломжтой');
      return;
    }
    setError('');
    setCompressing(true);
    try {
      // 🗜 Storage хэмнэх: илгээхээс өмнө resize + JPEG шахалт (lib/imageUtils.js)
      const report = await compressImages(files);
      const mapped = report.items.map((it) => ({
        file: it.file,
        url: URL.createObjectURL(it.file),
        originalSize: it.originalSize,
        newSize: it.newSize,
        savedPercent: it.savedPercent,
        skipped: !!it.skipped,
      }));
      setPending((p) => [...p, ...mapped]);
      setLastReport({
        count: report.items.length,
        totalOriginal: report.totalOriginal,
        totalNew: report.totalNew,
        savedPercent: report.savedPercent,
      });
    } catch (err) {
      setError(`Зураг боловсруулахад алдаа: ${(err && err.message) || err}`);
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = (idx) => setPending((p) => p.filter((_, i) => i !== idx));

  /**
   * 🪜 Тухайн алхмын шалгалт → алдааны мессеж (эсвэл '').
   * ⚠️ «Үнэ» ба «Зураг» (media)-ийн шалгалт нь `handleSubmit`-ийн
   *    ЕРӨНХИЙ шалгалттай ЯГ ИЖИЛ — давхардсан логик үлдээхгүйн тулд
   *    хоёулаа ЭНЭ функцээр дамжина ✓
   */
  const validateStep = (i) => {
    const key = (STEPS[i] || {}).key;
    if (key === 'category') {
      if (!form.propertyType) return 'Зарын төрлөө сонгоно уу';
      return '';
    }
    if (key === 'location') {
      /**
       * 📍⏭ «Байршил сонгохгүй» (2026-10-06) — чекбокс асаалттай бол хот
       *    сонгохыг ШААРДАХГҮЙ ✓
       * ⚠️ Шалгалт нь ЗӨВХӨН «чекбокс унтраалттай атлаа хот хоосон» үед л
       *    алдаа буцаана (`locationMissing` — нэг эх сурвалж:
       *    `lib/listingLocation.mjs`); `!form.city` гэж бичвэл чекбокс
       *    асаалттай үед хэрэглэгч 2-р алхмаас ЦААШ ГАРАХГҮЙ болно ✗
       */
      if (locationMissing(form)) return 'Хот/Аймгаа сонгоно уу';
      return '';
    }
    if (key === 'details') {
      /**
       * 🏷️ ЗАРЫН ГАРЧИГ + 💳 ТӨЛБӨРИЙН НӨХЦӨЛ — ШИНЭ ЗАРД ЗААВАЛ.
       * ⚠️ ЯАГААД ЗААВАЛ ВЭ: гарчиг нь зарын карт дээр үнийн доор харагддаг
       *    үндсэн мөр — хоосон орхивол карт дээр мөр ОГТ гарахгүй (0027) тул
       *    «гарчиггүй» зар үүснэ ✗; төлбөрийн нөхцөл нь хайлтын шүүлт
       *    (jsonb `cs`) ажиллахын тулд ижил зар дээр БАЙХ ЁСТОЙ ✓
       * ⚠️ ЗАСАХ ГОРИМД ШААРДАХГҮЙ (`isEdit`): 0027 орохоос өмнөх зарууд
       *    дээр (`null`) гарчиг БАЙХГҮЙ тул хуучин зарыг засахад хэрэглэгчийг
       *    блоклохгүй ✓ (хүсвэл нэмж болно; төлбөрийн нөхцөл ч мөн адил)
       * ⚠️ Дүрэм нь `requiredDetailMsg()` (нэг эх сурвалж) — 📱 дэлгэц солих
       *    шалгалттай ЗӨРӨХГҮЙ байхын тулд тэндээс дуудна ✓
       * ⚠️ Дараалал нь 3-р алхмын ТАЛБАРУУДЫН дараалал (гарчиг → … →
       *    төлбөрийн нөхцөл) — хэрэглэгч дээрээс доош бөглөж байгаатай ижил ✓
       */
      const req = requiredDetailMsg('title') || requiredDetailMsg('payments');
      if (req) return req;
      return '';
    }
    if (key === 'price') {
      // ⚠️ Үнэ нь ЗӨВХӨН ЦИФР хэлбэрээр хадгалагдана (formatThousands нь зөвхөн
      //    ХАРАГДАЦЫГ таслалтай болгоно). lib/queries.js → toNumber() нь «,»-г
      //    аравтын бутархай гэж үздэг тул таслалтай утга илгээвэл үнэ 0 болно.
      // ⚠️ Үнэ нь ЗААВАЛ БИШ (2026-09-29): «Үнэ тохирно» тэмдэглэсэн бол үнэ
      //    огт шаардахгүй — карт/дэлгэрэнгүй дээр «Үнэ тохирно» харагдана
      //    (lib/format.js). ⚠️ Хэрэглэгчийн шаардлага: «Үнэ тохирно»-г
      //    ТЭМДЭГЛЭСЭН Ч үнэ бичсэн бол утга нь ХЭВЭЭР хадгалагдана ✓
      const priceDigits = String(form.price || '').replace(/\D/g, '');
      if (priceDigits) {
        if (Number(priceDigits) <= 0) return 'Үнэ 0-ээс их байх ёстой';
        if (priceDigits.length > 15) return 'Үнэ хэт урт байна (15 цифр хүртэл)';
      } else if (!form.negotiable) {
        // 💼 ажил → «Цалингаа … Цалин тохиролцоно», бусад → «Үнээ … Үнэ тохирно»
        const isJob = form.section === 'jobs';
        const negLabel = isJob ? NEGOTIABLE_SALARY_LABEL : NEGOTIABLE_PRICE_LABEL;
        return `${isJob ? 'Цалингаа' : 'Үнээ'} оруулна уу (эсвэл «${negLabel}»-г тэмдэглэнэ үү)`;
      }
      // 🎥 Видео линк: хоосон бол зүгээр; бичсэн бол YouTube линк БАЙХ ЁСТОЙ
      // (буруу линк хадгалагдвал дэлгэрэнгүй хуудас дээр видео харагдахгүй).
      if (form.videoUrl && form.videoUrl.trim() && !parseYouTube(form.videoUrl).ok) {
        return 'YouTube линк буруу байна. Жишээ: https://youtu.be/dQw4w9WgXcQ';
      }
      return '';
    }
    if (key === 'media') {
      if (!form.phone) return 'Холбоо барих утас оруулна уу';
      return '';
    }
    return '';
  };

  /** Бүх алхмаас ЭХНИЙ алдаатайг олно — `handleSubmit`-д хэрэглэнэ ✓ */
  const firstInvalidStep = () => {
    for (let i = 0; i < STEPS.length; i += 1) {
      const msg = validateStep(i);
      if (msg) return { index: i, msg };
    }
    return null;
  };

  /**
   * 🪜 URL-ийн `?step=`-ийг солино (scroll-гүй). ⚠️ Алхам нь URL-д 1-based —
   *    хэрэглэгчид «2/5» гэж ойлгомжтой, хаяг дээр ч тодорхой харагдана ✓
   */
  const gotoStep = (n) => {
    /**
     * 🔢🎡 ДУГУЙГ ХААНА (2026-10-02) — алхам солигдоход нээлттэй дугуй үлдвэл
     *    шинэ дэлгэцийн дээр хөвж, «хаана байгаа нь ойлгомжгүй» болно ✗
     * ⚠️ `setWheel(null)` нь идэвхгүй алхамд ч аюулгүй (React нь үгүй бол
     *    ямар ч өөрчлөлт хийхгүй ✓)
     */
    setWheel(null);
    const qs = new URLSearchParams();
    if (editId) qs.set('edit', editId);
    /**
     * 🎯 УРЬДЧИЛСАН АНГИЛАЛ (2026-10-06) — алхмыг солиход ч эдгээр нь URL-д
     *    ҮЛДЭНЭ: эс бөгөөс 2-р алхам дээр refresh хийхэд (эсвэл линк
     *    хуваалцахад) `prefill` нь `{}` болж, ангилал АЛГА БОЛНО ✗
     *    ⚠️ Форм дээрх утга нь state-д хэвээр байдаг тул энэ нь ЗӨВХӨН
     *    «хаяг»-ын хадгалалт (шинэ утга оруулахгүй ✓); `?edit=` горимд
     *    `prefill` нь `{}` тул юу ч нэмэгдэхгүй ✓
     */
    if (prefill.section) qs.set('section', prefill.section);
    if (prefill.category) qs.set('category', prefill.category);
    if (prefill.type) qs.set('type', prefill.type);
    qs.set('step', String(n + 1));
    router.replace(`/listings/new?${qs.toString()}`, { scroll: false });
  };

  /**
   * 🪜 Дараагийн алхам — эхлээд ОДООГИЙН алхмаа шалгана.
   * ⚠️ 2026-10-05 (57): 🖥 дээр 3, 4, 5-р алхам НЭГ хуудас болсон тул
   *    дээд хязгаар нь `STEPS.length - 1` (4) БИШ, `lastStepIndex`
   *    (🖥 = 2, 📱 = 4) ✓ — эс бөгөөд 🖥 дээр «Үргэлжлүүлэх» дарж
   *    «Дэлгэрэнгүй»-гээс хойшхи ХООСОН хуудас руу орно ✗
   * ⚠️ 🖥 дээр 3-р алхам нь СҮҮЛИЙН хуудас тул тэнд «Үргэлжлүүлэх» ОГТ
   *    гарахгүй (`step < lastStepIndex` ✗) — «✅ Зар нийтлэх» гарна ✓
   */
  const goNext = () => {
    const msg = validateStep(step);
    if (msg) { setError(msg); return; }
    setError('');
    gotoStep(Math.min(step + 1, lastStepIndex));
  };

  /** 🪜 Буцах — эхний алхамд байвал хуудсаас гарна (цуцлах) */
  const goBack = () => {
    if (submitting) return;
    setError('');
    if (step === 0) { requestCancel(); return; }
    gotoStep(Math.max(step - 1, 0));
  };

  /**
   * 🛡️ ХАМГААЛАЛТ (2026-10-02, хэрэглэгчийн гомдол: «зарын дэлгэрэнгүй асуух хэсэг
   *    байхгүй болсон») — «хаана явж байна» нь `?step=` ХАЯГ дээр байдаг, харин
   *    ФОРМ нь тэнд хадгалагддаггүй: хуудас дахин ачаалагдвал (F5), `?step=3`
   *    гэсэн линкээр орвол, эсвэл dev дээр файл өөрчлөгдөж (HMR) компонент
   *    дахин монтажлагдвал форм ХООСОН болдог. Тэр үед URL нь хуучин алхам дээрээ
   *    үлддэг тул хэрэглэгч жишээ нь «Дэлгэрэнгүй» (тэр үед харагдац нь
   *    «3. Дэлгэрэнгүй» байв — 2026-10-02-нд дугаар хасагдав) дээр
   *    **ТАЛБАРГҮЙ** (зөвхөн «Энэ төрөлд нэмэлт талбар байхгүй» мөр) хуудас
   *    хардаг байв ✗ (төрөл сонгоогүй тул `showRooms`/`showFloors`/`showApartment`
   *    БҮГД `false`).
   *    ⇒ Дээд алхмуудын ЗААВАЛ хариулт дутуу атлаа хойш алхамд байвал ЭХНИЙ
   *    ДУТУУ алхам руу буцааж, `validateStep`-ийн мессежийг харуулна ✓
   *    ⚠️ `isEdit` — засах горимд хуучин зарын талбар дутуу байж болзошгүй тул
   *    ХӨНДӨХГҮЙ; ⚠️ `authLoading`/`loadingEdit` дуусаагүй, эсвэл URL дээр
   *    `?edit=` байгаа үед ч хөндөхгүй ✓
   */
  useEffect(() => {
    if (authLoading || loadingEdit || isEdit || editId) return;
    if (!draftReady) return; // 📝 ноорог сэргээгдэхийг ХҮЛЭЭНЭ (2026-10-05, 54)
    if (step === 0) return;
    const invalid = firstInvalidStep();
    if (invalid && invalid.index < step) {
      setError(invalid.msg);
      gotoStep(invalid.index);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, authLoading, loadingEdit, isEdit, form.propertyType, form.city, draftReady]);



  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // 🪜 Бүх алхмыг шалгана — алдаатай бол ТЭР алхам руу шилжиж, мессеж харуулна
    const invalid = firstInvalidStep();
    if (invalid) { setError(invalid.msg); gotoStep(invalid.index); return; }

    setSubmitting(true);
    try {
      const uploaded = pending.length ? await uploadImages(userId, pending.map((p) => p.file)) : [];
      const payload = {
        ...form,
        phone: normalizePhone(form.phone).replace(/^\+/, ''),
        // Засах үед хуучин зургуудыг хадгалаад шинээр нэмсэнийг залгана
        images: [...existingImages, ...uploaded],
        // Тухайн төрөлд хамаарахгүй нэмэлт талбаруудыг хоосолж хадгална
        // ⚠️ 0016: үл хөдлөхийн талбарууд (өрөө, талбай, давхар…) нь ЗӨВХӨН
        //    үл хөдлөх хэсэгт утгатай — бусад хэсэгт хоосон хадгална.
        rooms: showRooms ? form.rooms : '',
        area: isRealEstate ? form.area : '',
        // 🤝 «Үнэ тохирно» — `attrs.negotiable = 'yes'` (jsonb, 0016) гэж
        //    хадгална. ⚠️ Тусдаа багана нэмэхгүй (migration 0 ✓) ба үнэ
        //    БИЧСЭН бол утга нь ХЭВЭЭР явна (`price: form.price`) ✓
        //    Тэмдэглэл АВАХАД түлхүүрийг УСТГАНА (хуучин тэмдэг үлдэхгүй ✓).
        attrs: (() => {
          const a = { ...(form.attrs || {}) };
          if (form.negotiable) a.negotiable = 'yes';
          else delete a.negotiable;
          /**
           * 💳 ТӨЛБӨРИЙН НӨХЦӨЛ (2026-10-03) — `attrs.payment_terms` МАССИВ.
           * ⚠️ Дүрэм нь `paymentTermsForAttrs(section, payments)` (нэг эх
           *    сурвалж): хэсэг дэмжихгүй (ж: «Ажил») эсвэл хоосон бол
           *    `null` ⇒ түлхүүр УСТАНА. Ингэснээр «үл хөдлөх» дээр сонгосон
           *    нөхцөл бусад хэсэг рүү шилжихэд `attrs`-д «үхсэн» утга
           *    үлдэхгүй ✓ (`rooms: ''`, `area: ''`-тэй ижил зарчим)
           */
          const terms = paymentTermsForAttrs(form.section, form.payments);
          if (terms) a.payment_terms = terms;
          else delete a.payment_terms;
          return a;
        })(),
        price: form.price,
        // ⚠️ «Зарах / Түрээслэх» нь зөвхөн үл хөдлөхөд — бусад хэсэгт `sell`
        category: isRealEstate ? form.category : 'sell',
        buildYear: showApartment ? form.buildYear : '',
        floor: showFloors ? form.floor : '',
        totalFloors: showFloors ? form.totalFloors : '',
        balconies: showApartment ? form.balconies : '',
        hasGarage: showApartment ? form.hasGarage : '',
        // Угаалгын өрөө — талбар харагдахгүй бол утгыг хоосолж хадгална
        bathrooms: showBathrooms ? form.bathrooms : '',
      };

      if (isEdit) {
        await updateListing(userId, editing.id, payload);
      } else {
        await createListing(userId, payload);
      }

      /**
       * 📝 Ноорог ХЭРЭГГҮЙ болов (2026-10-05, 54) — зар DB-д орсон тул
       *    дараагийн удаа «сэргээгдлээ» гэж гарч ирэх ёсгүй ✗
       * ⚠️ Устгах нь `router.push`-ийн ӨМНӨ (navigation-ийн дараа эффект
       *    ажиллахгүй байж болзошгүй ✓)
       * ⚠️ `draftDoneRef` нь ХҮЛЭЭГДЭЖ байгаа debounce timer-ыг зогсооно —
       *    эс бөгөөс тэр timer устгасны ДАРАА нооргийг дахин бичиж,
       *    нийтлэгдсэн зарын утга «ноорог» болж үлдэнэ ✗ (дээрх тайлбар ✓)
       */
      draftDoneRef.current = true;
      try { window.localStorage.removeItem(draftStorageKey); } catch { /* ignore */ }

      notifyListingsChanged();
      showToast(isEdit ? 'Зар амжилттай засагдлаа ✅' : 'Зар амжилттай нийтлэгдлээ ✅');
      router.push('/my-listings');
    } catch (err) {
      setError(err.message || (isEdit ? 'Зар засахад алдаа гарлаа' : 'Зар нэмэхэд алдаа гарлаа'));
    } finally {
      setSubmitting(false);
    }
  };

  // ===== ⛔ ХАМГААЛАЛТ: ачаалж байна / нэвтрээгүй =====
  if (authLoading) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      </div>
    );
  }
  if (!userId) {
    return (
      <div className="page-container">
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-card">
          <div className="mb-4 text-6xl">🔑</div>
          <h1 className="text-xl font-semibold">Зар оруулахын тулд нэвтрэх шаардлагатай</h1>
          <p className="mt-2 text-[13px] text-gray-500">
            Утасны дугаараараа нэвтэрсний дараа зарыг үргэлжлүүлэн оруулна.
          </p>
          <button type="button" className="btn btn-primary btn-lg mt-6" onClick={openAuth}>
            Нэвтрэх
          </button>
          <div className="mt-4">
            <Link href="/" className="text-[13px] font-semibold text-primary hover:underline">
              ← Нүүр хуудас
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (loadingEdit) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Зарыг ачаалж байна...</p>
        </div>
      </div>
    );
  }

  const currentStep = STEPS[step];

  /**
   * 🧭 Breadcrumb-ийн бичиг (2026-10-05, 57).
   * ⚠️ 🖥 дээр 3, 4, 5-р алхам НЭГ хуудас болсон тул 3 дахь хуудсанд зөвхөн
   *    «Дэлгэрэнгүй» гэвэл төөрөгдөнө ✗ (тэр хуудсан дээр 📋 Дэлгэрэнгүй +
   *    💰 Үнэ + 📝 Тайлбар + ☎️ утас + 🖼 Зураг бүгд байна) ⇒
   *    «Дэлгэрэнгүй ба үнэ, зураг» ✓
   * ⚠️ `step >= STEPS.length - 3` (2) — 🖥 дээрх нэгтгэсэн хуудас нь `?step=3`,
   *    `?step=4`, `?step=5` АЛЬ Ч хаягаар (эсвэл 📱→🖥 resize-ээр) нээгдэж
   *    болох тул 2, 3, 4 дэх индекс БҮГДЭД нэг л нэр гарна ✓ (нэг хуудас =
   *    нэг нэр ✓). ⚠️ `===` биш `>=` гэдгийг сана: `?step=5` дээр «Зураг»
   *    гэвэл 5 блок харагдаж байхад нэр нь төөрөгдүүлнэ ✗
   * ⚠️ 📱 дээр ХӨНДӨГДӨХГҮЙ — 3 дахь «Дэлгэрэнгүй», 4 дэх «Үнэ»,
   *    5 дахь «Зураг» ✓
   */
  const stepLabel = isDesktop && step >= STEPS.length - 3
    ? 'Дэлгэрэнгүй ба үнэ, зураг'
    : currentStep.label;

  /**
   * 🖥 ≥640px — НЭГ ХУУДАСНЫ доод товчны бичиг (2026-10-05).
   * ⚠️ НЭГ ЭХ СУРВАЛЖ: 📱 wizard-ийн сүүлийн алхмын товч ба 🖥 нэг хуудасны
   *    доод товч ХОЁУЛАА энэ мөрийг л ашиглана ✓
   */
  const submitLabel = compressing
    ? '🗜 Зургуудыг шахаж байна...'
    : submitting
      ? (isEdit ? 'Хадгалж байна...' : 'Нийтэлж байна...')
      : (isEdit ? '💾 Өөрчлөлтийг хадгалах' : '✅ Зар нийтлэх');

  return (
    <div className="page-container">
      {/* 🧭 БАЙРШЛЫН ЗААЛТ (breadcrumb) — «хаана явж байна» */}
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-[13px] text-gray-500">
        <Link href="/" className="hover:text-primary hover:underline">Нүүр</Link>
        <span className="text-gray-300">›</span>
        {isEdit ? (
          <>
            <Link href="/my-listings" className="hover:text-primary hover:underline">Миний зарууд</Link>
            <span className="text-gray-300">›</span>
            <span className="font-semibold text-gray-800">Зарыг засах</span>
          </>
        ) : (
          <>
            <span>Зар нэмэх</span>
            <span className="text-gray-300">›</span>
            {/* ℹ️ `data-step-current` — «хаана явж байна»-г харуулах ЦОРЫН ГАНЦ
                газар (форм дотрох алхмын гарчиг 2026-10-01-нд хасагдсан) тул
                CDP тестийн тогтвортой selector болно ✓
                ⚠️ 2026-10-02 (хэрэглэгчийн хүсэлт): «2. Байршил» / «5. Зураг» гэж
                   алхмын УРД нь гарч байсан ДУГААР ХАСАГДАВ ✗ → зөвхөн
                   «Байршил» / «Зураг» ✓ (`{step + 1}. ` арилав;
                   `[data-step-current]` selector ХЭВЭЭР ✓) */}
            {/* ⚠️ 2026-10-05 (2 дахь засвар): 🖥 дээр ч алхмат болсон тул
                алхмын нэр нь БҮХ дэлгэцэд харагдана (`sm:hidden` ХАСАГДАВ)
                — өмнө нь 🖥 дээр «Зар нийтлэх» гэсэн тогтмол бичиг байв
                ⚠️ 2026-10-05 (57): `{currentStep.label}` → `{stepLabel}`
                   (🖥 дээр нэгтгэсэн 3 дахь хуудсанд «Дэлгэрэнгүй ба үнэ, зураг» —
                   дээрх (`const stepLabel`) тайлбарыг үз ✓) */}
            <span data-step-current className="font-semibold text-gray-800">{stepLabel}</span>
          </>
        )}
      </nav>

      <div className="mx-auto w-full max-w-3xl">
        <div className="section-card !p-0">
          {/* ⚠️ 2026-10-01 — хэрэглэгчийн ХОЁР хүсэлтээр ЭНЭ ГАЗРЫН ХАРАГДАЦ
              БҮРЭН ЦЭВЭРЛЭВ:
              ① «Зар нэмэхэд энийг харуулахгүй» → ДЭЭД ТОЛГОЙ БҮХЭЛДЭЭ ХАСАГДАВ
                 («➕ Зар нэмэх» гарчиг · «1/5 · …» заагч · 5 АЛХМЫН ТАБ ·
                 дэвшлийн цэнхэр зурвас · хаах × товч). ⚠️ `goToStep` ч хасагдав
                 (табуудгүй бол ашиглагдахгүй → eslint no-unused-vars ✗).
              ② «энэ бүгдийг нь зайлуул, харахыг хүсэхгүй байна» → форм ДОТРОХ
                 алхмын гарчиг (`data-step-heading`) БҮХЭЛДЭЭ ХАСАГДАВ —
                 «1/5-Р АЛХАМ · Ангилал · Юу зарах вэ?» блок (мөн `STEPS[].short`).
              ③ (2 дахь хүсэлт) «энэ бүгдийг нь зайлуул, харахыг хүсэхгүй байна»
                 → «Категорио сонгоно уу» ГАРЧИГ Ч ХАСАГДАВ — асуулт нь ЗӨВХӨН
                 `role="group"` + `aria-label` (screen reader) хэвээр ✓
              ④ «дэд төрөл биш зүгээр л Төрөл гэж нэрлэ» → баганын толгой
                 «Дэд төрөл» → «Төрөл» (бүлэгтэй хэсгийн «Дэд бүлэг» ХЭВЭЭР) ✓
                 ⚠️ 2026-10-01 (4 дэх засвар) — баганын толгой (title) БҮХЭЛДЭЭ
                 ХАСАГДАВ (сонгосон утгатай давхардаж байв ✗); оронд нь багана
                 бүрд мобайлд л гарах жижиг шошго (`mobileLabel`) үлдэв ✓
              ℹ️ Алхмын мэдээлэл нь одоо ЗӨВХӨН дээд breadcrumb-аас харагдана —
                 `{currentStep.label}` (⚠️ 2026-10-02-д алхмын ДУГААР арилав)
                 ба `[data-step-current]` нь CDP тестийн тогтвортой selector ✓). Форм нь `section-card`-ийн p-6
                 дотроос ШУУД эхэлнэ (1-р алхамд ОДОО ямар ч ХАРАГДАХ гарчиг БАЙХГҮЙ — шууд
                 баганат сонголт эхэлнэ ✓).
                 Навигаци: «← Буцах» (нэг алхам) / 0-р алхам дээр «Цуцлах» ✓ */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-2.5 text-red-800">{error}</div>}

            {/* ═══ 📝 НООРОГ СЭРГЭЭГДЭВ (2026-10-05, 54) ═══
                Хэрэглэгчийн гомдол: «…гар утасны browser санамсаргүй refresh
                хийхэд оруулж байсан мэдээлэл байхгүй болж байна» ⇒ `localStorage`-д
                хадгалагдсан ноорог сэргээгдсэн үед ЭНЭ мэдэгдэл гарна.
                ⚠️ Зөвхөн сэргээлт БОЛСОН үед (`draftNotice`) — хоосон форм дээр
                   хэзээ ч гарахгүй ✓
                ⚠️ Товч нь `type="button"` — форм ДОТОР байгаа тул заавал
                   (эс бөгөөс дарахад форм submit болж, «Зарын гарчиг оруулна уу»
                   гэсэн алдаа гарна ✗ — (52)-ийн «✏️ Засах»-тай ижил урхи)
                🔍 Хайх үг: data-draft-restored, data-draft-discard, ноорог */}
            {draftNotice && (
              <div
                data-draft-restored="true"
                className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-900"
              >
                <span className="min-w-[12rem] flex-1">{draftNoticeText(draftNotice)}</span>
                <button
                  type="button"
                  data-draft-discard="true"
                  onClick={discardDraft}
                  className="shrink-0 rounded-md border border-amber-400 bg-white px-2.5 py-1 font-medium text-amber-900 hover:bg-amber-100"
                >
                  🗑 Устгах
                </button>
              </div>
            )}

            {/* ═══ 🖥 ≥640px · СОНГОСОН АНГИЛАЛ / БАЙРШИЛ (2026-10-05) ═══
                Хэрэглэгчийн хүсэлт: «сонгосон категори/байршил компьютер дээр
                харагдахгүй байна» ⇒ 📱 `MobileAnswers` нь `sm:hidden` байсан
                тул 🖥 2-р алхмаас хойш юу сонгосноо харах газар БАЙХГҮЙ байв ✗
                ⚠️ `step === 0` (Ангилал) дээр ГАРАХГҮЙ: сонгосон зам нь баганын
                   цэнхэр мөр + доорх `[data-picker-summary]` дээр бий
                   (давхардал үүсгэхгүй ✓) — `DesktopSummary`-ийн тайлбарыг үз ✓
                ⚠️ 📱 <640px дээр `hidden` (мобайл нь `MobileAnswers`-тай ✓)
                ⚠️ 2026-10-05 (2 дахь засвар): `step` нь ОДОО дахин хэрэгтэй
                   болов (🖥 дээр алхамт болсон) ⇒ `step={step}` проп ✓
                🆕 2026-10-05 (52): `onEdit` нь 📱 `mobileAnswerEdit`-ийг дамжуулна
                   — мөр БҮРД «✏️ Засах» товч (`gotoStep(0)` / `gotoStep(1)`) ✓
                   ⚠️ ⚠️ Handler нь 📱-тай НЭГ ЭХ СУРВАЛЖ (дахин бичихгүй ✓) */}
            <DesktopSummary
              categoryPath={pickedCategoryPath}
              locationPath={pickedLocationPath}
              step={step}
              onEdit={mobileAnswerEdit}
            />

            {/* ═══ 1-р алхам · АНГИЛАЛ — 3 БАГАНАТ СОНГОЛТ (unegui.mn загвар) ═══
                ⚠️ Хэрэглэгч эндээс ① ХЭСЭГ → ② «Зарах/Түрээслэх»/Дэд бүлэг → ③ ТӨРӨЛ
                   гэж ДАРААЛАН сонгоно. ⚠️ 2026-10-01 (4 дэх засвар) — баганын
                   ДЭЭД ЦЭНХЭР ТОЛГОЙ ХАСАГДАВ (сонгосон утга нь доорх мөр дээрээ
                   цэнхэрээр байсан тул давхардал байв ✗); сонгосон утга нь зөвхөн
                   ① мөрийн цэнхэр дэвсгэр ② доорх «Сонгосон: …» мөрөнд ✓ */}
            {/* 🪜 АЛХАМ БҮР НЭГ ХЭСЭГ — 🖥 ≥640px БА 📱 <640px ХОЁУЛАНД ИЖИЛ
                (2026-10-05, 2 дахь засвар): «🖥 нэг урт хуудас» (бүх 5 алхам
                ЗЭРЭГ) нь АЛДАА байв ✗ — сонгосон категори/байршлын хэсэг
                ДАРААГИЙН алхамд МӨН харагдаж, «өмнөх алхмын хэсэг дахин гарч
                ирэх» болсон тул ХҮЧИНГҮЙ БОЛОВ ⇒ форм нь 📱 шиг алхамт болов ✓
                ⚠️ Механизм нь `hidden` (`display:none` — Tailwind) КЛАСС:
                   идэвхтэй бус блок бүр НУУГДАХАД 🖥 БА 📱 ХОЁУЛАНД биш,
                   ЗӨВХӨН ОДООГИЙН `step`-ийн блок харагдана ✓
                   (⏳ өмнө нь `hide-below-sm` байв — тэр нь ЗӨВХӨН <640px-д
                    нуудаг тул 🖥 дээр бүгд харагддаг байлаа ✗)
                ⚠️ Блок бүр DOM-д БАЙНГА (`data-step-block` — CDP/тестийн
                   тогтвортой selector ✓); React-ийн `{step === N && …}`
                   хаалт хэрэглэхгүй (DOM-д байх нь CDP-д ашигтай ✓)
                🔍 Хайх үг: data-step-block, hidden, алхамт форм */}
            <div data-step-block="category" className={step === 0 ? '' : 'hidden'}>
            {/* ⚠️ 2026-10-01 (2 дахь засвар) — «Категорио сонгоно уу» ГАРЧИГ Ч
                ХАСАГДАВ (хэрэглэгч: «энэ бүгдийг нь зайлуул, харахыг хүсэхгүй
                байна» → дэлгэцийн зураг дээр яг энэ гарчгийг заасан).
                ⚠️ Асуулт нь доорх `role="group"` + `aria-label`-д (screen
                reader) ХЭВЭЭР ✓ — харагдах текст DOM-д 0 байхыг CDP шалгана ✓ */}
            {/* 📱 МОБАЙЛ (<640px): АСУУЛТ БҮР НЭГ ДЭЛГЭЦ — «нэг нэгээр нь»
                (`unegui.mn/post_ad/` загвар, 2026-10-02, хэрэглэгчийн хүсэлт).
                ⚠️ `key` нь дэлгэц солигдоход хайлтын талбарыг ЦЭВЭРЛЭНЭ ✓;
                   `data-mobile-question` нь CDP-ийн ТОГТВОРТОЙ selector
                   (`[data-picker*]`-аас ТУСДАА — доорх тоог хөндөхгүй ✓) */}
            <MobileQuestion
              key={`cat-${mobileCatScreen.key}`}
              title={mobileCatScreen.title}
              items={mobileCatScreen.items}
              value={mobileCatScreen.value}
              onPick={mobileCatScreen.onPick}
              onBack={mobileCatBack}
              emptyText="Сонголт байхгүй"
            />
            {/* 🖥 ≥640px: 3 БАГАНАТ СОНГОЛТ (хэвээр — `hidden sm:grid`) */}
            <div role="group" aria-label="Категорио сонгоно уу" className={`hidden gap-px overflow-hidden rounded-lg border border-gray-300 bg-gray-200 sm:grid ${hasThirdColumn ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              {/* ① ХЭСЭГ — Автомашин / Ажлын зар / Компьютер … (0016) */}
              <PickerColumn
                pickRole="section"
                mobileLabel="Хэсэг"
                items={sectionItems}
                value={sectionValue}
                onPick={pickSection}
                className="bg-white"
              />
              {/* ② «Зарах / Түрээслэх» (зөвхөн үл хөдлөх) эсвэл Дэд бүлэг эсвэл Төрөл
                  ⚠️ 2026-10-01 (4 дэх засвар) — толгой ХАСАГДАВ (`title` проп
                     бүхэлдээ байхгүй болов); сонгосон утга нь мөр дээрээ ✓ */}
              <PickerColumn
                pickRole="level2"
                mobileLabel={hasGroups && !showCategoryChoice ? 'Дэд бүлэг' : 'Төрөл'}
                items={level2Items}
                value={level2Value}
                onPick={pickLevel2}
                emptyText={showCategoryChoice ? 'Зар эсвэл түрээсээ сонгоно уу' : 'Төрлөө сонгоно уу'}
                className="bg-white"
              />
              {/* ③ LEAF ТӨРӨЛ — хавтгай хэсэгт ГАРАХГҮЙ (2 багана) ✓
                  ⚠️ 2026-10-01 (4 дэх засвар) — толгойн цэнхэр зурвас ХАСАГДАВ
                     (сонгосон Төрөл нь мөр дээрээ цэнхэрээр харагдана);
                     мобайлд `ТӨРӨЛ` жижиг шошго `sm:hidden`-ээр гарна ✓ */}
              {hasThirdColumn && (
                <PickerColumn
                  pickRole="level3"
                  mobileLabel="Төрөл"
                  items={level3Items}
                  value={form.propertyType}
                  onPick={(v) => set('propertyType', v)}
                  emptyText={hasGroups && !openGroup ? 'Эхлээд дэд бүлгээ сонгоно уу' : 'Төрөл байхгүй'}
                  className="bg-white"
                />
              )}
            </div>
            {/* ---- Сонгосон зам (unegui.mn-ийн breadcrumb мэт) + дараагийн алхам ---- */}
            <p data-picker-summary className="mt-3 rounded-lg bg-gray-50 px-3 py-2.5 text-[13px] text-gray-600">
              {form.propertyType ? (
                <>
                  Сонгосон:{' '}
                  <b className="text-gray-900">{sectionDef.icon} {sectionDef.label}</b>
                  {showCategoryChoice && (
                    <> › <b className="text-gray-900">{categoryItems.find((c) => c.value === form.category)?.label}</b></>
                  )}
                  {selectedGroupLabel && (
                    <> › <b className="text-gray-900">{selectedGroupLabel}</b></>
                  )}
                  {' '}› <b className="text-gray-900">{selectedLeafLabel}</b>
                </>
              ) : showCategoryChoice ? (
                'Хэсэг → «Зар эсвэл түрээс» → төрлөө сонгоно уу.'
              ) : hasGroups ? (
                'Хэсэг → дэд бүлэг → төрлөө сонгоно уу.'
              ) : (
                'Төрлөө сонгоно уу.'
              )}
            </p>
            </div>

            {/* ═══ 2-р алхам · БАЙРШИЛ — 3 БАГАНАТ СОНГОЛТ (2026-10-01) ═══
                ⚠️ Хэрэглэгчийн хүсэлт: «Байршлыг 3т биш 2т оруулдаг мэдээлэл
                   болго, ингэхдээ 1т зар оруулж байгаатай адилхан форматтай
                   болгоорой» → ① алхмын БАЙРЛАЛ 3 → **2** ② харагдац нь 1-р
                   алхмын БАГАНАТ сонголттой ЯГ ИЖИЛ (`<select>` БИШ ✓)
                ⚠️ Талбарууд: Хот/Аймаг · Дүүрэг · Хороо — 🆕 2026-10-05: ХОРОО нь
                   БҮХ ХЭСЭГТ харагдана (⚡ `simpleForm` ч мөн адил — хэрэглэгчийн
                   гомдол: «Барилгын материалын зар … хороо гарч ирэхгүй»)
                ⚠️ `simpleForm` нь ЗӨВХӨН `attrFields` (✅ Шинэ/Шинэвтэр/Хуучин)
                   ба 🎥 YouTube линкэд л үйлчилнэ — байршилд үйлчлэхгүй ✓
                ⚠️ Засах горимд хуучин утга (`city`/`district`/`khoroo`) нь
                   `form`-оос уншигдаж ТОХИРСОН баганад идэвхтэй харагдана ✓ */}
            <div data-step-block="location" className={step === 1 ? '' : 'hidden'}>
            {/* 🚫 «Байршил сонгохгүй» ЧЕКБОКС (2026-10-06) — энэ блокийн
                ХАМГИЙН ДООД талд (`[data-location-summary]`-гийн ДАРАА) байна ⬇
                ⚠️ Хэрэглэгчийн 2 дахь засвар: «Байршил сонгохгүй гэсэн
                   чекбоксыг байршил оруулах хэсгийнхээ ДООД талд нь оруулаад
                   байрыг нь солиод өгөөч» ⇒ сонголтын дэлгэцүүдийн ДАРАА ✓
                🔍 Хайх үг: data-no-location (ДООД талд) */}
            {/* 📱 МОБАЙЛ (<640px): Хот/Аймаг → Дүүрэг → Хороо — нэг нэгээр нь
                (1-р алхмын `MobileQuestion`-тэй ЯГ ИЖИЛ харагдац)
                ⚠️ Чекбокс асаалттай бол дэлгэцүүд ОГТ ГАРАХГҮЙ (`!noLoc`) —
                   📱 дээр «Байршил сонгохгүй» гэсэн 1 дарт хангалттай ✓
                ⚠️ ⬇ Дэлгэц бүрийн ДОР нь «Сонгосон: …» мөр ба 🚫 чекбокс
                   (хоёулаа энэ нөхцөлийн ГАДНА — блокийн доод эгнээ ✓)
                ⚠️ Алхмын доод «← Буцах / Үргэлжлүүлэх →» товчнууд нь ЭНЭ блокийн
                   ГАДНА (`<form>`-ийн ёроолд) тул 📱 дээр навигаци хаагдахгүй ✓ */}
            {!noLoc && (
            <MobileQuestion
              key={`loc-${mobileLocScreen.key}`}
              title={mobileLocScreen.title}
              items={mobileLocScreen.items}
              value={mobileLocScreen.value}
              onPick={mobileLocScreen.onPick}
              onBack={mobileLocBack}
              emptyText="Сонголт байхгүй"
            />
            )}
            {/* 🖥 ≥640px: 3 БАГАНАТ СОНГОЛТ (`hidden sm:grid` — 🆕 2026-10-05:
                баганын тоо нь ХЭСГЭЭС ХАМААРАХГҮЙ, үргэлж 3 ✓)
                ⚠️ Чекбокс асаалттай бол `pointer-events-none opacity-40` +
                   `aria-disabled` — мөрүүд нь DOM-д ХЭВЭЭР (CDP тестийн
                   баганын тоо/жагсаалт хөндөгдөхгүй ✓), зөвхөн дарагдахгүй ✓ */}
            <div
              role="group"
              aria-label="Байршлаа сонгоно уу"
              aria-disabled={noLoc ? 'true' : 'false'}
              data-location-disabled={noLoc ? 'true' : 'false'}
              className={`hidden gap-px overflow-hidden rounded-lg border border-gray-300 bg-gray-200 sm:grid sm:grid-cols-3 ${
                noLoc ? 'pointer-events-none opacity-40' : ''
              }`}
            >
              {/* ① ХОТ / АЙМАГ — солисон үед дүүрэг ба хороо ЦЭВЭРЛЭГДЭНЭ ✓ */}
              <PickerColumn
                pickRole="loc-city"
                mobileLabel="Хот / Аймаг"
                items={cityItems}
                value={form.city}
                onPick={changeCity}
                emptyText="Хот / Аймаг байхгүй"
                className="bg-white"
              />
              {/* ② ДҮҮРЭГ — хорооны жагсаалт ЗӨВХӨН эндээс хамаарна ✓ */}
              {/* 🏷️ 2026-10-03 (14): шошго «Дүүрэг / Сум» → «Дүүрэг» (хэрэглэгчийн
                  хүсэлт) — `title` ба `mobileLabel` ба `emptyText` БҮГД ✓ */}
              <PickerColumn
                pickRole="loc-district"
                mobileLabel="Дүүрэг"
                items={districtItems}
                value={form.district}
                onPick={changeDistrict}
                emptyText="Дүүрэг байхгүй"
                className="bg-white"
              />
              {/* ③ ХОРОО — 🆕 2026-10-05: БҮХ ХЭСЭГТ харагдана (⚡ `simpleForm` ч
                  мөн адил — хэрэглэгчийн гомдол: «Барилгын материалын зар
                  оруулхад … хороо оруулах хэсэг гарч ирэхгүй байна» ✓)
                  ⚠️ Засах горимд хуучин `khoroo` утга нь `form` дотроос
                     уншигдаж, идэвхтэй мөр болж харагдана ✓ */}
              <PickerColumn
                pickRole="loc-khoroo"
                mobileLabel="Хороо"
                items={khorooItems}
                value={form.khoroo}
                onPick={changeKhoroo}
                emptyText={form.district ? 'Хороо байхгүй' : 'Эхлээд дүүргээ сонгоно уу'}
                className="bg-white"
              />
            </div>
            {/* ---- Сонгосон байршил — 1-р алхмын `[data-picker-summary]`-тэй
                ижил харагдац. ⚠️ ТУСДАА атрибут (`data-location-summary`) —
                picker-ийн CDP тест `[data-picker-summary]`-г дан ганц гэж
                үздэг тул саад болохгүй ✓ ---- */}
            <p
              data-location-summary
              className={`mt-3 rounded-lg px-3 py-2.5 text-[13px] ${
                noLoc ? 'bg-primary-light text-primary' : 'bg-gray-50 text-gray-600'
              }`}
            >
              {noLoc ? (
                /* 🚫 Чекбокс асаалттай — юу болохыг тодорхой хэлнэ (нэг эх
                   сурвалж: `lib/listingLocation.mjs → NO_LOCATION_SUMMARY`) */
                NO_LOCATION_SUMMARY
              ) : form.city ? (
                <>
                  Сонгосон:{' '}
                  <b className="text-gray-900">📍 {form.city}</b>
                  {form.district ? <> › <b className="text-gray-900">{form.district}</b></> : null}
                  {form.khoroo ? <> › <b className="text-gray-900">{form.khoroo}</b></> : null}
                </>
              ) : (
                'Хот/Аймаг → дүүрэг → хороогоо дараалан сонгоно уу.'
              )}
            </p>
            {/* ═══════════ 🗺 ГАЗРЫН ЗУРАГ ДЭЭРХ БАЙРШИЛ — ПИН (2026-10-06) ═══════════
                ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Хэрэглэгч хаягаа оруулсны дараа шууд
                   газрын зураг дээр зааж өгөх боломжтой хэсэг тухайн цонхон
                   дээр нь гараад ирдэг юм байна (unegui.mn)» ⇒ 2-р алхамд
                   «🗺 Газрын зураг дээр заах» товч + пингийн утга ✓
                🆕 (2026-10-07) товчны нэр НЭГДСЭН «Газрын зураг дээр заах»
                   боллоо (хэрэглэгчийн хүсэлт: «Газрын зураг дээр дахин заах
                   хэсэг гэдгийг Газрын зураг дээр заах гэж нэрлэ») + доор нь
                   📋 Google Maps «Copy link» оруулах талбар (`data-map-link-*`)
                ⚠️ Пин-пикер нь ТУСДАА модаль (`components/LocationMapPicker.jsx`)
                   — доорх 3 баганат сонголтыг ХӨНДӨХГҮЙ ✓
                ⚠️ Чекбокс асаалттай (`noLoc`) үед ЭНЭ блок ГАРАХГҮЙ (байршил
                   заахгүй гэсэн шийдвэртэй зөрчилдөхгүй ✓)
                🔍 Хайх үг: data-map-picker-open, data-map-picker-value,
                   data-map-picker-clear, LocationMapPicker */}
            {!noLoc && (
              <div data-map-picker-block className="mt-3 rounded-lg border border-gray-200 bg-gray-50/70 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    data-map-picker-open
                    onClick={() => setMapPickerOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-[14px] font-semibold text-gray-800 transition hover:border-primary hover:text-primary"
                  >
                    🗺 Газрын зураг дээр заах
                  </button>
                  {hasCoords(form) && (
                    <>
                      <span data-map-picker-value className="text-[13px] font-medium text-gray-600">
                        📍 {Number(form.latitude).toFixed(5)}, {Number(form.longitude).toFixed(5)}
                        {mapPickIsApprox ? ' (ойролцоо)' : ''}
                      </span>
                      <button
                        type="button"
                        data-map-picker-clear
                        onClick={clearMapPick}
                        className="text-[13px] font-semibold text-gray-400 transition hover:text-red-500"
                      >
                        ✕ Арилгах
                      </button>
                    </>
                  )}
                </div>
                <p className="mt-1.5 text-[12.5px] leading-snug text-gray-500">
                  Газрын зураг дээр пин тавибал зар ЗӨВ байрлалд харагдана.
                  {mapPickIsApprox
                    ? ` Одоогоор ${form.khoroo ? 'сонгосон хорооны' : form.district ? 'сонгосон дүүргийн' : 'хотын'} төвд ойролцоогоор байна — нарийвчлах бол газрын зураг дээр дарна уу.`
                    : ''}
                </p>
                {/* ═══════════ 📋 GOOGLE MAPS «COPY LINK» (2026-10-07) ═══════════
                    ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «… газрын зураг дээр заах хэсэг дээр
                       оруулах сонголтоос гадна, нэмэлтээр google maps аас авсан
                       Copy link ээ оруулдаг хэсэгтэй байвал болох уу»
                    ⇒ Пин тавихаас ГАДНАХ гарц: линк тавиад «Оруулах» дарбал
                      `parseGoogleMapsLink` нь СОЛБИЦОЛЫГ задлаж, пингүй бол
                      ЗАР ГАЗРЫН ЗУРАГ ДЭЭР ГАРАХ болов ✓
                    🆕 (2026-10-07) БОГИНО линк (`maps.app.goo.gl/…`): хөтчөөс
                      солбицол өгдөггүй тул СЕРВЕР (`/api/resolve-map-link`)
                      дамжиж задална — амжилттай бол солбицол бичигдэнэ ✓
                    ⚠️ Линк өөрөө ХАДГАЛАГДАХГҮЙ — зөвхөн `latitude`/`longitude`
                       (аль хэдийн байгаа багана) руу бичигдэнэ (migration 0 ✓)
                    🔍 Хайх үг: data-map-link-input, data-map-link-btn,
                       data-map-link-msg, applyMapLink, parseGoogleMapsLink,
                       resolve-map-link, isShortMapsLink */}
                <div className="mt-3 border-t border-gray-200 pt-3">
                  <label className="mb-1.5 block text-[12.5px] font-semibold text-gray-600">
                    📋 {MAP_LINK_LABEL}
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      inputMode="url"
                      data-map-link-input
                      value={mapLink}
                      onChange={(e) => changeMapLink(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); applyMapLink(); }
                      }}
                      placeholder={MAP_LINK_PLACEHOLDER}
                      className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[13.5px] text-gray-900 outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      data-map-link-btn
                      onClick={applyMapLink}
                      disabled={mapLinkMsg.kind === 'loading'}
                      className="shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-gray-800 transition hover:border-primary hover:text-primary disabled:opacity-60"
                    >
                      {MAP_LINK_BTN}
                    </button>
                  </div>
                  {mapLinkMsg.kind && (
                    <p
                      data-map-link-msg
                      data-map-link-msg-state={mapLinkMsg.kind}
                      className={`mt-1.5 text-[12.5px] leading-snug ${
                        mapLinkMsg.kind === 'ok'
                          ? 'font-medium text-primary'
                          : mapLinkMsg.kind === 'loading'
                            ? 'text-gray-500'
                            : 'text-red-600'
                      }`}
                    >
                      {mapLinkMsg.text}
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* ═══════════ 🚫 «Байршил сонгохгүй» ЧЕКБОКС — ДООД ТАЛД ═══════════
                ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (1): «Зарим хэрэглэгч зарын Байршилаа
                   оруулахыг хүсэхгүй хүн байж магадгүй. Тэдгээр хүмүүст зориулж
                   Байршил хэрэглэхгүй гэсэн сонголтыг (Check box ч юм уу)
                   Байршил хэсэгт оруулж өгье»
                ⚠️ Хэрэглэгчийн ХҮСЭЛТ (2, байрлал): «Байршил сонгохгүй гэсэн
                   чекбоксыг байршил оруулах хэсгийнхээ ДООД талд нь оруулаад
                   байрыг нь солиод өгөөч» ⇒ ⬆ ДЭЭД талаас ⬇ ДООД талд шилжив:
                   📱 сонголтын дэлгэцүүд → 🖥 3 баганат сонголт → «Сонгосон: …»
                   мөр → ЭНЭ ЧЕКБОКС (блокийн ХАМГИЙН ДООД эгнээ ✓)
                ⚠️ АСААВАЛ: ① 3 баганат сонголт ИДЭВХГҮЙ (📱 дээр дэлгэцүүд
                   бүхэлдээ гарахгүй) ② хот/дүүрэг/хороо ЦЭВЭРЛЭГДЭнэ ⇒ зар нь
                   БАЙРШИЛГҮЙ хадгалагдана (`city = ''`, DB/migration өөрчлөлт 0 ✓)
                ⚠️ УНТРААВАЛ: өмнө сонгосон байршил нь БУЦАЖ ирнэ (алдагдахгүй ✓)
                ⚠️ `NO_LOCATION_SUMMARY` нь «ДООРХ чекбоксыг УНТРААНА уу» гэж
                   заана (чекбокс нь түүний ДООР байгаатай нийцэв ✓)
                ⚠️ `mt-3` (`mb-3` БИШ) — сонголтын дээд хэсгээс зай авна ✓
                ⚠️ 📱 дээр ч ЭНЭ мөр нь сонголтын дэлгэц бүрийн доор ХАРАГДАНА
                   (дэлгэцүүд `!noLoc`-оор хаагддаг ч чекбокс нь тэдний ГАДНА ✓)
                ⚠️ `data-no-location` — CDP/тестийн тогтвортой selector; текстийн
                   эх сурвалж нь `lib/listingLocation.mjs` (`NO_LOCATION_*`) ✓
                🔍 Хайх үг: data-no-location, toggleNoLocation, isNoLocation,
                   noLocationPatch, locationMissing, bankedLocationRef */}
            <label
              data-no-location
              className={`mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition ${
                noLoc ? 'border-primary bg-primary-light' : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                data-no-location-input
                checked={noLoc}
                onChange={(e) => toggleNoLocation(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="min-w-0">
                <span className={`block text-[13.5px] font-semibold ${noLoc ? 'text-primary' : 'text-gray-900'}`}>
                  {NO_LOCATION_TITLE}
                </span>
                <span className="block text-[12.5px] leading-snug text-gray-500">{NO_LOCATION_HINT}</span>
              </span>
            </label>
            </div>

            {/* ═══ 3-р алхам · ДЭЛГЭРЭНГҮЙ (үндсэн үзүүлэлт ба нэмэлт талбарууд) ═══
                ⚠️ 2026-10-01: «Байршил» 2-р алхам болсон тул ЭНЭ блок 3-р
                   алхам (`step === 2`) дээр render болно (STEPS дараалал солигдсон ✓)
                ⚠️ 2026-10-05 (57): 🖥 дээр 3, 4, 5-р алхам НЭГ хуудас болсон тул
                   энэ блок 🖥 дээр `?step=4`/`?step=5` хаягаар (эсвэл 📱→🖥
                   resize-ээр) орсон ч `hidden sm:block`-ээр ХАРАГДАНА ✓ (хуудас
                   хагас хоосон болохгүй ✓); 📱 дээр ЗӨВХӨН 3 дахь дэлгэцэд
                   (`step === 2`) ✓
                ⚠️ 4, 5-р алхмын блок (price · desc · media · media-images) нь
                   ЯГ ИЖИЛ зарчмаар `hidden sm:block`-тай ✓
                🔍 Хайх үг: data-step-block, details, hidden sm:block */}
            <div data-step-block="details" className={step === 2 ? '' : step === 3 || step === 4 ? 'hidden sm:block' : 'hidden'}>
            {/* 📱 МОБАЙЛ (<640px): 3-Р АЛХМЫН «АСУУЛТ БҮР НЭГ ДЭЛГЭЦ» — толгой
                (← товч + асуулт + «2/9» явц). ⚠️ `data-mobile-detail-key` нь
                CDP-ийн ТОГТВОРТОЙ selector (аль дэлгэц дээр байгааг хэлнэ) ✓
                ⚠️ Нийт тоо нь динамик: 🏠 Газар дээр «1/1», орон сууцан дээр
                   «1/8» гэх мэт (`detailScreens.length`) ✓ */}
            <div data-mobile-detail-head data-mobile-detail-key={activeDetail.key} className="sm:hidden">
              <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
                <button
                  type="button"
                  data-mobile-detail-back
                  onClick={mobileDetailBack}
                  aria-label="Буцах"
                  className="-ml-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg text-gray-700 active:bg-gray-100"
                >
                  ←
                </button>
                <h2 className="min-w-0 flex-1 truncate text-[17px] font-bold text-gray-900">Зар нийтлэх</h2>
                <span className="shrink-0 text-[12px] font-semibold tabular-nums text-gray-400">
                  {detailIdx + 1}/{detailScreens.length}
                </span>
              </div>
            </div>
            {/* 📱 «ӨМНӨХ ХАРИУЛТУУД» — толгойн ДОР (unegui.mn-ийн хэв, 2026-10-03 (17)):
                хариулсан асуулт бүр мөр болж, ✏️ дарж буцаж засна ✓
                ⚠️ Толгойд асуултын нэр ГАРАХГҮЙ (нэр ДАВХАРДАХГҮЙ ✓) — асуулт
                   нь доор, өөрийн талбарын толгойн мөрөнд (label) харагдана ✓ */}
            <MobileAnswers rows={mobileAnswerRows} onEdit={mobileAnswerEdit} />
            {/* ═══ 🏷️ ЗАРЫН ГАРЧИГ (2026-10-02) — БҮХ ХЭСЭГТ, ХАМГИЙН ЭХЭНД ═══
                хэрэглэгчийн хүсэлт: «Бүх зард Зарын гарчиг гэдэг утга оруулахаа
                мартсан байна. Тэр нь зарын карт дээр Үнэ мэдээллийн доор bold
                font-той, бас Үнээс бага зэрэг жижиг харагдах юм.»
                ⚠️ ХЭСГИЙН нэмэлт талбаруудаас (attrs/өрөө/давхар…) ӨМНӨ — ингэснээр
                   «нэмэлт талбаргүй» хэсэг (ж: 🏠 Газар) дээр ч 3-р алхам
                   ХООСОН харагдахгүй ✓
                ⚠️ Мөр нь бусадтай ИЖИЛ `form-row-single` + `data-form-row="details"`
                   → 🖥 ≥640px дээр нэр нь ЗҮҮЛ талд (хэвтээ), 📱 мобайлд нэг
                   нэгээрээ (нэр оролтын дээр, бүтэн өргөн) ✓
                ⚠️ ШИНЭ зард ЗААВАЛ (`validateStep('details')` → «Зарын гарчигаа
                   оруулна уу»); засах горимд ЗААВАЛ БИШ — 0027 орохоос өмнөх
                   зарууд дээр гарчиг байхгүй тул блоклохгүй ✓
                ⚠️ 120 тэмдэгт (`MAX_LISTING_TITLE_LENGTH` = DB-ийн CHECK = queries.js)
                   🔍 Хайх үг: listingTitle, 0027_listing_title.sql */}
            <div
              className="form-row-single"
              data-form-row="details"
              data-detail-row="title"
              data-mobile-active={detailRowActive('title')}
            >
              <div className="form-group" data-detail-field="title" data-mobile-active={detailFieldActive('title')}>
                <label>Зарын гарчиг *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  maxLength={MAX_LISTING_TITLE_LENGTH}
                  placeholder="Гарчиг"
                />
                <p className="form-hint">
                  Карт дээр үнийн доор харагдана — товч, ойлгомжтой бичнэ үү
                  (дээд тал нь {MAX_LISTING_TITLE_LENGTH} тэмдэгт)
                </p>
              </div>
            </div>
            {/* ⚠️ Энэ хэсэг/төрөлд тохирох нэмэлт талбар БАЙХГҮЙ бол
                хэрэглэгчид ойлгуулна (ж: «Газар» төрөлд өрөө/давхар байхгүй) ✓ */}
            {!(showRooms || showFloors || showApartment || showBathrooms || attrFields.length > 0) && (
              /* 🛡️ 2026-10-02 — төрөл СОНГООГҮЙ бол «нэмэлт талбар байхгүй» гэж
                 хэлэх нь БУРУУ (хэрэглэгчийн гомдол: «зарын дэлгэрэнгүй асуух
                 хэсэг байхгүй болсон») → 1-р алхам руу буцах товчтой мессеж ✓ */
              form.propertyType ? (
                <p className="mb-3 rounded-lg bg-gray-50 p-3 text-[13px] text-gray-500">
                  Энэ төрөлд нэмэлт талбар байхгүй — «Үргэлжлүүлэх» дээр дарна уу.
                </p>
              ) : (
                <p className="mb-3 rounded-lg bg-gray-50 p-3 text-[13px] text-gray-600">
                  Зарын төрөл сонгоогүй байна.{' '}
                  <button
                    type="button"
                    onClick={() => { setError(''); gotoStep(0); }}
                    className="font-semibold text-primary underline"
                  >
                    Ангилал
                  </button>{' '}
                  алхамд төрлөө сонгоод буцаж ирнэ үү.
                </p>
              )
            )}
            {/* ===== ХЭСГИЙН НЭМЭЛТ ТАЛБАРУУД (attrs jsonb, 0016) =====
                ⚠️ Хэсэг тус бүрд өөр (Авто: брэнд/он/гүйлт/түлш; Ажил: компани/
                   цалин; Компьютер: дэд төрлөөс хамаарч — 💻 Notebook-ийн
                   Дэлгэц/CPU/RAM/Хард, 2026-09-30 (6)). `attrFields`-ээс
                   автоматаар үүснэ — шинэ талбар нэмэхэд код засахгүй ✓
                ⚠️ ХАРАГДАХ талбарууд нь `getAttrFields(section, subtype)`-ээр
                   шүүгдэнэ: `onlySubtypes` БАЙХГҮЙ талбар нь бүх дэд төрөлд ✓,
                   байгаа бол ЗӨВХӨН тэр дэд төрөлд (ж: 💻 Notebook-ийн 21 брэнд,
                   «Иж бүрэн компьютер», «Процессор, сервер») ✓
                🔎 `searchable: true` (ж: 🏷️ Үйлдвэрлэгч — 95 сонголт) нь ХАЙЛТТАЙ
                   COMBOBOX: бичнэ → жагсаалт шүүгдэнэ; жагсаалтад байхгүй
                   брэндийг ГАРААР бичиж болно ✓ (хэрэглэгчийн хүсэлт). */}
            {attrFields.length > 0 && (
              /* ⚠️ 2026-10-01 (5 дахь засвар): «Дэлгэрэнгүй хэсгийн мэдээллийг
                 оруулах хэсгийг ЦУВАА буюу 1 БАГАНА болго» → 3-р алхмын БҮХ
                 мөр нь `form-row-single` (globals.css) — `sm`-ээс хойш Ч
                 2 багана БОЛОХГҮЙ, талбарууд ЦУВАА байрлана ✓
                 (`data-form-row="details"` = CDP-ийн тогтвортой selector)
                 🆕 (6 дахь засвар, 2026-10-01): «Дэлгэрэнгүй мэдээлэл оруулах
                 НЭРНҮҮДИЙГ дээр нь биш, ЗҮҮН талд нь гаргаад өгөөч» → энэ мөр
                 доторх `.form-group` бүр ХЭВТЭЭ (нэр зүүн багана, оролт баруун
                 багана) — ЗӨВХӨН CSS-ээр шийдэв (`globals.css`,
                 `[data-form-row="details"] > .form-group`), JSX-ийн бүтэц
                 ХӨНДӨГДӨӨГҮЙ ✓ (4/5-р алхам хэвээр — нэр нь оролтын дээр) */
              <div
                className="form-row-single"
                data-form-row="details"
                data-detail-row="attrs"
                data-mobile-active={detailRowActive('attrs')}
              >
                {attrFields.map((f) => {
                  const value = (form.attrs || {})[f.key] || '';
                  /**
                   * 🌈 БРЭНДЭЭС ХАМААРАХ СОНГОЛТУУД (cascading, 2026-10-01) —
                   *    `f.optionsFrom` ('brand') талбарт: СОНГОСОН брэндийн
                   *    загварууд (`f.optionsMap` = `CAR_MODELS`).
                   * ⚠️ Хоосон массив байх 2 тохиолдол БИЙ — хоёуланд нь доорх
                   *    ЧӨЛӨӨТ ТЕКСТ хэвээр үлдэнэ ✓:
                   *      ① брэнд сонгоогүй (эхлээд Үйлдвэрлэгчээ сонгоно)
                   *      ② брэнд нь жагсаалтгүй (сэлбэг: Bosch…, «Бусад», шинэ брэнд)
                   */
                  const depOptions = f.optionsFrom
                    ? lookupMap(f.optionsMap, (form.attrs || {})[f.optionsFrom])
                    : [];
                  /**
                   * ⚠️ ХУУЧИН/ГАРААР бичсэн утга (2026-09-30 (6)) — 💻
                   *    Дэлгэц/CPU/RAM/Хард нь ЧӨЛӨӨТ ТЕКСТ байснаа СОНГОЛТ
                   *    болсон тул хуучин зар дээр «512 GB SSD + 1 TB HDD» шиг
                   *    жагсаалтад БАЙХГҮЙ утга байж болно. `<select>`-д
                   *    таарах `<option>` байхгүй бол браузер «Сонгох»-ыг
                   *    харуулж, ХАДГАЛАХ үед утга АЛГА БОЛНО ✗ → тэр утгыг
                   *    нэмэлт `option` болгож харуулна (хэрэглэгч өөр сонголт
                   *    хийхгүй бол ХУУЧИН утга ХЭВЭЭР үлдэнэ ✓)
                   */
                  const legacy = f.type === 'select' && value && !(f.options || []).includes(value)
                    ? value : '';
                  /** 🏷️ «эцэг» талбарын одоогийн утга (ж: «Toyota») — зөвхөн hint-д */
                  const depValue = f.optionsFrom ? ((form.attrs || {})[f.optionsFrom] || '') : '';
                  return (
                  <div
                    key={f.key}
                    className="form-group"
                    /* 📱 3-р алхамд энэ талбар нь ӨӨРИЙН дэлгэцтэй (`attr-<key>`) ✓ */
                    data-detail-field={`attr-${f.key}`}
                    data-mobile-active={detailFieldActive(`attr-${f.key}`)}
                  >
                    <label>{f.icon ? `${f.icon} ` : ''}{f.label}</label>
                    {f.formChips ? (
                      /**
                       * 🎛 ЧИП ТАЛБАР (2026-10-03 (11), хэрэглэгчийн хүсэлт:
                       *    «Ажлын цаг, Туршлага, Зарлагч, Мэргэжлийн түвшин
                       *    бүгдийг сонгож оруулдаг болгоё, Жишээг хар» +
                       *    чип товчны зураг) ⇒ 💼 ажлын зарын 4 талбар нь
                       *    `<select>` биш, бөөрөнхий **ЧИП ТОВЧ** (нэг харцаар
                       *    бүх сонголт харагдана, идэвхтэй дээр дахин дарвал
                       *    ЦУЦЛАГДАНА ✓).
                       *
                       * ⚠️ `f.formChips` (формойн чип) ба `f.chips` (sidebar-ийн
                       *    чип ШҮҮЛТ) нь ТУСДАА туг — 🕒 jobType нь ХОЁУЛАНД нь
                       *    чип (`formChips: true` тул энэ салбар руу орно);
                       *    бусад нь (ж: 📊/🏷️/📈) зөвхөн форм дээр ✓
                       *    🆕 2026-10-03 (19): 🎨 «Өнгө» (🚗 авто) нь `chips: true`
                       *    БОЛОВ — гэхдээ `formChips` БАЙХГҮЙ тул энэ салбарт
                       *    ОРОХГҮЙ: формо дээр хэвээр `<select>` (нэг өнгө
                       *    хадгална), зөвхөн ХАЙЛТЫН sidebar нь чип болно ✓
                       *    (`lib/locationData.js` → `sel()` туслахын тайлбарыг үзнэ)
                       * ⚠️ Утга нь `<select>`-тэй ЯГ ИЖИЛ: `attrs.<key>` (текст),
                       *    цуцлахад түлхүүр нь БҮРЭН УСТАНА (`setAttrCascade`
                       *    → `delete attrs[key]`) ⇒ форм/DB/`validateStep`
                       *    ХӨНДӨГДӨХГҮЙ ✓
                       * ⚠️ Харагдац нь sidebar-ийн чиптэй НЭГ CSS (`.chip-toggle`)
                       *    — `app/globals.css`; давхар бичихгүй ✓
                       * ⚠️ ХУУЧИН утга (жагсаалтад байхгүй, ж: нэр нь солигдсон
                       *    хуучин зар) нь ЭХНИЙ чип болж харагдана — сонгосон
                       *    хэвээрээ үлдэж, дарж цэвэрлэж болно ✓ (`<select>`-ийн
                       *    `legacy` option-той ЯГ ИЖИЛ зарчим)
                       * ⚠️ `data-attr-field`/`data-attr-value` нь CDP тестийн
                       *    дэгээ (sidebar нь `data-attr-filter` — формаас
                       *    ЯЛГААТАЙ тул нэг хуудсанд 2 блок зөрчилдөхгүй ✓)
                       */
                      <div
                        className="flex flex-wrap gap-2"
                        data-attr-field={f.key}
                        role="group"
                        aria-label={f.label}
                      >
                        {(legacy ? [legacy, ...(f.options || [])] : (f.options || [])).map((o) => {
                          const on = value === o;
                          return (
                            <button
                              key={o}
                              type="button"
                              aria-pressed={on}
                              data-attr-value={o}
                              onClick={() => setAttrCascade(f, on ? '' : o)}
                              className={`chip-toggle ${on ? 'chip-toggle-active' : ''}`}
                            >
                              {on && <span aria-hidden="true">✓</span>}
                              {o}
                            </button>
                          );
                        })}
                      </div>
                    ) : f.choices ? (
                      /**
                       * 📅 2026-10-02 (хэрэглэгчийн хүсэлт): `choices` МЕТАТАЙ талбар
                       *    (ж: «Үйлдвэрлэсэн он», «Орж ирсэн он») ⇒ 📱 мобайлд
                       *    iOS Timer маягийн ДУГУЙ, 🖥 ≥640px дээр ГАР БИЧИЛТ
                       *    ХЭВЭЭР (уншиж бичих давуу тал хэвээр ✓)
                       * ⚠️ Утга нь `attrs` (jsonb) руу ТЕКСТЭЭР хадгалагдана —
                       *    `number` талбарын урьдчих зан ХӨНДӨГДӨӨГҮЙ ✓
                       */
                      <ChoiceField
                        icon={f.icon}
                        label={f.label}
                        value={value}
                        items={attrWheelItems(f, value)}
                        unit={attrWheelUnit(f)}
                        testId={`attr-${f.key}`}
                        placeholder={f.placeholder}
                        min={f.type === 'number' ? YEAR_FROM : undefined}
                        max={f.type === 'number' ? YEAR_TO : undefined}
                        wheelHint={f.type === 'number' ? `Сонголт: ${YEAR_FROM}–${YEAR_TO} он` : ''}
                        onChange={(v) => setAttrCascade(f, v)}
                        onPick={pickDetail((v) => setAttrCascade(f, v))}
                        onSkip={skipDetail((v) => setAttrCascade(f, v))}
                        openWheel={setWheel}
                      />
                    ) : f.type === 'select' && f.searchable ? (
                      // ⚠️ `commitOnType` — форм дотор сервер рүү query явахгүй
                      //    тул бичих БҮРД хадгална (Enter дарахад «Хадгалах»-ыг
                      //    дарахгүйн тулд компонент Enter-ийг зогсоодог ✓)
                      <SearchableSelect
                        value={value}
                        options={f.options}
                        onChange={(v) => setAttrCascade(f, v)}
                        placeholder="Хайх..."
                        ariaLabel={f.label}
                        commitOnType
                      />
                    ) : depOptions.length > 0 ? (
                      // 🌈 БРЭНДИЙН ЗАГВАРУУД — ХАЙЛТТАЙ combo (бичингүүт шүүгдэнэ)
                      //    ⚠️ Жагсаалтад БАЙХГҮЙ загварыг ч ГАРААР бичиж болно
                      //       (`allowFreeText` анхдагчаар `true` — «🔍 «…» гэж хайх» мөр)
                      <SearchableSelect
                        value={value}
                        options={depOptions}
                        onChange={(v) => setAttrCascade(f, v)}
                        placeholder={`${depValue} загварууд — хайх...`}
                        ariaLabel={f.label}
                        commitOnType
                      />
                    ) : f.type === 'select' ? (
                      <>
                        {/* 🖥 ≥640px: НАТИВ `<select>` ХЭВЭЭР (`hide-below-sm`-ээр
                            мобайлд дарагдана ✓) */}
                        <select
                          className="hide-below-sm"
                          value={value}
                          onChange={(e) => setAttrCascade(f, e.target.value)}
                        >
                          <option value="">Сонгох</option>
                          {/* ⚠️ Хуучин утга (жагсаалтад байхгүй) — дээрх тайлбар */}
                          {legacy && <option value={legacy}>{legacy}</option>}
                          {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                        {/* 📱 <640px: 2 БАГАНАТ ШУУД ЖАГСААЛТ (unegui.mn-ийн хэв,
                            2026-10-03 (17)) — сонголт дээр дарахад утга бичигдээд
                            ШУУД дараагийн асуулт (товч ХАРАГДАХГҮЙ ✓) */}
                        <MobileOptions
                          items={[
                            ...(legacy ? [{ value: legacy, label: legacy }] : []),
                            ...(f.options || []).map((o) => ({ value: o, label: o })),
                          ]}
                          value={value}
                          onPick={pickDetail((v) => setAttrCascade(f, v))}
                          skip
                          onSkip={skipDetail((v) => setAttrCascade(f, v))}
                        />
                      </>
                    ) : (
                      <input
                        type={f.type === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => setAttrCascade(f, e.target.value)}
                        placeholder={f.placeholder || ''}
                      />
                    )}
                    {/* 💡 Брэндээс хамаарах талбарт ЧИГЛҮҮЛЭГ (хэрэглэгч яагаад
                        жагсаалт гарч/гарахгүй байгааг ойлгоно ✓) */}
                    {f.optionsFrom && (
                      <p className="form-hint">
                        {depOptions.length
                          ? `💡 «${depValue}»-ийн ${depOptions.length} загвар — бичиж хайгаад сонгоно уу (жагсаалтад байхгүй бол гараар бичнэ)`
                          : `💡 Эхлээд «🏷️ Үйлдвэрлэгч»-ээ сонгоход загварын жагсаалт гарна (гараар бичиж ч болно)`}
                      </p>
                    )}
                  </div>
                  );
                })}
                {/* ⚠️ Дэд төрөлд нь хамаарах талбар байгаа үед л тэмдэглэл —
                    «заавал биш» гэдгийг ойлгуулна (хэрэглэгчийн хүсэлт:
                    «аль нэгийг эсвэл хэд хэдийг сонгож болно») */}
                {attrFields.some((f) => Array.isArray(f.onlySubtypes)) && (
                  /* ⚠️ 5 дахь засвар: мөр нь 1 БАГАНАТ (`form-row-single`) тул
                     `sm:col-span-2` ХЭРЭГГҮЙ — үлдээвэл grid дотор ДАЛД 2 дахь
                     track үүсгэж, «бүтэн өргөн» гэсэн утга алдагдана ✗ */
                  <p className="form-hint">
                    💻 Notebook-ийн үзүүлэлтүүд — заавал биш: дээрээс мэдэх хэсгээ л сонгоно уу
                  </p>
                )}
              </div>
            )}

            {/* ===== 💳 ТӨЛБӨРИЙН НӨХЦӨЛ (2026-10-03) =====
                Хэрэглэгчийн хүсэлт: «Төлбөрийн нөхцөлийг Үл хөдлөх зарна,
                Автомашин зарна гэсэн дээр хайх хэсэгт гардаг болгоё. Зар
                оруулах үед хэрэглэгч үүнийг сонгож өгөх ёстой. Олон сонголт
                хийж байгаа боломж…»
                🎛 DESIGN 2026-10-03 (18) — хэрэглэгчийн хүсэлт: «…зар оруулах
                   болох дэлгэрэнгүй … дээр Өрөөний тоо дэлгэрэнгүй хайлт
                   шиг оруулдаг болгоод өгчих» ⇒ (6)-ийн 2 баганат ☑ CHECKBOX
                   ХАСАГДАВ, ОДОО ХАЙЛТЫН sidebar-тай ЯГ ИЖИЛ ЧИП:
                   [✓ Хувь лизингээр] [Бэлэн төлөлтөөр]
                   [Банкны зээлээр]  [Бартер сонирхоно]
                   ⚠️ Хэв нь `app/globals.css` (`.chip-toggle` — «🛏 Өрөөний
                      тоо»/«Хороо»/sidebar-ийн чиптэй НЭГ класс ✓); ШИНЭ CSS
                      БИЧЭЭГҮЙ, хуучин `.pay-grid`/`.pay-check` нь УСТГАГДАВ
                      (өөр хэрэглэгч байхгүй болсон ✓)
                   ⚠️ ОЛОН сонголт ХЭВЭЭР (`togglePayment` → `payments` массив) —
                      чип дарж асаах/унтраах БОЛОМЖ ХЭВЭЭР ✓
                ⚠️ Шошго/утга нь хайлтын sidebar-тай ЯГ ИЖИЛ
                   (`lib/paymentFilter.mjs → PAYMENT_OPTIONS`) — нэг эх сурвалж ✓
                ⚠️ ЗӨВХӨН `real-estate` ба `auto` хэсэгт (`showPayments`),
                   📱 мобайлд ӨӨРИЙН дэлгэцтэй (`detailScreens` → `payments`),
                   ШИНЭ ЗАРД ЗААВАЛ (`requiredDetailMsg` — мессеж нэг газар) ✓
                ⚠️ `data-detail-field` / `data-detail-row` / `data-payment-value`
                   нь 📱 CSS ба `scripts/cdp-*.mjs`-ийн дэгээ — УСТГАХГҮЙ ✓ */}
            {showPayments && (
              <div
                className="form-row-single"
                data-form-row="details"
                data-detail-row="payments"
                data-mobile-active={detailRowActive('payments')}
              >
                <div
                  className="form-group"
                  data-detail-field="payments"
                  data-mobile-active={detailFieldActive('payments')}
                >
                  <label>💳 Төлбөрийн нөхцөл</label>
                  <div
                    className="flex flex-wrap gap-2"
                    data-payment-picker
                    role="group"
                    aria-label="Төлбөрийн нөхцөл"
                  >
                    {PAYMENT_OPTIONS.map((o) => {
                      /** ⚠️ Төлөв нь форм-ын `payments` МАССИВААС — `<select>`-ийн
                       *  `checked` биш `aria-pressed` (чип нь `<button>` ✓) */
                      const on = form.payments.includes(o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          aria-pressed={on}
                          data-payment-value={o.value}
                          onClick={() => togglePayment(o.value)}
                          className={`chip-toggle ${on ? 'chip-toggle-active' : ''}`}
                        >
                          {on && <span aria-hidden="true">✓</span>}
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="form-hint">
                    {form.payments.length
                      ? `✅ ${countPayments(form.payments)} нөхцөл сонгосон — хайлт дээр эдгээрийн АЛЬ НЭГ нь тохирох зарууд гарна`
                      : 'Олон нөхцөл зэрэг сонгож болно (ж: «Хувь лизингээр» ба «Бартер сонирхоно»)'}
                  </p>
                </div>
              </div>
            )}

            <div
              className="form-row-single"
              data-form-row="details"
              data-detail-row="area"
              data-mobile-active={detailRowActive('area')}
            >
              {/* «Өрөө» нь зөвхөн Орон сууц, АОС/хаус төрөлд харагдана (lib/locationData.js) */}
              {showRooms && (
                /* 📱 2026-10-02: МОБАЙЛД ХАРАГДАХГҮЙ (`.hide-below-sm`) — өрөөг
                   нь 1-р алхмын drill-down-д (unegui.mn-ийн 4 дэх дэлгэц:
                   «Орон сууц зарна» → 1 өрөө … +5 өрөө) асуудаг болсон тул
                   энд ДАХИН асуухгүй ✓ (🖥 ≥640px дээр ХЭВЭЭР харагдана) */
                <div
                  className="form-group hide-below-sm"
                  /* ⚠️ «Өрөө» нь 3-р алхамд МОБАЙЛ дэлгэцгүй (1-р алхамд асуусан ✓) */
                  data-detail-field="rooms"
                  data-mobile-active="false"
                >
                  <label>Өрөө</label>
                  <input type="number" min="0" value={form.rooms} onChange={(e) => set('rooms', e.target.value)} placeholder="3" />
                </div>
              )}
              {/* ⚠️ «Талбай» нь ЗӨВХӨН үл хөдлөх хэсэгт (0016) */}
              {isRealEstate && (
              /* ⚠️ 5 дахь засвар: мөр 1 БАГАНАТ болов → `sm:col-span-2` ХАСАГДАВ
                 (үлдээвэл grid дотор ДАЛД 2 дахь track үүснэ) — «Талбай» нь
                 «Өрөө»-ний ЯГ ДООР бүтэн өргөнөө эзэлнэ ✓ */
              <div className="form-group" data-detail-field="area" data-mobile-active={detailFieldActive('area')}>
                <label>Талбай (м²)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.area}
                  onChange={(e) => set('area', e.target.value.replace(/[^\d.,]/g, ''))}
                  placeholder="75.5"
                />
                <p className="form-hint">Аравтын бутархайг «.» эсвэл «,»-ээр бичиж болно (ж: 75,5)</p>
              </div>
              )}
            </div>
            {/* 🚿 УГААЛГЫН ӨРӨӨНИЙ ТОО — 2026-10-03-аас хойш `floors-2` мөрөнд
                (ТАГТНЫ ЯГ ӨМНӨ) харагдана ↓ — хэрэглэгчийн хүсэлт:
                «тагтны өмнө угаалгын өрөөний тоо оруулах хэсгийг оруул» ✓ */}

            {/* ===== Орон сууцны нэмэлт мэдээлэл (зөвхөн Орон сууц сонгосон үед) =====
                🆕 2026-10-02 (хэрэглэгчийн хүсэлт): он/давхар/тагт нь 📱 мобайлд
                iOS Timer маягийн ДУГУЙгаар сонгогдоно (`ChoiceField` +
                `WheelPicker`); 🖥 дээр ГАР БИЧИЛТ/`<select>` ХЭВЭЭР ✓ */}
            {showFloors && (
              <div
                className="form-row-single"
                data-form-row="details"
                data-detail-row="floors-1"
                data-mobile-active={detailRowActive('floors-1')}
              >
                {showApartment && (
                  <ChoiceField
                    label="Ашиглалтанд орсон он"
                    value={form.buildYear}
                    items={yearItemsFor(form.buildYear)}
                    unit="он"
                    testId="buildYear"
                    fieldKey="buildYear"
                    mobileActive={activeDetail.key === 'buildYear'}
                    placeholder="2015"
                    min={YEAR_FROM}
                    max={YEAR_TO}
                    wheelHint={`Сонголт: ${YEAR_FROM}–${YEAR_TO} он`}
                    /* 🆕 2026-10-05 (53): 📱 <640px дээр ГАРААС БИЧИЛТ (`MobileOptions`
                       рендэрлэгдэхгүй) — `onPick`/`onSkip` ШААРДЛАГАГҮЙ, учир нь
                       «Алгасах / Үргэлжлүүлэх →» товч доод мөрөнд гардаг ✓ */
                    mobileInput
                    onChange={(v) => set('buildYear', v)}
                    openWheel={setWheel}
                  />
                )}
                <ChoiceField
                  label="Барилгын нийт давхар"
                  value={form.totalFloors}
                  items={FLOOR_ITEMS}
                  unit="давхар"
                  testId="totalFloors"
                  fieldKey="totalFloors"
                  mobileActive={activeDetail.key === 'totalFloors'}
                  placeholder="9"
                  min={1}
                  max={FLOOR_MAX}
                  wheelHint={`Сонголт: 1–${FLOOR_MAX} давхар`}
                  mobileInput
                  onChange={(v) => set('totalFloors', v)}
                  openWheel={setWheel}
                />
              </div>
            )}

            {(showFloors || showBathrooms) && (
              <div
                className="form-row-single"
                data-form-row="details"
                data-detail-row="floors-2"
                data-mobile-active={detailRowActive('floors-2')}
              >
                {/* ⚠️ Давхрын жагсаалт нь «Барилгын нийт давхар»-аас ХЭТРЭХГҮЙ
                    (ж: 9 давхарт 12-р давхар сонгох боломжгүй ✓) */}
                {showFloors && (
                  <ChoiceField
                    label="Байрны давхар"
                    value={form.floor}
                    items={floorItemsFor(form.floor, form.totalFloors)}
                    unit="давхар"
                    testId="floor"
                    fieldKey="floor"
                    mobileActive={activeDetail.key === 'floor'}
                    placeholder="5"
                    min={1}
                    max={FLOOR_MAX}
                    wheelHint={form.totalFloors
                      ? `Сонголт: 1–${Math.min(FLOOR_MAX, Number(form.totalFloors) || FLOOR_MAX)} давхар (нийт давхраас)`
                      : `Сонголт: 1–${FLOOR_MAX} давхар`}
                    mobileInput
                    onChange={(v) => set('floor', v)}
                    openWheel={setWheel}
                  />
                )}
                {/* ===== 🚿 УГААЛГЫН ӨРӨӨНИЙ ТОО (0012_listing_bathrooms.sql) =====
                    🆕 2026-10-03 (хэрэглэгчийн хүсэлт): ТАГТНЫ ЯГ ӨМНӨ байрлана
                    (`floors-2` мөр) — сонголт нь `1, 2, 3, 4, +5` (BATHROOM_ITEMS).
                    ⚠️ Харагдах нөхцөл: `lib/locationData.js → hasBathroomFields`
                       (Орон сууц + АОС/хаус ҮРГЭЛЖ, бусад 3+ өрөөтэй үед) ✓ */}
                {showBathrooms && (
                  <ChoiceField
                    label="Угаалгын өрөөний тоо"
                    value={form.bathrooms}
                    items={BATHROOM_ITEMS}
                    unit="өрөө"
                    plusValue={PLUS_VALUE}
                    desktopControl="select"
                    testId="bathrooms"
                    fieldKey="bathrooms"
                    mobileActive={activeDetail.key === 'bathrooms'}
                    hint="Хэдэн угаалгын өрөөтэй вэ? (сонголтоор)"
                    wheelHint="Сонголт: 1, 2, 3, 4 эсвэл +5 (5 ба түүнээс дээш)"
                    onChange={(v) => set('bathrooms', v)}
                    onPick={pickDetail((v) => set('bathrooms', v))}
                    onSkip={skipDetail((v) => set('bathrooms', v))}
                    openWheel={setWheel}
                  />
                )}
                {showFloors && showApartment && (
                  <ChoiceField
                    label="Тагт"
                    value={form.balconies}
                    items={BALCONY_ITEMS}
                    unit="тагт"
                    plusValue={PLUS_VALUE}
                    desktopControl="select"
                    testId="balconies"
                    fieldKey="balconies"
                    mobileActive={activeDetail.key === 'balconies'}
                    wheelHint="Хэдэн тагттай вэ? (1, 2, 3, 4 эсвэл +5)"
                    onChange={(v) => set('balconies', v)}
                    onPick={pickDetail((v) => set('balconies', v))}
                    onSkip={skipDetail((v) => set('balconies', v))}
                    openWheel={setWheel}
                  />
                )}
              </div>
            )}

            {showApartment && (
              <div
                className="form-row-single"
                data-form-row="details"
                data-detail-row="garage"
                data-mobile-active={detailRowActive('garage')}
              >
                <div className="form-group" data-detail-field="garage" data-mobile-active={detailFieldActive('garage')}>
                  <label>Гараж</label>
                  {/* 🖥 ≥640px: `<select>` ХЭВЭЭР (`hide-below-sm` — мобайлд дарагдана ✓) */}
                  <select
                    className="hide-below-sm"
                    value={form.hasGarage}
                    onChange={(e) => set('hasGarage', e.target.value)}
                  >
                    <option value="">Сонгох</option>
                    {GARAGE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                  {/* 📱 <640px: 2 БАГАНАТ ШУУД ЖАГСААЛТ (unegui.mn-ийн хэв ✓)
                      ⚠️ Сонголт дээр дарахад ШУУД дараагийн асуулт (эсвэл 4-р
                         алхам) — сүүлийн дэлгэц учраас `mobileDetailNext()`
                         нь `goNext()`-ийг дуудна ✓ */}
                  <MobileOptions
                    items={GARAGE_OPTIONS}
                    value={form.hasGarage}
                    onPick={pickDetail((v) => set('hasGarage', v))}
                    skip
                    onSkip={skipDetail((v) => set('hasGarage', v))}
                  />
                </div>
              </div>
            )}
            {/* 📱 МОБАЙЛ (<640px): АСУУЛТ БҮР НЭГ ДЭЛГЭЦ — «Үргэлжлүүлэх» нь
                дараагийн ТАЛБАР руу шилжүүлнэ (алхам руу БИШ ✓).
                ⚠️ СҮҮЛИЙН дэлгэцэд энэ блок `hide-below-sm`-ээр ХААГДАЖ,
                   доорх хуучин «Үргэлжлүүлэх» (алхам руу) л үлдэнэ ✓
                ⚠️ Заавал БИШ талбар дээр «Алгасах» — утга хоосон үлдээж болно
                   (1-р алхмын «Өрөө» дэлгэцийн `MOBILE_SKIP`-тэй ИЖИЛ зан ✓)
                ⚠️ 🖥 ≥640px дээр ЭНЭ блок ХАРАГДАХГҮЙ (`sm:hidden`) — хуучин
                   навигаци (доор) хэвээр ✓
                🔍 Хайх үг: data-mobile-detail-next, data-mobile-detail-skip */}
            <div
              data-mobile-detail-nav
              className={`mt-5 gap-2 sm:hidden ${(isLastDetail || activePick) ? 'hide-below-sm' : 'flex'}`}
            >
              <button
                type="button"
                data-mobile-detail-skip
                onClick={mobileDetailNext}
                className={`btn btn-ghost ${activeDetail.required ? 'hidden' : ''}`}
              >
                Алгасах
              </button>
              <button
                type="button"
                data-mobile-detail-next
                onClick={mobileDetailNext}
                className="btn btn-primary btn-lg flex-1"
              >
                Үргэлжлүүлэх →
              </button>
            </div>
            </div>

            {/* ═══ 4-р алхам · ҮНЭ ба ТАЙЛБАР (үнэ · үнэ тохирно · тайлбар · видео) ═══
                ⚠️ 2026-10-01: «Байршил» (хуучин 3-р алхам) 2-р алхам болов —
                   энэ блокийн дугаар (`step === 3`, 4-р алхам) ХӨНДӨГДӨӨГҮЙ ✓
                ⚠️ 2026-10-05 (57): 🖥 дээр 3, 4, 5-р алхам НЭГ хуудас болов ⇒
                   🖥 дээр энэ блок 3 дахь хуудсан дээр (`step === 2`, 📋
                   Дэлгэрэнгүйн ДАРАА) ч харагдана; `?step=5` хаягаар (эсвэл
                   📱→🖥 resize-ээр) орсон ч `hidden sm:block`-ээр ХАРАГДАНА ✓
                   (хуудас хагас хоосон болохгүй ✓); 📱 дээр ЗӨВХӨН 4 дэх
                   дэлгэцэд ✓ */}
            <div data-step-block="price" className={step === 3 ? '' : step === 2 || step === 4 ? 'hidden sm:block' : 'hidden'}>
            <div className="form-row">
              <div className="form-group">
                <label>{priceFieldTitle} </label>
                {/* ⚠️ type="number" БИШ: number input нь «250,000,000» гэсэн
                    таслалтай утгыг ХҮЛЭЭХГҮЙ (хоосон болгочихдог). Тиймээс
                    type="text" + inputMode="numeric" ашиглаж, бичих үед нь
                    мянгатаар хувааж харуулаад, төлөвт ЗӨВХӨН ЦИФР хадгална.

                    ⚠️ ₮-г input ДОТОР absolute-аар БАЙРЛУУЛАХГҮЙ: CSS
                    specificity-ийн улмаас `.form-group :is(input…)` (0,1,1) нь
                    `.pl-7` (0,1,0)-г дардаг тул input-ийн padding-left 12px
                    хэвээр үлдэж, ₮ нь ЭХНИЙ ТООН ДЭЭР ДАВХАРЛАДАГ байв.
                    Одоо ₮ нь хөрш элемент (input group) — давхарлах боломжгүй.

                    🤝 «Үнэ тохирно» (2026-09-29): үнэ нь ЗААВАЛ БИШ тул чекбоксыг
                    нэмэв. ⚠️ Хэрэглэгчийн шаардлага: чекбокс нь ҮНИЙГ
                    УСТГАХГҮЙ / идэвхгүй болгохгүй ✗ — бичсэн үнэ ХЭВЭЭР
                    үлдэж, зар дээр үнийн ЯГ ДОР нь «Үнэ тохирно» мөр нэмэгдэнэ
                    (`negotiableNote`, lib/format.js) ✓ */}
                <div className="flex items-stretch gap-2">
                  <span className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm font-bold text-gray-500">
                    ₮
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className="min-w-0 flex-1 font-semibold tabular-nums"
                    value={formatThousands(form.price)}
                    onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))}
                    placeholder="250,000,000"
                  />
                </div>
                {/* Дээрх талбартай ДАВХАРДАХГҮЙ — зөвхөн нэмэлт мэдээлэл:
                    хэдэн орон (тэг тоолох алдаа арилна) + «сая/тэрбум» уншилт.
                    ⚠️ «Үнэ тохирно»-гийн талаарх ТАЙЛБАР ЭНД БАЙХГҮЙ —
                       хэрэглэгчийн шаардлага: илүү тайлбар бүү оруул ✗ */}
                {form.price ? (
                  <p className="form-hint">
                    {digitCount(form.price)} орон
                    {shortPrice(form.price) ? ` · ≈ ${shortPrice(form.price)} ₮` : ''}
                  </p>
                ) : null}
                {/* 💼 2026-10-03 (9): ажлын зарт unegui.mn-ийн зурагтай ИЖИЛ нэмэлт
                    тусламж — «бүх тэгтэй нь оруулна уу» (12 сая → 12000000) ✓ */}
                {/* {jobsSection && (
                  <p className="form-hint">
                    💡 Дүнг бүх тэгтэй нь оруулна уу. Жишээ нь: 12 саяыг 12000000 гэж оруулна уу.
                  </p>
                )} */}
                {/* Чекбокс — зүгээр checkbox + текст (гаднах box БАЙХГҮЙ, 🤝 emoji БАЙХГҮЙ).
                    ⚠️ 2026-10-01 (CSS SPECIFICITY — ₮-гийн асуудалтай ИЖИЛ):
                       `.form-group label { display:block }` (globals.css, (0,1,1)) нь
                       label-ийн `flex` (0,1,0)-ийг ДАРДАГ тул чекбокс+текст текстийн
                       ДЭЭР БИШ, зөвхөн ЯГ ЗҮҮН талд гарахын тулд ДОТООД
                       `<span class="flex">` (label-ийг БИШ) ашиглав ✓
                    ⚠️ checkbox-ийн `w-full`-ийг globals.css дээр `:not([type="checkbox"])`
                       -оор зассан (эс бөгөөс чекбокс бүтэн өргөн болно) ✓
                    ⚠️ `price`-ыг ХӨНДӨХГҮЙ, input-ыг disabled БОЛГОХГҮЙ ✗ —
                       хоёулаа зэрэг байж болно: «₮5,000,000» + «Үнэ тохирно» ✓ */}
                <label className="mt-2 block w-fit cursor-pointer">
                  <span className="flex w-fit items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.negotiable}
                      onChange={(e) => setForm((f) => ({ ...f, negotiable: e.target.checked }))}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="text-[13px] font-normal text-gray-700">{priceNegotiableText}</span>
                  </span>
                </label>
              </div>
              {/* <div className="form-group">
                <label>Үнийн төрөл</label>
                <select value={form.priceType} onChange={(e) => set('priceType', e.target.value)}>
                  <option value="total">Нийт үнэ</option>
                  <option value="month">Сард</option>
                  <option value="day">Өдөрт</option>
                  <option value="sqm">м² тутамд</option>
                </select>
              </div> */}
            </div>
            </div>

            {/* ═══ 4-р алхам (үргэлжлэл) · ТАЙЛБАР + видео ═══
                ⚠️ 2026-10-05 — 🖥 НЭГ ХУУДАС тул блок нь 💰 Үнэ-гийн ЯГ ДАРАА
                   байрлана (DOM дараалал = харагдах дараалал) ✓
                ⚠️ 2026-10-05 (57): `price`-тай ЯГ ИЖИЛ хаалт (`hidden sm:block`) —
                   🖥 дээр 3, 4, 5-р алхам НЭГ хуудас болсон тул хамт харагдана ✓ */}
            <div data-step-block="desc" className={step === 3 ? '' : step === 2 || step === 4 ? 'hidden sm:block' : 'hidden'}>
            <div className="form-group">
              {/* 🏷️ 2026-10-03 (14) (хэрэглэгчийн хүсэлт: «байрны зар оруулахад
                  Нэмэлт тайлбар гэхийг зүгээр л Тайлбар гэчих»): шошго
                  «Нэмэлт тайлбар» → «Тайлбар» болов ✓
                  ⚠️ Зөвхөн ХАРАГДАХ НЭР солигдов — талбар (`form.description`),
                     DB багана (`listings.description` — 0001_schema.sql),
                     `set('description', …)`, `placeholder`, `rows` бүгд
                     ХӨНДӨГДӨӨГҮЙ ✓ (карт/дэлгэрэнгүй хуудас ХЭВЭЭР ✓) */}
              <label>Тайлбар</label>
              <textarea rows="4" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Зарын дэлгэрэнгүй мэдээлэл, онцлог шинж чанарууд..." />
            </div>

            {/* 🎥 YouTube видео линк — Storage 0 MB (файл биш, линк хадгална).
                ⚡ ХЯЛБАР ФОРМ (hobby) дээр ХАРАГДАХГҮЙ — хэрэглэгчийн хүсэлт:
                зөвхөн байршил · шинэ/хуучин · үнэ · утас · тайлбар. */}
            {!simpleForm && <YouTubeField value={form.videoUrl} onChange={(v) => set('videoUrl', v)} />}
            </div>

            {/* ═══ 5-р алхам · ЗУРАГ ба ХОЛБОО (утас · зураг)
                ⚠️ 2026-10-05 (57): 🖥 дээр 3, 4, 5-р алхам НЭГ хуудас болов ⇒
                   энэ блок 🖥 дээр 3 дахь хуудсан дээр (`step === 2`) ч
                   харагдана (`hidden sm:block`, 💰 Үнэ + 📝 Тайлбарын ДАРАА) ✓;
                   📱 дээр ЗӨВХӨН 5 дахь дэлгэцэд (step === 4) ✓
                ⚠️ `?step=5` (🖥 дээр) хаягаар орвол ч ХАРАГДАХААР үлдэнэ ✓ */}
            <div data-step-block="media" className={step === 4 ? '' : step === 2 || step === 3 ? 'hidden sm:block' : 'hidden'}>
            <div className="form-row">
              <div className="form-group">
                <label>Холбоо барих утас *</label>
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="99112233" required />
              </div>
              {/* <div className="form-group">
                <label>Холбоо барих хүн</label>
                <input type="text" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Таны нэр" />
              </div> */}
            </div>
            </div>

            {/* ═══ 5-р алхам (үргэлжлэл) · ЗУРАГ — одоогийн ба шинэ зураг
                ⚠️ 2026-10-05 (57): `media`-тай ЯГ ИЖИЛ хаалт — 🖥 дээр 3 дахь
                   хуудсанд (💰 Үнэ + 📝 Тайлбар-ын дараа) хамт харагдана ✓ */}
            <div data-step-block="media-images" className={step === 4 ? '' : step === 2 || step === 3 ? 'hidden sm:block' : 'hidden'}>
            {isEdit && existingImages.length > 0 && (
              <div className="form-group">
                <label>Одоогийн зурагнууд ({existingImages.length})</label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {existingImages.map((url, i) => (
                    <div key={`${url}-${i}`} className="relative aspect-square overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        title="Устгах"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm leading-none text-white"
                        onClick={() => setExistingImages((p) => p.filter((_, idx) => idx !== i))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <p className="form-hint">× дарж хуучин зургийг устгаж болно (хадгалахад шинэчлэгдэнэ)</p>
              </div>
            )}

            <div className="form-group">
              <label>Зураг оруулах</label>
              <div
                className={`cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-10 text-center transition hover:border-primary hover:bg-primary-light ${
                  compressing ? 'pointer-events-none opacity-60' : ''
                }`}
                onClick={() => document.getElementById('imageInput')?.click()}
              >
                <div className="text-[40px]">{compressing ? '⏳' : '📷'}</div>
                <p>{compressing ? 'Зургуудыг шахаж байна...' : 'Зураг оруулахын тулд дарна уу'}</p>
                <p className="form-hint">
                  Дээд тал нь 10 зураг (jpg, png, webp) · 🗜 автоматаар <b>1600px / 82%</b> болж шахагдана
                </p>
              </div>
              <input
                type="file"
                id="imageInput"
                accept="image/*"
                multiple
                className="hidden"
                disabled={compressing}
                onChange={onPickFiles}
              />

              {lastReport && (
                <p className="form-hint">
                  🗜 <b>{lastReport.count} зураг</b> шахагдлаа: {formatBytes(lastReport.totalOriginal)} →{' '}
                  <b>{formatBytes(lastReport.totalNew)}</b>
                  {lastReport.savedPercent > 0 && ` · ${lastReport.savedPercent}% хэмнэлт 🎉`}
                </p>
              )}

              {pending.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {pending.map((p, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm leading-none text-white"
                        onClick={() => removeImage(i)}
                      >
                        ×
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 text-center text-[10px] text-white">
                        {formatBytes(p.newSize)}
                        {p.savedPercent > 0 ? ` · −${p.savedPercent}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </div>

            {/* 🪜 АЛХМЫН НАВИГАЦ — Буцах / Үргэлжлүүлэх / Нийтлэх
                📱 2026-10-02 — 3-Р АЛХАМ (📋 Дэлгэрэнгүй) дээр мобайл нь
                «асуулт бүр НЭГ ДЭЛГЭЦ» болсон тул энэ хоёр товч нь дээрх
                wizard-ийн навигацитай ДАВХАРДАХГҮЙ:
                  • «← Буцах» — мобайлд ХААГДАХГҮЙ (толгойн `←` нь дэлгэц
                    бүрээр буцаана; хамгийн эхний дэлгэц дээр 2-р алхам руу ✓)
                  • «Үргэлжлүүлэх →» — ЗӨВХӨН СҮҮЛИЙН дэлгэцэд харагдана
                    (өмнө нь wizard-ийн товч дараагийн талбар руу явуулна ✓)
                🖥 ≥640px дээр `hide-below-sm` ҮЙЛЧЛЭХГҮЙ — хуучин байдал ХЭВЭЭР ✓
                🆕 2026-10-05 (🖥 АЛХАМТ БУЦАВ): тухайн үед 🖥 дээр БҮХ алхам
                   нэгэн зэрэг харагддаг байсан тул `[data-mobile-detail-next]`
                   нь `[data-mobile-detail-nav]`-тай хамт DOM-д БАЙНГА байж,
                   CDP «Үргэлжлүүлэх»-ийг ТЕКСТЭЭР хайхад МОБАЙЛЫН товчийг
                   дарж, алхам ХӨДЛӨХГҮЙ байв ✗ ⇒ СТАБИЛ селекторууд:
                   `[data-step-back]` · `[data-step-next]` · `[data-step-submit]`
                   (CDP тестүүд эдгээрийг л ашиглана ✓)
                ⚠️ 2 дахь засвар: 🖥 дээр Ч зөвхөн ОДООГИЙН алхам харагддаг
                   болсон тул энэ мөр нь `sm:hidden` БИШ — БҮХ дэлгэцэд
                   харагдана ✓ (⏳ өмнөх 🖥-ийн ЦУЦЛАХ + НИЙТЛЭХ блок
                   ХАСАГДАВ — энэ мөр түүнийг бүрэн орлоно ✓)
                🔍 Хайх үг: data-step-next, data-step-back, data-step-submit
                🆕 2026-10-05 (57): нөхцөл нь `step < STEPS.length - 1` БИШ,
                   `step < lastStepIndex` — 🖥 дээр сүүлийн хуудас нь 3 дахь
                   (нэгтгэсэн) тул тэнд «Үргэлжлүүлэх →» БАЙХГҮЙ ✗,
                   `[data-step-submit]` («✅ Зар нийтлэх») гарна ✓;
                   📱 дээр 4 дэх хуудсанд «Үргэлжлүүлэх →» хэвээр ✓
                ⚠️ «← Буцах» нь 🖥 дээр 3 дахь хуудсанд 2 дахь (Байршил) руу,
                   📱 дээр 4 дэх дэлгэцээс 3 дахь руу буцаана ✓
                   (⚠️ `hide-below-sm` нь `step === 2` үед — 📱-ийн «асуулт бүр
                   нэг дэлгэц»-ийн товчийг давхцуулахгүйн тулд ХЭВЭЭР ✓) */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                data-step-back
                onClick={goBack}
                className={`btn btn-ghost ${step === 2 ? 'hide-below-sm' : ''}`}
                disabled={submitting || compressing}
              >
                {step === 0 ? 'Цуцлах' : '← Буцах'}
              </button>
              {step < lastStepIndex ? (
                <button
                  type="button"
                  data-step-next
                  onClick={goNext}
                  className={`btn btn-primary btn-lg ${step === 2 && !isLastDetail ? 'hide-below-sm' : ''}`}
                >
                  Үргэлжлүүлэх →
                </button>
              ) : (
                <button
                  type="submit"
                  data-step-submit
                  className="btn btn-primary btn-lg"
                  disabled={submitting || compressing}
                >
                  {submitLabel}
                </button>
              )}
            </div>

            {/* 🗺 ГАЗРЫН ЗУРАГ ДЭЭРХ БАЙРШИЛ — ПИН-ПИКЕР (`unegui.mn` загвар).
                ⚠️ `<form>`-ийн ДОТОР ч `hidden` алхмын блокийн ГАДНА байрлана —
                   ингэснээр `display:none` эцэг дотор «алга болохгүй» ✓ */}
            {mapPickerOpen && (
              <LocationMapPicker
                center={mapPickCenter}
                value={coordOf(form)}
                zoom={mapPickZoom}
                subtitle={mapPickSubtitle}
                city={form.city}
                district={form.district}
                onConfirm={applyMapPick}
                onClose={() => setMapPickerOpen(false)}
              />
            )}
          </form>
          </div>
        </div>
      </div>
      {/*
        🔢🎡 ТООН УТГЫН ДУГУЙ (2026-10-02) — форм дотроос ГАДУУР, `<form>`-ийн
        дараа байрлана (overlay тул `fixed inset-0`). ⚠️ `open` нь `wheel`
        state-ээр удирдагдана — `null` үед `WheelPicker` нь DOM-д ОГТ гарахгүй ✓
        ⚠️ `onPick` нь `wheel`-д хадгалагдсан closure — сонгосон утга ЯГ ТЭР
           талбарын `set(...)` руу очно (ref шиг тогтвортой ✓)
      */}
      <WheelPicker
        open={!!wheel}
        title={(wheel && wheel.title) || ''}
        items={(wheel && wheel.items) || []}
        value={(wheel && wheel.value) || ''}
        hint={(wheel && wheel.hint) || ''}
        onPick={wheel ? wheel.onPick : undefined}
        onClose={() => setWheel(null)}
      />
    </div>
  );
}
