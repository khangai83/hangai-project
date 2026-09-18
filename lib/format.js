import { PROPERTY_TYPE_ICONS, PRICE_TYPE_LABELS, getPropertyTypePathLabel } from './locationData';

// Үнийн форматлалт: 280000000 -> 280,000,000
export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '0';
  return Number(value).toLocaleString('en-US');
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
