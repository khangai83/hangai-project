// ============================================================
// storageClient.mjs — Browser талын R2 туслах (presign → PUT → URL)
//
// УРСГАЛ (🅰️ сонголт — Direct Client to R2):
//   ① `compressImage()` (lib/imageUtils.js) — зураг аль хэдийн шахагдсан
//   ② `requestPresignedUploads()` — манай API-аас ~10 мин хүчинтэй PUT линк
//   ③ `putToR2()` — файлыг R2 руу ШУУД илгээнэ (Vercel-ээр дамжихгүй!)
//
// ⚠️ Энд НУУЦ түлхүүр БАЙХГҮЙ — зөвхөн серверээс авсан түр линк ✓
// ============================================================
import { bucketFromKey, isLegacyStorageUrl, legacyStoragePath, storageKeyFromUrl } from './storageKeys.mjs';

const PRESIGN_ENDPOINT = '/api/storage/presign';
const DELETE_ENDPOINT = '/api/storage/delete';

/** Нэвтэрсэн хэрэглэгчийн access token (байхгүй бол `null`) */
async function accessToken(sb) {
  try {
    const { data } = await sb.auth.getSession();
    return (data && data.session && data.session.access_token) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Серверээс PUT линкүүд асууна.
 *
 * @returns {Promise<{ok:true, files:Array}|{ok:false, code:string, error:string}>}
 *   `code: 'R2_NOT_CONFIGURED'` (503) → R2 хараахан тохируулаагүй тул
 *   дуудагч тал ХУУЧИН Supabase Storage руу буцах ёстой ✓
 */
export async function requestPresignedUploads(sb, bucket, files = []) {
  const token = await accessToken(sb);
  if (!token) return { ok: false, code: 'NO_SESSION', error: 'Эхлээд нэвтрэх шаардлагатай' };

  let res;
  try {
    res = await fetch(PRESIGN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        bucket,
        files: files.map((f) => ({ name: f.name, type: f.type, size: f.size })),
      }),
    });
  } catch (e) {
    return { ok: false, code: 'NETWORK', error: `Сүлжээний алдаа: ${(e && e.message) || 'холбогдож чадсангүй'}` };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok !== true) {
    return {
      ok: false,
      code: data.code || `HTTP_${res.status}`,
      error: data.error || `Storage серверээс алдаа (HTTP ${res.status})`,
    };
  }
  return { ok: true, files: Array.isArray(data.files) ? data.files : [] };
}

/**
 * Файлыг R2 руу ШУУД илгээнэ (presigned PUT).
 * ⚠️ `Content-Type` нь серверийн гарын үсэгт орсон ЯГ тэр утга байх ёстой.
 * @returns {Promise<string>} нийтийн URL
 */
export async function putToR2(target, file) {
  let res;
  try {
    res = await fetch(target.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': target.contentType },
      body: file,
    });
  } catch (e) {
    // ⚠️⚠️ CORS тохируулаагүй үед browser нь preflight (OPTIONS)-ыг хийж
    //    чадалгүй fetch-ийг АЛДААТАЙ болгодог (status/response ОГТ БАЙХГҮЙ)
    //    → хэрэглэгч зөвхөн «Failed to fetch» / Safari-д «Load failed» гэсэн
    //    ойлгомжгүй мессеж хардаг байв ✗  Тиймээс шалтгааныг МОНГОЛООР хэлж,
    //    зааврыг холбоно ✓ (эс бөгөөс доорх `!res.ok` салбар ХҮРЭХГҮЙ)
    throw new Error(
      'Зургийг R2 руу илгээж чадсангүй. Хамгийн их магадлалтай нь R2 bucket-ийн ' +
        'CORS Policy тохируулаагүй (PUT + content-type зөвшөөрөх ёстой) — ' +
        'docs/R2_SETUP.md §4 · шалгах: npm run check:r2 ' +
        `[${(e && e.message) || 'fetch failed'}]`,
      { cause: e }
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const cors = /cors|preflight|forbidden/i.test(text) ? ' (CORS тохиргоог шалгана уу — docs/R2_SETUP.md)' : '';
    throw new Error(`Зургийг R2 руу илгээж чадсангүй (HTTP ${res.status}).${cors} ${String(text).slice(0, 200)}`);
  }
  return target.publicUrl;
}

/**
 * R2 дээрх түлхүүрүүдийг устгана.
 * ⚠️ ХЭЗЭЭ Ч шидэхгүй — устгалт нь үндсэн үйлдлийг (зар устгах) сүйтгэхгүй.
 * @returns {Promise<{removed:number, skipped:number, error?:string}>}
 */
export async function deleteR2StorageKeys(sb, keys = []) {
  const clean = (keys || []).filter(Boolean);
  if (!clean.length) return { removed: 0, skipped: 0 };
  const token = await accessToken(sb);
  if (!token) return { removed: 0, skipped: clean.length, error: 'Нэвтрэх шаардлагатай' };
  try {
    const res = await fetch(DELETE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ keys: clean }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok !== true) {
      return { removed: 0, skipped: clean.length, error: data.error || `HTTP ${res.status}` };
    }
    return { removed: Number(data.removed) || 0, skipped: Number(data.skipped) || 0 };
  } catch (e) {
    return { removed: 0, skipped: clean.length, error: (e && e.message) || 'сүлжээний алдаа' };
  }
}

/**
 * Зургийн URL-уудыг ХУУЧИН (Supabase) ба ШИНЭ (R2) гэж ялгана.
 *
 * ⚠️ Шилжилтийн үед ХОЁУЛАА байж болно: хуучин зарууд Supabase-д, шинэ
 *    зарууд R2 дээр. Тиймээс устгахдаа хоёр замаар явна ✓
 * @returns {{legacy: Object<string,string[]>, r2Keys: string[]}}
 *   `legacy` — `{ 'listing-images': ['<uid>/<f>', …] }` (Supabase-ийн зам)
 */
export function splitStorageUrls(urls = []) {
  const legacy = {};
  const r2Keys = [];
  for (const url of urls) {
    const key = storageKeyFromUrl(url);
    if (!key) continue;
    if (isLegacyStorageUrl(url)) {
      const bucket = bucketFromKey(key);
      if (!bucket) continue;
      if (!legacy[bucket]) legacy[bucket] = [];
      legacy[bucket].push(legacyStoragePath(key));
    } else {
      r2Keys.push(key);
    }
  }
  return { legacy, r2Keys };
}
