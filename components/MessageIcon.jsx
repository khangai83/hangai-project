/**
 * ✉️→🖥 MESSAGE ICON — ОРЧИН ҮЕИЙН МЕССЕЖИЙН ИКОН (SVG) — 2026-09-29
 *
 * ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «messege ийн symbol -ийг илүү орчин үеийн
 *    symbol болго» ✓
 *
 * ЯАГААД EMOJI БИШ SVG ВЭ:
 *   • `✉️` нь улаан-цэнхэр өнгөтэй emoji глиф — доод цэсэн дээр `grayscale`
 *     шүүлтээр бараан болдог байсан (хүчээр саарал болгосон мэт харагдана ✗)
 *   • SVG нь `currentColor`-оор БРЭНД өнгөтэй болно (идэвхтэй таб дээр
 *     цэнхэр, идэвхгүй дээр саарал) — ямар ч шүүлт хэрэггүй ✓
 *   • Ямар ч төхөөрөмж/OS дээр ЯГ ИЖИЛ харагдана (emoji нь Apple/Samsung/
 *     Windows дээр өөр өөр зурагдана) ✓
 *   • 1.7px зураас + дугуй булан — Tailwind-ийн rounded-* хэв маягтай нийцнэ ✓
 *
 * ⚠️ ЯАГААД ХАТУУ БИШ (`MESSAGE` биш `ENVELOPE` загвар вэ):
 *   Доод цэсэнд «💬 Санал хүсэлт» ГЭЖ ХӨРШ таб байна. Хэрэв мессежийг ч
 *   мөн адил «ярианы бөмбөлөг» болговол хоёр таб идэвхгүй үедээ ЯЛГАХГҮЙ
 *   болно ✗ Тиймээс «дугтуй» (mail) утгаа хадгалж, зөвхөн ХЭЛБЭРИЙГ нь
 *   орчин үеийн line-art болгов — нэг харцаар ялгагдана ✓
 *
 * @param {{className?:string, strokeWidth?:number}} props
 *   `className` — хэмжээ/өнгийг гаднаас өгнө (ж: `h-4 w-4`,
 *   доод цэсэнд `h-[19px] w-[19px]`, /messages дээр `h-16 w-16 text-primary`)
 */
export default function MessageIcon({ className = 'h-4 w-4', strokeWidth = 1.7 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {/* Дугтуйны их бие — дугуй булантай (rounded) */}
      <rect x="2.5" y="4.5" width="19" height="15" rx="3.5" />
      {/* Дугтуйны ам — зөөлөн V (round join нь үзүүрийг тэгшилнэ ✓) */}
      <path d="M5 7.6 12 12.7 19 7.6" />
    </svg>
  );
}
