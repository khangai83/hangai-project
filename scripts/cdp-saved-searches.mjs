// ============================================================
// cdp-saved-searches.mjs — 🔖 «ХАДГАЛСАН ХАЙЛТ»-ыг БОДИТ Chrome-д шалгана
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-06, unegui.mn-ийн жишээ зурагтай):
//   «unegui.mn шиг хайлтаа гоё хадгалдаг болъё» → хайлтын үр дүнгийн дээд
//   мөрөнд «Хайлтыг хадгалах» товч; дарахад `/favorites` хуудасны
//   «🔖 Таалагдсан хайлтууд» таб дээр «Категори / Байршил + Илэрц харуулах»
//   мөр болж гарна ✓
//
// ЮУ ШАЛГАНА (зочин = localStorage горим):
//   ① Хадгалах утгатай хайлт дээр `[data-save-search]` товч гарна («Хайлтыг хадгалах»)
//   ② Дарахад «✓ Хадгалагдсан» + `aria-pressed=true` + localStorage-д бичигдэнэ
//   ③ `/favorites` дээр 2 ТАБ (❤️ зарууд · 🔖 хайлтууд) ба «🗂 таб» гарна
//   ④ Мөр нь unegui.mn шиг: «Категори: …» + «Байршил: …» + «Илэрц харуулах»/«устгах»
//   ⑤ «устгах» → мөр арилж, хоосон төлөв гарна
//   ⑥ Буцаж тэр хайлт дээр ороход товч дахин «Хайлтыг хадгалах» болно
//   ⑦ «Бүх зар» (хадгалах утгагүй) дээр товч ОГТ ГАРАХГҮЙ
//   ⑧ JS exception 0
//
// АЖИЛЛУУЛАХ:
//   1) `npm run build && npm run start` — сервер http://localhost:3000
//   2) Google Chrome-ыг CDP-ээр нээнэ:
//        /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
//          --headless=new --remote-debugging-port=9222 http://localhost:3000/
//   3) `npm run cdp:saved-searches`
//
// ⚠️ Сервер эсвэл Chrome байхгүй бол SKIP → exit 0 (бусад cdp скриптүүдийн
//    адил — CI/local-д саад болохгүй ✓)
// ============================================================
const BASE = process.argv[2] || 'http://localhost:3000';

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

console.log('\n🔖 CDP — Хадгалсан хайлт: «Хайлтыг хадгалах» → /favorites «Таалагдсан хайлтууд»\n');

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });

/** Шалгах хайлт — «Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө» + Хан-Уул */
const SEARCH = `${BASE}/?category=sell&section=real-estate&type=${encodeURIComponent('Орон сууц')}`
  + `&rooms=3&district=${encodeURIComponent('Хан-Уул')}`;

// ---- Цэвэр эхлэл (localStorage-аа устгана — өмнөх гүйлтийн үлдэгдэл) ----
await go(`${BASE}/`);
await evalJs("localStorage.removeItem('zarmn_saved_searches_v1')");

// ---- ①② Хадгалах товч (хадгалах утгатай хайлт дээр) ----
await go(SEARCH);
await waitFor(`document.querySelector('[data-save-search]')`);
const btn0 = await evalJs(`(() => {
  const b = document.querySelector('[data-save-search]');
  return b ? { text: b.innerText.replace(/\\s+/g, ' ').trim(), pressed: b.getAttribute('aria-pressed') } : null;
})()`);
check('① Хадгалах утгатай хайлт дээр «Хайлтыг хадгалах» товч гарна',
  !!btn0 && /Хайлтыг хадгалах/.test(btn0.text) && !/Хадгалагдсан/.test(btn0.text),
  btn0 ? btn0.text : 'товч олдсонгүй');
check('①b Товч анх `aria-pressed=false`', !!btn0 && btn0.pressed === 'false',
  btn0 ? `pressed=${btn0.pressed}` : '');

await evalJs(`document.querySelector('[data-save-search]').click()`);
await waitFor(`/Хадгалагдсан/.test((document.querySelector('[data-save-search]') || {}).innerText || '')`);
const btn1 = await evalJs(`(() => {
  const b = document.querySelector('[data-save-search]');
  return { text: b.innerText.replace(/\\s+/g, ' ').trim(), pressed: b.getAttribute('aria-pressed'), disabled: b.disabled };
})()`);
check('② Дарсны дараа «✓ Хадгалагдсан» + `aria-pressed=true` + disabled',
  /Хадгалагдсан/.test(btn1.text) && btn1.pressed === 'true' && btn1.disabled === true,
  `text=${btn1.text} pressed=${btn1.pressed} disabled=${btn1.disabled}`);
const stored = await evalJs("localStorage.getItem('zarmn_saved_searches_v1')");
check('②b localStorage-д линк бичигдэв (`section=real-estate` + `rooms=3`)',
  !!stored && stored.includes('section=real-estate') && stored.includes('rooms=3'),
  stored ? String(stored).slice(0, 120) : '(хоосон)');

// ---- ③④ /favorites — 2 таб ба хадгалсан хайлтын мөр ----
await go(`${BASE}/favorites`);
await waitFor(`document.querySelector('[data-fav-tab="searches"]')`);
const tabs = await evalJs(`[...document.querySelectorAll('[data-fav-tab]')].map((b) => b.getAttribute('data-fav-tab'))`);
check('③ /favorites дээр 2 таб (ads + searches) байна',
  Array.isArray(tabs) && tabs.length === 2 && tabs[0] === 'ads' && tabs[1] === 'searches',
  Array.isArray(tabs) ? tabs.join(',') : '(0)');
check('③b Товчнууд a11y `role="tab"` (2)',
  (await evalJs(`document.querySelectorAll('[role="tablist"] [role="tab"]').length`)) === 2);

await evalJs(`document.querySelector('[data-fav-tab="searches"]').click()`);
await waitFor(`document.querySelector('[data-saved-search-row]')`);
const rows = await evalJs(`[...document.querySelectorAll('[data-saved-search-row]')].map((r) => r.innerText.replace(/\\s+/g, ' ').trim())`);
check('④ Хадгалсан хайлтын мөр ЯГ 1', Array.isArray(rows) && rows.length === 1,
  Array.isArray(rows) ? rows.join(' || ') : '(0)');
const rowText = (rows && rows[0]) || '';
check('④b «Категори:» зам unegui.mn шиг (Үл хөдлөх … Орон сууц зарна … 3 өрөө)',
  rowText.includes('Үл хөдлөх') && rowText.includes('Орон сууц зарна') && rowText.includes('3 өрөө'),
  rowText.slice(0, 150));
check('④c «Байршил:» мөр байна (Хан-Уул)', rowText.includes('Байршил') && rowText.includes('Хан-Уул'),
  rowText.slice(0, 150));
check('④d «Илэрц харуулах» линк нь хадгалсан URL руу (`section=real-estate`)',
  await evalJs(`(() => { const a = document.querySelector('[data-saved-search-row] [data-saved-search-open]');
    return !!a && /section=real-estate/.test(a.getAttribute('href')); })()`));
check('④e «устгах» товч байна',
  (await evalJs(`document.querySelectorAll('[data-saved-search-row] [data-saved-search-remove]').length`)) === 1);

// ---- ⑤ Устгах → хоосон төлөв ----
await evalJs(`document.querySelector('[data-saved-search-row] [data-saved-search-remove]').click()`);
await waitFor(`!document.querySelector('[data-saved-search-row]')`);
check('⑤ «устгах» дарахад мөр арилж, хоосон төлөв гарна',
  await evalJs(`document.querySelectorAll('[data-saved-search-row]').length === 0
    && /хадгалсан хайлт байхгүй/.test(document.body.innerText)`));

// ---- ⑥ Буцаж тэр хайлт дээр → товч дахин «Хайлтыг хадгалах» ----
await go(SEARCH);
await waitFor(`document.querySelector('[data-save-search]')`);
const btn2 = await evalJs(`document.querySelector('[data-save-search]').innerText.replace(/\\s+/g, ' ').trim()`);
check('⑥ Устгасны дараа товч дахин «Хайлтыг хадгалах» (эс бөгөөс төлөв хуучирсан ✗)',
  /Хайлтыг хадгалах/.test(btn2) && !/Хадгалагдсан/.test(btn2), btn2);

// ---- ⑦ «Бүх зар» (хадгалах утгагүй) → товч БАЙХГҮЙ ----
await go(`${BASE}/`);
// `#home-search` нь зөвхөн Hydration+effect-ийн дараа гардаг (header slot) → гэрч ✓
await waitFor(`document.querySelector('#home-search')`);
await sleep(500);
check('⑦ «Бүх зар» (хадгалах утгагүй) дээр товч ОГТ ГАРАХГҮЙ',
  await evalJs(`!document.querySelector('[data-save-search]')`));

check('⑧ JS exception 0', exceptions.length === 0, exceptions.slice(0, 3).join(' | '));

console.log(`\n${fail === 0 ? '✅' : '❌'} CDP — ${pass} OK, ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);
