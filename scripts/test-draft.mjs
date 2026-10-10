// ============================================================
// test-draft.mjs — 📝 «ЗАР НЭМЭХ» ФОРМЫН НООРОГ (localStorage) ГЭРЭЭ
//
// 🎯 ХЭРЭГЛЭГЧИЙН ГОМДОЛ (2026-10-05): «зар нэмж байх үедээ гар утасны
//    browser санамсаргүй refresh хийхэд оруулж байсан мэдээлэл байхгүй болж
//    байна» ⇒ форм нь зөвхөн React-ийн санах ойд (`useState`) байсан тул
//    хуудас дахин ачаалагдмагц БҮХ талбар алга болдог байв ✗
//    Энэ тест нь ТЭР ЗАСВАРЫН гэрээг (цэвэр логик + форм + README) түгжинэ ✓
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/listingDraft.mjs` — ЦЭВЭР логик: түлхүүр (хэрэглэгч/зар тусгаарлалт),
//      whitelist (`pickDraftForm` — танихгүй түлхүүр payload руу орохгүй),
//      бичих/унших (хувилбар, TTL, `editId` тохирол), `isDirtyForm`,
//      `isMeaningfulDraft`, мэдэгдлийн текст
//   ② ГЭРЭЭ (эх файлыг ШУУД уншина — санамсаргүй салгахаас сэргийлнэ):
//      `components/AddListingClient.jsx` — сэргээх/бичих эффект, «Хамгаалалт»
//      (`?step=`) нь сэргээлтийг ХҮЛЭЭХ, хадгалсны дараа ноорог УСТАХ,
//      `data-draft-restored` / `data-draft-discard` + `type="button"`
//   ③ 📄 README бичигдсэн эсэх
//
// АЖИЛЛУУЛАХ:  npm run test:draft
// ⚠️ DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node (`listingDraft.mjs` — цэвэр модуль).
//    📱 CDP-ээр ЖИНХЭНЭ refresh-ийг шалгах: `npm run cdp:picker` (⑪⁗ хэсэг)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  DRAFT_VERSION, DRAFT_PREFIX, DRAFT_TTL_MS,
  draftKey, serializeDraft, parseDraft, sanitizeDraftValue,
  isDirtyForm, isMeaningfulDraft, draftNoticeText,
} from '../lib/listingDraft.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

/** 📄 Эх файлыг унших (ГЭРЭЭ/регрессийн шалгалтад) */
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/** 🧹 Зөвхөн КОД (коммент тайлбарыг хасна) — «кодод байхгүй» гэдгийг батлахад */
const codeOnly = (src) => src
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n📝 «Зар нэмэх» формоны НООРОГ (санамсаргүй refresh-ээс хамгаалалт)\n');

// ────────────────────────────────────────────────────────────
// ① ЦЭВЭР ЛОГИК (`lib/listingDraft.mjs`)
// ────────────────────────────────────────────────────────────
console.log('── ① lib/listingDraft.mjs — цэвэр логик ──');

/** Форм-ийн БОДИТ түлхүүрүүд (`emptyForm()`-ийн хэлбэр — тестэд хуулбар) */
const KEYS = ['section', 'attrs', 'propertyType', 'rooms', 'payments', 'area', 'city', 'district', 'title', 'description', 'totalFloors', 'floor', 'negotiable'];
const formOf = (over = {}) => ({
  section: 'real-estate', attrs: { brand: 'Toyota' }, propertyType: 'Орон сууц', rooms: '3',
  payments: ['cash'], area: '', city: 'Улаанбаатар', district: '', title: '', description: '',
  totalFloors: '', floor: '', negotiable: false, ...over,
});


t('① түлхүүр нь хэрэглэгч БҮРД тусдаа (нэг утсан дээр холилдохгүй)', () => {
  assert.notEqual(draftKey('user-1'), draftKey('user-2'));
  assert.equal(draftKey('user-1'), `${DRAFT_PREFIX}:user-1`);
});

t('① засах горимд ЗАР БҮРД тусдаа түлхүүр (шинэ зарын ноорог зарыг дарж бичихгүй)', () => {
  assert.equal(draftKey('user-1', 'abc-9'), `${DRAFT_PREFIX}:user-1:edit:abc-9`);
  assert.notEqual(draftKey('user-1'), draftKey('user-1', 'abc-9'));
});

t('① нэвтрээгүй/буруу id → түлхүүр ХООСОН (ноорог огт бичихгүй)', () => {
  assert.equal(draftKey(''), '');
  assert.equal(draftKey(null), '');
  assert.equal(draftKey(undefined), '');
  assert.equal(draftKey('хэрэглэгч id'), ''); // кирилл/зай — аюулгүй биш
});

t('① бичих→унших нь тойрог: утга, `pendingCount`, 3-р алхмын дэлгэц хэвээр', () => {
  const form = formOf({ title: '2 өрөө байр', totalFloors: '12', negotiable: true });
  const raw = serializeDraft({ form, keys: KEYS, pendingCount: 2, mobileDetailStep: 'totalFloors' });
  assert.equal(typeof raw, 'string');
  const d = parseDraft(raw, { keys: KEYS });
  assert.equal(d.form.title, '2 өрөө байр');
  assert.equal(d.form.totalFloors, '12');
  assert.equal(d.form.negotiable, true);
  assert.deepEqual(d.form.payments, ['cash']);
  assert.deepEqual(d.form.attrs, { brand: 'Toyota' });
  assert.equal(d.pendingCount, 2);
  assert.equal(d.mobileDetailStep, 'totalFloors');
});

t('① WHITELIST: танихгүй түлхүүр (`user_id`/`images`/`id`) ноорогт ОРОХГҮЙ', () => {
  const raw = serializeDraft({
    form: formOf({ user_id: 'хакер', images: ['a.jpg'], id: '999' }),
    keys: KEYS,
  });
  const d = parseDraft(raw, { keys: KEYS });
  assert.equal('user_id' in d.form, false);
  assert.equal('images' in d.form, false);
  assert.equal('id' in d.form, false);
  // ⚠️ «бохир» localStorage: гараар нэмсэн түлхүүр ч мөн шахагдана ✓
  const hand = JSON.stringify({ v: DRAFT_VERSION, editId: '', savedAt: Date.now(), form: { title: 'x', user_id: 'bad' } });
  const d2 = parseDraft(hand, { keys: KEYS });
  assert.deepEqual(Object.keys(d2.form), ['title']);
});

t('① `serializeDraft` нь `File`/`null`/функц зэргийг чимээгүй хаяна (JSON эвдрэхгүй)', () => {
  const raw = serializeDraft({ form: formOf({ area: null, title: undefined, bad: () => {} }), keys: [...KEYS, 'area', 'title', 'bad'] });
  assert.equal(raw.includes('bad'), false);
  const d = parseDraft(raw, { keys: KEYS });
  assert.equal('area' in d.form, false);
  assert.equal('title' in d.form, false);
  assert.equal(sanitizeDraftValue(new Date()), undefined);
  assert.equal(sanitizeDraftValue(NaN), undefined);
});


t('① хувилбар (`v`) солигдвол хуучин ноорог ХҮЧИНГҮЙ', () => {
  const raw = JSON.stringify({ v: DRAFT_VERSION + 1, editId: '', savedAt: Date.now(), form: { title: 'x' } });
  assert.equal(parseDraft(raw, { keys: KEYS }), null);
});

t('① TTL: 3 хоногоос хуучин ноорог сэргээгдэхгүй (мөн ирээдүйн цаг ч биш)', () => {
  const now = Date.now();
  const fresh = serializeDraft({ form: formOf({ title: 'шинэ' }), keys: KEYS, savedAt: now - 60 * 1000 });
  const old = serializeDraft({ form: formOf({ title: 'хуучин' }), keys: KEYS, savedAt: now - DRAFT_TTL_MS - 1000 });
  const future = serializeDraft({ form: formOf({ title: 'ирээдүй' }), keys: KEYS, savedAt: now + 60 * 60 * 1000 });
  assert.ok(parseDraft(fresh, { keys: KEYS, now }));
  assert.equal(parseDraft(old, { keys: KEYS, now }), null);
  assert.equal(parseDraft(future, { keys: KEYS, now }), null);
});

t('① `editId` тохирохгүй бол ХҮЧИНГҮЙ (шинэ зарын ноорог засах горимд орохгүй)', () => {
  const raw = serializeDraft({ form: formOf({ title: 'шинэ зар' }), keys: KEYS, editId: '' });
  assert.equal(parseDraft(raw, { keys: KEYS, editId: 'abc-9' }), null);
  const raw2 = serializeDraft({ form: formOf({ title: 'засвар' }), keys: KEYS, editId: 'abc-9' });
  assert.equal(parseDraft(raw2, { keys: KEYS, editId: 'abc-9' }).form.title, 'засвар');
});

t('① эвдэрсэн хог (хоосон, `{`, `[1]`, `null`, тоо) → `null` (устгах шийдвэр ✓)', () => {
  for (const junk of ['', null, undefined, 42, '{', '[1]', 'null', '"text"', '{"v":1}']) {
    assert.equal(parseDraft(junk, { keys: KEYS }), null, String(junk));
  }
});

t('① хоосон форм нь «үнэ цэнэгүй» → сэргээхгүй, харин зурагтай бол ҮНЭ ЦЭНЭТЭЙ', () => {
  const base = formOf();
  assert.equal(isDirtyForm(formOf(), base), false);
  assert.equal(isDirtyForm(formOf({ title: 'x' }), base), true);
  assert.equal(isMeaningfulDraft({ form: formOf(), pendingCount: 0 }, JSON.stringify(base)), false);
  assert.equal(isMeaningfulDraft({ form: formOf(), pendingCount: 1 }, JSON.stringify(base)), true);
  assert.equal(isMeaningfulDraft({ form: formOf({ title: 'x' }), pendingCount: 0 }, JSON.stringify(base)), true);
  assert.equal(isMeaningfulDraft(null, JSON.stringify(base)), false);
});

t('① `isDirtyForm` нь JSON МӨР хүлээн авна (`baselineRef.current` — дахин тооцоололгүй ✓)', () => {
  assert.equal(isDirtyForm(formOf(), JSON.stringify(formOf())), false);
  assert.equal(isDirtyForm(formOf({ floor: '5' }), JSON.stringify(formOf())), true);
  assert.equal(isDirtyForm(undefined, undefined), false); // алдаа шидэхгүй ✓
});

t('① мэдэгдлийн текст: зураг байвал «дахин нэмнэ үү» сануулга (зураг хадгалагдахгүй ✓)', () => {
  assert.equal(draftNoticeText({ pendingCount: 0 }), 'Хадгалагдсан ноорог сэргээгдлээ');
  assert.ok(draftNoticeText({ pendingCount: 2 }).includes('зургуудаа ДАХИН нэмнэ үү'));
});

// ────────────────────────────────────────────────────────────
// ② ФОРМЫН ГЭРЭЭ (`components/AddListingClient.jsx`)
// ────────────────────────────────────────────────────────────
console.log('\n── ② AddListingClient.jsx — форм ──');

const FORM = readSrc('components/AddListingClient.jsx');
const CODE = codeOnly(FORM);

t('② форм нь бүх дүрмээ `lib/listingDraft.mjs`-ээс авна (өөрөө `JSON.parse` хийхгүй ✓)', () => {
  assert.ok(FORM.includes("from '../lib/listingDraft.mjs'"));
  for (const fn of ['draftKey', 'serializeDraft', 'parseDraft', 'isMeaningfulDraft', 'draftNoticeText']) {
    assert.ok(new RegExp(`\\b${fn}\\b`).test(FORM), fn);
  }
  assert.ok(/const draftStorageKey = draftKey\(userId, editId\)/.test(FORM));
});

t('② СЭРГЭЭХ эффект: `authLoading`/`loadingEdit` дуустал хүлээж, НЭГ Л УДАА сэргээнэ', () => {
  const at = FORM.indexOf('НООРОГ СЭРГЭЭХ');
  const block = FORM.slice(at, FORM.indexOf('НООРОГ БИЧИХ'));
  assert.ok(block.includes('if (authLoading || !userId || !draftStorageKey) return;'));
  assert.ok(block.includes('if (loadingEdit) return;'));
  assert.ok(block.includes('if (draftCheckedRef.current === draftStorageKey) return;'));
  assert.ok(block.includes('parseDraft(raw, { keys: Object.keys(emptyForm()), editId })'));
  assert.ok(block.includes('setForm((f) => ({ ...f, ...draft.form }))'));
  assert.ok(block.includes('setDraftNotice({'));
  assert.ok(block.includes('setDraftReady(true);'));
});

t('② сэргээлт нь формоо бэлдэх эффектийн ДАРАА бичигдсэн (ноорог ЛАВЛАГДАНА ✓)', () => {
  // ⚠️ React эффектүүдийг ДАРААЛАЛААР ажиллуулна ⇒ сэргээлт нь `emptyForm()` /
  //    `listingToForm(l)` утгыг дарж чадна ✓ (эс бөгөөс ноорог дэмий ✗)
  const initAt = FORM.indexOf('setEditing(null);');
  const restoreAt = FORM.indexOf('НООРОГ СЭРГЭЭХ');
  assert.ok(initAt > 0 && restoreAt > initAt, `init=${initAt} restore=${restoreAt}`);
});

t('② 🆕 (115) ноорог сэргээхэд 3-р алхмын дэлгэц ХАМГААЛАЛТТАЙ сэргээгдэнэ (🏷️ Брэнд алгасахгүй ✓)', () => {
  /**
   * 🎯 2026-10-10-ны гомдол: «📱 дээр 💻 Notebook-ийн зар оруулахад 🏷️ Брэнд
   *    асуухгүй байна» ⇒ хуучин нооргийн `mobileDetailStep` (`'attr-condition'`)
   *    нь ШИНЭ 7 дэлгэцийн сүүлчийнх рүү зааж байв ✗ ⇒ сэргээлт нь хамгаалалтыг
   *    (доорх `detailIdx`) асаах ЁСТОЙ — тэр нь хариулаагүй эхний дэлгэцээс
   *    (🏷️ Брэнд) эхлүүлнэ ✓
   */
  const at = FORM.indexOf('НООРОГ СЭРГЭЭХ');
  const block = FORM.slice(at, FORM.indexOf('НООРОГ БИЧИХ', at));
  assert.ok(block.includes('setMobileDetailStep(draft.mobileDetailStep)'), 'дэлгэц сэргээхгүй ✗');
  assert.ok(block.includes('setDraftStepGuard(true)'), 'хамгаалалт асаахгүй ✗ (2026-10-10-ны гомдол)');
  // ⚠️ Туг нь `null` болж УСТАХГҮЙ — зөвхөн `false` (унтраах = хэрэглэгч өөрөө хөдөлсөн ✓)
  assert.equal(block.includes('setDraftStepGuard(null)'), false);
});

t('② АВТО-ХАДГАЛАЛТ: `draftReady` дуустал бичихгүй/устгахгүй + debounce (`DRAFT_SAVE_DELAY`)', () => {
  assert.ok(/const DRAFT_SAVE_DELAY = 400;/.test(FORM));
  const block = FORM.slice(FORM.indexOf('НООРОГ БИЧИХ'));
  assert.ok(block.includes('|| !draftReady) return undefined;'));
  assert.ok(block.includes('const t = setTimeout(() => {'));
  assert.ok(block.includes('}, DRAFT_SAVE_DELAY);'));
  assert.ok(block.includes('return () => clearTimeout(t);'));
  assert.ok(block.includes('if (!isDirty()) { window.localStorage.removeItem(draftStorageKey); return; }'));
  assert.ok(block.includes('if (draftDoneRef.current) return;')); // ⚠️ нийтлэгдсэний дараа бичихгүй ✓
  assert.ok(block.includes('pendingCount: pending.length'));
});

t('② эффектийн хамааралд форм/зураг/3-р алхмын дэлгэц багтсан (утга бүр ХАДГАЛАГДАНА ✓)', () => {
  const at = FORM.indexOf('НООРОГ БИЧИХ');
  const deps = FORM.slice(FORM.indexOf('}, [draftReady', at), FORM.indexOf(']);', at));
  for (const d of ['draftReady', 'form', 'pending', 'existingImages', 'mobileDetailStep']) {
    assert.ok(deps.includes(d), d);
  }
});

t('② «Хамгаалалт» (`?step=`) нь ноорог сэргээгдэхийг ХҮЛЭЭНЭ (refresh бүрд 1-р алхам руу шидэхгүй ✓)', () => {
  const at = FORM.indexOf('firstInvalidStep();');
  const block = FORM.slice(FORM.lastIndexOf('useEffect(() => {', at), at);
  assert.ok(block.includes('if (!draftReady) return;'));
  assert.ok(FORM.includes('form.propertyType, form.city, draftReady]'));
});

t('② хадгалагдсаны дараа ноорог УСТАНА (`router.push`-ийн ӨМНӨ ✓)', () => {
  const submitAt = FORM.indexOf('const handleSubmit = async (e) => {');
  const doneAt = FORM.indexOf('draftDoneRef.current = true;', submitAt);
  const removeAt = FORM.indexOf('window.localStorage.removeItem(draftStorageKey)', submitAt);
  const pushAt = FORM.indexOf("router.push('/my-listings')", submitAt);
  assert.ok(removeAt > submitAt && pushAt > removeAt, `remove=${removeAt} push=${pushAt}`);
  assert.ok(doneAt > submitAt && doneAt < removeAt, `done=${doneAt} remove=${removeAt}`);
});

t('② «Цуцлах» нь ноорог ҮЛДЭЭНЭ — мессеж нь «УСТАНА» биш «НООРОГ болж хадгалагдана» ✓', () => {
  const at = FORM.indexOf('const requestCancel = () => {');
  const block = FORM.slice(at, FORM.indexOf('const discardDraft', at));
  assert.ok(block.includes('НООРОГ болж ХАДГАЛАГДАНА'));
  assert.equal(block.includes('хадгалагдахгүй УСТАНА'), false);
  assert.equal(block.includes('removeItem'), false); // гарахад УСТГАХГҮЙ ✓
});

t('② 🗑 «Устгах» товч: `[data-draft-discard]` + `type="button"` + формоо анхдагч руу буцаана', () => {
  assert.ok(FORM.includes('data-draft-restored="true"'));
  const at = FORM.indexOf('data-draft-discard="true"');
  assert.ok(at > 0);
  // ⚠️ JSX дээр `type="button"` нь `data-draft-discard`-ийн ӨМНӨ — товчны
  //    эхлэлээс (`<button`) хойшхи хэсгийг бүтнээр шалгана ✓
  const btn = FORM.slice(FORM.lastIndexOf('<button', at), FORM.indexOf('Устгах', at));
  assert.ok(btn.includes('type="button"'));
  const code = CODE.slice(CODE.indexOf('const discardDraft = () => {'));
  assert.ok(code.includes('window.localStorage.removeItem(draftStorageKey)'));
  assert.ok(code.includes('isEdit ? listingToForm(editing) : emptyForm()'));
  assert.ok(code.includes('setDraftNotice(null)'));
});

t('② мэдэгдэл нь `draftNotice` байхгүй үед DOM-д ГАРАХГҮЙ (хоосон форм дээр чимээгүй ✓)', () => {
  assert.ok(/\{draftNotice && \(/.test(FORM));
  assert.ok(FORM.includes('draftNoticeText(draftNotice)'));
});

t('② `beforeunload`-д НАЙДАХГҮЙ (📱 iOS Safari/Firefox дээр ХҮЧИНГҮЙ ✗ — утга БИЧИХ нь шийдэл ✓)', () => {
  assert.equal(CODE.includes('beforeunload'), false);
});

// ────────────────────────────────────────────────────────────
// ②′ 📝 FLASH МЭДЭГДЭЛ (2026-10-07) — доод-төвд, саарал, уусгалттай, 3.2 сек
// ────────────────────────────────────────────────────────────
t('②′ FLASH: мэдэгдэл нь дэлгэцийн ДООД-ТӨВД `fixed` (form дотроос гадагшаа гарна ✓)', () => {
  assert.ok(FORM.includes('fixed inset-x-0 bottom-20 z-[1500] flex justify-center'),
    'доод-төв `fixed` хайрцаг алга ✗');
  assert.ok(FORM.includes('pointer-events-none fixed'),
    'гадны хайрцаг `pointer-events-none` БИШ ✗ (даралт хулгайлна)');
});

t('②′ FLASH: СААРАЛ өнгө + `backdrop-blur` + `animate-draft-flash` pill', () => {
  assert.ok(FORM.includes('bg-gray-700/95'), 'саарал дэвсгэр (`bg-gray-700/95`) алга ✗');
  assert.ok(FORM.includes('backdrop-blur-sm'), '`backdrop-blur-sm` алга ✗');
  assert.ok(FORM.includes('animate-draft-flash'), '`animate-draft-flash` алга ✗');
  // ⚠️ Хуучин АМБЕР (шар) баннер бүрэн ХАСАГДСАН
  assert.equal(FORM.includes('bg-amber-50'), false, 'хуучин амбер баннер үлдсэн ✗');
});

t('②′ FLASH: `DRAFT_FLASH_MS` (=3200) таймер нь мэдэгдлийг DOM-оос УСТГАНА', () => {
  assert.ok(/const DRAFT_FLASH_MS = 3200;/.test(FORM), '`DRAFT_FLASH_MS = 3200` алга ✗');
  assert.ok(/setTimeout\(\(\) => setDraftNotice\(null\), DRAFT_FLASH_MS\)/.test(FORM),
    'авто-устгах таймер алга ✗');
  assert.ok(FORM.includes('}, [draftNotice]);'), 'таймерын effect dep (`[draftNotice]`) алга ✗');
});

t('②′ FLASH: `tailwind.config.js` — `draftFlash` keyframe + `draft-flash` 3.2s анимаци', () => {
  const TW = readSrc('tailwind.config.js');
  assert.ok(TW.includes('draftFlash:'), '`draftFlash` keyframe алга ✗');
  assert.ok(TW.includes("'draft-flash': 'draftFlash 3.2s ease forwards'"),
    '`draft-flash` анимаци (3.2s) алга ✗');
  // ⚠️ Анимаци ба JS таймер ИЖИЛ хугацаатай БАЙХ ЁСТОЙ (3.2s = 3200ms)
  assert.ok(TW.includes("'draft-flash': 'draftFlash 3.2s"),
    'анимацийн хугацаа 3.2s БИШ ✗');
});

// ────────────────────────────────────────────────────────────
// ③ 📄 DOC ГЭРЭЭ (`README.md`)
// ────────────────────────────────────────────────────────────
console.log('\n── ③ README — баримт ──');

const README = readSrc('README.md');

t('③ README: ноорог нь формоны хэсэгт тайлбарлагдсан (хэрэглэгчийн хүсэлт + механизм)', () => {
  const at = README.indexOf('НООРОГ');
  assert.ok(at > 0, 'README-д НООРОГ гэсэн хэсэг БАЙХГҮЙ');
  const block = README.slice(at - 400, at + 2500);
  assert.ok(block.includes('refresh'), 'refresh гэсэн тайлбар алга');
  assert.ok(block.includes('localStorage'), 'localStorage алга');
  assert.ok(block.includes('ноорог сэргээгдлээ'), 'мэдэгдлийн текст алга');
});

t('③ README: тестийн жагсаалтад `test:draft` ба шинэ CDP тоо (183/183) бичигдсэн', () => {
  assert.ok(README.includes('test:draft'));
  assert.ok(README.includes('183/183'));
});

console.log(`\n✅ Нийт ${passed} тест амжилттай — 📝 форм ноорог (refresh-ээс хамгаалалт) түгжигдэв\n`);

