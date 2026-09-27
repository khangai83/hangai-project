// ============================================================
// adminStats.js — Админы ХЯНАЛТЫН САМБАРЫН статистик (СЕРВЕР ТАЛ)
//
// ⚠️ ЗӨВХӨН СЕРВЕР ТАЛД (`service_role`) — RLS-ийг тойрч бүх өгөгдлийг уншина.
//    `/api/admin/stats` route-аас `requireAdmin()`-ий дараа л дуудагдана.
//
// 📊 Юу тооцох вэ:
//   • Зарууд  — нийт / өнөөдөр / 7 хоног / 30 хоног + ангилал, төрөл, хот
//   • Хэрэглэгчид — нийт / өнөөдөр / 7 / 30 (auth.users.created_at)
//   • Хандалт  — `listings.views` нийлбэр + `listing_activity_daily` (0010)
//   • Таалагдсан — `listings.likes` нийлбэр
//   • Санал хүсэлт — нийт / шийдэгдээгүй (0008)
//
// ⚠️ `limit(5000)` — энэ апп-д зарууд цөөн (хэдэн зуу) тул JS дээр нэгтгэх нь
//    хурдан. Ирээдүйд 10,000+ болвол Postgres RPC (`sum()`)-рүү шилжүүлнэ.
// ============================================================
const { getAdminClient } = require('./authServer');

/** Огноог `YYYY-MM-DD` (UTC) болгох — `listing_activity_daily.day`-тэй тааруулна */
function dayKey(value) {
  const d = value ? new Date(value) : new Date();
  return d.toISOString().slice(0, 10);
}

/** N хоногийн өмнөх `YYYY-MM-DD` */
function daysAgoKey(days) {
  return dayKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
}

/** `[{created_at}]`-оос сүүлийн N хоногт хэд байгааг тоолно (0 = зөвхөн өнөөдөр) */
function countInPeriod(rows, days) {
  const today = dayKey();
  if (days === 0) return rows.filter((r) => r.created_at && dayKey(r.created_at) === today).length;
  const from = daysAgoKey(days - 1); // сүүлийн N хоног (өнөөдрийг оруулаад)
  return rows.filter((r) => r.created_at && dayKey(r.created_at) >= from).length;
}

/**
 * Админы хяналтын самбарын БҮХ статистикийг нэг дор цуглуулна.
 * @returns {Promise<object>}
 */
async function getAdminStats() {
  const admin = getAdminClient();
  const today = dayKey();

  // ---------- 1. Зарууд ----------
  const listingsRes = await admin
    .from('listings')
    .select('id, user_id, category, property_type, price, city, district, khoroo, rooms, images, views, likes, created_at')
    .order('created_at', { ascending: false })
    .limit(5000);
  if (listingsRes.error) throw new Error(`Заруудыг татахад алдаа: ${listingsRes.error.message}`);
  const listings = listingsRes.data || [];

  const totalViews = listings.reduce((s, l) => s + (Number(l.views) || 0), 0);
  const totalLikes = listings.reduce((s, l) => s + (Number(l.likes) || 0), 0);

  // Ангилал / төрөл / хотын задаргаа
  const byCategory = {};
  const byType = {};
  const byCity = {};
  listings.forEach((l) => {
    const c = l.category || 'бусад';
    byCategory[c] = (byCategory[c] || 0) + 1;
    const t = l.property_type || 'Тодорхойгүй';
    byType[t] = (byType[t] || 0) + 1;
    const city = l.city || 'Тодорхойгүй';
    byCity[city] = (byCity[city] || 0) + 1;
  });

  // Хамгийн их үзсэн 10 зар
  const topViewed = [...listings]
    .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
    .slice(0, 10)
    .map((l) => ({
      id: l.id,
      title: `${l.property_type || ''} · ${[l.district, l.khoroo].filter(Boolean).join(', ')}`.trim(),
      views: Number(l.views) || 0,
      likes: Number(l.likes) || 0,
      price: Number(l.price) || 0,
      city: l.city || '',
    }));

  const listingStats = {
    total: listings.length,
    today: countInPeriod(listings, 0),
    week: countInPeriod(listings, 7),
    month: countInPeriod(listings, 30),
    totalViews,
    totalLikes,
    avgViews: listings.length ? Math.round(totalViews / listings.length) : 0,
    withImages: listings.filter((l) => Array.isArray(l.images) && l.images.length > 0).length,
    byCategory,
    byType,
    byCity,
    topViewed,
  };

  // ---------- 2. Хэрэглэгчид (auth.users) ----------
  const users = [];
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.warn('[adminStats] хэрэглэгч татахад алдаа:', error.message);
      break;
    }
    const batch = (data && data.users) || [];
    users.push(...batch);
    if (batch.length < perPage) break;
  }

  const userRows = users.map((u) => ({
    id: u.id,
    name: (u.user_metadata && u.user_metadata.name) || null,
    phone: u.phone || (u.user_metadata && u.user_metadata.phone) || null,
    createdAt: u.created_at || null,
    lastSignInAt: u.last_sign_in_at || null,
  }));

  const userStats = {
    total: userRows.length,
    today: countInPeriod(userRows.map((u) => ({ created_at: u.createdAt })), 0),
    week: countInPeriod(userRows.map((u) => ({ created_at: u.createdAt })), 7),
    month: countInPeriod(userRows.map((u) => ({ created_at: u.createdAt })), 30),
    recent: [...userRows]
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 10),
  };

  // ---------- 3. Өдөр тутмын хандалт (0010 — listing_activity_daily) ----------
  // ⚠️ Энэ хүснэгт байхгүй (0010 ороогүй) бол ч ажиллах ёстой — зөвхөн
  //    хоосон буцаана, самбар нь `listings.views`-ээр л ажиллана.
  let daily = [];
  try {
    const dailyRes = await admin
      .from('listing_activity_daily')
      .select('day, views, likes')
      .gte('day', daysAgoKey(13))
      .limit(5000);
    if (!dailyRes.error && dailyRes.data) {
      const agg = {};
      dailyRes.data.forEach((r) => {
        const k = dayKey(r.day);
        if (!agg[k]) agg[k] = { day: k, views: 0, likes: 0 };
        agg[k].views += Number(r.views) || 0;
        agg[k].likes += Number(r.likes) || 0;
      });
      daily = Object.values(agg).sort((a, b) => a.day.localeCompare(b.day));
    }
  } catch (e) {
    console.warn('[adminStats] listing_activity_daily уншиж чадсангүй (0010 ороогүй?):', e.message || e);
  }

  // ---------- 4. Сүүлийн 14 хоногийн график (зар + хэрэглэгч + хандалт) ----------
  const series = [];
  for (let i = 13; i >= 0; i -= 1) {
    const key = daysAgoKey(i);
    const d = daily.find((x) => x.day === key);
    series.push({
      day: key,
      listings: listings.filter((l) => dayKey(l.created_at) === key).length,
      users: userRows.filter((u) => u.createdAt && dayKey(u.createdAt) === key).length,
      views: d ? d.views : 0,
    });
  }

  // ---------- 5. Санал хүсэлт (0008) ----------
  let feedback = { total: 0, openCount: 0, resolved: 0 };
  try {
    const fbRes = await admin.from('feedback').select('status', { count: 'exact' }).limit(5000);
    if (!fbRes.error) {
      const rows = fbRes.data || [];
      feedback = {
        total: typeof fbRes.count === 'number' ? fbRes.count : rows.length,
        openCount: rows.filter((r) => r.status !== 'resolved').length,
        resolved: rows.filter((r) => r.status === 'resolved').length,
      };
    }
  } catch (e) {
    console.warn('[adminStats] feedback уншиж чадсангүй (0008 ороогүй?):', e.message || e);
  }

  // ---------- 6. Өнөөдөр идэвхтэй хэрэглэгч ----------
  // ⚠️ «Идэвхтэй» = өнөөдөр зар оруулсан ЭСВЭЛ өнөөдөр нэвтэрсэн (давхардалгүй)
  const activeToday = new Set([
    ...listings.filter((l) => dayKey(l.created_at) === today).map((l) => l.user_id),
    ...userRows.filter((u) => u.lastSignInAt && dayKey(u.lastSignInAt) === today).map((u) => u.id),
  ]).size;

  return {
    generatedAt: new Date().toISOString(),
    listings: listingStats,
    users: userStats,
    feedback,
    series,
    activeToday,
  };
}

module.exports = { getAdminStats };

