// ============================================================
// POST /api/listings/[id]/like — «Таалагдсан» тоог ±1
//
// Body: { action: 'like' | 'unlike' }
// Resp: { ok, likes: number|null, statsEnabled: boolean }
//
// ❤️/🤍 товч дарах бүрд client (lib/favorites.js → toggleFavorite) дуудна.
// «Хэн таалагдсан» нь localStorage-д хадгалагддаг тул нэг хүн 2 удаа
// дарахгүй (товч нь солигддог). Тоолуур нь нийт хэдэн хүн дарсныг харуулна.
//
// ⚠️ Алдаа гарвал ч 200 буцаана — товч дарах нь хэзээ ч эвдрэхгүй.
// ============================================================
import { NextResponse } from 'next/server';
import { bumpLikes, isUuid } from '../../../../../lib/listingStats';

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
  const delta = body.action === 'unlike' ? -1 : 1;

  try {
    const likes = await bumpLikes(id, delta);
    return NextResponse.json({ ok: true, likes, statsEnabled: likes != null });
  } catch (err) {
    console.warn('[listings/like] тоолуур өөрчлөгдсөнгүй:', (err && err.message) || err);
    return NextResponse.json({ ok: true, likes: null, statsEnabled: false });
  }
}
