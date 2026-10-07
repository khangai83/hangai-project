// ============================================================
// PATCH /api/admin/users/[id] — Хэрэглэгчийн ЭРХ / БЛОК удирдах
//
// Header: Authorization: Bearer <админ access_token>
// Body:   { isAdmin: true|false }   // эрх олгох / авах
//         { blocked: true|false }   // 🚫 блоклох / блокыг авах
//         (хоёуланг нь нэг хүсэлтэд өгч болно)
// Resp:   { ok, userId, isAdmin, blocked }
//
// ⚠️ Эрх нь `app_metadata`-д хадгалагдана (клиент хуурах боломжгүй).
// ⚠️ Админ өөрөөсөө эрхээ / өөрийгөө блоклож чадахгүй (өөрийгөө түгжихээс
//    сэргийлж). Мөн бүх админ алга болохоос сэргийлнэ.
// 🚫 Блоклох нь: ① `profiles.blocked` (зар нийтэд харагдахгүй) ба
//    ② Supabase-ийн бан (`ban_duration` — нэвтрэх хориг) хоёрыг ХАМТ бичнэ.
//    Дэлгэрэнгүй: `lib/adminAuth.js → setUserBlocked`, `0038_user_blocks.sql`.
// ============================================================
import { NextResponse } from 'next/server';
import { requireAdmin, setUserAdmin, setUserBlocked, isUserBlocked } from '../../../../../lib/adminAuth';

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

  const hasIsAdmin = typeof body.isAdmin === 'boolean';
  const hasBlocked = typeof body.blocked === 'boolean';

  if (!hasIsAdmin && !hasBlocked) {
    return NextResponse.json(
      { ok: false, error: 'Өөрчлөх утга байхгүй — `isAdmin` эсвэл `blocked` илгээнэ үү.' },
      { status: 400 }
    );
  }

  const self = gate.user.id === id;

  if (self && hasIsAdmin && !body.isAdmin) {
    return NextResponse.json(
      { ok: false, error: 'Өөрөөсөө админ эрхээ авч болохгүй (бүх админ алга болохоос сэргийлж).' },
      { status: 400 }
    );
  }
  if (self && hasBlocked && body.blocked) {
    return NextResponse.json(
      { ok: false, error: 'Өөрийгөө блоклож болохгүй (системд нэвтрэх боломжгүй болно).' },
      { status: 400 }
    );
  }

  try {
    let user = null;
    // Эрх солих (эхлээд) → дараа нь блок (app_metadata-ыг дахин бичихдээ
    // эрхийг хадгална — хоёулаа `getUserById`→merge хийдэг).
    if (hasIsAdmin) user = await setUserAdmin(id, body.isAdmin);
    if (hasBlocked) user = await setUserBlocked(id, body.blocked);

    return NextResponse.json({
      ok: true,
      userId: user.id,
      isAdmin: !!(user.app_metadata && user.app_metadata.is_admin),
      blocked: isUserBlocked(user),
    });
  } catch (err) {
    console.error('[admin/users/:id] алдаа:', (err && err.message) || err);
    return NextResponse.json({ ok: false, error: (err && err.message) || 'Төлөв солиж чадсангүй.' }, { status: 400 });
  }
}
