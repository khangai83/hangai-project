/**
 * 🏠 CDP ШАЛГАЛТ — нүүр хуудсны ХЭСГИЙН ПАНЕЛЬ (2 алхамт drill)
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-04):
 *   «үл хөдлөх рүү ороход Үл хөдлөх зарна, Үл хөдлөх түрээслүүлнэ гэж
 *    харагдуул, түүний дотрох Орон сууц, Газар гэх мэтийг энэ үед бүү харуул»
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① 🏠 үл хөдлөх рүү ОРОХ үед панель ЗӨВХӨН категори
 *      («Үл хөдлөх зарна / Үл хөдлөх түрээслүүлнэ» — 🗑 «Бүгд» 2026-10-07-д ХАСАГДАВ) харуулна —
 *      дэд төрөл (`Орон сууц`, `Газар`, …) ХАРАГДАХГҮЙ ✓
 *   ② «Үл хөдлөх зарна» / «…түрээслүүлнэ» сонгомогц Л дэд төрлүүд (8)
 *      багана болж гарна (`getPropertyTypeLabel(t, category)`) ✓
 *   ③ 🗑 «Бүгд» (`all`) сонголт DOM-д ОГТ БАЙХГҮЙ ✓
 *   ④ Категоригүй хэсэг (🚗 Автомашин) ХӨНДӨГДӨӨГҮЙ — сегмент БАЙХГҮЙ,
 *      дэд төрлүүд ШУУД харагдана ✓
 *   ⑤ 🔗 Линкээр (`?category=rent`) орж ирэхэд дэд төрлүүд ШУУД нээлттэй ✓
 *   ⑥ 📱 390px: БОГИНО шошго («Зарна / Түрээслүүлнэ»), орох үед дэд
 *      төрөл БАЙХГҮЙ, хэвтээ гүйлт (overflow) 0 ✓
 *   ⑦ 🗑 МОБАЙЛ ХАЙЛТЫН МӨРӨНД «Хэсэг» `<select>` БАЙХГҮЙ (2026-10-04 (34):
 *      хэрэглэгчийн хүсэлт «home-search-mobile-section ийг … байхгүй болгоё»)
 *      — `#home-search-mobile-section` нь DOM-оос БҮРЭН арилсан; харин ТОЛГОЙН
 *      pill (`#home-search-section`) 13 option-той ХЭВЭЭР ✓
 *   ⑧ 🧯 JS exception 0
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээсэн байх:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-sections.mjs   (эсвэл npm run cdp:sections)
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
const panelUi = () => evalJs(`(() => {
  const panel = document.querySelector('[data-section-panel]');
  const seg = [...document.querySelectorAll('[data-category-value]')];
  const subs = panel ? [...panel.querySelectorAll('button[role="tab"]')] : [];
  const txt = (b) => (b.innerText || b.textContent || '').trim();
  return {
    panel: !!panel,
    seg: seg.length,
    values: seg.map((b) => b.getAttribute('data-category-value')),
    labels: seg.map(txt),
    active: seg.filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.getAttribute('data-category-value')),
    subs: subs.length,
    subFirst: subs.length ? txt(subs[0]) : null,
    text: panel ? (panel.innerText || '') : '',
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
})()`);

/** 🎛 Категори сегментийг дарах (утга: sell / rent / all) */
const clickCat = (value) => evalJs(`(() => {
  const b = document.querySelector('[data-category-value="${value}"]');
  if (!b) return 'NO_SEG';
  b.click();
  return 'OK';
})()`);

let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};
const url = () => evalJs('location.search');
const dec = (u) => decodeURIComponent(u).replace(/\+/g, ' ');

console.log('\n🏠 CDP — нүүр хуудсны хэсгийн панель (2 алхамт drill)\n');

// ═══════════════════ 🖥 DESKTOP (1280px) ═══════════════════
await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });

// ─────── ① ОРОХ ҮЕ — ЗӨВХӨН КАТЕГОРИ, ДЭД ТӨРӨЛ БАЙХГҮЙ ───────
await go(`${BASE}/?section=real-estate`);
await waitFor(`!!document.querySelector('[data-category-value]')`);
const d0 = await panelUi();
check('🏠 Хэсгийн панель нээгдэв (`[data-section-panel]`)', d0.panel === true);
check('🎛 Категори 2 линк (sell → rent; «Бүгд» 2026-10-07-д ХАСАГДАВ)',
  d0.seg === 2 && d0.values.join(',') === 'sell,rent', `values=[${d0.values.join(',')}]`);
check('🎛 Анхдагч: идэвхтэй категори БАЙХГҮЙ (ерөнхий харагдац)', d0.active.length === 0, `active=[${d0.active.join(',')}]`);
check('🏷 Бүтэн шошго (🖥 «Үл хөдлөх зарна / …түрээслүүлнэ», «Бүгд» БАЙХГҮЙ)',
  d0.labels.join('|') === 'Үл хөдлөх зарна|Үл хөдлөх түрээслүүлнэ', d0.labels.join('|'));
check('🆕 ОРОХ ҮЕД дэд төрөл ХАРАГДАХГҮЙ (0 мөр — хүсэлт «бүү харуул» ✓)',
  d0.subs === 0, `subs=${d0.subs}`);
check('🆕 Панелийн ТЕКСТЭД «Орон сууц»/«Газар» БАЙХГҮЙ',
  !/Орон сууц/.test(d0.text) && !/Газар/.test(d0.text));
check('📐 Хэвтээ гүйлт БАЙХГҮЙ (1280px)', d0.overflow <= 0, `overflow=${d0.overflow}`);

// ─────── ② «Үл хөдлөх зарна» → ДЭД ТӨРЛҮҮД ГАРНА ───────
check('🎛 «Үл хөдлөх зарна» дардагдав', (await clickCat('sell')) === 'OK');
await waitFor(`document.querySelectorAll('[data-section-panel] button[role="tab"]').length > 0`);
const d1 = await panelUi();
check('🆕 «Үл хөдлөх зарна» сонгомогц дэд төрлүүд ГАРНА (8)', d1.subs === 8, `subs=${d1.subs}`);
check('🗑 Категори сонгомогц сонголт (зарна/түрээслүүлнэ) ХАРАГДАХГҮЙ', d1.seg === 0, `seg=${d1.seg}`);
check('🆕 Эхний мөр «Орон сууц зарна» (категори нь шошгонд шингэв)',
  String(d1.subFirst).startsWith('Орон сууц зарна'), String(d1.subFirst));
// ⚠️ `router.replace` нь click-ийн дараа НЭГ tick-д хийгддэг тул хүлээнэ ✓
await waitFor(`decodeURIComponent(location.search).includes('category=sell')`);
const uSell = dec(await url());
check('🔗 URL `?category=sell` болов', uSell.includes('category=sell'), uSell);

// ─────── ③ «Үл хөдлөх түрээслүүлнэ» → ТҮРЭЭСИЙН ДЭД ТӨРЛҮҮД ───────
//  ⚠️ 2026-10-07: категори сонгосон үед сонголт ХАРАГДАХГҮЙ тул эхлээд буцаана ✓
await go(`${BASE}/?section=real-estate`);
await waitFor(`!!document.querySelector('[data-category-value="rent"]')`);
check('🎛 «Үл хөдлөх түрээслүүлнэ» дардагдав', (await clickCat('rent')) === 'OK');
await waitFor(`/Орон сууц түрээслүүлнэ/.test(document.querySelector('[data-section-panel]') ? document.querySelector('[data-section-panel]').innerText : '')`);
const d2 = await panelUi();
check('🆕 Түрээс дээр «Орон сууц түрээслүүлнэ» гарна',
  String(d2.subFirst).startsWith('Орон сууц түрээслүүлнэ'), String(d2.subFirst));
await waitFor(`decodeURIComponent(location.search).includes('category=rent')`);
const uRent = dec(await url());
check('🔗 URL `?category=rent` болов', uRent.includes('category=rent'), uRent);

// ─────── ④ 🗑 «Бүгд» БАЙХГҮЙ + буцах зам ───────
const hasAll = await evalJs(`document.querySelectorAll('[data-category-value="all"]').length`);
check('🗑 «Бүгд» (`all`) сонголт DOM-д ОГТ БАЙХГҮЙ', hasAll === 0, `count=${hasAll}`);
await go(`${BASE}/?section=real-estate`);
await waitFor(`!!document.querySelector('[data-category-value="sell"]')`);
const d3 = await panelUi();
check('🆕 Хэсэг рүү буцвал дэд төрлүүд ДАХИН ХААГДАВ (ерөнхий харагдац)',
  d3.subs === 0 && d3.seg === 2, `subs=${d3.subs}, seg=${d3.seg}`);
// ─────── ⑤ КАТЕГОРИГҮЙ ХЭСЭГ ХӨНДӨГДӨӨГҮЙ ───────
await go(`${BASE}/?section=auto`);
await waitFor(`!!document.querySelector('[data-section-panel] button[role="tab"]')`);
const a0 = await panelUi();
check('🚗 Категоригүй хэсэг (Автомашин) — сегмент БАЙХГҮЙ', a0.seg === 0, `seg=${a0.seg}`);
check('🚗 Автомашинд дэд төрлүүд ШУУД харагдана (10) — хөндөгдөөгүй',
  a0.subs === 10, `subs=${a0.subs}`);

// ─────── ⑥ 🔗 ЛИНКЭЭР ОРОХ (`?category=rent`) ───────
await go(`${BASE}/?section=real-estate&category=rent`);
await waitFor(`document.querySelectorAll('[data-section-panel] button[role="tab"]').length > 0`);
const l0 = await panelUi();
check('🔗 Линкээр орж ирэхэд дэд төрлүүд ШУУД ГАРНА (8)', l0.subs === 8, `subs=${l0.subs}`);
check('🗑 Линкээр ороход ч категори сонголт ХАРАГДАХГҮЙ (түрээс сонгогдсон)', l0.seg === 0, `seg=${l0.seg}`);

// ─────── ⑦ 🔍 ТОЛГОЙН ХАЙЛТЫН МӨР — «Хэсэг» PILL ХЭВЭЭР / МОБАЙЛ НЬ АРИЛСАН ───────
//  (2026-10-04 (34) — хэрэглэгчийн хүсэлт: «home-search-mobile-section ийг …
//   байхгүй болгоё»; ⚠️ мобайл pill нь CSS-ээр НУУГДААГҮЙ — DOM-оос БҮРЭН ХАСАГДАВ)
const hp = JSON.parse(await evalJs(`JSON.stringify({
  header: !!document.querySelector('#home-search-section'),
  mobile: !!document.querySelector('#home-search-mobile-section'),
  opts: document.querySelectorAll('[data-hero-section] option').length,
})`));
check('🖥 1280px: толгойн «Хэсэг» pill ХЭВЭЭР (`#home-search-section`)', hp.header === true);
check('🖥 1280px: pill-д 13 option (`data-hero-section`)', hp.opts === 13, `opts=${hp.opts}`);
check('🗑 1280px: мобайл pill DOM-д БАЙХГҮЙ (`#home-search-mobile-section`)', hp.mobile === false);

// ═══════════════════ 📱 MOBILE (390px) ═══════════════════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await go(`${BASE}/?section=real-estate`);
await waitFor(`!!document.querySelector('[data-category-value]')`);
const m0 = await panelUi();
check('📱 390px: БОГИНО шошго («Зарна / Түрээслүүлнэ», «Бүгд» БАЙХГҮЙ)',
  m0.labels.join('|') === 'Зарна|Түрээслүүлнэ', m0.labels.join('|'));
check('📱 390px: орох үед дэд төрөл ХАРАГДАХГҮЙ', m0.subs === 0, `subs=${m0.subs}`);
check('📱 390px: хэвтээ гүйлт БАЙХГҮЙ', m0.overflow <= 0, `overflow=${m0.overflow}`);
check('📱 390px: «Зарна» дардагдав', (await clickCat('sell')) === 'OK');
await waitFor(`document.querySelectorAll('[data-section-panel] button[role="tab"]').length > 0`);
const m1 = await panelUi();
check('📱 390px: «Зарна» дарвал дэд төрлүүд ГАРНА (8)', m1.subs === 8, `subs=${m1.subs}`);
check('📱 390px: дэд төрөлтэй ч гүйлт БАЙХГҮЙ', m1.overflow <= 0, `overflow=${m1.overflow}`);

// ─────── ⑦ 🗑 390px: МОБАЙЛ МӨРӨНД «Хэсэг» PILL (ба `<select>`) БАЙХГҮЙ ───────
//  ⏳ Өмнө нь [pill][талбар][Хайх][📍] дөрвүүлээ 390px-д багтахын тулд хайлтын
//     талбар 67px болтлоо шахагддаг байв ✗ → pill арилснаар талбар өргөн болов ✓
const mS = JSON.parse(await evalJs(`(() => {
  const inp = document.querySelector('#home-search-mobile');
  const form = inp ? inp.closest('form') : null;
  return JSON.stringify({
    pill: !!document.querySelector('#home-search-mobile-section'),
    inp: !!inp,
    selects: form ? form.querySelectorAll('select').length : -1,
    w: inp ? Math.round(inp.getBoundingClientRect().width) : 0,
  });
})()`));
check('🗑 390px: мобайл pill БАЙХГҮЙ (`#home-search-mobile-section` — DOM-д ч алга)', mS.pill === false);
check('📱 390px: мобайл хайлтын талбар ХЭВЭЭР (`#home-search-mobile`)', mS.inp === true);
check('🗑 390px: мобайл мөрөнд `<select>` ОГТ БАЙХГҮЙ (0)', mS.selects === 0, `selects=${mS.selects}`);
check('📐 390px: хайлтын талбар өргөн болов (pill-ийн ~160px буцаж ирэв)',
  mS.w >= 180, `w=${mS.w}px`);

// ─────── 🧯 EXCEPTIONS ───────
await sleep(400);
check('🧯 JS exception 0', exceptions.length === 0, exceptions.join(' | '));

console.log(`\n${fail === 0 ? '✅ БҮГД ОК' : '❌ АЛДАА'} — ${pass} OK / ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);



