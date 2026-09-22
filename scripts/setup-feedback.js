// ============================================================
// setup-feedback.js — «Санал хүсэлт» (feedback) миграцуудыг ХЯЛБАР замаар ажиллуулах
//
// ЯАГААД ГАРААР ВЭ:
//   Supabase нь DDL (`create table …`) командыг зөвхөн SQL Editor эсвэл
//   Management API (`sbp_…` token) -аар гүйцэтгэдэг. `service_role` түлхүүрээр
//   PostgREST дамжуулан DDL ажиллуулах БОЛОМЖГҮЙ (404/PGRST205).
//
// ХЭРХЭН АШИГЛАХ ВЭ:
//   npm run feedback:setup   → 0008 + 0009-ийн SQL-ийг clipboard-д хийж,
//                              SQL Editor-ийг нээнэ (Cmd+A → Delete → Cmd+V → Run)
//   npm run feedback:check   → миграц ажилласан эсэхийг шалгана
// ============================================================
const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const root = path.join(__dirname, '..');
const files = [
  'supabase/migrations/0008_feedback.sql',
  'supabase/migrations/0009_feedback_listing.sql',
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

/**
 * Management API-аар DDL автоматаар ажиллуулах.
 * Шаардлага: `.env.local` дотор `SUPABASE_ACCESS_TOKEN=sbp_…`
 *   (Supabase → Account → Access Tokens → Generate new token)
 * ⚠️ Энэ бол DDL ажиллуулах ЦОРЫН ГАНЦ автомат зам — PostgREST/service_role
 *    -ээр `create table` хийх боломжгүй.
 */
async function runViaManagementApi() {
  const token = (env.SUPABASE_ACCESS_TOKEN || '').trim();
  if (!token) return false;
  if (!projectRef) {
    console.error('❌ NEXT_PUBLIC_SUPABASE_URL-ээс project ref олдсонгүй.');
    return false;
  }

  console.log('🚀 SUPABASE_ACCESS_TOKEN олдлоо → миграцуудыг АВТОМАТААР ажиллуулж байна...\n');

  for (const f of files) {
    const sql = fs.readFileSync(path.join(root, f), 'utf8');
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql }),
    });
    const body = await res.text();
    if (res.ok) {
      console.log(`✅ ${f} — амжилттай`);
    } else {
      console.log(`❌ ${f} — HTTP ${res.status}: ${body.slice(0, 400)}`);
      return false;
    }
  }

  // PostgREST-ийн schema cache-г шинэчлэх (DDL-ийн дараа заримдаа хуучирдаг)
  await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: "notify pgrst, 'reload schema';" }),
  });

  await new Promise((r) => setTimeout(r, 1500)); // schema cache-д түр хүлээнэ
  return true;
}

const headers = {
  apikey: env.SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
};

/** Миграцууд ажилласан эсэх */
async function check() {
  const base = env.NEXT_PUBLIC_SUPABASE_URL;

  // 1) feedback хүснэгт
  const t = await fetch(`${base}/rest/v1/feedback?select=id&limit=1`, { headers });
  if (!t.ok) {
    console.log('❌ `feedback` хүснэгт БАЙХГҮЙ → 0008 миграц ажиллаагүй байна.');
    console.log(`   Шалтгаан (HTTP ${t.status}): ${(await t.text()).slice(0, 160)}`);
    console.log('\n   Засах:  npm run feedback:setup  →  SQL Editor дээр Cmd+A → Delete → Cmd+V → Run');
    return false;
  }
  console.log('✅ `feedback` хүснэгт байна (0008 ажилласан).');

  // 2) listing_id багана (0009)
  const c = await fetch(`${base}/rest/v1/feedback?select=id,listing_id&limit=1`, { headers });
  if (!c.ok) {
    console.log('⚠️  `listing_id` багана БАЙХГҮЙ → 0009 миграц ажиллаагүй.');
    console.log('   (Зарын гомдол listing_id-гүйгээр хадгалагдаж, ID нь гарчигт бичигдэнэ — сайт эвдрэхгүй.)');
    console.log('\n   Засах:  npm run feedback:setup  →  Cmd+A → Delete → Cmd+V → Run');
    return false;
  }
  console.log('✅ `listing_id` багана байна (0009 ажилласан) — зарын гомдол зартай холбогдоно.');

  const rows = await (await fetch(`${base}/rest/v1/feedback?select=id&limit=1000`, { headers })).json();
  console.log(`🎉 Бүх миграц ажиллаж байна. Одоогийн саналын тоо: ${Array.isArray(rows) ? rows.length : '?'}`);
  return true;
}

(async () => {
  if (process.argv.includes('--check')) {
    await check();
    return;
  }

  // 1) Автомат зам: SUPABASE_ACCESS_TOKEN байвал (эсвэл --auto)
  const wantsAuto = process.argv.includes('--auto') || !!env.SUPABASE_ACCESS_TOKEN;
  if (wantsAuto) {
    const ok = await runViaManagementApi();
    if (ok) {
      await check();
      return;
    }
    if (!env.SUPABASE_ACCESS_TOKEN) {
      console.log('\n⚠️  `SUPABASE_ACCESS_TOKEN` байхгүй тул автомат зам ажиллахгүй → гараар хийх заавар руу шилжлээ.');
      console.log('    Токен авах: Supabase Dashboard → Account → Access Tokens → Generate new token');
      console.log('    Тэгээд `.env.local`-д: SUPABASE_ACCESS_TOKEN=sbp_... гэж нэмнэ.\n');
    } else {
      console.log('\n⚠️ Автомат ажиллагаа амжилтгүй — доорх гараар хийх зааврыг ашиглана уу.\n');
    }
  }

  // Хоёр миграцыг + schema cache reload-ийг НЭГ paste-аар ажиллуулахын тулд нэгтгэнэ
  // ⚠️ `notify pgrst` нь ЧУХАЛ: DDL-ийн дараа PostgREST-ийн schema cache хуучирч,
  //    «Could not find the table … in the schema cache» (PGRST205) алдаа гарсаар
  //    байж болно. Энэ мөр cache-г шууд шинэчилнэ.
  // ⚠️ Миграцууд `if not exists` / `drop … if exists` хэлбэртэй тул ДАХИН
  //    ажиллуулахад аюулгүй (idempotent) — давхардаж алдаа өгөхгүй.
  const sql = `${files
    .map((f) => `-- ===== ${f} =====\n${fs.readFileSync(path.join(root, f), 'utf8')}`)
    .join('\n\n')}

-- ============================================================
-- PostgREST-ийн schema cache-г шинэчлэх (DDL-ийн дараа ЗААВАЛ хэрэгтэй байж болно)
-- ============================================================
notify pgrst, 'reload schema';

-- ----- Шалгах (доорх нь тоо буцаана; 0 байвал хүснэгт үүссэн гэсэн үг) -----
select count(*) as feedback_rows from public.feedback;
`;

  console.log('📋 «Санал хүсэлт» миграцуудыг (0008 + 0009) бэлдэж байна...\n');

  let copied = false;
  try {
    execSync('pbcopy', { input: sql });
    const back = execSync('pbpaste', { encoding: 'utf8' });
    copied = back.includes('public.feedback') && back.includes('listing_id');
    console.log(
      copied
        ? `✅ SQL нь CLIPBOARD-д орлоо (${back.split('\n').length} мөр) — Cmd+V хийхэд бэлэн ✨`
        : '⚠️  Clipboard-д хуулсан эсэхийг баталж чадсангүй — SQL-ийг доороос хуулна уу.'
    );
  } catch (e) {
    copied = false;
  }

  console.log('\n⚠️ ХАМГИЙН ЧУХАЛ: SQL Editor дотор ХУУЧИН агуулга байж болзошгүй!');
  console.log('   Тиймээс эхлээд ⌘A → ⌫ Delete хийж, хуучин агуулгыг БҮРЭН устгана уу.\n');

  console.log('ХИЙХ 4 АЛХАМ (30 секунд):');
  console.log('  1) Доор нээгдэх Supabase цонх дээр «SQL Editor» нээгдэнэ');
  console.log('  2) ⌘A  →  ⌫ Delete     ← ХУУЧИН агуулгыг БҮРЭН устгана (заавал!)');
  console.log('  3) ⌘V                  ← 0008 + 0009 + schema-reload буулгана');
  console.log('  4) «Run» (⌘+Enter)     ← доод талд `feedback_rows | 0` гарвал БЭЛЭН 🎉\n');
  console.log('ℹ️ SQL нь idempotent (if not exists / drop policy if exists) тул');
  console.log('   өмнө нь ажиллуулсан байсан ч ДАХИН ажиллуулж болно — алдаа өгөхгүй.\n');

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

  console.log('\nДараа нь шалгах:  npm run feedback:check');
})();
