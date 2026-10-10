'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast } from './AppProviders';
// ↪ 2026-10-10 (102): `🔗` EMOJI → `ShareIcon` SVG (жишиг зургийн сумтай ИЖИЛ;
//    DETAIL нь emoji→SVG бодлогын үргэлжлэл — `HeartIcon`/`ClockIcon`-той адил) ✓
import { ShareIcon } from './HeaderIcons';

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
      /* 🆕 (100): «Surrounding border» ХАСАГДАВ — ⏳ `border border-gray-200
         bg-white` pill-ийн хүрээ/дэвсгэр байв ⇒ одоо ЦЭВЭР icon+текст
         (`px-1` — товчны хэмжээ хадгалагдана, hover нь ӨНГӨӨР л ✓)
         🆕 (102) ЖИШИГ ЗУРГИЙН ХЭВ БУЦАВ (хэрэглэгч: «copy like attached
         screenshot card details information to Size, font, color»):
         ⏳ (100)-ийн «ямар ч дэвсгэргүй» товч нь жишиг зургийн СААРАЛ
         ДҮҮРГЭЛТТЭЙ pill-тэй ТААРАХГҮЙ байв ✗ ⇒ одоо:
           ① `h-8 px-1` → **`h-11 px-4`** (хэмжсэн 44px өндөр × 16px padding)
           ② `bg-gray-100` СААРАЛ ДҮҮРГЭЛТ (⏳ (100)-д ХАСАГДСАН) — ⚠️ ХҮРЭЭ
              БАЙХГҮЙ ХЭВЭЭР (`border` 0px ✓ (100)-ийн шийдэл хүчинтэй)
           ③ `text-gray-700` → **`text-gray-900`** (жишиг зургийн `#0D0D0E`
              бараг хар өнгө; манай Sandstone `gray-900` = `#1B1815`)
           ④ hover нь `hover:bg-gray-200` (дүүргэлтээ нэг шат гүнзгийрүүлнэ) ✓
         🆕 (104) ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «style the "Share" … elements … to match
         the size and font of the accompanying text» ⇒ ⏳ `font-semibold
         text-gray-900` → **`font-normal text-gray-500`** — «Хуваалцах» бичиг нь
         хажуугийн мета тексттэй (16px · `text-base` · system sans · `gray-500`)
         ЯГ ИЖИЛ болов ✓ (⚠️ pill-ийн хэлбэр (102)-ын хэв ХЭВЭЭР — зөвхөн
         БИЧГИЙН хэмжээ/фонт/өнгө өөрчлөгдөв ✓)
         @see ListingDetailClient.jsx — ❤️ pill нь ЯГ ИЖИЛ хэв ✓ */
      className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-gray-100 px-4 font-normal text-gray-500 transition hover:bg-gray-200 ${
        copied ? 'text-primary' : ''
      } ${className}`}
    >
      {/* 🆕 (102): `🔗` EMOJI → `ShareIcon` SVG (жишиг зургийн сум; ⏳ emoji нь
          pill-ийн өнгийг дагадаггүй байв ✗). Хуулагдсан үед «✓» тэмдэгт ✓ */}
      {copied ? <span aria-hidden="true">✓</span> : <ShareIcon className="h-6 w-6" strokeWidth={2} />}
      {copied ? 'Хуулагдлаа' : label}
    </button>
  );
}
