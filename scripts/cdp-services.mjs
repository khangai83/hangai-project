/**
 * 🛠️🏥 CDP ШАЛГАЛТ — «Үйлчилгээ» ХЭСГИЙН 3 ТҮВШНИЙ МОД
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-05 (44)):
 *   «Үйлчилгээ > Барилга & Засвар үйлчилгээ дээр Гагнуурын үйлчилгээ гэж нэм.
 *    Үйлчилгээ дээр Эмнэлэг гэж категори оруулаад дараахыг оруул:
 *    Шүдний эмнэлэг · Эрэгтэйчүүдийн эмнэлэг · Эмэгтэйчүүдийн эмнэлэг»
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① 🏷 Бүлгийн ГАРЧИГ 7 мөр (`<p>`) — хуучин ДАРААЛАЛ ХӨНДӨӨГДӨӨГҮЙ,
 *      ХАМГИЙН СҮҮЛД 🆕 «Эмнэлэг»; leaf бүлэг («Хэвлэл, реклам, медиа») нь
 *      ГАРЧИГ БИШ, өөрөө СОНГОГДОХ мөр хэвээр ✓
 *   ② 🔢 Нийт дэд төрөл **52** (28 → 52; ✏️ 2026-10-06 (11): 32 → 52): «Гагнуурын үйлчилгээ» нь
 *      «Барилга & Засвар үйлчилгээ» бүлгийн 6 дахь (сүүлийн) мөр, 🆕 «Эмнэлэг»
 *      бүлэг нь ЯГ 3 дэд төрөлтэй ✓
 *   ③ ⚠️ Бүлгийн НЭР («Эмнэлэг») нь `property_type` БИШ — сонгогдох мөр
 *      БАЙХГҮЙ (DB-д «Эмнэлэг» гэсэн зар ХЭЗЭЭ Ч үүсэхгүй ✓)
 *   ④ 🖱 Дэд төрөл дарж `?section=services&type=…` + breadcrumb 4 түвшин
 *      («Бүх зар › Ажил, Үйлчилгээ › Эмнэлэг › Шүдний эмнэлэг» — ✏️ (45): хэсгийн
 *      нэр ШИНЭЭРЭЭ ✓) ✓
 *   ⑤ 🔗 Шууд линкээр ороход хэсгийн панель ХААЛТТАЙ (дэд төрөл сонгосон
 *      төлөв) — breadcrumb ба гарчиг зөв ✓
 *   ⑥ 📱 390px: «Эмнэлэг» харагдана, 52 мөр (✏️ 2026-10-06 (11): 32 → 52), хэвтээ гүйлт 0 ✓
 *   ⑦ 🧯 JS exception 0
 *
 * 🆕 2026-10-05 (45) (хэрэглэгчийн хүсэлт — 2 зүйл):
 *   ① ✏️ Хэсгийн нэр «Үйлчилгээ» → **«Ажил, Үйлчилгээ»** (`lib/locationData.js`,
 *      `value: 'services'` ХЭВЭЭР ⇒ DB/URL/query хөндөгдөөгүй ✓) ⇒ ⑧ нүүр
 *      хуудсны tile (тоо ХЭВЭЭР 12, хуучин ганц «Үйлчилгээ» tile БАЙХГҮЙ) ба
 *      breadcrumb-д ШИНЭ нэрээр харагдана (хатуу бичсэн газар БАЙХГҮЙ —
 *      бүгд `getSection().label`-аас уншина ✓)
 *   ② 🗑 «Үйлчилгээний хэлбэр» (`workMode`) ба «Үнийн хэлбэр» (`priceUnit`) нь
 *      форм/шүүлт/карт/дэлгэрэнгүйгээс БҮРЭН ХАСАГДАВ ⇒ ⑨ `?section=services`
 *      дээр sidebar-д attr шүүлт ЯГ **1** (🕒 «Ажиллах цаг» — хасагдаагүй ✓)
 *      ба хасагдсан 2 шошго хуудсан дээр ОГТ БАЙХГҮЙ ✓ (⛔ «Дахин ашиглахгүй»)
 *      ⇒ ⑧+⑨ = **7** шинэ шалгалт: **25 → 32 OK** ✓
 *
 * 🆕 2026-10-06 (5) (хэрэглэгчийн хүсэлт: «Нэр / компани, Хамрах хүрээ,
 *    Туршлага, Ажиллах цаг -ийг Ажил, Үйлчилгээ цэснээс байхгүй болго.
 *    Цаашид хэрэглэхгүй»): үлдсэн 4 талбар ч БҮГД ХАСАГДАВ (форм · sidebar
 *    шүүлт · картын мөр · «Зарын дэлгэрэнгүй» хүснэгт) ⇒ ⑨ нь ⑦ болж:
 *    ⓐ sidebar-д attr шүүлт ЯГ **0** (зөвхөн 💰 Үнэ,₮ блок үлдэнэ ✓ — ⚠️
 *       `asideAttrs` нь `[]` болсон ч асуудал БИШ: 🏠 `real-estate` ч
 *       ижил — шүүлтүүд нь тусдаа блок) ⓑ «Ажиллах цаг» ч, 🗑 3 шошго
 *       (Нэр / компани · Хамрах хүрээ · Туршлага) ч хуудсан дээр БАЙХГҮЙ ✓
 *    ⇒ нийт **32 → 35 OK** ✓
 *
 * 🆕 2026-10-06 (11) (хэрэглэгчийн хүсэлт: «Сургалт ба курс -ийг Сургалт, курс
 *    гэж нэрлээд дараахыг дотор нь оруул»): эхний групп «Боловсрол & Сургалт» →
 *    **«Сургалт, курс»** бөгөөд 21 мэргэжлийн курс + хуучин «Тайлан ба төсөл»
 *    /«Орчуулга» ⇒ **23** дэд төрөл (нийт **32 → 52**). ⚠️ Бүлгийн тоо 8 ХЭВЭЭР
 *    (шинэ бүлэг НЭМЭГДЭЭГҮЙ) ⇒ ① гарчиг 7/блок 8 ХЭВЭЭР; ② (32 → 52),
 *    ③ ДАРААЛАЛ (1 дэх нэр), ⑥ 📱 52 ба 🆕 ⑬ (шинэ шалгалт) өөрчлөгдөв
 *    ⇒ **35 → 38 OK** ✓ (⑬ нь 3 ШИНЭ шалгалт: ① «Сургалт, курс» ЯГ 23 мөр
 *    (эхний «Гадаад хэл» / сүүлийн «Бусад») ② бүлгийн нэр нь сонгогдох мөр
 *    БИШ ③ хуучин «Сургалт ба курс» дэд төрөл БАЙХГҮЙ) — ✅ 2026-10-06 (11)-д
 *    БОДИТ Chrome-д (headless, :9222) ажиллуулав: **38 OK / 0 FAIL** ✓
 *
 * ⚠️ 2026-10-05 (45)-д CDP-ийн 2 RACE илэрч ЗАСАВ (доорх тайлбарыг үз):
 *   ① панель нь SSR HTML дээр ч байдаг тул `waitFor(tabs > 0)` нь hydrate-аас
 *      ӨМНӨ биелдэг ⇒ тэр үеийн `click()` нь React-д ХҮРЭХГҮЙ (алга болдог ✗)
 *      → `waitHydrated()` (`__reactProps$…` түлхүүрээр hydrate хүлээнэ;
 *      хэмжсэн: +24ms `SSR_ONLY [0]` → +162ms `HYDRATED [2]`)
 *   ② `URLSearchParams` нь ЗАЙГ `+` болгоно ⇒ шалгалт `dec()` шиг
 *      `.replace(/\+/g, ' ')`-той байх ЁСТОЙ (эс бөгөөс `.includes('… үйлчилгээ')`
 *      ХЭЗЭЭ Ч биелэхгүй ✗)
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээнэ:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-services.mjs   (эсвэл npm run cdp:services)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:filters` ✓
 */

const BASE = process.argv[2] || 'http://localhost:3000';

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
// ⚠️ Chrome-д олон таб нээлттэй байвал хуучин таб нь `Runtime.evaluate`-д
//    хариу өгөхгүй hang болдог ✗ → ШИНЭ таб нээж (PUT /json/new) ажиллана ✓
let page = null;
try {
  const created = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (created.ok) page = await created.json();
} catch { /* хуучин Chrome (PUT дэмжихгүй) → доорх нөөц зам ✓ */ }
let ownTab = !list.some((t) => t.id === page?.id);
if (!page?.webSocketDebuggerUrl) {
  const pages = list.filter((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
  page = pages.find((t) => t.url.includes('localhost:3000')) || pages[0];
  ownTab = false;
}
if (!page?.webSocketDebuggerUrl) throw new Error('CDP: нээлттэй `page` target олдсонгүй — Chrome-ыг --remote-debugging-port=9222-оор нээнэ үү');
try { await fetch(`http://127.0.0.1:9222/json/activate/${page.id}`); } catch { /* алгасна */ }
const ws = new WebSocket(page.webSocketDebuggerUrl);
/** ℹ️ Скрипт дуусахад (амжилттай ч, алдаатай ч) өөрөө нээсэн табаа ХААНА ✓ */
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
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
});

await rpc('Runtime.enable');
await rpc('Page.enable');
// ⚠️ `PUT /json/new` нь табыг BACKGROUND-д нээдэг → идэвхгүй табын renderer
//    хүйтэн болж `Runtime.evaluate` нь 30с timeout болдог ✗ → FRONT-д гаргана ✓
await rpc('Page.bringToFront');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** ⚠️ Renderer ачаалалтай үед `Runtime.evaluate` хааяа timeout болдог ✗ → дахин оролдоно */
const evalJs = async (expression) => {
  const call = async () => {
    const r = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) {
      const d = r.exceptionDetails;
      throw new Error('eval: ' + String(d.exception?.description || d.text));
    }
    return r.result.value;
  };
  try {
    return await call();
  } catch (err) {
    if (!/timeout/.test(String(err.message))) throw err;
    await sleep(1500);
    return call();
  }
};
/** Нөхцөл биелэх хүртэл хүлээнэ (тогтмол `sleep`-ээс найдвартай ✓) */
const waitFor = async (expression, ms = 12000) => {
  const until = Date.now() + ms;
  for (;;) {
    try { if (await evalJs(`!!(${expression})`)) return true; } catch { /* хуудас солигдож байна */ }
    if (Date.now() > until) return false;
    await sleep(200);
  }
};
const go = async (url) => {
  await rpc('Page.navigate', { url });
  await waitFor(`document.readyState === 'complete'`);
  await sleep(400);
};
/** 🏠 ХЭСГИЙН ПАНЕЛИЙН төлөв — `data-section-panel` доторхыг л тоолно ✓
 *  ⚠️ ЭНЭ PROBE нь TEMPLATE LITERAL — коммент дотор BACKTICK БИЧИХГҮЙ ✗ */

console.log('\n🛠️🏥 CDP — Ажил, Үйлчилгээ: 3 түвшний мод + ✏️🗑 нэр/2 талбар (2026-10-05 (44)+(45))\n');

/** 🛠 ПАНЕЛИЙН төлөв — `[data-section-panel]` дотроос л тоолно ✓
 *  ⚠️ Дэд төрөл сонгомогц панель БҮРЭН арилдаг тул энэ нь ЗӨВХӨН
 *     «хэсэг сонгосон, дэд төрөл сонгоогүй» төлөвт утгатай — доорх
 *     `pageUi()` нь тэр үед ч ажиллана ✓ */
const panelUi2 = () => evalJs(`(() => {
  const panel = document.querySelector('[data-section-panel]');
  if (!panel) return { panel: false };
  const txt = (el) => (el.innerText || el.textContent || '').trim();
  const heads = [...panel.querySelectorAll('p')]
    .filter((p) => String(p.className || '').includes('text-primary-dark'));
  const lists = [...panel.querySelectorAll('div[role="tablist"]')].map((d) => ({
    label: d.getAttribute('aria-label'),
    items: [...d.querySelectorAll('button[role="tab"]')].map(txt),
  }));
  return {
    panel: true,
    heads: heads.map(txt),
    lists,
    tabs: [...panel.querySelectorAll('button[role="tab"]')].map(txt),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
})()`);

/** 🧭 ХУУДСНЫ төлөв (панель БАЙХГҮЙ үед ч) — breadcrumb / h1 / overflow */
const pageUi = () => evalJs(`(() => {
  const crumb = document.querySelector('nav[aria-label="Замчилсан цэс"]');
  const h1 = document.querySelector('h1');
  const txt = (el) => (el ? String(el.innerText || '').replace(/\\s+/g, ' ').trim() : null);
  return {
    crumb: txt(crumb),
    h1: txt(h1),
    overflow: document.documentElement.scrollWidth - window.innerWidth,
  };
})()`);

/** 🏠 НҮҮР ХУУДСНЫ tile + ASIDE төлөв — 🆕 2026-10-05 (45): хэсгийн нэр
 *  (label) ба attr шүүлтийн CDP дэгээ ✓
 *  ⚠️ ЭНЭ PROBE нь TEMPLATE LITERAL — коммент дотор BACKTICK БИЧИХГҮЙ ✗ */
const navProbe = () => evalJs(`(() => {
  const txt = (el) => (el ? String(el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim() : '');
  const crumb = document.querySelector('nav[aria-label="Замчилсан цэс"]');
  return {
    tiles: [...document.querySelectorAll('.tile-grid button[role="tab"]')].map(txt),
    asideAttrs: [...document.querySelectorAll('aside [data-attr-filter]')].map((el) => el.getAttribute('data-attr-filter')),
    asideText: txt(document.querySelector('aside')),
    crumb: txt(crumb),
    bodyText: txt(document.body),
  };
})()`);

/** 🖱 Панель доторх дэд төрлийн мөрийг ШОШГООР нь дарна */
const clickTab = (label) => evalJs(`(() => {
  const panel = document.querySelector('[data-section-panel]');
  if (!panel) return 'NO_PANEL';
  const b = [...panel.querySelectorAll('button[role="tab"]')]
    .find((x) => ((x.innerText || x.textContent || '').trim() === ${JSON.stringify(label)}));
  if (!b) return 'NOT_FOUND';
  b.click();
  return 'OK';
})()`);

/**
 * 🖱 Дэд төрөл дарж, URL-д утга нь ОРОХЫГ хүлээнэ — 2 race-ийг ЗАСАВ.
 *
 * 🔴 RACE ① (2026-10-05 (45)-д CDP барив): панель нь **SSR HTML** дээр ч байдаг
 *    тул `waitFor(tabs > 0)` нь **React hydrate болохоос ӨМНӨ** биелчихдэг ✗ →
 *    тэр үед дарсан click нь React-ийн `onClick` руу ХҮРЭХГҮЙ (алга болно)
 *    ⇒ URL/breadcrumb ХӨДӨЛӨХГҮЙ ✗ (шууд линкээр орох нь SSR тул
 *    ХӨНДӨГДӨХГҮЙ ✓ — тиймээс зөвхөн ЭНЭ 2 «🖱 дарж шалгах» алхам өртдөг).
 *    ✅ Шийдэл: `waitHydrated()` (доор) — дарахын ӨМНӨ hydrate-ыг хүлээнэ.
 * 🔴 RACE ② `URLSearchParams` нь ЗАЙГ `+` болгоно (ж: `Гагнуурын+үйлчилгээ`) ⇒
 *    `decodeURIComponent` дангаараа ЗАЙ болгохгүй тул `.includes('… үйлчилгээ')`
 *    ХЭЗЭЭ Ч биелэхгүй ✗ (скрипт өөрөө `dec()`-ээр `+`→зай хийдэг ✓).
 *    ✅ Шийдэл: ЭНД Ч `.replace(/\+/g, ' ')` ЗААВАЛ ✓
 * ⚠️ Олон удаа дарах нь «дахин сонгох/солих» эрсдэлтэй тул `tries` ЦӨӨН (3) ба
 *    бүр оролдлого 8с хүлээнэ (хэмжсэн: даралт ~53ms-д биелдэг ✓).
 */
const clickSubtypeUntilUrl = async (label, tries = 3) => {
  const want = `decodeURIComponent(location.search).replace(/\\+/g, ' ').includes(${JSON.stringify(label)})`;
  for (let i = 0; i < tries; i += 1) {
    const r = await clickTab(label);
    if (r === 'NO_PANEL' || r === 'NOT_FOUND') return r;
    if (await waitFor(want, 8000)) return 'OK';
    await sleep(300);
  }
  return 'TIMEOUT';
};

/**
 * 🧪 React hydrate болсон эсэхийг хүлээнэ — React нь DOM зангилаа дээр
 * `__reactProps$…` / `__reactFiber$…` туслах түлхүүр үлдээдэг ⇒ SSR HTML дээр
 * 0 түлхүүр, hydrate болмогц 2 түлхүүр гарч ирнэ ✓
 * (хэмжсэн: `+24ms SSR_ONLY [0]` → `+162ms HYDRATED [2]`)
 * ⚠️ Үүнгүйгээр hydrate-аас ӨМНӨ дарсан click нь алга болно ✗ (RACE ①)
 */
const waitHydrated = async (ms = 15000) => waitFor(
  `!!(() => { const b = document.querySelector('[data-section-panel] button[role="tab"]'); return b && Object.keys(b).some((k) => k.startsWith('__reactProps')); })()`,
  ms,
);

let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};
const url = () => evalJs('location.search');
const dec = (u) => decodeURIComponent(String(u)).replace(/\+/g, ' ');
const ORDER_7 = 'Сургалт, курс|Барилга & Засвар үйлчилгээ|Өрх гэр & Ахуйн үйлчилгээ|'
  + 'Аялал, Амралт & Гоо сайхан|Технологи & Авто засвар|Бизнес, Санхүү & Хууль|Эмнэлэг';

// ═══════════════════ 🖥 DESKTOP (1280px) ═══════════════════
await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });
await go(`${BASE}/?section=services`);
await waitFor(`document.querySelectorAll('[data-section-panel] button[role="tab"]').length > 0`);
const s = await panelUi2();

check('🛠 Хэсгийн панель нээгдэв (`[data-section-panel]`)', s.panel === true);
check('🏷 Бүлгийн ГАРЧИГ 7 (`<p>`) — 8 дахь (leaf «Хэвлэл, реклам, медиа») нь СОНГОГДОХ мөр',
  s.heads.length === 7, `heads=${s.heads.length}`);
check('🏷 Гарчгуудын дараалал ХЭВЭЭР + ХАМГИЙН СҮҮЛД «Эмнэлэг» (хуучин 7 ХӨНДӨӨГДӨӨГҮЙ)',
  s.heads.join('|') === ORDER_7, s.heads.join(' | '));
check('🗂 Блок (tablist) 8 — бүлэг 7 + leaf 1', s.lists.length === 8, `lists=${s.lists.length}`);
check('🔢 Нийт дэд төрөл 32 → 52', s.tabs.length === 52, `tabs=${s.tabs.length}`);

// 🆕 ⑬ 2026-10-06 (11) — 1 дэх групп «Боловсрол & Сургалт» → «Сургалт, курс»
const kurs = s.lists.find((g) => g.label === 'Сургалт, курс') || { items: [] };
check('🆕 «Сургалт, курс» бүлэг ЯГ 23 дэд төрөлтэй (ЭХНИЙ «Гадаад хэл», СҮҮЛИЙН «Бусад»)',
  kurs.items.length === 23 && kurs.items[0] === 'Гадаад хэл'
    && kurs.items[kurs.items.length - 1] === 'Бусад',
  `${kurs.items.length}: ${kurs.items.slice(0, 3).join(' | ')} … ${kurs.items.slice(-3).join(' | ')}`);
check('🏷 «Сургалт, курс» (бүлгийн нэр) нь СОНГОГДОХ мөр БИШ (`property_type` болохгүй ✓)',
  !s.tabs.includes('Сургалт, курс'));
check('🚫 ХУУЧИН «Сургалт ба курс» дэд төрөл БАЙХГҮЙ (тэр нэрээр DB-д зар байвал `0030` → «Бусад»)',
  !s.tabs.includes('Сургалт ба курс'));

const build = s.lists.find((g) => g.label === 'Барилга & Засвар үйлчилгээ') || { items: [] };
check('🆕 «Гагнуурын үйлчилгээ» — «Барилга & Засвар үйлчилгээ» бүлгийн 6 дахь (СҮҮЛИЙН) мөр',
  build.items.join('|') === 'Барилгын бүх ажил|Цахилгаан бараа засвар|Тавилга ба мужаан|Түлхүүр/цоож засвар|Сантехник|Гагнуурын үйлчилгээ',
  build.items.join(' | '));

const em = s.lists.find((g) => g.label === 'Эмнэлэг') || { items: [] };
check('🆕 «Эмнэлэг» бүлэг ЯГ 3 дэд төрөлтэй (хэрэглэгчийн жагсаалтын дарааллаар)',
  em.items.join('|') === 'Шүдний эмнэлэг|Эрэгтэйчүүдийн эмнэлэг|Эмэгтэйчүүдийн эмнэлэг',
  em.items.join(' | '));
check('⚠️ «Эмнэлэг» (бүлгийн нэр) нь СОНГОГДОХ мөр БИШ (бүлэг нь property_type болохгүй ✓)',
  !s.tabs.includes('Эмнэлэг'));
check('📐 Хэвтээ гүйлт БАЙХГҮЙ (1280px)', s.overflow <= 0, `overflow=${s.overflow}`);

// ─────── 🖱 «Шүдний эмнэлэг» → URL + breadcrumb (3 дахь түвшин нэмэгдэнэ) ───────
// ⚠️ 2 race: ① панель нь SSR-д ч байдаг (hydrate-аас өмнөх даралт алга болдог)
//    ② URL нь breadcrumb-аас ХОЦРОХ (router.replace) ⇒ эхлээд hydrate, дараа нь
//    «дарах + URL хүлээх» (`clickSubtypeUntilUrl`) ✓
await waitHydrated();
check('🖱 «Шүдний эмнэлэг» дэд төрөл дардагдаж, URL шинэчлэгдэв',
  (await clickSubtypeUntilUrl('Шүдний эмнэлэг')) === 'OK');
await waitFor(`/Шүдний эмнэлэг/.test(decodeURIComponent(location.search))`);
const q2 = dec(await url());
check('🔗 URL нь `?section=services&type=Шүдний эмнэлэг`',
  q2.includes('section=services') && q2.includes('type=Шүдний эмнэлэг'), q2);
await waitFor(`/Шүдний эмнэлэг/.test(String((document.querySelector('nav[aria-label="Замчилсан цэс"]') || {}).innerText || ''))`);
const s2 = await pageUi();
const c2 = String(s2.crumb || '');
// ✏️ 2026-10-05 (45): хэсгийн нэр «Үйлчилгээ» → «Ажил, Үйлчилгээ» — breadcrumb
//    дээр ШИНЭ нэрээр харагдана (шинэ нэр нь «Үйлчилгээ» гэдгийг агуулна ✓)
check('🧭 Breadcrumb 4 түвшин — «Ажил, Үйлчилгээ › Эмнэлэг › Шүдний эмнэлэг» дараалалтай',
  c2.includes('Ажил, Үйлчилгээ') && c2.includes('Эмнэлэг') && c2.includes('Шүдний эмнэлэг')
  && c2.indexOf('Ажил, Үйлчилгээ') < c2.indexOf('Эмнэлэг') && c2.indexOf('Эмнэлэг') < c2.indexOf('Шүдний эмнэлэг'), c2);
check('🏷 Үр дүнгийн гарчиг `Шүдний эмнэлэг …`', /Шүдний эмнэлэг/.test(String(s2.h1 || '')), String(s2.h1));
check('📐 Дэд төрөл сонгосон үед мобайл/десктоп гүйлт 0', s2.overflow <= 0, `overflow=${s2.overflow}`);

// ─────── 🖱 «Гагнуурын үйлчилгээ» → БАРИЛГА бүлгийн breadcrumb (шинэ leaf) ───────
await go(`${BASE}/?section=services`);
await waitFor(`document.querySelectorAll('[data-section-panel] button[role="tab"]').length > 0`);
await waitHydrated();
check('🖱 «Гагнуурын үйлчилгээ» дэд төрөл дардагдаж, URL шинэчлэгдэв',
  (await clickSubtypeUntilUrl('Гагнуурын үйлчилгээ')) === 'OK');
// ⚠️ URL нь breadcrumb-аас ХОЦРОХ хааяа тохиолддог (router.replace) → URL-ээ хүлээнэ ✓
await waitFor(`/Гагнуурын үйлчилгээ/.test(decodeURIComponent(location.search))`);
const q3 = dec(await url());
check('🔗 URL нь `?section=services&type=Гагнуурын үйлчилгээ`',
  q3.includes('type=Гагнуурын үйлчилгээ'), q3);
await waitFor(`/Гагнуурын үйлчилгээ/.test(String((document.querySelector('nav[aria-label="Замчилсан цэс"]') || {}).innerText || ''))`);
const s3 = await pageUi();
const c3 = String(s3.crumb || '');
check('🧭 Breadcrumb — «Барилга & Засвар үйлчилгээ › Гагнуурын үйлчилгээ» дараалалтай',
  c3.includes('Барилга & Засвар үйлчилгээ') && c3.includes('Гагнуурын үйлчилгээ')
  && c3.indexOf('Барилга & Засвар үйлчилгээ') < c3.indexOf('Гагнуурын үйлчилгээ'), c3);
check('🏷 Үр дүнгийн гарчиг `Гагнуурын үйлчилгээ …`', /Гагнуурын үйлчилгээ/.test(String(s3.h1 || '')), String(s3.h1));

// ─────── 🔗 ШУУД ЛИНК (3 дахь шинэ дэд төрөл) ───────
await go(`${BASE}/?section=services&type=Эмэгтэйчүүдийн эмнэлэг`);
await waitFor(`/Эмэгтэйчүүдийн эмнэлэг/.test(String((document.querySelector('nav[aria-label="Замчилсан цэс"]') || {}).innerText || ''))`);
const s4 = await pageUi();
const c4 = String(s4.crumb || '');
check('🔗 Шууд линк — breadcrumb «Эмнэлэг › Эмэгтэйчүүдийн эмнэлэг»',
  c4.includes('Эмнэлэг') && c4.includes('Эмэгтэйчүүдийн эмнэлэг'), c4);
check('🖥 Шууд линкээр ороход хэсгийн панель ХААЛТТАЙ (дэд төрөл сонгосон ✓)',
  (await panelUi2()).panel === false);
check('🏷 Үр дүнгийн гарчиг `Эмэгтэйчүүдийн эмнэлэг …`',
  /Эмэгтэйчүүдийн эмнэлэг/.test(String(s4.h1 || '')), String(s4.h1));

// ═══════════════════ 📱 МОБАЙЛ (390px) ═══════════════════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await go(`${BASE}/?section=services`);
await waitFor(`document.querySelectorAll('[data-section-panel] button[role="tab"]').length > 0`);
const m = await panelUi2();
check('📱 390px — «Эмнэлэг» гарчиг ХАРАГДАНА', m.heads.includes('Эмнэлэг'), m.heads.join(' | '));
check('📱 390px — дэд төрөл 52 ХЭВЭЭР (бүгд нээлттэй ✓)', m.tabs.length === 52, `tabs=${m.tabs.length}`);
check('📱 390px — хэвтээ гүйлт (overflow) 0', m.overflow <= 0, `overflow=${m.overflow}`);

// ═══ ✏️🗑 2026-10-05 (45): ХЭСГИЙН НЭР + ХАСАГДСАН 2 ТАЛБАР ═══
// ① ✏️ «Үйлчилгээ» → «Ажил, Үйлчилгээ» — нүүр хуудсны tile дээр (`SECTIONS`)
await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });
await go(`${BASE}/`);
await waitFor(`document.querySelectorAll('.tile-grid button[role="tab"]').length > 0`);
const home = await navProbe();
// ✏️ 2026-10-05 (45): хэсгийн нэр «Үйлчилгээ» → «Ажил, Үйлчилгээ» — tile-ийн
//    текст нь `<icon> <нэр>` (ж: «🛠️ Ажил, Үйлчилгээ») тул `includes`-ээр ✓
check('✏️ Нүүр tile: шинэ нэр «Ажил, Үйлчилгээ» (tile-ийн тоо ХЭВЭЭР 12)',
  home.tiles.some((t) => t.includes('Ажил, Үйлчилгээ')) && home.tiles.length === 12,
  `tiles=${home.tiles.length}`);
check('🚫 Хуучин ганц «Үйлчилгээ» гэсэн tile БАЙХГҮЙ',
  !home.tiles.some((t) => t.trim() === '🛠️ Үйлчилгээ' || t.trim() === 'Үйлчилгээ'),
  home.tiles.join(' | '));

// ② 🗑 «Үйлчилгээний хэлбэр» (`workMode`) + «Үнийн хэлбэр» (`priceUnit`) — 2026-10-05 (45)
//    🆕 2026-10-06 (5): 🕒 «Ажиллах цаг» (`availability`) Л ХАСАГДАВ ⇒ ЯГ **0** шүүлт
await go(`${BASE}/?section=services`);
await waitFor(`document.querySelectorAll('[data-section-panel] button[role="tab"]').length > 0`);
const nx = await navProbe();
check('🗑 Sidebar-д attr шүүлт ЯГ 0 — 4 талбар (Нэр/компани · Хамрах хүрээ · Туршлага · Ажиллах цаг) БҮГД ХАСАГДАВ',
  nx.asideAttrs.length === 0, nx.asideAttrs.join(' | ') || '(0)');
// ⚠️ Дэд шалгалт: хас «Ажиллах цаг» нь БАЙХГҮЙ (өмнө нь энэ нь ЦОРЫН ганц
//    үлдсэн шүүлт байв — 2026-10-05 (45)) ба хасагдсан 3 шошго ч БАЙХГҮЙ ✓
check('🗑 🕒 «Ажиллах цаг» (=`availability`) хуудсан дээр ОГТ БАЙХГҮЙ',
  !String(nx.asideText || '').includes('Ажиллах цаг'));
['Нэр / компани', 'Хамрах хүрээ', 'Туршлага'].forEach((label) => {
  check(`🗑 «${label}» хуудсан дээр ОГТ БАЙХГҮЙ`,
    !String(nx.bodyText || '').includes(label));
});
check('🗑 «Үйлчилгээний хэлбэр» (=`workMode`) хуудсан дээр ОГТ БАЙХГҮЙ',
  !String(nx.bodyText || '').includes('Үйлчилгээний хэлбэр'));
check('🗑 «Үнийн хэлбэр» (=`priceUnit`) хуудсан дээр ОГТ БАЙХГҮЙ',
  !String(nx.bodyText || '').includes('Үнийн хэлбэр'));
check('🧭 `?section=services` breadcrumb-д шинэ нэр «Ажил, Үйлчилгээ»',
  String(nx.crumb || '').includes('Ажил, Үйлчилгээ'), String(nx.crumb));

check('🧯 JS exception 0', exceptions.length === 0, exceptions.slice(0, 3).join(' | '));

console.log(`\n${fail === 0 ? '✅' : '❌'} CDP — ${pass} OK, ${fail} FAIL\n`);
await hardExit(fail === 0 ? 0 : 1);

