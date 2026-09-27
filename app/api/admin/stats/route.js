// ============================================================
// GET /api/admin/stats — ХЯНАЛТЫН САМБАРЫН статистик (зөвхөн админд)
//
// Header: Authorization: Bearer <supabase access_token>  (админ хэрэглэгчийн)
// Resp:   { ok, stats: { generatedAt, listings, users, feedback, series,
//                        activeToday } }
//
// 📊 Агуулга (дэлгэрэнгүйг `lib/adminStats.js`-ээс үзнэ үү):
//   • listings — нийт / өнөөдөр / 7 хоног / 30 хоног, нийт хандалт, таалагдсан,
//                ангилал·төрөл·хотын задаргаа, хамгийн их үзсэн 10 зар
//   • users    — нийт / өнөөдөр / 7 / 30, хамгийн сүүлийн 10 бүртгэл
//   • series   — сүүлийн 14 хоногийн өдөр тутмын (зар · хэрэглэгч · хандалт)
//   • feedback — нийт / шийдэгдээгүй / шийдэгдсэн
//
// ⚠️ Admin API (service_role) шаарддаг тул зөвхөн сервер талаас ажиллана.
//    Дуудагчийг `app_metadata.is_admin`-аар шалгана (`requireAdmin`).
// ============================================================
import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/adminAuth';
import { getAdminStats } from '../../../../lib/adminStats';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const gate = await requireAdmin(req);
  if (gate.error) return NextResponse.json({ ok: false, error: gate.error }, { status: gate.status });

  try {
    const stats = await getAdminStats();
    return NextResponse.json({ ok: true, stats, requestedBy: gate.user.id });
  } catch (err) {
    console.error('[admin/stats] алдаа:', (err && err.message) || err);
    return NextResponse.json(
      { ok: false, error: (err && err.message) || 'Статистик татаж чадсангүй.' },
      { status: 500 }
    );
  }
}
