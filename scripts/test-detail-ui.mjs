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
   *  ⚠️ `whitespace-pre-line` (мөр таслалт) ХӨНДӨӨГДӨӨГҮЙ ✓ */
  assert.match(DET_CODE, /<p className="whitespace-pre-line break-words text-\[15px\] leading-\[1\.8\] text-gray-600">\{listing\.description\}<\/p>/,
    'Тайлбарын `<p>`-д `break-words` алга ✗ (урт үг хайрцгаас хэтэрнэ)');
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
  assert.ok(DET_CODE.includes('name={sellerName} size={96} />\n                    <div className="w-full min-w-0">'),
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
  const grays = DET_CODE.match(/bg-gray-\d+/g) || [];
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
  // 🆕 (97) 🚗 АВТО нөөц гарчиг — хэрэглэгчийн хүсэлт: «Only car detail card like
  //    photo, it's head is category name Toyota Harrier, Its Brand and Model then
  //    manufactured date/Imported year» ⇒ зар оруулагч бичээгүй бол `carTitle`
  assert.ok(DET_CODE.includes("const adTitle = listingTitle(listing) || (isAuto ? carTitle(listing.attrs) : '');"),
    '🚗 АВТО нөөц гарчиг (`carTitle`) алга ✗ («Toyota Harrier, 2017/2024» гарахгүй)');
  assert.ok(/import \{[^}]*\bcarTitle\b[^}]*\} from '\.\.\/lib\/format'/.test(DET_CODE),
    '`carTitle` нь `../lib/format`-аас импортлогдоогүй ✗');
  assert.ok(DET_CODE.includes("const isAuto = (listing.section || 'real-estate') === 'auto';"),
    '`isAuto` шалгалт алга ✗ (бусад хэсэгт авто-гарчиг орж болзошгүй)');
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
  assert.match(DET_CODE, /import \{ ?MapPinIcon, EyeIcon, HeartIcon ?\} from '\.\/HeaderIcons'/,
    '`MapPinIcon`/`EyeIcon`/`HeartIcon` нь `./HeaderIcons`-аас импортлогдоогүй ✗');
  assert.match(DET_CODE, /<MapPinIcon\b/, 'хаягны `MapPinIcon` (📍 emoji биш) алга ✗');
  assert.ok(!/📍/.test(DET_CODE), '📍 emoji буцаж орсон ✗ ((96): `MapPinIcon` байх ЁСТОЙ)');
  assert.ok(!/🔖/.test(DET_CODE), '🔖 emoji буцаж орсон ✗ ((96): icon ХАСАГДСАН байх ЁСТОЙ)');
  // ⚠️ Зарын дугаарын дүрслэл — 🆕 (97): ⏳ «Зарын дугаар:» → «ID:» (жишиг сайтын
  //    хэв: «ID: 10801626»); ⚠️ БОГИНО дугаар (`shortId`) ХӨНДӨӨГДӨӨГҮЙ ✓
  assert.ok(DET_CODE.includes('ID: <span className="font-mono font-semibold text-gray-600">{shortId}</span>'),
    'ID текст/утга ХӨНДӨӨГДСӨН ✗ ((97): «ID: XXXXXXXX»)');
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
});

console.log(`\n✅ БҮГД ОК: ${passed} тест — jobs зураггүй · Нэр талбар · тэгш өнцөгт Avatar · бүх зарт газрын зураг · урт текст 'break-words' · нийтлэгчийн карт (96px аватар картын ДЭЭД талд, ГОЛЛУУЛЖ) · «📋 N идэвхтэй зар» ТУСДАА ЛИНК · 🎨 саарал дүүргэлт 0 · 🏷️ зарын гарчиг (харагдах H1) · 🎨 мета иконууд (📍/👁 → SVG, 🔖 ба шинж чанарын icon ХАСАГДАВ) ✓\n`);

