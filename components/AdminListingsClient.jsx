'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AppProviders';
import { fetchAdminListings, adminDeleteListing } from '../lib/adminApi';
import { formatPrice, timeAgo } from '../lib/format';

/** Огноо → '2026-09-19 16:36' */
function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * АДМИН — ЗАРЫН УДИРДЛАГА (`/admin/listings`).
 *
 * • Хайлт: зарын ID (бүтэн эсвэл эхлэлээр), утас, нэр, дүүрэг, хаяг, төрөл
 * • Устгах: ЯМАР Ч зарыг (service_role → `/api/admin/listings?id=…`).
 *   Зургууд нь Storage-оос ч хамт цэвэрлэгдэнэ.
 */
export default function AdminListingsClient() {
  const { user, authLoading } = useAuth();
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [data, setData] = useState(null); // { rows, total }
  const [loadError, setLoadError] = useState(null); // { message, status }
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async (search) => {
    setLoading(true);
    const res = await fetchAdminListings(search || '', 200);
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
    load('');
  }, [authLoading, user, load]);

  const submitSearch = (e) => {
    e.preventDefault();
    setAppliedQ(q.trim());
    load(q.trim());
  };

  const remove = async (row) => {
    const label = `${row.property_type} · ${formatPrice(row.price)}₮ · ID:${String(row.id).slice(0, 8)}`;
    if (!window.confirm(`Энэ зарыг БҮРМӨСӨН устгах уу?\n\n${label}\n\n⚠️ Зургууд нь Storage-оос ч устгагдана. Буцаах боломжгүй.`)) return;
    setBusyId(row.id);
    setNotice('');
    const res = await adminDeleteListing(row.id);
    setBusyId(null);
    if (res.error) {
      setNotice(`❌ ${res.error}`);
      return;
    }
    setNotice(`🗑 Устгагдлаа: ${label} (зураг: ${res.data.imagesRemoved})`);
    load(appliedQ);
  };

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
          <h3 className="mb-2 text-xl font-semibold">Эхлээд нэвтэрнэ үү</h3>
          <Link href="/" className="btn btn-primary mt-4">← Нүүр рүү буцах</Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    const forbidden = loadError.status === 403;
    return (
      <div className="page-container">
        <div className="mx-auto my-6 max-w-[640px] rounded-2xl border border-red-200 bg-white px-6 py-8 text-center">
          <div className="text-4xl">{forbidden ? '⛔' : '🔌'}</div>
          <h3 className="mb-1.5 mt-2.5 text-lg font-semibold text-red-800">
            {forbidden ? 'Танд админ эрх байхгүй' : 'Заруудыг татаж чадсангүй'}
          </h3>
          <p className="[word-break:break-word] rounded-lg border border-red-200 bg-red-50 p-3 text-left text-[13px] text-red-700">
            {loadError.message}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button className="btn btn-outline" onClick={() => load(appliedQ)}>↻ Дахин оролдох</button>
            <Link href="/" className="btn btn-primary">← Нүүр рүү буцах</Link>
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
          <p>Заруудыг ачаалж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">🏷️ Зарын удирдлага — Админ</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Бүх зарыг хайж, <b>ямар ч зарыг устгах</b> боломжтой ({data.total} зар нийт).
            ID-ийн эхний 4+ тэмдэгтээр ч хайж болно. Устгахад зургууд Storage-оос хамт цэвэрлэгдэнэ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/feedback" className="btn btn-outline btn-sm">📨 Санал хүсэлт</Link>
          <Link href="/admin/users" className="btn btn-outline btn-sm">👥 Хэрэглэгчид</Link>
        </div>
      </header>

      {/* ===== ХАЙЛТ ===== */}
      <form onSubmit={submitSearch} className="mb-4 flex flex-wrap items-center gap-2">
        <input
          className="form-input sm:max-w-[420px]"
          placeholder="🔍 Зарын ID / утас / нэр / дүүрэг / хаяг / төрөл..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
          {loading ? 'Хайж байна...' : '🔍 Хайх'}
        </button>
        {(appliedQ || q) && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => { setQ(''); setAppliedQ(''); load(''); }}
          >
            ✕ Цэвэрлэх
          </button>
        )}
      </form>

      {notice && <p className="mb-3 rounded-lg bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-700">{notice}</p>}

      {appliedQ && (
        <p className="mb-3 text-[13px] text-gray-500">
          «<b>{appliedQ}</b>» хайлтад <b>{data.rows.length}</b> илэрц.
          {data.mode === 'id-prefix' && data.scanned
            ? ` (сүүлийн ${data.scanned} зарын дотор ID-ийн эхлэлээр хайв)`
            : ''}
        </p>
      )}

      {/* ===== ЖАГСААЛТ ===== */}
      {data.rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center">
          <div className="mb-3 text-5xl">🔎</div>
          <h3 className="mb-1 text-lg font-semibold">Зар олдсонгүй</h3>
          <p className="text-sm text-gray-500">Хайлтын үгээ өөрчилж үзнэ үү (жишээ: зарын ID-ийн эхний 4 тэмдэгт).</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.rows.map((row) => {
            const isSell = row.category === 'sell';
            const imgCount = Array.isArray(row.images) ? row.images.length : 0;
            return (
              <div key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={`badge ${isSell ? 'badge-sell' : 'badge-rent'}`}>{isSell ? 'Зарах' : 'Түрээс'}</span>
                  <span className="text-[13px] font-semibold text-gray-800">
                    {row.property_type}
                  </span>
                  <span className="text-[14px] font-bold text-primary">₮{formatPrice(row.price)}</span>
                  <span className="font-mono text-[11.5px] text-gray-400" title={row.id}>
                    ID: {String(row.id).slice(0, 8)}
                  </span>
                  <span className="ml-auto text-[12px] text-gray-400">
                    {fmtDate(row.created_at)} · {timeAgo(row.created_at)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-gray-600">
                  <span>📍 {[row.city, row.district, row.khoroo].filter(Boolean).join(', ') || '—'}</span>
                  {row.address_detail && <span>🏠 {row.address_detail}</span>}
                  {row.rooms > 0 && <span>🛏 {row.rooms} өрөө</span>}
                  {row.bathrooms > 0 && <span>🚿 {row.bathrooms} угаалгын өрөө</span>}
                  {row.area > 0 && <span>📐 {row.area} м²</span>}
                  <span>📱 {row.phone || '—'}</span>
                  <span>👤 {row.contact_name || '—'}</span>
                  <span>🖼 {imgCount} зураг</span>
                  <span>👁 {Number(row.views) || 0} · ❤️ {Number(row.likes) || 0}</span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                  <Link href={`/listings/${row.id}`} className="btn btn-outline btn-sm" target="_blank">
                    👁 Харах
                  </Link>
                  <Link href={`/sellers/${row.user_id}`} className="btn btn-outline btn-sm">
                    👤 Зар нийтлэгч
                  </Link>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={busyId === row.id}
                    onClick={() => remove(row)}
                  >
                    {busyId === row.id ? 'Устгаж байна...' : '🗑 Зар устгах'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-[12px] leading-relaxed text-gray-400">
        ℹ️ Устгасан зарыг буцаах боломжгүй. Хэрэглэгч гомдол мэдэгдсэн зар энд ID-гаар нь хайж олж болно —
        санал хүсэлтийн хуудсанд ч зарын холбоос шууд харагдана.
      </p>
    </div>
  );
}
