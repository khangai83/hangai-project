// ============================================================
// corsOrigins.mjs — R2 bucket-ийн CORS `AllowedOrigins`-ийг бэлтгэх ЦЭВЭР логик
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-10-02): presigned PUT-ийг **browser** шууд R2 руу
// илгээдэг тул тухайн САЙТЫН домэйн (`Origin` header) нь bucket-ийн CORS
// `AllowedOrigins`-д БАЙХ ЁСТОЙ. Байхгүй бол зөвхөн СОНИНГҮЙ алдаа
// («Failed to fetch») гардаг тул `check:r2` нь домэйн ТУС БҮРЭЭР шалгаж,
// ОРЧУУЛАН бичих JSON-ыг ШУУД хэвлэдэг байх ёстой ✓
//
// ⚠️ CLOUDFLARE-ИЙН ДҮРЭМ (docs: r2/buckets/cors → «Common Issues»):
//   · origin нь ЗӨВХӨН `scheme://host[:port]` — ЗАМ агуулж БОЛОХГҮЙ,
//     төгсгөлийн `/` ч ХҮЧИНГҮЙ (`https://x.com/` → ✗)
//   · `*` нь ХАМГИЙН ИХДЭЭ 1 ширхэг бөгөөд ЦЭГ ДАМЖИЖ болно
//     (`https://*.example.com` → `a.example.com`, `a.b.example.com` ✓
//      харин `example.com` ✗)
//   · ПОРТ дотор `*` БОЛОХГҮЙ → localhost-ийн порт бүрийг ТУС ТУСД нь
//     жагсаана (`http://localhost:3000`, `http://localhost:5173`)
//   · дүрэм тархахад 30 секунд хүртэл хугацаа орж болно
//
// Энэ файл нь ЦЭВЭР (гадаад import/require-ГҮЙ) — тест болон скрипт хоёулаа
// ижил логикийг ашиглана ✓
// ============================================================

/** Анхдагч — локал хөгжүүлэлт (Cloudflare өөрөө ч жишээндээ `http://localhost:3000`) */
export const DEFAULT_CORS_ORIGINS = ['http://localhost:3000'];

// ---------- САНАЛ БОЛГОХ БҮРЭН ЖАГСААЛТ (`npm run r2:cors`) ----------
// ⚠️ Эдгээр нь БҮГД «манай» origin — bucket-ийн CORS-д байхгүй бол тэр сайтаас
//    зураг оруулах ХИЙГДЭХГҮЙ ✗ (зөвхөн «Failed to fetch» / «Load failed» харагдана)

/** 📱 Локал хөгжүүлэлт — утаснаас LAN IP / mDNS нэрээр нээхэд ч upload ажиллана.
 *  ⚠️ `localhost` нь утасны хувьд `localhost` БИШ (өөрөө өөрөө рүү заана) тул
 *  LAN IP болон Mac-ийн `.local` нэрийг ТУС ТУСД нь жагсаана. */
export const LOCAL_CORS_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.1.2:3000', // 📱 Mac-ийн LAN IP (docs/R2_SETUP.md §4-ийн бодит тохиолдол)
  'http://macbook-pro.local:3000', // 📱 mDNS (MacBook-ийн Bonjour нэр)
];

/** 🚀 Vercel — production + preview deploy-ууд (⚠️ `*` нэг ширхэг, ЦЭГ ДАМЖИНА) */
export const VERCEL_CORS_ORIGINS = [
  'https://hangai-project.vercel.app',
  'https://hangai-project-*.vercel.app',
];

/** 🏷 Нийтийн домэйн (өөрийн брэнд) — LIVE эсэхийг `curl -I` эсвэл check:r2-ээр */
export const BRAND_CORS_ORIGINS = ['https://zarbook.mn', 'https://www.zarbook.mn'];

/** ✅ Санал болгох БҮРЭН жагсаалт — `npm run r2:cors -- --apply` үүнийг (＋LAN IP) бичнэ */
export const RECOMMENDED_CORS_ORIGINS = mergeCorsOrigins(
  LOCAL_CORS_ORIGINS,
  VERCEL_CORS_ORIGINS,
  BRAND_CORS_ORIGINS
);

/** CORS-д шаардлагатай бусад тохиргоо (нэг дор — скрипт ба docs салангид биш) */
export const CORS_ALLOWED_METHODS = ['PUT', 'GET', 'HEAD'];
export const CORS_ALLOWED_HEADERS = ['content-type'];
export const CORS_EXPOSE_HEADERS = ['etag'];
export const CORS_MAX_AGE_SECONDS = 3600;

/**
 * Төгсгөлийн `/`-уудыг хасна — Cloudflare түүнийг ХҮЧИНГҮЙ гэж үздэг.
 * (`https://hangai-project.vercel.app/` гэж бичсэн ч зөв болгоно ✓)
 */
export function normalizeCorsOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '');
}

/**
 * Асуудалтай origin-ыг олж монгол тайлбар буцаана; зөв бол `null`.
 * ⚠️ ЗАСАХ БОЛОМЖГҮЙ алдаануудыг л энд барина (зам, 2+ `*`, портын `*`).
 */
export function corsOriginProblem(origin) {
  const o = normalizeCorsOrigin(origin);
  if (!o) return 'хоосон утга';
  if (!/^https?:\/\//i.test(o)) return '`https://` -ээр эхлэх ёстой';
  const afterScheme = o.replace(/^https?:\/\//i, '');
  if (afterScheme.includes('/')) return 'ЗАМ агуулж болохгүй (host-оос хойш `/` байхгүй байх ёстой)';
  const stars = (o.match(/\*/g) || []).length;
  if (stars > 1) return 'зөвхөн НЭГ `*` ашиглаж болно (Cloudflare-ийн хязгаар)';
  if (stars === 1 && /:[^:]*\*/.test(afterScheme)) return 'ПОРТ дотор `*` болохгүй — порт бүрийг тус тусад нь жагсаана';
  return null;
}

/**
 * CORS-д шалгах/бичих origin-уудын жагсаалтыг гаргана.
 *
 *  ① `--origin https://x.mn` (дахин давтаж болно) эсвэл `--origin=https://x.mn`
 *  ② `R2_CORS_ORIGIN=https://a.mn,https://b.mn` (таслалаар)
 *  ③ Аль нь ч өгөгдөөгүй бол `defaults` (localhost:3000)
 *
 * ⚠️ Ямар нэг утга өгвөл ЗӨВХӨН түүнийг шалгана (production домэйн шалгах үед
 *    localhost-ийн ❌ нь саад болохгүй ✓)
 */
export function parseCorsOrigins(argv = [], envValue = '', defaults = DEFAULT_CORS_ORIGINS) {
  const flagged = [];
  const args = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < args.length; i += 1) {
    const a = String(args[i] || '');
    if (a === '--origin' && args[i + 1]) flagged.push(args[i + 1]);
    else if (a.startsWith('--origin=')) flagged.push(a.slice('--origin='.length));
  }
  const fromEnv = String(envValue || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const explicit = [...flagged, ...fromEnv].map(normalizeCorsOrigin).filter(Boolean);
  const source = explicit.length ? explicit : (defaults || []).map(normalizeCorsOrigin).filter(Boolean);

  const seen = new Set();
  return source.filter((o) => (seen.has(o) ? false : (seen.add(o), true)));
}

/**
 * Cloudflare-ийн «CORS Policy» талбарт ШУУД буулгах JSON (шалгалтын скрипт хэвлэнэ).
 * ⚠️ `AllowedOrigins` нь өгсөн жагсаалт ЯГ ТЭР — хэрэглэгч хуулж тааруулж бичих
 * шаардлагагүй ✓
 */
export function corsPolicyJson(origins = DEFAULT_CORS_ORIGINS, { pretty = true } = {}) {
  const list = (origins || []).map(normalizeCorsOrigin).filter(Boolean);
  const policy = [
    {
      AllowedOrigins: list.length ? list : DEFAULT_CORS_ORIGINS.slice(),
      AllowedMethods: CORS_ALLOWED_METHODS.slice(),
      AllowedHeaders: CORS_ALLOWED_HEADERS.slice(),
      ExposeHeaders: CORS_EXPOSE_HEADERS.slice(),
      MaxAgeSeconds: CORS_MAX_AGE_SECONDS,
    },
  ];
  return pretty ? JSON.stringify(policy, null, 2) : JSON.stringify(policy);
}

/**
 * Хэд хэдэн жагсаалтыг НЭГТГЭж, давхардлыг цэвэрлэнэ (дараалал хадгална).
 * ⚠️ Хоосон/буруу утга ХАСАГДАНА — Cloudflare-д хоосон origin бичих нь
 *    бүх дүрмийг унагаж болзошгүй тул урьдчилан шүүнэ ✓
 */
export function mergeCorsOrigins(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const raw of Array.isArray(list) ? list : []) {
      const o = normalizeCorsOrigin(raw);
      if (!o || seen.has(o)) continue;
      seen.add(o);
      out.push(o);
    }
  }
  return out;
}

/**
 * Одоогийн ба санал болгож буй жагсаалтын ЯЛГАА (юу нэмэгдэх, юу хасагдах).
 * ⚠️ `PutBucketCors` нь БҮХ дүрмийг ДАРЖ БИЧДЭГ тул бичихийн ӨМНӨ юу
 *    хасагдахыг харуулах нь ЗААВАЛ (санамсаргүй production домэйн унахаас
 *    сэргийлнэ) ✓
 */
export function corsOriginsDiff(current = [], next = []) {
  const cur = mergeCorsOrigins(current);
  const nxt = mergeCorsOrigins(next);
  const curSet = new Set(cur);
  const nxtSet = new Set(nxt);
  return {
    added: nxt.filter((o) => !curSet.has(o)),
    removed: cur.filter((o) => !nxtSet.has(o)),
  };
}

/**
 * Mac-ийн ГАДААД (internal биш) IPv4 хаягуудаас локал origin үүсгэнэ —
 * 📱 утаснаас LAN-аар нээхэд яг энэ origin `AllowedOrigins`-д байх ёстой ✓
 *
 * ⚠️ Ингэснээр DHCP-ээс IP солигдсон ч `npm run r2:cors -- --apply` дахин
 *    ажиллуулахад шинэ IP автоматаар нэмэгдэнэ ✓ (гараар бичих шаардлагагүй)
 *
 * @param {object} networkInterfaces `os.networkInterfaces()`-ийн буцаалт
 * @param {number} [port]             dev server-ийн порт (анхдагч 3000)
 */
export function lanCorsOrigins(networkInterfaces = {}, port = 3000) {
  const out = [];
  for (const list of Object.values(networkInterfaces || {})) {
    for (const ni of Array.isArray(list) ? list : []) {
      if (!ni || ni.internal) continue;
      const family = typeof ni.family === 'string' ? ni.family : ni.family === 4 ? 'IPv4' : '';
      if (family !== 'IPv4') continue;
      const address = String(ni.address || '').trim();
      if (!address) continue;
      out.push(`http://${address}:${port}`);
    }
  }
  return mergeCorsOrigins(out);
}
