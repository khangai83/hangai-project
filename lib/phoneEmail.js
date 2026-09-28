// ============================================================
// phoneEmail.js — УТАСНЫ НЭГДСЭН МОДУЛЬ
//   ① Утасны дугаар ↔ ДОТООД (синтетик) имэйл хөрвүүлэлт
//   ② Утасны дугаараар ХАЙХ дүрэм (`phoneSearchPatterns` — 2026-09-29)
//
// ---- ① ЯАГААД ХЭРЭГТЭЙ ВЭ: ----
//   Supabase-ийн "Phone" provider нь төслийн тохиргооноос хамаарч идэвхгүй
//   байж болно (508 login: `phone_provider_disabled`). Тэр тохиолдолд утасны
//   дугаарыг хэрэглэгчийн таних тэмдэг болгон `976XXXXXXXX@phone.zarmn.mn`
//   хэлбэрийн ДОТООД имэйл рүү буулгаж, "Email" provider-ээр (ихэвчлэн аль
//   хэдийн идэвхтэй) бүртгэж/нэвтэрнэ. Ингэснээр dashboard дээр юу ч
//   өөрчлөх шаардлагагүй.
//
//   Хэрэглэгч UI дээр ЗӨВХӨН утсаа харна — имэйл хэзээ ч харагдахгүй,
//   хэзээ ч илгээгдэхгүй (createUser дээр email_confirm: true).
//
// ---- ② ЯАГААД ЭНД ВЭ (хайлтын дүрэм): ----
//   Хэрэглэгчийн гомдол: «утасны дугаараар нь зарын эзний оруулсан заруудыг
//   хайхаар гарч ирэхгүй байгаа» ✗ → нийтийн хайлт (`lib/queries.js`) болон
//   админ хайлт (`lib/adminAuth.js`) ХОЁУЛАА нэг дүрэм ашиглах ёстой.
//   ⚠️ `lib/adminAuth.js` нь CommonJS (`require`) тул `.mjs` модуль хэрэглэж
//      чадахгүй — тиймээс дүрэм нь ЭНЭ (CommonJS) модульд байна ✓
//
// Сервер (lib/authServer.js, lib/adminAuth.js) болон клиент
// (components/AppProviders.jsx, lib/queries.js) хоёулаа ашигладаг тул
// Node-ийн удирдлагагүй, ЦЭВЭР CommonJS модуль.
// ⚠️ normalizePhone нь lib/format.js дахь хувилбартай ижил утгатай байх ёстой.
// ============================================================

const EMAIL_DOMAIN = 'phone.zarmn.mn';

/** 99112233 / 97699112233 / +976 9911-2233 → '99112233' */
function toLocalPhone(phone) {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.startsWith('976')) p = p.slice(3);
  if (p.startsWith('0')) p = p.slice(1);
  return p;
}

/** Монгол утасны 8 оронтой дугаар мөн эсэх (5x–9x) */
function isValidMnPhone(phone) {
  return /^[5-9]\d{7}$/.test(toLocalPhone(phone));
}

/** Supabase Auth-д зориулсан E.164 хэлбэр: +97699112233 */
function normalizePhone(phone) {
  return `+976${toLocalPhone(phone)}`;
}

/** Дотоод (синтетик) имэйл: 99112233 → '97699112233@phone.zarmn.mn' */
function phoneToEmail(phone) {
  return `${toLocalPhone(phone)}@${EMAIL_DOMAIN}`;
}

/** Дотоод имэйл мөн эсэх (ж: user.email-ээс утас гаргаж авах) */
function isPhoneEmail(email) {
  return typeof email === 'string' && email.endsWith(`@${EMAIL_DOMAIN}`);
}

/** '97699112233@phone.zarmn.mn' → '+97699112233' (эс бөгөөс null) */
function emailToPhone(email) {
  if (!isPhoneEmail(email)) return null;
  const local = email.split('@')[0].replace(/\D/g, '').slice(-8);
  return local.length === 8 ? `+976${local}` : null;
}

// ============================================================
// ② 📞 УТАСНЫ ДУГААРААР ХАЙХ ДҮРЭМ (2026-09-29)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Нийтийн хайлт (`lib/queries.js` → `applyListingFilters`) нь `phone`
//   баганыг ОГТ хайдаггүй байв → зарын эзний утсаар хайхад юу ч гардаггүй
//   байсан ✗ (зөвхөн админ хайлт л чаддаг байв). Хоёр газарт хоёр өөр дүрэм
//   үүсэхээс сэргийлж энэ НЭГ ЭХ СУРВАЛЖ-ыг хоёулаа ашиглана ✓
//
// ⚠️ `listings.phone` нь DB-д ХОЁР хэлбэрээр хадгалагдсан байж болно:
//      1) «97699112233» — 12 орон (AddListingModal, seed-sections.mjs ✓
//         ОДООГИЙН форм)
//      2) «99112233»    — 8 орон (хуучин seed-supabase.js)
//      эсвэл null (утасгүй зар — таарахгүй байх нь ЗӨВ ✓)
//    `%99112233%` гэж хайвал ХОЁУЛАА таарна ✓ (substring)
//
// ⚠️ Хэрэглэгч «99112233», «+976 9911-2233», «976-9911 2233» гэж бичиж
//    болно — бүгд ИЖИЛ үр дүн өгөх ёстой. `ilike` нь зурвас/зай/`+`-д
//    ХЭЗЭЭ Ч таарахгүй тул зөвхөн ЦИФРЭЭС бүрдсэн хэв маяг үүсгэнэ ✓
//
// ⚠️ Хэт богино тоо (ж: «12», «2020») нь БҮХ дугаарт санамсаргүй таарч,
//    хайлтыг утгагүй болгоно (ж: «2020» → 976**2020**xxxx) → доод хязгаар
//    `MIN_PHONE_SEARCH_DIGITS` (6) цифр ✓
//
// ⚠️ 8-аас урт (ж: 12 оронтой «97699112233») бичсэн бол СҮҮЛИЙН 8 цифрээр
//    хайна — ингэснээр 8-оронтой хадгалагдсан (2) хэлбэрийн зар ч олдоно ✓
// ============================================================

/** Утсаар хайх хамгийн бага цифрийн тоо (богино тоо санамсаргүй таарахаас сэргийлнэ) */
const MIN_PHONE_SEARCH_DIGITS = 6;

/**
 * Хайлтын үгээс утасны дугаарын «цөм» гаргах.
 *   '99112233'        → '99112233'
 *   '+976 9911-2233'  → '99112233'  (12 цифр → сүүлийн 8)
 *   'Баянгол'         → ''          (цифр байхгүй)
 *
 * @param {unknown} query хайлтын үг
 * @returns {string} зөвхөн цифр (хамгийн ихдээ 8 орон)
 */
function phoneSearchDigits(query) {
  const digits = String(query == null ? '' : query).replace(/\D/g, '');
  return digits.length > 8 ? digits.slice(-8) : digits;
}

/**
 * PostgREST-ийн `phone.ilike.<хэв маяг>`-д зориулсан LIKE хэв маягууд.
 *
 * @param {unknown} query хайлтын үг
 * @returns {string[]} `['%99112233%']` эсвэл `[]` (утасны хайлт хийхгүй)
 */
function phoneSearchPatterns(query) {
  const digits = phoneSearchDigits(query);
  if (digits.length < MIN_PHONE_SEARCH_DIGITS) return [];
  return [`%${digits}%`];
}

/** Хайлтын үг утасны дугаар шиг үү (ж: `99112233`, `+976 9911-2233`)? */
function looksLikePhone(query) {
  return phoneSearchPatterns(query).length > 0;
}

module.exports = {
  EMAIL_DOMAIN,
  toLocalPhone,
  isValidMnPhone,
  normalizePhone,
  phoneToEmail,
  isPhoneEmail,
  emailToPhone,
  // 📞 хайлтын дүрэм (2026-09-29)
  MIN_PHONE_SEARCH_DIGITS,
  phoneSearchDigits,
  phoneSearchPatterns,
  looksLikePhone,
};
