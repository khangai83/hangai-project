// ============================================================
// ingest-from-json.js — Жинхэнэ FB post-уудыг queue-д оруулах
// (Бодит скрейп холбоогүйгээр өгөгдлөө JSON-оор өгөх боломж)
//
// Ажиллуулах: node scripts/ingest-from-json.js path/to/posts.json
//
// JSON формат (массив):
// [
//   {
//     "source": "facebook",
//     "group": "Группын нэр",
//     "url": "https://facebook.com/... (пост линк, давхардлаас сэргийлнэ)",
//     "postedBy": "Тайлсан хүний нэр",
//     "postedAt": "2026-01-01T10:00:00Z",
//     "text": "Зарын бүрэн текст...",
//     "images": ["https://.../photo1.jpg", "https://.../photo2.jpg"]
//   }
// ]
// ============================================================
const fs = require('fs');
const path = require('path');
const { ingestRawPost } = require('../lib/draftAgent');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Ашиглалт: node scripts/ingest-from-json.js <posts.json>');
    console.error('Жишээ файл: scripts/fb-dump.example.json');
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) { console.error('❌ Файл олдсонгүй:', abs); process.exit(1); }

  let posts;
  try { posts = JSON.parse(fs.readFileSync(abs, 'utf8')); }
  catch (e) { console.error('❌ JSON parse алдаа:', e.message); process.exit(1); }
  if (!Array.isArray(posts)) { console.error('❌ JSON нь массив байх ёстой.'); process.exit(1); }

  let inserted = 0, duplicates = 0, errors = 0;
  for (const post of posts) {
    const res = await ingestRawPost(post);
    if (res.status === 'inserted') { inserted++; console.log('➕', res.parsed.title); }
    else if (res.status === 'duplicate') { duplicates++; console.log('⏭ Давхардал:', res.reason); }
    else { errors++; console.error('❌', res.reason); }
  }
  console.log(`\n🎉 Дууслаа: +${inserted}, давхардал ${duplicates}, алдаа ${errors}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Алдаа:', err.message);
  process.exit(1);
});
