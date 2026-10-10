'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MapView from './MapView';
import MortgageCalculator from './MortgageCalculator';
import ReportListingModal from './ReportListingModal';
import Breadcrumb from './Breadcrumb';
import MessageButton from './MessageButton';
import CopyButton from './CopyButton';
import ShareButton from './ShareButton';
import { useAuth, useToast } from './AppProviders';
import { fetchListingById, fetchSellerCategoryCounts, fetchProfilesByIds } from '../lib/queries';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';
import { trackListingView } from '../lib/statsClient';
import { normalizeError } from '../lib/errors';
import { formatPrice, shortPriceLabel, negotiableNote, getPropertyIcon, getCategoryLabel, getPropertyTypeLabel, getGarageLabel, timeAgo, formatAddress, shortListingId, listingTitle, carTitle } from '../lib/format';
// 🔄 «СОЛИНО» (2026-10-09) — үнийн доорх мөр («🤝 Үнэ тохирно»-гийн ЯГ ДООР).
//    ⚠️ Дүрэм нь `lib/swapFilter.mjs` (цэвэр) — форм ☑ ба хайлтын чиптэй
//    нэг эх сурвалж ✓
import { SWAP_ICON, swapLabel } from '../lib/swapFilter.mjs';
import { buildListingBreadcrumb } from '../lib/breadcrumb';
import { getAttrRows } from '../lib/locationData';
import { toggleFavorite, useFavorites, useLikeCount } from '../lib/favorites';
import { parseYouTube } from '../lib/youtube.mjs';
// 🗺 Газрын зургийн ТӨВ (2026-10-07) — БҮХ зарт газрын зураг харуулах
//    (солбицолгүй ч хороо/дүүрэг/хотын төв рүү буулгана) ✓
import { mapCenterFor } from '../lib/locationGeo.mjs';
/**
 * 📍 ХЭРЭГЛЭГЧ БАЙРШЛАА ЗААГААГҮЙ ЗАР (2026-10-06) — «Байршил сонгохгүй»
 *    чекбоксоор хадгалагдсан зар дээр `city = ''` байдаг тул «📍 Хаяг
 *    тодорхойгүй» (алдаа/дутуу мэт) БИШ, «📍 Байршил заагаагүй» гэж харуулна
 *    (мэдээллийн текст нь `lib/listingLocation.mjs` — нэг эх сурвалж ✓)
 */
import { NO_LOCATION_LABEL } from '../lib/listingLocation.mjs';
// 🕐 2026-10-08 (68): «Хайлтын түүх» рүү ҮЗСЭН ЗАРАА бичнэ (хайлт БИШ) ✓
import { recordListingView } from '../lib/searchHistory';
// 🔎 2026-10-09 (79): «Төстэй зарууд» — үндсэн агуулгын ДООР (жишиг сайтын хэв).
//    Онооллын логик нь `lib/similarListings.mjs`, UI нь `SimilarListings` ✓
import SimilarListings from './SimilarListings';
// 📍👁 2026-10-10 (96) — МЕТА МӨРИЙН ICONУУД EMOJI → SVG (хэрэглэгчийн хүсэлт):
//    ① 📍 → `MapPinIcon` — 🗺 «Газрын зураг» товчны pin-тай ЯГ ИЖИЛ хэв
//    ② 👁 → `EyeIcon` — илгээсэн нүдний зураг (өнгө нь ТОД)
//    ⚠️ emoji нь OS бүрд өөрөөр зурагдаж, өнгө нь текстийг дагахгүй ✗
//    (үндэслэлийг `components/HeaderIcons.jsx`-ийн тайлбарт бичсэн ✓)
import { MapPinIcon, EyeIcon } from './HeaderIcons';

export default function ListingDetailClient({ id }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [listing, setListing] = useState(null); // null = loading, false = not found
  const [loadError, setLoadError] = useState(null); // холболтын алдаа
  const [videoPlaying, setVideoPlaying] = useState(false); // 🎥 видеог дарж эхлүүлсэн эсэх
  const [active, setActive] = useState(0);
  const [phoneShown, setPhoneShown] = useState(false);
  const [views, setViews] = useState(null); // 👁 серверээс ирсэн «үзсэн» тоо (null = миграцгүй)
  const [sellerStats, setSellerStats] = useState(null); // 📋 нийтлэгчийн зарын тоо (Зарах/Түрээслэх) — (62) «📋 N идэвхтэй зар» линк
  const [author, setAuthor] = useState(null); // 👤 нийтлэгчийн профайл (нэр + зураг)
  const favoriteIds = useFavorites(); // ❤️ (дээрх hook-уудтай хамт дуудагдах ёстой)
  const likes = useLikeCount(id, listing ? listing.likes : 0); // ❤️ нийт хэдэн хүн дарсан

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchListingById(id);
        if (mounted) { setListing(data || false); setActive(0); setPhoneShown(false); }
      } catch (err) {
        const e = normalizeError(err);
        console.error(e);
        if (mounted) { setListing(false); setLoadError(e); showToast(e.message, 'error'); }
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /**
   * 👤 ЗАР НИЙТЛЭГЧИЙН ПРОФАЙЛ (хоч нэр + профайл зураг) — ТАТАХ.
   *
   * 🔴 БОДИТ АЛДАА ЗАСВАР (2026-09-27, хэрэглэгчийн гомдол: «зар луу ороод
   *    харахад зураг гарч ирэхгүй байна»):
   *    ⚠️ Өмнө нь `author` төлөв ЗАРЛАГДСАН (мөр 28) ч `setAuthor()` нь
   *       ХЭЗЭЭ Ч ДУУДАГДААГҮЙ байв ✗ → дэлгэрэнгүй хуудсанд профайл зураг,
   *       хоч нэр ОГТ ХАРАГДАХГҮЙ байсан. (`sellerName` нь зөвхөн
   *       `listing.contact_name` fallback-аар гардаг байсан тул НЭР нь
   *       харагдаж, ЗУРАГ нь гарахгүй байв — яг таны гомдол ✓)
   *
   * ⚠️ `listings.user_id` нь `profiles` руу FK-ГҮЙ тул PostgREST-ийн embed
   *    (`profiles(...)`) ажиллахгүй → 2 дахь query (`fetchProfilesByIds`)
   *    хийж client талд нэгтгэнэ (HomeClient-тэй ижил арга).
   * ⚠️ `fetchProfilesByIds` нь `show_identity = false` (0017) үед
   *    `displayName`/`avatarUrl`-ыг ХООСОН буцаана → тэгвэл зөвхөн
   *    `contact_name` fallback харагдана ✓
   */
  useEffect(() => {
    if (!listing || !listing.user_id) {
      setAuthor(null);
      return undefined;
    }
    let mounted = true;
    (async () => {
      try {
        const map = await fetchProfilesByIds([listing.user_id]);
        if (mounted) setAuthor((map && map[listing.user_id]) || null);
      } catch (err) {
        // Зураг/нэр харуулахгүй — үндсэн агуулгад нөлөөлөхгүй
        console.warn(normalizeError(err));
        if (mounted) setAuthor(null);
      }
    })();
    return () => { mounted = false; };
  }, [listing]);


  /**
   * 📋 «Зар нийтлэгч» карт дээрх «📋 N идэвхтэй зар» — тухайн хэрэглэгчийн
   * Зарах / Түрээслэх зарын тоо.
   * 🆕 2026-10-08 (62)/(63): «📋 N идэвхтэй зар» мөр нь ТУСДАА ЛИНК (`/sellers/[id]`) —
   * линк шиг ХАРАГДАНА (`text-primary` + `underline`) ✓
   * 🆕 (63) ХЭРЭГЛЭГЧИЙН ЗАСВАР: «Зарын тоо:» гэсэн УГТВАР ХАСАГДАВ — зөвхөн ТОО ✓
   * ⚠️ `listings` хүснэгтэд «идэвхгүй» гэсэн төлөв (`status`) БАГАНА БАЙХГҮЙ —
   * бүх мөр нь нийтлэгдсэн, ИДЭВХТЭЙ зар ⇒ тоо нь ЯГ зөв ✓
   * ⚠️ Алдаа гарвал зүгээр л «📋 идэвхтэй зар» гэж харуулна
   * (үндсэн агуулгад нөлөөлөхгүй) ✓
   */
  useEffect(() => {
    if (!listing || !listing.user_id) {
      setSellerStats(null);
      return undefined;
    }
    let mounted = true;
    fetchSellerCategoryCounts(listing.user_id)
      .then((stats) => { if (mounted) setSellerStats(stats); })
      .catch((err) => console.warn(normalizeError(err)));
    return () => { mounted = false; };
  }, [listing]);

  // ⚠️ 2026-09-29: 🕓 `recordRecentlyViewed(listing.id)` эффект ХАСАГДАВ
  //    («Саяхан үзсэн» боломж бүхэлдээ хасагдсан — линк, хуудас, lib).
  // 🔄 2026-10-08 (68): «🕐 Хайлтын түүх» нэрээр БУЦАЖ ИРЭВ — гэхдээ ЗӨВХӨН
  //    үзсэн ЗАРУУД (хайлт бүртгэгдэхгүй ✓, доорх эффектийг үзнэ үү)

  /**
   * 🕐 «Хайлтын түүх» рүү ҮЗСЭН ЗАРАА БҮРТГЭНЭ (2026-10-08, 68) — хайлтын
   *    үр дүн/линк БИШ, зөвхөн энэ зарын `/listings/<id>` мөр ✓
   * ⚠️ Нэг session-д дахин нээхэд ч БИЧНЭ (тоолуураас ялгаатай) — түүх нь
   *    «хамгийн сүүлд үзсэн нь эхэнд» зарчмаар эрэмбэлэгддэг тул зөв ✓
   * ⚠️ Алдааг ЧИМЭЭГҮЙ дарна — түүх нь туслах боломж, зарын агуулгад
   *    нөлөөлөхгүй, миграцгүй ч localStorage-д бичигдэнэ ✓
   */
  useEffect(() => {
    if (!id) return;
    recordListingView((user && user.id) || null, id).catch(() => {});
  }, [id, user]);

  /**
   * 👁 «Үзсэн» тоог +1.
   * ⚠️ Нэг browser session-д НЭГ л удаа — F5 дарах бүрд хөөрөгдөхгүй.
   *    (Шинэ tab/session нээхэд дахин тоолно — энэ нь зөв.)
   */
  useEffect(() => {
    if (!id) return undefined;
    try {
      const key = `zarmn_viewed_${id}`;
      if (window.sessionStorage.getItem(key)) return undefined;
      window.sessionStorage.setItem(key, '1');
    } catch (e) {
      return undefined; // private mode гэх мэт — тоолохгүй
    }
    let mounted = true;
    trackListingView(id).then((n) => {
      if (mounted && typeof n === 'number') setViews(n);
    });
    return () => { mounted = false; };
  }, [id]);

  if (listing === null) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Зарыг ачаалж байна...</p>
        </div>
      </div>
    );
  }

  if (listing === false) {
    if (loadError) {
      return (
        <div className="page-container">
          {/* 🎨 2026-10-09 (87): холболтын алдааны хайрцаг ч `bg-gray-100`/
              `bg-gray-50` дүүргэлтгүй болов (хэрэглэгчийн хүсэлт: «бүх саарал
              өнгийг үгүй хий») — зөвхөн улаан хүрээ + цагаан дэвсгэр ✓ */}
          <div className="mx-auto my-6 max-w-[720px] rounded-2xl border border-red-200 bg-white px-6 py-8 text-center">
            <div className="text-4xl">🔌</div>
            <h3 className="mb-1.5 mt-2.5 text-lg font-semibold text-red-800">Өгөгдлийн сантай холбогдож чадсангүй</h3>
            <p className="[word-break:break-word] rounded-lg border border-red-200 bg-red-50 p-3 text-left text-[13px] text-red-700">{loadError.message}</p>
            <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3.5 text-left text-[13px] text-gray-700">
              <p><b>Хэрхэн засах вэ:</b></p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                <li><code className="rounded border border-gray-200 px-1.5 py-px text-xs">.env.local</code> доторх <code className="rounded border border-gray-200 px-1.5 py-px text-xs">NEXT_PUBLIC_SUPABASE_URL</code>-г шалгана.</li>
                <li>Терминалд <code className="rounded border border-gray-200 px-1.5 py-px text-xs">npm run check:supabase</code> ажиллуулна.</li>
              </ol>
            </div>
            <Link href="/" className="btn btn-primary mt-4">← Нүүр рүү буцах</Link>
          </div>
        </div>
      );
    }
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="mb-4 text-6xl">❌</div>
          <h3 className="mb-4 text-xl font-semibold">Зар олдсонгүй</h3>
          <Link href="/" className="btn btn-outline">← Нүүр рүү буцах</Link>
        </div>
      </div>
    );
  }

  const images = Array.isArray(listing.images) ? listing.images : [];
  // 📍 Хаяг — карттай ЯГ ижил форматаар (lib/format.js → formatAddress)
  const address = formatAddress(listing);
  // 🔖 Хэрэглэгчид харагдах БОГИНО зарын дугаар (uuid-ийн эхний 8 hex) — 2026-10-07
  //    (хэрэглэгчийн хүсэлт: «зарын id … богино болгож хэрэглэгчдэд харуулах»)
  const shortId = shortListingId(listing.id);
  const typeLabel = getPropertyTypeLabel(listing.property_type, listing.category);
  // 🏷️ ЗАРЫН ГАРЧИГ (🆕 2026-10-09 (88)) — зар оруулагчийн ӨӨРИЙН бичсэн гарчиг
  //    (`listings.title` — 0027). ⚠️ НЭГ ЭХ СУРВАЛЖ: `lib/format.js →
  //    listingTitle(listing)` — карт (`ListingCard` мөр 161) ЯГ ижил функцийг
  //    дууддаг тул гарчиг 2 газар өөр харагдах боломжгүй ✓
  //    ⚠️ `null` (0027-оос өмнөх 782 хуучин зар) эсвэл зөвхөн зай байвал `''`
  //    буцаана ⇒ доорх H1 нь `sr-only` хэвээр үлдэнэ ✓
  // 🆕 (97) 🚗 АВТО: зар оруулагч гарчиг БИЧЭЭГҮЙ бол `attrs`-аас
  //    «Toyota Harrier, 2017/2024» (брэнд + загвар, үйлдвэрлэсэн/орж ирсэн он)
  //    — жишиг сайтын машин деталь хуудасны гарчигтай ЯГ ИЖИЛ ✓ (`carTitle`;
  //    хэрэглэгчийн хүсэлт: «Only car detail card like photo, it's head is
  //    category name Toyota Harrier, Its Brand and Model then manufactured
  //    date/Imported year»). ⚠️ Зар оруулагчийн бичсэн гарчиг ТҮРҮҮЛНЭ ✓
  const isAuto = (listing.section || 'real-estate') === 'auto';
  const adTitle = listingTitle(listing) || (isAuto ? carTitle(listing.attrs) : '');
  const garageLabel = getGarageLabel(listing.has_garage);
  const isSell = listing.category === 'sell';
  // ⚠️ «Зарах / Түрээслэх» badge, ₮/м², ипотекийн тооцоолуур нь ЗӨВХӨН
  //    үл хөдлөхөд утга учиртай — бусад хэсэгт (авто/ажил/компьютер…)
  //    ХАРАГДАХГҮЙ (`ListingCard.jsx` мөр 27-ийн ижил конвенц ✓).
  //    ⚠️ Үл хөдлөхийн бус зард `category` нь DB-ийн default `sell` байдаг тул
  //       зөвхөн `isSell`-ээр шалгавал машин зар дээр «Зарах» badge ба
  //       ипотекийн тооцоолуур БУРУУ гарна ✗ (хэрэглэгчийн гомдол: 2026-10-01)
  // 🧩 Хэсэг (`listings.section` — 0016). ⚠️ ХООСОН бол `real-estate` (хуучин зар)
  const section = listing.section || 'real-estate';
  const isRealEstate = section === 'real-estate';
  const phoneDigits = String(listing.phone || '').replace(/^976/, '').replace(/^\+/, '');
  // ✉️ Ярианы гарчиг болгон хадгалах шошго (зар дээрх 1-р мөртэй ижил формат)
  const listingLabel = [typeLabel, address].filter(Boolean).join(', ');
  // ⚠️ Өөрийн зар дээр «Мессеж бичих» товч ХАРАГДАХГҮЙ (`canMessage()` мөн
  //    хамгаална — гэхдээ товчийг нуух нь илүү ойлгомжтой ✓). Нэвтрээгүй
  //    хэрэглэгчид ХАРАГДАНА — дарвал нэвтрэх цонх нээгдэнэ ✓
  const canShowMessage = Boolean(listing.user_id) && (!user || user.id !== listing.user_id);

  // 👁/❤️ — серверээс ирсэн тоо (миграц 0006 хийгээгүй бол 0 харагдана)
  const viewCount = views != null ? views : Number(listing.views) || 0;
  const likeCount = likes;

  // 🎥 YouTube видео (0011_listing_video.sql → video_url).
  // ⚠️ Embed URL-ийг `parseYouTube` нь БИД өөрсдөө угсарна (хэрэглэгчийн
  //    текстийг шууд iframe-д хийхгүй) — XSS-ээс хамгаална.
  const video = parseYouTube(listing.video_url);

  // <section data-component="AdvertFeaturesApp"> хэсэгт харагдах шинж чанарууд.
  // Зөвхөн утгатай (хоосон биш) мөрүүдийг харуулна.
  const isFav = favoriteIds.includes(listing.id);
  const features = [
    //{ label: 'Төрөл', value: typeLabel },
    listing.rooms > 0 && { label: 'Өрөөний тоо', value: `${listing.rooms} өрөө` },
    // 🚿 Угаалгын өрөөний тоо (0012_listing_bathrooms.sql) — 3+ өрөө / АОС/хаус
    listing.bathrooms > 0 && { label: 'Угаалгын өрөө', value: `${listing.bathrooms} Угаалгын өрөө` },
    listing.area > 0 && { label: 'Талбай', value: `${listing.area} м²` },
    listing.floor > 0 && { label: 'Хэдэн давхарт', value: `${listing.floor} Давхарт` },
    listing.total_floors > 0 && { label: 'Барилгын давхар', value: `${listing.total_floors} Давхар` },
    listing.build_year > 0 && { label: 'Ашиглалтанд орсон он', value: `${listing.build_year} Он` },
    listing.balconies > 0 && { label: 'Тагт', value: `${listing.balconies} Тагттай` },
    // ⚠️ 🏠 «Гараж» нь ЗӨВХӨН ҮЛ ХӨДЛӨХӨД (`isRealEstate`) — DB-ийн `has_garage`
    //    нь бусад хэсэгт `false` (default) тул 💻 Notebook/💼 ажил дээр
    //    «Гараж: Байхгүй» гэсэн УТГАГҮЙ мөр гарч байв ✗ (2026-10-01 (16)-д
    //    карт эдгээр хэсэгт ГАРАХ болсноор илэрсэн — зассан ✓)
    isRealEstate && garageLabel && { label: 'Гараж', value: garageLabel },
    // ₮/м² — үнэ ÷ талбай (зөвхөн «зарах» ба талбайтай ҮЛ ХӨДЛӨХӨД). Үнэ
    // харьцуулахад хамгийн хэрэгтэй үзүүлэлт тул шинж чанарын хүснэгтэд шууд.
    isRealEstate && isSell && listing.area > 0 && listing.price > 0 && {
      label: 'Үнэ / м²',
      value: `₮${formatPrice(Math.round(Number(listing.price) / Number(listing.area)))}`,
    },
    // ===== 📋 ХЭСГИЙН ҮЗҮҮЛЭЛТҮҮД (`attrs` — 0016) =====
    // 🆕 2026-10-01 (16), хэрэглэгчийн хүсэлт: «Автомашин руу орход дэлгэрэнгүй
    //    мэдээлэл харуулаачээ, 2 багана болгоод оруулаарай».
    // ⛔ Өмнө нь энэ массив нь ЗӨВХӨН ҮЛ ХӨДЛӨХИЙН талбаруудтай байв → 🚗 машин
    //    (мөн 💼 ажил, 💻 компьютер, 🛠️ үйлчилгээ …) зарууд дээр ХООСОН болж,
    //    доорх `features.length > 0` шалгалтаар «Зарын дэлгэрэнгүй» карт ОГТ
    //    ГАРАХГҮЙ байв ✗ (🚗 Toyota Sai руу ороход зөвхөн «Тайлбар» байсан).
    // ✅ Одоо `attrs` (🏷️ Үйлдвэрлэгч · 🚙 Загвар · 🎨 Өнгө · 📅 он · 📥 орж
    //    ирсэн он · 🛣️ гүйлт · ⚙️ хайрцаг · 🔧 хөдөлгүүр · ⛽ түлш …) нь хэсгийн
    //    `attrFields`-ийн шошго/icon/дарааллаар мөр болно (`getAttrRows`).
    //    🆕 (96): ХҮСНЭГТЭД мөр нь ОДОО `{шошго}: {утга}` — icon ХАРАГДАХГҮЙ
    //    (хэрэглэгчийн хүсэлт: «🏷️ Үйлдвэрлэгч: гэх мэтийн бүх icon ийг
    //    байхгүй болго, хэрэггүй»). ⚠️ `icon` утга нь `getAttrRows`-д ХЭВЭЭР
    //    (форм/сайдбарын чип иконууд хөндөгдөхгүй ✓), зөвхөн дүрслэл өөрчлөгдөв ✓
    // ⚠️ Дараалал: ҮЛ ХӨДЛӨХИЙН талбарууд ЭХЭНД, `attrs` тэдний ДАРАА — 2 хэсэг
    //    нэг зар дээр давхардахгүй (RE зард `attrFields` огт байхгүй → 0 мөр ✓)
    // ⚠️ `subtype` = `listing.property_type` — 💻 Notebook-ийн 📺/⚙️/🧠/💾
    //    талбарууд ЗӨВХӨН Notebook дээр гарах `onlySubtypes` шүүлт ажиллана ✓
    ...getAttrRows(section, listing.attrs, listing.property_type),
 /*{ label: 'Зарын төрөл', value: getCategoryLabel(listing.category) },*/
 /*{ label: 'Нийтэлсэн', value: timeAgo(listing.created_at) },*/
    // { label: 'Зарын дугаар', value: `ID: ${listing.id}` },
    // ⚠️ «Байршил» мөр ЭНДЭЭС ХАСАГДАВ (2026-10-01) — хаяг нь галерей картын
    //    дотоод footer-т, 👁/🤍 («үзсэн/таалагдсан») мөрийн ЯГ АРААС, 📅
    //    нийтэлсэн огноотой НЭГ МӨРӨНД харагдана (дээрх Gallery карт).
    //    Хоёулаа байвал 8px-ийн зайтай ДАВХАРДАНА ✗ (хэрэглэгчийн хүсэлт ✓)
    // ⚠️ Хэрэв энэ массив ХООСОН бол «Зарын дэлгэрэнгүй» карт ОГТ ГАРАХГҮЙ
    //    (доорх `features.length > 0` шалгалт) — гарчиг дангаараа үлдэхгүй ✓
    // 👁/❤️ статистик (listings.views / listings.likes — 0006_listing_stats.sql)
    // { label: 'Үзсэн', value: `${viewCount} удаа` },
    // { label: 'Таалагдсан', value: `${likeCount} хүн` },
  ].filter(Boolean);

  // ---- ЗАР НИЙТЛЭГЧИЙН ХАРАГДАХ НЭР ----
  /**
   * 🆕 2026-10-07 — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «бүх хэсэгт Зар оруулах үед Нэр
   *    оруулдаг байх … байгууллагынхаа өмнөөс зар оруулж байвал зарын
   *    мэдээлэл дээр өөрийх нь нэр нь гарах нь зохимжгүй юм».
   *    ⇒ Дараалал нь ОДОО **форм дээр оруулсан нэр (`listing.contact_name`)
   *      → профайлын нэр (`display_name`) → ерөнхий төлөв**. Ингэснээр
   *      хэрэглэгч зарын «Нэр» талбарт байгууллагын нэрээ бичвэл зар дээр
   *      ЯГ ТЭР нэр гарна (өөрийн нэр биш) ✓.
   *    ⚠️ Урьд нь `display_name` (профайлын нэр) түрүүлж байв ⇒ форм дээр
   *      бичсэн нэр үл хайхрагдаж, байгууллагын зар дээр хувь хүний нэр
   *      гардаг байв ✗ (яг зассан асуудал).
   * ⚠️ Жинхэнэ нэр (`profiles.name`) нь НИЙТЭД ХАРАГДАХГҮЙ (0015) — `author`
   *    нь `show_identity = false` үед хоосон ирдэг тул `contact_name` үлдэнэ ✓
   *
   * 🆕 2026-10-08 (71) — 👤 ЗАР ТУС БҮРИЙН «НЭР ГАРГАХ УУ?» (`show_name`, 0042):
   *    хэрэглэгч форм дээр («Нэр» талбарын доор) «Үгүй» гэсэн бол ЭНЭ зар дээр
   *    нэр ба профайл зураг ОГТ ХАРАГДАХГҮЙ — зөвхөн «Холбоо барих хүн»
   *    (⚠️ утас/мессеж ХЭВЭЭР ✓ — хэрэглэгчийн сонголт).
   *    ⚠️ Дүрэм нь `!== false` (БИШ `=== true`): багана нь `null` (0042
   *       ороогүй/хуучин зар) үед нэр ХАРАГДАХ ёстой — өмнөх зан төлөв ✓
   *    ⚠️ `contact_name` нь DB-д ХЭВЭЭР байна (зөвхөн ХАРАГДАЦ өөрчлөгдөнө ✓)
   * 🔍 Хайх үг: showName, sellerAvatar, show_name, 0042
   */
  const showName = listing.show_name !== false;
  const sellerName = showName
    ? (listing.contact_name || (author && author.displayName) || 'Холбоо барих хүн')
    : 'Холбоо барих хүн';
  /**
   * 👤 Профайл ЗУРАГ — «Үгүй» үед `src={null}` тул `Avatar` нь профайл зургийг
   *    БИШ, нэрийн эхний үсгийг (placeholder) л харуулна ✓
   */
  const sellerAvatar = showName ? ((author && author.avatarUrl) || null) : null;

  /**
   * 🗺 ГАЗРЫН ЗУРГИЙН ГАНЦ ПИН (2026-10-07).
   * ⚠️ Төв нь `mapCenterFor(listing)` — ⓵ бодит пин → ⓶ хороо → ⓷ дүүрэг →
   *    ⓸ хот → ⓹ анхдагч. Тиймээс СОЛБИЦОЛГҮЙ ЗАР ч газрын зурагтай гарна ✓
   *    (хэрэглэгчийн хүсэлт: «газрын зургийг … Бүх зар дээр»).
   * ⚠️ `MapView` нь `latitude`/`longitude`-тай зарыг л зурдаг тул пиний утгыг
   *    төвийн координатаар дүүргэж дамжуулна ✓
   */
  const mapPoint = mapCenterFor(listing);
  const mapListing = {
    id: listing.id,
    property_type: listing.property_type,
    price: listing.price,
    attrs: listing.attrs,
    latitude: mapPoint.lat,
    longitude: mapPoint.lng,
  };

  // «Элссэн огноо» — «Элссэн огноо 3-р сар, 2021» загвар
  const joinedAt = author && author.createdAt ? new Date(author.createdAt) : null;
  const joinedText = joinedAt ? `${joinedAt.getFullYear()} оны ${joinedAt.getMonth() + 1} сар` : '';

  return (
    <div className="page-container">
      <Breadcrumb items={buildListingBreadcrumb(listing)} />

      {/* ===== ГАРЧИГ (HEADER) =====
          🆕 (97): 👁 үзсэн · ❤️ таалагдсан · 🔗 Хуваалцах нь ОДОО ЭНД —
             толгойн мета мөрөнд (`📍 хаяг · 🕒 огноо · 👁 N · ID: X` +
             баруун захад `[❤️ N]`/`[🔗 Хуваалцах]` pill) байрлана
             (⏳ өмнө нь зургийн ДОР доорх Gallery картын footer-т байв ✗). */}
      <header className="mb-5">
        {/* ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөхөд (`ListingCard`-ийн ижил).
            ⚠️ 2026-10-07: ЭНЭ мөрнөөс «ID: <бүтэн uuid>» ХАСАГДАВ — хэрэглэгчид
               хэт урт байсан тул БОГИНО дугаар (`shortListingId`) болж доорх
               meta блок руу шилжив ✓ */}
        {isRealEstate && (
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`badge ${isSell ? 'badge-sell' : 'badge-rent'}`}>{getCategoryLabel(listing.category)}</span>
          </div>
        )}
        {/* ===== 🏷️ ЗАРЫН ГАРЧИГ — ХАРАГДАХ H1 (🆕 2026-10-09 (88)) =====
            ЖИШИГ САЙТЫН ХЭВ: breadcrumb-ийн ЯГ ДОР — ТОМ БОЛД гарчиг, доор нь
            📍/🕒/🔖 мөрийн мэдээлэл ✓ (хэрэглэгчийн хүсэлт: «энэ явуулсан
            зургийг дуурайж дизайныг сайжруул»)

            ⚠️ (2026-10-01)-д ХАРАГДАХ H1 ХАСАГДСАН шалтгаан нь ТУХАЙН зарын
               гарчиг БИШ — `getPropertyTypeLabel`-ийн УТГА (ж: «🚗 Суудлын
               машин») нь breadcrumb-ийн СҮҮЛИЙН мөртэй ЯГ давхардаж байсан тул ✗.
               Зар оруулагчийн өөрийн бичсэн гарчиг нь давхардал БИШ, ТУСДАА
               мэдээлэл (breadcrumb нь зөвхөн ТӨРӨЛ/ӨРӨӨ/БАЙРШЛЫГ л заана) ⇒
               түүнийг ГАРГАВАЛ зөв ✓ (`docs`-д баримтжуулсан 4 хүсэлтийн гэрээ)
            ⚠️ Гарчиг БАЙХГҮЙ үед H1 нь ⏳ (2026-10-01)-ийн хэвээр `sr-only` —
               текст (icon · төрөл · хаяг) ХӨНДӨӨГДӨӨГҮЙ ✓ ⇒ хуудас бүрд H1 нь
               ЯГ НЭГ л байна (SEO/screen reader-ийн гэрээ хэвээр ✓)
            ⚠️ `mb-2` нь ЗӨВХӨН харагдах үед — `sr-only` нь өөрөө
               `position:absolute` тул зай эзлэхгүй (мета мөр нь толгойн badge-ийн
               `mb-2`-оос шууд эхэлнэ ✓) */}
        <h1
          data-listing-title
          className={adTitle
            ? 'mb-2 text-xl font-bold leading-snug text-gray-900 sm:text-2xl'
            : 'sr-only'}
        >
          {adTitle || `${getPropertyIcon(listing.property_type, listing.section)} ${typeLabel}${address ? ` — ${address}` : ''}`}
        </h1>
        {/* ===== 📍 БАЙРШИЛ · 🕒 НИЙТЭЛСЭН · 👁 ҮЗСЭН · 🆔 ID + ❤️/🔗 — НЭГ МӨРӨНД =====
            🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (🆕 (97)): «change card detail like attached
               photo. change position like attached photo, it's included Үзсэн,
               Таалагдсан, Хуваалцах design and position» ⇒ жишиг сайтын
               дэлгэрэнгүй толгойн ЯГ хэв: зүүн талд `📍 хаяг · 🕒 огноо · 👁 N ·
               ID: XXXXXXXX`, БАРУУН захад хүрээтэй pill товч `[❤️ N]` ба
               `[🔗 Хуваалцах]`.
            ⚠️ ДАРААЛАЛ (тестийн гэрээ): 👁 үзсэн → ❤️ таалагдсан → 🔗 Хуваалцах
            ⚠️ ⏳ (2026-10-01 (14) / 2026-10-07) 👁/❤️/🔗 нь ГАЛЕРЕЙН доорх footer-т
               байв ⇒ ОДОО ТОЛГОЙ руу шилжив (жишиг сайтын хэв) — тэр footer
               БҮРЭН ХАСАГДАВ ✓
            ⚠️ Огноо ХАРЬЦАНГУУ (`timeAgo` — карт дээрхтэй ЯГ ижил); ID нь БОГИНО
               (`shortListingId`); бүтэн uuid нь `title` (hover) дээр — админ
               ID-ийн эхний тэмдэгтээр хайдаг тул богино дугаар шууд олдоно ✓
            🆕 (96) — ICON ЗАСВАР: ⏳ `📍` ба `👁` emoji → SVG (`MapPinIcon`/
               `EyeIcon`), ⏳ `🔖` ХАСАГДАВ ✓
            ⚠️ `data-listing-meta` + `data-listing-actions` — бодит DOM-ыг шалгах
               CDP/тестийн ТОГТВОРТОЙ selector; Дэлгэц нарийсахад `flex-wrap`-ээр
               эвхэгдэнэ — хэвтээ overflow ✗ ✓ */}
        <div data-listing-meta data-listing-actions className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-gray-500">
          {/* 📍 Байршил — 🚫 «Байршил сонгохгүй» чекбоксоор хадгалагдсан зар
              (`city = ''`) дээр «Хаяг тодорхойгүй» БИШ, «Байршил заагаагүй»
              гэж харуулна (хэрэглэгч ЗОРИУДОО заагаагүй тул «алдаа» мэт
              харуулах нь буруу ✗ — нэг эх сурвалж: `lib/listingLocation.mjs`).
              ⚠️ `min-w-0 truncate` — хаяг урт үед `…` болж, БҮТЭН хаяг `title`-д ✓
              🆕 (96) — ⏳ `📍` emoji → **`MapPinIcon`** (🗺 «Газрын зураг» товчны
                 pin-тай ЯГ ИЖИЛ SVG; хэрэглэгчийн хүсэлт: «📍 26-р хороо үүний
                 өмнөх icon ийг Газрын зургийн өмнөх шиг болго» ✓).
                 ⚠️ SVG нь ТЕКСТИЙН УРСГАЛД (`inline-block`) орсон тул хаягны
                 `truncate` ХӨНДӨӨГДӨХГҮЙ ✓ (`align-[-2px]` — текстийн суурьтай нийцүүлнэ) */}
          <span className="min-w-0 truncate" title={address || NO_LOCATION_LABEL}>
            <MapPinIcon className="mr-1 inline-block h-4 w-4 align-[-3px]" />
            {address || NO_LOCATION_LABEL}
          </span>
          <span aria-hidden="true" className="text-gray-300">·</span>
          {/* 🕒 ОГНОО — харьцангуу (`timeAgo` — карт дээрхтэй ЯГ ижил) */}
          <span title="Нийтэлсэн огноо" className="whitespace-nowrap">🕒 {timeAgo(listing.created_at)}</span>
          <span aria-hidden="true" className="text-gray-300">·</span>
          {/* 👁 ҮЗСЭН — icon + тоо (🆕 (97): галерейн footer-оос энэ мөрөнд шилжив;
              жишиг сайтын хэвээр зөвхөн тоо — «37 үзсэн» БИШ «37») ✓ */}
          <span title="Энэ зарыг хэдэн хүн үзсэн" className="inline-flex items-center gap-1 font-semibold tabular-nums text-gray-600">
            <EyeIcon className="h-[18px] w-[18px] text-gray-700" />
            {viewCount}
          </span>
          <span aria-hidden="true" className="text-gray-300">·</span>
          {/* 🆔 ID — 🆕 (97): ⏳ «Зарын дугаар:» → «ID:» (жишиг сайтын хэв: «ID: 10801626») */}
          <span title={`Зарын дугаар — бүтэн ID: ${listing.id}`} className="whitespace-nowrap">
            ID: <span className="font-mono font-semibold text-gray-600">{shortId}</span>
          </span>

          {/* ❤️ ТААЛАГДСАН · 🔗 ХУВААЛЦАХ — мөрийн БАРУУН захад (🆕 (97), pill товч)
              ⚠️ Дараалал: эхлээд ❤️ таалагдсан, дараа нь 🔗 Хуваалцах ✓ */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              data-fav-toggle
              onClick={() => toggleFavorite(listing.id)}
              aria-label={isFav ? 'Таалагдсан жагсаалтаас хасах' : 'Таалагдсан жагсаалтад нэмэх'}
              title={isFav ? 'Таалагдсанаас хасах' : 'Надад таалагдсан'}
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 font-semibold tabular-nums text-gray-700 transition hover:border-red-200 hover:text-red-600 ${
                isFav ? 'text-red-600' : ''
              }`}
            >
              {isFav ? '❤️' : '🤍'} {likeCount}
            </button>
            {/* ⚠️ `ShareButton` нь одоогийн хуудасны URL-ыг clipboard-д хуулна ✓ */}
            <ShareButton className="hover:border-primary/40" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        {/* ===== ЗҮҮН БАГАНА ===== */}
        <div className="min-w-0">
          {/* Gallery */}
          {/* ===== 🖼 ГАЛЕРЕЙ — ХАЙРЦАГГҮЙ (🆕 2026-10-09 (87)) =====
              хэрэглэгчийн хүсэлт: «бүх саарал өнгийг үгүй хий» ⇒ ⏳ (83)-ийн
              `border border-gray-200 bg-gray-100` ХАСАГДАВ — цагаан дэвсгэр дээр
              зөвхөн ЗУРАГ (`rounded-xl`) үлдэв (картын хэвтэй ЯГ ИЖИЛ ✓) */}
          <div className="overflow-hidden rounded-xl">
            <div className="relative">
              {/* ⚠️ ЗУРАГ дээр «таалагдсан/үзсэн» тэмдэглээ БАЙХГҮЙ (карттай ижил).
                  👁/❤️ тоо ба ❤️/🤍 toggle нь доорх FB-style footer мөрөнд. */}
              {images.length ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images[active]} alt={typeLabel} className="h-[280px] w-full object-cover sm:h-[440px]" />
                  {images.length > 1 && (
                    <>
                      <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                        {active + 1} / {images.length}
                      </span>
                      <button
                        type="button"
                        aria-label="Өмнөх зураг"
                        onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg leading-none shadow-card transition hover:bg-white"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        aria-label="Дараагийн зураг"
                        onClick={() => setActive((i) => (i + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg leading-none shadow-card transition hover:bg-white"
                      >
                        ›
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-[280px] w-full items-center justify-center text-7xl">
                  {getPropertyIcon(listing.property_type, listing.section)}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pt-3">
                {images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt=""
                    onClick={() => setActive(i)}
                    className={`h-14 w-[72px] shrink-0 cursor-pointer rounded-lg border-2 object-cover transition ${
                      i === active ? 'border-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* 🗑 (97) «FB-style POST FOOTER» (👁 үзсэн / ❤️ таалагдсан / 🔗
                Хуваалцах) ЭНДЭЭС БҮРЭН ХАСАГДАВ — тэдгээр нь ОДОО дээрх ТОЛГОЙН
                мета мөрөнд (`<header>` → `[data-listing-meta][data-listing-actions]`),
                жишиг сайтын дэлгэрэнгүй хуудасны хэвээр ✓
                ⚠️ `data-listing-actions` selector толгойн мөрөнд ХЭВЭЭР
                   (CDP/тестийн тогтвортой дэгээ) ✓ */}
          </div>

          {/* ===== 🎥 ВИДЕО (YouTube) =====
              ⚠️ iframe нь ЗӨВХӨН хэрэглэгч дарсны дараа ачаалагдана:
                 • хурдан (эхэнд YouTube-ийн 1MB+ script татахгүй)
                 • нууцлал (дартал YouTube cookie тавихгүй) */}
          {video.ok && (
            <section className="mt-6 border-t border-gray-200 pt-6">
              <h2 className="mb-4 text-base font-semibold text-gray-800">
                🎥 Видео
              </h2>
              <div>
                {videoPlaying ? (
                  <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                    <iframe
                      src={`${video.embedUrl}&autoplay=1`}
                      title="Зарын видео"
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setVideoPlaying(true)}
                    className="group relative block w-full overflow-hidden rounded-lg bg-black"
                    title="Видеог тоглуулах"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={video.thumbUrl}
                      alt="Зарын видео"
                      loading="lazy"
                      className="aspect-video w-full object-cover opacity-75 transition duration-300 group-hover:scale-[1.02] group-hover:opacity-95"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-2xl shadow-card-hover transition group-hover:scale-110">
                        ▶️
                      </span>
                    </span>
                  </button>
                )}
                <p className="mt-2 text-[12px] text-gray-500">
                  Видео нь YouTube-ээс ачаалагдана ·{' '}
                  <a
                    href={video.watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-primary hover:underline"
                  >
                    YouTube дээр нээх ↗
                  </a>
                </p>
              </div>
            </section>
          )}

          {/* ===== ШИНЖ ЧАНАР — <section data-component="AdvertFeaturesApp"> хэсэгтэй ижил загвар =====
              ⚠️ `mt-6` — карт хоорондын зай (видео/Тайлбар хэсгүүдтэй ЯГ ижил) ✓
              ⚠️ `features.length > 0` — хоосон («Зарын дэлгэрэнгүй» гэсэн гарчиг
                 дангаараа харагдах) карт ГАРАХГҮЙ (2026-10-01). Шалтгаан: хаяг
                 нь хүснэгтээс хасагдсанаар шинж чанаргүй зар дээр карт ХООСОН
                 болсон ✗. `&&` дүрэм нь «Тайлбар» хэсэгтэй ЯГ ижил
                 (`listing.description &&`) ✓
              🆕 2026-10-01 (16): машин/ажил/компьютер … зарууд ч мөртэй болов
                 (`features`-д `attrs` нэмэгдэв — `lib/locationData.js → getAttrRows`)
                 → тэдгээр дэлгэрэнгүй хуудсанд ч ЭНЭ 2 БАГАНАТ хүснэгт гарна ✓
              ⚠️ ХҮРЭЭНИЙ ДҮРЭМ (`sm:` = 2 багана): сүүлийн МӨРИЙН 2 нүд доод
                 хүрээгээ алдана. Мөр дүүрэн бол (`features.length % 2 === 0`)
                 тэр нь `:nth-last-child(-n+2)`; гэхдээ СОНДГОЙ тоо (ж: 🚗 9 мөр)
                 үед 8 дахь (зүүн багана) нь 9 дэхтэй НЭГ МӨРӨНД байдаг тул
                 зөвхөн `:last-child`-д хүрээ үлдэхгүй байх ЁСТОЙ — эс бөгөөс
                 мөр дунд ганц 1px зураас үлдэнэ ✗ (2026-10-01 (16)-д зассан) */}    
          {features.length > 0 && (
            <section data-component="AdvertFeaturesApp" className="mt-6 border-t border-gray-200 pt-6">
              <h2 className="mb-2 text-base font-semibold text-gray-800">Зарын дэлгэрэнгүй</h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2">
                {features.map((f) => (
                  <div
                    key={f.key || f.label}
                    className={`flex items-baseline gap-3 border-b border-gray-200 py-3 text-sm last:border-b-0 ${
                      features.length % 2 === 0 ? 'sm:[&:nth-last-child(-n+2)]:border-b-0' : 'sm:[&:last-child]:border-b-0'
                    }`}
                  >
                    {/* 🆕 (96): ⏳ `{f.icon} {f.label}` → **`{f.label}`** — БҮХ icon
                        ХАСАГДАВ (хэрэглэгчийн хүсэлт: «🏷️ Үйлдвэрлэгч: гэх мэтийн
                        бүх icon ийг байхгүй болго, хэрэггүй» ✓).
                        ⚠️ `getAttrRows`-ийн `icon` утга (форм/шүүлтийн нэг эх
                        сурвалж — `attrFields`) ХӨНДӨӨГДӨӨГҮЙ, зөвхөн ЭНД
                        дүрслэгдэхгүй ✓ (форм/сайдбарын чип иконууд ХЭВЭЭР) */}
                    <dt className="w-[45%] shrink-0 text-gray-500">{f.label}:</dt>
                    <dd className="min-w-0 flex-1 font-medium text-gray-900">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {/* ===== ТАЙЛБАР ===== */}
          {listing.description && (
            <section className="mt-6 border-t border-gray-200 pt-6">
              <h2 className="mb-4 text-base font-semibold text-gray-800">Тайлбар</h2>
              {/* 🆕 2026-10-08 (61) — ХЭРЭГЛЭГЧИЙН ГОМДОЛ: «Тайлбарын урт
                  текст хайрцгаас хэтэрч гардаг» ⇒ `break-words` (`overflow-wrap:
                  break-word`): ЗАЙГҮЙ урт үг (линк, `ыбөыбө…` мэт дараалсан үсэг)
                  ч гэсэн хайрцгийн өргөнд ХУВААГДАНА ✓
                  ⚠️ CDP хэмжилт (1280px, `🥚 ыбөыбө…` 892 тэмдэгт үгтэй зар):
                     өмнө нь `<p>`-ээс **6856px** хэтэрч, ХУУДАСНЫ хэвтээ гүйлт
                     **6418px** байв ✗ → одоо 0 ✓
                  ⚠️ `whitespace-pre-line` ХӨНДӨӨГДӨӨГҮЙ (мөр таслалт хэвээр) */}
              <p className="whitespace-pre-line break-words text-[15px] leading-[1.8] text-gray-600">{listing.description}</p>
            </section>
          )}

          {/* ===== 🗺 ЗАРЫН ДЭД БАЙРШИЛ (жишиг сайт хэв, 2026-10-07) =====
              ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «газрын зургийг байж Жишиг сайт шиг
                 харуулдаг байя, Бүх зар дээр» ⇒ газрын зураг нь БҮХ зарт,
                 ҮНДСЭН БАГАНАД (галерей/шинж/тайлбарын дараа), «Зарын дэд
                 байршил: <хаяг>» гарчгийн дор гарна ✓
              ⚠️ Урьд нь газрын зураг нь БАРУУН баганад, зөвхөн солбицолтой үед
                 гардаг байв (`listing.latitude && listing.longitude`) — тэр нь
                 ХАСАГДАВ ✗ (одоо зөвхөн ЭНД, нэг л газар гаргана ✓)
              ⚠️ Төв нь `mapPoint` (`mapCenterFor` — солбицолгүй зар ч хороо/
                 дүүрэг/хотын төв рүү буулгана) ✓ */}
          <section data-component="ListingMap" className="mt-6 border-t border-gray-200 pt-6">
            <h2 className="mb-3 text-base font-semibold text-gray-800">
              Байршил:{' '}
              <span className="font-normal text-gray-500">{address || NO_LOCATION_LABEL}</span>
            </h2>
            <div className="h-[320px] w-full overflow-hidden rounded-xl">
              <MapView listings={[mapListing]} />
            </div>
          </section>
        </div>

        {/* ===== БАРУУН БАГАНА (ХОЛБОО БАРИХ) ===== */}
        <aside className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          {/* ===== 🎨 ХОЛБОО БАРИХ ХАЙРЦАГ (🆕 2026-10-09 (87)) =====
              ⏳ (83)-ийн `bg-gray-100` → **`bg-white`** + `shadow-card` ХАСАГДАВ:
              хэрэглэгчийн хүсэлт «бүх саарал өнгийг үгүй хий» ⇒ зөвхөн 1px
              цайвар хүрээ (`border-gray-200`) үлдэж, хайрцаг нь ЦАГААН болов
              (жишиг сайтын баруун баганын хайрцагтай ЯГ ИЖИЛ ✓) */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
            {/* 🆕 2026-10-06 (хэрэглэгчийн хүсэлт): үнэ нь ТОВЧ форматтай —
                «760 сая ₮», «44.8 сая ₮» (`shortPriceLabel`; «₮» нь ТӨГСГӨЛД).
                ⚠️ `text-3xl font-bold text-primary` ХӨНДӨӨГДӨӨГҮЙ ✓ */}
            <div className="text-3xl font-bold text-primary">{shortPriceLabel(listing)}</div>
            {/* 🤝 «Үнэ тохирно» — үнийн ЯГ ДОР (2026-09-29, хэрэглэгчийн
                хүсэлт): үнэ БИЧСЭН + тэмдэглэсэн үед л гарна ✓ (үнэгүй үед
                дээрх мөр өөрөө «Үнэ тохирно» тул давхардахгүй) */}
            {negotiableNote(listing) && (
              <div className="mt-1 text-[13px] font-semibold text-amber-700">
                🤝 {negotiableNote(listing)}
              </div>
            )}
            {/* 🔄 «Солино» (2026-10-09) — 🤝 «Үнэ тохирно»-гийн ЯГ ДООР (ижил
                хэв). Хэрэглэгчийн хүсэлт нь форм ☑ + хайлтын чип байсан ч
                шүүлтээр олдсон зарын саналыг ЭНД харна — тэмдэглээгүй зарууд
                дээр мөр ОГТ ГАРАХГҮЙ (`lib/swapFilter.mjs → swapLabel` ✓) */}
            {swapLabel(listing) && (
              <div className="mt-1 text-[13px] font-semibold text-emerald-700">
                {SWAP_ICON} {swapLabel(listing)}
              </div>
            )}
            {/* ⚠️ `price_type` («нийт» / «сард» / «м²») ЭНД ХАРАГДАХГҮЙ —
                зөвхөн үнэ (бүх UI дээр нэгэн жигд хассан). */}

            <div className="mt-5 space-y-3">
              {listing.user_id ? (
 /* ===== ЗАР НИЙТЛЭГЧ РҮҮ ОРОХ (линк) =====
                   Дарвал `/sellers/<user_id>` — түүний БУСАД зарууд
                   «🏷️ Зарах» / «🔑 Түрээслэх» гэж ЯЛГАГДАН харагдана.
                   ⚠️ 2026-10-08 (62): хүрээ нь ОДОО `<div>` — дотор нь 2 ЛИНК
                   байна (HTML-д `<a>` дотор `<a>` ХОРИОТОЙ): ① толгой мөр
                   (аватар + нэр → `/sellers/<id>`) ② «📋 {N} идэвхтэй зар».
                   ⚠️ `group` + `hover:bg-primary-light` нь ХҮРЭЭ (`<div>`) дээр
                   үлдсэн тул КАРТЫН харагдац ХӨНДӨӨГДӨӨГҮЙ ✓
                   🆕 2026-10-08 (64): толгойн линк нь ОДОО ГОЛЛУУЛСАН
                   БАГАНА (`flex flex-col items-center`) — профайл зураг
                   картын дээд талд, нэр/✅/огноо доор нь; «›» нь баруун дээд
                   буланд (`absolute right-0 top-0`) — 2 линк ЗЭРЭГЦЭЭ хэвээр ✓
                   🆕 2026-10-08 (66): профайл зурагны хэмжээ `64` → **`96px`**
                   (хэрэглэгчийн хүсэлт: «жаахан томруулаад өгөөч») — аватар нь
                   ОДОО өөрийн гэсэн мөрөнд байгаа тул КАРТЫН өргөн хөндөгдөхгүй
                   (300px хэвээр), зөвхөн өндөр нь **176 → 208px** болов;
                   ⚠️ `size={120}` л хэт том (350px баганад багтахгүй) ✓ */
                <div className="group rounded-lg p-3 transition hover:bg-primary-light">
                  <Link
                    href={`/sellers/${listing.user_id}`}
                    title="Энэ хүний бусад зарыг харах"
                    className="relative flex flex-col items-center gap-2 text-center"
                  >
                    {/* 🆕 2026-10-08 (64) — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Зарын эзэний Profile зургийг
                        картых нь дээд талд, жаахан томруулаад тавиад өгөөч» ⇒
                        Аватар нь картын ХАМГИЙН ДЭЭД талд, ТУСДАА мөрөнд (нэр,
                        ✅, огноо нь ДООР нь), ГОЛЛУУЛЖ + `size={44}` → `size={64}`
                        (жаахан том — ⚠️ (61)-ийн 120px шиг хэт том БИШ) ⇒
                        профайл карт шиг харагдац болов ✓
                        🆕 (66): «жаахан том» хэмжээ нь ОДОО **`size={96}`**
                        (хэрэглэгчийн хүсэлт: «жаахан томруулаад өгөөч») —
                        аватар нь тусдаа мөрөнд тул картын ЗАДАРГАА ХОХИРОХГҮЙ:
                        CDP хэмжилт 96px дээр карт 300×176 → **300×208px**,
                        📱 390px дээр 316×208, гадагш гарсан элемент **0**,
                        хэвтээ гүйлт **0** ✓ (⚠️ `size={120}` ХЭВЭЭР ХОРИОТОЙ)
                        ⏳ (61) — ХЭРЭГЛЭГЧИЙН ГОМДОЛ: «Зар нийтлэгчийн мэдээлэл
                        карт дотроо бүрэн харагдахгүй байна» ⇒ `size={120}`
                        (2026-09-27-ны андуу орсон утга — тухайн commit нь КАРТЫН
                        өндрийн тухай байв) нь 350px-ийн баганад багтахгүй, баруун
                        талын мэдээллийг 3-4 мөрөөр эвдэж байв ✗ (CDP: аватар 120px,
                        мөр 144px өндөр, «✅ Утсаар баталгаажсан»/«Элссэн огноо» 2 мөр
                        болж тасарч байв) ⇒ `size={44}` болов ✓
                        ⚠️ Нэр нь `truncate` БИШ `break-words` — урт нэр КАРТ ДОТРОО
                        бүтнээрээ (2 мөр болж ч) харагдана ✓
                        🆕 2026-10-08 (71): `src={sellerAvatar}` — «Профайл нэрээ
                        зар дээр гаргах уу? → Үгүй» үед `null` тул профайл зураг
                        ГАРАХГҮЙ (зөвхөн үсэг-орлуулга ✓) */}
                    <Avatar src={sellerAvatar} name={sellerName} size={96} />
                    <div className="w-full min-w-0">
                      {/* ✅ БАТАЛГААЖСАН badge (Facebook-ийнх шиг) — ListingCard-тай
                          ижил. ⚠️ Зөвхөн `listing.user_id` БАЙГАА үед (энэ салбар)
                          — эс бөгөөс нийтлэгч тодорхойгүй тул badge ч байхгүй ✓ */}
                      <div className="flex items-center justify-center gap-1.5 text-base font-semibold text-gray-800 transition group-hover:text-primary">
                        <span className="min-w-0 break-words">{sellerName}</span>
                        <VerifiedBadge size={16} className="text-primary" />
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-x-2 text-xs text-gray-500">
                      {/* ✅ Утсаар баталгаажсан — БҮРТГЭЛ нь verify.mn-ийн SMS-ээр
                            л болдог тул бүх хэрэглэгч баталгаажсан  (олон сонголттой
                            «Verified account»-тай ижил утга). */}
                        <span className="font-semibold text-secondary-dark">✅ Утсаар баталгаажсан</span>
                        {joinedText && <span>· Элссэн огноо: {joinedText}</span>}
                      </div>
                      {/* ⏳ 2026-10-08 (62): «📋 {N} зар нийтэлсэн» мөр ЭНД БАЙСАН —
                          одоо толгойн линкээс ГАДНА, ТУСДАА ЛИНК болж (доор) ✓ */}
                    </div>
                    <span aria-hidden="true" className="absolute right-0 top-0 text-lg text-gray-300 transition group-hover:text-primary">›</span>
                  </Link>
                {/* 🆕 2026-10-08 (62) — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «…“Зарын тоо зар нийтэлсэн”
                    гэж харагдаж байгаа. Энэ хэсгийг нь Link болгож харагдуул. Гэхдээ
                    текстийг нь “Зарын тоо идвэхтэй зар” гэж зас. Карыг нь тэр чигээр нь
                    link болгож харагдуулахгүй» ⇒
                    ① «Зарын тоо» мөр нь ТУСДАА ЛИНК болов — линк шиг ХАРАГДАНА
                       (⏳ өмнө нь саарал энгийн текст байсан тул линк гэдэг нь
                       мэдэгддэггүй байв ✗): `text-primary` + `underline
                       underline-offset-2` — репогийн бусад текст линктэй ЯГ ИЖИЛ хэв
                       (`FavoritesClient`/`SavedSearchesClient`/`SearchHistoryClient`) ✓
                    ② текст: «📋 {N} зар нийтэлсэн» → «📋 {N} идэвхтэй зар»
                       ⏳ (62)-т «Зарын тоо:» гэсэн УГТВАРТАЙ байсан — (63) угтвар ХАСАГДАВ
                       (хэрэглэгч: «“Зарын тоо:” гэж текст гаргахгүй ээ, зүгээр л зарын тоогоо бич») ✓
                       (⚠️ `listings`-д «идэвхгүй» гэсэн төлөв/`status` БАГАНА БАЙХГҮЙ
                       — `0001_schema.sql`: бүх мөр нь нийтлэгдсэн, ИДЭВХТЭЙ зар ⇒ тоо нь
                       ЯГ зөв ✓)
                    ③ КАРТ (толгой мөр) ХӨНДӨӨГДӨӨГҮЙ — линк шиг харагдах нь ЗӨВХӨН
                       энэ мөр ✓ (`hover:bg-primary-light` нь хүрээ дээр үлдсэн)
                    ⚠️ HTML-д `<a>` дотор `<a>` ХОРИОТОЙ тул дээрх толгойн линкээс
                    ГАДНА (ах дүү элемент) байрлана — тиймээс хүрээ нь `<div>` болов ✓
                    🆕 (64): «📋 N идэвхтэй зар» линк нь ОДОО КАРТЫН ГОЛД
                    (`justify-center`) — аватар/нэр голлуулсан тул задаргаа ч
                    тэгш харагдана ✓ (линк өөрөө, өнгө/зураас/`href`/`title`
                    ХӨНДӨӨГДӨӨГҮЙ) ✓
                    🔍 Хайх үг: sellerStatsLink, идэвхтэй зар */}
                <Link
                  href={`/sellers/${listing.user_id}`}
                  title="Энэ хүний БҮХ идэвхтэй зарыг харах"
                  className="mt-2 flex max-w-full flex-wrap items-center justify-center gap-x-2 text-xs font-semibold text-primary underline underline-offset-2 hover:text-primary"
                >
                  {sellerStats && sellerStats.total > 0 ? (
                    <>
                      <span>📋 {sellerStats.total} идэвхтэй зар</span>
                      {sellerStats.sell > 0 && <span className="font-semibold text-primary">🏷️ {sellerStats.sell}</span>}
                      {sellerStats.rent > 0 && <span className="font-semibold text-secondary-dark">🔑 {sellerStats.rent}</span>}
                    </>
                  ) : (
                    <span>📋 идэвхтэй зар</span>
                  )}
                </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-lg p-3 text-center">
                  <Avatar src={sellerAvatar} name={sellerName} size={96} />
                  <div className="w-full min-w-0">
                    {/* 🆕 2026-10-08 (61): нэр `truncate` БИШ `break-words` —
                        дээрх (`user_id`-тай) салбартай ИЖИЛ: урт нэр карт дотроо
                        бүтнээрээ харагдана ✓ */}
                    <div className="break-words text-base font-semibold text-gray-800">
                      {sellerName}
                    </div>
                    <div className="text-xs text-gray-500">Зар нийтэлсэн</div>
                  </div>
                </div>
              )}

              {listing.phone && (
                phoneShown ? (
                  /* ⚠️ ДУГААР ХАРАГДСАН үед: зүүн тал нь `tel:` холбоос
                     (залгах ✓), баруун талд нь 📋 COPY товч (2026-09-29,
                     хэрэглэгчийн хүсэлт: «утасны дугаарын ард хэсэгт copy
                     хийж авах боломжтой symbol») ✓
                     ⚠️ `<a>` дотор `<button>` ХИЙХГҮЙ (HTML-д хориотой) —
                        тиймээс хоёр нь ЗЭРЭГЦЭЭ ах дүү элемент болно ✓ */
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:+976${phoneDigits}`}
                      className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-80"
                      title="Залгах"
                    >
                      <span className="text-2xl">📱</span>
                      <div className="truncate text-base font-semibold text-primary">{listing.phone}</div>
                    </a>
                    <CopyButton
                      value={listing.phone}
                      size="lg"
                      label="Утасны дугаарыг хуулах"
                      toastMsg="📋 Утасны дугаар хуулагдлаа"
                    />
                  </div>
                ) : (
                  <button type="button" className="btn btn-primary w-full" onClick={() => setPhoneShown(true)}>
                    📞 Дугаар харах
                  </button>
                )
              )}

              {/* ===== ✉️ «МЕССЕЖ БИЧИХ» (2026-09-28) =====
                  ⚠️ Утасны ДООР — «дугаар харах» нь гол үйлдэл (btn-primary)
                     хэвээр, мессеж нь хоёрдогч (btn-outline) ✓
                  ⚠️ Яриа нь `listing_id`-тай холбогдож, гарчиг нь `listingLabel`
                     — дараа нь `/messages` дотор «🏷️ …» гэж харагдана ✓ */}
              {canShowMessage && (
                <MessageButton
                  sellerId={listing.user_id}
                  listingId={listing.id}
                  listingTitle={listingLabel}
                  className="btn btn-outline w-full"
                />
              )}
            </div>

            {/* ===== ⚠️ ГОМДОЛ — «Зар дээр ямар нэг зүйл буруу байна» =====
                Хэрэглэгч тухайн зарын талаар админд гомдол илгээнэ
                (feedback → category='complaint' + listing_id). */}
            <ReportListingModal listing={listing} />
          </div>

          {/* ===== 🏦 ИПОТЕКИЙН ТООЦООЛУУР (зөвхөн ҮЛ ХӨДЛӨХ «зарах» зарт) =====
              ⚠️ `details/summary` — ЭВХЭГДДЭГ ба **АНХДАГЧААР ХААЛТТАЙ**.
                 Хэрэглэгч өөрөө хүсвэл дарж нээнэ (opt-in).
                 ⚠️ УРЬД НЬ `open` атрибуттай байсан → байр үзэхээр ороход
                    тооцоолуур ШУУД БААГААД гарч ирдэг байв (хүчээр).
                 ⚠️ Зээлийн тооцоолол зөвхөн үл хөдлөхийн «зарах» зарт утга
                    учиртай — машин/ажлын зарт ГАРАХГҮЙ (`isRealEstate` ✓). */}
          {isRealEstate && isSell && (
            <details className="group overflow-hidden rounded-xl border border-gray-200 bg-white">
              <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-2 px-5 py-3.5 text-[14px] font-semibold text-gray-700 transition hover:text-primary [&::-webkit-details-marker]:hidden">
                <span>🏦 Ипотекийн тооцоолуур</span>
                <span className="flex items-center gap-1.5 text-[12px] font-normal text-gray-400">
                  <span aria-hidden="true" className="transition-transform duration-200 group-open:rotate-180">▼</span>
                </span>
              </summary>
              <div className="border-t border-gray-200 p-4">
                <MortgageCalculator defaultPrice={Number(listing.price) || 0} compact />
              </div>
            </details>
          )}

          {/* 🗺 ГАЗРЫН ЗУРАГ 2026-10-07-нд БАРУУН баганаас ХАСАГДАВ — одоо
              ҮНДСЭН БАГАНАД («Зарын дэд байршил» гарчигтай), БҮХ зарт гарна ✓ */}
        </aside>
      </div>

      {/* ===== 🔎 ТӨСТЭЙ ЗАРУУД (2026-10-09 (79)) =====
          ⚠️ Хоёр баганын grid-ийн ГАДНА (page-container дотор) — ингэснээр
             БҮТЭН ӨРГӨНТЭЙ, доор нь баганат grid-ээр харагдана ✓
          ⚠️ Олдоогүй/ачаалж байгаа үед компонент нь `null` буцаана —
             хоосон хайрцаг ГАРАХГҮЙ ✓ */}
      <SimilarListings listing={listing} />
    </div>
  );
}
