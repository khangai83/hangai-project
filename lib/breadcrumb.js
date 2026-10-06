// ============================================================
// breadcrumb.js — загварын замчилсан цэс (breadcrumb)
// Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө
// ============================================================
import { getPropertyTypePathLabel, formatRoomsLabel, getSection, findSubtypeGroup } from './locationData';
// 🛏 ӨРӨӨНИЙ ТОО (2026-09-30) — одоо МАССИВ (олон сонголт). URL-ийн утга ба
//    «хоосон эсэх» шалгалт нь `lib/roomFilter.mjs` (нэг эх сурвалж) ✓
import { roomsUrlValue, isRoomsEmpty } from './roomFilter.mjs';
// 🗺 ДҮҮРЭГ / СУМ (2026-10-03) — мөн МАССИВ болов (олон сонголт).
//    URL-ийн утга (`district=А,Б`) ба шошго («А» / «2 дүүрэг») нь
//    `lib/districtFilter.mjs` (нэг эх сурвалж) ✓
import {
  districtsUrlValue, isDistrictsEmpty, districtsFilterLabel,
} from './districtFilter.mjs';

/**
 * Хайлттай нүүр хуудасны URL угсрах.
 * ⚠️ `districts` (2026-10-03) нь МАССИВ — `['А','Б']` → `?district=А,Б`
 *    (хэрэглэгчийн хүсэлт: «Дүүрэг / Сум-ийг Өрөөний тоо хайхтай адилхан
 *    олон сонголт хийх боломжтой болго»). Хуучин скаляр `district` ч
 *    дэмжигдэнэ ✓ (гэрээ нь `lib/districtFilter.mjs`)
 * ⚠️ `section` (0016) нь `real-estate` БИШ үед л бичигдэнэ (цэвэр линк).
 * ⚠️ `rooms` нь МАССИВ эсвэл скаляр байж болно — `['1','2']` → `?rooms=1,2`
 *    (🆕 2026-09-30, олон сонголт); хуучин скаляр (`2`) мөн адил ажиллана ✓
 */
export function homeFilterHref({ category, type, rooms, city, district, districts, section } = {}) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  // ⚠️ `'all'` (хэсэг сонгоогүй) нь URL-д БИЧИГДЭХГҮЙ — цэвэр линк
  if (section && section !== 'all') params.set('section', section);
  if (type) params.set('type', type);
  const roomsValue = roomsUrlValue(rooms);
  if (roomsValue) params.set('rooms', roomsValue);
  if (city) params.set('city', city);
  // 🗺 `districts` (шинэ, МАССИВ) ба `district` (хуучин, скаляр) — аль нь ч
  //    ирж болно; хоосон үед БИЧИХГҮЙ (цэвэр линк ✓)
  const districtValue = districtsUrlValue(districts ?? district);
  if (districtValue) params.set('district', districtValue);
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

/**
 * Зарын breadcrumb мөрүүд.
 *
 * ⚠️ ХЭСЭГ (2026-10-01) — өмнө нь `listing.section`-ийг ОГТ тооцохгүй,
 *    `real-estate` гэж ХАТУУ бичсэн байв ✗. Улмаар `auto` хэсгийн зар
 *    (ж: «Суудлын машин») дэлгэрэнгүй хуудсанд
 *    «Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Суудлын машин» гэж БУРУУ
 *    гардаг байсныг зассан ✓. Одоо хэсэг тус бүрд:
 *      • `real-estate` → Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө
 *      • `auto`/`computers`/… → Бүх зар › Автомашин › Суудлын машин
 *    (⚠️ `buildHomeBreadcrumb`-ын хэсгийн логик ЯГ ИЖИЛ — хоёр breadcrumb
 *     зөрөхгүй байх ёстой ✓)
 *
 * @returns {Array<{label: string, href?: string, linkLast?: boolean}>}
 *   — ⚠️ 2026-10-01 (15): сүүлийн элемент Ч **линк** болно (`linkLast: true`) —
 *     дэлгэрэнгүй хуудсан дээр сүүлийн crumb нь «одоогийн хуудас» БИШ,
 *     зарын ХАМААРАХ шүүлт (дэд төрөл / бүлэг / өрөө) тул дарахад тэр
 *     шүүлтийн ЗАРЛУУД руу шилжих нь зүйтэй ✓ (`Breadcrumb.jsx` мөр 99)
 */
export function buildListingBreadcrumb(listing) {
  if (!listing) return [];

  // ⚠️ Хуучин мөрүүдэд `section` хоосон байж болзошгүй → үл хөдлөх гэж үзнэ
  //    (`lib/queries.js` → `fetchMyStats`-ийн ижил fallback ✓)
  const section = listing.section || 'real-estate';
  const isRE = section === 'real-estate';
  const sec = getSection(section);
  // ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөхөд (`hasCategoryChoice`) — бусад
  //    хэсэгт `category` нь DB-ийн default `sell` хэвээр ч breadcrumb-д
  //    ОРУУЛАХГҮЙ (эс бөгөөс «Автомашин › Автомашин» гэж ДАВХАРДАХ байв ✗)
  const category = isRE && listing.category === 'rent' ? 'rent' : 'sell';

  const items = [{ label: 'Бүх зар', href: '/' }];

  if (isRE) {
    // ⚠️ 2026-10-01 (15) — `section: 'real-estate'` нь ЗААВАЛ: `HomeClient` нь
    //    `category`-г ЗӨВХӨН `?section=real-estate` үед л уншдаг (мөр 366–371) ✗
    //    → эс бөгөөс «Үл хөдлөх зарна» дарж ороход `category=sell` нь алга болж,
    //    ТҮРЭЭСЛЭХ зарууд ч холилдон гардаг байв. Нүүр хуудсны ӨӨРИЙН
    //    breadcrumb (`buildHomeBreadcrumb`) энэ 3 линкээ ЯГ ИЖИЛ хэлбэрээр
    //    (`homeFilterHref({ category, section })`) үүсгэдэг ✓ — одоо НИЙЦЭВ ✓
    items.push(
      { label: 'Үл хөдлөх', href: homeFilterHref({ category: 'all', section: 'real-estate' }) },
      {
        label: category === 'rent' ? 'Үл хөдлөх түрээслүүлнэ' : 'Үл хөдлөх зарна',
        href: homeFilterHref({ category, section: 'real-estate' }),
      },
    );
  } else {
    // «Бүх зар › Автомашин» — ⚠️ `section` ЗААВАЛ (`buildHomeBreadcrumb`-ийн адил:
    //    эс бөгөөс линк нь үл хөдлөхийн нүүр рүү буруу хөтөлнө ✗)
    items.push({ label: sec.label, href: homeFilterHref({ section }) });
  }

  if (listing.property_type) {
    // 🛠 БҮЛЭГ (3 дахь түвшин) — зөвхөн `computers`/`electric`/`services`…
    //    ⚠️ Бүлэггүй хэсэг (ж: `auto`) эсвэл бүлгийн item БИШ дэд төрөлд `null` ✓
    const group = findSubtypeGroup(section, listing.property_type);
    if (group) {
      items.push({ label: group.label, href: homeFilterHref({ section }) });
    }

    // ⚠️ Үл хөдлөх дээр категори -> «Орон сууц зарна/түрээслүүлнэ»,
    //    бусад хэсэгт дэд төрлийн нэр ШУУД (ж: «Суудлын машин») ✓
    const typeLabel = isRE
      ? getPropertyTypePathLabel(listing.property_type, category)
      : listing.property_type;
    items.push({
      label: typeLabel,
      // ⚠️ 2026-10-01 (15) — үл хөдлөхөд `section: 'real-estate'` ЗААВАЛ
      //    (дээрх 3 линкийн адил шалтгаан: эс бөгөөс `category` уншигдахгүй ✗)
      href: isRE
        ? homeFilterHref({ category, type: listing.property_type, section: 'real-estate' })
        : homeFilterHref({ section, type: listing.property_type }),
    });

    if (isRE && Number(listing.rooms) > 0) {
      const rooms = Number(listing.rooms);
      items.push({
        label: formatRoomsLabel(rooms),
        href: homeFilterHref({ category, type: listing.property_type, rooms, section: 'real-estate' }),
      });
    }
  }

  // ============================================================
  // 🔗 СҮҮЛИЙН МӨР Ч ЛИНК БОЛОВ (2026-10-01 (15))
  //
  // Хэрэглэгчийн хүсэлт: «Бүх зар › Автомашин › Суудлын машин — … Суудлын машин
  // гэдэг дээр дархад Суудлын машин-ны зарлуу ордог байх, бусад хэсгүүд ч мөн
  // адил болгоорой».
  //
  // ⚠️ Дэлгэрэнгүй хуудсанд сүүлийн crumb нь «одоогийн хуудас» БИШ — тэр нь
  //    зарын ХАМААРАХ шүүлт (🚗 дэд төрөл · 🛠 бүлэг · 🛏 өрөө) тул дарахад
  //    ТЭР ШҮҮЛТИЙН ЗАРЛУУД (нүүр хуудас, `homeFilterHref`) руу шилжих нь
  //    зүйтэй ✓. Өмнө нь `<span>` байсан тул дарж БОЛОХГҮЙ байв ✗
  //
  // ⚙️ Механизм нь 2026-09-30-аас нүүр хуудсанд ашиглагдаж байсан ЯГ ИЖИЛ туг:
  //    `Breadcrumb.jsx` → `clickable = !!it.href && (!isLast || !!it.linkLast)`
  //    ⚠️ Хэсэг тус бүрд ТУСДАА нэмэх шаардлагагүй — сүүлийн мөр нь хэсгээс
  //       хамаарч өөр байдаг (auto → «Суудлын машин»; computers → «Apple»;
  //       🛋️ тавилга → «Буйдан, кресло»; үл хөдлөх+өрөө → «3 өрөө») тул
  //       ДООР НЭГ дор тэмдэглэнэ ⇒ БҮХ хэсэгт ижил ажиллана ✓
  // ============================================================
  const last = items[items.length - 1];
  if (last && last.href) last.linkLast = true;

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
 *          rooms?: string|number|Array<string>, district?: string,
 *          districts?: Array<string>, focus?: boolean}} [state]
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
  // 🗺 ДҮҮРЭГ / СУМ (2026-10-03) — одоо МАССИВ (олон сонголттой чипүүд).
  //    ⚠️ Хуучин `district` (скаляр) ч хэвээр ажиллана — `HomeClient` нь
  //    `districts` дамжуулна, бусад дуудагч (хуучин код/тест) `district` ✓
  districts = [],
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
  //      Бүх зар › Үйлчилгээ › Сургалт, курс › Гадаад хэл
  //    (✏️ 2026-10-06 (11): 1 дэх групп «Боловсрол & Сургалт» → «Сургалт, курс»)
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

  // Байршил — дүүрэг сонгосон бол нэрээр (нэг) эсвэл «N дүүрэг» (олон)
  // ⚠️ `districts` (массив) нь үндсэн зам; `district` (хуучин скаляр) ч
  //    дэмжигдэнэ — `isDistrictsEmpty` / `districtsUrlValue` хоёуланг уншина ✓
  const districtList = districts && districts.length ? districts : district;
  if (!isDistrictsEmpty(districtList)) {
    items.push({
      label: districtsFilterLabel(districtList),
      href: homeFilterHref({ category: cat, type: propertyType, rooms, districts: districtList }),
      nav: { category: cat, filters: { districts: [], khoroos: [] } },
    });
  }

  return items;
}
