/**
 * 🗂 CDP ШАЛГАЛТ — «ЗАР НЭМЭХ» → 1-Р АЛХАМ: 3 БАГАНАТ СОНГОЛТ (гарчиггүй ✓)
 * ⚠️ 2026-10-01 — ХОЁР хүсэлтээр `AddListingClient.jsx`-ийн ХАРАГДАЦ ЦЭВЭРЛЭВ:
 *    ① «Зар нэмэхэд энийг харуулахгүй» → ДЭЭД ТОЛГОЙ (➕ Зар нэмэх · «1/5 · …»
 *       заагч · 5 АЛХМЫН ТАБ · дэвшлийн зурвас) БҮХЭЛДЭЭ ХАСАГДАВ
 *    ② «энэ бүгдийг нь зайлуул, харахыг хүсэхгүй байна» → форм ДОТРОХ алхмын
 *       гарчиг (`data-step-heading`) БҮХЭЛДЭЭ ХАСАГДАВ
 *       («1/5-Р АЛХАМ · Ангилал · Юу зарах вэ?» + `STEPS[].short`)
 *    ③ мөн адил хүсэлтээр «Категорио сонгоно уу» ГАРЧИГ Ч ХАСАГДАВ —
 *       асуулт нь ЗӨВХӨН `role="group"` + `aria-label` (screen reader) хэвээр ✓
 *    ④ «дэд төрөл биш зүгээр л Төрөл гэж нэрлэ» → баганын толгой
 *       «Дэд төрөл» → **«Төрөл»** (бүлэгтэй хэсгийн «Дэд бүлэг» ХЭВЭЭР ✓)
 *    ⑤ 🆕 **2026-10-01 (4 дэх засвар)**: «сонгосон хэсгийг дээд талд нь ДАВХАР
 *       гаргаж байгааг болиё» → баганын ДЭЭД ТОЛГОЙ (`[data-picker-title]`)
 *       БҮХЭЛДЭЭ ХАСАГДАВ (сонгосон утга нь доорх мөртэй давхардаж байв ✗).
 *       ⚠️ Тиймээс `title`/`header` тугууд ХАСАГДАЖ, оронд нь `pickerTitles`
 *       (DOM-д 0 байх ёстой) ба `dupe` (сонгосон утга багана дотроо ЯГ 1 удаа)
 *       гэсэн 2 ШИНЭ инвариант нэмэгдэв ✓ (①②③④⑥′-ийн олон шалгалт «толгой =
 *       сонгосон утга» байсныг «сонгосон мөр ГАНЦ (dupe = 1)» болгов)
 *    → энэ скрипт одоо:
 *    ⓐ `role="tablist"` (алхмын таб) **0** байхыг шалгана
 *    ⓑ `[data-step-heading]` ОГТ БАЙХГҮЙ (**0**) гэдгийг шалгана
 *    ⓒ одоогийн алхмыг ЗӨВХӨН дээд breadcrumb (`[data-step-current]` =
 *       «1. Ангилал»)-аас уншина
 *    ⓓ алхам солихдоо `?step=N` руу URL-аар шилжинэ (`gotoStepUrl`) ✓
 *    ⓔ 1-р алхамд ХАРАГДАХ ГАРЧИГ **0** байхыг шалгана (③) — picker-ийн
 *       асуулт нь зөвхөн `aria-label`-д үлдсэн ✓
 *
 * Хэрэглэгчийн хүсэлт: «Эхний хэсгийг ийм болго» (`unegui.mn/post_ad/`) —
 *   ① 1-р алхам нь 3 БАГАНАТ сонголт (Хэсэг → «Зарах/Түрээслэх»/Дэд бүлэг → Төрөл)
 *       (⚠️ өмнө нь дээд хэсэгт «Ангилал · Дэлгэрэнгүй · Байршил · Үнэ · Зураг»
 *          табууд байсан — 2026-10-01-нд ХАСАГДАВ ✓)
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ (76 шалгалт):
 *   ① Үл хөдлөх: 3 багана (12 хэсэг · sell/rent · 8 төрөл)
 *      ⚠️ 2026-10-01 (**4 дэх засвар**): баганын ДЭЭД ТОЛГОЙ (`[data-picker-title]`)
 *      БҮХЭЛДЭЭ ХАСАГДАВ (сонгосон утга нь доорх мөртэй давхардаж байв ✗) →
 *      `pickerTitles` = **0** ба `dupe` = **1** (сонгосон утга багана дотроо
 *      ЯГ НЭГ УДАА — зөвхөн мөрөндөө) гэсэн 2 инвариантыг шалгана ✓
 *   ② «Түрээслэх» солиход багана 3 нь «…түрээслүүлнэ» болж, дүгнэлтэд БҮТЭН зам гарна
 *   ③ ХАВТГАЙ хэсэг (🚗 auto) → багана 3 АРИЛНА (2 багана) + хуучин сонголт
 *      цэвэрлэгдэнэ ✓ (толгойн нэр 2026-10-01-нд ХАСАГДСАН тул одоо «сонгосон
 *      мөр 0» гэдгээр шалгана ✓)
 *   ④ БҮЛЭГТЭЙ хэсэг (💻 computers) → 9 бүлэг, «Notebook» → 22 брэнд (3 багана) ✓
 *   ⑤ ДООД ТҮВШИНГҮЙ бүлэг (💻 Чихэвч) нь ӨӨРӨӨ leaf болж хадгалагдана
 *   ⑥ АЛХМЫН ТАБ ба форм дотрох АЛХМЫН ГАРЧИГ ХОЁУЛАА ХАСАГДСАН
 *      (0 `role="tab"` · `[data-step-heading]` = 0) + «Үргэлжлүүлэх» → 2-р алхам
 *      = **📍 БАЙРШИЛ** (breadcrumb `[data-step-current]` = «2. Байршил» +
 *      URL `?step=2`) — 2026-10-01-нд алхмын дараалал солигдож, «Байршил»
 *      3-р алхмаас **2-Р АЛХАМ** болов ✓
 *   ⑥′/⑥″ БАЙРШЛЫН БАГАНУУД бүрэн шалгагдана: 3 багана (**loc-city ·
 *      loc-district · loc-khoroo**), форм дотор `<select>` **0** (1-р алхмын
 *      форматтай ижил — хэрэглэгчийн хүсэлт), толгой **0** (4 дэх засвар),
 *      Хот → Дүүрэг → Хороо дарааллаар сонгогдоно, ХОТ солиход дүүрэг БА
 *      хороо ЦЭВЭРЛЭГДЭНЭ, «Үргэлжлүүлэх» → 3-р алхам («3. Дэлгэрэнгүй»,
 *      URL `?step=3`) ✓
 *   ⑦ 🔎 ДҮРС ТЕКСТЭЭС ХҮРЭХГҮЙ — 🏷️ Үйлдвэрлэгчийн `combo`/текст талбарт
 *      (`!pl-9` = 36px, зай ≥ 6px) + ✕ товч (`!pr-10`) + sidebar-ийн 2 талбар
 *      ⚠️ «🏷️ Үйлдвэрлэгч» нь 3-р алхамд (хуучнаар 2-р) → `clickNext()` ХОЁР УДАА ✓
 *   ⑧ JS exception / `console.error` 0 (сүлжээний 401 нь Supabase session — тооцохгүй)
 *   ⑨ 🆕 **3-Р АЛХАМ (📋 Дэлгэрэнгүй) — ТАЛБАРУУД ЦУВАА = 1 БАГАНА**
 *      (2026-10-01, 5 дахь засвар): мөр бүр `.form-row-single` +
 *      `[data-form-row="details"]` → grid track **ЯГ 1**, хүүхдүүд ИЖИЛ x-т
 *      (зэрэг БИШ), талбар бүр мөрийнхөө БҮТЭН өргөнийг эзэлнэ; 📱 390px дээр ч ✓
 *   ⑩ 🆕 **АВТО ФОРМ — 🔧 «Хөдөлгүүр» СОНГОЛТ + 🎨 «Өнгө» нэмэгдэж, 🔀 «Хөтлөгч»
 *      ХАСАГДАВ** (2026-10-01, хэрэглэгчийн хүсэлт; 3-р алхмын DOM-оос уншина):
 *      ① `[data-form-row="details"] .form-group`-ийн `label`-ээр «Хөдөлгүүр»-ыг
 *      олж, түүний `select` нь «Сонгох» + **7** утгатай (1.5л хүртэл …
 *      Цахилгаан (EV)) ✓ ② «Хөтлөгч» гэсэн талбар форм дээр **0** ✓
 *      ③ «Өнгө» 10 сонголттой ✓ ④ sidebar (`select[aria-label]`) — «Өнгө» бий,
 *      «Хөтлөгч» **0** ✓ ⇒ `lib/locationData.js`-ийн `ENGINE_OPTIONS` /
 *      `AUTO_COLOR_OPTIONS` / `attrFilters` гэрээг БОДИТ DOM дээр батална ✓
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) сервер http://localhost:3000 (`npm run dev` эсвэл `npm run build && npm run start`)
 *      ℹ️ Өөр порт дээр бол: `node scripts/cdp-picker.mjs http://localhost:3200`
 *   2) Chrome алсын дебагттайгаар, НЭВТЭРСЭН профайлаар нээсэн байх
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --headless=new --remote-debugging-port=9222 \
 *        --user-data-dir=/tmp/chrome-prof-zar http://localhost:3000/
 *      ⚠️ 1-р алхам нь ЗӨВХӨН нэвтэрсэн хэрэглэгчид харагдана (хаалт байхгүй бол)
 *   Дараа нь:  npm run cdp:picker
 *
 *  ⚠️ Тогтвортой selector-ууд (`AddListingClient.jsx` дотор):
 *     `[data-picker="section|level2|level3"]` · `button[data-picker-value="…"]`
 *     `[data-picker-summary]` · `[data-step-current]` · `[role="group"][aria-label]` ✓
 *     (⚠️ `Категорио сонгоно уу` нь 2026-10-01-нд ХАРАГДАХ ГАРЧИГ БАЙХГҮЙ —
 *      зөвхөн `aria-label`-д (a11y) үлдсэн; CDP нь DOM текстээс хайна ✓)
 *     (⚠️ `[data-step-heading]` нь 2026-10-01-нд алхмын гарчигтай хамт ХАСАГДАВ
 *      — одоо DOM-д 0 байх ёстой; `[data-step-tab="…"]` ч мөн адил ✓)
 */
const BASE = process.argv[2] || 'http://localhost:3000';
const CDP = `http://127.0.0.1:${process.env.CDP_PORT || 9222}`;

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${name}`); }
  else { fail += 1; console.log(`  ✗ ${name}${extra ? `  → ${extra}` : ''}`); }
};

const rpcOf = (ws) => {
  let id = 0;
  return (method, params = {}) => {
    id += 1;
    const myId = id;
    ws.send(JSON.stringify({ id: myId, method, params }));
    return new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error(`timeout ${method}`)), 30000);
      const on = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id !== myId) return;
        clearTimeout(to);
        ws.removeEventListener('message', on);
        m.error ? rej(new Error(`${method}: ${JSON.stringify(m.error)}`)) : res(m.result);
      };
      ws.addEventListener('message', on);
    });
  };
};

const created = await fetch(`${CDP}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
const target = await created.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res) => ws.addEventListener('open', res, { once: true }));
const rpc = rpcOf(ws);

const problems = [];
const netProblems = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') {
    problems.push(`exception: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    problems.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    const entry = `${m.params.entry.text} ${m.params.entry.url || ''}`.trim();
    // ⚠️ Сүлжээний 401 (Supabase token) нь КОДЫН алдаа БИШ — тусад нь бүртгэнэ ✓
    if (/Failed to load resource/.test(m.params.entry.text)) netProblems.push(entry);
    else problems.push(`log.error: ${entry}`);
  }
});

await rpc('Runtime.enable');
await rpc('Log.enable');
await rpc('Page.enable');
await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false });
await rpc('Page.navigate', { url: `${BASE}/listings/new` });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(5000);

const evaluate = async (expression) => {
  const r = await rpc('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails));
  return r.result.value;
};

const PROBE = `(() => {
  const cols = {};
  document.querySelectorAll('[data-picker]').forEach((el) => {
    cols[el.dataset.picker] = {
      /**
       * ⚠️ 2026-10-01 (**4 дэх засвар**): баганын ДЭЭД ТОЛГОЙ ([data-picker-title])
       *    БҮХЭЛДЭЭ ХАСАГДАВ (сонгосон утга нь доорх мөртэй давхардаж байв ✗) —
       *    pickerTitles (доор) нь ЯГ 0 байх ёстой ✓
       * ℹ️ dupe = тухайн баганд СОНГОСОН мөрийн бичиг ХЭДЭН УДАА гарч байна вэ.
       *    Толгой байсан үед 2 байв (толгой + мөр) ✗ — одоо ЯГ 1 (зөвхөн мөр) ✓
       *    (⚠️ RegExp БИШ, split ашиглана — энэ template literal дотор backtick
       *     болон долларын буржгар хаалт БИЧИХГҮЙ ✗)
       */
      dupe: (() => {
        const sel = [...el.querySelectorAll('button[aria-pressed="true"]')];
        if (sel.length !== 1) return 0;
        const t = (sel[0].innerText || '').trim();
        if (!t) return 0;
        return el.innerText.split(t).length - 1;
      })(),
      items: [...el.querySelectorAll('button[data-picker-value]')].map((b) => b.dataset.pickerValue),
      selected: [...el.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.dataset.pickerValue),
    };
  });
  return {
    gate: document.body.innerText.includes('нэвтрэх шаардлагатай'),
    // ⚠️ 2026-10-01 (2 дахь засвар): «Категорио сонгоно уу» ГАРЧИГ Ч ХАСАГДАВ →
    //    асуулт нь зөвхөн aria-label (a11y) хэвээр; ХАРАГДАХ текст DOM-д 0 ✓
    noPickerHeading: !document.body.innerText.includes('Категорио сонгоно уу'),
    pickerAria: (document.querySelector('[data-picker="section"]')?.closest('[role="group"]')?.getAttribute('aria-label') || '').trim(),
    // ⚠️ 2026-10-01: толгойн АЛХМЫН ТАБУУД ба форм дотрох алхмын гарчиг ХОЁУЛАА
    //    хасагдсан → одоогийн алхмыг ЗӨВХӨН дээд breadcrumb-аас уншина:
    //    [data-step-current] = «1. Ангилал» ✓
    //    [data-step-heading] нь 0 байх ЁСТОЙ (хасагдсаныг батлана) ✓
    stepLabel: (document.querySelector('[data-step-current]') || {}).innerText || '',
    stepHeadings: document.querySelectorAll('[data-step-heading]').length,
    tabs: [...document.querySelectorAll('[role="tablist"] [role="tab"]')].map((b) => (b.innerText || '').trim()),
    summary: (document.querySelector('[data-picker-summary]') || {}).innerText || '',
    // 📍 2-р алхам = Байршил — өөрийн гэсэн дүгнэлтийн мөр ([data-location-summary])
    //    ⚠️ ТУСДАА атрибут: [data-picker-summary] нь ЗӨВХӨН 1-р алхамд байх ёстой ✓
    locationSummary: (document.querySelector('[data-location-summary]') || {}).innerText || '',
    // ⚠️ 2026-10-01: Байршил нь select БИШ, баганат сонголт болов → 2-р алхамд
    //    форм дотор select ЯГ 0 байх ёстой (1-р алхамд ч 0 ✓)
    selects: document.querySelectorAll('form select').length,
    colCount: document.querySelectorAll('[data-picker]').length,
    // ⚠️ 2026-10-01 (4 дэх засвар): баганын ДЭЭД ЦЭНХЭР ТОЛГОЙ БҮХЭЛДЭЭ
    //    ХАСАГДСАН (сонгосон утгатай давхардаж байв ✗) → DOM-д ЯГ 0 байх ёстой ✓
    pickerTitles: document.querySelectorAll('[data-picker-title]').length,
    /**
     * 🆕 2026-10-01 (**5 дахь засвар**, хэрэглэгчийн хүсэлт: «Дэлгэрэнгүй хэсгийн
     *    мэдээллийг оруулах хэсгийг ЦУВАА буюу 1 БАГАНА болго») → 3-Р АЛХМЫН
     *    (📋 Дэлгэрэнгүй) мөр БҮР нь [data-form-row="details"] атрибуттай
     *    (.form-row-single, globals.css) болов. Инвариантууд:
     *      ① cols = grid track-ийн ТОО → ЯГ 1 (.form-row-ийн sm:grid-cols-2
     *         байсан үед 2 байв ✗)
     *      ② stacked = хүүхдүүд НЭГ x-т (зүүн ирмэг) → зэрэг БИШ, ЦУВАА ✓
     *      ③ full = хүүхэд бүр мөрийнхөө БҮТЭН өргөнийг эзэлнэ (хагас биш ✓)
     *    ⚠️ Энэ template literal дотор backtick / долларын буржгар хаалт БИЧИХГҮЙ
     */
    detailsRows: [...document.querySelectorAll('[data-form-row="details"]')].map((r) => {
      const rr = r.getBoundingClientRect();
      const kids = [...r.children].map((c) => {
        const k = c.getBoundingClientRect();
        return { x: +k.left.toFixed(1), w: +k.width.toFixed(1) };
      });
      return {
        cols: getComputedStyle(r).gridTemplateColumns.split(' ').filter(Boolean).length,
        rowW: +rr.width.toFixed(1),
        kids: kids.length,
        stacked: kids.length < 2 || kids.every((k) => Math.abs(k.x - kids[0].x) <= 1),
        full: kids.length === 0 || kids.every((k) => Math.abs(k.w - rr.width) <= 1),
      };
    }),
    cols,
  };
})()`;

const probe = () => evaluate(PROBE);
const click = async (sel) => {
  const res = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NOT_FOUND'; el.click(); return 'OK'; })()`);
  await wait(350);
  return res;
};
/**
 * 🪜 «Үргэлжлүүлэх →» — алхмын навигаци.
 * ⚠️ 2026-10-01: «📍 Байршил» нь 3-р алхмаас **2-р алхам** болов → 3-р алхам
 *    (Дэлгэрэнгүй, «🏷️ Үйлдвэрлэгч» тэнд) руу хүрэхэд ХОЁР УДАА дарах хэрэгтэй ✓
 */
const clickNext = async () => {
  const res = await evaluate(`(() => { const b = [...document.querySelectorAll('form button')].find((x) => (x.innerText||'').includes('Үргэлжлүүлэх')); if (!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()`);
  await wait(800);
  return res;
};
/**
 * 🪜 Алхмыг URL-аар солих — ⚠️ 2026-10-01-нд толгойн АЛХМЫН ТАБУУД хасагдсан
 *    тул `[data-step-tab="…"]` дарах боломжгүй болсон → `?step=N` руу шууд
 *    шилжинэ (бүтэн ачаалал тул форм цэвэрлэгдэнэ — дараа нь дахин сонгоно ✓)
 */
const gotoStepUrl = async (n) => {
  await evaluate(`location.href = ${JSON.stringify(`${BASE}/listings/new?step=${n}`)}`);
  await wait(3000);
};


console.log('\n── ① НЭВТЭРСЭН ТӨЛӨВ + АНХДАГЧ (🏠 Үл хөдлөх) ──');
const p0 = await probe();
ok('нэвтрэх хаалт ГАРАХГҮЙ (session ажиллаж байна)', p0.gate === false);
ok('1-р алхамд ХАРАГДАХ ГАРЧИГ БАЙХГҮЙ («Категорио сонгоно уу» хасагдсан ✓)', p0.noPickerHeading === true);
ok('асуулт нь `aria-label`-аар (screen reader) ХЭВЭЭР',
  p0.pickerAria === 'Категорио сонгоно уу', JSON.stringify(p0.pickerAria));
ok('дээд хэсэгт АЛХМЫН ТАБ ГАРАХГҮЙ (2026-10-01-нд хасагдсан ✓)', p0.tabs.length === 0, JSON.stringify(p0.tabs));
ok('форм дотор АЛХМЫН ГАРЧИГ ГАРАХГҮЙ (`[data-step-heading]` = 0)',
  p0.stepHeadings === 0, `stepHeadings=${p0.stepHeadings}`);
ok('1-р алхам: breadcrumb «1. Ангилал» (`[data-step-current]`)',
  String(p0.stepLabel).includes('1. Ангилал'), JSON.stringify(p0.stepLabel));
ok('3 багана харагдаж байна (Үл хөдлөх)', p0.colCount === 3, `colCount=${p0.colCount}`);
ok('багана 1: 12 ХЭСЭГ', p0.cols.section?.items.length === 12, String(p0.cols.section?.items.length));
/**
 * 🗑 2026-10-01 (**4 дэх засвар**, хэрэглэгчийн хүсэлт): «сонгосон хэсгийг дээд
 *    талд нь ДАВХАР гаргаж байгааг болиё» → баганын толгой БҮХЭЛДЭЭ ХАСАГДАВ.
 *    ⚠️ Энэ нь ТОГТВОРТОЙ selector (`[data-picker-title]`) байсан тул тест нь
 *    одоо «толгой = 0» ба «сонгосон утга багана дотроо ГАНЦ (`dupe` = 1)»
 *    гэсэн 2 ШИНЭ инвариантыг шалгана ✓ (өмнө нь толгой НЭМЭГДЭЖ байсан
 *    тул `dupe` нь 2 байв ✗)
 */
ok('🆕 баганын ДЭЭД ТОЛГОЙ ХАСАГДСАН: `[data-picker-title]` = 0 (давхардал үгүй)',
  p0.pickerTitles === 0, `pickerTitles=${p0.pickerTitles}`);
ok('багана 1: «Үл хөдлөх» сонгосон утга ГАНЦ (толгойд давхардахгүй, мөрөндөө ✓)',
  p0.cols.section?.dupe === 1 && JSON.stringify(p0.cols.section?.selected) === '["real-estate"]',
  `dupe=${p0.cols.section?.dupe} selected=${JSON.stringify(p0.cols.section?.selected)}`);
ok('багана 2: Зарах/Түрээслэх (sell, rent)', JSON.stringify(p0.cols.level2?.items) === '["sell","rent"]', JSON.stringify(p0.cols.level2?.items));
ok('багана 2: «💰 Зарах» сонгосон утга ГАНЦ (цэнхэр мөр ✓)',
  p0.cols.level2?.dupe === 1, `dupe=${p0.cols.level2?.dupe}`);
ok('багана 3: 8 ТӨРӨЛ', p0.cols.level3?.items.length === 8, String(p0.cols.level3?.items.length));
ok('багана 3 дэд төрөл = «Орон сууц»', (p0.cols.level3?.items || []).includes('Орон сууц'), JSON.stringify(p0.cols.level3?.items.slice(0, 3)));
ok('багана 3: сонголт хийгээгүй → сонгосон мөр 0 (dupe 0)',
  p0.cols.level3?.dupe === 0 && JSON.stringify(p0.cols.level3?.selected) === '[]',
  `dupe=${p0.cols.level3?.dupe} selected=${JSON.stringify(p0.cols.level3?.selected)}`);
ok('дүгнэлт: «…сонгоно уу»', (p0.summary || '').includes('сонгоно уу'), p0.summary);

console.log('\n── ② ТҮРЭЭСЛҮҮЛЭХ + ДЭД ТӨРӨЛ СОНГОХ ──');
await click('[data-picker="level2"] button[data-picker-value="rent"]');
const p1 = await probe();
ok('багана 2-т «rent» сонгогдов', JSON.stringify(p1.cols.level2?.selected) === '["rent"]', JSON.stringify(p1.cols.level2?.selected));
ok('багана 2: «🔑 Түрээслэх» ГАНЦ (сонгосон утга давхардахгүй ✓)',
  p1.cols.level2?.dupe === 1, `dupe=${p1.cols.level2?.dupe}`);
await click('[data-picker="level3"] button[data-picker-value="Орон сууц"]');
const p2 = await probe();
ok('багана 3-т «Орон сууц» сонгогдов', JSON.stringify(p2.cols.level3?.selected) === '["Орон сууц"]', JSON.stringify(p2.cols.level3?.selected));
ok('дүгнэлтэд бүтэн зам («Орон сууц түрээслүүлнэ»)',
  (p2.summary || '').includes('Үл хөдлөх') && (p2.summary || '').includes('Түрээслэх') && (p2.summary || '').includes('Орон сууц түрээслүүлнэ'),
  p2.summary);
ok('багана 3: «🏢 Орон сууц зарна» ГАНЦ (толгойн давхардал үгүй ✓)',
  p2.cols.level3?.dupe === 1, `dupe=${p2.cols.level3?.dupe}`);

console.log('\n── ③ ХАВТГАЙ ХЭСЭГ (🚗 Автомашин) → 2 БАГАНА ──');
await click('[data-picker="section"] button[data-picker-value="auto"]');
const p3 = await probe();
ok('багана 3 АРИЛАВ (2 багана)', p3.colCount === 2, `colCount=${p3.colCount}`);
ok('багана 1: «🚗 Автомашин» сонгосон утга ГАНЦ (толгойд давхардахгүй ✓)',
  p3.cols.section?.dupe === 1, `dupe=${p3.cols.section?.dupe} selected=${JSON.stringify(p3.cols.section?.selected)}`);
ok('багана 2 = 10 дэд төрөл (хавтгай)', p3.cols.level2?.items.length === 10, String(p3.cols.level2?.items.length));
ok('багана 2: сонголт хийгээгүй → сонгосон мөр 0 (dupe 0)',
  p3.cols.level2?.dupe === 0 && JSON.stringify(p3.cols.level2?.selected) === '[]',
  `dupe=${p3.cols.level2?.dupe} selected=${JSON.stringify(p3.cols.level2?.selected)}`);
ok('өмнөх сонголт ЦЭВЭРЛЭГДЭВ', JSON.stringify(p3.cols.level2?.selected) === '[]' && (p3.summary || '').includes('Төрлөө сонгоно уу'), p3.summary);
await click('[data-picker="level2"] button[data-picker-value="Жийп, SUV"]');
const p4 = await probe();
ok('хавтгай хэсэгт дэд төрөл сонгогдов', (p4.summary || '').includes('Жийп, SUV'), p4.summary);
ok('хавтгай: багана 2-т «Жийп, SUV» ГАНЦ (цэнхэр мөр ✓, толгой ХАСАГДСАН ✓)',
  p4.cols.level2?.dupe === 1 && p4.pickerTitles === 0,
  `dupe=${p4.cols.level2?.dupe} pickerTitles=${p4.pickerTitles}`);

console.log('\n── ④ БҮЛЭГТЭЙ ХЭСЭГ (💻 Компьютер) → 3 БАГАНА ──');
await click('[data-picker="section"] button[data-picker-value="computers"]');
const p5 = await probe();
ok('3 багана буцаж ирэв', p5.colCount === 3, `colCount=${p5.colCount}`);
ok('багана 2 = 9 БҮЛЭГ', p5.cols.level2?.items.length === 9, JSON.stringify(p5.cols.level2?.items));
ok('багана 3 хоосон (бүлэг сонгоогүй)', p5.cols.level3?.items.length === 0, String(p5.cols.level3?.items.length));
await click('[data-picker="level2"] button[data-picker-value="Notebook"]');
const p6 = await probe();
ok('багана 2: «💻 Notebook» сонгосон утга ГАНЦ (толгойд давхардахгүй ✓)',
  p6.cols.level2?.dupe === 1, `dupe=${p6.cols.level2?.dupe} selected=${JSON.stringify(p6.cols.level2?.selected)}`);
ok('багана 3 = Notebook-ийн 22 брэнд', p6.cols.level3?.items.length === 22, String(p6.cols.level3?.items.length));
await click('[data-picker="level3"] button[data-picker-value="Apple"]');
const p7 = await probe();
ok('багана 3-т «Apple» сонгогдов', JSON.stringify(p7.cols.level3?.selected) === '["Apple"]', JSON.stringify(p7.cols.level3?.selected));
ok('бүлэгтэй: багана 3-т «Apple» ГАНЦ (цэнхэр мөр ✓, толгой ХАСАГДСАН ✓)',
  p7.cols.level3?.dupe === 1 && p7.pickerTitles === 0,
  `dupe=${p7.cols.level3?.dupe} pickerTitles=${p7.pickerTitles}`);
ok('дүгнэлтэд БҮТЭН ЗАМ («Компьютер … › Notebook › Apple»)',
  ['Компьютер', 'Notebook', 'Apple'].every((x) => (p7.summary || '').includes(x)), p7.summary);

console.log('\n── ⑤ ДООД ТҮВШИНГҮЙ БҮЛЭГ (💻 Чихэвч) = өөрөө leaf ──');
await click('[data-picker="level2"] button[data-picker-value="Чихэвч"]');
const p8 = await probe();
ok('багана 2-т «Чихэвч» сонгогдов', JSON.stringify(p8.cols.level2?.selected) === '["Чихэвч"]', JSON.stringify(p8.cols.level2?.selected));
ok('дүгнэлтэд «Чихэвч» (бүлэг=leaf) 1 УДАА — давхардалгүй',
  (p8.summary || '').includes('Чихэвч') && !(p8.summary || '').includes('Apple')
  && (p8.summary || '').split('Чихэвч').length - 1 === 1, p8.summary);

console.log('\n── ⑥ ТАБ БА АЛХМЫН ГАРЧИГ ХАСАГДСАН + 2-Р АЛХАМ = 📍 БАЙРШИЛ ──');
await click('[data-picker="section"] button[data-picker-value="real-estate"]');
await click('[data-picker="level3"] button[data-picker-value="Орон сууц"]');
const plusOk = await clickNext();
const p9 = await probe();
ok('«Үргэлжлүүлэх» товч ажилласан', plusOk === 'OK', plusOk);
ok('2-Р АЛХАМ руу шилжив (breadcrumb = «2. Байршил» — 2026-10-01: дараалал солигдов)',
  String(p9.stepLabel).includes('2. Байршил'),
  JSON.stringify(p9.stepLabel));
const search = await evaluate('location.search');
ok('URL нь `?step=2` болов', String(search).includes('step=2'), search);
/**
 * 📍 2026-10-01 (хэрэглэгчийн хүсэлт): «Байршлыг 3т биш 2т оруулдаг мэдээлэл болго,
 *    ингэхдээ 1т зар оруулж байгаатай адилхан форматтай болгоорой»
 *    → ① алхмын байрлал 3 → **2** ② харагдац нь 1-р алхмын БАГАНАТ сонголттой ЯГ
 *    ИЖИЛ болж, `<select>` ХАСАГДАВ (`[data-picker="loc-city|loc-district|loc-khoroo"]`) ✓
 */
ok('байршил нь 3 БАГАНАТ сонголт (loc-city · loc-district · loc-khoroo)',
  p9.colCount === 3 && ['loc-city', 'loc-district', 'loc-khoroo'].every((k) => p9.cols[k]),
  `colCount=${p9.colCount} keys=${JSON.stringify(Object.keys(p9.cols))}`);
ok('байршилд `<select>` БАЙХГҮЙ (1-р алхмын форматтай ижил ✓)', p9.selects === 0, `selects=${p9.selects}`);
ok('📍 байршилд Ч БАГАНЫН ТОЛГОЙ БАЙХГҮЙ (`[data-picker-title]` = 0 ✓)',
  p9.pickerTitles === 0, `pickerTitles=${p9.pickerTitles}`);
ok('багана 1: «Улаанбаатар» сонгосон утга ГАНЦ (толгойд давхардахгүй) + 22 хот/аймаг',
  p9.cols['loc-city']?.dupe === 1 && p9.cols['loc-city']?.items.length === 22,
  `dupe=${p9.cols['loc-city']?.dupe} items=${p9.cols['loc-city']?.items.length}`);
ok('багана 2 (дүүрэг) = 9 дүүрэг, сонголт хийгээгүй (dupe 0 ✓)',
  p9.cols['loc-district']?.dupe === 0 && p9.cols['loc-district']?.items.length === 9,
  `dupe=${p9.cols['loc-district']?.dupe} items=${p9.cols['loc-district']?.items.length}`);
ok('багана 3 (хороо) хоосон — дүүрэг сонгоогүй тул ✓',
  p9.cols['loc-khoroo']?.items.length === 0,
  String(p9.cols['loc-khoroo']?.items.length));

console.log('\n── ⑥′ БАЙРШЛЫН БАГАНУУД: Хот → Дүүрэг → Хороо ──');
await click('[data-picker="loc-district"] button[data-picker-value="Баянгол"]');
const p10 = await probe();
ok('багана 2-т «Баянгол» сонгогдов',
  JSON.stringify(p10.cols['loc-district']?.selected) === '["Баянгол"]',
  JSON.stringify(p10.cols['loc-district']?.selected));
ok('багана 2-т «Баянгол» ГАНЦ (цэнхэр мөр ✓, толгойн давхардал үгүй)',
  p10.cols['loc-district']?.dupe === 1,
  `dupe=${p10.cols['loc-district']?.dupe} selected=${JSON.stringify(p10.cols['loc-district']?.selected)}`);
ok('багана 3-т Баянголын 33 хороо гарч ирэв',
  p10.cols['loc-khoroo']?.items.length === 33, String(p10.cols['loc-khoroo']?.items.length));
await click('[data-picker="loc-khoroo"] button[data-picker-value="3-р хороо"]');
const p11 = await probe();
ok('багана 3-т «3-р хороо» сонгогдов',
  JSON.stringify(p11.cols['loc-khoroo']?.selected) === '["3-р хороо"]',
  JSON.stringify(p11.cols['loc-khoroo']?.selected));
ok('байршлын дүгнэлтэд БҮТЭН ХАЯГ («Улаанбаатар › Баянгол › 3-р хороо»)',
  ['Улаанбаатар', 'Баянгол', '3-р хороо'].every((x) => (p11.locationSummary || '').includes(x)),
  p11.locationSummary);
// ⚠️ Дараалсан сонголт: ХОТ солиход дүүрэг БА хороо ХОЁУЛАА цэвэрлэгдэнэ ✓
await click('[data-picker="loc-city"] button[data-picker-value="Дархан-Уул"]');
const p12 = await probe();
ok('хот солиход дүүрэг ЦЭВЭРЛЭГДЭВ',
  JSON.stringify(p12.cols['loc-district']?.selected) === '[]' && p12.cols['loc-district']?.dupe === 0,
  JSON.stringify(p12.cols['loc-district']?.selected));
ok('хот солиход хороо ЦЭВЭРЛЭГДЭВ',
  JSON.stringify(p12.cols['loc-khoroo']?.selected) === '[]',
  JSON.stringify(p12.cols['loc-khoroo']?.selected));
ok('«Дархан-Уул»-ийн дүүрэг/сум гарч ирэв (4)',
  p12.cols['loc-district']?.items.length === 4,
  String(p12.cols['loc-district']?.items.length));

console.log('\n── ⑥″ 3-Р АЛХАМ = 📋 ДЭЛГЭРЭНГҮЙ (байршлаас ХОЙШ) ──');
const next3 = await clickNext();
const p13 = await probe();
ok('«Үргэлжлүүлэх» байршлаас ажилласан', next3 === 'OK', next3);
ok('3-Р АЛХАМ руу шилжив (breadcrumb = «3. Дэлгэрэнгүй»)',
  String(p13.stepLabel).includes('3. Дэлгэрэнгүй'),
  JSON.stringify(p13.stepLabel));
const search3 = await evaluate('location.search');
ok('URL нь `?step=3` болов', String(search3).includes('step=3'), search3);

console.log('\n── ⑥‴ 3-Р АЛХАМ (📋 Дэлгэрэнгүй): ТАЛБАРУУД ЦУВАА = 1 БАГАНА ──');
/**
 * ⚠️ 2026-10-01 (**5 дахь засвар**, хэрэглэгчийн хүсэлт): «Дэлгэрэнгүй хэсгийн
 *    мэдээллийг оруулах хэсгийг ЦУВАА буюу 1 БАГАНА болго» → 3-р алхмын мөр
 *    бүр `[data-form-row="details"]` (`.form-row-single`, globals.css) болов
 *    (`sm:grid-cols-2` БҮРЭН ХАСАГДАВ) тул 1440px дээр Ч талбарууд ЦУВАА ✓
 *    өмнө нь «Өрөө | Талбай», «Ашиглалтанд орсон он | Барилгын нийт давхар»
 *    зэрэг мөрүүд `sm`-ээс хойш ХОЁР багана болж ЗЭРЭГ харагдаж байв ✗
 *    ℹ️ Хэмжилт нь CSS-ийг БОДИТООР уншина: ① grid track-ийн тоо (ЯГ 1)
 *    ② хүүхдүүдийн x (ижил = зэрэг БИШ) ③ өргөн (мөрийнхөө бүтэн өргөн)
 *    ⇒ класс/стиль өөрчлөгдсөн ч зөрчил баригдана ✓
 */
const dr = p13.detailsRows || [];
ok('3-Р АЛХАМ: мөр бүр ЦУВАА — grid track ЯГ 1 (2 багана биш ✓)',
  dr.length >= 3 && dr.every((r) => r.cols === 1),
  JSON.stringify(dr.map((r) => r.cols)));
ok('3-Р АЛХАМ: талбарууд ЗЭРЭГ БИШ — бүгд ИЖИЛ x-т (зүүн ирмэгээрээ ✓)',
  dr.length >= 3 && dr.every((r) => r.stacked),
  JSON.stringify(dr.map((r) => ({ kids: r.kids, stacked: r.stacked }))));
ok('3-Р АЛХАМ: талбар бүр мөрийнхөө БҮТЭН өргөнийг эзэлнэ (хагас биш ✓)',
  dr.length >= 3 && dr.every((r) => r.full),
  JSON.stringify(dr.map((r) => ({ rowW: r.rowW, full: r.full }))));
ok('3-Р АЛХАМ: 2+ талбартай мөр («Өрөө» + «Талбай» …) Ч ЦУВАА (зэрэгцэхгүй ✓)',
  dr.filter((r) => r.kids >= 2).length >= 2,
  JSON.stringify(dr.map((r) => r.kids)));
// 📱 Мобайл (390px) дээр Ч 1 БАГАНА хэвээр — regression байхгүй гэдгийг батлана ✓
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 1400, deviceScaleFactor: 1, mobile: false });
await wait(600);
const drM = (await probe()).detailsRows || [];
ok('📱 390px (мобайл) дээр Ч ЦУВАА = 1 БАГАНА (regression үгүй ✓)',
  drM.length >= 3 && drM.every((r) => r.cols === 1 && r.stacked),
  JSON.stringify(drM.map((r) => ({ cols: r.cols, stacked: r.stacked }))));
await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false });
await wait(600);

console.log('\n── ⑦ 🔎 ДҮРС ТЕКСТЭЭС ХҮРЭХГҮЙ (§ «Үйлдвэрлэгч» combobox + sidebar) ──');
/**
 * 🔴 АСУУДАЛ (2026-10-01, хэрэглэгчийн гомдол): «🔎 нь text-ийнхээ эхний үсэгтэй
 *    давхардаад байна».
 *    ШАЛТГААН: форм дотор оролт нь `.form-group`-ийн дотор байдаг ба
 *    `app/globals.css`-ийн `.form-group :is(input, select, textarea):not(…)` (0,3,1)
 *    дүрэм нь `pl-8` (0,1,0)-ыг ДАРЖ `padding-left`-ыг **12px** болгодог байв →
 *    дүрс (`left-3` = 12px) нь текстийн эхний үсэг ДЭЭР сууж байв ✗
 * ✅ ЗАСВАР: `SearchableSelect`/`TextFilter` → **`!pl-9`** (36px) + **`!pr-10`** (40px)
 *    ⇒ доор нь дүрс ба текст ХҮРЭХГҮЙ (зай ≥ 6px) гэдгийг БОДИТ Chrome дээр хэмжинэ ✓
 */
const waitForSel = async (sel, ms = 10000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await evaluate(`!!document.querySelector(${JSON.stringify(sel)})`)) return true;
    await wait(250);
  }
  return false;
};
/** 🔎 дүрстэй оролт БҮРИЙН зайг хэмжинэ (icon.right → текстийн эхлэл) */
const ICON_PROBE = `(() => {
  const out = [];
  document.querySelectorAll('input').forEach((input) => {
    const holder = input.parentElement;
    const icon = holder ? holder.querySelector('span[aria-hidden="true"]') : null;
    if (!icon) return;
    const ir = input.getBoundingClientRect();
    const gr = icon.getBoundingClientRect();
    const cs = getComputedStyle(input);
    out.push({
      aria: (input.getAttribute('aria-label') || input.getAttribute('placeholder') || '').trim(),
      cls: input.className,
      pl: cs.paddingLeft,
      pr: cs.paddingRight,
      iconRight: +(gr.right - ir.left).toFixed(1),
      gap: +(ir.left + parseFloat(cs.paddingLeft) - gr.right).toFixed(1),
    });
  });
  return out;
})()`;

// 🚗 Автомашин → Суудлын машин → 2-Р АЛХАМ (📍 Байршил) → 3-Р АЛХАМ (Үйлдвэрлэгч)
// ⚠️ 2026-10-01: «Байршил» 2-р алхам болов → «🏷️ Үйлдвэрлэгч» (📋 Дэлгэрэнгүй,
//    3-р алхам) руу хүрэхэд «Үргэлжлүүлэх»-ийг ХОЁР УДАА дарах хэрэгтэй ✓
// ⚠️ Табууд хасагдсан → 1-р алхам руу URL-аар буцна (`?step=1`)
await gotoStepUrl(1);
await click('[data-picker="section"] button[data-picker-value="auto"]');
await waitForSel('[data-picker="level2"] button[data-picker-value="Суудлын машин"]');
await click('[data-picker="level2"] button[data-picker-value="Суудлын машин"]');
await clickNext(); // 1 → 2 (📍 Байршил — хот анхдагчаар сонгогдсон тул зүгээр ✓)
await waitForSel('[data-picker="loc-city"]');
await clickNext(); // 2 → 3 (📋 Дэлгэрэнгүй — 🏷️ Үйлдвэрлэгч энд байна)
await waitForSel('input[role="combobox"]');

const formFields = await evaluate(ICON_PROBE);
const brand = formFields.find((f) => f.aria.includes('Үйлдвэрлэгч'));
ok('🔎 «🏷️ Үйлдвэрлэгч» combobox олдов', Boolean(brand), JSON.stringify(formFields.map((f) => f.aria)));
ok('🔎 дүрс текстийн эхний үсэгтэй ХҮРЭХГҮЙ (зай ≥ 6px)',
  Boolean(brand) && brand.gap >= 6, JSON.stringify(brand));
ok('padding-left ≥ 36px (`!pl-9` нь `.form-group`-ийн 12px-ыг дарсан)',
  Boolean(brand) && parseFloat(brand.pl) >= 36, brand ? brand.pl : 'талбар олдсонгүй');

// ✍️ «Toyota» бичихэд ✕ (Арилгах) товч текстээс хүрэхгүй байх ёстой (`!pr-10`)
await evaluate(`(() => {
  const i = document.querySelector('input[role="combobox"]');
  i.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(i, 'Toyota');
  i.dispatchEvent(new Event('input', { bubbles: true }));
  return 'OK';
})()`);
await wait(600);
const typed = await evaluate(`(() => {
  const input = document.querySelector('input[role="combobox"]');
  const btn = input.parentElement.querySelector('button[aria-label="Арилгах"]');
  if (!btn) return { error: '✕ товч гараагүй' };
  const cs = getComputedStyle(input);
  const ir = input.getBoundingClientRect();
  return {
    pr: cs.paddingRight,
    value: input.value,
    clearance: +(btn.getBoundingClientRect().left - (ir.right - parseFloat(cs.paddingRight))).toFixed(1),
  };
})()`);
ok('текст бичихэд ✕ товч текстээс ХҮРЭХГҮЙ (`!pr-10` ≥ 40px, зай ≥ 6px)',
  !typed.error && parseFloat(typed.pr) >= 40 && typed.clearance >= 6, JSON.stringify(typed));

// ── ⑦′ АВТО ФОРМ (3-р алхам) — 🔧 Хөдөлгүүр сонголт · 🎨 Өнгө · 🔀 Хөтлөгч байхгүй ──
// ⚠️ 2026-10-01 (хэрэглэгчийн хүсэлт): «Хөтлөгч хэсгийг байхгүй болгож Өнгө гэсэн
//    сонголтыг оруулж ир» + «Хөдөлгүүр … дараах сонголттой болго» ⇒ DOM-оос
//    талбар бүрийн `<label>` ба `<select>`-ийн сонголтуудыг уншиж батална ✓
//    ⚠️ Энэ нь template literal ТУЛ дотор backtick эсвэл доллар-бүслүүр БИЧИХГҮЙ
const ATTRS_PROBE = `(() => {
  return [...document.querySelectorAll('[data-form-row="details"] .form-group')].map((g) => {
    const lab = (g.querySelector('label') || {}).textContent || '';
    const box = g.querySelector('select');
    return {
      label: lab.trim(),
      options: box ? [...box.options].map((o) => (o.textContent || '').trim()) : [],
    };
  });
})()`;
const attrs3 = await evaluate(ATTRS_PROBE);
const engineField = attrs3.find((g) => g.label.includes('Хөдөлгүүр'));
const ENGINE7 = [
  '1.5л хүртэл', '1.5л - 2.0л', '2.1л - 2.7л', '2.8л - 3.5л',
  '3.6л - 4.5л', '4.6л ба түүнээс дээш', 'Цахилгаан (EV)',
];
ok('🔧 «Хөдөлгүүр» нь СОНГОЛТ болов (чөлөөт текст БИШ)',
  Boolean(engineField) && engineField.options.length === 8,
  JSON.stringify(engineField));
ok('🔧 хөдөлгүүрийн 7 утга ЯГ дарааллаараа (1.5л хүртэл … Цахилгаан (EV))',
  Boolean(engineField) && engineField.options[0] === 'Сонгох'
    && JSON.stringify(engineField.options.slice(1)) === JSON.stringify(ENGINE7),
  JSON.stringify(engineField && engineField.options));
const colorField = attrs3.find((g) => g.label.includes('Өнгө'));
ok('🎨 «Өнгө» нэмэгдэв (10 сонголт + хоосон «Сонгох» мөр)',
  Boolean(colorField) && colorField.options.length === 11,
  JSON.stringify(colorField));
ok('🔀 «Хөтлөгч» форм дээр БАЙХГҮЙ (0 талбар)',
  !attrs3.some((g) => g.label.includes('Хөтлөгч')),
  JSON.stringify(attrs3.map((g) => g.label)));

// ⬅️ SIDEBAR (HomeClient) — ижил 2 компонент, ижил класс
/**
 * ⚠️ Энэ цэгээс өмнө хуримтлагдсан алдаа = ЗӨВХӨН `/listings/new` (picker + форм)
 *    дээр гарсан алдаа — ⑧-д шалгах нь ЯГ тэр хэсэг (нүүр хуудсанд шилжсэний
 *    дараах алдаа нь ⚠️ хуучирсан session (`PGRST301` JWT) — кодтой холбоогүй)
 */
const pickerProblems = problems.slice();
await rpc('Page.navigate', { url: `${BASE}/?section=auto&category=all&type=${encodeURIComponent('Суудлын машин')}` });
await wait(2500);
await waitForSel('input[aria-label="Үйлдвэрлэгч"]', 15000);
const sideFields = await evaluate(ICON_PROBE);
ok('sidebar: 🔎 дүрстэй талбарт «Үйлдвэрлэгч» ба «Загвар» бий (hero хайлттай хамт)',
  sideFields.some((f) => f.aria.includes('Үйлдвэрлэгч'))
  && sideFields.some((f) => f.aria.includes('Загвар')),
  JSON.stringify(sideFields.map((f) => f.aria)));
ok('sidebar: бүх 🔎 талбарын зай ≥ 6px (дүрс текстээ халхлахгүй)',
  sideFields.length >= 2 && sideFields.every((f) => f.gap >= 6),
  JSON.stringify(sideFields.map((f) => `${f.aria.slice(0, 14)}:${f.gap}px`)));

// 🎨🔀 2026-10-01: sidebar-ийн ATTR шүүлтүүд (`select[aria-label]`) — «Өнгө» бий,
//    «Хөтлөгч» БАЙХГҮЙ (форм ба sidebar НЭГ эх сурвалж: attrFields → attrFilters ✓)
const SIDE_SELECTS = `(() => [...document.querySelectorAll('select[aria-label]')]
  .map((s) => ({ aria: (s.getAttribute('aria-label') || '').trim(), n: s.options.length })))()`;
const sideSelects = await evaluate(SIDE_SELECTS);
ok('sidebar: 🎨 «Өнгө» шүүлт бий (10 сонголт + «Бүгд» мөр)',
  sideSelects.some((s) => s.aria === 'Өнгө' && s.n === 11),
  JSON.stringify(sideSelects));
ok('sidebar: 🔀 «Хөтлөгч» шүүлт БАЙХГҮЙ (0 талбар)',
  !sideSelects.some((s) => s.aria === 'Хөтлөгч'),
  JSON.stringify(sideSelects.map((s) => s.aria)));

console.log('\n── ⑧ CONSOLE / EXCEPTION ──');
ok('JS exception / console.error БАЙХГҮЙ (picker + Үйлдвэрлэгч форм)',
  pickerProblems.length === 0, JSON.stringify(pickerProblems.slice(0, 5)));
console.log(`  ℹ️ сүлжээний 401 (Supabase session, кодтой холбоогүй): ${netProblems.length}`);
console.log(`  ℹ️ нүүр хуудсанд шилжсэний дараах алдаа (⚠️ хуучирсан session JWT — кодтой холбоогүй): ${problems.length - pickerProblems.length}`);

console.log(`\n══════════ ҮР ДҮН: ${pass}/${pass + fail} ✓ ══════════\n`);
try { await fetch(`${CDP}/json/close/${target.id}`); } catch { /* орхино */ }
ws.close();
process.exit(fail ? 1 : 0);
