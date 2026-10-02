// ============================================================
// delete-demo-listings.mjs — СИСТЕМЭЭС ОРУУЛСАН (demo/seed) ЗАРУУДЫГ УСТГАХ
//
// Ажиллуулах:
//   npm run delete:demo            # DRY RUN — зөвхөн харна (юу ч устгахгүй)
//   npm run delete:demo -- --apply # УСТГАНА (service_role шаардана)
//
// ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ (хэрэглэгчийн хүсэлт 2026-10-02):
//   `seed-sections.mjs` (MARKER = '#demo-heseg10') ба
//   `seed-more-listings.mjs` (MARKER = '#demo-turul10') нь демо заруудыг
//   `description` дотор тэмдэг үлдээж оруулдаг. Энэ скрипт нь ЗӨВХӨН
//   эдгээр тэмдэгтэй (⇒ системээс оруулсан) зарыг устгана — хэрэглэгчийн
//   ГАРААР оруулсан зар ХӨНДӨГДӨХГҮЙ ✓
//
// ⚠️ ЗУРГИЙН САН: demo заруудын зураг нь `public/uploads/property-*.svg`
//    (локал файл) эсвэл `[]` тул R2 / Supabase Storage-д устах зүйл БАЙХГҮЙ ✓
//
// ⚠️ `0014_listing_dedupe.sql`-ийн триггер нь зөвхөн INSERT/UPDATE-д
//    хүрнэ — DELETE хийгдэхэд саад БОЛОХГҮЙ ✓
// ============================================================
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getAdminClient } = require('../lib/authServer');

/** Seed тэмдгүүд — `seed-sections.mjs` ба `seed-more-listings.mjs` */
const MARKERS = ['#demo-heseg10', '#demo-turul10'];
const APPLY = process.argv.includes('--apply');
const PAGE = 1000; // PostgREST-ийн мөрийн дээд хязгаар
const CHUNK = 200; // нэг delete хүсэлтэд устгах мөрийн тоо

/** Нэг тэмдэгтэй заруудын id-г ХУУДАСЛАЖ бүгдийг уншина */
async function findIds(sb, marker) {
  const ids = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from('listings')
      .select('id')
      .like('description', `%${marker}%`)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`«${marker}» хайхад алдаа: ${error.message}`);
    ids.push(...(data || []).map((r) => r.id));
    if (!data || data.length < PAGE) break;
  }
  return ids;
}

async function main() {
  const sb = getAdminClient();

  console.log('\n🗑  Системээс оруулсан (demo/seed) заруудыг устгах\n');

  const all = [];
  for (const marker of MARKERS) {
    const ids = await findIds(sb, marker);
    console.log(`   • ${marker.padEnd(14)} — ${String(ids.length).padStart(4)} зар`);
    all.push(...ids);
  }

  if (!all.length) {
    console.log('\n✅ Устгах demo зар ОЛДСОНГҮЙ — DB аль хэдийн цэвэр байна.\n');
    return;
  }
  console.log(`\n⚠️  НИЙТ ${all.length} demo зарыг устгах гэж байна.`);

  if (!APPLY) {
    console.log('\n🧪 DRY RUN — юу ч устгаагүй. Устгах бол:');
    console.log('   npm run delete:demo -- --apply\n');
    return;
  }

  let removed = 0;
  for (let i = 0; i < all.length; i += CHUNK) {
    const chunk = all.slice(i, i + CHUNK);
    const { error } = await sb.from('listings').delete().in('id', chunk);
    if (error) throw new Error(`Устгахад алдаа: ${error.message}`);
    removed += chunk.length;
    console.log(`   ✓ ${removed}/${all.length}`);
  }

  // ✅ Дүн — DB-ээс бодит тоог дахин уншина (устгасан эсэхээ батална)
  const { count, error: countErr } = await sb
    .from('listings')
    .select('id', { count: 'exact', head: true });
  console.log(`\n🎉 ${removed} demo зар устгагдлаа.`);
  console.log(`   DB-д үлдсэн НИЙТ зар: ${countErr ? '—' : count}\n`);
}

main().catch((err) => {
  console.error('❌ Алдаа:', (err && err.message) || err);
  process.exit(1);
});
