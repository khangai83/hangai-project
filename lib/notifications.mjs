// ============================================================
// notifications.mjs — 🔔 «МЭДЭГДЭЛ»-ийн ЦЭВЭР логик
//                     (React, Supabase-гүй — тест болон UI-д хамт хэрэглэгдэнэ)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-08): «facebook шиг notification тэй болгоё…
//   ямар ямар хэрэглэгч ямар зар дээр нь like дараад байгаа нь зар оруулсан
//   хэрэглэгчид харагдаг байх. Хэзээ ямар дугаартай хэрэглэгч like дарсан нь
//   харагддаг байх» ✓
//
// ⚠️ ЯАГААД ТУСДАА ФАЙЛ ВЭ (`lib/messages.mjs`-ийн ЯГ ИЖИЛ загвар):
//   Энэ модуль ЗӨВХӨН тооцоолол хийнэ — «хэн бэ», «хэд нь шинэ вэ», «аль
//   зараар бүлэглэх вэ», «цаг хэдэнтэй вэ». Сүлжээ/DB/React-д ХҮРЭХГҮЙ ⇒
//   `npm run test:notifications` нь Node дээр ШУУД ажиллана ✓
//   (DB функцууд: `lib/queries.js`, hook: `lib/notificationsClient.js`,
//    UI: `components/NotificationBell.jsx` + `components/NotificationsClient.jsx`)
//
// 📌 МЭДЭГДЛИЙН МӨР ЮУ АГУУЛНА (0040_notifications.sql):
//   `id, type, listing_id, listing_title, actor_id, actor_name, actor_phone,
//    read_at, created_at` — `listing_title`/`actor_name`/`actor_phone` нь
//   ХУУЛБАР (snapshot) тул зар устсан/засагдсан ч «тэр үед хэн, юу» гэдэг нь
//   харагдсаар байна ✓
// ============================================================
// ⏱ Харьцангуй цаг — «🕐 Хайлтын түүх»-тэй ЯГ ИЖИЛ дүрэм (нэг эх сурвалж:
//    `lib/searchHistory.mjs → historyTimeAgo`) ⇒ «5 минутын өмнө / Өчигдөр /
//    2026.10.07» гэсэн формат бүх хуудсанд НЭГ л байна ✓
import { historyTimeAgo } from './searchHistory.mjs';

// ---- ТОГТМОЛУУД ----------------------------------------------------------

/** Нэг хуудасны бүх компонентыг мэдэгдэх event (хонхны badge шууд шинэчлэгдэнэ) */
export const NOTIFICATIONS_EVENT = 'zarmn:notifications-changed';

/** Жагсаалтад татах дээд хязгаар (хуудаслалт хийхгүй — олон бол дараа нэмнэ) */
export const NOTIFICATIONS_LIMIT = 200;

/** 🔔 Хонхны dropdown-д харуулах хамгийн сүүлийн мэдэгдлийн тоо */
export const NOTIFICATION_PANEL_LIMIT = 6;

/** Одоогоор цорын ганц төрөл — ❤️ «Таалагдсан» (ирээдүйд 'message' г.м.) */
export const NOTIFICATION_TYPE_LIKE = 'like';

/**
 * Төрөл бүрийн харагдац — `emoji` (badge/карт) ба `label` (шошго).
 * ⚠️ Шинэ төрөл нэмэхэд ЗӨВХӨН энэ объект + 0040-ийн CHECK солигдоно ✓
 */
export const NOTIFICATION_TYPE_META = {
  like: { emoji: '❤️', label: 'Таалагдсан' },
};

/** Хэн болох нь тодорхойгүй үед гарах нэр */
export const UNKNOWN_ACTOR = 'Хэрэглэгч';

// ---- Төрөл ---------------------------------------------------------------

/** Төрлийн мета (танихгүй төрөлд ❤️-ийн нөөц утга — UI хэзээ ч хоосон болохгүй) */
export function notificationTypeMeta(type) {
  return NOTIFICATION_TYPE_META[type] || NOTIFICATION_TYPE_META[NOTIFICATION_TYPE_LIKE];
}

/** Төрлийн emoji (ж: `❤️`) */
export function notificationEmoji(type) {
  return notificationTypeMeta(type).emoji;
}

// ---- Мөр бэлтгэх (DB → UI) ----------------------------------------------

/**
 * DB-ийн мөрийг UI-д эвтэйхэн хэлбэр рүү хөрвүүлнэ (camelCase).
 * ⚠️ `id` байхгүй бол `null` — эвдэрхий мөрийг UI-д ОРУУЛАХГҮЙ ✓
 * @param {Object} row `public.notifications`-ийн мөр
 * @returns {{id:string, type:string, listingId:string|null, listingTitle:string,
 *   actorId:string|null, actorName:string, actorPhone:string, readAt:string|null,
 *   createdAt:string}|null}
 */
export function normalizeNotificationRow(row) {
  if (!row || !row.id) return null;
  return {
    id: String(row.id),
    type: row.type || NOTIFICATION_TYPE_LIKE,
    listingId: row.listing_id || null,
    listingTitle: String(row.listing_title || '').trim(),
    actorId: row.actor_id || null,
    actorName: String(row.actor_name || '').trim(),
    actorPhone: String(row.actor_phone || '').trim(),
    readAt: row.read_at || null,
    createdAt: row.created_at || '',
  };
}

// ---- Хэн бэ --------------------------------------------------------------

/**
 * Утасны дугаарыг УНШИГДАХ хэлбэрт оруулна: `+97688112233` → `+976 8811 2233`.
 * ⚠️ Танихгүй формат (гадаад дугаар г.м.) бол ГУЙЦУУРАХГҮЙ — «утга нь үнэн» ✓
 * ⚠️ `lib/format.js → normalizePhone` нь +976 НЭМДЭГ (4-4 хуваахгүй) тул энэ
 *    нь ТУСДАА функц — `format.js`-ыг (locationData-той холбоотой) Node
 *    тест рүү чирэхгүйн тулд эндээ байна ✓
 */
export function formatPhone(phone) {
  const raw = String(phone || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('976')) {
    return `+976 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 8) {
    return `+976 ${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  return raw;
}

/** `tel:` линк — зөвхөн цифрүүд (ж: `tel:+97688112233`) */
export function phoneHref(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return `tel:+${digits.startsWith('976') ? digits : `976${digits}`}`;
}

/**
 * ❤️ дарсан хүний ШОШГО: хоч нэр → утасны дугаар → «Хэрэглэгч».
 * ⚠️ Энэ системд хэрэглэгчийг УТАСНЫ ДУГААРАА танина (нэр нь заавал биш) ⇒
 *    нэргүй хэрэглэгч «Хэрэглэгч» гэж бүрхэгдэхгүй, ДУГААРААРАА харагдана ✓
 *    (хэрэглэгчийн хүсэлт: «ямар дугаартай хэрэглэгч like дарсан нь харагддаг»)
 */
export function actorLabel(row) {
  const r = row || {};
  if (r.actorName) return r.actorName;
  const phone = formatPhone(r.actorPhone);
  return phone || UNKNOWN_ACTOR;
}

/** Нэрийн эхний үсэг (`Avatar`-ийн нөөц) — нэргүй бол дугаарын эхний цифр */
export function actorInitial(row) {
  return actorLabel(row).charAt(0).toUpperCase() || '?';
}

/**
 * Зарын нэрийг «»-тэй болгох: `«3 өрөө байр»` (гарчиггүй бол `«Зар»`).
 * ⚠️ Хадгалагдсан гарчиг нь ХУУЛБАР — зар засагдсан ч хуучин утгаараа ✓
 */
export function listingLabel(row) {
  const title = String((row && row.listingTitle) || '').trim();
  return `«${title || 'Зар'}»`;
}

/**
 * Мөрний ТЕКСТ (Facebook-ийн хэв): «таны «3 өрөө байр» зарыг таалагдлав».
 * ⚠️ Хүний нэр энд ОРОХГҮЙ — товч/мөрөнд `actorLabel`-аар тусдаа гарна
 *    (урт нэрээр текст муухай тасрахаас сэргийлнэ ✓)
 */
export function notificationText(row, { withListing = true } = {}) {
  const type = (row && row.type) || NOTIFICATION_TYPE_LIKE;
  // ⚠️ `withListing: false` — гарчиг нь ТУСДАА (товдсон) мөрөнд гардаг газарт
  //    (ж: хонхны самбар `🏠 «…»`) давхардуулахгүйн тулд ✓
  const what = withListing ? ` ${listingLabel(row)}` : '';
  if (type === NOTIFICATION_TYPE_LIKE) {
    return `таны${what} зарыг таалагдлав`;
  }
  return `таны${what} зар дээр шинэ үйлдэл хийв`;
}

// ---- Цаг ----------------------------------------------------------------

/** Харьцангуй цаг — «Саяхан · 5 минутын өмнө · Өчигдөр · 2026.10.07» */
export function notificationTimeAgo(iso, now) {
  return historyTimeAgo(iso, now);
}



// ---- Эрэмбэ ба тоо -------------------------------------------------------

/**
 * Шинэ нь ЭХЭНД (цэвэр функц — оролтын массивыг ӨӨРЧЛӨХГҮЙ).
 * ⚠️ Огноо эвдэрхий мөр хамгийн СҮҮЛД (харагдахгүй болохгүй) ✓
 */
export function sortNotifications(rows = []) {
  return [...(rows || [])].sort(
    (a, b) => (Date.parse((b && b.createdAt) || '') || 0) - (Date.parse((a && a.createdAt) || '') || 0)
  );
}

/** УНШААГҮЙ мэдэгдлийн тоо (хонхны badge) */
export function unreadCount(rows = []) {
  return (rows || []).filter((r) => r && !r.readAt).length;
}

/** Хонхны dropdown-д гарах хамгийн сүүлийн `limit` мөр */
export function panelRows(rows = [], limit = NOTIFICATION_PANEL_LIMIT) {
  return sortNotifications(rows).slice(0, Math.max(0, limit));
}

/** Badge-ийн текст — 99-өөс олон бол `99+` (мессежийн badge-тай ИЖИЛ ✓) */
export function badgeLabel(n) {
  const num = Number(n) || 0;
  if (num <= 0) return '';
  return num > 99 ? '99+' : String(num);
}

// ---- Зараар бүлэглэх ----------------------------------------------------

/**
 * Мэдэгдлийг ЗАРААР бүлэглэнэ — «энэ зар дээр хэн хэн ❤️ дарсан бэ» гэсэн
 * хэрэглэгчийн ҮНДСЭН асуултад шууд хариулах харагдац ✓
 *
 *   [{ listingId, listingTitle, total, unread, lastAt, rows: [...] }, …]
 *
 * ⚠️ Бүлгүүд нь `lastAt`-аар буурна (хамгийн сүүлд ❤️ дарсан зар ЭХЭНД),
 *    бүлэг доторх мөрүүд ч шинэ нь эхэнд ✓
 * ⚠️ `listingId` байхгүй мөр `none` түлхүүрээр НЭГ бүлэгт цуглана (зар устсан
 *    үед `on delete cascade` ажиллах ёстой ч хамгаалалт болгож үлдээнэ)
 */
export function groupByListing(rows = []) {
  const map = new Map();
  sortNotifications(rows).forEach((r) => {
    if (!r) return;
    const key = r.listingId || 'none';
    let g = map.get(key);
    if (!g) {
      g = {
        listingId: r.listingId || null,
        listingTitle: r.listingTitle || '',
        total: 0,
        unread: 0,
        lastAt: r.createdAt || '',
        rows: [],
      };
      map.set(key, g);
    }
    g.total += 1;
    if (!r.readAt) g.unread += 1;
    if (!g.listingTitle && r.listingTitle) g.listingTitle = r.listingTitle;
    if ((Date.parse(r.createdAt) || 0) > (Date.parse(g.lastAt) || 0)) g.lastAt = r.createdAt;
    g.rows.push(r);
  });
  return [...map.values()].sort((a, b) => (Date.parse(b.lastAt) || 0) - (Date.parse(a.lastAt) || 0));
}

/** Бүлгийн шошго: «4 хүн таалагдлав» / «1 хүн таалагдлав» */
export function groupCountLabel(group) {
  const n = Number((group && group.total) || 0);
  if (!n) return 'Таалагдсан хүн алга';
  return `${n} хүн таалагдлав`;
}

/**
 * 🏠 Зарын гарчиг ШОШГОГҮЙ (`«…»`-гүй) — хоосон/байхгүй бол «Зар».
 * ⚠️ Хэрэглэгчийн хүсэлт (69): «ямар зар дээр нь like дарсаныг ШУУД мэдэж
 *    болохоор зарын гарчигийг оруул» ⇒ гарчиг нь товдсон мөрөнд (`🏠 …`),
 *    бүлгийн толгойд, `notificationText()` дотор ГУРВУУЛАА нэг эх сурвалжаас ✓
 * ⚠️ Хадгалагдсан гарчиг нь ХУУЛБАР (snapshot) — 0041 миграц нь `listings.title`
 *    хоосон үед «төрөл · дүүрэг» (ж: «Орон сууц · Баянгол») гэж бөглөдөг ✓
 */
export function listingTitleLabel(row) {
  return String((row && row.listingTitle) || '').trim() || 'Зар';
}

/** Бүлгийн гарчиг: «3 өрөө байр» (хоосон бол «Зар») */
export function groupTitleLabel(group) {
  return listingTitleLabel(group);
}
