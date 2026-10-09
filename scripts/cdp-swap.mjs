/**
 * 🔄 CDP ШАЛГАЛТ — «Солино» шүүлт + форм ☑ (UI + URL + DB) · 2026-10-09
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Үнэ тохирно Гэсэн сонголтын баруун талд, Солино гээд
 * "Үнэ тохирно" гэсэнтэй адилхан checkbox хийж өгөөч. Үүнийг автомашин болон
 * Спорт бараа -> Дартс хэсэгт оруулж өгөө. Ингэхдээ энэ 2-ийн зар нэмэх
 * болон, зөвхөн энэ 2-ийн хайлт дээр оруулж өгөөч».
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① 🚗 «Автомашин» (`?section=auto`, дэд төрөл ГҮЙ ч) дээр блок БАЙНА:
 *      `[data-swap-filter]` === 1, `[data-swap-value]` === 1, чип нь ЖИНХЭНЭ
 *      `<button class="chip-toggle">` (☑ input БИШ ✓), шошго нь «Солино»,
 *      ХАРАГДАХ хэмжээтэй (≥60×24px — CSS ачаалагдсан ✓), `aria-pressed=false`
 *   ② 🖱 ЧИП ДАРАХ → URL `?swap=1` · `aria-pressed=true` · `chip-toggle-active`
 *      + `✓` тэмдэг · DB нь `attrs->>swap=eq.yes` (скаляр ТЕКСТ — `cs` БИШ ✓)
 *   ③ 🔁 Дахин дарахад УНТРАНА (чип мэт toggle) → URL/DB-ээс swap АРИЛНА ✓
 *   ④ ⚽ «Спорт бараа → Дартс» (`?section=hobby&type=Дартс`) дээр БАЙНА;
 *      ⛔ дэд төрөл сонгоогүй «Спорт бараа», «Гольф», «Компьютер» ба
 *      «Бүх зар» (`/`) дээр БАЙХГҮЙ (`supportsSwap` ✓ — хэрэглэгчийн шаардлага)
 *   ⑤ 🧹 `?section=computers&swap=1` (гараар бичсэн/хуучин линк) → swap
 *      ИГНОРХИЙГДЭНЭ (URL/DB цэвэр — «үл үзэгдэх шүүлт» ✗)
 *   ⑥ 🎛 Идэвхтэй шүүлтийн чип «Солино» (`aria-label="Солино хайлтыг хасах"`)
 *      дээрх ✕ → `filters.swap = false` (URL/DB цэвэр ✓)
 *   ⑦ ☑ ФОРМ: 🚗 «Автомашин» дээр `[data-swap-check]` БАЙНА ба нь «🤝 Үнэ
 *      тохирно»-гийн ЯГ БАРУУН талд (DOM дараалал — эхний чекбокс нь 🤝 ✓);
 *      ⛔ 💻 «Компьютер» дээр БАЙХГҮЙ
 *   ⑧ 🧯 Консол дээр JS exception 0
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээсэн байх:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-swap.mjs   (эсвэл npm run cdp:swap)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:swap` ✓
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
const go = async (url) => {
  await rpc('Page.navigate', { url });
  await waitFor(`document.readyState === 'complete'`);
  await sleep(800);
};

/**
 * 🔄 ХАЙЛТЫН DOM-ын төлөв (дэгээнүүд: `[data-swap-filter]`/`[data-swap-value]`).
 * ⚠️ Хэв нь «🛏 Өрөөний тоо»/«💳 Төлбөрийн нөхцөл»-тэй ЯГ ИЖИЛ ЧИП —
 *    утга нь `aria-pressed` + `chip-toggle-active` класс дээр ✓
 */
const swapUi = () => evalJs(`(() => {
  const chip = document.querySelector('[data-swap-value]');
  const box = document.querySelector('[data-swap-filter]');
  const size = (el) => {
    const r = el.getBoundingClientRect();
    return Math.round(r.width) + 'x' + Math.round(r.height);
  };
  const parent = box && box.parentElement ? box.parentElement : null;
  return {
    blocks: document.querySelectorAll('[data-swap-filter]').length,
    chips: document.querySelectorAll('[data-swap-value]').length,
    inputs: document.querySelectorAll('[data-swap-value] input, [data-swap-filter] input').length,
    label: chip ? chip.textContent.replace(/\\\\s+/g, ' ').trim() : '',
    value: chip ? chip.getAttribute('data-swap-value') : '',
    button: !!chip && chip.tagName === 'BUTTON',
    styled: !!chip && chip.classList.contains('chip-toggle'),
    active: !!chip && chip.classList.contains('chip-toggle-active'),
    pressed: !!chip && chip.getAttribute('aria-pressed') === 'true',
    tick: !!chip && /✓/.test(chip.textContent),
    size: chip ? size(chip) : '0x0',
    clear: parent
      ? [...parent.querySelectorAll('button')].filter((b) => b.textContent.trim() === '✕ Цуцлах').length
      : 0,
    groupLabel: box ? (box.getAttribute('aria-label') || '') : '',
  };
})()`);

/** 🖱 Чип дарах (хайлтын «Солино») */
const clickSwap = () => evalJs(`(() => {
  const c = document.querySelector('[data-swap-value]');
  if (!c) return 'NO_CHIP';
  c.click();
  return 'OK';
})()`);

/** 🎛 Идэвхтэй шүүлтийн чипийн ✕ (`aria-label="Солино хайлтыг хасах"`) */
const removeActiveChip = () => evalJs(`(() => {
  const b = document.querySelector('[aria-label="Солино хайлтыг хасах"]');
  if (!b) return 'NO_BTN';
  b.click();
  return 'OK';
})()`);

/** ☑ ФОРМ — «Солино» чекбокс байгаа эсэх + «🤝 Үнэ тохирно»-той харьцуулалт */
const formSwap = () => evalJs(`(() => {
  const swap = document.querySelector('[data-swap-check]');
  const boxes = [...document.querySelectorAll('form input[type="checkbox"]')]
    .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  const swapBox = swap ? swap.querySelector('input[type="checkbox"]') : null;
  const labels = boxes.map((b) => (b.closest('label') || b.parentElement).textContent.replace(/\\\\s+/g, ' ').trim());
  const r = swapBox ? swapBox.getBoundingClientRect() : null;
  // ⚠️ «Солино» нь ХАРАГДАХ чекбоксуудын ДУГААРТ (idx) — эхний нь БИШ бол
  //    болно (📋 Дэлгэрэнгүй блок дээр «нэрээ гарах уу?» чекбокс бий ✓)
  const idx = swapBox ? boxes.indexOf(swapBox) : -1;
  const prev = idx > 0 ? boxes[idx - 1].getBoundingClientRect() : null;
  return {
    present: !!swap,
    visible: !!swapBox && !!r && r.width > 0 && r.height > 0,
    labels,
    idx,
    // ⚠️ Дараалал ЧУХАЛ: «Солино»-гийн ЯГ ӨМНӨХ чекбокс нь «🤝 Үнэ тохирно»
    prevLabel: idx > 0 ? labels[idx - 1] : '',
    sameRow: !!r && !!prev && Math.abs(r.top - prev.top) <= 4,
    rightOfNegotiable: !!r && !!prev && r.left > prev.left,
    checkboxSize: r ? Math.round(r.width) + 'x' + Math.round(r.height) : '0x0',
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


console.log('\n🔄 CDP — «Солино» шүүлт + форм ☑ (UI + URL + DB)\n');

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });

// ═══════ ① 🚗 АВТОМАШИН: БЛОК БАЙНА + ДИЗАЙН ═══════
await go(`${BASE}/?section=auto`);
const dom = await swapUi();
check('🔄 Авто дээр блок БАЙНА (`[data-swap-filter]` === 1)', dom.blocks === 1, `blocks=${dom.blocks}`);
check('🔄 ГАНЦ чип (`[data-swap-value]` === 1 — «Солино» эсвэл үгүй ✓)',
  dom.chips === 1 && dom.value === '1', `chips=${dom.chips} value=${dom.value}`);
check('🏷️ Чипийн шошго нь «Солино»', dom.label === 'Солино', JSON.stringify(dom.label));
check('🎛 Чип нь ЖИНХЭНЭ `<button class="chip-toggle">` (☑ `<input>` БИШ ✓)',
  dom.button && dom.styled && dom.inputs === 0, `button=${dom.button} styled=${dom.styled} inputs=${dom.inputs}`);
check('🎛 Бүлгийн шошго (`aria-label`) нь «Солино» ✓', dom.groupLabel === 'Солино', dom.groupLabel);
check('📏 Чип ХАРАГДАХ хэмжээтэй (≥60×24px — CSS ачаалагдсан ✓)',
  (() => { const [w, h] = dom.size.split('x').map(Number); return w >= 60 && h >= 24; })(), dom.size);
check('⚪ Анхдагчаар УНТРААЛТТАЙ (`aria-pressed=false`, «✓» БАЙХГҮЙ)',
  !dom.pressed && !dom.active && !dom.tick, `pressed=${dom.pressed} tick=${dom.tick}`);
check('🚫 Шүүлт идэвхгүй үед «✕ Цуцлах» ГАРАХГҮЙ ✓', dom.clear === 0, `clear=${dom.clear}`);

// ═══════ ② 🖱 ЧИП ДАРАХ → URL `?swap=1` + DB `attrs->>swap=eq.yes` ═══════
listingReqs.length = 0;
check('🖱 «Солино» чип дарагдав', (await clickSwap()) === 'OK');
await waitFor(`/swap=1/.test(location.search)`);
await sleep(1200);
check('🔗 URL нь `?swap=1` болов', /swap=1/.test(decodeURIComponent(await url())), decodeURIComponent(await url()));
const on = await swapUi();
check('🎛 Чип ИДЭВХТЭЙ: `aria-pressed=true` + `chip-toggle-active` + «✓»',
  on.pressed && on.active && on.tick, `pressed=${on.pressed} active=${on.active} tick=${on.tick}`);
check('🎛 «✕ Цуцлах» ХАРАГДАЖ байна (шүүлт идэвхтэй ✓)', on.clear === 1, `clear=${on.clear}`);
check('🔎 DB: `attrs->>swap=eq.yes` (скаляр ТЕКСТ — `cs`/`or` БИШ ✓)',
  dbQ('attrs->>swap=eq.yes'), lastQ());
check('🔎 DB: `payment_terms`/`or=` шүүлт ХОЛОГДООГҮЙ (нэг л нөхцөл ✓)',
  !dbQ('attrs.cs.') && !dbQ('or=('), lastQ());

// ═══════ ③ 🔁 ДАХИН ДАРАХАД УНТРАНА (toggle) ═══════
listingReqs.length = 0;
check('🖱 Дахин дарагдав (toggle)', (await clickSwap()) === 'OK');
await waitFor(`!/swap=/.test(location.search)`);
await sleep(1200);
const off = await swapUi();
check('🔗 URL-аас `swap` АРИЛАВ', !/swap=/.test(decodeURIComponent(await url())), decodeURIComponent(await url()) || '(хоосон)');
check('🎛 Чип УНТРАВ (`aria-pressed=false`, «✓» арилав)', !off.pressed && !off.tick,
  `pressed=${off.pressed} tick=${off.tick}`);
check('🔎 DB: swap шүүлт ОГТ ЯВАХГҮЙ (эс бөгөөс «зар байхгүй» гарна ✗)',
  !dbQ('swap'), lastQ());

// ═══════ ④ ⚽ «Спорт бараа → Дартс» БАЙНА · бусад газарт БАЙХГҮЙ ═══════
await go(`${BASE}/?section=hobby&type=${encodeURIComponent('Дартс')}`);
const darts = await swapUi();
check('⚽ «Спорт бараа → Дартс» дээр блок БАЙНА', darts.blocks === 1, `blocks=${darts.blocks}`);
await go(`${BASE}/?section=hobby`);
check('⛔ «Спорт бараа» (дэд төрөл сонгоогүй) → блок БАЙХГҮЙ',
  (await swapUi()).blocks === 0, `blocks=${(await swapUi()).blocks}`);
await go(`${BASE}/?section=hobby&type=${encodeURIComponent('Гольф')}`);
check('⛔ «Спорт бараа → Гольф» → блок БАЙХГҮЙ (зөвхөн «Дартс» ✓)',
  (await swapUi()).blocks === 0, `blocks=${(await swapUi()).blocks}`);
await go(`${BASE}/?section=computers`);
check('⛔ 💻 «Компьютер» → блок БАЙХГҮЙ', (await swapUi()).blocks === 0, `blocks=${(await swapUi()).blocks}`);
await go(`${BASE}/?section=real-estate`);
check('⛔ 🏠 «Үл хөдлөх» → блок БАЙХГҮЙ', (await swapUi()).blocks === 0, `blocks=${(await swapUi()).blocks}`);
await go(`${BASE}/`);
check('⛔ «Бүх зар» (`/`) → блок БАЙХГҮЙ', (await swapUi()).blocks === 0, `blocks=${(await swapUi()).blocks}`);

// ═══════ ⑤ 🧹 ХУУЧИН/ГАРААР БИЧСЭН ЛИНК ИГНОРХИЙГДЭНЭ ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=computers&swap=1`);
await sleep(1200);
check('🧹 `?section=computers&swap=1` → блок БАЙХГҮЙ (хэсэг дэмжихгүй ✓)',
  (await swapUi()).blocks === 0);
check('🧹 URL-аас `swap` ЦЭВЭРЛЭГДЭВ (үл үзэгдэх шүүлт ✗)',
  !/swap=/.test(decodeURIComponent(await url())), decodeURIComponent(await url()) || '(хоосон)');
check('🧹 DB: swap шүүлт ЯВАХГҮЙ (эс бөгөөс «0 үр дүн» гарна ✗)', !dbQ('swap'), lastQ());

// ═══════ ⑥ 🎛 ИДЭВХТЭЙ ШҮҮЛТИЙН ЧИП «Солино» → ✕ ═══════
await go(`${BASE}/?section=auto&swap=1`);
const chipped = await evalJs(`(() => {
  const b = document.querySelector('[aria-label="Солино хайлтыг хасах"]');
  return { present: !!b, text: b ? b.parentElement.textContent.replace(/\\\\s+/g, ' ').trim() : '' };
})()`);
check('🎛 Идэвхтэй шүүлтийн чип «Солино» харагдаж байна', chipped.present, JSON.stringify(chipped.text));
listingReqs.length = 0;
check('🎛 Чипийн ✕ дарагдав', (await removeActiveChip()) === 'OK');
await waitFor(`!/swap=/.test(location.search)`);
await sleep(1200);
check('🎛 ✕ дарвал URL-аас swap арилав', !/swap=/.test(decodeURIComponent(await url())), decodeURIComponent(await url()) || '(хоосон)');
check('🎛 Чип УНТРАВ (`aria-pressed=false`)', !(await swapUi()).pressed);
check('🔎 DB: swap шүүлт ч арилав', !dbQ('swap'), lastQ());

// ═══════ ⑦ ☑ ФОРМ: «🤝 Үнэ тохирно»-гийн БАРУУН талд (зөвхөн 🚗/⚽ «Дартс») ═══════
// ⚠️ `/listings/new` нь НЭВТРЭЛТ шаардана — Chrome профайл нэвтрээгүй бол форм
//    огт рендэрлэгдэхгүй тул эдгээр шалгалт нь FAIL БИШ **SKIP** болно (буруу
//    улаан гарахгүй ✓; форм-ын дүрмийг `npm run test:swap` ⑦ нь эх файлаас
//    түгждэг тул нэвтрэлтгүй ч дүрэм хамгаалагдсан хэвээр ✓)
const NEED_AUTH = `/нэвтрэх шаардлагатай/.test(document.body.innerText)`;
const SWAP_BOX = `document.querySelector('[data-swap-check]')`;
const AUTO_SUB = encodeURIComponent('Суудлын машин');
await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1600, deviceScaleFactor: 1, mobile: false });
await go(`${BASE}/listings/new?section=auto&type=${AUTO_SUB}&step=3`);
await waitFor(`${SWAP_BOX} || ${NEED_AUTH}`, 15000);
await sleep(1200);
const needAuth = await evalJs(NEED_AUTH);
if (needAuth) {
  console.log('  ⏭ SKIP — Chrome профайл нэвтрээгүй («Зар оруулахын тулд нэвтрэх шаардлагатай»)');
  console.log('     ⇒ форм-ын ☑ шалгалтууд алгаслав (unit: `npm run test:swap` ⑦ ✓)');
} else {
const form = await formSwap();
check('☑ 🚗 «Автомашин» форм дээр `[data-swap-check]` БАЙНА', form.present, JSON.stringify(form.labels));
check('☑ Чекбокс ХАРАГДАЖ байна (📱/🖥 аль алинд ✓)', form.visible, `visible=${form.visible}`);
check('☑ Чекбоксын шошго нь ЯГ «Солино» + 16px хэмжээтэй (🤝-тай ижил хэв ✓)',
  form.labels[form.idx] === 'Солино' && form.checkboxSize === '16x16',
  `${JSON.stringify(form.labels[form.idx])} size=${form.checkboxSize}`);
check('☑ Дараалал: ЯГ ӨМНӨХ чекбокс нь «🤝 Үнэ тохирно» (CDP `boxes[0]` ХЭВЭЭР ✓)',
  /Үнэ тохирно/.test(form.prevLabel), `idx=${form.idx} prev=${JSON.stringify(form.prevLabel)}`);
check('☑ «Солино» нь «Үнэ тохирно»-гийн ЯГ БАРУУН талд (нэг мөрөнд)',
  form.sameRow && form.rightOfNegotiable, `sameRow=${form.sameRow} right=${form.rightOfNegotiable}`);
// 📱 Мобайл 390px: ☑ нь 📱-ийн «Үнэ» дэлгэц доторх ЯГ тэр блокт байна ✓
// ⚠️ 📱 дээр дэлгэц солих нь wizard-ийн үүрэг (заавал талбаруудыг бөглөж
//    `[data-mobile-detail-next]`-ээр явна — тэр урсгалыг `npm run cdp:steps`
//    аль хэдийн түгждэг ✓). ЭНД шалгах зүйл: ☑ нь НЭГ DOM дотор, `price`
//    блокт, мөн 🤝 «Үнэ тохирно»-той ЗЭРЭГЦЭЭ байгаа эсэх ✓
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await go(`${BASE}/listings/new?section=auto&type=${AUTO_SUB}&step=3`);
await waitFor(`${SWAP_BOX} || ${NEED_AUTH}`, 15000);
await sleep(1000);
const mInfo = await evalJs(`(() => {
  const s = document.querySelector('[data-swap-check]');
  if (!s) return { present: false };
  const block = s.closest('[data-step-block]');
  const neg = s.parentElement.querySelector('input[type="checkbox"]');
  const boxes = [...s.parentElement.querySelectorAll('input[type="checkbox"]')];
  return {
    present: true,
    block: block ? block.getAttribute('data-step-block') : null,
    inPriceStep: !!s.closest('[data-step-block="price"]'),
    boxesInRow: boxes.length,
    firstIsNegotiable: /Үнэ тохирно/.test((boxes[0].closest('label') || boxes[0].parentElement).textContent),
    sameParent: !!neg,
  };
})()`);
check('📱 Мобайл 390px: ☑ нь `price` блок дотор, 🤝 «Үнэ тохирно»-той НЭГ мөрөнд (2 чекбокс ✓)',
  mInfo.present && mInfo.inPriceStep && mInfo.boxesInRow === 2 && mInfo.firstIsNegotiable,
  JSON.stringify(mInfo));
await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1600, deviceScaleFactor: 1, mobile: false });
// ⛔ 💻 «Компьютер» дээр ОГТ БАЙХГҮЙ (хэрэглэгчийн шаардлага ✓)
// ⚠️ НООРОГ (📝 `zar:listing-draft:*`) нь өмнөх форм-ыг сэргээдэг тул
//    хэсэг солихын өмнө нооргийг ЦЭВЭРЛЭНЭ (эс бөгөөс 🚗 хэвээр үлдэж,
//    шалгалт ХУУРАМЧ болно ✗)
await evalJs(`Object.keys(localStorage).filter((k) => k.indexOf('zar:listing-draft') === 0).forEach((k) => localStorage.removeItem(k))`);
await go(`${BASE}/listings/new?section=computers&type=${encodeURIComponent('Notebook')}&step=3`);
await waitFor(`${SWAP_BOX} || ${NEED_AUTH}`, 15000);
await sleep(1500);
const formPc = await formSwap();
check('⛔ 💻 «Компьютер» форм дээр `[data-swap-check]` БАЙХГҮЙ (хэрэглэгчийн шаардлага ✓)',
  !formPc.present && formPc.labels.every((l) => !/Солино/.test(l)), JSON.stringify(formPc.labels));
// 🧹 Төгсгөлд нооргийг үлдээхгүй (хэрэглэгчийн профайл бохирдохгүй ✓)
await evalJs(`Object.keys(localStorage).filter((k) => k.indexOf('zar:listing-draft') === 0).forEach((k) => localStorage.removeItem(k))`);
}

// ═══════ ⑧ ДҮГНЭЛТ ═══════
check('🧯 Консол дээр exception ГАРАГҮЙ', exceptions.length === 0, exceptions.slice(0, 2).join(' | '));
console.log(`\n${fail === 0 ? '✅' : '❌'} CDP — ${pass} OK, ${fail} FAIL\n`);
ws.close();
await closeOwnTab();
process.exit(fail === 0 ? 0 : 1);

check('🔄 Блок нь ХЭВЭЭР (шүүлт унтраах нь блокыг нуухгүй ✓)', off.blocks === 1);
