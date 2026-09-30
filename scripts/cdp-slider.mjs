/**
 * 🎚 CDP ШАЛГАЛТ — «чирдэг хүрээ» (RangeSlider) + эрэмбэлэх сонголт + hero
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээсэн байх:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-slider.mjs   (эсвэл npm run cdp:slider)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:search` ✓
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
const page = list.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
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
await rpc(ws, 4, 'Emulation.setDeviceMetricsOverride', { width: 1280, height: 1200, deviceScaleFactor: 1, mobile: false });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evalJs = async (id, expression) => {
  const r = await rpc(ws, id, 'Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails.text));
  return r.result.value;
};
const go = async (id, url, wait = 5000) => {
  await rpc(ws, id, 'Page.navigate', { url });
  await sleep(wait);
};

let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};

const url = () => evalJs(9001, 'location.search');
const sliderInfo = (label) => evalJs(9002, `(() => {
  const root = [...document.querySelectorAll('[data-slider]')].find(r => r.dataset.slider === ${JSON.stringify(label)});
  if (!root) return null;
  const h = [...root.querySelectorAll('[data-handle]')].map((b) => ({
    k: b.dataset.handle, now: b.getAttribute('aria-valuenow'),
    min: b.getAttribute('aria-valuemin'), max: b.getAttribute('aria-valuemax'),
  }));
  return JSON.stringify({ handles: h, label: root.parentElement.querySelector('[data-range-label]')?.textContent || '' });
})()`);

console.log('\n🎚 CDP — чирдэг хүрээ + эрэмбэлэлт\n');

// ═══════ ① ҮЛ ХӨДЛӨХ: үнэ + талбайн слайдер ═══════
await go(10, `${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}`, 6000);

const price = JSON.parse((await sliderInfo('Үнэ')) || 'null');
const area = JSON.parse((await sliderInfo('Талбай')) || 'null');
check('🏠 Үл хөдлөх: «Үнэ» слайдер 2 толгойтой гарлаа', !!price && price.handles.length === 2);
check('🏠 «Талбай» слайдер 2 толгойтой гарлаа', !!area && area.handles.length === 2);
check('🎯 Үнийн дээд хил 5 тэрбум (үл хөдлөх)', price?.handles?.[1]?.max === '5000000000', `max=${price?.handles?.[1]?.max}`);
check('🎯 Талбайн хил 0–600 м²', area?.handles?.[1]?.max === '600' && area?.handles?.[0]?.min === '0');
check('🏷 Шошго нь уншигдах ₮ хэлбэртэй', /₮.+ – ₮/.test(price?.label || ''), price?.label);

// ═══════ ② ХУЛГАНААР ЧИРЭХ (гол шаардлага) ═══════
const geom = JSON.parse(await evalJs(11, `(() => {
  const root = [...document.querySelectorAll('[data-slider]')].find(r => r.dataset.slider === 'Үнэ');
  const h = root.querySelector('[data-handle="to"]');
  const r = h.getBoundingClientRect(); const t = root.getBoundingClientRect();
  return JSON.stringify({ hx: r.left + r.width / 2, hy: r.top + r.height / 2, tl: t.left, tw: t.width, wy: t.top + t.height / 2 });
})()`));
const targetX = geom.tl + 9 + (geom.tw - 18) * 0.4; // 40% → ~2 тэрбум
listingReqs.length = 0;

await rpc(ws, 12, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: geom.hx, y: geom.hy, button: 'left', clickCount: 1, buttons: 1 });
for (let i = 1; i <= 5; i += 1) {
  const x = geom.hx + ((targetX - geom.hx) * i) / 5;
  await rpc(ws, 13, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y: geom.wy, button: 'left', buttons: 1 });
  await sleep(60);
}
await rpc(ws, 14, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: targetX, y: geom.wy, button: 'left', clickCount: 1, buttons: 1 });
await sleep(2500);

const afterDrag = JSON.parse((await sliderInfo('Үнэ')) || 'null');
const q = await url();
const maxPrice = Number(new URLSearchParams(q).get('maxPrice') || 0);
check('🖱 ЧИРЭХЭД URL-д `maxPrice` бичигдэв', /maxPrice=\d+/.test(q), q);
check('🖱 Чирсэн утга ≈ 2 тэрбум (40% байрлал)', Math.abs(maxPrice - 2_000_000_000) <= 250_000_000, String(maxPrice));
check('🖱 Толгойн байрлал шинэчлэгдэв (aria-valuenow)', afterDrag?.handles?.[1]?.now === String(maxPrice), String(afterDrag?.handles?.[1]?.now));
check('⚡ ЧИРЭЛТИЙН ТУРШ 1 Л QUERY явсан (нэг commit ✓)', listingReqs.length === 1, `${listingReqs.length} query`);
const chipText = await evalJs(15, `(() => [...document.querySelectorAll('span,button')].map(s => (s.textContent || '').trim()).filter(t => t && /₮/.test(t) && t.length < 30).slice(0, 4).join(' | '))()`);
check('🏷 Идэвхтэй шүүлтийн чип гарлаа', !!chipText, String(chipText).slice(0, 90));

// ═══════ ③ ТҮРГЭН СОНГОХ ХҮРЭЭ (₮) ═══════
const pickInfo = await evalJs(16, `(() => {
  const b = [...document.querySelectorAll('[data-quick-pick]')];
  return JSON.stringify({ n: b.length, labels: b.map(x => x.textContent) });
})()`);
const picks = JSON.parse(pickInfo || '{"n":0,"labels":[]}');
check('⚡ Түргэн сонгох 4 хүрээ гарлаа', picks.n === 4, picks.labels.join(' · '));
await evalJs(17, `document.querySelectorAll('[data-quick-pick]')[0].click()`);
await sleep(2500);
const qPick = await url();
check('⚡ Эхний хүрээ дарахад URL шинэчлэгдэв', /maxPrice=250000000/.test(qPick), qPick);

// ═══════ ④ ГАРЫН ТОВЧ (a11y) ═══════
await evalJs(18, `document.querySelector('[data-slider="Үнэ"] [data-handle="from"]').focus()`);
await rpc(ws, 19, 'Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 });
await rpc(ws, 20, 'Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 });
await sleep(2500);
const qKey = await url();
check('⌨️ Гараар → дарахад minPrice нэг алхам (50 сая) болов', /minPrice=50000000/.test(qKey), qKey);

// ═══════ ⑤ ЦЭВЭРЛЭХ ═══════
await evalJs(21, `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Бүгдийг цэвэрлэх')?.click()`);
await sleep(2500);
const qClear = await url();
check('↺ «Бүгдийг цэвэрлэх» — үнэ/талбайн шүүлт арилав', !/minPrice|maxPrice|minArea|maxArea/.test(qClear), qClear || '(хоосон)');

// ═══════ ⑥ АВТО: 📅 ОНЫ хүрээний слайдер ═══════
await go(30, `${BASE}/?section=auto&type=${encodeURIComponent('Суудлын машин')}`, 6000);
const yearInfo = JSON.parse((await evalJs(31, `(() => {
  const roots = [...document.querySelectorAll('[data-slider]')].map(r => ({ label: r.dataset.slider, h: [...r.querySelectorAll('[data-handle]')].map(b => b.getAttribute('aria-valuenow') + '/' + b.getAttribute('aria-valuemin') + '/' + b.getAttribute('aria-valuemax')) }));
  return JSON.stringify(roots);
})()`)) || '[]');
check('📅 Авто хэсэгт оны хүрээний слайдерууд гарлаа (2 ширхэг)',
  yearInfo.filter((r) => /Үйлдвэрлэсэн он|Орж ирсэн он/.test(r.label)).length === 2,
  yearInfo.map((r) => r.label).join(' · '));
const yRoot = yearInfo.find((r) => /Үйлдвэрлэсэн он/.test(r.label));
check('📅 Оны хил нь 1990 – одоогийн он',
  /1990/.test((yRoot?.h || []).join(' ')) && /\/20[2-9][0-9]/.test((yRoot?.h || [])[1] || ''),
  (yRoot?.h || []).join(' | '));

const yGeom = JSON.parse(await evalJs(32, `(() => {
  const root = [...document.querySelectorAll('[data-slider]')].find(r => /Үйлдвэрлэсэн он/.test(r.dataset.slider));
  const h = root.querySelector('[data-handle="to"]');
  const r = h.getBoundingClientRect(); const t = root.getBoundingClientRect();
  return JSON.stringify({ hx: r.left + r.width / 2, hy: r.top + r.height / 2, tl: t.left, tw: t.width, wy: t.top + t.height / 2 });
})()`));
const yTarget = yGeom.tl + 9 + (yGeom.tw - 18) * 0.8;
await rpc(ws, 33, 'Input.dispatchMouseEvent', { type: 'mousePressed', x: yGeom.hx, y: yGeom.hy, button: 'left', clickCount: 1, buttons: 1 });
await rpc(ws, 34, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: yTarget, y: yGeom.wy, button: 'left', buttons: 1 });
await rpc(ws, 35, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x: yTarget, y: yGeom.wy, button: 'left', clickCount: 1, buttons: 1 });
await sleep(2500);
const qYear = await url();
check('📅 Оны дээд хязгаар чирж тохируулагдав (attr_year_to)', /attr_year_to=\d{4}/.test(qYear), qYear);

// ═══════ ⑦ ХАЙЛТЫН МӨРНИЙ «БҮХ ХЭСЭГ ▾» (eBay загвар) ═══════
await go(40, BASE, 6000);
const heroOpts = await evalJs(41, `document.querySelectorAll('[data-hero-section] option').length`);
check('🔍 Hero-д «Бүх хэсэг ▾» сонголт гарлаа (12 хэсэг + 1)', heroOpts === 13, `${heroOpts} option`);

// ═══════ ⑧ ЭРЭМБЭЛЭХ (Sort) ═══════
const setSelect = (id, value) => evalJs(id, `(() => {
  const sel = document.querySelector('[data-listing-sort]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  setter.call(sel, ${JSON.stringify(value)});
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  return sel.value;
})()`);
check('🔀 Эрэмбэлэх сонголт гарлаа (3 утга)', (await evalJs(42, `document.querySelectorAll('[data-listing-sort] option').length`)) === 3);
listingReqs.length = 0;
await setSelect(43, 'price_asc');
await sleep(3000);
const qSort = await url();
const lastReq = decodeURIComponent(listingReqs[listingReqs.length - 1] || '');
check('🔀 Сонгоход URL-д `?sort=price_asc` болов', /sort=price_asc/.test(qSort), qSort);
check('🔀 DB query нь `order=price.asc` болсон', /order=price\.asc/.test(lastReq), lastReq.split('/listings?')[1]?.slice(0, 90));

// ═══════ ⑨ АЛДАА ═══════
check('🧯 JS exception 0', exceptions.length === 0, exceptions.slice(0, 2).join(' | ') || '—');

console.log(`\n${fail === 0 ? '✅ БҮГД ОК' : '❌ АЛДААТАЙ'}: ${pass}/${pass + fail} шалгалт (бодит Chrome)\n`);
process.exit(fail === 0 ? 0 : 1);
