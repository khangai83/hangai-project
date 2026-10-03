// ============================================================
// test-wheel-render.mjs — 🎡 МОБАЙЛ ДУГУЙН (*ЖИНХЭНЭ* РЕНДЭР) ТЕСТ
//
// 🎯 ЯАГААД ЭНЭ ТЕСТ ВЭ: `scripts/test-number-choices.mjs` нь жагсаалтын
//    МАТЕМАТИК ба ГЭРЭЭ (эх кодын текст)-г шалгадаг ч `WheelPicker.jsx`-ийн
//    JSX-ээс ГАРАХ DOM-ыг шалгадаггүй байв ✗ ⇒ энэ тест нь компонентийг
//    `sucrase`-аар JSX → JS болгож, `react-dom/server`-ээр БОДИТООР
//    рендэрлэн, гарах HTML-ийг түгжинэ ✓ (браузер/нэвтрэлт ШААРДАХГҮЙ)
//
// ⚠️ ХЭРХЭН: ① `components/WheelPicker.jsx` уншина ② `sucrase.transform`
//    (jsx, automatic runtime) ③ импортуудыг `file://` абсолют зам болгож
//    солино (data: URL модуль дотор харьцангуй зам ажиллахгүй ✗)
//    ④ `renderToStaticMarkup` → HTML ⑤ инвариантуудыг шалгана
//
// ХАМРАХ ХҮРЭЭ (ЯГ юу түгжигдэх вэ):
//   ① `open={false}` → DOM-д ОГТ гарахгүй ('' буцаана ✓)
//   ② Мөрүүд: ТОО нь ЯГ `items.length`, ДАРААЛАЛ нь жагсаалтын дараалалтай
//      ижил (давхар: «—» + 1…150; он: 2026 → 1980 ✓)
//   ③ Мөр бүр `<button type="button" role="option">` — форм дотор submit
//      ХИЙХГҮЙ ✓ · зөвхөн НЭГ мөр `aria-selected="true"` ✓
//   ④ iOS Timer-ийн бүтэц: `snap-y snap-mandatory` + мөр бүр `snap-center`
//      + төвийн заагч (`data-wheel-marker`) ✓
//   ⑤ Гарчиг · «Болсон» товч · ард тал · `role="dialog"` + `aria-modal` ✓
//   ⑥ Нэгж (`'1 тагт'`) ба ХООСОН мөрийн тайлбар («—» = хоосон үлдээх) ✓
//
// АЖИЛЛУУЛАХ:  npm run test:wheel
// ⚠️ `sucrase`/`react-dom` олдохгүй бол SKIP (алдаа БИШ) — тест нь
//    зөвхөн байгаа хэрэгслээр ажиллана ✓
// 🔍 Хайх үг: test-wheel-render, renderToStaticMarkup, sucrase, data-wheel,
//    snap-y, aria-selected
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const SRC = path.join(ROOT, 'components', 'WheelPicker.jsx');
/** ⚠️ `sucrase`/`react-dom` нь CJS тул `require`-ээр найдвартай ачаална ✓ */
const req = createRequire(path.join(here, 'x.mjs'));

let passed = 0;
let failed = 0;
const t = (name, fn) => {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`  ✗ ${name}\n      → ${e.message}`);
  }
};

let renderToStaticMarkup;
let transform;
try {
  transform = req('sucrase').transform;
  renderToStaticMarkup = req('react-dom/server').renderToStaticMarkup;
} catch (e) {
  console.log(`\n⏭  SKIP: ${e.message}\n   (npm i sucrase react-dom → дараа нь дахин ажиллуулна)\n`);
  process.exit(0);
}

/**
 * 📦 Компонентийг data: URL модуль болгон ачаална.
 * ⚠️ `sucrase` (jsx → automatic runtime) нь `react/jsx-runtime`-ийг өөрөө
 *    импортолно; БҮХ импортыг `file://` болгосон тул data: модуль дотор
 *    харьцангуй зам/`node_modules` хайлт хийх шаардлагагүй ✓
 */
const loadComponent = async () => {
  const out = transform(fs.readFileSync(SRC, 'utf8'), {
    transforms: ['jsx'], jsxRuntime: 'automatic', production: true, filePath: SRC,
  }).code;
  const code = out.replace(/(from\s+)['"]([^'"]+)['"]/g, (m, pre, spec) => {
    const abs = spec.startsWith('.')
      ? path.resolve(path.dirname(SRC), spec)
      : req.resolve(spec);
    return `${pre}'${pathToFileURL(abs).href}'`;
  });
  const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  return mod.default;
};

const WheelPicker = await loadComponent();
const { countChoices, yearChoices, toChoiceItems, FLOOR_MAX, YEAR_FROM, YEAR_TO } =
  await import('../lib/numberChoices.mjs');

/** 🎡 Рендэрлэх (React 19 SSR — эффект ажиллахгүй, `active` = 0 ✓) */
const createElement = req('react').createElement;
const render = (props) => renderToStaticMarkup(createElement(WheelPicker, props));

/** Мөрүүдийн утгыг ДАРААЛАЛААР нь салгаж авна */
const valuesOf = (html) => [...html.matchAll(/data-wheel-value="([^"]*)"/g)].map((m) => m[1]);

console.log('\n🎡 Мобайл дугуй (`WheelPicker`) — жихүүн рендэрийн шалгалт\n');

const FLOOR_ITEMS = toChoiceItems(countChoices(1, FLOOR_MAX), { emptyLabel: '—' });
const openFloor = render({
  open: true,
  title: 'Барилгын нийт давхар',
  hint: 'Барилгад нийт хэдэн давхар вэ?',
  items: FLOOR_ITEMS,
  value: '5',
  onPick: () => {},
  onClose: () => {},
});

t('① `open={false}` → DOM-д ОГТ гарахгүй (хоосон мөр буцаана ✓)', () => {
  const html = render({ open: false, title: 'Барилгын нийт давхар', items: FLOOR_ITEMS, value: '5' });
  assert.equal(html, '', 'хаалттай үед ямар ч markup гарахгүй');
});

t('② Гарчиг · «Болсон» · ард тал · `role="dialog"` + `aria-modal` (iOS хуудасны бүтэц)', () => {
  assert.ok(openFloor.includes('data-wheel'), 'үндсэн блок');
  assert.ok(openFloor.includes('data-wheel-backdrop'), 'ард талыг дарахад хаагдана ✓');
  assert.match(openFloor, /data-wheel-title[^>]*>Барилгын нийт давхар</, 'талбарын нэр');
  assert.match(openFloor, /data-wheel-done[^>]*>Болсон</, 'хаах товч');
  assert.match(openFloor, /role="dialog"/, 'модаль');
  assert.match(openFloor, /aria-modal="true"/);
  assert.match(openFloor, /Барилгад нийт хэдэн давхар вэ\?/, '💡 чиглүүлэг');
});

t(`③ Мөрүүд: «—» + 1…${FLOOR_MAX} = ${FLOOR_MAX + 1} мөр, ДАРААЛАЛ нь өсөх (давхар ✓)`, () => {
  const vals = valuesOf(openFloor);
  assert.equal(vals.length, FLOOR_MAX + 1, 'мөрийн тоо');
  assert.equal(vals[0], '', 'эхний мөр нь ХООСОН («—») ✓');
  assert.deepEqual(vals.slice(1), countChoices(1, FLOOR_MAX), `1…${FLOOR_MAX} дарааллаараа ✓`);
});

t('④ Мөр бүр `<button type="button" role="option">` — форм submit ХИЙХГҮЙ ✓', () => {
  assert.equal((openFloor.match(/role="option"/g) || []).length, FLOOR_MAX + 1);
  assert.equal((openFloor.match(/<button(?![^>]*type="button")/g) || []).length, 0,
    'бүх товч `type="button"` (дугуйг гүйлгэхэд форм илгээгдэхгүй ✓)');
});

t('⑤ ЗӨВХӨН НЭГ мөр сонгогдсон (`aria-selected="true"`) — SSR дээр эхний мөр', () => {
  const n = (openFloor.match(/aria-selected="true"/g) || []).length;
  assert.equal(n, 1, `сонгосон мөр ${n} байна`);
  assert.match(openFloor, /aria-selected="true"[\s\S]{0,300}font-bold text-primary/, 'сонгосон мөр ТОД ✓');
});

t('⑥ iOS Timer-ийн мэдрэмж: `snap-y snap-mandatory` + мөр бүр `snap-center` + төвийн заагч', () => {
  assert.match(openFloor, /snap-y snap-mandatory/, 'гүйлгээ мөрөнд ЗОГСОНО ✓');
  assert.equal((openFloor.match(/snap-center/g) || []).length, FLOOR_MAX + 1, 'мөр бүр төв рүү тэмүүлнэ ✓');
  assert.match(openFloor, /data-wheel-marker/, 'төвийн заагч ✓');
  assert.match(openFloor, /data-wheel-scroll/, 'гүйлгэх хэсэг ✓');
  assert.match(openFloor, /overflow-y-scroll/, 'босоо гүйлгээ ✓');
  /** Дээд/доод зай (`ITEM_H * PAD` = 40 * 2 = 80px) — эхний/сүүлийн мөр ТӨВД хүрнэ ✓ */
  assert.equal((openFloor.match(/height:80px/g) || []).length, 2, 'хоёр үзүүрийн зай');
});

t('⑦ ХООСОН мөр байвал «—» = хоосон үлдээхийг хэлнэ (байхгүй бол ч БАЙХГҮЙ ✓)', () => {
  assert.match(openFloor, /«—» = хоосон үлдээх/);
  const noEmpty = render({ open: true, title: 'Он', items: toChoiceItems(yearChoices()), value: '2015' });
  assert.doesNotMatch(noEmpty, /хоосон үлдээх/);
});

t(`⑧ ОН — БУУРАХ эрэмбэ (${YEAR_TO} → ${YEAR_FROM}) ба чиглүүлэггүй ч ажиллана`, () => {
  const html = render({ open: true, title: 'Үйлдвэрлэсэн он', items: toChoiceItems(yearChoices()), value: '2015' });
  const vals = valuesOf(html);
  assert.equal(vals.length, YEAR_TO - YEAR_FROM + 1);
  assert.equal(vals[0], String(YEAR_TO), 'хамгийн ШИНЭ он эхэнд ✓');
  assert.equal(vals[vals.length - 1], String(YEAR_FROM), 'хамгийн ХУУЧИН он сүүлд ✓');
  assert.doesNotMatch(html, /form-hint/, 'чиглүүлэг өгөөгүй бол ГАРАХГҮЙ ✓');
});

t("⑨ Нэгж (`'1 тагт'`) нь мөрийн ШОШГО дээр, утга нь ЦЭВЭР тоо ✓", () => {
  const html = render({
    open: true, title: 'Тагт', items: toChoiceItems(['1', '2', '3'], { unit: 'тагт' }), value: '2',
  });
  assert.deepEqual(valuesOf(html), ['1', '2', '3'], 'утгууд нь форм/DB-д ЦЭВЭР очно ✓');
  assert.match(html, /data-wheel-value="1"[^>]*>\s*1 тагт\s*</, 'шошго нь «1 тагт» ✓');
});

t('⑩ Утга өгөөгүй/жагсаалт ХООСОН ч ЭВДРЭХГҮЙ (crash ✗, 0 мөр = 0 сонголт ✓)', () => {
  const html = render({ open: true, title: 'Давхар', items: [], value: '' });
  assert.ok(html.includes('data-wheel'), 'бүтэц хэвээр ✓');
  assert.equal(valuesOf(html).length, 0, 'мөр 0 ✓');
  assert.equal((html.match(/aria-selected="true"/g) || []).length, 0, 'мөр байхгүй бол сонголт ч БАЙХГҮЙ ✓');
  assert.doesNotMatch(html, /«—» = хоосон үлдээх/, 'хоосон мөрийн тайлбар гарахгүй ✓');
  assert.match(html, /Утгаа гүйлгээд төвд нь ирүүлнэ үү/, 'заавар нь хэвээр ✓');
});

console.log(
  failed
    ? `\n❌ ${failed} шалгалт УНАВ (${passed} ✓)\n`
    : `\n✅ Нийт ${passed} шалгалт амжилттай — дугуйны БОДИТ рендэр (SSR) түгжигдэв\n`,
);
process.exit(failed ? 1 : 0);
