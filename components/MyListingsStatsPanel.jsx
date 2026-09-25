'use client';

// ============================================================
// MyListingsStatsPanel.jsx — «📈 Статистик» таб
//
// ЗОРИЛГО: зар эзэн ӨӨРИЙН зарууд хэр хандалттай байгааг харах —
//   • Сүүлийн 1 / 3 / 7 / 30 хоногийн хандлага (үзсэн + ❤️)
//   • 30 хоногийн өдөр тутмын график
//   • Аль зар хамгийн их сонирхолтой (эрэмбэлэгдсэн жагсаалт)
//
// Өгөгдөл: `GET /api/my-listings/stats` (зөвхөн сервер, Bearer token).
// Тайлбар ба загварын шийдвэр: lib/listingActivity.js дотор.
//
// ⚠️ ХОЁР ГОРИМ:
//   mode='daily'  → 0010 миграц ажилласан → тоо нь НИЙТ ХАНДАЛТ (page open)
//   mode='unique' → миграцгүй → тоо нь ШИНЭ үзсэн хүн (сануулга харуулна)
// ============================================================
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast, useUI } from './AppProviders';
import { fetchMyListingActivity } from '../lib/myStatsApi';
import { fetchListingById } from '../lib/queries';
import {
  formatPrice,
  formatCount,
  formatDayShort,
  getPropertyIcon,
  formatAddress,
  timeAgo,
} from '../lib/format';
// ⚠️ Хугацааны сонголт ба утга авах логик нь `lib/activityWindows.mjs` дотор —
//    тэндээс `npm run test:activity` тестлэдэг (цэвэр функцууд).
import { PERIODS, isAllTime, pickViews, pickLikes, weekdayShort } from '../lib/activityWindows.mjs';


/**
 * Жижиг баганан график (sparkline).
 * `values` нь ХУУЧИН → ШИНЭ дараалалтай.
 */
function MiniBars({ values, title = 'хандалт', className = '' }) {
  const max = Math.max(1, ...values);
  return (
    <div className={`flex h-9 items-end gap-[3px] ${className}`} aria-hidden="true">
      {values.map((v, i) => (
        <span
          key={`${i}-${v}`}
          title={`${v} ${title}`}
          className={`w-[5px] rounded-sm transition ${v ? 'bg-primary' : 'bg-gray-200'}`}
          style={{ height: `${v ? Math.max(12, (v / max) * 100) : 6}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Том график — сонгосон хугацааны өдөр тутмын хандалт.
 *
 * Дизайны шийдвэрүүд:
 *   • Y тэнхлэг дээр 0 / дунд / хамгийн их гэсэн 3 шугам → тоог нүдээр харьцуулах
 *   • Багана бүр доороосоо өсөхөд `animate-grow-up` (tailwind.config.js)
 *   • Хоног ≤14 үед гарагийн товчлол (Да, Мя, …) — 30 баганад багтахгүй
 *   • Hover: багана тодорч, дээр нь огноо + хандалт + ❤️ гарна
 *   • Өнөөдөр нь НОГООН өнгөөр ялгагдана
 *   • Хандалтгүй өдөр нь бүдэг саарал (0 гэдэг нь тодорхой харагдана)
 */
function ActivityChart({ daily, days }) {
  const slice = useMemo(() => {
    // «Нийт» сонгосон бол бүртгэлтэй бүх 30 хоногийг, эс бөгөөс сонгосон
    // хугацааг (доод хязгаар 7 хоног — 1 багана утгагүй).
    const n = isAllTime(days) ? 30 : Math.min(30, Math.max(7, days));
    return (daily || []).slice(-n);
  }, [daily, days]);

  const max = Math.max(1, ...slice.map((d) => d.views));
  const total = slice.reduce((s, d) => s + d.views, 0);
  const avg = slice.length ? total / slice.length : 0;
  const hasData = total > 0;
  const showWeekday = slice.length <= 14;

  if (!slice.length) {
    return <p className="py-6 text-center text-sm text-gray-400">График харуулах өгөгдөл алга.</p>;
  }

  // Баганын өндрийн хувь (0 байсан ч бага зэрэг харагдуулна)
  const heightOf = (v) => (v > 0 ? Math.max(3, (v / max) * 100) : 1.5);

  return (
    <div>
      {/* ===== Толгой: нийт / дундаж / хамгийн их ===== */}
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[13px] font-semibold text-gray-700">
          Өдөр тутмын хандалт{' '}
          <span className="font-normal text-gray-400">({slice.length} хоног)</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-500">
          <span>
            Нийт <b className={hasData ? 'text-gray-800' : 'text-gray-400'}>{formatCount(total)}</b>
          </span>
          <span className="text-gray-300">·</span>
          <span>
            Өдрийн дундаж <b className="text-gray-800">{avg.toFixed(1)}</b>
          </span>
          <span className="text-gray-300">·</span>
          <span>
            Хамгийн их <b className="text-gray-800">{formatCount(max)}</b>
          </span>
        </div>
      </div>

      {!hasData && (
        <p className="mb-3 rounded-lg bg-primary-light px-3 py-2 text-[12px] leading-relaxed text-primary">
          📭 Энэ хугацаанд хандалт бүртгэгдээгүй байна. Зар нэмэгдсэн эсвэл шинэчлэгдсэн
          үед энд харагдаж эхэлнэ.
        </p>
      )}

      {/* ===== График ===== */}
      <div className="flex gap-2">
        {/* Y тэнхлэгийн шошго */}
        <div className="flex h-40 w-9 shrink-0 flex-col justify-between pb-5 pt-1 text-right text-[10px] tabular-nums text-gray-400">
          <span>{formatCount(max)}</span>
          <span>{formatCount(Math.round(max / 2))}</span>
          <span>0</span>
        </div>

        <div className="relative h-40 flex-1">
          {/* Хэвтээ grid шугам */}
          <div className="pointer-events-none absolute inset-x-0 bottom-5 top-1 flex flex-col justify-between">
            <span className="h-px w-full bg-gray-100" />
            <span className="h-px w-full bg-gray-100" />
            <span className="h-px w-full bg-gray-200" />
          </div>

          {/* Баганууд */}
          <div className="absolute inset-x-0 bottom-5 top-1 flex items-end gap-[3px]">
            {slice.map((d, i) => {
              const isToday = i === slice.length - 1;
              return (
                <div
                  key={d.day}
                  className="group relative flex h-full flex-1 items-end"
                  title={`${d.day} (${weekdayShort(d.day)}) — ${d.views} хандалт, ${d.likes} ❤️`}
                >
                  {/* Hover tooltip */}
                  <span className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[10px] font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">
                    {formatDayShort(d.day)} · {d.views} хандалт{d.likes ? ` · ${d.likes} ❤️` : ''}
                  </span>

                  <div
                    className={`w-full origin-bottom animate-grow-up rounded-t-[3px] transition-all duration-200 group-hover:opacity-90 ${
                      d.views === 0
                        ? 'bg-gray-200'
                        : isToday
                          ? 'bg-gradient-to-t from-secondary to-secondary/60 group-hover:to-secondary'
                          : 'bg-gradient-to-t from-primary to-primary/45 group-hover:to-primary'
                    }`}
                    style={{ height: `${heightOf(d.views)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== X тэнхлэг: гарагийн товчлол (≤14 багана) эсвэл огнооны хил ===== */}
      {showWeekday ? (
        <div className="mt-1 flex gap-2">
          <div className="w-9 shrink-0" />
          <div className="flex flex-1 gap-[3px]">
            {slice.map((d, i) => (
              <span
                key={d.day}
                className={`flex-1 text-center text-[9px] ${
                  i === slice.length - 1 ? 'font-bold text-secondary' : 'text-gray-400'
                }`}
              >
                {weekdayShort(d.day)}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-1 flex gap-2 text-[10px] text-gray-400">
          <div className="w-9 shrink-0" />
          <div className="flex flex-1 justify-between">
            <span>{formatDayShort(slice[0] && slice[0].day)}</span>
            <span>30 хоногийн өмнөхөөс өнөөдөр хүртэл</span>
          </div>
        </div>
      )}

      {/* ===== Тэмдэглэл (legend) ===== */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-100 pt-2 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-primary to-primary/45" />
          Хандалт
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gradient-to-t from-secondary to-secondary/60" />
          Өнөөдөр
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-gray-200" />
          Хандалтгүй
        </span>
        <span className="ml-auto">💡 Багана дээр хулганаа аваачиж дэлгэрэнгүйг харна уу</span>
      </div>
    </div>
  );
}

/** Том тоон карт */
function StatCard({ icon, label, value, sub, accent = 'text-gray-900' }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">
        {icon} {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-gray-500">{sub}</p>}
    </div>
  );
}

export default function MyListingsStatsPanel() {
  const { showToast } = useToast();
  const { openEdit, dataVersion } = useUI();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null); // ✏️ Засах дарах үед (full мөр татаж байна)

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchMyListingActivity();
    if (res.error) {
      setError(res.error);
      setData(null);
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, []);

  /**
   * Зарыг ЗАСАХ — статистик табаас шууд.
   *
   * ⚠️ Статистикийн API нь зөвхөн шаардлагатай багануудыг буцаадаг тул
   *    (build_year, description, latitude … байхгүй) засах модульд шууд
   *    дамжуулж БОЛОХГҮЙ — эс бөгөөд хадгалахад тэр талбарууд ХООСОН болно.
   *    Тиймээс эхлээд бүтэн мөрийг татаж (`fetchListingById`), дараа нь нээнэ.
   */
  const handleEdit = useCallback(
    async (listing) => {
      if (!openEdit || !listing) return;
      setBusyId(listing.id);
      try {
        const full = await fetchListingById(listing.id);
        if (!full) throw new Error('Зар олдсонгүй (аль хэдийн устсан байж болно).');
        openEdit(full);
      } catch (err) {
        showToast((err && err.message) || 'Зарыг нээж чадсангүй.', 'error');
      } finally {
        setBusyId(null);
      }
    },
    [openEdit, showToast]
  );

  useEffect(() => {
    load();
    // `dataVersion` — зар засаж/нэмж/устгасны дараа статистикийг АВТОМАТААР
    // шинэчилнэ (AppProviders → notifyListingsChanged).
  }, [load, dataVersion]);

  const mode = data && data.mode;
  const isDaily = mode === 'daily';
  const period = PERIODS.find((p) => p.days === days) || PERIODS[2];

  // ---- Сонгосон хугацаагаар эрэмбэлэх ----
  // ⚠️ Сервер нь 30 ХОНОГИЙН хандалтаар эрэмбэлдэг (тогтмол). Хэрэглэгч
  // «3 хоног» сонгоход тэр эрэмбэ БУРУУ болно — 30 хоногийн аварга зар 3 хоногт
  // 0 хандалттай байж болно. Тиймээс сонгосон цонхоор ДАХИН эрэмбэлнэ:
  //   1) тухайн хугацааны хандалт → 2) ❤️ → 3) бүх хугацааны үзсэн хүн
  const ranked = useMemo(() => {
    const arr = [...((data && data.listings) || [])];
    arr.sort(
      (a, b) =>
        pickViews(b, days) - pickViews(a, days) ||
        pickLikes(b, days) - pickLikes(a, days) ||
        b.uniqueViews - a.uniqueViews
    );
    return arr;
  }, [data, days]);

  // Энэ хугацаанд огт хандалт аваагүй бол «🏆» хэсгийг харуулахгүй —
  // эс бөгөөд 0 дээр «хамгийн эрэлттэй» гэж ХУДАЛ онцлох болно.
  const top = ranked[0] || null;
  const topViews = pickViews(top, days);
  const topLikes = pickLikes(top, days);
  const topActive = topViews > 0 || topLikes > 0;

  // ---- Ачаалж байна ----
  if (loading && !data) {
    return (
      <div className="px-5 py-16 text-center">
        <div className="spinner"></div>
        <p className="mt-2 text-gray-500">Хандалтын статистикийг бодож байна...</p>
      </div>
    );
  }

  // ---- Алдаа ----
  if (error && !data) {
    return (
      <div className="px-5 py-16 text-center">
        <div className="mb-3 text-5xl">📉</div>
        <h3 className="mb-1 text-lg font-semibold">Статистик ачаалж чадсангүй</h3>
        <p className="mx-auto max-w-md text-sm text-gray-500">{error}</p>
        <button type="button" className="btn btn-primary mt-4" onClick={load}>🔄 Дахин оролдох</button>
      </div>
    );
  }

  // ---- Зар байхгүй ----
  if (!data || !data.listings.length) {
    return (
      <div className="px-5 py-16 text-center">
        <div className="mb-3 text-5xl">📊</div>
        <h3 className="mb-1 text-lg font-semibold">Хандалтын статистик хараахан алга</h3>
        <p className="mx-auto max-w-md text-sm text-gray-500">
          Танд зар байхгүй байна. Зар нэмсний дараа хэн үзсэн, хэдэн хандалт авсан
          зэргийг эндээс харна.
        </p>
      </div>
    );
  }

  const { totals, daily } = data;
  const periodViews = pickViews(totals, days);
  const periodLikes = pickLikes(totals, days);
  const allTime = isAllTime(days);

  return (
    <div>
      {/* ===== Хугацаа сонгох + шинэчлэх ===== */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="segmented">
          {PERIODS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => setDays(p.days)}
              aria-pressed={days === p.days}
              className={`segmented-item ${days === p.days ? 'segmented-item-active' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {data.generatedAt && (
            <span className="text-[12px] text-gray-400">
              Шинэчлэгдсэн: {timeAgo(data.generatedAt)}
            </span>
          )}
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={async () => {
              await load();
              showToast('Статистик шинэчлэгдлээ');
            }}
            disabled={loading}
          >
            <span className={loading ? 'animate-spin' : ''}>🔄</span>
            Шинэчлэх
          </button>
        </div>
      </div>

      {/* ===== Миграцын сануулга (mode='unique') ===== */}
      {!isDaily && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] leading-relaxed text-amber-900">
          <b>⚠️ Хандалтын давтамж (page open) хараахан бүртгэгдэхгүй байна.</b>
          <br />
          Одоо 1/3/7/30 хоног гэсэн тоо нь тухайн хугацаанд давхардалгүй үзсэн хүний тоо
          (нэг хүн зөвхөн нэг удаа тоологдоно). «Сүүлийн 1 хоногт 24 хандалт» гэсэн бодит
          давтамжийг харахын тулд нэмэлт хүснэгт шаардлагатай:
          <br />
          <code className="mt-2 inline-block rounded bg-amber-100 px-2 py-1 font-mono text-[12px]">
            npm run stats:setup
          </code>{' '}
          → SQL Editor дээр <code className="rounded bg-amber-100 px-1 font-mono">Run</code> →
          дараа нь <code className="rounded bg-amber-100 px-1 font-mono">npm run stats:check</code>
        </div>
      )}

      {/* ===== Хураангуй картууд ===== */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon="🏠"
          label="Миний зарууд"
          value={formatCount(totals.listings)}
          sub="Нийт идэвхтэй зар"
        />
        <StatCard
          icon="👁"
          label={`${isDaily ? 'Хандалт' : 'Үзсэн'} (${period.label})`}
          value={formatCount(periodViews)}
          sub={allTime ? 'Бүх хугацаа, давхардалгүй' : `Нийт үзсэн хүн: ${formatCount(totals.uniqueViews)}`}
          accent="text-primary"
        />
        <StatCard
          icon="❤️"
          label={`Таалагдсан (${period.label})`}
          value={formatCount(periodLikes)}
          sub={allTime ? 'Бүх хугацаа' : `Нийт ❤️: ${formatCount(totals.uniqueLikes)}`}
          accent="text-red-500"
        />
        <StatCard
          icon="🔥"
          label={`Хамгийн эрэлттэй (${period.label})`}
          value={topActive ? formatCount(topViews) : '—'}
          sub={
            !top
              ? 'Зар байхгүй'
              : topActive
                ? `${top.property_type} · ${top.district || top.city || ''}`
                : 'Энэ хугацаанд хандалт алга'
          }
          accent="text-secondary"
        />
      </div>

      {/* ===== Өдөр тутмын график ===== */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        {isDaily ? (
          <ActivityChart daily={daily} days={days} />
        ) : (
          <p className="py-6 text-center text-[13px] text-gray-400">
            Өдөр тутмын график нь хандалтын бүртгэл (0010) ажилласны дараа харагдана.
          </p>
        )}
      </div>

      {/* ===== 🏆 Хамгийн эрэлттэй зар (сонгосон хугацаанд) ===== */}
      {top && topActive && (
        <div className="mb-4 rounded-xl border-2 border-secondary/30 bg-gradient-to-r from-secondary/5 to-transparent p-4">
          <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-secondary">
            🏆 Хамгийн их {isDaily ? 'хандалттай' : 'үзсэн'} зар ({period.label})
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              {top.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={top.images[0]} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">
                  {getPropertyIcon(top.property_type)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">
                {getPropertyIcon(top.property_type)} {top.property_type}
                {top.rooms > 0 && ` · ${top.rooms} өрөө`}
                {top.area > 0 && ` · ${top.area} м²`}
              </p>
              <p className="text-[13px] text-gray-500">📍 {formatAddress(top) || '—'}</p>
              <p className="text-[13px] font-semibold text-gray-700">💰 ₮{formatPrice(top.price)}</p>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{formatCount(topViews)}</p>
                <p className="text-[11px] text-gray-500">{isDaily ? 'хандалт' : 'үзсэн'}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{formatCount(topLikes)}</p>
                <p className="text-[11px] text-gray-500">❤️</p>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleEdit(top)}
                disabled={busyId === top.id}
                title="Энэ зарыг засах"
              >
                {busyId === top.id ? '⏳ Нээж байна…' : '✏️ Засах'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Зар тус бүрийн хандлага ===== */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">
          Зар тус бүрийн хандлага{' '}
          <span className="text-sm font-normal text-gray-500">({period.label})</span>
        </h2>
        <p className="text-[12px] text-gray-400">Сонгосон хугацааны хандалтаар, ихтэй нь эхэнд</p>
      </div>

      <div className="flex flex-col gap-3">
        {ranked.map((l, idx) => {
          const v = pickViews(l, days);
          const k = pickLikes(l, days);
          return (
            <div
              key={l.id}
              className={`rounded-xl border bg-white p-4 ${
                idx === 0 ? 'border-secondary/40' : 'border-gray-200'
              }`}
            >
              <div className="flex flex-wrap items-center gap-4">
                {/* 🏅 Эрэмбэ */}
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                    idx === 0
                      ? 'bg-secondary text-white'
                      : idx < 3
                        ? 'bg-primary/10 text-primary'
                        : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {idx + 1}
                </span>

                {/* 📷 Зураг */}
                <div className="h-14 w-18 shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-16 sm:w-20">
                  {l.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.images[0]} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xl">
                      {getPropertyIcon(l.property_type)}
                    </div>
                  )}
                </div>

                {/* 📝 Гарчиг */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {getPropertyIcon(l.property_type)} {l.property_type}
                    {l.rooms > 0 && ` · ${l.rooms} өрөө`}
                    {l.area > 0 && ` · ${l.area} м²`}
                  </p>
                  <p className="truncate text-[13px] text-gray-500">📍 {formatAddress(l) || '—'}</p>
                  <p className="text-[12px] text-gray-400">
                    💰 ₮{formatPrice(l.price)} · 📅 {timeAgo(l.created_at)}
                  </p>
                </div>

                {/* 📊 Тоо + sparkline */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-primary">{formatCount(v)}</p>
                    <p className="text-[11px] text-gray-500">{isDaily ? 'хандалт' : 'үзсэн'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-red-500">{formatCount(k)}</p>
                    <p className="text-[11px] text-gray-500">❤️</p>
                  </div>
                  <div className="hidden w-28 sm:block">
                    <MiniBars values={l.spark.slice(-7)} />
                    <p className="mt-0.5 text-center text-[10px] text-gray-400">сүүлийн 7 хоног</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleEdit(l)}
                    disabled={busyId === l.id}
                    title="Энэ зарыг засах"
                  >
                    {busyId === l.id ? '⏳ Нээж байна…' : '✏️ Засах'}
                  </button>
                </div>
              </div>

              {/* Нийт үзүүлэлтүүд — «Нийт» сонгосон үед давхардахгүйн тулд нуух */}
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-gray-100 pt-2 text-[12px] text-gray-500">
                {!allTime && (
                  <>
                    <span>
                      Нийт үзсэн хүн: <b className="text-gray-700">{formatCount(l.uniqueViews)}</b>
                    </span>
                    <span>
                      Нийт ❤️: <b className="text-gray-700">{formatCount(l.uniqueLikes)}</b>
                    </span>
                  </>
                )}
                {v === 0 && (
                  <span className="text-amber-600">
                    ⚠️ {allTime ? 'Хараахан хандалт аваагүй' : 'Энэ хугацаанд хандалт алга'} — зар
                    эсвэл үнээ шинэчлэх үү?
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Тайлбар ===== */}
      <div className="mt-5 rounded-lg bg-gray-50 p-3 text-[12px] leading-relaxed text-gray-500">
        <b className="text-gray-600">Хэмжүүрүүдийн утга:</b>{' '}
        <b>Нийт</b> = бүх хугацаанд давхардалгүй үзсэн хүн / ❤️.{' '}
        {isDaily ? (
          <>
            1/3/7/30 хоног сонгоход <b>хандалт</b> = тухайн хугацаанд зарын хуудас
            нээгдсэн тоо (нэг хүн давтан нээвэл давтан тоологдоно).
          </>
        ) : (
          <>
            1/3/7/30 хоног сонгоход <b>үзсэн</b> = тухайн хугацаанд анх үзсэн хүний тоо
            (нэг хүн зөвхөн нэг удаа тоологдоно).
          </>
        )}
      </div>
    </div>
  );
}



