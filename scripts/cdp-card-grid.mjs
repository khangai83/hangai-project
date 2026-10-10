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
 *   ③ ❤️ нь ҮНИЙ МӨРИЙН БАРУУН захад (🆕 (97); ⏳ (86)-д зургийн баруун дээд
 *      буланд байв) — товчны ДОТОР `HeartIcon` SVG (🆕 (101): emoji БИШ,
 *      текст/тоо ГАРАХГҮЙ) ✓
 *      ⚠️ Товчийг `button[aria-label]`-аар БИШ **`button[data-fav-toggle]`**-оор
 *      олно — каруселийн ‹ › товч МӨН `aria-label`-тай (эхний тохирол нь ‹ товч
 *      болж, ❤️-г алдана ✗)
 *   ③b 🖼 КАРУСЕЛЬ (🆕 2026-10-09 (85)): slide бүр картын өргөнтэй ИЖИЛ
 *      (`scrollWidth ≈ slide × n` ⇒ нэг дор ЯГ 1 зураг), `›` товч дарахад
 *      2 дахь зураг руу ШИЛЖИНЭ (`scrollLeft > 10`), тоолуур «🖼 2/n» болж,
 *      ЗАР РУУ ШИЛЖИХГҮЙ (`/` дээрээ үлдэнэ) · ‹ › ба цэгүүд DOM-д байна ✓
 *      ⚠️ 2+ зурагтай карт ОЛДОХГҮЙ бол (DB-ээс хамаарна) ℹ️ SKIP ✓
 *   ③d 🔀 ҮНЭ нь ГАРЧГИЙН ДЭЭР (🆕 (97) дараалал: үнэ → гарчиг → мэдээлэл → мета)
 *      · ③l карт нь ХАЙРЦАГГҮЙ (`border-top-width: 0px` ба дэвсгэр
 *      `rgba(0, 0, 0, 0)` — жишиг сайтын хэв) ✓ · 🆕 ③m (87) ЗУРГИЙН ХАЙРЦАГ
 *      ч СААРАЛГҮЙ (`bg-gray-100` арилав — «бүх саарал өнгийг үгүй хий») ✓
 *   ③n 🆕 (107) 📍📅 ДООД МЕТА МӨР: **байршил ЭХЭНД, огноо ТӨГСГӨЛД** —
 *      pin (`svg`) нь мета мөрийн ЭХНИЙ хүүхэд, `|` тусгаарлагч байгаа ба
 *      СҮҮЛИЙН хүүхэн дэх текст нь ХАРЬЦАНГУЙ ЦАГ («… минутын өмнө» /
 *      «Өчигдөр» / «2026.10.10») ✓ (хэрэглэгчийн хүсэлт: «swap location, the
 *      date of creation on the card of bottom section») ✓
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
 *   ⚠️ 🆕 (85): БҮХ картыг уншина (`slice(0,8)` БИШ) — каруселийн шалгалт
 *      (③f…③k) нь 2+ ЗУРАГТАЙ карт хайдаг ба тэр нь эхний 8-д байхгүй байж
 *      болно (seed зарууд 1 зурагтай ✗) ⇒ бүх картаас хайна ✓
 */
const PROBE = `(() => {
  const R = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), r: Math.round(b.right), b: Math.round(b.bottom) }; };
  const cards = [...document.querySelectorAll('a[data-listing-card]')];
  return {
    vw: window.innerWidth,
    scrollW: document.documentElement.scrollWidth,
    count: cards.length,
    cards: cards.map((c) => {
      const imgWrap = c.children[0], content = c.children[1];
      const img = imgWrap ? imgWrap.querySelector('img') : null;
      const price = c.querySelector('[class*="text-[22px]"]');
      const heart = c.querySelector('button[data-fav-toggle]');
      const scroller = imgWrap ? imgWrap.querySelector('[data-card-images]') : null;
      const slide0 = scroller ? scroller.firstElementChild : null;
      const title = c.querySelector('[class*="line-clamp-2"]');
      const badge = c.querySelector('[class*="bottom-2"][class*="right-2"]');
      return {
        box: R(c),
        img: imgWrap ? R(imgWrap) : null,
        imgTag: !!img,
        // 🎨 (87): зургийн хайрцаг ч СААРАЛГҮЙ байх ёстой (⏳ bg-gray-100 байв)
        imgBg: imgWrap ? getComputedStyle(imgWrap).backgroundColor : null,
        content: content ? R(content) : null,
        price: price ? R(price) : null,
        heart: heart ? R(heart) : null,
        heartText: heart ? (heart.innerText || '').trim() : '',
        // 🆕 (101): зүрхэн нь emoji БИШ — HeartIcon SVG байх ЁСТОЙ ✓
        heartSvg: heart ? heart.querySelectorAll('svg').length : 0,
        // 🖼 🆕 (85) карусель: slide бүр картын өргөнтэй ИЖИЛ байх ёстой ✓
        slides: scroller ? scroller.querySelectorAll('[data-card-slide]').length : 0,
        slideW: slide0 ? R(slide0).w : 0,
        scrollW: scroller ? scroller.scrollWidth : 0,
        prev: !!c.querySelector('[data-card-prev]'),
        next: !!c.querySelector('[data-card-next]'),
        dots: c.querySelectorAll('[data-card-dots] button').length,
        counter: (c.querySelector('[data-card-counter]') || {}).innerText || '',
        // 🆕 (86): карт нь ХАЙРЦАГГҮЙ (хүрээ/дэвсгэр) — жишиг сайтын хэв ✓
        border: getComputedStyle(c).borderTopWidth,
        bg: getComputedStyle(c).backgroundColor,
        title: title ? R(title) : null,
        countBadge: badge ? R(badge) : null,
        // 🆕 (107): 📍📅 ДООД МЕТА МӨР — байршил ЭХЭНД (pin нь ЭХНИЙ хүүхэд),
        //    огноо ТӨГСГӨЛД; текст нь «Улаанбаатар — Баянгол — 2-р хороо | 2 өдрийн өмнө» ✓
        metaText: (() => { const m = c.querySelector('[data-listing-meta]'); return m ? (m.innerText || '').replace(/\s+/g, ' ').trim() : ''; })(),
        metaSvgInFirst: (() => { const m = c.querySelector('[data-listing-meta]'); return m && m.firstElementChild ? m.firstElementChild.querySelectorAll('svg').length : -1; })(),
        metaLastText: (() => { const m = c.querySelector('[data-listing-meta]'); return m && m.lastElementChild ? (m.lastElementChild.innerText || '').replace(/\s+/g, ' ').trim() : ''; })(),
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
// 🆕 2026-10-09 (84) ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «нэг баганад 4н карт харуулъя. home дээр»
//    ⚠️ (83b)-ээс хойш нүүр дээр сайдбар БАЙХГҮЙ ⇒ 1280px (xl) дээр бүтэн өргөн
//    тул 4 карт ≈290px ✓ (хэсэг сонгосон үед 3 — доорх ①e ✓)
check('①c Нүүр 1280px: эхний мөрөнд ЯГ 4 карт (`xl:grid-cols-4` — 🆕 (84))',
  row1.length === 4, `${row1.length} карт (y ${firstY})`);
const widths = home.cards.map((c) => c.box.w);
check('①d Бүх картын өргөн ИЖИЛ (±2px)', Math.max(...widths) - Math.min(...widths) <= 2,
  `${Math.min(...widths)}…${Math.max(...widths)}px`);

// ---------- ②b ХЭСЭГ (сайдбартай) — 1280px: 3 багана (🆕 (84) хоёр хэвийн нөгөө нь) ----------
await goto(`${BASE}/?section=real-estate`, 1280, 900);
await waitFor(`document.querySelectorAll('a[data-listing-card]').length > 0`);
const sec = await evalJs(PROBE);
const secFirstY = sec.cards[0]?.box.y ?? 0;
const secRow1 = sec.cards.filter((c) => Math.abs(c.box.y - secFirstY) <= 4);
check('①e Хэсэг (280px сайдбартай) 1280px: эхний мөрөнд 3 карт (`xl:grid-cols-3` ✓)',
  secRow1.length === 3, `${secRow1.length} карт`);

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

// 🆕 (101) ⏳ (86)-ийн «зургийн баруун дээд булан» → ОДОО зүрхэн нь ҮНИЙ МӨРИЙН
//    БАРУУН ЗАХАД сууна (жишиг зургийн карт: «218 сая ₮          ♡») ✓
check('③ ❤️ нь ҮНИЙ МӨРИЙН БАРУУН захад (🆕 (97)/(101))', !!c0.heart && !!c0.price
  && c0.heart.y >= c0.price.y - 12 && c0.heart.b <= c0.price.b + 12
  && c0.heart.x > c0.box.x + c0.box.w / 2,
  `heart ${c0.heart?.x},${c0.heart?.y} / price ${c0.price?.x},${c0.price?.y}`);
check('③b ❤️ нь картын БАРУУН ХАГАСТ', !!c0.heart && c0.heart.x > c0.box.x + c0.box.w / 2,
  `heart.x ${c0.heart?.x} > ${Math.round(c0.box.x + c0.box.w / 2)}`);
/** ⚠️ Emoji-гийн variation selector (U+FE0F) нь regex-ийг эвддэг тул цэвэрлэнэ */
const heartClean = (c0.heartText || '').replace(/[\uFE0E\uFE0F]/g, '');
// 🆕 (101) ⏳ «❤️ N»/«🤍 N» emoji текст → ОДОО `HeartIcon` SVG (текст ГАРАХГҮЙ):
//    emoji нь OS бүрд өөрөөр зурагдаж, `text-*` өнгийг дагадаггүй байв ✗
check('③c ❤️ товч нь `HeartIcon` SVG (emoji/тоо БИШ, 🆕 (101))',
  c0.heartSvg === 1 && heartClean === '', `svg ${c0.heartSvg} · текст «${c0.heartText}»`);
check('③d ҮНЭ нь ГАРЧГИЙН ДЭЭР (🆕 (97) дараалал: үнэ → гарчиг → мэдээлэл → мета)',
  !!c0.title && !!c0.price && c0.price.y < c0.title.y, `price.y ${c0.price?.y} < title.y ${c0.title?.y}`);
check('③l 🎨 (86) Карт нь ХАЙРЦАГГҮЙ (хүрээ/сүүдэр/саарал БАЙХГҮЙ)',
  c0.border === '0px' && c0.bg === 'rgba(0, 0, 0, 0)', `border ${c0.border} · bg ${c0.bg}`);
check('③m 🎨 (87) ЗУРГИЙН хайрцаг ч СААРАЛГҮЙ (`bg-gray-100` арилав)',
  c0.imgBg === 'rgba(0, 0, 0, 0)', `img bg ${c0.imgBg}`);
// 🆕 (107) 📍📅 ДООД МЕТА МӨР — хэрэглэгчийн хүсэлт: «swap location, the date of
//    creation on the card of bottom section» ⇒ байршил ЭХЭНД (pin нь ЭХНИЙ
//    хүүхэд), огноо ТӨГСГӨЛД (`|` тусгаарлагчтай) ✓
check('③n 📍📅 (107) Доод мөр: 📍 байршил ЭХЭНД, 📅 огноо ТӨГСГӨЛД',
  !!c0.metaText && c0.metaSvgInFirst === 1 && /\|/.test(c0.metaText)
  && /(Саяхан|минутын өмнө|цагийн өмнө|Өчигдөр|өдрийн өмнө|\d{4}\.\d{2}\.\d{2})/.test(c0.metaLastText),
  `«${c0.metaText}» · last «${c0.metaLastText}» · firstSvg ${c0.metaSvgInFirst}`);
if (c0.countBadge) {
  check('③e 🖼 зургийн тоо нь БАРУУН ДООД буланд',
    c0.countBadge.b <= c0.img.b + 2 && c0.countBadge.x > c0.img.x + c0.img.w / 2,
    `badge.x ${c0.countBadge.x}, badge.b ${c0.countBadge.b}`);
} else {
  console.log('  ℹ️ 🖼 тоолуур — эхний карт 1 зурагтай тул badge байхгүй ✓');
}

// ---------- ②c 🖼 КАРУСЕЛЬ (🆕 2026-10-09 (85)) ----------
/**
 * 🎯 Хэрэглэгчийн хүсэлт: «Мөн дээрх зураг нь жишиг сайт шиг солих боломжтой
 *    болго» ⇒ 📱 swipe (`snap-x`) + 🖥 ‹ › товч + цэгүүд + амьд тоолуур ✓
 * ⚠️ ГЕОМЕТР: slide бүр картын өргөнтэй ИЖИЛ байх ЁСТОЙ (`scrollWidth ≈
 *    slide × n`) — эс бөгөөс нэг дор 2 зураг хэсэгчлэн харагдана ✗
 */
const multi = home.cards.filter((c) => c.slides > 1);
if (!multi.length) {
  console.log('  ℹ️ 🖼 карусель: эхний 8 карт дунд 2+ зурагтай нь алга — ③f…③k алгасна ✓');
} else {
  check('③f 🖼 (85) Олон зурагтай карт бүр ‹ › товчтой', multi.every((c) => c.prev && c.next),
    `${multi.length}/${home.count} карт`);
  check('③g 🖼 (85) slide бүр картын өргөнтэй ИЖИЛ (нэг дор ЯГ 1 зураг)',
    multi.every((c) => Math.abs(c.slideW - c.box.w) <= 2 && Math.abs(c.scrollW - c.slideW * c.slides) <= 4),
    `${multi[0].slides} slide × ${multi[0].slideW}px (card ${multi[0].box.w}, scrollW ${multi[0].scrollW})`);
  check('③h 🖼 (85) ≤5 зурагтай картад ЦЭГИЙН тоо = ЗУРГИЙН тоо',
    multi.filter((c) => c.slides <= 5).every((c) => c.dots === c.slides),
    multi.filter((c) => c.slides <= 5).map((c) => `${c.slides}/${c.dots}`).join(' · ') || '—');
  check('③i 🖼 (85) тоолуур эхний зураг дээр «🖼 1/n»',
    multi.every((c) => /1\s*\//.test((c.counter || '').replace(/[\uFE0E\uFE0F]/g, ''))),
    multi[0].counter);
  // ‹ › товчны БОДИТ даралт (headless: JS `.click()`) ⇒ 2 дахь зураг руу
  const pick = "[...document.querySelectorAll('a[data-listing-card]')].find((c) => c.querySelectorAll('[data-card-slide]').length > 1)";
  await evalJs(`(() => { ${pick}.querySelector('[data-card-next]').click(); return true; })()`);
  const moved = await waitFor(
    `(() => { const c = ${pick}; return !!c && c.querySelector('[data-card-images]').scrollLeft > 10; })()`, 5000);
  const after = await evalJs(`(() => {
    const c = ${pick};
    if (!c) return null;
    const sc = c.querySelector('[data-card-images]');
    const counter = c.querySelector('[data-card-counter]');
    return { scrollLeft: Math.round(sc.scrollLeft), counter: counter ? (counter.innerText || '').trim() : '', path: location.pathname };
  })()`);
  check('③j 🖼 (85) › товч дарахад 2 дахь зураг руу ШИЛЖИНЭ', !!moved && !!after && after.scrollLeft > 10,
    after ? `scrollLeft ${after.scrollLeft}px / slide ${multi[0].slideW}px` : '—');
  check('③k 🖼 (85) тоолуур «🖼 2/n» болов + ЗАР РУУ ШИЛЖИХГҮЙ (navigation ✗)',
    !!after && /2\s*\//.test(after.counter.replace(/[\uFE0E\uFE0F]/g, '')) && after.path === '/',
    after ? `${after.counter} · path ${after.path}` : '—');
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
check('④d Мобайл: ❤️ нь ҮНИЙ МӨРИЙН БАРУУН захад (🆕 (101))', !!m0.heart && !!m0.price
  && m0.heart.y >= m0.price.y - 12 && m0.heart.b <= m0.price.b + 12
  && m0.heart.x > m0.box.x + m0.box.w / 2,
  `heart ${m0.heart?.x},${m0.heart?.y} / price ${m0.price?.x},${m0.price?.y}`);
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

