// ============================================================
// GET /api/auth/verify/callback — verify.mn → манай сервер рүү "шалга" дохио
//
// verify.mn нь SMS ирмэгц callback URL рүү GET хүсэлт явуулдаг:
//   • body байхгүй, HMAC гарын үсэг байхгүй
//   • 3 секундын дотор 2xx буцаах ёстой (тэгэхгүй бол дахин оролдоно)
//
// Тиймээс энэ route нь ЗӨВХӨН богино хариу өгнө (verify.mn-ээс ирсэн
// мэдээллийг итгэхгүй). Бодит төлөвийг браузер
// GET /api/auth/register/status?sessionId=... -аар 3 секунд тутам шалгана.
//
// ⚠️ Анхаар: localhost дээр verify.mn хүрэх боломжгүй тул энэ route нь
// production (public host) дээр л ажиллана. Polling нь үндсэн механизм.
// ============================================================
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST() {
  return NextResponse.json({ ok: true });
}
