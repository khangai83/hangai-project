// ============================================================
// POST /api/agent/ingest — n8n (эсвэл бусад агент)-аас зар оруулах webhook
//
// Агент (n8n) FB-ээс цуглуулсан заруудыг энэ endpoint-руу илгээнэ.
// Апп нь parse хийж, давхардлыг шалгаад listing_drafts (queue)-руу оруулна.
// Хүн /admin/queue-д баталгаажуулсны дараа л listings-руу нийтлэнэ.
//
// Header:  x-agent-key: <AGENT_INGEST_KEY>
// Body:    { "posts": [ { url, group, postedBy, postedAt, text, images[] } ] }
// ============================================================
import { NextResponse } from 'next/server';
import draftAgent from '../../../../lib/draftAgent';

export const dynamic = 'force-dynamic';

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
}

export async function POST(req) {
  const expected = process.env.AGENT_INGEST_KEY;
  const provided = req.headers.get('x-agent-key');

  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'AGENT_INGEST_KEY тохируулаагүй байна (.env.local-д нэмнэ үү).' },
      { status: 500 }
    );
  }
  if (!provided || provided !== expected) return unauthorized();

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 });
  }

  const posts = Array.isArray(body) ? body : body.posts;
  if (!Array.isArray(posts) || posts.length === 0) {
    return NextResponse.json({ ok: false, error: 'posts хоосон байна.' }, { status: 400 });
  }

  const results = [];
  for (const post of posts) {
    results.push(await draftAgent.ingestRawPost(post));
  }

  const inserted = results.filter((r) => r.status === 'inserted').length;
  const duplicates = results.filter((r) => r.status === 'duplicate').length;
  const errors = results.filter((r) => r.status === 'error');

  return NextResponse.json({ ok: true, inserted, duplicates, results, errors });
}
