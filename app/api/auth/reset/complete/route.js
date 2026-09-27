// ============================================================
// POST /api/auth/reset/complete — НУУЦ ҮГИЙГ ШИНЭЭР ТАВИХ
//
// Body: { phone, password, requestToken }
// Resp: { ok, userId }
//
// Шалгалт (бүгд заавал — бүртгэлийн урсгалтай ижил):
//   1) `requestToken` нь серверийн гарын үсэгтэй, хугацаа хүчинтэй
//   2) токен доторх утас == илгээсэн утас (өөр дугаарын нууц үгийг солихыг хориглоно)
//   3) verify.mn дээрх session нь VERIFIED (SMS үнэхээр ирсэн)
//   4) тухайн утас бүртгэлтэй хэрэглэгчид харьяалагдана
// Зөвхөн эдгээрийн дараа service_role-оор нууц үгийг СОЛИНО.
//
// ⚠️ АЮУЛГҮЙ БАЙДАЛ: эдгээр 4 шалгалтгүй бол хэн ч дурын утасны дугаар
//    бичээд бусдын бүртгэлийн нууц үгийг сольж чадна!
// ============================================================
import { NextResponse } from 'next/server';
import verifyMn from '../../../../../lib/verifyMn';
import {
  findUserByPhone,
  updateUserPassword,
  verifyPhoneSession,
} from '../../../../../lib/authServer';

export const dynamic = 'force-dynamic';

const MIN_PASSWORD_LENGTH = 6;

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }

  const phone = body.phone;
  const password = body.password == null ? '' : String(body.password);
  const requestToken = body.requestToken;

  // ---------- 1. Оролтын шалгалт ----------
  if (!verifyMn.isValidMnPhone(phone)) {
    return NextResponse.json(
      { ok: false, error: 'Монгол утасны дугаар буруу байна. Жишээ: 99112233' },
      { status: 400 }
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { ok: false, error: `Нууц үг хамгийн багадаа ${MIN_PASSWORD_LENGTH} тэмдэгт байх ёстой.` },
      { status: 400 }
    );
  }

  // ---------- 2. Токен ----------
  const session = verifyPhoneSession(requestToken);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: 'Баталгаажуулалтын хугацаа дууссан байна. Дахин эхлүүлнэ үү.' },
      { status: 401 }
    );
  }
  if (session.phone !== verifyMn.toLocalPhone(phone)) {
    return NextResponse.json(
      { ok: false, error: 'Баталгаажсан дугаар таарахгүй байна. Дахин эхлүүлнэ үү.' },
      { status: 403 }
    );
  }

  // ---------- 3. verify.mn дээрх бодит төлөв ----------
  let remote;
  try {
    remote = await verifyMn.getSession(session.sessionId);
  } catch (err) {
    return NextResponse.json(
      { ok: false, code: err && err.code, error: (err && err.message) || 'SMS төлөв шалгаж чадсангүй.' },
      { status: 502 }
    );
  }
  if (!remote || remote.sessionStatus !== 'VERIFIED') {
    return NextResponse.json(
      {
        ok: false,
        code: 'NOT_VERIFIED',
        error:
          remote && remote.sessionStatus === 'EXPIRED'
            ? 'SMS баталгаажуулалтын хугацаа дууссан. «Код шинээр авах» товчийг дарна уу.'
            : 'Утасны дугаар хараахан баталгаажаагүй байна. 144773 руу кодыг илгээгээд хүлээнэ үү.',
      },
      { status: 403 }
    );
  }

  // ---------- 4. Хэрэглэгч (дугаараар) ----------
  let user = null;
  try {
    user = await findUserByPhone(phone);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err && err.message) || 'Хэрэглэгч хайхад алдаа гарлаа.' },
      { status: 500 }
    );
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

  // ---------- 5. Нууц үг солих ----------
  try {
    await updateUserPassword(user.id, password);
    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        code: err && err.code,
        error: (err && err.message) || 'Нууц үг солиход алдаа гарлаа.',
      },
      { status: 500 }
    );
  }
}
