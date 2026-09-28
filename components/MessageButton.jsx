'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useToast, useUI } from './AppProviders';
import { findOrCreateConversation } from '../lib/queries';
import { canMessage, conversationHref } from '../lib/messages.mjs';
import { notifyMessagesChanged } from '../lib/messagesClient';

/**
 * 💬 «МЕССЕЖ БИЧИХ» ТОВЧ — ЗАРЫН ДЭЛГЭРЭНГҮЙ ба ЗАР НИЙТЛЭГЧИЙН хуудсанд.
 *
 * ⚠️ ЯАГААД ТУСДАА КОМПОНЕНТ ВЭ:
 *   Хоёр хуудсанд ижил 4 алхам хэрэгтэй: (1) нэвтрэлт шалгах, (2) өөрийн зар
 *   эсэх, (3) яриа хайх/үүсгэх, (4) `/messages?c=<id>` руу шилжих.
 *   Хоёр газарт хуулбарлавал нэг нь мартагдана ✗ → нэг эх сурвалж ✓
 *
 * ⚠️ `canMessage()` (lib/messages.mjs) нь SQL-ийн `conversations_distinct`
 *    CHECK-тэй ижил дүрэм — UI дээр «өөрийн зар руу бичих» товчийг дарахад
 *    DB алдаа биш, ОЙЛГОМЖТОЙ toast гарна ✓
 *
 * @param {{sellerId?: string|null, listingId?: string|null, listingTitle?: string|null,
 *          className?: string, label?: string}} props
 */
export default function MessageButton({
  sellerId,
  listingId = null,
  listingTitle = null,
  className = 'btn btn-outline w-full',
  label = '💬 Мессеж бичих',
}) {
  const { user } = useAuth();
  const { openAuth } = useUI();
  const { showToast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    const check = canMessage(user ? user.id : null, sellerId);
    if (!check.ok) {
      showToast(check.error, 'error');
      // ⚠️ Нэвтрээгүй бол шууд нэвтрэх цонхыг нээнэ (feedback-тэй ижил)
      if (!user) openAuth();
      return;
    }
    setBusy(true);
    try {
      const conversation = await findOrCreateConversation({
        listingId,
        listingTitle,
        myId: user.id,
        otherId: sellerId,
      });
      notifyMessagesChanged();
      router.push(conversationHref(conversation.id));
    } catch (err) {
      showToast((err && err.message) || 'Мессеж бичих боломжгүй байна.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={handleClick} disabled={busy} className={className}>
      {busy ? '⏳ Нээж байна...' : label}
    </button>
  );
}
