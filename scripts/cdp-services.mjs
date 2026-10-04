/**
 * 🛠️🏥 CDP ШАЛГАЛТ — «Үйлчилгээ» ХЭСГИЙН 3 ТҮВШНИЙ МОД
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-05 (44)):
 *   «Үйлчилгээ > Барилга & Засвар үйлчилгээ дээр Гагнуурын үйлчилгээ гэж нэм.
 *    Үйлчилгээ дээр Эмнэлэг гэж категори оруулаад дараахыг оруул:
 *    Шүдний эмнэлэг · Эрэгтэйчүүдийн эмнэлэг · Эмэгтэйчүүдийн эмнэлэг»
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① 🏷 Бүлгийн ГАРЧИГ 7 мөр (`<p>`) — хуучин ДАРААЛАЛ ХӨНДӨӨГДӨӨГҮЙ,
 *      ХАМГИЙН СҮҮЛД 🆕 «Эмнэлэг»; leaf бүлэг («Хэвлэл, реклам, медиа») нь
 *      ГАРЧИГ БИШ, өөрөө СОНГОГДОХ мөр хэвээр ✓
 *   ② 🔢 Нийт дэд төрөл **32** (28 → 32): «Гагнуурын үйлчилгээ» нь
 *      «Барилга & Засвар үйлчилгээ» бүлгийн 6 дахь (сүүлийн) мөр, 🆕 «Эмнэлэг»
 *      бүлэг нь ЯГ 3 дэд төрөлтэй ✓
 *   ③ ⚠️ Бүлгийн НЭР («Эмнэлэг») нь `property_type` БИШ — сонгогдох мөр
 *      БАЙХГҮЙ (DB-д «Эмнэлэг» гэсэн зар ХЭЗЭЭ Ч үүсэхгүй ✓)
 *   ④ 🖱 Дэд төрөл дарж `?section=services&type=…` + breadcrumb 4 түвшин
 *      («Бүх зар › Үйлчилгээ › Эмнэлэг › Шүдний эмнэлэг») ✓
 *   ⑤ 🔗 Шууд линкээр ороход хэсгийн панель ХААЛТТАЙ (дэд төрөл сонгосон
 *      төлөв) — breadcrumb ба гарчиг зөв ✓
 *   ⑥ 📱 390px: «Эмнэлэг» харагдана, 32 мөр, хэвтээ гүйлт 0 ✓
 *   ⑦ 🧯 JS exception 0
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээнэ:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-services.mjs   (эсвэл npm run cdp:services)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:filters` ✓
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
// ⚠️ Chrome-д олон таб нээлттэй байвал хуучин таб нь `Runtime.evaluate`-д
//    хариу өгөхгүй hang болдог ✗ → ШИНЭ таб нээж (PUT /json/new) ажиллана ✓
let page = null;
try {
  const created = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (created.ok) page = await created.json();
} catch { /* хуучин Chrome (PUT дэмжихгүй) → доорх нөөц зам ✓ */ }
let ownTab = !list.some((t) => t.id === page?.id);
if (!page?.webSocketDebuggerUrl) {
  const pages = list.filter((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
  page = pages.find((t) => t.url.includes('localhost:3000')) || pages[0];
  ownTab = false;
}
if (!page?.webSocketDebuggerUrl) throw new Error('CDP: нээлттэй `page` target олдсонгүй — Chrome-ыг --remote-debugging-port=9222-оор нээнэ үү');
try { await fetch(`http://127.0.0.1:9222/json/activate/${page.id}`); } catch { /* алгасна */ }
const ws = new WebSocket(page.webSocketDebuggerUrl);
/** ℹ️ Скрипт дуусахад (амжилттай ч, алдаатай ч) өөрөө нээсэн табаа ХААНА ✓ */
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
// ⚠️ `PUT /json/new` нь табыг BACKGROUND-д нээдэг → идэвхгүй табын renderer
//    хүйтэн болж `Runtime.evaluate` нь 30с timeout болдог ✗ → FRONT-д гаргана ✓
await rpc('Page.bringToFront');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** ⚠️ Renderer ачаалалтай үед `Runtime.evaluate` хааяа timeout болдог ✗ → дахин оролдоно */
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
/** Нөхцөл биелэх хүртэл хүлээнэ (тогтмол `sleep`-ээс найдвартай ✓) */
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
/** 🏠 ХЭСГИЙН ПАНЕЛИЙН төлөв — `data-section-panel` доторхыг л тоолно ✓
 *  ⚠️ ЭНЭ PROBE нь TEMPLATE LITERAL — коммент дотор BACKTICK БИЧИХГҮЙ ✗ */

console.log('\n🛠️🏥 CDP — Үйлчилгээ: «Гагнуурын үйлчилгээ» + 🆕 «Эмнэлэг» бүлэг (2026-10-05 (44))\n');

/** 🛠 ПАНЕЛИЙН төлөв — `[data-section-panel]` дотроос л тоолно ✓
 *  ⚠️ Дэд төрөл сонгомогц панель БҮРЭН арилдаг тул энэ нь ЗӨВХӨН
 *     «хэсэг сонгосон, дэд төрөл сонгоогүй» төлөвт утгатай — доорх
 *     `pageUi()` нь тэр үед ч ажиллана ✓ */
const panelUi2 = () => evalJs(`(() => {
  const panel = document.querySelector('[data-section-panel]');
  if (!panel) return { panel: false };
  const txt = (el) => (el.innerText || el.textContent || '').trim();
  const heads = [...panel.querySelectorAll('p')]
    .filter((p) => String(p.className || '').includes('text-primary-dark'));
  const lists = [...panel.querySelectorAll('div[role="tablist"]')].map((d) => ({
    label: d.getAttribute('aria-label'),
    items: [...d.querySelectorAll('button[role="tab"]')].map(txt),
  }));
  return {
    panel: true,
    heads: heads.map(txt),
    lists,
    tabs: [...panel.querySelectorAll('button[role="tab"]')].map(txt),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
})()`);

/** 🧭 ХУУДСНЫ төлөв (панель БАЙХГҮЙ үед ч) — breadcrumb / h1 / overflow */
const pageUi = () => evalJs(`(() => {
  const crumb = document.querySelector('nav[aria-label="Замчилсан цэс"]');
  const h1 = document.querySelector('h1');
  const txt = (el) => (el ? String(el.innerText || '').replace(/\\s+/g, ' ').trim() : null);
  return {
    crumb: txt(crumb),
    h1: txt(h1),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
})()`);

/** 🖱 Панель доторх дэд төрлийн мөрийг ШОШГООР нь дарна */
const clickTab = (label) => evalJs(`(() => {
  const panel = document.querySelector('[data-section-panel]');
  if (!panel) return 'NO_PANEL';
  const b = [...panel.querySelectorAll('button[role="tab"]')]
    .find((x) => ((x.innerText || x.textContent || '').trim() === ${JSON.stringify(label)}));
  if (!b) return 'NOT_FOUND';
  b.click();
  return 'OK';
})()`);

let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};
const url = () => evalJs('location.search');
const dec = (u) => decodeURIComponent(String(u)).replace(/\+/g, ' ');
const ORDER_7 = 'Боловсрол & Сургалт|Барилга & Засвар үйлчилгээ|Өрх гэр & Ахуйн үйлчилгээ|'
  + 'Аялал, Амралт & Гоо сайхан|Технологи & Авто засвар|Бизнес, Санхүү & Хууль|Эмнэлэг';

// ═══════════════════ 🖥 DESKTOP (1280px) ═══════════════════
await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });
await go(`${BASE}/?section=services`);
await waitFor(`document.querySelectorAll('[data-section-panel] button[role="tab"]').length > 0`);
const s = await panelUi2();

check('🛠 Хэсгийн панель нээгдэв (`[data-section-panel]`)', s.panel === true);
check('🏷 Бүлгийн ГАРЧИГ 7 (`<p>`) — 8 дахь (leaf «Хэвлэл, реклам, медиа») нь СОНГОГДОХ мөр',
  s.heads.length === 7, `heads=${s.heads.length}`);
check('🏷 Гарчгуудын дараалал ХЭВЭЭР + ХАМГИЙН СҮҮЛД «Эмнэлэг» (хуучин 7 ХӨНДӨӨГДӨӨГҮЙ)',
  s.heads.join('|') === ORDER_7, s.heads.join(' | '));
check('🗂 Блок (tablist) 8 — бүлэг 7 + leaf 1', s.lists.length === 8, `lists=${s.lists.length}`);
check('🔢 Нийт дэд төрөл 28 → 32', s.tabs.length === 32, `tabs=${s.tabs.length}`);

const build = s.lists.find((g) => g.label === 'Барилга & Засвар үйлчилгээ') || { items: [] };
check('🆕 «Гагнуурын үйлчилгээ» — «Барилга & Засвар үйлчилгээ» бүлгийн 6 дахь (СҮҮЛИЙН) мөр',
  build.items.join('|') === 'Барилгын бүх ажил|Цахилгаан бараа засвар|Тавилга ба мужаан|Түлхүүр/цоож засвар|Сантехник|Гагнуурын үйлчилгээ',
  build.items.join(' | '));

const em = s.lists.find((g) => g.label === 'Эмнэлэг') || { items: [] };
check('🆕 «Эмнэлэг» бүлэг ЯГ 3 дэд төрөлтэй (хэрэглэгчийн жагсаалтын дарааллаар)',
  em.items.join('|') === 'Шүдний эмнэлэг|Эрэгтэйчүүдийн эмнэлэг|Эмэгтэйчүүдийн эмнэлэг',
  em.items.join(' | '));
check('⚠️ «Эмнэлэг» (бүлгийн нэр) нь СОНГОГДОХ мөр БИШ (бүлэг нь property_type болохгүй ✓)',
  !s.tabs.includes('Эмнэлэг'));
check('📐 Хэвтээ гүйлт БАЙХГҮЙ (1280px)', s.overflow <= 0, `overflow=${s.overflow}`);

// ─────── 🖱 «Шүдний эмнэлэг» → URL + breadcrumb (3 дахь түвшин нэмэгдэнэ) ───────
check('🖱 «Шүдний эмнэлэг» дэд төрөл дардагдав', (await clickTab('Шүдний эмнэлэг')) === 'OK');
// ⚠️ URL нь breadcrumb-аас ХОЦРОХ хааяа тохиолддог (router.replace) → URL-ээ хүлээнэ ✓
await waitFor(`/Шүдний эмнэлэг/.test(decodeURIComponent(location.search))`);
const q2 = dec(await url());
check('🔗 URL нь `?section=services&type=Шүдний эмнэлэг`',
  q2.includes('section=services') && q2.includes('type=Шүдний эмнэлэг'), q2);
await waitFor(`/Шүдний эмнэлэг/.test(String((document.querySelector('nav[aria-label="Замчилсан цэс"]') || {}).innerText || ''))`);
const s2 = await pageUi();
const c2 = String(s2.crumb || '');
check('🧭 Breadcrumb 4 түвшин — «Үйлчилгээ › Эмнэлэг › Шүдний эмнэлэг» дараалалтай',
  c2.includes('Үйлчилгээ') && c2.includes('Эмнэлэг') && c2.includes('Шүдний эмнэлэг')
  && c2.indexOf('Үйлчилгээ') < c2.indexOf('Эмнэлэг') && c2.indexOf('Эмнэлэг') < c2.indexOf('Шүдний эмнэлэг'), c2);
check('🏷 Үр дүнгийн гарчиг `Шүдний эмнэлэг …`', /Шүдний эмнэлэг/.test(String(s2.h1 || '')), String(s2.h1));
check('📐 Дэд төрөл сонгосон үед мобайл/десктоп гүйлт 0', s2.overflow <= 0, `overflow=${s2.overflow}`);

// ─────── 🖱 «Гагнуурын үйлчилгээ» → БАРИЛГА бүлгийн breadcrumb (шинэ leaf) ───────
await go(`${BASE}/?section=services`);
await waitFor(`document.querySelectorAll('[data-section-panel] button[role="tab"]').length > 0`);
check('🖱 «Гагнуурын үйлчилгээ» дэд төрөл дардагдав', (await clickTab('Гагнуурын үйлчилгээ')) === 'OK');
// ⚠️ URL нь breadcrumb-аас ХОЦРОХ хааяа тохиолддог (router.replace) → URL-ээ хүлээнэ ✓
await waitFor(`/Гагнуурын үйлчилгээ/.test(decodeURIComponent(location.search))`);
const q3 = dec(await url());
check('🔗 URL нь `?section=services&type=Гагнуурын үйлчилгээ`',
  q3.includes('type=Гагнуурын үйлчилгээ'), q3);
await waitFor(`/Гагнуурын үйлчилгээ/.test(String((document.querySelector('nav[aria-label="Замчилсан цэс"]') || {}).innerText || ''))`);
const s3 = await pageUi();
const c3 = String(s3.crumb || '');
check('🧭 Breadcrumb — «Барилга & Засвар үйлчилгээ › Гагнуурын үйлчилгээ» дараалалтай',
  c3.includes('Барилга & Засвар үйлчилгээ') && c3.includes('Гагнуурын үйлчилгээ')
  && c3.indexOf('Барилга & Засвар үйлчилгээ') < c3.indexOf('Гагнуурын үйлчилгээ'), c3);
check('🏷 Үр дүнгийн гарчиг `Гагнуурын үйлчилгээ …`', /Гагнуурын үйлчилгээ/.test(String(s3.h1 || '')), String(s3.h1));

// ─────── 🔗 ШУУД ЛИНК (3 дахь шинэ дэд төрөл) ───────
await go(`${BASE}/?section=services&type=Эмэгтэйчүүдийн эмнэлэг`);
await waitFor(`/Эмэгтэйчүүдийн эмнэлэг/.test(String((document.querySelector('nav[aria-label="Замчилсан цэс"]') || {}).innerText || ''))`);
const s4 = await pageUi();
const c4 = String(s4.crumb || '');
check('🔗 Шууд линк — breadcrumb «Эмнэлэг › Эмэгтэйчүүдийн эмнэлэг»',
  c4.includes('Эмнэлэг') && c4.includes('Эмэгтэйчүүдийн эмнэлэг'), c4);
check('🖥 Шууд линкээр ороход хэсгийн панель ХААЛТТАЙ (дэд төрөл сонгосон ✓)',
  (await panelUi2()).panel === false);
check('🏷 Үр дүнгийн гарчиг `Эмэгтэйчүүдийн эмнэлэг …`',
  /Эмэгтэйчүүдийн эмнэлэг/.test(String(s4.h1 || '')), String(s4.h1));

// ═══════════════════ 📱 МОБАЙЛ (390px) ═══════════════════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await go(`${BASE}/?section=services`);
await waitFor(`document.querySelectorAll('[data-section-panel] button[role="tab"]').length > 0`);
const m = await panelUi2();
check('📱 390px — «Эмнэлэг» гарчиг ХАРАГДАНА', m.heads.includes('Эмнэлэг'), m.heads.join(' | '));
check('📱 390px — дэд төрөл 32 ХЭВЭЭР (бүгд нээлттэй ✓)', m.tabs.length === 32, `tabs=${m.tabs.length}`);
check('📱 390px — хэвтээ гүйлт (overflow) 0', m.overflow <= 0, `overflow=${m.overflow}`);

check('🧯 JS exception 0', exceptions.length === 0, exceptions.slice(0, 3).join(' | '));

console.log(`\n${fail === 0 ? '✅' : '❌'} CDP — ${pass} OK, ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);

