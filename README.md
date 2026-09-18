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
- Телефон дугаараар нэвтрэх (Supabase Auth — phone OTP)

## Үл хөдлөхийн төрлүүд (бүрдэл хэсгүүд)

Зарах / Түрээслэх категори хоёулаа доорх **8 төрөлтэй**. Өгөгдлийн санд үндсэн нэрийг
(`property_type`) хадгалж, дэлгэцэнд категориос хамаарсан нэрийг (`… зарна` / `… түрээслүүлнэ`)
харуулна. Тодорхойлолт нь `lib/locationData.js` → `PROPERTY_TYPE_DEFS`.

| value (DB) | Зарах | Түрээслэх | Нэмэлт талбар |
|---|---|---|---|
| Орон сууц | Орон сууц зарна | Орон сууц түрээслүүлнэ | ашиглалтанд орсон он, давхар, нийт давхар, тагт, гараж |
| Газар | Газар зарна | Газар түрээслүүлнэ | — |
| Худалдаа, үйлчилгээний талбай | … зарна | … түрээслүүлнэ | давхар, нийт давхар |
| АОС, хаус, зуслан, амралтын газар | … зарна | … түрээслүүлнэ | — |
| Үйлдвэр, агуулах, обьект | … зарна | … түрээслүүлнэ | — |
| Оффис | Оффис зарна | Оффис түрээслүүлнэ | давхар, нийт давхар |
| Хашаа байшин | Хашаа байшин зарна | Хашаа байшин түрээслүүлнэ | — |
| Гараж, контейнер, зөөврийн сууц | … зарна | … түрээслүүлнэ | — |

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
- Мөн шүүлтийн хэсэг дэх «Төрөл» dropdown ижил төлөвтойгоо синхрон ажиллана

## Хуучин → Шинэ зураглал

| Хуучин (Express)          | Шинэ (Next.js + Supabase)                |
|---------------------------|------------------------------------------|
| `server.js` REST API      | `lib/queries.js` + RLS (client-side)     |
| PostgreSQL (local)        | Supabase Postgres (RLS)                  |
| Cloudinary (зураг)        | Supabase Storage `listing-images`        |
| SQLite seed               | `scripts/seed-supabase.js`               |
| `index.html` + `app.js`   | React components (`components/`, `app/`) |
| Custom session            | Supabase Auth (phone OTP)                |

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
- `SUPABASE_SERVICE_ROLE_KEY` — зөвхөн seed-д (нууц, хэзээч frontend-д бүү ашигла)

3) Schema + RLS-ийг ажиллуулах (дарааллаар нь)
Dashboard → SQL Editor-т дараах файлуудын агуулгыг оруулан Run хийнэ
(эсвэл Supabase CLI: `supabase db push`):

| Дараалал | Файл | Юу нэмэгдэх вэ |
|---|---|---|
| 1 | `supabase/migrations/0001_schema.sql` | `profiles`, `listings`, RLS, `listing-images` bucket |
| 2 | `supabase/migrations/0002_listing_drafts.sql` | Facebook агентын queue (`listing_drafts`) |
| 3 | `supabase/migrations/0003_listing_details.sql` | **Орон сууцны нэмэлт талбарууд** (`build_year`, `floor`, `total_floors`, `balconies`, `has_garage`) + хуучин төрлийн нэрсийг шинэчилэх |

> `0003` ороогүй бол апп ажиллах боловч зар нэмэхэд «ашиглалтанд орсон он, давхар,
> тагт, гараж» хадгалагдахгүй (console-д анхааруулга гарна). Шалгах:
> `npm run check:supabase` — «listings-д орон сууцны нэмэлт багана байна» гэж гарах ёстой.

4) Storage bucket `listing-images` schema SQL-д автоматаар үүснэ (public).

5) Демо өгөгдөл оруулах
```bash
node scripts/seed-supabase.js
```
Демо хэрэглэгч: **+976 9911 2233**

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
`listings`/`listing_drafts`/`profiles` хүснэгтүүд болон `listing-images` bucket-ыг шалгана.

Хамгийн түгээмэл шалтгаан: **`.env.local`-д буруу/хуучирсан `NEXT_PUBLIC_SUPABASE_URL`**
(төсөл устсан эсвэл project ref буруу бичсэн). Supabase Dashboard →
Project Settings → Data API → Project URL-аа хуулж тавиад `npm run dev`-ээ дахин эхлүүлнэ.

## Facebook агент (review-queue pipeline)

Facebook группээс зар цуглуулж, **хүн баталгаажуулсны дараа л** сайт руу нийтлэдэг
агент багтсан. Урсгал:

```
Facebook групп
   ↓  (жинхэнэ скрейп эсвэл JSON экспорт)
listing_drafts (queue, status=pending)
   ↓  /admin/queue — хүн засварлаж баталгаажуулна
listings (нийтэд харагдах зар)
```

Аюулгүй байдлын үүднээс агент шууд нийтлэхгүй — `raw_text`-аас parse хийж draft болгоно.
Зөвхөн `✅ Нийтлэх` товчийг хүн дарсан тохиолдолд л зар жагсаалтад орно.

1) Schema-аа ажиллуулна (SQL Editor-т):
   `supabase/migrations/0002_listing_drafts.sql`

2) Queue-д демо зар оруулах (бодит FB-гүйгээр flow-г турших):
   ```bash
   node scripts/ingest-fb-demo.js
   ```
   Эсвэл жинхэнэ FB post-оо JSON файлаар оруулах:
   ```bash
   node scripts/ingest-from-json.js scripts/fb-dump.example.json
   ```
   JSON формат: `scripts/fb-dump.example.json`-ыг үзнэ үү.

3) `/admin/queue` (нэвтэрсэн хэрэглэгч, header → 🤖 Facebook агент) хуудсаар
   зарыг засварлаж баталгаажуулна. Нийтлэх үед зар нэвтэрсэн таны нэр дээр бүртгэгдэнэ.

`lib/fbParser.js` нь Монгол текстаас категори/төрөл/үнэ(сая, мянга)/өрөө/м²/дүүрэг/утас-ыг
автоматаар таних **best-effort** parse хийгдэг тул нийтлэхээс өмнө үр дүнг засаж болно.

> **Жинхэнэ Facebook скрейпинг:** FB нь нэвтрэлт, анти-бот бүхий тул групп post-ыг
> автоматаар татах нь сесс cookie / Graph API access token шаарддаг ба ToS-той зөрчилдөж
> болзошгүй. Тиймээс одоогийн pipeline нь ямар ч эх үүсвэрээс (JSON import) тэжээгдэхэд
> зориулагдсан. Жинхэнэ FB татах provider-ыг хожим холбоход `draftAgent.ingestRawPost()`
> интерфэйс бэлэн.

### n8n-ээр цаг тутам автоматаар оруулах (тухайн группээс)

`n8n/zar-fb-agent.workflow.json` — import хийгдэх workflow. Урсгал:

```
Schedule (1 цаг тутам)
   → Facebook Graph API: GET /{FB_GROUP_ID}/feed
   → Code: сүүлийн 1 цагт орсон постыг шүүж ingest формат болгох
   → POST /api/agent/ingest  (манай апп-д) → queue (listing_drafts)
```

Тохиргоо (n8n-ийн environment хувьсагч):
- `FB_GROUP_ID` — группын ID
- `FB_ACCESS_TOKEN` — Graph API access token (group feed уншихад **группын гишүүн** байх хэрэгтэй)
- `AGENT_INGEST_URL` — `https://<таны_host>/api/agent/ingest`
- `AGENT_INGEST_KEY` — апп-ын `.env.local`-ийн `AGENT_INGEST_KEY`-тэй ижил

Апп-д: `.env.local`-д `AGENT_INGEST_KEY=<нууц>` нэмээд дахин ачаална. Ингэснээр
`/api/agent/ingest` (x-agent-key header-тэй POST) идэвхжинэ.

> n8n node-ын typeVersion дээр ажиллаж буй n8n хувилбараас хамаарч бага зэрэг
> таарч тохируулах шаардлага гарч болзошгүй. Import амжилтгүй бол README-ийн
> 4 node (Schedule → HTTP Request → Code → HTTP Request) зургийг гараар давтахад хангалттай.

## Нэвтрэлтийн тухай анхаарал

Энэ апп Supabase-ийн **phone OTP** ашигладаг. Код хүлээн авахын тулд Supabase Auth дээр
**SMS provider (Twilio г.м.)** тохируулсан байх шаардлагатай. Тухайн дугаарт код
ирэхгүй бол:

- Supabase Dashboard → Authentication → SMS provider → тохируулах, эсвэл
- Хөгжүүлэлтэд зориулж Email OTP руу шилжүүлэх эсвэл mock хийх.

## Төслийн бүтэц

```
app/
  layout.jsx, page.jsx, globals.css   # globals.css = Tailwind суурь + @layer components
  listings/[id]/page.jsx     # зарын дэлгэрэнгүй
  my-listings/page.jsx       # миний зарууд
  not-found.jsx
components/
  AppProviders.jsx           # auth/toast/modal state + header/footer
  AuthModal.jsx, AddListingModal.jsx
  HomeClient.jsx, ListingCard.jsx, ListingDetailClient.jsx
  Breadcrumb.jsx             # unegui.mn загварын замчилсан цэс (client)
  MyListingsClient.jsx, MapView.jsx (Leaflet)
lib/
  supabaseClient.js, queries.js, format.js, locationData.js
  breadcrumb.js              # breadcrumb-ийн мөрүүд + URL угсрах (buildListingBreadcrumb/buildHomeBreadcrumb)
supabase/migrations/0001_schema.sql, 0002_listing_drafts.sql, 0003_listing_details.sql
scripts/seed-supabase.js
```

## Загвар (Tailwind CSS)

Төсөл нь **Next.js (React/JSX) + Tailwind CSS** дээр бүтсэн. Хуучин `public/css/style.css`
болон `app/overrides.css` бүрэн хасагдсан.

- `tailwind.config.js` — content path, өнгө (`primary`, `secondary`), сүүдэр, animation
- `postcss.config.mjs` — `tailwindcss` + `autoprefixer`
- `app/globals.css` — `@tailwind base/components/utilities` + `@layer components` дотор
  давтагддаг классууд (`btn`, `form-input`, `form-select`, `form-group`, `form-row`, `badge`, `spinner` …)
- Бүх layout нь компонентуудын JSX дотор **Tailwind utility классуудаар** бичигдсэн

## Зарын дэлгэрэнгүй хуудас (unegui.mn загвар)

`components/ListingDetailClient.jsx` нь unegui.mn-ийн зарын хуудастай ижил бүтэцтэй:

- Breadcrumb → гарчиг/байршил → gallery (тоологч `1 / 14`, thumbnails, ‹ › товч)
- **`<section data-component="AdvertFeaturesApp" class="mt-6">`** — шинж чанаруудыг
  `шошго: утга` хэлбэрээр 2 баганат хүснэгтээр харуулна (unegui.mn-тэй ижил)
- Баруун талд `sticky` холбоо барих карт: үнэ, «📞 Дугаар харах» товч, газрын зураг
- Жижиг дэлгэцэд нэг багана болж эвдэрнэ (`lg:grid-cols-[minmax(0,1fr)_350px]`)



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
(`components/AddListingModal.jsx`, `/admin/queue` дээр `components/QueueDraftItem.jsx`):

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
