// ============================================================
// POST /api/auth/register/start — Бүртгэлийн SMS баталгаажуулалт эхлүүлэх
//
// Body: { phone: '99112233' | '+97699112233', name?: 'Бат' }
// Resp: { ok, requestToken, sessionId, shortcode, text, smsUri,
//         displayInstruction, expiresAt }
//
// Урсгал: verify.mn дээр шинэ session үүсгэж 6 оронтой код үүсгэнэ. UI нь
// `displayInstruction`-ийг үгчлэн харуулж, хэрэглэгч 144773 руу кодыг
// SMS-ээр илгээнэ. `requestToken` нь (sessionId ↔ утас) хосыг серверт
// гарын үсэг зурсан токен — дараагийн /complete шатанд ашиглана.
//
// ⚠️ НУУЦ үг энэ шатанд ХҮЛЭЭН АВАХГҮЙ (серверт хадгалагдахгүй).
// ============================================================
import { NextResponse } from 'next/server';
import verifyMn from '../../../../../lib/verifyMn';
import { findUserByPhone, isPhoneProviderEnabled, signPhoneSession } from '../../../../../lib/authServer';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }

  const phone = body.phone;
  const name = body.name == null ? null : String(body.name).trim();

  if (!verifyMn.isValidMnPhone(phone)) {
    return NextResponse.json(
      { ok: false, error: 'Монгол утасны дугаар буруу байна. Жишээ: 99112233' },
      { status: 400 }
    );
  }
  if (name && name.length > 60) {
    return NextResponse.json({ ok: false, error: 'Нэр хэт урт байна (60 тэмдэгт хүртэл).' }, { status: 400 });
  }

  // Supabase дээр утасны нэвтрэлт идэвхтэй эсэх — SMS (150₮) илгээхээс ӨМНӨ
  try {
    const phoneAuthOn = await isPhoneProviderEnabled();
    if (!phoneAuthOn) {
      return NextResponse.json(
        {
          ok: false,
          code: 'PHONE_PROVIDER_DISABLED',
          error:
            'Supabase дээр утасны (phone) нэвтрэлт идэвхгүй байна. ' +
            'Dashboard → Authentication → Providers → Phone-ийг Enable хийнэ үү ' +
            '(SMS provider тохируулах шаардлагагүй — SMS-ийг verify.mn илгээнэ).',
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.warn('[auth/register/start] phone provider шалгахад алдаа:', (err && err.message) || err);
  }

  // Өмнө нь бүртгэгдсэн дугаар бол хэрэглэгчийг 150₮-ийн SMS зарцуулахаас өмнө сэрэгнэ
  try {
    const existing = await findUserByPhone(phone);
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          code: 'PHONE_EXISTS',
          error: 'Энэ дугаар аль хэдийн бүртгэгдсэн байна. «Нэвтрэх» хэсгээр нэвтэрнэ үү.',
        },
        { status: 409 }
      );
    }
  } catch (err) {
    // Хайлт нурсан ч урсгалыг зогсоохгүй — /complete дээр давхар шалгана
    console.warn('[auth/register/start] хэрэглэгч хайхад алдаа:', (err && err.message) || err);
  }

  try {
    const callback = process.env.VERIFY_MN_CALLBACK_URL || undefined;
    const session = await verifyMn.startVerification(phone, { callback });

    return NextResponse.json({
      ok: true,
      requestToken: signPhoneSession({ sessionId: session.sessionId, phone }),
      sessionId: session.sessionId,
      shortcode: session.shortcode || verifyMn.SHORTCODE,
      text: session.text,
      smsUri: session.smsUri,
      displayInstruction: session.displayInstruction,
      expiresAt: session.expiresAt,
    });
  } catch (err) {
    console.error('[auth/register/start] verify.mn алдаа:', (err && err.message) || err);
    return NextResponse.json(
      { ok: false, code: err && err.code, error: (err && err.message) || 'SMS баталгаажуулалт эхлүүлж чадсангүй.' },
      { status: err && err.code === 'VERIFY_MN_KEY_MISSING' ? 500 : 502 }
    );
  }
}
