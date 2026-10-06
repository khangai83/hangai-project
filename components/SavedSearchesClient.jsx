'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth, useToast, useUI } from './AppProviders';
import { useSavedSearches } from '../lib/savedSearches';
import { savedSearchDescriptor } from '../lib/savedSearch.mjs';

/**
 * 🔖 «Таалагдсан хайлтууд» — unegui.mn-ийн хэв маягтай жагсаалт
 * (2026-10-06, хэрэглэгчийн хүсэлт: «unegui.mn шиг хайлтаа гоё хадгалдаг болъё»).
 *
 * Мөр бүр: ① «Категори: …» ② «Байршил: …» — баруун талд
 * **«Илэрц харуулах»** (хадгалсан линк рүү) + **«устгах»** товч.
 *
 * ⚠️ Хадгалалт: нэвтэрсэн бол Supabase (`saved_searches` — 0031), зочин бол
 *    localStorage. Сонголт/шинэчлэл нь `lib/savedSearches.js → useSavedSearches`
 *    дотор (нэг эх сурвалж) ✓ — энэ компонент зөвхөн ХАРАГДАЦ.
 */
export default function SavedSearchesClient() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { openAuth } = useUI();
  const { items, loading, source, remove, clear } = useSavedSearches(user);
  const [notice, setNotice] = useState('');

  // Шошгыг URL-ээс нэг л удаа бодно (render бүрд дахин бодохгүй ✓)
  const rows = useMemo(
    () => items.map((it) => ({ ...it, desc: savedSearchDescriptor(it.url) })),
    [items]
  );

  const removeOne = async (it) => {
    await remove(it.id);
    showToast('🔖 Хадгалсан хайлтыг устгав');
  };

  const clearAll = async () => {
    if (!window.confirm(`${items.length} хадгалсан хайлтыг бүгдийг нь устгах уу?`)) return;
    await clear();
    setNotice('Жагсаалтыг цэвэрлэв');
  };

  return (
    <div data-saved-searches>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">🔖 Таалагдсан хайлтууд</h2>
          <p className="text-sm text-gray-500" data-saved-searches-count>
            {loading ? 'Ачаалж байна…' : (items.length ? `${items.length} хадгалсан хайлт` : 'Хоосон байна')}
          </p>
        </div>
        {!loading && items.length > 0 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            data-saved-searches-clear
            onClick={clearAll}
          >
            🗑 Бүгдийг цэвэрлэх
          </button>
        )}
      </div>

      {notice && <p className="mb-3 rounded-lg bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-700">{notice}</p>}

      {loading ? (
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      ) : !rows.length ? (
        <div className="px-5 py-16 text-center">
          <div className="mb-4 text-6xl">🔖</div>
          <h3 className="mb-2 text-xl font-semibold">Одоогоор хадгалсан хайлт байхгүй байна</h3>
          <p className="text-gray-500">
            Зар хайхдаа хайлтын үр дүнгийн дээрх <b>«Хайлтыг хадгалах»</b> товчийг дарж
            шүүлтээ хадгалаарай — дараа нь эндээс нэг дарахад тэр үр дүн буцаж гарна.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/" className="btn btn-primary">🔍 Зар хайх</Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white" data-saved-searches-list>
          {rows.map((it) => (
            <div
              key={it.id || it.url}
              data-saved-search-row
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-gray-100 px-5 py-4 last:border-b-0"
            >
              <div className="min-w-0">
                {it.desc.category ? (
                  <p className="text-[14px] text-gray-500">
                    Категори:{' '}
                    <b className="font-semibold text-gray-900">{it.desc.category}</b>
                  </p>
                ) : null}
                {it.desc.location ? (
                  <p className="mt-0.5 text-[14px] text-gray-500">
                    Байршил:{' '}
                    <b className="font-semibold text-gray-900">{it.desc.location}</b>
                  </p>
                ) : null}
                {!it.desc.category && !it.desc.location ? (
                  <p className="font-semibold text-gray-900">Бүх зар</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={it.url}
                  className="btn btn-primary btn-sm"
                  data-saved-search-open
                  title="Хадгалсан хайлтын үр дүнг харах"
                >
                  Илэрц харуулах
                </Link>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  data-saved-search-remove
                  onClick={() => removeOne(it)}
                >
                  устгах
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[12px] text-gray-400">
        {source === 'db'
          ? '☁️ Хадгалсан хайлтууд таны бүртгэлд (бүх төхөөрөмж дээр) хадгалагдана.'
          : 'ℹ️ Одоогоор хадгалсан хайлтууд энэ browser-т хадгалагдана (localStorage).'}
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
