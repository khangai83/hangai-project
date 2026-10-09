/**
 * 🔢 CDP ШАЛГАЛТ — «доод/дээд ТООНЫ хүрээ» (RangeInput) + эрэмбэлэх сонголт + hero
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээсэн байх:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-range.mjs   (эсвэл npm run cdp:range)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:search` ✓
 *   ⚠️ Скрипт нь ХУУЧИН таб дээр ажиллахгүй — `PUT /json/new`-ээр ШИНЭ таб нээж,
 *      түүн дээр шалгаад, эцэст нь (алдаа гарсан ч) тэр табаа өөрөө ХААЖ цэвэрлэнэ
 *      (Chrome-д 17 таб нээлттэй үед хуучин таб нь timeout болдог байв ✗)
 *
 * ⚠️ 2026-09-30: ЭНЭ СКРИПТ «🎚 ЧИРДЭГ ХҮРЭЭ»-ний шалгалтыг (mouse press →
 *    move → release, aria-valuenow, гараар зөөх) БҮРЭН ХАСАВ — учир нь
 *    хэрэглэгч «дээд доод үнэ, талбай дээр чирдэгээ больё» гэж хүссэн тул
 *    слайдер DOM-оос бүрэн арилсан. Оронд нь:
 *      ① бичих ЯВЦАД тоо нь ЦЭГЭЭР тусгаарлагдах (гол шаардлага ✓)
 *      ② ⏎ / blur дээр Л НЭГ query явах (бичих бүрд явахгүй ✓)
 *      ③ ⌨️ Esc → буцах, ✕ → арилгах, 🏷 шошго нь «Доод / Дээд»
 *      ④ оноор БҮЛЭГЛЭХГҮЙ («2.015» бичихэд «2015» болно ✓)
 *      ⑤ 🗑 оролтын доорх «санал болгосон тоо» товч БАЙХГҮЙ (DOM-д 0 ✓)
 *    (Хуучин скрипт хэрэгтэй бол: `git show f326ca0:scripts/cdp-slider.mjs`)
 */
const BASE = process.argv[2] || 'http://localhost:3000';
const rpc = async (ws, id, method, params = {}) => {
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error('timeout ' + method)), 30000);
    const onMsg = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id !== id) return;
      clearTimeout(to);
      ws.removeEventListener('message', onMsg);
      m.error ? reject(new Error(method + ': ' + JSON.stringify(m.error))) : resolve(m.result);
    };
    ws.addEventListener('message', onMsg);
  });
};

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
// ⚠️ Chrome-д олон таб нээлттэй байж болно (туршилтын үед 17 таб байсан) — тэр
//    үед хуучин таб нь `Runtime.evaluate`-д хариу өгөхгүй timeout болдог ✗
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

const exceptions = [];
const listingReqs = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent') {
    const r = m.params.request;
    if (r.url.includes('/rest/v1/listings') && r.method === 'GET') listingReqs.push(r.url);
  }
});

await rpc(ws, 1, 'Runtime.enable');
await rpc(ws, 2, 'Network.enable');
await rpc(ws, 3, 'Page.enable');
// ⚠️ `PUT /json/new` нь табыг BACKGROUND-д нээдэг → Chrome нь идэвхгүй табын
//    renderer-ийг хүйтэн болгоход `Runtime.evaluate` hang (30с timeout) болдог ✗
//    → табаа FRONT-д гаргаж тэр эрсдэлийг арилгана ✓
await rpc(ws, 5, 'Page.bringToFront');
await rpc(ws, 4, 'Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/**
 * ⚠️ Chrome-д олон таб нээлттэй үед (эсвэл renderer ачаалалтай үед) хааяа
 *    `Runtime.evaluate` нь 30с timeout болдог ✗ → НЭГ удаа дахин оролдоно.
 *    ℹ️ Дахин оролдохдоо id-г `+1000` болгож солино — эс бөгөөс эхний
 *       (timeout болсон) дуудлагын listener нь хуучин хариуг бариад авах
 *       боломжтой ✗
 */
const evalOnce = async (id, expression) => {
  const r = await rpc(ws, id, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails.text));
  return r.result.value;
};
const evalJs = async (id, expression) => {
  try {
    return await evalOnce(id, expression);
  } catch (err) {
    if (!/timeout/.test(String(err.message))) throw err;
    await sleep(1500);
    return evalOnce(id + 1000, expression);
  }
};
/** ⚠️ (83) `Page.navigate`-ыг дараа нь ШИНЭ документ ачаалагдсаныг
 *  `performance.timeOrigin`-оор батална — эс бөгөөс шилжилт хүрэхээс өмнө
 *  ХУУЧИН хуудны DOM дээр хэмжиж «хуурамч ❌» гарах race үүсдэг ✗
 *  ⚠️ Тогтмол `sleep` нь ЗӨВХӨН доод хязгаар (хүйтэн эхлэлт дээр хүрэлцэхгүй ✓) */
const go = async (id, url, wait = 6000) => {
  const t0 = await evalJs(id, 'performance.timeOrigin').catch(() => 0);
  await rpc(ws, id, 'Page.navigate', { url });
  await sleep(wait);
  const until = Date.now() + 20000;
  for (;;) {
    try {
      if (await evalJs(id, `performance.timeOrigin !== ${t0} && document.readyState === 'complete'`)) return;
    } catch { /* хуудас солигдож байна */ }
    if (Date.now() > until) return;
    await sleep(250);
  }
};

let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};

// ---------- ★ БОДИТ ГАРЫН ОРУУЛТ (React controlled input тул insertText ✓) ----------
const Q = JSON.stringify;
/** Оролтын DOM селектор: `[data-range-filter="Үнэ"] [data-range-input="to"]` */
const inputSel = (block, side) => Q(`[data-range-filter="${block}"] [data-range-input="${side}"]`);
const focusInput = (id, block, side) => evalJs(id,
  `(() => { const el = document.querySelector(${inputSel(block, side)}); if (!el) return false; el.focus(); return document.activeElement === el; })()`);
const inputValue = (id, block, side) => evalJs(id,
  `(() => { const el = document.querySelector(${inputSel(block, side)}); return el ? el.value : null; })()`);
/** 🏷 Шошгыг DOM дээр түгжинэ — `'placeholder'` / `'aria-label'` */
const inputAttr = (id, block, side, attr) => evalJs(id,
  `(() => { const el = document.querySelector(${inputSel(block, side)}); return el ? (el.getAttribute(${Q(attr)}) || '') : null; })()`);
const selectAll = (id) => rpc(ws, id, 'Input.dispatchKeyEvent', {
  type: 'rawKeyDown', key: 'a', code: 'KeyA', modifiers: 4, windowsVirtualKeyCode: 65, nativeVirtualKeyCode: 65,
});
const typeText = (id, text) => rpc(ws, id, 'Input.insertText', { text });
const key = async (id, k, code, vk) => {
  await rpc(ws, id, 'Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await rpc(ws, id, 'Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
};
const pressEnter = (id) => key(id, 'Enter', 'Enter', 13);
const pressEscape = (id) => key(id, 'Escape', 'Escape', 27);
const blur = (id) => evalJs(id, `(() => { document.activeElement && document.activeElement.blur(); return true; })()`);
const url = (id) => evalJs(id ?? 9001, 'location.search');
/** Бичих → (сонголтоор) ⏎/blur хийх бүрэн урсгал */
const typeInto = async (id, block, side, text, commit = 'enter') => {
  await focusInput(id, block, side);
  await selectAll(id + 100);
  await typeText(id + 200, text);
  await sleep(250);
  if (commit === 'enter') { await pressEnter(id + 300); await sleep(2200); }
  else if (commit === 'blur') { await blur(id + 300); await sleep(2200); }
  return inputValue(id + 400, block, side);
};
/** Сүүлийн listing query (decode хийсэн) */
const lastQuery = () => decodeURIComponent(listingReqs[listingReqs.length - 1] || '');

console.log('\n🔢 CDP — тооны хүрээ (цэгээр бүлэглэлт) + эрэмбэлэлт\n');

// ═══════ ① 🚫 СЛАЙДЕР БҮРЭН ХАСАГДСАН (хэрэглэгчийн хүсэлт) ═══════
await go(10, `${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}`);
const gone = await evalJs(11, `JSON.stringify({
  sliders: document.querySelectorAll('[data-slider]').length,
  handles: document.querySelectorAll('[data-handle]').length,
  roles: document.querySelectorAll('[role="slider"]').length,
  inputs: document.querySelectorAll('[data-range-input]').length,
  // ⚠️ 2026-10-09 (83): хуучин шалгалт нь БҮХ [data-range-input]-ыг тоолж «4» гэж
  //    шаарддаг байв — гэвч 2026-10-04 (35)-д 🏢 орон сууцны 3 нэмэлт хүрээ
  //    («Барилгын давхар» · «Хэдэн давхарт» · «Ашиглалтанд орсон он») нэмэгдсэн тул
  //    DOM-д 10 оролт гарч, шалгалт ХУУРАМЧ улаан болж байв ✗ (алдаа нь КОД дээр
  //    БИШ, тестийн тоолол дээр байв) ⇒ одоо блок бүрээр ЯГ тоолно ✓
  //    ⚠️ Энэ нь evalJs-ийн TEMPLATE LITERAL дотор байгаа тул backtick ХОРИГЛОГДОНО
  priceArea: document.querySelectorAll('[data-range-filter="Үнэ"] [data-range-input], [data-range-filter="Талбай"] [data-range-input]').length,
  apartment: document.querySelectorAll('[data-range-filter="Барилгын давхар"] [data-range-input], [data-range-filter="Хэдэн давхарт"] [data-range-input], [data-range-filter="Ашиглалтанд орсон он"] [data-range-input]').length,
})`);
const g = JSON.parse(gone);
check('🚫 Чирдэг слайдер DOM-д БАЙХГҮЙ (data-slider/data-handle/role=slider = 0)',
  g.sliders === 0 && g.handles === 0 && g.roles === 0, gone);
check('🔢 Үнэ + Талбайн 4 тоон оролт (from/to × 2) + орон сууцны 3 хүрээ (6)',
  g.priceArea === 4 && g.apartment === 6,
  `${g.inputs} input (үнэ/талбай ${g.priceArea} + орон сууц ${g.apartment})`);

// ═══════ ② БИЧИХ ЯВЦАД ТОО ЦЭГЭЭР ТУСГААРЛАГДАВ ═══════
listingReqs.length = 0;
await focusInput(12, 'Үнэ', 'to');
await selectAll(13);
await typeText(14, '3000000');
await sleep(300);
const typed = await inputValue(15, 'Үнэ', 'to');
check("⌨️ Бичих ЯВЦАД цэг гарлаа: '3000000' → '3.000.000'", typed === '3.000.000', String(typed));
check('💤 Бичиж байхад query ЯВАХГҮЙ (⏎/blur хүлээнэ ✓)', listingReqs.length === 0, `${listingReqs.length} query`);

// ═══════ ③ ⏎ (ENTER) → НЭГ QUERY + URL ═══════
await pressEnter(16);
await sleep(2500);
const qTyped = await url(17);
check('⏎ Дарахад URL-д `maxPrice=3000000` бичигдэв', /maxPrice=3000000/.test(qTyped), qTyped);
check('🗄 DB query нь `price=lte.3000000` болов', /price=lte\.3000000\b/.test(lastQuery()), lastQuery().slice(0, 110));
check('⚡ ЯГ 1 query явсан (нэг commit = нэг query ✓)', listingReqs.length === 1, `${listingReqs.length} query`);
check('🔤 Commit-ийн дараа оролтод цэгтэй утга ХЭВЭЭР (3.000.000)',
  (await inputValue(18, 'Үнэ', 'to')) === '3.000.000');
const chip = await evalJs(19, `(() => [...document.querySelectorAll('span,button')].map(s => (s.textContent || '').trim()).filter(t => /₮/.test(t) && t.length < 28).slice(0, 3).join(' | '))()`);
check('🏷 Идэвхтэй шүүлтийн чип гарлаа', /₮/.test(String(chip)), String(chip).slice(0, 80));



// ═══════ ④ ЦЭГТЭЙ БУУЛГАЛТ + BLUR ДЭЭР COMMIT ═══════
listingReqs.length = 0;
await focusInput(20, 'Үнэ', 'from');
await selectAll(21);
await typeText(22, '1.500.000'); // ⚠️ хэрэглэгч ЦЭГТЭЙ буулгасан (paste гэх мэт)
await sleep(300);
const typed2 = await inputValue(23, 'Үнэ', 'from');
check("⌨️ Цэгтэй бичсэн ч зөв уншигдана: '1.500.000' хэвээр", typed2 === '1.500.000', String(typed2));
await blur(24);
await sleep(2500);
const qBlur = await url(25);
check('👁 Blur дээр commit хийгдэв (`minPrice=1500000` — цэг нь ТОО болж уншигдав)',
  /minPrice=1500000/.test(qBlur), qBlur);
check('🗄 DB query нь `price=gte.1500000` болов', /price=gte\.1500000\b/.test(lastQuery()), lastQuery().slice(0, 110));

// ═══════ ⑤ ⎋ ESC → БИЧСЭНЭЭ БОЛИХ (шүүлт ХӨНДӨӨГДӨХГҮЙ) ═══════
listingReqs.length = 0;
await focusInput(26, 'Үнэ', 'to');
await selectAll(27);
await typeText(28, '999999999');
await sleep(250);
await pressEscape(29);
await sleep(400);
const afterEsc = await inputValue(30, 'Үнэ', 'to');
check('⎋ Esc → өмнөх утга буцав (3.000.000)', afterEsc === '3.000.000', String(afterEsc));
const qEsc = await url(31);
check('🚫 Esc нь URL/query ХӨНДӨӨГҮЙ', listingReqs.length === 0 && /maxPrice=3000000/.test(qEsc), qEsc);

// ═══════ ⑥ 📐 ТАЛБАЙ: БУТАРХАЙ («1234,5») + ЦЭГЭЭР БҮЛЭГЛЭЛТ ═══════
listingReqs.length = 0;
const areaVal = await typeInto(32, 'Талбай', 'from', '1234,5'); // ⏎-ээр commit
check('📐 Талбай: «1234,5» → цэгээр бүлэглэгдэж «1.234,5» болов', areaVal === '1.234,5', String(areaVal));
const qArea = await url(34);
check('📐 URL-д `minArea=1234.5` (URL нь ЯМАР Ч цэг/таслалгүй цэвэр ✓)',
  /minArea=1234\.5/.test(qArea), qArea);
check('🗄 DB query нь `area=gte.1234.5` болов', /area=gte\.1234\.5\b/.test(lastQuery()), lastQuery().slice(0, 110));
check('📐 Chip дээр талбай нь «1.234,5 м²» гэж харагдав',
  /1\.234,5 м²/.test(await evalJs(35, `document.body.innerText`)));

// ═══════ ⑦ 🏷 ШОШГО «Доод / Дээд» + 🗑 «САНАЛ БОЛГОСОН ТОО» БАЙХГҮЙ ═══════
//    ⚠️ 2026-09-30 (3) — хэрэглэгчийн хүсэлт: «Орон сууц хайлтын Үнэ дээр
//       эхлэх дуусах биш Дээд Доод гэе. Бас тэр доор нь санал болгоод байгаа
//       тоог байхгүй болго» → ① шошго нь «Доод / Дээд» (placeholder + aria)
//       ② оролтын доорх 4 тоон товч (`₮25 сая хүртэл` …) DOM-д БАЙХГҮЙ (0 ✓)
//    ⚠️ «Бүгдийг цэвэрлэх» БИШ — тэр нь section/type-ыг ч арилгаж (resetAll)
//       sidebar-ыг бүхэлд нь хаана ✗ → цэвэр URL руу шилжинэ ✓
await go(36, `${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}`);
listingReqs.length = 0;
const pickN = await evalJs(37, `document.querySelectorAll('[data-quick-pick]').length`);
check('🗑 «Санал болгосон тоо» товч БАЙХГҮЙ (DOM-д ЯГ 0 ✓)', pickN === 0, `${pickN} товч`);
const phFrom = await inputAttr(38, 'Үнэ', 'from', 'placeholder');
const phTo = await inputAttr(39, 'Үнэ', 'to', 'placeholder');
check('🏷 ЗҮҮН оролт нь «Доод» (placeholder ✓)', phFrom === 'Доод', String(phFrom));
check('🏷 БАРУУН оролт нь «Дээд» (placeholder ✓)', phTo === 'Дээд', String(phTo));
const arFrom = await inputAttr(40, 'Үнэ', 'from', 'aria-label');
const arTo = await inputAttr(41, 'Үнэ', 'to', 'aria-label');
check('🗣 aria-label нь «Үнэ (доод хязгаар)» · «Үнэ (дээд хязгаар)»',
  arFrom === 'Үнэ (доод хязгаар)' && arTo === 'Үнэ (дээд хязгаар)', `${arFrom} · ${arTo}`);
const oldWord = await evalJs(42, `(() => {
  const box = document.querySelector('[data-range-filter="Үнэ"]');
  return box ? /Эхлэх|Дуусах/.test(box.innerText) : true;
})()`);
check('🚫 «Эхлэх / Дуусах» гэсэн үг DOM-д БАЙХГҮЙ', oldWord === false, String(oldWord));

// ═══════ ⑧ ✕ «арилгах» товч ═══════
await typeInto(43, 'Үнэ', 'to', '4000000');
listingReqs.length = 0;
await evalJs(44, `document.querySelector('[data-range-clear="Үнэ"]').click()`);
await sleep(2500);
const qClear = await url(45);
check('✕ Дарахад үнийн шүүлт арилав', !/minPrice|maxPrice/.test(qClear), qClear);
check('🗄 DB query-д `price=` шүүлт БАЙХГҮЙ', !/price=/.test(lastQuery()), lastQuery().slice(0, 110));

// ═══════ ⑨ 📅 ОНЫ ХҮРЭЭ (он нь БҮЛЭГЛЭГДЭХГҮЙ ✓) ═══════
await go(46, `${BASE}/?section=auto&type=${encodeURIComponent('Суудлын машин')}`);
listingReqs.length = 0;
const yearTyped = await typeInto(47, 'Үйлдвэрлэсэн он', 'from', '2.015'); // хэрэглэгч цэгтэй бичсэн
check('📅 Оны оролтод цэг ОРОХГҮЙ (2.015 → 2015 ✓)', yearTyped === '2015', String(yearTyped));
const qYear = await url(48);
check('📅 URL-д `attr_year_from=2015` болов', /attr_year_from=2015/.test(qYear), qYear);
check('🗄 DB query нь `attrs->>year=gte.2015` болов', /attrs->>year=gte\.2015/.test(lastQuery()), lastQuery().slice(0, 140));

// ═══════ ⑩ 🔍 HERO ХАЙЛТЫН МӨР + 🔀 ЭРЭМБЭЛЭХ ═══════
await go(49, BASE);
// 🗑 2026-10-07: толгойн «Ангилал» pill (`<select>`, `data-hero-section`) бүрэн
//    хасагдсан (хэрэглэгчийн хүсэлт) тул одоо DOM-д ОГТ БАЙХГҮЙ ✓
const heroSel = await evalJs(50, `!!document.querySelector('[data-hero-section]')`);
check('🗑 Хайлтын мөрөнд «Ангилал» pill БАЙХГҮЙ (2026-10-07-д хасагдсан)', heroSel === false);

// 🆕 2026-10-09 (83b) ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «огноогоор, газрын зураг дээр харах
//    2-ийг яагаад үлдээчвээ» ⇒ «Бүх зар» (нүүр хуудас) дээр хайлтын хэсгийн
//    ГУРВАН зүйл (⇅ Эрэмбэлэх · 🗺 Харах горим · 🎛 панель) БАЙХГҮЙ ✓
check('🚫 «Бүх зар» дээр ⇅ Эрэмбэлэх БАЙХГҮЙ (83b)',
  (await evalJs(51, `!!document.querySelector('[data-listing-sort]')`)) === false);
check('🚫 «Бүх зар» дээр 🗺 Харах горим БАЙХГҮЙ (83b)',
  (await evalJs(52, `!!document.querySelector('[data-view-toggle]')`)) === false);
check('🚫 «Бүх зар» дээр 🎛 Шүүлтийн панель БАЙХГҮЙ (83)',
  (await evalJs(53, `!!document.querySelector('#advanced-filters')`)) === false);

// ⚠️ Дээрх 3 нь ХЭСЭГ (2-р түвшин) сонгосон үед л гарна ⇒ «Бүх зар»-аас
//    `?section=auto` руу шилжиж, эрэмбэлэлтийн гэрээг ТЭНД шалгана ✓
await go(54, `${BASE}/?section=auto`);
check('🔀 Хэсэг сонгоход Эрэмбэлэх сонголт гарлаа (3 утга)',
  (await evalJs(55, `document.querySelectorAll('[data-listing-sort] option').length`)) === 3);
check('🗺 Хэсэг сонгоход Газрын зураг дээр харах товч гарлаа',
  (await evalJs(56, `!!document.querySelector('[data-view-toggle]')`)) === true);
listingReqs.length = 0;
await evalJs(57, `(() => {
  const el = document.querySelector('[data-listing-sort]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  setter.call(el, 'price_asc');
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value;
})()`);
await sleep(3000);
const qSort = await url(58);
check('🔀 Сонгоход URL-д `?sort=price_asc` болов', /sort=price_asc/.test(qSort), qSort);
check('🔀 DB query нь `order=price.asc` болсон', /order=price\.asc/.test(lastQuery()), lastQuery().slice(0, 110));

// ═══════ ⑪ 🧯 АЛДАА ═══════
check('🧯 JS exception 0', exceptions.length === 0, exceptions.slice(0, 2).join(' | ') || '—');

console.log(`\n${fail === 0 ? '✅ БҮГД ОК' : '❌ АЛДААТАЙ'}: ${pass}/${pass + fail} шалгалт (бодит Chrome)\n`);
await closeOwnTab();
process.exit(fail === 0 ? 0 : 1);

