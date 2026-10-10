'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from './AppProviders';

/**
 * 🔗 ХУВААЛЦАХ / ЛИНК ХУУЛАХ ТОВЧ — 2026-10-07
 *
 * ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «зар хуваалцах буюу зарын link хуулж авах товчийг
 *    Үзсэн, хуваалцахынхаа хажууд оруулаад ирвэл зүгээр л юм» ✓
 *
 * ⚠️ ЮУ ХИЙДЭГ ВЭ: дарахад тухайн зарын **линкийг** (одоогийн хуудасны URL)
 *    clipboard-д хуулж, toast гаргана. `navigator.clipboard` нь ЗӨВХӨН
 *    secure context (https/localhost) дээр ажиллана — http (ж: `http://192.168.x.x`)
 *    үед `document.execCommand('copy')` НӨӨЦ арга ашиглана ✓
 *    (⚠️ `CopyButton.jsx`-ийн ЯГ ИЖИЛ логик — хоёулаа ижил зан гаргана).
 *
 * ⚠️ `url` ЗААВАЛ БИШ: хоосон бол дарах мөчид `window.location.href`-ыг
 *    УНШИНА (render үед `window` уншвал SSR дээр крашлах байсан ✗).
 *
 * @param {Object} p
 * @param {string} [p.url]       хуулагдах линк (хоосон бол `window.location.href`)
 * @param {string} [p.label]     товчны текст/aria-label (ж: «Хуваалцах»)
 * @param {string} [p.toastMsg]  амжилттай үед гарах toast
 * @param {string} [p.className] нэмэлт класс
 */
export default function ShareButton({
  url,
  label = 'Хуваалцах',
  toastMsg = '🔗 Зарын линк хуулагдлаа',
  className = '',
}) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);

  // ⚠️ unmount хийхэд timer үлдвэл unmounted component дээр setState дуудагдана ✗
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleCopy = async () => {
    const href = url || (typeof window !== 'undefined' ? window.location.href : '');
    const text = String(href || '');
    if (!text) {
      showToast('Хуулах линк олдсонгүй.', 'error');
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
      showToast('Хуулж чадсангүй — линкийг гараар хуулна уу.', 'error');
      return;
    }
    setCopied(true);
    showToast(toastMsg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Хуулагдлаа' : label}
      aria-label={copied ? 'Хуулагдлаа' : label}
      data-share-button
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 font-semibold text-gray-700 transition hover:border-primary/40 hover:text-primary ${
        copied ? 'text-primary' : ''
      } ${className}`}
    >
      <span aria-hidden="true">{copied ? '✓' : '🔗'}</span>
      {copied ? 'Хуулагдлаа' : label}
    </button>
  );
}
