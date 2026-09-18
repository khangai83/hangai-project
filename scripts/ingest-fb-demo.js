// ============================================================
// ingest-fb-demo.js — Facebook агентын queue-г demo post-уудаар дүүргэнэ
// (Бодит FB скрейп хийхгүйгээр review flow-г тестлэхэд зориулав)
// Ажиллуулах: node scripts/ingest-fb-demo.js
// ============================================================
const { ingestRawPost, demoPosts, getAdminClient } = require('../lib/draftAgent');

async function main() {
  // Хүснэгт байгаа эсэхийг шалгах (0002 migration ажилласан эсэх)
  const sb = getAdminClient();
  const { error: checkErr } = await sb.from('listing_drafts').select('id').limit(1);
  if (checkErr) {
    console.error('❌ listing_drafts хүснэгт алга эсвэл тохиргоо буруу.');
    console.error('   0002 migration-оо ажиллуулна уу:');
    console.error('   - SQL Editor-т supabase/migrations/0002_listing_drafts.sql-ийн агуулгыг Run хийх, эсвэл');
    console.error('   - `node scripts/apply-schema.js 0002_listing_drafts.sql` (төслийн access token байвал)');
    console.error('   Алдаа:', checkErr.message);
    process.exit(1);
  }

  const posts = demoPosts();
  let inserted = 0, duplicates = 0, errors = 0;
  for (const post of posts) {
    const res = await ingestRawPost(post);
    if (res.status === 'inserted') { inserted++; console.log('➕ Draft орууллаа:', res.parsed.title); }
    else if (res.status === 'duplicate') { duplicates++; console.log('⏭ Давхардсан (алгаслаа):', res.reason); }
    else { errors++; console.error('❌ Алдаа:', res.reason); }
  }
  console.log(`\n🎉 Дууслаа: +${inserted}, давхардал ${duplicates}, алдаа ${errors}`);
  console.log('Дараа нь /admin/queue хуудсаар орж заруудыг баталгаажуулна уу.');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Алдаа:', err.message);
  process.exit(1);
});
