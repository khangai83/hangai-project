// ============================================================
// test-image.mjs — Зургийн ФОРМАТ ба ШАХАЛТЫН дүрмийн тест
//   · `lib/imageUtils.mjs` → `imageTypeOf()` / `imageCompressionPlan()`
//     (ЦЭВЭР функцууд — DOM/Canvas ХҮРЭХГҮЙ) ✓
//   · `compressImage()` / `compressImages()` — fake `document`/canvas-аар
//     (жинхэнэ browser-ийн оронг дуурайна) ✓
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-10-09, «зургийн олон формат» хэрэглэгчийн хүсэлт):
//   Зураг нь ХАРАГДАХ ёстой — тиймээс шийдвэр ЗӨВХӨН «шахна/шахгүй» биш:
//     ① gif/svg нь хөдөлгөөн/вектороо хадгалж ХӨНДӨӨГДӨХГҮЙ (шахвал алдана ✗)
//     ② жижиг webp/avif нь хэвээр үлдэнэ (дахин JPEG болгох нь чанар алдана)
//     ③ бусад формат (jpeg/png/heic/tiff/bmp) → JPEG болно ⇒ сервер рүү
//        ЗӨВХӨН browser харуулж чадах төрөл л очно ✓
//     ④ УНШИЖ ЧАДААГҮЙ формат (ж: Chrome дээрх heic/tiff) → `failed: true`
//        байх ЁСТОЙ — эс бөгөөс хэрэглэгч серверээс «төрөл буруу» гэсэн
//        ойлгомжгүй мессеж харна ✗
//
// АЖИЛЛУУЛАХ:  npm run test:image
// ============================================================
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '..', 'lib', 'imageUtils.mjs');

const {
  formatBytes,
  imageTypeOf,
  imageCompressionPlan,
  compressImage,
  compressImages,
  SUPPORTED_IMAGE_FORMATS,
  UNREADABLE_IMAGE_HINT,
} = await import(`${SRC}?t=${Date.now()}`);

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 Зургийн формат ба шахалт (lib/imageUtils.mjs)\n');

// ---------- ЦЭВЭР функцууд (DOM-гүй) ----------

t("formatBytes: B/KB/MB (бүхэл тоо болгож)", () => {
  assert.equal(formatBytes(512), '512 B');
  assert.equal(formatBytes(2048), '2 KB');
  assert.equal(formatBytes(1536000), '1.46 MB');
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(null), '0 B');
});

t('imageTypeOf: MIME байвал түүнийг, хоосон бол НЭРЭЭС', () => {
  assert.equal(imageTypeOf({ type: 'image/png', name: 'a.png' }), 'image/png');
  assert.equal(imageTypeOf({ type: 'IMAGE/JPEG; charset=x', name: 'a.jpg' }), 'image/jpeg');
  assert.equal(imageTypeOf({ type: '', name: 'IMG_1.HEIC' }), 'image/heic');
  assert.equal(imageTypeOf({ type: 'application/octet-stream', name: 'b.avif' }), 'image/avif');
  assert.equal(imageTypeOf({ name: 'evil.exe' }), '');
  assert.equal(imageTypeOf(null), '');
});

t('imageCompressionPlan: gif/svg → ШАХДАГГҮЙ (хөдөлгөөн/вектор алдана)', () => {
  const gif = imageCompressionPlan({ name: 'a.gif', type: 'image/gif', size: 5 * 1024 * 1024 });
  assert.equal(gif.compress, false);
  assert.match(gif.reason, /GIF/);
  assert.equal(imageCompressionPlan({ name: 'a.svg', type: 'image/svg+xml', size: 999 }).compress, false);
});

t('imageCompressionPlan: жижиг webp/avif → ШАХДАГГҮЙ (аль хэдийн шахагдсан)', () => {
  const webp = imageCompressionPlan({ name: 'a.webp', type: 'image/webp', size: 200 * 1024 });
  assert.equal(webp.compress, false);
  assert.match(webp.reason, /шахагдсан/);
  assert.equal(imageCompressionPlan({ name: 'a.avif', type: 'image/avif', size: 900 * 1024 }).compress, false);
  // ⚠️ `maxBytes`-ээс ТОМ бол шахах ёстой (эс бөгөөс 5 MB хязгаарт унана ✗)
  assert.equal(imageCompressionPlan({ name: 'a.webp', type: 'image/webp', size: 4 * 1024 * 1024 }).compress, true);
  assert.equal(
    imageCompressionPlan({ name: 'a.webp', type: 'image/webp', size: 200 * 1024 }, { maxBytes: 100 * 1024 }).compress,
    true
  );
});

t('imageCompressionPlan: jpeg/png/heic/tiff/bmp → JPEG болгоно', () => {
  for (const [name, type] of [
    ['a.jpg', 'image/jpeg'],
    ['a.png', 'image/png'],
    ['a.heic', 'image/heic'],
    ['a.tiff', 'image/tiff'],
    ['a.bmp', 'image/bmp'],
    ['a.jpg', ''], // ⚠️ MIME хоосон — НЭРЭЭР нь танина ✓
  ]) {
    const plan = imageCompressionPlan({ name, type, size: 3 * 1024 * 1024 });
    assert.equal(plan.compress, true, `${name} шахгдах ёстой`);
  }
  // ⚠️ НЭРЭЭР нь танигдсан формат (`photo.heic` — MIME хоосон) ч шахгдана ✓
  assert.equal(imageCompressionPlan({ name: 'photo.heic', type: '', size: 9 * 1024 * 1024 }).compress, true);
});

t('imageCompressionPlan: зураг БИШ → шахдаггүй (`зураг биш`)', () => {
  assert.match(imageCompressionPlan({ name: 'v.mp4', type: 'video/mp4', size: 10 }).reason, /зураг биш/);
  assert.match(imageCompressionPlan({ name: 'evil.exe', type: '', size: 10 }).reason, /зураг биш/);
  assert.match(imageCompressionPlan(null).reason, /байхгүй/);
});

t('мессежүүд: формат жагсаалт ба зөвлөгөө нь ХООСОН биш ✓', () => {
  assert.match(SUPPORTED_IMAGE_FORMATS, /JPEG/);
  assert.match(SUPPORTED_IMAGE_FORMATS, /AVIF/);
  assert.match(UNREADABLE_IMAGE_HINT, /HEIC/);
  assert.match(UNREADABLE_IMAGE_HINT, /JPEG болгож хөрвүүлээд/);
});

// ---------- BROWSER тал — fake `document`/canvas (Canvas API-г дуурайв) ----------

console.log('\n🧪 Browser тал (compressImage / compressImages) — canvas-ыг ДУУРАЙЖ шалгав\n');

let passedAsync = 0;
const ta = async (name, fn) => {
  await fn();
  passedAsync += 1;
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const realDocument = globalThis.document;
const realBitmap = globalThis.createImageBitmap;
const realImage = globalThis.Image;

/** Canvas-ийн дуудалтын бүртгэл (өргөн/чанар/төрөл) */
let canvasCalls = [];
/** `toBlob`-оос буцах хэмжээнүүд (дарааллаар; дууссан бол 100 KB) */
let blobSizes = [];

function fakeContext() {
  return {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: '',
    fillStyle: '',
    fillRect() {},
    drawImage() {},
  };
}

function useFakeCanvas() {
  canvasCalls = [];
  blobSizes = [];
  globalThis.document = {
    createElement: () => {
      const canvas = {
        width: 0,
        height: 0,
        getContext: fakeContext,
        toBlob: (cb, type, quality) => {
          canvasCalls.push({ width: canvas.width, height: canvas.height, type, quality });
          const size = blobSizes.length ? blobSizes.shift() : 100 * 1024;
          cb(new Blob([new Uint8Array(size)], { type }));
        },
      };
      return canvas;
    },
  };
  // 3200×2400 эх зураг (утасны камерын хэмжээ)
  globalThis.createImageBitmap = async () => ({ width: 3200, height: 2400, close() {} });
}

/** `size` байт файл (Node-ийн `File`/`Blob` хэрэглэнэ) */
const fakeFile = (name, type, size) => new File([new Uint8Array(size)], name, { type });

await ta('compressImage: ямар ч формат → 1600px · JPEG · `<нэр>.jpg`', async () => {
  useFakeCanvas();
  const src = fakeFile('IMG_0001.png', 'image/png', 2 * 1024 * 1024);
  const r = await compressImage(src);

  assert.equal(r.failed, undefined, 'failed байх ёсгүй');
  assert.equal(r.file.type, 'image/jpeg', 'JPEG болсон');
  assert.equal(r.name, 'IMG_0001.jpg', 'өргөтгөл нь jpg болсон');
  assert.equal(r.file.name, 'IMG_0001.jpg');
  assert.equal(canvasCalls[0].type, 'image/jpeg');
  assert.equal(canvasCalls[0].width, 1600, 'хамгийн урт тал 1600px');
  assert.equal(canvasCalls[0].height, 1200, 'пропорц хадгалагдсан (4:3)');
  assert.ok(r.savedPercent > 90, `хэмнэлт бичигдсэн: ${r.savedPercent}%`);
  assert.equal(r.originalSize, src.size);
});

await ta('compressImage: `maxBytes`-ээс том бол чанарыг ААЖМААР бууруулна', async () => {
  useFakeCanvas();
  blobSizes = [3 * 1024 * 1024, 300 * 1024]; // 1 дэх нь хэт том → 2 дахь нь OK
  const r = await compressImage(fakeFile('a.png', 'image/png', 4 * 1024 * 1024));

  assert.equal(canvasCalls.length, 2, 'хоёр удаа toBlob хийсэн');
  assert.equal(Number(canvasCalls[0].quality.toFixed(2)), 0.82);
  assert.equal(Number(canvasCalls[1].quality.toFixed(2)), 0.74, 'чанар 0.08-аар буурсан');
  assert.equal(r.quality, 0.74);
  assert.equal(r.newSize, 300 * 1024);
});

await ta('compressImage: шахаасан нь ИЛҮҮ ТОМ болвол эхийг хэвээр үлдээнэ', async () => {
  useFakeCanvas();
  // 50 KB png → JPEG нь 500 KB (ТОМ, `maxBytes`-ээс бага тул loop эргэхгүй)
  blobSizes = [500 * 1024];
  const src = fakeFile('tiny.png', 'image/png', 50 * 1024);
  const r = await compressImage(src);

  assert.equal(r.skipped, true);
  assert.equal(r.failed, false, 'ЭНД failed БИШ (файл нь хүчинтэй ✓)');
  assert.equal(r.file, src, 'эх файл ХЭВЭЭРЭЭ буцсан');
  assert.equal(r.savedBytes, 0);
});



await ta('compressImage: gif/svg/webp → canvas ХҮРЭХГҮЙ (`skipped`)', async () => {
  useFakeCanvas();
  for (const [name, type] of [
    ['anim.gif', 'image/gif'],
    ['logo.svg', 'image/svg+xml'],
    ['small.webp', 'image/webp'],
    ['small.avif', 'image/avif'],
  ]) {
    const r = await compressImage(fakeFile(name, type, 300 * 1024));
    assert.equal(r.skipped, true, `${name} алгасах ёстой`);
    assert.equal(r.failed, false, `${name} алдаа БИШ`);
    assert.equal(r.file.name, name, `${name} нэрээ хадгална`);
  }
  assert.equal(canvasCalls.length, 0, 'canvas огт хүрэгдээгүй ✓');
});

await ta('compressImage: УНШИЖ ЧАДААГҮЙ формат → `failed: true` (чимээгүй өнгөрөхгүй)', async () => {
  useFakeCanvas();
  globalThis.createImageBitmap = async () => {
    throw new Error('decode failed');
  };
  globalThis.Image = undefined; // fallback зам ч унана (Node-д `Image` байхгүй)
  const heic = fakeFile('IMG_9.heic', 'image/heic', 3 * 1024 * 1024);
  const r = await compressImage(heic);

  assert.equal(r.failed, true, '⚠️ `failed` байх ЁСТОЙ — эс бөгөөс сервер «төрөл буруу» гэнэ ✗');
  assert.equal(r.skipped, true);
  assert.equal(r.file, heic, 'эх файл буцна (дуудагч тал хаяна)');
  assert.ok(r.reason, 'шалтгаан бичигдсэн');
});

await ta('compressImages: холимог жагсаалт — failed тоо/нэр, ИНДЕКС ТААРАЛТАЙ', async () => {
  useFakeCanvas();
  globalThis.createImageBitmap = async (f) => {
    if (String(f.name).endsWith('.heic')) throw new Error('decode failed');
    return { width: 3200, height: 2400, close() {} };
  };
  globalThis.Image = undefined;
  const report = await compressImages([
    fakeFile('a.png', 'image/png', 2 * 1024 * 1024),
    fakeFile('b.heic', 'image/heic', 2 * 1024 * 1024),
    fakeFile('c.gif', 'image/gif', 50 * 1024),
  ]);

  assert.equal(report.items.length, 3, 'items нь оролттой индексээр таарна');
  assert.equal(report.failed, 1);
  assert.deepEqual(report.failedNames, ['b.heic']);
  assert.equal(report.items.filter((it) => !it.failed).length, 2, '2 нь АМЖИЛТТАЙ ✓');
  assert.equal(report.items[1].failed, true);
  assert.ok(report.totalOriginal > 0);
});

await ta('compressImages: хоосон оролт → крашгүй, 0 тайлан', async () => {
  const report = await compressImages([]);
  assert.deepEqual(report.items, []);
  assert.equal(report.failed, 0);
  assert.deepEqual(report.failedNames, []);
  assert.equal(report.savedPercent, 0);
  assert.equal((await compressImages(undefined)).items.length, 0);
});

await ta('compressImage: `document`-гүй (SSR/Node) орчинд ХӨНДӨХГҮЙ', async () => {
  globalThis.document = undefined;
  const src = fakeFile('a.png', 'image/png', 2 * 1024 * 1024);
  const r = await compressImage(src);
  assert.equal(r.skipped, true);
  assert.equal(r.failed, false, 'SSR дээр «алдаа» гэж үзэхгүй');
  assert.equal(r.reason, 'browser биш');
});

// Эх орчноо буцаана (бусад тестэд нөлөөлөхгүй ✓)
globalThis.document = realDocument;
globalThis.createImageBitmap = realBitmap;
globalThis.Image = realImage;

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест (үүний ${passedAsync} нь async/browser)\n`);
