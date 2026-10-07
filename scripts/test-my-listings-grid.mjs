// ============================================================
// test-my-listings-grid.mjs — 📋 «МИНИЙ ЗАРУУД» 2-3 БАГАНА ГЭРЭЭ (2026-10-07 (59))
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «desktop дээр Миний зарууд ын картуудыг 2-3 эгнээ
//    болгож харагдуулвал зүгээр юм» ⇒ `/my-listings`-ийн КАРТЫН ЖАГСААЛТ
//    (`components/MyListingsClient.jsx`) нь:
//      ① 📱 1 · 📲 sm(≥640) 2 · 🖥 lg(≥1024) 3 БАГАНА (responsive grid)
//      ② Карт бүр ВЕРТИКАЛЬ (зураг дээгүүр · текст доор · товч хамгийн доор)
//         — `sm:flex-row` (хавтээ карт) ХАСАГДСАН ✓
//      ③ Зураг БҮХ дэлгэцэд бүтэн өргөн (`w-full`) — `sm:h-20 sm:w-[100px]` ХАСАГДСАН ✓
//      ④ Товчнууд БҮХ дэлгэцэд ХЭВТЭЭ мөрөнд — `sm:w-auto sm:flex-col` ХАСАГДСАН ✓
//
// ⚠️ ЗӨВХӨН ХАРАГДАЦ: fetch/DB/payload/линк/товчны үйлдэл ХӨНДӨӨГДӨӨГҮЙ ✓
//
// АЖИЛЛУУЛАХ:  npm run test:my-grid
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

/** 📄 Эх файлыг унших (ГЭРЭЭ/регрессийн шалгалтад) */
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * 🧹 БҮХ тайлбарыг хасна (`{/* … *\/}`, `/* … *\/}`, `// …`) — регресс шалгалт нь
 *    тайлбар дотор дурдагдсан ХУУЧИН классуудаар хуурамчаар УНАХГҮЙН тулд
 *    (`test-location-optional.mjs`-ийн `codeOnly`-той ижил санаа ✓)
 */
const stripComments = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')   // JSX блок тайлбар `{/* … */}`
  .replace(/\/\*[\s\S]*?\*\//g, '')        // JS/JSX блок тайлбар `/* … */`
  .replace(/^\s*\/\/.*$/gm, '');           // мөрийн тайлбар `// …`

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n📋 «Миний зарууд» — 🖥 DESKTOP 2-3 БАГАНА (grid) гэрээ\n');

/** 📄 Файлын ЦЭВЭР код (тайлбаргүй) — регресс шалгалтад */
const MY = stripComments(readSrc('components/MyListingsClient.jsx'));

t('🗂 Картын ЖАГСААЛТ нь RESPONSIVE GRID (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) ✓', () => {
  assert.ok(MY.includes('className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"'),
    'grid-ийн класс дутуу/өөр ✗');
});

t('⏳ Хуучин ВЕРТИКАЛЬ ЖАГСААЛТ (`flex flex-col gap-3`) ХАСАГДСАН ✓', () => {
  assert.ok(!MY.includes('className="flex flex-col gap-3"'),
    'хуучин `flex flex-col gap-3` үлдсэн ✗');
});

t('🧱 Карт бүр ВЕРТИКАЛЬ — `sm:flex-row` (хавтээ карт) БҮРЭН ХАСАГДСАН ✓', () => {
  assert.ok(!MY.includes('sm:flex-row'), '`sm:flex-row` үлдсэн ✗');
});

t('🖼 Зураг БҮХ дэлгэцэд бүтэн өргөн — `sm:h-20 sm:w-[100px]` ХАСАГДСАН ✓', () => {
  assert.ok(!MY.includes('sm:h-20 sm:w-[100px]'), 'жижиг thumbnail (`sm:h-20 sm:w-[100px]`) үлдсэн ✗');
  assert.ok(MY.includes('className="h-[150px] w-full shrink-0 overflow-hidden rounded-lg bg-gray-100"'),
    'зургийн `w-full` класс дутуу/өөр ✗');
});

t('🔘 Товчнууд БҮХ дэлгэцэд ХЭВТЭЭ мөрөнд — `sm:w-auto sm:flex-col` ХАСАГДСАН ✓', () => {
  assert.ok(!MY.includes('sm:w-auto sm:flex-col'), '`sm:w-auto sm:flex-col` үлдсэн ✗');
  assert.ok(MY.includes('className="flex w-full flex-row gap-2"'), 'товчны хэвтээ мөр дутуу/өөр ✗');
});

t('✅ ФУНКЦИОНАЛ ХӨНДӨӨГДӨӨГҮЙ — зарын линк · `✏️ Засах` · `🗑 Устгах` ХЭВЭЭР ✓', () => {
  assert.ok(MY.includes('href={`/listings/${l.id}`}'), 'зарын линк дутуу ✗');
  assert.ok(MY.includes('>✏️ Засах</button>'), '«✏️ Засах» дутуу ✗');
  assert.ok(MY.includes('>🗑 Устгах</button>'), '«🗑 Устгах» дутуу ✗');
  assert.ok(MY.includes('onClick={() => openEdit(l)}'), '`openEdit(l)` дутуу ✗');
  assert.ok(MY.includes('onClick={() => handleDelete(l)}'), '`handleDelete(l)` дутуу ✗');
});

console.log(`\n✅ Нийт ${passed} шалгалт амжилттай — «Миний зарууд» нь 🖥 DESKTOP дээр 2-3 баганатай (вертикаль карт) ✓\n`);
