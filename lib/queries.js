// ============================================================
// Зарын мэдээллийн сангийн функцууд (Supabase client + RLS)
// Эдгээр нь клиент компонентуудаас дуудагдана.
// ============================================================
import { getSupabase, IMAGE_BUCKET, AVATAR_BUCKET } from './supabaseClient';
// ☁️ Storage (2026-10-02): Cloudflare R2 (үндсэн) + Supabase Storage (нөөц).
//    Дэлгэрэнгүй: `lib/storageClient.mjs`, `lib/storageKeys.mjs`, docs/R2_SETUP.md
import { deleteR2StorageKeys, putToR2, requestPresignedUploads, splitStorageUrls } from './storageClient.mjs';
import { normalizeError } from './errors';
import { ROOM_OPTIONS, getSubtypes, getAttrField, parseAttrRangeKey } from './locationData';
import { MAX_LISTING_TITLE_LENGTH } from './format';
import { normalizeYouTubeUrl } from './youtube.mjs';
import phoneEmail from './phoneEmail';
import { canMessage, validateMessageBody } from './messages.mjs';
// 🔀 ЭРЭМБЭЛЭХ (2026-09-30) — сонголтын утга ба PostgREST-ийн дараалал нь
//    `lib/sortOptions.mjs` (цэвэр, тестлэгддэг) дотор; энд зөвхөн хэрэглэнэ ✓
import { DEFAULT_SORT, sortOrders } from './sortOptions.mjs';
// 🛏 ӨРӨӨНИЙ ТОО (2026-09-30) — ОЛОН СОНГОЛТТОЙ боллоо. OR/IN/>= дүрэм нь
//    `lib/roomFilter.mjs` (цэвэр, тестлэгддэг) дотор; энд зөвхөн хэрэглэнэ ✓
import { applyRoomFilter } from './roomFilter.mjs';
// 💳 ТӨЛБӨРИЙН НӨХЦӨЛ (2026-10-03) — «Үл хөдлөх зарна» ба «Автомашин зарна»
//    хэсэгт ОЛОН СОНГОЛТТОЙ (jsonb `attrs.payment_terms` МАССИВ).
//    `cs` (contains) ба OR дүрэм нь `lib/paymentFilter.mjs` (цэвэр,
//    тестлэгддэг, БОДИТ DB дээр батлагдсан) дотор; энд зөвхөн хэрэглэнэ ✓
import { applyPaymentFilter } from './paymentFilter.mjs';
// 🗺 ДҮҮРЭГ/СУМ (2026-10-03) — ОЛОН СОНГОЛТТОЙ боллоо (хэрэглэгчийн хүсэлт:
//    «Дүүрэг / Сум-ийг Өрөөний тоо хайхтай адилхан олон сонголт хийх
//    боломжтой болго»). Нэг утга → `eq` (хуучинтай ЯГ ижил ✓), олон утга →
//    `in` дүрэм нь `lib/districtFilter.mjs` (цэвэр, тестлэгддэг) дотор;
//    энд зөвхөн хэрэглэнэ ✓
import { applyDistrictFilter } from './districtFilter.mjs';
// 🎨 ОЛОН СОНГОЛТТОЙ ATTR (2026-10-03 (19), хэрэглэгчийн хүсэлт: «Зар хайлт дээр
//    Авто машин сонголт дээр Өнгө ийг Төлбөрийн нөхцөл шиг олон сонголттой
//    болго») — `attrs->>key` дээр `in.()` (OR) үүсгэнэ. Дүрэм нь
//    `lib/attrMultiFilter.mjs` (цэвэр, тестлэгддэг) дотор; энд зөвхөн хэрэглэнэ ✓
// 🔎 2026-10-04 (36): ХАЙЛТТАЙ ТЕКСТ талбар (ж: 🚙 Загвар — «машины загвараас
//    олоныг сонгох боломжтой болго») нь олон утгатай үед `in.()` БИШ
//    `or=(…ilike…)` болно (`applyAttrMultiLikeFilter`) — гэрээ нь `ilike %…%`
//    тул «pri» гэх бүрэн бус бичлэг ч олдох ёстой ✓; мөн `likePattern` нь
//    эндээс (нэг эх сурвалж) ирнэ ✓
import { applyAttrMultiFilter, applyAttrMultiLikeFilter, likePattern } from './attrMultiFilter.mjs';
// 🔎 ХАЙЛТЫН ТЕКСТ (2026-10-05, хэрэглэгчийн хүсэлт: «Хайлтыг сайжруулж
//    өгөөч») — үндсэн хайлт нь `title`/`description`-ыг Ч хайдаг болов ба
//    ОЛОН ҮГТЭЙ боллоо (БҮХ үг тохирно). Логик мөр нь `lib/searchText.mjs`
//    (цэвэр, тестлэгддэг) дотор; энд зөвхөн хэрэглэнэ ✓
import { SEARCH_FIELDS, buildSearchOr, normalizeSearch } from './searchText.mjs';

function needClient() {
  const sb = getSupabase();
  if (!sb) {
    throw new Error('Supabase тохиргоо олдсонгүй. .env.local файл үүсгэнэ үү.');
  }
  return sb;
}

// ⚠️ Эдгээр нь «ДАРАА НЬ» нэмэгдсэн баганууд — migration нь үе шаттай
//    орох боломжтой (ж: локал дээр 0027 ороогүй байж болно). PostgREST
//    schema cache-д байхгүй бол БҮТЭН insert/update уначихдаг тул
//    `missingDetailColumns()` нь ЗӨВХӨН дутуу баганыг хасаж дахин оролдоно ✓
//      0003_listing_details.sql  → build_year, floor, total_floors,
//                                  balconies, has_garage
//      0011_listing_video.sql    → video_url
//      0012_listing_bathrooms.sql→ bathrooms
//      0027_listing_title.sql    → title
const DETAIL_COLUMNS = ['build_year', 'floor', 'total_floors', 'balconies', 'has_garage', 'video_url', 'bathrooms', 'title'];

/**
 * PostgREST/Postgres-ийн алдаанаас АЛЬ НЭМЭЛТ БАГАНА дутуу байгааг олно.
 *
 * ⚠️ ЯАГААД ЧУХАЛ ВЭ: migration-ууд (0003 / 0011 / 0012 / 0027) үе шаттай
 *    орох боломжтой.
 *    Жишээ нь `bathrooms` (0012) дутуу ч `floor` / `build_year` (0003) БАЙГАА үед
 *    өмнөх код БҮХ нэмэлт баганыг хаядаг байв → давхар/он/гараж/видео линк
 *    хадгалагдахгүй болно. Одоо ЗӨВХӨН дутуу баганыг л хасна.
 *
 * @returns {string[]} дутуу баганын нэрс (алдаа нь баганын алдаа биш бол []).
 *   ⚠️ Баганын НЭРИЙГ таньж чадсангүй ч «column / schema cache» алдаа мөн бол
 *      бүх нэмэлт баганыг буцаана (хуучин зан төлөв — аюулгүй fallback).
 */
function missingDetailColumns(error) {
  const msg = `${error?.message || ''} ${error?.details || ''}`;
  if (!/column|schema cache/i.test(msg)) return [];

  const found = new Set();
  // PostgREST: Could not find the 'bathrooms' column of 'listings' in the schema cache
  for (const m of msg.matchAll(/'([A-Za-z0-9_]+)'\s+column/gi)) found.add(m[1].toLowerCase());
  // Postgres: column listings.bathrooms does not exist
  for (const m of msg.matchAll(/column\s+(?:[A-Za-z0-9_]+\.)?([A-Za-z0-9_]+)\s+does not exist/gi)) {
    found.add(m[1].toLowerCase());
  }

  const hits = DETAIL_COLUMNS.filter((col) => found.has(col.toLowerCase()));
  return hits.length ? hits : DETAIL_COLUMNS;
}

/** ⚠️ `normalizeSearch` нь 2026-10-05-нд `lib/searchText.mjs` рүү шилжсэн
 *  (НЭГ ЭХ СУРВАЛЖ — дээр импортолсон). Хайлтын логик бүхэлдээ цэвэр
 *  модульд байх нь тестлэхэд хялбар ✓ */

/**
 * Нэг хуудсанд харуулах зарын тоо (сервер талын хуудаслалт).
 * ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): «нэг хуудсанд 50 аас илүү зар харуулахгүй
 *    ба page болгоё» → `HomeClient` нь `?page=N`-ээр хуудаслана.
 * ⚠️ Өмнө нь `.limit(300)` байсан ба хуудаслалт огт БАЙХГҮЙ байв — зарууд 300-аас
 *    холдмогц хуучин зарууд хэрэглэгчид ХАРАГДАХГҮЙ болно (README-ийн 2.1 асуудал).
 */
export const LISTINGS_PAGE_SIZE = 50;

/**
 * Заруудыг хайлттайгаар татах (НЭГ ХУУДАС — сервер талд `range`).
 * filters: { category, section, search, propertyType, rooms, city, districts,
 *            khoroos, attrs, minPrice, maxPrice, minArea, maxArea,
 *            minTotalFloors, maxTotalFloors, minFloor, maxFloor,
 *            minBuildYear, maxBuildYear }
 *
 * @param {object} [options]
 * @param {number} [options.page=1]      Хуудасны дугаар (1-ээс эхэлнэ)
 * @param {number} [options.pageSize]    Нэг хуудсанд хэдэн зар (анхдагч 50)
 * @param {string} [options.sort]        🔀 Эрэмбэлэлт (`lib/sortOptions.mjs`):
 *   `'newest'` (анхдагч) · `'price_asc'` · `'price_desc'` — танихгүй утга
 *   ирвэл АНХДАГЧ болно (`normalizeSort()` — PostgREST хамгаалалт ✓)
 * @returns {Promise<{rows:Array, total:number|null, page:number, pageSize:number,
 *   pageCount:number, hasMore:boolean}>}
 *   ⚠️ ХУУЧИН буцаалт нь МАССИВ байсан; одоо ОБЪЕКТ (`rows` + `total`).
 *      Учир нь хуудаслалтад НИЙТ тоо (`count`) хэрэгтэй — тусдаа query
 *      явуулахгүйн тулд нэг дуудлага дотор `count: 'exact'`-аар авна ✓
 *      (дуудагч нь зөвхөн `components/HomeClient.jsx` — шинэчлэгдсэн ✓).
 *
 * ⚠️ `districts` нь МАССИВ (2026-10-03) — «Дүүрэг / Сум олон сонголт»:
 *    `['Баянгол']` → `district=eq.Баянгол` (ХУУЧИН нэг утгатайтай ЯГ ижил ✓),
 *    `['Баянгол','Сүхбаатар']` → `district=in.(…)` (`lib/districtFilter.mjs`).
 *    Хуучин нэг утгатай `district` (string) дуудлагыг ч дэмжинэ ✓
 * ⚠️ `khoroos` нь МАССИВ — хэрэглэгч ОЛОН хороог зэрэг сонгоно. PostgREST-ийн
 *    `.in()` нь SQL-ийн `khoroo IN (…)` болно. Хуучин нэг утгатай `khoroo`
 *    дуудлагыг ч дэмжинэ (бусад газар/хуучин код эвдрэхгүйн тулд).
 * ⚠️ `rooms` нь МАССИВ (2026-09-30) — «олон сонголт». `lib/roomFilter.mjs`
 *    нь `IN` / `>=` / `OR` болгож хөрвүүлнэ (дэлгэрэнгыг доорх шүүлтээс уншина).
 *    Хуучин нэг утгатай (`rooms: '3'`) дуудлагыг ч дэмжинэ ✓
 * ⚠️ `payments` нь МАССИВ (2026-10-03) — 💳 «Төлбөрийн нөхцөл» (`['lease',
 *    'cash']`). `lib/paymentFilter.mjs` нь jsonb containment (`cs`) ба `OR`
 *    болгож хөрвүүлнэ (дэлгэрэнгыг доорх шүүлтээс уншина) ✓
 */
/**
 * 🔎 Талбар нь «ТЕКСТ» шиг шүүгддэг эсэх (`searchable` эсвэл `filterable` текст).
 *
 * ⚠️ ЯАГААД ТУСДАА ФУНКЦ ВЭ: ижил дүрэм 2 газарт (СКАЛЯР утга — `ilike`, ба
 *    ОЛОН утга — `or(…ilike…)`) хэрэгтэй. Хуулбар бичвэл нэг нь мартагдаж,
 *    «Prius 30» 1 утга дээр олдоод 2 утга дээр олдохгүй гэсэн зөрүү үүснэ ✗
 * ⚠️ Мета нь ЗӨВХӨН `lib/locationData.js`-ийн тодорхойлолтоос ирнэ
 *    (хэрэглэгчийн чөлөөт текстээс БИШ) — PostgREST-ийн баганы нэр рүү
 *    injection орох боломжгүй ✓
 */
function isTextLikeAttr(section, key) {
  const field = getAttrField(section, key);
  return Boolean(field && (field.searchable || (field.filterable && field.type === 'text')));
}

/**
 * Шүүлтүүдийг query-д хэрэглэх — ⚠️ НЭГ ЭХ СУРВАЛЖ: үндсэн мөрийн query БА
 * «хэт өндөр хуудас»-ын зөвхөн-count query ХОЁУЛАА үүнийг дуудна (шүүлтийг
 * хоёр газар бичвэл нэг нь мартагдана ✗).
 *
 * ⚠️ supabase-js v2-ийн `eq/in/gte/...` нь builder-ээ ДОТРОО өөрчилж `this`-ээ
 *    буцаадаг тул буцаалтыг дахин оноохгүй ч болно ✓ (хуучин кодтой ижил).
 */
function applyListingFilters(query, filters = {}) {
  if (filters.category && filters.category !== 'all') {
    query.eq('category', filters.category);
  }

  // ---- 🔎 ХАЙЛТ (текст + утас) — 2026-10-05 ШИНЭЧЛЭВ ----
  // 📐 ДҮРЭМ (дэлгэрэнгыг `lib/searchText.mjs`-ээс уншина — цэвэр, тестлэгддэг):
  //   ① `title` ба `description` ХАЙЛТАД ОРОВ — өмнө нь зөвхөн
  //      property_type/district/city/khoroo/contact_name/brand/model хайдаг
  //      байв ⇒ хэрэглэгч зарын нэрээр («Цемент») хайхад 0 үр дүн гардаг ✗
  //   ② ОЛОН ҮГТЭЙ — «3 өрөө байр» гэвэл БҮХ үг тохирсон зарууд
  //      (`and(or(…),or(…))` — үг бүр аль нэг талбарт олдох нь хангалттай)
  //   ③ Синтаксис хамгаалалт (`sanitizeSearchTerm`) ХЭВЭЭР — `,():"\` нь
  //      PostgREST-ийн логик модыг задалж хайлтыг БҮТЭН унагадаг байв ✗
  //   ④ 📞 `phone` нь `extra`-аар OR болж залгагдана (зөвхөн цифрээр —
  //      `lib/phoneEmail.js → phoneSearchPatterns`, НЭГ ЭХ СУРВАЛЖ ✓)
  //   ⑤ ⚡ Хурд: `0028_listing_search.sql` нь `pg_trgm` GIN индекс нэмнэ
  //      (`ilike %…%` ч индекс ашиглана) — migration ЗААВАЛ БИШ ✓
  const search = normalizeSearch(filters.search);
  if (search) {
    const phoneExpr = phoneEmail.phoneSearchPatterns(search).map((p) => `phone.ilike.${p}`);
    const or = buildSearchOr(search, { fields: SEARCH_FIELDS, extra: phoneExpr });
    if (or) query.or(or);
  }

  // ---- ХЭСЭГ (0016) — «Автомашин», «Ажлын зар» … ----
  // ⚠️ `'all'` = хэсгийн шүүлт ХИЙХГҮЙ (БҮХ хэсгийн зар) — үндсэн дэлгэцийн
  //    анхдагч төлөв. Эс бөгөөс PostgREST нь `section=eq.all` гэж хайж
  //    0 үр дүн буцаана.
  if (filters.section && filters.section !== 'all') {
    query.eq('section', filters.section);
  }
  if (filters.propertyType) query.eq('property_type', filters.propertyType);
  // ---- ATTR шүүлтүүд (jsonb) — ж: `attrs->>brand = 'Toyota'` ----
  // ⚠️ PostgREST-ийн `->>` синтакс. Хоосон утгыг алгасна.
  //
  // 🔎 `searchable` талбар (ж: 🏷️ Брэнд) — ХАЙЛТТАЙ/ГАРААР БИЧИХ боломжтой
  //    талбар (2026-09-27, хэрэглэгчийн хүсэлт). Тийм талбарт `eq` БИШ,
  //    `ilike %…%` хийгдэнэ:
  //      • «toy»  → «Toyota», «Toyota Prius» аль ч зарыг ОЛНО ✓
  //      • том/жижиг үсэг ЯЛГАХГҮЙ («toyota» = «Toyota») ✓
  //    Эс бөгөөс хэрэглэгч «toy» гэж бичингүүт 0 үр дүн гарч, брэнд бичсэн
  //    нь дэмий мэт санагдана ✗ (өмнө нь яг тэнцүү байхыг шаарддаг байв).
  //    ⚠️ Бусад талбар (Төлөв/Түлш/Хурдны хайрцаг…) нь ЖАГСААЛТААС сонгогддог
  //       тул `eq` ХЭВЭЭР — илүү хурдан (индекс) ба санамсаргүй давхцалгүй ✓
  //    ⚠️ LIKE-ийн тусгай тэмдэгт (`%`, `_`, `\`) нь ESCAPE хийгдэнэ —
  //       эс бөгөөс «Mercedes_» гэх мэт бичлэг бүх зарыг татаж болно ✗
  //       (хэрэгжилт: `lib/attrMultiFilter.mjs → likePattern()` — НЭГ ЭХ
  //        СУРВАЛЖ; олон утгатай `or()` зам ч ЯГ үүнийг ашиглана ✓)

  Object.entries(filters.attrs || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || String(v).trim() === '') return;
    const term = String(v).trim();

    /* 🎨 ОЛОН СОНГОЛТТОЙ ATTR (2026-10-03 (19))
       Хэрэглэгчийн хүсэлт: «Зар хайлт дээр Авто машин сонголт дээр Өнгө ийг
       Төлбөрийн нөхцөл шиг олон сонголттой болго» → 🎨 «Өнгө» нь ЧИП болов:
       `['Хар','Цагаан']` ⇒ `attrs->>color=in.("Хар","Цагаан")` — аль нэг
       өнгөтэй зарууд (OR ✓). Механизм нь `lib/attrMultiFilter.mjs` (цэвэр,
       тестлэгддэг, БОДИТ Supabase дээр 2026-10-03-нд туршиж батлагдсан ✓):
          ['Хар']            → `attrs->>color=in.("Хар")`
          ['Хар','Цагаан']   → `attrs->>color=in.("Хар","Цагаан")`
          []                 → шүүлт ХИЙХГҮЙ (дээрх мөрөнд аль хэдийн буцсан ✓)
       ⚠️ `->>` (текст) дээр `in` — учир нь `attrs.color` нь МАССИВ БИШ скаляр
          (форм нэг өнгө хадгалдаг) тул `cs` containment ХЭРЭГГҮЙ ✓
       ⚠️ Утга нь чөлөөт МОНГОЛ текст (зайтай: «Сувдан цагаан») — `postgrest-js`
          нь тусгай тэмдэгт (таслал/хаалт/хашилт) агуулсан утгыг өөрөө `"…"`-д
          авах ба зай нь `+` болж кодлогдоно (PostgREST зай гэж уншина ✓) —
          БОДИТ DB дээр `200 OK` (сувдан цагаан/хар 2 утгатай) батлагдсан ✓
       ⚠️ `[]` (хоосон) дээр `String([])` нь `''` тул дээд мөрөнд буцна ✓

       🔎 2026-10-04 (36) — ХАЙЛТТАЙ ТЕКСТ ТАЛБАРЫН онцгой дүрэм:
       хэрэглэгчийн хүсэлт «машины загвараас олоныг сонгох боломжтой болго» ⇒
       🚙 «Загвар» (`filterable` текст) ОЛОН утгатай болов. ⚠️ Гэхдээ түүнд
       `in.()` ХЭРЭГЛЭХГҮЙ — талбарын гэрээ нь `ilike %…%` (доорх скаляр
       салбар) тул бүрэн бус бичилт «pri» ч олдох ёстой ✓ →
          ['Prius 30']           → `attrs->>model=ilike.%Prius 30%` (скаляртай ИЖИЛ)
          ['Prius 30','Harrier'] → `or=(attrs->>model.ilike.%Prius 30%,…)` (OR ✓)
       ℹ️ «Текст эсэх» дүрэм нь `isTextLikeAttr()` (нэг эх сурвалж) — ЗӨВХӨН
          `lib/locationData.js`-ийн тодорхойлолтоос (хэрэглэгчийн текст БИШ) ✓ */
    if (Array.isArray(v)) {
      if (isTextLikeAttr(filters.section, k)) applyAttrMultiLikeFilter(query, k, v);
      else applyAttrMultiFilter(query, k, v);
      return;
    }

    // ---- 📅 ОНЫ ХҮРЭЭ (2026-09-28): `year_from` / `year_to` ----
    //    Хэрэглэгчийн хүсэлт: «Үйлдвэрлэсэн он, Орж ирсэн оноор шүүдэг байх»
    //    → sidebar-д «Доод / Дээд» хос оролт (`?attr_year_from=2015&…to=2020`)
    //    ⚠️ PostgREST нь `attrs->>year=gte.2015` болгоно — jsonb-ийн ТЕКСТ
    //       харьцуулалт нь ижил урттай (4 оронтой) онд тоон харьцуулалттай ИЖИЛ ✓
    const rangeKey = parseAttrRangeKey(k);
    if (rangeKey) {
      const { base, dir } = rangeKey;
      const field = getAttrField(filters.section, base);
      // ⚠️ ЗӨВХӨН `range` талбарт (ж: year, importYear). Эс бөгөөс хуучин/буруу
      //    линк (`?attr_brand_from=…`) нь `attrs->>brand_from` гэсэн УТГАГҮЙ
      //    шүүлт үүсгэж, зарууд ЧИМЭЭГҮЙ алга болно ✗
      if (!field || !field.range) return;
      // ⚠️ Зөвхөн цифр — `?attr_year_from=abc` гэх мэт утгыг АЛГАСНА
      if (!/^\d+$/.test(term)) return;
      if (dir === 'from') query.gte(`attrs->>${base}`, term);
      else query.lte(`attrs->>${base}`, term);
      return;
    }

    // 🔎 `searchable` (combobox, ж: 🏷️ Брэнд) ба ✍️ `filterable` текст
    //    (ж: 🚙 Загвар — `components/TextFilter.jsx`) — ХОЁУЛАА
    //    `ilike %…%`-ээр: бүрэн бус/жижиг үсгээр бичсэн ч олдоно ✓
    //    ⚠️ Дүрэм нь `isTextLikeAttr()` дотор (нэг эх сурвалж) —
    //       олон утгатай (массив) салбар ч ЯГ үүнийг дуудна ✓
    if (isTextLikeAttr(filters.section, k)) {
      query.ilike(`attrs->>${k}`, likePattern(term));
    } else {
      query.eq(`attrs->>${k}`, term);
    }
  });
  if (filters.city) query.eq('city', filters.city);
  /* 🗺 ДҮҮРЭГ / СУМ — ОЛОН СОНГОЛТ (2026-10-03)
     Хэрэглэгчийн хүсэлт: «Дэлгэрэнгүй хайлтын Дүүрэг / Сум-ийг Өрөөний тоо
     хайхтай адилхан олон сонголт хийх боломжтой болго» → `filters.districts`
     нь МАССИВ (`['Баянгол','Сүхбаатар']`). Дүрэм нь
     `lib/districtFilter.mjs → applyDistrictFilter()` (цэвэр, тестлэгддэг):

       ['Баянгол']            → `district=eq.Баянгол`      ← ХУУЧИНТАЙ ЯГ ижил
       ['Баянгол','Сүхбаатар'] → `district=in.("Баянгол","Сүхбаатар")`
       []                     → шүүлт ХИЙХГҮЙ ✓

     ⚠️ НЭГ утгатай үед `eq` (биш `in`) байгаа нь ЧУХАЛ: ингэснээр хуучин
        линк/индекс/README-гийн гэрээ эвдрэхгүй ✓
     ⚠️ Хуучин нэг утгатай дуудлага (`filters.district: 'Баянгол'`) ч
        дэмжигдэнэ (`parseDistrictList` скалярыг массив болгоно ✓) */
  applyDistrictFilter(query, filters.districts ?? filters.district);
  // ⚠️ ОЛОН ХОРОО: `.in()` → `khoroo IN ('1-р хороо','2-р хороо',…)`.
  //    Массив хоосон бол хайлт хийхгүй (бүгд гарна).
  if (Array.isArray(filters.khoroos) && filters.khoroos.length) {
    query.in('khoroo', filters.khoroos);
  } else if (filters.khoroo) {
    query.eq('khoroo', filters.khoroo); // хуучин нэг утгатай дуудлага
  }

  /* 🛏 ӨРӨӨНИЙ ТОО — ОЛОН СОНГОЛТ (2026-09-30)
     Хэрэглэгчийн хүсэлт: «үл хөдлөх дээр өрөөний тоог хайлт хэсэг оруул,
     олон сонголт хийх боломжтой байх» → `filters.rooms` нь МАССИВ
     (`['1','3']`). Дүрэм ба PostgREST-ийн механизм БҮГД нь
     `lib/roomFilter.mjs → applyRoomFilter()` (цэвэр, тестлэгддэг) дотор:

       ['2','3']  → `rooms IN (2,3)`
       ['5']      → `rooms >= 5`            ← «+5 өрөө» (хуучинтай ЯГ ижил ✓)
       ['4','5']  → `rooms >= 4`            ← хүрээ НЭГТГЭНЭ (≥4 нь 5+ -ыг багтаана)
       ['1','5']  → `rooms IN (1) OR rooms >= 5`  ← завсартай үед `.or()`

     ⚠️ `.or()` нь дээд түвшний бусад шүүлттэй `AND` болж холбогдоно
        (`section`, `category`, `price` … хэвээрээ ✓)
     ⚠️ Хуучин НЭГ утгатай дуудлага (`rooms: '3'`) ч ажиллана — модуль
        скалярыг нэг элементтэй массив болгоно ✓
     ⚠️ Хоосон (`[]`) үед шүүлт ХИЙХГҮЙ (mode: 'none') ✓ */
  applyRoomFilter(query, filters.rooms);

  /* 💳 ТӨЛБӨРИЙН НӨХЦӨЛ — ОЛОН СОНГОЛТ (2026-10-03)
     Хэрэглэгчийн хүсэлт: «Төлбөрийн нөхцөлийг Үл хөдлөх зарна, Автомашин
     зарна гэсэн дээр хайх хэсэгт гардаг болгоё … олон сонголт хийж байгаа
     боломж» → `filters.payments` нь МАССИВ (`['lease','cash']`).

     Механизм БҮГД нь `lib/paymentFilter.mjs → applyPaymentFilter()` дотор
     (цэвэр, тестлэгддэг, БОДИТ Supabase дээр 2026-10-03-нд туршиж батлагдсан):
        ['lease']          → `attrs=cs.{"payment_terms":["lease"]}`
        ['lease','cash']   → `attrs.cs.{"payment_terms":["lease"]}, …cash` (OR)
        []                 → шүүлт ХИЙХГҮЙ (бүх зар) ✓

     ⚠️ `attrs.payment_terms` нь МАССИВ тул `attrs->>payment_terms` биш,
        jsonb CONTAINMENT (`cs`) шаардлагатай — GIN индекс (`jsonb_path_ops`,
        0016_sections.sql) үүнийг дэмжинэ ✓
     ⚠️ OR нь дээд түвшний бусад шүүлттэй AND болж холбогдоно
        (`section`, `category`, `price` … хэвээрээ ✓)
     ⚠️ Хоосон (`[]`) үед шүүлт хийхгүй ✓ */
  applyPaymentFilter(query, filters.payments);

  // ⚠️ toNumber() нь «75,5» хэлбэрийн (монгол) бутархайг ч зөв хөрвүүлнэ
  if (filters.minPrice) query.gte('price', Math.trunc(toNumber(filters.minPrice)));
  if (filters.maxPrice) query.lte('price', Math.trunc(toNumber(filters.maxPrice)));
  if (filters.minArea) query.gte('area', toNumber(filters.minArea));
  if (filters.maxArea) query.lte('area', toNumber(filters.maxArea));

  /* 🏢📅 ОРОН СУУЦНЫ нэмэлт хүрээ (2026-10-04) — «Барилгын давхар» (total_floors),
     «Хэдэн давхарт» (floor), «Ашиглалтанд орсон он» (build_year).
     ⚠️ Эдгээр нь `attrs` (jsonb) БИШ, `0003_listing_details.sql`-ийн ЖИНХЭНЭ
        багана — тиймээс `minArea`/`maxArea`-гийн ЯГ ИЖИЛ `.gte()/.lte()` замаар
        шүүнэ (жижиг бүхэл тоо тул `Math.trunc`).
     ⚠️ Хоосон (`''`) үед шүүлт ХИЙХГҮЙ ✓ (`RangeInput` нь хоосон талыг `''`
        болгодог — доод/дээд хязгаарын дүрэм `lib/rangeFilter.mjs`) */
  if (filters.minTotalFloors) query.gte('total_floors', Math.trunc(toNumber(filters.minTotalFloors)));
  if (filters.maxTotalFloors) query.lte('total_floors', Math.trunc(toNumber(filters.maxTotalFloors)));
  if (filters.minFloor) query.gte('floor', Math.trunc(toNumber(filters.minFloor)));
  if (filters.maxFloor) query.lte('floor', Math.trunc(toNumber(filters.maxFloor)));
  if (filters.minBuildYear) query.gte('build_year', Math.trunc(toNumber(filters.minBuildYear)));
  if (filters.maxBuildYear) query.lte('build_year', Math.trunc(toNumber(filters.maxBuildYear)));

  return query;
}

/**
 * «Хүсээгүй range» алдаа мөн эсэх — PostgREST нь `.range(from,to)`-ийн `from`
 * нь нийт мөрийн тооноос ХЭТЭРСЭН үед `416 Requested Range Not Satisfiable`
 * (`PGRST103`) буцаана (ж: `?page=999`, нийт 16 хуудас байхад).
 * ⚠️ Энэ нь ЖИНХЭНЭ алдаа БИШ — «энэ хуудас хоосон» гэсэн үг ✓
 */
function isUnsatisfiableRange(error) {
  if (!error) return false;
  const msg = `${error.message || ''} ${error.details || ''} ${error.hint || ''} ${error.code || ''}`;
  return error.code === 'PGRST103' || /range not satisfiable/i.test(msg) || error.status === 416;
}

export async function fetchListings(filters = {}, { page = 1, pageSize = LISTINGS_PAGE_SIZE, sort = DEFAULT_SORT } = {}) {
  const sb = needClient();

  // ⚠️ Хамгаалалт: сөрөг/бутархай/хоосон утга ирвэл 1 ба 50 болгож тэгшитгэнэ
  const size = Math.max(1, Math.min(LISTINGS_PAGE_SIZE, Math.floor(Number(pageSize) || LISTINGS_PAGE_SIZE)));
  const p = Math.max(1, Math.floor(Number(page) || 1));
  const from = (p - 1) * size;
  const to = from + size - 1;

  const query = applyListingFilters(
    sb
      .from('listings')
      // `count: 'exact'` → нийт мөрийн тоо (хуудасны тоог гаргахад) ✓
      .select('*', { count: 'exact' })
      .range(from, to),
    filters
  );

  /* 🔀 ЭРЭМБЭЛЭХ (2026-09-30) — хэрэглэгчийн сонголтоор (eBay-ийн «Sort: …»).
     ⚠️ Урьд нь дараалал нь ЭНД ХАТУУ бичигдсэн байв
        (`.order('created_at', { ascending: false })`) → «хамгийн хямдаас»
        эхлэх боломжгүй байсан ✗
     ⚠️ `sortOrders()` (`lib/sortOptions.mjs`) нь:
        ① `normalizeSort()`-оор танихгүй утгыг шүүнэ — `?sort=xxx` гэсэн
           линк ирвэл PostgREST руу БАЙХГҮЙ багана явахгүй (хамгаалалт ✓)
        ② ХОЁР ДАХЬ дарааллыг (`id desc`) ҮРГЭЛЖ хамт буцаана — `created_at`
           тэнцэх үед (seed/бөөн оруулсан зарууд) Postgres нь мөрийн
           дарааллыг ТОГТВОРТОЙ буцаахгүй → хуудас 2 дээр хуудас 1-ийн зар
           ДАВХАРДАХ эсвэл зарим зар АЛГАСАН болно ✗. `id` (uuid) нь
           өвөрмөц тул дарааллыг тогтооно ✓.
     ⚠️ `nullsFirst: false` (үнээр эрэмбэлэхэд) — үнэ хоосон зарууд
        «хамгийн хямд» гэж ЭХЭНД гарахгүй, ХАМГИЙН СҮҮЛД тавигдана ✓ */
  sortOrders(sort).forEach(({ column, ascending, nullsFirst }) => {
    query.order(column, nullsFirst === undefined ? { ascending } : { ascending, nullsFirst });
  });

  let { data, error, count } = await query;

  // ---- 📄 ХЭТ ӨНДӨР ХУУДАС (`?page=999`) — «416» ----
  // ⚠️ `range` нь нийт мөрөөс ГАДУУР бол PostgREST нь АЛДАА буцаадаг тул
  //    `count` ч ирэхгүй → UI дээр «холболтын алдаа» гарч, хуудаслалт
  //    ХАРАГДАХГҮЙ (мөр 0) → хэрэглэгч гарцгүй гацана ✗
  // ✅ Шийдэл: ЗӨВХӨН тоог (`head: true`) асууж, ХООСОН хуудас + `total`
  //    буцаана → `HomeClient` нь хамгийн сүүлийн хуудас руу ЗАСНА ✓
  // ⚠️ `head: true` нь мөр татахгүй (зөвхөн `Content-Range` толгой) — хөнгөн ✓
  if (isUnsatisfiableRange(error) && p > 1) {
    const counted = await applyListingFilters(
      sb.from('listings').select('id', { head: true, count: 'exact' }),
      filters
    );
    if (!counted.error && typeof counted.count === 'number') {
      const totalRows = counted.count;
      return {
        rows: [],
        total: totalRows,
        page: p,
        pageSize: size,
        pageCount: Math.max(1, Math.ceil(totalRows / size)),
        hasMore: false,
      };
    }
  }

  if (error) throw normalizeError(error);

  const rows = data || [];
  // ⚠️ `count` нь `null` байж болно (RLS/тохиргоо) → тэр үед «дараагийн хуудас
  //    байгаа эсэх»-ийг «мөр бүтэн дүүрсэн эсэх»-ээр таана (аюулгүй fallback ✓)
  const total = typeof count === 'number' ? count : null;
  const pageCount = total === null ? p : Math.max(1, Math.ceil(total / size));
  return {
    rows,
    total,
    page: p,
    pageSize: size,
    pageCount,
    hasMore: total === null ? rows.length === size : p < pageCount,
  };
}

/**
 * «Өрөө» тус бүрийн зарын тоог авах (нүүр хуудсан дээрх өрөөний мөрөнд).
 *
 * ⚠️ Зөвхөн `category` + `propertyType`-г харгалзана — бусад шүүлт (үнэ,
 * байршил, хороо г.м.) НӨЛӨӨЛӨХГҮЙ. Яагаад: «1 өрөө 1,088»
 *    гэсэн тоо нь ангиллын НИЙТ тоо бөгөөд хэрэглэгч өөр шүүлт тавихад
 *    өөрчлөгдөхгүй. Ингэснээр «аль өрөө хэдэн зартай вэ» гэдгээ нэг харцаар
 *    мэдээд, хүссэн өрөөгөө шууд дарж сонгоно.
 *
 * ⚠️ `'5'` утга нь «+5 өрөө» (5 БА ТҮҮНЭЭС ДЭЭШ) — `fetchListings`-тэй ижил
 *    дүрмээр `rooms >= 5` болж хөрвөгдөнө.
 *
 * @param {{category?: string, propertyType?: string}} [scope]
 * @returns {Promise<Object<string, number>>} { '1': 1088, '2': 6509, … }
 */
export async function fetchRoomCounts({ category = 'all', propertyType = '' } = {}) {
  const sb = needClient();

  const pairs = await Promise.all(
    ROOM_OPTIONS.map(async ({ value }) => {
      let q = sb.from('listings').select('id', { count: 'exact', head: true });
      if (category && category !== 'all') q = q.eq('category', category);
      if (propertyType) q = q.eq('property_type', propertyType);
      // 🛏 НЭГ ЭХ СУРВАЛЖ (2026-09-30) — «+5» нь `rooms >= 5`, бусад нь
      //    `rooms = N` болохыг `lib/roomFilter.mjs` шийднэ (`fetchListings`-тэй
      //    ЯГ ижил дүрэм — хоёулаа нэг функцээр) ✓
      q = applyRoomFilter(q, [value]);

      const { count, error } = await q;
      if (error) {
        console.warn(`⚠️  «${value} өрөө»-ний тоог авахад алдаа:`, error.message || error);
        return [value, null];
      }
      return [value, count ?? 0];
    })
  );

  const out = {};
  for (const [value, count] of pairs) {
    if (typeof count === 'number') out[value] = count;
  }
  return out;
}

/**
 * Төрөл тус бүрийн зарын тоог авах (нүүр хуудсан дээрх төрлийн навигацид).
 * PostgREST нь GROUP BY дэмждэггүй тул төрөл тус бүрээр тусдаа count query хийнэ
 * (зэрэгцээ, `head: true` учир хөнгөн).
 *
 * @param {string} category 'all' | 'sell' | 'rent'
 * @returns {Promise<Object<string, number>>} { 'Орон сууц': 12, ... } — алдаа гарвал тухайн төрөл орхигдоно
 */
/**
 * Дэд ТӨРӨЛ тус бүрийн зарын тоо (нүүр хуудсан дээрх төрлийн навигацид).
 *
 * ⚠️ `section` нь ЗААВАЛ харгалзана: «Орон сууц» нь зөвхөн үл хөдлөхийн,
 *    «Суудлын машин» нь зөвхөн автомашины дэд төрөл. Тэгэхгүй бол тоо
 *    холилдоно.
 * ⚠️ PostgREST нь GROUP BY дэмждэггүй тул тус бүр тусдаа `head: true` count
 *    query хийнэ (зэрэгцээ, хөнгөн).
 *
 * @param {string} category 'all' | 'sell' | 'rent'
 * @param {string} section 'real-estate' | 'auto' | 'jobs' | …
 * @returns {Promise<Object<string, number>>} — алдаа гарвал тухайн төрөл орхигдоно
 */
export async function fetchPropertyTypeCounts(category = 'all', section = 'real-estate') {
  const sb = needClient();
  // ⚠️ Дэд төрлүүд нь ХЭСГЭЭС хамаарна (үл хөдлөх: «Орон сууц»; авто: «Суудлын машин»)
  const subtypes = getSubtypes(section);

  const pairs = await Promise.all(
    subtypes.map(async (type) => {
      let q = sb
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('section', section)
        .eq('property_type', type);
      if (category && category !== 'all') q = q.eq('category', category);

      const { count, error } = await q;
      if (error) {
        console.warn(`⚠️  «${type}» төрлийн тоог авахад алдаа:`, error.message || error);
        return [type, null];
      }
      return [type, count ?? 0];
    })
  );

  const out = {};
  for (const [type, count] of pairs) {
    if (typeof count === 'number') out[type] = count;
  }
  return out;
}

/** uuid хэлбэр мөн эсэх — localStorage/URL-д гэмтсэн, буруу утга орсон бол
 *  Postgres `22P02 invalid input syntax for type uuid` алдаа шидэхээс сэргийлнэ.
 *  (lib/listingStats.js → isUuid-тай ижил дүрэм; энэ файл нь клиент талд
 *   ачаалагддаг тул серверийн модулийг импортлохгүй, энд давхардуулав.) */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

export async function fetchListingById(id) {
  // ⚠️ UUID биш id (жишээ нь /listings/abc) → query илгээхгүй, шууд null
  if (!isUuid(id)) return null;
  const sb = needClient();
  const { data, error } = await sb
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw normalizeError(error);
  return data;
}

/**
 * Олон id-аар заруудыг татах (жишээ: «таалагдсан зарууд»).
 * @param {string[]} ids
 */
export async function fetchListingsByIds(ids) {
  const sb = needClient();
  // ⚠️ Зөвхөн UUID хэлбэртэй id-г л илгээнэ (буруу утга → Postgres 22P02 → 500)
  const list = (ids || []).filter((id) => isUuid(id));
  if (!list.length) return [];
  const { data, error } = await sb.from('listings').select('*').in('id', list);
  if (error) throw normalizeError(error);
  const byId = new Map((data || []).map((l) => [l.id, l]));
  // Оролтын дарааллаар (хамгийн сүүлд нэмсэн нь эхэнд) буцаана
  return list.map((id) => byId.get(id)).filter(Boolean);
}

/** Нэвтэрсэн хэрэглэгчийн зарууд */
export async function fetchMyListings(userId) {
  const sb = needClient();
  if (!userId) return [];
  const { data, error } = await sb
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw normalizeError(error);
  return data || [];
}

/**
 * Зар нийтлэгчийн (нэг хэрэглэгчийн) БҮХ зарууд — шинэ нь эхэнд.
 * `/sellers/[id]` хуудсанд хэрэглэгдэнэ (id = listings.user_id).
 *
 * @param {string} userId — Supabase auth хэрэглэгчийн id (uuid)
 * @returns {Promise<Array>} — uuid биш бол хоосон массив
 */
export async function fetchListingsBySeller(userId) {
  if (!isUuid(userId)) return [];
  const sb = needClient();
  const { data, error } = await sb
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw normalizeError(error);
  return data || [];
}

/**
 * Зар нийтлэгчийн зарын тоо — категориор ялгаж (Зарах / Түрээслэх).
 * Зарын дэлгэрэнгүй хуудасны «Зар нийтлэгч» карт дээр товчхон харуулна.
 *
 * @param {string} userId
 * @returns {Promise<{sell: number, rent: number, total: number}>}
 */
/**
 * Нийтлэгчийн зарын тоо — «Зарах / Түрээслэх» задаргаатай.
 *
 * ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН ҮЛ ХӨДЛӨХ зарын тоо (хэрэглэгчийн хүсэлт,
 *    0016). Бусад хэсгийн (авто/ажил/компьютер…) зар нь `category = 'sell'`
 *    байдаг тул хамт тоолбол автомашины зар «🏷️ Зарах» гэж БУРУУ харагдана.
 * ⚠️ `total` нь БҮХ зарын тоо (бүх хэсэг) — «📋 N зар нийтэлсэн» гэж харуулна.
 *
 * @returns {Promise<{sell: number, rent: number, total: number, realEstate: number}>}
 */
export async function fetchSellerCategoryCounts(userId) {
  const empty = { sell: 0, rent: 0, total: 0, realEstate: 0 };
  if (!isUuid(userId)) return empty;
  const sb = needClient();
  const { data, error } = await sb
    .from('listings')
    .select('category, section')
    .eq('user_id', userId)
    .limit(1000);
  if (error) throw normalizeError(error);
  const rows = data || [];
  // ⚠️ Хуучин мөрүүдэд `section` байхгүй/хоосон байж болзошгүй → үл хөдлөх гэж үзнэ
  const re = rows.filter((r) => (r.section || 'real-estate') === 'real-estate');
  return {
    sell: re.filter((r) => r.category === 'sell').length,
    rent: re.filter((r) => r.category === 'rent').length,
    total: rows.length,
    realEstate: re.length,
  };
}

/** '75,5' | '75.5' | '75' → 75.5 ; буруу/хоосон бол 0.
 *  Монгол хэрэглэгчид аравтын бутархайг «,»-ээр бичдэг тул хөрвүүлнэ. */
function toNumber(value) {
  const n = Number(String(value == null ? '' : value).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Форм-ын payload → DB мөр (create болон update хоёулаа ашиглана) */
/**
 * `attrs` (jsonb) объектоос ХООСОН утгуудыг хасна.
 *
 * ⚠️ ЯАГААД: `{ model: '' }` гэж хадгалагдвал `attrs->>model=eq.` гэсэн
 *    хоосон шүүлт үүсэх, `formatAttrsLine` хоосон таслалт гаргах эрсдэлтэй.
 * ⚠️ Бүх утгыг ТЕКСТ болгоно (jsonb нь төрөл хадгалдаг ч форм нь string өгнө).
 */
function cleanAttrs(attrs) {
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return {};
  const out = {};
  Object.entries(attrs).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v).trim();
    if (s === '') return;
    out[k] = s;
  });
  return out;
}

function listingPayloadToRow(payload) {
  return {
    category: payload.category,
    property_type: payload.propertyType,
    rooms: Math.trunc(toNumber(payload.rooms)),
    area: toNumber(payload.area), // real — бутархай зөвшөөрнө (75.5 м²)
    city: payload.city,
    district: payload.district || null,
    khoroo: payload.khoroo || null,
    // ⚠️ 2026-10-01: `address_detail` БИЧИХГҮЙ (форм талбар БҮРЭН ХАСАГДСАН).
    //    Мөрд багана орохгүй тул UPDATE ХИЙХЭД хуучин заруудын утга ХЭВЭЭР
    //    үлдэнэ ✓ (insert үед багана нь `null` — default утга ✓)
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    price: Math.trunc(toNumber(payload.price)),
    price_type: payload.priceType || 'total',
    // 🏷️ ЗАРЫН ГАРЧИГ (0027_listing_title.sql) — олон зай/мөр таслалтыг НЭГ
    //    зай болгож, 120 тэмдэгт хүртэл таслана (UI-тай ЯГ ИЖИЛ: lib/format.js
    //    → MAX_LISTING_TITLE_LENGTH, DB-ийн CHECK-тай ч ижил ✓).
    //    ⚠️ Хоосон бол `null` — карт дээр мөр ГАРАХГҮЙ ✓; засах горимд
    //    гарчгийг хоосолбол хуучин утга УСТАНА (санаатай ✓)
    title: String(payload.title || '').replace(/\s+/g, ' ').trim().slice(0, MAX_LISTING_TITLE_LENGTH) || null,
    description: payload.description || null,
    phone: payload.phone || null,
    contact_name: payload.contactName || null,
    images: payload.images || [],
    // ---- Хэсэг ба attr (0016_listing_sections.sql) ----
    // ⚠️ `section` нь аль үндсэн хэсэг вэ; `attrs` нь тухайн хэсгийн нэмэлт
    //    талбарууд (jsonb). Хоосон холболтыг хасна (`{ a: '', b: null }` → `{}`).
    section: payload.section || 'real-estate',
    attrs: cleanAttrs(payload.attrs),
    // ---- Нэмэлт талбарууд (0003_listing_details.sql) ----
    build_year: toIntOrNull(payload.buildYear), // Ашиглалтанд орсон он
    floor: toIntOrNull(payload.floor), // Тухайн байр хэдэн давхарт
    total_floors: toIntOrNull(payload.totalFloors), // Барилгын нийт давхар
    balconies: toIntOrNull(payload.balconies), // Тагтны тоо (1-4)
    has_garage: toBoolOrNull(payload.hasGarage), // Гараж байгаа эсэх
    // ---- YouTube видео линк (0011_listing_video.sql) ----
    // ⚠️ Зөвхөн КАНОНИК линк хадгална (youtu.be / shorts / embed / нэмэлт
    //    параметр бүгд https://www.youtube.com/watch?v=ID болно). Видео ФАЙЛ
    //    Storage-д ОРОХГҮЙ — зөвхөн линк (0 MB).
    video_url: normalizeYouTubeUrl(payload.videoUrl) || null,
    // ---- Угаалгын өрөөний тоо (0012_listing_bathrooms.sql) ----
    bathrooms: toIntOrNull(payload.bathrooms),
  };
}

/** Зар нэмэх */
/**
 * Зарын ДАВХАРДЛЫН/SPAM хамгаалалтын алдааг (0014_listing_dedupe.sql)
 * хэрэглэгчид ойлгомжтой мессеж болгож хөрвүүлнэ.
 *
 * ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ: PostgREST нь Postgres триггерийн `raise exception`-ийг
 * `23505` кодтой буцаадаг ба `normalizeError()` нь мессежийн ард
 * `(23505)` гэсэн ХАВСАРГА залгадаг (хэрэглэгчид ойлгомжгүй). Триггер нь
 * өөрөө монгол мессеж илгээдэг тул зөвхөн түүнийг нь үлдээнэ.
 * ⚠️ Бусад `23505` (жишээ нь өөр unique index) алдааг хэвээр нь буцаана.
 */
function dedupeError(error) {
  const code = error?.code;
  const msg = error?.message || '';
  const isOurs =
    code === '23505' && /давхардуулахгүй|саяхан устгасан|зарын хязгаар/.test(msg);
  if (isOurs) {
    const err = new Error(msg);
    err.code = code;
    return err;
  }
  return normalizeError(error);
}

export async function createListing(userId, payload) {
  const sb = needClient();
  if (!userId) throw new Error('Эхлээд нэвтрэх шаардлагатай');

  // ⚠️ Нэмэлт багана (0003/0011/0012/0027) migration ороогүй бол PostgREST
  //    тэднийг schema cache-д олохгүй → доор ЗӨВХӨН ДУТУУ баганыг хасаж
  //    дахин оролдоно (бусад нэмэлт мэдээлэл хадгалагдсаар байна).
  const insertRow = { user_id: userId, ...listingPayloadToRow(payload) };

  const { data, error } = await sb
    .from('listings')
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    const missing = missingDetailColumns(error);
    if (missing.length) {
      console.warn(
        `⚠️  listings хүснэгтэд дараах багана алга: ${missing.join(', ')}. ` +
        'Харгалзах migration-ийг (0003_listing_details.sql / 0011_listing_video.sql / ' +
        '0012_listing_bathrooms.sql / 0027_listing_title.sql) Supabase SQL Editor-т ' +
        'ажиллуулна уу. Одоогоор ЗӨВХӨН эдгээр талбар хадгалагдсангүй.'
      );
      const trimmed = { ...insertRow };
      missing.forEach((col) => delete trimmed[col]);
      const retry = await sb.from('listings').insert(trimmed).select().single();
      if (retry.error) throw dedupeError(retry.error);
      return retry.data;
    }
    throw dedupeError(error);
  }
  return data;
}

/**
 * Зар засах — 2 аргаар:
 *
 *  1) **UPDATE** (зөв арга) — `listings_update` policy байвал ажиллана.
 *  2) **DELETE + INSERT** (fallback) — хэрэв UPDATE policy байхгүй бол RLS нь
 *     UPDATE-ыг ЧИМЭЭГҮЙГЭЭР блоклоно (0 мөр, алдаагүй). 0001_schema.sql-д
 *     `listings_delete` ба `listings_insert` policy хоёулаа байдаг тул бид
 *     `id` + `created_at`-ыг ХАДГАЛАН устгаад дахин оруулж болно — гадны
 *     холбоос (favorites, линк) хэвээр ажиллана.
 *
 * ⚠️ Fallback нь SQL ажиллуулах шаардлагагүй, гэхдээ ХОЁР хүсэлт хийнэ.
 *    `0005_listings_update_policy.sql`-ийг ажиллуулбал (1) зам илүү найдвартай.
 */
export async function updateListing(userId, listingId, payload) {
  const sb = needClient();
  if (!userId) throw new Error('Эхлээд нэвтрэх шаардлагатай');
  if (!listingId) throw new Error('Зарын id дутуу');

  const row = listingPayloadToRow(payload);
  // ⚠️ Аль нэмэлт багана (0003/0011/0012/0027) дутуу нь тогтоогдвол энд тэмдэглэнэ —
  //    доорх DELETE+INSERT fallback-д ЗӨВХӨН ТЭДГЭЭР баганыг хасна, эс бөгөөд
  //    хуучин зарыг устгачихаад шинэ мөр оруулж чадахгүй → ЗАР АЛГА БОЛНО.
  let missingColumns = [];

  // ---------- 1) Шууд UPDATE ----------
  const direct = await sb
    .from('listings')
    .update(row)
    .eq('id', listingId)
    .eq('user_id', userId)
    .select()
    .single();

  if (!direct.error) return direct.data;

  // Нэмэлт багана дутуу бол ЗӨВХӨН ТҮҮНИЙГ хасаад дахин оролдоно
  missingColumns = missingDetailColumns(direct.error);
  if (missingColumns.length) {
    const trimmed = { ...row };
    missingColumns.forEach((k) => delete trimmed[k]);
    const retry = await sb
      .from('listings')
      .update(trimmed)
      .eq('id', listingId)
      .eq('user_id', userId)
      .select()
      .single();
    if (!retry.error) return retry.data;
    if (!isNoRowsUpdated(retry.error)) throw updateError(retry.error);
  } else if (!isNoRowsUpdated(direct.error)) {
    throw updateError(direct.error);
  }

  // ---------- 2) Fallback: DELETE + INSERT (id, created_at хадгална) ----------
  const { data: existing, error: readErr } = await sb
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle();
  if (readErr) throw normalizeError(readErr);
  if (!existing) throw new Error('Зар олдсонгүй. Дахин ачаална уу.');
  if (existing.user_id !== userId) throw new Error('Энэ зар таных биш — засах боломжгүй.');

  const { error: delErr } = await sb.from('listings').delete().eq('id', listingId).eq('user_id', userId);
  if (delErr) throw normalizeError(delErr);

  // ⚠️ Дутуу гэж тогтоогдсон баганыг ХАСАЖ оруулна — эс бөгөөд INSERT нурж,
  //    зар алга болно (дээрх тайлбар).
  const fallbackRow = { ...row };
  missingColumns.forEach((k) => delete fallbackRow[k]);

  const { data: inserted, error: insErr } = await sb
    .from('listings')
    .insert({
      ...fallbackRow,
      id: listingId, // ⚠️ ижил id — хуучин холбоос хэвээр ажиллана
      user_id: userId,
      created_at: existing.created_at, // үүссэн огноо хадгална
      // ⚠️ `views` / `likes` (0007) нь payload-д БАЙХГҮЙ тул хадгалахгүй бол
      // тоолуур 0 болж RESET хийнэ. Багана байхгүй бол `existing.views` нь
      // undefined → объектод орохгүй (аюулгүй).
      ...(typeof existing.views === 'number' ? { views: existing.views } : {}),
      ...(typeof existing.likes === 'number' ? { likes: existing.likes } : {}),
    })
    .select()
    .single();

  if (insErr) {
    throw new Error(
      `Зар засахад алдаа гарлаа (хуучин зар устгагдсан): ${insErr.message || ''}. ` +
        'Дахин оруулж үзнэ үү. Илүү найдвартай болгохын тулд ' +
        'supabase/migrations/0005_listings_update_policy.sql-ийг SQL Editor-т ажиллуулна уу.'
    );
  }
  return inserted;
}

/** UPDATE нь 0 мөр сольсон эсэх (RLS policy байхгүй үед) */
function isNoRowsUpdated(error) {
  const msg = `${(error && error.message) || ''} ${(error && error.details) || ''} ${(error && error.code) || ''}`;
  return /PGRST116|multiple \(or no\) rows|no rows/i.test(msg);
}

/** Update policy байхгүй үед (0 мөр) ойлгомжтой мессеж өгнө */
function updateError(error) {
  const msg = `${error?.message || ''} ${error?.details || ''} ${error?.code || ''}`;
  if (/PGRST116|no rows|0 rows|multiple \(or no\) rows/i.test(msg)) {
    return new Error(
      'Зарыг засах боломжгүй байна. Supabase дээр `listings` хүснэгтийн UPDATE policy ' +
        'байхгүй (эсвэл энэ зар таных биш). ' +
        'supabase/migrations/0005_listings_update_policy.sql-ийг SQL Editor-т ажиллуулна уу.'
    );
  }
  return dedupeError(error);
}

/** Тоон утгыг бүхэл тоо болгох, хоосон/0/буруу бол null */
function toIntOrNull(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

/** 'yes'/'no'/true/false → boolean, бусад → null */
function toBoolOrNull(value) {
  if (value === true || value === 'yes' || value === 'true') return true;
  if (value === false || value === 'no' || value === 'false') return false;
  return null;
}

/** Зар устгах (өөрийн зар л устгана — RLS) */
export async function deleteListing(userId, listing) {
  const sb = needClient();
  if (!userId) throw new Error('Эхлээд нэвтрэх шаардлагатай');

  // 🗑 Storage дээрх зургуудыг устгах — ХОЁР САНГИЙГ дэмжинэ:
  //    ① ХУУЧИН Supabase Storage (RLS: зөвхөн өөрийн upload)
  //    ② ШИНЭ Cloudflare R2 (`/api/storage/delete` — түлхүүрийн эхний
  //       фолдер нь `uid` эсэхийг СЕРВЕР талд батална)
  //    ⚠️ Шилжилтийн үед нэг зарын зургууд ХОЁУЛАНД байж болох тул
  //       хоёр замаар зэрэг явна ✓
  const { legacy, r2Keys } = splitStorageUrls(listing.images || []);
  for (const [bucket, paths] of Object.entries(legacy)) {
    await sb.storage.from(bucket).remove(paths);
  }
  if (r2Keys.length) {
    // ⚠️ Алдаа гарсан ч зарыг УСТГАХ ёстой — зөвхөн лог бичнэ (файл
    //    үлдсэн нь хэрэглэгчийн зар алга болсоноос дөхөм) ✓
    const res = await deleteR2StorageKeys(sb, r2Keys);
    if (res.error) console.warn('[deleteListing] R2 устгалт:', res.error);
  }

  const { error } = await sb
    .from('listings')
    .delete()
    .eq('id', listing.id)
    .eq('user_id', userId);
  if (error) throw normalizeError(error);
}

/**
 * Зураг (File) байршуулж, нийтийн URL-уудыг буцаана.
 *
 * 🅰️ ҮНДСЭН ЗАМ — Cloudflare R2 (direct, 2026-10-02):
 *      `/api/storage/presign`-ээс ~10 мин хүчинтэй PUT линк авч, файлыг
 *      R2 руу ШУУД илгээнэ. Файл Vercel-ээр дамжихгүй тул serverless-ийн
 *      4.5 MB хязгаар, timeout, bandwidth бүгд хамаарахгүй ✓
 * 🅱️ НӨӨЦ ЗАМ — Supabase Storage:
 *      Зөвхөн R2 хараахан тохируулаагүй үед (503 `R2_NOT_CONFIGURED`).
 *      Ингэснээр R2-ийн түлхүүр оруулахаас өмнө ч зураг оруулж болно ✓
 *      ⚠️ Бусад алдааг НУУХГҮЙ — тэр үед ойлгомжтой мессеж шиднэ.
 */
export async function uploadImages(userId, files) {
  const sb = needClient();
  if (!userId) throw new Error('Эхлээд нэвтрэх шаардлагатай');
  if (!files || !files.length) return [];

  const presigned = await requestPresignedUploads(sb, IMAGE_BUCKET, files);
  if (presigned.ok) {
    const urls = [];
    for (let i = 0; i < files.length; i += 1) {
      const target = presigned.files[i];
      if (!target) throw new Error('Storage серверээс upload линк дутуу ирлээ. Дахин оролдоно уу.');
      urls.push(await putToR2(target, files[i]));
    }
    return urls;
  }
  if (presigned.code !== 'R2_NOT_CONFIGURED') {
    throw new Error(presigned.error || 'Зургийг байршуулж чадсангүй.');
  }

  // 🅱️ НӨӨЦ ЗАМ — Supabase Storage (зөвхөн R2 тохируулаагүй үед)
  const urls = [];
  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const { error } = await sb.storage.from(IMAGE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      // ⚠️ «Bucket not found» → ойлгомжтой монгол мессеж (schema migration
      //    ажиллаагүй үед Supabase ийм бүдэг алдаа буцаадаг).
      if (/bucket not found/i.test(error.message || '')) {
        throw new Error(
          `Зургийн сан «${IMAGE_BUCKET}» үүсээгүй байна. Supabase → SQL Editor дээр ` +
          'тусгийн schema migration-ыг ажиллуулна уу.'
        );
      }
      throw normalizeError(error);
    }
    const { data } = sb.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

/**
 * ХЭРЭГЛЭГЧИЙН НИЙТИЙН ПРОФАЙЛ (нэр + зураг) — ID-гаар олноор.
 *
 * ⚠️ ЯАГААД JOIN БИШ ВЭ: `listings.user_id` нь `auth.users` руу заадаг ба
 * `profiles` руу FK БАЙХГҮЙ тул PostgREST-ийн embed (`profiles(...)`)
 * ажиллахгүй. Тиймээс 2 дахь query-ээр авч client талд нэгтгэнэ
 * (нэмэлт 20-40 мс, гэхдээ «үргэлж шинэ»).
 *
 * @param {string[]} ids `user_id`-ууд
 * @returns {Promise<Object<string, {displayName: string, avatarUrl: string|null}>>}
 */
export async function fetchProfilesByIds(ids = []) {
  const list = [...new Set((ids || []).filter(Boolean))];
  if (!list.length) return {};

  const sb = needClient();
  // ⚠️ 0017_profile_identity.sql → `show_identity`: зар дээр нэр/зургаа
  //    НИЙТЭД харуулах эсэх (opt-in, бүртгэлийн үед асууна).
  // ⚠️ 0015_profiles_public.sql → `display_name`, `avatar_url`.
  let { data, error } = await sb
    .from('profiles')
    .select('id, name, display_name, avatar_url, created_at, show_identity')
    .in('id', list);

  if (error && /display_name|avatar_url|show_identity/i.test(error.message || '')) {
    // ⚠️ GRACEFUL DEGRADATION (2026-09-27): 0015/0017 ороогүй бол дээрх
    //    багананууд БАЙХГҮЙ → PostgREST нь
    //    «Could not find the 'display_name' column …» алдаа буцаана.
    //    Тэгвэл ЗӨВХӨН үргэлж байдаг баганануудыг уншина — ингэснээр
    //    ХЭРЭГЛЭГЧИЙН НЭР (`profiles.name`) зар дээр ХАРАГДАСААР байна ✓
    //    (өмнө нь алдаа шидэж, нэр/зураг ОГТ ИРЭХГҮЙ байв ✗)
    console.warn(
      '⚠️ 0015/0017 migration ороогүй — профайлын хязгаарлагдмал талбаруудыг уншив ' +
      '(хоч нэр/профайл зураг ажиллахгүй)'
    );
    ({ data, error } = await sb
      .from('profiles')
      .select('id, name, created_at')
      .in('id', list));
  }
  if (error) throw normalizeError(error);

  const out = {};
  (data || []).forEach((p) => {
    // ⚠️ `show_identity = false` бол нэр/зургийг **ХООСОН** буцаана →
    //    `ListingCard` / `ListingDetailClient` дээр блок НЬ ХАРАГДАХГҮЙ
    //    (тэнд `displayName` хоосон бол render хийхгүй).
    //    ⚠️ Багана огт байхгүй (0017 ороогүй) бол `undefined` → харуулна.
    const visible = p.show_identity === undefined ? true : p.show_identity === true;
    out[p.id] = {
      // ⚠️ НИЙТЭД харагдах нэр нь `display_name` (нэр).
      // Хоосон бол `name` (жинхэнэ нэр) руу fallback.
      displayName: visible ? String(p.display_name || p.name || '').trim() : '',
      avatarUrl: visible ? (p.avatar_url || null) : null,
      createdAt: p.created_at || null,
      identityHidden: !visible,
    };
  });
  return out;
}

/**
 * Профайлын засвар — нэр / жинхэнэ нэр / зураг.
 * ⚠️ RLS (`profiles_update`: `auth.uid() = id`) нь зөвхөн ӨӨРИЙН мөрийг
 * засахыг зөвшөөрнө — серверийн route шаардлагагүй.
 */
export async function updateProfile(userId, patch = {}) {
  const sb = needClient();
  if (!userId) throw new Error('Эхлээд нэвтрэх шаардлагатай');

  const row = {};
  if (patch.displayName !== undefined) {
    row.display_name = String(patch.displayName || '').trim() || null;
  }
  if (patch.name !== undefined) row.name = String(patch.name || '').trim() || null;
  if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl || null;
  // ⚠️ 0017: зар дээр нэр/зургаа нийтэд харуулах эсэх (opt-in)
  if (patch.showIdentity !== undefined) row.show_identity = patch.showIdentity === true;
  if (!Object.keys(row).length) return null;

  let { data, error } = await sb
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select()
    .single();

  // ⚠️ GRACEFUL DEGRADATION (2026-09-27): `0017_profile_identity.sql` ороогүй
  //    бол `show_identity` багана байхгүй → PostgREST нь
  //    «Could not find the 'show_identity' column … (PGRST204)» алдаа буцаана.
  //    Тэгвэл ЗӨВХӨН тэр талбарыг орхиод ДАХИН оролдоно — хоч нэр, зураг
  //    ХАДГАЛАГДАНА ✓ (өмнө нь БҮТЭН хадгалалт унадаг байв).
  if (error && /show_identity/i.test(error.message || '') && row.show_identity !== undefined) {
    console.warn('⚠️ 0017_profile_identity.sql ороогүй — show_identity-гүйгээр хадгалав');
    delete row.show_identity;
    ({ data, error } = await sb
      .from('profiles')
      .update(row)
      .eq('id', userId)
      .select()
      .single());
  }
  if (error) throw normalizeError(error);
  return data;
}

/**
 * ПРОФАЙЛ ЗУРАГ (аватар) байршуулах → нийтийн URL буцаана.
 *
 * 🅰️ ҮНДСЭН ЗАМ — Cloudflare R2 (`/api/storage/presign` → ШУУД PUT)
 * 🅱️ НӨӨЦ ЗАМ — Supabase Storage (R2 тохируулаагүй үед)
 *
 * ⚠️ Зам нь ЗААВАЛ `avatars/<user_id>/…` байх ёстой — хуучин Storage RLS
 *    (0015) ба шинэ presign API хоёулаа эхний фолдерыг хэрэглэгчийн id-тай
 *    харьцуулж хамгаалдаг ✓
 * ⚠️ Файлыг `compressImage()`-оор урьдчилан шахсан байх ёстой
 * (`components/ProfileModal.jsx` / `AuthModal.jsx`).
 */
export async function uploadAvatar(userId, file) {
  const sb = needClient();
  if (!userId) throw new Error('Эхлээд нэвтрэх шаардлагатай');
  if (!file) return null;

  const presigned = await requestPresignedUploads(sb, AVATAR_BUCKET, [file]);
  if (presigned.ok) {
    const target = presigned.files[0];
    if (!target) throw new Error('Storage серверээс upload линк дутуу ирлээ. Дахин оролдоно уу.');
    return putToR2(target, file);
  }
  if (presigned.code !== 'R2_NOT_CONFIGURED') {
    throw new Error(presigned.error || 'Профайл зургийг байршуулж чадсангүй.');
  }

  // 🅱️ НӨӨЦ ЗАМ — Supabase Storage
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

  const { error } = await sb.storage.from(AVATAR_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: file.type,
    upsert: false,
  });
  if (error) {
    // ⚠️ «Bucket not found» — `avatars` bucket нь `0015_profiles_public.sql`-ээр
    //    үүсдэг (`insert into storage.buckets … 'avatars'`). Migration
    //    ажиллаагүй бол Supabase яг ийм бүдэг алдаа буцаадаг тул
    //    ойлгомжтой монгол мессеж болгож хөрвүүлнэ.
    if (/bucket not found/i.test(error.message || '')) {
      throw new Error(
        'Профайл зургийн сан (avatars bucket) үүсээгүй байна. ' +
        'Supabase → SQL Editor дээр `0015_profiles_public.sql`-ийг ажиллуулна уу.'
      );
    }
    throw normalizeError(error);
  }

  const { data } = sb.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Профайл (нэр) унших/үүсгэх */
export async function upsertProfile(userId, name) {
  const sb = needClient();
  const { data, error } = await sb
    .from('profiles')
    .upsert({ id: userId, name: name || null }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw normalizeError(error);
  return data;
}

export async function fetchProfile(userId) {
  const sb = needClient();
  if (!userId) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  return data;
}

// ============================================================
// САНАЛ ХҮСЭЛТ (feedback) — supabase/migrations/0008_feedback.sql
//   • Илгээх: зөвхөн нэвтэрсэн хэрэглэгч (RLS: auth.uid() = user_id)
//   • Харах: хэрэглэгч зөвхөн ӨӨРИЙН илгээсэн саналыг
//   • Админ: /api/admin/feedback (service_role) → /admin/feedback
// ============================================================

/** Саналын ангилал — UI-д (сонголт) ба шошгонд хэрэглэгдэнэ */
export const FEEDBACK_CATEGORIES = [
  { value: 'suggestion', label: '💡 Санал', hint: 'Сайжруулах санаа' },
  { value: 'complaint', label: '⚠️ Гомдол', hint: 'Ажиллагаа/хэрэглэгчийн гомдол' },
  { value: 'bug', label: '🐞 Алдаа', hint: 'Техникийн алдаа, эвдрэл' },
  { value: 'other', label: '💬 Бусад', hint: 'Бусад асуудал' },
];

/** Саналын төлөв — админ талд */
export const FEEDBACK_STATUSES = [
  { value: 'new', label: '🆕 Шинэ', className: 'bg-primary/10 text-primary' },
  { value: 'read', label: '👁 Харсан', className: 'bg-amber-100 text-amber-800' },
  { value: 'resolved', label: '✅ Шийдсэн', className: 'bg-secondary/10 text-secondary-dark' },
];

/** Хүснэгт байхгүй (0008 migration ажиллаагүй) үед ойлгомжтой мессеж */
function feedbackMissingTable(error) {
  const msg = `${(error && error.message) || ''} ${(error && error.details) || ''} ${(error && error.code) || ''}`;
  if (/feedback/i.test(msg) && /does not exist|relation|schema cache|PGRST205|42P01/i.test(msg)) {
    return new Error(
      'Санал хүсэлтийн хүснэгт олдсонгүй. Supabase → SQL Editor дээр ' +
        'supabase/migrations/0008_feedback.sql файлыг ажиллуулна уу.'
    );
  }
  return null;
}

/**
 * Санал хүсэлт илгээх (зөвхөн нэвтэрсэн хэрэглэгч).
 * @param {{userId: string, category?: string, subject?: string, message: string,
 *          contactName?: string, phone?: string, listingId?: string}} payload
 *
 * ⚠️ `listingId` — зарын дэлгэрэнгүй хуудаснаас гомдол илгээхэд хамт хадгална
 *    (0009_feedback_listing.sql). Тухайн багана байхгүй бол автоматаар
 *    түүнгүйгээр дахин илгээж, зарын ID-г гарчигт нь бичнэ → сайт эвдрэхгүй.
 */
export async function submitFeedback(payload) {
  const sb = needClient();
  const userId = payload && payload.userId;
  if (!userId) throw new Error('Санал хүсэлт илгээхийн тулд эхлээд нэвтэрнэ үү.');

  const message = String((payload && payload.message) || '').trim();
  if (message.length < 5) throw new Error('Саналаа 5-аас дээш тэмдэгтээр бичнэ үү.');
  if (message.length > 4000) throw new Error('Санал хэт урт байна (4000 тэмдэгт хүртэл).');

  const listingId = payload.listingId || null;
  if (listingId && !isUuid(listingId)) throw new Error('Зарын ID буруу байна.');

  const base = {
    user_id: userId,
    category: payload.category || 'suggestion',
    subject: (payload.subject || '').trim() || null,
    message,
    contact_name: payload.contactName || null,
    phone: payload.phone || null,
  };

  const insert = (row) => sb.from('feedback').insert(row).select().single();

  let { data, error } = await insert(listingId ? { ...base, listing_id: listingId } : base);

  // `listing_id` багана байхгүй (0009 migration ажиллаагүй) → зарын ID-г
  // гарчигт бичээд дахин илгээнэ (мэдээлэл алдагдахгүй).
  if (error && /listing_id/i.test(`${error.message || ''} ${error.details || ''}`)) {
    const titled = listingId
      ? { ...base, subject: `${base.subject || ''} [Зар #${String(listingId).slice(0, 8)}]`.trim() }
      : base;
    ({ data, error } = await insert(titled));
  }

  if (error) throw feedbackMissingTable(error) || normalizeError(error);
  return data;
}

/** Өөрийн илгээсэн саналууд (шинэ нь эхэнд) */
export async function fetchMyFeedback(userId) {
  if (!userId) return [];
  const sb = needClient();
  const { data, error } = await sb
    .from('feedback')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw feedbackMissingTable(error) || normalizeError(error);
  return data || [];
}

// ============================================================
// ҮНИЙН СТАТИСТИК — манай ӨӨРИЙН заруудаас бодно
//
// ⚠️ PostgREST нь GROUP BY дэмждэггүй тул мөрүүдийг татаж, JS дээр агрегацлана
//    (одоогийн хэмжээнд ямар ч асуудалгүй; 10,000+ зар болвол SQL view/RPC
//    болгож шилжүүлэх нь зүйтэй).
// ⚠️ Гадны (албан ёсны) статистикийг энд ХОЛИХГҮЙ — эх сурвалжтай нь тусад нь
//    (lib/marketData.js → REFERENCE_PRICE_PER_M2) харуулна.
// ============================================================

/** Орон сууцны «зарах» заруудаас ₮/м² статистик (дүүрэг ба хороогоор) */
export async function fetchPricePerM2Stats({ city = 'Улаанбаатар', propertyType = 'Орон сууц' } = {}) {
  const sb = needClient();

  let query = sb
    .from('listings')
    .select('price, area, district, khoroo, city, property_type, category, created_at')
    .eq('category', 'sell')
    .eq('property_type', propertyType)
    .gt('area', 0)
    .gt('price', 0)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (city) query = query.eq('city', city);

  const { data, error } = await query;
  if (error) throw normalizeError(error);

  const rows = (data || []).filter((r) => Number(r.area) > 0 && Number(r.price) > 0);
  const perM2 = rows.map((r) => Number(r.price) / Number(r.area));

 /** Нэг бүлгийн статистик */
  const aggregate = (list, extra = {}) => {
    if (!list.length) return null;
    const values = list.map((r) => Number(r.price) / Number(r.area)).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    const prices = list.map((r) => Number(r.price));
    return {
      ...extra,
      count: list.length,
      avgPerM2: values.reduce((s, v) => s + v, 0) / values.length,
      medianPerM2: median,
      minPerM2: values[0],
      maxPerM2: values[values.length - 1],
      avgPrice: prices.reduce((s, v) => s + v, 0) / prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  };

  const byDistrictMap = {};
  rows.forEach((r) => {
    const key = r.district || 'Тодорхойгүй';
    (byDistrictMap[key] = byDistrictMap[key] || []).push(r);
  });

  const byKhorooMap = {};
  rows.forEach((r) => {
    if (!r.district || !r.khoroo) return;
    const key = `${r.district}||${r.khoroo}`;
    (byKhorooMap[key] = byKhorooMap[key] || []).push(r);
  });

  const byDistrict = Object.entries(byDistrictMap)
    .map(([district, list]) => aggregate(list, { district }))
    .filter(Boolean)
    .sort((a, b) => b.medianPerM2 - a.medianPerM2);

  const byKhoroo = Object.entries(byKhorooMap)
    .map(([key, list]) => {
      const [district, khoroo] = key.split('||');
      return aggregate(list, { district, khoroo });
    })
    .filter(Boolean)
    .sort((a, b) => b.medianPerM2 - a.medianPerM2 || a.district.localeCompare(b.district));

  return {
    city,
    propertyType,
    total: rows.length,
    overall: aggregate(rows) || { count: 0 },
    byDistrict,
    byKhoroo,
    avgPerM2All: perM2.length ? perM2.reduce((s, v) => s + v, 0) / perM2.length : 0,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================================
// МЕССЕЖ (чат) — supabase/migrations/0020_messages.sql
//
//   • Яриа (thread) нь нэг ЗАРЫН эргэн тойронд эсвэл 2 хүний хооронд.
//   • RLS: зөвхөн оролцогч хоёр (buyer_id/seller_id) харна/бичнэ —
//     серверийн route ШААРДЛАГАГҮЙ (RLS өөрөө хамгаална ✓)
//   • Уншсан тэмдэглэх нь зөвхөн `read_at` баганад (баганын эрх)
// ============================================================

/** Ярианы багана — `select` бүрд ижил (жагсаалт ба thread-ийг хөнгөн байлгана) */
export const CONVERSATION_FIELDS =
  'id, listing_id, listing_title, buyer_id, seller_id, last_message, last_sender_id, last_message_at, created_at';

/** Мессежийн багана */
export const MESSAGE_FIELDS = 'id, conversation_id, sender_id, body, read_at, created_at';

/** Ярианы жагсаалтанд татах дээд хязгаар (хуудаслалт хийхгүй — олон бол дараа нэмнэ) */
const CONVERSATIONS_LIMIT = 60;
/** Нэг thread-д татах мессежийн дээд хязгаар */
const THREAD_LIMIT = 300;
/** Уншаагүй мессежийг тоолох дээд хязгаар */
const UNREAD_SCAN_LIMIT = 500;

/** Хүснэгт байхгүй (0020 migration ажиллаагүй) үед ойлгомжтой мессеж */
function messagesMissingTable(error) {
  const msg = `${(error && error.message) || ''} ${(error && error.details) || ''} ${(error && error.code) || ''}`;
  if (/conversations|messages/i.test(msg) && /does not exist|relation|schema cache|PGRST205|42P01/i.test(msg)) {
    return new Error(
      'Мессежийн хүснэгт олдсонгүй. Supabase → SQL Editor дээр ' +
        'supabase/migrations/0020_messages.sql файлыг ажиллуулна уу (npm run messages:setup).'
    );
  }
  return null;
}

/** Миний бүх яриа (шинэ мессежтэй нь эхэнд) */
export async function fetchConversations(userId) {
  if (!userId) return [];
  const sb = needClient();
  // ⚠️ RLS нь зөвхөн оролцсон яриаг л буцаана — `.or()` нь «би buyer ЭСВЭЛ
  //    seller» гэсэн шүүлт (PostgREST-ийн `or` синтакс ✓)
  const { data, error } = await sb
    .from('conversations')
    .select(CONVERSATION_FIELDS)
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order('last_message_at', { ascending: false })
    .limit(CONVERSATIONS_LIMIT);
  if (error) throw messagesMissingTable(error) || normalizeError(error);
  return data || [];
}

/** Нэг яриа (thread-ийн толгойд: нөгөө тал, зарын гарчиг) */
export async function fetchConversation(conversationId) {
  if (!conversationId) return null;
  const sb = needClient();
  const { data, error } = await sb
    .from('conversations')
    .select(CONVERSATION_FIELDS)
    .eq('id', conversationId)
    .maybeSingle();
  if (error) throw messagesMissingTable(error) || normalizeError(error);
  return data || null;
}

/**
 * Ярианы мессежүүд (хуучин → шинэ).
 * ⚠️ Серверээс СҮҮЛИЙН `limit` мессежийг буурах дарааллаар татаж, дотор нь
 *    эргүүлнэ — ингэснээр урт чатад ч ХАМГИЙН ШИНЭ мессежүүд харагдана ✓
 */
export async function fetchMessages(conversationId, { limit = THREAD_LIMIT } = {}) {
  if (!conversationId) return [];
  const sb = needClient();
  const { data, error } = await sb
    .from('messages')
    .select(MESSAGE_FIELDS)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw messagesMissingTable(error) || normalizeError(error);
  return (data || []).reverse();
}

/**
 * Мессеж илгээх.
 * ⚠️ Текст нь `lib/messages.mjs` → `validateMessageBody()`-ээр шалгагдана
 *    (хоосон/2000+ тэмдэгт) — DB-ийн CHECK-тэй ИЖИЛ тул «товч идэвхтэй атлаа
 *    DB алдаа» гэсэн зөрчил гарахгүй ✓
 */
export async function sendMessage({ conversationId, senderId, body }) {
  if (!conversationId) throw new Error('Яриа сонгогдоогүй байна.');
  if (!senderId) throw new Error('Мессеж бичихийн тулд эхлээд нэвтэрнэ үү.');
  const check = validateMessageBody(body);
  if (!check.ok) throw new Error(check.error);

  const sb = needClient();
  const { data, error } = await sb
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: check.value })
    .select(MESSAGE_FIELDS)
    .single();
  if (error) throw messagesMissingTable(error) || normalizeError(error);
  return data;
}

/**
 * Яриаг «уншсан» болгоно (бусдын илгээсэн, уншаагүй мессежүүд).
 * @returns {Promise<number>} хэдэн мессеж шинэчлэгдсэн
 * ⚠️ Алдааг ЧИМЭЭГҮЙ өнгөрөөнө — уншсан тэмдэг тавихгүй байх нь чатыг
 *    уншихад саад болох ёсгүй ✓
 */
export async function markConversationRead(conversationId, userId) {
  if (!conversationId || !userId) return 0;
  try {
    const sb = needClient();
    const { data, error } = await sb
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .is('read_at', null)
      .neq('sender_id', userId)
      .select('id');
    if (error) throw error;
    return (data || []).length;
  } catch (err) {
    console.warn('[messages] уншсан тэмдэг тавихгүй өнгөрлөө:', (err && err.message) || err);
    return 0;
  }
}

/**
 * Уншаагүй мессежүүд (яриа тус бүрээр тоолохын тулд).
 * ⚠️ Зөвхөн 3 багана — хөнгөн query ✓ (RLS нь миний яриагаар хязгаарлана)
 */
export async function fetchUnreadMessages(userId, { limit = UNREAD_SCAN_LIMIT } = {}) {
  if (!userId) return [];
  const sb = needClient();
  const { data, error } = await sb
    .from('messages')
    .select('id, conversation_id, sender_id')
    .is('read_at', null)
    .neq('sender_id', userId)
    .limit(limit);
  if (error) throw messagesMissingTable(error) || normalizeError(error);
  return data || [];
}

/** Нийт уншаагүй мессежийн тоо (nav-ийн badge) — `head: true` тул хөнгөн ✓ */
export async function fetchUnreadCount(userId) {
  if (!userId) return 0;
  const sb = needClient();
  const { count, error } = await sb
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null)
    .neq('sender_id', userId);
  if (error) {
    // ⚠️ Миграцгүй бол badge нь чимээгүй «0» — хуудас эвдрэхгүй ✓
    if (messagesMissingTable(error)) return 0;
    throw normalizeError(error);
  }
  return count || 0;
}

/**
 * Яриа ХАЙХ, байхгүй бол ҮҮСГЭХ (зар/профайлаас «Мессеж бичих» дарахад).
 *
 * ⚠️ ЯАГААД `upsert` БИШ ВЭ: `conversations_unique_idx` нь EXPRESSION индекс
 *    (`coalesce(listing_id, ...)`) тул PostgREST-ийн `on_conflict` түүнийг
 *    ашиглаж чадахгүй. Тиймээс: (1) хайх → (2) байхгүй бол оруулах →
 *    (3) `23505` (unique violation) гарвал өөр хүсэлт зэрэг үүсгэсэн гэсэн
 *    үг → ДАХИН хайна ✓
 * ⚠️ ХАЙЛТ НЬ ХОЁР ЧИГЛЭЛД: A эхлүүлсэн бол `buyer_id = A`; харин B
 *    «Мессеж бичих» дарахад `buyer_id = B` гэж хайвал ОЛОХГҮЙ ✗
 *
 * @returns {Promise<object>} яриа (шинэ эсвэл одоо байгаа)
 */
export async function findOrCreateConversation({ listingId = null, listingTitle = null, myId, otherId }) {
  const check = canMessage(myId, otherId);
  if (!check.ok) throw new Error(check.error);

  const sb = needClient();

  // ⚠️ PostgREST-ийн query builder нь MUTABLE (`eq` нь өөрөө дээрээ нэмэгдэнэ)
  //    тул хос бүрд ШИНЭ builder үүсгэнэ ✗ (хуучин builder дахин ашиглавал
  //    ABC шүүлт зэрэг нэмэгдэж, хайлт хоосон болно)
  const build = () => {
    let q = sb.from('conversations').select(CONVERSATION_FIELDS);
    q = listingId ? q.eq('listing_id', listingId) : q.is('listing_id', null);
    return q;
  };

  const findExisting = async () => {
    const mine = await build().eq('buyer_id', myId).eq('seller_id', otherId).maybeSingle();
    if (mine.error && !messagesMissingTable(mine.error)) throw normalizeError(mine.error);
    if (mine.data) return mine.data;

    const theirs = await build().eq('buyer_id', otherId).eq('seller_id', myId).maybeSingle();
    if (theirs.error && !messagesMissingTable(theirs.error)) throw normalizeError(theirs.error);
    return theirs.data || null;
  };

  const existing = await findExisting();
  if (existing) return existing;

  const { data, error } = await sb
    .from('conversations')
    .insert({
      buyer_id: myId,
      seller_id: otherId,
      listing_id: listingId || null,
      listing_title: String(listingTitle || '').trim().slice(0, 200) || null,
    })
    .select(CONVERSATION_FIELDS)
    .single();

  if (error) {
    // 23505 = unique_violation → нөгөө тал/зэрэгцээ хүсэлт үүсгэсэн байна
    if (error.code === '23505') {
      const again = await findExisting();
      if (again) return again;
    }
    throw messagesMissingTable(error) || normalizeError(error);
  }
  return data;
}

// ⚠️ МЕССЕЖИЙН БҮРЭН ЛОГИК: (1) UI logic → lib/messages.mjs,
//    (2) DB функцууд → дээрх хэсэг, (3) /messages хуудас → components/MessagesClient.jsx

