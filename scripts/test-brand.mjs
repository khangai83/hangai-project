// ============================================================
// test-brand.mjs — 🏠 ТУСДАА HOME ICON + 🏷️ БРЭНД (ZARBOOK.MN) ГЭРЭЭ (2026-10-08 (69c)/(69d))
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (3 хэсэг):
//   ① «zarlaa.mn гэсэн логооны хойд хэсэгт home icon оруул, энд дархад мэдээж
//      home page дээр ирдэг байх» ⇒ логоны хажууд `HomeIcon` SVG (emoji БИШ) ✓
//   ② «zarbook.mn гэсэн domain хаяг авсан тул бүгдийг ийм нэртэй болго ZarBook.mn»
//      ⇒ `ZARLAA.MN`/`zarlaa.mn` брэнд ГАЗАР БҮРЭЭС `ZARBOOK.MN`/`zarbook.mn`
//      болсон (лого · footer · бүх `<title>` · terms · export · UA · README ·
//      R2 док · scripts-ийн жишээ домэйн · `package.json`)
//   ③ 🆕 (69d) «би уугийг нь тусдаа icon болгоод өгөөч гэсэн юм… search хэсгийн
//      өмнө тусдаа icon болгоод өгөөч» ⇒ икон нь логоны ДОТОР БИШ — лого нь
//      ЗӨВХӨН ТЕКСТ (`ZARBOOK.MN`), 🏠 икон нь лого ба хайлтын хэсгийн ХООРОНД
//      ТУСДАА `<Link href="/">` (`h-6 w-6`, `hidden lg:inline-flex`) ✓
//
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

console.log('\n🏠 Тусдаа HOME ICON + 🏷️ ZARBOOK.MN брэнд (2026-10-08 (69c)/(69d))\n');

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

// ---------- ② ЛОГОНЫ БҮТЭЦ (текст) + 🏠 ТУСДАА HOME ICON (69d) + БҮХ ӨРГӨНД харагдах (69e) ----------
t('🔗 Логоны линк нь `href="/"` (home page) + `title`, текст нь `ZARBOOK.MN` ✓', () => {
  assert.match(AP_CODE, /<Link\s*href="\/"\s*title="Нүүр хуудас"[\s\S]{0,200}?>\s*ZARBOOK<span className="text-gray-900">\.MN<\/span>\s*<\/Link>/,
    'логоны `href="/"`/`title`/текст ✗');
});

t('🖼 Лого дотор икон/emoji ОГТ БАЙХГҮЙ — лого нь ЗӨВХӨН текст (икон нь ТУСДАА) ✓', () => {
  const i = AP_CODE.indexOf('aria-label="ZARBOOK.MN — нүүр хуудас"');
  assert.ok(i > -1, 'логоны `aria-label` алга ✗');
  const block = AP_CODE.slice(i, AP_CODE.indexOf('</Link>', i));
  assert.doesNotMatch(block, /<svg|<HomeIcon|🏠/, 'лого дотор икон/emoji байна (тусдаа байх ёстой) ✗');
  assert.match(block, /ZARBOOK<span className="text-gray-900">\.MN<\/span>/, 'логоны текст ✗');
});

t('🏠 🆕 (69d) HOME ICON нь логоноос ГАДНА, ТУСДАА линк (`href="/"` + `data-home-icon-link`) ✓', () => {
  assert.match(AP_CODE, /<Link\s*href="\/"\s*data-home-icon-link[\s\S]{0,500}?<HomeIcon\s*data-home-icon/,
    'тусдаа home icon линк алга (лого дотор хэвээр байж болзошгүй) ✗');
});

t('📍 Дараалал нь [лого] → [🏠 икон] → [{headerSlot} ХАЙЛТЫН хэсэг] ✓', () => {
  const logo = AP_CODE.indexOf('aria-label="ZARBOOK.MN — нүүр хуудас"');
  const icon = AP_CODE.indexOf('data-home-icon-link');
  const slot = AP_CODE.indexOf('{headerSlot &&');
  assert.ok(logo > -1 && icon > 0 && slot > 0, 'дэгээ олдсонгүй ✗');
  assert.ok(logo < icon, 'икон логоны ӨМНӨ байна (логоны дараа байх ёстой) ✗');
  assert.ok(icon < slot, 'икон ХАЙЛТЫН хэсгийн дараа байна (өмнө байх ёстой) ✗');
});

t('📏 Икон `h-6 w-6` (24px — баруун талын ❤️/💬/🕐/🔔 icon-only товчнуудтай ИЖИЛ) ✓', () => {
  assert.match(AP_CODE, /<HomeIcon\s*data-home-icon\s*className="h-6 w-6[^"]*"/,
    'иконы хэмжээ `h-6 w-6` биш (бусад толгойн икон 24px) ✗');
});

t('📱 🆕 (69e) Икон БҮХ ӨРГӨНД ХАРАГДАХ (`inline-flex`) — `hidden`/`lg:inline-flex` ХОРИГ (мобайлд ч логоны дараа ✓)', () => {
  const i = AP_CODE.indexOf('data-home-icon-link');
  assert.ok(i > 0, '`data-home-icon-link` алга ✗');
  const cls = AP_CODE.slice(i, i + 600).match(/className="([^"]*)"/);
  assert.ok(cls, 'иконы класс олдсонгүй ✗');
  assert.match(cls[1], /(^|\s)inline-flex(\s|$)/, '`inline-flex` алга (икон огт харагдахгүй ✗)');
  assert.doesNotMatch(cls[1], /(^|\s)hidden(\s|$)/, '`hidden` буцаж орсон (мобайлд икон НУУГДАНА ✗)');
  assert.doesNotMatch(cls[1], /lg:inline-flex/, '`lg:inline-flex` буцаж орсон (зөвхөн ≥1024px харагдана ✗)');
});

t('🖱 Hover-т икон бага зэрэг томорно (`group-hover:scale-110`) — бусад иконтой ИЖИЛ хэв ✓', () => {
  const i = AP_CODE.indexOf('data-home-icon-link');
  assert.match(AP_CODE.slice(i, i + 700), /group-hover:scale-110/, 'hover эффект алга ✗');
});

t('🛡 «ZARBOOK .MN» алдаа (2026-09-27) ХОРИГ — логоны линк дээр `gap-*` БАЙХГҮЙ ✓', () => {
  const m = AP_CODE.match(/className="([^"]*text-\[22px\] font-bold text-primary[^"]*)"/);
  assert.ok(m, 'логоны класс олдсонгүй ✗');
  assert.doesNotMatch(m[1], /gap-/, 'логоны линк дээр `gap-*` орсон (2026-09-27-ийн алдаа буцаж гарна) ✗');
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

console.log(`\n✅ Нийт ${passed} шалгалт амжилттай — лого «ZARBOOK.MN» (зөвхөн текст) + 🏠 ТУСДАА home icon (лого ба ХАЙЛТЫН хэсгийн хооронд, home руу) + брэнд БҮГДЭЭ ZarBook.mn ✓\n`);

