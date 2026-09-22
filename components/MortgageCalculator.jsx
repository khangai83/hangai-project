'use client';

import { useMemo, useState } from 'react';
import { calcMortgage, rateScenarios } from '../lib/mortgage';
import { BOM, MORTGAGE_DEFAULTS, RATE_PRESETS } from '../lib/marketData';
import { formatPrice } from '../lib/format';

const DOWN_CHIPS = [10, 20, 30, 40];
const YEAR_CHIPS = [5, 10, 15, 20, 25, 30];

/**
 * Ипотекийн (зээлийн) тооцоолуур — аннуитет схем.
 *
 * @param {object} props
 * @param {number} [props.defaultPrice] — зарын үнэ (дэлгэрэнгүй хуудсанд)
 * @param {boolean} [props.compact] — баруун баганад (жижиг) эсвэл бүтэн хуудсанд
 *
 * ⚠️ Тооцоолол нь зөвхөн МЭДЭЭЛЛИЙН зорилготой: банкны шимтгэл, даатгал,
 *    нотариат, улсын бүртгэлийн хураамж ороогүй (ЗБӨ-г банкнаас шалгана).
 */
export default function MortgageCalculator({ defaultPrice = 0, compact = false }) {
  const startPrice = defaultPrice > 0 ? defaultPrice : MORTGAGE_DEFAULTS.price;

  const [priceInput, setPriceInput] = useState(String(Math.round(startPrice)));
  const [downPercent, setDownPercent] = useState(MORTGAGE_DEFAULTS.downPercent);
  const [rate, setRate] = useState(MORTGAGE_DEFAULTS.annualRate);
  const [years, setYears] = useState(MORTGAGE_DEFAULTS.years);

  const price = Number(String(priceInput).replace(/[^\d]/g, '')) || 0;

  const input = useMemo(
    () => ({ price, downPercent, annualRate: rate, years }),
    [price, downPercent, rate, years]
  );
  const r = useMemo(() => calcMortgage(input), [input]);
  const scenarios = useMemo(() => rateScenarios(input), [input]);

  const chip = (active) =>
    `rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition ${
      active
        ? 'border-primary bg-primary-light text-primary'
        : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
    }`;

  return (
    <div className={compact ? '' : 'section-card'}>
      <div className={compact ? 'space-y-4' : 'grid grid-cols-1 gap-5 lg:grid-cols-2'}>
        {/* ===== ОРУУЛАХ ХЭСЭГ ===== */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="form-label" htmlFor="mc-price">Орон сууцны үнэ (₮)</label>
            <input
              id="mc-price"
              className="form-input"
              inputMode="numeric"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value.replace(/[^\d]/g, ''))}
            />
            <p className="form-hint">₮{formatPrice(price)}</p>
          </div>

          <div>
            <label className="form-label">
              Урьдчилгаа — <b className="text-primary">{Math.round(downPercent)}%</b>{' '}
              <span className="font-normal text-gray-500">(₮{formatPrice(r.down)})</span>
            </label>
            <div className="mb-2 flex flex-wrap gap-2">
              {DOWN_CHIPS.map((p) => (
                <button key={p} type="button" className={chip(Math.round(downPercent) === p)} onClick={() => setDownPercent(p)}>
                  {p}%
                </button>
              ))}
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="5"
              value={downPercent}
              onChange={(e) => setDownPercent(Number(e.target.value))}
              className="w-full accent-primary"
              aria-label="Урьдчилгаа хувь"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="form-label" htmlFor="mc-rate">Жилийн хүү (%)</label>
            <input
              id="mc-rate"
              className="form-input"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))}
            />
            <div className="mt-1.5 flex flex-wrap gap-2">
              {RATE_PRESETS.map((p) => (
                <button key={p.label} type="button" className={chip(Number(rate) === p.value)} onClick={() => setRate(p.value)}>
                  {p.label} · {p.value}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Хугацаа — <b className="text-primary">{years} жил</b></label>
            <div className="flex flex-wrap gap-2">
              {YEAR_CHIPS.map((y) => (
                <button key={y} type="button" className={chip(years === y)} onClick={() => setYears(y)}>
                  {y} жил
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ===== ҮР ДҮН ===== */}
        <div className={`rounded-xl border border-primary/20 bg-primary-light/40 ${compact ? 'p-4' : 'p-5'}`}>
          <p className="text-[12.5px] font-semibold uppercase tracking-wide text-primary">Сарын төлбөр</p>
          <p className={`font-bold text-primary ${compact ? 'text-2xl' : 'text-3xl'}`}>₮{formatPrice(r.monthly)}</p>
          <p className="mt-0.5 text-[12.5px] text-gray-500">Аннуитет · {r.months} сар ({years} жил)</p>

          <dl className="mt-4 space-y-2 text-[13.5px]">
            <div className="flex justify-between gap-3 border-b border-white/60 pb-1.5">
              <dt className="text-gray-600">Урьдчилгаа</dt>
              <dd className="font-semibold text-gray-900">
                ₮{formatPrice(r.down)} <span className="font-normal text-gray-500">({Math.round(r.downPercent)}%)</span>
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-white/60 pb-1.5">
              <dt className="text-gray-600">Зээлийн дүн</dt>
              <dd className="font-semibold text-gray-900">₮{formatPrice(r.principal)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-b border-white/60 pb-1.5">
              <dt className="text-gray-600">Нийт төлөх</dt>
              <dd className="font-semibold text-gray-900">₮{formatPrice(r.totalPay)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-600">Үүнээс хүү</dt>
              <dd className="font-semibold text-red-600">
                ₮{formatPrice(r.totalInterest)} <span className="font-normal">({Math.round(r.interestShare)}%)</span>
              </dd>
            </div>
          </dl>

          {/* Хүү ±2% болвол */}
          <div className="mt-4 rounded-lg bg-white/70 p-3">
            <p className="mb-1.5 text-[12px] font-semibold text-gray-600">Хүү өөрчлөгдвөл сарын төлбөр:</p>
            <ul className="space-y-1 text-[12.5px]">
              {scenarios.map((s) => (
                <li key={s.rate} className="flex items-center justify-between gap-2">
                  <span className={Number(rate) === s.rate ? 'font-bold text-primary' : 'text-gray-600'}>{s.rate}%</span>
                  <span className="font-semibold text-gray-900">
                    ₮{formatPrice(s.monthly)}
                    {s.diff !== 0 && (
                      <span className={`ml-1.5 text-[11.5px] ${s.diff > 0 ? 'text-red-600' : 'text-secondary-dark'}`}>
                        ({s.diff > 0 ? '+' : '−'}₮{formatPrice(Math.abs(s.diff))})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-gray-400">
        ⚠️ Тооцоолол нь зөвхөн мэдээллийн зорилготой — банкны шимтгэл, даатгал, нотариат,
        улсын бүртгэлийн хураамж ороогүй. Эцсийн нөхцөлийг банкны <b>зээлийн бодит өртөг (ЗБӨ)</b>-өөр
        шалгана уу. Хүүгийн лавлагаа:{' '}
        <a href={BOM.url} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">
          {BOM.source} — бодлогын хүү {BOM.policyRate}% ({BOM.date})
        </a>
      </p>
    </div>
  );
}
