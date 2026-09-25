// ============================================================
// Зарын мэдээллийн сангийн функцууд (Supabase client + RLS)
// Эдгээр нь клиент компонентуудаас дуудагдана.
// ============================================================
import { getSupabase, IMAGE_BUCKET } from './supabaseClient';
import { normalizeError } from './errors';
import { PROPERTY_TYPES, ROOM_OPTIONS } from './locationData';
import { normalizeYouTubeUrl } from './youtube.mjs';

function needClient() {
  const sb = getSupabase();
  if (!sb) {
    throw new Error('Supabase тохиргоо олдсонгүй. .env.local файл үүсгэнэ үү.');
  }
  return sb;
}

// 0003_listing_details.sql / 0011_listing_video.sql / 0012_listing_bathrooms.sql-ээр
// нэмэгдэх баганууд (migration ажилласан эсэхийг таних — байхгүй бол тэдгээрийг орхиод хадгална)
const DETAIL_COLUMNS = ['build_year', 'floor', 'total_floors', 'balconies', 'has_garage', 'video_url', 'bathrooms'];

/**
 * PostgREST/Postgres-ийн алдаанаас АЛЬ НЭМЭЛТ БАГАНА дутуу байгааг олно.
 *
 * ⚠️ ЯАГААД ЧУХАЛ ВЭ: migration-ууд (0003 / 0011 / 0012) үе шаттай орох боломжтой.
 *    Жишээ нь `bathrooms` (0012) дутуу ч `floor` / `build_year` (0003) БАЙГАА үед
 *    өмнөх код БҮХ нэмэлт баганыг хаядаг байв → давхар/он/гараж/видео линк
 *    хадгалагдахгүй болно. Одоо ЗӨВХӨН дутуу баганыг л хасна.
 *
 * @returns {string[]} дутуу баганын нэрс (алдаа нь баганын алдаа биш бол []).
 *   ⚠️ Баганын НЭРИЙГ таньж чадсангүй ч «column / schema cache» алдаа мөн бол
 *      бүх нэмэлт баганыг буцаана (хуучин зан төлөв — аюулгүй fallback).
 */
function missingDetailColumns(error) {
  const msg = `${error?.message || ''} ${error?.details || ''}`;
  if (!/column|schema cache/i.test(msg)) return [];

  const found = new Set();
  // PostgREST: Could not find the 'bathrooms' column of 'listings' in the schema cache
  for (const m of msg.matchAll(/'([A-Za-z0-9_]+)'\s+column/gi)) found.add(m[1].toLowerCase());
  // Postgres: column listings.bathrooms does not exist
  for (const m of msg.matchAll(/column\s+(?:[A-Za-z0-9_]+\.)?([A-Za-z0-9_]+)\s+does not exist/gi)) {
    found.add(m[1].toLowerCase());
  }

  const hits = DETAIL_COLUMNS.filter((col) => found.has(col.toLowerCase()));
  return hits.length ? hits : DETAIL_COLUMNS;
}

function normalizeSearch(q) {
  return String(q || '').trim();
}

/**
 * Заруудыг хайлттайгаар татах.
 * filters: { category, search, propertyType, rooms, city, district, khoroos,
 *            minPrice, maxPrice, minArea, maxArea }
 *
 * ⚠️ `district` нь НЭГ утга (string) — олон дүүрэг зэрэг сонгох нь ХАСАГДСАН.
 * ⚠️ `khoroos` нь МАССИВ — хэрэглэгч ОЛОН хороог зэрэг сонгоно. PostgREST-ийн
 *    `.in()` нь SQL-ийн `khoroo IN (…)` болно. Хуучин нэг утгатай `khoroo`
 *    дуудлагыг ч дэмжинэ (бусад газар/хуучин код эвдрэхгүйн тулд).
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
  // ⚠️ ОЛОН ХОРОО: `.in()` → `khoroo IN ('1-р хороо','2-р хороо',…)`.
  //    Массив хоосон бол хайлт хийхгүй (бүгд гарна).
  if (Array.isArray(filters.khoroos) && filters.khoroos.length) {
    query.in('khoroo', filters.khoroos);
  } else if (filters.khoroo) {
    query.eq('khoroo', filters.khoroo); // хуучин нэг утгатай дуудлага
  }

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
 * «Өрөө» тус бүрийн зарын тоог авах (нүүр хуудсан дээрх өрөөний мөрөнд).
 *
 * ⚠️ Зөвхөн `category` + `propertyType`-г харгалзана — бусад шүүлт (үнэ,
 *    байршил, хороо г.м.) НӨЛӨӨЛӨХГҮЙ. Яагаад: unegui.mn-ийн «1 өрөө 1,088»
 *    гэсэн тоо нь ангиллын НИЙТ тоо бөгөөд хэрэглэгч өөр шүүлт тавихад
 *    өөрчлөгдөхгүй. Ингэснээр «аль өрөө хэдэн зартай вэ» гэдгээ нэг харцаар
 *    мэдээд, хүссэн өрөөгөө шууд дарж сонгоно.
 *
 * ⚠️ `'5'` утга нь «+5 өрөө» (5 БА ТҮҮНЭЭС ДЭЭШ) — `fetchListings`-тэй ижил
 *    дүрмээр `rooms >= 5` болж хөрвөгдөнө.
 *
 * @param {{category?: string, propertyType?: string}} [scope]
 * @returns {Promise<Object<string, number>>} { '1': 1088, '2': 6509, … }
 */
export async function fetchRoomCounts({ category = 'all', propertyType = '' } = {}) {
  const sb = needClient();

  const pairs = await Promise.all(
    ROOM_OPTIONS.map(async ({ value }) => {
      let q = sb.from('listings').select('id', { count: 'exact', head: true });
      if (category && category !== 'all') q = q.eq('category', category);
      if (propertyType) q = q.eq('property_type', propertyType);
      q = Number(value) >= 5 ? q.gte('rooms', 5) : q.eq('rooms', Number(value));

      const { count, error } = await q;
      if (error) {
        console.warn(`⚠️  «${value} өрөө»-ний тоог авахад алдаа:`, error.message || error);
        return [value, null];
      }
      return [value, count ?? 0];
    })
  );

  const out = {};
  for (const [value, count] of pairs) {
    if (typeof count === 'number') out[value] = count;
  }
  return out;
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

/** uuid хэлбэр мөн эсэх — localStorage/URL-д гэмтсэн, буруу утга орсон бол
 *  Postgres `22P02 invalid input syntax for type uuid` алдаа шидэхээс сэргийлнэ.
 *  (lib/listingStats.js → isUuid-тай ижил дүрэм; энэ файл нь клиент талд
 *   ачаалагддаг тул серверийн модулийг импортлохгүй, энд давхардуулав.) */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

export async function fetchListingById(id) {
  // ⚠️ UUID биш id (жишээ нь /listings/abc) → query илгээхгүй, шууд null
  if (!isUuid(id)) return null;
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
  // ⚠️ Зөвхөн UUID хэлбэртэй id-г л илгээнэ (буруу утга → Postgres 22P02 → 500)
  const list = (ids || []).filter((id) => isUuid(id));
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

/**
 * Зар нийтлэгчийн (нэг хэрэглэгчийн) БҮХ зарууд — шинэ нь эхэнд.
 * `/sellers/[id]` хуудсанд хэрэглэгдэнэ (id = listings.user_id).
 *
 * @param {string} userId — Supabase auth хэрэглэгчийн id (uuid)
 * @returns {Promise<Array>} — uuid биш бол хоосон массив
 */
export async function fetchListingsBySeller(userId) {
  if (!isUuid(userId)) return [];
  const sb = needClient();
  const { data, error } = await sb
    .from('listings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(300);
  if (error) throw normalizeError(error);
  return data || [];
}

/**
 * Зар нийтлэгчийн зарын тоо — категориор ялгаж (Зарах / Түрээслэх).
 * Зарын дэлгэрэнгүй хуудасны «Зар нийтлэгч» карт дээр товчхон харуулна.
 *
 * @param {string} userId
 * @returns {Promise<{sell: number, rent: number, total: number}>}
 */
export async function fetchSellerCategoryCounts(userId) {
  const empty = { sell: 0, rent: 0, total: 0 };
  if (!isUuid(userId)) return empty;
  const sb = needClient();
  const { data, error } = await sb
    .from('listings')
    .select('category')
    .eq('user_id', userId)
    .limit(1000);
  if (error) throw normalizeError(error);
  const rows = data || [];
  return {
    sell: rows.filter((r) => r.category === 'sell').length,
    rent: rows.filter((r) => r.category === 'rent').length,
    total: rows.length,
  };
}

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
    // ---- YouTube видео линк (0011_listing_video.sql) ----
    // ⚠️ Зөвхөн КАНОНИК линк хадгална (youtu.be / shorts / embed / нэмэлт
    //    параметр бүгд https://www.youtube.com/watch?v=ID болно). Видео ФАЙЛ
    //    Storage-д ОРОХГҮЙ — зөвхөн линк (0 MB).
    video_url: normalizeYouTubeUrl(payload.videoUrl) || null,
    // ---- Угаалгын өрөөний тоо (0012_listing_bathrooms.sql) ----
    bathrooms: toIntOrNull(payload.bathrooms),
  };
}

/** Зар нэмэх */
export async function createListing(userId, payload) {
  const sb = needClient();
  if (!userId) throw new Error('Эхлээд нэвтрэх шаардлагатай');

  // ⚠️ Нэмэлт багана (0003/0011/0012) migration ороогүй бол PostgREST тэднийг
  //    schema cache-д олохгүй → доор ЗӨВХӨН ДУТУУ баганыг хасаж дахин оролдоно
  //    (бусад нэмэлт мэдээлэл хадгалагдсаар байна).
  const insertRow = { user_id: userId, ...listingPayloadToRow(payload) };

  const { data, error } = await sb
    .from('listings')
    .insert(insertRow)
    .select()
    .single();

  if (error) {
    const missing = missingDetailColumns(error);
    if (missing.length) {
      console.warn(
        `⚠️  listings хүснэгтэд дараах багана алга: ${missing.join(', ')}. ` +
        'Харгалзах migration-ийг (0003_listing_details.sql / 0011_listing_video.sql / ' +
        '0012_listing_bathrooms.sql) Supabase SQL Editor-т ажиллуулна уу. ' +
        'Одоогоор ЗӨВХӨН эдгээр талбар хадгалагдсангүй.'
      );
      const trimmed = { ...insertRow };
      missing.forEach((col) => delete trimmed[col]);
      const retry = await sb.from('listings').insert(trimmed).select().single();
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
  // ⚠️ Аль нэмэлт багана (0003/0011/0012) дутуу нь тогтоогдвол энд тэмдэглэнэ —
  //    доорх DELETE+INSERT fallback-д ЗӨВХӨН ТЭДГЭЭР баганыг хасна, эс бөгөөд
  //    хуучин зарыг устгачихаад шинэ мөр оруулж чадахгүй → ЗАР АЛГА БОЛНО.
  let missingColumns = [];

  // ---------- 1) Шууд UPDATE ----------
  const direct = await sb
    .from('listings')
    .update(row)
    .eq('id', listingId)
    .eq('user_id', userId)
    .select()
    .single();

  if (!direct.error) return direct.data;

  // Нэмэлт багана дутуу бол ЗӨВХӨН ТҮҮНИЙГ хасаад дахин оролдоно
  missingColumns = missingDetailColumns(direct.error);
  if (missingColumns.length) {
    const trimmed = { ...row };
    missingColumns.forEach((k) => delete trimmed[k]);
    const retry = await sb
      .from('listings')
      .update(trimmed)
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

  // ⚠️ Дутуу гэж тогтоогдсон баганыг ХАСАЖ оруулна — эс бөгөөд INSERT нурж,
  //    зар алга болно (дээрх тайлбар).
  const fallbackRow = { ...row };
  missingColumns.forEach((k) => delete fallbackRow[k]);

  const { data: inserted, error: insErr } = await sb
    .from('listings')
    .insert({
      ...fallbackRow,
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

// ============================================================
// САНАЛ ХҮСЭЛТ (feedback) — supabase/migrations/0008_feedback.sql
//   • Илгээх: зөвхөн нэвтэрсэн хэрэглэгч (RLS: auth.uid() = user_id)
//   • Харах: хэрэглэгч зөвхөн ӨӨРИЙН илгээсэн саналыг
//   • Админ: /api/admin/feedback (service_role) → /admin/feedback
// ============================================================

/** Саналын ангилал — UI-д (сонголт) ба шошгонд хэрэглэгдэнэ */
export const FEEDBACK_CATEGORIES = [
  { value: 'suggestion', label: '💡 Санал', hint: 'Сайжруулах санаа' },
  { value: 'complaint', label: '⚠️ Гомдол', hint: 'Ажиллагаа/хэрэглэгчийн гомдол' },
  { value: 'bug', label: '🐞 Алдаа', hint: 'Техникийн алдаа, эвдрэл' },
  { value: 'other', label: '💬 Бусад', hint: 'Бусад асуудал' },
];

/** Саналын төлөв — админ талд */
export const FEEDBACK_STATUSES = [
  { value: 'new', label: '🆕 Шинэ', className: 'bg-primary/10 text-primary' },
  { value: 'read', label: '👁 Харсан', className: 'bg-amber-100 text-amber-800' },
  { value: 'resolved', label: '✅ Шийдсэн', className: 'bg-secondary/10 text-secondary-dark' },
];

/** Хүснэгт байхгүй (0008 migration ажиллаагүй) үед ойлгомжтой мессеж */
function feedbackMissingTable(error) {
  const msg = `${(error && error.message) || ''} ${(error && error.details) || ''} ${(error && error.code) || ''}`;
  if (/feedback/i.test(msg) && /does not exist|relation|schema cache|PGRST205|42P01/i.test(msg)) {
    return new Error(
      'Санал хүсэлтийн хүснэгт олдсонгүй. Supabase → SQL Editor дээр ' +
        'supabase/migrations/0008_feedback.sql файлыг ажиллуулна уу.'
    );
  }
  return null;
}

/**
 * Санал хүсэлт илгээх (зөвхөн нэвтэрсэн хэрэглэгч).
 * @param {{userId: string, category?: string, subject?: string, message: string,
 *          contactName?: string, phone?: string, listingId?: string}} payload
 *
 * ⚠️ `listingId` — зарын дэлгэрэнгүй хуудаснаас гомдол илгээхэд хамт хадгална
 *    (0009_feedback_listing.sql). Тухайн багана байхгүй бол автоматаар
 *    түүнгүйгээр дахин илгээж, зарын ID-г гарчигт нь бичнэ → сайт эвдрэхгүй.
 */
export async function submitFeedback(payload) {
  const sb = needClient();
  const userId = payload && payload.userId;
  if (!userId) throw new Error('Санал хүсэлт илгээхийн тулд эхлээд нэвтэрнэ үү.');

  const message = String((payload && payload.message) || '').trim();
  if (message.length < 5) throw new Error('Саналаа 5-аас дээш тэмдэгтээр бичнэ үү.');
  if (message.length > 4000) throw new Error('Санал хэт урт байна (4000 тэмдэгт хүртэл).');

  const listingId = payload.listingId || null;
  if (listingId && !isUuid(listingId)) throw new Error('Зарын ID буруу байна.');

  const base = {
    user_id: userId,
    category: payload.category || 'suggestion',
    subject: (payload.subject || '').trim() || null,
    message,
    contact_name: payload.contactName || null,
    phone: payload.phone || null,
  };

  const insert = (row) => sb.from('feedback').insert(row).select().single();

  let { data, error } = await insert(listingId ? { ...base, listing_id: listingId } : base);

  // `listing_id` багана байхгүй (0009 migration ажиллаагүй) → зарын ID-г
  // гарчигт бичээд дахин илгээнэ (мэдээлэл алдагдахгүй).
  if (error && /listing_id/i.test(`${error.message || ''} ${error.details || ''}`)) {
    const titled = listingId
      ? { ...base, subject: `${base.subject || ''} [Зар #${String(listingId).slice(0, 8)}]`.trim() }
      : base;
    ({ data, error } = await insert(titled));
  }

  if (error) throw feedbackMissingTable(error) || normalizeError(error);
  return data;
}

/** Өөрийн илгээсэн саналууд (шинэ нь эхэнд) */
export async function fetchMyFeedback(userId) {
  if (!userId) return [];
  const sb = needClient();
  const { data, error } = await sb
    .from('feedback')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw feedbackMissingTable(error) || normalizeError(error);
  return data || [];
}

// ============================================================
// ҮНИЙН СТАТИСТИК — манай ӨӨРИЙН заруудаас бодно
//
// ⚠️ PostgREST нь GROUP BY дэмждэггүй тул мөрүүдийг татаж, JS дээр агрегацлана
//    (одоогийн хэмжээнд ямар ч асуудалгүй; 10,000+ зар болвол SQL view/RPC
//    болгож шилжүүлэх нь зүйтэй).
// ⚠️ Гадны (албан ёсны) статистикийг энд ХОЛИХГҮЙ — эх сурвалжтай нь тусад нь
//    (lib/marketData.js → REFERENCE_PRICE_PER_M2) харуулна.
// ============================================================

/** Орон сууцны «зарах» заруудаас ₮/м² статистик (дүүрэг ба хороогоор) */
export async function fetchPricePerM2Stats({ city = 'Улаанбаатар', propertyType = 'Орон сууц' } = {}) {
  const sb = needClient();

  let query = sb
    .from('listings')
    .select('price, area, district, khoroo, city, property_type, category, created_at')
    .eq('category', 'sell')
    .eq('property_type', propertyType)
    .gt('area', 0)
    .gt('price', 0)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (city) query = query.eq('city', city);

  const { data, error } = await query;
  if (error) throw normalizeError(error);

  const rows = (data || []).filter((r) => Number(r.area) > 0 && Number(r.price) > 0);
  const perM2 = rows.map((r) => Number(r.price) / Number(r.area));

  /** Нэг бүлгийн статистик */
  const aggregate = (list, extra = {}) => {
    if (!list.length) return null;
    const values = list.map((r) => Number(r.price) / Number(r.area)).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    const prices = list.map((r) => Number(r.price));
    return {
      ...extra,
      count: list.length,
      avgPerM2: values.reduce((s, v) => s + v, 0) / values.length,
      medianPerM2: median,
      minPerM2: values[0],
      maxPerM2: values[values.length - 1],
      avgPrice: prices.reduce((s, v) => s + v, 0) / prices.length,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  };

  const byDistrictMap = {};
  rows.forEach((r) => {
    const key = r.district || 'Тодорхойгүй';
    (byDistrictMap[key] = byDistrictMap[key] || []).push(r);
  });

  const byKhorooMap = {};
  rows.forEach((r) => {
    if (!r.district || !r.khoroo) return;
    const key = `${r.district}||${r.khoroo}`;
    (byKhorooMap[key] = byKhorooMap[key] || []).push(r);
  });

  const byDistrict = Object.entries(byDistrictMap)
    .map(([district, list]) => aggregate(list, { district }))
    .filter(Boolean)
    .sort((a, b) => b.medianPerM2 - a.medianPerM2);

  const byKhoroo = Object.entries(byKhorooMap)
    .map(([key, list]) => {
      const [district, khoroo] = key.split('||');
      return aggregate(list, { district, khoroo });
    })
    .filter(Boolean)
    .sort((a, b) => b.medianPerM2 - a.medianPerM2 || a.district.localeCompare(b.district));

  return {
    city,
    propertyType,
    total: rows.length,
    overall: aggregate(rows) || { count: 0 },
    byDistrict,
    byKhoroo,
    avgPerM2All: perM2.length ? perM2.reduce((s, v) => s + v, 0) / perM2.length : 0,
    generatedAt: new Date().toISOString(),
  };
}
