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
   → POST /api/auth/register/complete   → Supabase Admin: createUser(phone, password, phone_confirm: true)
   → signInWithPassword(утас, нууц үг)  → нэвтэрнэ
```

Файл | Үүрэг
---|---
`lib/verifyMn.js` | verify.mn REST клиент (сервер тал, `VERIFY_MN_API_KEY`)
`lib/authServer.js` | Supabase Admin client, `requestToken` (HMAC), хэрэглэгч үүсгэх, phone provider шалгалт
`lib/authApi.js` | Клиент талаас `/api/auth/*` дуудах туслах
`components/AuthModal.jsx` | Нэвтрэх / Бүртгүүлэх / SMS баталгаажуулах UI (3 секундын polling)
`app/api/auth/register/{start,status,complete}/route.js` | Бүртгэлийн API
`app/api/auth/verify/callback/route.js` | verify.mn-ийн "шалга" дохио (шууд 200 буцаана)
`scripts/check-verify-mn.js` | **Бодит** verify.mn-ээр гараар турших: `npm run check:verify -- 99112233`
`scripts/test-verify-mn.js` | **Offline** автомат тест (mock verify.mn, 0₮): `npm run test:verify`

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
- Phone provider идэвхгүй бол мөн `start` дээр шалгаж, тодорхой мессеж өгнө
  (`PHONE_PROVIDER_DISABLED`).

### Заавал хийх 2 тохиргоо

1. **Verify.MN API KEY** — https://verify.mn → Developer Console → API KEY-г
   `.env.local`-ийн `VERIFY_MN_API_KEY=` -д тавина.
   > Нэг SMS нь **хэрэглэгчид 150₮** төлбөртэй (таны дансанд 40₮ орлого очно).
   > Баталгаажмагц UI автоматаар polling-оо зогсооно — дэмий SMS зарцуулагдахгүй.
2. **Supabase → утасны нэвтрэлтийг идэвхжүүлэх** —
   Dashboard → Authentication → Providers → **Phone → Enable** (Save).
   SMS provider (Twilio) тохируулах шаардлагагүй — SMS-ийг verify.mn илгээдэг,
   Supabase зөвхөн хэрэглэгчийг хадгална.

   > ⚠️ Идэвхгүй бол бүртгэл эхлэхэд шууд `PHONE_PROVIDER_DISABLED` гарч,
   > нэвтрэх үед `Phone logins are disabled` (HTTP 422) гэж буцаана.
   > Шалгах: `curl <SUPABASE_URL>/auth/v1/settings` → `"external": {"phone": true}`

3. Турших (нэг SMS зарцуулагдана): `npm run check:verify -- 99112233`

### Localhost дээрх онцлог

verify.mn нь зөвхөн **public host** руу callback хийж чадна. Тиймээс browser нь
`/api/auth/register/status`-ыг **3 секунд тутам** дуудаж өөрөө шалгадаг (polling) —
production дээр ч энэ нь үндсэн механизм. `VERIFY_MN_CALLBACK_URL`-ийг зөвхөн
production дээр тохируулж болно (сонголтоор, шуурхай болгоно).

### Нууц үгээ мартвал?

"Нууц үг сэргээх" урсгал одоогоор байхгүй. Дугаар нь бүртгэлтэй тул дахин
бүртгүүлэхэд `PHONE_EXISTS` гарна — хэрэгтэй бол Supabase Admin API-аар
`admin.updateUserById(id, { password })` хийх endpoint нэмнэ.

## Төслийн бүтэц

```
app/
  layout.jsx, page.jsx, globals.css   # globals.css = Tailwind суурь + @layer components
  listings/[id]/page.jsx     # зарын дэлгэрэнгүй
  my-listings/page.jsx       # миний зарууд
  api/auth/register/{start,status,complete}/route.js   # бүртгэлийн API (SMS баталгаажуулалт)
  api/auth/verify/callback/route.js                    # verify.mn-ийн "шалга" дохио
  not-found.jsx
components/
  AppProviders.jsx           # auth/toast/modal state + header/footer
  AuthModal.jsx              # Нэвтрэх / Бүртгүүлэх / SMS баталгаажуулалт (3 сек polling)
  AddListingModal.jsx
  HomeClient.jsx, ListingCard.jsx, ListingDetailClient.jsx
  Breadcrumb.jsx             # unegui.mn загварын замчилсан цэс (client)
  MyListingsClient.jsx, MapView.jsx (Leaflet)
lib/
  supabaseClient.js, queries.js, format.js, locationData.js
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
