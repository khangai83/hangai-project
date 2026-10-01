/**
 * 🗂 CDP ШАЛГАЛТ — «ЗАР НЭМЭХ» → 1-Р АЛХАМ: 3 БАГАНАТ «Категорио сонгоно уу»
 *    + ДЭЭД ХЭСГИЙН АЛХМЫН ТАБУУД (2026-10-01)
 *
 * Хэрэглэгчийн хүсэлт: «Эхний хэсгийг ийм болго» (`unegui.mn/post_ad/`) —
 *   ① 1-р алхам нь 3 БАГАНАТ сонголт (Хэсэг → «Зарах/Түрээслэх»/БҮЛЭГ → Дэд төрөл)
 *   ② ДЭЭД ХЭСЭГТ «Ангилал · Дэлгэрэнгүй · Байршил · Үнэ · Зураг» табууд
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ (34 шалгалт):
 *   ① Үл хөдлөх: 3 багана (12 хэсэг · sell/rent · 8 төрөл) + толгой = сонгосон утга
 *   ② «Түрээслэх» солиход багана 3 нь «…түрээслүүлнэ» болно + `?step=2` руу шилжинэ
 *   ③ ХАВТГАЙ хэсэг (🚗 auto) → багана 3 АРИЛНА (2 багана) + хуучин сонголт цэвэрлэгдэнэ
 *   ④ БҮЛЭГТЭЙ хэсэг (💻 computers) → 9 бүлэг, «Notebook» → 22 брэнд (3 багана)
 *   ⑤ ДООД ТҮВШИНГҮЙ бүлэг (💻 Чихэвч) нь ӨӨРӨӨ leaf болж хадгалагдана
 *   ⑥ Алхмын табууд: 5 таб, идэвхтэй нь `aria-selected`, дууссан дээр дарж буцна
 *   ⑦ JS exception / `console.error` 0 (сүлжээний 401 нь Supabase session — тооцохгүй)
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
 *     `[data-picker-summary]` · `[data-step-tab="…"]` ✓
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
    title: document.body.innerText.includes('Категорио сонгоно уу'),
    tabs: [...document.querySelectorAll('[role="tablist"] [role="tab"]')].map((b) => (b.innerText || '').trim()),
    activeTab: (document.querySelector('[role="tab"][aria-selected="true"]') || {}).innerText || '',
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


console.log('\n── ① НЭВТЭРСЭН ТӨЛӨВ + АНХДАГЧ (🏠 Үл хөдлөх) ──');
const p0 = await probe();
ok('нэвтрэх хаалт ГАРАХГҮЙ (session ажиллаж байна)', p0.gate === false);
ok('«Категорио сонгоно уу» гарчиг байна', p0.title === true);
ok('дээд хэсэгт 5 АЛХМЫН ТАБ байна',
  p0.tabs.length === 5 && p0.tabs.join('|').includes('Ангилал') && p0.tabs.join('|').includes('Байршил'),
  JSON.stringify(p0.tabs));
ok('1-р таб идэвхтэй (Ангилал)', String(p0.activeTab).includes('Ангилал'), JSON.stringify(p0.activeTab));
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
ok('өмнөх сонголт ЦЭВЭРЛЭГДЭВ', JSON.stringify(p3.cols.level2?.selected) === '[]' && (p3.summary || '').includes('Дэд төрлөө сонгоно уу'), p3.summary);
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

console.log('\n── ⑥ АЛХМЫН ТАБУУД + ДАРААГИЙН АЛХАМ ──');
await click('[data-picker="section"] button[data-picker-value="real-estate"]');
await click('[data-picker="level3"] button[data-picker-value="Орон сууц"]');
const plusOk = await evaluate(`(() => { const b = [...document.querySelectorAll('form button')].find((x) => (x.innerText||'').includes('Үргэлжлүүлэх')); if (!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()`);
await wait(700);
const p9 = await probe();
ok('«Үргэлжлүүлэх» товч ажилласан', plusOk === 'OK', plusOk);
ok('2-Р АЛХАМ руу шилжив (Дэлгэрэнгүй идэвхтэй)', String(p9.activeTab).includes('Дэлгэрэнгүй'), JSON.stringify(p9.activeTab));
const search = await evaluate('location.search');
ok('URL нь `?step=2` болов', String(search).includes('step=2'), search);

console.log('\n── ⑦ CONSOLE / EXCEPTION ──');
ok('JS exception / console.error БАЙХГҮЙ', problems.length === 0, JSON.stringify(problems.slice(0, 5)));
console.log(`  ℹ️ сүлжээний 401 (Supabase session, кодтой холбоогүй): ${netProblems.length}`);

console.log(`\n══════════ ҮР ДҮН: ${pass}/${pass + fail} ✓ ══════════\n`);
try { await fetch(`${CDP}/json/close/${target.id}`); } catch { /* орхино */ }
ws.close();
process.exit(fail ? 1 : 0);
