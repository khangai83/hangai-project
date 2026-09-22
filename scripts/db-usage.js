// ============================================================
// db-usage.js — Supabase-ийн ОДООГИЙН багтаамжийн хэрэглээг хэмжих
//
// Ажиллуулах:
//   npm run report:usage
//   (эсвэл: node scripts/db-usage.js)
//
// Юу хэмжих вэ (бүгд READ-ONLY — юу ч өөрчлөхгүй):
//   1. Хүснэгт бүрийн мөрийн тоо (listings, profiles, listing_likes, listing_views)
//   2. DB-д эзлэх ойролцоо хэмжээ (мөрүүдийг JSON болгож хэмжих — дээрээс тооцсон)
//   3. Storage (`listing-images` bucket)-ийн файлын тоо ба нийт хэмжээ
//   4. Supabase Free / Pro планын лимиттэй харьцуулж, хэдэн зар багтахыг тооцох
//
// ⚠️ ЯАГААД ОЙРОЛЦОО ВЭ:
//   PostgREST нь SQL (`pg_database_size()`) ажиллуулах боломжгүй. Тиймээс
//   `select *`-ээр мөрүүдийг татаж JSON уртыг хэмжинэ — энэ нь Postgres-ийн
//   бодит эзлэхүүнээс арай ТОМ (JSON нь талбар бүрийг нэрлэдэг) тул
//   «дээд хязгаар» гэж ойлгоно уу.
// ============================================================
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// ---- .env.local унших ----
const env = {};
try {
  fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n').forEach((l) => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  });
} catch (e) {
  console.error('⚠️  .env.local уншиж чадсангүй.');
}

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BUCKET = 'listing-images';

// Supabase-ийн лимитүүд (supabase.com/pricing)
const PLANS = {
  free: { dbMB: 500, storageMB: 1024, egressGB: 5, label: 'Free (үнэгүй)' },
  pro: { dbMB: 8 * 1024, storageMB: 100 * 1024, egressGB: 250, label: 'Pro ($25/сар)' },
};

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

function fmtBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i += 1; }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}

/** Хүснэгтийн мөрийн тоо + JSON хэмжээ (дээд хязгаар) */
async function tableStats(table, select = '*') {
  let count = null;
  try {
    const res = await fetch(`${URL_}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=1`, {
      headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
    });
    const range = res.headers.get('content-range'); // "0-0/123"
    if (range && range.includes('/')) {
      const n = Number(range.split('/')[1]);
      if (Number.isFinite(n)) count = n;
    }
  } catch (e) { /* доорх query-д алдаа гарвал count = null */ }

  let bytes = 0;
  let rows = [];
  try {
    const res = await fetch(`${URL_}/rest/v1/${table}?select=${encodeURIComponent(select)}&limit=5000`, { headers });
    if (res.ok) {
      rows = await res.json();
      bytes = rows.reduce((s, r) => s + Buffer.byteLength(JSON.stringify(r), 'utf8'), 0);
    }
  } catch (e) { /* хүснэгт байхгүй байж болно */ }

  return { count: count == null ? rows.length : count, bytes, sampled: rows.length };
}

/** Storage bucket-ийн нийт хэмжээ (виртуал хавтаснуудыг рекурсээр нэвтэрнэ) */
async function bucketUsage(prefix = '', depth = 0) {
  if (depth > 4) return { files: 0, bytes: 0 };
  let files = 0;
  let bytes = 0;
  let offset = 0;
  for (;;) {
    const res = await fetch(`${URL_}/storage/v1/object/list/${BUCKET}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prefix, limit: 100, offset, sortBy: { column: 'name', order: 'asc' } }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      if (!/not found|NoSuchBucket/i.test(txt)) console.warn(`   ⚠️  Storage list: HTTP ${res.status} ${txt.slice(0, 120)}`);
      return { files, bytes };
    }
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    for (const it of items) {
      const size = it.metadata && Number(it.metadata.size);
      if (it.metadata == null && !it.id) {
        const sub = await bucketUsage(prefix ? `${prefix}${it.name}/` : `${it.name}/`, depth + 1);
        files += sub.files;
        bytes += sub.bytes;
      } else {
        files += 1;
        if (Number.isFinite(size)) bytes += size;
      }
    }
    if (items.length < 100) break;
    offset += 100;
  }
  return { files, bytes };
}

async function main() {
  if (!URL_ || !KEY) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY дутуу.');
    process.exit(1);
  }
  const projectRef = (String(URL_).match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] || '';
  console.log('📊 Supabase багтаамжийн тайлан');
  console.log(`   Төсөл: ${projectRef || URL_}\n`);

  const tables = {};
  for (const t of ['listings', 'profiles', 'listing_likes', 'listing_views']) {
    tables[t] = await tableStats(t, t === 'listings' ? '*' : 'id');
  }

  console.log('🗄  DB хүснэгтүүд (JSON дээр үндэслэсэн ОЙРОЛЦОО дээд хязгаар):');
  let dbBytes = 0;
  for (const [name, s] of Object.entries(tables)) {
    dbBytes += s.bytes;
    console.log(
      `   ${name.padEnd(15)} ${String(s.count).padStart(7)} мөр  ${fmtBytes(s.bytes).padStart(10)}` +
      `  (дундаж ${s.count ? fmtBytes(s.bytes / s.count) : '—'}/мөр)`
    );
  }
  console.log(`   НИЙТ                ${' '.repeat(7)}      ${fmtBytes(dbBytes).padStart(10)}`);

  const storage = await bucketUsage();
  console.log(`\n🖼  Storage «${BUCKET}»: ${storage.files} файл, ${fmtBytes(storage.bytes)}`);
  if (storage.files === 0) {
    console.log('   (Демо зарууд нь Storage биш `public/uploads/*.svg` ашигладаг тул хоосон байна)');
  }

  const avgListing = tables.listings.bytes / Math.max(1, tables.listings.count);
  const avgImg = storage.files ? storage.bytes / storage.files : 250 * 1024;

  console.log('\n📐 Багтаамжийн тооцоо (нэг зар дунджаар 3.5 зураг гэж үзэв):');
  for (const p of Object.values(PLANS)) {
    const dbCap = (p.dbMB * 1024 * 1024) / Math.max(1, avgListing);
    const imgCap = (p.storageMB * 1024 * 1024) / Math.max(1, avgImg);
    console.log(`   ${p.label}`);
    console.log(`     • DB:      ~${Math.round(dbCap).toLocaleString('en-US')} зар (нэг зар ~${fmtBytes(avgListing)}, зураггүй — зөвхөн текст + URL)`);
    console.log(`     • Storage: ~${Math.round(imgCap).toLocaleString('en-US')} зураг = ~${Math.round(imgCap / 3.5).toLocaleString('en-US')} зар (~${fmtBytes(avgImg)}/зураг)`);
    console.log(`     • Egress (трафик): ${p.egressGB} GB/сар`);
  }

  console.log('\nℹ️  Бодит хязгаар нь ихэвчлэн STORAGE ба EGRESS (трафик):');
  console.log('   • Нүүр хуудас нэг ачаалахад ~300 мөр татдаг (~300 KB) → Free-ийн 5 GB/сар');
  console.log('     нь ойролцоогоор 15,000 хуудас үзэлт.');
  console.log('   • Supabase Dashboard → Database → Size-ээс БОДИТ хэмжээг харна уу.');
}

main().catch((err) => {
  console.error('❌ Алдаа:', (err && err.message) || err);
  process.exit(1);
});
