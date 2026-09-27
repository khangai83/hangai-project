// ============================================================
// Хотын/дүүргийн/хороодын тогтмол өгөгдөл + маягтын сонголтууд
// ============================================================

// Улаанбаатарын дүүрэг -> хороодын жагсаалт
//
// 📅 ЭХ СУРВАЛЖ: mn.wikipedia.org (дүүрэг тус бүрийн өгүүлэл, 2025–2026 оны шинэчлэл).
//    Хорооны тоо жил бүр нэмэгддэг (хороо хуваагдах, шинэ хороо байгуулагдах) тул
//    энд ХАМГИЙН СҮҮЛИЙН (хамгийн их) тоог авсан — ингэснээр шинэ хороонд амьдардаг
//    иргэн сонголтоос хоцрохгүй. Хэрэв албан ёсны тоо (estat.mn, дүүргийн сайт)
//    гарвал энэ жагсаалтыг шинэчилнэ үү.
//
// ⚠️ Хэрэв таны дүүрэг/хороо энд байхгүй бол зөвхөн доорх тоог нэмэгдүүлэхэд хангалттай:
//    жишээ нь Хан-Уул 26-р хороо нэмэгдвэл → khorooRange(26)

/** 1..N → ['1-р хороо', ..., 'N-р хороо'] */
const khorooRange = (n) => Array.from({ length: n }, (_, i) => `${i + 1}-р хороо`);

export const UB_DISTRICTS = {
  Баянгол: khorooRange(33),
  Баянзүрх: khorooRange(43),
  Сүхбаатар: khorooRange(20),
  'Хан-Уул': khorooRange(24),
  Чингэлтэй: khorooRange(24),
  Сонгинохайрхан: khorooRange(43),
  Налайх: khorooRange(8),
  Багануур: khorooRange(5),
  Багахангай: khorooRange(2),
};

// Хот/Аймагийн жагсаалт
export const CITIES = [
  'Улаанбаатар', 'Архангай', 'Баян-Өлгий', 'Баянхонгор', 'Булган',
  'Говь-Алтай', 'Говьсүмбэр', 'Дархан-Уул', 'Дорноговь', 'Дорнод',
  'Дундговь', 'Завхан', 'Орхон', 'Өвөрхангай', 'Өмнөговь',
  'Сүхбаатар', 'Сэлэнгэ', 'Төв', 'Увс', 'Ховд', 'Хөвсгөл', 'Хэнтий',
];

// Тодорхой хот/аймгийн дүүрэг/сумын жагсаалт (алдартай нь)
export const CITY_DISTRICTS = {
  Улаанбаатар: Object.keys(UB_DISTRICTS),
  'Дархан-Уул': ['Дархан', 'Шарын гол', 'Хонгор', 'Орхон'],
  Орхон: ['Эрдэнэт', 'Жаргалант'],
  // Бусад аймгийн хувьд дүүрэг/сумыг тусад нь оруулахгүй (original-тэй нийцнэ)
};

export function getDistricts(city) {
  return (CITY_DISTRICTS[city] || []).slice();
}

export function getKhoroos(city, district) {
  if (city === 'Улаанбаатар' && UB_DISTRICTS[district]) {
    return UB_DISTRICTS[district].slice();
  }
  return [];
}

// ============================================================
// «Өрөө» хайлтын сонголтууд — загвараар ЧИП (товч) хэлбэрээр
// ============================================================
// ⚠️ Хамгийн сүүлийн утга '5' нь «+5 өрөө» (5 БА ТҮҮНЭЭС ДЭЭШ) — `lib/queries.js`
//    дотор `rooms >= 5` болж хөрвөгдөнө (6, 7, 8 өрөөтэй зар ч багтана).
export const ROOM_OPTIONS = [
  { value: '1', label: '1 өрөө' },
  { value: '2', label: '2 өрөө' },
  { value: '3', label: '3 өрөө' },
  { value: '4', label: '4 өрөө' },
  { value: '5', label: '+5 өрөө' },
];

/**
 * Өрөөний тоог дэлгэцэнд харуулах шошго (breadcrumb, чип г.м.).
 * 5 ба түүнээс дээш бол «+5 өрөө» ( бичиглэл).
 */
export function formatRoomsLabel(rooms) {
  const r = Number(rooms);
  if (!r) return '';
  return r >= 5 ? '+5 өрөө' : `${r} өрөө`;
}

// ============================================================
// Үл хөдлөх хөрөнгийн төрлүүд — загварын бүрдэл хэсгүүд
// (Зарах / Түрээслэх хоёулаа доорх 8 төрөлтэй)
//
// value     — өгөгдлийн санд (property_type) хадгалах үндсэн нэр
// sell/rent — категориос хамаарсан дэлгэцийн нэр (breadcrumb, сонголтод)
// apartment — орон сууцны нэмэлт талбарууд (тагт, ашиглалтанд орсон он, гараж)
// floors    — барилгын давхрын талбарууд (нийт давхар / тухайн давхар)
// rooms     — «Өрөө» талбар харагдах эсэх (зөвхөн орон сууц, АОС/хаус) ← 0006
// bathrooms — «Угаалгын өрөө» талбар ҮРГЭЛЖ харагдах эсэх (АОС/хаус) ← 0012
//             (3+ өрөөтэй бусад төрөлд ч hasBathroomFields()-аар автоматаар нээгдэнэ)
// ============================================================
export const PROPERTY_TYPE_DEFS = [
  { value: 'Орон сууц', icon: '🏢', sell: 'Орон сууц зарна', rent: 'Орон сууц түрээслүүлнэ', apartment: true, floors: true, rooms: true },
  { value: 'Газар', icon: '🌳', sell: 'Газар зарна', rent: 'Газар түрээслүүлнэ' },
  { value: 'Худалдаа, үйлчилгээний талбай', icon: '🏪', sell: 'Худалдаа, үйлчилгээний талбай зарна', rent: 'Худалдаа, үйлчилгээний талбай түрээслүүлнэ', floors: true },
  { value: 'АОС, хаус, зуслан, амралтын газар', icon: '🏘️', sell: 'АОС, хаус, зуслан, амралтын газар зарна', rent: 'АОС, хаус, зуслан, амралтын газар түрээслүүлнэ', rooms: true, bathrooms: true },
  { value: 'Үйлдвэр, агуулах, обьект', icon: '🏭', sell: 'Үйлдвэр, агуулах, обьект зарна', rent: 'Үйлдвэр, агуулах, обьект түрээслүүлнэ' },
  { value: 'Оффис', icon: '🏬', sell: 'Оффис зарна', rent: 'Оффис түрээслүүлнэ', floors: true },
  { value: 'Хашаа байшин', icon: '🏡', sell: 'Хашаа байшин зарна', rent: 'Хашаа байшин түрээслүүлнэ' },
  { value: 'Гараж, контейнер, зөөврийн сууц', icon: '🅿️', sell: 'Гараж, контейнер, зөөврийн сууц зарна', rent: 'Гараж, контейнер, зөөврийн сууц түрээслүүлнэ' },
];

// Урвуу нийцтэй байдлын жагсаалт (value-ууд)
export const PROPERTY_TYPES = PROPERTY_TYPE_DEFS.map((d) => d.value);

/** Төрлийн тодорхойлолт олох (олдохгүй бол null) */
export function getPropertyTypeDef(type) {
  return PROPERTY_TYPE_DEFS.find((d) => d.value === type) || null;
}

/**
 * Төрөл + категори → дэлгэцийн нэр.
 * Жишээ: ('Орон сууц', 'sell') → 'Орон сууц зарна'
 *        ('Орон сууц', 'rent') → 'Орон сууц түрээслүүлнэ'
 *        ('Орон сууц', 'all')  → 'Орон сууц'
 */
export function getPropertyTypePathLabel(type, category) {
  const def = getPropertyTypeDef(type);
  if (!def) return type || '';
  if (category === 'rent') return def.rent;
  if (category === 'sell') return def.sell;
  return def.value;
}

/** Тухайн төрөлд орон сууцны нэмэлт талбарууд харагдах эсэх */
export function hasApartmentFields(type) {
  return !!getPropertyTypeDef(type)?.apartment;
}

/** Тухайн төрөлд давхрын талбарууд харагдах эсэх */
export function hasFloorFields(type) {
  return !!getPropertyTypeDef(type)?.floors;
}

/** Тухайн төрөлд «Өрөө» талбар харагдах эсэх (Орон сууц, АОС/хаус) */
export function hasRoomsFields(type) {
  return !!getPropertyTypeDef(type)?.rooms;
}

/** «Угаалгын өрөө» талбар харагдахад шаардлагатай хамгийн бага өрөөний тоо */
export const MIN_ROOMS_FOR_BATHROOM = 3;

/**
 * Тухайн төрөл + өрөөний тоонд «Угаалгын өрөө» талбар харагдах эсэх.
 *
 *  • АОС/хаус төрөл (`bathrooms: true` тугтай) → ҮРГЭЛЖ харагдана
 *  • 3 ба түүнээс олон өрөөтэй бусад төрөл (ж: 3 өрөөтэй орон сууц) → харагдана
 *  • «Өрөө» талбаргүй төрлүүд (Газар, Оффис, …) → хэзээ ч харагдахгүй
 *
 * @param {string} type property_type утга
 * @param {string|number} rooms форм дээрх өрөөний тоо
 */
export function hasBathroomFields(type, rooms) {
  const def = getPropertyTypeDef(type);
  if (!def) return false;
  if (def.bathrooms) return true;
  if (!def.rooms) return false;
  return Math.trunc(Number(rooms) || 0) >= MIN_ROOMS_FOR_BATHROOM;
}

// Тагтны сонголтууд (1-4)
export const BALCONY_OPTIONS = [1, 2, 3, 4];

// Гараж байгаа эсэх сонголтууд
export const GARAGE_OPTIONS = [
  { value: 'yes', label: 'Байгаа' },
  { value: 'no', label: 'Байхгүй' },
];

// Категори
export const CATEGORIES = [
  { value: 'all', label: 'Бүгд' },
  { value: 'sell', label: '💰 Зарах' },
  { value: 'rent', label: '🔑 Түрээслэх' },
];

// Төрлийн icon-ууд (шинэ нэрс) + хуучин өгөгдлийн нэрс (fallback)
export const PROPERTY_TYPE_ICONS = {
  ...Object.fromEntries(PROPERTY_TYPE_DEFS.map((d) => [d.value, d.icon])),
  // ---- Хуучин (0001 татсан хувилбарын) нэрс ----
  House: '🏠',
  'Худалдаа үйлчилгээний талбай': '🏪',
  'Обьект, үйлдвэр, агуулах': '🏭',
};

export const PRICE_TYPE_LABELS = {
  total: 'нийт',
  month: 'сард',
  day: 'өдөрт',
  sqm: 'м² тутамд',
};

// ============================================================
// ЗАРЫН ХЭСГҮҮД (0016_listing_sections.sql)
// ============================================================
// ⚠️ ЯАГААД: апп нь зөвхөн үл хөдлөх биш — автомашин, ажлын зар, компьютер,
//    гэр ахуйн бараа, үйлчилгээ гэсэн хэсгүүдтэй.
//
// 📐 Бүтэц:
//   • `section`      — `listings.section` баганад хадгална
//   • `subtypes`     — `listings.property_type` баганад хадгална (дэд төрөл)
//   • `subtypeGroups`— 🛠 3 ДАХЬ ТҮВШИН (зөвхөн `services`): бүлэг → дэд төрөл.
//                      ⚠️ Бүлэг нь ЗӨВХӨН навигаци — DB-д хадгалагдахгүй ✓
//   • `attrs`        — `listings.attrs` (jsonb) дотор хадгалагдана
//   • `attrFields[]` — форм дээрх талбарууд (тухайн хэсгийн)
//   • `attrFilters[]`— sidebar дээрх ШҮҮЛТҮҮД (зөвхөн `select` төрөл)
//
// ⚠️ `real-estate` нь ОНЦГОЙ: дэд төрлүүд нь `PROPERTY_TYPE_DEFS` (хэвээр),
//    нэмэлт талбарууд нь `build_year`/`floor`/`balconies` тусдаа БАГАНА дээр.
//    Бусад хэсэг нь `attrs` jsonb ашиглана.
// ============================================================

/** Сонголттой талбар үүсгэх туслах */
const sel = (key, label, options, icon = '') => ({ key, label, type: 'select', options, icon });
/** Текст талбар */
const txt = (key, label, placeholder = '', icon = '') => ({ key, label, type: 'text', placeholder, icon });
/** Тоон талбар */
const number = (key, label, placeholder = '', icon = '') => ({ key, label, type: 'number', placeholder, icon });

/** Автомашины түгээмэл брэндүүд (Монголын зах зээлд) */
export const CAR_BRANDS = [
  'Toyota', 'Nissan', 'Hyundai', 'Kia', 'Lexus', 'Honda', 'Mazda', 'Mitsubishi',
  'Subaru', 'BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen', 'Ford', 'Chevrolet',
  'Land Rover', 'Suzuki', 'Daewoo', 'Buick', 'Chery', 'Haval', 'BYD', 'Tesla',
  'Isuzu', 'JAC', 'UAZ', 'Lada', 'Ravon', 'Genesis', 'Volvo', 'Skoda', 'Porsche',
  'Renault', 'Peugeot', 'Jeep', 'Камаз', 'ГАЗ', 'ЗИЛ', 'Бусад',
];

/**
 * 🛠️ ҮЙЛЧИЛГЭЭ хэсгийн ГРУППҮҮД (3 дахь түвшин) — 2026-09-27 (хэрэглэгчийн хүсэлт).
 *
 * БҮТЭЦ (unegui.mn-ийн «Үйлчилгээ» модтой ижил):
 *   Үйлчилгээ (хэсэг) → «Боловсрол & Сургалт» (групп) → «Сургалт ба курс» (дэд төрөл)
 *
 * ⚠️ ХЭРЭГЛЭГЧИЙН СОНГОЛТ (2026-09-27): «групп дээр дарахад ЗӨВХӨН доод
 *    item-үүд нээгдэнэ — групп ӨӨРӨӨ шүүхгүй». Тиймээс:
 *      • `items` БАЙГАА групп  → зөвхөн НЭЭГДЭХ товч (дарвал `propertyType`
 *        болж СОНГОГДОХГҮЙ — учир нь тийм нэрээр зар хэзээ ч хадгалагдахгүй)
 *      • `items` ХООСОН групп (ж: «Хэвлэл, реклам, медиа») → ӨӨРӨӨ дэд төрөл
 *        болж СОНГОГДОНО ✓ (доод түвшин байхгүй тул тэр нь хамгийн доод түвшин)
 *
 * ⚠️ `property_type` (DB) нь ЗӨВХӨН доод item-ийн нэр — групп нь зөвхөн
 *    НАВИГАЦИ (зар хадгалах баганад ОРОХГҮЙ) ✓
 */
export const SERVICE_SUBTYPE_GROUPS = [
  {
    label: 'Боловсрол & Сургалт',
    items: ['Сургалт ба курс', 'Тайлан ба төсөл', 'Орчуулга'],
  },
  {
    label: 'Барилга & Засвар үйлчилгээ',
    items: [
      'Барилгын бүх ажил', 'Цахилгаан бараа засвар', 'Тавилга ба мужаан',
      'Түлхүүр/цоож засвар', 'Сантехник',
    ],
  },
  {
    label: 'Өрх гэр & Ахуйн үйлчилгээ',
    items: [
      'Бүх цэвэрлэгээ', 'Нүүлгэлт ба тээвэр', 'Хүүхэд асрах',
      'Өндөр настан асрах', 'Тэжээвэр амьтны үйлчилгээ', 'Жолоочийн үйлчилгээ',
    ],
  },
  // ⚠️ Доод түвшингүүд нь ЗОХИОГЧИЙН жагсаалтад байхгүй тул групп ӨӨРӨӨ
  //    сонгогдох дэд төрөл болно (дээрх тайлбарыг үзнэ үү)
  { label: 'Хэвлэл, реклам, медиа', items: [] },
  {
    label: 'Аялал, Амралт & Гоо сайхан',
    items: [
      'Аялал жуулчлал', 'Амралт, сувилал', 'Үсчин гоо сайхан',
      'Хоол захиалга', 'Баярын худалдаа',
    ],
  },
  {
    label: 'Технологи & Авто засвар',
    items: ['IT Программ хангамж', 'Уул уурхай', 'Авто засвар үйлчилгээ'],
  },
  {
    label: 'Бизнес, Санхүү & Хууль',
    items: [
      'Компани ба бэлэн бизнес зарна', 'Хөрөнгө зуучлал ба үнэлгээ',
      'Мөнгө санхүү ба зээл', 'Хууль ба эрх зүй', 'Харуул хамгаалалт',
    ],
  },
];

/**
 * Үйлчилгээний БҮХ дэд төрөл (нэг хавтгай жагсаалт) — `items` байхгүй групп
 * нь ӨӨРӨӨ орно.
 * ⚠️ Энэ нь `listings.property_type`-д хадгалагдах БОЛОМЖТОЙ бүх утга ✓
 *    (валидац, тоо (`fetchPropertyTypeCounts`), форм, breadcrumb бүгд үүнийг
 *     ашиглана).
 */
const SERVICE_SUBTYPES = SERVICE_SUBTYPE_GROUPS.flatMap((g) => (g.items.length ? g.items : [g.label]));

export const SECTIONS = [
  {
    value: 'real-estate',
    label: 'Үл хөдлөх',
    icon: '🏠',
    // ⚠️ `categories` = ямар «Зарах/Түрээслэх» таб харагдах вэ.
    //    ⚠️ ЗӨВХӨН үл хөдлөх нь `sell`/`rent` хоёуланг ашиглана — бусад хэсэгт
    //       «Зарах / Түрээслэх» сонголт ОГТ ХАРАГДАХГҮЙ (`['all']`).
    categories: ['all', 'sell', 'rent'],
    // ⚠️ `legacy: true` → дэд төрлүүд нь PROPERTY_TYPE_DEFS, талбарууд нь
    //    тусдаа багана (build_year, floor, rooms, area…) дээр
    legacy: true,
    subtypes: null,
    attrFields: [],
    attrFilters: [],
  },
  {
    value: 'auto',
    label: 'Автомашин',
    icon: '🚗',
    // ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөхөд (хэрэглэгчийн хүсэлт)
    categories: ['all'],
    // ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): «Хэтчбек» ХАСАГДАЖ, «Седан» →
    //    «Суудлын машин» болов (10 → 9 дэд төрөл). Хэтчбек нь суудлын
    //    машины нэг хэлбэр тул тусдаа төрөл байх шаардлагагүй.
    //    ℹ️ DB-д ХУУЧИН нэрээр хадгалагдсан заруудыг
    //    `supabase/migrations/0018_auto_subtype_rename.sql` нь
    //    «Суудлын машин» болгож нэрлэнэ (өгөгдөл алдагдахгүй).
    subtypes: [
      'Суудлын машин', 'Жийп, SUV', 'Микроавтобус', 'Ачааны машин',
      'Автобус', 'Мотоцикл', 'Трактор, хөдөө аж ахуй',
      'Авто сэлбэг, хэрэгсэл', 'Бусад',
    ],
    attrFields: [
      sel('brand', 'Брэнд', CAR_BRANDS, '🏷️'),
      txt('model', 'Загвар', 'Prius, Harrier…', '🚙'),
      number('year', 'Үйлдвэрлэсэн он', '2018', '📅'),
      number('mileage', 'Гүйлт (км)', '95000', '🛣️'),
      sel('transmission', 'Хурдны хайрцаг', ['Автомат', 'Механик', 'Хагас автомат', 'CVT'], '⚙️'),
      txt('engine', 'Хөдөлгүүр (л)', '2.5', '🔧'),
      sel('fuel', 'Түлш', ['Бензин', 'Дизель', 'Хайбрид', 'Цахилгаан', 'Хий', 'Бусад'], '⛽'),
      sel('drive', 'Хөтлөгч', ['Урд', 'Хойд', 'Бүх'], '🔀'),
      sel('condition', 'Төлөв', ['Шинэ', 'Хэвийн', 'Засвар шаардлагатай'], '✅'),
    ],
    attrFilters: ['brand', 'fuel', 'transmission', 'drive', 'condition'],
  },
  {
    value: 'jobs',
    label: 'Ажлын зар',
    icon: '💼',
    // ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөхөд (хэрэглэгчийн хүсэлт)
    categories: ['all'],
    subtypes: [
      'IT, программист', 'Борлуулалт, маркетинг', 'Нягтлан бодох, санхүү',
      'Инженер, техник', 'Барилга, засвар', 'Үйлчилгээ, үйлдвэрлэл',
      'Хүний нөөц, захиргаа', 'Жолооч', 'Хамгаалалт', 'Худалдаа, касс',
      'Боловсрол, сургалт', 'Эрүүл мэнд', 'Ресторан, зочид буудал',
      'Хөдөө аж ахуй', 'Бусад',
    ],
    attrFields: [
      txt('company', 'Компани / байгууллага', 'Жишээ: Мобиком', '🏢'),
      txt('position', 'Албан тушаал', 'Жишээ: Программист', '💼'),
      number('salary', 'Цалин (₮)', '2000000', '💰'),
      sel('jobType', 'Ажлын төрөл', ['Бүтэн цаг', 'Хагас цаг', 'Гэрээт', 'Давхар ажил', 'Дадлага'], '🕒'),
      sel('experience', 'Туршлага', ['Шаардлагагүй', '1+ жил', '3+ жил', '5+ жил'], '📊'),
      sel('education', 'Боловсрол', ['Дунд', 'Тусгай мэргэжлийн', 'Бакалавр', 'Магистр'], '🎓'),
      sel('workMode', 'Ажлын хэлбэр', ['Газар дээр', 'Хибрид', 'Зайнаас'], '🏠'),
      txt('expiry', 'Хүчинтэй хугацаа', 'Жишээ: 2026-12-31', '📅'),
    ],
    attrFilters: ['jobType', 'experience', 'workMode'],
  },
  {
    value: 'computers',
    label: 'Компьютер',
    icon: '💻',
    categories: ['all'],
    subtypes: [
      'Зөөврийн компьютер', 'Суурин компьютер', 'Монитор', 'Принтер, сканнер',
      'Сүлжээ, роутер', 'Хадгалах сан, SSD', 'Эд анги, сэлбэг',
      'Гар, хулгана, хэрэгсэл', 'Тоглоом, консол', 'Програм хангамж', 'Бусад',
    ],
    attrFields: [
      sel('brand', 'Брэнд', ['Apple', 'Dell', 'HP', 'Lenovo', 'Asus', 'Acer', 'MSI', 'Samsung', 'Sony', 'Huawei', 'Xiaomi', 'LG', 'Intel', 'AMD', 'Kingston', 'Canon', 'Epson', 'Бусад'], '🏷️'),
      txt('model', 'Загвар', 'MacBook Pro 14', '🖥️'),
      txt('cpu', 'Процессор', 'Intel Core i7', '⚙️'),
      txt('ram', 'Санах ой (RAM)', '16 GB', '🧠'),
      txt('storage', 'Хадгалах сан', '512 GB SSD', '💾'),
      txt('screen', 'Дэлгэц (")', '14', '📺'),
      sel('condition', 'Төлөв', ['Шинэ', 'Хэрэглэсэн — сайн', 'Хэрэглэсэн — хэвийн', 'Засвар шаардлагатай'], '✅'),
      sel('warranty', 'Баталгаа', ['Байгаа', 'Байхгүй'], '🛡️'),
    ],
    attrFilters: ['brand', 'condition', 'warranty'],
  },
  {
    value: 'home',
    label: 'Гэр ахуйн бараа',
    icon: '🛋️',
    categories: ['all'],
    subtypes: [
      'Тавилга, буйдан', 'Гал тогооны хэрэгсэл', 'Гэр ахуйн техник',
      'Гэрэлтүүлэг', 'Хивс, дэвсгэр', 'Ор, унтлагын хэрэгсэл',
      'Цэвэрлэгээ, угаалга', 'Чимэглэл, зураг', 'Хадгалах шүүгээ, тавиур',
      'Цахилгаан бараа', 'Бусад',
    ],
    attrFields: [
      txt('brand', 'Брэнд', 'Жишээ: IKEA', '🏷️'),
      txt('material', 'Материал', 'Мод, даавуу, металл', '🪵'),
      txt('size', 'Хэмжээ', '200×90 см', '📐'),
      txt('color', 'Өнгө', 'Цайвар саарал', '🎨'),
      sel('condition', 'Төлөв', ['Шинэ', 'Хэрэглэсэн — сайн', 'Хэрэглэсэн — хэвийн', 'Засвар шаардлагатай'], '✅'),
      sel('delivery', 'Хүргэлт', ['Байгаа', 'Байхгүй', 'Тохиролцоно'], '🚚'),
    ],
    attrFilters: ['condition', 'delivery'],
  },
  {
    // ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): unegui.mn-д энэ нь ТУСДАА ТОП-ТҮВШНИЙ
    //    хэсэг (`https://unegui.mn/hobbi-sport/`) — «Үйлчилгээ»-гийн ӨМНӨ
    //    байрладаг тул ижил дарааллаар оруулав ✓
    //    ⚠️ DB-д хадгалахын тулд `listings_section_valid` CHECK constraint-д
    //       'hobby' нэмэх ЁСТОЙ → `0019_section_hobby.sql`
    value: 'hobby',
    label: 'Амралт, спорт, хобби',
    icon: '⚽',
    categories: ['all'],
    subtypes: [
      'Аяллын хэрэгсэл', 'Загас ан агнуур', 'Ном, сонин, сэтгүүл',
      'Спортын хэрэгсэл', 'Хөгжмийн зэмсэг', 'Цуглуулга',
      'Унадаг дугуй, сэлбэг',
    ],
    attrFields: [
      txt('brand', 'Брэнд', 'Жишээ: Giant, Yamaha', '🏷️'),
      txt('model', 'Загвар', 'Жишээ: ATX 720', '🔖'),
      txt('size', 'Хэмжээ', '27.5 инч / L / 65 л', '📐'),
      sel('condition', 'Төлөв', ['Шинэ', 'Хэрэглэсэн — сайн', 'Хэрэглэсэн — хэвийн', 'Засвар шаардлагатай'], '✅'),
      sel('delivery', 'Хүргэлт', ['Байгаа', 'Байхгүй', 'Тохиролцоно'], '🚚'),
    ],
    attrFilters: ['condition', 'delivery'],
  },
  {
    value: 'services',
    label: 'Үйлчилгээ',
    icon: '🛠️',
    categories: ['all'],
    // ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): хуучин хавтгай жагсаалт →
    //    unegui.mn шиг 3 ТҮВШНИЙ МОД (`SERVICE_SUBTYPE_GROUPS` дээрх тайлбарыг
    //    үзнэ үү). Доорх `subtypes` нь бүлгүүдээс АВТОМАТААР үүснэ — давхар
    //    бичихгүй (нэг нь мартагдана ✗).
    subtypes: SERVICE_SUBTYPES,
    subtypeGroups: SERVICE_SUBTYPE_GROUPS,
    attrFields: [
      txt('company', 'Нэр / компани', 'Жишээ: Гэр засвар', '🏢'),
      sel('workMode', 'Үйлчилгээний хэлбэр', ['Газар дээр', 'Онлайн', 'Хоёулаа'], '🧭'),
      txt('coverage', 'Хамрах хүрээ', 'Улаанбаатар, бүх дүүрэг', '📍'),
      txt('experience', 'Туршлага', '5 жил', '📊'),
      sel('availability', 'Ажиллах цаг', ['Ажлын өдөр', 'Амралтын өдөр ч', '24/7'], '🕒'),
      sel('priceUnit', 'Үнийн хэлбэр', ['Тохиролцоно', 'Цагийн', 'Даалгаврын', 'Сард'], '💵'),
    ],
    attrFilters: ['workMode', 'availability', 'priceUnit'],
  },
];

// ============================================================
// ХЭСГИЙН ТУСЛАХ ФУНКЦУУД
// ============================================================

/** Хэсгийн тодорхойлолт олох (олдохгүй бол `real-estate`) */
export function getSection(value) {
  return SECTIONS.find((s) => s.value === value) || SECTIONS[0];
}

/** Хэсгийн дэд төрлүүд. ⚠️ `real-estate` бол `PROPERTY_TYPE_DEFS`-ийн value-ууд */
export function getSubtypes(section) {
  const sec = getSection(section);
  if (sec.legacy || !sec.subtypes) return PROPERTY_TYPES.slice();
  return sec.subtypes.slice();
}

/**
 * 🛠 Хэсгийн дэд төрлийн БҮЛГҮҮД (3 дахь түвшин) — 2026-09-27.
 *
 * ⚠️ Зөвхөн `services` хэсэгт байна (бусад нь `[]` → UI нь хуучин 2 түвшний
 *    харагдацаараа ажиллана ✓).
 * ⚠️ Хуулбарыг буцаана (`slice`) — дуудагч нь санамсаргүй өөрчлөхөөс сэргийлэв.
 */
export function getSubtypeGroups(section) {
  const sec = getSection(section);
  if (!Array.isArray(sec.subtypeGroups)) return [];
  return sec.subtypeGroups.map((g) => ({ label: g.label, items: g.items.slice() }));
}

/**
 * Дэд төрөл АЛЬ БҮЛЭГТ хамаарахыг олно (breadcrumb/UI-д хэрэгтэй).
 *
 * @returns {{label: string, items: string[]}|null}
 *   ⚠️ `null` бол: тухайн хэсэгт бүлэг ОГТ БАЙХГҮЙ, эсвэл дэд төрөл нь
 *      бүлгийн item БИШ (ж: хуучин нэрээр хадгалагдсан зар).
 */
export function findSubtypeGroup(section, subtype) {
  if (!subtype) return null;
  return getSubtypeGroups(section).find((g) => g.items.includes(subtype)) || null;
}


/**
 * Тухайн хэсэгт харагдах КАТЕГОРИ табууд (`all`/`sell`/`rent`).
 *
 * ⚠️ ЗӨВХӨН үл хөдлөх (`real-estate`) нь `sell`/`rent` хоёуланг ашиглана —
 *    бусад хэсэгт `['all']` л буцна (хэрэглэгчийн хүсэлт).
 */
export function getSectionCategories(section) {
  const sec = getSection(section);
  const allowed = Array.isArray(sec.categories) ? sec.categories : ['all'];
  return CATEGORIES.filter((c) => allowed.includes(c.value));
}

/**
 * Тухайн хэсэгт «Зарах / Түрээслэх» СОНГОЛТ байгаа эсэх.
 *
 * ⚠️ Зөвхөн үл хөдлөхөд `true`. UI (шүүлтийн мөр ба зарын форм) нь үүгээр
 *    шалгаж, бусад хэсэгт энэ сонголтыг ОГТ харуулахгүй.
 * ⚠️ Сонголт байхгүй хэсэгт `category` нь үргэлж `sell` (DB-ийн default).
 */
export function hasCategoryChoice(section) {
  return getSectionCategories(section).length > 1;
}

/** Хэсгийн attr талбарын тодорхойлолт олох */
export function getAttrField(section, key) {
  const sec = getSection(section);
  return (sec.attrFields || []).find((f) => f.key === key) || null;
}

/** Sidebar-д харагдах attr шүүлтүүд (зөвхөн `select` төрөл) */
export function getAttrFilters(section) {
  const sec = getSection(section);
  return (sec.attrFilters || [])
    .map((k) => getAttrField(section, k))
    .filter((f) => f && f.type === 'select' && Array.isArray(f.options) && f.options.length);
}

/**
 * `attrs`-ийг карт/breadcrumb-д зориулж БОГИНО мөр болгох.
 * Жишээ (авто): «Toyota Prius, 2018 · 95,200 км · Автомат · 2.5 л · Хайбрид»
 *
 * ⚠️ Хэсэг тус бүрийн тэргүүлэх талбарууд (`CARD_ATTR_ORDER`) дарааллаар нь.
 *    Хоосон талбарыг алгасна — мөр нь хэзээ ч «хоосон таслалт» үүсгэхгүй.
 */
const CARD_ATTR_ORDER = {
  auto: ['brand', 'model', 'year', 'mileage', 'transmission', 'engine', 'fuel', 'drive', 'condition'],
  jobs: ['company', 'position', 'salary', 'jobType', 'experience', 'workMode'],
  computers: ['brand', 'model', 'cpu', 'ram', 'storage', 'condition'],
  home: ['brand', 'material', 'size', 'color', 'condition'],
  services: ['company', 'workMode', 'coverage', 'availability', 'priceUnit'],
};

export function formatAttrsLine(section, attrs, category = 'sell') {
  if (!attrs || typeof attrs !== 'object') return '';
  const order = CARD_ATTR_ORDER[section];
  if (!order) return '';

  // Он+загвар/брэндийг нэг хэсэг болгож товчлох (зарын сайтуудын хэв маяг).
  // ⚠️ Брэнд/загвар байхгүй бол (Ажил, Үйлчилгээ) КОМПАНИЙН нэрийг толгой болгоно.
  const brand = String(attrs.brand || '').trim();
  const model = String(attrs.model || '').trim();
  const year = String(attrs.year || '').trim();
  const company = String(attrs.company || '').trim();

  const head = [brand, model].filter(Boolean).join(' ') || company;
  const parts = [];
  if (head) parts.push(year ? `${head}, ${year}` : head);
  else if (year) parts.push(year);

  const skip = new Set(['brand', 'model', 'year', 'company']);
  order.forEach((k) => {
    if (skip.has(k)) return;
    const v = attrs[k];
    if (v === undefined || v === null || String(v).trim() === '') return;
    const field = getAttrField(section, k);
    // ⚠️ Нэгжийг нь текстэд оруулсан эсвэл мөрөнд товчлон харуулна
    if (k === 'mileage') parts.push(`${Number(String(v).replace(/\D/g, '')).toLocaleString('en-US')} км`);
    else if (k === 'engine') parts.push(`${v} л`);
    else if (k === 'salary') parts.push(`₮${Number(String(v).replace(/\D/g, '')).toLocaleString('en-US')}`);
    // ⚠️ «Албан тушаал» нь компанийн дараа icon-ГҮЙ, энгийн текстээр
    else if (k === 'position') parts.push(String(v));
    else if (k === 'ram' || k === 'storage' || k === 'size' || k === 'screen') parts.push(String(v));
    else parts.push(field && field.icon ? `${field.icon} ${v}` : String(v));
  });

  // Ажилд «Ажилд авна» гэдгийг тодруулах (компани бичээгүй бол)
  if (section === 'jobs' && !company) parts.unshift('Ажилд авна');

  return parts.join(' · ');
}


