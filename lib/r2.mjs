// ============================================================
// r2.mjs — Cloudflare R2 (S3-д нийцтэй) СЕРВЕР ТАЛЫН давхарга
//
// ЯАГААД: Supabase Storage-ийн Free план нь 1 GB ба **5 GB/сар egress** —
//   зураг нь гол зарцуулалт (~1,200 зар л багтана). Cloudflare R2 нь
//   10 GB storage ба **egress ҮНЭГҮЙ** тул хязгаар тасрахгүй ✓
//
// ⚠️⚠️ ЗӨВХӨН СЕРВЕР ТАЛД! ⚠️⚠️
//   `R2_SECRET_ACCESS_KEY` нь НУУЦ түлхүүр. Энэ файлыг client component-д
//   import хийвэл түлхүүр bundle-д алдагдана ✗. Зөвхөн:
//     • `app/api/storage/*` (presign / delete)  — хэрэглэгчийн токеныг баталж
//     • `lib/adminAuth.js` (админы устгалт)      — `await import()`-оор
//     • `scripts/*`                              — migration / check
//
// 📌 ХЭРЭГЛЭГЧ БИШ, СЕРВЕР Л ОРЖ БУУЛГАРНА:
//   Browser нь `presigned PUT URL` авч (600 сек хүчинтэй) шууд R2 руу
//   илгээнэ — файл Vercel-ээр дамжихгүй тул serverless-ийн 4.5 MB хязгаар,
//   timeout, bandwidth бүгд хамаарахгүй ✓
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectsCommand, ListObjectsV2Command, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { publicStorageUrl } from './storageKeys.mjs';

/** Presigned URL-ийн хүчинтэй хугацаа (секунд) — 10 минут */
export const DEFAULT_PRESIGN_EXPIRES = 600;

/** Хэрэгтэй env хувьсагчид (дараалал нь мессежид харагдана) */
export const R2_ENV_KEYS = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE'];

/**
 * `.env.local`-ыг `process.env` руу нэг удаа уншина.
 * ⚠️ Next.js API route дээр `process.env` нь аль хэдийн бэлэн тул энэ нь
 *    зөвхөн `scripts/*`-д (node шууд ажиллуулах үед) хэрэгтэй ✓
 */
let envLoaded = false;
function loadEnvLocal() {
  if (envLoaded) return;
  envLoaded = true;
  try {
    const content = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    content.split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    });
  } catch (e) {
    /* .env.local байхгүй — process.env-ээс л уншина */
  }
}

/**
 * R2 тохиргоо. Дутуу бол **null** (алдаа ШИДЭХГҮЙ) — ингэснээр дуудагч тал
 * «R2 байхгүй → хуучин Supabase Storage руу буцна» гэж шийдэж чадна ✓
 * @returns {null|{accountId:string, accessKeyId:string, secretAccessKey:string, bucket:string, publicBase:string, endpoint:string, region:string}}
 */
export function r2Config() {
  loadEnvLocal();
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  const accessKeyId = (process.env.R2_ACCESS_KEY_ID || '').trim();
  const secretAccessKey = (process.env.R2_SECRET_ACCESS_KEY || '').trim();
  const bucket = (process.env.R2_BUCKET || '').trim();
  // ⚠️ `NEXT_PUBLIC_` хувилбарыг ч хүлээнэ (хэрэглэгч санамсаргүй тэгж
  //    нэрлэсэн бол ажиллах ёстой — утга нь нууц БИШ, зөвхөн нийтийн домэйн)
  const publicBase = (process.env.R2_PUBLIC_BASE || process.env.NEXT_PUBLIC_R2_PUBLIC_BASE || '').trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    publicBase,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    region: 'auto',
  };
}

/** R2 бүрэн тохируулагдсан эсэх */
export function isR2Configured() {
  return r2Config() !== null;
}

/** Дутуу env хувьсагчдын нэрс (хоосон бол бүгд байна) */
export function missingR2Env() {
  loadEnvLocal();
  return R2_ENV_KEYS.filter((k) => {
    if ((process.env[k] || '').trim()) return false;
    if (k === 'R2_PUBLIC_BASE') return !(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE || '').trim();
    return true;
  });
}


/**
 * ⬆️ UPLOAD (presign) хийхэд БЭЛЭН эсэх.
 *
 * ⚠️ `r2Config()`-оос ЯЛГААТАЙ нь: энэ нь `R2_PUBLIC_BASE`-ийг ЗААВАЛ шаардана.
 *    Учир нь upload-ийн үр дүн нь DB-д URL болж БИЧИГДДЭГ
 *    (`listings.images[]`, `profiles.avatar_url`) — домэйн хоосон бол
 *    `publicUrlFor()` нь «https://R2_PUBLIC_BASE-тохируулаагүй/…» гэсэн ХОГ
 *    URL бичиж, зураг ХЭЗЭЭ Ч харагдахгүй болно ✗
 *    ℹ️ Устгах/list/migrate-д publicBase хэрэггүй тул `r2Config()`-д
 *    шаардаагүй (зөвхөн энд шаардана) ✓
 */
export function isR2UploadReady() {
  return r2Config() !== null && missingR2Env().length === 0;
}

/**
 * S3 client (нэг удаа үүсгэж дахин ашиглана).
 * ⚠️ Дутуу тохиргоотой үед ойлгомжтой монгол алдаа шидэнэ.
 */
let _client = null;
export function r2Client() {
  const cfg = r2Config();
  if (!cfg) throw new Error(r2SetupHint());
  if (_client) return _client;
  _client = new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    // ⚠️⚠️ МАШ ЧУХАЛ (2026-10-02, бодит туршилтаар илэрсэн):
    //   AWS SDK v3 (≥3.729) нь PUT-д АВТОМАТААР CRC32 checksum нэмдэг ба
    //   presigned URL-д `x-amz-checksum-crc32=AAAAAA==` (ХООСОН биеийн
    //   утга!) гэж бичигддэг → бодит файл илгээхэд R2 «checksum
    //   mismatch» алдаа өгнө ✗  `WHEN_REQUIRED` болгосноор зөвхөн
    //   шаардлагатай үед л тооцоолно (R2 шаарддаггүй) ✓
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  return _client;
}

/** Түлхүүрээс НИЙТИЙН URL (`<R2_PUBLIC_BASE>/<key>`) */
export function publicUrlFor(key) {
  const cfg = r2Config();
  const base = (cfg && cfg.publicBase) || 'https://R2_PUBLIC_BASE-тохируулаагүй';
  return publicStorageUrl(base, key);
}

/**
 * Browser-т зориулсан ХУГАЦААТАЙ PUT линк.
 *
 * ⚠️ `Content-Type`-ыг ГАРЫН ҮСЭГТ ОРУУЛНА (`X-Amz-SignedHeaders=host;content-type`)
 *    — ингэснээр browser ЗААВАЛ яг тэр төрлөөр илгээх ёстой (эс бөгөөс
 *    R2 «SignatureDoesNotMatch» гэж татгалзана). Ингэснээр `image/*` биш
 *    агуулга хадгалагдахаас сэргийлнэ ✓
 *    ℹ️ Хэмжээг (Content-Length) гарын үсэгт ОРУУЛАХГҮЙ — browser
 *    заавал яг ижил хэмжээ илгээх шаардлагагүй, R2 өөрөө хүлээж авна ✓
 */
export async function presignPut(key, contentType, expiresIn = DEFAULT_PRESIGN_EXPIRES) {
  const cfg = r2Config();
  if (!cfg) throw new Error(r2SetupHint());
  const cmd = new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client(), cmd, {
    expiresIn,
    signableHeaders: new Set(['content-type']),
  });
}

/** Олон түлхүүрийг нэг хүсэлтээр устгана (R2 нь 1000 хүртэл дэмжинэ) */
export async function deleteR2Keys(keys = []) {
  const clean = (keys || []).map((k) => String(k || '').trim()).filter(Boolean);
  if (!clean.length) return 0;
  const cfg = r2Config();
  if (!cfg) throw new Error(r2SetupHint());
  let removed = 0;
  for (let i = 0; i < clean.length; i += 1000) {
    const chunk = clean.slice(i, i + 1000);
    const res = await r2Client().send(
      new DeleteObjectsCommand({
        Bucket: cfg.bucket,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      })
    );
    const errs = (res && res.Errors) || [];
    if (errs.length) {
      throw new Error(`R2 устгалтын алдаа: ${errs.map((e) => `${e.Key}: ${e.Message}`).join('; ')}`);
    }
    removed += chunk.length;
  }
  return removed;
}

/** Bucket доторх түлхүүрүүд (хуудсаар — `maxKeys` хүртэл, 1000/хуудас) */
export async function listR2Keys(prefix = '', maxKeys = 1000) {
  const cfg = r2Config();
  if (!cfg) throw new Error(r2SetupHint());
  const out = [];
  let token;
  do {
    const res = await r2Client().send(
      new ListObjectsV2Command({
        Bucket: cfg.bucket,
        Prefix: prefix || undefined,
        ContinuationToken: token,
        MaxKeys: Math.min(1000, maxKeys - out.length),
      })
    );
    for (const obj of res.Contents || []) out.push({ key: obj.Key, size: Number(obj.Size) || 0 });
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token && out.length < maxKeys);
  return out;
}

/** Bucket хүрч байгаа эсэх (check:r2 — тохиргооны шалгалт) */
export async function headBucket() {
  const cfg = r2Config();
  if (!cfg) throw new Error(r2SetupHint());
  await r2Client().send(new HeadBucketCommand({ Bucket: cfg.bucket }));
  return true;
}

/** Том объектыг шууд байршуулах (migration script) */
export async function putObject(key, body, contentType, contentLength) {
  const cfg = r2Config();
  if (!cfg) throw new Error(r2SetupHint());
  await r2Client().send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: body,
      ContentType: contentType || 'application/octet-stream',
      ContentLength: Number.isFinite(contentLength) ? contentLength : undefined,
    })
  );
  return true;
}

/** Монгол хэл дээрх засварын заавар (503 хариулт + логт) */
export function r2SetupHint() {
  const missing = missingR2Env();
  return (
    `Cloudflare R2 тохиргоо дутуу: ${missing.length ? missing.join(', ') : 'шалгана уу'}. ` +
    'docs/R2_SETUP.md дахь алхмуудыг дагана уу (bucket үүсгэх → API token → .env.local → ' +
    '`npm run check:r2`). Одоохондоо зураг хуучин Supabase Storage руу хадгалагдана.'
  );
}
