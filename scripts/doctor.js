// ============================================================
// doctor.js — «Юу эвдэрсэн бэ?» 1 командаар шалгах оношлогоо
//
// Ажиллуулах:  npm run doctor
//
// ХАМГИЙН ГОЛ ШАЛГАЛТ: HTML нь дууддаг `/_next/static/...` файлууд
// үнэхээр 200 буцааж байна уу? Хэрэв 404 бол Next.js-ийн client bundle
// эвдэрсэн → React hydrate болохгүй → хуудас «ачаалж байна...» дээр мөнхөрнө.
// Яг энэ тохиолдолд засварын командуудыг шууд хэвлэнэ.
// ============================================================
const fs = require('fs');
const path = require('path');

const BASE = process.env.DOCTOR_URL || 'http://localhost:3000';
const ROOT = path.join(__dirname, '..');

const row = (icon, label, detail) => console.log(`${icon} ${label}${detail ? `\n     ${detail}` : ''}`);
let problems = 0;

async function status(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    return res.status;
  } catch (e) {
    return 0;
  }
}

(async () => {
  console.log('🩺 ZAR.mn — оношлогоо\n');

  // ---------- 1. Dev server ----------
  const home = await status(`${BASE}/`);
  if (!home) {
    row('❌', 'Dev server ажиллахгүй байна', `→ npm run dev  (эсвэл: pkill -f 'next dev' && npm run dev)`);
    problems += 1;
    process.exit(1);
  }
  row('✅', `Dev server ажиллаж байна (/) → HTTP ${home}`);

  // ---------- 2. HTML-ийн дууддаг asset-ууд ----------
  const html = await (await fetch(`${BASE}/`, { cache: 'no-store' })).text();
  const assets = [...new Set(html.match(/\/_next\/static\/[^"?\s]*/g) || [])].sort();

  const broken = [];
  for (const a of assets) {
    const s = await status(`${BASE}${a}`);
    if (s !== 200) broken.push(`${a}  → HTTP ${s}`);
  }

  if (broken.length) {
    row('❌', `Client bundle ЭВДЭРСЭН — ${broken.length}/${assets.length} файл 404`, broken.join('\n     '));
    problems += 1;
  } else {
    row('✅', `Client bundle эрүүл — ${assets.length}/${assets.length} файл 200`);
  }

  // ---------- 3. Дискэн дээр ----------
  const pageChunk = path.join(ROOT, '.next/static/chunks/app/page.js');
  const mainApp = path.join(ROOT, '.next/static/chunks/main-app.js');
  const missing = [pageChunk, mainApp].filter((f) => !fs.existsSync(f)).map((f) => path.relative(ROOT, f));
  if (missing.length) {
    row('❌', `Дискэн дээр chunk байхгүй: ${missing.join(', ')}`);
    problems += 1;
  } else {
    row('✅', 'Дискэн дээр chunk-ууд байна');
  }

  // ---------- 4. .env.local ----------
  const envPath = path.join(ROOT, '.env.local');
  const needed = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'VERIFY_MN_API_KEY'];
  if (!fs.existsSync(envPath)) {
    row('❌', '.env.local байхгүй', '→ cp .env.local.example .env.local  (дараа нь утгуудыг бөглөнө)');
    problems += 1;
  } else {
    const envText = fs.readFileSync(envPath, 'utf8');
    const empty = needed.filter((k) => {
      const m = envText.match(new RegExp(`^${k}=(.*)$`, 'm'));
      return !m || !m[1].trim() || m[1].includes('TANII_');
    });
    if (empty.length) {
      row('⚠️ ', `.env.local-д дутуу/хоосон: ${empty.join(', ')}`);
    } else {
      row('✅', '.env.local — 4 хувьсагч бүгд бөглөгдсөн');
    }
  }

  // ---------- 5. API ----------
  const apiStatus = await (async () => {
    try {
      const r = await fetch(`${BASE}/api/auth/status`, { cache: 'no-store' });
      return r.ok ? await r.json() : null;
    } catch (e) {
      return null;
    }
  })();
  if (apiStatus) {
    row('✅', `API ажиллаж байна — verify.mn: ${apiStatus.verifyMnConfigured ? 'тохируулсан' : 'ДУТУУ'}, горим: ${apiStatus.loginMode}`);
    if (!apiStatus.verifyMnConfigured) {
      row('⚠️ ', 'VERIFY_MN_API_KEY тохируулаагүй → бүртгэлийн SMS ажиллахгүй');
    }
  }

  // ---------- Дүгнэлт ----------
  console.log('');
  if (problems === 0) {
    console.log('🎉 Бүх зүйл эрүүл байна. Хэрэв browser дээр алдаа гарвал Cmd+Shift+R (hard refresh) хийнэ.');
    process.exit(0);
  }

  console.log('🔧 ЗАСВАР (дарааллаар нь ажиллуулна):');
  console.log('');
  console.log("   # 1) БҮХ dev server-ээ зогсоо (нэг л процесс ажиллах ёстой)");
  console.log("   pkill -f 'next dev'");
  console.log('');
  console.log('   # 2) Эвдэрсэн кэшийг устга');
  console.log('   rm -rf .next');
  console.log('');
  console.log('   # 3) Дахин эхлүүл');
  console.log('   npm run dev');
  console.log('');
  console.log('   # 4) Browser дээр Cmd+Shift+R (hard refresh)');
  console.log('');
  console.log('   # 5) Дахин шалга');
  console.log('   npm run doctor');
  process.exit(1);
})().catch((err) => {
  console.error('❌ Оношлогооны алдаа:', (err && err.message) || err);
  process.exit(1);
});
