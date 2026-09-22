'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ListingCard from './ListingCard';
import Breadcrumb from './Breadcrumb';
import { useAuth, useToast } from './AppProviders';
import { fetchListingsBySeller, fetchProfile } from '../lib/queries';
import { normalizeError } from '../lib/errors';
import { timeAgo } from '../lib/format';

/**
 * Табууд: Бүгд / Зарах / Түрээслэх.
 * ⚠️ unegui.mn-тэй ижил зарчмаар «Зарах» ба «Түрээслэх» зарыг ЯЛГАЖ харуулна.
 */
const TABS = [
  { key: 'sell', label: '🏷️ Зарах' },
  { key: 'rent', label: '🔑 Түрээслэх' },
];

export default function SellerListingsClient({ sellerId }) {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [listings, setListings] = useState(null); // null = ачаалж байна
  const [profileName, setProfileName] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [tab, setTab] = useState('all'); // 'all' | 'sell' | 'rent'

  useEffect(() => {
    let mounted = true;
    setListings(null);
    setLoadError(null);
    (async () => {
      try {
        // 1) Зар нийтлэгчийн бүх зар
        const rows = await fetchListingsBySeller(sellerId);
        if (!mounted) return;
        setListings(rows);
        // 2) Бүртгэлтэй нэр (profiles) — байхгүй бол contact_name-ийг ашиглана
        const p = await fetchProfile(sellerId);
        if (mounted && p && p.name) setProfileName(p.name);
      } catch (err) {
        const e = normalizeError(err);
        console.error(e);
        if (mounted) {
          setListings([]);
          setLoadError(e);
          showToast(e.message, 'error');
        }
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId]);

  /** Зар нийтлэгчийн мэдээлэл — нэр, утас, хотууд, сүүлд нийтэлсэн огноо */
  const seller = useMemo(() => {
    const rows = listings || [];
    if (!rows.length) return { name: '', phone: '', cities: [], lastPost: null };
    return {
      name: profileName || rows[0].contact_name || 'Зар нийтлэгч',
      phone: rows[0].phone || '',
      cities: [...new Set(rows.map((l) => l.city).filter(Boolean))],
      lastPost: rows[0].created_at || null,
    };
  }, [listings, profileName]);

  const sellListings = useMemo(() => (listings || []).filter((l) => l.category === 'sell'), [listings]);
  const rentListings = useMemo(() => (listings || []).filter((l) => l.category === 'rent'), [listings]);

  const counts = {
    all: (listings || []).length,
    sell: sellListings.length,
    rent: rentListings.length,
  };
  const visible = tab === 'sell' ? sellListings : tab === 'rent' ? rentListings : listings || [];

  // ---------- Ачаалж байна ----------
  if (listings === null) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Зар нийтлэгчийн заруудыг ачаалж байна...</p>
        </div>
      </div>
    );
  }

  // ---------- Холболтын алдаа ----------
  if (loadError) {
    return (
      <div className="page-container">
        <div className="mx-auto my-6 max-w-[720px] rounded-2xl border border-red-200 bg-white px-6 py-8 text-center">
          <div className="text-4xl">🔌</div>
          <h3 className="mb-1.5 mt-2.5 text-lg font-semibold text-red-800">Өгөгдлийн сантай холбогдож чадсангүй</h3>
          <p className="[word-break:break-word] rounded-lg border border-red-200 bg-red-50 p-3 text-left text-[13px] text-red-700">{loadError.message}</p>
          <Link href="/" className="btn btn-primary mt-4">← Нүүр рүү буцах</Link>
        </div>
      </div>
    );
  }

  // ---------- Зар нийтлэгч олдсонгүй ----------
  if (!listings.length) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="mb-4 text-6xl">🔎</div>
          <h3 className="mb-2 text-xl font-semibold">Зар нийтлэгч олдсонгүй</h3>
          <p className="text-gray-500">Энэ хэрэглэгч одоогоор зар нийтлээгүй байна.</p>
          <Link href="/" className="btn btn-outline mt-4">← Нүүр рүү буцах</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Breadcrumb items={[{ label: 'Бүх зар', href: '/' }, { label: seller.name }]} />

      {/* ===== ЗАР НИЙТЛЭГЧИЙН КАРТ ===== */}
      <section className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card">
        <div className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary-light text-2xl font-bold text-primary">
            {(seller.name || '👤').trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{seller.name}</h1>
              {user && user.id === sellerId && (
                <span className="rounded bg-primary/10 px-1.5 py-px text-[11px] font-bold text-primary">ТАНЫ БҮРТГЭЛ</span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-gray-500">
              {seller.cities.length > 0 && <span>📍 {seller.cities.join(', ')}</span>}
              {seller.phone && <span>📱 {seller.phone}</span>}
              {seller.lastPost && <span>🕒 Сүүлд нийтэлсэн: {timeAgo(seller.lastPost)}</span>}
            </p>
          </div>
          {seller.phone && (
            <a
              href={`tel:+976${String(seller.phone).replace(/^\D*976/, '').replace(/\D/g, '')}`}
              className="btn btn-primary btn-sm"
            >
              📞 Холбоо барих
            </a>
          )}
        </div>

        {/* Зарах / Түрээслэх-ийн товч статистик */}
        <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-5 py-3.5 sm:px-6">
          <span className="text-[13px] font-semibold text-gray-600">📋 Нийт {counts.all} зар</span>
          <span className="rounded-full bg-primary-light px-2.5 py-1 text-[12px] font-semibold text-primary">🏷️ Зарах {counts.sell}</span>
          <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[12px] font-semibold text-secondary-dark">🔑 Түрээслэх {counts.rent}</span>
        </div>
      </section>

      {/* ===== ТАБУУД — Зарах / Түрээслэх-ээр ялгаж харах ===== */}
      <div className="mb-5 flex flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`rounded-md px-4 py-2 text-[13px] font-semibold transition ${
            tab === 'all' ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          🗂 Бүгд ({counts.all})
        </button>
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-[13px] font-semibold transition ${
              tab === t.key ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-14 text-center">
          <div className="mb-3 text-5xl">{tab === 'sell' ? '🏷️' : '🔑'}</div>
          <h3 className="mb-1 text-lg font-semibold">
            {tab === 'sell' ? 'Зарах зар байхгүй' : 'Түрээслэх зар байхгүй'}
          </h3>
          <p className="text-sm text-gray-500">
            Энэ хэрэглэгч {tab === 'sell' ? 'зарах' : 'түрээслэх'} зориулалтаар зар нийтлээгүй байна.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((l) => <ListingCard key={l.id} listing={l} />)}
        </div>
      )}
    </div>
  );
}
