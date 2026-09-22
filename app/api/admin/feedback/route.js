// ============================================================
// /api/admin/feedback — Хэрэглэгчээс ирсэн САНАЛ ХҮСЭЛТ (зөвхөн админд)
//
//   GET   → { ok, rows: [...], stats: { total, new, read, resolved } }
//   PATCH → Body: { id, status?: 'new'|'read'|'resolved', adminNote?: string }
//
// Header: Authorization: Bearer <админ access_token>
//
// ⚠️ `feedback` хүснэгтэд RLS нь зөвхөн «өөрийн мөр»-ийг уншина. Тиймээс
//    админ БҮГДИЙГ харахын тулд service_role (getAdminClient) ашиглана —
//    дуудагчийг `app_metadata.is_admin`-аар эхлээд шалгана.
// ============================================================
import { NextResponse } from 'next/server';
import { requireAdmin, getAdminFeedbackList, setFeedbackStatus, getListingsByIds } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  try {
    const { rows, stats } = await getAdminFeedbackList();
    // Тухайн зард холбоотой гомдлуудын зарын мэдээллийг нэг query-ээр хавсаргана
    const listingIds = [...new Set(rows.map((r) => r.listing_id).filter(Boolean))];
    const listings = await getListingsByIds(listingIds);
    return NextResponse.json({ ok: true, rows, stats, listings });
  } catch (err) {
    console.error('[admin/feedback] алдаа:', (err && err.message) || err);
    return NextResponse.json({ ok: false, error: (err && err.message) || 'Санал хүсэлт татаж чадсангүй.' }, { status: 500 });
  }
}

export async function PATCH(req) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }

  const id = body.id;
  if (!id) return NextResponse.json({ ok: false, error: 'Саналын id дутуу.' }, { status: 400 });

  const status = body.status;
  if (status && !['new', 'read', 'resolved'].includes(status)) {
    return NextResponse.json({ ok: false, error: 'Төлөв буруу байна.' }, { status: 400 });
  }

  try {
    const row = await setFeedbackStatus(id, { status, adminNote: body.adminNote });
    return NextResponse.json({ ok: true, row });
  } catch (err) {
    console.error('[admin/feedback] алдаа:', (err && err.message) || err);
    return NextResponse.json({ ok: false, error: (err && err.message) || 'Төлөв солиж чадсангүй.' }, { status: 400 });
  }
}
