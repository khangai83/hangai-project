// ============================================================
// POST /api/auth/reset/start — НУУЦ ҮГ СЭРГЭЭХ: SMS баталгаажуулалт эхлүүлэх
//
// Body: { phone }
// Resp: { ok, requestToken, sessionId, shortcode, text, smsUri,
//         displayInstruction, expiresAt }
//
// Урсгал: verify.mn дээр session үүсгэж 6 оронтой код үүсгэнэ → хэрэглэгч
// 144773 руу кодыг SMS-ээр илгээнэ → `/reset/complete` дээр шинэ нууц үгээ
// тавина. (Бүртгэлийн урсгалтай ЯГ ижил зарчим — `signPhoneSession`.)
//
// ⚠️ БҮРТГЭЛТЭЙ хэрэглэгч байх ЁСТОЙ — эс бөгөөс 150₮-ийн SMS дэмий
//    зарцуулагдаж, «хэрэглэгч байхгүй» гэдгийг 4 дэх алхамд л мэдэх болно.
// ⚠️ ХЯЗГААР (0015 — `auth_events`): утас 3/цаг, IP 10/цаг. SMS нь
//    МӨНГӨ ЗАРЦУУЛДАГ тул хязгааргүй бол үлдэгдэл шавхагдана.
// ============================================================
import { NextResponse } from 'next/server';
import verifyMn from '../../../../../lib/verifyMn';
import {
  assertAuthRateLimit,
  findUserByPhone,
  getClientIp,
  recordAuthEvent,
  signPhoneSession,
} from '../../../../../lib/authServer';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }

  const phone = body.phone;
  const ip = getClientIp(req);

  // ---------- 1. Дугаарын шалгалт ----------
  if (!verifyMn.isValidMnPhone(phone)) {
    return NextResponse.json(
      { ok: false, error: 'Монгол утасны дугаар буруу байна. Жишээ: 99112233' },
      { status: 400 }
    );
  }

  // ---------- 2. SMS ХЯЗГААР (мөнгө хамгаалалт) ----------
  try {
    await assertAuthRateLimit({ kind: 'reset_start', phone, ip });
  } catch (err) {
    if (err && err.code === 'RATE_LIMIT') {
      return NextResponse.json({ ok: false, code: 'RATE_LIMIT', error: err.message }, { status: 429 });
    }
    // ⚠️ 0015 ороогүй бол ч урсгалыг зогсоохгүй
    console.warn('[auth/reset/start] хязгаар шалгахад алдаа:', (err && err.message) || err);
  }

  // ---------- 3. Бүртгэлтэй эсэх ----------
  let user = null;
  try {
    user = await findUserByPhone(phone);
  } catch (err) {
    console.warn('[auth/reset/start] хэрэглэгч хайхад алдаа:', (err && err.message) || err);
  }
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        code: 'PHONE_NOT_FOUND',
        error: 'Энэ дугаар бүртгэгдээгүй байна. «Бүртгүүлэх» хэсгээр шинэ бүртгэл үүсгэнэ үү.',
      },
      { status: 404 }
    );
  }

  // ---------- 4. verify.mn session ----------
  try {
    const callback = process.env.VERIFY_MN_CALLBACK_URL || undefined;
    const session = await verifyMn.startVerification(phone, { callback });

    // ⚠️ SMS амжилттай эхэлсний ДАРАА л бүртгэнэ (хязгаарын тооцоонд)
    await recordAuthEvent({ kind: 'reset_start', phone, ip });

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
    console.error('[auth/reset/start] verify.mn алдаа:', (err && err.message) || err);
    return NextResponse.json(
      {
        ok: false,
        code: err && err.code,
        error: (err && err.message) || 'SMS баталгаажуулалт эхлүүлж чадсангүй.',
      },
      { status: err && err.code === 'VERIFY_MN_KEY_MISSING' ? 500 : 502 }
    );
  }
}
