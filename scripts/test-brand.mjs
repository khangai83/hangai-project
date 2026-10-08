// ============================================================
// test-brand.mjs — 🏠 ЛОГОНЫ HOME ICON + 🏷️ БРЭНД (ZARBOOK.MN) ГЭРЭЭ (2026-10-08 (69c))
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2 хэсэг):
//   ① «zarlaa.mn гэсэн логооны хойд хэсэгт home icon оруул, энд дархад мэдээж
//      home page дээр ирдэг байх» ⇒ логоны ЗҮҮН талд `HomeIcon` SVG (emoji БИШ)
//      байрлаж, икон + «ZARBOOK.MN» текст НЭГ `<Link href="/">` дотор —
//      аль ч хэсэгт дарахад НҮҮР ХУУДАС руу ✓
//   ② «zarbook.mn гэсэн domain хаяг авсан тул бүгдийг ийм нэртэй болго ZarBook.mn»
//      ⇒ `ZARLAA.MN`/`zarlaa.mn` брэнд ГАЗАР БҮРЭЭС `ZARBOOK.MN`/`zarbook.mn`
//      болсон (лого · footer · бүх `<title>` · terms · export · UA · README ·
//      R2 док · scripts-ийн жишээ домэйн · `package.json`)
//
// ⚠️ ХАМГААЛАЛТ (🔒 ХӨНДӨӨХГҮЙ — солибол ХЭРЭГЛЭГЧИЙН ӨГӨГДӨЛ/НЭВТРЭЛТ ЭВДЭРНЭ):
//   • `phone.zarmn.mn` — синтетик имэйл (утасны бүртгэлийн таних тэмдэг, 0014/0041)
//   • `zarmn_*` — localStorage түлхүүр (таалагдсан/хайлтын түүх/ноорог) ба
//     `zarmn:*` — CustomEvent нэр (favorites · savedSearches · searchHistory ·
//     notifications · messages · stats)
//
// АЖИЛЛУУЛАХ:  npm run test:brand
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
 * 🧹 БҮХ тайлбарыг хасна (JSX блок · JS блок · мөрийн тайлбар)
 *    ⚠️ (69c) тайлбарууд нь ХУУЧИН брэндийг САНААТАЙ дурддаг (түүхэн гомдол,
 *    шилжилтийн тэмдэглэл) — регресс шалгалт нь зөвхөн ЦЭВЭР код дээр ажиллана ✓
 */
const codeOnly = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')   // JSX блок тайлбар `{/* … */}`
  .replace(/\/\*[\s\S]*?\*\//g, '')       // JS/JSX блок тайлбар `/* … */`
  .replace(/^\s*\/\/.*$/gm, '');          // мөрийн тайлбар `// …`

/** 🗂 Хавтас доторх файлуудыг (рекурсив) цуглуулна */
const walk = (dir, ext, out = []) => {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(rel, ext, out);
    else if (ext.test(entry.name)) out.push(rel);
  }
  return out;
};

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🏠 Логоны HOME ICON + 🏷️ ZARBOOK.MN брэнд (2026-10-08 (69c))\n');

const ICONS = readSrc('components/HeaderIcons.jsx');
const ICONS_CODE = codeOnly(ICONS);
const AP_CODE = codeOnly(readSrc('components/AppProviders.jsx'));


// ---------- ① HOME ICON (SVG, emoji БИШ) ----------
t('🏠 `HomeIcon` нь `components/HeaderIcons.jsx`-д экспортлогдсон ✓', () => {
  assert.match(ICONS_CODE, /export function HomeIcon\(/, '`HomeIcon` экспорт алга ✗');
});

t('🎨 `HomeIcon` нь ЖИНХЭНЭ SVG (нийтлэг `Icon` суурь — viewBox/currentColor) ✓', () => {
  assert.match(ICONS_CODE, /export function HomeIcon\(\{ className = '[^']+', strokeWidth = [\d.]+[^}]*\}\) \{\s*return \(\s*<Icon className=\{className\} strokeWidth=\{strokeWidth\}/,
    '`Icon` суурь ашиглаагүй (emoji/div байж болзошгүй) ✗');
});

t('📐 Зургийн дагуу 3 хэсэг — дээвэр · хана+шал · ХААЛГА (бүгд ЗУРААС, өнгөт `fill` БАЙХГҮЙ) ✓', () => {
  const body = ICONS_CODE.slice(ICONS_CODE.indexOf('export function HomeIcon'));
  const paths = body.match(/<path d="[^"]+" \/>/g) || [];
  assert.equal(paths.length, 3, `замын тоо 3 биш (${paths.length}) ✗`);
  assert.doesNotMatch(body, /fill="(?!none)/, 'SVG дотор өнгөтэй `fill` байна (emoji-маяг) ✗');
});

// ---------- ② ЛОГОНЫ БҮТЭЦ (икон + текст = НЭГ линк) ----------
t('🔗 Логоны линк нь БАЙРШЛАА ХАДГАЛСАН `href="/"` (home page) + `title` ✓', () => {
  assert.match(AP_CODE, /<Link\s*href="\/"\s*title="Нүүр хуудас"/, 'логоны `href="/"`/`title` алга ✗');
});

t('🏠 Икон нь «ZARBOOK» ТЕКСТИЙН өмнө, МӨН нэг линк дотор (аль ч хэсэгт дарахад home) ✓', () => {
  assert.match(AP_CODE, /<HomeIcon\s*data-home-icon[\s\S]{0,400}?\/>\s*ZARBOOK<span className="text-gray-900">\.MN<\/span>/,
    'икон + текст нэг линк дотор дараалалтай БАЙХГҮЙ ✗');
});

t('⏳ Лого дээр `🏠` EMOJI ХАСАГДСАН (зөвхөн SVG икон үлдсэн) ✓', () => {
  const logo = AP_CODE.slice(AP_CODE.indexOf('aria-label="ZARBOOK.MN'));
  const block = logo.slice(0, logo.indexOf('</Link>'));
  assert.doesNotMatch(block, /🏠/, 'лого дээр emoji үлдсэн ✗');
});

t('📏 Икон ↔ текст зай нь margin (`mr-1.5`) — `gap` нь «ZARBOOK .MN» алдаа үүсгэхгүй ✓', () => {
  assert.match(AP_CODE, /<HomeIcon\s*data-home-icon\s*className="mr-1\.5 h-\[22px\] w-\[22px\][^"]*"/,
    'иконы `mr-1.5`/хэмжээ алга ✗');
  assert.doesNotMatch(AP_CODE, /className="group flex items-center text-\[22px\] font-bold text-primary"[\s\S]{0,300}?gap-/,
    'логоны линк дээр `gap-*` буцаж орсон (2026-09-27-ийн алдаа) ✗');
});

t('🖱 Hover-т икон бага зэрэг томорно (`group-hover:scale-110`) — бусад иконтой ИЖИЛ хэв ✓', () => {
  assert.match(AP_CODE, /data-home-icon[\s\S]{0,200}?group-hover:scale-110/, 'hover эффект алга ✗');
});

// ---------- ③ БРЭНД: ЛОГО + FOOTER + БҮХ `<title>` ----------
t('🏷️ Лого нь `ZARBOOK.MN` (тод `.MN` нь `text-gray-900`) ✓', () => {
  assert.match(AP_CODE, /ZARBOOK<span className="text-gray-900">\.MN<\/span>/, 'логоны текст шинэчлэгдээгүй ✗');
});

t('🦶 Footer-т ч мөн `ZARBOOK.MN` ✓', () => {
  assert.match(AP_CODE, /🏠 ZARBOOK\.MN — Үл хөдлөх хөрөнгийн зар/, 'footer-ийн брэнд хуучин хэвээр ✗');
});

t('📑 Root metadata (`app/layout.jsx`) нь `ZARBOOK.MN` ✓', () => {
  const L = codeOnly(readSrc('app/layout.jsx'));
  assert.match(L, /title: 'ZARBOOK\.MN — Үл хөдлөх хөрөнгийн зар'/, 'root `<title>` шинэчлэгдээгүй ✗');
});

t('📑 БҮХ хуудасны `<title>`/тайлбар дахь хуучин брэнд 0 (app/**/*.jsx) ✓', () => {
  const files = walk('app', /\.jsx$/);
  const bad = files.filter((f) => /ZARLAA|zarlaa\.mn/.test(codeOnly(readSrc(f))));
  assert.deepEqual(bad, [], `хуучин брэнд үлдсэн: ${bad.join(', ')} ✗`);
  assert.ok(files.length >= 20, `app доторх jsx цөөн (${files.length}) — walk алдаатай ✗`);
});

t('📄 `/terms` — платформ нь `ZARBOOK.MN`, домэйн нь `zarbook.mn` (≥4 дурдалт) ✓', () => {
  const T = codeOnly(readSrc('app/terms/page.jsx'));
  assert.doesNotMatch(T, /ZARLAA|zar\.mn/, 'terms дотор хуучин нэр/домэйн ✗');
  assert.ok((T.match(/ZARBOOK\.MN/g) || []).length >= 4, '`ZARBOOK.MN` дурдалт 4-өөс цөөн ✗');
  assert.match(T, /zarbook\.mn вэбсайт/, '«Платформ» тодорхойлолт хуучин домэйнтой ✗');
});

t('📤 Экспорт/хуваалцалт/статистик нь `ZARBOOK.MN` ✓', () => {
  assert.match(codeOnly(readSrc('lib/exporters.js')), /<p class="foot">ZARBOOK\.MN · /, 'CSV/HTML экспортын footer ✗');
  assert.match(codeOnly(readSrc('components/FavoritesClient.jsx')), /subtitle: `ZARBOOK\.MN — нийт /, 'хуваалцах текст ✗');
  assert.match(codeOnly(readSrc('components/PriceStatsClient.jsx')), /Эх сурвалж:<\/b> ZARBOOK\.MN-ийн өөрийн зарууд/, 'статистикийн эх сурвалж ✗');
});

t('🤖 Гадаад үйлчилгээний UA нь `ZarBookBot/1.0 (+https://zarbook.mn)` ✓', () => {
  const R = codeOnly(readSrc('app/api/resolve-map-link/route.js'));
  assert.match(R, /const UA = 'ZarBookBot\/1\.0 \(\+https:\/\/zarbook\.mn\)'/, 'Nominatim-ийн UA шинэчлэгдээгүй ✗');
});

t('📦 `package.json`/`package-lock.json` нь `zarbook-mn` (lock-той ТААРНА) ✓', () => {
  const p = JSON.parse(readSrc('package.json'));
  const l = JSON.parse(readSrc('package-lock.json'));
  assert.equal(p.name, 'zarbook-mn', '`name` ✗');
  assert.match(p.description, /ZarBook\.mn/, '`description` ✗');
  assert.equal(l.name, p.name, 'lock-ийн нэр зөрүүтэй (`npm ci` унана) ✗');
  assert.equal(l.packages[''].name, p.name, 'lock-ийн root нэр зөрүүтэй ✗');
});

t('🧹 app/components/lib/scripts-ийн ЦЭВЭР код дээр хуучин брэнд 0 (регресс хориг) ✓', () => {
  // ⚠️ ЭНЭ тест өөрөө «ZARLAA»-г regex/тестийн НЭР дотор агуулдаг тул өөрийгөө
  //    хасна (эс бөгөөс хуурамч уналт) — бусад БҮХ файл шалгагдана ✓
  const SELF = path.join('scripts', 'test-brand.mjs');
  const files = ['app', 'components', 'lib', 'scripts']
    .flatMap((d) => walk(d, /\.(jsx|js|mjs)$/))
    .filter((f) => f !== SELF);
  const bad = files.filter((f) => /ZARLAA|zarlaa\.mn/.test(codeOnly(readSrc(f))));
  assert.deepEqual(bad, [], `хуучин брэнд ЦЭВЭР код дээр үлдсэн: ${bad.join(', ')} ✗`);
});

// ---------- ④ 🔒 ХАМГААЛАЛТ: өгөгдлийн түлхүүрүүд ХӨНДӨӨГДӨХГҮЙ ----------
t('🔒 `phone.zarmn.mn` (синтетик имэйл) ХӨНДӨӨГДӨӨГҮЙ — солибол ХУУЧИН ХЭРЭГЛЭГЧ НЭВТРЭХГҮЙ ✓', () => {
  assert.match(codeOnly(readSrc('lib/phoneEmail.js')), /const EMAIL_DOMAIN = 'phone\.zarmn\.mn'/,
    'имэйлийн домэйн өөрчлөгдсөн (эвдэрхий!) ✗');
  assert.match(readSrc('supabase/migrations/0041_notification_phone_title.sql'), /'%@phone\.zarmn\.mn'/,
    '0041-ийн SQL дүрэм зөрүүтэй ✗');
});

t('🔒 `zarmn_*` түлхүүр ба `zarmn:*` event нэр ХӨНДӨӨГДӨӨГҮЙ (таалагдсан/түүх алдагдахгүй) ✓', () => {
  const keys = [
    ['lib/favorites.js', /'zarmn_favorites_v1'/],
    ['lib/savedSearch.mjs', /'zarmn_saved_searches_v1'/],
    ['lib/searchHistory.mjs', /'zarmn_search_history_v1'/],
    ['lib/statsClient.js', /'zarmn_device_v1'/],
    ['lib/notifications.mjs', /'zarmn:notifications-changed'/],
    ['lib/messages.mjs', /'zarmn:messages-changed'/],
  ];
  for (const [f, re] of keys) {
    assert.match(readSrc(f), re, `${f} дэх түлхүүр/event өөрчлөгдсөн (эвдэрхий!) ✗`);
  }
});

t('📖 Док нь ч нийцэв — `docs/R2_SETUP.md` дээр `zarlaa` 0 ✓', () => {
  const R2 = readSrc('docs/R2_SETUP.md');
  assert.doesNotMatch(R2, /zarlaa/i, 'R2 док дотор хуучин домэйн ✗');
  assert.match(R2, /zarbook\.mn/, 'R2 док шинэ домэйн рүү заагаагүй ✗');
});

console.log(`\n✅ Нийт ${passed} шалгалт амжилттай — лого «🏠 ZARBOOK.MN» (SVG икон, home руу) + брэнд БҮГДЭЭ ZarBook.mn ✓\n`);

