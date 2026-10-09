/**
 * 🏷️ CDP ШАЛГАЛТ — БРЭНД `ZarBook.mn` + 🆕 (91) толгойн ТУСДАА икон ХАСАГДАВ
 *   (2026-10-08, өөрчлөлт (69c)/(69d)/(69e)/(72) → 🆕 2026-10-10 (91))
 *
 * 🆕 (91) ХЭРЭГЛЭГЧИЙН ШИЙДВЭР (2026-10-10): «home deer baigaa ZarBook.mn nii
 *   ard baisan home icon … uuniig bur boliyo» ⇒ ⏳ (69d)-д нэмэгдэж, (90)-д «Z»
 *   бадж болсон логоны дараах ТУСДАА икон (`a[data-home-icon-link]` +
 *   `svg[data-home-icon]`) БҮРЭН ХАСАГДАВ ✓
 *   🎯 УЧИР: лого нь өөрөө `href="/"` (нүүр хуудас) тул тусдаа икон нь ЗӨВХӨН
 *   давхардал байв — бадж болсноос хойш «нүүр хуудас» гэдгээ хэлэхээ болиод
 *   байв ✗ ⇒ одоо толгойн мөрөнд нүүр хуудасны ГАНЦ линк = ЛОГО ✓
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (түүхэн):
 *   ① «zarlaa.mn гэсэн логооны хойд хэсэгт home icon оруул, энд дархад мэдээж
 *      home page дээр ирдэг байх» ⏳ (91)-д тусдаа икон ХАСАГДАВ (лого = линк ✓)
 *   ② «zarbook.mn гэсэн domain хаяг авсан тул бүгдийг ийм нэртэй болго ZarBook.mn» ✓
 *   ③ (69d) «…search хэсгийн өмнө тусдаа icon болгоод өгөөч» ⏳ (91)-д ХАСАГДАВ ✓
 *   ④ (69e) «home icon ямар ч хуудасруу орсон zarbook.mn logo ний хоёроо л байдаг
 *      баймаар байна» ⏳ (91)-д ХАСАГДАВ — лого дангаараа БҮХ хуудсанд хэвээр ✓
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① 🏷️ Толгойн лого (`header a[href="/"]` бөгөөд текстидээ «ZarBook»-той):
 *      ⓐ текст ЯГ «ZarBook.mn», 🏠 emoji БАЙХГҮЙ, логоны ДОТОР SVG БАЙХГҮЙ
 *        (`svg` тоо 0 — лого нь ЗӨВХӨН текст ✓)
 *      ⓑ «ZarBook» ба «.mn» ХИЙМЭЛ ЗАЙГҮЙ (2026-09-27-ийн алдаа буцаж ороогүй ✓)
 *      ⓒ 🆕 (91) толгойн мөрөнд нүүр хуудасны ГАНЦ линк (`a[href="/"]` тоо 1) ба
 *        ТУСДАА иконы үлдэгдэл 0 (`a[data-home-icon-link]` + `svg[data-home-icon]`)
 *   ② 🔍 ХАЙЛТЫН мөр (≥`xl`): форм нь слатын ЗҮҮН захад наалдсан
 *      (`form.left − slot.left` = `xl:px-3` = 12px) ба лого ↔ форм зай 10–14px
 *      (🆕 (91): ⏳ (70)-ийн «икон ↔ форм» хэмжилт нь «лого ↔ форм» болов) ✓
 *   ③ 🖱 ЛОГО дээр БОДИТ хулганы даралт (`Input.dispatchMouseEvent`, `/terms`
 *      дээрээс эхэлж) → НҮҮР ХУУДАС руу (`pathname === '/'` ✓); тусдаа икон
 *      БАЙХГҮЙ тул дарах 2 дахь линк ч БАЙХГҮЙ ✓
 *   ④ 🏷️ Брэнд: `document.title` ба footer нь `ZarBook.mn` (хуучин нэр 0 ✓)
 *   ⑤ 📱 390px: лого дангаараа ТӨВД (±14px), НЭГ мөрөнд, хэвтээ гүйлт 0 ✓
 *   ⑤b 🖥 1024px (`lg` босго): баруун цэсэн товчнууд (`hidden lg:flex`)
 *      харагдаж, ЛОГОТОЙ ЗӨРЧИЛДӨХГҮЙ (лого.right ≤ «➕ Зар нэмэх» left) ✓
 *
 *   ⑥ 🆕 (72)+(91) `/` ба ЗАР (`/listings/<id>`) — **ЛОГОНЫ** x ЯГ ИЖИЛ (±2px; 🖥
 *      1280/1440/1680px ба 📱 390px) байх ЁСТОЙ — ⏳ буруу байхдаа `headerSlot`-гүй
 *      хуудсанд чөлөөт зайны ГОЛД түлхэгдэж 300–435px шилжиж байв ✗
 *      (хэрэглэгчийн гомдол: «home ruu ordog icon chin zar luu orohoor bairlalaa
 *      uurchluud baigaa») ⇒ `[лого]` НЭГ бүлэг болсныг хамгаална ✓
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
  const logo = anchors.find((x) => /ZarBook/.test(x.textContent || '')) || null;
  // 🆕 (91): толгойн ТУСДАА икон БҮРЭН ХАСАГДАВ ⇒ эдгээрийн тоо 0 байх ЁСТОЙ ✓
  const iconLinks = [...document.querySelectorAll('header a[data-home-icon-link]')];
  const iconSvgs = [...document.querySelectorAll('header svg[data-home-icon]')];
  const search = document.querySelector('#home-search');
  // 🆕 (70): хайлтын форм (input-ийн эцэг form[role=search]) ба түүний слат —
  //    форм нь слатын ЗҮҮН захад наалдсаныг ЯГ хэмжихэд хэрэгтэй ✓
  const searchForm = search ? search.closest('form') : null;
  const searchSlot = searchForm ? searchForm.parentElement : null;
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
    // 🆕 (91): homeLinks = толгойн a[href="/"]-ийн тоо (1 байх ЁСТОЙ — ГАНЦ
    //    нүүр линк = лого); iconLinks/iconSvgs = тусдаа иконы үлдэгдэл (0 ✓)
    homeLinks: anchors.length,
    iconLinks: iconLinks.length,
    iconSvgs: iconSvgs.length,
    search: shown(search) ? R(search) : null,
    searchForm: searchForm && shown(searchForm) ? R(searchForm) : null,
    searchSlot: searchSlot && shown(searchSlot) ? R(searchSlot) : null,
    text,
    span: span ? R(span) : null,
    pageScroll: document.documentElement.scrollWidth - window.innerWidth,
    vw: window.innerWidth,
    title: document.title,
    footerBrand: /ZarBook\\.mn/.test(body),
    oldBrand: OLD.test(body),
    path: location.pathname,
  };
})()`;

console.log(`\n🏷️ CDP — БРЭНД ZarBook.mn + 🆕 (91) толгойн ТУСДАА икон ХАСАГДАВ (лого = ГАНЦ нүүр линк)\n`);

// ---------- ① 🏷️ ЛОГО (текст) + 🏠 ТУСДАА ИКОН (нүүр хуудас, 🖥 1280px) ----------
await rpc('Page.bringToFront');
await goto(`${BASE}/`);
const a = await evalJs(PROBE);
check('① толгойн лого олдлоо (`header a[href="/"]` бөгөөд «ZarBook» тексттэй)', a.found === true);
if (!a.found) { console.log('\n  ⚠️ цааш шалгах боломжгүй\n'); await hardExit(1); }
check('① лого нь «ZarBook.mn» тексттэй (лого нь ЗӨВХӨН текст ✓)', a.logoText === 'ZarBook.mn', `«${a.logoText}»`);
check('① логоны ДОТОР икон БАЙХГҮЙ (`svg` тоо 0 — лого нь ЗӨВХӨН текст ✓)', a.logoIconCount === 0, `${a.logoIconCount} svg`);
check('① лого дээр 🏠 EMOJI БАЙХГҮЙ (emoji нь OS бүрд өөр өнгөтэй зурагдана ✗)', a.hasEmoji === false);
check('① 🆕 (91) толгойд НҮҮР ХУУДАСНЫ ГАНЦ линк = ЛОГО (`header a[href="/"]` тоо 1)',
  a.homeLinks === 1, `${a.homeLinks} линк`);
check('① 🆕 (91) ТУСДАА икон БҮРЭН ХАСАГДАВ — `a[data-home-icon-link]` 0 ба `svg[data-home-icon]` 0 ✓',
  a.iconLinks === 0 && a.iconSvgs === 0, `линк=${a.iconLinks} · SVG=${a.iconSvgs}`);
check('① лого нь ХАЙЛТЫН мөрийн ЗҮҮН талд, ЯГ ӨМНӨ (логоны right ≤ хайлтын формын left)',
  a.searchForm && a.logoRect && a.logoRect.r <= a.searchForm.l,
  a.searchForm && a.logoRect ? `лого right=${a.logoRect.r} ≤ форм left=${a.searchForm.l}` : `хайлт харагдахгүй (${!!a.search})`);
check('① лого ↔ хайлтын мөр зай 10–14px (🆕 (91): форм нь слатын ЗҮҮН захад наалдсан тул зай нь ЗӨВХӨН `xl:px-3` = 12px ✓; ⏳ (70)-д энэ хэмжилт «икон ↔ форм» байв)',
  a.searchForm && a.logoRect && (a.searchForm.l - a.logoRect.r) >= 10 && (a.searchForm.l - a.logoRect.r) <= 14,
  `${a.searchForm && a.logoRect ? a.searchForm.l - a.logoRect.r : '—'}px`);
check('① хайлтын форм нь слатын ЗҮҮН захад наалдсан (`form.left − slot.left` = `xl:px-3` = 12px ±2)',
  a.searchForm && a.searchSlot && Math.abs((a.searchForm.l - a.searchSlot.l) - 12) <= 2,
  a.searchForm && a.searchSlot ? `форм left=${a.searchForm.l} − слат left=${a.searchSlot.l} = ${a.searchForm.l - a.searchSlot.l}px` : 'слат олдсонгүй');
check('① хайлтын форм өргөн нь `max-w-[480px]` ХЭВЭЭР (⏳ төвлөрөөгүй, хэт урт ч болоогүй ✓)',
  a.searchForm && a.searchForm.w <= 482 && a.searchForm.w >= 300,
  a.searchForm ? `өргөн=${a.searchForm.w}px (≤482)` : 'хайлт харагдахгүй');
check('① «ZarBook» ↔ «.MN» ХИЙМЭЛ ЗАЙГҮЙ (2026-09-27-ийн алдаа буцаж ороогүй ✓)',
  a.text && a.span && (a.span.l - a.text.r) <= 1, `${a.text && a.span ? a.span.l - a.text.r : '—'}px`);
check('① 🖥 хэвтээ гүйлт 0', a.pageScroll <= 0, `scrollWidth-innerWidth=${a.pageScroll}`);


// ---------- ② 🏷️ БРЭНД (нүүр + `/terms` + footer + `<title>`) ----------
check('② `<title>` нь `ZarBook.mn` (root metadata)', /^ZarBook\.mn/.test(a.title), a.title.slice(0, 60));
check('② нүүр хуудсан дээрх текстэд `ZarBook.mn` бий (footer)', a.footerBrand === true);
check('② нүүр хуудсан дээр ХУУЧИН брэнд ХАРАГДАХГҮЙ (бүхэлдээ ZarBook.mn ✓)', a.oldBrand === false);

await goto(`${BASE}/terms`);
const t = await evalJs(PROBE);
check('② `/terms` хуудасны `<title>` нь `ZarBook.mn`', /ZarBook\.mn/.test(t.title), t.title.slice(0, 60));
check('② `/terms` дээр ХУУЧИН нэр ХАРАГДАХГҮЙ (платформ нь ZarBook.mn)', t.oldBrand === false);

// ---------- ③ 🖱 ЛОГО дээр БОДИТ ДАРАЛТ → НҮҮР ХУУДАС (🆕 (91): тусдаа икон БАЙХГҮЙ) ----------
const pressAt = async (pt) => {
  await rpc('Input.dispatchMouseEvent', { type: 'mousePressed', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await rpc('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pt.x, y: pt.y, button: 'left', clickCount: 1 });
  await new Promise((r) => setTimeout(r, 2500));
};
// ⓐ 🏷️ ЛОГО (текст) дээр БОДИТ даралт — тэр ч бас нүүр хуудас руу шилжих ёстой ✓
await goto(`${BASE}/terms`);
const logoBox = await evalJs(`(() => { const a = [...document.querySelectorAll('header a[href="/"]')].find((x) => /ZarBook/.test(x.textContent || '')); if (!a) return null; const b = a.getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`);
check('③ 🏷️ логоны солбицол олдлоо (даралт хийх цэг)', !!logoBox, logoBox ? `(${logoBox.x}, ${logoBox.y})` : '—');
if (logoBox) await pressAt(logoBox);
const afterLogo = await evalJs(`({ path: location.pathname, search: location.search })`);
check('③ 🏷️ ЛОГО дээр дарахад НҮҮР ХУУДАС руу шилжив (`/`)', afterLogo.path === '/' && afterLogo.search === '',
  `pathname=${afterLogo.path}${afterLogo.search}`);

// ⓑ 🆕 (91) ТУСДАА икон БАЙХГҮЙ ⇒ дарах 2 дахь нүүр линк ч БАЙХГҮЙ
await goto(`${BASE}/terms`);
const leftovers = await evalJs(`(() => ({ links: document.querySelectorAll('header a[data-home-icon-link]').length, svgs: document.querySelectorAll('header svg[data-home-icon]').length, homeLinks: document.querySelectorAll('header a[href="/"]').length }))()`);
check('③ 🆕 (91) `/terms` дээр тусдаа икон БАЙХГҮЙ — дарах 2 дахь линк 0 ✓',
  leftovers.links === 0 && leftovers.svgs === 0, `линк=${leftovers.links} · SVG=${leftovers.svgs}`);
check('③ 🆕 (91) `/terms` дээр ч нүүр хуудасны ГАНЦ линк = ЛОГО',
  leftovers.homeLinks === 1, `${leftovers.homeLinks} линк`);

// ---------- ④ 📱 390px (мобайл) — 🆕 (91) ЛОГО дангаараа ТӨВД ----------
await goto(`${BASE}/`, 390, 780);
const m = await evalJs(PROBE);
check('④ 📱 мобайл дээр лого харагдана (текст нь `ZarBook.mn`)', m.found && m.logoText === 'ZarBook.mn', m.logoText);
check('④ 📱 🆕 (91) мобайлд ч ТУСДАА икон БАЙХГҮЙ (`a[data-home-icon-link]` 0 ба `svg[data-home-icon]` 0)',
  m.iconLinks === 0 && m.iconSvgs === 0, `линк=${m.iconLinks} · SVG=${m.iconSvgs}`);
check('④ 📱 лого ГАНЦААРАА ТӨВД (±14px — 2026-09-27-ийн «лого төвд» хүсэлт хэвээр ✓)',
  !!m.logoRect && Math.abs(((m.logoRect.l + m.logoRect.r) / 2) - m.vw / 2) <= 14,
  `логоны төв=${m.logoRect ? Math.round((m.logoRect.l + m.logoRect.r) / 2) : '—'} · viewport төв=${m.vw / 2}`);
check('④ 📱 лого НЭГ МӨРӨНД (текст node 1 rect + «.MN»-тэй ±6px ижил top — 2026-09-27-ийн хуваагдал буцаж ороогүй ✓)',
  m.text && m.text.lines === 1 && m.span && Math.abs(m.text.t - m.span.t) <= 6,
  `lines=${m.text && m.text.lines} · top=${m.text && m.text.t}/${m.span && m.span.t}`);
check('④ 📱 «ZarBook» ↔ «.MN» зай 0 (нэг үг мэт)',
  m.text && m.span && (m.span.l - m.text.r) <= 1 && (m.span.l - m.text.r) >= -2,
  `${m.text && m.span ? m.span.l - m.text.r : '—'}px`);
check('④ 📱 хэвтээ гүйлт 0 (лого ганцаараа — баруун хонхтой зөрчилдөхгүй ✓)',
  m.pageScroll <= 0, `scrollX=${m.pageScroll}`);
const mclip = await evalJs(`(() => { const a = [...document.querySelectorAll('header a[href="/"]')].find((x) => /ZarBook/.test(x.textContent || '')); const r1 = a.getBoundingClientRect(); const left = Math.max(0, Math.round(r1.left) - 14); const right = Math.min(window.innerWidth, Math.round(r1.right) + 14); return { x: left, y: Math.max(0, Math.round(r1.top) - 8), width: right - left, height: Math.round(r1.height) + 16 }; })()`);
const mshot = await rpc('Page.captureScreenshot', { format: 'png', clip: { ...mclip, scale: 3 } });
const fsMob = await import('node:fs');
fsMob.writeFileSync('/tmp/zar-91-brand-mobile.png', Buffer.from(mshot.data, 'base64'));
console.log('  📸 зураг (📱 390px — лого дангаараа ТӨВД, тусдаа икон БАЙХГҮЙ): /tmp/zar-91-brand-mobile.png');

// ---------- ④b 🖥 1024px (`lg` босго — баруун товчнууд ХАРАГДАХ хэмжээ): икон БАЙХГҮЙ, ЛОГО товчнуудтай ЗӨРЧИЛДӨХГҮЙ ----------
await goto(`${BASE}/`, 1024, 800);
const lg = await evalJs(`(() => {
  const shown = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
  const logo = [...document.querySelectorAll('header a[href="/"]')].find((x) => /ZarBook/.test(x.textContent || ''));
  const addBtn = [...document.querySelectorAll('header button')].find((b) => /Зар нэмэх/.test(b.textContent || ''));
  const R = (el, k) => el ? Math.round(el.getBoundingClientRect()[k]) : null;
  return {
    logoRight: R(logo, 'right'), addLeft: R(addBtn, 'left'), addShown: shown(addBtn),
    iconLinks: document.querySelectorAll('header a[data-home-icon-link]').length,
    iconSvgs: document.querySelectorAll('header svg[data-home-icon]').length,
    scroll: document.documentElement.scrollWidth - window.innerWidth,
  };
})()`);
check('④b 🖥 1024px (`lg` босго) — 🆕 (91) тусдаа икон БАЙХГҮЙ (`a[data-home-icon-link]` 0 ба `svg[data-home-icon]` 0)',
  lg.iconLinks === 0 && lg.iconSvgs === 0, `линк=${lg.iconLinks} · SVG=${lg.iconSvgs}`);
check('④b 🖥 1024px — баруун цэсэн товчнууд (`lg:flex`) харагдаж, ЛОГОТОЙ ЗӨРЧИЛДӨХГҮЙ (логоны right ≤ «➕ Зар нэмэх» left)',
  lg.addShown && lg.logoRight <= lg.addLeft, `лого right=${lg.logoRight} ≤ товч left=${lg.addLeft}`);
check('④b 🖥 1024px — хэвтээ гүйлт 0', lg.scroll <= 0, `scroll=${lg.scroll}`);

// ---------- ④c 🖥 (70) — хайлтын форм нь ЗҮҮЛЭЭ НААЛДСАН: зай нь слатын өргөнөөс ХАМААРАЛГҮЙ (1280 · 1440 · 1680) ----------
for (const w of [1280, 1440, 1680]) {
  await goto(`${BASE}/`, w, 900);
  const s = await evalJs(PROBE);
  const gap = s.searchForm && s.logoRect ? s.searchForm.l - s.logoRect.r : null;
  check(`④c 🖥 ${w}px — ЛОГО ↔ хайлтын мөр зай 10–14px (форм нь слатын ЗҮҮЛЭЭ наалдсан; 🆕 (91): хэмжилт «икон ↔ форм»-оос «лого ↔ форм» болов ✓)`,
    gap !== null && gap >= 10 && gap <= 14, `${gap ?? '—'}px · форм өргөн=${s.searchForm && s.searchForm.w}`);
  check(`④c 🖥 ${w}px — форм нь слатын зүүн захаас 12px (` + '`xl:px-3`' + `)`,
    !!(s.searchForm && s.searchSlot) && Math.abs((s.searchForm.l - s.searchSlot.l) - 12) <= 2,
    s.searchForm && s.searchSlot ? `${s.searchForm.l - s.searchSlot.l}px` : 'слат олдсонгүй');
}
await goto(`${BASE}/`, 1280, 900);
const gapClip = await evalJs(`(() => { const a = [...document.querySelectorAll('header a[href=\"/\"]')].find((x) => /ZarBook/.test(x.textContent || '')); const f = document.querySelector('#home-search').closest('form'); const r1 = a.getBoundingClientRect(); const r2 = f.getBoundingClientRect(); const left = Math.max(0, Math.round(r1.left) - 12); const right = Math.min(window.innerWidth, Math.round(r2.left + 200)); return { x: left, y: Math.max(0, Math.round(r1.top) + 2), width: right - left, height: Math.round(r1.height) + 6 }; })()`);
const gapShot = await rpc('Page.captureScreenshot', { format: 'png', clip: { ...gapClip, scale: 3 } });
const fsGap = await import('node:fs');
fsGap.writeFileSync('/tmp/zar-91-search-gap-desktop.png', Buffer.from(gapShot.data, 'base64'));
console.log('  📸 зураг (🖥 1280px — лого → хайлт, зай 12px; тусдаа икон БАЙХГҮЙ): /tmp/zar-91-search-gap-desktop.png');

// ---------- ⑤ JS алдаа ----------
const leafletOnly = exceptions.filter((e) => /leaflet|_leaflet_pos/i.test(e));
const otherExceptions = exceptions.filter((e) => !/leaflet|_leaflet_pos/i.test(e));
console.log(`     ℹ️ Leaflet дотоод алдаа: ${leafletOnly.length} (хамааралгүй, хаслаа)`);
check('⑤ Leaflet-ээс БУСАД JS exception 0', otherExceptions.length === 0, otherExceptions.join(' | ').slice(0, 200) || '0');
const nesting = consoleErrors.filter((e) => /nest|hydration|hydrat|validateDOM/i.test(e));
check('⑤ консол дээр hydration/React алдаа 0', nesting.length === 0, nesting.join(' | ').slice(0, 200) || '0');

// ---------- ⑥ 🆕 (72)+(91) ЛОГО ХУУДАС БҮРД ЯГ ИЖИЛ БАЙРЛАЛД (хэрэглэгчийн гомдол) ----------
//  ⚠️ `lg:justify-between` дээр `headerSlot`-гүй хуудсанд (зар · мессеж …) зүүн
//    бүлэг нь чөлөөт зайны ГОЛД шилжиж байв ✗ ⇒ `/` ба `/listings/<id>` дээр
//    `logo.left` ЯГ ИЖИЛ (±2px) байх ба бүлэг нь ЯГ 1 хүүхэд (лого) байх ЁСТОЙ ✓
//    (🆕 (91): ⏳ (72)-ийн «иконы x» хэмжилт нь «ЛОГОНЫ x» болов — икон ХАСАГДАВ)
const excBefore6 = exceptions.filter((e) => !/leaflet|_leaflet_pos/i.test(e)).length;
const fs6 = await import('node:fs');

/** 📄 `.env.local`-аас утга (байхгүй бол `''` — SKIP зам руу шилжинэ ✓) */
const envRead = (k) => {
  try {
    const txt = fs6.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    return (txt.match(new RegExp(`^\\s*${k}\\s*=\\s*(.*)$`, 'm')) || [])[1]?.trim().replace(/^["']|["']$/g, '') || '';
  } catch { return ''; }
};

/** 🆔 Шалгах ЗАРЫН id — ① Supabase REST, ② нөөц: нүүр хуудасны эхний картын линк */
let ZAR_ID = '';
{
  const supaUrl = envRead('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = envRead('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (supaUrl && anonKey) {
    try {
      const r = await fetch(`${supaUrl}/rest/v1/listings?select=id&limit=1`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      if (r.ok) ZAR_ID = String((await r.json())?.[0]?.id || '');
    } catch { /* алгасна */ }
  }
  if (!ZAR_ID) {
    await goto(`${BASE}/`);
    const href = await evalJs(`(() => { const a = document.querySelector('a[href^="/listings/"]'); return a ? a.getAttribute('href') : ''; })()`);
    ZAR_ID = String(href || '').split('/').filter(Boolean).pop() || '';
  }
}

/** 📐 ЛОГОНЫ байрлал: бүлэг нь ЯГ 1 хүүхэд (лого) ба `logo.left` хуудас бүрд ИЖИЛ */
const LOGO_AT = `(() => {
  const logo = [...document.querySelectorAll('header a[href="/"]')].find((x) => /ZarBook/.test(x.textContent || ''));
  if (!logo) return null;
  const b = logo.getBoundingClientRect();
  const wrap = logo.parentElement;
  return {
    l: +b.left.toFixed(1), r: +b.right.toFixed(1),
    wrapKids: wrap ? wrap.children.length : 0,
    iconLinks: document.querySelectorAll('header a[data-home-icon-link]').length,
    iconSvgs: document.querySelectorAll('header svg[data-home-icon]').length,
    scroll: document.documentElement.scrollWidth - window.innerWidth,
    path: location.pathname,
  };
})()`;

if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(ZAR_ID)) {
  console.log('  ⏭ ⑥ SKIP — ЗАРЫН id олдсонгүй (Supabase тохиргоо/карт алга) ✓');
} else {
  for (const w of [1280, 1440, 1680]) {
    await goto(`${BASE}/`, w, 900);
    const home = await evalJs(LOGO_AT);
    await goto(`${BASE}/listings/${ZAR_ID}`, w, 900);
    const zar = await evalJs(LOGO_AT);
    check(`⑥ 🆕 (72)+(91) 🖥 ${w}px — ЗАР руу ороход ЛОГОНЫ x ШИЛЖИХГҮЙ (\`/\` ба ЗАР дээр ЯГ ИЖИЛ ±2px)`,
      !!(home && zar) && Math.abs(home.l - zar.l) <= 2,
      home && zar ? `нүүр=${home.l} · зар=${zar.l}` : 'лого олдсонгүй');
    check(`⑥ 🆕 (91) 🖥 ${w}px — ЗАР (headerSlot-гүй) дээр ч тусдаа икон БАЙХГҮЙ ✓`,
      !!zar && zar.iconLinks === 0 && zar.iconSvgs === 0,
      zar ? `икон линк=${zar.iconLinks} · SVG=${zar.iconSvgs}` : '—');
    check(`⑥ 🖥 ${w}px — [лого] бүлэг нь ЯГ 1 хүүхэд ба хэвтээ гүйлт 0`,
      !!zar && zar.wrapKids === 1 && zar.scroll <= 0, zar ? `хүүхэд=${zar.wrapKids} · scrollX=${zar.scroll}` : '—');
  }
  await goto(`${BASE}/`, 390, 780);
  const mHome = await evalJs(LOGO_AT);
  await goto(`${BASE}/listings/${ZAR_ID}`, 390, 780);
  const mZar = await evalJs(LOGO_AT);
  check('⑥ 📱 390px — мобайлд ч нүүр ба ЗАР дээр ЛОГО ЯГ ИЖИЛ (±2px) ба тусдаа икон 0',
    !!(mHome && mZar) && Math.abs(mHome.l - mZar.l) <= 2 && mZar.iconLinks === 0 && mZar.iconSvgs === 0,
    mHome && mZar ? `нүүр=${mHome.l} · зар=${mZar.l} · икон=${mZar.iconLinks}/${mZar.iconSvgs}` : '—');
  const excAfter6 = exceptions.filter((e) => !/leaflet|_leaflet_pos/i.test(e)).length;
  check('⑥ ЗАР ба НҮҮР хуудсанд нэмэгдсэн JS exception 0 (Leaflet-ээс бусад)',
    excAfter6 <= excBefore6, `${excAfter6 - excBefore6} шинэ`);

  // 📸 ЗАРЫН хуудасны толгойн зураг (лого дангаараа — тусдаа икон БАЙХГҮЙ ✓)
  await goto(`${BASE}/listings/${ZAR_ID}`, 1280, 900);
  const zClip = await evalJs(`(() => { const a = [...document.querySelectorAll('header a[href="/"]')].find((x) => /ZarBook/.test(x.textContent || '')); const f = document.querySelector('header form[role="search"]'); const r1 = a.getBoundingClientRect(); const r3 = f ? f.getBoundingClientRect() : null; const left = Math.max(0, Math.round(r1.left) - 12); const right = Math.min(window.innerWidth, Math.round((r3 ? r3.left + 40 : r1.right + 240)) + 12); return { x: left, y: Math.max(0, Math.round(r1.top) + 2), width: Math.max(120, right - left), height: Math.round(r1.height) + 6 }; })()`);
  const zShot = await rpc('Page.captureScreenshot', { format: 'png', clip: { ...zClip, scale: 3 } });
  fs6.writeFileSync('/tmp/zar-91-zar-header-logo.png', Buffer.from(zShot.data, 'base64'));
  console.log('  📸 зураг (🖥 1280px, ЗАР — лого дангаараа, тусдаа икон БАЙХГҮЙ): /tmp/zar-91-zar-header-logo.png');
}

// ---------- 📸 ЗУРАГ (лого → хайлт хүртэл; 🆕 (91) тусдаа икон БАЙХГҮЙ) ----------
await goto(`${BASE}/`);
const clip = await evalJs(`(() => { const a = [...document.querySelectorAll('header a[href="/"]')].find((x) => /ZarBook/.test(x.textContent || '')); const s = document.querySelector('#home-search'); const r1 = a.getBoundingClientRect(); const r3 = s ? s.getBoundingClientRect() : r1; const left = Math.max(0, Math.round(r1.left) - 12); const right = Math.min(window.innerWidth, Math.round(Math.max(r1.right, r3.left + 60)) + 12); return { x: left, y: Math.max(0, Math.round(r1.top) + 2), width: right - left, height: Math.round(r1.height) + 6 }; })()`);
const shot = await rpc('Page.captureScreenshot', { format: 'png', clip: { ...clip, scale: 3 } });
const fsmod = await import('node:fs');
fsmod.writeFileSync('/tmp/zar-91-desktop-logo.png', Buffer.from(shot.data, 'base64'));
console.log('  📸 зураг (🖥 1280px — лого → хайлт, тусдаа икон БАЙХГҮЙ): /tmp/zar-91-desktop-logo.png');

console.log(`\n${fail === 0 ? '✅' : '❌'} РЕЗУЛЬТАТ: ${ok} OK / ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);

