// ============================================================
// messages.mjs — Хэрэглэгч хоорондын МЕССЕЖИЙН ЦЭВЭР логик
//                (React, Supabase-гүй — тест болон UI-д хамт хэрэглэгдэнэ)
//
// ⚠️ ЯАГААД ТУСДАА ФАЙЛ ВЭ:
//   Энэ модуль нь ЗӨВХӨН тооцоолол хийнэ (нэрийг хэн бэ, уншаагүй хэд вэ,
//   мессежийн текст зөв үү) — сүлжээ/DB/React-д хүрэхгүй. Ингэснээр
//   `npm run test:messages` нь Node дээр ШУУД ажиллаж, жагсаалт/badge-ийн
//   логикийг бодит browser/DB-гүйгээр түгжиж шалгана ✓
//   (DB талын функцууд: `lib/queries.js`, hook: `lib/messagesClient.js`)
// ============================================================

/** Мессеж бичигдэх хамгийн их урт (0020_messages.sql-ийн CHECK-тэй ИЖИЛ) */
export const MAX_MESSAGE_LENGTH = 2000;

/** Мессеж/яриа өөрчлөгдөхөд window дээр цацагдах event (badge шууд шинэчлэгдэнэ) */
export const CONVERSATION_CHANGED_EVENT = 'zarmn:messages-changed';

/**
 * Тухайн ярианы НӨГӨӨ талын хэрэглэгчийн id.
 * @param {{buyer_id?:string, seller_id?:string}} conversation
 * @param {string} myId
 * @returns {string|null} нөгөө тал, эсвэл тодорхойгүй бол null
 */
export function partnerId(conversation, myId) {
  if (!conversation) return null;
  const { buyer_id: buyer, seller_id: seller } = conversation;
  if (!myId) return seller || buyer || null;
  if (buyer === myId) return seller || null;
  if (seller === myId) return buyer || null;
  // ⚠️ Оролцогч БИШ (RLS ийм мөрийг буцаахгүй ч хамгаалалт болгож үлдээнэ)
  return null;
}

/**
 * Би энэ ярианы `buyer` эсвэл `seller` тал мөн эсэх.
 * @returns {'buyer'|'seller'|null}
 */
export function myRole(conversation, myId) {
  if (!conversation || !myId) return null;
  if (conversation.buyer_id === myId) return 'buyer';
  if (conversation.seller_id === myId) return 'seller';
  return null;
}

/**
 * Ярианы гарчиг — нөгөө талын НИЙТЭД харагдах нэр.
 * ⚠️ Нэр байхгүй бол «Зар нийтлэгч»/«Хэрэглэгч» гэсэн нөөц текст
 *    (хоосон мөр хэзээ ч гарахгүй ✓)
 */
export function conversationTitle(conversation, myId, partnerName) {
  const name = String(partnerName || '').trim();
  if (name) return name;
  return myRole(conversation, myId) === 'seller' ? 'Хэрэглэгч' : 'Зар нийтлэгч';
}

/** Жагсаалтын preview — урт мессежийг таслана (карт нэг мөрөнд багтана ✓) */
export function previewText(text, maxLength = 80) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1)}…`;
}

/** Жагсаалтын preview мөр — илгээгч нь би бол «Та: » угтвар нэмнэ */
export function previewWithSender(conversation, myId, maxLength = 80) {
  const body = previewText(conversation && conversation.last_message, maxLength);
  if (!body) return 'Мессеж бичих...';
  const mine = conversation && conversation.last_sender_id === myId;
  return mine ? `Та: ${body}` : body;
}

/**
 * Мессежийн текстийг шалгана (UI-д товч идэвхжүүлэх + алдаа харуулах).
 * @param {string} text
 * @returns {{ok: boolean, value: string, error: string|null}}
 */
export function validateMessageBody(text) {
  const value = String(text == null ? '' : text).replace(/\r\n/g, '\n').trim();
  if (!value) return { ok: false, value, error: 'Мессеж хоосон байна.' };
  if (value.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, value, error: `Мессеж хэт урт байна (${MAX_MESSAGE_LENGTH} тэмдэгт хүртэл).` };
  }
  return { ok: true, value, error: null };
}

/**
 * Яриаг сүүлийн мессежээр эрэмбэлнэ (шинэ нь ЭХЭНД).
 * ⚠️ Мутац хийхгүй — шинэ массив буцаана.
 */
export function sortConversations(list = []) {
  return [...list].sort((a, b) => {
    const ta = new Date((a && a.last_message_at) || 0).getTime() || 0;
    const tb = new Date((b && b.last_message_at) || 0).getTime() || 0;
    return tb - ta;
  });
}

/**
 * Уншаагүй мессежийн тоог ЯРИА ТУС БҮРЭЭР тоолно.
 *
 * @param {Array<{conversation_id:string, sender_id:string}>} rows
 *        `read_at is null` мессежүүд
 * @param {string} myId
 * @returns {Object<string, number>} `{ [conversation_id]: тоо }`
 *
 * ⚠️ ӨӨРИЙН илгээсэн мессежийг «уншаагүй» гэж тоолохгүй (read_at нь
 *    хүлээн авагчид зориулагдсан) ✓
 */
export function unreadByConversation(rows = [], myId) {
  const out = {};
  (rows || []).forEach((m) => {
    if (!m || !m.conversation_id) return;
    if (myId && m.sender_id === myId) return;
    out[m.conversation_id] = (out[m.conversation_id] || 0) + 1;
  });
  return out;
}

/** Нийт уншаагүй мессежийн тоо (nav-ийн badge) */
export function totalUnread(rows = [], myId) {
  return Object.values(unreadByConversation(rows, myId)).reduce((a, b) => a + b, 0);
}

/**
 * Нэг ярианы мессежүүдийг UI-д бэлдэнэ: хуучин → шинэ дараалалтай,
 * `mine` (би илгээсэн эсэх) ба `read` (уншсан эсэх) тэмдэгтэй.
 *
 * ⚠️ Би өөрөө илгээсэн мессеж нь үргэлж `read: true` — миний зүгээс
 *    «уншаагүй» гэж байхгүй (read_at нь хүлээн авагчид зориулагдсан) ✓
 */
export function decorateThread(messages = [], myId) {
  return [...(messages || [])]
    .sort((a, b) => {
      const ta = new Date((a && a.created_at) || 0).getTime() || 0;
      const tb = new Date((b && b.created_at) || 0).getTime() || 0;
      return ta - tb;
    })
    .map((m) => ({
      ...m,
      mine: !!(myId && m.sender_id === myId),
      read: !!m.read_at || !!(myId && m.sender_id === myId),
    }));
}

/**
 * Мессеж бичих боломжтой эсэх.
 * @returns {{ok: boolean, reason: 'self'|'auth'|null, error: string|null}}
 */
export function canMessage(meId, otherId) {
  if (!meId) {
    return { ok: false, reason: 'auth', error: 'Мессеж бичихийн тулд эхлээд нэвтэрнэ үү.' };
  }
  if (!otherId) {
    return { ok: false, reason: 'auth', error: 'Хэнд мессеж бичихээ тодорхойлж чадсангүй.' };
  }
  if (meId === otherId) {
    return { ok: false, reason: 'self', error: 'Өөрийн зар руу мессеж бичих боломжгүй.' };
  }
  return { ok: true, reason: null, error: null };
}

/** `?c=<uuid>`-г уншина (тодорхойгүй/буруу бол null) */
export function readConversationParam(search = '') {
  const raw = String(search || '').replace(/^\?/, '');
  if (!raw) return null;
  const value = new URLSearchParams(raw).get('c');
  const id = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}

/** Ярианы линк (`/messages?c=<id>` — хуваалцаж/refresh хийж болно ✓) */
export function conversationHref(conversationId) {
  return `/messages?c=${encodeURIComponent(conversationId || '')}`;
}
