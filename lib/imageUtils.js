// ============================================================
// imageUtils.js — Зургийг browser дээр шахаж (resize + JPEG) хэмнэх
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
// ⚠️ Зөвхөн браузер дээр ажиллана (Canvas API). Нэмэлт сан шаардахгүй.
// ============================================================

/** 1536000 → '1.5 MB' */
export function formatBytes(bytes) {
  const b = Number(bytes) || 0;
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

/** Файлыг зурган эх рүү хөрвүүлэх (EXIF эргэлтийг хүндэтгэнэ) */
async function loadImageSource(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, release: () => bmp.close && bmp.close() };
    } catch (e) {
      /* fallback доор */
    }
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
 * @returns {Promise<{file:File, originalSize:number, newSize:number, width?:number, height?:number,
 *                    savedBytes:number, savedPercent:number, skipped?:boolean, reason?:string}>}
 */
export async function compressImage(file, opts = {}) {
  const { maxDim = 1600, quality = 0.82, minQuality = 0.5, maxBytes = 1.5 * 1024 * 1024 } = opts;

  const passThrough = (reason) => ({
    file,
    originalSize: file.size,
    newSize: file.size,
    savedBytes: 0,
    savedPercent: 0,
    skipped: true,
    reason,
  });

  if (typeof document === 'undefined') return passThrough('browser биш');
  if (!file || !file.type || !file.type.startsWith('image/')) return passThrough('зураг биш');
  // Хөдөлгөөнт GIF ба вектор SVG-г canvas-аар шахах нь утгагүй (хөдөлгөөн/вектор алдагдана)
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return passThrough('gif/svg');

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

    const outName = `${String(file.name).replace(/\.[^.]+$/, '')}.jpg`;
    const out = new File([blob], outName, { type: 'image/jpeg', lastModified: Date.now() });

    return {
      file: out,
      originalSize: file.size,
      newSize: blob.size,
      width: w,
      height: h,
      quality: Number(q.toFixed(2)),
      savedBytes: file.size - blob.size,
      savedPercent: Math.round((1 - blob.size / file.size) * 100),
    };
  } catch (e) {
    return passThrough((e && e.message) || 'шахаж чадсангүй');
  }
}

/**
 * Олон зургийг дараалан шахаж, нэгдсэн тайлан буцаана.
 * @returns {Promise<{items:object[], totalOriginal:number, totalNew:number, savedPercent:number}>}
 */
export async function compressImages(files, opts = {}) {
  const items = [];
  for (const f of files) {
    items.push(await compressImage(f, opts));
  }
  const totalOriginal = items.reduce((s, i) => s + i.originalSize, 0);
  const totalNew = items.reduce((s, i) => s + i.newSize, 0);
  return {
    items,
    totalOriginal,
    totalNew,
    savedPercent: totalOriginal ? Math.round((1 - totalNew / totalOriginal) * 100) : 0,
  };
}
