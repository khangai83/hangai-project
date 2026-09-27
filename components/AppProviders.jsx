'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '../lib/supabaseClient';
import { fetchProfile, upsertProfile } from '../lib/queries';
import { normalizePhone } from '../lib/format';
import { fetchAdminMe } from '../lib/adminApi';
import { useFavorites } from '../lib/favorites';
import phoneEmail from '../lib/phoneEmail';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';
import AddListingModal from './AddListingModal';

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

// ---------------- Hooks ----------------
export function useAuth() { return useContext(AuthContext); }
export function useToast() { return useContext(ToastContext); }
export function useUI() { return useContext(UIContext); }

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
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // засах горимд зарын объект
  const favoriteIds = useFavorites(); // ❤️ таалагдсан зарууд (localStorage)
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  // 📱 2026-09-27 (хэрэглэгчийн хүсэлт): мобайл доод навигацийн «👤 Профайл»
  //    товч нь доод хуудас (bottom sheet) нээнэ — desktop dropdown-той ИЖИЛ зүйлс ✓
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); // 👤 Профайл засах модал
  const [dataVersion, setDataVersion] = useState(0); // зарын шинэчлэлт дохио
  const [isAdmin, setIsAdmin] = useState(false); // app_metadata.is_admin

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

  const openAuth = useCallback(() => { setAddOpen(false); setAuthOpen(true); }, []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);
  const openAdd = useCallback(() => {
    if (!user) { showToast('Эхлээд нэвтрэх шаардлагатай', 'error'); setAuthOpen(true); return; }
    setAuthOpen(false); setEditTarget(null); setAddOpen(true);
  }, [user, showToast]);
  // Засах горим: ижил цонх, гэхдээ утгууд урьдчилан бөглөгдөнө
  const openEdit = useCallback((listing) => {
    if (!user) { showToast('Эхлээд нэвтрэх шаардлагатай', 'error'); setAuthOpen(true); return; }
    setAuthOpen(false); setEditTarget(listing); setAddOpen(true);
  }, [user, showToast]);
  const closeAdd = useCallback(() => { setAddOpen(false); setEditTarget(null); }, []);
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
      { key: 'my-listings', label: '📋 Миний зарууд', href: '/my-listings' },
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
  }, [isAdmin, logout, closeUserMenus]);

  const authValue = useMemo(() => ({ user, profileName, authLoading, signIn, saveName, logout }),
    [user, profileName, authLoading, signIn, saveName, logout]);
  const toastValue = useMemo(() => ({ showToast }), [showToast]);
  const uiValue = useMemo(
    () => ({ openAuth, openAdd, openEdit, closeAdd, dataVersion, notifyListingsChanged }),
    [openAuth, openAdd, openEdit, closeAdd, dataVersion, notifyListingsChanged]
  );

  const displayName = profileName || user?.phone || '';

  return (
    <AuthContext.Provider value={authValue}>
      <ToastContext.Provider value={toastValue}>
        <UIContext.Provider value={uiValue}>
          {/* ===== HEADER =====
              ⚠️ 2026-09-27 (хэрэглэгчийн хүсэлт): «Гар утасаар ороход ЛОГО-г
                 ГОЛЛУУЛЖ (төвд) харуулаарай» → мобайлд `justify-center` ✓
                 (desktop дээр `lg:justify-between` — лого зүүн, цэс баруун ✓)
              ⚠️ Баруун талын товчнууд (`➕ Зар нэмэх`, `❤️ Таалагдсан`,
                 хэрэглэгчийн цэс) нь МОБАЙЛ дээр НУУГДАЖ (`hidden lg:flex` ✓),
                 оронд нь доод навигац (`<nav>` доор) гарна ✓
                 → Ингэснээр мобайлд header нь ЗӨВХӨН лого (төвд) ✓ */} 
          <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-card">
            <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-center px-4 sm:px-6 lg:justify-between">
              <Link
                href="/"
                className="flex items-center gap-2 text-[22px] font-bold text-primary"
                onClick={closeUserMenus}
              >
                🏠 ZARLAA<span className="text-gray-900">.MN</span>
              </Link>
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

                {/* ---- ② ❤️ Таалагдсан ---- */}
                <Link
                  href="/favorites"
                  className="btn btn-outline btn-sm"
                  title="Таалагдсан зарууд"
                  onClick={closeUserMenus}
                >
                  ❤️ Таалагдсан
                  {favoriteIds.length > 0 && (
 /* ⚠️ Тоо нь урьд нь УЛААН (bg-red-500) байв — улаан нь алдааны
                       семантик өнгө тул тоолуурт тохирохгүй → брэнд өнгө. */
                    <span className="ml-1 rounded-full bg-primary px-1.5 py-px text-[11px] font-bold text-white">
                      {favoriteIds.length}
                    </span>
                  )}
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
            <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
              <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                <Link href="/" className="transition hover:text-white">🏠 Нүүр хуудас</Link>
                <Link href="/mortgage" className="transition hover:text-white">🏦 Ипотекийн тооцоолуур</Link>
                <Link href="/stats" className="transition hover:text-white">📊 Үнийн статистик</Link>
                <Link href="/terms" className="transition hover:text-white">📄 Үйлчилгээний нөхцөл</Link>
                <Link href="/feedback" className="transition hover:text-white">💬 Санал хүсэлт</Link>
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

          {/* ===== 📱 МОБАЙЛ ДООД НАВИГАЦ (lg:hidden) — 2026-09-27 =====
              ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Гар утасаар ороход Профайлыг БАРУУН
                 ДООД буланд, Зар нэмэхийг ЗҮҮН ДООД буланд, Таалагдсаныг
                 өмнөх 2-ийн ДУНД байрлуулах» ✓
              📐 БАЙРЛАЛ (grid-cols-3 — DOM дараалал = харагдах дараалал):
                    ┌──────────────┬───────────────┬──────────────┐
                    │ ➕ Зар нэмэх │ ❤️ Таалагдсан │ 👤 Профайл    │
                    │  (ЗҮҮН)      │   (ДУНД)      │  (БАРУУН)    │
                    └──────────────┴───────────────┴──────────────┘
              ⚠️ `fixed inset-x-0 bottom-0` — гүйлгэхэд байнга харагдана ✓
              ⚠️ `env(safe-area-inset-bottom)` — iPhone-ийн доод зураас
                 (home indicator) доор товчнууд дарагдахаас сэргийлнэ ✓
              ⚠️ `z-40` — header (`z-50`) ба modal (`z-[1000]+`)-аас ДООР ✓
                 (модал нээгдэхэд навигац дээр гарах ёсгүй ✓)
              ⚠️ `lg:hidden` — desktop дээр header-ийн товчнууд хангалттай ✓ */}
          <nav
            aria-label="Мобайл доод цэс"
            className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-gray-200 bg-white/95 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur-sm lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* ① ЗҮҮН ДООД — ➕ Зар нэмэх (гол үйлдэл → брэнд өнгө ✓) */}
            <button
              type="button"
              onClick={openAdd}
              className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-[11px] font-semibold text-primary transition active:bg-primary-light"
            >
              <span aria-hidden="true" className="text-[20px] leading-tight">➕</span>
              Зар нэмэх
            </button>

            {/* ② ДУНД — ❤️ Таалагдсан (тоолууртай ✓) */}
            <Link
              href="/favorites"
              onClick={closeUserMenus}
              className="relative flex flex-col items-center justify-center gap-0.5 border-x border-gray-100 px-2 py-2 text-[11px] font-semibold text-gray-600 transition active:bg-gray-50"
            >
              <span aria-hidden="true" className="text-[20px] leading-tight">❤️</span>
              Таалагдсан
              {favoriteIds.length > 0 && (
                <span className="absolute right-[calc(50%-30px)] top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                  {favoriteIds.length}
                </span>
              )}
            </Link>

            {/* ③ БАРУУН ДООД — 👤 Профайл
                ⚠️ Нэвтрээгүй бол `openAuth()` (нэвтрэх цонх ✓),
                   нэвтэрсэн бол доод sheet (`mobileMenuOpen`) ✓ */}
            <button
              type="button"
              onClick={() => (user ? setMobileMenuOpen((v) => !v) : openAuth())}
              aria-haspopup="menu"
              aria-expanded={user ? mobileMenuOpen : undefined}
              className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-[11px] font-semibold text-gray-600 transition active:bg-gray-50"
            >
              <span aria-hidden="true" className="text-[20px] leading-tight">👤</span>
              <span className="max-w-full truncate">{user ? (displayName || 'Профайл') : 'Профайл'}</span>
            </button>
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
          <AddListingModal
            open={addOpen}
            onClose={closeAdd}
            userId={user?.id || null}
            displayName={displayName}
            userPhone={user?.phone || ''}
            editing={editTarget}
          />

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
 * @param {{ label:string, href?:string, onClick?:Function, tone?:'admin'|'primary' }} item
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
  if (item.href) {
    return (
      <Link href={item.href} className={cls} onClick={onNavigate}>
        {item.label}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={item.onClick}>
      {item.label}
    </button>
  );
}

