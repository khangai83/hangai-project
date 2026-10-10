// ============================================================
// test-detail-wizard.mjs — 📱 3-Р АЛХМЫН «АСУУЛТ БҮР НЭГ ДЭЛГЭЦ» ГЭРЭЭ
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-02): «зарын гарчиг, талбай, угаалгын өрөө,
//    ашиглалтанд орсон он … бүгдийг нь нэг нэгээр нь харуул» — өмнө нь 📱
//    390px дээр 3-р алхам (📋 Дэлгэрэнгүй) нь БҮХ талбараа цувж харуулдаг
//    байв ✗ ⇒ одоо дэлгэц бүрд НЭГ талбар (`жишиг сайтын зар оруулах хуудас`-ийн зан).
//    Энэ тест нь тэр ГЭРЭЭГ эх файлуудаас ШУУД уншиж түгжинэ ✓
//
// ХАМРАХ ХҮРЭЭ (DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node):
//   ① Төлөв ба дэлгэцийн жагсаалт — `mobileDetailStep` + `detailScreens`
//      (дараалал: гарчиг → аттр* → талбай → он → нийт давхар → давхар →
//      Угаалгын өрөөний тоо → тагт → гараж; «Өрөө» БАЙХГҮЙ — 1-р алхмын drill-down ✓)
//   ② Заавал талбарын ХААЛТ — мессеж нь `validateStep('details')`-тэй ИЖИЛ
//   ③ DOM маркууд — `data-detail-row` / `data-detail-field` / `data-mobile-active`
//      (талбар бүр ТУСДАА, «нэг дэлгэцэд нэг талбар» ✓)
//   ④ Мобайл толгой + wizard навигаци (`data-mobile-detail-*`) ба ТАЛХМЫН
//      навигацитай ДАВХАРДАХГҮЙ байдал (`hide-below-sm`) ✓
//   ⑤ CSS (`app/globals.css`) — дүрэм нь ЗӨВХӨН `max-width: 639.98px` дотор
//      (🖥 ≥640px дээр бүх талбар ХЭВЭЭР ✓)
//   ⑥ 🖥 ≥640px — СОНГОСОН АНГИЛАЛ / БАЙРШИЛ (`DesktopSummary`, 2026-10-05):
//      хэрэглэгчийн хүсэлт «Зар нэмэх форм дээр сонгосон категори/байршил
//      КОМПЬЮТЕР дээр харагдахгүй байна» ⇒ сонгосон зам нь ЗӨВХӨН 📱
//      `MobileAnswers` (`sm:hidden`) дотор байсан тул 🖥 дээр 2-р алхмаас хойш
//      юу сонгосон нь ХААНА Ч байгаагүй ✗ ⇒ 🆕 `data-desktop-summary` хүснэгт:
//      🗂 АНГИЛАЛ (`step >= 1`) + 📍 БАЙРШИЛ (`step >= 2`) — 1-р алхамд
//      ГАРАХГҮЙ (сонголт нь picker дээрээ бий — давхардал 0 ✓)
//      (1-р алхмын `[data-picker-summary]` ба 2-р алхмын `[data-location-summary]`
//      -тай ДАВХАРДАХГҮЙ ✓) · утга нь формойн state-ээс ШУУД
//      (`pickedCategoryPath`/`pickedLocationPath` — 📱-тай НЭГ ЭХ СУРВАЛЖ ✓)
//   ⑥′ 🖥 ✏️ «ЗАСАХ» ТОВЧ (2026-10-05, 52 — хэрэглэгчийн хүсэлт: «бусад мэдээлэл
//      оруулах хэсэг гарч байгаа хуудсан дээрээс дээрх 2-оо засах боломжтой
//      байх товч тус тусд нь»): хүснэгтийн мөр БҮРД тусдаа товч —
//      🗂 Ангилал → `[data-desktop-summary-edit="category"]` (1-р алхам) ·
//      📍 Зарын байршил → `[data-desktop-summary-edit="location"]`
//      (2-р алхам) · ⚠️ `type="button"` (`<form>` дотор — submit болохгүй ✓) ·
//      ⚠️ Handler нь 📱 `mobileAnswerEdit`-тай НЭГ ЭХ СУРВАЛЖ ✓
//      🔍 Хайх үг: DesktopSummary, data-desktop-summary, pickedCategoryPath,
//         data-desktop-summary-edit, ✏️ Засах
//   ⑦ 🖥 БА 📱 — АЛХАМТ ФОРМ (2026-10-05, 2 дахь засвар): «🖥 нэг урт хуудас»
//      (бүх 5 алхам ЗЭРЭГ) нь АЛДАА байв ✗ (сонгосон ангилал/байршлын хэсэг
//      дараагийн алхамд МӨН харагдаж байв) ⇒ форм нь 🖥 дээр ч 📱 шиг
//      ЗӨВХӨН ОДООГИЙН алхмыг харуулна. Механизм нь КЛАСС: блок бүр DOM-д
//      БАЙНГА, идэвхтэй бус нь `hidden` (`display:none`) ✓
//      · `data-step-block` = 7 блок: category · location · details · price ·
//        desc · media · media-images (price+desc нь өмнө НЭГ `step === 3`
//        блок байсныг ХОЁР болгож салгав — тайлбар нь үнийн ДАРАА ✓)
//      · алхмын навигаци нь БҮХ дэлгэцэд (🖥-ийн тусдаа доод блок ХАСАГДАВ ✓)
//      · 🪜 СТАБИЛ СЕЛЕКТОРУУД: `[data-step-back]` · `[data-step-next]` ·
//        `[data-step-submit]` (өмнөх 🖥 `[data-desktop-cancel]` /
//        `[data-desktop-submit]` ХАСАГДАВ)
//      · `submitLabel` = 📱/🖥 НЭГ ЭХ СУРВАЛЖ (нэг л доод товч)
//      · `[data-step-current]` нь БҮХ дэлгэцэд (CDP selector ✓)
//      🔍 Хайх үг: data-step-block, hidden, алхамт форм, submitLabel
//
//   ⑦′ 🖥 3 ХУУДАС — 3, 4 БА 5-Р АЛХАМ НЭГ БОЛОВ (2026-10-05, 57, хэрэглэгчийн
//      хүсэлт: «step 1, 2 нь тусдаа хуудас — зөв; step 3 нь 1, 2-ын араас
//      орж ирдэг; харин step 3, 4, 5-ыг НЭГ болго»):
//      🖥 ≥640px дээр форм нь ① Ангилал → ② Байршил →
//      **③ 📋 Дэлгэрэнгүй + 💰 Үнэ + 📝 Тайлбар + ☎️ утас + 🖼 Зураг**
//      (нэгтгэсэн) = 3 хуудас ✓ (⏳ өмнө 🖥 дээр 5 хуудас: ③ Дэлгэрэнгүй ·
//      ④ Үнэ+Тайлбар · ⑤ Зураг ✗) · 📱 <640px ХӨНДӨГДӨХГҮЙ (5 дэлгэц ✓)
//      · 🧩 Блокны харагдац нь ЗӨВХӨН CSS (`hidden sm:block`) ⇒ SSR дээр ч
//        🖥-ийн нэгтгэсэн хуудас ЗӨВ (hydrate хүлээхгүй ✓):
//        `details` = `step === 2 ? '' : step === 3 || step === 4 ? 'hidden sm:block' : 'hidden'` ·
//        `price`/`desc` = `step === 3 ? '' : step === 2 || step === 4 ? 'hidden sm:block' : 'hidden'` ·
//        `media`/`media-images` = `step === 4 ? '' : step === 2 || step === 3 ? 'hidden sm:block' : 'hidden'`
//        (мөн `?step=4`/`?step=5` хаягаар 🖥 дээр орсон ч хуудас ХАГАС
//        ХООСОН болохгүй ✓)
//      · 🖥/📱 ялгаатай цор ганц зүйл = ДООД ТОВЧ (`type` ба бичиг өөр) ⇒
//        🆕 `useIsDesktop()` hook (matchMedia `(min-width: 640px)`) +
//        `lastStepIndex` (🖥 = `STEPS.length - 3`, 📱 = `STEPS.length - 1`) ✓
//        ⇒ 🖥 дээр 3 дахь (сүүлийн) хуудсанд «✅ Зар нийтлэх» гарна ✓
//      · `stepLabel` — 🖥 3 дахь хуудсанд «Дэлгэрэнгүй ба үнэ, зураг»,
//        📱 дээр 3 дахь «Дэлгэрэнгүй» / 4 дэх «Үнэ» / 5 дахь «Зураг» ✓
//      · ⚠️ АЛХМЫН ШАЛГАЛТ ХӨНДӨГДӨӨГҮЙ: `STEPS` (5) · `validateStep` ·
//        `firstInvalidStep` (→ `handleSubmit` нь 3, 4, 5-р алхмыг ДАРААЛАН
//        шалгаж, дутуу талбарыг ЗААЖ өгнө ✓) ⇒ DB/API/payload/migration
//        ХӨНДӨГДӨӨГҮЙ ✓
//      🔍 Хайх үг: lastStepIndex, useIsDesktop, hidden sm:block,
//         Дэлгэрэнгүй ба үнэ, зураг
//

//   ⑧ 📱 ОН · НИЙТ ДАВХАР · ДАВХАР — ГАРААС БИЧИЛТ (2026-10-05, 53,
//      хэрэглэгчийн хүсэлт): эдгээр 3 ТООН талбар нь 📱 <640px дээр 2 БАГАНАТ
//      ЖАГСААЛТ БИШ, шууд `input[type=number]` болов (`ChoiceField`-ийн
//      `mobileInput` туг: `data-mobile-input="true"` + `.hide-below-sm`
//      ХАСАГДАВ + `MobileOptions` РЕНДЭРЛЭГДЭХГҮЙ) ⇒ дэлгэцэд доод
//      «Алгасах / Үргэлжлүүлэх →» товч гарна (дармагц шилжих БИШ ✓) ·
//      `detailScreens`-ээс `pick: true` ХАСАГДАВ · 🎡 «Гүйлгээд сонгох»
//      холбоос нь НЭМЭЛТ боломж хэвээр (богино жагсаалт ⚙️/🎨/🌿/🚿 ХЭВЭЭР) ·
//      🖥 ≥640px ба DB/API/payload ХӨНДӨГДӨӨГҮЙ ✗ (migration ШААРДЛАГАГҮЙ)
//      🔍 Хайх үг: mobileInput, data-mobile-input, pick: true, MobileOptions
//
// АЖИЛЛУУЛАХ:  npm run test:wizard
//    📱 CDP-ээр жинхэнэ дэлгэцүүдийг шалгах: `npm run cdp:picker`
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
/**
 * 📝 2026-10-07 — «Тайлбар» нь 🏷️ гарчигны ЯГ ДАРАА гарах хэсэг эсэх нь
 *    ЦЭВЭР модуль дээр (`descriptionAfterTitle`). Энэ тест нь тэр гэрээг
 *    «энгийн формтой» БҮХ хэсэг (+ 💻 condition-only дэд төрөл) ба
 *    ХӨНДӨӨГДӨХГҮЙ хэсгүүд (🏠/🚗/💼/💻 Notebook) дээр түгждэг ✓
 */
import { descriptionAfterTitle } from '../lib/locationData.js';

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

console.log('\n📱 3-р алхам (📋 Дэлгэрэнгүй): «асуулт бүр нэг дэлгэц» (мобайл)\n');

const FORM = readSrc('components/AddListingClient.jsx');
/**
 * 📍 «Байршил»-ийн ЦЭВЭР модуль (2026-10-06) — `pickedLocationPath` болон
 * тусгаарлагч нь эндээс (`PATH_SEP`) ⇒ гэрээг хоёр файлаас шалгана ✓
 */
const LOC_SRC = readSrc('lib/listingLocation.mjs');
const CSS = readSrc('app/globals.css');

/** 🧩 `{ … }` тэнцвэртэй блокийн ТӨГСГӨЛИЙН дараах индекс */
const blockEnd = (src, start) => {
  assert.ok(src[start] === '{', 'блок эхлэл `{` олдсонгүй');
  let i = start + 1;
  let depth = 1;
  while (i < src.length && depth > 0) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') depth -= 1;
    i += 1;
  }
  return i;
};
/** 🧩 `{ … }` тэнцвэртэй блок гаргаж авах (эхлэлийн индекс → блок) */
const blockTo = (src, from) => src.slice(from, blockEnd(src, src.indexOf('{', from)));
/** 📦 Функц/IIFE-ийн биеийг НЭРЭЭР нь гаргаж авах (эх файлаас) */
const bodyOf = (src, marker) => {
  const at = src.indexOf(marker);
  assert.ok(at > -1, `«${marker}» олдсонгүй`);
  return blockTo(src, at);
};
/** 📦 `function f({ … }) { … }` — ПАРАМЕТРИЙН `{}`-ийг алгассаны дараах бие */
const fnBody = (src, marker) => {
  const at = src.indexOf(marker);
  assert.ok(at > -1, `«${marker}» олдсонгүй`);
  return blockTo(src, blockEnd(src, src.indexOf('{', at)));
};
/** 🎨 `@media (…) { … }` блокийг бүхэлд нь олох */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mediaBlocks = (css, query) => {
  const re = new RegExp(`@media\\s*\\(${esc(query)}\\)\\s*\\{`, 'g');
  const out = [];
  let m = re.exec(css);
  while (m) {
    out.push(blockTo(css, m.index));
    m = re.exec(css);
  }
  return out;
};


// ────────────────────────────────────────────────────────────
// ① ТӨЛӨВ БА ДЭЛГЭЦИЙН ЖАГСААЛТ (`detailScreens`)
// ────────────────────────────────────────────────────────────
console.log('── ① Төлөв ба дэлгэцийн жагсаалт ──');

t('📱 `mobileDetailStep` нь эхний дэлгэц `title`-ээр эхэлнэ (key-ээр, дугаараар БИШ ✓)', () => {
  assert.match(FORM, /const \[mobileDetailStep, setMobileDetailStep\] = useState\('title'\)/);
});

const screensBody = bodyOf(FORM, 'const detailScreens = (() => {');

t('📱 `detailScreens` нь ЗӨВ дараалалтай (гарчиг → 📝 тайлбар* → аттр* → 💳 төлбөр → талбай → он → нийт давхар → давхар → угаалгын өрөөний тоо → тагт → гараж ✓)', () => {
  const order = [...screensBody.matchAll(/key:\s*'([^']+)'|key:\s*`attr-\$\{f\.key\}`/g)]
    .map((m) => m[1] || 'attr-<key>');
  /** ⚠️ 2026-10-07: 📝 `description` нь ЭНГИЙН формтой хэсэгт (⚙️ attr нь
   *  зөвхөн ✅ «Төлөв», эсвэл огт байхгүй — `descriptionAfterTitle`) гарчигны
   *  ЯГ ДАРАА нэмэгдэнэ; бусад хэсэгт нэмэгдэхгүй (`if (descAfterTitle)`) ✓ */
  assert.deepEqual(order, [
    'title', 'description', 'attr-<key>', 'payments', 'area',
    'buildYear', 'totalFloors', 'floor', 'bathrooms', 'balconies', 'garage',
  ]);
});

t('💳 «Төлбөрийн нөхцөл» дэлгэц нь ЗӨВХӨН `showPayments` (үл хөдлөх/авто) + ШИНЭ зард ЗААВАЛ', () => {
  // ⚠️ Бусад хэсэгт (ажил/компьютер/бараа/үйлчилгээ) дэлгэц НЭМЭГДЭХГҮЙ ✓
  assert.ok(screensBody.includes("if (showPayments) out.push({\n      key: 'payments'"),
    'payments нөхцөл (showPayments)');
  assert.ok(screensBody.includes("title: '💳 Төлбөрийн нөхцөл'"), 'гарчиг');
  // ⚠️ Заавал нь зөвхөн ШИНЭ зард (`required: !isEdit`) — хуучин зарууд
  //    `attrs.payment_terms`-гүй тул засах горимд хаагдахгүй ✓
  const payScreen = screensBody.slice(screensBody.indexOf("key: 'payments'"));
  assert.ok(payScreen.slice(0, 220).includes('required: !isEdit'), 'required: !isEdit (зөвхөн шинэ зар)');
  /** ⚠️ Дараалал нь DOM-той ИЖИЛ: аттрибутуудын ДАРАА, «Талбай»-н өмнө ✓ */
  assert.ok(screensBody.indexOf("key: 'payments'") < screensBody.indexOf("key: 'area'"),
    'payments нь area-гийн ӨМНӨ');
});

t('📱 «Өрөө» дэлгэцэд БАЙХГҮЙ (`rooms` — 1-р алхмын drill-down-д асуусан ✓)', () => {
  /** ⚠️ `showBathrooms` гэдэг үг дотор «rooms» байдаг тул зөвхөн ЯГ тэр
   *  түлхүүрийг шалгана (`'rooms'` / `key: rooms`) ✓ */
  assert.doesNotMatch(screensBody, /'rooms'/);
  assert.doesNotMatch(screensBody, /key:\s*rooms\b/);
});

t('📱 Дэлгэц бүр зөв НӨХЦӨЛӨӨР нэмэгдэнэ (талбар байхгүй бол дэлгэц ч байхгүй ✓)', () => {
  assert.ok(screensBody.includes("if (isRealEstate) out.push({ key: 'area'"), 'area нөхцөл');
  assert.ok(screensBody.includes("if (showBathrooms) out.push({ key: 'bathrooms'"), 'bathrooms нөхцөл');
  assert.ok(screensBody.includes("if (showFloors && showApartment) out.push({ key: 'buildYear'"), 'buildYear нөхцөл');
  assert.ok(screensBody.includes("if (showFloors) out.push({ key: 'totalFloors'"), 'totalFloors нөхцөл');
  assert.ok(screensBody.includes("if (showFloors) out.push({ key: 'floor'"), 'floor нөхцөл');
  assert.ok(screensBody.includes("if (showFloors && showApartment) out.push({ key: 'balconies'"), 'balconies нөхцөл');
  assert.ok(screensBody.includes("if (showApartment) out.push({ key: 'garage'"), 'garage нөхцөл');
});

t('📱 Хэсгийн НЭМЭЛТ талбарууд (ж: 🚗 Брэнд/Он/Гүйлт) тус бүр ӨӨРИЙН дэлгэцтэй (`attr-<key>` ✓)', () => {
  assert.match(screensBody, /attrFields\.forEach/);
  assert.ok(screensBody.includes('key: `attr-${f.key}`'), 'attr-<key> түлхүүр');
});

t('📱 Гарчиг нь ЗӨВХӨН шинэ зард «заавал» (засах горимд `validateStep` ч шаарддаггүй ✓)', () => {
  assert.ok(screensBody.includes('required: !isEdit'), 'required: !isEdit');
});

t('📝 (2026-10-07) `descriptionAfterTitle` — энгийн формтой хэсэгт ГАРЧГИЙН ДАРАА, бусадт ҮНЭ-ний дараа ✓', () => {
  /** ① Энгийн форм (⚙️ attr нь ЗӨВХӨН ✅ «Төлөв», эсвэл огт байхгүй) ⇒ true */
  ['furniture', 'home', 'electric', 'construction', 'equipment', 'travel', 'hobby', 'services']
    .forEach((s) => assert.equal(descriptionAfterTitle(s), true,
      `${s}: 📝 тайлбар нь гарчигны дараа БАЙХ ЁСТОЙ ✗`));
  /** ② 💻 condition-only ДЭД ТӨРӨЛ (getAttrFields зөвхөн ✅ үлдээнэ) ⇒ true */
  assert.equal(descriptionAfterTitle('computers', 'Дэлгэц'), true, '💻 «Дэлгэц» ✗');
  assert.equal(descriptionAfterTitle('computers', 'Иж бүрэн компьютер'), true, '💻 «Иж бүрэн компьютер» ✗');
  assert.equal(descriptionAfterTitle('computers', 'PS, XBox, Nintendo'), true, '💻 «PS, XBox, Nintendo» ✗');
  // 🆕 2026-10-07 (55) (хэрэглэгчийн хүсэлт: «Процессор, сервер ийн зарын
  //    оролтын мэдээлэл Mouse тай адил болго»): «Процессор, сервер» нь Mouse
  //    адил condition-only болов ⇒ 📝 тайлбар ГАРЧГИЙН ДАРАА гарна ✓
  assert.equal(descriptionAfterTitle('computers', 'Процессор, сервер'), true, '💻 «Процессор, сервер» (Mouse-той адил) ✗');
  assert.equal(descriptionAfterTitle('computers', 'Mouse'), true, '💻 Mouse ✗');
  /** ③ ⚠️ ХӨНДӨӨГДӨХГҮЙ: 💻 Notebook · 🏠 үл хөдлөх · 🚗 авто · 💼 ажил ⇒ false */
  assert.equal(descriptionAfterTitle('computers', 'Notebook'), false, '💻 Notebook ✗');
  assert.equal(descriptionAfterTitle('real-estate'), false, '🏠 үл хөдлөх ✗');
  assert.equal(descriptionAfterTitle('auto'), false, '🚗 авто ✗');
  assert.equal(descriptionAfterTitle('jobs'), false, '💼 ажил ✗');
});

t('📱 Хүчингүй түлхүүр (ж: хэсэг солигдов) → ЭХНИЙ дэлгэц рүү унана (index < 0 → 0 ✓)', () => {
  assert.match(FORM, /const detailIdxRaw = detailScreens\.findIndex\(\(s\) => s\.key === mobileDetailStep\)/);
  assert.match(FORM, /const detailIdx = detailIdxRaw < 0 \? 0 : detailIdxRaw/);
});

t("📱 `data-mobile-active` нь ТЕКСТ ('true'/'false') — boolean БИШ (React-ийн data-* зан ✓)", () => {
  assert.match(FORM, /const detailRowActive = \(group\) => \(activeDetail\.group === group \? 'true' : 'false'\)/);
  assert.match(FORM, /const detailFieldActive = \(key\) => \(activeDetail\.key === key \? 'true' : 'false'\)/);
  assert.match(FORM, /mobileActive \? 'true' : 'false'/);
});

// ────────────────────────────────────────────────────────────
// ② ЗААВАЛ ТАЛБАРЫН ХААЛТ («Зарын гарчиг») — НЭГ ЭХ СУРВАЛЖ
// ────────────────────────────────────────────────────────────
console.log('\n── ② Заавал талбарын хаалт ──');

const nextBody = bodyOf(FORM, 'const mobileDetailNext = () => {');

t('🛡️ Заавал талбар (гарчиг · 💳 төлбөр) ХООСОН үед урагш ЯВАХГҮЙ (`setError` + `return` ✓)', () => {
  // ⚠️ 2026-10-03: шалгалт нь `requiredDetailMsg(key)` руу нэгдэв (нэг эх сурвалж) —
  //    `mobileDetailNext` нь зөвхөн ҮР ДҮНГ ашиглана (мессежийг ЭНД бичихгүй ✓)
  assert.match(nextBody, /const req = cur && cur\.required \? requiredDetailMsg\(cur\.key\) : ''/);
  assert.match(nextBody, /if \(req\) \{\s*setError\(req\);\s*return;\s*\}/);
});

t("🛡️ Мессеж нь `validateStep('details')`-тэй ЯГ ИЖИЛ (нэг эх сурвалж `requiredDetailMsg` ✓)", () => {
  // ① Гарчиг — дүрэм нь `requiredDetailMsg('title')`
  assert.match(FORM, /if \(key === 'title' && !isEdit && !String\(form\.title \|\| ''\)\.trim\(\)\) \{\s*return '([^']+)'/);
  // ② 💳 Төлбөрийн нөхцөл — мөн адил нэг газарт
  assert.match(FORM, /if \(key === 'payments' && !isEdit && showPayments && !form\.payments\.length\) \{\s*return PAYMENT_REQUIRED_MSG/);
  // ③ `validateStep('details')` нь ЧУХАЛ дарааллаар дуудна (гарчиг → төлбөр) ✓
  assert.match(FORM, /const req = requiredDetailMsg\('title'\) \|\| requiredDetailMsg\('payments'\)/);
  assert.match(nextBody, /requiredDetailMsg\(cur\.key\)/, '📱 wizard');
  // ④ Мессеж нь хэрэглэгчид ойлгомжтой, «сонгоно уу» гэж хэлнэ
  assert.match(FORM, /const PAYMENT_REQUIRED_MSG = '([^']*сонгоно уу[^']*)'/);
});

t('🪜 `mobileDetailNext`: дараагийн ТАЛБАР руу (алхам руу БИШ), сүүлийн дэлгэцээс `goNext()` ✓', () => {
  assert.match(nextBody, /setMobileDetailStep\(detailScreens\[detailIdx \+ 1\]\.key\)/);
  assert.match(nextBody, /if \(isLastDetail\) \{ goNext\(\); return; \}/);
});

t('↩️ `mobileDetailBack`: өмнөх дэлгэц, хамгийн эхний дэлгэцээс `goBack()` (2-р алхам руу ✓)', () => {
  const backBody = bodyOf(FORM, 'const mobileDetailBack = () => {');
  assert.match(backBody, /if \(isFirstDetail\) \{ goBack\(\); return; \}/);
  assert.match(backBody, /setMobileDetailStep\(detailScreens\[detailIdx - 1\]\.key\)/);
});


// ────────────────────────────────────────────────────────────
// ③ DOM МАРКУУД — ТАЛБАР БҮР ТУСДАА («нэг дэлгэцэд нэг талбар»)
// ────────────────────────────────────────────────────────────
console.log('\n── ③ DOM маркууд ──');

/** 📄 3-р алхмын JSX-ийг гаргаж авах (дараагийн алхмаас өмнөх хэсэг) */
const step3 = (() => {
  const from = FORM.indexOf('data-step-block="details"');
  assert.ok(from > -1, '3-р алхмын блок олдсонгүй');
  const to = FORM.indexOf('═══ 4-р алхам', from);
  assert.ok(to > from, '4-р алхмын эхлэл олдсонгүй');
  return FORM.slice(from, to);
})();

t('📱 8 МӨР (title · 📝 description · attrs · 💳 payments · area · floors-1 · floors-2 [давхар+угаалгын өрөөний тоо+тагт] · garage) бүгд `data-detail-row` + `data-mobile-active`-тай (CSS-ийн НЭГ эх сурвалж ✓)', () => {
  const rows = ['title', 'description', 'attrs', 'payments', 'area', 'floors-1', 'floors-2', 'garage'];
  rows.forEach((name) => {
    const re = new RegExp('data-detail-row="' + name + '"[\\s\\S]{0,200}?'
      + "data-mobile-active=\\{detailRowActive\\('" + name + "'\\)\\}");
    assert.match(step3, re, `мөр «${name}»`);
  });
  assert.equal((step3.match(/data-detail-row="/g) || []).length, rows.length);
});

t('📱 Гарчиг / Тайлбар / Талбай / Гараж / 💳 төлбөр — `.form-group` дээр `data-detail-field` + `detailFieldActive` ✓', () => {
  ['title', 'description', 'area', 'garage'].forEach((k) => {
    assert.ok(step3.includes('data-detail-field="' + k + '" data-mobile-active={detailFieldActive(\'' + k + '\')}'),
      `талбар «${k}»`);
  });
  // ⚠️ 💳 payments нь олон мөртэй JSX — `.form-group` дээр `data-detail-field="payments"`,
  //    дараагийн мөрөнд `data-mobile-active={detailFieldActive('payments')}` ✓
  assert.ok(step3.includes('data-detail-field="payments"\n                  data-mobile-active={detailFieldActive(\'payments\')}'),
    'талбар «payments» (💳)');
});

t('📱 Хэсгийн аттр талбарууд (ж: 🏷️ Брэнд) — `attr-<key>` марктай (`data-detail-field` ✓)', () => {
  assert.ok(step3.includes('data-detail-field={`attr-${f.key}`}'));
  assert.ok(step3.includes('data-mobile-active={detailFieldActive(`attr-${f.key}`)}'));
});

t('📱 Тоон талбар бүр (`ChoiceField`) `fieldKey` + `mobileActive` дамжуулна (5 ширхэг ✓)', () => {
  ['bathrooms', 'buildYear', 'totalFloors', 'floor', 'balconies'].forEach((k) => {
    assert.ok(step3.includes('fieldKey="' + k + '"'), `fieldKey «${k}»`);
    assert.ok(step3.includes("mobileActive={activeDetail.key === '" + k + "'}"), `mobileActive «${k}»`);
  });
  assert.equal((step3.match(/mobileActive=\{activeDetail\.key ===/g) || []).length, 5);
});

t('📱 `ChoiceField` өөрөө маркийг ТУСГААР нэмнэ (талбарыг ХОЁР ДАХИН рендэрлэхгүй ✓)', () => {
  const cf = fnBody(FORM, 'function ChoiceField(');
  assert.ok(cf.includes('data-detail-field={fieldKey || undefined}'));
  assert.ok(cf.includes("data-mobile-active={mobileActive === undefined ? undefined : (mobileActive ? 'true' : 'false')}")); 
  /** ⚠️ 3-р алхамд БОДИТ `data-detail-field=` марк ЗӨВХӨН 7 газар (title · 📝
   *  description · attrs · 💳 payments · rooms · area · garage); `ChoiceField`-ийн
   *  5 талбар нь ПРОПСООР авна (DOM ХОЁР ДАХИН рендэрлэхгүй — `form`/DB/
   *  `validateStep` хөндөгдөхгүй ✓). 🆕 2026-10-07: 📝 `description` (гарчигны
   *  дараа, `descAfterTitle` үед) НЭМЭГДЭВ ⇒ 6 → 7 ✓
   *  ⚠️ `=`-тэй тоолно: 💳 блокийн JSX коммент дотор ч `data-detail-field` гэсэн
   *     ҮГ бий (дэгээг тайлбарласан) — тэр нь марк БИШ ✓ */
  assert.equal((step3.match(/data-detail-field=/g) || []).length, 7);
});

t('📝 (2026-10-07 (58)) Тайлбарын `<textarea>` нь `rows="8"` — өндөр 2 ДАХИН (⏳ өмнө нь `rows="4"`) ✓', () => {
  /** ⚠️ Тайлбар нь 2 газар рендэрлэгддэг: ① 📱/🖥 `descAfterTitle` мөр (энгийн формтой
   *  хэсэг — гарчгийн дараа) ② 🖥/📱 `desc` блок (💰 үнийн дараа) — ХОЁУЛАНД нь
   *  `value={form.description}`-той ИЖИЛ `<textarea>` ⇒ `rows="8"` 2 удаа байх ёстой ✓ */
  const eight = FORM.match(/<textarea rows="8" value=\{form\.description\}/g) || [];
  assert.equal(eight.length, 2, '`rows="8"` тайлбар 2 газар (descAfterTitle + desc) байх ёстой');
  assert.ok(!/<textarea rows="4"/.test(FORM), '`rows="4"` ҮЛДЭЭГҮЙ байх ёстой');
});

t('📏 (2026-10-08 (61)) Тайлбарын `<textarea>` — өргөн 80% (−20%), өндөр 222px (+10%) ✓', () => {
  /** ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Тайлбарын Text box-ийн өргөнийг 20% хасаж, өндрийг 10% нэм».
   *  📏 CDP хэмжилт: `rows="8"`-ийн БОДИТ өндөр = **202px** (`text-[15px]` × 1.5 = 22.5px/мөр
   *  + padding 2×10px + border 1px) ⇒ +10% = **222px**; өргөн нь `.form-group`-ийн
   *  640px → **512px** = ЯГ 80% ✓
   *  ⚠️ `!` (important) ЗААВАЛ: `app/globals.css`-ийн
   *     `.form-group :is(input, select, textarea):not([type="checkbox"]):not([type="radio"])`
   *     (specificity 0,3,1 — `width: 100%`) нь `w-[80%]` (0,1,0)-г дарна ✗
   *  ⚠️ `rows="8"` ХЭВЭЭР (дээрх тест) — зөвхөн класс нэмэгдэв ✓ */
  const sized = FORM.match(/<textarea rows="8"[\s\S]*?className="!w-\[80%\] !h-\[222px\]" \/>/g) || [];
  assert.equal(sized.length, 2, '`className="!w-[80%] !h-[222px]"` тайлбарын 2 газарт байх ёстой ✗');
  assert.equal((sized.join(' ').match(/!w-\[80%\]/g) || []).length, 2, '`!` (important) алга ✗');
  assert.ok(!/className="w-\[80%\]|className="h-\[222px\]/.test(FORM), '`!`-гүй класс олдлоо ✗');
});
t('📱 «Өрөө» (`rooms`) — 3-р алхмын дэлгэцэд БАЙХГҮЙ (`data-mobile-active="false"` + `.hide-below-sm` ✓)', () => {
  const at = step3.indexOf('data-detail-field="rooms"');
  assert.ok(at > -1, 'rooms талбар олдсонгүй');
  assert.ok(step3.slice(Math.max(0, at - 500), at).includes('form-group hide-below-sm'), 'hide-below-sm');
  assert.ok(step3.slice(at, at + 120).includes('data-mobile-active="false"'), 'data-mobile-active="false"');
});


// ────────────────────────────────────────────────────────────
// ④ МОБАЙЛ ТОЛГОЙ + WIZARD НАВИГАЦИ (алхмын навигацитай ДАВХАРДАХГҮЙ)
// ────────────────────────────────────────────────────────────
console.log('\n── ④ Мобайл толгой ба wizard навигаци ──');

t('📱 Толгой: `data-mobile-detail-head` + `data-mobile-detail-key` (= дэлгэцийн нэр) + `sm:hidden` ✓', () => {
  assert.ok(FORM.includes('data-mobile-detail-head data-mobile-detail-key={activeDetail.key} className="sm:hidden"'));
});

t('📱 Толгой: ← товч (`data-mobile-detail-back`) + «Зар нийтлэх» + «n/N» явц ✓', () => {
  assert.ok(step3.includes('data-mobile-detail-back'));
  assert.ok(step3.includes('aria-label="Буцах"'));
  /** 🆕 2026-10-03 (17): толгойд АСУУЛТЫН НЭР ГАРАХГҮЙ (нэр ДАВХАРДАХГҮЙ) —
   *  жишиг сайтын толгой шиг «Зар нийтлэх» л байна; асуултын нэр доор,
   *  өөрийн талбарын толгойн мөрөнд (`label`) харагдана ✓ */
  assert.ok(step3.includes('Зар нийтлэх</h2>'), 'толгойд «Зар нийтлэх» байх ёстой');
  assert.ok(!step3.includes('{activeDetail.title}'), 'асуултын нэр толгойд ДАВХАРДАХГҮЙ ✓');
  assert.ok(step3.includes('{detailIdx + 1}/{detailScreens.length}'));
});

t('📱 «ӨМНӨХ ХАРИУЛТУУД» — ✏️-тэй мөрүүд (`MobileAnswers`, жишиг сайтын хэв) ✓', () => {
  assert.ok(step3.includes('<MobileAnswers rows={mobileAnswerRows} onEdit={mobileAnswerEdit} />'));
  assert.match(FORM, /function MobileAnswers\(\{ rows = \[\], onEdit \}\)/);
  assert.match(FORM, /data-mobile-answers className="sm:hidden"/);
  assert.match(FORM, /data-mobile-answer-edit=\{r\.key\}/);
  assert.match(FORM, /onClick=\{\(\) => onEdit\(r\.key\)\}/);
  // ⚠️ Утга нь формойн state-ээс ШУУД — шинэ DB багана/хадгалалт БАЙХГҮЙ ✓
  assert.match(FORM, /const detailAnswerText = \(key\) => \{/);
  assert.match(FORM, /const mobileAnswerRows = \(\(\) => \{/);
  // ✏️ нь 1/2-Р АЛХАМ руу ч буцаана (🗂 Ангилал / 📍 Зарын байршил) ✓
  assert.match(FORM, /if \(key === 'step-category'\) \{ gotoStep\(0\); return; \}/);
  assert.match(FORM, /if \(key === 'step-location'\) \{ gotoStep\(1\); return; \}/);
});

t('📱 Сонголттой талбар — дармагц ДАРААГИЙН асуулт (`pickDetail`), доод товч ХАРАГДАХГҮЙ ✓', () => {
  assert.match(FORM, /const pickDetail = \(apply\) => \(v\) => \{ apply\(String\(v\)\); mobileDetailNext\(\); \}/);
  assert.match(FORM, /const skipDetail = \(apply\) => \(\) => \{ apply\(''\); mobileDetailNext\(\); \}/);
  assert.ok(step3.includes('<MobileOptions'), 'талбарууд 2 баганат жагсаалттай болсон ✓');
  assert.match(FORM, /const activePick = !!activeDetail\.pick;/);
  assert.match(FORM, /pick: isAttrPick\(f\),/);
});

t('📱 Wizard нь ЗӨВХӨН 3-р алхамд (`data-step-block="details"`) — 📱 дээр бусад алхамд ХАРАГДАХГҮЙ ✓', () => {
  /** ⚠️ «data-mobile-detail-head» гэсэн үг сэтгэгдэл (🔍 хайх үг) дотор ч
   *  байдаг тул ЗӨВХӨН бодит JSX маркийг тоолно ✓ */
  const MARK = 'data-mobile-detail-head data-mobile-detail-key={activeDetail.key}';
  assert.equal(FORM.split(MARK).length - 1, 1, 'JSX марк ЯГ 1 байх ёстой');
  /** ⚠️ Толгой нь 3-р алхмын бүсэд (`step3` = `data-step-block="details"` …
   *  4-р алхам) байх ёстой ✓
   *  🆕 2026-10-05 (🖥 НЭГ ХУУДАС): алхмын блокууд `{step === N && (…)}` биш,
   *  `data-step-block="…"` + `hide-below-sm` болсон ⇒ хамгийн ойрын блок нь
   *  `details` БАЙХ ЁСТОЙ (📱 дээр зөвхөн идэвхтэй алхам харагдана ✓) */
  assert.ok(step3.includes(MARK), 'толгой нь 3-р алхмын бүсэд байх ёстой');
  const nearest = FORM.lastIndexOf('data-step-block="', FORM.indexOf(MARK));
  assert.ok(
    nearest > -1 && FORM.startsWith('data-step-block="details"', nearest),
    'хамгийн ойрын алхмын блок нь 3-р алхам (`details`) биш',
  );
});

t('📱 Wizard навигаци: «Үргэлжлүүлэх» (`mobileDetailNext`) + «Алгасах» (`hidden` — заавал үед ✓)', () => {
  assert.ok(step3.includes('data-mobile-detail-nav'));
  assert.match(step3, /data-mobile-detail-next[\s\S]{0,200}?onClick=\{mobileDetailNext\}/);
  assert.ok(step3.includes("className={`btn btn-ghost ${activeDetail.required ? 'hidden' : ''}`}"));
});

t('🏁 СҮҮЛИЙН дэлгэц БА сонголттой дэлгэцэд wizard-ийн навигаци ХААГДАЖ, алхмын товч л үлдэнэ ✓', () => {
  /** ⚠️ 2026-10-03 (17): сонголттой талбар дээр (`pick`) доод товч ХЭРЭГГҮЙ —
   *  сонголт дээр дарахад ШУУД дараагийн асуулт руу шилждэг (жишиг сайтын зан) ✓ */
  assert.ok(step3.includes("className={`mt-5 gap-2 sm:hidden ${(isLastDetail || activePick) ? 'hide-below-sm' : 'flex'}`}"));
});

t('🪜 Алхмын «← Буцах» — 3-р алхамд мобайлд ХАРАГДАХГҮЙ (`hide-below-sm` ✓)', () => {
  assert.ok(FORM.includes("className={`btn btn-ghost ${step === 2 ? 'hide-below-sm' : ''}`}"));
});

t('🪜 Алхмын «Үргэлжлүүлэх» — 3-р алхамд ЗӨВХӨН сүүлийн дэлгэцэд (`step === 2 && !isLastDetail` ✓)', () => {
  assert.ok(FORM.includes("className={`btn btn-primary btn-lg ${step === 2 && !isLastDetail ? 'hide-below-sm' : ''}`}"));
});

t('🖥 ≥640px дээр мобайл UI БҮРЭН ХААГДАХГҮЙ (`sm:hidden` — толгой БА навигаци ✓)', () => {
  assert.equal((step3.match(/className="sm:hidden"/g) || []).length, 1, 'толгойн sm:hidden');
  assert.equal((step3.match(/gap-2 sm:hidden/g) || []).length, 1, 'навигацийн sm:hidden');
});


// ────────────────────────────────────────────────────────────
// ④′ 🖥 ≥640px — СОНГОСОН АНГИЛАЛ / БАЙРШИЛ (`DesktopSummary`)
// ────────────────────────────────────────────────────────────
console.log('\n── ④′ 🖥 ≥640px — сонгосон ангилал ба байршил ──');

/** 🧩 `function DesktopSummary(…) { … }` — БҮТЭН компонент (⚠️ `fnBody` нь
 *  параметр нь destructuring тул ЗӨВХӨН параметрийн блокийг буцаана ✗) */
const desktopSummaryComp = (() => {
  const from = FORM.indexOf('function DesktopSummary(');
  assert.ok(from > -1, '🖥 `DesktopSummary` олдсонгүй');
  const end = FORM.indexOf('\n}\n', from);
  assert.ok(end > from, '🖥 `DesktopSummary`-ийн төгсгөл олдсонгүй');
  return FORM.slice(from, end + 2);
})();

t('🖥 `DesktopSummary` нь ТОГТВОРТОЙ selector (`data-desktop-summary`) + 📱 <640px дээр ХААГДАХ (`hidden` … `sm:flex`) ✓', () => {
  assert.ok(desktopSummaryComp.includes('data-desktop-summary'), 'selector байх ёстой');
  /** ⚠️ `hidden` нь 📱 дээр нуух, `sm:flex` нь ≥640px дээр харуулах ✓ */
  assert.match(desktopSummaryComp, /className="[^"]*\bhidden\b[^"]*\bsm:flex\b[^"]*"/);
});

t('🖥 🗂 АНГИЛАЛ ба 📍 БАЙРШИЛ нь `step`-ЭЭР АЛХАМ АЛХМААР НЭЭГДЭНЭ (🖥 алхамт ✓)', () => {
  assert.ok(desktopSummaryComp.includes('🗂 Ангилал:'), '① 🗂 мөр байх ёстой');
  assert.ok(desktopSummaryComp.includes('data-desktop-summary-location'), '② 📍 мөрийн selector');
  /** ⚠️ 2026-10-05 (2 дахь засвар): 🖥 дээр ч алхамт болсон тул 📍 мөр нь
   *  `step >= 2` үед л гарна (Байршил алхмаас хойш) ✓ */
  assert.ok(desktopSummaryComp.includes('{step >= 2 && ('), '`step >= 2` хаалт байх ёстой ✗');
  assert.ok(desktopSummaryComp.includes('if (step < 1) return null;'),
    '`step < 1` (Ангилал) дээр ОГТ гарахгүй байх ёстой ✗');
  assert.ok(desktopSummaryComp.includes('сонгоогүй</span>'), 'сонголт хоосон үед «сонгоогүй» ✓');
});

t('🖥 Формд `step={step}`-тэй — 🖥 алхамт тул алхам алхмаар нээгдэнэ ✓', () => {
  /** 🆕 2026-10-05 (52): `onEdit` нь 📱 `mobileAnswerEdit` (НЭГ ЭХ СУРВАЛЖ ✓)
   *  ⇒ `/s`-ийн оронд `\s+` — JSX нь олон МӨРТ болсон ч таарна ✓ */
  assert.match(FORM, /<DesktopSummary\s+categoryPath=\{pickedCategoryPath\}\s+locationPath=\{pickedLocationPath\}\s+step=\{step\}\s+onEdit=\{mobileAnswerEdit\}\s*\/>/);
  /** ⚠️ 1-р алхмын блок дотор `DesktopSummary` БАЙХГҮЙ ✓ */
  const step0 = (() => {
    const from = FORM.indexOf('data-step-block="category"');
    assert.ok(from > -1, '1-р алхмын блок олдсонгүй');
    const to = FORM.indexOf('═══ 2-р алхам', from);
    assert.ok(to > from, '2-р алхмын эхлэл олдсонгүй');
    return FORM.slice(from, to);
  })();
  assert.ok(step0.indexOf('<DesktopSummary') === -1, '1-р алхамд DesktopSummary байж болохгүй');
  /** ⚠️ Хүснэгт нь `<form>` дотор байна (товчны `type`-д нөлөөлөхгүй `div`) ✓ */
  assert.ok(FORM.indexOf('<DesktopSummary') > FORM.indexOf('<form onSubmit={handleSubmit}>'), '`<form>` дотор байх ёстой');
});

t('🖥 НЭГ ЭХ СУРВАЛЖ: 📱 `mobileAnswerRows` ба 🖥 `DesktopSummary` ХОЁУЛАА `pickedCategoryPath`/`pickedLocationPath`-ыг л уншина (📱 түлхүүрүүд ХӨНДӨГДӨӨГҮЙ ✓)', () => {
  assert.equal((FORM.match(/const pickedCategoryPath = /g) || []).length, 1, 'pickedCategoryPath ЯГ 1 удаа');
  assert.equal((FORM.match(/const pickedLocationPath = /g) || []).length, 1, 'pickedLocationPath ЯГ 1 удаа');
  /** ① 📱 мөрүүд нь тэдгээрийг л ашиглана (энд дахин бодохгүй ✓) */
  assert.match(FORM, /rows\.push\(\{ key: 'step-category', label: 'Ангилал', value: pickedCategoryPath \}\)/);
  assert.match(FORM, /rows\.push\(\{ key: 'step-location', label: 'Зарын байршил', value: pickedLocationPath \}\)/);
  /** ② 🖥 хүснэгт нь ЯГ ижил утгуудыг prop-оор авна ✓ */
  assert.match(FORM, /<DesktopSummary\s+categoryPath=\{pickedCategoryPath\}\s+locationPath=\{pickedLocationPath\}\s+step=\{step\}\s+onEdit=\{mobileAnswerEdit\}\s*\/>/);
  /** ③ 📱-ийн тусгаарлагчид (` ▸ ` ба ` — `) ХЭВЭЭР ✓
      ⚠️ 2026-10-06: 📍-ийн тусгаарлагч (` — `) нь ЦЭВР модуль руу шилжив
      (`lib/listingLocation.mjs → PATH_SEP`, «Байршил сонгохгүй» чекбокстой
      хамт) — ⚠️ утга нь ХӨНДӨГДӨӨГҮЙ эсэхийг хоёр файлаас шалгана ✓ */
  assert.ok(FORM.includes(".join(' ▸ ')"), 'ангиллын тусгаарлагч хэвээр байх ёстой');
  assert.ok(FORM.includes('locationPathText(form)'), '📍 мөр нь модулиар бичигдэнэ');
  assert.ok(LOC_SRC.includes("const PATH_SEP = ' — '"), '📍-ийн тусгаарлагч хэвээр байх ёстой');
});

t('🖥 Утга нь формойн state-ээс ШУУД — 🆕 `useState` / DB / API БАЙХГҮЙ (хадгалалт нэмэгдээгүй ✓)', () => {
  assert.match(FORM, /const pickedCategoryPath = form\.propertyType/);
  assert.match(FORM, /const pickedLocationPath = locationPathText\(form\)/);
  assert.ok(!FORM.includes('setPickedCategoryPath'), 'setPickedCategoryPath байж болохгүй');
  assert.ok(!FORM.includes('setPickedLocationPath'), 'setPickedLocationPath байж болохгүй');
});

/**
 * 🆕 2026-10-05 — 📍 ХОРОО НЬ БҮХ ХЭСЭГТ ХАРАГДАНА (`simpleForm`-оос ХАМААРАХГҮЙ).
 *
 * 🎯 ХЭРЭГЛЭГЧИЙН ГОМДОЛ: «Барилгын материалын зар оруулхад Улаанбаатарын
 *    дүүргийн хороо оруулах хэсэг гарч ирэхгүй байна» ⇒ ӨМНӨ НЬ ⚡ `simpleForm`
 *    хэсэгт (🧱 construction, 🏭 equipment, ⚽ hobby, 🧺 home, 🛋️ furniture,
 *    🧳 travel, ⚡ electric) хороо нь 4 ГАЗАРТ хасагддаг байв ✗:
 *      ① 🖥 баганын тоо `sm:grid-cols-2` ② 🖥 `<PickerColumn loc-khoroo>` хаалт
 *      ③ 📱 `locScreens` (2 дэлгэц) ④ 📍 «Сонгосон» мөр + `pickedLocationPath`
 *    ⇒ ОДОО БҮГД нь хэсгээс ХАМААРАХГҮЙ: 🖥 3 багана · 📱 3 дэлгэц ✓
 * ⚠️ `simpleForm` нь ЗӨВХӨН ⚙️ attr талбарууд (зөвхөн ✅ «Шинэ/Шинэвтэр/Хуучин»)
 *    ба 🎥 `YouTubeField`-д л үйлчилнэ — тэр нь `scripts/test-filters.mjs`-ийн
 *    `hasSimpleForm` тестүүдээр түгжигдсэн ХЭВЭЭР (туг нь устгагдаагүй ✓)
 */
t('🆕📍 Хороо нь `simpleForm`-оос ХАМААРАХГҮЙ — 🖥 3 багана · 🖥 багана хаалтгүй · 📱 3 дэлгэц · мөр + зам (5 газар)', () => {
  /** ① 🖥 хүснэгт нь ҮРГЭЛЖ 3 багана (хэсгээс хамаарч 2 болдог байсан ✗) */
  assert.match(FORM, /sm:grid sm:grid-cols-3/, '🖥 3 багана биш ✗');
  assert.ok(!FORM.includes("simpleForm ? 'sm:grid-cols-2'"), '🖥 баганын тоо хэсгээс хамаарч байна ✗');
  /** ② 🖥 хорооны багана (`PickerColumn`) хаалтгүй render болно */
  const colAt = FORM.indexOf('pickRole="loc-khoroo"');
  assert.ok(colAt > -1, '`loc-khoroo` багана олдсонгүй ✗');
  assert.ok(!FORM.slice(Math.max(0, colAt - 260), colAt).includes('!simpleForm'),
    '🖥 хорооны багана `{!simpleForm && (…)}` хаалттай хэвээр ✗');
  /** ③ 📱 `locScreens` — 3 дэлгэц (city · district · khoroo) ба `simpleForm` 0 */
  const locFrom = FORM.indexOf('const locScreens = [');
  const locTo = FORM.indexOf('const mobileLocScreen =');
  assert.ok(locFrom > -1 && locTo > locFrom, '`locScreens` блок олдсонгүй ✗');
  const locBlock = FORM.slice(locFrom, locTo);
  assert.equal((locBlock.match(/key: 'city'|key: 'district'|key: 'khoroo'/g) || []).length, 3,
    '📱 байршлын дэлгэц 3 биш ✗');
  assert.ok(!locBlock.includes('simpleForm'), '📱 `locScreens` дотор `simpleForm` үлдсэн ✗');
  assert.ok(!locBlock.includes('locScreens.push('), '📱 хорооны дэлгэц нөхцөлтэй нэмэгдэж байна ✗');
  /** ④ 📍 «Сонгосон» мөр дэх хороо хаалтгүй */
  assert.ok(!FORM.includes('!simpleForm && form.khoroo'), '📍 «Сонгосон» мөрөнд хаалт үлдсэн ✗');
  assert.match(FORM, /\{form\.khoroo \? <> › <b className="text-gray-900">\{form\.khoroo\}<\/b><\/> : null\}/);
});

/**
 * 🆕 2026-10-05 (52) — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «зар оруулахад … бусад мэдээлэл
 *    оруулах хэсэг гарч байгаа хуудсан дээрээс дээрх 2-оо засах боломжтой байх
 *    товч тус тусд нь» ⇒ 🖥 `DesktopSummary`-ийн мөр БҮРД ✏️ «Засах» товч:
 *    🗂 Ангилал → 1-р алхам (`gotoStep(0)`) · 📍 Зарын байршил →
 *    2-р алхам (`gotoStep(1)`)
 */
t('🆕🖥 ✏️ ЗАСАХ товч: 🗂 Ангилал ба 📍 Байршил мөр ТУС БҮРД тусдаа товч (товч тус тусд нь ✓)', () => {
  /** ⚠️ Товч нь ЗӨВХӨН `[data-desktop-summary]` дотор — CDP-ийн стабил
   *  selector + мөр бүрийн түлхүүр (`category` / `location`) ✓ */
  assert.ok(desktopSummaryComp.includes('data-desktop-summary-edit={key}'),
    'товчны стабил selector (`data-desktop-summary-edit={key}`) дутуу ✗');
  assert.ok(desktopSummaryComp.includes("editBtn('category', 'Ангиллыг')"),
    '① 🗂 Ангиллын «Засах» товч дутуу ✗');
  assert.ok(desktopSummaryComp.includes("editBtn('location', 'Байршлыг')"),
    '② 📍 Байршлын «Засах» товч дутуу ✗');
  /** ⚠️ Мөр тус бүрд ТУСДАА товч — НЭГ товч хоёуланг нь засдаг БОЛОХГҮЙ
   *  ⚠️ Тодорхойлолт нь `const editBtn = (` (тиймээс `editBtn(`-д ОРОХГҮЙ) ⇒
   *  `editBtn(` нь ЯГ 2 ДУУДАЛТ (② dropdown биш, 2 мөр ✓) */
  assert.ok(desktopSummaryComp.includes('const editBtn = (key, label) => ('),
    '`editBtn` тодорхойлолт дутуу ✗');
  assert.equal((desktopSummaryComp.match(/editBtn\(/g) || []).length, 2,
    '`editBtn(` = 2 дуудалт (мөр тус бүрд ТУСДАА товч ✓)');
  assert.ok(desktopSummaryComp.includes('✏️ Засах'), 'товчны бичиг «✏️ Засах» ✓');
});

t('🆕🖥 ✏️ товч нь `type="button"` — `<form onSubmit>` ДОТОР `submit` болж кетэхгүй ✓', () => {
  /** ⚠️ ЯАГААД ЧУХАЛ ВЭ: хүснэгт нь `<form onSubmit={handleSubmit}>` дотор байдаг
   *  тул `type` БИЧИХГҮЙ `<button>` нь default `submit` болж, ✏️ дарах НЬ
   *  формыг ШУУД илгээнэ ✗ (зарыг дутуу байхад нийтлэх гэж оролдоно) */
  const btn = desktopSummaryComp.slice(desktopSummaryComp.indexOf('<button'));
  assert.ok(btn.includes('type="button"'), '`type="button"` дутуу ✗ — submit болно');
  assert.ok(!btn.includes('type="submit"'), '`type="submit"` байж болохгүй ✗');
  /** ℹ️ Хүснэгт өөрөө `div` тул форм дотор байх нь асуудалгүй ✓ (шалгасан дээр ✓) */
  assert.ok(FORM.indexOf('<DesktopSummary') > FORM.indexOf('<form onSubmit={handleSubmit}>'));
});

t('🆕 НЭГ ЭХ СУРВАЛЖ: 🖥 ✏️ товч ба 📱 `MobileAnswers` ХОЁУЛАА `mobileAnswerEdit`-ыг дуудна (давхардсан логик 0 ✓)', () => {
  /** ① 🖥 хүснэгт нь handler-ыг prop-оор авна ✓ */
  assert.match(FORM, /onEdit=\{mobileAnswerEdit\}/);
  /** ② товч нь 📱-ийн ТУЛХҮҮРҮҮДИЙГ л бүрдүүлнэ (`step-category` / `step-location`) */
  assert.match(desktopSummaryComp,
    /onEdit && onEdit\(key === 'category' \? 'step-category' : 'step-location'\)/);
  /** ③ handler нь ЯГ 1 удаа тодорхойлогдоно (🖥-д зориулж ДАХИН бичихгүй ✓) */
  assert.equal((FORM.match(/const mobileAnswerEdit = /g) || []).length, 1,
    '`mobileAnswerEdit` ЯГ 1 удаа байх ёстой ✗');
  /** ④ маршрут нь хэвээр: 1-р алхам (Ангилал) ба 2-р алхам (Байршил) ✓ */
  assert.match(FORM, /if \(key === 'step-category'\) \{ gotoStep\(0\); return; \}/);
  assert.match(FORM, /if \(key === 'step-location'\) \{ gotoStep\(1\); return; \}/);
  /** ⑤ 📱 `MobileAnswers` нь ХӨНДӨГДӨӨГҮЙ (мөн `mobileAnswerEdit`-ыг дуудна ✓) */
  assert.match(FORM, /<MobileAnswers rows=\{mobileAnswerRows\} onEdit=\{mobileAnswerEdit\} \/>/);
});



// ────────────────────────────────────────────────────────────
// ④″ 🆕 2026-10-05 (53) — 📱 ОН · НИЙТ ДАВХАР · ДАВХАР: ГАРААС БИЧИЛТ
// ────────────────────────────────────────────────────────────
console.log('\n── ④″ 📱 гар утаснаас гараар бичих (он · нийт давхар · давхар) ──');

t('📱 `buildYear` · `totalFloors` · `floor` дэлгэцэд `pick: true` БАЙХГҮЙ (гараас бичилт ⇒ доод «Алгасах / Үргэлжлүүлэх» товч гарна ✓)', () => {
  ['buildYear', 'totalFloors', 'floor'].forEach((k) => {
    const line = screensBody.match(new RegExp(`key: '${k}'[^\\n]*`));
    assert.ok(line, `«${k}» дэлгэц олдсонгүй ✗`);
    assert.ok(!line[0].includes('pick: true'), `«${k}» дээр pick: true байж болохгүй ✗`);
  });
  /** ⚠️ Бусад сонголттой талбарт `pick: true` ХЭВЭЭР (дармагц дараагийн асуулт ✓) */
  ['bathrooms', 'balconies', 'garage'].forEach((k) => {
    assert.match(screensBody, new RegExp(`key: '${k}'[^\\n]*pick: true`), `«${k}» pick: true хэвээр`);
  });
});

t('📱 3 талбарт `mobileInput` дамжуулна — 📱 <640px дээр 2 баганат жагсаалтын оронд ГАР БИЧИЛТ ✓', () => {
  assert.equal((step3.match(/^\s+mobileInput$/gm) || []).length, 3, 'ЯГ 3 талбарт ✓');
  ['buildYear', 'totalFloors', 'floor'].forEach((k) => {
    const at = step3.indexOf(`testId="${k}"`);
    assert.ok(at > -1, `«${k}» талбар олдсонгүй ✗`);
    const block = step3.slice(at, step3.indexOf('/>', at));
    assert.ok(block.includes('mobileInput'), `«${k}» дээр mobileInput байх ёстой ✗`);
    /** ⚠️ «дармагц дараагийн асуулт» (`pickDetail`) ба жагсаалтын «Алгасах»
     *  (`skipDetail`) нь `MobileOptions`-той хамт БАЙХГҮЙ — товч нь доод мөрөнд ✓ */
    assert.ok(!block.includes('pickDetail('), `«${k}» дээр pickDetail байж болохгүй ✗`);
    assert.ok(!block.includes('skipDetail('), `«${k}» дээр skipDetail байж болохгүй ✗`);
    /** ⚠️ 🎡 дугуйн холбоос ХЭВЭЭР — урт жагсаалтын НЭМЭЛТ боломж (устгаагүй ✓) */
    assert.ok(block.includes('openWheel={setWheel}'), `«${k}» дугуйн холбоос хэвээр ✓`);
  });
});

t('📱 `ChoiceField` — `mobileInput` үед `.hide-below-sm` ХАСАГДАЖ, `MobileOptions` РЕНДЭРЛЭГДЭХГҮЙ ✓', () => {
  const cf = fnBody(FORM, 'function ChoiceField(');
  /** ⚠️ `mobileInput = false` нь ПАРАМЕТРИЙН блокт (destructuring default) ✓ */
  assert.ok(FORM.includes('mobileInput = false,'), 'пропын default ✓');
  assert.ok(cf.includes("? 'min-w-0 flex-1' : 'hide-below-sm min-w-0 flex-1'"),
    '📱 дээр `.hide-below-sm` ХАСАГДАНА (гараас бичилт харагдана ✓)');
  assert.ok(cf.includes('data-mobile-input={mobileInput ?'), 'CDP-ийн тогтвортой selector ✓');
  assert.match(cf, /\{mobileInput \? null : \(\s*<MobileOptions/, '2 баганат жагсаалт рендэрлэгдэхгүй ✓');
  /** ⚠️ 🎡 дугуй нь `WHEEL_LINK_MIN`-ээс урт жагсаалтад ХАМААРАЛГҮЙ гарна ✓ */
  assert.match(cf, /items\.length > WHEEL_LINK_MIN \? \(/);
});

// ────────────────────────────────────────────────────────────
// ⑤ CSS — дүрэм нь ЗӨВХӨН `<640px` (🖥 дээр бүх талбар ХЭВЭЭР)
// ────────────────────────────────────────────────────────────
console.log('\n── ⑤ CSS (`app/globals.css`) ──');

const mobileCss = mediaBlocks(CSS, 'max-width: 639.98px');
const desktopCss = mediaBlocks(CSS, 'min-width: 640px');

t('🎨 `<640px` дээр `[data-form-row="details"][data-mobile-active="false"]` НУУГДАНА ✓', () => {
  const hit = mobileCss.filter((b) => b.includes('[data-form-row="details"][data-mobile-active="false"]'));
  assert.equal(hit.length, 1, 'мобайл дүрэм ЯГ 1 байх ёстой');
  assert.ok(hit[0].includes('.form-group[data-mobile-active="false"]'), 'ChoiceField-ийн .form-group');
  assert.ok(hit[0].includes('display: none !important'), '!important (grid-ийг дарах)');
});

t('🎨 `!important` нь ЗААВАЛ — `[data-form-row="details"] > .form-group` (grid) дарах ёстой ✓', () => {
  /** ⚠️ `.form-group`-ийг дээрх CSS нь `display: grid` болгодог (0,2,0) тул
   *  энгийн `display: none` (0,1,0) ХҮРЭЛЦЭХГҮЙ ✗ ⇒ `!important` ✓ */
  assert.ok(CSS.includes('[data-form-row="details"] > .form-group'), 'хэвтээ/мобайл grid дүрэм байх ёстой');
  const hit = mobileCss.find((b) => b.includes('data-mobile-active="false"'));
  assert.ok(hit && /display:\s*none\s*!important/.test(hit));
});

t('🖥 ≥640px дээр `data-mobile-active` дүрэм БАЙХГҮЙ (бүх талбар хэвээр — regression үгүй ✓)', () => {
  desktopCss.forEach((b) => {
    assert.ok(!b.includes('data-mobile-active'), 'desktop дүрэмд data-mobile-active байж болохгүй');
  });
});

t('📱 `.hide-below-sm` (хуучин механизм) ХЭВЭЭР — `<640px` дотор `display:none !important` ✓', () => {
  const hit = mobileCss.filter((b) => b.includes('.hide-below-sm'));
  assert.equal(hit.length, 1);
  assert.ok(hit[0].includes('display: none !important'));
});

t('📱 Мобайлд нэр нь оролтын ДЭЭР (1 баганат) — 2 баганат дүрэм ЗӨВХӨН `≥640px` ✓', () => {
  assert.ok(desktopCss.some((b) => b.includes('[data-form-row="details"]')), 'хэвтээ дүрэм desktop-д');
  mobileCss.forEach((b) => {
    assert.ok(!b.includes('[data-form-row="details"] > .form-group') || b.includes('data-mobile-active'),
      'мобайлд хэвтээ дүрэм байж болохгүй');
  });
});

// ────────────────────────────────────────────────────────────
// ⑦ 🖥 БА 📱 — АЛХАМТ ФОРМ (зөвхөн ОДООГИЙН алхам харагдана)
// ────────────────────────────────────────────────────────────
console.log('\n── ⑦ 🖥 ба 📱 — алхамт форм ──');

/**
 * 🧩 7 БЛОК = 5 алхам (2026-10-05).
 * ⚠️ Дараалал нь ХАРАГДАХ дараалал ЯГ ИЖИЛ байх ёстой —
 *    `price` ба `desc` нь өмнө НЭГ `step === 3` блок байсныг ХОЁР болгож
 *    салгасан (тайлбар нь үнийн ДАРАА гарна ✓)
 * ⚠️ 2026-10-05 (2 дахь засвар): «🖥 нэг урт хуудас» ХҮЧИНГҮЙ — идэвхтэй бус
 *    блок бүр `hidden`-ээр нуугдаж, 🖥 БА 📱 ХОЁУЛАНД зөвхөн ОДООГИЙН
 *    `step`-ийн блок харагдана ✓ (⏳ өмнө `hide-below-sm` байв — тэр нь
 *    ЗӨВХӨН <640px-д нуудаг тул 🖥 дээр бүгд харагддаг байлаа ✗)
 */
const STEP_BLOCKS = ['category', 'location', 'details', 'price', 'desc', 'media', 'media-images'];

t('🖥 Бүх блок DOM-д БАЙНГА (`data-step-block="…"`) — дараалал нь харагдах дараалал ИЖИЛ ✓', () => {
  const found = [...FORM.matchAll(/data-step-block="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(found, STEP_BLOCKS, 'блокийн тоо/дараалал зөрүүтэй');
});

t('🧹 Хуучин `{step === N && (…)}` хаалтууд БҮРЭН арилсан (нэг хуудас ✓)', () => {
  for (let i = 0; i <= 4; i++) {
    assert.ok(!FORM.includes(`{step === ${i} && (`), `${i}-р алхмын хуучин нөхцөлт хаалт үлдсэн ✗`);
  }
});

/**
 * 🧩 (57) Блокийн хаалт — 🖥 дээр 3, 4, 5-р алхам НЭГ хуудас болсон тул
 *    `hidden sm:block` хэрэглэнэ: 📱 <640px дээр нуугдана, 🖥 ≥640px дээр
 *    харагдана ✓ (⚠️ CSS дэг журам: Tailwind нь `sm:*`-ийг `hidden`-ийн
 *    ДАРАА бичдэг тул ижил specificity дээр `sm:block` ялна ✓)
 * ⚠️ ① ② блок (`category` · `location`) ХӨНДӨГДӨӨГҮЙ — тэдгээр нь 🖥/📱
 *    ХОЁУЛАНД ижил (нэг л алхамд) ✓; ③④⑤ (`details` · `price` · `desc` ·
 *    `media` · `media-images`) нь 🖥 дээр ХАМТ харагдана ✓
 */
const BLOCK_GATE = {
  category: "className={step === 0 ? '' : 'hidden'}",
  location: "className={step === 1 ? '' : 'hidden'}",
  details: "className={step === 2 ? '' : step === 3 || step === 4 ? 'hidden sm:block' : 'hidden'}",
  price: "className={step === 3 ? '' : step === 2 || step === 4 ? 'hidden sm:block' : 'hidden'}",
  desc: "className={step === 3 ? '' : step === 2 || step === 4 ? 'hidden sm:block' : 'hidden'}",
  media: "className={step === 4 ? '' : step === 2 || step === 3 ? 'hidden sm:block' : 'hidden'}",
  'media-images': "className={step === 4 ? '' : step === 2 || step === 3 ? 'hidden sm:block' : 'hidden'}",
};

t('🖥 БА 📱 — идэвхтэй БУС блок бүр `hidden`-ээр НУУГДАНА (алхамт форм ✓)', () => {
  for (const name of STEP_BLOCKS) {
    const at = FORM.indexOf(`data-step-block="${name}"`);
    assert.ok(at > -1, `${name} блок олдсонгүй`);
    const tag = FORM.slice(at, FORM.indexOf('>', at));
    assert.ok(tag.includes(BLOCK_GATE[name]),
      `${name}: хаалт нь хүлээгдсэнээс зөрүүтэй ✗ —\n      хүлээсэн: ${BLOCK_GATE[name]}\n      олдсон:  ${tag}`);
    assert.match(tag, /'hidden'/, `${name}: \`hidden\` хаалт байхгүй ✗`);
  }
});

t('🧩 (57) `sm:block` нь ЗӨВХӨН 3, 4, 5-Р АЛХАМЫН блокт (details · price · desc · media · media-images ✓)', () => {
  /** ⚠️ Эдгээр 5 блок л 📱/🖥 ялгаатай (🖥 = нэгтгэсэн 3 дахь хуудас ✓) —
   *  ① ② (`category` · `location`) нь 🖥/📱 ХОЁУЛАНД ижил (нэг алхам) ✓ */
  const MERGED = ['details', 'price', 'desc', 'media', 'media-images'];
  for (const name of STEP_BLOCKS) {
    const at = FORM.indexOf(`data-step-block="${name}"`);
    const tag = FORM.slice(at, FORM.indexOf('>', at));
    assert.equal(tag.includes('sm:block'), MERGED.includes(name),
      `${name}: \`sm:block\` ${MERGED.includes(name) ? 'дутуу' : 'байх ёсгүй'} ✗`);
  }
});

t('🖥 Алхмын навигаци («← Буцах» / «Үргэлжлүүлэх») 🖥 дээр Ч харагдана (`sm:hidden` ХАСАГДАВ ✓)', () => {
  /** ⚠️ 2 дахь засвар: 🖥 дээр ч алхамт болсон тул навигацийн мөр нь 📱-д
   *  ТОГТСОНГҮЙ — БҮХ дэлгэцэд харагдана ✓ (товчнууд нь `data-step-*`
   *  стабил селектортой хэвээр — CDP тестүүд дээр тулгуурлана ✓) */
  assert.match(FORM, /className="mt-6 flex items-center justify-between gap-3 border-t border-gray-200 pt-4"/);
  assert.ok(!FORM.includes('border-gray-100 pt-4 sm:hidden'), 'навигаци 🖥 дээр нуугдах ёсгүй ✗');
});

t('🧹 🖥-ийн ТУСДАА доод блок (ЦУЦЛАХ + НИЙТЛЭХ) ХАСАГДАВ — навигаци түүнийг орлов ✓', () => {
  /** ⚠️ 2 дахь засвар: 🖥 дээр ч алхамт болсон тул зөвхөн НЭГ доод товчны
   *  мөр байна (📱/🖥 ижил) — ХОЁР дахь submit товч гарахгүй ✓ */
  assert.ok(!FORM.includes('pt-4 sm:flex"'), '🖥-ийн тусдаа доод блок үлдсэн ✗');
  assert.ok(!FORM.includes('data-desktop-cancel'), '`[data-desktop-cancel]` үлдсэн ✗');
  assert.ok(!FORM.includes('data-desktop-submit'), '`[data-desktop-submit]` үлдсэн ✗');
});

t('🏷️ `submitLabel` нь НЭГ ЭХ СУРВАЛЖ (нэг л доод товч — ЯГ 1 хэрэглээ ✓)', () => {
  assert.equal((FORM.match(/const submitLabel = /g) || []).length, 1, 'тодорхойлолт ЯГ 1 байх ёстой');
  assert.equal((FORM.match(/\{submitLabel\}/g) || []).length, 1, 'хэрэглээ ЯГ 1 (нэг доод товч) байх ёстой');
  assert.match(FORM, /isEdit \? 'Хадгалж байна\.\.\.' : 'Нийтэлж байна\.\.\.'/);
  assert.match(FORM, /isEdit \? '💾 Өөрчлөлтийг хадгалах' : '✅ Зар нийтлэх'/);
  assert.match(FORM, /'🗜 Зургуудыг шахаж байна\.\.\.'/);
});

t('🪜 Алхмын навиг: СТАБИЛ селекторууд (`data-step-back` · `data-step-next` · `data-step-submit` ✓)', () => {
  /** ⚠️ 2026-10-05 (🖥 НЭГ УРТ ХУУДАС): 📱 `[data-mobile-detail-next]` нь
   *  ≥640px дээр `sm:hidden` ч DOM-д БАЙНГА болсон ⇒ CDP тест «Үргэлжлүүлэх»-ийг
   *  ТЕКСТЭЭР хайвал ХАМГИЙН ЭХНИЙ таарц болох МОБАЙЛЫН товчийг дарж, алхам
   *  ХӨДЛӨХГҮЙ байв ✗ ⇒ wizard-ийн товчнууд стабил `data-*`-тай болов ✓ */
  assert.match(FORM, /data-step-back\s+onClick=\{goBack\}/, '`[data-step-back]` дутуу');
  assert.match(FORM, /data-step-next\s+onClick=\{goNext\}/, '`[data-step-next]` дутуу');
  assert.match(FORM, /data-step-submit\s+className/, '`[data-step-submit]` дутуу');
});

t('🖥 Доод товчны селекторууд (`data-desktop-cancel` · `data-desktop-submit`) — 2 ДАХЬ ЗАСВАРААР ХАСАГДАВ (эдгээр селектор DOM-д БАЙХГҮЙ) ✓', () => {
  /** ⚠️ `[data-step-next]` нь 📱 wizard-ийнх ТУЛ 🖥 доод блокт БАЙХ ЁСГҮЙ —
   *  эс бөгөөс CDP-ийн `form [data-step-next]` нь 🖥 дээр ХОЁР товч олж,
   *  `querySelector` нь 📱-ийг (эхнийх) сонгоно ✗ */
  assert.ok(!FORM.includes('data-desktop-cancel'), '`[data-desktop-cancel]` үлдсэн ✗');
  assert.ok(!FORM.includes('data-desktop-submit'), '`[data-desktop-submit]` үлдсэн ✗');
  assert.ok(!FORM.includes('pt-4 sm:flex"'), '🖥-ийн тусдаа доод блок үлдсэн ✗');
});

t('🧭 Breadcrumb: `[data-step-current]` DOM-д ХЭВЭЭР (CDP-ийн selector ✓) — 🖥 дээр НЭГДСЭН гарчиг ✓', () => {
  assert.match(FORM, /data-step-current className="font-semibold text-gray-800"/);
  assert.ok(!FORM.includes('sm:inline">Зар нийтлэх'), '🖥-ийн тогтмол гарчиг үлдсэн ✗');
});

// ────────────────────────────────────────────────────────────
// ⑦′ 🖥 3 ХУУДАС — 3, 4 БА 5-Р АЛХАМ НЭГ БОЛОВ (2026-10-05, 57)
// ────────────────────────────────────────────────────────────
console.log('\n── ⑦′ 🖥 3 хуудас — 3, 4 ба 5-р алхам нэг болов ──');

/**
 * 🧹 СЭТГЭГДЭЛГҮЙ код — тооллын тестүүдэд (⚠️ эх файлын `🔍 Хайх үг` мөрүүд
 *    нь `data-step-next` гэх мэт нэрсийг агуулдаг тул `FORM`-оор тоолбол
 *    буруу гарна ✗) ⇒ эх файлын СЭТГЭГДЛИЙГ хасна (тоололд саад болохгүй ✓)
 */
const CODE = FORM.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

t('🖥 `useIsDesktop()` hook — `matchMedia(\'(min-width: 640px)\')` ба SSR-д `false` (hydration зөрөхгүй ✓)', () => {
  /** ⚠️ SSR ба эхний client render ХОЁУЛАА 📱 хувилбар ⇒ hydration mismatch 0 ✓ */
  assert.match(FORM, /function useIsDesktop\(\) \{/);
  assert.match(FORM, /window\.matchMedia\('\(min-width: 640px\)'\)/);
  assert.match(FORM, /const \[isDesktop, setIsDesktop\] = useState\(false\)/);
  assert.match(FORM, /mq\.addEventListener\('change', sync\)/);
  assert.match(FORM, /return \(\) => mq\.removeEventListener\('change', sync\)/);
});

t('🪜 `lastStepIndex` = НЭГ ЭХ СУРВАЛЖ (🖥 `STEPS.length - 3` = 2 · 📱 `STEPS.length - 1` = 4 ✓)', () => {
  assert.match(FORM, /const lastStepIndex = isDesktop \? STEPS\.length - 3 : STEPS\.length - 1/);
  assert.equal((CODE.match(/lastStepIndex/g) || []).length, 3,
    '`lastStepIndex` = тодорхойлолт + `goNext` + навигаци = ЯГ 3 байх ёстой ✗');
});

t('🪜 `goNext` нь `lastStepIndex` хүртэл (🖥 дээр ХООСОН 5 дахь хуудас руу ОРОХГҮЙ ✓)', () => {
  assert.ok(CODE.includes('gotoStep(Math.min(step + 1, lastStepIndex))'), '`goNext`-ийн clamp дутуу ✗');
  assert.ok(!CODE.includes('Math.min(step + 1, STEPS.length - 1)'), 'хуучин clamp үлдсэн ✗');
});

t('🪜 Доод товчны нөхцөл `step < lastStepIndex` (⏳ `step < STEPS.length - 1` БАЙХГҮЙ ✓)', () => {
  assert.ok(CODE.includes('{step < lastStepIndex ? ('), '`step < lastStepIndex` дутуу ✗');
  assert.ok(!CODE.includes('{step < STEPS.length - 1 ? ('), 'хуучин нөхцөл үлдсэн ✗');
});

t('🧭 `stepLabel` — 🖥 3 дахь хуудсанд «Дэлгэрэнгүй ба үнэ, зураг», 📱 дээр «Дэлгэрэнгүй» ✓', () => {
  /** ⚠️ `===` биш `>=` — 🖥 дээр `?step=4`/`?step=5` хаягаар нээгдсэн ч
   *  нэг л нэр гарна (нэг хуудас = нэг нэр ✓); 📱 дээр `isDesktop` false ⇒ хэвээр ✓ */
  assert.match(FORM,
    /const stepLabel = isDesktop && step >= STEPS\.length - 3\n\s+\? 'Дэлгэрэнгүй ба үнэ, зураг'\n\s+: currentStep\.label;/);
  assert.ok(CODE.includes('{stepLabel}'), 'breadcrumb нь `{stepLabel}` БИШ ✗');
  assert.ok(!CODE.includes('{currentStep.label}'), '`{currentStep.label}` үлдсэн ✗ (🖥 дээр «Дэлгэрэнгүй» гэнэ)');
});

t('🚫 Товч бүр DOM-д ЯГ 1 (`[data-step-next]` · `[data-step-submit]` · `[data-step-back]`) — давхар selector 0 ✓', () => {
  /** ⚠️ Давхар товч гарвал CDP-ийн `querySelector` нь НУУГДСАН товчийг
   *  сонгож, алхам ХӨДЛӨХГҮЙ болно ✗ (2026-10-05-ны алдаа) */
  assert.equal((CODE.match(/data-step-next/g) || []).length, 1, '`[data-step-next]` олон ✗');
  assert.equal((CODE.match(/data-step-submit/g) || []).length, 1, '`[data-step-submit]` олон ✗');
  assert.equal((CODE.match(/data-step-back/g) || []).length, 1, '`[data-step-back]` олон ✗');
});

t('🏷️ (105) АВТО-ГАРЧИГ: 🚗 Машин / 💻 Notebook дээр гарчгийн талбар · дэлгэц · ЗААВАЛ шалгалт БАЙХГҮЙ (`hasAutoTitle`) ✓', () => {
  /** 🎯 Хэрэглэгчийн хүсэлт: «remove the … title input field for Car and Notebook
   *  categories» + «instead generate the title from the details» ⇒ дүрэм нь
   *  `lib/locationData.js → hasAutoTitle` — форм ГУРВУУЛАА түүнээс удирдана ✓ */
  // ① Импорт + туг (нэг эх сурвалж)
  assert.match(CODE, /hasAutoTitle\b[^}]*\} from '\.\.\/lib\/locationData'/,
    '`hasAutoTitle` импортлогдоогүй ✗');
  assert.ok(CODE.includes('const autoTitleOn = hasAutoTitle(form.section || \'real-estate\', form.propertyType);'),
    '`autoTitleOn` туг алга ✗');
  // ② 📱 wizard: «Зарын гарчиг» дэлгэц нь autoTitleOn үед НЭМЭГДЭХГҮЙ
  assert.ok(screensBody.includes('if (!autoTitleOn) out.push({ key: \'title\', title: \'Зарын гарчиг\', group: \'title\', required: !isEdit });'),
    '📱 «Зарын гарчиг» дэлгэц нь НӨХЦӨЛГҮЙ нэмэгдсэн хэвээр ✗ (мобайлд блоклоно)');
  // ③ 🛡️ ЗААВАЛ шалгалт: autoTitleOn үед алгасна
  assert.ok(CODE.includes("if (key === 'title' && autoTitleOn) return '';"),
    '🛡️ `requiredDetailMsg` дээр авто-гарчгийн алгасалт алга ✗ (шинэ зар блоклогдоно)');
  // ④ 🖥 Гарчгийн талбар DOM-д байгаа ч `autoTitleOn` үед НУУГДАНА
  assert.ok(CODE.includes('{!autoTitleOn && ('), '🖥 гарчгийн мөрийг нуух нөхцөл алга ✗');
  assert.ok(step3.includes('data-detail-field="title"'),
    '🖥 гарчгийн талбар DOM-оос БҮРЭН ХАСАГДСАН ✗ (бусад хэсэгт хэрэгтэй)');
  // ⑤ ⚠️ `form.title`/payload ХӨНДӨӨГДӨӨГҮЙ (зөвхөн НУУХ — хуучин гарчиг алдагдахгүй)
  assert.ok(CODE.includes("onChange={(e) => set('title', e.target.value)}"),
    '`form.title` холбоос ХӨНДӨӨГДСӨН ✗');
});

console.log(`\n✅ Нийт ${passed} шалгалт амжилттай — 📱 «асуулт бүр нэг дэлгэц» + 🖥 3 хуудас (3, 4 ба 5-р алхам нэг болов) гэрээ түгжигдэв\n`);
