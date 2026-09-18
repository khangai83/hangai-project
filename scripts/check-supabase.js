// ============================================================
// check-supabase.js — Supabase тохиргоо үнэхээр ажиллаж байгаа эсэхийг шалгах
//
// Ажиллуулах:
//   npm run check:supabase
//   (эсвэл: node scripts/check-supabase.js)
//
// Шалгах зүйлс:
//   1. .env.local-д шаардлагатай хувьсагчууд байгаа эсэх
//   2. NEXT_PUBLIC_SUPABASE_URL нь зөв форматтай эсэх
//   3. Тэр host нь DNS-ээр задарч байгаа эсэх (NXDOMAIN = төсөл байхгүй / ref буруу)
//   4. PostgREST (REST API) хариулж, хүснэгтүүд харагдаж байгаа эсэх
//   4.5. 0003 migration-ийн орон сууцны баганууд (build_year/floor/... ) байгаа эсэх
//   5. listing-images Storage bucket байгаа эсэх
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
// Хэрэв URL буруу / төсөл изгүй бол browser дээр зөвхөн
// "TypeError: Failed to fetch" гарах ба Next.js dev overlay үүнийг "{}" гэж
// харуулдаг тул шалтгааныг олоход хүнд байдаг. Энэ скрипт шууд шалтгааныг хэлнэ.
// ============================================================
const fs = require('fs');
const path = require('path');
const dns = require('dns').promises;

function loadEnvLocal() {
  try {
    const content = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
    content.split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    });
    return true;
  } catch (e) {
    console.error('⚠️  .env.local олдсонгүй. cp .env.local.example .env.local хийгээд тохируулна уу.');
    return false;
  }
}

const results = [];
function report(ok, label, detail) {
  results.push({ ok, label });
  const icon = ok === true ? '✅' : ok === false ? '❌' : '⚠️ ';
  console.log(`${icon} ${label}${detail ? `\n     ${detail}` : ''}`);
}

async function main() {
  console.log('🔎 Supabase тохиргоог шалгаж байна...\n');
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // ---------- 1. Хувьсагчид ----------
  report(!!url, 'NEXT_PUBLIC_SUPABASE_URL тохируулсан', url || 'дутуу байна');
  report(!!anonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY тохируулсан',
    anonKey ? `${anonKey.slice(0, 12)}… (${anonKey.length} тэмдэгт)` : 'дутуу байна');
  report(!!serviceKey, 'SUPABASE_SERVICE_ROLE_KEY тохируулсан (зөвхөн seed/скриптэд)',
    serviceKey ? `${serviceKey.slice(0, 12)}… (${serviceKey.length} тэмдэгт)` : 'дутуу байна');

  if (!url || !anonKey) {
    console.log('\n❌ Үндсэн тохиргоо дутуу — засвараас хойш дахин ажиллуулна уу.');
    process.exit(1);
  }

  // ---------- 2. URL формат ----------
  let host = null;
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    report(true, 'URL формат зөв', url);
    if (url.includes('TANII_PROJECT_REF')) {
      report(false, 'URL дотор placeholder (TANII_PROJECT_REF) байна',
        'Supabase Dashboard → Project Settings → Data API → Project URL-аа хуулж тавина уу.');
    }
  } catch (e) {
    report(false, 'URL формат буруу', `Алдаа: ${e.message}`);
    process.exit(1);
  }

  // ---------- 3. DNS ----------
  try {
    const addresses = await dns.lookup(host, { all: true });
    report(true, `DNS задарч байна (${host})`, addresses.map((a) => a.address).join(', '));
  } catch (e) {
    report(false, `DNS задрахгүй байна: ${host}`,
      `${e.code}: ${e.message}\n     → Supabase төслийн ref буруу, эсвэл төсөл устсан/түр зогссон байна.\n` +
      '     → Dashboard (https://supabase.com/dashboard) → Project Settings → Data API → Project URL-аа шалгаж, .env.local-д тавина уу.\n' +
      '     → Дараа нь dev server-ээ дахин эхлүүлнэ (npm run dev).');
    console.log('\n❌ Холболт хийгдэхгүй — DNS алдаатай байна.');
    process.exit(1);
  }

  const headers = { apikey: anonKey, Authorization: `Bearer ${anonKey}` };

  // ---------- 4. REST API + хүснэгтүүд ----------
  for (const table of ['listings', 'listing_drafts', 'profiles']) {
    try {
      const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, { headers });
      if (res.status === 200 || res.status === 206) {
        report(true, `Хүснэгт «${table}» уншигдаж байна`, `HTTP ${res.status}`);
      } else if (res.status === 404) {
        report(false, `Хүснэгт «${table}» олдсонгүй (HTTP 404)`,
          `supabase/migrations/*.sql файлуудыг Supabase SQL Editor-т ажиллуулна уу.`);
      } else {
        const body = await res.text();
        report(false, `Хүснэгт «${table}» HTTP ${res.status}`, body.slice(0, 300));
      }
    } catch (e) {
      report(false, `Хүснэгт «${table}» шалгахад алдаа`, e.message);
    }
  }

  // ---------- 4.5. 0003 migration-ийн орон сууцны баганууд ----------
  try {
    const cols = 'build_year,floor,total_floors,balconies,has_garage';
    const res = await fetch(`${url}/rest/v1/listings?select=${cols}&limit=1`, { headers });
    if (res.status === 200 || res.status === 206) {
      report(true, 'listings-д орон сууцны нэмэлт багана байна', cols);
    } else {
      const body = await res.text();
      report(false, 'listings-д орон сууцны нэмэлт багана алга (0003 migration ороогүй)',
        `HTTP ${res.status}: ${body.slice(0, 200)}\n` +
        '     → supabase/migrations/0003_listing_details.sql-ийг Supabase SQL Editor-т ажиллуулна уу.');
    }
  } catch (e) {
    report(false, 'Орон сууцны нэмэлт багана шалгахад алдаа', e.message);
  }

  // ---------- 5. Storage bucket ----------
  try {
    const res = await fetch(`${url}/storage/v1/bucket/listing-images`, { headers });
    if (res.status === 200) report(true, 'Storage bucket «listing-images» байна', 'HTTP 200');
    else report(false, `Storage bucket «listing-images» HTTP ${res.status}`,
      (await res.text()).slice(0, 300));
  } catch (e) {
    report(false, 'Storage bucket шалгахад алдаа', e.message);
  }

  const failed = results.filter((r) => r.ok === false).length;
  console.log(`\n${failed === 0 ? '🎉 Бүх шалгалт амжилттай!' : `⚠️  ${failed} шалгалт амжилтгүй.`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Шалгалтын алдаа:', err && err.message ? err.message : err);
  process.exit(1);
});
