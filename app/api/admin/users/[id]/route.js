// ============================================================
// PATCH /api/admin/users/[id] — Хэрэглэгчийн ЭРХ / БЛОК / ЛИМИТ удирдах
//
// Header: Authorization: Bearer <админ access_token>
// Body:   { isAdmin: true|false }   // эрх олгох / авах
//         { blocked: true|false }   // 🚫 блоклох / блокыг авах
//         { listingDailyLimit: 50 } // ⚡ өдрийн зарын лимит (0014 V2, 0 = ∞)
//         (хэд хэдэн утгыг нэг хүсэлтэд өгч болно)
// Resp:   { ok, userId, isAdmin, blocked, dailyLimit }
//
// ⚠️ Эрх нь `app_metadata`-д хадгалагдана (клиент хуурах боломжгүй).
// ⚠️ Админ өөрөөсөө эрхээ / өөрийгөө блоклож чадахгүй (өөрийгөө түгжихээс
//    сэргийлж). Мөн бүх админ алга болохоос сэргийлнэ.
// 🚫 Блоклох нь: ① `profiles.blocked` (зар нийтэд харагдахгүй) ба
//    ② Supabase-ийн бан (`ban_duration` — нэвтрэх хориг) хоёрыг ХАМТ бичнэ.
// Дэлгэрэнгүй: `lib/adminAuth.js → setUserBlocked`, `0038_user_blocks.sql`.
// ⚡ Лимит нь `app_metadata.listing_daily_limit` — давхардлын/spam
//    хамгаалалтын триггер (0014) уншина. Агент/дэлгүүрт 50 (эсвэл 0 = ∞).
// ============================================================
import { NextResponse } from 'next/server';
import {
  requireAdmin,
  setUserAdmin,
  setUserBlocked,
  setUserDailyLimit,
  dailyLimitOf,
  isUserBlocked,
} from '../../../../../lib/adminAuth';

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
  // ⚡ Лимит: тоо эсвэл null (null = анхдагч 3 руу буцаах)
  const hasLimit =
    body.listingDailyLimit === null ||
    (body.listingDailyLimit !== undefined && body.listingDailyLimit !== '');

  if (!hasIsAdmin && !hasBlocked && !hasLimit) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Өөрчлөх утга байхгүй — `isAdmin`, `blocked` эсвэл `listingDailyLimit` илгээнэ үү.',
      },
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
    // ⚡ Лимит — МӨН `app_metadata` merge хийдэг тул хамгийн сүүлд (эрх/блок
    //    хадгалагдана ✓)
    if (hasLimit) user = await setUserDailyLimit(id, body.listingDailyLimit);

    return NextResponse.json({
      ok: true,
      userId: user.id,
      isAdmin: !!(user.app_metadata && user.app_metadata.is_admin),
      blocked: isUserBlocked(user),
      dailyLimit: dailyLimitOf(user),
    });
  } catch (err) {
    console.error('[admin/users/:id] алдаа:', (err && err.message) || err);
    return NextResponse.json({ ok: false, error: (err && err.message) || 'Төлөв солиж чадсангүй.' }, { status: 400 });
  }
}
