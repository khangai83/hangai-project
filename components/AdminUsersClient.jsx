'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AppProviders';
import { fetchAdminUsers, updateUserAdmin } from '../lib/adminApi';
import { timeAgo } from '../lib/format';

/** 97688093663 / +97688093663 → 88093663 */
function displayPhone(row) {
  const digits = String((row && row.phone) || '').replace(/\D/g, '');
  if (!digits) return '—';
  return digits.length > 8 ? digits.slice(-8) : digits;
}

/** Огноо → '2026-09-19 16:36' */
function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AdminUsersClient() {
  const { user, authLoading } = useAuth();
  const [data, setData] = useState(null); // { rows, stats }
  const [loadError, setLoadError] = useState(null); // { message, status }
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchAdminUsers();
    setLoading(false);
    if (res.error) {
      setLoadError({ message: res.error, status: res.status || null });
      return;
    }
    setLoadError(null);
    setData(res.data);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setData(null);
      setLoadError(null);
      return;
    }
    load();
  }, [authLoading, user, load]);

  const toggleAdmin = async (row) => {
    setBusyId(row.id);
    setNotice('');
    const res = await updateUserAdmin(row.id, !row.isAdmin);
    setBusyId(null);
    if (res.error) {
      setNotice(`❌ ${res.error}`);
      return;
    }
    setNotice(`${res.data.isAdmin ? '🛠 Админ болголоо' : '👤 Админ эрх авагдлаа'}: ${displayPhone(row)}`);
    load();
  };

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter((r) =>
      [r.name, displayPhone(r), r.email, r.id].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [data, query]);

  // ---------- Төлвүүд ----------
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
          <h3 className="text-xl font-semibold">Энэ хэсэгт орохын тулд нэвтрэх шаардлагатай</h3>
          <p className="mt-2 text-gray-500">Header дээрх «🔑 Нэвтрэх» товчийг дарна уу.</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-container">
        <div className="mx-auto my-8 max-w-[640px] rounded-2xl border border-red-200 bg-white px-6 py-8 text-center">
          <div className="text-4xl">{loadError.status === 403 ? '🚫' : '⚠️'}</div>
          <h3 className="mb-2 mt-3 text-lg font-semibold text-red-800">
            {loadError.status === 403 ? 'Танд админ эрх байхгүй' : 'Алдаа гарлаа'}
          </h3>
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-left text-[13px] text-red-700">
            {loadError.message}
          </p>
          {loadError.status === 403 && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3.5 text-left text-[13px] text-gray-700">
              <p className="mb-1 font-semibold">Хэрхэн админ болох вэ:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>
                  Терминалд:{' '}
                  <code className="rounded bg-gray-100 px-1.5 py-px text-xs">
                    npm run make:admin -- {displayPhone({ phone: user.phone })}
                  </code>
                </li>
                <li>Дараа нь энэ хуудсыг дахин ачаална (эсвэл дахин нэвтэрнэ).</li>
              </ol>
            </div>
          )}
          <div className="mt-4 flex justify-center gap-2">
            <button className="btn btn-primary btn-sm" onClick={load}>
              ↻ Дахин оролдох
            </button>
            <Link href="/" className="btn btn-outline btn-sm">
              ← Нүүр хуудас
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Хэрэглэгчдийн жагсаалтыг татаж байна...</p>
        </div>
      </div>
    );
  }

  const { stats } = data;

  return (
    <div className="page-container">
      <div className="mt-2 mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">🛠 Админ — Хэрэглэгчид</h1>
        <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
          {loading ? 'Ачаалж байна...' : '↻ Шинэчлэх'}
        </button>
      </div>

      {/* ===== Статистик ===== */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Нийт хэрэглэгч', value: stats.users, icon: '👥' },
          { label: 'Админ', value: stats.admins, icon: '🛠' },
          { label: 'Нийт зар', value: stats.listings, icon: '🏠' },
          { label: 'Зартай хэрэглэгч', value: stats.withListings, icon: '📋' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {s.icon} {s.label}
            </p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {notice && <p className="mb-3 rounded-lg bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-700">{notice}</p>}

      {/* ===== Хайлт ===== */}
      <div className="mb-3">
        <input
          className="form-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Хайх... (нэр, утас, имэйл, id)"
        />
      </div>

      {/* ===== Хүснэгт ===== */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-[12px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Хэрэглэгч</th>
              <th className="px-4 py-3">Утас</th>
              <th className="px-4 py-3">Бүртгэгдсэн</th>
              <th className="px-4 py-3">Сүүлд нэвтэрсэн</th>
              <th className="px-4 py-3 text-center">Зар</th>
              <th className="px-4 py-3 text-center">Эрх</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">
                    {r.name || <span className="text-gray-400">(нэргүй)</span>}
                    {r.isAdmin && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-px text-[11px] font-semibold text-amber-800">
                        ADMIN
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-gray-400">{r.email || r.id}</p>
                </td>
                <td className="px-4 py-3 font-mono text-gray-800">{displayPhone(r)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {fmtDate(r.createdAt)}
                  <span className="block text-[12px] text-gray-400">{timeAgo(r.createdAt)}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.lastSignInAt ? fmtDate(r.lastSignInAt) : '—'}</td>
                <td className="px-4 py-3 text-center">
                  {r.listingsCount > 0 ? (
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[13px] font-semibold text-primary">
                      {r.listingsCount}
                    </span>
                  ) : (
                    <span className="text-gray-300">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    className={`btn btn-sm ${r.isAdmin ? 'btn-outline' : 'btn-secondary'}`}
                    disabled={busyId === r.id}
                    onClick={() => toggleAdmin(r)}
                  >
                    {busyId === r.id ? '...' : r.isAdmin ? '👤 Эрх авах' : '🛠 Админ болгох'}
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  Хэрэглэгч олдсонгүй
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[12px] text-gray-400">
        Нийт {stats.users} хэрэглэгчээс {rows.length} харуулж байна. Эрх нь Supabase-ийн{' '}
        <code>app_metadata.is_admin</code>-д хадгалагдана (клиент хуурах боломжгүй).
      </p>
    </div>
  );
}

