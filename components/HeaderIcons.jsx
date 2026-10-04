/**
 * 🧩 ТОЛГОЙН МӨРНИЙ ИКОНУУД (SVG) — 2026-10-04 (28)
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (жишээ зурагтай): «Дэлгэрэнгүй хайлт-ийн Байршил
 * сонголтыг HeaderSearchBar-ийнх шиг сонгодог болго» + «толгойн хайлтын мөр
 * unegui.mn шиг нимгэн байх».
 *
 * ЯАГААД EMOJI (`📋 📍 ▾ 🔍`) БИШ SVG ВЭ:
 *   • emoji нь OS БҮР дээр өөр өөрөөр (Apple/Samsung/Windows) зурагдана ✗
 *   • emoji нь өөрийн гэсэн өнгөтэй — идэвхтэй/идэвхгүй төлөвт `text-primary`
 *     / `text-gray-500`-аар өнгө солих боломжгүй ✗
 *   • SVG нь `currentColor`-оор зурагдана → CSS-ээр удирдана ✓
 *     (энэ нь `MessageIcon.jsx`-ийн ЯГ ИЖИЛ шийдэл ба тэр файлын тайлбарт
 *      үндэслэлийг дэлгэрэнгүй бичсэн ✓)
 *   • Зураас нь `strokeLinecap/Linejoin = round` — Tailwind-ийн `rounded-*`
 *     хэв маягтай нийцэж, «нимгэн/орчин үеийн» мэдрэмж өгнө ✓
 *
 * ⚠️ БҮГД нь `aria-hidden="true"` — икон дангаараа УТГА дамжуулахгүй (товч
 *    дээрх текст эсвэл `aria-label` нь утгыг хэлнэ) ✓
 *
 * @param {{className?:string, strokeWidth?:number}} props
 *   `className` — хэмжээ/өнгийг гаднаас өгнө (ж: `h-4 w-4`, `h-[18px] w-[18px]`)
 */

/** ⚙️ ТҮҮНИЙ НИЙТЛЭГ SVG БҮТЭЦ — бүх икон үүн дээр тогтоно */
function Icon({ className, strokeWidth, children }) {
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
      {children}
    </svg>
  );
}

/**
 * 📋 ЖАГСААЛТ («Ангилал» сонголтын зүүн икон).
 * ⚠️ ЗӨВХӨН ГУРВАН мөр — `unegui.mn`-ийн «Ангилал» иконтой ижил (бүтэн
 *    «☰» 4 мөр биш) тул 14px дээр ч цэвэрхэн харагдана ✓
 */
export function ListIcon({ className = 'h-4 w-4', strokeWidth = 1.8 }) {
  return (
    <Icon className={className} strokeWidth={strokeWidth}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h10" />
    </Icon>
  );
}

/** 🔍 ТОМРУУЛДАГ ШИЛ («Зар хайх» талбарын зүүн икон) */
export function SearchIcon({ className = 'h-4 w-4', strokeWidth = 1.8 }) {
  return (
    <Icon className={className} strokeWidth={strokeWidth}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16.2 16.2 20.5 20.5" />
    </Icon>
  );
}

/**
 * 📍 БАЙРШЛЫН ЗҮҮЛТЭЙ ТЭМДЭГ.
 * ⚠️ ДОТООД ЦЭГ нь `fill="currentColor"` — гүйцээгүй (line-art) хувилбар нь
 *    14px дээр «хоосон дүрс» мэт харагдана ✗ (unegui.mn-ийн pin нь бөглөсөн ✓)
 */
export function PinIcon({ className = 'h-4 w-4', strokeWidth = 1.8 }) {
  return (
    <Icon className={className} strokeWidth={strokeWidth}>
      <path d="M12 21.5c4.2-4.3 6.3-7.6 6.3-10.2a6.3 6.3 0 1 0-12.6 0c0 2.6 2.1 5.9 6.3 10.2Z" />
      <circle cx="12" cy="11" r="2.1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

/** ▾ ДООШОО СУМ — native `<select>`-ийг `appearance-none` болгосон үед
 *  ЗААВАЛ хэрэгтэй (эс бөгөөс сонголт хийх боломжтой гэдэг нь мэдэгдэхгүй ✗) */
export function ChevronDownIcon({ className = 'h-4 w-4', strokeWidth = 1.8 }) {
  return (
    <Icon className={className} strokeWidth={strokeWidth}>
      <path d="m6 9.5 6 6 6-6" />
    </Icon>
  );
}
