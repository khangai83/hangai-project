/**
 * 🎨 CDP ШАЛГАЛТ — НҮҮР ХУУДСНЫ КАТЕГОРИЙН TILE (ЖИШИГ САЙТЫН ХЭВ, 2026-10-09)
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «category-ийн доторх зургийг иймэрхүү зураг болгоод,
 *   нүүр хуудсны category уудыг үүн шиг болгож өгөөч» + жишээ зураг ⇒
 *   tile бүр = ДУГУЙ пастел дэвсгэр дотор АНГИЛЛЫН ЗУРАГ + ДООР нь BOLD нэр
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ БАРИУЛАХ ВЭ (бодит DOM/геометр — эх кодын ГЭРЭЭ БИШ):
 *   ① 🖼 ЗУРАГ АЧААЛАГДАВ: 12 tile бүрийн `img[data-tile-img]` нь
 *      `naturalWidth > 0` (⏳ зам буруу бол 0 болж, ХООСОН дугуй харагдана ✗)
 *   ② ⭕ ДУГУЙ: badge нь `border-radius ≥ өргөн/2` ба пастел дэвсгэр нь
 *      12 нь ЯЛГААТАЙ, хуудасны `bg-gray-50`/цагаанаас ӨӨР ✓
 *   ③ 🔤 НЭР нь дугуйны ДООР ба ТӨВД (тэгшилт), текстэд emoji БАЙХГҮЙ ✓
 *   ④ 🧱 КАРТ/ХҮРЭЭ БАЙХГҮЙ: товчны дэвсгэр тунгалаг, хүрээ 0px ✓
 *   ⑤ 📐 СҮЛЖЭЭ: 1280px → 6 багана (2 мөр) · 390px → 3 багана (4 мөр) ба
 *      хэвтээ гүйлт 0 ✓
 *   ⑥ 🎯 СОНГОЛТ: панелиас буцаж («Хэсгийн нэр» дээр дараад) 12 tile гарна —
 *      `auto` tile нь `aria-selected="true"`, дугуй дээр `ring` (box-shadow),
 *      нэр нь `primary` (#2563eb); бусдын дугуй дээр `ring` БАЙХГҮЙ ✓
 *   ⑦ 🖱 HOVER: жинхэнэ хулгана дугуй дээр ороход `transform` нь ДЭЭШ (−Y) ✓
 *   ⑧ 🐍 JS: exception 0 ба hydration/`validateDOMNesting` алдаа 0 ✓
 *   ⑨ 📸 Зураг: /tmp/zar-tiles-1280.png · /tmp/zar-tiles-390.png
 *
 * ⚙️ АЖИЛЛУУЛАХ:
 *   1) `npm run build && npm run start` (http://localhost:3000)
 *   2) Chrome: --headless=new --remote-debugging-port=9222
 *   3) node scripts/cdp-tiles.mjs [BASE]
 *
 * ⚠️ Сервер байхгүй бол SKIP (exit 0) — `cdp-card-grid`-ын ИЖИЛ зарчим ✓
 */
import fs from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:3000';
/** 📐 Хүлээгдэж буй tile-ийн тоо (= `SECTIONS.length`, `test:filters` шалгана ✓) */
const TILES = 12;
/** 🎨 `primary` (#2563eb) — сонгосон нэрийн өнгө (`tailwind.config.js` ✓) */
const PRIMARY = 'rgb(37, 99, 235)';
/** 📄 Хуудасны дэвсгэр (`bg-gray-50`) — дугуй үүнээс ЯЛГААТАЙ байх ёстой ✓ */
const PAGE_BG = 'rgb(249, 250, 251)';

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

// ---------- ② Туслах функцууд ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const evalJs = async (expr) => {
  const r = await rpc('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
};
const waitFor = async (expr, ms = 12000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (await evalJs(expr)) return true; } catch { /* дахин */ }
    await sleep(400);
  }
  return false;
};
const goto = async (url, w = 1280, h = 1000) => {
  await rpc('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 });
  await rpc('Page.navigate', { url });
  await sleep(2500);
};
const shot = async (file) => {
  const r = await rpc('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log(`  📸 ${file}`);
};

/**
 * 🎨 TILE-ИЙН ГЕОМЕТР — нэг илэрхийллээр (хүснэгтэд буулгана)
 *   ⚠️ ЭНЭ PROBE нь TEMPLATE LITERAL — коммент дотор BACKTICK БИЧИХГҮЙ ✗
 */
const PROBE = `(() => {
  const tiles = [...document.querySelectorAll('.tile-grid button[role=tab]')];
  const rows = {};
  const items = tiles.map((b) => {
    const badge = b.querySelector('[data-tile-badge]');
    const img = b.querySelector('[data-tile-img]');
    const label = b.querySelector('span:last-child');
    const bb = badge.getBoundingClientRect();
    const lb = label.getBoundingClientRect();
    const cs = getComputedStyle(badge);
    const bs = getComputedStyle(b);
    const ics = getComputedStyle(img);
    const key = Math.round(bb.top);
    rows[key] = (rows[key] || 0) + 1;
    return {
      value: b.getAttribute('data-section-value'),
      text: (b.innerText || b.textContent || '').trim(),
      title: b.getAttribute('title'),
      selected: b.getAttribute('aria-selected') === 'true',
      badge: {
        w: Math.round(bb.width), h: Math.round(bb.height), radius: cs.borderRadius,
        bg: cs.backgroundColor, shadow: cs.boxShadow, transform: cs.transform,
        top: Math.round(bb.top), bottom: Math.round(bb.bottom),
        cx: Math.round((bb.left + bb.right) / 2),
        x: Math.round(bb.left + bb.width / 2), y: Math.round(bb.top + bb.height / 2),
      },
      img: {
        src: img ? img.getAttribute('src') : null,
        loaded: !!(img && img.complete && img.naturalWidth > 0),
        nat: img ? img.naturalWidth : 0,
        w: img ? Math.round(img.getBoundingClientRect().width) : 0,
        h: img ? Math.round(img.getBoundingClientRect().height) : 0,
        fit: ics.objectFit,
      },
      label: {
        top: Math.round(lb.top), cx: Math.round((lb.left + lb.right) / 2),
        color: getComputedStyle(label).color, weight: getComputedStyle(label).fontWeight,
        size: getComputedStyle(label).fontSize, h: Math.round(lb.height),
      },
      button: { bg: bs.backgroundColor, border: bs.borderTopWidth, shadow: bs.boxShadow },
    };
  });
  return {
    vw: window.innerWidth,
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    count: tiles.length,
    rows: Object.keys(rows).map((k) => rows[k]),
    items,
  };
})()`;
const probe = () => evalJs(PROBE);

/** 🖱 Бүх tile-ийн `transform` — hover-ийн өмнө/дараа харьцуулна ✓ */
const transforms = () => evalJs(`(() => {
  const out = {};
  [...document.querySelectorAll('.tile-grid button[role=tab]')].forEach((b) => {
    const badge = b.querySelector('[data-tile-badge]');
    const img = b.querySelector('[data-tile-img]');
    out[b.getAttribute('data-section-value')] = {
      badge: getComputedStyle(badge).transform,
      img: img ? getComputedStyle(img).transform : 'none',
    };
  });
  return out;
})()`);

/** 🖱 `auto` tile-ийн заагчийг ТӨВД нь аваачих (жинхэнэ хулганы хөдөлгөөн) */
const hoverTile = async (value = 'auto') => {
  const p = await evalJs(`(() => {
    const b = document.querySelector('.tile-grid button[data-section-value="${value}"]');
    if (!b) return null;
    const r = b.querySelector('[data-tile-badge]').getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  })()`);
  if (!p) return null;
  await rpc('Input.dispatchMouseEvent', { type: 'mouseMoved', x: p.x, y: p.y, button: 'none', buttons: 0 });
  await sleep(600);   // ⏳ `duration-200` шилжилт дуусах
  return p;
};
const leaveTiles = async () => {
  await rpc('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 2, y: 2, button: 'none', buttons: 0 });
  await sleep(400);
};

/** 🖱 tile дарах (drill-down нээгдэнэ) */
const clickTile = (value) => evalJs(`(() => {
  const b = document.querySelector('.tile-grid button[data-section-value="${value}"]');
  if (!b) return 'NO_TILE';
  b.click();
  return 'OK';
})()`);
/** ⬅ Панелийн ГАРЧИГ дээр дараад 12 tile руу буцах (`setSectionOpen(false)` ✓) */
const backToTiles = () => evalJs(`(() => {
  const h = document.querySelector('[data-section-panel] h1 button');
  if (!h) return 'NO_HEADING';
  h.click();
  return 'OK';
})()`);

/** `matrix(a, b, c, d, tx, ty)` → ty (пиксел); `none` → 0 */
const ty = (m) => {
  const p = String(m).match(/matrix\(([^)]+)\)/);
  if (!p) return 0;
  return Number(p[1].split(',')[5].trim());
};
/** `matrix(a, b, c, d, tx, ty)` → a (X масштаб); `none` → 1 */
const sx = (m) => {
  const p = String(m).match(/matrix\(([^)]+)\)/);
  if (!p) return 1;
  return Number(p[1].split(',')[0].trim());
};

console.log('\n🎨 CDP — нүүр хуудсны КАТЕГОРИЙН TILE (12 дугуй зураг + нэр)\n');


// ═══════════════════ 🖥 DESKTOP (1280px) ═══════════════════
await goto(`${BASE}/`, 1280, 1000);
await waitFor(`document.querySelectorAll('.tile-grid button[role=tab]').length === ${TILES}`);
// ⚠️ (83) Зураг нь `loading="lazy"` ⇒ grid гарч ирсний ДАРАА л ачаалагдана.
//    Тогтмол хүлээлт ХҮРЭЛЦЭХГҮЙ байж «natural=0» хуурамч ✗ өгдөг байв ✗ ⇒
//    одоо БОДИТ ачаалалтыг хүлээнэ (8с — ачаалагдахгүй бол ✗ ХЭВЭЭР ✓)
await waitFor(`[...document.querySelectorAll('.tile-grid img')].every((i) => i.complete && i.naturalWidth > 0)`, 8000);

const d = await probe();
check('🎨 12 tile байна (`.tile-grid button[role=tab]`)', d.count === TILES, `count=${d.count}`);
check('📐 1280px — 6 багана × 2 мөр', d.rows.join('×') === '6×6', `rows=[${d.rows.join(', ')}]`);

// ① 🖼 ЗУРАГ АЧААЛАГДАВ (⏳ зам буруу бол ХООСОН дугуй харагдана ✗)
const notLoaded = d.items.filter((t) => !t.img.loaded);
check('🖼 12 зураг БҮГД ачаалагдав (`naturalWidth > 0`)', notLoaded.length === 0,
  notLoaded.length ? notLoaded.map((t) => `${t.value}(nat=${t.img.nat})`).join(' ') : `${TILES}/${TILES} ✓`);
const badSrc = d.items.filter((t) => t.img.src !== `/categories/${t.value}.svg`);
check('🔗 Зам нь `/categories/<value>.svg`', badSrc.length === 0,
  badSrc.length ? badSrc.map((t) => `${t.value}→${t.img.src}`).join(' ') : '12/12 тохирсон ✓');
const badSize = d.items.filter((t) => !(t.img.nat >= 200 && t.img.w >= 40 && t.img.h >= 40));
check('📏 Зургийн хэмжээ 44-56px (`naturalWidth ≥ 200`)', badSize.length === 0,
  badSize.length ? badSize.map((t) => `${t.value}(${t.img.w}×${t.img.h})`).join(' ') : `w=${d.items[0].img.w}px ✓`);
const badFit = d.items.filter((t) => t.img.fit !== 'contain');
check('🪟 `object-fit: contain` (зураг хэт том/сунасан БИШ ✓)', badFit.length === 0,
  badFit.length ? [...new Set(badFit.map((t) => t.img.fit))].join(',') : 'contain ✓');

// ② ⭕ ПАСТЕЛ ДУГУЙ
const notRound = d.items.filter((t) => !(parseFloat(t.badge.radius) >= t.badge.w / 2 - 2));
check('⭕ Дугуй (`border-radius ≥ өргөн/2`)', notRound.length === 0,
  notRound.length ? notRound.map((t) => `${t.value}(${t.badge.radius})`).join(' ') : `${d.items[0].badge.radius} ✓`);
const sizes = d.items.map((t) => t.badge.w);
check('📐 Дугуйн өргөн ~80px (sm) ба 12 нь НЭГ төрлийн',
  Math.min(...sizes) >= 76 && Math.max(...sizes) <= 88, `${Math.min(...sizes)}-${Math.max(...sizes)}px`);
const bgSet = new Set(d.items.map((t) => t.badge.bg));
check('🎨 12 дугуй 12 ӨӨР өнгөтэй (пастел `tileBg`)', bgSet.size === TILES, `unique=${bgSet.size}`);
check('🌈 Дэвсгэр нь цагаан/`bg-gray-50` БИШ (пастел харагдана ✓)',
  !bgSet.has('rgb(255, 255, 255)') && !bgSet.has(PAGE_BG) && !bgSet.has('rgba(0, 0, 0, 0)'),
  `${[...bgSet].slice(0, 3).join(' ')} …`);

// ③ 🔤 НЭР (зургийн ДООР, төвд, emoji БАЙХГҮЙ)
const notBelow = d.items.filter((t) => !(t.label.top >= t.badge.bottom - 2));
check('🔤 Нэр нь дугуйны ДООР (зургийн дотор БИШ)', notBelow.length === 0,
  notBelow.length ? notBelow.map((t) => `${t.value}(Δ=${t.label.top - t.badge.bottom})`).join(' ') : '12/12 ✓');
const maxOff = Math.max(...d.items.map((t) => Math.abs(t.label.cx - t.badge.cx)));
check('⚖️ Нэр нь дугуйтай ТӨВД (|Δ| ≤ 12px)', maxOff <= 12, `max=${maxOff}px`);
const emoji = d.items.filter((t) => /[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{FE0F}]/u.test(t.text));
check('🚫 tile-ийн текстэд emoji БАЙХГҮЙ (⏳ emoji байв ✗)', emoji.length === 0,
  emoji.length ? emoji.map((t) => `${t.value}:${t.text}`).join(' ') : '0 ✓');
const textBad = d.items.filter((t) => !t.text.length || t.text !== t.title);
check('🏷 Текст = `title` (ЗӨВХӨН нэр, тоо/тэмдэг нэмэгдээгүй)', textBad.length === 0,
  textBad.length ? textBad.map((t) => `${t.value}«${t.text}»≠«${t.title}»`).join(' ') : '12/12 ✓');
const notBold = d.items.filter((t) => Number(t.label.weight) < 600);
check('🅱 Нэр нь BOLD (`font-weight ≥ 600`)', notBold.length === 0,
  `weight=${[...new Set(d.items.map((t) => t.label.weight))].join(',')}`);

// ④ 🧱 КАРТ/ХҮРЭЭ/СҮҮДЭР БАЙХГҮЙ (жишээ зурагт карт байхгүй ✓)
const cardish = d.items.filter((t) => t.button.border !== '0px' || t.button.shadow !== 'none'
  || !/rgba\(0, 0, 0, 0\)|rgb\(255, 255, 255\)/.test(t.button.bg));
check('🧱 КАРТ/ХҮРЭЭ/СҮҮДЭР БАЙХГҮЙ (товч тунгалаг, border 0, shadow none)', cardish.length === 0,
  cardish.length ? cardish.map((t) => `${t.value}:${t.button.border}/${t.button.bg}`).join(' ') : '0 ✓');

// ⑤ 📐 ХЭВТЭЭ ГҮЙЛТ
check('📐 Хэвтээ гүйлт БАЙХГҮЙ (1280px)', d.overflow <= 0, `overflow=${d.overflow}`);
await shot('/tmp/zar-tiles-1280.png');



// ═══════════════════ 🖱 HOVER (`group-hover`) ═══════════════════
const tr0 = await transforms();
const pos = await hoverTile('auto');
check('🖱 `Автомашин` tile дээр хулгана оров', !!pos, pos ? `(${pos.x}, ${pos.y})` : 'tile алга ✗');
const tr1 = await transforms();
check('⬆️ HOVER — дугуй ДЭЭШ хөдөлсөн (`-translate-y-1` ≈ −4px)',
  ty(tr1.auto.badge) <= -2 && ty(tr1.auto.badge) < ty(tr0.auto.badge), `ty=${ty(tr1.auto.badge)}px`);
check('🔍 HOVER — зураг бага зэрэг ТОМОРСОН (`scale-105`)', sx(tr1.auto.img) >= 1.03, `scale=${sx(tr1.auto.img)}`);
const hoverOther = Object.keys(tr1).filter((k) => k !== 'auto' && ty(tr1[k].badge) !== 0);
check('🚫 HOVER нь ЗӨВХӨН тэр tile-д (бусдын дугуй хөдлөөгүй)', hoverOther.length === 0, hoverOther.join(',') || '0 ✓');
await leaveTiles();

// ═══════════════════ 🎯 DRILL-DOWN ба СОНГОЛТ ═══════════════════
check('🖱 `Автомашин` tile дардагдав', (await clickTile('auto')) === 'OK');
await waitFor(`document.querySelectorAll('.tile-grid button[role=tab]').length === 0`);
const subs = await evalJs(`document.querySelectorAll('[data-section-panel] button[role=tab]').length`);
check('📂 Хэсэг нээгдэв — tile АЛГА, дэд төрлүүд ГАРНА (>0)', subs > 0, `subs=${subs}`);
// ⚠️ (83) URL (`?section=auto`) нь grid-ийн unmount-аас хэдхэн ms ХОЙШ
//    шинэчлэгддэг ⇒ шууд уншвал хуурамч ✗ өгдөг байв ✗ ⇒ эхлээд хүлээнэ ✓
//    (⛔ хэвээр `?type=…` болбол хүлээлт дуусаж, шалгалт ✗ ГАРСААР байна ✓)
await waitFor(`location.search.includes('section=auto')`, 6000);
const search = await evalJs('location.search');
check('🔗 URL нь `?section=auto` ХЭВЭЭР (CDP гэрээ хөндөгдөөгүй ✓)', search.includes('section=auto'), search);
check('⬅ Панелийн ГАРЧИГ дарж 12 tile руу буцав', (await backToTiles()) === 'OK');
await waitFor(`document.querySelectorAll('.tile-grid button[role=tab]').length === ${TILES}`);
const sel = await probe();
const on = sel.items.filter((t) => t.selected);
check('🎯 ЯГ 1 tile сонгогдсон (`aria-selected`)', on.length === 1 && on[0].value === 'auto',
  `on=[${on.map((t) => t.value).join(',')}]`);
check('💍 Сонгосон дугуй дээр `ring` (box-shadow ≠ none)', on.length === 1 && on[0].badge.shadow !== 'none',
  on.length === 1 ? on[0].badge.shadow.slice(0, 46) : '');
check('💙 Сонгосон нэр нь `primary` (#2563eb)', on.length === 1 && on[0].label.color === PRIMARY,
  on.length === 1 ? on[0].label.color : '');
const noRing = sel.items.filter((t) => !t.selected && t.badge.shadow !== 'none');

// ═══════════════════ 📱 МОБАЙЛ (390px) ═══════════════════
await goto(`${BASE}/`, 390, 900);
await waitFor(`document.querySelectorAll('.tile-grid button[role=tab]').length === ${TILES}`);
const m = await probe();
check('📱 390px — 12 tile байна', m.count === TILES, `count=${m.count}`);
check('📱 390px — 3 багана × 4 мөр', m.rows.join('×') === '3×3×3×3', `rows=[${m.rows.join(', ')}]`);
const mBad = m.items.filter((t) => !t.img.loaded);
check('📱 Мобайл дээр ч 12 зураг БҮГД ачаалагдав', mBad.length === 0,
  mBad.length ? mBad.map((t) => t.value).join(',') : `${TILES}/${TILES} ✓`);
const mSizes = m.items.map((t) => t.badge.w);
check('📐 Мобайл дугуй ~64px (sm-ээс доош жижиг)', Math.min(...mSizes) >= 58 && Math.max(...mSizes) <= 72,
  `${Math.min(...mSizes)}-${Math.max(...mSizes)}px`);
const mBelow = m.items.filter((t) => !(t.label.top >= t.badge.bottom - 2));
check('🔤 Мобайл дээр нэр нь мөн ДООР', mBelow.length === 0, mBelow.map((t) => t.value).join(',') || '12/12 ✓');
check('📐 Хэвтээ гүйлт БАЙХГҮЙ (390px)', m.overflow <= 0, `overflow=${m.overflow}`);
await shot('/tmp/zar-tiles-390.png');

// ═══════════════════ 🐍 JS АЛДАА ═══════════════════
const realExc = exceptions.filter((e) => !/ResizeObserver|favicon/.test(String(e)));
check('🐍 JS exception 0', realExc.length === 0, realExc.slice(0, 2).join(' | ') || '0 ✓');
const hydration = consoleErrors.filter((e) => /hydrat|validateDOMNesting|did not match|Warning:/.test(e));
check('🐍 Hydration / `validateDOMNesting` алдаа 0', hydration.length === 0, hydration.slice(0, 2).join(' | ') || '0 ✓');

console.log(`\n${fail === 0 ? '✅ БҮГД ОК' : '❌ АЛДАА'} — ${ok} ✓ / ${fail} ✗\n`);
await hardExit(fail === 0 ? 0 : 1);

check('🧯 Бусдын дугуй дээр `ring` БАЙХГҮЙ (11)', noRing.length === 0, noRing.map((t) => t.value).join(',') || '0 ✓');
check('🎨 Сонголт нь бусад дугуйны ЗУРГИЙГ/ӨНГИЙГ ХӨНДӨӨГҮЙ (12 өнгө ✓)',
  new Set(sel.items.map((t) => t.badge.bg)).size === TILES);
check('📐 Хэвтээ гүйлт БАЙХГҮЙ (сонголттой хэв)', sel.overflow <= 0, `overflow=${sel.overflow}`);
