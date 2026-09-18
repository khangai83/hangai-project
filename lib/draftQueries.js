// ============================================================
// draftQueries.js — Баталгаажуулалтын queue-ийн клиент талын функцууд
// (Supabase anon key + RLS: authenticated хэрэглэгч унших/засах боломжтой)
// Нийтлэх үед зарыг энэ хэрэглэгчийн нэр дээр бүртгэнэ (auth.uid() = user_id)
// ============================================================
import { getSupabase } from './supabaseClient';
import { createListing } from './queries';
import { normalizePhone } from './format';
import { normalizeError } from './errors';

function client() {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase тохиргоо олдсонгүй.');
  return sb;
}

/** Queue-г статусаар татах (default: pending) */
export async function fetchDraftQueue(status = 'pending') {
  const sb = client();
  let q = sb.from('listing_drafts').select('*');
  if (status && status !== 'all') q = q.eq('status', status);
  q = q.order('created_at', { ascending: false }).limit(200);
  const { data, error } = await q;
  if (error) throw normalizeError(error);
  return data || [];
}

/** Draft-ийн статус/талбаруудыг шинэчлэх */
export async function updateDraft(id, patch) {
  const sb = client();
  const { data, error } = await sb
    .from('listing_drafts')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw normalizeError(error);
  return data;
}

/** Зар татгалзах (rejected) */
export async function rejectDraft(userId, draftId, note) {
  return updateDraft(draftId, {
    status: 'rejected',
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
    notes: note || null,
  });
}

/**
 * Draft-ыг бодит зар болгон нийтлэх (listings-руу insert).
 * payload: { category, propertyType, rooms, area, city, district, khoroo,
 *            addressDetail, price, priceType, description, phone, contactName }
 * images: нийтлэх зургийн URL-ууд (эсвэл draft.images)
 */
export async function publishDraftAsListing(userId, draft, payload, images = draft.images || []) {
  const listing = await createListing(userId, {
    ...payload,
    images,
  });

  await updateDraft(draft.id, {
    status: 'published',
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
    images,
    description: payload.description ?? null,
  });

  return listing;
}

/** Draft snake_case талбаруудыг createListing payload руу хөрвүүлэх */
export function draftToPayload(draft, overrides = {}) {
  const d = { ...draft, ...overrides };
  return {
    category: d.category,
    propertyType: d.property_type,
    rooms: Number(d.rooms) || 0,
    area: Number(d.area) || 0,
    city: d.city,
    district: d.district || null,
    khoroo: d.khoroo || null,
    addressDetail: d.address_detail || null,
    price: Number(d.price) || 0,
    priceType: d.price_type || 'total',
    description: d.description || null,
    phone: normalizePhone(d.phone || '').replace(/^\+/, ''),
    contactName: d.contact_name || null,
    // ---- Орон сууцны нэмэлт мэдээлэл ----
    buildYear: d.build_year || '',
    floor: d.floor || '',
    totalFloors: d.total_floors || '',
    balconies: d.balconies || '',
    hasGarage: typeof d.has_garage === 'boolean' ? d.has_garage : '',
  };
}
