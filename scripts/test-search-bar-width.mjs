// ============================================================
// test-search-bar-width.mjs — 🖥 ХАЙЛТЫН МӨРИЙН ӨРГӨН ГЭРЭЭ (2026-10-07 (60))
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «home ийн search bar арай л урт юм аа, талиг нь хасаач»
//    ⇒ Home (`/`) дээрх ТОЛГОЙН хайлтын мөр (`components/HomeClient.jsx` →
//    `HeaderSearchBar`) нь:
//      ① 🖥 `variant='header'` (≥xl) дээр `max-w-[480px]`-ээр ХЯЗГААРЛАГДАНА
//         (⏳ урд нь `w-full` нь `AppProviders`-ийн `flex-1` слатыг БҮТЭН
//            дүүргэж ~800px болж хэт урт харагддаг байв ✗)
//      ② `mx-auto` — слат дотроо төвлөрнө (лого ↔ баруун товчнуудын завсар)
//      ③ 📱 `variant='mobile'` (толгойн доорх наалдамхай мөр) нь БҮТЭН өргөн ХЭВЭЭР ✓
//
// ⚠️ ЗӨВХӨН ХАРАГДАЦ (өргөн): `onSubmit`/санал/`combobox`/`#home-search` ХӨНДӨӨГДӨӨГҮЙ ✓
//
// АЖИЛЛУУЛАХ:  npm run test:search-bar
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
 * 🧹 БҮХ тайлбарыг хасна (JSX блок · JS блок · мөрийн тайлбар) — регресс шалгалт
 *    нь тайлбар дотор дурдагдсан хуучин класс/утгаар ХУУРАМЧААР УНАХГҮЙН тулд ✓
 *    (⚠️ энэ шинэ тайлбар өөрөө `max-w-[480px]` гэж дурдсан тул зайлшгүй)
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

console.log('\n🔍 Хайлтын мөр — 🖥 ТОЛГОЙН өргөн ХЯЗГААР (2026-10-07 (60))\n');

/** 📄 Файлын ЦЭВЭР код (тайлбаргүй) — регресс шалгалтад */
const HOME = stripComments(readSrc('components/HomeClient.jsx'));

t('🖥 Толгойн форм нь `max-w-[480px]`-ээр ХЯЗГААРЛАГДАНА ✓', () => {
  assert.match(HOME, /max-w-\[480px\]/, 'хайлтын мөрийн `max-w-[480px]` дутуу ✗');
});

t("🧭 Зөвхөн `isHeader` (🖥) дээр хязгаарлана — 📱 мобайл БҮТЭН өргөн ХЭВЭЭР ✓", () => {
  assert.match(HOME, /isHeader \? 'mx-auto max-w-\[480px\]' : ''/,
    'нөхцөлт (`isHeader`) хязгаар дутуу/өөр ✗');
});

t('🎯 `mx-auto` — слат дотроо ТӨВЛӨРНӨ (лого ↔ баруун товчнуудын завсар) ✓', () => {
  assert.match(HOME, /mx-auto max-w-\[480px\]/, '`mx-auto` төвлөрүүлэлт дутуу ✗');
});

t('⏳ Хуучин БҮТЭН өргөнтэй форм (`className="flex w-full …"`) ХАСАГДСАН ✓', () => {
  assert.doesNotMatch(HOME, /className="flex w-full min-w-0 items-center gap-2"/,
    'хуучин `w-full` ганцтай форм үлдсэн ✗');
});

t('✅ ФУНКЦИОНАЛ ХӨНДӨӨГДӨӨГҮЙ — `role="search"` · `onSubmit` · санал · combobox ✓', () => {
  assert.match(HOME, /role="search"/, 'форм дутуу ✗');
  assert.match(HOME, /onSubmit=\{handleSubmit\}/, '`onSubmit` дутуу ✗');
  assert.match(HOME, /data-search-suggest/, 'саналын дэгээ дутуу ✗');
  assert.match(HOME, /role="combobox"/, 'a11y (`combobox`) дутуу ✗');
  assert.match(HOME, /id=\{idBase\}/, '`#home-search`/`#home-search-mobile` дутуу ✗');
});

t('📱 Мобайл слат нь БҮТЭН өргөн ХЭВЭЭР (`renderSearchBar(\'mobile\')` + `xl:hidden`) ✓', () => {
  assert.match(HOME, /renderSearchBar\('mobile'\)/, 'мобайл слат дутуу ✗');
  assert.match(HOME, /sticky top-16 z-30 border-b border-gray-200 bg-white px-4 py-2\.5 xl:hidden/,
    'мобайл наалдамхай слатын класс дутуу/өөр ✗');
});

t('🧱 `AppProviders` слат ХӨНДӨӨГДӨӨГҮЙ (`flex-1 … xl:flex`) ✓', () => {
  const AP = stripComments(readSrc('components/AppProviders.jsx'));
  assert.match(AP, /hidden min-w-0 flex-1 items-center px-2 xl:flex xl:px-3/,
    'толгойн слатын класс дутуу/өөр ✗');
});

console.log(`\n✅ Нийт ${passed} шалгалт амжилттай — Home-ийн 🖥 ТОЛГОЙН хайлтын мөр ~хагас (≤480px) болов ✓\n`);
