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
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ (43 шалгалт):
 *   ① Үл хөдлөх: 3 багана (12 хэсэг · sell/rent · 8 төрөл) + толгой = сонгосон утга
 *   ② «Түрээслэх» солиход багана 3 нь «…түрээслүүлнэ» болж, дүгнэлтэд БҮТЭН зам гарна
 *   ③ ХАВТГАЙ хэсэг (🚗 auto) → багана 3 АРИЛНА (2 багана) + багана 2-ын толгой
 *      «Төрөл» (2026-10-01 — «Дэд төрөл» БИШ ✓) + хуучин сонголт цэвэрлэгдэнэ
 *   ④ БҮЛЭГТЭЙ хэсэг (💻 computers) → 9 бүлэг, «Notebook» → 22 брэнд (3 багана)
 *   ⑤ ДООД ТҮВШИНГҮЙ бүлэг (💻 Чихэвч) нь ӨӨРӨӨ leaf болж хадгалагдана
 *   ⑥ АЛХМЫН ТАБ ба форм дотрох АЛХМЫН ГАРЧИГ ХОЁУЛАА ХАСАГДСАН
 *      (0 `role="tab"` · `[data-step-heading]` = 0) + «Үргэлжлүүлэх» → 2-р алхам
 *      (breadcrumb `[data-step-current]` = «2. Дэлгэрэнгүй» + URL `?step=2`) ✓
 *   ⑦ 🔎 ДҮРС ТЕКСТЭЭС ХҮРЭХГҮЙ — 🏷️ Үйлдвэрлэгчийн `combo`/текст талбарт
 *      (`!pl-9` = 36px, зай ≥ 6px) + ✕ товч (`!pr-10`) + sidebar-ийн 2 талбар
 *   ⑧ JS exception / `console.error` 0 (сүлжээний 401 нь Supabase session — тооцохгүй)
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
      title: (el.innerText || '').split('\\n')[0].trim(),
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
    colCount: document.querySelectorAll('[data-picker]').length,
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
ok('багана 1 толгой = «🏠 Үл хөдлөх»', (p0.cols.section?.title || '').includes('Үл хөдлөх'), p0.cols.section?.title);
ok('багана 2: Зарах/Түрээслэх (sell, rent)', JSON.stringify(p0.cols.level2?.items) === '["sell","rent"]', JSON.stringify(p0.cols.level2?.items));
ok('багана 2 толгой = «💰 Зарах»', (p0.cols.level2?.title || '').includes('Зарах'), p0.cols.level2?.title);
ok('багана 3: 8 ТӨРӨЛ', p0.cols.level3?.items.length === 8, String(p0.cols.level3?.items.length));
ok('багана 3 дэд төрөл = «Орон сууц»', (p0.cols.level3?.items || []).includes('Орон сууц'), JSON.stringify(p0.cols.level3?.items.slice(0, 3)));
ok('дүгнэлт: «…сонгоно уу»', (p0.summary || '').includes('сонгоно уу'), p0.summary);

console.log('\n── ② ТҮРЭЭСЛҮҮЛЭХ + ДЭД ТӨРӨЛ СОНГОХ ──');
await click('[data-picker="level2"] button[data-picker-value="rent"]');
const p1 = await probe();
ok('багана 2-т «rent» сонгогдов', JSON.stringify(p1.cols.level2?.selected) === '["rent"]', JSON.stringify(p1.cols.level2?.selected));
ok('багана 2 толгой = «🔑 Түрээслэх»', (p1.cols.level2?.title || '').includes('Түрээслэх'), p1.cols.level2?.title);
await click('[data-picker="level3"] button[data-picker-value="Орон сууц"]');
const p2 = await probe();
ok('багана 3-т «Орон сууц» сонгогдов', JSON.stringify(p2.cols.level3?.selected) === '["Орон сууц"]', JSON.stringify(p2.cols.level3?.selected));
ok('дүгнэлтэд бүтэн зам («Орон сууц түрээслүүлнэ»)',
  (p2.summary || '').includes('Үл хөдлөх') && (p2.summary || '').includes('Түрээслэх') && (p2.summary || '').includes('Орон сууц түрээслүүлнэ'),
  p2.summary);

console.log('\n── ③ ХАВТГАЙ ХЭСЭГ (🚗 Автомашин) → 2 БАГАНА ──');
await click('[data-picker="section"] button[data-picker-value="auto"]');
const p3 = await probe();
ok('багана 3 АРИЛАВ (2 багана)', p3.colCount === 2, `colCount=${p3.colCount}`);
ok('багана 1 толгой = «🚗 Автомашин»', (p3.cols.section?.title || '').includes('Автомашин'), p3.cols.section?.title);
ok('багана 2 = 10 дэд төрөл (хавтгай)', p3.cols.level2?.items.length === 10, String(p3.cols.level2?.items.length));
ok('багана 2 толгой = «Төрөл» (2026-10-01: «Дэд төрөл» БИШ ✓)',
  (p3.cols.level2?.title || '') === 'Төрөл', JSON.stringify(p3.cols.level2?.title));
ok('өмнөх сонголт ЦЭВЭРЛЭГДЭВ', JSON.stringify(p3.cols.level2?.selected) === '[]' && (p3.summary || '').includes('Төрлөө сонгоно уу'), p3.summary);
await click('[data-picker="level2"] button[data-picker-value="Жийп, SUV"]');
const p4 = await probe();
ok('хавтгай хэсэгт дэд төрөл сонгогдов', (p4.summary || '').includes('Жийп, SUV'), p4.summary);

console.log('\n── ④ БҮЛЭГТЭЙ ХЭСЭГ (💻 Компьютер) → 3 БАГАНА ──');
await click('[data-picker="section"] button[data-picker-value="computers"]');
const p5 = await probe();
ok('3 багана буцаж ирэв', p5.colCount === 3, `colCount=${p5.colCount}`);
ok('багана 2 = 9 БҮЛЭГ', p5.cols.level2?.items.length === 9, JSON.stringify(p5.cols.level2?.items));
ok('багана 3 хоосон (бүлэг сонгоогүй)', p5.cols.level3?.items.length === 0, String(p5.cols.level3?.items.length));
await click('[data-picker="level2"] button[data-picker-value="Notebook"]');
const p6 = await probe();
ok('багана 2 толгой = «Notebook»', (p6.cols.level2?.title || '').includes('Notebook'), p6.cols.level2?.title);
ok('багана 3 = Notebook-ийн 22 брэнд', p6.cols.level3?.items.length === 22, String(p6.cols.level3?.items.length));
await click('[data-picker="level3"] button[data-picker-value="Apple"]');
const p7 = await probe();
ok('багана 3-т «Apple» сонгогдов', JSON.stringify(p7.cols.level3?.selected) === '["Apple"]', JSON.stringify(p7.cols.level3?.selected));
ok('дүгнэлтэд БҮТЭН ЗАМ («Компьютер … › Notebook › Apple»)',
  ['Компьютер', 'Notebook', 'Apple'].every((x) => (p7.summary || '').includes(x)), p7.summary);

console.log('\n── ⑤ ДООД ТҮВШИНГҮЙ БҮЛЭГ (💻 Чихэвч) = өөрөө leaf ──');
await click('[data-picker="level2"] button[data-picker-value="Чихэвч"]');
const p8 = await probe();
ok('багана 2-т «Чихэвч» сонгогдов', JSON.stringify(p8.cols.level2?.selected) === '["Чихэвч"]', JSON.stringify(p8.cols.level2?.selected));
ok('дүгнэлтэд «Чихэвч» (бүлэг=leaf) 1 УДАА — давхардалгүй',
  (p8.summary || '').includes('Чихэвч') && !(p8.summary || '').includes('Apple')
  && (p8.summary || '').split('Чихэвч').length - 1 === 1, p8.summary);

console.log('\n── ⑥ ТАБ БА АЛХМЫН ГАРЧИГ ХАСАГДСАН + ДАРААГИЙН АЛХАМ ──');
await click('[data-picker="section"] button[data-picker-value="real-estate"]');
await click('[data-picker="level3"] button[data-picker-value="Орон сууц"]');
const plusOk = await evaluate(`(() => { const b = [...document.querySelectorAll('form button')].find((x) => (x.innerText||'').includes('Үргэлжлүүлэх')); if (!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()`);
await wait(700);
const p9 = await probe();
ok('«Үргэлжлүүлэх» товч ажилласан', plusOk === 'OK', plusOk);
ok('2-Р АЛХАМ руу шилжив (breadcrumb = «2. Дэлгэрэнгүй»)',
  String(p9.stepLabel).includes('2. Дэлгэрэнгүй'),
  JSON.stringify(p9.stepLabel));
const search = await evaluate('location.search');
ok('URL нь `?step=2` болов', String(search).includes('step=2'), search);

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

// 🚗 Автомашин → Суудлын машин → 2-Р АЛХАМ (Үйлдвэрлэгч тэнд байна)
// ⚠️ Табууд хасагдсан → 1-р алхам руу URL-аар буцна (`?step=1`)
await gotoStepUrl(1);
await click('[data-picker="section"] button[data-picker-value="auto"]');
await waitForSel('[data-picker="level2"] button[data-picker-value="Суудлын машин"]');
await click('[data-picker="level2"] button[data-picker-value="Суудлын машин"]');
await evaluate('(() => { const b = [...document.querySelectorAll(\'form button\')].find((x) => (x.innerText||\'\').includes(\'Үргэлжлүүлэх\')); if (!b) return \'NOT_FOUND\'; b.click(); return \'OK\'; })()');
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

console.log('\n── ⑧ CONSOLE / EXCEPTION ──');
ok('JS exception / console.error БАЙХГҮЙ (picker + Үйлдвэрлэгч форм)',
  pickerProblems.length === 0, JSON.stringify(pickerProblems.slice(0, 5)));
console.log(`  ℹ️ сүлжээний 401 (Supabase session, кодтой холбоогүй): ${netProblems.length}`);
console.log(`  ℹ️ нүүр хуудсанд шилжсэний дараах алдаа (⚠️ хуучирсан session JWT — кодтой холбоогүй): ${problems.length - pickerProblems.length}`);

console.log(`\n══════════ ҮР ДҮН: ${pass}/${pass + fail} ✓ ══════════\n`);
try { await fetch(`${CDP}/json/close/${target.id}`); } catch { /* орхино */ }
ws.close();
process.exit(fail ? 1 : 0);
