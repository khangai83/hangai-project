'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AppProviders';
import { fetchAdminFeedback, updateFeedback } from '../lib/adminApi';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES } from '../lib/queries';
import { timeAgo } from '../lib/format';

const STATUS_MAP = Object.fromEntries(FEEDBACK_STATUSES.map((s) => [s.value, s]));
const CATEGORY_MAP = Object.fromEntries(FEEDBACK_CATEGORIES.map((c) => [c.value, c]));

/** 97688093663 / +97688093663 → 88093663 */
function displayPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
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

const TABS = [
  { key: 'all', label: '🗂 Бүгд' },
  { key: 'new', label: '🆕 Шинэ' },
  { key: 'read', label: '👁 Харсан' },
  { key: 'resolved', label: '✅ Шийдсэн' },
];

/**
 * АДМИН — Хэрэглэгчээс ирсэн санал хүсэлт (/admin/feedback).
 *
 * ⚠️ Өгөгдлийг `/api/admin/feedback` (service_role) -оос авна. RLS нь энгийн
 *    хэрэглэгчид зөвхөн өөрийн мөрийг уншихыг зөвшөөрдөг тул админ бүгдийг
 *    харахын тулд сервер талын route шаардлагатай.
 */
export default function AdminFeedbackClient() {
  const { user, authLoading } = useAuth();
  const [data, setData] = useState(null); // { rows, stats }
  const [loadError, setLoadError] = useState(null); // { message, status }
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [noteDraft, setNoteDraft] = useState({}); // { [id]: string }

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchAdminFeedback();
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

  /** Төлөв солих эсвэл админы тэмдэглэл хадгалах */
  const patch = async (row, body, okMsg) => {
    setBusyId(row.id);
    setNotice('');
    const res = await updateFeedback(row.id, body);
    setBusyId(null);
    if (res.error) {
      setNotice(`❌ ${res.error}`);
      return;
    }
    if (okMsg) setNotice(okMsg);
    load();
  };

  const rows = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.rows
      .filter((r) => (tab === 'all' ? true : r.status === tab))
      .filter((r) =>
        !q
          ? true
          : [r.subject, r.message, r.contact_name, r.phone, r.admin_note]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q))
      );
  }, [data, tab, query]);

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
            {forbidden ? 'Танд админ эрх байхгүй' : 'Санал хүсэлт татаж чадсангүй'}
          </h3>
          <p className="[word-break:break-word] rounded-lg border border-red-200 bg-red-50 p-3 text-left text-[13px] text-red-700">
            {loadError.message}
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <button className="btn btn-outline" onClick={load}>↻ Дахин оролдох</button>
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
          <p>Санал хүсэлтийг ачаалж байна...</p>
        </div>
      </div>
    );
  }

  const stats = data.stats || { total: 0, new: 0, read: 0, resolved: 0 };

  return (
    <div className="page-container">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">📨 Санал хүсэлт — Админ</h1>
          <p className="mt-1 text-[13px] text-gray-500">
            Хэрэглэгчээс ирсэн санал, гомдол, алдааны мэдэгдэл. Төлөв сольж, хариу бичиж болно
            (хариу нь хэрэглэгчийн «Миний илгээсэн саналууд» хэсэгт харагдана).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/users" className="btn btn-outline btn-sm">👥 Хэрэглэгчид</Link>
          <button type="button" className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Татаж байна...' : '↻ Шинэчлэх'}
          </button>
        </div>
      </header>

      {/* ===== СТАТИСТИК ===== */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div className="text-[12px] uppercase tracking-wide text-gray-400">Нийт</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary-light/40 px-4 py-3">
          <div className="text-[12px] uppercase tracking-wide text-primary">🆕 Шинэ</div>
          <div className="text-2xl font-bold text-primary">{stats.new}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="text-[12px] uppercase tracking-wide text-amber-700">👁 Харсан</div>
          <div className="text-2xl font-bold text-amber-800">{stats.read}</div>
        </div>
        <div className="rounded-xl border border-secondary/20 bg-secondary/5 px-4 py-3">
          <div className="text-[12px] uppercase tracking-wide text-secondary-dark">✅ Шийдсэн</div>
          <div className="text-2xl font-bold text-secondary-dark">{stats.resolved}</div>
        </div>
      </div>

      {/* ===== ШҮҮЛТ ===== */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition ${
                tab === t.key ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
              {t.key !== 'all' ? ` (${stats[t.key] || 0})` : ` (${stats.total})`}
            </button>
          ))}
        </div>
        <input
          className="form-input sm:max-w-[280px]"
          placeholder="🔍 Нэр, утас, текстээр хайх..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {notice && <p className="mb-3 rounded-lg bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-700">{notice}</p>}

      {/* ===== ЖАГСААЛТ ===== */}
      {rows.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center">
          <div className="mb-3 text-5xl">📭</div>
          <h3 className="mb-1 text-lg font-semibold">Санал хүсэлт байхгүй</h3>
          <p className="text-sm text-gray-500">
            {data.rows.length === 0
              ? 'Хэрэглэгчдээс санал хүсэлт ирээгүй байна.'
              : 'Энэ шүүлтэд тохирох санал олдсонгүй.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((f) => {
            const st = STATUS_MAP[f.status] || STATUS_MAP.new;
            const cat = CATEGORY_MAP[f.category] || CATEGORY_MAP.other;
            const noteValue = noteDraft[f.id] !== undefined ? noteDraft[f.id] : (f.admin_note || '');
            return (
              <div key={f.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
                <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[12px] font-semibold text-gray-700">
                    {cat.label}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.className}`}>
                    {st.label}
                  </span>
                  <span className="text-[13px] font-semibold text-gray-800">👤 {f.contact_name || '—'}</span>
                  {f.phone && (
                    <a href={`tel:+976${String(f.phone).replace(/^\D*976/, '').replace(/\D/g, '')}`} className="text-[13px] text-gray-500 hover:text-primary">
                      📱 {displayPhone(f.phone)}
                    </a>
                  )}
                  <span className="ml-auto text-[12px] text-gray-400">
                    {fmtDate(f.created_at)} · {timeAgo(f.created_at)}
                  </span>
                </div>

                {f.subject && <h3 className="text-[15px] font-semibold text-gray-900">{f.subject}</h3>}
                <p className="whitespace-pre-line text-[14px] leading-relaxed text-gray-700">{f.message}</p>

                {/* ===== АДМИНЫ ТЭМДЭГЛЭЛ / ХАРИУ ===== */}
                <div className="mt-3">
                  <label className="form-label" htmlFor={`note-${f.id}`}>
                    Админы тэмдэглэл / хариу{' '}
                    <span className="font-normal text-gray-400">(хэрэглэгчид харагдана)</span>
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      id={`note-${f.id}`}
                      className="form-input"
                      placeholder="Жишээ: Алдааг зассан, дахин шалгана уу."
                      value={noteValue}
                      onChange={(e) => setNoteDraft((d) => ({ ...d, [f.id]: e.target.value }))}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm shrink-0"
                      disabled={busyId === f.id}
                      onClick={() => patch(f, { adminNote: noteValue }, '💾 Тэмдэглэл хадгалагдлаа')}
                    >
                      💾 Хадгалах
                    </button>
                  </div>
                </div>

                {/* ===== ТӨЛӨВ ===== */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                  <span className="text-[12px] font-semibold text-gray-400">Төлөв:</span>
                  {FEEDBACK_STATUSES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      disabled={busyId === f.id || f.status === s.value}
                      onClick={() => patch(f, { status: s.value }, `Төлөв солигдлоо: ${s.label}`)}
                      className={`rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition disabled:opacity-50 ${
                        f.status === s.value
                          ? 'border-gray-300 bg-gray-100 text-gray-500'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                  <span className="ml-auto font-mono text-[11px] text-gray-300">ID: {String(f.id).slice(0, 8)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
