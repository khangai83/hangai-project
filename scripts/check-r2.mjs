// ============================================================
// check-r2.mjs — Cloudflare R2 тохиргоо ҮНЭХЭЭР ажиллаж байгаа эсэх
//
// Ажиллуулах:  npm run check:r2
//              npm run check:r2 -- --origin https://танай-домэйн.mn   (CORS-ыг өөр домэйноор)
//   эсвэл:     R2_CORS_ORIGIN=https://a.mn,https://b.mn npm run check:r2
//
// Шалгах зүйлс (бүгд READ-ONLY — юу ч өөрчлөхгүй):
//   1. `.env.local` дахь R2_* хувьсагчид бүрэн эсэх
//   2. S3 API-д хүрч, bucket байгаа эсэх (HeadBucket)
//   3. Bucket доторх объектууд (`listing-images/`, `avatars/` тус бүрээр)
//   4. НИЙТИЙН домэйн (R2_PUBLIC_BASE) хүрч байгаа эсэх
//   5. CORS (browser-ээс шууд PUT хийхэд ШААРДЛАГАТАЙ!) — ДОМЭЙН ТУС БҮРЭЭР,
//      дутуу бол Cloudflare-д буулгах JSON-ыг ШУУД хэвлэнэ ✓
//
// ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ: R2-ийн алдаа нь browser дээр зөвхөн
//    «HTTP 403» эсвэл «Failed to fetch» болж харагддаг тул шалтгааныг
//    олоход хүнд. Энэ скрипт шалтгааныг ШУУД хэлнэ ✓
// ============================================================
import { headBucket, isR2Configured, listR2Keys, missingR2Env, publicUrlFor, r2Config, r2SetupHint } from '../lib/r2.mjs';
import { AVATAR_BUCKET, IMAGE_BUCKET, STORAGE_BUCKETS } from '../lib/storageKeys.mjs';
import { corsOriginProblem, corsPolicyJson, parseCorsOrigins } from '../lib/corsOrigins.mjs';

const results = [];
function report(ok, label, detail) {
  results.push({ ok, label });
  const icon = ok === true ? '✅' : ok === false ? '❌' : '⚠️ ';
  console.log(`${icon} ${label}${detail ? `\n     ${detail}` : ''}`);
}

function fmtBytes(n) {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v < 10 ? 2 : 1)} ${units[i]}`;
}

/** CORS preflight — browser-ээс PUT хийхэд заавал хэрэгтэй. `origin` нь САЙТЫН домэйн */
async function checkCors(cfg, origin) {
  try {
    const res = await fetch(`${cfg.endpoint}/${cfg.bucket}/${IMAGE_BUCKET}/__cors_probe__`, {
      method: 'OPTIONS',
      headers: {
        Origin: origin,
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'content-type',
      },
    });
    // ⚠️ Заримдаа 200 буцаагаад `access-control-allow-origin` ОГТ байхгүй байдаг
    //    (тухайн origin зөвшөөрөгдөөгүй гэсэн үг) → зөвхөн тэр header-ийг шалгана ✓
    const allow = res.headers.get('access-control-allow-origin');
    return { ok: !!allow, status: res.status, allow, origin };
  } catch (e) {
    return { ok: null, error: e.message, origin };
  }
}

async function main() {
  console.log('🪣 Cloudflare R2 тохиргоог шалгаж байна...\n');

  const missing = missingR2Env();
  report(missing.length === 0, 'R2 env хувьсагчид', missing.length ? `дутуу: ${missing.join(', ')}` : 'бүгд байна');
  if (!isR2Configured()) {
    console.log(`\n⚠️  R2 хараахан тохируулаагүй байна.\n   ${r2SetupHint()}\n`);
    console.log('   ℹ️  Сайт ЭВДРЭХГҮЙ: зураг одоохондоо Supabase Storage руу хадгалагдана ✓');
    process.exit(1);
  }

  const cfg = r2Config();
  // ℹ️ S3 API endpoint нь `R2_ACCOUNT_ID`-аас автоматаар үүснэ (бөглөх
  //    шаардлагагүй) — зөвхөн `R2_ENDPOINT` өгсөн бол тэр нь давамгайлна
  const endpointSrc = (process.env.R2_ENDPOINT || '').trim() ? 'R2_ENDPOINT-оос' : 'R2_ACCOUNT_ID-аас автоматаар';
  console.log(`   bucket: ${cfg.bucket}   endpoint: ${cfg.endpoint}  (${endpointSrc})`);
  console.log(`   нийтийн домэйн: ${cfg.publicBase || '(тохируулаагүй!)'}\n`);

  // 1) S3 API + bucket
  try {
    await headBucket();
    report(true, 'Bucket хүрч байна (HeadBucket)', cfg.bucket);
  } catch (e) {
    report(false, 'Bucket хүрч чадсангүй (HeadBucket)', `${e.name || 'Error'}: ${e.message}`);
  }

  // 2) Объектууд
  try {
    const all = await listR2Keys('', 1000);
    const total = all.reduce((s, o) => s + o.size, 0);
    report(true, 'Bucket доторх объектууд', `${all.length} объект · ${fmtBytes(total)}`);
    for (const bucket of STORAGE_BUCKETS) {
      const list = all.filter((o) => o.key.startsWith(`${bucket}/`));
      const size = list.reduce((s, o) => s + o.size, 0);
      report(true, `  ${bucket}/ — ${list.length} объект`, fmtBytes(size));
    }
  } catch (e) {
    report(false, 'Объектуудыг жагсааж чадсангүй', e.message);
  }

  // 3) Нийтийн домэйн
  if (!cfg.publicBase) {
    report(false, 'R2_PUBLIC_BASE тохируулаагүй',
      'Зургийн URL угсрах боломжгүй → утгыг Cloudflare-оос авна:\n' +
      `     Cloudflare → Storage & databases → R2 → ${cfg.bucket} → **Settings**\n` +
      '     · ТУРШИЛТАД: «Public Development URL» → Enable → `allow` гэж бичээд Allow\n' +
      `       → «Public Bucket URL» (жишээ: https://pub-1a2b3c.r2.dev)\n` +
      '     · PRODUCTION: «Custom Domains» → Add → жишээ: img.zarlaa.mn (Cloudflare DNS өөрөө нэмнэ)\n' +
      '     Дараа нь .env.local → R2_PUBLIC_BASE=<тэр хаяг>  (⚠️ төгсгөлд нь / БИШ)');
  } else {
    if (/r2\.dev/i.test(cfg.publicBase)) {
      report(null, 'R2_PUBLIC_BASE нь r2.dev (зөвхөн ТУРШИЛТАД)',
        'r2.dev нь хурдны хязгаартай, production-д тохиромжгүй → өөрийн домэйн (жишээ: img.zarlaa.mn) холбоно уу');
    }
    try {
      const probe = publicUrlFor(`${IMAGE_BUCKET}/__check_probe__`);
      const res = await fetch(probe, { method: 'HEAD' });
      if (res.status === 404) {
        report(true, 'Нийтийн домэйн хүрч байна (404 = R2 зөв хариулж байна)', probe);
      } else if (res.status === 403) {
        report(false, 'Нийтийн домэйн 403 буцаалаа', 'Bucket нь public БИШ байна → Public access асаана уу');
      } else {
        report(null, `Нийтийн домэйн HTTP ${res.status}`, probe);
      }
    } catch (e) {
      report(false, 'Нийтийн домэйн хүрч чадсангүй (DNS/сүлжээ)', `${cfg.publicBase} → ${e.message}`);
    }
  }

  // 4) CORS — ⚠️ ДОМЭЙН ТУС БҮРЭЭР (нэг домэйнд зөвшөөрөгдсөн ч нөгөөд нь
  //    биш байж болно → тэр сайтаас upload ХИЙГДЭХГҮЙ)
  const probeOrigins = parseCorsOrigins(process.argv.slice(2), process.env.R2_CORS_ORIGIN);
  console.log(`   CORS-ийг шалгах домэйн(ууд): ${probeOrigins.join('  ·  ')}`);
  for (const origin of probeOrigins) {
    const problem = corsOriginProblem(origin);
    if (problem) report(false, `CORS домэйн буруу бичигдсэн: ${origin}`, problem);
  }
  for (const origin of probeOrigins) {
    const cors = await checkCors(cfg, origin);
    if (cors.ok === true) {
      report(true, `CORS зөв: ${origin}`, `access-control-allow-origin: ${cors.allow} → энэ домэйноос шууд upload боломжтой ✓`);
    } else if (cors.ok === false) {
      report(false, `CORS тохиргоо ДУТУУ: ${origin} — энэ домэйноос upload ХИЙГДЭХГҮЙ ✗`,
        'Presigned PUT нь гарын үсэгтэй ч browser CORS-гүй бол ХҮСЭЛТ ЯВУУЛАХГҮЙ ✗\n' +
        `     Cloudflare → Storage & databases → R2 → ${cfg.bucket} → **Settings** → «CORS Policy»\n` +
        '     → Add → доорх JSON-ыг ШУУД буулгаад Save (домэйнууд нь аль хэдийн зөв бичигдсэн):\n\n' +
        `${corsPolicyJson(probeOrigins)}\n\n` +
        '     ⚠️ origin нь `scheme://host[:port]` ЗӨВХӨН — зам ба төгсгөлийн `/` ХҮЧИНГҮЙ;\n' +
        '     `*` нь хамгийн ихдээ 1 (цэг дамжина), порт дотор `*` БОЛОХГҮЙ. Хадгалсны\n' +
        '     дараа 30 сек хүлээгээд дахин ажиллуулна (дэлгэрэнгүй: docs/R2_SETUP.md §4)');
    } else {
      report(null, `CORS-ыг шалгаж чадсангүй (${origin})`, cors.error);
    }
  }

  const failed = results.filter((r) => r.ok === false).length;
  console.log(`\n${failed === 0 ? '🎉 R2 бэлэн — зураг R2 руу хадгалагдана!' : `⚠️  ${failed} шалгалт амжилтгүй.`}`);
  console.log('ℹ️  Өөр домэйн шалгах: npm run check:r2 -- --origin https://танай-домэйн.mn');
  console.log('📊 Хэрэглээ: npm run report:usage');
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Шалгалтын алдаа:', (err && err.message) || err);
  process.exit(1);
});
