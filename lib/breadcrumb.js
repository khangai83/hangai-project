// ============================================================
// breadcrumb.js — unegui.mn загварын замчилсан цэс (breadcrumb)
// Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө
// ============================================================
import { getPropertyTypePathLabel } from './locationData';

/** Шүүлтүүртэй нүүр хуудасны URL угсрах */
export function homeFilterHref({ category, type, rooms, city, district } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (type) params.set('type', type);
  if (rooms) params.set('rooms', String(rooms));
  if (city) params.set('city', city);
  if (district) params.set('district', district);
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

/**
 * Зарын breadcrumb мөрүүд.
 * @returns {Array<{label: string, href?: string}>} — сүүлийн элемент нь одоогийн хуудас (hrefгүй)
 */
export function buildListingBreadcrumb(listing) {
  if (!listing) return [];

  const category = listing.category === 'rent' ? 'rent' : 'sell';
  const categoryLabel = category === 'rent' ? 'Үл хөдлөх түрээслүүлнэ' : 'Үл хөдлөх зарна';

  const items = [
    { label: 'Бүх зар', href: '/' },
    { label: 'Үл хөдлөх', href: homeFilterHref({ category: 'all' }) },
    { label: categoryLabel, href: homeFilterHref({ category }) },
  ];

  if (listing.property_type) {
    items.push({
      label: getPropertyTypePathLabel(listing.property_type, category),
      href: homeFilterHref({ category, type: listing.property_type }),
    });

    if (Number(listing.rooms) > 0) {
      const rooms = Number(listing.rooms);
      items.push({
        label: rooms >= 5 ? '5+ өрөө' : `${rooms} өрөө`,
        href: homeFilterHref({ category, type: listing.property_type, rooms }),
      });
    }
  }

  return items;
}

/**
 * Нүүр хуудсан дээрх шүүлтийн зам (unegui.mn загвар).
 * Шүүлт байхгүй бол [] буцаана.
 * @param {{category?: string, propertyType?: string, rooms?: string|number}} filters
 */
export function buildHomeBreadcrumb({ category = 'all', propertyType = '', rooms = '' } = {}) {
  const cat = category === 'rent' ? 'rent' : category === 'sell' ? 'sell' : 'all';
  const isFiltered = cat !== 'all' || !!propertyType || !!rooms;
  if (!isFiltered) return [];

  const items = [
    { label: 'Бүх зар', href: homeFilterHref({}) },
    { label: 'Үл хөдлөх', href: homeFilterHref({ category: 'all' }) },
  ];

  if (cat === 'all') return items;

  items.push({
    label: cat === 'rent' ? 'Үл хөдлөх түрээслүүлнэ' : 'Үл хөдлөх зарна',
    href: homeFilterHref({ category: cat }),
  });

  if (!propertyType) return items;

  items.push({
    label: getPropertyTypePathLabel(propertyType, cat),
    href: homeFilterHref({ category: cat, type: propertyType }),
  });

  if (rooms) {
    const r = Number(rooms);
    items.push({ label: r >= 5 ? '5+ өрөө' : `${r} өрөө` });
  }

  return items;
}
