'use client';

/**
 * ХЭРЭГЛЭГЧИЙН ПРОФАЙЛ ЗУРАГ (аватар).
 *
 * ⚠️ Зураг байхгүй бол НЭРийн ЭХНИЙ ҮСГЭЭР placeholder харуулна —
 * ингэснээр мөр нь «хоосон» харагдахгүй, адил байна.
 * ⚠️ `next/image` БИШ `<img>`: зураг нь Supabase Storage-ийн нийтийн URL
 * (`next.config.mjs` нь `images.unoptimized: true`) тул оптимизац
 * ашиггүй (бусад компонентууд ч мөн адил).
 *
 * 🆕 2026-10-07 — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «хэрэглэгчийн Profile зургийг …
 *    тэгш өнцөгтөөр харуулаарай» ⇒ хэлбэр нь `rounded-full` (ДУГУЙ) БИШ,
 *    **`rounded-lg`** (булан нь бага зэрэг дугуйрсан ТЭГШ ӨНЦӨГТ) болов ✓
 *    (жишиг сайтын профайл зурагтай ижил хэв). ⚠️ Зөвхөн ХАРАГДАХ хэлбэр
 *    солигдов — `size`, `object-cover`, `ring`, логик БҮГД ХЭВЭЭР ✓
 *
 * @param {{src?: string|null, name?: string, size?: number, className?: string}} props
 */
export default function Avatar({ src, name, size = 24, className = '' }) {
  const initial = String(name || '').trim().charAt(0).toUpperCase() || '?';
  const style = { width: size, height: size };

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name ? `${name} — профайл зураг` : 'Профайл зураг'}
        width={size}
        height={size}
        loading="lazy"
        style={style}
        className={`shrink-0 rounded-lg object-cover ring-1 ring-gray-200 ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={style}
      title={name || undefined}
      className={`grid shrink-0 place-items-center rounded-lg bg-primary-light font-bold text-primary ${className}`}
    >
      <span style={{ fontSize: Math.max(10, Math.round(size * 0.45)), lineHeight: 1 }}>{initial}</span>
    </span>
  );
}
