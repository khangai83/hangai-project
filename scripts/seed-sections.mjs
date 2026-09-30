// ============================================================
// seed-sections.mjs — ХЭСЭГ БҮР, ДЭД ТӨРӨЛ БҮРТ 10 ЖИШЭЭ ЗАР
//
// Ажиллуулах:  npm run seed:sections
//              npm run seed:sections -- 99112233   (өөр эзний нэр дээр)
//
// • 8 хэсэг × дэд төрөл бүр × 10 зар (unegui.mn шиг олон төрөл)
// • Хэсэг тус бүрд ТОХИРСОН талбарууд (`attrs` jsonb) —
//   авто: брэнд/загвар/он/гүйлт/түлш; ажил: компани/цалин/туршлага;
//   компьютер: CPU/RAM/SSD; бараа: материал/хэмжээ; үйлчилгээ: хэлбэр/цаг;
//   ⚡ цахилгаан бараа: брэнд/загвар/хэмжээ (2026-09-30)
// • Үл хөдлөх нь ХУУЧИН 20 SVG зургийг ашиглана; бусад хэсэгт `images: []`
//   → карт нь ХЭСГИЙН ICON-ыг placeholder болгож харуулна (🚗 💼 💻 🛋️ ⚡ 🛠️)
// • ⚠️ Дахин ажиллуулахад ДАВХАРДАХГҮЙ — зөвхөн `#demo-heseg10` тэмдэгтэй
//   мөрүүдийг устгаад дахин үүсгэнэ (хуучин `#demo-turul10`-ыг ХӨНДӨХГҮЙ)
// • ⚠️ 0016_listing_sections.sql ЗААВАЛ ажилласан байх ёстой
//   (`listings.section` ба `listings.attrs` багана)
// ============================================================
import { createRequire } from 'node:module';
import {
  SECTIONS, getSubtypes, CAR_BRANDS, CITIES, getDistricts, getKhoroos,
  COMPUTER_SUBTYPE_GROUPS,   // 💻 Notebook бүлгийн брэндүүд (2026-09-29)
} from '../lib/locationData.js';

const require = createRequire(import.meta.url);
const { getAdminClient, findUserByPhone } = require('../lib/authServer');

const MARKER = '#demo-heseg10';
const PER_SUBTYPE = 10;
const DEMO_PHONE = process.argv[2] || '88093663';
const IMG_COUNT = 20; // public/uploads/property-N.svg

/**
 * `npm run seed:sections -- 88093663 --section=auto`
 * → ЗӨВХӨН авто хэсгийн демо зарыг шинэчилнэ (2026-09-28).
 * ⚠️ ЯАГААД: 8 хэсэг × дэд төрөл бүр × 10 ≈ 900 зарыг дахин үүсгэх шаардлагагүй —
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

/** Компани + албан тушаал (ажлын зар) */
const JOB_PAIRS = [
  ['Мобиком', 'Программист'], ['Скайтел', 'Системийн админ'],
  ['Юнител', 'Борлуулалтын менежер'], ['Хаан банк', 'Нягтлан бодогч'],
  ['Голомт банк', 'Зээлийн мэргэжилтэн'], ['Төрийн банк', 'Кассчин'],
  ['Монголын төмөр зам', 'Инженер'], ['Эрдэнэс Тавантолгой', 'Уурхайн ажилчин'],
  ['АПУ ХК', 'Техникч'], ['Мишээл ХХК', 'Жолооч'],
  ['Номин ХХК', 'Дэлгүүрийн менежер'], ['Эрмил ХХК', 'Худалдагч'],
  ['Сэлэнгэ трейд', 'Агуулахын ажилчин'], ['Монгол хоол', 'Тогооч'],
  ['Тумэн сан', 'Маркетингийн мэргэжилтэн'], ['Дата майнд', 'Дата аналитик'],
  ['Пиннэйкл', 'Дизайнер'], ['Фүүд дэливери', 'Курьер'],
  ['Интернэшнл сургууль', 'Багш'], ['Гранд медикал', 'Сувилагч'],
  ['Сөүл клник', 'Эмч'], ['Безнес парк', 'Оффис менежер'],
  ['Секьюр групп', 'Хамгаалалтын ажилтан'], ['Фриланс', 'Орчуулагч'],
  ['Ай Ти солюшн', 'Тестийн инженер'],
];

/** ⚠️ АЖЛЫН АЛБАН ТУШААЛ — дэд төрөлд ТОХИРСОН (эс бөгөөс «IT, программист»
 *  төрөлд «Техникч» гэж гарч төөрөгдүүлнэ). */
const JOB_POSITIONS = {
  'IT, программист': ['Программист', 'Системийн админ', 'Дата аналитик', 'Дизайнер', 'Тестийн инженер', 'DevOps инженер'],
  'Борлуулалт, маркетинг': ['Борлуулалтын менежер', 'Маркетингийн мэргэжилтэн', 'Худалдагч', 'SMM мэргэжилтэн'],
  'Нягтлан бодох, санхүү': ['Нягтлан бодогч', 'Санхүүгийн мэргэжилтэн', 'Зээлийн мэргэжилтэн', 'Кассчин'],
  'Инженер, техник': ['Инженер', 'Техникч', 'Механик инженер', 'Цахилгаанчин'],
  'Барилга, засвар': ['Барилгын ажилчин', 'Будагчин', 'Сантехникч', 'Гагнуурчин'],
  'Үйлчилгээ, үйлдвэрлэл': ['Үйлчилгээний ажилтан', 'Үйлдвэрийн ажилчин', 'Гал тогооны ажилчин'],
  'Хүний нөөц, захиргаа': ['Хүний нөөцийн мэргэжилтэн', 'Оффис менежер', 'Нарийн бичгийн дарга'],
  'Жолооч': ['Жолооч', 'Хүнд машин механизмын жолооч', 'Курьер'],
  'Хамгаалалт': ['Хамгаалалтын ажилтан', 'Харуул', 'Гал сөнөөгч'],
  'Худалдаа, касс': ['Кассчин', 'Худалдагч', 'Дэлгүүрийн менежер'],
  'Боловсрол, сургалт': ['Багш', 'Сургалтын менежер', 'Хүмүүжлийн ажилтан'],
  'Эрүүл мэнд': ['Эмч', 'Сувилагч', 'Лабораторийн ажилтан'],
  'Ресторан, зочид буудал': ['Тогооч', 'Зөөгч', 'Ресепшн', 'Бариста'],
  'Хөдөө аж ахуй': ['Малчин', 'Газар тариаланчин', 'Фермийн ажилчин'],
  'Бусад': ['Гэрээт ажилтан', 'Туслах ажилтан', 'Дадлагажигч'],
};

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

/** ⚠️ АМРАЛТ, СПОРТ, ХОББИ — брэнд+загвар — ДЭД ТӨРӨЛ тус бүрд
 *  (хэрэглэгчийн хүсэлтээр нэмэгдсэн шинэ хэсэг, 2026-09-27).
 *  ⚠️ «Унадаг дугуйны тавиур» нь «Хөгжмийн зэмсэг» төрөлд орохгүй байхын
 *     тулд дэд төрөл тус бүрд ТОХИРСОН хосууд. */
const HOBBY_SUBTYPE_PAIRS = {
  'Аяллын хэрэгсэл': [['Samsonite', 'Чемодан 65 см'], ['Travel', 'Палатка 4 хүн'], ['Garmin', 'GPS навигац'], ['Osprey', 'Пластик уут 60 л'], ['Deuter', 'Явган аяллын цүнх']],
  'Загас ан агнуур': [['Shimano', 'Catana 4000'], ['Daiwa', 'Crossfire LT'], ['Okuma', 'Ceymar'], ['Browning', 'BAR Mk3'], ['Simms', 'G4 Pro Boot'], ['Oros', 'Дуран 8×30']],
  'Ном, сонин, сэтгүүл': [['Oxford', 'Сурах бичиг 12-р анги'], ['Монгол ном', 'Түүхэн роман'], ['Эрдэм', 'Хүүхдийн үлгэр'], ['National Geographic', 'Сэтгүүл 2024'], ['Cambridge', 'IELTS сурах бичиг']],
  'Спортын хэрэгсэл': [['Spalding', 'Сагсан бөмбөг'], ['Star', 'Волейболын бөмбөг'], ['Tunturi', 'Фитнесс төхөөрөмж'], ['Wilson', 'Теннисний ракет'], ['Judo', 'Татами 2×2'], ['Nike', 'Гүйлтийн зам']],
  'Хөгжмийн зэмсэг': [['Yamaha', 'P-45 дижитал пиано'], ['Casio', 'CT-S300'], ['Fender', 'Squier Affinity'], ['Yamaha', 'F310 гитар'], ['Беларусь', 'Төгөлдөр хуур'], ['Pearl', 'Бөмбөр иж бүрэн']],
  'Цуглуулга': [['Монголбанк', 'Төгрөг 5000 (2013)'], ['Soviet', 'Мөнгөн зоос'], ['Чингис', 'Хөөрөгний даалин'], ['Улзы', 'Хүрэл цуглуулга'], ['Куба', 'Марк 1970']],
  'Унадаг дугуй, сэлбэг': [['Giant', 'ATX 720 27.5'], ['Trek', 'Marlin 6'], ['Cube', 'Aim SL 29'], ['Merida', 'Big Nine 100'], ['XDS', 'AD 350'], ['Shimano', 'Дериллек 8 sp']],
};

/** «Амралт, спорт, хобби» — дэд төрөл тус бүрийн үнийн хязгаар (₮).
 *  ⚠️ Ном 200 сая, дугуй 20 мянга байх нь төөрөгдүүлнэ → төрөл тус бүрд. */
const HOBBY_PRICE = {
  'Аяллын хэрэгсэл': [50e3, 2e6],
  'Загас ан агнуур': [30e3, 3e6],
  'Ном, сонин, сэтгүүл': [10e3, 250e3],
  'Спортын хэрэгсэл': [50e3, 4e6],
  'Хөгжмийн зэмсэг': [150e3, 8e6],
  'Цуглуулга': [100e3, 5e6],
  'Унадаг дугуй, сэлбэг': [150e3, 6e6],
};

/**
 * 💻 «Notebook» бүлгийн БРЭНД дэд төрлүүд (2026-09-29) — `lib/locationData.js`-ийн
 * `COMPUTER_SUBTYPE_GROUPS`-ээс АВТОМАТААР уншина (нэг эх сурвалж ✓).
 * ⚠️ Эдгээр дэд төрөлд `attrs.brand` нь дэд төрлийн нэртэй ЯГ ИЖИЛ байх ёстой
 *    (эс бөгөөс «Apple» төрөлд «Dell XPS» гэж гарч төөрөгдүүлнэ ✗)
 */
const PC_NOTEBOOK_BRANDS = new Set(
  ((COMPUTER_SUBTYPE_GROUPS.find((g) => g.label === 'Notebook') || { items: [] }).items)
    .filter((b) => b !== 'Бусад')
);

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
      return { brand, model, condition: pick(['Шинэ', 'Хуучин', 'Хуучин']), warranty: pick(['Байгаа', 'Байхгүй']) };
    }
    // ⚠️ `year` нь тусдаа хувьсагч БОЛОХ ЁСТОЙ: `importYear` нь түүнээс
    //    хамаардаг тул объект дотроос `year`-ыг унших боломжгүй (TDZ алдаа) ✗
    const year = randInt(2008, 2024);
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
      engine: pick(['1.5', '1.8', '2.0', '2.4', '2.5', '3.0', '3.5', '4.0', '4.6']),
      fuel: pick(['Бензин', 'Бензин', 'Бензин', 'Дизель', 'Хайбрид', 'Хайбрид', 'Цахилгаан', 'Хий']),
      drive: pick(['Урд', 'Хойд', 'Бүх']),
      condition: pick(['Шинэ', 'Хуучин', 'Хуучин', 'Хуучин']),
    };
  }
  if (section === 'jobs') {
    const [company] = pick(JOB_PAIRS);
    const positions = JOB_POSITIONS[subtype] || JOB_POSITIONS['Бусад'];
    return {
      company, position: pick(positions),
      salary: String(money(800e3, 9e6)),
      jobType: pick(['Бүтэн цаг', 'Бүтэн цаг', 'Бүтэн цаг', 'Хагас цаг', 'Гэрээт', 'Дадлага']),
      experience: pick(['Шаардлагагүй', '1+ жил', '3+ жил', '5+ жил']),
      education: pick(['Дунд', 'Тусгай мэргэжлийн', 'Бакалавр', 'Магистр']),
      workMode: pick(['Газар дээр', 'Газар дээр', 'Хибрид', 'Зайнаас']),
    };
  }
  if (section === 'computers') {
    // ⚠️ 2026-09-29: дэд төрөл нь 3 ТҮВШНИЙ мод болов (`COMPUTER_SUBTYPE_GROUPS`)
    //    — Notebook бүлэгт брэнд нь ӨӨРӨӨ дэд төрөл тул `attrs.brand` нь
    //    дэд төрлийн нэртэй ЯГ ИЖИЛ байх ёстой ✓
    const [brand, model] = pick(PC_SUBTYPE_PAIRS[subtype] || PC_PAIRS);
    // ⚠️ CPU/RAM/SSD/Дэлгэц нь зөвхөн КОМПЬЮТЕРТ (ноутбук, суурин, сервер,
    //    эд анги) хамаарна — хулгана/чихэвч/тонер/тоглоомд утгагүй ✗
    const isComputer = PC_NOTEBOOK_BRANDS.has(subtype)
      || ['Иж бүрэн компьютер', 'Процессор, сервер', 'Бусад сэлбэг'].includes(subtype);
    return {
      brand: PC_NOTEBOOK_BRANDS.has(subtype) ? subtype : brand,
      model,
      ...(isComputer ? {
        cpu: pick(['Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 5', 'AMD Ryzen 7', 'Apple M1', 'Apple M2']),
        ram: pick(['8 GB', '16 GB', '16 GB', '32 GB']),
        storage: pick(['256 GB SSD', '512 GB SSD', '1 TB SSD', '512 GB SSD + 1 TB HDD']),
        screen: pick(['13', '14', '15', '15.6', '17']),
      } : subtype === 'Дэлгэц' || subtype === 'Проектор'
        ? { screen: pick(['24', '27', '32']) } : {}),
      condition: pick(['Шинэ', 'Хуучин', 'Хуучин']),
      warranty: pick(['Байгаа', 'Байхгүй']),
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
      //    «Шинэ / Хуучин» сонгоно (брэнд/хэмжээ нь demo өгөгдөлд л байна)
      condition: pick(['Шинэ', 'Шинэ', 'Хуучин', 'Хуучин']),
    };
  }
  if (section === 'home') {
    return {
      brand: pick(['IKEA', 'LG', 'Samsung', 'Bosch', 'Electrolux', 'Tefal', 'Philips', 'Бусад']),
      material: pick(['Мод', 'Мод', 'Даавуу', 'Металл', 'Шил', 'Арьс', 'Хуванцар']),
      size: `${randInt(40, 260)}×${randInt(30, 200)} см`,
      color: pick(['Цагаан', 'Хар', 'Саарал', 'Бор', 'Беж', 'Цэнхэр', 'Ногоон']),
      condition: pick(['Шинэ', 'Хуучин', 'Хуучин']),
      delivery: pick(['Байгаа', 'Байгаа', 'Тохиролцоно', 'Байхгүй']),
    };
  }
  if (section === 'hobby') {
    const [brand, model] = pick(HOBBY_SUBTYPE_PAIRS[subtype] || HOBBY_SUBTYPE_PAIRS['Цуглуулга']);
    return {
      brand, model,
      // ⚠️ Хэмжээ нь зөвхөн хэмжигдэхүйц төрөлд (дугуй: инч, чемодан: см/л)
      size: subtype === 'Унадаг дугуй, сэлбэг'
        ? pick(['26 инч', '27.5 инч', '29 инч', 'S', 'M', 'L'])
        : subtype === 'Ном, сонин, сэтгүүл'
          ? pick(['Халаасны', 'A4', 'A5', 'Хатуу хавтастай'])
          : `${randInt(20, 180)}×${randInt(15, 120)} см`,
      condition: pick(['Шинэ', 'Хуучин', 'Хуучин']),
      delivery: pick(['Байгаа', 'Байгаа', 'Тохиролцоно', 'Байхгүй']),
    };
  }
  if (section === 'services') {
    return {
      company: pick(SERVICE_NAMES),
      workMode: pick(['Газар дээр', 'Газар дээр', 'Онлайн', 'Хоёулаа']),
      coverage: pick(['Улаанбаатар, бүх дүүрэг', 'Улаанбаатар, төв дүүргүүд', 'Орон даяар', 'Сонгосон дүүрэг']),
      experience: `${randInt(1, 20)} жил`,
      availability: pick(['Ажлын өдөр', 'Ажлын өдөр', 'Амралтын өдөр ч', '24/7']),
      priceUnit: pick(['Тохиролцоно', 'Цагийн', 'Даалгаврын', 'Сард']),
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
  home: [
    'Цэвэрхэн, гэмтэлгүй. Хэрэглэгдэж байсан ч асуудалгүй.',
    'Хотын төвөөс хүргэлт хийж өгнө. Үнэ тохиролцоно.',
    'Шинэ байдалтай, бага зэрэг хэрэглэсэн.',
    'Гэр бүлд тохиромжтой. Зарж байгаа шалтгаан нь нүүх.',
    'Чанартай материал, удаан эдэлгээтэй.',
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

/** Нэг зарын мөр бүтээх */
function buildRow(section, subtype, k) {
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
    // ⚠️ Ажлын зарт үнэ = ЦАЛИН (сарын) — карт дээр ₮-ээр харагдана
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
  } else if (section === 'hobby') {
    // ⚠️ Хобби/спортын барааны үнэ нь ТӨРЛӨӨС хэлбэлзэнэ (ном 10 мянга,
    //    пиано 8 сая) → `HOBBY_PRICE` хүснэгтээс авна.
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
(async () => {
  const admin = getAdminClient();

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
      ['jobs', 'IT, программист', 0], ['computers', 'Apple', 0],
      ['computers', 'Иж бүрэн компьютер', 1], ['computers', 'Чихэвч', 2],
      ['home', 'Тавилга, буйдан', 0], ['services', 'Сантехник', 0],
      ['electric', 'Телевизор (65 инч)', 0], ['electric', 'Угаалгын машин', 1],
      ['hobby', 'Унадаг дугуй, сэлбэг', 0],
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

  // 2) Мөрүүд үүсгэх — 8 хэсэг × дэд төрөл бүр × 10
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
        console.error('   → supabase/migrations/0021_section_electric.sql-ийг ажиллуулна уу.'
          + ' (⚡ «Цахилгаан бараа» хэсгийг DB зөвшөөрөхгүй байна).');
        console.error('   → эсвэл supabase/migrations/0019_section_hobby.sql'
          + ' (⚽ «Амралт, спорт, хобби»).');
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

