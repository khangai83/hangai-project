// ============================================================
// listingActivity.js — «Миний зарууд»-ын ХАНДАЛТЫН статистик (СЕРВЕР ТАЛ)
//
// ⚠️⚠️ ЗӨВХӨН API route дотор import хийнэ! ⚠️⚠️
//    `service_role` түлхүүр ашигладаг тул client component-д import хийвэл
//    түлхүүр bundle-д алдагдана.
//
// ЮУ БОДОХ ВЭ (зар эзэн өөрийн заруудын хандлагыг харахад):
//   • Сүүлийн 1 / 3 / 7 / 30 хоногийн ХАНДАЛТ (page open) болон ❤️
//   • Нийт үзсэн хүн / нийт ❤️ (бүх хугацаа, `listings` баганаас)
//   • 30 хоногийн өдөр тутмын цуваа (график зурахад)
//
// ХОЁР ГОРИМ (миграц ажилласан эсэхээс хамаарна):
//
//   mode='daily'   ← 0010_listing_activity_daily.sql АЖИЛЛАСАН
//        d1/d3/d7/d30 = тухайн цонхны НИЙТ ХАНДАЛТ (нэг хүн давтан
//        нээвэл олон удаа тоологдоно) — «100 хүн үзсэн» гэдэг утга.
//
//   mode='unique'  ← миграцгүй (0007 хүртэл)
//        d1/d3/d7/d30 = тухайн цонхонд ШИНЭЭР ирсэн хүний тоо
//        (`listing_views` нь хүн тус бүрд нэг л мөр хадгалдаг тул).
//        График (daily) байхгүй → UI нь сануулга харуулна.
//
// 🔎 Хоёр горимд ч d1..d30 нь «одоогийн сонирхол»-ыг харуулна: зар хуучрах
//    тусам эдгээр тоо буурах нь хэвийн (шинэ зар оруулах дохио).
// ============================================================
import { getAdminClient } from './authServer';
import {
  SERIES_DAYS,
  todayUtc,
  shiftDay,
  daysAgo,
  emptyWindows,
  addToWindows,
  dayOf,
  seriesIndex,
} from './activityWindows.mjs';

/** Хандлагыг хэдэн хоногийн цонхоор харуулах вэ (d1/d3/d7/d30) */
export const WINDOW_KEYS = [1, 3, 7, 30];
/** Өдөр тутмын цувааны урт — `lib/activityWindows.mjs`-ээс дахин экспортлоно */
export { SERIES_DAYS };

/**
 * Нэг хэрэглэгчийн заруудын хандалтын статистик.
 *
 * @param {string} userId — Supabase auth хэрэглэгчийн id (uuid)
 * @returns {Promise<{mode:'daily'|'unique', generatedAt:string, seriesDays:number,
 *                    totals:object, daily:object[], listings:object[]}>}
 */
export async function getMyListingActivity(userId) {
  const admin = getAdminClient();
  const today = todayUtc();
  const from = shiftDay(today, -(SERIES_DAYS - 1));

  const emptyResult = {
    mode: 'unique',
    generatedAt: new Date().toISOString(),
    seriesDays: SERIES_DAYS,
    totals: { listings: 0, uniqueViews: 0, uniqueLikes: 0, views: emptyWindows(), likes: emptyWindows() },
    daily: [],
    listings: [],
  };

  // ---------- 1. Хэрэглэгчийн зарууд ----------
  const { data: listingRows, error: listErr } = await admin
    .from('listings')
    .select('id, property_type, category, price, price_type, rooms, area, city, district, khoroo, images, created_at, views, likes')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(500);
  if (listErr) throw new Error(`Заруудыг татахад алдаа: ${listErr.message}`);

  const listings = listingRows || [];
  const ids = listings.map((l) => l && l.id).filter(Boolean);
  if (!ids.length) return emptyResult;

  // ---------- 2. Өдөр тутмын хандалт (0010 миграц) ----------
  // Хүснэгт байхгүй бол `error` буцаана → mode='unique' (сайт эвдрэхгүй).
  let mode = 'unique';
  let dailyRows = [];
  {
    const { data, error } = await admin
      .from('listing_activity_daily')
      .select('listing_id, day, views, likes')
      .in('listing_id', ids)
      .gte('day', from)
      .limit(20000);
    if (!error) {
      mode = 'daily';
      dailyRows = data || [];
    } else {
      console.warn('[listingActivity] 0010 миграц ажиллаагүй — «шинэ үзсэн» горимд:', error.message);
    }
  }

  // ---------- 3. Шинэ үзсэн хүн / шинэ ❤️ (0007 — ямар ч үед) ----------
  // `listing_views`/`listing_likes` нь хүн тус бүрд НЭГ л мөр хадгалдаг тул
  // эдгээр нь «тухайн цонхонд ШИНЭЭР ирсэн хүн»-ийг хэлнэ (нийт хандалт БИШ).
  const cutoff = `${from}T00:00:00.000Z`;
  const [viewsRes, likesRes] = await Promise.all([
    admin
      .from('listing_views')
      .select('listing_id, created_at')
      .in('listing_id', ids)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(10000),
    admin
      .from('listing_likes')
      .select('listing_id, created_at')
      .in('listing_id', ids)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(10000),
  ]);
  const newViewerRows = viewsRes.error ? [] : viewsRes.data || [];
  const newLikeRows = likesRes.error ? [] : likesRes.data || [];

  // ---------- 4. Зар тус бүрээр нэгтгэх ----------
  const byId = new Map(
    listings.map((l) => [
      l.id,
      {
        id: l.id,
        property_type: l.property_type,
        category: l.category,
        price: l.price,
        price_type: l.price_type,
        city: l.city,
        district: l.district,
        khoroo: l.khoroo,
        images: Array.isArray(l.images) ? l.images : [],
        created_at: l.created_at,
        // Бүх хугацааны нийт (триггер зөв боддог тул `listings` баганаас)
        uniqueViews: Number(l.views) || 0,
        uniqueLikes: Number(l.likes) || 0,
        // Цонхны хандалт/❤️ («одоогийн сонирхол» — горимоос хамаарна)
        views: emptyWindows(),
        likes: emptyWindows(),
        // Шинэ үзсэн хүн / шинэ ❤️ (0007 хүснэгтээс, ялгаатай хэмжүүр)
        newViewers: emptyWindows(),
        newLikes: emptyWindows(),
        // 30 хоногийн өдөр тутмын хандалт (график; ХУУЧИН → ШИНЭ)
        spark: new Array(SERIES_DAYS).fill(0),
      },
    ])
  );

  const totals = {
    listings: listings.length,
    uniqueViews: listings.reduce((s, l) => s + (Number(l.views) || 0), 0),
    uniqueLikes: listings.reduce((s, l) => s + (Number(l.likes) || 0), 0),
    views: emptyWindows(),
    likes: emptyWindows(),
  };
  const dailyMap = new Map(); // day → { day, views, likes }

  // 4a) Өдөр тутмын хандалт → цонх, график, өдрийн цуваа (mode='daily' үед)
  dailyRows.forEach((r) => {
    const item = byId.get(r.listing_id);
    if (!item) return;
    const age = daysAgo(String(r.day).slice(0, 10), today);
    if (age < 0 || age >= SERIES_DAYS) return;

    const views = Number(r.views) || 0;
    const likes = Number(r.likes) || 0;

    addToWindows(item.views, age, views);
    addToWindows(item.likes, age, likes);
    addToWindows(totals.views, age, views);
    addToWindows(totals.likes, age, likes);

    if (views) item.spark[seriesIndex(age)] += views;

    const dayKey = shiftDay(from, seriesIndex(age));
    const acc = dailyMap.get(dayKey) || { day: dayKey, views: 0, likes: 0 };
    acc.views += views;
    acc.likes += likes;
    dailyMap.set(dayKey, acc);
  });

  // 4b) Шинэ үзсэн хүн / шинэ ❤️ (0007) — бүх горимд
  newViewerRows.forEach((r) => {
    const item = byId.get(r.listing_id);
    if (!item) return;
    addToWindows(item.newViewers, daysAgo(dayOf(r.created_at), today), 1);
  });
  newLikeRows.forEach((r) => {
    const item = byId.get(r.listing_id);
    if (!item) return;
    addToWindows(item.newLikes, daysAgo(dayOf(r.created_at), today), 1);
  });

  // 4c) Миграцгүй үед «шинэ үзсэн хүн» нь ЦОРЫН ГАНЦ хэмжүүр тул
  //     views/likes-д хуулж тавина (UI ижил газар харна).
  if (mode !== 'daily') {
    [...byId.values()].forEach((it) => {
      it.views = { ...it.newViewers };
      it.likes = { ...it.newLikes };
    });
    totals.views = emptyWindows();
    totals.likes = emptyWindows();
    [...byId.values()].forEach((it) => {
      WINDOW_KEYS.forEach((d) => {
        totals.views[`d${d}`] += it.views[`d${d}`];
        totals.likes[`d${d}`] += it.likes[`d${d}`];
      });
    });
  }

  // ---------- 5. Өдөр тутмын цувааг БҮТЭН болгох (дутуу өдөр = 0) ----------
  const daily = [];
  for (let i = 0; i < SERIES_DAYS; i += 1) {
    const day = shiftDay(from, i);
    daily.push(dailyMap.get(day) || { day, views: 0, likes: 0 });
  }

  // ---------- 6. Эрэмбэ: хандлага ихтэй нь эхэнд ----------
  const items = [...byId.values()].sort(
    (a, b) => b.views.d30 - a.views.d30 || b.views.d7 - a.views.d7 || b.uniqueViews - a.uniqueViews
  );

  return {
    mode,
    generatedAt: new Date().toISOString(),
    seriesDays: SERIES_DAYS,
    totals,
    daily,
    listings: items,
  };
}


