'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import MessageIcon from './MessageIcon';
import { useAuth, useUI, useToast } from './AppProviders';
import {
  fetchConversations, fetchConversation, fetchMessages, fetchProfilesByIds,
  fetchUnreadMessages, markConversationRead, sendMessage,
} from '../lib/queries';
import {
  conversationHref, conversationTitle, decorateThread, partnerId,
  previewWithSender, readConversationParam, sortConversations,
  unreadByConversation, validateMessageBody,
} from '../lib/messages.mjs';
import { notifyMessagesChanged } from '../lib/messagesClient';
import { normalizeError } from '../lib/errors';
import { timeAgo } from '../lib/format';

/**
 * ✉️ МЕССЕЖ — ХЭРЭГЛЭГЧ ХООРОНДЫН ЧАТ (master-detail).
 *
 * ⚠️ ЗАГВАР:
 *   • ДЕСКТОП (lg+): зүүн талд ярианы жагсаалт, баруун талд мессежүүд
 *   • МОБАЙЛ: нэг л багана — жагсаалт ЭСВЭЛ нээсэн чат (буцах товчтой ✓)
 *   ⚠️ Нээсэн яриа нь URL-д бичигдэнэ (`?c=<uuid>`) — refresh/хуваалцахад
 *      ижил чат нээгдэнэ, browser-ийн «Буцах» товч ч ажиллана ✓
 *   ⚠️ RLS нь зөвхөн оролцсон яриаг буцаадаг тул серверийн route байхгүй ✓
 *   ⚠️ 20 секунд тутам «чимээгүй» шинэчилнэ (spinner ДАХИН гарч ирэхгүй) ✓
 */
const POLL_MS = 20000;

export default function MessagesClient() {
  const { user, authLoading } = useAuth();
  const { openAuth } = useUI();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState(null); // null = ачаалж байна
  const [profiles, setProfiles] = useState({}); // userId → { displayName, avatarUrl }
  const [unreadMap, setUnreadMap] = useState({}); // conversationId → тоо
  const [listError, setListError] = useState(null);

  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState(null); // null = ачаалж байна
  const [threadError, setThreadError] = useState(null);

  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const scrollRef = useRef(null);

  // ---------- Өгөгдөл татах ----------
  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    if (!user) {
      setConversations([]);
      setUnreadMap({});
      return;
    }
    if (!silent) setConversations(null);
    try {
      const rows = sortConversations(await fetchConversations(user.id));
      setConversations(rows);
      setListError(null);

      // ⚠️ Уншаагүйн тоо нь ТУСДАА query — нэг нь унавал нөгөө нь ажиллана ✓
      const unreadRows = await fetchUnreadMessages(user.id).catch(() => []);
      setUnreadMap(unreadByConversation(unreadRows, user.id));

      const partnerIds = rows.map((c) => partnerId(c, user.id)).filter(Boolean);
      // ⚠️ `await`-ийг `setProfiles(prev => ...)` дотор ШУУД бичих БОЛОМЖГҮЙ
      //    (setState-ийн callback нь async биш) → эхлээд гадна талд татна ✓
      const fetched = await fetchProfilesByIds(partnerIds).catch(() => ({}));
      setProfiles((prev) => ({ ...prev, ...fetched }));
    } catch (err) {
      const e = normalizeError(err);
      console.error(e);
      setConversations([]);
      setListError(e);
    }
  }, [user]);

  const loadThread = useCallback(async (conversationId, { silent = false } = {}) => {
    if (!conversationId || !user) {
      setMessages([]);
      return;
    }
    if (!silent) setMessages(null);
    try {
      const rows = await fetchMessages(conversationId);
      setMessages(decorateThread(rows, user.id));
      setThreadError(null);

      // ⚠️ ЗӨВХӨН уншаагүй мессеж байгаа үед л шинэчилнэ (хүсэлт хэмнэнэ ✓)
      const hasUnread = rows.some((m) => !m.read_at && m.sender_id !== user.id);
      if (hasUnread) {
        const changed = await markConversationRead(conversationId, user.id);
        if (changed > 0) {
          setUnreadMap((prev) => {
            const next = { ...prev };
            delete next[conversationId];
            return next;
          });
          notifyMessagesChanged();
        }
      }
    } catch (err) {
      const e = normalizeError(err);
      console.error(e);
      setMessages([]);
      setThreadError(e);
    }
  }, [user]);

  // ---------- Эхний ачаалалт + ?c= линк ----------
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;
    const fromUrl = readConversationParam(window.location.search);
    if (fromUrl) setActiveId((cur) => cur || fromUrl);
  }, [user]);

  useEffect(() => {
    if (activeId) loadThread(activeId);
  }, [activeId, loadThread]);

  // ---------- Polling (чинээгүй) ----------
  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      loadConversations({ silent: true });
      if (activeId) loadThread(activeId, { silent: true });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [user, activeId, loadConversations, loadThread]);

  // ---------- Мессеж ирэхэд доош гүйлгэх ----------
  useEffect(() => {
    const box = scrollRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [activeId, messages]);

  const totalUnread = useMemo(
    () => Object.values(unreadMap).reduce((a, b) => a + b, 0),
    [unreadMap]
  );

  // ---------- Линкээр шууд орсон яриа (жагсаалтад ороогүй бол) ----------
  useEffect(() => {
    if (!user || !activeId || !conversations) return undefined;
    if (conversations.some((c) => c.id === activeId)) return undefined;
    let alive = true;
    (async () => {
      try {
        const conv = await fetchConversation(activeId);
        if (!alive || !conv) return;
        setConversations((prev) => sortConversations([conv, ...(prev || [])]));
        const pid = partnerId(conv, user.id);
        if (pid) {
          const map = await fetchProfilesByIds([pid]).catch(() => ({}));
          if (alive) setProfiles((prev) => ({ ...prev, ...map }));
        }
      } catch (err) {
        console.warn('[messages] яриаг татаж чадсангүй:', (err && err.message) || err);
      }
    })();
    return () => { alive = false; };
  }, [user, activeId, conversations]);

  // ---------- Үйлдлүүд ----------
  const selectConversation = (conversationId) => {
    setActiveId(conversationId);
    // ⚠️ `router.push` биш `replaceState` — хуудас дахин render/render-scroll
    //    хийгдэхгүй (чат доторх навигац нь зөвхөн UI-ийн шилжилт ✓)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', conversationHref(conversationId));
    }
  };

  const backToList = () => {
    setActiveId(null);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/messages');
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Мессеж бичихийн тулд эхлээд нэвтэрнэ үү.', 'error');
      openAuth();
      return;
    }
    const check = validateMessageBody(text);
    if (!check.ok) {
      showToast(check.error, 'error');
      return;
    }
    setSending(true);
    try {
      const row = await sendMessage({ conversationId: activeId, senderId: user.id, body: check.value });
      setText('');
      setMessages((prev) => decorateThread([...(prev || []), row], user.id));
      // ⚠️ Жагсаалтын preview-г ШУУД шинэчилнэ (серверээс дахин асуухгүй) ✓
      setConversations((prev) => sortConversations((prev || []).map((c) => (
        c.id === activeId
          ? { ...c, last_message: row.body, last_sender_id: user.id, last_message_at: row.created_at }
          : c
      ))));
      notifyMessagesChanged();
    } catch (err) {
      showToast((err && err.message) || 'Мессеж илгээж чадсангүй.', 'error');
    } finally {
      setSending(false);
    }
  };

  /** Ярианы гарчиг (нөгөө талын нэр) */
  const titleFor = (conversation) => conversationTitle(
    conversation,
    user ? user.id : null,
    profiles[partnerId(conversation, user ? user.id : null)]
      ? profiles[partnerId(conversation, user ? user.id : null)].displayName
      : ''
  );

  const activeConversation = useMemo(
    () => (conversations || []).find((c) => c.id === activeId) || null,
    [conversations, activeId]
  );

  // ---------- Ачаалж байна ----------
  if (authLoading) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      </div>
    );
  }

  // ---------- Нэвтрээгүй ----------
  if (!user) {
    return (
      <div className="page-container">
        <div className="mx-auto max-w-[560px] px-5 py-16 text-center">
          {/* ⚠️ 2026-09-29: emoji `✉️` → `MessageIcon` (орчин үеийн SVG) */}
          <div className="mb-4 flex justify-center text-primary/70">
            <MessageIcon className="h-16 w-16" strokeWidth={1.4} />
          </div>
          <h1 className="mb-2 text-2xl font-bold">Мессеж</h1>
          <p className="text-gray-500">
            Зар нийтлэгчтэй мессежээр харилцахад <b>бүртгэлтэй хэрэглэгч</b> байх
            шаардлагатай. Ингэснээр мессежийг хэн илгээснийг тодорхойлж, хариу
            авах боломжтой болно.
          </p>
          <button type="button" className="btn btn-primary btn-lg mt-5" onClick={openAuth}>
            🔑 Нэвтрэх / Бүртгүүлэх
          </button>
        </div>
      </div>
    );
  }

  // ---------- ҮНДСЭН ХУУДАС (master-detail) ----------
  return (
    <div className="page-container">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            {/* ⚠️ 2026-09-29: emoji `✉️` → `MessageIcon` (SVG нь `currentColor`
                тул text-gray-900-той хамт өнгөө авна ✓) */}
            <MessageIcon className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
            Мессеж
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Зар нийтлэгчтэй шууд харилцана — мессеж нь зөвхөн та хоёрын хооронд харагдана.
          </p>
        </div>
        {totalUnread > 0 && (
          <span className="badge bg-primary">🔴 Уншаагүй {totalUnread}</span>
        )}
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* ══════════ ЗҮҮН: ЯРИАНЫ ЖАГСААЛТ ══════════
            ⚠️ Мобайлд чат нээлттэй үед жагсаалт НУУГДАЖ (`hidden`), desktop
               дээр (`lg:block`) үргэлж харагдана ✓ */}
        <section
          className={`overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-card ${activeId ? 'hidden lg:block' : ''}`}
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="text-sm font-bold text-gray-900">Ярианы жагсаалт</h2>
            {conversations && conversations.length > 0 && (
              <span className="text-[12px] font-semibold text-gray-400">{conversations.length}</span>
            )}
          </div>

          {conversations === null ? (
            <div className="px-4 py-10 text-center">
              <div className="spinner"></div>
              <p className="text-sm text-gray-500">Ачаалж байна...</p>
            </div>
          ) : listError ? (
            <div className="px-4 py-8 text-center">
              <div className="mb-2 text-3xl">⚠️</div>
              <p className="text-[13px] text-red-600">{listError.message}</p>
              <button type="button" className="btn btn-outline btn-sm mt-3" onClick={() => loadConversations()}>
                🔄 Дахин оролдох
              </button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <div className="mb-2 text-4xl">📭</div>
              <p className="text-sm font-semibold text-gray-700">Одоогоор мессеж алга</p>
              <p className="mt-1 text-[13px] text-gray-500">
                Зар нээгээд «💬 Мессеж бичих» товч дарж зар нийтлэгчтэй холбогдоно.
              </p>
              <Link href="/" className="btn btn-primary btn-sm mt-4">🔎 Зар хайх</Link>
            </div>
          ) : (
            <div className="max-h-[70vh] overflow-y-auto lg:max-h-[600px]">
              {conversations.map((c) => {
                const pid = partnerId(c, user.id);
                const p = profiles[pid] || {};
                const unread = unreadMap[c.id] || 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    className={`flex w-full items-start gap-3 border-b border-gray-200 px-4 py-3 text-left transition last:border-b-0 hover:bg-gray-50 ${activeId === c.id ? 'bg-primary-light' : ''} ${unread > 0 ? 'bg-blue-50/40' : ''}`}
                  >
                    <Avatar src={p.avatarUrl} name={titleFor(c)} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-gray-900">{titleFor(c)}</span>
                        <span className="ml-auto shrink-0 text-[11px] text-gray-400">{timeAgo(c.last_message_at)}</span>
                      </div>
                      {c.listing_title && (
                        <div className="truncate text-[12px] font-medium text-primary">🏷️ {c.listing_title}</div>
                      )}
                      <div className={`truncate text-[13px] ${unread > 0 ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
                        {previewWithSender(c, user.id)}
                      </div>
                    </div>
                    {unread > 0 && (
                      <span className="mt-1 grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ══════════ БАРУУН: ЧАТ (мессежүүд + бичих хэсэг) ══════════
            ⚠️ `h-[65vh]` + дотор `flex-1 overflow-y-auto` — мессеж урт бол
               ЗӨВХӨН мессежийн хэсэг гүйлгэгдэж, толгой/бичих хэсэг байрандаа ✓
            ⚠️ Мобайлд чат сонгоогүй бол НУУГДАЖ (`hidden`), desktop дээр
               `lg:flex` — «Яриа сонгоно уу» гэсэн хоосон төлөв харагдана ✓ */}
        <section
          className={`flex h-[65vh] min-h-[420px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-card lg:h-[600px] ${activeId ? '' : 'hidden lg:flex'}`}
        >
          {!activeId ? (
            <div className="grid flex-1 place-items-center px-6 py-16 text-center">
              <div>
                <div className="mb-3 text-5xl">💬</div>
                <p className="font-semibold text-gray-700">Яриа сонгоно уу</p>
                <p className="mt-1 text-sm text-gray-500">
                  Зүүн талын жагсаалтаас харилцаагаа нээгээд мессеж бичнэ үү.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* ---- Толгой: нөгөө тал + зарын холбоос ---- */}
              <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-3 sm:px-4">
                <button
                  type="button"
                  onClick={backToList}
                  aria-label="Жагсаалт руу буцах"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-gray-200 text-lg font-bold text-gray-600 transition active:bg-gray-100 lg:hidden"
                >
                  ‹
                </button>
                {activeConversation ? (
                  <>
                    <Avatar
                      src={profiles[partnerId(activeConversation, user.id)]?.avatarUrl}
                      name={titleFor(activeConversation)}
                      size={40}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-gray-900">{titleFor(activeConversation)}</div>
                      {activeConversation.listing_title && (
                        activeConversation.listing_id ? (
                          <Link
                            href={`/listings/${activeConversation.listing_id}`}
                            className="block truncate text-[12px] font-medium text-primary hover:underline"
                          >
                            🏷️ {activeConversation.listing_title}
                          </Link>
                        ) : (
                          <span className="block truncate text-[12px] text-gray-400">
                            🏷️ {activeConversation.listing_title}
                          </span>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-sm text-gray-400">Яриа ачаалж байна...</span>
                )}
              </div>

              {/* ---- Мессежүүд ---- */}
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50 px-3 py-4 sm:px-4">
                {messages === null ? (
                  <div className="py-10 text-center">
                    <div className="spinner"></div>
                    <p className="text-sm text-gray-500">Мессеж ачаалж байна...</p>
                  </div>
                ) : threadError ? (
                  <div className="py-10 text-center">
                    <div className="mb-2 text-3xl">⚠️</div>
                    <p className="text-[13px] text-red-600">{threadError.message}</p>
                    <button type="button" className="btn btn-outline btn-sm mt-3" onClick={() => loadThread(activeId)}>
                      🔄 Дахин оролдох
                    </button>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="py-10 text-center text-sm text-gray-500">
                    <div className="mb-2 text-3xl">👋</div>
                    Мессеж алга — эхний мессежээ бичээрэй.
                  </div>
                ) : (
                  messages.map((m) => (
                    <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed shadow-sm sm:max-w-[75%] ${m.mine ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-800'}`}
                      >
                        <p className="whitespace-pre-line break-words">{m.body}</p>
                        <div className={`mt-1 text-[10px] ${m.mine ? 'text-white/70' : 'text-gray-400'}`}>
                          {timeAgo(m.created_at)}
                          {m.mine ? (m.read ? ' · ✓✓ Уншсан' : ' · ✓ Илгээсэн') : ''}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* ---- Бичих хэсэг ---- */}
              <form onSubmit={handleSend} className="border-t border-gray-200 p-3 sm:p-4">
                <div className="flex items-end gap-2">
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      // ⚠️ Enter — илгээх, Shift+Enter — шинэ мөр
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                    }}
                    rows={2}
                    maxLength={2000}
                    placeholder="Мессеж бичих..."
                    aria-label="Мессеж бичих"
                    className="form-textarea min-h-[44px] flex-1"
                  />
                  <button
                    type="submit"
                    disabled={sending || !text.trim()}
                    className="btn btn-primary shrink-0"
                  >
                    {sending ? '⏳ Илгээж...' : '📨 Илгээх'}
                  </button>
                </div>
                <p className="form-hint mt-1">
                  Enter — илгээх · Shift+Enter — шинэ мөр · {text.length}/2000
                </p>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
