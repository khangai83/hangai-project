import { PROPERTY_TYPE_ICONS, PRICE_TYPE_LABELS, getPropertyTypePathLabel } from './locationData';

// Үнийн форматлалт: 280000000 -> 280,000,000
export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '0';
  return Number(value).toLocaleString('en-US');
}

// Тоолуурын форматлалт: 1284 -> 1,284 (үзсэн/таалагдсан тоо гэх мэт)
export function formatCount(value) {
  const n = Math.round(Number(value) || 0);
  return n.toLocaleString('en-US');
}

/**
 * ҮНИЙГ мянгатаар хувааж харуулах: '250000000' | 250000000 → '250,000,000'
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: урт тоог бичих үед «25000000» ба «250000000» хоёрыг
 * нүдээр ялгахад хэцүү — тэгийг буруу тоолбол үнэ 10 дахин зөрнө.
 * Мянгатын таслалт нь орны тоог шууд харагдуулна.
 *
 * ⚠️ ЗӨВХӨН ЦИФР хүлээнэ — зай, таслал, ₮ тэмдэгтийг алгасна. Ингэснээр
 *    хэрэглэгч «250 000 000» эсвэл «250,000,000» гэж буулгасан ч зөв болно.
 *    Эхний тэгүүдийг хасна ('007' → '7'). Хоосон / цифргүй бол '' буцаана.
 *
 * @param {string|number} value
 * @returns {string} — таслалтай тоо, эсвэл ''
 */
export function formatThousands(value) {
  const digits = String(value == null ? '' : value)
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

/** Оронгийн тоо (тэг тоолох алдаанаас сэргийлнэ): '250000000' → 9 */
export function digitCount(value) {
  return String(value == null ? '' : value).replace(/\D/g, '').length;
}

/**
 * Товч уншигдах үнэ: 250000000 → '250 сая' · 1500000 → '1.5 сая' · 900 → '900'
 * (0 эсвэл цифргүй бол '' буцаана)
 */
export function shortPrice(value) {
  const n = Number(String(value == null ? '' : value).replace(/\D/g, '')) || 0;
  if (n <= 0) return '';
  const trim = (v) => String(Number(v.toFixed(2)));
  if (n >= 1_000_000_000) return `${trim(n / 1_000_000_000)} тэрбум`;
  if (n >= 1_000_000) return `${trim(n / 1_000_000)} сая`;
  if (n >= 1_000) return `${trim(n / 1_000)} мянга`;
  return String(n);
}

/** Огноо → '09-23' (графикийн шошго, UTC) */
export function formatDayShort(dayStr) {
  const s = String(dayStr || '');
  return s.length >= 10 ? `${s.slice(5, 7)}-${s.slice(8, 10)}` : '';
}

export function getPriceTypeLabel(type) {
  return PRICE_TYPE_LABELS[type] || '';
}

export function getPropertyIcon(type) {
  return PROPERTY_TYPE_ICONS[type] || '🏠';
}

/**
 * Төрөл + категори → дэлгэцийн нэр.
 * Жишээ: getPropertyTypeLabel('Орон сууц', 'sell') → 'Орон сууц зарна'
 *        getPropertyTypeLabel('Орон сууц', 'rent') → 'Орон сууц түрээслүүлнэ'
 */
export function getPropertyTypeLabel(type, category) {
  return getPropertyTypePathLabel(type, category);
}

/** Давхрын шошго. Жишээ: (5, 9) → '5 / 9 давхар', (5) → '5 давхарт' */
export function getFloorLabel(floor, totalFloors) {
  const f = Number(floor) || 0;
  const t = Number(totalFloors) || 0;
  if (!f && !t) return '';
  if (f && t) return `${f} / ${t} давхар`;
  if (f) return `${f} давхарт`;
  return `${t} давхар барилга`;
}

/** Гараж. true → 'Байгаа', false → 'Байхгүй', null/undefined → '' */
export function getGarageLabel(value) {
  if (value === true) return 'Байгаа';
  if (value === false) return 'Байхгүй';
  return '';
}

/**
 * Зарын БҮТЭН хаяг — байгаа хэсгүүдийг л ', '-ээр холбоно.
 * Жишээ: 'Хангай дүүрэг 16-р байр, 5-р хороо, Баянгол, Улаанбаатар'
 * ⚠️ Дэлгэрэнгүй хуудас болон зарын карт ХОЁУЛАА үүнийг ашиглана
 *    (хаяг хоёр газарт өөр өөрөөр харагдахаас сэргийлнэ).
 */
export function formatAddress(listing) {
  if (!listing) return '';
  return [listing.address_detail, listing.khoroo, listing.district, listing.city]
    .filter(Boolean)
    .join(', ');
}

/** Тоон утга > 0 бол буцаана, эс бөгөөс null (DB-д null оруулах) */
export function positiveNumberOrNull(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

export function getCategoryLabel(cat) {
  return cat === 'sell' ? 'Зарах' : cat === 'rent' ? 'Түрээслэх' : 'Бүгд';
}

// Хугацааны форматлалт: "сая өмнө", "цагын өмнө" гэх мэт
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'дөнгөж сая';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} минутын өмнө`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} өдрийн өмнө`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} сарын өмнө`;
  const years = Math.floor(days / 365);
  return `${years} жилийн өмнө`;
}

// Утасны дугаарыг сунгах: 99112233 -> +97699112233
export function normalizePhone(phone) {
  let p = String(phone || '').replace(/[^\d]/g, '');
  if (p.startsWith('976')) return `+${p}`;
  if (p.startsWith('0')) p = p.slice(1);
  if (!p.startsWith('976')) p = `976${p}`;
  return `+${p}`;
}

// images нь хоёр төрлийн утга агуулна: localStorage оруулсан svg path
// ЭСВЭЛ Supabase Storage-ийн public URL
export function imageSrc(src) {
  return src || null;
}

export function firstImage(listing) {
  const images = Array.isArray(listing.images) ? listing.images : [];
  return images.length ? images[0] : null;
}
