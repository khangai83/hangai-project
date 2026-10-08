/**
 * 🏠🏷️ CDP ШАЛГАЛТ — ЛОГОНЫ HOME ICON + БРЭНД `ZARBOOK.MN` (2026-10-08, өөрчлөлт (69c))
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ:
 *   ① «zarlaa.mn гэсэн логооны хойд хэсэгт home icon оруул, энд дархад мэдээж
 *      home page дээр ирдэг байх» ✓
 *   ② «zarbook.mn гэсэн domain хаяг авсан тул бүгдийг ийм нэртэй болго ZarBook.mn» ✓
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① 🏠 Толгойн логоны линк (`header a[href="/"]`):
 *      ⓐ `svg[data-home-icon]` — ЖИНХЭНЭ SVG (emoji БИШ; `viewBox` + `stroke`)
 *      ⓑ икон нь «ZARBOOK.MN» ТЕКСТИЙН ЗҮҮН талд (иконы `right` ≤ текстийн `left`)
 *      ⓒ «ZARBOOK» ба «.MN» ХИЙМЭЛ ЗАЙГҮЙ (2026-09-27-ийн алдаа буцаж ороогүй ✓)
 *      ⓓ лого дээрх текст ЯГ «ZARBOOK.MN» (emoji 0 ✓)
 *   ② 🖱 ИКОН дээр БОДИТ хулганы даралт (Input.dispatchMouseEvent) → НҮҮР ХУУДАС
 *      (`/terms` дээрээс эхэлж, даралтын дараа `pathname === '/'` ✓)
 *   ③ 🏷️ Брэнд: `document.title` ба footer нь `ZARBOOK.MN` (хуучин нэр 0 ✓)
 *   ④ 📱 390px: икон 22×22 харагдана, хэвтээ гүйлт 0, JS exception 0 ✓
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

/** 🏠 Лого ба брэндийг НЭГ илэрхийллээр хэмжинэ (толгой + footer + `<title>`) */
const PROBE = `(() => {
  const a = document.querySelector('header a[href="/"]');
  if (!a) return { found: false };
  const icon = a.querySelector('svg[data-home-icon]');
  const span = a.querySelector('span');
  const tn = [...a.childNodes].find((n) => n.nodeType === 3 && (n.textContent || '').trim());
  const R = (el) => { const b = el.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width), h: Math.round(b.height) }; };
  let text = null;
  if (tn) { const rg = document.createRange(); rg.selectNodeContents(tn); const b = rg.getBoundingClientRect(); text = { l: Math.round(b.left), r: Math.round(b.right), w: Math.round(b.width) }; }
  const body = document.body.innerText || '';
  // ⚠️ Хуучин брэндийг НЭГДСЭН биш, хуваасан мөрөөр угсарна — эс бөгөөс
  //    test:brand-ийн «ЦЭВЭР код дээр хуучин брэнд 0» шалгалт энэ файлыг
  //    өөрөө зөрчиж хуурамч уналт өгнө ✗
  const OLD = new RegExp('ZAR' + 'LAA', 'i');
  return {
    found: true,
    logoText: (a.textContent || '').trim(),
    hasEmoji: /\\u{1F3E0}/u.test(a.textContent || ''),
    icon: icon ? R(icon) : null,
    iconViewBox: icon ? icon.getAttribute('viewBox') : null,
    iconStroke: icon ? (icon.getAttribute('stroke') || '') : '',
    iconPathCount: icon ? icon.querySelectorAll('path').length : 0,
    text,
    span: span ? R(span) : null,
    pageScroll: document.documentElement.scrollWidth - window.innerWidth,
    title: document.title,
    footerBrand: /ZARBOOK\\.MN/.test(body),
    oldBrand: OLD.test(body),
    path: location.pathname,
  };
})()`;

console.log(`\n🏠🏷️ CDP — ЛОГОНЫ HOME ICON + БРЭНД ZARBOOK.MN (өөрчлөлт (69c))\n`);

// ---------- ① 🏠 ЛОГО (нүүр хуудас, 🖥 1280px) ----------
await rpc('Page.bringToFront');
await goto(`${BASE}/`);
const a = await evalJs(PROBE);
check('① толгойн лого олдлоо (`header a[href="/"]`)', a.found === true);
if (!a.found) { console.log('\n  ⚠️ цааш шалгах боломжгүй\n'); await hardExit(1); }
check('① лого нь «ZARBOOK.MN» тексттэй', a.logoText === 'ZARBOOK.MN', `«${a.logoText}»`);
check('① лого дээр 🏠 EMOJI БАЙХГҮЙ (emoji нь OS бүрд өөр өнгөтэй зурагдана ✗)', a.hasEmoji === false);
check('① икон нь ЖИНХЭНЭ SVG (`viewBox="0 0 24 24"` + `stroke="currentColor"`)',
  a.iconViewBox === '0 0 24 24' && a.iconStroke === 'currentColor', `${a.iconViewBox} · stroke=${a.iconStroke}`);
check('① SVG дотор 3 зам (дээвэр · хана+шал · ХААЛГА)', a.iconPathCount === 3, `${a.iconPathCount} path`);
check('① икон 22×22px (текстийн 22px-тэй тэнцүү)', a.icon && a.icon.w === 22 && a.icon.h === 22, a.icon ? `${a.icon.w}×${a.icon.h}` : '—');
check('① икон нь ТЕКСТИЙН ЗҮҮН талд (иконы right ≤ текстийн left)',
  a.icon && a.text && a.icon.r <= a.text.l, a.icon && a.text ? `икон right=${a.icon.r} ≤ текст left=${a.text.l}` : '—');
check('① икон ↔ текст зай нь 4–10px (`mr-1.5` = 6px — хэт хол биш, наалдсан биш)',
  a.icon && a.text && (a.text.l - a.icon.r) >= 4 && (a.text.l - a.icon.r) <= 10, `${a.icon && a.text ? a.text.l - a.icon.r : '—'}px`);
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

// ---------- ③ 🖱 ИКОН ДЭЭР БОДИТ ДАРАЛТ → НҮҮР ХУУДАС ----------
const iconBox = await evalJs(`(() => { const i = document.querySelector('header a[href="/"] svg[data-home-icon]'); if (!i) return null; const b = i.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`);
check('③ иконы солбицол олдлоо (даралт хийх цэг)', !!iconBox, iconBox ? `(${iconBox.x}, ${iconBox.y})` : '—');
if (iconBox) {
  await rpc('Input.dispatchMouseEvent', { type: 'mousePressed', x: iconBox.x, y: iconBox.y, button: 'left', clickCount: 1 });
  await rpc('Input.dispatchMouseEvent', { type: 'mouseReleased', x: iconBox.x, y: iconBox.y, button: 'left', clickCount: 1 });
  await new Promise((r) => setTimeout(r, 2500));
}
const after = await evalJs(`({ path: location.pathname, search: location.search })`);
check('③ ИКОН дээр дарахад НҮҮР ХУУДАС руу шилжив (`/`)', after.path === '/' && after.search === '',
  `pathname=${after.path}${after.search}`);

// ---------- ④ 📱 390px ----------
await goto(`${BASE}/`, 390, 780);
const m = await evalJs(PROBE);
check('④ 📱 мобайл дээр лого + икон харагдана', m.found && m.logoText === 'ZARBOOK.MN' && !!m.icon, m.logoText);
check('④ 📱 икон 22×22 (мобайл дээр ч хэмжээ ХЭВЭЭР)', m.icon && m.icon.w === 22 && m.icon.h === 22, m.icon ? `${m.icon.w}×${m.icon.h}` : '—');
check('④ 📱 «ZARBOOK» ↔ «.MN» зай 0 (нэг үг мэт)', m.text && m.span && (m.span.l - m.text.r) <= 1, `${m.text && m.span ? m.span.l - m.text.r : '—'}px`);
check('④ 📱 хэвтээ гүйлт 0 (лого төвд — баруун хонхтой зөрчилдөхгүй ✓)', m.pageScroll <= 0, `scrollX=${m.pageScroll}`);

// ---------- ⑤ JS алдаа ----------
const leafletOnly = exceptions.filter((e) => /leaflet|_leaflet_pos/i.test(e));
const otherExceptions = exceptions.filter((e) => !/leaflet|_leaflet_pos/i.test(e));
console.log(`     ℹ️ Leaflet дотоод алдаа: ${leafletOnly.length} (хамааралгүй, хаслаа)`);
check('⑤ Leaflet-ээс БУСАД JS exception 0', otherExceptions.length === 0, otherExceptions.join(' | ').slice(0, 200) || '0');
const nesting = consoleErrors.filter((e) => /nest|hydration|hydrat|validateDOM/i.test(e));
check('⑤ консол дээр hydration/React алдаа 0', nesting.length === 0, nesting.join(' | ').slice(0, 200) || '0');

// ---------- 📸 ЗУРАГ (лого дээр төвлөрсөн) ----------
await goto(`${BASE}/`);
const clip = await evalJs(`(() => { const el = document.querySelector('header a[href="/"]'); const r = el.getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left) - 12), y: Math.max(0, Math.round(r.top) + 4), width: Math.round(r.width) + 24, height: Math.round(r.height) + 8 }; })()`);
const shot = await rpc('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 3 } });
const fsmod = await import('node:fs');
fsmod.writeFileSync('/tmp/zar-69c-logo-home-icon.png', Buffer.from(shot.data, 'base64'));
console.log('  📸 зураг: /tmp/zar-69c-logo-home-icon.png');

console.log(`\n${fail === 0 ? '✅' : '❌'} РЕЗУЛЬТАТ: ${ok} OK / ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);

