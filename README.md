# ZAR.mn — Үл хөдлөх хөрөнгийн зар (Next.js + Supabase)

Хуучин **Express + PostgreSQL + Cloudinary** хувилбарыг **Next.js (App Router) + Supabase** руу
бүрэн хөрвүүлсэн хувилбар. Бүх боломж хадгалагдсан:

- Нүүр хуудас: хайлт, категори таб (Бүгд/Зарах/Түрээслэх), олон шүүлт, жагсаалт/газрын зураг харах горим
- **unegui.mn загварын breadcrumb** («Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө»)
  болон URL-аар шүүлт хуваалцах (`/?category=sell&type=Орон сууц&rooms=3`)
- Зарын дэлгэрэнгүй хуудас (зураг галерей, мета мэдээлэл, холбоо барих, газрын зураг)
- Зар нэмэх (Supabase Storage-руу зураг upload) / устгах
- **Орон сууцны нэмэлт мэдээлэл**: ашиглалтанд орсон он, барилгын нийт давхар, тухайн байрны давхар,
  тагт (1-4), гараж байгаа эсэх
- Миний зарууд хуудас
- **Бүртгүүлэх**: нэр + утасны дугаар + нууц үг → утсаа **SMS-ээр баталгаажуулна**
  ([verify.mn](https://verify.mn) — MO SMS gateway, `144773` дугаар)
- **Нэвтрэх**: утасны дугаар + нууц үг (SMS дахин шаардлагагүй)

> 📋 **Сайжруулах саналууд, дутуу ажлуудыг** [`docs/IMPROVEMENTS.md`](docs/IMPROVEMENTS.md)
> файлд нэгтгэсэн (аюулгүй байдал, гүйцэтгэл, SEO, функциональ — тэргүүлэх
> чиглэлийн хамт). Шинэ ажил эхлэхээс өмнө тэндээс харна уу.

## Хаягийн өгөгдөл (дүүрэг / хороо / сум)

Бүх хаягийн сонголт **нэг файлд**: `lib/locationData.js`

| Тогтмол | Юу агуулна |
|---|---|
| `UB_DISTRICTS` | УБ-ын 9 дүүрэг → хороодын жагсаалт (`khorooRange(N)`) |
| `CITIES` | Улаанбаатар + 21 аймаг |
| `CITY_DISTRICTS` | Аймаг → сум/дүүрэг (одоогоор зөвхөн Дархан-Уул, Орхон) |

### Хорооны тоо (2026 оны байдлаар шинэчилсэн)

| Дүүрэг | Хороо | | Дүүрэг | Хороо |
|---|---|---|---|---|
| Баянгол | 33 | | Чингэлтэй | 24 |
| Баянзүрх | 43 | | Налайх | 8 |
| Сонгинохайрхан | 43 | | Багануур | 5 |
| **Хан-Уул** | **24** | | Багахангай | 2 |
| Сүхбаатар | 20 | | **Нийт** | **202 хороо** |

> 📅 Эх сурвалж: mn.wikipedia.org — дүүрэг тус бүрийн өгүүлэл (2025–2026 оны шинэчлэл).
> Хороо жил бүр нэмэгддэг (хуваагдах, шинэ хороо байгуулагдах) тул **хамгийн сүүлийн
> (их) тоог** авсан — ингэснээр шинэ хороонд амьдардаг иргэн сонголтоос хоцрохгүй.

**Хороо нэмэгдвэл хэрхэн засах вэ** (`lib/locationData.js`):
```js
'Хан-Уул': khorooRange(24),   // ← 26-р хороо нэмэгдвэл 26 болгоно
```

### ⚠️ Одоогоор дутуу: аймгуудын СУМ

`CITY_DISTRICTS`-д зөвхөн **Дархан-Уул** (4 сум) ба **Орхон** (2 сум) байна. Бусад
19 аймгийн сум ороогүй тул аймаг сонгоход «Дүүрэг» dropdown нь зөвхөн «Бүгд» харагдана
(зар оруулах боломжтой, харин сум сонгохгүй).

Бүрэн болгох бол албан ёсны эх сурвалжаас (estat.mn эсвэл аймаг тус бүрийн
Википедиа өгүүлэл) сумдын нэрийг авч нэмнэ:
```js
export const CITY_DISTRICTS = {
  Улаанбаатар: Object.keys(UB_DISTRICTS),
  'Дархан-Уул': ['Дархан', 'Шарын гол', 'Хонгор', 'Орхон'],
  Орхон: ['Баян-Өндөр (Эрдэнэт)', 'Жаргалант'],
  // Архангай: ['Цэцэрлэг', 'Батцэнгэл', ...],   ← энд нэмнэ
};
```


## Үл хөдлөхийн төрлүүд (бүрдэл хэсгүүд)

Зарах / Түрээслэх категори хоёулаа доорх **8 төрөлтэй**. Өгөгдлийн санд үндсэн нэрийг
(`property_type`) хадгалж, дэлгэцэнд категориос хамаарсан нэрийг (`… зарна` / `… түрээслүүлнэ`)
харуулна. Тодорхойлолт нь `lib/locationData.js` → `PROPERTY_TYPE_DEFS`.

| value (DB) | Зарах | Түрээслэх | Нэмэлт талбар | Өрөө |
|---|---|---|---|---|
| Орон сууц | Орон сууц зарна | Орон сууц түрээслүүлнэ | ашиглалтанд орсон он, давхар, нийт давхар, тагт, гараж | ✅ |
| Газар | Газар зарна | Газар түрээслүүлнэ | — | — |
| Худалдаа, үйлчилгээний талбай | … зарна | … түрээслүүлнэ | давхар, нийт давхар | — |
| АОС, хаус, зуслан, амралтын газар | … зарна | … түрээслүүлнэ | — | ✅ |
| Үйлдвэр, агуулах, обьект | … зарна | … түрээслүүлнэ | — | — |
| Оффис | Оффис зарна | Оффис түрээслүүлнэ | давхар, нийт давхар | — |
| Хашаа байшин | Хашаа байшин зарна | Хашаа байшин түрээслүүлнэ | — | — |
| Гараж, контейнер, зөөврийн сууц | … зарна | … түрээслүүлнэ | — | — |

### Нөхцөлт талбар (conditional fields) — хэрхэн ажилладаг вэ

Форм дахь зарим талбар зөвхөн тодорхой төрөлд харагдана. **Логик нь UI дотор биш,
`lib/locationData.js` доторх нэг туг (flag)-т байрлана** — ингэснээр нэг газар засаад
форм, шүүлт, экспорт бүгд зөв болно.

**1) Төрлийн тодорхойлолтод туг нэмнэ** (`PROPERTY_TYPE_DEFS`):

```js
{ value: 'Орон сууц', …, apartment: true, floors: true, rooms: true },
{ value: 'АОС, хаус, зуслан, амралтын газар', …, rooms: true },
// rooms туг БАЙХГҮЙ төрлүүдэд «Өрөө» талбар огт харагдахгүй
```

**2) Туг шалгах туслах функц экспортолно:**

```js
export function hasRoomsFields(type) {
  return !!getPropertyTypeDef(type)?.rooms;
}
```

**3) Формд нөхцөлтэйгээр зуруулна** (`components/AddListingModal.jsx`):

```jsx
const showRooms = hasRoomsFields(form.propertyType);   // ← төлөвөөс хамаарна

<div className="form-row">
  {showRooms && (
    <div className="form-group">
      <label>Өрөө</label>
      <input type="number" min="0" value={form.rooms}
             onChange={(e) => set('rooms', e.target.value)} />
    </div>
  )}
  {/* Өрөө нуугдвал «Талбай» бүтэн өргөнөө эзэлнэ */}
  <div className={`form-group ${showRooms ? '' : 'sm:col-span-2'}`}>
    <label>Талбай (м²)</label>
    …
  </div>
</div>
```

**4) Төрөл солигдоход хуучин утга хадгалагдахаас сэргийлнэ** (payload-д):

```js
rooms: showRooms ? form.rooms : '',   // '' → queries.js дээр 0 болно
```

> 💡 Ижил загварыг `apartment` (тагт/он/гараж) ба `floors` (давхар) тугууд ашигладаг —
> `hasApartmentFields()` / `hasFloorFields()`.
> **Шинэ талбар нэмэх бол:** туг → туслах функц → `showX` хувьсагч → `{showX && (…)}` → payload.



### Форм автоматаар бөглөгдөх (нэвтэрсэн хэрэглэгч)

Зар нэмэх форм нээгдэхэд **«Холбоо барих утас»** талбарт нэвтэрсэн хэрэглэгчийн бодит
утасны дугаар автоматаар бөглөгдөнө (`AddListingModal` ← `userPhone` prop).

Утасны эх сурвалж — `components/AppProviders.jsx → resolveUserPhone()`:

| # | Эх сурвалж | Хэзээ |
|---|---|---|
| 1 | `user.phone` | Phone provider-ээр бүртгэсэн (ж: `97699112233`) |
| 2 | `user_metadata.phone` | Дотоод имэйлээр (fallback) бүртгэсэн |
| 3 | `phoneEmail.emailToPhone(user.email)` | `99112233@phone.zarmn.mn` → `+97699112233` |

Форм дээр `phoneEmail.toLocalPhone()`-оор `+97699112233` → **`99112233`** болгож харуулна
(хэрэглэгч улсын кодгүй бичдэг тул). Хадгалахдаа `lib/format.js → normalizePhone()` буцааж
E.164 болгоно.

> 🐞 **Засвар:** өмнө нь `emptyForm()` дотор `phone: displayName` гэж бичигдсэн байсан тул
> «Холбоо барих утас» талбарт хэрэглэгчийн **НЭР** бөглөгддөг байв (жишээ нь «Демо хэрэглэгч»).
> Одоо `phone: phoneEmail.toLocalPhone(userPhone)` ✅ — нэр нь `contact_name` талбарт хэвээр.

### Төрлөөр харах (нүүр хуудас)

Нүүр хуудсанд **«Бүгд / 💰 Зарах / 🔑 Түрээслэх»** категори табын доор төрлүүдийн навигаци
харагдана (`components/HomeClient.jsx` → `.type-tabs`):

```
[ 🗂 Бүх төрөл ] [ 🏢 Орон сууц түрээслүүлнэ 2 ] [ 🌳 Газар түрээслүүлнэ 0 ] [ 🏪 Худалдаа… 0 ]
[ 🏘️ АОС, хаус… 0 ] [ 🏭 Үйлдвэр… 0 ] [ 🏬 Оффис түрээслүүлнэ 1 ] [ 🏡 Хашаа байшин… 1 ] …
```

- Товчны нэр нь **сонгосон категорид тохируулан** солигдоно (`Орон сууц зарна` ↔ `Орон сууц түрээслүүлнэ`)
- Товчны баруун талын тоо нь тухайн категори дахь зарын тоо
  (`lib/queries.js` → `fetchPropertyTypeCounts`, 8 зэрэгцээ `count` query)
- Товч дарахад жагсаалт шүүгдэж, URL (`?type=…`) болон breadcrumb автоматаар шинэчлэгдэнэ
- Идэвхтэй товчийг дахин дарвал шүүлт цуцлагдана
- Загвар: Tailwind CSS utility классууд (`components/HomeClient.jsx`)
- ⚠️ Шүүлтийн панель дэх тусдаа «Төрөл» dropdown **хасагдсан** — давхардлаас зайлсхийж,
  төрөл зөвхөн энэ табуудаас сонгогдоно

### Дэлгэрэнгүй хайлт (нүүр хуудас)

Нүүр хуудсан дээрх олон шүүлт (Өрөө, Хот/Аймаг, Дүүрэг, Хороо, Үнэ, Талбай) **анхдагчаар
харагддаггүй** — «⚙️ Дэлгэрэнгүй хайлт» товчоор нээгддэг (`components/HomeClient.jsx`):

```
[ ⚙️ Дэлгэрэнгүй хайлт (3) ▼ ]   12 зар — «Баянгол»     [ ☰ Жагсаалт | 🗺 Газрын зураг ]
──────────────────────────────────────────────────────────────────────────────────────
Шүүлт  [ 🏢 Орон сууц зарна ✕ ] [ 🛏 3 өрөө ✕ ] [ 🏙 Улаанбаатар ✕ ]   Бүгдийг цэвэрлэх
```

- Товчны `(3)` badge нь **идэвхтэй шүүлтийн тоо**; панель нээлттэй эсвэл шүүлттэй бол товч цэнхэр болно
- Идэвхтэй шүүлт бүр «чип» болж харагдана — `✕` дарж ТУС ТУСАД нь арилгана
- Харах горим (☰ Жагсаалт / 🗺 Газрын зураг) toolbar-ын баруун тал руу шилжсэн
- Панель `animate-slide-down`-аар нээгдэнэ (`tailwind.config.js` → `slideDown` keyframe)
- Шүүлт солигдох бүрд URL (`?rooms=3&city=…`) шинэчлэгддэг хэвээр — хуваалцсан линк ажиллана

## Хуучин → Шинэ зураглал

| Хуучин (Express)          | Шинэ (Next.js + Supabase)                |
|---------------------------|------------------------------------------|
| `server.js` REST API      | `lib/queries.js` + RLS (client-side)     |
| PostgreSQL (local)        | Supabase Postgres (RLS)                  |
| Cloudinary (зураг)        | Supabase Storage `listing-images`        |
| SQLite seed               | `scripts/seed-supabase.js`               |
| `index.html` + `app.js`   | React components (`components/`, `app/`) |
| Custom session            | Supabase Auth (утас + нууц үг)            |

## Эхлүүлэх заавар

1) Нэмэлт сангуудыг суулгах
```bash
npm install
```

2) Supabase төсөл үүсгээд тохиргоогоо бөглөх
```bash
cp .env.local.example .env.local
```
`.env.local` дотор:
- `NEXT_PUBLIC_SUPABASE_URL` — Dashboard → Settings → API → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key
- `SUPABASE_SERVICE_ROLE_KEY` — сервер талд (seed + бүртгэл; нууц, хэзээч frontend-д бүү ашигла)
- `VERIFY_MN_API_KEY` — [verify.mn](https://verify.mn) → Developer Console → API KEY
  (бүртгэлийн SMS баталгаажуулалт; мөн нууц — сервер талд л)

3) Schema + RLS-ийг ажиллуулах (дарааллаар нь)
Dashboard → SQL Editor-т дараах файлуудын агуулгыг оруулан Run хийнэ
(эсвэл Supabase CLI: `supabase db push`):

| Дараалал | Файл | Юу нэмэгдэх вэ |
|---|---|---|
| 1 | `supabase/migrations/0001_schema.sql` | `profiles`, `listings`, RLS, `listing-images` bucket |
| 2 | `supabase/migrations/0003_listing_details.sql` | **Орон сууцны нэмэлт талбарууд** (`build_year`, `floor`, `total_floors`, `balconies`, `has_garage`) + хуучин төрлийн нэрсийг шинэчилэх |
| 3 | `supabase/migrations/0004_remove_listing_drafts.sql` | *(сонголтоор)* хуучин Facebook агентын `listing_drafts` хүснэгтийг бүрэн устгана |
| 4 | `supabase/migrations/0005_listings_update_policy.sql` | **Зар засах боломж** (`listings` UPDATE policy) + *(сонголтоор)* `favorites` хүснэгт |
| 5 | `supabase/migrations/0006_listing_stats.sql` | `listings.views` / `listings.likes` багана + атомар bump функцууд |
| 6 | `supabase/migrations/0007_listing_likes_views.sql` | `listing_likes` / `listing_views` хүснэгт + `count(*)` триггер |
| 7 | `supabase/migrations/0008_feedback.sql` | **Санал хүсэлт** (`feedback` хүснэгт + RLS) → `/feedback`, `/admin/feedback` |
| 8 | `supabase/migrations/0009_feedback_listing.sql` | `feedback.listing_id` — гомдлыг ТУХАЙН ЗАРТАЙ холбох (зарын дэлгэрэнгүй хуудсанд гомдол мэдэгдэх) |

> `0003` ороогүй бол апп ажиллах боловч зар нэмэхэд «ашиглалтанд орсон он, давхар,
> тагт, гараж» хадгалагдахгүй (console-д анхааруулга гарна). Шалгах:
> `npm run check:supabase` — «listings-д орон сууцны нэмэлт багана байна» гэж гарах ёстой.

4) Storage bucket `listing-images` schema SQL-д автоматаар үүснэ (public).

5) Демо өгөгдөл оруулах
```bash
node scripts/seed-supabase.js    # демо хэрэглэгч + 8 зар
npm run seed:more                # + 80 зар (8 төрөл × 10) — давхардахгүй
```
Демо хэрэглэгч: **+976 9911 2233** (нууц үг: `ZarDemo123!`)

6) Хөгжүүлэлт
```bash
npm run dev     # http://localhost:3000
npm run build   # production build
npm start
```

## Алдаа гарвал (Troubleshooting)

### Browser console дээр `Console Error {}` гэж гарвал

Энэ нь **ямар нэг Supabase хандалт амжилтгүй болсон** гэсэн үг, гэхдээ Next.js-ийн
dev overlay нь алдааны агуулгыг `{}` гэж л харуулдаг. Шалтгаан хоёр:

1. `lib/queries.js`/`lib/draftQueries.js` нь postgrest-js-ийн throw хийсэн
   `{ message, details, hint, code }` гэсэн **энгийн объект**-ыг дамжуулдаг;
2. Next.js 15.5-ийн `next/dist/client/lib/console.js → formatObject()` нь
   `Object.getOwnPropertyDescriptor(arg, 'key')` (literal `'key'`) гэж бичигдсэн
   алдаатай тул тэр объектын ямар ч талбарыг хэвлэж чадахгүй → `{}`.

Одоо `lib/errors.js` нь ийм объектыг бодит `Error` болгож хөрвүүлдэг тул overlay дээр
**уншиж болохуйц мессеж** гарна. Жишээ нь URL буруу үед:

```
Error: Supabase-д холбогдож чадсангүй (TypeError: Failed to fetch).
NEXT_PUBLIC_SUPABASE_URL = https://<буруу-ref>.supabase.co — …
```

Шалтгааныг шууд мэдэхийн тулд:

```bash
npm run check:supabase
```

Энэ нь `.env.local`-ийн хувьсагчид, URL-ийн формат, DNS (NXDOMAIN эсэх),
`listings`/`profiles` хүснэгтүүд, `listing-images` bucket болон `VERIFY_MN_API_KEY`-г шалгана.

Хамгийн түгээмэл шалтгаан: **`.env.local`-д буруу/хуучирсан `NEXT_PUBLIC_SUPABASE_URL`**
(төсөл устсан эсвэл project ref буруу бичсэн). Supabase Dashboard →
Project Settings → Data API → Project URL-аа хуулж тавиад `npm run dev`-ээ дахин эхлүүлнэ.

### UI дээр «Supabase тохиргоо олдсонгүй. .env.local файл үүсгэнэ үү.» гэж гарвал

Гэхдээ `npm run check:supabase` бүх шалгалтыг ✅ гэж харуулж байгаа бол `.env.local`
нь зөв байна. Энэ тохиолдолд шалтгаан нь **хуучин bundle** байна:

`NEXT_PUBLIC_*` хувьсагчид нь **build/compile үед** client bundle дотор шууд
бичигддэг ба Next.js нь `.env.local`-ийг **зөвхөн dev server эхлэх үед** уншдаг.
Иймд `.env.local` үүсгэх/засахаас өмнө эхэлсэн `next dev` процесс болон browser-ийн
хуучин JS chunk нь env-гүй (хоосон) хувилбараа үйлчилсээр байна. Засвар:

1. Ажиллаж байгаа dev server-ээ **бүрэн зогсооно** (`Ctrl+C`) — эсвэл
   `lsof -nP -iTCP:3000 -sTCP:LISTEN` гэж PID-г олоод `kill <PID>`.
   Дараа нь `npm run dev`.
2. Browser дээр **hard refresh** хийнэ: `Cmd+Shift+R` (эсвэл DevTools →
   Network → *Disable cache* сонгоод reload).
3. Хэвээр бол Next.js-ийн кэшийг устгана: `rm -rf .next && npm run dev`.

Баталгаажуулах: dev server ажиллаж байхад client bundle дотор URL орсон эсэхийг
шууд харж болно:

```bash
curl -s http://localhost:3000/_next/static/chunks/app/page.js | grep -o 'htjbox[a-z0-9]*'
# → https://<project-ref>.supabase.co гэж гарвал зөв compile хийгдсэн гэсэн үг
```

### Хуудас «Заруудыг ачаалж байна...» дээр мөнхөрч, console-д `/_next/static/...` **404** гарвал

> 🩺 **Хамгийн хурдан шийдэл: `npm run doctor`** — энэ нь HTML-ийн дууддаг бүх
> `/_next/static` файлыг шалгаж, 404 гарвал засварын командуудыг шууд хэвлэнэ.

Энэ нь `.env`-ийн асуудал **БИШ** — dev server-ийн **client build эвдэрсэн** гэсэн үг.
HTML нь `main-app.js`, `app/page.js`, `app/layout.js`, `app/*.css`-ийг дуудаж байтал
тэдгээр файл `.next/static` дотроос алга болсон байна. JS ачаалагдахгүй тул React
hydrate болж чадахгүй → `useEffect`/`fetchListings` хэзээ ч ажиллахгүй → хуудас
«ачаалж байна...» дээрээ мөнхөрнө (заримдаа өмнөх алдааны мессеж хэвээр харагдана).

Шалтгаан: `.next` эвдэрсэн — ихэвчлэн **нэгэн зэрэг 2 `next dev` процесс** нэг төслийн
`.next`-ийг хамт бичих (эсвэл dev server-ийн restart-тай зэрэгцсэн хүсэлт) үед үүсдэг.

Шалгах:

```bash
# HTML ямар asset дуудаж байна вэ
curl -s http://localhost:3000/ | grep -o '/_next/static/[^"?]*' | sort -u
# тэдгээр файл дискэн дээр байгаа эсэх
ls .next/static/chunks/app/   # main-app.js, page.js, layout.js байх ёстой
```

Хэрэв дуудагдсан файл `ls`-д байхгүй бол (эсвэл 404 бол):

```bash
# 1) БҮХ dev server-ээ зогсоо — нэг л процесс ажиллах ёстой
lsof -nP -iTCP:3000 -sTCP:LISTEN     # PID-г олоод: kill <PID>
pkill -f 'next dev'
# 2) эвдэрсэн кэшийг бүрмөсөн устга
rm -rf .next
# 3) нэг л удаа эхлүүл
npm run dev
```

Дараа нь browser-оо hard refresh (`Cmd+Shift+R`) хийнэ. Зөв болсныг:

```bash
find .next/static -type f | sort   # app/page.js, app/layout.js, css/app/*.css байх ёстой
```

> ⚠️ Нэг төслийн хавтаст **2 dev server зэрэг бүү ажиллуул** — хоёулаа нэг `.next`-ийг
> бичиж, яг дээрх эвдрэлийг үүсгэдэг. Хэрэв 3000 порт завгүй бол Next өөр порт
> санал болгодог — тэр үед хуучин процессыг `lsof -nP -iTCP:3000 -sTCP:LISTEN`-ээр
> олж зогсооно.

## Бүртгэл ба нэвтрэлт (утас + нууц үг + SMS баталгаажуулалт)

| Үйлдэл | Юу шаардлагатай вэ |
|---|---|
| **Бүртгүүлэх** | Нэр + утасны дугаар + нууц үг → дараа нь **утсаа SMS-ээр баталгаажуулна** |
| **Нэвтрэх** | Утасны дугаар + нууц үг (SMS дахин шаардлагагүй) |

> Энэ төслөөс **Facebook агент / n8n автоматжуулалт** (`listing_drafts` queue,
> `/admin/queue`, `lib/draftAgent.js`, `lib/fbParser.js`, `n8n/` workflow) бүрэн
> хасагдсан. Хүснэгтийг устгах бол `0004_remove_listing_drafts.sql`.

### Хэрхэн ажилладаг вэ (verify.mn — MO SMS gateway)

[verify.mn](https://verify.mn) нь Монголын бүх үүрэн операторыг (Mobicom, Skytel,
Unitel, G-Mobile, ONDO, …) нэгтгэсэн **MO (Mobile-Originated)** gateway:
**хэрэглэгч өөрөө `144773` руу SMS илгээж**, verify.mn манай сервер рүү мэдэгдэнэ.
Тиймээс Twilio гэх мэт MT SMS provider заавал хэрэггүй.

```
AuthModal (нэр / утас / нууц үг)
   → POST /api/auth/register/start     → verify.mn POST /sessions (6 оронтой код)
   → UI: displayInstruction (үгчлэн) + smsUri (tap-to-open)  → хэрэглэгч 144773 руу илгээнэ
   → GET  /api/auth/register/status     (3 сек тутам)   → PENDING → VERIFIED
   → POST /api/auth/register/complete   → Supabase Admin: createUser(утас эсвэл дотоод имэйл, password)
   → signInWithPassword(утас, нууц үг)  → нэвтэрнэ
```

Файл | Үүрэг
---|---
`lib/verifyMn.js` | verify.mn REST клиент (сервер тал, `VERIFY_MN_API_KEY`)
`lib/phoneEmail.js` | Утас ↔ **дотоод имэйл** (`86889911@phone.zarmn.mn`) — сервер + клиент хоёулаа
`lib/authServer.js` | Supabase Admin client, `requestToken` (HMAC), хэрэглэгч үүсгэх, provider шалгалт
`lib/authApi.js` | Клиент талаас `/api/auth/*` дуудах туслах
`components/AuthModal.jsx` | Нэвтрэх / Бүртгүүлэх / SMS баталгаажуулах UI (3 секундын polling)
`app/api/auth/register/{start,status,complete}/route.js` | Бүртгэлийн API
`app/api/auth/status/route.js` | Бэлэн эсэх (`loginMode: 'phone' \| 'email'`)
`app/api/auth/verify/callback/route.js` | verify.mn-ийн "шалга" дохио (шууд 200 буцаана)
`scripts/check-verify-mn.js` | **Бодит** verify.mn-ээр гараар турших: `npm run check:verify -- 99112233`
`scripts/test-verify-mn.js` | **Offline** автомат тест (mock verify.mn, 0₮): `npm run test:verify`
`scripts/enable-phone-auth.js` | *(сонголтоор)* Phone provider-ыг 1 командаар асаах: `npm run enable:phone-auth`

### Утасны дугаар ба Supabase provider (чухал!)

Supabase-ийн **"Phone" provider** нь төслийн тохиргооноос хамаарч идэвхгүй байж болно.
Тэр үед `signInWithPassword({ phone })` нь `422 phone_provider_disabled` буцаана.

> ⚠️ Ажиглагдсан онцлог: Admin API нь phone provider **идэвхгүй байхад ч** `phone`-той
> хэрэглэгч **үүсгэдэг** — гэхдээ тэр хэрэглэгч **нэвтэрч чаддаггүй**. Тиймээс шийдвэрийг
> үүсгэх алдаагаар биш, **provider-ийн бодит төлвөөр** гаргадаг.

Тиймээс бүртгэл/нэвтрэлт нь **хоёр горимд** ажиллана (автоматаар сонгогдоно):

| Горим | Нөхцөл | Supabase-д хэрхэн хадгалагдах |
|---|---|---|
| `phone` | Phone provider **идэвхтэй** | `user.phone = +97699112233`, `phone_confirm: true` |
| `email` | Phone provider **идэвхгүй** (default) | `user.email = 99112233@phone.zarmn.mn`, `email_confirm: true`, `user_metadata.phone = +97699112233` |

- **Хэрэглэгч UI дээр зөвхөн утсаа харж/оруулна** — дотоод имэйл хэзээ ч харагдахгүй,
  хэзээ ч илгээгдэхгүй (синтетик хаяг).
- Нэвтрэх үед `AppProviders.signIn()` эхлээд утсаар, нурвал дотоод имэйлээр оролдоно →
  аль ч горимд ажиллана, dashboard дээр юу ч солих шаардлагагүй.
- Хуучин (зөвхөн `phone`-той) хэрэглэгчдийг `node scripts/seed-supabase.js` (демо
  хэрэглэгчийг автоматаар засна) эсвэл доорх нэг мөрөөр засна:
  ```js
  // admin.updateUserById(id, { email: phoneToEmail(phone), email_confirm: true })
  ```

### `verifyPhone(phone)` — сервер талын нэг функцээр баталгаажуулах

`lib/verifyMn.js` нь бүхэл урсгалыг нэг функцээр санал болгодог:

```js
const verifyMn = require('./lib/verifyMn');   // ESM: import verifyMn from '@/lib/verifyMn'

const ok = await verifyMn.verifyPhone('99112233', {
  // session үүссэн даруйд: displayInstruction-ийг үгчлэн харуулж,
  // smsUri-г tap-to-open (mobile) холбоосоор өгнө
  onSession: (s) => show(s.displayInstruction, s.smsUri),   // s.text = 6 оронтой код
  onTick: (s) => console.log(s.sessionStatus),              // PENDING / VERIFIED / EXPIRED
});
if (ok) { /* утас баталгаажсан */ }
```

| Тайлбар | Утга |
|---|---|
| Буцаах утга | `true` — зөвхөн `sessionStatus === 'VERIFIED'` үед; `false` — EXPIRED / timeout |
| Polling | `GET /sessions/{sessionId}` **3 секунд** тутам (`POLL_INTERVAL_MS`), VERIFIED болмогц **шууд зогсоно** |
| TTL | 300 секунд (`TTL_SECONDS`) — `timeoutMs`-ээр солиж болно |
| `text` | 6 оронтой санамсаргүй тоо (session бүрт шинэ; 409 давхцал гарвал дахин үүсгэнэ) |
| Callback | `app/api/auth/verify/callback` нь verify.mn-ийн "шалга" дохиог 2xx-ээр шууд хариулна (body/HMAC байхгүй тул **итгэхгүй** — polling нь үнэн төлөв) |
| Алдааны бодлого | Хэрэглэгчээс хамаарах → `false`; **тохиргооны** алдаа (`VERIFY_MN_API_KEY` дутуу/буруу=401, дугаар буруу) → `Error` **шиднэ** (false болгож нуувал буруу оношилгоо өгнө) |

> ⚠️ Вэб аппын бүртгэлийн урсгал нь энэ функцийг шууд дуудахгүй (учир нь browser
> verify.mn-ийг шууд дуудаж чадахгүй — API key серверт байдаг). Тиймээс апп нь
> `/api/auth/register/{start,status,complete}` route-уудаар **алхам алхмаар**
> ажилладаг; `verifyPhone()` нь скрипт, admin tool, background job-д зориулагдсан.

### Тест

```bash
npm run test:verify     # offline, mock verify.mn — 0₮, интернэт шаардахгүй
npm run check:verify -- 99112233   # бодит verify.mn + бодит SMS (150₮ хэрэглэгч төлнө)
```

`test:verify` нь 8 тохиолдлыг шалгана: PENDING→VERIFIED→`true` · VERIFIED болмогц
polling зогсох · EXPIRED→`false` · timeout→`false` · 401→`Error` · key дутуу→`Error` ·
буруу дугаар→`Error` · `+976`/зураас/зайтай хэлбэр хөрвүүлэлт.

**Аюулгүй байдал**

- `VERIFY_MN_API_KEY` нь **NEXT_PUBLIC_ угтваргүй** — browser-д хэзээ ч орохгүй.
- Хэрэглэгч зөвхөн `service_role`-оор (сервер талд) үүснэ → SMS баталгаажуулалтыг
  тойрч бүртгүүлэх боломжгүй.
- `requestToken` нь (sessionId ↔ утас) хосыг HMAC-SHA256 гарын үсгээр холбоно →
  нэг дугаараа баталгаажуулаад өөр дугаар бүртгэхийг хориглоно (30 мин TTL).
- Бүртгэгдсэн дугаарыг `start` шатанд шалгана → verify.mn-ийн 150₮-ийн SMS дэмий
  зарцуулагдахгүй (`PHONE_EXISTS`).
- Phone provider идэвхгүй байх нь бүртгэлийг **хориглохгүй** — `createVerifiedUser`
  автоматаар дотоод имэйл рүү шилжинэ (дээрх хүснэгтийг үзнэ үү).

### Заавал хийх ганц тохиргоо

**Verify.MN API KEY** — https://verify.mn → Developer Console → API KEY-г
`.env.local`-ийн `VERIFY_MN_API_KEY=` -д тавина (мөн deploy дээр Vercel/платформын
Environment Variables-д).

> Нэг SMS нь **хэрэглэгчид 150₮** төлбөртэй (таны дансанд 40₮ орлого очно).
> Баталгаажмагц UI автоматаар polling-оо зогсооно — дэмий SMS зарцуулагдахгүй.

Дараа нь турших: `npm run check:supabase` → `npm run check:verify -- 99112233`

### (Сонголтоор) Supabase утасны provider-ыг асаах

Хэрэв `user.phone` талбарт дугаарыг жинхэнэ утсаар хадгалахыг хүсвэл
Dashboard → Authentication → Providers → **Phone → Enable** (SMS provider/Twilio
тохируулах шаардлагагүй — SMS-ийг verify.mn илгээдэг). Эсвэл:

```bash
# .env.local-д SUPABASE_ACCESS_TOKEN=sbp_... нэмээд
npm run enable:phone-auth
```

> Асаахгүй байсан ч **бүртгэл/нэвтрэлт бүрэн ажиллана** (дотоод имэйлийн горим).
> Шалгах: `curl <SUPABASE_URL>/auth/v1/settings` → `"external": {"phone": true|false}`
## Түргэн командууд (бүгд нэг дор)

```bash
npm run dev              # dev server (http://localhost:3000)
npm run build            # production build

npm run doctor           # 🩺 «Юу эвдэрсэн бэ?» — client bundle, env, API шалгах
npm run find -- "текст"   # 🔍 Код доторх текстээр хайх (файл:мөр харуулна)

npm run seed:more         # 📦 8 төрөл × 10 = 80 демо зар нэмэх (давхардахгүй)
npm run seed:more -- 88093663   # өөр хэрэглэгчийн нэр дээр нэмэх

npm run check:supabase   # Supabase + env + phone provider шалгах
npm run report:usage     # 📊 DB мөр/хэмжээ, Storage хэрэглээ, планын багтаамж
npm run feedback:setup   # 💬 «Санал хүсэлт» миграц (0008+0009) — clipboard + SQL Editor
npm run feedback:check   # 💬 feedback хүснэгт/багана ажиллаж байгаа эсэх
npm run check:verify -- 99112233   # verify.mn-ээр БОДИТ SMS турших (150₮)
npm run test:verify      # verify.mn offline тест (mock, 0₮)

npm run make:admin -- 88093663     # хэрэглэгчийг админ болгох
npm run make:admin -- --list       # админуудыг харуулах
npm run enable:phone-auth          # Supabase Phone provider асаах (sbp_ token)
npm run deploy:vercel              # Vercel env-ийг 1 командаар тавих (VERCEL_TOKEN)

npm run stats:setup       # 👁/❤️ тоолуурын SQL-ийг clipboard-д хуулж, SQL Editor нээнэ
npm run stats:check       # миграц ажилласан эсэхийг шалгах
```

### Онцгой тохиолдол: хуудас «ачаалж байна...» дээр мөнхөрвөл
```bash
npm run doctor           # → шалтгааныг хэлж, засварын командуудыг өгнө
# ердийн шийдэл:
pkill -f 'next dev' && rm -rf .next && npm run dev
# дараа нь browser дээр Cmd+Shift+R
```

## Зураг/бичлэг хадгалах орон зай (Storage) хэмнэх

### ⚠️ Эхлээд чухал тодруулга: зураг нь **DB-д ОРОХГҮЙ**

| Юу | Хаана | Хэмжээ |
|---|---|---|
| Зургийн **файл** | **Supabase Storage** (`listing-images` bucket) | хэдэн KB – хэдэн MB |
| Зургийн **URL** | DB (`listings.images` jsonb) | ~120 тэмдэгт × тоо |

Тэгэхээр «DB хэмнэх» гэдэг нь үнэндээ **Storage + трафик (bandwidth)** хэмнэх.

### Асуудал: утасны зураг бүтнээрээ хадгалагдаж байсан ❌

`uploadImages()` нь файлыг **ямар ч боловсруулалтгүй** шууд илгээдэг байсан:
- Гар утасны камерын нэг зураг = **3–12 MB**
- 10 зурагтай зар = **30–120 MB**
- Bucket-д `file_size_limit = null` (хязгааргүй), `allowed_mime_types = null` → хэдэн ч MB, ямар ч төрөл

### ✅ Шийдэл 1: Browser дээр автомат шахалт (`lib/imageUtils.js`)

Зураг **илгээхээс өмнө** browser дээр (Canvas API, нэмэлт сан **шаардахгүй**):
1. Хамгийн урт талыг **1600px** болгож жижигрүүлнэ
2. **JPEG, чанар 82%** болгоно
3. 1.5 MB-ээс том бол чанарыг 50% хүртэл аажмаар бууруулна
4. Шахаасан нь илүү том болвол (жижиг зураг, PNG) эхийг хэвээр үлдээнэ
5. EXIF эргэлтийг хүндэтгэнэ (`createImageBitmap({ imageOrientation: 'from-image' })`)

**Хэмжигдсэн үр дүн** (бодит туршилт, 3200×2400 шуугиантай JPEG):

| | Хэмжээ |
|---|---|
| Оруулсан | **9.24 MB** |
| Хадгалагдсан | **845 KB** |
| Хэмнэлт | **91%** 🎉 |

UI дээр хэрэглэгчид шууд харагдана:
```
🗜 1 зураг шахагдлаа: 9.24 MB → 845 KB · 91% хэмнэлт 🎉
```
Зураг бүрийн буланд мөн «845 KB · −91%» гэсэн шошго гарна.

Тохиргоог солих: `components/AddListingModal.jsx` → `compressImages(files, { maxDim, quality })`
(эсвэл `lib/imageUtils.js` доторх default утгууд).

### ✅ Шийдэл 2: Сервер талын хатуу хязгаар (bucket тохиргоо)

Шахаалт алдаа гарсан ч (ж: browser хуучин) хамгаалалт байх ёстой тул bucket-д тавив:

| Тохиргоо | Утга | Үр дүн |
|---|---|---|
| `file_size_limit` | **5 MB** | 9.2MB файл → `The object exceeded the maximum allowed size` ❌ |
| `allowed_mime_types` | `image/jpeg, png, webp, gif, svg+xml, avif` | `video/mp4` → `mime type video/mp4 is not supported` ❌ |

Шалгасан: 9.2MB → блоклогдлоо ✅ · video/mp4 → блоклогдлоо ✅ · 20KB JPEG → орлоо ✅

Солих (service_role шаардана):
```js
await admin.storage.updateBucket('listing-images', {
  public: true,
  fileSizeLimit: 5 * 1024 * 1024,          // эсвэл null (хязгааргүй)
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif'],
});
```

### 🎥 Бичлэг (видео) — одоогоор ДЭМЖИГДЭХГҮЙ

- UI нь `accept="image/*"` — утаснаас видео сонгох боломжгүй
- Storage нь зөвхөн зураг зөвшөөрдөг болсон
- **Шалтгаан:** утасны 1 минут 1080p видео = **100–300 MB**. Browser дээр шахах
  боломжгүй (видео транскодод `ffmpeg.wasm` ~30 MB сан эсвэл сервер талын
  encoder шаардана). Хэрэв нэмбэл Storage/трафик нь зурагнаас **100 дахин** их
  зарцуулагдана — «хэмнэх» зорилготой зөрчилдөнө.

Хэрэв бичлэг заавал хэрэгтэй бол 3 сонголт (хэлээрэй, хийж өгнө):

| Сонголт | Давуу | Сул |
|---|---|---|
| **A. Богино видео (≤20 MB)** зөвшөөрч, эхний кадрыг poster болгож хадгалах | Энгийн, нэмэлт сан байхгүй | Чанар муу, олон видео болбол Storage дүүрнэ |
| **B. `ffmpeg.wasm`-аар browser дээр транскод** (720p, ~2 Mbps) | 200MB → ~15MB | ~30MB WASM татах, удаан (30–90 сек), зарим утсанд санах ой хүрэхгүй |
| **C. Гадаад видео (YouTube/ардчилсан холбоос)** — зөвхөн линк хадгална | Storage **0 MB** | Гадаад платформ шаардана |

> Санал: эхлээд **C** (линк) эсвэл **A** (жижиг видео). Том видео Storage-ийг
> хамгийн хурдан дүүргэдэг тул зургийн шахалтыг (дээрх) эхлүүлэх нь хамгийн их
> хэмнэлт өгнө.

## Багтаамж — DB ба Storage хэмжээ (`npm run report:usage`)

Live болохын өмнө одоогийн хэрэглээг хэмжих скрипт (READ-ONLY):

```bash
npm run report:usage     # node scripts/db-usage.js
```

**Хэмжсэн байдал (2026-09, 91 зартай үед):**

| Хүснэгт | Мөр | Ойролцоо хэмжээ |
|---|---|---|
| `listings` | 91 | 91 KB (дундаж ~1 KB/мөр — зураг нь DB-д ОРОХГҮЙ, зөвхөн URL) |
| `profiles` | 4 | 180 B |
| `listing_likes` / `listing_views` | 0 | 0 B |
| Storage `listing-images` | 6 файл | 1.14 MB (дундаж ~194 KB/зураг — шахалт ажиллаж байна) |

> ⚠️ JSON-оор хэмжсэн тул Postgres-ийн бодит хэмжээнээс арай ТОМ. Бодит хэмжээг
> Dashboard → **Database → Size** эсвэл SQL Editor дээр
> `select pg_size_pretty(pg_database_size(current_database()));` гэж харна.

**Supabase планын лимит ба хүрэх дээд хэмжээ:**

| | Free (үнэгүй) | Pro ($25/сар) |
|---|---|---|
| Database | **500 MB** → ~500,000 зар (текст) | 8 GB → ~8 сая зар |
| Storage | **1 GB** → ~5,400 зураг ≈ **~1,500 зар** | 100 GB → ~15,000 зар |
| Egress (трафик) | **5 GB/сар** | 250 GB/сар |
| MAU (нэвтэрсэн хэрэглэгч) | 50,000 | 100,000 |
| Төслийн түр зогсолт | ⚠️ **7 хоног идэвхгүй бол paused** | байхгүй |

**Бодит хязгаарыг DB БИШ, эдгээр тодорхойлно:**

1. **Storage (1 GB)** — нэг зар ~3.5 зураг × ~194 KB ≈ **~1,500 зар** л багтана.
   Шахалтыг (`lib/imageUtils.js`, maxDim 1600 / quality 0.82) хүчтэй болговол
   (жишээ нь `maxDim: 1400, quality: 0.75` → ~120 KB) 1 GB-д ~2,400 зар багтана.
2. **Egress (5 GB/сар)** — зургийн файлууд Storage-аас татагддаг тул гол зарцуулалт
   энэ. Нэг зочин ~10 зураг (≈2 MB) үзвэл **~2,500 зочны session/сар**.
   Зураг `loading="lazy"` тул зөвхөн харагдсан нь татагдана.
3. ⚠️ **Кодын хязгаар:** `lib/queries.js` → `fetchListings()` нь `.limit(300)`-тай
   (server-side pagination БАЙХГҮЙ). Зарууд **300-аас** холдвол хэрэглэгч хуучин
   заруудыг харахгүй → тэр үед хуудаслалт (infinite scroll / «Дараагийн хуудас»)
   нэмэх шаардлагатай.
4. Нэг нүүр хуудас нээхэд ~300 мөр (~300 KB) + `fetchPropertyTypeCounts`-ийн
   8 `count` query явдаг — өгөгдөл ихсэхэд хөнгөвчлөх нь зүйтэй (index, pagination).

**Live-ийн өмнөх зөвлөмж:** жинхэнэ хэрэглэгч, жинхэнэ зар нэмэгдэж эхлэхэд
Free план удахгүй (Storage/Egress-ээр) хүрэхгүй болно — **Pro** рүү шилжих нь
хамгийн түрүүчийн алхам. Мөн Free план нь 7 хоног идэвхгүй бол автоматаар
зогсдог (сайт унтарна) тул олон нийтэд нээхээс өмнө Pro шаардлагатай.

## 👁 «Үзсэн» ба ❤️ «Таалагдсан» тоолуур

| Хаана | Юу харагдана |
|---|---|
| **Зарын карт** (нүүр, жагсаалт, таалагдсан) | ❤️ товчин дотор **тоо** + зургийн зүүн доод буланд **👁 N** badge |
| **Дэлгэрэнгүй хуудас** — 📅 огнооны ЯГ хажууд | `📅 2 цагийн өмнө · 👁 12 үзсэн · ❤️ 5 таалагдсан` |
| **Дэлгэрэнгүй хуудас** — зургийн баруун дээд булан | Том ❤️ товч (`❤️ 5`) — зар луу ормогц шууд дарж болно |
| **Дэлгэрэнгүй хуудас** — ❤️ товч (гарчигт) | `❤️ Таалагдсан 5` |
| **Дэлгэрэнгүй хуудас** — «Шинж чанар» хүснэгт | `Үзсэн: 12 удаа`, `Таалагдсан: 5 хүн` |

### Загвар: хүснэгт + `count(*)` (хүн тус бүрээр, яг үнэн зөв)

```
❤️ Дарсан → listing_likes (listing_id, viewer_key) ┐
👁 Үзсэн  → listing_views (listing_id, viewer_key) ┘
                    │
                    └─ count(*) ─► TRIGGER ─► listings.likes / listings.views
                                               (карт дээр хурдан харуулах)
```

| Хүснэгт | Түлхүүр | Утга |
|---|---|---|
| `listing_likes` | `PRIMARY KEY (listing_id, viewer_key)` | Нэг хүн нэг зард **нэг л удаа** ❤️ дарна |
| `listing_views` | `PRIMARY KEY (listing_id, viewer_key)` | Нэг хүн нэг зард **нэг л удаа** тоологдоно |

- **`viewer_key`** = `u:<user_id>` (нэвтэрсэн) эсвэл `d:<browser-uuid>` (зочин)
  → зочин хүн ч давхар тоологдохгүй (`lib/statsClient.js → getDeviceId()`)
- **Тоолуурыг триггер `count(*)`-ээр** автоматаар шинэчилнэ —
  JS дээр «унших → +1 → бичих» гэсэн алдаа (race condition) гарахгүй ✅
- ❤️ товч дарах → `listing_likes`-д мөр **нэмэх/устгах** (COUNT биш)
- Токен байвал сервер **баталж** (`auth.getUser`) хэрэглэгчийн id-гаар тоолно —
  клиент хуурамч id илгээж чадахгүй ✅
- Зар устгавал тоолуурын мөрүүд **cascade**-аар арилна ✅
- RLS асаалттай, policy-гүй → зөвхөн сервер (service_role) хандана ✅

### ⚙️ НЭГ УДАА хийх тохиргоо (20 секунд)

Supabase нь DDL (`create table`) командыг зөвхөн SQL Editor-оор гүйцэтгэдэг
(`service_role` түлхүүрээр болохгүй — туршиж шалгасан) тул:

```bash
npm run stats:setup     # ① SQL-ийг clipboard-д хуулна + SQL Editor-ийг нээнэ
```
Дараа нь цонх дээр **Cmd+V → Run** (эсвэл Cmd+Enter).
```bash
npm run stats:check     # ② ажилласан эсэхийг шалгана
```
Миграцын файл: `supabase/migrations/0007_listing_likes_views.sql`
(хүснэгт 2 + триггер + `views`/`likes` багана — бүгдийг нэг дор үүсгэнэ)

> ✅ Миграц ажиллуулаагүй ч **сайт хэвийн ажиллана** — зөвхөн тоолуур `0` харагдана.
> (Код нь хүснэгт/багана байхгүйг тэсвэрлэдэг: API `{statsEnabled:false}` буцаагаад, UI 0-ийг үзүүлнэ.)

### 🧪 Migration-ийг хэрхэн шалгасан бэ

`0007`-г **локал PostgreSQL 16 дээр** бодитоор ажиллуулж 8 тест хийсэн:

```
--- 1. 👁 ҮЗСЭН: 3 хүн (нэг нь 2 удаа) ---            views = 3 ✅
--- 2. 👁 Давхардсан үзэлт → тоо ХӨДРӨХГҮЙ ---          views = 3 ✅
--- 3. ❤️ LIKE: 2 хүн ---                              likes = 2 ✅
--- 4. ❤️ Нэг хүн 2 удаа дарвал → ХӨДРӨХГҮЙ ---         likes = 2 ✅
--- 5. 🤍 UNLIKE → 1 болно ---                         likes = 1 ✅
--- 6. 🧍 Бусад зард нөлөөлөхгүй ---                    views/likes = 0/0 ✅
--- 7. 🗑 Зар устгавал cascade-аар арилна ---          0 мөр ✅
--- 8. 🔄 UNIQUE хязгаарлалт ажиллаж байна ---          unique_violation ✅
```

### ⚠️ Хязгаарлалт

- Хоёр тоо нь **уникал хүний тоо** (unique viewers) — нэг хүн 10 удаа харсан ч 1-д тооцогдоно.
- Зочин хүний `viewer_key` нь browser-ийн localStorage uuid тул browser-ийн өгөгдлийг
  устгавал шинэ хүнээр тоологдоно (жижиг алдаа, практикт хамаагүй).



## 📈 «Миний зарууд → Статистик» (хандалтын шинжилгээ)

Зар эзэн **өөрийн зарууд** хэр хандалттай байгааг харах хуудас.
`/my-listings` → **📈 Статистик** таб.

### Юу харуулах вэ

| Хэсэг | Агуулга |
|---|---|
| Хугацаа сонголт | **1 хоног · 3 хоног · 7 хоног · 30 хоног · Нийт** |
| Хураангуй 4 карт | Зарын тоо · Хандалт · ❤️ · Хамгийн эрэлттэй зар |
| 📊 График | Сонгосон хугацааны **өдөр тутмын** хандалт (7 багана ≤ 30 багана) |
| 🏆 Онцлох | Хамгийн их хандалттай зар (зураг, үнэ, тоо) + **✏️ Засах** button |
| Зар тус бүрээр | 🏅 эрэмбэ · хандалт · ❤️ · 7 хоногийн sparkline · **✏️ Засах** button |

#### 📊 Графикийн бүтэц (`ActivityChart`)

| Элемент | Тайлбар |
|---|---|
| Y тэнхлэг | 0 / дунд / хамгийн их — 3 хэвтээ grid шугамтай |
| Толгой | Нийт · Өдрийн дундаж · Хамгийн их |
| Багана | `bg-gradient-to-t` + `rounded-t` + `animate-grow-up` (доороосоо өснө) |
| Hover | Багана тодорч, дээр нь `09-23 · 5 хандалт · 2 ❤️` tooltip |
| Өнөөдөр | **Ногоон** градиент (`secondary`) — бусадаас ялгарах |
| Хандалтгүй | Бүдэг саарал зураас (0 = хоосон гэдэг нь тодорхой) |
| X тэнхлэг | ≤14 баганад **гарагийн товчлол** (Ня/Да/Мя/Лх/Пү/Ба/Бя), 30 баганад огнооны хил |
| Legend | Хандалт · Өнөөдөр · Хандалтгүй |

> `animate-grow-up` нь `tailwind.config.js`-д нэмэгдсэн keyframe
> (`growUp: scaleY(0) → scaleY(1)`) — багана нь `origin-bottom`-той хамт
> доороосоо өсөж харагдана.

#### ✏️ Зараа статистикаас шууд засах

Статистик таб дээрх **зар бүрийн ✏️ товч** болон **🏆 Онцлох хэсгийн ✏️ Засах**
товчоор зарыг засах цонх шууд нээгдэнэ (`AppProviders → openEdit`).

```
Зар тус бүрийн мөр:   [ ✏️ Засах ]              ← зөвхөн засах
🏆 Онцлох:            [ ✏️ Засах ]
```

> ℹ️ Статистик таб нь **шилжих** зориулалттай биш, **шинжилгээний** таб тул
> «👁 Харах» линкийг хассан — зарыг үзэх бол `/my-listings` → «📋 Миний зарууд»
> эсвэл карт дээрх зарын нэрээр орно. Ингэснээр мөр бүр цэвэрхэн, нэг л үйлдэлтэй.

**Ажиллах урсгал** (`MyListingsStatsPanel → handleEdit`):

1. Товч дарах → `busyId` тохируулагдаж товч `⏳` болно
2. `fetchListingById(id)` — **бүтэн мөрийг** татна
3. `openEdit(full)` → засах цонх урьдчилан бөглөгдөж нээгдэнэ
4. Хадгалсны дараа `notifyListingsChanged()` → `dataVersion` ↑
5. Энэ компонент `useEffect([load, dataVersion])`-аар **статистикаа автоматаар
   шинэчилнэ** (гараар refresh хийх шаардлагагүй)

> ⚠️ **ЯАГААД ЭХЛЭЭД БҮТЭН МӨР ТАТАХ ХЭРЭГТЭЙ ВЭ:** `/api/my-listings/stats` нь
> зөвхөн статистикт шаардлагатай багануудыг буцаадаг (`build_year`, `floor`,
> `description`, `address_detail`, `latitude`, `phone` … **байхгүй**). Тэр
> объектыг шууд засах модульд дамжуулбал хадгалахад эдгээр талбар **хоосон
> болж устана**. Тиймээс `fetchListingById()`-ээр бүтэн мөрийг татдаг
> (RLS нь `listings_select` тул хүн бүр уншиж чадна — эрхийн асуудалгүй).


`days = 0` (`lib/activityWindows.mjs → ALL_TIME_DAYS`) нь **бүх хугацааны
давхардалгүй** утгыг харуулна:

| Сонголт | Үзсэн | ❤️ |
|---|---|---|
| 1/3/7/30 хоног | `views.d1 / d3 / d7 / d30` | `likes.dN` |
| **Нийт** | `uniqueViews` (`listings.views`) | `uniqueLikes` (`listings.likes`) |

> ⚠️ Серверийн payload-д `views.d0` гэсэн түлхүүр **байхгүй** — тиймээс
> «Нийт»-ийг `uniqueViews`-ээс тусдаа авна (`pickViews()`), эс бөгөөд 0 болно.

- «Нийт» сонгоход 📊 график нь бүртгэлтэй бүх **30 хоногийг** харуулна
- Зар тус бүрийн «Нийт үзсэн хүн / Нийт ❤️» мөр нь давхардахгүйн тулд нуугдана

### 🔥 «Хамгийн эрэлттэй зар» яаж тодорхойлогддог вэ

**Сонгосон хугацааны хандалтаар**, дараах мөрөөр эрэмбэлнэ:

```
1) тухайн цонхны хандалт  (views.d1 / d3 / d7 / d30 ; Нийт → uniqueViews)  ↓ их нь эхэнд
2) тухайн цонхны ❤️        (likes.d1  …  d30 ; Нийт → uniqueLikes)          ↓
3) бүх хугацааны үзсэн хүн (uniqueViews)                                    ↓
```

- `lib/activityWindows.mjs` → `pickViews()` / `pickLikes()` (тестлэгддэг цэвэр функцууд)
- `components/MyListingsStatsPanel.jsx` → `ranked` (useMemo) — **хугацаа
  солигдох бүрд дахин эрэмбэлнэ**
- 🏆 хэсэг нь зөвхөн **тухайн хугацаанд хандалт байвал** харагдана (0 дээр
  «хамгийн эрэлттэй» гэж худал онцлохгүйн тулд)
- ⚠️ Сервер тал (`lib/listingActivity.js`) нь **30 хоногоор** эрэмбэлж
  буцаадаг (тогтмол утга) — клиент нь үүнийг баазар ашиглаад сонгосон
  цонхоор дахин эрэмбэлнэ. Хэрэв зөвхөн серверийн дараалалд найдаж
  `listings[0]`-ыг харуулбал **«3 хоног» сонгоход 30 хоногийн аварга зарын
  3 хоногийн тоо (0 байж болно) харагдана** — буруу зар.

### 🧹 UI-д ХАРУУЛАХГҮЙ хэмжүүр

Сервер нь `newViewers` / `newLikes` (тухайн хугацаанд **анх удаа** үзсэн
хүн/❤️) гэсэн тусдаа цонхыг буцаадаг ч **UI-д гаргахгүй** — хэрэглэгчид
хоёр өөр «үзсэн» ойлголт төөрөгдүүлдэг тул зөвхөн үндсэн хэмжүүрийг
(хандалт/үзсэн + ❤️) харуулна. Код нь `mode: 'unique'` үед л түүнийг
ашигладаг (fallback).


### ⚠️ ХОЁР ГОРИМ — яагаад хоёр вэ

`0007`-ийн `listing_views` нь `PRIMARY KEY (listing_id, viewer_key)` тул
**нэг хүн нэг зард зөвхөн НЭГ удаа** бичигддэг (`created_at` = анх үзсэн цаг).
Тиймээс тэр хүснэгтээс «сүүлийн 1 хоногт хэдэн **хандалт** байсан» гэдгийг
**мэдэх боломжгүй** — зөвхөн «хэдэн ШИНЭ хүн ирсэн» гэж мэднэ.

| | `mode: 'unique'` (миграцгүй) | `mode: 'daily'` (0010 ажилласан) |
|---|---|---|
| `d1/d3/d7/d30` гэдэг нь | Тухайн хугацаанд **давхардалгүй үзсэн хүн** | Тухайн хугацааны **НИЙТ ХАНДАЛТ** (page open) |
| График | ❌ гарахгүй | ✅ өдөр тутмын багана |
| UI | Шар сануулга харуулна | Хэвийн |
| Сайт эвдрэх үү | **Үгүй** — зөвхөн хуучин хэмжүүр | — |

> 💡 Хоёр горимд ч «Нийт үзсэн хүн» / «Нийт ❤️» нь `listings.views` / `listings.likes`
> (бүх хугацааны уникал тоо) баганаас гардаг тул **ямагт зөв**.

### 🚀 `mode: 'daily'` асаах (өдөр тутмын хандалт)

```bash
npm run stats:setup     # 0007 + 0010 SQL-ийг clipboard-д хуулж, SQL Editor нээнэ
                        #   → ⌘A ⌫ (хуучин агуулгыг устга) → ⌘V → Run
npm run stats:check     # «🎉 Миграцууд АЖИЛЛАЖ БАЙНА» гарвал бэлэн
```

Ажиллаж эхэлмэгц:
- `app/api/listings/[id]/view` → `logActivity(id, 1, 0)` (хуудас нээлт бүрд +1)
- `app/api/listings/[id]/like` → `logActivity(id, 0, ±1)` (❤️ цэвэр өөрчлөлт)
- `listings.views` (уникал хүн) **хэвээр** ажиллана — давхардлыг `listing_views` хянана

> ⚠️ Миграц нь хуучин `listing_views` / `listing_likes` мөрүүдээс **суурийг
> автоматаар бөглөнө** (өдрөөр бүлэглэж), тиймээс шинэ хүснэгт хоосон эхлэхгүй.
> Гэхдээ тэр нь «тухайн өдөр анх үзэгдсэн» гэсэн утгатай — бодит давтамж
> миграц ажилласан **цагаас хойш** л бүрэн нарийвчлалтай болно.

### Файлууд

| Файл | Үүрэг |
|---|---|
| `supabase/migrations/0010_listing_activity_daily.sql` | `listing_activity_daily` хүснэгт + `bump_listing_activity()` RPC |
| `lib/activityWindows.mjs` | 1/3/7/30 цонхны **цэвэр математик** (import/env-гүй → тестлэх боломжтой) |
| `lib/listingActivity.js` | Сервер талын агрегац (service_role) |
| `app/api/my-listings/stats/route.js` | `GET` — зөвхөн өөрийн заруудыг буцаана (id нь **токеноос**) |
| `lib/myStatsApi.js` | Клиент талын дуудалт (Bearer token) |
| `components/MyListingsStatsPanel.jsx` | UI (график, карт, эрэмбэ) |
| `scripts/test-activity.mjs` | 40 тест — цонхны хил, өндөр жил, round-trip, `pickViews`/`pickLikes` («Нийт»), гарагийн товчлол |

### 🧪 Тест

```bash
npm run test:activity
# 🧪 Цонхны математикийн тест (lib/activityWindows.mjs)
#   ✓ age 6 → d7-д орно (сүүлийн 7 хоног = 0..6)
#   ✓ age 7 → d7-д ОРОХГҮЙ, d30-д орно
#   ...
# ✅ БҮГД ТЭНЦСЭН — 40 тест
```

**Бодит DB дээр баталгаажсан** — **528 шалгалт, 88 зар** (`mode: 'daily'`):

| Шалгасан зүйл | Зарын тоо | Үр дүн |
|---|---|---|
| `d1` == тухайн зарын 1 хоногийн `listing_activity_daily` нийлбэр | 88/88 | ✅ |
| `d3` == 3 хоног | 88/88 | ✅ |
| `d7` == 7 хоног | 88/88 | ✅ |
| `d30` == 30 хоног | 88/88 | ✅ |
| `uniqueViews` («Нийт») == `listings.views` | 88/88 | ✅ |
| `uniqueLikes` («Нийт ❤️») == `listing_likes` мөрийн тоо | 88/88 | ✅ |

> ⚠️ **Хоёр өөр хэмжүүр:** 1/3/7/30 хоног нь **хандалт** (page open, давтан
> тоологдоно), «Нийт» нь **давхардалгүй үзсэн хүн** (бүх хугацаа). Тиймээс
> «Нийт» нь `d30`-оос бага байж ч болно (30 хоногт 1 хүн 10 удаа нээвэл d30=10,
> харин Нийт=1). Энэ нь алдаа биш — зориудын ялгаа.

### 🔐 Аюулгүй байдал

- Хэрэглэгчийн id нь **токеноос** (`getUserFromToken`) авдаг тул өөр хүний
  статистикийг харах боломжгүй (`?userId=` дамжуулж ч үл тоомсорлоно).
- `listing_views` / `listing_likes` / `listing_activity_daily` нь anon/authenticated-д
  **хаалттай** (RLS + `revoke`) — зөвхөн сервер тал `service_role`-оор уншина.
- `bump_listing_activity()` нь `security definer` бөгөөд
  `revoke … from public, anon, authenticated` + `grant execute to service_role`.



## Зар засах · Таалагдсан зарууд · Экспорт

### 1. Зар нэмэх цонх — өгөгдөл алдагдахаас хамгаалалт ✅

Урьд нь цонхны **гадна (хар дэвсгэр) дарж** санамсаргүй хаагдаж, бөглөсөн мэдээлэл
бүхэлдээ алга болдог байсан. Одоо:

- Өөрчлөлт (эсвэл шинэ зураг) байвал гадна дарах / × дарах үед
  **«Оруулсан мэдээлэл хадгалагдахгүй УСТАНА. Гарахдаа итгэлтэй байна уу?»** гэж асууна.
- «Үгүй» гэвэл цонх нээлттэй, бүх утга хэвээр үлдэнэ.
- Хоосон цонхыг бол шууд хаана (зочлонгуйдаа).
- Хадгалж байх (submitting) үед хаагдахгүй.

### 2. Зар засах ✏️

`/my-listings` → «✏️ Засах» → **ижил цонх урьдчилан бөглөгдөж** нээгдэнэ
(гарчиг: «✏️ Зарыг засах», товч: «💾 Өөрчлөлтийг хадгалах»). Хуучин зургуудыг
харах ба «×» дарж устгах боломжтой.

> ℹ️ **SQL шаардлагагүй — ажиллаж байна ✅.** `0001_schema.sql`-д `listings_update`
> policy байхгүй тул RLS нь UPDATE-ыг чимээгүй блоклоно (`HTTP 200, []` → 0 мөр).
> Тиймээс `updateListing()` нь **2 шатлалтай**:
>
> 1. Эхлээд энгийн **UPDATE**-ээр оролдоно — policy байвал хамгийн сайн (1 хүсэлт).
> 2. Ажиллахгүй бол **DELETE + INSERT** fallback — `id` болон `created_at`-ыг
>    хадгалж, яг ижил зар болгон дахин үүсгэнэ (0001-д delete/insert policy бий).
>
> Fallback нь SQL-гүйгээр ажиллана (бодит browser + DB тестээр баталгаажсан:
> үнэ шинэчлэгдэж, `id`/`created_at` хэвээр үлдсэн).
>
> Илүү найдвартай (1 хүсэлт, эрсдэлгүй) болгохыг хүсвэл — сонголтоор:
> ```bash
> pbcopy < supabase/migrations/0005_listings_update_policy.sql
> # → https://supabase.com/dashboard/project/<ref>/sql/new → Cmd+V → Run
> ```
> Эсвэл `SUPABASE_ACCESS_TOKEN` (sbp_…) байвал би өөрөө хийж өгнө:
> `node scripts/apply-schema.js 0005_listings_update_policy.sql`

### 3. Миний зарууд + Статистик 📈

`/my-listings` → сегмент табууд: **«📋 Миний зарууд» | «📈 Статистик»**

- Хуудас нь **зөвхөн ӨӨРИЙН** зарыг харуулна (нэвтрэх шаардлагатай).
- **Карт бүхэлдээ линк** — карт дээрээ дарахад зарын дэлгэрэнгүй нээгдэнэ
  (`hover` дээр хүрээ цэнхэрлэж, сүүдэр нэмэгдэж, гарчиг өнгө солигдоно).
  Тусдаа «👁 Харах» товч **байхгүй** — илүүц давхардал байсан.
- Картын баруун талд зөвхөн үйлдлийн товчнууд: «✏️ Засах» / «🗑 Устгах».
  ⚠️ Эдгээр нь `<Link>`-ээс **ГАДНА** байрлана — `<a>` дотор `<button>` хийх нь
  invalid HTML (браузер нь линк рүү шилжүүлчихдэг).
- Нэвтрээгүй зочинд «🔑 Миний заруудыг харахын тулд нэвтрэх шаардлагатай» гэж
  харагдана (табууд ч харагдахгүй).
- «📈 Статистик» → өөрийн заруудын хандалт (доор дэлгэрэнгүй).

> ⚠️ **«🌐 Бүх зарууд» таб ХАСАГДСАН (засвар).** Учир нь «Миний зарууд» гэдэг
> нэртэй хуудас дээр **бусдын** зарууд харагдах нь төөрөгдүүлж, «миний» гэдэг
> утгыг алдагдуулж байв. Бүх зарыг харах 3 зөв газар:
>
> | Юу харах вэ | Хаана |
> |---|---|
> | Бүх зар + хайлт/шүүлт/газрын зураг | **Нүүр хуудас `/`** |
> | Тухайн зарын нийтлэгчийн бусад зар | `/sellers/[id]` |
> | Өөрийн зарууд | `/my-listings` |
>
> Хуудсан дээр «Энэ хуудас зөвхөн таны заруудыг харуулна. Бүх зарыг хайх бол
> **нүүр хуудас** руу орно уу.» гэсэн тодруулга + линк үлдээсэн.

> ℹ️ **«➕ Зар нэмэх» товч энэ хуудаснаас ХАСАГДСАН** — header (AppProviders) дээр
> аль хэдийн байгаа тул давхардаж, табуудтай хамт эмх замбараагүй харагддаг байв.
> Зар нэмэх бол дээд header-ийн товчийг ашиглана (эсвэл зар байхгүй үеийн
> хоосон төлөв дэх товчийг).



### 4. ❤️ Таалагдсан зарууд

- **Зар (карт)** болон **зарын дэлгэрэнгүй** хуудсан дээр 🤍/❤️ зүрхэн товч.
- Header дээр «❤️ Таалагдсан **N**» — N нь хадгалсан зарын тоо (шууд шинэчлэгдэнэ).
- `/favorites` хуудас: хадгалсан бүх зар нэг дор, нийт үнэ, хасах/цэвэрлэх товч.
- Хадгалалт нь **browser-ийн localStorage** (`lib/favorites.js`) — сервер/DB
  тохиргоо шаардахгүй, нэвтрэлт ч шаардахгүй. Олон төхөөрөмж дээр синхрон
  болгохыг хүсвэл `0005_listings_update_policy.sql`-ийн доод хэсэгт бэлэн
  `favorites` хүснэгтийн SQL байна.

### 5. Excel / PDF экспорт 📊🖨

`/favorites` дээрх 2 товч (**нэмэлт сан суулгахгүйгээр**):

| Товч | Юу хийдэг |
|---|---|
| 📊 **Excel татах** | UTF-8 BOM-той **CSV** файл татна → Excel дээр кирилл/монгол үсэг зөв нээгдэнэ (`taalagsan-zaruud-YYYY-MM-DD.csv`) |
| 🖨 **PDF болгох** | Хэвлэх цонхыг нээж бэлэн хүснэгт харуулна → browser-ийн **«Save as PDF / PDF болгон хадгалах»**-аар PDF татна (A4 landscape) |

Баганын бүрэлдэхүүн: Төрөл · Зар/Түрээс · Үнэ · Өрөө · Талбай · Давхар · Он ·
Хот · Дүүрэг · Хороо · Хаяг · Утас · Нийтэлсэн · **Холбоос** (шарж болох URL).

Файлууд: `lib/favorites.js` (хадгалалт) · `lib/exporters.js` (CSV/PDF) ·
`components/FavoritesClient.jsx` · `app/favorites/page.jsx` ·
`components/MyListingsClient.jsx` (табууд + засах) · `components/AddListingModal.jsx`
(засах горим + хамгаалалт) · `lib/queries.js` (`updateListing`, `fetchListingsByIds`)

## Админ хэсэг (хэрэглэгчид + зарууд)

`/admin/users` — бүртгэгдсэн хэрэглэгчдийн жагсаалт, зарны тоо, эрх удирдах.
Зөвхөн **админ** хэрэглэгч нээж чадна (бусад нь 403 «Танд админ эрх байхгүй»).

| Юу харна | Тайлбар |
|---|---|
| Нэр, утас, имэйл | `user_metadata.name`, `phone`, дотоод имэйл |
| Бүртгэгдсэн / сүүлд нэвтэрсэн | `created_at`, `last_sign_in_at` |
| **Зарын тоо** | `listings` хүснэгтээс хэрэглэгч тус бүрээр тоолно |
| Эрх | «🛠 Админ болгох» / «👤 Эрх авах» товч |
| Статистик | Нийт хэрэглэгч · Админ · Нийт зар · Зартай хэрэглэгч |

### Эрх нь ХААНА хадгалагддаг вэ — `app_metadata.is_admin`

> ⚠️ `user_metadata` БИШ, **`app_metadata`** — учир нь `user_metadata`-г хэрэглэгч
> өөрөө `auth.updateUser({ data })`-ээр сольж чаддаг тул **өөрийгөө админ болгочихно**.
> Харин `app_metadata`-г **зөвхөн service_role** (сервер) бичиж чадна.
> → Шинэ хүснэгт/migration шаардахгүй, аюулгүй.
> (Хэрэв сүүлд нь DB хүснэгт рүү шилжүүлэх бол `lib/adminAuth.js`-ийг л солиход хангалттай.)

### Админ болгох

```bash
npm run make:admin -- 88093663            # админ болгох
npm run make:admin -- 88093663 --revoke   # эрх авах
npm run make:admin -- --list              # админуудыг харуулах
```
Дараа нь тэр хэрэглэгч browser-ээ хуудас refresh хийхэд header-ийн цэсэнд
«🛠 Админ — Хэрэглэгчид» гарч ирнэ.

**API** (бүгд `Authorization: Bearer <access_token>` шаардана):

| Route | Юу |
|---|---|
| `GET /api/admin/me` | `{ isAdmin }` — header цэс харуулах эсэх |
| `GET /api/admin/users` | Хэрэглэгчдийн жагсаалт + статистик (зөвхөн админд) |
| `PATCH /api/admin/users/{id}` | `{ isAdmin: true\|false }` — эрх солих |

Аюулгүй байдал:
- `requireAdmin()` нь Bearer токеныг Supabase-ээр шалгаж (`getUser`), `app_metadata.is_admin`-ыг батална.
- Админ **өөрөөсөө** эрх авч чадахгүй (бүх админ алга болохоос сэргийлж).
- `GET /api/admin/users` нь service_role ашигладаг тул зөвхөн сервер талд ажиллана.

> ⚠️ Хязгаарлалт: зарын тоог `listings`-ээс (хамгийн ихдээ 10,000 мөр) татаж JS-д
> тоолдог. Маш том өгөгдөлд Postgres-ийн `group by` view/RPC болгох нь зүйтэй.



### Localhost дээрх онцлог

verify.mn нь зөвхөн **public host** руу callback хийж чадна. Тиймээс browser нь
`/api/auth/register/status`-ыг **3 секунд тутам** дуудаж өөрөө шалгадаг (polling) —
production дээр ч энэ нь үндсэн механизм. `VERIFY_MN_CALLBACK_URL`-ийг зөвхөн
production дээр тохируулж болно (сонголтоор, шуурхай болгоно).

### Нууц үгээ мартвал?

"Нууц үг сэргээх" урсгал одоогоор байхгүй. Дугаар нь бүртгэлтэй тул дахин
бүртгүүлэхэд `PHONE_EXISTS` гарна — хэрэгтэй бол Supabase Admin API-аар
`admin.updateUserById(id, { password })` хийх endpoint нэмнэ.

## Үйлчилгээний нөхцөл (`/terms`) ба Санал хүсэлт (`/feedback`)

### 1. Үйлчилгээний нөхцөл — `/terms`

`app/terms/page.jsx` — статик (server component) хуудас. Монгол Улсын хууль
тогтоомжид үндэслэн боловсруулсан **13 зүйл + хавсралт**:

| Зүйл | Агуулга |
|---|---|
| 1–3 | Ерөнхий заалт, нэр томьёо, бүртгэл ба хэрэглэгчийн үүрэг (18+, утас+SMS) |
| **4** | **Зар байршуулах дүрэм ба ЗАРЫН ХАРИУЦЛАГА** — «зарын үнэн бодит байдал, үнийн үнэн зөв, зураг/мэдээллийг **Зар нийтлэгч өөрөө бүрэн хариуцна**», платформ нь урьдчилан шалгах үүрэггүй |
| 5–7 | Хориглосон агуулга, платформ нь зуучлагч биш, оюуны өмч |
| **8** | **Хувийн мэдээлэл ба ГАДААДЫН СЕРВЕРТ хадгалах тухай** — утас/нэр/зарын мэдээлэл нь **Supabase/AWS (Монгол Улсын нутаг дэвсгэрээс гадна)** хадгалагдах ба бүртгүүлснээр гадаад руу шилжүүлэх **зөвшөөрөл олгосонд тооцно**; 8.1 юу цуглуулах, 8.2 зарын утас нийтэд харагдана, 8.4 хамгаалалт/хугацаа, 8.5 хэрэглэгчийн эрх |
| 9–13 | Хариуцлагын хязгаар, төлбөр, бүртгэл хаах, маргаан (Монгол Улсын шүүх), нөхцөл өөрчлөх |

Үндэслэсэн хуулиуд (хавсралтад жагсаасан): Үндсэн хууль · Иргэний хууль ·
Хувь хүний мэдээллийн хамгаалалтын тухай хууль · Хэрэглэгчийн эрхийг хамгаалах
тухай хууль · Цахим худалдааны тухай хууль · Зар сурталчилгааны тухай хууль ·
Цахим гарын үсгийн тухай хууль · Зөрчлийн тухай хууль.

> ⚠️ Хуудасны доод хэсэгт «энэ нь **загвар** — нийтлэхийн өмнө хуульчаар хянуулж,
> байгууллагынхаа мэдээлэл (нэр, регистр, хаяг, холбоо барих)-ыг нэмнэ үү» гэсэн
> анхааруулга байгаа. `LAST_UPDATED` тогтмолыг (`app/terms/page.jsx`) шинэчлэхээ мартуузай.

**Хаана холбогдсон:** footer (бүх хуудсанд), бүртгэлийн форман дээрх зөвшөөрлийн
мөр (`components/AuthModal.jsx` — SMS баталгаажуулалтын өмнө), санал хүсэлтийн форм.

### 2. Санал хүсэлт — `/feedback` → `/admin/feedback`

```
Хэрэглэгч (бүртгэлтэй)  ──insert──►  public.feedback  ──service_role──►  /admin/feedback
   /feedback               (RLS: own)   (RLS: own select)     API: /api/admin/feedback
```

- **Зөвхөн БҮРТГЭЛТЭЙ хэрэглэгч** илгээнэ. Нэвтрээгүй бол «🔑 Нэвтрэх / Бүртгүүлэх»
  товч харагдана (`components/FeedbackClient.jsx`).
- Форм: саналын төрөл (`💡 Санал` / `⚠️ Гомдол` / `🐞 Алдаа` / `💬 Бусад`), гарчиг
  (сонголтоор), агуулга (5–4000 тэмдэгт). Илгээхдээ нэр + утас **хуулбар** болж
  хадгалагдана (админ жагсаалтад auth хүснэгт рүү нэмэлт query хийхгүйн тулд).
- Хэрэглэгч өөрийн илгээсэн саналууд ба **админы хариуг** жагсаалтаар харна.
- **Админ** нь `/admin/feedback` хуудсаар (зөвхөн `app_metadata.is_admin`) бүгдийг
  харж, шүүж (Бүгд / Шинэ / Харсан / Шийдсэн + текст хайлт), төлөв сольж,
  хэрэглэгчид харагдах **хариу (admin_note)** бичнэ.

#### ⚠️ НЭГ УДАА хийх 2 ТОХИРГОО (хоёуланг нь ажиллуулна)

```bash
npm run feedback:setup     # 0008 + 0009-ийн SQL-ийг clipboard-д хийж, SQL Editor-ийг нээнэ
npm run feedback:check     # миграц ажилласан эсэхийг шалгана
```

**SQL Editor дээрх 4 алхам (30 сек):** `⌘A` → `⌫ Delete` (хуучин агуулгыг БҮРЭН
устгах — заавал!) → `⌘V` → **Run** (`⌘+Enter`). «Success. No rows returned» гарвал бэлэн.

> ⚠️ Supabase нь DDL (`create table …`) командыг **зөвхөн** SQL Editor эсвэл
> Management API (`sbp_…` token) -аар гүйцэтгэдэг — `service_role`-ээр PostgREST
> дамжуулан ажиллуулах боломжгүй. (`SUPABASE_ACCESS_TOKEN` байвал
> `node scripts/apply-schema.js 0008_feedback.sql` гэж автоматаар ажиллуулж болно.)

⚠️ `0009` ажиллуулаагүй ч **сайт эвдрэхгүй** — зарын гомдол `listing_id`-гүйгээр
илгээгдэж, зарын ID нь гарчигт нь автоматаар бичигдэнэ (`submitFeedback` fallback).

Миграц ажиллаагүй бол `/feedback` дээр «Санал хүсэлтийн хүснэгт олдсонгүй. …
0008_feedback.sql-ийг ажиллуулна уу» гэсэн ойлгомжтой мессеж гарна (сайт эвдрэхгүй).
Шалгах: `select count(*) from public.feedback;`

| API | Юу хийх |
|---|---|
| `GET /api/admin/feedback` | Бүх санал + статистик (`{rows, stats:{total,new,read,resolved}}`) |
| `PATCH /api/admin/feedback` | `{ id, status?: 'new'\|'read'\|'resolved', adminNote?: string }` |

Хүснэгтийн бүтэц: `id · user_id · category · subject · message · contact_name ·
phone · status · admin_note · created_at · handled_at` (RLS: insert/select нь
зөвхөн өөрийн мөр; update/delete нь хэрэглэгчид БАЙХГҮЙ — админ service_role-оор).



## 🏦 Ипотекийн тооцоолуур ба 📊 Үнийн статистик

### Ипотекийн тооцоолуур — `/mortgage` (+ зарын дэлгэрэнгүй хуудсанд)

- **`lib/mortgage.js`** — цэвэр функцууд: `monthlyPayment()`, `calcMortgage()`,
  `rateScenarios()`. Аннуитет томьёо `M = P·r / (1 − (1+r)^−n)`.
- **`components/MortgageCalculator.jsx`** — үнэ / урьдчилгаа (10–40% chip + slider) /
  жилийн хүү (preset + гараар) / хугацаа (5–30 жил) оруулаад:
  сарын төлбөр, урьдчилгаа, зээлийн дүн, **нийт төлөх**, **нийт хүү**, мөн
  «хүү ±2% болвол сарын төлбөр» харьцуулалт.
- **Хаана:** `/mortgage` бүтэн хуудас (FAQ + юу ороогүй вэ) ба **зарын баруун баганад**
  (зөвхөн `category === 'sell'`, `details/summary`-ээр эвхэгддэг, зарын үнэ автоматаар).
- **Дэлгэрэнгүй хуудсанд нэмж** шинж чанарын хүснэгтэд **«Үнэ / м²»** мөр нэмэгдэв
  (`price ÷ area`, зөвхөн «зарах» + талбайтай үед).
- Шалгасан тоо (price 280сая, 30% урьдчилгаа, 12.5%, 20 жил):
  зээл **196,000,000** → сарын **2,226,835 ₮** → нийт **534,440,515 ₮** (хүү 338,440,515).
- ⚠️ Тооцоололд банкны шимтгэл/даатгал/нотариат ороогүй — ЗБӨ-г банкнаас шалгана.

### Үнийн статистик — `/stats` (манай өөрийн заруудаас)

- **`lib/queries.js` → `fetchPricePerM2Stats()`** — «зарах» + «Орон сууц» + талбай/үнэ
  бүрэн зар уудыг татаж, **дүүрэг ба хороогоор** медиан/дундаж ₮/м², бага–их, дундаж
  үнийг бодно (PostgREST GROUP BY дэмждэггүй тул JS дээр агрегац).
- **`components/PriceStatsClient.jsx`** — хот сонголт, «Дүүргээр / Хороогоор» таб,
  харьцуулах бар, гаргасан огноо, **эх сурвалжийн тэмдэглэл**.
- **`lib/marketData.js`** — гадны лавлагаа (эх сурвалжтай): Монголбанкны
  **бодлогын хүү 12.5%** (2026-09-17), УБ-ын инфляц **7.2%** *(mongolbank.mn, 2026-08)*.
- ⚠️ **Жинхэнэ дүүрэг/хорооны өгөгдөл (9 зар)** — медиан **3,579,098 ₮/м²**,
  Хан-Уул 3.58 сая (4 зар), Баянгол 3.95 сая (2), Багахангай 6.0 сая (2), Баянзүрх 3.08 сая (1).
  Түүвэр 10-аас доош үед «төлөөлөх чанар муу» гэсэн анхааруулга UI дээр гардаг.

#### ⚠️ Гадны статистик — ХИЙСЭН ШАЛГАЛТ (автоматаар татах боломжгүй)
| Эх сурвалж | Үр дүн |
|---|---|
| `mongolbank.mn` | ✅ нээлттэй — бодлогын хүү 12.5%, инфляц (лавлагаа болгож авсан) |
| `unegui.mn` | ❌ HTTP 403 (bot хамгаалалт) |
| `1212.mn` (ҮСХ) | ❌ fetch failed |
| `duckduckgo.com`, `bing.com` | ❌ bot challenge / холбогдолгүй үр дүн |
| `news.mn` | ❌ timeout |

Тиймээс: **дүүргийн ₮/м²-ийг манай заруудаас бодно** (автомат, хууль цэвэр);
албан ёсны/лицензтэй тайлангийн тоог гараар нэмэх боломжтой —
`lib/marketData.js → REFERENCE_PRICE_PER_M2` (эх сурвалж + огноо + линктэй).

**DB migration шаардлагагүй** — одоо байгаа `listings` хүснэгтээс бодогдоно.

### 3. Админ — Зарын удирдлага (`/admin/listings`)

Админ нь **ЯМАР Ч зарыг** хайж, устгах боломжтой (`app_metadata.is_admin` шаардана).

| Хайлтын горим | Хэрхэн ажилладаг |
|---|---|
| **Бүтэн ID** (uuid) | `eq('id', …)` |
| **ID-ийн эхлэл** (4+ hex тэмдэгт) | ⚠️ `id` нь **uuid** багана тул `ilike` ажиллахгүй (`operator does not exist: uuid ~* unknown`, HTTP **42883**) → сүүлийн 500 зарыг татаж JS дээр `startsWith`-ээр шүүнэ (UI дээр «сүүлийн N зарын дотор…» гэж харуулна) |
| **Текст** | утас · нэр · төрөл · дүүрэг · хороо · хот · хаяг (`ilike`) |

- **Устгах:** `DELETE /api/admin/listings?id=<uuid>` → `deleteAdminListing()` нь эхлээд
  Storage дахь зургуудыг (`listing-images`) устгаж, дараа нь мөрийг устгана
  (RLS нь зөвхөн «өөрийн зар»-ыг устгахыг зөвшөөрдөг тул **service_role** ашиглана).
- Карт бүр дээр: төрөл/үнэ/хаяг/утас/нэр/зургийн тоо/👁❤️ + `👁 Харах`, `👤 Зар нийтлэгч`, `🗑 Зар устгах`.
- **Хэрэглэгчийн гомдол:** зарын дэлгэрэнгүй хуудсанд «⚠️ Энэ зарын талаар гомдол
  мэдэгдэх» товч (`components/ReportListingModal.jsx`) → шалтгаан сонгож илгээнэ →
  `feedback` хүснэгтэд `category='complaint'` + `listing_id`-той хадгалагдана →
  **`/admin/feedback`** хуудсанд зарын мэдээлэл, холбоос, `🗑 Зар устгах` товчтой хамт гарна.

#### 🧪 E2E тест (бодит DB дээр хийсэн)

| # | Шалгалт | Үр дүн |
|---|---|---|
| 1 | Туршилтын зар үүсгэх (`E2E-TEST-…` хаягтай) | ✓ |
| 2 | Бүтэн ID-аар хайх | ✓ 1 илэрц (`mode: id`) |
| 3 | ID-ийн эхлэлээр (6 тэмдэгт) хайх | ✓ 1 илэрц (`mode: id-prefix`) |
| 4 | Текстийн хайлт (хаягаар) | ✓ 1 илэрц (`mode: text`) |
| 5 | `deleteAdminListing()` — ямар ч зар устгах | ✓ устгав |
| 6 | DB-д үнэхээр устсан эсэх | ✓ олдсонгүй |
| 7 | Байхгүй ID дээр | ✓ ойлгомжтой алдаа |
| 8 | Токенгүй `GET`/`DELETE /api/admin/listings` | ✓ **401** |
| 9 | `/admin/listings` хуудас | ✓ 200, dev log алдаагүй |

## Төслийн бүтэц

```
app/
  layout.jsx, page.jsx, globals.css   # globals.css = Tailwind суурь + @layer components
  mortgage/page.jsx          # ипотекийн тооцоолуур
  stats/page.jsx             # үнийн статистик (₮/м²)
  terms/page.jsx             # үйлчилгээний нөхцөл (статик)
  feedback/page.jsx          # санал хүсэлт (бүртгэлтэй хэрэглэгч)
  admin/feedback/page.jsx    # админ — санал хүсэлт
  admin/listings/page.jsx    # админ — зарын удирдлага (ID-аар хайх + устгах)
  listings/[id]/page.jsx     # зарын дэлгэрэнгүй
  sellers/[id]/page.jsx      # зар нийтлэгчийн бусад зарууд (Зарах/Түрээслэх табтай)
  my-listings/page.jsx       # миний зарууд
  api/admin/feedback/route.js                          # GET/PATCH (санал хүсэлт)
  api/auth/register/{start,status,complete}/route.js   # бүртгэлийн API (SMS баталгаажуулалт)
  api/auth/verify/callback/route.js                    # verify.mn-ийн "шалга" дохио
  not-found.jsx
components/
  AppProviders.jsx           # auth/toast/modal state + header/footer
  AuthModal.jsx              # Нэвтрэх / Бүртгүүлэх / SMS баталгаажуулалт (3 сек polling)
  AddListingModal.jsx
  HomeClient.jsx, ListingCard.jsx, ListingDetailClient.jsx
  SellerListingsClient.jsx   # /sellers/[id] — нэг хэрэглэгчийн зарууд (Бүгд/Зарах/Түрээслэх)
  FeedbackClient.jsx         # /feedback — санал хүсэлт (бүртгэлтэй хэрэглэгч)
  AdminFeedbackClient.jsx    # /admin/feedback — админы санал хүсэлтийн самбар
  AdminListingsClient.jsx    # /admin/listings — зарын хайлт (ID/текст) + ямар ч зарыг устгах
  ReportListingModal.jsx     # зарын дэлгэрэнгүй хуудсанд «⚠️ гомдол мэдэгдэх» форм
  MortgageCalculator.jsx     # ипотекийн тооцоолуур (хуудас + зарын баруун багана)
  PriceStatsClient.jsx       # /stats — дүүрэг/хорооны ₮/м² статистик
  Breadcrumb.jsx             # unegui.mn загварын замчилсан цэс (client)
  MyListingsClient.jsx, MapView.jsx (Leaflet)
lib/
  supabaseClient.js, queries.js, format.js, locationData.js
  mortgage.js                # аннуитетийн тооцоо (monthlyPayment/calcMortgage/rateScenarios)
  marketData.js              # гадны лавлагаа (Монголбанкны хүү) + REFERENCE_PRICE_PER_M2
  verifyMn.js                # verify.mn (MO SMS) REST клиент — зөвхөн сервер тал
  authServer.js              # Supabase Admin client + requestToken (HMAC) + хэрэглэгч үүсгэх
  authApi.js                 # клиент талаас /api/auth/* дуудах туслах
  breadcrumb.js              # breadcrumb-ийн мөрүүд + URL угсрах (buildListingBreadcrumb/buildHomeBreadcrumb)
supabase/migrations/0001_schema.sql, 0003_listing_details.sql, 0004_remove_listing_drafts.sql
scripts/seed-supabase.js, check-supabase.js, check-verify-mn.js
```

## Загвар (Tailwind CSS)

Төсөл нь **Next.js (React/JSX) + Tailwind CSS** дээр бүтсэн. Хуучин `public/css/style.css`
болон `app/overrides.css` бүрэн хасагдсан.

- `tailwind.config.js` — content path, өнгө (`primary`, `secondary`), сүүдэр, animation
- `postcss.config.mjs` — `tailwindcss` + `autoprefixer`
- `app/globals.css` — `@tailwind base/components/utilities` + `@layer components` дотор
  давтагддаг классууд (`btn`, `form-input`, `form-select`, `form-group`, `form-row`, `badge`, `spinner` …)
- Бүх layout нь компонентуудын JSX дотор **Tailwind utility классуудаар** бичигдсэн

### 🏛 LUXURY — «Sandstone» дулаан нейтрал (Фаз 1)

`tailwind.config.js` → `theme.extend.colors.gray` -ийг **бүрэн дарж бичсэн**.
Ингэснээр апп даяар **462 газар** (`bg-gray-50`, `border-gray-200`, `text-gray-500` …)
дулаан болсон — **нэг ч компонент засахгүйгээр**.

| Сүүдэр | Хуучин (хүйтэн) | Шинэ (Sandstone) | Хэрэглээ |
|---|---|---|---|
| `gray-50` | `#f9fafb` | **`#FAF8F5`** | Хуудасны дэвсгэр → крем цаас |
| `gray-100` | `#f3f4f6` | `#F4F1EA` | Зөөлөн дэвсгэр |
| `gray-200` | `#e5e7eb` | **`#E9E4D9`** | Хүрээ ×62 → элсэн |
| `gray-300` | `#d1d5db` | `#D8D0C0` | Хүрээ |
| `gray-400` | `#9ca3af` | `#B0A794` | Hint (зориуд бүдэг) |
| `gray-500` | `#6b7280` | **`#776F5E`** | Мета текст ×96 |
| `gray-600` | `#4b5563` | `#5D5747` | |
| `gray-700` | `#374151` | **`#454037`** | Үндсэн текст |
| `gray-800` | `#1f2937` | `#2E2A24` | Footer (бараан) |
| `gray-900` | `#111827` | **`#1B1815`** | Гарчиг + footer → бүлээн onyx |
| `gray-950` | `#030712` | `#12100E` | (хэрэглэгдээгүй ч бүрэн байх үүднээс) |

> 💡 **ЯАГААД 950-ыг ч бичсэн бэ:** Tailwind-ийн `extend` нь **нэгтгэдэг** тул
> зөвхөн 50–900 бичвэл анхдагч `gray-950` **хүйтэн хэвээр** үлдэж, ирээдүйд
> хэрэглэвэл холимог палитр үүсэх эрсдэлтэй.

#### КОНТРАСТ (WCAG AA = 4.5:1) — хэмжсэн утга

| | Карт (цагаан) | Хуудас (крем) | Өмнөх | Дүгнэлт |
|---|---|---|---|---|
| `gray-900` гарчиг | 17.68:1 | 16.67:1 | 17.74 | ✅ |
| `gray-700` үндсэн текст | 10.29:1 | 9.70:1 | 10.31 | ✅ |
| `gray-500` мета текст ×96 | 4.98:1 | 4.69:1 | **4.83** | ✅ **бага зэрэг САЙЖИРСАН** |
| `gray-400` hint ×44 | 2.39:1 | 2.25:1 | ~2.6 | ⚠️ зориуд бүдэг (de-emphasis) |

> ✅ Дулаан нейтрал нь контрастыг **хадгалж** (бараг бүгдэд сайжирсан), зөвхөн
> **өнгөний температур**-ыг сольсон.

#### 🔧 Хамт зассан алдаа — footer-ийн контраст

`AppProviders.jsx` → footer-ийн жижиг текст нь `bg-gray-900` дээр
`text-gray-500` байсан = **3.55:1** (AA-д хүрэхгүй; өмнө нь ч 3.67:1 байсан —
**анхнаасаа дутуу**). `text-gray-400` болгож **7.41:1** ✅ болгосон.

#### Дараагийн фаз (2) — акцентийн өнгө

Одоогоор `primary` (цэнхэр) ба `secondary` (ногоон) **хэвээр**. Люкс болгохын тулд
дараагийн алхамд палитр солино (warm нейтралтай нийцүүлж):

| Хувилбар | primary | secondary |
|---|---|---|
| **A) Midnight & Brass** ⭐ | `#16283C` шөнийн цэнхэр | `#9C7C3C` brass |
| B) Emerald Estate | `#0C3B2E` гүн марганц | `#A8873F` |
| C) Bordeaux Noir | `#3A1220` бордо | `#A8873F` |

Хамт солих шаардлагатай: `app/globals.css` дахь `.btn-primary` / `.btn-secondary`
градиентийн **hardcode hex** (12 газар) ба `tailwind.config.js` дахь 6 `rgba` гэрэлтэлт.



Бүх товч нь **нэг систем** (`.btn` + өнгөний хувилбар). `rounded-full` хэлбэр,
босоо градиент биет, 4 давхаргат сүүдэр:

```css
/* .btn (суурь)  → rounded-full, font-semibold, transition-all, disabled-д 55% */
.btn-primary   /* from #3b82f6 → to #1d4ed8  (цэнхэр) */
.btn-secondary /* from #10b981 → to #047857  (ногоон) */
.btn-danger    /* from #ef4444 → to #b91c1c  (улаан) */
.btn-outline   /* white → gray-50, саарлаас цагаан ирмэгтэй */
.btn-ghost     /* white/70, маш зөөлөн */
.btn-sm / .btn-lg
```

**Сүүдрийн загвар** (`tailwind.config.js` → `boxShadow`):

| Давхарга | Юу хийнэ |
|---|---|
| `inset 0 1px 0 rgba(255,255,255,.30)` | Дээд ирмэг дээр гэрэл туссан мэт → товойсон харагдана |
| `inset 0 -1px 0 rgba(0,0,0,.14)` | Доод ирмэг дээр бараан зураас → «зузаан» мэт |
| `0 1px 2px rgba(16,24,40,.12)` | Ойрын сүүдэр (товчийг газраас тусгаарлана) |
| `0 4px 12px -3px rgba(37,99,235,.55)` | **Товчны өнгөөрөө гэрэлтсэн** алсын сүүдэр |

```js
// tailwind.config.js
boxShadow: {
  btn: '…', 'btn-hover': '…', 'btn-active': '…',
  'btn-primary':   '…', 'btn-primary-hover':   '…', 'btn-primary-active':   '…',
  'btn-secondary': '…', 'btn-secondary-hover': '…', 'btn-secondary-active': '…',
  'btn-danger':    '…', 'btn-danger-hover':    '…', 'btn-danger-active':    '…',
  chip: '…',   // идэвхтэй сегмент-чип
}
```

**Төлөвүүд** — `enabled:`-ээр хязгаарласан (disabled товч хөдлөхгүй):

| Төлөв | Үр дүн |
|---|---|
| Хэвийн | Товойсон, сүүдэртэй |
| `enabled:hover` | `-translate-y-0.5` (дээш өргөгдөнө) + сүүдэр томорно |
| `enabled:active` | `translate-y-0` (дарагдна) + **дотогшоо** сүүдэр (inset) |
| `disabled` | 55% тунгалаг, сүүдэргүй, хөдөлгөөнгүй |

### Сегмент-контрол (`/my-listings` табууд + статистикийн хугацаа)

```css
.segmented             /* дугуй саарал контейнер */
.segmented-item        /* идэвхгүй сонголт */
.segmented-item-active /* идэвхтэй — цагаан «чип» + shadow-chip */
```

> ℹ️ `/my-listings` хуудасны **📋 Миний зарууд / 📈 Статистик** табууд болон
> статистикийн **1/3/7/30/Нийт** сонголт нь **ижил** сегмент стильтэй — нэг
> харагдац, ойлгомжтой.



## Зарын дэлгэрэнгүй хуудас (unegui.mn загвар)

`components/ListingDetailClient.jsx` нь unegui.mn-ийн зарын хуудастай ижил бүтэцтэй:

- Breadcrumb → гарчиг/байршил → gallery (тоологч `1 / 14`, thumbnails, ‹ › товч)
- **`<section data-component="AdvertFeaturesApp" class="mt-6">`** — шинж чанаруудыг
  `шошго: утга` хэлбэрээр 2 баганат хүснэгтээр харуулна (unegui.mn-тэй ижил)
- Баруун талд `sticky` холбоо барих карт: үнэ, «📞 Дугаар харах» товч, газрын зураг
- Жижиг дэлгэцэд нэг багана болж эвдэрнэ (`lg:grid-cols-[minmax(0,1fr)_350px]`)
- Гарчгийн доор **📍 Байршил (зүүн) · 📅 Нийтэлсэн (баруун)** — `justify-between`-ээр
  хоёр захад тусгаарлагдсан (өмнө нь «📍 … · 📅 …» гэж нэг мөрөнд наалдсан байв)

### Зарын карт (`ListingCard.jsx`)

Зүүн талд зураг, баруун талд мэдээлэл. Дээдээс доош:

```
₮280,000,000
🏢 Орон сууц
📍 Хангай дүүрэг 16-р байр, 5-р хороо, Баянгол, Улаанбаатар
🛏 3 өрөө   📐 75 м²   🏢 5 / 9 давхар   📅 2015
🕒 2 цагийн өмнө
────────────────────────────────────────────────────────────────────────────────────
👁 12                                                          🤍 5
```

- **📍 Хаяг** — байрны мэдээллийн (🛏 өрөө / 📐 м² / 🏢 давхар / 📅 он) **ӨМНӨ**
  (`lib/format.js` → `formatAddress()`)
- **🕒 Нийтэлсэн огноо** — байрны мэдээллийн **ДОР**, нөхцөлгүйгээр үргэлж харагдана
- ⚠️ `{нөхцөл && ( … )}` хаалтны дотор 2+ элемент зэрэгцвэл
  «Adjacent JSX elements» алдаа гардаг — тиймээс огноо нь `)}`-ийн **ГАДНА** байрлана
- Дэлгэрэнгүй хуудсанд: гарчгийн доор `📍 Байршил` (1-р мөр), түүний **ЯГ ДОР**
  `📅 Нийтэлсэн` (2-р мөр) — хоёулаа зүүн тийш, тусдаа block div-үүд
- Огноог карт дээр **🕒** (цаг) гэж тэмдэглэв — баригдсан он (📅) хоёр 📅 зөрөхөөс сэргийлсэн
- ⚠️ **`price_type`** («нийт» / «сард» / «м²») нь UI-д **хаана ч харагдахгүй** —
  карт, дэлгэрэнгүй хуудас, миний зарууд, газрын зургийн popup, Excel/PDF экспорт
  бүгдээс хассан. Зар нэмэх/засах форм (`AddListingModal`) дээр л сонгогдоно.
- Хаяг урт байвал `truncate` (нэг мөр) — картын өндөр `sm:h-[220px]` хэвээр хадгалагдана
- Доод блокт `max-sm:pr-20` — /favorites хуудсанд «Хасах» товч утсанд баруун доод
  буланд буудаг тул халхлахгүй байх зорилготой

### Зар нийтлэгчийн бусад зарууд — `/sellers/[id]`

Зарын дэлгэрэнгүй хуудасны **«👤 Зар нийтлэгч»** карт нь линк бөгөөд дарвал тухайн
хэрэглэгчийн **БҮХ зарууд** «🗂 Бүгд / 🏷️ Зарах / 🔑 Түрээслэх» табуудаар ЯЛГАГДАН харагдана:

- Карт дээр `📋 N зар нийтэлсэн · 🏷️ 12 · 🔑 5` гэсэн задаргаа харагдана
  (`lib/queries.js` → `fetchSellerCategoryCounts`)
- Хуудас: `app/sellers/[id]/page.jsx` + `components/SellerListingsClient.jsx` —
  avatar / нэр / утас / хот бүхий карт, Зарах·Түрээслэх тоо бүхий табууд, `ListingCard`-ийн grid
- `id` нь `listings.user_id` (uuid). `user_id` хоосон зар дээр карт линк болохгүй (энгийн харагдана)
- Нэр нь `profiles.name`-ээс, байхгүй бол `contact_name`-ээс авна
- `listings_select` RLS policy нь `using (true)` тул бусдын зарыг ч уншина



Хэрэглэгч хаана явж байгааг харуулах замчилсан цэс:

```
Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө
```

- **Дэлгэрэнгүй хуудас** (`/listings/[id]`) — `components/ListingDetailClient.jsx` дээр
  `buildListingBreadcrumb(listing)`-аар үүсгэнэ. Хамгийн сүүлийн элемент нь одоогийн хуудас (линк биш).
- **Нүүр хуудас** (`/`) — шүүлт сонгосон үед л харагдана
  (`buildHomeBreadcrumb({ category, propertyType, rooms })`).
- Линкүүд нь `/?category=sell&type=Орон+сууц&rooms=3` хэлбэртэй бөгөөд `HomeClient` нь
  `window.location.search`-ээс шүүлтээ уншдаг тул **хуваалцсан линк мөн адил ажиллана**.
  Шүүлт солиход URL автоматаар `router.replace`-ээр шинэчлэгдэнэ.
- Кодын цэг: `lib/breadcrumb.js`, `components/Breadcrumb.jsx`. Загвар нь Tailwind CSS
  utility классууд (`components/Breadcrumb.jsx` доторх `nav`).

## Орон сууцны нэмэлт талбарууд

`Орон сууц` төрөл сонгосон үед «Зар нэмэх» формат доорх талбарууд нэмэгдэнэ
(`components/AddListingModal.jsx`):

| Формын нэр | DB багана | Тайлбар |
|---|---|---|
| Ашиглалтанд орсон он | `build_year` (integer) | 1900–2100 |
| Барилгын нийт давхар | `total_floors` (integer) | |
| Тухайн байрны давхар | `floor` (integer) | |
| Тагт (1-4) | `balconies` (integer) | 1–4 сонголт |
| Гараж | `has_garage` (boolean) | Байгаа / Байхгүй |

Мөн `Оффис`, `Худалдаа, үйлчилгээний талбай` дээр давхрын талбарууд харагдана
(`lib/locationData.js` → `PROPERTY_TYPE_DEFS` доторх `apartment` / `floors` флаг).
Эдгээр утгууд нь дэлгэрэнгүй хуудасны «Шинж чанарууд», зарын карт болон «Миний зарууд»
хуудсанд харагдана.
