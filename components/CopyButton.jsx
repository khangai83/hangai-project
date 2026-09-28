'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from './AppProviders';

/**
 * 📋 COPY — ТЕКСТ (ж: утасны дугаар) ХУУЛАХ ТОВЧ — 2026-09-29
 *
 * ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «тухайн хэрэглэгчийн утасны дугаарын ард хэсэгт
 *    утасны дугаарыг нь copy хийж авах боломжтой symbol оруулж өгнө үү» ✓
 *
 * ⚠️ ЯАГААД ТУСДАА КОМПОНЕНТ ВЭ:
 *   Гарын авлагаар `navigator.clipboard.writeText()` бичихэд 3 зүйл
 *   мартагдана: (1) http дээр clipboard API БАЙХГҮЙ (LAN IP-ээр туршихад
 *   чимээгүй унана ✗), (2) амжилт/алдааг хэрэглэгчид хэлэх, (3) дарахад
 *   товч «✓» болж солигдох. Гурвуулаа энд НЭГ дор шийдэгдэнэ ✓
 *
 * ⚠️ `navigator.clipboard` нь ЗӨВХӨН secure context (https эсвэл localhost)
 *    дээр ажиллана — тиймээс хуучин `document.execCommand('copy')` арга
 *    нөөцөөр (fallback) үлдэв ✓
 *
 * @param {Object}   p
 * @param {string}   p.value      хуулагдах текст (ж: `listing.phone`)
 * @param {string}   [p.label]    aria-label/title (ж: «Утасны дугаарыг хуулах»)
 * @param {string}   [p.toastMsg] амжилттай үед гарах toast
 * @param {'sm'|'md'|'lg'} [p.size] хэмжээ (`sm` = гарчгийн мөрний дотор)
 * @param {string}   [p.className] нэмэлт класс
 */
export default function CopyButton({
  value,
  label = 'Хуулах',
  toastMsg = '📋 Хуулагдлаа',
  size = 'md',
  className = '',
}) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  // ⚠️ Компонент ачааллахаас өмнө unmount болвол timer үлдэж, unmounted
  //    component дээр setState дуудагдана ✗ → цэвэрлэнэ ✓
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleCopy = async () => {
    const text = String(value == null ? '' : value);
    if (!text) {
      showToast('Хуулах утга алга байна.', 'error');
      return;
    }

    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch (e) {
      ok = false; // доорх fallback руу шилжинэ ✓
    }
    if (!ok) {
      // ⚠️ http (ж: `http://192.168.x.x`) дээр clipboard API ажиллахгүй
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {
        ok = false;
      }
    }

    if (!ok) {
      showToast('Хуулж чадсангүй — дугаарыг гараар сонгоно уу.', 'error');
      return;
    }
    setCopied(true);
    showToast(toastMsg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  // ⚠️ `[&>svg]:h-[…]` — SVG нь энэ компонентын дотоод хэмжээгээр зурагдана
  const SIZES = {
    sm: 'h-7 w-7 [&>svg]:h-[14px] [&>svg]:w-[14px]',
    md: 'h-9 w-9 [&>svg]:h-[17px] [&>svg]:w-[17px]',
    lg: 'h-11 w-11 [&>svg]:h-5 [&>svg]:w-5',
  };
  const cls = `grid shrink-0 place-items-center rounded-full border transition duration-150 active:scale-90 ${
    copied
      ? 'border-secondary/40 bg-secondary/15 text-secondary-dark'
      : 'border-gray-200 bg-white text-gray-500 hover:border-primary/40 hover:bg-primary/5 hover:text-primary'
  } ${SIZES[size] || SIZES.md} ${className}`;

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cls}
      title={copied ? 'Хуулагдлаа' : label}
      aria-label={copied ? 'Хуулагдлаа' : label}
      data-copy-value={String(value == null ? '' : value)}
    >
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="12" height="12" rx="2.5" />
          <path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5" />
        </svg>
      )}
    </button>
  );
}
