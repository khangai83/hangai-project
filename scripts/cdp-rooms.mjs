/**
 * 🛏🗑 CDP ШАЛГАЛТ — «Өрөөний тоо» UI ХАСАГДСАН (2026-09-30 (4))
 *
 * Хэрэглэгчийн хүсэлт: хуудсанд «1 өрөө · 2 өрөө · 3 өрөө · 4 өрөө · +5 өрөө»
 *   гэсэн ТОВЧНУУД харагдахгүй байх → 2026-09-30-нд нэмэгдсэн ХОЁР UI
 *   (sidebar-ийн ЭХНИЙ блок БА үр дүнгийн гарчиг доорх мөр) БҮРЭН ХАСАГДАВ ✓
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① DOM-д өрөө сонгох блок/товч ОГТ БАЙХГҮЙ (`[data-room-filter]` === 0,
 *      `[data-room-value]` === 0) — sidebar БА үр дүнгийн хэсэг ХОЁУЛАНД
 *   ② «1 өрөө» … «+5 өрөө» гэсэн ЯГ ТААРСАН тексттэй `<button>` БАЙХГҮЙ
 *      (selector өөрчлөгдсөн ч барих нэмэлт хамгаалалт ✓)
 *   ③ Sidebar-ийн ЭХНИЙ блок нь «Байршил» (хуучнаар «🛏 Өрөөний тоо» байв)
 *   ④ `rooms=` агуулсан HEAD query ОГТ ЯВАХГҮЙ (`fetchRoomCounts` ✓)
 *   ⑤ ⚠️ ДООД ТҮВШНИЙ ДЭМЖЛЭГ ХЭВЭЭР байх ЁСТОЙ — хуучин линк ЭВДРЭХГҮЙ:
 *      `?rooms=1,3` → DB `rooms=in.(1,3)` · `?rooms=4,5` → `rooms=gte.4` ·
 *      `?rooms=5` → `rooms=gte.5` (хуучин гэрээ) · `?rooms=abc,3,9` →
 *      URL `rooms=3,5` + DB `or=(rooms.in.(3),rooms.gte.5)`
 *   ⑥ `breadcrumb` нь «1, 3 өрөө» гэж харуулж, «Үл хөдлөх» линк дээр дарахад
 *      өрөөний шүүлт цэвэрлэгдэнэ (`clearType`)
 *   ⑦ Идэвхтэй шүүлтийн чип `🛏 1, 3 өрөө` + ✕ дарж цэвэрлэх
 *   ⑧ 📱 Мобайл 390px: хэвтээ гүйлт (overflow) ГАРАХГҮЙ, JS exception 0
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээсэн байх:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-rooms.mjs   (эсвэл npm run cdp:rooms)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:rooms` ✓
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
// ⚠️ Chrome-д олон таб нээлттэй байвал (туршилтын үед 17 таб байсан) хуучин
//    таб нь `Runtime.evaluate`-д хариу өгөхгүй hang болдог ✗
//    → хамгийн найдвартай нь ШИНЭ таб нээж (PUT /json/new) түүн дээр ажиллах ✓
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
// ⚠️ `PUT /json/new` нь табыг BACKGROUND-д нээдэг → идэвхгүй табын renderer
//    хүйтэн болж `Runtime.evaluate` нь 30с timeout болдог ✗
//    → ① HTTP `GET /json/activate/<id>` (табыг/цонхыг front-д гаргана)
//      ② доор `Page.bringToFront` (CDP) — давхар хамгаалалт ✓
try { await fetch(`http://127.0.0.1:9222/json/activate/${page.id}`); } catch { /* алгасна */ }
const ws = new WebSocket(page.webSocketDebuggerUrl);
/** ℹ️ Скрипт дуусахад (амжилттай ч, алдаатай ч) өөрөө нээсэн табаа ХААНА ✓ */
const closeOwnTab = async () => {
  if (!ownTab) return;
  try { await fetch(`http://127.0.0.1:9222/json/close/${page.id}`); } catch { /* алгасна */ }
};
// ⚠️ Top-level await-ийн алдаа эсвэл Ctrl+C (SIGTERM) үед ч таб үлдэхгүй байх ёстой ✗
//    → гарах бүх замаар `closeOwnTab()` дуудна ✓ (эс бөгөөс Chrome-д хог таб хуримтлагдана)
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
const listingReqs = [];
// 🆕 2026-09-30: чип дээрх «зарын тоо» (fetchRoomCounts) ХАСАГДСАН тул
//    тэр query ОГТ явахгүй болсныг шалгана. ⚠️ Тэр query нь
//    `count: 'exact', head: true` → HTTP МЕТОД нь **HEAD** (GET биш!)
//    тул `listingReqs` дотор ОРОХГҮЙ ✗ — тусдаа массив хэрэгтэй ✓
//    ⚠️ HEAD query-г ЗӨВХӨН өрөөгөөр шүүнэ: `fetchPropertyTypeCounts` ч
//       HEAD ашигладаг (төрөл тус бүрийн тоо) — тэр нь ХЭВЭЭР байх ёстой ✓
const roomCountReqs = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent') {
    const r = m.params.request;
    if (r.url.includes('/rest/v1/listings') && r.method === 'GET') listingReqs.push(r.url);
    if (r.url.includes('/rest/v1/listings') && r.method === 'HEAD') roomCountReqs.push(r.url);
  }
});

await rpc('Runtime.enable');
await rpc('Network.enable');
await rpc('Page.enable');
// ⚠️ `PUT /json/new` нь табыг BACKGROUND-д нээдэг → Chrome нь идэвхгүй табын
//    renderer-ийг хүйтэн болгоход `Runtime.evaluate` hang (30с timeout) болдог ✗
//    → табаа FRONT-д гаргаж тэр эрсдэлийг арилгана ✓
await rpc('Page.bringToFront');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * ⚠️ Chrome-д олон таб нээлттэй үед (эсвэл renderer ачаалалтай үед) хааяа
 *    `Runtime.evaluate` нь 30с timeout болдог ✗ → НЭГ удаа дахин оролдоно ✓
 *    (rpc нь id-г өөрөө нэмдэг тул давхар listener-ийн эрсдэл байхгүй ✓)
 */
const evalJs = async (expression) => {
  const call = async () => {
    const r = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails.text));
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
const waitFor = async (expression, ms = 9000) => {
  const until = Date.now() + ms;
  for (;;) {
    try { if (await evalJs(`!!(${expression})`)) return true; } catch { /* хуудас солигдож байна */ }
    if (Date.now() > until) return false;
    await sleep(250);
  }
};
const go = async (url) => {
  await rpc('Page.navigate', { url });
  await waitFor(`document.readyState === 'complete'`);
  await sleep(700);
};

/** 🗑 DOM-д өрөө сонгох UI үлдсэн эсэх (0 байх ЁСТОЙ) */
const roomUi = () => evalJs(`(() => {
  const btns = [...document.querySelectorAll('button')];
  const labelOnly = /^(\\+\\d|\\d) өрөө$/;
  return {
    blocks: document.querySelectorAll('[data-room-filter]').length,
    chips: document.querySelectorAll('[data-room-value]').length,
    labelBtns: btns.filter((b) => labelOnly.test(b.textContent.trim())).map((b) => b.textContent.trim()),
    toggles: btns.filter((b) => /өрөөний тоо/i.test(b.getAttribute('aria-label') || '')).length,
  };
})()`);

let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};
const url = () => evalJs('location.search');
const dbQ = (...frags) => listingReqs.some((u) => frags.every((f) => decodeURIComponent(u).includes(f)));
const lastQ = () => decodeURIComponent(listingReqs[listingReqs.length - 1] || '').split('?')[1] || '(query байхгүй)';
const body = () => evalJs('document.body.textContent');

console.log('\n🛏🗑 CDP — өрөөний тооны UI ХАСАГДСАН эсэх\n');

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });
// ═══════ ① ОРОН СУУЦ ХУУДАС: ӨРӨӨНИЙ ТОВЧ ОГТ БАЙХГҮЙ ═══════
roomCountReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}`);
const dom = await roomUi();
check('🗑 DOM-д өрөөний блок ОГТ БАЙХГҮЙ (`[data-room-filter]` === 0)', dom.blocks === 0, `blocks=${dom.blocks}`);
check('🗑 Өрөөний чип ОГТ БАЙХГҮЙ (`[data-room-value]` === 0)', dom.chips === 0, `chips=${dom.chips}`);
check('🗑 «1 өрөө» … «+5 өрөө» товч БАЙХГҮЙ (текстээр нэмж шалгав)',
  dom.labelBtns.length === 0, dom.labelBtns.join(' · ') || '(0 товч ✓)');
check('🗑 `aria-label="Өрөөний тоо"` бүлэг БАЙХГҮЙ', dom.toggles === 0);
check('📊 Зарын тоо татдаг `rooms=` HEAD query ОГТ ЯВАХГҮЙ',
  roomCountReqs.filter((u) => u.includes('rooms=')).length === 0,
  `${roomCountReqs.filter((u) => u.includes('rooms=')).length} rooms-query (нийт ${roomCountReqs.length} HEAD)`);
const sideLabels = await evalJs(`[...document.querySelectorAll('aside .divide-y > div')]
  .map((b) => (b.firstElementChild?.textContent || '').trim())`);
check('🧭 Sidebar-ийн ЭХНИЙ блок «Байршил» (хуучнаар «🛏 Өрөөний тоо» байв ✓)',
  /Байршил/.test(sideLabels[0] || ''), sideLabels.join(' → '));
check('🧭 Sidebar-д «Өрөөний тоо» блок БАЙХГҮЙ',
  !sideLabels.some((l) => /Өрөөний тоо/.test(l)), sideLabels.join(' → '));

// ═══════ ② ТӨРӨЛ СОНГООГҮЙ Ч ХУУДАС ЦЭВЭР ═══════
await go(`${BASE}/?section=real-estate`);
const domNoType = await roomUi();
check('🗑 Төрөл сонгоогүй үед ч өрөөний блок/товч БАЙХГҮЙ',
  domNoType.blocks === 0 && domNoType.labelBtns.length === 0);
const noTypeLabels = await evalJs(`[...document.querySelectorAll('aside .divide-y > div')]
  .map((b) => (b.firstElementChild?.textContent || '').trim())`);
check('🧭 Төрөл сонгоогүй үед ч «Өрөөний тоо» блок БАЙХГҮЙ',
  !noTypeLabels.some((l) => /Өрөөний тоо/.test(l)), noTypeLabels.join(' → ') || '(aside байхгүй ✓)');

// ═══════ ③ ХУУЧИН ЛИНК `?rooms=1,3` — URL/DB ХЭВЭЭР (линк эвдрэхгүй) ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=1,3`);
check('🔗 `?rooms=1,3` линк URL-д ХЭВЭЭР үлдэв',
  decodeURIComponent(await url()).includes('rooms=1,3'), decodeURIComponent(await url()));
await sleep(1200);   // ⏳ DB query дуустахыг хүлээ (детермен)
check('🔎 DB: rooms=in.(1,3) — шүүлт ХЭВЭЭР ажиллана', dbQ('rooms=in.(1,3)'), lastQ());
check('🏷 Шошго «1, 3 өрөө» харагдана (breadcrumb ба идэвхтэй чип)', /1, 3 өрөө/.test(await body()));
check('🍞 Breadcrumb дээр «1, 3 өрөө» байна',
  /1, 3 өрөө/.test(await evalJs(`document.querySelector('nav')?.textContent || ''`)));
check('🗑 Гэхдээ өрөөний товч БАЙХГҮЙ (шүүлт нь зөвхөн линкээс ирнэ ✓)', (await roomUi()).chips === 0);
// ═══════ ④ ИДЭВХТЭЙ ШҮҮЛТИЙН ЧИПИЙГ ✕ дарж цэвэрлэх ═══════
const CHIP_BTN = `[...document.querySelectorAll('button')]
  .find((x) => /хайлтыг хасах/.test(x.getAttribute('aria-label') || '')
    && /өрөө/.test(x.getAttribute('aria-label') || ''))`;
const chipLabel = await evalJs(`(() => { const b = ${CHIP_BTN}; return b ? b.getAttribute('aria-label') : 'NO_CHIP'; })()`);
check('🎛 Идэвхтэй шүүлтийн чип `🛏 1, 3 өрөө` олдлоо', chipLabel !== 'NO_CHIP', chipLabel);
listingReqs.length = 0;
// ⚠️ Чип олдоогүй бол `click` ХИЙХГҮЙ — эс бөгөөс доорх `waitFor` хоосон
//    30с хүлээж скрипт «timeout» алдаагаар унана ✗ (тест унах ёстой, гацахгүй)
const chipClicked = chipLabel !== 'NO_CHIP'
  ? await evalJs(`(() => { const b = ${CHIP_BTN}; if (!b) return 'NO_CHIP'; b.click(); return 'OK'; })()`)
  : 'NO_CHIP';
check('🎛 ✕ товч дарагдав', chipClicked === 'OK', chipClicked);
await waitFor(`!/rooms=/.test(location.search)`);
check('🎛 ✕ дарвал URL-аас rooms арилав', !/rooms=/.test(await url()), (await url()) || '(хоосон)');
await sleep(1200);
check('🔎 DB: rooms шүүлт ч арилав', !dbQ('rooms='), lastQ());

// ═══════ ⑤ DB ДҮРЭМ ХЭВЭЭР (хуучин линкүүд эвдрэхгүй) ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=4,5`);
await sleep(1200);
check('🔎 `?rooms=4,5` → DB: rooms=gte.4 (4+ ба 5+ нэгтгэнэ ✓)', dbQ('rooms=gte.4'), lastQ());
listingReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=5`);
await sleep(1200);
check('📌 `?rooms=5` → DB: rooms=gte.5 (ХУУЧИН гэрээ ЯГ ижил ✓)', dbQ('rooms=gte.5'), lastQ());
listingReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=abc,3,9`);
const norm = decodeURIComponent(await url());
check('🧹 `rooms=abc,3,9` → URL `rooms=3,5` (abc хаягдаж, 9 → 5+)', norm.includes('rooms=3,5'), norm);
await sleep(1200);
check('🧹 DB: or=(rooms.in.(3),rooms.gte.5)', dbQ('or=(rooms.in.(3),rooms.gte.5)'), lastQ());

// ═══════ ⑥ BREADCRUMB ЛИНК ӨРӨӨНИЙ ШҮҮЛТИЙГ ЦЭВЭРЛЭНЭ ═══════
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=1,3`);
const crumbClick = await evalJs(`(() => {
  const nav = [...document.querySelectorAll('nav')].find((n) => /Бүх зар/.test(n.textContent));
  if (!nav) return 'NO_NAV';
  const link = [...nav.querySelectorAll('a, button')].find((x) => x.textContent.trim() === 'Үл хөдлөх');
  if (!link) return 'NO_LINK:' + [...nav.querySelectorAll('a, button')].map((x) => x.textContent.trim()).join(' | ');
  link.click();
  return 'OK';
})()`);
check('🍞 «Үл хөдлөх» breadcrumb линк олдлоо (clearType → rooms: [])', crumbClick === 'OK', crumbClick);
await waitFor(`!/rooms=/.test(location.search)`);
check('🍞 Дарахад өрөөний шүүлт ЦЭВЭРЛЭГДЭВ (rooms арилав)', !/rooms=/.test(await url()), await url());

// ═══════ ⑦ МОБАЙЛ (390×844) ═══════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=2`);
check('📱 Мобайл: өрөөний товч БАЙХГҮЙ', (await roomUi()).chips === 0);
check('📱 Мобайл: хэвтээ гүйлт (overflow) ГАРАХГҮЙ',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'),
  await evalJs('document.documentElement.scrollWidth + "/" + window.innerWidth'));
await rpc('Emulation.clearDeviceMetricsOverride');

// ═══════ ⑧ ДҮГНЭЛТ ═══════
check('🧯 Консол дээр exception ГАРАГҮЙ', exceptions.length === 0, exceptions.slice(0, 2).join(' | '));
console.log(`\n${fail === 0 ? '✅' : '❌'} CDP — ${pass} OK, ${fail} FAIL\n`);
ws.close();
await closeOwnTab();
process.exit(fail === 0 ? 0 : 1);
