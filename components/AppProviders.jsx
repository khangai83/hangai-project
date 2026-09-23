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

  const editName = useCallback(() => {
    const next = window.prompt('Хэрэглэгчийн нэр:', profileName || '');
    if (next !== null) saveName(next);
  }, [profileName, saveName]);

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
          {/* ===== HEADER ===== */}
          <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-card">
            <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6">
              <Link
                href="/"
                className="flex items-center gap-2 text-[22px] font-bold text-primary"
                onClick={() => setUserMenuOpen(false)}
              >
                🏠 ZAR<span className="text-gray-900">.mn</span>
              </Link>
              <div className="flex items-center gap-3">
                {/* ---- ① Нэвтрэх / Хэрэглэгчийн цэс ---- */}
                {user ? (
                  <div className="relative">
                    <button className="btn btn-secondary btn-sm" onClick={() => setUserMenuOpen((v) => !v)}>
                      👤 {displayName || 'Хэрэглэгч'}
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card-hover">
                        <Link href="/my-listings" className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:text-primary" onClick={() => setUserMenuOpen(false)}>📋 Миний зарууд</Link>
                        <Link href="/feedback" className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:text-primary" onClick={() => setUserMenuOpen(false)}>💬 Санал хүсэлт</Link>
                        {isAdmin && (
                          <>
                            <Link href="/admin/listings" className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-amber-800 transition hover:bg-amber-50" onClick={() => setUserMenuOpen(false)}>🏷️ Админ — Зарууд</Link>
                            <Link href="/admin/feedback" className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-amber-800 transition hover:bg-amber-50" onClick={() => setUserMenuOpen(false)}>📨 Админ — Санал хүсэлт</Link>
                            <Link href="/admin/users" className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-amber-800 transition hover:bg-amber-50" onClick={() => setUserMenuOpen(false)}>🛠 Админ — Хэрэглэгчид</Link>
                          </>
                        )}
                        <button className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:text-primary" onClick={() => { setUserMenuOpen(false); editName(); }}>✏️ Нэр засах</button>
                        <div className="h-px bg-gray-200"></div>
                        <button className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:text-primary" onClick={logout}>🚪 Гарах</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={openAuth} disabled={authLoading}>🔑 Нэвтрэх</button>
                )}
                {/* ---- ② ❤️ Таалагдсан ----
                    ⚠️ ӨМНӨ «🔑 Нэвтрэх»-ийн ЗҮҮН талд байсан. Хэрэглэгчийн хүслээр
                    байрыг сольж, Нэвтрэх-ийн БАРУУН талд (➕ Зар нэмэх-ийн өмнө) тавив. */}
                <Link
                  href="/favorites"
                  className="btn btn-secondary btn-sm"
                  title="Таалагдсан зарууд"
                  onClick={() => setUserMenuOpen(false)}
                >
                  ❤️ Таалагдсан
                  {favoriteIds.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-red-500 px-1.5 py-px text-[11px] font-bold text-white">
                      {favoriteIds.length}
                    </span>
                  )}
                </Link>
                {/* ---- ③ ➕ Зар нэмэх ---- */}
                <button className="btn btn-primary" onClick={openAdd}>➕ Зар нэмэх</button>
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100vh-130px)]">{children}</main>

          <footer className="mt-12 bg-gray-900 py-6 text-center text-sm text-gray-300">
            <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
              <nav className="mb-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                <Link href="/" className="transition hover:text-white">🏠 Нүүр хуудас</Link>
                <Link href="/mortgage" className="transition hover:text-white">🏦 Ипотекийн тооцоолуур</Link>
                <Link href="/stats" className="transition hover:text-white">📊 Үнийн статистик</Link>
                <Link href="/terms" className="transition hover:text-white">📄 Үйлчилгээний нөхцөл</Link>
                <Link href="/feedback" className="transition hover:text-white">💬 Санал хүсэлт</Link>
              </nav>
              <p className="text-[13.5px]">🏠 ZAR.mn — Үл хөдлөх хөрөнгийн зар. Next.js + Supabase хувилбар.</p>
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

          {/* ===== MODALS & TOAST ===== */}
          <AuthModal open={authOpen} onClose={closeAuth} />
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
              className={`fixed bottom-6 right-6 z-[2000] animate-slide-in rounded-lg px-6 py-3 text-sm font-medium text-white shadow-card-hover ${
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

