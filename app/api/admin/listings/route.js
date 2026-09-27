// ============================================================
// /api/admin/listings — Админы зарын удирдлага (зөвхөн админд)
//
//   GET    /api/admin/listings?q=<ID|утас|нэр|дүүрэг>&limit=100
//          → { ok, rows, total }        (ID-аар: бүтэн эсвэл эхлэлээр)
//   GET    /api/admin/listings?userId=<uuid>&limit=200
//          → тухайн хэрэглэгчийн БҮХ зар (`/admin/users` хуудаснаас)
//   DELETE /api/admin/listings?id=<uuid>
//          → { ok, deletedId, imagesRemoved }
//
// Header: Authorization: Bearer <админ access_token>
//
// ⚠️ `listings_delete` RLS policy нь зөвхөн «өөрийн зар»-ыг устгахыг
//    зөвшөөрдөг тул админ ЯМАР Ч зарыг устгахын тулд service_role
//    (`deleteAdminListing`) ашиглана. Дуудагчийг эхлээд шалгана.
// ============================================================
import { NextResponse } from 'next/server';
import { requireAdmin, searchAdminListings, deleteAdminListing } from '../../../../lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const url = new URL(req.url);
  const q = url.searchParams.get('q') || '';
  const userId = (url.searchParams.get('userId') || '').trim();
  const limit = Number(url.searchParams.get('limit')) || 100;

  try {
    const { rows, total, mode, scanned } = await searchAdminListings({ q, limit, userId });
    return NextResponse.json({ ok: true, rows, total, mode, scanned, userId: userId || null });
  } catch (err) {
    console.error('[admin/listings] алдаа:', (err && err.message) || err);
    return NextResponse.json({ ok: false, error: (err && err.message) || 'Заруудыг татаж чадсангүй.' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'Зарын id дутуу (?id=...).' }, { status: 400 });

  try {
    const res = await deleteAdminListing(id);
    return NextResponse.json({ ok: true, deletedId: res.id, imagesRemoved: res.imagesRemoved });
  } catch (err) {
    console.error('[admin/listings] устгалтын алдаа:', (err && err.message) || err);
    return NextResponse.json({ ok: false, error: (err && err.message) || 'Зарыг устгаж чадсангүй.' }, { status: 400 });
  }
}
