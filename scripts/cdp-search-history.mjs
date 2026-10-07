// ============================================================
// cdp-search-history.mjs — 🕐 «ХАЙЛТЫН ТҮҮХ»-ийг БОДИТ Chrome-д шалгана
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-07):
//   «Мессеж icon-ий дараа цагийн icon оруулаад, тэр рүү орход тухайн
//    хэрэглэгчийн хайлтуудыг карт хэлбэрээр харуул» + «карт руу орохдоо
//    дахин хайх биш зүгээр л тухайн card дээрээ click хийхэд ордог байхаар
//    хийж болох уу» + «устгах товчний нэрийг Хасах гэж нэрлээрэй» ✓
//
// ЮУ ШАЛГАНА (зочин = localStorage горим):
//   ① Хайлт хийхэд АВТОМАТААР бүртгэгдэж localStorage-д бичигдэнэ
//   ② `/history` дээр карт гарна (шинэ хайлт ЭХЭНД); категорийн СҮҮЛИЙН нэр +
//      байршил + хайсан түлхүүр үг харагдана
//   ③ Карт БҮХЭЛДЭЭ бүрхсэн линк (`absolute`, геометр ЯГ ТААРНА) — href нь
//      хайлтын URL
//   ④ КАРТ ДЭЭР (товч БИШ) дарахад хайлтын үр дүн рүү ОРНО
//   ⑤ «Хасах» товч байна (мөн «Дахин хайх» ГАРАХГҮЙ)
//   ⑥ «Хасах» дарахад карт арилна (мөн navigation БОЛОХГҮЙ)
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
// ============================================================
const BASE = process.argv[2] || 'http://localhost:3000';
const HISTORY_KEY = 'zarmn_search_history_v1';

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
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
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

console.log('\n🕐 CDP — Хайлтын түүх: авто-бүртгэл → /history карт → карт дарахад орох → «Хасах»\n');

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });

/** Шалгах 2 хайлт — ① Үл хөдлөх (+Хан-Уул+3 өрөө+түлхүүр үг), ② Цахилгаан */
const SEARCH_A = `${BASE}/?category=sell&section=real-estate&type=${encodeURIComponent('Орон сууц')}`
  + `&rooms=3&district=${encodeURIComponent('Хан-Уул')}&q=${encodeURIComponent('орон сууц')}`;
const SEARCH_B = `${BASE}/?section=electric&type=${encodeURIComponent('Угаалгын машин')}`;

// ---- Цэвэр эхлэл ----
await go(`${BASE}/`);
await evalJs(`localStorage.removeItem('${HISTORY_KEY}')`);

// ---- ① Авто-бүртгэл (2 хайлт, debounce 900мс) ----
await go(SEARCH_A);
await sleep(1400);
await go(SEARCH_B);
await sleep(1400);
const stored = await evalJs(`localStorage.getItem('${HISTORY_KEY}')`);
check('① хайлтууд АВТОМАТААР бүртгэгдэв (localStorage)',
  !!stored && /section=real-estate/.test(stored) && /section=electric/.test(stored),
  stored ? String(stored).slice(0, 110) : '(хоосон)');

// ---- ② /history — 2 карт, шинэ нь ЭХЭНД, агуулга нь зөв ----
await go(`${BASE}/history`);
await waitFor(`document.querySelector('[data-search-history-row]')`);
const cards = await evalJs(`[...document.querySelectorAll('[data-search-history-row]')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim())`);
check('② /history дээр ЯГ 2 карт гарна', Array.isArray(cards) && cards.length === 2,
  Array.isArray(cards) ? String(cards.length) : '(0)');
check('②b шинэ хайлт (Угаалгын машин) ЭХЭНД байна',
  !!cards?.[0] && /Угаалгын машин/.test(cards[0]), cards?.[0]?.slice(0, 90));
check('②c карт дээр категорийн СҮҮЛИЙН нэр + байршил + түлхүүр үг',
  !!cards?.[1] && /Орон сууц зарна/.test(cards[1]) && /Хан-Уул/.test(cards[1]) && /орон сууц/.test(cards[1]),
  cards?.[1]?.slice(0, 130));

// ---- ③ Картыг БҮРЭН бүрхсэн линк (геометр + href) ----
check('③ карт БҮХЭЛДЭЭ бүрхсэн ЛИНК (absolute + геометр таарна)',
  await evalJs(`(() => { const row = document.querySelectorAll('[data-search-history-row]')[0];
    const a = row.querySelector('[data-search-history-open]'); if (!a) return false;
    const r = row.getBoundingClientRect(), b = a.getBoundingClientRect();
    return getComputedStyle(a).position === 'absolute'
      && Math.abs(r.width - b.width) < 4 && Math.abs(r.height - b.height) < 4; })()`));
check('③b линк нь хайлтын URL руу (`section=electric`)',
  await evalJs(`/section=electric/.test(document.querySelectorAll('[data-search-history-row]')[0].querySelector('[data-search-history-open]').getAttribute('href'))`));

// ---- ④ КАРТ ДЭЭР дарахад (товч БИШ) хайлтын үр дүн рүү ОРНО ----
const box = await evalJs(`(() => { const r = document.querySelectorAll('[data-search-history-row]')[0].getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + 42) }; })()`);
await rpc('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
await rpc('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
const navigated = await waitFor(`location.search.includes('section=electric') && location.search.includes('type=')`, 8000);
check('④ КАРТ дээр дарахад хайлтын үр дүн рүү ОРЛОО', navigated, await evalJs('location.pathname + location.search'));

// ---- ⑤ /history — «Хасах» товч (мөн «Дахин хайх» байхгүй) ----
await go(`${BASE}/history`);
await waitFor(`document.querySelector('[data-search-history-row]')`);
check('⑤ «Хасах» товч байна (текст нь яг «Хасах»)',
  await evalJs(`document.querySelectorAll('[data-search-history-row]')[0].querySelector('[data-search-history-remove]').innerText.trim() === 'Хасах'`));
check('⑤b «Дахин хайх» товч карт дээр ГАРАХГҮЙ',
  await evalJs(`! /Дахин хайх/.test(document.querySelectorAll('[data-search-history-row]')[0].innerText)`));

// ---- ⑥ «Хасах» → карт арилна, navigation БОЛОХГҮЙ ----
const before = await evalJs(`document.querySelectorAll('[data-search-history-row]').length`);
await evalJs(`document.querySelectorAll('[data-search-history-row]')[0].querySelector('[data-search-history-remove]').click()`);
const removed = await waitFor(`document.querySelectorAll('[data-search-history-row]').length === ${before - 1}`, 6000);
check('⑥ «Хасах» дарахад карт арилав', removed);
check('⑥b «Хасах» дарахад ХУУДАС СОЛИГДООГҮЙ (navigation БИШ)',
  (await evalJs(`location.pathname`)) === '/history', await evalJs('location.pathname'));

check('⑦ JS exception 0', exceptions.length === 0, exceptions.slice(0, 3).join(' | '));

console.log(`\n${fail === 0 ? '✅' : '❌'} CDP — ${pass} OK, ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);
