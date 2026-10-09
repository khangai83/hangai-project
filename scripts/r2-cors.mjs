// ============================================================
// r2-cors.mjs — R2 bucket-ийн CORS-ыг КОДООС унших / бичих
//
//   npm run r2:cors                 # 🔍 DRY-RUN — юу бичигдэхийг л харуулна
//   npm run r2:cors -- --apply      # ✅ бичнэ (одоогийнхтой НЭГТГЭнэ)
//   npm run r2:cors -- --apply --replace   # ⚠️ ЗӨВХӨН санал болгосныг бичнэ
//   npm run r2:cors -- --origin https://x.mn   # нэмэлт домэйн (давтаж болно)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ: presigned PUT-ыг **browser** шууд R2 руу илгээдэг тул
// тухайн САЙТЫН домэйн (`Origin`) нь `AllowedOrigins`-д байх ЁСТОЙ. Байхгүй
// бол хэрэглэгч зөвхөн «Failed to fetch» / iOS Safari дээр «Load failed»
// хардаг (сервер талд ямар ч лог үлдэхгүй) ✗ — энэ нь оношлоход ХҮНД.
//
// 💡 Dashboard-гүйгээр ажиллана: R2 нь `PutBucketCors`/`GetBucketCors`-ыг
//    S3 API-аар дэмждэг (docs/R2_SETUP.md §4-д БАТАЛСАН ✓)
//
// ⚠️⚠️ `PutBucketCors` нь дүрмүүдийг БҮХЭЛД НЬ ДАРЖ БИЧДЭГ (нэмэгдүүлэхгүй!)
//    Тиймээс анхдагч нь ОДООГИЙХТОЙ НЭГТГЭнэ (юу ч унахгүй ✓) ба `--replace`
//    үед л хасагдана. DRY-RUN нь хасагдах домэйныг УРЬДЧИЛАН харуулна.
// ============================================================
import os from 'node:os';
import { GetBucketCorsCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { isR2Configured, r2Client, r2Config, r2SetupHint } from '../lib/r2.mjs';
import {
  CORS_ALLOWED_HEADERS,
  CORS_ALLOWED_METHODS,
  CORS_EXPOSE_HEADERS,
  CORS_MAX_AGE_SECONDS,
  RECOMMENDED_CORS_ORIGINS,
  corsOriginProblem,
  corsOriginsDiff,
  lanCorsOrigins,
  mergeCorsOrigins,
  normalizeCorsOrigin,
  parseCorsOrigins,
} from '../lib/corsOrigins.mjs';

/** `--flag` хэлбэрийн аргументууд (утга авдаг `--origin` нь тусад нь) */
function hasFlag(argv, name) {
  return argv.some((a) => String(a) === name);
}

/** Одоогийн CORS дүрмийг уншина (байхгүй бол `null`) */
async function readCorsRules(bucket) {
  try {
    const res = await r2Client().send(new GetBucketCorsCommand({ Bucket: bucket }));
    return Array.isArray(res.CORSRules) ? res.CORSRules : [];
  } catch (e) {
    // ⚠️ CORS огт тохируулаагүй үед R2 `NoSuchCORSConfiguration` шиддэг
    if (/NoSuchCORSConfiguration|NoSuchCORS/i.test(`${e.name} ${e.message}`)) return null;
    throw e;
  }
}

/** Одоогийн дүрмүүдээс БҮХ origin-ыг нэгтгэнэ (олон дүрэм байж болно) */
function originsFromRules(rules) {
  return mergeCorsOrigins(...(rules || []).map((r) => r.AllowedOrigins || []));
}

function printList(title, list, icon) {
  console.log(`\n${title}`);
  if (!list.length) {
    console.log('   (хоосон)');
    return;
  }
  for (const o of list) console.log(`   ${icon} ${o}`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (hasFlag(argv, '--help') || hasFlag(argv, '-h')) {
    console.log('Ашиглах: npm run r2:cors [-- --apply] [--replace] [--origin https://x.mn]');
    return;
  }
  const apply = hasFlag(argv, '--apply');
  const replace = hasFlag(argv, '--replace');
  const extra = parseCorsOrigins(argv, '', []); // `--origin …` (анхдагчгүй)

  console.log('🪣 Cloudflare R2 bucket-ийн CORS-ыг шалгаж байна...\n');

  if (!isR2Configured()) {
    console.log(`⚠️  R2 хараахан тохируулаагүй байна.\n   ${r2SetupHint()}\n`);
    process.exit(1);
  }

  const cfg = r2Config();
  console.log(`   bucket: ${cfg.bucket}   endpoint: ${cfg.endpoint}`);

  // 📱 Mac-ийн бодит LAN IP-г автоматаар олж нэмнэ (DHCP-ээс IP солигдсон ч ✓)
  const lan = lanCorsOrigins(os.networkInterfaces(), 3000);
  const wanted = mergeCorsOrigins(RECOMMENDED_CORS_ORIGINS, lan, extra);
  if (lan.length) console.log(`   📱 LAN IP автоматаар: ${lan.join('  ·  ')}`);

  const currentRules = await readCorsRules(cfg.bucket);
  const current = originsFromRules(currentRules);
  const configured = currentRules !== null;

  console.log(`\n${configured ? '✅ CORS дүрэм байна' : '❌ CORS дүрэм ОГТ ТОХИРУУЛААГҮЙ'}`);
  printList('📄 ОДООГИЙН AllowedOrigins:', current, '·');

  // ⚠️ `--replace` үед ЗӨВХӨН `wanted` бичигдэх тул одоогийнхыг нэгтгэнэ
  const next = replace ? wanted : mergeCorsOrigins(current, wanted);
  const diff = corsOriginsDiff(current, next);

  printList('➕ НЭМЭГДЭХ:', diff.added, '＋');
  printList('➖ ХАСАГДАХ:', diff.removed, '−');

  // ⚠️ Cloudflare-д БУРУУ бичигдэх боломжтой утгуудыг урьдчилан барина
  for (const o of next) {
    const problem = corsOriginProblem(o);
    if (problem) {
      console.error(`\n❌ Нэр дэвшигч буруу: ${o} — ${problem}`);
      process.exit(1);
    }
  }

  const policy = [
    {
      AllowedOrigins: next,
      AllowedMethods: CORS_ALLOWED_METHODS.slice(),
      AllowedHeaders: CORS_ALLOWED_HEADERS.slice(),
      ExposeHeaders: CORS_EXPOSE_HEADERS.slice(),
      MaxAgeSeconds: CORS_MAX_AGE_SECONDS,
    },
  ];

  console.log('\n📦 Бичигдэх CORS Configuration:');
  console.log(JSON.stringify(policy, null, 2));

  if (!apply) {
    console.log('\n🔍 DRY-RUN — юу ч бичээгүй. Бичих бол:  npm run r2:cors -- --apply');
    return;
  }

  await r2Client().send(
    new PutBucketCorsCommand({ Bucket: cfg.bucket, CORSConfiguration: { CORSRules: policy } })
  );
  console.log('\n✅ CORS бичигдлээ.');

  // ⚠️ Буцаж уншиж БАТАЛНА (тархахад 30 сек хүртэл хугацаа орж болно)
  const after = originsFromRules(await readCorsRules(cfg.bucket));
  printList('📄 БАТАЛГАА — шинэ AllowedOrigins:', after, '✓');
  console.log('\nℹ️  Дараа нь бодит preflight шалгана (30 сек хүлээгээд):');
  for (const o of next) console.log(`   npm run check:r2 -- --origin ${o}`);
}

main().catch((err) => {
  console.error('❌ CORS скриптийн алдаа:', (err && err.message) || err);
  process.exit(1);
});
