// ============================================================
// GET /api/admin/me — Одоогийн хэрэглэгч админ эсэх
//
// Header: Authorization: Bearer <supabase access_token>
// Resp:   { ok, isAdmin, user: { id, phone, name } }
//
// UI нь header дээр «🛠 Админ» цэс харуулах эсэхийг шийдэхэд ашиглана.
// ⚠️ Эрхийг `app_metadata.is_admin`-аас уншина (клиент үүнийг хуурах боломжгүй).
// ============================================================
import { NextResponse } from 'next/server';
import { getUserFromToken, isUserAdmin } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : null;

  if (!token) return NextResponse.json({ ok: false, isAdmin: false, error: 'Нэвтрээгүй.' }, { status: 401 });

  const user = await getUserFromToken(token);
  if (!user) return NextResponse.json({ ok: false, isAdmin: false, error: 'Сесс хүчингүй.' }, { status: 401 });

  return NextResponse.json({
    ok: true,
    isAdmin: isUserAdmin(user),
    user: {
      id: user.id,
      phone: user.phone || (user.user_metadata && user.user_metadata.phone) || null,
      name: (user.user_metadata && user.user_metadata.name) || null,
    },
  });
}
