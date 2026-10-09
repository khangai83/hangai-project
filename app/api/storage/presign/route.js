// ============================================================
// POST /api/storage/presign — 🅰️ Cloudflare R2 руу ШУУД байршуулах эрх
//
// Header: Authorization: Bearer <supabase access_token>    ← ЗААВАЛ
// Body:   { bucket: 'listing-images' | 'avatars',
//           files:  [{ name, type, size }, …] }
// Resp:   { ok: true, backend: 'r2',
//           files: [{ key, contentType, uploadUrl, publicUrl }] }
//
// ⚠️ ЯАГААД СЕРВЕР ВЭ: R2-ийн НУУЦ түлхүүр browser руу ХЭЗЭЭ Ч явахгүй.
//    Сервер зөвхөн БОГИНО (10 мин) хугацаатай PUT линк олгоно — файл нь
//    Vercel-ээр дамжихгүй тул serverless-ийн 4.5 MB хязгаар/timeout
//    хамаарахгүй ✓
//
// ⚠️ ХАМГААЛАЛТ (хуучин `storage.objects` RLS-ийн оронгүй болсон):
//    ① Токеныг Supabase-ээр БАТАЛЖ, хэрэглэгчийн id-г итгэмжтэй авна
//    ② Түлхүүрийн ЭХНИЙ ФОЛДЕР = тэр хэрэглэгчийн id (`buildStorageKey`)
//       — RLS-ийн `(storage.foldername(name))[1] = auth.uid()::text`-ийн
//       ЯГ ижил дүрэм. Гарын үсэг нь тэр замыг л зөвшөөрнө ✓
//    ③ Төрөл / хэмжээ / тоо нь `lib/storageKeys.mjs`-ийн дүрмээр
//
// ⚠️ R2 тохируулаагүй бол 503 + `code: 'R2_NOT_CONFIGURED'` буцаана →
//    client (`lib/storageClient.mjs`) нь ХУУЧИН Supabase Storage руу
//    автоматаар буцна. Ингэснээр R2-ийн түлхүүр оруулахаас өмнө ч
//    зураг оруулах ЭВДРЭХГҮЙ ✓
//
// ⚠️ ЗОРИУД: 503 шалгалт нь төрөл/хэмжээний шалгалтаас ӨМНӨ байна.
//    Учир нь энэ route-ийн хязгаар (5 MB / зөвхөн image/*) нь R2-д
//    зориулагдсан бөгөөд R2-гүй үед хүсэлт нь Supabase Storage руу
//    (өөрийн bucket дүрэмтэй) явдаг тул эндээс хаах нь ХУУЧИН ажиллаж
//    байсан замыг зүгээр л эвдэнэ ✗ (`bucket`/тоо/токен нь 503-аас
//    өмнө шалгагдана — тэдгээр нь хоёр замд адил хамаатай) ✓
// ============================================================
import { NextResponse } from 'next/server';
import { getAdminClient } from '../../../../lib/authServer';
import {
  AVATAR_BUCKET,
  MAX_LISTING_IMAGES,
  allowedExtensionsForBucket,
  allowedTypesForBucket,
  buildStorageKey,
  isStorageBucket,
  maxBytesForBucket,
  safeImageType,
} from '../../../../lib/storageKeys.mjs';
import { isR2UploadReady, presignPut, publicUrlFor, r2SetupHint } from '../../../../lib/r2.mjs';

export const dynamic = 'force-dynamic';

/** Bearer токеныг Supabase-ээр баталж, хэрэглэгчийг буцаана (`null` — хүчингүй) */
async function requireUser(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  try {
    const { data, error } = await getAdminClient().auth.getUser(token);
    if (error || !data || !data.user) return null;
    return data.user;
  } catch (e) {
    return null;
  }
}

function bad(error, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    return bad('Хүсэлтийн бие буруу (JSON биш).');
  }

  const user = await requireUser(req);
  if (!user) return bad('Нэвтрэх шаардлагатай (сесс хүчингүй эсвэл токен байхгүй).', 401);

  const bucket = String(body.bucket || '').trim();
  if (!isStorageBucket(bucket)) return bad(`Storage bucket буруу: «${bucket}».`);

  const files = Array.isArray(body.files) ? body.files : [];
  if (!files.length) return bad('Файл сонгоогүй байна.');
  const fileLimit = bucket === AVATAR_BUCKET ? 1 : MAX_LISTING_IMAGES;
  if (files.length > fileLimit) return bad(`Хэт олон файл (${files.length}). Хамгийн их: ${fileLimit}.`);

  // ⚠️ Эхлээд «R2 бэлэн биш» эсэхийг хэлнэ — client ЗӨВХӨН энэ код дээр л буцна.
  //    `isR2UploadReady()` нь `R2_PUBLIC_BASE`-ийг Ч шаардана: домэйн хоосон
  //    үед `publicUrlFor()` нь «https://R2_PUBLIC_BASE-тохируулаагүй/…» гэсэн
  //    ХОГ URL-ыг DB-д бичиж, зураг ХЭЗЭЭ Ч харагдахгүй болно ✗ — тиймээс
  //    ийм тохиолдлыг «R2 бэлэн БИШ» гэж үзэж, хуучин Supabase зам руу буцаана ✓
  if (!isR2UploadReady()) {
    return NextResponse.json({ ok: false, code: 'R2_NOT_CONFIGURED', error: r2SetupHint() }, { status: 503 });
  }

  const allowed = allowedTypesForBucket(bucket);
  const allowedExt = allowedExtensionsForBucket(bucket).join(', ');
  const maxBytes = maxBytesForBucket(bucket);
  const planned = [];
  for (const f of files) {
    const name = String((f && f.name) || '').trim();
    // 🖼 ОЛОН ФОРМАТ (2026-10-09): төрөл нь ХООСОН/хэлбэргүй (`''`,
    //    `application/octet-stream`) ирвэл өргөтгөлөөс нөхнө — зарим
    //    хөтөч/сүлжээний диск MIME-г огт илгээдэггүй ✗
    const contentType = safeImageType(bucket, f && f.type, name);
    if (!contentType) {
      // ⚠️ heic/heif/tiff нь browser-уудад ШУУД харагддаггүй тул зориуд
      //    зөвшөөрөгдөхгүй — client талд JPEG болж хөрвөх ёстой ✓
      return bad(
        `«${name || 'файл'}» — зөвхөн ${allowedExt} формат зөвшөөрөгдөнө ` +
          `(ирсэн төрөл: «${(f && f.type) || 'тодорхойгүй'}»). ` +
          'HEIC/TIFF/RAW бол JPEG болгож хөрвүүлээд дахин оруулна уу ' +
          `(зөвшөөрөгдөх MIME: ${allowed.join(', ')}).`
      );
    }
    const size = Number(f && f.size);
    if (Number.isFinite(size) && size > maxBytes) {
      return bad(
        `Зургийн хэмжээ хэтэрсэн (${Math.round(size / 1024)} KB). ` +
          `Хамгийн их: ${Math.round(maxBytes / 1024 / 1024)} MB — зураг шахагдсан эсэхийг шалгана уу.`
      );
    }
    try {
      planned.push({ key: buildStorageKey(bucket, user.id, name, { contentType }), contentType });
    } catch (err) {
      return bad(err.message);
    }
  }

  try {
    const signed = [];
    for (const item of planned) {
      signed.push({
        key: item.key,
        contentType: item.contentType,
        uploadUrl: await presignPut(item.key, item.contentType),
        publicUrl: publicUrlFor(item.key),
      });
    }
    return NextResponse.json({ ok: true, backend: 'r2', files: signed });
  } catch (err) {
    console.error('[storage/presign]', err);
    return NextResponse.json(
      { ok: false, code: 'R2_PRESIGN_FAILED', error: `R2-ийн upload линк үүсгэж чадсангүй: ${err.message}` },
      { status: 502 }
    );
  }
}
