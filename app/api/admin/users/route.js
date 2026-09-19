// ============================================================
// GET /api/admin/users — Бүртгэгдсэн хэрэглэгчдийн жагсаалт (зөвхөн админд)
//
// Header: Authorization: Bearer <supabase access_token>  (админ хэрэглэгчийн)
// Resp:   { ok, rows: [{ id, phone, email, name, createdAt, lastSignInAt,
//                        confirmedAt, isAdmin, listingsCount }],
//           stats: { users, admins, listings, withListings } }
//
// ⚠️ Хэрэглэгчдийн жагсаалт нь Admin API (service_role) шаарддаг тул зөвхөн
// сервер талаас ажиллана. Дуудагчийг `app_metadata.is_admin`-аар шалгана.
// ============================================================
import { NextResponse } from 'next/server';
import { requireAdmin, getAdminUsersSummary } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  try {
    const { rows, stats } = await getAdminUsersSummary();
    return NextResponse.json({ ok: true, rows, stats, requestedBy: gate.user.id });
  } catch (err) {
    console.error('[admin/users] алдаа:', (err && err.message) || err);
    return NextResponse.json({ ok: false, error: (err && err.message) || 'Жагсаалт татаж чадсангүй.' }, { status: 500 });
  }
}
