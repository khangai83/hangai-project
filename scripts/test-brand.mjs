// ============================================================
// test-brand.mjs — 🏷️ БРЭНД (ZarBook.mn) ГЭРЭЭ (2026-10-08 (69c) → 🆕 2026-10-10 (91))
//
// 🆕 (91) ТОЛГОЙН ТУСДАА ИКОН БҮРЭН ХАСАГДАВ — ХЭРЭГЛЭГЧИЙН ШИЙДВЭР (2026-10-10):
//   «home deer baigaa ZarBook.mn nii ard baisan home icon … uuniig bur boliyo»
//   ⇒ ⏳ (69d)-д нэмэгдэж, (90)-д «Z» бадж болсон логоны дараах ТУСДАА икон
//   (`ZIcon` + `data-home-icon`/`data-home-icon-link`) БҮРЭН ХАСАГДАВ ✓
//   🎯 УЧИР: лого нь өөрөө `href="/"` (нүүр хуудас) тул тусдаа икон нь ЗӨВХӨН
//   давхардал байв — бадж болсноос хойш «нүүр хуудас» гэдгээ хэлэхээ болиод
//   байв ✗ ⇒ одоо толгойн мөрөнд нүүр хуудасны ГАНЦ линк = ЛОГО ✓
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (3 хэсэг):
//   ① ⏳ (69d)/(90)/(91): «логооны хойд хэсэгт home icon оруул…» ⇒ лого нь өөрөө
//      нүүр хуудасны линк (тусдаа икон (91)-д ХАСАГДАВ ✓ — доорх тестүүд хамгаална)
//   ② «zarbook.mn гэсэн domain хаяг авсан тул бүгдийг ийм нэртэй болго ZarBook.mn»
//      ⇒ `ZARLAA.MN`/`zarlaa.mn` брэнд ГАЗАР БҮРЭЭС `ZarBook.mn`/`zarbook.mn`
//      болсон (лого · footer · бүх `<title>` · terms · export · UA · README ·
//      R2 док · scripts-ийн жишээ домэйн · `package.json`)
//   ③ ⏳ (69d) «би уугийг нь тусдаа icon болгоод өгөөч гэсэн юм… search хэсгийн
//      өмнө тусдаа icon болгоод өгөөч» ⇒ икон нь логоны ДОТОР БИШ байв
//      (лого нь ЗӨВХӨН ТЕКСТ, икон нь ТУСДАА `<Link href="/">`)
//      ⚠️ 🆕 (91): энэ ТУСДАА икон нь БҮРЭН ХАСАГДАВ (давхардал байв ✗)
//   ④ ⏳ (72) «home ruu ordog icon chin zar luu orohoor bairlalaa uurchluud
//      baigaa» ⇒ `[лого + икон]` НЭГ `flex shrink-0` бүлэг болсон (⏳ өмнө нь
//      `justify-between`-ийн ДУНД хүүхэд байснаас `headerSlot`-гүй хуудсанд
//      (зар · мессеж …) икон чөлөөт зайны ГОЛД шилжиж 300–435px болж байв ✗)
//      ⚠️ 🆕 (91): икон хасагдсан ч бүлэг `<div>` ХЭВЭЭР — `shrink-0` нь
//      ЛОГО-г хайлтын мөр (`flex-1`) уртсах үед БҮРЧЛЭГДЭХЭЭС сэргийлнэ ✓
//
//
// ⚠️ ХАМГААЛАЛТ (🔒 ХӨНДӨӨХГҮЙ — солибол ХЭРЭГЛЭГЧИЙН ӨГӨГДӨЛ/НЭВТРЭЛТ ЭВДЭРНЭ):
//   • `phone.zarmn.mn` — синтетик имэйл (утасны бүртгэлийн таних тэмдэг, 0014/0041)
//   • `zarmn_*` — localStorage түлхүүр (таалагдсан/хайлтын түүх/ноорог) ба
//     `zarmn:*` — CustomEvent нэр (favorites · savedSearches · searchHistory ·
//     notifications · messages · stats)
//
// 🆕 (114) ЗАР ОРУУЛАХ ХУУДАС (форм ба туслах компонентууд) дээр ЦЭВЭР код
//   дээрх emoji 0 — хэрэглэгчийн хүсэлт: «zar oruulax heseg deereh emoji
//   bvhiiig ni has» ⇒ форм · газрын зургийн сонгогч · хайлттай сонгогч ·
//   YouTube талбар · тооны хүрд БҮГД. ⏳ Иконууд `components/HeaderIcons.jsx`
//   доторх SVG болов (`CheckIcon` · `CloseIcon` — фонт бүрд өөр зурагдах
//   `✓`/`✕` тэмдэгтийн оронд, `currentColor`-оор өнгө дагана ✓)
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

console.log('\n🏷️ ZarBook.mn брэнд + 🆕 (91) толгойн ТУСДАА икон ХАСАГДАВ (лого = нүүр хуудасны ГАНЦ линк)\n');

const ICONS = readSrc('components/HeaderIcons.jsx');
const ICONS_CODE = codeOnly(ICONS);
const AP_CODE = codeOnly(readSrc('components/AppProviders.jsx'));


// ---------- ① 🆕 (91) ТУСДАА ИКОН БҮРЭН ХАСАГДАВ — лого = нүүр хуудасны ГАНЦ линк ----------
t('🆕 (91) Толгойн ТУСДАА икон БҮРЭН ХАСАГДАВ — `ZIcon` ба `data-home-icon(-link)` 0 ✓', () => {
  assert.doesNotMatch(ICONS_CODE, /ZIcon/, '`components/HeaderIcons.jsx` дээр `ZIcon` үлдсэн ✗');
  assert.doesNotMatch(AP_CODE, /ZIcon/, '`components/AppProviders.jsx` дээр `ZIcon` ашиглалт үлдсэн ✗');
  assert.doesNotMatch(AP_CODE, /data-home-icon/, '⏳ (69d)/(90)-ийн `data-home-icon`/`data-home-icon-link` дэгээ үлдсэн ✗');
});

t('🧩 🆕 (91) [лого] бүлэгт ЯГ 1 линк — логоны дараа тусдаа икон линк БАЙХГҮЙ (`</Link></div>`) ✓', () => {
  assert.match(AP_CODE, /<div className="flex shrink-0 items-center">\s*<Link[\s\S]{0,400}?<\/Link>\s*<\/div>/,
    'бүлэгт нэмэлт линк/икон байна эсвэл хаалтын дараалал зөрүүтэй (тусдаа икон буцаж орсон ✗)');
});

// ---------- ② ЛОГОНЫ БҮТЭЦ (текст) + 🏠 ТУСДАА HOME ICON (69d) + БҮХ ӨРГӨНД харагдах (69e) ----------
t('🔗 Логоны линк нь `href="/"` (home page) + `title`, текст нь `ZarBook.mn` ✓', () => {
  assert.match(AP_CODE, /<Link\s*href="\/"\s*title="Нүүр хуудас"[\s\S]{0,200}?>\s*ZarBook<span className="text-gray-900">\.mn<\/span>\s*<\/Link>/,
    'логоны `href="/"`/`title`/текст ✗');
});

t('🖼 Лого дотор икон/emoji ОГТ БАЙХГҮЙ — лого нь ЗӨВХӨН текст (`svg` 0) ✓', () => {
  const i = AP_CODE.indexOf('aria-label="ZarBook.mn — нүүр хуудас"');
  assert.ok(i > -1, 'логоны `aria-label` алга ✗');
  const block = AP_CODE.slice(i, AP_CODE.indexOf('</Link>', i));
  assert.doesNotMatch(block, /<svg|🏠/, 'лого дотор икон/emoji байна ✗');
  assert.match(block, /ZarBook<span className="text-gray-900">\.mn<\/span>/, 'логоны текст ✗');
  assert.ok(!AP_CODE.includes('data-home-icon-link'), '⏳ (91)-д ХАСАГДСАН тусдаа икон линк дахин орсон ✗');
});

t('📍 Дараалал нь [лого] → [{headerSlot} ХАЙЛТЫН хэсэг] (🆕 (91): тусдаа икон БАЙХГҮЙ) ✓', () => {
  const logo = AP_CODE.indexOf('aria-label="ZarBook.mn — нүүр хуудас"');
  const slot = AP_CODE.indexOf('{headerSlot &&');
  assert.ok(logo > -1 && slot > 0, 'дэгээ олдсонгүй ✗');
  assert.ok(logo < slot, 'лого ХАЙЛТЫН хэсгийн ДАРАА байна (өмнө байх ёстой) ✗');
});

t('🧩 🆕 (72)+(91) [лого] нь НЭГ `flex shrink-0` бүлэгт — `justify-between`-д ЗӨВХӨН 1 хүүхэд (зар руу ороход ЛОГО ШИЛЖИХГҮЙ ✓)', () => {
  const wrap = AP_CODE.search(/<div className="[^"]*\bflex\b[^"]*\bshrink-0\b[^"]*\bitems-center\b[^"]*">\s*<Link/);
  assert.ok(wrap > -1, '`[лого]` бүлгийн `div` алга ⇒ `justify-between` логог чөлөөт зайны ГОЛД түлхэнэ (2026-10-08 (72)-ийн гомдол буцаж гарна) ✗');
  const logo = AP_CODE.indexOf('aria-label="ZarBook.mn — нүүр хуудас"');
  const slot = AP_CODE.indexOf('{headerSlot &&');
  assert.ok(wrap < logo && logo < slot, 'бүлэг нь [лого] → [{headerSlot}] дараалалтай БИШ ✗');
  assert.match(AP_CODE.slice(logo, slot), /<\/Link>\s*<\/div>/,
    'бүлэг нь логоны дараа ХААГДААГҮЙ (лого бүлгээс ГАДНА үлдвэл хуудас бүрд шилжинэ ✗)');
});

t('🛡 «ZarBook .MN» алдаа (2026-09-27) ХОРИГ — логоны линк дээр `gap-*` БАЙХГҮЙ ✓', () => {
  const m = AP_CODE.match(/className="([^"]*text-\[22px\] font-bold text-primary[^"]*)"/);
  assert.ok(m, 'логоны класс олдсонгүй ✗');
  assert.doesNotMatch(m[1], /gap-/, 'логоны линк дээр `gap-*` орсон (2026-09-27-ийн алдаа буцаж гарна) ✗');
});

// ---------- ③ БРЭНД: ЛОГО + FOOTER + БҮХ `<title>` ----------
t('🏷️ Лого нь `ZarBook.mn` (тод `.MN` нь `text-gray-900`) ✓', () => {
  assert.match(AP_CODE, /ZarBook<span className="text-gray-900">\.mn<\/span>/, 'логоны текст шинэчлэгдээгүй ✗');
});

t('🦶 Footer-т ч мөн `ZarBook.mn` (байшингийн 🏠 emoji ХАСАГДСАН) ✓', () => {
  assert.match(AP_CODE, /ZarBook\.mn — Үл хөдлөх хөрөнгийн зар/, 'footer-ийн брэнд хуучин хэвээр ✗');
  assert.doesNotMatch(AP_CODE, /🏠 ZarBook\.mn/, 'footer дээр ⏳ 🏠 emoji үлдсэн ✗');
});

t('📑 Root metadata (`app/layout.jsx`) нь `ZarBook.mn` ✓', () => {
  const L = codeOnly(readSrc('app/layout.jsx'));
  assert.match(L, /title: 'ZarBook\.mn — Үл хөдлөх хөрөнгийн зар'/, 'root `<title>` шинэчлэгдээгүй ✗');
});

t('📑 БҮХ хуудасны `<title>`/тайлбар дахь хуучин брэнд 0 (app/**/*.jsx) ✓', () => {
  const files = walk('app', /\.jsx$/);
  const bad = files.filter((f) => /ZARLAA|zarlaa\.mn/.test(codeOnly(readSrc(f))));
  assert.deepEqual(bad, [], `хуучин брэнд үлдсэн: ${bad.join(', ')} ✗`);
  assert.ok(files.length >= 20, `app доторх jsx цөөн (${files.length}) — walk алдаатай ✗`);
});

t('📄 `/terms` — платформ нь `ZarBook.mn`, домэйн нь `zarbook.mn` (≥4 дурдалт) ✓', () => {
  const T = codeOnly(readSrc('app/terms/page.jsx'));
  assert.doesNotMatch(T, /ZARLAA|zar\.mn/, 'terms дотор хуучин нэр/домэйн ✗');
  assert.ok((T.match(/ZarBook\.mn/g) || []).length >= 4, '`ZarBook.mn` дурдалт 4-өөс цөөн ✗');
  assert.match(T, /zarbook\.mn вэбсайт/, '«Платформ» тодорхойлолт хуучин домэйнтой ✗');
});

t('📤 Экспорт/хуваалцалт/статистик нь `ZarBook.mn` ✓', () => {
  assert.match(codeOnly(readSrc('lib/exporters.js')), /<p class="foot">ZarBook\.mn · /, 'CSV/HTML экспортын footer ✗');
  assert.match(codeOnly(readSrc('components/FavoritesClient.jsx')), /subtitle: `ZarBook\.mn — нийт /, 'хуваалцах текст ✗');
  assert.match(codeOnly(readSrc('components/PriceStatsClient.jsx')), /Эх сурвалж:<\/b> ZarBook\.mn-ийн өөрийн зарууд/, 'статистикийн эх сурвалж ✗');
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

// ---------- 🎨 ТОЛГОЙ БА МОБАЙЛ ДООД ЦЭС — ЦАГААН (2026-10-09 (88)) ----------
t('🎨 Толгой ба мобайл доод цэс нь ЦАГААН болов (⏳ (83)-ийн крем `bg-gray-100` 0) ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «бүх саарал өнгийг үгүй хий» + «энэ явуулсан зургийг
   *  дуурайж дизайныг сайжруул» (жишиг сайтын толгой нь ЦАГААН, зөвхөн 1px
   *  доод зураастай хавтгай хэв).
   *  ⚠️ Эдгээр нь `main`-ЫН ГАДНА байдаг тул `nodes`-ийн бусад шалгалт
   *  тэднийг хардаггүй — толгой/доод цэс нь хуудсан дээрх ЦОР ГАНЦ крем
   *  дүүргэлт байсан (CDP: `rgb(244, 241, 234)`) ⇒ энд ЯГ класс мөрөөр барина ✓ */
  assert.ok(AP_CODE.includes('className="sticky top-0 z-50 border-b border-gray-200 bg-white"'),
    'толгой нь `bg-white` (1px доод зураастай, сүүдэргүй) БИШ ✗');
  assert.doesNotMatch(AP_CODE, /border-b border-gray-200 bg-gray-(50|100|200)\b/,
    'толгой дээр крем дүүргэлт буцаж орсон ✗');
  assert.doesNotMatch(AP_CODE, /border-b border-gray-200 bg-white shadow-card/,
    'толгой дээр ⏳ (83)-ийн `shadow-card` буцаж орсон ✗ (хавтгай хэв — зөвхөн зураас)');
  assert.ok(AP_CODE.includes('border-t border-gray-200 bg-white shadow-['),
    'мобайл доод цэс `bg-white` (+1px дээд зураас ба зөөлөн сүүдэр) БИШ ✗');
  // ⚠️ `hover:bg-gray-50` / `active:bg-gray-50` нь СТАТИК дүүргэлт БИШ — зөвхөн
  //    хүрэх/дарах мөчид гардаг хариу үйлдэл тул ХӨНДӨӨГДӨӨГҮЙ ✓ (жишиг сайт
  //    дээр ч холбоос дээгүүр гүйлгэхэд ижил тодруулга гардаг)
  assert.match(AP_CODE, /hover:bg-gray-50/, 'ховерын хариу үйлдэл ХАСАГДСАН ✗ (UX)');
});

// ---------- 🧩 (114) ЗАР ОРУУЛАХ ХУУДАС — EMOJI 0 (2026-10-10) ----------
/**
 * 🧽 Тайлбарыг ЗАЙГААР маскилна — ⚠️ мөрийн ДУГААР ба БАЙТ урт ХӨНДӨӨГДӨХГҮЙ
 *    (алдааны мөрдөлт яг эх файлын мөрөөр гарахын тулд `codeOnly`-оос ЯЛГААТАЙ:
 *    энэ нь мөрийн дараах тайлбарыг (`const a = 1; // …`) ч маскилна ✓)
 */
const maskComments = (src) => src
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|\s)\/\/[^\n]*/gm, (m) => m.replace(/[^\n]/g, ' '));

/**
 * 🎯 ЗӨВХӨН emoji/пиктограф — ⚠️ `←` `→` `›` `▸` `—` `…` `«»` `↑↓` нь
 *    ХЭВЛЭЛИЙН (typography) тэмдэгт, emoji БИШ тул орохгүй ✓
 */
const FORM_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}]/u;

t('🧩 (114) Зар оруулах хуудас + туслах компонентууд: ЦЭВЭР код дээр emoji 0 ✓', () => {
  const FORM_FILES = [
    'components/AddListingClient.jsx',     // ① форм (алхам/wizard, чип, товч)
    'components/LocationMapPicker.jsx',    // ② газрын зургийн сонгогч (модаль)
    'components/SearchableSelect.jsx',     // ③ хайлттай сонгогч (марк/брэнд)
    'components/YouTubeField.jsx',         // ④ YouTube линк талбар
    'components/WheelPicker.jsx',          // ⑤ тооны хүрд (он/давхар)
  ];
  const bad = [];
  for (const f of FORM_FILES) {
    maskComments(readSrc(f)).split('\n').forEach((line, i) => {
      if (FORM_EMOJI.test(line)) bad.push(`${f}:${i + 1}  ${line.trim()}`);
    });
  }
  assert.deepEqual(bad, [], `форм дээр emoji эргэж орсон ✗:\n${bad.join('\n')}`);
});

t('🧩 (114) `✓`/`✕` тэмдэгт нь SVG БОЛОВ — `CheckIcon`/`CloseIcon` (HeaderIcons) ✓', () => {
  // ⚠️ Фонт бүрд өөр зурагдах тэмдэгтийн оронд `currentColor` дагадаг SVG ✓
  assert.ok(ICONS_CODE.includes('export function CheckIcon('), '`CheckIcon` (HeaderIcons) алга ✗');
  assert.ok(ICONS_CODE.includes('export function CloseIcon('), '`CloseIcon` (HeaderIcons) алга ✗');
  const FORM_CODE = maskComments(readSrc('components/AddListingClient.jsx'));
  assert.equal((FORM_CODE.match(/<CheckIcon /g) || []).length, 3,
    'форм дээр `CheckIcon` ЯГ 3 (чип + 2 мобайл сонголт) байх ёстой ✗');
  assert.equal((FORM_CODE.match(/<CloseIcon /g) || []).length, 1,
    'форм дээр `CloseIcon` ЯГ 1 (газрын зургийн «Арилгах») байх ёстой ✗');
  assert.doesNotMatch(FORM_CODE, /<span aria-hidden="true">[✓✕]/,
    '`✓`/`✕` тэмдэгт (`<span aria-hidden>`) буюу буцаж орсон ✗');
});

console.log(`\n✅ Нийт ${passed} шалгалт амжилттай — лого «ZarBook.mn» (ЗӨВХӨН текст, нүүр хуудасны ГАНЦ линк; 🆕 (91) тусдаа икон ХАСАГДАВ) + брэнд БҮГДЭЭ ZarBook.mn ✓\n`);

