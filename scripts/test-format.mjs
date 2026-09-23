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

const { formatThousands, digitCount, shortPrice } = await import(`${tmp}?t=${Date.now()}`);
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

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);
