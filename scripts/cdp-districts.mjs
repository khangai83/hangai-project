/**
 * 🗺 CDP ШАЛГАЛТ — «Дүүрэг / Сум» шүүлт (UI + URL + DB + breadcrumb)
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-03):
 *   ① «Дэлгэрэнгүй хайлтын Дүүрэг / Сум ийг Өрөөний тоо хайх тай адилхан
 *      олон сонгол хийх боломжтой болго» → `<select>` (нэг сонголт) нь
 *      ХОРООНЫ блоктой ИЖИЛ `chip-toggle` чипүүд болов
 *   ② «🛏 Өрөөний тоо гэдгийн доор Өрөө гэсэн байгаа text ийг арилга»
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ (2026-10-04 (28) — ПИКЕР РУУ ШИЛЖСЭН):
 *   ⏳ ХУУЧИН УРСГАЛ (сайдбарт шууд чипүүд): ① сайдбарт Хот/Аймаг `<select>`
 *      + дүүргийн чипүүд + хорооны чипүүд байв → чип дарахад ШУУД URL
 *      солигддог байв.
 *   🆕 ШИНЭ УРСГАЛ: сайдбарт ЗӨВХӨН нэг товч (`[data-sidebar-location]`) —
 *      дарахад `[data-location-picker]` (modal) нээгдэж, сонголт нь НООРОЙ
 *      (draft) дээр хуримтлагдана; `[data-apply-location]` («Байршлыг
 *      хэрэглэх») дарахад л URL/DB солигдоно ✓
 *      ⇒ зөвхөн ТОВЧНЫ ДАРААЛТ БИШ, «нээх → сонгох → хэрэглэх» ГУРВАН
 *        алхам шалгагдана ✓
 *   ⓪ Сайдбарын Байршил блок: `[data-sidebar-location]` === 1 ба ХУУЧИН
 *      «Бүх байршил — Хот/Аймаг» `<select>` DOM-д БАЙХГҮЙ ✓
 *      ⚠️ Шошго нь толгойнхтой НЭГ дүрэм (`locationLabel`): хот сонгогдсон ч
 *         дүүрэг/хороо сонгоогүй бол ЗӨВХӨН хотын нэр («Улаанбаатар») ✓
 *         (хуучин сайдбарын `<select>` нь хот сонгогдоогүй мэт харагддаг байв ✗)
 *   ① Пикер нээгдэхэд: `[data-district-filter]` === 1 · `[data-district-value]`
 *      === 9 (УБ-ын 9 дүүрэг) · `aria-label="Дүүрэг"` бүлэг === 1 ✓
 *   ①b ДҮҮРЭГ СОНГОХ → «Баянгол» + «Сүхбаатар» (draft) → «Байршлыг хэрэглэх»
 *      → URL `?district=Баянгол,Сүхбаатар` · DB `district=in.(Баянгол,Сүхбаатар)`
 *      · сайдбарт 2 pill («Баянгол», «Сүхбаатар») + `[data-location-clear]`
 *      · дахин нээж дарвал ЦУЦЛАГДАНА (checkbox мэт toggle ✓)
 *   ①c ХОРООНЫ НЭГДЭЛ: 2 дүүрэг сонгоход хорооны мөрүүд сонгосон БҮХ
 *      дүүргийн хороог (давхцалгүй) харуулна; 1 дүүрэг рүү буцахад жагсаалт
 *      нь тэр дүүргийн хороогоор цэвэрлэгдэнэ ✓ (`[data-khoroo-value]`)
 *   ①d 🗑 «Өрөө» гэсэн ИЛҮҮЦЭЛ шошго DOM-д БАЙХГҮЙ (хүсэлт ②) — «Өрөөний
 *      тоо» блокийн гарчиг хэвээр, badge нь «N сонгосон» ✓
 *   ② Аймаг (Дархан-Уул) дээр СУМдын мөр гарна (4) ба хорооны багана
 *      ГАРАХГҮЙ (💡 «Дүүрэг сонгоход хорооны жагсаалт нээгдэнэ» зөвлөгөө ✓)
 *   ③ ХУУЧИН линк `?district=Баянгол` — пикерт мөр тэмдэглэгдэж, DB
 *      `district=eq.…` (`.in()` БИШ!) ба breadcrumb нь «Баянгол» хэвээр ✓
 *   ④ Идэвхтэй шүүлтийн чип `📍 2 дүүрэг` дээрх ✕ → дүүрэг цэвэрлэгдэнэ
 *   ⑤ Сайдбарын «✕ Цэвэрлэх» (`[data-location-clear]`) → БҮХ байршил арилж,
 *      URL/DB цэвэр болно ✓
 *   ⑥ breadcrumb: 2 дүүрэг → «2 дүүрэг» · «Үл хөдлөх» линк → төрөл арилна,
 *      ХАРИН sidebar ХЭВЭЭР (2026-10-03 (13): progressive disclosure ХАСАГДАВ)
 *   ⑦ 📱 Мобайл 390px: сайдбарын товч ба толгойн 📍 товч харагдана, хэвтээ
 *      гүйлт (overflow) ГАРАХГҮЙ ✓
 *   ⑦b 📱 Мобайл DRILL-DOWN (2026-10-04 (29) — хэрэглэгчийн хүсэлт «нэг нэг
 *      хуудсаар»): 3 багана НУУГДАЖ, НЭГ ДЭЛГЭЦЭД НЭГ ШАТЛАЛ — Хот/Аймаг →
 *      `›` → Дүүрэг → `›` → Хороо; буцах товч (`←`) гарна ✓
 *      ⚠️ 2026-10-04 (30) засвар: дүүргийн НЭР дээр дарахад ДОТОР ОРНО,
 *         CHECKBOX нь ЗӨВХӨН сонгоно (хэрэглэгч «хороо гарч ирэхгүй» гэсэн
 *         гомдол — өмнө нь зөвхөн жижиг `›` дарж байж хороо гардаг байв ✗)
 *   ⑧ Консол дээр JS exception 0
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) `npm run build && npm run start` — сервер http://localhost:3000 дээр
 *   2) Chrome-ыг алсын дебагттайгаар нээсэн байх:
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --remote-debugging-port=9222 http://localhost:3000/
 *   Дараа нь:  node scripts/cdp-districts.mjs   (эсвэл npm run cdp:districts)
 *   ℹ️ Chrome байхгүй бол зөвхөн unit тест: `npm run test:districts` ✓
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
// ⚠️ `PUT /json/new` нь табыг BACKGROUND-д нээдэг → идэвхгүй табын renderer
//    хүйтэн болж `Runtime.evaluate` нь 30с timeout болдог ✗ → FRONT-д гаргана ✓
await rpc('Page.bringToFront');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** ⚠️ Renderer ачаалалтай үед `Runtime.evaluate` хааяа timeout болдог ✗ →
 *    НЭГ удаа дахин оролдоно ✓ */
const evalJs = async (expression) => {
  const call = async () => {
    const r = await rpc('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    // ⚠️ `text` нь «Uncaught» гэсэн УТГАГҮЙ мэдээлэл л өгдөг ✗ →
    //    жинхэнэ мессежийг `exception.description`-оос авна ✓
    //    (ж: PROBE дотор backtick бичвэл «select is not defined» гэж харагдана)
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
const waitFor = async (expression, ms = 9000) => {
  const until = Date.now() + ms;
  for (;;) {
    try { if (await evalJs(`!!(${expression})`)) return true; } catch { /* хуудас солигдож байна */ }
    if (Date.now() > until) return false;
    await sleep(250);
  }
};
const go = async (url) => {
  await rpc('Page.navigate', { url });
  await waitFor(`document.readyState === 'complete'`);
  await sleep(700);
};

/** 🗺 DOM дахь дүүргийн мөрүүдийн төлөв (`data-district-*` дэгээгээр)
 *  ⚠️ 2026-10-04 (28): эдгээр нь ОДОО `LocationPicker` (modal) дотор —
 *     пикер НЭЭЛТТЭЙ үед л тоологдоно (гадуур нь 0 ✓) */
const districtUi = () => evalJs(`(() => {
  const chips = [...document.querySelectorAll('[data-district-value]')];
  const html = document.documentElement.textContent || '';
  return {
    picker: !!document.querySelector('[data-location-picker]'),
    blocks: document.querySelectorAll('[data-district-filter]').length,
    chips: chips.length,
    labels: chips.map((b) => b.textContent.trim().replace(/^✓/, '').trim()),
    selected: chips.filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.getAttribute('data-district-value')),
    // ⚠️ aria-label="Дүүрэг" нь бүлэг (role=group div) дээр байдаг —
    //    зөвхөн button дундаас хайвал 0 гарч ХУУРАМЧ улаан өгнө ✗
    // 🏷️ 2026-10-03 (14): шошго «Дүүрэг / Сум» → «Дүүрэг» болов ⇒ regex БИШ
    //    ЯГ ТЭНЦҮҮ (===) шалгана — /Дүүрэг/ гэвэл идэвхтэй шүүлтийн чипийн
    //    aria-label («2 дүүрэг хайлтыг хасах») бас тоологдож ХУУРАМЧ өгнө ✗
    //    ⚠️ ЭНЭ PROBE нь TEMPLATE LITERAL — коммент дотор BACKTICK БИЧИХГҮЙ ✗
    groups: [...document.querySelectorAll('[aria-label]')]
      .filter((e) => e.getAttribute('aria-label') === 'Дүүрэг').length,
    // ⚠️ ХУУЧИН нэг сонголттой select товч БҮРЭН арилсан эсэх (хүсэлт ①)
    //    (⚠️ ХҮСНЭГТ доторх текст — энд BACKTICK бичих ХЯЗГААРТАЙ: template
    //     literal-ыг тасалж, Node талд «select is not defined» алдаа өгнө ✗)
    selects: [...document.querySelectorAll('select')]
      .filter((s) => /Дүүрэг|Сум/.test(s.textContent || '')).length,
    // ⚠️ ХҮСЭЛТ ② — «Өрөөний тоо»-гийн доорх «Өрөө» гэсэн ганц текст зангилаа
    strayRoom: [...document.querySelectorAll('span,div,p,label')]
      .filter((e) => e.children.length === 0 && e.textContent.trim() === 'Өрөө').length,
    roomTitle: /Өрөөний тоо/.test(html),
    roomChips: document.querySelectorAll('[data-room-value]').length,
  };
})()`);

/** 📍 Сайдбарын «Байршил» товчийг дараад пикерийг НЭЭНЭ (2026-10-04 (28))
 *  ⚠️ Толгойн `[data-header-location]` нь `≥xl` (1280px) дээр л DOM-д байна —
 *     `1280px`-ийн viewport дээр ХОЁУЛАА байх тул сайдбарынхийг ТҮРҮҮ нэхь ✓
 *     (эс бөгөөс кнопк нь 2 удаа «дарж», 2 дахь дарга нь пикерийг ХААЖ
 *      «пикер нээгдээгүй» гэсэн ХУУРАМЧ улаан өгнө ✗) */
const openPicker = () => evalJs(`(() => {
  const b = document.querySelector('[data-sidebar-location]')
    || document.querySelector('[data-header-location]');
  if (!b) return 'NO_BTN';
  b.click();
  return 'OK';
})()`);

/** ✅ «Байршлыг хэрэглэх» — НООРОЙ (draft) сонголтыг л `filters` руу бичнэ */
const applyPicker = () => evalJs(`(() => {
  const b = document.querySelector('[data-apply-location]');
  if (!b) return 'NO_APPLY';
  b.click();
  return 'OK';
})()`);

/** ✕ Пикерийг хаах (modal-ийн «Хаах» товч) */
const closePicker = () => evalJs(`(() => {
  const b = document.querySelector('[data-location-picker] [aria-label="Хаах"]');
  if (!b) return 'NO_CLOSE';
  b.click();
  return 'OK';
})()`);

/** 📍 Сайдбарын Байршил блокийн төлөв — товч/pill/цэвэрлэх/хуучин select */
const sidebarUi = () => evalJs(`(() => {
  const btn = document.querySelector('[data-sidebar-location]');
  const picker = document.querySelector('[data-location-picker]');
  return {
    btn: document.querySelectorAll('[data-sidebar-location]').length,
    label: btn ? btn.textContent.trim() : null,
    // ⏳ 2026-10-04 (28)-д ХАСАГДАВ: Хот / Аймаг <select> (хүсэлт ①)
    //    ⚠️ ЭНЭ PROBE нь TEMPLATE LITERAL — коммент дотор BACKTICK БИЧИХГҮЙ ✗
    //    ⚠️ мөн regex дотор «арын налуу зураас + slash» БИЧИХГҮЙ: template
    //       literal нь түүнийг зүгээр slash болгож задлаад
    //       «Invalid regular expression flags» алдаа өгнө ✗
    //       → slash-ыг ОРХИХ — 3 үг л хайж байна (Хот|Аймаг|Бүх байршил) ✓
    citySelects: [...document.querySelectorAll('select')]
      .filter((s) => /Хот|Аймаг|Бүх байршил/.test(s.textContent || '')).length,
    // ⏳ мөн хасгдав: сайдбарын чипүүд (одоо пикер дотор л байна ✓)
    sidebarChips: picker ? 0
      : document.querySelectorAll('[data-district-value]').length,
    pills: document.querySelectorAll('[data-location-pill]').length,
    pillD: [...document.querySelectorAll('[data-location-pill="district"]')]
      .map((e) => e.textContent.trim()),
    pillK: [...document.querySelectorAll('[data-location-pill="khoroo"]')]
      .map((e) => e.textContent.trim()),
    clear: document.querySelectorAll('[data-location-clear]').length,
  };
})()`);

/** 🗺 Нэг дүүргийн мөрийг дарах (утга нь дүүргийн нэр — ЗӨВХӨН ноорог ✓) */
const clickDistrict = (value) => evalJs(`(() => {
  const b = document.querySelector('[data-district-value="${value}"]');
  if (!b) return 'NO_CHIP';
  b.click();
  return 'OK';
})()`);

/** 🏘 Хорооны мөрүүдийн төлөв.
 *  ⚠️ 2026-10-04 (28): ХУУЧИН хувилбар нь «…хороо» гэж ТӨГСДӨГ текстийг
 *     хайдаг байв — гэхдээ одоо пикер дээр САЙДБАРЫН PILL («5-р хороо») ч,
 *     идэвхтэй шүүлтийн чип ч ижил төгсгөлтэй тул ХУУРАМЧ ДАВХАР тоологдоно ✗
 *     ⇒ `[data-khoroo-value]` дэгээгээр (`LocationPicker.CheckRow`) л тоолно ✓ */
const khorooUi = () => evalJs(`(() => {
  const rows = [...document.querySelectorAll('[data-khoroo-value]')];
  return {
    chips: rows.length,
    unique: new Set(rows.map((r) => r.getAttribute('data-khoroo-value'))).size,
    selected: rows.filter((r) => r.getAttribute('aria-pressed') === 'true').length,
    hint: /хорооны жагсаалт нээгдэнэ/.test(document.body.textContent),
  };
})()`);

/** 🏘 Нэг хорооны мөрийг дарах (ж: «5-р хороо» — зөвхөн ноорог ✓) */
const clickKhoroo = (value) => evalJs(`(() => {
  const b = document.querySelector('[data-khoroo-value="${value}"]');
  if (!b) return 'NO_ROW';
  b.click();
  return 'OK';
})()`);

/**
 * 📱 МОБАЙЛ (<640px) DRILL-DOWN-ийн төлөв (2026-10-04 (29)).
 * ⚠️ `vis()` — `getClientRects().length` (`display:none`-ийг 0 гэж үзнэ ✓);
 *    `[data-mobile-location]` нь `sm:hidden`, `[data-district-filter]` (каскад)
 *    нь `hidden … sm:flex` тул мобайлд ЯГ НЭГ нь харагдах ЁСТОЙ ✓
 */
const mobileLocUi = () => evalJs(`(() => {
  const vis = (el) => !!el && el.getClientRects().length > 0;
  const drows = [...document.querySelectorAll('[data-mobile-district-value]')];
  return {
    box: vis(document.querySelector('[data-mobile-location]')),
    cascade: vis(document.querySelector('[data-district-filter]')),
    cities: document.querySelectorAll('[data-mobile-city]').length,
    districts: drows.length,
    khoroos: document.querySelectorAll('[data-mobile-khoroo-value]').length,
    pressedD: drows.filter((b) => b.getAttribute('aria-pressed') === 'true')
      .map((b) => b.getAttribute('data-mobile-district-value')),
    back: vis(document.querySelector('[data-location-picker] [aria-label="Буцах"]')),
  };
})()`);

/** 📱 Мобайл: ХОТ/АЙМГИЙН мөрийг дарах (шатлал ГҮНЗГИЙНЭ ✓) */
const clickMobileCity = (value) => evalJs(`(() => {
  const b = document.querySelector('[data-mobile-city="${value}"]');
  if (!b) return 'NO_CITY';
  b.click();
  return 'OK';
})()`);

/** 📱 Мобайл: дүүргийн НЭР + `›`-г дарах (хорооны шатлал руу орох) */
const clickMobileDrill = (value) => evalJs(`(() => {
  const b = document.querySelector('[data-location-picker] [aria-label="${value} — хороо руу орох"]');
  if (!b) return 'NO_DRILL';
  b.click();
  return 'OK';
})()`);

/** 📱 Мобайл: дүүргийн CHECKBOX-ыг дарах (зөвхөн сонгох — шатлал СОЛИГДОХГҮЙ) */
const clickMobileToggle = (value) => evalJs(`(() => {
  const b = document.querySelector('[data-mobile-district-value="${value}"]');
  if (!b) return 'NO_TOGGLE';
  b.click();
  return 'OK';
})()`);

/** 📱 Мобайл: `←` буцах товч */
const clickMobileBack = () => evalJs(`(() => {
  const b = document.querySelector('[data-location-picker] [aria-label="Буцах"]');
  if (!b) return 'NO_BACK';
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
 * ⚠️ Query-г ХҮН УНШИХ хэлбэрт хөрвүүлнэ: `decodeURIComponent` + `+` → зай.
 *    (`URLSearchParams`/`fetch` нь зайг `+` гэж бичдэг тул `decodeURIComponent`
 *     дангаараа «5-р+хороо» гэж үлдээж, хүлээгдэх текст таарахгүй ✗)
 * ⚠️ postgrest-js нь ЭНГИЙН утгуудыг (таслалт/хаалт/зайгүй) `in.(А,Б)` гэж
 *    ЦИТАТГҮЙ бичдэг — `"А"` гэж хүлээвэл ХУУРАМЧ улаан өгнө ✗ (DB дээр
 *    PostgREST хоёуланг ижил уншина ✓)
 */
const dec = (u) => decodeURIComponent(u).replace(/\+/g, ' ');
const dbQ = (...frags) => listingReqs.some((u) => frags.every((f) => dec(u).includes(f)));
/** ⚠️ `district=` гэсэн ЭНГИЙН хайлт нь `select=…district…`-тэй ХОЛЬДОЖ болзошгүй —
 *    тиймээс шүүлт БАЙГАА ЭСЭХИЙГ `eq.`/`in.` хэлбэрээр л шалгана ✓ */
const dbNoFilter = (col) => !listingReqs.some((u) => new RegExp(`${col}=(eq|in)\\.`).test(dec(u)));
const lastQ = () => dec(listingReqs[listingReqs.length - 1] || '').split('?')[1] || '(query байхгүй)';
const body = () => evalJs('document.body.textContent');
const UB = `${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&city=${encodeURIComponent('Улаанбаатар')}`;

console.log('\n🗺 CDP — дүүргийн шүүлт (UI + URL + DB + breadcrumb)\n');

await rpc('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1400, deviceScaleFactor: 1, mobile: false });
// ═══════ ⓪ САЙДБАРТ НЭГ ТОВЧ — ХУУЧИН `<select>` БА ЧИПҮҮД АРИЛСАН ═══════
listingReqs.length = 0;
await go(UB);
const side0 = await sidebarUi();
check('📍 Сайдбарт «Байршил» НЭГ товч БАЙНА (`[data-sidebar-location]` === 1)',
  side0.btn === 1, `btn=${side0.btn}`);
check('📍 Сайдбар ба толгойн товчны шошго НЭГ дүрэмтэй (хот сонгогдсон ч дүүрэг/хороогүй) — «Улаанбаатар»',
  side0.label === 'Улаанбаатар', String(side0.label));
check('🗑 ХУУЧИН «Хот/Аймаг» `<select>` БҮРЭН арилав (хүсэлт ①)',
  side0.citySelects === 0, `citySelects=${side0.citySelects}`);
check('🗑 Сайдбарын дүүрэг/хорооны чипүүд АРИЛСАН (одоо ЗӨВХӨН пикер дотор)',
  side0.sidebarChips === 0, `sidebarChips=${side0.sidebarChips}`);
const closed = await districtUi();
check('🚪 Пикер хаалттай үед дүүргийн мөр DOM-д БАЙХГҮЙ (modal хүртэл гардаггүй)',
  closed.picker === false && closed.chips === 0, `picker=${closed.picker}, chips=${closed.chips}`);

// ─────── ①d 🗑 ХҮСЭЛТ ②: «Өрөө» гэсэн илүүц ТЕКСТ арилсан эсэх ───────
check('🗑 «Өрөөний тоо»-гийн доорх «Өрөө» гэсэн ТЕКСТ БАЙХГҮЙ (хүсэлт ②)',
  closed.strayRoom === 0, `«Өрөө» ганц текст зангилаа=${closed.strayRoom}`);
check('🛏 «Өрөөний тоо» гарчиг ба 5 чип ХЭВЭЭР (регресс ✓)',
  closed.roomTitle && closed.roomChips === 5, `title=${closed.roomTitle}, chips=${closed.roomChips}`);

await sleep(1200);
check('🔎 Дүүрэг сонгоогүй үед DB query-д `district=eq./in.` ОРОХГҮЙ', dbNoFilter('district'), lastQ());

// ═══════ ① ПИКЕР НЭЭХ → ДҮҮРГИЙН БАГАНА (хүсэлт ①) ═══════
const opened = await openPicker();
check('📍 Сайдбарын «Байршил» товч дардагдав', opened === 'OK', opened);
await waitFor(`!!document.querySelector('[data-location-picker]')`);
const dom = await districtUi();
check('🚪 Пикер НЭЭГДЭВ (`[data-location-picker]` DOM-д гарав)', dom.picker === true);
check('🗺 Пикерт дүүргийн багана БАЙНА (`[data-district-filter]` === 1)',
  dom.blocks === 1, `blocks=${dom.blocks}`);
check('🗺 Мөр 9 байна (`[data-district-value]` === 9 — УБ-ын 9 дүүрэг)',
  dom.chips === 9, `chips=${dom.chips}`);
check('🗺 Шошгууд нь дүүргийн нэрс',
  dom.labels.join(', ') === 'Баянгол, Баянзүрх, Сүхбаатар, Хан-Уул, Чингэлтэй, Сонгинохайрхан, Налайх, Багануур, Багахангай',
  dom.labels.join(', '));
check('🗺 `aria-label="Дүүрэг"` бүлэг ТААРЛАА (хороотой ижил хэв маяг)',
  dom.groups === 1, `groups=${dom.groups}`);
check('🗺 НЭГ СОНГОЛТТОЙ `<select>` БАЙХГҮЙ (`select` дотор «Дүүрэг»/«Сум» БАЙХГҮЙ)',
  dom.selects === 0, `selects=${dom.selects}`);

// ═══════ ①b НООРОГ СОНГОХ → «ХЭРЭГЛЭХ» → URL/DB/PILL (шинэ гол зам) ═══════
listingReqs.length = 0;
const clickBayangol = await clickDistrict('Баянгол');
const clickSukhbaatar = await clickDistrict('Сүхбаатар');
check('🗺 «Баянгол» мөр дардагдав', clickBayangol === 'OK', clickBayangol);
check('🗺 «Сүхбаатар» мөр дардагдав', clickSukhbaatar === 'OK', clickSukhbaatar);
await sleep(400);
const draft = await districtUi();
check('🗺 НООРОГ дээр 2 дүүрэг `✓` төлөвтэй (`aria-pressed`)',
  draft.selected.join(',') === 'Баянгол,Сүхбаатар', `selected=[${draft.selected.join(',')}]`);
check('⏳ «Хэрэглэх»-ээс ӨМНӨ URL ХӨНДӨГДӨХГҮЙ (`district=` БАЙХГҮЙ — ноорог ✓)',
  !/[?&]district=/.test(await url()), await url());
const applied = await applyPicker();
check('✅ «Байршлыг хэрэглэх» товч дардагдав', applied === 'OK', applied);
await waitFor(`decodeURIComponent(location.search).includes('district=Баянгол,Сүхбаатар')`);
check('🔗 Хэрэглэсний дараа URL `?district=Баянгол,Сүхбаатар` болов',
  decodeURIComponent(await url()).includes('district=Баянгол,Сүхбаатар'), decodeURIComponent(await url()));
await waitFor(`!document.querySelector('[data-location-picker]')`);
check('🚪 Хэрэглэсний дараа пикер ӨӨРӨӨ ХААГДАВ', (await districtUi()).picker === false);
await sleep(1200);   // ⏳ DB query дуустахыг хүлээ (детермен)
check('🔎 DB: `district=in.(Баянгол,Сүхбаатар)` — пикерээр шүүлт ХИЙГДЭВ',
  dbQ('district=in.(Баянгол,Сүхбаатар)'), lastQ());
const side2 = await sidebarUi();
check('📍 Сайдбарт 2 дүүргийн PILL харагдана',
  side2.pillD.join(',') === 'Баянгол,Сүхбаатар', `pills=[${side2.pillD.join(',')}]`);
check('🎛 Сайдбарын товчны шошго «Улаанбаатар, 2 дүүрэг» болов',
  /Улаанбаатар, 2 дүүрэг/.test(String(side2.label)), String(side2.label));
check('🎛 Сайдбарт «✕ Цэвэрлэх» товч ГАРАВ (`[data-location-clear]`)',
  side2.clear === 1, `clear=${side2.clear}`);

// ─────── ①c ХОРООНЫ НЭГДЭЛ — сонгосон БҮХ дүүргийн хороо ───────
await openPicker();
await waitFor(`!!document.querySelector('[data-location-picker]')`);
const khUnion = await khorooUi();
check('🏘 Пикер дахин нээгдэхэд хорооны мөрүүд ГАРАВ', khUnion.chips > 0, `chips=${khUnion.chips}`);
check('🏘 Хорооны нэр ДАВХЦАЛГҮЙ (нэгдэл) — мөр = өвөрмөц нэр',
  khUnion.chips === khUnion.unique, `${khUnion.chips} мөр / ${khUnion.unique} өвөрмөц`);
check('🏘 Нэгдэл нь 33 мөр (Баянгол 33 ∪ Сүхбаатар 20 — давхцсан нэр хасагдав)',
  khUnion.chips === 33, `chips=${khUnion.chips}`);
listingReqs.length = 0;
const clickK5 = await clickKhoroo('5-р хороо');
check('🏘 «5-р хороо» мөр дардагдав', clickK5 === 'OK', clickK5);
await applyPicker();
await waitFor(`decodeURIComponent(location.search).includes('khoroo=')`);
await sleep(1200);
check('🔎 DB: `khoroo=in.(5-р хороо)` нь `district=in.(…)`-тай ХАМТ явна',
  dbQ('khoroo=in.(5-р хороо)', 'district=in.'), lastQ());
check('📍 Сайдбарт хорооны PILL «5-р хороо» ГАРАВ',
  (await sidebarUi()).pillK.join(',') === '5-р хороо',
  `pillK=[${(await sidebarUi()).pillK.join(',')}]`);
// ⚠️ «Хэрэглэх» нь пикерийг ХААДАГ тул «Баянгол»-ыг цуцлахын тулд ДАХИН нээнэ ✓
await openPicker();
await waitFor(`!!document.querySelector('[data-location-picker]')`);
const clickOff = await clickDistrict('Баянгол');
check('🗺 Дахин дарвал ЦУЦЛАГДАВ (checkbox мэт toggle ✓)', clickOff === 'OK', clickOff);
await sleep(500);
const afterToggle = await districtUi();
check('🗺 Ноорог дээр зөвхөн «Сүхбаатар» үлдэв (selected=[Сүхбаатар])',
  afterToggle.selected.join(',') === 'Сүхбаатар', `selected=[${afterToggle.selected.join(',')}]`);
const khAfter = await khorooUi();
check('🏘 Хорооны жагсаалт шинэ дүүрэгт таарч 20 болов (Сүхбаатар 20 хороо)',
  khAfter.chips === 20, `chips=${khAfter.chips}`);
check('🏘 Хорооны сонголт ч ЦЭВЭРЛЭГДЭВ (дүүрэг солигдсон тул ✓)',
  khAfter.selected === 0, `selected=${khAfter.selected}`);

// ─────── ①e ✕ ХААХ → НООРОГ ХЭРЭГЛЭГДЭХГҮЙ (талбарыг хаах нь буцаах зам ✓) ───────
const cancel = await closePicker();
check('🚪 ✕ «Хаах» товч дардагдав', cancel === 'OK', cancel);
await waitFor(`!document.querySelector('[data-location-picker]')`);
const sideKeep = await sidebarUi();
check('🔒 Хаасны дараа НООРОГ ХЭРЭГЛЭГДЭХГҮЙ (URL + pill «5-р хороо» ХЭВЭЭР ✓)',
  decodeURIComponent(await url()).includes('district=Баянгол,Сүхбаатар')
  && sideKeep.pillK.join(',') === '5-р хороо',
  decodeURIComponent(await url()));


// ═══════ ② АЙМАГ (Дархан-Уул) — СУМдын МӨР + хорооны блок ГАРАХГҮЙ ═══════
const DARHAN = `${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&city=${encodeURIComponent('Дархан-Уул')}`;
listingReqs.length = 0;
await go(DARHAN);
// ⚠️ 2026-10-04 (28): дүүрэг/сум нь ОДОО пикер дотор — нээх ЁСТОЙ ✓
await openPicker();
await waitFor(`!!document.querySelector('[data-location-picker]')`);
const aymag = await districtUi();
check('🗺 Аймаг (Дархан-Уул) дээр СУМдын мөр 4 байна', aymag.chips === 4,
  `${aymag.chips}: ${aymag.labels.join(', ')}`);
const khAymag = await khorooUi();
check('🏘 Аймагт хорооны багана ГАРАХГҮЙ (0 мөр)', khAymag.chips === 0, `chips=${khAymag.chips}`);
check('💡 «…хорооны жагсаалт нээгдэнэ» зөвлөгөө ХАРАГДАНА (хороо байхгүй тул)',
  khAymag.hint);
listingReqs.length = 0;
const clickDarhan = await clickDistrict('Дархан');
check('🗺 «Дархан» сум дардагдав', clickDarhan === 'OK', clickDarhan);
await applyPicker();
await waitFor(`decodeURIComponent(location.search).includes('district=Дархан')`);
check('🗺 Аймагт ч пикер ажиллана (URL `district=Дархан`)',
  decodeURIComponent(await url()).includes('district=Дархан'), decodeURIComponent(await url()));
await sleep(1200);
check('🔎 Аймагт НЭГ сум → DB `district=eq.Дархан` (`.in()` БИШ ✓)',
  dbQ('district=eq.Дархан'), lastQ());

// ═══════ ③ ХУУЧИН НЭГ УТГАТАЙ ЛИНК — БУЦАХ ХОЛБООГҮЙ АЖИЛЛАХ ЁСТОЙ ═══════
listingReqs.length = 0;
await go(`${UB}&district=${encodeURIComponent('Баянгол')}`);
await sleep(1200);
check('🔎 `?district=Баянгол` → DB `district=eq.Баянгол` (ХУУЧИН гэрээ ЯГ ижил ✓)',
  dbQ('district=eq.Баянгол'), lastQ());
// ⚠️ 2026-10-04 (28): линкээс ирсэн утга нь ПИКЕР НЭЭХЭД харагдана ✓
await openPicker();
await waitFor(`!!document.querySelector('[data-location-picker]')`);
const legacy = await districtUi();
check('🗺 Линкээс ирсэн утга пикер дээр ТЭМДЭГЛЭГДЭВ',
  legacy.selected.join(',') === 'Баянгол', `selected=[${legacy.selected.join(',')}]`);
check('🏘 Линкээр орход хорооны мөрүүд нээгдэв (33 — Баянгол)',
  (await khorooUi()).chips === 33);
check('🍞 Breadcrumb нэг дүүргийг НЭРЭЭР нь харуулна («Баянгол»)',
  /Баянгол/.test(await evalJs(`[...document.querySelectorAll('nav')].map((n) => n.textContent).join(' | ')`)));
await closePicker();
await waitFor(`!document.querySelector('[data-location-picker]')`);

// ═══════ ④ ИДЭВХТЭЙ ШҮҮЛТИЙН ЧИП ✕ — дүүргийг бүрэн цэвэрлэнэ ═══════
await go(`${UB}&district=${encodeURIComponent('Баянгол,Сүхбаатар')}`);
// ⚠️ Чип нь «📍 2 дүүрэг» гэсэн ШОШГОТОЙ байх ёстой (нэг утгатай үед нэрээ ✓)
// 🏷️ 2026-10-03 (14): шошго нь «дүүрэг» гэж эхэлсээр байгаа тул доорх
//    `/дүүрэг/` шүүлт хэвээр ажиллана (⚠️ «дүүрэг/сум» БИШ) ✓
const DIST_CHIP = `[...document.querySelectorAll('button')].find((x) => {
  const a = x.getAttribute('aria-label') || '';
  return /хайлтыг хасах/.test(a) && /дүүрэг/.test(a);
})`;
const chipLabel = await evalJs(`(() => { const b = ${DIST_CHIP}; return b ? b.getAttribute('aria-label') : 'NO_CHIP'; })()`);
check('🎛 Идэвхтэй шүүлтийн чип `📍 2 дүүрэг` олдлоо', chipLabel !== 'NO_CHIP', chipLabel);
listingReqs.length = 0;
const chipClicked = await evalJs(`(() => { const b = ${DIST_CHIP}; if (!b) return 'NO_CHIP'; b.click(); return 'OK'; })()`);
check('🎛 Чипийн ✕ товч дардагдав', chipClicked === 'OK', chipClicked);
await waitFor(`!/[?&]district=/.test(location.search)`);
check('🧹 ✕ дарвал URL-аас `district` арилав',
  !/[?&]district=/.test(await url()), await url());
await sleep(1200);
check('🔎 DB: `district=eq./in.` шүүлт ч арилав', dbNoFilter('district'), lastQ());

// ═══════ ⑤ САЙДБАРЫН «✕ Цэвэрлэх» — БҮХ БАЙРШЛЫГ (хот+дүүрэг+хороо) цэвэрлэнэ ═══════
await go(`${UB}&district=${encodeURIComponent('Баянгол,Хан-Уул')}`);
// ⏳ 2026-10-04 (28): ХУУЧИН «✕ Цуцлах» (дүүргийн блок дотор) ХАСАГДАВ —
//    блок нь пикер болсон тул цэвэрлэх үйлдэл нь сайдбарын нэг товч
//    (`[data-location-clear]`) ба «Бүх байршил» товч руу буцна ✓
const sideSel = await sidebarUi();
check('📍 Сонгосон үед 2 PILL + «✕ Цэвэрлэх» товч ГАРАВ',
  sideSel.pillD.length === 2 && sideSel.clear === 1,
  `pills=${sideSel.pillD.length}, clear=${sideSel.clear}`);
listingReqs.length = 0;
const clickedClear = await evalJs(`(() => {
  const b = document.querySelector('[data-location-clear]');
  if (!b) return 'NO_BTN';
  b.click();
  return 'OK';
})()`);
check('🗺 «✕ Цэвэрлэх» дардагдав', clickedClear === 'OK', clickedClear);
await waitFor(`!/[?&]district=/.test(location.search)`);
check('🧹 URL-аас `district` арилав', !/[?&]district=/.test(await url()), await url());
check('🧹 URL-аас `city` ч арилав (БҮХ байршил нэг дор цэвэрлэгддэг ✓)',
  !/[?&]city=/.test(await url()), await url());
await sleep(1200);
check('🧹 Цэвэрлэсний дараах DB query-д `district=eq./in.` БАЙХГҮЙ',
  dbNoFilter('district'), lastQ());
const sideCleared = await sidebarUi();
check('📍 Цэвэрлэсний дараа товчны шошго «Бүх байршил» болов',
  sideCleared.label === 'Бүх байршил', String(sideCleared.label));
check('🗺 «✕ Цэвэрлэх» ба pill-үүд ХАРАГДАХАА БОЛИВ',
  sideCleared.clear === 0 && sideCleared.pills === 0,
  `clear=${sideCleared.clear}, pills=${sideCleared.pills}`);


// ═══════ ⑥ BREADCRUMB — ОЛОН ДҮҮРЭГ «2 дүүрэг» БОЛЖ ХАРАГДАНА ═══════
await go(`${UB}&district=${encodeURIComponent('Баянгол,Сүхбаатар')}`);
const crumbs = await evalJs(`[...document.querySelectorAll('nav')].map((n) => n.textContent).join(' | ')`);
// 🏷️ 2026-10-03 (14): шошго «2 дүүрэг/сум» → «2 дүүрэг» (`districtsFilterLabel`)
check('🍞 Breadcrumb олон дүүргийг «2 дүүрэг» гэж харуулна',
  /2 дүүрэг/.test(crumbs), crumbs.slice(0, 140));
// ⚠️ `clearType` (эсвэл crumb-ийн `nav.filters`) нь зөвхөн төрөл/өрөөг цэвэрлэнэ —
//    БАЙРШИЛ (дүүрэг, хороо, хот) нь БИЕ ДААСАН шүүлт тул ХЭВЭЭР байх ЁСТОЙ ✓
const crumbClick = await evalJs(`(() => {
  const nav = [...document.querySelectorAll('nav')].find((n) => /Бүх зар/.test(n.textContent));
  if (!nav) return 'NO_NAV';
  const link = [...nav.querySelectorAll('a, button')].find((x) => x.textContent.trim() === 'Үл хөдлөх');
  if (!link) return 'NO_LINK:' + [...nav.querySelectorAll('a, button')].map((x) => x.textContent.trim()).join(' | ');
  link.click();
  return 'OK';
})()`);
check('🍞 «Үл хөдлөх» breadcrumb линк олдлоо', crumbClick === 'OK', crumbClick);
await sleep(1200);
check('🍞 Дарахад дүүрэг ХЭВЭЭР (байршил нь төрлөөс үл хамаарах шүүлт ✓)',
  decodeURIComponent(await url()).includes('district=Баянгол,Сүхбаатар'), decodeURIComponent(await url()));
// 🆕 2026-10-03 (13) — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ («Дэлгэрэнгүй хайлт 3р түвшний
//    сонголт дээр орж ирж байна … 2р түвшин дээр гаргаж ирээд, бүх зар дээр
//    шүүдэг болго»): progressive disclosure ХАСАГДАВ ⇒ «Үл хөдлөх»
//    (`type = ''`) дээр ч sidebar БАЙНА. ⚠️ Байршил нь БИЕ ДААСАН шүүлт тул
//    дүүргийн чипүүд ч ХЭВЭЭР үлдэнэ ✓
//    (⏳ урьд нь `{filters.propertyType && (…)}` тул blocks=0 байв ✗)
check('🍞 Төрөл цэвэрлэгдэхэд сайдбар ХЭВЭЭР (товч БАЙНА — progressive БАЙХГҮЙ ✓)',
  (await sidebarUi()).btn === 1);
check('🗺 Байршил нь төрлөөс үл хамаарна — pill 2 ХЭВЭЭР ✓',
  (await sidebarUi()).pillD.join(',') === 'Баянгол,Сүхбаатар',
  `pills=[${(await sidebarUi()).pillD.join(',')}]`);
check('🍞 «2 дүүрэг» breadcrumb мөрөндөө ХЭВЭЭР (байршил үл хамаарах ✓)',
  /2 дүүрэг/.test(await evalJs(`[...document.querySelectorAll('nav')].map((n) => n.textContent).join(' | ')`)));
// ⚠️ Төрлийг ЭРГҮҮЛЭН сонгоход хорооны нэгдэл (33) ба мөрүүд ХЭВЭЭР байх
//    ЁСТОЙ — URL-аас сэргээгдэж байгаа эсэхийг батлана ✓
await go(`${BASE}/?section=real-estate&type=${encodeURIComponent('Орон сууц')}&city=${encodeURIComponent('Улаанбаатар')}&district=${encodeURIComponent('Баянгол,Сүхбаатар')}`);
await openPicker();
await waitFor(`!!document.querySelector('[data-location-picker]')`);
check('🏘 Төрөл + 2 дүүрэг → хорооны нэгдэл 33 мөр (өөрчлөгдөөгүй ✓)',
  (await khorooUi()).chips === 33, `chips=${(await khorooUi()).chips}`);
check('🗺 Мөрүүд 2 сонгогдсон хэвээр (URL-аас сэргээгдэв ✓)',
  (await districtUi()).selected.join(',') === 'Баянгол,Сүхбаатар');
await closePicker();
await waitFor(`!document.querySelector('[data-location-picker]')`);

// ═══════ ⑦ МОБАЙЛ (390×844) — товч харагдана, пикер overflow ГАРАХГҮЙ ═══════
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await go(`${UB}&district=${encodeURIComponent('Баянгол,Сүхбаатар')}`);
const mobileSide = await sidebarUi();
check('📱 Мобайл: сайдбарын «Байршил» товч БАЙНА (`[data-sidebar-location]`)',
  mobileSide.btn === 1, `btn=${mobileSide.btn}`);
check('📱 Мобайл: линкээр 2 pill сонгогдсон төлөвтэй',
  mobileSide.pillD.join(',') === 'Баянгол,Сүхбаатар', `pills=[${mobileSide.pillD.join(',')}]`);
check('📱 Мобайл: 🗑 «Өрөө» гэсэн илүүц текст ГАРАХГҮЙ (хүсэлт ②)',
  (await districtUi()).strayRoom === 0, `stray=${(await districtUi()).strayRoom}`);
await openPicker();
await waitFor(`!!document.querySelector('[data-location-picker]')`);
const mobileUi = await districtUi();
check('📱 Мобайл: пикер нээгдэж дүүргийн мөрүүд БҮГД ГАРАГДАВ (9)',
  mobileUi.picker === true && mobileUi.chips === 9, `chips=${mobileUi.chips}`);
check('📱 Мобайл: пикер идэвхтэй шүүлтийг ТЭМДЭГЛЭВ (2 сонгосон)',
  mobileUi.selected.join(',') === 'Баянгол,Сүхбаатар',
  `selected=[${mobileUi.selected.join(',')}]`);

// ─── ⑦b DRILL-DOWN (2026-10-04 (29)): 3 багана НУУГДАЖ, НЭГ ШАТЛАЛ ХАРАГДАНА ───
const mLoc0 = await mobileLocUi();
check('📱 Мобайл: drill-down блок ХАРАГДАЖ, каскад багана НУУГДСАН (`sm:hidden`)',
  mLoc0.box === true && mLoc0.cascade === false,
  `box=${mLoc0.box}, cascade=${mLoc0.cascade}`);
check('📱 Мобайл: 1-р дэлгэцэд ХОТ / АЙМАГ жагсаалт (22)',
  mLoc0.cities === 22, `cities=${mLoc0.cities}`);
check('📱 Мобайл: 1-р дэлгэцэд буцах товч (`←`) ГАРАХГҮЙ (үндсэн шатлал ✓)',
  mLoc0.back === false, `back=${mLoc0.back}`);
const tapCity = await clickMobileCity('Улаанбаатар');
check('📱 Мобайл: «Улаанбаатар» дардагдав', tapCity === 'OK', tapCity);
await sleep(400);
const mLoc1 = await mobileLocUi();
check('📱 Мобайл: 2-р дэлгэцэд ДҮҮРЭГ жагсаалт (9)',
  mLoc1.districts === 9, `districts=${mLoc1.districts}`);
check('📱 Мобайл: 2-р дэлгэцэд буцах товч (`←`) ХАРАГДАНА',
  mLoc1.back === true, `back=${mLoc1.back}`);
check('📱 Мобайл: 2-р дэлгэцэд URL-аас ирсэн 2 дүүрэг ТЭМДЭГЛЭГДСЭН ✓',
  mLoc1.pressedD.join(',') === 'Баянгол,Сүхбаатар', `pressed=[${mLoc1.pressedD.join(',')}]`);
// ⚠️ 2026-10-04 (30): checkbox нь ТУСДАА товч (`… — сонгох`) ба НЭР нь
//    дотор орох (`… — хороо руу орох`) — өмнө нь бүтэн мөр нэг товч байв ✗
check('📱 Мобайл: checkbox нь ТУСДАА товч ба НЭР нь «хороо руу орох» товч (2026-10-04 (30) ✓)',
  await evalJs(`(() => {
    const b = document.querySelector('[data-mobile-district-value="Баянгол"]');
    const d = document.querySelector('[data-location-picker] [aria-label="Баянгол — хороо руу орох"]');
    return (b && b.getAttribute('aria-label')) === 'Баянгол — сонгох' && !!d;
  })()`));
const drill = await clickMobileDrill('Баянгол');
check('📱 Мобайл: дүүргийн НЭР дээр дарахад хорооны шатлал руу оролцсон (2026-10-04 (30) засвар ✓)',
  drill === 'OK', drill);
await sleep(400);
const mLoc2 = await mobileLocUi();
check('📱 Мобайл: 3-р дэлгэцэд ХОРОО жагсаалт (нэгдэл 33)',
  mLoc2.khoroos === 33, `khoroos=${mLoc2.khoroos}`);

// ⚠️ 2026-10-04 (30): хэрэглэгчийн гомдол («гар утсаас хороо нь гарч ирэхгүй»)
//    ⇒ 2 хүрэх цэг ТУС ТУСДАА ажиллах ЁСТОЙ: НЭР = дотор орох, CHECKBOX =
//    зөвхөн сонгох (шатлал ХӨДӨЛӨХГҮЙ) — энэ занг түгжинэ ✓
const back = await clickMobileBack();
check('📱 Мобайл: `←` буцах товч дардагдав (3 → 2-р дэлгэц)', back === 'OK', back);
await sleep(300);
const mLoc3 = await mobileLocUi();
check('📱 Мобайл: 2-р дэлгэц рүү буцлаа (дүүрэг 9, хороо 0)',
  mLoc3.districts === 9 && mLoc3.khoroos === 0, `d=${mLoc3.districts}, k=${mLoc3.khoroos}`);
const tg = await clickMobileToggle('Баянзүрх');
check('📱 Мобайл: «Баянзүрх» CHECKBOX дардагдав', tg === 'OK', tg);
await sleep(300);
const mLoc4 = await mobileLocUi();
check('📱 Мобайл: checkbox ЗӨВХӨН сонгоно — шатлал ХӨДӨЛӨХГҮЙ (2-р дэлгэц хэвээр)',
  mLoc4.districts === 9 && mLoc4.khoroos === 0 && mLoc4.pressedD.includes('Баянзүрх'),
  `d=${mLoc4.districts}, k=${mLoc4.khoroos}, pressed=[${mLoc4.pressedD.join(',')}]`);

check('📱 Мобайл: хэвтээ гүйлт (overflow) ГАРАХГҮЙ',
  await evalJs('document.documentElement.scrollWidth <= window.innerWidth + 1'),
  await evalJs('document.documentElement.scrollWidth + "/" + window.innerWidth'));
await closePicker();
await waitFor(`!document.querySelector('[data-location-picker]')`);
await rpc('Emulation.clearDeviceMetricsOverride');

// ═══════ ⑧ ДҮГНЭЛТ ═══════
check('🧯 Консол дээр exception ГАРАГҮЙ', exceptions.length === 0, exceptions.slice(0, 2).join(' | '));
check('🧯 Ямар ч алдаатай (4xx/5xx) listings query ГАРАГҮЙ',
  !listingReqs.some((u) => /district=in\.\(\)/.test(decodeURIComponent(u))),
  listingReqs.slice(-1)[0] || '(query байхгүй)');
console.log(`\n${fail === 0 ? '✅' : '❌'} CDP дүүрэг — ${pass} OK, ${fail} FAIL\n`);
ws.close();
await closeOwnTab();
process.exit(fail === 0 ? 0 : 1);

