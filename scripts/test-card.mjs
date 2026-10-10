// ============================================================
// test-card.mjs — 📇 ЗАРЫН КАРТЫН ДИЗАЙНЫ ГЭРЭЭ (2026-10-09: БОСОО хэв)
//
// Хэрэглэгчийн хүсэлт: «зарыг харуулж байгаа картын загварыг дуурааж
// хийнэ үү» + **жишиг сайт**-ын нүүр ба зарын дэлгэрэнгүй дээрх картууд:
//   • ЗУРАГ нь ДЭЭРЭЭ, БҮТЭН өргөн (`aspect-[4/3] rounded-xl`) + 🖼 КАРУСЕЛЬ
//     (85: swipe + ‹ › товч + цэгүүд + амьд тоолуур) + «🖼 2/16» (баруун доод)
//   • ❤️/🤍 нь ЗУРГИЙН БАРУУН ДЭЭД буланд (🆕 (86) — цагаан товч)
//   • ХАЙРЦАГГҮЙ (хүрээ/сүүдэр/саарал дэвсгэр БАЙХГҮЙ) ба ДАРААЛАЛ:
//     🏷️ гарчиг → 📋 мэдээлэл → 🕒/📍 мета → 💰 ҮНЭ (хамгийн доор, том bold) + ✅
//     (⏳ (78)-аас өмнө нийтлэгчийн band байв — 🆕 (85)-д ХАСАГДАВ)
//   • ЖАГСААЛТ нь БАГАНАТ GRID (нүүр · /favorites · /history · /sellers)
//
// 🆕 2026-10-09 (86) — «жишиг сайтын design» 3 ДАХЬ засвар (хэрэглэгчийн хүсэлт:
//    «like ийг картныхаа баруун дээд буланд гаргачих … картны design харагдах
//     байдлыг жишиг сайт шиг болго»):
//   ① ❤️ → зургийн БАРУУН ДЭЭД булан ② хүрээ/сүүдэр/саарал хайрцаг ХАСАГДАВ
//   ③ гарчиг → мэдээлэл → үнэ дараалал ④ мөр хоорондын зураас ХАСАГДАВ
//   ⑤ мета мөр БҮХ дэлгэцэд `pr-20` (/favorites-ийн «Хасах» баруун доод) ✓
//
// 🆕 2026-10-09 (85) — хэрэглэгчийн хүсэлт («Автомашины картыг … мэдээлэлтэй
//    болго. Мөн дээрх зураг нь жишиг сайт шиг солих боломжтой болго. Мөн байрны
//    зарын картыг ч жишиг сайт шиг болго, харин мэдээллийн хувьд Өрөөний тоо,
//    угаалгын өрөөний тоо, талбайн хэмжээ, давхар гэх мэдээллийг хасна уу. Мөн
//    зар оруулагчийн Profile зураг нэрийг ч хасна уу»):
//   ① 🖼 ЗУРГИЙН КАРУСЕЛЬ (swipe/‹ ›/цэгүүд/амьд тоолуур) ② 🗑 👤 band ХАСАГДАВ
//   ③ 🏠 байрны мөрөөс 🛏/🚿/📐/🏢 ХАСАГДАВ ④ 🚗 `carTitle` нөөц гарчиг ✓
//
// ⏳ 2026-10-03 → 2026-10-09 ХЭВ СОЛИГДСОН: карт ХЭВТЭЭ байв (зураг зүүн
//    `sm:w-[42%]` + `sm:h-[300px]`, үнэ/гарчиг баруун, ❤️ доод мета мөрөнд).
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Карт нь 4 ГАЗАРТ харагддаг (нүүр · Таалагдсан · Үзсэн түүх · Нийтлэгч)
//   тул дизайны гол шинжүүд (зургийн харьцаа, үнэ/гарчиг дараалал, ❤️-ийн
//   байрлал, мета мөр) санамсаргүй өөрчлөгдвөл олон хуудас зэрэг эвдэрнэ ✗
//   — энэ тест тэр гэрээг код дээр бариулна ✓
//
// ⚠️ ХАДГАЛАГДСАН ДҮРМҮҮД (регресс — өмнөх хэрэглэгчийн шийдвэрүүд):
//   ① «Үнэ тохирно» карт дээр ГАРАХГҮЙ (`hasRealPrice` хаалт)
//   ② «Зарах / Түрээслэх» badge ЗӨВХӨН үл хөдлөхөд
//   ③ ❤️/🤍 нь favourite toggle БА нийт тоо (listings.likes)
//   ④ Карт бүхэлдээ нэг `<Link>` — дотор нь өөр `<Link>` БАЙХГҮЙ
//   ⑤ Үнэ нь ТОВЧ форматтай — «760 сая ₮» (🆕 2026-10-06, `shortPriceLabel`;
//      «760,000,000» ХАРАГДАХГҮЙ — урт `priceLabel` нь зөвхөн экспорт/админд ✓)
//
// АЖИЛЛУУЛАХ:  npm run test:card
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (эх кодын ГЭРЭЭ).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — «хасагдсан» гэсэн ТАЙЛБАР нь зүй ёсны тул
 *  шалгалтыг зөвхөн кодын мөрүүд дээр хийнэ (хуурамч улаан гарахгүй ✓) */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const CARD = readSrc('components/ListingCard.jsx');
const CARD_CODE = codeOnly(CARD);
const HOME = readSrc('components/HomeClient.jsx');

console.log('\n🧪 Зарын карт — жишиг сайт хэв (components/ListingCard.jsx)\n');

// ---------- ① БҮТЭЦ / ХЭМЖЭЭ ----------
t('📐 Карт нь БОСОО (`flex-col`) + `data-listing-card` (🆕 2026-10-09: хэвтээ ХЭВ ХАСАГДАВ)', () => {
  assert.match(CARD_CODE, /data-listing-card/, 'CDP-ийн дэгээ (`data-listing-card`) алга ✗');
  // ⚠️ ХЭВТЭЭ картын ул мөр БАЙХГҮЙ (регресс хориг) — карт одоо БОСОО ✓
  assert.ok(!/sm:flex-row/.test(CARD_CODE), 'хуучин хэвтээ layout (`sm:flex-row`) буцаж орсон ✗');
  assert.ok(!/sm:h-\[300px\]/.test(CARD_CODE), 'бэхлэгдсэн өндөр (`sm:h-[300px]`) буцаж орсон ✗');
});

t('🖼 Зураг нь ДЭЭРЭЭ бүтэн өргөн — `aspect-[4/3]` (`sm:w-[42%]`/`h-52` ХАСАГДСАН)', () => {
  assert.match(CARD_CODE, /aspect-\[4\/3\]/, 'зургийн харьцаа (`aspect-[4/3]`) алга ✗');
  assert.match(CARD_CODE, /aspect-\[4\/3\] w-full shrink-0/, 'зураг бүтэн өргөн (`w-full`) биш ✗');
  assert.ok(!/sm:w-\[42%\]/.test(CARD_CODE), 'хуучин зүүн баганын өргөн (`sm:w-[42%]`) үлдсэн ✗');
  assert.ok(!/h-52\b/.test(CARD_CODE), 'хуучин мобайл өндөр (`h-52`) үлдсэн ✗');
});

t('🧱 ЖАГСААЛТ нь БАГАНАТ GRID — нүүр · Таалагдсан · Түүх · Нийтлэгч (2026-10-09 · ✏️ (84))', () => {
  // ⚠️ Босоо карт нь 1 БАГАНАД тохирохгүй (хэт өргөн) ⇒ хуудас бүр GRID-тэй
  // 🆕 2026-10-09 (84): нүүр (сайдбаргүй) 4 багана / хэсэг (сайдбартай) 3 багана
  assert.match(HOME, /className=\{`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 \$\{/,
    'нүүр хуудасны картын GRID алга ✗');
  assert.match(HOME, /noSection \? 'xl:grid-cols-4' : 'xl:grid-cols-3 2xl:grid-cols-4'/,
    '🆕 (84) «сайдбаргүй → 4 багана / сайдбартай → 3 багана» ялгаа алга ✗');
  assert.match(readSrc('components/FavoritesClient.jsx'), /grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3/,
    '/favorites-ийн картын GRID алга ✗');
  assert.match(readSrc('components/SearchHistoryClient.jsx'), /grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3/,
    '/history-ийн картын GRID алга ✗');
  assert.match(readSrc('components/SellerListingsClient.jsx'), /grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3/,
    'нийтлэгчийн заруудын GRID алга ✗');
});

// ---------- ② МЭДЭЭЛЛИЙН ДАРААЛАЛ ----------
t('💰 Үнэ нь ТОМ bold (`text-[22px] font-extrabold`) + ТОВЧ формат (`shortPriceLabel`)', () => {
  assert.match(CARD_CODE, /text-\[22px\]/, 'үнийн хэмжээ `text-[22px]` алга ✗');
  assert.match(CARD_CODE, /font-extrabold/, 'үнэ bold (`font-extrabold`) биш ✗');
  // 🆕 2026-10-06 (хэрэглэгчийн хүсэлт): «760,000,000» БИШ «760 сая ₮» харагдана
  assert.match(CARD_CODE, /shortPriceLabel\(listing\)/, 'үнэ товч шошгоор (`shortPriceLabel`) гарахгүй ✗');
  // ⚠️ Урт хэлбэр (`priceLabel`) карт дээр БУЦАЖ ОРОХ ЁСГҮЙ (export/админ ХӨНДӨӨГДӨӨГҮЙ ✓)
  assert.ok(!/\bpriceLabel\b/.test(CARD_CODE), 'карт дээр урт `priceLabel` буцаж орсон ✗');
});

t('❤️/🤍 нь ҮНИЙ МӨРИЙН БАРУУН ЗАХАД (🆕 (97) — жишиг сайтын карт)', () => {
  // Хэрэглэгчийн хүсэлт: «attached 2 cards, study and change my card information»
  //   ⇒ жишиг сайтын карт: үнэ нь зурагны ЯГ ДОР, ❤️ нь үний мөрийн БАРУУН захад ✓
  assert.match(CARD_CODE, /-mr-1 -mt-0\.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full/,
    '❤️ товч нь ҮНИЙ МӨРИЙН БАРУУН захад (жижиг дугуй товч) БИШ ✗');
  assert.match(CARD_CODE, /data-fav-toggle/, '❤️ товчны `data-fav-toggle` дэгээ алга ✗');
  // ⛔ РЕГРЕСС: ⏳ (86)-ийн «зургийн баруун дээд буланд цагаан товч» БУЦАЖ ОРОХ ЁСГҮЙ
  assert.ok(!/absolute right-2 top-2 z-10 inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white\/90/.test(CARD_CODE),
    '⏳ (86)-ийн зурган дээрх ❤️ товч буцаж орсон ✗ ((97): үний мөрөнд байх ЁСТОЙ)');
  // ⚠️ `toggleFavorite` ЗӨВХӨН 1 удаа дуудагдана (товч НЭГ л байна ✓)
  assert.equal((CARD_CODE.match(/toggleFavorite\(listing\.id\)/g) || []).length, 1,
    '`toggleFavorite` нь 1-ээс олон газар дуудагдаж байна ✗');
});

t('🎨 (86) Карт нь ХАЙРЦАГГҮЙ (хүрээ/сүүдэр/саарал) — зөвхөн зураг + текст', () => {
  assert.match(CARD_CODE, /className="group flex flex-col"/,
    'картын үндсэн класс (`group flex flex-col`) өөрчлөгдсөн ✗');
  // ⏳ (83): `bg-gray-100` + `border border-gray-200` + `shadow-card` байв ⇒ ХАСАГДАВ
  assert.ok(!/border border-gray-200 bg-gray-100/.test(CARD_CODE),
    '⏳ (83)-ийн СААРАЛ хайрцаг буцаж орсон ✗');
  assert.ok(!/hover:-translate-y-0.5/.test(CARD_CODE), 'картын hover «үсрэлт» буцаж орсон ✗');
  assert.match(CARD_CODE, /overflow-hidden rounded-xl/,
    'зургийн дугуйрсан булан (`rounded-xl`) алга ✗');
  // 🎨 (87): зургийн хайрцаг ч СААРАЛГҮЙ — ⏳ (83)-ийн `bg-gray-100` ХАСАГДАВ
  //    (хэрэглэгчийн хүсэлт: «бүх саарал өнгийг үгүй хий») ⇒ карт дээр ЯМАР Ч
  //    `bg-gray-*` дүүргэлт байх ЁСГҮЙ ✓
  assert.ok(!/bg-gray-\d+/.test(CARD_CODE),
    'карт дээр саарал (`bg-gray-*`) дүүргэлт буцаж орсон ✗');
  assert.match(CARD_CODE, /flex flex-1 flex-col pt-2\.5/,
    'мэдээллийн блок нь хайрцаггүй (`pt-2.5`, `p-3.5` БИШ) болоогүй ✗');
  assert.ok(!/border-t border-gray-100/.test(CARD_CODE), 'мөрүүдийн хоорондох зураас буцаж орсон ✗');
});

t('🔀 (97) ДАРААЛАЛ: 💰 үнэ → 🏷️ гарчиг → 📋 мэдээлэл → 🕒/📍 мета (ХАМГИЙН ДООР)', () => {
  const iTitle = CARD_CODE.indexOf('line-clamp-2 text-[16px]');
  const iPrice = CARD_CODE.indexOf('text-[22px] font-extrabold');
  assert.ok(iTitle > 0 && iPrice > 0 && iPrice < iTitle,
    'үнэ нь гарчгийн ДЭЭР (зургийн ЯГ ДОР) БИШ ✗ (жишиг сайтын дараалал: үнэ → гарчиг → мэдээлэл)');
  // ⚠️ Мета мөр нь `mt-auto` — бүх картын мета НЭГ ЗУРААСАНД эгнэнэ ✓
  assert.match(CARD_CODE, /<div data-listing-meta className="mt-auto flex flex-wrap/,
    'мета мөр нь картын ёроолд тогтохгүй (`mt-auto`) ✗');
});

t('🏷️ Гарчиг нь 2 МӨР (`line-clamp-2`) — `listingTitle` (0027)', () => {
  assert.match(CARD_CODE, /line-clamp-2 text-\[16px\]/, 'гарчиг 2 мөр (`line-clamp-2 text-[16px]`) биш ✗');
  assert.match(CARD_CODE, /listingTitle\(listing\)/, '`listingTitle` ашиглахгүй ✗');
});

t('🗑 📝 Тайлбар (`listing.description`) карт дээр БАЙХГҮЙ (2026-10-06)', () => {
  // Хэрэглэгчийн хүсэлт: «Нүүр хуудас дээрх зарын карт дээрээс Тайлбарыг
  // байхгүй болго». ⏳ Хуучин `line-clamp-2 text-[14px]` тайлбарын `<p>` ба
  // `listing.description`-ыг унших код `ListingCard`-ээс ХАСАГДСАН ✓
  // ⚠️ Дэлгэрэнгүй хуудсанд (`ListingDetailClient`) Тайлбар ХЭВЭЭР ✓
  assert.ok(!/listing\.description/.test(CARD_CODE), 'карт дээр `listing.description` буцаж орсон ✗');
  assert.ok(!/line-clamp-2 text-\[14px\] leading-relaxed/.test(CARD_CODE), 'тайлбарын `<p>` буцаж орсон ✗');
});

t('🗑 (85) 👤 Нийтлэгчийн band (Avatar + нэр) КАРТ ДЭЭР ХАСАГДАВ', () => {
  // Хэрэглэгчийн хүсэлт: «зар оруулагчийн Profile зураг нэрийг ч хасна уу» +
  // **жишиг сайт**-ын машин/байрны карт дээр нэр/профайл зураг ОГТ БАЙХГҮЙ ✓
  assert.ok(!/authorName/.test(CARD_CODE), '`authorName` (нийтлэгчийн нэр) буцаж орсон ✗');
  assert.ok(!/authorAvatar/.test(CARD_CODE), '`authorAvatar` (профайл зураг) буцаж орсон ✗');
  assert.ok(!/from '\.\/Avatar'/.test(CARD_CODE), '`Avatar` импорт буцаж орсон ✗');
  assert.ok(!/size=\{28\}/.test(CARD_CODE), '28px Avatar (band) буцаж орсон ✗');
  assert.ok(!/author\?\.displayName/.test(CARD_CODE), '`author.displayName` уншиж байна ✗');
  assert.ok(!/author\?\.avatarUrl/.test(CARD_CODE), '`author.avatarUrl` уншиж байна ✗');
});

t('✅ (85) БАТАЛГААЖСАН нь ҮНИЙ хажууд — `authorVisible` (`show_name`) дүрэмтэй', () => {
  // 🆕 (85): ✅ нь band-ийн оронд ҮНИЙ МӨРӨНД — жишиг сайтын «68 сая ₮ ✓» ✓
  assert.match(CARD_CODE, /const\s+authorVisible\s*=\s*listing\.show_name\s*!==\s*false/,
    '`show_name` шалгалт алга ✗ (нэр нуух тохиргоо ✅-д нөлөөлөхгүй болно)');
  assert.match(CARD_CODE, /\{authorVisible && <VerifiedBadge size=\{15\} className="text-primary" \/>\}/,
    'үнийн хажуугийн ✅ нь `authorVisible`-ээр хаагдсангүй ✗');
  // ⚠️ ❤️ товч нь CDP-ийн ТОГТВОРТОЙ дэгээтэй байх ЁСТОЙ: карт дээр ‹ › товч
  //    нэмэгдсэн тул `button[aria-label]` хайлт ЭХНИЙ ‹ товчийг олж, ❤️-г алдана ✗
  assert.match(CARD_CODE, /data-fav-toggle/, '❤️ товчны `data-fav-toggle` дэгээ алга ✗');
  assert.equal((CARD_CODE.match(/data-fav-toggle/g) || []).length, 1,
    '`data-fav-toggle` нь 1-ээс олон газар байна ✗');
});

t('🏠 (85) БАЙРНЫ мөр: 🛏 өрөө · 🚿 угаалгын өрөө · 📐 м² · 🏢 давхар ХАСАГДАВ', () => {
  // Хэрэглэгчийн хүсэлт: «мэдээллийн хувьд, Өрөөний тоо, угаалгын өрөөний тоо,
  // талбайн хэмжээ, давхар гэх мэдээллийг хасна уу» ⇒ зөвхөн 📅 он үлдэв ✓
  assert.ok(!/өрөө/.test(CARD_CODE), '🛏 «… өрөө» мөр буцаж орсон ✗');
  assert.ok(!/угаалгын өрөө/.test(CARD_CODE), '🚿 «угаалгын өрөө» мөр буцаж орсон ✗');
  assert.ok(!/listing\.rooms|listing\.bathrooms|listing\.area\b/.test(CARD_CODE),
    '`rooms`/`bathrooms`/`area` буцаж орсон ✗');
  assert.ok(!/getFloorLabel|floorLabel/.test(CARD_CODE), '🏢 давхар (`getFloorLabel`) буцаж орсон ✗');
  assert.ok(!/🏢/.test(CARD_CODE), '🏢 тэмдэг карт дээр буцаж орсон ✗');
  // ✅ «Ашиглалтанд орсон он» ХЭВЭЭР (хэрэглэгч хасахыг хүсээгүй ✓)
  //    🆕 (101): ⏳ `📅 {buildYear} он` → `{buildYear} он` (emoji ХАСАГДАВ —
  //    жишиг зургийн мэдээллийн мөр нь ЗӨВХӨН текст ✓)
  assert.match(CARD_CODE, /const buildYear = Number\(listing\.build_year\) > 0/,
    '📅 `buildYear` шалгалт алга ✗');
  assert.match(CARD_CODE, /\{buildYear\} он/, '«<он> он» мөр алга ✗');
  assert.ok(!/📅/.test(CARD_CODE), '📅 emoji буцаж орсон ✗ ((101): зөвхөн текст)');
});

t('🚗💻 (85)(105) АВТО-ГАРЧИГ — `autoTitle(listing)` (🚗 машин · 💻 Notebook), нөөц нь `listingTitle`', () => {
  assert.match(CARD_CODE, /const title = autoTitle\(listing\) \|\| listingTitle\(listing\)/,
    '`autoTitle` нөөц гарчиг алга ✗ («Toyota Vellfire, 2017/2026» гарахгүй)');
  assert.ok(!/const isAuto/.test(CARD_CODE), '⏳ (85)-ийн `isAuto` хувьсагч үлдсэн ✗');
  // ⚠️ `carTitle`/`notebookTitle`/`autoTitle` нь `lib/format.js`-д ЦЭВЭР функц (тестлэгддэг ✓)
  assert.match(readSrc('lib/format.js'), /export function carTitle\(attrs\)/,
    '`lib/format.js`-д `carTitle` алга ✗');
  assert.match(readSrc('lib/format.js'), /export function notebookTitle\(attrs\)/,
    '`lib/format.js`-д `notebookTitle` алга ✗');
  assert.match(readSrc('lib/format.js'), /export function autoTitle\(listing\)/,
    '`lib/format.js`-д `autoTitle` алга ✗');
  // ⚠️ Дүрэм нь НЭГ ЭХ СУРВАЛЖ (`lib/locationData.js → hasAutoTitle`)
  assert.match(readSrc('lib/locationData.js'), /export function hasAutoTitle\(section, subtype = ''\)/,
    '`hasAutoTitle` дүрэм алга ✗ (форм ба харагдац зөрөх эрсдэл)');
});

// ---------- ③ ЗУРАГ ДЭЭРХ ТЭМДЭГҮҮД ----------
t('🖼 (85) КАРУСЕЛЬ — 📱 swipe (`snap-x`) + 🖥 ‹ › товч + ЦЭГҮҮД', () => {
  assert.match(CARD_CODE, /data-card-images/, 'scroller-ийн `data-card-images` дэгээ алга ✗');
  assert.match(CARD_CODE, /snap-x snap-mandatory overflow-x-auto/,
    '📱 хурууны гүйлгээ (`snap-x snap-mandatory overflow-x-auto`) алга ✗');
  assert.match(CARD_CODE, /data-card-slide=\{i\}/, 'slide бүрийн `data-card-slide` дэгээ алга ✗');
  assert.match(CARD_CODE, /w-full shrink-0 snap-center object-cover/,
    'slide нь картын БҮТЭН өргөн (`w-full shrink-0`) биш ✗');
  assert.match(CARD_CODE, /\[&::-webkit-scrollbar\]:hidden/,
    'scrollbar НУУГААГҮЙ ✗ (эс бөгөөс зургийн 4:3 харьцаа зөрчигдөнө)');
  // ‹ › — ЗӨВХӨН ≥sm ба ЗӨВХӨН hover/фокус дээр (📱 дээр хурууны гүйлгээ ✓)
  assert.match(CARD_CODE, /data-card-prev/, '‹ товч (`data-card-prev`) алга ✗');
  assert.match(CARD_CODE, /data-card-next/, '› товч (`data-card-next`) алга ✗');
  assert.match(CARD_CODE, /hidden h-8 w-8 -translate-y-1\/2/, 'товч нь ≥sm-д л гарахгүй ✗');
  assert.match(CARD_CODE, /group-hover:opacity-100/, 'товч hover/фокус дээр илрэхгүй ✗');
  // • цэгүүд — зөвхөн 2…5 зурагтай үед (`MAX_CARD_DOTS`)
  assert.match(CARD_CODE, /data-card-dots/, 'цэгүүдийн `data-card-dots` дэгээ алга ✗');
  assert.match(CARD_CODE, /const MAX_CARD_DOTS = 5/, '`MAX_CARD_DOTS` хязгаар алга ✗');
  assert.match(CARD_CODE, /imageCount <= MAX_CARD_DOTS/, 'цэгийн хязгаарын шалгалт алга ✗');
  // ⚠️ Зургийн зум (`group-hover:scale-105`) ХАСАГДСАН (карусельд тохирохгүй ✗)
  assert.ok(!/group-hover:scale-105/.test(CARD_CODE), 'зургийн зум буцаж орсон ✗');
});

t('🖼 (85) ТООЛУУР нь АМЬД (`🖼 2/16`) — `activeIdx`-ээр + БАРУУН ДООД буланд', () => {
  assert.match(CARD_CODE, /imageCount > 1/, 'зургийн тооны хаалт (`imageCount > 1`) алга ✗');
  assert.match(CARD_CODE, /🖼 \{activeIdx \+ 1\}\/\{imageCount\}/,
    'амьд тоолуур (`🖼 {activeIdx + 1}/{imageCount}`) алга ✗');
  assert.match(CARD_CODE, /data-card-counter/, 'тоолуурын `data-card-counter` дэгээ алга ✗');
  assert.match(CARD_CODE, /images\.length/, '`images.length` уншихгүй ✗');
  // ⚠️ Баруун ДЭЭД булан нь /favorites-ийн «Хасах» товчинд чөлөөтэй байх ёстой ✓
  assert.match(CARD_CODE, /absolute bottom-2 right-2 flex h-6/, 'тоо нь баруун доод буланд БИШ ✗');
  assert.ok(!/absolute right-2 top-2 flex h-6/.test(CARD_CODE), 'тоо баруун дээд буланд буцаж орсон ✗');
});

t('🎥 Видео badge — зөвхөн `listing.video_url` үед', () => {
  assert.match(CARD_CODE, /listing\.video_url &&/, 'видео badge-ийн хаалт алга ✗');
  assert.match(CARD_CODE, /🎥 Видео/, '«🎥 Видео» текст алга ✗');
});

t('🏷️ «Зарах / Түрээслэх» badge — ЗӨВХӨН үл хөдлөхөд (`isRealEstate`)', () => {
  assert.match(CARD_CODE, /isRealEstate &&/, 'badge нь `isRealEstate`-ээр хязгаарлагдахгүй ✗');
  assert.match(CARD_CODE, /badge-sell/, '`badge-sell` класс алга ✗');
  assert.match(CARD_CODE, /badge-rent/, '`badge-rent` класс алга ✗');
});


// ---------- ④ ДООД МЕТА МӨР ----------
t('📅 Доод мета мөр: `timeAgo` | `MapPinIcon` хаяг (🕒 emoji ХАСАГДАВ — 🆕 (101); `EyeIcon` views ХАСАГДАВ — (97))', () => {
  assert.match(CARD_CODE, /timeAgo\(listing\.created_at\)/, 'огноо (`timeAgo`) алга ✗');
  assert.match(CARD_CODE, /address &&/, 'хаягийн хаалт алга ✗');
  assert.match(CARD_CODE, /formatAddress\(listing\)/, 'хаяг (`formatAddress`) алга ✗');
  // 🆕 2026-10-10 (96) — хэрэглэгчийн хүсэлт: «📍 26-р хороо үүний өмнөх icon ийг
  //    Газрын зургийн өмнөх шиг болго» ⇒ ⏳ `📍` emoji → `MapPinIcon` SVG.
  //    ⚠️ Дэлгэрэнгүй хуудасныхтай ЯГ ижил икон (`HeaderIcons.jsx`) ✓
  assert.match(CARD_CODE, /<MapPinIcon\b/, 'хаягийн `MapPinIcon` (📍 emoji биш) алга ✗');
  // ⛔ (97): 👁 «үзсэн» тоо карт дээр БАЙХГҮЙ — жишиг сайтын карт зөвхөн
  //    «🕒 огноо | 📍 хаяг» харуулна (тоо нь дэлгэрэнгүй хуудсанд ХЭВЭЭР ✓)
  assert.ok(!/<EyeIcon\b/.test(CARD_CODE),
    '`EyeIcon` карт дээр буцаж орсон ✗ ((97): зөвхөн огноо|хаяг)');
  assert.ok(!/\{views\}/.test(CARD_CODE), '`{views}` карт дээр буцаж орсон ✗ ((97): хасагдсан)');
  // ⛔ РЕГРЕСС: emoji буцаж орвол ✗ (SVG байх ЁСТОЙ — OS бүрд ижил харагдана)
  assert.ok(!/📍/.test(CARD_CODE), '📍 emoji буцаж орсон ✗ ((96): SVG байх ЁСТОЙ)');
  assert.ok(!/👁/.test(CARD_CODE), '👁 emoji буцаж орсон ✗ ((96): SVG байх ЁСТОЙ)');
  // ⚠️ Мета мөр CDP-д `data-listing-meta`-аар олддог (класс мөр биш) ✓
  assert.match(CARD_CODE, /data-listing-meta/, 'мета мөрний `data-listing-meta` selector алга ✗');
  // 🆕 (101) ⏳ `🕒 {timeAgo(...)}` emoji ХАСАГДАВ — жишиг зургийн мета мөр нь
  //    «4 минутын өмнө | Улаанбаатар — Хан-Уул — Viva city» (дүрсГҮЙ) ✓
  assert.ok(!/🕒/.test(CARD_CODE), '🕒 emoji буцаж орсон ✗ ((101): зөвхөн текст)');
  // 🆕 (101) ХАЯГ нь `truncate`-ГҮЙ — БҮТЭН харагдана, урт үедээ мөр таслана ✓
  //    (⏳ хаяг «2-р хороо, Баянгол, Ул…» гэж тайрагддаг байв ✗)
  assert.match(CARD_CODE, /order-last w-full break-words/, 'хаягны мөр таслалт (`break-words`) алга ✗');
  assert.ok(!/order-last w-full truncate/.test(CARD_CODE),
    'хаяг буцаж `truncate` болов ✗ ((101): бүтэн харагдах ЁСТОЙ)');
});

t('❤️/🤍 нь favorite toggle — `preventDefault` + `stopPropagation` (Link доторх товч)', () => {
  assert.match(CARD_CODE, /toggleFavorite\(listing\.id\)/, '`toggleFavorite` дуудахгүй ✗');
  assert.match(CARD_CODE, /e\.preventDefault\(\)/, 'карт руу шилжихээс сэргийлэхгүй ✗');
  assert.match(CARD_CODE, /e\.stopPropagation\(\)/, '`stopPropagation` алга ✗');
  assert.match(CARD_CODE, /isFav \? 'text-red-600' : 'text-gray-900'/,
    'зүрхний идэвхтэй/идэвхгүй өнгө (`text-red-600`/`text-gray-900`) алга ✗');
  // 🆕 (101) ⏳ `{isFav ? '❤️' : '🤍'}` emoji → `HeartIcon` SVG (`filled={isFav}`) —
  //    жишиг зургийн зүрхэн нь нимгэн ХАР зураастай; emoji нь OS бүрд өөр/өөрийн
  //    өнгөтэй зурагдаж, `text-*`-г дагадаггүй байв ✗
  assert.match(CARD_CODE, /<HeartIcon\b[^>]*filled=\{isFav\}/, '`<HeartIcon filled={isFav} />` алга ✗');
  assert.ok(!/❤️|🤍/.test(CARD_CODE), '❤️/🤍 emoji буцаж орсон ✗ ((101): `HeartIcon` байх ЁСТОЙ)');
});

t('🛡 /favorites-ийн «Хасах» товчтой мөргөлдөхгүй — мета мөр БҮХ дэлгэцэд `pr-20` (🆕 (86))', () => {
  assert.match(CARD_CODE, /pr-20 pt-0\.5 text-\[13px\] text-gray-500/, 'мета мөрний `pr-20` нөөц алга ✗');
  // ⚠️ (86): «Хасах» товч БҮХ дэлгэцэд баруун ДОО буланд шилжсэн ⇒ `sm:pr-0`
  //    (desktop-д нөөцийг арилгах) ХАСАГДАВ — эс бөгөөс товч ТЕКСТ дээр сууна ✗
  assert.ok(!/sm:pr-0/.test(CARD_CODE), '`sm:pr-0` буцаж орсон ✗ (desktop-д товч текст дарах болно)');
});

// ---------- ⑤ ХАДГАЛАГДСАН ДҮРМҮҮД (регресс) ----------
t('① «Үнэ тохирно» карт дээр ГАРАХГҮЙ — `hasRealPrice` хаалт + `negotiableNote` ОРУУЛААГҮЙ', () => {
  assert.match(CARD_CODE, /hasRealPrice\(listing\) &&/, 'үнийг `hasRealPrice`-ээр хаахгүй ✗');
  assert.ok(!/negotiableNote/.test(CARD_CODE), '`negotiableNote` карт дээр орох ёсгүй ✗');
  assert.ok(!/NEGOTIABLE_PRICE_LABEL/.test(CARD_CODE), '«Үнэ тохирно» шошго карт дээр бичигдэх ёсгүй ✗');
});

t('④ Карт нь НЭГ `<Link>` — дотор нь өөр `<Link>` БАЙХГҮЙ', () => {
  const links = CARD_CODE.match(/<Link\b/g) || [];
  assert.equal(links.length, 1, `карт дотор ${links.length} <Link> байна (1 байх ёстой) ✗`);
});

t('🧩 🔧 зургийн класс нь placeholder-т `getPropertyIcon` хэвээр (зураггүй зар эвдрэхгүй)', () => {
  assert.match(CARD_CODE, /getPropertyIcon\(listing\.property_type, listing\.section\)/,
    'зураггүй үеийн icon (`getPropertyIcon`) алга ✗');
});

// ---------- ⑥ HomeClient-тэй холбоос ----------
t('🔗 HomeClient нь `attrsLine` (formatAttrsLine) ба `author`-ыг дамжуулна', () => {
  assert.match(HOME, /<ListingCard/, 'HomeClient нь `ListingCard` render хийхгүй ✗');
  assert.match(HOME, /attrsLine=\{formatAttrsLine\(/, '`attrsLine` дамжуулахгүй ✗');
  assert.match(HOME, /author=\{authors\[l\.user_id\]\}/, '`author` дамжуулахгүй ✗');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);

