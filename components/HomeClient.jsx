'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import ListingCard from './ListingCard';
import MapView from './MapView';
// 📍 БАЙРШЛЫН ПИКЕР (modal, 2026-10-04 (27)) — «📍 Бүх байршил» товч дарахад
//    «Байршлаа сонгоно уу» цонх (Хот → Дүүрэг → Хороо каскад) нээгдэнэ ✓
import LocationPicker from './LocationPicker';
// 🏷️🚙 МАШИНЫ ПИКЕР (modal, 2026-10-04 (35)) — толгойн/сайдбарын «Үйлдвэрлэгч,
//    загвар» товч дарахад «Машинаа сонгоно уу» цонх (Үйлдвэрлэгч → Загвар
//    каскад + хайлт) нээгдэнэ — 📍 Байршилтай ЯГ ИЖИЛ хэв ✓
import CarPicker from './CarPicker';
// 🧩 ТОЛГОЙН МӨРНИЙ ИКОНУУД (2026-10-04 (28)) — emoji (`📋 📍 ▾ 🔍`) БИШ
//    `currentColor` SVG: өнгө нь идэвхтэй/идэвхгүй төлвөөр солигдоно,
//    OS бүр дээр ЯГ ижил харагдана ✓ (`components/HeaderIcons.jsx`)
import { ChevronDownIcon, PinIcon, SearchIcon } from './HeaderIcons';
import { useToast, useUI, useAuth, useHeaderSlot } from './AppProviders';
import {
  fetchListings, fetchPropertyTypeCounts, fetchProfilesByIds,
  LISTINGS_PAGE_SIZE,
} from '../lib/queries';
import { normalizeError } from '../lib/errors';
import {
  // ⚠️ 2026-10-04 (28): `CITIES` / `getDistricts` / `getKhoroosForDistricts`
  //    эндээс ХАСАГДАВ — сайдбарын Байршил блок нь `LocationPicker` руу
  //    шилжсэн тул тэдгээрийг ЗӨВХӨН `components/LocationPicker.jsx` дуудна
  //    (нэг эх сурвалж: `lib/locationData.js` ✓)
  ROOM_OPTIONS,
  hasRoomsFields, SECTIONS, getSection, getSubtypes, getSectionCategoryChoices,
  // 🏢 2026-10-04: «Орон сууц» төрөлд давхар/он-ы нэмэлт хүрээний шүүлт
  //    харагдах эсэхийг шийднэ (`apartment: true` туг — `PROPERTY_TYPE_DEFS`)
  hasApartmentFields,
  // 🏠 2026-10-04: хэсгийн панельд дэд төрөл харагдах эсэх (2 алхамт drill) —
  //    нэг эх сурвалж нь `lib/locationData.js` ✓
  showsSectionSubtypes,
  hasCategoryChoice, getAttrFilters, pruneGatedAttrs, getAttrField, formatAttrsLine,
  parseAttrRangeKey, getAttrRangeKeys,   // 📅 оны хүрээ (2026-09-28)
  priceWord,   // 💼 ажил → «Цалин», бусад → «Үнэ» (2026-10-03 (9))
  getSubtypeGroups,   // 🛠 3 дахь түвшин (2026-09-27) — зөвхөн `services`
  SIDEBAR_CHIP_COLLAPSE_MIN,   // 🆕 2026-10-06 (18): чип блок хураагдах босго
} from '../lib/locationData';
import { getCategoryLabel, getPropertyTypeLabel, formatPrice, formatCount, shortPrice } from '../lib/format';
import { buildHomeBreadcrumb } from '../lib/breadcrumb';
import Breadcrumb from './Breadcrumb';
import SearchableSelect from './SearchableSelect';
import TextFilter from './TextFilter';
// 🚗🌈 БРЭНДЭЭС ХАМААРАХ ЗАГВАР (2026-10-01, хэрэглэгчийн хүсэлт) — sidebar-д
//    шүүлт тавих горимд: `lookupMap` (сонголтууд) ба `cascadeAttrs`
//    (брэнд солигдоход хуучирсан загварын шүүлтийг цэвэрлэх) ✓
//    ⚠️ Форм (`AddListingClient.jsx`) ЯГ ИЖИЛ 2 туслахыг ашиглана ✓
import { lookupMap, cascadeAttrs } from '../lib/carModels.mjs';
import RangeInput from './RangeInput';
// 🔢 Доод/дээд ТООНЫ хүрээний логик (2026-09-30) — цэвэр функцууд нь
//    `lib/rangeFilter.mjs`
//    ⚠️ Чирдэг слайдер БАЙХГҮЙ (хэрэглэгчийн хүсэлтээр хасагдсан) — зөвхөн
//       хоёр оролт («Доод / Дээд») + цэгээр тусгаарлагдсан тоо ✓
//       ⚠️ 2026-09-30 (3): оролтын доорх ₮-ийн 4 «түргэн хүрээ» товч ч
//          ХАСАГДАВ (хэрэглэгчийн хүсэлт: «санал болгоод байгаа тоог
//          байхгүй болго») ✓
//    ⚠️ Хил нь ХЭСГЭЭС хамаарна: 🏠 үл хөдлөх нь 5 тэрбум хүртэл, бусад нь
//       500 сая — зөвхөн «хязгааргүй тал»-ыг тодорхойлоход хэрэглэгдэнэ ✓
import { AREA_BOUNDS, FLOOR_BOUNDS, buildYearBounds, formatGroupedInput, priceBounds, yearBounds } from '../lib/rangeFilter.mjs';
// 🔀 Эрэмбэлэх сонголт (eBay-ийн «Sort: Best Match ▾» шиг) — цэвэр логик нь
//    `lib/sortOptions.mjs`, DB тал нь `lib/queries.js → sortOrders()`
import { DEFAULT_SORT, SORT_OPTIONS, normalizeSort } from '../lib/sortOptions.mjs';
// 🔖 ХАДГАЛСАН ХАЙЛТ (2026-10-06, хэрэглэгчийн хүсэлт: «unegui.mn шиг хайлтаа
//    гоё хадгалдаг болъё») — үр дүнгийн дээд мөрөнд «Хайлтыг хадгалах» товч.
//    ⚠️ Хадгалалт нь нэвтэрсэн бол DB (`saved_searches` — 0031), зочин бол
//       localStorage (`lib/savedSearches.js → useSavedSearches`, hybrid ✓)
//    ⚠️ «хадгалагдсан эсэх» ба «хадгалах утгатай эсэх» шалгалт нь
//       `lib/savedSearch.mjs` (цэвэр логик, нэг эх сурвалж) — энэ файлд
//       дүрэм ДАХИН БИЧИХГҮЙ ✓
import { useSavedSearches } from '../lib/savedSearches';
import { isSaveableSearch } from '../lib/savedSearch.mjs';
// 🕐 ХАЙЛТЫН ТҮҮХ (2026-10-07, хэрэглэгчийн хүсэлт: «цагийн icon ... ийш
//    орход тухайн хэрэглэгчийн хайлтуудыг харуулдаг болгох») — хайх БҮРД
//    автоматаар бүртгэгдэнэ. Хадгалалт нь нэвтэрсэн бол DB
//    (`search_history` — 0032), зочин бол localStorage (hybrid ✓)
import { useSearchHistory } from '../lib/searchHistory';
// 🛏 ӨРӨӨНИЙ ТОО — ОЛОН СОНГОЛТ — цэвэр логик нь `lib/roomFilter.mjs`
//    (URL, DB, breadcrumb бүгд тэр модулийг хэрэглэнэ) ✓
// 🆕 2026-10-03 (4): ХЭРЭГЛЭГЧИЙН ХҮСЭЛТЭЭР UI ЭРГЭЖ ИРЭВ —
//    «Орон сууц → Дэлгэрэнгүй хайлт» дээр өрөөний тоог ХОРООНЫ блоктой
//    ИЖИЛ `chip-toggle` чипүүдээр, «Үнэ, ₮»-ний ДЭЭР сонгоно ✓
// ⚠️ 2026-09-30 (4)-д UI нь хасагдсан байсныг сэргээв (модуль бүрэн бүтэн
//    байсан тул зөвхөн UI-г дахин холбов) — доод түвшин (URL/DB/breadcrumb)
//    өөрчлөгдөөгүй, хуучин линкүүд эвдрэхгүй ✓
import {
  parseRoomList, roomsUrlValue, roomsFilterLabel, toggleRoomValue,
} from '../lib/roomFilter.mjs';
// 🗺 ДҮҮРЭГ / СУМ — ОЛОН СОНГОЛТ (2026-10-03) — хэрэглэгчийн хүсэлт:
//    «Дэлгэрэнгүй хайлтын Дүүрэг / Сум ийг Өрөөний тоо хайх тай адилхан олон
//    сонгол хийх боломжтой болго» → sidebar-ийн `<select>` нь ЧИП болов ✓
//    ⚠️ Цэвэр логик (утга/шошго/URL/`district` шүүлт) нь
//    `lib/districtFilter.mjs` — UI, URL, DB, breadcrumb бүгд тэр модулийг
//    хэрэглэнэ (нэг эх сурвалж) ✓
import {
  parseDistrictList, districtsUrlValue, districtsFilterLabel,
} from '../lib/districtFilter.mjs';
// 💳 ТӨЛБӨРИЙН НӨХЦӨЛ (2026-10-03) — ҮЛ ХӨДЛӨХ ЗАРНА ба АВТОМАШИН ЗАРНА
//    хэсгийн «Дэлгэрэнгүй хайлт»-д ОЛОН СОНГОЛТТОЙ шүүлт.
//    🆕 2026-10-03 (16): хэрэглэгчийн хүсэлтээр («Өрөөний тоо шиг
//    сонгодог болго») ХАЙЛТ нь `chip-toggle` ЧИП болсон ✓ — CSS нь
//    `app/globals.css` (`chip-toggle` нь өрөө/хороотой НЭГ класс ✓).
//    ⏳ 2026-10-03 (6)-д ☑ checkbox (2 баганат `.pay-grid`/`.pay-check`)
//    байсан — тэр хэв нь ОДОО ЗӨВХӨН ЗАР ОРУУЛАХ ФОРМД
//    (`AddListingClient.jsx → data-payment-picker`) ✓
//    Цэвэр логик (утга/шошго/URL/`cs` шүүлт) нь `lib/paymentFilter.mjs` —
//    UI, URL, DB бүгд тэр модулийг хэрэглэнэ ✓
import {
  PAYMENT_OPTIONS, countPayments, hasPaymentTerms, parsePaymentList,
  paymentsFilterLabel, paymentsUrlValue, togglePaymentValue,
} from '../lib/paymentFilter.mjs';
// 🎨⚙️⛽ ОЛОН СОНГОЛТТОЙ ATTR ШҮҮЛТ (2026-10-03 (19), 🆕 (22)) — хэрэглэгчийн
//   хүсэлт: «Зар хайлт дээр Авто машин сонголт дээр Өнгө ийг Төлбөрийн нөхцөл
//   шиг олон сонголттой болго» + «мөн автомашин хайлт дээр бас ⚙️ Хурдны
//   хайрцаг -ийг 💳 Төлбөрийн нөхцөл шиг болго. бас ⛽ Түлш ийг» ⇒ 🎨 «Өнгө»,
//   ⚙️ «Хурдны хайрцаг», ⛽ «Түлш» (`lib/locationData.js` →
//   `{ chips: true, multi: true }`) нь sidebar-д ОЛОН сонголттой ЧИП болов.
//   ⚠️ Утга нь `filters.attrs.<key>` дотор МАССИВ (`['Хар','Цагаан']` ·
//      `['Автомат','Механик']` · `['Хайбрид','Цахилгаан']`) — URL нь хэвээр
//      `?attr_color=Хар,Цагаан` (хуучин нэг утгатай линк ч ажиллана ✓),
//      DB нь `attrs->>key=in.(…)` (`lib/queries.js → applyAttrMultiFilter`) ✓
//   🆕 2026-10-05 (42): 💼-ийн 🕒 «Ажлын цаг» · 📊 «Туршлага» · 📈 «Мэргэжлийн
//      түвшин» ч мөн адил ОЛОН СОНГОЛТТОЙ ЧИП болов (хэрэглэгчийн хүсэлт:
//      «Ажлын цаг, Туршлага, Мэргэжлийн түвшиныг Өрөөний тоо шиг болго») ⇒
//      `?attr_jobType=Бүтэн цагийн,Цагийн` · `?attr_experience=…` ·
//      `?attr_jobLevel=…` — DB `attrs->>jobType=in.(…)` ✓
//   🚙 2026-10-04 (36): 🚙 «Загвар» ч МАССИВ болов (`attr_model=Prius 30,Harrier`)
//      — ⚠️ гэхдээ DB дээр `in.(…)` БИШ `or=(…ilike…)`, учир нь талбар нь
//      ХАЙЛТТАЙ ТЕКСТ («pri» гэж бүрэн бус бичихэд ч олдоно ✓)
import {
  parseAttrList, attrListUrlValue, attrListFilterLabel, toggleAttrValue, countAttrValues,
} from '../lib/attrMultiFilter.mjs';

// Нүүр хуудсны хайлтын анхдагч (хоосон) утга.
// ⚠️ `khoroos` нь МАССИВ — хэрэглэгч ОЛОН хороог зэрэг сонгоно (unegui.mn-ийн
//    «олон хайлт»). Массивыг санамсаргүй ХУВААЛЦАХААС сэргийлж `EMPTY_FILTERS`-ийг
//    шууд хэрэглэхгүй — `emptyFilters()`-ээр шинэ хуулбар авна.
// 🆕 `rooms` нь БАС МАССИВ (2026-09-30, хэрэглэгчийн хүсэлт: «өрөөний тоог
//    олон сонголттой болго») — ж: `['1','3']` = «1 эсвэл 3 өрөөтэй».
//    ⚠️ Хоосон утга нь `''` БИШ `[]` — эс бөгөөс `.length`/`.includes` унана ✗
// ℹ️ 2026-10-03 (4): UI (чипүүд) эргэж ирсэн тул утга нь UI-ААС, URL-аас
//    (`?rooms=1,3`) ба breadcrumb-ийн линкээс ХОЁУЛАНД ирж болно ✓
// 🆕 2026-10-03 (10): `districts` нь БАС МАССИВ (хэрэглэгчийн хүсэлт:
//    «Дүүрэг / Сум-ийг Өрөөний тоо хайхтай адилхан олон сонголт хийх
//    боломжтой болго») — ж: `['Баянгол','Сүхбаатар']`. URL нь хэвээр
//    `?district=Баянгол,Сүхбаатар` (хуучин нэг утгатай линк ч ажиллана ✓).
//    ⚠️ Хоосон утга нь `''` БИШ `[]` — эс бөгөөс `.length`/`.includes` унана ✗
const EMPTY_FILTERS = {
  propertyType: '', rooms: [], city: '', districts: [], khoroos: [], attrs: {},
  minPrice: '', maxPrice: '', minArea: '', maxArea: '',
  // 🏢📅 2026-10-04: Орон сууцны нэмэлт хүрээний шүүлт (ХЭСЭГ: `real-estate` +
  //    төрөл «Орон сууц»). Баганууд нь `0003_listing_details.sql` —
  //    ⚠️ `attrs` БИШ тул тусдаа талбараар (`minArea`-гийн адил) хадгална ✓
  //      • Барилгын давхар  → `total_floors`
  //      • Хэдэн давхарт    → `floor`
  //      • Ашиглалтанд орсон он → `build_year`
  minTotalFloors: '', maxTotalFloors: '',
  minFloor: '', maxFloor: '',
  minBuildYear: '', maxBuildYear: '',
  // 💳 Төлбөрийн нөхцөл (2026-10-03) — «үл хөдлөх зарна» ба «автомашин зарна»
  //    хэсэгт: ОЛОН СОНГОЛТТОЙ (`['lease','cash']`) — `lib/paymentFilter.mjs`.
  //    ⚠️ Хоосон утга нь `''` БИШ `[]` (өрөөний тоотой ижил шалтгаан ✓)
  payments: [],
};

/** Массив талбаруудыг ХУВААЛЦАХГҮЙ шинэ хоосон хайлт буцаана */
const emptyFilters = () => ({
  ...EMPTY_FILTERS, rooms: [], districts: [], khoroos: [], attrs: {}, payments: [],
});

/**
 * Шүүлт «хоосон» эсэх.
 * ⚠️ `attrs` нь ОБЪЕКТ тул `!!{}` нь `true` — тусдаа шалгана, эс бөгөөс
 *    «Хайлтыг цэвэрлэх» товч үргэлж харагдана.
 */
const isFilterValueEmpty = (v) => {
  if (Array.isArray(v)) return v.length === 0;
  if (v && typeof v === 'object') return Object.keys(v).length === 0;
  return !v;
};

/** URL-ийн таслалаар бичсэн жагсаалтыг массив болгох (хороо) */
function parseListParam(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 🎨 НҮҮР ХУУДСНЫ ХЭСГИЙН КАРТ (2026-10-07, хэрэглэгчийн хүсэлт).
 *
 * ✏️ 2 дахь хүсэлт («бүх 12 картын пастел дэвсгэрийг аваад цагаан карт
 *    болгох»): өмнөх `SECTION_TILE_TONE` (12 хэсэгт 12 пастел өнгө)
 *    БҮРЭН АРИЛАВ ⇒ карт бүр одоо ЦАГААН:
 *      `bg-white` + `border border-gray-200` + `shadow-card` (`.section-card`-ийн
 *      ИЖИЛ хэлбэр). Сонгосон → `ring-2 ring-primary/60`.
 * ⚠️ ХҮРЭЭ/СҮҮДЭР ЗААВАЛ ХЭРЭГТЭЙ: хуудасны дэвсгэр нь `bg-gray-50` (крем) тул
 *    цагаан карт хүрээ/сүүдэргүй бол дэвсгэрээс ялгарахгүй ✗
 * ⚠️ Өнгө нь ЗӨВХӨН `SECTIONS`-ийн `value`-ээр биш — нэг л хэв маяг тул
 *    тусдаа map ХЭРЭГГҮЙ болов ✓
 * 🔍 Хайх үг: tile карт, цагаан карт, пастел арилгав
 */

/**
 * 🛠 ДЭД ТӨРЛИЙН НЭГ МӨР + шошго — 3 газарт ижил markup хэрэглэгддэг тул
 * НЭГ компонент болгов (2026-09-29):
 *   ① энгийн дэд төрөл (`subtypes` — бусад хэсэг),
 *   ② `services`-ийн бүлгийн ДОТОХ дэд төрөл,
 *   ③ доод түвшингүй бүлэг (`items: []`) — өөрөө сонгогдоно.
 * 🗑 CHEVRON (›) ХАСАГДАВ (2026-09-30, хэрэглэгчийн хүсэлт: «category-уудын
 *    урд байгаа > энэ тэмдэгийг болъё») — ⚠️ ЗӨВХӨН чимэглэлийн `<svg>`
 *    (`opacity-30`) арилав; шошго/фонт/жин/`group-hover:text-primary`/
 *    padding (`px-2 py-1.5`)/`break-inside-avoid` БҮГД ХЭВЭЭР ✓. Тиймээс
 *    мөр бүр одоо ЗҮҮН захаас `px-2`-оос эхэлнэ.
 *    ✏️ 2026-10-07: `hover:bg-white` АРИЛАВ — панелийн саарал дэвсгэр
 *    (`bg-gray-100`) байхгүй болсон тул цагаан hover нь хачирхалтай байв ✓
 *    ℹ️ `GroupHeading`-ийн ▶/▼ chevron нь ҮЙЛДЛИЙН ДОХИО (нээх/хаах,
 *    `aria-expanded`) тул ХАСАГДААГҮЙ ✓; breadcrumb-ийн `›` нь
 *    ТУСГААРЛАГЧ (`components/Breadcrumb.jsx`) тул мөн хэвээр.
 * ⚠️ Компонент нь МОДУЛИЙН түвшинд (компонент дотор БИШ) — дотор нь
 *    зарлавал render бүрд ШИНЭ тип болж, React төлөвийг алдаж unmount
 *    хийнэ (`role="tab"`-ийн focus ч алдагдана) ✗
 */
function SubtypeRow({ label, onSelect, count, bold = false }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={false}
      onClick={onSelect}
      className="group flex w-full break-inside-avoid items-baseline gap-1.5 rounded-md px-2 py-1.5 text-left transition"
    >
      <span
        className={`line-clamp-2 overflow-hidden text-[14px] tracking-[-0.01em] text-ellipsis text-gray-900 sm:text-[15px] group-hover:text-primary ${
          bold ? 'font-bold' : 'font-semibold'
        }`}
      >
        {label}
      </span>
      {/* 🔢 Зарын тоо (unegui.mn шиг СААРАЛ) — 2026-10-07 (хэрэглэгчийн хүсэлт:
          «зураг хар даа»). ⚠️ ЗӨВХӨН `count` дамжуулсан үед харагдана —
          нүүр хуудсны ХАВТГАЙ дэд төрөл `typeCounts`-ээс тоог өгнө; харин
          `services`/`computers` бүлгийн мөрүүд count-гүй тул хөндөгдөхгүй ✓ */}
      {typeof count === 'number' && (
        <span className="shrink-0 text-[13px] font-normal text-gray-500 sm:text-[14px]">
          {formatCount(count)}
        </span>
      )}
    </button>
  );
}

/**
 * 🗂 БҮЛГИЙН ГАРЧИГ — 2 ХЭЛБЭРТЭЙ (2026-09-29):
 *   ① `collapsible=false` (анхдагч) → энгийн `<p>`: бүлэг нь ЗӨВХӨН шошго,
 *      дарахгүй (2026-09-27-ны шийдвэр хэвээр ✓)
 *   ② `collapsible=true` (`collapsed: true` бүлэг — 💻 компьютерийн 4 бүлэг) →
 *      ДАРАГДДАГ товч: дарвал дотрох дэд төрлүүд нээгдэж/хаагдана ✓
 *      (`aria-expanded` + chevron ▶ → ▼ эргэлдэнэ)
 * 🔤 Харагдац нь урьдны `<p>`-тэй ЯГ ИЖИЛ (15/16px, bold, `primary-dark`) —
 *    зөвхөн chevron нэмэгдэнэ, фонт/хэмжээ/өнгө өөрчлөгдөхгүй ✓
 * ⚠️ Модулийн түвшинд (компонент дотор БИШ) — `SubtypeRow`-тай ижил шалтгаан
 *    (дотор нь зарлавал render бүрд шинэ тип болж, төлөв/focus алдагдана ✗)
 */
function GroupHeading({ label, collapsible = false, open = false, onToggle }) {
  const text = 'text-[15px] font-bold tracking-[-0.01em] text-primary-dark sm:text-[16px]';
  if (!collapsible) return <p className={`px-2 pb-1 pt-2 ${text}`}>{label}</p>;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={open ? 'Дэд төрлүүдийг хаах' : 'Дэд төрлүүдийг харах'}
      className={`flex w-full items-center gap-1 rounded-md px-2 pb-1 pt-2 text-left transition ${text}`}
    >
      {/* chevron — хаалттай үед ▶, нээлттэй үед ▼ (эргэлдэнэ ✓) */}
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        className={`shrink-0 opacity-60 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
        aria-hidden="true"
      >
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

/**
 * Sidebar-ийн НЭГ БЛОК — unegui.mn загвараар: дээрээ БОЛД гарчиг,
 * доор нь оролтууд. Блокууд нь `divide-y`-ээр тусгаарлагдана.
 *
 * 🆕 2026-10-04 (24): гарчиг нь `text-[13px]` → `text-[15px]` болов — зарын
 *    картын гарчигтай (`ListingCard` → `text-[15px]`) ИЖИЛ хэмжээ
 *    (хэрэглэгчийн хүсэлт: «Хайлтын хэсэг зарын хэсгээсээ тусдаа
 *    харагдахгүй нэгдмэл харагдаж байна. Үүн шиг болгох хэрэгтэй») ✓
 *
 * 🆕 2026-10-04 (25): гарчиг нь `text-[15px] text-gray-800` →
 *    **`text-[16px] text-gray-900`** болж, блок хоорондын зай `py-3.5` →
 *    `py-4` — unegui.mn-ийн хайлтын панелийн ЖИШИГ зурагтай нийцүүлэв
 *    (хэрэглэгчийн хүсэлт: «харагдац нь ийм байвал зүгээр юм… ийм болгоё»).
 *    ⚠️ Талбарын текст нь `.form-*` 15px ХЭВЭЭР — зөвхөн ГАРЧИГ нь
 *       илүү том/хар болж, жишгийн ЯЛГАРАХ шатлал (гарчиг > талбар)
 *       бий болно ✓
 *    ⚠️ Зарын картын үнэ/гарчиг (`text-[22px]`/`text-[15px]`) ХӨНДӨГДӨӨГҮЙ
 *       (`scripts/test-card.mjs` түгжсэн гэрээ ✓)
 *
 * 🆕 2026-10-06 (18): ЭВХЭГДДЭГ (accordion) БОЛОВ — хэрэглэгчийн хүсэлт:
 *    «Энэ дэлгэрэнгүй дотор байгаа Ажлын цаг [гэх мэт] сонголт чинь
 *    хураагдаж болдоггүй юм уу, их зай эзлээд лалрын байна».
 *    • `collapsible = true` үед гарчиг нь ДАРАГДДАГ ТОВЧ болно:
 *      `aria-expanded` + chevron (▶ ↔ ▼ — `GroupHeading`-тэй ИЖИЛ хэв/хэмжээ,
 *      ⚠️ chevron нь SVG тул `textContent`-д ОРОХГҮЙ ⇒ CDP-ийн
 *      «блокийн гарчиг === `Төлбөрийн нөхцөл`» шалгалтууд хэвээр ✓)
 *    • `count > 0` үед гарчгийн хажууд тооны badge (хаалттай үед ч харагдана ✓)
 *    • ⚠️ ХААЛТТАЙ үед ч `children` нь DOM-д БАЙНА (зөвхөн `hidden` класс) —
 *      контентыг УСТГАХГҮЙ тул `data-attr-value`/`aria-pressed`/
 *      `data-room-value`/`data-payment-value` дэгээнүүд ХЭВЭЭР ажиллана ✓
 *      (URL/DB/утгад ЯМАР Ч нөлөөгүй — зөвхөн ХАРАГДАЦ ✓)
 *    • Анхдагч төлөв ба «Бүгдийг нээх» товчны логик нь компонентын ДЭЭР
 *      (`blockOpen` / `toggleSideBlock` / `toggleAllSideBlocks`) ✓
 */
function SideBlock({
  label, children, collapsible = false, open = true, onToggle, count = 0, collapseKey,
}) {
  return (
    <div className="py-4">
      {collapsible ? (
        <button
          type="button"
          data-side-collapse={collapseKey}
          aria-expanded={open}
          onClick={onToggle}
          className={`flex w-full items-center gap-1.5 text-left ${open ? 'mb-2' : ''}`}
        >
          <span className="text-[16px] font-bold text-gray-900">{label}</span>
          {count > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-px text-[11px] font-bold text-white">
              {count}
            </span>
          )}
          {/* chevron — хаалттай үед ▶, нээлттэй үед ▼ (эргэлдэнэ ✓) */}
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            className={`ml-auto shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <span className="mb-2 block text-[16px] font-bold text-gray-900">{label}</span>
      )}
      <div className={open ? 'flex flex-col gap-2' : 'hidden'}>{children}</div>
    </div>
  );
}

/**
 * 🎛 2026-10-04 (37) · 🆕 2026-10-05 (42): «eBay Color» хэвээр ҮР ДҮҮНГИЙН
 *    ДЭЭР гарах ХЭВТЭЭ шүүлтийн мөрөнд ордог attr талбарууд нь ЭНД биш —
 *    `lib/locationData.js`-ийн талбар бүрийн **`filterBar: true`** туг
 *    (НЭГ ЭХ СУРВАЛЖ ✓).
 *
 * ⚠️ ЯАГААД ХАТУУ ЖАГСААЛТ БАЙХГҮЙ ВЭ: өмнө нь энэ файлд
 *    `FILTER_BAR_ATTR_KEYS = ['color','transmission','fuel']` гэж бичигдсэн
 *    байв — 🆕 (42)-д 💼-ийн 🕒/📊/📈 ч нэгдэхэд «хайлтын ДҮРСЛЭЛ» (HomeClient)
 *    дотор attr-ийн нэрийг мэдэх шаардлагагүй болов: зөвхөн ТУГИЙГ уншина ✓
 *    (шинэ талбар нэмэхэд `lib/locationData.js`-д 1 мөр л нэмнэ ✓)
 *
 * ⚠️ Эдгээр талбар нь САЙДБАРААС ГАРСАН (2 ӨӨР UI БАЙХГҮЙ ✓) — зөвхөн 1 л
 *    газар (үр дүнгийн дээрх мөр) дүрслэгдэнэ; утга/URL/DB ХӨНДӨГДӨХГҮЙ ✓
 * 🆕 2026-10-05 (43): ✅ «Төлөв» (⏳ хуучин нэр «Шинэ / Шинэвтэр / Хуучин») ба
 *    💻-ийн 📺 Дэлгэц · ⚙️ CPU · 🧠 RAM · 💾 Хард ч `filterBar: true` болов
 *    (хэрэглэгчийн хүсэлт: «Шинэ, Шинэвтэр, Хуучин ийг Төлөв гэж нэрлэ» +
 *    «Дэлгэцийн хэмжээ, CPU, RAM, SSD Hard, Төлөв эдгээрийг мөн хайдаг
 *    болгоод өг») ⇒ сайдбарт attr шүүлт ОГТ ҮЛДЭХГҮЙ — бүгд ЭНЭ мөрөнд pill ✓
 *    ⚠️ Талбарын НЭР (`label`) нь `lib/locationData.js`-ээс ирнэ — энд хатуу
 *       бичихгүй ✓ (`f.label` дамжуулагдана)
 */

/**
 * 🧩🎛 ХАЙЛТЫН ШҮҮЛТИЙН PILL + ХӨВӨГ (floating) DROPDOWN — 2026-10-04 (37).
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Түлш, Хурдны хайрцаг, Төлбөрийн нөхцөл, Өнгө
 * эдгээрийг ebay-ийн дээр байгаа Color шиг болгоод өг, Төлбөрийн нөхцөл ба
 * Өнгө олон сонголт хийх боломжтой байх» ⇒ сайдбарын БАЙНГА задарсан чип
 * блок БИШ, үр дүнгийн ДЭЭР ХЭВТЭЭ мөрөнд «Color ⌄» шиг pill товч болж,
 * дарахад доошоо хөвөг панель гарч checkbox мөрүүдийг үзүүлнэ ✓
 *
 * ⚠️ ХЭВ нь ХӨНДӨГДӨӨГҮЙ (нэг эх сурвалж): панель доторх сонголтууд нь
 *    хуучин `.chip-toggle` `<button aria-pressed>` + `data-attr-*` /
 *    `data-payment-*` дэгээнүүд ХЭВЭЭР — зөвхөн ГАДНА хүрээ (trigger + панель)
 *    шинэ ✓ (`children`-ээр дамжуулна — талбар бүрийн утга/logic нь дуудагч
 *    дээрээ үлдэнэ ✓)
 * ⚠️ Панель нь `absolute` ба ЗААВАЛ DOM-д бий — `open` биш үед `invisible`
 *    класс (зөвхөн харагдацыг НУУХ, `display:none` БИШ) тул элемент ХЭМЖЭЭТЭЙ
 *    хэвээр үлдэж, CDP-ийн хэмжилт (`getBoundingClientRect`) ба `.click()`
 *    дэгээнүүд бүгд ажиллана ✓
 * ⚠️ Гадна дарах (`mousedown`) / ESC — хаана; дахин дарахад toggle ✓
 * ⚠️ «N сонгосон» badge нь ЗӨВХӨН `count > 0` үед — тэг үед огт render
 *    болохгүй (CDP `multiBadges` нь «0 сонгосон»-ыг тоохгүй ✓)
 * 🗑 2026-10-04 (39): pill-ийн өмнөх EMOJI (`icon` проп) ХАСАГДАВ —
 *    хэрэглэгчийн хүсэлт: «…түлш, үйлдвэрлэсэн он гэх мэт бүх үгний өмнө
 *    байгаа emoji-г байхгүй болго» ⇒ зөвхөн ШОШГО (текст) харагдана ✓
 * 🆕 2026-10-06 (16): HOVER — «одоогийхоосоо ИЛҮҮ БАРААН» болов
 *    (хэрэглэгчийн хүсэлт: «Ажлын зарын болон бусад хэсэг байгаа Ажлын цаг,
 *    Туршлага, Мэргэжлийн түвшин гэх Мэт button дээр mouse дээр cursor
 *    аваачхад одоогийхоосоо илүү бараан өнгөтэй болдог болго»):
 *    ① Сонгоогүй pill: ⏳ `hover:bg-gray-50` (#FAF8F5) нь ЦАГААН/крем
 *       дэвсгэр дээр БАРАГ мэдэгддэггүй байв ✗ ⇒ 🆕 `hover:bg-gray-200`
 *       (#E9E4D9) + `hover:border-gray-400` + `hover:text-gray-900`
 *       (нэг бүтэн алхам бараан — «дарж болно» гэдэг нь тод ✓)
 *    ② Идэвхтэй pill (цайвар цэнхэр `bg-primary-light`): ⏳ hover-д ОГТ
 *       өөрчлөгддөггүй байв ⇒ 🆕 `hover:bg-primary/25` (#dbeafe → ~#c8d8fa)
 *       + `hover:border-primary-dark` + `hover:text-primary-dark`
 *       (⚠️ текст нь AA 4.5:1-ээс доош орохгүйн тулд `primary-dark`:
 *       `primary-light` дээр `primary` 4.2:1 байснаа бараан дэвсгэр дээр
 *       3.6:1 болох байв; `text-primary-dark` (#1d4ed8) нь 4.7:1 ✓)
 *    ⚠️ `FilterPill` нь НЭГ компонент ⇒ 🚗 🎨/⚙️/⛽ · 💼 🕒 Ажлын цаг/📊 Туршлага/
 *       📈 Мэргэжлийн түвшин · 💻 📺/⚙️/🧠/💾 ба ✅ «Төлөв» — БҮХ 18 pill
 *       (БҮХ хэсэг) хамт өөрчлөгдөнө ✓ (2 өөр UI үүсэхгүй)
 *    ⚠️ Зөвхөн ХАРАГДАЦ: утга/URL/DB/`data-filter-pill`/`data-filter-panel`
 *       дэгээ БҮГД ХӨНДӨГДӨӨГҮЙ ✓ — `cdp-job-chips` (💼) ба
 *       `cdp-notebook-specs` (💻) нь бодит Chrome дээр `Input.dispatchMouseEvent`
 *       -ээр hover хийж `getComputedStyle().backgroundColor`-ыг ХЭМЖИНЭ ✓
 *    🔍 Хайх үг: FilterPill, hover:bg-gray-200, hover:bg-primary/25, pill hover
 */
function FilterPill({ label, count, onClear, testKey, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDocDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const active = count > 0;
  return (
    <div ref={ref} data-filter-pill={testKey} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[14px] font-semibold transition ${
          active
            ? 'border-primary bg-primary-light text-primary hover:border-primary-dark hover:bg-primary/25 hover:text-primary-dark'
            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-200 hover:text-gray-900'
        }`}
      >
        {label}
        {active && (
          <span className="rounded-full bg-primary px-1.5 text-[12px] font-bold text-white">
            {count}
          </span>
        )}
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 opacity-60 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {/* ⚠️ Панель нь ҮРГЭЛЖ DOM-д (CDP дэгээ/хэмжилт ✓) — зөвхөн харагдац солигдоно */}
      <div
        data-filter-panel={testKey}
        className={`absolute left-0 top-full z-30 mt-2 w-[280px] rounded-xl border border-gray-200 bg-white p-3 shadow-card ${
          open ? 'visible' : 'invisible pointer-events-none'
        }`}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {active ? (
            <span className="text-[13px] font-semibold text-gray-600">{count} сонгосон</span>
          ) : (
            <span className="text-[13px] text-gray-400">Сонгоно уу</span>
          )}
          {active && (
            <button
              type="button"
              onClick={onClear}
              className="text-[13px] font-semibold text-gray-500 hover:text-primary hover:underline"
            >
              ✕ Цуцлах
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

/**
 * 🖥🔍 ХАЙЛТЫН МӨР — толгойн мөр (2026-10-04 (27)).
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (жишээ зурагтай): «хайлт хэсгийн вэб дээд хэсэгт болгож
 * өөрчил» — хайлтын мөр нь толгойн мөрөнд (лого ба баруун товчнуудын ДҮНД)
 * байрлана. Бүтэц:
 *   [ 🔍 <хайлтын талбар> ] [ Хайх ] [ 📍 Бүх байршил ]
 *
 * ⚠️ HERO-ийн хуучин хэлбэр (зурагтай дэвсгэр) ХАСАГДАВ — мөр нь цул цагаан
 *    толгойн мөрөнд шилжив ✓
 * 🗑 2026-10-07: «Ангилал» `<select>` pill БҮРЭН ХАСАГДАВ (мобайл 2026-10-04
 *    (34), толгой 2026-10-07) — хэрэглэгчийн хүсэлт: «Search-ийн өмнө байгаа
 *    Ангилал цэсийг үгүй болго» ⇒ мөр нь ХОЁУЛ хувилбарт ЯГ ИЖИЛ
 *    ([🔍 талбар][Хайх][📍]). `data-hero-section` · `#home-search-section` ·
 *    `#home-search-mobile-section` дэгээнүүд ОГТ БАЙХГҮЙ (CDP шалгана ✓);
 *    хэсэг солих нь мөрний ЯГ доорх tile панелаар (`data-section-panel`) ✓
 * ⚠️ `variant`:
 *      • `'header'` — толгойн МӨР (≥xl, ≥1280px)
 *      • `'mobile'` — толгойн ДООРХ наалдамхай мөр (`<xl`)
 * ⚠️ Утгууд нь `HomeClient`-ийн төлөвөөс; илгээх нь Enter БА «Хайх» товч
 *    ХОЁУЛАА `onSubmit`-оор ажиллана ✓ (a11y дээр зөв — `<form role="search">`)
 * ⚠️ БҮТЭЦ (2026-10-04 (28) — «нимгэн» pill хэв) — бүх элемент `rounded-full`,
 *    иконууд нь emoji БИШ `currentColor` SVG (`components/HeaderIcons.jsx`):
 *   [🔍 <хайлтын талбар>] [Хайх] [📍 Бүх байршил] */
function HeaderSearchBar({
  variant = 'header',
  search, total, locationLabel, hasLocation,
  onSearchChange, onSubmit, onOpenLocation, onPickSuggestion,
}) {
  const placeholder = total != null ? `${formatCount(total)} зар байна` : 'Хайх...';
  const isHeader = variant === 'header';
  const idBase = isHeader ? 'home-search' : 'home-search-mobile';

  /* 🔎 ХАЙЛТЫН САНАЛ (autocomplete) — 2026-10-05 (46).
     ⚠️ Зөвхөн ФОКУСТАЙ үед л fetch хийнэ — толгой ба мобайл гэсэн 2 экземпляр
        DOM-д зэрэг байдаг (`xl:hidden`) тул эс бөгөөс 1 бичилт = 2 query ✗
     ⚠️ Хоцролт (debounce 220ms) + `reqIdRef` — хожуу ирсэн хариу хуучин
        үгийн саналыг дарж бичихээс (race) сэргийлнэ ✓ */
  const [sugg, setSugg] = useState([]);
  const [suggOpen, setSuggOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  // 🔁 Фокус бүрд саналыг ДАХИН татна (`focusTick` нь effect-ийн trigger).
  //    ⚠️ Зөвхөн `[search]`-ээр ажиллавал: «байр» бичээд → гадна дарж хаагдаад
  //    → хайрцаг руу ДАХИН дарахад үг ХӨДӨЛӨӨГҮЙ тул effect ажиллахгүй ⇒
  //    санал ГАРАХГҮЙ байв ✗ (хэрэглэгчийн гомдлын гол шалтгаан)
  const [focusTick, setFocusTick] = useState(0);
  const inputRef = useRef(null);
  const focusedRef = useRef(false);
  const reqIdRef = useRef(0);
  // ⚡ КЭШ — сүүлд татсан үг ба түүний санал. Дахин фокус хийхэд 0мс-д
  //    ШУУД нээгээд, арын дэвсгэрт шинэчилнэ (unegui.mn-ий мэдрэмж ✓)
  const suggTermRef = useRef('');
  const suggRef = useRef([]);

  useEffect(() => {
    const term = String(search || '').trim();
    if (!focusedRef.current || term.length < 2) {
      setSugg([]); setSuggOpen(false); setActiveIdx(-1);
      return undefined;
    }

    // ⚡ Тэр үгийн санал кэш дээр байвал ШУУД харуулна (хүлээлт 0мс)
    if (suggTermRef.current === term && suggRef.current.length > 0) {
      setSugg(suggRef.current); setSuggOpen(true); setActiveIdx(-1);
    }

    const id = ++reqIdRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`);
        if (!res.ok || id !== reqIdRef.current) return;
        const data = await res.json();
        // ⚠️ Фокус алдсан бол ХООСОН хариу ч, ирсэн хариу ч панель НЭЭХГҮЙ
        //    (эс бөгөөс blur хийсний дараа санал «үсэрч» гарна ✗)
        if (id !== reqIdRef.current || !focusedRef.current) return;
        const items = Array.isArray(data.suggestions) ? data.suggestions : [];
        suggTermRef.current = term;
        suggRef.current = items;
        setSugg(items);
        setSuggOpen(items.length > 0);
        setActiveIdx(-1);
      } catch (e) {
        /* санал авах нь ЧИМЭЭГҮЙ — хайлтад саад болохгүй ✓ */
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [search, focusTick]);

  const closeSugg = () => { setSuggOpen(false); setActiveIdx(-1); };

  const chooseSuggestion = (item) => {
    if (!item) return;
    const value = item.value || item.label || '';
    focusedRef.current = false;
    closeSugg();
    if (inputRef.current) inputRef.current.blur();
    onSearchChange(value);
    if (onPickSuggestion) onPickSuggestion(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    focusedRef.current = false;
    closeSugg();
    if (inputRef.current) inputRef.current.blur();
    onSubmit(e);
  };

  const handleKeyDown = (e) => {
    // ⌨️ Панель хаалттай ч санал БАЙВАЛ ↓/↑ нь ШУУД нээнэ (гараас удирдах ✓)
    if (!suggOpen) {
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && sugg.length > 0) {
        e.preventDefault();
        setSuggOpen(true);
        setActiveIdx(e.key === 'ArrowDown' ? 0 : sugg.length - 1);
      }
      return;
    }
    if (!sugg.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % sugg.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + sugg.length) % sugg.length);
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      chooseSuggestion(sugg[activeIdx]);
    } else if (e.key === 'Escape') {
      closeSugg();
    }
  };

  return (
    <form role="search" onSubmit={handleSubmit} className="flex w-full min-w-0 items-center gap-2">
      {/* 🗑 2026-10-07: ТОЛГОЙН «Ангилал» pill (`<select>`) БҮРЭН ХАСАГДАВ
          (хэрэглэгчийн хүсэлт: «Search-ийн өмнө байгаа Ангилал цэсийг үгүй
           болго»). ⏳ Мобайл хувилбараас 2026-10-04 (34)-д аль хэдийн хасагдсан
             байв — одоо ТОЛГОЙН хувилбар ч мөн адил ⇒ мөр нь ЗӨВХӨН
             [🔍 талбар][Хайх][📍] болов.
          ⚠️ Хэсэг солих нь мөрний ЯГ доорх tile панелаар (`data-section-panel`,
             `SECTIONS.map` → `changeSection`) хийгддэг тул pill нь ИЛҮҮДЭЛ
             давхарга байв ✓
          ⚠️ `#home-search-section` / `[data-hero-section]` дэгээ ОГТ БАЙХГҮЙ
             (DOM-оос БҮРЭН арилсан — `scripts/cdp-sections.mjs` шалгана) */}
      {/* 🔍 ХАЙЛТЫН ТАЛБАР — дотор нь томруулдаг шил (`unegui.mn` шиг) ✓ */}
      <div className="relative min-w-0 flex-1">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        >
          <SearchIcon className="h-[18px] w-[18px]" />
        </span>
        <label className="sr-only" htmlFor={idBase}>Зар хайх</label>
        <input
          id={idBase}
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={suggOpen}
          aria-controls={`${idBase}-suggest`}
          aria-autocomplete="list"
          aria-activedescendant={activeIdx >= 0 ? `${idBase}-suggest-${activeIdx}` : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            focusedRef.current = true;
            // ⚡ Кэш дээр байгаа бол ШУУД (0мс) нээгээд, effect нь арын
            //    дэвсгэрт шинэчилнэ (`focusTick`) — «уншиж эхлэнгүүт гарна» ✓
            const term = String(search || '').trim();
            if (term.length >= 2 && suggTermRef.current === term && suggRef.current.length > 0) {
              setSugg(suggRef.current); setSuggOpen(true); setActiveIdx(-1);
            }
            setFocusTick((t) => t + 1);
          }}
          onBlur={() => { focusedRef.current = false; closeSugg(); }}
          className="h-10 w-full rounded-full border border-gray-200 bg-white pl-10 pr-4 text-[14px] text-gray-900 outline-none placeholder:text-gray-400 focus:border-primary"
        />
        {/* 🔎 САНАЛЫН ПАНЕЛЬ — `role="listbox"` (a11y; сонголт нь input дээр
            `aria-activedescendant`-аар заагдана) ✓ */}
        {suggOpen && sugg.length > 0 && (
          <ul
            id={`${idBase}-suggest`}
            role="listbox"
            data-search-suggest
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-[60vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-card-hover"
          >
            {sugg.map((item, i) => (
              <li
                key={`${item.kind}-${item.value}-${i}`}
                id={`${idBase}-suggest-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                data-suggest-item
                data-suggest-kind={item.kind}
                data-suggest-value={item.value}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chooseSuggestion(item)}
                onMouseEnter={() => setActiveIdx(i)}
                className={`flex cursor-pointer items-center gap-2.5 px-4 py-2 ${
                  i === activeIdx ? 'bg-gray-100' : 'hover:bg-gray-50'
                }`}
              >
                <span aria-hidden="true" className="shrink-0 text-[13px] text-gray-400">
                  {item.kind === 'type' ? '🏷' : '🔍'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-gray-900">{item.label}</span>
                  {item.hint ? (
                    <span className="block truncate text-[12px] text-gray-500">{item.hint}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="submit"
        className="h-10 shrink-0 rounded-full bg-gray-900 px-5 text-[13px] font-bold text-white transition hover:bg-gray-800"
      >
        Хайх
      </button>
      {/* 📍 БАЙРШИЛ — дарахад `LocationPicker` (каскад) нээгдэнэ.
          ⚠️ Сайдбарын «Байршил» блок нь 2026-10-04 (28)-аас энэ ЯГ ижил
             товч/зам руу шилжсэн (`data-sidebar-location`) ✓
          ⚠️ `data-header-location` нь зөвхөн толгойн хувилбарт (CDP дэгээ —
             давхардвал `querySelector` эхнийхийг л авна ✗) */}
      <button
        type="button"
        onClick={onOpenLocation}
        aria-haspopup="dialog"
        {...(isHeader ? { 'data-header-location': true } : {})}
        className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition ${
          hasLocation ? 'bg-primary-light text-primary' : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <PinIcon className="h-[18px] w-[18px]" />
        {/* ⚠️ `<sm` (ж: 390px) дээр зөвхөн ИКОН — шошго хэт урт байвал
            мөр хэвтээ гүйлт (overflow) үүсгэнэ ✗ (`sm`+ дээр бүтэн шошго ✓) */}
        <span className="hidden max-w-[130px] truncate sm:inline">{locationLabel}</span>
      </button>
    </form>
  );
}

/**
 * Хуудасны дугааруудын цонх — урт жагсаалтыг товчлоно.
 * ж: page=7, pageCount=20 → [1, '…', 5, 6, 7, 8, 9, '…', 20]
 * ⚠️ Эхний ба сүүлийн хуудас ҮРГЭЛЖ харагдана (хэрэглэгч төгсгөл рүү
 *    шууд үсрэх боломжтой ✓); дунд нь ±2 хуудас.
 */
function pageWindow(page, pageCount, span = 2) {
  const out = [];
  const from = Math.max(2, page - span);
  const to = Math.min(pageCount - 1, page + span);
  out.push(1);
  if (from > 2) out.push('…');
  for (let i = from; i <= to; i += 1) out.push(i);
  if (to < pageCount - 1) out.push('…');
  if (pageCount > 1) out.push(pageCount);
  return out;
}

/**
 * 📄 ХУУДАСЛАЛТ (pagination) — 2026-09-27 (хэрэглэгчийн хүсэлт).
 * «нэг хуудсанд 50 аас илүү зар харуулахгүй ба page болгоё» → нэг хуудсанд
 * `LISTINGS_PAGE_SIZE` (50) зар, бусад нь `?page=N` болж хуваагдана.
 *
 * ⚠️ МОБАЙЛ (390px) дээр тоонууд нь хэвтээ overflow үүсгэж болзошгүй тул:
 *    • `sm`-ээс ДООШ  → зөвхөн «← Өмнөх | N / M | Дараах →» (товч 2 + тоо)
 *    • `sm`-ээс ДЭЭШ  → бүтэн тоон жагсаалт (товчлолтой)
 *    Хоёулаа НЭГ `aria-label="Хуудаслалт"`-тай nav дотор.
 * ⚠️ `total === null` (count ирээгүй) үед хуудасны тоог мэдэхгүй → зөвхөн
 *    «Дараах» товчийг `hasMore`-оор харуулна (тоон жагсаалт гарахгүй).
 */
function Pagination({ page, pageCount, total, hasMore, onChange }) {
  const known = typeof total === 'number';
  if (!known ? !hasMore && page === 1 : pageCount <= 1) return null;

  const btn =
    'btn btn-outline btn-sm disabled:cursor-not-allowed disabled:opacity-40';
  const jump = (p) => onChange(Math.max(1, p));

  return (
    <nav aria-label="Хуудаслалт" className="mt-7 flex flex-col items-center gap-2">
      {/* ---- 📱 Мобайл: товч + «N / M» ---- */}
      <div className="flex w-full items-center justify-center gap-2 sm:hidden">
        <button
          type="button"
          className={btn}
          disabled={page <= 1}
          onClick={() => jump(page - 1)}
          aria-label="Өмнөх хуудас"
        >
          ← Өмнөх
        </button>
        <span className="px-1 text-[14px] font-semibold text-gray-700">
          {page}
          {known ? ` / ${pageCount}` : ''}
        </span>
        <button
          type="button"
          className={btn}
          disabled={!hasMore}
          onClick={() => jump(page + 1)}
          aria-label="Дараагийн хуудас"
        >
          Дараах →
        </button>
      </div>

      {/* ---- 💻 Desktop: бүтэн тоон жагсаалт ---- */}
      <div className="hidden flex-wrap items-center justify-center gap-1.5 sm:flex">
        <button
          type="button"
          className={btn}
          disabled={page <= 1}
          onClick={() => jump(page - 1)}
        >
          ← Өмнөх
        </button>
        {known &&
          pageCount > 1 &&
          pageWindow(page, pageCount).map((p, i) =>
            p === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-gray-400" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => jump(p)}
                aria-current={p === page ? 'page' : undefined}
                className={
                  p === page
                    ? 'btn btn-primary btn-sm min-w-[38px]'
                    : 'btn btn-outline btn-sm min-w-[38px]'
                }
              >
                {p}
              </button>
            )
          )}
        <button type="button" className={btn} disabled={!hasMore} onClick={() => jump(page + 1)}>
          Дараах →
        </button>
      </div>

      {/* ---- ℹ️ Мэдээлэл: «1–50 / нийт 690» ---- */}
      {known && (
        <p className="text-[13.5px] text-gray-500">
          {(page - 1) * LISTINGS_PAGE_SIZE + 1}–
          {Math.min(total, page * LISTINGS_PAGE_SIZE)} / нийт {total}
        </p>
      )}
    </nav>
  );
}

export default function HomeClient() {
  const { showToast } = useToast();
  const { dataVersion } = useUI();
  // 🖥 header-ийн ГОЛ хэсгийн завсар (2026-10-04 (27)) — доор хайлтын мөрийг
  //    `homeSearchBar`-аар дүүргэнэ (AppProviders нь зөвхөн байр өгнө ✓)
  const { setHeaderSlot } = useHeaderSlot();
  const router = useRouter();
  // 🔖 ХАДГАЛСАН ХАЙЛТ (2026-10-06) — нэвтэрсэн бол DB, зочин бол localStorage.
  //    ⚠️ `user` нь `useSavedSearches`-д хэрэгтэй (аль хадгалалт вэ гэдгийг
  //       шийднэ) — `useAuth()` нь root provider-оос ирнэ ✓
  const { user } = useAuth();
  const savedSearches = useSavedSearches(user);
  // 🕐 ХАЙЛТЫН ТҮҮХ (2026-10-07) — хайх БҮРД автоматаар бүртгэгдэнэ.
  //    ⚠️ `record` нь эффект дотор ref-ээр дуудагдана (deps-д оруулбал
  //       эффект дахин дахин ажиллах эрсдэл ✗); таймер нь debounce-ны төлөв ✓
  const searchHistory = useSearchHistory(user);
  const historyRecordRef = useRef(searchHistory.record);
  historyRecordRef.current = searchHistory.record;
  const historyTimer = useRef(null);
  /**
   * 🔗 Одоогийн хайлтын URL — «Хайлтыг хадгалах» товч ЯГ ҮҮНИЙГ хадгална.
   * ⚠️ Доорх URL-шинэчлэх эффект нь адресны мөрийг бичдэг тул тэр `next`
   *    утгыг энд толь болгож хадгална (товч ба адрес ЗААВАЛ ижил ✓; SSR
   *    дээр `window` байхгүй тул анхдагч нь `''`).
   */
  const [currentUrl, setCurrentUrl] = useState('');
  // 📍 Байршлын пикер (modal) нээлттэй эсэх (2026-10-04 (27))
  const [locOpen, setLocOpen] = useState(false);
  // 🏷️🚙 Машины пикерийн нээлттэй төлөв (2026-10-04 (35)) — 📍 `locOpen`-ийн
  //    ЯГ ИЖИЛ зарчим (HomeClient-ийн `filters.attrs.brand/model`-ыг удирдана ✓)
  const [carOpen, setCarOpen] = useState(false);

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(() => emptyFilters());
  const [view, setView] = useState('list');
  /**
   * 🔀 ЭРЭМБЭЛЭХ (2026-09-30) — eBay-ийн «Sort: Best Match ▾» шиг.
   * ⚠️ Урьд нь дараалал нь `lib/queries.js` дотор ХАТУУ бичсэн байв
   *    (`created_at desc`) → хэрэглэгч «хамгийн хямдаас» эхлэхийг сонгох
   *    боломжгүй байсан ✗
   * ⚠️ Утга нь ЗААВАЛ `normalizeSort()`-оор шүүгдэнэ — `?sort=xxx` гэсэн
   *    танихгүй утга PostgREST руу БАЙХГҮЙ багана болж явахгүй ✓
   * ⚠️ Энэ нь ШҮҮЛТ БИШ (үр дүнгийн БҮРЭН ижил, зөвхөн дараалал) тул
   *    чипүүдийн тоонд ОРОХГҮЙ, харин URL-д хадгалагдана (`?sort=price_asc`)
   */
  const [sort, setSort] = useState(DEFAULT_SORT);
  // 📄 ХУУДАСЛАЛТ (2026-09-27, хэрэглэгчийн хүсэлт) — нэг хуудсанд
  //    `LISTINGS_PAGE_SIZE` (50) зар; бусад нь `?page=N` болж хуваагдана.
  //    ⚠️ `total` нь БҮХ хуудасны нийт тоо (`fetchListings().total`) — гарчигт
  //       харуулна; `hasMore` = дараагийн хуудас байгаа эсэх.
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [listings, setListings] = useState(null); // null = ачаалж байна
  const [loadError, setLoadError] = useState(null); // холболтын алдаа (UI-д тусдаа харуулна)
  const [urlReady, setUrlReady] = useState(false); // URL-ийн хайлтыг уншсан эсэх
  const [typeCounts, setTypeCounts] = useState({}); // төрөл тус бүрийн зарын тоо
  // 🆕 2026-09-30 (хэрэглэгчийн хүсэлт: «өрөөний тооны хойно зарын тоо
  //    харуулдаг аа больчих») → `roomCounts` state + `fetchRoomCounts`
  //    дуудалт БҮГД ХАСАГДАВ ✓ (чип дээр тоо харагдахгүй болсон тул
  //    тэр query нь зөвхөн дэмий ачаалал болно ✗)
  // ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): «Дэлгэрэнгүй хайлт»-ИЙГ ҮРГЭЛЖ
  //    НЭЭЛТТЭЙ болгов → `filtersOpen` төлөв ХЭРЭГГҮЙ болсон тул ХАСАВ ✓
  //    (өмнө нь мобайл дээр «⚙️ Дэлгэрэнгүй хайлт» товчоор нээгддэг байв ✗)
  // ---- ХЭСЭГ (0016_listing_sections.sql) ----
  // ⚠️ `'all'` = хэсэг СОНГООГҮЙ (БҮХ ХЭСГИЙН зар) — үндсэн дэлгэцийн анхдагч.
  //    Үл хөдлөх нь АНХДАГЧААР сонгогдохгүй (хэрэглэгчийн хүсэлт).
  const [section, setSection] = useState('all');
  // ⚠️ DRILL-DOWN: `false` → БҮХ хэсэг tile хэлбэрээр;
  //    `true` → зөвхөн тухайн хэсгийн ДОТООД (дэд төрөл) багана болж харагдана.
  const [sectionOpen, setSectionOpen] = useState(false);
  // 🗂 БҮЛГИЙН ACCORDION (2026-09-29) — `collapsed: true` бүлгүүд (💻 компьютерийн
  //    доод түвшинтэй 4 бүлэг):
  //    `null` = бүх бүлэг анхдагч төлөвтөө (дотрох дэд төрлүүд ХААЛТТАЙ ✓);
  //    утга нь НЭЭЛТТЭЙ бүлгийн нэр (`'Notebook'`) — нэг удаад НЭГ бүлэг нээлттэй.
  //    ⚠️ `sectionOpen`-ээс ЯЛГААТАЙ — хэсэг НЭЭЛТТЭЙ хэвээр байна, зөвхөн
  //       тухайн бүлгийн дотрох дэд төрлүүд харагдана ✓
  const [groupOpen, setGroupOpen] = useState(null);
  // 🆕 2026-10-06 (12) — ХУРААНГУЙ БҮЛГИЙН «Илүү» төлөв (хэрэглэгчийн хүсэлт:
  //    «Сургалт, курс -ийг хураангуй харуулдаг болгоё, эхний 5-ыг
  //    харуулаад цааш харахыг хүсвэл Илүү гэж дар»):
  //    `showFirst` тугтай бүлэг (🛠 «Сургалт, курс» — 23 мөр) нь анхдагчаар
  //    ЭХНИЙ 5 мөрийг л харуулж, үлдсэнийг «Илүү» товчоор нээнэ ✓
  //    • Утга нь НЭЭЛТТЭЙ бүлгүүдийн НЭР-ийн массив (нэг хэсэгт хэд хэдэн ийм
  //      бүлэг байж болно) — `groupOpen` нь нэг утга (`null`/нэр), энэ нь массив
  //    • ⚠️ Хэсэг солиход ЦЭВЭРЛЭНЭ (`changeSection`) — эс бөгөөс хуучин нэр
  //      үлдэж, шинэ хэсгийн бүлэг санамсаргүй нээлттэй харагдах байсан ✗
  const [moreGroups, setMoreGroups] = useState([]);
  /** 🖱 «Илүү» ↔ «Хураах» — бүлгийн нэрийг массивт нэмэх/хасах ✓ */
  const toggleMore = (label) =>
    setMoreGroups((list) => (list.includes(label) ? list.filter((x) => x !== label) : [...list, label]));
  // ⚠️ ЭНД, бүх `useEffect`-ийн ӨМНӨ: эффектүүдийн deps массив РЕНДЕРИЙН ҮЕД
  //    үнэлэгддэг тул хойш зарлавал TDZ алдаа гарна.
  const noSection = section === 'all';
  const [authors, setAuthors] = useState({}); // { [user_id]: { displayName, avatarUrl } }

  // ---- URL-ийн query-ээс хайлтыг унших ----
  // breadcrumb болон хуваалцсан линк ажиллахын тулд:
  //   /?category=sell&type=Орон сууц&rooms=3
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);

    // ---- ХЭСЭГ (0016) — `?section=auto` ----
    // ⚠️ ЭХЛЭЭД уншина: «Зарах / Түрээслэх» нь зөвхөн үл хөдлөхөд байдаг.
    const secRaw = sp.get('section');
    const secParam = secRaw && SECTIONS.some((s) => s.value === secRaw) ? secRaw : 'all';
    if (secParam !== 'all') setSection(secParam);
    // ⚠️ DRILL-DOWN: URL-д `section` БАЙВАЛ шууд тэр хэсэг рүү нээгдэнэ
    if (secRaw) setSectionOpen(true);

    // ⚠️ ЗӨВХӨН үл хөдлөхөд `category` уншина (бусад хэсэгт ийм сонголт байхгүй)
    if (secParam === 'real-estate') {
      const cat = sp.get('category');
      if (cat === 'sell' || cat === 'rent' || cat === 'all') setCategory(cat);
    }

    const q = sp.get('q') || sp.get('search') || '';
    if (q) { setSearch(q); setQuery(q); }
    if (sp.get('view') === 'map') setView('map');
    // 🔀 ЭРЭМБЭЛЭХ — `?sort=price_asc` (танихгүй утга нь АНХДАГЧ болно ✓)
    if (sp.get('sort')) setSort(normalizeSort(sp.get('sort')));

    // ---- 📄 ХУУДАС (`?page=2`) — хуваалцсан линк зөв хуудсыг нээнэ ✓ ----
    // ⚠️ 1-ээс бага / тоо биш / бутархай утгыг алгасна (эвдэрсэн линкээс сэргийлэв)
    const pageRaw = sp.get('page');
    if (pageRaw) {
      const p = Math.floor(Number(pageRaw));
      if (Number.isFinite(p) && p > 1) setPage(p);
    }

    const next = emptyFilters(); // массив хуваалцахгүй
    if (sp.get('type')) next.propertyType = sp.get('type');
    // 🛏 ӨРӨӨНИЙ ТОО — ОЛОН СОНГОЛТ: `?rooms=1,3,5` (таслалаар).
    //    ⚠️ Хуучин НЭГ утгатай линк (`?rooms=3`) ч зөв уншигдана ✓
    //    ⚠️ Хүчингүй утгууд (`?rooms=abc`) ЧИМЭЭГҮЙ хасагдана (`parseRoomList`)
    if (sp.get('rooms')) next.rooms = parseRoomList(sp.get('rooms'));
    // 💳 ТӨЛБӨРИЙН НӨХЦӨЛ — ОЛОН СОНГОЛТ: `?payment=lease,cash`.
    //    ⚠️ Хүчингүй утгууд (`?payment=abc`) ЧИМЭЭГҮЙ хасагдана
    //       (`parsePaymentList` — зөвхөн `PAYMENT_VALUES` ✓)
    //    ⚠️ Утга нь ASCII код (`lease`…`barter`) — кирилл биш тул линк
    //       хуваалцахад ойлгомжтой, тогтвортой ✓
    if (sp.get('payment')) next.payments = parsePaymentList(sp.get('payment'));
    // ⚠️ «Өрөө» талбаргүй төрөлд (ж: Худалдаа, үйлчилгээний талбай) өрөөний
    //    хайлт нь утгагүй тул хуучин линкээс ирсэн ч орхигдуулна.
    if (next.propertyType && !hasRoomsFields(next.propertyType)) next.rooms = [];
    // ⚠️ Тухайн ХЭСЭГТ тохирохгүй дэд төрлийг орхино (ж: авто хэсэгт «Орон сууц»)
    if (next.propertyType && !getSubtypes(secParam).includes(next.propertyType)) {
      next.propertyType = '';
      next.rooms = [];
    }
    // 💳 «Төлбөрийн нөхцөл» нь ЗӨВХӨН үл хөдлөх ба авто хэсэгт (`real-estate`,
    //    `auto`) — бусад хэсэг рүү чиглэсэн ХУУЧИН/гараар бичсэн линк
    //    (`?section=jobs&payment=lease`) ирвэл ЧИМЭЭГҮЙ орхигдуулна ✓
    if (!hasPaymentTerms(secParam)) next.payments = [];
    // ---- ATTR шүүлтүүд — `?attr_brand=Toyota&attr_fuel=Хайбрид` ----
    // 🎨⚙️⛽ ОЛОН СОНГОЛТТОЙ ATTR (2026-10-03 (19), ✅ (21), ⚙️⛽ (22)):
    //    `multi: true` талбар (ж: 🎨 «Өнгө», ⚙️ «Хурдны хайрцаг», ⛽ «Түлш»,
    //    ✅ «Шинэ / Шинэвтэр / Хуучин», 🆕 2026-10-05 (42): 💼 🕒/📊/📈) нь
    //    МАССИВ болж уншигдана
    //    (`?attr_color=Хар,Цагаан` · `?attr_fuel=Хайбрид,Цахилгаан` ·
    //    `?attr_condition=Шинэ,Хуучин`) —
    //    ⚠️ ХУУЧИН нэг утгатай линк (`?attr_fuel=Хайбрид`) ч зөв (нэг элементтэй
    //    массив ✓). Бусад attr нь ХЭВЭЭР скаляр текст ✓
    //    ⚠️ ДАВТАГДСАН параметр (`?attr_color=Хар&attr_color=Цагаан`) ч
    //    нэгтгэгдэнэ (`getAll`) — гараар/гадаад хэрэгслээр үүссэн линк эвдрэхгүй ✓
    const attrs = {};
    sp.forEach((value, key) => {
      if (key.startsWith('attr_') && value) attrs[key.slice(5)] = value;
    });
    Object.keys(attrs).forEach((k) => {
      const fld = getAttrField(secParam, k);
      if (!fld || !fld.multi) return;
      attrs[k] = parseAttrList(sp.getAll(`attr_${k}`));
    });
    /**
     * 🖥 2026-10-03 (7): ТУХАЙН ДЭД ТӨРӨЛД ХҮЧИНГҮЙ attr шүүлтийг хаана —
     *    ж: `?section=computers&type=Mouse&attr_cpu=Intel Core i5` (өөрсдийн
     *    UI-ээс үүсэхгүй, гараар бичсэн линк) → `attr_cpu` нь Notebook-д
     *    зориулагдсан тул sidebar-д ХАРАГДАХГҮЙ атлаа заруудыг шүүж,
     *    «0 үр дүн» гарах байв ✗ ⇒ ЧИМЭЭГҮЙ ХАСНА
     *    (⚠️ `rooms`/`payment`-ийн «хэсэгт тохирохгүй бол орхигдуулна»
     *    дүрэмтэй ЯГ ИЖИЛ — `lib/locationData.js → pruneGatedAttrs` нэг
     *    эх сурвалж, мөн `setF`-ийн дэд төрөл солих зам ч үүнийг дуудна ✓)
     */
    const keptAttrs = pruneGatedAttrs(secParam, next.propertyType, attrs);
    if (Object.keys(keptAttrs).length) next.attrs = keptAttrs;
    if (sp.get('city')) next.city = sp.get('city');
    // ⚠️ ХОРОО: URL-д `khoroo=1-р хороо,3-р хороо` (таслалаар) — хуваалцсан
    //    линк эвдрэхгүйн тулд НЭГ утгатай хуучин линкийг ч зөв уншина.
    // ⚠️ ДҮҮРЭГ — ОЛОН СОНГОЛТ (2026-10-03): URL-д `district=А,Б` (таслалаар,
    //    хэлбэр нь ХУУЧИН нэг утгатай линктэй ЯГ ижил) → `filters.districts`
    //    массив болно. ⚠️ Хүчингүй/хоосон утгууд ЧИМЭЭГҮЙ хасагдана
    //    (`parseDistrictList` — таслал/зай цэвэрлэнэ ✓)
    const districtRaw = sp.get('district');
    if (districtRaw) next.districts = parseDistrictList(districtRaw);
    const khorooRaw = sp.get('khoroo');
    if (khorooRaw) next.khoroos = parseListParam(khorooRaw);
    if (sp.get('minPrice')) next.minPrice = sp.get('minPrice');
    if (sp.get('maxPrice')) next.maxPrice = sp.get('maxPrice');
    if (sp.get('minArea')) next.minArea = sp.get('minArea');
    if (sp.get('maxArea')) next.maxArea = sp.get('maxArea');
    // 🏢📅 Орон сууцны нэмэлт хүрээ (2026-10-04) — `?minTotalFloors=3&maxFloor=20&
    //    minBuildYear=2010` (хуваалцсан линк ШУУД ажиллана ✓)
    if (sp.get('minTotalFloors')) next.minTotalFloors = sp.get('minTotalFloors');
    if (sp.get('maxTotalFloors')) next.maxTotalFloors = sp.get('maxTotalFloors');
    if (sp.get('minFloor')) next.minFloor = sp.get('minFloor');
    if (sp.get('maxFloor')) next.maxFloor = sp.get('maxFloor');
    if (sp.get('minBuildYear')) next.minBuildYear = sp.get('minBuildYear');
    if (sp.get('maxBuildYear')) next.maxBuildYear = sp.get('maxBuildYear');
    if (Object.entries(next).some(([, v]) => !isFilterValueEmpty(v))) setFilters(next);

    setUrlReady(true);
  }, []);

  const load = useCallback(async () => {
    setListings(null);
    setLoadError(null);
    try {
      // 📄 ХУУДАСЛАЛТ: нэг хуудсанд 50 зар (`range`) + нийт тоо (`count`)
      const res = await fetchListings({
        category,
        section,
        attrs: Object.keys(filters.attrs || {}).length ? filters.attrs : undefined,
        search: query,
        propertyType: filters.propertyType || undefined,
        // 🛏 ОЛОН СОНГОЛТ — `['1','3']`; хоосон бол шүүлт хийхгүй (`undefined`)
        rooms: filters.rooms.length ? filters.rooms : undefined,
        // 💳 ТӨЛБӨРИЙН НӨХЦӨЛ — ОЛОН СОНГОЛТ (`['lease','cash']`) — хоосон
        //    бол `undefined` (шүүлт хийхгүй). `lib/queries.js` нь jsonb
        //    containment (`cs`) ба OR болгож хөрвүүлнэ ✓
        payments: filters.payments.length ? filters.payments : undefined,
        city: filters.city || undefined,
        // 🗺 ОЛОН ДҮҮРЭГ/СУМ — `['Баянгол','Сүхбаатар']`; хоосон бол
        //    шүүлт хийхгүй (`undefined`) ⇒ бүх дүүрэг гарна ✓
        districts: filters.districts.length ? filters.districts : undefined,
        khoroos: filters.khoroos.length ? filters.khoroos : undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        minArea: filters.minArea || undefined,
        maxArea: filters.maxArea || undefined,
        // 🏢📅 Орон сууцны нэмэлт хүрээ (2026-10-04) — `total_floors`/`floor`/
        //    `build_year` багана (`lib/queries.js` → `.gte()/.lte()`); хоосон
        //    үед `undefined` (шүүлт хийхгүй ✓)
        minTotalFloors: filters.minTotalFloors || undefined,
        maxTotalFloors: filters.maxTotalFloors || undefined,
        minFloor: filters.minFloor || undefined,
        maxFloor: filters.maxFloor || undefined,
        minBuildYear: filters.minBuildYear || undefined,
        maxBuildYear: filters.maxBuildYear || undefined,
      }, { page, sort });

      // 📄 ХЭТ ӨНДӨР ХУУДАС (`?page=999`) → ХАМГИЙН СҮҮЛИЙН хуудас руу засна.
      //    ⚠️ Эс бөгөөс хэрэглэгч «Зарууд олдсонгүй» дэлгэц дээр гацаж,
      //       буцах хуудаслалт ХАРАГДАХГҮЙ (мөр 0 тул) → гарц байхгүй ✗
      //       (хуучирсан/гараар зассан линкээр ирсэн үед тохиолддог).
      if (!res.rows.length && page > 1 && typeof res.total === 'number' && res.total > 0) {
        setPage(res.pageCount);
        return;
      }

      setListings(res.rows || []);
      setTotal(typeof res.total === 'number' ? res.total : null);
      setHasMore(!!res.hasMore);
    } catch (err) {
      const e = normalizeError(err);
      console.error(e);
      setListings([]);
      setTotal(null);
      setHasMore(false);
      setLoadError(e);
      showToast(e.message, 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, section, query, filters, page, dataVersion, sort]);

  useEffect(() => { if (urlReady) load(); }, [load, urlReady]);

  // ---- 👤 ЗАР НИЙТЛЭГЧДИЙН нэр + ЗУРАГ ----
  // ⚠️ `listings.user_id` нь `profiles` руу FK-ГҮЙ тул PostgREST join
  //    ажиллахгүй → 2 дахь query (`fetchProfilesByIds`) хийж нэгтгэнэ.
  useEffect(() => {
    if (!listings || !listings.length) { setAuthors({}); return; }
    let mounted = true;
    (async () => {
      try {
        const map = await fetchProfilesByIds(listings.map((l) => l.user_id));
        if (mounted) setAuthors(map || {});
      } catch (err) {
        console.warn(normalizeError(err));
        if (mounted) setAuthors({});
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  // ---- Дэд төрөл тус бүрийн зарын тоо (сонгосон ХЭСЭГ + категорид) ----
  useEffect(() => {
    if (!urlReady) return;
    // ⚠️ Хэсэг сонгоогүй бол дэд төрөл БАЙХГҮЙ → query явуулахгүй
    if (noSection) { setTypeCounts({}); return; }
    let mounted = true;
    (async () => {
      try {
        const counts = await fetchPropertyTypeCounts(category, section);
        if (mounted) setTypeCounts(counts || {});
      } catch (err) {
        // Тоо харуулахгүй — үндсэн жагсаалтад нөлөөлөхгүй
        console.warn(normalizeError(err));
        if (mounted) setTypeCounts({});
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, category, section, noSection, dataVersion]);

  // ---- 🆕 2026-09-30: «Өрөө тус бүрийн зарын тоо» ХАСАГДАВ --------------
  // Хэрэглэгчийн хүсэлт: «өрөөний тооны хойно зарын тоо харуулдаг аа больчих»
  // ⚠️ Урьд нь энд `fetchRoomCounts` дуудаж, чип бүрийн баруун талд
  //    «1 өрөө 1,088» гэж харуулдаг байв (unegui.mn загвар) ✗
  //    → одоо чип дээр ЗӨВХӨН «1 өрөө» гарах тул тэр query бүрэн ХЭРЭГГҮЙ ✓
  //    (ачаалалт бүрд 1 DB query хэмнэгдэв; `lib/queries.js → fetchRoomCounts`
  //     функц нь өөрөө хэвээр үлдэв — гадаад хэрэглээ/тестэд нээлттэй API ✓)

  // ---- Хайлт өөрчлөгдөхөд URL-ийг шинэчлэх (хуваалцах боломжтой болгох) ----
  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (query) params.set('q', query);
    // ⚠️ Хэсэг (0016) — `'all'` (сонгоогүй) нь URL-д БИЧИГДЭХГҮЙ (цэвэр линк)
    if (section && section !== 'all') params.set('section', section);
    if (filters.propertyType) params.set('type', filters.propertyType);
    // 🛏 ӨРӨӨНИЙ ТОО — ОЛОН СОНГОЛТ: `?rooms=1,3` (эсвэл `['5']` → `?rooms=5`)
    //    ⚠️ Хоосон үед БИЧИХГҮЙ (цэвэр линк ✓)
    if (filters.rooms.length) params.set('rooms', roomsUrlValue(filters.rooms));
    // 💳 ТӨЛБӨРИЙН НӨХЦӨЛ — ОЛОН СОНГОЛТ: `?payment=lease,cash`
    //    ⚠️ Хоосон үед БИЧИХГҮЙ (цэвэр линк ✓); утга нь ASCII код тул
    //       линк богино, хуваалцахад ойлгомжтой ✓
    if (filters.payments.length) params.set('payment', paymentsUrlValue(filters.payments));
    // ⚠️ ATTR шүүлтүүд — `attr_brand=Toyota` (jsonb)
    // 🎨⚙️⛽ ОЛОН СОНГОЛТТОЙ ATTR (2026-10-03 (19), ✅ (21), ⚙️⛽ (22)) — утга
    //    нь МАССИВ бол таслалаар нэгтгэнэ (`?attr_color=Хар,Цагаан` ·
    //    `?attr_fuel=Хайбрид,Цахилгаан`) — ⚠️ параметрийн НЭР нь хуучин нэг
    //    утгатайтай ИЖИЛ тул хуучин линк/breadcrumb эвдрэхгүй ✓
    //    ⚠️ Хоосон массив (`[]`) үед БИЧИХГҮЙ (цэвэр линк ✓)
    Object.entries(filters.attrs || {}).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length) params.set(`attr_${k}`, attrListUrlValue(v));
        return;
      }
      if (v) params.set(`attr_${k}`, v);
    });
    if (filters.city) params.set('city', filters.city);
    // 🗺 ДҮҮРЭГ / СУМ — ОЛОН СОНГОЛТ: `?district=Баянгол,Сүхбаатар`
    //    (⚠️ параметрийн НЭР нь хуучин нэг утгатайтай ИЖИЛ — хуучин линк,
    //    breadcrumb, bookmark бүгд эвдрэхгүй ✓; хоосон үед БИЧИХГҮЙ ✓)
    if (filters.districts.length) params.set('district', districtsUrlValue(filters.districts));
    if (filters.khoroos.length) params.set('khoroo', filters.khoroos.join(','));
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.minArea) params.set('minArea', filters.minArea);
    if (filters.maxArea) params.set('maxArea', filters.maxArea);
    // 🏢📅 Орон сууцны нэмэлт хүрээ (2026-10-04) — хоосон үед БИЧИХГҮЙ (цэвэр линк ✓)
    if (filters.minTotalFloors) params.set('minTotalFloors', filters.minTotalFloors);
    if (filters.maxTotalFloors) params.set('maxTotalFloors', filters.maxTotalFloors);
    if (filters.minFloor) params.set('minFloor', filters.minFloor);
    if (filters.maxFloor) params.set('maxFloor', filters.maxFloor);
    if (filters.minBuildYear) params.set('minBuildYear', filters.minBuildYear);
    if (filters.maxBuildYear) params.set('maxBuildYear', filters.maxBuildYear);
    if (view === 'map') params.set('view', 'map');
    // 🔀 ЭРЭМБЭЛЭХ — анхдагч («шинээр») нь URL-д БИЧИГДЭХГҮЙ (цэвэр линк ✓)
    if (sort !== DEFAULT_SORT) params.set('sort', sort);
    // 📄 ХУУДАС — 1-р хуудас нь URL-д БИЧИГДЭХГҮЙ (цэвэр линк ✓)
    if (page > 1) params.set('page', String(page));

    const qs = params.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    const current = `${window.location.pathname}${window.location.search}`;
    // 🔖 Товчны хадгалах утга (адресны мөртэй ЯГ ИЖИЛ) — доорх `router.replace`
    //    бол зөвхөн харагдацын синк; энэ нь React-ийн төлөв ✓
    setCurrentUrl(next);
    if (next !== current) router.replace(next, { scroll: false });
    // 🕐 ХАЙЛТЫН ТҮҮХ — линк СТОПОЛСНЫ дараа (900мс, debounce) нэг л удаа
    //    бүртгэнэ. ⚠️ Шууд бүртгэвэл шүүлт бичих/солих БҮРД олон мөр үүснэ ✗
    //    ⚠️ «Бүх зар» (`isSaveableSearch` false) бол ОГТ бүртгэхгүй ✓
    if (isSaveableSearch(next)) {
      if (historyTimer.current) clearTimeout(historyTimer.current);
      historyTimer.current = setTimeout(() => {
        if (historyRecordRef.current) historyRecordRef.current(next);
      }, 900);
    }
    // ⚠️ Дараагийн өөрчлөлт эсвэл unmount дээр хуучин таймерыг цуцална —
    //    энэ нь яг debounce-ны зан төлөв (зөвхөн СҮҮЛИЙН төлөвийг бүртгэнэ ✓)
    return () => { if (historyTimer.current) clearTimeout(historyTimer.current); };
  }, [urlReady, category, section, query, filters, view, page, sort, router]);

  /**
   * Шүүлт тавих/солих (талбарууд нь sidebar + чипүүд).
   * ⚠️ 📄 Шүүлт өөрчлөгдвөл 1-р хуудас руу БУЦНА (`setPage(1)`) — эс бөгөөс
   *    хэрэглэгч 5-р хуудсан дээр шүүлт тавиад «хоосон» хуудас харна ✗
   *    (шүүсэн үр дүн цөөн байхад хуудасны дугаар хэт өндөр болно).
   *    ⚠️ React нэг event доторх бүх `setState`-ийг БАГЦААР нэгтгэдэг тул
   *       `load` НЭГ удаа л (page=1-ээр) ажиллана ✓ (илүү query явуулахгүй).
   */
  const setF = (k, v) => {
    setPage(1);
    setFilters((f) => {
      const next = { ...f, [k]: v };
      // Хот/аймаг солигдвол дүүрэг, хорооны сонголт ХҮЧИНГҮЙ болно (жагсаалт өөр)
      if (k === 'city') { next.districts = []; next.khoroos = []; }
      // 🗺 Дүүрэг/сум солигдвол хороодын жагсаалт өөр болно (нэгдэл өөр) →
      //    хорооны сонголтыг ЦЭВЭРЛЭНЭ (хуучин нэг утгатай үеийн ЯГ ИЖИЛ зан ✓)
      if (k === 'districts' || k === 'district') { next.khoroos = []; }
      // «Өрөө» талбаргүй төрөл сонговол өрөөний хайлтыг цэвэрлэнэ (ж: Худалдаа…)
      if (k === 'propertyType' && v && !hasRoomsFields(v)) next.rooms = [];
      // 🏢📅 «Орон сууц» БИШ төрөл сонговол давхар/оны хүрээг ЦЭВЭРЛЭНЭ (ж: Газар,
      //    Оффис …) — эс бөгөөс сайдбарт ХАРАГДАХГҮЙ «үл үзэгдэх шүүлт» үлдэж,
      //    хэрэглэгч «0 үр дүн» гэж гайхана ✗ (`rooms`-ийн дүрэмтэй ЯГ ижил ✓)
      if (k === 'propertyType' && v && !hasApartmentFields(v)) {
        Object.assign(next, {
          minTotalFloors: '', maxTotalFloors: '',
          minFloor: '', maxFloor: '',
          minBuildYear: '', maxBuildYear: '',
        });
      }
      /**
       * 🖥 2026-10-03 (7): дэд төрөл солигдоход ТУХАЙН ДЭД ТӨРӨЛД ХҮЧИНГҮЙ
       *    болсон attr шүүлтийг ЦЭВЭРЛЭНЭ (ж: 💻 Notebook-ийн ⚙️ CPU → Mouse).
       *    ⚠️ ЯАГААД: `?attr_cpu=Intel Core i5` нь URL/DB-д ҮЛДВЭЛ sidebar-д
       *    харагдахгүй «үл үзэгдэх шүүлт» болж, хэрэглэгч «0 үр дүн» гэж
       *    гайхана ✗ — дүрэм нь `lib/locationData.js → pruneGatedAttrs` (нэг
       *    эх сурвалж; линкээр орох үед ч ЯГ ижил дүрэм хэрэглэгдэнэ ✓)
       */
      if (k === 'propertyType') {
        const kept = pruneGatedAttrs(section, v, f.attrs || {});
        if (kept !== f.attrs) next.attrs = kept;
      }
      return next;
    });
  };

  /**
   * 🛏 ОЛОН ӨРӨӨ — нэг дарж нэмэх/хасах (checkbox мэт).
   * 🆕 2026-10-03 (4): UI нь ХОРООНЫ блоктой ИЖИЛ хэв маяг (чипүүд `✓`
   *    тэмдэгтэй, «N сонгосон» badge, «✕ Цуцлах» ✓)
   * Хэрэглэгчийн хүсэлт: «өрөөний тоог олон сонголт хийх боломжтой байх» →
   *   [1 өрөө] [2 өрөө] [3 өрөө] дарж `?rooms=1,2,3` болно (OR — аль ч).
   * ⚠️ Дүрэм нь `lib/roomFilter.mjs → toggleRoomValue()` (нэг эх сурвалж):
   *    шинэ массив буцаана, хүчингүй утгыг алгасна, давхцуулахгүй ✓
   * ⚠️ 📄 1-р хуудас руу буцна — эс бөгөөс шүүсэн үр дүн цөөн байхад
   *    «хоосон» хуудас харагдана ✗ (`setF`-тэй ижил зарчим)
   */
  const toggleRooms = (value) => {
    setPage(1);
    setFilters((f) => ({ ...f, rooms: toggleRoomValue(f.rooms, value) }));
  };

  /** 🛏 Сонгосон бүх өрөөг арилгах («✕ Цуцлах») */
  const clearRooms = () => setF('rooms', []);

  /**
   * 💳 ТӨЛБӨРИЙН НӨХЦӨЛ — нэг дарж нэмэх/хасах (checkbox мэт, 2026-10-03).
   * Хэрэглэгчийн хүсэлт: «Төлбөрийн нөхцөлийг Үл хөдлөх зарна, Автомашин
   * зарна гэсэн дээр хайх хэсэгт гардаг болгоё … олон сонголт хийж байгаа
   * боломж» → [💳 Хувь лизингээр] [💵 Бэлэн төлөлтөөр] … дарж
   * `?payment=lease,cash` болно (OR — аль ч нөхцөлтэй зарууд ✓).
   * ⚠️ Дүрэм нь `lib/paymentFilter.mjs → togglePaymentValue()` (нэг эх сурвалж):
   *    шинэ массив буцаана, хүчингүй утгыг алгасна, давхцуулахгүй ✓
   * ⚠️ 📄 1-р хуудас руу буцна — `toggleRooms`-той ижил шалтгаан ✓
   */
  const togglePayments = (value) => {
    setPage(1);
    setFilters((f) => ({ ...f, payments: togglePaymentValue(f.payments, value) }));
  };

  /** 💳 Сонгосон бүх нөхцөлийг арилгах («✕ Цуцлах») */
  const clearPayments = () => setF('payments', []);


  /* 🗺 ДҮҮРЭГ/СУМ ба ХОРООНЫ сонголт (2026-10-04 (28)).
     ⏳ ЭНД ХАСАГДАВ: `toggleDistrict()` · `clearDistricts()` · `toggleKhoroo()` —
        сайдбарын «Байршил» блок нь Хот/Аймаг → Дүүрэг → Хороог нэг дор
        сонгодог `LocationPicker` (modal) болсон тул эдгээр нь хэрэглэгдэхгүй
        болсон. Дүрэм нь ХЭВЭЭР:
          • `toggleDistrictValue()` — `components/LocationPicker.jsx` (дүүрэг)
          • `applyLocation()` — HomeClient (хот+дүүрэг+хороог НЭГ дор бичнэ)
          • `setF`-ийн цэвэрлэх дүрэм (хот солиход дүүрэг/хороо, дүүрэг
            солиход хороо) — доор `setF` дотор ХЭВЭЭР ✓
     ↩️ Буцаах бол: `git show fdede74:components/HomeClient.jsx` */


  const resetAll = () => {
    setCategory('all'); setQuery(''); setSearch('');
    setPage(1); // 📄 бүх шүүлт арилсан → 1-р хуудас
    // 🔀 Эрэмбэлэлт ч анхдагчдаа буцна («Бүгдийг цэвэрлэх» = үр дүнгийн
    //    харагдац БҮРЭН анхдагч болно — эс бөгөөс «цэвэрлэсэн» ч дараалал
    //    хуучнаараа үлдэж, хэрэглэгчид ойлгомжгүй байв ✗)
    setSort(DEFAULT_SORT);
    // 🛠 ХЭСЭГ ба drill-down-ыг ч сэргээнэ — эс бөгөөс «Бүх зар» дарсан ч
    //    тухайн хэсгийн (ж: Автомашин) зарууд хэвээр үлддэг байв (АЛДАА).
    setSection('all');
    setSectionOpen(false);
    setGroupOpen(null); // 🗂 бүлгийн accordion ч анхдагч төлөвтөө (хаалттай)
    setFilters(emptyFilters()); // массив хуваалцахгүй
  };

  /* 🗑 2026-09-29 (хэрэглэгчийн хүсэлт: «Бүх бүлэг, Бүх хэсэг, гэсэн буцах
     товчийг байхгүй болго») `backToAllSections()` ХАСАГДАВ — түүнийг дуудаж
     байсан «← Бүх хэсэг» чип ч хамт хасагдсан ✓
     ⚠️ «БҮХ ХЭСЭГ → БҮХ ЗАР» болох зам ХЭВЭЭР: breadcrumb-ийн «Бүх зар» линк
        (`nav: { reset: true }` → `resetAll()`, `lib/breadcrumb.js` мөр 98) яг
        тэр үйлдлийг хийнэ (хэсэг/категори/дэд төрөл/бүлэг бүгд цэвэрлэгдэнэ ✓)
        — тиймээс товч нь ДАВХАР буцах зам байсан. */

  /** 🔀 Эрэмбэлэлт солих — үр дүнгийн БАГЦ ЭХНЭЭСЭЭ харагдах ёстой (1-р хуудас) */
  const changeSort = (value) => {
    setSort(normalizeSort(value));
    setPage(1);
  };

  /* 🗑 2026-10-07: `changeHeroSection()` ХАСАГДАВ — толгойн «Ангилал» `<select>`
     (2026-10-04 (34)-д мобайл, 2026-10-07-д толгой) бүрэн хасагдсан тул
     дуудагч үлдээгүй ✓. Хэсэг солих нь мөрний доорх tile панелаас ШУУД
     `changeSection(v)` дуудна (`SECTIONS.map` → `onClick`) ✓ */

  /**
   * ХЭСЭГ солих (0016) — дэд төрөл/attr/өрөө бүгд ХҮЧИНГҮЙ болно.
   * ⚠️ DRILL-DOWN: хэсэг дээр дарах нь түүнийг НЭЭНЭ (`sectionOpen = true`) —
   *    бусад хэсэг алга болж, дотрох дэд төрлүүд багана болж харагдана.
   * ⚠️ Аль хэдийн сонгогдсон хэсэг дээр дарахад ч НЭЭНЭ.
   */
  const changeSection = (nextSection, { open = true } = {}) => {
    if (nextSection !== section) {
      setSection(nextSection);
      // 📄 өөр хэсэг → өөр жагсаалт тул 1-р хуудас
      //    ⚠️ Ижил хэсэг дээр (зөвхөн нээх) дарах үед хуудсыг ХӨНДӨХГҮЙ ✓
      setPage(1);
      // ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөхөд
      setCategory((c) => (hasCategoryChoice(nextSection) && c !== 'all' ? c : 'all'));
      setFilters((f) => ({
        ...f, propertyType: '', rooms: [], attrs: {}, payments: [],
        // 🏢📅 2026-10-04: өөр хэсэг = давхар/оны хүрээ ХҮЧИНГҮЙ (ж: 🚗 авто
        //    руу шилжихэд үлдвэл «үл үзэгдэх шүүлт» болно ✗)
        minTotalFloors: '', maxTotalFloors: '',
        minFloor: '', maxFloor: '',
        minBuildYear: '', maxBuildYear: '',
      }));
      // 💳 «Төлбөрийн нөхцөл» (2026-10-03) — шинэ хэсэгт ХҮЧИНГҮЙ (ж: «Ажил»
      //    хэсэгт лизинг гэж байхгүй) тул хэсэг солих БҮРД цэвэрлэнэ ✓
      //    ⚠️ `rooms` массив хоослохтой ЯГ ИЖИЛ хэв маяг (`[]`, `''` БИШ)
      // 🗂 өөр хэсэг = өөр бүлгүүд → accordion анхдагчдаа (хаалттай) ✓
      setGroupOpen(null);
      // 🆕 2026-10-06 (12): хураангуй бүлгүүд («Сургалт, курс») ч анхдагчдаа
      //    буцана — эс бөгөөс шинэ хэсэгт ижил нэртэй бүлэг санамсаргүй
      //    бүтнээрээ нээлттэй харагдах байсан ✗ (`setGroupOpen(null)`-тай ижил)
      setMoreGroups([]);
      // ⚠️ 2026-09-27: `setFiltersOpen(false)` ХАСАГДСАН — панель үргэлж
      //    нээлттэй тул хаах ойлголт байхгүй ✓ (хэсэг солиход панель ХЭВЭЭР ✓)
    }
    if (open) setSectionOpen(true);
  };

  /**
   * ATTR шүүлт (jsonb) — утга тавих / хоослох (`delete` тул URL/DB цэвэр).
   *
   * 🔗 2026-10-01: «эцэг» шүүлт (ж: 🏷️ Үйлдвэрлэгч) солигдоход түүнээс хамаарах
   *    «хүү» шүүлтийн (ж: 🚙 Загвар) ХУУЧИРСАН утгыг ЦЭВЭРЛЭНЭ — эс бөгөөс
   *    `?attr_brand=Nissan&attr_model=Prius 30` гэсэн ЗӨРЧСӨН шүүлт үлдэж,
   *    хэрэглэгч «0 үр дүн» гэж гайхана ✗ (формтой ЯГ ИЖИЛ дүрэм:
   *    `lib/carModels.mjs → cascadeAttrs`; гараар бичсэн утга ХӨНДӨГДӨХГҮЙ ✓)
   */
  const setAttr = (key, value) => {
    setPage(1); // 📄 шүүлт өөрчлөгдсөн → 1-р хуудас
    setFilters((f) => {
      const prev = f.attrs || {};
      const attrs = { ...prev };
      // ⚠️ ОЛОН СОНГОЛТТОЙ талбар (`multi: true`) — хоослох утга нь `''`
      //    БИШ `[]`. `[]` нь ХҮЧИНТЭЙ (truthy) тул энгийн `if (value)` нь
      //    «хоосон массив хадгална» ✗ → `length`-ээр шалгана ✓
      //    (`clearRooms`/`clearPayments` нь `[]` тавьдагтай ижил зарчим)
      const keep = Array.isArray(value) ? value.length > 0 : Boolean(value);
      if (keep) attrs[key] = value;
      else delete attrs[key];
      // ⚠️ `attrFilters` нь доор (useMemo) тодорхойлогдоно — гэхдээ энэ нь
      //    ЗӨВХӨН event handler дотор дуудагдах тул аюулгүй ✓
      return { ...f, attrs: cascadeAttrs(attrs, prev, key, attrFilters) };
    });
  };

  /**
   * 🎨⚙️⛽ ОЛОН СОНГОЛТТОЙ ATTR — нэг дарж нэмэх/хасах (checkbox мэт,
   * 2026-10-03 (19); ✅ «Шинэ / Шинэвтэр / Хуучин» — (21); ⚙️ «Хурдны хайрцаг»
   * ба ⛽ «Түлш» — (22)).
   *
   * Хэрэглэгчийн хүсэлт: «Зар хайлт дээр Авто машин сонголт дээр Өнгө ийг
   * Төлбөрийн нөхцөл шиг олон сонголттой болго» ба «хайлт дээр Шинэ / Шинэвтэр /
   * Хуучин ийг бас 💳 Төлбөрийн нөхцөл шиг олон сонголт хийх боломжтой болго»
   * ба «мөн автомашин хайлт дээр бас ⚙️ Хурдны хайрцаг -ийг 💳 Төлбөрийн нөхцөл
   * шиг болго. бас ⛽ Түлш ийг» ба 🆕 «Ажлын цаг, Туршлага, Мэргэжлийн түвшиныг
   * Өрөөний тоо шиг болго» (2026-10-05 (42))
   * → [Хар] [Цагаан] дарж `?attr_color=Хар,Цагаан` (OR — аль нэг өнгөтэй зар ✓),
   * [Шинэ] [Хуучин] дарж `?attr_condition=Шинэ,Хуучин` (OR — аль нэг төлөвтэй зар ✓),
   * [Автомат] [Механик] дарж `?attr_transmission=Автомат,Механик` (OR ✓),
   * [Хайбрид] [Цахилгаан] дарж `?attr_fuel=Хайбрид,Цахилгаан` (OR ✓),
   * [Бүтэн цагийн] [Цагийн] дарж `?attr_jobType=Бүтэн цагийн,Цагийн` (OR ✓),
   * [Мэргэжилтэн] [Анхан шатны] дарж `?attr_jobLevel=Мэргэжилтэн,Анхан шатны` (OR ✓).
   * ⚠️ Дүрэм нь `lib/attrMultiFilter.mjs → toggleAttrValue()` (нэг эх сурвалж):
   *    шинэ массив буцаана, хүчингүй утгыг алгасна, давхцуулахгүй ✓
   * ⚠️ Утга нь `attrs` дотроо хадгалагдах тул `cascadeAttrs` ч дуудагдана
   *    (ж: 🏷️ брэнд солигдоход 🚙 загвар цэвэрлэгддэг дүрэм ХЭВЭЭР ✓)
   * ⚠️ 📄 1-р хуудас руу буцна (`toggleRooms`/`togglePayments`-тэй ижил ✓)
   */
  const toggleAttrMulti = (key, value) => {
    setPage(1);
    setFilters((f) => {
      const prev = f.attrs || {};
      const next = toggleAttrValue(prev[key], value);
      const attrs = { ...prev };
      if (next.length) attrs[key] = next;
      else delete attrs[key];
      return { ...f, attrs: cascadeAttrs(attrs, prev, key, attrFilters) };
    });
  };

  /** Олон сонголттой attr-ийн УТГУУД (үргэлж массив — `attrValue` нь скаляр ✓) */
  const attrArray = (key) => parseAttrList((filters.attrs || {})[key]);

  /** Олон сонголттой attr-ийн бүх утгыг арилгах («✕ Цуцлах») */
  const clearAttrMulti = (key) => setAttr(key, []);


  /** Хэсгийн attr шүүлтийн одоогийн утга (⚠️ зөвхөн СКАЛЯР талбарт) */
  const attrValue = (key) => {
    const v = (filters.attrs || {})[key];
    // 🎨 Олон сонголттой талбар (`multi: true`) нь МАССИВ — энэ getter нь
    //    ЗӨВХӨН скаляр талбарт зориулагдсан (чипүүд `attrArray()`-ыг дуудна ✓)
    return Array.isArray(v) ? '' : (v || '');
  };

  /**
   * 📅 ХҮРЭЭНИЙ ATTR (оны хүрээ) — ХОЁР түлхүүрийг НЭГ дор тавина
   * (`<key>_from` ба `<key>_to`) — `components/RangeInput.jsx` үүнийг дуудна.
   *
   * ⚠️ Хоосон талыг `delete` хийнэ — эс бөгөөс `?attr_year_from=` гэсэн
   *    ХООСОН түлхүүр URL-д үлдэж, `lib/queries.js` нь `attrs->>year`-ыг
   *    `''`-тай харьцуулж БҮХ зарыг хааж/нээж эвдрэнэ ✗
   *    (`setAttr` нь нэг түлхүүрт яг үүнийг хийдэг — энэ нь ХОСООНЫ хувилбар ✓)
   */
  const setAttrPair = (base, fromV, toV) => {
    setPage(1); // 📄 шүүлт өөрчлөгдсөн → 1-р хуудас
    setFilters((f) => {
      const attrs = { ...(f.attrs || {}) };
      [[`${base}_from`, fromV], [`${base}_to`, toV]].forEach(([k, v]) => {
        if (v) attrs[k] = String(v);
        else delete attrs[k];
      });
      return { ...f, attrs };
    });
  };

  /** Breadcrumb-ийн линк дээр дарахад тухайн түвшин рүү буцаана.
   *  ⚠️ `<Link>`-ээр ЯВАХГҮЙ: бүх линк нь `/` зам дээр байдаг тул Next.js
   *     компонентийг ДАХИН MOUNT хийдэггүй → `useEffect([])` нь URL-ийг дахин
   *     уншихгүй, шүүлт ХУУЧНААРАА үлдэнэ. Тиймээс төлөвийг ШУУД өөрчилнө
   *     (URL-ийг доорх эффект өөрөө бичнэ). */
  const goToCrumb = (item) => {
    const nav = item?.nav;
    if (!nav) return;
    if (nav.reset) { resetAll(); return; }
    // 📄 breadcrumb-аар түвшин солих = өөр жагсаалт → 1-р хуудас
    setPage(1);
    // ⚠️ ХЭСЭГ (0016) — breadcrumb-ийн «Үл хөдлөх» / «Автомашин» линк.
    //    ⚠️ `nav.section` байхгүй бол хэсэг ХӨНДӨГДӨХГҮЙ
    if (nav.section !== undefined) setSection(nav.section);
    /* 🎯 ПАНЕЛЬ НЭЭЛТТЭЙ БАЙХ ЭСЭХ — 3 ТОХИОЛДОЛ (2026-09-30):
         ① `nav.keepOpen` — хэсгийн crumb (💻 «Компьютер, Дагалдах хэрэгсэл»)
            → панель НЭЭЛТТЭЙ + FOCUS хаагдана (`groupOpen = null`): хэсгийн
            ЭНГИЙН харагдац (бүх бүлэг + хэсгийн зарууд) — хэрэглэгчийн хүсэлт:
            «Notebook хэсэгт орсон байлаад ... “Компьютер, Дагалдах хэрэгсэл”
            дээр дархад ... зарууд руу шилждэг байх» ✓
            ⚠️ ЭНЭ блок нь доорх `nav.group`-ООС ӨМНӨ байх ЁСТОЙ: хэсгийн
               crumb-ийн `group: null` нь (хуучин дүрмээр) панелийг хааж,
               7 tile дэлгэц рүү шидэх байсан ✗
         ② `nav.group` — 3 дахь түвшин («Notebook», «Apple»): панель НЭЭЛТТЭЙ
            (`!!nav.group`) ба тэр бүлэг НЭЭЛТТЭЙ байна ✓
         ③ Бусад (хуучин хэсгийн/category crumb) — панель ХААГДАЖ 7 tile
            дэлгэц гарна (2026-09-27-оос хойшхи зан төлөв ХЭВЭЭР ✓) */
    if (nav.keepOpen) {
      setSectionOpen(true);
      setGroupOpen(null);
    } else if (nav.group !== undefined) {
      setSectionOpen(!!nav.group);
      // 🗂 `collapsed: true` бүлэг (💻 Notebook) — breadcrumb-ийн «Notebook» /
      //    «Apple» линк дээр дарахад (`nav.filters` нь `propertyType`-ийг
      //    цэвэрлэнэ ✓) панель эргэн гарч ирэхдээ тэр бүлэг НЭЭЛТТЭЙ байна ✓
      //    — эс бөгөөс хэрэглэгч «Apple хаана байна?» гэж хайх байсан ✗
      //    ⚠️ Туггүй бүлэгт энэ нь ХОР ХӨНӨӨГҮЙ (тэд үргэлж нээлттэй).
      //    `null` (хэсгийн линк) → бүх бүлэг анхдагч төлөвтөө.
      //    ℹ️ `?type=Apple` гэсэн ШУУД линкээр орж ирэхэд панель өөрөө
      //       ХАРАГДАХГҮЙ (`!filters.propertyType`) тул бүлгийг нээх шаардлага
      //       байхгүй — тиймээс URL-ээс `groupOpen` тавих код БАЙХГҮЙ ✓
      setGroupOpen(nav.group);
    } else if (nav.section !== undefined) {
      // ⚠️ ③ хуучин зан төлөв: хэсгийн deep crumb (ж: «Үл хөдлөх») → 7 tile
      setSectionOpen(false);
    }
    if (nav.category !== undefined) setCategory(nav.category);
    if (nav.filters) setFilters((f) => ({ ...f, ...nav.filters }));
  };

  /**
   * 📄 Хуудас солих (pagination) — 2026-09-27.
   * ⚠️ Хуудас сольсны дараа үр дүнгийн эхэнд ГҮЙЛГЭНЭ ✓ — эс бөгөөс мобайлд
   *    хэрэглэгч хуудасны доод хэсэгт (товч дээр) үлдэж, шинэ заруудыг
   *    харахгүй ✗. `scrollIntoView` нь байгаа «🔍 Хайх» товчтой ижил арга ✓
   */
  const goToPage = (p) => {
    const next = Math.max(1, Math.floor(Number(p) || 1));
    setPage(next);
    const el = document.getElementById('listing-results');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* 🗺 `districtOptions` / `khoroos` memo (2026-10-04 (28)) ЭНД ХАСАГДАВ —
     сайдбарын Байршил блок нь `LocationPicker` болсон тул дүүрэг/хорооны
     жагсаалтыг ЗӨВХӨН тэр компонент (`lib/locationData.js`-оос) бүтээнэ
     (нэг эх сурвалж ✓ давхардсан тооцоо БАЙХГҮЙ) */

  /** ХЭСГИЙН тодорхойлолт ба уламжлагдсан утгууд (0016)
   *  ⚠️ `noSection` нь ДЭЭР (бүх hook-ийн өмнө) зарлагдсан.
   *  ⚠️ `sec`/`isRealEstate` нь `showRooms`-ООС ӨМНӨ байх ЁСТОЙ (TDZ алдаа). */
  const sec = getSection(noSection ? 'real-estate' : section);
  const isRealEstate = section === 'real-estate';
  /**
   * 💼 АЖЛЫН ЗАР эсэх (2026-10-03 (9), хэрэглэгчийн хүсэлт) — ажлын зарт
   *    «үнэ» биш **ЦАЛИН** байдаг тул sidebar-ийн «Үнэ, ₮» блок нь
   *    «Цалин, ₮» болж, «Ажлын цаг» нь ЧИП хэлбэрээр харагдана ✓
   *    (уншигдах текст нь `priceWord(section)` — нэг эх сурвалж)
   */
  const isJobs = section === 'jobs';

  /**
   * 🚗 АВТОМАШИН эсэх (2026-10-04 (35)) — зөвхөн энэ хэсэгт 🏷️ Үйлдвэрлэгч ба
   *    🚙 Загвар нь ХОЁР тусдаа талбар БИШ, НЭГ товч → `CarPicker` (modal,
   *    каскад + хайлт) болно — 📍 Байршилтай ЯГ ИЖИЛ хэв ✓
   *    ⚠️ Утга нь `filters.attrs.brand` / `.model` ХЭВЭЭР (URL/DB/query/breadcrumb/
   *       чип бүгд ХӨНДӨГДӨХГҮЙ ✓ migration ШААРДЛАГАГҮЙ)
   *    ⚠️ Бусад хэсэгт (💻 Брэнд …) талбарууд нь ХУУЧИН хэвээрээ (combo/select) ✓
   */
  const isAuto = section === 'auto';

  /**
   * 🛏 ӨРӨӨНИЙ ТООНЫ блок харагдах эсэх — 🆕 2026-10-03 (4) UI сэргээв.
   * ⚠️ «Өрөө» ойлголтгүй төрөл (Газар, Оффис, Худалдааны талбай, Үйлдвэр …)
   *    сонгосон үед нуугдана — тэнд өрөөний шүүлт нь утгагүй ✗
   *    (`lib/locationData.js → PROPERTY_TYPE_DEFS` дэх `rooms: true` туг)
   */
  const showRooms = isRealEstate
    && (!filters.propertyType || hasRoomsFields(filters.propertyType));

  /**
   * 🏢📅 Орон сууцны НЭМЭЛТ ХҮРЭЭНИЙ блок (2026-10-04) — «Барилгын давхар»
   *    (`total_floors`), «Хэдэн давхарт» (`floor`), «Ашиглалтанд орсон он»
   *    (`build_year`).
   * ⚠️ `showRooms`-той ЯГ ИЖИЛ дүрэм: 🏠 үл хөдлөх БА (төрөл сонгоогүй эсвэл
   *    «Орон сууц» — `apartment: true` туг дахь `PROPERTY_TYPE_DEFS`).
   *    Газар/Оффис/Худалдааны талбайд давхар/он тохирохгүй ✗
   *    (`lib/locationData.js → hasApartmentFields`, нэг эх сурвалж ✓)
   * ⚠️ Төрөл солиход ХҮЧИНГҮЙ утга ЦЭВЭРЛЭГДЭНЭ (`setF` дотор `rooms`-той
   *    ижил дүрэм) — «үл үзэгдэх шүүлт» үлдэхгүй ✓
   */
  const showApartmentRanges = isRealEstate
    && (!filters.propertyType || hasApartmentFields(filters.propertyType));

  /**
   * 💳 ТӨЛБӨРИЙН НӨХЦӨЛ блок харагдах эсэх (2026-10-03) — ЗӨВХӨН
   *   «Үл хөдлөх зарна» ба «Автомашин зарна» хэсэгт (хэрэглэгчийн хүсэлт:
   *   «Төлбөрийн нөхцөлийг Үл хөдлөх зарна, Автомашин зарна гэсэн дээр
   *   хайх хэсэгт гардаг болгоё»).
   * ⚠️ Хэсэг сонгоогүй (`'all'`) үед ХАРАГДАХГҮЙ — тэр дэлгэцэнд бүх
   *    хэсгийн зар холилдсон тул шүүлт утгагүй ✗
   *    (`lib/paymentFilter.mjs → hasPaymentTerms`)
   * ⚠️ `section` нь UI-ийн төлөв (URL-ийн `?section=…`) — breadcrumb/хэсэг
   *    солих үед ч блок тэр даруй шинэчлэгдэнэ ✓
   */
  const showPayments = hasPaymentTerms(section);

  /**
   * ⚙️ «Дэлгэрэнгүй хайлт» панель ХАРАГДАХ эсэх — 2026-10-03 (13).
   *
   * 🆕 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Дэлгэрэнгүй хайлт 3р түвшний сонголт дээр орж
   *    ирж байна (Бүх зар › Автомашин › Суудлын машин) — 2р түвшин дээр
   *    гаргаж ирээд, бүх зар дээр шүүдэг болго».
   *
   * ⚠️ Урьд нь панель нь ЗӨВХӨН дэд төрөл (3-р түвшин, `filters.propertyType`)
   *    сонгосон үед гарч, бусад үед «💡 Төрөл сонгоход дэлгэрэнгүй хайлт
   *    харагдана» зөвлөмж харагддаг байв ✗
   * ✅ ОДОО: хэсэг (2-р түвшин, ж: Бүх зар › Автомашин) БА «Бүх зар»
   *    (1-р түвшин) дээр Ч харагдана ⇒ ҮРГЭЛЖ НЭЭЛТТЭЙ ✓
   *    (хүсэлт: «бүх зар дээр шүү»).
   *
   * ⚠️ Панель доторх блок нь хэсэг/төрлөөсөө хамаарч ӨӨРӨӨ шүүгдэнэ
   *    (`showRooms` / `showPayments` / `attrFilters` / «Талбай» — `isRealEstate`):
   *    • «Бүх зар» дээр ЗӨВХӨН нийтлэг блок — 📍 Байршил · 💰 Үнэ (attr = [] ✓)
   *    • Хэсэг дээр (ж: 🚗 Автомашин) — attr шүүлтүүд (🏷️ Брэнд · 🚙 Загвар …) + 💳
   *    • Дэд төрөл дээр — `onlySubtypes`-тай шүүлтүүд ч нэмэгдэнэ (💻 Notebook)
   *    ⇒ нэмэлт нөхцөл ШААРДЛАГАГҮЙ: `lib/locationData.js` өөрөө шийднэ ✓
   */
  const showAdvancedFilters = true;

  /**
   * 🔢 ҮНИЙ хил (2026-09-30) — ХЭСГЭЭС хамаарна: 🏠 үл хөдлөх → 5 тэрбум,
   *   бусад → 500 сая.
   * ⚠️ Хил нь ЗӨВХӨН «хязгааргүй тал»-ыг тодорхойлоход хэрэглэгдэнэ (утга
   *    хилтэй тэнцвэл `''` = шүүлт БАЙХГҮЙ) — хэрэглэгчийн бичсэн утгыг
   *    ХЯЗГААРЛАХГҮЙ ✓ (ж: 5 тэрбумын хил дээр 6 тэрбум бичиж болно)
   * ⚠️ `useMemo` — объект нь render бүрд ШИНЭ болвол `RangeInput`-ийн
   *    `[from, to]` хамааралт `useEffect` дэмий ажиллаж, хэрэглэгчийн
   *    бичиж байгаа текст алга болно ✗
   */
  const priceLimit = useMemo(() => priceBounds(isRealEstate), [isRealEstate]);
  /**
   * 📅 АШИГЛАЛТАНД ОРСОН ОНЫ хил (1980…одоогийн он, `build_year`) — `useMemo`
   *    (объект нь render бүрд ШИНЭ болохгүй; `priceLimit`-тэй ижил шалтгаан ✓)
   */
  const buildYearLimit = useMemo(() => buildYearBounds(), []);

  // ⚠️ Хэсэг сонгоогүй бол дэд төрөл БАЙХГҮЙ (дэмий query явуулахгүй)
  const subtypes = useMemo(
    () => (noSection ? [] : getSubtypes(section)),
    [section, noSection]
  );
  /**
   * 🛠 3 ДАХЬ ТҮВШИН — бүлэг нь `services` ба `computers` хэсэгт байна.
   * ⚠️ 2026-09-29 (хэрэглэгчийн хүсэлт: «3р төвшинг заавал нээж харахгүй,
   *    шууд харуулдаг болгоё») — бүлэг нь АНХДАГЧААР зөвхөн ГАРЧИГ: бүх бүлэг
   *    ба түүний дэд төрлүүд НЭГ ДОР ШУУД харагдана. `groupOpen` төлөв ба
   *    «нээлттэй бүлэг» ойлголт ХАСАГДСАН ✓
   * 🆕 2026-09-29 (💻 компьютерийн 4 бүлэг) — `collapsed: true` тугтай бүлэг
   *    дээр энэ дүрэм БУЦАЖ ирэв: тэр бүлгийн дэд төрлүүд нь ШУУД
   *    ХАРАГДАХГҮЙ, гарчиг нь дарж нээгддэг (`groupOpen`), нээгдэхэд
   *    панелийн бүтэн өргөнөөр 4 БАГАНААР гарна.
   *    ⚠️ Туг нь `lib/locationData.js` дээрх бүлэг тус бүрийн тохиргоо —
   *       компонентод хатуу бичсэн нэр БАЙХГҮЙ ✓ (services-д туг байхгүй тул
   *       тэнд 2026-09-29-ний «бүгд шууд нээлттэй» дүрэм хэвээр ✓)
   * ⚠️ Бүлэг нь ШҮҮЛТ БИШ — зөвхөн навигаци (хэрэглэгчийн сонголт ✓).
   */
  const subtypeGroups = useMemo(
    () => (noSection ? [] : getSubtypeGroups(section)),
    [section, noSection]
  );
  /**
   * 🎯 FOCUS ГОРИМ (2026-09-29, 3 дахь хэрэглэгчийн хүсэлт: «Жишээ нь: Notebook
   *    дээр дараад орход Notebook ний дотрох 3-р түвшиний Subcategory-ууд
   *    харагдаад бусад 2-р түвшиний category ууд нь харагдахаа больдог байя»):
   *    `collapsed: true` бүлэг НЭЭЛТТЭЙ үед бусад 2-р түвшин (БҮХ бүлэг —
   *    гарчигтай БОЛОН `items: []` leaf мөрүүд) БҮРЭН АЛГА БОЛЖ, зөвхөн
   *    ТУХАЙН бүлэг ба түүний дэд төрлүүд (**4 БАГАНА**) харагдана ✓
   *    (🛠 services-ийн drill-down-тай ижил зарчим; 🗑 2026-09-29-ээс буцах чип
   *    («← Бүх бүлэг») ХАСАГДАВ — буцах нь бүлгийн ГАРЧИГ дээр дарах (chevron ▼),
   *    панелийн гарчиг дээр дарах (7 tile) эсвэл breadcrumb ✓)
   *    🆕 BREADCRUMB-ИЙН ХЭСГИЙН ЛИНК (2026-09-30): FOCUS үед хэсгийн нэр
   *    («Компьютер, Дагалдах хэрэгсэл») нь сүүлийн crumb ч ЛИНК болж
   *    (`lib/breadcrumb.js` → `linkLast: focus` + `nav.keepOpen`), дарахад
   *    «Notebook» FOCUS хаагдаж хэсгийн ЭНГИЙН харагдац (бүх бүлэг +
   *    хэсгийн зарууд, панель НЭЭЛТТЭЙ) гарна ✓ — хэрэглэгчийн хүсэлт:
   *    «Notebook хэсэгт орсон байлаад ... “Компьютер, Дагалдах хэрэгсэл” дээр
   *    дархад “Компьютер, Дагалдах хэрэгсэл”-ийн зарууд руу шилждэг байх»
   * ⚠️ Утга нь ТУХАЙН ХЭСЭГТ БАЙГАА тугтай бүлгийн нэр — `groupOpen` шууд
   *    хэрэглэвэл хуучирсан нэр үлдэхэд (ж: хэсэг солиод) БҮХ бүлэг алга
   *    болж, панель хоосон харагдах байсан ✗ (хамгаалалт ✓)
   * ⚠️ FOCUS нь ЗӨВХӨН `collapsed` тугтай бүлэгт — 🛠 services-д туг байхгүй
   *    тул тэнд бүх бүлэг ХЭВЭЭР харагдана ✓ (тестээр түгжсэн).
   */
  const focusedGroup = useMemo(
    () =>
      groupOpen && subtypeGroups.some((g) => g.collapsed && g.label === groupOpen)
        ? groupOpen
        : null,
    [groupOpen, subtypeGroups]
  );
  /**
   * 🖥📱 2026-10-04: ХЭСГИЙН ПАНЕЛИЙН «Зарах / Түрээслэх» сонголт — БҮТЭН
   *    шошготой («Үл хөдлөх зарна» / «Үл хөдлөх түрээслүүлнэ») ба «Бүгд» нь
   *    ХАМГИЙН СҮҮЛД. ⚠️ Шошго/дараалал нь `lib/locationData.js →
   *    getSectionCategoryChoices` (нэг эх сурвалж) — хатуу бичсэн нэр БАЙХГҮЙ ✓
   */
  const categoryChoices = useMemo(() => getSectionCategoryChoices(section), [section]);
  /**
   * 🖥 2026-10-03 (7): `attrFilters` нь ДЭД ТӨРЛӨӨС хамаарна — 💻 Notebook-ийн
   *    📺 Дэлгэц · ⚙️ CPU · 🧠 RAM · 💾 Хард шүүлтүүд нь зөвхөн Notebook-ийн
   *    брэнд (эсвэл «Иж бүрэн компьютер»/«Процессор, сервер») сонгосон үед
   *    харагдана ✓ (`lib/locationData.js → getAttrFilters(section, subtype)`;
   *    формойн `getAttrFields`-тэй ЯГ ИЖИЛ `onlySubtypes` дүрэм)
   *    ⚠️ `filters.propertyType` нь sidebar-д харагдах шүүлтийг тодорхойлдог
   *       тул ХАМААРАЛТАЙ байх ЁСТОЙ (`setAttr`-ийн `cascadeAttrs` ч үүнийг
   *       ашиглана) — useMemo-гийн хамааралд оруулав ✓
   */
  const attrFilters = useMemo(
    () => getAttrFilters(section, filters.propertyType),
    [section, filters.propertyType]
  );

  /**
   * 🧩🎛 2026-10-04 (37) · 🆕 2026-10-05 (42): ҮР ДҮҮНГИЙН ДЭЭРХ ХЭВТЭЭ
   *    ШҮҮЛТИЙН МӨР (eBay-ийн «Color ⌄» шиг) — ⏳ (42)/(43)-д 🎨 Өнгө ·
   *    ⚙️ Хурдны хайрцаг · ⛽ Түлш (🚗) · 💼 🕒/📊/📈 ба ✅ «Төлөв» ч ЭНД байв.
   * 🆕 2026-10-06 (17): 🎨/⚙️/⛽ · 💼 🕒/📊/📈 ба ✅ «Төлөв» нь САЙДБАРТ
   *    БУЦАВ (хэрэглэгчийн хүсэлт: «Өнгө, Түлш, Хурдны хайрцаг Дэлгэрэнгүй
   *    хайлтын хэсэгт Төлбөрийн нөхцөлийн ардаас оруул» + «Ажлын цаг,
   *    Туршлага, Мэргэжлийн түвшиныг бас Дэлгэрэнгүй хайлт д оруул» +
   *    «Компьютер, Дагалдах хэрэгсэл болон бусад хэсгийн Төлөв сонголтыг ч»)
   *    ⇒ мөр нь ОДОО зөвхөн 💻 📺 Дэлгэц · ⚙️ CPU · 🧠 RAM · 💾 Хард pill-тэй
   *    (⚠️ хэрэглэгчийн хүсэлтэд зөвхөн «Төлөв» нэрлэгдсэн тул 4 үзүүлэлт
   *    хэвээр pill ✓ — шаардвал `filterBar` тугийг хасахад л сайдбарт орно ✓)
   * 🆕 2026-10-06: 🛏 «Өрөөний тоо» ба 💳 «Төлбөрийн нөхцөл» ч ЭНД БАЙХГҮЙ —
   *    хоёулаа САЙДБАРТ (хэрэглэгчийн хүсэлт) ⇒
   *    мөр нь ЗӨВХӨН `filterBar: true` тугтай attr pill-үүдээс бүрдэнэ ✓
   * ⚠️ Аль талбар ЭНД ирэх нь `lib/locationData.js`-ийн **`filterBar: true`**
   *    тугаар шийдэгдэнэ — хатуу жагсаалт (`FILTER_BAR_ATTR_KEYS`) БАЙХГҮЙ
   *    болсон тул хайлтын дүрслэл attr-ийн нэрийг мэдэхгүй ✓ (нэг эх сурвалж)
   * ⚠️ Эдгээр нь САЙДБАРААС ГАРСАН (доорх `.filter` нь хаана) — 2 өөр UI
   *    БАЙХГҮЙ ✓; утга/URL/DB (`lib/attrMultiFilter.mjs`) ХӨНДӨГДӨХГҮЙ ✓
   */
  const filterBarAttrs = useMemo(
    () => attrFilters.filter((f) => f.chips && f.multi && f.filterBar),
    [attrFilters]
  );
  /** ⚠️ 2026-10-06: `showRooms`/`showPayments` нь ЭНД ОРОХГҮЙ — тэр хоёр блок
   *  сайдбарт тул `#filter-bar` нь зөвхөн attr pill-тэй үед л render болно ✓ */
  const hasFilterBar = filterBarAttrs.length > 0;
  /**
   * 🆕 2026-10-06 (17): «💳 Төлбөрийн нөхцөл»-ийн ЯГ АРАА гардаг attr шүүлтүүд
   *    (🚗 🎨 Өнгө · ⛽ Түлш · ⚙️ Хурдны хайрцаг) — `lib/locationData.js`-ийн
   *    `afterPayment: <эрэмбэ>` туг л шийднэ (хатуу жагсаалт БАЙХГҮЙ ✓;
   *    1 = хамгийн эхний ⇒ Өнгө → Түлш → Хурдны хайрцаг).
   *    ⚠️ Эдгээр нь САЙДБАРТ (үр дүнгийн дээрх `#filter-bar` pill БИШ ✓) —
   *       хэрэглэгчийн хүсэлт: «Өнгө, Түлш, Хурдны хайрцаг Дэлгэрэнгүй хайлтын
   *       хэсэгт Төлбөрийн нөхцөлийн ардаас оруул».
   *    ⚠️ 2 ӨӨР UI БАЙХГҮЙ — үндсэн attr жагсаалт нь эдгээрийг ХАСНА
   *       (`.filter((f) => !f.afterPayment)`) ✓
   *    ⚠️ Утга/URL/DB ХӨНДӨГДӨӨГҮЙ: `?attr_color=Хар,Цагаан` →
   *       `attrs->>color=in.(…)` (`lib/attrMultiFilter.mjs` ✓)
   */
  const afterPaymentAttrs = useMemo(
    () => attrFilters
      .filter((f) => f.chips && f.multi && f.afterPayment)
      .sort((a, b) => a.afterPayment - b.afterPayment),
    [attrFilters]
  );
  /**
   * 🆕 2026-10-06 (17): ОЛОН СОНГОЛТТОЙ ЧИП-ИЙН ХАЙРЦАГ — НЭГ ГАЗАР бичигдэнэ
   *    (⏳ урьд нь ③ газар хуулагдаж байв ✗): ① сайдбарын үндсэн attr шүүлт
   *    ② 🆕 `afterPaymentAttrs` (💳-ийн дараах блок) ③ `#filter-bar` pill
   *    (тэр нь `FilterPill` ⇢ ⌄ панель дотор энэ хайрцгийг `children`-ээр
   *    авна ✓).
   *    ⚠️ CDP-ийн дэгээнүүд ХЭВЭЭР (УСТГАХГҮЙ): `data-attr-filter` (талбар =
   *       1 дэгээ) · `data-attr-multi="true"` (олон сонголт) · `data-attr-value`
   *       (чип) · `chip-toggle` (+`-active`) · «N сонгосон» + «✕ Цуцлах» ✓
   *    ⚠️ Дүрслэл нь «🛏 Өрөөний тоо»/«💳 Төлбөрийн нөхцөл»-тэй ЯГ ИЖИЛ ✓
   */
  const attrChipBox = (f) => (
    <div
        className="rounded-lg border border-gray-200 bg-gray-50/70 p-2"
        data-attr-filter={f.key}
        data-attr-multi="true"
        role="group"
        aria-label={f.label}
      >
        <div className="flex flex-wrap gap-1.5">
          {(f.options || []).map((o) => {
            const on = attrArray(f.key).includes(o);
            return (
              <button
                key={o}
                type="button"
                aria-pressed={on}
                data-attr-value={o}
                onClick={() => toggleAttrMulti(f.key, o)}
                className={`chip-toggle ${on ? 'chip-toggle-active' : ''}`}
              >
                {on && <span aria-hidden="true">✓</span>}
                {o}
              </button>
            );
          })}
        </div>
      </div>
  );
  /**
   * ⚠️ БҮТЭН БЛОК = «N сонгосон» badge + хайрцаг (`attrChipBox`) + «✕ Цуцлах»
   *    — сайдбарын 2 газарт (үндсэн attr шүүлт · 🆕 `afterPaymentAttrs`) ✓
   */
  const attrChipsBlock = (f) => (
    <>
      {attrArray(f.key).length > 0 && (
        <span className="self-start rounded-full bg-primary-light px-1.5 py-px text-[12px] font-bold text-primary">
          {countAttrValues(attrArray(f.key))} сонгосон
        </span>
      )}
      {attrChipBox(f)}
      {attrArray(f.key).length > 0 && (
        <button
          type="button"
          onClick={() => clearAttrMulti(f.key)}
          className="self-start text-[13px] font-semibold text-gray-500 hover:text-primary hover:underline"
        >
          ✕ Цуцлах
        </button>
      )}
    </>
  );
  /**
   * 🆕 2026-10-06 (18): САЙДБАРЫН ЧИП БЛОКУУД ХУРААГДАХ/ДЭЛГЭГДЭХ БОЛОВ
   *    (хэрэглэгчийн хүсэлт: «Энэ дэлгэрэнгүй дотор байгаа Ажлын цаг [гэх мэт]
   *    сонголт чинь хураагдаж болдоггүй юм уу, их зай эзлээд лалрын байна»).
   *
   *    ⚠️ Босго (5 ба түүнээс олон сонголт ⇒ анхдагчаар ХУРААСАН) нь
   *       `lib/locationData.js → SIDEBAR_CHIP_COLLAPSE_MIN` (НЭГ ЭХ СУРВАЛЖ) ✓
   *    ⚠️ 3 давхарга төлөв (дээрээс доош):
   *       ① `openBlocks[key]` — ХЭРЭГЛЭГЧИЙН тодорхой блокийн товшилт
   *       ② `allBlocksOpen` — «Бүгдийг нээх/хураах» (панелийн толгойн товч)
   *       ③ АНХДАГЧ: идэвхтэй (сонгосон) утгатай бол НЭЭЛТТЭЙ, эс бөгөөс
   *          сонголтын тоо босгоос цөөн бол нээлттэй
   *    ⚠️ Идэвхтэй утгатай блок АВТОМАТААР нээлттэй байх нь ЧУХАЛ: шүүлт
   *       нь ХАРАГДАХГҮЙ үлдвэл хэрэглэгч «юу шүүснээ» мэдэхгүй болно ✗
   *    ⚠️ Утга/URL/DB ХӨНДӨӨГДӨХГҮЙ — зөвхөн `hidden` класс солигдоно ✓
   */
  const [openBlocks, setOpenBlocks] = useState({}); // { [key]: true|false } — блок тус бүрийн товшилт
  const [allBlocksOpen, setAllBlocksOpen] = useState(null); // null = анхдагч (товч дараагүй)
  /** Блокийн ОДООГИЙН төлөв (`optionCount` = сонголтын тоо, `activeCount` = сонгосон) */
  const blockOpen = (key, optionCount, activeCount) => {
    if (openBlocks[key] !== undefined) return openBlocks[key];
    if (allBlocksOpen !== null) return allBlocksOpen;
    return activeCount > 0 || optionCount < SIDEBAR_CHIP_COLLAPSE_MIN;
  };
  /** Нэг блокийг нээх/хаах (товшилт нь анхдагчаас дээгүүр ✓) */
  const toggleSideBlock = (key, optionCount, activeCount) =>
    setOpenBlocks((s) => ({ ...s, [key]: !blockOpen(key, optionCount, activeCount) }));
  /**
   * «Бүгдийг нээх» ↔ «Хураах» — НЭГ товч (панелийн толгой).
   *    ⚠️ Дарахад `openBlocks`-ийг ЦЭВЭРЛЭНЭ (бүх блок нэг төлөвт орно ✓)
   */
  const toggleAllSideBlocks = () => {
    setOpenBlocks({});
    setAllBlocksOpen((v) => v !== true);
  };

  /** «Зарах / Түрээслэх» сонголт харагдах эсэх — ⚠️ ЗӨВХӨН үл хөдлөхөд */
  const showCategories = hasCategoryChoice(section);
  /**
   * 🏠📱 2026-10-04 (хэрэглэгчийн хүсэлт: «үл хөдлөх рүү ороход Үл хөдлөх зарна,
   *   Үл хөдлөх түрээслүүлнэ гэж харагдуул, түүний дотрох Орон сууц, Газар гэх
   *   мэтийг энэ үед бүү харуул»): ХЭСГИЙН ПАНЕЛЬ — 2 АЛХАМТ DRILL.
   *   ⏳ Урьд нь 🏠 үл хөдлөх рүү ороход «Үл хөдлөх зарна / …түрээслүүлнэ / Бүгд»
   *      (категори) БА «Орон сууц, Газар, …» (дэд төрөл) ХАМТ харагддаг байв ✗
   *   ✅ Одоо: категори СОНГООГҮЙ (`category === 'all'` — хэсгийн ЕРӨНХИЙ
   *      харагдац) үед дэд төрлүүд ХАРАГДАХГҮЙ; «Үл хөдлөх зарна» /
   *      «Үл хөдлөх түрээслүүлнэ» сонгомогц Л дэд төрлүүд (… зарна /
   *      … түрээслүүлнэ) багана болж гарна ✓
   *   ⚠️ Дүрэм нь `lib/locationData.js → showsSectionSubtypes(section, category)`
   *      ЭХ СУРВАЛЖ (тестээр түгжсэн) — энд хатуу бичсэн логик БАЙХГҮЙ ✓
   *   ⚠️ Бусад 11 хэсэгт категори ОГТ байхгүй (`showCategories === false`) тул
   *      дэд төрлүүд нь ШУУД харагдана (хөндөгдөөгүй ✓); бүлэгтэй 3 хэсэг
   *      (🛠 services · 💻 computers · ⚡ electric) ч мөн адил ✓
   *   ℹ️ «Бүгд» сонгоход ч `category === 'all'` тул дэд төрлүүд дахин ХААГДАЖ,
   *      хэсгийн ЕРӨНХИЙ харагдац руу буцна (байгалийн буцах зам ✓)
   */
  const showSubtypes = showsSectionSubtypes(section, category);
  /** Хэсгийн НИЙТ зарын тоо (дэд төрлүүдийн нийлбэр) — панелийн толгойд */
  const sectionTotal = useMemo(
    () => Object.values(typeCounts).reduce((sum, n) => sum + (Number(n) || 0), 0),
    [typeCounts]
  );

  /**
   * 🏷 ПАНЕЛИЙН ГАРЧИГ (2026-10-07) — категори сонгосон бол ТҮҮНИЙ нэр
   *    (ж: «Үл хөдлөх зарна»), эс бөгөөс хэсгийн нэр (ж: «Үл хөдлөх»).
   *    ⚠️ unegui.mn шиг: «Үл хөдлөх зарна» руу ороход толгой нь цор ганц
   *    тэр нэрээр гарч, категори сонголт (зарна/түрээслүүлнэ) ХАРАГДАХГҮЙ ✓
   */
  const panelTitle = categoryChoices.find((c) => c.value === category)?.label || sec.label;
  /** 🧭 Нүүр хуудсны breadcrumb (2026-10-07, хэрэглэгчийн хүсэлт: «home page
   *  ээс Бүх зар гэсэн текстийг үгүй хий»). ⚠️ ЗӨВХӨН нэг crumb буюу үндсэн
   *  «Бүх зар» дэлгэц дээр breadcrumb ХАРАГДАХГҮЙ (`length > 1` шалгалт доор) —
   *  хэсэг/категори/дэд төрөл сонгомогц (2+ crumb) ХЭВЭЭР харагдана ✓
   *  ℹ️ Тооцоо нь хямд тул `useMemo`-гүй (өмнөх `buildHomeBreadcrumb` JSX дотор
   *     render бүрд ажилладаг байв). */
  const homeCrumbs = buildHomeBreadcrumb({
    category,
    section,
    propertyType: filters.propertyType,
    rooms: filters.rooms,
    districts: filters.districts,
    /* 🎯 FOCUS (2026-09-30) — «Notebook» гэх мэт `collapsed` бүлэг
       НЭЭЛТТЭЙ бол хэсгийн crumb нь линк болно (`linkLast`) ✓ */
    focus: !!focusedGroup,
  });

  // 🔖 «Хайлтыг хадгалах» товчны төлөв (2026-10-06, unegui.mn шиг):
  //    • `currentSearchSaved` — одоогийн хайлт аль хэдийн хадгалагдсан эсэх
  //    • `canSaveCurrentSearch` — хадгалах УТГА байгаа эсэх (зөвхөн `page`/
  //      `view`/`sort` бол «Бүх зар» тул хадгалах утгагүй ✗ → товч идэвхгүй)
  const currentSearchSaved = !!currentUrl && savedSearches.isSaved(currentUrl);
  const canSaveCurrentSearch = !!currentUrl && isSaveableSearch(currentUrl);

  /** 🔖 Одоогийн хайлтыг хадгалах — давхардвал сануулна (алдаа БИШ → 'info') */
  const onSaveSearch = async () => {
    const res = await savedSearches.save(currentUrl);
    if (res.ok) showToast('🔖 Хайлт хадгалагдлаа — «Таалагдсан хайлтууд»-аас харна уу');
    else if (res.reason === 'duplicate') showToast('Энэ хайлт аль хэдийн хадгалагдсан байна', 'info');
    else showToast('Хадгалах хайлт алга — эхлээд шүүлт эсвэл хайлтын үг тавина уу', 'error');
  };

  const hasFilters =
    Object.entries(filters).some(([, v]) => !isFilterValueEmpty(v)) ||
    category !== 'all' ||
    section !== 'all' ||
    query;

  /** Идэвхтэй хайлтууд — статус мөрийн доор «чип» хэлбэрээр (✕ дарж тус тусад нь арилгана) */
  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.propertyType) {
      // 🗑 2026-10-04 (39): чипийн өмнөх 🏠/🚗 дүрс ХАСАГДАВ (emoji-гүй болгох
      //    хүсэлт) ⇒ зөвхөн төрлийн нэр («Орон сууц зарна») харагдана ✓
      chips.push({ key: 'propertyType', label: getPropertyTypeLabel(filters.propertyType, category) });
    }
    // ⚠️ 📅 ОНЫ ХҮРЭЭ (2026-09-28) нь ХОЁР түлхүүрээр (`year_from`/`year_to`)
    //    хадгалагддаг тул НЭГ чип болгож нэгтгэнэ — эс бөгөөс «📅 2015» +
    //    «📅 2020» гэсэн ойлгомжгүй ХОЁР чип гарна ✗
    const rangeBases = new Set();
    Object.keys(filters.attrs || {}).forEach((k) => {
      const r = parseAttrRangeKey(k);
      if (!r) return;
      const base = getAttrField(section, r.base);
      if (base && base.range) rangeBases.add(r.base);
    });
    rangeBases.forEach((base) => {
      const keys = getAttrRangeKeys(base);
      const from = (filters.attrs || {})[keys.from] || '';
      const to = (filters.attrs || {})[keys.to] || '';
      if (!from && !to) return;
      const rangeLabel = from && to
        ? `${from} — ${to}`
        : from ? `${from} оноос` : `${to} он хүртэл`;
      // 🗑 2026-10-04 (39): чипийн өмнөх 📅 дүрс ХАСАГДАВ ✓
      chips.push({ key: `attrRange_${base}`, label: rangeLabel });
    });
    // ⚠️ ATTR шүүлтүүд (0016) — ж: «Toyota», «Хайбрид», «Prius» (emoji-гүй ✓)
    Object.entries(filters.attrs || {}).forEach(([k, v]) => {
      if (!v) return;
      // Хүрээний түлхүүр (`*_from` / `*_to`) нь ДЭЭР нэг чип болсон → алгасна
      const r = parseAttrRangeKey(k);
      if (r && rangeBases.has(r.base)) return;
      const field = getAttrField(section, k);
      // 🎨 ОЛОН СОНГОЛТТОЙ ATTR (2026-10-03 (19); ✅ «Шинэ / Шинэвтэр / Хуучин»
      //    ч мөн адил — (21)) — утга нь МАССИВ бол
      //    утгуудыг ТОВЧЛОНО (1 сонголт → нэрээр, 2+ → «3 өнгө» / «2 төлөв») — эс бөгөөс
      //    «🎨 Цагаан, Сувдан цагаан, Хар, Саарал» гэсэн чип хэт урт болно ✗
      //    (шошго нь `lib/attrMultiFilter.mjs` — нэг эх сурвалж ✓)
      if (Array.isArray(v)) {
        if (!v.length) return;
        chips.push({
          key: `attr_${k}`,
          label: attrListFilterLabel(v, (field && field.multiNoun) || 'сонголт'),
        });
        return;
      }
      chips.push({ key: `attr_${k}`, label: `${v}` });
    });
    // 🗑 2026-10-04 (39): доорх БҮХ идэвхтэй чип нь emoji-гүй болов
    //    (хэрэглэгчийн хүсэлт: «…бүх үгний өмнө байгаа emoji-г байхгүй болго») ✓
    // ӨРӨӨ — ОЛОН СОНГОЛТ (2026-09-30): чип нь сонгосон БҮХ утгыг харуулна
    //    (`1, 2 өрөө` / `+5 өрөө` / `1, 5+ өрөө`) — хэдэн шүүлт тавснаа
    //    чип дээрээс шууд харна ✓. ⚠️ Шошго нь `lib/roomFilter.mjs` (нэг эх сурвалж)
    if (filters.rooms.length) chips.push({ key: 'rooms', label: roomsFilterLabel(filters.rooms) });
    // 💳 Төлбөрийн нөхцөл (2026-10-03) — сонгосон нөхцөлүүдийг БҮТНЭЭР
    //    харуулна («Хувь лизингээр, Бэлэн төлөлтөөр») — чип дээрээс шууд харна ✓
    if (filters.payments.length) chips.push({ key: 'payments', label: paymentsFilterLabel(filters.payments) });
    if (filters.city) chips.push({ key: 'city', label: filters.city });
    // 🗺 ДҮҮРЭГ / СУМ — ОЛОН СОНГОЛТ (2026-10-03): 1 сонголт → нэрээр,
    //    олон → «N дүүрэг» (шошго нь `lib/districtFilter.mjs` — нэг эх
    //    сурвалж; нэрсийг бүтнээр жагсаавал чип хэт урт болно ✗)
    if (filters.districts.length) chips.push({ key: 'districts', label: districtsFilterLabel(filters.districts) });
    // ⚠️ Хороо: 1 сонгосон бол нэрийг, олон бол «N хороо» гэж товчлон харуулна
    if (filters.khoroos.length) {
      chips.push({
        key: 'khoroos',
        label: filters.khoroos.length === 1 ? `${filters.khoroos[0]}` : `${filters.khoroos.length} хороо`,
      });
    }
    if (filters.minPrice) chips.push({ key: 'minPrice', label: `₮${formatPrice(filters.minPrice)}-с дээш` });
    if (filters.maxPrice) chips.push({ key: 'maxPrice', label: `₮${formatPrice(filters.maxPrice)} хүртэл` });
    // 📐 Талбай нь бутархай байж болно («75,5») — chip дээр ч цэгээр бүлэглэж,
    //    бутархайг «,»-ээр харуулна (URL-д «1234.5» хэлбэрээр хадгалагдана ✓
    //    — `lib/queries.js → toNumber` тэр хэлбэрийг зөв уншина)
    if (filters.minArea) chips.push({ key: 'minArea', label: `${formatGroupedInput(filters.minArea, { mode: 'decimal' })} м²-с дээш` });
    if (filters.maxArea) chips.push({ key: 'maxArea', label: `${formatGroupedInput(filters.maxArea, { mode: 'decimal' })} м² хүртэл` });
    // 🏢📅 Орон сууцны нэмэлт хүрээ (2026-10-04) — чип нь талбарын НЭР-ийг
    //    хамт харуулна (гурвуулаа тоо тул «3+» гэвэл аль нь болох нь
    //    ойлгомжгүй болно ✗ — `SideBlock` гарчигтай ЯГ ижил үг ✓)
    if (filters.minTotalFloors) chips.push({ key: 'minTotalFloors', label: `Барилгын давхар ${filters.minTotalFloors}+` });
    if (filters.maxTotalFloors) chips.push({ key: 'maxTotalFloors', label: `Барилгын давхар ${filters.maxTotalFloors} хүртэл` });
    if (filters.minFloor) chips.push({ key: 'minFloor', label: `Хэдэн давхарт ${filters.minFloor}+` });
    if (filters.maxFloor) chips.push({ key: 'maxFloor', label: `Хэдэн давхарт ${filters.maxFloor} хүртэл` });
    if (filters.minBuildYear) chips.push({ key: 'minBuildYear', label: `Ашиглалтанд орсон он ${filters.minBuildYear}+` });
    if (filters.maxBuildYear) chips.push({ key: 'maxBuildYear', label: `Ашиглалтанд орсон он ${filters.maxBuildYear} хүртэл` });
    return chips;
  }, [filters, category, section]);

  const activeFilterCount = activeFilterChips.length;

  /** Нэг чипийг арилгах (`khoroos`/`rooms` нь массив; `attr_*` нь jsonb түлхүүр;
   *  📅 `attrRange_*` нь оны хүрээний ХОЁР түлхүүрийг хамт арилгана)
   *  ⚠️ `rooms` (2026-09-30) — ОЛОН СОНГОЛТТОЙ болсон тул хоослох утга нь
   *     `''` БИШ `[]` (эс бөгөөс `filters.rooms.length` унана ✗) */
  const removeFilterChip = (key) => {
    if (key.startsWith('attrRange_')) {
      const keys = getAttrRangeKeys(key.slice('attrRange_'.length));
      setPage(1);
      setFilters((f) => {
        const attrs = { ...(f.attrs || {}) };
        delete attrs[keys.from];
        delete attrs[keys.to];
        return { ...f, attrs };
      });
      return;
    }
    if (key.startsWith('attr_')) {
      // 🎨 Олон сонголттой attr (`multi: true`) — хоослох утга нь `''` БИШ `[]`
      //    (`setAttr` нь `[]`-г «устгах» гэж ойлгоно ✓ — 2026-10-03 (19))
      const cur = (filters.attrs || {})[key.slice(5)];
      setAttr(key.slice(5), Array.isArray(cur) ? [] : '');
      return;
    }
    setF(key, key === 'khoroos' || key === 'districts' || key === 'rooms' || key === 'payments' ? [] : '');
  };

  // ---- ⚙️ «Дэлгэрэнгүй хайлт» панель — МОБАЙЛ дээр АВТОМАТААР НЭЭГДЭХГҮЙ ----
  // ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): «Гар утаснаас орохд орон сууц
  //    сонгосны дараа яг доот талд нь өрөөний тоо, тэгээд дэлгэрэнгүй хайлт
  //    байвал зүгээр санагдаад байна».
  //
  // 🔴 АСУУДАЛ ① (хуучин код): `useEffect([filters.propertyType])` нь төрөл
  //    сонгомогц `setFiltersOpen(true)` хийж, панель МОБАЙЛ дээрх ДЭЛГЭЦИЙГ
  //    БҮХЭЛД НЬ эзэлдэг байв ✗ → яг доор байх ёстой «өрөөний тоотой мөр»
  //    БА «⚙️ Дэлгэрэнгүй хайлт» товч харагдахгүй, доогуур түлхэгдэж байв ✗
  //
  // ✅ ШИЙДЭЛ ①: авто-нээлтийг БҮРЭН ХАСАВ ✓ (товч нь өрөөний мөрийн
  //    ЯГ ДООР байрлаж, хэрэглэгч өөрөө дарж нээдэг болов).
  //
  // 🔴 АСУУДАЛ ② (2026-09-27, дараагийн хүсэлт): «Дэлгэрэнгүй хайлтыг
  //    үргэлж нээлттэй болгоё доо» → товч дарах шаардлага хэт их санагдсан ✗
  //
  // ✅ ШИЙДЭЛ ② (ОДООГИЙН): `filtersOpen` ТӨЛӨВ БА «⚙️ Дэлгэрэнгүй хайлт»
  //    ТОВЧ ХОЁУЛАА ХАСАГДСАН ✓ → панель МОБАЙЛ ДЭЭР Ч ҮРГЭЛЖ ХАРАГДАНА ✓
  //    (desktop-той ЯГ ИЖИЛ зан төлөв — progressive disclosure нь зөвхөн
  //    «төрөл сонгосон эсэх»-ээр л тодорхойлогдоно ✓)
  //
  // 📱 МОБАЙЛ ДЭЭРХ УРСГАЛ (одоо):
  //      [төрөл сонгосон] →
  //      [Дэлгэрэнгүй хайлт панель — БҮРЭН НЭЭЛТТЭЙ ✓] →
  //      [гарчиг + өрөөний тоо] → [чипүүд] → [картууд]
  // ⚠️ `<aside>` нь DOM-д результатовын ӨМНӨ байрладаг тул мобайлд шүүлт
  //    ЭХЭНД гарна ✓ (хэрэглэгч эхлээд шүүлтээ тавиад доош гүйлгэнэ ✓)
  // 🖥 DESKTOP дээр өөрчлөлт БАЙХГҮЙ ✓ (тэнд панель байнга нээлттэй байв)
  // ↺ БУЦААХ БОЛ: `filtersOpen` төлөв + `${filtersOpen ? '' : 'hidden'}`
  //    класс + «⚙️ Дэлгэрэнгүй хайлт» товчийг буцааж нэмнэ.

  /**
   * 💰 ҮНЭ / 💼 ЦАЛИН — sidebar-ийн үнийн блок (НЭГ ЭХ СУРВАЛЖ).
   * ⚠️ 2026-10-03 (9): ажлын зарт шошго нь «Цалин, ₮» / «Цалин» болно
   *    (`priceWord(section)`); мөн энэ блок нь ажлын зарт «Байршил»-ийн
   *    ЯГ ДАРАА (attr шүүлтүүдийн ӨМНӨ) байрлана — unegui.mn-ийн ажлын
   *    хайлтын зурагтай ИЖИЛ дараалал ✓; бусад хэсэгт ХУУЧИН байрлал ✓
   * ⚠️ DOM дэгээ (`data-range-filter`) нь label-аас үүснэ — ажлын зарт
   *    «Цалин», бусад хэсэгт «Үнэ» (`scripts/cdp-range.mjs` нь үл хөдлөх
   *    дээр ажилладаг тул хөндөгдөхгүй ✓)
   */
  const priceSideBlock = (
    <SideBlock label={`${priceWord(section)}, ₮`}>
      <RangeInput
        label={priceWord(section)}
        unit="₮"
        mode="int"
        bounds={priceLimit}
        short={shortPrice}
        from={filters.minPrice}
        to={filters.maxPrice}
        onChange={(a, b) => { setF('minPrice', a); setF('maxPrice', b); }}
      />
    </SideBlock>
  );

  /** 📍 Байршлын шошго (товч дээр) — «Бүх байршил» / «Улаанбаатар» /
   *  «Улаанбаатар, 2 дүүрэг» / «Улаанбаатар, 3 хороо» (2026-10-04 (27)) */
  const locationLabel = useMemo(() => {
    if (!filters.city) return 'Бүх байршил';
    if (filters.khoroos.length) return `${filters.city}, ${filters.khoroos.length} хороо`;
    if (filters.districts.length) return `${filters.city}, ${filters.districts.length} дүүрэг`;
    return filters.city;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.city, filters.districts.length, filters.khoroos.length]);

  /**
   * 🏷️🚙 МАШИНЫ шошго (товч дээр) — 2026-10-04 (35), ОЛОН ЗАГВАР (36)
   *   • юу ч сонгоогоогүй → «Бүх үйлдвэрлэгч, загвар»
   *   • брэнд л сонгосон → «Toyota»
   *   • брэнд + 1 загвар  → «Toyota Prius 30»        ← ХУУЧИНТАЙ ЯГ ижил
   *   • брэнд + 2+ загвар → «Toyota 2 загвар»        ← олон сонголт (товчилно)
   *
   * ⚠️ `filters.attrs.brand` нь СКАЛЯР (нэг утга — каскадын эцэг), харин
   *    `attrs.model` нь МАССИВ (2026-10-04 (36) — хэрэглэгчийн хүсэлт
   *    «машины загвараас олоныг сонгох боломжтой болго») ⇒ `attrArray()`
   * ⚠️ Олон загварын шошго нь 📍 «Улаанбаатар, 2 дүүрэг»-ийн ИЖИЛ зарчим —
   *    нэрсийг бүтнээр жагсаавал товч хэт урт болно ✗ (`attrListFilterLabel`)
   */
  const carBrand = attrValue('brand');
  const carModels = attrArray('model');
  const carLabel = carBrand
    ? (carModels.length ? `${carBrand} ${attrListFilterLabel(carModels, 'загвар')}` : carBrand)
    : 'Бүх үйлдвэрлэгч, загвар';

  /** 🖥🔍 Хайлтын мөрийг угсарна — толгойн мөр (`header`) БА мобайл (`mobile`)
   *  ХОЁУЛАА энэ НЭГ эх сурвалжийг ашиглана (давхардсан логик БАЙХГҮЙ ✓) */
  // 🔎 Санал дарахад (`onPickSuggestion`) — утга нь `setSearch`-ээр хайрцагт
  //    орж, ШУУД хайгдана. ⚠️ `onSubmit`-ийн closure нь ХУУЧИН `search`-ыг
  //    уншдаг тул саналын утгыг ТУСДАА дамжуулна (setState async — stale
  //    утгаас сэргийлнэ ✓)
  const renderSearchBar = (variant) => (
    <HeaderSearchBar
      variant={variant}
      search={search}
      total={total}
      locationLabel={locationLabel}
      hasLocation={Boolean(filters.city)}
      onSearchChange={setSearch}
      onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search); }}
      onPickSuggestion={(value) => { setSearch(value); setPage(1); setQuery(value); }}
      onOpenLocation={() => setLocOpen(true)}
    />
  );

  /** ⚠️ deps нь ЗӨВХӨН энгийн утгууд — ФУНКЦИЙГ (ж: `renderSearchBar`)
   *  deps-д оруулбал render БҮРТ шинэ болж `setHeaderSlot` ↔ re-render LOOP
   *  үүснэ ✗ (функцүүд дотроо зөвхөн эдгээр утга + тогтвортой setState-үүдийг
   *  ашигладаг тул хуучин closure ч ЗӨВ ажиллана ✓)
   *  🗑 2026-10-07: `section` deps-ээс ХАСАГДАВ — хайлтын мөр «Ангилал» pill-гүй
   *  болсон тул `section`-д хамааралгүй ✓ */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const homeSearchBar = useMemo(() => renderSearchBar('header'),
    [search, total, locationLabel, filters.city]);

  // 🖥 Хайлтын мөрийг header-ийн ГОЛ хэсэгт оруулна (AppProviders-ийн завсар)
  useEffect(() => {
    if (setHeaderSlot) setHeaderSlot(homeSearchBar);
  }, [setHeaderSlot, homeSearchBar]);
  // 🧹 Цэвэрлэгээ — зөвхөн unmount дээр (бусад хуудас руу шилжихэд завсар хоосорно ✓)
  useEffect(() => () => { if (setHeaderSlot) setHeaderSlot(null); }, [setHeaderSlot]);

  /** 📍 Пикерээс ирсэн байршлыг `filters` руу хэрэглэнэ (2026-10-04 (27)) —
   *  утга нь пикер дээр бүтэн (каск ад) сонгогдсон тул энд зөвхөн тавина ✓ */
  const applyLocation = ({ city, districts, khoroos }) => {
    setPage(1); // 📄 байршил солигдсон → 1-р хуудас
    setFilters((f) => ({ ...f, city, districts, khoroos }));
  };

  /**
   * 🏷️🚙 Пикерээс ирсэн машиныг `filters.attrs` руу ХЭРЭГЛЭНЭ (2026-10-04 (35))
   * — брэнд ба загварыг НЭГ ДОР (нэг `setFilters`) бичнэ.
   *
   * ⚠️ `setAttr`-ыг 2 удаа дуудаж БОЛОХГҮЙ: эхний дуудлага нь `cascadeAttrs`-аар
   *    загварыг ЦЭВЭРЛЭЭД, дараагийнх нь дахин тавина — ажиллах ч төвөгтэй,
   *    илүү чухал нь «хэрэглэх» нь АТОМ үйлдэл байх ёстой (нэг render ✓)
   * ⚠️ Хоосон утгыг `delete` хийнэ — эс бөгөөс `?attr_brand=` гэсэн ХООСОН
   *    түлхүүр URL-д үлдэж, `lib/queries.js` бүх зарыг хааж эвдэнэ ✗
   */
  const applyCar = ({ brand, model }) => {
    setPage(1); // 📄 шүүлт солигдсон → 1-р хуудас
    setFilters((f) => {
      const attrs = { ...(f.attrs || {}) };
      // 🚙🌂 ОЛОН ЗАГВАР (2026-10-04 (36)): `model` нь МАССИВ — цэвэрлэж,
      //    давхардлыг арилгана (`parseAttrList`). ⚠️ `[]` нь ХҮЧИНТЭЙ
      //    (truthy) тул энгийн `if (model)` нь `attrs.model = []` гэсэн
      //    ХООСОН массив үлдээх байв ✗ → уртаар шалгана ✓
      const models = parseAttrList(model);
      if (brand) attrs.brand = brand; else delete attrs.brand;
      if (models.length) attrs.model = models; else delete attrs.model;
      return { ...f, attrs };
    });
  };

  return (
    <>
      {/* 🖥🔍 ХАЙЛТЫН МӨР — ТОЛГОЙН мөрөнд (2026-10-04 (27)).
          ⚠️ HERO-ийн ЗУРАГТАЙ дэвсгэр ХАСАГДАВ (хэрэглэгчийн хүсэлт: «хайлт
             хэсгийн вэб дээд хэсэгт болгож өөрчил», жишээ зурагтай) — хайлтын
             мөр нь `AppProviders`-ийн header-ийн ГОЛ хэсэгт (лого ба баруун
             товчнуудын ДУНД) шилжив ✓ (`useHeaderSlot()` → `homeSearchBar`).
          ⚠️ Хуудасны ГОЛ `<h1>` — панель харагдах үед түүний толгой
             («Үл хөдлөх зарна 19»), эс бөгөөс үр дүнгийн толгой
             («Бүх зар · N»). Хоёул НЭГ л удаа (давхардахгүй) ✓
          📱 `xl`-ээс доош — доорх наалдамхай (`sticky top-16`) мөрөнд; `xl`+ дээр
             мөр нь толгойд гардаг тул энэ нь `xl:hidden` ✓ */}

      {/* 📱 ХАЙЛТЫН МӨР — толгойн (h-16) ЯГ ДООР наалдана (≥lg, <xl ба мобайл) */}
      <div className="sticky top-16 z-30 border-b border-gray-200 bg-white px-4 py-2.5 xl:hidden">
        {renderSearchBar('mobile')}
      </div>

      {/* 📍 БАЙРШЛЫН ПИКЕР (modal) — «📍 Бүх байршил» товч дарахад нээгдэнэ;
          «Байршлыг хэрэглэх» дарахад л `applyLocation` → `filters` шинэчлэгдэнэ ✓ */}
      <LocationPicker
        open={locOpen}
        onClose={() => setLocOpen(false)}
        city={filters.city}
        districts={filters.districts}
        khoroos={filters.khoroos}
        onApply={applyLocation}
      />

      {/* 🏷️🚙 МАШИНЫ ПИКЕР (modal) — «Үйлдвэрлэгч, загвар» товч дарахад
          нээгдэнэ (`?section=auto` дээр); «Машиныг хэрэглэх» дарахад л
          `applyCar` → `filters.attrs.brand/model` шинэчлэгдэнэ ✓
          ⚠️ `models` нь МАССИВ (олон загвар — 2026-10-04 (36)) ✓ */}
      <CarPicker
        open={carOpen}
        onClose={() => setCarOpen(false)}
        brand={carBrand}
        models={carModels}
        onApply={applyCar}
      />

      {/* 🖼 HERO-ийн зурагтай дэвсгэр ба хайлтын карт 2026-10-04 (27)-д ХАСАГДАВ —
          хайлтын мөр нь толгойн мөрөнд (`useHeaderSlot` → `homeSearchBar`)
          болон мобайлд дээрх `sticky top-16` мөрөнд шилжив ✓ */}

      <div className="page-container">
        {/* BREADCRUMB — хэрэглэгч хаана явж байгаа (unegui.mn загвар).
            ⚠️ Хайлт ХИЙГЭЭГҮЙ ч гэсэн харагдана («Бүх зар › Үл хөдлөх») —
               байр суурь нь байнга мэдэгдэж байх ёстой.
            🅑 ФОНТЫН ЖИН (2026-09-27, хэрэглэгчийн хүсэлт: «home page дээр байгаа
               бүх зар гэсэн үгийг bold болгох»): сүүлийн crumb нь нүүрэн дээр
               ганцаараа үлдэхдээ «Бүх зар» болдог → `lastClassName`-аар
               **`font-bold` (700)** дамжуулав (өмнө нь `font-semibold` 600).
               ⚠️ ЗӨВХӨН ЭНЭ ХУУДАС — `lastClassName` нь `Breadcrumb`-ийн
               default-ыг (semibold) хөндөхгүй тул зарын дэлгэрэнгүй
               (`ListingDetailClient`) ба нийтлэгчийн зарууд (`SellerListingsClient`)
               дээр сүүлийн crumb (зарын гарчиг / нэр) ХУУЧИН хэвээрээ ✓
            🔵 ЛИНК ЦЭНХЭР + BOLD (2026-09-27, хэрэглэгчийн хүсэлт: «“Бүх зар”-аас
               “Автомашин” гэх мэт сонгоход “Бүх зар” гэсэн хэсгийг цэнхэр болсон
               bold байгаасай»): хэсэг сонгомогц «Бүх зар» нь линк (буцах зам)
               болдог → `linkClassName="font-bold text-primary hover:underline"`.
               ⚠️ Линк нь өмнө нь цэнхэр (#2563eb) ч жин **400** (нимгэн) байв →
               одоо **700**; ингэснээр «Бүх зар» (линк) ба «Автомашин» (сүүлийн
               crumb, мөн 700) ижил жинтэй, зөвхөн өнгөөр ялгагдана (цэнхэр =
               дарж болно, саарал = одоогийн байрлал) ✓
               ⚠️ Мөн ЗӨВХӨН ЭНЭ ХУУДАС (бусад 2 хуудсанд линк хуучнаараа ✓) */}
        {/* ⚠️ 2026-10-07: breadcrumb нь ЗӨВХӨН 2+ crumb үед харагдана —
            үндсэн «Бүх зар» (ганц crumb) дэлгэц дээр давхардсан текст
            үүсгэхгүйн тулд НУУГДАВ (хэрэглэгчийн хүсэлт). */}
        {homeCrumbs.length > 1 && (
          <Breadcrumb
            items={homeCrumbs}
            onNavigate={goToCrumb}
            lastClassName="font-bold text-gray-700"
            linkClassName="font-bold text-primary hover:underline"
          />
        )}

        {/* ⚠️ 2026-09-29: `<RecentlyViewedStrip />` (🕓 «Саяхан үзсэн» картын
            мөр) ХАСАГДАВ — хэрэглэгчийн хүсэлт: нүүр хуудсанд хэрэггүй.
            Хамт хасагдсан: `/recent` хуудас, цэс/footer-ийн холбоос,
            `lib/recentlyViewed*.js` ба `npm run test:recent` ✓ */}

        {/* ===== ХЭСЭГ БА ДЭД ТӨРЛИЙН НАВИГАЦИ (0016) — DRILL-DOWN =====
            ⚠️ ХОЁР ТӨЛӨВ:
              1) `sectionOpen = false` → БҮХ 7 ХЭСЭГ tile хэлбэрээр, БАГАНА болж
                 (2 → 3 → 7, дэлгэцэнд тааруулж).
              2) Хэсэг дээр дарвал → БУСАД ХЭСЭГ БҮРЭН АЛГА БОЛЖ, зөвхөн
                 ТУХАЙН ХЭСГИЙН ДОТООД (дэд төрөл) багана болж харагдана.
                 🗑 2026-09-29: буцах чип БАЙХГҮЙ (хэрэглэгчийн хүсэлт) —
                 буцах нь breadcrumb-ийн «Бүх зар» (эсвэл панелийн гарчиг
                 дээр дараад 7 tile).
            ⚠️ Дэд төрөл сонгомогц ЭНЭ ПАНЕЛЬ БҮРЭН АЛГА БОЛНО (progressive
               disclosure — хэрэглэгчийн өмнөх хүсэлт). Буцах зам нь breadcrumb.
            ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөх хэсэгт.
            🆕 2026-10-04 (хэрэглэгчийн хүсэлт): 🏠 үл хөдлөхөд ② ба ③-ын хооронд
               НЭГ АЛХАМ нэмэгдэв — хэсэг рүү ороход ЗӨВХӨН категори («Үл хөдлөх
               зарна / …түрээслүүлнэ / Бүгд») харагдана; категори сонгомогц л
               дэд төрлүүд (Орон сууц зарна, Газар зарна …) гарна ✓
               (`showSubtypes`) — ⚠️ бусад 11 хэсэгт категори байхгүй тул
               дэд төрлүүд нь ШУУД харагдана (хөндөгдөөгүй ✓)
            ⚠️ `tile-grid` = багана хоорондын зай (app/globals.css → `.tile-grid`)
            ⚠️ EMOJI ICON: `leading-none` БИЧИХГҮЙ (мөрийн хайрцгаас ХАЛЬЖ
               гардаг) → `leading-[1.4]` хэрэглэнэ. */}
        {!filters.propertyType && (
        <section
          /* 🐍 CDP ДЭГЭЭ (2026-10-04): хэсгийн панел — `npm run cdp:sections` нь
             энэ доторх `[data-category-value]` ба `button[role="tab"]`
             (дэд төрөл)-ийг тоолж, 2 алхамт drill-ыг шалгана ✓ */
          data-section-panel
          /* ✏️ 2026-10-07 (хэрэглэгчийн хүсэлт) — ДЭВСГЭР (background) БҮРЭН
             АРИЛАВ: «background өнгийг байхгүй болгоод маш minimal харуул».
             • State 2 (нээлттэй) — `bg-gray-100` саарал дугуй панел ✗
             • State 1 (12 tile)  — `bg-white` цагаан хайрцаг ✗
             Хоёулаа `bg-gray-50` хуудас дээр ХАЙРЦАГ мэт харагдаж байв →
             ОДОО дэвсгэр/padding/хүрээ БАЙХГҮЙ (unegui.mn шиг агуулга нь
             хуудсан дээр ШУУД) ✓ */
          className="mb-5"
        >

        {sectionOpen ? (
          <>
            {/* ══════════ unegui.mn ЗАГВАР — SubcategoryPanel ══════════
                ⚠️ БҮТЭЦ (unegui-ийн DOM-той ижил):
                   • ТОЛГОЙ: X (хэсгийн НЭР)  N  — буцах чип БАЙХГҮЙ ✓
                   • SEPARATOR (1px зураас)
                   • БАГАНУУД: `columns-*` — CSS multi-column нь дээшээс
                     доош дүүргэж, дараа нь ДАРААГИЙН багана руу шилжинэ
                ⚠️ Линк бүр нь: ЗӨВХӨН текст (chevron › 2026-09-30-нд ХАСАГДАВ),
                   hover-т bg-white
                🔧 Баганын тоо: доорх `columns-1 sm:columns-2 lg:columns-4` */}

            {/* ---------- ТОЛГОЙ: ХЭСГИЙН НЭР + ТОО ----------
                🆕 ТЕКСТ 2026-09-29 (хэрэглэгчийн хүсэлт: «Бүх бүлэг, Бүх хэсэг
                   гэсэн буцах товчийг байхгүй болго. “Компьютер, Дагалдах
                   хэрэгсэл” категорийн бүх зарууд зүгээр л Компьютер, Дагалдах
                   хэрэгсэл гэж нэрээр нь харуул, мөн бусад категорууд ч адилхан
                   үүн шиг байхаар болго»):
                   • Урьд: «{sec.label}» категорийн бүх зарууд  + [← Бүх хэсэг]
                   • Одоо: ЗӨВХӨН `{sec.label}` + зарын тоо — үр дүнгийн `h1`-ийн
                     бичиглэлтэй ЯГ ИЖИЛ (ж: «Компьютер, Дагалдах хэрэгсэл 450») ✓
                     ⚠️ Бүх хэсэгт НЭГ дүрэм — нэр нь `getSection()`-оос ирдэг
                     (хатуу бичсэн нэр БАЙХГҮЙ ✓: 💻 🚗 🛠 🏠 … бүгд адил)
                   🗑 [← Бүх хэсэг] чип ХАСАГДАВ (`backToAllSections()` хамт) —
                     тэр нь ДАВХАР буцах зам байсан: breadcrumb-ийн «Бүх зар» линк
                     (`nav: { reset: true }` → `resetAll()`) яг тэр үйлдлийг хийнэ ✓
                   ⚠️ ТОВЧНЫ ҮЙЛДЭЛ ХЭВЭЭР (`setSectionOpen(false)`) — дарвал панель
                     хаагдаж 7 ХЭСГИЙН tile дэлгэц гарна ✓ (хэрэглэгчийн сонголт:
                     «одоогийн ажиллагаа хэвээр, зөвхөн текст солигдоно»)
                🔤 ФОНТ (2026-09-27, хэрэглэгчийн хүсэлт: «фонтыг жаахан нэм»;
                   🆕 2026-10-04 (24): «Хайлт ба Зар НЭГДМЭЛ харагдац» — +1px):
                   толгойн товч `text-[13px]` → **`text-[15px] sm:text-[16px]`**
                   (⚠️ мобайлд урт мөр 2 болж болзошгүй тул `flex-wrap` хэвээр ✓);
                   тоолуур `text-[12px]` → **`text-[14px]`**
                   ℹ️ Шинэ текст БОГИНО (хашилт ба «категорийн бүх зарууд» арилсан,
                   тоо хэвээр) тул 390px дээр ч 1 мөрөнд багтана ✓
                🎨 КОНТРАСТ (панелийн дэвсгэр `bg-gray-100` #F4F1EA — CDP-ээр
                   бодит хэмжилт): толгой `text-primary` #2563eb → **4.58:1 ✅ AA**
                   (15–16px bold нь «том текст» (≥18.66px bold) БИШ тул 4.5:1
                   шаардлага хүчинтэй — 4.58 нь АРАЙ л багтаж байна ⚠️);
                   тоолуур `text-gray-600` #5D5747 → **6.38:1 ✅ AA**.
                ⚠️ ХАМТ ЗАССАН алдаа: тоолуур нь `text-gray-500` (#776F5E) байсан
                   → gray-100 дэвсгэр дээр **4.41:1** буюу AA-д ХҮРЭХГҮЙ байв ✗
                   → **`text-gray-600`** (#5D5747) болгов → **6.38:1 ✅ AA**.
                ⚠️ Текст урт бол `flex-wrap` + `justify-center` тул 2 мөр болж ЗӨВ
                   ХУВААГДАНА (товчны өндөр өснө) ✓ — одоо зөвхөн нэр + тоо тул ийм
                   тохиолдол бараг гарахгүй ✓
                🔧 ФОНТ/жинг өөрчлөх: доорх `<button>`-ийн класс
                   (`text-[15px] sm:text-[16px]`); тоо нь түүний доторх `<span>`.
                ⚠️ «Бүх зар» гэсэн BREADCRUMB нь ЭНЭ ФАЙЛД БИШ — `components/
                   Breadcrumb.jsx` (мөр 32, `text-[15px]`) ✓ */}
            {/* ---------- ТОЛГОЙ: ХЭСГИЙН НЭР + ТОО (unegui.mn шиг) ----------
                ✏️ 2026-10-07 (хэрэглэгчийн хүсэлт: «category-д орсны дараа
                   хаана байгаагаа мэдэгдэхгүй байна, зүүн тийшээ томорсон
                   байгаа»): ТӨВД байсан МАЛУУ ЦЭНХЭР товч → ОДОО **ЗҮҮН тийш
                   ТОМ BOLD хар гарчиг + саарал тоо** (үр дүнгийн `<h1>`-тэй
                   ЯГ ИЖИЛ хэмжээ/өнгө) — unegui.mn ангиллын хуудас шиг,
                   «хаана байгаа нь» нэг харцаар мэдэгдэнэ ✓
                🗑 SEPARATOR (1px зураас) ХАСАГДАВ (unegui.mn-д байхгүй) ✓
                ⚠️ Товчны ҮЙЛДЭЛ ХЭВЭЭР (`setSectionOpen(false)`) — нэрэн дээр
                   дарахад панель хаагдаж 12 ХЭСГИЙН tile дэлгэц гарна ✓ */}
            {/* 🏷 ГОЛ `<h1>` — хуудасны цор ганц гарчиг (үр дүнгийн `h1` нь
                2026-10-07-д БҮРЭН ХАСАГДАВ тул давхардал ҮҮСЭХГҮЙ ✓) */}
            <h1 className="mb-3">
              <button
                type="button"
                onClick={() => setSectionOpen(false)}
                title="Энэ хэсгийн БҮХ зарыг харах"
                className="text-left text-2xl font-bold text-gray-900 transition hover:text-primary sm:text-[26px]"
              >
                {panelTitle}
                {sectionTotal > 0 && (
                  <span className="ml-2 align-middle text-[17px] font-normal text-gray-500">{formatCount(sectionTotal)}</span>
                )}
              </button>
            </h1>

            {/* ---------- КАТЕГОРИ (зөвхөн үл хөдлөх) ----------
                🆕 2026-10-04 (хэрэглэгчийн хүсэлт): «Үл хөдлөх зарна» /
                   «Үл хөдлөх түрээслүүлнэ» — БҮТЭН шошготой `segmented`
                   контроль (unegui.mn-ийн мобайл «Зарна / Түрээслүүлнэ» хэв).
                   ⚠️ «Бүгд» нь ХАМГИЙН СҮҮЛД (3 дахь сонголт) — хэрэглэгчийн
                   сонголт («Бүгд»-ийг хасахгүй).
                📱 <640px: БОГИНО шошго («Зарна»/«Түрээслүүлнэ»/«Бүгд»);
                   🖥 ≥640px: БҮТЭН шошго — эс бөгөөс 390px дээр 3 урт
                   шошго нэг мөрөнд багтахгүй гүйлгэнэ ✗
                ⚠️ Шошго/дараалал нь `lib/locationData.js →
                   getSectionCategoryChoices` (нэг эх сурвалж) — хатуу
                   бичсэн нэр БАЙХГҮЙ ✓
                ⚠️ `data-category-value` нь CDP тестийн тогтвортой дэгээ ✓ */}
            {/* ✏️ 2026-10-07 — `segmented` (саарал дүүргэлттэй pill, ТӨВД)
                → ЗҮҮН тийш эгнэсэн ХАВТГАЙ текст линк (unegui.mn шиг).
                ⚠️ `data-category-value`/`aria-pressed`/богино-урт шошго
                   (hidden sm:inline / sm:hidden) БҮГД ХЭВЭЭР — CDP ✓ */}
            {/* ⚠️ 2026-10-07 (хэрэглэгчийн хүсэлт: «Үл хөдлөх зарна гээд орсон
                байхад … сонголтоо бүү харуул»): категори СОНГОСОН бол
                (`category !== 'all'`) энэ сонголт ХАРАГДАХГҮЙ — зөвхөн дэд
                төрлүүд ба дээрх категорийн НЭР л үлдэнэ (unegui.mn шиг) ✓ */}
            {showCategories && categoryChoices.length > 0 && category === 'all' && (
              <div className="mb-[30px] flex flex-wrap items-center gap-x-7 gap-y-1.5" role="group" aria-label="Зарах эсвэл түрээслэх">
                {categoryChoices.map((c) => {
                  const active = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-pressed={active}
                      data-category-value={c.value}
                      onClick={() => setCategory(c.value)}
                      className={`text-left text-[15px] font-semibold transition sm:text-[16px] ${
                        active ? 'text-primary' : 'text-gray-800 hover:text-primary'
                      }`}
                    >
                      <span className="hidden sm:inline">{c.label}</span>
                      <span className="sm:hidden">{c.shortLabel}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* ---------- ДЭД ТӨРӨЛ — unegui.mn шиг БАГАНА ----------
                ⚠️ unegui нь ХҮРЭЭТЭЙ TILE БИШ, энгийн ТЕКСТ ЛИНК-үүдийг
                   БАГАНА болгодог: CSS `columns-*` нь дээшээс доош дүүргэж,
                   дараа нь ДАРААГИЙН багана руу шилжинэ (unegui-тэй ижил).
                ⚠️ `break-inside-avoid` — линк баганы зааг дээр ТАСРАХГҮЙ.
                🔤 ФОНТ (2026-09-27, хэрэглэгчийн хүсэлт «жаахан томруулж, илүү
                   хар өнгөтэй»): `text-[12px] font-medium text-gray-700` →
                   `text-[14px] font-semibold text-gray-900` (+2px, +1 жин,
                   gray-700 #454037 → gray-900 #1B1815).
                ⚠️ unegui-тэй ижил: дэд төрөл тус бүрийн ТОО ХАРАГДАХГҮЙ
                   (нийт тоо нь дээрх толгойд байна). Тоог буцаах бол
                   `SubtypeRow`-ы `<span>`-ы дараа `{typeCounts[t]}` badge нэмнэ.
                🔧 Markup нь `SubtypeRow` (модулийн түвшний компонент) —
                   өөрчлөхийг хүсвэл ТҮҮНИЙГ л засна ✓
                🔧 Баганын тоо: `columns-1 sm:columns-2 lg:columns-4` */}

            {/* ---------- ① / ③ ДЭД ТӨРӨЛ — unegui.mn шиг БАГАНА ----------
                ⚠️ ЭНЭ БЛОК зөвхөн бүлэггүй хэсгүүдэд (`services`-ээс бусад)
                   харагдана — `services`-д ② блок бүх бүлгийг шууд нээнэ. */}
            {!subtypeGroups.length && showSubtypes && (
            <div className="columns-1 gap-x-6 sm:columns-2 lg:columns-4" role="tablist" aria-label="Зарын дэд төрөл">
              {subtypes.map((t) => (
                <SubtypeRow
                  key={t}
                  label={getPropertyTypeLabel(t, category)}
                  count={typeCounts[t]}
                  onSelect={() => setF('propertyType', t)}
                />
              ))}
            </div>
            )}

            {/* ══════════ 🛠 3 ДАХЬ ТҮВШИН (`services`) — БҮГД ШУУД НЭЭЛТТЭЙ ══════════
                ⚠️ 2026-09-29 (хэрэглэгчийн хүсэлт: «Үйлчилгээ хэсгийн
                   subcategory-ийг 3р төвшинг заавал нээж харахгүй, шууд
                   харуулдаг болгоё») — ӨМНӨ нь ① бүлгийн жагсаалт → дараа нь
                   бүлэг дээр дарахад ② дэд төрлүүд гэсэн ХОЁР АЛХАМ байв ✗
                   → ОДОО бүх бүлэг БА түүний дэд төрлүүд НЭГ ДОР харагдана ✓
                   (нэг даралт хэмнэгдэж, хэрэглэгч юу байгааг бүхэлд нь харна).

                🧱 БҮТЭЦ (нэг бүлэг = нэг баганын блок):
                   • ГАРЧИГ (`items` байгаа үед) — BOLD, СААРАЛ, дарахгүй
                     (`<p>`) — бүлэг нь ШҮҮЛТ БИШ (2026-09-27-ны шийдвэр ✓)
                   • ДОТОХ ДЭД ТӨРЛҮҮД — `SubtypeRow` (шошго; chevron ›
                     2026-09-30-нд ХАСАГДАВ)
                   • `items: []` бүлэг — өөрөө хамгийн доод түвшин тул
                     ГАРЧИГ БИШ, ШУУД СОНГОГДОХ мөр болно (chevron-гүй) ✓

                ⚠️ CSS `columns-*` БИШ `grid` — `columns` нь нэг бүлгийн
                   дэд төрлүүдийг хоёр баганад ТАСАЛЖ, аль нь аль бүлэгт
                   хамаарахыг ойлгохгүй болгоно ✗. `grid` нь бүлгийг бүтэн
                   байлгана ✓ (багана: 1 мобайл → 2 sm → 4 lg = урьдтай ижил).
                🔤 ФОНТ (2026-09-29, хэрэглэгчийн хүсэлт: «Боловсрол &
                   Сургалт зэрэг categorийн өнгийг тодруулж бага зэрэг
                   томруулъя») — гарчиг `text-[13px] text-gray-600` →
                   **`text-[15px] sm:text-[16px] text-primary-dark`**:
                   • ӨНГӨ: `text-gray-600` (#5D5747) нь доорх дэд төрлийн
                     мөрүүдийн `text-gray-900` (#1B1815)-тай бараг
                     ЯЛГАРАХГҮЙ байв ✗ → **брэндийн цэнхэр** (#1d4ed8)
                     болгов — панелийн толгойн (`text-primary`) аястай
                     нийцэж, саармаг бараан мөрүүдээс ТОД ялгарна ✓
                   • ХЭМЖЭЭ: 13px нь дэд төрлийн 14px-ЭЭС ЖИЖИГ байв
                     (шатлал буруу ✗) → гарчиг 15px (мобайл) / 16px (≥640),
                     дэд төрөл 14/15px ХЭВЭЭР → шатлал зөв ✓
                   • ⚠️ ЯАГААД `text-primary` (#2563eb) БИШ: крем дэвсгэр
                     (#F4F1EA) дээр **4.2:1** → 15px BOLD ч (≥18.66px bold
                     «том текст» биш) AA-д ХҮРЭХГҮЙ ✗ → `primary-dark`
                     (#1d4ed8) нь **5.94:1 ✅ AA** (16px дээр ч мөн адил,
                     учир нь өнгө/дэвсгэр ижил).
                   ℹ️ `items: []` leaf бүлэг (ж: «Хэвлэл, реклам, медиа»)
                     нь ГАРЧИГ БИШ, ОНЦЛОХ ӨНГӨ АВАХГҮЙ — тэр нь ШҮҮЛТ
                     (дарагддаг `role="tab"`), цэнхэр нь «линк» гэсэн
                     хуурамч дохио өгөх байсан ✗.
                ⚠️ ТОО ХАРАГДАХГҮЙ — нийт тоо нь дээрх толгойд (`sectionTotal`) ✓

                🎯 FOCUS ГОРИМ (2026-09-29, 3 дахь хэрэглэгчийн хүсэлт: «Notebook
                   дээр дараад орход Notebook ний дотрох 3-р түвшиний
                   Subcategory-ууд харагдаад бусад 2-р түвшиний category ууд нь
                   харагдахаа больдог байя») — `collapsed: true` бүлэг нээгдэхэд
                   **бусад БҮХ 2-р түвшин (гарчигтай бүлэг ба `items: []`
                   мөрүүд) БҮРЭН АЛГА БОЛНО** ✓ (`focusedGroup && !open` →
                   `return null`, ⚠️ leaf-ийн `return`-оос ӨМНӨ байрлана).
                   Буцах зам (2026-09-29-ээс чипгүй): бүлгийн ГАРЧИГ дээр дарах
                   (`GroupHeading`) эсвэл breadcrumb ✓.
                   ⚠️ `services`-д `collapsed` туг байхгүй → тэнд FOCUS
                   ажиллахгүй, 8 бүлэг ХЭВЭЭР харагдана ✓
                   (✏️ 2026-10-06 (11): 1 дэх групп «Сургалт, курс» — 32 → 52 мөр)
                   🆕 2026-10-06 (12): тэр бүлэг нь `showFirst: 5` тугтай болсон
                   тул панель дээр 52 мөр БИШ, ЭХНИЙ 5 мөр + «Илүү» товч
                   харагдана (дарвал 23 мөр бүтнээрээ) ✓ — FOCUS (accordion)
                   горим ХӨНДӨӨГДӨӨГҮЙ ✓ */}
            {subtypeGroups.length > 0 && (
            <div className="grid grid-cols-1 items-start gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              {subtypeGroups.map((g) => {
                const leaf = g.items.length === 0; // доод түвшингүй → өөрөө сонгогдоно
                // 🗂 `collapsed: true` бүлэг (💻 компьютерийн 4 бүлэг) — дотрох
                //    дэд төрлүүд нь анхдагчаар ХАРАГДАХГҮЙ; гарчиг нь дарж
                //    нээгддэг ✓ (доод түвшингүй бүлэгт туг байхгүй → шууд мөр)
                const collapsible = !!g.collapsed;
                const open = collapsible && focusedGroup === g.label;
                /**
                 * 🆕 2026-10-06 (12) — ХУРААНГУЙ БҮЛЭГ (`showFirst` тугтай —
                 * 🛠 «Сургалт, курс» 23 мөр): панель дээр ЗӨВХӨН ЭХНИЙ
                 * `showFirst` мөр шууд харагдаж, үлдсэн 18 нь доорх «Илүү»
                 * товчоор нээгдэнэ ✓ (хэрэглэгчийн хүсэлт).
                 * ⚠️ Энэ нь ACCORDION (`collapsed` — 💻 компьютерийн бүлэг) БИШ:
                 *    бүх бүлэг ХАРАГДСААР байна, зөвхөн нэг бүлгийн МӨРИЙН ТОО
                 *    хязгаарлагдана (бүлгийн гарчиг нь хэвээр `‹p›` — шүүлт БИШ ✓)
                 * ⚠️ `collapsible` ба `leaf` бүлэгт ХҮРЭХГҮЙ — тэдгээр нь өөр
                 *    механизмтай (accordion товч / өөрөө сонгогдох мөр) ✓
                 * ⚠️ Туг нь `lib/locationData.js` дээрх бүлгийн тохиргоо
                 *    (`showFirst: 5`) — компонентод хатуу бичсэн бүлгийн нэр/тоо
                 *    БАЙХГҮЙ ✓ (өөр бүлэгт хэрэгтэй бол зөвхөн тэнд нэмнэ)
                 */
                const many = !collapsible && !leaf && g.showFirst > 0 && g.items.length > g.showFirst;
                const more = many && moreGroups.includes(g.label);
                // ⚠️ Харагдах мөрүүд: хураангуй үед `slice`, «Илүү» дарсны дараа
                //    БҮТЭН жагсаалт — эх массив (`g.items`) ХӨНДӨӨГДӨХГҮЙ ✓
                const visible = many && !more ? g.items.slice(0, g.showFirst) : g.items;
                // 🎯 FOCUS (2026-09-29, хэрэглэгчийн хүсэлт): нэг бүлэг нээлттэй
                //    үед БУСАД 2-р түвшин БҮРЭН АЛГА → зөвхөн нээлттэй бүлэг ба
                //    түүний дэд төрлүүд (4 БАГАНА) үлдэнэ ✓
                // ⚠️ ЗААВАЛ leaf-ийн `if`-ээс ӨМНӨ — эс бөгөөс доод түвшингүй
                //    5 бүлэг («Чихэвч», «Бусад сэлбэг» …) харагдсаар байх
                //    байсан ✗ (тэдгээр нь `return`-оор дээгүүр гардаг)
                if (focusedGroup && !open) return null;
                if (leaf) {
                  return (
                    <div key={g.label} role="tablist" aria-label={g.label}>
                      <SubtypeRow
                        label={g.label}
                        bold
                        onSelect={() => setF('propertyType', g.label)}
                      />
                    </div>
                  );
                }
                return (
                  <div
                    key={g.label}
                    // Нээлттэй үед бүлэг нь БҮТЭН ӨРГӨНӨӨР сунах ёстой —
                    // эс бөгөөс 4 багана нь нэг баганын дотор багтахгүй ✗
                    className={open ? 'sm:col-span-2 lg:col-span-4' : undefined}
                  >
                    {/* 🗑 FOCUS горим дахь «← Бүх бүлэг» чип 2026-09-29-нд
                        ХАСАГДАВ (хэрэглэгчийн хүсэлт: «Бүх бүлэг, Бүх хэсэг,
                        гэсэн буцах товчийг байхгүй болго») — тэр нь панелийн
                        «← Бүх хэсэг» чиптэй хос ДАВХАР буцах зам байсан ✓
                        ⚠️ Буцах 3 зам ХЭВЭЭР: (1) бүлгийн ГАРЧИГ дээр дарах
                           (`GroupHeading` — chevron ▼↔▶, `aria-expanded`),
                           (2) панелийн гарчиг дээр дарах (7 tile дэлгэц),
                           (3) breadcrumb-ийн «Бүх зар» / хэсгийн нэр ✓
                        ℹ️ Hover дээр `bg-white` болдог тул гарчиг нь дарж
                           болох нь харагдана ✓ */}
                    {/* БҮЛГИЙН ГАРЧИГ — БОЛД, ЦЭНХЭР (`text-primary-dark`), 15/16px.
                        ⚠️ Анхдагчаар ДАРАХГҮЙ (`<p>`) — бүлэг нь ШҮҮЛТ БИШ,
                           зөвхөн навигацийн шошго (2026-09-27-ны шийдвэр ✓).
                        🆕 `collapsed: true` бүлэг дээр ДАРАГДДАГ товч болов
                           (`GroupHeading` — 2026-09-29, хэрэглэгчийн хүсэлт
                           «Notebook рүүгээ дараад орход харагддаг байя») ✓
                        🔤 2026-09-29: 13px/gray-600 → 15px (sm 16px)/primary-dark
                           — хэрэглэгчийн хүсэлт («өнгийг тодруулж бага зэрэг
                           томруулъя»). Контраст 5.94:1 ✅ AA.
                           ⚠️ Харагдац нь товч болсны дараа ч ИЖИЛ хэвээр
                              (`GroupHeading` дотор нэг л класс) ✓ */}
                    <GroupHeading
                      label={g.label}
                      collapsible={collapsible}
                      open={open}
                      onToggle={() => setGroupOpen(open ? null : g.label)}
                    />
                    {/* Дотрох дэд төрлүүд: туггүй бүлэг → үргэлж; `collapsed`
                        бүлэг → зөвхөн нээлттэй үед. Нээлттэй үед 4 БАГАНА
                        (`lg:grid-cols-4` — панелийн баганын тоотой ижил ✓),
                        мобайл 1, sm 2 багана (бусад жагсаалттай ижил зарчим). */}
                    {(!collapsible || open) && (
                      <div
                        role="tablist"
                        aria-label={g.label}
                        className={
                          collapsible
                            ? 'grid grid-cols-1 gap-x-2 sm:grid-cols-2 lg:grid-cols-4'
                            : undefined
                        }
                      >
                        {visible.map((t) => (
                          <SubtypeRow
                            key={t}
                            label={getPropertyTypeLabel(t, category)}
                            onSelect={() => setF('propertyType', t)}
                          />
                        ))}
                      </div>
                    )}
                    {/* 🆕 2026-10-06 (12) — ХУРААНГУЙ: «Илүү» / «Хураах» товч
                        (зөвхөн `showFirst` тугтай, түүнээс олон мөртэй бүлэгт)
                        ⚠️ `role="tablist"`-ийн ГАДНА (доор нь) байрлана — ARIA
                           ёсоор tablist дотор ЗӨВХӨН `role="tab"` байх ЁСТОЙ ✓
                        ⚠️ ШҮҮЛТ БИШ — зөвхөн харагдацыг удирдана (`propertyType`
                           болж ХАДГАЛАГДАХГҮЙ; уг товч дээр `role="tab"` БАЙХГҮЙ
                           тул CDP-ийн 52 тоололд ОРОХГҮЙ ✓)
                        🔤 Өнгө нь бүлгийн гарчигтай ижил (`primary-dark`,
                           контраст 5.94:1 ✅ AA) — 13px (sm 14px) bold
                        ⚠️ CDP дэгээ: `data-group-more="<бүлгийн нэр>"` ✓ */}
                    {many && (
                      <button
                        type="button"
                        onClick={() => toggleMore(g.label)}
                        aria-expanded={more}
                        data-group-more={g.label}
                        title={more ? 'Дэд төрлүүдийг хураах' : `Үлдсэн ${g.items.length - g.showFirst} дэд төрлийг харах`}
                        className="flex w-full items-start gap-1.5 rounded-md px-2 py-1.5 text-left text-[13px] font-bold text-primary-dark transition hover:bg-white sm:text-[14px]"
                      >
                        {/* chevron — хаалттай үед ▼ (доош), нээлттэй үед ▲ (эргэлдэнэ) */}
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          className={`mt-1 shrink-0 opacity-60 transition-transform duration-150 ${more ? '-rotate-90' : 'rotate-90'}`}
                          aria-hidden="true"
                        >
                          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span className="flex items-center gap-1.5">
                          {more ? 'Хураах' : 'Илүү'}
                          {!more && (
                            <span className="rounded-full bg-gray-100 px-1.5 py-px text-[11px] font-bold text-gray-700">
                              +{g.items.length - g.showFirst}
                            </span>
                          )}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </>
        ) : (
          /* ---------- БҮХ ХЭСЭГ — tile сүлжээ (КАРТ) ----------
             ⚠️ 2 → 3 → 4 → 5 багана. Сонгогдсон хэсэг нь онцлогдож харагдана.
                ⚠️ 2026-09-27: «Амралт, спорт, хобби» нэмэгдэж 6 → 7 хэсэг болов.
                ✏️ 2026-09-30 (4): уг хэсгийн нэр нь **«Аялал, Спорт, Хобби»** болов
                   (⚠️ шошго нь `getSection(value).label`-аас уншигдана → tile дээр
                   шууд шинэ нэрээр харагдана ✓; `section` утга `'hobby'` ХЭВЭЭР).
                ✏️ 2026-10-05 (50): хэсгийн нэр нь **«Спорт»** болов (дэд төрөл
                   нь 6 → **21** — хавсралтын орчуулга + 🆕 «Дартс»); ⚠️ мөн л
                   ЗӨВХӨН ШОШГО солигдсон тул энэ файлын код ХӨНДӨӨГДӨӨГҮЙ ✓
                   (`section` утга  `'hobby'` ХЭВЭЭР, tile шошго автоматаар).
                ⚠️ 2026-09-30 (2): ⚡ + 🧱 + 🏭 нэмэгдэж нийт **10 хэсэг** болов →
                   тэр үед `xl:grid-cols-10` (≥1280px дээр БҮГД нэг мөрөнд) гэж
                   тааруулсан БАЙВ.
             🔴 2026-09-30 (3) ХЭРЭГЛЭГЧИЙН ГОМДОЛ: «1-р категориуд маань картаасаа
                илүү гараад онцгүй харагдаад байна, компьютерээс ороход» —
                ⚠️ CDP-ээр ХЭМЖИЖ БАТЛАВ (`/tmp/zar_tiles_cdp.mjs`): 1280px+ дээр
                10 багана → tile ердөө **86px** (icon 34px + gap 6px + padding 12px
                → шошгонд 57-72px л үлдэнэ); flex мөрийн анхдагч `min-width: auto`
                нь хамгийн урт үгнээс («Автомашин» 94px, «Үйлчилгээ» 85px;
                ✏️ 2026-10-05 (45): «Үйлчилгээ» → **«Ажил, Үйлчилгээ»** болсон ч
                доорх ③ хамгаалалт (`min-w-0` + `line-clamp-2` + `break-words`)
                нь хэвээр 2 мөрөнд багтаана ✓) бага
                шахагдаж ЧАДАХГҮЙ тул **БҮХ 10 шошго хүрээнээсээ +7…+19px ГАРСАН**
                байв ✗ (мөн шошго 3 мөр болж, картууд тэгш бус = «онцгүй»).
             ✅ ШИЙДЭЛ — 3 зүйл:
                ① БАГАНА: `xl:grid-cols-10` ХАСАГДАВ → хамгийн ихдээ
                   `xl:grid-cols-5` (⚠️ 2026-09-30 (5): 12 хэсэг болсон тул
                   xl дээр **3 мөр: 5 + 5 + 2**, lg (1024-1279px) дээр
                   **4 + 4 + 4** — 📸 CDP (1280px, grid 1202px): tile
                   **210px**, хамгийн урт шошго 2 мөр, **overflow 0px** ✓
                   ℹ️ 6 багана болговол 169px ба 6 + 6 болно — мөн overflow
                   0px ✓ боловч tile жижигрэх тул 5 ХЭВЭЭР үлдээв);
                   ⚠️ tile ≈ 217px буюу 210px болж, хамгийн урт нэр ч
                   2 мөрөнд БҮРЭН багтана ✓
                   ⚠️ `lg:grid-cols-4` (1024-1279px, ~215px) — `md` БИШ `lg`
                      учраас 640-1023px хооронд **3 багана** (768px дээр ~225px)
                      хэвээр байж, «Компьютер, Дагалдах хэрэгсэл» ТОВЧЛОГДОХГҮЙ ✓
                      (⚠️ `md:grid-cols-4` байхад 768px дээр tile 152px болж
                       3 мөр шаардаж, `line-clamp-2` нь «…» болгож байв ✗)
                ② КАРТ БОСОО БОЛОВ: icon нь `h-11 w-11` дугуй дэвсгэрт
                   (`bg-gray-100`, сонгосон үед `bg-white`) ороод ДЭЭД талд,
                   шошго доор нь голлон — хэвтээ (icon + текст зэрэгцээ) байснаас
                   цэвэрхэн, «ангилал» карт мэт харагдана ✓
                ③ ХАМГААЛАЛТ (дахин хэзээ ч цааснаас гарахгүй): шошгонд
                   `min-w-0` (flex-ийн `min-width: auto`-г дарж ШАХАГДАХ боломж
                   өгнө — ⚠️ ГОЛ ШАЛТГААН энэ байв) + `line-clamp-2` (дээд тал нь
                   2 мөр, илүү бол «…») + `break-words` (нэг урт үг ч хүрээг
                   цуулахгүй) ✓
                   ⚠️ `auto-rows-fr` + `h-full` → 1 мөртэй, 2 мөртэй картууд ИЖИЛ
                      өндөртэй (эгнээ эгц, эмх цэгцтэй) ✓
             🎨 2026-10-07 (хэрэглэгчийн хүсэлт: «Үл хөдлөх, Автомашин, Ажлын
                зар гэх мэт эдгээр картуудаа ийм болгоё» + жишээ зураг):
                ХАВТГАЙ (flat, emoji + нэр) загвар → **КАРТ** болов —
                   • ✏️ 2 дахь хүсэлт (2026-10-07: «бүх 12 картын пастел
                     дэвсгэрийг аваад цагаан карт болгох»): `SECTION_TILE_TONE`
                     пастел өнгө БҮРЭН АРИЛАВ ⇒ карт бүр ЦАГААН (`bg-white` +
                     `border border-gray-200` + `shadow-card`), `rounded-2xl`
                     (⚠️ хуудасны дэвсгэр `bg-gray-50` тул хүрээ/сүүдэр нь
                     картыг ялгана ✓)
                   • нэр нь картын ДЭЭД талд ХАР BOLD (`text-[13px] sm:text-[14px]`,
                     `line-clamp-2` — урт нэр «Компьютер, Дагалдах хэрэгсэл» хүрээнд
                     багтана ✓), icon нь доор ТӨВД ТОМ emoji (`text-[34px] sm:text-[40px]`)
                   • 🐭 HOVER EFFECT: карт нь `-translate-y-1` дээш +
                     `shadow-card-hover` сүүдэр + `hover:border-gray-300` + icon нь
                     `scale-110` томорч «нааш хөдөлж» байна ✓
                     (бүгд `duration-200 ease-out` — зөөлөн)
                   • сонгосон → `ring-2 ring-primary/60` + `border-primary/40`
                     (цагираг тодорхойлно ✓)
             ⚠️ ХАМГААЛАГДСАН ГЭРЭЭ (тест): `.tile-grid button[role="tab"]` нь
                ХЭВЭЭР 12 ширхэг (`cdp:services` ⑧), tile бүрийн TEXT нь
                `<нэр> <emoji>` ХЭВЭЭР (`includes('Ажил, Үйлчилгээ')` ✓ — emoji
                ба нэр хоёулаа DOM-д байгаа тул `innerText` шалгалт хэвээр ✓)
             ⚠️ ТОО (ad count) ГАРАХГҮЙ — хэсэг тус бүрийн тоо нь тусдаа query
                (12 HEAD) шаарддаг тул (хэрэглэгчийн шийдвэр) ОРХИВ ✓
             🔗 `title={s.label}` — бүтэн нэрийг hover-т харуулна ✓ */
          <div className="tile-grid grid auto-rows-fr grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" role="tablist" aria-label="Зарын хэсэг">
            {SECTIONS.map((s) => {
              const on = s.value === section;
              return (
                <button
                  key={s.value}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => changeSection(s.value)}
                  title={s.label}
                  className={`group flex h-full min-h-[104px] w-full flex-col gap-1 rounded-2xl border bg-white px-3.5 pb-3 pt-3 text-left shadow-card transition-all duration-200 ease-out ${
                    on
                      ? 'border-primary/40 ring-2 ring-primary/60'
                      : 'border-gray-200 hover:-translate-y-1 hover:border-gray-300 hover:shadow-card-hover'
                  }`}
                >
                  <span className="min-w-0 text-[13px] font-bold leading-tight text-gray-900 line-clamp-2 sm:text-[14px]">
                    {s.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="mx-auto flex flex-1 items-center justify-center text-[34px] leading-none transition-transform duration-200 ease-out group-hover:scale-110 sm:text-[40px]"
                  >
                    {s.icon}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        </section>
        )}

        {/* ===== 2 БАГАНАТ БҮТЭЦ — unegui.mn загвар =====
            ✅ 2026-10-03 (13) (хэрэглэгчийн хүсэлт: «Дэлгэрэнгүй хайлт 3р
               түвшний сонголт дээр орж ирж байна (Бүх зар › Автомашин ›
               Суудлын машин) — 2р түвшин дээр гаргаж ирээд, бүх зар дээр шүү»):
               sidebar нь ОДОО дэд төрөл (3-р түвшин) сонгосон үед л БИШ —
               хэсэг (2-р түвшин) ба «Бүх зар» (1-р түвшин) дээр Ч харагдана
               (`showAdvancedFilters` — ҮРГЭЛЖ ✓). ⏳ Урьд нь PROGRESSIVE байв ✗
            ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): «Дэлгэрэнгүй хайлтыг үргэлж
               нээлттэй болгоё» → МОБАЙЛ дээр ч панель ҮРГЭЛЖ ХАРАГДАХ болов ✓
               Урьд нь мобайлд НУУГДАЖ, «⚙️ Дэлгэрэнгүй хайлт» товчоор
               нээгддэг байв ✗ (товч одоо ХАСАГДСАН ✓).
            🗑 «💡 Төрөл сонгоход дэлгэрэнгүй хайлт харагдана» зөвлөмж
               ХАСАГДАВ (панель үргэлж харагддаг болсон тул хэрэггүй ✓).
            ⚠️ Sidebar нь `lg:sticky lg:top-4` — урт жагсаалт гүйлгэхэд шүүлт
               хамт гүйлгэхгүй, дэлгэц дээр барина (unegui.mn-тэй ижил). */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ============ SIDEBAR — ДЭЛГЭРЭНГҮЙ ХАЙЛТ (зүүн багана) ============
              ✅ 2026-10-03 (13): ҮРГЭЛЖ render болно (`showAdvancedFilters`) —
                 «Бүх зар» (1-р түвшин) ба хэсэг (2-р түвшин) дээр ч харагдана ✓
                 (⏳ урьд нь зөвхөн дэд төрөл сонгосон үед — PROGRESSIVE байв ✗)
              ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): «Дэлгэрэнгүй хайлтыг үргэлж
                 нээлттэй болгоё» → панель МОБАЙЛ дээр ч ҮРГЭЛЖ ХАРАГДАНА ✓
                 (товч дарах шаардлагагүй ✓ — desktop-той ижил зан төлөв).
              ⚠️ Урьд нь `${filtersOpen ? '' : 'hidden'}` гэсэн төлөвтэй байсан
                 бөгөөд «⚙️ Дэлгэрэнгүй хайлт» товчоор нээгддэг байв ✗
                 → товч БА төлөв хоёулаа ХАСАГДСАН ✓
              📱 МОБАЙЛ дээрх дараалал (aside нь DOM-д результатовын ӨМНӨ):
                 [төрөл] → [Дэлгэрэнгүй хайлт панель] → [гарчиг + өрөөний тоо]
                 → [чипүүд] → [картууд]
              ⚠️ `lg:sticky lg:top-4` — desktop дээр гүйлгэхэд хамт гүйлгэхгүй ✓
              🔴 2026-10-04 (26) АСУУДАЛ: панелийн агуулга (10+ блок) нь
                 дэлгэцээс ӨНДӨР (бодит хэмжилт 1440×800 дээр **1732px**) тул
                 `sticky` нь дээрээ наалдаж, доод хэсэг (🔍 Хайх товч) нь
                 гүйлгэхэд ХҮРЭХГҮЙ байв ✗ (зөвхөн хуудасны хамгийн төгсгөлд
                 хүрсэн үед л гарч ирнэ) — хэрэглэгч «хайлтын товч гарч
                 ирэхгүй» гэж мэдэгдэв.
              ✅ ШИЙДЭЛ: `lg:max-h-[calc(100vh-2rem)]` + `lg:overflow-y-auto`
                 → панель өөрөө дотроо гүйлгэгдэнэ (2rem = `top-4`-ийн 1rem +
                 доод 1rem); 🔍 Хайх нь доор `sticky bottom-0` тул ҮРГЭЛЖ
                 харагдана ✓ (мобайл `<lg` ХӨНДӨӨГДӨӨГҮЙ — sticky нь `lg:` ✓) */}
          {showAdvancedFilters && (
          <div className="flex w-full shrink-0 flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:w-[280px] lg:overflow-y-auto">
            {/* 🔀 ЭРЭМБЭЛЭХ — 🆕 2026-10-06: unegui.mn шиг сайдбарын ДЭЭД
                хэсэгт (бүтэн өргөнтэй хайрцаг + ⇅ icon + ▾).
                ⚠️ Сонголт солиход `?page=1` руу буцна (`changeSort`) — эс
                   бөгөөс 3-р хуудсан дээр дараалал солиход «дунд» байрлалд
                   орж, хэрэглэгч төөрнө ✗
                ⚠️ Утга нь `normalizeSort()`-оор шүүгдэнэ (`?sort=xxx` →
                   анхдагч) — PostgREST руу танихгүй багана явахгүй ✓
                ⚠️ Энэ нь ШҮҮЛТ БИШ (үр дүнгийн тоо өөрчлөгдөхгүй) тул
                   чипүүдийн тоонд ОРОХГҮЙ — зөвхөн дараалал солино ✓
                ⚠️ `[data-listing-sort]` — CDP дэгээ (`scripts/cdp-range.mjs`);
                   `<select>` нь `data-listing-sort` тул `data-attr-filter`-ГҮЙ
                   (CDP «сайдбарт select 0» шалгалт эвдрэхгүй ✓) */}
            <label
              htmlFor="listing-sort"
              className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 shadow-btn transition-colors hover:border-primary/40"
            >
              <span aria-hidden="true" className="text-[15px] text-gray-400">⇅</span>
              <select
                id="listing-sort"
                data-listing-sort
                className="w-full appearance-none bg-transparent text-[14px] font-semibold text-gray-800 focus:outline-none"
                value={sort}
                onChange={(e) => changeSort(e.target.value)}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span aria-hidden="true" className="text-[12px] text-gray-400">▾</span>
            </label>

            {/* 🗺 ГАЗРЫН ЗУРАГ ДЭЭР ХАРАХ — 🆕 2026-10-06: unegui.mn шиг
                сайдбарын хайрцаг (⏳ урьд нь толгойд `.segmented`
                «☰ Жагсаалт | 🗺 Газрын зураг» байв — «Жагсаалт» нь илүүц
                байсан тул НЭГ товч болов ✓).
                ⚠️ `view` state / `?view=map` URL / `MapView` / DB БҮГД
                   ХӨНДӨӨГДӨӨГҮЙ — зөвхөн контролын байрлал/хэлбэр солигдов */}
            <button
              type="button"
              data-view-toggle
              aria-pressed={view === 'map'}
              onClick={() => setView(view === 'map' ? 'list' : 'map')}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[14px] font-semibold text-gray-700 shadow-btn transition-all duration-150 ease-out hover:border-primary/40 hover:text-primary"
            >
              {view === 'map' ? '☰ Жагсаалт руу буцах' : '🗺 Газрын зураг дээр харах'}
            </button>

            <aside id="advanced-filters" className="w-full">
            <div className="rounded-xl border border-gray-200 bg-white shadow-card">
              {/* Толгой — unegui.mn-д тусдаа гарчиг байхгүй ч «N шүүлт» badge нь
                  хэрэглэгчид ямар нэг зүйл сонгосноо мэдэгдэхэд тустай.
                  🗑 2026-10-04 (39): гарчгийн өмнөх ⚙️ badge ХАСАГДАВ —
                  хэрэглэгчийн хүсэлт: «Дэлгэрэнгүй хайлт … бүх үгний өмнө байгаа
                  emoji-г байхгүй болго» ⇒ зөвхөн «Дэлгэрэнгүй хайлт» текст ✓ */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3.5">
                <h2 className="flex items-center gap-2 text-[15px] font-bold text-gray-900">
                  Дэлгэрэнгүй хайлт
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[12px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </h2>
                {/* ⚠️ 2026-09-27: «✕ Хаах» товч ХАСАГДСАН — панель үргэлж
                    нээлттэй тул «хаах» ойлголт байхгүй ✓
                    (товч нь зөвхөн мобайл sheet-ийг хаадаг байсан ✗)
                    🆕 2026-10-06 (18): ОРОНД нь «Бүгдийг нээх / Хураах»
                    товч — БҮХ эвхэгддэг чип блокийг нэг даралтаар нээх/хаах ✓
                    (тусдаа блок бүр өөрийн гарчгаараа ч нээгдэнэ ✓;
                     дэгээ: `data-side-toggle-all` — CDP `cdp:job-chips` §⑥⓪) */}
                <button
                  type="button"
                  data-side-toggle-all
                  aria-pressed={allBlocksOpen === true}
                  onClick={toggleAllSideBlocks}
                  className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-gray-500 hover:text-primary hover:underline"
                >
                  {allBlocksOpen === true ? 'Хураах' : 'Бүгдийг нээх'}
                </button>
              </div>

              <div className="divide-y divide-gray-100 px-4">
                {/* 🆕ℹ️ 2026-10-06: 🛏 «Өрөөний тоо» ба 💳 «Төлбөрийн нөхцөл»
                    нь үр дүнгийн дээрх `#filter-bar`-ийн PILL-ээс ЭРГЭЖ САЙДБАРТ
                    ИРЭВ (хэрэглэгчийн хүсэлт: «Үл хөдлөхийн хайлт дээр байгаа
                    Өрөөний тоо, Төлбөрийн нөхцөлийг Дэлгэрэнгүй хайлтын
                    Байршил-ийн доор оруул») ⇒ 2 ӨӨР UI БАЙХГҮЙ ✓
                    🆕 (15): 💳 нь «💰 Үнэ, ₮»-ний ДАРАА болов (хэрэглэгчийн
                    хүсэлт: «Автомашин дээр Үнийн дараа оруулах») ⇒
                    Sidebar-ийн дараалал (🆕 2026-10-06 (17)-ийн дараа):
                    «📍 Байршил» → «🛏 Өрөөний тоо» → [attr шүүлтүүд] →
                    «💰 Үнэ, ₮» → «💳 Төлбөрийн нөхцөл» →
                    🔀 🆕 «🎨 Өнгө» → «⛽ Түлш» → «⚙️ Хурдны хайрцаг»
                    (`afterPaymentAttrs` — хэрэглэгчийн хүсэлт:
                    «Өнгө, Түлш, Хурдны хайрцаг … Төлбөрийн нөхцөлийн ардаас
                    оруул») → «📐 Талбай, м²» ✓
                    (⏳ 2026-10-03 (4): «Үнэ, ₮»-ний өмнө сайдбарт; 2026-10-04 (38):
                       өрөө нь `#filter-bar` pill; (37): төлбөр ч мөн pill — ОДОО
                       хоёулаа сайдбарт буцав ✓) */}

                {/* ===== 📍 БАЙРШИЛ — НЭГ ТОВЧ → `LocationPicker` (modal) =====
                    ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-04 (28)): «Дэлгэрэнгүй хайлт-ийн
                    Байршил сонголтыг толгойн «📍 Бүх байршил» шиг сонгодог
                    болго» ⇒ сайдбарын 3 шатлалт (Хот/Аймаг `<select>` → Дүүрэг
                    чип → Хороо чип) блок БҮХЭРЛЭЭ ХАСАГДАВ.
                    🆕 ОРОНД нь толгойн мөртэй ЯГ ИЖИЛ НЭГ товч — дарахад
                       `LocationPicker` нээгдэж, Хот → Дүүрэг → Хороог НЭГ
                       цонхонд каскадаар сонгоно ✓ (component дахин
                       хэрэглэгдэнэ — 2 газар 2 өөр UI БАЙХГҮЙ ✓)
                    ⚠️ Урсгалын утга ХЭВЭЭР: `filters.city` / `.districts` /
                       `.khoroos` → URL (`?city=…&district=…&khoroo=…`),
                       DB (`district=in.(…)`), breadcrumb (`📍 …`), «Гүйцэтгэсэн
                       шүүлт» чипүүд, `activeFilterCount` БҮГД өөрчлөгдөхгүй ✓
                    ⚠️ 2026-10-03 (10)-ын «Дүүрэг/Сум олон сонголттой» хүсэлт
                       ХАНГАГДСАН ХЭВЭЭР — пикер дотор ч олон сонголт (`✓`) ✓
                    ⚠️ `data-sidebar-location` — CDP дэгээ (`cdp-districts.mjs`);
                       толгойн `data-header-location`-той НЭГ `onOpenLocation` ✓ */}
                <SideBlock label="Байршил">
                  <button
                    type="button"
                    data-sidebar-location
                    aria-haspopup="dialog"
                    onClick={() => setLocOpen(true)}
                    className={`flex h-11 w-full items-center gap-2 rounded-xl border px-3 text-left text-[14px] font-semibold transition ${
                      filters.city
                        ? 'border-primary bg-primary-light text-primary'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <PinIcon className="h-[18px] w-[18px] shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{locationLabel}</span>
                    <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-60" />
                  </button>

                  {/* Сонгосон байршлын жижиг шошгууд + «✕ Цэвэрлэх» — пикер
                      нээлгүй ч юу сонгосон нь харагдана; цэвэрлэх нь БҮХ
                      гурвыг (хот+дүүрэг+хороо) нэг дор арилгана ✓
                      ⚠️ Хот сонгоогүй үед `districts`/`khoroos` хоосон байх
                         ЁСТОЙ (`setF('city')` дүрэм) тул зөвхөн шалгана */}
                  {filters.city && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-semibold text-gray-700">
                        {filters.city}
                      </span>
                      {filters.districts.map((d) => (
                        <span
                          key={`d-${d}`}
                          data-location-pill="district"
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-[12px] text-gray-600"
                        >
                          {d}
                        </span>
                      ))}
                      {filters.khoroos.map((k) => (
                        <span
                          key={`k-${k}`}
                          data-location-pill="khoroo"
                          className="rounded-full bg-gray-100 px-2 py-0.5 text-[12px] text-gray-600"
                        >
                          {k}
                        </span>
                      ))}
                      <button
                        type="button"
                        data-location-clear
                        onClick={() => applyLocation({ city: '', districts: [], khoroos: [] })}
                        className="text-[13px] font-semibold text-gray-500 underline-offset-2 hover:text-primary hover:underline"
                      >
                        ✕ Цэвэрлэх
                      </button>
                    </div>
                  )}
                </SideBlock>

                {/* ===== 🛏 ӨРӨӨНИЙ ТОО — НЭГ ДАРЖ ОЛОН СОНГОЛТ (2026-10-03) =====
                    🆕 2026-10-06: «Үл хөдлөх» хайлт дээр `#filter-bar` pill байсныг
                    ЭРГЭЖ «📍 Байршил»-ийн ЯГ ДООР сайдбарт оруулав (хэрэглэгчийн
                    хүсэлт) ⇒ 2 ӨӨР UI БАЙХГҮЙ ✓
                    ⚠️ Хэв нь ХӨНДӨГДӨӨГҮЙ: `chip-toggle` чипүүд (flex-wrap) +
                       `aria-pressed` + идэвхтэй үед `✓` ба `chip-toggle-active`
                    ⚠️ Утга (`filters.rooms` МАССИВ), URL (`?rooms=1,3`), DB
                       (`lib/queries.js → applyRoomFilter`) БҮГД ХЭВЭЭР ✓
                    ⚠️ `data-room-filter` / `data-room-value` нь `scripts/cdp-rooms.mjs`-ийн
                       дэгээ — УСТГАХГҮЙ ✓; «N сонгосон» ба «✕ Цуцлах» ХЭВЭЭР ✓
                    🆕 2026-10-06 (18): блок нь ЭВХЭГДДЭГ (`collapsible`) — 5 чип нь
                       босго (`SIDEBAR_CHIP_COLLAPSE_MIN`) хүрсэн тул анхдагчаар
                       ХУРААСАН (сонгосон утга байвал АВТОМАТААР НЭЭЛТТЭЙ ✓) */}
                {showRooms && (
                  <SideBlock
                    label="Өрөөний тоо"
                    collapseKey="rooms"
                    collapsible
                    open={blockOpen('rooms', ROOM_OPTIONS.length, filters.rooms.length)}
                    onToggle={() => toggleSideBlock('rooms', ROOM_OPTIONS.length, filters.rooms.length)}
                    count={filters.rooms.length}
                  >
                    <div
                      className="rounded-lg border border-gray-200 bg-gray-50/70 p-2"
                      data-room-filter
                      role="group"
                      aria-label="Өрөөний тоо"
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {ROOM_OPTIONS.map((r) => {
                          const on = filters.rooms.includes(r.value);
                          return (
                            <button
                              key={r.value}
                              type="button"
                              aria-pressed={on}
                              data-room-value={r.value}
                              onClick={() => toggleRooms(r.value)}
                              className={`chip-toggle ${on ? 'chip-toggle-active' : ''}`}
                            >
                              {on && <span aria-hidden="true">✓</span>}
                              {r.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {filters.rooms.length > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-gray-600">
                          {filters.rooms.length} сонгосон
                        </span>
                        <button
                          type="button"
                          onClick={clearRooms}
                          className="text-[13px] font-semibold text-gray-500 hover:text-primary hover:underline"
                        >
                          ✕ Цуцлах
                        </button>
                      </div>
                    )}
                  </SideBlock>
                )}

                {/* 💰💼 2026-10-03 (9): «Үнэ, ₮» / «Цалин, ₮» блок — АЖЛЫН ЗАРТ
                    энд (attr шүүлтүүдийн ӨМНӨ) байрлана (unegui.mn-ийн ажлын
                    хайлтын зурагтай ИЖИЛ); бусад хэсэгт доор (хуучин байрлал) ✓ */}
                {isJobs && priceSideBlock}

                {/* ===== 🏷️🚙 ҮЙЛДВЭРЛЭГЧ, ЗАГВАР — НЭГ ТОВЧ → `CarPicker` (modal) =====
                    ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-04 (35)): «Автомашины хайлтын
                    Үйлдвэрлэгч, Загварыг Байршил шиг хайдаг болгоод өг».
                    ⇒ сайдбарын ХОЁР тусдаа талбар (🏷️ `SearchableSelect` 95
                    брэнд + 🚙 combo/TextFilter) БҮРЭН ХАСАГДАВ.
                    🆕 ОРОНД нь 📍 Байршилтай ЯГ ИЖИЛ НЭГ товч — дарахад
                       `CarPicker` нээгдэж, Үйлдвэрлэгч → Загварыг НЭГ цонхонд
                       ХАЙЛТТАЙ каскадаар сонгоно ✓
                    ⚠️ Урсгалын утга ХЭВЭЭР: `filters.attrs.brand` / `.model`
                       → URL (`?attr_brand=…&attr_model=…`), DB (`attrs->>… ilike`),
                       «Гүйцэтгэсэн шүүлт» чипүүд, `activeFilterCount`,
                       breadcrumb БҮГД өөрчлөгдөхгүй ✓
                    ⚠️ `data-sidebar-car` — CDP дэгээ (`scripts/cdp-picker.mjs` §7)
                    🔍 Хайх үг: data-sidebar-car, CarPicker, applyCar, carLabel */}
                {isAuto && (
                  <SideBlock label="Үйлдвэрлэгч, загвар">
                    <button
                      type="button"
                      data-sidebar-car
                      aria-haspopup="dialog"
                      onClick={() => setCarOpen(true)}
                      className={`flex h-11 w-full items-center gap-2 rounded-xl border px-3 text-left text-[14px] font-semibold transition ${
                        carBrand || carModels.length
                          ? 'border-primary bg-primary-light text-primary'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="min-w-0 flex-1 truncate">{carLabel}</span>
                      <ChevronDownIcon className="h-4 w-4 shrink-0 opacity-60" />
                    </button>

                    {/* Сонгосон машины жижиг шошгууд + «✕ Цэвэрлэх» — пикер
                        нээлгүй ч юу сонгосон нь харагдана (📍 Байршлын ИЖИЛ)
                        ⚠️ 🚙 Загвар нь ОЛОН сонголттой (2026-10-04 (36)) тул
                           нэг pill нь ТОВЧЛОСОН шошго — «Prius 30» (1) /
                           «2 загвар» (2+); бүтэн жагсаалтыг пикер дотор
                           чипээр харна ✓ (`data-car-model-count` — CDP дэгээ) */}
                    {(carBrand || carModels.length > 0) && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {carBrand && (
                          <span data-car-pill="brand" className="rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-semibold text-gray-700">
                            {carBrand}
                          </span>
                        )}
                        {carModels.length > 0 && (
                          <span
                            data-car-pill="model"
                            data-car-model-count={carModels.length}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-[12px] text-gray-600"
                          >
                            {attrListFilterLabel(carModels, 'загвар')}
                          </span>
                        )}
                        <button
                          type="button"
                          data-car-clear
                          onClick={() => applyCar({ brand: '', model: [] })}
                          className="text-[13px] font-semibold text-gray-500 underline-offset-2 hover:text-primary hover:underline"
                        >
                          ✕ Цэвэрлэх
                        </button>
                      </div>
                    )}
                  </SideBlock>
                )}

                {/* ===== ХЭСГИЙН ATTR ШҮҮЛТҮҮД (0016, өргөтгөсөн 2026-09-28) =====
                    ⚠️ Хэсэг тус бүрийн `attrFilters` — оролтын төрөл 3:
                      ① энгийн `<select>` (цөөн сонголт: Түлш, Өнгө)
                      ② 🔎 ХАЙЛТТАЙ COMBOBOX (`f.searchable`, ж: 🏷️ Үйлдвэрлэгч — 95)
                         хэрэглэгчийн хүсэлт (2026-09-27): «Суудлын машин
                         сонгоод брэндээс хайж олох төвөгтэй… гараас хайх»
                         ⚠️ 2026-09-28: label нь «Үйлдвэрлэгч» болов (key: `brand`)
                      ③ ✍️/📅 ГАРААР БИЧИХ ТЕКСТ (`f.filterable`) ба
                         ОНЫ ХҮРЭЭ (`f.range`, «Доод / Дээд») —
                         хэрэглэгчийн хүсэлт (2026-09-28): «хайлт дээр ЗАГВАР
                         оруул; ҮЙЛДВЭРЛЭСЭН ОН, ОРЖ ИРСЭН ОНООР шүүдэг байх»
                      ④ 🌈 БРЭНДЭЭС ХАМААРАХ СОНГОЛТ (`f.optionsFrom`, 2026-10-01,
                         хэрэглэгчийн хүсэлт): брэнд сонгосон үед 🚙 «Загвар» нь
                         тухайн брэндийн загваруудтай ХАЙЛТТАЙ combo болно
                         (брэнд сонгоогүй бол ③ — чөлөөт текст хэвээр ✓)
                    ⚠️ Утга нь `listings.attrs` (jsonb) дотор → `?attr_brand=Toyota`,
                       оны хүрээ нь `?attr_year_from=2015&attr_year_to=2020`
                    ⚠️ Гараар бичих талбар нь ⏎/blur үед л хүчинтэй болно —
                       үсэг бүрт query явахгүй ✓ (`TextFilter`, `SearchableSelect`)
                    🖥 ⑤ ДЭД ТӨРЛӨӨС ХАМААРАХ ШҮҮЛТ (2026-10-03 (7), хэрэглэгчийн
                       хүсэлт: «notebook хайх дээр Дэлгэцийн хэмжээ · CPU · RAM ·
                       SSD Hard шүүлтүүд гардаг байх»): 💻 Notebook-ийн 📺/⚙️/🧠/💾
                       нь ЗӨВХӨН Notebook-ийн брэнд («Apple», «Lenovo» …) эсвэл
                       «Иж бүрэн компьютер»/«Процессор, сервер» сонгосон үед
                       харагдана — `getAttrFilters(section, filters.propertyType)`
                       нь формойн `getAttrFields`-тэй ЯГ ИЖИЛ `onlySubtypes` дүрмийг
                       хэрэглэнэ ✓ (Mouse/Keyboard/тонер дээр ГАРАХГҮЙ)
                    🕒 ⑥ ОЛОН СОНГОЛТТОЙ ЧИП ШҮҮЛТ (`f.chips` + `f.multi`,
                       2026-10-03 (9) · 🆕 2026-10-05 (42) · 🆕 2026-10-06 (17),
                       хэрэглэгчийн хүсэлт: «ажлын зар хайх хэсгийн Design ийг …
                       хийгээрэй», «Ажлын цаг, Туршлага, Мэргэжлийн түвшиныг
                       Өрөөний тоо шиг болго»): 🆕 (17)-д 💼-ийн 🕒/📊/📈 нь
                       САЙДБАРТ БУЦАВ (⏳ (42) `filterBar` pill байв ✗) — ЭНЭ
                       салбараар генерацлагдана ✓ (💼-д 💰 Цалин нь attr-ийн
                       ӨМНӨ гардаг тул 3 чип цалингийн ДАРАА ✓); 🚗-ийн
                       🎨/⛽/⚙️ нь `afterPayment` тул ТУСДАА (доор) ✓
                       ⚠️ Утга нь МАССИВ
                       (`?attr_jobType=Бүтэн цагийн,Цагийн`),
                    ⚠️ 🚗 АВТО-гийн 🏷️ `brand` / 🚙 `model` нь ЭНД ИРЭХГҮЙ — тэдгээр
                       нь дээрх `CarPicker` (modal) руу шилжсэн тул `isAuto`
                       үед жагсаалтаас ШҮҮГДЭНЭ (2 өөр UI БАЙХГҮЙ ✓)
                    ⚠️ `lib/locationData.js → getAttrFilters('auto')` нь `brand`/
                       `model`-ыг ХЭВЭЭР буцаана (форм, URL, DB нэг эх сурвалж ✓) —
                       зөвхөн сайдбарын ДҮРСЛЭЛ энд шүүгдэнэ */}
                {attrFilters
                  // 🎛 2026-10-04 (37) · 🆕 2026-10-05 (42) · 🆕 2026-10-06 (17):
                  //    `filterBar: true` талбар (💻 📺/⚙️/🧠/💾) нь үр дүнгийн
                  //    дээрх ХЭВТЭЭ мөр (pill dropdown) руу явдаг тул сайдбарт
                  //    ДАВХАРДАХГҮЙ ✓; 🔀 `afterPayment` талбар (🚗 🎨/⛽/⚙️) нь
                  //    💳 «Төлбөрийн нөхцөл»-ийн ЯГ АРАА ТУСДАА render болдог
                  //    (`afterPaymentAttrs` — доор) ⇒ энэ үндсэн жагсаалтад ч
                  //    ДАВХАРДАХГҮЙ ✓ (`lib/locationData.js` — нэг эх сурвалж)
                  .filter((f) => !f.filterBar)
                  .filter((f) => !f.afterPayment)
                  .filter((f) => !(isAuto && (f.key === 'brand' || f.key === 'model')))
                  .map((f) => {
                  /**
                   * 🌈 БРЭНДЭЭС ХАМААРАХ СОНГОЛТУУД (`f.optionsFrom` = 'brand') —
                   *    СОНГОСОН брэндийн загварууд; хоосон бол ③ (TextFilter) ✓
                   *    ⚠️ Формтой ЯГ ИЖИЛ туслах (`lib/carModels.mjs → lookupMap`)
                   */
                  const depOptions = f.optionsFrom
                    ? lookupMap(f.optionsMap, attrValue(f.optionsFrom))
                    : [];
                  /**
                   * 🆕 2026-10-06 (18): ЗӨВХӨН ЧИП талбар (`f.chips`) нь ХУРААГДДАГ
                   *    (`<select>`/текст/combobox/хүрээ нь жижиг тул хэвээр ✓) —
                   *    5+ сонголттой чип блок анхдагчаар хаалттай, сонгосон утга
                   *    байвал нээлттэй (`blockOpen` — нэг дүрэм ✓)
                   */
                  const chipActive = f.chips ? countAttrValues(attrArray(f.key)) : 0;
                  const chipOptions = (f.options || []).length;
                  return (
                  <SideBlock
                    key={f.key}
                    label={f.label}
                    collapseKey={f.key}
                    collapsible={!!f.chips}
                    open={!f.chips || blockOpen(f.key, chipOptions, chipActive)}
                    onToggle={f.chips
                      ? () => toggleSideBlock(f.key, chipOptions, chipActive)
                      : undefined}
                    count={chipActive}
                  >
                    {f.chips ? (
                      f.multi ? (
                        /* 🎨 ОЛОН СОНГОЛТТОЙ ЧИП (2026-10-03 (19); ✅ «Шинэ /
                           Шинэвтэр / Хуучин» ч мөн адил — 2026-10-03 (21)) —
                           хэрэглэгчийн хүсэлт: «Зар хайлт дээр Авто машин сонголт
                           дээр Өнгө ийг Төлбөрийн нөхцөл шиг олон сонголттой
                           болго» ба «хайлт дээр Шинэ / Шинэвтэр / Хуучин ийг бас
                           💳 Төлбөрийн нөхцөл шиг олон сонголт хийх боломжтой болго».
                           ⇒ ХЭВ нь «🛏 Өрөөний тоо» / «💳 Төлбөрийн нөхцөл»-тэй
                           ЯГ ИЖИЛ: «N сонгосон» badge + хүрээтэй хайрцаг дотор
                           `chip-toggle` чипүүд + «✕ Цуцлах» товч ✓
                           ⚠️ Утга нь `attrs[f.key]` дотор МАССИВ (`['Хар',
                           'Цагаан']` · `['Шинэ','Хуучин']`) → URL
                           `?attr_color=Хар,Цагаан` / `?attr_condition=Шинэ,Хуучин`,
                           DB `attrs->>color=in.(…)` (`lib/attrMultiFilter.mjs`) ✓
                           ⚠️ `data-attr-filter` (CDP-ийн дэгээ) нь хайрцаг дээр
                           — `scripts/cdp-notebook-specs.mjs`-ийн `[data-attr-filter]`
                           тоо ХЭВЭЭР (1 талбар = 1 дэгээ ✓); нэмэлт
                           `data-attr-multi="true"` нь олон сонголтыг илтгэнэ ✓ */
                        attrChipsBlock(f)
                      ) : (
                      /* 🕒 НЭГ СОНГОЛТТОЙ ЧИП шүүлт (`f.chips` бий, `f.multi` БАЙХГҮЙ)
                         — утга нь НЭГ (`?attr_jobType=Бүтэн цагийн`), идэвхтэй чип дээр
                         дахин дарвал ЦУЦЛАГДАНА (`chip-toggle` хэв = «Хороо»/«Өрөө»)
                         ⏳ 2026-10-03 (9)-д 💼 «Ажлын цаг» ЭНЭ салбараар явдаг байв —
                            🆕 2026-10-05 (42)-д `multi: true` + `filterBar: true`
                            нэмэгдэж үр дүнгийн дээрх `#filter-bar` pill болов ⇒
                            бүх `chips` талбар `multi`-тай болсон (энэ салбар
                            одоогоор хэрэглэгдэхгүй ч нэг сонголттой чип талбар
                            нэмэгдвэл generically ажиллана ✓)
                         ⚠️ `data-attr-filter` / `data-attr-value` нь CDP тестийн дэгээ ✓ */
                      <div
                        className="flex flex-wrap gap-1.5"
                        data-attr-filter={f.key}
                        role="group"
                        aria-label={f.label}
                      >
                        {(f.options || []).map((o) => {
                          const on = attrValue(f.key) === o;
                          return (
                            <button
                              key={o}
                              type="button"
                              aria-pressed={on}
                              data-attr-value={o}
                              onClick={() => setAttr(f.key, on ? '' : o)}
                              className={`chip-toggle ${on ? 'chip-toggle-active' : ''}`}
                            >
                              {on && <span aria-hidden="true">✓</span>}
                              {o}
                            </button>
                          );
                        })}
                      </div>
                      )
                    ) : f.searchable ? (
                      <SearchableSelect
                        value={attrValue(f.key)}
                        options={f.options}
                        onChange={(v) => setAttr(f.key, v)}
                        placeholder="Бүгд — бичиж хайна"
                        ariaLabel={f.label}
                      />
                    ) : depOptions.length > 0 ? (
                      // 🌈 Брэндийн загварууд (шүүлт горим — ⏎/сонголт/blur үед л
                      //    хүчинтэй болно: `commitOnType` анхдагчаар `false` ✓)
                      <SearchableSelect
                        value={attrValue(f.key)}
                        options={depOptions}
                        onChange={(v) => setAttr(f.key, v)}
                        placeholder={`${attrValue(f.optionsFrom)} загвар — хайна`}
                        ariaLabel={f.label}
                      />
                    ) : f.range ? (
                      // 📅 ОНЫ ХҮРЭЭ — 2026-09-30: чирдэг хүрээ ХАСАГДАВ (хэрэглэгчийн
                      //    хүсэлт), одоо зөвхөн «Доод / Дээд» тоон оролт
                      //    ⚠️ Утга нь `<key>_from` / `<key>_to` хэвээр
                      //       (ж: `?attr_year_from=2015&attr_year_to=2020`)
                      //    ⚠️ `mode="year"` — он нь цэгээр БҮЛЭГЛЭГДЭХГҮЙ
                      //       («2.026» гэж харагдвал он биш, бутархай мэт ✗)
                      <RangeInput
                        label={f.label}
                        unit="он"
                        mode="year"
                        bounds={yearBounds()}
                        from={attrValue(`${f.key}_from`)}
                        to={attrValue(`${f.key}_to`)}
                        onChange={(a, b) => setAttrPair(f.key, a, b)}
                      />
                    ) : f.filterable ? (
                      // ✍️ ЧӨЛӨӨТ ТЕКСТ шүүлт — ⚠️ 2026-10-01: 🚙 «Загвар» нь
                      //    брэнд сонгосон үед дээшээ (🌈 combo) явдаг тул энд
                      //    зөвхөн брэнд сонгоогүй/жагсаалтгүй үед үлдэнэ ✓
                      <TextFilter
                        value={attrValue(f.key)}
                        onChange={(v) => setAttr(f.key, v)}
                        placeholder={f.placeholder || 'Бичиж хайна'}
                        ariaLabel={f.label}
                      />
                    ) : (
                      <select
                        className="form-select"
                        aria-label={f.label}
                        // 🖥 CDP тестийн ТОГТВОРТОЙ дэгээ (`scripts/cdp-notebook-specs.mjs`)
                        //    — `data-room-filter`/`data-payment-value`-тэй ижил зарчим ✓
                        data-attr-filter={f.key}
                        value={attrValue(f.key)}
                        onChange={(e) => setAttr(f.key, e.target.value)}
                      >
                        <option value="">Бүгд</option>
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    )}
                  </SideBlock>
                  );
                })}

                {/* ⏳ ИСТОРИ: 🛏 «ӨРӨӨНИЙ ТОО» нь 2026-10-03 (4)-д ЭНД (сайдбарт,
                    «Үнэ, ₮»-ний өмнө) байв → 2026-10-04 (38)-д сайдбараас ГАРЧ
                    `#filter-bar` pill болов → 🆕 2026-10-06-д ЭРГЭЖ сайдбарт
                    («📍 Байршил»-ийн ЯГ ДООР) орлоо (хэрэглэгчийн хүсэлт) ⇒
                    UI нь ЭНД БИШ, ДЭЭР (Байршлын дараа) — 1 Л ГАЗАР ✓
                    🔍 Хайх үг: data-room-filter, toggleRooms, ROOM_OPTIONS
                    ⚠️ Утга/URL/DB/breadcrumb ХӨНДӨГДӨӨГҮЙ: `?rooms=1,3` →
                       `lib/queries.js → applyRoomFilter`, «N сонгосон» +
                       «✕ Цуцлах» ХЭВЭЭР (CDP: `scripts/cdp-rooms.mjs` ✓)
                    ⚠️ `showRooms` — үл хөдлөх БА (төрөл сонгоогүй эсвэл өрөөтэй
                       төрөл). Газар/Оффис/Үйлдвэрт өрөө гэж байхгүй ✗
                    🗑 2026-10-03 (10): «Өрөөний тоо»-гийн ДООРХ «Өрөө» гэсэн
                       ИЛҮҮЦЭЛ шошго ХАСАГДАВ (хэрэглэгчийн хүсэлт) ✓ */}

                {/* ===== 💳 ТӨЛБӨРИЙН НӨХЦӨЛ — UI нь ДООР (💰 Үнэ, ₮-ний дараа) =====
                    ⏳ ИСТОРИ: 2026-10-03 (16)-д ЭНД сайдбарт ЧИП байв →
                    2026-10-04 (37)-д `#filter-bar` pill болов → 🆕 2026-10-06-д
                    ЭРГЭЖ сайдбарт (14: «📍 Байршил»-ийн доор; 15: «💰 Үнэ, ₮»-ний
                       ДАРАА) орлоо (хэрэглэгчийн хүсэлт: «…Төлбөрийн нөхцөлийг
                       Дэлгэрэнгүй хайлтын Байршил-ийн доор оруул») ⇒ 1 Л ГАЗАР ✓
                    🔍 Хайх үг: data-payment-filter, togglePayments, PAYMENT_OPTIONS
                    ⚠️ ЗӨВХӨН `real-estate` ба `auto` хэсэгт (`showPayments`)
                       — ажил/компьютер/бараа/үйлчилгээнд лизинг гэж байхгүй ✓
                    ⚠️ Утга (`filters.payments`), URL (`?payment=lease,cash`), DB
                       (`lib/queries.js → applyPaymentFilter`, jsonb `cs` + OR)
                       БҮГД ХӨНДӨГДӨӨГҮЙ ✓ («N сонгосон» + «✕ Цуцлах» ХЭВЭЭР) */}

                {/* ===== ҮНЭ, ₮ — 2026-09-30: ЧИРДЭГ ХҮРЭЭ БА ТҮРГЭН ХҮРЭЭ ХАСАГДАВ =====
                    ⚠️ Хэрэглэгчийн хүсэлт (1): «дээд доод үнэ, талбай дээр чирдэгээ
                       больё, харин оруул байгаа тоог цэгээр тусгаарладаг
                       болгоод өгчих» → слайдер/толгой/зам БҮГД хасагдав ✓
                    ⚠️ Хэрэглэгчийн хүсэлт (2, 2026-09-30 (3)): «Орон сууц
                       хайлтын Үнэ дээр эхлэх дуусах биш Дээд Доод гэе. Бас
                       тэр доор нь санал болгоод байгаа тоог байхгүй болго»
                       → ① шошго нь «Доод / Дээд» ② доорх 4 «түргэн хүрээ»
                       товч (₮25 сая хүртэл …) БҮРЭН ХАСАГДАВ ✓
                    ⚠️ Оруулж байгаа тоо нь ЦЭГЭЭР тусгаарлагдана:
                       «3000000» → «3.000.000» (`lib/rangeFilter.mjs →
                       formatGroupedInput`) — бичиж байхдаа ШУУД ✓
                    ⚠️ Шүүлт нь ⏎ (Enter) эсвэл талбараас ГАРАХ үед л хүчинтэй
                       болно (`components/RangeInput.jsx`) — эс бөгөөс
                       «250000000» бичихэд 9 query явж DB дэмий ачаалагдана ✗
                    ⚠️ ХИЛ нь ХЭСГЭЭС хамаарна: 🏠 үл хөдлөх 5 тэрбум, бусад
                       500 сая (`priceBounds(isRealEstate)`) — энэ нь зөвхөн
                       «хязгааргүй тал»-ыг тодорхойлоход хэрэглэгдэнэ,
                       хэрэглэгчийн бичсэн утгыг ХЯЗГААРЛАХГҮЙ ✓ */}
                {/* ⚠️ 2026-10-03 (9): ажлын зарт энэ блок ДЭЭР (attr шүүлтүүдийн
                    өмнө) гарсан тул энд `!isJobs` үед л дүрслэгдэнэ ✓ */}
                {!isJobs && priceSideBlock}

                {/* ===== 💳 ТӨЛБӨРИЙН НӨХЦӨЛ — НЭГ ДАРЖ ОЛОН СОНГОЛТ (2026-10-03) =====
                    🆕 (15): «💰 Үнэ, ₮»-ний ЯГ ДАРАА (хэрэглэгчийн хүсэлт:
                    «Автомашин дээр Үнийн дараа оруулах») ⇒ сайдбарын дараалал:
                    «📍 Байршил» → «🛏 Өрөөний тоо» → [attr шүүлтүүд] →
                    «💰 Үнэ, ₮» → «💳 Төлбөрийн нөхцөл» → «📐 Талбай, м²» ✓
                    (⏳ (16): «Өрөөний тоо»-ны дараа сайдбарт; (37): `#filter-bar`
                       pill; 2026-10-06 (14): «📍 Байршил»-ийн доор байв — ОДОО
                       «💰 Үнэ, ₮»-ний дараа ✓)
                    ⚠️ ЗӨВХӨН `real-estate` ба `auto` хэсэгт (`showPayments`) —
                       ажил/компьютер/бараа/үйлчилгээнд лизинг гэж байхгүй ✓
                    ⚠️ Шүүлт нь `?payment=lease,cash` → `lib/queries.js` →
                       `applyPaymentFilter()` (jsonb `cs` + OR) — UI-ийн өөрчлөлт
                       нь URL/DB-д ОГТ хүрэхгүй ✓
                    ⚠️ `data-payment-filter` / `data-payment-value` нь
                       `scripts/cdp-payments.mjs`-ийн дэгээ — УСТГАХГҮЙ ✓
                    🆕 2026-10-06 (17): ЭНЭ блокийн ЯГ АРАА 🚗 🎨 Өнгө · ⛽ Түлш ·
                       ⚙️ Хурдны хайрцаг гарна (`afterPaymentAttrs`) — доор ✓
                    🆕 2026-10-06 (18): 💳 нь 4 сонголттой (босгоос ЦӨӨН) тул
                       анхдагчаар НЭЭЛТТЭЙ ч, «Дэлгэрэнгүй хайлт»-ийн товчоор
                       (эсвэл гарчиг дээр дарж) хураагдаж болно ✓ */}
                {showPayments && (
                  <SideBlock
                    label="Төлбөрийн нөхцөл"
                    collapseKey="payments"
                    collapsible
                    open={blockOpen('payments', PAYMENT_OPTIONS.length, countPayments(filters.payments))}
                    onToggle={() => toggleSideBlock('payments', PAYMENT_OPTIONS.length, countPayments(filters.payments))}
                    count={countPayments(filters.payments)}
                  >
                    <div
                      className="rounded-lg border border-gray-200 bg-gray-50/70 p-2"
                      data-payment-filter
                      role="group"
                      aria-label="Төлбөрийн нөхцөл"
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {PAYMENT_OPTIONS.map((o) => {
                          const on = filters.payments.includes(o.value);
                          return (
                            <button
                              key={o.value}
                              type="button"
                              aria-pressed={on}
                              data-payment-value={o.value}
                              onClick={() => togglePayments(o.value)}
                              className={`chip-toggle ${on ? 'chip-toggle-active' : ''}`}
                            >
                              {on && <span aria-hidden="true">✓</span>}
                              {o.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {countPayments(filters.payments) > 0 && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-gray-600">
                          {countPayments(filters.payments)} сонгосон
                        </span>
                        <button
                          type="button"
                          onClick={clearPayments}
                          className="text-[13px] font-semibold text-gray-500 hover:text-primary hover:underline"
                        >
                          ✕ Цуцлах
                        </button>
                      </div>
                    )}
                  </SideBlock>
                )}

                {/* ===== 🔀 2026-10-06 (17): «💳 ТӨЛБӨРИЙН НӨХЦӨЛ»-ИЙН ДАРААХ ШҮҮЛТҮҮД =====
                    🆕 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Өнгө, Түлш, Хурдны хайрцаг
                    Дэлгэрэнгүй хайлтын хэсэгт Төлбөрийн нөхцөлийн ардаас оруул».
                    ⚠️ Аль талбар энд гарахыг `lib/locationData.js`-ийн
                       `afterPayment: <эрэмбэ>` туг л шийднэ (хатуу жагсаалт
                       БАЙХГҮЙ ✓) — ОДОО 🚗 🎨 Өнгө (1) → ⛽ Түлш (2) →
                       ⚙️ Хурдны хайрцаг (3) ✓
                    ⚠️ ХЭВ нь сайдбарын бусад чип блоктой ЯГ ИЖИЛ
                       (`attrChipsBlock` — нэг газар бичигдэнэ ✓): хүрээтэй
                       хайрцаг + `chip-toggle` чипүүд + «N сонгосон» badge +
                       «✕ Цуцлах»; дэгээ (`data-attr-filter` / `data-attr-multi` /
                       `data-attr-value`) ХЭВЭЭР (CDP ✓)
                    ⚠️ Утга/URL/DB ХӨНДӨГДӨӨГҮЙ: `?attr_color=Хар,Цагаан` →
                       `attrs->>color=in.(…)` (`lib/attrMultiFilter.mjs` ✓);
                       🏠 үл хөдлөх · 💼 ажил · 💻 компьютер зэрэгт `afterPayment`
                       талбар БАЙХГҮЙ тул энэ блок тэнд ОГТ ГАРАХГҮЙ ✓ */}
                {afterPaymentAttrs.map((f) => (
                  <SideBlock
                    key={f.key}
                    label={f.label}
                    collapseKey={f.key}
                    collapsible
                    open={blockOpen(f.key, (f.options || []).length, countAttrValues(attrArray(f.key)))}
                    onToggle={() => toggleSideBlock(
                      f.key, (f.options || []).length, countAttrValues(attrArray(f.key)),
                    )}
                    count={countAttrValues(attrArray(f.key))}
                  >
                    {attrChipsBlock(f)}
                  </SideBlock>
                ))}

                {/* ===== ТАЛБАЙ, м² — 2026-09-30: ЧИРДЭГ ХҮРЭЭ ХАСАГДАВ =====
                    ⚠️ «Талбай» нь ЗӨВХӨН үл хөдлөх хэсэгт (0016) — автомашин/
                       ажил/компьютер/бараа/үйлчилгээнд талбай гэдэг ойлголт байхгүй.
                    ⚠️ Хил (0–600 м²) нь зөвхөн «хязгааргүй тал»-ыг
                       тодорхойлоход — хэрэглэгч түүнээс ТОМ утга бичихэд
                       ЯМАР Ч саад байхгүй ✓
                    ⚠️ `mode="decimal"` — «75,5» монгол бутархайг зөвшөөрнө
                       (`lib/queries.js → toNumber`-тай ижил дүрэм ✓); мөнгөн
                       бүлэглэлт нь ЦЭГЭЭР: «1.234,5» ✓ */}
                {isRealEstate && (
                <SideBlock label="Талбай, м²">
                  <RangeInput
                    label="Талбай"
                    unit="м²"
                    mode="decimal"
                    bounds={AREA_BOUNDS}
                    from={filters.minArea}
                    to={filters.maxArea}
                    onChange={(a, b) => { setF('minArea', a); setF('maxArea', b); }}
                  />
                </SideBlock>
                )}

                {/* ===== 🏢📅 ОРОН СУУЦНЫ НЭМЭЛТ ХҮРЭЭ (2026-10-04) =====
                    Хэрэглэгчийн хүсэлт: «орон сууц дээр эдгээр шүүлтийг
                    оруулаарай» (зурагт: Барилгын давхар · Хэдэн давхарт ·
                    Ашиглалтанд орсон он).
                    ⚠️ Хэв нь ҮНЭ/ТАЛБАЙТАЙ ЯГ ИЖИЛ — `RangeInput` («Доод /
                       Дээд» хоёр тоон оролт, ⏎/blur-д л commit). ⚠️ Зурган дээрх
                       «Эхлэх / Дуусах» DROPDOWN БИШ — хэрэглэгч текст оролтыг
                       сонгосон ✓ (`scripts/test-search.mjs` нь RangeInput дотор
                       «Эхлэх/Дуусах» үгийг ХОРИГЛОДОГ).
                    ⚠️ Утгууд нь `attrs` (jsonb) БИШ, `0003`-ийн ЖИНХЭНЭ багана →
                       URL `?minTotalFloors=3&maxFloor=20&minBuildYear=2010`,
                       DB `total_floors` / `floor` / `build_year` `.gte()/.lte()`
                       (`lib/queries.js`) — DB MIGRATION ШААРДЛАГАГҮЙ ✓
                    ⚠️ Хил: давхар 1…150 (`FLOOR_BOUNDS`), он 1980…одоо
                       (`buildYearLimit`) — зөвхөн «хязгааргүй тал» ба уншигдах
                       шошгыг бодоход, бичсэн утгыг ХЯЗГААРЛАХГҮЙ ✓
                    ⚠️ `data-range-filter` дэгээ нь label-аас үүснэ (гурвуулаа
                       ЯЛГААТАЙ нэр — CDP/тестэд тогтвортой ✓)
                    ⚠️ Харагдац нь `showApartmentRanges` — 🏠 үл хөдлөх БА төрөл
                       сонгоогүй/«Орон сууц» үед л (`showRooms`-той ижил) ✓ */}
                {showApartmentRanges && (
                  <>
                    <SideBlock label="Барилгын давхар">
                      <RangeInput
                        label="Барилгын давхар"
                        unit="давхар"
                        mode="int"
                        bounds={FLOOR_BOUNDS}
                        from={filters.minTotalFloors}
                        to={filters.maxTotalFloors}
                        onChange={(a, b) => { setF('minTotalFloors', a); setF('maxTotalFloors', b); }}
                      />
                    </SideBlock>
                    <SideBlock label="Хэдэн давхарт">
                      <RangeInput
                        label="Хэдэн давхарт"
                        unit="давхар"
                        mode="int"
                        bounds={FLOOR_BOUNDS}
                        from={filters.minFloor}
                        to={filters.maxFloor}
                        onChange={(a, b) => { setF('minFloor', a); setF('maxFloor', b); }}
                      />
                    </SideBlock>
                    <SideBlock label="Ашиглалтанд орсон он">
                      <RangeInput
                        label="Ашиглалтанд орсон он"
                        unit="он"
                        mode="year"
                        bounds={buildYearLimit}
                        from={filters.minBuildYear}
                        to={filters.maxBuildYear}
                        onChange={(a, b) => { setF('minBuildYear', a); setF('maxBuildYear', b); }}
                      />
                    </SideBlock>
                  </>
                )}

              </div>

              {/* Доод хэсэг — unegui.mn-ийн «N зар харуулах» хэсэг.
                  ⚠️ Шүүлт нь амьд (real-time) хэрэгждэг тул энэ товч нь зөвхөн
                     мобайл дээрх sheet-ийг хаана — unegui.mn-тэй ижил байрлал.
                  🆕 2026-10-04 (26): `sticky bottom-0` (+`bg-white`) — панель
                     дотроо гүйлгэгдэх үед (дээрх `lg:overflow-y-auto`) энэ мөр
                     (🔍 Хайх + «N зар харуулах» + «↺ Хайлтыг цэвэрлэх») ҮРГЭЛЖ
                     доор харагдана ✓ (товч хүрэхгүй байсан алдааг зассан) */}
              <div className="sticky bottom-0 z-10 rounded-b-xl border-t border-gray-100 bg-white px-4 py-3.5">
                {/* ⚠️ 2026-09-27: шүүлт нь АМЬД (real-time) ✓ — товч нь зөвхөн
                    ҮР ДҮН рүү гүйлгэж хүргэнэ (мобайлд хэрэгтэй ✓).
                    Урьд нь мобайл sheet-ийг ХААДАГ байсан ✗ — одоо панель
                    үргэлж нээлттэй тул хаах шаардлагагүй ✓ */}
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('listing-results');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="btn btn-primary btn-sm w-full"
                >
                  Хайх
                </button>
                <p className="mt-2 text-center text-[13px] text-gray-500">
                  {loadError
                    ? 'холболтын алдаа'
                    : listings !== null
                      // 📄 НИЙТ тоо (бүх хуудасны) — зөвхөн энэ хуудны биш ✓
                      ? `${formatCount(total ?? listings.length)} зар харуулах`
                      : 'ачаалж байна…'}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="mt-1.5 w-full text-center text-[13px] font-semibold text-primary hover:underline"
                  >
                    ↺ Хайлтыг цэвэрлэх
                  </button>
                )}
              </div>
            </div>
          </aside>
          </div>
          )}

          {/* ================= ҮР ДҮН (баруун багана) =================
              ⚠️ `id="listing-results"` — «🔍 Хайх» товч (панелийн доод хэсэг)
                 энэ рүү SMOOTH гүйлгэнэ ✓ (мобайлд шүүлт тавьсны дараа
                 үр дүнгээ шууд харах боломж ✓) */}
          <div id="listing-results" className="min-w-0 flex-1">
            {/* ГАРЧИГ + НИЙТ ТОО — unegui.mn: «Өрөө байр зарна 16,345»
                🆕 2026-10-06: баруун талын контролууд (🔀 Эрэмбэлэх · 🗺 Харах
                горим · 🔖 Хадгалах) ЭНД БАЙСАН — unegui.mn шиг сайдбар
                (эрэмбэлэх + газрын зураг) ба доорх бүтэн өргөнтэй
                «Хайлтыг хадгалах» бар руу шилжсэн ✓ (гарчиг ганцаараа үлдэв) */}
            <div className="mb-3">
              <div className="min-w-0">
                {/* 🗑 ҮР ДҮНГИЙН `<h1>` БҮРЭН ХАСАГДАВ (2026-10-07, хэрэглэгчийн
                    хүсэлт: «Бүх зар N гарчигийг ч хас»). ⏳ Урьд нь энд
                    «Бүх зар 74» / «Орон сууц зарна 16» гэсэн ТОМ гарчиг +
                    НИЙТ ТОО гардаг байв — тэр нь breadcrumb-той давхардаж,
                    хэсгийн үед панелийн толгой (`<h1>`) аль хэдийн хуудасны
                    гол гарчиг болдог тул илүүдэл байв ✗
                    ⚠️ Нийт тоо нь сайдбарын доод «N зар харуулах» ба хайлтын
                       талбарын placeholder-т ХЭВЭЭР харагдана ✓
                    ⚠️ `panelShowsTitle` ба `pageTitle` ХЭРЭГЛЭГДЭХГҮЙ болсон
                       тул тэдгээрийн тодорхойлолт ч хамт хасагдав ✓ */}
                {query && <p className="mt-0.5 text-[14px] text-gray-500">«{query}» хайлтын үр дүн</p>}
                {/* 📄 Хуудас 2+ үед «N дэх хуудас» гэж тодруулна (төөрөгдөлөөс сэргийлэв) */}
                {page > 1 && listings !== null && !loadError && (
                  <p className="mt-0.5 text-[14px] text-gray-500">
                    📄 {page} дэх хуудас
                  </p>
                )}
                {loadError && <p className="mt-0.5 text-[14px] text-red-600">Өгөгдлийн сантай холбогдож чадсангүй</p>}
              </div>

            </div>

            {/* 🔖 ХАДГАЛСАН ХАЙЛТ (2026-10-06, unegui.mn шиг) — одоогийн
                шүүлтээ хадгалаад «Таалагдсан хайлтууд»-аас эргэн харна ✓
                ⚠️ Энэ нь ШҮҮЛТ БИШ (үр дүн өөрчлөгдөхгүй) тул чипүүдийн
                   тоонд ОРОХГҮЙ; CDP/тестийн тогтвортой дэгээ:
                   `[data-save-search]` (товчны бичиг: «Хайлтыг хадгалах» ↔
                   «✓ Хадгалагдсан», `aria-pressed`) ✓
                ⚠️ unegui.mn шиг БҮТЭН ӨРГӨНТЭЙ БАР (хайлтын үр дүнгийн дээд
                   талд) — hover-т зөөлөн бараан болно ✓
                ⚠️ Хадгалах утга байхгүй (зөвхөн «Бүх зар») бол товч
                   ОГТ ГАРАХГҮЙ — `canSaveCurrentSearch` ✓ */}
            {canSaveCurrentSearch && (
              <button
                type="button"
                data-save-search
                aria-pressed={currentSearchSaved}
                onClick={onSaveSearch}
                disabled={currentSearchSaved}
                title={currentSearchSaved ? 'Энэ хайлт хадгалагдсан байна' : 'Одоогийн хайлтыг хадгалах'}
                className={`mb-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold transition-all duration-150 ease-out ${
                  currentSearchSaved
                    ? 'cursor-default border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 bg-gray-100 text-gray-700 hover:border-gray-300 hover:bg-gray-200 hover:text-gray-900'
                }`}
              >
                <span aria-hidden="true">{currentSearchSaved ? '♥' : '♡'}</span>
                {currentSearchSaved ? '✓ Хадгалагдсан' : 'Хайлтыг хадгалах'}
              </button>
            )}

            {/* ===== 🎛🍽 ҮР ДҮҮНГИЙН ДЭЭРХ ХЭВТЭЭ ШҮҮЛТИЙН МӨР (eBay-ийн «Color ⌄») =====
                🆕 2026-10-04 (37): хэрэглэгчийн хүсэлт: «Түлш, Хурдны хайрцаг,
                Төлбөрийн нөхцөл, Өнгө эдгээрийг ebay-ийн дээр байгаа Color шиг
                болгоод өг, Төлбөрийн нөхцөл ба Өнгө олон сонголт хийх боломжтой
                байх» ⇒ ⛽ Түлш · ⚙️ Хурдны хайрцаг · 🎨 Өнгө (албан ёсны «auto»
                хэсэг) ба 💳 Төлбөрийн нөхцөл нь сайдбараас ГАРЧ, ЭНД «Color ⌄»
                шиг pill товч болж, дарахад доошоо хөвөг панель (checkbox мөр)
                гарна ✓ — бүгд ОЛОН СОНГОЛТТОЙ (OR) ХЭВЭЭР.
                🆕 2026-10-05 (42): 💼-ийн 🕒 Ажлын цаг · 📊 Туршлага · 📈
                Мэргэжлийн түвшин ч («фильтр задарсан sidebar биш, Өрөөний тоо/
                Төлбөрийн нөхцөл шиг хайдаг байх» гэсэн хүсэлт) мөн ЭНЭ МӨРӨНД
                pill болж нэгдэв — `lib/locationData.js`-ийн `filterBar: true`
                туг л шийднэ ✓ (хатуу жагсаалт байхгүй).
                ⚠️ `#filter-bar` нь албан ёсны тогтвортой дэгээ (CDP —
                `scripts/cdp-notebook-specs.mjs` / `cdp-payments.mjs` /
                `cdp-job-chips.mjs`).
                ⚠️ Утга/URL/DB ХӨНДӨГДӨӨГҮЙ: `?attr_color=Хар,Цагаан`,
                   `?attr_transmission=Автомат,Механик`, `?attr_fuel=Хайбрид`,
                   `?attr_jobType=Бүтэн цагийн,Цагийн`, `?payment=lease,cash` →
                   `lib/queries.js` (`in.(…)` / `cs.{…}`) ✓
                🆕 2026-10-05 (43): 💻-ийн 📺 Дэлгэц · ⚙️ CPU · 🧠 RAM · 💾 Хард ба
                ✅ «Төлөв» (⏳ хуучин нэр «Шинэ / Шинэвтэр / Хуучин») ч мөн
                ЭНЭ МӨРӨНД pill болж нэгдсэн байв.
                🆕 2026-10-06 (17): ⚠️ ОДОО ЭНЭ МӨРӨНД ЗӨВХӨН 💻-ийн 📺/⚙️/🧠/💾
                4 pill ҮЛДЭВ — хэрэглэгчийн хүсэлтээр 🚗 🎨/⛽/⚙️ (💳 Төлбөрийн
                нөхцөлийн АРАА), 💼 🕒/📊/📈 ба ✅ «Төлөв» нь САЙДБАРТ буцсан ✓
                (мөр нь ⏳ (42)/(43)-д «сайдбарт attr 0» байснаа ОДОО урвуу:
                4 pill л үлдэж, бусад нь сайдбарт ✓ — `filterBar` туг л шийднэ ✓)
                ⚠️ Pill-ийн шошго нь `f.label` — «Төлөв» гэж ЛИБЭЭС ирнэ ✓ */}
            {hasFilterBar && (
              <div id="filter-bar" data-filter-bar className="mb-3 flex flex-wrap items-center gap-2">
                {filterBarAttrs.map((f) => (
                  <FilterPill
                    key={f.key}
                    testKey={f.key}
                    label={f.label}
                    count={countAttrValues(attrArray(f.key))}
                    onClear={() => clearAttrMulti(f.key)}
                  >
                    {/* 🆕 2026-10-06 (17): хайрцаг нь НЭГ газар бичигддэг
                        (`attrChipBox` — сайдбарын чип блоктой ЯГ ИЖИЛ ✓) */}
                    {attrChipBox(f)}
                  </FilterPill>
                ))}
                {/* ⏳ ИСТОРИ: 🛏 «Өрөөний тоо» (2026-10-04 (38)) ба 💳 «Төлбөрийн
                    нөхцөл» (2026-10-04 (37)) нь ЭНД `#filter-bar` pill байв —
                    🆕 2026-10-06-д хоёулаа САЙДБАРТ ЭРГЭЖ ОРОВ: 🛏 нь «📍 Байршил»-ийн
                       доор, 💳 нь 🆕 (15)-д «💰 Үнэ, ₮»-ний дараа болов
                       (хэрэглэгчийн хүсэлт:
                       «Үл хөдлөхийн хайлт дээр байгаа Өрөөний тоо, Төлбөрийн
                       нөхцөлийг Дэлгэрэнгүй хайлтын Байршил-ийн доор оруул»)
                    ⇒ `#filter-bar`-т ЗӨВХӨН `filterBar: true` тугтай attr
                       pill-үүд үлдэнэ (2 ӨӨР UI БАЙХГҮЙ ✓)
                    ⚠️ Утга/URL/DB БҮГД ХӨНДӨГДӨӨГҮЙ: `?rooms=1,3` →
                       `lib/queries.js → applyRoomFilter`, `?payment=lease,cash`
                       → `applyPaymentFilter` (jsonb `cs` + OR) ✓ */}
              </div>
            )}

            {/* ⚠️🗑 2026-09-30 (4): «ӨРӨӨНИЙ ТООНЫ МӨР» (үр дүнгийн толгойн
                доорх «1 өрөө · 2 өрөө · 3 өрөө · 4 өрөө · +5 өрөө» товчнууд)
                БҮРЭН ХАСАГДАВ — хэрэглэгчийн хүсэлт: «товчнууд харагдахгүй
                байх». Sidebar-ийн ижил блок ч хамт хасагдсан тул хуудсанд
                өрөө сонгох UI ОГТ байхгүй ✓
                ⚠️ `?rooms=1,3` линк, DB шүүлт, breadcrumb шошго ХЭВЭЭР —
                   зөвхөн идэвхтэй шүүлтийн чип (`🛏 1, 3 өрөө` ✕) харагдана ✓ */}


            {/* ===== ⚙️ МОБАЙЛ ТОВЧ — 2026-09-27-нд ХАСАГДСАН =====
                ⚠️ Хэрэглэгчийн хүсэлт: «Дэлгэрэнгүй хайлтыг үргэлж нээлттэй
                   болгоё» → «⚙️ Дэлгэрэнгүй хайлт ▼» товч ХЭРЭГГҮЙ болсон ✗
                   Учир нь панель (`<aside id="advanced-filters">`) нь одоо
                   МОБАЙЛ дээр ч ҮРГЭЛЖ харагдана ✓ (товчлох зүйл байхгүй).
                📱 МОБАЙЛ дээрх ДАРААЛАЛ одоо:
                     [төрөл сонгосон] →
                     [Дэлгэрэнгүй хайлт панель — БҮРЭН НЭЭЛТТЭЙ ✓] →
                     [гарчиг] → [чипүүд] → [картууд]
                ⚠️ Панель нь `<aside>` дээр тулгуурласан (DOM-д результатовын
                   ӨМНӨ) — тиймээс мобайлд шүүлт ЭХЭНД гарна ✓
                ↺ БУЦААХ БОЛ: `const [filtersOpen, setFiltersOpen] =
                   useState(false)` төлөв + `${filtersOpen ? '' : 'hidden'}`
                   класс + энэ товчийг буцааж нэмнэ. */}

            {/* Идэвхтэй хайлтууд — «чип» хэлбэрээр (✕ дарж ТУС ТУСАД нь арилгана).
                🆕 2026-09-30: толгойд нь ТОО нэмэгдэв («Хайлт (3)») — eBay-ийн
                   «N filters applied» мөр шиг хэрэглэгч хэдэн нөхцөл тавснаа
                   нэг харцаар мэдэнэ ✓ (товчны тоо нь sidebar-ийн badge-тай
                   ИЖИЛ `activeFilterCount` — хоёр газар хоёр өөр тоо гарахгүй ✓) */}
            {activeFilterChips.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[13px] font-semibold uppercase tracking-wide text-gray-400">
              Хайлт{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </span>
            {activeFilterChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white py-1 pl-2.5 pr-1 text-[13px] font-medium text-gray-700"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => removeFilterChip(chip.key)}
                  aria-label={`${chip.label} хайлтыг хасах`}
                  className="grid h-4 w-4 place-items-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
                >
                  ✕
                </button>
              </span>
            ))}
            <button type="button" onClick={resetAll} className="ml-0.5 text-[13px] font-semibold text-primary hover:underline">
              Бүгдийг цэвэрлэх
            </button>
          </div>
        )}

        {/* CONTENT */}
        {view === 'map' ? (
          <div>
            <div className="h-[560px] overflow-hidden rounded-xl">
              <MapView listings={listings || []} />
            </div>
            {/* 📄 Хуудаслалттай үед газрын зураг ЗӨВХӨН тухайн хуудны зарыг
                (50 хүртэл) харуулна — тодорхой хэлж өгнө (төөрөгдөлөөс сэргийлэв) */}
            <p className="mt-2 text-[13.5px] text-gray-500">
              🗺 Газрын зураг нь зөвхөн <b>энэ хуудны</b> зарыг харуулна
              {total !== null && total > LISTINGS_PAGE_SIZE ? ` (нийт ${total} зарыг хуудаслаж үзнэ үү)` : ''}
            </p>
          </div>
        ) : listings === null ? (
          <div className="px-5 py-16 text-center">
            <div className="spinner"></div>
            <p>Заруудыг ачаалж байна...</p>
          </div>
        ) : loadError ? (
          <div className="mx-auto my-6 max-w-[720px] rounded-2xl border border-red-200 bg-white px-6 py-8 text-center">
            <div className="text-4xl">🔌</div>
            <h3 className="mb-1.5 mt-2.5 text-lg font-semibold text-red-800">Өгөгдлийн сантай холбогдож чадсангүй</h3>
            <p className="[word-break:break-word] rounded-lg border border-red-200 bg-red-50 p-3 text-left text-[13px] text-red-700">{loadError.message}</p>
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3.5 text-left text-[13px] text-gray-700">
              <p><b>Хэрхэн засах вэ:</b></p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                <li><code className="rounded bg-gray-100 px-1.5 py-px text-xs">.env.local</code> доторх <code className="rounded bg-gray-100 px-1.5 py-px text-xs">NEXT_PUBLIC_SUPABASE_URL</code> болон <code className="rounded bg-gray-100 px-1.5 py-px text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>-г шалгана.</li>
                <li>Supabase Dashboard → <b>Project Settings → Data API</b> → Project URL-аа хуулж тавина.</li>
                <li>Терминалд <code className="rounded bg-gray-100 px-1.5 py-px text-xs">npm run check:supabase</code> ажиллуулж баталгаажуулна.</li>
                <li>Дараа нь dev server-ээ дахин эхлүүлнэ: <code className="rounded bg-gray-100 px-1.5 py-px text-xs">npm run dev</code></li>
                <li>
                  <b>Deploy хийсэн сайт</b> (Vercel г.м.) дээр бол env хувьсагчийг <b>тухайн платформд</b>
                  {' '}(<b>Settings → Environment Variables</b>) нэмээд <b>дахин deploy</b> хийнэ.
                  {' '}<code className="rounded bg-gray-100 px-1.5 py-px text-xs">NEXT_PUBLIC_*</code> нь
                  build үед шингэдэг тул restart хангалтгүй — шинэ deployment шаардлагатай.
                </li>
              </ol>
            </div>
            <button className="btn btn-primary mt-4" onClick={load}>↻ Дахин оролдох</button>
          </div>
        ) : listings.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mb-4 text-6xl">🔎</div>
            <h3 className="mb-2 text-xl font-semibold">Зарууд олдсонгүй</h3>
            <p className="text-gray-500">Хайлтаа өөрчилж үзнэ үү. {query && `«${query}»`} {getCategoryLabel(category)}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                author={authors[l.user_id]}
                attrsLine={formatAttrsLine(l.section || section, l.attrs, l.category)}
              />
            ))}
          </div>
        )}

        {/* 📄 ХУУДАСЛАЛТ — 2026-09-27 (хэрэглэгчийн хүсэлт: нэг хуудсанд
            50-аас илүү зар харуулахгүй, page болгох).
            ⚠️ Зөвхөн амжилттай ачаалсан үед (`listings !== null && !loadError`)
               — ачаалж/алдаа/олдоогүй үед хуудаслалт утгагүй ✓
            ⚠️ ХОЁР ГОРИМД (жагсаалт БА газрын зураг) харагдана — эс бөгөөс
               газрын зураг дээр хэрэглэгч 2 дахь хуудас руу шилжих боломжгүй ✗ */}
        {listings !== null && !loadError && listings.length > 0 && (
          <Pagination
            page={page}
            pageCount={total === null ? 1 : Math.max(1, Math.ceil(total / LISTINGS_PAGE_SIZE))}
            total={total}
            hasMore={hasMore}
            onChange={goToPage}
          />
        )}

          </div>
        </div>
      </div>
    </>
  );
}
