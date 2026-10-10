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
 *      ⚠️ ЗӨВХӨН `main`-ыг шалгана: `main` нь хуудасны АГУУЛГА ✓
 *   ②b 🌍 **БҮТЭН ХУУДАС** (🆕 (88)) — толгой (`<header>`) ба мобайл доод цэс
 *      (`<nav>`) нь `main`-ЫН ГАДНА байдаг тул тусдаа скан хийнэ: `body *`
 *      дотор крем дүүргэлт **0** ✓ (⏳ (83)-д толгой/доод цэс нь `bg-gray-100`
 *      байсан ⇒ энэ шалгалт унана ✗ — регресс барина)
 *   ⑧ 🏷️ ЗАРЫН ГАРЧИГ (🆕 (88)) — `h1[data-listing-title]` нь хуудас бүрд ЯГ
 *      НЭГ байх ба зар оруулагчийн гарчиг БАЙВАЛ ТОМ (≥18px) БАЛД (700)
 *      харагдана ✓ (байхгүй бол `sr-only` — SEO нь хэвээр ✓)
 *   ③ 🎥 видео · 📋 шинж чанар · 📝 тайлбар · 🗺 газрын зураг — хэсэг бүр
 *      ХАЙРЦАГГҮЙ (`border-radius: 0px`) ба зөвхөн 1px дээд зураастай
 *      (`border-top-width: 1px`) · дотор нь ЦАГААН (саарал дүүргэлтгүй) ✓
 *   ④ 💰 холбоо барих хайрцаг (баруун багана) нь ЦАГААН (`rgb(255, 255, 255)`)
 *      ба сүүдэргүй (`box-shadow: none`) ✓
 *   ⑤ 📱 390px: саарал дүүргэлт 0 ба хэвтээ гүйлт 0 ✓
 *   ⑥ 🐍 JS exception 0 (Leaflet-ээс бусад) ба hydration/
 *      `validateDOMNesting` алдаа 0 ✓
 *   ⑨ 🎨 SVG ИКОНУУД (🆕 (96) · ✏️ (98) ТОМРУУЛАВ · ✏️ (100) ДАХИН) — мета мөр
 *      (`[data-listing-meta]` = `[data-listing-actions]` — 🆕 (97) нэг мөр):
 *      📍 emoji ХАСАГДАЖ `MapPinIcon` (**20×20px**, `vertical-align: -4px` ⇒
 *      хаягны `truncate` эвдрэхгүй), `🔖` БҮХЭЛДЭЭ арилсан (зарын дугаар
 *      ЗӨВХӨН «ID: …» текст) ✓ · 👁 → `EyeIcon` (**20×20px** — 📍-тэй ЯГ ИЖИЛ,
 *      өнгө нь тоолуурынхаас ТОД — хэрэглэгчийн «өнгийг нь тодруулаарай») · 📋
 *      «Зарын дэлгэрэнгүй» хүснэгтийн `dt`/`dd`-д icon/svg 0 · БҮТЭН `main`
 *      дээр 📍/🔖/👁 emoji 0 ✓
 *      · 🆕 (99) ЗАЙ ХААСАН: мөрийн `gap-x` 8px → **4px**, ❤️ ↔ 🔗 **4px**,
 *      ❤️/🔗 нь «ID: …»-ийн ЯГ ДАРАА (`ml-auto` ХАСАГДАВ ⇒ баруун сул зай
 *      > 24px байх ЁСТОЙ — баруун захад түлхэгдсэн бол ✗) ✓
 *      · 🆕 (100) ХҮРЭЭ ХАСАВ + ICON ТОМРУУЛАВ: ❤️/🔗 товчны «surrounding
 *      border» (`border border-gray-200 bg-white`, `px-3`) ХАСАГДАВ ⇒
 *      `border-width: 0px` ба дэвсгэр `rgba(0, 0, 0, 0)`, hover нь зөвхөн
 *      ӨНГӨӨР (`hover:text-red-600` / `hover:text-primary`), `px-1` ✓ ·
 *      (⚠️ 🏷️/🔑 сайдбарын «N идэвхтэй зар» тоолуул нь (95)-ийн feature — ХӨНДӨӨГДӨӨГҮЙ)
 *      · 🆕 (102) ЖИШИГ ЗУРГИЙН «SIZE · FONT · COLOR» (хэрэглэгчийн хавсаргасан
 *      зургийг пикселээр хэмжсэн — 898×135, 1:1 CSS px): ① 🕒 ЦАГИЙН ИКОН
 *      БУЦАВ (`ClockIcon` SVG 20×20px — ⏳ (101)-д ХАСАГДСАН байв) ② мета
 *      ТЕКСТ 13px → **16px** (`text-base`; жишиг: x-height 9px, ascender 12px)
 *      ③ ❤️/↪ PILL нь жишиг зургийн ДҮҮРГЭЛТТЭЙ pill болов: **h 44px**
 *      (`h-11`) · `bg-gray-100` (`rgb(244, 241, 234)`) · `rounded-full`
 *      (9999px) · `text-gray-900` · икон **24px** (`h-6`) — ⏳ (100)-ийн
 *      «дэвсгэргүй» товч нь зургийн pill-тэй таарахгүй байв ✗
 *      (⚠️ ХҮРЭЭ 0px ХЭВЭЭР — (100)-ийн шийдэл хүчинтэй ✓) ④ `🔗` EMOJI →
 *      **`ShareIcon` SVG** (зургийн сум; товч бүрд ЯГ 1 svg) ⑤ СОНГОСОН
 *      ЗУРГИЙН ХЭМЖЭЭ **800×600** (`[data-gallery-main]`, `aspect-[4/3]` +
 *      `max-w-[800px]`) — 1280px дэлгэцэд зүүн слат 858px тул ЯГ 800×600 ✓
 *      ⚠️ мета мөрд SVG 5 болсон (pin · цаг · нүд · зүрхэн · хуваалцах) ⇒
 *      иконуудыг ИНДЕКСЭЭР БИШ `data-icon` АТРИБУТААР олно ✓
 *   ⑦ 📸 /tmp/detail-style-1280.png · /tmp/detail-style-390.png
 *      (+ 🆕 (96) 3× томруулсан: /tmp/detail-meta-1280.png · /tmp/detail-actions-1280.png)
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
 *   ⚠️ 🆕 (102) МЕТА МӨРИЙН ❤️/↪ PILL — хэрэглэгчийн хавсаргасан жишиг зургийн
 *      ДҮҮРГЭЛТТЭЙ товч (`bg-gray-100` ≈ хэмжсэн `#F2F2F3`) нь ГАНЦ ГҮЙЛГЭЭ:
 *      `[data-listing-meta]` дотрын дүүргэлтийг ТООЛОХГҮЙ ✓ (товч нь «хайрцаг/
 *      панель» БИШ — (87)-ийн «галерей/видео/шинж/тайлбар/зураг/хайрцаг» дээрх
 *      саарал дүүргэлтийн ХОРИГ ХЭВЭЭР ✓)
 */
const PROBE = `(() => {
  const GRAY = ['rgb(250, 248, 245)', 'rgb(244, 241, 234)', 'rgb(233, 228, 217)'];
  const R = (el) => { const b = el.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
  const main = document.querySelector('main');
  if (!main) return { noMain: true };
  const els = [...main.querySelectorAll('*')];
  const gray = els
    .filter((el) => GRAY.includes(getComputedStyle(el).backgroundColor) && !el.closest('[data-listing-meta]'))
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
  // 🌍 БҮТЭН ХУУДАСНЫ СКАН (🆕 (88)) — зөвхөн main БИШ: толгой (header) ба
  //    мобайл доод цэс (nav) нь main-ЫН ГАДНА байдаг тул ⏳ өмнөх шалгалт
  //    тэднийг ОГТ хардаггүй байв ✗. Хэрэглэгчийн «бүх саарал өнгийг үгүй хий»
  //    хүсэлт нь ХУУДАС БҮРИЙГ хамарна ⇒ бүх body-г шалгана ✓
  //    ⚠️ Footer (bg-gray-900 = rgb(27,24,21)) ба Leaflet-ийн #ddd нь
  //       крем ЖАГСААЛТАД БАЙХГҮЙ тул тоололцохгүй ✓
  //    ⚠️ ЭНЭ БЛОК ДОТОР BACKTICK БОЛОН DOLLAR-BRACE (interpolation эхлэл)
  //       ХЭРЭГЛЭХГҮЙ — утга нь өөрөө template literal дотор байгаа тул мөр
  //       ТАСАЛЖ, скрипт унана ✗ (тиймээс мөр угсрахдаа + ашиглана ✓)
  const pageGray = [...document.querySelectorAll('body *')]
    .filter((el) => GRAY.includes(getComputedStyle(el).backgroundColor) && !el.closest('[data-listing-meta]'))
    .map((el) => {
      const cls = typeof el.className === 'string' ? el.className : '';
      return el.tagName.toLowerCase() + (cls ? '[' + cls.slice(0, 55) + ']' : '');
    })
    .slice(0, 6);
  // 🏷️ ЗАРЫН ГАРЧИГ (🆕 (88)) — жишиг сайтын хэвээр breadcrumb-ийн доор ТОМ БОЛД
  //    гарчиг. ⚠️ Хуудас бүрд H1 нь ЯГ НЭГ (SEO) — гарчиггүй зар дээр sr-only ✓
  const h1s = [...document.querySelectorAll('h1')];
  const titleEl = document.querySelector('h1[data-listing-title]');
  const tcs = titleEl ? getComputedStyle(titleEl) : null;
  return {
    vw: window.innerWidth,
    scrollW: document.documentElement.scrollWidth,
    grayCount: gray.length,
    graySample: gray,
    pageGrayCount: pageGray.length,
    pageGraySample: pageGray,
    h1Count: h1s.length,
    title: titleEl
      ? {
        text: (titleEl.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40),
        srOnly: titleEl.classList.contains('sr-only'),
        size: tcs.fontSize,
        weight: tcs.fontWeight,
        h: R(titleEl).h,
      }
      : null,
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
check('② `main` дотор СААРАЛ (крем) дүүргэлттэй элемент 0 (⚠️ мета мөрийн ❤️/↪ pill — (102) ГАНЦ ГҮЙЛГЭЭ)',
  d.grayCount === 0, d.grayCount ? `${d.grayCount} → ${d.graySample.join(' | ')}` : '0 ✓');
check('②b 🌍 БҮТЭН ХУУДАС (толгой + мобайл доод цэс оруулаад) СААРАЛГҮЙ — крем дүүргэлт 0',
  d.pageGrayCount === 0, d.pageGrayCount ? `${d.pageGrayCount} → ${d.pageGraySample.join(' | ')}` : '0 ✓');
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
// ---------- ⑧ 🏷️ ЗАРЫН ГАРЧИГ (🆕 (88)) ----------
check('⑧ 🏷️ Хуудас бүрд H1 нь ЯГ НЭГ (`h1[data-listing-title]`)',
  d.h1Count === 1 && !!d.title, `h1 ${d.h1Count} · title ${d.title ? 'yes' : 'no'}`);
if (d.title) {
  // ⚠️ Гарчиг БАЙВАЛ (энэ зар дээр `Test`) тэр нь НҮДЭНД ХАРАГДАХ ёстой —
  //    ТОМ (≥18px) БАЛД (700) ба өндөр > 0 (`sr-only` БИШ) ✓
  const shown = !d.title.srOnly && d.title.h > 0;
  check('⑧b 🏷️ Зар оруулагчийн гарчиг нь breadcrumb-ийн доор ХАРАГДАЖ байна (ТОМ БОЛД)',
    shown && parseInt(d.title.size, 10) >= 18 && d.title.weight === '700',
    `«${d.title.text}» · ${d.title.size}/${d.title.weight} · h ${d.title.h}${shown ? '' : ' ← ХАРАГДАХГҮЙ ✗'}`);
}
/**
 * 📸 ЭЛЕМЕНТИЙГ ТОМРУУЛАН АВАХ (clip) — иконы хэмжээ/өнгийг НҮДЭЭР шалгах
 *   ⚠️ `sel` нь КАВЫН ХААЛТГҮЙ CSS selector байх ЁСТОЙ (ж: `[data-listing-meta]`)
 *   ⚠️ `scroll` — элемент дэлгэцээс ДООШ байвал төв рүү гүйлгэнэ
 */
const shotEl = async (sel, file, { scale = 3, pad = 10, scroll = false } = {}) => {
  if (scroll) {
    await evalJs(`(() => { const e = document.querySelector('${sel}'); if (e) e.scrollIntoView({ block: 'center' }); return true; })()`);
    await new Promise((r) => setTimeout(r, 500));
  }
  //   ⚠️ `Page.captureScreenshot`-ийн `clip` нь ХУУДАСНЫ (document) координат
  //      шаарддаг бол `getBoundingClientRect()` нь VIEWPORT-ын координат
  //      буцаадаг ⇒ `window.scrollX/scrollY`-г НЭМЭХ ЁСТОЙ. Үгүй бол доош
  //      гүйлгэсэн элемент дээр буруу бүс (хуудасны дээд хэсэг) баригдана ✗
  //      (жишээ: `[data-listing-actions]` → оронд нь зургийн хэсэг гарсан ✗)
  const box = await evalJs(`(() => {
    const e = document.querySelector('${sel}');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return {
      x: Math.max(0, r.x + window.scrollX - ${pad}),
      y: Math.max(0, r.y + window.scrollY - ${pad}),
      width: Math.min(r.width + ${pad * 2}, window.innerWidth),
      height: r.height + ${pad * 2},
    };
  })()`);
  if (!box) { console.log(`  ⚠️  ${sel} — зураг авах элемент олдсонгүй`); return; }
  const r = await rpc('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true, // ⚠️ clip нь ХУУДАСНЫ координат (дээрх +)
    clip: { ...box, scale },
  });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
  console.log(`  📸 ${file}`);
};

// ---------- ⑨ 🎨 SVG ИКОНУУД (🆕 (96)) ----------
//   ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «📍 26-р хороо үүний өмнөх icon ийг Газрын зургийн
//   өмнөх шиг болго» · «🔖 Зарын дугаарыг өмнөх icon ийг үгүй хий» · «👁 3 үзсэн
//   -ийг icon ийг соль (Icon явуулав, өнгийг нь тодруулаарай)» · «Зарын
//   дэлгэрэнгүй хэсгийн 🏷️ Үйлдвэрлэгч: гэх мэтийн бүх icon ийг байхгүй болго»
//   ⇒ ⏳ emoji → SVG (`MapPinIcon`/`EyeIcon`), 🔖 ба шинж чанарын icon ХАСАГДАВ ✓
//   ⚠️ ЭНД БОДИТ DOM + `getComputedStyle` ХЭМЖИГДЭНЭ (эх кодын гэрээ БИШ):
//      pin 16px + `vertical-align: -3px` (хаягны `truncate` эвдрэхгүй) ·
//      нүд 20px ба өнгө нь тоолуурынхаас ТОД · `dt` icon/svg 0 · emoji 0 ✓
//   🆕 (97)(98): `[data-listing-actions]` нь мета мөртэй НЭГ div болсон ⇒
//      pin = SVG[0], нүд = SVG[1] ✓
//   🆕 (101): ❤️/🤍 emoji → `HeartIcon` SVG ⇒ зүрхэн = SVG[2] (🔗 нь ХЭВЭЭР
//      emoji/текст — `ShareButton` нь `🔗` тэмдэгт + «Хуваалцах» текст) ✓
const ICONS = `(() => {
  const EMO = ['📍', '🔖', '👁'];
  const SPEC = ['🏷️', '🚗', '📅'];
  const main = document.querySelector('main');
  if (!main) return { noMain: true };
  const flat = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const meta = main.querySelector('[data-listing-meta]');
  const actions = main.querySelector('[data-listing-actions]');
  const metaSvgs = meta ? [...meta.querySelectorAll('svg')] : [];
  //   🆕 (97): 👁/❤️/🔗 нь толгойн мета мөр рүү шилжсэн ⇒ [data-listing-actions]
  //   === [data-listing-meta] (НЭГ л div) тул SVG-үүд нэг дор байна ✓
  //   🆕 (102): мета мөрд SVG 5 болсон (📍 pin · 🕒 цаг · 👁 нүд · ❤️ зүрхэн ·
  //   ↪ хуваалцах) ⇒ ИНДЕКСЭЭР БИШ data-icon АТРИБУТААР олно
  //   (⏳ (97)–(101)-д metaSvgs[0]/[1] индексээр байсан тул цагийн икон
  //   нэмэгдэхэд ШИЛЖИЖ, ⑨e/⑨f/⑨k нь ЧИМЭЭГҮЙ БУРУУ икон хэмжих байв ✗)
  //   ⚠️ favBtn.querySelectorAll('svg') нь ЯГ 1 байх ЁСТОЙ (⑨l) — ↪ нь ӨӨР
  //      товчин дотор тул энэ тоонд ОРОХГҮЙ ✓
  //   ⚠️ (99) ЭНЭ МӨРҮҮД НЬ JS ТЕМПЛЕЙТ МӨР ДОТОР — grave accent (0x60) ХЭРЭГЛЭЖ
  //      БОЛОХГҮЙ ✗ (тэр тэмдэгт мөрийг эрт хааж, ICONS нь ReferenceError-оор
  //      унадаг байв — (97)-д нэмсэн тайлбар дээр гарсан латент алдаа)
  const pin = meta ? meta.querySelector('[data-icon="pin"] svg') : null;
  const pinCs = pin ? getComputedStyle(pin) : null;
  const pinBox = pin ? pin.getBoundingClientRect() : null;
  //   🆕 (102) 🕒 ЦАГИЙН ИКОН — жишиг зургийн мета мөрөнд огнооны өмнө байв
  //   (⏳ (101)-д 🕒 emoji ХАСАГДСАН ⇒ одоо ClockIcon SVG) ✓
  const clock = meta ? meta.querySelector('[data-icon="clock"] svg') : null;
  const clockCs = clock ? getComputedStyle(clock) : null;
  const clockBox = clock ? clock.getBoundingClientRect() : null;
  const clockSpan = clock ? clock.closest('span') : null;
  const eye = meta ? meta.querySelector('[data-icon="eye"] svg') : null;
  const eyeCs = eye ? getComputedStyle(eye) : null;
  const eyeBox = eye ? eye.getBoundingClientRect() : null;
  const viewsSpan = eye ? eye.closest('span') : null;
  //   🆕 (102) 🖼 СОНГОСОН ЗУРГИЙН ХЭМЖЭЭ 800×600 — gallery-ийн ҮНДСЭН зураг
  //   (1280px дэлгэцэд зүүн слат 858px ⇒ max-w-[800px] ХҮЧИНТЭЙ + 4:3 = 800×600)
  const gimg = main.querySelector('[data-gallery-main]');
  const gbox = gimg ? gimg.getBoundingClientRect() : null;
  //   🆕 (99) ЗАЙ ХААХ — ❤️/🔗 pill ба мета хоорондын ЗАЙГ бодитоор хэмжинэ:
  //   idSpan.right (ID текстийн төгсгөл) → favBtn.left = gap-x + ml-1;
  //   rightFree = мөрийн баруун зах хүртэлх СУЛ зай — ml-auto байсан бол 0 ✓
  const metaCs = meta ? getComputedStyle(meta) : null;
  const metaBox = meta ? meta.getBoundingClientRect() : null;
  const idSpan = meta ? meta.querySelector('[title^="Зарын дугаар"]') : null;
  const favBtn = meta ? meta.querySelector('[data-fav-toggle]') : null;
  const shareBtn = meta ? meta.querySelector('[data-share-button]') : null;
  const bx = (el) => (el ? el.getBoundingClientRect() : null);
  const gapIdFav = idSpan && favBtn ? Math.round(bx(favBtn).left - bx(idSpan).right) : null;
  const gapFavShare = favBtn && shareBtn ? Math.round(bx(shareBtn).left - bx(favBtn).right) : null;
  const rightFree = metaBox && shareBtn ? Math.round(metaBox.right - bx(shareBtn).right) : null;
  const feat = main.querySelector('section[data-component="AdvertFeaturesApp"]');
  const dts = feat ? [...feat.querySelectorAll('dt')] : [];
  const dds = feat ? [...feat.querySelectorAll('dd')] : [];
  return {
    noMain: false,
    mainEmoji: EMO.filter((e) => (main.textContent || '').includes(e)),
    metaFound: !!meta,
    metaText: meta ? flat(meta.textContent).slice(0, 90) : null,
    metaEmoji: meta ? EMO.filter((e) => (meta.textContent || '').includes(e)) : [],
    metaSvg: metaSvgs.length,
    pin: pin ? {
      w: Math.round(pinBox.width),
      h: Math.round(pinBox.height),
      va: pinCs.verticalAlign,
      color: pinCs.color,
      trunc: !!meta.querySelector('.truncate'),
    } : null,
    actionsFound: !!actions,
    views: viewsSpan ? flat(viewsSpan.textContent) : null,
    //   🆕 (102) 🕒 цагийн икон + мета мөрийн ФОНТЫН ХЭМЖЭЭ (жишиг: 16px) ✓
    clock: clock ? { w: Math.round(clockBox.width), h: Math.round(clockBox.height), color: clockCs.color } : null,
    clockText: clockSpan ? flat(clockSpan.textContent) : null,
    metaFont: metaCs ? metaCs.fontSize : null,
    //   🆕 (102) gallery-ийн үндсэн зураг (жишиг: 800×600 — 1280px дэлгэцэд) ✓
    gallery: gbox ? { w: Math.round(gbox.width), h: Math.round(gbox.height) } : null,
    eye: eye ? { w: Math.round(eyeBox.width), h: Math.round(eyeBox.height), color: eyeCs.color } : null,
    actionsColor: actions ? getComputedStyle(actions).color : null,
    gap: {
      x: metaCs ? Math.round(parseFloat(metaCs.columnGap) || 0) : null,
      idFav: gapIdFav,
      favShare: gapFavShare,
      rightFree,
      hasFav: !!favBtn,
      hasShare: !!shareBtn,
      //   🆕 (100) «Surrounding border» ХАСАГДАВ эсэхийг бодитоор хэмжинэ —
      //   Tailwind preflight-ийн дараа button-ы border-width нь 0 БАЙХ ЁСТОЙ ✓
      //   (⚠️ ЭНЭ БЛОК МӨН JS ТЕМПЛЕЙТ МӨР ДОТОР — grave accent ХЭРЭГЛЭХГҮЙ ✗)
      favBorder: favBtn ? parseFloat(getComputedStyle(favBtn).borderTopWidth) || 0 : null,
      shareBorder: shareBtn ? parseFloat(getComputedStyle(shareBtn).borderTopWidth) || 0 : null,
      favBg: favBtn ? getComputedStyle(favBtn).backgroundColor : null,
      shareBg: shareBtn ? getComputedStyle(shareBtn).backgroundColor : null,
      /*   🆕 (102) ЖИШИГ ЗУРГИЙН PILL (хэмжсэн: h 44px · bg #F2F2F3 · текст
         #0D0D0E · икон ~22px · хүрээ 0px) ⇒ манай pill: h-11 (44px) ·
         bg-gray-100 (#F4F1EA — Sandstone хувилбар) · rounded-full (9999px) ·
         text-gray-900 · икон 24px (h-6) ✓ */
      favH: favBtn ? Math.round(bx(favBtn).height) : null,
      shareH: shareBtn ? Math.round(bx(shareBtn).height) : null,
      favRadius: favBtn ? getComputedStyle(favBtn).borderRadius : null,
      shareRadius: shareBtn ? getComputedStyle(shareBtn).borderRadius : null,
      favIconSize: favBtn && favBtn.querySelector('svg')
        ? Math.round(favBtn.querySelector('svg').getBoundingClientRect().width) : null,
      shareIconSize: shareBtn && shareBtn.querySelector('svg')
        ? Math.round(shareBtn.querySelector('svg').getBoundingClientRect().width) : null,
      //   🆕 (101) ❤️/🤍 EMOJI → HeartIcon SVG; 🆕 (102) 🔗 EMOJI → ShareIcon
      //   SVG ⇒ товч бүрд ЯГ 1 svg (⏳ (101)-д ↪ товч нь текст/emoji байв) ✓
      favSvg: favBtn ? favBtn.querySelectorAll('svg').length : 0,
      shareSvg: shareBtn ? shareBtn.querySelectorAll('svg').length : 0,
      favText: favBtn ? flat(favBtn.textContent) : null,
      shareText: shareBtn ? flat(shareBtn.textContent) : null,
    },
    dt: {
      count: dts.length,
      svg: dts.filter((d) => d.querySelector('svg')).length,
      sample: dts.slice(0, 3).map((d) => flat(d.textContent)),
    },
    dtEmoji: SPEC.filter((e) => dts.some((d) => (d.textContent || '').includes(e))),
    ddEmoji: SPEC.filter((e) => dds.some((d) => (d.textContent || '').includes(e))),
  };
})()`;
const ic = await evalJs(ICONS);
check('⑨ 🎨 Мета мөр олдлоо (`data-listing-meta`)', !ic.noMain && ic.metaFound, ic.metaText || '—');
check('⑨b 📍 emoji БАЙХГҮЙ — оронд нь `MapPinIcon` SVG 20×20px (🆕 (100) томруулав)',
  !!ic.pin && ic.pin.w === 20 && ic.pin.h === 20, ic.pin ? `${ic.pin.w}×${ic.pin.h}px` : 'SVG алга');
check('⑨c 📍 SVG текстийн урсгалд суусан (`vertical-align: -4px`) — хаягны `truncate` хэвээр',
  !!ic.pin && ic.pin.va === '-4px' && ic.pin.trunc,
  ic.pin ? `va ${ic.pin.va} · truncate ${ic.pin.trunc ? 'yes' : 'no'}` : '—');
check('⑨d 🔖 emoji БАЙХГҮЙ — зарын дугаар ЗӨВХӨН текст «ID:» (мета мөрд emoji 0)',
  ic.metaEmoji.length === 0 && !!ic.metaText && ic.metaText.includes('ID:'),
  ic.metaEmoji.length ? `${ic.metaEmoji.join(' ')} үлдсэн ✗`
    : `${ic.metaSvg} svg (pin + цаг + нүд + зүрхэн + хуваалцах) ✓`);
check('⑨e 👁 emoji БАЙХГҮЙ — «N» нь `EyeIcon` SVG 20×20px (🆕 (100) томруулав)',
  !!ic.eye && ic.eye.w === 20 && ic.eye.h === 20 && /^\d+$/.test((ic.views || '').trim()),
  ic.views ? `${ic.views} · svg ${ic.eye ? `${ic.eye.w}×${ic.eye.h}` : '—'}px` : 'алга');
check('⑨f 👁 иконы өнгө нь тоолуурынхнаас ТОД («өнгийг нь тодруулаарай»)',
  !!ic.eye && !!ic.actionsColor && ic.eye.color !== ic.actionsColor,
  ic.eye ? `${ic.eye.color} ≠ ${ic.actionsColor}` : '—');
check('⑨g 📋 «Зарын дэлгэрэнгүй» хүснэгтийн `dt`/`dd` — icon/svg 0 (emoji 0)',
  ic.dt.count > 0 && ic.dt.svg === 0 && ic.dtEmoji.length === 0 && ic.ddEmoji.length === 0,
  `${ic.dt.count} мөр · svg ${ic.dt.svg} · ${ic.dt.sample.join(' | ')}`);
//   ⚠️ 🏷️/🔑 нь САЙДБАРЫН «📋 N идэвхтэй зар» линкийн тоолуул (🆕 (95)-ийн
//      `sellerStats` — БАЙРШИЛ БА ТҮРЭЭСИЙН тоо) — хэрэглэгчийн «Зарын
//      дэлгэрэнгүй хэсгийн icon»-той ХОЛБООГҮЙ тул ХӨНДӨӨГДӨӨГҮЙ ✓
//      (тиймээс ⑨h нь ЗӨВХӨН 📍/🔖/👁-г бүтэн `main` дээр шалгана ✓)
check('⑨h 📄 БҮТЭН `main` дотор 📍/🔖/👁 emoji 0 (🏷️/🔑 сайдбарын тоолуул ХЭВЭЭР)',
  ic.mainEmoji.length === 0, ic.mainEmoji.length ? `${ic.mainEmoji.join(' ')} үлдсэн ✗` : '0 ✓');
/*   🆕 (99): ЗАЙ ХААХ — ⚠️ БОДИТ `getBoundingClientRect()`-ээр хэмжинэ (тооцоо БИШ) ⇒
     ⛔ `ml-auto` буцаж орвол `rightFree` 0 болж УНАХАР байна (регресс хамгаалалт) ✓
     ⛔ зайг буцаагаад томруулбал `x`/`favShare` ≠ 4px ⇒ УНАХАР ✓ */
check('⑨i 📏 ЗАЙ ХААСАН (🆕 (99)) — мета хооронд 4px · ❤️↔🔗 4px · ❤️/🔗 нь «ID: …»-ийн ЯГ ДАРАА (`ml-auto` ХАСАГДСАН)',
  !!ic.gap && ic.gap.hasFav && ic.gap.hasShare && ic.gap.x === 4 && ic.gap.favShare === 4 &&
    ic.gap.rightFree !== null && ic.gap.rightFree > 24,
  ic.gap
    ? `gap-x ${ic.gap.x}px · ID→❤️ ${ic.gap.idFav}px · ❤️↔🔗 ${ic.gap.favShare}px · баруун сул зай ${ic.gap.rightFree}px`
    : '—');
/*   🆕 (102) ЖИШИГ ЗУРГИЙН PILL (хэмжсэн: **h 44px** · дэвсгэр `#F2F2F3` ·
     текст `#0D0D0E` · икон ~22px · хүрээ 0px) ⇒ ⏳ (100)-ийн «ямар ч
     дэвсгэргүй» товч зургийн pill-тэй ТААРАХГҮЙ байв ✗ ⇒ одоо `h-11` (44px) ·
     `bg-gray-100` (`rgb(244, 241, 234)` = Sandstone хувилбар) · `rounded-full`
     (9999px) · `text-gray-900` · икон 24px (h-6). ⚠️ ХҮРЭЭ 0px ХЭВЭЭР —
     (100)-ийн «surrounding border хас» шийдэл хүчинтэй ✓
     ⛔ дүүргэлт буцаж арилвал (`rgba(0, 0, 0, 0)`) ⇒ УНАХАР ✓ */
check('⑨j 🎨 ЖИШИГ ЗУРГИЙН PILL (🆕 (102)) — ❤️/↪ 44px · `bg-gray-100` · бүрэн дугуй · хүрээ 0px (⏳ (100) ХЭВЭЭР)',
  !!ic.gap && ic.gap.favBorder === 0 && ic.gap.shareBorder === 0 &&
    ic.gap.favH === 44 && ic.gap.shareH === 44 &&
    ic.gap.favRadius === '9999px' && ic.gap.shareRadius === '9999px' &&
    ic.gap.favBg === 'rgb(244, 241, 234)' && ic.gap.shareBg === 'rgb(244, 241, 234)',
  ic.gap
    ? `❤️ ${ic.gap.favH}px · bg ${ic.gap.favBg} · r ${ic.gap.favRadius} · border ${ic.gap.favBorder}px ⟂ ↪ ${ic.gap.shareH}px · bg ${ic.gap.shareBg} · border ${ic.gap.shareBorder}px`
    : '—');
check('⑨k 🔍 ICON ТОМРУУЛАВ (🆕 (100)) — 📍 pin === 👁 нүд (20×20px, ХОЁР ИЖИЛ) — «icon-ыг томруул» хүсэлт ✓',
  !!ic.pin && !!ic.eye && ic.pin.w === 20 && ic.pin.h === 20 && ic.eye.w === 20 && ic.eye.h === 20,
  ic.pin && ic.eye ? `📍 ${ic.pin.w}×${ic.pin.h}px · 👁 ${ic.eye.w}×${ic.eye.h}px` : '—');
/*   🆕 (101) ❤️/🤍 EMOJI → `HeartIcon` SVG (хэрэглэгчийн хавсаргасан жишиг зургийн
     хэв: НИМГЭН ХАР ЗУРААСТАЙ зүрхэн). ⏳ emoji нь OS бүрд өөрөөр зурагдаж,
     `text-*` өнгийг дагадаггүй байв ✗ ⇒ товчин дотор SVG нь ЯГ 1 байх ЁСТОЙ ✓ */
check('⑨l ❤️ EMOJI → SVG (🆕 (101)) — «Таалагдсан» товчинд `HeartIcon` SVG 1 ширхэг (emoji дүрс 0)',
  !!ic.gap && ic.gap.favSvg === 1,
  ic.gap ? `fav svg ${ic.gap.favSvg} · текст «${ic.gap.favText}»` : '—');
/*   🆕 (102) «SIZE · FONT · COLOR» (хэрэглэгч: «copy like attached screenshot card
     details information to Size, font, color») — хавсаргасан зургийг пикселээр
     хэмжсэн 4 гэрээ:
       ① 🕒 ЦАГИЙН ИКОН (⏳ (101)-д ХАСАГДСАН) — огнооны өмнө SVG байх ЁСТОЙ ✓
       ② МЕТА ТЕКСТ **16px** (`text-base`) — жишиг: x-height 9px ⇒ ~16px ✓
       ③ PILL-ийн ИКОН **24px** (`h-6`) — мета иконуудаас (20px) ТОМ ✓
       ④ СОНГОСОН ЗУРГИЙН ХЭМЖЭЭ **800×600** (`[data-gallery-main]`, 4:3) ✓ */
check('⑨m 🕒 ЦАГИЙН ИКОН БУЦАВ (🆕 (102)) — огнооны өмнө `ClockIcon` SVG 20×20px · өнгө нь 👁-тэй ЯГ ИЖИЛ (`text-gray-700`) · ⏳ `🕒` emoji 0',
  !!ic.clock && ic.clock.w === 20 && ic.clock.h === 20 && !!ic.eye && ic.clock.color === ic.eye.color &&
    !!ic.clockText && !/[\u{1F550}\u{1F551}\u{1F552}]/u.test(ic.clockText),
  ic.clock ? `🕒 ${ic.clock.w}×${ic.clock.h}px · ${ic.clock.color} · «${ic.clockText}»` : 'SVG алга');
check('⑨n 📏 МЕТА ТЕКСТ 16px (`text-base`, 🆕 (102)) — жишиг зургийн хэмжээ (⏳ 13px нь жижиг байв ✗)',
  ic.metaFont === '16px', ic.metaFont || '—');
check('⑨o ❤️/↪ PILL-ИЙН ИКОН 24×24px (🆕 (102)) — `HeartIcon` + `ShareIcon` SVG 1/1 (`🔗` emoji 0) · мета иконуудаас (20px) ТОМ ✓',
  !!ic.gap && ic.gap.favIconSize === 24 && ic.gap.shareIconSize === 24 &&
    ic.gap.favSvg === 1 && ic.gap.shareSvg === 1 &&
    !!ic.gap.shareText && !ic.gap.shareText.includes('\u{1F517}'),
  ic.gap
    ? `❤️ ${ic.gap.favIconSize}px (svg ${ic.gap.favSvg}) ⟂ ↪ ${ic.gap.shareIconSize}px (svg ${ic.gap.shareSvg}) · «${ic.gap.shareText}»`
    : '—');
check('⑨p 🖼 СОНГОСОН ЗУРГИЙН ХЭМЖЭЭ 800×600 (🆕 (102)) — `[data-gallery-main]` 1280px дэлгэцэд ЯГ 800×600 (4:3, `max-w-[800px]`) ✓',
  !!ic.gallery && ic.gallery.w === 800 && ic.gallery.h === 600,
  ic.gallery ? `${ic.gallery.w}×${ic.gallery.h}px` : 'зураг алга');
if (ic.metaFound) await shotEl('[data-listing-meta]', '/tmp/detail-meta-1280.png');
if (ic.actionsFound) await shotEl('[data-listing-actions]', '/tmp/detail-actions-1280.png', { scroll: true });

await shot('/tmp/detail-style-1280.png');

// ---------- ③ 📱 390px (мобайл) ----------
await goto(`${BASE}${href}`, 390, 900);
await waitFor(`!!document.querySelector('main') && document.querySelectorAll('main section').length > 0`);
const m = await evalJs(PROBE);
check('⑤b 📱 390px: саарал дүүргэлт 0 (⚠️ мета мөрийн ❤️/↪ pill — (102) ГАНЦ ГҮЙЛГЭЭ)',
  m.grayCount === 0,
  m.grayCount ? `${m.grayCount} → ${m.graySample.join(' | ')}` : '0 ✓');
check('⑤b2 📱 390px: БҮТЭН ХУУДАС (доод цэс оруулаад) сааралгүй',
  m.pageGrayCount === 0, m.pageGrayCount ? `${m.pageGrayCount} → ${m.pageGraySample.join(' | ')}` : '0 ✓');
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


