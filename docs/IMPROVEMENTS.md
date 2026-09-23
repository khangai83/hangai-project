# Сайжруулах саналууд — шинжилгээний тэмдэглэл

> Энэ файл нь **2026-09-23**-ны байдлаар кодын санг бүрэн уншиж, шалгаж гаргасан
> сайжруулах саналуудын жагсаалт. Ажил эхлэх/дуусах бүрд эндээс хасаж, шинэчилж
> байх нь зүйтэй — ингэснээр «юу хийх үлдсэн бэ» гэдэг нэг л газарт харагдана.
>
> ⚠️ Бүх заалт нь **тухайн үеийн кодын мөр/файл** дээр суурилсан. Код өөрчлөгдвөл
> мөрийн дугаар шилжиж болно — файлын нэр, функцээр хайх нь найдвартай.

---

## Тэргүүлэх чиглэл (нэг харцаар)

| № | Ажил | Түвшин | Хүрээ | Файл |
|---|---|---|---|---|
| 1 | SMS илгээлтэд rate limit | 🔴 яаралтай (мөнгө) | 1 өдөр | `app/api/auth/register/start/route.js` |
| 2 | Хайлтын утгыг PostgREST шүүлт рүү escape хийх | 🔴 яаралтай | 2 цаг | `lib/queries.js:48-54` |
| 3 | Үзсэн/таалагдсан тоолуурын хамгаалалт | 🔴 яаралтай | 3 цаг | `lib/listingStats.js:31` |
| 4 | Зарын төлөв + дуусах хугацаа | 🟠 том UX | 2 өдөр | `supabase/migrations/` + `lib/queries.js` |
| 5 | Зарын OG metadata + sitemap/robots | 🟡 SEO | 1 өдөр | `app/listings/[id]/page.jsx` |
| 6 | Pagination + `select` нарийсгах | 🟠 хурд | 1 өдөр | `lib/queries.js:40-42` |
| 7 | ESLint + CI + нэгж тест | 🟢 чанар | 1 өдөр | `package.json`, `.github/` |
| 8 | 19 аймгийн сум | 🟡 бүрэн бус | 0.5 өдөр | `lib/locationData.js` |
| 9 | Нууц үг сэргээх | 🟠 гарц алга | 1 өдөр | `app/api/auth/` |
| 10 | `next/image` руу шилжих | 🟡 хурд | 0.5 өдөр | `components/*.jsx` |

---

## 🔴 1. Аюулгүй байдал / зардал / найдвар

### 1.1 SMS-д rate limit ОГТ байхгүй

**Байрлал:** `app/api/auth/register/start/route.js`

Нэг хүн энэ endpoint-ыг дараалан дуудахад verify.mn-ийн **үнэтэй SMS** бүр
илгээгдэнэ (README-д 150₮ гэж тэмдэглэсэн). Одоогоор IP, утасны дугаар, эсвэл
сесс түвшний **ямар ч хязгаарлалт байхгүй**:

```
$ grep -rni 'ratelimit|rate_limit|captcha|recaptcha' app lib components
(илэрц байхгүй)
```

**Эрсдэл:** 100 дараалсан хүсэлт = ~15,000₮. Халдагч хэдхэн минутад
сарын төсвийг шавхаж чадна (SMS bombing).

**Санаа:** `lib/rateLimit.js` үүсгэж хоёр шатлалтай хамгаалалт тавих:

```js
// lib/rateLimit.js — (түр зуурын, in-memory)
const buckets = new Map();               // key -> { count, resetAt }

export function hit(key, limit, windowMs) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfter: 0 };
}
```

`route.js` дотор:

```js
const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
const byIp = hit(`sms:ip:${ip}`, 5, 10 * 60 * 1000);                // IP: 10 мин тутамд 5
const byPhone = hit(`sms:phone:${phone}`, 3, 24 * 60 * 60 * 1000);  // утас: 24ц тутамд 3
if (!byIp.ok || !byPhone.ok) {
  return NextResponse.json(
    { ok: false, code: 'RATE_LIMITED',
      error: 'Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу.' },
    { status: 429,
      headers: { 'Retry-After': String(Math.max(byIp.retryAfter, byPhone.retryAfter)) } }
  );
}
```

> ⚠️ Vercel нь serverless — in-memory Map нь **instance тус бүрд** ажилладаг тул
> бодит production-д бүрэн хамгаалалт болохгүй. Тогтмол ачаалалтай үед
> **Upstash Redis** (`@upstash/ratelimit`) руу шилжүүлэх шаардлагатай.
> In-memory хувилбар нь «санамсаргүй давхар дарах»-ыг аль хэдийн зогсооно.

### 1.2 Хайлтын утга PostgREST шүүлт рүү ШУУД бичигддэг

**Байрлал:** `lib/queries.js:48-54`, мөн `lib/adminAuth.js:243-257`

```js
const search = normalizeSearch(filters.search);   // зөвхөн .trim() хийдэг
if (search) {
  const kw = `%${search}%`;
  query.or(
    `property_type.ilike.${kw},district.ilike.${kw},city.ilike.${kw},` +
    `khoroo.ilike.${kw},address_detail.ilike.${kw},contact_name.ilike.${kw}`
  );
}
```

`normalizeSearch()` нь зөвхөн `trim()` хийдэг (`lib/queries.js:26-28`). Тиймээс:

| Оролт | Үр дагавар |
|---|---|
| `x,id.gt.0` | `.or()`-ийн мөр шүүлт нэмэгдэж, бусад шүүлт тойрогдоно |
| `)` | PostgREST алдаа шидэж, хайлт бүхэлдээ нурна |
| `%` | Бүх зар татагдана (300 хүртэл) — гүйцэтгэлд нөлөөлнө |
| `_` | Дурын нэг тэмдэгтийн wildcard |

**Санаа:** escape хийх туслах функц:

```js
/** PostgREST-ийн ilike-д аюулгүй утга болгох ('75%' → '%75\%%') */
function escapeLike(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')   // эхлээд backslash
    .replace(/[%_]/g, (m) => `\\${m}`)
    .replace(/[(),]/g, '');   // шүүлтийн бүтэц эвдэх тэмдэгтүүдийг хасна
}
```

### 1.3 «Үзсэн» / ❤️ тоог хязгааргүй хавдаж болно

**Байрлал:** `lib/listingStats.js:31` (`resolveViewer`), `app/api/listings/[id]/view/route.js`

Зочин хүнийг `d:${body.device}` гэж танина — `device` нь **клиентээс илгээсэн
дурын текст** (`.slice(0, 64)` л хийдэг). Тиймээс:

```bash
# нэг зард 10,000 «үзсэн» нэмэх
for i in $(seq 1 10000); do
  curl -X POST localhost:3000/api/listings/<uuid>/view \
       -H 'content-type: application/json' -d "{\"device\":\"fake-$i\"}"
done
```

Тоолуур нь зарын карт дээр нийтэд харагддаг (`components/ListingCard.jsx`) тул
**итгэлцэлд шууд нөлөөлөх** асуудал.

**Санаа (дарааллаар нь):**
1. Нэг IP-ээс нэг зард 24 цагт 1 удаа (`lib/rateLimit.js`-ийг дахин ашиглах)
2. `device`-ийг зөвхөн **httpOnly cookie**-гээр сервер өөрөө олгох (клиентээс авахгүй)
3. UI дээр «баталгаатай үзсэн» (зөвхөн нэвтэрсэн хэрэглэгч) ба «нийт» гэж ялгах

### 1.4 `npm run lint` эвдэрхий

**Байрлал:** `package.json:10`

```json
"lint": "next lint"
```

Гэтч `devDependencies`-д **eslint огт байхгүй**, `.eslintrc*` / `eslint.config.*`
файл ч байхгүй:

```
$ npx eslint --version
npm error npx canceled due to missing packages and no YES option: ["eslint@10.11.0"]
```

Мөн код дотор **12 газар** `// eslint-disable-next-line react-hooks/exhaustive-deps`
бичсэн — lint ажиллахгүй байгаа тул hooks-ийн дүрэм алгасагдсан хэвээр байна.

**Санаа:** `npm i -D eslint eslint-config-next` + `eslint.config.mjs` (flat config)
нэмээд, дараа нь 12 disable-ийг бодит засвар болгох.

---

## 🟠 2. Гүйцэтгэл

| # | Асуудал | Байрлал | Санаа |
|---|---|---|---|
| 2.1 | `limit(300)`, pagination огт байхгүй | `lib/queries.js:42` | `.range(from,to)` + cursor (`created_at,id`). 300-аас олон зар болмогц «алга болсон» мэт харагдана |
| 2.2 | `select('*')` — `images` jsonb (10 URL) карт бүрт татагдана | `lib/queries.js:40` | Карт дээр хэрэгтэй багануудыг л сонгох → payload 2-3× багасна |
| 2.3 | Бүх хуудас client-side fetch | `components/HomeClient.jsx:63` | Нүүр хуудсыг server component + `export const revalidate = 60` болговол эхний будалт + SEO сайжирна |
| 2.4 | Статистикийг 2000 мөр татаж JS-д агрегацлана | `lib/queries.js:569-591` (код дотор нь ч тэмдэглэсэн) | SQL view/RPC (`price_per_m2_stats`) руу шилжүүлэх |
| 2.5 | Зураг `unoptimized: true` + 6 түүхий `<img>` | `next.config.mjs:12`, `ListingCard.jsx:26`, `ListingDetailClient.jsx:198` | `next/image` эсвэл Supabase Storage-ийн `render/image?width=400` — 1600px JPEG-ийг 400px карт дээр татаж байна |
| 2.6 | `%kw%` ilike индекс ашиглахгүй | `lib/queries.js:51` | 500+ зар болсны дараа `pg_trgm` индекс эсвэл `tsvector` full-text |
| 2.7 | `fetchPropertyTypeCounts` — 8 зэрэгцээ count query | `lib/queries.js:86-...` | Нэг SQL view/RPC болговол 8 → 1 хүсэлт |

**2.2-ын жишээ:**

```js
// Одоо:  бүх багана (images jsonb-ийг ч) татна
.select('*')

// Санаа: карт дээр хэрэгтэй нь л
.select('id, category, property_type, rooms, area, price, price_type, ' +
        'city, district, khoroo, images, views, likes, created_at, ' +
        'build_year, floor, total_floors, balconies, has_garage')
```

> 💡 Дэлгэрэнгүй хуудас (`fetchListingById`) бүтэн багана авах хэвээр байж болно.

---

## 🟡 3. SEO — одоо бараг байхгүй

Шалгасан: `grep -rn 'generateMetadata|openGraph|robots|sitemap' app components` → **0 илэрц**.

| # | Асуудал | Байрлал | Санаа |
|---|---|---|---|
| 3.1 | Зарын хуудсанд зөвхөн статик `title` | `app/listings/[id]/page.jsx:3` | `generateMetadata()` — зар нэрийн үнэ/өрөө/дүүрэг + **эхний зургийг** og:image болгох |
| 3.2 | `app/sitemap.js` байхгүй | — | Бүх идэвхтэй зарын URL + статик хуудсууд |
| 3.3 | `app/robots.js` байхгүй | — | `/admin/*`, `/api/*` хаах |
| 3.4 | `metadataBase`, `openGraph`, `twitter` алга | `app/layout.jsx:4-7` | Нэмэх |
| 3.5 | Бүтцийн өгөгдөл (JSON-LD) алга | — | `RealEstateListing` + `Offer` → Google-д баялаг үр дүн |

**3.1-ийн жишээ (`app/listings/[id]/page.jsx`):**

```jsx
export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const listing = await fetchListingById(id);          // (сервер талын helper хэрэгтэй)
    if (!listing) return { title: 'Зар олдсонгүй — ZAR.mn' };
    const title = `${getCategoryLabel(listing.category)} ${listing.property_type}` +
                  ` · ${formatAddress(listing)} — ZAR.mn`;
    const image = firstImage(listing);
    return {
      title,
      description: `${formatPrice(listing.price)} — ${listing.description || title}`.slice(0, 160),
      openGraph: { title, images: image ? [{ url: image, width: 1200, height: 630 }] : [] },
    };
  } catch (e) {
    return { title: 'Зарын дэлгэрэнгүй — ZAR.mn' };
  }
}
```

> ⚠️ Одоогийн `fetchListingById` нь **client-side** Supabase client ашигладаг.
> `generateMetadata` серверт ажиллах тул эсвэл `import 'server-only'` helper,
> эсвэл `createClient`-ийг сервер талд шинээр үүсгэх шаардлагатай.
> Хамгийн хялбар: `lib/queriesServer.js` нэмээд `getSupabase()`-ийг серверт
> ажилладаг хувилбараар сольж дуудах (anon key нь public тул аюулгүй).

---

## 🔵 4. Функциональ — өрсөлдөх чадвар

1. **Зарын төлөв + дуусах хугацаа** 🟠 *(хамгийн том UX асуудал)*
   `listings` хүснэгтэд `status` / `expires_at` багана огт байхгүй
   (`grep 'status|expires' supabase/migrations/*.sql` → feedback-ээс өөр илэрц алга).
   Үр дүнд нь зар **хэзээ ч хуучирдаггүй** — хэрэглэгч залгахад «зарагдсан» гэдэг.
   Санаа: `status in ('active','sold','rented','archived')` + `expires_at` (30 хоног)
   + «Сунгах» товч + хугацаа дуусахад автомат `archived` (pg_cron эсвэл
   `/api/cron/expire`).

2. **Нууц үг сэргээх** 🟠
   README-д өөрөө «`admin.updateUserById(id, { password })` хийх endpoint нэмнэ»
   (README:889) гэж бичсэн. Одоо зөвхөн админ өөр хүний нууц үгээ сольж чадна,
   хэрэглэгч өөрөө мартвал **гарах гарц алга**.

3. **Хадгалсан хайлт + мэдэгдэл** — «Баянзүрх, 3 өрөө, 200 сая хүртэл» хадгалаад
   шинэ зар ирэхэд мэдэгдэх. `lib/favorites.js` (localStorage) нь суурь болж өгнө.

4. **Зар харьцуулах** (2-4 зар зэрэгцүүлж харах) — үл хөдлөх дээр эрэлттэй.

5. **19 аймгийн сум** 🟡 — README:47-д «дутуу» гэж тэмдэглэсэн.
   `lib/locationData.js → CITY_DISTRICTS`-д зөвхөн Дархан-Уул (4 сум),
   Орхон (2 сум) байна. Бусад аймаг сонгоход «Дүүрэг» dropdown зөвхөн «Бүгд».

6. **Мессеж/асуулт** — одоо зөвхөн утас + гомдол. «Зар нийтлэгчид асуулт үлдээх» форм.

7. **Зураг дээр watermark** (ZAR.mn) — хуулж авахаас хамгаалах.

8. **Мобайл доод навигац** — монгол хэрэглэгчийн дийлэнх нь утсаар нэвтэрдэг.

---

## 🟢 5. Хөгжүүлэлтийн чанар (dev quality)

| # | Дутуу | Одоогийн байдал | Санаа |
|---|---|---|---|
| 5.1 | Тест | Зөвхөн `scripts/test-verify-mn.js` гар тест | Vitest + `lib/format.js`, `lib/mortgage.js`, `lib/locationData.js`, `lib/breadcrumb.js`, `lib/queries.js` (supabase mock) нэгж тест |
| 5.2 | CI | `.github/` огт байхгүй | GitHub Actions: `npm ci` → `npm run build` → тест |
| 5.3 | Type checking | `jsconfig.json` (JS) — `checkJs` байхгүй | `checkJs: true` эсвэл `lib/`-ээс аажмаар `.ts` |
| 5.4 | Security headers | `middleware.js` алга | CSP, `X-Frame-Options`, `Referrer-Policy`, HSTS |
| 5.5 | Алдаа хяналт | Зөвхөн `console.error` | Sentry/GlitchTip — production алдааг харах |
| 5.6 | Ашиглагдаагүй devDeps | `@types/*` байгаа ч `typescript` алга | `typescript` нэмэх эсвэл `@types/*` хасах |

**5.1-ийн жишээ:**

```js
// lib/mortgage.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcMortgage } from './mortgage.js';

test('10 сая ₮, 12% , 60 сар — сарын төлбөр эерэг', () => {
  const r = calcMortgage({ amount: 10_000_000, annualRate: 12, months: 60 });
  assert.ok(r.monthly > 0);
  assert.equal(r.months, 60);
});
```

> 💡 Node.js 26 нь `node --test` дэмждэг — нэмэлт сан шаардахгүй.

---

## ⚪ 6. Жижиг засварууд

- **README 82 KB / ~1800 мөр** нэг файл болсон. `docs/auth.md`, `docs/storage.md`,
  `docs/admin.md`, `docs/stats.md` гэж хувааж README-г богино entry болгох.
- **12 `eslint-disable`** — lint тохируулсны дараа hooks-ийн dependency массивыг
  бодитоор засах (`useCallback`-ийн `filters` объект нь шинэ reference үүсгэдэг тул
  `JSON.stringify` түлхүүр эсвэл тусдаа примитив state ашиглах).
- **`app/admin/*` нь `○ (Static)`** — бүрхүүл prerender хийгдэж, хамгаалалт зөвхөн
  API дээр (өгөгдөл алдагдахгүй ч `middleware.js`-тэй хослуулбал илүү цэвэрхэн).
- **`formatAddress`** дотор «N-р хороо» форматыг нэг газар төвлөрүүлэх
  (хэдэн газар давтагдаж байна).
- **Analytics** (Vercel Analytics / Plausible) — аль зар, аль шүүлт эрэлттэйг мэдэх.
- **`fetchListings`-ийн 300 хязгаар** нь UI дээр хэрэглэгчид мэдэгддэггүй —
  «300-аас илүү зар байна, шүүлтээ нарийсгана уу» гэсэн тэмдэглэл нэмэх.

---

## 📌 Энэ файлыг хэрхэн ашиглах вэ

```bash
# 1) Шинэ санал нэмэх — эхний хүснэгтэд мөр нэмнэ
# 2) Ажил эхлэхэд:   [ ] гэж тэмдэглэж, commit-ийн мессежид "docs/IMPROVEMENTS.md:1.2" гэж бичнэ
# 3) Дуусахад:       тухайн хэсгийг бүрэн устгаж, доорх "Хийсэн" хэсэгт зөөнө
```

### Хийсэн ажлууд (commits)

| Огноо | Ажил | Commit |
|---|---|---|
| 2026-09-23 | Шинжилгээ хийж, энэ файлыг үүсгэсэн | — |
| 2026-09-23 | 📈 «Миний зарууд → Статистик» таб: 1/3/7/30 хоногийн хандалт, өдөр тутмын график, зар тус бүрийн эрэмбэ. `0010_listing_activity_daily.sql`, `lib/activityWindows.mjs`, `lib/listingActivity.js`, `/api/my-listings/stats`, `npm run test:activity` (34 тест) | — |
| 2026-09-23 | 🔧 Засвар: (1) «Хамгийн эрэлттэй зар» нь **сонгосон хугацаагаар** эрэмбэлэгддэг болсон (өмнө нь 30 хоногоор тогтмол байсан тул буруу зар харуулдаг байв), (2) **«Нийт»** сонголт нэмэгдсэн, (3) «Шинэ үзсэн хүн»-ийг **UI-д харуулахгүй** болсон | — |
| 2026-09-23 | 🎨 (1) Статистикаас **зараа шууд засах** боломж (✏️ товч → `fetchListingById` → `openEdit`, хадгалсны дараа авто-шинэчлэлт), (2) **графикийг сайжруулав**: Y тэнхлэг+grid, градиент багана, `animate-grow-up`, hover tooltip, гарагийн товчлол, legend, дундаж/макс. Тест 34 → **40** | — |
| 2026-09-23 | 🔘 **Бүх товчийг орчин үеийн, сүүдэртэй (3D мэт) болгов** — `.btn` нэг систем: `rounded-full` + градиент биет + 4 давхаргат сүүдэр (inset цагаан ирмэг, inset бараан ирмэг, ойрын сүүдэр, өнгөөрөө гэрэлтсэн алсын сүүдэр) + `enabled:hover` өргөгдөх/`enabled:active` дарагдах. `tailwind.config.js`-д 13 `boxShadow` токен. Мөн `/my-listings` дэх давхардсан **«➕ Зар нэмэх» хасагдсан**, табуудыг сегмент-контрол болгов | — |
| 2026-09-23 | 🧹 `/my-listings`-ээс **«🌐 Бүх зарууд» таб хасагдсан** — «Миний зарууд» гэдэг хуудас дээр бусдын зарууд харагдах нь төөрөгдүүлж байв. Одоо зөвхөн өөрийн зар (+📈 Статистик), нүүр хуудас руу чиглүүлэх тодруулга нэмэгдсэн. `isMine` шалгалт, `fetchListings` import, нэвтрээгүй хэрэглэгчийн «Бүх зарууд руу шилжих» логик бүгд хасагдсан | — |
| 2026-09-23 | 🏛 **LUXURY Фаз 1 — дулаан нейтрал (Sandstone).** `tailwind.config.js`-д `colors.gray`-г бүрэн дарж бичив (50–950) → апп даяар **462 газар** дулаан болсон, нэг ч компонент засахгүйгээр. Контраст хэмжиж баталгаажуулав (gray-500: 4.98:1, өмнө 4.83). Хамт нээгдсэн алдаа зассан: footer-ийн `text-gray-500` → `text-gray-400` (3.55:1 → **7.41:1** AA ✅) | — |
| 2026-09-23 | 💰 **Үнийн талбар — мянгатын таслалт + амьд тусламж.** `type="number"` → `type="text" + inputMode="numeric"` (number нь таслалтай утгыг хүлээхгүй). Бичих үедээ `250,000,000` болж хуваагдаж, доор нь «₮ 250,000,000 · 9 орон · ≈ 250 сая ₮» харагдана. **Төлөвт зөвхөн ЦИФР** хадгална — `queries.js → toNumber()` нь `,`-г аравтын бутархай гэж үздэг тул таслалтай утга илгээвэл үнэ чимээгүй **0** болдог (тестээр бариулсан). Шинэ: `formatThousands`/`digitCount`/`shortPrice`, `npm run test:format` (12 тест), 3 валидаци | — |
| 2026-09-23 | 🎥 **YouTube видео линк** (README-ийн «Бичлэг» хэсгийн **Сонголт C**). Storage **0 MB** — видео файл биш, зөвхөн линк. `lib/youtube.mjs` (цэвэр, **18 тест**), `components/YouTubeField.jsx` (thumbnail preview + ✕), `0011_listing_video.sql` (`video_url`), дэлгэрэнгүй хуудсанд «дарж тоглуулах» iframe (хурд+нууцлал), карт дээр 🎥 badge. Хадгалахдаа КАНОНИК линк болгож хөрвүүлнэ. ⚠️ **XSS-ээс хамгаалсан:** зөвхөн 11 тэмдэгтийн ID-г ялгаж аваад бид өөрсдөө youtube.com/i.ytimg.com URL угсарна. ⚠️ **Хамт зассан эрсдэл:** `updateListing()`-ийн DELETE+INSERT fallback нь `DETAIL_ROW_KEYS`-ийг хасалгүй байсан тул (багана байхгүй + UPDATE policy байхгүй үед) **зар алга болох** боломжтой байв. Шинэ: `npm run migration:copy` скрипт (`scripts/setup-migration.js`) | — |
| 2026-09-23 | 🎯 **«Дэлгэрэнгүй хайлт» товчийг анхаарал татахуйц болгов.** Градиент pill + `shadow-btn-primary` + ард нь **blur-тай цайвар гэрэлтэлт (glow)** (идэвхтэй шүүлттэй үед хүчтэйрнэ), `⚙️` icon нь `bg-white/20` дугуй дотор, идэвхтэй тоо нь **цагаан дугуй** дотор (градиент дээр ялгагдана). Нээгдсэн панель нь `border-2 border-primary/25` + `shadow-card-hover`, толгой нь `bg-primary/5` зурвас + «N шүүлт» badge + hover-доо цэнхэр болох «✕ Хаах» товч. Панeлийн толгойг сөрөг margin-аар байрлуулсан тул доорх форм-ыг дахин бүтэцлээгүй | — |

---

## 📈 Хандалтын статистик — ЦААШИД нэмэх боломжууд

Одоо `📈 Статистик` таб нь «хэдэн хандалт / хэдэн ❤️» гэдгийг харуулж байна.
Дараагийн шатанд (ач холбогдлын дарааллаар):

| # | Боломж | Яагаад хэрэгтэй | Хэрхэн |
|---|---|---|---|
| 1 | **Өмнөх үетэй харьцуулсан чиг хандлага** `↑18%` | «Сайжирч байна уу, муудаж байна уу» — хамгийн хэрэгтэй дохио | `d7` одоо vs `d7` өмнөх (age 7..13) — `addToWindows`-д `prevWindows` сагс нэмэх |
| 2 | **Зарын үнэ vs дүүргийн дундаж** | «Үнэ 12% өндөр байна → хандалт бага» гэж шалтгааныг харуулна | `lib/queries.js → fetchPricePerM2Stats`-ийг сервер талд дахин ашиглах |
| 3 | **7 хоногийн имэйл/мэдэгдлийн хураангуй** | Зар эзэн сайт руу орохгүй байсан ч мэдээлэл авна | `/api/cron/weekly-digest` + Supabase Edge Function + Resend |
| 4 | **»Энэ зар" хуудсан дээр эзэндээ статистик** | Зар эзэн зарах үедээ тоогоо шууд харна | `ListingDetailClient` дээр `user.id === listing.user_id` бол жижиг панель |
| 5 | **Зарын төлөв (зарагдсан/түрээслэгдсэн)** | Олон хандалт авсан ч зарагдаагүй зар = үнэ буруу гэсэн дохио | `listings.status` (0010-тэй хамт хийх нь тохиромжтой) |
| 6 | **Хайлтын эх сурвалж** — «аль шүүлтээс ирсэн» | «3 өрөө» хайлт их хандлага авч байвал бусад зардаа тэрийг тодруулах | `listing_views.source` (query string) |
| 7 | **CSV / Excel экспорт** | Тайлан гаргах, харьцуулах | `lib/exporters.js` аль хэдийн бий — өргөтгөх |
| 8 | **«Boost» (дээшлүүлэх)** | Орлого олох боломж | Хандалт багатай заранд санал болгох |
| 9 | **Sparkline-ыг долоо хоногийн өдрөөр** (Даваа–Ням) | «Амралтын өдрүүдэд их ханддаг» гэдгийг харна | `dailyMap`-ыг `getUTCDay()`-ээр бүлэглэх |
| 10 | **Realtime** — шинэ хандалт шууд харагдах | Зар нэмсний дараа шууд ажиллагааг харна | Supabase Realtime (одоо 30 сек тутамд refresh) |

> 💡 **Нэн тэргүүнд (1)** — «өмнөх үетэй харьцуулах». Учир нь ганц тоо
> («7 хоногт 45 хандалт») нь сайн/муу эсэхийг хэлж чадахгүй, харин
> «өмнөх 7 хоногоос 18% өссөн» гэдэг нь шийдвэр гаргахад шууд хэрэгтэй.

---


## 📎 Тэмдэглэл: AI-тай хийсэн яриа хаана үлддэг вэ

Cline (VS Code) нь даалгавар бүрийн **бүх яриа, команд, хариултыг** локал дискэн
дээр хадгалдаг:

```
~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks/
```

Даалгавар тус бүр нэг фолдер, дотор нь:

| Файл | Агуулга |
|---|---|
| `api_conversation_history.json` | AI-д явсан бүрэн мессеж (tool call, үр дүн) |
| `ui_messages.json` | UI дээр харагдсан текст (хариулт, тэмдэглэл) |
| `task_metadata.json` | Огноо, token, ашигласан model |

**Харах арга:**

1. **UI-аас (хамгийн хялбар):** Cline панелийн дээд талын **History** (🕘) товч →
   өмнөх даалгаврын жагсаалт → дарж бүрэн яриаг харна.
2. **Терминалаас:**
   ```bash
   cd ~/Library/Application\ Support/Code/User/globalStorage/saoudrizwan.claude-dev/tasks
   grep -rl "rate limit" . | head        # түлхүүр үгээр өмнөх яриаг хайх
   ls -1t | head -10                     # хамгийн сүүлийн 10 даалгавар
   ```

> ⚠️ Эдгээр файл нь **таны компьютер дээр** л байна. Cline-ийг устгавал эсвэл
> өөр компьютер дээр ажиллавал **хүрэх боломжгүй**. Тиймээс чухал дүгнэлтүүдийг
> **энэ файл шиг репогийн документ болгож** хадгалах нь найдвартай — git-ээр
> хувилагдаж, баг бүхэлдээ харна.



