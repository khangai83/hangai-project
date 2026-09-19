// ============================================================
// POST /api/auth/register/complete — Бүртгэлийг дуусгах
//
// Body: { name, phone, password, requestToken }
// Resp: { ok, userId }
//
// Шалгалт (бүгд заавал):
//   1) requestToken нь серверийн гарын үсэгтэй, хугацаа хүчинтэй байх
//   2) токен доторх утас == илгээсэн утас (өөр дугаар бүртгэхийг хориглоно)
//   3) verify.mn дээрх session нь VERIFIED байх
// Зөвхөн эдгээрийн дараа service_role-оор хэрэглэгч үүсгэнэ
// (`phone_confirm: true` — Supabase өөрөө SMS илгээхгүй).
// ============================================================
import { NextResponse } from 'next/server';
import verifyMn from '../../../../../lib/verifyMn';
import {
  createVerifiedUser,
  findUserByPhone,
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

  const name = body.name == null ? null : String(body.name).trim();
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
  if (!name) {
    return NextResponse.json({ ok: false, error: 'Нэрээ оруулна уу.' }, { status: 400 });
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

  // ---------- 4. Давхардлын эцсийн шалгалт ----------
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
    console.warn('[auth/register/complete] давхардал шалгахад алдаа:', (err && err.message) || err);
  }

  // ---------- 5. Хэрэглэгч үүсгэх ----------
  try {
    const user = await createVerifiedUser({ phone, password, name });
    return NextResponse.json({ ok: true, userId: user.id });
  } catch (err) {
    const duplicate = err && err.code === 'PHONE_EXISTS';
    return NextResponse.json(
      { ok: false, code: duplicate ? 'PHONE_EXISTS' : err && err.code, error: (err && err.message) || 'Бүртгэл үүсгэж чадсангүй.' },
      { status: duplicate ? 409 : 500 }
    );
  }
}
