'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth, useToast, useUI } from './AppProviders';
import { useSearchHistory } from '../lib/searchHistory';
import { historyDescriptor, historyTimeAgo } from '../lib/searchHistory.mjs';
import { formatRoomsLabel } from '../lib/locationData';
import { groupDigits } from '../lib/rangeFilter.mjs';

/**
 * 🕐 «ХАЙЛТЫН ТҮҮХ» — сүүлийн хайлтуудын КАРТ сүлжээ (2026-10-07).
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Мессеж icon-ий дараа цагийн icon оруулаад, тэр рүү
 *   орход тухайн хэрэглэгчийн хайлтуудыг карт хэлбэрээр харуул — карт дээр
 *   категорийн СҮҮЛИЙН нэр (ж: Цахилгаан бараа → «Угаалгын машин»),
 *   байршил, хайсан түлхүүр үг гэх мэтийг оруул» ✓
 *
 * Карт бүр ЦАГААН (`rounded-2xl border border-gray-200 bg-white shadow-card`
 * + hover `-translate-y-1 shadow-card-hover`) — `SavedSearchesClient`-тэй
 * ЯГ ИЖИЛ хэв:
 *   ① ГОЛ шошго — категорийн сүүлийн нэр (`leaf`) + баруун дээд буланд 🕒 цаг
 *   ② Бүтэн категорийн зам («Цахилгаан бараа — Угаалгын машин»)
 *   ③ 📍 Байршил  ④ 🔑 хайсан түлхүүр үг  ⑤ 🛏 өрөө / 💰 үнэ (chip)
 *   Доод баруун буланд **«Хасах»** товч.
 *
 * ✏️ 2026-10-07 (2): КАРТ БҮХЭЛДЭЭ ДАРАГДАНА (хэрэглэгчийн хүсэлт — «карт руу
 *   орохдоо дахин хайх биш зүгээр л тухайн card дээрээ click хийхэд ордог
 *   байхаар»). Картыг бүрхсэн `absolute inset-0` линк (`<Link href={it.url}>`,
 *   дэгээ `data-search-history-open`) + түүнээс ДЭЭГҮҮР (`relative z-20`)
 *   «Хасах» товч ⇒ **«Дахин хайх» товч ХАСАГДАВ** ✓
 *
 * ⚠️ Хадгалалт: нэвтэрсэн бол Supabase (`search_history` — 0032), зочин бол
 *    localStorage. Бүртгэл/устгалт нь `lib/searchHistory.js → useSearchHistory`
 *    дотор (нэг эх сурвалж) ✓ — энэ компонент зөвхөн ХАРАГДАЦ.
 */

/** Үнийн шошго — «₮1.000.000 – ₮3.000.000» (байхгүй тал → «...-аас»/«... хүртэл») */
function priceText(minPrice, maxPrice) {
  const min = groupDigits(minPrice);
  const max = groupDigits(maxPrice);
  if (min && max) return `₮${min} – ₮${max}`;
  if (min) return `₮${min}-аас`;
  if (max) return `₮${max} хүртэл`;
  return '';
}

export default function SearchHistoryClient() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { openAuth } = useUI();
  const { items, loading, source, remove, clear } = useSearchHistory(user);
  const [notice, setNotice] = useState('');

  // Шошгыг URL-ээс нэг л удаа бодно (render бүрд дахин бодохгүй ✓)
  const rows = useMemo(
    () => items.map((it) => ({ ...it, desc: historyDescriptor(it.url) })),
    [items]
  );

  const removeOne = async (it) => {
    await remove(it.id);
    showToast('🕐 Хайлтын түүхээс устгав');
  };

  const clearAll = async () => {
    if (!window.confirm(`${items.length} хайлтын түүхийг бүгдийг нь устгах уу?`)) return;
    await clear();
    setNotice('Хайлтын түүхийг цэвэрлэв');
  };

  return (
    <div data-search-history>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">🕐 Хайлтын түүх</h2>
          <p className="text-sm text-gray-500" data-search-history-count>
            {loading
              ? 'Ачаалж байна…'
              : (items.length ? `${items.length} сүүлийн хайлт` : 'Хоосон байна')}
          </p>
        </div>
        {!loading && items.length > 0 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            data-search-history-clear
            onClick={clearAll}
          >
            🗑 Бүгдийг цэвэрлэх
          </button>
        )}
      </div>

      {notice && (
        <p className="mb-3 rounded-lg bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-700">{notice}</p>
      )}

      {loading ? (
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      ) : !rows.length ? (
        <HistoryEmpty openAuth={openAuth} />
      ) : (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          data-search-history-list
        >
          {rows.map((it) => (
            <HistoryCard key={it.id || it.url} it={it} onRemove={removeOne} />
          ))}
        </div>
      )}

      <p className="mt-4 text-[12px] text-gray-400">
        {source === 'db'
          ? '☁️ Хайлтын түүх таны бүртгэлд (бүх төхөөрөмж дээр) хадгалагдана.'
          : 'ℹ️ Одоогоор хайлтын түүх энэ browser-т хадгалагдана (localStorage).'}
        {!user && (
          <>
            {' '}
            Төхөөрөмж хооронд синк болгохыг хүсвэл{' '}
            <button
              type="button"
              onClick={openAuth}
              className="font-semibold text-primary underline underline-offset-2 hover:text-primary"
            >
              нэвтэрч орно уу
            </button>
            .
          </>
        )}
      </p>
    </div>
  );
}

/** 🕐 Хоосон төлөв — «Хайлт хийгээгүй байна» + нүүр хуудасны уриалга */
function HistoryEmpty({ openAuth }) {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mb-4 text-6xl">🕐</div>
      <h3 className="mb-2 text-xl font-semibold">Одоогоор хайлтын түүх байхгүй байна</h3>
      <p className="text-gray-500">
        Нүүр хуудсанд зар хайх бүрд таны хайлт <b>автоматаар</b> энд бүртгэгдэж,
        дараа нь нэг дарахад тэр үр дүн буцаж гарна.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn btn-primary">🔍 Зар хайх</Link>
        {openAuth && (
          <button type="button" className="btn btn-outline" onClick={openAuth}>
            🔑 Нэвтэрч синк хийх
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 🃏 Нэг хайлтын КАРТ — категорийн сүүлийн нэр, зам, байршил, түлхүүр үг,
 *    өрөө/үнэ (chip). КАРТ БҮХЭЛДЭЭ дарагдана (бүрхсэн `absolute inset-0`
 *    линк → хайлтын үр дүн); доод мөрөнд ЗӨВХӨН «Хасах» товч (overlay-с
 *    дээгүүр `relative z-20`).
 * ⚠️ CDP/тестийн тогтвортой дэгээ: `data-search-history-open` (картын линк) /
 *    `data-search-history-remove` («Хасах» товч) ✓
 */
function HistoryCard({ it, onRemove }) {
  const { desc } = it;
  const ago = historyTimeAgo(it.createdAt);
  const price = priceText(desc.minPrice, desc.maxPrice);
  const rooms = formatRoomsLabel(desc.rooms);
  const hasChips = !!rooms || !!price;
  return (
    <div
      data-search-history-row
      title={desc.title}
      className="group relative flex flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-card transition-all duration-200 ease-out hover:-translate-y-1 hover:border-gray-300 hover:shadow-card-hover"
    >
      {/* ✏️ КАРТ БҮХЭЛДЭЭ дарагдана — бүрхсэн линк (агуулга нь доор, z-10-аар дээр) */}
      <Link
        href={it.url}
        className="absolute inset-0 z-10 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`${desc.leaf || 'Бүх зар'} — хайлтын үр дүнг нээх`}
        data-search-history-open
        title="Энэ хайлтын үр дүнг нээх"
      />

      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex max-w-[75%] items-center break-words rounded-lg bg-primary/10 px-2.5 py-1 text-[14px] font-bold text-primary">
          {desc.leaf || 'Бүх зар'}
        </span>
        {ago && <span className="shrink-0 pt-0.5 text-[12px] text-gray-400">🕒 {ago}</span>}
      </div>

      {desc.category && desc.category !== desc.leaf && (
        <p className="mt-2 break-words text-[12.5px] leading-snug text-gray-500">{desc.category}</p>
      )}

      <div className="mt-2 flex-1 space-y-1 break-words">
        {desc.keyword && (
          <p className="text-[13px] text-gray-500">
            🔑 <b className="font-semibold text-gray-900">«{desc.keyword}»</b>
          </p>
        )}
        {desc.location && (
          <p className="text-[13px] text-gray-500">
            📍 <b className="font-semibold text-gray-900">{desc.location}</b>
          </p>
        )}
        {hasChips && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {rooms && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-semibold text-gray-700">
                🛏 {rooms}
              </span>
            )}
            {price && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-semibold text-gray-700">
                💰 {price}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
        <span className="text-[12px] font-semibold text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          Үр дүнг харах →
        </span>
        <button
          type="button"
          className="btn btn-outline btn-sm relative z-20 shrink-0"
          data-search-history-remove
          title="Түүхээс хасах"
          onClick={() => onRemove(it)}
        >
          Хасах
        </button>
      </div>
    </div>
  );
}

