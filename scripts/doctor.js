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

/**
 * HTTP сервер сонсож байгаа node процессуудын портууд.
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-09-29, бодит тохиолдол): `npm run dev` дуудахад
 * 3000 порт дүүрсэн байвал Next нь 3001 дээр АСААЛААД, browser нь хуучин
 * (эвдэрсэн) 3000 дээрх хуудсаа харуулж «Заруудыг ачаалж байна...» дээр
 * мөнхөрнө ✗. Chrome руу `localhost:3001` гэж зааж өгөхгүй бол хэрэглэгч
 * ямар ч өөрчлөлт харахгүй ✓.
 */
function listeningPorts() {
  try {
    const { execSync } = require('child_process');
    const out = execSync('lsof -nP -iTCP -sTCP:LISTEN', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const ports = new Set();
    for (const line of out.split('\n')) {
      if (!/^(node|next)/.test(line)) continue;
      const m = line.match(/TCP\s+\S*:(\d+)\s+\(LISTEN\)/);
      if (m) ports.add(Number(m[1]));
    }
    return [...ports].sort((a, b) => a - b);
  } catch (e) {
    return [];
  }
}

(async () => {
  console.log('🩺 Зарлаа.mn — оношлогоо\n');

  // ---------- 0. АЛЬ ПОРТ ДЭЭР SERVER АЖИЛЛАЖ БАЙНА (эхэнд нь!) ----------
  // ⚠️ 3000 дүүрсэн үед Next нь 3001/3002 … рүү ШИЛЖДЭГ. Хэрэглэгч хуучин
  //    (эвдэрсэн эсвэл өөр) порт дээрх хуудсаа харсаар байвал «яагаад удаад
  //    байна / юу ч өөрчлөгдөхгүй байна» гэж бодно ✗ → эхэнд нь хэлнэ ✓.
  const ports = listeningPorts().filter((p) => p >= 3000 && p <= 3010);
  const basePort = Number(new URL(BASE).port || 80);

  // ---------- 1. Dev server ----------
  // ⚠️ 2026-09-29 (бодит тохиолдол): `next build` нь АЖИЛЛАЖ БАЙГАА `next dev`-ийн
  //    `.next`-ийг дарж бичдэг → dev server `_next/server/pages/_document.js`
  //    олохгүй болж, БҮХ хуудас **500** буцаана ✗. Browser дээр HTML нь хуучин
  //    хэвээрээ үлдэж «Заруудыг ачаалж байна...» дээр мөнхөрнө (client bundle
  //    ачаалагдахгүй) → ХОЛБООНЫ алдаа мэт харагдана ✗.
  //    Тиймээс `200` БИШ бүх статусыг АЛДАА гэж үзнэ ✓.
  const home = await status(`${BASE}/`);
  if (!home) {
    row('❌', `Dev server ажиллахгүй байна (${BASE})`);
    if (ports.length) {
      row('   ', `Харин порт ${ports.join(', ')} дээр server АЖИЛЛАЖ БАЙНА → browser дээр http://localhost:${ports[0]} нээгээрэй`);
    } else {
      row('   ', "→ npm run dev  (эсвэл: pkill -f 'next dev'; pkill -f 'next-server' && npm run dev)");
    }
    problems += 1;
    process.exit(1);
  }
  if (home !== 200) {
    const body = await fetch(`${BASE}/`, { cache: 'no-store' }).then((r) => r.text()).catch(() => '');
    const enoent = (body.match(/ENOENT[^"\\]*/) || [])[0];
    row('❌', `Dev server АЛДАА буцааж байна (/) → HTTP ${home}`);
    if (enoent) {
      row('   ', 'Шалтгаан: .next-ийг `next build` дарж бичсэн (dev server-ийн _document.js алга)');
      row('   ', `Серверийн алдаа: ${enoent.slice(0, 120)}`);
    }
    row('   ', "Засвар: pkill -f 'next dev' && rm -rf .next && npm run dev  → дараа нь Cmd+Shift+R");
    problems += 1;
  } else {
    row('✅', 'Dev server ажиллаж байна (/) → HTTP 200');
  }

  // ---------- 1б. ХЭД ХЭДЭН порт / буруу порт ----------
  // (портуудыг дээр, §0-д аль хэдийн уншсан ✓)
  if (ports.length > 1) {
    row('⚠️ ', `ХЭД ХЭДЭН порт дээр server ажиллаж байна: ${ports.join(', ')}`);
    row('   ', `→ Browser дээр НЭГ л хаяг нээгээрэй (шалгаж байгаа хаяг: ${BASE})`);
    row('   ', "   Хуучин процессыг хаа: pkill -f 'next dev'; pkill -f 'next-server'");
    problems += 1;
  } else if (ports.length === 1 && ports[0] !== basePort) {
    row('⚠️ ', `${BASE} дээр server БАЙХГҮЙ — харин порт ${ports[0]} дээр ажиллаж байна`);
    row('   ', `→ Browser дээр http://localhost:${ports[0]} нээгээрэй (эсвэл хуучин процессыг хааж дахин эхлүүлээрэй)`);
    problems += 1;
  } else if (ports.length === 1) {
    row('✅', `Зөвхөн 1 server ажиллаж байна (порт ${ports[0]})`);
  }

  // ---------- 2. HTML-ийн дууддаг asset-ууд ----------
  const html = await (await fetch(`${BASE}/`, { cache: 'no-store' })).text();
  // ⚠️ Next.js нь RSC flight payload (`self.__next_f.push([1,"…"])`) дахь урт мөрийг
  //    2 `<script>`-ын ХООРОНД хуваадаг (ж: `…/css/app/la` ‖ `yout.css?v=…`). Тиймээс
  //    түүхий HTML-ээс `\/_next\/static\/[^"?\s]*` regex-ээр татахад `/_next/static/css/app/la`
  //    гэсэн ХИЙСВЭР (тасархай) зам гарч ирээд 404 болдог → ХУУЧААР «client bundle
  //    ЭВДЭРСЭН» гэж ХУУРАМЧ дохиолдог байв ✗ (ж: 2026-10-03). Жинхэнэ файл ЗААВАЛ
  //    өргөтгөлтэй (`.js`/`.css`/… тул) → зөвхөн өргөтгөлтэй замыг л тооцно ✓.
  const assets = [...new Set(html.match(/\/_next\/static\/[^"?\s]*/g) || [])]
    .filter((a) => /\.(js|mjs|cjs|css|json|txt|map|svg|png|jpe?g|webp|gif|ico|woff2?|ttf|eot)$/.test(a))
    .sort();

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
  // ☁️ R2 (сонголттой) — байхгүй бол зураг Supabase Storage руу хадгалагдана
  const r2Keys = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE'];
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
    // Cloudflare R2 (зургийн сан) — эзгүй бол ⚠️ (алдаа БИШ: нөөц зам байна)
    const r2Empty = r2Keys.filter((k) => {
      const m = envText.match(new RegExp(`^${k}=(.*)$`, 'm'));
      return !m || !m[1].trim() || /your_|TANII_/i.test(m[1]);
    });
    if (r2Empty.length) {
      row('⚠️ ', `Cloudflare R2 тохируулагдаагүй (${r2Empty.length}/5 дутуу)`,
        '→ Зураг Supabase Storage руу хадгалагдана (ажиллана ✓). R2 руу шилжих: docs/R2_SETUP.md');
    } else {
      row('✅', 'Cloudflare R2 зураг хадгалах сан тохируулсан', '→ npm run check:r2');
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
  console.log("   pkill -f 'next dev'; pkill -f 'next-server'");
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
