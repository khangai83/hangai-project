// ============================================================
// seed-sections.mjs — ХЭСЭГ БҮР, ДЭД ТӨРӨЛ БҮРТ 10 ЖИШЭЭ ЗАР
//
// Ажиллуулах:  npm run seed:sections
//              npm run seed:sections -- 99112233   (өөр эзний нэр дээр)
//
// • 12 хэсэг × дэд төрөл бүр × 10 зар (unegui.mn шиг олон төрөл)
//   ⚠️ 2026-09-30 (5): 🛋️ «Тавилга» (`furniture`, 13) ба 🧳 «Аяны бараа»
//   (`travel`, 12) нь ТУСДАА 1-Р ТҮВШНИЙ хэсэг болов (хэрэглэгчийн хүсэлт:
//   «Тавилга болон Аяллын хэрэгсэл -ийг 1-р Category болго. Аяллын хэрэгсэл
//   -ийг Аяны бараа нэртэй болго») → 🧺 `home` (9) ба ⚽ `hobby` (6) болов
// • Хэсэг тус бүрд ТОХИРСОН талбарууд (`attrs` jsonb) —
//   авто: брэнд/загвар/он/гүйлт/хөдөлгүүр/түлш/өнгө (2026-10-01: 🔀 хөтлөгч
//   хасагдаж, 🔧 хөдөлгүүр нь сонголттой + 🎨 өнгө нэмэгдэв); ажил: компани/цалин/туршлага;
//   компьютер: CPU/RAM/SSD; бараа: брэнд/материал/хэмжээ;
//   үйлчилгээ: нэр/компани, хамрах хүрээ, туршлага, ажиллах цаг
//   (🗑 2026-10-05 (45): «Үйлчилгээний хэлбэр» (`workMode`) ба «Үнийн хэлбэр»
//    (`priceUnit`) нь форм/карт/дэлгэрэнгүйгээс ХАСАГДСАН тул демо зарт ч
//    ҮҮСЭХГҮЙ — 💼 ажлын зарын `company`/`position`-той ЯГ ИЖИЛ зарчим ✓);
//   ⚡ цахилгаан бараа: брэнд/загвар/хэмжээ (2026-09-30);
//   🛋️ тавилга: брэнд/загвар/материал/хэмжээ нь ДЭД ТӨРӨЛ тус бүрд
//   (`FURNITURE_SUBTYPE_PAIRS`/`FURNITURE_PRICE` — 2026-09-30 (5));
//   🧺 гэр ахуйн бараа: мөн адил (`HOME_SUBTYPE_PAIRS`/`HOME_PRICE` — 2026-09-30)
//   🧱 барилгын материал / 🏭 тоног төхөөрөмж: брэнд/загвар/хэмжээ нь ДЭД
//   ТӨРӨЛ тус бүрд (`CONSTRUCTION_*`/`EQUIPMENT_*` — 2026-09-30, 2 ШИНЭ хэсэг)
//   💼 ажлын зар: цалин нь ДЭД ТӨРӨЛ тус бүрд өөр (`JOB_SALARY` — 2026-09-30,
//   дэд төрөл 15 → **26** болов; ⚠️ 2026-10-03 (10)-д 🏢 компани / 💼 албан
//   тушаалын `JOB_SUBTYPE_PAIRS` хүснэгт УСТСАН — эдгээр талбар форм/карт/
//   дэлгэрэнгүйгээс хасагдсан тул демо зарт ч үүсэхгүй ✓)
//   ⚽ аялал, спорт, хобби: 6 дэд төрөл (`HOBBY_SUBTYPE_PAIRS`/`HOBBY_PRICE`/
//   `HOBBY_SIZE`) — ⚠️ 2026-09-30 (5)-д «Аяллын хэрэгсэл» (12) тусдаа хэсэг
//   (🧳 `travel`) болж, түүний материал нь `TRAVEL_*` болж САЛЛАА ✓
// • Үл хөдлөх нь ХУУЧИН 20 SVG зургийг ашиглана; бусад хэсэгт `images: []`
//   → карт нь ХЭСГИЙН ICON-ыг placeholder болгож харуулна (🚗 💼 💻 🛋️ 🧺 ⚡ 🧱 🏭 🧳 ⚽ 🛠️)
// • ⚠️ Дахин ажиллуулахад ДАВХАРДАХГҮЙ — зөвхөн `#demo-heseg10` тэмдэгтэй
//   мөрүүдийг устгаад дахин үүсгэнэ (хуучин `#demo-turul10`-ыг ХӨНДӨХГҮЙ)
// • ⚠️ 0016_listing_sections.sql ЗААВАЛ ажилласан байх ёстой
//   (`listings.section` ба `listings.attrs` багана)
// ============================================================
import { createRequire } from 'node:module';
import {
  SECTIONS, getSubtypes, CAR_BRANDS, CITIES, getDistricts, getKhoroos,
  COMPUTER_SUBTYPE_GROUPS,   // 💻 Notebook бүлгийн брэндүүд (2026-09-29)
  // 💻 2026-09-30 (6): Notebook-ийн 4 үзүүлэлт — форм дээрх СОНГОЛТУУД нь
  //    ЭНД ХАДГАЛАГДСАН демо утгуудтай ЯГ ИЖИЛ байх ЁСТОЙ (доорх шалгалт ✓)
  NOTEBOOK_BRANDS, PC_SPEC_SUBTYPES,
  NOTEBOOK_SCREEN_OPTIONS, NOTEBOOK_CPU_OPTIONS, NOTEBOOK_RAM_OPTIONS, NOTEBOOK_STORAGE_OPTIONS,
  // 🚗 2026-10-01: 🔧 «Хөдөлгүүр» + 🎨 «Өнгө» — демо утга нь форм дээрх
  //    СОНГОЛТУУДТАЙ ЯГ ИЖИЛ байх ёстой (доор `makeAttrs`-д эдгээрээс сонгоно ✓)
  ENGINE_OPTIONS, AUTO_COLOR_OPTIONS,
  FURNITURE_SUBTYPES,        // 🛋️ «Тавилга» хэсгийн 13 дэд төрөл (2026-09-30 (5))
} from '../lib/locationData.js';
// 🚗🌈 2026-10-01: 🏷️ «Үйлдвэрлэгч» → 🚙 «Загвар» — форм дээрх хайлттай жагсаалт
//    (`CAR_MODELS`) ба демо хосууд ЯГ ИЖИЛ байх ёстой (доорх fail-fast шалгалт ✓)
import { getCarModels } from '../lib/carModels.mjs';

const require = createRequire(import.meta.url);
const { getAdminClient, findUserByPhone } = require('../lib/authServer');

// ⚠️ 2026-10-04 (40): `export` — `scripts/seed-per-category.mjs` (3 зар/хэсэг) нь
//    энэ тэмдгийг мэдэж, өөрийн мөрүүдээ л устгах ёстой (бусад demo-г ХӨНДӨХГҮЙ) ✓
export const MARKER = '#demo-heseg10';
const PER_SUBTYPE = 10;
const DEMO_PHONE = process.argv[2] || '88093663';
const IMG_COUNT = 20; // public/uploads/property-N.svg

/**
 * `npm run seed:sections -- 88093663 --section=auto`
 * → ЗӨВХӨН авто хэсгийн демо зарыг шинэчилнэ (2026-09-28).
 * ⚠️ ЯАГААД: 12 хэсэг × дэд төрөл бүр × 10 ≈ 2500 зарыг дахин үүсгэх шаардлагагүй —
 *    шинэ дэд төрөл (ж: «Авто түрээслүүлнэ») эсвэл шинэ талбар (ж: 📥 орж
 *    ирсэн он) нэмэгдсэн хэсгээ л шинэчилнэ → хурдан ба бусад демо өгөгдөл
 *    ХӨНДӨГДӨХГҮЙ ✓
 */
const ONLY_SECTION = (process.argv.find((a) => a.startsWith('--section=')) || '').split('=')[1] || '';
if (ONLY_SECTION && !SECTIONS.some((s) => s.value === ONLY_SECTION)) {
  console.error(`❌ «${ONLY_SECTION}» гэсэн хэсэг байхгүй.`);
  console.error(`   Боломжтой: ${SECTIONS.map((s) => s.value).join(', ')}`);
  process.exit(1);
}
/** Шинэчлэх хэсгүүд (`--section=` байхгүй бол БҮГД) */
const ACTIVE_SECTIONS = ONLY_SECTION ? SECTIONS.filter((s) => s.value === ONLY_SECTION) : SECTIONS;

// ---- Туслах ------------------------------------------------------------
const rand = () => Math.random();
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
/** 100,000 ₮-ийн нарийвчлалтай үнэ */
const money = (a, b) => Math.max(100000, Math.round((a + rand() * (b - a)) / 100000) * 100000);

const NAMES = [
  'Бат-Эрдэнэ', 'Сүхбаатар', 'Ганбаатар', 'Энхбат', 'Мөнхбат', 'Оюунчимэг',
  'Тэмүүлэн', 'Билгүүн', 'Амартүвшин', 'Хонгорзул', 'Дэлгэрмаа', 'Чинбат',
  'Нарангэрэл', 'Уянга', 'Түвшинжаргал',
];

const ADDRESS_DETAILS = [
  '1-р байр', '2-р байр', '3-р байр', '4-р байр', '5-р байр',
  'Нарны зам', 'Энхтайвны өргөн чөлөө', 'Их тойруу', 'Баруун 4 зам',
  'Сөүлийн гудамж', 'Токиогийн гудамж', 'Партизаны гудамж',
];

/** Байршил (85% Улаанбаатар, үлдсэн нь аймаг) */
function makeLocation() {
  const city = rand() < 0.85 ? 'Улаанбаатар' : pick(CITIES);
  const districts = getDistricts(city);
  const district = districts.length ? pick(districts) : null;
  const khoroos = getKhoroos(city, district);
  const khoroo = khoroos.length ? pick(khoroos) : null;
  return {
    city,
    district,
    khoroo,
    address_detail: pick(ADDRESS_DETAILS),
    latitude: Number((47.85 + rand() * 0.12).toFixed(6)),
    longitude: Number((106.75 + rand() * 0.3).toFixed(6)),
  };
}

/** Зургууд — үл хөдлөхөд хуучин SVG-үүд, бусад хэсэгт ХООСОН (icon placeholder) */
function makeImages(section) {
  if (section !== 'real-estate') return [];
  const n = randInt(3, 5);
  const out = new Set();
  while (out.size < n) out.add(`/uploads/property-${randInt(1, IMG_COUNT)}.svg`);
  return [...out];
}

// ============================================================
// ХЭСЭГ ТУС БҮРИЙН ӨГӨГДӨЛ
// ============================================================

/** ⚠️ Реалист брэнд+загвар хосууд (санамсаргүй хослуулахаас дээр) */
const CAR_PAIRS = [
  ['Toyota', 'Prius 30'], ['Toyota', 'Prius 20'], ['Toyota', 'Harrier'],
  ['Toyota', 'Land Cruiser 200'], ['Toyota', 'Noah'], ['Toyota', 'Camry'],
  ['Toyota', 'Aqua'], ['Toyota', 'Highlander'], ['Toyota', 'Hilux'],
  ['Nissan', 'X-Trail'], ['Nissan', 'Skyline'], ['Nissan', 'Teana'],
  ['Nissan', 'Patrol'], ['Hyundai', 'Santa Fe'], ['Hyundai', 'Elantra'],
  ['Hyundai', 'Tucson'], ['Hyundai', 'Porter'], ['Kia', 'Sportage'],
  ['Kia', 'Sorento'], ['Kia', 'K5'], ['Kia', 'Carnival'], ['Lexus', 'RX 450'],
  ['Lexus', 'LX 570'], ['Lexus', 'IS 250'], ['Lexus', 'NX 300'],
  ['Honda', 'Fit'], ['Honda', 'CR-V'], ['Honda', 'Odyssey'], ['Mazda', 'CX-5'],
  ['Mazda', 'Atenza'], ['Mazda', 'Demio'], ['Mitsubishi', 'Outlander'],
  ['Mitsubishi', 'Pajero'], ['Subaru', 'Forester'], ['Subaru', 'Outback'],
  ['Subaru', 'Legacy'], ['BMW', 'X5'], ['BMW', '320i'], ['BMW', 'X3'],
  ['Mercedes-Benz', 'E 200'], ['Mercedes-Benz', 'G 400'], ['Mercedes-Benz', 'C 250'],
  ['Volkswagen', 'Tiguan'], ['Volkswagen', 'Passat'], ['Ford', 'Explorer'],
  ['Ford', 'Focus'], ['Chevrolet', 'Cruze'], ['Land Rover', 'Discovery'],
  ['Suzuki', 'Swift'], ['Suzuki', 'Vitara'], ['Isuzu', 'Elf'], ['JAC', 'T6'],
  ['BYD', 'Song Plus'], ['Tesla', 'Model 3'], ['Chery', 'Tiggo 7'],
  ['Haval', 'H6'], ['UAZ', 'Patriot'], ['Lada', 'Niva'], ['Genesis', 'G80'],
];

/** Компьютерийн брэнд+загвар — ЕРӨНХИЙ нөөц (дэд төрөл тус бүрийн хүснэгтэд
 *  байхгүй утгад, ж: 3 бүлэгт давхардсан «Бусад») */
const PC_PAIRS = [
  ['Logitech', 'MX Master 3'], ['Logitech', 'K380'], ['A4Tech', 'Bloody V7'],
  ['Razer', 'BlackWidow V3'], ['HyperX', 'Cloud II'], ['TP-Link', 'Archer C6'],
  ['Kingston', 'A2000 1TB'], ['Canon', 'PIXMA G3411'], ['Epson', 'L3250'],
  ['Samsung', 'Odyssey G5'], ['Dell', 'OptiPlex 7090'], ['Lenovo', 'ThinkPad T14'],
  ['Huawei', 'MateBook D15'], ['Xiaomi', 'RedmiBook 15'], ['Intel', 'Core i7-12700K'],
  ['AMD', 'Ryzen 7 5800X'], ['Sony', 'PlayStation 5'], ['Nintendo', 'Switch OLED'],
  ['Targus', 'TBB565'], ['Sony', 'WH-1000XM4'],
];

/** ⚠️ АЖЛЫН ЦАЛИН — дэд төрөл тус бүрийн САРЫН хязгаар (₮).
 *  ⚠️ ЯАГААД: бүх ажилд нэг хязгаар хэрэглэвэл «Гүйцэтгэх удирдлага 1 сая»
 *     ба «Туслах ажилчин 9 сая» гэж гарч БОДИТ байдалтай нийцэхгүй ✗ —
 *     🛋️ `HOME_PRICE`, ⚽ `HOBBY_PRICE`, 🧱/🏭-ийн ЯГ ИЖИЛ зарчим ✓
 *  ⚠️ «Цагийн ажил» (хагас цаг/ээлж) нь хамгийн бага хязгаартай ✓ */
const JOB_SALARY = {
  'Авто үйлчилгээ, засвар': [800e3, 4e6],
  'Аялал жуулчлал, зочид буудал': [900e3, 4e6],
  'Банк, санхүү, нябо, нярав': [1.2e6, 8e6],
  'Барилга, дэд бүтэц': [1e6, 9e6],
  'Боловсрол, шинжлэх ухаан': [1e6, 6e6],
  'Борлуулалт, худалдаа': [1e6, 7e6],
  'Гоо сайхан, фитнес, спорт': [900e3, 5e6],
  'Гүйцэтгэх удирдлага': [5e6, 35e6],
  'Дизайн, урлаг, уран сайхан': [900e3, 6e6],
  'Захиргаа, Хүний нөөц': [1.2e6, 7e6],
  'Маркетинг, PR менежмент': [1.5e6, 10e6],
  'МТ, харилцаа холбоо': [1.5e6, 12e6],
  'Менежер, төлөөлөгч': [1.5e6, 9e6],
  'Ресторан, кафе, паб': [800e3, 4e6],
  'Сэтгүүлч, редактор': [1e6, 6e6],
  'Тээвэр, гааль, агуулах': [900e3, 5e6],
  'Туслах ажилчин': [700e3, 2.5e6],
  'Уул уурхай': [1.5e6, 14e6],
  'Харуул хамгаалалт': [800e3, 3.5e6],
  'ХАА, Байгаль экологи': [700e3, 4e6],
  'Хууль, эрх зүй': [1.5e6, 12e6],
  'Эрүүл мэнд, эм зүй': [1.2e6, 10e6],
  'Үйлдвэрлэл': [900e3, 5e6],
  'Үйлчилгээ': [700e3, 3.5e6],
  'Цагийн ажил': [400e3, 2e6],
  'Хөгжлийн бэрхшээлтэй иргэн ажиллах боломжтой': [600e3, 3e6],
};
const JOB_SALARY_DEFAULT = [800e3, 6e6];

/** ⚠️ АВТОМАШИНЫ брэнд+загвар — ДЭД ТӨРӨЛ тус бүрд (BMW X5 нь «Трактор»
 *  дэд төрөлд орохгүй байхын тулд). */
const AUTO_SUBTYPE_PAIRS = {
  // ⚠️ 2026-09-27: «Седан» + «Хэтчбек» НЭГТГЭЖ «Суудлын машин» болов
  //    (хэрэглэгчийн хүсэлт). Загварууд нь суудлын машины төрлүүд:
  //    седан (Camry, K5…), хэтчбек (Aqua, Fit, Golf…).
  'Суудлын машин': [['Toyota', 'Camry'], ['Lexus', 'IS 250'], ['Hyundai', 'Elantra'], ['Kia', 'K5'], ['BMW', '320i'], ['Mercedes-Benz', 'E 200'], ['Mazda', 'Atenza'], ['Toyota', 'Prius 30'], ['Toyota', 'Aqua'], ['Honda', 'Fit'], ['Mazda', 'Demio'], ['Suzuki', 'Swift'], ['Volkswagen', 'Golf'], ['Toyota', 'Prius 20']],
  'Жийп, SUV': [['Toyota', 'Land Cruiser 200'], ['Lexus', 'LX 570'], ['Nissan', 'Patrol'], ['Mitsubishi', 'Pajero'], ['Land Rover', 'Discovery'], ['BMW', 'X5'], ['Subaru', 'Forester'], ['Haval', 'H6']],
  'Микроавтобус': [['Toyota', 'Hiace'], ['Hyundai', 'Starex'], ['Hyundai', 'H1'], ['Toyota', 'Regius'], ['Nissan', 'Caravan'], ['Ford', 'Transit']],
  'Ачааны машин': [['Isuzu', 'Elf 3.5т'], ['Shacman', 'X3000'], ['JAC', 'N 120'], ['Hyundai', 'Mighty'], ['ГАЗ', 'Газель'], ['Камаз', '65115']],
  'Автобус': [['Hyundai', 'County'], ['Isuzu', 'Journey'], ['Toyota', 'Coaster'], ['Higer', 'KLQ 6100'], ['Dongfeng', 'Экспресс']],
  'Мотоцикл': [['Honda', 'CBR 250'], ['Yamaha', 'R15'], ['Suzuki', 'Gixxer'], ['Kawasaki', 'Ninja 400'], ['Honda', 'Dio 35'], ['Yamaha', 'Nouvo']],
  'Трактор, хөдөө аж ахуй': [['YTO', 'MF 244'], ['John Deere', '5045E'], ['Беларус', '820'], ['MTZ', '892'], ['Zoomlion', 'RK 704'], ['Кировец', 'K-700']],
  // 🚗 2026-09-28 (хэрэглэгчийн хүсэлт): «Авто түрээслүүлнэ» — түрээслэхэд
  //    ТОХИРОМЖТОЙ (элэгдэл багатай, эрэлттэй) машид: Prius/Aqua (такси, цаг),
  //    Hiace/Starex (ачаа, аялал), Camry/Elantra (гэрээт, бизнес).
  'Авто түрээслүүлнэ': [['Toyota', 'Prius 30'], ['Toyota', 'Aqua'], ['Toyota', 'Camry'], ['Toyota', 'Hiace'], ['Hyundai', 'Starex'], ['Hyundai', 'Elantra'], ['Kia', 'K5'], ['Nissan', 'Teana'], ['Mitsubishi', 'Pajero'], ['Lexus', 'RX 450']],
  'Авто сэлбэг, хэрэгсэл': [['Toyota', 'Тосны шүүр'], ['Nissan', 'Тормозны колодко'], ['Bosch', 'Аккумулятор 60Ah'], ['Michelin', 'Дугуй 205/55 R16'], ['Osram', 'Гэрлийн чийдэн'], ['Icom', 'Радио']],
  'Бусад': [['Toyota', 'Prius 30'], ['Nissan', 'X-Trail'], ['Hyundai', 'Santa Fe'], ['Kia', 'Sportage'], ['Toyota', 'Harrier']],
};

/**
 * ⚠️ НЭГ ЭХ СУРВАЛЖ-ИЙН ШАЛГАЛТ (2026-10-01): 🚗 АВТО-ийн демо (брэнд, загвар)
 *    хосууд нь форм дээрх 🌈 «Брэнд → Загвар» ХАЙЛТТАЙ ЖАГСААЛТАД
 *    (`lib/carModels.mjs → CAR_MODELS`) БАЙХ ЁСТОЙ.
 *
 * ЯАГААД: брэнд сонгоод загвар нь жагсаалтад байхгүй бол хэрэглэгч засаж
 *    хадгалах үед утга нь «сонголтгүй» болж, өөр юм сонгоход хуучин утга
 *    АЛГА БОЛНО ✗ — алдааг чимээгүй өнгөрүүлэхгүй, ШУУД зогсооно ✓
 *    (дээрх 💻 Notebook-ийн `PC_*_POOL` шалгалттай ЯГ ИЖИЛ зарчим)
 *
 * ⚠️ «Авто сэлбэг, хэрэгсэл» дэд төрөл ХАСААГДАНА — тэнд «загвар» нь БАРААНЫ
 *    НЭР («Тосны шүүр», «Дугуй 205/55 R16») тул жагсаалтгүй, чөлөөт текст ✓
 * ⚠️ Жагсаалтгүй брэнд (ж: «Бусад») ч шалгагдахгүй — `getCarModels()` → `[]` ✓
 */
function assertAutoModels() {
  const bad = [];
  const check = (label, pairs) => {
    for (const [brand, model] of pairs) {
      const models = getCarModels(brand);
      if (models.length && !models.includes(model)) bad.push(`${label}: ${brand} → ${model}`);
    }
  };
  check('CAR_PAIRS', CAR_PAIRS);
  for (const [subtype, pairs] of Object.entries(AUTO_SUBTYPE_PAIRS)) {
    if (subtype === 'Авто сэлбэг, хэрэгсэл') continue;
    check(subtype, pairs);
  }
  if (bad.length) {
    console.error('❌ Авто демо (брэнд, загвар) нь `lib/carModels.mjs`-ийн CAR_MODELS-д БАЙХГҮЙ:');
    bad.forEach((b) => console.error(`   • ${b}`));
    console.error('   ⚠️ CAR_MODELS-той нийцүүлнэ үү (эс бөгөөс форм дээр сонгогдохгүй ✗).');
    process.exit(1);
  }
}
assertAutoModels();

/**
 * 🧳 «АЯНЫ БАРАА» — брэнд+загвар — ДЭД ТӨРӨЛ тус бүрд — 2026-09-30 (5).
 *
 * 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «…Аяллын хэрэгсэл -ийг Аяны бараа нэртэй болго»
 *    → ⚽ `hobby`-гийн «Аяллын хэрэгсэл» БҮЛЭГ (12 item) нь 🧳 `travel`
 *    ТУСДАА 1-Р ТҮВШНИЙ хэсэг болсон тул түүний материал энэ const-д САЛЛАА ✓
 *    (⚠️ `HOBBY_SUBTYPE_PAIRS`-ээс салгасан — доор нь 6 дэд төрлийн материал)
 *
 *  ⚠️ «Унадаг дугуйны тавиур» нь «Хөгжмийн зэмсэг» төрөлд орохгүй байхын
 *     тулд дэд төрөл тус бүрд ТОХИРСОН хосууд.
 *  ⚠️ Түлхүүр нь `lib/locationData.js` → `getSubtypes('travel')`-гийн 12
 *     утгатай ЯГ ИЖИЛ байх ЁСТОЙ (зурвас/том үсэг хүртэл) — ⚠️ таарахгүй бол
 *     `makeAttrs` нь `TRAVEL_SUBTYPE_PAIRS['Бусад']` (нөөц) руу шилжиж, зар
 *     өөр төрөлдөө тохирохгүй брэнд/загвартай гарна ✗
 *     (ажиллуулах үед `getSubtypes('travel')`-той тулгаж анхааруулга өгнө ✓)
 */
const TRAVEL_SUBTYPE_PAIRS = {
  // ---------- 🏕 Аяны бараа (12 — 2026-09-30 (5), 1-р түвшний хэсэг) ----------
  'Аяны гэрэл, power bank': [['Xiaomi', 'Power bank 20000 mAh'], ['Anker', 'PowerCore 26800'], ['Baseus', 'LED кемп гэрэл'], ['Nitecore', 'NU25 толгойн гэрэл'], ['Energizer', 'Кемп дэнлүү']],
  'Аяны хоолны хэрэгсэл': [['Jetboil', 'Flash 2.0'], ['Coleman', 'Хийгүй плита'], ['Trangia', '25-2 UL'], ['Primus', 'EtaPower Lite'], ['Sea to Summit', 'Эвхдэг аяга']],
  'Аяны ор гудас': [['Sea to Summit', 'Ultralight Insulated'], ['Therm-a-Rest', 'NeoAir XLite'], ['Klymit', 'Static V'], ['Naturehike', 'NH15Q гудас'], ['KingCamp', 'Өөрөө хийсэн гудас']],
  'Аяны ширээ сандал': [['Coleman', 'Хүснэгт 4 хүн'], ['Naturehike', 'NH21 сандал'], ['KingCamp', 'Эвхдэг сандал'], ['Outwell', 'Хүснэгт 6 хүн'], ['Kermit Chair', 'Модон сандал']],
  'Аяны цүнх, чемодан': [['Samsonite', 'Чемодан 65 см'], ['Deuter', 'Явган аяллын цүнх'], ['Osprey', 'Atmos 65'], ['American Tourister', 'Чемодан 55 см'], ['Tatonka', 'Барьцаа цүнх 60 л']],
  'Аяны цахилгаан хэрэгсэл': [['Goal Zero', 'Nomad 100'], ['Anker', 'Solar 21W'], ['EcoFlow', 'River 2'], ['Jackery', 'Explorer 300'], ['Xiaomi', 'Нарны цэнэглэгч 20 Вт']],
  'Бассейн, зөөврийн душ': [['Intex', 'Призмийн бассейн'], ['Bestway', 'Гүн бассейн 3×2 м'], ['Coleman', 'Зөөврийн душ'], ['Sunncamp', 'Халаагчтай душ'], ['Intex', 'Хүүхдийн бассейн']],
  'Завь ба дагалдах хэрэгсэл': [['Intex', 'Challenger 3'], ['Bestway', 'Каяак 2 хүн'], ['Aqua Marina', 'Сэлүүрт завь'], ['Sea Eagle', 'SUP самбар'], ['Coleman', 'Завьны хөдөлгүүр 4 морины хүчтэй']],
  'Майхан, сүүдрэвч': [['Naturehike', 'Cloud Up 2'], ['The North Face', 'Talus 2'], ['MSR', 'Elixir 3'], ['Kailas', 'Олон хүний майхан'], ['Coleman', 'Хүснэгтийн сүүдрэвч']],
  'Нүдний дуран, телескоп': [['Celestron', 'AstroMaster 130EQ'], ['Nikon', 'Action EX 10×50'], ['Bushnell', 'Trophy 8×42'], ['Sky-Watcher', 'BK 1149EQ1'], ['Спорт', 'Нүдний дуран 12×50']],
  'Уулын хэрэгсэл': [['Black Diamond', 'Trekking Pole'], ['Petzl', 'Actik Core'], ['Mammut', 'Уулын олс 30 м'], ['Grivel', 'Мөсөн сүх'], ['Salewa', 'Уулын шон']],
  'Бусад': [['Coleman', 'Аяны бараа иж бүрдэл'], ['Naturehike', 'Кемпийн бараа'], ['Xiaomi', 'Аяны гэрэл'], ['Anker', 'Кемпийн аксессуар'], ['KingCamp', 'Кемп хэрэгсэл']],
};

/**
 * ⚽ «АЯЛАЛ, СПОРТ, ХОББИ» — брэнд+загвар — 6 дэд төрөл — 2026-09-30 (5).
 *
 *  ⚠️ 2026-09-30 (5): «Аяллын хэрэгсэл» (12) нь 🧳 `travel` ТУСДАА ХЭСЭГ
 *     болж, «Аяны бараа» нэртэй болсны дараа энд ҮЛДСЭН 6 дэд төрөл —
 *     `TRAVEL_SUBTYPE_PAIRS`-аас САЛГАЖ бичив (хоёр хэсгийн материал
 *     холилдохгүй ✓; ⚠️ тэр нь 1-р түвшний хэсэг болсон)
 *  ⚠️ Түлхүүр нь `getSubtypes('hobby')`-гийн 6 утгатай ЯГ ИЖИЛ байх ЁСТОЙ —
 *     таарахгүй бол `makeAttrs` нь `HOBBY_PAIRS_FALLBACK` (нөөц) руу шилжинэ
 *  ⚠️ Эдгээр нь 2 дахь түвшин (доод түвшингүй) — 2026-09-30 (4/5)-ын шийдвэр ✓
 *     (2026-09-27-нд нэмэгдсэн анхны 6 дэд төрлийн нэрс ХЭВЭЭР ✓)
 */
const HOBBY_SUBTYPE_PAIRS = {
  // ---------- 🎣 Аялал, Спорт, Хобби — 6 дэд төрөл (2 дахь түвшин) ----------
  'Загас ан агнуур': [['Shimano', 'Catana 4000'], ['Daiwa', 'Crossfire LT'], ['Okuma', 'Ceymar'], ['Browning', 'BAR Mk3'], ['Simms', 'G4 Pro Boot'], ['Oros', 'Дуран 8×30']],
  'Ном, сонин, сэтгүүл': [['Oxford', 'Сурах бичиг 12-р анги'], ['Монгол ном', 'Түүхэн роман'], ['Эрдэм', 'Хүүхдийн үлгэр'], ['National Geographic', 'Сэтгүүл 2024'], ['Cambridge', 'IELTS сурах бичиг']],
  'Спортын хэрэгсэл': [['Spalding', 'Сагсан бөмбөг'], ['Star', 'Волейболын бөмбөг'], ['Tunturi', 'Фитнесс төхөөрөмж'], ['Wilson', 'Теннисний ракет'], ['Judo', 'Татами 2×2'], ['Nike', 'Гүйлтийн зам']],
  'Хөгжмийн зэмсэг': [['Yamaha', 'P-45 дижитал пиано'], ['Casio', 'CT-S300'], ['Fender', 'Squier Affinity'], ['Yamaha', 'F310 гитар'], ['Беларусь', 'Төгөлдөр хуур'], ['Pearl', 'Бөмбөр иж бүрэн']],
  'Цуглуулга': [['Монголбанк', 'Төгрөг 5000 (2013)'], ['Soviet', 'Мөнгөн зоос'], ['Чингис', 'Хөөрөгний даалин'], ['Улзы', 'Хүрэл цуглуулга'], ['Куба', 'Марк 1970']],
  'Унадаг дугуй, сэлбэг': [['Giant', 'ATX 720 27.5'], ['Trek', 'Marlin 6'], ['Cube', 'Aim SL 29'], ['Merida', 'Big Nine 100'], ['XDS', 'AD 350'], ['Shimano', 'Дериллек 8 sp']],
};

/**
 * ⚽ Аялал, Спорт, Хобби-гийн НӨӨЦ хос — «Бусад» энэ хэсэгт БАЙХГҮЙ болов
 *  (2026-09-30 (5)-д 🧳 `travel` рүү шилжсэн) тул таарахгүй түлхүүр гарвал
 *  энэ хос руу шилжинэ ✓ ⚠️ Ерөнхий утгатай (аль ч дэд төрөлд «Аксессуар»
 *  гэж гарахгүй) — (💻 `PC_PAIRS`-ийн нөөцтэй ижил зарчим)
 */
const HOBBY_PAIRS_FALLBACK = [
  ['Giant', 'Унадаг дугуй'], ['Shimano', 'Загасны хэрэгсэл'],
  ['Oxford', 'Ном, сэтгүүл'], ['Yamaha', 'Хөгжмийн зэмсэг'],
];

/**
 * 🧳 «Аяны бараа» — дэд төрөл тус бүрийн үнийн хязгаар (₮) — 2026-09-30 (5).
 *  ⚠️ 2026-09-30 (5): «Аяллын хэрэгсэл» (12) нь 🧳 `travel` ТУСДАА 1-Р ТҮВШНИЙ
 *     хэсэг болсон тул үнийн хүснэгт нь `HOBBY_PRICE`-аас САЛЛАА ✓
 *     түлхүүрүүд нь `getSubtypes('travel')`-гийн 12 утгатай ЯГ ИЖИЛ ✓
 *  ⚠️ Ном 200 сая, дугуй 20 мянга байх нь төөрөгдүүлнэ → төрөл тус бүрд.
 */
const TRAVEL_PRICE = {
  // ---------- 🏕 Аяны бараа (12 — 2026-09-30 (5)) ----------
  'Аяны гэрэл, power bank': [30e3, 900e3],
  'Аяны хоолны хэрэгсэл': [40e3, 1.2e6],
  'Аяны ор гудас': [50e3, 2.5e6],
  'Аяны ширээ сандал': [40e3, 1.5e6],
  'Аяны цүнх, чемодан': [50e3, 2e6],
  'Аяны цахилгаан хэрэгсэл': [60e3, 3e6],
  'Бассейн, зөөврийн душ': [80e3, 4e6],
  'Завь ба дагалдах хэрэгсэл': [150e3, 8e6],
  'Майхан, сүүдрэвч': [80e3, 3e6],
  'Нүдний дуран, телескоп': [100e3, 5e6],
  'Уулын хэрэгсэл': [40e3, 2e6],
  'Бусад': [50e3, 3e6],
};

/**
 * ⚽ «Аялал, Спорт, Хобби» — 6 дэд төрлийн үнийн хязгаар (₮) — 2026-09-30 (5).
 *  ⚠️ Түлхүүрүүд нь `getSubtypes('hobby')`-гийн 6 утгатай ЯГ ИЖИЛ ✓
 *  ⚠️ Тодорхойгүй бол `[50e3, 3e6]` (нөөц) ✓
 */
const HOBBY_PRICE = {
  // ---------- 🎣 Аялал, Спорт, Хобби — 6 дэд төрөл ----------
  'Загас ан агнуур': [30e3, 3e6],
  'Ном, сонин, сэтгүүл': [10e3, 250e3],
  'Спортын хэрэгсэл': [50e3, 4e6],
  'Хөгжмийн зэмсэг': [150e3, 8e6],
  'Цуглуулга': [100e3, 5e6],
  'Унадаг дугуй, сэлбэг': [150e3, 6e6],
};

/**
 * 🧳 Хэмжээ (`attrs.size`) — 🧳 «Аяны бараа» хэсгийн 12 дэд төрөл (2026-09-30 (5)).
 *    ⚠️ ЯАГААД: 2026-09-29 хүртэл `makeAttrs` нь зөвхөн 2 төрлийг тусад нь
 *    бодож, БУСАД нь `20-180×15-120 см` гэсэн САНАМСАРГҮЙ хэмжээ авдаг байв —
 *    «Power bank · 140×90 см» гэж гарах нь төөрөгдүүлнэ ✗
 *    (🧱 `CONSTRUCTION_SIZE`-тэй ЯГ ИЖИЛ загвар ✓)
 *    ⚠️ 2026-09-30 (5): «Аяллын хэрэгсэл» нь 🧳 `travel` тусдаа хэсэг болсон тул
 *    хэмжээний хүснэгт нь `HOBBY_SIZE`-аас САЛЛАА ✓
 */
const TRAVEL_SIZE = {
  // ---------- 🏕 Аяны бараа (12) ----------
  'Аяны гэрэл, power bank': ['10000 mAh', '20000 mAh', '26800 mAh', '500 люмен'],
  'Аяны хоолны хэрэгсэл': ['1 л', '2 хүн', '4 хүн', '1 багц'],
  'Аяны ор гудас': ['183×51 см', '198×63 см', 'R-утга 3.2', '2 хүн'],
  'Аяны ширээ сандал': ['4 хүн', '6 хүн', '60×40×40 см'],
  'Аяны цүнх, чемодан': ['40 л', '60 л', '65 см', '75 см'],
  'Аяны цахилгаан хэрэгсэл': ['21 Вт', '100 Вт', '300 Вт', '500 Вт'],
  'Бассейн, зөөврийн душ': ['1.8×1.8 м', '2×2 м', '3×2 м', '20 л'],
  'Завь ба дагалдах хэрэгсэл': ['2 хүн', '3 хүн', '4 хүн', '3.3 м'],
  'Майхан, сүүдрэвч': ['2 хүн', '3 хүн', '4 хүн', '6 хүн'],
  'Нүдний дуран, телескоп': ['8×42', '10×50', '12×50', '130 мм'],
  'Уулын хэрэгсэл': ['60 см', '110 см', '120 см', '30 м'],
  'Бусад': ['Стандарт хэмжээ', 'Иж бүрэн', '1 багц'],
};

/**
 * ⚽ Хэмжээ (`attrs.size`) — ⚽ «Аялал, Спорт, Хобби»-гийн 6 дэд төрөл
 *    (2026-09-30 (5): `TRAVEL_SIZE`-аас салгав ✓)
 */
const HOBBY_SIZE = {
  // ---------- 🎣 Аялал, Спорт, Хобби — 6 дэд төрөл ----------
  'Загас ан агнуур': ['1.8 м', '2.1 м', '2.4 м', '3000-ын дамар'],
  'Ном, сонин, сэтгүүл': ['Халаасны', 'A4', 'A5', 'Хатуу хавтастай'],
  'Спортын хэрэгсэл': ['Size 5', 'Size 4', '2×2 м', '1 багц'],
  'Хөгжмийн зэмсэг': ['61 товчлуур', '88 товчлуур', '4/4', '1 иж бүрэн'],
  'Цуглуулга': ['Халаасны', 'A4', '1 багц', 'Жижиг'],
  'Унадаг дугуй, сэлбэг': ['26 инч', '27.5 инч', '29 инч', 'S', 'M', 'L'],
};
const HOBBY_SIZE_DEFAULT = ['Стандарт хэмжээ', 'Иж бүрэн', '1 багц'];

/**
 * 💻 «Notebook» бүлгийн БРЭНД дэд төрлүүд (2026-09-29) — `lib/locationData.js`-ийн
 * `COMPUTER_SUBTYPE_GROUPS`-ээс АВТОМАТААР уншина (нэг эх сурвалж ✓).
 * ⚠️ Эдгээр дэд төрөлд `attrs.brand` нь дэд төрлийн нэртэй ЯГ ИЖИЛ байх ёстой
 *    (эс бөгөөс «Apple» төрөлд «Dell XPS» гэж гарч төөрөгдүүлнэ ✗)
 * ⚠️ 2026-09-30 (6): унших логик нь `lib/locationData.js` → `NOTEBOOK_BRANDS`
 *    болж ЗӨӨРӨВ (форм дээрх `PC_SPEC_SUBTYPES` ч мөн адил) — энд зөвхөн
 *    `Set` болгож хөрвүүлнэ ✓
 */
const PC_NOTEBOOK_BRANDS = new Set(NOTEBOOK_BRANDS);

/**
 * ⚠️ 💻 Notebook/суурин компьютер/серверт л `attrs.screen|cpu|ram|storage`
 *    үүснэ (2026-09-30 (6)) — формын `PC_SPEC_SUBTYPES`-тай ЯГ ИЖИЛ жагсаалт ✓
 *    (Mouse/Keyboard/тонер/тоглоом/чихэвч дээр эдгээр талбар форм дээр
 *     ХАРАГДАХГҮЙ болсон тул демо өгөгдөл ч үүсгэхгүй ✓)
 */
const PC_SPEC = new Set(PC_SPEC_SUBTYPES);

/**
 * 💻 Notebook-ийн демо утгууд — ⚠️ ЗОРИУДААР жигнэсэн (бодит зах зээлд
 * дийлэнх нь i5/i7, 16 GB, 512 GB байдаг тул тэр утгууд давтагдана ✓).
 *
 * ⚠️ Эдгээр утга нь форм дээрх СОНГОЛТЫН ЖАГСААЛТАД ЗААВАЛ байх ЁСТОЙ —
 *    эс бөгөөс зар нэмэх/засах үед утга нь «сонголтгүй» болж, хэрэглэгч
 *    өөрчилбөл хуучин утга алга болно ✗ (доорх шалгалт барьж, зогсооно ✓)
 */
const PC_SCREEN_POOL = ['12.5" - 13.3"', '14.0"', '14.0"', '15.6"', '15.6"', '15.6"', '16.0"', '17.3"'];
const PC_CPU_POOL = [
  'Intel Core i3', 'Intel Core i5', 'Intel Core i5', 'Intel Core i5', 'Intel Core i7',
  'Intel Core i7', 'Intel Core Ultra', 'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 5',
  'AMD Ryzen 7', 'AMD Ryzen AI', 'Apple M1', 'Apple M2', 'Apple M3', 'Apple M4 / M5',
  'Snapdragon X Plus / Elite',
];
const PC_RAM_POOL = ['4 GB', '8 GB', '8 GB', '16 GB', '16 GB', '16 GB', '32 GB', '64 GB'];
const PC_STORAGE_POOL = ['128 GB', '256 GB', '256 GB', '512 GB', '512 GB', '512 GB', '1 TB', '2 TB'];

/**
 * ⚠️ НЭГ ЭХ СУРВАЛЖ-ИЙН ШАЛГАЛТ (2026-09-30 (6)): демо pool-ийн утга бүр нь
 *    форм дээрх option жагсаалтад БАЙГАА эсэхийг seed эхлэхээс ӨМНӨ шалгана.
 * ЯАГААД: `lib/locationData.js`-д утга солигдоход (ж: «Apple M2» → «Apple M2 / M3»)
 *    seed нь форм дээр СОНГОГДОХГҮЙ демо зар үүсгэж, карт/шүүлт дээр
 *    зөрүүтэй харагдана ✗ — алдааг чимээгүй өнгөрүүлэхгүй, ШУУД зогсооно ✓
 */
for (const [name, pool, options] of [
  ['📺 screen', PC_SCREEN_POOL, NOTEBOOK_SCREEN_OPTIONS],
  ['⚙️ cpu', PC_CPU_POOL, NOTEBOOK_CPU_OPTIONS],
  ['🧠 ram', PC_RAM_POOL, NOTEBOOK_RAM_OPTIONS],
  ['💾 storage', PC_STORAGE_POOL, NOTEBOOK_STORAGE_OPTIONS],
]) {
  const missing = [...new Set(pool)].filter((v) => !options.includes(v));
  if (missing.length) {
    console.error(`❌ ${name}: форм дээрх сонголтод БАЙХГҮЙ демо утга → ${missing.join(' | ')}`);
    console.error('   ⚠️ `lib/locationData.js`-ийн NOTEBOOK_*_OPTIONS-той нийцүүлнэ үү.');
    process.exit(1);
  }
}

/** ⚠️ КОМПЬЮТЕРИЙН брэнд+загвар — ДЭД ТӨРӨЛ тус бүрд (2026-09-29: шинэ мод) */
const PC_SUBTYPE_PAIRS = {
  // ---------- 🖥 Суурин компьютер ----------
  'Иж бүрэн компьютер': [['Dell', 'OptiPlex 7090'], ['HP', 'ProDesk 400 G7'], ['Lenovo', 'ThinkCentre M70'], ['Acer', 'Aspire TC-1760'], ['Asus', 'ExpertCenter D500'], ['Apple', 'iMac 24'], ['Intel', 'NUC 12 Pro']],
  'Дэлгэц': [['Samsung', 'Odyssey G5 27"'], ['LG', 'UltraGear 27"'], ['Dell', 'P2419H 24"'], ['Acer', 'KG241 24"'], ['MSI', 'Optix G24'], ['Asus', 'VP249 24"'], ['BenQ', 'GW2480 24"']],
  'Процессор, сервер': [['Intel', 'Xeon E-2336'], ['AMD', 'EPYC 7302'], ['Dell', 'PowerEdge T40'], ['HP', 'ProLiant ML30'], ['Intel', 'Core i7-12700K'], ['AMD', 'Ryzen 7 5800X']],
  'Mouse': [['Logitech', 'MX Master 3S'], ['Logitech', 'G102 Lightsync'], ['A4Tech', 'Bloody V7'], ['Razer', 'DeathAdder V2'], ['Microsoft', 'Wireless 1850']],
  'Keyboard': [['Logitech', 'K380'], ['Razer', 'BlackWidow V3'], ['A4Tech', 'Bloody B120'], ['HyperX', 'Alloy Origins'], ['Apple', 'Magic Keyboard']],
  // ---------- 🏷 Notebook (брэнд бүр өөрийн загвартай) ----------
  'Apple': [['Apple', 'MacBook Pro 14'], ['Apple', 'MacBook Air M2'], ['Apple', 'MacBook Pro 16 M3']],
  'Acer': [['Acer', 'Aspire 5'], ['Acer', 'Nitro 5']],
  'Asus': [['Asus', 'VivoBook 15'], ['Asus', 'ROG Strix G15']],
  'Toshiba': [['Toshiba', 'Satellite C55'], ['Toshiba', 'Portégé X30']],
  'Compaq': [['Compaq', 'Presario CQ58'], ['Compaq', 'Presario V3000']],
  'Dell': [['Dell', 'XPS 15'], ['Dell', 'Latitude 5420'], ['Dell', 'Inspiron 3510']],
  'Dere': [['Dere', 'R14 Pro'], ['Dere', 'M15']],
  'Evoo': [['Evoo', 'EVOO 14"'], ['Evoo', 'EVOO 15.6"']],
  'Fujitsu': [['Fujitsu', 'LifeBook A357'], ['Fujitsu', 'LifeBook U938']],
  'Gateway': [['Gateway', 'GWNC21524'], ['Gateway', 'GWTN141-10']],
  'Haier': [['Haier', 'Y11B'], ['Haier', 'Laptop 15 Pro']],
  'HP': [['HP', 'Pavilion 15'], ['HP', 'EliteBook 840'], ['HP', 'ProBook 450']],
  'Lenovo': [['Lenovo', 'ThinkPad T14'], ['Lenovo', 'IdeaPad 3'], ['Lenovo', 'Legion 5']],
  'LG': [['LG', 'Gram 16'], ['LG', 'Ultra PC 15']],
  'Microsoft Surface': [['Microsoft', 'Surface Laptop 5'], ['Microsoft', 'Surface Pro 9']],
  'MSI': [['MSI', 'Katana GF66'], ['MSI', 'Modern 14']],
  'Samsung': [['Samsung', 'Galaxy Book2'], ['Samsung', 'Galaxy Book3 Pro']],
  'Sony': [['Sony', 'VAIO E Series'], ['Sony', 'VAIO Pro 13']],
  'Redmi': [['Redmi', 'RedmiBook 15'], ['Redmi', 'RedmiBook Pro 14']],
  'Razer Blade': [['Razer', 'Blade 15'], ['Razer', 'Blade 14']],
  'Huawei': [['Huawei', 'MateBook D15'], ['Huawei', 'MateBook X Pro']],
  // ---------- 🎮 PS, XBox, Nintendo ----------
  'Xbox': [['Microsoft', 'Xbox Series X'], ['Microsoft', 'Xbox Series S'], ['Microsoft', 'Xbox One S']],
  'Xbox-ын тоглоомууд': [['Microsoft', 'Halo Infinite'], ['Microsoft', 'Forza Horizon 5'], ['Microsoft', 'Gears 5'], ['Microsoft', 'EA FC 24']],
  'Playstation': [['Sony', 'PlayStation 5'], ['Sony', 'PlayStation 4 Pro'], ['Sony', 'PlayStation 4 Slim']],
  'Playstation-ийн тоглоомууд': [['Sony', 'The Last of Us Part II'], ['Sony', 'God of War Ragnarök'], ['Sony', 'Gran Turismo 7'], ['Sony', 'Spider-Man 2']],
  'Nintendo, Тоглоомууд': [['Nintendo', 'Switch OLED'], ['Nintendo', 'Switch Lite'], ['Nintendo', 'Mario Kart 8 Deluxe'], ['Nintendo', 'Zelda: Tears of the Kingdom']],
  'PS, XBox, Nintendo тоглоом суулгана': [['PlayStation', 'Тоглоом суулгах үйлчилгээ'], ['Xbox', 'Тоглоом суулгах үйлчилгээ'], ['Nintendo', 'Тоглоом суулгах үйлчилгээ']],
  // ---------- 🖱 Дагалдах хэрэгсэл ----------
  'Зөөврийн хард, флаш': [['Kingston', 'A2000 1TB'], ['Samsung', '980 PRO 500GB'], ['WD', 'Blue 2TB HDD'], ['Seagate', 'Barracuda 1TB'], ['SanDisk', 'Cruzer Blade 64GB'], ['Crucial', 'P3 1TB']],
  'Модем': [['TP-Link', 'Archer C6'], ['Mikrotik', 'hAP ac2'], ['D-Link', 'DIR-825'], ['Huawei', 'AX3 Pro'], ['ZTE', 'MF286R']],
  'Свич': [['TP-Link', 'TL-SG108'], ['D-Link', 'DGS-108'], ['Cisco', 'SG110-16'], ['Ubiquiti', 'UniFi Switch Lite 8']],
  'Проектор': [['Epson', 'EB-X06'], ['BenQ', 'MX560'], ['ViewSonic', 'PA503S'], ['Xiaomi', 'Mi Smart Projector 2']],
  'Тог баригч': [['Sony', 'DualSense'], ['Microsoft', 'Xbox Wireless Controller'], ['Nintendo', 'Switch Pro Controller'], ['Logitech', 'F710']],
  'Audio Video': [['Logitech', 'Z313'], ['HyperX', 'Cloud II'], ['JBL', 'Flip 6'], ['Sony', 'WH-CH510'], ['LG', 'Soundbar SN4']],
  'Notebook цүнх': [['Targus', 'TBB565'], ['HP', 'Prelude 15'], ['Xiaomi', 'Mi Business Backpack'], ['Dell', 'EcoLoop Pro']],
  // ---------- 🎧 Доод түвшингүй бүлгүүд (өөрсдөө дэд төрөл) ----------
  'Чихэвч': [['Apple', 'AirPods Pro 2'], ['Sony', 'WH-1000XM4'], ['HyperX', 'Cloud II'], ['Samsung', 'Galaxy Buds2'], ['JBL', 'Tune 510BT']],
  'Принтер, Хувилагч, Сканнер, Ламинатор': [['Canon', 'PIXMA G3411'], ['Epson', 'L3250'], ['HP', 'LaserJet M15'], ['Brother', 'DCP-T520W'], ['Fellowes', 'Lunar A3']],
  'iPad, Tablet, Kindle': [['Apple', 'iPad 10.9'], ['Samsung', 'Galaxy Tab A8'], ['Xiaomi', 'Pad 6'], ['Amazon', 'Kindle Paperwhite'], ['Huawei', 'MatePad 11']],
  'Принтер, Хувилагчийн хор': [['Canon', 'GI-490'], ['Epson', '003'], ['HP', '415A'], ['Brother', 'TN-1075'], ['Canon', 'Cartridge 725']],
  'Бусад сэлбэг': [['Intel', 'Core i5-12400F'], ['AMD', 'Ryzen 5 5600'], ['Asus', 'Prime B660M'], ['MSI', 'B550 Tomahawk'], ['Kingston', 'Fury 16GB DDR4'], ['AeroCool', 'VX Plus 500W']],
  // ⚠️ «Бусад» нь 3 бүлэгт давхардсан НЭГ утга (Notebook · PS/XBox/Nintendo ·
  //    Дагалдах хэрэгсэл) → аль ч тохиолдолд ерөнхий нөөцөөс авна ✓
  'Бусад': PC_PAIRS,
};

/** 💻 Компьютерийн дэд төрөл тус бүрийн үнийн хязгаар (₮) — 2026-09-29.
 *  ⚠️ Хулгана 12 сая, ноутбук 250 мянга байх нь төөрөгдүүлнэ → төрөл тус бүрд
 *     (🚗 авто, ⚽ хобби-той ижил зарчим). Тодорхойгүй бол `PC_PRICE_DEFAULT`
 *     — Notebook брэндүүд ба «Бусад» (ноутбукийн үнэ) ✓ */
const PC_PRICE = {
  'Иж бүрэн компьютер': [1.5e6, 12e6],
  'Дэлгэц': [350e3, 3.5e6],
  'Процессор, сервер': [1.2e6, 15e6],
  'Mouse': [30e3, 400e3],
  'Keyboard': [50e3, 600e3],
  'Xbox': [800e3, 3e6],
  'Xbox-ын тоглоомууд': [80e3, 350e3],
  'Playstation': [1e6, 3.5e6],
  'Playstation-ийн тоглоомууд': [80e3, 400e3],
  'Nintendo, Тоглоомууд': [90e3, 500e3],
  'PS, XBox, Nintendo тоглоом суулгана': [20e3, 150e3],
  'Зөөврийн хард, флаш': [40e3, 1.2e6],
  'Модем': [80e3, 1.2e6],
  'Свич': [150e3, 2.5e6],
  'Проектор': [700e3, 6e6],
  'Тог баригч': [120e3, 700e3],
  'Audio Video': [60e3, 3e6],
  'Notebook цүнх': [40e3, 400e3],
  'Чихэвч': [60e3, 1.5e6],
  'Принтер, Хувилагч, Сканнер, Ламинатор': [400e3, 6e6],
  'Принтер, Хувилагчийн хор': [40e3, 300e3],
  'iPad, Tablet, Kindle': [300e3, 4e6],
  'Бусад сэлбэг': [80e3, 2e6],
};
const PC_PRICE_DEFAULT = [1.2e6, 12e6];

/**
 * ⚡ «ЦАХИЛГААН БАРАА» — брэнд+загвар — ДЭД ТӨРӨЛ тус бүрд (2026-09-30).
 *
 * ⚠️ ЯАГААД дэд төрөл тус бүрд: «Телевизор (65 инч)» төрөлд «Кофе чанагч»
 *    гарах нь төөрөгдүүлнэ ✗ (💻 компьютерийн `PC_SUBTYPE_PAIRS`-тай ижил
 *    зарчим).
 * ⚠️ Түлхүүр нь `ELECTRIC_SUBTYPE_GROUPS`-ийн доод item-ийн нэртэй ЯГ ИЖИЛ
 *    байх ЁСТОЙ (зурвас/том үсэг хүртэл) — «Бусад» нь нэг утга (2 бүлэгт
 *    давхардсан тул ⚠️ 2 удаа бичих шаардлагагүй, 1 л түлхүүр).
 */
const ELECTRIC_SUBTYPE_PAIRS = {
  // ---------- 📺 ТВ, Аудио + Видео ----------
  'Телевизор (55 ба доош инч)': [['Samsung', 'UE43AU7100'], ['LG', '43UP7500'], ['Xiaomi', 'Mi TV P1 43'], ['Sony', 'KD-43X75K'], ['TCL', '43P615']],
  'Телевизор (65 инч)': [['Samsung', 'QE65Q60B'], ['LG', '65NANO75'], ['Sony', 'KD-65X80K'], ['Hisense', '65A6K'], ['Xiaomi', 'TV Q2 65']],
  'Телевизор (75 ба дээш инч)': [['Samsung', 'QE75Q70C'], ['LG', '75UR7800'], ['Sony', 'KD-85X85K'], ['TCL', '75C645'], ['Hisense', '75U7K']],
  'Аудио төхөөрөмж, Өсгөгч': [['Yamaha', 'R-S202'], ['Denon', 'AVR-X550BT'], ['Sony', 'STR-DH190'], ['Pioneer', 'VSX-534'], ['JBL', 'Bar 500']],
  'Пянз, кассет тоглуулагч': [['Sony', 'PS-LX310BT'], ['Audio-Technica', 'AT-LP60X'], ['Panasonic', 'RX-D55'], ['Pioneer', 'PL-990']],
  'Хөгжим, Home theater, Караоке': [['Samsung', 'HW-Q600C'], ['Sony', 'HT-S40R'], ['LG', 'SN5Y'], ['JBL', 'PartyBox 310'], ['Yamaha', 'YHT-4950']],
  // ---------- 🍳 Гал тогооны цахилгаан бараа ----------
  'Плитка, микро печь, хиншүү сорогч': [['Bosch', 'PKE645BA1'], ['Samsung', 'ME83KRW'], ['LG', 'MC2846BG'], ['Faber', 'Casa 90'], ['Midea', 'MEC25']],
  'Ус цэвэршүүлэгч': [['AO Smith', 'A1-600'], ['Ecowell', 'EC-105'], ['Aquaphor', 'DWM-101S'], ['Midea', 'MRO1782']],
  'Шарагч': [['Tefal', 'OptiGrill'], ['Philips', 'HD9860'], ['Bosch', 'TAT8611'], ['Midea', 'Электр шарагч']],
  'Миксер, шүүс шахагч': [['Bosch', 'MFQ4030'], ['Kenwood', 'KMX750'], ['Tefal', 'Ultrablend'], ['Philips', 'HR1832'], ['Philips', 'HR3571']],
  'Кофе чанагч': [['Delonghi', 'Magnifica S'], ['Philips', 'HD7462'], ['Nespresso', 'Vertuo Pop'], ['Beko', 'CFM6852']],
  'Будаа агшаагч, талх баригч': [['Tefal', 'RK3001'], ['Panasonic', 'SR-ZX185'], ['Xiaomi', 'Mi Smart Rice Cooker'], ['Moulinex', 'OW6101']],
  'Аяга таваг угаагч машин': [['Bosch', 'SMS46MI03E'], ['Midea', 'MCFD-0606'], ['Beko', 'DVS05024S'], ['Hansa', 'ZWM616']],
  // ---------- 📷 Дижитал аппарат, Видео камер ----------
  'Дижитал аппарат': [['Canon', 'EOS 250D'], ['Nikon', 'D3500'], ['Sony', 'Alpha A6400'], ['Fujifilm', 'X-T30 II'], ['Panasonic', 'Lumix G7']],
  'Видео камер': [['Sony', 'HDR-CX405'], ['Canon', 'XA11'], ['Panasonic', 'HC-V800'], ['GoPro', 'HERO 12']],
  'Дрон, дроны хэрэгсэл': [['DJI', 'Mini 4 Pro'], ['DJI', 'Mavic 3'], ['Autel', 'EVO Nano+'], ['DJI', 'Air 3']],
  'Дагалдах хэрэгсэл': [['Manfrotto', 'Compact Action'], ['SanDisk', 'Extreme Pro 128GB'], ['Godox', 'TT520 II'], ['Peak Design', 'Everyday Sling']],
  'Дуран': [['Nikon', 'Monarch 5 10x42'], ['Bushnell', 'Legend'], ['Celestron', 'SkyMaster 15x70'], ['Canon', '10x30 IS']],
  'Хальсан зургийн аппарат': [['Canon', 'AE-1'], ['Nikon', 'FM2'], ['Zenit', 'ET'], ['Pentax', 'K1000']],
  'Фото гэрэлтүүлэг': [['Godox', 'SL-60W'], ['Neewer', '660 LED'], ['Aputure', 'Amaran 100D'], ['Phottix', 'Softbox 60×90']],
  // ---------- 🧊 Доод түвшингүй бүлгүүд (өөрсдөө дэд төрөл) ----------
  'Хөргөгч, хөлдөөгч': [['Samsung', 'RT32K'], ['LG', 'GC-B459'], ['Bosch', 'KGN39'], ['Hisense', 'RB390'], ['Beko', 'RCNK321']],
  'Угаалгын машин': [['LG', 'F2V5HS6W'], ['Samsung', 'WW70T'], ['Bosch', 'WGA142X'], ['Electrolux', 'EW6F'], ['Candy', 'CSOW4']],
  'Тоос сорогч, Хивс угаагч': [['Dyson', 'V12'], ['Xiaomi', 'Mi Vacuum G10'], ['Bosch', 'BWD41720'], ['Philips', 'PowerPro'], ['Kirby', 'Sentria']],
  'Агаар шүүгч': [['Xiaomi', 'Mi Air Purifier 4'], ['Philips', 'AC2887'], ['Sharp', 'FP-J30'], ['Coway', 'AP-1019C']],
  'ТЭН, Халаагуур': [['Delonghi', 'TRRS 0715'], ['Xiaomi', 'Mi Smart Heater'], ['Scarlett', 'SC-1150'], ['Bork', 'V500']],
  // ⚠️ «Бусад» нь 2 бүлэгт давхардсан НЭГ утга (ТВ · Гал тогоо) → ерөнхий нөөц
  'Бусад': [['Xiaomi', 'Mi Box S'], ['Dune', 'HD Base 3.0'], ['Bork', 'Нэмэлт төхөөрөмж'], ['Zojirushi', 'Термос']],
};

/** ⚡ Цахилгаан барааны дэд төрөл тус бүрийн үнийн хязгаар (₮) — 2026-09-30.
 *  ⚠️ Микро печь 8 сая, ТВ 50 мянга байх нь төөрөгдүүлнэ → төрөл тус бүрд
 *     (🚗 авто, 💻 компьютер, ⚽ хобби-той ижил зарчим).
 *  ⚠️ Тодорхойгүй бол `ELECTRIC_PRICE_DEFAULT` (ерөнхий барааны үнэ) ✓ */
const ELECTRIC_PRICE = {
  'Телевизор (55 ба доош инч)': [500e3, 2.5e6],
  'Телевизор (65 инч)': [1.2e6, 4.5e6],
  'Телевизор (75 ба дээш инч)': [2.5e6, 9e6],
  'Аудио төхөөрөмж, Өсгөгч': [250e3, 4e6],
  'Пянз, кассет тоглуулагч': [150e3, 2.5e6],
  'Хөгжим, Home theater, Караоке': [300e3, 5e6],
  'Плитка, микро печь, хиншүү сорогч': [250e3, 3e6],
  'Ус цэвэршүүлэгч': [300e3, 3.5e6],
  'Шарагч': [80e3, 800e3],
  'Миксер, шүүс шахагч': [60e3, 900e3],
  'Кофе чанагч': [80e3, 2e6],
  'Будаа агшаагч, талх баригч': [60e3, 700e3],
  'Аяга таваг угаагч машин': [700e3, 3.5e6],
  'Дижитал аппарат': [500e3, 6e6],
  'Видео камер': [400e3, 5e6],
  'Дрон, дроны хэрэгсэл': [600e3, 8e6],
  'Дагалдах хэрэгсэл': [30e3, 800e3],
  'Дуран': [100e3, 2.5e6],
  'Хальсан зургийн аппарат': [150e3, 1.5e6],
  'Фото гэрэлтүүлэг': [150e3, 2.5e6],
  'Хөргөгч, хөлдөөгч': [800e3, 6e6],
  'Угаалгын машин': [700e3, 5e6],
  'Тоос сорогч, Хивс угаагч': [150e3, 3e6],
  'Агаар шүүгч': [250e3, 2.5e6],
  'ТЭН, Халаагуур': [50e3, 1.5e6],
};
const ELECTRIC_PRICE_DEFAULT = [50e3, 2e6];

/**
 * 🛋️ «ГЭР АХУЙН БАРАА» — брэнд+загвар — ДЭД ТӨРӨЛ тус бүрд (2026-09-30).
 *
 * ⚠️ ЯАГААД дэд төрөл тус бүрд: «Буйдан, кресло» төрөлд «Кофе чанагч» гарах
 *    нь төөрөгдүүлнэ ✗ (⚡ `ELECTRIC_SUBTYPE_PAIRS`, 💻 `PC_SUBTYPE_PAIRS`-тай
 *    ижил зарчим).
 * ⚠️ Түлхүүр нь `FURNITURE_SUBTYPES` (13)-ийн нэртэй ЯГ ИЖИЛ байх ЁСТОЙ
 *    (зурвас/том үсэг хүртэл) — ⚠️ таарахгүй бол `makeAttrs` нь
 *    `FURNITURE_SUBTYPE_PAIRS['Бусад']` (нөөц) руу шилжинэ.
 * 🆕 2026-09-30 (5): «Тавилга» нь 🛋️ `furniture` ТУСДАА 1-Р ТҮВШНИЙ хэсэг
 *    болсон тул материал нь `HOME_SUBTYPE_PAIRS`-аас САЛЛАА ✓ (доор нь 🧺 home)
 */
const FURNITURE_SUBTYPE_PAIRS = {
  // ---------- 🛋️ Тавилга (13 — 2026-09-30 (5), 1-р түвшний хэсэг) ----------
  'Зочны өрөөний': [['IKEA', 'EKTORP буйдан'], ['IKEA', 'KIVIK буйдан'], ['IKEA', 'VIMLE булан'], ['Home Plaza', 'Зочны өрөөний иж бүрдэл']],
  'Унтлагын өрөөний': [['IKEA', 'MALM ор'], ['IKEA', 'HEMNES унтлагын иж бүрдэл'], ['Буман', 'Унтлагын өрөөний иж бүрдэл']],
  'Гал тогооны': [['IKEA', 'METOD гал тогоо'], ['Буман', 'Гал тогооны иж бүрдэл'], ['Home Plaza', 'Гал тогооны шүүгээ']],
  'Үүдний өрөөний': [['IKEA', 'HEMNES үүдний шкаф'], ['IKEA', 'STÄLL гутал хадгалагч'], ['Jysk', 'Үүдний иж бүрдэл']],
  'Оффисын тавилга': [['IKEA', 'BEKANT ширээ'], ['IKEA', 'MARKUS сандал'], ['Хан-Уул Мебель', 'Оффисын иж бүрдэл']],
  'Буйдан, кресло': [['IKEA', 'EKTORP буйдан'], ['IKEA', 'KIVIK буйдан'], ['IKEA', 'POÄNG кресло'], ['Home Plaza', 'Арьсан буйдан']],
  'Ор, матрас': [['IKEA', 'MALM ор'], ['IKEA', 'SAGSTUA ор'], ['Hilding', 'Comfort матрас'], ['Magniflex', 'Merino матрас']],
  'Шкаф, комод, авдар': [['IKEA', 'PAX шкаф'], ['IKEA', 'MALM комод'], ['Буман', 'Хувцасны шкаф']],
  'Ширээ, сандал': [['IKEA', 'LINNMON ширээ'], ['IKEA', 'JOKKMOKK иж бүрдэл'], ['Хан-Уул Мебель', 'Хоолны ширээ']],
  'Тавиур, полк': [['IKEA', 'BILLY тавиур'], ['IKEA', 'KALLAX полк'], ['Jysk', 'Модон тавиур']],
  'Толь': [['IKEA', 'NISSEDAL толь'], ['IKEA', 'HEMNES толь'], ['Home Plaza', 'Хувцасны толь']],
  'Сейф': [['Safewell', 'SW-40'], ['Aiko', 'AS-50'], ['Ferrimax', 'Fireguard 30'], ['Valberg', 'SB-35']],
  // ⚠️ «Бусад» нь ЗӨВХӨН «Тавилга» хэсэгт (хэрэглэгчийн 13 дахь мөр) —
  //    🧺 `home`-д «Бусад» БАЙХГҮЙ тул тэнд `HOME_PAIRS_FALLBACK` нөөц болно ✓
  'Бусад': [['IKEA', 'Гэрийн бараа'], ['Home Plaza', 'Төрөл бүрийн бараа'], ['Jysk', 'Гэрийн бараа']],
};

/**
 * 🧺 «ГЭР АХУЙН БАРАА» — брэнд+загвар — 9 дэд төрөл — 2026-09-30 (5).
 *
 *  ⚠️ «Тавилга» (13) нь 🛋️ `furniture` ТУСДАА хэсэг болсны дараа энд ҮЛДСЭН
 *     9 дэд төрөл — `FURNITURE_SUBTYPE_PAIRS`-аас САЛГАЖ бичив ✓
 *  ⚠️ Түлхүүр нь `lib/locationData.js` → `getSubtypes('home')` (9)-ийн нэртэй
 *     ЯГ ИЖИЛ байх ЁСТОЙ; «Бусад» БАЙХГҮЙ тул таарахгүй үед
 *     `HOME_PAIRS_FALLBACK` ашиглагдана ✓ (ажиллуулах үед анхааруулга өгнө ✓)
 */
const HOME_SUBTYPE_PAIRS = {
  // ---------- 🧺 Гэр ахуйн бараа (9) ----------
  'Абажур, гэрэл, чийдэн': [['IKEA', 'HEKTAR абажур'], ['Philips', 'LED чийдэн'], ['Xiaomi', 'Mi LED Ceiling'], ['Varton', 'Нарны гэрэл']],
  'Угаалгын өрөө, цэвэрлэгээний хэрэгсэл': [['IKEA', 'MYSJÖN угаалгын өрөөний иж бүрдэл'], ['Vileda', 'Цэвэрлэгээний иж бүрдэл'], ['Home Plaza', 'Угаалгын өрөөний иж бүрдэл']],
  'Гал тогооны хэрэгсэл, сав суулга': [['Tefal', 'Шатаагч иж бүрдэл'], ['IKEA', 'Сав суулга 24 ширхэг'], ['Rondell', 'Ган хайруулга'], ['Fissler', 'Шарагч хайруулга']],
  'Гэрийн чимэглэл, тохижилт': [['IKEA', 'FJÄDRAR чимэглэл'], ['Home Plaza', 'Гэрийн чимэглэл иж бүрдэл'], ['Jysk', 'Декорацийн иж бүрдэл']],
  'Хивс, дорож, дэвсгэр': [['IKEA', 'STOENSE хивс'], ['Home Plaza', 'Ноосон хивс'], ['Jysk', 'Дорож']],
  'Цагаан хэрэглэл, хөнжил, дэр': [['IKEA', 'STJÄRNBRÄCKA хөнжил'], ['Dorma', 'Хөвөн даавуун иж бүрдэл'], ['Home Plaza', 'Хөнжил, дэр иж бүрдэл']],
  'Хөшиг, тюль, бүтээлэг': [['IKEA', 'MAJGULL хөшиг'], ['Home Plaza', 'Блэкаут хөшиг'], ['Jysk', 'Тюль, бүтээлэг иж бүрдэл']],
  'Зуух, пийшин': [['Beko', 'FSE57110 зуух'], ['Hansa', 'FCGW53010 зуух'], ['Gefest', '600-02 зуух'], ['Bork', 'Пийшин']],
  'Өлгүүр': [['IKEA', 'STÄLL өлгүүр'], ['Home Plaza', 'Хувцасны өлгүүр'], ['Jysk', 'Металл өлгүүр']],
};

/** 🧺 Гэр ахуйн барааны НӨӨЦ хос — «Бусад» энэ хэсэгт БАЙХГҮЙ (2026-09-30
 *  (2)-ын хэрэглэгчийн жагсаалт ЯГ ийм) тул таарахгүй түлхүүр гарвал энэ
 *  хос руу шилжинэ ✓ (⚡ `ELECTRIC_SUBTYPE_PAIRS['Бусад']`-ийн ижил зарчим) */
const HOME_PAIRS_FALLBACK = [['IKEA', 'Гэрийн бараа'], ['Home Plaza', 'Төрөл бүрийн бараа'], ['Jysk', 'Гэрийн бараа']];

/** 🛋️ Тавилгын дэд төрөл тус бүрийн үнийн хязгаар (₮) — 2026-09-30 (5).
 *  ⚠️ Сейф 50 мянга, буйдан 20 сая байх нь төөрөгдүүлнэ → төрөл тус бүрд
 *     (⚡ цахилгаан, 💻 компьютер, ⚽ хобби-той ижил зарчим).
 *  ⚠️ «Тавилга» нь 🛋️ `furniture` ТУСДАА 1-Р ТҮВШНИЙ хэсэг болсон тул үнэ нь
 *     `HOME_PRICE`-аас САЛЛАА ✓ (⚠️ «Бусад» нь энэ хэсэгт байгаа тул нэмэв)
 *  ⚠️ Тодорхойгүй бол `FURNITURE_PRICE_DEFAULT` ✓ */
const FURNITURE_PRICE = {
  // ---------- 🛋️ Тавилга (13 — 2026-09-30 (5), 1-р түвшний хэсэг) ----------
  'Зочны өрөөний': [1.2e6, 12e6],
  'Унтлагын өрөөний': [1e6, 9e6],
  'Гал тогооны': [900e3, 10e6],
  'Үүдний өрөөний': [300e3, 3.5e6],
  'Оффисын тавилга': [400e3, 5e6],
  'Буйдан, кресло': [700e3, 9e6],
  'Ор, матрас': [500e3, 8e6],
  'Шкаф, комод, авдар': [400e3, 6e6],
  'Ширээ, сандал': [200e3, 4e6],
  'Тавиур, полк': [120e3, 1.8e6],
  'Толь': [80e3, 1.2e6],
  'Сейф': [350e3, 3e6],
  'Бусад': [50e3, 3e6],
};
const FURNITURE_PRICE_DEFAULT = [50e3, 3e6];

/** 🧺 Гэр ахуйн барааны дэд төрөл тус бүрийн үнийн хязгаар (₮) — 2026-09-30 (5).
 *  ⚠️ «Тавилга» (13) нь 🛋️ `furniture` ТУСДАА хэсэг болсны дараа энд ҮЛДСЭН
 *     9 дэд төрөл — `FURNITURE_PRICE`-аас САЛГАЖ бичив ✓
 *  ⚠️ Тодорхойгүй бол `HOME_PRICE_DEFAULT` (ерөнхий гэрийн барааны үнэ) ✓ */
const HOME_PRICE = {
  // ---------- 🧺 Гэр ахуйн бараа (9) ----------
  'Абажур, гэрэл, чийдэн': [30e3, 900e3],
  'Угаалгын өрөө, цэвэрлэгээний хэрэгсэл': [40e3, 1.5e6],
  'Гал тогооны хэрэгсэл, сав суулга': [50e3, 2.5e6],
  'Гэрийн чимэглэл, тохижилт': [30e3, 1.5e6],
  'Хивс, дорож, дэвсгэр': [120e3, 4e6],
  'Цагаан хэрэглэл, хөнжил, дэр': [60e3, 1.2e6],
  'Хөшиг, тюль, бүтээлэг': [80e3, 1.5e6],
  'Зуух, пийшин': [400e3, 3.5e6],
  'Өлгүүр': [40e3, 600e3],
};
const HOME_PRICE_DEFAULT = [50e3, 3e6];

// ⚠️ 2026-09-30 (5): `HOME_FURNITURE` (Set) ХАСАГДАВ — «Тавилга» нь 🛋️
// `furniture` ТУСДАА ХЭСЭГ болсон тул `makeAttrs` нь хэсгээрээ шууд шалгана
// (`section === 'furniture'`) → материал/хэмжээ нь бүлгээс хамаарах
// шаардлагагүй ✓ (💻 `PC_NOTEBOOK_BRANDS`-ийн зарчим ХЭВЭЭР: `COMPUTER_
// SUBTYPE_GROUPS`-ээс уншина — ⚠️ тэр нь ОДОО ч 3 дахь түвшинтэй)

/** 🛋️ Тавилгын материал — ⚠️ «Шил»/«Керамик» нь буйдан/ор дээр утгагүй ✗ */
const FURNITURE_MATERIALS = ['Мод', 'Мод', 'Мод', 'Арьс', 'Даавуу', 'Металл'];

/**
 * 🧺 Гэр ахуйн барааны материал — ДЭД ТӨРӨЛ тус бүрд.
 * ⚠️ ЯАГААД: нэг ерөнхий жагсаалт хэрэглэвэл хивс «Керамик», зуух «Ноос»
 *    гэж гарч demo өгөгдөл ХУДАЛ харагдана ✗ (⚡ `ELECTRIC_SUBTYPE_PAIRS`-ийн
 *    «дэд төрөлд тохирсон» зарчим)
 */
const HOME_SUBTYPE_MATERIALS = {
  'Абажур, гэрэл, чийдэн': ['Металл', 'Шил', 'Хуванцар', 'Даавуу'],
  'Угаалгын өрөө, цэвэрлэгээний хэрэгсэл': ['Хуванцар', 'Металл', 'Керамик', 'Шил'],
  'Гал тогооны хэрэгсэл, сав суулга': ['Керамик', 'Ган', 'Шил', 'Мод'],
  'Гэрийн чимэглэл, тохижилт': ['Мод', 'Шил', 'Керамик', 'Металл'],
  'Хивс, дорож, дэвсгэр': ['Ноос', 'Хилэн', 'Даавуу', 'Хөвөн'],
  'Цагаан хэрэглэл, хөнжил, дэр': ['Хөвөн даавуу', 'Сатин', 'Ноос'],
  'Хөшиг, тюль, бүтээлэг': ['Даавуу', 'Полиэстер', 'Хөвөн'],
  'Зуух, пийшин': ['Металл', 'Шилэн керамик', 'Эмаль'],
  'Өлгүүр': ['Металл', 'Мод', 'Хуванцар'],
};
/** ⚠️ Тодорхойгүй дэд төрлийн нөөц (шинэ item нэмэгдээд энд бичихээ мартвал) */
const HOME_MATERIALS_DEFAULT = ['Хөвөн даавуу', 'Керамик', 'Ноос', 'Металл', 'Хуванцар', 'Шил'];


// ============================================================
// 🧱 БАРИЛГЫН МАТЕРИАЛ — ШИНЭ ХЭСЭГ (2026-09-30, `0023`)
// ============================================================
/**
 * ⚠️ БАРИЛГЫН МАТЕРИАЛЫН брэнд+загвар(бүтээгдэхүүн) — ДЭД ТӨРӨЛ тус бүрд
 *    (🧱 23 дэд төрөл). ⚠️ ЯАГААД: «Knauf Gyproc» нь «Лифт, урсдаг шат» дэд
 *    төрөлд орохгүй байхын тулд (💻/⚡/🛋️-ийн ЯГ ижил зарчим ✓)
 *    ⚠️ Мөр бүр ≈ 1 бодит бүтээгдэхүүн: брэнд + нэр/хэмжээ (Монголын
 *    барилгын зах зээлд танил нэрс: Knauf, Технониколь, МАК, Veka, Rehau…)
 */
const CONSTRUCTION_SUBTYPE_PAIRS = {
  'Агааржуулалт': [['Systemair', 'KVR 100'], ['Vents', 'ВКМ 150'], ['Ostberg', 'CK 125'], ['Blauberg', 'Vento 100']],
  'Барилгын багаж': [['Bosch', 'GBH 2-26'], ['Makita', 'HP 1630'], ['DeWalt', 'DCD 796'], ['Metabo', 'W 11-125'], ['Total', 'TS 114181']],
  'Арматур, металл хийц, хэв хашмал': [['ММК', 'Арматур A500C 12 мм'], ['Северсталь', 'Арматур 10 мм'], ['PERI', 'Хэв хашмал 2.7 м'], ['Mabey', 'Дэмжих шон 3 м']],
  'Дулаалга, тусгаарлах материал': [['Технониколь', 'Rocklight 100 мм'], ['Knauf', 'Insulation 50 мм'], ['Paroc', 'eXtra 150 мм'], ['Isover', 'Классик 100 мм']],
  'Зам, талбайн тохижуулалт': [['Хаш', 'Бордюр 100×30 см'], ['Bravo', 'Хаалт 2 м'], ['Бетонон хавтан', '30×30 см'], ['Асфальт', 'Хүйтэн асфальт 25 кг']],
  'Засал чимэглэлийн материал': [['Титан', 'Будаг 15 л'], ['Dulux', 'Засал 10 л'], ['Knauf', 'Шпаклёвка 25 кг'], ['Tikkurila', 'Эмаль 2.7 л']],
  'Модон материал': [['Сосна', 'Хавтан 50×150×6000'], ['MDF', 'Хавтан 18 мм'], ['ЛДСП', '2800×2070×16 мм'], ['Фанера', '1550×1550×18 мм']],
  'Сантехник': [['Grohe', 'Eurosmart'], ['Hansgrohe', 'Talis S'], ['Rehau', 'RAUTITAN 20 мм'], ['Ecoplast', 'Хоолой 32 мм'], ['Valtec', 'Коллектор 1"']],
  'Тоосго, бетон, блок': [['Wienerberger', 'Керамик тоосго 250×120×65'], ['Газобетон', '600×300×200 мм'], ['Weber', 'Бетон блок 400×200×200'], ['Керамзит', 'Блок 390×190×188']],
  'Фасадны материал': [['Alucobond', 'Композит 4 мм'], ['Ceresit', 'Фасадны 25 кг'], ['Teknos', 'Фасадны будаг 18 л'], ['Керамогранит', '600×600 мм']],
  'Цонх, шил, толь': [['Veka', 'Softline 70'], ['Rehau', 'Blitz'], ['Saint-Gobain', 'Шил 4 мм'], ['AGC', 'Хатуу шил 6 мм']],
  'Халаалт': [['Baxi', 'Eco Four 24'], ['Bosch', 'Gaz 6000 W'], ['Vaillant', 'ecoTEC 24'], ['Ferroli', 'Радиатор 500 мм'], ['Rehau', 'Шалны халаалт 16 мм']],
  'Хашаа': [['3D Хашаа', '2.4×1.5 м'], ['Евро хашаа', '250×200 см'], ['Хайрсан хашаа', '1800×2000 мм'], ['Dimet', 'Хашааны шон 60 мм']],
  'Цахилгаан, холбоо': [['Schneider', 'Щит 12 модуль'], ['ABB', 'Автомат 16 A'], ['Legrand', 'Розетка 16 A'], ['ХК Кабель', 'ВВГ 3×2.5'], ['Philips', 'LED 36 W']],
  'Элс, хайрга, цемент': [['МАК', 'Цемент M400 50 кг'], ['Holcim', 'Цемент 40 кг'], ['Шар элс', '1 м³'], ['Хайрга', '10-20 мм 1 м³'], ['Алебастр', 'Гипс 30 кг']],
  'Бусад': [['Строитель', 'Хэрэгсэл иж бүрэн'], ['Master', 'Хамгаалалтын багц'], ['Stihl', 'Гар хөрөө'], ['ЗДТ', 'Түрээсийн материал']],
  'Ухаалаг цоож': [['Samsung', 'SHP-DP609'], ['Xiaomi', 'Smart Door Lock E'], ['Yale', 'YRD 226'], ['Kaadas', 'K20'], ['Aqara', 'A100']],
  'Дээвэр, нуруу, бэхэлгээ': [['Ruukki', 'Металл профайл'], ['Grand Line', 'Металл черепиц'], ['Metrotile', '0.45 мм'], ['Тенге', 'Дээврийн хавтан']],
  'Хавтан, өнгөлгөөний материал': [['Ceresit', 'Плитаны цавуу 25 кг'], ['Керамогранит', '600×1200 мм'], ['Kronospan', 'Ламинат 33 класс'], ['Laminate', '32 класс 8 мм']],
  'Бетон зуурмаг, хийц эдлэл': [['МАК', 'Бэлэн бетон M300'], ['ББЗУ', 'Фундаментын блок FBS'], ['Бетон зуурмаг', '15 м³'], ['БТЦ', 'Хайрцган хийц']],
  'Хайрцаг': [['Гофро картон', '600×400×400 мм'], ['Картон хайрцаг', '40×30×30 см'], ['Скотч', '48 мм × 100 м'], ['Стрейч', '500 мм 2 кг']],
  'Лифт, урсдаг шат': [['Otis', 'GeN2'], ['Kone', 'MonoSpace'], ['Schindler', '3300 AP'], ['Тяньшен', 'TWJ 5000']],
  'Хаалга': [['Пласт Про', 'PVC ОХ-1'], ['Эко хаалга', 'Металл 2.05 м'], ['Bravo', 'Хаалга 90×205 см'], ['Дорхан', 'Металл хаалга']],
};

/**
 * 🧱 Барилгын материалын дэд төрөл тус бүрийн үнийн хязгаар (₮) — 2026-09-30.
 * ⚠️ ЯАГААД: «Лифт» 200 мянга, «Хайрцаг» 50 сая байх нь төөрөгдүүлнэ ✗ →
 *    төрөл тус бүрд (💻/⚡/🛋️-ийн ЯГ ижил зарчим ✓). Тодорхойгүй бол DEFAULT.
 */
const CONSTRUCTION_PRICE = {
  'Агааржуулалт': [100e3, 5e6],
  'Барилгын багаж': [30e3, 4e6],
  'Арматур, металл хийц, хэв хашмал': [50e3, 8e6],
  'Дулаалга, тусгаарлах материал': [20e3, 1.2e6],
  'Зам, талбайн тохижуулалт': [50e3, 15e6],
  'Засал чимэглэлийн материал': [15e3, 1.5e6],
  'Модон материал': [30e3, 1.5e6],
  'Сантехник': [20e3, 4e6],
  'Тоосго, бетон, блок': [30e3, 3e6],
  'Фасадны материал': [30e3, 3e6],
  'Цонх, шил, толь': [80e3, 6e6],
  'Халаалт': [50e3, 8e6],
  'Хашаа': [50e3, 5e6],
  'Цахилгаан, холбоо': [10e3, 2e6],
  'Элс, хайрга, цемент': [20e3, 1.5e6],
  'Ухаалаг цоож': [200e3, 2.5e6],
  'Дээвэр, нуруу, бэхэлгээ': [30e3, 4e6],
  'Хавтан, өнгөлгөөний материал': [20e3, 2e6],
  'Бетон зуурмаг, хийц эдлэл': [50e3, 5e6],
  'Хайрцаг': [10e3, 200e3],
  'Лифт, урсдаг шат': [20e6, 150e6],
  'Хаалга': [150e3, 5e6],
};
const CONSTRUCTION_PRICE_DEFAULT = [50e3, 5e6];

/**
 * 🧱 Хэмжээ (`attrs.size`) — дэд төрөл тус бүрийн ТИПИЙН утгууд.
 *    ⚠️ Картын мөрөнд харагдана (`CARD_ATTR_ORDER.construction`) →
 *    «Knauf Gyproc GK · 1.2×2.4 м · ✅ Шинэ» ✓
 */
const CONSTRUCTION_SIZE = {
  'Агааржуулалт': ['100 мм', '125 мм', '150 мм'],
  'Барилгын багаж': ['650 Вт', '800 Вт', '1200 Вт'],
  'Арматур, металл хийц, хэв хашмал': ['8 мм', '10 мм', '12 мм', '16 мм'],
  'Дулаалга, тусгаарлах материал': ['50 мм', '100 мм', '150 мм'],
  'Зам, талбайн тохижуулалт': ['30×30 см', '100×30 см', '2 м'],
  'Засал чимэглэлийн материал': ['2.7 л', '10 л', '15 л', '25 кг'],
  'Модон материал': ['40×100×4000 мм', '50×150×6000 мм', '18 мм'],
  'Сантехник': ['1/2"', '20 мм', '32 мм', '63 мм'],
  'Тоосго, бетон, блок': ['250×120×65 мм', '400×200×200 мм', '600×300×200 мм'],
  'Фасадны материал': ['4 мм', '25 кг', '600×600 мм'],
  'Цонх, шил, толь': ['4 мм', '6 мм', '70 мм профиль'],
  'Халаалт': ['16 кВт', '24 кВт', '500 мм', '16 мм'],
  'Хашаа': ['1.5×2.5 м', '1800×2000 мм', '2.4×1.5 м'],
  'Цахилгаан, холбоо': ['3×2.5 мм²', '16 A', '12 модуль'],
  'Элс, хайрга, цемент': ['25 кг', '50 кг', '1 м³'],
  'Ухаалаг цоож': ['Bluetooth', 'Wi-Fi', 'Хурууны хээ'],
  'Дээвэр, нуруу, бэхэлгээ': ['0.45 мм', '0.5 мм', '2 м'],
  'Хавтан, өнгөлгөөний материал': ['8 мм', '16 мм', '600×1200 мм'],
  'Бетон зуурмаг, хийц эдлэл': ['1 м³', '5 м³', '15 м³'],
  'Хайрцаг': ['30×20×20 см', '40×30×30 см', '600×400×400 мм'],
  'Лифт, урсдаг шат': ['320 кг', '400 кг', '630 кг', '1000 кг'],
  'Хаалга': ['80×205 см', '90×205 см', '2.05 м'],
};
const CONSTRUCTION_SIZE_DEFAULT = ['Стандарт хэмжээ', 'Иж бүрэн', '1 багц'];

// ============================================================
// 🏭 ТОНОГ ТӨХӨӨРӨМЖ — ШИНЭ ХЭСЭГ (2026-09-30, `0023`)
// ============================================================
/**
 * ⚠️ ТОНОГ ТӨХӨӨРӨМЖИЙН брэнд+загвар — ДЭД ТӨРӨЛ тус бүрд (🏭 20 дэд төрөл).
 *    ⚠️ «Hikvision камер» нь «Оёдлын тоног төхөөрөмж» дэд төрөлд орохгүйн
 *    тулд (💻/⚡/🛋️/🧱-ийн ЯГ ижил зарчим ✓)
 *    ℹ️ Брэнд нь Монголын импортод танил: JCB, XCMG, Karcher, Hikvision,
 *    ZKTeco, Rational, Juki, Profoto… ✓
 */
const EQUIPMENT_SUBTYPE_PAIRS = {
  'Авто засвар, авто угаалгын тоног төхөөрөмж': [['Karcher', 'K 5 Premium'], ['Launch', 'X431 Pro'], ['Hunter', 'HawkEye Elite'], ['САГА', 'Подъёмник 4 т']],
  'Аж үйлдвэрийн тоног төхөөрөмж': [['Haier', 'Компрессор 7.5 кВт'], ['Siemens', 'SIMATIC S7-1200'], ['Челябинск', 'Станок 1М63'], ['Ати', 'Циркуляр хөрөө 350 мм']],
  'Барилгын тоног төхөөрөмж': [['JCB', '3CX'], ['XCMG', 'LW300'], ['Zoomlion', 'ZTC250'], ['Caterpillar', '320D'], ['Bobcat', 'S450']],
  'Бочки / Цистерн / Ёмкость': [['Ёмкость', '5 м³'], ['Цистерн', '10 м³'], ['Нержавейк', '1 м³'], ['ГШТ', 'Ёмкость 25 м³']],
  'Гоо сайхны тоног төхөөрөмж': [['Soprano', 'Ice Laser 808'], ['Skin', 'RF аппарат'], ['Beauty', 'Лешний орон'], ['Титан', 'Маникюрын ширээ']],
  'Дэлгүүр, лангуунд зориулсан': [['Лангуу', 'Кассын 1.2 м'], ['Витрин', 'Хөргөгчтэй 2 м'], ['Полк', '5 шатлалт'], ['Хүргэлтийн троллей', '40 л']],
  'Кафе, ресторан, хоолны газарт': [['Hendi', 'Пицца зуух'], ['Rational', 'SCC 61'], ['Bartscher', 'Кофе машин'], ['Cambro', 'Хөргөгч 400 л']],
  'Касс, терминал, цаас': [['PAX', 'S920'], ['CAS', 'CW-300'], ['Verifone', 'VX 520'], ['Термо цаас', '80 мм × 80 м'], ['Эко цаас', 'A4 500 хуудас']],
  'Хөдөө аж ахуйн тоног төхөөрөмж': [['MTZ', 'Анжис 3 м'], ['Kverneland', 'Эгшигч'], ['Gaspardo', 'Сеялка 8 м'], ['Магнум', 'Сүүний аппарат']],
  'Хэвлэх тоног төхөөрөмж': [['Roland', 'VersaCAMM VS-540'], ['Heidelberg', 'SM 52'], ['Mimaki', 'JV300-160'], ['Trodat', 'Тамганы машин']],
  'Хүнсний тоног төхөөрөмж': [['Hendi', 'Мах хэрчигч'], ['Bosch', 'Зуурах машин'], ['Индукц', 'Казан 100 л'], ['Multivac', 'Вакуум савлагч']],
  'Хяналтын камер, цаг бүртгэл': [['Hikvision', 'DS-2CD2143'], ['Dahua', 'IPC-HFW2431'], ['ZKTeco', 'F18 бүртгэл'], ['Uniview', 'NVR 16ch']],
  'Цахилгаан тоног төхөөрөмж': [['ABB', 'Автомат 3P 63 A'], ['Schneider', 'Щит ЩРН-12'], ['Siemens', 'Генератор 30 кВт'], ['ХК', 'Трансформатор 100 кВА']],
  'Уул уурхайн, өрөмдлөгийн тоног төхөөрөмж': [['Atlas Copco', 'GA 30'], ['Sandvik', 'Өрөмдлөгийн титэм'], ['Boart Longyear', 'Корнок'], ['Komatsu', 'D375']],
  'Эрүүл мэндийн тоног төхөөрөмж': [['Mindray', 'DC-40 УЗИ'], ['Philips', 'ЭКГ PageWriter'], ['Юнико', 'Рентген 300 мА'], ['Юси', 'Стоматологийн сандал']],
  'Бусад тоног төхөөрөмж': [['Kipp', 'Гар хөрөө'], ['Tot', 'Шүүр сорогч'], ['Ати', 'Электро бур'], ['ЗДТ', 'Түрээсийн тоног төхөөрөмж']],
  'Цэвэрлэгээний тоног төхөөрөмж': [['Karcher', 'Puzzi 8/1'], ['Nilfisk', 'GD 10'], ['Tennant', 'T7'], ['Химавто', 'Шүүр 2 цаг']],
  'Тавилгын үйлдвэрийн тоног төхөөрөмж': [['Woodman', 'Edge bander'], ['Felder', 'Форматын хөрөө'], ['Homag', 'CNC 3 тэнхлэг'], ['Altendorf', 'WA 80']],
  'Оёдлын тоног төхөөрөмж': [['Juki', 'DDL-8700'], ['Jack', 'E4 оверлог'], ['Brother', 'PR-670 хатгамал'], ['Pegasus', 'M900']],
  'Фото студийн тоног төхөөрөмж': [['Profoto', 'B10X Plus'], ['Godox', 'Softbox 90 см'], ['Canon', 'EOS R6'], ['Neewer', 'Фон 2.8×3 м']],
};

/**
 * 🏭 Тоног төхөөрөмжийн дэд төрөл тус бүрийн үнийн хязгаар (₮) — 2026-09-30.
 * ⚠️ Хүрээ нь МАШ ӨРГӨН (10 сая ↔ 900 сая): уул уурхайн экскаватор ба
 *    оёдлын машин НЭГ хязгаарт багтахгүй ✓ → төрөл тус бүрд.
 */
const EQUIPMENT_PRICE = {
  'Авто засвар, авто угаалгын тоног төхөөрөмж': [2e6, 80e6],
  'Аж үйлдвэрийн тоног төхөөрөмж': [5e6, 300e6],
  'Барилгын тоног төхөөрөмж': [10e6, 400e6],
  'Бочки / Цистерн / Ёмкость': [1e6, 25e6],
  'Гоо сайхны тоног төхөөрөмж': [1e6, 60e6],
  'Дэлгүүр, лангуунд зориулсан': [500e3, 20e6],
  'Кафе, ресторан, хоолны газарт': [1e6, 80e6],
  'Касс, терминал, цаас': [100e3, 5e6],
  'Хөдөө аж ахуйн тоног төхөөрөмж': [1e6, 120e6],
  'Хэвлэх тоног төхөөрөмж': [2e6, 90e6],
  'Хүнсний тоног төхөөрөмж': [1e6, 100e6],
  'Хяналтын камер, цаг бүртгэл': [100e3, 10e6],
  'Цахилгаан тоног төхөөрөмж': [50e3, 15e6],
  'Уул уурхайн, өрөмдлөгийн тоног төхөөрөмж': [20e6, 900e6],
  'Эрүүл мэндийн тоног төхөөрөмж': [2e6, 200e6],
  'Бусад тоног төхөөрөмж': [500e3, 30e6],
  'Цэвэрлэгээний тоног төхөөрөмж': [300e3, 20e6],
  'Тавилгын үйлдвэрийн тоног төхөөрөмж': [3e6, 120e6],
  'Оёдлын тоног төхөөрөмж': [500e3, 30e6],
  'Фото студийн тоног төхөөрөмж': [300e3, 25e6],
};
const EQUIPMENT_PRICE_DEFAULT = [500e3, 30e6];

/**
 * 🏭 Хүчин чадал (`attrs.size`) — дэд төрөл тус бүрийн ТИПИЙН утгууд
 *    (компрессор → кВт, цистерн → м³, камер → CH) ✓
 */
const EQUIPMENT_SIZE = {
  'Авто засвар, авто угаалгын тоног төхөөрөмж': ['150 бар', '4 т', '220 В'],
  'Аж үйлдвэрийн тоног төхөөрөмж': ['7.5 кВт', '15 кВт', '30 кВт'],
  'Барилгын тоног төхөөрөмж': ['3 т', '5 т', '25 т'],
  'Бочки / Цистерн / Ёмкость': ['1 м³', '5 м³', '10 м³', '25 м³'],
  'Гоо сайхны тоног төхөөрөмж': ['808 нм', 'RF 2 MHz', '1 кВт'],
  'Дэлгүүр, лангуунд зориулсан': ['1.2 м', '2 м', '400 л'],
  'Кафе, ресторан, хоолны газарт': ['1.5 кВт', '400 л', '12 газар'],
  'Касс, терминал, цаас': ['3"', '80 мм', '500 хуудас'],
  'Хөдөө аж ахуйн тоног төхөөрөмж': ['3 м', '8 м', '12 л/мин'],
  'Хэвлэх тоног төхөөрөмж': ['160 см', '4 өнгө', '1.6 м'],
  'Хүнсний тоног төхөөрөмж': ['100 л', '300 кг/ц', '220 В'],
  'Хяналтын камер, цаг бүртгэл': ['4 MP', '8 CH', '16 CH'],
  'Цахилгаан тоног төхөөрөмж': ['30 кВт', '63 A', '100 кВА'],
  'Уул уурхайн, өрөмдлөгийн тоног төхөөрөмж': ['30 кВт', '20 бар', '100 т'],
  'Эрүүл мэндийн тоног төхөөрөмж': ['300 мА', '12 суваг', '4D'],
  'Цэвэрлэгээний тоног төхөөрөмж': ['8 л', '10 л', '2 цаг'],
  'Тавилгын үйлдвэрийн тоног төхөөрөмж': ['3 тэнхлэг', '2.4 м', '400 мм'],
  'Оёдлын тоног төхөөрөмж': ['1 игл', '4 игл', '5 игл'],
  'Фото студийн тоног төхөөрөмж': ['90 см', '500 W', '2.8×3 м'],
};
const EQUIPMENT_SIZE_DEFAULT = ['Стандарт', 'Иж бүрэн', '1 багц'];

/** Үйлчилгээний компаниуд */
const SERVICE_NAMES = [
  'Гэр засвар', 'Мастер групп', 'Цэвэрлэгч.мн', 'Тээвэр логистик',
  'Гоо сайхан студио', 'Уянга сургалт', 'Хууль зөвлөгөө', 'Санхүү консалтинг',
  'Фото студио', 'Вэб студио', 'Дижитал маркетинг', 'Орчуулгын төв',
  'Ивент групп', 'Авто засвар', 'Гэр ахуйн үйлчилгээ', 'Түлхүүрч',
  'Цахилгаанчин', 'Сантехникч', 'Будагчин', 'Хөргөгч засвар',
];



// ============================================================
// ХЭСЭГ ТУС БҮРИЙН ТАЛБАР (attrs) БА ТАЙЛБАР
// ============================================================

/** Үл хөдлөхийн төрөл тус бүрийн үнэ/өрөө/талбай (хуучин seed-тэй ижил) */
const RE_CFG = {
  'Орон сууц': { sell: [120e6, 550e6], rent: [800e3, 3.5e6], rooms: [1, 4], area: [28, 130], apartment: true, floors: true,
    texts: ['Засвартай, цэвэрхэн орон сууц. Төвд ойрхон, нийтийн тээвэр сайн.', 'Шинэ засвартай, тавилгатай байр. Лифт, зогсоолтой.', 'Гэр бүлд тохиромжтой, гэрэлтэй байр. Сургууль, цэцэрлэг ойрхон.'] },
  'Газар': { sell: [40e6, 400e6], rent: [500e3, 3e6], rooms: [0, 0], area: [300, 3000],
    texts: ['Хашаатай, тэгш газар. Цахилгаан, ус ойрхон.', 'Байршил сайн, төвд ойрхон газар. Барилга барихад тохиромжтой.', 'Зуслангийн бүсэд ойн дунд, амрахад тохиромжтой газар.'] },
  'Худалдаа, үйлчилгээний талбай': { sell: [250e6, 1.5e9], rent: [2e6, 12e6], rooms: [0, 0], area: [40, 500], floors: true,
    texts: ['Их дэлгүүрийн 1-р давхарт, хүн ихтэй газар. Витринтэй.', 'Гудамжны нүүр талд, өөрийн орцтой талбай.', 'Шинэ барилгын 1-2 давхар, ресторан/дэлгүүрт тохиромжтой.'] },
  'АОС, хаус, зуслан, амралтын газар': { sell: [300e6, 2.5e9], rent: [2e6, 15e6], rooms: [4, 7], area: [150, 600], bathrooms: true,
    texts: ['2 давхар хаус, хашаатай, зогсоолтой. Зуслангийн бүсэд.', 'Ойн дунд, цэвэр агаартай амралтын газар. Тавилгатай.', 'Голын эрэг дээр, 6 өрөөтэй хаус. Бүрэн тохижуулсан.'] },
  'Үйлдвэр, агуулах, обьект': { sell: [400e6, 3e9], rent: [3e6, 20e6], rooms: [0, 2], area: [200, 2000],
    texts: ['Төмөр замын ойролцоо агуулах. Ачих буулгах талбайтай.', 'Үйлдвэрийн зориулалттай обьект, 3 фазын цахилгаантай.', 'Том агуулах, харуул хамгаалалттай. Хүнд машин орох замтай.'] },
  'Оффис': { sell: [200e6, 1.2e9], rent: [1.2e6, 8e6], rooms: [0, 4], area: [30, 300], floors: true,
    texts: ['Бизнес төвийн оффис, эргэлтэт хаалгатай. Зогсоолтой.', 'Цонхтой, гэрэлтэй оффис. Төвд, нийтийн тээвэр ойрхон.', 'Шинэ оффисын төв, 24/7 хамгаалалттай, лифттэй.'] },
  'Хашаа байшин': { sell: [150e6, 900e6], rent: [1.5e6, 6e6], rooms: [3, 6], area: [100, 400],
    texts: ['Хашаа байшин, цэцэрлэгтэй. Худаг, цахилгаантай.', '2 давхар хашаа байшин, зогсоол, гаражтай.', 'Хотын захын цэвэр агаартай хашаа байшин.'] },
  'Гараж, контейнер, зөөврийн сууц': { sell: [15e6, 120e6], rent: [300e3, 1.5e6], rooms: [0, 1], area: [15, 60],
    texts: ['Хамгаалагдсан зогсоолын гараж. Машин орж гарахад хялбар.', 'Төмөр контейнер, агуулахын зориулалтаар ашиглаж болно.', 'Хашаан доторх гараж, цахилгаантай.'] },
};

/** Хэсэг тус бүрийн ATTRIBUTE-ууд (`attrs` jsonb)
 *  ⚠️ `subtype` нь ЗААВАЛ — брэнд/загвар/албан тушаал нь дэд төрөлд
 *     тохирсон байх ёстой (BMW X5 нь «Трактор» дэд төрөлд орохгүй). */
function makeAttrs(section, subtype) {
  if (section === 'auto') {
    const [brand, model] = pick(AUTO_SUBTYPE_PAIRS[subtype] || CAR_PAIRS);
    // ⚠️ «Авто сэлбэг, хэрэгсэл» нь машин БИШ — он/гүйлт/хүрд хэрэггүй
    if (subtype === 'Авто сэлбэг, хэрэгсэл') {
      // 🛡️ 2026-10-01 (18): `warranty` нь форм/шүүлтээс ХАСАГДСАН тул демо
      //    `attrs`-д ч ҮҮСГЭХГҮЙ ✓ (форм дээр сонгогдохгүй талбар)
      return { brand, model, condition: pick(['Шинэ', 'Шинэвтэр', 'Хуучин', 'Хуучин']) };
    }
    // ⚠️ `year` нь тусдаа хувьсагч БОЛОХ ЁСТОЙ: `importYear` нь түүнээс
    //    хамаардаг тул объект дотроос `year`-ыг унших боломжгүй (TDZ алдаа) ✗
    const year = randInt(2008, 2024);
    // ⛽ ТҮЛШ — 🔧 «Хөдөлгүүр» нь түүнээс хамаарна (Цахилгаан → «Цахилгаан (EV)»)
    //    тул эхлээд тодорхойлно ✓ (year-ийн TDZ-ийн зарчим ХЭВЭЭР)
    const fuel = pick(['Бензин', 'Бензин', 'Бензин', 'Дизель', 'Хайбрид', 'Хайбрид', 'Цахилгаан', 'Хий']);
    return {
      brand, model,
      year: String(year),
      // 📥 ОРЖ ИРСЭН ОН (2026-09-28, хэрэглэгчийн хүсэлт) — Монголын зарын
      //    ердийн үзүүлэлт: машин үйлдвэрлэгдсэнээс ХОЙШ гаальд ирнэ.
      //    ⚠️ `year`-ээс багагүй байх ёстой (логик) → `max`, 2026 (энэ он)-аас
      //       хэтрэхгүй ✓. Ингэснээр `?attr_importYear_from=2021` шүүлт
      //       бодит үр дүн буцаана (эс бөгөөс он зөрүүтэй демо өгөгдөл үүснэ ✗)
      importYear: String(Math.min(2026, year + randInt(0, 4))),
      mileage: String(randInt(0, 26) * 10000 + randInt(0, 9) * 1000),
      transmission: pick(['Автомат', 'Автомат', 'Механик', 'Хагас автомат', 'CVT']),
      fuel,
      // 🔧 2026-10-01: «Хөдөлгүүр» нь ЧӨЛӨӨТ ТЕКСТ («2.5») → СОНГОЛТ болов —
      //    демо утга нь `ENGINE_OPTIONS`-оос сонгогдоно (форм дээрх
      //    жагсаалттай ЯГ ИЖИЛ ✓). ⚠️ «Цахилгаан (EV)» нь ЗӨВХӨН цахилгаан
      //    машинд → `fuel`-тэй тааруулна (эс бөгөөс «Бензин + EV» гэсэн
      //    утгагүй демо зар үүснэ ✗)
      engine: fuel === 'Цахилгаан'
        ? 'Цахилгаан (EV)'
        : pick(ENGINE_OPTIONS.filter((o) => o !== 'Цахилгаан (EV)')),
      // 🎨 2026-10-01: 🔀 «Хөтлөгч» (`drive`) ХАСАГДАЖ, «Өнгө» нэмэгдэв
      color: pick(AUTO_COLOR_OPTIONS),
      condition: pick(['Шинэ', 'Шинэвтэр', 'Хуучин', 'Хуучин', 'Хуучин']),
    };
  }
  if (section === 'jobs') {
    // ⚠️ «Цагийн ажил» нь ХАГАС ЦАГ/ээлж → `jobType` «Хагас цаг», туршлага
    //    ШААРДАХГҮЙ; «Гүйцэтгэх удирдлага» нь 5+ жилийн туршлагатай ✓
    const isPartTime = subtype === 'Цагийн ажил';
    const isExecutive = subtype === 'Гүйцэтгэх удирдлага';
    const isEntry = isPartTime || subtype === 'Туслах ажилчин';
    // ⚠️ Цалин нь дэд төрлөөс хамаарна (туслах ажилчин 700 мянга ↔ гүйцэтгэх
    //    удирдлага 35 сая) → `JOB_SALARY` хүснэгтээс; тодорхойгүй бол DEFAULT ✓
    const [lo, hi] = JOB_SALARY[subtype] || JOB_SALARY_DEFAULT;
    // ⚠️ 2026-10-03 (9): талбарууд нь формойн ШИНЭ жагсаалттай нийцэв
    //    (jobType/advertiser/jobLevel/salaryType); `education`/`workMode`
    //    ХАСАГДАВ. `salary` нь attrs-д ХЭВЭЭР (доор `price` болж хөрвөнө) ✓
    // ⚠️ 2026-10-03 (10): 🏢 `company` ба 💼 `position` ХАСАГДАВ (хэрэглэгчийн
    //    хүсэлт) ⇒ демо зард эдгээр түлхүүр ОГТ ҮҮСЭХГҮЙ (`JOB_SUBTYPE_PAIRS`
    //    хүснэгт бүхэлдээ устсан ✓) — формойн талбаруудтай ЯГ ИЖИЛ багц болно
    return {
      salary: String(money(lo, hi)),
      jobType: isPartTime
        ? pick(['Хагас цагийн', 'Хагас цагийн', 'Цагийн', 'Гэрээт'])
        : pick(['Бүтэн цагийн', 'Бүтэн цагийн', 'Бүтэн цагийн', 'Гэрээт', 'Түр хугацааны']),
      experience: isEntry ? 'Шаардлагагүй' : pick(['Шаардлагатай', 'Шаардлагатай', 'Шаардлагагүй']),
      advertiser: pick(['Байгууллага', 'Байгууллага', 'Хувь хүн', 'Зуучлагч']),
      jobLevel: isExecutive
        ? pick(['Дээд шатны удирдлага', 'Дунд шатны удирдлага'])
        : isEntry
          ? pick(['Анхан шатны', 'Дадлагын'])
          : pick(['Мэргэжилтэн', 'Мэргэжилтэн', 'Дунд шатны удирдлага', 'Анхан шатны']),
      salaryType: pick(['Тогтмол', 'Тогтмол', 'Тогтмол', 'Хэлбэлзэх']),
    };
  }
  if (section === 'computers') {
    // ⚠️ 2026-09-29: дэд төрөл нь 3 ТҮВШНИЙ мод болов (`COMPUTER_SUBTYPE_GROUPS`)
    //    — Notebook бүлэгт брэнд нь ӨӨРӨӨ дэд төрөл тул `attrs.brand` нь
    //    дэд төрлийн нэртэй ЯГ ИЖИЛ байх ёстой ✓
    const [brand, model] = pick(PC_SUBTYPE_PAIRS[subtype] || PC_PAIRS);
    /**
     * ⚠️ 2026-09-30 (6): Дэлгэц/CPU/RAM/Хард нь ЗӨВХӨН `PC_SPEC_SUBTYPES`
     *    (Notebook-ийн 21 брэнд + «Иж бүрэн компьютер» + «Процессор, сервер»)
     *    дэд төрөлд үүснэ — форм дээр ч ЯГ тэнд л харагдана ✓.
     * ⚠️ Урьд нь «Бусад сэлбэг» ч багтаж байв (форм дээр CPU гэж байхгүй ✗);
     *    «Дэлгэц»/«Проектор»-ын `screen` нь ХЭВЭЭР (зөвхөн demo өгөгдөл —
     *    форм дээр хэмжээний сонголт байхгүй, картын мөрөнд ч ороогүй ✓)
     */
    return {
      brand: PC_NOTEBOOK_BRANDS.has(subtype) ? subtype : brand,
      model,
      ...(PC_SPEC.has(subtype)
        ? {
          screen: pick(PC_SCREEN_POOL),
          cpu: pick(PC_CPU_POOL),
          ram: pick(PC_RAM_POOL),
          storage: pick(PC_STORAGE_POOL),
        }
        : subtype === 'Дэлгэц' || subtype === 'Проектор'
          ? { screen: pick(['24', '27', '32']) } : {}),
      condition: pick(['Шинэ', 'Шинэвтэр', 'Хуучин', 'Хуучин']),
      // 🛡️ 2026-10-01 (18): `warranty` ХАСАГДСАН (форм/шүүлт/карт) → демо ч үгүй ✓
    };
  }
  if (section === 'electric') {
    // ⚡ 2026-09-30: дэд төрөл нь 3 ТҮВШНИЙ мод (`ELECTRIC_SUBTYPE_GROUPS`)
    //    → брэнд/загвар нь дэд төрөлд тохирсон байх ёстой ✓
    const [brand, model] = pick(ELECTRIC_SUBTYPE_PAIRS[subtype] || ELECTRIC_SUBTYPE_PAIRS['Бусад']);
    // 📏 Хэмжээ нь зөвхөн хэмжигдэхүйц төрөлд (ТВ: инч; хөргөгч/угаалгын
    //    машин: литр/кг) — компьютер/хобби-той ижил зарчим ✓
    // ⚠️ ТВ-ийн хэмжээ нь ДЭД ТӨРЛИЙН инчтэй ЗӨВШӨӨРӨХ ёстой: «65 инч» төрөлд
    //    «32 инч» гэж гарвал карт дээр зөрүүтэй харагдана ✗
    const size = subtype === 'Телевизор (55 ба доош инч)'
      ? pick(['32 инч', '43 инч', '50 инч', '55 инч'])
      : subtype === 'Телевизор (65 инч)'
        ? '65 инч'
        : subtype === 'Телевизор (75 ба дээш инч)'
          ? pick(['75 инч', '85 инч', '98 инч'])
          : subtype === 'Хөргөгч, хөлдөөгч'
            ? pick(['200 л', '320 л', '400 л', '450 л'])
            : subtype === 'Угаалгын машин'
              ? pick(['6 кг', '7 кг', '9 кг', '12 кг'])
              : `${randInt(20, 90)}×${randInt(15, 70)} см`;
    return {
      brand, model, size,
      // ⚡ Хэрэглэгчийн хүсэлтээр форм нь хялбар (`simpleForm`) — зөвхөн
      //    «Шинэ / Шинэвтэр / Хуучин» сонгоно (брэнд/хэмжээ нь demo өгөгдөлд л байна)
      condition: pick(['Шинэ', 'Шинэ', 'Шинэвтэр', 'Хуучин', 'Хуучин']),
    };
  }
  if (section === 'furniture') {
    // 🛋️ 2026-09-30 (5): «Тавилга» нь ТУСДАА 1-Р ТҮВШНИЙ ХЭСЭГ болов
    //    → брэнд/загвар нь 13 дэд төрөл тус бүрд (`FURNITURE_SUBTYPE_PAIRS`)
    //    ⚠️ Нөөц нь «Бусад» (хэрэглэгчийн жагсаалтын 13 дахь мөр) ✓
    const [brand, model] = pick(FURNITURE_SUBTYPE_PAIRS[subtype] || FURNITURE_SUBTYPE_PAIRS['Бусад']);
    return {
      brand, model,
      // 📏 Материал нь ТАВИЛГЫН төрөлд тохирсон (мод/арьс/даавуу/металл) ✓
      material: pick(FURNITURE_MATERIALS),
      // 📐 Хэмжээ — тавилга нь том эдлэл (`40-260 × 30-200 см`) ✓
      size: `${randInt(40, 260)}×${randInt(30, 200)} см`,
      color: pick(['Цагаан', 'Хар', 'Саарал', 'Бор', 'Беж', 'Цэнхэр', 'Ногоон']),
      // ⚠️ Форм нь хялбар (`simpleForm`) — зөвхөн «Шинэ / Шинэвтэр / Хуучин» сонгоно
      //    (брэнд/материал/хэмжээ/өнгө нь ЗӨВХӨН demo өгөгдөлд — картын
      //    мөрөнд харагдана ✓; ⚠️ 2026-09-30 (2)-оос хойш `attrs` дээр эдгээр
      //    түлхүүр БАЙСААР байгаа тул карт мөр бүрэн харагдана ✓)
      condition: pick(['Шинэ', 'Шинэвтэр', 'Хуучин', 'Хуучин']),
      delivery: pick(['Байгаа', 'Байгаа', 'Тохиролцоно', 'Байхгүй']),
    };
  }
  if (section === 'home') {
    // 🧺 2026-09-30 (5): «Тавилга» (13) нь 🛋️ `furniture` ТУСДАА хэсэг болсны
    //    дараа энд 9 дэд төрөл үлдэв → брэнд/загвар нь тэдгээрт тохирсон ✓
    //    ⚠️ Нөөц нь `HOME_PAIRS_FALLBACK` («Бусад» энэ хэсэгт БАЙХГҮЙ) ✓
    const [brand, model] = pick(HOME_SUBTYPE_PAIRS[subtype] || HOME_PAIRS_FALLBACK);
    // 📐 Хэмжээ нь хэмжигдэхүйц төрөлд тодорхой (хивс 150×200 см, зуух 50×60 см)
    const size = subtype === 'Хивс, дорож, дэвсгэр'
      ? pick(['120×170 см', '150×200 см', '200×290 см', '250×350 см'])
      : subtype === 'Цагаан хэрэглэл, хөнжил, дэр'
        ? pick(['Бэлэн 1.6×2.2 м', 'Бэлэн 2×2.2 м', 'Дэр 50×70 см'])
        : subtype === 'Хөшиг, тюль, бүтээлэг'
          ? pick(['200×250 см', '250×280 см', '300×260 см'])
          : subtype === 'Зуух, пийшин'
            ? pick(['50×60 см', '60×60 см', '60×85 см'])
            : `${randInt(20, 90)}×${randInt(15, 70)} см`;
    return {
      brand, model, size,
      material: pick(HOME_SUBTYPE_MATERIALS[subtype] || HOME_MATERIALS_DEFAULT),
      color: pick(['Цагаан', 'Хар', 'Саарал', 'Бор', 'Беж', 'Цэнхэр', 'Ногоон']),
      // ⚠️ Хэрэглэгчийн хүсэлтээр форм нь хялбар (`simpleForm`) — зөвхөн
      //    «Шинэ / Шинэвтэр / Хуучин» сонгоно (брэнд/материал/хэмжээ нь demo өгөгдөлд л)
      condition: pick(['Шинэ', 'Шинэвтэр', 'Хуучин', 'Хуучин']),
      delivery: pick(['Байгаа', 'Байгаа', 'Тохиролцоно', 'Байхгүй']),
    };
  }
  if (section === 'construction') {
    // 🧱 2026-09-30 (шинэ хэсэг): брэнд/бүтээгдэхүүн нь дэд төрөлд тохирсон
    //    (`CONSTRUCTION_SUBTYPE_PAIRS`) — «Knauf Gyproc» нь «Лифт, урсдаг
    //    шат» төрөлд орохгүй ✓
    const [brand, model] = pick(CONSTRUCTION_SUBTYPE_PAIRS[subtype] || CONSTRUCTION_SUBTYPE_PAIRS['Бусад']);
    return {
      brand, model,
      // 📏 Хэмжээ/савлагаа — дэд төрөл тус бүрийн тип (25 кг уут, 12 мм,
      //    600×600 мм, 16 кВт, 400 кг…) ✓
      size: pick(CONSTRUCTION_SIZE[subtype] || CONSTRUCTION_SIZE_DEFAULT),
      // ⚠️ Форм нь хялбар (`simpleForm`) → ШИНЭ зард зөвхөн «Шинэ / Шинэвтэр / Хуучин»
      //    (брэнд/загвар/хэмжээ нь ЗӨВХӨН demo өгөгдөлд — картад харагдана ✓)
      //    ℹ️ Барилгын материалыг ихэвчлэн ШИНЭЭР зардаг тул «Шинэ» давамгайв
      condition: pick(['Шинэ', 'Шинэ', 'Шинэвтэр', 'Хуучин']),
    };
  }
  if (section === 'equipment') {
    // 🏭 2026-09-30 (шинэ хэсэг): «Juki оёдлын машин» нь «Эрүүл мэндийн
    //    тоног төхөөрөмж» дэд төрөлд орохгүй ✓
    const [brand, model] = pick(EQUIPMENT_SUBTYPE_PAIRS[subtype] || EQUIPMENT_SUBTYPE_PAIRS['Бусад тоног төхөөрөмж']);
    return {
      brand, model,
      // 📏 Хүчин чадал — дэд төрөл тус бүрийн тип (кВт, м³, CH, литр, бар) ✓
      size: pick(EQUIPMENT_SIZE[subtype] || EQUIPMENT_SIZE_DEFAULT),
      // ⚠️ Тоног төхөөрөмж нь ихэвчлэн ХЭРЭГЛЭСЭН (импорт/шилжүүлэг) тул
      //    «Хуучин» давамгайв — үнэ нь төлвөөс ШУУД хамаардаг ✓
      condition: pick(['Шинэ', 'Шинэвтэр', 'Хуучин', 'Хуучин']),
    };
  }
  if (section === 'travel') {
    // 🧳 2026-09-30 (5): «Аяллын хэрэгсэл» (12) нь «**Аяны бараа**» нэртэй
    //    ТУСДАА 1-Р ТҮВШНИЙ ХЭСЭГ болов → брэнд/загвар нь 12 дэд төрөл тус
    //    бүрд (`TRAVEL_SUBTYPE_PAIRS`) ⚠️ Нөөц нь «Бусад» (12 дахь мөр) ✓
    const [brand, model] = pick(TRAVEL_SUBTYPE_PAIRS[subtype] || TRAVEL_SUBTYPE_PAIRS['Бусад']);
    return {
      brand, model,
      // 📏 Хэмжээ — дэд төрөл тус бүрийн тип (чемодан: л/см, майхан: хүн,
      //    power bank: mAh, дуран: томруулалт) ✓
      size: pick(TRAVEL_SIZE[subtype] || HOBBY_SIZE_DEFAULT),
      condition: pick(['Шинэ', 'Шинэвтэр', 'Хуучин', 'Хуучин']),
      delivery: pick(['Байгаа', 'Байгаа', 'Тохиролцоно', 'Байхгүй']),
    };
  }
  if (section === 'hobby') {
    // ⚽ 2026-09-30 (5): «Аяллын хэрэгсэл» (12) нь 🧳 `travel` ТУСДАА хэсэг
    //    болсны дараа энд 6 дэд төрөл үлдэв → брэнд/загвар нь тэдгээрт
    //    тохирсон (`HOBBY_SUBTYPE_PAIRS`) ✓
    //    ⚠️ Нөөц нь `HOBBY_PAIRS_FALLBACK` болов («Бусад» энэ хэсэгт
    //    БАЙХГҮЙ — тэр нь 🧳 `travel` рүү шилжсэн) — таарахгүй түлхүүр гарвал
    //    «Майхан, сүүдрэвч» төрөлд «Аксессуар» гэж гарахгүй ✓
    const [brand, model] = pick(HOBBY_SUBTYPE_PAIRS[subtype] || HOBBY_PAIRS_FALLBACK);
    return {
      brand, model,
      // 📏 Хэмжээ — дэд төрөл тус бүрийн тип (дугуй: инч, ном: A4,
      //    пиано: товчлуур, загас: м) ✓
      size: pick(HOBBY_SIZE[subtype] || HOBBY_SIZE_DEFAULT),
      condition: pick(['Шинэ', 'Шинэвтэр', 'Хуучин', 'Хуучин']),
      delivery: pick(['Байгаа', 'Байгаа', 'Тохиролцоно', 'Байхгүй']),
    };
  }
  if (section === 'services') {
    // 🗑 2026-10-05 (45): 🧭 `workMode` («Үйлчилгээний хэлбэр») ба 💵 `priceUnit`
    //    («Үнийн хэлбэр») нь форм/шүүлт/карт/дэлгэрэнгүйгээс БҮРЭН ХАСАГДАВ
    //    (хэрэглэгчийн хүсэлт: «…хасна уу, Дахин ашиглахгүй») ⇒ демо өгөгдөл
    //    ч үүсгэхгүй ✓ (⚠️ форм дээр байхгүй талбар демо зарт байх нь
    //    «форм ≠ карт» зөрүү үүсгэдэг байв ✗)
    return {
      company: pick(SERVICE_NAMES),
      coverage: pick(['Улаанбаатар, бүх дүүрэг', 'Улаанбаатар, төв дүүргүүд', 'Орон даяар', 'Сонгосон дүүрэг']),
      experience: `${randInt(1, 20)} жил`,
      availability: pick(['Ажлын өдөр', 'Ажлын өдөр', 'Амралтын өдөр ч', '24/7']),
    };
  }
  return {}; // 🏠 үл хөдлөх — талбарууд нь тусдаа БАГАНА дээр
}

/** Хэсэг тус бүрийн ТАЙЛБАР (монгол хэлээр, реалист) */
const TEXTS = {
  auto: [
    'Хөдөлгүүр, хурдны хайрцаг асуудалгүй. Улирлын бусдаа засвар хийлгэсэн.',
    'Нэг эзэнтэй, бүх бичиг баримт бүрэн. Давхар дугуйтай.',
    'Тос, шүүр цэвэрхэн солигдсон. Урд хойд дугуй шинэ.',
    'Гааль, гадаад хөдөлгөөнгүй. Хот дотор явсан жижиг машин.',
    'Бэлэн мөнгө болон лийзингээр авч болно. Үнэ тохиролцоно.',
  ],
  jobs: [
    'Тогтмол цалин, нийгмийн даатгал, үдийн хоолтой. Туршлагатай хүнийг урьж байна.',
    'Ажлын цаг 09:00-18:00, Даваа-Баасан. Шинэ ажилтанд сургалт бий.',
    'Мэргэжлийн өсөлтийн боломжтой, ээлжлэн ажиллах хуваарьтай.',
    'Ур чадвараа харуулах боломжтой, залуу хамт олонтой.',
    'Гэрээт ажил, дахин сунгах боломжтой. Эхлэх хугацаа тохиролцоно.',
  ],
  computers: [
    'Баталгаат хугацаатай, бүрэн комплект. Хайрцаг баримт бий.',
    'Хөнгөн, батерей сайн бариалттай. Сурагч, оюутанд тохиромжтой.',
    'Программууд суулгасан, ажиллахад бэлэн.',
    'Гэрээсээ ажиллахад тохиромжтой, чимээгүй ажилладаг.',
    'Шинэ үнээс хямд, хэрэглэсэн хугацаа бага.',
  ],
  furniture: [
    'Гэр бүлд тохиромжтой, цэвэрхэн хэрэглэсэн. Зураас, гэмтэлгүй.',
    'Шинэ байдалтай, бага зэрэг хэрэглэсэн. Хотын төвөөс хүргэлт хийнэ.',
    'Нүүж байгаа тул зарна. Бүрэн бүтэн, задлахад хялбар.',
    'Чанартай материал, удаан эдэлгээтэй. Үнэ тохиролцоно.',
    'Орон сууцны лифтээр гаргах боломжтой. Асуулт байвал холбогдоно уу.',
  ],
  home: [
    'Цэвэрхэн, гэмтэлгүй. Хэрэглэгдэж байсан ч асуудалгүй.',
    'Хотын төвөөс хүргэлт хийж өгнө. Үнэ тохиролцоно.',
    'Шинэ байдалтай, бага зэрэг хэрэглэсэн.',
    'Гэр бүлд тохиромжтой. Зарж байгаа шалтгаан нь нүүх.',
    'Чанартай материал, удаан эдэлгээтэй.',
  ],
  travel: [
    'Аялалд бэлэн, гэмтэлгүй. Ашигласан удаа цөөн, хайрцаг нь бий.',
    'Кемпийн улирал эхлэхээс өмнө зарж байна. Бүрэн комплект.',
    'Гадаад аялалд бэлтгэсэн, чанартай бараа. Баталгаат хугацаатай.',
    'Хотын төвөөс хүргэлт хийнэ. Үнэ тохиролцоно.',
    'Шинэчилж байгаа тул зарна. Асуулт байвал холбогдоно уу.',
  ],
  hobby: [
    'Бага зэрэг хэрэглэсэн, асуудалгүй ажиллаж байгаа. Шалтгаан: шинэчилж байгаа.',
    'Хотын төвөөс хүргэлт хийж өгнө. Үнэ тохиролцоно.',
    'Шинэ байдалтай, баримт бичигтэй. Хайрцаг нь бий.',
    'Цуглуулгадаа нэмэх эсвэл хэрэглэхэд тохиромжтой, чанартай.',
    'Хоббидоо цаг гаргадаг хүнээс зарна. Асуулт байвал холбогдоно уу.',
  ],
  electric: [
    'Бүрэн ажиллагаатай, гэмтэлгүй. Баталгаат хугацаатай (баримт бий).',
    'Бага зэрэг хэрэглэсэн, шинэ байдалтай. Хайрцаг, баримт нь бүтэн.',
    'Хотын төвөөс хүргэлт хийж өгнө. Үнэ тохиролцоно.',
    'Шалтгаан: шинэчилж байгаа. Асуулт байвал холбогдоно уу.',
    'Энерги хэмнэлттэй, чимээгүй ажилладаг. Туршиж үзэж болно.',
  ],
  construction: [
    'Шинэ, агуулахаас. Хүргэлттэй, баримт бичигтэй.',
    'Бөөний үнээр, олон тоо ширхэгтэй. Нэхэмжлэх гаргаж өгнө.',
    'Чанартай материал, үйлдвэрийн баталгаатай.',
    'Барилгын талбай руу хүргэж өгнө. Үнэ тохиролцоно.',
    'Илүүдэл материалаа зарна. Хэмжээ, тоо ширхэг бүрэн.',
  ],
  equipment: [
    'Ажиллагаатай, туршиж үзэж болно. Баримт бичигтэй.',
    'Гаднаас импортолсон, бага ажилласан. Үнийн санал тохиролцоно.',
    'Үйлдвэр шинэчилж байгаа тул зарна. Суурилуулалт хийж өгнө.',
    'Засвар үйлчилгээ хийгдсэн, сэлбэг нь бий.',
    'Түрээслэх боломжтой ч зарна. Харилцагчид сургалт өгнө.',
  ],
  services: [
    'Туршлагатай мэргэжилтэн ажиллана. Үнийн санал үнэгүй.',
    'Хурдан шуурхай, баталгаатай ажил. Гэрээ байгуулна.',
    'Бүх дүүрэгт ажиллана. Цаг тохиролцож уулзана.',
    'Мэргэжлийн багаж хэрэгсэлтэй. Ажлын дараа баталгаа өгнө.',
    '24/7 холбогдох боломжтой. Шөнийн ажил ч хийж өгнө.',
  ],
};

/** Тайлбар (төгсгөлд нь MARKER — давхардалгүй дахин ажиллуулахын тулд) */
/**
 * 🚗 «АВТО ТҮРЭЭСЛҮҮЛНЭ» зарын ТАЙЛБАР (2026-09-28, хэрэглэгчийн хүсэлт).
 * ⚠️ Энгийн автозарын текст («давхар дугуйтай, гааль…») нь ТҮРЭЭСИЙН зард
 *    утгагүй (түрээслэгч үнэ/хугацаа/жолооч/баримт сонирхдог) ✗
 */
const RENTAL_TEXTS = [
  'Өдөр болон сараар түрээслүүлнэ. Жолоочтой болон жолоочгүй сонголттой.',
  'Хот дотор болон орон нутгийн аялалд түрээслүүлнэ. Даатгал, техникийн үзлэгтэй.',
  'Гэрээт байгууллагад сарын хөлсөөр түрээслүүлнэ. НӨАТ-тай гэрээ хийж болно.',
  'Барьцаа хөрөнгөтэй, шатахуун хэрэглэсэн хэмжээгээрээ төлнө. Бензин хийлгэж өгнө.',
  'Аялал жуулчлалын улиралд хөлсөөр түрээслүүлнэ. Гадаад жуулчид тохиромжтой.',
];

/** Нэг зарын тайлбар (секц/дэд төрлөөс хамаарна) */
function makeDescription(section, subtype) {
  const body = section === 'real-estate'
    ? pick((RE_CFG[subtype] || RE_CFG['Орон сууц']).texts)
    : section === 'auto' && subtype === 'Авто түрээслүүлнэ'
      ? pick(RENTAL_TEXTS)
      : pick(TEXTS[section]);
  return `${body}\n\n${MARKER}`;
}

/** Нэг зарын мөр бүтээх
 *  ⚠️ 2026-10-04 (40): `export` — `scripts/seed-per-category.mjs` (хэсэг/категори
 *     бүрт 3 зар) нь ЯГ ИЖИЛ үнэ/attrs/тайлбарын логикийг дахин ашиглана
 *     (хуулбар код → үнэ/талбарын дүрэм 2 газар зөрөх эрсдэлээс сэргийлэв) ✓
 *  @param {string} section хэсгийн value (`real-estate` …)
 *  @param {string} subtype дэд төрөл (үл хөдлөхөд `PROPERTY_TYPE_DEFS` утга)
 *  @param {number} k хувилбарын дугаар (0…9) — ⚠️ үл хөдлөхөд `k % 2` нь
 *     `category`-г тодорхойлно (тэгш = sell, сондгой = rent) ✓
 */
export function buildRow(section, subtype, k) {
  const loc = makeLocation();
  const isRE = section === 'real-estate';
  // ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөхөд — бусад хэсэгт `sell`
  const category = isRE ? (k % 2 === 0 ? 'sell' : 'rent') : 'sell';
  const attrs = makeAttrs(section, subtype);

  let price;
  let priceType = 'total';
  let rooms = 0;
  let area = 0;
  let extra = {};

  if (isRE) {
    const p = RE_CFG[subtype] || RE_CFG['Орон сууц'];
    const [lo, hi] = p[category] || p.sell;
    price = money(lo, hi);
    priceType = category === 'rent' ? 'month' : 'total';
    rooms = randInt(p.rooms[0], p.rooms[1]);
    area = Number((p.area[0] + rand() * (p.area[1] - p.area[0])).toFixed(1));
    if (p.apartment) {
      extra = {
        build_year: randInt(1995, 2023),
        floor: randInt(1, 16),
        total_floors: randInt(4, 20),
        balconies: randInt(1, 4),
        has_garage: rand() > 0.4,
      };
    }
    if (p.floors && !p.apartment) extra = { ...extra, floor: randInt(1, 5), total_floors: randInt(2, 12) };
    if (p.bathrooms || rooms >= 3) extra = { ...extra, bathrooms: randInt(1, 3) };
  } else if (section === 'jobs') {
    // ⚠️ Ажлын зарт үнэ = ЦАЛИН (сарын) — карт дээр ₮-ээр харагдана.
    //    ⚠️ 2026-09-30 (3): цалин нь дэд төрлөөс хамаарна — `makeAttrs` дотор
    //    `JOB_SALARY`-аас тооцоологдсон тул энд зөвхөн `attrs.salary`-г авна ✓
    //    («Цагийн ажил» нь 400 мянга–2 сая, «Гүйцэтгэх удирдлага» 5–35 сая)
    price = Number(attrs.salary);
    priceType = 'month';
  } else if (section === 'auto') {
    // 🚗 ТҮРЭЭС (2026-09-28): «Авто түрээслүүлнэ» нь ЗАРАХ үнэ БИШ —
    //    сарын хөлс (ж: Prius 1.2–2.5 сая ₮) байх ёстой, эс бөгөөс
    //    «Prius 250 сая» гэж түрээсийн зар дээр гарч төөрөгдүүлнэ ✗
    if (subtype === 'Авто түрээслүүлнэ') {
      price = money(900e3, 6e6);
      priceType = 'month';
    } else {
      // ⚠️ Үнэ нь МАШИНЫ ЗЭРЭГЛЭЛЭЭС хамаарна — «Mazda Demio» 300 сая байх нь
      //    төөрөгдүүлнэ. Тиймээс загварын нэрээр 3 түвшинд хуваана.
      const m = `${attrs.brand} ${attrs.model}`;
      const tier = /Land Cruiser|LX \d|G \d|X5|Patrol|G80|Discovery|Highlander|Hilux|Model/.test(m)
        ? [60e6, 400e6] // 🚙 Том жийп / премиум
        : /Prius|Aqua|Fit|Demio|Swift|Niva|Cruze|Focus|Patriot|K5|Atenza|320i/.test(m)
          ? [9e6, 55e6] // 🚗 Жижиг/хямд
          : [22e6, 170e6]; // 🚙 Дунд зэрэглэл
      price = money(tier[0], tier[1]);
    }
  } else if (section === 'computers') {
    // 💻 2026-09-29: үнэ нь дэд төрлөөс хамаарна (хулгана 40 мянга ↔ сервер
    //    15 сая) → `PC_PRICE` хүснэгтээс; Notebook брэнд ба «Бусад» нь
    //    `PC_PRICE_DEFAULT` (ноутбукийн үнэ) ✓
    const [lo, hi] = PC_PRICE[subtype] || PC_PRICE_DEFAULT;
    price = money(lo, hi);
  } else if (section === 'electric') {
    // ⚡ 2026-09-30: үнэ нь дэд төрлөөс хамаарна (микро печь 200 мянга ↔ ТВ
    //    9 сая) → `ELECTRIC_PRICE` хүснэгтээс; «Бусад» нь DEFAULT ✓
    const [lo, hi] = ELECTRIC_PRICE[subtype] || ELECTRIC_PRICE_DEFAULT;
    price = money(lo, hi);
  } else if (section === 'furniture') {
    // 🛋️ 2026-09-30 (5): үнэ нь дэд төрлөөс хамаарна (толь 80 мянга ↔ зочны
    //    өрөөний иж бүрдэл 12 сая) → `FURNITURE_PRICE`; «Бусад» DEFAULT ✓
    const [lo, hi] = FURNITURE_PRICE[subtype] || FURNITURE_PRICE_DEFAULT;
    price = money(lo, hi);
  } else if (section === 'home') {
    // 🧺 2026-09-30 (5): «Тавилга» тусдаа хэсэг болсны дараа энд 9 дэд төрөл
    //    үлдэв — үнэ нь дэд төрлөөс хамаарна (чийдэн 30 мянга ↔ зуух 3.5 сая)
    //    → `HOME_PRICE` хүснэгтээс авна ✓
    const [lo, hi] = HOME_PRICE[subtype] || HOME_PRICE_DEFAULT;
    price = money(lo, hi);
  } else if (section === 'construction') {
    // 🧱 2026-09-30: үнэ нь дэд төрлөөс хамаарна (хайрцаг 10 мянга ↔ лифт
    //    150 сая) → `CONSTRUCTION_PRICE` хүснэгтээс; «Бусад» нь DEFAULT ✓
    const [lo, hi] = CONSTRUCTION_PRICE[subtype] || CONSTRUCTION_PRICE_DEFAULT;
    price = money(lo, hi);
  } else if (section === 'equipment') {
    // 🏭 2026-09-30: үнэ нь дэд төрлөөс хамаарна (термо цаас 100 мянга ↔
    //    уул уурхайн тоног төхөөрөмж 900 сая) → `EQUIPMENT_PRICE` ✓
    const [lo, hi] = EQUIPMENT_PRICE[subtype] || EQUIPMENT_PRICE_DEFAULT;
    price = money(lo, hi);
  } else if (section === 'travel') {
    // 🧳 2026-09-30 (5): үнэ нь дэд төрлөөс хамаарна (power bank 30 мянга ↔
    //    завь 8 сая) → `TRAVEL_PRICE` хүснэгтээс; «Бусад» нь DEFAULT ✓
    const [lo, hi] = TRAVEL_PRICE[subtype] || FURNITURE_PRICE_DEFAULT;
    price = money(lo, hi);
  } else if (section === 'hobby') {
    // ⚽ 2026-09-30 (5): 6 дэд төрөл үлдсэн — үнэ нь ТӨРЛӨӨС хэлбэлзэнэ
    //    (ном 10 мянга, пиано 8 сая) → `HOBBY_PRICE` хүснэгтээс авна.
    const [lo, hi] = HOBBY_PRICE[subtype] || [50e3, 3e6];
    price = money(lo, hi);
  } else if (section === 'services') {
    price = money(50e3, 5e6);
  } else {
    price = money(30e3, 6e6);
  }

  return {
    section,
    category,
    property_type: subtype,
    ...loc,
    price,
    price_type: priceType,
    rooms,
    area,
    description: makeDescription(section, subtype),
    phone: `976${String(DEMO_PHONE).replace(/\D/g, '').slice(-8)}`,
    contact_name: pick(NAMES),
    images: makeImages(section),
    attrs,
    ...extra,
  };
}


// ---- Ажиллуулах ---------------------------------------------------------
// ⚠️ 2026-10-04 (40): `scripts/seed-per-category.mjs` нь энэ файлын `buildRow`-ыг
//    ДАХИН АШИГЛАХ болсон тул `import` хийхэд үндсэн ажиллагаа (DB-д устгах/
//    оруулах) АЖИЛЛАХГҮЙ байх ЁСТОЙ ⇒ зөвхөн ШУУД ажиллуулахад
//    (`node scripts/seed-sections.mjs …`) л IIFE-г дуудна ✓
//    (`npm run seed:sections` — өөрчлөгдөөгүй, зөвхөн import-ийн үед хамгаална)
const IS_DIRECT_RUN =
  !!process.argv[1] && /seed-sections\.mjs$/.test(process.argv[1]);
if (IS_DIRECT_RUN) (async () => {
  const admin = getAdminClient();

  // ⚠️ 2026-10-03 (10): `jobs`-ийн [компани, тушаал] хосуудын шалгалт УСТСАН —
  //    🏢 `company` ба 💼 `position` нь ажлын зарын талбаруудаас ХАСАГДСан тул
  //    `JOB_SUBTYPE_PAIRS` хүснэгт ХЭРЭГГҮЙ БОЛОВ ✓ (дэд төрөл ↔ цалингийн
  //    `JOB_SALARY` нь нөөц утгатай (`JOB_SALARY_DEFAULT`) тул шалгалт шаардахгүй)
  // ⚠️ 2026-09-30 (5): [брэнд, загвар] хосуудын түлхүүр нь `getSubtypes(section)`-тай
  //    ЯГ ИЖИЛ эсэхийг шалгана (⚠️ 2026-09-30 (4)-ийн `hobby`-гийн шалгалтыг
  //    «хос-driven» 4 хэсэгт НЭГДСЭН хэлбэрээр ГАНААРГУЙ болгов). Зөрвөл
  //    `makeAttrs` нь тухайн хэсгийн НӨӨЦ хос руу буцаж, зар өөр төрөлдөө
  //    тохирохгүй брэнд/загвартай гарна ✗ (анхааруулга өгч үргэлжлүүлнэ —
  //    шинэ дэд төрөл нэмэхэд seed-ийг блоклохгүй ✓; `jobs`-той ижил загвар)
  const PAIR_CHECKS = [
    ['furniture', FURNITURE_SUBTYPE_PAIRS],  // 🛋️ 2026-09-30 (5): 13 дэд төрөл
    ['home', HOME_SUBTYPE_PAIRS],            // 🧺 2026-09-30 (5): 9 дэд төрөл
    ['travel', TRAVEL_SUBTYPE_PAIRS],        // 🧳 2026-09-30 (5): 12 дэд төрөл
    ['hobby', HOBBY_SUBTYPE_PAIRS],          // ⚽ 2026-09-30 (5): 6 дэд төрөл
  ];
  for (const [sec, pairs] of PAIR_CHECKS) {
    if (!ACTIVE_SECTIONS.some((s) => s.value === sec)) continue;
    const sub = new Set(getSubtypes(sec));
    const missing = [...sub].filter((s) => !pairs[s]);
    const extra = Object.keys(pairs).filter((s) => !sub.has(s));
    if (missing.length || extra.length) {
      console.warn(`⚠️ \`${sec}\`-ийн хосууд ба \`${sec}.subtypes\` зөрүүтэй байна:`);
      if (missing.length) console.warn(`   хос БАЙХГҮЙ : ${missing.join(' · ')}`);
      if (extra.length) console.warn(`   илүү түлхүүр: ${extra.join(' · ')}`);
    }
  }

  // ⚠️ DRY_RUN=1 → DB-д ХҮРЭХГҮЙ, зөвхөн үлгэр мөрүүдийг харуулна
  if (process.env.DRY_RUN === '1') {
    console.log('🧪 DRY RUN — DB-д юу ч бичихгүй\n');
    let total = 0;
    // ⚠️ `--section=` үед ЗӨВХӨН тэр хэсгийг харуулна (бодит бичилттэй ижил)
    for (const sec of ACTIVE_SECTIONS) {
      const subtypes = getSubtypes(sec.value);
      total += subtypes.length * PER_SUBTYPE;
      console.log(`${sec.icon} ${sec.label} — ${subtypes.length} дэд төрөл × ${PER_SUBTYPE}`);
    }
    console.log(`\nНИЙТ: ${total} зар\n`);
    const samples = [
      ['real-estate', 'Орон сууц', 0], ['real-estate', 'Орон сууц', 1],
      ['auto', 'Суудлын машин', 0], ['auto', 'Жийп, SUV', 1],
      ['jobs', 'МТ, харилцаа холбоо', 0], ['jobs', 'Гүйцэтгэх удирдлага', 1],
      ['jobs', 'Цагийн ажил', 2], ['computers', 'Apple', 0],
      ['computers', 'Иж бүрэн компьютер', 1], ['computers', 'Чихэвч', 2],
      // 🛋️ Тавилга / 🧺 Гэр ахуйн бараа (2026-09-30 (5)-д 2 хэсэг болов)
      ['furniture', 'Буйдан, кресло', 0], ['furniture', 'Зочны өрөөний', 1],
      ['furniture', 'Бусад', 2], ['home', 'Хивс, дорож, дэвсгэр', 0],
      ['home', 'Зуух, пийшин', 1], ['services', 'Сантехник', 0],
      ['electric', 'Телевизор (65 инч)', 0], ['electric', 'Угаалгын машин', 1],
      ['construction', 'Тоосго, бетон, блок', 0], ['construction', 'Ухаалаг цоож', 1],
      ['equipment', 'Хэвлэх тоног төхөөрөмж', 0], ['equipment', 'Фото студийн тоног төхөөрөмж', 1],
      // 🧳 «Аяны бараа» — 1-р түвшний ШИНЭ хэсэг (2026-09-30 (5))
      ['travel', 'Майхан, сүүдрэвч', 0], ['travel', 'Аяны гэрэл, power bank', 1],
      ['travel', 'Бусад', 2],
      // ⚽ Аялал, Спорт, Хобби — 6 хавтгай дэд төрөл (2026-09-30 (5))
      ['hobby', 'Унадаг дугуй, сэлбэг', 0], ['hobby', 'Загас ан агнуур', 1],
    ];
    for (const [s, st, k] of samples) {
      const r = buildRow(s, st, k);
      console.log(`--- ${s} / ${st} #${k} ---`);
      console.log(`   категори: ${r.category}  үнэ: ${r.price.toLocaleString('en-US')} ₮ (${r.price_type})`);
      console.log(`   байршил : ${r.city} / ${r.district || '—'} / ${r.khoroo || '—'}`);
      console.log(`   rooms/area: ${r.rooms} / ${r.area}   зураг: ${r.images.length}`);
      console.log(`   attrs   : ${JSON.stringify(r.attrs)}`);
      console.log(`   тайлбар : ${r.description.split('\n')[0].slice(0, 60)}…`);
    }
    return;
  }

  // ⚠️ 0016 шалгах — багана байхгүй бол ойлгомжтой мессеж өгнө
  const probe = await admin.from('listings').select('section, attrs').limit(1);
  if (probe.error) {
    console.error('❌ `listings.section` / `listings.attrs` байхгүй байна.');
    console.error('   → supabase/migrations/0016_listing_sections.sql-ийг SQL Editor-т ажиллуулна уу.');
    process.exit(1);
  }

  const user = await findUserByPhone(DEMO_PHONE);
  if (!user) {
    console.error(`❌ ${DEMO_PHONE} дугаартай хэрэглэгч олдсонгүй.`);
    console.error('   → node scripts/seed-supabase.js эсвэл бүртгүүлсний дараа дахин ажиллуулна уу.');
    process.exit(1);
  }
  console.log(`👤 Эзэн: ${(user.user_metadata && user.user_metadata.name) || '(нэргүй)'} (${DEMO_PHONE})\n`);

  // 1) Өмнөх demo заруудыг устгах (зөвхөн MARKER-тай → давхардахгүй)
  //    ⚠️ `--section=auto` үед ЗӨВХӨН авто хэсгийн демо заруудыг устгана
  //       (бусад хэсгийн демо өгөгдөл хэвээр үлдэнэ ✓)
  let findQ = admin.from('listings').select('id').like('description', `%${MARKER}%`);
  if (ONLY_SECTION) findQ = findQ.eq('section', ONLY_SECTION);
  const { data: old, error: findErr } = await findQ;
  if (findErr) {
    console.error('❌ Хуучин demo заруудыг хайхад алдаа:', findErr.message);
    process.exit(1);
  }
  if (old && old.length) {
    for (let i = 0; i < old.length; i += 200) {
      const ids = old.slice(i, i + 200).map((o) => o.id);
      const { error } = await admin.from('listings').delete().in('id', ids);
      if (error) { console.error('❌ Устгахад алдаа:', error.message); process.exit(1); }
    }
    console.log(`🗑  Өмнөх ${old.length} demo зарыг устгав\n`);
  }

  // 2) Мөрүүд үүсгэх — 12 хэсэг × дэд төрөл бүр × 10
  const rows = [];
  const plan = [];
  for (const sec of ACTIVE_SECTIONS) {
    const subtypes = getSubtypes(sec.value);
    plan.push({ section: sec.value, label: sec.label, icon: sec.icon, subtypes: subtypes.length });
    for (const st of subtypes) {
      for (let k = 0; k < PER_SUBTYPE; k += 1) rows.push(buildRow(sec.value, st, k));
    }
  }
  console.log('📋 Төлөвлөгөө:');
  for (const p of plan) {
    console.log(`   ${p.icon} ${p.label.padEnd(16)} ${String(p.subtypes).padStart(2)} дэд төрөл × ${PER_SUBTYPE} = ${String(p.subtypes * PER_SUBTYPE).padStart(3)} зар`);
  }
  console.log(`\n📦 НИЙТ ${rows.length} зар үүсгэж байна...`);

  // 3) 50-аар багцлан оруулах
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50).map((r) => ({ ...r, user_id: user.id }));
    const { error } = await admin.from('listings').insert(chunk);
    if (error) {
      console.error(`\n❌ Оруулахад алдаа (${i}-ээс):`, error.message);
      if (/column|schema cache/i.test(error.message)) {
        console.error('   → supabase/migrations/0016_listing_sections.sql-ийг ажиллуулна уу.');
      }
      // ⚠️ 2026-09-27: `hobby` хэсэг нэмэгдсэн — CHECK constraint хуучин бол
      //    `23514 check constraint "listings_section_valid"` гэж гарна
      // ⚠️ 2026-09-30: ⚡ `electric` хэсэг нэмэгдэв (`0021_section_electric.sql`)
      if (/listings_section_valid|check constraint/i.test(error.message)) {
        // ⚠️ 2026-09-30 (5): хамгийн СҮҮЛИЙН migration нь 🛋️ `furniture` +
        //    🧳 `travel`-ийг нэмсэн 0026 → CHECK-д 12 утга байх ЁСТОЙ ✓
        console.error('   → supabase/migrations/0026_furniture_travel_sections.sql-ийг'
          + ' ажиллуулна уу (🛋️ «Тавилга» ба 🧳 «Аяны бараа» хэсгийг DB'
          + ' зөвшөөрөхгүй байна — CHECK constraint 12 утгатай болно).');
        console.error('   → эсвэл supabase/migrations/0021_section_electric.sql-ийг ажиллуулна уу.'
          + ' (⚡ «Цахилгаан бараа» хэсгийг DB зөвшөөрөхгүй байна).');
        console.error('   → эсвэл supabase/migrations/0019_section_hobby.sql'
          + ' (⚽ «Аялал, Спорт, Хобби» — 2026-09-30 (4)-д нэр солигдов).');
        // ⚠️ 2026-09-30 (2): 🧱 `construction` + 🏭 `equipment` нь ШИНЭ 2 хэсэг
        //    → CHECK constraint-д тэр үед 10 утга байх ЁСТОЙ байв ✓
        console.error('   → эсвэл supabase/migrations/0023_section_construction_equipment.sql'
          + ' (🧱 «Барилгын материал» ба 🏭 «Тоног төхөөрөмж» хэсгийг DB'
          + ' зөвшөөрөхгүй байна).');
      }
      // ⚠️ 2026-09-30: `0014_listing_dedupe.sql` орсон бол demo seed нь ТРИГГЕРТ
      //    тулгарна — demo бүх зар НЭГ хэрэглэгчээр (user_id) ордог тул
      //    SPAM хязгаар (24 цагт 3 ШИНЭ зар) 4 дэх мөрөнд хориглоно. Мөн seed нь
      //    хуучин demo заруудаа УСТГАДАГ (⇒ `listing_history` tombstone) тул
      //    давхцсан `dedupe_key` үед «саяхан устгасан» дүрэм хориглоно.
      //    ⚠️ АНХААР: урьдчилсан нөхцөл нь ЗӨВ дараалал — migration/seed ЭХЛЭЭД,
      //    `0014` ДАРАА. Дэлгэрэнгүй: README «Demo seed-тэй ЗӨРЧИЛ».
      if (/хязгаар|саяхан устгасан|аль хэдийн байна|ижил зар/i.test(error.message)) {
        console.error('   → supabase/migrations/0014_listing_dedupe.sql (давхардал/SPAM'
          + ' хамгаалалт) demo seed-ийг хориглож байна.');
        console.error('   → SQL Editor-т триггерийг ТҮР хав (seed-ийн дараа ЗААВАЛ асаана):');
        console.error('        alter table public.listings disable trigger listings_prevent_duplicate;');
        console.error('        --  ... seed дахин ажиллуулна ...');
        console.error('        alter table public.listings enable trigger listings_prevent_duplicate;');
      }
      process.exit(1);
    }
    console.log(`   ✓ ${Math.min(i + 50, rows.length)}/${rows.length}`);
  }

  // 4) Дүн — DB-ээс бодит тоог дахин уншина
  // ⚠️ 2026-09-29: PostgREST нь нэг хүсэлтэд ХАМГИЙН ИХ 1000 мөр буцаана
  //    (анхдагч `max-rows`) — `select()`-ийг нэг удаа дуудвал 1000+ зартай үед
  //    дүн ХУДАЛ гарна (ж: 450 зартай 💻 хэсэг «118 зар (14 дэд төрөл)» ✗).
  //    Тиймээс `.range()`-ээр ХУУДАСЛАЖ бүх мөрийг уншина ✓
  const all = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data: page, error } = await admin
      .from('listings')
      .select('section, property_type, category')
      .range(from, from + PAGE - 1);
    if (error) { console.error('❌ Дүн уншихад алдаа:', error.message); process.exit(1); }
    all.push(...(page || []));
    if (!page || page.length < PAGE) break;
  }
  const stat = {};
  for (const r of all) {
    const s = r.section || 'real-estate';
    stat[s] = stat[s] || { total: 0, types: {} };
    stat[s].total += 1;
    stat[s].types[r.property_type] = (stat[s].types[r.property_type] || 0) + 1;
  }
  console.log('\n=== ХЭСЭГ ТУС БҮРИЙН НИЙТ ЗАР ===');
  for (const sec of SECTIONS) {
    const v = stat[sec.value] || { total: 0, types: {} };
    console.log(`  ${sec.icon} ${sec.label.padEnd(16)} ${String(v.total).padStart(4)} зар (${Object.keys(v.types).length} дэд төрөл)`);
  }
  console.log(`\n🎉 DB-д нийт ${all.length} зар байна`);
  console.log('👉 http://localhost:3000 — хэсэг дээр дарж дэд төрлүүдийн тоог харна уу');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Алдаа:', (err && err.message) || err);
  process.exit(1);
});

