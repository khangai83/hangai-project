// ============================================================
// migrate-storage-to-r2.mjs — Supabase Storage → Cloudflare R2 ШИЛЖИЛТ
//
// Ажиллуулах:
//   npm run storage:migrate                    # 🔍 DRY-RUN (юу ч бичихгүй)
//   npm run storage:migrate -- --apply         # ✅ файл хуулж, DB-ийн URL солино
//   npm run storage:migrate -- --apply --keep-old   # хуучин файлыг Supabase-д үлдээнэ
//   npm run storage:migrate -- --apply --force      # R2 дээр байсан ч дарж бичнэ
//   npm run storage:migrate -- --bucket avatars     # зөвхөн нэг bucket
//
// Юу хийх вэ:
//   ① `listing-images/`, `avatars/` bucket-уудыг бүхэлд нь уншиж (SERVICE_ROLE)
//   ② Объект бүрийг R2 руу ЯГ ИЖИЛ түлхүүрээр хуулна (`<bucket>/<uid>/<file>`)
//   ③ DB-д хадгалагдсан URL-уудыг шинэ домэйн рүү солино:
//        listings.images[]   (массив)
//        profiles.avatar_url (нэг утга)
//   ④ `--keep-old` БИШ бол Supabase-ийн хуучин объектыг устгана
//
// ⚠️ АЮУЛГҮЙ БАЙДАЛ:
//   • Анхдагч нь DRY-RUN — `--apply` бичихгүй бол юу ч өөрчлөгдөхгүй ✓
//   • Файлын ЗАМ (түлхүүр) өөрчлөгдөхгүй тул буцаах боломжтой: R2-д
//     бүрэн хуулагдаагүй бол `--keep-old`-оор хуучныг үлдээгээд дахин
//     ажиллуулж болно ✓
//   • DB шинэчлэлт нь ЗӨВХӨН URL-ийн угтварыг солино — бусад утга хөндөхгүй
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { putObject, listR2Keys, r2Config } from '../lib/r2.mjs';
import { AVATAR_BUCKET, IMAGE_BUCKET, publicStorageUrl, storageKeyFromUrl, STORAGE_BUCKETS } from '../lib/storageKeys.mjs';

// ---- .env.local (script нь Next-гүйгээр ажиллана) ----
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
try {
  fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  });
} catch (e) {
  console.warn('⚠️  .env.local уншиж чадсангүй.');
}

// ---- Аргументууд ----
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const KEEP_OLD = args.includes('--keep-old');
const FORCE = args.includes('--force');
const bucketArg = args.indexOf('--bucket');
const ONLY_BUCKET = bucketArg >= 0 ? args[bucketArg + 1] : null;
const limitArg = args.indexOf('--limit');
const LIMIT = limitArg >= 0 ? Number(args[limitArg + 1]) || 0 : 0;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CFG = r2Config();

function die(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_KEY) die('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY дутуу (.env.local).');
if (!CFG) die('R2 тохиргоо дутуу — эхлээд docs/R2_SETUP.md-ийн дагуу .env.local-аа бөглөнө үү (`npm run check:r2`).');
// ⚠️ Migration нь DB-д ШИНЭ URL БИЧДЭГ (`listings.images[]`,
//    `profiles.avatar_url`) тул нийтийн домэйн ЗААВАЛ хэрэгтэй — хоосон бол
//    «https://R2_PUBLIC_BASE-тохируулаагүй/…» гэсэн ХОГ URL болж, зураг
//    ХЭЗЭЭ Ч харагдахгүй ✗ (DRY-RUN дээр ч зогсооно: «юу болохыг» худлаа
//    харуулахгүйн тулд)
if (!CFG.publicBase) {
  die('R2_PUBLIC_BASE дутуу (.env.local) — нийтийн домэйн бичихгүйгээр migration хийх БОЛОМЖГҮЙ.\n' +
    '     → docs/R2_SETUP.md → 3-р хэсэг (custom domain эсвэл r2.dev)');
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const TARGETS = (ONLY_BUCKET ? [ONLY_BUCKET] : STORAGE_BUCKETS).filter((b) => STORAGE_BUCKETS.includes(b));

function fmtBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}

/** Хуучин URL → шинэ URL (storage БИШ холбоос хэвээр үлдэнэ) */
function remapUrl(url) {
  const key = storageKeyFromUrl(url);
  if (!key) return url;
  return publicStorageUrl(CFG.publicBase, key);
}


/** Түлхүүрээс bucket-ийн нэр */
function bucketOf(key) {
  return String(key).split('/')[0];
}

/**
 * Supabase Storage дахь БҮХ объектыг олно (фолдеруудыг Ч гүйлгэнэ).
 * Зам нь `<uid>/<file>` (2 түвшин) боловч илүү гүн байсан ч алдагдахгүй.
 */
async function listSupabaseObjects(bucket) {
  const out = [];
  async function walk(prefix, depth) {
    let offset = 0;
    for (;;) {
      const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
      if (error) throw new Error(`${bucket} жагсаалт (${prefix || '/'}): ${error.message}`);
      const rows = data || [];
      for (const row of rows) {
        const full = prefix ? `${prefix}/${row.name}` : row.name;
        const isFolder = row.id === null || row.id === undefined;
        if (isFolder) {
          if (depth >= 3) continue;
          await walk(full, depth + 1);
        } else {
          out.push({
            key: `${bucket}/${full}`,
            path: full,
            size: Number(row.metadata && row.metadata.size) || 0,
            type: (row.metadata && (row.metadata.mimetype || row.metadata.contentType)) || 'application/octet-stream',
          });
        }
      }
      if (rows.length < 1000) break;
      offset += rows.length;
    }
  }
  await walk('', 0);
  return out;
}

/** Нэг объектыг Supabase → R2 хуулна */
async function copyOne(obj) {
  const { data, error } = await admin.storage.from(bucketOf(obj.key)).download(obj.path);
  if (error || !data) throw new Error(`татаж чадсангүй: ${(error && error.message) || 'хоосон'}`);
  const buf = Buffer.from(await data.arrayBuffer());
  await putObject(obj.key, buf, obj.type, buf.length);
  return buf.length;
}

/**
 * Хүснэгтээс бүх мөрийг ХУУДАСЛАЖ татна.
 * ⚠️ PostgREST нь нэг хүсэлтэд 1000 мөр л буцаадаг (Supabase-ийн
 *    `max-rows`) тул `.limit(10000)` ХАНГАЛТГҮЙ — эс бөгөөс 1000-аас
 *    цаашхи заруудын URL шинэчлэгдэхгүй үлдэнэ ✗
 */
async function fetchAllRows(table, columns, notNullColumn) {
  const pageSize = 500;
  const out = [];
  for (let from = 0; from < 200000; from += pageSize) {
    const { data, error } = await admin
      .from(table)
      .select(columns)
      .not(notNullColumn, 'is', null)
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table} уншихад алдаа: ${error.message}`);
    const rows = data || [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

/** DB-д хадгалагдсан URL-уудыг шинэ домэйн рүү солино */
async function rewriteDatabaseUrls() {
  const stats = { listingsScanned: 0, listingsUpdated: 0, listingsUrls: 0, profilesScanned: 0, profilesUpdated: 0 };

  // ---- listings.images[] ----
  const listings = await fetchAllRows('listings', 'id, images', 'images');
  for (const row of listings) {
    const images = Array.isArray(row.images) ? row.images : [];
    if (!images.length) continue;
    stats.listingsScanned += 1;
    const mapped = images.map(remapUrl);
    const changed = mapped.filter((u, i) => u !== images[i]).length;
    if (!changed) continue;
    stats.listingsUrls += changed;
    if (APPLY) {
      const { error } = await admin.from('listings').update({ images: mapped }).eq('id', row.id);
      if (error) throw new Error(`listings.images шинэчлэхэд алдаа (${row.id}): ${error.message}`);
    }
    stats.listingsUpdated += 1;
  }

  // ---- profiles.avatar_url ----
  let profiles = [];
  try {
    profiles = await fetchAllRows('profiles', 'id, avatar_url', 'avatar_url');
  } catch (e) {
    console.warn(`⚠️  profiles уншиж чадсангүй (алгаслав): ${e.message}`);
  }
  for (const row of profiles) {
    stats.profilesScanned += 1;
    const next = remapUrl(row.avatar_url);
    if (next === row.avatar_url) continue;
    if (APPLY) {
      const { error } = await admin.from('profiles').update({ avatar_url: next }).eq('id', row.id);
      if (error) throw new Error(`profiles.avatar_url шинэчлэхэд алдаа (${row.id}): ${error.message}`);
    }
    stats.profilesUpdated += 1;
  }

  return stats;
}

async function main() {
  console.log(`\n🪣 Supabase Storage → Cloudflare R2 — ${APPLY ? '✅ APPLY (бичнэ)' : '🔍 DRY-RUN (юу ч бичихгүй)'}\n`);
  console.log(`   R2 bucket:        ${CFG.bucket}`);
  console.log(`   Нийтийн домэйн:   ${CFG.publicBase}`);
  console.log(`   Хуучин файл үлдээх: ${KEEP_OLD ? 'тийм (--keep-old)' : 'үгүй (хуулсны дараа устгана)'}`);
  console.log(`   Дарж бичих:       ${FORCE ? 'тийм (--force)' : 'үгүй (R2 дээр байгаа бол алгасна)'}`);
  console.log(`   Bucket-ууд:       ${TARGETS.join(', ')}${LIMIT ? ` · хязгаар ${LIMIT}/bucket` : ''}\n`);

  // R2 дээр аль хэдийн байгаа түлхүүрүүд (үргэлжлүүлэн ажиллах, давхар хуулахаас сэргийлэх)
  let existing = new Set();
  try {
    existing = new Set((await listR2Keys('', 1000)).map((o) => o.key));
    console.log(`📦 R2 дээр одоо ${existing.size} объект байна\n`);
  } catch (e) {
    console.warn(`⚠️  R2-ийн жагсаалтыг уншиж чадсангүй (алгасна): ${e.message}\n`);
  }

  const summary = { found: 0, copied: 0, bytes: 0, skipped: 0, failed: 0, deleted: 0 };
  const toDelete = {};

  for (const bucket of TARGETS) {
    console.log(`📂 ${bucket}/`);
    let objects = [];
    try {
      objects = await listSupabaseObjects(bucket);
    } catch (e) {
      console.error(`  ❌ ${e.message}`);
      continue;
    }
    if (LIMIT) objects = objects.slice(0, LIMIT);
    summary.found += objects.length;
    console.log(`  ${objects.length} объект · ${fmtBytes(objects.reduce((s, o) => s + o.size, 0))}`);

    for (const obj of objects) {
      if (existing.has(obj.key) && !FORCE) {
        summary.skipped += 1;
        continue;
      }
      if (!APPLY) {
        summary.copied += 1;
        summary.bytes += obj.size;
        (toDelete[bucket] || (toDelete[bucket] = [])).push(obj.path);
        continue;
      }
      try {
        const size = await copyOne(obj);
        summary.copied += 1;
        summary.bytes += size;
        existing.add(obj.key);
        (toDelete[bucket] || (toDelete[bucket] = [])).push(obj.path);
        console.log(`  ✓ ${obj.key} (${fmtBytes(size)})`);
      } catch (e) {
        summary.failed += 1;
        console.error(`  ❌ ${obj.key} — ${e.message}`);
      }
    }
    console.log('');
  }

  // Хуучин объектуудыг устгах (зөвхөн амжилттай хуулагдсаны дараа, --keep-old БИШ үед)
  if (!KEEP_OLD) {
    const planned = Object.entries(toDelete).reduce((s, [, paths]) => s + paths.length, 0);
    if (!planned) {
      console.log('🗑  Устгах хуучин объект байхгүй.\n');
    } else if (!APPLY) {
      console.log(`🗑  (DRY-RUN) Хуулагдсаны дараа ${planned} хуучин объект УСТГАХ байсан\n`);
    } else {
      for (const [bucket, paths] of Object.entries(toDelete)) {
        if (!paths.length) continue;
        const { error } = await admin.storage.from(bucket).remove(paths);
        if (error) console.error(`  ⚠️  ${bucket} устгалт: ${error.message}`);
        else {
          summary.deleted += paths.length;
          console.log(`  🗑  ${bucket}: ${paths.length} хуучин объект устгав`);
        }
      }
      console.log('');
    }
  }

  // DB-ийн URL-ууд
  console.log('🗄  DB-ийн URL-уудыг шинэчлэх...');
  let db;
  try {
    db = await rewriteDatabaseUrls();
  } catch (e) {
    console.error(`  ❌ ${e.message}`);
    process.exit(1);
  }
  console.log(`  listings.images:  ${db.listingsUpdated}/${db.listingsScanned} мөр · ${db.listingsUrls} URL солигдоно`);
  console.log(`  profiles.avatar_url: ${db.profilesUpdated}/${db.profilesScanned} мөр\n`);

  console.log('─────────────────────────────────────────────');
  console.log(`📊 ДҮГНЭЛТ${APPLY ? '' : ' (DRY-RUN — юу ч солигдоогүй)'}`);
  console.log(`   Supabase-д олдсон: ${summary.found} объект`);
  console.log(`   R2 руу хуулагдсан: ${summary.copied} (${fmtBytes(summary.bytes)})`);
  console.log(`   R2 дээр байсан тул алгассан: ${summary.skipped}`);
  console.log(`   Алдаатай:          ${summary.failed}`);
  console.log(`   Устгасан (хуучин): ${summary.deleted}`);
  console.log('─────────────────────────────────────────────');

  if (!APPLY) {
    console.log('\n▶️  Бичихийн тулд: npm run storage:migrate -- --apply');
  } else if (summary.failed) {
    console.log('\n⚠️  Зарим файл хуулагдсангүй — алдааг засаад ДАХИН ажиллуулна уу (байгаа нь алгасагдана ✓)');
  } else {
    console.log('\n✅ Шилжилт дууслаа. Шалгах: npm run check:r2  ·  npm run report:usage');
    if (!KEEP_OLD) console.log('   ℹ️  Supabase Storage-ийн хуучин файлууд устгагдсан — багтаамж чөлөөлөгдлөө ✓');
  }
  process.exit(summary.failed ? 1 : 0);
}

main().catch((err) => {
  console.error('❌ Шилжилтийн алдаа:', (err && err.message) || err);
  process.exit(1);
});

