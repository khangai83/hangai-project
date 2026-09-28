// ============================================================
// test-phone.mjs — 📞 УТАСНЫ ДУГААРААР ХАЙХ ДҮРЭМ + хөрвүүлэлтийн тест
//                  (lib/phoneEmail.js)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-09-29):
//   Хэрэглэгчийн гомдол: «утасны дугаараар нь зарын эзний оруулсан заруудыг
//   хайхаар гарч ирэхгүй байгаа» ✗ — нийтийн хайлт (`lib/queries.js`) нь
//   `phone` баганыг огт хайдаггүй байв. Одоо `phoneSearchPatterns()` нь
//   НЭГ ЭХ СУРВАЛЖ бөгөөд:
//     • зөвхөн цифрээр хайна (`+976 9911-2233` = `99112233` ✓)
//     • сүүлийн 8 цифрийг авна (DB-д «97699112233» ба «99112233» хоёулаа
//       байгаа тул `%99112233%` нь ХОЁУЛАНД таарна ✓)
//     • 6-аас богино тоог ХАЙХГҮЙ (ж: «2020» нь 976**2020**xxxx-д
//       санамсаргүй таарахгүй ✓)
//   Энэ тест дээрх гэрээг түгждэг — дүрэм өөрчлөгдвөл ТЕСТ УНАЖ мэдэгдэнэ ✓
//
// АЖИЛЛУУЛАХ: npm run test:phone
// ============================================================
import assert from 'node:assert/strict';
import phoneEmail from '../lib/phoneEmail.js';

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 Утасны дугаар (`lib/phoneEmail.js`)\n');

// ---- ① 📞 Утсаар хайх LIKE хэв маяг ----
t("'99112233' → ['%99112233%'] (8 орон хэвээр)", () => {
  assert.deepEqual(phoneEmail.phoneSearchPatterns('99112233'), ['%99112233%']);
});

t("'+976 9911-2233' → сүүлийн 8 цифр (зай/зурвас/+ үл хамаарна)", () => {
  assert.deepEqual(phoneEmail.phoneSearchPatterns('+976 9911-2233'), ['%99112233%']);
  assert.deepEqual(phoneEmail.phoneSearchPatterns('976-9911 2233'), ['%99112233%']);
});

t("'97699112233' → '%99112233%' (12 орон → сүүлийн 8)", () => {
  assert.deepEqual(phoneEmail.phoneSearchPatterns('97699112233'), ['%99112233%']);
});

t("⚠️ DB-ийн хоёр хэлбэрт таарахыг батална: '97699112233' ба '99112233'", () => {
  const [pattern] = phoneEmail.phoneSearchPatterns('99112233');
  const core = pattern.replace(/%/g, '');
  assert.ok('97699112233'.includes(core), '12 оронтой хадгалалтад таарах ёстой');
  assert.ok('99112233'.includes(core), '8 оронтой хадгалалтад таарах ёстой');
});

t('6-аас богино цифр → ХАЙХГҮЙ (санамсаргүй таарахаас сэргийлнэ)', () => {
  for (const q of ['2020', '12', '991122', '1', '', null, undefined, '₮280000000']) {
    const patterns = phoneEmail.phoneSearchPatterns(q);
    if (String(q || '').replace(/\D/g, '').length >= 6) {
      assert.equal(patterns.length, 1, `«${q}» нь утасны хэв маягтай байх ёстой`);
    } else {
      assert.deepEqual(patterns, [], `«${q}» нь утасны хайлт хийх ёсгүй`);
    }
  }
});

t('Текст хайлт утасны хэв маяг ҮҮСГЭХГҮЙ (дижитал бус тэмдэгт агуулбал)', () => {
  assert.deepEqual(phoneEmail.phoneSearchPatterns('Баянгол'), []);
  assert.deepEqual(phoneEmail.phoneSearchPatterns('5-р хороо'), []);
  assert.equal(phoneEmail.looksLikePhone('Баянгол'), false);
  assert.equal(phoneEmail.looksLikePhone('99112233'), true);
});

t('phoneSearchDigits: зөвхөн цифр, хамгийн ихдээ 8 орон', () => {
  assert.equal(phoneEmail.phoneSearchDigits('99112233'), '99112233');
  assert.equal(phoneEmail.phoneSearchDigits('+976 9911-2233'), '99112233');
  assert.equal(phoneEmail.phoneSearchDigits('Баянгол'), '');
});

// ---- ② 🔑 Хөрвүүлэлт (регресс БАЙХГҮЙ) ----
t("toLocalPhone: '99112233' / '97699112233' / '+976 9911-2233' → '99112233'", () => {
  for (const p of ['99112233', '97699112233', '+976 9911-2233', '099112233']) {
    assert.equal(phoneEmail.toLocalPhone(p), '99112233');
  }
});

t('isValidMnPhone: 8 оронтой 5x–9x ✓, бусад ✗', () => {
  assert.equal(phoneEmail.isValidMnPhone('99112233'), true);
  assert.equal(phoneEmail.isValidMnPhone('88093663'), true);
  assert.equal(phoneEmail.isValidMnPhone('12345678'), false);
  assert.equal(phoneEmail.isValidMnPhone('9911223'), false);
});

t("phoneToEmail / emailToPhone: '99112233' ↔ '+97699112233'", () => {
  const email = phoneEmail.phoneToEmail('99112233');
  assert.equal(email, '99112233@phone.zarmn.mn');
  assert.equal(phoneEmail.isPhoneEmail(email), true);
  assert.equal(phoneEmail.emailToPhone(email), '+97699112233');
  assert.equal(phoneEmail.emailToPhone('someone@gmail.com'), null);
});

t('normalizePhone: E.164 хэлбэр (+976…)', () => {
  assert.equal(phoneEmail.normalizePhone('99112233'), '+97699112233');
  assert.equal(phoneEmail.normalizePhone('9911-2233'), '+97699112233');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);
