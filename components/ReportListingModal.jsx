'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth, useToast, useUI } from './AppProviders';
import { submitFeedback } from '../lib/queries';

/**
 * ЗАРЫН ТУХАЙ ГОМДОЛ — зарын дэлгэрэнгүй хуудсанд харагдах товч ба форм.
 *
 * ⚠️ Логик: гомдол нь `feedback` хүснэгтэд `category = 'complaint'` ба
 *    `listing_id = <тухайн зар>`-той хадгалагдана → админ `/admin/feedback`
 *    хуудсанд зарын холбоос, утас, «🗑 Зар устгах» товчтой хамт харна.
 * ⚠️ Зөвхөн БҮРТГЭЛТЭЙ хэрэглэгч илгээнэ (нэвтрээгүй бол нэвтрэх цонх нээнэ).
 */

const REASONS = [
  { value: 'Хуурамч / төөрөгдүүлсэн зар', label: '🚫 Хуурамч / төөрөгдүүлсэн зар' },
  { value: 'Мэдээлэл буруу (үнэ, талбай, байршил)', label: '📝 Мэдээлэл буруу (үнэ, талбай, байршил)' },
  { value: 'Энэ үл хөдлөх аль хэдийн зарагдсан/түрээслэгдсэн', label: '✅ Зарагдсан / түрээслэгдсэн' },
  { value: 'Хууль бус агуулга / бусдын эрхийг зөрчсөн', label: '⚖️ Хууль бус / эрх зөрчсөн' },
  { value: 'Спам, давхардсан зар', label: '📢 Спам, давхардсан зар' },
  { value: 'Бусад', label: '💬 Бусад' },
];

export default function ReportListingModal({ listing }) {
  const { user } = useAuth();
  const { openAuth } = useUI();
  const { showToast } = useToast();

  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0].value);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const start = () => {
    if (!user) {
      showToast('Гомдол мэдэгдэхийн тулд эхлээд нэвтрэнэ үү.', 'error');
      openAuth();
      return;
    }
    setDone(false);
    setOpen(true);
  };

  const send = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await submitFeedback({
        userId: user.id,
        category: 'complaint',
        listingId: listing.id,
        subject: reason,
        message,
        contactName: user.user_metadata?.name || '',
        phone: user.phone || user.user_metadata?.phone || '',
      });
      setDone(true);
      setMessage('');
      showToast('Гомдол админд илгээгдлээ. Баярлалаа!');
    } catch (err) {
      showToast((err && err.message) || 'Илгээж чадсангүй.', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={start}
        className="mt-1 w-full rounded-lg px-3 py-2 text-[12.5px] font-semibold text-gray-400 transition hover:bg-red-50 hover:text-red-600"
      >
        ⚠️ Энэ зарын талаар гомдол мэдэгдэх
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-red-200 bg-red-50/50 p-4">
      {done ? (
        <div className="text-center">
          <p className="text-[13.5px] font-semibold text-secondary-dark">✅ Гомдол хүлээн авагдлаа</p>
          <p className="mt-1 text-[12.5px] text-gray-600">
            Админ шалгаж, шаардлагатай арга хэмжээ авна.
          </p>
          <button type="button" className="btn btn-outline btn-sm mt-3" onClick={() => setOpen(false)}>
            Хаах
          </button>
        </div>
      ) : (
        <form onSubmit={send}>
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="text-[13.5px] font-semibold text-red-800">⚠️ Зарын талаар гомдол мэдэгдэх</p>
            <button type="button" className="text-[12px] font-semibold text-gray-500 hover:text-gray-800" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <p className="mb-3 rounded-lg bg-white px-3 py-2 text-[12px] text-gray-500">
            Зар: <b className="text-gray-700">{listing.property_type}</b> · ID:{' '}
            <span className="font-mono">{String(listing.id).slice(0, 8)}</span>
          </p>

          <div className="mb-3">
            <label className="form-label">Гомдлын шалтгаан</label>
            <div className="flex flex-col gap-1.5">
              {REASONS.map((r) => (
                <label key={r.value} className="flex cursor-pointer items-center gap-2 text-[13px] text-gray-700">
                  <input
                    type="radio"
                    name="report-reason"
                    className="accent-primary"
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-1">
            <label className="form-label" htmlFor="report-message">Дэлгэрэнгүй (заавал биш)</label>
            <textarea
              id="report-message"
              className="form-textarea"
              rows={3}
              maxLength={2000}
              placeholder="Юу буруу байна вэ? Нэмэлт мэдээлэл бичнэ үү."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <p className="mb-3 text-[11.5px] leading-relaxed text-gray-500">
            Илгээсэн гомдол нь таны нэр, утасны дугаарын хамт админд очно.{' '}
            <Link href="/terms" className="text-primary underline hover:no-underline">Үйлчилгээний нөхцөл</Link>
          </p>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn btn-danger btn-sm" disabled={sending}>
              {sending ? 'Илгээж байна...' : '📨 Гомдол илгээх'}
            </button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(false)}>Цуцлах</button>
          </div>
        </form>
      )}
    </div>
  );
}
