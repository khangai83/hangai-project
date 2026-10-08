'use client';

// ============================================================
// NotificationsClient.jsx — 🔔 `/notifications` ХУУДАС (бүрэн жагсаалт)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-08): «ямар ямар хэрэглэгч ямар зар дээр нь
//   like дараад байгаа нь зар оруулсан хэрэглэгчид харагдаг байх. Хэзээ ямар
//   ДУГААРТАЙ хэрэглэгч like дарсан нь харагддаг байх» ✓
//
// 📌 ХОЁР ТҮВШИН (энэ нь хүсэлтийн ГОЛ шийдэл):
//   ① ЗАРААР БҮЛЭГЛЭСЭН КАРТ (`groupByListing` — `lib/notifications.mjs`):
//      «Зар бүр дээр ХЭН ХЭН ❤️ дарсан бэ» — картын гарчигт зарын нэр ба
//      «N хүн таалагдлав», доор нь хүмүүсийн жагсаалт ✓
//   ② Мөр бүрд — НЭР (байвал) + 📞 ДУГААР (үргэлж, `tel:` линктэй ✓) + 🕒 ЦАГ
//   🚫 (69b) «таны «…» зарыг таалагдлав» гэсэн өгүүлбэр БАЙХГҮЙ (хэрэглэгчийн
//      хүсэлт: «таны зарыг таалагдлав, зарыг таалагдав гэсэн текстүүдийг
//      байхгүй болго») — ❤️ төрлийн тэмдэг, бүлгийн «❤️ N хүн таалагдлав»
//      тоо, 🏠 гарчиг гурвуулаа хангалттай ✓
//   ⚠️ Цаг нь `historyTimeAgo` («5 минутын өмнө / Өчигдөр / 2026.10.07») —
//      «Хайлтын түүх»-тэй ЯГ ИЖИЛ формат (нэг эх сурвалж ✓)
//
// ⚠️ Төлөвүүд (бусад client компоненттой ижил хэв):
//   • зочин      → «нэвтэрнэ үү» хайрцаг + `openAuth()` товч
//   • миграцгүй  → `error` мессеж (0040_notifications.sql-ийг ажиллуулах заавар)
//   • хоосон     → 🔔 иконтой тайлбар
//
// ⚠️ CDP/тестийн дэгээнүүд: `data-notifications`, `data-notifications-count`,
//    `data-notifications-mark-all`, `data-notifications-clear`,
//    `data-notifications-group`, `data-notifications-group-title`,
//    `data-notifications-row`, `data-notifications-phone`,
//    `data-notifications-remove` ✓
// ============================================================
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth, useToast, useUI } from './AppProviders';
import { BellIcon } from './HeaderIcons';
import { useNotifications } from '../lib/notificationsClient';
import {
  actorLabel, formatPhone, groupByListing, groupCountLabel, groupTitleLabel,
  notificationEmoji, notificationTimeAgo, phoneHref,
} from '../lib/notifications.mjs';

export default function NotificationsClient() {
  const { user, authLoading } = useAuth();
  const { showToast } = useToast();
  const { openAuth } = useUI();
  const { items, loading, error, unread, markAllRead, remove, clear } = useNotifications(user);
  const [notice, setNotice] = useState('');

  // Бүлэглэлт нь зөвхөн `items` өөрчлөгдөхөд дахин бодогдоно ✓
  const groups = useMemo(() => groupByListing(items), [items]);

  const markAll = async () => {
    const n = await markAllRead();
    if (n) showToast(`🔔 ${n} мэдэгдлийг уншсан болголоо`);
  };

  const clearAll = async () => {
    if (!window.confirm(`${items.length} мэдэгдлийг бүгдийг нь устгах уу?`)) return;
    if (await clear()) setNotice('Бүх мэдэгдлийг устгав');
  };

  const removeOne = async (row) => {
    if (await remove(row.id)) setNotice('Мэдэгдлийг устгав');
  };

  // ---- ЗОЧИН: нэвтрэх шаардлага (AuthModal-ийг нээнэ ✓) ----
  if (!authLoading && !user) {
    return (
      <div data-notifications className="mx-auto max-w-[720px] py-10 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gray-100 text-gray-400">
          <BellIcon className="h-10 w-10" strokeWidth={1.4} />
        </div>
        <h2 className="mt-4 text-xl font-bold">🔔 Мэдэгдэл</h2>
        <p className="mx-auto mt-2 max-w-[520px] text-sm leading-relaxed text-gray-500">
          Таны зар хэн нэгэнд таалагдвал энд харагдана. Мэдэгдлээ харахын тулд
          утасны дугаараараа нэвтэрнэ үү.
        </p>
        <button type="button" className="btn btn-primary mt-5" onClick={openAuth}>
          🔑 Нэвтрэх
        </button>
      </div>
    );
  }

  return (
    <div data-notifications>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">🔔 Мэдэгдэл</h2>
          <p className="text-sm text-gray-500" data-notifications-count>
            {loading
              ? 'Ачаалж байна…'
              : items.length
                ? `${items.length} мэдэгдэл · ${groups.length} зар${unread ? ` · ${unread} уншаагүй` : ''}`
                : 'Хоосон байна'}
          </p>
        </div>
        {!loading && items.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {unread > 0 && (
              <button type="button" className="btn btn-outline btn-sm" data-notifications-mark-all onClick={markAll}>
                Бүгдийг уншсан
              </button>
            )}
            <button type="button" className="btn btn-outline btn-sm" data-notifications-clear onClick={clearAll}>
              Цэвэрлэх
            </button>
          </div>
        )}
      </div>
      {notice && (
        <p className="mb-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-600">
          {notice}
        </p>
      )}

      {/* ⚠️ Миграц ороогүй бол `error` (ойлгомжтой заавартай) — мессежийн хэв ✓ */}
      {error && !loading && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-[13.5px] leading-relaxed text-amber-800">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-card">
          Ачаалж байна…
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center shadow-card">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gray-100 text-gray-400">
            <BellIcon className="h-8 w-8" strokeWidth={1.4} />
          </div>
          <p className="mt-3 text-[15px] font-semibold text-gray-900">Одоогоор мэдэгдэл алга</p>
          <p className="mx-auto mt-1 max-w-[520px] text-[13.5px] leading-relaxed text-gray-500">
            Таны зар дээр хэн нэгэн ❤️ дарвал энэ хуудсанд хэзээ, ямар дугаартай
            хэрэглэгч дарсан нь харагдана.
          </p>
          <Link href="/my-listings" className="btn btn-outline btn-sm mt-4 inline-flex">
            📋 Миний зарууд
          </Link>
        </div>
      )}

      {/* ---- ① ЗАРААР БҮЛЭГЛЭСЭН КАРТУУД (`groupByListing` ✓) ---- */}
      {!loading && !error && groups.map((g) => (
        <ListingGroup key={g.listingId || 'none'} group={g} onRemove={removeOne} />
      ))}
    </div>
  );
}

/**
 * 🏠 НЭГ ЗАРЫН БҮЛЭГ — «энэ зар дээр хэн хэн ❤️ дарсан бэ» гэдгийг нэг картад
 * харуулна (`groupByListing`-ийн бүлэг). Карт нь `SearchHistoryClient`-ийн ЯГ
 * ИЖИЛ хэв: `rounded-2xl border border-gray-200 bg-white shadow-card` + hover ✓
 */
function ListingGroup({ group, onRemove }) {
  const title = groupTitleLabel(group);
  const count = groupCountLabel(group);
  return (
    <section
      data-notifications-group
      className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-card transition-shadow duration-200 ease-out hover:shadow-card-hover"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          {group.listingId ? (
            <Link
              href={`/listings/${group.listingId}`}
              data-notifications-group-title
              className="group inline-flex max-w-full items-center gap-1.5 text-[15px] font-bold text-gray-900 hover:text-primary"
              title="Зарыг нээх"
            >
              <span className="truncate">🏠 {title}</span>
              <span className="shrink-0 text-[13px] font-semibold text-primary opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                →
              </span>
            </Link>
          ) : (
            <span data-notifications-group-title className="text-[15px] font-bold text-gray-900">
              🏠 {title}
            </span>
          )}
          <p className="mt-0.5 text-[12.5px] text-gray-500">
            ❤️ {count}
            {group.unread > 0 && (
              <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11.5px] font-bold text-primary">
                {group.unread} шинэ
              </span>
            )}
          </p>
        </div>
        {group.lastAt && (
          <span className="shrink-0 text-[12px] text-gray-400">🕒 {notificationTimeAgo(group.lastAt)}</span>
        )}
      </div>

      <div>
        {group.rows.map((row) => (
          <GroupRow key={row.id} row={row} onRemove={onRemove} />
        ))}
      </div>
    </section>
  );
}



/**
 * 👤 Бүлэг доторх НЭГ мөр: ① нэр (байвал) + 📞 ДУГААР (ҮРГЭЛЖ — хэрэглэгчийн
 * гол хүсэлт ✓, `tel:` линктэй), ② 🕒 цаг, ③ уншаагүй бол цэнхэр цэг,
 * ④ ✕ устгах товч. Мөр дээр дарахад зар руу шилжинэ (`listingId` байвал ✓)
 */
function GroupRow({ row, onRemove }) {
  const name = actorLabel(row);
  const phone = formatPhone(row.actorPhone);
  const tel = phoneHref(row.actorPhone);
  // ⚠️ Нэр нь ЗӨВХӨН хоч нэр байгаа үед — дугаар нь тусдаа мөрөнд гарна ✓
  const showName = !!name && name !== phone;
  return (
    <div
      data-notifications-row
      className={`relative flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0 ${
        row.readAt ? '' : 'bg-primary/5'
      }`}
    >
      {row.listingId && (
        <Link
          href={`/listings/${row.listingId}`}
          className="absolute inset-0 z-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`${row.listingTitle || 'Зар'} — зарыг нээх`}
          title="Зарыг нээх"
        />
      )}

      <span className="relative shrink-0" aria-hidden="true">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gray-100 text-[15px] font-bold text-gray-700">
          {name.charAt(0).toUpperCase() || '?'}
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] leading-none">
          {notificationEmoji(row.type)}
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] leading-snug">
          {showName && <b className="font-bold text-gray-900">{name}</b>}
          {tel ? (
            <a
              href={tel}
              data-notifications-phone
              className="relative z-20 inline-flex items-center gap-1 font-bold text-primary hover:underline"
              title={`Залгах: ${phone}`}
            >
              📞 {phone}
            </a>
          ) : (
            <span className="font-semibold text-gray-700">📞 Дугаар байхгүй</span>
          )}
          {!row.readAt && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">шинэ</span>
          )}
        </p>
        <p className="mt-0.5 text-[12.5px] text-gray-500">
          {row.createdAt ? (
            <span className="text-gray-400">🕒 {notificationTimeAgo(row.createdAt)}</span>
          ) : null}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onRemove(row)}
        data-notifications-remove
        title="Мэдэгдлийг устгах"
        aria-label="Мэдэгдлийг устгах"
        className="relative z-20 shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
      >
        ✕
      </button>
    </div>
  );
}
