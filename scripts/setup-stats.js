// ============================================================
// setup-stats.js — «Үзсэн / Таалагдсан» тоолуурыг бэлдэх ХЯЛБАР зам
//
// ЯАГААД ГАРААР ВЭ:
//   Supabase нь DDL (`alter table …`) командыг зөвхөн SQL Editor эсвэл
//   Management API (sbp_ token) -аар гүйцэтгэдэг. `service_role` түлхүүрээр
//   PostgREST дамжуулан DDL ажиллуулах БОЛОМЖГҮЙ (туршиж шалгасан: 404/401).
//
// ХЭРХЭН АШИГЛАХ ВЭ:
//   npm run stats:setup   → SQL-ийг clipboard-д хуулж, SQL Editor-ийг нээнэ
//                           (та Cmd+V → Run гэж 2 секунд дарна)
//   npm run stats:check   → миграц ажилласан эсэхийг шалгана
// ============================================================
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const root = path.join(__dirname, '..');
const sqlFile = path.join(root, 'supabase', 'migrations', '0007_listing_likes_views.sql');

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

const projectRef = (String(env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] || '';
const editorUrl = projectRef
  ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
  : 'https://supabase.com/dashboard';

/** Тоолуурын хүснэгт/багана байгаа эсэх */
async function check() {
  const headers = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const cols = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/listings?select=id,views,likes&limit=1`, { headers });
  const colsText = await cols.text();

  if (!cols.ok) {
    console.log('❌ Миграц ажиллаагүй байна — тоолуур 0-д байна (сайт хэвийн ажиллана).');
    console.log(`   Шалтгаан: ${colsText.slice(0, 160)}`);
    console.log('\n   Засах:  npm run stats:setup  →  Cmd+V  →  Run');
    return false;
  }

  const tables = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/listing_likes?select=listing_id&limit=1`, { headers });
  const tables2 = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/listing_views?select=listing_id&limit=1`, { headers });
  if (!tables.ok || !tables2.ok) {
    console.log('⚠️  Багана байна, гэхдээ хүснэгт (listing_likes / listing_views) дутуу.');
    console.log('   → npm run stats:setup  (0007 миграцыг бүтнээр ажиллуулна)');
    return false;
  }

  const counts = await (
    await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/listing_likes?select=listing_id&limit=1000`, { headers })
  ).json();
  console.log('🎉 Миграц АЖИЛЛАЖ БАЙНА — ❤️/👁 тоолуур хүн тус бүрээр ажиллана.');
  console.log(`   Багана: views ✅  likes ✅    Хүснэгт: listing_likes ✅  listing_views ✅`);
  console.log(`   Одоогийн ❤️ мөрийн тоо: ${Array.isArray(counts) ? counts.length : '?'}`);
  return true;
}

(async () => {
  if (process.argv.includes('--check')) {
    await check();
    return;
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log('📋 «Үзсэн / Таалагдсан» тоолуурын SQL бэлдэж байна...\n');

  // 1) Clipboard-д хуулах (macOS: pbcopy)
  let copied = false;
  try {
    execSync('pbcopy', { input: sql });
    copied = true;
  } catch (e) {
    copied = false;
  }

  if (copied) console.log('✅ SQL нь CLIPBOARD-д хуулагдлаа — Cmd+V хийхэд бэлэн ✨\n');

  console.log('ХИЙХ 3 АЛХАМ (20 секунд):');
  console.log('  1) Доор нээгдэх Supabase цонх дээр «SQL Editor» нээгдэнэ');
  console.log('  2) Cmd+V дараад SQL-ээ буулгана');
  console.log('  3) «Run» (эсвэл Cmd+Enter) → «Success. No rows returned» гарвал бэлэн 🎉\n');

  if (!copied) {
    console.log('----- SQL-ийг доороос хуулна уу -----');
    console.log(sql);
    console.log('----- төгсгөл -----\n');
  }

  try {
    spawn('open', [editorUrl], { detached: true, stdio: 'ignore' }).unref();
    console.log(`🌐 Нээж байна: ${editorUrl}`);
  } catch (e) {
    console.log(`🌐 Гараар нээнэ үү: ${editorUrl}`);
  }

  console.log('\nДараа нь шалгах:  npm run stats:check');
})();
