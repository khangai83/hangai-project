// ============================================================
// Зарын мэдээллийн сангийн функцууд (Supabase client + RLS)
// Эдгээр нь клиент компонентуудаас дуудагдана.
// ============================================================
import { getSupabase, IMAGE_BUCKET } from './supabaseClient';
import { normalizeError } from './errors';
import { PROPERTY_TYPES } from './locationData';

function needClient() {
  const sb = getSupabase();
  if (!sb) {
    throw new Error('Supabase тохиргоо олдсонгүй. .env.local файл үүсгэнэ үү.');
  }
  return sb;
}

// 0003_listing_details.sql-ээр нэмэгдэх баганууд (migration эсэхийг таних)
const DETAIL_COLUMNS = ['build_year', 'floor', 'total_floors', 'balconies', 'has_garage'];

/** PostgREST-ийн "schema cache-д багана алга" төрлийн алдаа эсэх */
function isMissingDetailColumnError(error) {
  const msg = `${error?.message || ''} ${error?.details || ''}`;
  return DETAIL_COLUMNS.some((col) => msg.includes(col)) && /column|schema cache/i.test(msg);
}

function normalizeSearch(q) {
  return String(q || '').trim();
}

/**
 * Заруудыг шүүлттэйгээр татах.
 * filters: { category, search, propertyType, rooms, city, district, khoroo,
 *            minPrice, maxPrice, minArea, maxArea }
 */
export async function fetchListings(filters = {}) {
  const sb = needClient();

  const query = sb
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);

  if (filters.category && filters.category !== 'all') {
    query.eq('category', filters.category);
  }

  const search = normalizeSearch(filters.search);
  if (search) {
    const kw = `%${search}%`;
    query.or(
      `property_type.ilike.${kw},district.ilike.${kw},city.ilike.${kw},khoroo.ilike.${kw},address_detail.ilike.${kw},contact_name.ilike.${kw}`
    );
  }

  if (filters.propertyType) query.eq('property_type', filters.propertyType);
  if (filters.city) query.eq('city', filters.city);
  if (filters.district) query.eq('district', filters.district);
  if (filters.khoroo) query.eq('khoroo', filters.khoroo);

  if (filters.rooms) {
    const rooms = Number(filters.rooms);
    if (rooms >= 5) query.gte('rooms', 5);
    else query.eq('rooms', rooms);
  }

  // ⚠️ toNumber() нь «75,5» хэлбэрийн (монгол) бутархайг ч зөв хөрвүүлнэ
  if (filters.minPrice) query.gte('price', Math.trunc(toNumber(filters.minPrice)));
  if (filters.maxPrice) query.lte('price', Math.trunc(toNumber(filters.maxPrice)));
  if (filters.minArea) query.gte('area', toNumber(filters.minArea));
  if (filters.maxArea) query.lte('area', toNumber(filters.maxArea));

  const { data, error } = await query;
  if (error) throw normalizeError(error);
  return data || [];
}

/**
 * Төрөл тус бүрийн зарын тоог авах (нүүр хуудсан дээрх төрлийн навигацид).
 * PostgREST нь GROUP BY дэмждэггүй тул төрөл тус бүрээр тусдаа count query хийнэ
 * (зэрэгцээ, `head: true` учир хөнгөн).
 *
 * @param {string} category 'all' | 'sell' | 'rent'
 * @returns {Promise<Object<string, number>>} { 'Орон сууц': 12, ... } — алдаа гарвал тухайн төрөл орхигдоно
 */
export async function fetchPropertyTypeCounts(category = 'all') {
  const sb = needClient();

  const pairs = await Promise.all(
    PROPERTY_TYPES.map(async (type) => {
      let q = sb
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('property_type', type);
      if (category && category !== 'all') q = q.eq('category', category);

      const { count, error } = await q;
      if (error) {
        console.warn(`⚠️  «${type}» төрлийн тоог авахад алдаа:`, error.message || error);
        return [type, null];
      }
      return [type, count ?? 0];
    })
  );

  const out = {};
  for (const [type, count] of pairs) {
    if (typeof count === 'number') out[type] = count;
  }
  return out;
}

export async function fetchListingById(id) {
  const sb = needClient();
  const { data, error } = await sb
    .from('listings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw normalizeError(error);
  return data;
}

/**
 * Олон id-аар заруудыг татах (жишээ: «таалагдсан зарууд»).
 * @param {string[]} ids
 */
export async function fetchListingsByIds(ids) {
  const sb = needClient();
  const list = (ids || []).filter(Boolean);
  if (!list.length) return [];
  const { data, error } = await sb.from('listings').select('*').in('id', list);
  if (error) throw normalizeError(error);
  const byId = new Map((data || []).map((l) => [l.id, l]));
  // Оролтын дарааллаар (хамгийн сүүлд нэмсэн нь эхэнд) буцаана
  return list.map((id) => byId.get(id)).filter(Boolean);
}

/** Нэвтэрсэн хэрэглэгчийн зарууд */
export async function fetchMyListings(userId) {
  const sb = needClient();
  if (!userId) return [];
  const { data, error } = await sb
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw normalizeError(error);
  return data || [];
}

/** Дэлгэрэнгүй мэдээллийн (0003) баганын нэрс */
const DETAIL_ROW_KEYS = ['build_year', 'floor', 'total_floors', 'balconies', 'has_garage'];

/** '75,5' | '75.5' | '75' → 75.5 ; буруу/хоосон бол 0.
 *  Монгол хэрэглэгчид аравтын бутархайг «,»-ээр бичдэг тул хөрвүүлнэ. */
function toNumber(value) {
  const n = Number(String(value == null ? '' : value).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Форм-ын payload → DB мөр (create болон update хоёулаа ашиглана) */
function listingPayloadToRow(payload) {
  return {
    category: payload.category,
    property_type: payload.propertyType,
    rooms: Math.trunc(toNumber(payload.rooms)),
    area: toNumber(payload.area), // real — бутархай зөвшөөрнө (75.5 м²)
    city: payload.city,
    district: payload.district || null,
    khoroo: payload.khoroo || null,
    address_detail: payload.addressDetail || null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    price: Math.trunc(toNumber(payload.price)),
    price_type: payload.priceType || 'total',
    description: payload.description || null,
    phone: payload.phone || null,
    contact_name: payload.contactName || null,
    images: payload.images || [],
    // ---- Нэмэлт талбарууд (0003_listing_details.sql) ----
    build_year: toIntOrNull(payload.buildYear), // Ашиглалтанд орсон он
    floor: toIntOrNull(payload.floor), // Тухайн байр хэдэн давхарт
    total_floors: toIntOrNull(payload.totalFloors), // Барилгын нийт давхар
    balconies: toIntOrNull(payload.balconies), // Тагтны тоо (1-4)
    has_garage: toBoolOrNull(payload.hasGarage), // Гараж байгаа эсэх
  };
}

/** Зар нэмэх */
export async function createListing(userId, payload) {
  const sb = needClient();
  if (!userId) throw new Error('Эхлээд нэвтрэх шаардлагатай');

  const row = listingPayloadToRow(payload);
  const baseRow = { user_id: userId };
  const detailRow = {};
  Object.entries(row).forEach(([k, v]) => {
    if (DETAIL_ROW_KEYS.includes(k)) detailRow[k] = v;
    else baseRow[k] = v;
  });

  const { data, error } = await sb
    .from('listings')
    .insert({ ...baseRow, ...detailRow })
    .select()
    .single();

  if (error) {
    // 0003 migration ороогүй бол PostgREST шинэ баганыг schema cache-д олохгүй.
    // Ийм үед суурь талбаруудаар л оруулж, хэрэглэгчид юу хийхийг хэлнэ.
    if (isMissingDetailColumnError(error)) {
      console.warn(
        '⚠️  listings хүснэгтэд нэмэлт багана байхгүй байна ' +
        '(build_year/floor/total_floors/balconies/has_garage). ' +
        'supabase/migrations/0003_listing_details.sql-ийг Supabase SQL Editor-т ажиллуулна уу. ' +
        'Одоогоор нэмэлт мэдээлэл хадгалагдсангүй.'
      );
      const retry = await sb.from('listings').insert(baseRow).select().single();
      if (retry.error) throw normalizeError(retry.error);
      return retry.data;
    }
    throw normalizeError(error);
  }
  return data;
}

/**
 * Зар засах — 2 аргаар:
 *
 *  1) **UPDATE** (зөв арга) — `listings_update` policy байвал ажиллана.
 *  2) **DELETE + INSERT** (fallback) — хэрэв UPDATE policy байхгүй бол RLS нь
 *     UPDATE-ыг ЧИМЭЭГҮЙГЭЭР блоклоно (0 мөр, алдаагүй). 0001_schema.sql-д
 *     `listings_delete` ба `listings_insert` policy хоёулаа байдаг тул бид
 *     `id` + `created_at`-ыг ХАДГАЛАН устгаад дахин оруулж болно — гадны
 *     холбоос (favorites, линк) хэвээр ажиллана.
 *
 * ⚠️ Fallback нь SQL ажиллуулах шаардлагагүй, гэхдээ ХОЁР хүсэлт хийнэ.
 *    `0005_listings_update_policy.sql`-ийг ажиллуулбал (1) зам илүү найдвартай.
 */
export async function updateListing(userId, listingId, payload) {
  const sb = needClient();
  if (!userId) throw new Error('Эхлээд нэвтрэх шаардлагатай');
  if (!listingId) throw new Error('Зарын id дутуу');

  const row = listingPayloadToRow(payload);

  // ---------- 1) Шууд UPDATE ----------
  const direct = await sb
    .from('listings')
    .update(row)
    .eq('id', listingId)
    .eq('user_id', userId)
    .select()
    .single();

  if (!direct.error) return direct.data;

  // Нэмэлт багана (0003) байхгүй бол суурь талбаруудаар дахин оролдоно
  if (isMissingDetailColumnError(direct.error)) {
    const base = { ...row };
    DETAIL_ROW_KEYS.forEach((k) => delete base[k]);
    const retry = await sb
      .from('listings')
      .update(base)
      .eq('id', listingId)
      .eq('user_id', userId)
      .select()
      .single();
    if (!retry.error) return retry.data;
    if (!isNoRowsUpdated(retry.error)) throw updateError(retry.error);
  } else if (!isNoRowsUpdated(direct.error)) {
    throw updateError(direct.error);
  }

  // ---------- 2) Fallback: DELETE + INSERT (id, created_at хадгална) ----------
  const { data: existing, error: readErr } = await sb
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle();
  if (readErr) throw normalizeError(readErr);
  if (!existing) throw new Error('Зар олдсонгүй. Дахин ачаална уу.');
  if (existing.user_id !== userId) throw new Error('Энэ зар таных биш — засах боломжгүй.');

  const { error: delErr } = await sb.from('listings').delete().eq('id', listingId).eq('user_id', userId);
  if (delErr) throw normalizeError(delErr);

  const { data: inserted, error: insErr } = await sb
    .from('listings')
    .insert({
      ...row,
      id: listingId, // ⚠️ ижил id — хуучин холбоос хэвээр ажиллана
      user_id: userId,
      created_at: existing.created_at, // үүссэн огноо хадгална
    })
    .select()
    .single();

  if (insErr) {
    throw new Error(
      `Зар засахад алдаа гарлаа (хуучин зар устгагдсан): ${insErr.message || ''}. ` +
        'Дахин оруулж үзнэ үү. Илүү найдвартай болгохын тулд ' +
        'supabase/migrations/0005_listings_update_policy.sql-ийг SQL Editor-т ажиллуулна уу.'
    );
  }
  return inserted;
}

/** UPDATE нь 0 мөр сольсон эсэх (RLS policy байхгүй үед) */
function isNoRowsUpdated(error) {
  const msg = `${(error && error.message) || ''} ${(error && error.details) || ''} ${(error && error.code) || ''}`;
  return /PGRST116|multiple \(or no\) rows|no rows/i.test(msg);
}

/** Update policy байхгүй үед (0 мөр) ойлгомжтой мессеж өгнө */
function updateError(error) {
  const msg = `${error?.message || ''} ${error?.details || ''} ${error?.code || ''}`;
  if (/PGRST116|no rows|0 rows|multiple \(or no\) rows/i.test(msg)) {
    return new Error(
      'Зарыг засах боломжгүй байна. Supabase дээр `listings` хүснэгтийн UPDATE policy ' +
        'байхгүй (эсвэл энэ зар таных биш). ' +
        'supabase/migrations/0005_listings_update_policy.sql-ийг SQL Editor-т ажиллуулна уу.'
    );
  }
  return normalizeError(error);
}

/** Тоон утгыг бүхэл тоо болгох, хоосон/0/буруу бол null */
function toIntOrNull(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

/** 'yes'/'no'/true/false → boolean, бусад → null */
function toBoolOrNull(value) {
  if (value === true || value === 'yes' || value === 'true') return true;
  if (value === false || value === 'no' || value === 'false') return false;
  return null;
}

/** Зар устгах (өөрийн зар л устгана — RLS) */
export async function deleteListing(userId, listing) {
  const sb = needClient();
  if (!userId) throw new Error('Эхлээд нэвтрэх шаардлагатай');

  // Storage дээрх зургуудыг устгах
  const publicPaths = [];
  for (const img of listing.images || []) {
    const m = img && img.includes(`/storage/v1/object/public/${IMAGE_BUCKET}/`);
    if (m) {
      publicPaths.push(img.split(`${IMAGE_BUCKET}/`)[1]);
    }
  }
  if (publicPaths.length) {
    await sb.storage.from(IMAGE_BUCKET).remove(publicPaths);
  }

  const { error } = await sb
    .from('listings')
    .delete()
    .eq('id', listing.id)
    .eq('user_id', userId);
  if (error) throw normalizeError(error);
}

/**
 * Зураг (File) — Supabase Storage руу upload хийн, public URL буцаана.
 */
export async function uploadImages(userId, files) {
  const sb = needClient();
  if (!userId) throw new Error('Эхлээд нэвтрэх шаардлагатай');
  if (!files || !files.length) return [];

  const urls = [];
  for (const file of files) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${userId}/${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const { error } = await sb.storage.from(IMAGE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false,
    });
    if (error) throw normalizeError(error);
    const { data } = sb.storage.from(IMAGE_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

/** Профайл (нэр) унших/үүсгэх */
export async function upsertProfile(userId, name) {
  const sb = needClient();
  const { data, error } = await sb
    .from('profiles')
    .upsert({ id: userId, name: name || null }, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw normalizeError(error);
  return data;
}

export async function fetchProfile(userId) {
  const sb = needClient();
  if (!userId) return null;
  const { data, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) return null;
  return data;
}
