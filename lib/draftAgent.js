// ============================================================
// draftAgent.js — Facebook агентын server-side ingestion (CommonJS)
// Зөвхөн node скрипт / сервер талд ажиллана (SUPABASE_SERVICE_ROLE_KEY).
// RLS-ыг тойрч listing_drafts-руу draft бичнэ. Зарыг хүн queue-д
// баталгаажуулсны дараа л listings-руу нийтлэнэ (клиент тал).
// ============================================================
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { parseFacebookPost } = require('./fbParser');

// ---- Багахан .env.local parser (dotenv-гүй) ----
function loadEnvLocal() {
  try {
    const file = path.join(__dirname, '..', '.env.local');
    const content = fs.readFileSync(file, 'utf8');
    content.split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    });
  } catch (e) {
    /* .env.local байхгүй — дараа нь тайлбарлана */
  }
}
loadEnvLocal();

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes('TANII_PROJECT_REF') || key.includes('service_role')) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY-ээ .env.local-д бөглөнө үү.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * PostgREST/сүлжээний алдааг уншиж болохуйц текст болгох.
 * (postgrest-js нь `{ message, details, hint, code }` гэсэн энгийн объект
 *  throw хийдэг — name/stack байхгүй учраас лог дээр ойлгомжгүй харагддаг.)
 */
function errorReason(error) {
  if (!error) return 'Тодорхойгүй алдаа';
  const message = error.message || String(error);
  const text = `${message} ${error.details || ''}`;
  if (/failed to fetch|fetch failed|err_name_not_resolved|enotfound|econnrefused/i.test(text)) {
    return `Supabase-д холбогдож чадсангүй: ${message} (NEXT_PUBLIC_SUPABASE_URL-аа шалгана уу)`;
  }
  return [message, error.details, error.hint, error.code].filter(Boolean).join(' | ');
}

function listToArray(v) {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

/**
 * FB post-ыг queue-д draft болгон оруулна.
 * post { source, group, url, postedBy, postedAt, text, images[] }
 * - url байгаа бол түүгээр давхардлыг шалгана.
 * - Үгүй бол raw_text-ын hash-аар давхардлыг шалгана.
 */
async function ingestRawPost(post) {
  const sb = getAdminClient();
  const text = String(post.text || '').trim();
  if (!text) return { status: 'error', reason: 'Текст хоосон' };

  const url = String(post.url || '').trim() || null;
  const dupKey = url || 'raw:' + text;

  // Давхардлын шалгалт
  let query = sb.from('listing_drafts').select('id').limit(1);
  if (url) query = query.eq('post_url', url);
  else query = query.eq('raw_text', text);
  const { data: existing } = await query;
  if (existing && existing.length) {
    return { status: 'duplicate', draftId: existing[0].id, reason: 'Урьдчилан оруулсан зар' };
  }

  const parsed = parseFacebookPost(text);
  const images = listToArray(post.images);
  const row = {
    source: post.source || 'facebook',
    group_name: post.group || null,
    post_url: url,
    posted_by: post.postedBy || null,
    posted_at: post.postedAt || null,
    raw_text: text,
    raw_images: images,
    // parse-ийн үр дүнг мөрийн талбарт хадгалах (засварлагдана)
    title: parsed.title,
    category: parsed.category,
    property_type: parsed.property_type || null,
    rooms: parsed.rooms || null,
    area: parsed.area || null,
    price: parsed.price || null,
    price_type: parsed.price_type,
    city: parsed.city,
    district: parsed.district || null,
    khoroo: parsed.khoroo || null,
    address_detail: parsed.address_detail || null,
    description: text,
    phone: parsed.phone || null,
    contact_name: parsed.contact_name || null,
    images: images, // эхлээд FB зургуудаар дүүргэнэ
    parsed: parsed,
    status: 'pending',
  };

  const { data, error } = await sb.from('listing_drafts').insert(row).select().single();
  if (error) return { status: 'error', reason: errorReason(error) };
  return { status: 'inserted', draftId: data.id, parsed };
}

// Демо зориулалтын FB-тэй төстэй post-ууд (queue flow-г тестлэхэд)
function demoPosts() {
  return [
    {
      source: 'facebook', group: 'Улаанбаатар Байр Түрээс', url: 'https://facebook.com/groups/ubrent/posts/demo-1001',
      postedBy: 'Б. Түвшин', postedAt: new Date().toISOString(),
      text: '2 өрөө байр түрээслэнэ. Баянзүрх 26-р хороолол 12-р байр, 5 давхар, засвартай, тавилгатай. Сард 1.2 сая төгрөг. Холбоо барих: 9911 22 33 (Б.Түвшин)',
      images: [],
    },
    {
      source: 'facebook', group: 'Байрны зар', url: 'https://facebook.com/groups/property/posts/demo-1002',
      postedBy: 'Ganaa RealEstate', postedAt: new Date().toISOString(),
      text: '🔥 Худалдана: 3 өрөө, 68 м2, орон сууц. Хан-Уул 11-р хороо, Зайсан. Шинэ байр, 2 автомашины зогсоол. Үнэ 210 сая төгрөг. Утас: 9988 7766',
      images: [],
    },
    {
      source: 'facebook', group: 'Газар худалдаа', url: 'https://facebook.com/groups/land/posts/demo-1003',
      postedBy: 'D. Оюун', postedAt: new Date().toISOString(),
      text: 'Газар худалдана, 700 м2, Баянгол дүүрэг. Цэвэр 550 сая төгрөг тохирно. 99112233',
      images: [],
    },
    {
      source: 'facebook', group: 'Оффис, Худалдааны талбай', url: 'https://facebook.com/groups/commercial/posts/demo-1004',
      postedBy: 'Housing LLC', postedAt: new Date().toISOString(),
      text: 'Оффис түрээслүүлнэ. 45 м2, Сүхбаатар дүүрэг төв. Цонхтой, засвартай. Сарын түрээс 1.8 сая төгрөг. +976 9911 2233',
      images: [],
    },
    {
      source: 'facebook', group: 'Хашаа байшин зар', url: 'https://facebook.com/groups/house/posts/demo-1005',
      postedBy: 'Ц. Болд', postedAt: new Date().toISOString(),
      text: 'Хашаа байшин худалдана. Хан-Уул, 2 давхар, 5 өрөө, 220 м2. Тосгон шиг орчин. Үнэ 780 сая. Холбоо барих 8811 2233',
      images: [],
    },
  ];
}

module.exports = { loadEnvLocal, getAdminClient, ingestRawPost, demoPosts, listToArray, errorReason };
