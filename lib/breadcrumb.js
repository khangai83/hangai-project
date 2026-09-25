// ============================================================
// breadcrumb.js — unegui.mn загварын замчилсан цэс (breadcrumb)
// Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө
// ============================================================
import { getPropertyTypePathLabel, formatRoomsLabel } from './locationData';

/**
 * Хайлттай нүүр хуудасны URL угсрах.
 * ⚠️ `district` нь НЭГ утга (string) — олон дүүрэг зэрэг сонгох нь ХАСАГДСАН.
 */
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
        label: formatRoomsLabel(rooms),
        href: homeFilterHref({ category, type: listing.property_type, rooms }),
      });
    }
  }

  return items;
}

/**
 * Нүүр хуудсан дээрх хайлтын зам (unegui.mn загвар).
 *
 * ⚠️ ХАЙЛТ БАЙХГҮЙ Ч БАС ХАРАГДАНА — хэрэглэгч «хаана явж байгаагаа» байнга
 *    хардаг байх ёстой (unegui.mn-ийн тогтмол breadcrumb). Хамгийн багадаа
 *    «Бүх зар › Үл хөдлөх» гэж гарна.
 *
 * Жишээ: Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө
 *
 * @param {{category?: string, propertyType?: string, rooms?: string|number,
 *          district?: string}} [state]
 * @returns {Array<{label: string, href?: string}>} — сүүлийн элемент нь одоогийн байрлал
 */
export function buildHomeBreadcrumb({
  category = 'all',
  propertyType = '',
  rooms = '',
  district = '',
} = {}) {
  const cat = category === 'rent' ? 'rent' : category === 'sell' ? 'sell' : 'all';

  const items = [
    { label: 'Бүх зар', href: homeFilterHref({}) },
    { label: 'Үл хөдлөх', href: homeFilterHref({ category: 'all' }) },
  ];

  if (cat !== 'all') {
    items.push({
      label: cat === 'rent' ? 'Үл хөдлөх түрээслүүлнэ' : 'Үл хөдлөх зарна',
      href: homeFilterHref({ category: cat }),
    });
  }

  if (propertyType) {
    items.push({
      label: getPropertyTypePathLabel(propertyType, cat),
      href: homeFilterHref({ category: cat, type: propertyType }),
    });
  }

  if (rooms) {
    items.push({
      label: formatRoomsLabel(rooms),
      href: homeFilterHref({ category: cat, type: propertyType, rooms }),
    });
  }

  // Байршил — дүүрэг сонгосон бол нэрээр
  if (district) {
    items.push({
      label: district,
      href: homeFilterHref({ category: cat, type: propertyType, rooms, district }),
    });
  }

  return items;
}
