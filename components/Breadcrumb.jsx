'use client';

import Link from 'next/link';

/**
 * Breadcrumb — unegui.mn загварын замчилсан цэс.
 * items: [{ label, href }] — href-гүй (эсвэл сүүлийн) элемент нь одоогийн хуудас.
 */
export default function Breadcrumb({ items = [] }) {
  const list = items.filter((it) => it && it.label);
  if (!list.length) return null;

  return (
    <nav
      className="flex flex-wrap items-center gap-1.5 py-3 text-[13px] text-gray-400"
      aria-label="Замчилсан цэс"
    >
      {list.map((it, i) => {
        const isLast = i === list.length - 1;
        const clickable = !!it.href && !isLast;
        return (
          <span key={`${it.label}-${i}`} className="inline-flex items-center gap-1.5">
            {clickable ? (
              <Link href={it.href} className="text-primary hover:underline">{it.label}</Link>
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
