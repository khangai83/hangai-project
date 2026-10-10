// ============================================================
// cdp-wheel.mjs — 🎡 МОБАЙЛ ДУГУЙН (iOS Timer) CDP ШАЛГАЛТ
//
// 🎯 ЮУГ ШАЛГАХ ВЭ: 📱 гар утсан дээр (390px) «Барилгын нийт давхар»,
//    «Ашиглалтанд орсон он», «Байрны давхар», «Тагт», «Угаалгын өрөө»
//    талбарууд нь ГАР БИЧИЛТ биш, iOS Timer маягийн ДУГУЙгаар сонгогдож
//    байгаа эсэх — ① дугуй НЭЭГДЭХ ② мөрүүд ЗӨВ (тоо/дараалал) ③ мөр
//    дээр дарахад утга формоо ШИНЭЧЛЭХ ④ ГҮЙЛГЭЭ зогсоход төвд байгаа
//    мөр сонгогдох ⑤ `Escape`/ард тал/«Болсон» хаах ⑥ 🖥 дээр гар бичилт
//    ХЭВЭЭР + утга нь ХОЁР харагдацад ХАМТ хадгалагдах
//    ⚠️ 🆕 2026-10-05 (53) — 📅 ОН · 🏢 НИЙТ ДАВХАР · 🏠 ДАВХАР нь 📱 дээр
//       ГАРААС БИЧИГДДЭГ болов (2 БАГАНАТ ЖАГСААЛТ ГАРСАН, хэрэглэгчийн
//       хүсэлт) ⇒ 🎡 дугуй нь ЗӨВХӨН НЭМЭЛТ боломж («🎡 Гүйлгээд сонгох»
//       холбоос). Тиймээс шалгалт нь дугуйнаас ГАДНА гараас бичих урсгалыг ч
//       хамарна: дугуйнаас сонгоход утга нь доод `input`-д БИЧИГДЭНЭ
//       (`inputValue`) ба эдгээр 3 дэлгэцэд `[data-mobile-option]` = **0** ✓
//
// ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
//   1) сервер http://localhost:3000 (`npm run dev`)
//      ℹ️ Өөр порт: `node scripts/cdp-wheel.mjs http://localhost:3200`
//   2) Chrome алсын дебагттай + НЭВТЭРСЭН профайлаар:
//      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
//        --headless=new --remote-debugging-port=9222 \
//        --user-data-dir=/tmp/chrome-prof-zar http://localhost:3000/
//      ⚠️ Форм нь ЗӨВХӨН нэвтэрсэн хэрэглэгчид харагдана
//   Дараа нь:  npm run cdp:wheel
//
// ⚠️ Тогтвортой selector-ууд (`ChoiceField`/`WheelPicker` дотор):
//    `[data-choice-trigger="…"]` (📱 товч) · `[data-choice-input="…"]` (🖥 гар
//    бичилт/`<select>`) · `[data-wheel]` · `[data-wheel-title]` ·
//    `[data-wheel-scroll]` · `[data-wheel-value="…"]` · `[data-wheel-marker]` ·
//    `[data-wheel-done]` · `[data-wheel-backdrop]`
//    ℹ️ Алхмууд: `[data-picker="…"]` / «Үргэлжлүүлэх» (cdp-picker.mjs-тэй ижил)
// 🆕 2026-10-02 — 📱 3-р алхам (📋 Дэлгэрэнгүй) нь «АСУУЛТ БҮР НЭГ ДЭЛГЭЦ»
//    болов ⇒ `<640px` дээр талбар бүр ӨӨРИЙН дэлгэцтэй. Тиймээс хэмжилтийн
//    өмнө тухайн дэлгэц рүү ГҮЙЛГЭНЭ (`detailTo`, `detailKeyList`):
//    `[data-mobile-detail-head]` (`data-mobile-detail-key` = дэлгэцийн нэр) ·
//    `[data-mobile-detail-next]` · `[data-mobile-detail-back]` ·
//    `[data-mobile-detail-nav]` · `[data-detail-field="…"]` ·
//    `[data-detail-row="…"]` + `data-mobile-active` (CSS `globals.css`)
//    ⚠️ Заавал талбар («Зарын гарчиг») ХООСОН бол урагш ЯВАХГҮЙ — эхлээд
//       `fillTitle()`-ээр бичнэ ✓
// 🔍 Хайх үг: cdp-wheel, data-choice-trigger, data-wheel, iOS Timer, 390px,
//    data-mobile-detail-key, detailTo
// ============================================================
const BASE = process.argv[2] || 'http://localhost:3000';
const CDP = `http://127.0.0.1:${process.env.CDP_PORT || 9222}`;

/**
 * 🧭 🖥 ≥640px ДЭЭРХ 3 ДАХЬ ХУУДАСНЫ breadcrumb (2026-10-05, 57)
 * ⚠️ 🖥 дээр 3, 4, 5-р алхам НЭГ хуудас болов ⇒ «Дэлгэрэнгүй» БИШ,
 *    «Дэлгэрэнгүй ба үнэ, зураг» ✓ (📱 <640px дээр «Дэлгэрэнгүй» хэвээр —
 *    доорх 📱 хэсгүүд `[data-mobile-detail-key]`-ээр ажилладаг тул хөндөгдөхгүй)
 */
const DESKTOP_DETAIL_LABEL = 'Дэлгэрэнгүй ба үнэ, зураг';

/**
 * ⚠️ Мөрүүдийн тоо/сүүлийн утга нь `FLOOR_MAX`-оос ХАМААРНА (2026-10-03: 26 → 150)
 *    — хатуу «27»/«26» бичихгүй, модулиас авна ✓
 */
const { FLOOR_MAX } = await import('../lib/numberChoices.mjs');

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

const created = await fetch(`${CDP}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
const target = await created.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res) => ws.addEventListener('open', res, { once: true }));

let id = 0;
const rpc = (method, params = {}) => {
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await rpc('Runtime.enable');
await rpc('Page.enable');
await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false });
await rpc('Page.navigate', { url: `${BASE}/listings/new` });
await wait(5000);

const evaluate = async (expression) => {
  const r = await rpc('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails));
  return r.result.value;
};
/**
 * 📝 НООРОГ ЦЭВЭРЛЭХ (2026-10-05, 54) — форм нь оруулсан утгаа `localStorage`-д
 *    ноорог болгож хадгалдаг болов (`lib/listingDraft.mjs`) ⇒ өмнөх run-ийн
 *    ноорог үлдсэн бол форм ХООСОН биш болж, «эхний дэлгэц / хоосон талбар»
 *    гэсэн шалгалтууд унана ✗ ⇒ эхлэлд нооргийг ЦЭВЭРЛЭЭД дахин ачаална ✓
 * ⚠️ Зөвхөн `zar:listing-draft…` угтвартай түлхүүрүүд (`sb-…-auth-token`
 *    нэвтрэлт ХӨНДӨГДӨХГҮЙ ✓)
 */
await evaluate(`(() => {
  const keys = Object.keys(window.localStorage).filter((k) => k.indexOf('zar:listing-draft') === 0);
  keys.forEach((k) => window.localStorage.removeItem(k));
  return keys.length;
})()`);
await rpc('Page.navigate', { url: `${BASE}/listings/new` });
await wait(4000);
const click = async (sel) => {
  const res = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NOT_FOUND'; el.click(); return 'OK'; })()`);
  await wait(350);
  return res;
};
/**
 * 🖱 ХАРАГДАЖ БАЙГАА элемент дээр дарах — 🆕 2026-10-03 (17)
 * ⚠️ 3-р алхмын БҮХ дэлгэцийн сонголтууд DOM-д байдаг (зөвхөн CSS нуудаг)
 *    тул `querySelector` нь ДАЛД мөрийг барих эрсдэлтэй ⇒ харагдахыг сонгоно ✓
 */
const clickVisible = async (sel) => {
  const res = await evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => {
      const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0;
    });
    if (!el) return 'NOT_FOUND';
    el.click(); return 'OK';
  })()`);
  await wait(500);
  return res;
};
/** 🪜 «Үргэлжлүүлэх →» — алхмын навигаци (cdp-picker.mjs-тэй ижил)
 *  ⚠️ 2026-10-05 (🖥 НЭГ УРТ ХУУДАС): ТЕКСТЭЭР хайж БОЛОХГҮЙ — 📱
 *     `[data-mobile-detail-next]` нь ≥640px дээр `sm:hidden` ч DOM-д БАЙНГА
 *     байдаг тул эхэнд таарч, алхам ХӨДЛӨХГҮЙ байв ✗ ⇒ `[data-step-next]` ✓ */
const clickNext = async () => {
  const res = await evaluate(`(() => { const b = document.querySelector('form [data-step-next]'); if (!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()`);
  await wait(900);
  return res;
};
const viewport = async (w) => {
  await rpc('Emulation.setDeviceMetricsOverride', { width: w, height: 1400, deviceScaleFactor: 1, mobile: false });
  await wait(600);
};

/** 🔎 Нэг талбарын төлөв: 📱 2 баганат жагсаалт + 🎡 холбоос + 🖥 гар бичилт */
const FIELD = (key) => `(() => {
  const key = ${JSON.stringify(key)};
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const b = document.querySelector('[data-choice-trigger="' + key + '"]');
  const inp = document.querySelector('[data-choice-input="' + key + '"]');
  /**
   * 🆕 2026-10-03 (17): мобайлд үндсэн сонголт нь 2 БАГАНАТ ЖАГСААЛТ
   * (жишиг сайтын хэв) — товч нь ЗӨВХӨН урт жагсаалтад «🎡 Гүйлгээд сонгох»
   * (§ .mob-wheel-link, WHEEL_LINK_MIN) тул текстийг бүтнээр уншина ✓
   * ⚠️ ЭНЭ template literal дотор backtick БИЧИХГҮЙ ✗
   */
  const box = (b || inp) ? (b || inp).closest('.form-group') : null;
  const opts = box ? [...box.querySelectorAll('[data-mobile-option]')] : [];
  const visOpts = opts.filter(vis);
  const sel = visOpts.find((e) => e.getAttribute('aria-pressed') === 'true');
  return {
    hasTrigger: !!b,
    trigVisible: vis(b),
    trigText: b ? (b.textContent || '').trim() : '',
    trigEmpty: b ? b.dataset.empty : null,
    options: visOpts.length,
    selectedOption: sel ? (sel.dataset.mobileOption || '') : '',
    skipVisible: box ? [...box.querySelectorAll('[data-mobile-option-skip]')].some(vis) : false,
    hasInput: !!inp,
    inputVisible: vis(inp),
    inputValue: inp ? inp.value : null,
    inputTag: inp ? inp.tagName.toLowerCase() : null,
  };
})()`;
const field = (key) => evaluate(FIELD(key));

/** 🎡 Дугуйн төлөв (нээлттэй эсэх, мөрүүд, төвд байгаа мөр, хэмжээ) */
const WHEEL = `(() => {
  const sc = document.querySelector('[data-wheel-scroll]');
  const rows = [...document.querySelectorAll('[data-wheel-value]')];
  const active = rows.findIndex((r) => r.getAttribute('aria-selected') === 'true');
  const r0 = rows[0] ? rows[0].getBoundingClientRect() : null;
  const hint = document.querySelector('[data-wheel] .form-hint');
  return {
    open: !!document.querySelector('[data-wheel]'),
    title: ((document.querySelector('[data-wheel-title]') || {}).textContent || '').trim(),
    hint: (hint ? hint.textContent : '').trim(),
    rows: rows.length,
    values: rows.map((r) => r.dataset.wheelValue),
    active,
    activeText: active >= 0 ? (rows[active].innerText || '').trim() : '',
    marker: !!document.querySelector('[data-wheel-marker]'),
    done: !!document.querySelector('[data-wheel-done]'),
    backdrop: !!document.querySelector('[data-wheel-backdrop]'),
    dialog: !!document.querySelector('[data-wheel] [role="dialog"]'),
    itemH: r0 ? +r0.height.toFixed(1) : 0,
    scrollTop: sc ? sc.scrollTop : -1,
    snap: sc ? getComputedStyle(sc).scrollSnapType : '',
    pads: sc ? [...sc.children].filter((c) => c.getAttribute('aria-hidden') === 'true').length : 0,
    triggers: document.querySelectorAll('[data-choice-trigger]').length,
    visibleTriggers: [...document.querySelectorAll('[data-choice-trigger]')].filter((b) => {
      const r = b.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }).length,
  };
})()`;
const wheel = () => evaluate(WHEEL);

/** ⬇️ Гүйлгээг БОДИТООР хийж `scroll` үйл явдал илгээнэ (settle-ийг шалгана ✓) */
const scrollTo = async (top) => {
  await evaluate(`(() => { const sc = document.querySelector('[data-wheel-scroll]'); sc.scrollTop = ${top}; sc.dispatchEvent(new Event('scroll')); return sc.scrollTop; })()`);
  await wait(500);
};
const pressEscape = async () => {
  await rpc('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await rpc('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await wait(400);
};

/* ═══════════════════════════════════════════════════════════════════════════
   📱 2026-10-02 — 3-Р АЛХАМ (📋 Дэлгэрэнгүй) «АСУУЛТ БҮР НЭГ ДЭЛГЭЦ»
   ───────────────────────────────────────────────────────────────────────────
   Хэрэглэгчийн хүсэлт: «гар утсаас зар оруулахад ийм асуудаг формоо нэг
   нэгээр нь харуулаад яв» ⇒ `<640px` дээр зөвхөн ОДООНЫ талбар харагдана.
   ⚠️ Тиймээс хэмжилт бүрийн өмнө тухайн талбарын дэлгэц рүү ГҮЙЛГЭНЭ
      (`detailTo`) — эс бөгөөс товч нь `display:none` мөрөнд байж
      `trigVisible=false` гараад хуурамч ✗ өгнө ✓
   ⚠️ `data-mobile-detail-key` нь ТОГТВОРТОЙ CDP selector (дэлгэцийн нэр) ✓
   🔍 Хайх үг: detailState, detailKeyList, detailTo, detailReset
   ═══════════════════════════════════════════════════════════════════════════ */
const DETAIL_STATE = `(() => {
  const head = document.querySelector('[data-mobile-detail-head]');
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const fields = [...document.querySelectorAll('[data-detail-field]')];
  return {
    key: head ? (head.dataset.mobileDetailKey || '') : '',
    title: head ? (((head.querySelector('h2') || {}).innerText) || '').trim() : '',
    progress: head ? (((head.querySelector('span') || {}).innerText) || '').trim() : '',
    visible: fields.filter(vis).map((f) => f.dataset.detailField),
    /**
     * 🪜 Мобайл wizard-ийн «Үргэлжлүүлэх» — ① DOM-д БАЙХ эсэх (next)
     * ② ХАРАГДАХ эсэх (nextVisible — 🆕 2026-10-03 (17): сонголттой дэлгэцэд
     * hide-below-sm-ээр дарагддаг тул ялгах ШААРДЛАГАТАЙ ✓)
     * ⚠️ ЭНЭ template literal дотор backtick БИЧИХГҮЙ ✗
     */
    next: !!document.querySelector('[data-mobile-detail-next]'),
    nextVisible: vis(document.querySelector('[data-mobile-detail-next]')),
    /** 🆕 2026-10-03 (17): 2 баганат сонголт + «Алгасах» линк + 💳 сонголт
     *  ⚠️ (18): 💳 нь форм дээр ч ЧИП болсон тул төлөв нь aria-pressed ✓
     *  ⚠️ ЭНЭ template literal дотор backtick БИЧИХГҮЙ ✗ */
    options: [...document.querySelectorAll('[data-mobile-option]')].filter(vis).length,
    skipVisible: [...document.querySelectorAll('[data-mobile-option-skip]')].some(vis),
    paymentsSelected: [...document.querySelectorAll('[data-payment-value]')]
      .filter((c) => c.getAttribute('aria-pressed') === 'true').length,
  };
})()`;
const detailState = () => evaluate(DETAIL_STATE);
/**
 * 🪜 УРАГШЛАХ (2026-10-03 (17) — жишиг сайтын мобайл хэв):
 *   ① гар бичилттэй дэлгэц → «Үргэлжлүүлэх»
 *   ② сонголттой дэлгэц → СОНГОСОН утга байвал түүн дээр (утга ХАДГАЛАГДАНА ✓),
 *      эс бөгөөс «Алгасах» линк
 *   ③ 💳 «Төлбөрийн нөхцөл» (ЗААВАЛ) → эхлээд нэг сонголт, дараа нь «Үргэлжлүүлэх»
 * ⚠️ 🏁 СҮҮЛИЙН дэлгэцэд (`n/N`) урагш явахгүй (`false` буцаана) ✓
 * ⚠️ ЭНЭ функц доторх evaluate-ийн template literal-д backtick БИЧИХГҮЙ ✗
 */
const detailNext = async () => {
  const s = await detailState();
  const [pi, pt] = String(s.progress || '').split('/').map(Number);
  if (pi > 0 && pi === pt) return false;
  /** 💳 ЗААВАЛ талбар — эхлээд сонголт (эс бөгөөс «Үргэлжлүүлэх» урагшлуулахгүй ✗) */
  if (s.key === 'payments' && s.paymentsSelected === 0) {
    await click('[data-payment-value]');
    await click('[data-mobile-detail-next]');
  } else if (s.nextVisible) await click('[data-mobile-detail-next]');
  else {
    await evaluate(`(() => {
      const vis = (e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
      const opts = [...document.querySelectorAll('[data-mobile-option]')].filter(vis);
      const sel = opts.find((e) => e.getAttribute('aria-pressed') === 'true');
      if (sel) { sel.click(); return 'SEL'; }
      const sk = [...document.querySelectorAll('[data-mobile-option-skip]')].find(vis);
      if (sk) { sk.click(); return 'SKIP'; }
      return 'NONE';
    })()`);
  }
  await wait(500);
  return true;
};
/** ↩️ ХАМГИЙН ЭХНИЙ дэлгэц (гарчиг) хүртэл буцаана */
const detailReset = async () => {
  for (let i = 0; i < 16; i += 1) {
    if ((await detailState()).key === 'title') return true;
    if ((await click('[data-mobile-detail-back]')) !== 'OK') return false;
  }
  return false;
};
/** 🎯 Тухайн түлхүүрийн дэлгэц рүү очих (урагш гүйлгээд, олдохгүй бол эхнээс) */
const detailTo = async (key) => {
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < 16; i += 1) {
      const s = await detailState();
      if (s.key === key) return true;
      /** ⚠️ 🏁 сүүлийн дэлгэц хүрвэл урагш явах боломжгүй ⇒ эхнээс ✓ */
      if (!(await detailNext())) break;
    }
    if (!(await detailReset())) return false;
  }
  return false;
};
/** 📋 БҮХ дэлгэцийн түлхүүрийг ДАРААЛЛААР нь цуглуулна (эхлээд эхнээс ✓) */
const detailKeyList = async () => {
  if (!(await detailReset())) return [];
  const keys = [];
  for (let i = 0; i < 16; i += 1) {
    const s = await detailState();
    if (!s.key) break;
    keys.push(s.key);
    if (!(await detailNext())) break;
  }
  return keys;
};
/** ⌨️ «Зарын гарчиг» — React-ийн controlled input-д БОДИТ бичилт хийх
 *  ⚠️ `el.value = ...` шууд тавибал React ХАРАХГҮЙ (native setter + `input`) ✓ */
const fillTitle = async (v) => {
  const res = await evaluate(`(() => {
    const el = document.querySelector('[data-detail-field="title"] input');
    if (!el) return 'NOT_FOUND';
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, ${JSON.stringify(v)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return 'OK';
  })()`);
  await wait(400);
  return res;
};
/**
 * ⌨️ 🆕 2026-10-05 (53) — ДУРЫН controlled input-д БОДИТ гараас бичилт.
 * 🎯 Хэрэглэгчийн хүсэлт: «гар утаснаас ашиглалтанд орсон он, барилгын нийт
 *    давхар, байрны давхарыг гараас оруулдаг болго» ⇒ 📅 он · 🏢 нийт давхар ·
 *    🏠 давхар нь 📱 дээр ЖИНХЭНЭ тоон оролт болов (`ChoiceField`-ийн
 *    `mobileInput`) — энэ туслах нь түүн дээр хүн шиг бичнэ ✓
 * ⚠️ `el.value = …` шууд тавибал React ХАРАХГҮЙ (native setter + `input` ✓)
 */
const fillInput = async (sel, v) => {
  const res = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return 'NOT_FOUND';
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, ${JSON.stringify(v)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return 'OK';
  })()`);
  await wait(400);
  return res;
};


console.log('\n── ① НЭВТРЭЛТ + 3-Р АЛХАМ (📋 Дэлгэрэнгүй) ХҮРЭХ ──');
if (await evaluate('document.body.innerText.includes("нэвтрэх шаардлагатай")')) {
  console.log('\n⏭  SKIP: Chrome профайл НЭВТРЭЭГҮЙ байна (форм харагдахгүй).');
  console.log('   Нэвтэрсэн профайлаар дахин ажиллуулна уу:\n');
  console.log('   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\');
  console.log('     --headless=new --remote-debugging-port=9222 \\');
  console.log(`     --user-data-dir=/tmp/chrome-prof-zar ${BASE}/\n`);
  ws.close();
  process.exit(0);
}
ok('форм харагдаж байна (нэвтэрсэн ✓)', true);
await click('[data-picker="section"] button[data-picker-value="real-estate"]');
await click('[data-picker="level3"] button[data-picker-value="Орон сууц"]');
ok('1-р алхам: «Үл хөдлөх → Орон сууц» сонгогдов', (await clickNext()) === 'OK');
await click('[data-picker="loc-district"] button[data-picker-value="Баянгол"]');
await click('[data-picker="loc-khoroo"] button[data-picker-value="3-р хороо"]');
await clickNext();
const step3 = await evaluate('(document.querySelector("[data-step-current]") || {}).innerText || ""');
ok('3-Р АЛХАМ (📋 Дэлгэрэнгүй ба үнэ, зураг) руу шилжив', String(step3).trim() === DESKTOP_DETAIL_LABEL, JSON.stringify(step3));

// ────────────────────────────────────────────────────────────
console.log('\n── ② 📱 390px: «НЭГ ДЭЛГЭЦЭД НЭГ ТАЛБАР» (он/давхар = гараас бичих, бусад нь сонголт) ──');
await viewport(390);
ok('дугуй хаалттай үед DOM-д БАЙХГҮЙ (`[data-wheel]` = 0)', (await wheel()).open === false);
/** 📱 2026-10-02 — 3-р алхам «асуулт бүр НЭГ ДЭЛГЭЦ» болов ⇒ ① хэсэгт
 *  гарчиг бичээгүй тул ЭХЛЭЭД бичнэ (заавал талбар — эс бөгөөс урагш
 *  явахгүй, `mobileDetailNext` мессеж өгнө ✓) */
const firstD = await detailState();
ok('📱 3-р алхам: эхний дэлгэц «Зарын гарчиг» (толгойд «Зар нийтлэх») — харагдах талбар ЯГ 1 ✓',
  firstD.key === 'title' && firstD.title === 'Зар нийтлэх' && JSON.stringify(firstD.visible) === '["title"]',
  JSON.stringify(firstD));
/** 🛡️ Заавал талбарын ХААЛТ: гарчиг хоосон үед урагш ЯВАХГҮЙ ✓ */
await click('[data-mobile-detail-next]');
const gated = await detailState();
const gateErr = String(await evaluate('((document.querySelector("form .bg-red-50") || {}).innerText || "").trim()'));
ok('🛡️ гарчиг ХООСОН үед дараагийн дэлгэц рүү ЯВАХГҮЙ + мессеж гарна',
  gated.key === 'title' && gateErr === 'Зарын гарчигаа оруулна уу', `${gated.key} / ${JSON.stringify(gateErr)}`);
ok('⌨️ «Зарын гарчиг»-т бичив', (await fillTitle('3 өрөө байр, Баянгол')) === 'OK');
await click('[data-mobile-detail-next]');
const afterTitle = await detailState();
ok('📱 «Үргэлжлүүлэх» нь дараагийн ТАЛБАР руу шилжүүлэв (алхам руу БИШ ✓)',
  afterTitle.key === 'payments' && afterTitle.visible.length === 1,
  `${afterTitle.key} ${JSON.stringify(afterTitle.visible)}`);
await detailReset();
const allKeys = await detailKeyList();
ok('📱 дэлгэцүүд ДАРААЛААР ба «Өрөө» БАЙХГҮЙ (1-р алхмын drill-down-д асуусан ✓)',
  allKeys[0] === 'title' && allKeys.length >= 4 && !allKeys.includes('rooms'),
  JSON.stringify(allKeys));
ok('📱 «Барилгын нийт давхар» дэлгэц рүү гүйлгэв', await detailTo('totalFloors'));
const f0 = await field('totalFloors');
/**
 * 🆕 2026-10-05 (53) — хэрэглэгчийн хүсэлт: «гар утаснаас ашиглалтанд орсон он,
 *    барилгын нийт давхар, байрны давхарыг гараас оруулдаг болго» ⇒ 📅 он ·
 *    🏢 нийт давхар · 🏠 давхар нь 📱 <640px дээр ГАР БИЧИЛТТЭЙ болов
 *    (2 баганат жагсаалт ОГТ рендэрлэгдэхгүй); 🎡 дугуй нь НЭМЭЛТ боломж ✓
 */
ok('📱 «Барилгын нийт давхар» — ЖИНХЭНЭ ГАР БИЧИЛТ харагдана (`input[type=number]` + `data-mobile-input` ✓)',
  f0.hasInput && f0.inputVisible === true && f0.inputTag === 'input',
  JSON.stringify({ hasInput: f0.hasInput, visible: f0.inputVisible, tag: f0.inputTag }));
ok('📱 2 БАГАНАТ ЖАГСААЛТ БАЙХГҮЙ (`[data-mobile-option]` = 0, «Алгасах» линк ч байхгүй ✓)',
  f0.options === 0 && f0.skipVisible === false, JSON.stringify({ options: f0.options, skip: f0.skipVisible }));
ok('📱 хоосон үед «Гүйлгээд сонгох» холбоос + `data-empty="true"` (дугуй нь НЭМЭЛТ боломж хэвээр — 🆕 (114): emoji ХАСАГДАВ ✓)',
  f0.trigVisible && f0.trigText === 'Гүйлгээд сонгох' && f0.trigEmpty === 'true',
  `${f0.trigVisible} / ${f0.trigText} / ${f0.trigEmpty}`);
/** ⚠️ Дараалал нь 3-р алхмын дараалалтай ИЖИЛ (угаалгын өрөө нь 2 өрөөт
 *  орон сууцад БАЙХГҮЙ тул ХАМГИЙН СҮҮЛД — эс бөгөөс урагш гүйлгээд
 *  буцаж чадахгүй ✗) ✓ */
const MKEYS = ['buildYear', 'totalFloors', 'floor', 'balconies', 'bathrooms'];
/** 🆕 2026-10-05 (53) — 📱 дээр ГАРААС БИЧИГДДЭГ 3 талбар (жагсаалтгүй ✓) */
const INPUT_KEYS = ['buildYear', 'totalFloors', 'floor'];
const mState = [];
for (const k of MKEYS) {
  const reached = await detailTo(k);
  mState.push({ k, reached, s: await field(k), vis: (await detailState()).visible });
}
/** ⚠️ Талбар бүр ӨӨРИЙН дэлгэц дээрээ (`vis` = ЯГ тэр талбар) ✓ */
const mPresent = mState.filter((x) => x.reached && x.vis.length === 1 && x.vis[0] === x.k);
const mIn = mPresent.filter((x) => INPUT_KEYS.includes(x.k));
const mSel = mPresent.filter((x) => !INPUT_KEYS.includes(x.k));
/** ⚠️ Яг аль талбар харагдах нь зарын төрлөөс хамаарна (ж: он/тагт зөвхөн
 *  «Орон сууц» дээр, угаалгын өрөө 3+ өрөөтэй үед) — тиймээс ЗААВАЛ 5
 *  БИШ, ХАМГИЙН БАГАДАА 4 ✓ */
const mInfo = mState.map((x) => `${x.k}:${x.reached
  ? `vis=${x.vis.join('|')} opt=${x.s.options} trig=${x.s.trigVisible} inp=${x.s.inputVisible}`
  : 'дэлгэц байхгүй'}`).join(' · ');
ok('📱 ГАРААС БИЧИГДДЭГ 3 талбар (📅 он · 🏢 нийт давхар · 🏠 давхар) — гар бичилт НЭЭЛТТЭЙ, жагсаалт 0 ✓',
  mPresent.length >= 4 && mIn.length === 3
    && mIn.every((x) => x.s.hasInput && x.s.inputVisible === true && x.s.options === 0),
  `${mIn.length}/3 · ${mInfo}`);
ok('📱 СОНГОЛТТОЙ талбар (🚿 угаалгын өрөө · 🌇 тагт) — 2 баганат жагсаалт, гар бичилт НУУГДСАН (регресс 0 ✓)',
  mSel.length >= 1 && mSel.every((x) => x.s.hasInput && x.s.inputVisible === false && x.s.options > 0),
  `${mSel.length} · ${mInfo}`);
await detailTo('totalFloors');

// ────────────────────────────────────────────────────────────
console.log(`\n── ③ 🎡 ДУГУЙ НЭЭГДЭХ + МӨРҮҮД («—» + 1…${FLOOR_MAX}, iOS Timer бүтэц) ──`);
await click('[data-choice-trigger="totalFloors"]');
const w1 = await wheel();
ok('товч дарахад дугуй НЭЭГДЭВ (`[data-wheel]` DOM-д ирэв)', w1.open === true);
ok('гарчиг = «Барилгын нийт давхар» + `role="dialog"`', w1.title === 'Барилгын нийт давхар' && w1.dialog, w1.title);
ok(`💡 чиглүүлэг = «Сонголт: 1–${FLOOR_MAX} давхар»`, w1.hint.includes(`1–${FLOOR_MAX}`), w1.hint);
ok(`мөрүүд = «—» + 1…${FLOOR_MAX} = ${FLOOR_MAX + 1} (утгууд нь ТЕКСТ, дараалал өсөх ✓)`,
  w1.rows === FLOOR_MAX + 1 && w1.values[0] === '' && w1.values[1] === '1'
    && w1.values[FLOOR_MAX] === String(FLOOR_MAX),
  `rows=${w1.rows} first=${JSON.stringify(w1.values.slice(0, 3))}`);
ok('төвд байгаа мөр: утга хоосон тул «—» («Сонгох»-ыг төвд тавина ✓)',
  w1.active === 0 && w1.activeText === '—', `active=${w1.active} text=${JSON.stringify(w1.activeText)}`);
ok('iOS Timer бүтэц: төвийн заагч + `snap-y mandatory` + мөр 40px + хоёр үзүүрийн зай',
  w1.marker && w1.snap === 'y mandatory' && w1.itemH === 40 && w1.pads === 2,
  `marker=${w1.marker} snap=${w1.snap} h=${w1.itemH} pads=${w1.pads}`);
ok('товчнууд: ард тал (хаах) + «Болсон»', w1.backdrop && w1.done);

// ────────────────────────────────────────────────────────────
console.log('\n── ④ МӨР ДЭЭР ДАРАХ → УТГА ФОРМД БИЧИГДЭВ (дугуй НЭЭТЭЙ хэвээр) ──');
await click('[data-wheel-value="9"]');
const w2 = await wheel();
const f2 = await field('totalFloors');
ok('«9» мөр сонгогдов (төвд, `aria-selected="true"`)', w2.active === 9 && w2.values[9] === '9', `active=${w2.active}`);
ok('📱 ГАРААС БИЧИХ оролтод «9» бичигдэв + `data-empty="false"` (өнгө солигдов ✓)',
  f2.inputValue === '9' && f2.trigEmpty === 'false', `value=${f2.inputValue} / ${f2.trigEmpty}`);
ok('🖥 далд гар бичилтэд утга бичигдэв (форм/DB нэг эх сурвалж ✓)',
  f2.inputValue === '9', String(f2.inputValue));
ok('дугуй НЭЭТЭЙ хэвээр (iOS-ийн зан — «Болсон» дарах шаардлагагүй ✓)', w2.open === true);

// ────────────────────────────────────────────────────────────
console.log('\n── ⑤ ГҮЙЛГЭЭ ЗОГСОХОД ТӨВД БАЙГАА МӨР СОНГОГДОНО (settle) ──');
await scrollTo(240);
const f3 = await field('totalFloors');
const w3 = await wheel();
ok('scrollTop 240px (=индекс 6) → «6» оролтод бичигдэв', f3.inputValue === '6', f3.inputValue);
ok('төвд байгаа мөр = индекс 6 (`aria-selected` бодитоор шилжив ✓)',
  w3.active === 6 && w3.values[6] === '6', `active=${w3.active}`);
/** ⚠️ Сүүлийн мөр = индекс `FLOOR_MAX` ⇒ `FLOOR_MAX * 40px` (2026-10-03: 6000px).
 *  Илүү их гүйлгэхэд хязгаарлана (`indexFromScroll` → `maxIndex`) ✓ */
await scrollTo(FLOOR_MAX * 40 + 4000);
const f4 = await field('totalFloors');
ok(`хэт доош гүйлгэхэд СҮҮЛИЙН мөр («${FLOOR_MAX} давхар») — хязгаар ажиллана ✓`,
  f4.inputValue === String(FLOOR_MAX), f4.inputValue);

// ────────────────────────────────────────────────────────────
console.log('\n── ⑥ ХААХ: `Escape` · ард тал · «Болсон» (3 зам) ──');
await pressEscape();
ok('`Escape` → дугуй ХААГДАВ', (await wheel()).open === false);
await click('[data-choice-trigger="totalFloors"]');
ok(`дахин нээхэд өмнө сонгосон утга ХЭВЭЭР («${FLOOR_MAX} давхар» — оролтод ✓)`,
  (await field('totalFloors')).inputValue === String(FLOOR_MAX) && (await wheel()).open === true);
await click('[data-wheel-backdrop]');
ok('ард тал (бараан хэсэг) дарахад ХААГДАВ', (await wheel()).open === false);
await click('[data-choice-trigger="totalFloors"]');
await click('[data-wheel-done]');
ok('«Болсон» дарахад ХААГДАВ', (await wheel()).open === false);

// ────────────────────────────────────────────────────────────
console.log('\n── ⑦ «Байрны давхар»: НИЙТ ДАВХРААС ХЭТРЭХГҮЙ (9 → 1…9) ──');
await click('[data-choice-trigger="totalFloors"]');
await click('[data-wheel-value="9"]');
await click('[data-wheel-done]');
/** 📱 3-р алхам «нэг дэлгэцэд нэг талбар» — «Байрны давхар» нь ӨӨРИЙН дэлгэцтэй ✓ */
ok('📱 «Байрны давхар» дэлгэц рүү гүйлгэв', await detailTo('floor'));
const ff = await field('floor');
/**
 * ⚠️ 2026-10-03 (17): «Байрны давхар» нь БОГИНО жагсаалт (нийт давхар 9 бол
 *    1…9 = 9 мөр) ⇒ 🎡 дугуйн товч ГАРАХГҮЙ (`WHEEL_LINK_MIN` = 40-аас доош),
 *    2 БАГАНАТ ШУУД ЖАГСААЛТ л байна (жишиг сайтын хэв ✓)
 */
ok('📱 «Байрны давхар» — 📱 дээр ч ГАРААС БИЧИЛТ (жагсаалт 0; 1…9 нь WHEEL_LINK_MIN-ээс богино тул 🎡 товчгүй ✓)',
  ff.options === 0 && ff.inputVisible === true && ff.hasTrigger === false,
  `options=${ff.options} input=${ff.inputVisible} trig=${ff.hasTrigger}`);
ok('⌨️ «Байрны давхар»-т ГАРААС «5» бичив (native setter + `input` үйл явдал ✓)',
  (await fillInput('[data-detail-field="floor"] input', '5')) === 'OK');
ok('📱 бичсэн утга нь контролдсон оролт + форм-ийн state-д хадгалагдав («Байрны давхар» = 5 ✓)',
  (await field('floor')).inputValue === '5', String((await field('floor')).inputValue));
ok('📱 гараас бичсэн талбар дээр ДООД «Үргэлжлүүлэх» товч ХАРАГДАНА (дармагц шилжих БИШ ✓)',
  (await detailState()).nextVisible === true);
await click('[data-mobile-detail-next]');
const ffNext = await detailState();
ok('📱 «Үргэлжлүүлэх» дарж дараагийн дэлгэц рүү шилжив (гараас бичилт ⇒ товчоор урагшилна ✓)',
  ffNext.key !== '' && ffNext.key !== 'floor', ffNext.key);

// ────────────────────────────────────────────────────────────
console.log('\n── ⑧ ОН (1980…2026): «—» + БУУРАХ эрэмбэ ──');
/** 📱 3-р алхам «нэг дэлгэцэд нэг талбар» — «Ашиглалтанд орсон он» ӨӨРИЙН дэлгэцтэй ✓ */
ok('📱 «Ашиглалтанд орсон он» дэлгэц рүү гүйлгэв', await detailTo('buildYear'));
await click('[data-choice-trigger="buildYear"]');
const wy = await wheel();
ok('мөр 48 = «—» + 1980…2026 (хоёр хязгаар ОРНО ✓)', wy.rows === 48, String(wy.rows));
ok('эхний мөр «—» (хоосон үлдээх) · 2 дахь = 2026 (шинэ) · сүүлийн = 1980 (хуучин)',
  wy.values[0] === '' && wy.values[1] === '2026' && wy.values[47] === '1980',
  `${JSON.stringify(wy.values[0])} / ${wy.values[1]} … ${wy.values[47]}`);
ok('утга хоосон тул төвд «—» (эхний мөр ✓)', wy.active === 0 && wy.activeText === '—', `active=${wy.active}`);
await click('[data-wheel-value="2015"]');
/** ⚠️ 🎡 дугуй нь `onChange`-оор бичдэг (📱 ч мөн) — 2 баганат сонголт
 *  байхгүй болсон тул утгыг ГАР БИЧИЛТИЙН оролтоос уншина ✓ */
ok('🎡 дугуйнаас «2015» сонгоход гар бичилтийн оролтод «2015» бичигдэв',
  (await field('buildYear')).inputValue === '2015', String((await field('buildYear')).inputValue));
/** 🆕 2026-10-05 (53) — 📅 ОН нь ч 📱 дээр ГАРААС БИЧИГДЭНЭ (2 баганат
 *  жагсаалт БАЙХГҮЙ) ⇒ 🎡 дугуйгүйгээр шууд засаж болно ✓
 * ⚠️ Дараагийн §⑨ 🖥 хэсэг «2015» хүлээдэг тул буцааж бичнэ ✓ */
ok('📱 гараас бичилт нь 2 баганат жагсаалтыг БҮРЭН орлов (options = 0, input харагдана ✓)',
  (await field('buildYear')).options === 0 && (await field('buildYear')).inputVisible === true);
ok('⌨️ «Ашиглалтанд орсон он»-ыг ГАРААС засаж болно («2005» — контролдсон оролт ✓)',
  (await fillInput('[data-detail-field="buildYear"] input', '2005')) === 'OK'
    && (await field('buildYear')).inputValue === '2005',
  String((await field('buildYear')).inputValue));
await fillInput('[data-detail-field="buildYear"] input', '2015');
await click('[data-wheel-done]');

// ────────────────────────────────────────────────────────────
console.log('\n── ⑨ 🖥 1440px: ГАР БИЧИЛТ ХЭВЭЭР + УТГА ХОЁР ХАРАГДАЦАД ХАМТ ──');
await viewport(1440);
const dWheel = await wheel();
const dTotal = await field('totalFloors');
const dYear = await field('buildYear');
const dFloor = await field('floor');
ok('🖥 дээр дугуйн товч ХАРАГДАХГҮЙ (0) — зөвхөн гар бичилт ✓',
  dWheel.visibleTriggers === 0, `visibleTriggers=${dWheel.visibleTriggers}`);
ok('🖥 гар бичилт ХАРАГДАЖ байна + 📱 сонгосон «9» ХАДГАЛАГДАВ',
  dTotal.inputVisible && dTotal.inputValue === '9', `${dTotal.inputVisible} / ${dTotal.inputValue}`);
ok('🖥 «2015 он» ч хадгалагдав', dYear.inputVisible && dYear.inputValue === '2015', String(dYear.inputValue));
ok('🖥 «Байрны давхар» ч хадгалагдав («5»)', dFloor.inputVisible && dFloor.inputValue === '5', String(dFloor.inputValue));

// ────────────────────────────────────────────────────────────
console.log('\n── ⑩ АЛДАА (console.error / exception) ──');
ok('CDP-ийн эхнээс дуустал JS алдаа ГАРАГҮЙ', problems.length === 0, problems.join(' | '));

console.log(fail
  ? `\n❌ ${fail} шалгалт УНАВ (${pass} ✓)\n`
  : `\n✅ Нийт ${pass} шалгалт амжилттай — мобайл дугуй CDP дээр бүрэн ажиллаж байна\n`);
ws.close();
process.exit(fail ? 1 : 0);
