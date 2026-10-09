// ============================================================
// 🔎 ТӨСТЭЙ ЗАРУУД — ЦЭВЭР ЛОГИК (2026-10-09 (79))
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: зарын дэлгэрэнгүй хуудас (`/listings/[id]`) руу ороход
//   доор нь «🔎 Төстэй зарууд» гардаг болгох (жишиг сайтын хэв) ✓
//
// ⚠️ ЭНЭ МОДУЛЬ ЯАГААД ТУСДАА ВЭ:
//   Ранк/онооллын дүрэм нь СЕРВЕР (DB-ийн шүүлт) ба КЛИЕНТ (дэлгэц) хоёрын
//   дунд байрлана. Дүрмийг компонент дотор бичвэл тестлэх боломжгүй болж,
//   «яагаад энэ зар төстэй гэж гарсан юм» гэдгийг батлах аргагүй ✗
//   — тиймээс зөвхөн Node-д ажилладаг цэвэр функцүүд энд байна ✓
//
// 📐 РАНКИЙН ДҮРЭМ (хэрэглэгчийн сонголт: «ижил ХЭСЭГ + category, дараа нь
//    ижил дүүрэг/төрөл, хамгийн сүүлийн 6 зар»):
//      ① ХЭСЭГ (`section`) — DB дээр `.eq()` (шүүнэ, оноо БИШ)
//      ② АНГИЛАЛ (`category` — Зарах/Түрээслэх) — DB дээр `.eq()` (шүүнэ)
//      ③ ДҮҮРЭГ (`district`) ижил            → **+3**  ← хамгийн хүчтэй
//      ④ ТӨРӨЛ (`property_type`) ижил        → **+2**
//      ⑤ ХОРОО (`khoroo`) ижил               → **+1**
//      ⑥ ХОТ (`city`) ижил                   → **+1**  (үл хөдлөх бус хэсэгт
//         дүүрэг хоосон байдаг тул байршлын гол дохио нь хот ✓)
//      ⑦ Дээрх оноо ТЭНЦВЭЛ → `created_at` буурахаар (шинэ нь эхэнд)
//      ⑧ Тэр ч тэнцвэл → `id` буурахаар (ТОГТВОРТОЙ дараалал — Postgres
//         тэнцүү мөрүүдийн дарааллыг батлахгүй тул заавал хэрэгтэй ✓)
//
// ⚠️ ХООСОН утга ХЭЗЭЭ Ч тохирохгүй (`''`, `null`, `undefined`) — эс бөгөөс
//    «дүүрэг хоосон» бүх зар хоорондоо «ижил дүүрэгтэй» гэж тооцогдоно ✗
//
// 🔍 ХАЙХ ҮГ: similarListings, SimilarListings, fetchSimilarListings,
//    similarityScore, rankSimilarListings, Төстэй зарууд
// ============================================================

/** 📄 Хамгийн ихдээ хэдэн төстэй зар харуулах вэ (нэг мөр 3 карт × 2). */
export const SIMILAR_LISTINGS_LIMIT = 6;

/**
 * 🔽 DB-ээс татах «нэр дэвшигчийн» сан (client талд оноолж эрэмбэлнэ).
 * ⚠️ PostgREST нь «хэдэн талбар таарсан» гэж эрэмбэлж чадахгүй тул эхлээд
 *    ижил хэсэг/ангиллын СҮҮЛИЙН N зарыг татаж, дараа нь оноолно ✓
 * ⚠️ Хэт бага болвол «ижил дүүрэг»-тэй зар сүүлд нь татагдсан байж
 *    жагсаалтад ОРОХГҮЙ үлдэнэ; хэт их болвол сүлжээний хэмжээ өснө
 *    — 60 нь «6 харуулах»-ын хувьд тохиромжтой тэнцэл ✓
 */
export const SIMILAR_CANDIDATE_POOL = 60;

/** 🔤 Харьцуулахын өмнө нормчлох: trim + жижиг үсэг + олон зай → нэг зай. */
function norm(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Хоёр утга ХОЁУЛАА дүүрэн ба ЯГ ижил үү (хоосон үед ХЭЗЭЭ Ч false ✓). */
function sameNonEmpty(a, b) {
  const x = norm(a);
  return Boolean(x) && x === norm(b);
}

/**
 * Зарын ХЭСЭГ — хоосон (`null`) бол `'real-estate'` (хуучин зарын хэв,
 * `0016_listing_sections.sql`-ийн default).
 * @param {object} listing
 * @returns {string}
 */
export function similarSection(listing) {
  const section = listing && listing.section;
  return section || 'real-estate';
}

/**
 * DB дээр шүүх АНГИЛАЛ (`.eq('category', …)`) — зөвхөн «Зарах»/«Түрээслэх»
 * утгыг л буцаана; бусад (хоосон/танихгүй) үед `null` ⇒ шүүлт ХИЙХГҮЙ ✓
 * ⚠️ Үл хөдлөх бус хэсэгт (авто/ажил/компьютер…) бүх зар `'sell'` байдаг тул
 *    энэ шүүлт нь тэнд хор хөнөөлгүй (зөвхөн `'rent'` ховор тохиолдлыг
 *    тусад нь авч үзнэ) ✓
 * @param {object} listing
 * @returns {'sell'|'rent'|null}
 */
export function similarCategoryFilter(listing) {
  const category = listing && listing.category;
  return category === 'sell' || category === 'rent' ? category : null;
}

/**
 * 🎯 ХОЁР ЗАРЫН «ТӨСӨӨТЭЙ БАЙДЛЫН» ОНОО (0 = огт төстэй биш).
 * Дүрэм нь дээрх толгойн коммент дэх ③④⑤⑥ — жин нь ТОГТМОЛ ✓
 * @param {object} target    Одоогийн зар (дэлгэрэнгүй хуудасных)
 * @param {object} candidate Харьцуулах зар
 * @returns {number}
 */
export function similarityScore(target, candidate) {
  if (!target || !candidate) return 0;
  let score = 0;
  if (sameNonEmpty(target.district, candidate.district)) score += 3;
  if (sameNonEmpty(target.property_type, candidate.property_type)) score += 2;
  if (sameNonEmpty(target.khoroo, candidate.khoroo)) score += 1;
  if (sameNonEmpty(target.city, candidate.city)) score += 1;
  return score;
}

/**
 * 🏆 ТӨСТЭЙ ЗАРУУДЫГ ЭРЭМБЭЛЖ, ДЭЭД `limit`-ыг буцаана.
 *
 * ⚠️ Одоогийн зарыг (өөрийгөө) ХАСНА — `id` ижил мөр жагсаалтад гарахгүй ✓
 * ⚠️ `candidates` нь массив биш/`null` бол ХООСОН массив (уналтгүй ✓)
 * ⚠️ Оноо тэнцвэл `created_at` буурахаар, дараа нь `id` буурахаар —
 *    ингэснээр ижил оролт БАЯР ижил дараалал өгнө (тест тогтвортой ✓)
 *
 * @param {object} target Одоогийн зар
 * @param {Array} candidates DB-ээс ирсэн нэр дэвшигчид
 * @param {number} [limit=SIMILAR_LISTINGS_LIMIT]
 * @returns {Array} `limit` хүртэлх зар (оноо буурахаар)
 */
export function rankSimilarListings(target, candidates, limit = SIMILAR_LISTINGS_LIMIT) {
  if (!target || !Array.isArray(candidates)) return [];
  const size = Math.max(1, Math.floor(Number(limit) || SIMILAR_LISTINGS_LIMIT));
  const targetId = target.id;

  const ranked = candidates
    .filter((candidate) => candidate && candidate.id && candidate.id !== targetId)
    .map((candidate) => ({ candidate, score: similarityScore(target, candidate) }));

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const ta = Date.parse(a.candidate.created_at || '') || 0;
    const tb = Date.parse(b.candidate.created_at || '') || 0;
    if (tb !== ta) return tb - ta;
    return String(b.candidate.id).localeCompare(String(a.candidate.id));
  });

  return ranked.slice(0, size).map((entry) => entry.candidate);
}
