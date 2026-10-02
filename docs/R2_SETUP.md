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

1. <https://dash.cloudflare.com> → **R2 Object Storage** → *Create bucket*
2. Нэр: `zar-media` (эсвэл өөрийн нэр) → Location: *Automatic* → **Create**

> Нэг bucket дотор хоёр фолдер байна: `listing-images/…`, `avatars/…`
> (Supabase-ийн хоёр bucket-ыг нэг дор нэгтгэсэн — хямд, энгийн).

---

## 2. API token (2 минут)

**R2 → API → Manage API tokens → Create API token**

| Талбар | Утга |
|---|---|
| Token name | `zarlaa-web` |
| Permissions | **Object Read & Write** |
| Specify bucket | `zar-media` (зөвхөн энэ bucket) |

Үүсгэсний дараа гарч ирэх утгуудыг хуулна (⚠️ **жагсаалтыг дахин харах
боломжгүй** — тэр даруй `.env.local`-д хийгээрэй):

| Cloudflare дээр | `.env.local` |
|---|---|
| Access Key ID | `R2_ACCESS_KEY_ID` |
| Secret Access Key | `R2_SECRET_ACCESS_KEY` |
| (Account ID — R2-ийн баруун дээд буланд) | `R2_ACCOUNT_ID` |

---

## 3. Нийтийн домэйн (зургийг browser-т үзүүлэх)

**Bucket → Settings → Public access**

| Сонголт | Хэзээ |
|---|---|
| ✅ **Custom domain** (санал болгож байна) — жишээ `img.zarlaa.mn` | Production. Cloudflare cache + DDoS хамгаалалт бүрэн ажиллана |
| ⚠️ **r2.dev subdomain** (`pub-xxxx.r2.dev`) | Зөвхөн ТУРШИЛТАД — хурдны хязгаартай |

`R2_PUBLIC_BASE` = `https://img.zarlaa.mn` (төгсгөлд нь `/` **БИШ**).
Custom domain ашиглавал DNS дэх `img` бичлэг нь Cloudflare-ийн өгсөн
target руу зааж байх ёстой (Cloudflare өөрөө нэмж өгдөг ✓).

---

## 4. CORS (ЗААВАЛ — эс бөгөөс browser-ээс upload ХИЙГДЭХГҮЙ ✗)

**Bucket → Settings → CORS Policy → Add**

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://zarlaa.mn",
      "https://www.zarlaa.mn",
      "https://<tanii-project>.vercel.app"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

> ⚠️ `AllowedMethods`-д **PUT** заавал байх ёстой (presigned PUT-ийг browser
> шууд хийдэг). `AllowedHeaders`-д **content-type** заавал (гарын үсэгт орсон).

---

## 5. `.env.local` (5 мөр)

```bash
R2_ACCOUNT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
R2_ACCESS_KEY_ID=xxxxxxxxxxxxxxxxxxxxxxxx
R2_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
R2_BUCKET=zar-media
R2_PUBLIC_BASE=https://img.zarlaa.mn
```

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

> ℹ️ **Нөөц зам:** `R2_*` тохируулаагүй бол `/api/storage/presign` нь 503
> `R2_NOT_CONFIGURED` буцааж, client нь хуучин Supabase Storage руу автоматаар
> буцна — тиймээс R2-ийг хожим тохируулсан ч **шилжилтийн үеэр ямар ч ажил
> зогсохгүй** ✓
>
> ⚠️ Энэ 503 нь төрөл/хэмжээний шалгалтаас **ӨМНӨ** буцаагддаг (зориуд):
> R2-гүй үед хүсэлт Supabase Storage руу (өөрийн bucket дүрэмтэй) явдаг
> тул R2-д зориулсан хязгаараар хуучин замыг хаахгүй ✓ `bucket`, файлын
> тоо, токен нь 503-аас өмнө шалгагдана.

