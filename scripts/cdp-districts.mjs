/**
 * 🗺 CDP ШАЛГАЛТ — «Дүүрэг / Сум» шүүлт (UI + URL + DB + breadcrumb)
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-03):
 *   ① «Дэлгэрэнгүй хайлтын Дүүрэг / Сум ийг Өрөөний тоо хайх тай адилхан
 *      олон сонгол хийх боломжтой болго» → `<select>` (нэг сонголт) нь
 *      ХОРООНЫ блоктой ИЖИЛ `chip-toggle` чипүүд болов
 *   ② «🛏 Өрөөний тоо гэдгийн доор Өрөө гэсэн байгаа text ийг арилга»
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① Дүүргийн блок БАЙНА: `[data-district-filter]` === 1,
 *      `[data-district-value]` === 9 (УБ-ын 9 дүүрэг), шошгууд нь дүүргийн
 *      нэрс; дүүрэг нь `<select>` БИШ (`select` дотор «Дүүрэг» гэж БАЙХГҮЙ ✓)
 *   ①b ЧИП ДАРАХ: «Баянгол» + «Сүхбаатар» → URL `?district=Баянгол,Сүхбаатар`
 *      · DB `district=in.(Баянгол,Сүхбаатар)` · «2 сонгосон» badge ·
 *      дахин дарвал ЦУЦЛАГДАНА (checkbox мэт toggle ✓)
 *   ①c ХОРООНЫ НЭГДЭЛ: 2 дүүрэг сонгоход хорооны чипүүд сонгосон БҮХ
 *      дүүргийн хороог (давхцалгүй нэрээр) харуулна; 1 дүүрэг рүү буцахад
 *      жагсаалт нь тэр дүүргийн хороогоор цэвэрлэгдэнэ ✓
 *   ①d 🗑 «Өрөө» гэсэн ИЛҮҮЦЭЛ шошго DOM-д БАЙХГҮЙ (хүсэлт ②) — «Өрөөний
 *      тоо» блокийн гарчиг хэвээр, badge нь «N сонгосон» ✓
 *   ② Аймаг (Дархан-Уул) дээр СУМдын чип гарна (4) ба хорооны блок ГАРАХГҮЙ
 *      (💡 «Дүүрэг / сумаа сонгоход хорооны жагсаалт нээгдэнэ» гэсэн зөвлөгөө)
 *   ③ ХУУЧИН линк `?district=Баянгол` — чип тэмдэглэгдэж, DB `district=eq.…`
 *      (`.in()` БИШ!) ба breadcrumb нь «Баянгол» гэж хэвээр ✓
 *   ④ Идэвхтэй шүүлтийн чип `📍 2 дүүрэг/сум` дээрх ✕ → дүүрэг цэвэрлэгдэнэ
 *   ⑤ «✕ Цуцлах» товч → БҮХ дүүрэг арилж, URL/DB цэвэр болно
 *   ⑥ breadcrumb: 2 дүүрэг → «2 дүүрэг/сум» · «Үл хөдлөх» линк → төрөл арилж sidebar ХАГАГДАВ (progressive ✓) — дүүрэг URL + crumb-д ХЭВЭЭР
 *   ⑦ 📱 Мобайл 390px: чипүүд харагдана, хэвтээ гүйлт (overflow) ГАРАХГҮЙ
 *   ⑧ Консол дээр JS exception 0
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээсэн байх:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-districts.mjs   (эсвэл npm run cdp:districts)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:districts` ✓
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
// ⚠️ `PUT /json/new` нь табыг BACKGROUND-д нээдэг → идэвхгүй табын renderer
//    хүйтэн болж `Runtime.evaluate` нь 30с timeout болдог ✗ → FRONT-д гаргана ✓
await rpc('Page.bringToFront');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** ⚠️ Renderer ачаалалтай үед `Runtime.evaluate` хааяа timeout болдог ✗ →
 *    НЭГ удаа дахин оролдоно ✓ */
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

/** 🗺 DOM дахь дүүргийн чипүүдийн төлөв (`data-district-*` дэгээгээр) */
const districtUi = () => evalJs(`(() => {
  const chips = [...document.querySelectorAll('[data-district-value]')];
  const html = document.documentElement.textContent || '';
  return {
    blocks: document.querySelectorAll('[data-district-filter]').length,
    chips: chips.length,
    labels: chips.map((b) => b.textContent.trim().replace(/^✓/, '').trim()),
    selected: chips.filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.getAttribute('data-district-value')),
    // ⚠️ aria-label="Дүүрэг / Сум" нь бүлэг (role=group div) дээр байдаг —
    //    зөвхөн button дундаас хайвал 0 гарч ХУУРАМЧ улаан өгнө ✗
    groups: [...document.querySelectorAll('[aria-label]')]
      .filter((e) => /Дүүрэг \\/ Сум/.test(e.getAttribute('aria-label') || '')).length,
    // ⚠️ ХУУЧИН нэг сонголттой select товч БҮРЭН арилсан эсэх (хүсэлт ①)
    //    (⚠️ ХҮСНЭГТ доторх текст — энд BACKTICK бичих ХЯЗГААРТАЙ: template
    //     literal-ыг тасалж, Node талд «select is not defined» алдаа өгнө ✗)
    selects: [...document.querySelectorAll('select')]
      .filter((s) => /Дүүрэг|Сум/.test(s.textContent || '')).length,
    // ⚠️ ХҮСЭЛТ ② — «Өрөөний тоо»-гийн доорх «Өрөө» гэсэн ганц текст зангилаа
    strayRoom: [...document.querySelectorAll('span,div,p,label')]
      .filter((e) => e.children.length === 0 && e.textContent.trim() === 'Өрөө').length,
    roomTitle: /Өрөөний тоо/.test(html),
    roomChips: document.querySelectorAll('[data-room-value]').length,
  };
})()`);

/** 🗺 Нэг дүүргийн чипийг дарах (утга нь дүүргийн нэр) */
const clickDistrict = (value) => evalJs(`(() => {
  const b = document.querySelector('[data-district-value="${value}"]');
  if (!b) return 'NO_CHIP';
  b.click();
  return 'OK';
})()`);

/** 🏘 Хорооны чипүүд (data-дэгээ байхгүй — «…хороо» төгсгөлөөр нь олно) */
const khorooUi = () => evalJs(`(() => {
  const btns = [...document.querySelectorAll('button')]
    .filter((b) => /хороо\\s*$/.test(b.textContent.trim()));
  return {
    chips: btns.length,
    unique: new Set(btns.map((b) => b.textContent.trim().replace(/^✓/, '').trim())).size,
    selected: btns.filter((b) => b.getAttribute('aria-pressed') === 'true').length,
    hint: /хорооны жагсаалт нээгдэнэ/.test(document.body.textContent),
  };
})()`);

/** 🏘 Нэг хорооны чипийг дарах (ж: «5-р хороо») */
const clickKhoroo = (value) => evalJs(`(() => {
  const b = [...document.querySelectorAll('button')]
    .find((x) => x.textContent.trim().replace(/^✓/, '').trim() === '${value}');
  if (!b) return 'NO_CHIP';
  b.click();
  return 'OK';
})()`);

let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};
const url = () => evalJs('location.search');
/**
 * ⚠️ Query-г ХҮН УНШИХ хэлбэрт хөрвүүлнэ: `decodeURIComponent` + `+` → зай.
 *    (`URLSearchParams`/`fetch` нь зайг `+` гэж бичдэг тул `decodeURIComponent`
 *     дангаараа «5-р+хороо» гэж үлдээж, хүлээгдэх текст таарахгүй ✗)
 * ⚠️ postgrest-js нь ЭНГИЙН утгуудыг (таслалт/хаалт/зайгүй) `in.(А,Б)` гэж
 *    ЦИТАТГҮЙ бичдэг — `"А"` гэж хүлээвэл ХУУРАМЧ улаан өгнө ✗ (DB дээр
 *    PostgREST хоёуланг ижил уншина ✓)
 */
const dec = (u) => decodeURIComponent(u).replace(/\+/g, ' ');
const dbQ = (...frags) => listingReqs.some((u) => frags.every((f) => dec(u).includes(f)));
/** ⚠️ `district=` гэсэн ЭНГИЙН хайлт нь `select=…district…`-тэй ХОЛЬДОЖ болзошгүй —
 *    тиймээс шүүлт БАЙГАА ЭСЭХИЙГ `eq.`/`in.` хэлбэрээр л шалгана ✓ */
const dbNoFilter = (col) => !listingReqs.some((u) => new RegExp(`${col}=(eq|in)\\.`).test(dec(u)));
const lastQ = () => dec(listingReqs[listingReqs.length - 1] || '').split('?')[1] || '(query байхгүй)';
const body = () => evalJs('document.body.textContent');
const UB = `${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&city=${encodeURIComponent('Улаанбаатар')}`;

console.log('\n🗺 CDP — дүүрэг / сумын шүүлт (UI + URL + DB + breadcrumb)\n');

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });
// ═══════ ① ОРОН СУУЦ + УБ: ДҮҮРЭГ НЬ ОЛОН СОНГОЛТТОЙ ЧИП (хүсэлт ①) ═══════
listingReqs.length = 0;
await go(UB);
const dom = await districtUi();
check('🗺 Дүүргийн блок БАЙНА (`[data-district-filter]` === 1)', dom.blocks === 1, `blocks=${dom.blocks}`);
check('🗺 Чип 9 байна (`[data-district-value]` === 9 — УБ-ын 9 дүүрэг)',
  dom.chips === 9, `chips=${dom.chips}`);
check('🗺 Шошгууд нь дүүргийн нэрс',
  dom.labels.join(', ') === 'Баянгол, Баянзүрх, Сүхбаатар, Хан-Уул, Чингэлтэй, Сонгинохайрхан, Налайх, Багануур, Багахангай',
  dom.labels.join(', '));
check('🗺 `aria-label="Дүүрэг / Сум"` бүлэг ТААРЛАА (хороотой ижил хэв маяг)',
  dom.groups === 1, `groups=${dom.groups}`);
check('🗺 ХУУЧИН нэг сонголттой `<select>` БҮРЭН арилав (`select` дотор «Дүүрэг» БАЙХГҮЙ)',
  dom.selects === 0, `selects=${dom.selects}`);

// ─────── ①d 🗑 ХҮСЭЛТ ②: «Өрөө» гэсэн илүүц ТЕКСТ арилсан эсэх ───────
check('🗑 «Өрөөний тоо»-гийн доорх «Өрөө» гэсэн ТЕКСТ БАЙХГҮЙ (хүсэлт ②)',
  dom.strayRoom === 0, `«Өрөө» ганц текст зангилаа=${dom.strayRoom}`);
check('🛏 «Өрөөний тоо» гарчиг ба 5 чип ХЭВЭЭР (регресс ✓)',
  dom.roomTitle && dom.roomChips === 5, `title=${dom.roomTitle}, chips=${dom.roomChips}`);

await sleep(1200);
check('🔎 Дүүрэг сонгоогүй үед DB query-д `district=eq./in.` ОРОХГҮЙ', dbNoFilter('district'), lastQ());

// ═══════ ①b ЧИП ДАРАХ → URL/DB/BADGE/TOGGLE (шинэ UI-ийн гол зам) ═══════
listingReqs.length = 0;
const clickBayangol = await clickDistrict('Баянгол');
const clickSukhbaatar = await clickDistrict('Сүхбаатар');
check('🗺 «Баянгол» чип дардагдав', clickBayangol === 'OK', clickBayangol);
check('🗺 «Сүхбаатар» чип дардагдав', clickSukhbaatar === 'OK', clickSukhbaatar);
await waitFor(`decodeURIComponent(location.search).includes('district=Баянгол,Сүхбаатар')`);
check('🔗 Дарахад URL `?district=Баянгол,Сүхбаатар` болов',
  decodeURIComponent(await url()).includes('district=Баянгол,Сүхбаатар'), decodeURIComponent(await url()));
await sleep(1200);   // ⏳ DB query дуустахыг хүлээ (детермен)
check('🔎 DB: `district=in.(Баянгол,Сүхбаатар)` — чипээр шүүлт ХИЙГДЭВ',
  dbQ('district=in.(Баянгол,Сүхбаатар)'), lastQ());
const afterClick = await districtUi();
check('🗺 Сонгосон чипүүд `✓` төлөвтэй (`aria-pressed`)',
  afterClick.selected.join(',') === 'Баянгол,Сүхбаатар', `selected=[${afterClick.selected.join(',')}]`);
check('🗺 Badge «2 сонгосон» харагдана', /2 сонгосон/.test(await body()));

// ─────── ①c ХОРООНЫ НЭГДЭЛ — сонгосон БҮХ дүүргийн хороо ───────
const khUnion = await khorooUi();
check('🏘 2 дүүрэг сонгоход хорооны чипүүд ГАРАВ', khUnion.chips > 0, `chips=${khUnion.chips}`);
check('🏘 Хорооны нэр ДАВХЦАЛГҮЙ (нэгдэл) — чип = өвөрмөц нэр',
  khUnion.chips === khUnion.unique, `${khUnion.chips} чип / ${khUnion.unique} өвөрмөц`);
check('🏘 Нэгдэл нь 33 чип (Баянгол 33 ∪ Сүхбаатар 20 — давхцсан нэр хасагдав)',
  khUnion.chips === 33, `chips=${khUnion.chips}`);
listingReqs.length = 0;
const clickK5 = await clickKhoroo('5-р хороо');
check('🏘 «5-р хороо» чип дардагдав', clickK5 === 'OK', clickK5);
await waitFor(`decodeURIComponent(location.search).includes('khoroo=')`);
await sleep(1200);
check('🔎 DB: `khoroo=in.(5-р хороо)` нь `district=in.(…)`-тай ХАМТ явна',
  dbQ('khoroo=in.(5-р хороо)', 'district=in.'), lastQ());
const clickOff = await clickDistrict('Баянгол');
await waitFor(`!decodeURIComponent(location.search).includes('Баянгол')`);
check('🗺 Дахин дарвал ЦУЦЛАГДАВ (checkbox мэт toggle ✓)', clickOff === 'OK', clickOff);
await sleep(900);
const afterToggle = await districtUi();
check('🗺 Зөвхөн «Сүхбаатар» үлдэв (selected=[Сүхбаатар])',
  afterToggle.selected.join(',') === 'Сүхбаатар', `selected=[${afterToggle.selected.join(',')}]`);
const khAfter = await khorooUi();
check('🏘 Хорооны жагсаалт шинэ дүүрэгт таарч 20 болов (Сүхбаатар 20 хороо)',
  khAfter.chips === 20, `chips=${khAfter.chips}`);
check('🏘 Хорооны сонголт ч ЦЭВЭРЛЭГДЭВ (дүүрэг солигдсон тул ✓)',
  khAfter.selected === 0, `selected=${khAfter.selected}`);
check('🔗 URL-аас `khoroo` арилав (дүүрэг солиход хороо цэвэрлэгддэг ✓)',
  !/khoroo=/.test(await url()), await url());


// ═══════ ② АЙМАГ (Дархан-Уул) — СУМдын чип + хорооны блок ГАРАХГҮЙ ═══════
const DARHAN = `${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&city=${encodeURIComponent('Дархан-Уул')}`;
listingReqs.length = 0;
await go(DARHAN);
const aymag = await districtUi();
check('🗺 Аймаг (Дархан-Уул) дээр СУМдын чип 4 байна', aymag.chips === 4,
  `${aymag.chips}: ${aymag.labels.join(', ')}`);
const khAymag = await khorooUi();
check('🏘 Аймагт хорооны блок ГАРАХГҮЙ (0 чип)', khAymag.chips === 0, `chips=${khAymag.chips}`);
check('💡 «…хорооны жагсаалт нээгдэнэ» зөвлөгөө ХАРАГДАНА (хороо байхгүй тул)',
  khAymag.hint);
listingReqs.length = 0;
const clickDarhan = await clickDistrict('Дархан');
await waitFor(`decodeURIComponent(location.search).includes('district=Дархан')`);
check('🗺 Аймагт ч чип ажиллана (URL `district=Дархан`)',
  decodeURIComponent(await url()).includes('district=Дархан'), decodeURIComponent(await url()));
await sleep(1200);
check('🔎 Аймагт НЭГ сум → DB `district=eq.Дархан` (`.in()` БИШ ✓)',
  dbQ('district=eq.Дархан'), lastQ());

// ═══════ ③ ХУУЧИН НЭГ УТГАТАЙ ЛИНК — БУЦАХ ХОЛБООГҮЙ АЖИЛЛАХ ЁСТОЙ ═══════
listingReqs.length = 0;
await go(`${UB}&district=${encodeURIComponent('Баянгол')}`);
await sleep(1200);
check('🔎 `?district=Баянгол` → DB `district=eq.Баянгол` (ХУУЧИН гэрээ ЯГ ижил ✓)',
  dbQ('district=eq.Баянгол'), lastQ());
const legacy = await districtUi();
check('🗺 Линкээс ирсэн утга чип дээр ТЭМДЭГЛЭГДЭВ',
  legacy.selected.join(',') === 'Баянгол', `selected=[${legacy.selected.join(',')}]`);
check('🏘 Линкээр орход хорооны чипүүд нээгдэв (33 — Баянгол)',
  (await khorooUi()).chips === 33);
check('🍞 Breadcrumb нэг дүүргийг НЭРЭЭР нь харуулна («Баянгол»)',
  /Баянгол/.test(await evalJs(`[...document.querySelectorAll('nav')].map((n) => n.textContent).join(' | ')`)));

// ═══════ ④ ИДЭВХТЭЙ ШҮҮЛТИЙН ЧИП ✕ — дүүргийг бүрэн цэвэрлэнэ ═══════
await go(`${UB}&district=${encodeURIComponent('Баянгол,Сүхбаатар')}`);
// ⚠️ Чип нь «📍 2 дүүрэг/сум» гэсэн ШОШГОТОЙ байх ёстой (нэг утгатай үед нэрээ ✓)
const DIST_CHIP = `[...document.querySelectorAll('button')].find((x) => {
  const a = x.getAttribute('aria-label') || '';
  return /хайлтыг хасах/.test(a) && /дүүрэг/.test(a);
})`;
const chipLabel = await evalJs(`(() => { const b = ${DIST_CHIP}; return b ? b.getAttribute('aria-label') : 'NO_CHIP'; })()`);
check('🎛 Идэвхтэй шүүлтийн чип `📍 2 дүүрэг/сум` олдлоо', chipLabel !== 'NO_CHIP', chipLabel);
listingReqs.length = 0;
const chipClicked = await evalJs(`(() => { const b = ${DIST_CHIP}; if (!b) return 'NO_CHIP'; b.click(); return 'OK'; })()`);
check('🎛 Чипийн ✕ товч дардагдав', chipClicked === 'OK', chipClicked);
await waitFor(`!/[?&]district=/.test(location.search)`);
check('🧹 ✕ дарвал URL-аас `district` арилав',
  !/[?&]district=/.test(await url()), await url());
await sleep(1200);
check('🔎 DB: `district=eq./in.` шүүлт ч арилав', dbNoFilter('district'), lastQ());

// ═══════ ⑤ «✕ Цуцлах» ТОВЧ — дүүргийн блок дотроос олдож ажиллана ═══════
await go(`${UB}&district=${encodeURIComponent('Баянгол,Хан-Уул')}`);
// ⚠️ «✕ Цуцлах» нь өөр блок (Өрөө/Үнэ…) дээр ч байдаг → дүүргийн блокийн
//    ЭЦЭГ элемент дотроос л хайна ✓ (scope-гүй бол буруу товч дарах ✗)
const DIST_CLEAR = `(() => {
  const box = document.querySelector('[data-district-filter]');
  if (!box) return null;
  const wrap = box.parentElement;
  return [...wrap.querySelectorAll('button')].find((x) => x.textContent.trim() === '✕ Цуцлах') || null;
})()`;
check('🗺 Сонгосон үед дүүргийн «✕ Цуцлах» товч ХАРАГДАВ',
  (await evalJs(`(() => ${DIST_CLEAR} ? 'OK' : 'NO_BTN')()`)) === 'OK');
listingReqs.length = 0;
const clickedClear = await evalJs(`(() => { const b = ${DIST_CLEAR}; if (!b) return 'NO_BTN'; b.click(); return 'OK'; })()`);
check('🗺 «✕ Цуцлах» дардагдав', clickedClear === 'OK', clickedClear);
await waitFor(`!/[?&]district=/.test(location.search)`);
check('🧹 URL-аас `district` арилав', !/[?&]district=/.test(await url()), await url());
await sleep(1200);
check('🧹 Цэвэрлэсний дараах DB query-д `district=eq./in.` БАЙХГҮЙ',
  dbNoFilter('district'), lastQ());
check('🗺 Бүх чип СОНГОГДООГҮЙ болов', (await districtUi()).selected.length === 0);
check('🗺 «✕ Цуцлах» товч ХАРАГДАХАА БОЛИВ',
  (await evalJs(`(() => ${DIST_CLEAR} ? 'OK' : 'NO_BTN')()`)) === 'NO_BTN');


// ═══════ ⑥ BREADCRUMB — ОЛОН ДҮҮРЭГ «2 дүүрэг/сум» БОЛЖ ХАРАГДАНА ═══════
await go(`${UB}&district=${encodeURIComponent('Баянгол,Сүхбаатар')}`);
const crumbs = await evalJs(`[...document.querySelectorAll('nav')].map((n) => n.textContent).join(' | ')`);
check('🍞 Breadcrumb олон дүүргийг «2 дүүрэг/сум» гэж харуулна',
  /2 дүүрэг\/сум/.test(crumbs), crumbs.slice(0, 140));
// ⚠️ `clearType` (эсвэл crumb-ийн `nav.filters`) нь зөвхөн төрөл/өрөөг цэвэрлэнэ —
//    БАЙРШИЛ (дүүрэг, хороо, хот) нь БИЕ ДААСАН шүүлт тул ХЭВЭЭР байх ЁСТОЙ ✓
const crumbClick = await evalJs(`(() => {
  const nav = [...document.querySelectorAll('nav')].find((n) => /Бүх зар/.test(n.textContent));
  if (!nav) return 'NO_NAV';
  const link = [...nav.querySelectorAll('a, button')].find((x) => x.textContent.trim() === 'Үл хөдлөх');
  if (!link) return 'NO_LINK:' + [...nav.querySelectorAll('a, button')].map((x) => x.textContent.trim()).join(' | ');
  link.click();
  return 'OK';
})()`);
check('🍞 «Үл хөдлөх» breadcrumb линк олдлоо', crumbClick === 'OK', crumbClick);
await sleep(1200);
check('🍞 Дарахад дүүрэг ХЭВЭЭР (байршил нь төрлөөс үл хамаарах шүүлт ✓)',
  decodeURIComponent(await url()).includes('district=Баянгол,Сүхбаатар'), decodeURIComponent(await url()));
// ⚠️ «Үл хөдлөх» буюу `type` (төрөл) цэвэрлэгдсэн тул sidebar нь ПРОГРЕССИВ
//    ДИСКЛОЗУРААР (мөр 1760: `{filters.propertyType && (…)}`) БҮРЭН
//    ХАГАГДАНА — хорооны чип байхгүй нь АЛДАА БИШ, зориудын зан төлөв ✓
check('🍞 Төрөл цэвэрлэгдэхэд sidebar ХАГАГДАВ (blocks=0 — progressive ✓)',
  (await districtUi()).blocks === 0, `blocks=${(await districtUi()).blocks}`);
check('🍞 «2 дүүрэг/сум» breadcrumb мөрөндөө ХЭВЭЭР (байршил үл хамаарах ✓)',
  /2 дүүрэг\/сум/.test(await evalJs(`[...document.querySelectorAll('nav')].map((n) => n.textContent).join(' | ')`)));
// ⚠️ Төрлийг ЭРГҮҮЛЭН сонгоход хорооны нэгдэл (33) ба чипүүд ХЭВЭЭР байх
//    ЁСТОЙ — URL-аас сэргээгдэж байгаа эсэхийг батлана ✓
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&city=${encodeURIComponent('Улаанбаатар')}&district=${encodeURIComponent('Баянгол,Сүхбаатар')}`);
check('🏘 Төрөл + 2 дүүрэг → хорооны нэгдэл 33 чип (өөрчлөгдөөгүй ✓)',
  (await khorooUi()).chips === 33, `chips=${(await khorooUi()).chips}`);
check('🗺 Чипүүд 2 сонгогдсон хэвээр (URL-аас сэргээгдэв ✓)',
  (await districtUi()).selected.join(',') === 'Баянгол,Сүхбаатар');

// ═══════ ⑦ МОБАЙЛ (390×844) — чипүүд харагдана, overflow ГАРАХГҮЙ ═══════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await go(`${UB}&district=${encodeURIComponent('Баянгол,Сүхбаатар')}`);
const mobileUi = await districtUi();
check('📱 Мобайл: дүүргийн чипүүд БҮГД ХАРАГДАНА (9)',
  mobileUi.chips === 9, `chips=${mobileUi.chips}`);
check('📱 Мобайл: линкээр 2 дүүрэг сонгогдсон төлөвтэй',
  mobileUi.selected.join(',') === 'Баянгол,Сүхбаатар', `selected=[${mobileUi.selected.join(',')}]`);
check('📱 Мобайл: 🗑 «Өрөө» гэсэн илүүц текст ГАРАХГҮЙ (хүсэлт ②)',
  mobileUi.strayRoom === 0, `stray=${mobileUi.strayRoom}`);
check('📱 Мобайл: хэвтээ гүйлт (overflow) ГАРАХГҮЙ',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'),
  await evalJs('document.documentElement.scrollWidth + "/" + window.innerWidth'));
await rpc('Emulation.clearDeviceMetricsOverride');

// ═══════ ⑧ ДҮГНЭЛТ ═══════
check('🧯 Консол дээр exception ГАРАГҮЙ', exceptions.length === 0, exceptions.slice(0, 2).join(' | '));
check('🧯 Ямар ч алдаатай (4xx/5xx) listings query ГАРАГҮЙ',
  !listingReqs.some((u) => /district=in\.\(\)/.test(decodeURIComponent(u))),
  listingReqs.slice(-1)[0] || '(query байхгүй)');
console.log(`\n${fail === 0 ? '✅' : '❌'} CDP дүүрэг/сум — ${pass} OK, ${fail} FAIL\n`);
ws.close();
await closeOwnTab();
process.exit(fail === 0 ? 0 : 1);

