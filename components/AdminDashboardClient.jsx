'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './AppProviders';
import { fetchAdminStats } from '../lib/adminApi';
import { formatPrice, timeAgo } from '../lib/format';
import AdminNav from './AdminNav';

/** 97688093663 / +97688093663 → 88093663 */
function displayPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '—';
  return digits.length > 8 ? digits.slice(-8) : digits;
}

/** '2026-09-25' → '09-25' */
function shortDay(key) {
  return String(key || '').slice(5);
}

/** Том тоог мянгатаар: 1234 → '1,234' */
function num(value) {
  return Math.round(Number(value) || 0).toLocaleString('en-US');
}

/** KPI карт */
function Card({ icon, label, value, sub, tone = 'gray', href }) {
  const tones = {
    blue: 'border-primary/20 bg-primary-light',
    green: 'border-secondary/20 bg-secondary/5',
    amber: 'border-amber-200 bg-amber-50',
    gray: 'border-gray-200 bg-white',
  };
  const body = (
    <>
      <div className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">
        {icon} {label}
      </div>
      <div className="mt-1 text-3xl font-bold text-gray-900">{value}</div>
      {sub && <div className="mt-1 text-[12.5px] text-gray-500">{sub}</div>}
    </>
  );
  const cls = `block rounded-xl border px-5 py-4 shadow-card transition ${tones[tone] || tones.gray}`;
  return href ? (
    <Link href={href} className={`${cls} hover:border-primary hover:shadow-card-hover`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Хугацааны мөр (Өнөөдөр / 7 хоног / 30 хоног) */
function PeriodRow({ label, today, week, month }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="px-4 py-2.5 font-medium text-gray-700">{label}</td>
      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900">{num(today)}</td>
      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900">{num(week)}</td>
      <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900">{num(month)}</td>
    </tr>
  );
}

export default function AdminDashboardClient() {
  const { user, authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchAdminStats();
    setLoading(false);
    if (res.error) {
      setLoadError({ message: res.error, status: res.status || null });
      return;
    }
    setLoadError(null);
    setStats(res.data.stats);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStats(null);
      setLoadError(null);
      return;
    }
    load();
  }, [authLoading, user, load]);

  // ---------- Нэвтрээгүй ----------
  if (!authLoading && !user) {
    return (
      <div className="page-container">
        <div className="mx-auto max-w-[720px] rounded-xl border border-gray-200 bg-white px-6 py-10 text-center shadow-card">
          <div className="text-4xl">🔒</div>
          <h1 className="mt-2 text-xl font-bold text-gray-900">Админ хэсэг</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Хяналтын самбарыг үзэхийн тулд админ эрхтэйгээр нэвтэрнэ үү.
          </p>
        </div>
      </div>
    );
  }

  // ---------- Алдаа / эрхгүй ----------
  if (loadError) {
    return (
      <div className="page-container">
        <div className="mx-auto max-w-[720px] rounded-xl border border-red-200 bg-white px-6 py-10 text-center shadow-card">
          <div className="text-4xl">⛔</div>
          <h1 className="mt-2 text-xl font-bold text-red-800">
            {loadError.status === 403 ? 'Танд админ эрх байхгүй' : 'Алдаа гарлаа'}
          </h1>
          <p className="mt-1.5 text-sm text-gray-600">{loadError.message}</p>
          <button className="btn btn-outline btn-sm mt-4" onClick={load} disabled={loading}>
            {loading ? 'Ачаалж байна...' : '↻ Дахин оролдох'}
          </button>
        </div>
      </div>
    );
  }

  // ---------- Ачаалж байна ----------
  if (!stats) {
    return (
      <div className="page-container">
        <div className="py-16 text-center">
          <div className="spinner mx-auto"></div>
          <p className="mt-3 text-sm text-gray-500">Статистик ачаалж байна...</p>
        </div>
      </div>
    );
  }

  const L = stats.listings;
  const U = stats.users;
  const F = stats.feedback;
  const maxViews = Math.max(1, ...stats.series.map((s) => s.views));
  const maxListings = Math.max(1, ...stats.series.map((s) => s.listings));

  return (
    <div className="page-container">
      <div className="mx-auto max-w-[1280px]">
        {/* ===== ТОЛГОЙ + ADMIN НАВИГАЦИ ===== */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Хяналтын самбар</h1>
            <p className="mt-1 text-sm text-gray-500">
              Зарууд · хэрэглэгчид · хандалт · санал хүсэлтийн нэгдсэн статистик
            </p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
            {loading ? 'Ачаалж байна...' : '↻ Шинэчлэх'}
          </button>
        </header>

        <AdminNav active="/admin" className="mb-6" />

        {/* ===== ГОЛ KPI КАРТУУД ===== */}
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card
            icon="🏷️"
            label="Нийт зар"
            value={num(L.total)}
            sub={`өнөөдөр +${num(L.today)} · 7 хоногт +${num(L.week)}`}
            tone="blue"
            href="/admin/listings"
          />
          <Card
            icon="👥"
            label="Нийт хэрэглэгч"
            value={num(U.total)}
            sub={`өнөөдөр +${num(U.today)} · 7 хоногт +${num(U.week)}`}
            tone="green"
            href="/admin/users"
          />
          <Card
            icon="👁"
            label="Нийт хандалт"
            value={num(L.totalViews)}
            sub={`1 зарт дунджаар ${num(L.avgViews)} · ❤️ ${num(L.totalLikes)}`}
            tone="amber"
          />
          <Card
            icon="💬"
            label="Санал хүсэлт"
            value={num(F.total)}
            sub={`шийдэгдээгүй ${num(F.openCount)} · шийдэгдсэн ${num(F.resolved)}`}
            href="/admin/feedback"
          />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card
            icon="⚡"
            label="Өнөөдөр идэвхтэй"
            value={num(stats.activeToday)}
            sub="зар оруулсан эсвэл нэвтэрсэн"
          />
          <Card
            icon="🖼"
            label="Зурагтай зар"
            value={num(L.withImages)}
            sub={L.total ? `${Math.round((L.withImages / L.total) * 100)}% нь зурагтай` : '—'}
          />
          <Card
            icon="⚖️"
            label="Зарах / Түрээслэх"
            value={`${num(L.byCategory.sell || 0)} / ${num(L.byCategory.rent || 0)}`}
            sub={`${Object.keys(L.byCity).length} хот · ${Object.keys(L.byType).length} төрөл`}
          />
        </div>

        {/* ===== ХУГАЦААГААР (хүснэгт) ===== */}
        <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
          <h2 className="border-b border-gray-100 px-4 py-3 text-[15px] font-bold text-gray-900">
            📈 Хугацаагаар
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-[12px] uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2 text-left font-semibold">Юу</th>
                <th className="px-4 py-2 text-right font-semibold">Өнөөдөр</th>
                <th className="px-4 py-2 text-right font-semibold">7 хоног</th>
                <th className="px-4 py-2 text-right font-semibold">30 хоног</th>
              </tr>
            </thead>
            <tbody>
              <PeriodRow label="🆕 Шинэ зар" today={L.today} week={L.week} month={L.month} />
              <PeriodRow label="👤 Шинэ хэрэглэгч" today={U.today} week={U.week} month={U.month} />
              <tr className="border-t border-gray-100">
                <td className="px-4 py-2.5 font-medium text-gray-700">🏷️ Нийт зар (одоо)</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900" colSpan={3}>
                  {num(L.total)}
                </td>
              </tr>
              <tr className="border-t border-gray-100">
                <td className="px-4 py-2.5 font-medium text-gray-700">👁 Нийт хандалт (одоо)</td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900" colSpan={3}>
                  {num(L.totalViews)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ===== СҮҮЛИЙН 14 ХОНОГИЙН ГРАФИК ===== */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-card">
          <h2 className="mb-1 text-[15px] font-bold text-gray-900">📊 Сүүлийн 14 хоног</h2>
          <p className="mb-4 text-[12.5px] text-gray-500">
            Босоо багана = тухайн өдөр оруулсан <b>зар</b>, шугаман доод хэсэг = <b>хандалт</b>
            {stats.series.every((s) => s.views === 0) && (
              <span className="text-amber-700">
                {' '}⚠️ Хандалтын өдөр тутмын тоо хоосон — `0010_listing_activity_daily.sql` ажиллуулна уу
              </span>
            )}
          </p>
          <div className="flex h-[150px] items-end gap-1.5">
            {stats.series.map((s) => {
              const h = Math.round((s.listings / maxListings) * 100);
              const vh = Math.round((s.views / maxViews) * 100);
              return (
                <div key={s.day} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${s.day}\n🆕 ${s.listings} зар\n👤 ${s.users} хэрэглэгч\n👁 ${s.views} хандалт`}>
                  <span className="text-[10px] font-semibold text-gray-500 opacity-0 transition group-hover:opacity-100">
                    {s.listings}
                  </span>
                  <div
                    className="w-full rounded-t bg-gradient-to-b from-[#4B8EF8] to-[#1D4ED8]"
                    style={{ height: `${Math.max(2, h)}%` }}
                  />
                  <div
                    className="w-full rounded-b bg-amber-300"
                    style={{ height: `${Math.max(1, vh)}%` }}
                  />
                  <span className="whitespace-nowrap text-[9.5px] text-gray-400">{shortDay(s.day)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ===== ХАМГИЙН ИХ ҮЗСЭН ЗАРУУД + СҮҮЛИЙН БҮРТГЭЛ ===== */}
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
            <h2 className="border-b border-gray-100 px-4 py-3 text-[15px] font-bold text-gray-900">
              🔥 Хамгийн их үзсэн зарууд
            </h2>
            {L.topViewed.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Зар байхгүй.</p>
            ) : (
              <ol className="divide-y divide-gray-100">
                {L.topViewed.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-5 shrink-0 text-[12px] font-bold text-gray-400">{i + 1}</span>
                    <Link href={`/listings/${t.id}`} className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-800 hover:text-primary">
                      {t.title || 'Зар'}
                    </Link>
                    <span className="shrink-0 text-[12px] font-semibold text-gray-700">₮{formatPrice(t.price)}</span>
                    <span className="w-14 shrink-0 text-right text-[12px] font-bold tabular-nums text-primary">👁 {num(t.views)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
            <h2 className="border-b border-gray-100 px-4 py-3 text-[15px] font-bold text-gray-900">
              👤 Хамгийн сүүлийн бүртгэлүүд
            </h2>
            {U.recent.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Хэрэглэгч байхгүй.</p>
            ) : (
              <ol className="divide-y divide-gray-100">
                {U.recent.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-light text-[12px] font-bold text-primary">
                      {String(u.name || u.phone || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gray-800">
                      {u.name || 'Нэргүй'}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-gray-500">{displayPhone(u.phone)}</span>
                    <span className="w-16 shrink-0 text-right text-[11.5px] text-gray-400">{timeAgo(u.createdAt)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* ===== ТӨРӨЛ / ХОТЫН ЗАДАРГАА ===== */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {[
            { title: '🏷️ Төрлөөр', data: L.byType },
            { title: '🏙 Хотоор', data: L.byCity },
          ].map((block) => {
            const entries = Object.entries(block.data).sort((a, b) => b[1] - a[1]).slice(0, 8);
            const max = Math.max(1, ...entries.map(([, n]) => n));
            return (
              <div key={block.title} className="rounded-xl border border-gray-200 bg-white p-4 shadow-card">
                <h2 className="mb-3 text-[15px] font-bold text-gray-900">{block.title}</h2>
                {entries.length === 0 ? (
                  <p className="text-sm text-gray-500">Мэдээлэл байхгүй.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {entries.map(([label, n]) => (
                      <li key={label} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 truncate text-[12.5px] text-gray-600" title={label}>{label}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                          <span
                            className="block h-full rounded-full bg-primary/70"
                            style={{ width: `${Math.round((n / max) * 100)}%` }}
                          />
                        </span>
                        <span className="w-8 shrink-0 text-right text-[12px] font-semibold tabular-nums text-gray-700">{num(n)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

