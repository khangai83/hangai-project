// ============================================================
// GET /api/search/suggest?q=<үг>&limit=8 — 🔎 ХАЙЛТЫН САНАЛ (autocomplete)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (жишээ зурагтай): хайлтын хайрцагт бичихэд доор нь
//   «Цемент — 🧱 Барилгын материал» гэх мэт САНАЛУУД гарч, дарахад шууд
//   хайлт хийдэг болгох.
//
// Resp: { ok, q, suggestions: [{ kind:'type'|'listing', value, label, hint }] }
//   · kind='type'    — ХЭСЭГ/ДЭД ТӨРӨЛ (статик, `lib/locationData.js`)
//   · kind='listing' — зарын ГАРЧИГ (DB: `title` ilike, `lib/searchText.mjs`)
//
// ⚠️ ЭНЭ ENDPOINT нь ЧИМЭЭГҮЙ байх ЁСТОЙ — утас/сүлжээ/DB унасан ч хоосон
//    жагсаалт буцаана; хэрэглэгч бичээд Enter дарж ХЭВИЙН хайлт хийж чадна ✓
//    (санал нь туслах төдий — хайлтыг ХЭЗЭЭ Ч эвдэхгүй ✗).
// ⚠️ 2-оос доош тэмдэгттэй үгт санал ХИЙХГҮЙ (хэт олон үр дүн гарахаас).
// ============================================================
import { NextResponse } from 'next/server';
import { getSupabase } from '../../../../lib/supabaseClient';
import { buildSearchOr, normalizeSearch } from '../../../../lib/searchText.mjs';
import { mergeSuggestions, suggestTypes } from '../../../../lib/searchSuggest.mjs';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 10;

export async function GET(req) {
  const url = new URL(req.url);
  const q = normalizeSearch(url.searchParams.get('q') || '');
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(url.searchParams.get('limit')) || 8));

  // ⚠️ `[...q]` — код-цэгээр тоолно (Монгол кирилл 1 тэмдэгт ✓)
  if ([...q].length < 2) {
    return NextResponse.json({ ok: true, q, suggestions: [] });
  }

  // ① Статик санал (хэсэг/дэд төрөл) — DB-гүй ч ажиллана ✓
  const types = suggestTypes(q, { limit: 5 });

  // ② Динамик санал (зарын гарчиг) — DB байхгүй/алдаатай ч алгасна
  let listings = [];
  try {
    const sb = getSupabase();
    if (sb) {
      // ⚠️ Зөвхөн `title` талбар — хөнгөн query (`or=title.ilike.%…%`)
      const or = buildSearchOr(q, { fields: ['title'] });
      if (or) {
        const { data, error } = await sb
          .from('listings')
          .select('id,title,property_type,section,city,district')
          .or(or)
          .not('title', 'is', null)
          .order('created_at', { ascending: false })
          .limit(6);
        if (!error && Array.isArray(data)) listings = data;
      }
    }
  } catch (err) {
    console.warn('[search/suggest] санал авахад алдаа:', (err && err.message) || err);
  }

  const suggestions = mergeSuggestions(types, listings, limit);
  return NextResponse.json(
    { ok: true, q, suggestions },
    // 📦 Богино кэш — нэг үсэг бичих бүрд шинэ query явахаас сэргийлнэ ✓
    { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=30' } }
  );
}
