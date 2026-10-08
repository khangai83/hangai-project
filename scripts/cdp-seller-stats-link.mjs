/**
 * 🔗 CDP ШАЛГАЛТ — «📋 N идэвхтэй зар» нь ТУСДАА ЛИНК (2026-10-08 (62)(63))
 *
 * ⚠️ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① Бодит DOM дээр «📋 N идэвхтэй зар» нь `<a href="/sellers/<user_id>">` —
 *      линк шиг ХАРАГДАНА (`text-primary` + `underline`), линк ДОТОР линк БАЙХГҮЙ
 *      (`closest('a') === өөрөө`) ✓
 *   ② КАРТ (толгой мөр) нь линк шиг ХАРАГДАХГҮЙ — хүрээ нь `<div>`, доогуур
 *      зураасгүй, харин дотроо 2 линк (толгой + «идэвхтэй зар») ✓
 *   ③ Хэмжээ: картаас гадагш гарсан элемент 0 · хуудасны хэвтээ гүйлт 0 ✓
 *   ④ БОДИТ ХУЛГАНААР дарахад `/sellers/<user_id>` руу шилжинэ ✓
 *   ⑤ 📱 390px мобайл: линк харагдана, overflow 0 ✓ · консол дээр JS exception 0 ✓
 *
 * ⚙️ АЖИЛЛУУЛАХ:
 *   1) `npm run build && npm run start` (http://localhost:3000)
 *   2) Chrome: --headless=new --remote-debugging-port=9222
 *   3) node scripts/cdp-seller-stats-link.mjs [BASE] [LISTING_ID] [USER_ID]
 */
const BASE = process.argv[2] || 'http://localhost:3000';
const ID = process.argv[3] || '02c4de63-09d8-42dc-9697-18154f40aafe';
const UID = process.argv[4] || '0526ab3f-0867-470c-8838-8a8172b84bc6';
const PATH = `/listings/${ID}`;

let ok = 0;
let fail = 0;
const check = (name, cond, extra = '') => {
  if (cond) { ok += 1; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`); } else { fail += 1; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
};

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

/** «📋 N идэвхтэй зар» линк + түүний карт — нэг илэрхийллээр хэмжинэ */
const PROBE = `(() => {
  const stats = [...document.querySelectorAll('a')].find((a) => a.textContent.includes('идэвхтэй зар'));
  if (!stats) return { found: false };
  const box = stats.parentElement;
  const header = [...box.querySelectorAll('a')].find((a) => a !== stats) || null;
  const cs = getComputedStyle(stats);
  const br = box.getBoundingClientRect();
  const out = [];
  box.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    if (r.left < br.left - 1 || r.right > br.right + 1) out.push(el.tagName + '.' + String(el.className).slice(0, 40));
  });
  const wide = [...document.querySelectorAll('body *')]
    .filter((el) => !String(el.className).includes('leaflet'))  // ⚠️ Leaflet-ийн дотоод proxy ХАСНА
    .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
    .map((el) => el.tagName + '.' + String(el.className).slice(0, 40));
  return {
    found: true,
    statsTag: stats.tagName,
    statsSelfClosest: stats.closest('a') === stats,
    statsHref: stats.getAttribute('href'),
    statsText: stats.textContent.replace(/\\s+/g, ' ').trim(),
    statsColor: cs.color,
    statsDecoration: cs.textDecorationLine,
    statsCursor: cs.cursor,
    boxTag: box.tagName,
    boxClass: String(box.className),
    boxDecoration: getComputedStyle(box).textDecorationLine,
    boxHeight: Math.round(br.height),
    boxWidth: Math.round(br.width),
    headerHref: header && header.getAttribute('href'),
    headerDecoration: header ? getComputedStyle(header).textDecorationLine : null,
    anchorsInBox: box.querySelectorAll('a').length,
    overflowInBox: out,
    wideEls: wide.slice(0, 5),
    pageScrollX: document.documentElement.scrollWidth - window.innerWidth,
    innerWidth: window.innerWidth,
  };
})()`;

await rpc('Page.bringToFront');
await goto(BASE + PATH);

console.log(`\n🔗 CDP — «📋 N идэвхтэй зар» ТУСДАА ЛИНК (${PATH})\n`);

// ---------- ① 🖥 1280px ----------
const p = await evalJs(PROBE);
check('① «📋 N идэвхтэй зар» мөр DOM-д олдлоо', p.found === true);
if (!p.found) { console.log('\n  ⚠️ цааш шалгах боломжгүй\n'); await hardExit(1); }
console.log(`     ℹ️ текст: «${p.statsText}»`);
check('① энэ нь ЖИНХЭНЭ линк (`<a>`)', p.statsTag === 'A', `tag=${p.statsTag}`);
check("① линк дотор линк БАЙХГҮЙ (`closest('a')` = өөрөө)", p.statsSelfClosest === true);
check('① `href` нь нийтлэгчийн зарууд руу', p.statsHref === `/sellers/${UID}`, `href=${p.statsHref}`);
check('① текст нь «📋 N идэвхтэй зар» (УГТВАРГҮЙ — (63))',
  /📋 \d+ идэвхтэй зар/.test(p.statsText) && !/Зарын тоо/.test(p.statsText));
check('① линк шиг ХАРАГДАНА (primary өнгө)', p.statsColor === 'rgb(37, 99, 235)', p.statsColor);
check('① линк шиг ХАРАГДАНА (доогуур зураастай)', p.statsDecoration.includes('underline'), p.statsDecoration);
check('① cursor: pointer', p.statsCursor === 'pointer', p.statsCursor);

// ---------- ② КАРТ линк шиг харагдахгүй ----------
check('② картын хүрээ нь `<div>` (линк БИШ)', p.boxTag === 'DIV', `tag=${p.boxTag}`);
check('② картын хүрээ доогуур зураасгүй', p.boxDecoration === 'none', p.boxDecoration);
check('② хүрээ нь хуучин фонт/хүрээний классаа хадгалсан', /rounded-lg bg-gray-50 p-3/.test(p.boxClass) && /hover:bg-primary-light/.test(p.boxClass));
check('② карт дотор ЯГ 2 линк (толгой + «идэвхтэй зар»)', p.anchorsInBox === 2, `${p.anchorsInBox}`);
check('② толгойн линк мөн `/sellers/<user_id>` руу', p.headerHref === `/sellers/${UID}`, `header=${p.headerHref}`);
check('② толгойн линк линк шиг ХАРАГДАХГҮЙ (зураасгүй)', p.headerDecoration === 'none', p.headerDecoration);

// ---------- ③ БАГТАХ ----------
console.log(`     📏 карт: ${p.boxWidth}×${p.boxHeight}px (1280px дэлгэц)`);
check('③ картаас ГАДНА гарсан элемент 0', p.overflowInBox.length === 0, p.overflowInBox.join(', ') || '0');
check('③ хуудасны хэвтээ гүйлт 0', p.pageScrollX <= 0, `scrollWidth-innerWidth=${p.pageScrollX}`);
check('③ дэлгэцээс хальсан элемент 0', p.wideEls.length === 0, p.wideEls.join(', ') || '0');

// ---------- ④ БОДИТ ХУЛГАНААР ДАРНА ----------
const pt = await evalJs(`(() => { const a = [...document.querySelectorAll('a')].find((x) => x.textContent.includes('идэвхтэй зар')); a.scrollIntoView({ block: 'center' }); const r = a.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
await new Promise((r) => setTimeout(r, 400));
await rpc('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
await rpc('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
await new Promise((r) => setTimeout(r, 2500));
const nav = await evalJs('location.pathname');
check('④ линк дээр БОДИТ хулганаар дарахад `/sellers/<user_id>` руу шилжив', nav === `/sellers/${UID}`, nav);

// ---------- ⑤ 📱 390px ----------
await goto(BASE + PATH, 390, 780);
const mob = await evalJs(PROBE);
check('⑤ 📱 мобайл дээр ч линк хэвээр (`<a>` + зураас)', mob.found && mob.statsTag === 'A' && mob.statsDecoration.includes('underline'));
check('⑤ 📱 мобайл дээр картаас гарсан элемент 0', mob.overflowInBox.length === 0, mob.overflowInBox.join(', ') || '0');
check('⑤ 📱 мобайл дээр хэвтээ гүйлт 0', mob.pageScrollX <= 0 && mob.wideEls.length === 0, `scrollX=${mob.pageScrollX}`);
console.log(`     📏 📱 карт: ${mob.boxWidth}×${mob.boxHeight}px (390px дэлгэц)`);

// ⚠️ Leaflet-ийн `_leaflet_pos` (газрын зургийн zoom transition) алдаа нь ЭНЭ
//    өөрчлөлтөөс ҮЛ ХАМААРАЛТАЙ, хуудас ачаалах бүрд headless дээр гардаг
//    (stack нь 100% leaflet дотоод — React/render хүрээ БАЙХГҮЙ) ⇒ тусгаарлана ✓
const leafletOnly = exceptions.filter((e) => /leaflet|_leaflet_pos/i.test(e));
const otherExceptions = exceptions.filter((e) => !/leaflet|_leaflet_pos/i.test(e));
console.log(`     ℹ️ Leaflet дотоод алдаа: ${leafletOnly.length} (хамааралгүй, хаслаа)`);
check('⑥ Leaflet-ээс БУСАД JS exception 0', otherExceptions.length === 0, otherExceptions.join(' | ').slice(0, 200) || '0');
// 🔴 ХАМГИЙН ЧУХАЛ: `<a>` дотор `<a>` болвол React «validateDOMNesting» /
//    hydration алдаа өгнө — тэр МЭДЭГДЭЛ байхгүй эсэхийг шалгана ✓
const nesting = consoleErrors.filter((e) => /nest|hydration|hydrat|validateDOM/i.test(e));
check('⑥ консол дээр hydration/линк nesting алдаа 0', nesting.length === 0, nesting.join(' | ').slice(0, 200) || '0');

// ---------- 📸 ЗУРАГ (нийтлэгчийн карт дээр төвлөрсөн) ----------
await goto(BASE + PATH);
const clip = await evalJs(`(() => { const a = [...document.querySelectorAll('a')].find((x) => x.textContent.includes('идэвхтэй зар')); a.scrollIntoView({ block: 'center' }); const r = a.parentElement.getBoundingClientRect(); return { x: Math.max(0, Math.round(r.left) - 60), y: Math.max(0, Math.round(r.top) - 60), width: Math.round(r.width) + 120, height: Math.round(r.height) + 120 }; })()`);
const shot = await rpc('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 2 } });
const fsmod = await import('node:fs');
fsmod.writeFileSync('/tmp/zar-63-seller-card.png', Buffer.from(shot.data, 'base64'));
console.log('  📸 зураг: /tmp/zar-63-seller-card.png');

console.log(`\n${fail === 0 ? '✅' : '❌'} РЕЗУЛЬТАТ: ${ok} OK / ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);
