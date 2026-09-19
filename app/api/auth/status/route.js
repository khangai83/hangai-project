// ============================================================
// GET /api/auth/status — Бүртгэл/нэвтрэлт бэлэн эсэх (UI-д анхааруулга харуулах)
//
// Resp: { ok, phoneProviderEnabled, verifyMnConfigured }
//   phoneProviderEnabled — Supabase: Authentication → Providers → Phone
//   verifyMnConfigured   — VERIFY_MN_API_KEY тохируулсан эсэх
//
// Хоёрын нэг нь дутуу бол бүртгэл/нэвтрэлт ажиллахгүй тул AuthModal дээр
// шууд анхааруулга харуулна (хэрэглэгч форм бөглөөд алдаа авахаас өмнө).
// Нууц утга ОГТ буцаахгүй — зөвхөн true/false.
// ============================================================
import { NextResponse } from 'next/server';
import verifyMn from '../../../../lib/verifyMn';
import { isPhoneProviderEnabled } from '../../../../lib/authServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  let phoneProviderEnabled = null;
  try {
    phoneProviderEnabled = await isPhoneProviderEnabled();
  } catch (e) {
    phoneProviderEnabled = null; // тодорхойгүй
  }

  return NextResponse.json({
    ok: true,
    phoneProviderEnabled,
    verifyMnConfigured: !!verifyMn.getApiKey(),
  });
}
