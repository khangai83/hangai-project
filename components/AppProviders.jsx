'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getSupabase } from '../lib/supabaseClient';
import { fetchProfile, upsertProfile } from '../lib/queries';
import AuthModal from './AuthModal';
import AddListingModal from './AddListingModal';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0); // зарын шинэчлэлт дохио

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
          setUser({ id: u.id, phone: u.phone });
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

  // ---------- Auth actions ----------
  const signInWithPhone = useCallback(async (phone) => {
    const client = getSupabase();
    if (!client) return { error: 'Supabase тохиргоо алга. .env.local үүсгэнэ үү.' };
    const { error } = await client.auth.signInWithOtp({ phone });
    return { error: error ? error.message : null };
  }, []);

  const verifyCode = useCallback(async (phone, code) => {
    const client = getSupabase();
    if (!client) return { error: 'Supabase тохиргоо алга. .env.local үүсгэнэ үү.' };
    const { error } = await client.auth.verifyOtp({ phone, token: String(code).trim(), type: 'sms' });
    if (error) return { error: error.message };
    const { data } = await client.auth.getUser();
    if (data?.user) setUser({ id: data.user.id, phone: data.user.phone });
    return { error: null };
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
    setAuthOpen(false); setAddOpen(true);
  }, [user, showToast]);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const notifyListingsChanged = useCallback(() => setDataVersion((v) => v + 1), []);

  const authValue = useMemo(() => ({ user, profileName, authLoading, signInWithPhone, verifyCode, saveName, logout }),
    [user, profileName, authLoading, signInWithPhone, verifyCode, saveName, logout]);
  const toastValue = useMemo(() => ({ showToast }), [showToast]);
  const uiValue = useMemo(() => ({ openAuth, openAdd, closeAdd, dataVersion, notifyListingsChanged }),
    [openAuth, openAdd, closeAdd, dataVersion, notifyListingsChanged]);

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
                {user ? (
                  <div className="relative">
                    <button className="btn btn-secondary btn-sm" onClick={() => setUserMenuOpen((v) => !v)}>
                      👤 {displayName || 'Хэрэглэгч'}
                    </button>
                    {userMenuOpen && (
                      <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card-hover">
                        <Link href="/my-listings" className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:text-primary" onClick={() => setUserMenuOpen(false)}>📋 Миний зарууд</Link>
                        <Link href="/admin/queue" className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:text-primary" onClick={() => setUserMenuOpen(false)}>🤖 Facebook агент (queue)</Link>
                        <button className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:text-primary" onClick={() => { setUserMenuOpen(false); editName(); }}>✏️ Нэр засах</button>
                        <div className="h-px bg-gray-200"></div>
                        <button className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-gray-700 transition hover:bg-gray-50 hover:text-primary" onClick={logout}>🚪 Гарах</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={openAuth} disabled={authLoading}>🔑 Нэвтрэх</button>
                )}
                <button className="btn btn-primary" onClick={openAdd}>➕ Зар нэмэх</button>
              </div>
            </div>
          </header>

          <main className="min-h-[calc(100vh-130px)]">{children}</main>

          <footer className="mt-12 bg-gray-900 py-5 text-center text-sm text-gray-300">
            <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
              <p>🏠 ZAR.mn — Үл хөдлөх хөрөнгийн зар. Next.js + Supabase хувилбар.</p>
            </div>
          </footer>

          {/* ===== MODALS & TOAST ===== */}
          <AuthModal open={authOpen} onClose={closeAuth} onLoggedIn={saveName} />
          <AddListingModal open={addOpen} onClose={closeAdd} userId={user?.id || null} displayName={displayName} />

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

