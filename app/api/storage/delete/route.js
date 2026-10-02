// ============================================================
// POST /api/storage/delete — R2 дээрх зургуудыг устгана
//
// Header: Authorization: Bearer <supabase access_token>    ← ЗААВАЛ
// Body:   { keys: ['listing-images/<uid>/<f>.jpg', …] }
// Resp:   { ok: true, removed: n, skipped: m }
//
// ⚠️ ЗӨВХӨН ӨӨРИЙН түлхүүр устгана (`isOwnedStorageKey`):
//    түлхүүрийн эхний фолдер нь тухайн хэрэглэгчийн id байх ёстой —
//    хуучин Storage RLS-ийн (= өөр хүний зургийг устгаж чадахгүй) ЯГ
//    ижил хамгаалалт ✓ Бусад түлхүүрийг ЧИМЭЭГҮЙ алгасаж `skipped`-д тоолно.
//
// ⚠️ ХУУЧИН Supabase Storage-ийн зургуудыг энэ route ХӨНДӨХГҮЙ —
//    тэдгээрийг client (`lib/queries.js` → `sb.storage…remove`) болон
//    админ (`lib/adminAuth.js`) өөрсдөө устгана. Шилжилтийн үед ХОЁУЛАА
//    ажиллана ✓
// ============================================================
import { NextResponse } from 'next/server';
import { getAdminClient } from '../../../../lib/authServer';
import { isOwnedStorageKey } from '../../../../lib/storageKeys.mjs';
import { deleteR2Keys, isR2Configured, r2SetupHint } from '../../../../lib/r2.mjs';

export const dynamic = 'force-dynamic';

/** Нэг хүсэлтэд устгах түлхүүрийн дээд хязгаар (нэг зард 10 зураг) */
const MAX_KEYS = 50;

async function requireUser(req) {
  const header = req.headers.get('authorization') || '';
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  try {
    const { data, error } = await getAdminClient().auth.getUser(token);
    if (error || !data || !data.user) return null;
    return data.user;
  } catch (e) {
    return null;
  }
}

export async function POST(req) {
  let body = {};
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'Хүсэлтийн бие буруу (JSON биш).' }, { status: 400 });
  }

  const user = await requireUser(req);
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'Нэвтрэх шаардлагатай (сесс хүчингүй эсвэл токен байхгүй).' },
      { status: 401 }
    );
  }

  const keys = (Array.isArray(body.keys) ? body.keys : []).map((k) => String(k || '').trim()).filter(Boolean);
  if (!keys.length) return NextResponse.json({ ok: false, error: 'Устгах түлхүүр байхгүй.' }, { status: 400 });
  if (keys.length > MAX_KEYS) {
    return NextResponse.json({ ok: false, error: `Хэт олон түлхүүр (${keys.length}). Хамгийн их: ${MAX_KEYS}.` }, { status: 400 });
  }
  if (!isR2Configured()) {
    return NextResponse.json({ ok: false, code: 'R2_NOT_CONFIGURED', error: r2SetupHint() }, { status: 503 });
  }

  const owned = keys.filter((k) => isOwnedStorageKey(k, user.id));
  const skipped = keys.length - owned.length;
  if (!owned.length) return NextResponse.json({ ok: true, removed: 0, skipped });

  try {
    const removed = await deleteR2Keys(owned);
    return NextResponse.json({ ok: true, removed, skipped });
  } catch (err) {
    console.error('[storage/delete]', err);
    return NextResponse.json(
      { ok: false, code: 'R2_DELETE_FAILED', error: `R2-ээс устгаж чадсангүй: ${err.message}` },
      { status: 502 }
    );
  }
}
