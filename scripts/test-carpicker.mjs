// ============================================================
// test-carpicker.mjs — 🏷️🚙 «ҮЙЛДВЭРЛЭГЧ, ЗАГВАР» нь 📍 БАЙРШИЛ шиг
//                      ХАЙЛТТАЙ ПИКЕР (modal) болсон эсэх (2026-10-04 (35))
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (шууд):
//   «Автомашины хайлтын Үйлдвэрлэгч, Загварыг Байршил шиг хайдаг болгоод өг».
//
// 🆕 2026-10-04 (36) — «машины загвараас олоныг сонгох боломжтой болго»:
//   🚙 «Загвар» нь ОЛОН СОНГОЛТТОЙ болов (`filters.attrs.model` = МАССИВ,
//   URL `?attr_model=Prius 30,Harrier`, DB `or=(attrs->>model.ilike.%A%,…)`).
//   ⚠️ Талбарын төрөл (`type: 'text'` + `filterable`) ба `ilike %…%` гэрээ
//      ХӨНДӨГДӨӨГҮЙ — 1 загвар нь хуучин скаляр замтай ЯГ ижил query үүсгэнэ ✓
//   ⚠️ `chips` туг БАЙХГҮЙ: UI нь sidebar-ийн чип БИШ, энэ пикер л ✓
//
// ХАМРАХ ХҮРЭЭ:
//   ① `components/CarPicker.jsx` (🆕) — modal-ийн гэрээ: хайлтын талбар,
//      Үйлдвэрлэгч → Загвар КАСКАД, загвар нь CHECKBOX (олон), ноорог →
//      «Машиныг хэрэглэх», CDP дэгээнүүд
//   ② `components/HomeClient.jsx` — ЭХ ФАЙЛЫН ГЭРЭЭ: нэг товч
//      (`data-sidebar-car`) → `<CarPicker/>`; 🏷️/🚙 нь сайдбарын attr жагсаалтаас
//      ШҮҮГДЭНЭ (2 өөр UI БАЙХГҮЙ ✓); `applyCar` нь массивыг бичнэ
//   ③ `lib/locationData.js` / `lib/carModels.mjs` — РЕГРЕСС: `getAttrFilters('auto')`
//      нь `brand`/`model`-ыг ХЭВЭЭР буцаана; `model` нь `multi` (форм/URL/DB
//      нэг эх сурвалж — migration ШААРДЛАГАГҮЙ ✓); cascade нь массивыг шүүнэ
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Пикер нь `filters.attrs.brand` / `.model`-ыг бичдэг тул гэрээ 3 газарт
//   нэгэн зэрэг биелэх ёстой: (1) пикер ноорог дээр сольж, зөвхөн «хэрэглэх»
//   дээр `onApply` дуудна (2) брэнд солигдоход загварууд ЦЭВЭРЛЭГДЭНЭ
//   (3) сайдбарт ХОЁР дахь (хуучин) UI үлдэхгүй. Аль нэг нь зөрвөл хэрэглэгч
//   «Toyota» + «Prius 30» гэсэн зөрчсөн хос эсвэл 2 өөр сонголтын цонх харна ✗
//
// АЖИЛЛУУЛАХ:  npm run test:carpicker
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (`lib/carModels.mjs` нь импортгүй цэвэр,
//    `locationData.js` нь зөвхөн .mjs модулиудыг импортолдог ✓)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import { getAttrFilters, getAttrFields, CAR_BRANDS } from '../lib/locationData.js';
import { getCarModels, cascadeAttrs } from '../lib/carModels.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/** Комментгүй ЦЭВЭР КОД — «хасагдсан» гэсэн ТАЙЛБАР зүй ёсны тул шалгалтыг
 *  зөвхөн кодын мөрүүд дээр хийнэ (хуурамч улаан гарахгүй ✓) */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

console.log('\n🧪 Үйлдвэрлэгч, Загвар — Байршил шиг хайлттай пикер (CarPicker)\n');

// ---------- ① РЕГРЕСС: lib (форм/URL/DB-ийн эх сурвалж) ХӨНДӨӨГДӨӨГҮЙ ----------
t('getAttrFilters("auto") нь brand/model-ыг ХЭВЭЭР буцаана (URL/DB/форм хэвээр ✓)', () => {
  const keys = getAttrFilters('auto').map((f) => f.key);
  assert.deepEqual(keys, ['brand', 'model', 'color', 'year', 'importYear', 'transmission', 'fuel']);
});

t('🚙🌂 model нь `optionsFrom` + чөлөөт текст ХЭВЭЭР, гэхдээ `multi` (олон сонголт)', () => {
  const f = getAttrFields('auto').find((x) => x.key === 'model');
  assert.equal(f.optionsFrom, 'brand');
  // ⚠️ Талбарын ТӨРӨЛ ХӨНДӨГДӨӨГҮЙ — DB нь `ilike %…%` хэвээр ✓
  assert.equal(f.type, 'text');
  assert.equal(f.filterable, true);
  // 🆕 2026-10-04 (36): «машины загвараас олоныг сонгох боломжтой болго»
  assert.equal(f.multi, true);
  assert.equal(f.multiNoun, 'загвар');
  // ⛔ `chips` БАЙХГҮЙ — UI нь sidebar-ийн чип БИШ, энэ пикер л (2 UI байхгүй ✓)
  assert.ok(!f.chips, '🚙 model нь sidebar-ийн чип болжээ ✗');
});

t('🌈 getCarModels: «Toyota» → моделууд, сэлбэгийн брэнд («Bosch») → [] (чөлөөт текст ✓)', () => {
  assert.ok(getCarModels('Toyota').includes('Prius 30'));
  assert.deepEqual(getCarModels('Bosch'), []);
  assert.ok(CAR_BRANDS.includes('Toyota'), 'CAR_BRANDS-д Toyota байх ёстой ✗');
});

t('🔗 cascadeAttrs: МАССИВ загвар — өөр брэндийн загвар ХАСАГДАЖ, гараар бичсэн нь ҮЛДЭНЭ', () => {
  const fields = getAttrFields('auto');
  const prev = { brand: 'Toyota', model: ['Prius 30', 'Тосны шүүр'] };
  const next = cascadeAttrs({ ...prev, brand: 'Nissan' }, prev, 'brand', fields);
  // ⚠️ «Prius 30» (Toyota) нь Nissan-д БАЙХГҮЙ → хасагдана; гараар бичсэн
  //    «Тосны шүүр» нь жагсаалтад байгаагүй тул ХӨНДӨГДӨХГҮЙ ✓
  assert.deepEqual(next.model, ['Тосны шүүр']);
  // ⚠️ Бүх загвар хасагдавал талбар нь УСТАНА (`[]` үлдэхгүй — URL цэвэр ✓)
  const onlyForeign = { brand: 'Toyota', model: ['Prius 30'] };
  const cleared = cascadeAttrs({ ...onlyForeign, brand: 'Nissan' }, onlyForeign, 'brand', fields);
  assert.ok(!('model' in cleared), 'хоосон массив үлдэв ✗ (`?attr_model=` гарах байв)');
  // ⚠️ Хуучин скаляр утга ч ажиллана (линк/хуучин код эвдрэхгүй ✓)
  assert.equal(cascadeAttrs({ brand: 'Nissan', model: 'Prius 30' },
    { brand: 'Toyota', model: 'Prius 30' }, 'brand', fields).model, undefined);
});

// ---------- ② CarPicker.jsx — modal-ийн ГЭРЭЭ ----------
t('🏷️🚙 CarPicker.jsx: НЭГ ЭХ СУРВАЛЖ (CAR_BRANDS · getCarModels · attrMultiFilter) + `<select>` БАЙХГҮЙ', () => {
  const ui = codeOnly(readSrc('components/CarPicker.jsx'));
  assert.match(ui, /import \{ CAR_BRANDS \} from '\.\.\/lib\/locationData'/,
    'CAR_BRANDS-ийн импорт алга ✗');
  assert.match(ui, /import \{ getCarModels \} from '\.\.\/lib\/carModels\.mjs'/,
    'getCarModels-ийн импорт алга ✗');
  // 🆕 2026-10-04 (36): олон загварын дүрэм нь НЭГ ЭХ СУРВАЛЖ (модуль ✓)
  assert.match(ui,
    /import \{ parseAttrList, toggleAttrValue, attrListFilterLabel \} from '\.\.\/lib\/attrMultiFilter\.mjs'/,
    'attrMultiFilter-ийн импорт алга ✗');
  assert.ok(!/<select/.test(ui), 'пикер дотор хуучин `<select>` байх ёсгүй ✗');
});

t('🚙🌂 CarPicker.jsx: ЗАГВАР нь ОЛОН сонголттой (`toggleAttrValue` — checkbox мөр)', () => {
  const ui = codeOnly(readSrc('components/CarPicker.jsx'));
  // ⚠️ Төлөв нь МАССИВ — `parseAttrList` нь скаляр/`''`-г ч массив болгоно ✓
  assert.match(ui, /const \[draftModels, setDraftModels\] = useState\(\(\) => parseAttrList\(models\)\)/,
    '`draftModels` (массив) төлөв алга ✗');
  // ⚠️ Дарах бүрд нэмэх/хасах — checkbox (нэг утга солих БИШ) ✓
  assert.match(ui, /const pickModel = \(m\) => setDraftModels\(\(prev\) => toggleAttrValue\(prev, m\)\)/,
    '`pickModel` нь toggle биш ✗');
  assert.match(ui, /active=\{draftModels\.includes\(m\)\}/, '`active` нь массивтай харьцуулагдах ёстой ✗');
  assert.match(ui, /active=\{draftModels\.includes\(qtext\)\}/,
    'чөлөөт текстийн мөр ч toggle байх ёстой ✗');
  // ⚠️ Сонгосон утга БҮРД тусдаа чип (✕ нь зөвхөн тэрийг хасна ✓)
  assert.match(ui, /\{draftModels\.map\(\(m\) => \([\s\S]{0,120}?<Chip key=\{m\} label=\{m\} onRemove=\{\(\) => pickModel\(m\)\} \/>/,
    'загвар тус бүрийн чип алга ✗');
  // ⚠️ Мобайл (<640px) ч ижил дүрэм — тусдаа дэгээтэй ✓
  assert.match(ui, /modelRows\('data-mobile-car-model', 'data-mobile-car-model-free'\)/,
    'мобайл загварын мөрүүд алга ✗');
  // ⚠️ Жагсаалтгүй брэнд (сэлбэг) — чөлөөт текст ч массив руу бичнэ ✓
  assert.match(ui, /value=\{draftModels\.join\(', '\)\}/, 'чөлөөт текст оролт массивтай холбоогүй ✗');
});

t('🔍 CarPicker.jsx: ХАЙЛТЫН талбар (`#car-search`) ба каскад баганууд', () => {
  const ui = codeOnly(readSrc('components/CarPicker.jsx'));
  assert.match(ui, /id="car-search"/, 'хайлтын талбар алга ✗');
  assert.match(ui, /data-car-brand-filter/, '🏷️ Үйлдвэрлэгчийн баганын дэгээ алга ✗');
  assert.match(ui, /data-car-model-filter/, '🚙 Загварын баганын дэгээ алга ✗');
  assert.match(ui, /aria-label="Үйлдвэрлэгч"/, '`aria-label="Үйлдвэрлэгч"` бүлэг алга ✗');
  assert.match(ui, /aria-label="Загвар"/, '`aria-label="Загвар"` бүлэг алга ✗');
  // ⚠️ Загварын багана ЗӨВХӨН брэнд сонгосон үед (`draftBrand &&`)
  assert.match(ui, /\{draftBrand && \(/, 'загварын баганын нөхцөл (`draftBrand &&`) алга ✗');
  // ⚠️ Хайлт нь товчнуудыг бичсэн үсгээр шүүнэ (`match`)
  assert.match(ui, /const match = \(s\) => !ql \|\| String\(s\)\.toLowerCase\(\)\.includes\(ql\)/,
    'хайлтын шүүлт (`match`) алга ✗');
  // ⚠️ Олон сонголттой үед сонгосон ТОО харагдана (`data-car-model-count` — CDP ✓)
  assert.match(ui, /data-car-model-count=\{draftModels\.length\}/, 'сонгосон тооны дэгээ алга ✗');
});

t('🌈 CarPicker.jsx: брэнд солигдоход ЗАГВАРУУД ЦЭВЭРЛЭГДЭНЭ (`cascadeAttrs`-ийн дүрэм)', () => {
  const ui = codeOnly(readSrc('components/CarPicker.jsx'));
  assert.match(ui, /const pickBrand = \(b\) => \{[\s\S]*?setDraftModels\(\[\]\)/,
    'pickBrand дотор загвар цэвэрлэх мөр алга ✗');
  // 📱 Мобайлд ч мөн адил (`pickBrandMobile`)
  assert.match(ui, /const pickBrandMobile = \(b\) => \{[\s\S]*?setDraftModels\(\[\]\)/,
    'pickBrandMobile дотор загвар цэвэрлэх мөр алга ✗');
});

t('✅ CarPicker.jsx: ноорог ЗӨВХӨН «Машиныг хэрэглэх» дээр хэрэгжинэ (`onApply`)', () => {
  const ui = codeOnly(readSrc('components/CarPicker.jsx'));
  // 🚙 Загвар нь МАССИВ болж дамжина (`[]` = сонгоогүй ✓)
  assert.match(ui, /onApply\(\{ brand: draftBrand, model: draftModels \}\)/,
    'onApply (ноорог → хэрэглэх) алга ✗');
  assert.match(ui, /data-apply-car/, '«Машиныг хэрэглэх» товчны дэгээ алга ✗');
  assert.match(ui, /data-clear-car/, '«✕ Цэвэрлэх» товчны дэгээ алга ✗');
  assert.match(ui, /aria-label="Хаах"/, '✕ хаах товч алга ✗');
  assert.match(ui, /e\.key === 'Escape'/, 'ESC → хаах дүрэм алга ✗');
  assert.match(ui, /if \(!open\) return null/, '`open` биш үед render хийхгүй дүрэм алга ✗');
});

t('📱 CarPicker.jsx: мобайл (<640px) drill-down — `data-mobile-car` + нэг дэлгэцэд нэг шатлал', () => {
  const ui = codeOnly(readSrc('components/CarPicker.jsx'));
  assert.match(ui, /data-mobile-car\b/, 'мобайл блокийн дэгээ алга ✗');
  assert.match(ui, /mStep === 'brand'/, 'мобайл брэндийн алхам алга ✗');
  assert.match(ui, /mStep === 'model'/, 'мобайл загварын алхам алга ✗');
  // ⚠️ Багана нь МОБАЙЛД нуугдана (`hidden … sm:flex`) — DOM-д хэвээр (CDP ✓)
  assert.match(ui, /"mt-3 hidden gap-3 border-t border-gray-100 px-5 py-4 sm:flex"/,
    'каскад баганын `hidden … sm:flex` класс алга ✗');
});

t('✍️ CarPicker.jsx: жагсаалтгүй брэнд (сэлбэг/шинэ) → ЧӨЛӨӨТ ТЕКСТ (өмнөх зан төлөв ✓)', () => {
  const ui = codeOnly(readSrc('components/CarPicker.jsx'));
  // ⚠️ `modelOptions.length === 0` салбар нь 2 газар (🖥 багана + 📱 дэлгэц) байх ёстой
  //    (`modelOptions` = тухайн брэндийн загварууд; проп `models` нь СОНГОСОН ✓)
  const hits = ui.match(/modelOptions\.length === 0/g) || [];
  assert.ok(hits.length >= 2, `чөлөөт текст салбар 2 газар байх ёстой (олдсон: ${hits.length}) ✗`);
  assert.match(ui, /placeholder="Загвараа бичнэ үү"/, 'чөлөөт текст оролт алга ✗');
});


// ---------- ③ HomeClient.jsx — НЭГ ТОВЧ → пикер (2 өөр UI БАЙХГҮЙ) ----------
t('🧩 HomeClient.jsx: `CarPicker` импорт/хэрэглээ + `carOpen` төлөв', () => {
  const ui = codeOnly(readSrc('components/HomeClient.jsx'));
  assert.match(ui, /import CarPicker from '\.\/CarPicker'/, 'CarPicker-ийн импорт алга ✗');
  assert.match(ui, /const \[carOpen, setCarOpen\] = useState\(false\)/, '`carOpen` төлөв алга ✗');
  assert.match(ui, /<CarPicker[\s\S]*?open=\{carOpen\}[\s\S]*?onApply=\{applyCar\}/,
    '<CarPicker/> (open → onApply) хэрэглээ алга ✗');
});

t('🚗 HomeClient.jsx: сайдбарт НЭГ товч (`data-sidebar-car`) — зөвхөн `isAuto` үед', () => {
  const ui = codeOnly(readSrc('components/HomeClient.jsx'));
  assert.match(ui, /const isAuto = section === 'auto'/, '`isAuto` дүрэм алга ✗');
  assert.match(ui, /\{isAuto && \([\s\S]*?data-sidebar-car/, '`isAuto`-ийн доорх товч алга ✗');
  assert.match(ui, /onClick=\{\(\) => setCarOpen\(true\)\}/, 'товчны `onClick` алга ✗');
  // 📍 Байршлын товчтой ЯГ ИЖИЛ хэв (`aria-haspopup="dialog"`)
  assert.match(ui, /aria-haspopup="dialog"/, '`aria-haspopup="dialog"` алга ✗');
});

t('🗑 HomeClient.jsx: 🏷️ `brand` / 🚙 `model` нь сайдбарын attr ЖАГСААЛТААС шүүгдэнэ', () => {
  const ui = codeOnly(readSrc('components/HomeClient.jsx'));
  /**
   * 🆕 2026-10-04 (37) · 2026-10-05 (42) · 🆕 2026-10-06 (17): `filterBar: true`
   *    талбар (ОДОО зөвхөн 💻 📺/⚙️/🧠/💾) нь үр дүнгийн дээрх ХЭВТЭЭ мөр рүү
   *    шилжсэн — тэр мөрийн хасалт (`!f.filterBar`) ба 🆕 (17)-ийн
   *    «💳 Төлбөрийн нөхцөл-ийн дараах» хасалт (`!f.afterPayment`) хоёулаа
   *    brand/model-ыг шүүх мөрийнхөө ӨМНӨ байна (3 дараалсан `.filter` ✓).
   *    ⚠️ Хатуу жагсаалт (`FILTER_BAR_ATTR_KEYS`) БАЙХГҮЙ — туг нь
   *    `lib/locationData.js`-д (нэг эх сурвалж ✓)
   */
  assert.match(ui,
    /attrFilters\s*\.filter\(\(f\) => !f\.filterBar\)\s*\.filter\(\(f\) => !f\.afterPayment\)\s*\.filter\(\(f\) => !\(isAuto && \(f\.key === 'brand' \|\| f\.key === 'model'\)\)\)/,
    'attr жагсаалтаас brand/model-ыг шүүх мөр алга ✗');
  assert.ok(!/FILTER_BAR_ATTR_KEYS/.test(ui), 'хатуу жагсаалт (FILTER_BAR_ATTR_KEYS) буцаж орсон ✗');
});

t('✅ HomeClient.jsx: `applyCar` нь брэнд+загварыг НЭГ дор бичиж, хоосныг `delete` хийнэ', () => {
  const ui = codeOnly(readSrc('components/HomeClient.jsx'));
  assert.match(ui, /const applyCar = \(\{ brand, model \}\) => \{/, 'applyCar функц алга ✗');
  assert.match(ui, /if \(brand\) attrs\.brand = brand; else delete attrs\.brand;/,
    'brand бичих/устгах дүрэм алга ✗');
  // 🚙🌂 2026-10-04 (36): загвар нь МАССИВ — уртаар шалгана (`[]` нь truthy ✗)
  assert.match(ui, /const models = parseAttrList\(model\);/,
    '`model`-ыг массив болгох мөр алга ✗');
  assert.match(ui, /if \(models\.length\) attrs\.model = models; else delete attrs\.model;/,
    'model бичих/устгах дүрэм (уртаар) алга ✗');
  // 📄 шүүлт солигдсон → 1-р хуудас (байршлын пикертэй ИЖИЛ ✓)
  assert.match(ui, /const applyCar[\s\S]*?setPage\(1\)/, 'applyCar дотор `setPage(1)` алга ✗');
  // ⚠️ Пикерт МАССИВ дамжуулна (`models={carModels}`) ✓
  assert.match(ui, /<CarPicker[\s\S]*?models=\{carModels\}[\s\S]*?onApply=\{applyCar\}/,
    '`<CarPicker models={carModels}/>` алга ✗');
});

t('🏷️🌂 HomeClient.jsx: олон загварын шошго — 1 нь нэрээр, 2+ нь «N загвар» (товчилно)', () => {
  const ui = codeOnly(readSrc('components/HomeClient.jsx'));
  // ⚠️ Загвар нь массив → `attrArray('model')` (скаляр getter БИШ ✓)
  assert.match(ui, /const carModels = attrArray\('model'\)/, '`attrArray(\'model\')` алга ✗');
  assert.match(ui,
    /carModels\.length \? `\$\{carBrand\} \$\{attrListFilterLabel\(carModels, 'загвар'\)\}` : carBrand/,
    'товчилсон шошго (`attrListFilterLabel`) алга ✗');
  // ⚠️ Pill бас ТОВЧЛОСОН шошго + тооны дэгээ (CDP ✓)
  assert.match(ui, /data-car-pill="model"[\s\S]{0,120}?data-car-model-count=\{carModels\.length\}/,
    '🚙 pill-ийн тооны дэгээ алга ✗');
  assert.ok(!/carModel[^s]/.test(ui), 'хуучин скаляр `carModel` үлдэгдэл байна ✗');
});

t('🧹 HomeClient.jsx: «✕ Цэвэрлэх» нь `applyCar({ brand: "", model: [] })` дуудна', () => {
  const ui = codeOnly(readSrc('components/HomeClient.jsx'));
  assert.match(ui, /data-car-clear/, '«✕ Цэвэрлэх» товчны дэгээ алга ✗');
  // ⚠️ Хоослох утга нь `[]` (массив) — `''` биш (иначе `parseAttrList` тохирно ч
  //    «массив талбар = массив утга» гэсэн гэрээ нэг л хэлбэртэй байх ёстой ✓)
  assert.match(ui, /applyCar\(\{ brand: '', model: \[\] \}\)/,
    'цэвэрлэх нь applyCar-ыг `model: []`-тэй дуудах ёстой ✗');
  assert.match(ui, /data-car-pill="brand"/, '🏷️ брэндийн pill алга ✗');
  assert.match(ui, /data-car-pill="model"/, '🚙 загварын pill алга ✗');
});

// ---------- ④ Форм ХӨНДӨГДӨӨГҮЙ (зөвхөн ХАЙЛТ нь пикер болов) ----------
t('🖥 AddListingClient.jsx: форм дээр ⚙️ Үйлдвэрлэгч/Загвар ХӨНДӨӨГДӨӨГҮЙ (зөвхөн хайлт ✓)', () => {
  const ui = codeOnly(readSrc('components/AddListingClient.jsx'));
  // Форм нь хайлтын пикерийг ХЭРЭГЛЭХГҮЙ — өөрийн `SearchableSelect` хэвээр ✓
  assert.ok(!/CarPicker/.test(ui), 'форм дээр CarPicker орох ЁСГҮЙ (хайлт л өөрчлөгдөв) ✗');
  assert.match(ui, /<SearchableSelect/, 'формын combo (SearchableSelect) алга болсон ✗');
  assert.match(ui, /optionsFrom/, 'формын каскад (`optionsFrom`) алга болсон ✗');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);

