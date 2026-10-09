'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AppProviders';
import { fetchAdminUsers, updateUserAdmin, updateUserBlocked, updateUserDailyLimit } from '../lib/adminApi';
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

/**
 * Тухайн хэрэглэгчийн ЗАРУУД руу очих холбоос.
 * `/admin/listings` нь `?userId=`-г уншиж зөвхөн тэр хэрэглэгчийн зарыг харуулна.
 */
function listingsHref(row) {
  const label = row.name ? `${row.name} · ${displayPhone(row)}` : displayPhone(row);
  return `/admin/listings?userId=${row.id}&label=${encodeURIComponent(label)}`;
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

  // 🚫 Блоклох / блокыг авах — БЛОКЛОХ нь дэлгэцийн баталгаа асууна
  // (үр дагавар нь ноцтой: зар нийтэд харагдахгүй + системд нэвтрэхгүй).
  const toggleBlock = async (row) => {
    const next = !row.blocked;
    if (next) {
      const who = row.name ? `${row.name} (${displayPhone(row)})` : displayPhone(row);
      const ok = window.confirm(
        `${who}-г БЛОКЛОХ уу?\n\n` +
        '• Түүний зарууд нийтэд ХАРАГДАХГҮЙ болно\n' +
        '• Системд НЭВТРЭХ боломжгүй болно'
      );
      if (!ok) return;
    }
    setBusyId(row.id);
    setNotice('');
    const res = await updateUserBlocked(row.id, next);
    setBusyId(null);
    if (res.error) {
      setNotice(`❌ ${res.error}`);
      return;
    }
    setNotice(next ? `🚫 Блоклогдлоо: ${displayPhone(row)}` : `✅ Блокыг авлаа: ${displayPhone(row)}`);
    load();
  };

  // ⚡ Өдрийн зарын лимит (0014 V2) — агент/дэлгүүрт өндөр (эсвэл ∞) өгнө.
  //   `value`: 3 = анхдагч (metadata-аас УСТГАНА), 0 = хязгааргүй, N = тоо
  const setDailyLimit = async (row, value) => {
    setBusyId(row.id);
    setNotice('');
    const res = await updateUserDailyLimit(row.id, value);
    setBusyId(null);
    if (res.error) {
      setNotice(`❌ ${res.error}`);
      return;
    }
    const n = res.data.dailyLimit;
    setNotice(
      n === 0
        ? `⚡ Хязгааргүй лимит олголоо: ${displayPhone(row)}`
        : `⚡ Өдрийн лимит ${n} боллоо: ${displayPhone(row)}`
    );
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
        <div className="mx-auto my-8 max-w-[640px] rounded-2xl border border-red-200 bg-gray-100 px-6 py-8 text-center">
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
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Нийт хэрэглэгч', value: stats.users, icon: '👥' },
          { label: 'Админ', value: stats.admins, icon: '🛠' },
          { label: 'Блоклогдсон', value: stats.blocked, icon: '🚫' },
          { label: 'Нийт зар', value: stats.listings, icon: '🏠' },
          { label: 'Зартай хэрэглэгч', value: stats.withListings, icon: '📋' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-gray-100 px-4 py-3">
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
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-100">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-[12px] uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Хэрэглэгч</th>
              <th className="px-4 py-3">Утас</th>
              <th className="px-4 py-3">Бүртгэгдсэн</th>
              <th className="px-4 py-3">Сүүлд нэвтэрсэн</th>
              <th className="px-4 py-3 text-center">Зар</th>
              <th className="px-4 py-3 text-center">Эрх</th>
              <th className="px-4 py-3 text-center">⚡ Лимит</th>
              <th className="px-4 py-3 text-center">Төлөв</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">
                    <Link
                      href={listingsHref(r)}
                      title="Энэ хэрэглэгчийн заруудыг харах"
                      className="hover:text-primary hover:underline"
                    >
                      {r.name || <span className="text-gray-400">(нэргүй)</span>}
                    </Link>
                    {r.isAdmin && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-px text-[11px] font-semibold text-amber-800">
                        ADMIN
                      </span>
                    )}
                    {r.blocked && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-px text-[11px] font-semibold text-red-700">
                        БЛОКЛОГДСОН
                      </span>
                    )}
                    {/* ⚡ Агент (3-аас өндөр эсвэл хязгааргүй лимит) */}
                    {(r.dailyLimit === 0 || r.dailyLimit > 3) && (
                      <span
                        className="ml-2 rounded bg-emerald-100 px-1.5 py-px text-[11px] font-semibold text-emerald-800"
                        title="Өдрийн зарын лимит өндөр — давхардлын хамгаалалт хэвээр"
                      >
                        ⚡ АГЕНТ
                      </span>
                    )}
                  </p>
                  <p className="text-[12px] text-gray-400">{r.email || r.id}</p>
                </td>
                <td className="px-4 py-3 font-mono text-gray-800">
                  <Link href={listingsHref(r)} title="Энэ хэрэглэгчийн заруудыг харах" className="hover:text-primary hover:underline">
                    {displayPhone(r)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {fmtDate(r.createdAt)}
                  <span className="block text-[12px] text-gray-400">{timeAgo(r.createdAt)}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{r.lastSignInAt ? fmtDate(r.lastSignInAt) : '—'}</td>
                <td className="px-4 py-3 text-center">
                  {r.listingsCount > 0 ? (
                    <Link
                      href={listingsHref(r)}
                      title="Энэ хэрэглэгчийн заруудыг харах"
                      className="inline-flex flex-col items-center gap-0.5 rounded-full bg-primary/10 px-2.5 py-1 text-[13px] font-semibold text-primary hover:bg-primary/20"
                    >
                      {r.listingsCount}
                      <span className="text-[10px] font-medium text-primary/80">👁 харах</span>
                    </Link>
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
                <td className="px-4 py-3">
                  {/*
                    ⚡ Өдрийн зарын лимит (0014 V2) — давхардал/SPAM хамгаалалт.
                    ⚠️ Агент/дэлгүүр (20+ зартай) ХОРИГЛОГДОХГҮЙ байхын тулд
                       лимитийг 50 (эсвэл ∞) болгоно. 3 = анхдагч (metadata-аас
                       устгана). `app_metadata` тул хэрэглэгч өөрөө сольж чадахгүй.
                  */}
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`text-[11px] font-semibold ${
                        r.dailyLimit === 0 ? 'text-amber-700' : 'text-gray-500'
                      }`}
                      title="Өдөрт оруулж болох ШИНЭ зарын тоо (0 = хязгааргүй)"
                    >
                      {r.dailyLimit === 0 ? '∞ хязгааргүй' : `${r.dailyLimit} / өдөр`}
                    </span>
                    <div className="flex items-center gap-1">
                      {[
                        { v: 3, label: '3', tip: 'Энгийн хэрэглэгчийн анхдагч' },
                        { v: 50, label: '50', tip: 'Агент (20+ зар)' },
                        { v: 0, label: '∞', tip: 'Хязгааргүй (дэлгүүр)' },
                      ].map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          title={o.tip}
                          className={`btn btn-sm ${
                            r.dailyLimit === o.v ? 'btn-secondary' : 'btn-outline'
                          }`}
                          disabled={busyId === r.id}
                          onClick={() => setDailyLimit(r, o.v)}
                        >
                          {busyId === r.id ? '…' : o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {r.blocked ? (
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-semibold text-red-600">🚫 Блоклогдсон</span>
                      <button
                        className="btn btn-outline btn-sm"
                        disabled={busyId === r.id}
                        onClick={() => toggleBlock(r)}
                      >
                        {busyId === r.id ? '...' : '✅ Блокыг авах'}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn btn-outline btn-sm text-red-600 hover:bg-red-50"
                      disabled={busyId === r.id}
                      onClick={() => toggleBlock(r)}
                    >
                      {busyId === r.id ? '...' : '🚫 Блоклох'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-500">
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
        {' '}👤 <b>Нэр / утас эсвэл «👁 харах» тоо</b> дээр дарж тухайн хэрэглэгчийн зарууд руу орно.
        {' '}🚫 <b>«Блоклох»</b> нь түүний зарыг нийтэд харагдуулахгүй + системд нэвтрэх эрхийг хаана.
      </p>
    </div>
  );
}

