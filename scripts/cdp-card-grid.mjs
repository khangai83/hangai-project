/**
 * 📇🧱 CDP ШАЛГАЛТ — ЗАРЫН КАРТ (БОСОО) ба ЖАГСААЛТЫН БАГАНАТ GRID
 *   (2026-10-09, өөрчлөлт: карт хэвтээнээс БОСОО хэв рүү шилжив)
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «зарыг харуулж байгаа картын загварыг дуурааж хийнэ үү»
 *   + **жишиг сайт**-ын нүүр ба зарын дэлгэрэнгүй дээрх картууд (зураг дээрээ,
 *   доор нь үнэ, 2 мөр гарчиг, доод мета мөр).
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ БАРИУЛАХ ВЭ (бодит DOM/геометр — эх кодын ГЭРЭЭ БИШ):
 *   ① 🧱 НҮҮР (/) 1280px: картууд НЭГ МӨРӨНД ≥3 (сайдбар 280px ⇒ үр дүн
 *      ~928px) · өргөн нь БҮГД ИЖИЛ (±2px) · хэвтээ гүйлт 0
 *   ② 🖼 ЗУРАГ нь ДЭЭРЭЭ: картын өргөнийг БҮТЭН дүүргэж (`img.w ≈ card.w`),
 *      харьцаа нь 4:3 (`img.h / img.w` = 0.75 ±0.05), мэдээллийн блок
 *      зургийн ДООР (зургийн доод ≤ агуулгын эхлэл +2px) ✓
 *   ③ ❤️ нь ҮНИЙ МӨРӨНД: зүрхний төв нь үнийн мөрийн өндөрт (±6px) ба
 *      картын БАРУУН ХАГАСТ (баруун захад тогтсон `ml-auto`) ✓
 *   ④ 📱 390px: НЭГ БАГАНА (2 дахь карт нь 1-ийнхээ ЗАГИНАА доор) ба
 *      хэвтээ гүйлт 0 (`scrollWidth ≤ innerWidth + 1`) ✓
 *   ⑤ 🗂 /favorites: картууд БАГАНАТ (≥2 нэг мөрөнд, 1280px), «Хасах»
 *      товч нь картын ХҮРЭЭ ДОТОР (overlay) байрлана ✓
 *   ⑥ 🐍 JS: Leaflet-ээс БУСАД exception 0 ба hydration/
 *      `validateDOMNesting` алдаа 0 ✓
 *   ⑦ 📸 Зураг: /tmp/card-grid-*.png (нүүр 1280 · нүүр 390 · favorites 1280)
 *
 * ⚙️ АЖИЛЛУУЛАХ:
 *   1) `npm run build && npm run start` (http://localhost:3000)
 *   2) Chrome: --headless=new --remote-debugging-port=9222
 *   3) node scripts/cdp-card-grid.mjs [BASE]
 *
 * ⚠️ Сервер байхгүй бол SKIP (exit 0) — `cdp-brand`-ын ИЖИЛ зарчим ✓
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
 * 🃏 КАРТЫН ГЕОМЕТР — нэг илэрхийллээр (хүснэгтэд буулгана)
 *   ⚠️ Зургийн блок = 1-р хүүхэд, мэдээлэл = 2-р хүүхэд (ListingCard-ийн бүтэц)
 */
const PROBE = `(() => {
  const R = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
  const cards = [...document.querySelectorAll('a[data-listing-card]')];
  return {
    vw: window.innerWidth,
    scrollW: document.documentElement.scrollWidth,
    count: cards.length,
    cards: cards.slice(0, 8).map((c) => {
      const imgWrap = c.children[0], content = c.children[1];
      const img = imgWrap ? imgWrap.querySelector('img') : null;
      const price = c.querySelector('[class*="text-[22px]"]');
      const heart = c.querySelector('button[aria-label]');
      const title = c.querySelector('[class*="line-clamp-2"]');
      const badge = c.querySelector('[class*="bottom-2"][class*="right-2"]');
      return {
        box: R(c),
        img: imgWrap ? R(imgWrap) : null,
        imgTag: !!img,
        content: content ? R(content) : null,
        price: price ? R(price) : null,
        heart: heart ? R(heart) : null,
        heartText: heart ? (heart.innerText || '').trim() : '',
        title: title ? R(title) : null,
        countBadge: badge ? R(badge) : null,
      };
    }),
  };
})()`;

// ---------- ② НҮҮР (/) — 1280px ----------
console.log('\n🧪 ЗАРЫН КАРТ (босоо) ба GRID — бодит Chrome\n');
await goto(`${BASE}/`, 1280, 900);
await waitFor(`document.querySelectorAll('a[data-listing-card]').length > 0`);
const home = await evalJs(PROBE);
check('① Нүүр 1280px: карт олдлоо', home.count > 0, `${home.count} карт`);
check('①b Хэвтээ гүйлт 0', home.scrollW <= home.vw + 1, `scrollW ${home.scrollW} / vw ${home.vw}`);
const firstY = home.cards[0]?.box.y ?? 0;
const row1 = home.cards.filter((c) => Math.abs(c.box.y - firstY) <= 4);
check('①c Эхний мөрөнд ≥3 карт (баганат grid)', row1.length >= 3, `${row1.length} карт (y ${firstY})`);
const widths = home.cards.map((c) => c.box.w);
check('①d Бүх картын өргөн ИЖИЛ (±2px)', Math.max(...widths) - Math.min(...widths) <= 2,
  `${Math.min(...widths)}…${Math.max(...widths)}px`);

const c0 = home.cards[0] || {};
const ratio = c0.img ? c0.img.h / c0.img.w : 0;
check('② Зураг нь картын өргөнийг ДҮҮРГЭНЭ', !!c0.img && Math.abs(c0.img.w - c0.box.w) <= 2,
  `img ${c0.img?.w} / card ${c0.box.w}px`);
check('②b Зургийн харьцаа 4:3 (0.70–0.80)', !!c0.img && ratio >= 0.70 && ratio <= 0.80,
  c0.img ? `${c0.img.w}×${c0.img.h} = ${ratio.toFixed(2)}` : '—');
check('②c Мэдээллийн блок зургийн ДООР', !!c0.img && !!c0.content && c0.content.y >= c0.img.b - 2,
  `img.b ${c0.img?.b} ≤ content.y ${c0.content?.y}`);
check('②d Агуулга картын хүрээнээс ГАРАХГҮЙ', !!c0.content && c0.content.b <= c0.box.b + 2,
  `content.b ${c0.content?.b} ≤ card.b ${c0.box.b}`);

check('③ ❤️ нь ҮНИЙ МӨРӨНД (ижил өндөр ±6px)', !!c0.heart && !!c0.price && Math.abs(c0.heart.y - c0.price.y) <= 6,
  `heart.y ${c0.heart?.y} / price.y ${c0.price?.y}`);
check('③b ❤️ нь картын БАРУУН захад (`ml-auto`)', !!c0.heart && c0.heart.x > c0.box.x + c0.box.w / 2,
  `heart.x ${c0.heart?.x} > ${Math.round(c0.box.x + c0.box.w / 2)}`);
/** ⚠️ Emoji-гийн variation selector (U+FE0F) нь regex-ийг эвддэг тул цэвэрлэнэ */
const heartClean = (c0.heartText || '').replace(/[\uFE0E\uFE0F]/g, '');
check('③c ❤️/🤍 товч нь тоотой («❤️ N»/«🤍 N»)', /^[❤🤍]\s*\d+$/u.test(heartClean), c0.heartText);
check('③d Гарчиг нь үнийн мөрийн ДООР', !!c0.title && c0.title.y >= (c0.price?.y ?? 0), `title.y ${c0.title?.y}`);
if (c0.countBadge) {
  check('③e 🖼 зургийн тоо нь БАРУУН ДООД буланд',
    c0.countBadge.b <= c0.img.b + 2 && c0.countBadge.x > c0.img.x + c0.img.w / 2,
    `badge.x ${c0.countBadge.x}, badge.b ${c0.countBadge.b}`);
} else {
  console.log('  ℹ️ 🖼 зургийн тоо (1/N) — эхний карт 1 зурагтай тул badge байхгүй ✓');
}
await shot('/tmp/card-grid-home-1280.png');
/** ❤️ /favorites-ийг ч шалгахын тулд эхний 4 зарын id-г тэмдэглэж авна */
const favIds = await evalJs(`[...document.querySelectorAll('a[data-listing-card]')].slice(0, 4)
  .map((a) => (a.getAttribute('href') || '').split('/').pop()).filter(Boolean)`);


// ---------- ③ НҮҮР — 390px (мобайл) ----------
await goto(`${BASE}/`, 390, 900);
await waitFor(`document.querySelectorAll('a[data-listing-card]').length > 0`);
const mob = await evalJs(PROBE);
check('④ Мобайл 390px: хэвтээ гүйлт 0', mob.scrollW <= mob.vw + 1, `scrollW ${mob.scrollW} / vw ${mob.vw}`);
const m0 = mob.cards[0] || {};
const m1 = mob.cards[1];
check('④b Мобайл: НЭГ багана (2 дахь карт нь 1-ийнхээ ЗАГИНАА доор)', !!m1
  && Math.abs(m1.box.x - m0.box.x) <= 2 && m1.box.y >= m0.box.b - 2,
  m1 ? `#1 (${m0.box.x},${m0.box.y}) → #2 (${m1.box.x},${m1.box.y})` : '1 карт');
check('④c Мобайл: зураг бүтэн өргөн + 4:3', !!m0.img
  && Math.abs(m0.img.w - m0.box.w) <= 2 && m0.img.h / m0.img.w >= 0.70 && m0.img.h / m0.img.w <= 0.80,
  m0.img ? `${m0.img.w}×${m0.img.h}` : '—');
check('④d Мобайл: ❤️ нь үнийн мөрөнд', !!m0.heart && !!m0.price && Math.abs(m0.heart.y - m0.price.y) <= 6,
  `heart.y ${m0.heart?.y} / price.y ${m0.price?.y}`);
await shot('/tmp/card-grid-home-390.png');

// ---------- ④ /favorites — 1280px ----------
// 🗂 localStorage-д 4 зарыг «таалагдсан» болгоно (FavoritesClient нь тэндээс уншина)
await evalJs(`localStorage.setItem('zarmn_favorites_v1', JSON.stringify(${JSON.stringify(favIds)}))`);
await goto(`${BASE}/favorites`, 1280, 900);
await new Promise((r) => setTimeout(r, 1500));
const favCount = await evalJs(`document.querySelectorAll('a[data-listing-card]').length`);
if (favCount === 0) {
  console.log('  ℹ️ /favorites дээр карт байхгүй (localStorage хоосон) — ⑤ алгасна ✓');
} else {
  const fav = await evalJs(PROBE);
  const fRow = fav.cards.filter((c) => Math.abs(c.box.y - fav.cards[0].box.y) <= 4);
  check('⑤ /favorites: баганат grid (≥2 нэг мөрөнд)', fRow.length >= 2, `${fRow.length} карт`);
  check('⑤b /favorites: хэвтээ гүйлт 0', fav.scrollW <= fav.vw + 1, `scrollW ${fav.scrollW}`);
  const btn = await evalJs(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.innerText || '').trim() === 'Хасах');
    if (!b) return null;
    const wrap = b.closest('div.relative');
    const card = wrap ? wrap.querySelector('a[data-listing-card]') : null;
    if (!card) return null;
    const rb = b.getBoundingClientRect(), rc = card.getBoundingClientRect();
    return { inside: rb.left >= rc.left - 2 && rb.right <= rc.right + 2 && rb.top >= rc.top - 2 && rb.bottom <= rc.bottom + 2,
             x: Math.round(rb.left), y: Math.round(rb.top) };
  })()`);
  check('⑤c «Хасах» товч нь картын ХҮРЭЭ ДОТОР (overlay)', !!btn && btn.inside,
    btn ? `x ${btn.x}, y ${btn.y}` : 'товч алга');
  await shot('/tmp/card-grid-favorites-1280.png');
}

// ---------- ⑤ 🐍 JS алдаа ----------
const leaflet = (s) => /leaflet/i.test(s);
const badExceptions = exceptions.filter((e) => !leaflet(e));
const badConsole = consoleErrors.filter((e) => !leaflet(e));
check('⑥ Leaflet-ээс БУСАД exception 0', badExceptions.length === 0, badExceptions.slice(0, 2).join(' | '));
check('⑥b hydration/`validateDOMNesting` алдаа 0', badConsole.length === 0, badConsole.slice(0, 2).join(' | '));

console.log(`\n${fail === 0 ? '✅' : '❌'} CDP: ${ok} OK / ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);

