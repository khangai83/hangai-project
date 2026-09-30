/**
 * 🛏 CDP ШАЛГАЛТ — «Өрөөний тоо» ОЛОН СОНГОЛТ (2026-09-30)
 *
 * Хэрэглэгчийн хүсэлт: «өрөөг хороо шиг сонгодог байвал зүгээр юм уу»
 *   → чип дарж 1, 3, «+5»-ыг ЗЭРЭГ сонгоно; URL `?rooms=1,3`; DB дээр
 *     `rooms=in.(1,3)`, завсартай үед `or=(rooms.in.(…),rooms.gte.5)` ✓
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
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evalJs = async (expression) => {
  const r = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails.text));
  return r.result.value;
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
/** ⚠️ `#listing-results` (гарчиг) ба `aside` (хажуугийн панель) — хоёулаа ижил
 *   шүүлттэй байх ЁСТОЙ (нэг эх сурвалж). Тиймээс тусдаа шалгана ✓ */
const SCOPE = { row: '#listing-results', side: 'aside' };
const blockInfo = (scope) => evalJs(`(() => {
  const b = document.querySelector(${JSON.stringify(scope)} + ' [data-room-filter]');
  if (!b) return null;
  return {
    n: b.querySelectorAll('[data-room-value]').length,
    text: [...b.querySelectorAll('[data-room-value]')].map((x) => x.textContent.trim()),
    on: [...b.querySelectorAll('[data-room-value]')]
      .filter((x) => x.getAttribute('aria-pressed') === 'true')
      .map((x) => x.dataset.roomValue),
  };
})()`);
const clickRoom = (scope, value) => evalJs(`(() => {
  const b = document.querySelector(${JSON.stringify(scope)} + ' [data-room-filter]');
  if (!b) return 'NO_BLOCK';
  const btn = [...b.querySelectorAll('[data-room-value]')].find((x) => x.dataset.roomValue === ${JSON.stringify(value)});
  if (!btn) return 'NO_CHIP';
  btn.click();
  return 'OK';
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

console.log('\n🛏 CDP — өрөөний тоо (олон сонголт)\n');

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });

// ═══════ ① ТӨРӨЛ СОНГООГҮЙ Ч ӨРӨӨНИЙ ХАЙЛТ ХАРАГДАНА (шинэ) ═══════
await go(`${BASE}/?section=real-estate`);
const row0 = await blockInfo(SCOPE.row);
check('📊 Төрөл сонгоогүй ч үр дүнгийн мөрөнд 5 өрөөний сонголт гарлаа', row0?.n === 5,
  JSON.stringify(row0?.text || []));
check('📊 Чип бүр дээр зарын ТОО харагдана (ж: «21»)', /^1 өрөө\d+$/.test(row0?.text?.[0] || ''), row0?.text?.[0]);
check('📊 Төрөл сонгоогүй үед хажуугийн панель нээгдээгүй (progressive disclosure ✓)',
  (await blockInfo(SCOPE.side)) === null);

// ═══════ ② ТӨРӨЛ СОНГОХОД ХОЁР ГАЗАРТ (хажуу + мөр) гарна ═══════
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}`);
const side0 = await blockInfo(SCOPE.side);
check('🧭 Хажуугийн панельд «Өрөөний тоо» чипүүд (хороо шиг загвар ✓)', side0?.n === 5);
check('🧭 Хоёр газарт ижил сонголт (нэг эх сурвалж): ' + JSON.stringify(side0?.on),
  JSON.stringify(side0?.on) === JSON.stringify((await blockInfo(SCOPE.row))?.on));

// ═══════ ③ НЭГ ЧИП → URL + DB ═══════
listingReqs.length = 0;
check('🖱 Чип дарж болно', (await clickRoom(SCOPE.side, '3')) === 'OK');
await waitFor(`location.search.includes('rooms=3')`);
check('🖱 «3 өрөө» дарвал URL: ?rooms=3', decodeURIComponent(await url()).includes('rooms=3'), decodeURIComponent(await url()));
check('🖱 Чип СОНГОГДСОН төлөвтэй (aria-pressed + ✓)',
  JSON.stringify((await blockInfo(SCOPE.side))?.on) === JSON.stringify(['3']),
  (await blockInfo(SCOPE.side))?.text?.join(' · '));
await sleep(1200);          // ⏳ DB query дуустахыг хүлээ (детермен)
check('🔎 DB: rooms=in.(3)', dbQ('rooms=in.(3)'), lastQ());
check('🏷 «1 сонгосон» тоолуур гарлаа', /1 сонгосон/.test(await body()));

// ═══════ ④ ХОЁР ДАХЬ ЧИП → ОЛОН СОНГОЛТ ═══════
listingReqs.length = 0;
await clickRoom(SCOPE.side, '1');
await waitFor(`location.search.includes('rooms=1,3')`);
check('🖱 «1 өрөө»-г ЗЭРЭГ дарвал URL: ?rooms=1,3  ← ОЛОН СОНГОЛТ ✓',
  decodeURIComponent(await url()).includes('rooms=1,3'), decodeURIComponent(await url()));
check('🖱 ХОЁУЛАА сонгогдсон (checkbox мэт ✓)',
  JSON.stringify((await blockInfo(SCOPE.side))?.on) === JSON.stringify(['1', '3']));
check('🔎 DB: rooms=in.(1,3)', dbQ('rooms=in.(1,3)'), lastQ());
check('🏷 «2 сонгосон» тоолуур', /2 сонгосон/.test(await body()));
check('🏷 Шошго «1, 3 өрөө» (чип/breadcrumb)', /1, 3 өрөө/.test(await body()));
check('🧭 Үр дүнгийн мөрөнд ч ижил сонголт (sync ✓)',
  JSON.stringify((await blockInfo(SCOPE.row))?.on) === JSON.stringify(['1', '3']));

// ═══════ ⑤ «+5» НЭМЭХ → ЗАВСАРТАЙ ХОСЛОЛ → DB дээр `.or()` ═══════
listingReqs.length = 0;
await clickRoom(SCOPE.side, '5');
await waitFor(`location.search.includes('rooms=1,3,5')`);
check('🖱 «+5 өрөө» нэмэхэд URL: ?rooms=1,3,5',
  decodeURIComponent(await url()).includes('rooms=1,3,5'), decodeURIComponent(await url()));
check('🔎 DB: or=(rooms.in.(1,3),rooms.gte.5)  ← завсартай хослол',
  dbQ('or=(rooms.in.(1,3),rooms.gte.5)', 'section=eq.real-estate'), lastQ());
check('🏷 Шошго «1, 3, 5+ өрөө»', /1, 3, 5\+ өрөө/.test(await body()));

// ═══════ ⑥ МӨРНИЙ ЧИПЭЭР ХАСАХ (checkbox мэт toggle) ═══════
listingReqs.length = 0;
await clickRoom(SCOPE.row, '5');
await waitFor(`location.search.includes('rooms=1,3')`);
const afterOff = decodeURIComponent(await url());
check('🖱 Үр дүнгийн мөрнөөс «+5» дарвал ХАСАГДАЖ ?rooms=1,3',
  afterOff.includes('rooms=1,3') && !afterOff.includes('5'), afterOff);
check('🔎 DB буцаж rooms=in.(1,3) (завсарлага арилав)', dbQ('rooms=in.(1,3)'), lastQ());
check('🏷 Сонголт 2 болж тоолуур буцлаа', /2 сонгосон/.test(await body()));

// ═══════ ⑦ «✕ Цуцлах» — бүх өрөөний шүүлтийг арилгах ═══════
await evalJs(`[...document.querySelectorAll('button')].find((b) => b.textContent.includes('Цуцлах'))?.click()`);
await waitFor(`!/rooms=/.test(location.search)`);
check('↺ «✕ Цуцлах» → URL-аас rooms арилав', !/rooms=/.test(await url()), (await url()) || '(хоосон)');
check('↺ Чипүүд СОНГОГДООГҮЙ төлөвт буцлаа',
  (await blockInfo(SCOPE.side))?.on?.length === 0 && (await blockInfo(SCOPE.row))?.on?.length === 0);

// ═══════ ⑧ ХУУДСАН ЛИНКЭЭР ОРОХ: `?rooms=4,5` ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=4,5`);
check('🔗 `?rooms=4,5` линкээр орвол чипүүд СОНГОГДСОН байдалтай',
  JSON.stringify((await blockInfo(SCOPE.side))?.on) === JSON.stringify(['4', '5']),
  JSON.stringify((await blockInfo(SCOPE.side))?.on));
check('🔎 DB: rooms=gte.4 (4 ба түүнээс дээш)', dbQ('rooms=gte.4'), lastQ());
check('🏷 Шошго «4, 5+ өрөө»', /4, 5\+ өрөө/.test(await body()));

// ═══════ ⑨ РЕГРЕСС: ХУУЧИН `?rooms=5` линк ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=5`);
check('📌 `?rooms=5` → DB: rooms=gte.5 (хуучинтай ЯГ ижил ✓)', dbQ('rooms=gte.5'), lastQ());
check('📌 `?rooms=5` → зөвхөн «+5 өрөө» сонгогдсон',
  JSON.stringify((await blockInfo(SCOPE.side))?.on) === JSON.stringify(['5']));

// ═══════ ⑩ БУРУУ УТГА → ЦЭВЭРЛЭГЭД НОРМАЛЧИЛНА ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=abc,3,9`);
const norm = decodeURIComponent(await url());
check('🧹 `rooms=abc,3,9` → URL `rooms=3,5` (abc хаягдаж, 9 → 5+)', norm.includes('rooms=3,5'), norm);
check('🧹 DB: or=(rooms.in.(3),rooms.gte.5)', dbQ('or=(rooms.in.(3),rooms.gte.5)'), lastQ());

// ═══════ ⑪ МОБАЙЛ (390×844) ═══════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=2`);
check('📱 Мобайл: өрөөний чипүүд харагдана', (await blockInfo(SCOPE.side))?.n === 5);
check('📱 Мобайл: хэвтээ гүйлт (overflow) ГАРАХГҮЙ',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'),
  await evalJs('document.documentElement.scrollWidth + "/" + window.innerWidth'));
listingReqs.length = 0;
await clickRoom(SCOPE.side, '2');           // ⚠️ зөвхөн 2 байсан → дарахад ЦУЦЛАГДАНА
await waitFor(`!/rooms=/.test(location.search)`);
check('📱 Мобайл дээр чип дарж хасагдана (rooms арилав)', !/rooms=/.test(await url()), await url());
await clickRoom(SCOPE.side, '3');
await waitFor(`location.search.includes('rooms=3')`);
check('📱 Мобайл дээр дарахад сонгогдоно (?rooms=3)', dbQ('rooms=in.(3)'), lastQ());
await rpc('Emulation.clearDeviceMetricsOverride');

// ═══════ ⑫ BREADCRUMB-ийн линк нь өрөөний шүүлтийг ЦЭВЭРЛЭНЭ ═══════
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&rooms=1,3`);
check('🍞 Breadcrumb дээр «1, 3 өрөө» гарлаа',
  /1, 3 өрөө/.test(await evalJs(`document.querySelector('nav')?.textContent || ''`)));
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
check('🍞 Чипүүд ч цэвэрлэгдэв', (await blockInfo(SCOPE.row))?.on?.length === 0);

// ═══════ ⑬ ДҮГНЭЛТ ═══════
check('🧯 Консол дээр exception ГАРАГҮЙ', exceptions.length === 0, exceptions.slice(0, 2).join(' | '));
console.log(`\n${fail === 0 ? '✅' : '❌'} CDP — ${pass} OK, ${fail} FAIL\n`);
ws.close();
process.exit(fail === 0 ? 0 : 1);


