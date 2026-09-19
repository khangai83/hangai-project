// ============================================================
// enable-phone-auth.js — Supabase дээр УТАСНЫ (phone) нэвтрэлтийг идэвхжүүлэх
//
// Ажиллуулах: node scripts/enable-phone-auth.js   (npm run enable:phone-auth)
//
// ШААРДЛАГАТАЙ: .env.local дотор SUPABASE_ACCESS_TOKEN (sbp_... хэлбэртэй)
//   1) https://supabase.com/dashboard/account/tokens → "Generate new token"
//   2) .env.local-д: SUPABASE_ACCESS_TOKEN=sbp_xxxxx
//
// Юу хийдэг вэ: Supabase Management API-аар төслийн auth тохиргоог
// `external_phone_enabled: true` болгоно (Dashboard → Authentication →
// Providers → Phone → Enable-тэй ижил). SMS provider (Twilio) шаардлагагүй —
// SMS-ийг verify.mn илгээдэг, Supabase зөвхөн хэрэглэгчийг хадгална.
// ============================================================
const fs = require('fs');
const path = require('path');

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

const url = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const token = env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;
const ref = url ? String(url).replace('https://', '').replace('.supabase.co', '') : '';

if (!ref) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL олдсонгүй (.env.local-ыг шалгана уу).');
  process.exit(1);
}

if (!token) {
  console.error('❌ SUPABASE_ACCESS_TOKEN олдсонгүй.\n');
  console.error('   Хэрхэн авах вэ:');
  console.error('   1) https://supabase.com/dashboard/account/tokens → "Generate new token"');
  console.error('   2) .env.local файлд нэмнэ:  SUPABASE_ACCESS_TOKEN=sbp_xxxxx');
  console.error('   3) Дахин ажиллуулна: npm run enable:phone-auth\n');
  console.error('   Эсвэл гараар: Supabase Dashboard → Authentication → Providers → Phone → Enable');
  process.exit(1);
}

async function phoneEnabled() {
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anonKey } });
    if (!res.ok) return null;
    const d = await res.json();
    return !!(d && d.external && d.external.phone);
  } catch (e) {
    return null;
  }
}

(async () => {
  console.log(`🔧 Төсөл: ${ref}`);

  const before = await phoneEnabled();
  console.log(`   Одоогийн байдал: external.phone = ${before}`);

  if (before === true) {
    console.log('\n✅ Утасны нэвтрэлт аль хэдийн идэвхтэй байна. Юу ч хийх шаардлагагүй.');
    process.exit(0);
  }

  console.log('\n⏳ Идэвхжүүлж байна (Management API)...');
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ external_phone_enabled: true }),
  });
  const text = await res.text();

  if (!res.ok) {
    console.error(`❌ Амжилтгүй (HTTP ${res.status}): ${text.slice(0, 400)}`);
    console.error('\n   → Токен хүчингүй эсвэл эрх хүрэлцэхгүй байж магадгүй.');
    console.error('   → Гараар: Supabase Dashboard → Authentication → Providers → Phone → Enable');
    process.exit(1);
  }

  // Баталгаажуулалт (settings хэдхэн секундэд шинэчлэгдэнэ)
  let after = null;
  for (let i = 0; i < 5; i += 1) {
    await new Promise((r) => setTimeout(r, 1200));
    after = await phoneEnabled();
    if (after === true) break;
  }

  console.log(`   Шинэ байдал:    external.phone = ${after}`);
  if (after === true) {
    console.log('\n🎉 Утасны (phone) нэвтрэлт идэвхжлээ! Одоо бүртгэл/нэвтрэлт ажиллана.');
    console.log('   Шалгах: npm run check:supabase');
    process.exit(0);
  }
  console.log('\n⚠️  Хүсэлт амжилттай (HTTP 200) боловч settings-д хараахан тусгагдаагүй.');
  console.log('   Хэдэн секундын дараа `npm run check:supabase` -ээр дахин шалгана уу.');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Алдаа:', (err && err.message) || err);
  process.exit(1);
});
