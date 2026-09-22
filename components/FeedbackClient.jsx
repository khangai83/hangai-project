'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, useToast, useUI } from './AppProviders';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUSES, fetchMyFeedback, submitFeedback } from '../lib/queries';
import { normalizeError } from '../lib/errors';
import { timeAgo } from '../lib/format';

const STATUS_MAP = Object.fromEntries(FEEDBACK_STATUSES.map((s) => [s.value, s]));
const CATEGORY_MAP = Object.fromEntries(FEEDBACK_CATEGORIES.map((c) => [c.value, c]));

const EMPTY = { category: 'suggestion', subject: '', message: '' };

/**
 * Санал хүсэлт — ЗӨВХӨН бүртгэлтэй (нэвтэрсэн) хэрэглэгч илгээнэ.
 *
 * ⚠️ Илгээсэн санал нь Supabase-ийн `feedback` хүснэгтэд хадгалагдаж,
 *    АДМИН `/admin/feedback` хуудсаар (service_role) харна.
 *    RLS: хэрэглэгч зөвхөн ӨӨРИЙН саналыг уншина (auth.uid() = user_id).
 * ⚠️ Хүснэгт байхгүй бол (0008 migration) ойлгомжтой мессеж харуулна.
 */
export default function FeedbackClient() {
  const { user, authLoading } = useAuth();
  const { openAuth } = useUI();
  const { showToast } = useToast();

  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null); // амжилттай илгээсэн мөр
  const [list, setList] = useState(null); // миний саналууд
  const [listError, setListError] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const loadMine = useCallback(async () => {
    if (!user) {
      setList([]);
      return;
    }
    setListError(null);
    try {
      setList(await fetchMyFeedback(user.id));
    } catch (err) {
      const e = normalizeError(err);
      console.error(e);
      setList([]);
      setListError(e);
    }
  }, [user]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      showToast('Санал хүсэлт илгээхийн тулд нэвтрэнэ үү.', 'error');
      openAuth();
      return;
    }
    setSending(true);
    try {
      const row = await submitFeedback({
        userId: user.id,
        category: form.category,
        subject: form.subject,
        message: form.message,
        contactName: user.user_metadata?.name || '',
        phone: user.phone || user.user_metadata?.phone || '',
      });
      setSent(row);
      setForm(EMPTY);
      showToast('Санал хүсэлт амжилттай илгээгдлээ. Баярлалаа!');
      loadMine();
    } catch (err) {
      const msg = (err && err.message) || 'Илгээж чадсангүй.';
      showToast(msg, 'error');
    } finally {
      setSending(false);
    }
  };

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
          <div className="mb-4 text-6xl">💬</div>
          <h1 className="mb-2 text-2xl font-bold">Санал хүсэлт</h1>
          <p className="text-gray-500">
            Санал хүсэлт илгээхэд <b>бүртгэлтэй хэрэглэгч</b> байх шаардлагатай. Ингэснээр
            санал хүсэлтийг хэн илгээснийг тодорхойлж, хариу өгөх боломжтой болно.
          </p>
          <button type="button" className="btn btn-primary btn-lg mt-5" onClick={openAuth}>
            🔑 Нэвтрэх / Бүртгүүлэх
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">💬 Санал хүсэлт</h1>
        <p className="mt-2 text-sm text-gray-500">
          Сайжруулах санал, алдаа, гомдлоо илгээнэ үү. Илгээсэн санал нь{' '}
          <b>админ хэсэгт шууд очно</b> бөгөөд шийдвэрлэгдсэн тохиолдолд хариуг эндээс харна.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ===== ФОРМ ===== */}
        <form onSubmit={handleSubmit} className="section-card">
          {sent && (
            <div className="mb-5 rounded-lg border border-secondary/30 bg-secondary/5 px-4 py-3 text-[13.5px] text-secondary-dark">
              ✅ Таны санал хүлээн авагдлаа. Баярлалаа! (Дугаар: <b>{String(sent.id).slice(0, 8)}</b>)
            </div>
          )}

          <div className="mb-4">
            <label className="form-label">Саналын төрөл</label>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.hint}
                  onClick={() => set('category', c.value)}
                  className={`rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition ${
                    form.category === c.value
                      ? 'border-primary bg-primary-light text-primary'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-1">
            <label className="form-label" htmlFor="fb-subject">Гарчиг (заавал биш)</label>
            <input
              id="fb-subject"
              className="form-input"
              maxLength={120}
              placeholder="Жишээ: Хайлтын шүүлт дээр алдаа гарч байна"
              value={form.subject}
              onChange={(e) => set('subject', e.target.value)}
            />
          </div>

          <div className="mb-3 flex flex-col gap-1">
            <label className="form-label" htmlFor="fb-message">
              Санал хүсэлтийн агуулга <span className="text-red-600">*</span>
            </label>
            <textarea
              id="fb-message"
              className="form-textarea"
              required
              minLength={5}
              maxLength={4000}
              placeholder="Дэлгэрэнгүй бичнэ үү. Аль хуудсанд, ямар үйлдэл хийхэд алдаа гарсан гэх мэт."
              value={form.message}
              onChange={(e) => set('message', e.target.value)}
            />
            <p className="form-hint">{form.message.length} / 4000 тэмдэгт</p>
          </div>

          <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-3 text-[12.5px] leading-relaxed text-gray-600">
            Илгээхдээ таны <b>нэр</b> болон <b>утасны дугаар</b> саналын хамт хадгалагдана
            (хариу өгөх, хэрэглэгчийг тодорхойлоход). Мэдээллийн боловсруулалтын талаар{' '}
            <Link href="/terms" className="font-semibold text-primary hover:underline">
              Үйлчилгээний нөхцөл
            </Link>{' '}
            хэсгээс үзнэ үү.
          </div>

          <button type="submit" className="btn btn-primary" disabled={sending || form.message.trim().length < 5}>
            {sending ? 'Илгээж байна...' : '📨 Санал илгээх'}
          </button>
        </form>

        {/* ===== МИНИЙ САНАЛУУД ===== */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-base font-semibold text-gray-800">📋 Миний илгээсэн саналууд</h2>

            {listError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12.5px] text-red-700">
                {listError.message}
              </p>
            )}

            {list === null ? (
              <p className="text-[13px] text-gray-400">Ачаалж байна...</p>
            ) : list.length === 0 ? (
              <p className="text-[13px] text-gray-400">Одоогоор санал илгээгээгүй байна.</p>
            ) : (
              <ul className="space-y-3">
                {list.map((f) => {
                  const st = STATUS_MAP[f.status] || STATUS_MAP.new;
                  const cat = CATEGORY_MAP[f.category] || CATEGORY_MAP.other;
                  return (
                    <li key={f.id} className="rounded-lg border border-gray-100 bg-gray-50 px-3.5 py-3">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-[12px] font-semibold text-gray-600">{cat.label}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.className}`}>
                          {st.label}
                        </span>
                        <span className="ml-auto text-[11px] text-gray-400">{timeAgo(f.created_at)}</span>
                      </div>
                      {f.subject && <p className="text-[13.5px] font-semibold text-gray-800">{f.subject}</p>}
                      <p className="whitespace-pre-line text-[13px] leading-relaxed text-gray-600">{f.message}</p>
                      {f.admin_note && (
                        <div className="mt-2 rounded-lg border border-primary/20 bg-white px-3 py-2 text-[12.5px] text-gray-700">
                          <b className="text-primary">Админы хариу:</b> {f.admin_note}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="text-[12px] leading-relaxed text-gray-400">
            ℹ️ Илгээсэн санал нь админы хяналтын самбарт очно. Энэ жагсаалтад зөвхөн{' '}
            <b>таны</b> илгээсэн саналууд харагдана (RLS).
          </p>
        </aside>
      </div>
    </div>
  );
}
