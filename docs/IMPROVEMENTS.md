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
| 2.1 | ✅ **ШИЙДЭГДСЭН (2026-09-27):** `limit(300)`, pagination огт байхгүй | `lib/queries.js:83` (хуучин 42) | `.range(from,to)` + `count` НЭМЭГДЭВ — нэг хуудсанд **50 зар**, бусад нь `?page=N` (`HomeClient` → `Pagination`). ⚠️ Дарааллыг `created_at` + **`id`** гэж 2 түвшинд тогтоов (uuid) — эс бөгөөс created_at тэнцэх үед хуудсуудын хооронд зар ДАВХАРДАХ/АЛГАСАТАХ байв |
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
    if (!listing) return { title: 'Зар олдсонгүй — Зарлаа.mn' };
    const title = `${getCategoryLabel(listing.category)} ${listing.property_type}` +
                  ` · ${formatAddress(listing)} — Зарлаа.mn`;
    const image = firstImage(listing);
    return {
      title,
      description: `${formatPrice(listing.price)} — ${listing.description || title}`.slice(0, 160),
      openGraph: { title, images: image ? [{ url: image, width: 1200, height: 630 }] : [] },
    };
  } catch (e) {
    return { title: 'Зарын дэлгэрэнгүй — Зарлаа.mn' };
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

7. **Зураг дээр watermark** (Зарлаа.mn) — хуулж авахаас хамгаалах.

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
- **Analytics** (Vercel Analytics / Plausible) — аль зар, аль хайлт эрэлттэйг мэдэх.
- **`fetchListings`-ийн 300 хязгаар** нь UI дээр хэрэглэгчид мэдэгддэггүй —
  «300-аас илүү зар байна, хайлтаа нарийсгана уу» гэсэн тэмдэглэл нэмэх.

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
| 2026-09-27 | ⚽ **ШИНЭ ХЭСЭГ — «Амралт, спорт, хобби»** (хэрэглэгчийн хүсэлт: «Амралт, спорт, хобби гэж нэмээд дор нь дараахыг нэмээд push хийнэ үү»). ℹ️ **Хаана байрлахыг баталсан:** unegui.mn-д энэ нь **ТУСДАА ТОП-ТҮВШНИЙ хэсэг** (`unegui.mn/hobbi-sport/`) бөгөөд тэнд «Үйлчилгээ»-гийн **ӨМНӨ** байдаг (unegui.mn-ийн нүүрээс баталсан ✓ — `r.jina.ai` proxy-оор, шууд fetch 403). **Дэд төрөл (7):** Аяллын хэрэгсэл · Загас ан агнуур · Ном, сонин, сэтгүүл · Спортын хэрэгсэл · Хөгжмийн зэмсэг · Цуглуулга · Унадаг дугуй, сэлбэг. 📍 **Хамрах хүрээ (5 файл + 1 migration):** **(1) `lib/locationData.js`** — `SECTIONS`-д `hobby` хэсэг (`icon: '⚽'`, `categories: ['all']`, attr талбарууд: 🏷️ Брэнд · 🔖 Загвар · 📐 Хэмжээ · ✅ Төлөв · 🚚 Хүргэлт; шүүлт: Төлөв+Хүргэлт). **(2) `components/HomeClient.jsx`** — tile сүлжээ **6 → 7 хэсэг** болсон тул `lg:grid-cols-6` → **`lg:grid-cols-7`** (lg дээр нэг мөрөнд бүгд багтана ✓; мобайл 2, `sm` 3 ХЭВЭЭР). **(3) `supabase/migrations/0019_section_hobby.sql` (ШИНЭ)** — ⚠️ **ХАМГИЙН ЧУХАЛ:** `listings_section_valid` CHECK constraint нь ЗӨВХӨН 6 утгыг зөвшөөрдөг байв; хэсэг нь `SECTIONS`-ээс уншигддаг тул **UI дээр харагдана**, гэвч тэр хэсэгт зар нэмэхэд `23514` алдаа гарна ✗ (CDP биш — **жинхэнэ DB дээр probe хийж баталсан**: хүчингүй утга + `'hobby'` хоёулаа `23514 check constraint "listings_section_valid"` ✓) → constraint-ыг 7 утгатайгаар ДАХИН үүсгэв + `comment on column`. **(4) `scripts/seed-sections.mjs`** — `HOBBY_SUBTYPE_PAIRS` (дэд төрөл тус бүрд ТОХИРСОН брэнд+загвар: Giant ATX 720, Trek Marlin 6, Shimano Catana 4000, Spalding, Yamaha P-45, Чингис хөөрөгний даалин…), `HOBBY_PRICE` (ном 10 мянга → пиано 8 сая — «ном 200 сая» гэх төөрөгдөл гаргахгүй ✓), `TEXTS.hobby`, `makeAttrs` branch (size нь төрлөөс хамаарна: дугуй «27.5 инч», ном «A4»), үнийн branch, `DRY_RUN` үлгэр, мөн insert алдаанд **`0019`-ийн заавар** нэмэв. **(5) `README.md`** — хэсгийн хүснэгт · `listings.section` утгууд · tile диаграм (6→7) · seed тоо (**820 → 890**) · migration хүснэгтэд №15 · ⚠️ «шинэ хэсэг нэмэхэд SQL хэрэггүй» гэсэн ХУУЧИН мэдэгдлийг ЗАСАВ. 🧪 **ТЕСТ:** `DRY_RUN=1 npm run seed:sections` → ⚽ Амралт, спор, хобби **7 дэд төрөл × 10**, НИЙТ **890** ✓, үлгэр мөр `hobby / Унадаг дугуй, сэлбэг` (5.2 сая ₮, Giant ATX 720, «29 инч») ✓; `next build` цэвэр; `test:format` 12/12 · `test:youtube` 18/18; CDP: нүүр **7 tile** нэг мөрөнд ✓, `?section=hobby` → 7 дэд төрөл ✓, breadcrumb `Бүх зар › Амралт, спорт, хобби` ✓, мобайл 390 хэвтээ overflow БАЙХГҮЙ ✓. 🔍 Хайх үг: `hobby` | — |
| 2026-09-27 | 🏷 **ЛОГОНЫ ХИЙМЭЛ ЗАЙ зассан — «🏠 ZARLAA .MN» → «🏠 ZARLAA.MN»** (хэрэглэгчийн гомдол: «zarlaa.mn нь zarlaa .mn гэж харагдаад байх юм»). 🔴 **ШАЛТГААН (CDP-ээр хэмжсэн ✓):** `<Link className="flex items-center gap-2 …">` — эцэг нь `display:flex`, хүүхдүүд нь **текст зангилаа («🏠 ZARLAA») ба `<span>.MN</span>`** байв. ⚠️ CSS `gap` нь flex ДОТОРХ бүх хүүхдийн хооронд (текст зангилаа ч мөн flex item болдог!) зай тавьдаг тул «ZARLAA» ба «.MN»-ийн хооронд **ХИЙМЭЛ 8px** зай үүсч, лого «ZARLAA .MN» гэж хоёр үг мэт уншигдаж байв ✗ (хэмжилт: `textEnd 138.6 → spanStart 146.6`, `gap: 8px`, `visualGapPx: 8`). ℹ️ DOM-д `textContent` = `🏠 ZARLAA.MN` (зайны ТЭМДЭГТ БАЙХГҮЙ) — тиймээс алдаа нь текстэд БИШ, CSS-д байсан ✓. ✅ **ЗАСВАР (`components/AppProviders.jsx` мөр 252):** `gap-2` ХАСАВ (логоны цорын ганц зай нь текст доторх ASCII space «🏠 ZARLAA» ✓) → `gap: normal`, `visualGapPx: 0`, лого 164 → **155.9px** (яг 8px багассан ✓). ⚠️ `flex items-center` ХЭВЭЭР (emoji 22px текстээс өндөр тул vertical төвлөрүүлэлт хэрэгтэй ✓); `gap` буцааж нэмэх бол `<span>`-ыг НЭГ элементээр ороох ЁСТОЙ (тайлбарыг код дээр бичсэн). 🔎 **Ижил төрлийн алдааг бүх хуудсаар автоматикаар шалгав** (`flex`+`gap>0` доторх текст+элемент наалдалтыг илрүүлэх CDP probe): нүүр хуудсанд **4 hit** — бүгд хуудаслалтын (`← Өмнөх 1 2 3 Дараах →`) товчнууд бөгөөд зай нь ЗОРИУДЫН (тусдаа товч ✓) → **өөр алдаа БАЙХГҮЙ** ✓. 📸 `/tmp/logo_fix_desk.png`, `/tmp/logo_fix_mob.png` (390px — лого 1 мөр, overflow байхгүй ✓), нүдээр: «🏠 ZARLAA.MN» ✓. `next build` цэвэр ✓ | — |
| 2026-09-27 | 🚗 **«Хэтчбек» ХАСАГДАЖ, «Седан» → «Суудлын машин» болов** (хэрэглэгчийн хүсэлт: «Авто машины хэтчбек ийг хасна уу, седан ийг суудлын машин болго»). **Учир нь:** хэтчбек нь суудлын машины нэг хэлбэр (биеийн хэлбэрийн ялгаа) тул тусдаа дэд төрөл байх шаардлагагүй — 2 дэд төрөл нэг дор нэгдэв. **`lib/locationData.js`** — `auto.subtypes`: `'Седан', 'Хэтчбек'` → **`'Суудлын машин'`** (10 → **9 дэд төрөл**). **`supabase/migrations/0018_auto_subtype_rename.sql` (ШИНЭ)** — DB-д ХУУЧИН нэрээр хадгалагдсан заруудыг нэрлэнэ: `update listings set property_type='Суудлын машин' where section='auto' and property_type in ('Седан','Хэтчбек')` — ⚠️ **зар УСТГАХГҮЙ, зөвхөн нэр**; нэр солихгүй бол хуучин 20 зар нь «Бүх зар»-д үлдэж, ДЭД ТӨРЛИЙН ТООНООС ГАДУУР орхигдоно ✗. **(Ажиллуулсан ✓)** — `section='auto'`: «Седан» 10 + «Хэтчбек» 10 → **«Суудлын машин» 20** болж, нийт 100 зар ХЭВЭЭР ✓. **`scripts/seed-sections.mjs`** — `AUTO_SUBTYPE_PAIRS`-ийн «Седан»/«Хэтчбек» хоёр түлхүүр **НЭГТГЭВ** («Суудлын машин» = Camry/K5/Elantra… + Aqua/Fit/Golf… 14 загвар) → 9×10 = 90 зар (нийт **830 → 820**); `DRY_RUN` үлгэрийн мөр шинэчлэгдэв. **`lib/format.js` · `lib/queries.js` · `components/ListingCard.jsx`** — тайлбар доторх жишээ нэр (icon fallback-ийн тайлбар). **`README.md`** — авто дэд төрлийн жагсаалт · seed тоо (10→9, 830→820) · URL/breadcrumb жишээ · migration хүснэгтэд №14 мөр. 🧪 **ТЕСТ** (десктоп 1280 CDP): `?section=auto` → **9 дэд төрөл**, `Суудлын машин 20` ✓, «Седан»/«Хэтчбек» **байхгүй** ✓; `?section=auto&type=Суудлын машин` → breadcrumb `Бүх зар › Автомашин › Суудлын машин` ✓, 20 зар ✓; `DRY_RUN=1 npm run seed:sections` → 🚗 Автомашин **9 дэд төрөл × 10**, НИЙТ **820** ✓; `next build` цэвэр, `test:format` 12/12, `test:youtube` 18/18 ✓. 🔍 Хайх үг: `Суудлын машин` | — |
| 2026-09-27 | 🛠️ **«Үйлчилгээ» хэсэгт 3 ТҮВШНИЙ КАТЕГОРИЙН МОД нэмэв** (хэрэглэгчийн хүсэлт: «Үйлчилгээ хэсэгт дараах категорийг оруулж өгөөд push хийнэ үү» — unegui.mn-ийн модтой ижил 7 бүлэг). **Өмнө нь:** 14 хавтгай дэд төрөл («Засвар, үйлчилгээ», «Цэвэрлэгээ»…). **Одоо:** `lib/locationData.js` → `SERVICE_SUBTYPE_GROUPS` — 7 бүлэг → **28 дэд төрөл**: **Боловсрол & Сургалт** (Сургалт ба курс, Тайлан ба төсөл, Орчуулга) · **Барилга & Засвар үйлчилгээ** (Барилгын бүх ажил, Цахилгаан бараа засвар, Тавилга ба мужаан, Түлхүүр/цоож засвар, Сантехник) · **Өрх гэр & Ахуйн үйлчилгээ** (Бүх цэвэрлэгээ, Нүүлгэлт ба тээвэр, Хүүхэд асрах, Өндөр настан асрах, Тэжээвэр амьтны үйлчилгээ, Жолоочийн үйлчилгээ) · **Хэвлэл, реклам, медиа** (доод түвшингүй) · **Аялал, Амралт & Гоо сайхан** (Аялал жуулчлал, Амралт сувилал, Үсчин гоо сайхан, Хоол захиалга, Баярын худалдаа) · **Технологи & Авто засвар** (IT Программ хангамж, Уул уурхай, Авто засвар үйлчилгээ) · **Бизнес, Санхүү & Хууль** (Компани ба бэлэн бизнес зарна, Хөрөнгө зуучлал ба үнэлгээ, Мөнгө санхүү ба зээл, Хууль ба эрх зүй, Харуул хамгаалалт). ⚙️ **ЗАГВАР (хэрэглэгчийн сонголт):** бүлэг дээр дарахад **ЗӨВХӨН доод item-үүд нээгдэнэ** — бүлэг ӨӨРӨӨ шүүлт БИШ (тиим нэрээр зар хэзээ ч хадгалагдахгүй ✓); **доод түвшингүй бүлэг** (ж: «Хэвлэл, реклам, медиа») нь **хамгийн доод түвшин** тул ШУУД сонгогдоно (✔ icon, chevron биш). `subtypes` нь бүлгүүдээс **автоматаар** үүснэ (`SERVICE_SUBTYPES` → 28) — давхар бичихгүй (нэг нь мартагдана ✗). 📍 **Хамрах хүрээ (4 файл):** **(1) `lib/locationData.js`** — `SERVICE_SUBTYPE_GROUPS`, `subtypes`/`subtypeGroups`, шинэ helper `getSubtypeGroups(section)` + `findSubtypeGroup(section, subtype)`. **(2) `components/HomeClient.jsx`** — шинэ state `groupOpen` (UI-only, URL-д ОРОХГҮЙ — бүлэг нь шүүлт биш ✓); панел нь 3 төлөвтэй боллоо (`activeGroup` → дэд төрлүүд / бүлэг байгаа ч нээгээгүй → БҮЛГИЙН жагсаалт / бүлэггүй хэсэг → хуучин харагдац ✓); бүлгийн мөрүүд нь **`font-bold`** (хэрэглэгчийн жагсаалтад бүлгийн нэр BOLD байсан ✓); бүлэг нээлттэй үед толгойд **«← Бүх категори»** чип; `changeSection`/`backToAllSections`/`resetAll` нь `groupOpen`-ыг **цэвэрлэнэ** (өөр хэсэг рүү шилжихэд өмнөх бүлэг хүчингүй ✓). **(3) `lib/breadcrumb.js`** — бүлгийн түвшин нэмэгдэв: `Бүх зар › Үйлчилгээ › Боловсрол & Сургалт › Сургалт ба курс`; линк бүр `nav: { section, group }`-той → `goToCrumb` нь бүлгийг НЭЭНЭ (`setSectionOpen(true)` — ⚠️ энэ блок нь `nav.section`-ий ДАРАА байх ЁСТОЙ, эс бөгөөс `setSectionOpen(false)` дарах ✗). **(4) `components/AddListingModal.jsx`** — дэд төрлийн `<select>` нь **`<optgroup>`**-оор бүлэглэгдэв (30 хавтгай option нь ойлгомжгүй ✗). ⚠️ **Анхаарах:** DB-д байгаа хуучин 140 demo зар нь ХУУЧИН нэрээр (`property_type`) хадгалагдсан тул шинэ дэд төрлүүд эхэндээ **хоосон** харагдана — `npm run seed:sections` ажиллуулбал шинэ 28 төрөлд demo зар нэмэгдэнэ. 🧪 **CDP-ээр бодит баталгаа** (десктоп 1280 / мобайл 390; ХОЁР командыг ЗЭРЭГ биш ДАРААЛАН ажиллуулав — нэг page target хуваалцдаг ✗): `?section=services` → **7 бүлэг, BOLD** ✓; «Боловсрол & Сургалт» дарахад 3 дэд төрөл (`Сургалт ба курс, Тайлан ба төсөл, Орчуулга`) + «← Бүх категори» ✓; дэд төрөл сонгоход URL `?section=services&type=Сургалт+ба+курс` + breadcrumb 4 түвшин ✓; «Хэвлэл, реклам, медиа» → `?section=services&type=Хэвлэл,+реклам,+медиа` (шууд сонгогдов ✓); «← Бүх категори» → 7 бүлэг рүү буцав ✓; breadcrumb-ийн бүлгийн линк → бүлэг НЭЭЛТТЭЙ буцав ✓; **Автомашин** хэсэг өөрчлөгдөөгүй (10 дэд төрөл, бүлэг 0) ✓; мобайл 390 → `scrollWidth 390` **хэвтээ overflow БАЙХГҮЙ** ✓; `next build` цэвэр; `test:format` (12) + `test:youtube` (18) PASS. 📸 `/tmp/svc_groups_desk.png`, `/tmp/svc_items_desk.png`, `/tmp/svc_groups_mob.png`. 🔍 Хайх үг: `3 ДАХЬ ТҮВШИН` | — |
| 2026-09-27 | 📱🔍 **МОБАЙЛ UX + HERO-г unegui.mn хэв маягт оруулав** (хэрэглэгчийн хүсэлт: «лого-г ZARLAA.MN болгоод, гар утсаар ороход голлуулж харуулах; Профайл баруун доод, Зар нэмэх зүүн доод, Таалагдсан дунд; хайх хэсгийг unegui.mn шиг болгоод дэвсгэр зургийг байхгүй болгох»). **(1) 🏷 ЛОГО** `🏠 Зарлаа.mn` → **`🏠 ZARLAA.MN`** — 2 өнгийн хэв маяг хэвээр (`text-primary` + `text-gray-900`). ⚠️ БРЭНДИЙН БҮХ UI ТЕКСТ нэгтгэгдэв: **«Зарлаа.mn» 0 үлдэгдэл, «ZARLAA.MN» 22 газар** (`app/**/page.jsx` metadata ×13, `lib/exporters.js`, `FavoritesClient`, `PriceStatsClient`, `AppProviders` лого+footer). ℹ️ `README.md`/`docs/`/`package.json` нь ДОТООД бичиг тул хөндөөгүй ✓ (зөвхөн хэрэглэгчид харагдах текст). **(2) 📱 Header мобайлд:** лого нь **ТӨВД** (`justify-center` → `lg:justify-between`), баруун талын 3 товч (`➕ Зар нэмэх`, `❤️ Таалагдсан`, хэрэглэгчийн цэс) `hidden lg:flex` болж **мобайлд НУУГДАВ** — оронд нь доод навигац. **(3) 📱 МОБАЙЛ ДООД НАВИГАЦ** (`<nav aria-label="Мобайл доод цэс">`, `fixed inset-x-0 bottom-0 z-40`, `lg:hidden`, `grid-cols-3`): **➕ Зар нэмэх (ЗҮҮН) · ❤️ Таалагдсан (ДУНД, тоолууртай) · 👤 Профайл (БАРУУН)** — хүсэлт ёсоор ЯГ. ⚠️ `env(safe-area-inset-bottom)` (iPhone-ийн доод зураас), `z-40` (header `z-50`, modal `z-[1000]`-аас ДООР → модал нээгдэхэд nav дээр гарахгүй ✓), toast `bottom-6` → **`bottom-20 lg:bottom-6`**, footer `py-6` → **`py-6 pb-20 lg:pb-6`** (эс бөгөөс nav нь сүүлийн мөрүүд ба toast-ыг ДАРНА ✗). **(4) 📱 Хэрэглэгчийн цэс нэг эх сурвалжтай болов:** `userMenuItems` (массив) + `UserMenuItem` (компонент) — desktop dropdown ба мобайл доод **sheet** (`role="dialog"` + backdrop ✓) ХОЁУЛАА нэг массиваас render хийнэ (зүйлсийг давхардуулбал нэг нь мартагдана ✗); нэвтрээгүй бол «Профайл» нь `openAuth()` (нэвтрэх цонх ✓). **(5) 🔍 HERO — ФОН ЗУРАГ ХАСАГДАВ:** `public/hero-ub.jpg` (334 KB) + хар overlay ✗ → **цэвэр брэнд цэнхэр градиент** (`from-primary to-primary-dark`) ✓ unegui.mn шиг; контраст 4.6:1 / 6.4:1 (AA / AAA ✓); мобайлд `py-8` + гарчиг `text-2xl` (нягт ✓) → `sm:py-12` / `sm:text-4xl`. **(6) ✅ БАТАЛГАА — CDP-ээр бодит хэмжилт:** мобайл viewport 390 дээр `scrollWidth` **390 → ХЭВТЭЭ OVERFLOW БАЙХГҮЙ** ✓ (⚠️ энгийн `chrome --screenshot --window-size` нь viewport meta-г үл харгалзан **ХУУРАМЧ зураг** өгдөг ✗ — `Emulation.setDeviceMetricsOverride`-той CDP л бодит үр дүн өгнө ✓); nav-ийн DOM дараалал `[➕Зар нэмэх, ❤️Таалагдсан, 👤Профайл]` ✓; **товч бүрийг дарж шалгав** — ➕ → «Эхлээд нэвтрэх шаардлагатай» toast ✓, ❤️ → `<a href="/favorites">` ✓, 👤 → нэвтрэх цонх нээгдэв ✓; логогийн текст `🏠 ZARLAA.MN` (зай ГҮЙ ✓ — дэлгэц дээрх жижиг зай нь `A`/`.` глифийн side bearing ✓). `next build` цэвэр | — |
| 2026-09-27 |  🖱 **Модал цонх ГАДНА ДАРАХАД ХААГДАХГҮЙ болгов** (хэрэглэгчийн гомдол: «Профайл засаж байхдаа санамсаргүй өөр газар click хийхэд цонх орхин гарч байна»).  ⚠️ ШАЛТГААН: backdrop `<div className="fixed inset-0 …" onClick={onClose}>` — гадна дарвал шууд хаагддаг байв.  ✅ Зассан: `components/ProfileModal.jsx` (мөр 121) ба `components/AuthModal.jsx` (мөр 350) — backdrop-ийн `onClick={onClose}` ХАСАВ.  Одоо зөвхөн «✕» болон «← Болих» товчоор хаагдана ✓ (Escape handler огт байхгүй ✓).  ℹ️ `components/AddListingModal.jsx` нь АЛЬ ХЭДИЙН хамгаалалттай байсан — `requestClose()` нь `isDirty()` үед  `window.confirm("Оруулсан мэдээлэл хадгалагдахгүй УСТАНА. Гарахдаа итгэлтэй байна уу?")` асуудаг ✓ (хөндөөгүй).  ⚠️ Алдаа зассан: эхлээд тайлбарыг `return ( <div>` -ийн ГАДНА тавьсан нь «Expected , got className» синтакс алдаа үүсгэсэн →  тайлбарыг `fixed inset-0` div-ийн ДОТОР зөөв ✓ **ТЕСТ:** `next build` цэвэр, серверийн алдаа 0 | — |
| 2026-09-27 |  🙈 **«Зар дээр нэр/зургаа харуулах уу» — OPT-IN тохиргоо** (`supabase/migrations/0017_profile_identity.sql`, хэрэглэгчийн хүсэлт).  **Асуудал:** агент/дэлгүүрүүд нэр, зургаа харуулахыг хүсдэг, энгийн хэрэглэгч ихэвчлэн ХҮСДЭГГҮЙ. Тиймээс БҮРТГЭЛИЙН үед АСУУЖ,  хүсвэл харуулна — хүсэхгүй бол зар дээр нэр/зураг ОГТ харагдахгүй (зөвхөн утас).  **DB:** `profiles.show_identity boolean not null default false` (анхдагч = НУУЦЛАЛ, зөвшөөрөлгүйгээр нэрийг нийтлэхгүй) + partial index.  **Код:** `lib/queries.js` → `fetchProfilesByIds()` нь `show_identity = false` үед нэр/зургийг ХООСОН буцаана (карт дээр блок харагдахгүй);  `updateProfile()` нь `showIdentity` дэмжинэ; `app/api/auth/register/complete` нь `showIdentity` хүлээж профайлд бичнэ;  `AuthModal` (бүртгэлийн форм) ба `ProfileModal` (дараа нь солих) хоёуланд checkbox.  ⚠️ **Хамт зассан АЛДАА:** `ProfileModal` нь өөрийн профайлыг `fetchProfilesByIds()`-ээр уншдаг байсан — `show_identity = false` үед  эзэн өөрийн нэрээ ч харж чадахгүй болох байв → `fetchProfile()` (`select(*)`) болгов (эзэн ҮРГЭЛЖ бүрэн харна).  ⚠️ **GRACEFUL DEGRADATION:** `0017` ороогүй бол `fetchProfilesByIds` нь ХУУЧИН зан төлвөөр (шалгалтгүй харуулна) ажиллана + console-д анхааруулга — сайт эвдрэхгүй.  Бүртгэлийн засвар нь try/catch дотор тул 0015/0017 ороогүй ч БҮРТГЭЛ АМЖИЛТТАЙ болно. `npm run check:supabase`-д 0017 шалгалт нэмэгдэв.  **ТЕСТ:** `next build` цэвэр, бүх хуудас 200, серверийн алдаа 0 | — |
| 2026-09-27 | 📐 **TILE-ийн EMOJI ICON картаас хальж гардаг алдааг зассан** (хэрэглэгчийн гомдол: «Үл хөдлөх, Автомашин, Ажлын зар гэх мэт эдгээрийн icon нь карт дотроо багтахгүй дээрээ гараад байна»). 🔴 **ШАЛТГААН:** `leading-none` (= `line-height: 1`) нь **emoji-г мөрийн хайрцгаас хальж гаргадаг** — Apple/Google emoji-гийн глиф нь ~1.2em өндөртэй (24px текстэд ≈29px) тул `line-height: 1` (24px) хайрцагт багтахгүй, дээшээ ~2.5px цухуйж tile-ийн хүрээнээс гарсан мэт харагддаг байв. ✅ **ШИЙДЭЛ:** `leading-none` → **`leading-[1.4]`** (мөрийн хайрцаг 33.6px ≥ 29px → БҮРЭН БАГТАНА; span нь хайрцгаараа өөрөө өснө, тогтмол `h-*` шаардлагагүй). 📍 **4 газар** (`components/HomeClient.jsx`): **662 — ХЭСГИЙН tile (🏠🚗💼💻🛋️🛠️)** ← үндсэн гомдол · 556 — drill-down панелийн толгой · 612 — дэд төрлийн tile · 703 — 🔍 (шүүлтийн толгой). 🎨 Хамт: tile-д **`min-h-[88px]` + `w-full`** → бүх tile ИЖИЛ өндөртэй (шошго 1 эсвэл 2 мөр байсан ч), шошго `leading-tight` → `leading-snug`, `text-center` → `w-full text-center`. 🔧 Тайлбарыг `HomeClient.jsx`-д ШУУД бичсэн (icon-ы хэмжээг хэрхэн солих, юуг хөндөхгүй байх). Хайх үг: `ICON БАГТАХ ЗАСВАР`. **ТЕСТ:** SSR HTML-д `leading-[1.4]` 6 (6 tile) ✓, `leading-none` **0** ✓, tile класс `flex min-h-[88px] w-full …` ✓, `next build` цэвэр, `localhost:3000` 200, алдаа 0 | — |
| 2026-09-27 | 🔝 **Зарын ТӨРЛИЙГ картын хамгийн эхэнд (урд) гаргав** (хэрэглэгчийн хүсэлт: «зар бүрийн доор харагдаж байгаа Үл хөдлөх/Автомашин гэх мэтийг урд нь гарга»). `components/ListingCard.jsx`: ТӨРӨЛ мөр (`🏢 Орон сууц` · `🚗 Седан` · `💼 IT, программист` …) нь өмнө нь **ҮНИЙН ДООР** (4-р байр) байсан → одоо мэдээллийн блокийн **ХАМГИЙН ЭХНИЙ МӨР** (зургийн дараа шууд). Дараалал: `ТӨРӨЛ → Зар нийтлэгч → (attrs) → ҮНЭ → 📍 Хаяг → 🕒 → 🛏📐🏢📅 → 👁❤️`. ⚠️ **Хамт зассан БОДИТ АЛДАА:** `getPropertyIcon(listing.property_type)` нь `section`-гүй дуудагддаг байсан тул бусад хэсгийн дэд төрөл (ж: «Седан», «IT, программист») нь **🏠 (байшин)** icon авдаг байв — одоо `getPropertyIcon(type, listing.section)` → 🚗 💼 💻 🛋️ 🛠️ ✓ (шалгав: «Седан»+auto → 🚗, «Седан»+undefined → 🏠 = хуучин алдаа батлагдав). ✅ **«Бусад нь ч гэсэн» — автоматаар:** `ListingCard` нь НЭГ компонент бөгөөд 4 газарт хэрэглэгддэг (HomeClient · ListingDetailClient · FavoritesClient · SellerListingsClient) тул нэг засвар БҮХ хуудсанд (нүүр, дэлгэрэнгүй, таалагдсан, нийтлэгчийн) + мобайл/десктопт нөлөөлнө. Хайх үг: `ТӨРӨЛ — КАРТЫН ХАМГИЙН ЭХНИЙ МӨР`. Мөн `ЗАР НИЙТЛЭГЧ` тайлбарын «⚠️  адил» (хоосон зайтай, утгагүй) нь «⚠️ ЗАГВАР адил» болж цэгцэв. **ТЕСТ:** icon 7/7 ✓, `next build` цэвэр, `localhost:3000` 200, алдаа 0 | — |
| 2026-09-27 | 🖼 **HERO-д ФОН ЗУРАГ БУЦААЖ, ГАРЧИГ/ТАЙЛБАРЫГ ХАСАВ** (хэрэглэгчийн хүсэлт: «хайх хэсгийн ард байгаа цэнхэр дэвсгэртэй хэсгийг өмнөх зургийг тавиад дээр нь байгаа 🏠 Үл хөдлөх хөрөнгийн зар / Худалдаа, түрээсийн үл хөдлөх хөрөнгийн зарууд хэсгийг байхгүй болгох»). ⚠️ Мөн өдрийн ӨМНӨХ хүсэлтээр (`from-primary to-primary-dark` градиент) зураг + overlay **ХАСАГДСАН** байв → одоо **БУЦААВ** ✓. `components/HomeClient.jsx`: **(1)** `public/hero-ub.jpg` (`absolute inset-0 -z-10` + `bg-cover bg-center bg-no-repeat` span, `aria-hidden`) **БУЦАЖ ИРЭВ** ✓ — файл (342 KB) `public/` дотор хэвээр байсан тул устгагдаагүй ✓, зүгээр л дуудагдахгүй байсан ✓. **(2)** `<h1>🏠 Үл хөдлөх хөрөнгийн зар</h1>` БА тайлбар `<p>Худалдаа, түрээсийн …</p>` **БҮРЭН ХАСАГДАВ** ✗ → hero-д **ЗӨВХӨН хайлтын мөр** (`<form role="search">`) үлдэв ✓. **(3)** overlay `from-black/55 via-black/45 to-black/55` — өмнөх `70/55/75`-аас **ХӨНГӨН** ✓: цагаан текст бүрэн хасагдсан тул WCAG-ийн контрастын шаардлага **хүчингүй** болсон ч цагаан хайлтын картыг гэрэлтэй нар жаргах тэнгэрээс ялгаж, **ГҮН** өгөх зорилгоор ХЭВЭЭР үлдэв ✓. **(4)** өндөр `py-10 sm:py-16` → **`py-14 sm:py-20`** — ⚠️ CDP-ээр хэмжихэд эхний `py-10` нь мобайлд ердөө **128px** байж, панорама нимгэн судал мэт харагдсан ✗ → одоо **160px (мобайл) / 208px (десктоп)** ✓. 🧪 **CDP-ээр бодит баталгаа** (мобайл 390 + десктоп 1280): фон зураг `url(/hero-ub.jpg)` ✓, `cover / 50% 50%` ✓, overlay `rgba(0,0,0,0.55→0.45→0.55)` ✓, **hero дотор h1 БАЙХГҮЙ** ✓, **hero дотор p БАЙХГҮЙ** ✓, hero-ийн цорын ганц текст нь `sr-only` «Зар хайх» лейбл ✓, **хуудсан дахь цорын ганц h1** нь үр дүнгийн толгой («Бүх зар · 300») ✓ → a11y/SEO эвдрээгүй ✓, хэвтээ overflow `390 ≤ 390` ✓ / `1265 ≤ 1280` ✓, `next build` цэвэр ✓. ℹ️ **Шинэ туслах хэрэгсэл:** `/tmp/check.js` (CDP-ээр `Emulation.setDeviceMetricsOverride` + `@файл` дахь НЭГ илэрхийллийг ажиллуулж хариу хэвлэнэ — `eval.js` нь viewport тохируулдаггүй байсан ✗, JSON массив өгвөл «Uncaught» ✗). ⚠️ Хичээл: энгийн `chrome --screenshot --window-size` **ХУУРАМЧ** зураг өгдөг ✗ — зөвхөн CDP `setDeviceMetricsOverride` бодит ✓. | — |
| 2026-09-27 | 🔤 **ХЭСЭГ БА ДЭД ТӨРЛИЙН ШОШГЫН ФОНТ ТОМОРЧ, ИЛҮҮ ХАР БОЛОВ** (хэрэглэгчийн хүсэлт: «Автомашин, Ажлын зар гэх мэт бүх subcategory-ийн үсгийн хэмжээ болон өнгийг жаахан томруулж, бас илүү хар өнгөтэй болгох»). 📍 `components/HomeClient.jsx`, **2 газар** (`docs/`-д фоны хүснэгт байхгүй ✓ — Tailwind utility классууд ШУУД JSX-д; глобал `font-family` нь `app/globals.css` дотор ✓): **(1) мөр 716 — «Бүх хэсэг» tile-ийн 6 ШОШГО** (Үл хөдлөх · Автомашин · Ажлын зар · Компьютер · Гэр ахуйн бараа · Үйлчилгээ): `text-[14px] font-semibold` → **`text-[16px] font-bold`** (хэмжээ +2px, жин 600 → 700); сонгоогүй үеийн өнгө `text-gray-700` (**#454037**) → **`text-gray-900`** (**#1B1815**). **(2) мөр 682 — drill-down панелийн ДЭД ТӨРЛИЙН ЖАГСААЛТ** (`aria-label="Зарын дэд төрөл"`, `columns-1 sm:columns-2 lg:columns-4`): `text-[12px] font-medium text-gray-700` → **`text-[14px] font-semibold text-gray-900`**. ⚠️ **СОНГОСОН tile-ийн өнгө МӨН зассан** (`text-primary` → `text-primary-dark`) — учир нь `text-primary` (**#2563eb**) нь `bg-primary-light` (**#dbeafe**) дэвсгэр дээр **4.03:1** буюу WCAG **AA-д ХҮРЭХГҮЙ** байв ✗; `text-primary-dark` (**#1d4ed8**) нь **5.55:1** → **AA ✓** (тодруулбал шошго томорсон ч 16px bold нь «том текст» (≥18.66px bold) биш тул 4.5:1 шаардлага ХҮЧИНТЭЙ хэвээр ✓). ℹ️ Хамгийн багадаа 4.5:1 гаргах өөр сонголт: `bg-primary-light` дэвсгэрийг цайруулах — гэвч брэндийн хөх өнгийг ХАРАГДУУЛАХГҮЙ байхыг сонгов ✓. ⚠️ **ХӨНДӨӨГҮЙ:** 💰 Зарах / 🔑 Түрээслэх ЧИП (12px — ЭНЭ нь subcategory БИШ, харин үл хөдлөхийн «зарах/түрээслэх» категори ✓), панелийн толгой (13px bold), дэд төрлийн тоолуур (12px), линк бүрийн › сум (14px, `opacity-30`). 🧪 **CDP-ээр бодит баталгаа** (`/tmp/font_tiles.js` + `/tmp/font_subs2.js`; ⚠️ хоёр командыг зэрэг ажиллуулбал НЭГ page target-ыг хуваалцаж, `location.href` нь нөгөөгийнхөө URL-ыг харуулна — хэмжилт хүчинтэй, гэхдээ урд нь/дараа нь болгож ажиллуулах нь найдвартай ✓): **десктоп 1280** — tile-ийн 6 шошго `16px / 700 / rgb(27,24,21)` ✓, tile бүр **58px ИЖИЛ өндөр** ✓ (`tileHeightsUniform: true`, «Гэр ахуйн бараа» 2 мөр болсон ч өндөр ХӨДӨЛӨӨГҮЙ — emoji `leading-[1.4]` = 47.6px нь гол хязгаарлагч ✓), дэд төрөл `14px / 600 / rgb(27,24,21)` ✓ (8 дэд төрөл, **4 багана** хэвээр, панель 79px), **мобайл 390** — мөн `16px / 700` ✓, `tileHeightsUniform: true` ✓; хэвтээ overflow **`390 ≤ 390`** ✓ / **`1265 ≤ 1280`** ✓; зургаар нүдээр батлав (`/tmp/font_mobile.png`, `/tmp/font_desk.png`, `/tmp/font_subs_desk.png` — дэд төрлүүд мэдэгдэхүйц томорч, харлагдсан ✓). Хайх үг: `ФОНТ` (2 коммент). `next build` цэвэр ✓ | — |
| 2026-09-27 | 🅑 **НҮҮР ДЭЭРХ «БҮХ ЗАР» BOLD БОЛОВ** (хэрэглэгчийн хүсэлт: «home page дээр байгаа бүх зар гэсэн үгийг хэрхэн bold болгох вэ»). 📍«Бүх зар» нүүрэнд **2 газар** харагддаг: **(1) BREADCRUMB** — хэсэг сонгоогүй үед сүүлийн (цорын ганц) crumb нь `<span>` болж «Бүх зар» болдог, өмнө нь `font-semibold` (**600**) байв ← bold болгох ЁСТОЙ нь ЭНЭ; **(2) үр дүнгийн `h1`** (`HomeClient.jsx` мөр 1004, `text-xl font-bold sm:text-2xl`) — АЛЬ ХЭДИЙН **700** ✓ (хөндөөгүй). 🔧 **ХЭРХЭН (хэрэгжүүлсэн):** `Breadcrumb` (`components/Breadcrumb.jsx` мөр 37–42) -д **`lastClassName`** prop нэмэв — default нь хуучин `'font-semibold text-gray-500'` (мөр 42), сүүлийн crumb дээр мөр 66-д хэрэглэгдэнэ; `HomeClient.jsx` **мөр 579** нь **`lastClassName="font-bold text-gray-500"`** дамжуулна → нүүрэн дээрх «Бүх зар» 600 → **700** ✓. ⚠️ **ЯАГААД prop, шууд `font-bold` БИШ:** тэр нэг мөр нь **3 хуудсанд** хэрэглэгддэг ба сүүлийн crumb нь хуудас тус бүрд өөр ТЕКСТ — нүүрт «Бүх зар», зарын дэлгэрэнгүйд зарын гарчиг (`ListingDetailClient` мөр 226), нийтлэгчийн заруудад нэр (`SellerListingsClient` мөр 134). Шууд сольвол тэдгээр ч bold болж хүсээгүй өөрчлөлт гарна ✗ (breadcrumb бол нэг систем элемент тул default-ыг хөндөхгүй ✓). 🧪 **CDP бодит хэмжилт** (⚠️ зэрэг ажиллуулбал нэг page target хуваалцаж `Identifier 'nav' has already been declared` алдаа гарсан тул probe-оо IIFE болгож, командуудыг ДАРААЛАН ажиллуулав ✓): нүүр **1280 ба 390** — «Бүх зар» `14px / **700** / rgb(119,111,94)` ✓ (өмнө 600); нүүр `?section=computers` — сүүлийн crumb «Компьютер» **700** ✓ (нүүрэн дээрх бүх сүүлийн crumb); зарын дэлгэрэнгүй — «Цэвэрлэгээ» **600 ✓ ХЭВЭЭР**; нийтлэгчийн зарууд — «khangai» **600 ✓ ХЭВЭЭР**; `h1` «Бүх зар 300» 24px/700 (аль хэдийн bold ✓); хэвтээ overflow `1265 ≤ 1280` ✓. 🎨 **КОНТРАСТ:** `text-gray-500` (#776F5E) цайвар дэвсгэр дээр **4.98:1 ✅ AA**; 14px bold нь «том текст» (≥18.66px bold) БИШ тул 4.5:1 шаардлага ХҮЧИНТЭЙ ✓ (жин нэмэх нь контрастыг өөрчлөхгүй). 📸 Нүдээр: `/tmp/bold_home_desk.png`. 🔍 Хайх үг: `🅑 BOLD` (2 файл). `next build` цэвэр ✓ | — |
| 2026-09-27 | 📄 **ХУУДАСЛАЛТ (pagination) — нэг хуудсанд 50 зар + ПРОФАЙЛЫН ЦЭСНЭЭС «САНАЛ ХҮСЭЛТ» ХАСАВ** (хэрэглэгчийн хүсэлт: «сана хүсэлтийг profile аас хасаарай, доор угаасаа байна ш дээ. нэг хуудсанд 50 аас илүү зар харуулахгүй ба page болгоё»). **(1) 💬 ПРОФАЙЛЫН ЦЭС:** `components/AppProviders.jsx` → `userMenuItems`-ээс `{ key: 'feedback', label: '💬 Санал хүсэлт', href: '/feedback' }` мөрийг **ХАСАВ** — footer (бүх хуудсанд) дээр аль хэдийн байгаа тул давхардал ✗. ⚠️ `userMenuItems` нь НЭГ ЭХ СУРВАЛЖ (desktop dropdown мөр 303 + мобайл доод sheet мөр 432) тул НЭГ мөр хасснаар ХОЁУЛАА цэвэрлэгдэв ✓. ℹ️ `/feedback` хуудас, админы «📨 Админ — Санал хүсэлт» хэвээр ✓. **(2) 📄 СЕРВЕР ТАЛЫН ХУУДАСЛАЛТ:** `lib/queries.js` — `.limit(300)` (хуудаслалт БАЙХГҮЙ ✗) → **`.range(from, to)`** + **`select('*', { count: 'exact' })`**; шинэ `export const LISTINGS_PAGE_SIZE = 50`; буцаалт нь МАССИВ → **ОБЪЕКТ** `{ rows, total, page, pageSize, pageCount, hasMore }` (дуудагч нь зөвхөн `HomeClient` ✓). ⚠️ **2 ДАХЬ ЭРЭМБЭ (`id`) ЗААВАЛ:** seed заруудын `created_at` нь БӨӨН тэнцдэг тул зөвхөн `created_at`-ээр эрэмбэлбэл Postgres нь хуудас бүрт ӨӨР дараалал буцааж, зар ДАВХАРДАХ/АЛГАСАТАХ байв ✗ — `.order('created_at').order('id')` болгож тогтоов ✓. ⚠️ `count` нь `null` ирвэл `hasMore`-ыг «мөр бүтэн дүүрсэн эсэх»-ээр таана (fallback ✓). **(3) 🖥 UI:** `HomeClient` — `page`/`total`/`hasMore` төлөв; `Pagination` + `pageWindow()` (эхний/сүүлийн хуудас ҮРГЭЛЖ + товчлол «…»); `?page=N` (URL sync — 1-р хуудас бичигдэхгүй, хуваалцсан линк зөв нээгдэнэ ✓); гарчигт НИЙТ тоо (`782`), «📄 N дэх хуудас»; товч дархад `#listing-results` руу гүйлгэнэ (мобайлд чухал ✓); газрын зурагт «зөвхөн энэ хуудны» гэсэн тэмдэглэл. ⚠️ **ШҮҮЛТ ӨӨРЧЛӨГДӨХӨД `setPage(1)`** — `setF` / `toggleKhoroo` / `setAttr` / `resetAll` / `backToAllSections` / `changeSection` (зөвхөн хэсэг СОЛИГДОХ үед) / `goToCrumb` / хайлт submit — эс бөгөөс 5-р хуудсан дээр шүүлт тавиад хоосон хуудас харна ✗ (React нэг event-ийн бүх `setState`-ийг багцалдаг тул `load` нэг л удаа ажиллана ✓). **(4) 📱 МОБАЙЛ:** `<sm` → «← Өмнөх | N / M | Дараах →», `sm+` → бүтэн тоон жагсаалт (тоонууд overflow үүсгэхээс сэргийлэв ✓). 🧪 **CDP БОДИТ ТЕСТ (цэвэр dev сервер):** `/` → **яг 50 карт** (давхардал 0), `1–50 / нийт 782`, **16 хуудас**, prev `disabled=true` ✓; `?page=2` → 50 карт, `51–100`, **p1∩p2 = 0 ✓**; `?page=16` → **32 карт** (`751–782`), next `disabled=true` ✓; p1∪p2∪p16 = **132 = 50+50+32** (алгассан/давхардсан мөр БАЙХГҮЙ ✓); **товч дарж** шалгав — «Дараах →» → URL `/?page=2` + контент солигдов ✓, «3» → `/?page=3` ✓; `?section=auto&page=2` дээр «Седан» дарахад URL-аас `page` арилж (`?section=auto&type=Седан`) **1-р хуудас** руу буцав ✓ (10 зар → хуудаслалт бүрэн арилав); Автомашин = нийт **100** (2 хуудас) ✓; **мобайл 390** → мобайл мөр visible / desktop мөр hidden ✓, `hScroll 390` → **хэвтээ overflow БАЙХГҮЙ** ✓; desktop `hScroll 1265 ≤ 1280` ✓. 📸 Нүдээр: `/tmp/bold_auto_desk.png` (хуучин), шинэ pagination-ийг CDP-ээр хэмжив. 🔍 Хайх үг: `📄 ХУУДАСЛАЛТ`, `LISTINGS_PAGE_SIZE`. `next build` цэвэр ✓ | — |

| 2026-09-27 | 🔵 **BREADCRUMB-ИЙН ЛИНК (буцах зам) ЦЭНХЭР + BOLD БОЛОВ** (хэрэглэгчийн хүсэлт: «Бүх зар аас автомашин гэх мэт сонгоход Бүх зар гэсэн хэсгийг цэнхэр болсон bold байгаасай»). 📍 Хэсэг (жишээ нь «Автомашин») сонгомогц «Бүх зар» нь **сүүлийн crumb биш** болж, `<Link>` (буцах зам) хэлбэрээр гардаг — өмнө нь `text-primary hover:underline` буюу **цэнхэр (#2563eb rgb(37,99,235)) ч жин 400 (нимгэн)** байв. ⚠️ Хэрэглэгчийн харсан зүйл: «Бүх зар» (400) баталгаажаагүй мэт сул, харин «Автомашин» (сүүлийн crumb, 700) хүчтэй — тэнцвэргүй. 🔧 **ХЭРХЭН:** `components/Breadcrumb.jsx` — **`linkClassName`** prop нэмэв (мөр 62, default `'text-primary hover:underline'` → бусад хуудас ХӨНДӨГДӨХГҮЙ ✓), `<Link className={linkClassName}>` (мөр 80) болж линкэн дээр хэрэглэгдэнэ; `components/HomeClient.jsx` (мөр 589) нь **`linkClassName="font-bold text-primary hover:underline"`** дамжуулна → «Бүх зар» 400 → **700**, цэнхэр хэвээр ✓. ⚠️ Ингэснээр сонгосон хэсэг (сүүлийн crumb, bold саарал) ба буцах зам (линк, bold цэнхэр) хоёулаа ИЖИЛ ЖИНТЭЙ, зөвхөн өнгөөр ялгагдана (цэнхэр = дарж болно / hover-т доогуур зураас, саарал = одоогийн байрлал) ✓. ⚠️ **ЯАГААД prop, шууд `font-bold` БИШ:** тэр линк нь **3 хуудсанд** байдаг (нүүр, зарын дэлгэрэнгүй `ListingDetailClient`, нийтлэгчийн зарууд `SellerListingsClient`) — `lastClassName`-тай ижил аргаар зөвхөн нүүрэнд хэрэглэв (систем элементийн үндсэн default-ыг хөндөхгүй ✓). 🔤 Хамт: сүүлийн crumb-ийн өнгө **`text-gray-500` → `text-gray-700`** (хэрэглэгчийн ажлын мод дахь өөрчлөлт, commit-д багтав) → #454037, контраст 4.98:1 → **~7.5:1 AAA↑** ✓. 🧪 **CDP бодит хэмжилт** (командуудыг ДАРААЛАН ажиллуулав — зэрэг ажиллуулбал нэг page target хуваалцдаг ✗): нүүр `?section=auto` — «Бүх зар» `<a class="font-bold text-primary hover:underline">` **14px / 700 / rgb(37,99,235)** ✓, «Автомашин» 700 „gray-700“ ✓; нүүр deep (`section=real-estate&category=sell&type=Орон сууц&rooms=3`) — 4 линк БҮГД 700 цэнхэр, сүүлийн crumb «3 өрөө» 700 ✓; **390 мобайл** — 700 ✓, хэвтээ overflow БАЙХГҮЙ (`hScroll 390 ≤ 390`) ✓; зарын дэлгэрэнгүй — линкүүд **400 ✓ ХЭВЭЭР** (Бүх зар / Үл хөдлөх / Үл хөдлөх зарна); нийтлэгчийн зарууд — линк **400 ✓ ХЭВЭЭР**. 🎨 **КОНТРАСТ:** #2563eb нь gray-100 (#F4F1EA) дээр **4.58:1**, хуудасны цайвар дэвсгэр дээр арай өндөр → **AA ✓** (14px bold нь «том текст» ≥18.66px БИШ тул 4.5:1 хэвээр хүчинтэй; жин нэмэх нь контрастанд нөлөөлөхгүй ✓). ⚙️ Линк бүхэн ЦЭНХЭР BOLD байхыг хүсвэл (бүх хуудсанд): `Breadcrumb.jsx` мөр 62-ын default-ыг `'font-bold text-primary hover:underline'` болгоод `HomeClient.jsx` мөр 589-ийг хасна. 📸 Нүдээр: `/tmp/bold_auto_desk.png`. 🔍 Хайх үг: `🔵 ЛИНК` (2 файл). `next build` цэвэр ✓ | — |


| 2026-09-27 | 🔤 **BREADCRUMB + ХЭСГИЙН ПАНЕЛИЙН ТОЛГОЙН ФОНТ ТОМОРОВ** (хэрэглэгчийн хүсэлт: «бүх зар, font-semibold text-gray хэсэг болон, “Автомашин” категорийн бүх зарууд, “Компьютер” категорийн бүх зарууд зэргийн фонтыг бас жаахан нэм»). 📍 **2 ФАЙЛ**: **(1) `components/Breadcrumb.jsx` мөр 32** — «Бүх зар» гэсэн замчилсан цэс: `text-[13px]` → **`text-[14px]`**. ⚠️ Хэрэглэгчийн заасан «бүх зар, font-semibold text-gray» нь ЯГ энэ элемент: сүүлийн (одоогийн) crumb нь `font-semibold text-gray-500`, нүүр хуудсан дээр хайлтгүй үед ганцаараа үлдэж «Бүх зар» гэж харагдана (CDP баталгаа: `SPAN.font-semibold.text-gray-500`, 13px/600, rgb(119,111,94)). ⚠️ Энэ компонент **3 хуудсанд** хэрэглэгддэг — нүүр (`HomeClient` мөр 562), зарын дэлгэрэнгүй (`ListingDetailClient` мөр 226), нийтлэгчийн зарууд (`SellerListingsClient` мөр 134) → breadcrumb БҮХЭЛДЭЭ +1px (систем элемент тул ижил хэмжээтэй байх ЁСТОЙ ✓). **(2) `components/HomeClient.jsx` мөр 639 · 646 · 652** — drill-down панелийн ТОЛГОЙ («X» категорийн бүх зарууд): толгойн товч `text-[13px]` → **`text-[14px] sm:text-[15px]`**; тоолуур `text-[12px]` → `text-[13px]`; «← Бүх хэсэг» чип `text-[12px]` → `text-[13px]` (нэг мөрөнд байгаа тул ижил хэмжээтэй ✓). ⚠️ **Мобайлд 15px БОЛОХГҮЙ:** «“Компьютер” категорийн бүх зарууд 110» гэсэн мөр 390px дээр 2 болж, товч 334×53 болж ХУГАЦАА ҮРЭГДҮҮЛЖ байв ✗ → мобайл **14px** (1 мөр, 332×29 ✓), desktop (≥640px) **15px** (349×31 ✓). 🎨 **КОНТРАСТ** (панелийн дэвсгэр `bg-gray-100` = **#F4F1EA**, бодит хэмжилт): толгой `text-primary` (**#2563eb**) → **4.58:1 ✅ AA** (15px bold нь «том текст» ≥18.66px bold БИШ тул 4.5:1 шаардлага хүчинтэй — аравтын нарийн багтав ⚠️); «← Бүх хэсэг» `text-gray-600` (**#5D5747**) → **6.38:1 ✅ AA**. ⚠️ **ХАМТ ЗАССАН AA АЛДАА:** панелийн тоолуур нь `text-gray-500` (#776F5E) байсан → gray-100 дэвсгэр дээр **4.41:1** буюу AA-д ХҮРЭХГҮЙ байв ✗ → **`text-gray-600`** болгов → **6.38:1 ✅ AA** (өмнөх commit-ийн «ХӨНДӨӨГҮЙ: панелийн толгой 13px, тоолуур 12px» тэмдэглэлийг ЭНЭ commit ХҮЧИНГҮЙ болгов). ℹ️ **ХӨНДӨӨГҮЙ:** үр дүнгийн `h1` («Бүх зар 300» — 20px / `sm:text-2xl` 24px font-bold, `HomeClient` мөр 995) ба түүний тоолуур (16px gray-500 — цагаан дэвсгэр дээр 4.98:1 ✓ AA); дэд төрлийн жагсаалт (14px — өмнөх commit) ✓. 🧪 **CDP-ээр бодит баталгаа** (десктоп 1280×900, мобайл 390×844; `?section=auto` ба `?section=computers`; ⚠️ ХОЁР командыг ЗЭРЭГ ажиллуулбал НЭГ page target хуваалцаж нөгөөгийнхөө URL-ыг харуулна ✗ → дараалан ажиллуулав): breadcrumb 14px ✓; толгой **15px/700 десктоп, 14px/700 мобайл** ✓; тоолуур **13px rgb(93,87,71)** ✓; чип **13px/600** ✓; хэвтээ overflow `1265 ≤ 1280` ✓ / `390 ≤ 390` ✓; панель 166 → **169px** (+3px ✓). Зургаар нүдээр батлав: `/tmp/bc_desk2.png`, `/tmp/panel_desk2.png`, `/tmp/panel_mobile2.png`. 🔍 Хайх үг: `ФОНТ` (коммент бүр `🔤 ФОНТ`-оор эхэлнэ). `next build` цэвэр ✓ | — |



| 2026-09-25 | 📐 **Tile сүлжээний зайг `globals.css`-ийн НЭРЛЭСЭН класс болгов** (хэрэглэгчийн хүсэлт: «тэгш хаалттай хайлт төвөгтэй»). ⚠️ **Асуудал:** Tailwind-ийн `gap-[1cm]` класс нь `[ ]` хаалтнаас болж editor-ийн хайлтад ОЛДДОГГҮЙ байв (`[1cm]` нь regex-ийн тэмдэгтийн класс болж, «gap-1»/«gap-c» гэж хайдаг). **Шийдэл:** `app/globals.css` → `@layer components` дотор `.tile-grid { gap: 1cm; }` + **37 мөрийн тайлбар** (хайх үг «tile-grid», юу вэ, хаана 2 газарт хэрэглэгдэх, солих 6 жишээ: `0.5cm`/`24px`/`40px`/`clamp()`, мобайл/десктоп media query). `components/HomeClient.jsx` 600 ба 631-р мөрөнд `gap-[1cm]` → `tile-grid`. ⚠️ Tailwind-ийн `gap-*` нь `@layer components`-оос ДАВАМГАЙ (specificity) тул className-д `gap-…` БИЧИХГҮЙ. **ТЕСТ:** build CSS-д `.tile-grid{gap:1cm}` ✓, SSR HTML-д `class="tile-grid grid grid-cols-2 …"` ✓, `gap-[1cm]` үлдэгдэл 0 (зөвхөн тайлбарын коммент), `next build` цэвэр, `localhost:3000` 200, алдаа 0 | — |
| 2026-09-25 | 🌱 **ЖИШЭЭ ӨГӨГДӨЛ — хэсэг ба дэд төрөл бүрт 10 зар** (`scripts/seed-sections.mjs`, `npm run seed:sections`). **690 зар** оруулав (🏠 8×10 + 🚗 10×10 + 💼 15×10 + 💻 11×10 + 🛋️ 11×10 + 🛠️ 14×10) → DB-д нийт **782** зар. Хэсэг тус бүрд ТОХИРСОН `attrs` (jsonb): авто → брэнд/загвар/он/гүйлт/хүрд/түлш/хөтлөгч; ажил → компани/албан тушаал/цалин/туршлага/хэлбэр; компьютер → CPU/RAM/SSD/дэлгэц; бараа → материал/хэмжээ/өнгө; үйлчилгээ → хэлбэр/хамрах хүрээ/цаг/үнийн хэлбэр. ⚠️ **Реализмын 2 засвар:** (1) брэнд+загвар нь ДЭД ТӨРӨЛД тохирно (`AUTO_SUBTYPE_PAIRS`, `PC_SUBTYPE_PAIRS`) — «Трактор, хөдөө аж ахуй» дэд төрөлд **BMW X5** орж байсныг John Deere/MTZ/Кировец болгов, «Авто сэлбэг»-т он/гүйлт ХАСАВ, «Монитор» дэд төрөлд CPU/RAM хэрэггүй болсон; (2) «Албан тушаал» нь дэд төрөлд тохирно (`JOB_POSITIONS`) — «IT, программист» дэд төрөлд «Техникч» гарч байсныг DevOps/Дата аналитик болгов. **Хамт хийсэн:** `jobs` хэсэгт шинэ attr талбар **«💼 Албан тушаал»** нэмэгдэв (`lib/locationData.js` — форм + шүүлт + карт); карт дээр «Мобиком · Программист · ₮1,300,000 · 🕒 Бүтэн цаг» гэж харагдана (`formatAttrsLine`-д icon-ГҮЙ тусгай дүрэм). IDEMPOTENT: `description` дотор `#demo-heseg10` тэмдэгтэй мөрүүдийг устгаад дахин үүсгэнэ (2× ажиллуулж шалгав — 782 хэвээр). `DRY_RUN=1` горим бий (DB-д хүрэхгүй). Зургууд: үл хөдлөх → `property-N.svg`, бусад хэсэгт `images: []` → карт нь ХЭСГИЙН ICON placeholder. **ТЕСТ:** дэд төрөл бүрт ЯГ 10 зар (60/60 шалгав, үл хөдлөхөд хуучин 92 нэмэгдсэн), attr шүүлт (`attrs->>brand=Toyota` → 19, `attrs->>fuel=Хайбрид` → 28), `formatAttrsLine` 6 хэсгийн жишээ, SSR бүх хуудас 200, серверийн алдаа 0 | — |
| 2026-09-25 | 🗂 **ЗАРЫН ХЭСГҮҮД — апп нь зөвхөн үл хөдлөх БИШ боллоо** (`supabase/migrations/0016_listing_sections.sql`). Шинэ 5 хэсэг: **🚗 Автомашин · 💼 Ажлын зар · 💻 Компьютер · 🛋️ Гэр ахуйн бараа · 🛠️ Үйлчилгээ** (одоо байгаа 🏠 Үл хөдлөхтэй нийт 6). **Гол шийдвэр:** хэсэг бүр өөр талбартай (авто: брэнд/он/гүйлт/түлш; ажил: компани/цалин/туршлага; компьютер: CPU/RAM/хадгалах сан) тул **20+ багана** нэмэхийн оронд `listings.section` (text) + `listings.attrs` (**jsonb**) нэмэв — шинэ хэсэг нэмэхэд SQL бичихгүй, зөвхөн `lib/locationData.js → SECTIONS` дээр объект нэмнэ (форм, шүүлт, карт автоматаар үүснэ). `property_type` нь **дэд төрөл** болж өргөжив (`category` sell/rent ХЭВЭЭР — үл хөдлөх ба авто л хоёуланг ашиглана; ажил/компьютер/бараа/үйлчилгээнд «Түрээслэх» таб БАЙХГҮЙ). **UI:** хэсгийн табууд (бүх дэд төрлийн дээр, ҮРГЭЛЖ харагдана) · категори табууд хэсгээс хамаарна · дэд төрлийн табууд + тоо хэсгээр · sidebar-д attr шүүлтүүд (select) · карт дээр нэг мөрөнд гол шинж (`Toyota Harrier, 2021 · 95,200 км · ⚙️ Автомат · 2.5 л · ⛽ Хайбрид`) · breadcrumb `Бүх зар › Автомашин › …` · URL `/?section=auto&type=Седан&attr_brand=Toyota`. 🏠 **Үл хөдлөхийн UI БҮРЭН ХЭВЭЭР** (өрөө/талбай/давхар/тагт/гараж/угаалгын өрөө; «Талбай» шүүлт ба форм нь зөвхөн `real-estate`-д). ⚠️ **Хамт зассан ЧУХАЛ алдаа:** `jsonb_path_ops` GIN индекс нь PostgREST-ийн `attrs->>brand=eq.X` (`->>` оператор) шүүлтэд **тохирохгүй** тул expression индекс (`((attrs ->> 'brand'))`, `((attrs ->> 'condition'))`) нэмэв — `explain` → `Index Scan using listings_attrs_brand_idx` ✅. ⚠️ `property_type` хэсэг хооронд давхцаж болох тул дэд төрлийн тоо/шүүлт нь `section`-оор ЗААВАЛ хязгаарлагдана. ⚠️ `attrs`-ийн хоосон утгыг `cleanAttrs()` хасна (эс бөгөөс `attrs->>model=eq.` хоосон шүүлт үүснэ). **ТЕСТ:** 0016 локал PostgreSQL 16 дээр 2× (idempotent) ажиллаж, CHECK нь буруу `section`-ыг ТАТГАЛЗСАН, хуучин зарууд `real-estate`/`{}` болж backfill хийгдсэн, attr шүүлт ба индекс ажилласан; `formatAttrsLine`/`getSubtypes`/`getSectionCategories`/`getAttrFilters` — **32/32 логик тест**; `next build` цэвэр. `npm run check:supabase`-д 0016 шалгалт нэмэгдэв | — |
| 2026-09-25 | 💰🔑 **«Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөхөд үлдэв** (хэрэглэгчийн хүсэлт). Өмнөх 0016-д автомашины хэсэг ч `rent` («Түрээслүүлнэ») сонголттой байсан — одоо **зөвхөн 🏠 Үл хөдлөх** нь `categories: ['all','sell','rent']`; бусад 5 хэсэг (Автомашин, Ажлын зар, Компьютер, Гэр ахуйн бараа, Үйлчилгээ) `categories: ['all']`. Шинэ helper `hasCategoryChoice(section)` — зөвхөн үл хөдлөхөд `true`. **Хамрах хүрээ (5 газар):** (1) нүүр хуудасны КАТЕГОРИ мөр `{showCategories && …}` — бусад хэсэгт БҮРЭН БАЙХГҮЙ, (2) зарын форм дахь «Зар эсвэл түрээс» select `{showCategoryChoice && …}` — хэсэг солиход `category` нь `sell` болж буцна + payload-д `category: isRealEstate ? form.category : 'sell'`, (3) `ListingCard`-ийн «Зарах/Түрээс» badge `{isRealEstate && …}` (авто зарын карт дээр «Зарах» гэж буруу харагдахаа болив), (4) `/sellers/[id]` — `Зарах/Түрээслэх` табууд ба тооны badge-ууд нь зөвхөн үл хөдлөх зартай үед (`hasRealEstate`), (5) `fetchSellerCategoryCounts()` — `sell`/`rent` тоо нь одоо **зөвхөн үл хөдлөхийн** зард (`realEstate` талбар нэмэгдэв), `total` нь бүх зар. ⚠️ URL-аас уншихад: `section` нь ЭХЛЭЭД уншигдаж, «Зарах/Түрээслэх» нь зөвхөн `real-estate` үед; мөн хэсэгт тохирохгүй дэд төрөл (`?section=auto&type=Орон сууц`) орхигдоно. **ТЕСТ:** 44/44 (бүх 5 хэсэгт `sell`/`rent` ГАРАХГҮЙ, `hasCategoryChoice` зөв, `sell/rent`-тэй хэсэг НЭГ л), `next build` цэвэр, dev серверт алдаа 0 | — |
| 2026-09-25 | 🧭 **ХЭСГИЙН НАВИГАЦИ — DRILL-DOWN (хоёр төлөв) + БАГАНА (grid)** (хэрэглэгчийн хүсэлт). Өмнө нь 6 хэсэг нь `flex-wrap` ЦУВАА хэлбэрээр ҮРГЭЛЖ харагддаг байв (сонгосон ч бусад нь алга болдоггүй) — одоо: (1) `sectionOpen = false` → **зөвхөн 6 ХЭСЭГ** tile хэлбэрээр `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` (мобайл→десктоп), (2) хэсэг дээр дарвал → **БУСАД ХЭСЭГ БҮРЭН АЛГА БОЛЖ**, зөвхөн тухайн хэсгийн ДОТООД (дэд төрөл) нь `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` **багана** болж харагдана + панелийн толгойд `{icon} {нэр} {нийт тоо}` ба «← Бүх хэсэг» буцах товч, (3) «💰 Зарах / 🔑 Түрээслэх» нь панел дотор, зөвхөн үл хөдлөхөд. ⚠️ Дэд төрөл сонгомогц ПАНЕЛЬ БҮРЭН АЛГА БОЛНО (progressive disclosure хэвээр) — буцах зам нь breadcrumb. `changeSection(v, { open })` нь аль хэдийн сонгогдсон хэсэг дээр дарахад ч НЭЭНЭ (шүүлт цэвэрлэхгүй). `?section=auto` линк нээхэд автоматаар ② төлөвт орно. Дэд төрлийн badge нь `typeCounts` татагдахаас өмнө `undefined` → харагдахгүй (мөр үсрэхгүй). Панелийн толгойн нийт тоо = `typeCounts`-ийн нийлбэр. **ТЕСТ:** SSR-д `/` нь **зөвхөн 6 хэсэг** багтааж, дэд төрөл (Орон сууц/Седан/Зөөврийн компьютер) **0 удаа** гарсан; `next build` цэвэр; dev серверт алдаа 0 | — |
| 2026-09-25 | 🐛 **3 АЛДАА зассан — «Бүх зар» руу буцаж чадахгүй байсан + Үл хөдлөх урьдчилан сонгогддог байсан** (хэрэглэгчийн мэдэгдэл). (1) **`resetAll()` нь `section`-ыг сэргээдэггүй байв** — breadcrumb-ийн «Бүх зар» дарсан ч `section='auto'` хэвээр үлдэж, зөвхөн автомашины зарууд харагдсаар байв. Одоо `setSection('all')` + `setSectionOpen(false)` нэмэгдэв. (2) **«← Бүх хэсэг» товч зөвхөн панелийг хаадаг байв** — хэсэг (`auto`) хэвээр үлдэж «буцаж чадахгүй» мэт санагддаг байв. Одоо `backToAllSections()` нь хэсэг + категори + дэд төрөл + attr-ыг бүрэн арилгана (байршил/үнэ хэвээр). (3) **Үндсэн дэлгэц `'real-estate'`-ээр эхэлдэг байв** → анхдагч нь **`'all'`** болж, ямар ч хэсэг урьдчилан сонгогдохгүй (`aria-selected` бүгд `false`), гарчиг «Бүх зар», зарууд нь БҮХ ХЭСГИЙНХ. **Дараагийн өөрчлөлтүүд:** `fetchListings` нь `section='all'` үед шүүлт ХИЙХГҮЙ (`section=eq.all` гэж хайж 0 үр дүн буцаахаас сэргийлэв) — ⚠️ ингэснээр 0016 migration-ыг ажиллуулахаас ӨМНӨ ч үндсэн дэлгэц ажиллана; `typeCounts` нь хэсэггүй үед query явуулахгүй; breadcrumb нь `nav.section`-ыг дэмжинэ (эс бөгөөс «Автомашин»-аас «Үл хөдлөх» дарвал хэсэг солигдохгүй байв) + хэсэггүй үед категори crumb гарахгүй. ⚠️ **Хамт бариулсан алдаа:** `noSection`-ыг hook-ийн ДАРАА зарласан тул `useEffect`-ийн deps массивт (рендерийн үед үнэлэгддэг) хэрэглэгдэхэд **TDZ ReferenceError** гарах байсан — бүх hook-ийн өмнө зөөв. **ТЕСТ:** 20/20 breadcrumb/URL тест; SSR-д `/` нь `aria-selected=true` **0** (ямар ч хэсэг сонгогдоогүй), `false` 6, дэд төрөл 0, гарчиг «Бүх зар»; `next build` цэвэр; цэвэр ачаалалтад серверийн алдаа 0 | — |
| 2026-09-23 | Шинжилгээ хийж, энэ файлыг үүсгэсэн | — |
| 2026-09-23 | 📈 «Миний зарууд → Статистик» таб: 1/3/7/30 хоногийн хандалт, өдөр тутмын график, зар тус бүрийн эрэмбэ. `0010_listing_activity_daily.sql`, `lib/activityWindows.mjs`, `lib/listingActivity.js`, `/api/my-listings/stats`, `npm run test:activity` (34 тест) | — |
| 2026-09-23 | 🔧 Засвар: (1) «Хамгийн эрэлттэй зар» нь **сонгосон хугацаагаар** эрэмбэлэгддэг болсон (өмнө нь 30 хоногоор тогтмол байсан тул буруу зар харуулдаг байв), (2) **«Нийт»** сонголт нэмэгдсэн, (3) «Шинэ үзсэн хүн»-ийг **UI-д харуулахгүй** болсон | — |
| 2026-09-23 | 🎨 (1) Статистикаас **зараа шууд засах** боломж (✏️ товч → `fetchListingById` → `openEdit`, хадгалсны дараа авто-шинэчлэлт), (2) **графикийг сайжруулав**: Y тэнхлэг+grid, градиент багана, `animate-grow-up`, hover tooltip, гарагийн товчлол, legend, дундаж/макс. Тест 34 → **40** | — |
| 2026-09-23 | 🔘 **Бүх товчийг орчин үеийн, сүүдэртэй (3D мэт) болгов** — `.btn` нэг систем: `rounded-full` + градиент биет + 4 давхаргат сүүдэр (inset цагаан ирмэг, inset бараан ирмэг, ойрын сүүдэр, өнгөөрөө гэрэлтсэн алсын сүүдэр) + `enabled:hover` өргөгдөх/`enabled:active` дарагдах. `tailwind.config.js`-д 13 `boxShadow` токен. Мөн `/my-listings` дэх давхардсан **«➕ Зар нэмэх» хасагдсан**, табуудыг сегмент-контрол болгов | — |
| 2026-09-23 | 🧹 `/my-listings`-ээс **«🌐 Бүх зарууд» таб хасагдсан** — «Миний зарууд» гэдэг хуудас дээр бусдын зарууд харагдах нь төөрөгдүүлж байв. Одоо зөвхөн өөрийн зар (+📈 Статистик), нүүр хуудас руу чиглүүлэх тодруулга нэмэгдсэн. `isMine` шалгалт, `fetchListings` import, нэвтрээгүй хэрэглэгчийн «Бүх зарууд руу шилжих» логик бүгд хасагдсан | — |
| 2026-09-23 | 🏛 **LUXURY Фаз 1 — дулаан нейтрал (Sandstone).** `tailwind.config.js`-д `colors.gray`-г бүрэн дарж бичив (50–950) → апп даяар **462 газар** дулаан болсон, нэг ч компонент засахгүйгээр. Контраст хэмжиж баталгаажуулав (gray-500: 4.98:1, өмнө 4.83). Хамт нээгдсэн алдаа зассан: footer-ийн `text-gray-500` → `text-gray-400` (3.55:1 → **7.41:1** AA ✅) | — |
| 2026-09-23 | 💰 **Үнийн талбар — мянгатын таслалт + амьд тусламж.** `type="number"` → `type="text" + inputMode="numeric"` (number нь таслалтай утгыг хүлээхгүй). Бичих үедээ `250,000,000` болж хуваагдаж, доор нь «₮ 250,000,000 · 9 орон · ≈ 250 сая ₮» харагдана. **Төлөвт зөвхөн ЦИФР** хадгална — `queries.js → toNumber()` нь `,`-г аравтын бутархай гэж үздэг тул таслалтай утга илгээвэл үнэ чимээгүй **0** болдог (тестээр бариулсан). Шинэ: `formatThousands`/`digitCount`/`shortPrice`, `npm run test:format` (12 тест), 3 валидаци | — |
| 2026-09-23 | 🎥 **YouTube видео линк** (README-ийн «Бичлэг» хэсгийн **Сонголт C**). Storage **0 MB** — видео файл биш, зөвхөн линк. `lib/youtube.mjs` (цэвэр, **18 тест**), `components/YouTubeField.jsx` (thumbnail preview + ✕), `0011_listing_video.sql` (`video_url`), дэлгэрэнгүй хуудсанд «дарж тоглуулах» iframe (хурд+нууцлал), карт дээр 🎥 badge. Хадгалахдаа КАНОНИК линк болгож хөрвүүлнэ. ⚠️ **XSS-ээс хамгаалсан:** зөвхөн 11 тэмдэгтийн ID-г ялгаж аваад бид өөрсдөө youtube.com/i.ytimg.com URL угсарна. ⚠️ **Хамт зассан эрсдэл:** `updateListing()`-ийн DELETE+INSERT fallback нь `DETAIL_ROW_KEYS`-ийг хасалгүй байсан тул (багана байхгүй + UPDATE policy байхгүй үед) **зар алга болох** боломжтой байв. Шинэ: `npm run migration:copy` скрипт (`scripts/setup-migration.js`) | — |
| 2026-09-23 | 🎯 **«Дэлгэрэнгүй хайлт» товчийг анхаарал татахуйц болгов.** Градиент pill + `shadow-btn-primary` + ард нь **blur-тай цайвар гэрэлтэлт (glow)** (идэвхтэй хайлттай үед хүчтэйрнэ), `⚙️` icon нь `bg-white/20` дугуй дотор, идэвхтэй тоо нь **цагаан дугуй** дотор (градиент дээр ялгагдана). Нээгдсэн панель нь `border-2 border-primary/25` + `shadow-card-hover`, толгой нь `bg-primary/5` зурвас + «N хайлт» badge + hover-доо цэнхэр болох «✕ Хаах» товч. Панeлийн толгойг сөрөг margin-аар байрлуулсан тул доорх форм-ыг дахин бүтэцлээгүй | — |
| 2026-09-23 | 🔄 **Header-ийн товчны байр солив.** `➕ Зар нэмэх` → хамгийн ЭХЭНД, дараа нь `❤️ Таалагдсан`, хамгийн БАРУУНД `👤 Нэвтрэх / Хэрэглэгчийн цэс` (өмнө нь Нэвтрэх нь эхэнд, Зар нэмэх нь баруунд байсан). DOM-оор нь зөөсөн (CSS `order` БИШ) — keyboard/tab дараалал харагдацтайгаа нийцнэ | — |
| 2026-09-23 | ❌ **Zillow загварын hero оролдлого — БУЦААГДСАН.** Hero доторх категори segmented, дугуй хайлтын мөр + градиент товч, «Түгээмэл хайлт» чипүүд, найдварын тоо, зэрэгцээ `blur-3xl` гэрэлтэлтүүдийг хийж үзээд хэрэглэгчид «сонин» санагдсан тул **бүгд хуучнаараа сэргээв** (категори таб hero-гийн доор, энгийн хайлтын мөр, `flex-wrap` төрлийн мөр). ⚠️ Дахин оролдохдоо эхлээд асууна уу — энэ хэв маяг энэ төсөлд тохирохгүй байна | — |
| 2026-09-25 | 🎛 **Хайлтын панель —  загвар.** (1) **«Өрөө»** нь `<select>` биш, **ЧИП** болсон: `Бүгд · 1 өрөө · 2 өрөө · 3 өрөө · 4 өрөө · +5 өрөө` (`ROOM_OPTIONS`). (2) **«Худалдаа, үйлчилгээний талбай»** (мөн Оффис/Газар/Үйлдвэр/Гараж) дээр «Өрөө» мөр **БҮРЭН ХАТАГДАНА** (`hasRoomsFields`, төрөл солиход утга нь ч цэвэрлэгдэнэ). (3) Панель нь 4 баганы grid биш, **«шошго │ утга» мөр** (`FilterRow`) хэлбэртэй — Хот/Аймаг ба Дүүрэг хажуу хажууд, хороо доор нь. (4) **Breadcrumb үргэлж харагдана** — «Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө» (өмнө нь хайлт байхгүй бол `[]` буцаадаг байв). 25 логик тест | — |
| 2026-09-25 | ↩️ **Олон дүүрэг сонгох нь БУЦААГДСАН.** Тухайн өдөр хийсэн «Дүүрэг = олон сонголттой чип» (`filters.districts` массив, `query.in('district', …)`, `getKhoroosForDistricts()`) хувилбарыг хэрэглэгчийн хүсэлтээр буцаав. Дүүрэг нь дахин **нэг сонголттой `<select>`** (`filters.district` string, `query.eq('district', …)`). ⚠️ Хуучин `district=А,Б` линк ирвэл **эхний** дүүргийг л авна (`parseListParam(...)[0]`). **Хороо хэвээрээ олон сонголттой** (`filters.khoroos` — массив). «Өрөө» чип, `+5 өрөө`, мөрчилсөн панель, байнга харагдах breadcrumb хэвээрээ | — |
| 2026-09-25 | 📐 ** загварын 2 БАГАНАТ бүтэц (sidebar).** Бодит  хуудсыг (`/l-hdlh/l-hdlh-zarna/oron-suuts-zarna/`) задалж үзээд дараахыг хийв: (1) Шүүлт нь ДЭЭД нуугдах панель биш, **ЗҮҮН талд байнга харагдах SIDEBAR** (`lg:sticky lg:top-4 lg:w-[280px]`, `SideBlock` = гарчиг + оролт, `divide-y`) — баруун талд гарчиг + үр дүн. (2) **Гарчигт НИЙТ ТОО** — «Орон сууц түрээслүүлнэ **12**» (`<h1>`). (3) **ӨРӨӨНИЙ ТООТОЙ МӨР** — «1 өрөө 1,088 · 2 өрөө 6,509 · …» (`fetchRoomCounts()` — зөвхөн категори + төрлөөр, 5 зэрэгцээ `head: true` count; «+5 өрөө» = `rooms >= 5`). (4) **«Эхлэх / Дуусах»** хос оролт (Үнэ, ₮ · Талбай, м²) —  placeholder. (5) Sidebar-ийн доод хэсэгт «🔍 Хайх» + «N зар харуулах» + «↺ Хайлтыг цэвэрлэх». (6) Мобайл дээр sidebar НУУГДАЖ «🔍 Хайлт» товчоор нээгдэнэ (товч DOM-д өмнө байрлана → дээгүүр гарна). Карт, pagination хэвээрээ | — |
| 2026-09-25 | 📊 **АДМИНЫ ХЯНАЛТЫН САМБАР** (`/admin`). Шинэ хуудас + API + client: `lib/adminStats.js` (`getAdminStats()` — нэг дор бүх статистик), `app/api/admin/stats/route.js` (зөвхөн админд, `requireAdmin`), `components/AdminDashboardClient.jsx`, `components/AdminNav.jsx` (бүх 4 admin хуудсанд нэгдсэн навигаци). **Юу харуулдаг вэ:** нийт/өнөөдөр/7 хоног/30 хоногийн **шинэ зар** ба **шинэ хэрэглэгч**; нийт **хандалт** (`listings.views` + `listing_activity_daily`) ба ❤️; өнөөдөр идэвхтэй хэрэглэгч (зар оруулсан эсвэл нэвтэрсэн); зурагтай зарын %; Зарах/Түрээслэх харьцаа; **14 хоногийн баганан график** (зар + хандалт); **хамгийн их үзсэн 10 зар**; **сүүлийн 10 бүртгэл**; төрөл ба хотын задаргаа; санал хүсэлтийн төлөв. ⚠️ `0010`/`0008` ороогүй ч ажиллана (тухайн блок хоосон үлдэнэ). **Бодит DB дээр батлав:** 92 зар (sell 48/rent 44), 22 хандалт, 5 хэрэглэгч, 2 санал, 14 хоногийн цуврал — бүгд зөв тооцоологдсон | — |
| 2026-09-25 | 🧹 **«unegui.mn-ээс хуулсан» гэсэн дурдалт БҮРЭН АРИЛСАН.** Код болон docs дахь `unegui` дурдалт (тайлбарууд: «unegui.mn загвар», «Бодит unegui.mn хуудсыг задалж…»; `package.json`-ий `"name": "unegui-clone"`) бүгд устгагдав — **UI текстэд хэзээ ч байгаагүй** (зөвхөн dev тайлбар ба package name). ⚠️ Логик өөрчлөгдөөгүй. ⚠️ **Замдаа гарсан алдаа:** зай цэвэрлэх `sed` (`s/  +/ /g`) нь бүх тайлбарын мөрийн **ЭХНИЙ ЗАЙ (indentation)-г** устгасан (61 файл, ~1500 мөр) — git HEAD-ээс мөр тус бүрийг тааруулж (trim + дотоод зайг хавтгайруулж харьцуулах) **бүрэн сэргээв**; миний шинээр бичсэн тайлбаруудыг (HEAD-д байхгүй) хөрш мөрүүдийн зайгаар сэргээв. Дифф `+1563/-821` → **`+933/-191`** болж буцаж, зөвхөн damage байсан 9+ файл ЦЭВЭР боллоо | — |
| 2026-09-25 | 🏷 **Брэндийн нэр нэгтгэгдэв: «ZAR.mn» → «Зарлаа.mn».** ⚠️ **ЗӨРЧИЛ байсан:** толгойн лого ба footer нь «ZAR.mn» (27 газар), харин **browser tab `<title>`** нь `app/layout.jsx`-д «**Зарлаа.mn**», admin-ийн нэг tab нь «**ZARLAA.mn**» байв — гурван өөр нэр. Одоо **19 файлын 26 газар** `Зарлаа.mn` боллоо (app/*/page.jsx metadata, `app/terms/page.jsx` ×5, `AppProviders` лого+footer, `FavoritesClient`, `PriceStatsClient`, `lib/exporters.js`, `scripts/doctor.js`, `package.json` description, `README.md`, `docs/IMPROVEMENTS.md`). Лого нь 2 өнгийн хэв маягаа хадгалав: `🏠 Зарлаа` (`text-primary` цэнхэр) + `.mn` (`text-gray-900`). ⚠️ **ХӨНДӨӨГҮЙ:** дотоод имэйл домэйн `phone.zarmn.mn` (`lib/phoneEmail.js → EMAIL_DOMAIN`, 8 газар) ба localStorage түлхүүрүүд (`zarmn_favorites_v1`, `zarmn_device_v1`, `zarmn_viewed_*`, `zarmn:*` event) — хөндвөл **нэвтрэх эвдэрч, хэрэглэгчийн favourite/үзсэн түүх алга болно** | — |
| 2026-09-25 | 🏦 **Ипотекийн тооцоолуур — OPT-IN болсон.** `ListingDetailClient`-ийн `<details>` нь **`open` атрибуттай** байсан тул байр үзэхээр ороход тооцоолуур **шууд баагаад** гарч ирдэг байв (хүчээр). Одоо `open` хасагдаж **анхдагчаар ХААЛТТАЙ** — хэрэглэгч `summary`-г дарж өөрөө нээнэ. «🏦 Ипотекийн тооцоолуур ▼» гэсэн нэг мөр л харагдана (`group-open:rotate-180`-аар ▼↔▲ эргэлдэнэ; native marker нь `list-none` + `[&::-webkit-details-marker]:hidden`-ээр дарагдсан). Зарын үнэ нээгдэхэд автоматаар бөглөгдөнө. Opt-in-ийн 2 дахь зам — `/mortgage` бүтэн хуудас (footer + үнийн статистикийн линк) хэвээр | — |
| 2026-09-25 | 🔑👤 **Нууц үг сэргээх (verify.mn) + нэр ба ПРОФАЙЛ ЗУРАГ + Зар дээр нэр/зураг** (`supabase/migrations/0015_profiles_public.sql`). (1) **Нууц үг сэргээх:** системд ИМЭЙЛ БАЙХГҮЙ (утас → дотоод имэйл) тул цорын ганц зам нь SMS. `/api/auth/reset/start` (утас → verify.mn session + HMAC токен) → 144773 руу SMS → `/api/auth/reset/complete` (токен + утас + `sessionStatus === 'VERIFIED'` 4 шалгалт) → `admin.updateUserById({password})`. UI: `AuthModal`-д `VIEW.RESET` (утас + шинэ нууц үг ×2 → SMS полл). (2) **SMS ХЯЗГААР** (`auth_events`): утас 3/цаг, IP 10/цаг — SMS нь 150₮ тул хязгааргүй бол үлдэгдэл шавхагдана. Бүртгэлийн урсгалд ч нэмэв. (3) **нэр (`display_name`) ба зураг (`avatar_url`)** — `profiles`-д 2 багана + `avatars` bucket (RLS: зөвхөн `avatars/<uid>/…`, 2 MB, jpeg/png/webp) + `ProfileModal` (72px preview, `compressImage` 512px/≤300KB) + хэрэглэгчийн цэсэнд «👤 Профайл (нэр, зураг)». (4) **Зар дээр харуулах** — `fetchProfilesByIds()` (⚠️ `listings.user_id` нь `profiles` руу FK-ГҮЙ тул PostgREST join хийж чадахгүй → 2 дахь query), `Avatar` компонент (зураггүй бол эхний үсэг), `ListingCard`-д нэр, `ListingDetailClient`-д бүрэн seller block (✅ Утсаар баталгаажсан · Элссэн огноо). ⚠️ **НУУЦЛАЛ:** нийтэд `display_name` л харагдана — `name` (жинхэнэ нэр) ХЭЗЭЭ Ч. Тест: 0015 migration локал PostgreSQL 16 дээр 10/10 давав + idempotent | — |
| 2026-09-25 | 🚫 **Зарын ДАВХАРДАЛ + SPAM хамгаалалт** (`supabase/migrations/0014_listing_dedupe.sql`). **Зорилго:** нэг хэрэглэгч нэг зараа давтан оруулахыг хориглох, ГЭХДЭЭ нэг зарыг 2+ хүн (broker) оруулж болно. **Хэрэгжүүлэлт:** (1) `listings.dedupe_key` = `төрөл\|хот\|дүүрэг\|хороо\|хаяг\|өрөө\|талбай` — ⚠️ ҮНЭ/ТАЙЛБАР/ЗУРАГ/УТАС ОРООГҮЙ (тэдгээрийг өөрчлөөд тойрохгүй байх ёстой). (2) `user_id`-ээр шалгана, талбарын `phone`-оор БИШ — нэг утас = нэг бүртгэл (`phoneToEmail()` → `auth.users.email` unique) учраас; `phone`-оор шалгавал 2 broker эзний дугаараар оруулахад 2 дахь нь буруу хориглогдоно. (3) `prevent_duplicate_listing` BEFORE INSERT/UPDATE триггер: 30 хоногт давхардуулахгүй + 24 цагт 3-аас олон ШИНЭ зар оруулахгүй. (4) `listing_history` — устгасан зарын tombstone (RLS идэвхтэй, policy БАЙХГҮЙ) → «устгаад дахин оруулах» тойрог зам хаалттай. (5) ⚠️ `updateListing()`-ийн DELETE+INSERT fallback нь мөн id + 10 мин цонхоор хамгаалалтаас ХАСАГДАНА — эс бөгөөс зар устгачихаад оруулж чадахгүй болж АЛГА БОЛНО. (6) `dedupeError()` — триггерийн монгол мессежийг `(23505)` хавсаргагүйгээр харуулна. (7) 🐛 Хамт зассан: fallback нь `views`/`likes`-ыг дамжуулдаггүй тул тоолуур 0 болж RESET хийдэг байв. **ТЕСТ:** бодит PostgreSQL 16 дээр 10/10 давав (үнэ өөрчлөх, broker-ийн давхар зар, spam хязгаар, fallback-ийн зар алга болохгүй байх, устгаад дахин оруулах). `npm run check:supabase`-д 0014 шалгалт нэмэгдэв | — |
| 2026-09-25 | ✏️ **Оролтын placeholder «Эхлэх / Дуусах» → «Доод / Дээд».** Sidebar-ийн «Үнэ, ₮» ба «Талбай, м²» блок дахь хос оролтын placeholder-ууд нь  «Эхлэх / Дуусах» (эхлэх/дуусах утга → буруу ойлгогдож байв) биш, **«Доод / Дээд»** болсон. `aria-label`-ууд ч мөн адил шинэчлэгдэв (`Үнэ (доод)`, `Үнэ (дээд)`, `Талбай (доод)`, `Талбай (дээд)`) — дэлгэц уншигчид ижил нэршилтэй болно | — |
| 2026-09-25 | 🎯 **Sidebar-ийн толгойг ГОЛЛОВ + тооны утгыг тодруулав.** «🔍 Хайлт» нь одоо голлосон (`justify-center`); «✕ Хаах» товч (мобайл) нь `absolute right-3 top-1/2` болж урсгалаас гарсан тул голыг хөдөлгөхгүй. Хажууд гарах **тоо** нь `activeFilterCount` — **идэвхтэй хайлтын нөхцлийн тоо** (төрөл · өрөө · хот · дүүрэг · хороо · доод/дээд үнэ · доод/дээд талбай, дээд тал нь 9). Төөрөгдөл гаргахгүйн тулд `title` + `aria-label` нэмэв: «N хайлтын нөхцөл идэвхтэй байна». ⚠️ Ангилал (Зарах/Түрээслэх) ба hero-гийн хайлтын үг энэ тоонд ОРОХГҮЙ | — |
| 2026-09-25 | 🔤 **Гарчиг «Шүүлт» → «🔍 Хайлт» болсон + томруулдаг шилний тэмдэгт.** Sidebar-ийн толгой дахь `⚙️` (шестерёнка) тэмдэгтийг **томруулдаг шил (🔍)** болгож, «Шүүлт» гэсэн үгийг **«Хайлт»** болгов — hero дээрх хайлтын товчинтой (`🔍 Хайх`) ижил тэмдэгттэй болж, «энэ бол хайлт» гэдэг нь шууд мэдэгдэнэ. Мобайл дээрх нээх товч ч мөн `🔍 Хайлт` болсон. Толгойн `bg-primary` дугуй badge хасагдаж, энгийн 16px emoji болсон (минимал харагдац). ⚙️ тэмдэгт UI-д БҮРЭН АРИЛСАН (зөвхөн `app/api/listings/[id]/like/route.js` дэх кодын тайлбарт үлдсэн) | — |
| 2026-09-25 | 🧹 **МИНИМАЛ ДЭЛГЭЦ ( шиг).** Төрөл сонгомогц **категори табын мөр БА төрлийн табын мөр ХОЁУЛАА бүрэн хаагдана** (`{!filters.propertyType && (<>…</>)}`) — дэлгэц дээр зөвхөн breadcrumb + гарчиг(тоо) + өрөөний мөр + sidebar + зарууд үлдэнэ. «Бүх төрөл» таб дарахад эргэж гарна. ⚠️ **Хамт зассан ЧУХАЛ алдаа:** breadcrumb-ийн линкүүд нь бүгд `/` зам дээр байдаг тул `<Link>`-ээр явахад Next.js нь HomeClient-ийг ДАХИН MOUNT хийдэггүй → `useEffect([])` URL-ийг дахин уншихгүй, шүүлт хуучнаараа үлддэг байв (өөрөөр хэлбэл breadcrumb-ийн линк дарж байсан ч юу ч болдоггүй байсан). Одоо: `buildHomeBreadcrumb` нь элемент бүрд `nav` (`{ reset }` / `{ category, filters }`) нэмж, `Breadcrumb.jsx` нь `onNavigate` авч `e.preventDefault()` хийнэ, `HomeClient` нь төлөвийг ШУУД өөрчилнө. 17 логик тест | — |
| 2026-09-25 | 🙈 **Sidebar нь PROGRESSIVE DISCLOSURE болсон.** Хэрэглэгчийн хүсэлтээр шүүлтийн цонх (sidebar) **байнгын харагдахгүй** боллоо — **зөвхөн төрөл сонгосон үед** гарч ирнэ (`{filters.propertyType && (<aside …>)}`). Төрөл сонгоогүй үед үр дүн нь **бүтэн өргөнөөр** харагдаж, оронд нь «💡 Төрөл сонгоход шүүлт нээгдэнэ» гэсэн зөвлөмж гарна. Мобайл дээрх «🔍 Хайлт» товч ч мөн төрөл сонгосон үед л харагдана. **«1 өрөө …» тоотой мөр** ч мөн адил: `showRooms = hasRoomsFields(filters.propertyType)` — төрөл сонгоогүй бол `false`, төрөл сонгосон ч «Өрөө» талбаргүй бол (Худалдаа/Оффис/Газар/Үйлдвэр/Гараж) мөр харагдахгүй, `fetchRoomCounts()` ч дуудагдахгүй. 9 логик тест | — |
| 2026-09-23 | 🖼 **HERO-д фон зураг.** Хэрэглэгчийн татсан **Улаанбаатарын үдшийн панорама**-г `public/hero-ub.jpg` (1920×940, 334 KB) болгож оруулж, цэнхэр градиентийг түүгээр солив. ⚠️ **Уншигдах overlay ЗААВАЛ** — зураг тод тул `bg-gradient-to-b from-black/70 via-black/55 to-black/75` нэмсэн (white текстэд ~12:1 контраст). `isolate` + `-z-10` ашиглаж overlay-г контентын ард, хуудасны дэвсгэрээс гадна байлгав. `bg-primary-dark` нь зураг ачаалагдах хүртэлх нөөц. Хадгалсан: hero-гийн «🔍 Хайх» товчид `type="button"` | — |

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
| 6 | **Хайлтын эх сурвалж** — «аль хайлтаас ирсэн» | «3 өрөө» хайлт их хандлага авч байвал бусад зардаа тэрийг тодруулах | `listing_views.source` (query string) |
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



