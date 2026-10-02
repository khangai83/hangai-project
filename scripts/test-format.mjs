// ============================================================
// test-format.mjs — ҮНИЙН ФОРМАТЛАЛТЫН тест (lib/format.js)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Үнэ буруу форматлагдвал хэрэглэгч «250,000,000»-ийг 10 дахин зөрүүлж
//   оруулна, эсвэл таслалтай утга DB рүү явж үнэ ЧИМЭЭГҮЙ 0 болно
//   (queries.js → toNumber нь «,»-г аравтын бутархай гэж үздэг).
//   Энэ тест тэр эрсдэлийг бариулна.
//
// АЖИЛЛУУЛАХ:  npm run test:format
//
// ⚠️ ТЕХНИКИЙН ТЭМДЭГЛЭЛ: `lib/format.js` нь `./locationData`-г ӨРГӨТГӨЛГҮЙ
//    (extensionless) импортолдог тул Node-ийн ESM resolver шууд ажиллахгүй.
//    Тиймээс тестийн зорилгоор ЗӨВХӨН тэр импортын мөрийг хасч, түр файл
//    үүсгэн ачаална. (Үнийн функцууд нь locationData-аас хамаардаггүй.)
//    Цэвэр хувилбар: `lib/activityWindows.mjs` шиг import-гүй модуль болгох.
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '..', 'lib', 'format.js');
const raw = fs.readFileSync(SRC, 'utf8');
const stripped = raw.replace(/^import .*from '\.\/locationData';?$/m, '');
assert(!/^import /m.test(stripped), 'бүх import хасагдсан байх ёстой');
const tmp = path.join(here, '..', '.format.test.tmp.mjs');
fs.writeFileSync(tmp, stripped);

const { formatThousands, digitCount, shortPrice, isNegotiablePrice, priceLabel, hasRealPrice, negotiableNote, NEGOTIABLE_PRICE_LABEL, listingTitle, MAX_LISTING_TITLE_LENGTH } = await import(`${tmp}?t=${Date.now()}`);
fs.unlinkSync(tmp);

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 Үнийн форматлалт (lib/format.js)\n');

t("formatThousands: '250000000' → '250,000,000'", () => {
  assert.equal(formatThousands('250000000'), '250,000,000');
});

t('formatThousands: тоо (number) ч зөв', () => {
  assert.equal(formatThousands(250000000), '250,000,000');
});

t("formatThousands: зайтай '250 000 000' ч зөв (буулгасан үед)", () => {
  assert.equal(formatThousands('250 000 000'), '250,000,000');
});

t("formatThousands: таслалтай '250,000,000' → давхар таслал үүсэхгүй", () => {
  assert.equal(formatThousands('250,000,000'), '250,000,000');
});

t('formatThousands: ₮ тэмдэгт, үсэг алгасагдана', () => {
  assert.equal(formatThousands('₮ 250000000'), '250,000,000');
  assert.equal(formatThousands('abc'), '');
});

t("formatThousands: эхний тэгүүд хасагдана ('0007' → '7')", () => {
  assert.equal(formatThousands('0007'), '7');
  assert.equal(formatThousands('000'), '0');
});

t("formatThousands: хоосон/null/undefined → ''", () => {
  assert.equal(formatThousands(''), '');
  assert.equal(formatThousands(null), '');
  assert.equal(formatThousands(undefined), '');
});

t('formatThousands: round-trip — цифр хэзээ ч алдагдахгүй/нэмэгдэхгүй', () => {
  for (const d of ['7', '250', '1500000', '250000000', '999999999999999']) {
    assert.equal(formatThousands(d).replace(/\D/g, ''), d);
  }
});

t('digitCount: оронгийн тоо', () => {
  assert.equal(digitCount('250000000'), 9);
  assert.equal(digitCount('250 000 000'), 9);
  assert.equal(digitCount(''), 0);
  assert.equal(digitCount(null), 0);
});

t("shortPrice: сая / тэрбум / мянга", () => {
  assert.equal(shortPrice('250000000'), '250 сая');
  assert.equal(shortPrice('1500000'), '1.5 сая');
  assert.equal(shortPrice('2000000000'), '2 тэрбум');
  assert.equal(shortPrice('70000'), '70 мянга');
  assert.equal(shortPrice('900'), '900');
});

t("shortPrice: 0 / хоосон → '' (хоосон «≈ ₮» харуулахгүй)", () => {
  assert.equal(shortPrice('0'), '');
  assert.equal(shortPrice(''), '');
  assert.equal(shortPrice(null), '');
});

// ============================================================
// 🤝 «ҮНЭ ТОХИРНО» (2026-09-29) — үнэ нь ЗААВАЛ БИШ болсон
// ============================================================
// ⚠️ ЯАГААД ТЕСТЛЭХ ВЭ: үнэ 0 байхад card/detail дээр «₮0» гэж харагдвал
//    хэрэглэгч ҮНЭГҮЙ гэж ойлгоно ✗. Бүх 6 дэлгэц нэг `priceLabel`-ээр
//    ажилладаг тул энэ тест бүх дэлгэцийг хамгаална ✓
t('🤝 isNegotiablePrice: үнэ 0 / хоосон / null → true (үнэ тохирно)', () => {
  assert.equal(isNegotiablePrice({ price: 0 }), true);
  assert.equal(isNegotiablePrice({ price: '' }), true);
  assert.equal(isNegotiablePrice({ price: null }), true);
  assert.equal(isNegotiablePrice({}), true);
  assert.equal(isNegotiablePrice(null), true);
});

t('🤝 isNegotiablePrice: үнэтэй зар → false', () => {
  assert.equal(isNegotiablePrice({ price: 1500000 }), false);
  assert.equal(isNegotiablePrice({ price: '250000' }), false);
  assert.equal(isNegotiablePrice({ price: 1500000, attrs: { condition: 'Шинэ' } }), false);
});

t('🤝 isNegotiablePrice: attrs.negotiable байвал үнэ байсан ч true', () => {
  assert.equal(isNegotiablePrice({ price: 1500000, attrs: { negotiable: 'yes' } }), true);
  assert.equal(isNegotiablePrice({ price: 1500000, attrs: { negotiable: true } }), true);
});

t("🤝 priceLabel: '₮1,500,000' эсвэл 'Үнэ тохирно'", () => {
  assert.equal(priceLabel({ price: 1500000 }), '₮1,500,000');
  assert.equal(priceLabel({ price: 250000000 }), '₮250,000,000');
  assert.equal(priceLabel({ price: 0 }), 'Үнэ тохирно');
  assert.equal(priceLabel({ price: '' }), 'Үнэ тохирно');
  assert.equal(priceLabel({}), 'Үнэ тохирно');
  assert.equal(NEGOTIABLE_PRICE_LABEL, 'Үнэ тохирно');
});

t('🤝 priceLabel: үнэ БИЧСЭН бол «₮…» — «Үнэ тохирно» гэж ДАРАХГҮЙ ✓', () => {
  // 2026-09-29 (хэрэглэгчийн шаардлага): «Үнэ тохирно» тэмдэглэсэн Ч үнэ
  // бичсэн бол үнэ ХЭВЭЭР харагдана, тэмдэглэгч нь ДООР нь тусдаа мөр болно ✓
  assert.equal(priceLabel({ price: 1500000, attrs: { negotiable: 'yes' } }), '₮1,500,000');
  assert.equal(priceLabel({ price: 5000000, attrs: { negotiable: 'yes' } }), '₮5,000,000');
});

t('🤝 hasRealPrice: 0 / хоосон / null → false, тоо → true', () => {
  assert.equal(hasRealPrice({ price: 1500000 }), true);
  assert.equal(hasRealPrice({ price: '1500000' }), true);
  assert.equal(hasRealPrice({ price: 0 }), false);
  assert.equal(hasRealPrice({ price: '' }), false);
  assert.equal(hasRealPrice({ price: null }), false);
  assert.equal(hasRealPrice(null), false);
});

t('🤝 negotiableNote: ЗӨВХӨН (үнэ бичсэн + тэмдэглэсэн) үед «Үнэ тохирно»', () => {
  // ① Үнэ + тэмдэглэсэн → үнийн ДОР нэмэлт мөр гарна ✓
  assert.equal(negotiableNote({ price: 1500000, attrs: { negotiable: 'yes' } }), 'Үнэ тохирно');
  // ② Үнэтэй, тэмдэглээгүй → нэмэлт мөр БАЙХГҮЙ ✓
  assert.equal(negotiableNote({ price: 1500000 }), '');
  assert.equal(negotiableNote({ price: 1500000, attrs: { condition: 'Шинэ' } }), '');
  // ③ Үнэгүй → `priceLabel` өөрөө «Үнэ тохирно» болно, нэмэлт мөр ДАВХАРДАХГҮЙ ✓
  assert.equal(negotiableNote({ price: 0, attrs: { negotiable: 'yes' } }), '');
  assert.equal(negotiableNote({ price: 0 }), '');
  // ④ Тэмдэглэл авах (чекбокс унтраах) → `attrs.negotiable` ХАСАГДАНА
  const attrs = { negotiable: 'yes' };
  delete attrs.negotiable;
  assert.equal(negotiableNote({ price: 1500000, attrs }), '');
});

t('🤝 «Үнэ тохирно» → форм хоосон үнэ илгээнэ → DB-д 0 хадгална', () => {
  // ⚠️ `listings.price` нь `not null default 0` — «үнэ байхгүй» гэдгийг
  //    DB дээр ЗӨВХӨН 0-ээр илэрхийлнэ (NULL боломжгүй).
  const toNumber = (value) => {
    const n = Number(String(value == null ? '' : value).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  assert.equal(Math.trunc(toNumber('')), 0);
  // Round-trip: DB-ээс 0 уншигдсанаа буцаад «Үнэ тохирно» болно ✓
  assert.equal(isNegotiablePrice({ price: Math.trunc(toNumber('')) }), true);
});

t('⚠️ АЛДААНААС СЭРГИЙЛЭХ: queries.js → toNumber()', () => {
  // queries.js доторх toNumber-ийн ЯГ ижил логик
  const toNumber = (value) => {
    const n = Number(String(value == null ? '' : value).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  // Цифрэн утга зөв хөрвөнө
  for (const d of ['250000000', '1500000', '999']) {
    assert.equal(Math.trunc(toNumber(d)), Number(d), `'${d}' зөв хөрвөх ёстой`);
  }
  // ⚠️ Таслалтай утга → '250.000.000' → NaN → isFinite=false → 0
  assert.equal(Math.trunc(toNumber('250,000,000')), 0, '→ таслалтай утга 0 болж ЭВДЭРНЭ');
  console.log("     ⚠️ '250,000,000' → toNumber → 0  (үнэ ЧИМЭЭГҮЙ 0 болно!)");
  console.log('     ✅ Тиймээс форм нь зөвхөн ЦИФР хадгалж, таслалыг зөвхөн харагдацад хэрэглэнэ.');
});

// ============================================================
// 🏷️ ЗАРЫН ГАРЧИГ (0027_listing_title.sql) — 2026-10-02
// ============================================================
// ⚠️ ЯАГААД ТЕСТЛЭХ ВЭ: гарчиг нь зарын карт дээр үнийн доор харагддаг ч
//    ЗААВАЛ БИШ талбар — 0027 орохоос өмнөх зарууд дээр багана нь `null`.
//    Хоосон утга нь МӨР БОЛЖ ГАРАХГҮЙ байх ЁСТОЙ (эс бөгөөс карт бүр дээр
//    хоосон зай эсвэл `undefined` гарч ирнэ ✗)
t('🏷️ listingTitle: гарчигтай бол тэр текстээ буцаана', () => {
  assert.equal(listingTitle({ title: '3 өрөө байр, Баянгол' }), '3 өрөө байр, Баянгол');
  // ⚠️ Туршилтын (seed) заруудын жишээ гарчиг
  assert.equal(
    listingTitle({ title: 'Хангай дүүрэг, 16-р байр — 3 өрөө' }),
    'Хангай дүүрэг, 16-р байр — 3 өрөө'
  );
});

t("🏷️ listingTitle: `null`/`''`/зай/байхгүй → `''` (карт дээр мөр ГАРАХГҮЙ)", () => {
  assert.equal(listingTitle({ title: null }), '');
  assert.equal(listingTitle({ title: undefined }), '');
  assert.equal(listingTitle({ title: '' }), '');
  assert.equal(listingTitle({ title: '   ' }), '');
  assert.equal(listingTitle({ title: '\n\t ' }), '');
  // ⚠️ 0027 ороогүй DB-ээс `select *` хийхэд багана ОГТ ирэхгүй → крашгүй ✓
  assert.equal(listingTitle({ property_type: 'Орон сууц' }), '');
  assert.equal(listingTitle({}), '');
  assert.equal(listingTitle(null), '');
});

t('🏷️ listingTitle: олон зай/мөр таслалт НЭГ зай болов (карт 1 мөр — `truncate`)', () => {
  assert.equal(listingTitle({ title: '  3 өрөө \n байр,\t Баянгол  ' }), '3 өрөө байр, Баянгол');
  assert.equal(listingTitle({ title: 'A\nB' }), 'A B');
});

t(`🏷️ listingTitle: ${MAX_LISTING_TITLE_LENGTH} тэмдэгтээр таслагдана (DB CHECK-тай ИЖИЛ)`, () => {
  // ⚠️ DB-ийн CHECK (`char_length(btrim(title)) between 1 and 120`) ба форм
  //    (`maxLength`) ба энэ функц — ГУРВУУЛАА ижил хязгаартай байх ёстой,
  //    эс бөгөөс insert нь CHECK-д унана ✗
  assert.equal(MAX_LISTING_TITLE_LENGTH, 120);
  assert.equal(listingTitle({ title: 'а'.repeat(120) }).length, 120);
  assert.equal(listingTitle({ title: 'а'.repeat(200) }).length, 120);
  // Таслагдсаны дараах утга нь ЭХНИЙ 120 тэмдэгт байх ёстой ✓
  assert.equal(listingTitle({ title: `${'а'.repeat(119)}X` }), `${'а'.repeat(119)}X`);
  assert.equal(listingTitle({ title: `${'а'.repeat(120)}X` }), 'а'.repeat(120));
});

t('🏷️ listingTitle: тоон/бусад төрөл ч текст болно (крашгүй)', () => {
  assert.equal(listingTitle({ title: 12345 }), '12345');
  assert.equal(listingTitle({ title: '  abc123  ' }), 'abc123');
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);
