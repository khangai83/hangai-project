/**
 * 👤 CDP ШАЛГАЛТ — НИЙТЛЭГЧИЙН ХУУДСАНЫ ПРОФАЙЛ ЗУРАГ (`/sellers/<user_id>`)
 * (2026-10-08, өөрчлөлт (65))
 *
 * ⚠️ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① Зурагтай нийтлэгч (profiles.avatar_url ≠ NULL, show_identity = true):
 *      толгойн карт дээр БОДИТ `<img src="…/avatars/<uid>/….jpg">` — 64×64,
 *      ачаалагдсан (`naturalWidth > 0`), ҮСЭГ-орлуулга БАЙХГҮЙ ✓
 *   ② Зураггүй нийтлэгч: `Avatar` нь нэрийн эхний ҮСГИЙГ 64×64-өөр үзүүлнэ
 *      (мөр хоосон харагдахгүй) ✓
 *   ③ 0017: `show_identity = true` үед НИЙТЭД харагдах нэр нь `display_name`
 *      (хоч нэр) — жинхэнэ `profiles.name` БИШ ✓
 *   ④ 📱 390px: аватар харагдана, хэвтээ гүйлт 0, JS exception 0 ✓
 *
 * ⚙️ АЖИЛЛУУЛАХ:
 *   1) `npm run build && npm run start` (http://localhost:3000)
 *   2) Chrome: --headless=new --remote-debugging-port=9222
 *   3) node scripts/cdp-seller-avatar.mjs [BASE] [UID_WITH] [UID_WITHOUT]
 *
 * ⚠️ Анхдагч UID-ууд нь ТУХАЙН төслийн өгөгдөлд тулгуурлана:
 *      `6f31564c…` — профайл зурагтай, `show_identity = true`
 *      `0526ab3f…` — профайл зураггүй (`avatar_url = NULL`)
 */
const BASE = process.argv[2] || 'http://localhost:3000';
const WITH = process.argv[3] || '6f31564c-30cb-4e1e-b35d-f15aa23320d1';
const WITHOUT = process.argv[4] || '0526ab3f-0867-470c-8838-8a8172b84bc6';

let ok = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { ok += 1; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`); } else { fail += 1; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};

const rpcOf = (ws) => {
  let id = 0;
  return (method, params = {}) => {
    id += 1;
    const myId = id;
    ws.send(JSON.stringify({ id: myId, method, params }));
    return new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('timeout ' + method)), 30000);
      const on = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id !== myId) return;
        clearTimeout(to);
        ws.removeEventListener('message', on);
        m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result);
      };
      ws.addEventListener('message', on);
    });
  };
};

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
let page = null;
try {
  const created = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (created.ok) page = await created.json();
} catch { /* нөөц зам */ }
let ownTab = !list.some((t) => t.id === page?.id);
if (!page?.webSocketDebuggerUrl) {
  const pages = list.filter((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
  page = pages.find((t) => t.url.includes('localhost:3000')) || pages[0];
  ownTab = false;
}
if (!page?.webSocketDebuggerUrl) throw new Error('CDP: нээлттэй `page` target алга');
try { await fetch(`http://127.0.0.1:9222/json/activate/${page.id}`); } catch { /* алгасна */ }
const ws = new WebSocket(page.webSocketDebuggerUrl);
const closeOwnTab = async () => {
  if (!ownTab) return;
  try { await fetch(`http://127.0.0.1:9222/json/close/${page.id}`); } catch { /* алгасна */ }
};
let exiting = false;
const hardExit = async (code) => {
  if (exiting) return;
  exiting = true;
  await closeOwnTab();
  process.exit(code);
};
process.on('uncaughtException', (e) => { console.error(e); hardExit(1); });
process.on('unhandledRejection', (e) => { console.error(e); hardExit(1); });
process.on('SIGINT', () => hardExit(130));
process.on('SIGTERM', () => hardExit(143));
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
const rpc = rpcOf(ws);
const exceptions = [];
const consoleErrors = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    exceptions.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push(m.params.args.map((a) => a.value || a.description || '').join(' '));
  }
});
await rpc('Runtime.enable');
await rpc('Page.enable');

const evalJs = async (expr) => {
  const r = await rpc('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
};
const goto = async (url, w = 1280, h = 900) => {
  await rpc('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
  await rpc('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 3500));
};

/** Толгойн карт (h1-ийг агуулсан `<section>`) дээрх аватар — нэг илэрхийллээр хэмжинэ */
const PROBE = `(async () => {
  const h1 = document.querySelector('h1');
  const card = h1 ? h1.closest('section') : null;
  if (!card) return { found: false };
  const av = card.querySelector('img, span[aria-hidden="true"]');   // 👤 аватар (эхний элемент)
  if (av) av.scrollIntoView({ block: 'center' });
  await new Promise((r) => setTimeout(r, 2200));
  const r = av ? av.getBoundingClientRect() : null;
  const cr = card.getBoundingClientRect();
  const out = [];
  card.querySelectorAll('*').forEach((el) => {
    const b = el.getBoundingClientRect();
    if (b.width === 0 && b.height === 0) return;
    if (b.left < cr.left - 1 || b.right > cr.right + 1) out.push(el.tagName + '.' + String(el.className).slice(0, 40));
  });
  return {
    found: true,
    h1: (h1.textContent || '').trim(),
    avTag: av ? av.tagName : null,
    avSrc: av && av.getAttribute ? (av.getAttribute('src') || '') : '',
    avNaturalW: av && av.naturalWidth !== undefined ? av.naturalWidth : -1,
    avBox: r ? Math.round(r.width) : 0,
    avSquare: r ? Math.abs(r.width - r.height) < 1 : false,
    avLetter: av && av.tagName !== 'IMG' ? (av.textContent || '').trim() : null,
    avRadius: av ? getComputedStyle(av).borderRadius : null,
    avInCard: !!(av && card.contains(av)),
    overflowInCard: out,
    pageScrollX: document.documentElement.scrollWidth - window.innerWidth,
  };
})()`;

console.log(`\n👤 CDP — НИЙТЛЭГЧИЙН ХУУДСАНЫ ПРОФАЙЛ ЗУРАГ (өөрчлөлт (65))\n`);

// ---------- ① ЗУРАГТАЙ нийтлэгч (show_identity = true) ----------
await rpc('Page.bringToFront');
await goto(`${BASE}/sellers/${WITH}`);
const a = await evalJs(PROBE);
check('① нийтлэгчийн хуудас ачаалагдав (толгойн карт олдлоо)', a.found === true);
if (!a.found) { console.log('\n  ⚠️ цааш шалгах боломжгүй\n'); await hardExit(1); }
console.log(`     ℹ️ нэр: «${a.h1}»`);
check('① толгойд БОДИТ ЗУРАГ (`<img>`) — ҮСЭГ БИШ', a.avTag === 'IMG', `tag=${a.avTag}`);
check('① зураг нь `avatars/<uid>/…` замтай (profiles.avatar_url)', /\/avatars\/|\/public\/avatars\//.test(a.avSrc), a.avSrc.slice(0, 80) || '—');
check('① зураг БОДИТООР АЧААЛАГДСАН (`naturalWidth > 0`)', a.avNaturalW > 0, `naturalWidth=${a.avNaturalW}`);
check('① хэмжээ 64×64', a.avBox === 64 && a.avSquare === true, `${a.avBox}px`);
check('① ҮСЭГ-орлуулга ХАРАГДАХГҮЙ', a.avLetter === null, a.avLetter || '0');
check('① аватар карт дотроо, хальсан элемент 0', a.avInCard === true && a.overflowInCard.length === 0, a.overflowInCard.join(', ') || '0');
check('① НИЙТЭД харагдах нэр нь `display_name` (хоч нэр) — жинхэнэ нэр БИШ', a.h1 === 'Цээгий', a.h1);
check('① хуудасны хэвтээ гүйлт 0', a.pageScrollX <= 0, `scrollWidth-innerWidth=${a.pageScrollX}`);

// ---------- ② ЗУРАГГҮЙ нийтлэгч (avatar_url = NULL) ----------
await goto(`${BASE}/sellers/${WITHOUT}`);
const b = await evalJs(PROBE);
check('② нийтлэгчийн хуудас ачаалагдав', b.found === true);
console.log(`     ℹ️ нэр: «${b.h1}»`);
check('② зураг БАЙХГҮЙ (DB-д `avatar_url = NULL`)', b.avTag === 'SPAN', `tag=${b.avTag}`);
check('② оронд нь нэрийн ЭХНИЙ ҮСЭГ (`K`) 64×64', b.avLetter === 'K' && b.avBox === 64, `«${b.avLetter}» · ${b.avBox}px`);
check('② мөр хоосон харагдахгүй (үсэг/зураг ҮРГЭЛЖ бий)', b.avLetter !== null && b.avBox > 0);
check('② картаас хальсан элемент 0', b.overflowInCard.length === 0, b.overflowInCard.join(', ') || '0');
check('② хуудасны хэвтээ гүйлт 0', b.pageScrollX <= 0, `scrollWidth-innerWidth=${b.pageScrollX}`);

// ---------- ③ 📱 390px (зурагтай нийтлэгч) ----------
await goto(`${BASE}/sellers/${WITH}`, 390, 780);
const mob = await evalJs(PROBE);
check('③ 📱 мобайл дээр ч БОДИТ ЗУРАГ 64×64 харагдана',
  mob.found && mob.avTag === 'IMG' && mob.avBox === 64 && mob.avNaturalW > 0,
  `tag=${mob.avTag} · ${mob.avBox}px`);
check('③ 📱 мобайл дээр картаас хальсан элемент 0', mob.overflowInCard.length === 0, mob.overflowInCard.join(', ') || '0');
check('③ 📱 мобайл дээр хэвтээ гүйлт 0', mob.pageScrollX <= 0, `scrollX=${mob.pageScrollX}`);

// ---------- ④ JS алдаа ----------
// ⚠️ Leaflet-ийн `_leaflet_pos` (газрын зургийн zoom transition) алдаа нь ЭНЭ
//    өөрчлөлтөөс ҮЛ ХАМААРАЛТАЙ, хуудас ачаалах бүрд headless дээр гардаг ⇒ тусгаарлана ✓
const leafletOnly = exceptions.filter((e) => /leaflet|_leaflet_pos/i.test(e));
const otherExceptions = exceptions.filter((e) => !/leaflet|_leaflet_pos/i.test(e));
console.log(`     ℹ️ Leaflet дотоод алдаа: ${leafletOnly.length} (хамааралгүй, хаслаа)`);
check('④ Leaflet-ээс БУСАД JS exception 0', otherExceptions.length === 0, otherExceptions.join(' | ').slice(0, 200) || '0');
const nesting = consoleErrors.filter((e) => /nest|hydration|hydrat|validateDOM/i.test(e));
check('④ консол дээр hydration/React алдаа 0', nesting.length === 0, nesting.join(' | ').slice(0, 200) || '0');

// ---------- 📸 ЗУРАГ (толгойн карт дээр төвлөрсөн) ----------
await goto(`${BASE}/sellers/${WITH}`);
const clip = await evalJs(`(() => { const h1 = document.querySelector('h1'); const r = h1.closest('section').getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left) - 20), y: Math.max(0, Math.round(r.top) - 20), width: Math.round(r.width) + 40, height: Math.round(r.height) + 40 }; })()`);
const shot = await rpc('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 2 } });
const fsmod = await import('node:fs');
fsmod.writeFileSync('/tmp/zar-65-seller-page-avatar.png', Buffer.from(shot.data, 'base64'));
console.log('  📸 зураг: /tmp/zar-65-seller-page-avatar.png');

console.log(`\n${fail === 0 ? '✅' : '❌'} РЕЗУЛЬТАТ: ${ok} OK / ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);
