/**
 * 💳 CDP ШАЛГАЛТ — «Төлбөрийн нөхцөл» шүүлт (UI + URL + DB) · 2026-10-03
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Төлбөрийн нөхцөлийг Үл хөдлөх зарна, Автомашин
 * зарна гэсэн дээр ХАЙХ хэсэгт гардаг болгоё. Зар оруулах үед хэрэглэгч
 * үүнийг сонгож өгөх ёстой. Олон сонголт хийж байгаа боломж…»
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① 🏠 «Үл хөдлөх зарна» дээр чип БАЙГАА: `[data-payment-filter]` === 1,
 *      `[data-payment-value]` === 4 (lease/cash/loan/barter) ба шошгууд нь
 *      «Хувь лизингээр … Бартер солирхоно» (unegui.mn-тэй ижил ✓)
 *   ①b БАЙРЛАЛ: блок нь «Өрөөний тоо»-ны ДАРАА, «Үнэ, ₮»-ний ӨМНӨ
 *   ② 🚗 «Автомашин зарна» дээр БАЙНА; ⛔ «Ажил»/«Компьютер»/«Бүх зар»
 *      дээр БАЙХГҮЙ (`hasPaymentTerms` ✓ — лизинг гэдэг ойлголт байхгүй)
 *   ③ 🖱 ЧИП ДАРАХ (ОЛОН СОНГОЛТ — ХАМГИЙН ЧУХАЛ): «Хувь лизингээр» +
 *      «Бэлэн төлөлтөөр» → URL `?payment=lease,cash` · чипүүд `aria-pressed`
 *      · «2 сонгосон» badge · DB `or=(attrs.cs.{"payment_terms":["lease"]},
 *      attrs.cs.{"payment_terms":["cash"]})` (OR — аль нэг нь тохирох зар)
 *   ③b Дахин дарахад ЦУЦЛАГДАНА (checkbox мэт toggle) → `?payment=lease`
 *      ба DB нь НЭГ нөхцөл (`attrs=cs.…`) болж буурна ✓
 *   ④ 🔗 ХУУЧИН/гараар бичсэн линк: `?payment=cash,lease` → чипүүд
 *      тэмдэглэгдэж, URL нь КАНОН болно (`lease,cash`); `?payment=abc,lease`
 *      → хүчингүй утга ЧИМЭЭГҮЙ хасагдана ✓
 *   ⑤ 🎛 Идэвхтэй шүүлтийн чип `💳 Хувь лизингээр, Бэлэн төлөлтөөр` дээрх ✕
 *      → `payments: []` (URL/DB цэвэр) — архитектурын урхи: `''` биш `[]` ✓
 *   ⑥ 🧹 ХЭСЭГ СОЛИХ: `?section=jobs&payment=lease` (эсвэл breadcrumb) →
 *      payment утга ЦЭВЭРЛЭГДЭНЭ (`next.payments = []`) — ажил дээр лизинг
 *      үлдэж, DB шүүлт «юу ч олдохгүй» болох ОНОВЧТОЙ АЛДААНЫГ бариулна ✗
 *   ⑦ 📱 Мобайл 390px: чипүүд харагдана, хэвтээ гүйлт (overflow) ГАРАХГҮЙ
 *   ⑧ 🧯 Консол дээр JS exception 0
 *
 * ⚠️ JSONB-ИЙН 2 ДҮРЭМ (`lib/paymentFilter.mjs`): ① `cs` (contains) — учир нь
 *    `attrs.payment_terms` нь МАССИВ ✗ `->>` биш ✓ ② `.or()`-ийн мөрөнд
 *    таслал нь тусгаарлагч тул зөвхөн НЭГ ЭЛЕМЕНТТЭЙ массив (`["lease"]`)
 *    явна — `["lease","cash"]` гэвэл PostgREST `22P02` алдаа өгнө ✗
 *    (энэ скрипт DB-ийн БОДИТ query мөрийг шалгаж батална ✓)
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээсэн байх:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-payments.mjs   (эсвэл npm run cdp:payments)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:payments` ✓
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
// ⚠️ Chrome-д олон таб нээлттэй бол хуучин таб нь `Runtime.evaluate`-д
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
// ⚠️ `PUT /json/new` нь табыг BACKGROUND-д нээдэг → идэвхгүй табын renderer
//    хүйтэн болж `Runtime.evaluate` нь 30с timeout болдог ✗ → ① HTTP activate
//    ② доор `Page.bringToFront` (давхар хамгаалалт ✓)
try { await fetch(`http://127.0.0.1:9222/json/activate/${page.id}`); } catch { /* алгасна */ }
const ws = new WebSocket(page.webSocketDebuggerUrl);
/** ℹ️ Скрипт дуусахад (амжилттай ч, алдаатай ч) өөрөө нээсэн табаа ХААНА ✓ */
const closeOwnTab = async () => {
  if (!ownTab) return;
  try { await fetch(`http://127.0.0.1:9222/json/close/${page.id}`); } catch { /* алгасна */ }
};
// ⚠️ Top-level await-ийн алдаа эсвэл Ctrl+C (SIGTERM) үед ч таб үлдэхгүй байх ёстой ✗
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
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent') {
    const r = m.params.request;
    if (r.url.includes('/rest/v1/listings') && r.method === 'GET') listingReqs.push(r.url);
  }
});

await rpc('Runtime.enable');
await rpc('Network.enable');
await rpc('Page.enable');
await rpc('Page.bringToFront');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** ⚠️ Хааяа `Runtime.evaluate` 30с timeout болдог ✗ → НЭГ удаа дахин оролдоно ✓ */
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

/** 💳 DOM дахь төлбөрийн чипүүдийн төлөв (`data-payment-*` дэгээгээр) */
const paymentUi = () => evalJs(`(() => {
  const chips = [...document.querySelectorAll('[data-payment-value]')];
  const box = document.querySelector('[data-payment-filter]');
  return {
    blocks: document.querySelectorAll('[data-payment-filter]').length,
    chips: chips.length,
    labels: chips.map((b) => b.textContent.replace(/[\\u2713]/g, '').replace(/\\s+/g, ' ').trim()),
    values: chips.map((b) => b.getAttribute('data-payment-value')),
    selected: chips.filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.getAttribute('data-payment-value')),
    // «N сонгосон» нь блокийн толгойд (чипүүдийн ЭЦЭГ эгч) — тоог тэмдэглэнэ
    badge: (() => {
      const m = (box && box.parentElement ? box.parentElement.textContent : '').match(/(\\d+) сонгосон/);
      return m ? Number(m[1]) : 0;
    })(),
    // ⚠️ aria-label="Төлбөрийн нөхцөл" нь БҮЛЭГ (role=group div) дээр —
    //    зөвхөн button дундаас хайвал 0 гарч ХУУРАМЧ улаан өгнө ✗
    toggles: [...document.querySelectorAll('[aria-label]')]
      .filter((e) => /төлбөрийн нөхцөл/i.test(e.getAttribute('aria-label') || '')).length,
    clear: [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === '✕ Цуцлах').length,
  };
})()`);

/** 💳 Нэг чипийг дарах (`data-payment-value="lease"`) */
const clickPayment = (value) => evalJs(`(() => {
  const b = document.querySelector('[data-payment-value="${value}"]');
  if (!b) return 'NO_CHIP';
  b.click();
  return 'OK';
})()`);

/** 💳 Блок доторх «✕ Цуцлах» (шүүлтийг бүхэлд нь арилгана) */
const PAY_CLEAR = `(() => {
  const box = document.querySelector('[data-payment-filter]');
  if (!box || !box.parentElement) return null;
  return [...box.parentElement.querySelectorAll('button')].find((b) => b.textContent.trim() === '✕ Цуцлах') || null;
})()`;

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

console.log('\n💳 CDP — «Төлбөрийн нөхцөл» шүүлт (UI + URL + DB)\n');

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });

// ═══════ ① 🏠 ХҮЛ ХӨДЛӨХ: ЧИПҮҮД БАЙГАА + БАЙРЛАЛ НЬ ЗӨВ ═══════
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}`);
const dom = await paymentUi();
check('💳 Төлбөрийн блок БАЙНА (`[data-payment-filter]` === 1)', dom.blocks === 1, `blocks=${dom.blocks}`);
check('💳 Чип 4 байна (`[data-payment-value]` === 4)', dom.chips === 4, `chips=${dom.chips}`);
check('💳 Утгууд нь lease/cash/loan/barter (кодууд — URL/jsonb ✓)',
  dom.values.join(',') === 'lease,cash,loan,barter', dom.values.join(','));
check('💳 Шошгууд нь «Хувь лизингээр … Бартер солирхоно» (unegui.mn-тэй ижил)',
  dom.labels.map((l) => l.replace(/[^\p{L}\s]/gu, '').trim()).join(' · ') ===
    'Хувь лизингээр · Бэлэн төлөлтөөр · Банкны зээлээр · Бартер солирхоно',
  dom.labels.join(' · '));
check('💳 `aria-label="Төлбөрийн нөхцөл"` бүлэг ТААРЛАА (хороо/өрөөтэй ижил хэв маяг)',
  dom.toggles === 1, `toggles=${dom.toggles}`);
check('💳 Сонголтгүй үед «✕ Цуцлах» ХАРАГДАХГҮЙ', !(await evalJs(`(() => ${PAY_CLEAR} ? 'OK' : 'NO')()`) === 'OK'));
const labels1 = await sideLabels();
const roomsIdx = labels1.findIndex((l) => /Өрөөний тоо/.test(l));
const payIdx = labels1.findIndex((l) => /Төлбөрийн нөхцөл/.test(l));
const priceIdx = labels1.findIndex((l) => /Үнэ/.test(l));
check('🧭 «Төлбөрийн нөхцөл» нь «Өрөөний тоо»-ны ДАРАА, «Үнэ, ₮»-ний ӨМНӨ',
  roomsIdx > 0 && payIdx > roomsIdx && priceIdx > payIdx,
  `өрөө=#${roomsIdx} төлбөр=#${payIdx} үнэ=#${priceIdx} — ${labels1.join(' → ')}`);

// ═══════ ② 🚗 АВТО: БАЙНА · ⛔ АЖИЛ/КОМПЬЮТЕР/«БҮХ ЗАР»: БАЙХГҮЙ ═══════
// ⚠️ `&type=…` ЗААВАЛ — sidebar нь PROGRESSIVE DISCLOSURE: `<aside>` нь ЗӨВХӨН
//    ТӨРӨЛ сонгосон үед render болно (`{filters.propertyType && (<aside …>)}`) —
//    `?section=auto` (type-ГҮЙ) дээр зөвхөн дэд төрлийн сонголт гарч, шүүлт
//    ОГТ харагдахгүй тул шалгалт хуурамчаар ✗ болно ✗
await go(`${BASE}/?section=auto&type=${encodeURIComponent('Суудлын машин')}`);
const autoUi = await paymentUi();
check('🚗 «Автомашин зарна» дээр чипүүд БАЙНА', autoUi.blocks === 1 && autoUi.chips === 4,
  `blocks=${autoUi.blocks} chips=${autoUi.chips}`);
check('🚗 Авто дээрх шошгууд нь ч ЯГ ИЖИЛ (нэг эх сурвалж `PAYMENT_OPTIONS` ✓)',
  autoUi.values.join(',') === 'lease,cash,loan,barter', autoUi.values.join(','));
await go(`${BASE}/?section=jobs`);
const jobsUi = await paymentUi();
check('⛔ «Ажил» дээр төлбөрийн блок БАЙХГҮЙ (`hasPaymentTerms` === false)',
  jobsUi.blocks === 0 && jobsUi.chips === 0, `blocks=${jobsUi.blocks} chips=${jobsUi.chips}`);
await go(`${BASE}/?section=computers`);
check('⛔ «Компьютер» дээр БАЙХГҮЙ', (await paymentUi()).blocks === 0);
await go(`${BASE}/`);
check('⛔ «Бүх зар» (хэсэг сонгоогүй) дээр БАЙХГҮЙ', (await paymentUi()).blocks === 0);

// ═══════ ③ 🖱 ЧИП ДАРАХ — ОЛОН СОНГОЛТ (хамгийн чухал) ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}`);
const clicked1 = await clickPayment('lease');
check('🖱 «💳 Хувь лизингээр» чип дарагдав', clicked1 === 'OK', clicked1);
await waitFor(`/payment=lease/.test(location.search)`);
check('🔗 URL: `?payment=lease` (нэг утга — хуучин хэлбэртэй ижил ✓)',
  /payment=lease(?!,)/.test(await url()), await url());
await sleep(1200);
check('🔎 DB: `attrs=cs.{"payment_terms":["lease"]}` (jsonb containment ✓ — `->>` БИШ)',
  dbQ('attrs=cs.{"payment_terms":["lease"]}'), lastQ());
let ui1 = await paymentUi();
check('🖱 Чип СОНГОГДСОН төлөвтэй (`aria-pressed=true`)', ui1.selected.join(',') === 'lease',
  `selected=[${ui1.selected.join(',')}]`);
check('🔢 «1 сонгосон» badge ХАРАГДАВ', ui1.badge === 1, `badge=${ui1.badge}`);
check('💳 «✕ Цуцлах» товч ХАРАГДАВ (сонголт байгаа үед ✓)',
  (await evalJs(`(() => ${PAY_CLEAR} ? 'OK' : 'NO_BTN')()`)) === 'OK');

// ═══ ③b ХОЁР ДАХЬ утга — ОЛОН СОНГОЛТ (OR) ═══
listingReqs.length = 0;
const clicked2 = await clickPayment('cash');
check('🖱 «💵 Бэлэн төлөлтөөр» чип дарагдав (2 дахь сонголт)', clicked2 === 'OK', clicked2);
await waitFor(`/payment=lease,cash/.test(location.search)`);
check('🔗 URL: `?payment=lease,cash` (таслалаар, КАНОН дараалал ✓)',
  /payment=lease,cash/.test(decodeURIComponent(await url())), await url());
await sleep(1200);
check('🔎 DB: эхний нөхцөл `attrs.cs.{"payment_terms":["lease"]}`',
  dbQ('attrs.cs.{"payment_terms":["lease"]}'), lastQ());
check('🔎 DB: хоёр дахь нөхцөл `attrs.cs.{"payment_terms":["cash"]}` (OR ✓)',
  dbQ('attrs.cs.{"payment_terms":["cash"]}'), lastQ());
check('🚨 DB: нөхцөл бүр НЭГ ЭЛЕМЕНТТЭЙ массив — `["lease","cash"]` ХЭЛБЭРЭЭР ЯВАХГҮЙ (`22P02`-оос сэргийлнэ ✓)',
  !dbQ('["lease","cash"]'), lastQ());
check('🧭 DB: хэсгийн шүүлт ХЭВЭЭР (`.or()` нь AND-аар холбогдоно ✓)',
  dbQ('section=eq.real-estate'), lastQ());
ui1 = await paymentUi();
check('🖱 ХОЁР чип сонгогдсон (ОЛОН СОНГОЛТ ажиллаж байна ✓)',
  ui1.selected.join(',') === 'lease,cash', `selected=[${ui1.selected.join(',')}]`);
check('🔢 «2 сонгосон» badge', ui1.badge === 2, `badge=${ui1.badge}`);
check('🎛 Идэвхтэй шүүлтийн чип нь БҮТЭН шошгыг харуулна (`💳 Хувь лизингээр, Бэлэн төлөлтөөр`)',
  await evalJs(`[...document.querySelectorAll('button,span')].some((e) => /💳 Хувь лизингээр, Бэлэн төлөлтөөр/.test(e.textContent))`));

// ═══ ③c Дахин дарахад ЦУЦЛАГДАНА (checkbox мэт) ═══
listingReqs.length = 0;
await clickPayment('lease');
await waitFor(`/payment=cash/.test(location.search)`);
check('🖱 Дахин дарвал «лизинг» ЦУЦЛАГДАВ (URL: `?payment=cash`)',
  /payment=cash/.test(await url()) && !/lease/.test(await url()), await url());
await sleep(1200);
check('🔎 DB: буцаж НЭГ нөхцөл болов — `attrs=cs.{"payment_terms":["cash"]}`',
  dbQ('attrs=cs.{"payment_terms":["cash"]}'), lastQ());
check('🔎 DB: `or=(` ХЭЛБЭРЭЭР ЯВАХГҮЙ (нэг утга = contains ✓)',
  !dbQ('or=(attrs.cs.'), lastQ());

// ═══════ ④ 🔗 ХУУЧИН / ГАРААР БИЧСЭН ЛИНК ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&payment=cash,lease`);
const linkUi = await paymentUi();
check('🔗 `?payment=cash,lease` → чипүүд тэмдэглэгдэв (сонгосон = lease, cash)',
  linkUi.selected.join(',') === 'lease,cash', `selected=[${linkUi.selected.join(',')}]`);
check('🔗 Линкээр «Банкны зээлээр»/«Бартер солирхоно» СОНГОГДООГҮЙ ✓',
  !linkUi.selected.includes('loan') && !linkUi.selected.includes('barter'));
await sleep(1200);
check('🔎 DB: and=(…,or(attrs @> …)) — хоёр утга OR ✓',
  dbQ('attrs.cs.{"payment_terms":["lease"]}', 'attrs.cs.{"payment_terms":["cash"]}'), lastQ());

listingReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&payment=abc,%20LEASE`);
const junkUi = await paymentUi();
check('🧹 `?payment=abc, LEASE` → хүчингүй утга ХАСАГДАЖ, зөвхөн lease үлдэв',
  junkUi.selected.join(',') === 'lease', `selected=[${junkUi.selected.join(',')}]`);
await sleep(1200);
check('🔎 DB: зөвхөн `attrs=cs.{"payment_terms":["lease"]}` (abc огт явахгүй ✓)',
  dbQ('attrs=cs.{"payment_terms":["lease"]}') && !dbQ('abc'), lastQ());

// ═══════ ⑤ 🎛 ИДЭВХТЭЙ ШҮҮЛТИЙН ЧИПИЙГ ✕ ДАРЖ ЦЭВЭРЛЭХ ═══════
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&payment=lease,cash`);
const CHIP_BTN = `[...document.querySelectorAll('button')]
  .find((x) => /хайлтыг хасах/.test(x.getAttribute('aria-label') || '')
    && /💳/.test(x.getAttribute('aria-label') || ''))`;
const chipLabel = await evalJs(`(() => { const b = ${CHIP_BTN}; return b ? b.getAttribute('aria-label') : 'NO_CHIP'; })()`);
check('🎛 Идэвхтэй шүүлтийн чип `💳 Хувь лизингээр, Бэлэн төлөлтөөр` олдлоо',
  chipLabel !== 'NO_CHIP' && /Хувь лизингээр, Бэлэн төлөлтөөр/.test(chipLabel), chipLabel);
listingReqs.length = 0;
// ⚠️ Чип олдоогүй бол `click` ХИЙХГҮЙ — эс бөгөөс доорх `waitFor` 9с хүлээж
//    скрипт газар дээрээ гацана ✗ (тест унах ёстой, гацахгүй)
const chipClicked = chipLabel !== 'NO_CHIP'
  ? await evalJs(`(() => { const b = ${CHIP_BTN}; if (!b) return 'NO_CHIP'; b.click(); return 'OK'; })()`)
  : 'NO_CHIP';
check('🎛 ✕ товч дарагдав', chipClicked === 'OK', chipClicked);
await waitFor(`!/payment=/.test(location.search)`);
check('🎛 ✕ дарвал URL-аас payment арилав', !/payment=/.test(await url()), (await url()) || '(хоосон)');
await sleep(1200);
check('🔎 DB: payment шүүлт ч арилав (`attrs.cs.` ОГТ ЯВАХГҮЙ ✓)',
  !dbQ('attrs.cs.{"payment_terms"'), lastQ());
const afterChip = await paymentUi();
check('🎛 Чипүүд СОНГОГДООГҮЙ болов (selected=[])',
  afterChip.selected.length === 0, `selected=[${afterChip.selected.join(',')}]`);
check('🎛 Блок нь ХЭВЭЭР байна (шүүлт цэвэрлэх нь блокыг нуухгүй ✓)', afterChip.blocks === 1);

// ═══════ ⑤b «✕ Цуцлах» — бүх сонголтыг арилгана ═══════
// ⚠️ `&type=…` (дээрхтэй ижил шалтгаан — `<aside>` нь төрөл сонгосон үед л бий ✓)
await go(`${BASE}/?section=auto&type=${encodeURIComponent('Суудлын машин')}&payment=lease,cash,loan`);
check('🚗 Авто дээр 3 чип сонгогдсон', (await paymentUi()).selected.length === 3);
listingReqs.length = 0;
const clearClicked = await evalJs(`(() => { const b = ${PAY_CLEAR}; if (!b) return 'NO_BTN'; b.click(); return 'OK'; })()`);
check('💳 «✕ Цуцлах» дарагдав', clearClicked === 'OK', clearClicked);
await waitFor(`!/payment=/.test(location.search)`);
await sleep(1200);
const afterClear = await paymentUi();
check('🧹 Бүх сонголт арилав (selected=[]) ба URL/DB цэвэр',
  afterClear.selected.length === 0 && !dbQ('attrs.cs.{"payment_terms"'), `${await url()} — ${lastQ()}`);

// ═══════ ⑥ 🧹 ХЭСЭГ СОЛИХ ҮЕД ЦЭВЭРЛЭНЭ (архитектурын урхи) ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=jobs&payment=lease`);
await sleep(1200);
check('🧹 `?section=jobs&payment=lease` → ажил дээр payment ИГНОРХИЙГДЭНЭ (URL цэвэр)',
  !/payment=/.test(await url()), (await url()) || '(хоосон)');
check('🧹 DB: ажил дээр payment шүүлт ОГТ ЯВАХГҮЙ (эс бөгөөс «зар байхгүй» гарна ✗)',
  !dbQ('attrs.cs.{"payment_terms"') && !dbQ('payment_terms'), lastQ());
// ⚠️ Үл хөдлөх дээр шүүлттэй байхдаа бусад хэсэг рүү шилжих (breadcrumb/цэс) —
//    хэсэг солих функц нь `payments: []` болгоно ✓
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&payment=lease`);
const crumbClick = await evalJs(`(() => {
  const nav = [...document.querySelectorAll('nav')].find((n) => /Бүх зар/.test(n.textContent));
  if (!nav) return 'NO_NAV';
  const link = [...nav.querySelectorAll('a, button')].find((x) => x.textContent.trim() === 'Үл хөдлөх');
  if (!link) return 'NO_LINK';
  link.click();
  return 'OK';
})()`);
check('🍞 «Үл хөдлөх» breadcrumb (төрөл цэвэрлэх) линк олдлоо', crumbClick === 'OK', crumbClick);
await sleep(1200);
check('🍞 Дарахад «Орон сууц» төрөл цэвэрлэгдэв',
  !decodeURIComponent(await url()).includes('type='), decodeURIComponent(await url()));

// ═══════ ⑦ 📱 МОБАЙЛ (390×844) ═══════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&payment=lease`);
const mobileUi = await paymentUi();
check('📱 Мобайл: төлбөрийн чипүүд ХАРАГДАНА (4)',
  mobileUi.chips === 4, `chips=${mobileUi.chips}`);
check('📱 Мобайл: линкээр «Хувь лизингээр» сонгогдсон төлөвтэй',
  mobileUi.selected.join(',') === 'lease', `selected=[${mobileUi.selected.join(',')}]`);
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
