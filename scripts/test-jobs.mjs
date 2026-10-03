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

t('🕒 Ажлын цаг — 5 сонголт, `chips: true` (sidebar-д ЧИП)', () => {
  const f = getAttrField('jobs', 'jobType');
  assert.equal(f.label, 'Ажлын цаг');
  assert.equal(f.icon, '🕒');
  assert.equal(f.chips, true);
  assert.deepEqual(f.options, JOB_TIME_OPTIONS);
  assert.deepEqual(JOB_TIME_OPTIONS, ['Бүтэн цагийн', 'Хагас цагийн', 'Цагийн', 'Гэрээт', 'Түр хугацааны']);
});

t('📊 Туршлага — Шаардлагатай / Шаардлагагүй', () => {
  assert.deepEqual(getAttrField('jobs', 'experience').options, ['Шаардлагатай', 'Шаардлагагүй']);
});

t('🏷️ Зарлагч — Байгууллага / Хувь хүн / Зуучлагч', () => {
  const f = getAttrField('jobs', 'advertiser');
  assert.equal(f.label, 'Зарлагч');
  assert.deepEqual(f.options, ['Байгууллага', 'Хувь хүн', 'Зуучлагч']);
});

t('📈 Мэргэжлийн түвшин — 5 шат', () => {
  const f = getAttrField('jobs', 'jobLevel');
  assert.equal(f.label, 'Мэргэжлийн түвшин');
  assert.deepEqual(f.options, ['Дадлагын', 'Анхан шатны', 'Мэргэжилтэн', 'Дунд шатны удирдлага', 'Дээд шатны удирдлага']);
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
  //    sidebar-ийн харагдац (unegui.mn-ийн хайлтын зураг) ХӨНДӨГДӨӨГҮЙ ✓
  assert.equal(getAttrField('jobs', 'jobType').chips, true);
  assert.equal(getAttrField('jobs', 'experience').chips, undefined);
  assert.equal(getAttrField('jobs', 'jobLevel').chips, undefined);
  assert.deepEqual(getAttrFilters('jobs').map((f) => f.chips === true), [true, false, false]);
});

t('🚫 Хуучин талбарууд (salary/education/workMode/expiry) форм/шүүлтээс ХАСАГДАВ', () => {
  ['salary', 'education', 'workMode', 'expiry'].forEach((k) => assert.equal(getAttrField('jobs', k), null, `${k} байсаар байна ✗`));
  assert.ok(!getAttrFilters('jobs').some((f) => ['salary', 'education', 'workMode', 'expiry'].includes(f.key)));
});

// ---------- ② SIDEBAR ШҮҮЛТ ----------
t('🔎 Sidebar шүүлт нь ЯГ 3: 🕒 jobType(чип) · 📊 experience · 📈 jobLevel (unegui дараалал)', () => {
  assert.deepEqual(getAttrFilters('jobs').map((f) => f.key), ['jobType', 'experience', 'jobLevel']);
  assert.equal(getAttrFilters('jobs')[0].chips, true);
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

t('🎛 Форм: `formChips || chips` салбар — `.chip-toggle` + `data-attr-field`/`data-attr-value`', () => {
  assert.match(ADD_CODE, /f\.formChips \|\| f\.chips \? \(/);
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
  const attrStart = HOME_CODE.indexOf('{attrFilters.map((f) => {');
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
  //    толгой/мөр болж ГАРАХГҮЙ ✓ (`section === 'jobs'` үед `company` хоосон)
  assert.equal(formatAttrsLine('jobs', { company: 'Мобиком', position: 'Программист' }), 'Ажилд авна');
  // ℹ️ 🛠️ Үйлчилгээ дээр 🏢 `company` ХЭВЭЭР толгой болно (хөндөгдөөгүй ✓)
  assert.equal(formatAttrsLine('services', { company: 'Гэр засвар' }), 'Гэр засвар');
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
  assert.ok(!/^\s+company,$/m.test(SEED), 'jobs attrs-д `company` үлдсэн ✗');
  assert.ok(!/^\s+position,$/m.test(SEED), 'jobs attrs-д `position` үлдсэн ✗');
  // ℹ️ 🛠️ Үйлчилгээний `company: pick(SERVICE_NAMES)` ХЭВЭЭР (тусдаа хэсэг ✓)
  assert.match(SEED, /company: pick\(SERVICE_NAMES\)/);
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);
