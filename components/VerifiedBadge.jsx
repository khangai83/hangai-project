/**
 * ✅ БАТАЛГААЖСАН — Facebook/Instagram-ийн «verified badge»-тай ижил хэв маяг.
 *
 * 🎨 ХЭЛБЭР: ЦЭНХЭЭР дүүргэсэн ДУГУЙ + ЦАГААН ✓ (зураас нь `stroke="#fff"`).
 *    Өнгө нь `text-*` класс (эсвэл эцэг элементийн өнгө) дамжина —
 *    учир нь дүүргэлт нь `fill="currentColor"` ✓
 *    ж: `<VerifiedBadge size={14} className="text-primary" />` → цэнхэр ✓
 *
 * ⚠️ ЯАГААД БҮХ НИЙТЛЭГЧ БАТАЛГААЖСАН ВЭ:
 *    Бүртгэл нь ЗӨВХӨН verify.mn-ийн SMS баталгаажуулалтаар л болдог
 *    (утас → SMS код → `phone_confirm: true`). Тиймээс нэр/зурагтай
 *    харагдаж байгаа зар нийтлэгч бүр утсаараа баталгаажсан байдаг ✓
 *    ⚠️ Ирээдүйд «баталгаажаагүй» хэрэглэгч нэмэгдвэл энэ badge-ийг
 *    `profiles`-ийн шинэ баганаар (ж: `is_verified`) хянана.
 *
 * @param {{size?: number, className?: string, title?: string}} props
 *   size  — пикселээр (default 14 — 13.5px тексттэй хамт зохицно)
 *   title — hover/aria тайлбар (default «Утсаар баталгаажсан»)
 */
export default function VerifiedBadge({
  size = 14,
  className = '',
  title = 'Утсаар баталгаажсан',
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label={title}
      className={`inline-block shrink-0 align-middle ${className}`}
    >
      <title>{title}</title>
      {/* Дүүргэсэн дугуй — өнгө нь currentColor */}
      <circle cx="12" cy="12" r="12" fill="currentColor" />
      {/* Цагаан ✓ тэмдэг */}
      <path
        d="M6.8 12.6l3.3 3.3L17.4 8.6"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
