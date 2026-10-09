/**
 * 🎨 CDP ШАЛГАЛТ — ЗАРЫН ДЭЛГЭРЭНГҮЙ ХУУДАС «СААРАЛГҮЙ» ХЭВ
 *   (2026-10-09 (87), бодит Chrome)
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «зарын detail буюу зар луу ороход бас иим болгож, бүх
 *   саарал өнгийг үгүй хиймээр байна» ⇒ жишиг сайтын хэв: цагаан дэвсгэр,
 *   хайрцаггүй хэсгүүд (зөвхөн 1px дээд зураас), цагаан баруун багана ✓
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ БАРИУЛАХ ВЭ (бодит DOM/COMPUTED STYLE — эх кодын ГЭРЭЭ БИШ):
 *   ① `/` дээрээс эхний зарын id-г олж `/listings/<id>` руу орно
 *   ② `main` дотор СААРАЛ (крем) ДҮҮРГЭЛТТЭЙ элемент **0** —
 *      `getComputedStyle(el).backgroundColor` нь `gray-50/100/200`
 *      (#FAF8F5 · #F4F1EA · #E9E4D9 — tailwind.config.js) утга БАЙХГҮЙ ✓
 *      ⚠️ ЗӨВХӨН `main`-ыг шалгана: толгой ба мобайл доод цэс нь санаатай
 *      `bg-gray-100` хэвээр (тэдгээр нь хуудасны АГУУЛГА БИШ) ✓
 *   ③ 🎥 видео · 📋 шинж чанар · 📝 тайлбар · 🗺 газрын зураг — хэсэг бүр
 *      ХАЙРЦАГГҮЙ (`border-radius: 0px`) ба зөвхөн 1px дээд зураастай
 *      (`border-top-width: 1px`) · дотор нь ЦАГААН (саарал дүүргэлтгүй) ✓
 *   ④ 💰 холбоо барих хайрцаг (баруун багана) нь ЦАГААН (`rgb(255, 255, 255)`)
 *      ба сүүдэргүй (`box-shadow: none`) ✓
 *   ⑤ 📱 390px: саарал дүүргэлт 0 ба хэвтээ гүйлт 0 ✓
 *   ⑥ 🐍 JS exception 0 (Leaflet-ээс бусад) ба hydration/
 *      `validateDOMNesting` алдаа 0 ✓
 *   ⑦ 📸 /tmp/detail-style-1280.png · /tmp/detail-style-390.png
 *
 * ⚙️ АЖИЛЛУУЛАХ:
 *   1) `npm run build && npm run start` (http://localhost:3000)
 *   2) Chrome: --headless=new --remote-debugging-port=9222
 *   3) node scripts/cdp-detail-style.mjs [BASE]
 *
 * ⚠️ Сервер/Chrome байхгүй бол SKIP (exit 0) — бусад cdp-* скриптийн зарчим ✓
 */
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3000';

let ok = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { ok += 1; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`); } else { fail += 1; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};

// ---------- ⓪ Серверийг шалгах (байхгүй бол SKIP) ----------
let serverUp = false;
try {
  const r = await fetch(BASE, { method: 'GET' });
  serverUp = r.status < 500;
} catch { serverUp = false; }
if (!serverUp) {
  console.log(`\n⏭ SKIP — ${BASE} дээр сервер алга (npm run build && npm run start)\n`);
  process.exit(0);
}

// ---------- ① Chrome-той холбогдох ----------
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

const list = await (await fetch('http://127.0.0.1:9222/json/list')).json().catch(() => null);
if (!list) {
  console.log('\n⏭ SKIP — Chrome :9222 алга (--headless=new --remote-debugging-port=9222)\n');
  process.exit(0);
}
let page = null;
try {
  const created = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (created.ok) page = await created.json();
} catch { /* нөөц зам */ }
let ownTab = !list.some((t) => t.id === page?.id);
if (!page?.webSocketDebuggerUrl) {
  const pages = list.filter((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
  page = pages.find((t) => t.url.includes('localhost:3000')) || pages[0];
  ownTab = false;
}
if (!page?.webSocketDebuggerUrl) throw new Error('CDP: нээлттэй `page` target алга');
try { await fetch(`http://127.0.0.1:9222/json/activate/${page.id}`); } catch { /* алгасна */ }
const ws = new WebSocket(page.webSocketDebuggerUrl);
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
const consoleErrors = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    exceptions.push((d.exception && (d.exception.description || d.exception.value)) || d.text);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push(m.params.args.map((a) => a.value || a.description || '').join(' '));
  }
});
await rpc('Runtime.enable');
await rpc('Page.enable');

const evalJs = async (expr) => {
  const r = await rpc('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
};
const goto = async (url, w = 1280, h = 900) => {
  await rpc('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
  await rpc('Page.navigate', { url });
  await new Promise((r) => setTimeout(r, 3500));
};
const waitFor = async (expr, ms = 12000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await evalJs(expr)) return true; } catch { /* дахин */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
};
const shot = async (file) => {
  const r = await rpc('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log(`  📸 ${file}`);
};

/**
 * 🎨 ДЭЛГЭРЭНГҮЙ ХУУДСНЫ ХЭМЖИЛТ — нэг илэрхийллээр (хүснэгтэд буулгана)
 *   ⚠️ СААРАЛ = tailwind.config.js-ийн дулаан нейтрал («Sandstone»):
 *      gray-50 #FAF8F5 · gray-100 #F4F1EA · gray-200 #E9E4D9 ⇒ эдгээр нь
 *      ЦАГААН дэвсгэр дээр «саарал» мэт харагддаг ✗
 *   ⚠️ `rgba(255, 255, 255, 0.85)` (зургийн ‹ › товч) ба `bg-primary-light`
 *      (hover) нь саарал БИШ — тоолохгүй ✓
 *   ⚠️ `[data-similar-listings]` (🔎 Төстэй зарууд) нь ХЭСЭГ БИШ —
 *      хайрцаг/зураасны шалгалтаас ХАСНА ✓
 */
const PROBE = `(() => {
  const GRAY = ['rgb(250, 248, 245)', 'rgb(244, 241, 234)', 'rgb(233, 228, 217)'];
  const R = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
  const main = document.querySelector('main');
  if (!main) return { noMain: true };
  const els = [...main.querySelectorAll('*')];
  const gray = els
    .filter((el) => GRAY.includes(getComputedStyle(el).backgroundColor))
    .map((el) => (typeof el.className === 'string' && el.className ? el.className.slice(0, 70) : el.tagName.toLowerCase()))
    .slice(0, 6);
  const sections = els
    .filter((el) => el.tagName === 'SECTION' && !el.hasAttribute('data-similar-listings'))
    .map((s) => {
      const cs = getComputedStyle(s);
      const h2 = s.querySelector('h2');
      return {
        id: s.dataset.component || 'Section',
        label: h2 ? h2.textContent.trim().slice(0, 26) : '',
        radius: cs.borderTopLeftRadius,
        top: cs.borderTopWidth,
        bg: cs.backgroundColor,
        box: R(s),
      };
    });
  const asideCard = main.querySelector('aside > div');
  return {
    vw: window.innerWidth,
    scrollW: document.documentElement.scrollWidth,
    grayCount: gray.length,
    graySample: gray,
    sections,
    contact: asideCard
      ? {
        bg: getComputedStyle(asideCard).backgroundColor,
        shadow: getComputedStyle(asideCard).boxShadow,
        radius: getComputedStyle(asideCard).borderTopLeftRadius,
      }
      : null,
  };
})()`;

// ---------- ② ЗАРЫН ДЭЛГЭРЭНГҮЙ — 1280px ----------
console.log('\n🧪 ЗАРЫН ДЭЛГЭРЭНГҮЙ — «бүх саарал өнгө үгүй» (бодит Chrome)\n');
await goto(`${BASE}/`, 1280, 900);
await waitFor(`document.querySelectorAll('a[data-listing-card]').length > 0`);
const href = await evalJs(`(() => {
  const a = document.querySelector('a[data-listing-card]');
  return a ? a.getAttribute('href') : null;
})()`);
check('① `/` дээрээс зарын линк олдлоо', !!href, href || '—');
if (!href) {
  console.log('\n❌ CDP: зарын линк олдсонгүй\n');
  await hardExit(1);
}

await goto(`${BASE}${href}`, 1280, 900);
await waitFor(`!!document.querySelector('main') && document.querySelectorAll('main section').length > 0`);
const d = await evalJs(PROBE);
check('①b Зарын дэлгэрэнгүй хуудас нээгдэв (≥3 хэсэгтэй)',
  !d.noMain && d.sections.length >= 3, d.noMain ? '`main` алга' : `${d.sections.length} хэсэг`);
check('② `main` дотор СААРАЛ (крем) дүүргэлттэй элемент 0',
  d.grayCount === 0, d.grayCount ? `${d.grayCount} → ${d.graySample.join(' | ')}` : '0 ✓');
check('③ Хэсгүүд ХАЙРЦАГГҮЙ (`border-radius: 0px`) — жишиг сайтын хэв',
  d.sections.every((s) => s.radius === '0px'),
  d.sections.map((s) => `${s.label || s.id}: ${s.radius}`).join(' · '));
check('③b Хэсгүүд зөвхөн 1px ДЭЭД зураастай (`border-top-width: 1px`)',
  d.sections.every((s) => s.top === '1px'), d.sections.map((s) => s.top).join(' · '));
check('③c Хэсгүүдийн дэвсгэр нь ЦАГААН (саарал дүүргэлт БАЙХГҮЙ)',
  d.sections.every((s) => s.bg === 'rgba(0, 0, 0, 0)' || s.bg === 'rgb(255, 255, 255)'),
  d.sections.map((s) => s.bg).join(' · '));
check('④ 💰 Холбоо барих хайрцаг ЦАГААН ба СҮҮДЭРГҮЙ',
  !!d.contact && d.contact.bg === 'rgb(255, 255, 255)' && d.contact.shadow === 'none',
  d.contact ? `bg ${d.contact.bg} · shadow ${d.contact.shadow}` : 'хайрцаг алга');
check('⑤ Хэвтээ гүйлт 0 (1280px)', d.scrollW <= d.vw + 1, `scrollW ${d.scrollW} / vw ${d.vw}`);
await shot('/tmp/detail-style-1280.png');

// ---------- ③ 📱 390px (мобайл) ----------
await goto(`${BASE}${href}`, 390, 900);
await waitFor(`!!document.querySelector('main') && document.querySelectorAll('main section').length > 0`);
const m = await evalJs(PROBE);
check('⑤b 📱 390px: саарал дүүргэлт 0', m.grayCount === 0,
  m.grayCount ? `${m.grayCount} → ${m.graySample.join(' | ')}` : '0 ✓');
check('⑤c 📱 390px: хэвтээ гүйлт 0', m.scrollW <= m.vw + 1, `scrollW ${m.scrollW} / vw ${m.vw}`);
check('⑤d 📱 390px: хэсгүүд ХАЙРЦАГГҮЙ (radius 0px)',
  m.sections.every((s) => s.radius === '0px'), m.sections.map((s) => s.radius).join(' · '));
await shot('/tmp/detail-style-390.png');

// ---------- ④ 🐍 JS алдаа ----------
const leaflet = (s) => /leaflet/i.test(s);
const badExceptions = exceptions.filter((e) => !leaflet(e));
const badConsole = consoleErrors.filter((e) => !leaflet(e));
check('⑥ Leaflet-ээс БУСАД exception 0', badExceptions.length === 0, badExceptions.slice(0, 2).join(' | '));
check('⑥b hydration/`validateDOMNesting` алдаа 0', badConsole.length === 0, badConsole.slice(0, 2).join(' | '));

console.log(`\n${fail === 0 ? '✅' : '❌'} CDP: ${ok} OK / ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);


