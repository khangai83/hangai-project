/**
 * 🔎 CDP ШАЛГАЛТ — ХАЙЛТЫН АВТОСАНАЛ (autocomplete) + ГАРЧИГ/ТАЙЛБАР ХАЙЛТ
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-05 (46)): «Хайлтыг сайжруулж өгөөч…» (жишиг
 * зургийн ① «хайлт дээр санал гаргах», ③ «гарчиг/тайлбараас хайх»).
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ (бодит DOM дээр):
 *   ① `#home-search` нь `role="combobox"` + `aria-expanded` — hydrate болсны
 *      ДАРАА гарч ирнэ (толгойн хайлт нь `useHeaderSlot`-оор ордог ✓; харин
 *      МОБАЙЛ хайлт `#home-search-mobile` нь SSR HTML дээр Ч байдаг ✓)
 *   ② Бичихэд `[data-search-suggest]` (role=listbox) САНАЛ гарна
 *   ③ Санал нь `type` (хэсэг/дэд төрөл) ба `listing` (зарын гарчиг) хоёуланг
 *      агуулна; DB-ийн query нь `title.ilike.%…%` ✓
 *   ④ ⌨️ санал дарахад ① хайрцагт утга нь ОРЖ ② хайлт ШУУД хийгдэж URL-д
 *      `?q=…` болж гарна ③ саналын панель ХААГДАна ✓
 *   ⑤ 1 тэмдэгтээс богино үгт санал ГАРАХГҮЙ (санал дүүрэхээс сэргийлнэ ✓)
 *   ⑥ 📱 390px дээр ч ажиллана (мобайл наалдамхай мөр) · 🧯 JS exception 0
 *   🆕 (47): ⑦ фокус алдвал панель ХААГДАЖ, ДАХИН фокус хийхэд (үг
 *      хөдлөөгүй ч) санал ЭРГЭЖ ГАРНА · ⑧ blur-ийн дараа хожуу ирсэн хариу
 *      панель НЭЭХГҮЙ (race) · ⑨ ⌨️ ↓ → `aria-activedescendant`, Enter →
 *      идэвхтэй санал сонгогдож `?q=…` хайлт хийнэ ✓
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээнэ:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-search.mjs   (эсвэл npm run cdp:search)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:search` ✓
 *
 * 🆕 2026-10-05 (47) — ХЭРЭГЛЭГЧИЙН ГОМДОЛ: «бичиж байхад шууд ГАРАХГҮЙ».
 *   ⚠️ ҮНДСЭН ШАЛТГААН нь СЕРВЕР байв: `:3000` дээр ХУУЧИН production build
 *      (`npm run start`) ажиллаж байсан тул `/api/search/suggest` нь **404** ✗
 *      (route нь тэр build-ээс ХОЙШ нэмэгдсэн) ⇒ `npm run build && npm run start`
 *      хийх ЁСТОЙ (dev server дээр бол асуудалгүй ✓).
 *   Үүнээс гадна 2 ЖИНХЭНЭ UX алдааг зассан (`components/HomeClient.jsx`):
 *   ⓐ ДАХИН ФОКУС — «байр» бичээд гадна дараад хайрцаг руу ДАХИН ороход үг
 *      ХӨДӨЛӨӨГҮЙ тул effect ажиллахгүй ⇒ санал ГАРАХГҮЙ байв ✗ →
 *      `focusTick` (фокус бүрд trigger) + КЭШ (`suggTermRef`/`suggRef`) ⇒
 *      мөн үг дээр 0мс-д ШУУД нээгдэж, арын дэвсгэрт шинэчлэгдэнэ ✓
 *   ⓑ RACE — debounce 220ms дуусахаас ӨМНӨ blur хийвэл хожуу ирсэн хариу
 *      панелийг «үсрүүлэн» нээдэг байв ✗ → хариу хэрэглэхийн өмнө
 *      `focusedRef.current` шалгана ✓
 *   Мөн ⌨️ панель хаалттай үед ↓/↑ нь санал БАЙВАЛ ШУУД нээнэ ✓
 */

const BASE = process.argv[2] || 'http://localhost:3000';

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
} catch { /* хуучин Chrome (PUT дэмжихгүй) → доорх нөөц зам ✓ */ }
let ownTab = !list.some((t) => t.id === page?.id);
if (!page?.webSocketDebuggerUrl) {
  const pages = list.filter((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
  page = pages.find((t) => t.url.includes('localhost')) || pages[0];
  ownTab = false;
}
if (!page?.webSocketDebuggerUrl) throw new Error('CDP: нээлттэй `page` target олдсонгүй — Chrome-ыг --remote-debugging-port=9222-оор нээнэ үү');
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
const evalJs = async (expression) => {
  const call = async () => {
    const r = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error('eval: ' + String(d.exception?.description || d.text));
    }
    return r.result.value;
  };
  try { return await call(); } catch (err) {
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
  await sleep(500);
};
/** 🧪 React hydrate хүлээнэ (`__reactProps$…`) — эс бөгөөс дарсан click алга болно ✗ */
const waitHydrated = async (sel, ms = 15000) => waitFor(
  `(() => { const b = document.querySelector(${JSON.stringify(sel)}); return b && Object.keys(b).some((k) => k.startsWith('__reactProps')); })()`,
  ms,
);
let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};
const dec = (u) => decodeURIComponent(String(u)).replace(/\+/g, ' ');

/** ⌨️ React-ийн удирддаг талбарт БИЧНЭ (native setter + `input` event — React
 *  onChange сонсоно ✓). `focus()` нь React `onFocus`-ыг ажиллуулж, саналын
 *  fetch нь ЗӨВХӨН фокустай үед л явна ✓ */
const typeSearch = (sel, text) => evalJs(`(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return 'NO_INPUT';
  el.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(text)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'OK';
})()`);

/** 🔎 Саналын панелийн төлөв — input-ийн утга + саналууд ✓ */
const suggestProbe = (sel) => evalJs(`(() => {
  const inp = document.querySelector(${JSON.stringify(sel)});
  const box = document.querySelector('[data-search-suggest]');
  const items = box ? [...box.querySelectorAll('[data-suggest-item]')].map((li) => ({
    kind: li.getAttribute('data-suggest-kind'),
    value: li.getAttribute('data-suggest-value'),
    text: (li.innerText || '').replace(/\\s+/g, ' ').trim(),
  })) : [];
  return { value: inp ? inp.value : null, open: !!box, items };
})()`);

/** 🖱 Эхний саналыг дарна (сонгосон утгаа буцаана) */
const clickFirstSuggest = () => evalJs(`(() => {
  const li = document.querySelector('[data-search-suggest] [data-suggest-item]');
  if (!li) return null;
  const v = li.getAttribute('data-suggest-value');
  li.click();
  return v;
})()`);

console.log('\n🔎 CDP — Хайлтын автосанал + гарчиг/тайлбар хайлт (2026-10-05 (46)(47))\n');

// ═══════════════════ 🖥 DESKTOP (1280px) ═══════════════════
await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1200, deviceScaleFactor: 1, mobile: false });
await go(`${BASE}/`);
await waitFor(`document.querySelector('#home-search')`);
await waitHydrated('#home-search');

const combo = await evalJs(`(() => {
  const el = document.querySelector('#home-search');
  return {
    exists: !!el,
    role: el ? el.getAttribute('role') : null,
    autocomplete: el ? el.getAttribute('aria-autocomplete') : null,
    expanded: el ? el.getAttribute('aria-expanded') : null,
  };
})()`);
check('🖥 `#home-search` hydrate болсны дараа гарч ирэв', combo.exists === true);
check('♿ `role="combobox"` + `aria-autocomplete="list"` (a11y)', combo.role === 'combobox' && combo.autocomplete === 'list');
check('⬇️ Эхэндээ панель ХААЛТТАЙ (`aria-expanded="false"`)', combo.expanded === 'false', `expanded=${combo.expanded}`);

// ---- ① Бичихэд санал гарна ----
await typeSearch('#home-search', 'орон сууц');
const opened = await waitFor(`document.querySelector('[data-search-suggest]')`);
const s1 = await suggestProbe('#home-search');
check('② Бичихэд `[data-search-suggest]` саналын панель гарна', opened && s1.open === true);
check('③ Санал ЯГ 1+ байна', s1.items.length > 0, `items=${s1.items.length}`);
check('④ ХЭСЭГ/ДЭД ТӨРӨЛ санал багтсан (`data-suggest-kind="type"`)', s1.items.some((i) => i.kind === 'type'));
check('⑤ «Орон сууц» санал олдсон (статик, `lib/locationData.js`)', s1.items.some((i) => i.value === 'Орон сууц'));
check('⑥ Зарын ГАРЧИГ санал (DB `title.ilike`)', s1.items.some((i) => i.kind === 'listing'), s1.items.filter((i) => i.kind === 'listing').map((i) => i.value).join(' | ') || '(байхгүй)');
check('⑦ Панель нь `role="listbox"` (a11y)', (await evalJs(`(document.querySelector('[data-search-suggest]') || {}).getAttribute('role')`)) === 'listbox');

// ---- ② Санал дарахад шууд хайгдана ----
const picked = await clickFirstSuggest();
await sleep(700);
const s2 = await suggestProbe('#home-search');
const url2 = dec(await evalJs('location.search'));
check('⑧ 🖱 Санал дарахад хайрцагт утга нь ОРОВ', s2.value === picked, `value=${s2.value}`);
check('⑨ Саналын панель ХААГДАВ (сонгосны дараа)', s2.open === false);
check('⑩ 🔎 Хайлт ШУУД хийгдэж URL-д `?q=…` гарлаа', url2.includes('q=') && url2.includes(String(picked)), url2 || '(хоосон)');

// ---- ③ 1 тэмдэгт → санал БАЙХГҮЙ ----
await go(`${BASE}/`);
await waitFor(`document.querySelector('#home-search')`);
await waitHydrated('#home-search');
await typeSearch('#home-search', 'a');
await sleep(900); // debounce 220ms + fetch
const s3 = await suggestProbe('#home-search');
check('⑪ 1 тэмдэгтээс богино үгт санал ГАРАХГҮЙ (санал дүүрэхээс сэргийлнэ ✓)', s3.open === false, `open=${s3.open} items=${s3.items.length}`);

// ---- ④ ДАХИН фокус → санал эргэж гарна (2026-10-05 (47)) ----
await go(`${BASE}/`);
await waitFor(`document.querySelector('#home-search')`);
await waitHydrated('#home-search');
await typeSearch('#home-search', 'орон сууц');
await waitFor(`document.querySelector('[data-search-suggest]')`);
await evalJs(`document.querySelector('#home-search').blur()`);
await sleep(400);
const s4 = await suggestProbe('#home-search');
check('⑫ ⬇️ Фокус алдахад саналын панель ХААГДАНА', s4.open === false, `open=${s4.open}`);
await evalJs(`document.querySelector('#home-search').focus()`);
const reopened = await waitFor(`document.querySelector('[data-search-suggest]')`, 4000);
const s5 = await suggestProbe('#home-search');
check('⑬ 🔁 Дахин фокус (үг ХӨДӨЛӨӨГҮЙ) → санал ЭРГЭЖ ГАРНА', reopened && s5.open === true && s5.items.length > 0, `items=${s5.items.length}`);

// ---- ⑤ Blur хийсний дараа хожуу ирсэн хариу панель НЭЭХГҮЙ (race) ----
await go(`${BASE}/`);
await waitFor(`document.querySelector('#home-search')`);
await waitHydrated('#home-search');
// ⚠️ «байр» нь ҮР ДҮН БУЦААХ үг — зөвхөн race-ийг л шалгана (хоосон үг биш)
await typeSearch('#home-search', 'байр');
await evalJs(`document.querySelector('#home-search').blur()`); // debounce 220ms-ээс ӨМНӨ
await sleep(900);
const s6 = await suggestProbe('#home-search');
check('⑭ 🧯 Blur-ийн дараа хожуу ирсэн хариу панель НЭЭХГҮЙ (race)', s6.open === false, `open=${s6.open} items=${s6.items.length}`);

// ---- ⑥ ⌨️ ↓ / Enter — ГАРААС санал сонгох ----
await go(`${BASE}/`);
await waitFor(`document.querySelector('#home-search')`);
await waitHydrated('#home-search');
await typeSearch('#home-search', 'орон сууц');
await waitFor(`document.querySelector('[data-search-suggest]')`);
await evalJs(`(() => {
  const el = document.querySelector('#home-search');
  el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
  return 'OK';
})()`);
await sleep(150);
const active = await evalJs(`(() => {
  const el = document.querySelector('#home-search');
  const id = el.getAttribute('aria-activedescendant');
  const li = id ? document.getElementById(id) : null;
  return { id, value: li ? li.getAttribute('data-suggest-value') : null };
})()`);
check('⑮ ⌨️ ↓ дарахад `aria-activedescendant` тавигдав (эхний санал идэвхтэй)', !!active.id && !!active.value, `value=${active.value}`);
await evalJs(`document.querySelector('#home-search').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))`);
await sleep(700);
const s8 = await suggestProbe('#home-search');
const url8 = dec(await evalJs('location.search'));
check('⑯ ⌨️ Enter дарахад идэвхтэй санал СОНГОГДОЖ хайлт хийгдэв', s8.value === active.value && url8.includes('q='), `value=${s8.value} · ${url8}`);
check('⑯ᵇ ⌨️ Enter-ийн дараа панель ХААГДАВ', s8.open === false, `open=${s8.open}`);

const ov = await evalJs('document.documentElement.scrollWidth - window.innerWidth');
check('📐 Хэвтээ гүйлт БАЙХГҮЙ (1280px)', ov <= 0, `overflow=${ov}`);

// ═══════════════════ 📱 MOBILE (390px) ═══════════════════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await go(`${BASE}/`);
await waitFor(`document.querySelector('#home-search-mobile')`);
await waitHydrated('#home-search-mobile');
await typeSearch('#home-search-mobile', 'зарна');
const mobOpened = await waitFor(`document.querySelector('[data-search-suggest]')`);
const mobS = await suggestProbe('#home-search-mobile');
const mobOv = await evalJs('document.documentElement.scrollWidth - window.innerWidth');
check('📱 390px — мобайл хайрцагт бичихэд ч санал гарна', mobOpened && mobS.items.length > 0, `items=${mobS.items.length}`);
check('📱 390px — хэвтээ гүйлт БАЙХГҮЙ (панель багтана)', mobOv <= 0, `overflow=${mobOv}`);

check('🧯 JS exception 0', exceptions.length === 0, exceptions.join(' | ') || '0');

console.log(`\n${fail === 0 ? '✅' : '❌'} CDP ХАЙЛТ: ${pass} OK / ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);
