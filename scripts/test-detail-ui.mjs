// ============================================================
// test-detail-ui.mjs — 📋 ЗАРЫН ФОРМ + ДЭЛГЭРЭНГҮЙ ХУУДСАНЫ ГЭРЭЭ (2026-10-07)
//
// 🎯 ХЭРЭГЛЭГЧИЙН 4 ХҮСЭЛТ:
//   ① «Зөвхөн Ажлын зар дээр Зураг оруулах хэсгийг болиулах»
//      ⇒ 💼 `jobs` хэсэгт 🖼 Зураг блок БҮРЭН ХАРАГДАХГҮЙ (`allowImages`)
//   ② «бүх хэсэгт Зар оруулах үед Нэр оруулдаг байх … байгууллагынхаа өмнөөс
//      зар оруулж байвал зарын мэдээлэл дээр өөрийх нь нэр нь гарах нь
//      зохимжгүй юм» ⇒ формд 👤 «Нэр» талбар (анхдагч нь хэрэглэгчийн нэр),
//      дэлгэрэнгүйд `contact_name` (форм дээр бичсэн нэр) ТҮРҮҮЛНЭ
//   ③ «хэрэглэгчийн Profile зургийг … тэгш өнцөгтөөр харуулаарай»
//      ⇒ `Avatar` нь `rounded-full` БИШ `rounded-lg`
//   ④ «газрын зургийг байж Жишиг сайт шиг харуулдаг байя, Бүх зар дээр»
//      ⇒ дэлгэрэнгүйд «Байршил» гарчигтай газрын зураг ҮРГЭЛЖ
//   ⑤ 2026-10-08 (61)(62): «Тайлбар» урт текст, нийтлэгчийн карт (бүтэн нэр),
//      «📋 N идэвхтэй зар» — ТУСДАА ЛИНК (⑥⑦ хэсэг)
//   ⑥ 2026-10-08 (64): зарын эзэний PROFILE ЗУРАГ нь картын ХАМГИЙН ДЭЭД
//      талд, ТУСДАА мөрөнд, ГОЛЛУУЛЖ + `size={44}` → `size={64}` (⑧ хэсэг)
//   ⑦ 2026-10-08 (66): аватар `size={64}` → **`size={96}`** (хэрэглэгчийн
//      хүсэлт: «жаахан томруулаад өгөөч») ⇒ `size={64}` (мөн 44/120)
//      РЕГРЕСС ХОРИГ (⑥⑧ хэсэг)
//   ⑧ 2026-10-09 (87): «зарын detail буюу зар луу ороход бас иим болгож, бүх
//      саарал өнгийг үгүй хиймээр байна» ⇒ ⏳ (83)-ийн `bg-gray-100`/`bg-gray-50`
//      дүүргэлт БҮГД ХАСАГДАВ, хэсгүүд нь 1px дээд зураастай ХАЙРЦАГГҮЙ хэв
//      болов; холбоо барих/ипотекийн хайрцаг ЦАГААН (⑨ хэсэг)
//   ⑨ 2026-10-09 (88): «энэ явуулсан зургийг дуурайж дизайныг сайжруул» ⇒
//      жишиг сайтын хэвээр ЗАР ОРУУЛАГЧИЙН ГАРЧИГ нь breadcrumb-ийн доор
//      ХАРАГДАХ H1 (ТОМ БОЛД) болов; толгой ба мобайл доод цэс ч ЦАГААН (⑩)
//   ⑪ 2026-10-10 (96): «📍 26-р хороо үүний өмнөх icon ийг Газрын зургийн өмнөх
//      шиг болго» · «🔖 Зарын дугаарыг өмнөх icon ийг үгүй хий» · «👁 3 үзсэн
//      -ийг icon ийг соль (Icon явуулав, өнгийг нь тодруулаарай)» · «Зарын
//      дэлгэрэнгүй хэсгийн 🏷️ Үйлдвэрлэгч: гэх мэтийн бүх icon ийг байхгүй
//      болго, хэрэггүй» ⇒ ① хаягны 📍 → `MapPinIcon` SVG ② зарын дугаарын 🔖
//      ХАСАГДАВ ③ 👁 → `EyeIcon` SVG (өнгө ТОД) ④ «Зарын дэлгэрэнгүй»
//      хүснэгтээс icon БҮГД ХАСАГДАВ (`{f.label}`; ⚠️ `getAttrRows` ХЭВЭЭР) (⑪)
//
// ⚠️ Эдгээр нь БҮГД ХАРАГДАЦ/UI-ийн гэрээ — DB/query/migration 0 ✓
//
// ХАМРАХ ХҮРЭЭ (DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node):
//   `components/AddListingClient.jsx` · `components/ListingDetailClient.jsx`
//   · `components/Avatar.jsx` · `components/MapView.jsx`
//   · `components/HeaderIcons.jsx` · `components/ListingCard.jsx` (🆕 (96))
//
// АЖИЛЛУУЛАХ:  npm run test:detail-ui
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — тайлбар биш БОДИТ дүрмийг л шалгана ✓ */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n📋 Зарын форм + дэлгэрэнгүй хуудсан — 4 хүсэлтийн гэрээ\n');

const FORM = readSrc('components/AddListingClient.jsx');
const FORM_CODE = codeOnly(FORM);
const DET = readSrc('components/ListingDetailClient.jsx');
const DET_CODE = codeOnly(DET);
const AVATAR = readSrc('components/Avatar.jsx');
const AVATAR_CODE = codeOnly(AVATAR);
const MAP = readSrc('components/MapView.jsx');

// ---------- ① 💼 «Ажлын зар» дээр ЗУРАГ ХАРАГДАХГҮЙ ----------
t('① 💼 `allowImages` нь зөвхөн `jobs`-д `false` (`section !== \'jobs\'`) ✓', () => {
  assert.match(FORM_CODE, /const allowImages = \(form\.section \|\| 'real-estate'\) !== 'jobs'/,
    '`allowImages` тодорхойлолт алга/буруу ✗');
});

t('① 🖼 `media-images` блок нь `{allowImages && ( … )}`-д БҮРХЭГДСЭН ✓', () => {
  assert.match(FORM_CODE, /\{allowImages && \(\s*\n\s*<div data-step-block="media-images"/,
    '`media-images` блок нь `allowImages`-д бүрхэгдээгүй ✗');
  assert.ok(FORM_CODE.includes('Зураг оруулах'), '`Зураг оруулах` гарчиг алга ✗');
});

t('① 📦 Хадгалах үед `images` нь `allowImages`-аар хоослогдоно (jobs → []) ✓', () => {
  assert.match(FORM_CODE, /images: allowImages \? \[\.\.\.existingImages, \.\.\.uploaded\] : \[\]/,
    'payload-д `images` нөхцөлтэй болоогүй ✗');
});

// ---------- ② 👤 «Нэр» талбар (бүх хэсэгт) ----------
t('② 👤 Формд `<label>Нэр</label>` талбар ХАРАГДАНА (коммент БИШ) ✓', () => {
  assert.ok(FORM_CODE.includes('<label>Нэр</label>'),
    'формд «Нэр» label алга (комментод байж болзошгүй) ✗');
  assert.match(FORM_CODE, /value=\{form\.contactName\}/,
    '`form.contactName` руу холбогдсон input алга ✗');
  assert.match(FORM_CODE, /onChange=\{\(e\) => set\('contactName', e\.target\.value\)\}/,
    '`contactName` onChange алга ✗');
});

t('② 👤 `emptyForm()` нь нэвтэрсэн хэрэглэгчийн нэрээр бөглөнө (`contactName: displayName`) ✓', () => {
  assert.match(FORM_CODE, /contactName: displayName \|\| ''/,
    '`emptyForm` нь `contactName: displayName` БИШ ✗');
});

t('② 🏢 Дэлгэрэнгүйд `contact_name` ТҮРҮҮЛНЭ (формд бичсэн нэр → профайлын нэр) ✓', () => {
  // 🆕 2026-10-08 (71): «Профайл нэрээ зар дээр гаргах уу? → Үгүй»
  //    (`listing.show_name === false`) үед нэр нь «Холбоо барих хүн» болно ⇒
  //    `sellerName` нь ОДОО `showName ? (contact_name || displayName) : …` —
  //    ⚠️ Дараалал (contact_name → displayName) ХӨНДӨӨГДӨӨГҮЙ ✓
  assert.match(DET_CODE, /const showName = listing\.show_name !== false/,
    '`show_name` шалгалт алга ✗');
  assert.match(DET_CODE, /const sellerName = showName\s*\n\s*\? \(listing\.contact_name \|\| \(author && author\.displayName\) \|\| 'Холбоо барих хүн'\)\s*\n\s*: 'Холбоо барих хүн'/,
    '`sellerName` дараалал нь `contact_name → displayName` БИШ ✗');
  assert.ok(!DET_CODE.includes('(author && author.displayName) || listing.contact_name'),
    'хуучин `displayName || contact_name` дараалал буцсан ✗');
});

// ---------- ③ 👤 Profile зураг — ТЭГШ ӨНЦӨГТ ----------
t('③ 🖼 `Avatar` нь `rounded-lg` (тэгш өнцөгт), `rounded-full` (дугуй) БАЙХГҮЙ ✓', () => {
  assert.ok(!AVATAR_CODE.includes('rounded-full'),
    '`Avatar`-д `rounded-full` (дугуй) үлдсэн ✗');
  const count = (AVATAR_CODE.match(/rounded-lg/g) || []).length;
  assert.ok(count >= 2, `Avatar-д "rounded-lg" 2 газар (img + placeholder) байх ёстой ✗ (${count})`);
});


// ---------- ④ 🗺 Газрын зураг — БҮХ зарт (жишиг сайт хэв) ----------
t('④ 🗺 Дэлгэрэнгүйд «Байршил» гарчигтай газрын зураг ҮРГЭЛЖ ✓', () => {
  assert.ok(DET_CODE.includes("Байршил:{' '}"),
    '«Байршил» гарчиг алга ✗');
  assert.ok(DET_CODE.includes('data-component="ListingMap"'),
    '`data-component="ListingMap"` дэгээ алга ✗');
  assert.match(DET_CODE, /<MapView listings=\{\[mapListing\]\} \/>/,
    '`<MapView listings={[mapListing]} />` алга ✗');
});

t('④ 🗺 Нөөц төв: `mapCenterFor(listing)` (солбицолгүй зар ч газрын зурагтай) ✓', () => {
  assert.match(DET, /import \{ mapCenterFor \} from '\.\.\/lib\/locationGeo\.mjs'/,
    '`mapCenterFor` импорт алга ✗');
  assert.match(DET_CODE, /const mapPoint = mapCenterFor\(listing\)/,
    '`mapPoint = mapCenterFor(listing)` алга ✗');
});

t('④ 🗺 Хуучин БАРУУН баганын нөхцөлт газрын зураг БУЦАХГҮЙ (ЯГ 1 `<MapView`) ✓', () => {
  assert.ok(!DET_CODE.includes('MapView listings={[listing]}'),
    'хуучин sidebar газрын зураг (`MapView listings={[listing]}`) үлдсэн ✗');
  assert.equal((DET_CODE.match(/<MapView/g) || []).length, 1,
    '`<MapView` нь ЯГ 1 байх ёстой ✗');
});

t('④ 🎯 `MapView` — ГАНЦ пинд `fitBounds` БИШ тогтмол зум (`SINGLE_ZOOM`) ✓', () => {
  assert.match(MAP, /const SINGLE_ZOOM = 15/,
    '`SINGLE_ZOOM` тогтмол алга ✗');
  assert.match(MAP, /if \(points\.length === 1\) \{[\s\S]*?map\.setView\(\[points\[0\]\.latitude, points\[0\]\.longitude\], SINGLE_ZOOM\)/,
    'ганц пинд `setView(…, SINGLE_ZOOM)` алга ✗');
  assert.ok(MAP.includes('else if (markers.length)'),
    'олон пинд `fitBounds` салбар алга ✗');
  assert.ok(MAP.includes('filter((l) => l.latitude && l.longitude)'),
    'MapView-ийн солбицлын шүүлт өөрчлөгдсөн ✗');
});

// ---------- ⑥ 📏 Урт текст + нийтлэгчийн карт (2026-10-08 (61)) ----------
t('⑥ 📝 «Тайлбар» нь `break-words` — ЗАЙГҮЙ урт үг хайрцгаас ХЭТРЭХГҮЙ ✓', () => {
  /** ⚠️ ХЭРЭГЛЭГЧИЙН ГОМДОЛ: «Тайлбарын урт текст хайрцгаас хэтэрч гардаг».
   *  CDP хэмжилт (1280px, 892 тэмдэгт зайгүй үгтэй зар): өмнө нь `<p>`-ээс
   *  **6856px** хэтэрч, ХУУДАСНЫ хэвтээ гүйлт **6418px** байв ✗ → `break-words`
   *  (`overflow-wrap: break-word`)-оор 0 болов ✓
   *  ⚠️ `whitespace-pre-line` (мөр таслалт) ХӨНДӨӨГДӨӨГҮЙ ✓
   *  🆕 (104): `<p>` нь ч мөн `max-w-[840px]` — ЗУРАГ ба ТАЙЛБАР нэг өргөн,
   *  нэг зүүн ирмэгтэй (хэрэглэгч: «align the advertisement image and the
   *  description») ✓ */
  assert.match(DET_CODE, /<p className="max-w-\[840px\] whitespace-pre-line break-words text-\[15px\] leading-\[1\.8\] text-gray-600">\{listing\.description\}<\/p>/,
    'Тайлбарын `<p>`-д `break-words`/`max-w-[840px]` алга ✗ (урт үг хайрцгаас хэтэрнэ)');
});

t('⑥ 👤 Нийтлэгч: аватар `size={96}` (тусдаа мөрөнд — ⚠️ 120px шиг хэт том БИШ) ✓', () => {
  /** ⚠️ 120px аватар нь 350px-ийн баганын картыг хагас эзэлж, «✅ Утсаар
   *  баталгаажсан»/«Элссэн огноо» мөрүүдийг 2 мөр болгон эвдэж байв ✗
   *  (CDP: мөр 144px → 96px, карт 409px → 361px)
   *  ⏳ (61): `size={44}` · (64): `size={64}` байв ⇒ 🆕 (66) хэрэглэгч:
   *  «жаахан томруулаад өгөөч» ⇒ `size={96}` (аватар нь ОДОО тусдаа мөрөнд
   *  тул картын өргөн 300px хэвээр, өндөр 176 → 208px) ✓ */
  assert.ok(!DET_CODE.includes('size={120}'), '`size={120}` (хэт том аватар) үлдсэн ✗');
  assert.equal((DET_CODE.match(/name=\{sellerName\} size=\{96\}/g) || []).length, 2,
    'нийтлэгчийн 2 салбарт (user_id-тай / user_id-гүй) `size={96}` байх ёстой ✗');
  assert.ok(!DET_CODE.includes('size={64}'),
    '⏳ (64)-ийн `size={64}` үлдсэн ✗ (66: 96px — аватар тусдаа мөрөнд)');
  assert.ok(!DET_CODE.includes('size={44}'),
    '⏳ (61)-ийн `size={44}` үлдсэн ✗ (66: 96px — аватар тусдаа мөрөнд)');
});

t('⑥ 👤 Нийтлэгчийн НЭР `truncate` БИШ `break-words` — карт дотроо бүтэн харагдана ✓', () => {
  assert.ok(DET_CODE.includes('<span className="min-w-0 break-words">{sellerName}</span>'),
    '`user_id`-тай салбарын нэр `break-words` биш ✗');
  assert.ok(!/<div className="truncate text-base font-semibold text-gray-800">/.test(DET_CODE),
    '`user_id`-гүй салбарын нэр `truncate` (тайрагддаг) хэвээр ✗');
  assert.ok(DET_CODE.includes('<div className="break-words text-base font-semibold text-gray-800">'),
    '`user_id`-гүй салбарын нэр `break-words` болоогүй ✗');
});

// ---------- ⑦ 🔗 «📋 N идэвхтэй зар» — ТУСДАА ЛИНК (2026-10-08 (62)(63)) ----------
t('⑦ 🔗 «📋 N идэвхтэй зар» — ТУСДАА ЛИНК (линк шиг ХАРАГДАНА) ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Зар дээр нийтлэгчийн мэдээллийн карт дээр “Зарын тоо зар
   *  нийтэлсэн” гэж харагдаж байгаа. Энэ хэсгийг нь Link болгож харагдуул. Гэхдээ
   *  текстийг нь “Зарын тоо идвэхтэй зар” гэж зас. Карыг нь тэр чигээр нь link болгож
   *  харагдуулахгүй».
   *  ⏳ (63) ЗАСВАР: «Зарын тоо:» гэсэн УГТВАР ХАСАГДАВ — зүгээр л «📋 N идэвхтэй зар» ✓
   *  ⏳ Өмнө нь саарал энгийн текст байв (`text-xs text-gray-500`) ⇒ линк гэдэг нь
   *  мэдэгддэггүй байв ✗ → одоо `text-primary underline underline-offset-2` ✓ */
  assert.ok(DET_CODE.includes('<span>📋 {sellerStats.total} идэвхтэй зар</span>'),
    '«📋 N идэвхтэй зар» текст алга ✗');
  assert.ok(DET_CODE.includes('<span>📋 идэвхтэй зар</span>'),
    'тоо тодорхойгүй үеийн «📋 идэвхтэй зар» нөөц текст алга ✗');
  // 🆕 (63): «Зарын тоо:» гэсэн УГТВАР БАЙХГҮЙ — зөвхөн ТОО + «идэвхтэй зар» ✓
  assert.ok(!DET_CODE.includes('Зарын тоо'),
    '⏳ (62)-ийн «Зарын тоо:» угтвар үлдсэн ✗ (63: зүгээр л тоог бичих ёстой)');
  assert.ok(!DET_CODE.includes('зар нийтэлсэн'),
    '⏳ «{N} зар нийтэлсэн» хуучин текст үлдсэн ✗ (шинэ нь «📋 N идэвхтэй зар»)');
  assert.match(DET_CODE,
    /className="mt-2 flex max-w-full flex-wrap items-center justify-center gap-x-2 text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary"/,
    '«Зарын тоо» мөр нь ЛИНК ШИГ харагдахгүй (`text-primary`/`underline` алга) ✗');
  assert.equal((DET_CODE.match(/href=\{`\/sellers\/\$\{listing\.user_id\}`\}/g) || []).length, 2,
    'нийтлэгчийн карт дээр `/sellers/<user_id>` руу 2 ЛИНК (толгой + «идэвхтэй зар») байх ёстой ✗');
});

t('⑦ 🔗 «идэвхтэй зар» линк нь толгойн линкээс ГАДНА (линк дотор линк БАЙХГҮЙ) ✓', () => {
  /** ⚠️ HTML-д `<a>` дотор `<a>` ХОРИОТОЙ ⇒ нийтлэгчийн картын хүрээ нь ОДОО `<div>`
   *  (`group` + `hover:bg-primary-light` тэндээ үлдсэн ⇒ КАРТЫН харагдац хэвээр), 2
   *  линк нь ЗЭРЭГЦЭЭ (ах дүү) элемент болно ✓ */
  const i = DET_CODE.indexOf('📋 идэвхтэй зар');
  assert.ok(i > 0, '«идэвхтэй зар» мөр олдсонгүй ✗');
  // ⚠️ «идэвхтэй зар» линкний өөрийнх нь `<Link` нээлтийг хасч, ТҮҮНЭЭС ӨМНӨХ кодонд
  //    линк нээгдээгүй (буюу сүүлийн `<Link` аль хэдийн `</Link>`-ээр хаагдсан) эсэхийг шалгана ✓
  const frag = DET_CODE.slice(0, i);
  const prev = frag.slice(0, frag.lastIndexOf('<Link'));
  assert.ok(prev.lastIndexOf('</Link>') > prev.lastIndexOf('<Link'),
    '«идэвхтэй зар» линк нь өөр ЛИНК ДОТОР байна (nesting) ✗');
  assert.ok(DET_CODE.includes('className="group rounded-lg p-3 transition hover:bg-primary-light"'),
    'нийтлэгчийн картын хүрээ `<div>` (линк БИШ) болоогүй ✗');
  assert.ok(!DET_CODE.includes('bg-gray-50 p-3 transition hover:bg-primary-light'),
    '⏳ (83)-ийн `bg-gray-50` дүүргэлт буцаж орсон ✗ ((87): хайрцаг ХАЙРЦАГГҮЙ)');
  assert.ok(DET_CODE.includes('className="relative flex flex-col items-center gap-2 text-center"'),
    'толгойн линк нь (64)-ийн ГОЛЛУУЛСАН баганын класс БИШ ✗');
});

// ---------- ⑧ 👤 ЗАРЫН ЭЗЭН — АВАТАР КАРТЫН ДЭЭД ТАЛД, ГОЛЛУУЛЖ (2026-10-08 (64)) ----------
t('⑧ 👤 Зарын эзэний зураг: картын ДЭЭД талд, ТУСДАА мөрөнд, ГОЛЛУУЛЖ (96px) ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Зарын эзэний Profile зургийг картых нь дээд талд,
   *  жаахан томруулаад тавиад өгөөч» ⇒ толгойн линк нь БОСОО ГОЛЛУУЛСАН
   *  багана болов (`flex flex-col items-center text-center`):
   *  ① [Avatar 96px] → ② [нэр + ✅ badge] → ③ [✅ Утсаар баталгаажсан · Элссэн
   *  огноо] ⇒ аватар нь картын ХАМГИЙН ДЭЭД талд, бусдын мэдээлэл ДООР нь ✓
   *  ⚠️ Линк нь ХЭВЭЭР (аватар ч дарж болно) — дотоод блок `min-w-0 flex-1` →
   *  `w-full min-w-0` (босоо баганад `flex-grow` утгагүй) ✓ */
  assert.ok(DET_CODE.includes('className="relative flex flex-col items-center gap-2 text-center"'),
    'толгойн линк нь босоо голлуулсан багана БИШ ✗');
  // ⚠️ ДАРААЛАЛ: аватар (96px) нь НЭРийн мөрөөс ӨМНӨ (дээр) байх ёстой ✓
  const av = DET_CODE.indexOf('name={sellerName} size={96} />');
  const nm = DET_CODE.indexOf('justify-center gap-1.5 text-base font-semibold');
  assert.ok(av > 0 && nm > av,
    'аватар нь нэрийн мөрөөс ӨМНӨ (картын дээд талд) байх ёстой ✗');
  // ⚠️ Аватар нь толгойн линкийн ЭХНИЙ элемент (`relative` линк дотор) ✓
  //    🆕 (103): тэмдэглэгээ нь `AdvertiserCard` компонент руу шилжсэн тул
  //    мөрийн ЭХНИЙ хоосон зай тогтмол БИШ — `\s*`-ээр л шалгана ✓
  assert.match(DET_CODE, /name=\{sellerName\} size=\{96\} \/>\s*<div className="w-full min-w-0">/,
    'аватар нь толгойн линкийн эхний элемент (96px) БИШ ✗');
  assert.ok(DET_CODE.includes('className="flex items-center justify-center gap-1.5 text-base font-semibold'),
    'нэрийн мөр ГОЛЛУУЛСАН БИШ ✗');
  assert.ok(DET_CODE.includes('justify-center gap-x-2 text-xs text-gray-500'),
    '«✅ Утсаар баталгаажсан · Элссэн огноо» мөр ГОЛЛУУЛСАН БИШ ✗');
  // ⚠️ `user_id`-гүй салбар ч ИЖИЛ хэв — картын харагдац нэгэн жигд ✓
  assert.ok(DET_CODE.includes('className="flex flex-col items-center gap-2 rounded-lg p-3 text-center"'),
    '`user_id`-гүй салбарын карт ИЖИЛ босоо голлуулсан хэв БИШ ✗');
  // ⚠️ «📋 N идэвхтэй зар» линк ч КАРТЫН ГОЛД — задаргаа тэгш харагдана ✓
  //    (линк өөрөө/өнгө/зураас/`href`/`title` ХЭВЭЭР — (62)(63)-ын гэрээ ✓)
  assert.ok(DET_CODE.includes('className="mt-2 flex max-w-full flex-wrap items-center justify-center gap-x-2 text-xs font-semibold'),
    '«📋 N идэвхтэй зар» линк ГОЛЛУУЛСАН БИШ ✗');
  // ⚠️ «›» нь баруун дээд буланд (`absolute`) — мөрийн өндрийг уртасгахгүй ✓
  assert.ok(DET_CODE.includes('className="absolute right-0 top-0 text-lg text-gray-300 transition group-hover:text-primary"'),
    '«›» нь `absolute right-0 top-0` БИШ ✗');
});

// ---------- ⑨ 🎨 «БҮХ СААРАЛ ӨНГИЙГ ҮГҮЙ ХИЙ» (2026-10-09 (87)) ----------
t('⑨ 🎨 Дэлгэрэнгүй хуудсанд СААРАЛ (крем) ДҮҮРГЭЛТ огт байхгүй ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «зарын detail буюу зар луу ороход бас иим болгож,
   *  бүх саарал өнгийг үгүй хиймээр байна».
   *  ⇒ ⏳ (83)-ийн `bg-gray-100` (крем #F4F1EA — цагаан дэвсгэрээс бараг
   *  ялгагдахгүй «саарал») дүүргэлт нь галерей · 🎥 видео · 📋 шинж чанар ·
   *  📝 тайлбар · 🗺 газрын зураг · 💰 холбоо барих хайрцаг · 🏦 ипотек ·
   *  👤 нийтлэгчийн хайрцаг · 📱 утасны мөрийн хайрцгуудаас БҮГД ХАСАГДАВ ✓
   *  ⚠️ `bg-red-50` (алдааны мөр) · `bg-primary-light` (hover) · `bg-black`
   *     ба `bg-white/85`/`bg-white/90` (зургийн ‹ › товч ба ▶️ тоглуулагч) нь
   *     СААРАЛ БИШ (семантик/hover/контрол) тул ХӨНДӨӨГДӨӨГҮЙ ✓ */
  const grays = (() => {
    /*  🆕 (102) ГАНЦ ГҮЙЛГЭЭ — МЕТА МӨРИЙН ❤️/↪ PILL: хэрэглэгчийн хавсаргасан
        жишиг зургийн ДҮҮРГЭЛТТЭЙ товч (хэмжсэн `#F2F2F3` ⇒ манай Sandstone
        `bg-gray-100` = `#F4F1EA`; хэмжсэн өндөр 44px = `h-11`) нь «хайрцаг/
        панель» БИШ — товч тул дүүргэлттэй байх ЁСТОЙ ✓. (87)-ийн хориг нь
        галерей · 🎥 видео · 📋 шинж чанар · 📝 тайлбар · 🗺 газрын зураг ·
        💰 холбоо барих ба 👤 нийтлэгчийн хайрцгуудад ХЭВЭЭР ✓
        ⚠️ Иймд ЗӨВХӨН энэ pill-ийн классыг хасаад үлдсэнийг шалгана */
    const META_PILL = 'inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-gray-100 px-4 font-semibold tabular-nums text-gray-900 transition hover:bg-gray-200';
    assert.ok(DET_CODE.includes(META_PILL), '❤️ pill-ийн (102) жишиг класс алга ✗');
    return DET_CODE.split(META_PILL).join('').match(/bg-gray-\d+/g) || [];
  })();
  assert.deepEqual(grays, [], `саарал дүүргэлт үлдсэн: ${grays.join(', ')} ✗`);
  // ⚠️ Хэсгүүд нь ХАЙРЦАГГҮЙ — оронд нь 1px дээд зураас + `pt-6` (жишиг сайт хэв):
  //    🎥 видео · 📋 шинж чанар · 📝 тайлбар · 🗺 газрын зураг — ЯГ 4 хэсэг ✓
  assert.equal((DET_CODE.match(/mt-6 border-t border-gray-200 pt-6/g) || []).length, 4,
    'дэлгэрэнгүй хуудасны 4 хэсэг нь «хайрцаггүй + 1px дээд зураас» хэв БИШ ✗');
  // ⚠️ Структурын хайрцаг 2 нь ЦАГААН болов (саарал дүүргэлт + сүүдэр арилав)
  assert.ok(DET_CODE.includes('className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6"'),
    'холбоо барих хайрцаг `bg-white` БИШ ✗');
  assert.ok(DET_CODE.includes('className="group overflow-hidden rounded-xl border border-gray-200 bg-white"'),
    '🏦 ипотекийн хайрцаг `bg-white` БИШ ✗');
  assert.ok(!DET_CODE.includes('shadow-card sm:p-6'),
    '⏳ (83)-ийн `shadow-card` буцаж орсон ✗ ((87): хайрцаг нь сүүдэргүй)');
});

// ---------- ⑩ 🏷️ ЗАРЫН ГАРЧИГ — ХАРАГДАХ H1 (2026-10-09 (88)) ----------
t('⑩ 🏷️ Дэлгэрэнгүй хуудсанд ЗАРЫН ГАРЧИГ нь ХАРАГДАХ H1 болов ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «энэ явуулсан зургийг дуурайж дизайныг сайжруул»
   *  ⇒ ЖИШИГ САЙТЫН ХЭВ: breadcrumb-ийн ЯГ ДОР — зар оруулагчийн ӨӨРИЙН бичсэн
   *  гарчиг (`listings.title` — 0027) ТОМ БОЛД (`text-xl` → `sm:text-2xl`).
   *
   *  ⚠️ (2026-10-01)-д ХАРАГДАХ H1 ХАСАГДСАН шалтгаан нь ТУХАЙН зарын гарчиг
   *  БИШ — `getPropertyTypeLabel`-ийн УТГА (ж: «🚗 Суудлын машин») нь
   *  breadcrumb-ийн СҮҮЛИЙН мөртэй ЯГ давхардаж байсан тул ✗. Зар оруулагчийн
   *  гарчиг нь ТУСДАА мэдээлэл ⇒ ГАРГАВАЛ зөв ✓
   *  ⚠️ Гарчиг БАЙХГҮЙ (0027-оос өмнөх 782 хуучин зар) үед H1 нь ⏳ хэвээр
   *  `sr-only` ⇒ хуудас бүрд H1 ЯГ НЭГ (SEO/screen reader-ийн гэрээ ✓) */
  // ① НЭГ ЭХ СУРВАЛЖ — `lib/format.js → listingTitle` (карттай ЯГ ижил) ✓
  assert.ok(/import \{[^}]*\blistingTitle\b[^}]*\} from '\.\.\/lib\/format'/.test(DET_CODE),
    '`listingTitle` нь `../lib/format`-аас импортлогдоогүй (гарчиг 2 газар зөрөх эрсдэл) ✗');
  // 🆕 (97)(105) 🚗/💻 АВТО нөөц гарчиг — хэрэглэгчийн хүсэлт: «Only car detail
  //    card like photo, it's head is category name Toyota Harrier, Its Brand and
  //    Model then manufactured date/Imported year» + 🆕 (105) «For laptops, the
  //    title should be based on “Screen size, CPU, and RAM”» ⇒ аттрибутаас
  //    автоматаар бүтнэ (форм дээр талбар БАЙХГҮЙ — `hasAutoTitle`)
  assert.ok(DET_CODE.includes('const adTitle = autoTitle(listing) || listingTitle(listing);'),
    '🚗💻 АВТО-гарчиг (`autoTitle`) алга ✗ («Toyota Harrier, 2017/2024» гарахгүй)');
  assert.ok(/import \{[^}]*\bautoTitle\b[^}]*\} from '\.\.\/lib\/format'/.test(DET_CODE),
    '`autoTitle` нь `../lib/format`-аас импортлогдоогүй ✗');
  assert.ok(!/const isAuto/.test(DET_CODE),
    '⏳ (97)-ийн `isAuto` хувьсагч үлдсэн ✗ (одоо `autoTitle` нэг эх сурвалж)');
  // ② H1 нь `data-listing-title` тэмдэгтэй ба ЯГ НЭГ удаа ✓
  assert.ok(DET_CODE.includes('data-listing-title'),
    '`h1[data-listing-title]` тэмдэг алга (CDP барих боломжгүй) ✗');
  assert.equal((DET_CODE.match(/<h1/g) || []).length, 1,
    'H1 нь ЯГ НЭГ байх ёстой (SEO) ✗');
  // ③ Гарчиг БАЙВАЛ харагдах хэв (ТОМ БОЛД), БАЙХГҮЙ бол `sr-only` ✓
  assert.ok(DET_CODE.includes("'mb-2 text-xl font-bold leading-snug text-gray-900 sm:text-2xl'"),
    'харагдах гарчгийн класс (ТОМ БОЛД) БИШ ✗');
  assert.ok(DET_CODE.includes(": 'sr-only'}"),
    'гарчиггүй зарын `sr-only` нөөц зам ХАСАГДСАН ✗');
  // ④ ⏳ (2026-10-01)-ийн `sr-only` текстийн нөөц (icon · төрөл · хаяг) ХӨНДӨӨГДӨӨГҮЙ ✓
  assert.ok(DET_CODE.includes('getPropertyIcon(listing.property_type, listing.section)'),
    '`sr-only` нөөц текстийн төрлийн icon ХАСАГДСАН ✗');
  assert.ok(DET_CODE.includes("address ? ` — ${address}` : ''"),
    '`sr-only` нөөц текстийн хаяг ХАСАГДСАН ✗');
});

// ---------- ⑪ 🎨 МЕТА ИКОНУУД + ШИНЖИЙН ICON (2026-10-10 (96)) ----------
t('⑪ (96) Мета мөр: `📍` → `MapPinIcon` SVG · `🔖` ХАСАГДАВ (текст ХЭВЭЭР) ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «📍 26-р хороо үүний өмнөх icon ийг Газрын зургийн
   *  өмнөх шиг болго. 🔖 Зарын дугаарыг өмнөх icon ийг үгүй хий» ⇒ ① хаягны
   *  `📍` emoji → `MapPinIcon` (🗺 «Газрын зураг» товчны pin-тай ЯГ ИЖИЛ SVG)
   *  ② зарын дугаарын `🔖` emoji ХАСАГДАВ (текст нь дангаараа ойлгомжтой ✓) */
  assert.match(DET_CODE, /import \{ ?MapPinIcon, ClockIcon, EyeIcon, HeartIcon ?\} from '\.\/HeaderIcons'/,
    '`MapPinIcon`/`ClockIcon`/`EyeIcon`/`HeartIcon` нь `./HeaderIcons`-аас импортлогдоогүй ✗');
  assert.match(DET_CODE, /<MapPinIcon\b/, 'хаягны `MapPinIcon` (📍 emoji биш) алга ✗');
  assert.ok(!/📍/.test(DET_CODE), '📍 emoji буцаж орсон ✗ ((96): `MapPinIcon` байх ЁСТОЙ)');
  assert.ok(!/🔖/.test(DET_CODE), '🔖 emoji буцаж орсон ✗ ((96): icon ХАСАГДСАН байх ЁСТОЙ)');
  // ⚠️ Зарын дугаарын дүрслэл — 🆕 (97): ⏳ «Зарын дугаар:» → «ID:» (жишиг сайтын
  //    хэв: «ID: 10801626»); ⚠️ БОГИНО дугаар (`shortId`) ХӨНДӨӨГДӨӨГҮЙ ✓
  //    🆕 (104): ⏳ `font-mono font-semibold text-gray-600` ХАСАГДАВ — ID утга нь
  //    хажуугийн мета тексттэй ЯГ ИЖИЛ (16px · system sans · `text-gray-500`) ✓
  assert.ok(DET_CODE.includes('ID: <span className="tabular-nums">{shortId}</span>'),
    'ID текст/утга ХӨНДӨӨГДСӨН ✗ ((97): «ID: XXXXXXXX» · (104): sans/16px)');
  assert.ok(!/font-mono/.test(DET_CODE),
    'ID нь MONO фонттой ХЭВЭЭР ✗ ((104): мета текстийн фонтой тааруулах ЁСТОЙ)');
  // ⚠️ CDP (бодит Chrome) нь ЭДГЭЭР selector-оор хэмждэг — байхгүй бол CDP SKIP ✓
  assert.match(DET_CODE, /data-listing-meta/, 'мета мөрний `data-listing-meta` selector алга ✗');
  assert.match(DET_CODE, /data-listing-actions/, '«үзсэн/таалагдсан/хуваалцах» мөрний `data-listing-actions` алга ✗');
});

t('⑪ (97) 👁 ҮЗСЭН нь `EyeIcon` SVG — толгойн мета мөрөнд, зөвхөн тоо ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (🆕 (97)): «change position like attached photo, it's
   *  included Үзсэн, Таалагдсан, Хуваалцах» ⇒ `👁 N` нь толгойн мета мөрөнд
   *  (`📍 хаяг · 🕒 огноо · 👁 N · ID: X`) шилжив; ⚠️ өмнөх (96)-ийн ТОД өнгө
   *  (`text-gray-700`) ХЭВЭЭР ✓; текст нь «N үзсэн» БИШ зөвхөн «N» (жишиг сайт) ✓ */
  assert.match(DET_CODE, /<EyeIcon className="[^"]*text-gray-700[^"]*"/,
    '`EyeIcon` нь ТОД өнгөтэй (`text-gray-700`) БИШ ✗');
  assert.ok(!/👁/.test(DET_CODE), '👁 emoji буцаж орсон ✗ ((96): `EyeIcon` байх ЁСТОЙ)');
  assert.ok(DET_CODE.includes('{viewCount}'), 'үзсэн тоо (`{viewCount}`) ХӨНДӨӨГДСӨН ✗');
  // ⛔ (97): «{viewCount} үзсэн» урт текст БУЦАЖ ОРОХ ЁСГҮЙ (зөвхөн тоо) ✓
  assert.ok(!DET_CODE.includes('{viewCount} үзсэн'),
    '«{viewCount} үзсэн» буцаж орсон ✗ ((97): зөвхөн «{viewCount}» тоо)');
});

t('⑪ (101) ❤️/🤍 EMOJI → `HeartIcon` SVG — карттай ЯГ ИЖИЛ ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «change to all detail card … it's included Үзсэн,
   *  Таалагдсан, Хуваалцах design and position change to like attached photo»
   *  ⇒ «Таалагдсан» нь зургийн хэвээр НИМГЭН ХАР ЗУРААСТАЙ зүрхэн болов:
   *  ⏳ `{isFav ? '❤️' : '🤍'}` emoji → **`<HeartIcon filled={isFav} />`** (`(101)`)
   *  ⚠️ Карт дахь зүрхэнтэй (`ListingCard`) ЯГ ИЖИЛ икон/төлөв ✓ */
  assert.match(DET_CODE, /<HeartIcon\b[^>]*filled=\{isFav\}/, '`<HeartIcon filled={isFav} />` алга ✗');
  assert.ok(!/❤️|🤍/.test(DET_CODE), '❤️/🤍 emoji буцаж орсон ✗ ((101): `HeartIcon` байх ЁСТОЙ)');
  assert.ok(DET_CODE.includes('{likeCount}'), 'таалагдсан тоо (`{likeCount}`) ХӨНДӨӨГДСӨН ✗');
  // 🆕 (101) `🕒` emoji ХАСАГДАВ — картын мета мөртэй ЯГ ижил (зөвхөн текст) ✓
  assert.ok(!/🕒/.test(DET_CODE), '🕒 emoji буцаж орсон ✗ ((101): зөвхөн текст)');
});

t('⑪ (96) «Зарын дэлгэрэнгүй» хүснэгтэд icon ХАРАГДАХГҮЙ (`{f.label}` — `f.icon` биш) ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Зарын дэлгэрэнгүй хэсгийн 🏷️ Үйлдвэрлэгч: гэх мэтийн
   *  бүх icon ийг байхгүй болго, хэрэггүй» ⇒ `<dt>` нь ОДОО ЗӨВХӨН шошго.
   *  ⚠️ `getAttrRows`-ийн `icon` утга (форм/сайдбарын чип — НЭГ ЭХ СУРВАЛЖ)
   *  ХӨНДӨӨГДӨӨГҮЙ: зөвхөн ЭНД дүрслэгдэхгүй ✓ */
  assert.ok(DET_CODE.includes('<dt className="w-[45%] shrink-0 text-gray-500">{f.label}:</dt>'),
    '`<dt>` нь зөвхөн `{f.label}` БИШ (icon дүрслэгдсээр) ✗');
  assert.ok(!/f\.icon/.test(DET_CODE), '`f.icon` дүрслэл буцаж орсон ✗');
  assert.match(readSrc('lib/locationData.js'), /icon: f\.icon \|\| ''/,
    '`getAttrRows` icon утга ХАСАГДСАН ✗ (форм/сайдбарын чип иконууд эвдэрнэ)');
});

// ---------- ⑤ README + package.json ----------
t('⑤ 📦 `package.json`-д `test:detail-ui` скрипт + README-д бүртгэл ✓', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.scripts['test:detail-ui'], 'node scripts/test-detail-ui.mjs',
    '`test:detail-ui` скрипт алга/буруу ✗');
  const README = readSrc('README.md');
  assert.ok(README.includes('test:detail-ui'), 'README-д `test:detail-ui` алга ✗');
  assert.ok(README.includes('scripts/test-detail-ui.mjs'), 'README-д файлын нэр алга ✗');
// ---------- ⑫ 🎨 ЖИШИГ ЗУРГИЙН «SIZE · FONT · COLOR» (2026-10-10 (102)) ----------
t('⑫ (102) Мета мөр: 16px (`text-base`) + 🕒 `ClockIcon` SVG + ❤️ pill 44px ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «copy like attached screenshot card details information
   *  to Size, font, color» ⇒ мета мөр нь хавсаргасан жишиг зургийн хэмжээ/
   *  фонт/өнгөтэй болов (хэмжилт: x-height 9px ⇒ 16px · pill 44px · `#F2F2F3`):
   *  ① `text-[13px]` → **`text-base`** (16px) ② огнооны өмнө **`ClockIcon`** SVG
   *  (⏳ (101)-д 🕒 emoji ХАСАГДСАН байв — жишиг зургийн мета мөрөнд цагийн икон
   *  БАЙНА ✓) ③ зүрхэн 20px → **24px** (`h-6 w-6`) — жишигт pill-ийн икон нь мета
   *  иконуудаас ТОМ ✓ */
  assert.ok(DET_CODE.includes('className="flex flex-wrap items-center gap-x-1 gap-y-1 text-base text-gray-500"'),
    'мета мөр «16px» (`text-base`) БИШ ✗');
  assert.ok(DET_CODE.includes('<ClockIcon className="h-5 w-5 text-gray-700" />'),
    'огнооны өмнө `ClockIcon` SVG алга ✗');
  assert.ok(DET_CODE.includes('data-icon="clock"'),
    'цагийн иконы `data-icon="clock"` дэгээ алга ✗');
  assert.ok(DET_CODE.includes('<HeartIcon className="h-6 w-6" strokeWidth={2} filled={isFav} />'),
    '❤️ pill-ийн зүрхэн 24px (`h-6 w-6`) + `strokeWidth={2}` БИШ ✗');
});

t('⑫b (102)(104) Сонгосон зураг 4:3 — `aspect-[4/3]` + `max-w-[840px]` ✓', () => {
  /** «change selected photo size to 800x600» ⇒ gallery-ийн ҮНДСЭН зураг нь
   *  4:3 (`aspect-[4/3]`) ✓ ⏳ `h-[280px]`/`sm:h-[440px]` (1.95:1 — хэт хавтгай)
   *  ХАСАГДАВ ✓
   *  🆕 (104): «adjust the width so that it measures approximately 23 cm on a
   *  23.8-inch screen and approximately 17 cm on a 13.1-inch screen» ⇒
   *  `max-w-[800px]` + `mx-auto` → **`max-w-[840px]`** — 23.8″ 1920×1080
   *  (`36.44 px/см`) ⇒ 840/36.44 = **23.0 см**; 13.1″ retina (логик 1440×900 ⇒
   *  `50.28 px/см`) ⇒ 840/50.28 = **16.7 см ≈ 17 см** ✓ (харьцаа 4:3 ХЭВЭЭР ⇒
   *  840×630 — «пропорцоо хадгал» ✓)
   *  ⚠️ `mx-auto` ХАСАГДАВ — зураг ЗҮҮН ирмэгээс эхэлж «Тайлбар»-тай зэрэгцэнэ ✓ */
  assert.ok(DET_CODE.includes('className="w-full max-w-[840px] overflow-hidden rounded-xl"'),
    'галерейн хайрцаг `max-w-[840px]` (төвлөрүүлэлтгүй) БИШ ✗');
  assert.ok(!/mx-auto w-full max-w-\[800px\]/.test(DET_CODE),
    '⏳ (102)-ын `mx-auto … max-w-[800px]` буцаж орсон ✗');
  assert.ok(DET_CODE.includes('data-gallery-main'),
    'үндсэн зургийн `data-gallery-main` дэгээ алга ✗');
  assert.ok(DET_CODE.includes('className="aspect-[4/3] w-full object-cover"'),
    'үндсэн зураг `aspect-[4/3]` БИШ ✗');
  assert.ok(!/h-\[280px\]|sm:h-\[440px\]/.test(DET_CODE),
    '⏳ хуучин `h-[280px]`/`sm:h-[440px]` дүрслэл үлдсэн ✗');
  assert.ok(DET_CODE.includes('className="flex aspect-[4/3] w-full items-center justify-center text-7xl"'),
    'зураггүй зарын хайрцаг `aspect-[4/3]` БИШ ✗');
});

// ---------- ⑫c 📏🖼 (104) ЗУРАГ ⟂ ТАЙЛБАР зэрэгцэв + Share/ID/нүд мета фонттой ----------
t('⑫c (104) Зураг ⟂ тайлбар нэг өргөн · Share/ID/👁 мета текстийн фонттой таарав ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (104): «align the advertisement image and the
   *  description» ба «style the "Share" and "ID" elements, as well as the eye
   *  icon, to match the size and font of the accompanying text»
   *  ① ЗУРАГ: `max-w-[840px]` (≈23 см @23.8″ · ≈17 см @13.1″) — төвлөрөхгүй ✓
   *  ② ТАЙЛБАР: `<p>` ч мөн `max-w-[840px]` ⇒ НЭГ өргөн, НЭГ зүүн ирмэг ✓
   *  ③ ХУВААЛЦАХ: pill-ийн бичиг `font-normal text-gray-500` (16px) ✓
   *  ④ ID: `font-mono`/`font-semibold`/`text-gray-600` ХАСАГДАВ ✓
   *  ⑤ 👁 нүд: 20px → **16px** (`h-4 w-4` = мета текстийн `text-base`) ✓
   *  ⚠️ ЗӨВХӨН эдгээр элемент; 📍 pin/🕒 цаг (20px) ба pill-ийн хэлбэр
   *     (`h-11` · `bg-gray-100` · `rounded-full`) ХӨНДӨӨГДӨӨГҮЙ ✓ */
  assert.ok(DET_CODE.includes('className="max-w-[840px] whitespace-pre-line break-words text-[15px] leading-[1.8] text-gray-600"'),
    'тайлбарын `<p>` нь `max-w-[840px]` (зурагтай нэг өргөн) БИШ ✗');
  assert.ok(DET_CODE.includes('className="inline-flex items-center gap-1 tabular-nums"'),
    '👁 мета мөр `font-semibold text-gray-600`-оос чөлөөлөгдөөгүй ✗');
  assert.ok(DET_CODE.includes('<EyeIcon className="h-4 w-4 text-gray-700" />'),
    '👁 нүдний икон `h-4 w-4` (16px = мета текст) БИШ ✗');
  assert.ok(!/EyeIcon className="h-5 w-5/.test(DET_CODE),
    '⏳ (100)-ийн 20px нүдний икон буцаж орсон ✗');
  const SHARE = readSrc('components/ShareButton.jsx');
  assert.ok(SHARE.includes('px-4 font-normal text-gray-500 transition hover:bg-gray-200'),
    '«Хуваалцах» pill-ийн бичиг `font-normal text-gray-500` (мета текст) БИШ ✗');
  assert.ok(!/font-semibold text-gray-900/.test(SHARE),
    '⏳ (102)-ын `font-semibold text-gray-900` буцаж орсон ✗');
});


});

// ---------- ⑬ 👤 ЗАР НИЙТЛЭГЧ — «📋 Зарын дэлгэрэнгүй»-ийн ХАЖУУД (2026-10-10 (103)) ----------
t('⑬ (103) 👤 Зар нийтлэгчийн карт нь «Зарын дэлгэрэнгүй» хүснэгтийн ХАЖУУД ✓', () => {
  /** ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Display the advertiser's information alongside the ad
   *  details» ⇒ нийтлэгчийн карт нь хүснэгтийн БАРУУН талд (`lg` дээр 2 багана)
   *  бас гарна. ⏳ Өмнө нь зөвхөн БАРУУН баганын (`aside`) үнэ/холбоо барих
   *  хайрцаг дотор байв ✗
   *  ⚠️ Тэмдэглэгээ нь `AdvertiserCard` компонент (ЦОРЫН ГАНЦ эх сурвалж) —
   *     `aside` дахь карт ХӨНДӨӨГДӨӨГҮЙ, ижил класс/линк/текст гарна ✓
   *  📱 `lg`-ээс доош (мобайл) карт нь хүснэгтийн ДООР буулна (нэг багана) ✓ */
  // ① Нэг эх сурвалж: `<AdvertiserCard />` нь ЯГ 2 газарт дуудагдана ✓
  assert.equal((DET_CODE.match(/<AdvertiserCard\b/g) || []).length, 2,
    '`<AdvertiserCard` нь 2 газарт (хүснэгтийн хажууд + `aside`) дуудагдах ЁСТОЙ ✗');
  assert.ok(/function AdvertiserCard\(/.test(DET_CODE),
    '`AdvertiserCard` компонент (нэг эх сурвалж) алга ✗');
  assert.equal((DET_CODE.match(/name=\{sellerName\} size=\{96\}/g) || []).length, 2,
    'аватар 96px нь компонентоос ГАДНА давхардсан (тэмдэглэгээ хуваагдсан) ✗');
  // ② Хүснэгтийн хэсэгт: `lg` 2 баганат grid + `data-advertiser-card` дэгээ ✓
  assert.ok(DET_CODE.includes('className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]"'),
    '«Зарын дэлгэрэнгүй» хэсэг нь `lg` 2 баганат grid БИШ ✗');
  assert.ok(DET_CODE.includes('data-advertiser-card'),
    'картын `data-advertiser-card` дэгээ алга ✗ (CDP хэмжилт хийх боломжгүй)');
  assert.ok(DET_CODE.includes('className="rounded-xl border border-gray-200 bg-white p-4"'),
    'картын хайрцаг ЦАГААН (`bg-white`) БИШ ✗ ((87): саарал дүүргэлт хориотой)');
  assert.ok(DET_CODE.includes('<h3 className="mb-3 text-center text-sm font-semibold text-gray-700">Зар нийтлэгч</h3>'),
    '«Зар нийтлэгч» гарчиг алга ✗');
  // ③ Дараалал: `section` → хүснэгт (`<dl>`) → карт (баруун багана) ✓
  const sec = DET_CODE.indexOf('data-component="AdvertFeaturesApp"');
  const dl = DET_CODE.indexOf('<dl className="grid grid-cols-1 sm:grid-cols-2">');
  const card = DET_CODE.indexOf('data-advertiser-card');
  assert.ok(sec > 0 && dl > sec && card > dl,
    `дараалал буруу (section ${sec} → dl ${dl} → карт ${card}) ✗`);
  // ④ (16)(87)(102)-ын гэрээ ХӨНДӨӨГДӨӨГҮЙ: хэсгүүд 1px дээд зураастай (4),
  //    мөр бүрэн болон сондгой үеийн хүрээний дүрэм ХЭВЭЭР ✓
  assert.equal((DET_CODE.match(/mt-6 border-t border-gray-200 pt-6/g) || []).length, 4,
    '(103)-д хэсгүүдийн «хайрцаггүй + 1px дээд зураас» хэв эвдэрсэн ✗');
  assert.ok(DET_CODE.includes("features.length % 2 === 0 ? 'sm:[&:nth-last-child(-n+2)]:border-b-0' : 'sm:[&:last-child]:border-b-0'"),
    'шинж чанарын хүрээний дүрэм (16) ХӨНДӨӨГДӨӨГҮЙ байх ЁСТОЙ ✗');
});


console.log(`\n✅ БҮГД ОК: ${passed} тест — jobs зураггүй · Нэр талбар · тэгш өнцөгт Avatar · бүх зарт газрын зураг · урт текст 'break-words' · нийтлэгчийн карт (96px аватар картын ДЭЭД талд, ГОЛЛУУЛЖ) · «📋 N идэвхтэй зар» ТУСДАА ЛИНК · 🎨 саарал дүүргэлт 0 · 🏷️ зарын гарчиг (харагдах H1) · 🎨 мета иконууд (📍/👁 → SVG, 🔖 ба шинж чанарын icon ХАСАГДАВ) · 🆕 (103): 👤 зар нийтлэгчийн карт «📋 Зарын дэлгэрэнгүй» хүснэгтийн ХАЖУУД (нэг эх сурвалж — AdvertiserCard) ✓\n`);

