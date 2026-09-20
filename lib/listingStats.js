// ============================================================
// listingStats.js — «Үзсэн» / «Таалагдсан» тоолуур (СЕРВЕР ТАЛ)
//
// ⚠️⚠️ ЗӨВХӨН API route дотор import хийнэ! ⚠️⚠️
//    Энэ файл `service_role` түлхүүр ашигладаг (RLS-ийг тойрдог) тул client
//    component-д import хийвэл түлхүүр bundle-д алдагдана.
//
// Тоо нь `listings.views` / `listings.likes` баганад хадгалагдана
// (supabase/migrations/0006_listing_stats.sql).
//
// 🛡 Миграц ажиллуулаагүй ч ажиллана: багана/функц байхгүй бол `null` буцаана
//    (алдаа шидэхгүй) → UI нь зүгээр 0 харуулна. Сайт ЭВДРЭХГҮЙ.
// ============================================================
import { getAdminClient } from './authServer';

/**
 * Миграц хийгээгүй үеийн нөөц зам: уншиж → тооцоолж → бичих.
 * (Атомар биш — тиймээс зөвхөн RPC байхгүй үед л ашиглана.)
 */
async function bumpFallback(column, id, delta) {
  const admin = getAdminClient();
  const read = await admin.from('listings').select(column).eq('id', id).maybeSingle();
  if (read.error || !read.data) return null;

  const next = Math.max(0, Number(read.data[column] || 0) + delta);
  const write = await admin.from('listings').update({ [column]: next }).eq('id', id).select(column).maybeSingle();
  if (write.error || !write.data) return null;
  return Number(write.data[column]);
}

/** «Үзсэн» +1 → шинэ утга буцаана (боломжгүй бол null) */
export async function bumpViews(id) {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc('listing_bump_views', { p_id: id });
  if (!error) return typeof data === 'number' ? data : null;
  return bumpFallback('views', id, 1);
}

/** «Таалагдсан» +1 / −1 → шинэ утга буцаана (боломжгүй бол null) */
export async function bumpLikes(id, delta) {
  const admin = getAdminClient();
  const { data, error } = await admin.rpc('listing_bump_likes', { p_id: id, p_delta: delta });
  if (!error) return typeof data === 'number' ? data : null;
  return bumpFallback('likes', id, delta);
}

/** uuid хэлбэр мөн эсэх (буруу id-ээр query илгээхээс сэргийлнэ) */
export function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}
