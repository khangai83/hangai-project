// ============================================================
// seed-bathrooms.mjs — Одоо байгаа заруудад «Угаалгын өрөө» (bathrooms) утга нөхөх
//
// Ажиллуулах:  npm run seed:bathrooms
//
// ⚠️ Эхлээд `0012_listing_bathrooms.sql` migration-ийг SQL Editor-т ажиллуулсан
//    байх ЁСТОЙ (багана байхгүй бол скрипт тодорхой мессежээр зогсоно).
//
// Дүрэм (lib/locationData.js → hasBathroomFields-тай ижил):
//   • АОС/хаус төрөл            → 5+ өрөө бол 2-3, бусад нь 1-2
//   • 3 ба түүнээс олон өрөөтэй → 1-2
//   • Бусад (Газар, Оффис, 1-2 өрөөтэй байр, …) → ХӨНДӨХГҮЙ (null хэвээр)
//
// ⚠️ Зөвхөн ХООСОН (null/0) заруудад бичнэ — гараар оруулсан утгыг дарж
//    бичихгүй. Дахин ажиллуулахад ямар ч өөрчлөлт гарахгүй (idempotent).
// ⚠️ Тогтмол үр (PRNG seed) ашигладаг тул үр дүн давтагдана.
// ============================================================
import { createRequire } from 'node:module';
import { hasBathroomFields, getPropertyTypeDef } from '../lib/locationData.js';

const require = createRequire(import.meta.url);
const { getAdminClient } = require('../lib/authServer');

const BATCH = 20;

/** Тогтмол үр дүн гарах PRNG (seed-more-listings.mjs-тэй ижил загвар) */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rand = makeRng(20260924);
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

/** Тухайн зард тохирох угаалгын өрөөний реалист тоог буцаана */
function valueFor(row) {
  const def = getPropertyTypeDef(row.property_type);
  const rooms = Math.trunc(Number(row.rooms) || 0);
  if (def && def.bathrooms) return rooms >= 5 ? randInt(2, 3) : randInt(1, 2);
  return randInt(1, 2); // 3+ өрөөтэй орон сууц
}

(async () => {
  const admin = getAdminClient();

  // 1) Заруудыг татах
  const { data, error } = await admin
    .from('listings')
    .select('id, property_type, rooms, bathrooms')
    .limit(1000);

  if (error) {
    if (/'?bathrooms'? column|column .*bathrooms.* does not exist|schema cache/i.test(error.message || '')) {
      console.error('❌ `listings.bathrooms` багана байхгүй байна.');
      console.error('   → Эхлээд 0012 migration-ийг ажиллуулна уу:');
      console.error('     npm run migration:copy 0012_listing_bathrooms.sql');
      console.error('     (эсвэл node scripts/apply-schema.js 0012_listing_bathrooms.sql)');
      process.exit(1);
    }
    console.error('❌ Заруудыг татахад алдаа:', error.message);
    process.exit(1);
  }

  const rows = data || [];

  // 2) Нөхөх заруудыг шүүх (зөвхөн хоосон + дүрэмд нийцсэн)
  const targets = rows.filter(
    (r) => (r.bathrooms == null || Number(r.bathrooms) === 0) && hasBathroomFields(r.property_type, r.rooms)
  );

  console.log(`📊 Нийт ${rows.length} зар · нөхөх ${targets.length} зар\n`);
  if (!targets.length) {
    console.log('✅ Нөхөх зар алга — бүгд утгатай эсвэл дүрэмд нийцэхгүй байна.');
    process.exit(0);
  }

  // 3) 20-аар багцлан update хийх
  let done = 0;
  for (let i = 0; i < targets.length; i += BATCH) {
    const chunk = targets.slice(i, i + BATCH);
    const results = await Promise.all(
      chunk.map((r) => admin.from('listings').update({ bathrooms: valueFor(r) }).eq('id', r.id).select('id').single())
    );
    const failed = results.find((res) => res.error);
    if (failed) {
      console.error(`\n❌ Шинэчлэхэд алдаа: ${failed.error.message}`);
      process.exit(1);
    }
    done += chunk.length;
    console.log(`   ✓ ${done}/${targets.length}`);
  }

  // 4) Дүн — төрлөөр
  const { data: after } = await admin.from('listings').select('property_type, bathrooms');
  const stats = {};
  (after || []).forEach((r) => {
    const k = r.property_type || '(тодорхойгүй)';
    stats[k] = stats[k] || { total: 0, withBath: 0 };
    stats[k].total += 1;
    if (Number(r.bathrooms) > 0) stats[k].withBath += 1;
  });

  console.log('\n=== Төрөл бүрээр (угаалгын өрөөтэй/нийт) ===');
  Object.entries(stats).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(36)} ${String(v.withBath).padStart(3)} / ${String(v.total).padStart(3)}`);
  });
  console.log('\n🎉 Дууслаа — зарын карт болон дэлгэрэнгүй хуудсанд 🚿 харагдана');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Алдаа:', (err && err.message) || err);
  process.exit(1);
});
