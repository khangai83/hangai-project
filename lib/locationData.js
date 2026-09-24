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
// Үл хөдлөх хөрөнгийн төрлүүд — unegui.mn загварын бүрдэл хэсгүүд
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
