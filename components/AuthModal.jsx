'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth, useToast } from './AppProviders';
import { normalizePhone } from '../lib/format';

const STEPS = { PHONE: 'phone', CODE: 'code', NAME: 'name' };

export default function AuthModal({ open, onClose, onLoggedIn }) {
  const { signInWithPhone, verifyCode, saveName, user } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(STEPS.PHONE);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const codeRef = useRef(null);

  useEffect(() => {
    if (open) {
      setStep(STEPS.PHONE);
      setError('');
      setCode('');
    }
  }, [open]);

  useEffect(() => {
    if (step === STEPS.CODE && codeRef.current) codeRef.current.focus();
  }, [step]);

  if (!open) return null;

  const sendCode = async () => {
    setError('');
    const digits = phone.replace(/\D/g, '');
    const local = digits.length === 12 && digits.startsWith('976') ? digits.slice(3) : digits;
    if (!/^[89]\d{7}$/.test(local)) {
      setError('Монгол утасны дугаар буруу байна. Жишээ: 99112233');
      return;
    }
    setLoading(true);
    const full = normalizePhone(phone);
    const res = await signInWithPhone(full);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    showToast('Баталгаажуулах код SMS-ээр илгээгдлээ', 'info');
    setStep(STEPS.CODE);
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (code.length < 6) { setError('Кодыг бүрэн оруулна уу'); return; }
    setLoading(true);
    setError('');
    const full = normalizePhone(phone);
    const res = await verifyCode(full, code);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    showToast('Амжилттай нэвтэрлээ 🎉');
    setName(user?.phone || '');
    setStep(STEPS.NAME);
  };

  const saveNameAndClose = async () => {
    if (name.trim()) await saveName(name.trim());
    onLoggedIn && onLoggedIn(name.trim());
    onClose();
  };

  const skip = () => onClose();

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-5" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white shadow-card-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <h2 className="text-xl font-semibold">{step === STEPS.PHONE ? 'Нэвтрэх / Бүртгүүлэх' : step === STEPS.CODE ? 'Баталгаажуулах' : 'Нэрээ оруулна уу'}</h2>
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg transition hover:bg-gray-200" onClick={onClose} aria-label="Хаах">×</button>
        </div>
        <div className="p-6">
          {step === STEPS.PHONE && (
            <div>
              <p className="mb-5 text-sm text-gray-500">Утасны дугаараа оруулна уу. SMS код илгээнэ.</p>
              <div className="flex flex-col gap-1">
                <label className="mb-1 block text-[13px] font-semibold text-gray-700">Утасны дугаар</label>
                <input
                  className="form-input"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="99112233"
                  autoFocus
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="btn btn-primary mt-4 w-full" disabled={loading} onClick={sendCode}>
                {loading ? 'Илгээж байна...' : 'Код илгээх'}
              </button>
              <p className="form-hint">Demo зорилгоор SMS provider тохируулах шаардлагатай (README үзнэ үү).</p>
            </div>
          )}

          {step === STEPS.CODE && (
            <div>
              <p className="mb-5 text-sm text-gray-500"><b>{normalizePhone(phone)}</b> дугаарт ирсэн 6 оронтой кодыг оруулна уу.</p>
              <form onSubmit={submitCode}>
                <div className="flex flex-col gap-1">
                  <input
                    className="form-input text-center text-xl tracking-[8px]"
                    ref={codeRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="______"
                  />
                </div>
                {error && <p className="form-error">{error}</p>}
                <button className="btn btn-primary mt-4 w-full" disabled={loading || code.length < 6}>
                  {loading ? 'Баталгаажуулж байна...' : 'Баталгаажуулах'}
                </button>
              </form>
              <button className="btn btn-outline mt-2 w-full" onClick={() => { setStep(STEPS.PHONE); setCode(''); }}>
                ← Дугаараа солих
              </button>
            </div>
          )}

          {step === STEPS.NAME && (
            <div>
              <p className="mb-5 text-sm text-gray-500">Зар нийтлэхэд харагдах нэрээ оруулна уу (заавал биш).</p>
              <div className="flex flex-col gap-1">
                <label className="mb-1 block text-[13px] font-semibold text-gray-700">Нэр</label>
                <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Жишээ: Бат" autoFocus />
              </div>
              <button className="btn btn-primary mt-4 w-full" onClick={saveNameAndClose}>✅ Хадгалах</button>
              <button className="btn btn-outline mt-2 w-full" onClick={skip}>Алгасах</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
