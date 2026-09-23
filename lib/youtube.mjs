// ============================================================
// youtube.mjs — YouTube линкийг ШАЛГАХ ба ХӨРВҮҮЛЭХ (цэвэр функцууд)
//
// ЯАГААД ЛИНК ВЭ (видео upload БИШ): утасны 1 минут 1080p видео =
//   100–300 MB. Storage-д хадгалахад зурагнаас ~100 дахин их зай/трафик
//   зарцуулагдана. Харин YouTube линк хадгалахад Storage = **0 MB**.
//   (README → «🎥 Бичлэг (видео)» хэсэгт 3 сонголтыг харьцуулсан.)
//
// ⚠️ АЮУЛГҮЙ БАЙДАЛ — ХАМГИЙН ЧУХАЛ:
//   Хэрэглэгчийн бичсэн текстийг ШУУД `<iframe src={...}>`-д хийж БОЛОХГҮЙ
//   (XSS / clickjacking). Энэ модуль эхлээд **11 тэмдэгтийн video ID**-г
//   ГАНЦААР ялгаж аваад, дараа нь БИД ӨӨРСДӨӨ youtube.com-ийн URL угсарна.
//   Ингэснээр iframe-д ямагт зөвхөн youtube.com эсвэл i.ytimg.com очно.
//
// ДЭМЖИХ ХЭЛБЭРҮҮД (бүгд нэг ID болж хувирна):
//   https://www.youtube.com/watch?v=dQw4w9WgXcQ
//   https://youtu.be/dQw4w9WgXcQ
//   https://www.youtube.com/shorts/dQw4w9WgXcQ
//   https://www.youtube.com/embed/dQw4w9WgXcQ   ·  /live/…  ·  /v/…
//   https://m.youtube.com/watch?v=…   ·   https://music.youtube.com/watch?v=…
//   dQw4w9WgXcQ          ← зөвхөн ID бичсэн ч болно
//   https://www.youtube.com/watch?v=ID&t=30s&list=…   ← нэмэлт параметр үл тоомсорлоно
//
// ЦЭВЭР (import/env/сүлжээ ГҮЙ) тул `npm run test:youtube` тестээр шалгана.
// ============================================================

/** YouTube video ID: яг 11 тэмдэгт [A-Za-z0-9_-] */
export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** YouTube-ийн зөвшөөрөгдөх host-ууд (www/m-ийг хасны дараа) */
const YOUTUBE_HOSTS = new Set(['youtube.com', 'music.youtube.com', 'youtube-nocookie.com']);

/**
 * Линк (эсвэл зөвхөн ID) → 11 тэмдэгтийн video ID, эсвэл null.
 * @param {string} input
 * @returns {string|null}
 */
export function extractYouTubeId(input) {
  const raw = String(input == null ? '' : input).trim();
  if (!raw) return null;

  // «dQw4w9WgXcQ» — зөвхөн ID бичсэн
  if (YOUTUBE_ID_RE.test(raw)) return raw;

  let url;
  try {
    // Схем бичээгүй («youtu.be/xxx») бол https гэж үзнэ
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch (e) {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
  const path = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');

  // youtu.be/ID
  if (host === 'youtu.be') {
    const id = path.split('/')[0];
    return YOUTUBE_ID_RE.test(id) ? id : null;
  }

  if (!YOUTUBE_HOSTS.has(host)) return null;

  // ?v=ID  (watch?v=…)
  const v = url.searchParams.get('v');
  if (v && YOUTUBE_ID_RE.test(v)) return v;

  // /shorts/ID · /embed/ID · /live/ID · /v/ID
  const seg = path.match(/^(?:shorts|embed|live|v)\/([^/]+)$/);
  if (seg && YOUTUBE_ID_RE.test(seg[1])) return seg[1];

  // youtube.com/ID (ховор, гэхдээ тохиолддог)
  if (YOUTUBE_ID_RE.test(path)) return path;

  return null;
}

/** ID → үзэх линк (нээх үед) */
export function youTubeWatchUrl(id) {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** ID → embed линк (iframe-д). `autoplay`/`start` нэмэлт. */
export function youTubeEmbedUrl(id, { autoplay = false, start = 0, mute = false } = {}) {
  const p = new URLSearchParams({ rel: '0', modestbranding: '1' });
  if (autoplay) p.set('autoplay', '1');
  if (mute) p.set('mute', '1');
  if (start > 0) p.set('start', String(Math.trunc(start)));
  return `https://www.youtube.com/embed/${id}?${p.toString()}`;
}

/** ID → thumbnail (зураг). Форм дээр хөнгөн preview харуулахад. */
export function youTubeThumbUrl(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/**
 * Линкийг бүрэн задалж, аюулгүй URL-уудыг буцаана.
 * @returns {{ok:boolean, id:string|null, watchUrl:string|null,
 *            embedUrl:string|null, thumbUrl:string|null}}
 */
export function parseYouTube(input) {
  const id = extractYouTubeId(input);
  if (!id) {
    return { ok: false, id: null, watchUrl: null, embedUrl: null, thumbUrl: null };
  }
  return {
    ok: true,
    id,
    watchUrl: youTubeWatchUrl(id),
    embedUrl: youTubeEmbedUrl(id),
    thumbUrl: youTubeThumbUrl(id),
  };
}

/**
 * DB-д хадгалах КАНОНИК линк (`https://www.youtube.com/watch?v=ID`).
 * Хэрэглэгч youtu.be, shorts, нэмэлт параметр (`&list=…`) гэж бичсэн ч
 * нэг ижил хэлбэрээр хадгалагдана → дэлгэрэнгүй хуудсан дээр тогтвортой.
 * @returns {string|null}
 */
export function normalizeYouTubeUrl(input) {
  const id = extractYouTubeId(input);
  return id ? youTubeWatchUrl(id) : null;
}
