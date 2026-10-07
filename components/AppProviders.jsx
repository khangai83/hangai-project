'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabase } from '../lib/supabaseClient';
import { fetchProfile, upsertProfile } from '../lib/queries';
import { normalizePhone } from '../lib/format';
import { fetchAdminMe } from '../lib/adminApi';
import { useFavorites } from '../lib/favorites';
import { useUnreadMessages } from '../lib/messagesClient';
import phoneEmail from '../lib/phoneEmail';
// 🎯 АНГИЛАЛ УРЬДЧИЛАН БӨГЛӨХ (2026-10-06) — хэрэглэгч аль ангилалд явж
//    байсныг URL-ээс уншиж `/listings/new?section=…&type=…` руу шилжүүлнэ ✓
import { listingPrefillFromSearch, newListingHref } from '../lib/listingPrefill.mjs';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';
import MessageIcon from './MessageIcon';
import { HeartIcon, ChatIcon, ClockIcon } from './HeaderIcons';

/** Supabase-ийн user → '+976XXXXXXXX' (эсвэл null).
 *  Гурван эх сурвалжаас дарааллаар нь хайна:
 *    1) u.phone            — Phone provider-ээр бүртгэсэн хэрэглэгч
 *    2) user_metadata.phone — дотоод имэйлээр (fallback) бүртгэсэн хэрэглэгч
 *    3) имэйлээс           — '88093663@phone.zarmn.mn' → '+97688093663'
 *  Ингэснээр аль ч замаар бүртгэгдсэн хэрэглэгчийн утас олдоно. */
function resolveUserPhone(u) {
  if (!u) return null;
  return u.phone || (u.user_metadata && u.user_metadata.phone) || phoneEmail.emailToPhone(u.email) || null;
}

/** Supabase-ийн англи алдааг хэрэглэгчид ойлгомжтой Монгол мессеж болгох */
function friendlySignInError(error) {
  const msg = `${(error && error.code) || ''} ${(error && error.message) || ''}`.toLowerCase();
  // 🚫 Блоклогдсон (бан) — админ хэрэглэгчийг «block» хийсэн (0038_user_blocks.sql)
  if (msg.includes('banned') || msg.includes('user_banned')) {
    return 'Таны бүртгэл блоклогдсон байна. Дэлгэрэнгүйг админаас тодруулна уу.';
  }
  if (msg.includes('invalid login') || msg.includes('invalid_credentials')) {
    return 'Утасны дугаар эсвэл нууц үг буруу байна.';
  }
  if (msg.includes('phone') && msg.includes('confirm')) {
    return 'Утасны дугаар баталгаажаагүй байна. Дахин бүртгүүлнэ үү.';
  }
  if (msg.includes('disabled') || msg.includes('not enabled')) {
    return 'Supabase дээр Phone provider идэвхгүй байна (Dashboard → Authentication → Providers → Phone).';
  }
  return (error && error.message) || 'Нэвтрэхэд алдаа гарлаа.';
}

// ---------------- Contexts ----------------
const AuthContext = createContext(null);
const ToastContext = createContext(null);
const UIContext = createContext(null);
/* 🖥🆕 «ХАЙЛТ ТОЛГОЙН МӨРӨНД» — header-ийн ГОЛ хэсгийн ЗАВСАР (2026-10-04 (27)).
   Хэрэглэгчийн хүсэлт (жишээ зурагтай): «хайлт хэсгийн вэб дээд хэсэгт болгож
   өөрчил» — хайлтын мөр нь лого ба баруун товчнуудын ДУНД (толгойн мөрөнд)
   гарна ✓. ⚠️ Хайлтын мөр нь HomeClient-ийн төлөвт (section/search/filters)
   холбогдсон тул AppProviders нь зөвхөн БАЙР (slot) өгнө — агуулгыг ХУУДАС
   өөрөө `useHeaderSlot().setHeaderSlot(<HeaderSearchBar …/>)`-аар дүүргэнэ
   (нэг эх сурвалж, h2 header хэвээр ✓) */
const HeaderSlotContext = createContext(null);

// ---------------- Hooks ----------------
export function useAuth() { return useContext(AuthContext); }
export function useToast() { return useContext(ToastContext); }
export function useUI() { return useContext(UIContext); }
/** 🖥 header-ийн гол хэсэгт агуулга (нүүр хуудасны хайлтын мөр) оруулах дэгээ ✓ */
export function useHeaderSlot() { return useContext(HeaderSlotContext); }

// ============================================================
// AppProviders — auth, toast, modal удирдлагыг нэгтгэн,
// header + footer + modals-ыг бусад хуудасны гадна талд харуулна
// ============================================================
export default function AppProviders({ children }) {
  const [user, setUser] = useState(null);          // { id, phone }
  const [profileName, setProfileName] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [authOpen, setAuthOpen] = useState(false);
  // 🪜 «Зар нэмэх / засах» нь ОДОО ТУСДАА ХУУДАС (`/listings/new`) — модал
  //    төлөв (`addOpen`/`editTarget`) ХҮЧИНГҮЙ болсон тул ХАСАГДАВ ✓
  const favoriteIds = useFavorites(); // ❤️ таалагдсан зарууд (localStorage)
  // ✉️ Уншаагүй мессежийн тоо — nav-ийн badge (60с тутам + focus/event дээр ✓)
  //    ⚠️ Миграц (0020) ороогүй бол `0` — апп эвдрэхгүй ✓ (queries.js-ийн graceful)
  const unreadMessages = useUnreadMessages(user ? user.id : null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // 📱 2026-09-27 (хэрэглэгчийн хүсэлт): мобайл доод навигацийн «👤 Профайл»
  //    товч нь доод хуудас (bottom sheet) нээнэ — desktop dropdown-той ИЖИЛ зүйлс ✓
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); // 👤 Профайл засах модал
  const [dataVersion, setDataVersion] = useState(0); // зарын шинэчлэлт дохио
  const [isAdmin, setIsAdmin] = useState(false); // app_metadata.is_admin
  // 📱 2026-09-29 (Facebook-маягийн доод цэс): одоогийн зам → ИДЭВХТЭЙ таб ✓
  //    ⚠️ Энэ нь App Router-ийн client hook — Next-ийн `<Link>`-ээр шилжих
  //       БҮРД дахин рендер хийгдэж, «pill» зөв таб руу шууд шилжинэ ✓
  //       (бүтэн хуудас дахин ачаалагдахгүй — Layout нь хэвээр үлдэнэ ✓)
  const pathname = usePathname();
  const router = useRouter();

  const sb = getSupabase();

  // ---------- Toast ----------
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  // ---------- Auth session ----------
  useEffect(() => {
    if (!sb) { setAuthLoading(false); return; }
    let active = true;
    const refresh = async (u) => {
      if (u) {
        const p = await fetchProfile(u.id);
        if (active) {
          setUser({ id: u.id, phone: resolveUserPhone(u) });
          setProfileName(p?.name || null);
        }
      } else if (active) {
        setUser(null);
        setProfileName(null);
      }
      if (active) setAuthLoading(false);
    };
    sb.auth.getSession().then(({ data }) => refresh(data?.session?.user || null));
    const { data: sub } = sb.auth.onAuthStateChange((_evt, session) => refresh(session?.user || null));
    return () => { active = false; sub?.subscription.unsubscribe(); };
  }, [sb]);

  // ---------- Админ эрх (app_metadata.is_admin → header дээр «🛠 Админ» цэс) ----------
  const userId = user ? user.id : null;
  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return undefined;
    }
    let active = true;
    fetchAdminMe().then((res) => {
      if (active && res.data) setIsAdmin(!!res.data.isAdmin);
    });
    return () => { active = false; };
  }, [userId]);

  // ---------- Auth actions ----------
  // Бүртгэл: нэр + утас + нууц үг → verify.mn-ээр SMS баталгаажуулалт
  // (AuthModal → /api/auth/register/*). Нэвтрэх: утас + нууц үг.
  const signIn = useCallback(async (phone, password) => {
    const client = getSupabase();
    if (!client) return { error: 'Supabase тохиргоо алга. .env.local үүсгэнэ үү.' };
    if (!password) return { error: 'Нууц үгээ оруулна уу.' };

    const normalized = normalizePhone(phone);

    // ---------- 1) Утасны (phone) provider-ээр ----------
    const first = await client.auth.signInWithPassword({ phone: normalized, password });
    if (!first.error && first.data && first.data.user) {
      setUser({ id: first.data.user.id, phone: resolveUserPhone(first.data.user) });
      return { error: null };
    }

    // ---------- 2) Phone provider идэвхгүй бол ДОТООД имэйлээр ----------
    // (бүртгэл нь дотоод имэйлээр хийгдсэн байж болно — lib/phoneEmail.js)
    const retry = await client.auth.signInWithPassword({
      email: phoneEmail.phoneToEmail(phone),
      password,
    });
    if (!retry.error && retry.data && retry.data.user) {
      const u = retry.data.user;
      setUser({ id: u.id, phone: resolveUserPhone(u) || normalized });
      return { error: null };
    }

    // Хоёулаа нурсан бол имэйл оролдлогын алдаа нь хэрэглэгчид илүү ойлгомжтой
    return { error: friendlySignInError(retry.error || first.error) };
  }, []);

  const saveName = useCallback(async (name) => {
    if (!user) return;
    try { await upsertProfile(user.id, name || null); setProfileName(name || null); } catch (e) { /* ignore */ }
  }, [user]);

  // ⚠️ 2026-09-27: `editName()` (window.prompt-оор нэр солих) УСТГАГДСАН —
  //    нэр засах нь «👤 Профайл» цонхон дотор (`Хоч нэр` талбар) нэгтгэгдсэн ✓
  //    (`saveName`/`upsertProfile` нь auth context-д хэвээр — гаднаас
  //     дуудаж болно, гэхдээ UI-д тусдаа цэсийн зүйл байхгүй.)

  const logout = useCallback(async () => {
    const client = getSupabase();
    if (client) await client.auth.signOut();
    setUser(null); setProfileName(null); setUserMenuOpen(false);
    showToast('Амжилттай гарлаа');
  }, [showToast]);

  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  // 🪜 «Зар нэмэх» нь ОДОО ТУСДАА ХУУДАС (`/listings/new`) — модал БИШ.
  //    ⚠️ Ингэснээр хэрэглэгч хаана явж байгаа нь URL + breadcrumb + алхмаар
  //    тодорхой харагдана ✓ (модал дотор байсан үед мэдэгдэхгүй байв)
  // 🎯 АНГИЛАЛ УРЬДЧИЛАН БӨГЛӨХ (2026-10-06, хэрэглэгчийн хүсэлт: «Зар нэмэхээ
  //    дархад Энэ ангилал нь сонгогдсон эхэлдэг байвал сайхан юм шиг санагдаж
  //    байна») — товч дарах мөчид БРАУЗЕРЫН одоогийн URL-ийн шүүлтийг
  //    (`?section=services&type=Гагнуурын үйлчилгээ`) уншиж, ангилалыг форм руу
  //    дамжуулна ⇒ форм «Бүх зар › Ажил, Үйлчилгээ › … › Гагнуурын үйлчилгээ»
  //    замаар сонгогдсон байдлаар нээгдэнэ ✓
  //    ⚠️ `useSearchParams()` БИШ `window.location.search` — учир нь энэ
  //    context нь БҮХ хуудсанд (root layout) байдаг ба `useSearchParams()`
  //    нь бүх хуудсыг dynamic болгоно ✗; `openAdd` нь ЗӨВХӨН клик дээр
  //    ажилладаг тул `window` үргэлж байна ✓
  //    ⚠️ Шүүлтгүй хуудас (`/my-listings`, зарын дэлгэрэнгүй …) дээр
  //    `listingPrefillFromSearch('')` нь `{}` буцаах тул линк ХУУЧИН хэвээр
  //    `/listings/new` ✓ (зан төлөв хөндөгдөхгүй)
  const openAdd = useCallback(() => {
    if (!user) { showToast('Эхлээд нэвтрэх шаардлагатай', 'error'); setAuthOpen(true); return; }
    const search = typeof window === 'undefined' ? '' : window.location.search;
    router.push(newListingHref(listingPrefillFromSearch(search)));
  }, [user, showToast, router]);
  // Засах горим: ижил хуудас, гэхдээ `?edit=<id>` — утгууд урьдчилан бөглөгдөнө
  const openEdit = useCallback((listing) => {
    if (!user) { showToast('Эхлээд нэвтрэх шаардлагатай', 'error'); setAuthOpen(true); return; }
    if (listing && listing.id) router.push(`/listings/new?edit=${listing.id}`);
  }, [user, showToast, router]);
  const notifyListingsChanged = useCallback(() => setDataVersion((v) => v + 1), []);

  // ---------- 👤 ХЭРЭГЛЭГЧИЙН ЦЭСНИЙ ЗҮЙЛС (нэг эх сурвалж) ----------
  // ⚠️ ЯАГААД НЭГ ГАЗАР ВЭ: цэс нь ХОЁР газарт харагдана —
  //    (1) desktop: header дахь цэсний dropdown, (2) мобайл: доод sheet.
  //    Зүйлсийг хоёр удаа бичвэл нэг нь мартагдаж (ж: шинэ админ хуудас
  //    зөвхөн desktop дээр гарна) → нэг массиваас render хийнэ ✓
  // ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): «✏️ Нэр засах» (window.prompt) зүйл
  //    УСТГАГДСАН ✓ — нэр засах нь «👤 Профайл (нэр, зураг)» цонхон ДОТОР
  //    аль хэдийн байгаа (`Хоч нэр` талбар) тул хоёр газар байх шаардлагагүй.
  // ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): «💬 Санал хүсэлт» зүйл УСТГАГДСАН ✓
  //    Шалтгаан: footer (бүх хуудсанд харагдана) дээр аль хэдийн байгаа
  //    (`AppProviders` доор, `<footer>` → `💬 Санал хүсэлт`) тул профайлын
  //    цэсэн дэх давхардал шаардлагагүй (хэрэглэгч: «сана хүсэлтийг profile
  //    аас хасаарай, доор угаасаа байна ш дээ»).
  //    ℹ️ `/feedback` хуудас ӨӨРӨӨ ХЭВЭЭР ✓ (зөвхөн цэсний холбоос хасав) —
  //    мөн админы «📨 Админ — Санал хүсэлт» (/admin/feedback) хэвээр ✓.
  const closeUserMenus = useCallback(() => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, []);

  const userMenuItems = useMemo(() => {
    const items = [
      // ⚠️ 2026-09-29: 🕓 «Саяхан үзсэн» (`/recent`) бүрэн ХАСАГДАВ
      //    (хэрэглэгчийн хүсэлт) — цэс, толгойн товч, footer-ийн холбоос,
      //    нүүр хуудасны картын мөр, `lib/recentlyViewed*.js` БҮГД хасагдав ✓
      { key: 'my-listings', label: '📋 Миний зарууд', href: '/my-listings' },
      // ✉️ Мессеж — уншаагүй байвал тоог нь хаалтанд харуулна ✓
      // ⚠️ 2026-09-29: emoji (`✉️`) БИШ — орчин үеийн SVG икон (`MessageIcon`),
      //    ингэснээр доод цэс/толгой/цэс БҮГД ижил иконтой болно ✓
      {
        key: 'messages',
        label: unreadMessages > 0 ? `Мессеж (${unreadMessages})` : 'Мессеж',
        href: '/messages',
        icon: <MessageIcon className="h-[15px] w-[15px]" />,
      },
      // 🕐 Хайлтын түүх (`/history`) — 2026-10-07. `icon` талбартай тул
      //    desktop dropdown ба мобайл доод sheet ХОЁУЛАА ижил иконтой ✓
      {
        key: 'history',
        label: '🕐 Хайлтын түүх',
        href: '/history',
        icon: <ClockIcon className="h-[15px] w-[15px]" />,
      },
    ];
    if (isAdmin) {
      items.push(
        { key: 'admin', label: '📊 Админ — Хяналтын самбар', href: '/admin', tone: 'admin' },
        { key: 'admin-listings', label: '🏷️ Админ — Зарууд', href: '/admin/listings', tone: 'admin' },
        { key: 'admin-feedback', label: '📨 Админ — Санал хүсэлт', href: '/admin/feedback', tone: 'admin' },
        { key: 'admin-users', label: '🛠 Админ — Хэрэглэгчид', href: '/admin/users', tone: 'admin' }
      );
    }
    items.push(
      {
        key: 'profile',
        label: '👤 Профайл (нэр, зураг)',
        tone: 'primary',
        onClick: () => { closeUserMenus(); setProfileOpen(true); },
      },
      { key: 'logout', label: '🚪 Гарах', onClick: () => { closeUserMenus(); logout(); } }
    );
    return items;
  }, [isAdmin, logout, closeUserMenus, unreadMessages]);

  const authValue = useMemo(() => ({ user, profileName, authLoading, signIn, saveName, logout }),
    [user, profileName, authLoading, signIn, saveName, logout]);
  const toastValue = useMemo(() => ({ showToast }), [showToast]);
  const uiValue = useMemo(
    () => ({ openAuth, openAdd, openEdit, dataVersion, notifyListingsChanged }),
    [openAuth, openAdd, openEdit, dataVersion, notifyListingsChanged]
  );

  const displayName = profileName || user?.phone || '';

  /** 🖥 header-ийн ГОЛ хэсгийн агуулга (нүүр хуудасны хайлтын мөр) — 2026-10-04 (27).
   *  ⚠️ `HomeClient` нь `useHeaderSlot().setHeaderSlot(<HeaderSearchBar …/>)`-аар
   *     дүүргэнэ; `null` үед хоосон зай — бусад хуудас ОГТ хөндөгдөхгүй ✓
   *  ⚠️ `headerSlotValue` нь `useMemo` тул дэгээ нь тогтвортой (render loop БАЙХГҮЙ ✓) */
  const [headerSlot, setHeaderSlot] = useState(null);
  const headerSlotValue = useMemo(() => ({ setHeaderSlot }), []);

  /** 📱 ИДЭВХТЭЙ таб эсэх (Facebook-маягийн доод цэс — 2026-09-29).
   *  ⚠️ `startsWith` нь ДЭД ЗАМЫГ ч хамарна: `/messages/123` дээр
   *     «✉️ Мессеж» таб идэвхтэй харагдана ✓ (`href` нь `/messages`)
   *  ⚠️ `pathname === href` эхэндээ — `/messages` ба `/messages/` хоёулаа ✓ */
  const isActive = (href) => pathname === href || (pathname || '').startsWith(`${href}/`);

  return (
    <AuthContext.Provider value={authValue}>
      <ToastContext.Provider value={toastValue}>
        <UIContext.Provider value={uiValue}>
          <HeaderSlotContext.Provider value={headerSlotValue}>
          {/* ===== HEADER =====
              ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): «Гар утасаар ороход ЛОГО-г
                 ГОЛЛУУЛЖ (төвд) харуулаарай» → мобайлд `justify-center` ✓
                 (desktop дээр `lg:justify-between` — лого зүүн, цэс баруун ✓)
              ⚠️ Баруун талын товчнууд (`➕ Зар нэмэх`, `❤️ Таалагдсан`,
                 хэрэглэгчийн цэс) нь МОБАЙЛ дээр НУУГДАЖ (`hidden lg:flex` ✓),
                 оронд нь доод навигац (`<nav>` доор) гарна ✓
                 → Ингэснээр мобайлд header нь ЗӨВХӨН лого (төвд) ✓ */} 
          <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-card">
            <div className="mx-auto flex h-16 max-w-[1536px] items-center justify-center px-4 sm:px-6 lg:justify-between">
              <Link
                href="/"
                /* ⚠️ `gap-2` ХАСАГДСАН (2026-09-27, хэрэглэгчийн гомдол: «zarlaa.mn
                   нь zarlaa .mn гэж харагдаад байх юм»).
                   ШАЛТГААН: `display: flex` дотор `gap` нь ЗӨВХӨН flex item-үүдийн
                   хооронд зай тавьдаг — «🏠 ZARLAA» текстийн зангилаа ба
                   `<span>.MN</span>` хоёр нь ТУСДАА flex item болж,
                   «ZARLAA» ба «.MN»-ийн хооронд ХИЙМЭЛ 8px зай үүсээд
                   «ZARLAA .MN» гэж уншигдаж байв ✗
                   (CDP хэмжилт: textEnd 138.6 → spanStart 146.6 = 8px).
                   ✅ Одоо зайг ЗӨВХӨН текст дотрох ASCII space («🏠 ZARLAA»)
                   өгнө — лого «🏠 ZARLAA.MN» гэж НЭГ ҮГ мэт харагдана ✓
                   ⚠️ `flex items-center` нь VERTICAL төвлөрүүлэлтэд ЗААВАЛ
                   хэрэгтэй (emoji 22px текстээс өндөр) — бүү хас.
                   ⚠️ `gap` буцааж нэмэх бол дотоод `<span>`-ыг бүхэлд нь
                   НЭГ элементээр ороох хэрэгтэй (эс бөгөөс алдаа буцаж гарна). */
                className="flex items-center text-[22px] font-bold text-primary"
                onClick={closeUserMenus}
              >
                🏠 ZARLAA<span className="text-gray-900">.MN</span>
              </Link>
              {/* ===== 🖥 ХАЙЛТЫН МӨР — header-ийн ГОЛ хэсэг (2026-10-04 (27)) =====
                  Нүүр хуудас (`HomeClient`) нь `useHeaderSlot()`-оор энэ завсрыг
                  дүүргэнэ (лого ба баруун товчнуудын ДУНД — жишээ зурагтай ижил ✓).
                  ⚠️ `xl` (≥1280px) — бидний толгойн `max-w-[1536px]` хүрээ баруун
                     товчнуудтай (➕/❤️/✉️/👤) хамт хайлтад ХАНГАЛТТАЙ зай үлдээдэг
                     цорын ганц хэмжээ (1024–1279px дээр хайлтын мөр багтахгүй ✗)
                     ⚠️ 2026-10-04 (32): 1280 → **1536** болов (хажуугийн сул зайг
                        багасгав) — 1280px дэлгэц дээр контейнер ХЭВЭЭР тул энэ
                        breakpoint-ийн нөхцөл ХӨНДӨӨГДӨӨГҮЙ ✓
                  ⚠️ `xl`-ээс ДООШ дээр ХАРАГДАХГҮЙ — тэнд хайлтын мөр нь header-ийн
                     доорх наалдамхай мөрөөр гарна (`HomeClient`-д `xl:hidden` ✓) */}
              {headerSlot && (
                <div className="hidden min-w-0 flex-1 items-center px-2 xl:flex xl:px-3">{headerSlot}</div>
              )}
              {/* ⚠️ БҮХ ЦЭСЭН ТОВЧ НЭГ ХЭМЖЭЭТЭЙ (`btn-sm` = 13px, font-semibold):
                  урьд нь «Зар нэмэх» нь `btn` (14px) байсан бол «Таалагдсан»,
                  «Нэвтрэх», хэрэглэгчийн нэр нь `btn-sm` (13px) байв → дэлгэц
                  дээр хэмжээ нь жижиг зөрүүтэй, харагдац тогтворгүй байв.
                  Одоо: ГОЛ үйлдэл = btn-primary (брэнд өнгө), бусад нь
                  btn-outline (төвийг сахисан) — палитр minimal хэвээр.
              ⚠️ 2026-09-27: `hidden lg:flex` — МОБАЙЛ дээр эдгээр товч
                  НУУГДАЖ, оронд нь доод навигац (`<nav>`) гарна ✓ */}
              <div className="hidden items-center gap-2 sm:gap-3 lg:flex">
                {/* ---- ③ ➕ Зар нэмэх (ГОЛ үйлдэл — цорын ганц брэнд өнгөтэй товч) ---- */}
                <button className="btn btn-primary btn-sm" onClick={openAdd}>➕ Зар нэмэх</button>

                {/* ---- ② ❤️ Таалагдсан (icon-only — 2026-10-07) ----
                    ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Таалагдсан, Мессеж-ийг текстгүй
                       icon болго, хар цагаанаас өөр өнгө орсон icon бүү
                       болгоорой» ✓ emoji `❤️` нь УЛААН өнгөтэй байсан ✗ →
                       `HeartIcon` SVG (`currentColor` = саарал/хар) болов.
                    ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-07, «button bish»):
                       «like bolon messege iig button bish bolgoj boloh uu…
                       button dotor orood dotroh durs ni jijighen
                       haragdaad bna. zugeer icon oor ni bailgaad, mouse aa
                       awaachihad tomordog baiwal ih zugeer bna» ✓
                       Тиймээс `btn btn-outline btn-sm` (хүрээ + дэвсгэр +
                       жижиг padding) ХАСАГДАЖ, зүгээр ЦЭВЭР icon болов:
                         • икон 15px → **24px** (`h-6 w-6`) — товчныхоо
                           хүрээнд чимэглэгдээгүй тул ТОМ, тод харагдана ✓
                         • товчны дүр биш — зөвхөн `p-1.5` (хүрэх талбар)
                             + `text-gray-700`, hover-т `hover:text-gray-900` ✓
                       🐭 HOVER EFFECT («нааш хөдөлж» байгаа мэт): link нь
                          `group` болж, доторх SVG нь hover-т `group-hover:
                          scale-110`-аар ЗӨӨЛӨН томорно — `duration-200
                          ease-out` ✓
                    ⚠️ Тоолуур (badge) ХЭВЭЭР ч байр нь СОЛИГДОВ: товчны дотор
                       БИШ, icon-ий баруун дээд буланд НААЛДУУЛАН
                       (`absolute -right-0.5 -top-0.5`) — icon-only хэлбэрт
                       тохирсон «notification dot» ✓ */}
                <Link
                  href="/favorites"
                  className="group relative inline-flex items-center justify-center rounded-full p-1.5 text-gray-700 transition-colors hover:text-gray-900"
                  title="Таалагдсан зарууд"
                  aria-label="Таалагдсан зарууд"
                  onClick={closeUserMenus}
                >
                  <HeartIcon className="h-6 w-6 transition-transform duration-200 ease-out group-hover:scale-110" />
                  {favoriteIds.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                      {favoriteIds.length}
                    </span>
                  )}
                </Link>

                {/* ---- ③ 💬 Мессеж (icon-only — 2026-10-07) ----
                    ⚠️ «Мессеж» ТЕКСТ ХАСАГДАВ (хэрэглэгчийн хүсэлт:
                       «текстгүй icon болго»). Икон нь `ChatIcon` SVG —
                       хоёр давхарласан ярианы бөмбөлөг (`currentColor` =
                       саарал/хар, өнгө ГАРАХГҮЙ ✓).
                    ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-07, жишээ зурагтай,
                       «messege nii icon iig solij uguuchl») → `ChatIcon`-ийг
                       ЗУРАГ ДЭЭРХ шиг ХОЁР ДУГУЙ БУЛАНТАЙ бөмбөлөг болгов
                       (хойд — баруу дээд + доош сүүл; урд — зүүн доод +
                       зүүн доош сүүл). `HeaderIcons.jsx`-ийн `ChatIcon`
                       тайлбарыг үз ✓
                    ⚠️ «button bish» (2026-10-07): яг ❤️ Таалагдсантай ИЖИЛ —
                       `btn btn-outline btn-sm` ХАСАГДАЖ зүгээр icon болов,
                       икон `h-6 w-6` (ТОМ), hover-т `group-hover:scale-110` ✓
                    ⚠️ Зөвхөн энэ толгойн мөрний товчид — мобайл доод цэс/
                       footer/`/messages` зэрэг газрын дугтуй ХЭВЭЭР ✓
                    ⚠️ Уншаагүй тоолуур (badge) — ❤️-тай ИЖИЛ, icon-ий баруун
                       дээд буланд наалдсан (`absolute -right-0.5 -top-0.5`) ✓ */}
                <Link
                  href="/messages"
                  className="group relative inline-flex items-center justify-center rounded-full p-1.5 text-gray-700 transition-colors hover:text-gray-900"
                  title="Мессеж — зар нийтлэгчтэй харилцах"
                  aria-label="Мессеж"
                  onClick={closeUserMenus}
                >
                  <ChatIcon className="h-6 w-6 transition-transform duration-200 ease-out group-hover:scale-110" />
                  {unreadMessages > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </Link>

                {/* ---- ④ 🕐 Хайлтын түүх (icon-only — 2026-10-07) ----
                    ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-07, жишээ зурагтай):
                       «Энэ цагийн icon ийг messege icon ний дараа оруулах ба
                       ийш орход тухайн хэрэглэгчийн хайлтуудыг харуулдаг
                       болгох» ✓ → Мессежийн ЯГ ДАРАА, зөвхөн icon товч.
                    ⚠️ Икон нь `ClockIcon` SVG (циферблат + 12 ба 3 цаг руу
                       чиглэсэн 2 зүү) — `currentColor` = саарал/хар, өнгө
                       ГАРАХГҮЙ ✓ (`HeaderIcons.jsx`-ийн тайлбарыг үз).
                    ⚠️ ❤️/💬-тай ЯГ ИЖИЛ хэв — `p-1.5`, `h-6 w-6`,
                       hover-т `group-hover:scale-110`; тоолуур (badge)
                       БАЙХГҮЙ (түүх нь тоолуур шаардахгүй ✓).
                    ⚠️ `/history` хуудас — хайлтууд КАРТ хэлбэрээр ✓ */}
                <Link
                  href="/history"
                  className="group relative inline-flex items-center justify-center rounded-full p-1.5 text-gray-700 transition-colors hover:text-gray-900"
                  title="Хайлтын түүх — сүүлийн хайлтууд"
                  aria-label="Хайлтын түүх"
                  onClick={closeUserMenus}
                >
                  <ClockIcon className="h-6 w-6 transition-transform duration-200 ease-out group-hover:scale-110" />
                </Link>

                {/* ---- ① Нэвтрэх / Хэрэглэгчийн цэс ----
                    ⚠️ БАЙР СОЛИСОН: өмнө нь ЗҮҮН талд (хамгийн эхэнд) байсан.
                    Одоо баруун захад — Zillow шиг «хэрэглэгчийн цэс хамгийн
                    баруунд» заншил. Хэрэглэгчийн хүслээр сольсон. */}
                {user ? (
                  <div className="relative">
                    <button
                      className="btn btn-outline btn-sm max-w-[180px]"
                      aria-haspopup="menu"
                      aria-expanded={userMenuOpen}
                      onClick={() => setUserMenuOpen((v) => !v)}
                    >
                      <span className="truncate">👤 {displayName || 'Хэрэглэгч'}</span>
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card-hover">
                        {/* ⚠️ Зүйлс нь `userMenuItems` (нэг эх сурвалж) —
                            мобайл доод sheet-тэй ЯГ ИЖИЛ жагсаалт ✓
                            (✏️«Нэр засах» нь 2026-09-27-нд УСТГАГДСАН —
                             тэр нь «👤 Профайл» цонхон дотор байгаа ✓) */}
                        {userMenuItems.map((it) => (
                          <div key={it.key}>
                            {it.key === 'logout' && <div className="h-px bg-gray-200"></div>}
                            <UserMenuItem item={it} onNavigate={closeUserMenus} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="btn btn-outline btn-sm" onClick={openAuth} disabled={authLoading}>🔑 Нэвтрэх</button>
                )}
              </div>
            </div>
          </header>

          {/* ⚠️ 2026-09-27: мобайл доод навигац байгаа тул доод зай нэмэв —
              эс бөгөөс навигац нь хуудасны сүүлийн мөрүүдийг ДАРНА ✗
              (`pb-20` = 80px ≈ nav-ийн өндөр + зай ✓; desktop дээр `lg:pb-6` ✓) */}
          <main className="min-h-[calc(100vh-130px)]">{children}</main>

          <footer className="mt-12 bg-gray-900 py-6 pb-20 text-center text-sm text-gray-300 lg:pb-6">
            <div className="mx-auto w-full max-w-[1536px] px-4 sm:px-6">
              <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                <Link href="/" className="transition hover:text-white">🏠 Нүүр хуудас</Link>
                <Link href="/mortgage" className="transition hover:text-white">🏦 Ипотекийн тооцоолуур</Link>
                <Link href="/stats" className="transition hover:text-white">📊 Үнийн статистик</Link>
                <Link href="/terms" className="transition hover:text-white">📄 Үйлчилгээний нөхцөл</Link>
                <Link href="/feedback" className="transition hover:text-white">💬 Санал хүсэлт</Link>
                {/* ⚠️ 2026-09-29: `✉️` → `MessageIcon` (SVG нь `inline-flex`
                    дотор тэгшилнэ — emoji шиг доош/дээш хөвөхгүй ✓) */}
                <Link href="/messages" className="inline-flex items-center gap-1.5 transition hover:text-white">
                  <MessageIcon className="h-[14px] w-[14px]" />
                  Мессеж
                </Link>
                {/* 🕐 Хайлтын түүх (2026-10-07) — `ClockIcon` SVG (emoji биш) */}
                <Link href="/history" className="inline-flex items-center gap-1.5 transition hover:text-white">
                  <ClockIcon className="h-[14px] w-[14px]" />
                  Хайлтын түүх
                </Link>
              </nav>
              <p className="text-[13.5px]">🏠 ZARLAA.MN — Үл хөдлөх хөрөнгийн зар. Next.js + Supabase хувилбар.</p>
              {/* ⚠️ КОНТРАСТ ЗАСВАР: bg-gray-900 дээр text-gray-500 нь 3.55:1
                  байсан (AA 4.5:1-д хүрэхгүй). text-gray-400 → 7.41:1 ✅ */}
              <p className="mx-auto mt-2 max-w-[760px] text-[12px] leading-relaxed text-gray-400">
                Үйлчилгээг ашигласнаар та <Link href="/terms" className="underline hover:text-white">Үйлчилгээний нөхцөлийг</Link> хүлээн
                зөвшөөрнө. Зар байршуулсан хэрэглэгч зарынхаа үнэн бодит байдлыг өөрөө хариуцна.
                Хувийн мэдээлэл (утасны дугаар, нэр) нь Монгол Улсын нутаг дэвсгэрээс гадна
                байрлах үүлэн серверт хадгалагдана.
              </p>
            </div>
          </footer>

          {/* ===== 📱 МОБАЙЛ ДООД НАВИГАЦ (lg:hidden) — FACEBOOK МАЯГИЙН 2026-09-29 =====
              ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-09-29): «гар утас дээр доод хэсэгт
                 байгаа Зар нэмэх, Таалагдсан, Санал хүсэлт, Мессеж, Профайлыг
                 Facebook шиг design-тай болгож чадах уу» ✓
              ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-09-27): «Гар утасаар ороход Профайлыг
                 БАРУУН ДООД буланд, Зар нэмэхийг ЗҮҮН ДООД буланд,
                 Таалагдсаныг өмнөх 2-ийн ДУНД байрлуулах» ✓ (БАЙРЛАЛ ХЭВЭЭР)
              ⚠️ 2026-09-27: «Санал хүсэлтийг Профайл, Таалагдсан 2-ийн ДУНД
                 оруул» → `grid-cols-3` → `grid-cols-4` ✓
                 (⚠️ өмнө нь /feedback нь зөвхөн FOOTER-т байсан — мобайлд
                  хүрэхийн тулд хуудсаа хамгийн доор гүйлгэх шаардлагатай байв)
              ⚠️ 2026-09-28: «✉️ Мессеж» нэмэгдэж `grid-cols-4` → **5** ✓
              📐 БАЙРЛАЛ (grid-cols-5 — DOM дараалал = харагдах дараалал):
                 ┌───────────┬────────────┬─────────────┬──────────┬───────────┐
                 │ ➕ Зар    │ ❤️ Таалаг- │ 💬 Санал    │ ✉️ Мес-  │ 👤 Проф- │
                 │ нэмэх     │ дсан       │ хүсэлт      │ сеж      │ айл       │
                 │  (ЗҮҮН)   │            │             │          │ (БАРУУН)  │
                 └───────────┴────────────┴─────────────┴──────────┴───────────┘
              🎨 FACEBOOK-ИЙН 4 ШИНЖ (дэлгэрэнгүй тайлбар нь `MobileNavItem`-д ✓):
                 ① ИДЭВХТЭЙ таб — ӨНГӨТЭЙ икон + брэнд өнгийн «pill» хүрээ
                    (`usePathname()` + `isActive()` — доор ✓)
                 ② ИДЭВХГҮЙ таб — `grayscale` икон (Facebook-ийн outline мэдрэмж ✓)
                 ③ Хуваагч босоо зураас (`border-l`) БАЙХГҮЙ ✓
                 ④ Дарахад `scale-90` хөдөлгөөн (хүрэлцэх мэдрэмж ✓)
              ⚠️ `fixed inset-x-0 bottom-0` — гүйлгэхэд байнга харагдана ✓
              ⚠️ `env(safe-area-inset-bottom)` — iPhone-ийн доод зураас
                 (home indicator) доор товчнууд дарагдахаас сэргийлнэ ✓
              ⚠️ `z-40` — header (`z-50`) ба modal (`z-[1000]+`)-аас ДООР ✓
                 (модал нээгдэхэд навигац дээр гарах ёсгүй ✓)
              ⚠️ `bg-white` (өмнө нь `bg-white/95 backdrop-blur-sm` байв) —
                 Facebook-ийн доод цэс тунгалаг БИШ, цул цагаан ✓
              ⚠️ `lg:hidden` — desktop дээр header-ийн товчнууд хангалттай ✓ */}
          <nav
            aria-label="Мобайл доод цэс"
            /* ⚠️ `grid-cols-5` (2026-09-28): «✉️ Мессеж» нэмэгдсэн тул 4 → 5
               багана. Товчнууд нь `px-1` + `text-[10px] min-[360px]:text-[11px]`
               (+ 19px икон) тул нарийн дэлгэц (320px) дээр ч 5 нь бүтэн багтана ✓ */
            className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-gray-200 bg-white shadow-[0_-1px_3px_rgba(0,0,0,0.08)] lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* ① ЗҮҮН ДООД — ➕ Зар нэмэх (ГОЛ үйлдэл → үргэлж брэнд өнгө ✓)
                ⚠️ `/listings/new` зам дээр таб нь «pill»-тэй болно (`isActive`) —
                   Facebook-д таб нь нээгдсэн хуудсандаа тодорхой харагддагтай ИЖИЛ ✓ */}
            <MobileNavItem onClick={openAdd} icon="➕" label="Зар нэмэх" active={isActive('/listings/new')} accent />

            {/* ② — ❤️ Таалагдсан (`/favorites` дээр pill + тоолууртай ✓) */}
            <MobileNavItem
              href="/favorites"
              onClick={closeUserMenus}
              icon="❤️"
              label="Таалагдсан"
              active={isActive('/favorites')}
              badge={favoriteIds.length}
            />

            {/* ③ — 💬 Санал хүсэлт (2026-09-27, хэрэглэгчийн хүсэлт: «Профайл,
                Таалагдсан 2-ийн дунд»). ⚠️ Footer-ийн холбоос ХЭВЭЭР ✓ —
                энэ нь зөвхөн МОБАЙЛД хүртээмжтэй болгож байна. */}
            <MobileNavItem
              href="/feedback"
              onClick={closeUserMenus}
              icon="💬"
              label="Санал хүсэлт"
              active={isActive('/feedback')}
            />

            {/* ④ — ✉️ Мессеж (2026-09-28) — «Санал хүсэлт» ба «Профайл»-ийн
                дунд (хэрэглэгчийн хүсэлт ✓). Unread badge нь «Таалагдсан»-тай
                ИЖИЛ (Facebook маягийн тоолуур — `ring-2 ring-white` ✓)
                ⚠️ 2026-09-29: emoji `✉️` → `MessageIcon` SVG (хэрэглэгчийн
                   хүсэлт: «messege ийн symbol -ийг илүү орчин үеийн symbol
                   болго») — идэвхтэй үед БРЭНД өнгөтэй (`currentColor`) ✓ */}
            <MobileNavItem
              href="/messages"
              onClick={closeUserMenus}
              icon={<MessageIcon className="h-[19px] w-[19px]" />}
              label="Мессеж"
              active={isActive('/messages')}
              badge={unreadMessages}
            />

            {/* ⑤ БАРУУН ДООД — 👤 Профайл
                ⚠️ Нэвтрээгүй бол `openAuth()` (нэвтрэх цонх ✓),
                   нэвтэрсэн бол доод sheet (`mobileMenuOpen`) ✓
                ⚠️ Доод sheet НЭЭЛТТЭЙ үед таб нь «pill»-тэй — Facebook-ийн
                   идэвхтэй табтай ИЖИЛ мэдрэмж ✓ */}
            <MobileNavItem
              onClick={() => (user ? setMobileMenuOpen((v) => !v) : openAuth())}
              icon="👤"
              label={user ? displayName || 'Профайл' : 'Профайл'}
              active={mobileMenuOpen}
              aria={{ 'aria-haspopup': 'menu', 'aria-expanded': user ? mobileMenuOpen : undefined }}
            />
          </nav>

          {/* ===== 📱 МОБАЙЛ ХЭРЭГЛЭГЧИЙН ЦЭС (доод sheet) — 2026-09-27 =====
              ⚠️ Desktop-ийн dropdown-той ИЖИЛ зүйлс (`userMenuItems` ✓) —
                 зөвхөн хэлбэр нь өөр (мобайлд доороос гарна ✓).
              ⚠️ `role="dialog"` + backdrop — гадна дарахад хаагдана ✓
                 (ProfileModal/AuthModal-той ижил зан төлөв ✓) */}
          {mobileMenuOpen && user && (
            <>
              <div
                className="fixed inset-0 z-[1900] bg-black/40 lg:hidden"
                onClick={closeUserMenus}
                aria-hidden="true"
              />
              <div
                role="dialog"
                aria-label="Хэрэглэгчийн цэс"
                className="fixed inset-x-0 bottom-0 z-[1950] max-h-[80vh] overflow-y-auto rounded-t-2xl border-t border-gray-200 bg-white shadow-card-hover lg:hidden"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 4.5rem)' }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                  <span className="truncate text-sm font-bold text-gray-900">
                    👤 {displayName || 'Хэрэглэгч'}
                  </span>
                  <button
                    type="button"
                    onClick={closeUserMenus}
                    className="shrink-0 rounded-full border border-gray-200 px-2.5 py-1 text-[12px] font-semibold text-gray-500"
                  >
                    ✕ Хаах
                  </button>
                </div>
                {userMenuItems.map((it) => (
                  <div key={it.key}>
                    {it.key === 'logout' && <div className="h-px bg-gray-200"></div>}
                    <UserMenuItem item={it} onNavigate={closeUserMenus} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ===== MODALS & TOAST ===== */}
          <AuthModal open={authOpen} onClose={closeAuth} />
          <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
          {/* 🪜 «Зар нэмэх / засах» нь тусдаа хуудас (`/listings/new`) — модал БАЙХГҮЙ ✓ */}

          {toast && (
            <div
              role="status"
              /* ⚠️ 2026-09-27: мобайл доод навигац (~64px) байгаа тул
                 toast нь `bottom-20` (80px) — эс бөгөөс nav-ийн ард
                 дарагдаж харагдахгүй ✗ (desktop дээр `lg:bottom-6` ✓) */
              className={`fixed bottom-20 right-4 z-[2000] animate-slide-in rounded-lg px-6 py-3 text-sm font-medium text-white shadow-card-hover lg:bottom-6 lg:right-6 ${
                toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              {toast.msg}
            </div>
          )}
          </HeaderSlotContext.Provider>
        </UIContext.Provider>
      </ToastContext.Provider>
    </AuthContext.Provider>
  );
}

/**
 * 👤 ХЭРЭГЛЭГЧИЙН ЦЭСНИЙ НЭГ ЗҮЙЛ — desktop dropdown БА мобайл доод
 * sheet ХОЁУЛАА энийг ашиглана (нэг эх сурвалж ✓ `userMenuItems`).
 *
 * ⚠️ `href` байвал `<Link>` (хуудас солих ✓), эс бөгөөс `<button>`
 *    (үйлдэл гүйцэтгэнэ — ж: Профайл цонх нээх, Гарах ✓).
 * ⚠️ `onNavigate` нь линк дээр дарахад цэсийг ХААНА ✓ — эс бөгөөс шинэ
 *    хуудас нээгдсэн ч цэс нээлттэй үлдэж, буцаж ирэхэд дахин харагдана ✗
 *
 * @param {{ label:string, href?:string, onClick?:Function, tone?:'admin'|'primary',
 *           icon?:import('react').ReactNode }} item
 *   ⚠️ `icon` (2026-09-29) — заавал биш SVG/элемент икон (ж: `MessageIcon`).
 *      Label-ийн emoji-той ХАМТ хэрэглэж болно (📋 Миний зарууд) ч, emoji-гүй
 *      текстэн дээр ч (Мессеж — орчин үеийн икон) ✓
 * @param {Function} onNavigate цэсийг хаах функц (`closeUserMenus`)
 */
function UserMenuItem({ item, onNavigate }) {
  const cls = `flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition ${
    item.tone === 'admin'
      ? 'font-semibold text-amber-800 hover:bg-amber-50'
      : item.tone === 'primary'
        ? 'font-semibold text-primary hover:bg-primary-light'
        : 'text-gray-700 hover:bg-gray-50 hover:text-primary'
  }`;
  const inner = (
    <>
      {item.icon && <span aria-hidden="true" className="shrink-0">{item.icon}</span>}
      {item.label}
    </>
  );
  if (item.href) {
    return (
      <Link href={item.href} className={cls} onClick={onNavigate}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={item.onClick}>
      {inner}
    </button>
  );
}

/* ============================================================
   📱 FACEBOOK-МАЯГИЙН МОБАЙЛ ДООД ЦЭСНИЙ НЭГ ТАБ — 2026-09-29
   ------------------------------------------------------------
   ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «гар утас дээр доод хэсэгт байгаа Зар нэмэх,
      Таалагдсан, Санал хүсэлт, Мессеж, Профайлыг Facebook шиг design-тай
      болгож чадах уу» ✓

   FACEBOOK-ийн доод цэсний ГОЛ 4 ШИНЖ (энд бүгд хэрэгжсэн):
     ① ИДЭВХТЭЙ таб нь ӨНГӨТЭЙ икон + эргэн тойронд нь брэнд өнгийн
        «pill» (дугуй хүрээ) — аль хуудсан дээр байгаагаа нэг харцаар
        мэднэ ✓. ⚠️ Урьд нь идэвхтэй таб гэж ОГТ байгаагүй (бүх таб
        ижил саарал) → хэрэглэгч хаана байгаагаа мэдэхгүй байв ✗
     ② ИДЭВХГҮЙ табны икон нь СААРАЛ (`grayscale`) — Facebook-ийн
        «outline icon» мэдрэмж ✓. ⚠️ Иконууд нь EMOJI (өнгөт глиф) тул
        саарал болгох цорын ганц арга нь CSS `filter: grayscale(1)` ✓
     ③ Хуваагч босоо зураас (`border-l`) БАЙХГҮЙ — зөвхөн дээд хүрээ ✓
     ④ Дарахад бага зэрэг жижигрэх хөдөлгөөн (`group-active:scale-90`) +
        икон нь «pill» дотор — хүрэх талбар (48px+) хэвээр том ✓

   ⚠️ ЯЛГАА (ЗОРИУД): ТЕКСТИЙГ ХАСААГҮЙ.
      Facebook-д доод цэс зөвхөн иконтой (текстгүй) — гэвч манай 5 таб
      (➕🙂❤️💬✉️👤) монгол хэрэглэгчид текстгүйгээр ойлгомжгүй болно
      (ялангуяа «Санал хүсэлт» ба «Мессеж» — өөр өөр хуудас ✓).
      Тиймээс Facebook-ийн ЗУРАГЛАЛ, ӨНГӨ, ХӨДӨЛГӨӨНИЙГ авч, текстээ
      ХАРИУ ОРОХ хэмжээтэй үлдээв (320px → 10px, 360px+ → 11px ✓).
      👉 Зөвхөн икон болгохыг хүсвэл `labelCls`-ийг `hidden` болгоход
         хангалттай (нэг газарт тодорхойлогдсон ✓)

   ⚠️ BADGE нь Facebook-ийн УЛААН биш `primary` (цэнхэр): tailwind.config.js
      дээр улаан нь ЗӨВХӨН «алдаа»-ны семантик өнгө (1 акцент философи ✓).
      ⚠️ `ring-2 ring-white` — badge нь иконоос цагаан зураасаар тусгаарлагдана
         (Facebook-ийн мэдэгдлийн тоолууртай ижил ✓)

   @param {Object}   p
   @param {string}   [p.href]    байвал `<Link href>` (хуудас солих ✓)
   @param {Function} [p.onClick] байвал `<button>` (модал / доод sheet нээх ✓)
   @param {string|import('react').ReactNode} p.icon emoji эсвэл SVG элемент
     ⚠️ 2026-09-29: SVG (`MessageIcon`) дамжуулж болно. Emoji нь өнгө
        АВАХГҮЙ (глиф нь өөрийн өнгөтэй) тул идэвхтэй табыг зөвхөн `pill`-ээр
        ялгадаг байв; SVG нь `currentColor`-оор брэнд өнгө авна ✓
     ⚠️ SVG өгсөн үед хэмжээг ГАДНААС өгнө (ж: `className="h-[19px] w-[19px]"`)
        — контейнерын `text-[19px]` нь SVG-д нөлөөлөхгүй ✓
   @param {string}   p.label     табны текст
   @param {boolean}  [p.active]  идэвхтэй эсэх → pill + өнгөтэй икон ✓
   @param {boolean}  [p.accent]  икон нь ҮРГЭЛЖ брэнд өнгөтэй (➕ Зар нэмэх)
   @param {number}   [p.badge]   0-ээс их бол баруун дээд буланд тоолуур ✓
   @param {Object}   [p.aria]    нэмэлт aria-* проп (ж: aria-haspopup ✓)
   ============================================================ */
function MobileNavItem({ href, onClick, icon, label, active = false, accent = false, badge = 0, aria = {} }) {
  /* ⚠️ 2026-09-29: `text-primary`/`text-gray-500` нэмэгдэв — SVG икон
     (`currentColor`) нь табны төлөвөөр ЗӨВ өнгөтэй болно ✓
       • идэвхтэй/accent → `text-primary` (icon нь pill дотор цэнхэр)
       • идэвхгүй        → `text-gray-500` + `grayscale` (emoji-д зориулсан
         шүүлт — SVG-д нөлөөлөхгүй, өнгө нь `currentColor`-оос ✓) */
  const iconCls = `grid h-7 w-12 place-items-center rounded-full text-[19px] leading-none transition-transform duration-150 ${
    active
      ? 'bg-primary/10 text-primary ring-2 ring-primary/60'
      : accent
        ? 'bg-primary/10 text-primary'
        : 'text-gray-500 grayscale group-active:scale-90'
  }`;
  /* ⚠️ Текст нь ХАРИУ ОРОХ (responsive) хэмжээтэй — Facebook-д доод цэс
     ТЕКСТГҮЙ тул бид хамгийн бага зай эзлэхийг зорьсон:
       • 320px (iPhone SE 1st gen, хуучин Android) → `text-[10px]` — 5 таб
         64px болж, «Зар нэмэх»/«Мессеж»/«Профайл» БҮТЭН багтана ✓
       • 360px+ → `min-[360px]:text-[11px]` — бүх 5 текст БҮТЭН багтана ✓
       • ⚠️ 320px дээр «Таалагдсан» (61px) ба «Санал хүсэлт» (69px) нь 64px
         нүдэнд БАГТАХГҮЙ (хэмжиж баталсан) → `truncate` тул «Таалагдс…»
         гэж «…»-ээр товчлогдоно. Энэ нь ЗОРИУД — хагас үсэг тасрахгүй,
         хэвтээ скролл үүсэхгүй ✓ (Facebook-д текст огт байхгүй тул
         320px дээр товчлол гарах нь хүлээн зөвшөөрөгдөх компромисс ✓)
     (⚠️ `px-1` — 320px-д текстийн өргөн 56px; товчны хүрэх талбар нь БҮТЭН
      нүд (64px) хэвээр — padding нь зөвхөн текстийн хайрцгийг нарийсгана ✓) */
  const labelCls = `max-w-full truncate text-[10px] min-[360px]:text-[11px] leading-tight ${
    active ? 'font-bold text-primary' : accent ? 'font-semibold text-primary' : 'font-medium text-gray-500'
  }`;
  const cls = 'group relative flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition active:bg-gray-50';
  const inner = (
    <>
      <span aria-hidden="true" className={iconCls}>{icon}</span>
      <span className={labelCls}>{label}</span>
      {badge > 0 && (
        <span className="absolute right-[calc(50%-27px)] top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white ring-2 ring-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </>
  );
  if (href) {
    return (
      <Link href={href} onClick={onClick} aria-current={active ? 'page' : undefined} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls} {...aria}>
      {inner}
    </button>
  );
}

