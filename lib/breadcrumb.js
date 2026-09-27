// ============================================================
// breadcrumb.js — загварын замчилсан цэс (breadcrumb)
// Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө
// ============================================================
import { getPropertyTypePathLabel, formatRoomsLabel, getSection, findSubtypeGroup } from './locationData';

/**
 * Хайлттай нүүр хуудасны URL угсрах.
 * ⚠️ `district` нь НЭГ утга (string) — олон дүүрэг зэрэг сонгох нь ХАСАГДСАН.
 * ⚠️ `section` (0016) нь `real-estate` БИШ үед л бичигдэнэ (цэвэр линк).
 */
export function homeFilterHref({ category, type, rooms, city, district, section } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  // ⚠️ `'all'` (хэсэг сонгоогүй) нь URL-д БИЧИГДЭХГҮЙ — цэвэр линк
  if (section && section !== 'all') params.set('section', section);
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
 * Нүүр хуудсан дээрх хайлтын зам (стандарт загвар).
 *
 * ⚠️ ХАЙЛТ БАЙХГҮЙ Ч БАС ХАРАГДАНА — хэрэглэгч «хаана явж байгаагаа» байнга
 * хардаг байх ёстой ( тогтмол breadcrumb). Хамгийн багадаа
 *    «Бүх зар › Үл хөдлөх» гэж гарна.
 *
 * ⚠️ ЗӨВХӨН ТӨРӨЛ сонгосон үед эдгээр линк нь ШААРДЛАГАТАЙ — тэр үед категори
 *    болон төрлийн табуудыг хаадаг (`HomeClient`) тул буцах цорын ганц зам нь
 *    энэ breadcrumb болно.
 *
 * Жишээ: Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө
 *
 * @param {{category?: string, propertyType?: string, rooms?: string|number,
 *          district?: string}} [state]
 * @returns {Array<{label: string, href?: string, nav?: object}>}
 *   — сүүлийн элемент нь одоогийн байрлал (линк биш)
 *   — `nav`: линк дээр дарахад ХЭНИЙГ буцаахыг заасан тодорхойлолт.
 *     `HomeClient` үүнийг ШУУД төлөвт хэрэглэнэ (URL-ээр явахгүй!)
 */
export function buildHomeBreadcrumb({
  category = 'all',
  section = 'real-estate',
  propertyType = '',
  rooms = '',
  district = '',
} = {}) {
  const cat = category === 'rent' ? 'rent' : category === 'sell' ? 'sell' : 'all';
  // ⚠️ `'all'` (эсвэл хоосон) = хэсэг СОНГООГҮЙ — «Бүх зар» үндсэн дэлгэц
  const noSection = !section || section === 'all';
  const sec = getSection(noSection ? 'real-estate' : section);
  const isRE = !noSection && section === 'real-estate';

  // ⚠️ Хэсэг тус бүрд «буцах» үед цэвэрлэх талбарууд ӨӨР:
  //    үл хөдлөх → өрөө; бусад → attr (jsonb)
  const clearType = isRE ? { propertyType: '', rooms: '' } : { propertyType: '', rooms: '', attrs: {} };

  const items = [
    // «Бүх зар» — бүх шүүлтийг цэвэрлэнэ
    { label: 'Бүх зар', href: homeFilterHref({}), nav: { reset: true } },
  ];

  // ⚠️ 2026-09-27: 3 ДАХЬ ТҮВШИН (`services` — `SERVICE_SUBTYPE_GROUPS`).
  //    Сонгосон дэд төрөл нь БҮЛЭГТ хамаарах бол замд нь бүлгийн түвшин нэмнэ:
  //      Бүх зар › Үйлчилгээ › Боловсрол & Сургалт › Сургалт ба курс
  //    ⚠️ `nav.group` — линк дээр дарахад тухайн БҮЛГИЙН дэд төрлүүд нээгдэнэ
  //       (`HomeClient` → `setGroupOpen`). `null` = бүлгийг бүрэн хаана.
  const group = !noSection && propertyType ? findSubtypeGroup(section, propertyType) : null;

  // ⚠️ 2 дахь шат: хэсэг СОНГООГҮЙ бол нэмэхгүй (зөвхөн «Бүх зар» үлдэнэ).
  //    Үл хөдлөх бол «Үл хөдлөх», бусад хэсэг бол хэсгийн нэр.
  if (!noSection) {
    items.push(
      isRE
        ? {
            label: 'Үл хөдлөх',
            href: homeFilterHref({ section: 'real-estate' }),
            // ⚠️ `section` нь ЗААВАЛ — эс бөгөөс «Автомашин»-аас «Үл хөдлөх» рүү
            //    буцахад хэсэг нь солигдохгүй, авто зарууд хэвээр үлдэнэ
            nav: { section: 'real-estate', category: 'all', filters: clearType },
          }
        : {
            label: sec.label,
            href: homeFilterHref({ section }),
            // ⚠️ `group: null` → тухайн хэсгийн БҮЛГИЙН жагсаалт руу буцна ✓
            nav: { section, group: null, filters: clearType },
          }
    );
  }

  // ⚠️ Хэсэг СОНГООГҮЙ бол категори гэж байхгүй (тэр нь хэсгийн шинж) —
  //    URL-аас ч зөвхөн `section=real-estate` үед л уншигддаг.
  if (cat !== 'all' && !noSection) {
    items.push({
      label: isRE
        ? (cat === 'rent' ? 'Үл хөдлөх түрээслүүлнэ' : 'Үл хөдлөх зарна')
        : `${sec.label}${cat === 'rent' ? ' түрээслүүлнэ' : ''}`,
      href: homeFilterHref({ category: cat, section: noSection ? undefined : section }),
      nav: { category: cat, section: noSection ? undefined : section, filters: clearType },
    });
  }

  // ---- 🛠 БҮЛЭГ (3 дахь түвшин) — зөвхөн `services` дээр гарна ----
  if (group) {
    items.push({
      label: group.label,
      href: homeFilterHref({ category: cat, section }),
      // ⚠️ Бүлгийн линк дээр дарахад тухайн бүлгийн дэд төрлүүд НЭЭГДЭНЭ
      //    (бүлэг өөрөө шүүлт БИШ — 2026-09-27-ны хэрэглэгчийн сонголт)
      nav: { section, group: group.label, filters: clearType },
    });
  }

  if (propertyType) {
    items.push({
      label: getPropertyTypePathLabel(propertyType, cat),
      href: homeFilterHref({ category: cat, type: propertyType, section: noSection ? undefined : section }),
      nav: { category: cat, section: noSection ? undefined : section, group: group ? group.label : null, filters: clearType },
    });
  }

  if (rooms) {
    items.push({
      label: formatRoomsLabel(rooms),
      href: homeFilterHref({ category: cat, type: propertyType, rooms }),
      nav: { category: cat, filters: { rooms: '' } },
    });
  }

  // Байршил — дүүрэг сонгосон бол нэрээр
  if (district) {
    items.push({
      label: district,
      href: homeFilterHref({ category: cat, type: propertyType, rooms, district }),
      nav: { category: cat, filters: { district: '', khoroos: [] } },
    });
  }

  return items;
}
