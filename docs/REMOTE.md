# 📱💻 Утас / iPad-аас ажиллах (Remote хөгжүүлэлт)

> **Асуулт:** энэ мак дээр хийж байгаа ажлыг **гар утас** эсвэл **iPad**-аас
> үргэлжлүүлж болох уу? → **ТИЙМ ✓** — гэхдээ нэг ЧУХАЛ зарчмыг ойлгох хэрэгтэй:

⚠️ **Cline (AI agent) нь Node.js орчин + файлын систем + terminal шаарддаг** ⇒ утасны
хөтөч дангаараа (vscode.dev «зүгээр», github.com mobile, Working Copy…) **ажиллуулж
чадахгүй** — зөвхөн **текст засах** хийнэ. Иймд загвар нь: **мак дээр ажиллаж, утаснаас
нь удирдана** (2, 3-р зам) эсвэл **бүхэлдээ cloud руу зөөнө** (4-р зам).

---

## 🧭 Аль замыг сонгох вэ

| # | Зам | Юу хийж болох вэ | Мак асаалттай байх | Тэмдэглэл |
|---|---|---|---|---|
| 1 | 📲 **Сайтаа шалгах** (LAN) | Сайтыг утсаараа нээж турших | ✅ тийм | **0 тохиргоо** — хамгийн хурдан |
| 2 | ⌨️ **Cline CLI + SSH** | AI-тай БҮРЭН ажиллах (терминал) | ✅ тийм | terminal-д дуртай хүнд ⭐ |
| 3 | 🖥 **VS Code Remote Tunnel** | Бүрэн VS Code (Cline extension, файл, terminal) | ✅ тийм | iPad + keyboard ⭐⭐ |
| 4 | ☁️ **GitHub Codespaces** | Бүрэн IDE, cloud дээр | ❌ шаардлагагүй | Free 60 ц/сар, секрет тохируулна |

---

## 1) 📲 Сайтаа утсаараа шалгах — 0 тохиргоо ✅ ШАЛГАСАН

**Энэ төслийн `npm run dev` нь Next 15-ийн default `0.0.0.0`-оор бүх сүлжээний
интерфейс дээр сонсдог** (`*:3000`) — тусдаа `-H` флаг **шаардлагагүй** ✓

```bash
npm run dev                      # мак дээр
ipconfig getifaddr en0           # → 192.168.1.2   (Mac-ийн LAN IP)
scutil --get LocalHostName       # → MacBook-Pro   (mDNS нэр)
```

Дараа нь **ижил Wi-Fi**-д холбогдсон утсаараа Safari/Chrome-оос:

```
http://192.168.1.2:3000          # LAN IP
http://MacBook-Pro.local:3000    # mDNS (нэрээр — IP солигдсон ч ажиллана ✓)
```

- 📱 iPhone дээр **Share → Add to Home Screen** → app мэт нээгдэнэ (PWA).
- 🧪 Утаснаас бүртгэл/зар оруулах/HMR-ийг бодитоор туршина (iOS-ийн Safari = жинхэнэ
  хэрэглэгчийн орчин — 📱 дугуй, safe-area, keyboard бүгд харагдана ✓).
- ⚠️ **Хамгаалалт нээлттэй болно:** dev server нь `.env.local`-ийг (service role key
  гэх мэт) уншсан орчинд ажилладаг ⇒ зөвхөн **итгэлтэй Wi-Fi** (гэр/оффис) дээр.
  Олон нийтийн (кафе, нисэх онгоцны) Wi-Fi дээр **зогсооно** ✗.
- ⚠️ macOS Firewall: System Settings → Network → **Firewall** — хэрэв асаалттай бол
  `node`-д *Allow incoming connections* зөвшөөрнө (эс бөгөөс утас холбогдохгүй).
- 🚫 **Router-ийн port-forward / ngrok** хийхгүй — шаардлагагүй, эрсдэлтэй.

---

## 2) ⌨️ Cline CLI + SSH — iPad-аас AI-тай ажиллах (хамгийн хөнгөн) ⭐

Cline-ийн **албан ёсны CLI** нь terminal-д зориулагдсан бөгөөд **headless/SSH** орчинд
ажилладаг (`npm` дээрх `cline@3.0.68`, repo: `github.com/cline/cline`) ✓

### Мак дээр (нэг удаа)
```bash
npm i -g cline                   # Node 22+ зөвлөнө (энэ мак: Node v26 ✓)
cline auth                       # provider + model сонгож нэвтэрнэ (Cline Provider / ClinePass / өөрийн key)
cline doctor                     # ⚠️ алдаа гарвал эндээс шалгана
```
Мөн **System Settings → General → Sharing → Remote Login**-ийг **асаана** (SSH).

### iPad/утас дээр
**Termius** эсвэл **Blink Shell** апп-аар мак руугаа SSH-ээр орно (`ssh mac@192.168.1.2`):

```bash
cd ~/Documents/code/zar
tmux new -s zar                                     # ⭐ апп-аас гарсан ч ажил үргэлжилнэ
                                                    #    (дахин орохдоо: tmux a -t zar)

cline                                               # 🖥 интерактив session
cline -p "FLOOR_MAX-ийг шалгаад тест ажиллуул"      # 🧠 эхлээд ТӨЛӨВЛӨ (Plan)
cline "npm run test:choices унавал зас"             # ⚡ шууд хий (Act)
cline --json "list TODO comments" | jq -r '.text'   # 🤖 script/headless горим
```

- 🔒 **Аюулгүй байдлын хаалт** (автономит ажиллагааг хязгаарлана) — shell профайлд:
  ```bash
  export CLINE_COMMAND_PERMISSIONS='{"allow":["npm *","git *","node *"],"deny":["rm -rf *","sudo *","git push *"]}'
  ```
- ⚠️ `--auto-approve true` нь **хүнээс асуулгүй** файл бичиж, команд ажиллуулна —
  зөвхөн **тусдаа branch** дээр (ж: `git switch -c phone-work`) хэрэглэнэ.
- 💡 Гадаа (өөр Wi-Fi) ажиллах бол **Tailscale** суулгавал мак руугаа интернэтээр
  аюулгүй (шифрлэгдсэн) холбогдоно — port нээх шаардлагагүй.

---

## 3) 🖥 VS Code Remote Tunnel + `vscode.dev` — бүрэн IDE ⭐⭐

Энэ мак дээр `code` CLI **1.139.1** суусан ✓ (`code tunnel` дэмжинэ).

### Мак дээр (нэг удаа)
```bash
code tunnel --accept-server-license-terms   # GitHub/Microsoft аккаунтаараа нэвтэрнэ
code tunnel                                 # дараагийн удаа: ингээд л
```
Терминалд гарсан **`https://vscode.dev/tunnel/<нэр>`** линкийг iPad-даа нээнэ
(эсвэл `vscode.dev` → зүүн доод **Remote** цэс → «Tunnel»).

### iPad дээр юу болох вэ
| Боломж | Тайлбар |
|---|---|
| 🧩 **Cline extension** | Extension host **мак дээр** ажилладаг тул Cline-ийн 💬 chat UI браузерт гарна (өмнөх task-ууд ч харагдана) |
| ⌨️ **Terminal** | `npm run dev`, `npm run test:choices`, `git push` — бүгд мак дээр ажиллана |
| 📂 **Файл/хайлт** | `⌘P` файл нээх · `⌘⇧F` бүх repo-д хайх |
| 🔌 **Ports** | «Ports» таб → 3000 → **Forward** ⇒ утсаараа тухайн URL-аар сайтаа нээнэ |

- ⭐ **iPad + Magic Keyboard** (эсвэл гадаад keyboard) — Safari дээр хамгийн тохиромжтой.
- ⚠️ **Mac сэрүүн байх ёстой**: System Settings → Battery/Lock Screen → *Prevent
  automatic sleep*. Эсвэл мак дээр `caffeinate -dimsu &` (дэлгэц унтарсан ч ажиллана).
- ⚠️ Cline-ийн chat нь webview тул **Safari дээр** зарим товч (hover/context menu)
  тохиромжгүй байж болно — гацвал 2-р зам (CLI) эсвэл «Desktop site» горим.
- ⚠️ `code tunnel` эхлүүлсэн мак унтарвал холболт **тасарна** ✗ (Codespaces шиг биш).

---

## 4) ☁️ GitHub Codespaces — мак унтраалттай ч ажиллана

Машинд суусан ✓: `github.codespaces` extension (VS Code **ба** Cursor). Харин repo-д
`.devcontainer/` байхгүй тул Codespaces нь ерөнхий image-аар нээгдэнэ — нээгдсэний
дараа нэг удаа:

```bash
npm install
npm run dev        # Codespaces портыг автоматаар форвардлана (Visibility: Public/Private)
```

- 🔑 **`.env.local` файлыг Codespace руу бүү хуул** ✗ — оронд нь GitHub →
  Settings → Codespaces → **Secrets**-д `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `VERIFY_MN_API_KEY`,
  R2-ийн 5 утгыг нэмээд тухайн repo-д хандахыг зөвшөөрнө.
  (⚠️ service role key = бүрэн эрх ⇒ зөвхөн **private** repo, зөвхөн өөрийн аккаунт.)
- ⚠️ **CDP тестүүд** (`npm run cdp:*`) нь мак дээрх Chrome-ийг
  (`--remote-debugging-port=9222` + нэвтэрсэн сесс) шаарддаг тул Codespaces дээр
  **ажиллахгүй** — зөвхөн unit тестүүд (`npm run test:*`) ажиллана ✓.
- 💰 Free tier: **60 цаг/сар** (2-core) — байнга хэрэглэвэл хязгаарт хүрнэ.
- 💡 Утаснаас: GitHub → repo → **Code ▾ → Codespaces → Create** товчоор нээгдэнэ.

---

## ⚠️ Аюулгүй байдлын дүрэм (бүх замд)

1. `.env.local` = **үнэ цэнэтэй секрет** (`SUPABASE_SERVICE_ROLE_KEY`, `VERIFY_MN_API_KEY`,
   R2 zero-secret). Хандах эрхтэй төхөөрөмж/аккаунт = эдгээрийг авах эрх.
2. Tunnel/SSH/Codespaces-д **зөвхөн өөрийн аккаунт** + **2FA** асаана.
3. Утас алдвал: мак дээр `pkill -f 'next dev'`, `code tunnel`-ийг зогсоож, SSH-ийг
   System Settings-ээс унтраана; Supabase → утасны сессийг гаргана.
4. Порт/DB-ийг интернэтэд **нээхгүй** — зөвхөн Tailscale эсвэл `code tunnel`.

## 🚫 Утаснаас ШУУД хийгдэхгүй зүйл

| Юу | Яагаад | Шийдэл |
|---|---|---|
| `npm run cdp:*` (wheel/picker/rooms/range) | Mac-ийн Chrome + 9222 + нэвтэрсэн сесс | 2/3-р замаар **мак дээрх** командыг ажиллуулна ✓ |
| `vscode.dev` дангаараа (tunnel-гүй) | Cline нь web extension биш (Node шаардна) | 2 эсвэл 3-р зам |
| Ollama / local model | Mac-ийн CPU/GPU | мак дээр үлдээгээд tunnel-аар |
| `npm run build` (iPad дээр шууд) | Хүнд — iPad зөвхөн хөтөч | 3-р замын Terminal-аас мак дээр |

---

## ✅ Баримтууд (2026-10-03-нд энэ мак дээр ШАЛГАСАН)

| Шалгалт | Дүн |
|---|---|
| `npm run dev` → `lsof -iTCP:3000 -sTCP:LISTEN` | `TCP *:3000` ⇒ бүх интерфейс ✓ |
| `curl http://192.168.1.2:3000/` (LAN IP) | **200** ✓ |
| `curl http://MacBook-Pro.local:3000/` (mDNS) | **200** ✓ |
| `code --version` | **1.139.1** ⇒ `code tunnel` боломжтой ✓ |
| `npm view cline version` | **3.0.68** (`github.com/cline/cline`) ✓ |
| Cline extension | `saoudrizwan.claude-dev@4.1.22` (VS Code **ба** Cursor) ✓ |
| Node / npm | **v26.0.0** / 11.12.1 (Cline CLI-д 20+, зөвлөмж 22+) ✓ |
| SSH нийтийн түлхүүр | `~/.ssh/*.pub` **байхгүй** ⇒ SSH-д нэвтрэхдээ нууц үг эсвэл `ssh-keygen` хэрэгтэй ⚠️ |


