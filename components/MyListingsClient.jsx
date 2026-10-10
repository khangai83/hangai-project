'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, useToast, useUI } from './AppProviders';
import { fetchMyListings, deleteListing } from '../lib/queries';
import { normalizeError } from '../lib/errors';
import { shortPriceLabel, negotiableNote, getPropertyIcon, timeAgo, getFloorLabel, getGarageLabel, formatCardAddress, listingTitle, autoTitle } from '../lib/format';
// 🔄 «СОЛИНО» (2026-10-09) — 🤝 «Үнэ тохирно»-гийн ЯГ ДООР гарах мөр
//    (нэг эх сурвалж: `lib/swapFilter.mjs` — форм ☑/хайлтын чиптэй ижил ✓)
import { SWAP_ICON, swapLabel } from '../lib/swapFilter.mjs';
import MyListingsStatsPanel from './MyListingsStatsPanel';
/**
 * 📍 Байршилгүй зар («Байршил сонгохгүй» чекбокс) дээр «📍 » хоосон үлдэхгүйн
 *    тулд `NO_LOCATION_LABEL` («Байршил заагаагүй») хэрэглэнэ — нэг эх сурвалж
 *    (`lib/listingLocation.mjs`) ✓
 */
import { NO_LOCATION_LABEL } from '../lib/listingLocation.mjs';
// 📍 2026-10-10 (101) — КАРТ НЬ `ListingCard`-ЫН ХЭВ РҮҮ ШИЛЖИВ ⇒ хаягны pin
//    нь карт/дэлгэрэнгүй хуудасныхтай ЯГ ИЖИЛ SVG (`HeaderIcons`) ✓
import { MapPinIcon } from './HeaderIcons';

/**
 * Энэ хуудас нь ЗӨВХӨН ӨӨРИЙН зарыг харуулна.
 *   ℹ️ Өмнө нь «🌐 Бүх зарууд» гэсэн таб байсан бөгөөд бүх хэрэглэгчийн зарыг
 *      энд харуулдаг байв. Гэхдээ «Миний зарууд» гэдэг нэртэй хуудас дээр
 *      БУСДЫН зарууд харагдах нь төөрөгдүүлж, «миний» гэдэг утгыг алдагдуулж
 *      байсан тул ХАСАГДСАН. Бүх зарыг харах бол нүүр хуудас (`/`) — тэнд хайлт,
 *      хайлт, газрын зураг бүгд бий. Тухайн зарын нийтлэгчийн бусад зарыг
 *      `/sellers/[id]` хуудаснаас харна.
 */
const TABS = [
  { key: 'mine', label: '📋 Миний зарууд' },
  { key: 'stats', label: '📈 Статистик' },
];

export default function MyListingsClient() {
  const { user, authLoading } = useAuth();
  const { showToast } = useToast();
  const { openAdd, openEdit, dataVersion, notifyListingsChanged } = useUI();
  const [tab, setTab] = useState('mine');
  const [listings, setListings] = useState(null);

  useEffect(() => {
    // «📈 Статистик» таб нь ӨӨРИЙН дата-аа татдаг (MyListingsStatsPanel)
    if (tab === 'stats') return undefined;

    if (!user) {
      setListings([]);
      return undefined;
    }

    let mounted = true;
    setListings(null);
    (async () => {
      try {
        const data = await fetchMyListings(user.id);
        if (mounted) setListings(data || []);
      } catch (err) {
        console.error(normalizeError(err));
        if (mounted) {
          setListings([]);
          showToast(err.message, 'error');
        }
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab, dataVersion]);

  const handleDelete = async (l) => {
    if (!window.confirm('Та энэ зарыг устгахдаа итгэлтэй байна уу?')) return;
    try {
      await deleteListing(user.id, l);
      showToast('Зар амжилттай устгагдлаа');
      notifyListingsChanged();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="mb-4 text-6xl">🔑</div>
          <h3 className="text-xl font-semibold">Миний заруудыг харахын тулд нэвтрэх шаардлагатай</h3>
        </div>
      </div>
    );
  }
  const isStats = tab === 'stats';

  if (listings === null && !isStats) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mt-2 mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {tab === 'mine' ? '📋 Миний зарууд' : '📈 Хандалтын статистик'}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Табууд — статистикийн хугацааны сонголттой ижил сегмент стиль */}
          <div className="segmented">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className={`segmented-item ${tab === t.key ? 'segmented-item-active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 📈 Статистик таб — өөрийн заруудын хандалт ===== */}
      {isStats ? (
        <MyListingsStatsPanel />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-gray-500">
            Энэ хуудас зөвхөн <b>таны</b> заруудыг харуулна. Бүх зарыг хайх бол{' '}
            <Link href="/" className="font-semibold text-primary hover:underline">
              нүүр хуудас
            </Link>{' '}
            руу орно уу.
          </p>
          {listings.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mb-4 text-6xl">🏠</div>
              <h3 className="mb-2 text-xl font-semibold">Танд зар байхгүй байна</h3>
              <p className="text-gray-500">Та эхний зарыг нэмэх үү?</p>
              <button className="btn btn-primary mt-4" onClick={openAdd}>➕ Зар нэмэх</button>
            </div>
          ) : (
            /* 🆕 2026-10-07 (59): 🖥 DESKTOP дээр 2-3 БАГАНА (grid) — хэрэглэгчийн
               хүсэлт («desktop дээр Миний заруудын картуудыг 2-3 эгнээ болгож
               харагдуул»). 📱 1 · 📲 sm(≥640) 2 · 🖥 lg(≥1024) 3 багана. ⚠️ Карт бүр
               ОДОО ВЕРТИКАЛЬ (зураг дээгүүр · текст доор · товч хамгийн доор) болов
               — олон баганад ЭВТЭЙ (⏳ `sm:flex-row` хэвтээ карт нь 2-3 баганад
               багтахгүй тул ХАСАГДАВ ✓). ⚠️ Зөвхөн ХАРАГДАЦ — fetch/DB/payload
               ХӨНДӨӨГДӨӨГҮЙ. */
            /* 🆕 (101) 2026-10-10 — «attached 2 cards, study and change my card
               information … change to all detail card» ⇒ «Миний зарууд»-ын ТУСДАА
               карт нь ЗАРЫН КАРТТАЙ (`ListingCard`) ИЖИЛ хэв рүү шилжив:
               ① хайрцаг/сүүдэр/СААРАЛ дүүргэлт ХАСАГДАВ (`border-gray-200`
                  `bg-gray-100` `shadow-card` `hover:-translate-y-0.5` байхгүй) ✓
               ② ЗУРАГ 4:3 (`h-[150px]` → `aspect-[4/3] rounded-xl`) — карттай ЯГ ижил ✓
               ③ ДАРААЛАЛ: 💰 үнэ (22px bold) → 🏷️ гарчиг → 📋 мэдээлэл → 📅 мета ✓
               ④ Мэдээллийн/мета мөр нь ЗӨВХӨН ТЕКСТ (📅/📍/🛏 … emoji ХАСАГДАВ —
                  картын хэв, жишиг зургийн «20,400 км · Автомат · 4.0 л · Бензин») ✓
               ⚠️ ❤️ favourite toggle ЭНД БАЙХГҮЙ — энэ нь «миний» зарын
                  УДИРДЛАГЫН хуудас (`✏️ Засах`/`🗑 Устгах` товчтой) ✓
               ⚠️ Зөвхөн ХАРАГДАЦ — fetch/DB/payload ХӨНДӨӨГДӨӨГҮЙ ✓ */
            /* 🆕 (107) 2026-10-10 — «ЖИШИГ ЗУРГИЙН КАРТ ШИГ ТЕКСТИЙН ХЭВ»
               (хэрэглэгчийн хүсэлт: «change cards design text style to like
               attached cards … Also, swap location, the date of creation on the
               card of bottom section») ⇒ `ListingCard`-тай ЯГ ИЖИЛ:
               ① 📍📅 мета: **хаяг ЭХЭНД, огноо ТӨГСГӨЛД** (⏳ огноо эхэнд байв ✗)
               ② 🗺 хаяг `formatCardAddress` («Улаанбаатар — Баянгол — 2-р хороо»)
               ③ 🔤 гарчиг `font-normal`, мэдээлэл/мета `text-[15px]` ✓ */
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((l) => {
                const firstImage = Array.isArray(l.images) && l.images.length ? l.images[0] : null;
                /* 🏷️ Гарчиг — карттай ЯГ ижил дүрэм (`ListingCard`): 🚗/💻 авто-
                   гарчиг (`autoTitle`) → зар оруулагчийн бичсэн → хоосон ✓ */
                const title = autoTitle(l) || listingTitle(l);
                /* 📋 МЭДЭЭЛЛИЙН МӨР — ⏳ тусдаа `<p>` мөр бүр (🛏/🚿/📐/🏢/📅/🚪/🅿️)
                   нь ОДОО « · »-ээр холбогдсон НЭГ мөр болов (картын хэв рүү) —
                   emoji-гүй, `text-[15px] text-gray-500` ✓ МЭДЭЭЛЭЛ АЛГА БОЛООГҮЙ ✓ */
                const specs = [
                  l.rooms > 0 ? `${l.rooms} өрөө` : '',
                  l.bathrooms > 0 ? `${l.bathrooms} угаалгын өрөө` : '',
                  l.area > 0 ? `${l.area} м²` : '',
                  getFloorLabel(l.floor, l.total_floors),
                  l.build_year > 0 ? `${l.build_year} он` : '',
                  l.balconies > 0 ? `Тагт: ${l.balconies}` : '',
                  getGarageLabel(l.has_garage) ? `Гараж: ${getGarageLabel(l.has_garage)}` : '',
                ].filter(Boolean).join(' · ');
                /* 📍 Хаяг — 🆕 (107): КАРТЫН хэв (`formatCardAddress` — хот →
                   дүүрэг → хороо, « — »); байршил заагаагүй зар дээр
                   «Байршил заагаагүй» (нэг эх сурвалж: `lib/listingLocation.mjs`) ✓ */
                const place = formatCardAddress(l) || NO_LOCATION_LABEL;
                return (
                  <div key={l.id} className="group flex flex-col gap-2">
                    {/* ⚠️ КАРТ БҮХЭЛДЭЭ линк — «👁 Харах» товч ХЭРЭГГҮЙ.
                        Үйлдлийн товчнууд (Засах/Устгах) нь линкээс ГАДНА —
                        `<a>` дотор `<button>` хийх нь invalid HTML. */}
                    <Link
                      href={`/listings/${l.id}`}
                      title="Зарын дэлгэрэнгүйг харах"
                      className="flex min-w-0 flex-1 flex-col rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                    >
                      {/* 🖼 ЗУРАГ — 4:3 (`aspect-[4/3]`) БҮТЭН өргөн, `rounded-xl`
                          (карттай ЯГ ижил; ⏳ `h-[150px] rounded-lg bg-gray-100`
                          ХАСАГДАВ — (101) хайрцаг/саарал байхгүй ✓) */}
                      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl">
                        {firstImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={firstImage}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-5xl">{getPropertyIcon(l.property_type)}</div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col pt-2.5">
                        {/* 💰 ҮНЭ — зургийн ЯГ ДОР, хамгийн ТОМ (карттай ижил 22px) */}
                        <div className="text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-gray-900">
                          {shortPriceLabel(l)}
                        </div>
                        {/* 🤝 «Үнэ тохирно» — үнийн ЯГ ДОР (2026-09-29) */}
                        {negotiableNote(l) && (
                          <div className="text-[12px] font-semibold text-amber-700">{negotiableNote(l)}</div>
                        )}
                        {/* 🔄 «Солино» (2026-10-09) — 🤝-гийн ЯГ ДОР; зөвхөн
                            тэмдэглэсэн зарууд дээр гарна (`lib/swapFilter.mjs`) */}
                        {swapLabel(l) && (
                          <div className="text-[12px] font-semibold text-emerald-700">{SWAP_ICON} {swapLabel(l)}</div>
                        )}
                        {title && (
                          <div className="mt-1 line-clamp-2 text-[16px] font-normal leading-snug text-gray-900" title={title}>
                            {title}
                          </div>
                        )}
                        {specs && (
                          <div className="mt-1.5 truncate text-[15px] text-gray-500" title={specs}>
                            {specs}
                          </div>
                        )}
                        {/* 📍📅 МЕТА МӨР — байршил | огноо (картын хэв; `mt-auto`
                            ⇒ бүх картын мета мөр НЭГ ЗУРААСАНД эгнэнэ ✓)
                            🆕 (107): ⏳ «огноо | хаяг» → ОДОО **хаяг ЭХЭНД,
                            огноо ТӨГСГӨЛД** (`ListingCard`-тай ЯГ ИЖИЛ); текст
                            нь `text-[15px] leading-snug` (жишиг зургийн хэв) ✓ */}
                        <div className="mt-auto pt-1 text-[15px] leading-snug text-gray-500">
                          <span className="break-words" title={place}>
                            <MapPinIcon className="mr-1 inline-block h-5 w-5 align-[-4px]" />
                            {place}
                          </span>
                          <span className="whitespace-nowrap" title="Нийтэлсэн огноо">
                            <span aria-hidden="true" className="mx-1.5 text-gray-300">|</span>
                            {timeAgo(l.created_at)}
                          </span>
                        </div>
                      </div>
                    </Link>
                    {/* 🆕 2026-10-07 (59): товчнууд БҮХ дэлгэцэд ХЭВТЭЭ мөрөнд
                        (карт вертикаль ⇒ `sm:w-auto sm:flex-col` ХАСАГДАВ ✓) */}
                    <div className="flex w-full flex-row gap-2">
                      {/* 🆕 2026-10-06 (6): «✏️ Засах» НОГООН болов — `btn-success`
                          (хэрэглэгчийн хүсэлт ✓). 🗑 Устгах нь улаан ХЭВЭЭР тул
                          нэг харцаар ялгагдана. */}
                      <button className="btn btn-success btn-sm" onClick={() => openEdit(l)}>✏️ Засах</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l)}>🗑 Устгах</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
