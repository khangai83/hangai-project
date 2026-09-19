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

module.exports = {
  bearerToken,
  getUserFromToken,
  isUserAdmin,
  requireAdmin,
  setUserAdmin,
  listAllUsers,
  countListingsByUser,
  getAdminUsersSummary,
};
