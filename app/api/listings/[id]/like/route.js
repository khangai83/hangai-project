// ============================================================
// POST /api/listings/[id]/like — ❤️ «Таалагдсан» (хүн тус бүрээр)
//
// Header (заавал биш): Authorization: Bearer <supabase access_token>
//                      → байвал хэрэглэгчийн id-гаар тоолно
// Body:   { action: 'like' | 'unlike', device: '<browser uuid>' }
// Resp:   { ok, likes: number|null, statsEnabled: boolean }
//
// ⚙️ ЗАГВАР (0007_listing_likes_views.sql):
//    like   → `listing_likes` хүснэгтэд мөр НЭМНЭ (давхардвал юу ч болохгүй)
//    unlike → тэр мөрийг УСТГАНА
//    `listings.likes` тоог ТРИГГЕР `count(*)`-ээр автоматаар шинэчилнэ
//    → нэг хүн нэг зард нэг л удаа (PRIMARY KEY), зэрэгцээ хүсэлтэд ч зөв.
//
// ⚠️ Алдаа гарвал ч 200 буцаана — товч дарах нь хэзээ ч эвдрэхгүй.
// ============================================================
import { NextResponse } from 'next/server';
import { setLike, resolveViewer, isUuid, logActivity } from '../../../../../lib/listingStats';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: 'Зарын id буруу.' }, { status: 400 });

  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }
  const liked = body.action !== 'unlike';

  try {
    const viewer = await resolveViewer(req, body);
    const likes = await setLike(id, viewer, liked);
    // 📈 Өдөр тутмын ❤️-ийн цэвэр өөрчлөлт (0010 миграц) — +1 / -1.
    await logActivity(id, 0, liked ? 1 : -1);
    return NextResponse.json({ ok: true, likes, statsEnabled: likes != null });
  } catch (err) {
    console.warn('[listings/like] тоолуур өөрчлөгдсөнгүй:', (err && err.message) || err);
    return NextResponse.json({ ok: true, likes: null, statsEnabled: false });
  }
}

