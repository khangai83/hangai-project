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
//    ⑤ 📱 390px — 4 талбар БҮГД хүрэх + overflow 0 ⑥ ХАЙЛТЫН ХУУДАС: 🕒/📊/📈
//    нь сайдбарт БИШ — үр дүнгийн дээрх `#filter-bar`-т «pill + ⌄ панель»
//    (`data-filter-pill`; чип 12 = 5+2+5; ⚠️ `aside [data-attr-filter]` 0)
//    ⑥b pill нээж чип дарж `?attr_jobType=Бүтэн цагийн,Цагийн` (⛔ цуцлагдахгүй,
//    badge «2» + «2 сонгосон» + «✕ Цуцлах») ⑦ JS exception / console.error 0
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
//    ℹ️ ХАЙЛТЫН pill нь `[data-filter-pill="…"]` (товч + `[data-filter-panel]`)
//       бөгөөд чип нь дотор нь `[data-attr-filter]`/`data-attr-multi` — форм нь
//       `data-attr-field` (`formChips`) тул ХОЛИГДОХГҮЙ ✓
//       ⚠️ Форм дээрх чип нь НЭГ сонголттой хэвээр тул ③④ ХӨНДӨГДӨӨГҮЙ ✓
//       ⚠️ `#filter-bar` нь `#listing-results`-ийн ДЭЭР; ⌄ панель нь хаалттай
//          үед `visibility:hidden` ⇒ текст уншихын тулд эхлээд НЭЭНЭ ✓
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
//    data-attr-value, attr-salaryType, jobs, filterBar, data-filter-pill,
//    #filter-bar, Өрөөний тоо шиг
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
  await rpc('Page.navigate', { url: `${BASE}/listings/new` });
  await wait(6000);
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

// ═══════ ⑥ #FILTER-BAR PILL (2026-10-05 (42)) ═══════
// 🆕 2026-10-05 (42) (хэрэглэгчийн хүсэлт: «Ажлын цаг, Туршлага, Мэргэжлийн
//    түвшиныг Өрөөний тоо шиг болго … хайлтыг хэлж байгаа биз дээ»): 3 шүүлт
//    нь САЙДБАРТ БИШ — үр дүнгийн ДЭЭРХ ХЭВТЭЭ `#filter-bar`-т «pill + ⌄
//    хөвөг панель» (🛏 «Өрөөний тоо» · 💳 «Төлбөрийн нөхцөл»-ийн ЯГ ИЖИЛ хэв).
//    ⚠️ `aside`-д нь «Цалин, ₮» л үлдэнэ (`data-attr-filter` 0 — 2 өөр UI
//       БАЙХГҮЙ ✓); `#filter-bar` нь `#listing-results`-ийн ДЭЭР байрлана ✓
console.log('\n⑥ #FILTER-BAR — /?section=jobs&type=… (pill + ⌄ панель, формтой холилдоогүй)');
const SIDE_URL = BASE + '/?section=jobs&type=' + encodeURIComponent('Борлуулалт, худалдаа');
await rpc('Page.navigate', { url: SIDE_URL });
let side = '';
for (let i = 0; i < 12; i += 1) {
  await wait(1500);
  side = await evaluate(`(() => { const a = document.querySelector('aside'); return a ? a.innerText : ''; })()`);
  if (/Цалин, ₮/.test(side)) break;
}
console.log('   aside=' + JSON.stringify(side.replace(/\n/g, ' | ').slice(0, 240)));
ok('sidebar: «Цалин, ₮» байна', /Цалин, ₮/.test(side));
ok('🆕 (42) sidebar: attr шүүлт (🕒/📊/📈) ГАРСАН — aside-д «Ажлын цаг»/«Туршлага» БАЙХГҮЙ',
  !/Ажлын цаг|Туршлага|Мэргэжлийн түвшин/.test(side) && !/Бүтэн цагийн/.test(side));
/** 🆕 (42): `#filter-bar` + `aside` + форм блок бүгдийг НЭГ удаа уншина */
const barInfo = await evaluate(`(() => {
  const all = (sel) => [...document.querySelectorAll(sel)];
  const pill = (k) => {
    const p = document.querySelector('[data-filter-pill="' + k + '"]');
    if (!p) return { found: false };
    const panel = p.querySelector('[data-filter-panel="' + k + '"]');
    const block = p.querySelector('[data-attr-filter="' + k + '"]');
    const trg = p.querySelector('button');
    return {
      found: true,
      label: trg ? trg.textContent.replace(/\\d+/g, '').trim() : '',
      panel: !!panel,
      open: trg ? trg.getAttribute('aria-expanded') : null,
      multi: block ? block.dataset.attrMulti === 'true' : false,
      role: block ? block.getAttribute('role') : null,
      chips: block ? block.querySelectorAll('[data-attr-value]').length : 0,
      selects: block ? block.querySelectorAll('select').length : 0,
    };
  };
  const top = (sel) => { const el = document.querySelector(sel); if (!el) return -1; return Math.round(el.getBoundingClientRect().top + window.scrollY); };
  const bar = document.querySelector('#filter-bar');
  const sort = document.querySelector('[data-listing-sort]');
  const results = document.querySelector('#listing-results');
  return {
    bar: !!document.querySelector('#filter-bar[data-filter-bar]'),
    pills: all('#filter-bar [data-filter-pill]').map((p) => p.dataset.filterPill),
    jobType: pill('jobType'), experience: pill('experience'), jobLevel: pill('jobLevel'),
    chips: all('#filter-bar [data-attr-filter] .chip-toggle').length,
    chipKeys: all('#filter-bar [data-attr-filter] .chip-toggle').map((c) => c.closest('[data-attr-filter]').dataset.attrFilter),
    asideFilters: all('aside [data-attr-filter]').length,
    asideSelects: all('aside select').length,
    formBlocks: all('[data-attr-field]').length,
    barTop: top('#filter-bar'),
    barInResults: !!(bar && results && results.contains(bar)),
    barAfterSort: !!(bar && sort
      && (sort.compareDocumentPosition(bar) & Node.DOCUMENT_POSITION_FOLLOWING)),
  };
})()`);
console.log('   ' + JSON.stringify(barInfo));
ok('🆕 (42) `#filter-bar` БАЙНА · pill = ЯГ 3 (`jobType` → `experience` → `jobLevel`)',
  barInfo.bar && JSON.stringify(barInfo.pills) === JSON.stringify(['jobType', 'experience', 'jobLevel']),
  JSON.stringify(barInfo.pills));
ok('🆕 (42) pill-үүд нь jobs attr шүүлтийн ШОШГО-той (`Ажлын цаг` · `Туршлага` · `Мэргэжлийн түвшин`)',
  barInfo.jobType.label === 'Ажлын цаг' && barInfo.experience.label === 'Туршлага'
    && barInfo.jobLevel.label === 'Мэргэжлийн түвшин',
  JSON.stringify([barInfo.jobType.label, barInfo.experience.label, barInfo.jobLevel.label]));
ok('🆕 (42) 🕒 jobType pill: ⌄ панель + `<div role="group">` + 5 чип + `data-attr-multi` (⛔ `<select>` БАЙХГҮЙ)',
  barInfo.jobType.panel && barInfo.jobType.role === 'group' && barInfo.jobType.chips === 5
    && barInfo.jobType.multi && barInfo.jobType.selects === 0,
  JSON.stringify(barInfo.jobType));
ok('🆕 (42) 📊 experience pill: ⌄ панель + 2 чип + `data-attr-multi` (⛔ `<select>` БАЙХГҮЙ)',
  barInfo.experience.panel && barInfo.experience.role === 'group' && barInfo.experience.chips === 2
    && barInfo.experience.multi && barInfo.experience.selects === 0,
  JSON.stringify(barInfo.experience));
ok('🆕 (42) 📈 jobLevel pill: ⌄ панель + 5 чип + `data-attr-multi` (⛔ `<select>` БАЙХГҮЙ)',
  barInfo.jobLevel.panel && barInfo.jobLevel.role === 'group' && barInfo.jobLevel.chips === 5
    && barInfo.jobLevel.multi && barInfo.jobLevel.selects === 0,
  JSON.stringify(barInfo.jobLevel));
ok('🆕 (42) чипүүд нь ЯГ 3 pill-д (12 = 5+2+5) · ⌄ панель нь эхэндээ ХААЛТТАЙ',
  barInfo.chips === 12
    && barInfo.chipKeys.every((k) => ['jobType', 'experience', 'jobLevel'].includes(k))
    && [barInfo.jobType, barInfo.experience, barInfo.jobLevel].every((p) => p.open === 'false'),
  `${barInfo.chips} ${JSON.stringify(barInfo.chipKeys)}`);
ok('⛔ sidebar-д attr шүүлт БАЙХГҮЙ (`aside [data-attr-filter]` 0 — «Цалин, ₮» л үлдэв ✓)',
  barInfo.asideFilters === 0, `${barInfo.asideFilters} (aside select=${barInfo.asideSelects})`);
ok('⛔ форм блок (`data-attr-field`) хайлтын хуудсан дээр 0 (формтой холилдоогүй ✓)',
  barInfo.formBlocks === 0, String(barInfo.formBlocks));
ok('🧭 Байрлал: `#filter-bar` нь үр дүнгийн баганад (`#listing-results`) — «Эрэмбэлэх»-ийн ДООР ✓',
  barInfo.barInResults === true && barInfo.barAfterSort === true,
  `inResults=${barInfo.barInResults} afterSort=${barInfo.barAfterSort} top=${barInfo.barTop}`);

// ═══════ ⑥b #FILTER-BAR PILL НЭЭХ + ЧИП ДАРАХ — ОЛОН СОНГОЛТ ═══════
// 🎯 Гол шаардлага: «Ажлын цаг, Туршлага, Мэргэжлийн түвшиныг Өрөөний тоо шиг
//    болго» ⇒ pill дарж ⌄ панель нээгээд ХОЁР чип ЗЭРЭГ идэвхжинэ
//    (`?attr_jobType=A,B`) — ⛔ хуучин нэг сонголттой зан төлөв (шинэ чип
//    дарвал хуучин нь УНТРАХ) БАЙХГҮЙ ✓
// ⚠️ Панель нь `open` биш үед `invisible` (visibility:hidden) тул `innerText`
//    ХООСОН болно ⇒ эхлээд pill-ийг НЭЭЖ байж badge/«N сонгосон»/«✕ Цуцлах»
//    текстийг уншина ✓ (React-ийн `onClick` нь programmatic `.click()`-д ч
//    ажиллана ✓)
console.log('\n⑥b #FILTER-BAR — pill нээх + чип дарах ⇒ ОЛОН утга (`?attr_jobType=A,B`)');
/** ⌄ pill-ийг нээнэ (`aria-expanded` → true) */
const pillOpen = (key) => evaluate(
  '(() => { const p = document.querySelector(\'[data-filter-pill="' + key + '"]\'); if (!p) return "NO_PILL"; const b = p.querySelector(\'button\'); if (!b) return "NO_TRIGGER"; if (b.getAttribute("aria-expanded") !== "true") b.click(); return "OK"; })()',
);
/** Pill-ийн ⌄ панель доторх чип (`[data-attr-filter] [data-attr-value]`) дарна */
const pillChip = (key, value) => evaluate(
  '(() => { const b = document.querySelector(\'[data-filter-pill="' + key + '"] [data-attr-value="' + value + '"]\'); if (!b) return "NO_CHIP"; b.click(); return "OK"; })()',
);
/**
 * 3 pill + URL-ыг уншина (`+` → зай: URLSearchParams нь зайг `+` болгодог тул
 * `?attr_jobType=Бүтэн+цагийн` — ⚠️ түүнгүй бол regex ХУУРАМЧ ✗)
 * ℹ️ badge нь pill-ийн ТОВЧ дотор (`{count}` span), «N сонгосон»/«✕ Цуцлах» нь
 *    ⌄ панель дотор — `visibility:hidden` үед `innerText` хоосон тул панель
 *    НЭЭЛТТЭЙ үед л уншигдана ✓
 */
const pillRead = () => evaluate(`(() => {
  const read = (k) => {
    const p = document.querySelector('[data-filter-pill="' + k + '"]');
    if (!p) return null;
    const block = p.querySelector('[data-attr-filter="' + k + '"]');
    const trg = p.querySelector('button');
    const txt = p.innerText;
    const m = txt.match(/(\\d+)\\s+сонгосон/);
    return {
      active: block ? [...block.querySelectorAll('[data-attr-value]')]
        .filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.dataset.attrValue) : [],
      count: m ? Number(m[1]) : 0,
      badge: trg ? Number((trg.textContent.match(/\\d+/) || [0])[0]) : 0,
      clear: /Цуцлах/.test(txt),
      open: trg ? trg.getAttribute('aria-expanded') : null,
    };
  };
  return {
    jobType: read('jobType'), experience: read('experience'), jobLevel: read('jobLevel'),
    url: decodeURIComponent(location.search).replace(/\\+/g, ' '),
  };
})()`);

ok('🕒 jobType pill нээв (`aria-expanded=true`)', (await pillOpen('jobType')) === 'OK');
await wait(700);
let sw = await pillRead();
ok('🆕 (42) pill нээхэд ⌄ панель нээгдэнэ · badge 0 (⛔ «0 сонгосон» гарахгүй ✓)',
  sw.jobType.open === 'true' && sw.jobType.count === 0 && sw.jobType.badge === 0,
  JSON.stringify(sw.jobType));

ok('🕒 «Бүтэн цагийн» дарав (pill)', (await pillChip('jobType', 'Бүтэн цагийн')) === 'OK');
await wait(1200);
sw = await pillRead();
ok('🕒 1 идэвхтэй чип + pill badge «1» + «1 сонгосон» + «✕ Цуцлах» + URL `attr_jobType=Бүтэн цагийн`',
  sw.jobType.active.length === 1 && sw.jobType.active[0] === 'Бүтэн цагийн'
    && sw.jobType.count === 1 && sw.jobType.badge === 1 && sw.jobType.clear
    && /attr_jobType=Бүтэн цагийн(&|$)/.test(sw.url), JSON.stringify(sw));

ok('🕒 «Цагийн» дарав (2 дахь — ОЛОН СОНГОЛТ)', (await pillChip('jobType', 'Цагийн')) === 'OK');
await wait(1200);
sw = await pillRead();
ok('🆕 🕒 2 чип ЗЭРЭГ идэвхтэй (⛔ хуучин нь УНТРАХГҮЙ) + badge «2» + URL `attr_jobType=Бүтэн цагийн,Цагийн`',
  sw.jobType.active.length === 2
    && ['Бүтэн цагийн', 'Цагийн'].every((v) => sw.jobType.active.includes(v))
    && sw.jobType.count === 2 && sw.jobType.badge === 2
    && /attr_jobType=Бүтэн цагийн,Цагийн(&|$)/.test(sw.url), JSON.stringify(sw));

ok('🕒 идэвхтэй чип дээр дахин дарав (toggle-off)', (await pillChip('jobType', 'Бүтэн цагийн')) === 'OK');
await wait(1200);
sw = await pillRead();
ok('🕒 ЗӨВХӨН тэр чип унав (2→1, бусдыг ХӨНДӨӨГҮЙ) + badge «1 сонгосон»',
  JSON.stringify(sw.jobType.active) === JSON.stringify(['Цагийн']) && sw.jobType.count === 1
    && /attr_jobType=Цагийн(&|$)/.test(sw.url), JSON.stringify(sw));

/** 🆕 (42): ⌄ панель доторх «✕ Цуцлах» товчийг дарна (pill-ийн хүрээ дотор) */
const clearClicked = await evaluate(`(() => {
  const p = document.querySelector('[data-filter-pill="jobType"]');
  const b = p && [...p.querySelectorAll('button')].find((x) => /Цуцлах/.test(x.innerText));
  if (!b) return 'NO_CLEAR';
  b.click(); return 'OK';
})()`);
await wait(1200);
sw = await pillRead();
ok('🕒 «✕ Цуцлах» → БҮХ чип идэвхгүй + badge/товч ГАРСАН + URL-ээс `attr_jobType` АРИЛСАН',
  clearClicked === 'OK' && sw.jobType.active.length === 0 && sw.jobType.count === 0
    && sw.jobType.badge === 0 && !sw.jobType.clear
    && !/attr_jobType/.test(sw.url), `${clearClicked} ${JSON.stringify(sw)}`);
ok('⛔ 📊/📈 ХӨНДӨГДӨӨГҮЙ (0 идэвхтэй, URL-д тэдгээрийн түлхүүр БАЙХГҮЙ)',
  sw.experience.active.length === 0 && sw.jobLevel.active.length === 0
    && !/attr_experience|attr_jobLevel/.test(sw.url), JSON.stringify(sw));

// 📊 Туршлага ч мөн ИЖИЛ (1 pill = 2 утга) — тусдаа механизм биш, НЭГ ✓
ok('📊 experience pill нээв', (await pillOpen('experience')) === 'OK');
await wait(600);
ok('📊 «Шаардлагагүй» + «Шаардлагатай» — 2 утга ЗЭРЭГ (📈 ч хөндөгдөхгүй)',
  (await pillChip('experience', 'Шаардлагагүй')) === 'OK');
await wait(1000);
await pillChip('experience', 'Шаардлагатай');
await wait(1200);
sw = await pillRead();
ok('📊 2 сонголт + badge «2» + URL `attr_experience=Шаардлагагүй,Шаардлагатай` (📈 хэвээр 0)',
  sw.experience.active.length === 2 && sw.experience.count === 2 && sw.experience.badge === 2
    && /attr_experience=Шаардлагагүй,Шаардлагатай(&|$)/.test(sw.url)
    && sw.jobLevel.active.length === 0 && sw.jobType.active.length === 0, JSON.stringify(sw));

// ═══════ ⑦ ДҮГНЭЛТ ═══════
const real = problems.filter((p) => !/Failed to load resource/.test(p));
console.log('\n⑦ JS exception / console.error: ' + real.length);
if (real.length) console.log(real.join('\n'));
ok('JS exception / console.error 0', real.length === 0, real.slice(0, 2).join(' | '));

console.log(`\n${fail === 0 ? '✅' : '❌'} CDP 💼 чип — ${pass} OK, ${fail} FAIL\n`);
ws.close();
await closeOwnTab();
process.exit(fail === 0 ? 0 : 1);
