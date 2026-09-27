import Link from 'next/link';

/**
 * АДМИН ХЭСГҮҮДИЙН НАВИГАЦИ — бүх `/admin/*` хуудсанд нэг ижил.
 *
 * ⚠️ Client hook ашиглахгүй тул SERVER компонент дээр ч ажиллана
 *    (admin page.jsx-ууд нь server component).
 *
 * @param {{active?: string}} props `active` = одоогийн замын href
 */
const TABS = [
  { href: '/admin', label: '📊 Самбар' },
  { href: '/admin/listings', label: '🏷️ Зарууд' },
  { href: '/admin/users', label: '👥 Хэрэглэгчид' },
  { href: '/admin/feedback', label: '💬 Санал хүсэлт' },
];

export default function AdminNav({ active = '/admin', className = '' }) {
  return (
    <nav className={`flex flex-wrap gap-2 ${className}`} aria-label="Админ хэсгүүд">
      {TABS.map((t) => {
        const on = t.href === active;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? 'page' : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
              on
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
