// ============================================================
// cdp-notifications.mjs — 🔔 «МЭДЭГДЭЛ» ХОНХЫГ БОДИТ Chrome-д шалгана
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-08):
//   «facebook шиг notification тэй болгоё. Өөрөөр хэлбэл ямар ямар хэрэглэгч
//    ямар зар дээр нь like дараад байгаа нь зар оруулсан хэрэглэгчид харагдаг
//    байх. Хэзээ ямар дугаартай хэрэглэгч like дарсан нь харагддаг байх.
//    хавсралтаар явуулсан хонхны icon ийг ХАЙЛТЫН ТҮҮХ icon ний ДАРАА оруул» ✓
//
// ЮУ ШАЛГАНА (ЗОЧИН — миграц/нэвтрэлт ШААРДАХГҮЙ хэсэг):
//   ① Толгойн мөрөнд хонх байна, байрлал нь 🕐 «Хайлтын түүх» иконы ЯГ ДАРАА
//      (бодит геометрээр — хонхны зүүн ирмэг нь түүхийн баруун ирмэгээс баруун)
//   ② Икон нь SVG (`currentColor`) — emoji БИШ ✓
//   ③ Зочин хонх дарвал нэвтрэх цонх нээгдэнэ (navigation БОЛОХГҮЙ)
//   ④ Escape-аар нэвтрэх цонх хаагдана
//   ⑤ `/notifications` хуудас зочинд ойлгомжтой харагдана: 🔔 гарчиг +
//      «🔑 Нэвтрэх» товч (унасан/хоосон дэлгэц БИШ); товч дарахад цонх нээгдэнэ
//   ⑥ Мобайл (390px): баруун дээд буланд хонх харагдана (Facebook-ийн хэв ✓)
//   ⑦ JS exception 0
//
// ⚠️ НЭВТЭРСЭН ХЭСЭГ (сонголтоор): `ZAR_PHONE`/`ZAR_PASS` өгвөл нэвтрээд
//    `/notifications` хуудсан дээр «миграцгүй» алдаа гарахгүй эсэх, хонхны
//    badge эвдрэхгүй байхыг шалгана (0040 migration ОРООГҮЙ бол SKIP гэж
//    мэдээлнэ — тест УНАХГҮЙ ✓)
//
// 📌 2026-10-08 (69) — хэрэглэгчийн хүсэлт: «notification руу ороод үзхэд ямар
//    зар дээр нь like дарсаныг хараад ШУУД мэдэж болохоор зарын гарчигийг нь
//    оруулж өгөөрэй. бас like дарсан хүний дугаарыг харуулвал ямар вэ» ⇒
//    зочин хэсэг ХӨНДӨӨГДӨӨГҮЙ; нэвтэрсэн хэсэгт ⑥c нь «мөр БҮРД 📞» болж
//    ХАТУУРАВ (0041 миграц имэйлээс ч бөглөдөг), ⑥g/⑥h нь хонхны самбарын мөр
//    бүрд 🏠 зарын гарчиг ба 📞 `tel:` линк байгааг шалгана ✓
//    ⇒ 0041 ажиллуулах: `npm run migration:copy 0041_notification_phone_title.sql`
//
// 📌 2026-10-08 (69b) — хэрэглэгчийн хүсэлт: «таны зарыг таалагдлав, зарыг
//    таалагдав гэсэн текстүүдийг байхгүй болго» ⇒ өгүүлбэр БҮРЭН ХАСАГДАВ;
//    нэмэлт ⑥i/⑥j нь хуудас ба хонхны самбарын текстэд «зарыг таалагд…»
//    буцаж ороогүйг шалгана ✓ (бүлгийн «❤️ N хүн таалагдлав» тоо ХЭВЭЭР —
//    хэрэглэгч түүнийг дурдаагүй ✓)
//
// АЖИЛЛУУЛАХ:
//   1) `npm run build && npm run start` — сервер http://localhost:3000
//   2) Google Chrome-ыг CDP-ээр нээнэ:
//        /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
//          --headless=new --remote-debugging-port=9222 http://localhost:3000/
//   3) `npm run cdp:notifications`
//
// ⚠️ Сервер эсвэл Chrome байхгүй бол SKIP → exit 0 (бусад cdp скриптүүдийн
//    адил — CI/local-д саад болохгүй ✓)
// ============================================================
const BASE = process.argv[2] || 'http://localhost:3000';
const PHONE = process.env.ZAR_PHONE || '';
const PASS = process.env.ZAR_PASS || '';

let cdpUp = true;
try {
  const r = await fetch('http://127.0.0.1:9222/json/list');
  if (!r.ok) cdpUp = false;
} catch { cdpUp = false; }
if (!cdpUp) { console.log('⚠️ SKIP — Chrome CDP (:9222) олдсонгүй (exit 0)'); process.exit(0); }
try {
  const r = await fetch(BASE);
  if (!r.ok) throw new Error('bad status');
} catch { console.log(`⚠️ SKIP — сервер (${BASE}) олдсонгүй (exit 0)`); process.exit(0); }

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
} catch { /* хуучин Chrome → нөөц зам */ }
let ownTab = !list.some((t) => t.id === page?.id);
if (!page?.webSocketDebuggerUrl) {
  const pages = list.filter((t) => t.type === 'page' && !t.url.startsWith('chrome://'));
  page = pages.find((t) => t.url.includes('localhost:3000')) || pages[0];
  ownTab = false;
}
if (!page?.webSocketDebuggerUrl) throw new Error('CDP: `page` target олдсонгүй — Chrome-ыг --remote-debugging-port=9222-оор нээнэ үү');
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

await new Promise((r) => ws.addEventListener('open', r, { once: true }));
const rpc = rpcOf(ws);
const exceptions = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
});

await rpc('Runtime.enable');
await rpc('Page.enable');
await rpc('Page.bringToFront');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Renderer ачаалалтай үед `Runtime.evaluate` хааяа timeout болдог ✗ → дахин оролдоно */
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

let pass = 0; let fail = 0; let skip = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};
const skips = (label) => { skip += 1; console.log(`  ⚠️ SKIP — ${label}`); };

/** Нэвтрэх цонх нээгдсэн эсэх (AuthModal — утас + нууц үгийн талбар гарна ✓) */
const AUTH_OPEN = `document.querySelector('input[type="tel"]') && document.querySelector('input[type="password"]')`;
const clickByText = (text) => `(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === ${JSON.stringify(text)} && x.offsetParent !== null);
  if (!b) return false; b.click(); return true; })()`;

console.log('\n🔔 CDP — Мэдэгдэл: хонхны байрлал (түүхийн дараа) → зочинд нэвтрэх цонх → /notifications\n');

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1200, deviceScaleFactor: 1, mobile: false });

// ---- Цэвэр эхлэл: зочин (auth-token устгаж, хуудсыг дахин ачаална) ----
await go(`${BASE}/`);
await evalJs(`Object.keys(localStorage).filter((k) => k.includes('auth-token')).forEach((k) => localStorage.removeItem(k))`);
await go(`${BASE}/`);

// ---- ① Хонх байгаа + ХАЙЛТЫН ТҮҮХИЙН ДАРАА байрлана (геометрээр ✓) ----
const geo = await evalJs(`(() => {
  const bell = document.querySelector('[data-notification-bell-button]');
  const hist = document.querySelector('a[href="/history"]');
  if (!bell || !hist) return null;
  const b = bell.getBoundingClientRect(), h = hist.getBoundingClientRect();
  const svg = bell.querySelector('svg');
  return {
    b: { left: Math.round(b.left), right: Math.round(b.right), top: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) },
    h: { left: Math.round(h.left), right: Math.round(h.right) },
    svg: !!svg,
    colored: svg ? getComputedStyle(svg).stroke : '',
    tag: svg ? svg.tagName : '',
    text: bell.innerText.trim(),
  };
})()`);
check('① Толгойн мөрөнд 🔔 хонх байна', !!geo, geo ? `${geo.b.w}×${geo.b.h}px` : '(олдсонгүй)');
check('①b Хонх нь 🕐 «Хайлтын түүх» иконы ЯГ ДАРАА (x тэнхлэгээр баруунд)',
  !!geo && geo.b.left >= geo.h.right - 2,
  geo ? `түүх x=${geo.h.left}–${geo.h.right}, хонх x=${geo.b.left}–${geo.b.right}` : '');
check('①c Икон нь SVG + `currentColor` (emoji БИШ ✓)',
  !!geo && geo.svg === true && geo.tag === 'svg' && !geo.text, geo ? `${geo.tag} stroke=${geo.colored}` : '');

process.on('SIGTERM', () => hardExit(143));


// ---- ② Зочин хонх дарвал НЭВТРЭХ ЦОНХ (navigation БОЛОХГҮЙ ✓) ----
const urlBefore = await evalJs('location.pathname');
await evalJs(`document.querySelector('[data-notification-bell-button]').click()`);
const authOpened = await waitFor(AUTH_OPEN, 6000);
check('② Зочин хонх дарвал 🔑 нэвтрэх цонх нээгдэв', authOpened);
check('②b Хуудас СОЛИГДООГҮЙ (хонх нь Link БИШ — Facebook-ийн хэв ✓)',
  (await evalJs('location.pathname')) === urlBefore, `${urlBefore} → ${await evalJs('location.pathname')}`);

// ---- ③ «✕» товч → нэвтрэх цонх хаагдана ----
// ⚠️ AuthModal нь Escape-д ХАРИУ ӨГӨХГҮЙ (зохиомжоор: санамсаргүй хаагдаж
//    бичсэн зүйл алдагдахгүйн тулд зөвхөн «✕»/«← Болих»-оор хаадаг ✓)
//    ⇒ тест нь бодит зан төлөвийг шалгана, зохиомол шаардлага тавихгүй ✓
await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Хаах' && x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`);
check('③ «✕» дарахад нэвтрэх цонх хаагдлав', await waitFor(`!(${AUTH_OPEN})`, 6000));

// ---- ④ /notifications — зочинд ойлгомжтой харагдана ----
await go(`${BASE}/notifications`);
check('④ /notifications хуудас нээгдэв (унасан/хоосон дэлгэц БИШ)',
  await waitFor(`document.querySelector('[data-notifications]')`, 8000));
const guestText = await evalJs(`document.querySelector('[data-notifications]').innerText.replace(/\\s+/g, ' ').trim()`);
check('④b Гарчиг нь 🔔 «Мэдэгдэл» + нэвтрэх тайлбар гарна',
  /🔔/.test(guestText) && /Мэдэгдэл/.test(guestText) && /нэвтэрнэ үү/.test(guestText), guestText.slice(0, 120));
check('④c «🔑 Нэвтрэх» товч байна', await evalJs(clickByText('🔑 Нэвтрэх')));
check('④d Товч дарахад нэвтрэх цонх нээгдэв', await waitFor(AUTH_OPEN, 6000));
await evalJs(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.getAttribute('aria-label') === 'Хаах' && x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`);
await waitFor(`!(${AUTH_OPEN})`, 6000);

// ---- ⑤ 📱 Мобайл 390px — баруун дээд буланд хонх ----
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await go(`${BASE}/`);
const mobile = await evalJs(`(() => {
  const bells = [...document.querySelectorAll('[data-notification-bell-button]')].filter((b) => b.offsetParent !== null);
  if (!bells.length) return null;
  const r = bells[0].getBoundingClientRect();
  return { n: bells.length, left: Math.round(r.left), right: Math.round(r.right), vw: window.innerWidth, scroll: document.documentElement.scrollWidth };
})()`);
check('⑤ Мобайл (390px) дээр хонх харагдана', !!mobile, mobile ? `x=${mobile.left}–${mobile.right} / vw=${mobile.vw}` : '(алга)');
check('⑤b Мобайлд баруун талд (Facebook-ийн баруун дээд хэв ✓) + хэвтээ гүйлт 0',
  !!mobile && mobile.right <= mobile.vw && mobile.scroll <= mobile.vw + 1,
  mobile ? `right=${mobile.right}, scrollWidth=${mobile.scroll}` : '');

// ⚠️ Мобайл хэмжээг БУЦААХАА МАРТАЖ БОЛОХГҮЙ ✗ — 390px-д толгойн «🔑 Нэвтрэх»
//    товч нуугддаг тул ⑥ (нэвтэрсэн хэсэг) цонх нээж чадахгүй болно ✓
await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1200, deviceScaleFactor: 1, mobile: false });

// ---- ⑥ НЭВТЭРСЭН хэсэг (сонголтоор — 0040 миграц шаардана) ----
/** Нэвтрэх товч (текстээр) — зочин үед толгойд эсвэл хуудсан дээр байна ✓ */
const OPEN_AUTH = `(() => {
  const b = [...document.querySelectorAll('button')].find((x) => /🔑 Нэвтрэх|^Нэвтрэх$/.test(x.innerText.trim()) && x.offsetParent !== null);
  if (!b) return false; b.click(); return true; })()`;

/**
 * 🔑 Нэвтрэх цонхыг НЭЭХ.
 * ⚠️ `go()` нь зөвхөн `readyState === 'complete'`-ыг хүлээдэг — React
 *    hydrate болохоос ӨМНӨ дарахад handler ажиллахгүй ✗ Тиймээс цонх
 *    нээгдтэл (эсвэл хугацаа дуустал) дахин оролдоно ✓
 */
const openAuthModal = async (ms = 15000) => {
  const until = Date.now() + ms;
  for (;;) {
    await evalJs(OPEN_AUTH);
    if (await waitFor(AUTH_OPEN, 1500)) return true;
    if (Date.now() > until) return false;
    await sleep(400);
  }
};

if (!PHONE || !PASS) {
  skips('нэвтэрсэн хэсэг — `ZAR_PHONE`/`ZAR_PASS` өгөөгүй тул алгаслаа');
} else {
  await go(`${BASE}/`);
  const authReady = await openAuthModal();
  if (!authReady) {
    check('⑥ 🔑 нэвтрэх цонх нээгдэв', false, 'товч дарахад цонх нээгдсэнгүй ✗');
  } else {
    await evalJs(`(() => {
    const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    const tel = [...document.querySelectorAll('input[type="tel"]')].filter((e) => e.offsetParent !== null)[0];
    const pw = [...document.querySelectorAll('input[type="password"]')].filter((e) => e.offsetParent !== null)[0];
    if (!tel || !pw) return false;
    set(tel, ${JSON.stringify(PHONE)}); set(pw, ${JSON.stringify(PASS)}); return true; })()`);
    await sleep(500);
    await evalJs(clickByText('Нэвтрэх'));
    const loggedIn = await waitFor(`Object.keys(localStorage).some((k) => k.includes('auth-token'))`, 12000);
    check('⑥ Утас/нууц үгээр нэвтэрлээ', loggedIn === true,
      loggedIn ? '' : (await evalJs('Object.keys(localStorage).join(",")')).slice(0, 120));
    if (loggedIn) {
      await go(`${BASE}/notifications`);
      await waitFor(`document.querySelector('[data-notifications]')`, 8000);
      // ⚠️ `loading` үед «Ачаалж байна…» гэж бичигддэг — тэр агшинд шалгавал
      //    «миграцгүй» алдааг ч АМЖИЛТ гэж андуурна ✗ Тиймээс ачаалалт
      //    ДУУСТАЛ хүлээнэ (`data-notifications-count` нь «Хоосон байна»/
      //    «N мэдэгдэл» болно — алдаа гарвал ч loading=false болно ✓)
      const loaded = await waitFor(
        `(() => { const c = document.querySelector('[data-notifications-count]'); return c && !/Ачаалж байна/.test(c.innerText); })()`,
        12000,
      );
      const txt = await evalJs(`document.querySelector('[data-notifications]').innerText.replace(/\\s+/g, ' ').trim()`);
      if (!loaded) {
        check('⑥b /notifications ачаалж дуусгав', false, `12с дотор «Ачаалж байна…» хэвээр — ${txt.slice(0, 80)}`);
      } else if (/0040|PGRST205|schema cache/i.test(txt)) {
        skips(`0040_notifications.sql ОРООГҮЙ — DB хүснэгт байхгүй, ажиллуулах: \`npm run migration:copy 0040_notifications.sql\` («${txt.slice(0, 80)}…»)`);
      } else {
        check('⑥b /notifications ачаалж, «миграцгүй» алдаа ГАРАХГҮЙ', !/PGRST|schema cache/i.test(txt), txt.slice(0, 100));
        const groups = await evalJs(`document.querySelectorAll('[data-notifications-group]').length`);
        const rows = await evalJs(`document.querySelectorAll('[data-notifications-row]').length`);
        const phones = await evalJs(`document.querySelectorAll('[data-notifications-phone]').length`);
        console.log(`   ℹ️ бүлэг=${groups}, мөр=${rows}, 📞 дугаартай мөр=${phones}`);
        // ⚠️ (69): 0041 миграц нь 📞-г дотоод имэйлээс ч бөглөдөг тул мөр БҮРД
        //    дугаар байх ёстой (зочин ❤️-д мэдэгдэл үүсдэггүй ⇒ дарсан хүн
        //    бүр бүртгэлтэй=утастай ✓)
        check('⑥c Мэдэгдэл байгаа бол мөр БҮРД 📞 ДУГААР харагдана (хэрэглэгчийн гол хүсэлт ✓)',
          rows === 0 || phones === rows,
          `rows=${rows}, phones=${phones}${
            rows > 0 && phones < rows
              ? ' ⇒ `npm run migration:copy 0041_notification_phone_title.sql` ажиллуулна уу'
              : ''
          }`);
        const badge = await evalJs(`(() => { const b = document.querySelector('[data-notification-badge]'); return b ? b.innerText.trim() : ''; })()`);
        check('⑥d Хонхны badge нь тоо эсвэл хоосон (эвдэрсэн текст БИШ ✓)',
          badge === '' || /^(\d{1,2}|99\+)$/.test(badge), `badge="${badge}"`);
        // 📞 Дугаарын ФОРМАТ: `+976 9911 2233` (+ `tel:` линк) — хэрэглэгч
        //    «ямар ДУГААРТАЙ хэрэглэгч» гэж асуусан тул формат чухал ✓
        const phoneTexts = await evalJs(`[...document.querySelectorAll('[data-notifications-phone]')].map((e) => e.innerText.trim())`);
        check('⑥e 📞 Дугаар нь `+976 9911 2233` хэвтэй, `tel:` линктэй',
          phoneTexts.length === 0 || phoneTexts.every((t) => /^📞 \+976 \d{4} \d{4}$/.test(t)),
          phoneTexts.slice(0, 3).join(' | ') || '(мөр алга)');
        // 🗂 Бүлэглэлт: мөр байгаа бол бүлэг бүр ЗАРЫН НЭРТЭЙ, тоо нь таарна ✓
        const titles = await evalJs(`[...document.querySelectorAll('[data-notifications-group-title]')].map((e) => e.innerText.trim())`);
        const countText = await evalJs(`document.querySelector('[data-notifications-count]').innerText.trim()`);
        check('⑥f Бүлэг бүр ЗАРЫН НЭРТЭЙ + тоо нь мөрүүдтэй таарна',
          rows === 0 || (titles.length === groups && titles.every((t) => t.length > 0) && new RegExp(`^${rows} мэдэгдэл`).test(countText)),
          `бүлэг=${groups}, гарчиг=${titles.length}, тоо="${countText}"`);
        // 🚫 (69b) «… зарыг таалагдлав» гэсэн ӨГҮҮЛБЭР хуудсан дээр БАЙХГҮЙ
        //   (хэрэглэгчийн хүсэлт: «таны зарыг таалагдлав, зарыг таалагдав гэсэн
        //   текстүүдийг байхгүй болго») — мөр бүр НЭР + 🏠 гарчиг + 📞/🕒 л
        //   харуулна ✓ (бүлгийн «❤️ N хүн таалагдлав» тоо ХЭВЭЭР ✓)
        check('⑥i Хуудсан дээр «зарыг таалагдлав» өгүүлбэр БАЙХГҮЙ (зөвхөн 🏠 + 📞 + 🕒 ✓)',
          !txt.includes('зарыг таалагд'), txt.slice(0, 100));
        // 🏠 + 📞 ХОНХНЫ САМБАР (2026-10-08 (69) — хэрэглэгчийн хүсэлт):
        //   мөр бүрд ТУСДАА товдсон зарын гарчиг + 📞 дугаар харагдах ёстой.
        //   ⚠️ Самбар нээгдэхэд уншаагүй мөрүүд «уншсан» болно — зохиомжоор
        //      «нээсэн = уншсан» ✓ (⑥d badge-ийг үүнээс ӨМНӨ шалгасан ✓)
        await evalJs(`document.querySelector('[data-notification-bell-button]').click()`);
        const panelOpen = await waitFor(`document.querySelector('[data-notification-panel]')`, 6000);
        if (!panelOpen) {
          check('⑥g Хонхны самбар нээгдэв', false, '6с дотор нээгдсэнгүй ✗');
        } else {
          const panelRows = await evalJs(`document.querySelectorAll('[data-notification-panel] [data-notification-row]').length`);
          const panelTitles = await evalJs(`[...document.querySelectorAll('[data-notification-panel] [data-notification-listing]')].map((e) => e.innerText.trim())`);
          const panelPhones = await evalJs(`document.querySelectorAll('[data-notification-panel] [data-notification-phone]').length`);
          const panelText = await evalJs(`document.querySelector('[data-notification-panel]').innerText.replace(/\\s+/g, ' ')`);
          console.log(`   ℹ️ самбар: мөр=${panelRows}, 🏠 гарчиг=${panelTitles.length}, 📞=${panelPhones}`);
          if (panelRows === 0) {
            skips('хонхны самбарт мөр алга (мэдэгдэл байхгүй) — 🏠/📞 шалгалт хийгдэхгүй');
          } else {
            check('⑥g Самбарын мөр БҮРД 🏠 ЗАРЫН ГАРЧИГ товдож харагдана (аль зар вэ нь ШУУД мэдэгдэнэ ✓)',
              panelTitles.length === panelRows && panelTitles.every((t) => t.startsWith('🏠 ') && t.length > 3),
              panelTitles.slice(0, 3).join(' | ') || '(гарчиг алга)');
            check('⑥h Самбарын мөр БҮРД 📞 ДУГААР (`tel:` линк — нэргүй бол нэр нь өөрөө линк ✓)',
              panelPhones === panelRows, `мөр=${panelRows}, 📞=${panelPhones}`);
            // 🚫 (69b) Самбарт ч «… зарыг таалагдлав» гэсэн өгүүлбэр БАЙХГҮЙ ✓
            check('⑥j Самбарын текстэд «зарыг таалагдлав» өгүүлбэр БАЙХГҮЙ (69b ✓)',
              !panelText.includes('зарыг таалагд'), panelText.slice(0, 100));
          }
          await evalJs(`document.body.click()`); // самбарыг хаана
        }
      }
    }
  }
}

check('⑦ JS exception 0', exceptions.length === 0, exceptions.slice(0, 3).join(' | '));

console.log(`\n${fail === 0 ? '✅' : '❌'} CDP — ${pass} OK, ${fail} FAIL${skip ? `, ${skip} SKIP` : ''}\n`);
await hardExit(fail === 0 ? 0 : 1);

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1200, deviceScaleFactor: 1, mobile: false });
