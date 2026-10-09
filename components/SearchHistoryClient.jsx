'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ListingCard from './ListingCard';
import { useAuth, useToast, useUI } from './AppProviders';
import { useSearchHistory } from '../lib/searchHistory';
import { mergeHistoryListings, historyTimeAgo } from '../lib/searchHistory.mjs';
import { fetchListingsByIds } from '../lib/queries';
import { normalizeError } from '../lib/errors';

/**
 * 🕐 «ХАЙЛТЫН ТҮҮХ» — сүүлд ҮЗСЭН ЗАРУУДЫН карт сүлжээ.
 *
 * ⏳ 2026-10-07 (анхны хүсэлт): «Мессеж icon-ий дараа цагийн icon оруулаад,
 *    тэр рүү орход тухайн хэрэглэгчийн хайлтуудыг карт хэлбэрээр харуул»
 *    → хайлтын ШҮҮЛТҮҮР (категори/байршил/түлхүүр үг) картууд гарч байв
 * ✏️ 2026-10-08 (68, хэрэглэгчийн хүсэлт): «хайлтын түүх дээр орж үзсэн
 *    заруудыг л зөвхөн гаргадаг болгоорой, одоо хайлтыг гаргаад байгаа, энэ
 *    нэрийг хэвээр үлдээ» ⇒
 *    ① Карт нь ХАЙЛТЫН ШҮҮЛТҮҮР БИШ, бодит ЗАР (`components/ListingCard`)
 *    ② Цаг нь «🕒 хэзээ ҮЗСЭН» (зар хэзээ нийтлэгдсэн биш — тэр нь карт
 *       дотор хэвээр байгаа)
 *    ③ ХУУДАС/ТОВЧ/ГАРЧГИЙН НЭР «🕐 Хайлтын түүх» ХЭВЭЭР ✓ (хүсэлт)
 *
 * ⚠️ ХАДГАЛАЛТ: нэвтэрсэн бол Supabase (`search_history` — 0032), зочин бол
 *    localStorage. Бүртгэл нь `ListingDetailClient → recordListingView()`
 *    (зар нээх бүрд `/listings/<id>`), унших/устгах нь `useSearchHistory()`
 *    (нэг эх сурвалж) ✓ — энэ компонент зөвхөн ХАРАГДАЦ + устгал ✓
 *
 * ⚠️ ЯАГААД ЗАРЫН МЭДЭЭЛЛИЙГ ТУСДАА ТАТАЖ БАЙНА ВЭ: түүхэнд зөвхөн ЛИНК
 *    (`/listings/<uuid>`) хадгалагддаг ⇒ үнэ/гарчиг засагдсан ч ШИНЭ утга,
 *    зураг харагдана, УСТСАН зар картаас ГАРАХГҮЙ ✓ (хуулбар хадгалах нь
 *    «хуучин үнэтэй» карт үүсгэх эрсдэлтэй ✗). Татах нь ЗӨВХӨН энэ хуудас
 *    нээгдэх үед (`fetchListingsByIds`) — зарын хуудас бүрд биш ✓
 *
 * ⚠️ CDP/тестийн дэгээ: `data-search-history` (бүх блок) / `-count` (тоо) /
 *    `-clear` (бүгдийг устгах) / `-list` (картын сүлжээ) / `-row` (мөр) /
 *    `-remove` (нэг мөрийг хасах). Картын линк нь `ListingCard`-ийн
 *    `a[data-listing-card]` (`/listings/<id>`) ✓
 */

/** '5 зар' / '5 зар үзсэн (4 нь олдсон)' — устсан зарыг нуухгүй мэдэгдэнэ ✓ */
function countLabel(viewed, found) {
  if (!viewed) return 'Хоосон байна';
  if (viewed === found) return `${viewed} зар үзсэн`;
  return `${viewed} зар үзсэн (${found} нь олдсон)`;
}

export default function SearchHistoryClient() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { openAuth } = useUI();
  const { items, loading, source, remove, clear } = useSearchHistory(user);
  const [notice, setNotice] = useState('');
  // 🃏 Заруудын БОДИТ мэдээлэл (`listings` хүснэгт) — зөвхөн энэ хуудсанд
  const [listings, setListings] = useState([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState('');

  // Түүхэнд бичигдсэн заруудыг id-аар нь татна (`fetchListingsByIds` —
  // оролтын дарааллаа хадгална, олдоогүйг нь ХАСНА ✓)
  useEffect(() => {
    const ids = items.map((it) => it.listingId).filter(Boolean);
    let active = true;
    if (!ids.length) {
      setListings([]);
      setFetching(false);
      setFetchError('');
      return () => { active = false; };
    }
    setFetching(true);
    fetchListingsByIds(ids)
      .then((rows) => { if (active) { setListings(rows); setFetchError(''); } })
      .catch((err) => { if (active) { setListings([]); setFetchError(normalizeError(err).message); } })
      .finally(() => { if (active) setFetching(false); });
    return () => { active = false; };
  }, [items]);

  // 🃏 Түүхийн мөр + зарын мэдээлэл → карт (устсан зар автоматаар хасагдана ✓)
  const rows = useMemo(() => mergeHistoryListings(items, listings), [items, listings]);
  const busy = loading || fetching;

  const removeOne = async (it) => {
    await remove(it.id);
    showToast('🕐 Хайлтын түүхээс устгав');
  };

  const clearAll = async () => {
    if (!window.confirm(`${items.length} үзсэн зарыг түүхээс бүгдийг нь устгах уу?`)) return;
    await clear();
    setNotice('Хайлтын түүхийг цэвэрлэв');
  };

  return (
    <div data-search-history>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">🕐 Хайлтын түүх</h2>
          <p className="text-sm text-gray-500" data-search-history-count>
            {busy ? 'Ачаалж байна…' : countLabel(items.length, rows.length)}
          </p>
        </div>
        {!busy && items.length > 0 && (
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

      {fetchError && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700">
          ⚠️ Заруудыг ачаалж чадсангүй: {fetchError}
        </p>
      )}

      {busy ? (
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      ) : !items.length ? (
        <HistoryEmpty openAuth={openAuth} />
      ) : !rows.length ? (
        <HistoryGone />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" data-search-history-list>
          {/* 🃏 БАГАНАТ GRID (2026-10-09) — карт нь БОСОО болов; мөр бүр
              өөрийн толгой (`🕒 … үзсэн` + «Хасах») дээрээ үлдэнэ ✓
              (📱 1 · 📲 sm 2 · 🖥 lg 3 · 🖥 2xl 4) */}
          {rows.map((it) => (
            <HistoryRow key={it.id || it.listingId} it={it} onRemove={removeOne} />
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

/**
 * 🃏 НЭГ МӨР — «🕒 <хэзээ үзсэн>» + «Хасах» товч (дээд мөр), доор нь зарын
 * карт (`ListingCard` — /favorites хуудастай ЯГ ИЖИЛ хэв: зураг, үнэ,
 * гарчиг, байршил, ❤️/👁).
 * ⚠️ «Хасах» товч нь картын ГАДНА (дээр) — карт бүхэлдээ `<Link>` тул дотор
 *    нь товч хийх нь HTML-д хориотой (nested interactive) ✗
 */
function HistoryRow({ it, onRemove }) {
  const ago = historyTimeAgo(it.createdAt);
  return (
    <div className="relative" data-search-history-row>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] text-gray-400" title="Таны сүүлд үзсэн цаг">
          🕒 {ago ? `${ago} үзсэн` : 'Үзсэн'}
        </span>
        <button
          type="button"
          className="flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          data-search-history-remove
          title="Түүхээс хасах"
          onClick={() => onRemove(it)}
        >
          Хасах
        </button>
      </div>
      <ListingCard listing={it.listing} />
    </div>
  );
}

/**
 * 🕐 Хоосон төлөв — «Одоогоор үзсэн зар байхгүй» + нүүр хуудасны уриалга.
 * ⚠️ 2026-10-08 (68): өмнөх «хайлт бүртгэгдэнэ» гэсэн тайлбар БУРУУ болсон
 *    (хайлт бүртгэгдэхээ болив) ⇒ одоо «зар НЭЭЖ ҮЗЭХ бүрд» гэж тайлбарлана ✓
 */
function HistoryEmpty({ openAuth }) {
  return (
    <div className="px-5 py-16 text-center">
      <div className="mb-4 text-6xl">🕐</div>
      <h3 className="mb-2 text-xl font-semibold">Одоогоор үзсэн зар байхгүй байна</h3>
      <p className="text-gray-500">
        Та зарыг <b>нээж үзэх бүрд</b> энд автоматаар бүртгэгдэж, дараа нь нэг
        дарахад тэр зар буцаж нээгдэнэ.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link href="/" className="btn btn-primary">🔍 Зар үзэх</Link>
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
 * 🗑 «Үзсэн боловч олдохгүй» төлөв — түүхэнд линк байгаа ч зар нь устсан/
 *    архивлагдсан (эсвэл DB-д байхгүй) үед. ⚠️ Хуучин мөрүүд БАЙГАА хэвээр
 *    (хэрэглэгч «Бүгдийг цэвэрлэх»-ээр л арилгана) тул хоосон төлөвөөс
 *    ЯЛГААТАЙ мессеж харуулна ✓
 */
function HistoryGone() {
  return (
    <div className="px-5 py-12 text-center">
      <div className="mb-3 text-5xl">🗑</div>
      <h3 className="mb-2 text-lg font-semibold">Үзсэн зарууд олдсонгүй</h3>
      <p className="text-gray-500">
        Түүхэнд бүртгэгдсэн зарууд устсан эсвэл архивлагдсан байна. «🗑 Бүгдийг
        цэвэрлэх» товчоор түүхээ цэвэрлэж болно.
      </p>
    </div>
  );
}

