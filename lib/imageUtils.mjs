// ============================================================
// imageUtils.mjs — Зургийг browser дээр шахаж (resize + JPEG) хэмнэх
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Гар утасны камер 3–12 MB хэмжээтэй зураг үүсгэдэг. Одоогийн `uploadImages`
//   нь түүнийг ЯМАР Ч БОЛОВСРУУЛАЛТГҮЙГЭЭР Storage руу хадгалдаг байсан тул
//   10 зураг = 30–120 MB. Энэ модуль нь ИЛГЭЭХЭЭС ӨМНӨ:
//     • хамгийн урт талыг `maxDim` (default 1600px) болгож жижигрүүлнэ
//     • JPEG болгож, чанарыг `quality` (default 0.82) болгоно
//     • `maxBytes`-ээс том бол чанарыг аажмаар бууруулна
//   Үр дүн: 6 MB → ~250 KB (~95% хэмнэлт), нүдэнд ялгагдахгүй.
//
// 🖼 ОЛОН ФОРМАТ (2026-10-09 — хэрэглэгчийн хүсэлт: «зургийн олон формат
//    дэмжье»): хэрэглэгч ЯМАР Ч форматын зураг сонгож болно. Шийдвэрийг
//    `imageCompressionPlan()` (ЦЭВЭР функц — DOM ХҮРЭХГҮЙ, Node тестэд
//    шалгана ✓) гаргана:
//      ① `gif` · `svg` → ШАХДАГГҮЙ: хөдөлгөөн (анимац) ба вектор алдагдана ✗
//      ② `webp` · `avif` бөгөөд `maxBytes`-ээс БАГА → ШАХДАГГҮЙ: аль хэдийн
//         шахагдсан формат — дахин JPEG болгох нь чанар алдаж, заримдаа
//         ХЭМЖЭЭ ч нэмэгддэг (CPU-г үнэгүй зарцуулна) ✓
//      ③ бусад (jpeg · png · heic · tiff · bmp · том avif/webp …) → canvas-аар
//         **JPEG** болгоно. ⚠️ heic/tiff/bmp нь ЗӨВХӨН түүнийг уншиж чаддаг
//         browser (Safari — iPhone/Mac) дээр ажиллана; тиймд iPhone-ийн
//         зураг хэвийн орно ✓
//      ④ УНШИЖ ЧАДААГҮЙ формат (ж: Chrome дээрх heic/tiff) → `failed: true`
//         буцаана. Дуудагч тал (`AddListingClient`, `ProfileModal`)
//         ОЙЛГОМЖТОЙ монгол мессеж өгнө. ⚠️ Өмнө нь чимээгүй өнгөрч, сервер
//         `allowedTypesForBucket`-ээр «төрөл буруу» гэж унадаг байв — хэрэглэгч
//         шалтгааныг ойлгохгүй байв ✗
//
// ⚠️ Зөвхөн браузер дээр ажиллана (Canvas API). Нэмэлт сан шаардахгүй.
// ⚠️ `.mjs` — `lib/storageClient.mjs`-ийн АДИЛ ЦЭВЭР модуль (DOM/`window`
//    нь зөвхөн функц ДОТОР хэрэглэгдэнэ) тул `scripts/test-image.mjs`
//    Node дээр `imageCompressionPlan()`/`compressImage()`-ыг шалгаж чадна ✓
// ============================================================
import { imageTypeFromName, normalizeImageType } from './storageKeys.mjs';

/** Canvas-аар дахин бичих нь УТГАГҮЙ төрлүүд (хөдөлгөөн/вектор алдагдана) */
const PASSTHROUGH_TYPES = new Set(['image/gif', 'image/svg+xml']);

/** Аль хэдийн шахагдсан төрлүүд — жижиг бол хэвээр нь үлдээнэ */
const ALREADY_COMPRESSED_TYPES = new Set(['image/webp', 'image/avif']);

/** UI/мессежэд харагдах формат жагсаалт */
export const SUPPORTED_IMAGE_FORMATS = 'JPEG, PNG, WebP, AVIF, GIF, SVG';

/** Уншиж чадаагүй үед хэрэглэгчид хэлэх зөвлөгөө */
export const UNREADABLE_IMAGE_HINT =
  `Зургийн формат нь дэмжигдэхгүй байна — ${SUPPORTED_IMAGE_FORMATS} эсвэл HEIC (iPhone/Mac) форматтай зураг оруулна уу. ` +
  'Бусад форматыг (TIFF · RAW · PSD · BMP) JPEG болгож хөрвүүлээд дахин сонгоно уу.';

/** 1536000 → '1.5 MB' */
export function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Файлын БОДИТ төрөл: MIME хоосон/хэлбэргүй бол НЭРЭЭС (`photo.heic` →
 * `image/heic`). ⚠️ Зарим хөтөч (Android/Windows, сүлжээний диск) MIME-г
 * огт илгээдэггүй — тэгвэл зураг «зураг биш» гэж алгасах байсан ✗
 */
export function imageTypeOf(file) {
  const type = normalizeImageType(file && file.type);
  if (type && type !== 'application/octet-stream') return type;
  return imageTypeFromName(file && file.name);
}

/**
 * ШАХАХ ШИЙДВЭР — ЦЭВЭР функц (DOM/Canvas ХҮРЭХГҮЙ, Node тестэд шалгана ✓).
 *
 * @param {File|{name?:string,type?:string,size?:number}} file
 * @param {{maxBytes?:number}} [opts]
 * @returns {{compress:boolean, reason:string, type:string}}
 *   `compress: false` → файлыг ХӨНДӨХГҮЙГЭЭР илгээнэ (`reason`-ыг тайлбарт)
 */
export function imageCompressionPlan(file, opts = {}) {
  const maxBytes = Number.isFinite(opts.maxBytes) ? opts.maxBytes : 1.5 * 1024 * 1024;
  if (!file) return { compress: false, reason: 'файл байхгүй', type: '' };

  const type = imageTypeOf(file);
  if (!type.startsWith('image/')) return { compress: false, reason: 'зураг биш', type };
  if (PASSTHROUGH_TYPES.has(type)) return { compress: false, reason: 'хөдөлгөөнт GIF / вектор SVG', type };
  if (ALREADY_COMPRESSED_TYPES.has(type) && (Number(file.size) || 0) <= maxBytes) {
    return { compress: false, reason: 'аль хэдийн шахагдсан формат', type };
  }
  return { compress: true, reason: '', type };
}

/** Файлыг зурган эх рүү хөрвүүлэх (EXIF эргэлтийг хүндэтгэнэ) */
async function loadImageSource(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close && bmp.close() };
    } catch (e) {
 /* fallback доор */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('Зургийг уншиж чадсангүй'));
      i.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

/**
 * Нэг зургийг шахаж шинэ `File` буцаана.
 *
 * @param {File} file
 * @param {{maxDim?:number, quality?:number, minQuality?:number, maxBytes?:number}} [opts]
 * @returns {Promise<{file:File, name:string, originalSize:number, newSize:number, width?:number, height?:number,
 *                    quality?:number, savedBytes:number, savedPercent:number, skipped?:boolean,
 *                    failed?:boolean, reason?:string}>}
 *   ⚠️ `failed: true` — формат УНШИГДСАНГҮЙ (зургийг огт илгээж болохгүй ✗)
 *   ⚠️ `skipped: true` (failed-ГҮЙ) — зориуд хөндөөгүй (gif/svg/webp…) ✓
 */
export async function compressImage(file, opts = {}) {
  const { maxDim = 1600, quality = 0.82, minQuality = 0.5, maxBytes = 1.5 * 1024 * 1024 } = opts;

  const passThrough = (reason, failed = false) => ({
    file,
    name: (file && file.name) || '',
    originalSize: (file && file.size) || 0,
    newSize: (file && file.size) || 0,
    savedBytes: 0,
    savedPercent: 0,
    skipped: true,
    failed,
    reason,
  });

  // ① ШИЙДВЭР (цэвэр) — gif/svg, жижиг webp/avif, «зураг биш»
  const plan = imageCompressionPlan(file, { maxBytes });
  if (!plan.compress) return passThrough(plan.reason);

  // ② Browser биш (SSR/Node) — canvas байхгүй тул хөндөхгүй
  if (typeof document === 'undefined') return passThrough('browser биш');

  try {
    const img = await loadImageSource(file);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    // ⚠️ PNG-ийн ИЛ ТОД (transparent) дэвсгэрийг ЦАГААН болгоно.
    //    Учир нь JPEG нь ил тод байдлыг дэмждэггүй — дүүргэхгүй бол
    //    дэвсгэр нь ХАР болж, лого/зураг муухай харагдана ✗
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img.source, 0, 0, w, h);
    img.release();

    let q = quality;
    let blob = await canvasToBlob(canvas, 'image/jpeg', q);
    while (blob && blob.size > maxBytes && q > minQuality) {
      q = Math.max(minQuality, q - 0.08);
      blob = await canvasToBlob(canvas, 'image/jpeg', q);
    }

    if (!blob) return passThrough('toBlob амжилтгүй');

    // Шахаасан нь илүү том болвол (жижиг зураг, png) эхийг нь үлдээнэ
    if (blob.size >= file.size) return passThrough('шахах шаардлагагүй');

    // ⚠️ Зөвхөн ЭХ нэрээ сольж, өргөтгөлийг `jpg` болгоно — үр дүн нь
    //    ЯМАР Ч формат байсан JPEG тул түлхүүр/`Content-Type` хоёулаа таарна ✓
    const outName = `${String(file.name || 'image').replace(/\.[^.]+$/, '') || 'image'}.jpg`;
    const out = new File([blob], outName, { type: 'image/jpeg', lastModified: Date.now() });

    return {
      file: out,
      name: outName,
      originalSize: file.size,
      newSize: blob.size,
      width: w,
      height: h,
      quality: Number(q.toFixed(2)),
      savedBytes: file.size - blob.size,
      savedPercent: Math.round((1 - blob.size / file.size) * 100),
    };
  } catch (e) {
    // ⚠️ УНШИЖ ЧАДСАНГҮЙ (ж: Chrome дээрх heic/tiff) → `failed: true`
    return passThrough((e && e.message) || 'уншиж чадсангүй', true);
  }
}

/**
 * Олон зургийг дараалан шахаж, нэгдсэн тайлан буцаана.
 * ⚠️ `items` нь оролтын `files`-тай ИНДЕКСЭЭР ТААРНА (failed ч багтана) —
 *    дуудагч тал `items.filter((it) => !it.failed)`-ээр цэвэрхийг авна ✓
 *
 * @returns {Promise<{items:object[], failed:number, failedNames:string[],
 *                    totalOriginal:number, totalNew:number, savedPercent:number}>}
 */
export async function compressImages(files, opts = {}) {
  const list = Array.isArray(files) ? files : [];
  const items = [];
  for (const f of list) {
    items.push(await compressImage(f, opts));
  }
  const failedNames = items.filter((it) => it.failed).map((it) => it.name || 'зураг');
  const totalOriginal = items.reduce((s, i) => s + i.originalSize, 0);
  const totalNew = items.reduce((s, i) => s + i.newSize, 0);
  return {
    items,
    failed: failedNames.length,
    failedNames,
    totalOriginal,
    totalNew,
    savedPercent: totalOriginal ? Math.round((1 - totalNew / totalOriginal) * 100) : 0,
  };
}
