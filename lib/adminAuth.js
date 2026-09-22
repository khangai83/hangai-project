// ============================================================
// adminAuth.js — Админ эрхийн СЕРВЕР талын логик
//
// ЭРХИЙН ХАДГАЛАЛТ: `app_metadata.is_admin`
//   • ЗААВАЛ `app_metadata` (user_metadata БИШ!) — учир нь user_metadata-г
//     хэрэглэгч өөрөө `auth.updateUser({ data })`-ээр сольж чаддаг тул
//     өөрийгөө admin болгочихно. Харин `app_metadata`-г ЗӨВХӨН service_role
//     (сервер) бичиж чадна → эрх мэдэлд аюулгүй.
//   • Шинэ хүснэгт/migration шаардахгүй.
//
// ⚠️ ЗӨВХӨН СЕРВЕР ТАЛД (service_role).
// ============================================================
const { getAdminClient } = require('./authServer');

/** Authorization header-ээс Bearer token салгах */
function bearerToken(req) {
  const h = (req && req.headers && req.headers.get && req.headers.get('authorization')) || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

/** Access token-оор хэрэглэгчийг шалгах (Supabase-ийн /auth/v1/user) */
async function getUserFromToken(token) {
  if (!token) return null;
  try {
    const admin = getAdminClient();
    const { data, error } = await admin.auth.getUser(token);
    if (error) return null;
    return (data && data.user) || null;
  } catch (e) {
    return null;
  }
}

/** Хэрэглэгч админ эсэх (`app_metadata.is_admin`) */
function isUserAdmin(user) {
  return !!(user && user.app_metadata && user.app_metadata.is_admin === true);
}

/**
 * API route-д зориулсан хаалга: токеныг шалгаж, админ эсэхийг батална.
 * @returns {{user: object}|{error: string, status: number}}
 */
async function requireAdmin(req) {
  const token = bearerToken(req);
  if (!token) return { error: 'Нэвтрэх шаардлагатай (Bearer token байхгүй).', status: 401 };

  const user = await getUserFromToken(token);
  if (!user) return { error: 'Сесс хүчингүй байна. Дахин нэвтэрнэ үү.', status: 401 };
  if (!isUserAdmin(user)) return { error: 'Танд админ эрх байхгүй.', status: 403 };

  return { user };
}

/** Админ эрхийг олгох/авах (`app_metadata` хэвээр үлдээж зөвхөн is_admin-ыг солино) */
async function setUserAdmin(userId, isAdmin) {
  const admin = getAdminClient();
  const { data: found, error: getErr } = await admin.auth.admin.getUserById(userId);
  if (getErr) throw new Error(`Хэрэглэгч олдсонгүй: ${getErr.message}`);

  const currentMeta = (found && found.user && found.user.app_metadata) || {};
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...currentMeta, is_admin: !!isAdmin },
  });
  if (error) throw new Error(`Эрх солиход алдаа: ${error.message}`);
  return data.user;
}

/** Бүх хэрэглэгчийг хуудаслан татах (Admin API) */
async function listAllUsers(maxPages = 10) {
  const admin = getAdminClient();
  const perPage = 1000;
  const out = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Хэрэглэгч татахад алдаа: ${error.message}`);
    const users = (data && data.users) || [];
    out.push(...users);
    if (users.length < perPage) break;
  }
  return out;
}

/** Хэрэглэгч тус бүрийн зарын тоо: { [userId]: count } (service_role REST) */
async function countListingsByUser() {
  const admin = getAdminClient();
  const { data, error } = await admin.from('listings').select('user_id').limit(10000);
  if (error) throw new Error(`Зарын тоо татахад алдаа: ${error.message}`);
  const counts = {};
  (data || []).forEach((row) => {
    if (!row.user_id) return;
    counts[row.user_id] = (counts[row.user_id] || 0) + 1;
  });
  return counts;
}

/**
 * Админы хяналтын самбарт хэрэгтэй нэгдсэн мэдээлэл:
 * хэрэглэгч бүрийн нэр/утас/бүртгэгдсэн огноо/зарын тоо/админ эсэх + нэгдсэн статистик
 */
async function getAdminUsersSummary() {
  const [users, counts] = await Promise.all([listAllUsers(), countListingsByUser()]);

  const rows = users
    .map((u) => ({
      id: u.id,
      // Утас: phone талбар эсвэл metadata.phone эсвэл дотоод имэйлээс
      phone: u.phone || (u.user_metadata && u.user_metadata.phone) || null,
      email: u.email || null,
      name: (u.user_metadata && u.user_metadata.name) || null,
      createdAt: u.created_at,
      lastSignInAt: u.last_sign_in_at || null,
      confirmedAt: u.phone_confirmed_at || u.email_confirmed_at || null,
      isAdmin: isUserAdmin(u),
      listingsCount: counts[u.id] || 0,
    }))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const stats = {
    users: rows.length,
    admins: rows.filter((r) => r.isAdmin).length,
    listings: Object.values(counts).reduce((s, n) => s + n, 0),
    withListings: rows.filter((r) => r.listingsCount > 0).length,
  };

  return { rows, stats };
}

/**
 * Бүх санал хүсэлт + статистик (`service_role` → RLS-ийг тойрно).
 * Зөвхөн /api/admin/feedback route-аас дуудагдана (`requireAdmin` дараа).
 */
async function getAdminFeedbackList(limit = 300) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    const msg = `${error.message || ''} ${error.code || ''}`;
    if (/does not exist|schema cache|PGRST205|42P01/i.test(msg)) {
      throw new Error('`feedback` хүснэгт олдсонгүй — supabase/migrations/0008_feedback.sql-ийг SQL Editor-т ажиллуулна уу.');
    }
    throw new Error(`Санал хүсэлт татахад алдаа: ${error.message}`);
  }

  const rows = data || [];
  const stats = {
    total: rows.length,
    new: rows.filter((r) => r.status === 'new').length,
    read: rows.filter((r) => r.status === 'read').length,
    resolved: rows.filter((r) => r.status === 'resolved').length,
  };
  return { rows, stats };
}

/** Саналын төлөв ба/эсвэл админы тэмдэглэлийг солих */
async function setFeedbackStatus(id, { status, adminNote } = {}) {
  const admin = getAdminClient();
  const patch = {};
  if (status) patch.status = status;
  if (typeof adminNote === 'string') patch.admin_note = adminNote;
  if (status === 'resolved') patch.handled_at = new Date().toISOString();
  if (!Object.keys(patch).length) throw new Error('Өөрчлөх утга байхгүй.');

  const { data, error } = await admin
    .from('feedback')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`Саналын төлөв солиход алдаа: ${error.message}`);
  return data;
}

// Зарын хайлтад буцаах баганууд (админ UI-д хэрэгтэй)
const ADMIN_LISTING_FIELDS =
  'id, user_id, category, property_type, price, price_type, rooms, area, city, district, khoroo, address_detail, phone, contact_name, images, created_at, views, likes';

/** Нийт зарын тоо */
async function countListings() {
  const admin = getAdminClient();
  const { count } = await admin.from('listings').select('id', { count: 'exact', head: true });
  return typeof count === 'number' ? count : null;
}

/**
 * АДМИН — Зарын хайлт (`service_role`).
 *
 * Хайлтын төрөл:
 *   • Бүтэн UUID       → `eq('id', …)`
 *   • UUID-ийн ЭХЛЭЛ   → ⚠️ `id` нь `uuid` багана тул `ilike` ажиллахгүй
 *                        (Postgres: `operator does not exist: uuid ~* unknown`,
 *                        HTTP 42883). Тиймээс сүүлийн 500 зарыг татаж JS дээр
 *                        `startsWith`-ээр шүүнэ.
 *   • Бусад текст      → утас / нэр / дүүрэг / хороо / хаяг / төрөл / хот (ilike)
 *
 * @param {{q?:string, limit?:number}} opts
 * @returns {Promise<{rows:Array, total:number|null, mode:string}>}
 */
async function searchAdminListings({ q = '', limit = 100 } = {}) {
  const admin = getAdminClient();
  const term = String(q || '').trim();
  const max = Math.min(300, Math.max(1, Number(limit) || 100));
  const total = await countListings();

  // Хайлтгүй → хамгийн сүүлийн зарууд
  if (!term) {
    const { data, error } = await admin
      .from('listings')
      .select(ADMIN_LISTING_FIELDS)
      .order('created_at', { ascending: false })
      .limit(max);
    if (error) throw new Error(`Заруудыг татахад алдаа: ${error.message}`);
    return { rows: data || [], total, mode: 'recent' };
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(term);
  const isUuidPrefix = /^[0-9a-f]{4,}$/i.test(term);

  // 1) Бүтэн UUID
  if (isUuid) {
    const { data, error } = await admin.from('listings').select(ADMIN_LISTING_FIELDS).eq('id', term);
    if (error) throw new Error(`Зарыг ID-аар хайхад алдаа: ${error.message}`);
    return { rows: data || [], total, mode: 'id' };
  }

  // 2) UUID-ийн эхлэл (JavaScript дээр шүүнэ)
  if (isUuidPrefix) {
    const { data, error } = await admin
      .from('listings')
      .select(ADMIN_LISTING_FIELDS)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) throw new Error(`Заруудыг татахад алдаа: ${error.message}`);
    const lower = term.toLowerCase();
    const rows = (data || []).filter((r) => String(r.id).toLowerCase().startsWith(lower)).slice(0, max);
    return { rows, total, mode: 'id-prefix', scanned: (data || []).length };
  }

  // 3) Текст хайлт
  const kw = `%${term}%`;
  const { data, error } = await admin
    .from('listings')
    .select(ADMIN_LISTING_FIELDS)
    .or(
      [
        `phone.ilike.${kw}`,
        `contact_name.ilike.${kw}`,
        `property_type.ilike.${kw}`,
        `district.ilike.${kw}`,
        `khoroo.ilike.${kw}`,
        `city.ilike.${kw}`,
        `address_detail.ilike.${kw}`,
      ].join(',')
    )
    .order('created_at', { ascending: false })
    .limit(max);
  if (error) throw new Error(`Зарын хайлтад алдаа: ${error.message}`);
  return { rows: data || [], total, mode: 'text' };
}

/** АДМИН — ЯМАР Ч зарыг устгах (зургуудыг Storage-оос ч цэвэрлэнэ) */
async function deleteAdminListing(id) {
  const admin = getAdminClient();
  if (!id) throw new Error('Зарын id дутуу.');

  const { data: row, error: getErr } = await admin
    .from('listings')
    .select('id, user_id, images, property_type')
    .eq('id', id)
    .maybeSingle();
  if (getErr) throw new Error(`Зар уншихад алдаа: ${getErr.message}`);
  if (!row) throw new Error('Ийм ID-тай зар олдсонгүй (аль хэдийн устсан байж болно).');

  // 1) Storage дахь зургуудыг устгах (DB-д зөвхөн URL хадгалагддаг)
  const bucket = 'listing-images';
  const paths = [];
  for (const img of row.images || []) {
    if (img && img.includes(`/storage/v1/object/public/${bucket}/`)) {
      paths.push(img.split(`${bucket}/`)[1]);
    }
  }
  if (paths.length) {
    const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
    if (rmErr) console.warn('[admin/listings] storage устгалт:', rmErr.message);
  }

  // 2) Мөрийг устгах (RLS-ийг service_role тойрно)
  const { error: delErr } = await admin.from('listings').delete().eq('id', id);
  if (delErr) throw new Error(`Зарыг устгахад алдаа: ${delErr.message}`);

  return { id, userId: row.user_id, imagesRemoved: paths.length };
}

/** Санал хүсэлтэд холбогдсон заруудыг нэг query-ээр авах (админ UI) */
async function getListingsByIds(ids = []) {
  const clean = (ids || []).filter(Boolean);
  if (!clean.length) return {};
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('listings')
    .select('id, property_type, price, city, district, category, phone, contact_name, created_at')
    .in('id', clean);
  if (error) return {};
  const map = {};
  (data || []).forEach((r) => { map[r.id] = r; });
  return map;
}

module.exports = {
  bearerToken,
  getUserFromToken,
  isUserAdmin,
  requireAdmin,
  setUserAdmin,
  listAllUsers,
  countListingsByUser,
  getAdminUsersSummary,
  getAdminFeedbackList,
  setFeedbackStatus,
  searchAdminListings,
  deleteAdminListing,
  getListingsByIds,
};
