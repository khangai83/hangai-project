# ☁️ Cloudflare R2 руу зураг шилжүүлэх — бүрэн заавар

> **Юу шилжих вэ:** зөвхөн **зургийн файлууд** (`listing-images`, `avatars`).
> **Хөндөгдөхгүй:** Supabase Postgres (бүх хүснэгт), Auth (нэвтрэлт, бүртгэл,
> SMS), RLS, `listings.images[]` ба `profiles.avatar_url` багана (доторх URL
> л солигдоно).
>
> **Яагаад R2:** Supabase Free = 1 GB storage + **5 GB/сар egress** (зураг нь гол
> зарцуулалт → ~1,200 зар л багтана). Cloudflare R2 = **10 GB storage**,
> **egress үнэгүй** ✓

---

## 0. Яаж ажилладаг вэ (бүдүүвч)

```
Browser                      Манай Next.js API            Cloudflare R2
   │  ① compressImage() (1600px, ~250KB)
   │
   ├──② POST /api/storage/presign ──▶ токен баталж, түлхүүр үүсгэнэ
   │      (Authorization: Bearer …)   `listing-images/<uid>/<ts>-<r>.jpg`
   │  ②' ◀── { uploadUrl (10 мин), publicUrl }
   │
   ├──③ PUT <uploadUrl>  (файл ШУУД R2 руу — Vercel-ээр ДАМЖИХГҮЙ!) ──▶ 🪣
   │
   └──④ DB: listings.images = [ …publicUrl… ]

Устгах:  POST /api/storage/delete  (түлхүүрийн эхний фолдер = uid гэж СЕРВЕР шалгана)
```

**Аюулгүй байдал:** хуучин хамгаалалт нь Supabase-ийн Storage RLS
(`(storage.foldername(name))[1] = auth.uid()::text`) байв. R2 нь RLS-гүй тул
**яг тэр дүрмийг** `app/api/storage/{presign,delete}` хүсэлт бүрд хэрэгжүүлнэ:
түлхүүрийн **эхний фолдер нь ЗААВАЛ хэрэглэгчийн id** байх ба зөвхөн тэр
замд гарын үсэг зурна ✓

---

## 1. Bucket үүсгэх (2 минут)

1. <https://dash.cloudflare.com> → **Storage & databases** → **R2** → *Create bucket*
2. Нэр: `my-zar` (юу ч байж болно — ⚠️ `R2_BUCKET`-д **ЯГ ТЭР НЭРИЙГ** бичнэ)
   → Location: *Automatic* → **Create**

> Нэг bucket дотор хоёр фолдер байна: `listing-images/…`, `avatars/…`
> (Supabase-ийн хоёр bucket-ыг нэг дор нэгтгэсэн — хямд, энгийн).
>
> ℹ️ Dashboard дээр фолдер үүсгэвэл `zar-media/` гэх мэт **0 B объект** үлддэг
> (аль хэдийн `my-zar` дотор нэг байна) — зүгээр л фолдерын тэмдэглэгээ, сандарч
> болохгүй; хэрэггүй бол *Objects* → `…` → Delete ✓ (манай код `listing-images/`,
> `avatars/` гэсэн фолдеруудыг АВТОМАТААР үүсгэдэг — гараар үүсгэх шаардлагагүй).

---

## 2. API token (2 минут)

**R2 → API → Manage API tokens → Create API token**
(Cloudflare-ийн шинэ UI: **Storage & databases → R2 → API** хэсэг)

| Талбар | Утга |
|---|---|
| Token name | `zarlaa-web` |
| Permissions | **Object Read & Write** |
| Specify bucket | `my-zar` (зөвхөн энэ bucket) |

Үүсгэсний дараа гарч ирэх утгуудыг хуулна (⚠️ **жагсаалтыг дахин харах
боломжгүй** — тэр даруй `.env.local`-д хийгээрэй):

| Cloudflare дээр | `.env.local` |
|---|---|
| Access Key ID | `R2_ACCESS_KEY_ID` |
| Secret Access Key | `R2_SECRET_ACCESS_KEY` |
| (Account ID — R2-ийн баруун дээд буланд) | `R2_ACCOUNT_ID` |

### ℹ️ «S3 API endpoint» хаана бөглөх вэ? → **ХААНА Ч БИШ, хэрэггүй** ✓

`endpoint` нь `R2_ACCOUNT_ID`-аас **автоматаар** үүснэ
(`lib/r2.mjs → r2Config()`):

```
https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com
```

- Харахыг хүсвэл: **Cloudflare → R2 → `zar-media` (bucket) → Settings → S3 API**
  → *S3 endpoint* — яг энэ хаяг байна (Account ID нь тухайн хуудасны URL болон
  R2-ийн баруун дээд буланд харагдана).
- Шалгах: `npm run check:r2` нь `bucket: … endpoint: … (R2_ACCOUNT_ID-аас автоматаар)`
  гэж хэвлэнэ ✓
- `region` нь үргэлж `auto` (R2-ийн шаардлага) — мөн бөглөхгүй.
- Зөвхөн **EU jurisdiction** bucket эсвэл S3-нийцтэй прокси ашиглаж байгаа үед л
  `R2_ENDPOINT`-оор дарж бичнэ (сонголтоор): `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`

### 🔎 «Тэгэхээр S3 API огт ашиглагдахгүй юм уу?» → ҮГҮЙ, БҮХ үйлдэл үүгээр явдаг ✓

| Хэрэглээ | `lib/r2.mjs` функц | S3 команд |
|---|---|---|
| `POST /api/storage/presign` | `presignPut()` | `GetSignedUrl(PutObject)` → browser шууд PUT |
| `POST /api/storage/delete` | `deleteR2Keys()` | `DeleteObjects` |
| `npm run storage:migrate` | `putObject()` | `PutObject` |
| `npm run check:r2` | `headBucket()` · `listR2Keys()` | `HeadBucket` · `ListObjectsV2` |

Эдгээр нь БҮГД нэг `S3Client` → `cfg.endpoint` (автомат) руу явдаг.

> ⚠️ «S3 API» бол R2-ийн **үйлчилгээ (протокол)** — дашбоардын Settings дээрх
> «S3 API» хэсэг нь **зөвхөн мэдээлэл** (endpoint + token удирдах холбоос).
> Тэнд **асаах/тохируулах/бөглөх зүйл БАЙХГҮЙ** ✓ (энэ нь автоматаар үргэлж
> идэвхтэй, зөвхөн token-оор хандана).

---

## 3. Нийтийн домэйн (`R2_PUBLIC_BASE`) — хэрхэн авах вэ

**Cloudflare → Storage & databases → R2 → `<bucket>` → Settings** — доош гүйлгээд
**Public Development URL** ба **Custom Domains** хоёр хэсэг байна:

| | Зам (дарж очно) | Үр дүн | Хэзээ |
|---|---|---|---|
| ⚠️ **r2.dev** | *Public Development URL* → **Enable** → цонхонд `allow` гэж бичээд **Allow** | `Public Bucket URL` = `https://pub-1a2b3c.r2.dev` | Зөвхөн ТУРШИЛТАД (хурдны хязгаартай, WAF/cache ажиллахгүй) |
| ✅ **Custom domain** | *Custom Domains* → **Add**/**Connect Domain** → ж: `img.zarlaa.mn` | `img.zarlaa.mn` (Cloudflare DNS бичлэгийг өөрөө нэмнэ) | **Production (санал болгож байна)** |

- Асаасны дараа «**Public URL Access: Allowed**» гэж харагдана ✓
- ⚠️ `r2.dev` рүү CNAME бичлэг хийхийг Cloudflare **дэмждэггүй** — production-д
  өөрийн домэйн заавал холбоно.
- ⚠️ **Зам/төгсгөлийн `/`-г ХАСАЖ бичнэ:** зөв нь `https://img.zarlaa.mn`,
  буруу нь `https://img.zarlaa.mn/` ✗
- Дараа нь `.env.local` → `R2_PUBLIC_BASE=<тэр хаяг>` ба **`npm run check:r2`**
  (энэ нь домэйныг HEAD хүсэлтээр БОДИТООР шалгана: `404 = ✅ зөв хариулж байна`,
  `403 = ❌ bucket нь public биш`) ✓
- ℹ️ `R2_PUBLIC_BASE` нь зөвхөн **уншиж харуулах** URL угсарна
  (`<R2_PUBLIC_BASE>/<түлхүүр>`); S3 API-д НӨЛӨӨЛӨХГҮЙ.

### 🕓 Домэйн ХАРААХАН аваагүй бол (2026-10-02-ны бодит байдал)

`zarlaa.mn` нь **хараахан худалдаж аваагүй** (DNS-д resolve болохгүй) тул
**одоо `r2.dev`-ээр ажиллаж байна** — энэ нь БҮРЭН хэвийн ✓ Upload, нийтийн
URL, устгалт бүгд ажиллана (`npm run check:r2` → бүгд ✅).

- ⚠️ Ганц хязгаарлалт: `r2.dev` бол **туршилтын** домэйн — хурдны хязгаартай,
  WAF/cache/аналитик ажиллахгүй, Cloudflare үүнийг хүссэн үедээ унтрааж болно
- ✅ Тиймээс **нийтэд нээхээс өмнө** домэйн авч холбох нь зүйтэй (доорхи checklist)
- 👍 Одоо DB-д R2 URL **0** байгаа нь давуу тал: домэйн холбоход хуучин URL
  шинэчлэх ажил бараг гарахгүй (гарсан ч `storage:rebase` л хангалттай ✓)
- ℹ️ §4-ийн CORS-д `https://zarlaa.mn`, `https://www.zarlaa.mn` **аль хэдийн
  бичигдсэн** байгаа тул домэйн авмагц нэмэлт ажил бараг байхгүй ✓

**Домэйн авсны дараах checklist:**

1. Домэйнаа **Cloudflare-д** нэмээд nameserver-ийг нь заана (эсвэл Cloudflare-аас
   шууд авна) — R2-ийн custom domain нь Cloudflare-ийн zone шаарддаг
2. Сайтаа тэр домэйн рүү заана (Vercel → Domains) ⚠️ **фронтын домэйн солигдвол
   §4-ийн CORS-д ШИНЭ домэйныг ЗААВАЛ нэмнэ** (`npm run check:r2 -- --origin …`)
3. R2 → `my-zar` → Settings → **Custom Domains → Add** → `img.<домэйн>` (эсвэл
   `media.<домэйн>`) — Cloudflare DNS бичлэгийг өөрөө нэмнэ
4. `.env.local` ба Vercel (production/preview/development) →
   `R2_PUBLIC_BASE=https://img.<домэйн>` (төгсгөлийн `/` БИШ)
5. `npm run check:r2` (домэйн + CORS ✅) → `npm run deploy:vercel`
6. **`npm run storage:rebase -- --apply`** ← DB-д бичигдсэн хуучин (r2.dev)
   URL-уудыг шинэ домэйн рүү шилжүүлнэ (доорхи хэсэг)

### 🔁 Домэйныг сольсны ДАРАА: `npm run storage:rebase` (⚠️ ЗААВАЛ)

Зургийн URL нь DB-д **бичигдэж хадгалагддаг** (`listings.images[]`,
`profiles.avatar_url`) тул `R2_PUBLIC_BASE`-ыг сольсон тэр мөчөөс **хуучин
бичигдсэн URL-ууд хуучин домэйн дээрээ үлддэг** ✗ → `r2.dev`-ийг унтраавал
(`R2_PUBLIC_BASE = r2.dev` байхад солиход) **тэр зурагнууд нурна**.

```bash
npm run storage:rebase                         # 🔍 DRY-RUN — ямар домэйн, хэдэн URL вэ
npm run storage:rebase -- --apply               # ✅ бүх R2 URL-ыг R2_PUBLIC_BASE рүү шинэчилнэ
npm run storage:rebase -- --apply --from https://pub-1a2b3c.r2.dev
npm run storage:rebase -- --apply --to https://img.zarlaa.mn   # R2_PUBLIC_BASE-ыг орхиж заана
```

| Флаг | Утга |
|---|---|
| `--apply` | Бичнэ (анхдагч нь DRY-RUN — юу ч бичихгүй ✓) |
| `--from <домэйн>` | Зөвхөн ТЭР домэйны URL-уудыг солино (анхдагч: олдсон БҮХ R2 URL) |
| `--to <домэйн>` | Шинэ домэйн (анхдагч: `R2_PUBLIC_BASE`) |

- ⚠️ **Файл, түлхүүр ХӨНДӨГДӨХГҮЙ** — зөвхөн DB-ийн URL-ийн угтвар солигдоно
  (R2/Supabase дээрх объект хэвээр ✓); буцаах боломжтой:
  `--from <шинэ> --to <хуучин> --apply`
- ✅ **Supabase-ийн хуучин URL-ууд хөндөгдөхгүй** (hybrid горим хэвээр) · youtube
  холбоос, демо placeholder зэрэг storage-ийн бүтэцгүй утга ч хэвээр ✓
- 🔁 Дахин ажиллуулбал «Хуучин домэйнтой URL олдсонгүй» гэж хэлнэ (idempotent ✓)
- 📌 **Хамгийн тохиромжтой мөч:** DB-д R2 URL бага байх үед (одоо 0) — тиймээс
  custom domain-ыг **аль болох эрт** холбох нь дээр.

---

## 4. CORS (ЗААВАЛ — эс бөгөөс browser-ээс upload ХИЙГДЭХГҮЙ ✗)

**Bucket → Settings → CORS Policy → Add** (дарж очно: Cloudflare → Storage &
databases → R2 → `<bucket>` → **Settings** → «CORS Policy» → **Add**) — JSON-оо
буулгаад **Save**.

⚠️ Presigned PUT нь гарын үсгээр баталгаажсан ч **browser CORS-гүй бол хүсэлт
явуулахгүй** (Cloudflare-ийн docs: «you still need to configure CORS when making
requests from a browser») ✗
⚠️ Хадгалсны дараа дүрэм тархахад **30 секунд хүртэл** хугацаа орж болно.

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://192.168.1.2:3000",
      "https://hangai-project.vercel.app",
      "https://zarlaa.mn",
      "https://www.zarlaa.mn"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Аль домэйныг нэмэх вэ? (⚠️ ЗӨВХӨН САЙТЫН домэйн — R2-ийн домэйн БИШ)

| Origin | Энэ юу вэ |
|---|---|
| `http://localhost:3000` | локал хөгжүүлэлт (`npm run dev`) |
| `http://192.168.1.2:3000` | ⚠️ **утаснаас LAN-аар** шалгах үед — Mac-ийн IP (dev server нь `Network: http://…:3000` гэж өөрөө хэвлэнэ). DHCP-ээр IP солигдвол **шинэ хаягаа нэмнэ** (`ifconfig` → `inet …`); порт дотор `*` болохгүй тул порт бүрийг тус тусад нь жагсаана |
| `https://hangai-project.vercel.app` | **Vercel-ийн хаяг** — ⚠️ төгсгөлийн `/` БЕЗ (`…app/` ✗) |
| `https://zarlaa.mn` | өөрийн домэйн (Vercel дээр холбосон үед) |
| `https://www.zarlaa.mn` | `www`-тэй хувилбар — тусдаа БИЧНЭ (автомат биш!) |
| `https://hangai-project-*.vercel.app` | *(сонголтоор)* Vercel-ийн **preview** deploy-ууд — `*` нь 1 ширхэг, цэг дамжина |
| `http://localhost:3001` | өөр порт → **ТУС ТУСД нь** (порт дотор `*` БОЛОХГҮЙ ✗) |

```bash
# Шалгах (нэгийг эсвэл хэдийг ч зааж болно):
npm run check:r2 -- --origin https://hangai-project.vercel.app
npm run check:r2 -- --origin http://localhost:3000 --origin https://zarlaa.mn
npm run check:r2 -- --origin http://192.168.1.2:3000                # 📱 утаснаас LAN-аар
R2_CORS_ORIGIN=https://a.mn,https://b.mn npm run check:r2     # ⚠️ `*` байвал хашилтанд: 'https://x-*.vercel.app'
```
→ Скрипт домэйн **тус бүрээр** preflight (OPTIONS, PUT + content-type) хийж, дутуу
байвал Cloudflare-д **буулгах JSON-ыг шууд хэвлэнэ** ✓

> ⚠️ `AllowedMethods`-д **PUT** заавал байх ёстой (presigned PUT-ийг browser
> шууд хийдэг). `AllowedHeaders`-д **content-type** заавал (гарын үсэгт орсон).
> ⚠️ `AllowedOrigins` нь **`scheme://host[:port]` ЗӨВХӨН** — зам (`/`) БИШ,
> төгсгөлийн `/` БИШ (Cloudflare-ийн дүрэм: «Invalid AllowedOrigins value:
> `https://static.example.com/`» — ийм утга ҮЙЛЧИЛЭХГҮЙ ✗). Wildcard нь
> хамгийн ихдээ **нэг** `*` бөгөөд **цэг дамжина** (`https://*.zarlaa.mn` →
> `a.zarlaa.mn`, `a.b.zarlaa.mn` ✓, харин `zarlaa.mn` ✗). **Порт дотор `*`
> болохгүй** — localhost-ийн порт бүрийг ТУС ТУСД нь жагсаана.
> ⚠️ Дүрэм **хар** байсан ч тархахад 30 секунд хүртэл хугацаа орж болно.

### 🛠 Dashboard-гүйгээр: CORS-ыг S3 API-аар бичих (2026-10-02-нд БАТАЛСАН ✓)

R2 нь **`PutBucketCors` / `GetBucketCors` / `DeleteBucketCors`-ыг S3 API-аар
дэмждэг** → `.env.local`-ийн S3 түлхүүрээр CORS-ыг **кодоос** тохируулж болно
(dashboard шаардлагагүй):

```js
import { PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';
import { r2Client, r2Config } from './lib/r2.mjs';

await r2Client().send(new PutBucketCorsCommand({
  Bucket: r2Config().bucket,
  CORSConfiguration: { CORSRules: [{
    AllowedOrigins: ['http://localhost:3000', 'http://192.168.1.2:3000', 'https://hangai-project.vercel.app', 'https://zarlaa.mn', 'https://www.zarlaa.mn'],
    AllowedMethods: ['PUT', 'GET', 'HEAD'],
    AllowedHeaders: ['content-type'],
    ExposeHeaders: ['etag'],
    MaxAgeSeconds: 3600,
  }] },
}));
// Одоогийнхыг харах: await r2Client().send(new GetBucketCorsCommand({ Bucket: r2Config().bucket }))
```

⚠️ `PutBucketCors` нь дүрмүүдийг **БҮХЭЛД НЬ ДАРЖ БИЧНЭ** — хуучин домэйнуудаа
жагсаалтад оруулахаа мартуузай ✗ (эс бөгөөс тэдгээрээс upload зогсоно).

### 🐛 БОДИТ тохиолдол (2026-10-02): төгсгөлийн `/` production-ыг эвдсэн

Cloudflare-д `https://hangai-project.vercel.app/` (⚠️ **`/`-ТЭЙ**) бичигдсэн байв →
preflight нь **`HTTP 403`**, `access-control-allow-origin` **БАЙХГҮЙ** ✗. Vercel дээр
R2 env 5/5 байсан тул `presign` **200 · `backend: r2`** болж, PUT-ыг browser
блоклосон ⇒ **LIVE сайт дээр зураг оруулах ЭВДЭРХИЙ** байв. ⚠️ Анхаар: Supabase руу
буцах нөөц зам нь **ЗӨВХӨН `R2_NOT_CONFIGURED` (503) үед** ажилладаг тул энэ
тохиолдолд ТУСЛАХГҮЙ ✗. `/`-ийг хасаж дээрх `PutBucketCors`-оор дахин бичсэний дараа
3 домэйн **БҮГД ✅** болов (`npm run check:r2 -- --origin …`).
Бодит e2e баталгаа: presign **200** → PUT → R2 **200** (`ACAO` зөв) → `publicUrl` GET
**200** (хэмжээ/`content-type` зөв) ✓

### 🐛 БОДИТ тохиолдол (2026-10-05): 📱 утаснаас **LAN IP**-аар нээхэд CORS дутуу

Хэрэглэгч утсаараа форм бөглөж зураг оруулах үед «**Зургийг R2 руу илгээж
чадсангүй … CORS Policy тохируулаагүй … [Load failed]**» гэсэн мессеж гарчээ.
Оношлогоо (`npm run check:r2 -- --origin …`, домэйн тус бүрээр):

| Origin | Дүн |
|---|---|
| `http://localhost:3000` · `https://hangai-project.vercel.app` · `https://zarlaa.mn` · `https://www.zarlaa.mn` | ✅ (production хэвийн) |
| **`http://192.168.1.2:3000`** (Mac-ийн LAN IP — утаснаас нээсэн хаяг) | ❌ **CORS ДУТУУ** ← ШАЛТГААН |

⚠️ Хичээл: `localhost` нь **утасны хувьд ч, бусад төхөөрөмжийн хувьд ч**
`localhost` БИШ — өөрөө өөрөө рүү заана. 📱 утаснаас dev server-т орохдоо
`Network: http://192.168.1.2:3000` (эсвэл `.local` нэр) хаягийг ашигладаг тул
**тэр origin нь ЗААВАЛ `AllowedOrigins`-д байх ёстой** ✗ Байхгүй бол preflight
(`OPTIONS`) нь `403 · ACAO байхгүй` болж, browser fetch-ийг огт явуулахгүй →
`putToR2()`-ийн `catch` салбар ажиллаж, хэрэглэгчид зөвхөн
«**Load failed**» (Safari/iOS; Chrome: «Failed to fetch») харагдана ✓

⚠️ Анхаар: `presign` нь **ӨӨР домэйн дээр** (манай Next.js API) явдаг тул
тэр нь **200 · `backend: r2`** гэж амжилттай буцаана — өөрөөр хэлбэл алдаа нь
**зөвхөн R2-руу чиглэсэн PUT** дээр гарна (сервер талдаа ямар ч лог үлдэхгүй!).
Нөөц Supabase зам нь **зөвхөн 503 `R2_NOT_CONFIGURED`** үед ажилладаг тул энд
туслахгүй ✗ — заавал CORS-ыг засна.

Засвар + баталгаа (2026-10-05, `PutBucketCors`-оор; дээрх 5 origin бүгд ✅):

```bash
npm run check:r2 -- --origin http://localhost:3000 --origin http://192.168.1.2:3000 \
  --origin https://hangai-project.vercel.app --origin https://zarlaa.mn --origin https://www.zarlaa.mn
# → preflight 204 · ACAO = тухайн origin ✓  |  PUT 200 → publicUrl GET 200 → устгав 404 ✓
```

---

## 5. `.env.local` (5 мөр)

```bash
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET=my-zar
#          ↑ ЯГ Cloudflare дээрх bucket-ийн нэр (мөрөн доторх зай/шинэ мөр БИШ)
R2_PUBLIC_BASE=https://img.zarlaa.mn
#          ↑ §3-ын дагуу авна: Settings → Public Development URL (r2.dev, туршилт)
#            эсвэл Custom Domains (img.zarlaa.mn, production) — төгсгөлд нь `/` БИШ ✓
```

> ⚠️ **5-ыг нь БҮРЭН бөглөнө.** `R2_PUBLIC_BASE` (нийтийн домэйн) дутуу бол upload
> нь `503 R2_NOT_CONFIGURED` болж, зураг **хуучин Supabase Storage руу буцна** ✓
> (эс бөгөөс DB-д «https://R2_PUBLIC_BASE-тохируулаагүй/…» гэсэн ХОГ URL
> бичигдэж, зураг ХЭЗЭЭ Ч харагдахгүй болно ✗ — сервер талд
> `isR2UploadReady()` үүнийг сэргийлнэ). `npm run storage:migrate` ч домэйнгүй
> бол DRY-RUN дээр ч **эхлэхээс татгалзана** ✓

⚠️ **Эдгээрийг Vercel дээр ч тавих ёстой:**
`npm run deploy:vercel` (энэ нь 5 R2 утгыг автоматаар Vercel-д тавьж, шинэ
deploy эхлүүлнэ) — эсвэл Vercel → Settings → Environment Variables гараар.

---

## 6. Шалгах

```bash
npm run check:r2        # env ✅ · bucket ✅ · объект ✅ · домэйн ✅ · CORS ✅
```

Бүгд ✅ болмогц **шинэ** зураг автоматаар R2 руу хадгалагдана ✓
(Сайт дээр зар нэмээд зургийг нь шалгана уу.)

---

## 7. Хуучин зургуудыг шилжүүлэх

```bash
npm run storage:migrate                    # 🔍 DRY-RUN — юу ч бичихгүй, тоог л хэлнэ
npm run storage:migrate -- --apply         # ✅ хуулж, DB-ийн URL солино
```

Юу хийдэг вэ:

1. Supabase Storage-ийн `listing-images/`, `avatars/`-ийг бүхэлд нь уншина
2. Объект бүрийг R2 руу **яг ижил түлхүүрээр** хуулна (зам хэвээр → буцаах боломжтой)
3. `listings.images[]` ба `profiles.avatar_url`-ыг шинэ домэйн рүү солино
4. Амжилттай хуулагдсаны дараа хуучин объектыг Supabase-ээс устгана
   (үлдээхийг хүсвэл `--keep-old`)

Нэмэлт сонголтууд:

| Флаг | Утга |
|---|---|
| `--keep-old` | Хуучин файлыг Supabase-д үлдээнэ (буцаах боломжтой) |
| `--force` | R2 дээр байсан ч дарж бичнэ (анхдагч: алгасна) |
| `--limit N` | Bucket тус бүрээс эхний N объектыг л (туршилт) |
| `--bucket avatars` | Зөвхөн нэг bucket |

> ℹ️ **Шилжүүлэхгүй байх нь ч БҮРЭН хүчинтэй** (2026-10-02-ны шийдвэр — hybrid горим):
> хуучин файлууд Supabase-д, шинэ нь R2-д үлдэж, **хоёул нийтийн URL-тай** тул зэрэг
> ажиллана ✓ (шалгав: хуучин `…/storage/v1/object/public/listing-images/…jpg` →
> **HTTP 200 · 372 KB · image/jpeg**). Устгах логик нь
> `lib/storageClient.mjs → splitStorageUrls()`-ээр **хоёр хэлбэрийг ЯЛГАЖ, хоёр
> замаар** устгадаг тул зар устгахад асуудал гарахгүй ✓ Ганц анхаарах зүйл:
> Supabase-ийн **1 GB / 5 GB сарын** хязгаарт хуучин файлууд хэвээр тооцогдоно
> (`npm run report:usage`). Хүссэн үедээ дээрх `--apply`-г ажиллуулахад л хангалттай.

> ⚠️ **Дараа нь:** Supabase Storage-ийн хэмжээ 0 болсноо `npm run report:usage`-аар
> шалгана. Нарийн тохиолдол: R2 руу бүрэн хуулагдаагүй бол `--apply`-г **дахин**
> ажиллуулна (байгаа нь алгасагдана ✓).

---

## 8. Буцаах (яаралтай үед)

1. `.env.local`-аас 5 `R2_*` мөрийг **түр хасаж** (эсвэл утгыг нь хоослоод)
   dev server-ээ дахин эхлүүлнэ → зураг **дахин Supabase Storage руу** хадгалагдана ✓
2. DB-д хадгалагдсан R2 URL-ууд нь R2 public домэйноор **хэвээр ажиллана**
   (зургууд R2 дээр байгаа тул устгаагүй л бол алга болохгүй)

Тиймээс шилжилт нь **буцаах боломжтой** бөгөөд шилжилтийн үед хуучин ба шинэ
зургууд ЗЭРЭГ харагдана (устгах код хоёр хэлбэрийг дэмждэг ✓).

---

## 9. Ямар файлууд хамаатай вэ (хөгжүүлэгчид)

| Файл | Үүрэг |
|---|---|
| `lib/storageKeys.mjs` | ЦЭВЭР дүрэм: түлхүүр байгуулах/шалгах, URL→түлхүүр, хязгаар. Тест: `npm run test:storage` |
| `lib/r2.mjs` | Сервер тал: S3 client, `presignPut()`, `deleteR2Keys()`, `listR2Keys()`. 🔒 НУУЦ — client-д бүү import хий |
| `lib/storageClient.mjs` | Browser тал: `/api/storage/presign` → `putToR2()`, хуучин/шинэ URL ялгах |
| `app/api/storage/presign/route.js` | Токен баталж, ~10 мин PUT линк олгоно (503 = R2 тохируулаагүй) |
| `app/api/storage/delete/route.js` | Зөвхөн өөрийн түлхүүрийг устгана |
| `lib/queries.js` | `uploadImages()` / `uploadAvatar()` — R2 (үндсэн) + Supabase (нөөц) |
| `scripts/check-r2.mjs` | `npm run check:r2` |
| `scripts/migrate-storage-to-r2.mjs` | `npm run storage:migrate` |
| `scripts/rebase-storage-urls.mjs` | `npm run storage:rebase` — нийтийн домэйн солигдоход DB-ийн URL-уудыг шинэчилнэ (§3) |

> ℹ️ **Нөөц зам:** `R2_*` тохируулаагүй бол `/api/storage/presign` нь 503
> `R2_NOT_CONFIGURED` буцааж, client нь хуучин Supabase Storage руу автоматаар
> буцна — тиймээс R2-ийг хожим тохируулсан ч **шилжилтийн үеэр ямар ч ажил
> зогсохгүй** ✓
>
> ⚠️ Энэ 503 нь төрөл/хэмжээний шалгалтаас **ӨМНӨ** буцаагддаг (зориуд):
> R2-гүй үед хүсэлт Supabase Storage руу (өөрийн bucket дүрэмтэй) явдаг
> тул R2-д зориулсан хязгаараар хуучин замыг хаахгүй ✓ `bucket`, файлын
> тоо, токен нь 503-аас өмнө шалгагдана.

