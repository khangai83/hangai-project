'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useToast } from './AppProviders';
import { normalizePhone } from '../lib/format';
import {
  startPhoneVerification,
  checkPhoneVerification,
  completeRegistration,
  fetchAuthStatus,
} from '../lib/authApi';

const VIEW = { SIGNIN: 'signin', SIGNUP: 'signup' };
const STEP = { FORM: 'form', VERIFY: 'verify' };
const POLL_MS = 3000; // verify.mn-ийг 3 секундээс хурдан бүү шалга (docs)
const MIN_PASSWORD = 6;

/** expiresAt → үлдсэн секунд */
function secondsLeft(expiresAt) {
  if (!expiresAt) return 0;
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

/** 272 → '4:32' */
function mmss(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AuthModal({ open, onClose }) {
  const { signIn } = useAuth();
  const { showToast } = useToast();

  const [view, setView] = useState(VIEW.SIGNIN);
  const [step, setStep] = useState(STEP.FORM);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [session, setSession] = useState(null); // verify.mn session + requestToken
  const [remaining, setRemaining] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [finishing, setFinishing] = useState(false); // VERIFIED → бүртгэлийг дуусгаж байна
  const [error, setError] = useState('');
  const [setup, setSetup] = useState(null); // { phoneProviderEnabled, verifyMnConfigured }
  const finishingRef = useRef(false); // VERIFIED → бүртгэх процессыг 1 удаа л эхлүүлнэ

  // Modal нээгдэхэд төлвийг цэвэрлэнэ (утас/нэрийг үлдээнэ — UX-д эвтэйхэн)
  useEffect(() => {
    if (open) {
      setView(VIEW.SIGNIN);
      setStep(STEP.FORM);
      setError('');
      setPassword('');
      setPassword2('');
      setSession(null);
      setStatusText('');
      setRemaining(0);
      setLoading(false);
      setChecking(false);
      setFinishing(false);
      finishingRef.current = false;
    }
  }, [open]);

  // Тохиргоо бэлэн эсэхийг шалгана (Supabase Phone provider, VERIFY_MN_API_KEY).
  // Дутуу бол хэрэглэгч форм бөглөхөөс өмнө шууд анхааруулга харуулна.
  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    fetchAuthStatus().then((res) => {
      if (active) setSetup(res.data || null);
    });
    return () => {
      active = false;
    };
  }, [open]);

  const localPhone = () =>
    (() => {
      const digits = phone.replace(/\D/g, '');
      return digits.length === 12 && digits.startsWith('976') ? digits.slice(3) : digits;
    })();

  const validatePhone = () => {
    if (!/^[5-9]\d{7}$/.test(localPhone())) {
      setError('Монгол утасны дугаар буруу байна. Жишээ: 99112233');
      return false;
    }
    return true;
  };

  // ---------- Бүртгэлийг дуусгах (SMS VERIFIED болсны дараа) ----------
  const finishRegistration = useCallback(
    async (requestToken) => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      setChecking(false);
      setStatusText('Баталгаажлаа! Бүртгэлийг дуусгаж байна...');

      const done = await completeRegistration({
        name: name.trim(),
        phone: normalizePhone(phone),
        password,
        requestToken,
      });
      if (done.error) {
        finishingRef.current = false;
        setError(done.error);
        setStatusText('');
        return;
      }

      const login = await signIn(phone, password);
      if (login.error) {
        finishingRef.current = false;
        setError(`Бүртгэл үүслээ, гэхдээ нэвтрэхэд алдаа гарлаа: ${login.error}`);
        setStatusText('');
        return;
      }

      showToast('Амжилттай бүртгүүллээ 🎉');
      onClose();
    },
    [name, phone, password, signIn, showToast, onClose]
  );

  // ---------- Төлөв шалгах (auto + гараар) ----------
  const runStatusCheck = useCallback(
    async (silent) => {
      if (!session || finishingRef.current) return;
      if (!silent) setChecking(true);
      const res = await checkPhoneVerification(session.sessionId);
      if (!silent) setChecking(false);

      if (res.error) {
        setStatusText('Төлөв шалгаж чадсангүй — дахин оролдож байна...');
        return;
      }

      const status = res.data.sessionStatus;
      if (status === 'VERIFIED') {
        await finishRegistration(session.requestToken);
        return;
      }
      if (status === 'EXPIRED') {
        setStatusText('');
        setError('SMS баталгаажуулалтын хугацаа дууссан. «Код шинээр авах» товчийг дарна уу.');
        return;
      }
      setStatusText(
        silent
          ? 'SMS-ийг хүлээж байна...'
          : 'Хараахан ирээгүй байна. 144773 руу кодоо илгээсэн эсэхээ шалгана уу.'
      );
    },
    [session, finishRegistration]
  );

  // 3 секунд тутам автоматаар шалгана
  useEffect(() => {
    if (!open || step !== STEP.VERIFY || !session) return undefined;
    runStatusCheck(true);
    const id = setInterval(() => runStatusCheck(true), POLL_MS);
    return () => clearInterval(id);
  }, [open, step, session, runStatusCheck]);

  // Үлдсэн хугацааны countdown
  useEffect(() => {
    if (!open || step !== STEP.VERIFY || !session) return undefined;
    setRemaining(secondsLeft(session.expiresAt));
    const id = setInterval(() => setRemaining(secondsLeft(session.expiresAt)), 1000);
    return () => clearInterval(id);
  }, [open, step, session]);


  // ---------- Нэвтрэх (утас + нууц үг) ----------
  const submitSignIn = async (e) => {
    e.preventDefault();
    setError('');
    if (!validatePhone()) return;
    if (!password) {
      setError('Нууц үгээ оруулна уу.');
      return;
    }
    setLoading(true);
    const res = await signIn(phone, password);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    showToast('Амжилттай нэвтэрлээ 🎉');
    onClose();
  };

  // ---------- Бүртгүүлэх → verify.mn session үүсгэх ----------
  const submitSignUp = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) {
      setError('Нэрээ оруулна уу.');
      return;
    }
    if (!validatePhone()) return;
    if (password.length < MIN_PASSWORD) {
      setError(`Нууц үг хамгийн багадаа ${MIN_PASSWORD} тэмдэгт байх ёстой.`);
      return;
    }
    if (password !== password2) {
      setError('Нууц үг хоёр таарахгүй байна.');
      return;
    }

    setLoading(true);
    const res = await startPhoneVerification({ phone: normalizePhone(phone), name: name.trim() });
    setLoading(false);

    if (res.error) {
      setError(res.error);
      if (res.code === 'PHONE_EXISTS') setView(VIEW.SIGNIN);
      return;
    }

    setSession(res.data);
    setStep(STEP.VERIFY);
    setStatusText('SMS-ийг хүлээж байна...');
    setRemaining(secondsLeft(res.data.expiresAt));
    finishingRef.current = false;
    showToast('144773 дугаар руу кодыг SMS-ээр илгээнэ үү', 'info');
  };

  // ---------- Шинэ код авах (шинэ verify.mn session) ----------
  const restartVerification = async () => {
    setError('');
    setSession(null);
    setLoading(true);
    const res = await startPhoneVerification({ phone: normalizePhone(phone), name: name.trim() });
    setLoading(false);
    if (res.error) {
      setError(res.error);
      setStep(STEP.FORM);
      return;
    }
    setSession(res.data);
    setStatusText('SMS-ийг хүлээж байна...');
    setRemaining(secondsLeft(res.data.expiresAt));
    finishingRef.current = false;
  };

  const backToForm = () => {
    setStep(STEP.FORM);
    setSession(null);
    setError('');
    setStatusText('');
    finishingRef.current = false;
  };

  const switchView = (next) => {
    setView(next);
    setError('');
  };

  if (!open) return null;

  const title =
    step === STEP.VERIFY
      ? 'Утасны дугаар баталгаажуулах'
      : view === VIEW.SIGNIN
        ? 'Нэвтрэх'
        : 'Бүртгүүлэх';

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-5" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-2xl bg-white shadow-card-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg transition hover:bg-gray-200"
            onClick={onClose}
            aria-label="Хаах"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {setup && !setup.verifyMnConfigured && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 text-[13px] leading-relaxed text-amber-900">
              <p className="mb-1 font-semibold">⚠️ Тохиргоо дутуу — бүртгэл ажиллахгүй</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <code>.env.local</code> → <b>VERIFY_MN_API_KEY</b> = verify.mn-ийн Developer Console-оос авсан түлхүүр
                </li>
              </ul>
              <p className="mt-1.5 text-amber-800">
                Тэгээд: <code>npm run check:supabase</code>
              </p>
            </div>
          )}

          {step === STEP.VERIFY && session && (
            <div>
              <p className="mb-4 text-sm text-gray-500">
                <b>{normalizePhone(phone)}</b> дугаарыг баталгаажуулахын тулд доорх кодыг{' '}
                <b>{session.shortcode || '144773'}</b> дугаар руу <b>SMS-ээр илгээнэ үү</b>.
              </p>

              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-[13px] leading-relaxed text-amber-900">
                {session.displayInstruction}
              </div>

              <div className="mb-4 flex items-center justify-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-5">
                <span className="text-[34px] font-bold tracking-[10px] text-gray-900">{session.text}</span>
                <span className="text-sm text-gray-500">→</span>
                <span className="text-xl font-semibold text-primary">{session.shortcode || '144773'}</span>
              </div>

              {session.smsUri && (
                <a href={session.smsUri} className="btn btn-primary w-full">
                  📲 SMS апп нээж илгээх
                </a>
              )}

              <p className="form-hint mt-3">
                ⚠️ SMS-ийг <b>энэ дугаараас</b> (2 SIM-тэй бол зөв SIM-ээ сонгоно уу) илгээнэ. Нэг SMS нь
                хэрэглэгчид 150₮ төлбөртэй тул баталгаажмагц дахин илгээх шаардлагагүй.
              </p>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-3 text-[13px]">
                <span className="text-gray-600">
                  {finishing ? '⏳ Бүртгэж байна...' : statusText || 'SMS-ийг хүлээж байна...'}
                </span>
                {remaining > 0 && <span className="font-semibold text-gray-700">⏱ {mmss(remaining)}</span>}
              </div>

              {error && <p className="form-error">{error}</p>}

              <button
                className="btn btn-secondary mt-3 w-full"
                disabled={checking || finishing}
                onClick={() => runStatusCheck(false)}
              >
                {checking ? 'Шалгаж байна...' : '✓ Би илгээлээ — шалгах'}
              </button>
              <div className="mt-2 flex gap-2">
                <button className="btn btn-outline flex-1" onClick={restartVerification} disabled={loading || finishing}>
                  ↻ Код шинээр авах
                </button>
                <button className="btn btn-outline flex-1" onClick={backToForm} disabled={finishing}>
                  ← Буцах
                </button>
              </div>
              <p className="form-hint">
                «Код шинээр авах» нь шинэ session үүсгэдэг (өмнөх код хүчингүй болно).
              </p>
            </div>
          )}

          {step === STEP.FORM && view === VIEW.SIGNIN && (
            <form onSubmit={submitSignIn}>
              <p className="mb-5 text-sm text-gray-500">Утасны дугаар болон нууц үгээр нэвтэрнэ үү.</p>
              <div className="mb-3 flex flex-col gap-1">
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
              <div className="mb-3 flex flex-col gap-1">
                <label className="mb-1 block text-[13px] font-semibold text-gray-700">Нууц үг</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="btn btn-primary mt-2 w-full" disabled={loading}>
                {loading ? 'Нэвтэрч байна...' : 'Нэвтрэх'}
              </button>
              <p className="mt-4 text-center text-[13px] text-gray-500">
                Бүртгэл байхгүй юу?{' '}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => switchView(VIEW.SIGNUP)}
                >
                  Бүртгүүлэх
                </button>
              </p>
            </form>
          )}

          {step === STEP.FORM && view === VIEW.SIGNUP && (
            <form onSubmit={submitSignUp}>
              <p className="mb-5 text-sm text-gray-500">
                Нэр, утасны дугаар, нууц үгээ оруулна уу. Дараа нь утсаа <b>SMS-ээр баталгаажуулна</b>.
              </p>
              <div className="mb-3 flex flex-col gap-1">
                <label className="mb-1 block text-[13px] font-semibold text-gray-700">Нэр</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Жишээ: Бат"
                  autoFocus
                />
              </div>
              <div className="mb-3 flex flex-col gap-1">
                <label className="mb-1 block text-[13px] font-semibold text-gray-700">Утасны дугаар</label>
                <input
                  className="form-input"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="99112233"
                />
              </div>
              <div className="mb-3 flex flex-col gap-1">
                <label className="mb-1 block text-[13px] font-semibold text-gray-700">Нууц үг</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Хамгийн багадаа ${MIN_PASSWORD} тэмдэгт`}
                />
              </div>
              <div className="mb-3 flex flex-col gap-1">
                <label className="mb-1 block text-[13px] font-semibold text-gray-700">Нууц үг давтах</label>
                <input
                  className="form-input"
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="••••••"
                />
              </div>
              {error && <p className="form-error">{error}</p>}
              <button className="btn btn-primary mt-2 w-full" disabled={loading}>
                {loading ? 'Илгээж байна...' : 'Үргэлжлүүлэх → SMS баталгаажуулалт'}
              </button>
              <p className="mt-4 text-center text-[13px] text-gray-500">
                Бүртгэлтэй юу?{' '}
                <button
                  type="button"
                  className="font-semibold text-primary hover:underline"
                  onClick={() => switchView(VIEW.SIGNIN)}
                >
                  Нэвтрэх
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

