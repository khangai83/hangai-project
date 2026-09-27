'use client';

import Link from 'next/link';

/**
 * Breadcrumb — загварын замчилсан цэс.
 *
 * items: [{ label, href, nav }] — href-гүй (эсвэл сүүлийн) элемент нь одоогийн хуудас.
 *
 * ⚠️ `onNavigate` ДАМЖУУЛАХ ЁСТОЙ (`HomeClient`-ээс): бүх линк нь `/` зам дээр
 *    байдаг тул `<Link>`-ээр явахад Next.js нь компонентийг ДАХИН MOUNT
 *    ХИЙДЭГГҮЙ → шүүлт хуучнаараа үлддэг. Тиймээс линкийн үйлдлийг барьж аваад
 *    төлөвийг шууд өөрчилнө (URL-ийг HomeClient-ийн эффект өөрөө бичнэ).
 *
 * 🔤 ФОНТ (2026-09-27, хэрэглэгчийн хүсэлт: «Бүх зар … фонтыг жаахан нэм»):
 *    `text-[13px]` → **`text-[14px]`** (nav дээр, мөр 32).
 *    ⚠️ Энэ компонент нь **3 газарт** хэрэглэгддэг — нүүр (`HomeClient` мөр 562),
 *    зарын дэлгэрэнгүй (`ListingDetailClient` мөр 226), нийтлэгчийн зарууд
 *    (`SellerListingsClient` мөр 134) → нэг засвар ГУРВУУЛАНД нь нөлөөлнө ✓
 *    (breadcrumb бол НЭГ систем элемент тул ижил хэмжээтэй байх ЁСТОЙ ✓).
 *    ⚠️ Сүүлийн (одоогийн) мөр нүүр хуудсан дээр ганцаараа байх үед
 *    «Бүх зар» гэж `font-semibold text-gray-500` (13px → ОДОО 14px) харагдана.
 *    🔧 Зөвхөн нүүрэн дээр өөрчлөхийг хүсвэл энэ nav-ыг биш, `HomeClient`-ийн
 *    `<Breadcrumb …>`-т `className` prop нэмэх шаардлагатай (одоо БАЙХГҮЙ).
 */
export default function Breadcrumb({ items = [], onNavigate }) {
  const list = items.filter((it) => it && it.label);
  if (!list.length) return null;

  return (
    <nav
      className="flex flex-wrap items-center gap-1.5 py-3 text-[14px] text-gray-400"
      aria-label="Замчилсан цэс"
    >
      {list.map((it, i) => {
        const isLast = i === list.length - 1;
        const clickable = !!it.href && !isLast;
        return (
          <span key={`${it.label}-${i}`} className="inline-flex items-center gap-1.5">
            {clickable ? (
              <Link
                href={it.href}
                className="text-primary hover:underline"
                onClick={onNavigate ? (e) => { e.preventDefault(); onNavigate(it); } : undefined}
              >
                {it.label}
              </Link>
            ) : (
              <span className={isLast ? 'font-semibold text-gray-500' : undefined}>{it.label}</span>
            )}
            {!isLast && <span className="text-gray-300" aria-hidden="true">›</span>}
          </span>
        );
      })}
    </nav>
  );
}
