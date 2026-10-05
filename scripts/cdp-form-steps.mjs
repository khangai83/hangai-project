// ============================================================
// cdp-form-steps.mjs — 🖥 3 ХУУДАС (3, 4 БА 5-Р АЛХАМ НЭГ БОЛОВ) CDP ШАЛГАЛТ
//
// 🎯 ЮУГ ШАЛГАХ ВЭ (2026-10-05, 57 — хэрэглэгчийн хүсэлт: «step 1, 2 нь
//    тусдаа хуудас — энэ зөв; step 3 нь 1, 2-ын араас орж ирдэг; харин
//    step 3, 4, 5-ыг НЭГ болго»):
//    БОДИТ Chrome (CDP) дээр:
//     ① 🖥 1440px · `?step=3` — 3, 4 ба 5-р алхам НЭГ хуудас: `details` +
//        `price` + `desc` + `media` + `media-images` = ЯГ 5 блок харагдана ✓,
//        breadcrumb нь «Дэлгэрэнгүй ба үнэ, зураг» ✓, доод товч = «✅ Зар
//        нийтлэх» (`[data-step-submit]`) ба `[data-step-next]` DOM-д
//        БАЙХГҮЙ ✗ (эс бөгөөд 🖥 дээр «Үргэлжлүүлэх» дарж ХООСОН хуудас руу
//        орно ✗)
//     ② 📱 390px — ХӨНДӨГДӨӨГҮЙ (5 дэлгэц хэвээр): `?step=3` дээр ЗӨВХӨН
//        `details`; `?step=4` дээр `price`+`desc` (`media` нуугдсан ✓);
//        `?step=5` дээр `media`+`media-images` ✓
//     ③ 🖥 дээр `?step=4`/`?step=5` хаягаар (эсвэл 📱→🖥 resize-ээр) орсон ч
//        хуудас ХАГАС ХООСОН болохгүй ✓ (5 блок хамт харагдана ✓)
//     ④ `[data-step-back]` — 🖥 ?step=3 → ?step=2 «Байршил» ✓
//     ⑤ JS алдаа: `exception` / `console.error` ГАРАГҮЙ ✓
//
// ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
//   1) сервер ажиллаж байх (`npm run build && npm start`)
//      ℹ️ Өөр порт: `node scripts/cdp-form-steps.mjs http://localhost:3100`
//   2) Chrome алсын дебагттай + НЭВТЭРСЭН профайлаар:
//      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
//        --headless=new --remote-debugging-port=9222 \
//        --user-data-dir=/tmp/chrome-prof-zar http://localhost:3000/
//      ⚠️ Форм нь ЗӨВХӨН нэвтэрсэн хэрэглэгчид харагдана
//   Дараа нь:  npm run cdp:steps
//
// ⚠️ Форм нь ноорог (`localStorage`) хадгалдаг тул энэ тест ЭХЭНД ба ТӨГСӨЛД
//    `zar:listing-draft…` түлхүүрүүдийг ЦЭВЭРЛЭНЭ ✓ (`sb-…-auth-token`
//    нэвтрэлт ХӨНДӨГДӨХГҮЙ ✓)
// ⚠️ «✅ Зар нийтлэх»-ийг ДАРАХГҮЙ ✗ — DB-д туршилтын зар үүсэхээс сэргийлнэ ✓
// 🔍 Хайх үг: cdp-form-steps, lastStepIndex, Дэлгэрэнгүй ба үнэ, зураг,
//    data-step-submit
// ============================================================
const BASE = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const CDP = `http://127.0.0.1:${process.env.CDP_PORT || 9222}`;

/** 🖥 дээр 3, 4 ба 5-р алхам НЭГ хуудас болсон үед ХАРАГДАХ ёстой 5 блок */
const MERGED_BLOCKS = ['details', 'price', 'desc', 'media', 'media-images'];
/** 📱 <640px · 3 дахь дэлгэц */
const MOBILE_STEP3 = ['details'];
/** 📱 <640px · 4 дэх дэлгэц */
const MOBILE_STEP4 = ['price', 'desc'];
/** 📱 <640px · 5 дахь дэлгэц */
const MOBILE_STEP5 = ['media', 'media-images'];

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
 * 📝 НООРОГ ЦЭВЭРЛЭХ (2026-10-05, 54/57) — форм нь оруулсан утгаа
 *    `localStorage`-д ноорог болгож хадгалдаг (`lib/listingDraft.mjs`) ⇒
 *    үлдсэн ноорог нь дараагийн тестүүдийн «форм ХООСОН» шалгалтыг
 *    унагана ✗ ⇒ ЭХЭНД ба ТӨГСӨЛД ЦЭВЭРЛЭНЭ ✓
 * ⚠️ Зөвхөн `zar:listing-draft…` угтвартай түлхүүр (`sb-…-auth-token` ✓ хэвээр)
 */
const clearDrafts = () => evaluate(`(() => {
  const keys = Object.keys(window.localStorage).filter((k) => k.indexOf('zar:listing-draft') === 0);
  keys.forEach((k) => window.localStorage.removeItem(k));
  return keys.length;
})()`);
await clearDrafts();
await rpc('Page.navigate', { url: `${BASE}/listings/new` });
await wait(4500);

const click = async (sel) => {
  const res = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NOT_FOUND'; el.click(); return 'OK'; })()`);
  await wait(500);
  return res;
};
const clickVisible = async (sel) => {
  const res = await evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => {
      const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0;
    });
    if (!el) return 'NOT_FOUND';
    el.click(); return 'OK';
  })()`);
  await wait(600);
  return res;
};
const clickNext = async () => {
  const res = await evaluate(`(() => { const b = document.querySelector('form [data-step-next]'); if (!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()`);
  await wait(900);
  return res;
};
const viewport = async (w, h = 1400) => {
  await rpc('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 640 });
  await wait(900);
};

/** 🔎 Алхмын агшин зураг — харагдаж буй блокууд · breadcrumb · доод товчнууд */
const PROBE = `(() => {
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const form = document.querySelector('form');
  const blocks = [...document.querySelectorAll('[data-step-block]')];
  const btn = (sel) => {
    const b = form ? form.querySelector(sel) : null;
    return { present: !!b, visible: vis(b), text: b ? (b.innerText || '').trim() : '', type: b ? (b.getAttribute('type') || '') : '' };
  };
  return {
    url: location.search,
    step: ((document.querySelector('[data-step-current]') || {}).innerText || '').trim(),
    visibleBlocks: blocks.filter(vis).map((el) => el.dataset.stepBlock),
    hiddenBlocks: blocks.filter((el) => !vis(el)).map((el) => el.dataset.stepBlock),
    labels: form ? [...form.querySelectorAll('label')].filter(vis).map((l) => l.textContent.trim()) : [],
    next: btn('[data-step-next]'),
    /* 📱 «асуулт бүр нэг дэлгэц» горимын ӨӨРИЙН товч (data-mobile-detail-next)
       ⚠️ 📱 дээр форм-ийн [data-step-next] нь hide-below-sm-ээр НУУГДДАГ
          (зөвхөн 🖥-ийн 3 дахь хуудас / 📱-ийн 4, 5 дахь дэлгэцэд харагдана) ⇒
          📱-ийн 3 дахь дэлгэц дээр «Үргэлжлүүлэх» ХАРАГДАЖ байгааг ЭНЭ товчоор
          шалгана ✓ (🐛 давхар товч 0 — зөвхөн НЭГ нь харагдана ✓)
       ⚠️ ЭНЭ бүхэн TEMPLATE LITERAL дотор байгаа тул backtick БИЧИХГҮЙ ✗ */
    mobileNext: (() => {
      const b = document.querySelector('[data-mobile-detail-next]');
      return { present: !!b, visible: vis(b), text: b ? (b.innerText || '').trim() : '' };
    })(),
    submit: btn('[data-step-submit]'),
    back: btn('[data-step-back]'),
  };
})()`;
const probe = () => evaluate(PROBE);

/** 🗂 1-р алхмын 3 баганын сонголт (`data-picker`) */
const pick = async (picker, value) => {
  const res = await evaluate(`(() => {
    const b = document.querySelector('[data-picker="${picker}"] button[data-picker-value="${value}"]');
    if (!b) return 'NOT_FOUND';
    b.click(); return 'OK';
  })()`);
  await wait(700);
  return res;
};
const pickFirst = async (picker) => {
  const res = await evaluate(`(() => {
    const b = document.querySelector('[data-picker="${picker}"] button[data-picker-value]');
    if (!b) return 'NOT_FOUND';
    const v = b.dataset.pickerValue;
    b.click(); return v;
  })()`);
  await wait(700);
  return res;
};
/** 🏷️ 3-р алхмын ЗААВАЛ талбар (гарчиг) — React-ийн хяналттай input-д бичнэ */
const fillTitle = async (v) => {
  const res = await evaluate(`(() => {
    const box = document.querySelector('[data-detail-field="title"]');
    const el = box ? box.querySelector('input, textarea') : null;
    if (!el) return 'NOT_FOUND';
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(v)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return 'OK';
  })()`);
  await wait(600);
  return res;
};

/** 🤝 «Үнэ тохирно» — 4-р алхмын ЗААВАЛ шалгалтыг (`validateStep('price')`) хангана
 *  ⚠️ Үнэ хоосон ба «Үнэ тохирно» тэмдэглээгүй бол 📱 дээр «Үргэлжлүүлэх»
 *     ХӨДЛӨХГҮЙ ✗ (алдаа гарна) ⇒ 5 дахь дэлгэц рүү явахын өмнө тэмдэглэнэ ✓ */
const tickNegotiable = async () => {
  const res = await evaluate(`(() => {
    const boxes = [...document.querySelectorAll('form input[type="checkbox"]')]
      .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (!boxes.length) return 'NOT_FOUND';
    boxes[0].click();
    return 'OK';
  })()`);
  await wait(700);
  return res;
};

// ────────────────────────────────────────────────────────────
console.log('\n── ① 🖥 1440px: 1, 2 дахь алхам (Ангилал → Байршил) ──');
ok('💻 «Компьютер» сонгогдов', (await pick('section', 'computers')) === 'OK');
await pickFirst('level2');
await pickFirst('level3');
await pickFirst('loc-city');
await pickFirst('loc-district');
const khoroo = await pickFirst('loc-khoroo');
ok('1-р алхам: 🗂 3 багана + 📍 байршил сонгогдов', typeof khoroo === 'string', String(khoroo));

await clickNext();
let p = await probe();
ok('② 2-Р АЛХАМ (breadcrumb «Байршил») ✓', p.step === 'Байршил', JSON.stringify(p.step));
ok('② 2-р алхам: зөвхөн `location` блок харагдана ✓',
  JSON.stringify(p.visibleBlocks) === '["location"]', JSON.stringify(p.visibleBlocks));

await clickNext();
p = await probe();
ok('③ 3-Р АЛХАМ руу шилжив (`?step=3`) ✓', p.url.includes('step=3'), p.url);
ok('🧭 breadcrumb = «Дэлгэрэнгүй ба үнэ, зураг» ✓',
  p.step === 'Дэлгэрэнгүй ба үнэ, зураг', JSON.stringify(p.step));
ok('🧩 5 блок ХАМТ харагдана (`details` · `price` · `desc` · `media` · `media-images`) ✓',
  JSON.stringify(p.visibleBlocks) === JSON.stringify(MERGED_BLOCKS), JSON.stringify(p.visibleBlocks));
ok('🧩 ①② блок (`category` · `location`) НУУГДСАН ✓',
  JSON.stringify(p.hiddenBlocks) === '["category","location"]', JSON.stringify(p.hiddenBlocks));
ok('📋 Дэлгэрэнгүй + 💰 Үнэ + 📝 Тайлбар + ☎️ утас + 🖼 Зураг — БҮГД нэг хуудсанд ✓',
  ['Үнэ', 'Тайлбар', 'Холбоо барих утас *', 'Зураг оруулах'].every((l) => p.labels.includes(l)),
  JSON.stringify(p.labels));
ok('🪜 `[data-step-next]` DOM-д БАЙХГҮЙ ✗ (🖥 дээр ХООСОН хуудас руу явахгүй ✓)',
  p.next.present === false, JSON.stringify(p.next));
ok('✅ `[data-step-submit]` ХАРАГДАЖ байна + «Зар нийтлэх» + `type=submit` ✓',
  p.submit.present && p.submit.visible && p.submit.text === '✅ Зар нийтлэх' && p.submit.type === 'submit',
  JSON.stringify(p.submit));
ok('← `[data-step-back]` харагдаж байна ✓', p.back.present && p.back.visible, JSON.stringify(p.back));
ok('🏷️ «Зарын гарчиг» бөглөгдөв (заавал талбар) ✓', (await fillTitle('CDP алхмын тест')) === 'OK');

// ────────────────────────────────────────────────────────────
console.log('\n── ② 📱 390px: 5 ДЭЛГЭЦ ХӨНДӨГДӨӨГҮЙ (3 / 4 / 5 ТУСДАА) ──');
await viewport(390, 900);
p = await probe();
ok('📱 ?step=3 дээр зөвхөн `details` (💰 Үнэ · 🖼 Зураг НУУГДСАН ✓)',
  JSON.stringify(p.visibleBlocks) === JSON.stringify(MOBILE_STEP3), JSON.stringify(p.visibleBlocks));
ok('📱 breadcrumb = «Дэлгэрэнгүй» (🖥-ийн «Дэлгэрэнгүй ба үнэ, зураг» БИШ ✓)',
  p.step === 'Дэлгэрэнгүй', JSON.stringify(p.step));
ok('🪜 📱 3 дахь дэлгэц дээр «Үргэлжлүүлэх» нь mobile wizard-ийн ӨӨРИЙН товч (`[data-mobile-detail-next]`) — ХАРАГДАЖ байна ✓',
  p.mobileNext.present && p.mobileNext.visible && p.mobileNext.text === 'Үргэлжлүүлэх →',
  JSON.stringify(p.mobileNext));
ok('🪜 ⚠️ форм-ийн `[data-step-next]` 📱 дээр НУУГДСАН (🐛 давхар товч 0 ✓ — 📱-ийн алхмыг mobile wizard хөтөлнө ✓)',
  p.next.present === true && p.next.visible === false, JSON.stringify(p.next));
ok('✅ `[data-step-submit]` DOM-д БАЙХГҮЙ ✗ (📱 дээр 4, 5 дахь дэлгэц үлдсэн ✓)',
  p.submit.present === false, JSON.stringify(p.submit));

await clickNext();
p = await probe();
ok('📱 4-Р ДЭЛГЭЦ рүү шилжив (`?step=4`) ✓', p.url.includes('step=4'), p.url);
ok('📱 ?step=4 дээр зөвхөн `price` + `desc` (🖼 `media` НУУГДСАН ✓)',
  JSON.stringify(p.visibleBlocks) === JSON.stringify(MOBILE_STEP4), JSON.stringify(p.visibleBlocks));
ok('📱 ?step=4: breadcrumb = «Үнэ» ✓', p.step === 'Үнэ', JSON.stringify(p.step));

ok('🤝 «Үнэ тохирно» тэмдэглэв (4-р алхмын заавал шалгалт ✓)', (await tickNegotiable()) === 'OK');
await clickNext();
p = await probe();
ok('📱 5-Р ДЭЛГЭЦ рүү шилжив (`?step=5`) ✓', p.url.includes('step=5'), p.url);
ok('📱 ?step=5: `media` + `media-images` харагдана ✓',
  JSON.stringify(p.visibleBlocks) === JSON.stringify(MOBILE_STEP5), JSON.stringify(p.visibleBlocks));
ok('📱 ?step=5: breadcrumb = «Зураг» ✓', p.step === 'Зураг', JSON.stringify(p.step));
ok('✅ `[data-step-submit]` ХАРАГДАЖ байна («✅ Зар нийтлэх» ✓)',
  p.submit.present && p.submit.visible && p.submit.text === '✅ Зар нийтлэх', JSON.stringify(p.submit));

// ────────────────────────────────────────────────────────────
console.log('\n── ③ 🖥 1440px (буцаж): ?step=5 ч НЭГТГЭСЭН 5 БЛОК ──');
await viewport(1440);
p = await probe();
ok('🖥 resize (📱→🖥) хийсний дараа ч ?step=5 дээр 5 блок ХАМТ ХАРАГДАНА ✓ (хуудас хагас хоосон болохгүй ✓)',
  JSON.stringify(p.visibleBlocks) === JSON.stringify(MERGED_BLOCKS), JSON.stringify(p.visibleBlocks));
ok('🧭 `?step=5` дээр ч breadcrumb = «Дэлгэрэнгүй ба үнэ, зураг» ✓ (🖥 дээр нэг хуудас = нэг нэр ✓)',
  p.step === 'Дэлгэрэнгүй ба үнэ, зураг', JSON.stringify(p.step));
ok('🖥 `?step=5` дээр ч «✅ Зар нийтлэх» ✓',
  p.submit.visible && p.submit.text === '✅ Зар нийтлэх', JSON.stringify(p.submit));
ok('🖥 Товч ХОЁР БАЙХГҮЙ — `[data-step-next]` 0 ба `[data-step-submit]` 1 ✓',
  p.next.present === false && p.submit.present === true,
  `${JSON.stringify(p.next)} / ${JSON.stringify(p.submit)}`);

// ────────────────────────────────────────────────────────────
console.log('\n── ④ ← Буцах: ?step=5 → ?step=4 → ?step=3 (нэгтгэсэн) → ?step=2 ──');
await clickVisible('[data-step-back]');
p = await probe();
ok('← Буцах (1 дэх): `?step=4` = НЭГТГЭСЭН хуудас ✓', p.url.includes('step=4'), p.url);
ok('🧩 ?step=4 дээр ч 5 блок ХАМТ харагдсаар байна ✓',
  JSON.stringify(p.visibleBlocks) === JSON.stringify(MERGED_BLOCKS), JSON.stringify(p.visibleBlocks));

await clickVisible('[data-step-back]');
p = await probe();
ok('← Буцах (2 дахь): `?step=3` = НЭГТГЭСЭН сүүлийн хуудас ✓ (📱-ийн 3 дэлгэц 🖥 дээр НЭГДЭНЭ ✓)',
  p.url.includes('step=3'), p.url);
ok('🧭 breadcrumb = «Дэлгэрэнгүй ба үнэ, зураг» ✓',
  p.step === 'Дэлгэрэнгүй ба үнэ, зураг', JSON.stringify(p.step));
ok('🧩 5 блок ХАМТ харагдсаар байна ✓',
  JSON.stringify(p.visibleBlocks) === JSON.stringify(MERGED_BLOCKS), JSON.stringify(p.visibleBlocks));

await clickVisible('[data-step-back]');
p = await probe();
ok('← Буцах (3 дахь): 2-Р АЛХАМ (`?step=2`) руу буцлаа ✓', p.url.includes('step=2'), p.url);
ok('🧭 breadcrumb = «Байршил» ✓', p.step === 'Байршил', JSON.stringify(p.step));
ok('🧩 зөвхөн `location` блок харагдана (дэлгэрэнгүй/үнэ/зураг НУУГДСАН ✓)',
  JSON.stringify(p.visibleBlocks) === '["location"]', JSON.stringify(p.visibleBlocks));

// ────────────────────────────────────────────────────────────
console.log('\n── ⑤ ЦЭВЭРЛЭГЭЭ ба АЛДАА ──');
const cleared = await clearDrafts();
ok(`📝 Ноорог цэвэрлэгдэв (${cleared} түлхүүр) — бусад тестүүд «хоосон форм»-оор эхэлнэ ✓`, cleared >= 0);
ok('JS алдаа (exception / console.error) ГАРАГҮЙ ✓', problems.length === 0, problems.join(' | '));

console.log(fail
  ? `\n❌ ${fail} шалгалт УНАВ (${pass} ✓)\n`
  : `\n✅ Нийт ${pass} шалгалт амжилттай — 🖥 дээр 3, 4 ба 5-р алхам НЭГ хуудас (3 хуудас), 📱 дээр 5 дэлгэц хэвээр\n`);
ws.close();
process.exit(fail ? 1 : 0);


