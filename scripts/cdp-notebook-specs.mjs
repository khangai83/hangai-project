/**
 * 🖥 CDP ШАЛГАЛТ — 💻 Notebook-ийн ШҮҮЛТ (📺 Дэлгэц · ⚙️ CPU · 🧠 RAM · 💾 Хард)
 *
 * 🆕 2026-10-03 (7): ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (unegui.mn-ийн Notebook хайлтын зураг):
 *   «notebook хайх дээр Дэлгэцийн хэмжээ · CPU · RAM · SSD Hard шүүлтүүд
 *    гардаг байх» ⇒ 💻 `computers` хэсгийн sidebar-д 4 шүүлт НЭМЭГДЭВ
 *   (форм дээр аль хэдийн байсан `onlySubtypes` талбаруудыг шүүлтэд холбов).
 *
 * 🆕 2026-10-05 (43): тэр 4 үзүүлэлт + ✅ «Төлөв» (⏳ хуучин нэр «Шинэ /
 *   Шинэвтэр / Хуучин») нь САЙДБАРААС ГАРЧ, үр дүнгийн дээрх ХЭВТЭЭ мөр
 *   (`#filter-bar`) дээр eBay-ийн «Color ⌄» шиг PILL болов.
 *   ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Дэлгэцийн хэмжээ, CPU, RAM, SSD Hard, Төлөв
 *   эдгээрийг мөн хайдаг болгоод өг» + «Шинэ, Шинэвтэр, Хуучин ийг Төлөв гэж
 *   нэрлэ» ⇒ `lib/locationData.js`-д `filterBar: true` (+ `label: 'Төлөв'`).
 *   ⚠️ Утга/`options`/URL параметрийн нэр ХӨНДӨГДӨӨГҮЙ — зөвхөн DB дээр
 *      `attrs->>cpu=eq.X` → `attrs->>cpu=in.(X)` (олон сонголт, OR) болов ✓
 *
 * 🆕 2026-10-06 (17) (хэрэглэгчийн хүсэлт: «…Компьютер, Дагалдах хэрэгсэл болон
 *   бусад хэсгийн Төлөв сонголтыг ч Дэлгэрэнгүй хайлт хэсэгт оруул»): ✅ «Төлөв»
 *   нь ХЭСЭГ БҮРД сайдбарт («Дэлгэрэнгүй хайлт») БУЦАВ ⇒ 💻 Notebook дээр
 *   `#filter-bar`-т ЗӨВХӨН 📺/⚙️/🧠/💾 4 pill үлдэв; 🚗 авто дээр 🎨/⛽/⚙️
 *   (`afterPayment: 1|2|3`) ч сайдбарт буцаж, «💳 Төлбөрийн нөхцөл»-ийн ЯГ
 *   АРАА гарав (хүсэлт: «Өнгө, Түлш, Хурдны хайрцаг … Төлбөрийн нөхцөлийн
 *   ардаас оруул») ⇒ 🚗/🏠-аас бусад хэсэгт `#filter-bar` ОГТ БАЙХГҮЙ ✓
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ:
 *   ① `?section=computers&type=Notebook` (Notebook дэд төрөл) дээр `[data-attr-filter]`
 *      === 5 (📺 → ⚙️ → 🧠 → 💾 → ✅), дараалал/шошго нь ЛИБЭЭС ижил ✓
 *      ⚠️ 5-уулаа `#filter-bar` PILL (`filterBar: true`) — сайдбарт attr шүүлт 0,
 *         НЭГ Ч `<select>` БАЙХГҮЙ (⏳ 2026-10-03 (7)-д 4 нь `<select>` байв ✗)
 *   ①b Сонголтын жагсаалт нь `lib/locationData.js`-ийн жагсаалттай ЯГ ижил
 *      (7 / 19 / 13 / 6 / 3) — DOM ↔ либ харьцуулалт ✓
 *   ② УТГА СОНГОХ: `⚙️ Intel Core i5` pill-ийн чип → URL `?attr_cpu=Intel+Core+i5` ·
 *      DB `attrs->>cpu=in.(Intel Core i5)` · идэвхтэй чип «Intel Core i5» ✓
 *   ②b ОЛОН СОНГОЛТ: 2 дахь CPU (`i7`) → `in.(i5,i7)` · pill badge «2» ·
 *      шүүлтийн чип «2 процессор» (`multiNoun`) ✓
 *   ③ ЛИНКЭЭР ОРОХ: `?attr_cpu=…` нь pill дотор тэмдэглэгдэж, хэвээр үлдэнэ
 *      (URL бичигдэхдээ ХАСАГДАХГҮЙ ✓)
 *   ③d 📺 «14.0"»/«15.6"» — МЭТ ТЭМДЭГТТЭЙ утга `in.(…)` дотор ч эвдрэхгүй ✓
 *   ④ ХОЛДУУ ДЭД ТӨРӨЛ (`type=Mouse`): 📺/⚙️/🧠/💾 ГАРАХГҮЙ, зөвхөн ✅ pill ✓
 *      ба DB query-д `attrs->>cpu` ОГТ ЯВАХГҮЙ
 *   ④b 🏷️ 2026-10-03 (20) (хэрэглэгчийн хүсэлт: «Notebook ээс бусад хайлтын
 *      хэсэгт Брэнд гэж баймааргүй байна даа»): 🏷️ «Брэнд» Ч хайлтад
 *      `filterSubtypes`-ээр хязгаарлагдав ⇒ Mouse/хэсгийн түвшинд «Брэнд»
 *      блок ОГТ БАЙХГҮЙ, `?type=Mouse&attr_brand=Apple` линкээр орвол
 *      `attr_brand` ЧИМЭЭГҮЙ хасагдана (форм дээр ХЭВЭЭР ✓)
 *   ⑤ ҮЛ ҮЗЭГДЭХ ШҮҮЛТ (архитектурын урхи): `?type=Mouse&attr_cpu=…` линкээр
 *      орвол `attr_cpu` нь ЧИМЭЭГҮЙ хасагдана (`pruneGatedAttrs`) — эс бөгөөс
 *      sidebar-д харагдахгүй шүүлт заруудыг шүүж, «0 үр дүн» гарах байв ✗
 *   ⑥ Дэд төрөл СОНГООГҮЙ (`?section=computers`) үед sidebar БАЙХГҮЙ ✓
 *   ⑦ 🚗 БУСАД ХЭСЭГ: авто дээр `[data-attr-filter]` === 3 (🎨 өнгө · 🔀 хайрцаг ·
 *      ⛽ түлш — 🏷️ брэнд нь combobox, он нь хүрээ; ⚠️ 2026-10-03 (22)-оос 🔀 ба
 *      ⛽ ХОЁУЛАА ЧИП болсон тул авто дээр НЭГ Ч `<select>` БАЙХГҮЙ ✓)
 *      🆕 (43): 3-уулаа `#filter-bar` PILL (🆕 2026-10-06: 💳 «Төлбөрийн нөхцөл»
 *      сайдбарт буцсан тул ⏳ (43)-ийн `barKeys` = `color,transmission,fuel,payment`
 *      нь ОДОО **`color,transmission,fuel`**) ба сайдбарт attr 0 ✓
 *   ⑦b 🎨 **ОЛОН СОНГОЛТТОЙ «ӨНГӨ»** (2026-10-03 (19), хэрэглэгчийн хүсэлт:
 *      «Зар хайлт дээр Авто машин сонголт дээр Өнгө ийг Төлбөрийн нөхцөл шиг
 *      олон сонголттой болго»): 🎨 нь `<select>` БИШ, 12 `chip-toggle`
 *      `<button>` (`data-attr-multi="true"`); «Хар» + «Цагаан» дарахад
 *      URL `?attr_color=Хар,Цагаан` · badge «2 сонгосон» · идэвхтэй шүүлтийн
 *      чип «🎨 2 өнгө» · DB `attrs->>color=in.(Хар,Цагаан)` (OR ✓); дахин
 *      дарахад toggle, «✕ Цуцлах»-аар бүрэн цэвэрлэгдэнэ; хуучин нэг утгатай
 *      линк (`?attr_color=Хар`) ч зөв уншигдана ✓
 *   ⑦e 🆕 **2026-10-03 (22): 🔀 «Хурдны хайрцаг» ба ⛽ «Түлш» ч ОЛОН
 *      СОНГОЛТТОЙ ЧИП** (хэрэглэгчийн хүсэлт: «мөн автомашин хайлт дээр бас
 *      ⚙️ Хурдны хайрцаг -ийг 💳 Төлбөрийн нөхцөл шиг болго. бас ⛽ Түлш ийг»)
 *      ⇒ 🎨 өнгөтэй ЯГ ИЖИЛ; «Хайбрид» дархад `?attr_fuel=Хайбрид` ба DB
 *      `attrs->>fuel=in.(Хайбрид)` (OR ✓; ⚠️ урьд нь `eq.` байв ✗); 2 дахь
 *      түлш нэмэхэд `in.(Хайбрид,Бензин)`; хуучин нэг утгатай линк хэвээр ✓
 *   ⑧ 📱 Мобайл 390px: 5 pill ХАРАГДАЖ (хэмжээ > 0), хэвтээ гүйлт (overflow) 0 ✓
 *   ⑨ 🆕 **2026-10-05 (43): ✅ «Төлөв» PILL** (⏳ (21)-д сайдбарын чип байв;
 *      хэрэглэгчийн хүсэлт: «хайлт дээр Шинэ / Шинэвтэр / Хуучин ийг бас 💳
 *      Төлбөрийн нөхцөл шиг олон сонголт хийх боломжтой болго» + «Шинэ,
 *      Шинэвтэр, Хуучин ийг Төлөв гэж нэрлэ»): 🧺 `home` дээр ✅ нь
 *      `#filter-bar` pill ба дотор нь 3 `chip-toggle` `<button>`
 *      (`data-attr-multi="true"`) — СОНГОЛТ ХӨНДӨГДӨӨГҮЙ ✓
 *   ⑨b Идэвхтэй шүүлтийн чип: 1 утга → «Шинэ», ОЛОН → «2 төлөв» (`multiNoun`),
 *      «Шинэ» + «Хуучин» → URL `?attr_condition=Шинэ,Хуучин` · DB
 *      `attrs->>condition=in.(Шинэ,Хуучин)` (OR ✓)
 *   ⑨c ЦУЦЛАХ: pill-ийн `✕ Цуцлах` (панель ДОТОР) → URL/DB бүрэн цэвэр ✓
 *   ⑨d 🔗 ЛИНКЭЭР: `?attr_condition=Шинэ,Хуучин` (🛋️) ба 1 утгатай
 *      `?attr_condition=Хуучин` (🧺) хоёулаа pill дотроо ТЭМДЭГЛЭГДЭНЭ ✓
 *   ⑩ Консол дээр JS exception 0 ✓
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээсэн байх:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-notebook-specs.mjs   (эсвэл npm run cdp:specs)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:filters` ✓
 */
import { getAttrFilters } from '../lib/locationData.js';

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
// ⚠️ Chrome-д олон таб нээлттэй байвал хуучин таб нь `Runtime.evaluate`-д хариу
//    өгөхгүй hang болдог ✗ → ШИНЭ таб нээж түүн дээр ажиллана ✓
let page = null;
try {
  const created = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (created.ok) page = await created.json();
} catch { /* хуучин Chrome (PUT дэмжихгүй) → доорх нөөц зам ✓ */ }
let ownTab = !list.some((t) => t.id === page?.id);
if (!page?.webSocketDebuggerUrl) {
  const pages = list.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl);
  page = pages[0];
  ownTab = false;
}
// ⚠️ `PUT /json/new` нь табыг BACKGROUND-д нээдэг → FRONT-д гаргана ✓
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
const listingReqs = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') exceptions.push(m.params.exceptionDetails.text);
  if (m.method === 'Network.requestWillBeSent') {
    const r = m.params.request;
    if (r.url.includes('/rest/v1/listings') && r.method === 'GET') listingReqs.push(r.url);
  }
});

await rpc('Runtime.enable');
await rpc('Network.enable');
await rpc('Page.enable');
await rpc('Page.bringToFront');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** ⚠️ Хааяа `Runtime.evaluate` 30с timeout болдог ✗ → НЭГ удаа дахин оролдоно ✓ */
const evalJs = async (expression) => {
  const call = async () => {
    const r = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails.text));
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
const waitFor = async (expression, ms = 9000) => {
  const until = Date.now() + ms;
  for (;;) {
    try { if (await evalJs(`!!(${expression})`)) return true; } catch { /* хуудас солигдож байна */ }
    if (Date.now() > until) return false;
    await sleep(250);
  }
};
const go = async (address) => {
  await rpc('Page.navigate', { url: address });
  await waitFor(`document.readyState === 'complete'`);
  /**
   * 🆕 2026-10-03 (19): `readyState` ХҮРЭЛЦЭХГҮЙ — client hydration ба URL-ийг
   *    унших `useEffect` нь (ялангуяа dev сервер дээр, олон дахин compile-ийн
   *    дараа) удаан байж болно. Тэр хооронд sidebar нь «Бүх зар» төлөвтөө
   *    (`attrFilters` = 0) харагдаж, проб `keys=[]` гэж БУРУУ онооно ✗
   *    (CDP дээр баригдсан flaky алдаа — бодит UI дээр асуудал байхгүй ✓)
   *    ⇒ `#advanced-filters` доторх ЭХНИЙ `[data-attr-filter]` хүртэл хүлээнэ.
   *    ℹ️ Энэ скриптийн бүх хуудас ≥1 шүүлттэй (computers/Apple = 5 ·
   *       Mouse = 1 · `?section=computers` = 1 · 🚗 авто = 3) тул тохирно ✓
   */
  // 🆕 2026-10-04 (37): 🎨/⚙️/⛽ (ба 💳) нь үр дүнгийн дээрх ХЭВТЭЭ мөр
  //    (`#filter-bar`) руу шилжсэн ⇒ ХОЁР газрыг хамт хүлээнэ ✓
  await waitFor(`document.querySelectorAll('#advanced-filters [data-attr-filter], #filter-bar [data-attr-filter]').length > 0`, 15000);
  await sleep(500);
};

/**
 * 🖥 Sidebar дахь attr шүүлтүүдийн төлөв — `[data-attr-filter]` дэгээгээр
 * 🆕 2026-10-03 (13): `#advanced-filters` (aside) нь ХЭСЭГ (2-р түвшин) ба
 *    «Бүх зар» (1-р түвшин) дээр Ч бий — `showAdvancedFilters` нь ҮРГЭЛЖ ✓
 *    ⏳ урьд нь ЗӨВХӨН дэд төрөл сонгосон үед байв ✗ (progressive disclosure)
 *    (`components/HomeClient.jsx`: `{showAdvancedFilters && (<aside …>)}`)
 */
const specUi = () => evalJs(`(() => {
  const aside = document.getElementById('advanced-filters');
  /**
   * 🆕 2026-10-04 (37): 🎨/⚙️/⛽ (ба 💳) нь сайдбараас гарч, үр дүнгийн ДЭЭРХ
   *    ХЭВТЭЭ шүүлтийн мөр (#filter-bar) руу шилжсэн (eBay-ийн «Color ⌄» шиг)
   *    ⇒ [data-attr-filter]-ыг ХОЁР газраас хайна; querySelectorAll нь
   *    документийн дарааллаар буцаана (sidebar-ийн дараа filter-bar ✓)
   *    ⚠️ Тайлбар дотор BACKTICK БИЧИХГҮЙ — энэ бүхэн evalJs-ийн ТЕМПЛЭЙТ
   *       ЛИТЕРАЛ дотор байгаа тул backtick нь литэрэлыг ХААЖ хасна ✗
   *       (2026-10-04 (39): синтакс алдаа зассан — node --check ✓)
   */
  const sels = [...document.querySelectorAll(
    '#advanced-filters [data-attr-filter], #filter-bar [data-attr-filter]')];
  const txt = (el) => (el && el.textContent ? el.textContent.trim() : '');
  const footer = aside
    ? [...aside.querySelectorAll('p')].find((p) => /зар харуулах/.test(p.textContent))
    : null;
  const m = footer ? footer.textContent.match(/([0-9][0-9.,]*)\\s*зар харуулах/) : null;
  return {
    sidebar: !!aside,
    total: sels.length,
    keys: sels.map((s) => s.getAttribute('data-attr-filter')),
    /**
     * ⚠️ 2026-10-03 (19): 🎨 «Өнгө» (авто хэсэг) нь ОЛОН СОНГОЛТТОЙ ЧИП болов —
     *    тэр блок нь DIV (элементийн нэр нь 'select' БИШ) тул .options
     *    БАЙХГҮЙ → шууд уншивал TypeError болж ПРОБ БҮХЭЛДЭЭ унана ✗
     *    ⇒ зөвхөн select-үүдийг утга/сонголт/тоогоор нь уншина; чип блокууд
     *      нь chipBlocks массивт тусдаа (multi туг + aria-pressed) ✓
     */
    selectKeys: sels.filter((el) => el.tagName.toLowerCase() === 'select')
      .map((s) => s.getAttribute('data-attr-filter')),
    chipBlocks: sels.filter((el) => el.tagName.toLowerCase() !== 'select')
      .map((el) => {
        const btns = [...el.querySelectorAll('.chip-toggle')];
        return {
          key: el.getAttribute('data-attr-filter'),
          multi: el.getAttribute('data-attr-multi') === 'true',
          total: btns.length,
          pressed: btns.filter((b) => b.getAttribute('aria-pressed') === 'true')
            .map((b) => b.getAttribute('data-attr-value')),
          kinds: btns.map((b) => b.tagName.toLowerCase()),
          /** 🆕 2026-10-05 (43): чип бүрийн УТГА (DOM дараалал = либ) ✓ */
          values: btns.map((b) => (b.getAttribute('data-attr-value') || '').trim()),
        };
      }),
    labels: sels.map((s) => (s.getAttribute('aria-label') || '').trim()),
    /**
     * 🆕 2026-10-05 (43): 📺/⚙️/🧠/💾 + ✅ нь «filterBar: true» тул САЙДБАРТ
     *    attr шүүлт ОГТ ҮЛДЭХГҮЙ — «asideTotal === 0» нь «2 ӨӨР UI БАЙХГҮЙ»
     *    гэдгийг (sidebar + pill) батлана ✓
     */
    asideTotal: document.querySelectorAll('#advanced-filters [data-attr-filter]').length,
    /**
     * 🆕 2026-10-06 (17): САЙДБАРТ («Дэлгэрэнгүй хайлт») буцсан шүүлтүүд —
     *    ✅ «Төлөв» (8 хэсэг) ба 🚗 🎨/⛽/⚙️ (afterPayment). ⚠️ pill-ийн ба
     *    сайдбарын жагсаалтыг ХОЁУЛАНГ нь либээс шалгана ⇒ нэг талбар
     *    ЗӨВХӨН нэг газарт («2 ӨӨР UI БАЙХГҮЙ» ✓)
     *    ⚠️ ЭНЭ КОММЕНТ НЬ ТЕМПЛЭЙТ ЛИТЕРАЛ ДОТОР ТУЛ BACKTICK БИЧИХГҮЙ ✗
     */
    asideKeys: [...document.querySelectorAll('#advanced-filters [data-attr-filter]')]
      .map((el) => el.getAttribute('data-attr-filter')),
    asideLabels: [...document.querySelectorAll('#advanced-filters [data-attr-filter]')]
      .map((el) => (el.getAttribute('aria-label') || '').trim()),
    /** «#filter-bar» дахь PILL-ийн түлхүүрүүд («data-filter-pill» — ⚠️ 2026-10-06:
     *  💳/🛏 нь pill БИШ, сайдбарт (SideBlock) ⇒ зөвхөн attr pill-үүд ✓) */
    barKeys: [...document.querySelectorAll('#filter-bar [data-filter-pill]')]
      .map((el) => el.getAttribute('data-filter-pill')),
    /**
     * 🎛 Pill бүрийн ⌄ товч дээрх Тоо badge — «cpu=1» мэт мөрүүд
     *    (⚠️ badge нь ЗӨВХӨН «count > 0» үед render болдог тул 0-оор бичнэ ✓)
     */
    barCounts: [...document.querySelectorAll('#filter-bar [data-filter-pill]')].map((el) => {
      const b = el.querySelector('button span');
      const t = b ? b.textContent.trim() : '';
      return el.getAttribute('data-filter-pill') + '=' + (/^[0-9]+$/.test(t) ? t : '0');
    }),
    values: sels.filter((el) => el.tagName.toLowerCase() === 'select').map((s) => s.value),
    first: sels.filter((el) => el.tagName.toLowerCase() === 'select')
      .map((s) => (s.options[0] ? txt(s.options[0]) : '')),
    counts: sels.filter((el) => el.tagName.toLowerCase() === 'select').map((s) => s.options.length),
    options: sels.filter((el) => el.tagName.toLowerCase() === 'select')
      .map((s) => [...s.options].slice(1).map(txt)),
    blocks: [...document.querySelectorAll('#advanced-filters .divide-y > div')]
      .map((b) => txt(b.firstElementChild)),
    // 🎨 «N сонгосон» badge-ууд (олон сонголттой блок бүрийн толгойд —
    //    2026-10-03 (19): 🎨 «Өнгө», 🛏 «Өрөөний тоо», 💳 «Төлбөрийн нөхцөл» ✓)
    multiBadges: [...document.querySelectorAll('#advanced-filters span, #filter-bar span')]
      .map(txt).filter((t) => /^[0-9]+ сонгосон$/.test(t)),
    chips: [...document.querySelectorAll('[aria-label$="хайлтыг хасах"]')]
      .map((b) => (b.getAttribute('aria-label') || '').replace(' хайлтыг хасах', '')),
    count: m ? Number(m[1].replace(/[^0-9]/g, '')) : null,
  };
})()`);

/**
 * 🗑 2026-10-05 (43): `setSelect()` (`<select>`-ийн утгыг натив setter-ээр
 *    солих туслах) БҮРЭН ХАСАГДАВ — 💻 Notebook-ийн 📺/⚙️/🧠/💾 ба ✅ нь
 *    `filterBar: true` болов ⇒ хэсэгт НЭГ Ч `[data-attr-filter]` `<select>`
 *    ҮЛДЭХГҮЙ (`EXPECT_SELECTS.length === 0` — доор батлана ✓)
 * ⚠️ Хэрэгтэй бол `scripts/cdp-range.mjs` дээрх ЯГ ИЖИЛ хувилбарыг харна ✓
 */

/** 🎛 ЧИП дарж шилжүүлэх (ОЛОН СОНГОЛТТОЙ талбарууд — ж: 🎨 «Өнгө») */
const clickChip = (key, value) => evalJs(`(() => {
  const b = document.querySelector('[data-attr-filter="' + ${JSON.stringify(key)}
    + '"] button[data-attr-value="' + ${JSON.stringify(value)} + '"]');
  if (!b) return 'NO_EL';
  b.click();
  return 'OK';
})()`);

let pass = 0; let fail = 0;
const check = (label, ok, extra = '') => {
  if (ok) { pass += 1; console.log(`  ✓ ${label}${extra ? ' — ' + extra : ''}`); }
  else { fail += 1; console.log(`  ✗ ${label}${extra ? ' — ' + extra : ''}`); }
};
const url = () => evalJs('location.search');
/**
 * ⚠️ Query мөрөнд зай нь `+` болж кодлогддог (`attr_cpu=Intel+Core+i5`) —
 *    `decodeURIComponent` нь `+`-ыг зай болгохгүй тул гараар солино ✓
 *    (PostgREST `+`-ыг зай гэж уншина — бодит query-д `attrs->>cpu=eq.Intel Core i5`)
 */
const dbQ = (...frags) => listingReqs.some((u) => {
  const s = decodeURIComponent(u).replace(/\+/g, ' ');
  return frags.every((f) => s.includes(f));
});
const lastQ = () => {
  // ⚠️ 2026-10-04 (39): query МӨРГҮЙ линк (ж: цэвэр `/?section=auto`) дээр
  //    `.split('?')[1]` нь `undefined` болж `.replace` TypeError өгнө ✗
  //    ⇒ бүх suite-ийг унагахын оронд ТОДОРХОЙ текст буцаана ✓
  const q = decodeURIComponent(listingReqs[listingReqs.length - 1] || '').split('?')[1];
  return q ? q.replace(/\+/g, ' ') : '(query байхгүй)';
};

/**
 * ⚠️ Хүлээгдэж буй жагсаалт нь ЛИБЭЭС (`lib/locationData.js`) — DOM-той харьцуулна ✓
 *    ⚠️ 🏷️ «Брэнд» нь `searchable` тул `SearchableSelect` (combobox) болж зурагдана
 *       — тэр нь `[data-attr-filter]` дэгээгүй ✗ ⇒ харьцуулалтаас ХАСНА
 */
const EXPECT = getAttrFilters('computers', 'Notebook').filter((f) => !f.searchable);
/**
 * 🆕 2026-10-03 (21): ✅ «Шинэ / Шинэвтэр / Хуучин» нь ЧИП блок болов
 *    (`chips: true`) — тэр нь `.options`/`.value` БАЙХГҮЙ (`<select>` БИШ) тул
 *    `<select>`-ийн харьцуулалтаас (тоо/утга/«Бүгд») ХАСНА ✓
 */
const EXPECT_PILL = EXPECT.filter((f) => !f.chips);   // (17): 0 — бүгд чип ✓
const EXPECT_CHIPS = EXPECT.filter((f) => f.chips);
/**
 * 🆕 2026-10-06 (17): 💻 Notebook дээр ✅ «Төлөв» нь САЙДБАРТ, 📺/⚙️/🧠/💾 нь
 *    `#filter-bar` pill хэвээр ⇒ харьцуулалтуудыг ХОЁР бүлэгт хуваана ✓
 */
const EXPECT_PILLBAR = EXPECT.filter((f) => f.filterBar);   // screen · cpu · ram · storage
const EXPECT_ASIDE = EXPECT.filter((f) => !f.filterBar);    // condition ✓

console.log('\n🖥 CDP — 💻 Notebook-ийн шүүлт (📺 Дэлгэц · ⚙️ CPU · 🧠 RAM · 💾 Хард)\n');



await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });

// ═══════ ① 💻 NOTEBOOK БРЭНД (Apple): 5 PILL (4 ҮЗҮҮЛЭЛТ + ✅ «Төлөв») ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=computers&type=Notebook`);
/**
 * ⚠️ `go()` нь зөвхөн шүүлтийн pill-ийг ХҮЛЭЭНЭ — САЙДБАРЫН доод
 *    «N зар харуулах» мөр (үр дүнгийн НИЙТ тоо) нь ЖАГСААЛТ ачаалагдсаны
 *    дараа л бичигддэг (`listings !== null` байх ёстой) ⇒ `specUi().count`
 *    нь хэт эрт уншивал `null` болж FLAKY унана ✗ (dev сервер дээр эхний
 *    compile хэдэн секунд авдаг). Тиймээс тоо бодитоор гарч ирэхийг ТУСДАА
 *    хүлээнэ ✓
 */
const countReady = await waitFor(`(() => {
  const p = [...document.querySelectorAll('#advanced-filters p')]
    .find((x) => /зар харуулах/.test(x.textContent));
  return !!p;
})()`, 25000);
const apple = await specUi();
check('🖥 Sidebar БАЙНА (`#advanced-filters` — хэсэг/дэд төрөл сонгосон үед ✓)', apple.sidebar);
check('📺⚙️🧠💾✅ `[data-attr-filter]` === 5 (📺/⚙️/🧠/💾 pill + 🆕 ✅ сайдбарт)',
  apple.total === 5, `keys=[${apple.keys.join(', ')}]`);
check('🎛 🆕 (17): 📺/⚙️/🧠/💾 4 нь `#filter-bar` PILL ба дараалал нь либээс ижил ✓',
  apple.barKeys.join(',') === EXPECT_PILLBAR.map((f) => f.key).join(','),
  `pills=[${apple.barKeys.join(', ')}]`);
check('🏷 🆕 (17): pill-ийн ШОШГУУД нь ЛИБЭЭС ижил (`aria-label` ✓)',
  apple.labels.filter((_, i) => apple.keys[i] !== 'condition').join(' | ')
    === EXPECT_PILLBAR.map((f) => f.label).join(' | '),
  apple.labels.join(' | '));
check('🎛 🆕 (17): ✅ «Төлөв» нь САЙДБАРТ (⏳ (43)-д pill байв · pill БИШ ✓)',
  apple.asideKeys.join(',') === EXPECT_ASIDE.map((f) => f.key).join(',')
    && apple.asideLabels.join(' | ') === EXPECT_ASIDE.map((f) => f.label).join(' | '),
  `aside=[${apple.asideKeys.join(', ')}] · ${apple.asideLabels.join(' | ')}`);
check('🎛 Сонголтын ТОО нь ЛИБЭЭС ижил (📺7 · ⚙️19 · 🧠13 · 💾6 · ✅3 — бүгд ЧИП)',
  EXPECT_CHIPS.map((f) => {
    const b = apple.chipBlocks.find((x) => x.key === f.key);
    return b ? b.total : -1;
  }).join(',') === EXPECT_CHIPS.map((f) => f.options.length).join(','),
  JSON.stringify(apple.chipBlocks.map((b) => b.key + ':' + b.total)));
check('🎛 Сонголтын УТГА нь ч ЛИБЭЭС ижил (давхар хуулбар БАЙХГҮЙ ✓)',
  EXPECT_CHIPS.every((f) => {
    const b = apple.chipBlocks.find((x) => x.key === f.key);
    return !!b && b.values.join('·') === f.options.join('·');
  }),
  `⚙️: ${(apple.chipBlocks.find((b) => b.key === 'cpu') || { values: [] }).values.slice(0, 4).join(' · ')} …`);
check('🎛 5 блок БҮГД ОЛОН СОНГОЛТТОЙ (`data-attr-multi` · `<button>` · сонголт 0)',
  apple.chipBlocks.length === EXPECT_CHIPS.length
    && EXPECT_CHIPS.every((f) => {
      const b = apple.chipBlocks.find((x) => x.key === f.key);
      return !!b && b.multi === true && b.total === f.options.length
        && b.kinds.every((k) => k === 'button') && b.pressed.length === 0;
    }),
  JSON.stringify(apple.chipBlocks.map((b) => b.key + ':' + b.total + (b.multi ? '' : ':NO_MULTI'))));
check('⛔ 🆕 (43)/(17): 💻 Notebook дээр НЭГ Ч `<select>` БАЙХГҮЙ (📺/⚙️/🧠/💾 ч чип ✓)',
  apple.selectKeys.length === 0 && EXPECT_PILL.length === 0,
  `selects=[${apple.selectKeys.join(', ')}] · EXPECT_PILL=${EXPECT_PILL.length}`);
check('🖥 Сайдбарын БЛОКУУД: 🏷 Брэнд + «Үнэ, ₮» + 🆕 ✅ «Төлөв» (📺/⚙️/🧠/💾 блок ГАРСАН ✓)',
  /Брэнд/.test(apple.blocks.join(' ')) && /Үнэ/.test(apple.blocks.join(' '))
    && /Төлөв/.test(apple.blocks.join(' '))
    && !/Дэлгэц|CPU|RAM|Хард/.test(apple.blocks.join(' ')),
  apple.blocks.join(' → '));
check('🔎 Шүүлт хоосон үед DB query-д `attrs->>cpu/screen/ram/storage` ОРООГҮЙ',
  !dbQ('attrs->>cpu') && !dbQ('attrs->>screen') && !dbQ('attrs->>ram') && !dbQ('attrs->>storage'),
  lastQ());
const allCount = apple.count;
check('📊 Нийт зарын тоо уншигдав (Apple notebook — бодит DB ✓)',
  countReady === true && typeof allCount === 'number', `${allCount} зар`);

// ═══════ ② ⚙️ CPU УТГА СОНГОХ (PILL-ийн ЧИП): URL + DB + ЧИП + ҮР ДҮН ═══════
listingReqs.length = 0;
const picked = await clickChip('cpu', 'Intel Core i5');
check('🎛 ⚙️ CPU pill-ийн чип «Intel Core i5» дарлаа (⏳ (7)-д `<select>` байв ✗)',
  picked === 'OK', picked);
await waitFor(`/attr_cpu=/.test(location.search)`);
const qCpu = await url();
check('🔗 URL-д `attr_cpu=Intel+Core+i5` болов (параметрийн нэр ХУУЧИН хэвээр ✓)',
  /attr_cpu=Intel\+Core\+i5/.test(qCpu), qCpu);
await sleep(1500);
check('🔎 DB: `attrs->>cpu=in.(Intel Core i5)` (🆕 (43): OR-ийн нэг элемент ✓)',
  dbQ('attrs->>cpu=in.(Intel Core i5)'), lastQ());
check('⛔ Хуучин скаляр `attrs->>cpu=eq.…` ОГТ ЯВАХГҮЙ (улдмал шүүлт БАЙХГҮЙ ✓)',
  !dbQ('attrs->>cpu=eq.'), lastQ());
const cpuUi = await specUi();
const cpuBlock = cpuUi.chipBlocks.find((b) => b.key === 'cpu');
check('🎛 Утга нь pill дотор ХЭВЭЭР (`aria-pressed` — controlled чип ✓)',
  !!cpuBlock && cpuBlock.pressed.join(',') === 'Intel Core i5', JSON.stringify(cpuBlock));
check('🎛 Pill-ийн Тоо badge «1» ба «1 сонгосон» (🛏/💳-ийн ЯГ ИЖИЛ хэв ✓)',
  cpuUi.barCounts.includes('cpu=1') && cpuUi.multiBadges.includes('1 сонгосон'),
  `barCounts=[${cpuUi.barCounts.join(' ')}] · badges=[${cpuUi.multiBadges.join(' | ')}]`);
check('🏷 Идэвхтэй шүүлтийн чип «Intel Core i5» гарлаа (🗑 2026-10-04 (39): emoji-гүй)',
  cpuUi.chips.some((c) => c === 'Intel Core i5'), `chips=[${cpuUi.chips.join(' | ')}]`);
check('📉 Үр дүнгийн тоо БУУРСАН (шүүлт бодит DB дээр ажиллаж байна ✓)',
  typeof cpuUi.count === 'number' && cpuUi.count <= allCount,
  `${cpuUi.count} ≤ ${allCount} (шүүлттэй тоо ХЭЗЭЭ Ч илүү гарахгүй ✓)`);
check('🖥 5 шүүлт ХЭВЭЭР байна (утга тавихад нуугдахгүй ✓ · pill 4 + сайдбар ✅ 1)',
  cpuUi.total === 5 && cpuUi.barKeys.length === 4 && cpuUi.asideKeys.join(',') === 'condition',
  `total=${cpuUi.total} · pills=${cpuUi.barKeys.length} · aside=[${cpuUi.asideKeys.join(', ')}]`);

// ---- ②b 🆕 (43) ОЛОН СОНГОЛТ: 2 дахь утга НЭМЭГДЭНЭ (OR · `in.(A,B)`) ----
listingReqs.length = 0;
check('⚙️ 2 дахь CPU «Intel Core i7» дарлаа (эхнийх ЦУЦЛАГДАХГҮЙ ✓)',
  (await clickChip('cpu', 'Intel Core i7')) === 'OK');
await waitFor(`/attr_cpu=Intel\\+Core\\+i7/.test(location.search)`);
await sleep(1500);
const cpu2 = await specUi();
const cpu2Block = cpu2.chipBlocks.find((b) => b.key === 'cpu');
check('🔗 URL-д `attr_cpu=Intel Core i5,Intel Core i7` (таслалаар ✓)',
  // ⚠️ `location.search` нь `,`-ыг `%2C` гэж кодолсон байж болно (`+` нь зай ✓)
  //    ⇒ бусад шалгалтын ИЖИЛ хэвээр `decodeURIComponent(...)` ашиглана ✓
  /attr_cpu=Intel\+Core\+i5,Intel\+Core\+i7/.test(decodeURIComponent(await url())),
  decodeURIComponent(await url()));
check('🔎 DB: `attrs->>cpu=in.(Intel Core i5,Intel Core i7)` — OR (аль нэг CPU ✓)',
  dbQ('attrs->>cpu=in.(Intel Core i5,Intel Core i7)'), lastQ());
check('🎛 Pill Тоо badge «2» + «2 сонгосон» + 2 чип идэвхтэй',
  cpu2.barCounts.includes('cpu=2') && cpu2.multiBadges.includes('2 сонгосон')
    && !!cpu2Block
    && [...cpu2Block.pressed].sort().join(',') === ['Intel Core i5', 'Intel Core i7'].sort().join(','),
  `barCounts=[${cpu2.barCounts.join(' ')}] · pressed=[${cpu2Block ? cpu2Block.pressed.join(', ') : ''}]`);
check('🏷 Идэвхтэй шүүлтийн чип ТОВЧЛОГДОВ («2 процессор» — `multiNoun` ✓)',
  cpu2.chips.some((c) => c === '2 процессор'), `chips=[${cpu2.chips.join(' | ')}]`);
check('✅ 🆕 (43)/(17): ✅ «Төлөв» шүүлтийн шошго (⏳ «Шинэ / Шинэвтэр / Хуучин» байв ✗ · сайдбарт ✓)',
  cpu2.asideLabels.join(' | ') === 'Төлөв', `asideLabels=[${cpu2.asideLabels.join(' | ')}]`);
const condPill = cpu2.chipBlocks.find((b) => b.key === 'condition');
check('✅ «Төлөв» блок нь 3 чип (Шинэ · Шинэвтэр · Хуучин — сонголт ХӨНДӨГДӨӨГҮЙ ✓)',
  !!condPill && condPill.total === 3 && condPill.values.join(',') === 'Шинэ,Шинэвтэр,Хуучин',
  condPill ? condPill.values.join(' · ') : 'NO_BLOCK');

// ═══════ ③ ЛИНКЭЭР ОРОХ (`?attr_cpu=…`) — PILL дотор тэмдэглэгдэнэ ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=computers&type=Notebook&attr_cpu=Intel+Core+i5`);
const deep = await specUi();
const deepCpu = deep.chipBlocks.find((b) => b.key === 'cpu');
check('🔗 Линкээр орсон утга pill дотор ТЭМДЭГЛЭГДЭВ',
  !!deepCpu && deepCpu.pressed.join(',') === 'Intel Core i5', JSON.stringify(deepCpu));
check('🔗 URL нь ХАСАГДАХГҮЙ (`attr_cpu` хэвээр — шүүлт харагдаж байна ✓)',
  /attr_cpu=Intel\+Core\+i5/.test(await url()), await url());
check('🔎 DB: `attrs->>cpu=in.(Intel Core i5)` хэвээр (⚠️ урьд `eq.` байв ✗)',
  dbQ('attrs->>cpu=in.(Intel Core i5)'), lastQ());

// ---- ③d 🆕 (43) 📺 МЭТ ТЭМДЭГТТЭЙ утга («14.0"») — `in.(…)` дотор ч ЭВДРЭХГҮЙ ----
listingReqs.length = 0;
await go(`${BASE}/?section=computers&type=Notebook&attr_screen=`
  + `${encodeURIComponent('14.0"')},${encodeURIComponent('15.6"')}`);
await sleep(1500);
const inch = await specUi();
const inchBlock = inch.chipBlocks.find((b) => b.key === 'screen');
check('🔗 «14.0"»/«15.6"» линкээр ороход 2 чип ТЭМДЭГЛЭГДЭВ (URL ХАСАГДАХГҮЙ ✓)',
  !!inchBlock && [...inchBlock.pressed].sort().join(',') === ['14.0"', '15.6"'].sort().join(','),
  `pressed=[${inchBlock ? inchBlock.pressed.join(', ') : ''}]`);
check('🔎 DB: `attrs->>screen=in.(14.0",15.6")` (⚠️ `"` нь query-г эвдэхгүй ✓)',
  dbQ('attrs->>screen=in.(14.0",15.6")'), lastQ());
check('🖥 ③d: 5 pill хэвээр (шүүлт зөвхөн pill-ээр явна ✓)',
  inch.total === 5, `total=${inch.total}`);

// ═══════ ④ 🖱 ХОЛДУУ ДЭД ТӨРӨЛ (Mouse): 4 ШҮҮЛТ ГАРАХГҮЙ ═══════
listingReqs.length = 0;
await go(`${BASE}/?section=computers&type=Mouse`);
const mouse = await specUi();
check('🖱 Sidebar БАЙНА (хэсэг нь хэвээр ✓)', mouse.sidebar);
check('🖱 Зөвхөн ✅ «Төлөв» шүүлт (`[data-attr-filter]` === 1)',
  mouse.total === 1 && mouse.keys[0] === 'condition', `keys=[${mouse.keys.join(', ')}]`);
check('🎛 🆕 (17): ✅ «Төлөв» нь Mouse дээр ч САЙДБАРТ (pill БАЙХГҮЙ ✓)',
  mouse.barKeys.length === 0 && mouse.asideTotal === 1 && mouse.asideKeys.join(',') === 'condition',
  `pills=[${mouse.barKeys.join(', ')}] · aside=${mouse.asideTotal}`);
check('🖱 ✅ «Төлөв» pill нь 3 чип (Шинэ · Шинэвтэр · Хуучин · олон сонголт ✓)',
  mouse.chipBlocks.length === 1 && mouse.chipBlocks[0].key === 'condition'
    && mouse.chipBlocks[0].multi === true && mouse.chipBlocks[0].total === 3
    && mouse.chipBlocks[0].pressed.length === 0,
  JSON.stringify(mouse.chipBlocks));
check('🖱 📺/⚙️/🧠/💾 нь ОГТ БАЙХГҮЙ (холдуу дэд төрөлд гарахгүй ✓)',
  !/Дэлгэц|CPU|RAM|Хард/.test(mouse.labels.join(' ')), mouse.labels.join(' | '));
/**
 * 🏷️ 2026-10-03 (20): «Брэнд» Ч хайлтад хязгаарлагдав — ⚠️ энэ нь
 *    `[data-attr-filter]`-ээр БАРИГДАХГҮЙ (combobox, `SearchableSelect`) тул
 *    sidebar-ийн БЛОКУУДЫН толгойгоор (`blocks` — `#advanced-filters .divide-y > div`)
 *    шалгана ✓
 */
check('🏷 Mouse дээр «Брэнд» блок ОГТ БАЙХГҮЙ (хайлтад хязгаарлагдав ✓)',
  !/Брэнд/.test(mouse.blocks.join(' ')), mouse.blocks.join(' | '));
check('🔎 DB: `attrs->>cpu` ОГТ ЯВАХГҮЙ', !dbQ('attrs->>cpu'), lastQ());

// ═══════ ⑤ 🕳 ҮЛ ҮЗЭГДЭХ ШҮҮЛТ (архитектурын урхи) ═══════
// ⚠️ `?type=Mouse&attr_cpu=…` — өөрсдийн UI-ээс ХЭЗЭЭ Ч үүсэхгүй хослол.
//    `pruneGatedAttrs` үүнийг ЧИМЭЭГҮЙ хасах ЁСТОЙ — эс бөгөөс харагдахгүй
//    шүүлт заруудыг шүүж, хэрэглэгч «0 үр дүн» гэж гайхана ✗
listingReqs.length = 0;
await go(`${BASE}/?section=computers&type=Mouse&attr_cpu=Intel+Core+i5`);
await waitFor(`!/attr_cpu/.test(location.search)`);
await sleep(1200);
const pruned = await specUi();
check('🕳 URL-аас `attr_cpu` АРИЛАВ (`pruneGatedAttrs` — шууд линк дээр ч ✓)',
  !/attr_cpu/.test(decodeURIComponent(await url())), (await url()) || '(хоосон)');
check('🔎 DB: `attrs->>cpu` ОГТ ЯВАХГҮЙ (үл үзэгдэх шүүлт үлдэхгүй ✓)',
  !dbQ('attrs->>cpu'), lastQ());
check('🖱 Шүүлт 1 хэвээр (Mouse — зөвхөн ✅ «Төлөв» сайдбарт ✓)',
  pruned.total === 1 && pruned.asideKeys.join(',') === 'condition' && pruned.barKeys.length === 0,
  `total=${pruned.total} · aside=[${pruned.asideKeys.join(', ')}]`);

/**
 * 🏷️ 2026-10-03 (20): 🏷️ «Брэнд» Ч МӨН — Notebook-ийн гэр бүлээс өөр дэд
 *    төрөл дээр шүүлтээс ГАРСАН тул `?type=Mouse&attr_brand=Apple` нь ТҮҮНТЭЙ
 *    АДИЛ цэвэрлэгдэнэ (эс бөгөөс sidebar-д харагдахгүй Брэнд шүүлт заруудыг
 *    шүүж «0 үр дүн» гарна ✗). ⚠️ ФОРМ дээр Брэнд ХЭВЭЭР байгаа нь
 *    ЗӨРЧИЛГҮЙ — шүүлт нь тусдаа (sidebar-only) тугтай ✓
 */
listingReqs.length = 0;
await go(`${BASE}/?section=computers&type=Mouse&attr_brand=Apple`);
await waitFor(`!/attr_brand/.test(location.search)`);
await sleep(1200);
check('🕳 URL-аас `attr_brand` АРИЛАВ (үл үзэгдэх Брэнд шүүлт үлдэхгүй ✓)',
  !/attr_brand/.test(decodeURIComponent(await url())), (await url()) || '(хоосон)');
check('🔎 DB: `attrs->>brand` ОГТ ЯВАХГҮЙ (харагдахгүй шүүлт явахгүй ✓)',
  !dbQ('attrs->>brand'), lastQ());
check('🏷 Харьцуулбал Notebook дээр «Брэнд» блок БАЙНА (ялгаа тод ✓)',
  /Брэнд/.test(apple.blocks.join(' ')), apple.blocks.join(' | '));

// ═══ ⑥ 🆕 ДЭД ТӨРӨЛ СОНГООГҮЙ Ч SIDEBAR БАЙНА (хэсэг = 2-р түвшин) ═══
// 🆕 2026-10-03 (13) — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Дэлгэрэнгүй хайлт 3р түвшний
//    сонголт дээр орж ирж байна (Бүх зар › Автомашин › Суудлын машин) —
//    2р түвшин дээр гаргаж ирээд, бүх зар дээр шүүдэг болго» ⇒
//    `?section=computers` (дэд төрөл ГҮЙ) дээр ч панель БИЙ ✓
// ⚠️ Гэхдээ `onlySubtypes`-тай 📺/⚙️/🧠/💾 ба 🏷️ 2026-10-03 (20)-нд
//    `filterSubtypes`-тай 🏷️ «Брэнд» нь ХАРАГДАХГҮЙ ХЭВЭЭР — эхлээд
//    Notebook-ийн брэндийг сонгоно ✓ (формойн `getAttrFields`-тэй ижил дүрэм)
const EXPECT_NO_TYPE = getAttrFilters('computers', '').filter((f) => !f.searchable);
await go(`${BASE}/?section=computers`);
const noType = await specUi();
check('🆕 Дэд төрөл сонгоогүй ч sidebar БАЙНА (хэсэг = 2-р түвшин ✓)',
  noType.sidebar === true, `sidebar=${noType.sidebar}`);
check('🆕 Хэсгийн түвшинд `[data-attr-filter]` нь ЛИБЭЭС ижил (төрөл хэрэггүй ✓)',
  noType.total === EXPECT_NO_TYPE.length
    && noType.keys.join(',') === EXPECT_NO_TYPE.map((f) => f.key).join(','),
  `${noType.total} ↔ ${EXPECT_NO_TYPE.length} · keys=[${noType.keys.join(', ')}]`);
check('🆕 📺/⚙️/🧠/💾 нь хэсгийн түвшинд ОГТ БАЙХГҮЙ (дэд төрөл хэрэгтэй ✓)',
  noType.total > 0 && !/Дэлгэц|CPU|RAM|Хард/.test(noType.labels.join(' ')),
  noType.labels.join(' | '));
check('🆕 2026-10-05 (43)/(17): хэсгийн түвшинд ч ✅ «Төлөв» нь ЧИП БЛОК (сайдбарт ✓)',
  noType.chipBlocks.length === 1 && noType.chipBlocks[0].key === 'condition'
    && noType.chipBlocks[0].multi === true && noType.chipBlocks[0].total === 3
    && noType.barKeys.length === 0 && noType.asideTotal === 1
    && noType.asideLabels.join(' | ') === 'Төлөв',
  JSON.stringify(noType.chipBlocks));
// 🏷️ 2026-10-03 (20): хэсгийн түвшин (дэд төрөл ГҮЙ) бол «Notebook» БИШ ⇒
//    «Брэнд» ч байхгүй (хэрэглэгчийн хүсэлт: «Notebook ээс бусад …»)
check('🏷 Хэсгийн түвшинд «Брэнд» блок БАЙХГҮЙ (Notebook-ийн гэр бүлд л ✓)',
  !/Брэнд/.test(noType.blocks.join(' ')), noType.blocks.join(' | '));
check('🏷 ЛИБ ч ижил — дэд төрөлгүй дуудлагад 🏷 Брэнд ОРООГҮЙ ✓',
  !getAttrFilters('computers', '').some((f) => f.key === 'brand'),
  `keys=[${EXPECT_NO_TYPE.map((f) => f.key).join(', ')}]`);

// ═══════ ⑦ 🚗 БУСАД ХЭСЭГ + 🎨 ОЛОН СОНГОЛТТОЙ «ӨНГӨ» (2026-10-03 (19)) ═══════
// Хэрэглэгчийн хүсэлт: «Зар хайлт дээр Авто машин сонголт дээр Өнгө ийг
// Төлбөрийн нөхцөл шиг олон сонголттой болго» ⇒ 🎨 нь `<select>` БИШ,
// 12 `chip-toggle` товч (олон сонголт) ба DB дээр `attrs->>color=in.(…)` ✓
listingReqs.length = 0;
await go(`${BASE}/?section=auto&type=${encodeURIComponent('Суудлын машин')}`);
const auto = await specUi();
check('🚗 Авто дээр `[data-attr-filter]` === 3 (🎨 өнгө · ⛽ түлш · 🔀 хайрцаг)',
  auto.total === 3, `keys=[${auto.keys.join(', ')}]`);
check('🚗 🆕 (17): Дараалал = «💳 Төлбөрийн нөхцөл»-ийн дараах ЭРЭМБЭ (Өнгө → Түлш → Хайрцаг)',
  auto.keys.join(',') === 'color,fuel,transmission', auto.keys.join(','));
/**
 * 🆕 2026-10-06 (17) (хэрэглэгчийн хүсэлт: «Өнгө, Түлш, Хурдны хайрцаг Дэлгэрэнгүй
 *    хайлтын хэсэгт Төлбөрийн нөхцөлийн ардаас оруул»): ⏳ (42)-ийн `#filter-bar`
 *    PILL ХАСАГДАВ ⇒ 🎨/⛽/⚙️ нь `afterPayment: 1|2|3` тугаар САЙДБАРТ, «💳
 *    Төлбөрийн нөхцөл»-ийн ЯГ АРАА ✓ (авто дээр `#filter-bar` ОГТ БАЙХГҮЙ ✓)
 */
const autoSide = await evalJs(`(() => {
  const aside = document.getElementById('advanced-filters');
  if (!aside) return null;
  const pay = aside.querySelector('[data-payment-filter]');
  const color = aside.querySelector('[data-attr-filter="color"]');
  return {
    payments: aside.querySelectorAll('[data-payment-filter]').length,
    beforeColor: !!(pay && color
      && (pay.compareDocumentPosition(color) & Node.DOCUMENT_POSITION_FOLLOWING)),
  };
})()`);
check('🎛 🆕 (17): авто дээр 3 нь САЙДБАРТ (`beforeColor` — pill 0 ✓)',
  auto.barKeys.length === 0 && auto.asideKeys.join(',') === 'color,fuel,transmission',
  `pills=[${auto.barKeys.join(', ')}] · aside=[${auto.asideKeys.join(', ')}]`);
check('💳 🆕 2026-10-06: 💳 блок нь САЙДБАРТ 1 (`#advanced-filters [data-payment-filter]`)',
  !!autoSide && autoSide.payments === 1, `aside=${autoSide && autoSide.payments}`);
check('🧭 🆕 (17): 💳 «Төлбөрийн нөхцөл» нь 🎨 Өнгө-ний ЯГ ӨМНӨ (DOM дараалал ✓)',
  !!autoSide && autoSide.beforeColor === true, `beforeColor=${autoSide && autoSide.beforeColor}`);
check('🎨 «Өнгө» нь ЧИП блок (12 товч · `data-attr-multi` · `<button>` · сонголт 0)',
  auto.chipBlocks[0] && auto.chipBlocks[0].key === 'color'
    && auto.chipBlocks[0].multi === true && auto.chipBlocks[0].total === 12
    && auto.chipBlocks[0].kinds.every((k) => k === 'button')
    && auto.chipBlocks[0].pressed.length === 0,
  JSON.stringify(auto.chipBlocks[0]));
/**
 * 🆕 2026-10-03 (22) · 🆕 2026-10-06 (17): 🔀 «Хурдны хайрцаг» ба ⛽ «Түлш»
 *    ХОЁУЛАА ч ОЛОН СОНГОЛТТОЙ ЧИП (хэрэглэгчийн хүсэлт: «мөн автомашин хайлт
 *    дээр бас ⚙️ Хурдны хайрцаг -ийг 💳 Төлбөрийн нөхцөл шиг болго. бас ⛽ Түлш
 *    ийг») ⇒ 🎨 өнгөтэй ЯГ ИЖИЛ: `data-attr-multi="true"` · `.chip-toggle`
 *    `<button>` · сонголт 0 ✓ (⚠️ ФОРМ ХӨНДӨӨГДӨӨГҮЙ — `formChips` БАЙХГҮЙ)
 *    ⚠️ (17): ДОМ дараалал нь `afterPayment` ЭРЭМБЭ (⛽ түлш нь 🔀-ийн ӨМНӨ ✓)
 */
check('⛽ (22)/(17): «Түлш» ч ЧИП блок (6 товч · `data-attr-multi` · `<button>` · сонголт 0)',
  auto.chipBlocks[1] && auto.chipBlocks[1].key === 'fuel'
    && auto.chipBlocks[1].multi === true && auto.chipBlocks[1].total === 6
    && auto.chipBlocks[1].kinds.every((k) => k === 'button')
    && auto.chipBlocks[1].pressed.length === 0,
  JSON.stringify(auto.chipBlocks[1]));
check('🔀 (22)/(17): «Хурдны хайрцаг» ч ЧИП блок (2 товч · `data-attr-multi` · `<button>` · сонголт 0)',
  auto.chipBlocks[2] && auto.chipBlocks[2].key === 'transmission'
    && auto.chipBlocks[2].multi === true && auto.chipBlocks[2].total === 2
    && auto.chipBlocks[2].kinds.every((k) => k === 'button')
    && auto.chipBlocks[2].pressed.length === 0,
  JSON.stringify(auto.chipBlocks[2]));
check('⛔ 🎨/⛽/🔀 БҮГД ЧИП — авто дээр НЭГ Ч `<select>` БАЙХГҮЙ ✓',
  auto.chipBlocks.length === 3 && auto.selectKeys.length === 0,
  `chipBlocks=${auto.chipBlocks.length} · selects=[${auto.selectKeys.join(', ')}]`);

// ---- ⑦a 🎨 1 ӨНГӨ → `in.(Хар)` · badge «1 сонгосон» · чип «🎨 Хар» ----
listingReqs.length = 0;
check('🎨 «Хар» дарлаа (чип нь `<button>` ✓)', (await clickChip('color', 'Хар')) === 'OK');
await waitFor(`/attr_color=/.test(location.search)`);
await sleep(1500);
const one = await specUi();
check('🔗 URL-д `attr_color=Хар` болов (параметрийн нэр ХУУЧИН хэвээр ✓)',
  /attr_color=Хар/.test(decodeURIComponent(await url())), decodeURIComponent(await url()));
check('🔎 DB: `attrs->>color=in.(Хар)` (нэг утга — OR-ийн нэг элемент ✓)',
  dbQ('attrs->>color=in.(Хар)'), lastQ());
check('🎨 «1 сонгосон» badge + чип `aria-pressed=true`',
  one.multiBadges.includes('1 сонгосон') && one.chipBlocks[0].pressed.join(',') === 'Хар',
  `badges=[${one.multiBadges.join(' | ')}] · pressed=[${one.chipBlocks[0].pressed.join(', ')}]`);
check('🏷 Идэвхтэй шүүлтийн чип «Хар» гарлаа (🗑 2026-10-04 (39): emoji-гүй)',
  one.chips.some((c) => c === 'Хар'), `chips=[${one.chips.join(' | ')}]`);

// ---- ⑦b 🎨 2 ӨНГӨ (ХАМГИЙН ЧУХАЛ — ОЛОН СОНГОЛТ) → `in.(Хар,Цагаан)` ----
listingReqs.length = 0;
check('🎨 «Цагаан» дарлаа (2 дахь сонголт НЭМЭГДЭНЭ, эхнийх ЦУЦЛАГДАХГҮЙ ✓)',
  (await clickChip('color', 'Цагаан')) === 'OK');
await waitFor(`/attr_color=Хар/.test(location.search)`);
await sleep(1500);
const two = await specUi();
check('🔗 URL-д `attr_color=Хар,Цагаан` (таслалаар · дарсан дараалал ✓)',
  /attr_color=Хар,Цагаан/.test(decodeURIComponent(await url())), decodeURIComponent(await url()));
check('🔎 DB: `attrs->>color=in.(Хар,Цагаан)` — OR (аль нэг өнгөтэй зар ✓)',
  dbQ('attrs->>color=in.(Хар,Цагаан)'), lastQ());
check('🎨 «2 сонгосон» badge + 2 чип идэвхтэй (⚠️ DOM дараалал = `AUTO_COLOR_OPTIONS`)',
  two.multiBadges.includes('2 сонгосон')
    && [...two.chipBlocks[0].pressed].sort().join(',') === ['Хар', 'Цагаан'].sort().join(','),
  `badges=[${two.multiBadges.join(' | ')}] · pressed=[${two.chipBlocks[0].pressed.join(', ')}]`);
check('🏷 Идэвхтэй шүүлтийн чип нь ТОВЧЛОГДОВ («2 өнгө» — нэрсийг жагсаахгүй ✓; 🗑 2026-10-04 (39): emoji-гүй)',
  two.chips.some((c) => c === '2 өнгө'), `chips=[${two.chips.join(' | ')}]`);

// ---- ⑦c ЦУЦЛАХ: чип дээр дахин дарах ба «✕ Цуцлах» товч ----
listingReqs.length = 0;
check('🎨 «Хар» дээр ДАХИН дарлаа (toggle — хасагдана ✓)',
  (await clickChip('color', 'Хар')) === 'OK');
await waitFor(`/attr_color=Цагаан/.test(location.search)`);
await sleep(1500);
const toggled = await specUi();
check('🔗 URL-д зөвхөн `attr_color=Цагаан` үлдэв',
  /attr_color=Цагаан/.test(decodeURIComponent(await url())), decodeURIComponent(await url()));
check('🔎 DB: `attrs->>color=in.(Цагаан)` болов (Хар хасагдав ✓)',
  dbQ('attrs->>color=in.(Цагаан)') && !dbQ('attrs->>color=in.(Хар'), lastQ());
check('🎨 «1 сонгосон» badge хэвээр (нэг утга үлдсэн ✓)',
  toggled.multiBadges.includes('1 сонгосон'), `badges=[${toggled.multiBadges.join(' | ')}]`);
listingReqs.length = 0;
const cleared = await evalJs(`(() => {
  /**
   * 🆕 2026-10-06 (17): «Өнгө» нь САЙДБАРТ буцсан ⇒ «✕ Цуцлах» товч нь
   *    сайдбарын SideBlock дотор (pill-ийн ⌄ панель БАЙХГҮЙ ✗); ⚠️ товчийг
   *    координатаар биш, БЛОК-оор нь хайна (color-ийн data-attr-filter)
   *    ⚠️ ЭНЭ КОММЕНТ НЬ ТЕМПЛЭЙТ ЛИТЕРАЛ ДОТОР ТУЛ BACKTICK БИЧИХГҮЙ ✗
   */
  const box = document.querySelector('#advanced-filters [data-attr-filter="color"]');
  const blk = box && box.closest('div[class*="py-4"]');
  const b = blk && [...blk.querySelectorAll('button')]
    .find((x) => (x.textContent || '').trim() === '✕ Цуцлах');
  if (!b) return 'NO_BTN';
  b.click();
  return 'OK';
})()`);
check('🎨 «✕ Цуцлах» товч дарлаа', cleared === 'OK', cleared);
await waitFor(`!/attr_color/.test(location.search)`);
await sleep(1200);
check('🔗 URL-аас `attr_color` БҮРЭН АРИЛАВ (цэвэр линк ✓)',
  !/attr_color/.test(decodeURIComponent(await url())), (await url()) || '(хоосон)');
check('🔎 DB: `attrs->>color` ОГТ ЯВАХГҮЙ (шүүлт хийгдэхгүй ✓)',
  !dbQ('attrs->>color'), lastQ());
check('🎨 `aria-pressed` бүгд false ба badge АРИЛАВ (төлөв цэвэр ✓)',
  (await specUi()).chipBlocks[0].pressed.length === 0 && (await specUi()).multiBadges.length === 0,
  JSON.stringify((await specUi()).chipBlocks));

// ---- ⑦d 🔗 ХУУЧИН/гараар бичсэн линк: 1 ба 2 утга хоёулаа зөв уншигдана ----
listingReqs.length = 0;
await go(`${BASE}/?section=auto&attr_color=Хар,Цагаан`);
await sleep(1500);
const link2 = await specUi();
check('🔗 Линкээр орсон 2 өнгө чип дээр ТЭМДЭГЛЭГДЭВ (массив → `aria-pressed` ✓)',
  [...link2.chipBlocks[0].pressed].sort().join(',') === ['Хар', 'Цагаан'].sort().join(','),
  `pressed=[${link2.chipBlocks[0].pressed.join(', ')}]`);
check('🔎 DB: линкээс `attrs->>color=in.(Хар,Цагаан)` (URL ХАСАГДАХГҮЙ ✓)',
  dbQ('attrs->>color=in.(Хар,Цагаан)'), lastQ());
await go(`${BASE}/?section=auto&attr_color=Хар`);   // ⚠️ ХУУЧИН нэг утгатай линк
await sleep(1500);
const link1 = await specUi();
check('🔗 ХУУЧИН нэг утгатай линк (`?attr_color=Хар`) ч зөв (эвдрэхгүй ✓)',
  link1.chipBlocks[0].pressed.join(',') === 'Хар',
  `pressed=[${link1.chipBlocks[0].pressed.join(', ')}]`);

// ---- ⑦e 🆕 2026-10-03 (22): ⛽ «Түлш» ч ЧИП болов — 🎨 + ⛽ зэрэг (AND) ----
listingReqs.length = 0;
await go(`${BASE}/?section=auto&type=${encodeURIComponent('Суудлын машин')}&attr_color=Хар`);
await sleep(1200);
const fuelPicked = await clickChip('fuel', 'Хайбрид');
check('🎛 ⛽ Түлш дээр «Хайбрид» ЧИП дарлаа (⏳ урьд нь `<select>` байв ✗)', fuelPicked === 'OK', fuelPicked);
await waitFor(`/attr_fuel=/.test(location.search)`);
await sleep(1500);
check('🔗 URL-д `attr_fuel=Хайбрид` болов (⚠️ скаляр БИШ — массив attr ✓)',
  /attr_fuel=Хайбрид/.test(decodeURIComponent(await url())), decodeURIComponent(await url()));
check('🔎 DB: `attrs->>color=in.(Хар)` БА `attrs->>fuel=in.(Хайбрид)` ХАМТ (AND ✓)',
  dbQ('attrs->>color=in.(Хар)', 'attrs->>fuel=in.(Хайбрид)'), lastQ());
// ---- ⑦e′ ⛽ 2 ТҮЛШ (ОЛОН СОНГОЛТ) → `in.(Хайбрид,Бензин)` (OR) ----
listingReqs.length = 0;
check('⛽ «Бензин» дарлаа (2 дахь түлш НЭМЭГДЭНЭ ✓)', (await clickChip('fuel', 'Бензин')) === 'OK');
await waitFor(`/attr_fuel=Хайбрид,Бензин/.test(decodeURIComponent(location.search))`);
await sleep(1500);
check('🔎 DB: `attrs->>fuel=in.(Хайбрид,Бензин)` — OR (аль нэг түлштэй зар ✓)',
  dbQ('attrs->>fuel=in.(Хайбрид,Бензин)'), lastQ());


// ═══ ⑨ ✅ «Төлөв» (ШИНЭ / ШИНЭВТЭР / ХУУЧИН) — ОЛОН СОНГОЛТТОЙ PILL ═══
/**
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «хайлт дээр Шинэ / Шинэвтэр / Хуучин ийг бас 💳
 * Төлбөрийн нөхцөл шиг олон сонголт хийх боломжтой болго» ⇒ ✅ нь
 * 3 `chip-toggle` товч (олон сонголт) ба DB дээр
 * `attrs->>condition=in.(…)` ✓
 * 🆕 2026-10-05 (43): «Шинэ, Шинэвтэр, Хуучин ийг Төлөв гэж нэрлэ»
 *    (хэрэглэгчийн хүсэлт) ⇒ `label` нь «Төлөв» ба энэ pill нь САЙДБАРААС
 *    ГАРЧ `#filter-bar` руу шилжив (`filterBar: true`) — ⚠️ СОНГОЛТ нь
 *    ХӨНДӨГДӨӨГҮЙ (Шинэ · Шинэвтэр · Хуучин — 3 нь хэвээр ✓)
 * ⚠️ Шалгах хэсэг нь 🧺 `home` — `attrFilters: ['condition']` гэсэн 1 л
 *    шүүлттэй ба тэр нь pill тул `chipBlocks[0]` ба `barKeys[0]` ✓
 * ⚠️ `go()` нь `[data-attr-filter]` хүртэл хүлээдэг (`#filter-bar`-ыг ч
 *    хамт шалгана) тул сонголтгүй үед (анхны ачаалалт) шалгалт бүр
 *    `specUi()`-г ДАХИН дуудна ✓
 */
listingReqs.length = 0;
await go(`${BASE}/?section=home`);
const home = await specUi();
check('✅ 🧺 home: «Төлөв» нь САЙДБАРЫН ЧИП БЛОК (3 товч · `data-attr-multi` · сонголт 0)',
  home.chipBlocks.length === 1 && home.chipBlocks[0].key === 'condition'
    && home.chipBlocks[0].multi === true && home.chipBlocks[0].total === 3
    && home.chipBlocks[0].kinds.every((k) => k === 'button')
    && home.chipBlocks[0].pressed.length === 0,
  JSON.stringify(home.chipBlocks));
check('✅ 🆕 (17): блок нь САЙДБАРТ (`asideKeys` = condition) · шошго «Төлөв» · pill 0 ✓',
  home.barKeys.length === 0 && home.asideTotal === 1
    && home.asideLabels.join(' | ') === 'Төлөв',
  `pills=[${home.barKeys.join(', ')}] · aside=${home.asideTotal} · label=${home.asideLabels.join(' | ')}`);
check('⛔ «Төлөв» нь `<select>` БИШ (чип блок тул `selectKeys`-д ОРООГҮЙ ✓)',
  !home.selectKeys.includes('condition'), `selects=[${home.selectKeys.join(', ')}]`);
check('🔎 Шүүлт хоосон үед DB query-д `attrs->>condition` ОРООГҮЙ',
  !dbQ('attrs->>condition'), lastQ());

// ---- ⑨a 1 ТӨЛӨВ → `in.(Шинэ)` · badge «1 сонгосон» · чип НЭРЭЭРЭЭ ----
listingReqs.length = 0;
check('✅ «Шинэ» дарлаа (чип нь `<button>` ✓)', (await clickChip('condition', 'Шинэ')) === 'OK');
await waitFor(`/attr_condition=/.test(location.search)`);
await sleep(1500);
const cond1 = await specUi();
check('🔗 URL-д `attr_condition=Шинэ` болов (параметрийн нэр ХУУЧИН хэвээр ✓)',
  /attr_condition=Шинэ/.test(decodeURIComponent(await url())),
  decodeURIComponent(await url()));
check('🔎 DB: `attrs->>condition=in.(Шинэ)` (нэг утга — OR-ийн нэг элемент ✓)',
  dbQ('attrs->>condition=in.(Шинэ)'), lastQ());
check('✅ «1 сонгосон» badge + чип `aria-pressed=true`',
  cond1.multiBadges.includes('1 сонгосон') && cond1.chipBlocks[0].pressed.join(',') === 'Шинэ',
  `badges=[${cond1.multiBadges.join(' | ')}] · pressed=[${cond1.chipBlocks[0].pressed.join(', ')}]`);
check('✅ ⑨b Идэвхтэй шүүлтийн чип 1 утгатай үед НЭРЭЭРЭЭ («Шинэ» ✓; 🗑 2026-10-04 (39): emoji-гүй)',
  cond1.chips.some((c) => c === 'Шинэ'), `chips=[${cond1.chips.join(' | ')}]`);

// ---- ⑨b 2 ТӨЛӨВ (ХАМГИЙН ЧУХАЛ — ОЛОН СОНГОЛТ) → `in.(Шинэ,Хуучин)` ----
listingReqs.length = 0;
check('✅ «Хуучин» дарлаа (2 дахь сонголт НЭМЭГДЭНЭ, эхнийх ЦУЦЛАГДАХГҮЙ ✓)',
  (await clickChip('condition', 'Хуучин')) === 'OK');
await waitFor(`/attr_condition=Шинэ/.test(location.search)`);
await sleep(1500);
const cond2 = await specUi();
check('🔗 URL-д `attr_condition=Шинэ,Хуучин` (таслалаар · дарсан дараалал ✓)',
  /attr_condition=Шинэ,Хуучин/.test(decodeURIComponent(await url())), decodeURIComponent(await url()));
check('🔎 DB: `attrs->>condition=in.(Шинэ,Хуучин)` — OR (аль нэг төлөвтэй зар ✓)',
  dbQ('attrs->>condition=in.(Шинэ,Хуучин)'), lastQ());
check('✅ «2 сонгосон» badge + 2 чип идэвхтэй (⚠️ DOM дараалал = `CONDITION_OPTIONS`)',
  cond2.multiBadges.includes('2 сонгосон')
    && [...cond2.chipBlocks[0].pressed].sort().join(',') === ['Шинэ', 'Хуучин'].sort().join(','),
  `badges=[${cond2.multiBadges.join(' | ')}] · pressed=[${cond2.chipBlocks[0].pressed.join(', ')}]`);
check('✅ Идэвхтэй шүүлтийн чип нь ТОВЧЛОГДОВ («2 төлөв» — `multiNoun` ✓; 🗑 2026-10-04 (39): emoji-гүй)',
  cond2.chips.some((c) => c === '2 төлөв'), `chips=[${cond2.chips.join(' | ')}]`);

// ---- ⑨c ЦУЦЛАХ: чип дээр дахин дарах ба «✕ Цуцлах» товч ----
listingReqs.length = 0;
check('✅ «Шинэ» дээр ДАХИН дарлаа (toggle — хасагдана ✓)',
  (await clickChip('condition', 'Шинэ')) === 'OK');
await waitFor(`/attr_condition=Хуучин/.test(location.search)`);
await sleep(1500);
check('🔗 URL-д зөвхөн `attr_condition=Хуучин` үлдэв',
  /attr_condition=Хуучин/.test(decodeURIComponent(await url())), decodeURIComponent(await url()));
check('🔎 DB: `attrs->>condition=in.(Хуучин)` болов (Шинэ хасагдав ✓)',
  dbQ('attrs->>condition=in.(Хуучин)') && !dbQ('attrs->>condition=in.(Шинэ,Хуучин)'), lastQ());
listingReqs.length = 0;
const condCleared = await evalJs(`(() => {
  /**
   * 🆕 2026-10-06 (17): «Төлөв» нь САЙДБАРТ буцсан ⇒ «✕ Цуцлах» товч нь
   *    сайдбарын SideBlock дотор (condition-ийг closest-оор олно —
   *    pill-ийн ⌄ панель БАЙХГҮЙ ✗)
   *    ⚠️ ЭНЭ КОММЕНТ НЬ ТЕМПЛЭЙТ ЛИТЕРАЛ ДОТОР ТУЛ BACKTICK БИЧИХГҮЙ ✗
   */
  const box = document.querySelector('#advanced-filters [data-attr-filter="condition"]');
  const blk = box && box.closest('div[class*="py-4"]');
  const b = blk && [...blk.querySelectorAll('button')]
    .find((x) => (x.textContent || '').trim() === '✕ Цуцлах');
  if (!b) return 'NO_BTN';
  b.click();
  return 'OK';
})()`);
check('✅ «Төлөв» блокийн «✕ Цуцлах» товч дарлаа (сайдбарт ✓)', condCleared === 'OK', condCleared);
await waitFor(`!/attr_condition/.test(location.search)`);
await sleep(1200);
check('🔗 URL-аас `attr_condition` БҮРЭН АРИЛАВ (цэвэр линк ✓)',
  !/attr_condition/.test(decodeURIComponent(await url())), (await url()) || '(хоосон)');
check('🔎 DB: `attrs->>condition` ОГТ ЯВАХГҮЙ (шүүлт хийгдэхгүй ✓)',
  !dbQ('attrs->>condition'), lastQ());
const condBack = await specUi();
check('✅ `aria-pressed` бүгд false ба badge АРИЛАВ (төлөв цэвэр ✓)',
  condBack.chipBlocks[0].pressed.length === 0 && condBack.multiBadges.length === 0,
  JSON.stringify(condBack.chipBlocks));

// ---- ⑨d 🔗 ХУУЧИН/гараар бичсэн линк: 1 ба 2 утга хоёулаа зөв уншигдана ----
listingReqs.length = 0;
await go(`${BASE}/?section=furniture&type=${encodeURIComponent('Буйдан, кресло')}&attr_condition=Шинэ,Хуучин`);
await sleep(1500);
const condLink2 = await specUi();
const condLink2Block = condLink2.chipBlocks.find((b) => b.key === 'condition');
check('🔗 🛋️ Тавилга дээр линкээр орсон 2 төлөв чип дээр ТЭМДЭГЛЭГДЭВ ✓',
  !!condLink2Block && [...condLink2Block.pressed].sort().join(',') === ['Шинэ', 'Хуучин'].sort().join(','),
  `pressed=[${condLink2Block ? condLink2Block.pressed.join(', ') : ''}]`);
check('🔎 DB: линкээс `attrs->>condition=in.(Шинэ,Хуучин)` (URL ХАСАГДАХГҮЙ ✓)',
  dbQ('attrs->>condition=in.(Шинэ,Хуучин)'), lastQ());
await go(`${BASE}/?section=home&attr_condition=Хуучин`);   // ⚠️ ХУУЧИН нэг утгатай линк
await sleep(1500);
check('🔗 ХУУЧИН нэг утгатай линк (`?attr_condition=Хуучин`) ч зөв (эвдрэхгүй ✓)',
  (await specUi()).chipBlocks[0].pressed.join(',') === 'Хуучин');
check('🔎 DB: `attrs->>condition=in.(Хуучин)` (нэг утга ч `in.()` ✓)',
  dbQ('attrs->>condition=in.(Хуучин)'), lastQ());


// ═══════ ⑧ 📱 МОБАЙЛ (390×844) ═══════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await go(`${BASE}/?section=computers&type=Notebook`);
const mobile = await specUi();
check('📱 Мобайл: 5 шүүлт ХАРАГДАНА (`data-attr-filter` === 5 ✓)',
  mobile.total === 5, `total=${mobile.total}`);
check('📱 Мобайл: 📺/⚙️/🧠/💾 (pill) + ✅ (сайдбар) бүгд DOM-д байна',
  mobile.keys.join(',') === 'condition,screen,cpu,ram,storage', mobile.keys.join(','));
check('📱 Мобайл: 📺/⚙️/🧠/💾 pill (`#filter-bar`) · ✅ нь САЙДБАРТ (2026-10-06 (17) ✓)',
  mobile.barKeys.join(',') === 'screen,cpu,ram,storage'
    && mobile.asideKeys.join(',') === 'condition' && mobile.asideTotal === 1,
  `pills=[${mobile.barKeys.join(', ')}] · aside=[${mobile.asideKeys.join(', ')}]`);
/**
 * 🆕 2026-10-05 (43): pill нь мобайлд Ч ҮНЭХЭЭР ХАРАГДАХ ЁСТОЙ —
 *    `getBoundingClientRect()` нь `display:none` үед 0 буцаана;
 *    ⚠️ `#filter-bar` нь `flex-wrap` тул баруун ирмэгээс ХАВАХГҮЙ ✓
 */
check('📱 Мобайл: pill бүр ДЭЛГЭЦ ДЭЭР харагдана (хэмжээ > 0 · хавсангүй ✓)',
  await evalJs(`[...document.querySelectorAll('#filter-bar [data-filter-pill]')]
    .every((el) => { const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right <= window.innerWidth + 1; })`),
  await evalJs(`[...document.querySelectorAll('#filter-bar [data-filter-pill]')]
    .map((el) => Math.round(el.getBoundingClientRect().width)).join(' / ')`));
check('📱 Мобайл: хэвтээ гүйлт (overflow) ГАРАХГҮЙ',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'),
  await evalJs('document.documentElement.scrollWidth + " / " + window.innerWidth'));
await rpc('Emulation.clearDeviceMetricsOverride');

// ═══════ ⑧b 🎛 PILL HOVER — «БАРААН» БОЛНО (2026-10-06 (16)) ═══════
/**
 * 🆕 2026-10-06 (16) (хэрэглэгчийн хүсэлт: «Ажлын зарын БОЛОН БУСАД ХЭСЭГ
 *    байгаа … button дээр mouse дээр cursor аваачхад одоогийхоосоо илүү
 *    бараан өнгөтэй болдог болго»): 💻 `computers` нь «бусад хэсэг»-ийн
 *    төлөөлөл — `FilterPill` нь НЭГ компонент тул 📺/⚙️/🧠/💾/✅ pill ч
 *    ХАМТ бараан болно ✓ (⏳ `hover:bg-gray-50` #FAF8F5 нь цагаан/крем
 *    дэвсгэр дээр БАРАГ мэдэгддэггүй байв ✗)
 * ⚠️ БОДИТ хулгана: `Input.dispatchMouseEvent(mouseMoved)` ⇒ `:hover` ⇒
 *    `getComputedStyle().backgroundColor` — rgba/hex-ийг ТООГООР батлана ✓
 */
const lum = (css) => {
  const m = /rgba?\(([^)]+)\)/.exec(css || '');
  if (!m) return null;
  const p = m[1].split(/[,/]/).map((x) => Number(x.trim()));
  const a = p.length > 3 ? p[3] : 1;
  const mix = (c) => c * a + 255 * (1 - a);
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(mix(p[0])) + 0.7152 * f(mix(p[1])) + 0.0722 * f(mix(p[2]));
};
/** Pill-ийн ТОВЧНЫ хэв + ДЭЛГЭЦ дээрх төв цэг (⚠️ координат нь viewport-той) */
const pillProbe = (key) => evalJs(`(() => {
  const p = document.querySelector('[data-filter-pill="' + ${JSON.stringify(key)} + '"]');
  const b = p && p.querySelector('button');
  if (!b) return null;
  b.scrollIntoView({ block: 'center' });
  const s = getComputedStyle(b);
  const r = b.getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top + r.height / 2);
  const at = document.elementFromPoint(x, y);
  return { bg: s.backgroundColor, border: s.borderTopColor, x, y,
    onButton: !!at && (at === b || b.contains(at)),
    hover: b.matches(':hover'),
    expanded: b.getAttribute('aria-expanded') };
})()`);
/** Хулганыг тухайн цэг рүү зөөнө (`mousedown` БИШ — зөвхөн hover ✓) */
const mouseTo = async (x, y) => {
  await rpc('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
  await sleep(450);
};
/**
 * ⚠️ 2026-10-06 (16) CDP ДЭЭР БАРИГДСАН FLAKY УРХИ: зайлуулах үед ҮРГЭЛЖ ижил
 *    цэг рүү дараалан `mouseMoved` явуулбал Chrome нь заримдаа hit-test-ийг
 *    ДАХИН ХИЙХГҮЙ ба hover ХЭВЭЭР үлддэг ✗ ⇒ зайлуулах цэгийг ЭЭЛЖЛҮҮЛНЭ ✓
 *    (⏳ `cdp-job-chips` §⑥c дээр 1 удаа унасан — `:hover` = true хэвээр байв)
 */
const AWAY = [[2, 2], [5, 1180], [11, 4], [3, 900]];
let awayAt = 0;
const mouseAway = async () => {
  awayAt = (awayAt + 1) % AWAY.length;
  await mouseTo(AWAY[awayAt][0], AWAY[awayAt][1]);
};
/** ⏳ TRANSITION (150ms) + дараагийн frame хүртэл хүлээж ДАХИН уншина ✓ */
const probeUntil = async (key, okFn, tries = 6) => {
  let p = null;
  for (let i = 0; i < tries; i += 1) {
    p = await pillProbe(key);
    if (p && okFn(p)) return p;
    await sleep(250);
  }
  return p;
};

console.log('\n⑧b PILL HOVER — 💻 (computers): «бараан» болно (2026-10-06 (16))');
await go(`${BASE}/?section=computers&type=Notebook`);
/** ⚠️ Нээлттэй ⌄ панель нь pill-ийн HOVER ЦЭГИЙГ халхална ✗ → ESC */
await rpc('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await rpc('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
await sleep(400);
await mouseAway();
const basePill = await probeUntil('screen', (p) => p.bg === 'rgb(255, 255, 255)');
check('🎛 💻 Сонгоогүй pill (📺 `screen`): фон ЦАГААН · hover цэг нь товч дээр ✓',
  !!basePill && basePill.bg === 'rgb(255, 255, 255)' && basePill.hover === false && basePill.onButton === true,
  basePill ? `${basePill.bg} @${basePill.x},${basePill.y} hover=${basePill.hover}` : 'NO_PILL');
await mouseTo(basePill.x, basePill.y);
const hovPill = await probeUntil('screen', (p) => p.bg === 'rgb(233, 228, 217)');
check('🆕 (16) 💻 HOVER: фон БАРААН болов (`bg-gray-200` = rgb(233, 228, 217)) · хүрээ `border-gray-400` · `:hover` ✓',
  !!hovPill && hovPill.bg === 'rgb(233, 228, 217)' && hovPill.border === 'rgb(176, 167, 148)'
    && hovPill.hover === true,
  hovPill ? `${hovPill.bg} / ${hovPill.border} hover=${hovPill.hover}` : 'NO_PILL');
check('🆕 (16) 💻 HOVER: гэрэлтэлт БАГА (⏳ `gray-50` ≈0.95 биш) — 💼/🚗-той ЯГ ижил дүрэм ✓',
  !!hovPill && lum(hovPill.bg) < lum(basePill.bg) && lum(hovPill.bg) < 0.9,
  `${(lum(basePill.bg) || 0).toFixed(3)} → ${(lum(hovPill.bg) || 0).toFixed(3)}`);
await mouseAway();
const backPill = await probeUntil('screen', (p) => p.bg === 'rgb(255, 255, 255)');
check('🆕 (16) 💻 HOVER: хулганыг зайлуулахад фон БУЦАЖ цагаан болов (`:hover` false)',
  !!backPill && backPill.bg === 'rgb(255, 255, 255)' && backPill.hover === false,
  backPill ? `${backPill.bg} hover=${backPill.hover}` : 'NO_PILL');

// ═══════ ⑨′ 🆕 (71) · ✏️ (73) 🛏 «ОР БОЛДОГ ЭСЭХ» — ЗӨВХӨН «Буйдан, кресло» ДЭД ТӨРӨЛД ═══════
/**
 * 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-08 (71)): «Зөвхөн Буйдан, кресло -ийн зар
 *    оруулах болон хайх үед Буйдан болдог → Тийм/Үгүй гэсэн хэсэг нэмэх.
 *    Үүнийг Төлөв -ийн доор оруулах»
 * ✏️ (73): хэрэглэгч «"Буйдан болдог" биш "Ор болдог эсэх" шүү дээ текстээ зас»
 *    гэсэн тул `aria-label` (шошго) нь «Ор болдог эсэх» болов — ⚠️ `key`/URL/DB
 *    (`sofaBed`) ХӨНДӨӨГДӨӨГҮЙ ✓
 * ⚠️ БОДИТ DOM дээр: ① дэд төрөл СОНГОСОН үед гарна ② ✅ «Төлөв»-ийн ЯГ ДООР
 *    ③ сонгоход URL `?attr_sofaBed=Тийм` ④ DB `attrs->>sofaBed=eq.Тийм`
 *    ⑤ холдуу дэд төрөл/дэд төрөлгүй үед ГАРАХГҮЙ (нэг л дүрэм ✓)
 * ⚠️ Тайлбар дотор BACKTICK БИЧИХГҮЙ — evalJs нь ТЕМПЛЭЙТ ЛИТЕРАЛ ✓
 */
console.log('\n⑨′ 🛏 (2026-10-08 (71) · ✏️ шошго (73)) «Ор болдог эсэх» — зөвхөн «Буйдан, кресло» дэд төрөлд');
const sofaProbe = () => evalJs(`(() => {
  const aside = document.getElementById('advanced-filters');
  const el = aside ? aside.querySelector('[data-attr-filter="sofaBed"]') : null;
  const cond = aside ? aside.querySelector('[data-attr-filter="condition"]') : null;
  if (!el) return { found: false, cond: !!cond };
  const opts = [...el.options].map((o) => (o.value || '-') + ':' + (o.textContent || '').trim());
  const r = el.getBoundingClientRect();
  const rc = cond ? cond.getBoundingClientRect() : null;
  return {
    found: true, tag: el.tagName, opts, label: el.getAttribute('aria-label'),
    visible: r.width > 0 && r.height > 0,
    afterCond: rc ? r.top >= rc.bottom - 2 : null,
    asideCount: aside.querySelectorAll('[data-attr-filter]').length,
  };
})()`);
listingReqs.length = 0;
await go(`${BASE}/?section=furniture&type=${encodeURIComponent('Буйдан, кресло')}`);
const sofaSel = await sofaProbe();
check('🛏 (71/73) «Буйдан, кресло» дээр 🛏 <select> ГАРНА (Бүгд/Тийм/Үгүй) ✓',
  sofaSel.found && sofaSel.tag === 'SELECT' && sofaSel.opts.length === 3
    && sofaSel.opts[0] === '-:Бүгд' && sofaSel.opts[1] === 'Тийм:Тийм' && sofaSel.opts[2] === 'Үгүй:Үгүй',
  JSON.stringify(sofaSel));
check('🛏 (71/73) Байрлал: ✅ «Төлөв»-ийн ЯГ ДООР (sidebar) + ДЭЛГЭЦ дээр харагдана ✓',
  sofaSel.afterCond === true && sofaSel.visible === true && sofaSel.label === 'Ор болдог эсэх',
  `afterCond=${sofaSel.afterCond} visible=${sofaSel.visible} label=${sofaSel.label}`);
check('🛏 (73) Шошго «Ор болдог эсэх» бөгөөд «Буйдан болдог» БУЦАЖ ОРООГҮЙ ✓',
  !!sofaSel.label && !/Буйдан/.test(sofaSel.label), `label=${sofaSel.label}`);
check('🛏 (71) Sidebar-д ЯГ 2 attr шүүлт (✅ Төлөв + 🛏 Ор болдог эсэх) ✓',
  sofaSel.asideCount === 2, `count=${sofaSel.asideCount}`);
listingReqs.length = 0;
const sofaPicked = await evalJs(`(() => {
  const el = document.querySelector('#advanced-filters [data-attr-filter="sofaBed"]');
  if (!el) return 'NO_EL';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  setter.call(el, 'Тийм');
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return 'OK';
})()`);
check('🛏 (71) «Тийм» сонголт хийгдэв (native setter + change ✓)', sofaPicked === 'OK', sofaPicked);
await waitFor(`/attr_sofaBed/.test(location.search)`);
await sleep(1200);
check('🔗 (71) URL-д `?attr_sofaBed=Тийм` нэмэгдэв ✓',
  /attr_sofaBed=Тийм/.test(decodeURIComponent(await url())), decodeURIComponent(await url()));
check('🔎 (71) DB: `attrs->>sofaBed=eq.Тийм` (энгийн <select> тул eq ✓)', dbQ('attrs->>sofaBed'), lastQ());
const sofaBack = await sofaProbe();
const sofaVal = await evalJs(`(() => {
  const el = document.querySelector('#advanced-filters [data-attr-filter="sofaBed"]');
  return el ? el.value : 'NO_EL';
})()`);
check('🛏 (71) Сонгосон утга <select> дээр ХЭВЭЭР (Тийм) ✓',
  sofaBack.found === true && sofaVal === 'Тийм', `found=${sofaBack.found} value=${sofaVal}`);
await go(`${BASE}/?section=furniture&type=${encodeURIComponent('Зочны өрөөний')}`);
check('🚫 (71) ХОЛДУУ дэд төрөлд 🛏 ГАРАХГҮЙ (зөвхөн ✅ Төлөв ✓)',
  (await sofaProbe()).found === false, JSON.stringify(await sofaProbe()));
await go(`${BASE}/?section=furniture`);
check('🚫 (71) Дэд төрөл СОНГООГҮЙ үед 🛏 ГАРАХГҮЙ ✓', (await sofaProbe()).found === false);
await go(`${BASE}/?section=home`);
check('🚫 (71) 🧺 «Гэр ахуйн бараа» (холдуу ХЭСЭГ) дээр 🛏 БАЙХГҮЙ ✓', (await sofaProbe()).found === false);
// ═══════ ⑨ ДҮГНЭЛТ ═══════



check('🧯 Консол дээр exception ГАРАГҮЙ', exceptions.length === 0, exceptions.slice(0, 2).join(' | ') || '—');
console.log(`\n${fail === 0 ? '✅' : '❌'} CDP — ${pass} OK, ${fail} FAIL\n`);
ws.close();
await closeOwnTab();
process.exit(fail === 0 ? 0 : 1);

