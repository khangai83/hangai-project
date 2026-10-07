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

/**
 * ❤️ ЗҮРХНИЙ ТЭМДЭГ («Таалагдсан» — line-art heart) — 2026-10-07.
 *
 * ⚠️ ЯАГААД EMOJI (`❤️`) БИШ SVG ВЭ (хэрэглэгчийн хүсэлт: «Таалагдсан,
 *    Мессеж-ийг текстгүй icon болго, хар цагаанаас өөр өнгө орсон icon бүү
 *    болгоорой»):
 *   • `❤️` emoji нь УЛААН өнгөтэй — «хар/цагаанаас өөр өнгөгүй» гэсэн
 *     шаардлагад нийцэхгүй ✗
 *   • SVG нь `currentColor`-оор зурагдана → товч/табын өнгө (хар/саарал)
 *     дагана, идэвхтэй/идэвхгүй төлөвт ч хялбар солигдоно ✓
 *   • `MessageIcon`-тэй ЯГ ИЖИЛ бүтэц (нэг мөр, round join) ✓
 *
 * @param {{className?:string, strokeWidth?:number}} props
 *   `className` — хэмжээ/өнгийг гаднаас өгнө (ж: `h-[15px] w-[15px]`)
 */
export function HeartIcon({ className = 'h-4 w-4', strokeWidth = 1.7 }) {
  return (
    <Icon className={className} strokeWidth={strokeWidth}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </Icon>
  );
}

/**
 * 💬 МЕССЕЖИЙН ИКОН — ХОЁР ДАВХАРЛАСАН ЯРИАНЫ БӨМБӨЛӨГ + 3 ЦЭГ — 2026-10-07.
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (жишээ зурагтай): «iim messege icon bolgochihoo» —
 * толгойн мөрний «Мессеж» товчны ДУГТУЙГ хоёр давхарласан чат бөмбөлөг
 * (урд нь 3 цэгтэй) болгов ✓
 *
 * ⚠️ ЯАГААД ТУСДАА КОМПОНЕНТ (яагаад `MessageIcon`-ийг өөрчлөөгүй) ВЭ:
 *   • `MessageIcon` (дугтуй) нь мобайл доод цэс · footer · `/messages` гарчиг ·
 *     «Мессеж бичих» товч зэрэг ОЛОН газар хэрэглэгддэг.
 *   • Мобайл доод цэсний ХӨРШ таб «💬 Санал хүсэлт» ч мөн БӨМБӨЛӨГ дүрстэй —
 *     мессежийг ч бөмбөлөг болговол хоёулаа ЯЛГАГДАХГҮЙ болно ✗
 *     (`MessageIcon.jsx`-ийн тайлбарт энэ шийдвэрийг дэлгэрэнгүй бичсэн ✓).
 *   • Тиймээс зөвхөн icon-only ТОЛГОЙН МӨРНИЙ «Мессеж» товчид зориулж ШИНЭ
 *     икон болгов — бусад газар дугтуй хэвээр ✓ (нэг товч = нэг икон).
 *   • `currentColor` → товчны саарал/хар өнгө дагана (хар/цагаанаас өөр
 *     өнгө ГАРАХГҮЙ ✓), `MessageIcon`-той ИЖИЛ бүтэц (round join) ✓
 *
 * @param {{className?:string, strokeWidth?:number}} props
 *   `className` — хэмжээ/өнгийг гаднаас өгнө (ж: `h-[15px] w-[15px]`)
 */
export function ChatIcon({ className = 'h-4 w-4', strokeWidth = 1.6 }) {
  return (
    <Icon className={className} strokeWidth={strokeWidth}>
      {/* Хойд бөмбөлөг — зөвхөн урд бөмбөлгийн ГАРЦ (баруун) хэсэг нь
          харагдана (зүүн тал нь урд бөмбөлгийн ард нуугдана ✓) */}
      <path d="M16.75 6H18.5A4.5 4.5 0 0 1 23 10.5V12.5A4.5 4.5 0 0 1 18.5 17H16L11.5 21.5L14 17H13.5A4.5 4.5 0 0 1 9.26 14" />
      {/* Урд бөмбөлөг — бөөрөнхий зуйван + зүүн доош чиглэсэн өнцөгтэй сүүл */}
      <path d="M7.5 3H12A5.5 5.5 0 0 1 17.5 8.5V9A5.5 5.5 0 0 1 12 14.5H9.8L3.5 20L7.3 14.5H7.5A5.5 5.5 0 0 1 2 9V8.5A5.5 5.5 0 0 1 7.5 3Z" />
      {/* Урд бөмбөлөг доторх ГУРВАН ЦЭГ — бөглөсөн (`currentColor`) */}
      <circle cx="6.8" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12.2" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  );
}
