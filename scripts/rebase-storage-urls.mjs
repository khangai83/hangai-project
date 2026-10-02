// ============================================================
// rebase-storage-urls.mjs — R2-ийн НИЙТИЙН ДОМЭЙН солигдоход DB-д
// хадгалагдсан URL-уудыг шинэ домэйн рүү шилжүүлнэ
//
// Ажиллуулах:
//   npm run storage:rebase                              # 🔍 DRY-RUN (юу ч бичихгүй)
//   npm run storage:rebase -- --apply                    # ✅ R2_PUBLIC_BASE рүү шинэчилнэ
//   npm run storage:rebase -- --apply --from https://pub-xxx.r2.dev   # зөвхөн тэр домэйныг
//   npm run storage:rebase -- --apply --to https://img.zarlaa.mn      # домэйныг гараар заана
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Зургийн URL нь DB-д БИЧИГДЭЖ хадгалагддаг (`listings.images[]`,
//   `profiles.avatar_url`) тул `R2_PUBLIC_BASE`-ыг сольсон тэр мөчөөс
//   ХУУЧИН бичигдсэн URL-ууд хуучин домэйн дээрээ үлддэг ✗
//   → r2.dev-ийг унтраавал тэр зурагнууд НУРНА. Энэ скрипт зөвхөн DB-ийн
//     БИЧВЭРИЙГ шинэчилнэ — R2/Supabase дээрх файл, түлхүүр ХӨНДӨГДӨХГҮЙ ✓
//
// ⚠️ АЮУЛГҮЙ БАЙДАЛ:
//   • Анхдагч нь DRY-RUN — `--apply` бичихгүй бол юу ч өөрчлөгдөхгүй ✓
//   • Файлын ЗАМ (түлхүүр) өөрчлөгдөхгүй — БУЦААХ боломжтой: эсрэгээр
//     `--from <шинэ> --to <хуучин>` гэж ажиллуулбал хуучин байдалдаа буцна ✓
//   • Supabase-ийн хуучин URL (`/storage/v1/object/public/…`) ХӨНДӨГДӨХГҮЙ —
//     hybrid горим (хуучин=Supabase, шинэ=R2) хэвээр ✓
//   • Storage-ийн бүтэцгүй утга (youtube холбоос, демо placeholder) хэвээр ✓
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { r2Config } from '../lib/r2.mjs';
import { isLegacyStorageUrl, publicBaseOf, rebaseStorageUrl } from '../lib/storageKeys.mjs';

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
const fromArg = args.indexOf('--from');
const toArg = args.indexOf('--to');
const strip = (v) => String(v || '').trim().replace(/\/+$/, '');
const FROM = fromArg >= 0 ? strip(args[fromArg + 1]) : '';
const CFG = r2Config();
const TO = toArg >= 0 ? strip(args[toArg + 1]) : strip(CFG && CFG.publicBase);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function die(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_KEY) die('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY дутуу (.env.local).');
if (!TO) die('Шинэ домэйн олдсонгүй — `R2_PUBLIC_BASE` дутуу (.env.local) эсвэл `--to https://img.example.mn` өгнө үү.');
if (!/^https?:\/\//.test(TO)) die(`Шинэ домэйн буруу хэлбэртэй: "${TO}" (https://-ээр эхлэх ёстой).`);
if (FROM && !/^https?:\/\//.test(FROM)) die(`--from буруу хэлбэртэй: "${FROM}".`);
if (FROM && FROM === TO) die('`--from` болон `--to` ижил — хөрвүүлэх зүйлгүй.');

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

/**
 * Нэг URL-ыг шалгаж, шинэчлэх ёстой бол `{ from, next }`, үгүй бол `null`.
 * ⚠️ `null` = хөндөхгүй (Supabase-ийн хуучин URL эсвэл storage-ийн бүтэцгүй утга)
 */
function plan(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  if (isLegacyStorageUrl(raw)) return null; // hybrid: Supabase-ийнх хэвээр ✓
  const base = publicBaseOf(raw); // storage-ийн бүтэцгүй (youtube/демо) → null
  if (!base || base === TO) return null; // аль хэдийн зөв домэйн ✓
  if (FROM && base !== FROM) return null; // --from шүүлт
  const next = rebaseStorageUrl(raw, base, TO);
  if (!next || next === raw) return null;
  return { from: base, next };
}

/** Хүснэгтээс бүх мөрийг ХУУДАСЛАЖ татна (PostgREST-ийн `max-rows` 1000-аас сэргийлнэ) */
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

const counts = {}; // хуучин домэйн → олдсон URL-ийн тоо
function tally(from) {
  counts[from] = (counts[from] || 0) + 1;
}

/** DB-д хадгалагдсан URL-уудыг шинэ домэйн рүү солино (`APPLY` үед бичнэ) */
async function rebaseDatabaseUrls() {
  const stats = { listingsScanned: 0, listingsUpdated: 0, listingsUrls: 0, profilesScanned: 0, profilesUpdated: 0 };

  // ---- listings.images[] ----
  const listings = await fetchAllRows('listings', 'id, images', 'images');
  for (const row of listings) {
    const images = Array.isArray(row.images) ? row.images : [];
    if (!images.length) continue;
    stats.listingsScanned += 1;
    let changed = 0;
    const mapped = images.map((u) => {
      const p = plan(u);
      if (!p) return u;
      changed += 1;
      tally(p.from);
      return p.next;
    });
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
    const p = plan(row.avatar_url);
    if (!p) continue;
    tally(p.from);
    if (APPLY) {
      const { error } = await admin.from('profiles').update({ avatar_url: p.next }).eq('id', row.id);
      if (error) throw new Error(`profiles.avatar_url шинэчлэхэд алдаа (${row.id}): ${error.message}`);
    }
    stats.profilesUpdated += 1;
  }

  return stats;
}

/** DB-д хэдийнээ шинэ домэйнтой хэдэн URL байгааг тоолно (дүгнэлтэд харуулна) */
async function countCurrent() {
  let n = 0;
  const listings = await fetchAllRows('listings', 'id, images', 'images');
  for (const row of listings) {
    for (const u of Array.isArray(row.images) ? row.images : []) {
      if (publicBaseOf(u) === TO) n += 1;
    }
  }
  return n;
}

async function main() {
  console.log(`\n🔄 R2 нийтийн домэйн rebase — ${APPLY ? '✅ APPLY (DB-д бичнэ)' : '🔍 DRY-RUN (юу ч бичихгүй)'}\n`);
  console.log(`   Bucket:            ${(CFG && CFG.bucket) || '(R2 тохиргоогүй)'}`);
  console.log(`   Шинэ домэйн (→):   ${TO}${toArg >= 0 ? '  [--to]' : '  (R2_PUBLIC_BASE)'}`);
  console.log(`   Шүүлт (from):      ${FROM ? `${FROM}  [--from]` : 'байхгүй — DB-д олдсон БҮХ R2 URL'}`);
  console.log('   ℹ️  R2/Supabase дээрх ФАЙЛ хөндөгдөхгүй — зөвхөн DB-ийн URL-ийн угтвар солигдоно\n');

  const before = await countCurrent();

  let db;
  try {
    db = await rebaseDatabaseUrls();
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }

  const domains = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!domains.length) {
    console.log(`✅ Хуучин домэйнтой URL олдсонгүй — DB цэвэр (шинэ домэйнтой: ${before}) ✓\n`);
    process.exit(0);
  }

  console.log('🌐 DB-д олдсон хуучин домэйнууд:');
  for (const [base, n] of domains) console.log(`   ${base} → ${n} URL`);
  console.log('');
  console.log(`🗄  listings.images:     ${db.listingsUpdated}/${db.listingsScanned} мөр · ${db.listingsUrls} URL`);
  console.log(`🗄  profiles.avatar_url: ${db.profilesUpdated}/${db.profilesScanned} мөр`);
  console.log('─────────────────────────────────────────────');
  console.log(`📊 ДҮГНЭЛТ${APPLY ? '' : ' (DRY-RUN — юу ч солигдоогүй)'}`);
  console.log(`   Солих URL:             ${domains.reduce((s, [, n]) => s + n, 0)}`);
  console.log(`   Хуучин домэйн:         ${domains.length}`);
  console.log(`   Шинэ домэйнтой:        ${before}${APPLY ? ` → ${before + db.listingsUrls + db.profilesUpdated}` : ''}`);
  console.log('─────────────────────────────────────────────');
  if (!APPLY) console.log(`\n▶️  Бичихийн тулд: npm run storage:rebase -- --apply${FROM ? ` --from ${FROM}` : ''}`);
  else console.log('\n✅ DB-ийн URL-ууд шинэ домэйн рүү шилжлээ. Сайтаа шалгана уу: `npm run check:r2`\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Rebase-ийн алдаа:', (err && err.message) || err);
  process.exit(1);
});
