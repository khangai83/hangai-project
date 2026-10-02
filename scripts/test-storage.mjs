// ============================================================
// test-storage.mjs — Storage-ийн дүрмийн тест
//   · `lib/storageKeys.mjs` — түлхүүр/URL/хязгаарын ЦЭВЭР логик
//   · `lib/storageClient.mjs` → `splitStorageUrls()` (хуучин/шинэ ялгах)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-10-02, Supabase Storage → Cloudflare R2):
//   Хуучин хамгаалалт нь Supabase-ийн `storage.objects` RLS байв:
//     `(storage.foldername(name))[1] = auth.uid()::text`
//   Одоо R2 нь RLS-гүй тул тэр дүрмийг `app/api/storage/{presign,delete}`
//   ХҮСЭЛТ БҮРД өөрөө хэрэгжүүлнэ. Тэр дүрэм буруу бол:
//     • өөр хүний зургийг устгах боломжтой болно ✗ (аюулгүй байдал)
//     • эсвэл хуучин файлууд R2 руу шилжихэд зам нь таарахгүй ✗
//   Мөн `storageKeyFromUrl()` нь ХОЁР хэлбэрийн URL-ыг (хуучин Supabase,
//   шинэ R2) задалж чадах ёстой — эс бөгөөс устгалт ажиллахгүй ✓
//
// АЖИЛЛУУЛАХ:  npm run test:storage
// ============================================================
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const KEYS_SRC = path.join(here, '..', 'lib', 'storageKeys.mjs');

// ⚠️ `storageKeys.mjs` нь ЦЭВЭР байх ёстой: ямар ч import/require байвал
//    Node тест болон CJS талаас дуудахад хүндрэл үүснэ (эсвэл нууц
//    түлхүүр bundle-д орох эрсдэлтэй) — үүнийг энд ХАМГААЛНА ✓
const src = fs.readFileSync(KEYS_SRC, 'utf8');
assert(!/^\s*import\s/m.test(src), 'storageKeys.mjs дотор import байх ёсгүй');
assert(!/\brequire\(/.test(src), 'storageKeys.mjs дотор require байх ёсгүй');

const {
  IMAGE_BUCKET,
  AVATAR_BUCKET,
  STORAGE_BUCKETS,
  MAX_LISTING_IMAGES,
  MAX_LISTING_IMAGE_BYTES,
  MAX_AVATAR_BYTES,
  isStorageBucket,
  maxBytesForBucket,
  allowedTypesForBucket,
  normalizeImageType,
  safeImageType,
  isAllowedImageType,
  buildStorageKey,
  extForFile,
  bucketFromKey,
  isOwnedStorageKey,
  storageKeyFromUrl,
  isLegacyStorageUrl,
  legacyStoragePath,
  publicStorageUrl,
} = await import(`${KEYS_SRC}?t=${Date.now()}`);
const { splitStorageUrls } = await import(`${path.join(here, '..', 'lib', 'storageClient.mjs')}?t=${Date.now()}`);

const UID = '8f3c1a2b-4d5e-4f60-9a1b-2c3d4e5f6a7b';
const OTHER = '00000000-1111-2222-3333-444444444444';
const R2_BASE = 'https://img.zarlaa.mn';
const SUPABASE = 'https://abcdefghij.supabase.co';

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 Storage-ийн дүрэм (lib/storageKeys.mjs)\n');

t('STORAGE_BUCKETS: зөвхөн 2 bucket', () => {
  assert.equal(STORAGE_BUCKETS.length, 2);
  assert.ok(STORAGE_BUCKETS.includes(IMAGE_BUCKET));
  assert.ok(STORAGE_BUCKETS.includes(AVATAR_BUCKET));
});

t('isStorageBucket: зөвхөн 2 bucket зөвшөөрнө', () => {
  assert.equal(isStorageBucket('listing-images'), true);
  assert.equal(isStorageBucket('avatars'), true);
  assert.equal(isStorageBucket('public'), false);
  assert.equal(isStorageBucket(''), false);
  assert.equal(isStorageBucket(null), false);
  assert.equal(isStorageBucket('listing-images/../avatars'), false);
});

t('хязгаар: зар 5 MB / аватар 2 MB / нэг зарын зураг 10 (формтой ИЖИЛ)', () => {
  assert.equal(MAX_LISTING_IMAGES, 10);
  assert.equal(maxBytesForBucket(IMAGE_BUCKET), MAX_LISTING_IMAGE_BYTES);
  assert.equal(maxBytesForBucket(AVATAR_BUCKET), MAX_AVATAR_BYTES);
  assert.equal(MAX_LISTING_IMAGE_BYTES, 5 * 1024 * 1024);
  assert.equal(MAX_AVATAR_BYTES, 2 * 1024 * 1024); // 0015-ийн file_size_limit
});

t('төрөл: зар gif/svg зөвшөөрнө, аватар ЗӨВХӨН jpeg/png/webp', () => {
  assert.equal(isAllowedImageType(IMAGE_BUCKET, 'image/gif'), true);
  assert.equal(isAllowedImageType(IMAGE_BUCKET, 'image/svg+xml'), true);
  assert.equal(isAllowedImageType(AVATAR_BUCKET, 'image/webp'), true);
  assert.equal(isAllowedImageType(AVATAR_BUCKET, 'image/gif'), false);
  assert.equal(allowedTypesForBucket(AVATAR_BUCKET).length, 3);
});

t("normalizeImageType: 'IMAGE/JPEG; charset=utf-8' → 'image/jpeg'", () => {
  assert.equal(normalizeImageType('IMAGE/JPEG; charset=utf-8'), 'image/jpeg');
  assert.equal(normalizeImageType('  image/png  '), 'image/png');
  assert.equal(normalizeImageType(undefined), '');
});

t("safeImageType: зөвшөөрөхгүй төрөл → '' (алдаа өгөхөөр)", () => {
  assert.equal(safeImageType(IMAGE_BUCKET, 'image/jpeg'), 'image/jpeg');
  assert.equal(safeImageType(AVATAR_BUCKET, 'application/pdf'), '');
  assert.equal(safeImageType(IMAGE_BUCKET, ''), '');
  assert.equal(safeImageType(IMAGE_BUCKET, 'text/html'), '');
});


t('buildStorageKey: `<bucket>/<uid>/<ts>-<rand>.<ext>` (тогтмол утгаар)', () => {
  const key = buildStorageKey(IMAGE_BUCKET, UID, 'IMG_1234.JPG', { now: 1730000000000, rand: 123456789 });
  assert.equal(key, `listing-images/${UID}/1730000000000-123456789.jpg`);
  const av = buildStorageKey(AVATAR_BUCKET, UID, 'avatar.png', { now: 1, rand: 2 });
  assert.equal(av, `avatars/${UID}/1-2.png`);
});

t('buildStorageKey: ЭХНИЙ ФОЛДЕР нь заавал хэрэглэгчийн id (RLS-ийн орлуулга)', () => {
  const key = buildStorageKey(IMAGE_BUCKET, UID, 'a.jpg', { now: 1, rand: 1 });
  assert.equal(key.split('/')[1], UID);
  assert.equal(isOwnedStorageKey(key, UID), true);
  assert.equal(isOwnedStorageKey(key, OTHER), false);
});

t('buildStorageKey: буруу bucket / хоосон uid → алдаа шиднэ', () => {
  assert.throws(() => buildStorageKey('public', UID, 'a.jpg'), /bucket буруу/);
  assert.throws(() => buildStorageKey(IMAGE_BUCKET, '', 'a.jpg'), /Хэрэглэгчийн id буруу/);
  assert.throws(() => buildStorageKey(IMAGE_BUCKET, 'a/../../b', 'a.jpg'), /Хэрэглэгчийн id буруу/);
  assert.throws(() => buildStorageKey(IMAGE_BUCKET, 'a b', 'a.jpg'), /Хэрэглэгчийн id буруу/);
});

t('extForFile: зөвхөн зургийн өргөтгөл; `evil.php` → MIME-ээр `jpg`', () => {
  assert.equal(extForFile('photo.HEIC', 'image/heic'), 'heic');
  assert.equal(extForFile('x.jpeg', 'image/jpeg'), 'jpeg');
  assert.equal(extForFile('evil.php', 'image/jpeg'), 'jpg');
  assert.equal(extForFile('noext', 'image/png'), 'png');
  assert.equal(extForFile('weird', 'image/x-unknown'), 'jpg');
  assert.equal(extForFile('', ''), 'jpg');
});

t('isOwnedStorageKey: бүтэц ба эзнийг ШАЛГАНА (аюулгүй байдал)', () => {
  const own = `listing-images/${UID}/1-2.jpg`;
  assert.equal(isOwnedStorageKey(own, UID), true);
  assert.equal(isOwnedStorageKey(`avatars/${UID}/1-2.png`, UID), true);
  assert.equal(isOwnedStorageKey(own, ''), false);
  assert.equal(isOwnedStorageKey(own, OTHER), false);
  assert.equal(isOwnedStorageKey(`public/${UID}/1-2.jpg`, UID), false); // буруу bucket
  assert.equal(isOwnedStorageKey(`listing-images/${UID}/1-2.jpg/../x`, UID), false);
  assert.equal(isOwnedStorageKey(`${UID}/1-2.jpg`, UID), false); // bucket дутуу
  assert.equal(isOwnedStorageKey(`listing-images/${UID}/a/b.jpg`, UID), false); // дэд фолдер
  assert.equal(isOwnedStorageKey('', UID), false);
  assert.equal(isOwnedStorageKey(null, UID), false);
});


t('storageKeyFromUrl: ХУУЧИН Supabase URL-ыг задална', () => {
  const url = `${SUPABASE}/storage/v1/object/public/listing-images/${UID}/1730000000000-1.jpg`;
  assert.equal(storageKeyFromUrl(url), `listing-images/${UID}/1730000000000-1.jpg`);
  const av = `${SUPABASE}/storage/v1/object/public/avatars/${UID}/1-2.png`;
  assert.equal(storageKeyFromUrl(av), `avatars/${UID}/1-2.png`);
});

t('storageKeyFromUrl: ШИНЭ R2 URL-ыг ч задална (ИЖИЛ түлхүүр)', () => {
  assert.equal(storageKeyFromUrl(`${R2_BASE}/listing-images/${UID}/1-2.jpg`), `listing-images/${UID}/1-2.jpg`);
  assert.equal(storageKeyFromUrl(`${R2_BASE}/avatars/${UID}/1-2.webp?x=1`), `avatars/${UID}/1-2.webp`);
});

t('storageKeyFromUrl: зам ХАМААРАХГҮЙ (`/storage/v1/object/public/`-д тулгуурлахгүй)', () => {
  // ⚠️ Энэ нь шилжилтийн ГОЛ шаардлага: хоёр хэлбэр ЗЭРЭГ ажиллах ёстой ✓
  const legacy = `${SUPABASE}/storage/v1/object/public/listing-images/${UID}/a.jpg`;
  const modern = `${R2_BASE}/listing-images/${UID}/a.jpg`;
  assert.equal(storageKeyFromUrl(legacy), storageKeyFromUrl(modern));
});

t('storageKeyFromUrl: storage БИШ холбоос → null (устгалт алдаа өгөхгүй)', () => {
  assert.equal(storageKeyFromUrl('https://youtube.com/watch?v=1'), null);
  assert.equal(storageKeyFromUrl('https://example.com/photo.jpg'), null);
  assert.equal(storageKeyFromUrl(`${R2_BASE}/listing-images/${UID}/`), null);
  assert.equal(storageKeyFromUrl(''), null);
  assert.equal(storageKeyFromUrl(null), null);
  assert.equal(storageKeyFromUrl(123), null);
});

t('isLegacyStorageUrl: устгах замыг ЗӨВ сонгоно', () => {
  assert.equal(isLegacyStorageUrl(`${SUPABASE}/storage/v1/object/public/listing-images/${UID}/a.jpg`), true);
  assert.equal(isLegacyStorageUrl(`${R2_BASE}/listing-images/${UID}/a.jpg`), false);
  assert.equal(isLegacyStorageUrl(''), false);
});

t('legacyStoragePath: Supabase `.remove()`-ийн зам', () => {
  assert.equal(legacyStoragePath(`listing-images/${UID}/a.jpg`), `${UID}/a.jpg`);
  assert.equal(legacyStoragePath(`avatars/${UID}/a.png`), `${UID}/a.png`);
  assert.equal(legacyStoragePath(''), '');
});

t('publicStorageUrl: base-ийн төгсгөлийн `/` давхарлахгүй', () => {
  assert.equal(publicStorageUrl(R2_BASE, `listing-images/${UID}/a.jpg`), `${R2_BASE}/listing-images/${UID}/a.jpg`);
  assert.equal(publicStorageUrl(`${R2_BASE}/`, `/listing-images/${UID}/a.jpg`), `${R2_BASE}/listing-images/${UID}/a.jpg`);
  assert.equal(publicStorageUrl('', 'k'), '/k');
});

t('🔁 ROUND-TRIP: buildStorageKey → publicStorageUrl → storageKeyFromUrl (яг ижил)', () => {
  // ⚠️ Энэ гурвын аль нэг нь зөрвөл устгалт/шинэ URL ажиллахгүй болно ✗
  for (const [bucket, name, type] of [
    [IMAGE_BUCKET, 'a.jpg', 'image/jpeg'],
    [IMAGE_BUCKET, 'b.PNG', 'image/png'],
    [AVATAR_BUCKET, 'c.webp', 'image/webp'],
  ]) {
    const key = buildStorageKey(bucket, UID, name, { now: 42, rand: 7, contentType: type });
    const url = publicStorageUrl(R2_BASE, key);
    assert.equal(storageKeyFromUrl(url), key);
    assert.equal(isOwnedStorageKey(key, UID), true);
    assert.equal(isLegacyStorageUrl(url), false);
  }
});

t('bucketFromKey: зөв / буруу түлхүүр', () => {
  assert.equal(bucketFromKey(`listing-images/${UID}/a.jpg`), IMAGE_BUCKET);
  assert.equal(bucketFromKey(`avatars/${UID}/a.jpg`), AVATAR_BUCKET);
  assert.equal(bucketFromKey(`${UID}/a.jpg`), null);
  assert.equal(bucketFromKey(''), null);
});

console.log('\n🧪 Хуучин/шинэ ялгах (lib/storageClient.mjs → splitStorageUrls)\n');

t('splitStorageUrls: R2 түлхүүрүүд → r2Keys', () => {
  const urls = [`${R2_BASE}/listing-images/${UID}/1.jpg`, `${R2_BASE}/listing-images/${UID}/2.jpg`];
  const { legacy, r2Keys } = splitStorageUrls(urls);
  assert.deepEqual(r2Keys, [`listing-images/${UID}/1.jpg`, `listing-images/${UID}/2.jpg`]);
  assert.deepEqual(legacy, {});
});

t('splitStorageUrls: хуучин URL-ууд → bucket-аар бүлэглэнэ', () => {
  const urls = [
    `${SUPABASE}/storage/v1/object/public/listing-images/${UID}/1.jpg`,
    `${SUPABASE}/storage/v1/object/public/listing-images/${UID}/2.jpg`,
    `${SUPABASE}/storage/v1/object/public/avatars/${UID}/a.png`,
  ];
  const { legacy, r2Keys } = splitStorageUrls(urls);
  assert.equal(r2Keys.length, 0);
  assert.deepEqual(legacy['listing-images'], [`${UID}/1.jpg`, `${UID}/2.jpg`]);
  assert.deepEqual(legacy['avatars'], [`${UID}/a.png`]);
});

t('splitStorageUrls: ШИЛЖИЛТИЙН үе — хоёуланг зэрэг зөв ялгана', () => {
  const urls = [
    `${SUPABASE}/storage/v1/object/public/listing-images/${UID}/old.jpg`,
    `${R2_BASE}/listing-images/${UID}/new.jpg`,
    'https://youtube.com/watch?v=x',
    '',
  ];
  const { legacy, r2Keys } = splitStorageUrls(urls);
  assert.deepEqual(legacy['listing-images'], [`${UID}/old.jpg`]);
  assert.deepEqual(r2Keys, [`listing-images/${UID}/new.jpg`]);
});

t('splitStorageUrls: хоосон/undefined оролтод крашгүй', () => {
  assert.deepEqual(splitStorageUrls(), { legacy: {}, r2Keys: [] });
  assert.deepEqual(splitStorageUrls([]), { legacy: {}, r2Keys: [] });
});

console.log('\n🧪 Browser тал (lib/storageClient.mjs) — fetch-ийг ДУУРАЙЖ шалгав\n');

// ⚠️ Эдгээр нь ASYNC тест тул тусдаа helper (дээрх `t` нь sync)
const clientSrc = `${path.join(here, '..', 'lib', 'storageClient.mjs')}?t=${Date.now()}`;
const { requestPresignedUploads, putToR2, deleteR2StorageKeys } = await import(clientSrc);

let passedAsync = 0;
const ta = async (name, fn) => {
  await fn();
  passedAsync += 1;
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const realFetch = globalThis.fetch;
let fetchCalls = [];
function mockFetch(handler) {
  fetchCalls = [];
  globalThis.fetch = async (url, init = {}) => {
    fetchCalls.push({ url: String(url), init });
    return handler(String(url), init);
  };
}
const jsonRes = (status, data) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
});
const fakeSb = (token) => ({
  auth: { getSession: async () => ({ data: { session: token ? { access_token: token } : null } }) },
});

await ta('putToR2: PUT + Content-Type + File body илгээж, publicUrl буцаана', async () => {
  const seen = [];
  mockFetch((url, init) => {
    seen.push({ url, init });
    return { ok: true, status: 200, text: async () => '' };
  });
  const target = { uploadUrl: 'https://r2.example.com/bucket/k.jpg?X-Amz-Signature=x', contentType: 'image/jpeg', publicUrl: 'https://img.example.com/k.jpg' };
  const file = { name: 'k.jpg', type: 'image/jpeg', size: 10 };
  const url = await putToR2(target, file);
  assert.equal(url, target.publicUrl);
  assert.equal(seen[0].init.method, 'PUT');
  assert.equal(seen[0].init.headers['Content-Type'], 'image/jpeg');
  assert.equal(seen[0].init.body, file);
});

await ta('putToR2: 403 үед CORS-ыг сануулсан монгол алдаа шидэнэ', async () => {
  globalThis.fetch = async () => ({ ok: false, status: 403, text: async () => 'SignatureDoesNotMatch (CORS)' });
  await assert.rejects(
    () => putToR2({ uploadUrl: 'https://x/y', contentType: 'image/jpeg' }, {}),
    (err) => /403/.test(err.message) && /CORS/.test(err.message) && /R2_SETUP/.test(err.message)
  );
});

await ta('requestPresignedUploads: сессгүй → NO_SESSION (fetch ХИЙГДЭХГҮЙ)', async () => {
  mockFetch(() => jsonRes(200, { ok: true, files: [] }));
  const res = await requestPresignedUploads(fakeSb(null), 'listing-images', [{ name: 'a.jpg', type: 'image/jpeg', size: 1 }]);
  assert.equal(res.ok, false);
  assert.equal(res.code, 'NO_SESSION');
  assert.equal(fetchCalls.length, 0);
});

await ta('requestPresignedUploads: 503 R2_NOT_CONFIGURED → код ХАДГАЛАГДАНА', async () => {
  mockFetch(() => jsonRes(503, { ok: false, code: 'R2_NOT_CONFIGURED', error: 'R2 дутуу' }));
  const res = await requestPresignedUploads(fakeSb('tok'), 'listing-images', [{ name: 'a.jpg', type: 'image/jpeg', size: 1 }]);
  assert.equal(res.ok, false);
  assert.equal(res.code, 'R2_NOT_CONFIGURED');
  assert.equal(res.error, 'R2 дутуу');
  assert.equal(fetchCalls[0].init.headers.Authorization, 'Bearer tok');
  assert.equal(fetchCalls[0].url, '/api/storage/presign');
});

await ta('requestPresignedUploads: амжилттай → файлууд буцаана', async () => {
  mockFetch(() => jsonRes(200, { ok: true, backend: 'r2', files: [{ key: 'k', uploadUrl: 'u', publicUrl: 'p', contentType: 'image/jpeg' }] }));
  const res = await requestPresignedUploads(fakeSb('tok'), 'avatars', [{ name: 'a.png', type: 'image/png', size: 1 }]);
  assert.equal(res.ok, true);
  assert.equal(res.files.length, 1);
  assert.equal(res.files[0].publicUrl, 'p');
});

await ta('requestPresignedUploads: сүлжээний алдаа → code NETWORK (крашгүй)', async () => {
  globalThis.fetch = async () => {
    throw new Error('boom');
  };
  const res = await requestPresignedUploads(fakeSb('tok'), 'listing-images', []);
  assert.equal(res.ok, false);
  assert.equal(res.code, 'NETWORK');
  assert.match(res.error, /boom/);
});

await ta('deleteR2StorageKeys: алдаа гарсан ч ШИДЭХГҮЙ (зар устгалт сүйтгэхгүй)', async () => {
  globalThis.fetch = async () => {
    throw new Error('network down');
  };
  const res = await deleteR2StorageKeys(fakeSb('tok'), ['listing-images/u/a.jpg']);
  assert.deepEqual(res, { removed: 0, skipped: 1, error: 'network down' });
});

await ta('deleteR2StorageKeys: 502 үед error талбартай, skipped тоологдоно', async () => {
  mockFetch(() => jsonRes(502, { ok: false, error: 'R2-ээс устгаж чадсангүй' }));
  const res = await deleteR2StorageKeys(fakeSb('tok'), ['k1', 'k2']);
  assert.equal(res.removed, 0);
  assert.equal(res.skipped, 2);
  assert.match(res.error, /устгаж чадсангүй/);
});

await ta('deleteR2StorageKeys: амжилттай → removed буцаана', async () => {
  mockFetch(() => jsonRes(200, { ok: true, removed: 2, skipped: 0 }));
  const res = await deleteR2StorageKeys(fakeSb('tok'), ['k1', 'k2']);
  assert.equal(res.removed, 2);
  assert.equal(res.skipped, 0);
  assert.equal(res.error, undefined);
});

await ta('deleteR2StorageKeys: хоосон жагсаалт → fetch ХИЙГДЭХГҮЙ', async () => {
  mockFetch(() => jsonRes(200, { ok: true }));
  const res = await deleteR2StorageKeys(fakeSb('tok'), []);
  assert.deepEqual(res, { removed: 0, skipped: 0 });
  assert.equal(fetchCalls.length, 0);
});

// ---------- 🔒 2026-10-02 — R2 UPLOAD «БЭЛЭН» ЭСЭХ (`R2_PUBLIC_BASE`-ийн ХОГ URL) ----------
// ⚠️ ЯАГААД ЧУХАЛ ВЭ: `r2Config()` нь `R2_PUBLIC_BASE`-ийг ШААРДАДГГҮЙ (устгах/
//    list-д хэрэггүй). Гэтэл 5 утгын 4-ийг л бөглөсөн хэрэглэгч upload хийхэд
//    `publicUrlFor()` нь «https://R2_PUBLIC_BASE-тохируулаагүй/<key>» гэсэн ХОГ
//    URL-ыг DB-д (`listings.images[]`, `profiles.avatar_url`) бичнэ ⇒ зураг
//    ХЭЗЭЭ Ч харагдахгүй ✗  ⇒ `isR2UploadReady()` ийм үед `false` байж,
//    `POST /api/storage/presign` нь 503 → BROWSER хуучин Supabase зам руу буцна ✓
const R2_ENV_SAMPLE = {
  R2_ACCOUNT_ID: 'acc123',
  R2_ACCESS_KEY_ID: 'AKIAEXAMPLE',
  R2_SECRET_ACCESS_KEY: 's3cr3t',
  R2_BUCKET: 'zar-media',
  R2_PUBLIC_BASE: 'https://img.zarlaa.mn',
};
const R2_ENV_ALL = [...Object.keys(R2_ENV_SAMPLE), 'NEXT_PUBLIC_R2_PUBLIC_BASE', 'R2_ENDPOINT'];
// ⚠️ Тусдаа (цэвэр) module instance — `lib/r2.mjs` нь `.env.local`-ыг нэг удаа
//    уншдаг тул БОДИТ .env.local-ыг (хэрэглэгч бөглөсөн байж болно) уншвал тест
//    тогтворгүй болно ✗ ⇒ `process.chdir(tmpdir)`-ээр уншилтыг таслана ✓
const r2lib = await import(`${path.join(here, '..', 'lib', 'r2.mjs')}?t=${Date.now()}`);
const savedEnv = { ...process.env };
const cwdAtStart = process.cwd();
function withR2Env(patch, fn) {
  try {
    process.chdir(os.tmpdir()); // .env.local олдохгүй → env нь ЗӨВХӨН доорхи patch
    for (const k of R2_ENV_ALL) delete process.env[k];
    Object.assign(process.env, patch);
    fn();
  } finally {
    process.chdir(cwdAtStart);
    for (const k of Object.keys(process.env)) if (!(k in savedEnv)) delete process.env[k];
    Object.assign(process.env, savedEnv);
  }
}

t('isR2UploadReady: R2_PUBLIC_BASE-ГҮЙ (5-ын 4) → FALSE ⚠️ (config нь true хэвээр)', () => {
  const { R2_PUBLIC_BASE, ...four } = R2_ENV_SAMPLE;
  withR2Env(four, () => {
    assert.equal(r2lib.isR2Configured(), true, 'r2Config() нь publicBase-гүй ч true (устгах/list-д хэрэгтэй)');
    assert.equal(r2lib.isR2UploadReady(), false, '⚠️ upload нь publicBase-гүй бол FALSE байх ЁСТОЙ');
    assert.equal(
      r2lib.publicUrlFor('listing-images/u/a.jpg'),
      'https://R2_PUBLIC_BASE-тохируулаагүй/listing-images/u/a.jpg',
      '→ ийм ХОГ URL DB-д бичигдэхээс `isR2UploadReady()` хамгаална'
    );
  });
});

t('isR2UploadReady: бүтэн 5 утгатай → true (эерэг зам)', () => {
  withR2Env(R2_ENV_SAMPLE, () => {
    assert.equal(r2lib.isR2UploadReady(), true);
    assert.deepEqual(r2lib.missingR2Env(), []);
    assert.equal(r2lib.publicUrlFor('avatars/u/a.jpg'), 'https://img.zarlaa.mn/avatars/u/a.jpg');
  });
});

t('isR2UploadReady: огт тохируулаагүй → false + missingR2Env = 5 (нөөц зам: Supabase)', () => {
  withR2Env({}, () => {
    assert.equal(r2lib.isR2Configured(), false);
    assert.equal(r2lib.isR2UploadReady(), false);
    assert.deepEqual(r2lib.missingR2Env(), r2lib.R2_ENV_KEYS);
  });
});

t('isR2UploadReady: домэйн нь NEXT_PUBLIC_R2_PUBLIC_BASE-аар өгсөн ч true', () => {
  const { R2_PUBLIC_BASE, ...four } = R2_ENV_SAMPLE;
  withR2Env({ ...four, NEXT_PUBLIC_R2_PUBLIC_BASE: 'https://pub-abc123.r2.dev' }, () => {
    assert.equal(r2lib.isR2UploadReady(), true);
    assert.equal(r2lib.publicUrlFor('avatars/u/a.jpg'), 'https://pub-abc123.r2.dev/avatars/u/a.jpg');
  });
});

// ---------- 🌐 S3 API ENDPOINT — `.env.local`-д БӨГЛӨХ ШААРДЛАГАГҮЙ ----------
// ⚠️ ЯАГААД: `region: auto` + `endpoint` нь `R2_ACCOUNT_ID`-аас автоматаар
//    бүрддэг (`https://<ACCOUNT_ID>.r2.cloudflarestorage.com`) — хэрэглэгч
//    «S3 API endpoint хаана бөглөх вэ?» гэж төөрөхөөс сэргийлж тестээр
//    баталгаажуулна ✓ (bucket → Settings → S3 API дээр яг энэ хаяг харагдана)
t('R2 endpoint: R2_ACCOUNT_ID-аас АВТОМАТААР үүснэ (бөглөх шаардлагагүй)', () => {
  withR2Env(R2_ENV_SAMPLE, () => {
    const cfg = r2lib.r2Config();
    assert.equal(cfg.endpoint, 'https://acc123.r2.cloudflarestorage.com');
    assert.equal(cfg.region, 'auto', 'region нь үргэлж auto (R2-ийн шаардлага)');
  });
});

t('R2 endpoint: R2_ENDPOINT (сонголтоор) дарж бичнэ — ж: EU jurisdiction bucket', () => {
  withR2Env({ ...R2_ENV_SAMPLE, R2_ENDPOINT: 'https://acc123.eu.r2.cloudflarestorage.com' }, () => {
    assert.equal(r2lib.r2Config().endpoint, 'https://acc123.eu.r2.cloudflarestorage.com');
    assert.equal(r2lib.isR2UploadReady(), true, 'R2_ENDPOINT нь ЗААВАЛ биш — upload-д саад болохгүй ✓');
    assert.deepEqual(r2lib.missingR2Env(), [], 'R2_ENDPOINT нь заавал биш тул missing гэж тооцогдохгүй ✓');
  });
});

t('R2 endpoint: R2_ENDPOINT хоосон/зайтай бичигдсэн ч автомат утга хэвээр', () => {
  withR2Env({ ...R2_ENV_SAMPLE, R2_ENDPOINT: '   ' }, () => {
    assert.equal(r2lib.r2Config().endpoint, 'https://acc123.r2.cloudflarestorage.com');
  });
});

globalThis.fetch = realFetch;

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест (үүний ${passedAsync} нь async/browser)\n`);


