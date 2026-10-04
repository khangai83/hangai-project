// ============================================================
// seed-per-category.mjs — ХЭСЭГ (категори) БҮРТ 3 ЖИШЭЭ ЗАР
//
// Ажиллуулах:
//   npm run seed:category                    # 12 хэсэг × 3 = 36 зар (88093663 нэр дээр)
//   npm run seed:category -- 99112233        # өөр хэрэглэгчийн нэр дээр
//   npm run seed:category -- --per=5         # хэсэг бүрт 5 зар (12 × 5 = 60)
//   npm run seed:category -- --section=auto  # ⚡ ЗӨВХӨН 🚗 авто хэсэг (3 зар)
//   DRY_RUN=1 npm run seed:category          # ⚠️ DB-д ХҮРЭХГҮЙ, зөвхөн жагсаалт
//
// 🎯 ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   `npm run seed:sections` нь 226 дэд төрөл × 10 = **2260 зар** — бүрэн demo
//   орчинд тохиромжтой ч, жижиг/тестийн орчинд хэт их. Энэ скрипт нь нүүр
//   хуудасны БҮХ категори (12 хэсэг) хоосон харагдахгүй байхад хангалттай
//   цөөн зар (анхдагч **3**) оруулна ✓
//
// • Дэд төрлийг ЭРГЭЛДҮҮЛЖ сонгоно (`k=0` → 1-р дэд төрөл, `k=1` → 2-р …)
//   ⇒ хэсэг бүрийн 3 зар нь 3 өөр дэд төрөлд, өөр хувилбар (`k`) утгатай орно ✓
//   (ж: 🚗 авто → «Суудлын машин», «Жийп, SUV», «Микроавтобус»)
// • Үнэ / талбай / өрөө / attrs / зураг нь `seed-sections.mjs → buildRow()`
//   -ээр — ЯГ ИЖИЛ логик (хуулбар код байхгүй ⇒ үнийн дүрэм 2 газар зөрөхгүй ✓)
// • ⚠️ Дахин ажиллуулахад ДАВХАРДАХГҮЙ — зөвхөн `#demo-cat3` тэмдэгтэй
//   мөрүүдээ устгаад дахин үүсгэнэ. `#demo-heseg10` / `#demo-turul10` болон
//   ГАРААР оруулсан зарууд ХӨНДӨГДӨХГҮЙ ✓ (тэмдэг нь `description` дотор)
// • ℹ️ `title` (0027) — карт дээр үнийн доор харагдах товч гарчиг бичнэ
//   (`«Орон сууц · Баянгол»`); багана байхгүй бол `insert` нь 42703 алдаа өгнө
//   (тэгвэл `0027_listing_title.sql`-ыг ажиллуулна уу)
// • ⚠️ `0014_listing_dedupe.sql` ОРСОН DB дээр 24 цагт **3 ШИНЭ зар** гэсэн
//   SPAM хязгаар тулгарна (36 > 3) ⇒ README-ийн «Demo seed-тэй ЗӨРЧИЛ»
//   хэсгийн зааврын дагуу триггерийг ТҮР хагаална уу
// ============================================================
import { createRequire } from 'node:module';
import { SECTIONS, getSubtypes } from '../lib/locationData.js';
// ⚠️ `buildRow` + тэмдэг нь `seed-sections.mjs`-ээс — import хийхэд тэр скриптийн
//    үндсэн ажиллагаа (DB-д бичих) АЖИЛЛАХГҮЙ (`IS_DIRECT_RUN` хамгаалалт) ✓
import { buildRow, MARKER as SECTIONS_MARKER } from './seed-sections.mjs';

const require = createRequire(import.meta.url);
const { getAdminClient, findUserByPhone } = require('../lib/authServer');

/** Энэ скриптийн ӨӨРИЙН тэмдэг — `seed:sections`-ийн мөрүүдтэй андуурахгүйн тулд */
const MARKER = '#demo-cat3';
const DEFAULT_PER = 3;
const DEFAULT_PHONE = '88093663';

/** `--per=<тоо>` (анхдагч 3, дор хаяж 1) */
const PER = Math.max(1, Number((process.argv.find((a) => a.startsWith('--per=')) || '').split('=')[1]) || DEFAULT_PER);
/** `--section=<value>` — ЗӨВХӨН нэг хэсэг (хоосон бол БҮГД) */
const ONLY_SECTION = (process.argv.find((a) => a.startsWith('--section=')) || '').split('=')[1] || '';
/** ⚠️ `argv[2]` нь 8 оронтой тоо БАЙВАЛ л утас — тэгэхгүй бол `--per=3` гэх мэт флаг */
const DEMO_PHONE = /^\d{8}$/.test(process.argv[2] || '') ? process.argv[2] : DEFAULT_PHONE;
const DRY_RUN = process.env.DRY_RUN === '1';

if (ONLY_SECTION && !SECTIONS.some((s) => s.value === ONLY_SECTION)) {
  console.error(`❌ «${ONLY_SECTION}» гэсэн хэсэг байхгүй.`);
  console.error(`   Боломжтой: ${SECTIONS.map((s) => s.value).join(', ')}`);
  process.exit(1);
}
if (MARKER === SECTIONS_MARKER) {
  console.error('❌ Тэмдэг `seed:sections`-тэй ИЖИЛ байна — мөрүүдээ ялгах боломжгүй.');
  process.exit(1);
}

const ACTIVE = ONLY_SECTION ? SECTIONS.filter((s) => s.value === ONLY_SECTION) : SECTIONS;

/** Утсыг зарын `phone` формат руу (`976XXXXXXXX`) */
const phoneOf = (p) => `976${String(p).replace(/\D/g, '').slice(-8)}`;

/** Зарын гарчиг (0027) — `«Суудлын машин · Сүхбаатар»` */
const titleOf = (subtype, row) =>
  [subtype, row.district || row.city].filter(Boolean).join(' · ').slice(0, 120);

// ---- Ажиллуулах ---------------------------------------------------------
(async () => {
  // 1) Мөрүүдийг бүтээх (DB-гүйгээр — DRY_RUN-д ч ажиллана)
  const rows = [];
  for (const sec of ACTIVE) {
    const subtypes = getSubtypes(sec.value);
    if (!subtypes.length) {
      console.warn(`⚠️  ${sec.icon} ${sec.label}: дэд төрөл олдсонгүй — АЛГАСАВ`);
      continue;
    }
    const chosen = [];
    for (let k = 0; k < PER; k += 1) {
      // ⚠️ Дэд төрлүүдийг ЖИГД ТАРААЖ сонгоно (эхний 3-ыг дараалан БИШ):
      //    ж: ⚡ «Цахилгаан бараа» (26 дэд төрөл)-ийн эхний 3 нь бүгд
      //    «Телевизор (…инч)» тул 3 зар бүгд ТВ болж нэгэн хэвийн харагдана ✗
      //    ⇒ 0, 8, 17-р дэд төрлүүд → ТВ · Аудио · Хөргөгч шиг олон янз ✓
      const idx = Math.floor((k * subtypes.length) / PER) % subtypes.length;
      const subtype = subtypes[idx];
      chosen.push(subtype);
      const row = buildRow(sec.value, subtype, k);
      if (!row.description.includes(SECTIONS_MARKER)) {
        throw new Error(`«${sec.value}» мөрөнд ${SECTIONS_MARKER} тэмдэг алга — buildRow өөрчлөгдсөн байна.`);
      }
      rows.push({
        ...row,
        title: titleOf(subtype, row),
        description: row.description.split(SECTIONS_MARKER).join(MARKER),
        phone: phoneOf(DEMO_PHONE),
      });
    }
    console.log(`  ${sec.icon} ${sec.label.padEnd(20)} ${PER} зар (${chosen.join(' · ')})`);
  }
  console.log(`\n📦 Нийт ${rows.length} зар (${ACTIVE.length} хэсэг × ${PER}) — тэмдэг: ${MARKER}\n`);

  if (DRY_RUN) {
    console.log('🧪 DRY_RUN=1 — DB-д ХҮРЭХГҮЙ. Жишээ 5 мөр:');
    for (const r of rows.slice(0, 5)) {
      console.log(`   ${r.section.padEnd(12)} ${String(r.property_type).padEnd(28)} ` +
        `${r.category.padEnd(4)} ${String(r.price).padStart(12)} ₮  ${r.title}`);
    }
    process.exit(0);
  }

  const admin = getAdminClient();

  // 2) Эзэн хэрэглэгч
  const user = await findUserByPhone(DEMO_PHONE);
  if (!user) {
    console.error(`❌ ${DEMO_PHONE} дугаартай хэрэглэгч олдсонгүй. Эхлээд: node scripts/seed-supabase.js`);
    process.exit(1);
  }
  const name = (user.user_metadata && user.user_metadata.name) || '(нэргүй)';
  console.log(`👤 Эзэн: ${name} (${DEMO_PHONE})\n`);

  // 3) Өмнөх `#demo-cat3` мөрүүдийг устгах (бусад зарыг ХӨНДӨХГҮЙ)
  // ⚠️ `--section=` үед ЗӨВХӨН тэр хэсгийн мөрүүдийг устгана — эс бөгөөс
  //    `--section=auto` нь бусад 11 хэсгийн 33 мөрийг ч устгачихна ✗
  const { data: old, error: selErr } = await admin
    .from('listings')
    .select('id')
    .like('description', `%${MARKER}%`)
    .in('section', ACTIVE.map((s) => s.value));
  if (selErr) {
    console.error('❌ Хуучин мөр уншихад алдаа:', selErr.message);
    process.exit(1);
  }
  if (old && old.length) {
    const { error: delErr } = await admin.from('listings').delete().in('id', old.map((o) => o.id));
    if (delErr) {
      console.error('❌ Устгахад алдаа:', delErr.message);
      process.exit(1);
    }
    console.log(`🗑  Өмнөх ${old.length} demo зарыг устгав (давхардахгүй)\n`);
  }

  // 4) 20-оор багцлан оруулах (PostgREST-ийн хязгаараас доогуур)
  for (let i = 0; i < rows.length; i += 20) {
    const chunk = rows.slice(i, i + 20).map((r) => ({ ...r, user_id: user.id }));
    const { error } = await admin.from('listings').insert(chunk);
    if (error) {
      console.error(`\n❌ Оруулахад алдаа (${i + 1}…): ${error.message}`);
      if (/column|schema cache/i.test(error.message)) {
        console.error('   → `npm run check:supabase` — 0016 (section/attrs) ба 0027 (title) migration-ыг шалгана уу.');
      }
      if (/check constraint|23514/i.test(error.message)) {
        console.error('   → `listings_section_valid` CHECK нь шинэ хэсгийг агуулаагүй — 0026-ыг ажиллуулна уу.');
      }
      if (/SPAM|хязгаар|3 зарын/i.test(error.message)) {
        console.error('   → 0014-ийн 24 цагт 3 зарын хязгаар — README → «Demo seed-тэй ЗӨРЧИЛ».');
      }
      process.exit(1);
    }
    console.log(`   ✓ ${Math.min(i + 20, rows.length)}/${rows.length}`);
  }

  // 5) Дүн — хэсэг тус бүрийн НИЙТ зар (paged: PostgREST 1000 мөр буцаана)
  const all = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data: page, error } = await admin
      .from('listings').select('section, property_type').range(from, from + PAGE - 1);
    if (error) { console.error('❌ Дүн уншихад алдаа:', error.message); process.exit(1); }
    all.push(...(page || []));
    if (!page || page.length < PAGE) break;
  }
  const stat = {};
  for (const r of all) {
    const s = r.section || 'real-estate';
    stat[s] = stat[s] || { total: 0, types: {} };
    stat[s].total += 1;
    stat[s].types[r.property_type] = (stat[s].types[r.property_type] || 0) + 1;
  }
  console.log('\n=== ХЭСЭГ (КАТЕГОРИ) ТУС БҮРИЙН НИЙТ ЗАР ===');
  for (const sec of SECTIONS) {
    const v = stat[sec.value] || { total: 0, types: {} };
    const mark = v.total === 0 ? '❌' : '✅';
    console.log(`  ${mark} ${sec.icon} ${sec.label.padEnd(20)} ${String(v.total).padStart(4)} зар (${Object.keys(v.types).length} дэд төрөл)`);
  }
  console.log(`\n🎉 DB-д нийт ${all.length} зар байна`);
  console.log('👉 http://localhost:3000 — категори бүр дээр дарж шалгана уу');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Алдаа:', (err && err.message) || err);
  process.exit(1);
});
