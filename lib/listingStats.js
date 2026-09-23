// ============================================================
// listingStats.js — «Үзсэн» / «Таалагдсан» тоолуур (СЕРВЕР ТАЛ)
//
// ⚠️⚠️ ЗӨВХӨН API route дотор import хийнэ! ⚠️⚠️
//    Энэ файл `service_role` түлхүүр ашигладаг (RLS-ийг тойрдог) тул client
//    component-д import хийвэл түлхүүр bundle-д алдагдана.
//
// Тоо нь `listings.views` / `listings.likes` баганад хадгалагдаж, ХҮСНЭГТЭЭС
// автоматаар бодогдоно (supabase/migrations/0007_listing_likes_views.sql):
//
//   ❤️ listing_likes (listing_id, viewer_key)  ← нэг хүн нэг зард нэг л удаа
//   👁 listing_views (listing_id, viewer_key)  ← мөн адил
//   listings.likes / .views ← ТРИГГЕР count(*)-ээр шинэчилнэ
//
// 🛡 Миграц ажиллуулаагүй ч ажиллана: хүснэгт/багана байхгүй бол `null` буцаана
//    (алдаа шидэхгүй) → UI нь зүгээр 0 харуулна. Сайт ЭВДРЭХГҮЙ.
// ============================================================
import { getAdminClient } from './authServer';

/**
 * Хүсэлтийг хэн илгээснийг тодорхойлно.
 *   1) `Authorization: Bearer <supabase access_token>` байвал → 'u:<user_id>'
 *      (токеныг сервер талд БАТАЛЖ шалгана — клиент хуурах боломжгүй)
 *   2) эс бөгөөс зочин → 'd:<browser device id>'
 * @returns {Promise<{key: string, userId: string|null}>}
 */
export async function resolveViewer(req, body = {}) {
  const header = req.headers.get('authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (token) {
    try {
      const { data } = await getAdminClient().auth.getUser(token);
      if (data && data.user && data.user.id) {
        return { key: `u:${data.user.id}`, userId: data.user.id };
      }
    } catch (e) {
      /* токен хүчингүй/хугацаа дууссан → зочин гэж үзнэ */
    }
  }
  const device = String(body.device || '').trim().slice(0, 64);
  return { key: `d:${device || 'anon'}`, userId: null };
}

/** `listings.likes` / `listings.views` унших (багана байхгүй бол null) */
async function readCounter(id, column) {
  const admin = getAdminClient();
  const { data, error } = await admin.from('listings').select(column).eq('id', id).maybeSingle();
  if (error || !data) return null;
  return Number(data[column]) || 0;
}

/**
 * 👁 Үзсэн — хүснэгтэд нэг мөр нэмнэ (давхардвал юу ч болохгүй).
 * @returns {Promise<number|null>} шинэ «үзсэн» тоо (боломжгүй бол null)
 */
export async function registerView(id, viewer) {
  const admin = getAdminClient();
  const { error } = await admin.from('listing_views').upsert(
    { listing_id: id, viewer_key: viewer.key, user_id: viewer.userId },
    { onConflict: 'listing_id,viewer_key', ignoreDuplicates: true }
  );
  if (error) return null;
  return readCounter(id, 'views');
}

/**
 * ❤️ Таалагдсан — liked=true бол мөр нэмнэ, false бол устгана.
 * (Триггер тоолуурыг `count(*)`-ээр автоматаар шинэчилнэ.)
 * @returns {Promise<number|null>} шинэ тоо (боломжгүй бол null)
 */
export async function setLike(id, viewer, liked) {
  const admin = getAdminClient();
  if (liked) {
    const { error } = await admin.from('listing_likes').upsert(
      { listing_id: id, viewer_key: viewer.key, user_id: viewer.userId },
      { onConflict: 'listing_id,viewer_key', ignoreDuplicates: true }
    );
    if (error) return null;
  } else {
    const { error } = await admin
      .from('listing_likes')
      .delete()
      .eq('listing_id', id)
      .eq('viewer_key', viewer.key);
    if (error) return null;
  }
  return readCounter(id, 'likes');
}

/** uuid хэлбэр мөн эсэх (буруу id-ээр query илгээхээс сэргийлнэ) */
export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

/**
 * 📈 ӨДӨР ТУТМЫН ХАНДАЛТЫН бүртгэл (0010_listing_activity_daily.sql).
 *
 * ЯАГААД ТУСДАА ВЭ:
 *   `listing_views` нь хүн тус бүрд НЭГ л мөр хадгалдаг тул «энэ өдөр хэдэн
 *   хандалт байсан» гэдгийг мэдэх боломжгүй. Энэ функц нь (зар, өдөр) хос
 *   бүрд тоог ХУРИМТЛУУЛЖ, «Миний зарууд → 📈 Статистик» хуудсанд
 *   1/3/7/30 хоногийн хандлагыг гаргах боломж олгоно.
 *
 * ⚠️ АЛДАА ГАРВАЛ ЧИМЭЭГҮЙ БУЦААНА — миграц ажиллаагүй, эсвэл тоолуур
 *    нурсан ч зарыг харах/❤️ дарахад ХЭЗЭЭ Ч саад болохгүй.
 *
 * @param {string} id    — зарын uuid
 * @param {number} views — +1 (хуудас нээгдэх бүрд)
 * @param {number} likes — +1 (нэмэх) / -1 (хасах)
 */
export async function logActivity(id, views = 0, likes = 0) {
  if (!views && !likes) return null;
  try {
    const admin = getAdminClient();
    const { error } = await admin.rpc('bump_listing_activity', {
      p_id: id,
      p_views: Math.trunc(views),
      p_likes: Math.trunc(likes),
    });
    if (error) throw error;
    return true;
  } catch (err) {
    // 0010 миграц ажиллаагүй — статистик нь «шинэ үзсэн хүн» горимд шилжинэ
    console.warn('[listingStats] өдөр тутмын хандалт бүртгэгдсэнгүй:', (err && err.message) || err);
    return null;
  }
}

