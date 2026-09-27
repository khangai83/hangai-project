'use client';

import Link from 'next/link';
import { formatPrice, getPropertyIcon, firstImage, getFloorLabel, timeAgo, formatAddress } from '../lib/format';
import { toggleFavorite, useFavorites, useLikeCount } from '../lib/favorites';
import Avatar from './Avatar';

/**
* @param {{listing: object, author?: {displayName?: string, avatarUrl?: string|null}}} props
* `author` — зар нийтлэгчийн НИЙТИЙН профайл (нэр + зураг).
* ⚠️ Сонголтоор: `HomeClient` нь тусдаа query-ээр татаж дамжуулна
* (`fetchProfilesByIds`). Байхгүй бол блок харагдахгүй.
*/
export default function ListingCard({ listing, author, attrsLine }) {
  const img = firstImage(listing);
  const favoriteIds = useFavorites();
  const isFav = favoriteIds.includes(listing.id);
  // ❤️ Нийт хэдэн хүн таалагдсан (listings.likes — supabase/migrations/0007)
  const likes = useLikeCount(listing.id, listing.likes);
  // 👁 Нийт хэдэн хүн үзсэн (listings.views — 0007_listing_likes_views.sql,
  //    триггер count(*) -ээр автоматаар бодно)
  const views = Number(listing.views) || 0;
  const isSell = listing.category === 'sell';
  // ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөхөд (хэрэглэгчийн хүсэлт) —
  //    бусад хэсэгт (авто/ажил/компьютер…) энэ badge ХАРАГДАХГҮЙ.
  const isRealEstate = (listing.section || 'real-estate') === 'real-estate';
  const floorLabel = getFloorLabel(listing.floor, listing.total_floors);
  /*
   * ══════ ⚠️ КАРТЫН ӨНДӨР — `sm:h-[260px]` (2026-09-27) ══════
   * 🔴 ХЭРЭГЛЭГЧИЙН ГОМДОЛ: «profile зургийг томруулахаар картны бусад
   *    мэдээлэл доош орж харагдахгүй болоод байна»
   * 🔴 ШАЛТГААН: карт нь `overflow-hidden` + БЭХЛЭГДСЭН өндөр байсан
   *    (`sm:h-[220px]`) тул агуулга хэтэрвэл ДООРООС НЬ ТАЙРАГДДАГ ✗
   *
   * 📐 ТООЦОО (доорх мэдээллийн блокийн агуулга):
   *      48px  👤 Зар нийтлэгч (Avatar 40px) + mb-2
   *      24px  🏢 ТӨРӨЛ + mb-1.5
   *      21px  📋 attrsLine (бусад хэсэгт) + mb-1
   *      29px  💰 ҮНЭ + mb-0.5
   *      42px  📍 Хаяг + 🕒 Огноо (2 мөр)
   *      27px  🛏 өрөө / 📐 м² / 🏢 давхар / 📅 он + mt-1.5
   *      27px  ❤️ доод мөр (border-t + pt-2)
   *     ─────
   *     218px  НИЙТ агуулга
   * ⚠️ `sm:h-[220px]` → `p-4` (32px) хасвал **188px** л боломжтой байв
   *    → 218 − 188 = **30px ТАЙРАГДДАГ** ✗
   * ✅ `sm:h-[260px]` → боломжтой **228px** → 10px нөөцтэйгээр БҮГД БАГТАНА ✓
   *    (зураг ч 320×260 болж томорно — илүү сайн ✓)
   *
   * 🔧 ӨНДРИЙГ СОЛИХ БОЛ: доорх `sm:h-[260px]`-г `252` (нягт) эсвэл
   *    `270` (илүү чөлөөтэй) гэж бичнэ.
   * ⚠️ МОБАЙЛ дээр бэхлэгдсэн өндөр БАЙХГҮЙ (`flex-col`, auto өндөр) тул
   *    тайрагдахгүй ✓ — энэ засвар нь ЗӨВХӨН `sm:` (≥640px) дээр нөлөөлнө.
   */
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover sm:flex-row sm:h-[260px]"
    >
      <div className="relative h-52 w-full shrink-0 overflow-hidden bg-gray-100 sm:h-full sm:w-[320px]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={listing.property_type}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">{getPropertyIcon(listing.property_type, listing.section)}</div>
        )}
        {isRealEstate && (
        <span className={`badge absolute left-2 top-2 ${isSell ? 'badge-sell' : 'badge-rent'}`}>
          {isSell ? 'Зарах' : 'Түрээс'}
        </span>
        )}
        {/* 🎥 Видео байгаа зарын тэмдэг (0011_listing_video.sql → video_url).
            ⚠️ `listing.video_url` нь КАНОНИК линк (lib/youtube.mjs) — энд
            зөвхөн «байгаа эсэх»-ийг шалгана, задлан шинжлэх шаардлагагүй. */}
        {listing.video_url && (
          <span
            title="Энэ зарт видео бий"
            className="absolute right-2 top-2 flex h-7 items-center gap-1 rounded-full bg-black/65 px-2.5 text-[12px] font-bold text-white shadow backdrop-blur-sm"
          >
            🎥 Видео
          </span>
        )}
        {/* ⚠️ ЗУРАГ дээр «таалагдсан» тэмдэглээ (зүрх/тоо) БАЙХГҮЙ.
            Нийт тоо + ❤️/🤍 товч нь доорх МЭДЭЭЛЛИЙН хэсэгт (мета мөр) байна. */}

        {/* 👁 Хичнээн хүн үзсэн — зургийн ЗҮҮН ДООД буланд.
            ⚠️ Баруун доод буланд биш: /favorites хуудсанд «✕ Хасах» товч
            (absolute bottom-3 right-3) нь тэнд байрладаг тул халхлагдана. */}
        {/* <span
          title="Энэ зарыг хэдэн хүн үзсэн"
          className="absolute bottom-2 left-2 flex h-7 items-center gap-1 rounded-full bg-black/65 px-2.5 text-[12px] font-bold tabular-nums text-white shadow backdrop-blur-sm"
        >
          👁 {views}
        </span> */}
      </div>
      <div className="flex flex-1 flex-col justify-between overflow-hidden p-4">
        <div>
          {/* ══════ 👤 ЗАР НИЙТЛЭГЧ — КАРТЫН БАРУУН ДЭЭД БУЛАНД ══════
              (2026-09-27, хэрэглэгчийн хүсэлт: «Нэр болон Зургийг баруун
               буланд, хүнд харагдахаар байрлуул»)
              • `justify-end` → нэр + профайл зураг БАРУУН тийш тэгшилнэ ✓
              • 🖼 Зураг нь `Avatar` **28px** (өмнө 20px — бүдэг байв)
              • Текст нь `font-semibold text-gray-700` (өмнө `text-gray-500`
                бүдэг байсан тул харагдахгүй байв ✗)
              ⚠️ `show_identity = false` (0017) эсвэл 0015/0017 ороогүй бол
                 `fetchProfilesByIds` нь `displayName`-ыг ХООСОН буцаана →
                 энэ блок ОГТ ХАРАГДАХГҮЙ ✓
              ⚠️ Нэр нь холбоос БИШ — карт бүхэлдээ зар руу линк (`<Link>`
                 дотор `<Link>` хийх нь HTML-д хоригтой). */}
          {author?.displayName && (
            <div className="mb-2 flex items-center justify-end gap-2.5">
              <span
                className="truncate text-[13.5px] font-semibold text-gray-800"
                title={author.displayName}
              >
                {author.displayName}
              </span>
              {/* ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): 28px → 40px — карт дээр
                  профайл зураг САЙН ХАРАГДАХЫН тулд томруулав.
                  🔧 Хэмжээг солих бол `size={40}` → 32 / 48 / 56 гэж бичнэ. */}
              <Avatar src={author.avatarUrl} name={author.displayName} size={50} />
            </div>
          )}
          {/* ---------- ТӨРӨЛ — КАРТЫН ХАМГИЙН ЭХНИЙ МӨР ----------
              ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): «Зар бүрийн доор харагдаж
                 байгаа Үл хөдлөх / Автомашин гэх мэтийг урд нь гарга» —
                 өмнө нь ҮНИЙН ДООР байсан → одоо ЗУРГИЙН дараагийн
                 ХАМГИЙН ЭХЭНД (урд) гарлаа.
              ⚠️ `getPropertyIcon(type, section)` — `section`-ыг ЗААВАЛ дамжуулна:
                 эс бөгөөс бусд хэсгийн дэд төрөл (ж: «Седан») 🏠 icon авна.
                 (Бусад хэсэгт icon нь ХЭСГИЙН icon: 🚗 💼 💻 🛋️ 🛠️) */}
          <div className="mb-1.5 truncate text-[13px] font-semibold text-gray-800">
            {getPropertyIcon(listing.property_type, listing.section)} {listing.property_type}
          </div>
          {/* ---------- ЗАР НИЙТЛЭГЧ (нэр + профайл зураг) ----------
              ⚠️ 2026-09-27: БАРУУН ДЭЭД БУЛАНД зөөгдсөн — доорх (картын
                 эхний мөр) блокийг харна уу ↑ (justify-end). */}

          {/* ---------- ХЭСГИЙН НЭМЭЛТ МЭДЭЭЛЭЛ (0016) ----------
              ж: «Toyota Harrier, 2021 · 95,200 км · Автомат · 2.5 л · Хайбрид»
              ⚠️ `HomeClient` нь `formatAttrsLine()`-ээр бэлдэж дамжуулна
                 (үл хөдлөхөд хоосон ирнэ → блок харагдахгүй). */}
          {attrsLine && (
            <div className="mb-1 truncate text-[12.5px] font-medium text-gray-600" title={attrsLine}>
              {attrsLine}
            </div>
          )}
          {/* ---------- ҮНЭ ----------
              ⚠️ `price_type` («нийт» / «сард» / «м²») карт дээр ХАРАГДАХГҮЙ —
                 зөвхөн үнэ. (Ижил дүрэм: ListingDetailClient, MyListingsClient,
                 MapView — бүх UI дээр хассан.)
              ⚠️ `getPriceTypeLabel` импорт ч хасагдсан (unused import → ESLint). */}
          <div className="mb-0.5 text-lg font-bold text-gray-900">
            ₮{formatPrice(listing.price)}
          </div>
          {/* ---------- 📍 ХАЯГ + 🕒 НИЙТЭЛСЭН (2 мөр, ЗҮҮН тийш) ----------
              ⚠️ Хаяг эхний мөрөнд, огноо нь ЯГ ДООР нь — хоёулаа ЗҮҮН тийш
                 зэрэгцсэн (`justify-between` БИШ).
              ⚠️ Энэ блок нь байрны мэдээллийн (🛏 өрөө / 📐 м² / 🏢 давхар /
                 📅 он) ӨМНӨ байрлана. Дэлгэрэнгүй хуудсан дээр ч мөн адил.
              ⚠️ Огноо нь 🕒 (цаг) — баригдсан он нь 📅 (хуанли) тул
                 хоёр 📅 зөрөхгүй.
              ⚠️ `truncate` — хаяг урт байвал картын өндөр (sm:h-[220px]) хэвээр. */}
          <div className="text-[14px] text-gray-700">
            <div className="truncate">📍 {formatAddress(listing) || 'Хаяг тодорхойгүй'}</div>
            <div className="text-[14px] text-gray-700">🕒 {timeAgo(listing.created_at)}</div>
          </div>
          {/* ---------- 🛏 БАЙРНЫ МЭДЭЭЛЭЛ (хаягийн ДОР) ----------
              Өрөө · угаалгын өрөө · талбай · давхар · баригдсан он.
              ⚠️ `rooms/area/build_year/bathrooms` нь 0 байж болох тул `> 0`
                 шалгалттай; `floorLabel` нь lib/format-аас '' (хоосон) буцаж болно.
              ⚠️ 🚿 нь 3+ өрөөтэй орон сууц / АОС/хаус зар дээр л хадгалагддаг
                 (0012_listing_bathrooms.sql) — property.mn загварын тэмдэгт. */}
          {(listing.rooms > 0 || listing.bathrooms > 0 || listing.area > 0 || floorLabel || listing.build_year > 0) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-gray-700">
              {listing.rooms > 0 && <span>🛏 {listing.rooms} Өрөө</span>}
              {listing.bathrooms > 0 && <span>🚿 {listing.bathrooms} Угаалгын өрөө</span>}
              {listing.area > 0 && <span>📐 {listing.area} м²</span>}
              {floorLabel && <span>🏢 {floorLabel}</span>}
              {listing.build_year > 0 && <span>📅 {listing.build_year}</span>}
            </div>
            
          )}
        </div>
        {/* ДООД МӨР — зөвхөн ❤️/🤍 «Таалагдсан» товч үлдэв.
            ⚠️ ШИЛЖИЛТ: 👁 «үзсэн» тоо болон 🛏 байрны мэдээлэл (өрөө / м² /
               давхар / он) нь ДЭЭШЭЭ — 📍 ХАЯГИЙН хэсэг рүү шилжсэн
               (дээрх «📍 ХАЯГ + 👁 ҮЗСЭН» ба «🛏 БАЙРНЫ МЭДЭЭЛЭЛ» блокоос харна уу).
            ⚠️ `justify-between` БИШ: /favorites хуудсанд «Хасах» товч утсанд
               (max-sm) баруун ДОО буланд буудаг тул халхлахгүйн тулд мөр
               зүүнээс эхэлж, баруун талд `pr-20` (80px) хоосон зай үлдээв. */}
        <div className="mt-auto flex flex-wrap items-center justify-start gap-x-3 gap-y-1 border-t border-gray-100 pt-2 pr-20 text-xs text-gray-400">
          {/* ❤️/🤍 Таалагдсан — энэ нь МИНИЙ favourite toggle БА нийт тоо
              (listings.likes) хоёулаа: дарвал ❤️↔🤍 солигдож, сервер дээрх
              тоо ±1 болно (lib/favorites.js).
              ⚠️ Зурган дээр тусдаа товч БАЙХГҮЙ (зураг цэвэр байх ёстой). */}
          <span className="font-semibold text-sm text-gray-700" title="Энэ зарыг хэдэн хүн үзсэн">
              👁 {views} 
            </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(listing.id);
            }}
            aria-label={isFav ? 'Таалагдсан жагсаалтаас хасах' : 'Таалагдсан жагсаалтад нэмэх'}
            title={isFav ? 'Таалагдсанаас хасах' : 'Надад таалагдсан'}
            className={`-mx-1.5 inline-flex items-center gap-1 rounded-full px-1.5 font-semibold text-[14px] text-gray-700 transition hover:bg-red-50 hover:text-red-600 ${
              isFav ? 'text-red-600' : ''
            }`}
          >
            {isFav ? '❤️' : '🤍'} {likes}
          </button>
        </div>
      </div>
    </Link>
  );
}
