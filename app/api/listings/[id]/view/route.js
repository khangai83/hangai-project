// ============================================================
// POST /api/listings/[id]/view — «Үзсэн» тоог +1
//
// Дэлгэрэнгүй хуудас нээгдэх бүрд клиент үүнийг дуудна
// (нэг browser session-д нэг л удаа — lib/queries.js → trackListingView).
//
// Resp: { ok, views: number|null, statsEnabled: boolean }
//   statsEnabled=false → 0006 миграц ажиллуулаагүй (тоо хадгалах багана алга)
//
// ⚠️ Тоолуур нь ЗҮГЭЭР ЧИМЭЭГҮЙ нэмэгддэг — алдаа гарвал ч 200 буцаана,
//    ингэснээр хэрэглэгчийн зар харахад хэзээ ч саад болохгүй.
// ============================================================
import { NextResponse } from 'next/server';
import { bumpViews, isUuid } from '../../../../../lib/listingStats';

export const dynamic = 'force-dynamic';

export async function POST(_req, { params }) {
  // Next.js 15: params нь Promise
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: 'Зарын id буруу.' }, { status: 400 });

  try {
    const views = await bumpViews(id);
    return NextResponse.json({ ok: true, views, statsEnabled: views != null });
  } catch (err) {
    console.warn('[listings/view] тоолуур нэмэгдсэнгүй:', (err && err.message) || err);
    return NextResponse.json({ ok: true, views: null, statsEnabled: false });
  }
}
