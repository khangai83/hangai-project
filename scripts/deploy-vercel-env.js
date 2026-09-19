// ============================================================
// deploy-vercel-env.js — Vercel дээр env хувьсагчдыг НЭГ командаар тавих
//
// Ажиллуулах: npm run deploy:vercel
//
// ШААРДЛАГАТАЙ (30 секунд):
//   1) https://vercel.com/account/tokens → "Create Token" → хуулж аваад
//   2) .env.local файлд нэмнэ:  VERCEL_TOKEN=xxxxxxxxxxxx
//
// Юу хийдэг вэ:
//   1. .env.local-аас 4 утгыг уншина (URL, anon, service_role, verify.mn)
//   2. Vercel API-аар project-оо олно
//   3. 4 env-ийг Production + Preview + Development-д тавина (байвал шинэчилнэ)
//   4. Шинэ deployment эхлүүлнэ — NEXT_PUBLIC_* нь BUILD үед шингэдэг тул
//      env нэмсний дараа ЗААВАЛ шинэ deploy хэрэгтэй
//   5. Хэдэн секунд хүлээгээд /api/auth/status-аар шалгана
//
// ⚠️ VERCEL_TOKEN нь НУУЦ — .env.local-д байдаг (gitignore-д) тул GitHub руу орохгүй.
// ============================================================
const fs = require('fs');
const path = require('path');

const API = 'https://api.vercel.com';

const ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VERIFY_MN_API_KEY',
];
const TARGETS = ['production', 'preview', 'development'];

// ---- .env.local унших ----
const env = {};
try {
  (fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8') || '')
    .split('\n')
    .forEach((l) => {
      const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m) env[m[1]] = m[2];
    });
} catch (e) {
  console.error('⚠️  .env.local уншиж чадсангүй.');
}

const TOKEN = env.VERCEL_TOKEN || process.env.VERCEL_TOKEN;
const PROJECT_NAME = env.VERCEL_PROJECT_NAME || process.env.VERCEL_PROJECT_NAME || 'hangai-project';

if (!TOKEN) {
  console.error('❌ VERCEL_TOKEN олдсонгүй.\n');
  console.error('   Хэрхэн авах вэ (30 секунд):');
  console.error('   1) https://vercel.com/account/tokens → "Create Token"');
  console.error('   2) Хуулсан токеныг .env.local файлд нэмнэ:');
  console.error('        VERCEL_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxx');
  console.error('   3) Дахин ажиллуулна: npm run deploy:vercel\n');
  console.error('   ⚠️ Токен нь зөвхөн таны компьютер дээр үлдэнэ (gitignore).');
  process.exit(1);
}

async function api(pathname, options = {}) {
  const res = await fetch(`${API}${pathname}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

(async () => {
  console.log('🚀 Vercel тохиргоог автоматаар тавьж байна...\n');

  // ---------- 0. Утгууд бүрэн эсэх ----------
  const missing = ENV_KEYS.filter((k) => !env[k]);
  if (missing.length) {
    console.error(`❌ .env.local-д дутуу: ${missing.join(', ')}`);
    process.exit(1);
  }

  // ---------- 1. Project олох ----------
  const projects = await api('/v9/projects?limit=100');
  if (!projects.ok) {
    console.error(`❌ Vercel API алдаа (HTTP ${projects.status}): ${JSON.stringify(projects.data).slice(0, 300)}`);
    console.error('   → Токен хүчингүй эсвэл буруу байж магадгүй.');
    process.exit(1);
  }
  const list = projects.data.projects || [];
  const project = list.find((p) => p.name === PROJECT_NAME);
  if (!project) {
    console.error(`❌ «${PROJECT_NAME}» нэртэй project олдсонгүй.`);
    console.error('   Байгаа project-ууд: ' + list.map((p) => p.name).join(', '));
    console.error('   Зөв нэрийг .env.local-д VERCEL_PROJECT_NAME=<нэр> гэж тавина.');
    process.exit(1);
  }
  console.log(`✅ Project олдлоо: ${project.name} (${project.id})\n`);

  // ---------- 2. Одоо байгаа env-үүд ----------
  const existing = await api(`/v9/projects/${project.id}/env?decrypt=false&limit=100`);
  const existingByKey = new Map();
  ((existing.data && existing.data.envs) || []).forEach((e) => existingByKey.set(e.key, e));
  console.log(`   Одоо байгаа env: ${[...existingByKey.keys()].join(', ') || '(хоосон)'}\n`);

  // ---------- 3. Env тус бүрийг үүсгэх / шинэчлэх ----------
  for (const key of ENV_KEYS) {
    const value = env[key];
    const found = existingByKey.get(key);

    if (found) {
      const r = await api(`/v9/projects/${project.id}/env/${found.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ value, target: TARGETS }),
      });
      console.log(`${r.ok ? '♻️ ' : '❌'} ${key} — шинэчлэв${r.ok ? '' : ` (HTTP ${r.status})`}`);
    } else {
      const r = await api(`/v10/projects/${project.id}/env`, {
        method: 'POST',
        body: JSON.stringify({ key, value, type: 'encrypted', target: TARGETS }),
      });
      console.log(
        `${r.ok ? '✅' : '❌'} ${key} — нэмэв${r.ok ? '' : ` (HTTP ${r.status}) ${JSON.stringify(r.data).slice(0, 200)}`}`
      );
    }
  }

  // ---------- 4. Шинэ deployment (env нь build үед шингэдэг тул ЗААВАЛ) ----------
  console.log('\n🔄 Шинэ deployment эхлүүлж байна...');
  const repoId = project.link && project.link.repoId;
  const ref = (project.link && project.link.productionBranch) || 'main';
  let deployed = false;

  if (repoId) {
    const dep = await api('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({
        name: project.name,
        project: project.id,
        target: 'production',
        gitSource: { type: 'github', repoId, ref },
      }),
    });
    if (dep.ok) {
      deployed = true;
      console.log(`✅ Deployment эхэллээ: ${dep.data.url || dep.data.id}`);
    } else {
      console.log(`⚠️  Автомат deploy амжилтгүй (HTTP ${dep.status}): ${JSON.stringify(dep.data).slice(0, 200)}`);
    }
  }

  if (!deployed) {
    console.log('⚠️  Автомат deploy хийж чадсангүй — гараар 1 удаа дарна уу:');
    console.log(`   https://vercel.com/dashboard → ${project.name} → Deployments → ⋯ → Redeploy`);
    console.log('   Эсвэл: git commit --allow-empty -m "chore: redeploy env" && git push');
  }

  // ---------- 5. Шалгах ----------
  const siteUrl = `https://${project.name}.vercel.app`;
  console.log(`\n⏳ Шалгаж байна (${siteUrl}/api/auth/status) — хамгийн ихдээ 90 секунд...`);
  for (let i = 0; i < 18; i += 1) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await fetch(`${siteUrl}/api/auth/status`, { cache: 'no-store' });
      const d = await res.json();
      if (d && d.verifyMnConfigured === true) {
        console.log(`\n\n🎉 БЭЛЭН! ${siteUrl}`);
        console.log(`   ${JSON.stringify(d)}`);
        console.log('\n   Одоо сайт дээр Бүртгүүлэх / Нэвтрэх ажиллана ✅');
        process.exit(0);
      }
      process.stdout.write('.');
    } catch (e) {
      process.stdout.write('.');
    }
  }

  console.log('\n\n⚠️  verifyMnConfigured=true хараахан болоогүй (deploy удаан байж болно).');
  console.log(`   Хэдэн минутын дараа дахин шалгана уу: curl -s ${siteUrl}/api/auth/status`);
  process.exit(0);
})().catch((err) => {
  console.error('❌ Алдаа:', (err && err.message) || err);
  process.exit(1);
});

