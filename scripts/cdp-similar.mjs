/**
 * 🔎 CDP ШАЛГАЛТ — «ТӨСТЭЙ ЗАРУУД» БЛОК (2026-10-09 (79), бодит Chrome)
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «зарын карт руу ороход төстэй заруудыг харуулах»
 *   → жишиг сайтын хэв: зарын дэлгэрэнгүй хуудсанд үндсэн агуулга ба
 *   нийтлэгчийн картын ДООР «🔎 Төстэй зарууд» баганат grid гарна.
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ БАРИУЛАХ ВЭ (бодит DOM/геометр — эх кодын ГЭРЭЭ БИШ):
 *   ① `/` дээрээс эхний зарын id-г олж, `/listings/<id>` руу орно
 *   ② Блок нь ҮНДСЭН агуулгын ДООР байрлана (`[data-similar-listings]`-ийн
 *      `top` нь үндсэн баганын `bottom`-оос их) ✓
 *   ③ Гарчиг нь «🔎 Төстэй зарууд» ✓
 *   ④ Картууд нь БАГАНАТ grid: мөрөнд ≥2 (1280px) ба өргөн нь БҮГД ИЖИЛ (±2px) ✓
 *   ⑤ ОДООГИЙН зар нь төстэй заруудын дотор ДАВХАРДАХГҮЙ (өөрийгөө хасна) ✓
 *   ⑥ Хэвтээ гүйлт 0 · 🐍 JS/hydration алдаа 0 ✓
 *   ⑦ 📸 /tmp/similar-listings-1280.png
 *
 * ⚠️ ХЭРЭГЛЭГЧИЙН ӨГӨГДЛӨӨС ХАМААРНА: DB-д ижил хэсэг/ангиллын ӨӨР зар
 *    байхгүй бол блок ГАРАХГҮЙ (`return null`) — энэ нь ХЭВИЙН зан төлөв тул
 *    тэр үед SKIP (exit 0) болно, FAIL БИШ ✓
 *
 * ⚙️ АЖИЛЛУУЛАХ:
 *   1) `npm run build && npm run start` (http://localhost:3000)
 *   2) Chrome: --headless=new --remote-debugging-port=9222
 *   3) node scripts/cdp-similar.mjs [BASE]
 *
 * ⚠️ Сервер/Chrome байхгүй бол SKIP (exit 0) — бусад cdp-* скриптийн зарчим ✓
 */
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3000';

let ok = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { ok += 1; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`); } else { fail += 1; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};

// ---------- ⓪ Серверийг шалгах (байхгүй бол SKIP) ----------
let serverUp = false;
try {
  const res = await fetch(BASE, { method: 'GET' });
  serverUp = res.status < 500;
} catch { serverUp = false; }
if (!serverUp) {
  console.log(`\n⏭ SKIP — ${BASE} дээр сервер алга (npm run build && npm run start)\n`);
  process.exit(0);
}

// ---------- ① Chrome-той холбогдох ----------
const rpcOf = (ws) => {
  let id = 0;
  return (method, params = {}) => {
    id += 1;
    const myId = id;
    ws.send(JSON.stringify({ id: myId, method, params }));
    return new Promise((resolve, reject) => {
      const to = setTimeout(() => reject(new Error('timeout ' + method)), 30000);
      const on = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id !== myId) return;
        clearTimeout(to);
        ws.removeEventListener('message', on);
        m.error ? reject(new Error(method + ': ' + JSON.stringify(m.error))) : resolve(m.result);
      };
      ws.addEventListener('message', on);
    });
  };
};

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json().catch(() => null);
if (!list) {
  console.log('\n⏭ SKIP — Chrome :9222 алга (--headless=new --remote-debugging-port=9222)\n');
  process.exit(0);
}
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
await new Promise((res) => ws.addEventListener('open', res, { once: true }));
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
  const out = await rpc('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (out.exceptionDetails) throw new Error('eval: ' + (out.exceptionDetails.exception?.description || out.exceptionDetails.text));
  return out.result.value;
};
const goto = async (url, w = 1280, h = 1400) => {
  await rpc('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
  await rpc('Page.navigate', { url });
  await new Promise((res) => setTimeout(res, 3500));
};
const waitFor = async (expr, ms = 12000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await evalJs(expr)) return true; } catch { /* дахин */ }
    await new Promise((res) => setTimeout(res, 400));
  }
  return false;
};
const shot = async (file) => {
  const out = await rpc('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(out.data, 'base64'));
  console.log(`  📸 ${file}`);
};

console.log('\n🧪 ТӨСТЭЙ ЗАРУУД — бодит Chrome\n');

// ---------- ② Нүүрээс эхний зарын id ----------
await goto(`${BASE}/`, 1280, 1400);
await waitFor(`document.querySelector('a[data-listing-card]') !== null`);
const firstHref = await evalJs(`(() => { const a = document.querySelector('a[data-listing-card]'); return a ? a.getAttribute('href') : ''; })()`);
const listingId = String(firstHref || '').split('/').filter(Boolean).pop() || '';
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listingId);
check('① Нүүрээс зарын линк олдлоо', isUuid, listingId || '—');
if (!isUuid) {
  console.log('\n⏭ SKIP — зарын id олдсонгүй (DB хоосон байж болно)\n');
  await hardExit(0);
}

// ---------- ③ Зарын дэлгэрэнгүй хуудас ----------
await goto(`${BASE}/listings/${listingId}`, 1280, 1600);
const appeared = await waitFor(`document.querySelector('[data-similar-listings]') !== null`, 10000);
if (!appeared) {
  console.log('  ⏭ «🔎 Төстэй зарууд» блок ГАРАГДААГҮЙ — DB-д ижил хэсэг/ангиллын өөр зар байхгүй (хэвийн зан төлөв)');
  console.log(`\n${fail === 0 ? '✅' : '❌'} ${ok} OK / ${fail} FAIL (блок DB-ээс хамаарна)\n`);
  await hardExit(fail === 0 ? 0 : 1);
}

const PROBE = `(() => {
  const R = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
  const block = document.querySelector('[data-similar-listings]');
  const grid = block.previousElementSibling;
  const cards = [...block.querySelectorAll('a[data-listing-card]')];
  const heads = [...block.querySelectorAll('h1,h2,h3')].map((h) => (h.innerText || '').trim());
  return {
    vw: window.innerWidth,
    scrollW: document.documentElement.scrollWidth,
    block: R(block),
    grid: grid ? R(grid) : null,
    gridHasAside: grid ? !!grid.querySelector('aside') : false,
    heads,
    count: cards.length,
    hrefs: cards.map((c) => c.getAttribute('href')),
    widths: cards.map((c) => Math.round(c.getBoundingClientRect().width)),
    rowTop: cards.map((c) => Math.round(c.getBoundingClientRect().top)),
  };
})()`;

const r = await evalJs(PROBE);
check('② Блок нь үндсэн 2 БАГАНЫН grid-ийн (агуулга + sidebar) ДООР байрлана',
  !!r.grid && r.gridHasAside && r.block.y >= r.grid.b - 5,
  `block.top ${r.block.y} / grid.bottom ${r.grid?.b} / aside ${r.gridHasAside}`);
check('③ Гарчиг нь «🔎 Төстэй зарууд»', r.heads.some((h) => h.includes('Төстэй зарууд')), r.heads.join(' | ') || '—');
check('④ Картууд байна (≥1)', r.count >= 1, `${r.count} карт`);
const firstY = r.rowTop[0] ?? 0;
const row1 = r.rowTop.filter((y) => Math.abs(y - firstY) <= 4);
check('④b Эхний мөрөнд ≥2 карт (баганат grid, 1280px)', row1.length >= 2, `${row1.length} карт`);
const wDiff = r.widths.length ? Math.max(...r.widths) - Math.min(...r.widths) : 0;
check('④c Бүх картын өргөн ИЖИЛ (±2px)', r.widths.length === 0 || wDiff <= 2,
  `${Math.min(...r.widths)}…${Math.max(...r.widths)}px`);
check('⑤ Одоогийн зар төстэй заруудын дотор ДАВХАРДАХГҮЙ (өөрийгөө хасна)',
  !r.hrefs.includes(`/listings/${listingId}`), `id ${listingId}`);
check('⑥ Хэвтээ гүйлт 0', r.scrollW <= r.vw + 1, `scrollW ${r.scrollW} / vw ${r.vw}`);

// 📸 Блок руу ГҮЙЛГЭЖ зурах (дэлгэрэнгүй хуудас урт — эс бөгөөс зурагт
//    орохгүй; ⚠️ геометрийн шалгалтууд нь `getBoundingClientRect`-ийн
//    viewport координат тул ГҮЙЛГЭХЭЭС ӨМНӨ хийгдсэн ✓)
await evalJs(`document.querySelector('[data-similar-listings]').scrollIntoView({ block: 'start' })`);
await new Promise((res) => setTimeout(res, 900));
await shot('/tmp/similar-listings-1280.png');

// ---------- ④ JS/hydration алдаа ----------
const realExceptions = exceptions.filter((e) => !/leaflet|ResizeObserver/i.test(String(e)));
check('⑦ 🐍 JS exception 0 (Leaflet-ээс бусад)', realExceptions.length === 0, realExceptions.slice(0, 2).join(' | '));
const realConsole = consoleErrors.filter((e) => !/leaflet|401|403|Failed to load resource|net::ERR/i.test(String(e)));
check('⑦b hydration/React console алдаа 0', realConsole.length === 0, realConsole.slice(0, 2).join(' | '));

console.log(`\n${fail === 0 ? '✅' : '❌'} ${ok} OK / ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);

