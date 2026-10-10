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

const { formatThousands, digitCount, shortPrice, isNegotiablePrice, priceLabel, shortPriceLabel, hasRealPrice, negotiableNote, NEGOTIABLE_PRICE_LABEL, listingTitle, carTitle, notebookTitle, MAX_LISTING_TITLE_LENGTH, shortListingId, SHORT_LISTING_ID_LENGTH } = await import(`${tmp}?t=${Date.now()}`);
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

// ============================================================
// 📉 ТОВЧ ҮНИЙН ШОШГО (2026-10-06) — карт ба дэлгэрэнгүй хуудас
// ============================================================
// ⚠️ ЯАГААД ТЕСТЛЭХ ВЭ: хэрэглэгчийн хүсэлтээр КАРТ (`ListingCard`) ба
//    ДЭЛГЭРЭНГҮЙ (`ListingDetailClient`) дээр «760,000,000» БИШ «760 сая ₮»
//    харагдах ёстой. `shortPriceLabel` нь `priceLabel`-ыг (экспорт/админ)
//    ХӨНДӨХГҮЙ тул хоёр функцийг ЗЭРЭГ шалгана ✓
t('📉 shortPriceLabel: карт/дэлгэрэнгүйд ТОВЧ үнэ («760 сая ₮», «44.8 сая ₮»)', () => {
  assert.equal(shortPriceLabel({ price: 760000000 }), '760 сая ₮');
  assert.equal(shortPriceLabel({ price: 44800000 }), '44.8 сая ₮');
  assert.equal(shortPriceLabel({ price: 2000000000 }), '2 тэрбум ₮');
  assert.equal(shortPriceLabel({ price: 250000000 }), '250 сая ₮');
  // ⚠️ «₮» нь ТӨГСГӨЛД; экспорт/админы `priceLabel` нь ХӨНДӨӨГДӨӨГҮЙ (эхэнд) ✓
  assert.equal(priceLabel({ price: 760000000 }), '₮760,000,000');
});

t('📉 shortPriceLabel: үнэгүй → «Үнэ тохирно» / ажил дээр «Цалин тохиролцоно»', () => {
  assert.equal(shortPriceLabel({ price: 0 }), 'Үнэ тохирно');
  assert.equal(shortPriceLabel({ price: '' }), 'Үнэ тохирно');
  assert.equal(shortPriceLabel({}), 'Үнэ тохирно');
  assert.equal(shortPriceLabel(null), 'Үнэ тохирно');
  assert.equal(shortPriceLabel({ price: 0, section: 'jobs' }), 'Цалин тохиролцоно');
  // 🙅 Үнэ БИЧСЭН + «тохирно» тэмдэглэсэн ч үнэ ХЭВЭЭР (товч хэлбэрээр) гарна —
  //    `priceLabel`-тай ЯГ ИЖИЛ дүрэм (тэмдэглэгчийг `negotiableNote` харуулна ✓)
  assert.equal(shortPriceLabel({ price: 44800000, attrs: { negotiable: 'yes' } }), '44.8 сая ₮');
  assert.equal(shortPriceLabel({ price: 1500000, section: 'jobs' }), '1.5 сая ₮');
  assert.equal(shortPriceLabel({ price: 900000 }), '900 мянга ₮');
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

// ============================================================
// 🔖 ЗАРЫН ДУГААР (shortListingId) — 2026-10-07
// ============================================================
// ⚠️ ЯАГААД ТЕСТЛЭХ ВЭ: хэрэглэгчийн хүсэлт («зарын id … богино болгож
//    хэрэглэгчдэд харуулах»). `listings.id` нь 36 тэмдэгт uuid — харагдац
//    дээр зөвхөн эхний 8 hex-ийг ТОМ үсгээр харуулна. Энэ нь зөвхөн ХАРАГДАЦ
//    (DB/URL 36 тэмдэгтийн uuid ХЭВЭЭР) тул буруу болбол админ хайлт таарахгүй,
//    эсвэл хэрэглэгч «урт» гэж гомдоллох тул гэрээг түгжинэ ✓
t('🔖 shortListingId: uuid → эхний 8 hex, ТОМ үсэг', () => {
  assert.equal(shortListingId('a1b2c3d4-5e6f-4789-a012-3456789abcde'), 'A1B2C3D4');
  assert.equal(shortListingId('A1B2C3D4-5E6F-4789-A012-3456789ABCDE'), 'A1B2C3D4');
});

t('🔖 shortListingId: урт нь 8 (SHORT_LISTING_ID_LENGTH) ба таслалт зөв', () => {
  assert.equal(SHORT_LISTING_ID_LENGTH, 8);
  assert.equal(shortListingId('a1b2c3d4-5e6f-4789-a012-3456789abcde').length, 8);
  // `-` тусахгүй бол 9 болж, дараагийн тэмдэгт гээгдэнэ ✗
  assert.equal(shortListingId('abcd-ef01-2345'), 'ABCDEF01');
});

t("🔖 shortListingId: хоосон/null/undefined → '' (крашгүй)", () => {
  assert.equal(shortListingId(''), '');
  assert.equal(shortListingId(null), '');
  assert.equal(shortListingId(undefined), '');
});

t('🔖 shortListingId: 8-аас богино утга ч зөв (тоо/бусад төрөл)', () => {
  assert.equal(shortListingId('abc'), 'ABC');
  assert.equal(shortListingId(12345678), '12345678');
});

t('🔖 shortListingId: бүтэн uuid ХЭВЭЭР (зөвхөн харагдац — DB хөндөхгүй)', () => {
  const full = 'a1b2c3d4-5e6f-4789-a012-3456789abcde';
  assert.equal(full.length, 36);
  assert.notEqual(shortListingId(full), full);
  assert.ok(full.startsWith(shortListingId(full).toLowerCase())); // админ хайлт нийцтэй ✓
});

// ============================================================
// 🚗 АВТОМАШИНЫ АВТО-ГАРЧИГ (2026-10-09 (85)) — картын НӨӨЦ гарчиг
// ============================================================
// ⚠️ Хэрэглэгчийн хүсэлт: «Автомашины картыг … мэдээлэлтэй болго» +
//    **жишиг сайт**-ын машин карт: гарчиг нь «Toyota Vellfire, 2017/2026» ✓
// ⚠️ `ListingCard` нь `listingTitle(listing) || carTitle(listing.attrs)` —
//    зар оруулагчийн бичсэн гарчиг БАЙВАЛ түрүүлнэ (энд ЗӨВХӨН нөөц зам ✓)
t('🚗 carTitle: «брэнд + загвар, үйлдвэрлэсэн/орж ирсэн он»', () => {
  assert.equal(
    carTitle({ brand: 'Toyota', model: 'Vellfire', year: '2017', importYear: '2026' }),
    'Toyota Vellfire, 2017/2026'
  );
  assert.equal(
    carTitle({ brand: 'Toyota', model: 'Aqua', year: '2013', importYear: '2020' }),
    'Toyota Aqua, 2013/2020'
  );
});

t('🚗 carTitle: он нэг нь л байвал/огт байхгүй бол ДАВХАРЛАХГҮЙ', () => {
  assert.equal(carTitle({ brand: 'Toyota', model: 'Prius', year: '2011' }), 'Toyota Prius, 2011');
  assert.equal(carTitle({ brand: 'Toyota', model: 'Prius', importYear: '2018' }), 'Toyota Prius, 2018');
  assert.equal(carTitle({ brand: 'Toyota', model: 'Prius' }), 'Toyota Prius');
  // ⚠️ Хоёр он ИЖИЛ бол «2018/2018» гэж ГАРАХГҮЙ ✓
  assert.equal(
    carTitle({ brand: 'Toyota', model: 'Prius', year: '2018', importYear: '2018' }),
    'Toyota Prius, 2018'
  );
});

t("🚗 carTitle: брэнд ч, загвар ч хоосон → '' (карт дээр мөр ГАРАХГҮЙ)", () => {
  assert.equal(carTitle(null), '');
  assert.equal(carTitle(undefined), '');
  assert.equal(carTitle({}), '');
  assert.equal(carTitle({ year: '2017', importYear: '2026' }), ''); // он дангаараа гарчиг БОЛОХГҮЙ
  assert.equal(carTitle('Toyota'), ''); // текст → крашгүй
  assert.equal(carTitle(['Toyota']), ''); // массив → крашгүй
  assert.equal(carTitle({ brand: '   ' }), ''); // зөвхөн зай → хоосон ✓
  // ⚠️ НЭГ нь байвал гарчиг бүтнэ (брэнд эсвэл загвар дангаараа ч ✓)
  assert.equal(carTitle({ model: 'Vellfire', year: '2017' }), 'Vellfire, 2017');
  assert.equal(carTitle({ brand: 'Toyota' }), 'Toyota');
});

t('🚗 carTitle: олон зай НЭГ зай болов + тоон он ч ажиллана', () => {
  assert.equal(carTitle({ brand: 'Toyota  ', model: ' Vellfire ', year: '2017' }), 'Toyota Vellfire, 2017');
  assert.equal(carTitle({ brand: 'Toyota', model: 'Vellfire', year: 2017, importYear: 2026 }),
    'Toyota Vellfire, 2017/2026');
});

// ============================================================
// 💻 НОУТБУКИЙН АВТО-ГАРЧИГ — «Дэлгэц, CPU, RAM» (2026-10-10 (105))
// 🎯 Хэрэглэгчийн хүсэлт: «For laptops, the title should be based on
//    “Screen size, CPU, and RAM”» + гарын талбар ХАСАГДАВ ⇒ гарчиг нь
//    `attrs` (форм дээрх сонголтууд)-аас автоматаар бүтнэ ✓
// ⚠️ `autoTitle(listing)` нь хэсэг/дэд төрлийг шалгадаг (`hasAutoTitle`) тул
//    `locationData`-аас хамаарна — энд ЗӨВХӨН цэвэр `notebookTitle`-ыг тестлэнэ;
//    дүрэм (`hasAutoTitle`) ба `autoTitle`-ийн диспатч нь `test:filters` ба
//    `test:card`/`test:detail-ui`-ийн эх кодын гэрээгээр түгжигдэнэ ✓
// ============================================================

t('💻 notebookTitle: «Дэлгэц, CPU, RAM» — таслалаар, БАЙГАА утгуудыг л холбоно', () => {
  assert.equal(
    notebookTitle({ screen: '14.0"', cpu: 'Intel Core i5', ram: '16 GB' }),
    '14.0", Intel Core i5, 16 GB'
  );
  assert.equal(
    notebookTitle({ screen: '15.6"', cpu: 'Apple M2', ram: '8 GB' }),
    '15.6", Apple M2, 8 GB'
  );
  // ⚠️ Дутуу утга → «хоосон таслалт» (`a, , b`) ҮҮСЭХГҮЙ ✓
  assert.equal(notebookTitle({ screen: '14.0"', ram: '16 GB' }), '14.0", 16 GB');
  assert.equal(notebookTitle({ cpu: 'Intel Core i7' }), 'Intel Core i7');
  // ⚠️ Олон зай/мөр таслалт НЭГ зай болов
  assert.equal(
    notebookTitle({ screen: '  14.0" ', cpu: 'Intel  Core i5', ram: ' 16 GB ' }),
    '14.0", Intel Core i5, 16 GB'
  );
});

t("💻 notebookTitle: гурвуулаа хоосон/буруу төрөл → '' (карт дээр мөр ГАРАХГҮЙ)", () => {
  assert.equal(notebookTitle(null), '');
  assert.equal(notebookTitle(undefined), '');
  assert.equal(notebookTitle({}), '');
  assert.equal(notebookTitle({ screen: '   ' }), ''); // зөвхөн зай → хоосон ✓
  assert.equal(notebookTitle('14.0"'), ''); // текст → крашгүй
  assert.equal(notebookTitle(['14.0"']), ''); // массив → крашгүй
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);
