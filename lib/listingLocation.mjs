// ============================================================
// listingLocation.mjs — 📍 «Байршил сонгохгүй» СОНГОЛТЫН ЦЭВЭР ДҮРЭМ
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-06): «Магадгүй зарим хэрэглэгч зарын
//    Байршилаа оруулахыг хүсэхгүй хүн байж магадгүй. Тэдгээр хүмүүст зориулж
//    Байршил хэрэглэхгүй гэсэн сонголтыг (Check box ч юм уу) Байршил хэсэгт
//    оруулж өгье» ⇒ 2-р алхам («📍 Байршил»)-ын ЧЕКБОКС: асаавал
//    хот/дүүрэг/хороо ЦЭВЭРЛЭГДЭж, зар нь БАЙРШИЛГҮЙ хадгалагдана ✓
//
// ⚠️ ЯАГААД ТУСДАА МОДУЛЬ ВЭ: нэг дүрмийг форм · шалгалт · харуулалт
//    ГУРВУУЛАА хэрэглэнэ — давхардуулбал зөрөх эрсдэлтэй ✗
//    (ж: «`city` хоосон» гэдэг нь ① «сонгоогүй» (алдаа) юу эсвэл
//     ② «байршил заахгүй гэж ШИЙДСЭН» үү — ЗӨВХӨН чекбоксоор
//     (`noLocation`) ялгагдана. Хоёулаа `city === ''` байдаг тул нэг
//     шалгалтаар илэрхийлэх боломжгүй ✗)
//
// ⚠️ DB ӨӨРЧЛӨЛТ 0 (migration ХЭРЭГГҮЙ):
//    • `city` нь `text not null default 'Улаанбаатар'` (0001) тул `''` утга
//      нь ХҮЧИНТЭЙ (constraint-ийг хөндөхгүй ✓); `null` ХИЙХ болбол
//      `drop not null` migration шаардана ✗ — тиймээс `''` сонгов
//    • `noLocation` нь ЗӨВХӨН форм/нооргийн талбар — `lib/queries.js →
//      listingPayloadToRow()` нь танихгүй түлхүүрийг DB рүү ЯВУУЛАХГҮЙ ✓
//    • Дүрслэл дээр `''`/`null` нь аль хэдийн «байршилгүй» гэж зөв
//      ажилладаг (`formatAddress()` → `''`, карт дээр мөр гарахгүй ✓)
//
// ХАМРАХ ХҮРЭЭ (цэвэр — Node тест `scripts/test-location-optional.mjs`):
//   ① `isNoLocation(x)`      — чекбокс асаалттай эсэх (форм эсвэл DB мөр)
//   ② `hasLocation(x)`       — форм/зар дээр БОДИТ байршил байгаа эсэх
//   ③ `locationMissing(x)`   — шалгалт: «сонгохгүй гэж шийдээгүй атлаа
//      хоосон» (validateStep-ийн «Хот/Аймгаа сонгоно уу» нөхцөл)
//   ④ `noLocationPatch()`    — чекбокс АСААХАД форм руу орох өөрчлөлт
//   ⑤ `bankedLocation(form)` · `restoreLocationPatch(banked)` — чекбокс
//      УНТРААХАД сонгосон байршлыг БУЦААХ дүрэм (алдагдахгүй ✓)
//   ⑥ `locationPathText(x)`  — 3-р алхмын 🖥 «📍 Зарын байршил» мөрийн текст
//   ⑦ МЭДЭЭЛЛИЙН текст (`NO_LOCATION_*`) — UI ба тест НЭГ эх сурвалж
// ============================================================

/**
 * Анхдагч хот/аймаг — ⚠️ `AddListingClient.emptyForm()` ба
 * `listingToForm()` хоёулаа ЭНЭ утгыг л ашиглана (нэг эх сурвалж ✓)
 */
export const DEFAULT_CITY = 'Улаанбаатар';

/**
 * Зар дээр байршил БАЙХГҮЙ үед харагдах текст.
 * ⚠️ «Хаяг тодорхойгүй» (алдаа/дутуу мэт) БИШ — «заагаагүй» (санаатай
 *    шийдвэр) гэж бичнэ: хэрэглэгч байршлаа ЗОРИУДОО заагаагүй тул
 *    түүнийг «алдаа» мэт харуулах нь буруу ✗
 */
export const NO_LOCATION_LABEL = 'Байршил заагаагүй';

/** Чекбоксын гарчиг (2-р алхам — 📍 Байршил) */
export const NO_LOCATION_TITLE = '📍 Байршил сонгохгүй';

/** Чекбоксын доорх тайлбар (юу болохыг товч хэлнэ) */
export const NO_LOCATION_HINT =
  'Хот / дүүрэг / хороогоо заахыг хүсэхгүй бол сонгоно уу — зар дээр байршил ХАРАГДАХГҮЙ';

/** Чекбокс АСААЛТТАЙ үеийн 2-р алхмын хураангуй мөр
 *  ⚠️ 2026-10-06 (2 дахь засвар): чекбокс нь энэ мөрийн ДООР байрлана
 *     (хэрэглэгчийн хүсэлт: «Байршил сонгохгүй гэсэн чекбоксыг байршил
 *     оруулах хэсгийнхээ ДООД талд нь оруулаад байрыг нь солиод өгөөч»)
 *     ⇒ заавар нь «доорх» гэж заана ✓ */
export const NO_LOCATION_SUMMARY =
  '🚫 Байршил заагаагүй — зар дээр хот/дүүрэг/хороо харагдахгүй. '
  + 'Заах бол доорх чекбоксыг УНТРААНА уу.';

/** Мөр текстийн тусгаарлагч (🖥 «📍 Зарын байршил» — «Улаанбаатар — Баянгол») */
const PATH_SEP = ' — ';

/** Мөр/объект эсэхийг аюулгүй шалгана (null/undefined/тоо гэх мэт → `''`) */
function textOf(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * 🗺 Солбицлын тоо (2026-10-06) — `null`/`''`/`undefined` нь `null` (пингүй).
 *    ⚠️ Локал туслах (`lib/locationGeo.mjs`-ийг импортлохгүй): энэ модуль
 *       нь зөвхөн «байршил сонгохгүй» чекбоксын дүрэм — солбицлын утгыг
 *       зөвхөн ДАМЖУУЛНА (шинэ талбар нэмэхгүй, migration 0 ✓)
 */
function coordNum(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}


/**
 * Чекбокс («Байршил сонгохгүй») АСААЛТТАЙ эсэх.
 * ⚠️ ЗӨВХӨН `=== true` — «бохир» утга (`'true'`, `1`) нь хүчингүй
 *    (`?edit=`/ноорог/JSON-оос ирэх боломжтой; алдаа шидэхгүй ✓)
 * @param {{noLocation?: boolean}|null|undefined} x форм эсвэл DB-ийн мөр
 */
export function isNoLocation(x) {
  return !!x && x.noLocation === true;
}

/** Хот/Аймгийн цэвэр утга (`''` — заагаагүй) */
export function cityOf(x) {
  return x ? textOf(x.city) : '';
}

/**
 * Форм/зар дээр БОДИТ байршил байгаа эсэх.
 * ⚠️ Чекбокс асаалттай бол `city` үлдсэн ч `false` — «байршил заахгүй»
 *    гэсэн шийдвэр нь давамгайлна (нэг эх сурвалж: `noLocation` ✓)
 * ⚠️ DB-ийн мөрөнд `noLocation` БАЙХГҮЙ (багана нэмээгүй) — тэнд `city === ''`
 *    нь өөрөө хангалттай дохио ✓
 */
export function hasLocation(x) {
  return !isNoLocation(x) && cityOf(x) !== '';
}

/**
 * ШАЛГАЛТ (`validateStep('location')`): «сонгохгүй гэж ШИЙДЭЭГҮЙ атлаа
 * хоосон» — өөрөөр хэлбэл чекбокс ч унтраалттай, хот ч сонгоогүй.
 * ⚠️ Чекбокс асаалттай бол `false` ⇒ «Хот/Аймгаа сонгоно уу» гарахгүй ✓
 */
export function locationMissing(x) {
  return !isNoLocation(x) && cityOf(x) === '';
}

/**
 * Чекбокс АСААХАД формын өөрчлөлт — 3 талбар БҮГД цэвэрлэгдэнэ.
 * ⚠️ `city`-г хоослохгүй бол форм дээр «сонгосон» мэт харагдаж, дараа нь
 *    чекбокс унтраахад «буцаж ирсэн» мэт төөрөгдүүлнэ ✗
 * ⚠️ 🗺 Солбицол (`latitude`/`longitude`) ч `null` болно — эс бөгөөс
 *    байршилгүй зар газрын зураг дээр ГАРАХ болов ✗
 * @returns {{noLocation: boolean, city: string, district: string, khoroo: string, latitude: null, longitude: null}}
 */
export function noLocationPatch() {
  return { noLocation: true, city: '', district: '', khoroo: '', latitude: null, longitude: null };
}

/**
 * Чекбокс УНТРААХАД буцаах байршлыг «банк»-анд хадгалах.
 * ⚠️ Хоосон/сонгоогүй үед `null` — тэгвэл `DEFAULT_CITY` руу буцна ✓
 * ⚠️ 🗺 Солбицол (`latitude`/`longitude`) нь бас «банк»-анд орно — чекбокс
 *    унтраахад газрын зураг дээрх пин БУЦАЖ ирнэ (алдагдахгүй ✓)
 * @returns {{city: string, district: string, khoroo: string, latitude: number|null, longitude: number|null}|null}
 */
export function bankedLocation(form) {
  if (!hasLocation(form)) return null;
  return {
    city: cityOf(form),
    district: textOf(form && form.district),
    khoroo: textOf(form && form.khoroo),
    latitude: coordNum(form && form.latitude),
    longitude: coordNum(form && form.longitude),
  };
}

/**
 * Чекбокс УНТРААХАД формын өөрчлөлт.
 * ⚠️ Хэрэглэгчийн өмнө сонгосон байршил нь БУЦАЖ ирнэ (алдагдахгүй ✓);
 *    байхгүй бол анхдагч (`DEFAULT_CITY`) — «хоосон үлдээж, дараа нь алдаа
 *    харуулах» нь төөрөгдүүлэх тул сонгов ✓
 * ⚠️ 🗺 Солбицол нь банкаас буцаж ирнэ (байхгүй бол `null` ✓)
 * @param {{city?: string, district?: string, khoroo?: string, latitude?: number|null, longitude?: number|null}|null} banked
 */
export function restoreLocationPatch(banked) {
  return {
    noLocation: false,
    city: (banked && cityOf(banked)) || DEFAULT_CITY,
    district: textOf(banked && banked.district),
    khoroo: textOf(banked && banked.khoroo),
    latitude: coordNum(banked && banked.latitude),
    longitude: coordNum(banked && banked.longitude),
  };
}

/**
 * 📍 Зарын байршлын мөр (🖥 3-р алхмын хураангуй, 📱 дэлгэрэнгүй дэлгэц).
 * ⚠️ Чекбокс асаалттай бол `NO_LOCATION_LABEL`, эс бөгөөс «хот — дүүрэг —
 *    хороо» (хоосон хэсгүүд хасагдана; сонгоогүй үед `''` — ХУУЧИН зан ✓)
 * @param {{noLocation?: boolean, city?: string, district?: string, khoroo?: string}} x
 * @param {string} [sep]
 */
export function locationPathText(x, sep = PATH_SEP) {
  if (isNoLocation(x)) return NO_LOCATION_LABEL;
  return [cityOf(x), textOf(x && x.district), textOf(x && x.khoroo)]
    .filter(Boolean)
    .join(sep);
}
