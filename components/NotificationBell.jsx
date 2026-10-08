'use client';

// ============================================================
// NotificationBell.jsx — 🔔 ТОЛГОЙН МӨРНИЙ «МЭДЭГДЭЛ» ХОНХ + dropdown самбар
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-08): «facebook шиг notification тэй болгоё…
//   ямар ямар хэрэглэгч ямар зар дээр нь like дараад байгаа нь зар оруулсан
//   хэрэглэгчид харагдаг байх. Хэзээ ямар дугаартай хэрэглэгч like дарсан нь
//   харагддаг байх» + «хавсралтаар явуулсан хонхны icon ийг ХАЙЛТЫН ТҮҮХ
//   icon ний дараа оруул» ✓
//
// ⚠️ ЯАГААД LINK БИШ BUTTON ВЭ (толгойн мөрний бусад товч нь `<Link>`):
//   Facebook-д хонх дарахад ШУУД хуудас руу явахгүй — жижиг самбар (dropdown)
//   нээгдэж, сүүлийн мэдэгдлүүдийг товчхон харуулна ✓ Бүрэн жагсаалт нь
//   самбарын дээд булангийн «Бүгдийг харах» → `/notifications` хуудас ✓
//
// ⚠️ ЯАГААД `useAuth()` ГҮЙ ВЭ: `AppProviders` нь энэ компонентыг өөрөө
//   render хийдэг тул `useAuth`-ыг импортловол МОДУЛИЙН ЦИКЛ үүснэ ✗
//   Тиймээс `user` ба `onRequireAuth` нь ТУСЛАХ (prop) хэлбэрээр ирнэ ✓
//
// 📌 НЭЭХ ҮЕИЙН ЗАН ТӨЛӨВ (Facebook-ийн хэв):
//   ① Самбар нээгдмэгц «уншаагүй» мөрүүд нь ШАРГАЛЗСАН дэвсгэртэй хэвээр
//      харагдана (`freshIds` — нээх МӨЧИЙН төлөв), харин badge ДАРУЙ
//      цэвэрлэгдэнэ (нээсэн = уншсан ✓)
//   ② Гадна дарах / `Escape` → хаагдана ✓
//
// ⚠️ CDP/тестийн тогтвортой дэгээнүүд: `data-notification-bell`,
//    `data-notification-bell-button`, `data-notification-badge`,
//    `data-notification-panel`, `data-notification-row`,
//    `data-notification-phone`, `data-notification-remove` ✓
// ============================================================
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BellIcon } from './HeaderIcons';
import { useNotifications } from '../lib/notificationsClient';
import {
  actorLabel, badgeLabel, formatPhone, notificationEmoji,
  notificationText, notificationTimeAgo, panelRows, phoneHref,
} from '../lib/notifications.mjs';

/**
 * @param {{user: Object|null, onRequireAuth?: Function, className?: string}} props
 *   `user`          — нэвтэрсэн хэрэглэгч (`AppProviders`-ийн `user`)
 *   `onRequireAuth` — зочин хонх дарвал дуудагдана (`openAuth` ✓)
 */
export default function NotificationBell({ user, onRequireAuth, className = '' }) {
  const { items, unread, loading, error, markAllRead, remove } = useNotifications(user);
  const [open, setOpen] = useState(false);
  const [freshIds, setFreshIds] = useState([]);
  const wrapRef = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  /** 🔔 Хонх дарах: зочин бол нэвтрэх цонх, нэвтэрсэн бол самбар нээх/хаах ✓ */
  const handleClick = () => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }
    if (open) {
      setOpen(false);
      return;
    }
    // ⚠️ Нээх мөчийн «шинэ» мөрүүдийг тэмдэглэж аваад, badge-ийг цэвэрлэнэ ✓
    const ids = (items || []).filter((r) => !r.readAt).map((r) => r.id);
    setFreshIds(ids);
    setOpen(true);
    if (ids.length) markAllRead();
  };

  // Гадна дарах / `Escape` → хаах (ProfileModal/AuthModal-той ижил зан төлөв ✓)
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const rows = panelRows(items);
  const badge = badgeLabel(unread);

  return (
    <div ref={wrapRef} className={`relative ${className}`} data-notification-bell>
      <button
        type="button"
        onClick={handleClick}
        className="group relative inline-flex items-center justify-center rounded-full p-1.5 text-gray-700 transition-colors hover:text-gray-900"
        title={user ? 'Мэдэгдэл — зарыг хэн таалагдсан' : 'Мэдэгдэл (нэвтэрнэ үү)'}
        aria-label="Мэдэгдэл"
        aria-haspopup={user ? 'menu' : undefined}
        aria-expanded={user ? open : undefined}
        data-notification-bell-button
      >
        <BellIcon className="h-6 w-6 transition-transform duration-200 ease-out group-hover:scale-110" />
        {badge && (
          <span
            data-notification-badge
            className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-white"
          >
            {badge}
          </span>
        )}
      </button>

      {open && user && (
        <div
          role="menu"
          aria-label="Мэдэгдэл"
          data-notification-panel
          /* ⚠️ `w-[min(340px,calc(100vw-2rem))]` — мобайл (320px) дэлгэц дээр
             самбар дэлгэцээс ХАЛЬЖ ГАРАХГҮЙ ✓; `right-0` нь хонхтой зэрэгцэнэ */
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(340px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card-hover"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-bold text-gray-900">🔔 Мэдэгдэл</span>
            <Link
              href="/notifications"
              onClick={close}
              className="text-[12px] font-semibold text-primary hover:underline"
            >
              Бүгдийг харах
            </Link>
          </div>

          <div className="max-h-[70vh] overflow-y-auto">
            {loading && <BellNotice>Ачаалж байна…</BellNotice>}
            {!loading && error && <BellNotice>{error}</BellNotice>}
            {!loading && !error && rows.length === 0 && (
              <BellNotice>
                Одоогоор мэдэгдэл алга.
                <br />
                Таны зарыг хэн нэгэн таалагдвал энд харагдана.
              </BellNotice>
            )}
            {!loading && !error && rows.map((r) => (
              <BellRow
                key={r.id}
                row={r}
                fresh={freshIds.includes(r.id)}
                onNavigate={close}
                onRemove={() => remove(r.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Самбарын мэдээлэл мөр (ачаалж байна / алдаа / хоосон) — нэг л хэв ✓ */
function BellNotice({ children }) {
  return <p className="px-3 py-6 text-center text-[13px] leading-relaxed text-gray-500">{children}</p>;
}

/**
 * 🔔 Самбарын НЭГ мөр: ① дугуй avatar (хүний эхний үсэг + ❤️ төрлийн тэмдэг),
 * ② «<b>нэр/дугаар</b> таны «зар» зарыг таалагдлав» + 📞 дугаар/🕒 цаг,
 * ③ ✕ устгах товч. Мөр БҮХЭЛДЭЭ дарагдаж зар руу шилжинэ (`listingId` байвал ✓)
 */
function BellRow({ row, fresh, onNavigate, onRemove }) {
  const name = actorLabel(row);
  // ⚠️ `actorLabel` нь нэргүй хэрэглэгчид ДУГААРЫГ буцаадаг тул дугаарыг
  //    зөвхөн НЭР БАЙГАА үед тусдаа (📞 линк) харуулна — давхардал ГАРАХГҮЙ ✓
  const phone = formatPhone(row.actorPhone);
  const tel = phoneHref(row.actorPhone);
  const showPhone = !!phone && phone !== name;
  const emoji = notificationEmoji(row.type);
  const ago = notificationTimeAgo(row.createdAt);

  return (
    <div
      data-notification-row
      className={`relative flex items-start gap-2.5 border-b border-gray-100 px-3 py-2.5 last:border-b-0 ${
        fresh ? 'bg-primary/5' : ''
      }`}
    >
      {/* Зар руу шилжих бүрхсэн линк (агуулга нь `relative z-20`-оор дээр) */}
      {row.listingId && (
        <Link
          href={`/listings/${row.listingId}`}
          onClick={onNavigate}
          className="absolute inset-0 z-10 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`${row.listingTitle || 'Зар'} — зарыг нээх`}
          title="Зарыг нээх"
          data-notification-open
        />
      )}

      <span className="relative shrink-0" aria-hidden="true">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 text-[14px] font-bold text-gray-700">
          {name.charAt(0).toUpperCase() || '?'}
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] leading-none">
          {emoji}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className={`text-[13px] leading-snug text-gray-700 ${fresh ? 'font-semibold' : ''}`}>
          <b className="font-bold text-gray-900">{name}</b> {notificationText(row)}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-gray-500">
          {showPhone && tel && (
            <a
              href={tel}
              data-notification-phone
              className="relative z-20 font-semibold text-primary hover:underline"
              title={`Залгах: ${phone}`}
            >
              📞 {phone}
            </a>
          )}
          {ago && <span className="text-gray-400">🕒 {ago}</span>}
        </p>
      </div>

      <button
        type="button"
        onClick={onRemove}
        data-notification-remove
        title="Мэдэгдлийг устгах"
        aria-label="Мэдэгдлийг устгах"
        className="relative z-20 shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        ✕
      </button>
    </div>
  );
}
