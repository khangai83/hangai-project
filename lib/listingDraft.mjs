// ============================================================
// listingDraft.mjs — 📝 «ЗАР НЭМЭХ» ФОРМЫН НООРОГ (localStorage) ЦЭВЭР ДҮРЭМ
//
// 🎯 ХЭРЭГЛЭГЧИЙН ГОМДОЛ (2026-10-05): «зар нэмж байх үедээ гар утасны browser
//    санамсаргүй refresh хийхэд оруулж байсан мэдээлэл байхгүй болж байна»
//    ⇒ форм нь зөвхөн React-ийн санах ойд (`useState`) байсан тул хуудас
//    дахин ачаалагдмагц (эсвэл 📱 дээр апп сольж, память чөлөөлөгдөхөд)
//    БҮХ оруулсан талбар алга болдог байв ✗
// ✅ ШИЙДЭЛ: оруулсан утгыг `localStorage`-д НООРОГ болгож хадгална
//    (хэрэглэгч бүрд, засах горимд зар бүрд ТУСДАА түлхүүр) — дараагийн
//    ачаалалт дээр сэргээж, хэрэглэгчид «📝 Хадгалагдсан ноорог сэргээгдлээ»
//    мэдэгдэл + 🗑 «Устгах» товч харуулна ✓
//
// ⚠️📱 ЯАГААД `beforeunload` (гарах анхааруулга) БИШ ВЭ:
//    • `beforeunload` нь 📱 iOS Safari/Firefox дээр ХҮЧИНГҮЙ (хэрэгждэггүй) ✗
//    • санамсаргүй REFRESH / апп солих нь «гарах» үйлдэл БИШ тул тэр цонх
//      огт гардаггүй (Chrome ч зөвхөн хэрэглэгчийн үйлдлийн дараа гаргана)
//    ⇒ ГАНЦ найдвартай шийдэл нь утгыг БИЧИХ (энэ модуль) юм ✓
//    ℹ️ Зураг (File) нь `localStorage`-д хадгалагдахгүй тул ноорогт зөвхөн
//       тоо нь (`pendingCount`) үлдэж, мэдэгдэл нь хэрэглэгчид «зургуудаа
//       дахин нэмнэ үү» гэж сануулна ✓
//
// ХАМРАХ ХҮРЭЭ (цэвэр — Node тест `scripts/test-draft.mjs` шууд `import` хийнэ):
//   ① `draftKey(userId, editId)` — түлхүүр (хэрэглэгч/зарын id-аар тусгаарлана)
//   ② `pickDraftForm(form, keys)` — ЗӨВХӨН мэдэгдэж буй түлхүүрүүд
//      (⚠️ «бохир» localStorage-оос payload руу танихгүй талбар орохоос сэргийлнэ)
//   ③ `serializeDraft()` / `parseDraft()` — бичих/унших дүрэм (хувилбар,
//      TTL, `editId` тохирол, хэмжээний хязгаар)
//   ④ `isDirtyForm(form, baseline)` — анхдагч/DB-ийн утгаас ЯЛГААТАЙ эсэх
//      (ноорог хадгалах/устгах шийдвэр) — ⚠️ `baseline` нь JSON мөр ч байж болно
//   ⑤ `isMeaningfulDraft(draft, baseline)` · `draftNoticeText(draft)` — UI
// ============================================================

/** Нооргийн ФОРМАТ хувилбар — бүтэц солигдвол хуучин ноорог ХҮЧИНГҮЙ болно ✓ */
export const DRAFT_VERSION = 1;

/** localStorage-ийн түлхүүрийн угтвар (⚠️ CDP тест үүгээр бүгдийг цэвэрлэнэ) */
export const DRAFT_PREFIX = 'zar:listing-draft';

/**
 * Нооргийн НАС (3 хоног) — ⚠️ хуучин ноорог нь хэрэглэгчид «гэнэтийн»
 * хуучин мэдээлэл сэргээх нь төөрөгдүүлэх тул хугацаа өнгөрвөл ХАЯНА ✓
 * (мөн утас/гарчиг зэрэг мэдээлэл төхөөрөмж дээр үүрд үлдэхээс сэргийлнэ)
 */
export const DRAFT_TTL_MS = 72 * 60 * 60 * 1000;

/** Нооргийн дээд хэмжээ (сүлжээний биш, `localStorage`-ийн хамгаалалт) */
export const DRAFT_MAX_BYTES = 128 * 1024;

/** Нэг талбарын мөрийн дээд урт (хэт урт текст ноорогт орохоос сэргийлнэ) */
const MAX_STRING = 4000;
/** Нэг массивын (ж: `payments`) дээд элемент */
const MAX_ARRAY = 50;
/** `attrs` объектын дээд түлхүүр */
const MAX_ATTR_KEYS = 40;
/** `pendingCount`-ийн дээд утга (хэт утга нооргийн мессежийг эвдэхгүй ✓) */
const MAX_PENDING = 100;
/** `mobileDetailStep`-ийн дээд урт (түлхүүр нь `'title'`, `'attr-…'` мэт богино) */
const MAX_STEP_KEY = 64;
/** Цагийн зөрүүг хүлээх хязгаар (төхөөрөмжийн цаг бага зэрэг урагш байж болно) */
const CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Аюулгүй id (uuid эсвэл тоо) — танихгүй бол ноорог огт үүсгэхгүй ✓ */
const SAFE_ID = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Объект (массив биш) эсэх — ⚠️ ЗӨВХӨН «энгийн» объект (`{}`).
 * `Date`/`File`/`Map` зэрэг нь `JSON.stringify` дээр `{}` болж «алга болдог»
 * (ж: `new Date()` → `{}`) тул тэдгээрийг ноорогт ОРУУЛАХГҮЙ ✓
 */
const isPlainObject = (v) => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
};

/**
 * Нэг утгыг ноорогт оруулах АЮУЛГҮЙ хэлбэрт шилжүүлнэ (эсвэл `undefined`).
 * Зөвшөөрөгдөх: `string` · `number` · `boolean` · энгийн объект · примитив массив
 * ⚠️ `null`/`undefined`/функц/`File` зэргийг ХАЯНА — `JSON.stringify` эвдрэхгүй ✓
 */
export function sanitizeDraftValue(value) {
  const t = typeof value;
  if (t === 'string') return value.slice(0, MAX_STRING);
  if (t === 'number') return Number.isFinite(value) ? value : undefined;
  if (t === 'boolean') return value;
  if (Array.isArray(value)) {
    return value
      .filter((x) => typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean')
      .map((x) => (typeof x === 'string' ? x.slice(0, MAX_STRING) : x))
      .slice(0, MAX_ARRAY);
  }
  if (isPlainObject(value)) {
    const out = {};
    for (const k of Object.keys(value).slice(0, MAX_ATTR_KEYS)) {
      const v = value[k];
      if (typeof v === 'string') out[k] = v.slice(0, MAX_STRING);
      else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
      else if (typeof v === 'boolean') out[k] = v;
    }
    return out;
  }
  return undefined;
}

/**
 * Формоос ЗӨВХӨН `keys` (форм-ийн анхдагч түлхүүрүүд) доторх талбарыг авна.
 * ⚠️ ЯАГААД ШААРДЛАГАТАЙ ВЭ: ноорог нь браузерын `localStorage`-д байдаг ба
 *    хэрэглэгч/devtools-оор өөрчлөх боломжтой ⇒ шүүлтгүй бол `user_id`,
 *    `images`, `id` мэт танихгүй түлхүүр форм руу орж, `handleSubmit`-ийн
 *    payload-д хатна ✗ (whitelist нь хамгаалалтын гол шугам ✓)
 * @param {object} form
 * @param {string[]} keys форм-ийн анхдагч түлхүүрүүд (`Object.keys(emptyForm())`)
 * @returns {object} цэвэр форм (зөвхөн мэдэгдэж буй түлхүүрүүд)
 */
export function pickDraftForm(form, keys) {
  const out = {};
  if (!isPlainObject(form)) return out;
  for (const k of Array.isArray(keys) ? keys : []) {
    if (!Object.prototype.hasOwnProperty.call(form, k)) continue;
    const v = sanitizeDraftValue(form[k]);
    if (v === undefined) continue;
    out[k] = v;
  }
  return out;
}

/**
 * 📝 localStorage-ийн ТҮЛХҮҮР.
 *   `draftKey('<uuid>')`         → `'zar:listing-draft:<uuid>'`      (шинэ зар)
 *   `draftKey('<uuid>', '<id>')` → `'zar:listing-draft:<uuid>:edit:<id>'` (засах)
 * ⚠️ `userId` байхгүй/буруу бол `''` буцаана — тэр үед ноорог ОГТ бичихгүй
 *    (нэвтрээгүй хэрэглэгч формоо ч хардаггүй; бас нэг төхөөрөмж дээр
 *    хэрэглэгч солигдоход хүн бүрийн ноорог ХОЛИЛДОХГҮЙ ✓)
 * @param {string} userId
 * @param {string} [editId]
 * @returns {string} түлхүүр эсвэл `''`
 */
export function draftKey(userId, editId = '') {
  const uid = String(userId || '');
  if (!SAFE_ID.test(uid)) return '';
  const eid = String(editId || '');
  return SAFE_ID.test(eid) ? `${DRAFT_PREFIX}:${uid}:edit:${eid}` : `${DRAFT_PREFIX}:${uid}`;
}

/**
 * Нооргийг МӨР болгоно (localStorage-д бичихэд бэлэн).
 * @param {{form: object, keys: string[], pendingCount?: number,
 *          mobileDetailStep?: string, editId?: string, savedAt?: number}} p
 * @returns {string|null} мөр, эсвэл бичих боломжгүй бол `null`
 */
export function serializeDraft({ form, keys, pendingCount = 0, mobileDetailStep = '', editId = '', savedAt = Date.now() } = {}) {
  const n = Number(pendingCount);
  const payload = {
    v: DRAFT_VERSION,
    editId: String(editId || ''),
    savedAt: Number(savedAt) || Date.now(),
    pendingCount: Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), MAX_PENDING) : 0,
    mobileDetailStep: typeof mobileDetailStep === 'string' ? mobileDetailStep.slice(0, MAX_STEP_KEY) : '',
    form: pickDraftForm(form, keys),
  };
  try {
    return JSON.stringify(payload);
  } catch {
    return null; // тойрог холбоо (circular) гэх мэт — чимээгүй өнгөрөөнө ✓
  }
}

/**
 * Нооргийг УНШИНА. ⚠️ Дараах бүх тохиолдолд `null` — дуудагч нь тэр үед
 * тэр түлхүүрийг ЦЭВЭРЛЭНЭ (хог үлдээхгүй ✓):
 *   • мөр биш/хоосон  • JSON эвдэрсэн  • объект биш  • `v` хувилбар таарахгүй
 *   • `editId` тохирохгүй (шинэ зарын ноорог засах горимд орохгүй ✓)
 *   • `savedAt` буруу/хуучин (TTL) эсвэл ирээдүйд байгаа (цагийн зөрүү)
 * @param {string|null} raw
 * @param {{keys?: string[], editId?: string, now?: number, ttl?: number}} [opts]
 * @returns {{form: object, pendingCount: number, mobileDetailStep: string, savedAt: number}|null}
 */
export function parseDraft(raw, { keys, editId = '', now = Date.now(), ttl = DRAFT_TTL_MS } = {}) {
  if (typeof raw !== 'string' || !raw) return null;
  if (raw.length > DRAFT_MAX_BYTES) return null;
  let d;
  try {
    d = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPlainObject(d)) return null;
  if (Number(d.v) !== DRAFT_VERSION) return null;
  if (String(d.editId || '') !== String(editId || '')) return null;
  const savedAt = Number(d.savedAt);
  if (!Number.isFinite(savedAt) || savedAt <= 0) return null;
  if (savedAt > now + CLOCK_SKEW_MS) return null;
  if (now - savedAt > ttl) return null;
  const pc = Number(d.pendingCount);
  return {
    form: pickDraftForm(d.form, keys),
    pendingCount: Number.isFinite(pc) && pc > 0 ? Math.min(Math.floor(pc), MAX_PENDING) : 0,
    mobileDetailStep: typeof d.mobileDetailStep === 'string' && d.mobileDetailStep.length <= MAX_STEP_KEY
      ? d.mobileDetailStep : '',
    savedAt,
  };
}

/**
 * Форм нь `baseline`-аас ЯЛГААТАЙ эсэх.
 * ⚠️ `baseline` нь объект эсвэл БЭЛЭН JSON мөр байж болно (`baselineRef.current` —
 *    форм дэх дахин тооцоолол хийхгүй ✓)
 * @param {object} form
 * @param {object|string} baseline
 * @returns {boolean} `false` — харьцуулах боломжгүй үед (алдаа шидэхгүй)
 */
export function isDirtyForm(form, baseline) {
  const a = safeJson(form);
  const b = typeof baseline === 'string' ? baseline : safeJson(baseline);
  if (!a || !b) return false;
  return a !== b;
}

/** `JSON.stringify` — алдаа гарвал `''` (тест/UI-д аюулгүй ✓) */
function safeJson(value) {
  try {
    const s = JSON.stringify(value);
    return typeof s === 'string' ? s : '';
  } catch {
    return '';
  }
}

/**
 * Ноорог «үнэ цэнэтэй» эсэх — сэргээх/хадгалах шийдвэр.
 * ⚠️ Хоосон форм (анхдагч утгууд) нь сэргээх юмгүй ⇒ ноорог ХАЯНА ✓
 * @param {{form: object, pendingCount: number}|null} draft
 * @param {object|string} baseline анхдагч форм (шинэ) эсвэл DB-ийн форм (засах)
 */
export function isMeaningfulDraft(draft, baseline) {
  if (!draft || !isPlainObject(draft.form)) return false;
  if (Number(draft.pendingCount) > 0) return true;
  return isDirtyForm(draft.form, baseline);
}

/**
 * 📝 Мэдэгдлийн ТЕКСТ (UI) — ⚠️ нэг эх сурвалж (форм + тест ижил мөрийг
 * шалгана ✓). Зураг хадгалагддаггүй тул тэр тухай сануулга нэмнэ.
 */
export function draftNoticeText(draft) {
  const base = '📝 Хадгалагдсан ноорог сэргээгдлээ';
  return draft && Number(draft.pendingCount) > 0
    ? `${base} — зургуудаа ДАХИН нэмнэ үү (зураг хадгалагдахгүй)`
    : base;
}
