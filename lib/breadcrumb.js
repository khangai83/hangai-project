// ============================================================
// breadcrumb.js — загварын замчилсан цэс (breadcrumb)
// Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө
// ============================================================
import { getPropertyTypePathLabel, formatRoomsLabel, getSection, findSubtypeGroup } from './locationData';
// 🛏 ӨРӨӨНИЙ ТОО (2026-09-30) — одоо МАССИВ (олон сонголт). URL-ийн утга ба
//    «хоосон эсэх» шалгалт нь `lib/roomFilter.mjs` (нэг эх сурвалж) ✓
import { roomsUrlValue, isRoomsEmpty } from './roomFilter.mjs';

/**
 * Хайлттай нүүр хуудасны URL угсрах.
 * ⚠️ `district` нь НЭГ утга (string) — олон дүүрэг зэрэг сонгох нь ХАСАГДСАН.
 * ⚠️ `section` (0016) нь `real-estate` БИШ үед л бичигдэнэ (цэвэр линк).
 * ⚠️ `rooms` нь МАССИВ эсвэл скаляр байж болно — `['1','2']` → `?rooms=1,2`
 *    (🆕 2026-09-30, олон сонголт); хуучин скаляр (`2`) мөн адил ажиллана ✓
 */
export function homeFilterHref({ category, type, rooms, city, district, section } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  // ⚠️ `'all'` (хэсэг сонгоогүй) нь URL-д БИЧИГДЭХГҮЙ — цэвэр линк
  if (section && section !== 'all') params.set('section', section);
  if (type) params.set('type', type);
  const roomsValue = roomsUrlValue(rooms);
  if (roomsValue) params.set('rooms', roomsValue);
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
 * @param {{category?: string, section?: string, propertyType?: string,
 *          rooms?: string|number|Array<string>, district?: string, focus?: boolean}} [state]
 * @returns {Array<{label: string, href?: string, nav?: object, linkLast?: boolean}>}
 *   — сүүлийн элемент нь одоогийн байрлал (линк биш)
 *     ⚠️ `linkLast: true` бол сүүлийн элемент Ч линк (🎯 FOCUS — хэсгийн нэр)
 *   — `nav`: линк дээр дарахад ХЭНИЙГ буцаахыг заасан тодорхойлолт.
 *     `HomeClient` үүнийг ШУУД төлөвт хэрэглэнэ (URL-ээр явахгүй!)
 *     ⚠️ `nav.keepOpen` = панель НЭЭЛТТЭЙ үлдэнэ (хэсгийн энгийн харагдац)
 */
export function buildHomeBreadcrumb({
  category = 'all',
  section = 'real-estate',
  propertyType = '',
  rooms = '',
  district = '',
  // 🎯 FOCUS (2026-09-30) — `collapsed: true` бүлэг (💻 «Notebook») НЭЭЛТТЭЙ
  //    үед хэрэглэгч ШҮҮЛТГҮЙ нэг түвшин ГҮНЗГИЙ (зөвхөн панелийн drill-down)
  //    байна. Тэгвэл хэсгийн crumb нь СҮҮЛИЙН мөр болдог ч ЛИНК болж
  //    (`linkLast`), дарахад хэсгийн ЭНГИЙН харагдац руу буцаана (`keepOpen`) ✓
  focus = false,
} = {}) {
  const cat = category === 'rent' ? 'rent' : category === 'sell' ? 'sell' : 'all';
  // ⚠️ `'all'` (эсвэл хоосон) = хэсэг СОНГООГҮЙ — «Бүх зар» үндсэн дэлгэц
  const noSection = !section || section === 'all';
  const sec = getSection(noSection ? 'real-estate' : section);
  const isRE = !noSection && section === 'real-estate';

  // ⚠️ Хэсэг тус бүрд «буцах» үед цэвэрлэх талбарууд ӨӨР:
  //    үл хөдлөх → өрөө; бусад → attr (jsonb)
  // ⚠️ `rooms` (2026-09-30) нь МАССИВ — хоослох утга нь `''` БИШ `[]`
  const clearType = isRE ? { propertyType: '', rooms: [] } : { propertyType: '', rooms: [], attrs: {} };

  const items = [
    // «Бүх зар» — бүх шүүлтийг цэвэрлэнэ
    { label: 'Бүх зар', href: homeFilterHref({}), nav: { reset: true } },
  ];

  // ⚠️ 2026-09-27: 3 ДАХЬ ТҮВШИН (`services` — `SERVICE_SUBTYPE_GROUPS`).
  //    Сонгосон дэд төрөл нь БҮЛЭГТ хамаарах бол замд нь бүлгийн түвшин нэмнэ:
  //      Бүх зар › Үйлчилгээ › Боловсрол & Сургалт › Сургалт ба курс
  //    ⚠️ 2026-09-29: бүлгүүд нь `HomeClient` дээр ШУУД НЭЭЛТТЭЙ харагддаг
  //       болсон (`groupOpen` төлөв ХАСАГДСАН) тул `nav.group` нь одоо
  //       «панель нээлттэй байх ёстой» гэсэн утгатай л үлдэв —
  //       `null` = бүх хэсгийн tile дэлгэц рүү буцна.
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
            // 🎯 `keepOpen: true` (2026-09-30, хэрэглэгчийн хүсэлт: «Notebook
            //    хэсэгт орсон байлаад ... “Компьютер, Дагалдах хэрэгсэл” дээр
            //    дархад “Компьютер, Дагалдах хэрэгсэл”-ийн зарууд руу шилждэг
            //    байх») — панель ХААГДАХГҮЙ: хэсгийн ЭНГИЙН харагдац (бүх бүлэг
            //    + хэсгийн зарууд) гарна. ⚠️ `HomeClient.goToCrumb` үүнийг
            //    `nav.group`-ООС ӨМНӨ шалгана (эс бөгөөс `group: null` нь
            //    панелийг дахин хааж 7 tile буцаана ✗).
            nav: { section, group: null, filters: clearType, keepOpen: true },
            // ⚠️ FOCUS (ж: «Notebook» нээлттэй) үед энэ crumb нь СҮҮЛИЙН мөр
            //    болдог — тэгвэл ч ЛИНК байх ёстой (нэг түвшин дээшээ буцах
            //    зам). `Breadcrumb.jsx` → `clickable = !isLast || linkLast` ✓
            linkLast: !!focus,
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
      // ⚠️ Бүлгийн линк нь панелийг НЭЭЛТТЭЙ барина (`sectionOpen = true`) —
      //    бүлгүүд нь 2026-09-29-ээс ШУУД харагддаг тул «нээх» ойлголт
      //    байхгүй, зөвхөн хэсгийн tile дэлгэц рүү унахгүй байх нь чухал ✓
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

  if (!isRoomsEmpty(rooms)) {
    items.push({
      label: formatRoomsLabel(rooms),
      href: homeFilterHref({ category: cat, type: propertyType, rooms }),
      // 🆕 ОЛОН СОНГОЛТ (2026-09-30) — `rooms` нь МАССИВ тул хоослох утга нь
      //   `''` БИШ `[]` (эс бөгөөс `filters.rooms.length` нь `undefined` болж
      //   «Өрөө»-ний мөр дээр `includes` унана ✗)
      nav: { category: cat, filters: { rooms: [] } },
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
