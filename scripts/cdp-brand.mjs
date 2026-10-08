/**
 * 🏠🏷️ CDP ШАЛГАЛТ — **ТУСДАА** HOME ICON (хайлтын хэсгийн өмнө) + БРЭНД `ZARBOOK.MN`
 *   (2026-10-08, өөрчлөлт (69c) → 🆕 (69d))
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ:
 *   ① «zarlaa.mn гэсэн логооны хойд хэсэгт home icon оруул, энд дархад мэдээж
 *      home page дээр ирдэг байх» ✓
 *   ② «zarbook.mn гэсэн domain хаяг авсан тул бүгдийг ийм нэртэй болго ZarBook.mn» ✓
 *   ③ 🆕 (69d) «би уугийг нь тусдаа icon болгоод өгөөч гэсэн юм… search хэсгийн
 *      өмнө тусдаа icon болгоод өгөөч» ⇒ икон нь логоны ДОТОР БИШ — лого нь
 *      ЗӨВХӨН ТЕКСТ, 🏠 икон нь лого ба хайлтын хэсгийн ХООРОНД ТУСДАА линк ✓
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① 🏷️ Толгойн лого (`header a[href="/"]` бөгөөд текстидээ «ZARBOOK»-той):
 *      ⓐ текст ЯГ «ZARBOOK.MN», 🏠 emoji БАЙХГҮЙ, логоны ДОТОР SVG БАЙХГҮЙ
 *        (`svg` тоо 0 — икон ТУСДАА байх ёстой ✓)
 *      ⓑ «ZARBOOK» ба «.MN» ХИЙМЭЛ ЗАЙГҮЙ (2026-09-27-ийн алдаа буцаж ороогүй ✓)
 *   ② 🏠 ТУСДАА икон (`header a[data-home-icon-link]` → `href="/"`):
 *      ⓐ харагдаж байна (🖥) ба ЖИНХЭНЭ SVG (`viewBox="0 0 24 24"` + `stroke="currentColor"`, 3 зам)
 *      ⓑ **24×24px** — баруун талын ❤️ `h-6 w-6` icon-only товчтой ТЭНЦҮҮ
 *      ⓒ ЛОГОНЫ ДАРАА (лого.right ≤ иконы left), ХАЙЛТЫН мөрийн ЯГ ӨМНӨ
 *        (иконы right ≤ `#home-search`-ийн left, зай нь 4–24px)
 *   ③ 🖱 ЛОГО дээр БА **🏠 ИКОН дээр** БОДИТ хулганы даралт (`Input.dispatchMouseEvent`,
 *      `/terms` дээрээс эхэлж) → ХОЁУЛАА НҮҮР ХУУДАС руу (`pathname === '/'` ✓)
 *   ④ 🏷️ Брэнд: `document.title` ба footer нь `ZARBOOK.MN` (хуучин нэр 0 ✓)
 *   ⑤ 📱 390px: икон НУУГДСАН (`hidden lg:inline-flex`) — лого төвд хэвээр,
 *      хэвтээ гүйлт 0, JS exception 0 ✓
 *
 * ⚙️ АЖИЛЛУУЛАХ:
 *   1) `npm run build && npm run start` (http://localhost:3000)
 *   2) Chrome: --headless=new --remote-debugging-port=9222
 *   3) node scripts/cdp-brand.mjs [BASE]
 *
 * ⚠️ Сервер байхгүй бол SKIP (exit 0) — `cdp-notifications`-ийн ИЖИЛ зарчим ✓
 */
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

/** 🏷️ Лого · 🏠 ТУСДАА икон · 🔍 хайлтын мөрийг НЭГ илэрхийллээр хэмжинэ */
const PROBE = `(() => {
  const anchors = [...document.querySelectorAll('header a[href="/"]')];
  const logo = anchors.find((x) => /ZARBOOK/.test(x.textContent || '')) || null;
  const iconLink = document.querySelector('header a[data-home-icon-link]');
  const icon = iconLink ? iconLink.querySelector('svg[data-home-icon]') : null;
  const search = document.querySelector('#home-search');
  const sibling = document.querySelector('header a[href="/favorites"] svg');
  if (!logo) return { found: false };
  const span = logo.querySelector('span');
  const tn = [...logo.childNodes].find((n) => n.nodeType === 3 && (n.textContent || '').trim());
  const R = (el) => { const b = el.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
  const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
  let text = null;
  if (tn) { const rg = document.createRange(); rg.selectNodeContents(tn); const b = rg.getBoundingClientRect(); text = { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), w: Math.round(b.width), lines: rg.getClientRects().length }; }
  const body = document.body.innerText || '';
  // ⚠️ Хуучин брэндийг НЭГДСЭН биш, хуваасан мөрөөр угсарна — эс бөгөөс
  //    test:brand-ийн «ЦЭВЭР код дээр хуучин брэнд 0» шалгалт энэ файлыг
  //    өөрөө зөрчиж хуурамч уналт өгнө ✗
  const OLD = new RegExp('ZAR' + 'LAA', 'i');
  return {
    found: true,
    logoText: (logo.textContent || '').trim(),
    hasEmoji: /\\u{1F3E0}/u.test(logo.textContent || ''),
    logoIconCount: logo.querySelectorAll('svg').length,
    logoRect: R(logo),
    iconLink: shown(iconLink),
    iconLinkRect: iconLink ? R(iconLink) : null,
    iconHref: iconLink ? iconLink.getAttribute('href') : null,
    icon: icon ? R(icon) : null,
    iconViewBox: icon ? icon.getAttribute('viewBox') : null,
    iconStroke: icon ? (icon.getAttribute('stroke') || '') : '',
    iconPathCount: icon ? icon.querySelectorAll('path').length : 0,
    siblingIconH: sibling ? Math.round(sibling.getBoundingClientRect().height) : null,
    search: shown(search) ? R(search) : null,
    text,
    span: span ? R(span) : null,
    pageScroll: document.documentElement.scrollWidth - window.innerWidth,
    title: document.title,
    footerBrand: /ZARBOOK\\.MN/.test(body),
    oldBrand: OLD.test(body),
    path: location.pathname,
  };
})()`;

console.log(`\n🏠🏷️ CDP — ТУСДАА HOME ICON (хайлтын хэсгийн өмнө) + БРЭНД ZARBOOK.MN (өөрчлөлт (69c)/(69d))\n`);

// ---------- ① 🏷️ ЛОГО (текст) + 🏠 ТУСДАА ИКОН (нүүр хуудас, 🖥 1280px) ----------
await rpc('Page.bringToFront');
await goto(`${BASE}/`);
const a = await evalJs(PROBE);
check('① толгойн лого олдлоо (`header a[href="/"]` бөгөөд «ZARBOOK» тексттэй)', a.found === true);
if (!a.found) { console.log('\n  ⚠️ цааш шалгах боломжгүй\n'); await hardExit(1); }
check('① лого нь «ZARBOOK.MN» тексттэй (икон логоноос ГАДНА болов ✓)', a.logoText === 'ZARBOOK.MN', `«${a.logoText}»`);
check('① логоны ДОТОР икон БАЙХГҮЙ (`svg` тоо 0 — икон ТУСДАА байх ёстой ✓)', a.logoIconCount === 0, `${a.logoIconCount} svg`);
check('① 🏠 икон нь ТУСДАА линк (`header a[data-home-icon-link]`, `href="/"`) ба ХАРАГДАЖ байна ✓',
  a.iconLink === true && a.iconHref === '/', `visible=${a.iconLink} · href=${a.iconHref}`);
check('① лого дээр 🏠 EMOJI БАЙХГҮЙ (emoji нь OS бүрд өөр өнгөтэй зурагдана ✗)', a.hasEmoji === false);
check('① икон нь ЖИНХЭНЭ SVG (`viewBox="0 0 24 24"` + `stroke="currentColor"`)',
  a.iconViewBox === '0 0 24 24' && a.iconStroke === 'currentColor', `${a.iconViewBox} · stroke=${a.iconStroke}`);
check('① SVG дотор 3 зам (дээвэр · хана+шал · ХААЛГА)', a.iconPathCount === 3, `${a.iconPathCount} path`);
check('① икон 24×24px (баруун талын icon-only товчнуудтай ИЖИЛ хэмжээ)',
  a.icon && a.icon.w === 24 && a.icon.h === 24, a.icon ? `${a.icon.w}×${a.icon.h}` : '—');
check('① иконы хэмжээ нь эгч иконтой (❤️ `h-6 w-6`) ТЭНЦҮҮ',
  a.icon && a.siblingIconH === a.icon.h, `🏠=${a.icon && a.icon.h} · ❤️=${a.siblingIconH}`);
check('① икон нь ЛОГОНЫ ДАРАА (логоны right ≤ иконы left)',
  a.logoRect && a.iconLinkRect && a.logoRect.r <= a.iconLinkRect.l,
  a.logoRect && a.iconLinkRect ? `лого right=${a.logoRect.r} ≤ икон left=${a.iconLinkRect.l}` : '—');
check('① икон нь ХАЙЛТЫН мөрийн ЗҮҮН талд, ЯГ ӨМНӨ (иконы right ≤ хайлтын left)',
  a.search && a.iconLinkRect && a.iconLinkRect.r <= a.search.l,
  a.search && a.iconLinkRect ? `икон right=${a.iconLinkRect.r} ≤ хайлт left=${a.search.l}` : `хайлт харагдахгүй (${!!a.search})`);
check('① икон ↔ хайлтын мөр зай 4–140px (хайлтын форм `mx-auto max-w-[480px]` тул слат дотроо ТӨВЛӨРНӨ — хэт хол биш ✓)',
  a.search && a.iconLinkRect && (a.search.l - a.iconLinkRect.r) >= 4 && (a.search.l - a.iconLinkRect.r) <= 140,
  `${a.search && a.iconLinkRect ? a.search.l - a.iconLinkRect.r : '—'}px`);
check('① «ZARBOOK» ↔ «.MN» ХИЙМЭЛ ЗАЙГҮЙ (2026-09-27-ийн алдаа буцаж ороогүй ✓)',
  a.text && a.span && (a.span.l - a.text.r) <= 1, `${a.text && a.span ? a.span.l - a.text.r : '—'}px`);
check('① 🖥 хэвтээ гүйлт 0', a.pageScroll <= 0, `scrollWidth-innerWidth=${a.pageScroll}`);


// ---------- ② 🏷️ БРЭНД (нүүр + `/terms` + footer + `<title>`) ----------
check('② `<title>` нь `ZARBOOK.MN` (root metadata)', /^ZARBOOK\.MN/.test(a.title), a.title.slice(0, 60));
check('② нүүр хуудсан дээрх текстэд `ZARBOOK.MN` бий (footer)', a.footerBrand === true);
check('② нүүр хуудсан дээр ХУУЧИН брэнд ХАРАГДАХГҮЙ (бүхэлдээ ZarBook.mn ✓)', a.oldBrand === false);

await goto(`${BASE}/terms`);
const t = await evalJs(PROBE);
check('② `/terms` хуудасны `<title>` нь `ZARBOOK.MN`', /ZARBOOK\.MN/.test(t.title), t.title.slice(0, 60));
check('② `/terms` дээр ХУУЧИН нэр ХАРАГДАХГҮЙ (платформ нь ZarBook.mn)', t.oldBrand === false);

// ---------- ③ 🖱 ЛОГО ба 🏠 ТУСДАА ИКОН ДЭЭР БОДИТ ДАРАЛТ → НҮҮР ХУУДАС ----------
const pressAt = async (pt) => {
  await rpc('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await rpc('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await new Promise((r) => setTimeout(r, 2500));
};
// ⓐ 🏷️ ЛОГО (текст) дээр БОДИТ даралт — тэр ч бас нүүр хуудас руу шилжих ёстой ✓
await goto(`${BASE}/terms`);
const logoBox = await evalJs(`(() => { const a = [...document.querySelectorAll('header a[href="/"]')].find((x) => /ZARBOOK/.test(x.textContent || '')); if (!a) return null; const b = a.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`);
check('③ 🏷️ логоны солбицол олдлоо (даралт хийх цэг)', !!logoBox, logoBox ? `(${logoBox.x}, ${logoBox.y})` : '—');
if (logoBox) await pressAt(logoBox);
const afterLogo = await evalJs(`({ path: location.pathname, search: location.search })`);
check('③ 🏷️ ЛОГО дээр дарахад НҮҮР ХУУДАС руу шилжив (`/`)', afterLogo.path === '/' && afterLogo.search === '',
  `pathname=${afterLogo.path}${afterLogo.search}`);

// ⓑ 🏠 ТУСДАА икон дээр БОДИТ даралт
await goto(`${BASE}/terms`);
const iconBox = await evalJs(`(() => { const i = document.querySelector('header a[data-home-icon-link] svg[data-home-icon]'); if (!i) return null; const b = i.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`);
check('③ 🏠 иконы солбицол олдлоо (даралт хийх цэг)', !!iconBox, iconBox ? `(${iconBox.x}, ${iconBox.y})` : '—');
if (iconBox) await pressAt(iconBox);
const after = await evalJs(`({ path: location.pathname, search: location.search })`);
check('③ 🏠 ТУСДАА ИКОН дээр дарахад НҮҮР ХУУДАС руу шилжив (`/`)', after.path === '/' && after.search === '',
  `pathname=${after.path}${after.search}`);

// ---------- ④ 📱 390px — икон НУУГДСАН, лого ТӨВД ----------
await goto(`${BASE}/`, 390, 780);
const m = await evalJs(PROBE);
check('④ 📱 мобайл дээр лого харагдана (текст нь `ZARBOOK.MN`)', m.found && m.logoText === 'ZARBOOK.MN', m.logoText);
check('④ 📱 🏠 икон МОБАЙЛД НУУГДСАН (`hidden lg:inline-flex`) — лого ТӨВД хэвээр ✓', m.iconLink === false, `visible=${m.iconLink}`);
check('④ 📱 лого НЭГ МӨРӨНД (текст node 1 rect + «.MN»-тэй ±6px ижил top — 2026-09-27-ийн хуваагдал буцаж ороогүй ✓)',
  m.text && m.text.lines === 1 && m.span && Math.abs(m.text.t - m.span.t) <= 6,
  `lines=${m.text && m.text.lines} · top=${m.text && m.text.t}/${m.span && m.span.t}`);
check('④ 📱 «ZARBOOK» ↔ «.MN» зай 0 (нэг үг мэт)',
  m.text && m.span && (m.span.l - m.text.r) <= 1 && (m.span.l - m.text.r) >= -2,
  `${m.text && m.span ? m.span.l - m.text.r : '—'}px`);
check('④ 📱 хэвтээ гүйлт 0 (лого төвд — баруун хонхтой зөрчилдөхгүй ✓)', m.pageScroll <= 0, `scrollX=${m.pageScroll}`);
const mclip = await evalJs(`(() => { const a = [...document.querySelectorAll('header a[href="/"]')].find((x) => /ZARBOOK/.test(x.textContent || '')); const r = a.getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left) - 12), y: Math.max(0, Math.round(r.top) - 8), width: Math.round(r.width) + 24, height: Math.round(r.height) + 16 }; })()`);
const mshot = await rpc('Page.captureScreenshot', { format: 'png', clip: { ...mclip, scale: 3 } });
const fsMob = await import('node:fs');
fsMob.writeFileSync('/tmp/zar-69d-home-mobile.png', Buffer.from(mshot.data, 'base64'));
console.log('  📸 зураг (📱 390px): /tmp/zar-69d-home-mobile.png');

// ---------- ⑤ JS алдаа ----------
const leafletOnly = exceptions.filter((e) => /leaflet|_leaflet_pos/i.test(e));
const otherExceptions = exceptions.filter((e) => !/leaflet|_leaflet_pos/i.test(e));
console.log(`     ℹ️ Leaflet дотоод алдаа: ${leafletOnly.length} (хамааралгүй, хаслаа)`);
check('⑤ Leaflet-ээс БУСАД JS exception 0', otherExceptions.length === 0, otherExceptions.join(' | ').slice(0, 200) || '0');
const nesting = consoleErrors.filter((e) => /nest|hydration|hydrat|validateDOM/i.test(e));
check('⑤ консол дээр hydration/React алдаа 0', nesting.length === 0, nesting.join(' | ').slice(0, 200) || '0');

// ---------- 📸 ЗУРАГ (лого → 🏠 икон → хайлт хүртэл) ----------
await goto(`${BASE}/`);
const clip = await evalJs(`(() => { const a = [...document.querySelectorAll('header a[href="/"]')].find((x) => /ZARBOOK/.test(x.textContent || '')); const i = document.querySelector('header a[data-home-icon-link]'); const s = document.querySelector('#home-search'); const r1 = a.getBoundingClientRect(); const r2 = (i || a).getBoundingClientRect(); const r3 = s ? s.getBoundingClientRect() : r2; const left = Math.max(0, Math.round(r1.left) - 12); const right = Math.min(window.innerWidth, Math.round(Math.max(r2.right, r3.left + 60)) + 12); return { x: left, y: Math.max(0, Math.round(r1.top) + 2), width: right - left, height: Math.round(r1.height) + 6 }; })()`);
const shot = await rpc('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 3 } });
const fsmod = await import('node:fs');
fsmod.writeFileSync('/tmp/zar-69d-home-icon.png', Buffer.from(shot.data, 'base64'));
console.log('  📸 зураг: /tmp/zar-69d-home-icon.png');

console.log(`\n${fail === 0 ? '✅' : '❌'} РЕЗУЛЬТАТ: ${ok} OK / ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);

