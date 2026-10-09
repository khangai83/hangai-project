'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * ⛔ ГЛОБАЛ АЛДААНЫ ХҮРЭЭ (`app/error.jsx`) — App Router-ийн error boundary.
 *
 *  ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-10-01):
 *     Өмнө нь алдааны хүрээ БАЙХГҮЙ байсан тул render-ийн үед (жишээ нь
 *     хуучирсан chunk / устгасан модуль / undefined утга) алдаа гарвал React
 *     бүх модыг unmount хийж, хэрэглэгчид **ЦАГААН ХООСОН хуудас** харагдана.
 *     Тэгэхэд «юу ч гарч ирэхгүй байна» гэдгийг ялгах аргагүй (console-г
 *     нээхээс өөр).
 *     Одоо алдаа гарвал хэрэглэгчид ОЙЛГОМЖТОЙ мессеж + хоёр гарах зам
 *     (`Дахин оролдох` — Next-ийн `reset()`, `← Нүүр хуудас`) харагдана ✓
 *
 *  ℹ️ `app/not-found.jsx` (404) нь ХЭВЭЭР ажиллана — энэ нь тусдаа зүйл ✓
 *  ℹ️ `error.jsx` нь `layout.jsx`-ИЙГ ОРЛОХГҮЙ (header/footer хэвээр
 *     харагдана) тул `global-error.jsx`-оос хөнгөн, аюулгүй сонголт ✓
 *  ⚠️ `console.error` — алдаа нь developer-т зориулж browser console-д
 *     БҮРЭН харагдана (production дээр ч) ✓
 */
export default function AppError({ error, reset }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[app/error] render алдаа:', error);
  }, [error]);

  return (
    <div className="page-container">
      <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gray-200 bg-gray-100 p-8 text-center shadow-card">
        <div className="mb-4 text-6xl">⚠️</div>
        <h1 className="text-xl font-semibold">Алдаа гарлаа</h1>
        <p className="mt-2 text-[13px] text-gray-500">
          Хуудсыг харуулах үед алдаа гарлаа. Дахин оролдоод үзнэ үү — ихэнхдээ
          хуудсыг дахин ачаалбал (⌘⇧R / Ctrl+F5) засварлагдана.
        </p>
        {error && error.message ? (
          <p className="mt-3 break-words rounded-lg bg-red-50 p-2.5 text-left text-[12px] leading-relaxed text-red-800">
            {error.message}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Дахин оролдох
          </button>
          <Link href="/" className="btn btn-outline">
            ← Нүүр хуудас
          </Link>
        </div>
      </div>
    </div>
  );
}
