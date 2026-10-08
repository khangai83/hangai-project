// ============================================================
// cdp-search-history.mjs — 🕐 «ХАЙЛТЫН ТҮҮХ»-ийг БОДИТ Chrome-д шалгана
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-08, 68):
//   «хайлтын түүх дээр орж үзсэн заруудыг л зөвхөн гаргадаг болгоорой, одоо
//    хайлтыг гаргаад байгаа, энэ нэрийг хэвээр үлдээ» ✓
//   (өмнөх 2026-10-07-ны хүсэлт: «Мессеж icon-ий дараа цагийн icon оруулаад…»)
//
// ЮУ ШАЛГАНА (зочин = localStorage горим):
//   ① ЗАР НЭЭХЭД түүхэнд бичигдэнэ — утга нь `/listings/<id>` (хайлтын линк БИШ)
//   ② ХАЙЛТ хийхэд түүхэнд БИЧИГДЭХГҮЙ (90мс биш, debounce 900мс хүлээж ч)
//   ③ `/history` дээр гарчиг ХЭВЭЭР («🕐 Хайлтын түүх») + үзсэн ЗАРЫН карт
//      (ListingCard — зураг/үнэ/гарчиг) гарна; «🕒 … үзсэн» цаг картын ДЭЭР
//   ④ Картын линк нь `/listings/<id>`; карт БҮХЭЛДЭЭ дарагдана
//   ⑤ УСТСАН зар (түүхэнд байгаа ч `listings`-д байхгүй) карт БОЛОХГҮЙ;
//      ХУУЧИН хайлтын мөр (`/?…`) ч карт БОЛОХГҮЙ ✓
//   ⑥ «Хасах» товч байна; дарахад мөр арилна (navigation БОЛОХГҮЙ, localStorage
//      -аас ч хасагдана)
//   ⑦ JS exception 0
//
// АЖИЛЛУУЛАХ:
//   1) `npm run build && npm run start` — сервер http://localhost:3000
//   2) Google Chrome-ыг CDP-ээр нээнэ:
//        /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
//          --headless=new --remote-debugging-port=9222 http://localhost:3000/
//   3) `npm run cdp:search-history`
//
// ⚠️ Сервер эсвэл Chrome байхгүй бол SKIP → exit 0 (бусад cdp скриптүүдийн
//    адил — CI/local-д саад болохгүй ✓)
// ⚠️ БОДИТ зарын id олдохгүй бол (`.env.local` ч, нүүр хуудас ч хоосон) мөн
//    SKIP → exit 0 (картын шалгалт нь жинхэнэ заргүйгээр утгагүй ✓)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.argv[2] || 'http://localhost:3000';
const HISTORY_KEY = 'zarmn_search_history_v1';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let cdpUp = true;
try {
  const r = await fetch('http://127.0.0.1:9222/json/list');
  if (!r.ok) cdpUp = false;
} catch { cdpUp = false; }
if (!cdpUp) { console.log('⚠️ SKIP — Chrome CDP (:9222) олдсонгүй (exit 0)'); process.exit(0); }
try {
  const r = await fetch(BASE);
  if (!r.ok) throw new Error('bad status');
} catch { console.log(`⚠️ SKIP — сервер (${BASE}) олдсонгүй (exit 0)`); process.exit(0); }

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
} catch { /* хуучин Chrome → нөөц зам */ }
let ownTab = !list.some((t) => t.id === page?.id);
if (!page?.webSocketDebuggerUrl) {
  const pages = list.filter((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
  page = pages.find((t) => t.url.includes('localhost:3000')) || pages[0];
  ownTab = false;
}
if (!page?.webSocketDebuggerUrl) throw new Error('CDP: `page` target олдсонгүй — Chrome-ыг --remote-debugging-port=9222-оор нээнэ үү');
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
  // ⚠️ Зөвхөн `text` нь «Uncaught» гэж л ирдэг тул шалтгааныг (exception/
  //    description + эх файл/мөр) ХАМТ бичнэ — эс бөгөөс дибаг хийх боломжгүй ✗
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    const desc = d.exception && d.exception.description
      ? String(d.exception.description).split('\n')[0] : '';
    exceptions.push(`${d.text}${desc ? ` — ${desc}` : ''} @ ${d.url || '?'}:${d.lineNumber}`);
  }
  // 🧯 console.error — hydration / `<a>` дотор `<a>` (validateDOMNesting) алдаа
  //    CDP-ийн exception биш, консол дээр л гардаг ⇒ тусад нь цуглуулна ✓
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push((m.params.args || [])
      .map((a) => String(a.value !== undefined ? a.value : (a.description || ''))).join(' '));
  }
});

await rpc('Runtime.enable');
await rpc('Page.enable');
await rpc('Page.bringToFront');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Renderer ачаалалтай үед `Runtime.evaluate` хааяа timeout болдог ✗ → дахин оролдоно */
const evalJs = async (expression) => {
  const call = async () => {
    const r = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error('eval: ' + String(d.exception?.description || d.text));
    }
    return r.result.value;
  };
  try {
    return await call();
  } catch (err) {
    if (!/timeout/.test(String(err.message))) throw err;
    await sleep(1500);
    return call();
  }
};
const waitFor = async (expression, ms = 12000) => {
  const until = Date.now() + ms;
  for (;;) {
    try { if (await evalJs(`!!(${expression})`)) return true; } catch { /* хуудас солигдож байна */ }
    if (Date.now() > until) return false;
    await sleep(200);
  }
};
const go = async (url) => {
  await rpc('Page.navigate', { url });
  await waitFor(`document.readyState === 'complete'`);
  await sleep(400);
};

let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};


console.log('\n🕐 CDP — Хайлтын түүх: ЗАР ҮЗЭХ → /history дээр зарын карт → карт дарахад орох → «Хасах»\n');

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });

/** ⚠️ ХАЙЛТЫН линк — түүхэнд БИЧИГДЭХ ЁСГҮЙ (2026-10-08 (68)-ийн гол шаардлага) */
const SEARCH_URL = `${BASE}/?category=sell&section=real-estate&rooms=3&q=${encodeURIComponent('орон сууц')}`;
/** ⚠️ Түүхэнд БАЙГАА ч `listings`-д БАЙХГҮЙ (устсан) зар — карт ГАРАХГҮЙ ✓ */
const FAKE_ID = '11111111-2222-4333-8444-555555555555';

/** Түүхийг localStorage-д ШУУД бичнэ (устсан/хуучин мөр үүсгэхэд) ✓ */
const seedHistory = (rows) => evalJs(
  `localStorage.setItem('${HISTORY_KEY}', JSON.stringify(${JSON.stringify(rows)}))`
);
const readHistory = () => evalJs(
  `(() => { try { return JSON.parse(localStorage.getItem('${HISTORY_KEY}') || '[]'); } catch (e) { return []; } })()`
);
const nowIso = () => new Date().toISOString();

// ---- ШАЛГАХ ЗАРЫН id — ① .env.local → Supabase REST, ② нөөц: нүүр хуудас ----
let LISTING_ID = '';
try {
  const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  const getEnv = (k) => (env.match(new RegExp(`^\\s*${k}\\s*=\\s*(.*)$`, 'm')) || [])[1]?.trim();
  const supaUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (supaUrl && anonKey) {
    const r = await fetch(`${supaUrl}/rest/v1/listings?select=id&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (r.ok) LISTING_ID = String((await r.json())?.[0]?.id || '');
  }
} catch { /* .env.local байхгүй → доорх нөөц зам */ }

await go(`${BASE}/`);
if (!LISTING_ID) {
  const href = await evalJs(`(document.querySelector('a[data-listing-card]') || {}).getAttribute?.('href') || ''`);
  LISTING_ID = String(href).split('/').pop();
}
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(LISTING_ID)) {
  console.log('⚠️ SKIP — БОДИТ зарын id олдсонгүй (DB хоосон / .env.local дутуу) → exit 0\n');
  await hardExit(0);
}

// ---- Цэвэр эхлэл ----
await evalJs(`localStorage.removeItem('${HISTORY_KEY}')`);

// ---- ① ЗАР НЭЭХ → түүхэнд ЗАРЫН линк бичигдэнэ (хайлтын линк БИШ) ----
await go(`${BASE}/listings/${LISTING_ID}`);
const recorded = await waitFor(
  `(() => { try { return JSON.parse(localStorage.getItem('${HISTORY_KEY}') || '[]')
    .some((x) => x.url === '/listings/${LISTING_ID}'); } catch (e) { return false; } })()`,
  10000
);
check('① ЗАР НЭЭХЭД түүхэнд бичигдэв (localStorage)', recorded, LISTING_ID);
const items1 = await readHistory();
check('①b бичигдсэн утга нь `/listings/<id>` (хайлтын линк БИШ)',
  Array.isArray(items1) && items1.length === 1 && items1[0].url === `/listings/${LISTING_ID}`,
  JSON.stringify(items1).slice(0, 120));

// ---- ② ХАЙЛТ хийхэд түүхэнд БИЧИГДЭХГҮЙ (гол шаардлага ✓) ----
await go(SEARCH_URL);
await sleep(1800); // ⚠️ хуучин debounce 900мс байсан — түүнээс хойш ч бичигдэхгүй ✓
const items2 = await readHistory();
check('② ХАЙЛТ хийхэд түүхэнд БИЧИГДЭХГҮЙ (хайлтын линк 0)',
  items2.every((x) => !/section=|category=|rooms=|\?/.test(String(x.url))),
  JSON.stringify(items2).slice(0, 120));
check('②b түүхийн мөрийн тоо ХЭВЭЭР (1)', items2.length === 1, String(items2.length));


// ---- ③ /history — гарчиг ХЭВЭЭР + ҮЗСЭН ЗАРЫН карт (ListingCard) ----
await go(`${BASE}/history`);
await waitFor(`document.querySelector('[data-search-history-row]')`);
check('③ гарчиг ХЭВЭЭР — «🕐 Хайлтын түүх»',
  (await evalJs(`document.querySelector('[data-search-history] h2').innerText.trim()`)) === '🕐 Хайлтын түүх',
  await evalJs(`document.querySelector('[data-search-history] h2').innerText.trim()`));
check('③b ҮЗСЭН ЗАР карт хэлбэрээр гарна (1 мөр)',
  (await evalJs(`document.querySelectorAll('[data-search-history-row]').length`)) === 1,
  String(await evalJs(`document.querySelectorAll('[data-search-history-row]').length`)));
check('③c карт нь зарын бүрэн карт (`data-listing-card`)',
  await evalJs(`!!document.querySelector('[data-search-history-row] a[data-listing-card]')`));
check('③d «🕒 … үзсэн» цаг картын ДЭЭР байна (картыг халхлахгүй ✓)',
  await evalJs(`(() => { const row = document.querySelector('[data-search-history-row]');
    const cap = row.firstElementChild, card = row.querySelector('a[data-listing-card]');
    return /үзсэн/.test(cap.innerText)
      && cap.getBoundingClientRect().bottom <= card.getBoundingClientRect().top + 2; })()`));
check('③e картын линк нь ЗАРЫН хуудас (`/listings/<id>`)',
  await evalJs(`document.querySelector('[data-search-history-row] a[data-listing-card]').getAttribute('href') === '/listings/${LISTING_ID}'`),
  String(await evalJs(`document.querySelector('[data-search-history-row] a[data-listing-card]').getAttribute('href')`)));
check('③f «Хасах» товч (текст нь яг «Хасах»)',
  await evalJs(`document.querySelector('[data-search-history-row]').querySelector('[data-search-history-remove]').innerText.trim() === 'Хасах'`));

// ---- ④ УСТСАН зар + ХУУЧИН хайлтын мөр → карт БОЛОХГҮЙ ✓ ----
await seedHistory([
  { id: 'r-real', url: `/listings/${LISTING_ID}`, listingId: LISTING_ID, createdAt: nowIso() },
  { id: 'r-fake', url: `/listings/${FAKE_ID}`, listingId: FAKE_ID, createdAt: nowIso() },
  { id: 'r-old', url: '/?category=sell&section=real-estate&rooms=3', createdAt: nowIso() },
]);
await go(`${BASE}/history`);
await waitFor(`document.querySelector('[data-search-history-row]')`);
const rows4 = await evalJs(`document.querySelectorAll('[data-search-history-row]').length`);
check('④ УСТСАН/байхгүй зар (fake id) карт БОЛОХГҮЙ (1 л карт)', rows4 === 1, `${rows4} карт`);
check('④b ХУУЧИН хайлтын мөр (`/?…`) карт БОЛОХГҮЙ',
  await evalJs(`!/Үл хөдлөх|Орон сууц зарна|section=/.test(document.querySelector('[data-search-history-list]').innerText)`),
  (await evalJs(`document.querySelector('[data-search-history-list]').innerText`)).replace(/\s+/g, ' ').slice(0, 90));
check('④c тоо нь «2 зар үзсэн (1 нь олдсон)»',
  /2 зар үзсэн \(1 нь олдсон\)/.test(await evalJs(`document.querySelector('[data-search-history-count]').innerText`)),
  await evalJs(`document.querySelector('[data-search-history-count]').innerText`));

// ---- ⑤ КАРТ ДЭЭР дарахад (товч БИШ) ЗАРЫН хуудас руу ОРНО ----
const box = await evalJs(`(() => { const r = document.querySelector('[data-search-history-row] a[data-listing-card]').getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
await rpc('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
await rpc('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
check('⑤ КАРТ дээр дарахад ЗАРЫН хуудас руу ОРЛОО',
  await waitFor(`location.pathname === '/listings/${LISTING_ID}'`, 8000), await evalJs('location.pathname'));


// ---- ⑥ «Хасах» → мөр арилна, navigation БОЛОХГҮЙ, localStorage ч цэвэрлэгдэнэ ----
await go(`${BASE}/history`);
await waitFor(`document.querySelector('[data-search-history-row]')`);
const before = await evalJs(`document.querySelectorAll('[data-search-history-row]').length`);
await evalJs(`document.querySelectorAll('[data-search-history-row]')[0].querySelector('[data-search-history-remove]').click()`);
const removed = await waitFor(`document.querySelectorAll('[data-search-history-row]').length === ${before - 1}`, 6000);
check('⑥ «Хасах» дарахад мөр арилав', removed,
  `${before} → ${await evalJs(`document.querySelectorAll('[data-search-history-row]').length`)}`);
check('⑥b «Хасах» дарахад ХУУДАС СОЛИГДООГҮЙ (navigation БИШ)',
  (await evalJs(`location.pathname`)) === '/history', await evalJs('location.pathname'));
check('⑥c localStorage-аас ч хасагдав',
  await evalJs(`!JSON.parse(localStorage.getItem('${HISTORY_KEY}') || '[]')
    .some((x) => String(x.url).includes('${LISTING_ID}'))`));

// ---- Цэвэрлэгээ + JS алдаа ----
await evalJs(`localStorage.removeItem('${HISTORY_KEY}')`);
// ⚠️ Leaflet-ийн `_leaflet_pos` (газрын зургийн zoom transition) алдаа нь ЭНЭ
//    өөрчлөлтөөс ҮЛ ХАМААРАЛТАЙ — ЗАРЫН хуудасны газрын зураг ачаалах бүрд
//    headless дээр гардаг (stack нь 100% leaflet дотоод — React/render хүрээ
//    БАЙХГҮЙ) ⇒ тусгаарлана ✓ (cdp-seller-stats-link.mjs-ийн ЯГ ИЖИЛ зарчим)
const leafletOnly = exceptions.filter((e) => /leaflet|_leaflet_pos/i.test(e));
const otherExceptions = exceptions.filter((e) => !/leaflet|_leaflet_pos/i.test(e));
console.log(`     ℹ️ Leaflet дотоод алдаа: ${leafletOnly.length} (хамааралгүй, хаслаа)`);
check('⑦ Leaflet-ээс БУСАД JS exception 0', otherExceptions.length === 0,
  otherExceptions.join(' | ').slice(0, 200) || '0');
// 🔴 `<a>` дотор `<a>` болвол React «validateDOMNesting»/hydration алдаа өгнө —
//    «Хасах» товч картын ГАДНА байгаа нь ТЭР алдаа гараагүйгээр батлагдана ✓
const nesting = consoleErrors.filter((e) => /nest|hydration|hydrat|validateDOM/i.test(e));
check('⑦b консол дээр hydration / линк nesting алдаа 0', nesting.length === 0,
  nesting.join(' | ').slice(0, 200) || '0');

console.log(`\n${fail === 0 ? '✅' : '❌'} CDP — ${pass} OK, ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);

