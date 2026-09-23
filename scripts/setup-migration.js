// ============================================================
// setup-migration.js — Аль ч migration SQL-ийг SQL Editor-т бэлдэх
//
// ЯАГААД ГАРААР ВЭ: Supabase нь DDL (`alter table …`) командыг зөвхөн
//   SQL Editor эсвэл Management API (sbp_ token) -аар гүйцэтгэдэг.
//   `service_role` түлхүүрээр PostgREST дамжуулан DDL ажиллуулах
//   БОЛОМЖГҮЙ. (`scripts/apply-schema.js` нь Management API-гаар автоматаар
//   ажиллуулдаг — гэхдээ `.env.local`-д `SUPABASE_ACCESS_TOKEN` шаардана.)
//
// ХЭРХЭН АШИГЛАХ ВЭ:
//   node scripts/setup-migration.js 0011_listing_video.sql
//   → SQL нь clipboard-д орж, Supabase SQL Editor нээгдэнэ
//   → ⌘A ⌫ (хуучин агуулгыг устга) → ⌘V → Run
//
// ⚠️ SQL Editor дотор ХУУЧИН агуулга (draft) байж болзошгүй — заавал
//    бүгдийг устгаад (⌘A ⌫) дараа нь буулгана.
// ============================================================
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const root = path.join(__dirname, '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');
const file = process.argv[2];

if (!file) {
  const all = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  console.log('Ашиглах:  node scripts/setup-migration.js <файл>\n');
  console.log('Боломжит migration-ууд:');
  all.forEach((f) => console.log(`  ${f}`));
  process.exit(0);
}

const sqlPath = path.join(migrationsDir, path.basename(file));
if (!fs.existsSync(sqlPath)) {
  console.error(`❌ Файл олдсонгүй: ${sqlPath}`);
  process.exit(1);
}

// ---- .env.local унших (project ref → SQL Editor линк) ----
const env = {};
try {
  fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n').forEach((l) => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  });
} catch (e) {
  console.error('⚠️  .env.local уншиж чадсангүй.');
}

const projectRef =
  (String(env.NEXT_PUBLIC_SUPABASE_URL || '').match(/https:\/\/([a-z0-9]+)\.supabase\.co/) || [])[1] || '';
const editorUrl = projectRef
  ? `https://supabase.com/dashboard/project/${projectRef}/sql/new`
  : 'https://supabase.com/dashboard';

const sql = fs.readFileSync(sqlPath, 'utf8');

console.log(`📋 ${path.basename(sqlPath)} (${sql.split('\n').length} мөр) бэлдэж байна...\n`);

// 1) Clipboard-д хуулах (macOS: pbcopy)
let copied = false;
try {
  execSync('pbcopy', { input: sql });
  const back = execSync('pbpaste', { encoding: 'utf8' });
  copied = back.trim() === sql.trim();
  if (copied) console.log('✅ SQL нь CLIPBOARD-д орлоо — ⌘V хийхэд бэлэн ✨');
  else console.log('⚠️  Clipboard-д хуулсан эсэхийг баталж чадсангүй — SQL-ийг доороос хуулна уу.');
} catch (e) {
  copied = false;
}

if (!copied) {
  console.log('\n----- SQL-ийг доороос хуулна уу -----');
  console.log(sql);
  console.log('----- төгсгөл -----');
}

console.log('\nХИЙХ 4 АЛХАМ (30 секунд):');
console.log('  1) Доор нээгдэх Supabase цонх дээр «SQL Editor» нээгдэнэ');
console.log('  2) ⌘A → ⌫ Delete     ← ХУУЧИН агуулгыг БҮРЭН устгана (заавал!)');
console.log('  3) ⌘V                ← энэ SQL-ийг буулгана');
console.log('  4) «Run» (⌘+Enter)   ← «Success. No rows returned» гарвал бэлэн 🎉');

try {
  spawn('open', [editorUrl], { detached: true, stdio: 'ignore' }).unref();
  console.log(`\n🌐 Нээж байна: ${editorUrl}`);
} catch (e) {
  console.log(`\n🌐 Гараар нээнэ үү: ${editorUrl}`);
}

console.log('\n💡 (Сонголтоор) .env.local-д SUPABASE_ACCESS_TOKEN=sbp_... нэмбэл');
console.log(`   автоматаар ажиллуулж болно:  node scripts/apply-schema.js ${path.basename(sqlPath)}`);
