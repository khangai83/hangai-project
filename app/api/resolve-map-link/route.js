// ============================================================
// GET /api/resolve-map-link?url=<short maps link> — 🗺 БОГИНО Google Maps
//   линкийг СЕРВЕР тал дээр задалж СОЛБИЦОЛ буцаана.
//
// 🎯 ХЭРЭГЛЭГЧИЙН ГОМДОЛ (2026-10-07): «… google maps аас ийм short hayag
//    awch boldog yum bna shdee … eniig yaagaad shuud ashiglaj bolohgui gej»
//    ⇒ `maps.app.goo.gl/…` линк нь ХӨТӨЧ (browser) дээр солбицол өгдөггүй
//    (JS «Durable Deep Link» хуудас + CORS ✗). ХАРИН СЕРВЕР дээрх `fetch` нь
//    browser БИШ User-Agent-аар Google-ийн **302** буцаалтын `Location`-ийг
//    УНШИНА — тэр нь солбицолтой БҮРЭН линк:
//      `https://www.google.com/maps/search/47.906319,+106.904352?entry=tts&…`
//    ⇒ `parseGoogleMapsLink` тэр линкээс солбицлыг задална ✓
//
// Resp: { ok:true, lat, lng, resolved }  (амжилттай — солбицол олдов)
//       { ok:false }                     (задалж чадсангүй — алдаа ШИДЭХГҮЙ)
//
// ⚠️ SSRF ХАМГААЛАЛТ: зөвхөн `isShortMapsLink` (Google-ийн богино домэйн:
//    maps.app.goo.gl / goo.gl/maps / g.co/kgs) хүлээнэ — дурын URL руу
//    хүсэлт явуулахгүй ✓
// ⚠️ ЧИМЭЭГҮЙ БАЙХ ЁСТОЙ: сүлжээ/redirect/timeout унасан ч `{ ok:false }`
//    буцаана; UI нь БҮРЭН линк оруулахыг заана ✓ (search/suggest-ийн зарчим)
// 🔍 Хайх үг: resolve-map-link, isShortMapsLink, parseGoogleMapsLink
// ============================================================
import { NextResponse } from 'next/server';
import { isShortMapsLink, parseGoogleMapsLink } from '../../../lib/locationGeo.mjs';

export const dynamic = 'force-dynamic';

/** ⏱ Сүлжээний хязгаар (ms) — Google удаан хариулахад хэрэглэгчийг хүлээлгэхгүй */
const TIMEOUT_MS = 6000;
/** 🔁 Хамгийн олон дагах redirect (богино → богино → бүрэн) */
const MAX_HOPS = 5;
/**
 * ⚠️ Google нь BROWSER User-Agent-аар JS «Durable Deep Link» хуудас (200)
 *    буцаадаг тул солбицол авч чадахгүй — ЭНГИЙН (browser биш) UA хэрэглэснээр
 *    302 + `Location` (солбицолтой) гарна ✓
 */
const UA = 'ZarBot/1.0 (+https://zar.mn)';

/** Нэг хүсэлт явуулж 302-ын `Location`-ийг уншина (`redirect`-ыг дагахгүй) */
async function hop(url, signal) {
  const res = await fetch(url, {
    redirect: 'manual',
    signal,
    headers: { 'user-agent': UA, accept: 'text/html,*/*' },
  });
  const loc = res.headers.get('location') || '';
  // ⚠️ Ховор тохиолдолд `Location` нь харьцангуй (`/…`) байж болно
  return loc.startsWith('/') ? new URL(loc, url).toString() : loc;
}

export async function GET(req) {
  const raw = (new URL(req.url).searchParams.get('url') || '').trim();
  // ⚠️ SSRF: зөвхөн Google-ийн БОГИНО линкийн домэйныг хүлээнэ
  if (!isShortMapsLink(raw)) return NextResponse.json({ ok: false });

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    let current = raw;
    let resolved = '';
    // 🔁 «богино → богино → бүрэн» хүртэл (хамгийн ихдээ MAX_HOPS)
    for (let i = 0; i < MAX_HOPS; i += 1) {
      const loc = await hop(current, ac.signal);
      if (!loc) break; // 200 interstitial эсвэл `Location` алга
      resolved = loc;
      if (isShortMapsLink(loc)) { current = loc; continue; } // дахин богино — үргэлжлүүлнэ
      break; // БҮРЭН линк — доор задална
    }
    const c = parseGoogleMapsLink(resolved);
    if (c) return NextResponse.json({ ok: true, lat: c.lat, lng: c.lng, resolved });
    return NextResponse.json({ ok: false });
  } catch (err) {
    console.warn('[resolve-map-link] задалж чадсангүй:', (err && err.message) || err);
    return NextResponse.json({ ok: false });
  } finally {
    clearTimeout(timer);
  }
}
