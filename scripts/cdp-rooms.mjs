/**
 * 🛏 CDP ШАЛГАЛТ — «Өрөөний тоо» шүүлт (UI + URL + DB + breadcrumb)
 *
 * 🆕 2026-10-03 (4): ХЭРЭГЛЭГЧИЙН ХҮСЭЛТЭЭР UI ЭРГЭЖ ИРЭВ —
 *   «Орон сууц → Дэлгэрэнгүй хайлт» дээр «1 өрөө … +5 өрөө» чипүүд нь
 *   ХОРООНЫ блоктой ИЖИЛ хэв маягаар, «Үнэ, ₮»-ний ДЭЭР байрлана ✓
 *   ⚠️ 2026-09-30 (4)-д «товчнууд харагдахгүй байх» гэсэн хүсэлтээр
 *      хасагдсан байсан тул энэ скрипт тэр үед «DOM-д ЯГ 0» гэж шалгадаг байв ✗
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① Орон сууц дээр чип БАЙГАА: `[data-room-filter]` === 1,
 *      `[data-room-value]` === 5, шошгууд «1 өрөө» … «+5 өрөө»; 🆕 2026-10-06:
 *      блок нь САЙДБАРТ («📍 Байршил»-ийн ЯГ ДАРАА, «💰 Үнэ, ₮»-ний ӨМНӨ —
 *      🆕 (15): 💳 «Төлбөрийн нөхцөл» нь «Үнэ, ₮»-ний ДАРАА болов) —
 *      `#filter-bar`-т pill БАЙХГҮЙ (хэрэглэгчийн хүсэлт ✓)
 *   ①b ЧИП ДАРАХ: «1 өрөө» + «3 өрөө» → URL `?rooms=1,3` · DB
 *      `rooms=in.(1,3)` · «2 сонгосон» badge · дахин дарвал ЦУЦЛАГДАНА (toggle)
 *   ② Өрөөгүй төрөл (Оффис, Гараж …) дээр блок ХАРАГДАХГҮЙ
 *      (`hasRoomsFields` — хорооны блоктой ижил зарчим ✓)
 *      🆕 2026-10-03 (13): progressive disclosure ХАСАГДсан тул ХЭСГИЙН түвшинд
 *      (`?section=real-estate`, төрөл ГҮЙ) ч ХАРАГДАНА (`!filters.propertyType`
 *      нөхцөл нь идэвхтэй болов ✓); 🚗 `?section=auto` (үл хөдлөх БИШ) дээр
 *      ГАРАХГҮЙ ✓
 *   ③ ХУУЧИН линк: `?rooms=1,3` → чип дээр ТЭМДЭГЛЭГДЭж, DB `in.(1,3)`
 *   ④ Идэвхтэй шүүлтийн чип `🛏 1, 3 өрөө` дээрх ✕ → `rooms: []`
 *   ④b «✕ Цуцлах» товч → БҮХ сонголт арилж, URL/DB цэвэр болно
 *   ⑤ DB ДҮРЭМ (хуучин линк эвдрэхгүй): `?rooms=4,5` → `gte.4` ·
 *      `?rooms=5` → `gte.5` (хуучин гэрээ) · `?rooms=abc,3,9` → URL `rooms=3,5`
 *      + DB `or=(rooms.in.(3),rooms.gte.5)`
 *   ⑥ `breadcrumb` нь «1, 3 өрөө» гэж харуулж, «Үл хөдлөх» линк дээр дарахад
 *      өрөөний шүүлт цэвэрлэгдэнэ (`clearType`)
 *   ⑦ 📱 Мобайл 390px: чипүүд харагдана, хэвтээ гүйлт (overflow) ГАРАХГҮЙ
 *   ⑧ 🗑 Чип дээрх «зарын тоо» ХЭВЭЭР БАЙХГҮЙ — `rooms=` агуулсан HEAD query
 *      ОГТ ЯВАХГҮЙ (`fetchRoomCounts` 2026-09-30-нд хасагдсан ✓) ·
 *      консол дээр JS exception 0
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

/** 🛏 DOM дахь өрөөний чипүүдийн төлөв (`data-room-*` дэгээгээр) */
const roomUi = () => evalJs(`(() => {
  const btns = [...document.querySelectorAll('button')];
  const labelOnly = /^(\\+\\d|\\d) өрөө$/;
  const chips = [...document.querySelectorAll('[data-room-value]')];
  return {
    blocks: document.querySelectorAll('[data-room-filter]').length,
    chips: chips.length,
    labels: chips.map((b) => b.textContent.trim()),
    selected: chips.filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.getAttribute('data-room-value')),
    labelBtns: btns.filter((b) => labelOnly.test(b.textContent.trim())).map((b) => b.textContent.trim()),
    // ⚠️ aria-label="Өрөөний тоо" нь бүлэг (role=group div) дээр байдаг —
    //    зөвхөн button дундаас хайвал 0 гарч ХУУРАМЧ улаан өгнө ✗
    toggles: [...document.querySelectorAll('[aria-label]')]
      .filter((e) => /өрөөний тоо/i.test(e.getAttribute('aria-label') || '')).length,
  };
})()`);

/** 🛏 Нэг чипийг дарах (утга `1`…`5`; «5» = «+5 өрөө») */
const clickRoom = (value) => evalJs(`(() => {
  const b = document.querySelector('[data-room-value="${value}"]');
  if (!b) return 'NO_CHIP';
  b.click();
  return 'OK';
})()`);

/** 🧭 Sidebar блокүүдийн гарчгууд (дарааллаар — байрлал шалгахад) */
const sideLabels = () => evalJs(`[...document.querySelectorAll('aside .divide-y > div')]
  .map((b) => (b.firstElementChild?.textContent || '').trim())`);

let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};
const url = () => evalJs('location.search');
const dbQ = (...frags) => listingReqs.some((u) => frags.every((f) => decodeURIComponent(u).includes(f)));
const lastQ = () => decodeURIComponent(listingReqs[listingReqs.length - 1] || '').split('?')[1] || '(query байхгүй)';
const body = () => evalJs('document.body.textContent');

console.log('\n🛏 CDP — өрөөний тооны шүүлт (UI + URL + DB + breadcrumb)\n');

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });
// ═══════ ① ОРОН СУУЦ: ЧИПҮҮД БАЙГАА + БАЙРЛАЛ НЬ ЗӨВ ═══════
roomCountReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}`);
const dom = await roomUi();
check('🛏 Өрөөний блок БАЙНА (`[data-room-filter]` === 1)', dom.blocks === 1, `blocks=${dom.blocks}`);
check('🛏 Чип 5 байна (`[data-room-value]` === 5 — 1,2,3,4,+5)', dom.chips === 5, `chips=${dom.chips}`);
check('🛏 Шошгууд нь «1 өрөө» … «+5 өрөө»',
  dom.labels.join(' · ') === '1 өрөө · 2 өрөө · 3 өрөө · 4 өрөө · +5 өрөө',
  dom.labels.join(' · '));
check('🛏 `aria-label="Өрөөний тоо"` бүлэг ТААРЛАА (хороотой ижил хэв маяг)',
  dom.toggles === 1, `toggles=${dom.toggles}`);
const labels1 = await sideLabels();
check('🧭 Sidebar-ийн ЭХНИЙ блок «Байршил» (өрөөний блок ЭХНИЙ биш ✓)',
  /Байршил/.test(labels1[0] || ''), labels1.join(' → '));
/**
 * 🆕 2026-10-06: 🛏 «Өрөөний тоо» ба 💳 «Төлбөрийн нөхцөл» нь `#filter-bar`-ийн
 *    pill БАЙХАА БОЛЬЖ, сайдбарт ЭРГЭЖ ОРОВ (хэрэглэгчийн хүсэлт: «Үл хөдлөхийн
 *    хайлт дээр байгаа Өрөөний тоо, Төлбөрийн нөхцөлийг Дэлгэрэнгүй хайлтын
 *    Байршил-ийн доор оруул») ⇒ «📍 Байршил» ЭХНИЙ, дараа нь «Өрөөний тоо» ✓
 *    🆕 (15): 💳 нь «💰 Үнэ, ₮»-ний ДАРАА болов (хэрэглэгчийн хүсэлт:
 *    «Автомашин дээр Үнийн дараа оруулах») ⇒ дараалал:
 *    «📍 Байршил» → «🛏 Өрөөний тоо» → «💰 Үнэ, ₮» → «💳 Төлбөрийн нөхцөл» ✓
 */
check('🧭 Sidebar: «Байршил» ЭХНИЙ, «Өрөөний тоо» нь ЯГ 2 ДАХЬ блок ✓',
  /Байршил/.test(labels1[0] || '') && /Өрөөний тоо/.test(labels1[1] || ''),
  labels1.join(' → '));
/** 🆕 (15): 💳 нь «💰 Үнэ, ₮»-ний ДАРАА — дарааллыг эндээс ч түгжинэ ✓ */
const priceIdx1 = labels1.findIndex((l) => /Үнэ/.test(l));
const payIdx1 = labels1.indexOf('Төлбөрийн нөхцөл');
check('🧭 Sidebar (15): «Өрөөний тоо» → «Үнэ, ₮» → «Төлбөрийн нөхцөл» дараалал ✓',
  priceIdx1 > 1 && payIdx1 === priceIdx1 + 1,
  `үнэ=#${priceIdx1} төлбөр=#${payIdx1} — ${labels1.join(' → ')}`);
const barOrder1 = await evalJs(`[...document.querySelectorAll('#filter-bar [data-filter-pill]')].map((p) => p.getAttribute('data-filter-pill'))`);
check('🧭 `#filter-bar`-т 🛏 «Өрөөний тоо» pill БАЙХГҮЙ (2 ӨӨР UI БАЙХГҮЙ ✓)',
  !barOrder1.includes('rooms'), `bar=[${barOrder1.join(',')}]`);
check('📊 Зарын тоо татдаг `rooms=` HEAD query ОГТ ЯВАХГҮЙ (хэвээр ✓)',
  roomCountReqs.filter((u) => u.includes('rooms=')).length === 0,
  `${roomCountReqs.filter((u) => u.includes('rooms=')).length} rooms-query (нийт ${roomCountReqs.length} HEAD)`);

// ═══════ ①b ЧИП ДАРАХ → URL/DB/TOGGLE (шинэ UI-ийн гол зам) ═══════
listingReqs.length = 0;
const click1 = await clickRoom('1');
const click3 = await clickRoom('3');
check('🛏 «1 өрөө» чип дардагдав', click1 === 'OK', click1);
check('🛏 «3 өрөө» чип дардагдав', click3 === 'OK', click3);
await waitFor(`decodeURIComponent(location.search).includes('rooms=1,3')`);
check('🔗 Дарахад URL `?rooms=1,3` болов',
  decodeURIComponent(await url()).includes('rooms=1,3'), decodeURIComponent(await url()));
await sleep(1200);   // ⏳ DB query дуустахыг хүлээ (детермен)
check('🔎 DB: rooms=in.(1,3) — чипээр шүүлт ХИЙГДЭВ', dbQ('rooms=in.(1,3)'), lastQ());
const afterClick = await roomUi();
check('🛏 Сонгосон чипүүд `✓` төлөвтэй (`aria-pressed`)',
  afterClick.selected.join(',') === '1,3', `selected=[${afterClick.selected.join(',')}]`);
check('🛏 Badge «2 сонгосон» харагдана', /2 сонгосон/.test(await body()));
await clickRoom('1');
await waitFor(`!decodeURIComponent(location.search).includes('1,3')`);
const afterToggle = await roomUi();
check('🛏 Дахин дарвал ЦУЦЛАГДАВ (checkbox мэт toggle ✓) — зөвхөн «3» үлдэв',
  afterToggle.selected.join(',') === '3', `selected=[${afterToggle.selected.join(',')}]`);

// ═══════ ② ӨРӨӨГҮЙ ТӨРӨЛ БА СЕКЦИЙН ТҮВШИН ═══════
// 🆕 2026-10-03 (13): progressive disclosure ХАСАГДАВ ⇒ sidebar нь хэсгийн
//    түвшинд (`?section=real-estate`, төрөл ГҮЙ) ч ГАРНА ✓
//    ⚠️ «Өрөөний тоо» блок нь `showRooms = isRealEstate && (!filters.propertyType
//    || hasRoomsFields(...))` — төрөл сонгоогүй үед `!filters.propertyType` нь
//    TRUE тул ХАРАГДАНА ✓ (⏳ урьд нь `<aside>` бүтнээрээ байхгүй байв)
await go(`${BASE}/?section=real-estate`);
const domNoType = await roomUi();
check('🆕 Хэсгийн түвшинд (төрөл ГҮЙ) ч «Өрөөний тоо» блок ХАРАГДАНА (`showRooms` ✓)',
  domNoType.blocks === 1 && domNoType.chips === 5,
  `blocks=${domNoType.blocks} chips=${domNoType.chips}`);
const noTypeLabels = await sideLabels();
check('🆕 Хэсгийн түвшинд (төрөл ГҮЙ) ч «Өрөөний тоо» блок САЙДБАРТ БИЙ (`showRooms` ✓)',
  noTypeLabels.includes('Өрөөний тоо'), noTypeLabels.join(' → '));
check('🆕 Sidebar нь ч БИЙ — «Байршил» ЭХНИЙ, «Өрөөний тоо» 2 ДАХЬ ✓',
  /Байршил/.test(noTypeLabels[0] || '') && /Өрөөний тоо/.test(noTypeLabels[1] || ''),
  noTypeLabels.join(' → '));
await go(`${BASE}/?section=auto`);
check('🚗 Үл хөдлөх БИШ хэсэгт «Өрөөний тоо» блок БАЙХГҮЙ (`isRealEstate` ✗)',
  (await roomUi()).blocks === 0, `blocks=${(await roomUi()).blocks}`);
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Оффис')}`);
const domOffice = await roomUi();
check('🛏 Өрөөгүй төрөл (Оффис) дээр ч блок ХАРАГДАХГҮЙ (`hasRoomsFields` ✓)',
  domOffice.blocks === 0 && domOffice.chips === 0,
  `blocks=${domOffice.blocks}, chips=${domOffice.chips}`);

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
const linkUi = await roomUi();
check('🛏 Линкээс ирсэн утга нь чип дээр ТЭМДЭГЛЭГДЭВ (`aria-pressed`: 1,3)',
  linkUi.selected.join(',') === '1,3', `selected=[${linkUi.selected.join(',')}]`);
check('🛏 «+5 өрөө» СОНГОГДООГҮЙ (линкээр зөвхөн 1 ба 3 ✓)',
  !linkUi.selected.includes('5'), `selected=[${linkUi.selected.join(',')}]`);
// ═══════ ④ ИДЭВХТЭЙ ШҮҮЛТИЙН ЧИПИЙГ ✕ дарж цэвэрлэх ═══════
const CHIP_BTN = `[...document.querySelectorAll('button')]
  .find((x) => /хайлтыг хасах/.test(x.getAttribute('aria-label') || '')
    && /өрөө/.test(x.getAttribute('aria-label') || ''))`;
const chipLabel = await evalJs(`(() => { const b = ${CHIP_BTN}; return b ? b.getAttribute('aria-label') : 'NO_CHIP'; })()`);
check('🎛 Идэвхтэй шүүлтийн чип `1, 3 өрөө` олдлоо (🗑 2026-10-04 (39): emoji-гүй)', chipLabel !== 'NO_CHIP', chipLabel);
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

// ═══════ ④b «✕ ЦУЦЛАХ» ТОВЧ — БҮХ ӨРӨӨНИЙ СОНГОЛТЫГ АРИЛГАНА ═══════
// ⚠️ Энэ нь чип toggle-ээс гадна хоёр дахь зам — уншилтын цонхонд (`dbQ`)
//    ЗӨВХӨН цэвэрлэсний ДАРААХ query орох ёстой тул `listingReqs`-ийг
//    ЯГ дарахын ӨМНӨ хоослоно ✓ (эс бөгөөс хуучин rooms-query нь «үлдсэн»
//    мэт харагдаж, тест ХУУРАМЧ улаан өгнө ✗)
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=2,4`);
const CLEAR_BTN = `[...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '✕ Цуцлах')`;
const clearVis = await evalJs(`(() => ${CLEAR_BTN} ? 'OK' : 'NO_BTN')()`);
check('🛏 Сонголттой үед «✕ Цуцлах» товч ХАРАГДАВ', clearVis === 'OK', clearVis);
const beforeClear = await roomUi();
check('🛏 Линкээр «2» ба «4» сонгогдсон (selected=2,4)',
  beforeClear.selected.join(',') === '2,4', `selected=[${beforeClear.selected.join(',')}]`);
listingReqs.length = 0;   // ⏳ зөвхөн цэвэрлэсний дараах query-г харна
const clickedClear = await evalJs(`(() => { const b = ${CLEAR_BTN}; if (!b) return 'NO_BTN'; b.click(); return 'OK'; })()`);
check('🛏 «✕ Цуцлах» дардагдав', clickedClear === 'OK', clickedClear);
await waitFor(`!/rooms=/.test(location.search)`);
check('🧹 URL-аас `rooms` арилав', !/rooms=/.test(await url()), (await url()) || '(хоосон)');
await sleep(1200);
check('🧹 Цэвэрлэсний дараах DB query-д `rooms=` ОРОХГҮЙ', !dbQ('rooms='), lastQ());
const afterClear = await roomUi();
check('🛏 Бүх чип СОНГОГДООГҮЙ болов (selected=[])',
  afterClear.selected.length === 0, `selected=[${afterClear.selected.join(',')}]`);
check('🛏 «✕ Цуцлах» товч ХАРАГДАХАА БОЛИВ (сонголт байхгүй ⇒ hidden ✓)',
  (await evalJs(`(() => ${CLEAR_BTN} ? 'OK' : 'NO_BTN')()`)) === 'NO_BTN');

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
const mobileUi = await roomUi();
check('📱 Мобайл: өрөөний чипүүд ХАРАГДАНА (5 — 2026-10-03 (4) UI-тэй ✓)',
  mobileUi.chips === 5, `chips=${mobileUi.chips}`);
check('📱 Мобайл: линкээр «2 өрөө» сонгогдсон төлөвтэй',
  mobileUi.selected.join(',') === '2', `selected=[${mobileUi.selected.join(',')}]`);
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
