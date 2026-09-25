'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { fetchPricePerM2Stats } from '../lib/queries';
import { normalizeError } from '../lib/errors';
import { formatPrice } from '../lib/format';
import { CITIES } from '../lib/locationData';
import { BOM, REFERENCE_PRICE_PER_M2 } from '../lib/marketData';

/** 4200000 → '4.2 сая' */
function shortMoney(n) {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} тэрбум`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} сая`;
  return formatPrice(v);
}

/**
 * ҮНИЙН СТАТИСТИК — манай өөрийн заруудаас бодсон ₮/м² (дүүрэг, хороогоор).
 *
 * ⚠️ Гадны статистикийг автоматаар татах боломжгүй (1212.mn/unegui.mn нь bot
 *    хамгаалалттай) тул эх сурвалжийг тодорхой харуулна:
 *      • Дүүрэг/хорооны ₮/м² — МАНАЙ ЗАРУУД (N зар, огноо)
 *      • Гадны лавлагаа — Монголбанкны бодлогын хүү/инфляц (албан ёсны)
 *      • Бусад гадны тоо — lib/marketData.js → REFERENCE_PRICE_PER_M2 (гараар)
 */
export default function PriceStatsClient() {
  const [city, setCity] = useState('Улаанбаатар');
  const [tab, setTab] = useState('district'); // district | khoroo
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setData(null);
    setError(null);
    try {
      setData(await fetchPricePerM2Stats({ city }));
    } catch (err) {
      const e = normalizeError(err);
      console.error(e);
      setError(e);
    }
  }, [city]);

  useEffect(() => {
    load();
  }, [load]);

  const maxMedian = useMemo(
    () => (data && data.byDistrict.length ? Math.max(...data.byDistrict.map((d) => d.medianPerM2)) : 0),
    [data]
  );

  // ---------- Ачаалж байна ----------
  if (data === null && !error) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Статистикийг бодож байна...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'district', label: '🏙 Дүүргээр' },
    { key: 'khoroo', label: '📍 Хороогоор' },
  ];
  const rows = data ? (tab === 'district' ? data.byDistrict : data.byKhoroo) : [];

  return (
    <div className="page-container">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">📊 Үнийн статистик (₮/м²)</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-500">
          <b>{city}</b> хотын <b>орон сууцны «зарах» зарууд</b> дээр үндэслэсэн ₮/м² үнэ.
          Дүүрэг, хороогоор харьцуулж, үнээ бодитоор тогтооход ашиглана уу.
        </p>
      </header>

      {/* ===== ХАЙЛТ ===== */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select className="form-select sm:max-w-[220px]" value={city} onChange={(e) => setCity(e.target.value)}>
          {CITIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition ${
                tab === t.key ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button type="button" className="btn btn-secondary btn-sm ml-auto" onClick={load}>↻ Шинэчлэх</button>
      </div>

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error.message}
        </div>
      )}

      {data && data.total === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center">
          <div className="mb-3 text-5xl">📭</div>
          <h3 className="mb-1 text-lg font-semibold">Хангалттай өгөгдөл алга</h3>
          <p className="text-sm text-gray-500">
            «{city}» хотод талбай (м²) болон үнэ бүрэн бөглөгдсөн «зарах» орон сууцны зар байхгүй.
            Зар нэмэгдэх тусам статистик автоматаар бодогдоно.
          </p>
        </div>
      ) : data ? (
        <>
          {/* ===== ХУРААНГУЙ ===== */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="text-[12px] uppercase tracking-wide text-gray-400">Тооцоонд орсон зар</div>
              <div className="text-2xl font-bold text-gray-900">{data.total}</div>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary-light/40 px-4 py-3">
              <div className="text-[12px] uppercase tracking-wide text-primary">Дундаж ₮/м²</div>
              <div className="text-2xl font-bold text-primary">₮{formatPrice(Math.round(data.overall.avgPerM2 || 0))}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="text-[12px] uppercase tracking-wide text-gray-400">Медиан ₮/м²</div>
              <div className="text-2xl font-bold text-gray-900">₮{formatPrice(Math.round(data.overall.medianPerM2 || 0))}</div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
              <div className="text-[12px] uppercase tracking-wide text-gray-400">Хамгийн өндөр ₮/м²</div>
              <div className="text-2xl font-bold text-gray-900">₮{formatPrice(Math.round(data.overall.maxPerM2 || 0))}</div>
            </div>
          </div>

          {/* ===== ХҮСНЭГТ ===== */}
          {rows.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center text-[13.5px] text-gray-500">
              {tab === 'district' ? 'Дүүргийн мэдээлэл бүрэн бөглөгдсөн зар алга.' : 'Хорооны мэдээлэл бүрэн бөглөгдсөн зар алга.'}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-[13.5px]">
                  <thead className="bg-gray-50 text-left text-[12px] uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5">{tab === 'district' ? 'Дүүрэг' : 'Дүүрэг / Хороо'}</th>
                      <th className="px-4 py-2.5 text-right">Зар</th>
                      <th className="px-4 py-2.5 text-right">Медиан ₮/м²</th>
                      <th className="px-4 py-2.5 text-right">Дундаж ₮/м²</th>
                      <th className="px-4 py-2.5 text-right">Бага – их (сая)</th>
                      <th className="px-4 py-2.5 text-right">Дундаж үнэ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`${row.district}-${row.khoroo || ''}`} className="border-t border-gray-100">
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-gray-800">
                            {row.district}{row.khoroo ? ` · ${row.khoroo}` : ''}
                          </div>
                          {/* Харьцуулах бар (медиан ₮/м²) */}
                          <div className="mt-1 h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${maxMedian > 0 ? Math.round((row.medianPerM2 / maxMedian) * 100) : 0}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{row.count}</td>
                        <td className="px-4 py-2.5 text-right font-bold tabular-nums text-primary">
                          ₮{formatPrice(Math.round(row.medianPerM2))}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                          ₮{formatPrice(Math.round(row.avgPerM2))}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-500">
                          {(row.minPerM2 / 1_000_000).toFixed(1)} – {(row.maxPerM2 / 1_000_000).toFixed(1)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">{shortMoney(row.avgPrice)} ₮</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ===== ЭХ СУРВАЛЖ ===== */}
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[12.5px] leading-relaxed text-gray-500">
            <p>
              <b>Эх сурвалж:</b> ZAR.mn-ийн өөрийн зарууд — «зарах» категори, «Орон сууц» төрөл,
              талбай ба үнэ бүрэн бөглөгдсөн <b>{data.total}</b> зар
              {data.generatedAt ? ` (бодсон: ${new Date(data.generatedAt).toLocaleDateString('mn-MN')})` : ''}.
              ⚠️ Түүвэр бага (10-аас доош зар) үед дүн нь төлөөлөх чанар муу байж болно.
            </p>
            <p className="mt-2">
              <b>Гадаад лавлагаа:</b>{' '}
              <a href={BOM.url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
                {BOM.source}
              </a>{' '}
              — бодлогын хүү {BOM.policyRate}% ({BOM.date}), УБ-ын инфляц {BOM.inflationUB}%.
              {REFERENCE_PRICE_PER_M2.length === 0 && (
                <span>
                  {' '}Албан ёсны дүүргийн ₮/м² индексийг эх сурвалжтай нь (линк, огноо) гараар нэмэх
                  боломжтой — <code className="rounded bg-white px-1 py-px">lib/marketData.js</code>.
                </span>
              )}
            </p>
          </div>

          <p className="mt-4 text-center text-[13px]">
            <Link href="/mortgage" className="font-semibold text-primary hover:underline">🏦 Ипотекийн тооцоолуур</Link>
            {' · '}
            <Link href="/" className="font-semibold text-primary hover:underline">🏠 Зар хайх</Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
