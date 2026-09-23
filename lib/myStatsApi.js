// ============================================================
// myStatsApi.js — Клиент талаас /api/my-listings/* руу хандах туслах
//
// `lib/adminApi.js`-тай ижил загвар: нэвтэрсэн хэрэглэгчийн access token-ыг
// `Authorization: Bearer …` header-т илгээнэ. Сервер нь токеноос хэрэглэгчийн
// id-г өөрөө олдог тул ЭНД ямар ч user id дамжуулахгүй (илгээвэл ч үл тоомсорлоно).
// ============================================================
import { getSupabase } from './supabaseClient';

/**
 * Өөрийн заруудын хандалтын статистик (1/3/7/30 хоног + 30 өдрийн цуваа).
 *
 * @returns {Promise<{data?:object, error?:string}>}
 *   data.mode === 'daily'  → d1/d3/d7/d30 нь НИЙТ ХАНДАЛТ
 *   data.mode === 'unique' → d1/d3/d7/d30 нь ШИНЭ үзсэн хүн/❤️
 *                            (0010 миграц ажиллаагүй үед)
 */
export async function fetchMyListingActivity() {
  const sb = getSupabase();
  if (!sb) return { error: 'Supabase тохиргоо алга.' };

  const { data: session } = await sb.auth.getSession();
  const token = session && session.session && session.session.access_token;
  if (!token) return { error: 'Эхлээд нэвтрэх шаардлагатай.' };

  let res;
  try {
    res = await fetch('/api/my-listings/stats', {
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    return { error: `Сүлжээний алдаа: ${(err && err.message) || err}` };
  }

  let body = {};
  try {
    body = await res.json();
  } catch (e) {
    body = {};
  }
  if (!res.ok || body.ok === false) {
    return { error: body.error || `Алдаа (HTTP ${res.status}).`, status: res.status };
  }
  return { data: body };
}
