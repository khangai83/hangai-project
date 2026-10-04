/**
 * 🏷️🚙 CDP ШАЛГАЛТ — «Үйлдвэрлэгч, загвар» нь 📍 БАЙРШИЛ шиг ХАЙЛТТАЙ ПИКЕР
 *                 (2026-10-04 (35))
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (шууд): «Автомашины хайлтын Үйлдвэрлэгч, Загварыг
 *   Байршил шиг хайдаг болгоод өг».
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ⓪ Сайдбарын авто хэсэг: `[data-sidebar-car]` === 1 ба ХУУЧИН ХОЁР талбар
 *      (`input[aria-label="Үйлдвэрлэгч"]` / `[data-attr-filter="brand"]`)
 *      DOM-д БАЙХГҮЙ (нэг л UI ✓); товчны шошго нь «Бүх үйлдвэрлэгч, загвар»
 *   ① Товч дарахад `[data-car-picker]` (modal) нээгдэж, ХАЙЛТЫН талбар
 *      (`#car-search`), 🏷️ багана (`[data-car-brand-filter]`, бүх брэнд),
 *      «Машиныг хэрэглэх» (`[data-apply-car]`), «✕ Цэвэрлэх» (`[data-clear-car]`)
 *      гарна; брэнд сонгоогүй тул 🚙 багана (`[data-car-model-filter]`) БАЙХГҮЙ ✓
 *   ①b 🏷️ «Toyota» → 🚙 багана нээгдэж ЗӨВХӨН Toyota-гийн моделууд (Prius 30 ·
 *      Harrier · Camry); «Prius 30» сонгоод «Машиныг хэрэглэх» → пикер хаагдаж
 *      URL `?attr_brand=Toyota&attr_model=Prius+30` · сайдбарт 2 pill ✓
 *   ①c ДАХИН нээхэд ноорог нь `filters`-ээс шинээр авагдана (Toyota + Prius 30
 *      тэмдэглэгдсэн — «цуцлагдсан» хуучин ноорог үлдэхгүй ✓)
 *   ①d 🔍 «pri» бичихэд 🚙 жагсаалт ШУУД шүүгдэж зөвхөн Prius-ууд үлдэнэ;
 *      🏷️ баганад тохирох брэнд байхгүй тул ЧӨЛӨӨТ ТЕКСТ мөр гарна
 *      (`[data-car-brand-free]` / `[data-car-model-free]` — өмнөх зан ✓)
 *   ①e 🌈 «Nissan» сонгоход хуучин 🚙 «Prius 30» ЦЭВЭРЛЭГДЭНЭ (`aria-pressed`
 *      === 0) — «{brand:'Nissan', model:'Prius 30'}» гэсэн зөрчсөн хос
 *      үүсэхгүй ✓ (`cascadeAttrs`-ийн дүрэм)
 *   ①f «Машиныг хэрэглэх» → `?attr_brand=Nissan` ба `attr_model` АРИЛАВ ✓
 *   ①g Сайдбарын «✕ Цэвэрлэх» (`[data-car-clear]`) → URL-аас хоёул арилж,
 *      товчны шошго «Бүх үйлдвэрлэгч, загвар» болж буцна ✓
 *   ①h Toyota + Harrier → `?attr_brand=Toyota&attr_model=Harrier` ✓
 *   🆕 2026-10-04 (36) — «машины загвараас ОЛОНЫГ сонгох боломжтой болго»:
 *   ①i 🚙🌂 «Prius 30» + «Harrier» ЗЭРЭГ сонгоход `modelSel = 2`, чип нь утга
 *      бүрд тусдаа (брэнд 1 + загвар 2 = 3), тооны badge = 2, товч нь
 *      «Машиныг хэрэглэх (2 загвар)» → `?attr_model=Harrier,Prius 30`;
 *      сайдбарын pill нь ТОВЧЛОСОН «2 загвар»; DB query нь
 *      `or=(attrs->>model.ilike.%A%,attrs->>model.ilike.%B%)` (OR ✓, `in.(` БИШ ✓)
 *   ①j ДАХИН нээхэд 2 загвар нь МАССИВ хэлбэрээр тэмдэглэгдсэн (filters → draft ✓);
 *      ижил утгыг дахин дарахад ЦУЦЛАГДАЖ 1 үлдэнэ (checkbox зан); дахин нэмж,
 *      дараа нь «Nissan» сонгоход БҮХ загвар (массив) ЦЭВЭРЛЭГДЭНЭ ✓;
 *      «✕ Цэвэрлэх» нь массивыг бүрэн арилгана ✓
 *      ⚠️ DB-ийн ХАРИУ (status) ч шалгана: `or=(…ilike…)` нь PostgREST-д
 *         ХҮЧИНТЭЙ (200 ✓) — эс бөгөөс хайлт 400-аар УНАХ байв ✗
 *   ② 📱 Мобайл 390px: 2 багана НУУГДАЖ (`[data-mobile-car]`), НЭГ ДЭЛГЭЦЭД
 *      НЭГ ШАТЛАЛ — брэнд → `›` → загвар; `←` буцах товч гарна; загварыг
 *      ОЛОНООР сонгох боломжтой (checkbox + badge/чип ✓)
 *      ⚠️ CDP дэгээнүүд нь ТУСДАА (`data-mobile-car-*`) — ①-ийн тоо хөндөгдөхгүй ✓
 *   ③ Консол дээр JS exception 0; DB query нь `attrs->>brand/model` — ХУУЧИН
 *      гэрээ (`ilike`) ХЭВЭЭР (`in.(` ГАРАХГҮЙ ✓ migration ШААРДЛАГАГҮЙ)
 *
 * 📊 НИЙТ: 2026-10-04 (35) = 31 шалгалт · 🆕 (36) нэмэгдэж = **48 шалгалт** ✓
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээсэн байх:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-carpicker.mjs   (эсвэл npm run cdp:carpicker)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:carpicker` ✓
 *   ⚠️ `/listings/new` (форм) нь НЭВТРЭЛТ шаарддаг тул энэ скрипт нь ЗӨВХӨН
 *      нүүр хуудасны (хайлтын) замыг шалгана — формойн пикер нь
 *      `scripts/cdp-picker.mjs`-д (нэвтэрсэн session-той) хэвээр ✓
 */
import { CAR_BRANDS } from '../lib/locationData.js';

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
// ⚠️ ШИНЭ таб нээж ажиллана (хуучин таб `Runtime.evaluate`-д hang болдог ✗)
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

let pass = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${name}`); }
  else { fail += 1; console.log(`  ✗ ${name}${extra ? `  → ${extra}` : ''}`); }
};

const exceptions = [];
const carReqs = [];
// 🆕 2026-10-04 (36): DB-ийн ХАРИУ ч (status) бүртгэнэ — олон загварын
// `or=(attrs->>model.ilike.%A%,…)` нь PostgREST-д ХҮЧИНТЭЙ эсэхийг
// (400 БИШ 200 ✓) бодит DB дээр шалгана
const carRes = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent') {
    const r = m.params.request;
    if (r.url.includes('/rest/v1/listings') && r.method === 'GET') carReqs.push(r.url);
  }
  if (m.method === 'Network.responseReceived') {
    const r = m.params.response;
    if (r.url.includes('/rest/v1/listings')) carRes.push({ url: r.url, status: r.status });
  }
});

await rpc('Runtime.enable');
await rpc('Network.enable');
await rpc('Page.enable');
// ⚠️ `PUT /json/new` нь табыг BACKGROUND-д нээдэг → renderer хүйтэн болж
//    `Runtime.evaluate` timeout болдог ✗ → FRONT-д гаргана ✓
await rpc('Page.bringToFront');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** ⚠️ Renderer ачаалалтай үед `Runtime.evaluate` хааяа timeout → НЭГ дахин ✓ */
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
    await sleep(250);
  }
};
const go = async (url) => {
  await rpc('Page.navigate', { url });
  await waitFor(`document.readyState === 'complete'`);
  await sleep(900);
};
/** DOM элемент дээр БОДИТ `click()` (headless-д найдвартай ✓) */
const click = async (sel) => {
  const res = await evalJs(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return 'NOT_FOUND';
    el.click();
    return 'OK';
  })()`);
  await sleep(400);
  return res;
};
/**
 * Оролтын утгыг React-д хүргэх — native `setter` + `input` event
 * (`scripts/cdp-picker.mjs`-ийн ИЖИЛ арга ✓)
 */
const typeInto = async (sel, value) => {
  const res = await evalJs(`(() => {
    const i = document.querySelector(${JSON.stringify(sel)});
    if (!i) return 'NOT_FOUND';
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(i, ${JSON.stringify(value)});
    i.dispatchEvent(new Event('input', { bubbles: true }));
    return 'OK';
  })()`);
  await sleep(400);
  return res;
};


// ---------- ТӨЛӨВ УНШИХ ТУСЛАХУУД ----------
const urlParam = (k) => evalJs(`new URLSearchParams(location.search).get(${JSON.stringify(k)})`);
const asideCar = () => evalJs(`(() => {
  const a = document.querySelector('aside');
  if (!a) return { none: true };
  const btn = a.querySelector('[data-sidebar-car]');
  const pill = a.querySelector('[data-car-pill="model"]');
  return {
    buttons: a.querySelectorAll('[data-sidebar-car]').length,
    label: btn ? (btn.innerText || '').trim() : '',
    brandInputs: a.querySelectorAll('input[aria-label="Үйлдвэрлэгч"]').length,
    modelInputs: a.querySelectorAll('input[aria-label="Загвар"]').length,
    brandBlocks: a.querySelectorAll('[data-attr-filter="brand"]').length,
    modelBlocks: a.querySelectorAll('[data-attr-filter="model"]').length,
    pills: [...a.querySelectorAll('[data-car-pill]')].map((p) => p.getAttribute('data-car-pill')),
    // 🚙🌂 ОЛОН ЗАГВАР (2026-10-04 (36)): pill нь ТОВЧЛОСОН шошго + тооны дэгээ
    modelCount: pill ? Number(pill.getAttribute('data-car-model-count')) : -1,
    modelPillText: pill ? (pill.innerText || '').trim() : '',
    clear: a.querySelectorAll('[data-car-clear]').length,
  };
})()`);
const pickerUi = () => evalJs(`(() => {
  const m = document.querySelector('[data-car-picker]');
  if (!m) return { none: true };
  const brandCol = m.querySelector('[data-car-brand-filter]');
  const modelCol = m.querySelector('[data-car-model-filter]');
  const countEl = m.querySelector('[data-car-model-count]');
  return {
    search: m.querySelectorAll('#car-search').length,
    brandCol: m.querySelectorAll('[data-car-brand-filter]').length,
    modelCol: m.querySelectorAll('[data-car-model-filter]').length,
    brandRows: m.querySelectorAll('[data-car-brand-value]').length,
    brandSel: brandCol ? [...brandCol.querySelectorAll('[aria-pressed="true"]')].map((b) => b.getAttribute('data-car-brand-value')) : [],
    modelRows: m.querySelectorAll('[data-car-model-value]').length,
    modelVals: [...m.querySelectorAll('[data-car-model-value]')].map((b) => b.getAttribute('data-car-model-value')),
    modelSel: [...m.querySelectorAll('[data-car-model-filter] [aria-pressed="true"]')].length,
    // 🚙🌂 ОЛОН ЗАГВАР: сонгосон загварууд (чип ба URL-ийн эх сурвалж ✓)
    modelSelVals: modelCol
      ? [...modelCol.querySelectorAll('[aria-pressed="true"]')]
        .map((b) => b.getAttribute('data-car-model-value')).filter(Boolean)
      : [],
    modelCount: countEl ? Number(countEl.getAttribute('data-car-model-count')) : 0,
    chips: m.querySelectorAll('[data-car-chips] button[aria-label$="арилгах"]').length,
    brandFree: m.querySelectorAll('[data-car-brand-free]').length,
    modelFree: m.querySelectorAll('[data-car-model-free]').length,
    apply: m.querySelectorAll('[data-apply-car]').length,
    applyText: (() => { const b = m.querySelector('[data-apply-car]'); return b ? (b.innerText || '').trim() : ''; })(),
    clear: m.querySelectorAll('[data-clear-car]').length,
    selects: m.querySelectorAll('select').length,
  };
})()`);

// ═══════ ⓪ САЙДБАР — НЭГ ТОВЧ (ХОЁР талбар БИШ) ═══════
await go(`${BASE}/?section=auto&category=all&type=${encodeURIComponent('Суудлын машин')}`);
const ready0 = await waitFor(`document.querySelector('[data-sidebar-car]')`, 25000);
const a0 = await asideCar();
check('⓪ sidebar: «Үйлдвэрлэгч, загвар» НЭГ товч (`[data-sidebar-car]` = 1)',
  ready0 === true && a0.buttons === 1, JSON.stringify(a0));
check('⓪ sidebar: ХУУЧИН 🏷️/🚙 талбар БАЙХГҮЙ (input 0/0 · attr блок 0/0 — нэг л UI ✓)',
  a0.brandInputs === 0 && a0.modelInputs === 0 && a0.brandBlocks === 0 && a0.modelBlocks === 0,
  JSON.stringify(a0));
check('⓪ sidebar: товчны шошго «Бүх үйлдвэрлэгч, загвар» (юу ч сонгоогүй үед)',
  String(a0.label).includes('Бүх үйлдвэрлэгч, загвар'), a0.label);
check('⓪ sidebar: pill / «✕ Цэвэрлэх» БАЙХГҮЙ (сонголтгүй үед ✓)',
  a0.pills.length === 0 && a0.clear === 0, JSON.stringify(a0));

// ═══════ ① ПИКЕР НЭЭГДЭХ (📍 Байршилтай ИЖИЛ) ═══════
await click('[data-sidebar-car]');
const open1 = await waitFor(`document.querySelector('[data-car-picker]')`, 10000);
const p1 = await pickerUi();
check('① товч дарахад `[data-car-picker]` (modal) нээгдэв', open1 === true, JSON.stringify(p1));
check('① пикер: ХАЙЛТЫН талбар (`#car-search` = 1) бий', p1.search === 1, JSON.stringify(p1));
check(`① пикер: 🏷️ багана = 1 ба бүх брэнд (${CAR_BRANDS.length})`,
  p1.brandCol === 1 && p1.brandRows === CAR_BRANDS.length,
  JSON.stringify({ brandCol: p1.brandCol, brandRows: p1.brandRows }));
check('① пикер: брэнд сонгоогүй тул 🚙 багана БАЙХГҮЙ (каскад ✓)',
  p1.modelCol === 0 && p1.modelRows === 0, JSON.stringify({ modelCol: p1.modelCol }));
check('① пикер: «Машиныг хэрэглэх» ба «✕ Цэвэрлэх» товчнууд бий',
  p1.apply === 1 && p1.clear === 1, JSON.stringify({ apply: p1.apply, clear: p1.clear }));
check('① пикер: ХУУЧИН `<select>` БАЙХГҮЙ (0)', p1.selects === 0, String(p1.selects));

// ═══════ ①b 🏷️ Toyota → 🚙 загварууд → «хэрэглэх» ═══════
await click('[data-car-brand-value="Toyota"]');
const p2 = await pickerUi();
check('①b 🏷️ «Toyota» сонгогдов (`aria-pressed`)',
  JSON.stringify(p2.brandSel) === JSON.stringify(['Toyota']), JSON.stringify(p2.brandSel));
check('①b 🚙 багана нээгдэж Toyota-гийн моделууд (Prius 30 · Harrier · Camry)',
  p2.modelCol === 1 && ['Prius 30', 'Harrier', 'Camry'].every((x) => p2.modelVals.includes(x)),
  JSON.stringify(p2.modelVals.slice(0, 8)));
await click('[data-car-model-value="Prius 30"]');
const p3 = await pickerUi();
check('①b 🚙 «Prius 30» сонгогдов', p3.modelSel === 1, JSON.stringify({ modelSel: p3.modelSel }));
await click('[data-apply-car]');
await sleep(1200);
const gone1 = await waitFor(`!document.querySelector('[data-car-picker]')`, 6000);
const b1 = await urlParam('attr_brand');
const m1 = await urlParam('attr_model');
check('①b «Машиныг хэрэглэх» → пикер ХААГДАЖ `?attr_brand=Toyota&attr_model=Prius 30`',
  gone1 === true && b1 === 'Toyota' && m1 === 'Prius 30',
  JSON.stringify({ gone1, b1, m1 }));
const a1 = await asideCar();
check('①b sidebar: 2 pill (`brand`+`model`) ба «✕ Цэвэрлэх» гарч ирэв + шошго солигдов',
  a1.pills.length === 2 && a1.clear === 1
    && String(a1.label).includes('Toyota') && String(a1.label).includes('Prius 30'),
  JSON.stringify(a1));


// ═══════ ①c ДАХИН НЭЭХЭД НООРОГ `filters`-ЭЭС ШИНЭЭР АВАГДАХ ═══════
await click('[data-sidebar-car]');
await waitFor(`document.querySelector('[data-car-picker]')`, 10000);
const p4 = await pickerUi();
check('①c дахин нээхэд ноорог нь `filters`-ээс авагдав (Toyota + Prius 30 тэмдэглэгдсэн)',
  JSON.stringify(p4.brandSel) === JSON.stringify(['Toyota']) && p4.modelSel === 1,
  JSON.stringify({ brandSel: p4.brandSel, modelSel: p4.modelSel }));

// ═══════ ①d 🔍 ХАЙЛТ (Байршил шиг бичиж шүүнэ) ═══════
const typed = await typeInto('#car-search', 'pri');
await sleep(400);
const p5 = await pickerUi();
check('①d 🔍 «pri» бичихэд 🚙 зөвхөн Prius-ууд үлдэв (хайлт ажиллаж байна ✓)',
  typed === 'OK' && p5.modelVals.length > 0
    && p5.modelVals.every((x) => String(x).toLowerCase().includes('pri')),
  JSON.stringify(p5.modelVals));
check('①d 🔍 тохирох брэнд байхгүй тул ЧӨЛӨӨТ ТЕКСТ мөр гарна (өмнөх зан ✓)',
  p5.brandRows === 0 && p5.brandFree === 1 && p5.modelFree === 1,
  JSON.stringify({ brandRows: p5.brandRows, brandFree: p5.brandFree, modelFree: p5.modelFree }));
await typeInto('#car-search', '');
await sleep(300);

// ═══════ ①e 🌈 BRAND СOЛИГДОХОД ЗАГВАР ЦЭВЭРЛЭГДЭНЭ (cascade) ═══════
await click('[data-car-brand-value="Nissan"]');
const p6 = await pickerUi();
check('①e 🌈 «Nissan» сонгоход хуучин 🚙 «Prius 30» ЦЭВЭРЛЭГДЭВ (зөрчсөн хос үлдэхгүй ✓)',
  JSON.stringify(p6.brandSel) === JSON.stringify(['Nissan'])
    && p6.modelSel === 0 && p6.modelVals.length > 0,
  JSON.stringify({ brandSel: p6.brandSel, modelSel: p6.modelSel, modelVals: p6.modelVals.slice(0, 5) }));

// ═══════ ①f «МАШИНЫГ ХЭРЭГЛЭХ» → URL ═══════
await click('[data-apply-car]');
await sleep(1200);
const b2 = await urlParam('attr_brand');
const m2 = await urlParam('attr_model');
check('①f «Машиныг хэрэглэх» → `?attr_brand=Nissan`, `attr_model` АРИЛАВ ✓',
  b2 === 'Nissan' && !m2, JSON.stringify({ attr_brand: b2, attr_model: m2 }));

// ═══════ ①g САЙДБАРЫН «✕ ЦЭВЭРЛЭХ» ═══════
await click('[data-car-clear]');
await sleep(1200);
const b3 = await urlParam('attr_brand');
const m3 = await urlParam('attr_model');
const a2 = await asideCar();
check('①g sidebar «✕ Цэвэрлэх» → URL-аас хоёул арилав',
  !b3 && !m3, JSON.stringify({ attr_brand: b3, attr_model: m3 }));
check('①g sidebar: товчны шошго «Бүх үйлдвэрлэгч, загвар» болж БУЦАВ (pill/clear 0)',
  String(a2.label).includes('Бүх үйлдвэрлэгч, загвар') && a2.pills.length === 0 && a2.clear === 0,
  JSON.stringify(a2));

// ═══════ ①h БУЦААЖ ХЭРЭГЛЭХ (брэнд БА загвар хамт) ═══════
await click('[data-sidebar-car]');
await waitFor(`document.querySelector('[data-car-picker]')`, 10000);
await click('[data-car-brand-value="Toyota"]');
await click('[data-car-model-value="Harrier"]');
await click('[data-apply-car]');
await sleep(1200);
const b4 = await urlParam('attr_brand');
const m4 = await urlParam('attr_model');
check('①h Toyota + Harrier → `?attr_brand=Toyota&attr_model=Harrier` (хоёул хамт ✓)',
  b4 === 'Toyota' && m4 === 'Harrier', JSON.stringify({ attr_brand: b4, attr_model: m4 }));
const carReq = carReqs.slice(-1)[0] ? decodeURIComponent(carReqs.slice(-1)[0]) : '';
check('③ DB query нь ХУУЧИН гэрээ хэвээр (`attrs->>brand` / `attrs->>model` + ilike ✓)',
  /attrs->>brand/.test(carReq) && /ilike/.test(carReq) && /Toyota/.test(carReq),
  carReq.slice(-140) || '(query байхгүй)');


// ═══════ ①i 🚙🌂 ОЛОН ЗАГВАР (2026-10-04 (36)) — «Prius 30» + «Harrier» ═══════
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «машины загвараас олоныг сонгох боломжтой болго»
await click('[data-sidebar-car]');
await waitFor(`document.querySelector('[data-car-picker]')`, 10000);
// ⚠️ ①h-ээс хойш ноорог нь Toyota + Harrier (URL-ээс ✓) — Prius 30-ыг НЭМНЭ
await click('[data-car-model-value="Prius 30"]');
const p7 = await pickerUi();
check('①i пикер: 2 загвар ЗЭРЭГ сонгогдов (`aria-pressed` — checkbox зан ✓)',
  p7.modelSel === 2 && JSON.stringify(p7.modelSelVals.slice().sort()) === JSON.stringify(['Harrier', 'Prius 30']),
  JSON.stringify({ modelSel: p7.modelSel, modelSelVals: p7.modelSelVals }));
check('①i пикер: чип нь утга БҮРД тусдаа (брэнд 1 + загвар 2 = 3 ✓) ба тооны badge = 2',
  p7.chips === 3 && p7.modelCount === 2, JSON.stringify({ chips: p7.chips, modelCount: p7.modelCount }));
check('①i пикер: «Машиныг хэрэглэх» товч сонгосон тоог харуулна («(2 загвар)» ✓)',
  p7.apply === 1 && /\(2 загвар\)/.test(p7.applyText), JSON.stringify({ apply: p7.apply, applyText: p7.applyText }));
await click('[data-apply-car]');
await sleep(1300);
const gone3 = await waitFor(`!document.querySelector('[data-car-picker]')`, 6000);
const b5 = await urlParam('attr_brand');
const m5 = await urlParam('attr_model');
check('①i «Машиныг хэрэглэх» → `?attr_model=Harrier,Prius 30` (таслалаар, дараалал хадгалагдана ✓)',
  gone3 === true && b5 === 'Toyota' && m5 === 'Harrier,Prius 30',
  JSON.stringify({ gone3, attr_brand: b5, attr_model: m5 }));
const a3 = await asideCar();
check('①i sidebar: pill нь ТОВЧЛОСОН шошго — «2 загвар» + `data-car-model-count=2`',
  a3.pills.length === 2 && a3.modelCount === 2 && a3.modelPillText === '2 загвар',
  JSON.stringify({ pills: a3.pills, modelCount: a3.modelCount, modelPillText: a3.modelPillText }));
check('①i sidebar: товчны шошго «Toyota 2 загвар» (нэрсийг бүтнээр жагсаахгүй ✓)',
  String(a3.label).includes('Toyota') && String(a3.label).includes('2 загвар'),
  String(a3.label));
const carReq2 = carReqs.slice(-1)[0] ? decodeURIComponent(carReqs.slice(-1)[0]) : '';
check('①i DB query: олон загвар нь `or=(attrs->>model.ilike.%A%,attrs->>model.ilike.%B%)` (OR ✓)',
  /or=\(attrs->>model\.ilike\.%Prius[ +]30%,attrs->>model\.ilike\.%Harrier%\)/.test(carReq2)
    || /or=\(attrs->>model\.ilike\.%Harrier%,attrs->>model\.ilike\.%Prius[ +]30%\)/.test(carReq2),
  carReq2.slice(-220) || '(query байхгүй)');
check('①i DB query: `in.(` АШИГЛАГДААГҮЙ (текст талбар тул `ilike` ✓)',
  !/attr[s]?->>model=in\./.test(carReq2) && !/attrs->>model\.in\./.test(carReq2),
  carReq2.slice(-220) || '(query байхгүй)');
// ⚠️ ХАМГИЙН ЧУХАЛ: `or=(attrs->>model.ilike.%A%,…ilike.%B%)` нь PostgREST-д
//    ХҮЧИНТЭЙ эсэх — бодит DB 400 (logic tree эвдэрсэн) буцаавал хайлт УНАX
//    байв ✗ ⇒ хариуны status нь ЯГ 200 байх ёстой ✓
const carResMulti = carRes.filter((r) => decodeURIComponent(r.url).includes('or=(attrs->>model.ilike')).slice(-1)[0];
check('①i DB хариу: PostgREST `or=(…ilike…)`-ийг ХҮЛЭЭВ (status 200, 400 БИШ ✓)',
  Boolean(carResMulti) && carResMulti.status === 200,
  JSON.stringify(carResMulti || null));

// ═══════ ①j ДАХИН НЭЭХЭД МАССИВ НООРОГ СЭРЭГЖИНЭ + НЭГ ЗАГВАР ХАСАХ ═══════
await click('[data-sidebar-car]');
await waitFor(`document.querySelector('[data-car-picker]')`, 10000);
const p8 = await pickerUi();
check('①j дахин нээхэд 2 загвар ТЭМДЭГЛЭГДСЭН хэвээр (`filters`-ээс массив уншигдав ✓)',
  p8.modelSel === 2 && p8.chips === 3,
  JSON.stringify({ modelSel: p8.modelSel, chips: p8.chips, modelSelVals: p8.modelSelVals }));
// «Prius 30»-ыг дахин дарж ЦУЦЛАХ (checkbox зан ✓)
await click('[data-car-model-value="Prius 30"]');
const p9 = await pickerUi();
check('①j ижил утгыг дахин дарахад ЦУЦЛАГДАВ (нэг л загвар үлдэв ✓)',
  p9.modelSel === 1 && JSON.stringify(p9.modelSelVals) === JSON.stringify(['Harrier']),
  JSON.stringify({ modelSel: p9.modelSel, modelSelVals: p9.modelSelVals }));
// 🚙🌂 МАССИВ дээр ХҮРЭХ: дахин Prius 30 нэмж, дараа нь Nissan сонгоно
await click('[data-car-model-value="Prius 30"]');
const p10 = await pickerUi();
check('①j дахин нэмэхэд массив 2 болж БУЦАВ (toggle EРГЭЛТЭЭ ✓)',
  p10.modelSel === 2, JSON.stringify({ modelSel: p10.modelSel }));
await click('[data-car-brand-value="Nissan"]');
const p11 = await pickerUi();
check('①j 🌈 «Nissan» сонгоход БҮХ загвар (массив) ЦЭВЭРЛЭГДЭВ (зөрчсөн хос үлдэхгүй ✓)',
  JSON.stringify(p11.brandSel) === JSON.stringify(['Nissan'])
    && p11.modelSel === 0 && p11.chips === 1 && p11.modelCount === 0,
  JSON.stringify({ brandSel: p11.brandSel, modelSel: p11.modelSel, chips: p11.chips, modelCount: p11.modelCount }));
await click('[data-apply-car]');
await sleep(1200);
const b6 = await urlParam('attr_brand');
const m6 = await urlParam('attr_model');
check('①j «Машиныг хэрэглэх» → `?attr_brand=Nissan`, `attr_model` БҮРЭН арилав ✓',
  b6 === 'Nissan' && !m6, JSON.stringify({ attr_brand: b6, attr_model: m6 }));
// 🧹 Дараагийн шалгалтуудад цэвэр төлөв (📱 мобайл) — Цэвэрлэх
await click('[data-car-clear]');
await sleep(1200);
const a4 = await asideCar();
check('①j «✕ Цэвэрлэх» → pill/товч цэвэр (массив загвар ч бүрэн арилна ✓)',
  a4.pills.length === 0 && String(a4.label).includes('Бүх үйлдвэрлэгч, загвар'),
  JSON.stringify(a4));


// ═══════ ② 📱 МОБАЙЛ 390px — НЭГ ДЭЛГЭЦЭД НЭГ ШАТЛАЛ (drill-down) ═══════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await sleep(900);
const mobileUi = () => evalJs(`(() => {
  const m = document.querySelector('[data-car-picker]');
  const mob = m && m.querySelector('[data-mobile-car]');
  const col = m && m.querySelector('[data-car-col="brand"]');
  const w = (el) => (el ? Math.round(el.getBoundingClientRect().width) : 0);
  return {
    mobile: mob ? w(mob) : -1,
    col: w(col),
    brandRows: m ? m.querySelectorAll('[data-mobile-car-brand]').length : 0,
    modelRows: m ? m.querySelectorAll('[data-mobile-car-model]').length : 0,
    back: m ? m.querySelectorAll('button[aria-label="Буцах"]').length : 0,
    overflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
  };
})()`);
await click('[data-sidebar-car]');
await waitFor(`document.querySelector('[data-car-picker]')`, 10000);
const w1 = await mobileUi();
check('② 📱 мобайл: `[data-mobile-car]` ХАРАГДАЖ, 2 КАСКАД БАГАНА НУУГДАВ (өргөн 0 ✓)',
  w1.mobile > 0 && w1.col === 0, JSON.stringify(w1));
check('② 📱 мобайл: эхний шатлал нь брэндийн жагсаалт + `←` буцах товч БАЙХГҮЙ',
  w1.brandRows > 50 && w1.back === 0 && w1.modelRows === 0,
  JSON.stringify({ brandRows: w1.brandRows, back: w1.back, modelRows: w1.modelRows }));
await click('[data-mobile-car-brand="Toyota"]');
const w2 = await mobileUi();
check('② 📱 мобайл: «Toyota» дарж ЗАГВАРЫН дэлгэц рүү шилжив + `←` гарч ирэв',
  w2.modelRows > 0 && w2.back > 0 && w2.brandRows === 0,
  JSON.stringify({ modelRows: w2.modelRows, back: w2.back, brandRows: w2.brandRows }));
const backRes = await evalJs(`(() => {
  const b = document.querySelector('[data-car-picker] button[aria-label="Буцах"]');
  if (!b) return 'NOT_FOUND';
  b.click();
  return 'OK';
})()`);
await sleep(600);
const w3 = await mobileUi();
check('② 📱 мобайл: `←` → брэндийн дэлгэц рүү БУЦАВ (Toyota сонгогдсон хэвээр ✓)',
  backRes === 'OK' && w3.brandRows > 50 && w3.back === 0,
  JSON.stringify({ backRes, brandRows: w3.brandRows, back: w3.back }));
check('② 📱 мобайл: хэвтээ гүйлт (overflow) ГАРАХГҮЙ', w3.overflow === true, '');
// 🚙🌂 2026-10-04 (36): мобайл дээр ч ОЛОН загвар сонгож болно (нэг дэлгэцэд ✓)
// ⚠️ `←`-ийн дараа брэндийн дэлгэц дээр байгаа тул «Toyota» дээр дахин дараад
//    ЗАГВАРЫН дэлгэц рүү орно (ноорог хэвээр: `pickBrandMobile` ✓)
await click('[data-mobile-car-brand="Toyota"]');
await sleep(400);
const mobileCarSel = () => evalJs(`(() => {
  const m = document.querySelector('[data-car-picker]');
  if (!m) return { none: true };
  const badge = m.querySelector('[data-car-model-count]');
  return {
    sel: [...m.querySelectorAll('[data-mobile-car-model][aria-pressed="true"]')]
      .map((b) => b.getAttribute('data-mobile-car-model')),
    count: badge ? Number(badge.getAttribute('data-car-model-count')) : 0,
    chips: m.querySelectorAll('[data-car-chips] button[aria-label$="арилгах"]').length,
  };
})()`);
const picked2 = await evalJs(`(() => {
  const m = document.querySelector('[data-car-picker]');
  if (!m) return -1;
  const rows = [...m.querySelectorAll('[data-mobile-car-model]')].slice(0, 2);
  rows.forEach((b) => b.click());
  return rows.length;
})()`);
await sleep(600);
const mobSel = await mobileCarSel();
check('② 📱 мобайл: 2 загвар зэрэг сонгогдов (checkbox — тоо badge = 2, чип 3 ✓)',
  picked2 === 2 && mobSel.sel.length === 2 && mobSel.count === 2 && mobSel.chips === 3,
  JSON.stringify({ picked2, ...mobSel }));
await click('[data-clear-car]');
await sleep(500);
await click('[data-apply-car]');
const closed2 = await waitFor(`!document.querySelector('[data-car-picker]')`, 6000);
check('② 📱 мобайл: «Машиныг хэрэглэх» пикерийг хаав', closed2 === true);
const mobUrl = await urlParam('attr_model');
check('② 📱 мобайл: «✕ Цэвэрлэх» → `attr_model` арилав (массив бүрэн цэвэр ✓)',
  !mobUrl, JSON.stringify({ attr_model: mobUrl }));
await rpc('Emulation.clearDeviceMetricsOverride');

// ═══════ ③ ДҮГНЭЛТ ═══════
check('🧯 Консол дээр exception ГАРАГҮЙ', exceptions.length === 0, exceptions.slice(0, 2).join(' | '));
console.log(`\n${fail === 0 ? '✅' : '❌'} CDP машин (Үйлдвэрлэгч, загвар) — ${pass} OK, ${fail} FAIL\n`);
ws.close();
await closeOwnTab();
process.exit(fail === 0 ? 0 : 1);

