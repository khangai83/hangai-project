// ============================================================
// GET /api/my-listings/stats — «Миний зарууд»-ын хандалтын статистик
//
// Header: Authorization: Bearer <supabase access_token>  ← ЗААВАЛ
// Resp:   { ok, mode, generatedAt, seriesDays, totals, daily, listings }
//
// ⚠️ ЗӨВХӨН ӨӨРИЙН зарыг буцаана: хэрэглэгчийн id-г ТОКЕНООС авна
//    (query/body-гоос АВАХГҮЙ) — инээ өөр хүний id илгээж чадахгүй.
//
// ⚠️ `listing_views`/`listing_likes`/`listing_activity_daily` хүснэгтүүд нь
//    anon/authenticated-д ХААЛТТАЙ (RLS, grant revoke) тул зөвхөн сервер
//    талд `service_role`-оор уншина. Энэ route нь тийм учраас байгаа.
//
// Бүтцийн тайлбар: lib/listingActivity.js дотор.
// ============================================================
import { NextResponse } from 'next/server';
import { bearerToken, getUserFromToken } from '../../../../lib/adminAuth';
import { getMyListingActivity } from '../../../../lib/listingActivity';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const token = bearerToken(req);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'Нэвтрэх шаардлагатай (Bearer token байхгүй).' },
      { status: 401 }
    );
  }

  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Сесс хүчингүй байна. Дахин нэвтэрнэ үү.' },
      { status: 401 }
    );
  }

  try {
    const data = await getMyListingActivity(user.id);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error('[my-listings/stats]', (err && err.message) || err);
    return NextResponse.json(
      { ok: false, error: (err && err.message) || 'Статистик бодож чадсангүй.' },
      { status: 500 }
    );
  }
}
