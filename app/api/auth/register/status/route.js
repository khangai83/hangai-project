// ============================================================
// GET /api/auth/register/status?sessionId=... — SMS баталгаажуулалтын төлөв
//
// Resp: { ok, sessionStatus: 'PENDING'|'VERIFIED'|'EXPIRED',
//         callbackStatus, verifiedAt, expiresAt }
//
// verify.mn-ийг шууд browser-оос дуудах боломжгүй (API key нь нууц) тул
// энэ proxy ашиглана. UI нь 3 секунд тутам дуудаж шалгана.
// ============================================================
import { NextResponse } from 'next/server';
import verifyMn from '../../../../../lib/verifyMn';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const sessionId = new URL(req.url).searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'sessionId шаардлагатай.' }, { status: 400 });
  }

  try {
    const s = await verifyMn.getSession(sessionId);
    return NextResponse.json({
      ok: true,
      sessionId: s.sessionId,
      sessionStatus: s.sessionStatus,
      callbackStatus: s.callbackStatus,
      verifiedAt: s.verifiedAt || null,
      expiresAt: s.expiresAt || null,
    });
  } catch (err) {
    const status = err && err.status === 404 ? 404 : 502;
    return NextResponse.json(
      { ok: false, code: err && err.code, error: (err && err.message) || 'Төлөв шалгаж чадсангүй.' },
      { status }
    );
  }
}
