// ============================================================
// POST /api/listings/[id]/view — 👁 «Үзсэн» (хүн тус бүрээр НЭГ л удаа)
//
// Header (заавал биш): Authorization: Bearer <supabase access_token>
//                      → байвал хэрэглэгчийн id-гаар тоолно
// Body:  { device: '<browser uuid>' }  ← зочин хүнийг таних (lib/statsClient.js)
//
// Resp: { ok, views: number|null, statsEnabled: boolean }
//   statsEnabled=false → 0007 миграц ажиллуулаагүй (тоолуур хадгалах газар алга)
//
// ⚠️ Нэг viewer нэг зард нэг л удаа тоологдоно (PRIMARY KEY).
//    Тоолуур эвдэрсэн ч 200 буцаана — зар харахад хэзээ ч саад болохгүй.
// ============================================================
import { NextResponse } from 'next/server';
import { registerView, resolveViewer, isUuid } from '../../../../../lib/listingStats';

export const dynamic = 'force-dynamic';

export async function POST(req, { params }) {
  // Next.js 15: params нь Promise
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ ok: false, error: 'Зарын id буруу.' }, { status: 400 });

  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }

  try {
    const viewer = await resolveViewer(req, body);
    const views = await registerView(id, viewer);
    return NextResponse.json({ ok: true, views, statsEnabled: views != null });
  } catch (err) {
    console.warn('[listings/view] тоолуур нэмэгдсэнгүй:', (err && err.message) || err);
    return NextResponse.json({ ok: true, views: null, statsEnabled: false });
  }
}

