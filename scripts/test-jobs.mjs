// ============================================================
// test-jobs.mjs — 💼 АЖЛЫН ЗАРЫН ГЭРЭЭ (2026-10-03 (9))
//
// Хэрэглэгчийн хүсэлт:
//   «Ажлын зарын дэлгэрэнгүй хэсгиийг ийм болгоё:
//     Ажлын цаг: Бүтэн цагийн · Хагас цагийн · Цагийн · Гэрээт · Түр хугацааны
//     Туршлага: Шаардлагатай · Шаардлагагүй
//     Зарлагч: Байгууллага · Хувь хүн · Зуучлагч
//     Мэргэжлийн түвшин: Дадлагын · Анхан шатны · Мэргэжилтэн ·
//                        Дунд шатны удирдлага · Дээд шатны удирдлага
//     Цалингийн Төрөл: Тогтмол · Хэлбэлзэх
//    Мөн ажлын зар хайх хэсгийн Design ийг бас явуулсан хараад хийгээрэй»
//   + «Жич Энд Үнэ биш Цалин байх юм шүү» (unegui.mn-ийн зурагнууд).
//
// 🆕 2026-10-05 (42) (хэрэглэгчийн хүсэлт: «Ажлын цаг, Туршлага, Мэргэжлийн
//    түвшиныг Өрөөний тоо шиг болго, хайлтыг хэлж байгаа биз дээ»): ХАЙЛТЫН
//    3 шүүлт (🕒/📊/📈) нь «🛏 Өрөөний тоо» · «💳 Төлбөрийн нөхцөл»-ийн ЯГ
//    ИЖИЛ — үр дүнгийн ДЭЭРХ ХЭВТЭЭ `#filter-bar`-т «pill + ⌄ хөвөг панель»
//    (`filterBar: true` + `chips` + `multi`) ⇒ панель дотор ОЛОН сонголттой
//    `chip-toggle` чипүүд, `?attr_jobType=Бүтэн цагийн,Цагийн` ба DB
//    `attrs->>jobType=in.(…)` ✓ (⚠️ ФОРМ ХӨНДӨГДӨӨГҮЙ — `formChips` хэвээр ✓)
//
// 🆕 2026-10-06 (17) (хэрэглэгчийн хүсэлт: «Ажлын зарын Ажлын цаг, Туршлага,
//    Мэргэжлийн түвшин -ийг бас Дэлгэрэнгүй хайлт д оруул»): ⏳ (42)-ийн
//    `#filter-bar` PILL ХАСАГДАВ ⇒ 3 нь «Дэлгэрэнгүй хайлт»-ийн САЙДБАРТ
//    буцав — 💼-ийн дээд «💰 Цалин, ₮» блокийн ДАРАА, 🛏/💳-тэй ЯГ ИЖИЛ
//    хүрээтэй хайрцаг + `chip-toggle` чипүүд + «N сонгосон» + «✕ Цуцлах»
//    (⚠️ утга/URL/DB/форм БҮГД ХӨНДӨГДӨӨГҮЙ — зөвхөн ГАЗАР нь солигдов ✓)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Ажлын зарын талбарууд/form/шүүлт/карт/дэлгэрэнгүй нь НЭГ эх сурвалжаас
//   (`lib/locationData.js`) удирдагдана — нэг газар буруу болвол форм, хайлт,
//   карт, дэлгэрэнгүй ДӨРВҮҮЛЭЭ зэрэг эвдэрнэ ✗. Энэ тест тэр гэрээг бариулна ✓
//
// АЖИЛЛУУЛАХ:  npm run test:jobs
// ⚠️ DB/React хөндөхгүй — зөвхөн Node (`lib/locationData.js` шууд + эх кодын гэрээ).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import {
  getAttrFields, getAttrFilters, getAttrField, getAttrRows,
  priceWord, isJobsSection, formatAttrsLine,
  JOB_TIME_OPTIONS,
} from '../lib/locationData.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/** Комментгүй ЦЭВЭР КОД (тайлбар доторх «хасагдсан» гэсэн үг хуурамч улаан гарахгүй) */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const HOME = readSrc('components/HomeClient.jsx');
const HOME_CODE = codeOnly(HOME);
const ADD = readSrc('components/AddListingClient.jsx');
const ADD_CODE = codeOnly(ADD);
const FORMAT = readSrc('lib/format.js');
const FORMAT_CODE = codeOnly(FORMAT);
const SEED = readSrc('scripts/seed-sections.mjs');

console.log('\n🧪 Ажлын зар — шинэ талбарууд + «Цалин» (2026-10-03 (9))\n');

// ---------- ① ХЭСЭГ / ТАЛБАРУУД ----------
t('💼 jobs: форм нь ЯГ 5 талбар — 🏢 company / 💼 position ХАСАГДАВ (2026-10-03 (10))', () => {
  assert.deepEqual(
    getAttrFields('jobs').map((f) => f.key),
    ['jobType', 'experience', 'advertiser', 'jobLevel', 'salaryType'],
  );
  // ⚠️ Хэрэглэгчийн хүсэлт (2026-10-03 (10)): «🏢 Компани / байгууллага,
  //    💼 Албан тушаал — энэ 2-ыг зайлуул» ⇒ форм · карт · «Зарын дэлгэрэнгүй»
  //    хүснэгт ГУРВУУЛААС ГАРНА ✓ (`getAttrRows` нь `attrFields`-ээр явдаг)
  ['company', 'position'].forEach((k) => assert.equal(getAttrField('jobs', k), null, `${k} байсаар байна ✗`));
});

t('🕒 Ажлын цаг — 5 сонголт, `chips` + `multi` (сайдбарын чип блок)', () => {
  const f = getAttrField('jobs', 'jobType');
  assert.equal(f.label, 'Ажлын цаг');
  assert.equal(f.icon, '🕒');
  assert.equal(f.chips, true);
  // 🆕 2026-10-05 (42): «Өрөөний тоо»/«Төлбөрийн нөхцөл» шиг олон сонголт
  //    (`in.(…)` query ✓); 🆕 2026-10-06 (17): pill туг ХАСАГДАВ (сайдбарт ✓)
  assert.equal(f.multi, true);
  assert.equal(f.filterBar, undefined, 'pill туг хэвээр байна ✗ (сайдбарт орох ёстой)');
  assert.deepEqual(f.options, JOB_TIME_OPTIONS);
  assert.deepEqual(JOB_TIME_OPTIONS, ['Бүтэн цагийн', 'Хагас цагийн', 'Цагийн', 'Гэрээт', 'Түр хугацааны']);
});

t('📊 Туршлага — Шаардлагатай / Шаардлагагүй (`chips` + `multi`)', () => {
  const f = getAttrField('jobs', 'experience');
  assert.deepEqual(f.options, ['Шаардлагатай', 'Шаардлагагүй']);
  assert.equal(f.chips, true);
  assert.equal(f.multi, true);
  assert.equal(f.filterBar, undefined);
});

t('🏷️ Зарлагч — Байгууллага / Хувь хүн / Зуучлагч', () => {
  const f = getAttrField('jobs', 'advertiser');
  assert.equal(f.label, 'Зарлагч');
  assert.deepEqual(f.options, ['Байгууллага', 'Хувь хүн', 'Зуучлагч']);
});

t('📈 Мэргэжлийн түвшин — 5 шат (`chips` + `multi`)', () => {
  const f = getAttrField('jobs', 'jobLevel');
  assert.equal(f.label, 'Мэргэжлийн түвшин');
  assert.deepEqual(f.options, ['Дадлагын', 'Анхан шатны', 'Мэргэжилтэн', 'Дунд шатны удирдлага', 'Дээд шатны удирдлага']);
  assert.equal(f.chips, true);
  assert.equal(f.multi, true);
  assert.equal(f.filterBar, undefined);
});

t('💰 Цалингийн төрөл — Тогтмол / Хэлбэлзэх', () => {
  const f = getAttrField('jobs', 'salaryType');
  assert.equal(f.label, 'Цалингийн төрөл');
  assert.deepEqual(f.options, ['Тогтмол', 'Хэлбэлзэх']);
});

t('🎛 Форм: 4 талбар нь ЧИПЭЭР сонгоно (`formChips: true`, 2026-10-03 (11))', () => {
  // Хэрэглэгчийн хүсэлт: «Ажлын цаг, Туршлага, Зарлагч, Мэргэжлийн түвшин
  // бүгдийг сонгож оруулдаг болгоё, Жишээг хар» + чип товчны зураг ⇒
  // форм дээр `<select>` биш, бөөрөнхий ЧИП ТОВЧ ✓
  ['jobType', 'experience', 'advertiser', 'jobLevel'].forEach((k) => {
    assert.equal(getAttrField('jobs', k).formChips, true, `${k}: форм дээр чип биш ✗`);
  });
  // 💰 «Цалингийн төрөл» нь хэвээр `<select>` (хэрэглэгчийн жагсаалтад ороогүй ✓)
  assert.equal(getAttrField('jobs', 'salaryType').formChips, undefined);
  // ⚠️ `formChips` (форм) ба `chips` (sidebar ШҮҮЛТ) нь ТУСДАА туг —
  //    🆕 2026-10-05 (42): sidebar-ийн 🕒/📊/📈 ч гурвуулаа чип болов ⇒
  //    `chips` нь sidebar-ийн ДҮРСЛЭЛИЙГ л тодорхойлно (форм хөндөгдөхгүй ✓)
  assert.equal(getAttrField('jobs', 'jobType').chips, true);
  assert.equal(getAttrField('jobs', 'experience').chips, true);
  assert.equal(getAttrField('jobs', 'jobLevel').chips, true);
  assert.deepEqual(getAttrFilters('jobs').map((f) => f.chips === true), [true, true, true]);
});

t('🚫 Хуучин талбарууд (salary/education/workMode/expiry) форм/шүүлтээс ХАСАГДАВ', () => {
  ['salary', 'education', 'workMode', 'expiry'].forEach((k) => assert.equal(getAttrField('jobs', k), null, `${k} байсаар байна ✗`));
  assert.ok(!getAttrFilters('jobs').some((f) => ['salary', 'education', 'workMode', 'expiry'].includes(f.key)));
});

// ---------- ② ДЭЛГЭРЭНГҮЙ ХАЙЛТ (сайдбар) — (42)-д pill байснаа (17)-д буцав ----------
t('🎛 Шүүлт нь ЯГ 3 — гурвуулаа САЙДБАРТ (`chips` + `multi`, pill туггүй)', () => {
  assert.deepEqual(getAttrFilters('jobs').map((f) => f.key), ['jobType', 'experience', 'jobLevel']);
  // 🆕 (42): «🛏 Өрөөний тоо» / «💳 Төлбөрийн нөхцөл»-ийн ЯГ ИЖИЛ —
  //    `chips` + `multi` (олон сонголт: `?attr_x=A,B` ⇒ `attrs->>x=in.(…)`)
  // 🆕 (17): `filterBar` туг ХАСАГДАВ ⇒ pill БИШ, сайдбарын чип блок ✓
  getAttrFilters('jobs').forEach((f) => {
    assert.equal(f.chips, true, `${f.key}.chips ✗`);
    assert.equal(f.multi, true, `${f.key}.multi ✗`);
    assert.equal(f.filterBar, undefined, `${f.key}.filterBar: pill хэвээр ✗`);
    assert.equal(f.afterPayment, undefined, `${f.key}.afterPayment: 💳-ийн араа биш ✗`);
  });
});

t('🎛 HomeClient: pill → `#filter-bar` · сайдбарт `!f.filterBar` ба `!f.afterPayment`', () => {
  /**
   * 🆕 2026-10-05 (42) · 🆕 2026-10-06 (17): аль талбар `#filter-bar`-т гарахыг
   *    `lib/locationData.js`-ийн `filterBar: true` туг л шийднэ (хатуу жагсаалт
   *    `FILTER_BAR_ATTR_KEYS` БАЙХГҮЙ ✓) — 2 ӨӨР UI БАЙХГҮЙ (сайдбарт
   *    `!f.filterBar`-ээр хасагдана ✓). 🆕 (17): 🔀 `afterPayment` талбар нь
   *    үндсэн attr жагсаалтад ОРОХГҮЙ — «💳 Төлбөрийн нөхцөл»-ийн дараа ТУСДАА ✓
   */
  assert.match(HOME_CODE, /attrFilters\.filter\(\(f\) => f\.chips && f\.multi && f\.filterBar\)/);
  assert.match(HOME_CODE, /\.filter\(\(f\) => !f\.filterBar\)/);
  assert.match(HOME_CODE, /\.filter\(\(f\) => !f\.afterPayment\)/);
  assert.ok(!/FILTER_BAR_ATTR_KEYS/.test(HOME_CODE), 'хатуу жагсаалт буцаж орсон ✗');
  // 🆕 (17): 💼-ийн 3 чип нь сайдбарт — «💰 Цалин, ₮» блокийн ДАРАА ✓
  const priceAt = HOME.indexOf('{isJobs && priceSideBlock}');
  const attrAt = HOME.indexOf('{attrFilters');
  assert.ok(priceAt > 0 && attrAt > 0 && priceAt < attrAt,
    '💼 «Цалин, ₮» нь attr шүүлтүүдийн дараа байна ✗ (3 чип цалингийн дараа байх ёстой)');
  // pill нь `data-filter-pill`/`data-filter-panel` дэгээтэй (`FilterPill`)
  assert.match(HOME_CODE, /data-filter-pill=\{testKey\}/);
  assert.match(HOME_CODE, /data-filter-panel=\{testKey\}/);
});

// ---------- ③ «ҮНЭ» → «ЦАЛИН» ----------
t('💼 priceWord/isJobsSection: ажил → «Цалин», бусад → «Үнэ»', () => {
  assert.equal(priceWord('jobs'), 'Цалин');
  ['real-estate', 'auto', 'computers', 'all'].forEach((s) => assert.equal(priceWord(s), 'Үнэ'));
  assert.equal(isJobsSection('jobs'), true);
  assert.equal(isJobsSection('auto'), false);
});

t('🏷️ format.js: NEGOTIABLE_SALARY_LABEL + negotiableLabel (section-аар солигдоно)', () => {
  assert.match(FORMAT_CODE, /NEGOTIABLE_SALARY_LABEL\s*=\s*'Цалин тохиролцоно'/);
  assert.match(FORMAT_CODE, /function negotiableLabel\(listing\)/);
  assert.match(FORMAT_CODE, /listing\.section === 'jobs'/);
  // priceLabel/negotiableNote ХОЁУЛАА negotiableLabel-аар явна (давхар текст БАЙХГҮЙ)
  assert.match(FORMAT_CODE, /: negotiableLabel\(listing\);/);
  assert.match(FORMAT_CODE, /isNegotiablePrice\(listing\) \? negotiableLabel\(listing\)/);
});

// ---------- ④ ФОРМ (AddListingClient) ----------
t('📝 Форм: 4-р алхамд «Цалингийн хэмжээ» + «Цалин тохиролцоно» (ажил дээр)', () => {
  assert.match(ADD_CODE, /jobsSection = form\.section === 'jobs'/);
  assert.match(ADD_CODE, /priceFieldTitle = jobsSection \? 'Цалингийн хэмжээ' : 'Үнэ'/);
  assert.match(ADD_CODE, /priceNegotiableText = jobsSection \? NEGOTIABLE_SALARY_LABEL : NEGOTIABLE_PRICE_LABEL/);
  assert.match(ADD_CODE, /<label>\{priceFieldTitle\} <\/label>/);
  assert.match(ADD_CODE, /\{priceNegotiableText\}/);
});

t('🎛 Форм: `formChips` салбар — `.chip-toggle` + `data-attr-field`/`data-attr-value`', () => {
  /**
   * 🆕 2026-10-03 (19): салбарын нөхцөл нь `f.formChips` БОЛОВ (`|| f.chips` ХАСАГДАВ)
   * — учир нь `chips: true` нь **зөвхөн ХАЙЛТЫН sidebar**-ийн туг (ж: 🎨
   * «Өнгө», 🚗 авто) бөгөөд тэр талбар нь ФОРМ дээр хэвээр `<select>` байх
   * ёстой ✗ (өмнө нь `chips` дангаараа формойн чипийг ч асаадаг байв —
   * `AddListingClient` нь зөвхөн `formChips`-ыг шалгана ✓)
   */
  assert.match(ADD_CODE, /f\.formChips \? \(/);
  assert.ok(!/f\.formChips \|\| f\.chips/.test(ADD_CODE), '`|| f.chips` хэвээр ✗');
  assert.match(ADD_CODE, /data-attr-field=\{f\.key\}/);
  assert.match(ADD_CODE, /data-attr-value=\{o\}/);
  assert.match(ADD_CODE, /aria-pressed=\{on\}/);
  // ⚠️ Утга нь `<select>`-тэй ЯГ ИЖИЛ — идэвхтэй дээр дарвал ЦУЦЛАГДАНА
  assert.match(ADD_CODE, /setAttrCascade\(f, on \? '' : o\)/);
  assert.match(ADD_CODE, /const on = value === o;/);
  // 🎨 Харагдац нь sidebar-ийн чиптэй НЭГ CSS (`chip-toggle`/`chip-toggle-active`)
  assert.match(ADD_CODE, /chip-toggle \$\{on \? 'chip-toggle-active' : ''\}/);
  // ⚠️ ХУУЧИН утга нь ЭХНИЙ чип (жагсаалтад байхгүй утга алга болохгүй ✓)
  assert.match(ADD_CODE, /legacy \? \[legacy, \.\.\.\(f\.options \|\| \[\]\)\]/);
});

// ---------- ⑤ SIDEBAR (HomeClient) ----------
t('🕒 Sidebar: `f.chips` салбар НЭМЭГДЭВ (`chip-toggle` + `data-attr-value`)', () => {
  assert.match(HOME_CODE, /f\.chips \? \(/);
  assert.match(HOME_CODE, /data-attr-filter=\{f\.key\}/);
  assert.match(HOME_CODE, /data-attr-value=\{o\}/);
  assert.match(HOME_CODE, /setAttr\(f\.key, on \? '' : o\)/);
});

t('💰 Sidebar: үнийн блок нэг эх сурвалж (`priceSideBlock`) + ажилд «Цалин, ₮»', () => {
  assert.match(HOME_CODE, /const priceSideBlock = \(/);
  assert.match(HOME_CODE, /label=\{`\$\{priceWord\(section\)\}, ₮`\}/);
  assert.match(HOME_CODE, /label=\{priceWord\(section\)\}/);
});

t('💼 Sidebar дараалал: ажилд үнэ нь attr шүүлтүүдийн ӨМНӨ (`isJobs && priceSideBlock`)', () => {
  assert.match(HOME_CODE, /\{isJobs && priceSideBlock\}/);
  assert.match(HOME_CODE, /\{!isJobs && priceSideBlock\}/);
  const beforeAttr = HOME_CODE.indexOf('{isJobs && priceSideBlock}');
  // ⚠️ 2026-10-04 (35): attr жагсаалт нь `CarPicker`-ийн төлөө `.filter(…)`-тэй
  //    болов (`{attrFilters\n .filter(…)`) тул `'{attrFilters.map('` гэсэн
  //    ХАТУУ мөр олдохгүй ✗ → зөвхөн блокийн ЭХЛЭЛИЙГ хайна ✓
  const attrStart = HOME_CODE.indexOf('{attrFilters');
  const afterAttr = HOME_CODE.indexOf('{!isJobs && priceSideBlock}');
  assert.ok(beforeAttr > 0 && attrStart > 0 && afterAttr > 0, 'блок олдсонгүй ✗');
  assert.ok(beforeAttr < attrStart, 'ажлын үнэ attr шүүлтүүдийн ДАРАА байна ✗');
  assert.ok(afterAttr > attrStart, 'бусад хэсгийн үнэ attr шүүлтүүдийн ӨМНӨ байна ✗');
});

// ---------- ⑥ КАРТ / SEED ----------
t('📇 Картын мөр: «Ажилд авна» толгой + 5 талбар (🏢/💼 МӨРӨНД ГАРАХГҮЙ)', () => {
  assert.equal(
    formatAttrsLine('jobs', {
      company: 'Мобиком', position: 'Программист', jobType: 'Бүтэн цагийн',
      experience: 'Шаардлагатай', advertiser: 'Байгууллага',
      jobLevel: 'Мэргэжилтэн', salaryType: 'Тогтмол',
    }),
    'Ажилд авна · 🕒 Бүтэн цагийн · 📊 Шаардлагатай · 🏷️ Байгууллага · 📈 Мэргэжилтэн · 💰 Тогтмол',
  );
  // ⚠️ ХУУЧИН заруудын `attrs.company`/`attrs.position` (DB-д хэвээр) нь картын
  //    толгой/мөр болж ГАРАХГҮЙ ✓ (`section === 'jobs'` үед «Ажилд авна» толгой)
  assert.equal(formatAttrsLine('jobs', { company: 'Мобиком', position: 'Программист' }), 'Ажилд авна');
  // 🗑 2026-10-06 (5): 🛠️ Ажил, Үйлчилгээний 🏢 `company` ч ХАСАГДАВ тул
  //    ХУУЧИН заруудын `attrs.company` нь тэнд ч толгой болохгүй —
  //    `CARD_ATTR_ORDER.services` БҮРЭН хасагдсан ⇒ мөр ХООСОН ✓
  assert.equal(formatAttrsLine('services', { company: 'Гэр засвар' }), '');
  assert.equal(
    formatAttrsLine('services', { company: 'Гэр засвар', coverage: 'Орон даяар', availability: '24/7' }),
    '',
  );
});

t('📋 `getAttrRows(jobs)` — `salary`/`company`/`position` МӨР БАЙХГҮЙ (цалин нь зарын ҮНЭ)', () => {
  const rows = getAttrRows('jobs', {
    company: 'X', position: 'Y', salary: '2500000', jobType: 'Цагийн',
    experience: 'Шаардлагатай', advertiser: 'Хувь хүн', jobLevel: 'Анхан шатны', salaryType: 'Тогтмол',
  });
  assert.deepEqual(
    rows.map((r) => r.key),
    ['jobType', 'experience', 'advertiser', 'jobLevel', 'salaryType'],
  );
  ['salary', 'company', 'position'].forEach((k) => assert.ok(
    !rows.some((r) => r.key === k), `${k} мөр «Зарын дэлгэрэнгүй»-д гарсан ✗`,
  ));
  assert.equal(rows.find((r) => r.key === 'jobType').value, 'Цагийн');
});

t('🌱 seed-sections: ДЕМО өгөгдөл нь ШИНЭ утгуудтай (education/workMode/company/position БАЙХГҮЙ)', () => {
  assert.match(SEED, /salaryType: pick\(\['Тогтмол'/);
  assert.match(SEED, /advertiser: pick\(/);
  assert.match(SEED, /jobLevel: isExecutive/);
  assert.ok(!/education: isEntry/.test(SEED), 'seed-д хуучин education үлдсэн ✗');
  // ⚠️ 2026-10-03 (10): 🏢 `company` / 💼 `position` нь ажлын зарын талбаруудаас
  //    хамт ХАСАГДСАН тул демо `attrs`-д ч ҮҮСЭХГҮЙ, `JOB_SUBTYPE_PAIRS` УСТСАН ✓
  assert.ok(!/const JOB_SUBTYPE_PAIRS\s*=/.test(SEED), 'seed-д `JOB_SUBTYPE_PAIRS` хүснэгт үлдсэн ✗');
  assert.ok(!/JOB_SUBTYPE_PAIRS\[/.test(SEED), '`JOB_SUBTYPE_PAIRS` АШИГЛАГДСАар байна ✗');
  const seedLines = SEED.split(String.fromCharCode(10)).map((l) => l.trim());
  assert.ok(!seedLines.includes('company,'), 'jobs attrs-д `company` үлдсэн ✗');
  assert.ok(!seedLines.includes('position,'), 'jobs attrs-д `position` үлдсэн ✗');
  // 🗑 2026-10-06 (5): 🛠️ Ажил, Үйлчилгээний `company`/`coverage`/`experience`/
  //    `availability` ч демо зарт ҮҮСЭХГҮЙ + `SERVICE_NAMES` УСТСАН ✓
  //    (⚠️ `jobs`-ийн `jobType`/`advertiser`/`jobLevel`/`salaryType` ХӨНДӨӨГДӨӨГҮЙ ✓)
  assert.ok(seedLines.some((l) => l.startsWith('jobType:')), 'jobs-ийн jobType ХАСАГДСАН ✗');
  assert.ok(seedLines.some((l) => l.startsWith('advertiser: pick(')), 'jobs-ийн advertiser ХАСАГДСАН ✗');
  assert.ok(!SEED.includes('const SERVICE_NAMES'), 'seed-д `SERVICE_NAMES` хүснэгт үлдсэн ✗');
  assert.ok(!SEED.includes('pick(SERVICE_NAMES)'), 'seed нь `SERVICE_NAMES` ашиглаж байна ✗');
  assert.ok(!SEED.includes('company: pick('), 'services-ийн `company` seed-д үлдсэн ✗');
  ['coverage', 'experience', 'availability'].forEach((k) => {
    assert.ok(
      !seedLines.some((l) => l.startsWith(k + ': pick(')),
      'seed-ийн services аттрт ' + k + ' үлдсэн ✗',
    );
  });
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);
