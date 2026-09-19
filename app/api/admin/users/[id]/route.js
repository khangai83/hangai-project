// ============================================================
// PATCH /api/admin/users/[id] — Хэрэглэгчид админ эрх олгох / авах
//
// Header: Authorization: Bearer <админ access_token>
// Body:   { isAdmin: true | false }
// Resp:   { ok, userId, isAdmin }
//
// ⚠️ Эрх нь `app_metadata`-д хадгалагдана (клиент хуурах боломжгүй).
// ⚠️ Админ өөрөөсөө эрхээ авч чадахгүй (бүх админ алга болохоос сэргийлж).
// ============================================================
import { NextResponse } from 'next/server';
import { requireAdmin, setUserAdmin } from '../../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  // Next.js 15: params нь Promise
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: 'Хэрэглэгчийн id дутуу.' }, { status: 400 });

  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }
  const isAdmin = !!body.isAdmin;

  if (gate.user.id === id && !isAdmin) {
    return NextResponse.json(
      { ok: false, error: 'Өөрөөсөө админ эрхээ авч болохгүй (бүх админ алга болохоос сэргийлж).' },
      { status: 400 }
    );
  }

  try {
    const user = await setUserAdmin(id, isAdmin);
    return NextResponse.json({
      ok: true,
      userId: user.id,
      isAdmin: !!(user.app_metadata && user.app_metadata.is_admin),
    });
  } catch (err) {
    console.error('[admin/users/:id] алдаа:', (err && err.message) || err);
    return NextResponse.json({ ok: false, error: (err && err.message) || 'Эрх солиж чадсангүй.' }, { status: 400 });
  }
}
