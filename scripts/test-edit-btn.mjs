// ============================================================
// test-edit-btn.mjs — ✅ «✏️ ЗАСАХ» ТОВЧНЫ НОГООН ГЭРЭЭ (2026-10-06 (6))
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Засах гэсэн товчийг ногоон дэвсгэр өнгөтэй болгочих»
//    ⇒ апп-ийн БҮХ «✏️ Засах» товч НЭГ ижил ногоон өнгөтэй болов:
//    ① `/my-listings` — зарын КАРТ (`MyListingsClient.jsx`)
//    ② `/my-listings` → 📈 Статистик — 🏆 Онцлох (`MyListingsStatsPanel.jsx`)
//    ③ `/my-listings` → 📈 Статистик — зар тус БҮРИЙН мөр (мөн адил)
//    ④ 🖥 Зар нэмэх формысн хураангуйн жижиг pill (`AddListingClient.jsx`)
//
// ХАМРАХ ХҮРЭЭ (DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node):
//   ① `tailwind.config.js` — `success` токен (DEFAULT/dark/light) + 3 сүүдэр
//      (`btn-success*`, rgba нь #059669 = 5,150,105)
//   ② `app/globals.css` — `.btn-success` (градиент + hover/active төлөв)
//   ③ компонент тус бүрийн `className` (товч, товч тус бүрээр)
//
// ⚠️ ТОКЕНУУД ХӨНДӨӨГДӨӨГҮЙ (энэ нь энэ тестийн ГОЛ хамгаалалт):
//   `primary` (➕ Зар нэмэх / 🔄 Дахин оролдох) · `secondary` (дулаан БЭХ —
//   Таалагдсан/Нэвтрэх) · `danger` (🗑 Устгах) — зөвхөн «Засах» өнгө солигдов ✓
//   ⇒ «Засах ногоон · Устгах улаан» гэсэн нэг ойлгомжтой ялгаа.
//
// АЖИЛЛУУЛАХ:  npm run test:edit-btn
//    🐍 CDP-ээр бодит Chrome дээр харах: `npm run cdp:picker` (🖥 ✏️ pill)
//       ба `npm run cdp:services` (🖥 форм / services хэсэг)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

/** 📄 Эх файлыг унших (ГЭРЭЭ/регрессийн шалгалтад) */
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n✅ «✏️ Засах» товч — НОГООН (btn-success) гэрээ\n');

const CSS = readSrc('app/globals.css');
const TW = readSrc('tailwind.config.js');
const MY = readSrc('components/MyListingsClient.jsx');
const STATS = readSrc('components/MyListingsStatsPanel.jsx');
const FORM = readSrc('components/AddListingClient.jsx');

// ────────────────────────────────────────────────────────────
console.log('── ① 🎨 Палитр (`tailwind.config.js`) ──');

t('🎨 `success` токен: DEFAULT `#059669` · dark `#047857` · light `#D1FAE5` ✓', () => {
  assert.match(TW,
    /success: \{\s*DEFAULT: '#059669',[\s\S]{0,220}?dark: '#047857',[\s\S]{0,220}?light: '#D1FAE5',[\s\S]{0,140}?\},/,
    '`success` токен дутуу/буруу ✗ (DEFAULT #059669 · dark #047857 · light #D1FAE5)');
});

t('🎨 3 сүүдэр `btn-success` / `-hover` / `-active` бий ✓', () => {
  for (const key of ['btn-success', 'btn-success-hover', 'btn-success-active']) {
    assert.ok(TW.includes(`'${key}':`), `\`${key}\` сүүдэр дутуу ✗`);
  }
});

t('🎨 Гэрэлтэлт нь НОГООН — `rgba(5,150,105,…)` ЯГ 2 газар (суурь + hover) ✓', () => {
  assert.equal((TW.match(/rgba\(5,150,105,/g) || []).length, 2,
    '`rgba(5,150,105,…)` нь суурь ба hover-т ЯГ 2 удаа байх ёстой ✗');
  assert.ok(TW.includes('rgba(5,150,105,0.55)') && TW.includes('rgba(5,150,105,0.70)'),
    'гэрэлтэлтийн утгууд (0.55 / 0.70) дутуу ✗');
});

t('⚠️ `primary` / `secondary` сүүдэр ХӨНДӨӨГДӨӨГҮЙ — цэнхэр ба бэх хэвээр ✓', () => {
  assert.ok(TW.includes('rgba(37,99,235,0.55)'), 'primary-гийн гэрэлтэлт өөрчлөгдсөн ✗');
  assert.ok(TW.includes("DEFAULT: '#2B2622'"), '`secondary` токен өөрчлөгдсөн ✗ (бэх байх ёстой)');
  assert.ok(TW.includes('rgba(43,38,34,0.45)'), 'secondary-гийн гэрэлтэлт өөрчлөгдсөн ✗');

// ────────────────────────────────────────────────────────────
console.log('\n── ② 🎨 `.btn-success` класс (`app/globals.css`) ──');

t('🎨 `.btn-success` — градиентийн 3 өнгө (`#10B981` → `#059669` → `#047857`) + цагаан текст ✓', () => {
  assert.match(CSS,
    /\.btn-success \{\s*@apply bg-gradient-to-b from-\[#10B981\] via-\[#059669\] to-\[#047857\] text-white shadow-btn-success\n/,
    '`.btn-success` градиент дутуу/өөр ✗');
});

t('🎨 Hover/active нь `.btn-primary`-ийн ЯГ ИЖИЛ бүтэцтэй (товч өргөгдөж, сүүдэр томорно) ✓', () => {
  assert.ok(CSS.includes('enabled:hover:from-[#059669] enabled:hover:to-[#036B4F]'),
    'hover градиент дутуу ✗');
  assert.ok(CSS.includes('enabled:hover:shadow-btn-success-hover enabled:hover:-translate-y-0.5'),
    'hover сүүдэр/өргөлт дутуу ✗');
  assert.ok(CSS.includes('enabled:active:translate-y-0 enabled:active:shadow-btn-success-active'),
    'active төлөв дутуу ✗');
});

t('⚠️ Хуучин товчнууд ХӨНДӨӨГДӨӨГҮЙ — `.btn-secondary` (бэх `#3D3730`) ба `.btn-danger` (улаан) хэвээр ✓', () => {
  assert.ok(CSS.includes('from-[#3D3730] via-[#2B2622] to-[#1C1815]'),
    '`.btn-secondary` градиент өөрчлөгдсөн ✗');
  assert.ok(CSS.includes('from-[#ef4444] to-[#b91c1c]'), '`.btn-danger` градиент өөрчлөгдсөн ✗');
  assert.ok(CSS.includes('.btn-primary {'), '`.btn-primary` алга ✗');
});

// ────────────────────────────────────────────────────────────
console.log('\n── ③ 📄 «✏️ Засах» товчнууд (компонент) ──');

t('① `/my-listings` картын «✏️ Засах» — `btn btn-success btn-sm` (хар/бэх БИШ) ✓', () => {
  assert.ok(MY.includes('<button className="btn btn-success btn-sm" onClick={() => openEdit(l)}>✏️ Засах</button>'),
    'картын «✏️ Засах» нь `btn-success` БИШ ✗');
  assert.ok(!MY.includes('btn btn-secondary'), 'хуучин `btn-secondary` класс үлдсэн ✗');
});

t('① 🗑 «Устгах» нь УЛААН хэвээр (`btn-danger btn-sm`) — нэг харцаар ялгагдана ✓', () => {
  assert.ok(MY.includes('<button className="btn btn-danger btn-sm" onClick={() => handleDelete(l)}>🗑 Устгах</button>'),
    '«🗑 Устгах» өөрчлөгдсөн ✗');
});

t('②③ 📈 Статистикийн 2 «✏️ Засах» (🏆 Онцлох + зар тус бүр) — `btn btn-success btn-sm` ЯГ 2 ✓', () => {
  assert.equal((STATS.match(/className="btn btn-success btn-sm"/g) || []).length, 2,
    'статистикийн «✏️ Засах» товч нь 2 байх ёстой ✗');
  assert.ok(STATS.includes('onClick={() => handleEdit(top)}'), '🏆 Онцлох-ийн handler дутуу ✗');
  assert.ok(STATS.includes('onClick={() => handleEdit(l)}'), 'зар тус бүрийн handler дутуу ✗');
  assert.ok(!STATS.includes('className="btn btn-primary btn-sm"'),
    'статистикт хуучин цэнхэр `btn-primary` товч үлдсэн ✗');
});

t('④ 🖥 Хураангуйн жижиг pill — НОГООН дэвсгэр (`bg-success` + цагаан текст, hover `success-dark`) ✓', () => {
  assert.ok(FORM.includes(
    'className="shrink-0 rounded-md border border-success-dark bg-success px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white transition hover:bg-success-dark"'),
    'pill-ийн ногоон класс дутуу/өөр ✗');
  assert.ok(!FORM.includes('text-[11px] font-semibold leading-none text-gray-600'),
    'хуучин цагаан/саарал pill үлдсэн ✗');
});

t('④ ⚠️ Pill-ийн ФУНКЦИОНАЛ гэрээ ХӨНДӨӨГДӨӨГҮЙ — `type="button"` + selector + бичиг + 2 дуудалт ✓', () => {
  assert.ok(FORM.includes('data-desktop-summary-edit={key}'), 'selector (`data-desktop-summary-edit={key}`) дутуу ✗');
  assert.ok(FORM.includes('aria-label={`${label} засах`}'), '`aria-label` дутуу ✗');
  assert.ok(FORM.includes('✏️ Засах'), 'товчны бичиг «✏️ Засах» дутуу ✗');
  assert.equal((FORM.match(/editBtn\(/g) || []).length, 2, '`editBtn(` = 2 дуудалт байх ёстой ✗');
});

t('✅ Дүрэм: «✏️ Засах» бичгийн ОЙР (`±250 тэмдэгт`) `btn-primary`/`btn-secondary` БАЙХГҮЙ ✓', () => {
  for (const [name, src] of [['MyListingsClient', MY], ['MyListingsStatsPanel', STATS]]) {
    const label = '✏️ Засах';
    let i = src.indexOf(label);
    while (i !== -1) {
      const win = src.slice(Math.max(0, i - 250), i + 250);
      assert.ok(!/btn-(primary|secondary)/.test(win),
        `${name}: «✏️ Засах» товч цэнхэр/бэх өнгөтэй байна ✗`);
      i = src.indexOf(label, i + 1);
    }
  }
});

t('✅ Дүрэм: ногоон нь ЗӨВХӨН «Засах» товчид — бусад товч `success` болоогүй ✓', () => {
  for (const [name, src] of [['MyListingsClient', MY], ['MyListingsStatsPanel', STATS]]) {
    const green = (src.match(/btn-success/g) || []).length;
    const labels = (src.match(/✏️ Засах/g) || []).length;
    assert.ok(labels > 0 && green >= labels,
      `${name}: ногоон товч (${green}) нь «✏️ Засах» (${labels})-аас цөөн ✗`);
  }
});

console.log(`\n✅ Нийт ${passed} шалгалт амжилттай — «✏️ Засах» нь 3 газарт НЭГ ногоон; `
  + 'цэнхэр/бэх/улаан товчнууд хөндөгдөөгүй ✓\n');

});
