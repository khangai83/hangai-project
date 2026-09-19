// ============================================================
// phoneEmail.js — Утасны дугаар ↔ ДОТООД (синтетик) имэйл хөрвүүлэлт
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
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
// Сервер (lib/authServer.js) болон клиент (components/AppProviders.jsx)
// хоёулаа ашигладаг тул Node-ийн удирдлагагүй, ЦЭВЭР CommonJS модуль.
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

module.exports = {
  EMAIL_DOMAIN,
  toLocalPhone,
  isValidMnPhone,
  normalizePhone,
  phoneToEmail,
  isPhoneEmail,
  emailToPhone,
};
