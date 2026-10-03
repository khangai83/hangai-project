// ============================================================
// test-detail-wizard.mjs — 📱 3-Р АЛХМЫН «АСУУЛТ БҮР НЭГ ДЭЛГЭЦ» ГЭРЭЭ
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-02): «зарын гарчиг, талбай, угаалгын өрөө,
//    ашиглалтанд орсон он … бүгдийг нь нэг нэгээр нь харуул» — өмнө нь 📱
//    390px дээр 3-р алхам (📋 Дэлгэрэнгүй) нь БҮХ талбараа цувж харуулдаг
//    байв ✗ ⇒ одоо дэлгэц бүрд НЭГ талбар (`unegui.mn/post_ad/`-ийн зан).
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
//
// АЖИЛЛУУЛАХ:  npm run test:wizard
//    📱 CDP-ээр жинхэнэ дэлгэцүүдийг шалгах: `npm run cdp:picker`
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

console.log('\n📱 3-р алхам (📋 Дэлгэрэнгүй): «асуулт бүр нэг дэлгэц» (мобайл)\n');

const FORM = readSrc('components/AddListingClient.jsx');
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

t('📱 `detailScreens` нь ЗӨВ дараалалтай (гарчиг → аттр* → 💳 төлбөр → талбай → он → нийт давхар → давхар → угаалгын өрөөний тоо → тагт → гараж ✓)', () => {
  const order = [...screensBody.matchAll(/key:\s*'([^']+)'|key:\s*`attr-\$\{f\.key\}`/g)]
    .map((m) => m[1] || 'attr-<key>');
  assert.deepEqual(order, [
    'title', 'attr-<key>', 'payments', 'area',
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
  const from = FORM.indexOf('{step === 2 && (');
  assert.ok(from > -1, '3-р алхмын блок олдсонгүй');
  const to = FORM.indexOf('═══ 4-р алхам', from);
  assert.ok(to > from, '4-р алхмын эхлэл олдсонгүй');
  return FORM.slice(from, to);
})();

t('📱 7 МӨР (title · attrs · 💳 payments · area · floors-1 · floors-2 [давхар+угаалгын өрөөний тоо+тагт] · garage) бүгд `data-detail-row` + `data-mobile-active`-тай (CSS-ийн НЭГ эх сурвалж ✓)', () => {
  const rows = ['title', 'attrs', 'payments', 'area', 'floors-1', 'floors-2', 'garage'];
  rows.forEach((name) => {
    const re = new RegExp('data-detail-row="' + name + '"[\\s\\S]{0,200}?'
      + "data-mobile-active=\\{detailRowActive\\('" + name + "'\\)\\}");
    assert.match(step3, re, `мөр «${name}»`);
  });
  assert.equal((step3.match(/data-detail-row="/g) || []).length, rows.length);
});

t('📱 Гарчиг / Талбай / Гараж / 💳 төлбөр — `.form-group` дээр `data-detail-field` + `detailFieldActive` ✓', () => {
  ['title', 'area', 'garage'].forEach((k) => {
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
  /** ⚠️ 3-р алхамд БОДИТ `data-detail-field=` марк ЗӨВХӨН 6 газар (title · attrs ·
   *  💳 payments · rooms · area · garage); `ChoiceField`-ийн 5 талбар нь ПРОПСООР авна
   *  (DOM ХОЁР ДАХИН рендэрлэхгүй — `form`/DB/`validateStep` хөндөгдөхгүй ✓)
   *  ⚠️ `=`-тэй тоолно: 💳 блокийн JSX коммент дотор ч `data-detail-field` гэсэн
   *     ҮГ бий (дэгээг тайлбарласан) — тэр нь марк БИШ ✓ */
  assert.equal((step3.match(/data-detail-field=/g) || []).length, 6);
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
   *  unegui.mn-ийн толгой шиг «Зар нийтлэх» л байна; асуултын нэр доор,
   *  өөрийн талбарын толгойн мөрөнд (`label`) харагдана ✓ */
  assert.ok(step3.includes('Зар нийтлэх</h2>'), 'толгойд «Зар нийтлэх» байх ёстой');
  assert.ok(!step3.includes('{activeDetail.title}'), 'асуултын нэр толгойд ДАВХАРДАХГҮЙ ✓');
  assert.ok(step3.includes('{detailIdx + 1}/{detailScreens.length}'));
});

t('📱 «ӨМНӨХ ХАРИУЛТУУД» — ✏️-тэй мөрүүд (`MobileAnswers`, unegui.mn-ийн хэв) ✓', () => {
  assert.ok(step3.includes('<MobileAnswers rows={mobileAnswerRows} onEdit={mobileAnswerEdit} />'));
  assert.match(FORM, /function MobileAnswers\(\{ rows = \[\], onEdit \}\)/);
  assert.match(FORM, /data-mobile-answers className="sm:hidden"/);
  assert.match(FORM, /data-mobile-answer-edit=\{r\.key\}/);
  assert.match(FORM, /onClick=\{\(\) => onEdit\(r\.key\)\}/);
  // ⚠️ Утга нь формойн state-ээс ШУУД — шинэ DB багана/хадгалалт БАЙХГҮЙ ✓
  assert.match(FORM, /const detailAnswerText = \(key\) => \{/);
  assert.match(FORM, /const mobileAnswerRows = \(\(\) => \{/);
  // ✏️ нь 1/2-Р АЛХАМ руу ч буцаана (🗂 Ангилал / 📍 Зарын дэд байршил) ✓
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

t('📱 Wizard нь ЗӨВХӨН 3-р алхамд (`step === 2`) — бусад алхамд DOM-д БАЙХГҮЙ ✓', () => {
  /** ⚠️ «data-mobile-detail-head» гэсэн үг сэтгэгдэл (🔍 хайх үг) дотор ч
   *  байдаг тул ЗӨВХӨН бодит JSX маркийг тоолно ✓ */
  const MARK = 'data-mobile-detail-head data-mobile-detail-key={activeDetail.key}';
  assert.equal(FORM.split(MARK).length - 1, 1, 'JSX марк ЯГ 1 байх ёстой');
  /** ⚠️ Толгой нь 3-р алхмын бүсэд (`step3` = `{step === 2 && (` … 4-р алхам)
   *  байх ба түүний хамгийн ойрын `{step ===` нөхцөл нь 3-р алхам БАЙХ ЁСТОЙ ✓ */
  assert.ok(step3.includes(MARK), 'толгой нь 3-р алхмын бүсэд байх ёстой');
  const anyStep = FORM.lastIndexOf('{step ===', FORM.indexOf(MARK));
  assert.ok(anyStep === FORM.indexOf('{step === 2 && ('), 'хамгийн ойрын нөхцөл нь 3-р алхам биш');
});

t('📱 Wizard навигаци: «Үргэлжлүүлэх» (`mobileDetailNext`) + «Алгасах» (`hidden` — заавал үед ✓)', () => {
  assert.ok(step3.includes('data-mobile-detail-nav'));
  assert.match(step3, /data-mobile-detail-next[\s\S]{0,200}?onClick=\{mobileDetailNext\}/);
  assert.ok(step3.includes("className={`btn btn-ghost ${activeDetail.required ? 'hidden' : ''}`}"));
});

t('🏁 СҮҮЛИЙН дэлгэц БА сонголттой дэлгэцэд wizard-ийн навигаци ХААГДАЖ, алхмын товч л үлдэнэ ✓', () => {
  /** ⚠️ 2026-10-03 (17): сонголттой талбар дээр (`pick`) доод товч ХЭРЭГГҮЙ —
   *  сонголт дээр дарахад ШУУД дараагийн асуулт руу шилждэг (unegui.mn-ийн зан) ✓ */
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

console.log(`\n✅ Нийт ${passed} шалгалт амжилттай — 📱 3-р алхам «асуулт бүр нэг дэлгэц» гэрээ түгжигдэв\n`);
