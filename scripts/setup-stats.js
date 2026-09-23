// ============================================================
// setup-stats.js — «Үзсэн / Таалагдсан» тоолуур БОЛОН өдөр тутмын
//                 хандалтын (📈 Статистик) хүснэгтийг бэлдэх ХЯЛБАР зам
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
//
// ⚠️ ХОЁР файлыг дараалан хуулна (нэг удаагийн Run-д хангалттай):
//      0007_listing_likes_views.sql     ← хүн тус бүрийн үзсэн/таалагдсан
//      0010_listing_activity_daily.sql  ← өдөр тутмын хандалт (график)
// ============================================================
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const root = path.join(__dirname, '..');
const sqlFiles = [
  path.join(root, 'supabase', 'migrations', '0007_listing_likes_views.sql'),
  path.join(root, 'supabase', 'migrations', '0010_listing_activity_daily.sql'),
];

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

  // 0010 — өдөр тутмын хандалтын хүснэгт (📈 Статистик табд шаардлагатай)
  const activity = await fetch(
    `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/listing_activity_daily?select=listing_id&limit=1`,
    { headers }
  );
  const activityOk = activity.ok;
  if (!activityOk) {
    console.log('⚠️  0007 АЖИЛЛАЖ байна, харин 0010 (өдөр тутмын хандалт) ДУТУУ.');
    console.log('   → Үзсэн/таалагдсан тоолуур хэвийн ажиллана.');
    console.log('   → «Миний зарууд → 📈 Статистик» таб зөвхөн «ШИНЭ үзсэн хүн» горимд');
    console.log('     харагдах бөгөөд өдөр тутмын график гарахгүй.');
    console.log('   Засах:  npm run stats:setup  →  Cmd+V  →  Run  (дараа нь stats:check)');
    return false;
  }

  console.log('🎉 Миграцууд АЖИЛЛАЖ БАЙНА — ❤️/👁 тоолуур + 📈 хандалтын статистик.');
  console.log(`   Багана: views ✅  likes ✅    Хүснэгт: listing_likes ✅  listing_views ✅  listing_activity_daily ✅`);
  console.log(`   Одоогийн ❤️ мөрийн тоо: ${Array.isArray(counts) ? counts.length : '?'}`);
  return true;
}

(async () => {
  if (process.argv.includes('--check')) {
    await check();
    return;
  }

  const sql = sqlFiles
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n\n\n/* ============================================================ */\n\n\n');
  console.log('📋 «Үзсэн / Таалагдсан» + «Өдөр тутмын хандалт» SQL бэлдэж байна...\n');

  // 1) Clipboard-д хуулах (macOS: pbcopy)
  let copied = false;
  try {
    execSync('pbcopy', { input: sql });
    // ⚠️ БАТАЛГААЖУУЛАХ: clipboard-д үнэхээр миний SQL орсон эсэх
    const back = execSync('pbpaste', { encoding: 'utf8' });
    copied = back.includes('listing_likes') && back.includes('sync_listing_counters') && back.includes('listing_activity_daily');
    if (copied) {
      console.log(`✅ SQL нь CLIPBOARD-д орлоо (${back.split('\n').length} мөр) — Cmd+V хийхэд бэлэн ✨`);
    } else {
      console.log('⚠️  Clipboard-д хуулсан эсэхийг баталж чадсангүй — SQL-ийг доороос хуулна уу.');
    }
  } catch (e) {
    copied = false;
  }

  console.log('\n⚠️ ХАМГИЙН ЧУХАЛ: SQL Editor дотор ХУУЧИН агуулга байж болзошгүй!');
  console.log('   (Өмнөх ажиллагааны SQL draft хэлбэрээр хадгалагдсан байдаг —');
  console.log('    тэр нь «policy "Public Read Access" already exists» гэх алдаа өгдөг.)\n');

  console.log('ХИЙХ 4 АЛХАМ (30 секунд):');
  console.log('  1) Доор нээгдэх Supabase цонх дээр «SQL Editor» нээгдэнэ');
  console.log('  2) ⌘A  →  ⌫ Delete     ← ХУУЧИН агуулгыг БҮРЭН устгана (заавал!)');
  console.log('  3) ⌘V                  ← миний SQL-ийг буулгана');
  console.log('  4) «Run» (⌘+Enter)     ← «Success. No rows returned» гарвал бэлэн 🎉\n');

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
  console.log('💡 Claude-д алдаа илгээхийн тулд алдааг хуулбал clipboard дахин солигдоно —');
  console.log('   тийм тохиолдолд `npm run stats:setup`-г дахин ажиллуулаарай.');
})();
