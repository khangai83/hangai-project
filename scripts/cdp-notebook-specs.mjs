/**
 * 🖥 CDP ШАЛГАЛТ — 💻 Notebook-ийн ШҮҮЛТ (📺 Дэлгэц · ⚙️ CPU · 🧠 RAM · 💾 Хард)
 *
 * 🆕 2026-10-03 (7): ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (unegui.mn-ийн Notebook хайлтын зураг):
 *   «notebook хайх дээр Дэлгэцийн хэмжээ · CPU · RAM · SSD Hard шүүлтүүд
 *    гардаг байх» ⇒ 💻 `computers` хэсгийн sidebar-д 4 шүүлт НЭМЭГДЭВ
 *   (форм дээр аль хэдийн байсан `onlySubtypes` талбаруудыг шүүлтэд холбов).
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① `?section=computers&type=Apple` (Notebook брэнд) дээр sidebar-д 4 `<select>`
 *      гарна: `[data-attr-filter]` === 5 (4 үзүүлэлт + ✅ төлөв), дараалал нь
 *      формтой ИЖИЛ (📺 → ⚙️ → 🧠 → 💾 → ✅), эхний сонголт нь «Бүгд» ✓
 *   ①b Сонголтын жагсаалт нь `lib/locationData.js`-ийн жагсаалттай ЯГ ижил
 *      (7 / 19 / 13 / 6 + «Бүгд») — DOM ↔ либ харьцуулалт ✓
 *   ② УТГА СОНГОХ: `⚙️ Intel Core i5` → URL `?attr_cpu=Intel+Core+i5` ·
 *      DB `attrs->>cpu=eq.Intel Core i5` · идэвхтэй чип «⚙️ Intel Core i5» ✓
 *   ②b ҮР ДҮНГИЙН ТОО буурна (шүүлт нь бодит DB дээр ажиллаж байна ✓)
 *   ③ ЛИНКЭЭР ОРОХ: `?attr_cpu=…` нь `<select>` дээр тэмдэглэгдэж, хэвээр үлдэнэ
 *      (URL бичигдэхдээ ХАСАГДАХГҮЙ ✓)
 *   ④ ХОЛДУУ ДЭД ТӨРӨЛ (`type=Mouse`): 4 шүүлт ГАРАХГҮЙ
 *      (`[data-attr-filter]` === 1) ба DB query-д `attrs->>cpu` ОГТ ЯВАХГҮЙ ✓
 *   ⑤ ҮЛ ҮЗЭГДЭХ ШҮҮЛТ (архитектурын урхи): `?type=Mouse&attr_cpu=…` линкээр
 *      орвол `attr_cpu` нь ЧИМЭЭГҮЙ хасагдана (`pruneGatedAttrs`) — эс бөгөөс
 *      sidebar-д харагдахгүй шүүлт заруудыг шүүж, «0 үр дүн» гарах байв ✗
 *   ⑥ Дэд төрөл СОНГООГҮЙ (`?section=computers`) үед sidebar БАЙХГҮЙ ✓
 *   ⑦ БУСАД ХЭСЭГ ХӨНДӨГДӨӨГҮЙ: 🚗 авто дээр `[data-attr-filter]` === 3
 *      (🎨 өнгө · 🔀 хайрцаг · ⛽ түлш — 🏷️ брэнд нь combobox, он нь хүрээ)
 *      ба `attrs->>fuel=eq.Хайбрид` хэвээр ажиллана ✓
 *   ⑧ 📱 Мобайл 390px: 5 шүүлт харагдаж, хэвтээ гүйлт (overflow) 0 ✓
 *   ⑨ Консол дээр JS exception 0 ✓
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээсэн байх:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-notebook-specs.mjs   (эсвэл npm run cdp:specs)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:filters` ✓
 */
import { getAttrFilters } from '../lib/locationData.js';

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
// ⚠️ Chrome-д олон таб нээлттэй байвал хуучин таб нь `Runtime.evaluate`-д хариу
//    өгөхгүй hang болдог ✗ → ШИНЭ таб нээж түүн дээр ажиллана ✓
let page = null;
try {
  const created = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (created.ok) page = await created.json();
} catch { /* хуучин Chrome (PUT дэмжихгүй) → доорх нөөц зам ✓ */ }
let ownTab = !list.some((t) => t.id === page?.id);
if (!page?.webSocketDebuggerUrl) {
  const pages = list.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  page = pages[0];
  ownTab = false;
}
// ⚠️ `PUT /json/new` нь табыг BACKGROUND-д нээдэг → FRONT-д гаргана ✓
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
const go = async (address) => {
  await rpc('Page.navigate', { url: address });
  await waitFor(`document.readyState === 'complete'`);
  await sleep(700);
};

/**
 * 🖥 Sidebar дахь attr шүүлтүүдийн төлөв — `[data-attr-filter]` дэгээгээр
 * 🆕 2026-10-03 (13): `#advanced-filters` (aside) нь ХЭСЭГ (2-р түвшин) ба
 *    «Бүх зар» (1-р түвшин) дээр Ч бий — `showAdvancedFilters` нь ҮРГЭЛЖ ✓
 *    ⏳ урьд нь ЗӨВХӨН дэд төрөл сонгосон үед байв ✗ (progressive disclosure)
 *    (`components/HomeClient.jsx`: `{showAdvancedFilters && (<aside …>)}`)
 */
const specUi = () => evalJs(`(() => {
  const aside = document.getElementById('advanced-filters');
  const sels = [...(aside ? aside.querySelectorAll('[data-attr-filter]') : [])];
  const txt = (el) => (el && el.textContent ? el.textContent.trim() : '');
  const footer = aside
    ? [...aside.querySelectorAll('p')].find((p) => /зар харуулах/.test(p.textContent))
    : null;
  const m = footer ? footer.textContent.match(/([0-9][0-9.,]*)\\s*зар харуулах/) : null;
  return {
    sidebar: !!aside,
    total: sels.length,
    keys: sels.map((s) => s.getAttribute('data-attr-filter')),
    labels: sels.map((s) => (s.getAttribute('aria-label') || '').trim()),
    values: sels.map((s) => s.value),
    first: sels.map((s) => (s.options[0] ? txt(s.options[0]) : '')),
    counts: sels.map((s) => s.options.length),
    options: sels.map((s) => [...s.options].slice(1).map(txt)),
    blocks: [...document.querySelectorAll('#advanced-filters .divide-y > div')]
      .map((b) => txt(b.firstElementChild)),
    chips: [...document.querySelectorAll('[aria-label$="хайлтыг хасах"]')]
      .map((b) => (b.getAttribute('aria-label') || '').replace(' хайлтыг хасах', '')),
    count: m ? Number(m[1].replace(/[^0-9]/g, '')) : null,
  };
})()`);

/** 🎛 Талбарын утгыг React-д мэдэгдэн солих (натив setter + change — `cdp-range.mjs`-ийн ЯГ ижил арга) */
const setSelect = (key, value) => evalJs(`(() => {
  const el = document.querySelector('[data-attr-filter="' + ${JSON.stringify(key)} + '"]');
  if (!el) return 'NO_EL';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  setter.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return 'OK';
})()`);

let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};
const url = () => evalJs('location.search');
/**
 * ⚠️ Query мөрөнд зай нь `+` болж кодлогддог (`attr_cpu=Intel+Core+i5`) —
 *    `decodeURIComponent` нь `+`-ыг зай болгохгүй тул гараар солино ✓
 *    (PostgREST `+`-ыг зай гэж уншина — бодит query-д `attrs->>cpu=eq.Intel Core i5`)
 */
const dbQ = (...frags) => listingReqs.some((u) => {
  const s = decodeURIComponent(u).replace(/\+/g, ' ');
  return frags.every((f) => s.includes(f));
});
const lastQ = () => decodeURIComponent(listingReqs[listingReqs.length - 1] || '')
  .split('?')[1].replace(/\+/g, ' ') || '(query байхгүй)';

/**
 * ⚠️ Хүлээгдэж буй жагсаалт нь ЛИБЭЭС (`lib/locationData.js`) — DOM-той харьцуулна ✓
 *    ⚠️ 🏷️ «Брэнд» нь `searchable` тул `SearchableSelect` (combobox) болж зурагдана
 *       — тэр нь `[data-attr-filter]` дэгээгүй ✗ ⇒ харьцуулалтаас ХАСНА
 */
const EXPECT = getAttrFilters('computers', 'Apple').filter((f) => !f.searchable);

console.log('\n🖥 CDP — 💻 Notebook-ийн шүүлт (📺 Дэлгэц · ⚙️ CPU · 🧠 RAM · 💾 Хард)\n');



await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });

// ═══════ ① 💻 NOTEBOOK БРЭНД (Apple): 4 ШҮҮЛТ ГАРАВ ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=computers&type=Apple`);
const apple = await specUi();
check('🖥 Sidebar БАЙНА (`#advanced-filters` — дэд төрөл сонгосон үед ✓)', apple.sidebar);
check('📺⚙️🧠💾 `[data-attr-filter]` === 5 (4 үзүүлэлт + ✅ төлөв)',
  apple.total === 5, `keys=[${apple.keys.join(', ')}]`);
check('🖥 Дараалал нь ФОРМТОЙ ижил (screen → cpu → ram → storage → condition)',
  apple.keys.join(',') === EXPECT.map((f) => f.key).join(','),
  `${apple.keys.join(',')} ↔ ${EXPECT.map((f) => f.key).join(',')}`);
check('🏷 Шошгууд нь формтой ижил (`aria-label`)',
  apple.labels.join(' | ') === EXPECT.map((f) => f.label).join(' | '), apple.labels.join(' | '));
check('🖥 Сонголтын ТОО нь ЛИБЭЭС ижил (7/19/13/6/3 + «Бүгд»)',
  apple.counts.join(',') === EXPECT.map((f) => f.options.length + 1).join(','),
  apple.counts.join(','));
check('🖥 Сонголтын УТГА нь ч ЛИБЭЭС ижил (давхар хуулбар БАЙХГҮЙ ✓)',
  apple.options.map((o) => o.join('·')).join('|') === EXPECT.map((f) => f.options.join('·')).join('|'),
  `⚙️: ${apple.options[1].slice(0, 4).join(' · ')} …`);
check('🖥 Бүх шүүлтийн эхний сонголт нь «Бүгд» (unegui.mn-ийн хэв ✓)',
  apple.first.every((t) => t === 'Бүгд'), apple.first.join(' | '));
const bi = apple.blocks.findIndex((b) => /Брэнд/.test(b));
const si = apple.blocks.findIndex((b) => /Дэлгэц/.test(b));
const ci = apple.blocks.findIndex((b) => /CPU/.test(b));
const ri = apple.blocks.findIndex((b) => /RAM/.test(b));
const ti = apple.blocks.findIndex((b) => /Хард/.test(b));
const pi = apple.blocks.findIndex((b) => /Үнэ/.test(b));
check('🧭 Байрлал: 🏷 Брэнд → 📺 → ⚙️ → 🧠 → 💾 → «Үнэ, ₮»',
  bi > 0 && si > bi && ci > si && ri > ci && ti > ri && pi > ti,
  apple.blocks.join(' → '));
check('🔎 Шүүлт хоосон үед DB query-д `attrs->>cpu/screen/ram/storage` ОРООГҮЙ',
  !dbQ('attrs->>cpu') && !dbQ('attrs->>screen') && !dbQ('attrs->>ram') && !dbQ('attrs->>storage'),
  lastQ());
const allCount = apple.count;
check('📊 Нийт зарын тоо уншигдав (Apple notebook — бодит DB ✓)',
  typeof allCount === 'number', `${allCount} зар`);

// ═══════ ② ⚙️ CPU УТГА СОНГОХ: URL + DB + ЧИП + ҮР ДҮН ═══════
listingReqs.length = 0;
const picked = await setSelect('cpu', 'Intel Core i5');
check('🎛 ⚙️ CPU дээр «Intel Core i5» сонгогдов', picked === 'OK', picked);
await waitFor(`/attr_cpu=/.test(location.search)`);
const qCpu = await url();
check('🔗 URL-д `attr_cpu=Intel+Core+i5` болов', /attr_cpu=Intel\+Core\+i5/.test(qCpu), qCpu);
await sleep(1500);
check('🔎 DB: `attrs->>cpu=eq.Intel Core i5` (ЯГ тэнцүү — ilike БИШ ✓)',
  dbQ('attrs->>cpu=eq.Intel Core i5'), lastQ());
const cpuUi = await specUi();
check('🎛 Утга нь талбар дээр ХЭВЭЭР (React-ийн controlled select ✓)',
  cpuUi.values[cpuUi.keys.indexOf('cpu')] === 'Intel Core i5', `values=[${cpuUi.values.join(', ')}]`);
check('🏷 Идэвхтэй шүүлтийн чип «⚙️ Intel Core i5» гарлаа',
  cpuUi.chips.some((c) => c === '⚙️ Intel Core i5'), `chips=[${cpuUi.chips.join(' | ')}]`);
check('📉 Үр дүнгийн тоо БУУРСАН (шүүлт бодит DB дээр ажиллаж байна ✓)',
  typeof cpuUi.count === 'number' && cpuUi.count <= allCount,
  `${cpuUi.count} ≤ ${allCount} (шүүлттэй тоо ХЭЗЭЭ Ч илүү гарахгүй ✓)`);
check('🖥 4 шүүлт ХЭВЭЭР байна (утга тавихад нуугдахгүй ✓)', cpuUi.total === 5);

// ═══════ ③ ЛИНКЭЭР ОРОХ (`?attr_cpu=…`) — талбар дээр тэмдэглэгдэнэ ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=computers&type=Apple&attr_cpu=Intel+Core+i5`);
const deep = await specUi();
check('🔗 Линкээр орсон утга талбар дээр ТЭМДЭГЛЭГДЭВ',
  deep.values[deep.keys.indexOf('cpu')] === 'Intel Core i5', `values=[${deep.values.join(', ')}]`);
check('🔗 URL нь ХАСАГДАХГҮЙ (`attr_cpu` хэвээр — шүүлт харагдаж байна ✓)',
  /attr_cpu=Intel\+Core\+i5/.test(await url()), await url());
check('🔎 DB: `attrs->>cpu=eq.Intel Core i5` хэвээр', dbQ('attrs->>cpu=eq.Intel Core i5'), lastQ());

// ═══════ ④ 🖱 ХОЛДУУ ДЭД ТӨРӨЛ (Mouse): 4 ШҮҮЛТ ГАРАХГҮЙ ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=computers&type=Mouse`);
const mouse = await specUi();
check('🖱 Sidebar БАЙНА (хэсэг нь хэвээр ✓)', mouse.sidebar);
check('🖱 Зөвхөн ✅ төлөв шүүлт (`[data-attr-filter]` === 1)',
  mouse.total === 1 && mouse.keys[0] === 'condition', `keys=[${mouse.keys.join(', ')}]`);
check('🖱 📺/⚙️/🧠/💾 нь ОГТ БАЙХГҮЙ (холдуу дэд төрөлд гарахгүй ✓)',
  !/Дэлгэц|CPU|RAM|Хард/.test(mouse.labels.join(' ')), mouse.labels.join(' | '));
check('🔎 DB: `attrs->>cpu` ОГТ ЯВАХГҮЙ', !dbQ('attrs->>cpu'), lastQ());

// ═══════ ⑤ 🕳 ҮЛ ҮЗЭГДЭХ ШҮҮЛТ (архитектурын урхи) ═══════
// ⚠️ `?type=Mouse&attr_cpu=…` — өөрсдийн UI-ээс ХЭЗЭЭ Ч үүсэхгүй хослол.
//    `pruneGatedAttrs` үүнийг ЧИМЭЭГҮЙ хасах ЁСТОЙ — эс бөгөөс харагдахгүй
//    шүүлт заруудыг шүүж, хэрэглэгч «0 үр дүн» гэж гайхана ✗
listingReqs.length = 0;
await go(`${BASE}/?section=computers&type=Mouse&attr_cpu=Intel+Core+i5`);
await waitFor(`!/attr_cpu/.test(location.search)`);
await sleep(1200);
const pruned = await specUi();
check('🕳 URL-аас `attr_cpu` АРИЛАВ (`pruneGatedAttrs` — шууд линк дээр ч ✓)',
  !/attr_cpu/.test(decodeURIComponent(await url())), (await url()) || '(хоосон)');
check('🔎 DB: `attrs->>cpu` ОГТ ЯВАХГҮЙ (үл үзэгдэх шүүлт үлдэхгүй ✓)',
  !dbQ('attrs->>cpu'), lastQ());
check('🖱 Шүүлт 1 хэвээр (Mouse — зөвхөн ✅ төлөв ✓)', pruned.total === 1, `total=${pruned.total}`);

// ═══ ⑥ 🆕 ДЭД ТӨРӨЛ СОНГООГҮЙ Ч SIDEBAR БАЙНА (хэсэг = 2-р түвшин) ═══
// 🆕 2026-10-03 (13) — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Дэлгэрэнгүй хайлт 3р түвшний
//    сонголт дээр орж ирж байна (Бүх зар › Автомашин › Суудлын машин) —
//    2р түвшин дээр гаргаж ирээд, бүх зар дээр шүүдэг болго» ⇒
//    `?section=computers` (дэд төрөл ГҮЙ) дээр ч панель БИЙ ✓
// ⚠️ Гэхдээ `onlySubtypes`-тай 📺/⚙️/🧠/💾 нь ХАРАГДАХГҮЙ ХЭВЭЭР — эхлээд
//    Notebook-ийн брэндийг сонгоно ✓ (формойн `getAttrFields`-тэй ижил дүрэм)
const EXPECT_NO_TYPE = getAttrFilters('computers', '').filter((f) => !f.searchable);
await go(`${BASE}/?section=computers`);
const noType = await specUi();
check('🆕 Дэд төрөл сонгоогүй ч sidebar БАЙНА (хэсэг = 2-р түвшин ✓)',
  noType.sidebar === true, `sidebar=${noType.sidebar}`);
check('🆕 Хэсгийн түвшинд `[data-attr-filter]` нь ЛИБЭЭС ижил (төрөл хэрэггүй ✓)',
  noType.total === EXPECT_NO_TYPE.length
    && noType.keys.join(',') === EXPECT_NO_TYPE.map((f) => f.key).join(','),
  `${noType.total} ↔ ${EXPECT_NO_TYPE.length} · keys=[${noType.keys.join(', ')}]`);
check('🆕 📺/⚙️/🧠/💾 нь хэсгийн түвшинд ОГТ БАЙХГҮЙ (дэд төрөл хэрэгтэй ✓)',
  noType.total > 0 && !/Дэлгэц|CPU|RAM|Хард/.test(noType.labels.join(' ')),
  noType.labels.join(' | '));

// ═══════ ⑦ 🚗 БУСАД ХЭСЭГ ХӨНДӨГДӨӨГҮЙ (авто) ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=auto&type=${encodeURIComponent('Суудлын машин')}`);
const auto = await specUi();
check('🚗 Авто дээр `[data-attr-filter]` === 3 (🎨 өнгө · 🔀 хайрцаг · ⛽ түлш)',
  auto.total === 3, `keys=[${auto.keys.join(', ')}]`);
check('🚗 Дараалал нь `attrFilters`-ийн дараалал (color → transmission → fuel)',
  auto.keys.join(',') === 'color,transmission,fuel', auto.keys.join(','));
check('🚗 Талбарууд нь «Бүгд»-тэй (хуучин зан төлөв ХЭВЭЭР ✓)',
  auto.first.every((t) => t === 'Бүгд'), auto.first.join(' | '));
listingReqs.length = 0;
const fuelPicked = await setSelect('fuel', 'Хайбрид');
check('🎛 ⛽ Түлш дээр «Хайбрид» сонгогдов', fuelPicked === 'OK', fuelPicked);
await waitFor(`/attr_fuel=/.test(location.search)`);
await sleep(1500);
check('🔗 URL-д `attr_fuel=Хайбрид` болов', /attr_fuel=Хайбрид/.test(decodeURIComponent(await url())),
  decodeURIComponent(await url()));
check('🔎 DB: `attrs->>fuel=eq.Хайбрид` (яг тэнцүү ✓)', dbQ('attrs->>fuel=eq.Хайбрид'), lastQ());

// ═══════ ⑧ 📱 МОБАЙЛ (390×844) ═══════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await go(`${BASE}/?section=computers&type=Apple`);
const mobile = await specUi();
check('📱 Мобайл: 5 шүүлт ХАРАГДАНА (`data-attr-filter` === 5 ✓)',
  mobile.total === 5, `total=${mobile.total}`);
check('📱 Мобайл: 📺/⚙️/🧠/💾 бүгд DOM-д байна',
  mobile.keys.join(',') === 'screen,cpu,ram,storage,condition', mobile.keys.join(','));
check('📱 Мобайл: хэвтээ гүйлт (overflow) ГАРАХГҮЙ',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'),
  await evalJs('document.documentElement.scrollWidth + " / " + window.innerWidth'));
await rpc('Emulation.clearDeviceMetricsOverride');

// ═══════ ⑨ ДҮГНЭЛТ ═══════
check('🧯 Консол дээр exception ГАРАГҮЙ', exceptions.length === 0, exceptions.slice(0, 2).join(' | ') || '—');
console.log(`\n${fail === 0 ? '✅' : '❌'} CDP — ${pass} OK, ${fail} FAIL\n`);
ws.close();
await closeOwnTab();
process.exit(fail === 0 ? 0 : 1);

