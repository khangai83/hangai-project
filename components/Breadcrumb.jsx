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
 *    ⚠️ Энэ компонент нь **3 газарт** хэрэглэгддэг — нүүр (`HomeClient` мөр 570),
 *    зарын дэлгэрэнгүй (`ListingDetailClient` мөр 226), нийтлэгчийн зарууд
 *    (`SellerListingsClient` мөр 134) → нэг засвар ГУРВУУЛАНД нь нөлөөлнө ✓
 *    (breadcrumb бол НЭГ систем элемент тул ижил хэмжээтэй байх ЁСТОЙ ✓).
 *    ⚠️ Сүүлийн (одоогийн) мөр нүүр хуудсан дээр ганцаараа байх үед
 *    «Бүх зар» гэж `font-semibold text-gray-500` (13px → ОДОО 14px) харагдана.
 *
 * 🅑 BOLD (2026-09-27, хэрэглэгчийн хүсэлт: «home page дээр байгаа бүх зар гэсэн
 *    үгийг bold болгох»): сүүлийн crumb-ийн ФОНТЫН ЖИНГ `lastClassName` prop-оор
 *    солино (default нь хуучин `font-semibold text-gray-500` ✓ — бусад хуудас
 *    ХӨНДӨӨГДӨХГҮЙ ✓). `HomeClient` (мөр 588) нь **`font-bold text-gray-700`**
 *    дамжуулна → нүүрэн дээрх «Бүх зар» 600 → **700** болно.
 *    ⚠️ ЯАГААД prop: сүүлийн crumb нь 3 хуудсанд өөр өөр ТЕКСТ байна — нүүр дээр
 *    «Бүх зар», зарын дэлгэрэнгүйд зарын гарчиг, нийтлэгчийн заруудад нэр. Доорх
 *    сүүлийн crumb-ийн мөрийг шууд `font-bold` болговол ТЭДГЭЭР ч bold болж,
 *    хэрэглэгчийн хүсээгүй өөрчлөлт гарна ✗ (breadcrumb бол систем элемент тул
 *    default-ыг хөндөхгүй ✓).
 *    🎨 КОНТРАСТ: `text-gray-500` (#776F5E) цайвар дэвсгэр дээр **4.98:1 ✅ AA**;
 *    14px bold нь «том текст» (≥18.66px bold) БИШ тул 4.5:1 шаардлага ХҮЧИНТЭЙ ✓
 *    (жин нэмэх нь контрастыг өөрчлөхгүй).
 *
 * 🔵 ЛИНК — ЦЭНХЭР + BOLD (2026-09-27, хэрэглэгчийн хүсэлт: «“Бүх зар”-аас
 *    “Автомашин” гэх мэт сонгоход “Бүх зар” гэсэн хэсгийг цэнхэр болсон bold
 *    байгаасай»): хэсэг сонгомогц «Бүх зар» нь сүүлийн crumb БИШ болж,
 *    `<Link className="text-primary hover:underline">` (линк нь мөр 76–82) хэлбэрээр
 *    **цэнхэр** (#2563eb rgb(37,99,235)) гардаг байсан ч жин нь **400** (нимгэн)
 *    байв → `font-bold` (**700**) нэмэв ✓ — ингэснээр сонгосон хэсэг (сүүлийн
 *    crumb, мөн bold) ба буцах зам (линк, bold) хоёулаа ижил жинтэй, зөвхөн
 *    өнгөөр ялгагдана (цэнхэр = дарж болно, саарал = одоогийн байрлал).
 *    ⚙️ `linkClassName` prop-оор солигдоно (default `'text-primary hover:underline'`)
 *    → `HomeClient` (мөр 589) `'font-bold text-primary hover:underline'` дамжуулна.
 *    ⚠️ ЯАГААД prop: линк нь 3 хуудсанд байдаг (зарын дэлгэрэнгүй, нийтлэгчийн
 *    зарууд) — тэнд хүсээгүй өөрчлөлт гарахаас сэргийлэв ✓ (`lastClassName`-тай
 *    ижил арга).
 *    🎨 КОНТРАСТ: #2563eb нь цайвар дэвсгэр (gray-100 #F4F1EA) дээр **4.58:1**,
 *    хуудасны цайвар арын дэвсгэр дээр арай өндөр → **AA ✓** (14px bold нь «том
 *    текст» БИШ тул 4.5:1 хэвээр; зөвхөн өнгө биш, ЖИН нэмэх нь харагдацыг
 *    сайжруулна ✓).
 */
export default function Breadcrumb({
  items = [],
  onNavigate,
  // Сүүлийн crumb-ийн класс — зөвхөн нүүр хуудас bold (700) болгоно
  lastClassName = 'font-semibold text-gray-500',
  // Дарж болох линкүүдийн класс (цэнхэр) — нүүр хуудсанд bold (700) нэмнэ
  linkClassName = 'text-primary hover:underline',
}) {
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
                className={linkClassName}
                onClick={onNavigate ? (e) => { e.preventDefault(); onNavigate(it); } : undefined}
              >
                {it.label}
              </Link>
            ) : (
              <span className={isLast ? lastClassName : undefined}>{it.label}</span>
            )}
            {!isLast && <span className="text-gray-300" aria-hidden="true">›</span>}
          </span>
        );
      })}
    </nav>
  );
}
