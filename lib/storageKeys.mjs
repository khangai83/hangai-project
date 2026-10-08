// ============================================================
// storageKeys.mjs — Storage-ийн ТҮЛХҮҮР (key), URL, хязгаарын ЦЭВЭР дүрэм
//
// ЯАГААД ТУСДАА ФАЙЛ ВЭ (2026-10-02, Supabase Storage → Cloudflare R2):
//   Эдгээр дүрэм ГУРВАН талд нэгэн зэрэг хэрэгжих ёстой:
//     ① Browser  — `lib/queries.js` (upload / устгах), `lib/storageClient.mjs`
//     ② Сервер   — `app/api/storage/*` (presign / delete). Одоо bundle-д
//        орохгүй тул `storage.objects` RLS-ийн оронг `foldername[1] = uid`
//        дүрмийг ХҮСЭЛТ БҮРД ЭНД хэрэгжүүлнэ ✓
//     ③ Шилжилт  — `scripts/migrate-storage-to-r2.mjs`, `scripts/check-r2.mjs`
//   Гурвуулаа НЭГ эх сурвалжаас уншина — эс бөгөөс «браузер зөвшөөрсөн ч
//   сервер татгалзсан» төрлийн зөрчил гарна ✗
//
// ⚠️ ЭНЭ ФАЙЛ ЦЭВЭР: ямар ч import, ямар ч нууц түлхүүр БАЙХГҮЙ тул
//    Node тест (`scripts/test-storage.mjs`) шууд `import` хийнэ ✓
//
// 📦 ЗАМЫН БҮТЭЦ (Supabase-ийн үеэс ХӨНДӨӨГҮЙ — хуучин файлууд хүчинтэй):
//      <bucket>/<user_id>/<timestamp>-<random>.<ext>
//      жишээ: listing-images/8f3c…-uuid/1730000000000-123456789.jpg
//                 ↑ bucket            ↑ эхний фолдер = хэрэглэгчийн id (хамгаалалт)
// ============================================================

/** Зар/хүсэлтийн зураг хадгалах bucket (0001_schema.sql) */
export const IMAGE_BUCKET = 'listing-images';
/** Профайл зураг хадгалах bucket (0015_profiles_public.sql) */
export const AVATAR_BUCKET = 'avatars';
/** Зөвшөөрөгдөх bucket-ууд — бусдыг нь API татгалзана */
export const STORAGE_BUCKETS = [IMAGE_BUCKET, AVATAR_BUCKET];

/** Нэг зард оруулах зургийн ХЭДЭН ТОО (`AddListingClient.jsx`-ийн 10-тай ИЖИЛ) */
export const MAX_LISTING_IMAGES = 10;

/**
 * Хэмжээний хязгаар (FALLBACK — Supabase bucket тохиргооны орлуулга).
 * ⚠️ Client талд `compressImage()` эдгээрээс ХАМААГҮЙ бага болгодог
 *    (зар ~250 KB, аватар ~300 KB). Эдгээр нь зөвхөн «ХАМГИЙН ИХ» хязгаар ✓
 */
export const MAX_LISTING_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB (0015-ийн file_size_limit-тай ижил)

/** Зөвшөөрөгдөх MIME төрлүүд (Supabase bucket тохиргооны ИЖИЛ) */
export const LISTING_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
export const AVATAR_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Төрөл тодорхойгүй үед хэрэглэх өргөтгөл */
export const DEFAULT_IMAGE_EXT = 'jpg';

/** MIME → өргөтгөл (файлын нэрэнд өргөтгөл байхгүй үед) */
const EXT_BY_TYPE = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/** Аюулгүй өргөтгөл: зөвхөн жижиг үсэг/тоо */
const SAFE_EXT = /^[a-z0-9]{1,5}$/;
/**
 * ЗӨВХӨН ЗУРГИЙН өргөтгөлүүд.
 * ⚠️ ЯАГААД WHITELIST ВЭ: R2 нь статик сан тул `.php` ажиллахгүй ч
 *    `з.jpg` → `evil.php` болж харагдах нь ойлгомжгүй ба `Content-Type`
 *    гарын үсэгтэй зөрчилдөнө. Танихгүй өргөтгөлийг MIME-ээр сольж,
 *    эс бөгөөс `jpg` болгоно ✓
 */
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'jfif', 'png', 'webp', 'gif', 'svg', 'avif', 'heic', 'heif', 'bmp', 'tif', 'tiff']);
/** Аюулгүй файлын нэр (түлхүүрийн 3 дахь хэсэг) */
const SAFE_FILE = /^[A-Za-z0-9._-]{1,120}$/;
/** Хэрэглэгчийн id (Supabase uuid) */
const SAFE_USER_ID = /^[A-Za-z0-9-]{1,64}$/;

/** `'listing-images'` мэт bucket эсэх */
export function isStorageBucket(value) {
  return STORAGE_BUCKETS.includes(String(value || '').trim());
}

/** Тухайн bucket-ийн хамгийн их хэмжээ (байт) */
export function maxBytesForBucket(bucket) {
  return bucket === AVATAR_BUCKET ? MAX_AVATAR_BYTES : MAX_LISTING_IMAGE_BYTES;
}

/** Тухайн bucket-д зөвшөөрөгдөх MIME төрлүүд */
export function allowedTypesForBucket(bucket) {
  return bucket === AVATAR_BUCKET ? AVATAR_IMAGE_TYPES : LISTING_IMAGE_TYPES;
}

/**
 * MIME төрлийг цэвэрлэнэ: `'IMAGE/JPEG; charset=x'` → `'image/jpeg'`.
 * Хоосон/буруу бол `''` (дуудагч тал нь DEFAULT-оор шийднэ).
 */
export function normalizeImageType(type) {
  return String(type || '').split(';')[0].trim().toLowerCase();
}

/**
 * Хүсэлтэд ирсэн төрлийг ИТГЭМЖТЭЙ болгоно: зөвшөөрөгдөх төрөл бол түүнийг,
 * эс бөгөөс `''` (дуудагч тал нь алдаа өгнө — «ямар ч файл зөвшөөрөх» БИШ).
 */
export function safeImageType(bucket, type) {
  const clean = normalizeImageType(type);
  return isAllowedImageType(bucket, clean) ? clean : '';
}

/** Тухайн bucket-д энэ төрөл зөвшөөрөгдөх эсэх */
export function isAllowedImageType(bucket, type) {
  return allowedTypesForBucket(bucket).includes(normalizeImageType(type));
}


/**
 * Хадгалах ТҮЛХҮҮР (key) байгуулна.
 *
 * ⚠️ Эхний фолдер нь ЗААВАЛ хэрэглэгчийн id — энэ нь хуучин Supabase RLS
 *    политикийн (`(storage.foldername(name))[1] = auth.uid()::text`) ЯГ
 *    ижил хамгаалалт бөгөөд одоо `app/api/storage/delete` шалгана ✓
 *
 * @param {string} bucket `listing-images` эсвэл `avatars`
 * @param {string} userId Supabase хэрэглэгчийн id
 * @param {string} fileName Эх файлын нэр (зөвхөн өргөтгөлийг нь авна)
 * @param {{now?:number, rand?:number, contentType?:string}} [opts] Тестэд тогтмол утга өгнө
 * @returns {string} `<bucket>/<userId>/<ts>-<rand>.<ext>`
 */
export function buildStorageKey(bucket, userId, fileName, opts = {}) {
  if (!isStorageBucket(bucket)) {
    throw new Error(`Storage bucket буруу: «${bucket}». Зөвшөөрөгдөх: ${STORAGE_BUCKETS.join(', ')}.`);
  }
  const uid = String(userId || '').trim();
  if (!SAFE_USER_ID.test(uid) || uid.includes('..')) {
    throw new Error('Хэрэглэгчийн id буруу байна (эхлээд нэвтэрнэ үү).');
  }
  const ext = extForFile(fileName, opts.contentType);
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const rand = Number.isFinite(opts.rand) ? Math.trunc(opts.rand) : Math.round(Math.random() * 1e9);
  return `${bucket}/${uid}/${now}-${rand}.${ext}`;
}

/** Файлын нэр/төрлөөс АЮУЛГҮЙ өргөтгөл гаргана (`.JPG` → `jpg`) */
export function extForFile(fileName, contentType) {
  const raw = String(fileName || '').trim();
  const dot = raw.lastIndexOf('.');
  if (dot >= 0 && dot < raw.length - 1) {
    const ext = raw
      .slice(dot + 1)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    if (SAFE_EXT.test(ext) && IMAGE_EXTS.has(ext)) return ext;
  }
  return EXT_BY_TYPE[normalizeImageType(contentType)] || DEFAULT_IMAGE_EXT;
}

/** Түлхүүрээс bucket-ийн нэрийг салгана (`null` — буруу түлхүүр) */
export function bucketFromKey(key) {
  const first = String(key || '').trim().split('/')[0];
  return isStorageBucket(first) ? first : null;
}

/**
 * Түлхүүр нь ЗӨВХӨН энэ хэрэглэгчийнх эсэх.
 *
 * ⚠️ АЮУЛГИЙН ХАМГААЛАЛТ: өөр хүний зургийг устгах хүсэлтээс сэргийлнэ
 *    (хуучин Storage RLS-ийн оронгүй болсон тул ЗААВАЛ хэрэгтэй).
 * @param {string} key `<bucket>/<uid>/<file>`
 * @param {string} userId
 */
export function isOwnedStorageKey(key, userId) {
  const parts = String(key || '').trim().split('/');
  if (parts.length !== 3) return false;
  const [bucket, uid, file] = parts;
  if (!isStorageBucket(bucket)) return false;
  if (!SAFE_USER_ID.test(uid)) return false;
  if (uid !== String(userId || '').trim()) return false;
  if (!SAFE_FILE.test(file) || file.includes('..')) return false;
  return true;
}

/**
 * Хадгалсан URL-ээс түлхүүрийг ЯЛГАЖ авна. Хоёр хэлбэрийг ДЭМЖИНЭ:
 *   ① Хуучин: `https://<ref>.supabase.co/storage/v1/object/public/listing-images/<uid>/<f>`
 *   ② Шинэ:   `https://<R2 домэйн>/listing-images/<uid>/<f>`
 * ⚠️ Илэрхийлэл нь `/storage/v1/object/public/` БИШ — зөвхөн bucket сегментээр
 *    хайдаг тул хоёуланд нь ажиллана ✓
 * @returns {string|null} `listing-images/<uid>/<f>` эсвэл `null`
 */
export function storageKeyFromUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  let path = raw;
  try {
    path = new URL(raw).pathname;
  } catch (e) {
    /* URL биш бол түүхий мөрөө задална */
  }
  path = path.split('?')[0].split('#')[0];
  for (const bucket of STORAGE_BUCKETS) {
    const needle = `/${bucket}/`;
    const at = path.indexOf(needle);
    if (at >= 0) {
      const key = `${bucket}/${path.slice(at + needle.length)}`.replace(/\/+$/, '');
      const parts = key.split('/');
      if (parts.length >= 3 && SAFE_FILE.test(parts[2])) return key;
      return null;
    }
  }
  return null;
}

/** Хуучин Supabase Storage-ийн URL эсэх (устгах замыг сонгоход хэрэгтэй) */
export function isLegacyStorageUrl(url) {
  return /\/storage\/v1\/object\/public\//.test(String(url || ''));
}

/**
 * Хуучин Supabase Storage-ийн ЗАМ (`sb.storage.from(bucket).remove([...])`-д).
 * `listing-images/<uid>/<f>` → `<uid>/<f>`
 */
export function legacyStoragePath(key) {
  return String(key || '')
    .split('/')
    .slice(1)
    .join('/');
}

/** Нийтийн URL угсарна: `<base>/<key>` (base-ийн төгсгөлийн `/` давхарлахгүй) */
export function publicStorageUrl(base, key) {
  const root = String(base || '').replace(/\/+$/, '');
  return `${root}/${String(key || '').replace(/^\/+/, '')}`;
}

/** base-ийн төгсгөлийн `/`-уудыг хасна (дотоод туслах) */
function normalizeBase(base) {
  return String(base || '').trim().replace(/\/+$/, '');
}

/**
 * `url`-ийн НИЙТИЙН ДОМЭЙН (угтвар) — storage-ийн URL БИШ бол `null`.
 *   `https://pub-x.r2.dev/listing-images/<uid>/a.jpg` → `https://pub-x.r2.dev`
 *   `https://ab.supabase.co/storage/…` → `https://ab.supabase.co` (мөн ажиллана)
 */
export function publicBaseOf(url) {
  const raw = String(url || '').trim();
  const key = storageKeyFromUrl(raw);
  if (!raw || !key) return null;
  const at = raw.indexOf(key);
  if (at <= 0) return null;
  return normalizeBase(raw.slice(0, at));
}

/**
 * Нийтийн домэйн СОЛИГДСОН үед URL-ыг шинэ домэйн рүү шилжүүлнэ (ЦЭВЭР).
 *
 * ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ: URL нь DB-д БИЧИГДЭЖ хадгалагддаг тул
 *    `R2_PUBLIC_BASE`-ыг сольсон тэр мөчөөс (ж: `r2.dev` → `img.zarbook.mn`)
 *    ХУУЧИН бичигдсэн URL-ууд хуучин домэйн дээрээ үлддэг — r2.dev-ийг
 *    унтраавал тэдгээр зураг НУРНА ✗ Тиймээс `npm run storage:rebase`
 *    энэ функцийг ашиглаж DB-д бичигдсэн URL-уудыг шинэчилнэ ✓
 *
 * ⚠️ Дараах тохиолдолд ЯМАР Ч ҮЕД хөндөхгүй (яг ижил утгыг буцаана):
 *    • Хуучин Supabase URL (`/storage/v1/object/public/…`) — hybrid горимд
 *      тэдгээр нь зөв замаараа үлдэх ёстой ✓
 *    • storage-ийн бүтэцгүй утга (youtube холбоос, демо placeholder)
 *    • угтвар нь `fromBase`-тай таарахгүй (`fromBase` хоосон бол ч)
 *    • `fromBase === toBase` (хөрвүүлэх зүйлгүй)
 * @returns {string} шинэ URL эсвэл ХӨНДӨӨГҮЙ эх утга
 */
export function rebaseStorageUrl(url, fromBase, toBase) {
  const raw = String(url || '').trim();
  if (!raw) return url;
  const key = storageKeyFromUrl(raw);
  if (!key) return url;
  if (isLegacyStorageUrl(raw)) return url;
  const from = normalizeBase(fromBase);
  const to = normalizeBase(toBase);
  if (!from || !to || from === to) return url;
  if (!raw.startsWith(`${from}/`)) return url;
  // ⚠️ key-гийн дараах хэсэг (?query/#hash) хэвээр үлдэнэ
  return `${to}/${raw.slice(from.length + 1)}`;
}

/** Массив дээрх `rebaseStorageUrl` — ШИНЭ массив буцаана (эх массив хөндөгдөхгүй) */
export function rebaseStorageUrls(urls, fromBase, toBase) {
  const list = Array.isArray(urls) ? urls : [];
  return list.map((u) => rebaseStorageUrl(u, fromBase, toBase));
}

