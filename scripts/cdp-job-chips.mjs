// ============================================================
// cdp-job-chips.mjs — 💼 АЖЛЫН ЗАРЫН ФОРМ: 4 ЧИП ТАЛБАР (CDP ШАЛГАЛТ)
//
// 🎯 ЮУГ ШАЛГАХ ВЭ: `/listings/new` → 💼 Ажлын зар → дэд төрөл → 3-р алхам
//    (📋 Дэлгэрэнгүй) дээр 🕒 Ажлын цаг · 📊 Туршлага · 🏷️ Зарлагч ·
//    📈 Мэргэжлийн түвшин нь `<select>` БИШ, **СОНГОГДОХ ЧИП ТОВЧ**
//    (`.chip-toggle`) болж харагдах ба утга нь ХУУЧИН `<select>`-тэй
//    ЯГ ИЖИЛ (`form.attrs[key]` — текст) хадгалагдах:
//    ① чип блок БАЙНА + сонголтын тоо (5/2/3/5) ② дарж СОНГОХ
//    (mutual exclusive) ③ дахин дарж ЦУЦЛАХ (toggle — бүх чип идэвхгүй,
//    бусдыг ХӨНДӨХГҮЙ) ④ 💰 `salaryType` нь `<select>` ХЭВЭЭР
//    ⑤ 📱 390px — 4 талбар БҮГД хүрэх + overflow 0
//    🆕 (17) ⑥ ХАЙЛТЫН ХУУДАС: 🕒/📊/📈 нь «Дэлгэрэнгүй хайлт»-ийн САЙДБАРТ
//    (`aside [data-attr-filter="jobType|experience|jobLevel"]`; чип 12 = 5+2+5;
//    ⚠️ jobs дээр `#filter-bar` ОГТ БАЙХГҮЙ — pill тугтай attr байхгүй ✓)
//    ⑥b сайдбарын чип дарж `?attr_jobType=Бүтэн цагийн,Цагийн` (⛔ цуцлагдахгүй,
//    «2 сонгосон» + «✕ Цуцлах») ⑥c сайдбарын чип HOVER (⑥c) ⑦ JS exception 0
//
// 🆕 2026-10-06 (17) (хэрэглэгчийн хүсэлт: «Ажлын зарын Ажлын цаг, Туршлага,
//    Мэргэжлийн түвшин -ийг бас Дэлгэрэнгүй хайлт д оруул»): ⏳ (42)-ийн
//    `#filter-bar` PILL ХАСАГДАВ ⇒ 3 нь сайдбарт буцав (💼-ийн «💰 Цалин, ₮»-ний
//    дараа ✓); ⑥c hover шалгалт нь PILL-ээс САЙДБАРЫН ЧИП рүү шилжив
//    (⚠️ 💻 pill-ийн hover нь `cdp-notebook-specs` §⑧b-д ХЭВЭЭР ✓)
//
// 🆕 2026-10-05 (42): ⏳ (9)-д форм дээр 4 чип нэмэгдсэн ч ХАЙЛТЫН sidebar-д
//    зөвхөн 🕒 нь чип, 📊/📈 нь `<select>` байв — хэрэглэгчийн хүсэлт («Ажлын
//    цаг, Туршлага, Мэргэжлийн түвшиныг Өрөөний тоо шиг болго, хайлтыг хэлж
//    байгаа биз дээ») ⇒ 🛏 «Өрөөний тоо» · 💳 «Төлбөрийн нөхцөл»-ийн ЯГ ИЖИЛ
//    `#filter-bar` pill болов (`lib/locationData.js → filterBar: true` ✓)
//    (⚠️ ФОРМ ХӨНДӨГДӨӨГҮЙ — ③④ нэг сонголттой чип хэвээр ✓)
//
// ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
//   1) сервер http://localhost:3000 (`npm run build && npm run start`)
//      ℹ️ Өөр порт: `node scripts/cdp-job-chips.mjs http://localhost:3200`
//   2) Chrome алсын дебагттай + НЭВТЭРСЭН профайлаар:
//      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
//        --headless=new --remote-debugging-port=9222 \
//        --user-data-dir=/tmp/chrome-prof-zar http://localhost:3000/
//      ⚠️ Форм нь ЗӨВХӨН нэвтэрсэн хэрэглэгчид харагдана (скрипт өөрөө
//         демо хэрэглэгчээр `ZAR_PHONE`/`ZAR_PASS`-аар нэвтэрнэ ✓)
//   Дараа нь:  npm run cdp:chips
//
// ⚠️ Тогтвортой selector-ууд:
//    `[data-attr-field="…"]` (формойн чип блок, `role="group"`) ·
//    `[data-attr-value="…"]` (чип товч) · `[data-detail-field="attr-salaryType"]
//    select` · `[data-detail-field="title"]` · `[data-picker="section"]` /
//    `[data-picker="level2"]` (`button[data-picker-value]`) ·
//    `[data-step-current]` · `[data-mobile-detail-next]`
//    ℹ️ ХАЙЛТЫН чип нь `[data-attr-filter="…"]` (+ `data-attr-multi="true"`)
//       хайрцаг дотор — 🆕 (17)-д сайдбарт (`aside`), форм нь `data-attr-field`
//       (`formChips`) тул ХОЛИГДОХГҮЙ ✓
//       ⚠️ Форм дээрх чип нь НЭГ сонголттой хэвээр тул ③④ ХӨНДӨГДӨӨГҮЙ ✓
//       ⚠️ 🆕 (17): хайлтын талд pill/⌄ панель БАЙХГҮЙ (💼 дээр `#filter-bar`
//          ОГТ рендэрлэгдэхгүй) ⇒ pill НЭЭХ шаардлагагүй, чип нь ШУУД
//          харагдана ✓ (⏳ (42)-(16)-д `[data-filter-pill]` + `visibility:hidden`
//          панель байв ✗)
//
// ⚠️ МЭДЭГДЭХҮЙ АРГУУД (энэ скриптээр батлагдсан):
//    ⓐ React-ийн `state.attrs`-ыг fiber-ээс уншихад COMMIT-ийн 1 АЛХАМ
//       ХОЦРОЛТТОЙ (DOM аль хэдийн шинэчлэгдсэн байдаг) ⇒ шалгалт нь
//       `aria-pressed` / `.chip-toggle-active`-ыг POLL хийнэ ✓
//    ⓑ `<aside>` нь 🆕 2026-10-03 (13)-аас хойш ХЭСГИЙН түвшинд ч
//       рендэрлэгддэг (`showAdvancedFilters` — үргэлж ✓); ⏳ урьд нь зөвхөн
//       `filters.propertyType` сонгогдсон үед байв ✗ (`HomeClient.jsx`)
//       ⚠️ Энэ шалгалт нь форм дээрх 3-р түвшний сонголттой ЖИШИХ тул
//       `?section=jobs&type=<дэд төрөл>` хаягаар ХЭВЭЭР явна ✓
//    ⓒ headless Chrome-ийн анхдагч өргөн 800px дээр sidebar ХААГДАНА ⇒
//       📱 шалгалтын дараа метрикийг 1440px руу БУЦААНА ✓
//    ⓓ 📱 3-р алхмын ЭХНИЙ дэлгэц нь «Зарын гарчиг» (ЗААВАЛ талбар) ⇒
//       бөглөхгүй бол `[data-mobile-detail-next]` ХӨДӨЛӨХГҮЙ ✗
//    ⓔ засах горим (④b) нь 💼 АЖЛЫН ЗАР шаардна — демо хэрэглэгчид
//       ажлын зар БАЙХГҮЙ бол ④b-г АЛГАСНА (бусад шалгалт хэвээр ✓)
// 🔍 Хайх үг: cdp-job-chips, formChips, chip-toggle, data-attr-field,
//    data-attr-value, attr-salaryType, jobs, filterBar, afterPayment,
//    Дэлгэрэнгүй хайлт, Өрөөний тоо шиг
// ============================================================
const BASE = process.argv[2] || 'http://localhost:3000';
const CDP = `http://127.0.0.1:${process.env.CDP_PORT || 9222}`;
const PHONE = process.env.ZAR_PHONE || '99112233';
const PASS = process.env.ZAR_PASS || 'ZarDemo123!';

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${name}`); }
  else { fail += 1; console.log(`  ✗ ${name}${extra ? `  → ${extra}` : ''}`); }
};

/** ⛔ CDP байхгүй бол SKIP (алдаа БИШ — хэрхэн ажиллуулахыг хэлнэ ✓) */
try {
  const r = await fetch(`${CDP}/json/version`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
} catch (e) {
  console.log(`\n⏭  SKIP: Chrome алсын дебагт (${CDP}) олдсонгүй — ${e.message}`);
  console.log('\n   Ажиллуулах:');
  console.log('   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\');
  console.log('     --headless=new --remote-debugging-port=9222 \\');
  console.log(`     --user-data-dir=/tmp/chrome-prof-zar ${BASE}/`);
  console.log('   ⚠️ Профайл нь НЭВТЭРСЭН байх ёстой (форм зөвхөн нэвтэрсэн хүнд).\n');
  process.exit(0);
}

// ⚠️ Chrome-д олон таб нээлттэй байвал хуучин таб нь `Runtime.evaluate`-д хариу
//    өгөхгүй hang болдог ✗ → ШИНЭ таб нээж түүн дээр ажиллана ✓
let page = null;
try {
  const created = await fetch(`${CDP}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  if (created.ok) page = await created.json();
} catch { /* хуучин Chrome (PUT дэмжихгүй) → доорх нөөц зам ✓ */ }
const tabList = await (await fetch(`${CDP}/json/list`)).json();
let ownTab = !tabList.some((t) => t.id === page?.id);
if (!page?.webSocketDebuggerUrl) {
  page = tabList.filter((t) => t.type === 'page' && t.webSocketDebuggerUrl)[0];
  ownTab = false;
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
/** ℹ️ Скрипт дуусахад (амжилттай ч, алдаатай ч) өөрөө нээсэн табаа ХААНА ✓ */
const closeOwnTab = async () => {
  if (!ownTab) return;
  try { await fetch(`${CDP}/json/close/${page.id}`); } catch { /* алгасна */ }
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
await new Promise((res) => ws.addEventListener('open', res, { once: true }));

let id = 0;
const rpc = (method, params = {}) => {
  id += 1;
  const myId = id;
  ws.send(JSON.stringify({ id: myId, method, params }));
  return new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error(`timeout ${method}`)), 40000);
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

const problems = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') {
    problems.push(`exception: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    problems.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  }
});

await rpc('Runtime.enable');
await rpc('Page.enable');
await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const evaluate = async (expression) => {
  const r = await rpc('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(String(r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
};
const byKeyState = (st, key, value) => {
  const b = st.blocks.find((x) => x.key === key);
  return (b?.chips || []).find((c) => c.v === value) || {};
};

// ═══════ ① НЭВТРЭЛТ (демо хэрэглэгч) ═══════
// ⚠️ Форм нь ЗӨВХӨН нэвтэрсэн хэрэглэгчид харагдана — профайл нэвтэрсэн бол
//    шууд алгасна (auth-token localStorage-д бий ✓)
console.log('\n① НЭВТРЭЛТ — 🔑 Нэвтрэх (демо хэрэглэгч)');
await rpc('Page.navigate', { url: `${BASE}/` });
await wait(6000);
const already = await evaluate(`(() => Object.keys(localStorage).some((k) => k.includes('auth-token')))()`);
if (!already) {
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find((x) => /Нэвтрэх/.test(x.innerText) && x.offsetParent !== null); if (b) b.click(); return !!b; })()`);
  await wait(1500);
  const filled = await evaluate(`(() => {
    const set = (el, v) => { const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    const tel = [...document.querySelectorAll('input[type="tel"]')].filter((e) => e.offsetParent !== null)[0];
    const pw = [...document.querySelectorAll('input[type="password"]')].filter((e) => e.offsetParent !== null)[0];
    if (!tel || !pw) return false;
    set(tel, ${JSON.stringify(PHONE)}); set(pw, ${JSON.stringify(PASS)});
    return true;
  })()`);
  ok('утас + нууц үг бөглөгдөв', filled === true, String(filled));
  await wait(400);
  await evaluate(`(() => { const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Нэвтрэх' && x.offsetParent !== null); if (b) b.click(); return !!b; })()`);
  await wait(6000);
}
const loggedIn = await evaluate(`(() => Object.keys(localStorage).some((k) => k.includes('auth-token')))()`);
ok('нэвтэрсэн (auth-token бий)', loggedIn === true, String(loggedIn));

// ═══════ ② ФОРМ → 💼 Ажлын зар → 3-р алхам (📋 Дэлгэрэнгүй) ═══════
console.log('\n② ФОРМ — /listings/new → 💼 Ажлын зар → 3-р алхам (📋 Дэлгэрэнгүй)');
await rpc('Page.navigate', { url: `${BASE}/listings/new` });
await wait(6500);
const gate = await evaluate(`(() => /нэвтрэх шаардлагатай/i.test(document.body.innerText))()`);
ok('форм нээгдэв (нэвтрэх хаалт БАЙХГҮЙ)', gate === false);
const sec = await evaluate(`(() => { const b = document.querySelector('[data-picker="section"] button[data-picker-value="jobs"]'); if (!b) return 'NO_PICKER'; b.click(); return 'OK'; })()`);
ok('💼 «Ажлын зар» сонгогдов', sec === 'OK', String(sec));
await wait(1500);
const sub = await evaluate(`(() => { const b = document.querySelector('[data-picker="level2"] button[data-picker-value]'); if (!b) return null; b.click(); return b.dataset.pickerValue; })()`);
ok('дэд төрөл сонгогдов', typeof sub === 'string', String(sub));
await wait(2000);

// ⚠️ 1-р алхам (Ангилал) → 2-р алхам (Байршил) → 3-р алхам (Дэлгэрэнгүй)
for (let i = 0; i < 4; i += 1) {
  const step = await evaluate(`(() => { const e = document.querySelector('[data-step-current]'); return e ? e.innerText.trim() : ''; })()`);
  console.log(`   алхам: ${step}`);
  if (/Дэлгэрэнгүй/.test(step)) break;
  /**
   * 🆕 2026-10-05 (🖥 НЭГ УРТ ХУУДАС): 🖥 ≥640px дээр 🪜 wizard-ийн товч
   *    `sm:hidden` болов ⇒ хуучин `x.offsetParent !== null` шалгалт ХЭЗЭЭ Ч
   *    таарахгүй ✗ мөн ТЕКСТЭЭР хайвал 📱 `[data-mobile-detail-next]` руу
   *    андуурна ✗ ⇒ стабил селектор `[data-step-next]` ✓
   */
  const clicked = await evaluate(`(() => { const b = document.querySelector('[data-step-next]'); if (!b) return false; b.click(); return true; })()`);
  console.log(`   «Үргэлжлүүлэх» → ${clicked}`);
  await wait(2500);
}

// ═══════ ③ ЧИП БЛОКУУД ═══════
console.log('\n③ ЧИП ТАЛБАРУУД');
/**
 * 🧪 Чип товч (`[data-attr-field]` → `[data-attr-value]`) + 💰 `<select>` +
 *    гарчгийн талбар — бүгд DOM-оос `aria-pressed`-ээр уншина
 *    ⚠️ `state.attrs` (React fiber) нь ЗӨВХӨН мэдээллийн зорилгоор (④-ийн
 *       poll нь DOM-оор шалгана — commit-ийн хоцролт ✗)
 */
const READ = `(() => {
  const blocks = [...document.querySelectorAll('[data-attr-field]')].map((b) => ({
    key: b.dataset.attrField,
    role: b.getAttribute('role'),
    aria: b.getAttribute('aria-label'),
    cls: b.className,
    chips: [...b.querySelectorAll('[data-attr-value]')].map((c) => ({
      v: c.dataset.attrValue,
      on: c.getAttribute('aria-pressed') === 'true',
      cls: c.className,
      tag: c.tagName,
    })),
  }));
  const el = document.querySelector('[data-attr-field]');
  const fk = el ? Object.keys(el).find((k) => k.startsWith('__reactFiber$')) : null;
  let node = fk ? el[fk] : null;
  let attrs = null;
  while (node && !attrs) {
    let hook = node.memoizedState;
    let i = 0;
    while (hook && i < 80) {
      const s = hook.memoizedState;
      if (s && typeof s === 'object' && !Array.isArray(s) && 'section' in s && 'attrs' in s) { attrs = s.attrs; break; }
      hook = hook.next; i += 1;
    }
    node = node.return;
  }
  return {
    blocks,
    attrs,
    salarySelect: [...document.querySelectorAll('[data-detail-field="attr-salaryType"] select')].length,
    salaryChipBlock: document.querySelectorAll('[data-attr-field="salaryType"]').length,
    detailFields: [...document.querySelectorAll('[data-detail-field]')].map((e) => e.dataset.detailField),
  };
})()`;

let state = await evaluate(READ);
console.log(`   чип блок: ${state.blocks.map((b) => `${b.key}(${b.chips.length})`).join(' · ')}`);
ok('🕒 jobType — чип блок БАЙНА', state.blocks.some((b) => b.key === 'jobType'));
ok('📊 experience — чип блок БАЙНА', state.blocks.some((b) => b.key === 'experience'));
ok('🏷️ advertiser — чип блок БАЙНА', state.blocks.some((b) => b.key === 'advertiser'));
ok('📈 jobLevel — чип блок БАЙНА', state.blocks.some((b) => b.key === 'jobLevel'));
ok('💰 salaryType — чип БИШ (`<select>` хэвээр ✓)', state.salaryChipBlock === 0 && state.salarySelect === 1,
  `chips=${state.salaryChipBlock} selects=${state.salarySelect}`);
const byKey = Object.fromEntries(state.blocks.map((b) => [b.key, b]));
ok('🕒 5 сонголт (Бүтэн…Түр хугацааны)', byKey.jobType?.chips.length === 5,
  JSON.stringify(byKey.jobType?.chips.map((c) => c.v)));
ok('📊 2 сонголт · 🏷️ 3 · 📈 5',
  byKey.experience?.chips.length === 2 && byKey.advertiser?.chips.length === 3 && byKey.jobLevel?.chips.length === 5,
  `${byKey.experience?.chips.length}/${byKey.advertiser?.chips.length}/${byKey.jobLevel?.chips.length}`);
ok('чип бүр `<button>` + `chip-toggle` (sidebar-тай НЭГ CSS)',
  state.blocks.every((b) => b.chips.every((c) => c.tag === 'BUTTON' && /chip-toggle/.test(c.cls))));
ok('блок нь `role="group"` + `aria-label`', state.blocks.every((b) => b.role === 'group' && !!b.aria),
  state.blocks.map((b) => `${b.key}:${b.role}/${b.aria}`).join(' '));
ok('форм дээрх талбарууд хэвээр (5 attr + гарчиг)',
  state.detailFields.filter((f) => f.startsWith('attr-')).length === 5 && state.detailFields.includes('title'),
  state.detailFields.join(','));
ok('анхдагч: бүх чип СОНГООГҮЙ (`aria-pressed=false`)',
  state.blocks.every((b) => b.chips.every((c) => c.on === false)));
ok('`attrs` (React) анхдагч хоосон', state.attrs !== null && Object.keys(state.attrs).length === 0,
  JSON.stringify(state.attrs));

// ═══════ ④ ЧИП ДАРАХ ба ЦУЦЛАХ ═══════
console.log('\n④ ЧИП ДАРАХ ба ЦУЦЛАХ');
const clickChip = (key, value) => evaluate(
  '(() => { const b = document.querySelector(\'[data-attr-field="' + key + '"] [data-attr-value="' + value + '"]\'); if (!b) return "NO_CHIP"; b.click(); return "OK"; })()',
);
ok('📊 «Шаардлагатай» дарав', (await clickChip('experience', 'Шаардлагатай')) === 'OK');
// ⚠️ Чип нь `aria-pressed={value === o}` ба `form.attrs[key] === o` нь НЭГ эх
//    сурвалжтай (`AddListingClient.jsx`) — идэвхтэй чип = state-д утга БИЙ ✓
//    ⚠️ Fiber-ээс `attrs` уншихад commit-ийн 1 алхам хоцролттой тул DOM-оор poll
const activeVals = (st, key) => ((st.blocks.find((b) => b.key === key) || {}).chips || []).filter((c) => c.on).map((c) => c.v);
const pollActive = async (key, want, tries = 8) => {
  for (let i = 0; i < tries; i += 1) {
    state = await evaluate(READ);
    if (JSON.stringify(activeVals(state, key)) === JSON.stringify(want)) return state;
    await wait(350);
  }
  return null;
};
state = await pollActive('experience', ['Шаардлагатай']);
ok('📊 чип идэвхтэй (`aria-pressed=true` + `chip-toggle-active`)', state !== null
  && byKeyState(state, 'experience', 'Шаардлагатай').on === true
  && /chip-toggle-active/.test(byKeyState(state, 'experience', 'Шаардлагатай').cls),
  JSON.stringify(state ? activeVals(state, 'experience') : null));
ok('📊 блок доторх БУСАД чип идэвхгүй (mutual exclusive)', state !== null
  && activeVals(state, 'experience').length === 1
  && byKeyState(state, 'experience', 'Шаардлагагүй').on === false);
console.log('   (мэдээлэл) `form.attrs` fiber уншилт: ' + JSON.stringify(state?.attrs));

ok('🕒 «Бүтэн цагийн» дарав', (await clickChip('jobType', 'Бүтэн цагийн')) === 'OK');
await wait(300);
ok('📈 «Мэргэжилтэн» дарав', (await clickChip('jobLevel', 'Мэргэжилтэн')) === 'OK');
await wait(300);
ok('🏷️ «Хувь хүн» дарав', (await clickChip('advertiser', 'Хувь хүн')) === 'OK');
state = await pollActive('experience', ['Шаардлагатай']);
state = await pollActive('jobType', ['Бүтэн цагийн']);
state = await pollActive('jobLevel', ['Мэргэжилтэн']);
state = await pollActive('advertiser', ['Хувь хүн']);
ok('блок бүрд ЯГ 1 идэвхтэй (mutual exclusive)',
  [['jobType', 'Бүтэн цагийн'], ['experience', 'Шаардлагатай'], ['advertiser', 'Хувь хүн'], ['jobLevel', 'Мэргэжилтэн']]
    .every(([k, v]) => JSON.stringify(activeVals(state, k)) === JSON.stringify([v])),
  JSON.stringify(state.blocks.map((b) => `${b.key}:${activeVals(state, b.key)}`)));

// 💰 `<select>` нь ХЭВЭЭР ажиллана (ижил `attrs.salaryType` руу) — controlled тул
//    React хүлээж аваагүй бол DOM утга нь эргэж ХООСОН болно ✓
const salarySet = await evaluate(`(() => {
  const s = document.querySelector('[data-detail-field="attr-salaryType"] select');
  if (!s) return 'NO_SELECT';
  const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  set.call(s, 'Хэлбэлзэх'); s.dispatchEvent(new Event('change', { bubbles: true }));
  return 'OK';
})()`);
await wait(800);
const salaryNow = await evaluate(`(() => { const s = document.querySelector('[data-detail-field="attr-salaryType"] select'); return s ? s.value : null; })()`);
ok('💰 `<select>` сонголт хэвээр (controlled → React хүлээж авав)', salarySet === 'OK' && salaryNow === 'Хэлбэлзэх',
  salarySet + ' value=' + JSON.stringify(salaryNow));

// 🔁 дахин дарвал ЦУЦЛАГДАНА (toggle-off) — JSON түлхүүр нь `delete` хийнэ ✓
await clickChip('experience', 'Шаардлагатай');
const cleared = await pollActive('experience', []);
ok('📊 идэвхтэй чип дээр дахин дарвал ЦУЦЛАГДАНА (бүх чип идэвхгүй)',
  cleared !== null && activeVals(cleared, 'experience').length === 0
    && cleared.blocks.find((b) => b.key === 'experience').chips.length === 2
    && cleared.blocks.find((b) => b.key === 'experience').chips.every((c) => !c.on),
  JSON.stringify(activeVals(cleared, 'experience')));
ok('📊 ЦУЦЛАХ нь БУСАД талбарыг ХӨНДӨӨГҮЙ (3 чип + 💰 select хэвээр)',
  cleared !== null
    && ['jobType', 'jobLevel', 'advertiser'].every((k) => activeVals(cleared, k).length === 1)
    && (await evaluate(`(() => { const s = document.querySelector('[data-detail-field="attr-salaryType"] select'); return s ? s.value : null; })()`)) === 'Хэлбэлзэх',
  JSON.stringify(cleared ? cleared.blocks.map((b) => `${b.key}:${activeVals(cleared, b.key)}`) : null));

// ═══════ ④b ЗАСАХ ГОРИМ — миний зар → чипүүд УРЬДЧИЛАН сонгогдсон эсэх ═══════
// ⚠️ Засах горимд утга нь DB-ээс (`attrs`) ирдэг тул чипүүд нь `defaultValue`
//    биш, `form.attrs`-аас УРЬДЧИЛАН сонгогдох ёстой ✓ (демо хэрэглэгчид
//    💼 АЖЛЫН ЗАР байхгүй бол алгасна — бусад шалгалт хэвээр ✓)
console.log('\n④b ЗАСАХ ГОРИМ — миний зар → чипууд урьдчилан сонгогдсон эсэх');
await rpc('Page.navigate', { url: `${BASE}/my-listings` });
let cands = [];
for (let i = 0; i < 10; i += 1) {
  await wait(1200);
  cands = await evaluate(`(() => {
    const out = [];
    [...document.querySelectorAll('a[href]')].forEach((a) => {
      const m = a.getAttribute('href').match(/\\/listings\\/([0-9a-f-]{36})/);
      if (!m || out.some((o) => o.id === m[1])) return;
      // ⚠️ Зөвхөн ХАМГИЙН ОЙРЫН (эхний) агуулагч — өвөг рүү 6 хүртэл авирвал
      //    БҮХ ХУУДСНЫ текст уншигдаж, картыг таних боломжгүй болно ✗
      const own = (a.innerText || '').trim();
      let el = a;
      let text = own;
      for (let k = 0; k < 6 && el; k += 1) {
        el = el.parentElement;
        if (!el) break;
        const t = (el.innerText || '').trim();
        if (t.length > own.length) { text = t; break; }
      }
      out.push({ id: m[1], text: text.replace(/\\n/g, ' | ').slice(0, 120) });
    });
    return out;
  })()`);
  if (cands.length) break;
}
console.log(`   миний зарууд (${cands.length}): ${cands.map((c) => c.id.slice(0, 8) + '=' + c.text.slice(0, 40)).join(' ;; ')}`);
// ⚠️ 💼 АЖЛЫН ЗАР хэрэгтэй — ЗӨВХӨН тэр хэсэгт 🕒/📊/🏷️/📈 чип байдаг (бусад
//    хэсэгт `<select>`) тул эхлээд КАРТЫН текшээр, олдохгүй бол ДЭЛГЭРЭНГҮЙ
//    хуудсаар («🕒 Ажлын цаг» мөр) шалгана ✓
let job = cands.find((c) => /💼|Ажлын зар|Ажилд авна/.test(c.text)) || null;
if (!job) {
  // ⚠️ ХУРД: картын текст нь ХЭСГИЙГ тодорхой харуулдаг (🏢 Орон сууц, 🚗 Автомашин…)
  //    ⇒ ЗӨВХӨН текст нь УНШИГДААГҮЙ (хоосон/богино — эвдэрсэн карт) кандидуудыг
  //    дэлгэрэнгүй хуудсаар нээж шалгана (10 × 4.5с дэмий хүлээхгүй ✓)
  const unsure = cands.slice(0, 10).filter((c) => c.text.replace(/[^\p{L}]/gu, '').length < 6);
  if (unsure.length < Math.min(cands.length, 10)) {
    console.log(`   ℹ️ картын текст уншигдсан ⇒ ${Math.min(cands.length, 10) - unsure.length} зарыг хэсгээр нь шууд дүгнэв (нэмэлт нээлт ${unsure.length})`);
  }
  for (const c of unsure) {
    await rpc('Page.navigate', { url: `${BASE}/listings/${c.id}` });
    await wait(4500);
    const t = await evaluate(`(() => document.body.innerText)()`);
    if (/🕒 Ажлын цаг/.test(t)) { job = c; break; }
  }
}
if (!job) {
  console.log('   ⚠️ миний зарууд дунд АЖЛЫН ЗАР байхгүй — ④b АЛГАСАВ (③/④/⑤/⑥ ✓)');
} else {
  const listId = job.id;
  console.log(`   💼 ажлын зар: ${listId}`);
  // 📄 Дэлгэрэнгүй хуудасны утгууд (DB-ийн бодит утга) — формойн чиптэй ХАРЬЦУУЛНА
  await rpc('Page.navigate', { url: `${BASE}/listings/${listId}` });
  await wait(6000);
  const pubText = await evaluate(`(() => document.body.innerText)()`);
  const pubNav = await evaluate(`(() => location.href)()`);
  await rpc('Page.navigate', { url: `${BASE}/listings/new?edit=${listId}&step=3` });
  let ed = null;
  for (let i = 0; i < 12; i += 1) {
    await wait(1200);
    ed = await evaluate(READ);
    if (ed.blocks.length >= 4) break;
  }
  const edActive = {};
  ed.blocks.forEach((b) => { if (b.key) edActive[b.key] = activeVals(ed, b.key)[0] || ''; });
  const edSalary = await evaluate(`(() => { const s = document.querySelector('[data-detail-field="attr-salaryType"] select'); return s ? s.value : ''; })()`);
  console.log('   хуудас: ' + pubNav);
  console.log('   формо дээрх чипүүд: ' + JSON.stringify(edActive) + ' 💰select=' + JSON.stringify(edSalary));
  ok('засах горим: 4 чип блок хэвээр (форм зөв нээгдэв)', ed.blocks.length === 4,
    ed.blocks.map((b) => b.key).join(','));
  ok('засах горим: ДОР ХАЯЖ 1 чип (🕒 jobType) урьдчилан сонгогдсон',
    !!edActive.jobType, JSON.stringify(edActive));
  ok('засах горим: сонгогдсон чипүүд зарын ДЭЛГЭРЭНГҮЙ хуудсан дээрх утгатай ИЖИЛ (DB → форм ✓)',
    Object.values(edActive).filter(Boolean).length > 0
      && Object.values(edActive).filter(Boolean).every((v) => pubText.includes(v)),
    'форм=' + JSON.stringify(Object.entries(edActive).filter(([, v]) => v))
      + ' · дэлгэрэнгүй=' + JSON.stringify(pubText.replace(/\n/g, '|').slice(0, 160)));
  if (edSalary) {
    ok('засах горим: 💰 `<select>` (salaryType) ч урьдчилан сонгогдсон', pubText.includes(edSalary),
      'select=' + edSalary);
  }
}
{
  // ⚠️ ⑤ 📱 мобайл тест ЦЭВЭР ШИНЭ формоор явна (засах горимд «гарчиг» ЗААВАЛ БИШ)
  /**
   * 🆕 2026-10-06 (16) FLAKY ЗАСВАР: форм нь өмнөх ажиллагаанаас үлдсэн НООРОГ
   *    (`zar:listing-draft:<uid>` — `mobileDetailStep`-ийг ч хадгална) байвал
   *    МОБАЙЛ алхмыг ТЭНДЭЭС эхлүүлнэ ⇒ зөвхөн `jobLevel` дэлгэц харагдаж
   *    «4 талбар БҮГД» шалгалт УНАВ ✗ (лог: `дэлгэц=14`, `seen={jobLevel}`).
   *    ⏳ Эхний ажиллагаанд `seen={jobType}` байсан — өөрөөр хэлбэл шинэ форм
   *    ШИНЭ байх ЁСТОЙ ⇒ эхлэхээсээ ӨМНӨ нооргийг ЦЭВЭРЛЭНЭ ✓
   *    ⚠️ Хоёр удаа цэвэрлэнэ: ① navigation-ы өмнө ② форм mount хийсний ДАРАА
   *    (⏳ debounce-тай бичилт navigation-ы завсарт үлдэж болзошгүй ✓)
   */
  const clearDraft = () => evaluate(`(() => {
    const keys = Object.keys(window.localStorage).filter((k) => k.startsWith('zar:listing-draft'));
    keys.forEach((k) => window.localStorage.removeItem(k));
    return keys.length;
  })()`);
  const droppedBefore = await clearDraft();
  await rpc('Page.navigate', { url: `${BASE}/listings/new` });
  await wait(6000);
  const droppedAfter = await clearDraft();
  console.log('   🧹 ноорог цэвэрлэв: ' + droppedBefore + ' → ' + droppedAfter + ' (шинэ форм ⇒ мобайл алхам №1)');
  await evaluate(`(() => { const b = document.querySelector('[data-picker="section"] [data-picker-value="jobs"]'); if (b) b.click(); return !!b; })()`);
  await wait(1200);
  await evaluate(`(() => { const b = document.querySelector('[data-picker="level2"] [data-picker-value]'); if (b) b.click(); return !!b; })()`);
  await wait(1800);
  for (let i = 0; i < 4; i += 1) {
    const has = await evaluate(`(() => document.querySelectorAll('[data-attr-field]').length)()`);
    if (has >= 4) break;
    await evaluate(`(() => { const t = [...document.querySelectorAll('button')].find((x) => /Үргэлжлүүлэх/.test(x.innerText) && x.offsetParent !== null); if (t) t.click(); return !!t; })()`);
    await wait(2500);
  }
  console.log('   ↻ шинэ форм бэлэн: чип блок = ' + await evaluate(`(() => document.querySelectorAll('[data-attr-field]').length)()`));
}

// ═══════ ⑤ 📱 МОБАЙЛ 390px (дрилл-даун: НЭГ ДЭЛГЭЦЭД НЭГ ТАЛБАР) ═══════
console.log('\n⑤ 📱 МОБАЙЛ 390px — чипүүд харагдах / overflow');
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await wait(2500);
// ⚠️ 📱 мобайлд 3-р алхмын ЭХНИЙ дэлгэц = «Зарын гарчиг» (ЗААВАЛ) — бөглөхгүй
//    бол `[data-mobile-detail-next]` ХӨДӨЛӨХГҮЙ (дараагийн дэлгэц рүү явахгүй ✗)
const titleFilled = await evaluate(`(() => {
  const inp = document.querySelector('[data-detail-field="title"] input:not([type]), [data-detail-field="title"] input[type="text"]');
  if (!inp) return false;
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  set.call(inp, '🧪 CDP тест ажлын зар');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
})()`);
console.log('   гарчиг бөглөв: ' + titleFilled);
const seen = new Set();
let mobInfo = null;
let screens = 0;
for (let i = 0; i < 14; i += 1) {
  screens = i + 1;
  const r = await evaluate(`(() => {
    const vis = [...document.querySelectorAll('[data-attr-field]')].filter((b) => b.offsetParent !== null);
    const b = vis[0];
    return {
      keys: vis.map((x) => x.dataset.attrField),
      chips: b ? [...b.querySelectorAll('[data-attr-value]')].filter((c) => c.getBoundingClientRect().width > 0).length : 0,
      wrap: b ? getComputedStyle(b).flexWrap : '',
      docW: document.documentElement.scrollWidth,
      vw: window.innerWidth,
    };
  })()`);
  r.keys.forEach((k) => seen.add(k));
  if (!mobInfo && r.keys.length) mobInfo = r;
  if (seen.size >= 4) break;
  const adv = await evaluate(`(() => {
    const b = document.querySelector('[data-mobile-detail-next]');
    if (b && b.offsetParent !== null) { b.click(); return 'MOBILE_NEXT'; }
    const t = [...document.querySelectorAll('button')].find((x) => /Үргэлжлүүлэх/.test(x.innerText) && x.offsetParent !== null);
    if (t) { t.click(); return 'TEXT'; }
    return false;
  })()`);
  if (!adv) break;
  await wait(900);
}
console.log('   ' + JSON.stringify(mobInfo) + ' дэлгэц=' + screens);
ok('📱 мобайл: 4 чип талбар БҮГД харагдана (нэг дэлгэцэд нэг)', seen.size === 4, [...seen].join(','));
ok('📱 чипүүд харагдана (өргөн>0) + flex-wrap', !!mobInfo && mobInfo.chips > 0 && mobInfo.wrap === 'wrap',
  JSON.stringify(mobInfo));
ok('📱 хэвтээ гүйлт (overflow) ГАРАХГҮЙ', !!mobInfo && mobInfo.docW <= mobInfo.vw + 1,
  JSON.stringify(mobInfo));
// 🖥 Десктоп метрик руу БУЦААНА (headless-ийн анхдагч 800px дээр sidebar ХААГДАНА ✗)
await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
await wait(800);

// ═══════ ⑥ ДЭЛГЭРЭНГҮЙ ХАЙЛТ (сайдбар) — pill БИШ (2026-10-06 (17)) ═══════
// 🆕 2026-10-06 (17) (хэрэглэгчийн хүсэлт: «Ажлын зарын Ажлын цаг, Туршлага,
//    Мэргэжлийн түвшин -ийг бас Дэлгэрэнгүй хайлт д оруул»): ⏳ 2026-10-05 (42)-д
//    3 шүүлт нь үр дүнгийн дээрх `#filter-bar` pill байв ✗ ⇒ ОДОО сайдбарт
//    БУЦАВ («🛏 Өрөөний тоо»/«💳 Төлбөрийн нөхцөл»-тэй ЯГ ИЖИЛ чип блок):
//    `aside [data-attr-filter="jobType"]` (+ experience, jobLevel), дотор нь
//    `chip-toggle` чипүүд (`data-attr-multi="true"`), «N сонгосон» + «✕ Цуцлах».
//    ⚠️ jobs дээр `#filter-bar` ОГТ БАЙХГҮЙ (pill тугтай attr байхгүй ✓)
//    ⚠️ Утга/URL/DB ХӨНДӨӨГДӨӨГҮЙ: `?attr_jobType=A,B` → `attrs->>jobType=in.(…)` ✓
console.log('\n⑥ ДЭЛГЭРЭНГҮЙ ХАЙЛТ — /?section=jobs&type=… (3 чип блок, pill БАЙХГҮЙ)');
const SIDE_URL = BASE + '/?section=jobs&type=' + encodeURIComponent('Борлуулалт, худалдаа');
await rpc('Page.navigate', { url: SIDE_URL });
let side = '';
for (let i = 0; i < 12; i += 1) {
  await wait(1500);
  side = await evaluate(`(() => { const a = document.querySelector('aside'); return a ? a.innerText : ''; })()`);
  if (/Цалин, ₮/.test(side)) break;
}
console.log('   aside=' + JSON.stringify(side.replace(/\n/g, ' | ').slice(0, 300)));
ok('sidebar: «Цалин, ₮» байна', /Цалин, ₮/.test(side));

// ═══════ ⑥⓪ 🆕 2026-10-06 (18): ХУРААГДДАГ ЧИП БЛОК (accordion) ═══════
/**
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Энэ дэлгэрэнгүй дотор байгаа Ажлын цаг [гэх мэт]
 *   сонголт чинь хураагдаж болдоггүй юм уу, их зай эзлээд лалрын байна».
 *
 * ⚠️ ДҮРЭМ (`lib/locationData.js → SIDEBAR_CHIP_COLLAPSE_MIN` = 5):
 *    ① 5 ба түүнээс олон сонголттой чип блок нь АНХДАГЧААР ХУРААСАН
 *       (`aria-expanded="false"`) — 💼 дээр 🕒 «Ажлын цаг» (5) ба
 *       📈 «Мэргэжлийн түвшин» (5); 📊 «Туршлага» (2) нь НЭЭЛТТЭЙ ✓
 *    ② Идэвхтэй (сонгосон) утгатай блок АВТОМАТААР НЭЭЛТТЭЙ — шүүлт нь
 *       ДАЛД үлдэхгүй (§⑥d ✓)
 *    ③ Хураасан ч чипүүд DOM-д ХЭВЭЭР (зөвхөн `hidden` класс) ⇒ дэгээнүүд
 *       (`data-attr-value`, `aria-pressed`) ХЭВЭЭР; «Бүгдийг нээх/Хураах»
 *       товч (`data-side-toggle-all`) нэг даралтаар БҮГДИЙГ нээнэ ✓
 *    ⚠️ Утга/URL/DB ХӨНДӨӨГДӨӨГҮЙ — зөвхөн ХАРАГДАЦ (хаах/нээх) ✓
 */
console.log('\n⑥⓪ ХУРААГДДАГ ЧИП БЛОК — анхдагч төлөв + «Бүгдийг нээх»');
/** Блок бүрийн толгой + хайрцгийн төлөв (координатгүй — зөвхөн DOM) */
const accordionUi = () => evaluate(`(() => {
  const heads = [...document.querySelectorAll('aside [data-side-collapse]')];
  const box = document.querySelector('aside [data-attr-filter="jobType"]');
  const tgl = document.querySelector('aside [data-side-toggle-all]');
  const aside = document.querySelector('aside');
  return {
    keys: heads.map((h) => h.getAttribute('data-side-collapse')),
    expanded: heads.map((h) => h.getAttribute('aria-expanded')),
    headText: heads.map((h) => h.textContent.trim()),
    toggleLabel: tgl ? tgl.textContent.trim() : null,
    togglePressed: tgl ? tgl.getAttribute('aria-pressed') : null,
    chipsInDom: box ? box.querySelectorAll('[data-attr-value]').length : -1,
    boxH: box ? Math.round(box.getBoundingClientRect().height) : -1,
    asideH: aside ? Math.round(aside.getBoundingClientRect().height) : -1,
  };
})()`);
const acc0 = await accordionUi();
ok('🆕 (18) 3 чип блок ХУРААГДДАХ боломжтой (`[data-side-collapse]` = jobType/experience/jobLevel)',
  JSON.stringify(acc0.keys) === JSON.stringify(['jobType', 'experience', 'jobLevel']),
  JSON.stringify(acc0.keys));
ok('🆕 (18) 5 сонголттой 🕒/📈 АНХДАГЧААР ХУРААСАН · 📊 «Туршлага» (2) НЭЭЛТТЭЙ',
  JSON.stringify(acc0.expanded) === JSON.stringify(['false', 'true', 'false']),
  JSON.stringify(acc0.expanded));
ok('🆕 (18) ХУРААСАН ч чипүүд DOM-д ХЭВЭЭР (`[data-attr-value]` = 5) ч ХАРАГДАХ өндөр 0',
  acc0.chipsInDom === 5 && acc0.boxH === 0, `chips=${acc0.chipsInDom} h=${acc0.boxH}`);
ok('🆕 (18) толгойд «Бүгдийг нээх» товч (`[data-side-toggle-all]` — 1 товч, 2 үүрэг ✓)',
  acc0.toggleLabel === 'Бүгдийг нээх' && acc0.togglePressed === 'false',
  `${acc0.toggleLabel} / ${acc0.togglePressed}`);

const toggleAllRes = await evaluate(`(() => {
  const b = document.querySelector('aside [data-side-toggle-all]');
  if (!b) return 'NO_BTN';
  b.click();
  return 'OK';
})()`);
await wait(800);
const acc1 = await accordionUi();
ok('🆕 (18) «Бүгдийг нээх» → БҮХ 3 блок `aria-expanded=true` + чипүүд ХАРАГДАВ (өндөр > 0)',
  toggleAllRes === 'OK' && JSON.stringify(acc1.expanded) === JSON.stringify(['true', 'true', 'true'])
    && acc1.boxH > 0, `${toggleAllRes} ${JSON.stringify(acc1.expanded)} h=${acc1.boxH}`);
ok('🆕 (18) нээхэд sidebar-ийн өндөр НЭМЭГДЭВ (хураасан нь ЗАЙ ХЭМНЭЖ байна ✓)',
  acc1.asideH > acc0.asideH, `asideH ${acc0.asideH} → ${acc1.asideH}`);
ok('🆕 (18) товч «Хураах» болов (`aria-pressed=true`)',
  acc1.toggleLabel === 'Хураах' && acc1.togglePressed === 'true',
  `${acc1.toggleLabel} / ${acc1.togglePressed}`);
/** 🆕 (17)-ийн шалгалт нь чипүүд ХАРАГДАЖ байхыг шаардана ⇒ `side`-ийг ШИНЭЧИЛНЭ */
side = await evaluate(`(() => { const a = document.querySelector('aside'); return a ? a.innerText : ''; })()`);
ok('🆕 (17) sidebar: 🕒/📊/📈 шүүлт БУЦАЖ ИРЭВ (шошго + «Бүтэн цагийн» чип харагдана)',
  /Ажлын цаг/.test(side) && /Туршлага/.test(side) && /Мэргэжлийн түвшин/.test(side)
    && /Бүтэн цагийн/.test(side));
/** 🆕 (17): `#filter-bar` + `aside` + форм блок бүгдийг НЭГ удаа уншина */
const sideInfo = await evaluate(`(() => {
  const all = (sel) => [...document.querySelectorAll(sel)];
  const block = (k) => {
    const b = document.querySelector('aside [data-attr-filter="' + k + '"]');
    if (!b) return { found: false };
    const box = b.closest('div[class*="py-4"]');
    const s = box ? box.querySelector('span') : null;
    return {
      found: true,
      multi: b.dataset.attrMulti === 'true',
      role: b.getAttribute('role'),
      chips: b.querySelectorAll('[data-attr-value]').length,
      selects: b.querySelectorAll('select').length,
      label: s ? s.textContent.trim() : '',
    };
  };
  const top = (sel) => { const el = document.querySelector(sel); if (!el) return -1; return Math.round(el.getBoundingClientRect().top + window.scrollY); };
  const bar = document.querySelector('#filter-bar');
  const results = document.querySelector('#listing-results');
  const price = [...document.querySelectorAll('aside span')].find((s) => s.textContent.trim() === 'Цалин, ₮');
  const jt = document.querySelector('aside [data-attr-filter="jobType"]');
  return {
    bar: !!document.querySelector('#filter-bar[data-filter-bar]'),
    barInResults: !!(bar && results && results.contains(bar)),
    jobType: block('jobType'), experience: block('experience'), jobLevel: block('jobLevel'),
    asideKeys: all('aside [data-attr-filter]').map((x) => x.dataset.attrFilter),
    chips: all('aside [data-attr-filter] .chip-toggle').length,
    asideSelects: all('aside select').length,
    formBlocks: all('[data-attr-field]').length,
    priceTop: price ? Math.round(price.getBoundingClientRect().top + window.scrollY) : -1,
    jobTypeTop: top('aside [data-attr-filter="jobType"]'),
    afterPrice: !!(price && jt
      && (price.compareDocumentPosition(jt) & Node.DOCUMENT_POSITION_FOLLOWING)),
  };
})()`);
console.log('   ' + JSON.stringify(sideInfo));
ok('⛔ (17) jobs дээр `#filter-bar` БАЙХГҮЙ (pill тугтай attr 0 — 💻-ийн 4 pill л үлдэв ✓)',
  sideInfo.bar === false && sideInfo.barInResults === false, String(sideInfo.bar));
ok('🆕 (17) сайдбарт ЯГ 3 чип блок (`jobType` → `experience` → `jobLevel`) — ⛔ сайдбарт `<select>` 0',
  JSON.stringify(sideInfo.asideKeys) === JSON.stringify(['jobType', 'experience', 'jobLevel'])
    && sideInfo.asideSelects === 0,
  JSON.stringify(sideInfo.asideKeys) + ' select=' + sideInfo.asideSelects);
ok('🆕 (17) блок бүр `<div role="group">` + `data-attr-multi="true"` + шошго нь ЛИБЭЭС',
  [sideInfo.jobType, sideInfo.experience, sideInfo.jobLevel].every((b) => b.found && b.multi && b.role === 'group')
    && sideInfo.jobType.label === 'Ажлын цаг' && sideInfo.experience.label === 'Туршлага'
    && sideInfo.jobLevel.label === 'Мэргэжлийн түвшин',
  JSON.stringify([sideInfo.jobType, sideInfo.experience, sideInfo.jobLevel]));
ok('🆕 (17) чипүүд нь ЯГ 3 блокт (12 = 5+2+5) · 🕒/📊/📈 дотор `<select>` 0',
  sideInfo.chips === 12 && sideInfo.jobType.chips === 5
    && sideInfo.experience.chips === 2 && sideInfo.jobLevel.chips === 5
    && [sideInfo.jobType, sideInfo.experience, sideInfo.jobLevel].every((b) => b.selects === 0),
  `${sideInfo.chips}`);
ok('🧭 (17) Байрлал: «💰 Цалин, ₮» блокийн ЯГ ДАРАА (💼-ийн ҮНЭ нь attr шүүлтийн ӨМНӨ ✓)',
  sideInfo.afterPrice === true && sideInfo.priceTop >= 0 && sideInfo.jobTypeTop > sideInfo.priceTop,
  `price=${sideInfo.priceTop} jobType=${sideInfo.jobTypeTop} after=${sideInfo.afterPrice}`);
ok('⛔ форм блок (`data-attr-field`) хайлтын хуудсан дээр 0 (формтой холилдоогүй ✓)',
  sideInfo.formBlocks === 0, String(sideInfo.formBlocks));

// ═══════ ⑥b САЙДБАРЫН ЧИП — ОЛОН СОНГОЛТ (`?attr_jobType=A,B`) ═══════
// 🎯 Гол шаардлага: «Ажлын цаг, Туршлага, Мэргэжлийн түвшиныг Өрөөний тоо шиг
//    болго» ⇒ 2 чип ЗЭРЭГ идэвхжинэ (`?attr_jobType=A,B`) — ⛔ хуучин нэг
//    сонголттой зан төлөв (шинэ чип дарвал хуучин нь УНТРАХ) БАЙХГҮЙ ✓
// 🆕 (17): pill НЭЭХ шаардлагагүй — чипүүд сайдбарт ШУУД харагдана ✓
// ⚠️ React-ийн `onClick` нь programmatic `.click()`-д ч ажиллана ✓
console.log('\n⑥b САЙДБАРЫН ЧИП — дарах ⇒ ОЛОН утга (`?attr_jobType=A,B`)');
/** Сайдбарын чип (`aside [data-attr-filter] [data-attr-value]`) дарна */
const sideChip = (key, value) => evaluate(
  '(() => { const b = document.querySelector(\'aside [data-attr-filter="' + key + '"] [data-attr-value="' + value + '"]\'); if (!b) return "NO_CHIP"; b.click(); return "OK"; })()',
);
/** 3 блок + URL-ыг уншина (`+` → зай: URLSearchParams нь зайг `+` болгодог тул
 *  `?attr_jobType=Бүтэн+цагийн` — ⚠️ түүнгүй бол regex ХУУРАМЧ ✗) */
const sideRead = () => evaluate(`(() => {
  const read = (k) => {
    const box = document.querySelector('aside [data-attr-filter="' + k + '"]');
    if (!box) return null;
    const block = box.closest('div[class*="py-4"]');
    const txt = block ? block.innerText : '';
    const m = txt.match(/(\\d+)\\s+сонгосон/);
    return {
      active: [...box.querySelectorAll('[data-attr-value]')]
        .filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.attrValue),
      count: m ? Number(m[1]) : 0,
      clear: /Цуцлах/.test(txt),
    };
  };
  return {
    jobType: read('jobType'), experience: read('experience'), jobLevel: read('jobLevel'),
    url: decodeURIComponent(location.search).replace(/\\+/g, ' '),
  };
})()`);

ok('🕒 «Бүтэн цагийн» дарав (сайдбарын чип)', (await sideChip('jobType', 'Бүтэн цагийн')) === 'OK');
await wait(1200);
let sw = await sideRead();
ok('🕒 1 идэвхтэй чип + «1 сонгосон» + «✕ Цуцлах» + URL `attr_jobType=Бүтэн цагийн`',
  sw.jobType.active.length === 1 && sw.jobType.active[0] === 'Бүтэн цагийн'
    && sw.jobType.count === 1 && sw.jobType.clear
    && /attr_jobType=Бүтэн цагийн(&|$)/.test(sw.url), JSON.stringify(sw));

ok('🕒 «Цагийн» дарав (2 дахь — ОЛОН СОНГОЛТ)', (await sideChip('jobType', 'Цагийн')) === 'OK');
await wait(1200);
sw = await sideRead();
ok('🆕 🕒 2 чип ЗЭРЭГ идэвхтэй (⛔ хуучин нь УНТРАХГҮЙ) + «2 сонгосон» + URL `attr_jobType=Бүтэн цагийн,Цагийн`',
  sw.jobType.active.length === 2
    && ['Бүтэн цагийн', 'Цагийн'].every((v) => sw.jobType.active.includes(v))
    && sw.jobType.count === 2
    && /attr_jobType=Бүтэн цагийн,Цагийн(&|$)/.test(sw.url), JSON.stringify(sw));

ok('🕒 идэвхтэй чип дээр дахин дарав (toggle-off)', (await sideChip('jobType', 'Бүтэн цагийн')) === 'OK');
await wait(1200);
sw = await sideRead();
ok('🕒 ЗӨВХӨН тэр чип унав (2→1, бусдыг ХӨНДӨӨГҮЙ) + «1 сонгосон»',
  JSON.stringify(sw.jobType.active) === JSON.stringify(['Цагийн']) && sw.jobType.count === 1
    && /attr_jobType=Цагийн(&|$)/.test(sw.url), JSON.stringify(sw));

/** 🆕 (17): сайдбарын блокын «✕ Цуцлах» товчийг дарна */
const clearClicked = await evaluate(`(() => {
  const box = document.querySelector('aside [data-attr-filter="jobType"]');
  const block = box && box.closest('div[class*="py-4"]');
  const b = block && [...block.querySelectorAll('button')].find((x) => /Цуцлах/.test(x.innerText));
  if (!b) return 'NO_CLEAR';
  b.click(); return 'OK';
})()`);
await wait(1200);
sw = await sideRead();
ok('🕒 «✕ Цуцлах» → БҮХ чип идэвхгүй + «N сонгосон»/товч ГАРСАН + URL-ээс `attr_jobType` АРИЛСАН',
  clearClicked === 'OK' && sw.jobType.active.length === 0 && sw.jobType.count === 0
    && !sw.jobType.clear
    && !/attr_jobType/.test(sw.url), `${clearClicked} ${JSON.stringify(sw)}`);
ok('⛔ 📊/📈 ХӨНДӨГДӨӨГҮЙ (0 идэвхтэй, URL-д тэдгээрийн түлхүүр БАЙХГҮЙ)',
  sw.experience.active.length === 0 && sw.jobLevel.active.length === 0
    && !/attr_experience|attr_jobLevel/.test(sw.url), JSON.stringify(sw));

// 📊 Туршлага ч мөн ИЖИЛ (1 блок = 2 утга) — тусдаа механизм биш, НЭГ ✓
ok('📊 «Шаардлагагүй» дарав', (await sideChip('experience', 'Шаардлагагүй')) === 'OK');
await wait(1000);
ok('📊 «Шаардлагатай» дарав (2 утга ЗЭРЭГ — 📈 ч хөндөгдөхгүй)',
  (await sideChip('experience', 'Шаардлагатай')) === 'OK');
await wait(1200);
sw = await sideRead();
ok('📊 2 сонголт + «2 сонгосон» + URL `attr_experience=Шаардлагагүй,Шаардлагатай` (📈 хэвээр 0)',
  sw.experience.active.length === 2 && sw.experience.count === 2
    && /attr_experience=Шаардлагагүй,Шаардлагатай(&|$)/.test(sw.url)
    && sw.jobLevel.active.length === 0 && sw.jobType.active.length === 0, JSON.stringify(sw));


// ═══════ ⑥c HOVER — САЙДБАРЫН ЧИП (2026-10-06 (16)-ийн залгамж) ═══════
/**
 * ⏳ 2026-10-06 (16)-д энэ шалгалт `#filter-bar` pill-ийн hover байв ✗ —
 *    🆕 2026-10-06 (17)-д 💼-ийн 3 шүүлт САЙДБАРТ буцсан тул pill БАЙХГҮЙ ⇒
 *    шалгалт нь САЙДБАРЫН `chip-toggle` чип рүү шилжив ✓ (⚠️ 💻 pill-ийн hover
 *    нь `scripts/cdp-notebook-specs.mjs` §⑧b-д ХЭВЭЭР түгжигдсэн ✓).
 * ① Хэвийн чип: хүрээ `border-gray-200` (#E9E4D9 = rgb(233, 228, 217)) + текст
 *    `text-gray-600` (#5D5747 = rgb(93, 87, 71)) — `app/globals.css → .chip-toggle`
 *    (⚠️ `tailwind.config.js` нь `gray-*`-г ДУЛААН палитр руу сольсон ✓)
 * ② HOVER: 🆕 `hover:border-primary/60` (rgba(37, 99, 235, 0.6)) +
 *    `hover:text-primary` (rgb(37, 99, 235)) ✓
 * ③ ИДЭВХТЭЙ чип (`.chip-toggle-active`): `bg-primary` (rgb(37, 99, 235)) +
 *    `text-white` — hover-д текст ЦАГААН хэвээр (`hover:text-white` ✓)
 * ⚠️ ХЭМЖИЛТ нь БОДИТ хулганаар: `Input.dispatchMouseEvent(mouseMoved)` ⇒
 *    `:hover` pseudo-class ⇒ `getComputedStyle()` ✓
 * ⚠️ Зайлуулах цэг нь ЭЭЛЖЛЭН эргэлддэг (`AWAY`) — Chrome ижил цэг рүү дахин
 *    `mouseMoved` илгээхэд hit-test-ийг ДАХИН ХИЙХГҮЙ (2026-10-06 (16) flake ✓)
 */
const lum = (css) => {
  const m = /rgba?\(([^)]+)\)/.exec(css || '');
  if (!m) return null;
  const p = m[1].split(/[,/]/).map((x) => Number(x.trim()));
  const a = p.length > 3 ? p[3] : 1;
  /** ⚠️ rgba (alpha < 1) үед ЦАГААН дэвсгэр дээр буулгаж тооцно */
  const mix = (c) => c * a + 255 * (1 - a);
  const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(mix(p[0])) + 0.7152 * f(mix(p[1])) + 0.0722 * f(mix(p[2]));
};
/** Сайдбарын чипийн хэв + ДЭЛГЭЦ дээрх төв цэг (⚠️ координат нь viewport-той) */
const chipProbe = (value) => evaluate(`(() => {
  const b = document.querySelector('aside [data-attr-value="' + ${JSON.stringify(value)} + '"]');
  if (!b) return null;
  b.scrollIntoView({ block: 'center' });
  const s = getComputedStyle(b);
  const r = b.getBoundingClientRect();
  const x = Math.round(r.left + r.width / 2);
  const y = Math.round(r.top + r.height / 2);
  const at = document.elementFromPoint(x, y);
  return {
    bg: s.backgroundColor, border: s.borderTopColor, color: s.color,
    x, y, onButton: !!at && (at === b || b.contains(at)),
    hover: b.matches(':hover'),
    active: b.classList.contains('chip-toggle-active'),
  };
})()`);
/** Хулганыг тухайн цэг рүү зөөнө (`mousedown` БИШ — зөвхөн hover ✓) */
const mouseTo = async (x, y) => {
  await rpc('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, buttons: 0 });
  await wait(450);
};
/**
 * ⚠️ 2026-10-06 (16) CDP ДЭЭР БАРИГДСАН FLAKY УРХИ: хулганыг ЗАЙЛУУЛАХ үед
 *    ҮРГЭЛЖ ижил цэг (2,2) руу дараалан `mouseMoved` явуулбал Chrome нь
 *    заримдаа hit-test-ийг ДАХИН ХИЙХГҮЙ ба hover нь ХЭВЭЭР үлддэг ✗
 *    ⇒ зайлуулах цэгийг ЭЭЛЖЛҮҮЛНЭ (4 өөр цэг) ✓
 */
const AWAY = [[2, 2], [5, 1180], [11, 4], [3, 900]];
let awayAt = 0;
const mouseAway = async () => {
  awayAt = (awayAt + 1) % AWAY.length;
  await mouseTo(AWAY[awayAt][0], AWAY[awayAt][1]);
};
/** ⏳ TRANSITION (150ms) + React-ийн дараагийн frame хүртэл дахин ДАХИН уншина */
const probeUntil = async (value, okFn, tries = 6) => {
  let p = null;
  for (let i = 0; i < tries; i += 1) {
    p = await chipProbe(value);
    if (p && okFn(p)) return p;
    await wait(250);
  }
  return p;
};

console.log('\n⑥c HOVER — сайдбарын чип (`chip-toggle`) «өөрчлөгдөнө»');
await mouseAway();
const chipBase = await probeUntil('Бүтэн цагийн', (p) => p.border === 'rgb(233, 228, 217)');
ok('Чип (🕒 «Бүтэн цагийн»): хэвийн хүрээ `border-gray-200` (rgb(233, 228, 217)) · текст `text-gray-600` · hover цэг нь товч дээр ✓',
  !!chipBase && chipBase.border === 'rgb(233, 228, 217)' && chipBase.color === 'rgb(93, 87, 71)'
    && chipBase.hover === false && chipBase.onButton === true && chipBase.active === false,
  JSON.stringify(chipBase));
await mouseTo(chipBase.x, chipBase.y);
const chipHov = await probeUntil('Бүтэн цагийн', (p) => /37[, ]+99[, ]+235/.test(p.border));
ok('HOVER: хүрээ/текст ЦЭНХЭР болов (`hover:border-primary/60` + `hover:text-primary`) · `:hover` ✓',
  !!chipHov && /37[, ]+99[, ]+235/.test(chipHov.border) && /0\.6/.test(chipHov.border)
    && /37[, ]+99[, ]+235/.test(chipHov.color) && chipHov.hover === true,
  chipHov && `${chipHov.border} / ${chipHov.color}`);
await mouseAway();
const chipBack = await probeUntil('Бүтэн цагийн', (p) => p.border === 'rgb(233, 228, 217)');
ok('HOVER: хулганыг зайлуулахад хүрээ БУЦАВ (`border-gray-200` (rgb(233, 228, 217)) · `:hover` false)',
  !!chipBack && chipBack.border === 'rgb(233, 228, 217)' && chipBack.hover === false,
  JSON.stringify(chipBack));

// ИДЭВХТЭЙ чип (📊 «Шаардлагатай» — §⑥b-д 2 утга сонгосон ✓)
await mouseAway();
const actBase = await probeUntil('Шаардлагатай', (p) => p.active === true);
ok('Идэвхтэй чип (`.chip-toggle-active`): фон `bg-primary` (rgb(37, 99, 235)) · текст ЦАГААН',
  !!actBase && actBase.active === true && actBase.bg === 'rgb(37, 99, 235)'
    && actBase.color === 'rgb(255, 255, 255)' && actBase.onButton === true,
  JSON.stringify(actBase));
await mouseTo(actBase.x, actBase.y);
const actHov = await probeUntil('Шаардлагатай', (p) => p.hover === true);
ok('Идэвхтэй чип HOVER: фон/текст ХЭВЭЭР (`hover:text-white` — `bg-primary` · ⛔ «цайвар» болохгүй ✓)',
  !!actHov && actHov.hover === true && actHov.bg === 'rgb(37, 99, 235)'
    && actHov.color === 'rgb(255, 255, 255)' && lum(actHov.bg) === lum(actBase.bg),
  actHov && `${actHov.bg} / ${actHov.color}`);
await mouseAway();

// ═══════ ⑥d 🆕 2026-10-06 (18): ЛИНКЭЭР (идэвхтэй утгатай) → БЛОК АВТОМАТААР НЭЭЛТТЭЙ ═══════
/**
 * ⚠️ ЧУХАЛ ДҮРЭМ: идэвхтэй шүүлт нь ХАРАГДАХГҮЙ үлдэх ЁСТОЙГҮЙ — хэрэглэгч
 *    «юу шүүснээ» мэдэх ёстой тул утгатай блок нь анхдагчаар НЭЭЛТТЭЙ байна ✓
 *    (`blockOpen` — идэвхтэй тоо > 0). Мөн ГАРААР хааж болно (товшилт нь
 *    анхдагчаас дээгүүр ✓) — хаасан ч чип DOM-д, URL/утга ХӨНДӨӨГДӨХГҮЙ ✓
 */
console.log('\n⑥d ИДЭВХТЭЙ УТГАТАЙ БЛОК АВТОМАТААР НЭЭЛТТЭЙ (шүүлт ДАЛД БАЙХГҮЙ ✓)');
await rpc('Page.navigate', { url: SIDE_URL + '&attr_jobType=' + encodeURIComponent('Бүтэн цагийн') });
await wait(3500);
/** 🕒 блокийн толгой/хайрцаг/чип + URL-ыг НЭГ удаа уншина */
const jobBlockUi = () => evaluate(`(() => {
  const head = document.querySelector('aside [data-side-collapse="jobType"]');
  const box = document.querySelector('aside [data-attr-filter="jobType"]');
  const chip = box ? box.querySelector('[data-attr-value="Бүтэн цагийн"]') : null;
  return {
    expanded: head ? head.getAttribute('aria-expanded') : null,
    headText: head ? head.textContent.trim() : null,
    boxH: box ? Math.round(box.getBoundingClientRect().height) : -1,
    pressed: chip ? chip.getAttribute('aria-pressed') : null,
    url: decodeURIComponent(location.search).replace(/\\+/g, ' '),
  };
})()`);
const dOpen = await jobBlockUi();
ok('🆕 (18) `?attr_jobType=…` линкээр → блок АВТОМАТААР НЭЭЛТТЭЙ (`aria-expanded=true`, чип харагдана)',
  dOpen.expanded === 'true' && dOpen.boxH > 0 && /attr_jobType=/.test(dOpen.url),
  `${dOpen.expanded} h=${dOpen.boxH}`);
ok('🆕 (18) чип нь ТЭМДЭГЛЭГДСЭН (`aria-pressed=true`) — шүүлт ХАРАГДАЖ байна ✓',
  dOpen.pressed === 'true', String(dOpen.pressed));

/** Толгой дээр дарж ГАРААР хураана — ⚠️ дараа нь утга/URL ХӨНДӨӨГДӨХГҮЙ */
const manualClosed = await evaluate(`(() => {
  const h = document.querySelector('aside [data-side-collapse="jobType"]');
  if (!h) return 'NO_HEAD';
  h.click();
  return 'OK';
})()`);
await wait(800);
const dClosed = await jobBlockUi();
ok('🆕 (18) гарчиг дээр дарвал ХУРААГДАВ (`aria-expanded=false`, өндөр 0)',
  manualClosed === 'OK' && dClosed.expanded === 'false' && dClosed.boxH === 0,
  `${manualClosed} ${dClosed.expanded} h=${dClosed.boxH}`);
ok('🆕 (18) хаасан ч чип DOM-д ТЭМДЭГТЭЙ + URL ХЭВЭЭР (шүүлт АЛДАГДАХГҮЙ ✓)',
  dClosed.pressed === 'true' && /attr_jobType=Бүтэн цагийн(&|$)/.test(dClosed.url),
  `${dClosed.pressed} · ${dClosed.url}`);
ok('🆕 (18) хаалттай толгойд «N сонгосон» badge (тоо) харагдана',
  /Ажлын цаг/.test(dClosed.headText || '') && /1/.test(dClosed.headText || ''),
  JSON.stringify(dClosed.headText));

// ═══════ ⑦ ДҮГНЭЛТ ═══════
const real = problems.filter((p) => !/Failed to load resource/.test(p));
console.log('\n⑦ JS exception / console.error: ' + real.length);
if (real.length) console.log(real.join('\n'));
ok('JS exception / console.error 0', real.length === 0, real.slice(0, 2).join(' | '));

console.log(`\n${fail === 0 ? '✅' : '❌'} CDP 💼 чип — ${pass} OK, ${fail} FAIL\n`);
ws.close();
await closeOwnTab();
process.exit(fail === 0 ? 0 : 1);
