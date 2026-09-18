// ============================================================
// fbParser.js — Facebook группээс гаргаж авсан Монгол зарын
// текстыг структурат талбарт (CommonJS, цэвэр — хамааралгүй).
// Скрипт (node) болон клиент (Next/webpack)-ээс аль алинд ашиглана.
//
// parse нь "best-effort" — алдаатай байж болзошгүй тул үр дүнг
// хүн баталгаажуулах queue-д харуулж, нийтлэхээс өмнө засварлах боломжтой.
// ============================================================

// ---- Зар тодорхойлоход хэрэглэх тогтмол жагсаалтууд (locationData-аас салангид) ----
var PROPERTY_TYPES = [
  'Орон сууц', 'Газар', 'Худалдаа, үйлчилгээний талбай',
  'АОС, хаус, зуслан, амралтын газар', 'Үйлдвэр, агуулах, обьект',
  'Оффис', 'Хашаа байшин', 'Гараж, контейнер, зөөврийн сууц',
];

var UB_DISTRICTS = ['Баянгол', 'Баянзүрх', 'Сүхбаатар', 'Хан-Уул', 'Чингэлтэй', 'Сонгинохайрхан', 'Налайх', 'Багануур', 'Багахангай'];

// Аймгийн нэрс -> хот/аймаг
var CITY_KEYWORDS = {
  'Архангай': 'Архангай', 'Баян-Өлгий': 'Баян-Өлгий', 'Баянхонгор': 'Баянхонгор',
  'Булган': 'Булган', 'Говь-Алтай': 'Говь-Алтай', 'Говьсүмбэр': 'Говьсүмбэр',
  'Дархан': 'Дархан-Уул', 'Дорноговь': 'Дорноговь', 'Дорнод': 'Дорнод',
  'Дундговь': 'Дундговь', 'Завхан': 'Завхан', 'Эрдэнэт': 'Орхон', 'Орхон': 'Орхон',
  'Өвөрхангай': 'Өвөрхангай', 'Өмнөговь': 'Өмнөговь', 'Сүхбаатар': 'Сүхбаатар',
  'Сэлэнгэ': 'Сэлэнгэ', 'Төв': 'Төв', 'Увс': 'Увс', 'Ховд': 'Ховд',
  'Хөвсгөл': 'Хөвсгөл', 'Хэнтий': 'Хэнтий',
};

function normalizeText(t) {
  return String(t || '')
    .replace(/\u00a0/g, ' ')       // nbsp -> space
    .replace(/\s+/g, ' ')
    .trim();
}

// Хэмжээнд ашиглагдах тоог parse: "1.2" -> 1.2, "1,5" -> 1.5, "1,500,000" -> 1500000
function toNumber(str) {
  var s = String(str || '').replace(/[₮$\s]/g, '');
  if (/^\d{1,3}(,\d{3})+$/.test(s)) return parseInt(s.replace(/,/g, ''), 10);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return parseFloat(s.replace(/,/g, '.'));
}

// Хороо: "5-р хороо", "5р хороо", "5-р хороолол"
function detectKhoroo(text) {
  var m = text.match(/(\d{1,2})\s*-?\s*р?\s*хороо(?![ол])/i);
  if (m) return m[1] + '-р хороо';
  var m2 = text.match(/(\d{1,2})\s*-?\s*р?\s*хороолол/i);
  return m2 ? m2[1] + '-р хороо' : '';
}

function detectDistrict(text) {
  for (var i = 0; i < UB_DISTRICTS.length; i++) {
    if (text.indexOf(UB_DISTRICTS[i]) !== -1) return UB_DISTRICTS[i];
  }
  return '';
}

function detectCity(text, district) {
  if (district) return 'Улаанбаатар';
  for (var key in CITY_KEYWORDS) {
    if (Object.prototype.hasOwnProperty.call(CITY_KEYWORDS, key) && text.indexOf(key) !== -1) {
      return CITY_KEYWORDS[key];
    }
  }
  return 'Улаанбаатар';
}

function detectRooms(text) {
  var m = text.match(/(\d{1,2})\s*өрөө/i);
  return m ? parseInt(m[1], 10) : 0;
}

function detectArea(text) {
  var m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:м\s*2|м2|м\.кв|кв\.?\s*м|метр\s*квадрат)/i);
  return m ? toNumber(m[1]) : 0;
}

// Центийг олох — "X сая", "X сая төгрөг", "X мянга/мянган төгрөг", "X төгрөг"
function detectPrice(text) {
  var patterns = [
    { re: /(\d[\d.,]*)\s*сая\s*(?:төгрөг|төг|₮)?/i, mult: 1e6 },
    { re: /(\d[\d.,]*)\s*(?:мянган|мянга)\s*(?:төгрөг|төг|₮)?/i, mult: 1e3 },
    { re: /(\d[\d.,]*)\s*(?:төгрөг|төг|₮)/i, mult: 1 },
    { re: /\$\s*(\d[\d.,]*)/i, mult: 1 },
  ];
  var best = null;
  var text2 = normalizeText(text);
  for (var i = 0; i < patterns.length; i++) {
    var m = patterns[i].re.exec(text2);
    if (m) {
      best = { raw: m[1], val: toNumber(m[1]) * patterns[i].mult, start: m.index, mult: patterns[i].mult };
      break;
    }
  }
  if (!best) return { value: 0, type: 'total', found: false };

  // Харьцангуй контекстээс үнийн төрөл тодорхойлох
  var ctx = text2.slice(Math.max(0, best.start - 40), best.start + 60);
  var type = 'total';
  if (/\bөдөрт\b|\bөдөр\b/i.test(ctx)) type = 'day';
  else if (/\bм2 тутамд\b|\bметр тутамд\b|\bм²\b/i.test(ctx)) type = 'sqm';
  else if (/\bсард\b|\bсарын\b|\bсар\b/i.test(ctx)) type = 'month';

  return { value: Math.round(best.val), type: type, found: true };
}

function detectCategory(text, price) {
  if (/түрээслүүлнэ|түрээслэнэ|түрээслэж|түрээсээр|түрээсэд|түрээсийн|түрээслэгдэн|түрээсэлнэ/i.test(text)) return 'rent';
  if (/худалдана|худалдах|худалдаанд|худалдагдана|зарна|зарж байна|борлуулна|нийлүүлнэ|худалдаж байна/i.test(text)) return 'sell';
  if (price.found && (price.type === 'month' || price.type === 'day')) return 'rent';
  return 'sell';
}

function detectPropertyType(text) {
  if (/гараж|контейнер|зөөврийн\s*сууц/i.test(text)) return 'Гараж, контейнер, зөөврийн сууц';
  if (/газар|газрын эрхийн|газартай/i.test(text)) return 'Газар';
  if (/хашаа\s*байшин|хувийн\s*байшин|2\s*давхар\s*байшин|хоёр\s*давхар/i.test(text)) return 'Хашаа байшин';
  if (/\boffice\b|оффис/i.test(text)) return 'Оффис';
  if (/худалдаа\s*[үйлчилгээ]|дэлгүүр|шоурум|талбай\s*түрээс|shop/i.test(text)) return 'Худалдаа, үйлчилгээний талбай';
  if (/агуулах|үйлдвэр|обьект|объект|цех/i.test(text)) return 'Үйлдвэр, агуулах, обьект';
  if (/\bhouse\b|\bvilla\b|\bcottage\b|\btownhouse\b|аос|хаус|зуслан|амралтын\s*газар|house\s*for/i.test(text)) return 'АОС, хаус, зуслан, амралтын газар';
  if (/байр|орон\s*сууц|апартамент|apartment|flat|кондо/i.test(text)) return 'Орон сууц';
  return '';
}

// Монгол утас: 99112233, 99 11 22 33, 9911-2233, +97699112233, 976 99 11 22 33
function detectPhone(text) {
  // Олон улсын +976 формат (976 + 8 орон)
  var mi = text.match(/(?<!\d)\+?\s*976[\s-]?([89]\d)[\s-]?(\d{2})[\s-]?(\d{2})[\s-]?(\d{2})(?!\d)/);
  if (mi) return '976' + mi[1] + mi[2] + mi[3] + mi[4];
  // Дотоодын 8 орон
  var mn = text.match(/(?<!\d)([89]\d)[\s-]?(\d{2})[\s-]?(\d{2})[\s-]?(\d{2})(?!\d)/);
  return mn ? mn[1] + mn[2] + mn[3] + mn[4] : '';
}

function formatPriceShort(p) {
  if (p >= 1e6) {
    var s = (p / 1e6).toFixed(1).replace(/\.0$/, '');
    return s + ' сая';
  }
  if (p >= 1e3) return Math.round(p / 1e3) + ' мянга';
  return String(p);
}

function guessTitle(parsed) {
  var parts = [];
  if (parsed.property_type) parts.push(parsed.property_type);
  if (parsed.rooms > 0) parts.push(parsed.rooms + ' өрөө');
  if (parsed.district) parts.push(parsed.district);
  if (parsed.khoroo) parts.push(parsed.khoroo);
  if (parsed.price > 0) {
    var unit = parsed.price_type === 'month' ? '/сар' : parsed.price_type === 'day' ? '/өдөр' : '';
    parts.push(formatPriceShort(parsed.price) + unit);
  }
  var cat = parsed.category === 'rent' ? 'түрээслэнэ' : parsed.category === 'sell' ? 'зарна' : '';
  if (cat) parts.push(cat);
  return parts.join(' — ');
}

// Гол функц: FB post-ын текстыг зарын талбарт буулгана
function parseFacebookPost(rawText) {
  var text = normalizeText(rawText);
  var price = detectPrice(text);
  var category = detectCategory(text, price);
  var district = detectDistrict(text);
  var khoroo = detectKhoroo(text);
  var propertyType = detectPropertyType(text);

  var parsed = {
    category: category,
    property_type: propertyType,
    rooms: detectRooms(text),
    area: detectArea(text),
    price: price.value,
    price_type: category === 'rent' && price.type === 'total' ? 'month' : price.type,
    city: detectCity(text, district),
    district: district,
    khoroo: khoroo,
    address_detail: '',
    phone: detectPhone(text),
    contact_name: '',
    description: text,
    title: '',
  };
  parsed.title = guessTitle(parsed);
  return parsed;
}

module.exports = {
  PROPERTY_TYPES: PROPERTY_TYPES,
  UB_DISTRICTS: UB_DISTRICTS,
  toNumber: toNumber,
  normalizeText: normalizeText,
  detectPrice: detectPrice,
  detectCategory: detectCategory,
  detectPropertyType: detectPropertyType,
  detectRooms: detectRooms,
  detectArea: detectArea,
  detectDistrict: detectDistrict,
  detectKhoroo: detectKhoroo,
  detectCity: detectCity,
  detectPhone: detectPhone,
  parseFacebookPost: parseFacebookPost,
};

