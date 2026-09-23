'use client';

// ============================================================
// YouTubeField.jsx — Зарт YouTube ВИДЕО ЛИНК оруулах талбар
//
// ЯАГААД ЛИНК ВЭ: утасны 1 минут 1080p видео = 100–300 MB. Storage-д
//   хадгалахад зурагнаас ~100 дахин их зай шаардана. Харин YouTube линк
//   хадгалахад Storage = **0 MB** — хэрэглэгч видеогоо YouTube-д байршуулаад
//   линкийг нь л оруулна.
//
// ⚠️ АЮУЛГҮЙ БАЙДАЛ: хэрэглэгчийн текстийг ШУУД iframe-д хийхгүй.
//   `lib/youtube.mjs` нь эхлээд 11 тэмдэгтийн ID-г ялгаж аваад, дараа нь
//   БИД ӨӨРСДӨӨ youtube.com / i.ytimg.com URL угсарна. Хос домэйн
//   (youtube.evil.com), javascript:, data: гэх мэт нь null болж, preview ч,
//   iframe ч үүсэхгүй.
//
// `value` нь хэрэглэгчийн бичсэн ТЕКСТ (canonical болгож хөрвүүлэх нь
// `lib/queries.js → normalizeYouTubeUrl()` дээр хадгалах үед болно).
// ============================================================
import { parseYouTube } from '../lib/youtube.mjs';

export default function YouTubeField({ value, onChange }) {
  const raw = String(value || '');
  const hasText = raw.trim().length > 0;
  const parsed = parseYouTube(raw);
  const invalid = hasText && !parsed.ok;

  return (
    <div className="form-group">
      <label>🎥 YouTube видео (сонголтоор)</label>

      <div className="flex items-stretch gap-2">
        <input
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1"
          value={raw}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://youtu.be/… эсвэл https://www.youtube.com/watch?v=…"
          aria-invalid={invalid}
        />
        {hasText && (
          <button
            type="button"
            onClick={() => onChange('')}
            title="Линкийг арилгах"
            className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 text-sm font-bold text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* ---------- БУРУУ линк ---------- */}
      {invalid && (
        <p className="form-error">
          YouTube линк буруу байна. Жишээ: <code>https://youtu.be/dQw4w9WgXcQ</code>
        </p>
      )}

      {/* ---------- ЗӨВ линк — thumbnail preview ---------- */}
      {parsed.ok && (
        <div className="mt-1 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-2">
          <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md bg-gray-200">
            {/* ⚠️ Зөвхөн youtube.mjs-ийн угсарсан i.ytimg.com URL */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={parsed.thumbUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-xl">▶️</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-secondary">✅ YouTube видео бэлэн</p>
            <a
              href={parsed.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-[12px] text-primary hover:underline"
              title="YouTube дээр нээж шалгах"
            >
              {parsed.watchUrl}
            </a>
            <p className="text-[11px] text-gray-500">
              Видео нь YouTube-д байршина — манай серверт файл хадгалагдахгүй
            </p>
          </div>
        </div>
      )}

      {/* ---------- Хоосон — тайлбар ---------- */}
      {!hasText && (
        <p className="form-hint">
          Зарын видео байвал YouTube линкийг буулгана уу. Линк нь зарын дэлгэрэнгүй
          хуудсан дээр шууд тоглоно (файл байршуулах шаардлагагүй).
        </p>
      )}
    </div>
  );
}
