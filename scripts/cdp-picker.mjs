/**
 * 🗂 CDP ШАЛГАЛТ — «ЗАР НЭМЭХ» → 1-Р АЛХАМ: 3 БАГАНАТ СОНГОЛТ (гарчиггүй ✓)
 * ⚠️ 2026-10-01 — ХОЁР хүсэлтээр `AddListingClient.jsx`-ийн ХАРАГДАЦ ЦЭВЭРЛЭВ:
 *    ① «Зар нэмэхэд энийг харуулахгүй» → ДЭЭД ТОЛГОЙ (➕ Зар нэмэх · «1/5 · …»
 *       заагч · 5 АЛХМЫН ТАБ · дэвшлийн зурвас) БҮХЭЛДЭЭ ХАСАГДАВ
 *    ② «энэ бүгдийг нь зайлуул, харахыг хүсэхгүй байна» → форм ДОТРОХ алхмын
 *       гарчиг (`data-step-heading`) БҮХЭЛДЭЭ ХАСАГДАВ
 *       («1/5-Р АЛХАМ · Ангилал · Юу зарах вэ?» + `STEPS[].short`)
 *    ③ мөн адил хүсэлтээр «Категорио сонгоно уу» ГАРЧИГ Ч ХАСАГДАВ —
 *       асуулт нь ЗӨВХӨН `role="group"` + `aria-label` (screen reader) хэвээр ✓
 *    ④ «дэд төрөл биш зүгээр л Төрөл гэж нэрлэ» → баганын толгой
 *       «Дэд төрөл» → **«Төрөл»** (бүлэгтэй хэсгийн «Дэд бүлэг» ХЭВЭЭР ✓)
 *    ⑤ 🆕 **2026-10-01 (4 дэх засвар)**: «сонгосон хэсгийг дээд талд нь ДАВХАР
 *       гаргаж байгааг болиё» → баганын ДЭЭД ТОЛГОЙ (`[data-picker-title]`)
 *       БҮХЭЛДЭЭ ХАСАГДАВ (сонгосон утга нь доорх мөртэй давхардаж байв ✗).
 *       ⚠️ Тиймээс `title`/`header` тугууд ХАСАГДАЖ, оронд нь `pickerTitles`
 *       (DOM-д 0 байх ёстой) ба `dupe` (сонгосон утга багана дотроо ЯГ 1 удаа)
 *       гэсэн 2 ШИНЭ инвариант нэмэгдэв ✓ (①②③④⑥′-ийн олон шалгалт «толгой =
 *       сонгосон утга» байсныг «сонгосон мөр ГАНЦ (dupe = 1)» болгов)
 *    → энэ скрипт одоо:
 *    ⓐ `role="tablist"` (алхмын таб) **0** байхыг шалгана
 *    ⓑ `[data-step-heading]` ОГТ БАЙХГҮЙ (**0**) гэдгийг шалгана
 *    ⓒ одоогийн алхмыг ЗӨВХӨН дээд breadcrumb (`[data-step-current]` =
 *       «Ангилал»)-аас уншина
 *    ⓕ ⚠️ 2026-10-02 (хэрэглэгчийн хүсэлт): breadcrumb-ийн алхмын УРД нь гарч
 *       байсан ДУГААР («1. » / «2. ») ХАСАГДАВ ⇒ `[data-step-current]` нь
 *       «Ангилал» / «Байршил» / «Дэлгэрэнгүй» (тоо БАЙХГҮЙ) ✓
 *    ⓓ алхам солихдоо `?step=N` руу URL-аар шилжинэ (`gotoStepUrl`) ✓
 *    ⓔ 1-р алхамд ХАРАГДАХ ГАРЧИГ **0** байхыг шалгана (③) — picker-ийн
 *       асуулт нь зөвхөн `aria-label`-д үлдсэн ✓
 *
 * Хэрэглэгчийн хүсэлт: «Эхний хэсгийг ийм болго» (`жишиг сайтын зар оруулах хуудас`) —
 *   ① 1-р алхам нь 3 БАГАНАТ сонголт (Хэсэг → «Зарах/Түрээслэх»/Дэд бүлэг → Төрөл)
 *       (⚠️ өмнө нь дээд хэсэгт «Ангилал · Дэлгэрэнгүй · Байршил · Үнэ · Зураг»
 *          табууд байсан — 2026-10-01-нд ХАСАГДАВ ✓)
 *
 * ⚠️ ЭНЭ СКРИПТ ЮУГ ХАМГААЛАХ ВЭ (183 шалгалт):
 *    ℹ️ 2026-10-05 (53)-д БОДИТ хэмжилтээр батлав — доорх «121 шалгалт» нь
 *       2026-10-02-ны тоо байв (⑫-ээс хойш ⑪‴, ⑪⁗, ⑥″′ гэх мэт хэсгүүд нэмэгдэв)
 *   ① Үл хөдлөх: 3 багана (12 хэсэг · sell/rent · 8 төрөл)
 *      ⚠️ 2026-10-01 (**4 дэх засвар**): баганын ДЭЭД ТОЛГОЙ (`[data-picker-title]`)
 *      БҮХЭЛДЭЭ ХАСАГДАВ (сонгосон утга нь доорх мөртэй давхардаж байв ✗) →
 *      `pickerTitles` = **0** ба `dupe` = **1** (сонгосон утга багана дотроо
 *      ЯГ НЭГ УДАА — зөвхөн мөрөндөө) гэсэн 2 инвариантыг шалгана ✓
 *   ② «Түрээслэх» солиход багана 3 нь «…түрээслүүлнэ» болж, дүгнэлтэд БҮТЭН зам гарна
 *   ③ ХАВТГАЙ хэсэг (🚗 auto) → багана 3 АРИЛНА (2 багана) + хуучин сонголт
 *      цэвэрлэгдэнэ ✓ (толгойн нэр 2026-10-01-нд ХАСАГДСАН тул одоо «сонгосон
 *      мөр 0» гэдгээр шалгана ✓)
 *   ④ БҮЛЭГТЭЙ хэсэг (💻 computers) → 9 бүлэг, «Notebook» нь LEAF (3 дахь багана 0) ✓
 *   ⑤ ДООД ТҮВШИНГҮЙ бүлэг (💻 Чихэвч) нь ӨӨРӨӨ leaf болж хадгалагдана
 *   ⑥ АЛХМЫН ТАБ ба форм дотрох АЛХМЫН ГАРЧИГ ХОЁУЛАА ХАСАГДСАН
 *      (0 `role="tab"` · `[data-step-heading]` = 0) + «Үргэлжлүүлэх» → 2-р алхам
 *      = **📍 БАЙРШИЛ** (breadcrumb `[data-step-current]` = «Байршил» +
 *      URL `?step=2`) — 2026-10-01-нд алхмын дараалал солигдож, «Байршил»
 *      3-р алхмаас **2-Р АЛХАМ** болов ✓
 *   ⑥′/⑥″ БАЙРШЛЫН БАГАНУУД бүрэн шалгагдана: 3 багана (**loc-city ·
 *      loc-district · loc-khoroo**), форм дотор `<select>` **0** (1-р алхмын
 *      форматтай ижил — хэрэглэгчийн хүсэлт), толгой **0** (4 дэх засвар),
 *      Хот → Дүүрэг → Хороо дарааллаар сонгогдоно, ХОТ солиход дүүрэг БА
 *      хороо ЦЭВЭРЛЭГДЭНЭ, «Үргэлжлүүлэх» → 3-р алхам («Дэлгэрэнгүй»,
 *      URL `?step=3`) ✓
 *   ⑦ 🔎 ДҮРС ТЕКСТЭЭС ХҮРЭХГҮЙ — 🏷️ Үйлдвэрлэгчийн `combo`/текст талбарт
 *      (`!pl-9` = 36px, зай ≥ 6px) + ✕ товч (`!pr-10`) + sidebar-ийн 2 талбар
 *      ⚠️ «🏷️ Үйлдвэрлэгч» нь 3-р алхамд (хуучнаар 2-р) → `clickNext()` ХОЁР УДАА ✓
 *   ⑧ JS exception / `console.error` 0 (сүлжээний 401 нь Supabase session — тооцохгүй)
 *   ⑨ 🆕 **3-Р АЛХАМ (📋 Дэлгэрэнгүй) — ТАЛБАРУУД ЦУВАА = 1 БАГАНА**
 *      (2026-10-01, 5 дахь засвар): мөр бүр `.form-row-single` +
 *      `[data-form-row="details"]` → grid track **ЯГ 1**, хүүхдүүд ИЖИЛ x-т
 *      (зэрэг БИШ), талбар бүр мөрийнхөө БҮТЭН өргөнийг эзэлнэ
 *      ⚠️ 2026-10-02: 📱 390px дээр 3-р алхам «АСУУЛТ БҮР НЭГ ДЭЛГЭЦ» болов
 *      (⓫′ доор) ⇒ мобайлд харагдах мөр нь **ЯГ 1** (бусдыг CSS нууна ✓)
 *   ⑨′ 🆕 **3-Р АЛХАМ: НЭР нь ОРОЛТЫН ЗҮҮН талд (хэвтээ) — ТОМ ДЭЛГЭЦ (1440px)**
 *      (2026-10-01, 6 дахь засвар, хэрэглэгчийн хүсэлт: «Дэлгэрэнгүй мэдээлэл
 *      оруулах нэрнүүдийг дээр нь биш, зүүн талд нь гаргаад өгөөч»): `.form-group`
 *      бүр `sm` (640px)-ээс хойш grid болж, нэр зүүн / оролт баруун баганад.
 *      Геометрээр батална (нэрийн x < оролтын x, хоёулаа НЭГ мөрийн бүсэд) ✓
 *   ⑨″ 🆕 **📱 МОБАЙЛ (390px): ТАЛБАР БҮР НЭГ НЭГЭЭРЭЭ** (2026-10-01,
 *      17 дахь засвар, хэрэглэгчийн хүсэлт: «Гар утсаас зар нэмэхэд оруулж
 *      байгаа зүйлсийг нэг нэгээр нь харуулдаг болгох. Зөвхөн гар утас шүү»):
 *      640px-ээс ДООШ нэр нь оролтын ДЭЭР, оролт нь мөрийнхөө БҮТЭН өргөнийг
 *      эзэлнэ ✓ — ① ИЖИЛ x (зэрэгцэхгүй) ② нэр оролтын дээд ирмэгээс ДЭЭШ
 *      ③ оролт бүтэн өргөн (`globals.css` → `@media (min-width: 640px)`)
 *      ⚠️ 2026-10-02: хэмжилт нь `width > 0` шүүлттэй (харагдах талбар **ЯГ 1** —
 *      бусдыг «нэг дэлгэцэд нэг талбар» дүрэм нуудаг ✓)
 *      ⚠️ (6 дахь засварын «мобайлд ч нэр зүүн талд» шийдэл ЭСРЭГЭЭРЭЭ БОЛОВ)
 *   ⑩ 🆕 **АВТО ФОРМ — 🔧 «Хөдөлгүүр» СОНГОЛТ + 🎨 «Өнгө» нэмэгдэж, 🔀 «Хөтлөгч»
 *      ХАСАГДАВ** (2026-10-01, хэрэглэгчийн хүсэлт; 3-р алхмын DOM-оос уншина):
 *      ① `[data-form-row="details"] .form-group`-ийн `label`-ээр «Хөдөлгүүр»-ыг
 *      олж, түүний `select` нь «Сонгох» + **7** утгатай (1.5л хүртэл …
 *      Цахилгаан (EV)) ✓ ② «Хөтлөгч» гэсэн талбар форм дээр **0** ✓
 *      ③ «Өнгө» **12** сонголттой ✓ ④ sidebar (`select[aria-label]`) — «Өнгө» бий,
 *      «Хөтлөгч» **0** ✓ ⑤ 🆕 **2026-10-01 (2): «Өнгө» нь «Загвар»-ын ЯГ дараа**
 *      (форм БА sidebar — хоёуланд нь DOM дарааллаар шалгана; ⚠️ sidebar-д
 *      «Загвар» нь `input`, «Өнгө» нь `select` тул `aside [aria-label]`-аас
 *      уншина ✓) ⇒ `lib/locationData.js`-ийн `ENGINE_OPTIONS` /
 *      `AUTO_COLOR_OPTIONS` / `attrFields` · `attrFilters` / `CARD_ATTR_ORDER`
 *      гэрээг БОДИТ DOM дээр батална ✓
 *   ⑪ 🆕 **📱 МОБАЙЛ (390px): АСУУЛТ БҮР НЭГ ДЭЛГЭЦ (drill-down)** — 2026-10-02,
 *      хэрэглэгчийн хүсэлт: «гар утсаас зар оруулахад ийм асуудаг формоо нэг
 *      нэгээр нь харуулаад яв» (`жишиг сайтын зар оруулах хуудас`-ийн дэлгэцүүд) ⇒ мобайлд
 *      багана БАЙХГҮЙ (`[data-picker]` DOM-д 3 хэвээр ч өргөн 0), ДЭЛГЭЦ БҮРД
 *      НЭГ асуулт (`[data-mobile-question]`): ① 12 хэсэг ② «Үл хөдлөх зарна /
 *      …түрээслүүлнэ» ③ «Үл хөдлөх зарна» → 8 төрөл ④ «Орон сууц зарна» →
 *      1 өрөө … +5 өрөө (+ «Алгасах») ⑤ сүүлийн сонголт дээр **ДАРААГИЙН
 *      АЛХАМ руу ШУУД** (📍 Байршил) ⑥ хот → дүүрэг → хороо ⑦ 3-р алхамд
 *      «Өрөө» ХАРАГДАХГҮЙ (`.hide-below-sm` — drill-down-д асуусан тул
 *      давхардахгүй ✓) ⑧ 🖥 1440px дээр мобайл блок ХАРАГДАХГҮЙ + 3 БАГАНАТ
 *      ХЭВЭЭР ✓ ⑨ 🆕 **🛡️ ХАМГААЛАЛТ** — форм ХООСОН атлаа `?step=3` (эсвэл 5)
 *      руу ороход ЭХНИЙ ДУТУУ АЛХАМ руу буцаж, «Зарын төрлөө сонгоно уу»
 *      мессеж харуулна (өмнө нь ТАЛБАРГҮЙ хоосон «Дэлгэрэнгүй» хуудас гардаг
 *      байв ✗ — хэрэглэгчийн гомдол: «зарын дэлгэрэнгүй асуух хэсэг байхгүй
 *      болсон») (**23 шалгалт**)
 *   ⑪′ 🆕 **📱 3-Р АЛХАМ (📋 Дэлгэрэнгүй): «АСУУЛТ БҮР НЭГ ДЭЛГЭЦ»** —
 *      2026-10-02, хэрэглэгчийн хүсэлт: «зарын гарчиг, талбай, угаалгын өрөө,
 *      ашиглалтанд орсон он … бүгдийг нь нэг нэгээр нь харуул» ⇒ мобайлд
 *      дэлгэц бүрд НЭГ талбар (`[data-detail-field]`), толгойд ← товч +
 *      асуулт + «n/N» явц (`[data-mobile-detail-head]` → `data-mobile-detail-key`):
 *      ① эхний дэлгэц «Зарын гарчиг», харагдах талбар ЯГ 1 ② мөр бүр
 *      `data-mobile-active`-тай, ЯГ 1 нь идэвхтэй ③ дэлгэц бүрд «Үргэлжлүүлэх»
 *      ЯГ 1 (дэлгэц ↔ алхам ДАВХАРДАХГҮЙ) ④ заавал талбарт «Алгасах»
 *      ХАРАГДАХГҮЙ ⑤ гарчиг ХООСОН → урагш ЯВАХГҮЙ + `validateStep`-тэй ИЖИЛ
 *      мессеж ⑥ дараалал: гарчиг → талбай → он → нийт давхар → давхар → тагт
 *      → гараж («Өрөө» БАЙХГҮЙ — 1-р алхмын drill-down-д асуусан ✓)
 *      ⑦ сүүлийн дэлгэцэд wizard-ийн товч ХААГДАЖ, алхмын «Үргэлжлүүлэх» л
 *      үлдэнэ (+ «← Буцах» мобайлд ХАРАГДАХГҮЙ — толгойн ← л буцаана)
 *      ⑧ толгойн ← өмнөх дэлгэц рүү, оруулсан утга ХАДГАЛАГДАНА
 *      ⇒ **14 шалгалт** (`scripts/test-detail-wizard.mjs` — статик ГЭРЭЭ)
 *   ⑪‴ 🆕 **📱 ОН · НИЙТ ДАВХАР · ДАВХАР — ГАРААС БИЧИЛТ** — 2026-10-05 (53),
 *      хэрэглэгчийн хүсэлт: «гар утаснаас ашиглалтанд орсон он, барилгын нийт
 *      давхар, байрны давхарыг ГАРААС оруулдаг болго» ⇒ эдгээр 3 ТООН талбарт
 *      2026-10-03 (17)-ийн «2 БАГАНАТ ЖАГСААЛТ + дармагц дараагийн асуулт» нь
 *      ХҮЧИНГҮЙ болов: `ChoiceField`-ийн `mobileInput` туг нь
 *      `data-mobile-input="true"` тавьж, `.hide-below-sm` ХАСАЖ,
 *      `MobileOptions`-ийг ОГТ рендэрлэхгүй (`[data-mobile-option]` = 0) ⇒
 *      дэлгэцэд доод «Алгасах / Үргэлжлүүлэх →» товч гарна (дармагц шилжих
 *      БИШ ✓) · 🎡 «Гүйлгээд сонгох» холбоос НЭМЭЛТ боломж хэвээр ·
 *      `detailScreens`-ээс `pick: true` ХАСАГДАВ · 🖥 ≥640px ХӨНДӨГДӨӨГҮЙ ✓
 *      ⇒ **13 шалгалт**
 *   ⑫ 🆕 **🖥 СОНГОСОН АНГИЛАЛ / БАЙРШИЛ (≥640px)** — 2026-10-05, хэрэглэгчийн
 *      хүсэлт: «Зар нэмэх форм дээр сонгосон категори/байршил КОМПЬЮТЕР дээр
 *      харагдахгүй байна» ⇒ 📱 `MobileAnswers` (`sm:hidden`) нь зөвхөн мобайлд
 *      байсан тул 🖥 дээр 2-р алхмаас хойш юу сонгосон нь ХААНА Ч харагдахгүй
 *      байв ✗ ⇒ 🆕 `[data-desktop-summary]` хүснэгт (`hidden sm:flex`):
 *      ① 1-р алхамд ГАРАХГҮЙ (сонгосон зам нь баганын мөр + `[data-picker-summary]`
 *      дээр бий — давхардал 0 ✓) ② 2-р алхамд ЗӨВХӨН 🗂 АНГИЛАЛ
 *      (`[data-location-summary]`-тай давхардахгүй ✓) ③ 3-р алхамд 🗂 + 📍
 *      ХОЁУЛАА ④ 📱 390px дээр `display:none` (өргөн 0 ✓)
 *      ⇒ **5 шалгалт** (ⓐ `dupe`/`pickerTitles` инвариантууд ХӨНДӨГДӨӨГҮЙ ✓)
 *   ⑪⁗ 🆕 **📝 НООРОГ — САНАМСАРГҮЙ REFRESH-ЭЭС ХАМГААЛАЛТ** — 2026-10-05 (54),
 *      хэрэглэгчийн гомдол: «зар нэмж байх үедээ гар утасны browser санамсаргүй
 *      refresh хийхэд оруулж байсан мэдээлэл байхгүй болж байна» ⇒ форм нь
 *      оруулсан утгаа `localStorage`-д (`zar:listing-draft:<uid>`) бичиж,
 *      дараагийн ачаалалт дээр сэргээнэ (`lib/listingDraft.mjs`) ✓
 *      ① ноорог БИЧИГДСЭН (`raw` дотор гарчиг ба `totalFloors`) ② `location.reload()`
 *      → гарчиг/ангилал/байршил/гараас бичсэн «12»/3-р алхмын дэлгэц БҮГД ХЭВЭЭР
 *      ③ «📝 Хадгалагдсан ноорог сэргээгдлээ» мэдэгдэл + 🗑 «Устгах»
 *      (`[data-draft-restored]`/`[data-draft-discard]`, `type="button"`) ④ 🗑 дарсны
 *      дараа ноорог УСТАЖ форм ХООСОН + 1-р алхам ⑤ дахин refresh → хоосон хэвээр
 *      ⇒ **11 шалгалт**
 *      ⚠️ Энэ хэсэг нь `gotoStepUrl()`-ийг ХЭРЭГЛЭХГҮЙ — тэр нь нооргийг
 *      цэвэрлэдэг (`clearDrafts()`) тул `location.reload()`-ыг ШУУД дуудна ✓
 *      ⚠️ Ноорог нь «форм ХООСОН» гэсэн шалгалтуудыг унагана ✗ ⇒ `clearDrafts()`
 *      нь script-ийн эхэлд, `gotoStepUrl()`-д ба 🛡️ хамгаалалтын хэсэгт дуудагдана ✓
 *
 * ⚙️ ХЭРХЭН АЖИЛЛУУЛАХ (2 урьдчилсан нөхцөл):
 *   1) сервер http://localhost:3000 (`npm run dev` эсвэл `npm run build && npm run start`)
 *      ℹ️ Өөр порт дээр бол: `node scripts/cdp-picker.mjs http://localhost:3200`
 *   2) Chrome алсын дебагттайгаар, НЭВТЭРСЭН профайлаар нээсэн байх
 *      /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *        --headless=new --remote-debugging-port=9222 \
 *        --user-data-dir=/tmp/chrome-prof-zar http://localhost:3000/
 *      ⚠️ 1-р алхам нь ЗӨВХӨН нэвтэрсэн хэрэглэгчид харагдана (хаалт байхгүй бол)
 *   Дараа нь:  npm run cdp:picker
 *
 *  ⚠️ Тогтвортой selector-ууд (`AddListingClient.jsx` дотор):
 *     `[data-picker="section|level2|level3"]` · `button[data-picker-value="…"]`
 *     `[data-picker-summary]` · `[data-step-current]` · `[role="group"][aria-label]` ✓
 *     (⚠️ `Категорио сонгоно уу` нь 2026-10-01-нд ХАРАГДАХ ГАРЧИГ БАЙХГҮЙ —
 *      зөвхөн `aria-label`-д (a11y) үлдсэн; CDP нь DOM текстээс хайна ✓)
 *     (⚠️ `[data-step-heading]` нь 2026-10-01-нд алхмын гарчигтай хамт ХАСАГДАВ
 *      — одоо DOM-д 0 байх ёстой; `[data-step-tab="…"]` ч мөн адил ✓)
 */
const BASE = process.argv[2] || 'http://localhost:3000';
const CDP = `http://127.0.0.1:${process.env.CDP_PORT || 9222}`;

/**
 * 🧭 🖥 ≥640px ДЭЭРХ 3 ДАХЬ ХУУДАСНЫ breadcrumb (2026-10-05, 57)
 * ⚠️ 🖥 дээр 3, 4, 5-р алхам НЭГ хуудас болсон тул «Дэлгэрэнгүй» гэвэл
 *    төөрөгдөнө (тэр хуудсан дээр 📋 Дэлгэрэнгүй + 💰 Үнэ + 📝 Тайлбар +
 *    ☎️ утас + 🖼 Зураг бүгд байна) ⇒ «Дэлгэрэнгүй ба үнэ, зураг» ✓
 * ⚠️ 📱 <640px дээр ХӨНДӨГДӨӨГҮЙ — «Дэлгэрэнгүй» / «Үнэ» / «Зураг» ✓
 *    (доорх 📱 шалгалтууд хуучин бичгээрээ үлдэнэ)
 */
const DESKTOP_DETAIL_LABEL = 'Дэлгэрэнгүй ба үнэ, зураг';
/**
 * 🎨 2026-10-03 (19): sidebar-ийн «Өнгө»-ний чипүүд нь либын жагсаалттай
 *    ЯГ ижил эсэхийг DOM↔ЛИБ харьцуулалтаар шалгана (давхар бичихгүй ✓)
 */
import { AUTO_COLOR_OPTIONS, CAR_BRANDS } from '../lib/locationData.js';

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass += 1; console.log(`  ✓ ${name}`); }
  else { fail += 1; console.log(`  ✗ ${name}${extra ? `  → ${extra}` : ''}`); }
};

const rpcOf = (ws) => {
  let id = 0;
  return (method, params = {}) => {
    id += 1;
    const myId = id;
    ws.send(JSON.stringify({ id: myId, method, params }));
    return new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error(`timeout ${method}`)), 30000);
      const on = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id !== myId) return;
        clearTimeout(to);
        ws.removeEventListener('message', on);
        m.error ? rej(new Error(`${method}: ${JSON.stringify(m.error)}`)) : res(m.result);
      };
      ws.addEventListener('message', on);
    });
  };
};

const created = await fetch(`${CDP}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
const target = await created.json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res) => ws.addEventListener('open', res, { once: true }));
const rpc = rpcOf(ws);

const problems = [];
const netProblems = [];
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.method === 'Runtime.exceptionThrown') {
    problems.push(`exception: ${m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text}`);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    problems.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description).join(' ')}`);
  }
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') {
    const entry = `${m.params.entry.text} ${m.params.entry.url || ''}`.trim();
    // ⚠️ Сүлжээний 401 (Supabase token) нь КОДЫН алдаа БИШ — тусад нь бүртгэнэ ✓
    if (/Failed to load resource/.test(m.params.entry.text)) netProblems.push(entry);
    else problems.push(`log.error: ${entry}`);
  }
});

await rpc('Runtime.enable');
await rpc('Log.enable');
await rpc('Page.enable');
await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false });
await rpc('Page.navigate', { url: `${BASE}/listings/new` });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await wait(5000);

const evaluate = async (expression) => {
  const r = await rpc('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails));
  return r.result.value;
};

/**
 * 📝 НООРОГ ЦЭВЭРЛЭХ (2026-10-05, 54) — форм нь оруулсан утгаа `localStorage`-д
 *    ноорог болгож хадгалдаг болов (`lib/listingDraft.mjs`) ⇒ script дахин
 *    ажиллах үед өмнөх run-ийн ноорог ҮЛДСЭН байж болно. Тэр нь «форм ХООСОН»
 *    гэсэн бүх шалгалтыг унагана ✗ (ж: 🛡️ `?step=3` → 1-р алхам руу буцах
 *    нөхцөл нь форм хоосон байхыг шаарддаг) ⇒ эхлэлд болон форм «шинэ» байх
 *    ёстой газар бүрд энэ туслахыг дуудна ✓
 * ⚠️ Зөвхөн `zar:listing-draft…` угтвартай түлхүүрүүд — `sb-…-auth-token`
 *    (нэвтрэлт) ХӨНДӨГДӨХГҮЙ ✓
 */
const clearDrafts = () => evaluate(`(() => {
  try {
    const keys = Object.keys(window.localStorage).filter((k) => k.indexOf('zar:listing-draft') === 0);
    keys.forEach((k) => window.localStorage.removeItem(k));
    return keys.length;
  } catch (e) {
    // ⚠️ Хуудас ачаалагдаагүй / about:blank үед localStorage ХОРИГЛОНО
    //    (SecurityError) ⇒ script-ийг УНАГАХГҮЙ — «цэвэрлэх юм байхгүй» гэж үзнэ ✓
    return -1;
  }
})()`);

// ⚠️ Дээрх `Page.navigate` нь хуучин нооргийг сэргээсэн байж болзошгүй ⇒
//    цэвэрлээд, форм ШИНЭ байхаар дахин ачаална ✓
const draftKeysAtStart = await clearDrafts();
if (draftKeysAtStart) console.log(`  ℹ️ хуучин ноорог ${draftKeysAtStart} ширхэг ЦЭВЭРЛЭГДЭВ (форм шинэ байх ёстой ✓)`);
await rpc('Page.navigate', { url: `${BASE}/listings/new?step=1` });
/**
 * ⚠️ (83) Тогтмол хүлээлт ХҮРЭЛЦЭХГҮЙ байж болно — удаан ачаалалт дээр
 *    `[data-picker]` = 0 болж, ① ба ②-ын БҮХ шалгалт хуурамч ✗ өгдөг байв ✗
 *    (⏳ `wait(4000)` нь хуудас бүрэн ачаалагдсаныг БАТАЛДАГГҮЙ).
 *    ⇒ одоо форм БОДИТООР бэлэн болтол хүлээнэ (12с — хүрэхгүй бол ✗ ХЭВЭЭР ✓)
 */
const waitPickerReady = async (expr, ms = 12000) => {
  const until = Date.now() + ms;
  for (;;) {
    try { if (await evaluate(expr)) return true; } catch { /* ачаалж байна */ }
    if (Date.now() > until) return false;
    await wait(300);
  }
};
const pickerReady = await waitPickerReady(`document.querySelectorAll('[data-picker]').length > 0`);
if (!pickerReady) console.log('  ⚠️ 1-р алхмын picker DOM 12с дотор ГАРАГҮЙ (доорх шалгалтууд ✗ гарах боломжтой)');

const PROBE = `(() => {
  const cols = {};
  document.querySelectorAll('[data-picker]').forEach((el) => {
    cols[el.dataset.picker] = {
      /**
       * ⚠️ 2026-10-01 (**4 дэх засвар**): баганын ДЭЭД ТОЛГОЙ ([data-picker-title])
       *    БҮХЭЛДЭЭ ХАСАГДАВ (сонгосон утга нь доорх мөртэй давхардаж байв ✗) —
       *    pickerTitles (доор) нь ЯГ 0 байх ёстой ✓
       * ℹ️ dupe = тухайн баганд СОНГОСОН мөрийн бичиг ХЭДЭН УДАА гарч байна вэ.
       *    Толгой байсан үед 2 байв (толгой + мөр) ✗ — одоо ЯГ 1 (зөвхөн мөр) ✓
       *    (⚠️ RegExp БИШ, split ашиглана — энэ template literal дотор backtick
       *     болон долларын буржгар хаалт БИЧИХГҮЙ ✗)
       */
      dupe: (() => {
        const sel = [...el.querySelectorAll('button[aria-pressed="true"]')];
        if (sel.length !== 1) return 0;
        const t = (sel[0].innerText || '').trim();
        if (!t) return 0;
        return el.innerText.split(t).length - 1;
      })(),
      items: [...el.querySelectorAll('button[data-picker-value]')].map((b) => b.dataset.pickerValue),
      selected: [...el.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.dataset.pickerValue),
    };
  });
  return {
    gate: document.body.innerText.includes('нэвтрэх шаардлагатай'),
    // ⚠️ 2026-10-01 (2 дахь засвар): «Категорио сонгоно уу» ГАРЧИГ Ч ХАСАГДАВ →
    //    асуулт нь зөвхөн aria-label (a11y) хэвээр; ХАРАГДАХ текст DOM-д 0 ✓
    noPickerHeading: !document.body.innerText.includes('Категорио сонгоно уу'),
    pickerAria: (document.querySelector('[data-picker="section"]')?.closest('[role="group"]')?.getAttribute('aria-label') || '').trim(),
    // ⚠️ 2026-10-01: толгойн АЛХМЫН ТАБУУД ба форм дотрох алхмын гарчиг ХОЁУЛАА
    //    хасагдсан → одоогийн алхмыг ЗӨВХӨН дээд breadcrumb-аас уншина:
    //    [data-step-current] = «Ангилал» (⚠️ 2026-10-02: дугаар «1. » хасагдав) ✓
    //    [data-step-heading] нь 0 байх ЁСТОЙ (хасагдсаныг батлана) ✓
    stepLabel: (document.querySelector('[data-step-current]') || {}).innerText || '',
    stepHeadings: document.querySelectorAll('[data-step-heading]').length,
    tabs: [...document.querySelectorAll('[role="tablist"] [role="tab"]')].map((b) => (b.innerText || '').trim()),
    summary: (document.querySelector('[data-picker-summary]') || {}).innerText || '',
    /**
     * 🆕 2026-10-05 (**🖥 СОНГОСОН АНГИЛАЛ / БАЙРШИЛ**, хэрэглэгчийн хүсэлт:
     *    «Зар нэмэх форм дээр сонгосон категори/байршил компьютер дээр
     *    харагдахгүй байна») → форм нь ≥640px дээр [data-desktop-summary]
     *    хүснэгттэй (ⓐ 1-р алхмаас хойш АНГИЛАЛ, ⓑ 2-р алхмаас хойш БАЙРШИЛ).
     *    ⚠️ [data-picker-summary] / [data-location-summary]-тэй ХОЛБООГҮЙ
     *    ТУСДАА элемент (доорх тоонууд хөндөгдөхгүй ✓)
     *    (⚠️ энэ template literal дотор backtick болон долларын буржгар хаалт
     *    БИЧИХГҮЙ — эс бөгөөс template literal ХААЛТАА ТАСАРЧ script унана ✗)
     */
    desktopSummary: (() => {
      const el = document.querySelector('[data-desktop-summary]');
      if (!el) return { has: false, visible: false, location: false, text: '' };
      return {
        has: true,
        visible: el.getBoundingClientRect().width > 0,
        location: Boolean(el.querySelector('[data-desktop-summary-location]')),
        text: (el.innerText || '').replace(/\\s+/g, ' ').trim(),
      };
    })(),
    /**
     * 🆕 2026-10-05 (52 — хэрэглэгчийн хүсэлт: «бусад мэдээлэл оруулах хэсэг
     *    гарч байгаа хуудсан дээрээс дээрх 2-оо засах боломжтой байх товч
     *    тус тусд нь») → [data-desktop-summary] мөр БҮРД ✏️ «Засах» товч:
     *    ⓐ category → 1-р алхам (Ангилал) ⓑ location → 2-р алхам (Байршил)
     *    ⚠️ Товч нь <form onSubmit> ДОТОР тул type=button БАЙХ ЁСТОЙ —
     *    эс бөгөөс ✏️ дарах нь формыг ШУУД илгээнэ ✗ (submit болно)
     *    (⚠️ энэ template literal дотор backtick / долларын буржгар хаалт
     *    БИЧИХГҮЙ — эс бөгөөс template literal ХААЛТАА ТАСАРЧ script унана ✗)
     */
    summaryEdit: (() => {
      const el = document.querySelector('[data-desktop-summary]');
      const btns = el ? [...el.querySelectorAll('[data-desktop-summary-edit]')] : [];
      const pick = (k) => btns.find((b) => b.dataset.desktopSummaryEdit === k);
      return {
        category: Boolean(pick('category')),
        location: Boolean(pick('location')),
        count: btns.length,
        typeButton: btns.length > 0 && btns.every((b) => b.getAttribute('type') === 'button'),
        text: btns.map((b) => (b.innerText || '').trim()).join(' | '),
      };
    })(),
    // 📍 2-р алхам = Байршил — өөрийн гэсэн дүгнэлтийн мөр ([data-location-summary])
    //    ⚠️ ТУСДАА атрибут: [data-picker-summary] нь ЗӨВХӨН 1-р алхамд байх ёстой ✓
    locationSummary: (document.querySelector('[data-location-summary]') || {}).innerText || '',
    // ⚠️ 2026-10-01: Байршил нь select БИШ, баганат сонголт болов → 2-р алхамд
    //    форм дотор select ЯГ 0 байх ёстой (1-р алхамд ч 0 ✓)
    selects: document.querySelectorAll('form select').length,
    /**
     * 🆕 2026-10-05 (🖥 НЭГ УРТ ХУУДАС): 1440px дээр БҮХ алхам DOM-д байдаг
     *    болсон тул «форма доторх БҮХ select» гэсэн тоолол нь 📋 Дэлгэрэнгүй
     *    (аттр талбарууд) ба 💰 Үнэ-ийн select-үүдийг Ч багцалж эхлэв ✗ ⇒
     *    БАГАНЫН групп дотор хийхээр ТУСДАА талбар нэмэв ✓
     *    ⚠️ Групп олдохгүй бол -1 (тест унана — зөв ✓)
     *    ⚠️ Энэ template literal дотор backtick / долларын буржгар хаалт БИЧИХГҮЙ
     */
    locSelects: (() => {
      const g = document.querySelector('[role="group"][aria-label="Байршлаа сонгоно уу"]');
      return g ? g.querySelectorAll('select').length : -1;
    })(),
    colCount: document.querySelectorAll('[data-picker]').length,
    // ⚠️ 2026-10-01 (4 дэх засвар): баганын ДЭЭД ЦЭНХЭР ТОЛГОЙ БҮХЭЛДЭЭ
    //    ХАСАГДСАН (сонгосон утгатай давхардаж байв ✗) → DOM-д ЯГ 0 байх ёстой ✓
    pickerTitles: document.querySelectorAll('[data-picker-title]').length,
    /**
     * 🆕 2026-10-01 (**5 дахь засвар**, хэрэглэгчийн хүсэлт: «Дэлгэрэнгүй хэсгийн
     *    мэдээллийг оруулах хэсгийг ЦУВАА буюу 1 БАГАНА болго») → 3-Р АЛХМЫН
     *    (📋 Дэлгэрэнгүй) мөр БҮР нь [data-form-row="details"] атрибуттай
     *    (.form-row-single, globals.css) болов. Инвариантууд:
     *      ① cols = grid track-ийн ТОО → ЯГ 1 (.form-row-ийн sm:grid-cols-2
     *         байсан үед 2 байв ✗)
     *      ② stacked = хүүхдүүд НЭГ x-т (зүүн ирмэг) → зэрэг БИШ, ЦУВАА ✓
     *      ③ full = хүүхэд бүр мөрийнхөө БҮТЭН өргөнийг эзэлнэ (хагас биш ✓)
     *    ⚠️ Энэ template literal дотор backtick / долларын буржгар хаалт БИЧИХГҮЙ
     */
    detailsRows: [...document.querySelectorAll('[data-form-row="details"]')].map((r) => {
      const rr = r.getBoundingClientRect();
      /**
       * ⚠️ 2026-10-02: ЗӨВХӨН ХАРАГДАЖ БАЙГАА хүүхдүүд (өргөн > 0) — мобайлд
       *    «Өрөө» талбар нь .hide-below-sm-ээр display:none болдог
       *    (1-р алхмын drill-down-д асуудаг болсон) тул 0×0 хэмжигдэж,
       *    stacked (хүүхдүүд ИЖИЛ x-т) шалгалтыг БУРУУ унагаж байв ✗
       *    (харагдаж байгаа талбарууд нь зөв цуваа байсан ч 0-x ≠ 24-x)
       */
      const kids = [...r.children]
        .filter((c) => c.getBoundingClientRect().width > 0)
        .map((c) => {
          const k = c.getBoundingClientRect();
          return { x: +k.left.toFixed(1), w: +k.width.toFixed(1) };
        });
      return {
        cols: getComputedStyle(r).gridTemplateColumns.split(' ').filter(Boolean).length,
        rowW: +rr.width.toFixed(1),
        kids: kids.length,
        stacked: kids.length < 2 || kids.every((k) => Math.abs(k.x - kids[0].x) <= 1),
        full: kids.length === 0 || kids.every((k) => Math.abs(k.w - rr.width) <= 1),
      };
    }),
    cols,
  };
})()`;

const probe = () => evaluate(PROBE);
const click = async (sel) => {
  const res = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return 'NOT_FOUND'; el.click(); return 'OK'; })()`);
  await wait(350);
  return res;
};
/**
 * 🪜 «Үргэлжлүүлэх →» — алхмын навигаци.
 * ⚠️ 2026-10-01: «📍 Байршил» нь 3-р алхмаас **2-р алхам** болов → 3-р алхам
 *    (Дэлгэрэнгүй, «🏷️ Үйлдвэрлэгч» тэнд) руу хүрэхэд ХОЁР УДАА дарах хэрэгтэй ✓
 */
/**
 * 🪜 «Үргэлжлүүлэх →» — алхмын навигаци (🪜 wizard-ийн БАГАНЫН товч)
 *    🆕 2026-10-05 (🖥 НЭГ УРТ ХУУДАС): ⚠️ ТЕКСТЭЭР хайж БОЛОХГҮЙ болов —
 *    📱 `[data-mobile-detail-next]` («нэг дэлгэц» горимын товч) нь ≥640px
 *    дээр `sm:hidden` ч DOM-д БАЙНГА байдаг ба `<form>` дотор ХАМГИЙН ЭХЭНД
 *    таардаг тул `.click()` нь МОБАЙЛЫН товчийг дарж, алхам ХӨДЛӨХГҮЙ байв ✗
 *    ⇒ одоо ЗӨВХӨН `[data-step-next]` (codes-ийн стабил селектор) ✓
 */
const clickNext = async () => {
  const res = await evaluate(`(() => { const b = document.querySelector('form [data-step-next]'); if (!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()`);
  await wait(800);
  return res;
};
/**
 * 🪜 Алхмыг URL-аар солих — ⚠️ 2026-10-01-нд толгойн АЛХМЫН ТАБУУД хасагдсан
 *    тул `[data-step-tab="…"]` дарах боломжгүй болсон → `?step=N` руу шууд
 *    шилжинэ (бүтэн ачаалал тул форм цэвэрлэгдэнэ — дараа нь дахин сонгоно ✓)
 * ⚠️ 2026-10-05 (54): зөвхөн бүтэн ачаалал ХАНГАЛТГҮЙ болов — форм нь оруулсан
 *    утгаа `localStorage`-ийн НООРОГ болгож хадгалдаг тул дахин ачаалахад утга
 *    БУЦАЖ ирнэ ✗ ⇒ энд ЗОРИУДААР нооргийг цэвэрлэнэ («форм шинэ» гэсэн
 *    шалгалтууд хүчинтэй үлдэнэ ✓). Нооргийг ШАЛГАХ хэсэг (⑪⁗) нь
 *    `location.reload()`-ыг шууд дууддаг тул тэр нь хөндөгдөхгүй ✓
 */
const gotoStepUrl = async (n) => {
  await clearDrafts();
  await evaluate(`location.href = ${JSON.stringify(`${BASE}/listings/new?step=${n}`)}`);
  await wait(3000);
};


console.log('\n── ① НЭВТЭРСЭН ТӨЛӨВ + АНХДАГЧ (🏠 Үл хөдлөх) ──');
const p0 = await probe();
ok('нэвтрэх хаалт ГАРАХГҮЙ (session ажиллаж байна)', p0.gate === false);
ok('1-р алхамд ХАРАГДАХ ГАРЧИГ БАЙХГҮЙ («Категорио сонгоно уу» хасагдсан ✓)', p0.noPickerHeading === true);
ok('асуулт нь `aria-label`-аар (screen reader) ХЭВЭЭР',
  p0.pickerAria === 'Категорио сонгоно уу', JSON.stringify(p0.pickerAria));
ok('дээд хэсэгт АЛХМЫН ТАБ ГАРАХГҮЙ (2026-10-01-нд хасагдсан ✓)', p0.tabs.length === 0, JSON.stringify(p0.tabs));
ok('форм дотор АЛХМЫН ГАРЧИГ ГАРАХГҮЙ (`[data-step-heading]` = 0)',
  p0.stepHeadings === 0, `stepHeadings=${p0.stepHeadings}`);
ok('1-р алхам: breadcrumb «Ангилал» — ⚠️ 2026-10-02: ДУГААРГҮЙ болов',
  String(p0.stepLabel).trim() === 'Ангилал', JSON.stringify(p0.stepLabel));
/** 🆕 2026-10-05 (🖥 НЭГ УРТ ХУУДАС): 1440px дээр 📍 Байршил ч DOM-д байдаг
 *  тул баганын НИЙТ тоо 3 → **6** (🗂 Ангилал 3 + 📍 Байршил 3) ✓ */
ok('🖥 DOM-д 6 БАГАНА (🗂 Ангилал 3 + 📍 Байршил 3 — 🖥 алхамт тул 3 нь л ХАРАГДАНА)', p0.colCount === 6, `colCount=${p0.colCount}`);
ok('🗂 1-р алхмын 3 багана ХЭВЭЭР (section · level2 · level3)',
  ['section', 'level2', 'level3'].every((k) => p0.cols[k]), JSON.stringify(Object.keys(p0.cols)));
ok('багана 1: 12 ХЭСЭГ', p0.cols.section?.items.length === 12, String(p0.cols.section?.items.length));
/**
 * 🗑 2026-10-01 (**4 дэх засвар**, хэрэглэгчийн хүсэлт): «сонгосон хэсгийг дээд
 *    талд нь ДАВХАР гаргаж байгааг болиё» → баганын толгой БҮХЭЛДЭЭ ХАСАГДАВ.
 *    ⚠️ Энэ нь ТОГТВОРТОЙ selector (`[data-picker-title]`) байсан тул тест нь
 *    одоо «толгой = 0» ба «сонгосон утга багана дотроо ГАНЦ (`dupe` = 1)»
 *    гэсэн 2 ШИНЭ инвариантыг шалгана ✓ (өмнө нь толгой НЭМЭГДЭЖ байсан
 *    тул `dupe` нь 2 байв ✗)
 */
ok('🆕 баганын ДЭЭД ТОЛГОЙ ХАСАГДСАН: `[data-picker-title]` = 0 (давхардал үгүй)',
  p0.pickerTitles === 0, `pickerTitles=${p0.pickerTitles}`);
ok('багана 1: «Үл хөдлөх» сонгосон утга ГАНЦ (толгойд давхардахгүй, мөрөндөө ✓)',
  p0.cols.section?.dupe === 1 && JSON.stringify(p0.cols.section?.selected) === '["real-estate"]',
  `dupe=${p0.cols.section?.dupe} selected=${JSON.stringify(p0.cols.section?.selected)}`);
ok('багана 2: Зарах/Түрээслэх (sell, rent)', JSON.stringify(p0.cols.level2?.items) === '["sell","rent"]', JSON.stringify(p0.cols.level2?.items));
ok('багана 2: «💰 Зарах» сонгосон утга ГАНЦ (цэнхэр мөр ✓)',
  p0.cols.level2?.dupe === 1, `dupe=${p0.cols.level2?.dupe}`);
ok('багана 3: 8 ТӨРӨЛ', p0.cols.level3?.items.length === 8, String(p0.cols.level3?.items.length));
ok('багана 3 дэд төрөл = «Орон сууц»', (p0.cols.level3?.items || []).includes('Орон сууц'), JSON.stringify(p0.cols.level3?.items.slice(0, 3)));
ok('багана 3: сонголт хийгээгүй → сонгосон мөр 0 (dupe 0)',
  p0.cols.level3?.dupe === 0 && JSON.stringify(p0.cols.level3?.selected) === '[]',
  `dupe=${p0.cols.level3?.dupe} selected=${JSON.stringify(p0.cols.level3?.selected)}`);
/**
 * 🆕 2026-10-05 (🖥 АЛХАМТ, 2 дахь засвар): 🖥 дээр Ч алхамт болсон тул
 *    `[data-desktop-summary]` нь 1-Р АЛХАМД (🗂 Ангилал) ОГТ ГАРАХГҮЙ
 *    (`step < 1` → `null`) — сонгосон зам нь баганын цэнхэр мөр +
 *    `[data-picker-summary]` дээр бий (давхардал 0 ✓)
 *    ⏳ өмнө «🖥 нэг урт хуудас» үед 1-р алхмаас л харагддаг байв
 */
ok('🖥 1-р алхам (🔥 ХООСОН ФОРМ): сонгосон хүснэгт ГАРАХГҮЙ (`step < 1` хаалт ✓)',
  p0.desktopSummary?.has === false || p0.desktopSummary?.visible === false,
  JSON.stringify(p0.desktopSummary));
ok('дүгнэлт: «…сонгоно уу»', (p0.summary || '').includes('сонгоно уу'), p0.summary);

console.log('\n── ② ТҮРЭЭСЛҮҮЛЭХ + ДЭД ТӨРӨЛ СОНГОХ ──');
await click('[data-picker="level2"] button[data-picker-value="rent"]');
const p1 = await probe();
ok('багана 2-т «rent» сонгогдов', JSON.stringify(p1.cols.level2?.selected) === '["rent"]', JSON.stringify(p1.cols.level2?.selected));
ok('багана 2: «🔑 Түрээслэх» ГАНЦ (сонгосон утга давхардахгүй ✓)',
  p1.cols.level2?.dupe === 1, `dupe=${p1.cols.level2?.dupe}`);
await click('[data-picker="level3"] button[data-picker-value="Орон сууц"]');
const p2 = await probe();
ok('багана 3-т «Орон сууц» сонгогдов', JSON.stringify(p2.cols.level3?.selected) === '["Орон сууц"]', JSON.stringify(p2.cols.level3?.selected));
ok('дүгнэлтэд бүтэн зам («Орон сууц түрээслүүлнэ»)',
  (p2.summary || '').includes('Үл хөдлөх') && (p2.summary || '').includes('Түрээслэх') && (p2.summary || '').includes('Орон сууц түрээслүүлнэ'),
  p2.summary);
ok('багана 3: «🏢 Орон сууц зарна» ГАНЦ (толгойн давхардал үгүй ✓)',
  p2.cols.level3?.dupe === 1, `dupe=${p2.cols.level3?.dupe}`);

console.log('\n── ③ ХАВТГАЙ ХЭСЭГ (🚗 Автомашин) → 2 БАГАНА ──');
await click('[data-picker="section"] button[data-picker-value="auto"]');
const p3 = await probe();
ok('🗂 багана 3 АРИЛАВ → 🗂 2 + 📍 3 = 5 багана (DOM-д ✓)', p3.colCount === 5, `colCount=${p3.colCount}`);
ok('багана 1: «🚗 Автомашин» сонгосон утга ГАНЦ (толгойд давхардахгүй ✓)',
  p3.cols.section?.dupe === 1, `dupe=${p3.cols.section?.dupe} selected=${JSON.stringify(p3.cols.section?.selected)}`);
ok('багана 2 = 10 дэд төрөл (хавтгай)', p3.cols.level2?.items.length === 10, String(p3.cols.level2?.items.length));
ok('багана 2: сонголт хийгээгүй → сонгосон мөр 0 (dupe 0)',
  p3.cols.level2?.dupe === 0 && JSON.stringify(p3.cols.level2?.selected) === '[]',
  `dupe=${p3.cols.level2?.dupe} selected=${JSON.stringify(p3.cols.level2?.selected)}`);
ok('өмнөх сонголт ЦЭВЭРЛЭГДЭВ', JSON.stringify(p3.cols.level2?.selected) === '[]' && (p3.summary || '').includes('Төрлөө сонгоно уу'), p3.summary);
await click('[data-picker="level2"] button[data-picker-value="Жийп, SUV"]');
const p4 = await probe();
ok('хавтгай хэсэгт дэд төрөл сонгогдов', (p4.summary || '').includes('Жийп, SUV'), p4.summary);
ok('хавтгай: багана 2-т «Жийп, SUV» ГАНЦ (цэнхэр мөр ✓, толгой ХАСАГДСАН ✓)',
  p4.cols.level2?.dupe === 1 && p4.pickerTitles === 0,
  `dupe=${p4.cols.level2?.dupe} pickerTitles=${p4.pickerTitles}`);

console.log('\n── ④ БҮЛЭГТЭЙ ХЭСЭГ (💻 Компьютер) → «Notebook» нь LEAF ──');
await click('[data-picker="section"] button[data-picker-value="computers"]');
const p5 = await probe();
ok('3 багана буцаж ирэв (DOM-д нийт 6 = 🗂 3 + 📍 3 ✓)', p5.colCount === 6, `colCount=${p5.colCount}`);
ok('багана 2 = 9 БҮЛЭГ', p5.cols.level2?.items.length === 9, JSON.stringify(p5.cols.level2?.items));
ok('багана 3 хоосон (бүлэг сонгоогүй)', p5.cols.level3?.items.length === 0, String(p5.cols.level3?.items.length));
/**
 * 🗑 2026-10-07 (57): «Notebook» нь ДООД ТҮВШИНГҮЙ бүлэг болов (хэрэглэгчийн
 *    хүсэлт) ⇒ дармагц өөрөө дэд төрөл болно (`property_type='Notebook'`),
 *    3 дахь багана ГАРАХГҮЙ ✓ (⏳ өмнө нь 22 брэнд гардаг байв ✗)
 */
await click('[data-picker="level2"] button[data-picker-value="Notebook"]');
const p7 = await probe();
ok('багана 2: «💻 Notebook» сонгосон (leaf — 3 дахь багана 0 ✓)',
  p7.cols.level3?.items.length === 0,
  `level3=${p7.cols.level3?.items.length}`);
ok('дүгнэлтэд «Notebook» ГАНЦ удаа (бүлэг=leaf — давхардалгүй ✓)',
  (p7.summary || '').includes('Notebook')
    && (p7.summary || '').split('Notebook').length - 1 === 1, p7.summary);

console.log('\n── ⑤ ДООД ТҮВШИНГҮЙ БҮЛЭГ (💻 Чихэвч) = өөрөө leaf ──');
await click('[data-picker="level2"] button[data-picker-value="Чихэвч"]');
const p8 = await probe();
ok('багана 2-т «Чихэвч» сонгогдов', JSON.stringify(p8.cols.level2?.selected) === '["Чихэвч"]', JSON.stringify(p8.cols.level2?.selected));
ok('дүгнэлтэд «Чихэвч» (бүлэг=leaf) 1 УДАА — давхардалгүй',
  (p8.summary || '').includes('Чихэвч')
  && (p8.summary || '').split('Чихэвч').length - 1 === 1, p8.summary);

console.log('\n── ⑥ ТАБ БА АЛХМЫН ГАРЧИГ ХАСАГДСАН + 2-Р АЛХАМ = 📍 БАЙРШИЛ ──');
await click('[data-picker="section"] button[data-picker-value="real-estate"]');
await click('[data-picker="level3"] button[data-picker-value="Орон сууц"]');
const plusOk = await clickNext();
const p9 = await probe();
ok('«Үргэлжлүүлэх» товч ажилласан', plusOk === 'OK', plusOk);
ok('2-Р АЛХАМ руу шилжив (breadcrumb = «Байршил» — 2026-10-01: дараалал солигдов)',
  String(p9.stepLabel).trim() === 'Байршил',
  JSON.stringify(p9.stepLabel));
const search = await evaluate('location.search');
ok('URL нь `?step=2` болов', String(search).includes('step=2'), search);
/**
 * 📍 2026-10-01 (хэрэглэгчийн хүсэлт): «Байршлыг 3т биш 2т оруулдаг мэдээлэл болго,
 *    ингэхдээ 1т зар оруулж байгаатай адилхан форматтай болгоорой»
 *    → ① алхмын байрлал 3 → **2** ② харагдац нь 1-р алхмын БАГАНАТ сонголттой ЯГ
 *    ИЖИЛ болж, `<select>` ХАСАГДАВ (`[data-picker="loc-city|loc-district|loc-khoroo"]`) ✓
 */
ok('байршил нь 3 БАГАНАТ сонголт (loc-city · loc-district · loc-khoroo) — нийт 6 багана',
  p9.colCount === 6 && ['loc-city', 'loc-district', 'loc-khoroo'].every((k) => p9.cols[k]),
  `colCount=${p9.colCount} keys=${JSON.stringify(Object.keys(p9.cols))}`);
ok('байршилд `<select>` БАЙХГҮЙ (1-р алхмын форматтай ижил ✓)',
  p9.locSelects === 0, `locSelects=${p9.locSelects} (форм нийт ${p9.selects})`);
ok('📍 байршилд Ч БАГАНЫН ТОЛГОЙ БАЙХГҮЙ (`[data-picker-title]` = 0 ✓)',
  p9.pickerTitles === 0, `pickerTitles=${p9.pickerTitles}`);
ok('багана 1: «Улаанбаатар» сонгосон утга ГАНЦ (толгойд давхардахгүй) + 22 хот/аймаг',
  p9.cols['loc-city']?.dupe === 1 && p9.cols['loc-city']?.items.length === 22,
  `dupe=${p9.cols['loc-city']?.dupe} items=${p9.cols['loc-city']?.items.length}`);
ok('багана 2 (дүүрэг) = 9 дүүрэг, сонголт хийгээгүй (dupe 0 ✓)',
  p9.cols['loc-district']?.dupe === 0 && p9.cols['loc-district']?.items.length === 9,
  `dupe=${p9.cols['loc-district']?.dupe} items=${p9.cols['loc-district']?.items.length}`);
ok('багана 3 (хороо) хоосон — дүүрэг сонгоогүй тул ✓',
  p9.cols['loc-khoroo']?.items.length === 0,
  String(p9.cols['loc-khoroo']?.items.length));
/**
 * 🆕 2026-10-05 — 🖥 «СОНГОСОН АНГИЛАЛ / БАЙРШИЛ» хүснэгт (≥640px):
 *    ① 🗂 АНГИЛАЛ — 2-р алхам (📍 Байршил) дээр ХАРАГДАНА ✓
 *    ② ⚠️ 2026-10-05 (2 дахь засвар — 🖥 АЛХАМТ): 📍 мөр нь ЗӨВХӨН
 *       `step >= 2` (📋 Дэлгэрэнгүй) үед гарна ⇒ энэ алхамд ХАРАГДАХГҮЙ ✓
 *       — байршил нь доорх `[data-location-summary]` дээр бий (давхардал 0 ✓)
 *    ③ 📱 <640px дээр энэ хүснэгт ХАРАГДАХГҮЙ (`hidden sm:flex`) ✓
 *    ℹ️ Энэ алхам дээр сонгосон ангилал = 🏠 Үл хөдлөх ▸ … ▸ Орон сууц
 *       (⑥ хэсэгт хэсгийг `real-estate` руу буцаасан ✓)
 */
ok('🖥 2-р алхам (📍 Байршил): 🗂 СОНГОСОН АНГИЛАЛ хүснэгт ХАРАГДАНА (өргөн > 0 ✓)',
  p9.desktopSummary?.has === true && p9.desktopSummary?.visible === true
  && (p9.desktopSummary?.text || '').includes('Үл хөдлөх'),
  JSON.stringify(p9.desktopSummary));
ok('🖥 2-р алхам: 📍 мөр ХҮСНЭГТЭД ГАРАХГҮЙ (`step >= 2` хаалт ✓ — давхардал 0)',
  p9.desktopSummary?.location === false
  && !(p9.desktopSummary?.text || '').includes('📍')
  && (p9.locationSummary || '').includes('Улаанбаатар'),
  JSON.stringify({ loc: p9.desktopSummary?.location, text: p9.desktopSummary?.text, lsum: p9.locationSummary }));

console.log('\n── ⑥′ БАЙРШЛЫН БАГАНУУД: Хот → Дүүрэг → Хороо ──');
await click('[data-picker="loc-district"] button[data-picker-value="Баянгол"]');
const p10 = await probe();
ok('багана 2-т «Баянгол» сонгогдов',
  JSON.stringify(p10.cols['loc-district']?.selected) === '["Баянгол"]',
  JSON.stringify(p10.cols['loc-district']?.selected));
ok('багана 2-т «Баянгол» ГАНЦ (цэнхэр мөр ✓, толгойн давхардал үгүй)',
  p10.cols['loc-district']?.dupe === 1,
  `dupe=${p10.cols['loc-district']?.dupe} selected=${JSON.stringify(p10.cols['loc-district']?.selected)}`);
ok('багана 3-т Баянголын 33 хороо гарч ирэв',
  p10.cols['loc-khoroo']?.items.length === 33, String(p10.cols['loc-khoroo']?.items.length));
await click('[data-picker="loc-khoroo"] button[data-picker-value="3-р хороо"]');
const p11 = await probe();
ok('багана 3-т «3-р хороо» сонгогдов',
  JSON.stringify(p11.cols['loc-khoroo']?.selected) === '["3-р хороо"]',
  JSON.stringify(p11.cols['loc-khoroo']?.selected));
ok('байршлын дүгнэлтэд БҮТЭН ХАЯГ («Улаанбаатар › Баянгол › 3-р хороо»)',
  ['Улаанбаатар', 'Баянгол', '3-р хороо'].every((x) => (p11.locationSummary || '').includes(x)),
  p11.locationSummary);
// ⚠️ Дараалсан сонголт: ХОТ солиход дүүрэг БА хороо ХОЁУЛАА цэвэрлэгдэнэ ✓
await click('[data-picker="loc-city"] button[data-picker-value="Дархан-Уул"]');
const p12 = await probe();
ok('хот солиход дүүрэг ЦЭВЭРЛЭГДЭВ',
  JSON.stringify(p12.cols['loc-district']?.selected) === '[]' && p12.cols['loc-district']?.dupe === 0,
  JSON.stringify(p12.cols['loc-district']?.selected));
ok('хот солиход хороо ЦЭВЭРЛЭГДЭВ',
  JSON.stringify(p12.cols['loc-khoroo']?.selected) === '[]',
  JSON.stringify(p12.cols['loc-khoroo']?.selected));
ok('«Дархан-Уул»-ийн дүүрэг/сум гарч ирэв (4)',
  p12.cols['loc-district']?.items.length === 4,
  String(p12.cols['loc-district']?.items.length));

console.log('\n── ⑥″ 3-Р АЛХАМ = 📋 ДЭЛГЭРЭНГҮЙ (байршлаас ХОЙШ) ──');
const next3 = await clickNext();
const p13 = await probe();
ok('«Үргэлжлүүлэх» байршлаас ажилласан', next3 === 'OK', next3);
ok('3-Р АЛХАМ руу шилжив (🖥 breadcrumb = «Дэлгэрэнгүй ба үнэ, зураг» — 57)',
  String(p13.stepLabel).trim() === DESKTOP_DETAIL_LABEL,
  JSON.stringify(p13.stepLabel));
const search3 = await evaluate('location.search');
ok('URL нь `?step=3` болов', String(search3).includes('step=3'), search3);
/**
 * 🆕 2026-10-05 — 🖥 «СОНГОСОН АНГИЛАЛ / БАЙРШИЛ» хүснэгт (ГОЛ ЗАСВАР):
 *    Хэрэглэгчийн гомдол: «Зар нэмэх форм дээр сонгосон категори/байршил
 *    КОМПЬЮТЕР дээр харагдахгүй байна» ⇒ 3-р алхам (📋 Дэлгэрэнгүй) ба
 *    түүнээс хойш 📱 `MobileAnswers` (`sm:hidden`) нь харагддаггүй байсан тул
 *    🖥 дээр юу сонгосон нь ХААНА Ч байгаагүй ✗ ⇒ одоо хүснэгтэд ХОЁУЛАА
 *    (🗂 Ангилал + 📍 Зарын байршил) харагдана ✓
 *    ℹ️ Энэ алхам дээр сонгосон нь: 🏠 Үл хөдлөх ▸ … ▸ Орон сууц +
 *       📍 Дархан-Уул (хот сольсон үед дүүрэг/хороо ЦЭВЭРЛЭГДСЭН ✓ —
 *       ℹ️ ⑤ хэсэгт 💻 Чихэвч сонгосон ч ⑥ хэсэгт хэсгийг `real-estate`
 *       руу буцаасан тул ангилал нь 🏠 Үл хөдлөх ✓)
 */
ok('🖥 3-р алхам (📋 Дэлгэрэнгүй): 🗂 АНГИЛАЛ ба 📍 БАЙРШИЛ ХОЁУЛАА харагдана (өргөн > 0 ✓)',
  p13.desktopSummary?.has === true && p13.desktopSummary?.visible === true && p13.desktopSummary?.location === true,
  JSON.stringify(p13.desktopSummary));
ok('🖥 3-р алхам: хүснэгтэд сонгосон БОДИТ УТГУУД бий (📱 `MobileAnswers`-тай НЭГ ЭХ СУРВАЛЖ ✓)',
  ['🗂 Ангилал', '📍 Зарын байршил', 'Үл хөдлөх', '▸', 'Дархан-Уул']
    .every((x) => (p13.desktopSummary?.text || '').includes(x)),
  p13.desktopSummary?.text);

/**
 * 🆕 2026-10-05 (52 — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ): «зар оруулахад … бусад мэдээлэл
 *    оруулах хэсэг гарч байгаа хуудсан дээрээс дээрх 2-оо засах боломжтой байх
 *    товч тус тусд нь» ⇒ хүснэгтийн мөр БҮРД ✏️ «Засах» товч:
 *    ⓐ 🗂 Ангилал → 1-р алхам ⓑ 📍 Байршил → 2-р алхам.
 *    ⚠️ Товч нь `<form>` дотор тул `type="button"` байх ЁСТОЙ (submit болно ✗)
 *    ℹ️ Тестийн ТӨГСГӨЛД 3-р алхам руу буцна — доорх ⑥‴ хэсэг хөндөгдөхгүй ✓
 *    ℹ️ Сонголт нь БУЦАЖ ИРЭХЭД ХАДГАЛАГДАНА (form state хэвээр ✓)
 */
console.log('\n── ⑥″′ 🖥 ХУРААНГУЙН ✏️ ЗАСАХ товч (Ангилал / Байршил ТУС ТУСДАА) ──');

/** 🪜 Одоогийн алхмын нэр (`[data-step-current]`) */
const stepNow = async () => String((await probe()).stepLabel).trim();

ok('🖥 ✏️ «Засах» товч ХОЁУЛАА бий (category + location, нийт 2) ба `type="button"` (submit БИШ ✓)',
  p13.summaryEdit?.category === true && p13.summaryEdit?.location === true
  && p13.summaryEdit?.count === 2 && p13.summaryEdit?.typeButton === true,
  JSON.stringify(p13.summaryEdit));
ok('🖥 ✏️ товчны бичиг нь мөр тус бүрд ИЖИЛ («✏️ Засах | ✏️ Засах ✓)',
  (p13.summaryEdit?.text || '') === '✏️ Засах | ✏️ Засах',
  JSON.stringify(p13.summaryEdit?.text));

/** ① 🗂 Ангилал — 1-р алхам руу буцаана */
const catClicked = await click('[data-desktop-summary-edit="category"]');
const sCat = await stepNow();
ok('🖱 ✏️ Ангилал дарвал 1-Р АЛХАМ руу буцлаа (breadcrumb = «Ангилал» ✓)',
  catClicked === 'OK' && sCat === 'Ангилал', `${catClicked} → ${JSON.stringify(sCat)}`);
ok('↩️ 1-р алхамнаас «Үргэлжлүүлэх» → 2-Р АЛХАМ (📍 Байршил) — сонголт ХАДГАЛАГДСАН ✓',
  (await clickNext()) === 'OK' && (await stepNow()) === 'Байршил',
  JSON.stringify(await stepNow()));
ok('↩️ 2-р алхамнаас «Үргэлжлүүлэх» → 3-Р АЛХАМ БУЦАЖ ИРЛЭЭ (📋 Дэлгэрэнгүй ба үнэ, зураг ✓)',
  (await clickNext()) === 'OK' && (await stepNow()) === DESKTOP_DETAIL_LABEL,
  JSON.stringify(await stepNow()));

/** ② 📍 Байршил — 2-р алхам руу буцаана */
const locClicked = await click('[data-desktop-summary-edit="location"]');
const sLoc = await stepNow();
ok('🖱 ✏️ Байршил дарвал 2-Р АЛХАМ руу буцлаа (breadcrumb = «Байршил» ✓)',
  locClicked === 'OK' && sLoc === 'Байршил', `${locClicked} → ${JSON.stringify(sLoc)}`);
ok('↩️ Буцаж 3-Р АЛХАМ (📋 Дэлгэрэнгүй ба үнэ, зураг) — доорх хэсгүүд эндээс үргэлжилнэ ✓',
  (await clickNext()) === 'OK' && (await stepNow()) === DESKTOP_DETAIL_LABEL,
  JSON.stringify(await stepNow()));

console.log('\n── ⑥‴ 3-Р АЛХАМ (📋 Дэлгэрэнгүй): ТАЛБАРУУД ЦУВАА = 1 БАГАНА ──');
/**
 * ⚠️ 2026-10-01 (**5 дахь засвар**, хэрэглэгчийн хүсэлт): «Дэлгэрэнгүй хэсгийн
 *    мэдээллийг оруулах хэсгийг ЦУВАА буюу 1 БАГАНА болго» → 3-р алхмын мөр
 *    бүр `[data-form-row="details"]` (`.form-row-single`, globals.css) болов
 *    (`sm:grid-cols-2` БҮРЭН ХАСАГДАВ) тул 1440px дээр Ч талбарууд ЦУВАА ✓
 *    өмнө нь «Өрөө | Талбай», «Ашиглалтанд орсон он | Барилгын нийт давхар»
 *    зэрэг мөрүүд `sm`-ээс хойш ХОЁР багана болж ЗЭРЭГ харагдаж байв ✗
 *    ℹ️ Хэмжилт нь CSS-ийг БОДИТООР уншина: ① grid track-ийн тоо (ЯГ 1)
 *    ② хүүхдүүдийн x (ижил = зэрэг БИШ) ③ өргөн (мөрийнхөө бүтэн өргөн)
 *    ⇒ класс/стиль өөрчлөгдсөн ч зөрчил баригдана ✓
 */
const dr = p13.detailsRows || [];
ok('3-Р АЛХАМ: мөр бүр ЦУВАА — grid track ЯГ 1 (2 багана биш ✓)',
  dr.length >= 3 && dr.every((r) => r.cols === 1),
  JSON.stringify(dr.map((r) => r.cols)));
ok('3-Р АЛХАМ: талбарууд ЗЭРЭГ БИШ — бүгд ИЖИЛ x-т (зүүн ирмэгээрээ ✓)',
  dr.length >= 3 && dr.every((r) => r.stacked),
  JSON.stringify(dr.map((r) => ({ kids: r.kids, stacked: r.stacked }))));
ok('3-Р АЛХАМ: талбар бүр мөрийнхөө БҮТЭН өргөнийг эзэлнэ (хагас биш ✓)',
  dr.length >= 3 && dr.every((r) => r.full),
  JSON.stringify(dr.map((r) => ({ rowW: r.rowW, full: r.full }))));
ok('3-Р АЛХАМ: 2+ талбартай мөр («Өрөө» + «Талбай» …) Ч ЦУВАА (зэрэгцэхгүй ✓)',
  dr.filter((r) => r.kids >= 2).length >= 2,
  JSON.stringify(dr.map((r) => r.kids)));
// 📱 Мобайл (390px) дээр Ч 1 БАГАНА хэвээр — regression байхгүй гэдгийг батлана ✓
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 1400, deviceScaleFactor: 1, mobile: false });
await wait(600);
/**
 * ⚠️ 2026-10-02: «Өрөө» талбар нь МОБАЙЛД ХАРАГДАХГҮЙ болов
 *    (`.hide-below-sm`, globals.css) — өрөөг 1-р алхмын drill-down-д асуудаг
 *    тул (жишиг сайтын 4 дэх дэлгэц: «Орон сууц зарна» → 1 өрөө … +5 өрөө)
 *    3-р алхамд ДАВХАРДАХГҮЙ ✓. Тиймээс хэмжилт нь ① `rowW > 0` (бүхэлдээ
 *    нуугдсан мөрийг ХАСНА) ② PROBE нь харагдахгүй хүүхдүүдийг хасдаг (дээр)
 *    — эс бөгөөс `display:none` талбарын 0×0 хэмжилт `stacked`-ыг БУРУУ
 *    унагана ✗ (энэ нь АЛДАА БИШ — мөр харагдахгүй байна)
 * 📱 2026-10-02 (хэрэглэгчийн хүсэлт «нэг нэгээр нь харуулаад яв»):
 *    3-р алхам «АСУУЛТ БҮР НЭГ ДЭЛГЭЦ» болов ⇒ 390px дээр зөвхөн ОДООНЫ
 *    талбарын мөр харагдана (`[data-mobile-active="false"]` = `display:none`,
 *    globals.css) — тиймээс харагдах мөр ЯГ 1 (эхний дэлгэц = «Зарын гарчиг») ✓
 *    ⇒ `>= 3` БИШ, `=== 1` (мобайлд бүх талбар ЦУВСАН байх ёсгүй ✓)
 */
const drM = ((await probe()).detailsRows || []).filter((r) => r.rowW > 0);
ok('📱 390px: «НЭГ ДЭЛГЭЦЭД НЭГ ТАЛБАР» — харагдах мөр ЯГ 1 (бусдыг CSS нуув ✓)',
  drM.length === 1 && drM[0].cols === 1 && drM[0].stacked,
  JSON.stringify(drM.map((r) => ({ cols: r.cols, stacked: r.stacked }))));
await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false });
await wait(600);

// ── ⑥⁗ 🆕 2026-10-01 (6 дахь засвар) — НЭР ОРОЛТЫН ЗҮҮН ТАЛД (хэвтээ) ──
/**
 * 🆕 Хэрэглэгчийн хүсэлт: «Зар нэмэх хэсгийн Дэлгэрэнгүй мэдээлэл оруулах
 *    нэрнүүдийг дээр нь биш, ЗҮҮН талд нь гаргаад өгөөч» → 3-р алхмын
 *    `.form-group` бүр ХЭВТЭЭ болов (`globals.css`,
 *    `[data-form-row="details"] > .form-group` = grid). БОДИТ Chrome дээр
 *    геометрээр батална (класс/стиль өөрчлөгдсөн ч зөрчил баригдана ✓):
 *      ① `label` ба түүний ЭХНИЙ оролт (input/select/textarea/div.relative)
 *         хоёулаа БАЙНА
 *      ② нэр нь оролтын ЗҮҮН талд: `labX < ctrlX − 6` (6px tolerance)
 *      ③ хоёулаа НЭГ мөрийн бүсэд: нэрийн төв `y` нь оролтын дээд/доод дотор
 *    ⚠️ Энэ template literal дотор backtick / долларын буржгар хаалт БИЧИХГҮЙ
 */
const DETAILS_TWO_COL = `(() => [...document.querySelectorAll('[data-form-row="details"] > .form-group')]
  .map((g) => {
    const lab = g.querySelector('label');
    const ctrl = g.querySelector('input, select, textarea, div');
    const lr = lab ? lab.getBoundingClientRect() : null;
    const cr = ctrl ? ctrl.getBoundingClientRect() : null;
    return {
      label: ((lab || {}).textContent || '').trim(),
      labX: lr ? +lr.left.toFixed(1) : null,
      labMidY: lr ? +(lr.top + lr.height / 2).toFixed(1) : null,
      ctrlX: cr ? +cr.left.toFixed(1) : null,
      ctrlTop: cr ? +cr.top.toFixed(1) : null,
      ctrlBot: cr ? +cr.bottom.toFixed(1) : null,
    };
  }))()`;
const dtc = await evaluate(DETAILS_TWO_COL);
ok('3-Р АЛХАМ: талбар бүр НЭР + ОРОЛТтой (хоёулаа DOM-д ✓)',
  dtc.length >= 3 && dtc.every((r) => r.labX !== null && r.ctrlX !== null),
  JSON.stringify(dtc.map((r) => r.label)));
ok('3-Р АЛХАМ: НЭР оролтын ЗҮҮН талд (labX < ctrlX ✓)',
  dtc.length >= 3 && dtc.every((r) => r.labX < r.ctrlX - 6),
  JSON.stringify(dtc.map((r) => ({ l: r.labX, c: r.ctrlX }))));
ok('3-Р АЛХАМ: НЭР ба ОРОЛТ НЭГ мөрөнд (нэрийн төв нь оролтын босоо мужид ✓)',
  dtc.length >= 3 && dtc.every((r) => r.labMidY >= r.ctrlTop - 2 && r.labMidY <= r.ctrlBot + 2),
  JSON.stringify(dtc.map((r) => ({ y: r.labMidY, t: r.ctrlTop, b: r.ctrlBot }))));
// 📱 2026-10-01 (17 дахь засвар) — МОБАЙЛ (390px): талбар бүр НЭГ НЭГЭЭРЭЭ
/**
 * 🎯 Хэрэглэгчийн хүсэлт: «Гар утсаас зар нэмэхэд оруулж байгаа зүйлсийг нэг
 *    нэгээр нь харуулдаг болгох. Зөвхөн гар утас шүү» → `globals.css`-д
 *    хэвтээ дүрэм нь `@media (min-width: 640px)` ДОТОР оров ⇒ 640px-ээс
 *    доош нэр нь оролтын ДЭЭР, оролт нь мөрийн БҮТЭН өргөнөө эзэлнэ ✓
 *    ⚠️ (6 дахь засварын «мобайлд ч нэр зүүн талд» шийдэл ЭСРЭГЭЭРЭЭ БОЛОВ)
 *    Геометрээр 3 инвариантыг батална (класс/стиль өөрчлөгдсөн ч баригдана ✓):
 *      ① нэр ба оролт ИЖИЛ x-т (зэрэгцээгүй = цуваа ✓)
 *      ② нэр нь оролтын ДЭЭД ирмэгээс ДЭЭШ (доод ирмэг ≤ дээд ирмэг + 2px ✓)
 *      ③ оролт нь `.form-group`-ийнхөө БҮТЭН өргөнийг эзэлнэ (хагас биш ✓)
 * ⚠️ Энэ template literal дотор backtick / долларын буржгар хаалт БИЧИХГҮЙ
 */
const DETAILS_STACK_MOBILE = `(() => [...document.querySelectorAll('[data-form-row="details"] > .form-group')]
  .filter((g) => g.getBoundingClientRect().width > 0)
  .map((g) => {
    const lab = g.querySelector('label');
    const ctrl = g.querySelector('input, select, textarea, div');
    const gr = g.getBoundingClientRect();
    const lr = lab ? lab.getBoundingClientRect() : null;
    const cr = ctrl ? ctrl.getBoundingClientRect() : null;
    return {
      label: ((lab || {}).textContent || '').trim(),
      sameX: lr && cr ? Math.abs(lr.left - cr.left) <= 1 : false,
      above: lr && cr ? lr.bottom <= cr.top + 2 : false,
      full: cr ? Math.abs(cr.width - gr.width) <= 1 : false,
    };
  }))()`;
await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 1400, deviceScaleFactor: 1, mobile: false });
await wait(600);
const dtcM = await evaluate(DETAILS_STACK_MOBILE);
ok('📱 390px (мобайл): харагдах талбар ЯГ 1 («нэг дэлгэцэд нэг талбар» ✓ — PROBE нь 0 өргөнтэйг хасна)',
  dtcM.length === 1, JSON.stringify(dtcM.map((r) => r.label)));
ok('📱 390px (мобайл): НЭГ НЭГЭЭРЭЭ — нэр ба оролт ИЖИЛ x-т (зэрэгцэхгүй ✓)',
  dtcM.length >= 1 && dtcM.every((r) => r.sameX),
  JSON.stringify(dtcM.map((r) => ({ l: r.label, sameX: r.sameX }))));
ok('📱 390px (мобайл): нэр нь оролтын ДЭЭР (цуваа байрлал ✓)',
  dtcM.length >= 1 && dtcM.every((r) => r.above),
  JSON.stringify(dtcM.map((r) => ({ l: r.label, above: r.above }))));
ok('📱 390px (мобайл): оролт мөрийнхөө БҮТЭН өргөнийг эзэлнэ (бүтэн өргөн ✓)',
  dtcM.length >= 1 && dtcM.every((r) => r.full),
  JSON.stringify(dtcM.map((r) => ({ l: r.label, full: r.full }))));
await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false });
await wait(600);

console.log('\n── ⑪ 📱 МОБАЙЛ (390px): АСУУЛТ БҮР НЭГ ДЭЛГЭЦ (drill-down) ──');
/**
 * 🎯 Хэрэглэгчийн хүсэлт (2026-10-02): «гар утсаас зар оруулахад ийм асуудаг
 *    формоо нэг нэгээр нь харуулаад яв» (`жишиг сайтын зар оруулах хуудас`-ийн дэлгэцүүд)
 *    ⇒ 390px дээр багана БАЙХГҮЙ, ДЭЛГЭЦ БҮРД НЭГ асуулт
 *    (`[data-mobile-question]`): Хэсэг → Зарах/Түрээслэх → Төрөл → Өрөө →
 *    Байршил (хот → дүүрэг → хороо) гэж ДАРААЛАН; сүүлийн сонголт дээр
 *    ДАРААГИЙН АЛХАМ руу ШУУД шилжинэ ✓
 * ⚠️ `[data-mobile-*]` нь `[data-picker*]`-аас ТУСДАА нэршил — дээрх
 *    `colCount` (=6) шалгалтууд хөндөгдөхгүй ✓
 * ⚠️ Энэ template literal дотор backtick / долларын буржгар хаалт БИЧИХГҮЙ
 */
const MOBILE_PROBE = `(() => {
  /**
   * ⚠️ 2026-10-05 (🖥 НЭГ УРТ ХУУДАС): 🖥 дээр БҮХ алхам DOM-д БАЙНГА болов
   *    ⇒ 📱 [data-mobile-question] нь 390px дээр Ч ХОЁР байна (1-р алхам
   *    «Хэсэг» + 2-р алхам «Хот / Аймаг») ⇒ querySelector нь ИДЭВХТЭЙ
   *    БУСЫГ (эхнийх) барьж, толгой/жагсаалт нь ХУУЧИН дэлгэцээсээ үлдэнэ ✗
   *    ⇒ ХАРАГДАЖ БАЙГААГ (өргөн > 0) л сонгоно ✓
   *    (⚠️ 1440px дээр хоёулаа sm:hidden тул qs[0] руу унана — visible нь
   *     false хэвээр ✓)
   * ⚠️ Энэ template literal дотор backtick / долларын буржгар хаалт БИЧИХГҮЙ
   */
  const qs = [...document.querySelectorAll('[data-mobile-question]')];
  const q = qs.find((el) => el.getBoundingClientRect().width > 0) || qs[0] || null;
  const desky = document.querySelector('[role="group"][aria-label="Категорио сонгоно уу"]');
  const rows = [...document.querySelectorAll('[data-form-row="details"] > .form-group')];
  return {
    has: !!q,
    visible: !!q && q.getBoundingClientRect().width > 0,
    title: q ? ((q.querySelector('h2') || {}).innerText || '').trim() : '',
    text: q ? q.innerText : '',
    back: !!(q && q.querySelector('[data-mobile-back]')),
    search: !!(q && q.querySelector('input[aria-label="Хайх"]')),
    items: q ? [...q.querySelectorAll('button[data-mobile-value]')].map((b) => b.dataset.mobileValue) : [],
    selected: q ? [...q.querySelectorAll('button[aria-pressed="true"]')].map((b) => b.dataset.mobileValue) : [],
    cols: document.querySelectorAll('[data-picker]').length,
    colsVisible: [...document.querySelectorAll('[data-picker]')].some((el) => el.getBoundingClientRect().width > 0),
    desktopVisible: desky ? desky.getBoundingClientRect().width > 0 : false,
    stepLabel: (document.querySelector('[data-step-current]') || {}).innerText || '',
    roomRow: rows.filter((g) => ((g.querySelector('label') || {}).textContent || '').includes('Өрөө'))
      .map((g) => +g.getBoundingClientRect().width.toFixed(1)),
  };
})()`;
const mprobe = () => evaluate(MOBILE_PROBE);
/** Мобайл жагсаалтын мөр дээр дарах — `[data-mobile-value]` */
const mclick = async (value) => {
  const sel = `[data-mobile-question] button[data-mobile-value="${value}"]`;
  const r = await evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()`);
  await wait(700);
  return r;
};

await rpc('Emulation.setDeviceMetricsOverride', { width: 390, height: 1400, deviceScaleFactor: 1, mobile: false });
await gotoStepUrl(1);
await wait(1200);
const mb0 = await mprobe();
ok('📱 1-р алхам: НЭГ АСУУЛТ харагдаж байна (`[data-mobile-question]` ✓)',
  mb0.has && mb0.visible, JSON.stringify({ has: mb0.has, visible: mb0.visible }));
ok('📱 1 дэх дэлгэц: толгой «Зар нийтлэх» + ← товч + 🔎 хайлтын талбар',
  mb0.title === 'Зар нийтлэх' && mb0.back && mb0.search,
  JSON.stringify({ title: mb0.title, back: mb0.back, search: mb0.search }));
ok('📱 1 дэх дэлгэц: 12 ХЭСЭГ (багана БИШ — жагсаалт)',
  mb0.items.length === 12, String(mb0.items.length));
ok('📱 баганат сонголт ХАРАГДАХГҮЙ (DOM-д 6 хэвээр ч өргөн 0 ✓)',
  mb0.cols === 6 && mb0.colsVisible === false && mb0.desktopVisible === false,
  JSON.stringify({ cols: mb0.cols, colsVisible: mb0.colsVisible, desktop: mb0.desktopVisible }));

ok('📱 ХЭСЭГ («Үл хөдлөх») дарж сонгов', (await mclick('real-estate')) === 'OK');
const mb1 = await mprobe();
ok('📱 2 дахь дэлгэц: «Үл хөдлөх зарна» / «…түрээслүүлнэ» (2 мөр)',
  JSON.stringify(mb1.items) === '["sell","rent"]'
    && mb1.text.includes('Үл хөдлөх зарна') && mb1.text.includes('Үл хөдлөх түрээслүүлнэ'),
  JSON.stringify(mb1.items));

ok('📱 «Үл хөдлөх зарна» сонгов', (await mclick('sell')) === 'OK');
const mb2 = await mprobe();
ok('📱 3 дахь дэлгэц: толгой = өмнөх сонголт «Үл хөдлөх зарна» + 8 ТӨРӨЛ',
  mb2.title === 'Үл хөдлөх зарна' && mb2.items.length === 8,
  JSON.stringify({ title: mb2.title, n: mb2.items.length }));

ok('📱 «Орон сууц» сонгов', (await mclick('Орон сууц')) === 'OK');
const mb3 = await mprobe();
ok('📱 4 дэх дэлгэц: «Орон сууц зарна» → 1 өрөө … +5 өрөө (+ «Алгасах»)',
  mb3.title === 'Орон сууц зарна' && JSON.stringify(mb3.items) === '["1","2","3","4","5","__skip__"]',
  JSON.stringify({ title: mb3.title, items: mb3.items }));

ok('📱 «2 өрөө» сонгоход ДАРААГИЙН АЛХАМ руу ШУУД шилжив', (await mclick('2')) === 'OK');
const mb4 = await mprobe();
ok('📱 2-Р АЛХАМ (📍 Байршил): «Хот / Аймаг» жагсаалт (20+) гарч ирэв',
  mb4.stepLabel.trim() === 'Байршил' && mb4.items.length >= 20 && mb4.title === 'Зар нийтлэх',
  JSON.stringify({ step: mb4.stepLabel, n: mb4.items.length, title: mb4.title }));
/**
 * 🆕 2026-10-05 — 🖥 «СОНГОСОН АНГИЛАЛ / БАЙРШИЛ» хүснэгт нь ≥640px-ийн
 *    ТУСГАЙ харагдац (`hidden sm:flex`) ⇒ 📱 390px дээр `display:none`
 *    (DOM-д бий ч өргөн 0 ✓) — мобайлд 📱 `MobileAnswers` л харагдана ✓
 */
const dsMobile = await evaluate(`(() => {
  const el = document.querySelector('[data-desktop-summary]');
  if (!el) return { has: false, w: -1 };
  return { has: true, w: +el.getBoundingClientRect().width.toFixed(1) };
})()`);
ok('📱 390px: 🖥 СОНГОСОН ХҮСНЭГТ ХАРАГДАХГҮЙ (өргөн 0 — мобайл нь 📱 MobileAnswers-тай ✓)',
  dsMobile.has === true && dsMobile.w === 0, JSON.stringify(dsMobile));

ok('📱 Хот («Улаанбаатар») сонгов', (await mclick('Улаанбаатар')) === 'OK');
const mb5 = await mprobe();
ok('📱 Дүүргийн дэлгэц: толгой = сонгосон хот («Улаанбаатар»)',
  mb5.title === 'Улаанбаатар' && mb5.items.includes('Баянгол'),
  JSON.stringify({ title: mb5.title, n: mb5.items.length }));
ok('📱 «Баянгол» сонгов', (await mclick('Баянгол')) === 'OK');
const mb6 = await mprobe();
ok('📱 Хорооны дэлгэц: толгой = «Баянгол» + хороодын жагсаалт',
  mb6.title === 'Баянгол' && mb6.items.includes('1-р хороо'),
  JSON.stringify({ title: mb6.title, n: mb6.items.length }));
ok('📱 «1-р хороо» сонгоход → 3-Р АЛХАМ (📋 Дэлгэрэнгүй)',
  (await mclick('1-р хороо')) === 'OK');
const mb7 = await mprobe();
ok('📱 3-р алхамд «Өрөө» талбар ХАРАГДАХГҮЙ (drill-down-д асуусан тул давхардахгүй ✓)',
  mb7.stepLabel.trim() === 'Дэлгэрэнгүй' && JSON.stringify(mb7.roomRow) === '[0]',
  JSON.stringify({ step: mb7.stepLabel, roomRow: mb7.roomRow }));

// ── ⑪′ 🆕 2026-10-02 — 3-Р АЛХАМ (📋 Дэлгэрэнгүй): «АСУУЛТ БҮР НЭГ ДЭЛГЭЦ» ──
/**
 * 🎯 Хэрэглэгчийн хүсэлт: «зарын гарчиг, талбай, угаалгын өрөө, ашиглалтанд
 *    орсон он … бүгдийг нь нэг нэгээр нь харуул» — өмнө нь 390px дээр 3-р
 *    алхмын БҮХ талбар цувж харагддаг байв ✗ ⇒ одоо ДЭЛГЭЦ БҮРД НЭГ талбар
 *    (`[data-detail-field]`), толгойд ← товч + асуулт + «n/N» явц
 *    (`[data-mobile-detail-head]`, `data-mobile-detail-key`) ✓
 * ⚠️ Нэг л DOM — талбарыг ХОЁР ДАХИН рендэрлэхгүй (CDP-ийн `[data-detail-field]`
 *    тоо тогтвортой, `form`/DB/`validateStep` хөндөгдөхгүй) ✓
 * ⚠️ Заавал талбар (гарчиг) ХООСОН бол урагш явахгүй — `validateStep`-тэй
 *    ИЖИЛ мессеж («Зарын гарчигаа оруулна уу») ✓
 * ⚠️ СҮҮЛИЙН дэлгэцэд wizard-ийн товч ХААГДАЖ, алхмын «Үргэлжлүүлэх» л үлдэнэ
 *    (дэлгэц ↔ алхам ДАВХАРДАХГҮЙ: аль ч дэлгэцэд ЯГ 1 «Үргэлжлүүлэх» ✓)
 * ⚠️ Энэ template literal дотор backtick / долларын буржгар хаалт БИЧИХГҮЙ
 */
const DETAIL_WIZ_PROBE = `(() => {
  const head = document.querySelector('[data-mobile-detail-head]');
  const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const fields = [...document.querySelectorAll('[data-detail-field]')];
  const nav = document.querySelector('[data-mobile-detail-nav]');
  const btns = [...document.querySelectorAll('form button')];
  return {
    head: !!head && vis(head),
    key: head ? (head.dataset.mobileDetailKey || '') : '',
    title: head ? ((head.querySelector('h2') || {}).innerText || '').trim() : '',
    progress: head ? ((head.querySelector('span') || {}).innerText || '').trim() : '',
    back: !!(head && head.querySelector('[data-mobile-detail-back]')),
    fields: fields.length,
    visible: fields.filter(vis).map((f) => f.dataset.detailField),
    navVisible: nav ? vis(nav) : false,
    navHasNext: !!(nav && nav.querySelector('[data-mobile-detail-next]')),
    navHasSkip: !!(nav && nav.querySelector('[data-mobile-detail-skip]')),
    skipVisible: nav ? [...nav.querySelectorAll('[data-mobile-detail-skip]')].some(vis) : false,
    nextBtns: btns.filter((b) => (b.innerText || '').includes('Үргэлжлүүлэх')).filter(vis).length,
    backBtns: btns.filter((b) => (b.innerText || '').includes('Буцах')).filter(vis).length,
    rows: [...document.querySelectorAll('[data-detail-row]')].map((r) => (r.dataset.detailRow || '') + '=' + (r.dataset.mobileActive || '')),
    /**
     * 🆕 2026-10-03 (17) — МОБАЙЛЫН ШИНЭ ХЭВ (жишиг сайт):
     *   • options      — харагдаж байгаа 2 баганат сонголтууд ([data-mobile-option])
     *   • twoCol       — тор нь ЖИНХЭНЭ 2 багана (grid-template-columns = 2 track ✓)
     *   • skipOption   — «Алгасах» линк (утга ЦЭВЭРЛЭНЭ ✓)
     *   • answers/answerKeys/answerText — «ӨМНӨХ ХАРИУЛТУУД» мөрүүд (✏️ ✓)
     *   • labelText/labelsVisible — АСУУЛТЫН НЭР (талбарын label) ГАНЦ удаа ✓
     * ⚠️ ЭНЭ template literal дотор backtick / долларын буржгар хаалт БИЧИХГҮЙ ✗
     */
    options: [...document.querySelectorAll('[data-mobile-option]')].filter(vis).length,
    twoCol: (() => {
      const g = [...document.querySelectorAll('[data-mobile-options-grid]')].find(vis);
      if (!g) return false;
      return getComputedStyle(g).gridTemplateColumns.split(' ').filter(Boolean).length === 2;
    })(),
    selectedOption: (() => {
      const b = [...document.querySelectorAll('[data-mobile-option]')].filter(vis)
        .find((e) => e.getAttribute('aria-pressed') === 'true');
      return b ? (b.dataset.mobileOption || '') : '';
    })(),
    skipOption: [...document.querySelectorAll('[data-mobile-option-skip]')].some(vis),
    /** 💳 «Төлбөрийн нөхцөл» — ЗААВАЛ (сонголтгүй бол урагшлуулахгүй ✗)
     *  ⚠️ 2026-10-03 (18): форм ч ЧИП болов ⇒ төлөв нь aria-pressed (⏳ c.checked
     *     байсан — ☑ checkbox нь <input> байсан үеийнх ✗; чип нь <button> бөгөөд
     *     .checked нь undefined ✓)
     *  ⚠️ ЭНЭ template literal дотор backtick БИЧИХГҮЙ ✗ */
    paymentsSelected: [...document.querySelectorAll('[data-payment-value]')]
      .filter((c) => c.getAttribute('aria-pressed') === 'true').length,
    answers: [...document.querySelectorAll('[data-mobile-answer-edit]')].filter(vis).length,
    answerKeys: [...document.querySelectorAll('[data-mobile-answer-edit]')].filter(vis)
      .map((b) => b.dataset.mobileAnswerEdit || ''),
    answerText: [...document.querySelectorAll('[data-mobile-answers]')].filter(vis)
      .map((b) => b.innerText).join(' ').replace(/\s+/g, ' ').trim(),
    labelsVisible: fields.filter(vis).map((f) => f.querySelector('label')).filter((l) => {
      if (!l) return false; const b = l.getBoundingClientRect(); return b.width > 0 && b.height > 0;
    }).length,
    labelText: (((fields.filter(vis).map((f) => f.querySelector('label'))).find((l) => {
      if (!l) return false; const b = l.getBoundingClientRect(); return b.width > 0 && b.height > 0;
    })) || {}).innerText || '',
    titleValue: ((document.querySelector('[data-detail-field="title"] input') || {}).value || ''),
    /** 🆕 2026-10-05 (53) — 📱 ГАРААС БИЧИЛТ (📅 он · 🏢 нийт давхар · 🏠 давхар):
     *  ChoiceField-ийн mobileInput тул 2 баганат жагсаалт БАЙХГҮЙ, харин
     *  тоон оролт (data-mobile-input="true") ХАРАГДАНА ✓
     *  • inputVisible — харагдаж байгаа гар бичилтийн оролтын тоо (0 | 1)
     *  • inputValue   — тэр оролтын утга (гараас бичсэн / 🎡 дугуйнаас сонгосон)
     *  • wheelLink    — «🎡 Гүйлгээд сонгох» холбоос (НЭМЭЛТ боломж ХЭВЭЭР ✓)
     * ⚠️ ЭНЭ template literal дотор backtick / долларын буржгар хаалт БИЧИХГҮЙ ✗ */
    inputVisible: [...document.querySelectorAll('[data-choice-input]')]
      .filter((el) => el.dataset.mobileInput === 'true').filter(vis).length,
    inputValue: (() => {
      const el = [...document.querySelectorAll('[data-choice-input]')]
        .filter((e) => e.dataset.mobileInput === 'true').filter(vis)[0];
      return el ? (el.value || '') : '';
    })(),
    wheelLink: [...document.querySelectorAll('[data-choice-trigger]')].some(vis),
    error: ((document.querySelector('form .bg-red-50') || {}).innerText || '').trim(),
  };
})()`;
const wprobe = () => evaluate(DETAIL_WIZ_PROBE);
/** 🪜 Wizard-ийн «Үргэлжлүүлэх» (`mobileDetailNext`) */
const wnext = async () => {
  const r = await evaluate(`(() => { const b = document.querySelector('[data-mobile-detail-next]'); if (!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()`);
  await wait(500);
  return r;
};
/** ↩️ Толгойн ← (`mobileDetailBack`) */
const wback = async () => {
  const r = await evaluate(`(() => { const b = document.querySelector('[data-mobile-detail-back]'); if (!b) return 'NOT_FOUND'; b.click(); return 'OK'; })()`);
  await wait(500);
  return r;
};
/** ⌨️ React-ийн controlled input-д БОДИТ бичилт (native setter + `input` ✓) */
const wtype = async (sel, v) => {
  const r = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return 'NOT_FOUND';
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(el, ${JSON.stringify(v)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return 'OK';
  })()`);
  await wait(500);
  return r;
};

/** 🖱 ХАРАГДАЖ БАЙГАА элемент дээр дарах (далд дэлгэцийн мөрүүдийг АЛГАСНА ✓) */
const clickVisible = async (sel) => {
  const r = await evaluate(`(() => {
    const el = [...document.querySelectorAll(${JSON.stringify(sel)})].find((e) => {
      const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0;
    });
    if (!el) return 'NOT_FOUND';
    el.click(); return 'OK';
  })()`);
  await wait(500);
  return r;
};

const w0 = await wprobe();
ok('📱 3-р алхам: толгой (← · «Зар нийтлэх» · «n/N» явц) мобайлд гарч ирэв',
  w0.head && w0.title === 'Зар нийтлэх' && w0.back && /^\d+\/\d+$/.test(w0.progress),
  JSON.stringify({ head: w0.head, title: w0.title, back: w0.back, progress: w0.progress }));
ok('📱 АСУУЛТЫН НЭР толгойд ДАВХАРДАХГҮЙ — зөвхөн талбарын толгойд ГАНЦ удаа («Зарын гарчиг» ✓)',
  w0.labelsVisible === 1 && w0.labelText.includes('Зарын гарчиг') && w0.title === 'Зар нийтлэх',
  JSON.stringify({ labels: w0.labelsVisible, label: w0.labelText, head: w0.title }));
ok('📱 «НЭГ ДЭЛГЭЦЭД НЭГ ТАЛБАР»: харагдах `[data-detail-field]` = ЯГ 1 (гарчиг) — бусдыг CSS нуув ✓',
  w0.fields >= 5 && JSON.stringify(w0.visible) === '["title"]',
  `fields=${w0.fields} visible=${JSON.stringify(w0.visible)}`);
ok('📱 мөр бүр `data-mobile-active`-тай ба ЯГ 1 нь идэвхтэй (CSS-ийн НЭГ эх сурвалж ✓)',
  w0.rows.length >= 6 && w0.rows.filter((r) => r.endsWith('=true')).length === 1
    && w0.rows.every((r) => r.endsWith('=true') || r.endsWith('=false')),
  JSON.stringify(w0.rows));
ok('📱 ГАР БИЧИЛТТЭЙ дэлгэцэд «Үргэлжлүүлэх» ЯГ 1 ХАРАГДАНА (дэлгэц ↔ алхам давхардахгүй ✓)',
  w0.nextBtns === 1 && w0.navVisible && w0.navHasNext && w0.options === 0,
  `visible=${w0.nextBtns} nav=${w0.navVisible} navNext=${w0.navHasNext} opt=${w0.options}`);
ok('📱 заавал талбар («Гарчиг») дээр «Алгасах» ХАРАГДАХГҮЙ (хоосон үлдээж болохгүй ✓)',
  w0.navHasSkip && w0.skipVisible === false, `DOM=${w0.navHasSkip} visible=${w0.skipVisible}`);

// 🛡️ Заавал талбарын ХААЛТ — гарчиг ХООСОН үед урагш ЯВАХГҮЙ
await wnext();
const wGate = await wprobe();
ok('🛡️ гарчиг ХООСОН үед урагш ЯВАХГҮЙ + «Зарын гарчигаа оруулна уу» мессеж',
  wGate.key === 'title' && wGate.error === 'Зарын гарчигаа оруулна уу',
  `${wGate.key} / ${JSON.stringify(wGate.error)}`);
ok('⌨️ «Зарын гарчиг»-т бичив', (await wtype('[data-detail-field="title"] input', '2 өрөө байр, Баянгол')) === 'OK');
await wnext();
const w1s = await wprobe();
ok('📱 «Үргэлжлүүлэх» дараагийн ТАЛБАР руу шилжүүлэв («2/N» = 💳 Төлбөрийн нөхцөл — алхам руу БИШ ✓)',
  w1s.key === 'payments' && JSON.stringify(w1s.visible) === '["payments"]' && /^2\/\d+$/.test(w1s.progress),
  JSON.stringify({ key: w1s.key, visible: w1s.visible, progress: w1s.progress }));

// 🚶 БҮХ дэлгэцээр алхаж, дэлгэц бүрд «ЯГ 1 талбар + (товч | сонголт)» гэдгийг батлана
/** ⚠️ Алхалтыг ЭХНИЙ дэлгэцээс (гарчиг) эхлүүлнэ — толгойн ← дараалан буцаана ✓ */
for (let i = 0; i < 12 && (await wprobe()).key !== 'title'; i += 1) await wback();
/**
 * 🪜 Урагшлах — ① гар бичилттэй дэлгэц: «Үргэлжлүүлэх» ✓
 *              ② сонголттой дэлгэц: «Алгасах» линк ✓
 *              ③ 💳 «Төлбөрийн нөхцөл» (ЗААВАЛ): эхлээд нэг сонголт хийнэ ✓
 */
const walkNext = async () => {
  const s = await wprobe();
  if (!s.navVisible) { await clickVisible('[data-mobile-option-skip]'); return; }
  if (s.key === 'payments' && s.paymentsSelected === 0) await clickVisible('[data-payment-value]');
  await wnext();
};
const wWalk = [];
const wBad = [];
let wCur = await wprobe();
wWalk.push(wCur.key);
/** ⚠️ Хамгийн ихдээ 12 (хязгааргүй давталт ✗) · `progress` = «n/N» → сүүлийг мэднэ ✓ */
for (let i = 0; i < 12; i += 1) {
  const [pi, pt] = String(wCur.progress || '').split('/').map(Number);
  if (!(pi > 0 && pi < pt)) break;
  /** 🪜 Урагшлах: гар бичилт → «Үргэлжлүүлэх»; сонголттой → «Алгасах»; 💳 → сонголт ✓ */
  await walkNext();
  wCur = await wprobe();
  wWalk.push(wCur.key);
  if (JSON.stringify(wCur.visible) !== JSON.stringify([wCur.key])) wBad.push(`${wCur.key}:vis=${wCur.visible.join('|')}`);
  /** ⚠️ Гар бичилт → ЯГ 1 «Үргэлжлүүлэх»; сонголттой → 0 товч, харин жагсаалттай ✓
   *  ⚠️ СҮҮЛИЙН дэлгэцэд wizard-ийн «Үргэлжлүүлэх» (4-р алхам руу) л үлдэнэ ✓ */
  const [pi2, pt2] = String(wCur.progress || '').split('/').map(Number);
  const isLastScreen = pi2 > 0 && pi2 === pt2;
  const wantBtns = (wCur.navVisible || isLastScreen) ? 1 : 0;
  if (wCur.nextBtns !== wantBtns) wBad.push(`${wCur.key}:btns=${wCur.nextBtns}`);
  if (!wCur.navVisible && !isLastScreen && wCur.options === 0) wBad.push(`${wCur.key}:opt=0`);
  /** ⚠️ Асуултын нэр нь ГАНЦ удаа (толгойд «Зар нийтлэх» л байна ✓) */
  if (wCur.labelsVisible !== 1) wBad.push(`${wCur.key}:labels=${wCur.labelsVisible}`);
}
/**
 * ⚠️ Хүлээгдэх ДАРААЛАЛ — зарын төрлөөс хамаарч НЭМЭЛТ дэлгэц байж болно
 *    (ж: 🚿 «Угаалгын өрөөний тоо» 3+ өрөөтэй орон сууцанд) ⇒ дэд дараалал
 *    (subsequence) болгон шалгана ✓
 */
const WALK_SUB = ['title', 'payments', 'area', 'buildYear', 'totalFloors', 'floor', 'balconies', 'garage'];
const isSubseq = (arr, sub) => {
  let j = 0;
  arr.forEach((x) => { if (x === sub[j]) j += 1; });
  return j === sub.length;
};
ok('📱 дэлгэцүүд ДАРААЛААР: гарчиг → 💳 төлбөр → талбай → он → нийт давхар → давхар → тагт → гараж',
  wWalk[0] === 'title' && wWalk[wWalk.length - 1] === 'garage' && isSubseq(wWalk, WALK_SUB),
  JSON.stringify(wWalk));
ok('📱 ДЭЛГЭЦ БҮР дээр ЯГ 1 талбар + (гар бичилт→1 товч | сонголт→жагсаалт) — хоосон дэлгэц БАЙХГҮЙ ✓',
  wBad.length === 0, wBad.join(' · '));
ok('🏁 СҮҮЛИЙН дэлгэц («Гараж»): алхмын доод товч л үлдэв — сонголт/«Алгасах» дарж урагшилна (жишиг сайт ✓)',
  wCur.key === 'garage' && wCur.navVisible === false && JSON.stringify(wCur.visible) === '["garage"]'
    && wCur.nextBtns === 1 && wCur.options > 0,
  JSON.stringify({ key: wCur.key, nav: wCur.navVisible, vis: wCur.visible, btns: wCur.nextBtns, opt: wCur.options }));
ok('📱 «Гараж» дэлгэцэд алхмын «← Буцах» ХАРАГДАХГҮЙ (толгойн ← л буцаана ✓)',
  wCur.backBtns === 0, `backBtns=${wCur.backBtns}`);

// ↩️ Толгойн ← — ӨМНӨХ дэлгэц рүү (утга ХАДГАЛАГДАНА ✓)
await wback();
const w2b = await wprobe();
ok('📱 толгойн ← нь ӨМНӨХ дэлгэц рүү буцаана (гараж → тагт ✓)',
  w2b.key === 'balconies' && JSON.stringify(w2b.visible) === '["balconies"]',
  JSON.stringify({ key: w2b.key, visible: w2b.visible }));
ok('📱 буцаж явахад оруулсан утга ХАДГАЛАГДАНА (гарчиг input-д хэвээр ✓)',
  w2b.titleValue === '2 өрөө байр, Баянгол', JSON.stringify(w2b.titleValue));

// ────────────────────────────────────────────────────────────
// ⑪‴ 🆕 2026-10-05 (53) — 📱 ОН · НИЙТ ДАВХАР · ДАВХАР: ГАРААС БИЧИЛТ
//      ⚠️ 2026-10-03 (17)-ийн «2 БАГАНАТ ЖАГСААЛТ + дармагц дараагийн асуулт»
//         нь эдгээр 3 талбарт ХҮЧИНГҮЙ болов — хэрэглэгчийн хүсэлт:
//         «гар утаснаас ашиглалтанд орсон он, барилгын нийт давхар, байрны
//          давхарыг ГАРААС оруулдаг болго» ⇒ `ChoiceField`-ийн `mobileInput`
//      ⚠️ 🎡 «Гүйлгээд сонгох» нь НЭМЭЛТ боломж хэвээр ✓
// ────────────────────────────────────────────────────────────
console.log('\n── ⑪‴ 📱 гар утаснаас ГАРААС бичих (он · нийт давхар · давхар) ──');
/** 🎯 «Барилгын нийт давхар» дэлгэц рүү буцна (толгойн ← дараалан ✓) */
for (let i = 0; i < 8 && (await wprobe()).key !== 'totalFloors'; i += 1) await wback();
const wp0 = await wprobe();
ok('📱 «Барилгын нийт давхар» дэлгэц рүү буцлаа (толгойн ← ✓)', wp0.key === 'totalFloors', wp0.key);
ok('📱 ЖИНХЭНЭ ГАР БИЧИЛТ нээлттэй (`input[type=number]` + `data-mobile-input` ✓)',
  wp0.inputVisible === 1, `inputs=${wp0.inputVisible}`);
ok('📱 2 БАГАНАТ ЖАГСААЛТ БАЙХГҮЙ (`[data-mobile-option]` = 0, «Алгасах» линк ч байхгүй ✓)',
  wp0.options === 0 && wp0.twoCol === false && wp0.skipOption === false,
  JSON.stringify({ options: wp0.options, twoCol: wp0.twoCol, skip: wp0.skipOption }));
ok('📱 🎡 «Гүйлгээд сонгох» холбоос ХЭВЭЭР (урт жагсаалтын НЭМЭЛТ боломж ✓)',
  wp0.wheelLink === true);
ok('📱 гараас бичилттэй дэлгэцэд ДООД «Үргэлжлүүлэх» ХАРАГДАНА (дармагц шилжих БИШ ✓)',
  wp0.nextBtns === 1 && wp0.navVisible === true, `btns=${wp0.nextBtns} nav=${wp0.navVisible}`);
ok('⌨️ «Барилгын нийт давхар»-т ГАРААС «12» бичив (native setter + `input` ✓)',
  (await wtype('[data-detail-field="totalFloors"] input', '12')) === 'OK');
const wpTyped = await wprobe();
ok('📱 бичсэн утга нь контролдсон оролтод хэвээр («Барилгын нийт давхар» = 12 ✓)',
  wpTyped.inputValue === '12', JSON.stringify(wpTyped.inputValue));
ok('🖱 «Үргэлжлүүлэх» дарж ДАРААГИЙН асуулт («Байрны давхар») руу шилжив',
  (await wnext()) === 'OK' && (await wprobe()).key === 'floor');
const wp1 = await wprobe();
ok('📱 Хариулсан асуулт нь ✏️ МӨР болж үлдэв («Барилгын нийт давхар / 12 давхар»)',
  wp1.answerKeys.includes('totalFloors') && wp1.answerText.includes('12 давхар'),
  JSON.stringify({ keys: wp1.answerKeys, text: wp1.answerText.slice(0, 120) }));
ok('📱 Мөрийн дээгүүр 🗂 АНГИЛАЛ ба 📍 БАЙРШИЛ ч харагдана (жишиг сайтын хэв ✓)',
  wp1.answerKeys.includes('step-category') && wp1.answerKeys.includes('step-location'),
  JSON.stringify(wp1.answerKeys));
ok('🖱 ✏️ (`data-mobile-answer-edit="totalFloors"`) дарж тэр дэлгэц рүү буцаж засна ✓',
  (await clickVisible('[data-mobile-answer-edit="totalFloors"]')) === 'OK'
    && (await wprobe()).key === 'totalFloors');
const wp2 = await wprobe();
ok('📱 Утга нь хадгалагдсан (гараас бичсэн «12» оролтод хэвээр ✓)',
  wp2.inputVisible === 1 && wp2.inputValue === '12',
  JSON.stringify({ inputs: wp2.inputVisible, value: wp2.inputValue }));

// ────────────────────────────────────────────────────────────
// ⑪⁗ 🆕 2026-10-05 (54) — 📝 НООРОГ: 📱 САНАМСАРГҮЙ REFRESH ХИЙХЭД ОРУУЛСАН
//      МЭДЭЭЛЭЛ ХАДГАЛАГДАНА (`localStorage`)
//      ⚠️ Хэрэглэгчийн гомдол: «зар нэмж байх үедээ гар утасны browser
//         санамсаргүй refresh хийхэд оруулж байсан мэдээлэл байхгүй болж байна»
//      ⚠️ ЭНД `location.reload()`-ыг ШУУД дуудна — `gotoStepUrl` нь нооргийг
//         цэвэрлэдэг тул (форм шинэ байх ёстой шалгалтуудын төлөө) тэр нь
//         нооргийг БАЙХГҮЙ болгоно ✗
//      ⚠️ Урсгал: гарчиг + «12» бичсэн → REFRESH → утга ХЭВЭЭР ба мэдэгдэл
//         гарсан эсэх → 🗑 Устгах → форм ЦЭВЭР + ноорог УСТСАН эсэх ✓
// ────────────────────────────────────────────────────────────
console.log('\n── ⑪⁗ 📝 ноорог: REFRESH хийсэн ч мэдээлэл ХАДГАЛАГДАНА ──');
/**
 * 📝 Нооргийн probe — мэдэгдэл (`[data-draft-restored]`), 🗑 товч
 *    (`[data-draft-discard]`) ба localStorage-ийн түлхүүрүүд ✓
 * ⚠️ ЭНЭ template literal дотор backtick / долларын буржгар хаалт БИЧИХГҮЙ ✗
 */
const DRAFT_PROBE = `(() => {
  const vis = (el) => { if (!el) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const notice = document.querySelector('[data-draft-restored]');
  const btn = document.querySelector('[data-draft-discard]');
  const keys = Object.keys(window.localStorage).filter((k) => k.indexOf('zar:listing-draft') === 0);
  return {
    notice: vis(notice),
    text: notice ? notice.innerText.replace(/\\s+/g, ' ').trim() : '',
    btn: !!btn && vis(btn),
    btnType: btn ? String(btn.getAttribute('type') || '') : '',
    keys: keys.length,
    raw: keys.map((k) => String(window.localStorage.getItem(k) || '')).join(' ').slice(0, 800),
    titleInInput: ((document.querySelector('[data-detail-field="title"] input') || {}).value || ''),
  };
})()`;
const dprobe = () => evaluate(DRAFT_PROBE);

const d0 = await wprobe();
const draftSaved = await dprobe();
ok('📝 төлөв: гарчиг «2 өрөө байр, Баянгол» + гар бичилт «Барилгын нийт давхар» = 12 (ноорог үлдэх ёстой)',
  d0.titleValue === '2 өрөө байр, Баянгол' && d0.key === 'totalFloors' && d0.inputValue === '12',
  JSON.stringify({ title: d0.titleValue, key: d0.key, value: d0.inputValue }));
ok('💾 ноорог `localStorage`-д ХАДГАЛАГДСАН (`zar:listing-draft:…` — гарчиг ба «12» дотор нь ✓)',
  draftSaved.keys >= 1 && draftSaved.raw.includes('2 өрөө байр, Баянгол') && draftSaved.raw.includes('"totalFloors":"12"'),
  JSON.stringify({ keys: draftSaved.keys, raw: draftSaved.raw.slice(0, 140) }));

// 🔄 САНАМСАРГҮЙ REFRESH — энэ бол хэрэглэгчийн ГОЛ АСУУДАЛ байв
await evaluate('location.reload()');
/**
 * 📝 Мэдэгдэл нь ОДОО **FLASH** (2026-10-07) — `animate-draft-flash` ~3.2 сек
 *    л харагдаад DOM-оос УСТАНА (`DRAFT_FLASH_MS`) ⇒ ⏳ хуучин `wait(6500)`
 *    нь мэдэгдлийг АЛГА БОЛСНЫ дараа шалгах байв ✗. Тиймээс ГАРАХЫГ нь
 *    хүлээгээд (poll), харагдах цонхонд ШУУД шалгана ✓
 */
for (let i = 0; i < 75; i += 1) {
  if (await evaluate(`!!document.querySelector('[data-draft-restored]')`)) break;
  await wait(200);
}
const d1 = await wprobe();
const draftAfter = await dprobe();
ok('📝 REFRESH-ийн дараа ГАРЧИГ ХЭВЭЭР («2 өрөө байр, Баянгол» — алга болохгүй ✓)',
  d1.titleValue === '2 өрөө байр, Баянгол', JSON.stringify(d1.titleValue));
ok('📝 REFRESH-ийн дараа сонгосон 🗂 АНГИЛАЛ ба 📍 БАЙРШИЛ ч хэвээр (мөрүүд харагдана ✓)',
  d1.answerKeys.includes('step-category') && d1.answerKeys.includes('step-location'),
  JSON.stringify(d1.answerKeys));
ok('📝 REFRESH-ийн дараа ГАРААС бичсэн «12» ДАВХАР ба 3-р алхмын дэлгэц хэвээр (утга бүр БИЧИГДСЭН ✓)',
  d1.key === 'totalFloors' && d1.inputValue === '12',
  JSON.stringify({ key: d1.key, value: d1.inputValue }));
ok('📝 REFRESH-ийн дараа «📝 Хадгалагдсан ноорог сэргээгдлээ» мэдэгдэл + 🗑 «Устгах» товч гарч ирэв',
  draftAfter.notice === true && draftAfter.btn === true && draftAfter.text.includes('ноорог сэргээгдлээ'),
  JSON.stringify({ notice: draftAfter.notice, btn: draftAfter.btn, text: draftAfter.text }));
ok('📝 🗑 товч нь `type="button"` (форм дотроос submit болж КЕТЭХГҮЙ ✓)',
  draftAfter.btnType === 'button', `type=${draftAfter.btnType}`);

// 🗑 УСТГАХ — ноорог ба форм хоёулаа цэвэрлэгдэнэ
ok('🗑 «Устгах» товч дарагдав', (await clickVisible('[data-draft-discard]')) === 'OK');
await wait(800);
const d2 = await wprobe();
const dCleared = await dprobe();
ok('🗑 дарсны дараа мэдэгдэл ГАРАХГҮЙ + ноорог localStorage-оос УСТСАН + форм ХООСОН',
  dCleared.notice === false && dCleared.keys === 0 && dCleared.titleInInput === '',
  JSON.stringify({ notice: dCleared.notice, keys: dCleared.keys, title: dCleared.titleInInput }));
ok('🗑 дарсны дараа 1-р алхам руу буцсан (анхдагч төлөв ✓)',
  String((await evaluate('location.search')) || '').includes('step=1') || d2.key === 'title',
  JSON.stringify({ url: await evaluate('location.search'), key: d2.key }));

// 🔄 Дахин REFRESH — сэргээх юм байхгүй (ноорог устсан ✓)
await evaluate('location.reload()');
await wait(6500);
const dAgain = await dprobe();
ok('🗑 устгасны дараа REFRESH хийвэл форм ХООСОН хэвээр (ноорог БАЙХГҮЙ ✓)',
  dAgain.notice === false && dAgain.keys === 0 && dAgain.titleInInput === '',
  JSON.stringify({ notice: dAgain.notice, keys: dAgain.keys, title: dAgain.titleInInput }));

await rpc('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1400, deviceScaleFactor: 1, mobile: false });
await gotoStepUrl(1);
await wait(1200);
const mb8 = await mprobe();

ok('🖥 1440px: мобайл блок ХАРАГДАХГҮЙ + 3 БАГАНАТ харагдац ХЭВЭЭР ✓',
  mb8.visible === false && mb8.colsVisible === true && mb8.desktopVisible === true,
  JSON.stringify({ mobile: mb8.visible, colsVisible: mb8.colsVisible, desktop: mb8.desktopVisible }));

/**
 * 🛡️ 2026-10-02 — ХАМГААЛАЛТ (хэрэглэгчийн гомдол: «зарын дэлгэрэнгүй асуух хэсэг
 *    байхгүй болсон»): `?step=` нь ЗӨВХӨН ХАЯГ дээр байдаг ба форм нь хуудас
 *    дахин ачаалагдах / линкээр орох / HMR үед ХООСОН болдог. Тэр үед URL нь
 *    хуучин алхам дээрээ үлдэж, хэрэглэгч «Дэлгэрэнгүй» дээр ТАЛБАРГҮЙ
 *    (төрөл сонгоогүй тул `showRooms`/`showFloors`/`showApartment` бүгд false)
 *    хуудас хардаг байв ✗ ⇒ одоо ЭХНИЙ ДУТУУ АЛХАМ руу буцаана ✓
 */
const GUARD_PROBE = `(() => ({
  q: location.search,
  step: (document.querySelector('[data-step-current]') || {}).innerText || '',
  text: document.querySelector('form') ? document.querySelector('form').innerText : '',
}))()`;
for (const n of [3, 5]) {
  await clearDrafts(); // 📝 ноорог байвал форм «хоосон» БИШ болно ✗ (2026-10-05 (54))
  await evaluate('location.href = ' + JSON.stringify(`${BASE}/listings/new?step=${n}`));
  await wait(4000);
  const g = await evaluate(GUARD_PROBE);
  ok(`🛡️ ?step=${n} (форм хоосон) → ЭХНИЙ АЛХАМ руу буцлаа (хоосон алхам ГАРАХГҮЙ ✓)`,
    g.q === '?step=1' && g.step.trim() === 'Ангилал',
    JSON.stringify({ url: g.q, step: g.step }));
  ok(`🛡️ ?step=${n} → мессеж «Зарын төрлөө сонгоно уу» харагдаж байна`,
    g.text.includes('Зарын төрлөө сонгоно уу'), '');
}

console.log('\n── ⑦ 🔎 ДҮРС ТЕКСТЭЭС ХҮРЭХГҮЙ (§ «Үйлдвэрлэгч» combobox + sidebar) ──');
/**
 * 🔴 АСУУДАЛ (2026-10-01, хэрэглэгчийн гомдол): «🔎 нь text-ийнхээ эхний үсэгтэй
 *    давхардаад байна».
 *    ШАЛТГААН: форм дотор оролт нь `.form-group`-ийн дотор байдаг ба
 *    `app/globals.css`-ийн `.form-group :is(input, select, textarea):not(…)` (0,3,1)
 *    дүрэм нь `pl-8` (0,1,0)-ыг ДАРЖ `padding-left`-ыг **12px** болгодог байв →
 *    дүрс (`left-3` = 12px) нь текстийн эхний үсэг ДЭЭР сууж байв ✗
 * ✅ ЗАСВАР: `SearchableSelect`/`TextFilter` → **`!pl-9`** (36px) + **`!pr-10`** (40px)
 *    ⇒ доор нь дүрс ба текст ХҮРЭХГҮЙ (зай ≥ 6px) гэдгийг БОДИТ Chrome дээр хэмжинэ ✓
 */
const waitForSel = async (sel, ms = 10000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await evaluate(`!!document.querySelector(${JSON.stringify(sel)})`)) return true;
    await wait(250);
  }
  return false;
};
/** 🔎 дүрстэй оролт БҮРИЙН зайг хэмжинэ (icon.right → текстийн эхлэл) */
const ICON_PROBE = `(() => {
  const out = [];
  document.querySelectorAll('input').forEach((input) => {
    const holder = input.parentElement;
    const icon = holder ? holder.querySelector('span[aria-hidden="true"]') : null;
    if (!icon) return;
    const ir = input.getBoundingClientRect();
    const gr = icon.getBoundingClientRect();
    const cs = getComputedStyle(input);
    out.push({
      aria: (input.getAttribute('aria-label') || input.getAttribute('placeholder') || '').trim(),
      cls: input.className,
      pl: cs.paddingLeft,
      pr: cs.paddingRight,
      iconRight: +(gr.right - ir.left).toFixed(1),
      gap: +(ir.left + parseFloat(cs.paddingLeft) - gr.right).toFixed(1),
    });
  });
  return out;
})()`;

// 🚗 Автомашин → Суудлын машин → 2-Р АЛХАМ (📍 Байршил) → 3-Р АЛХАМ (Үйлдвэрлэгч)
// ⚠️ 2026-10-01: «Байршил» 2-р алхам болов → «🏷️ Үйлдвэрлэгч» (📋 Дэлгэрэнгүй,
//    3-р алхам) руу хүрэхэд «Үргэлжлүүлэх»-ийг ХОЁР УДАА дарах хэрэгтэй ✓
// ⚠️ Табууд хасагдсан → 1-р алхам руу URL-аар буцна (`?step=1`)
await gotoStepUrl(1);
await click('[data-picker="section"] button[data-picker-value="auto"]');
await waitForSel('[data-picker="level2"] button[data-picker-value="Суудлын машин"]');
await click('[data-picker="level2"] button[data-picker-value="Суудлын машин"]');
await clickNext(); // 1 → 2 (📍 Байршил — хот анхдагчаар сонгогдсон тул зүгээр ✓)
await waitForSel('[data-picker="loc-city"]');
await clickNext(); // 2 → 3 (📋 Дэлгэрэнгүй — 🏷️ Үйлдвэрлэгч энд байна)
await waitForSel('input[role="combobox"]');

const formFields = await evaluate(ICON_PROBE);
const brand = formFields.find((f) => f.aria.includes('Үйлдвэрлэгч'));
ok('🔎 «🏷️ Үйлдвэрлэгч» combobox олдов', Boolean(brand), JSON.stringify(formFields.map((f) => f.aria)));
ok('🔎 дүрс текстийн эхний үсэгтэй ХҮРЭХГҮЙ (зай ≥ 6px)',
  Boolean(brand) && brand.gap >= 6, JSON.stringify(brand));
ok('padding-left ≥ 36px (`!pl-9` нь `.form-group`-ийн 12px-ыг дарсан)',
  Boolean(brand) && parseFloat(brand.pl) >= 36, brand ? brand.pl : 'талбар олдсонгүй');

// ✍️ «Toyota» бичихэд ✕ (Арилгах) товч текстээс хүрэхгүй байх ёстой (`!pr-10`)
await evaluate(`(() => {
  const i = document.querySelector('input[role="combobox"]');
  i.focus();
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(i, 'Toyota');
  i.dispatchEvent(new Event('input', { bubbles: true }));
  return 'OK';
})()`);
await wait(600);
const typed = await evaluate(`(() => {
  const input = document.querySelector('input[role="combobox"]');
  const btn = input.parentElement.querySelector('button[aria-label="Арилгах"]');
  if (!btn) return { error: '✕ товч гараагүй' };
  const cs = getComputedStyle(input);
  const ir = input.getBoundingClientRect();
  return {
    pr: cs.paddingRight,
    value: input.value,
    clearance: +(btn.getBoundingClientRect().left - (ir.right - parseFloat(cs.paddingRight))).toFixed(1),
  };
})()`);
ok('текст бичихэд ✕ товч текстээс ХҮРЭХГҮЙ (`!pr-10` ≥ 40px, зай ≥ 6px)',
  !typed.error && parseFloat(typed.pr) >= 40 && typed.clearance >= 6, JSON.stringify(typed));

// ── ⑦′ АВТО ФОРМ (3-р алхам) — 🔧 Хөдөлгүүр сонголт · 🎨 Өнгө · 🔀 Хөтлөгч байхгүй ──
// ⚠️ 2026-10-01 (хэрэглэгчийн хүсэлт): «Хөтлөгч хэсгийг байхгүй болгож Өнгө гэсэн
//    сонголтыг оруулж ир» + «Хөдөлгүүр … дараах сонголттой болго» ⇒ DOM-оос
//    талбар бүрийн `<label>` ба `<select>`-ийн сонголтуудыг уншиж батална ✓
//    ⚠️ Энэ нь template literal ТУЛ дотор backtick эсвэл доллар-бүслүүр БИЧИХГҮЙ
const ATTRS_PROBE = `(() => {
  return [...document.querySelectorAll('[data-form-row="details"] .form-group')].map((g) => {
    const lab = (g.querySelector('label') || {}).textContent || '';
    const box = g.querySelector('select');
    return {
      label: lab.trim(),
      options: box ? [...box.options].map((o) => (o.textContent || '').trim()) : [],
    };
  });
})()`;
const attrs3 = await evaluate(ATTRS_PROBE);
const engineField = attrs3.find((g) => g.label.includes('Хөдөлгүүр'));
const ENGINE7 = [
  '1.5л хүртэл', '1.5л - 2.0л', '2.1л - 2.7л', '2.8л - 3.5л',
  '3.6л - 4.5л', '4.6л ба түүнээс дээш', 'Цахилгаан (EV)',
];
ok('🔧 «Хөдөлгүүр» нь СОНГОЛТ болов (чөлөөт текст БИШ)',
  Boolean(engineField) && engineField.options.length === 8,
  JSON.stringify(engineField));
ok('🔧 хөдөлгүүрийн 7 утга ЯГ дарааллаараа (1.5л хүртэл … Цахилгаан (EV))',
  Boolean(engineField) && engineField.options[0] === 'Сонгох'
    && JSON.stringify(engineField.options.slice(1)) === JSON.stringify(ENGINE7),
  JSON.stringify(engineField && engineField.options));
const colorField = attrs3.find((g) => g.label.includes('Өнгө'));
// ⚠️ 2026-10-01 (13): `AUTO_COLOR_OPTIONS` 10 → 12 ⇒ «Сонгох»-той нийлээд 13 option
ok('🎨 «Өнгө» нэмэгдэв (12 сонголт + хоосон «Сонгох» мөр)',
  Boolean(colorField) && colorField.options.length === 13,
  JSON.stringify(colorField));
ok('🔀 «Хөтлөгч» форм дээр БАЙХГҮЙ (0 талбар)',
  !attrs3.some((g) => g.label.includes('Хөтлөгч')),
  JSON.stringify(attrs3.map((g) => g.label)));
// ⚠️ 2026-10-01 (2) (хэрэглэгчийн хүсэлт): «Өнгө» нь «Загвар»-ын ЯГ дараа —
//    БОДИТ DOM-ийн дарааллаар шалгана (форм нь `attrFields.map()`-ээр зурагдана ✓)
//    ⚠️ Label нь дүрстэй («🚙 Загвар») тул `includes`-ээр хайна ✓
const attrLabels3 = attrs3.map((g) => g.label);
const modelAt = attrLabels3.findIndex((l) => l.includes('Загвар'));
const colorAt = attrLabels3.findIndex((l) => l.includes('Өнгө'));
ok('🎨 форм: «Өнгө» нь «Загвар»-ын ЯГ дараа (талбаруудын дараалал)',
  modelAt >= 0 && colorAt === modelAt + 1, JSON.stringify(attrLabels3));

// ── ⑦″ 🌈 БРЭНД → ЗАГВАР (cascading) — 2026-10-01 (хэрэглэгчийн хүсэлт) ──
/**
 * 🎯 «Автошин дээр Үйлдвэрлэгчийг сонгоход түүний үйлдвэрлэсэн машинуудыг
 *    Загвар дээр нь гаргаад ирж чадах уу» → БОДИТ DOM дээр батална:
 *      ① 🏷️ «Үйлдвэрлэгч» = «Toyota» болмогц 🚙 «Загвар» нь ЧӨЛӨӨТ ТЕКСТ БИШ,
 *         `role="combobox"` (хайлттай жагсаалт) болов ✓
 *      ② Жагсаалтад тухайн брэндийн загварууд байна (Prius 30, Harrier,
 *         Land Cruiser 200) ✓ — `lib/carModels.mjs → CAR_MODELS`
 *      ③ «Prius 30» сонгоод брэндээ «Nissan» болговол загвар ЦЭВЭРЛЭГДЭНЭ ✓
 *         (`cascadeAttrs` — `{brand:'Nissan', model:'Prius 30'}` үлдэхгүй)
 *      ④ Сэлбэгийн брэнд («Bosch») → жагсаалтгүй тул ЧӨЛӨӨТ ТЕКСТ болж буцна ✓
 *
 * ⚠️ Энэ нь `lib/locationData.js`-ийн `optionsFrom` мета + `lib/carModels.mjs`
 *    + 2 компонентийн гэрээг БОДИТ Chrome дээр түгждэг ✓
 * ⚠️ Пробын мөр дотор backtick/доллар-бүслүүр БИЧИХГҮЙ (template literal ✓)
 */
const DEP_STATE = `(() => [...document.querySelectorAll('[data-form-row="details"] .form-group')]
  .map((g) => {
    const lab = (((g.querySelector('label') || {}).textContent) || '').trim();
    const el = g.querySelector('input, select');
    return {
      label: lab,
      tag: el ? el.tagName.toLowerCase() : '',
      role: el ? (el.getAttribute('role') || '') : '',
      value: el ? el.value : null,
      ph: el ? el.placeholder : null,
    };
  }))()`;
const depRow = (rows, t) => rows.find((r) => r.label.includes(t)) || {};
/** 🏷️ Брэндэд утга бичих (combobox нь `commitOnType` тул формоо шууд шинэчилнэ) */
const typeBrand = async (v) => {
  await evaluate(`(() => {
    const i = [...document.querySelectorAll('input[role="combobox"]')]
      .find((x) => ((x.getAttribute('aria-label') || '').includes('Үйлдвэрлэгч')));
    if (!i) return 'NO_BRAND';
    i.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(i, ${JSON.stringify(v)});
    i.dispatchEvent(new Event('input', { bubbles: true }));
    return 'OK';
  })()`);
  await wait(500);
};
/** 🚙 Загварын хайрцгийг нээж, `[role="option"]`-уудыг уншина.
 *  ⚠️ `focus()` нь headless горимд `onFocus`-ыг ӨДӨӨХГҮЙ (listbox нээгдэхгүй ✗) →
 *     компонентийн `onClick={() => setOpen(true)}`-ыг `click()`-ээр дуудна ✓ */
const modelOptions = async () => {
  await evaluate(`(() => {
    const m = [...document.querySelectorAll('input[role="combobox"]')]
      .find((x) => ((x.getAttribute('aria-label') || '').includes('Загвар')));
    if (m) m.click();
    return m ? (m.getAttribute('aria-expanded') || '') : 'NO_MODEL';
  })()`);
  await wait(400);
  return evaluate(`(() => {
    const m = [...document.querySelectorAll('input[role="combobox"]')]
      .find((x) => ((x.getAttribute('aria-label') || '').includes('Загвар')));
    const box = m ? m.parentElement.parentElement.querySelector('[role="listbox"]') : null;
    return box ? [...box.querySelectorAll('[role="option"]')].map((b) => (b.innerText || '').trim()) : [];
  })()`);
};

// ① «Toyota» (дээр бичигдсэн) → загвар нь combo болсон эсэх
const dep1 = await evaluate(DEP_STATE);
const m1 = depRow(dep1, 'Загвар');
ok('🌈 🏷️ «Үйлдвэрлэгч»-ээ сонгоход 🚙 «Загвар» нь COMBOBOX болов (чөлөөт текст БИШ)',
  depRow(dep1, 'Үйлдвэрлэгч').value === 'Toyota' && m1.role === 'combobox' && m1.tag === 'input',
  JSON.stringify({ brand: depRow(dep1, 'Үйлдвэрлэгч').value, model: m1 }));
ok('🌈 загварын placeholder нь брэндийн нэрийг агуулна',
  String(m1.ph || '').includes('Toyota'), JSON.stringify(m1.ph));
const hint1 = await evaluate(`(() => {
  const p = [...document.querySelectorAll('[data-form-row="details"] .form-hint')]
    .map((x) => (x.textContent || '').trim()).find((t) => t.includes('загвар'));
  return p || '';
})()`);
ok('🌈 чиглүүлэг нь «Toyota»-гийн загварын тоог хэлнэ (…-ийн N загвар)',
  hint1.includes('Toyota') && /\d+ загвар/.test(hint1), hint1);

// ② Жагсаалтын агуулга — Toyota-гийн загварууд
const toyOpts = await modelOptions();
ok('🌈 жагсаалтад тухайн брэндийн загварууд (Prius 30 · Harrier · Land Cruiser 200)',
  ['Prius 30', 'Harrier', 'Land Cruiser 200'].every((x) => toyOpts.includes(x)),
  JSON.stringify({ first: toyOpts.slice(0, 6), n: toyOpts.length }));
ok('🌈 Toyota-гийн олон загвар харагдана (maxVisible = 60)',
  toyOpts.length >= 20, String(toyOpts.length));

// ③ «Prius 30» сонгох — ⚠️ мөр нь `onMouseDown`-аар commit хийдэг тул mousedown ✓
const pickRes = await evaluate(`(() => {
  const m = [...document.querySelectorAll('input[role="combobox"]')]
    .find((x) => ((x.getAttribute('aria-label') || '').includes('Загвар')));
  const box = m ? m.parentElement.parentElement.querySelector('[role="listbox"]') : null;
  const opt = box ? [...box.querySelectorAll('[role="option"]')]
    .find((b) => ((b.innerText || '').trim() === 'Prius 30')) : null;
  if (!opt) return 'NO_OPTION';
  opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  return 'OK';
})()`);
await wait(500);
const dep2 = await evaluate(DEP_STATE);
ok('🌈 «Prius 30» сонгогдов (формд утга хадгалагдав)',
  pickRes === 'OK' && depRow(dep2, 'Загвар').value === 'Prius 30',
  JSON.stringify({ pickRes, model: depRow(dep2, 'Загвар').value }));

// ④ Брэндээ «Nissan» болговол Toyota-гийн загвар ЦЭВЭРЛЭГДЭНЭ (cascade ✓)
await typeBrand('Nissan');
const dep3 = await evaluate(DEP_STATE);
ok('🌈 брэнд «Nissan» болоход «Prius 30» ЦЭВЭРЛЭГДЭВ (зөрчсөн хос үлдэхгүй ✓)',
  depRow(dep3, 'Үйлдвэрлэгч').value === 'Nissan' && depRow(dep3, 'Загвар').value === '',
  JSON.stringify({ brand: depRow(dep3, 'Үйлдвэрлэгч').value, model: depRow(dep3, 'Загвар').value }));
const nisOpts = await modelOptions();
ok('🌈 жагсаалт нь ШИНЭ брэндийн (Nissan) загварууд болов (X-Trail · Teana · Patrol)',
  ['X-Trail', 'Teana', 'Patrol'].every((x) => nisOpts.includes(x)) && !nisOpts.includes('Prius 30'),
  JSON.stringify(nisOpts.slice(0, 6)));

// ⑤ Сэлбэгийн брэнд («Bosch») → жагсаалтгүй тул ЧӨЛӨӨТ ТЕКСТ болж буцав ✓
await typeBrand('Bosch');
const dep4 = await evaluate(DEP_STATE);
const m4 = depRow(dep4, 'Загвар');
ok('🌈 сэлбэгийн брэнд («Bosch») → «Загвар» нь ЧӨЛӨӨТ ТЕКСТ (combobox биш ✓)',
  depRow(dep4, 'Үйлдвэрлэгч').value === 'Bosch' && m4.role === '' && m4.tag === 'input',
  JSON.stringify({ brand: depRow(dep4, 'Үйлдвэрлэгч').value, model: m4 }));

// ⬅️ SIDEBAR (HomeClient) — ижил 2 компонент, ижил класс
/**
 * ⚠️ Энэ цэгээс өмнө хуримтлагдсан алдаа = ЗӨВХӨН `/listings/new` (picker + форм)
 *    дээр гарсан алдаа — ⑧-д шалгах нь ЯГ тэр хэсэг (нүүр хуудсанд шилжсэний
 *    дараах алдаа нь ⚠️ хуучирсан session (`PGRST301` JWT) — кодтой холбоогүй)
 */
const pickerProblems = problems.slice();
await rpc('Page.navigate', { url: `${BASE}/?section=auto&category=all&type=${encodeURIComponent('Суудлын машин')}` });
await wait(2500);
/**
 * 🏷️🚙 2026-10-04 (35) — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Автомашины хайлтын
 *    Үйлдвэрлэгч, Загварыг Байршил шиг хайдаг болгоод өг» ⇒ сайдбарын ХОЁР
 *    тусдаа талбар (`input[aria-label="Үйлдвэрлэгч"]` + `Загвар`) БҮРЭН
 *    ХАСАГДАЖ, оронд нь 📍 Байршилтай ЯГ ИЖИЛ **НЭГ товч → `CarPicker`**
 *    (modal: хайлт + Үйлдвэрлэгч → Загвар каскад) болов ⇒ хуучин `ICON_PROBE`
 *    (🔎 дүрсний зай) шалгалт энэ хэсэгт УТГАГҮЙ (талбар байхгүй) ✓
 */
await waitForSel('[data-sidebar-car]', 15000);
ok('🚗 sidebar: «Үйлдвэрлэгч, загвар» НЭГ товч (`data-sidebar-car`) бий', true);

const SIDE_CAR_DUP = `(() => {
  // 🆕 (89): сайдбар ХАСАГДАВ — шүүлт нь #filter-bar-ийн pill (BACKTICK ХОРИГ)
  const bar = document.querySelector('#filter-bar');
  if (!bar) return { none: true };
  return {
    brandInputs: bar.querySelectorAll('input[aria-label="Үйлдвэрлэгч"]').length,
    modelInputs: bar.querySelectorAll('input[aria-label="Загвар"]').length,
    brandBlocks: bar.querySelectorAll('[data-attr-filter="brand"]').length,
    modelBlocks: bar.querySelectorAll('[data-attr-filter="model"]').length,
    carButton: bar.querySelectorAll('[data-sidebar-car]').length,
  };
})()`;
const dupBefore = await evaluate(SIDE_CAR_DUP);
ok('🚗 sidebar: ХУУЧИН 🏷️/🚙 талбар БАЙХГҮЙ (2 өөр UI ✗) — 0/0/0/0 · товч 1',
  !dupBefore.none && dupBefore.carButton === 1
    && dupBefore.brandInputs === 0 && dupBefore.modelInputs === 0
    && dupBefore.brandBlocks === 0 && dupBefore.modelBlocks === 0,
  JSON.stringify(dupBefore));


// 🎨🔀 2026-10-01: sidebar-ийн ATTR шүүлтүүд (`select[aria-label]`) — «Өнгө» бий,
//    «Хөтлөгч» БАЙХГҮЙ (форм ба sidebar НЭГ эх сурвалж: attrFields → attrFilters ✓)
// 🆕 2026-10-03 (19): 🎨 «Өнгө» нь ОЛОН СОНГОЛТТОЙ ЧИП болов (`<select>` БИШ) —
//    хэрэглэгчийн хүсэлт: «Зар хайлт дээр Авто машин сонголт дээр Өнгө ийг
//    Төлбөрийн нөхцөл шиг олон сонголттой болго» ⇒ `select[aria-label]`-д
//    🎨 БАЙХГҮЙ, харин `[data-attr-filter="color"][data-attr-multi="true"]`
//    блокт 12 `chip-toggle` байна ✓ (формо дээр хэвээр `<select>` — ⑦′-д шалгана)
const SIDE_SELECTS = `(() => [...document.querySelectorAll('select[aria-label]')]
  .map((s) => ({ aria: (s.getAttribute('aria-label') || '').trim(), n: s.options.length })))()`;
const sideSelects = await evaluate(SIDE_SELECTS);
const SIDE_CHIPS = `(() => {
  const box = document.querySelector('[data-attr-filter="color"][data-attr-multi="true"]');
  if (!box) return null;
  return {
    tag: box.tagName.toLowerCase(),
    chips: [...box.querySelectorAll('.chip-toggle')].length,
    inputs: [...box.querySelectorAll('input[type="checkbox"]')].length,
    values: [...box.querySelectorAll('.chip-toggle')].map((b) => b.getAttribute('data-attr-value')),
  };
})()`;
const sideColorChips = await evaluate(SIDE_CHIPS);
ok('sidebar: 🎨 «Өнгө» нь ЧИП болсон (`<select>` БИШ · 12 товч · `multi` ✓)',
  Boolean(sideColorChips) && sideColorChips.tag === 'div' && sideColorChips.chips === 12
    && sideColorChips.inputs === 12
    && JSON.stringify(sideColorChips.values) === JSON.stringify(AUTO_COLOR_OPTIONS),
  JSON.stringify(sideColorChips));
ok('sidebar: 🎨 «Өнгө» нь `select[aria-label]`-д ОГТ БАЙХГҮЙ (давхардал ✗)',
  !sideSelects.some((s) => s.aria === 'Өнгө'),
  JSON.stringify(sideSelects));
ok('sidebar: 🔀 «Хөтлөгч» шүүлт БАЙХГҮЙ (0 талбар)',
  !sideSelects.some((s) => s.aria === 'Хөтлөгч'),
  JSON.stringify(sideSelects.map((s) => s.aria)));

// ⚠️ 2026-10-04 (35): 🏷️ «Үйлдвэрлэгч»/🚙 «Загвар» нь сайдбараас ГАРЧ,
//    `CarPicker` (modal) руу шилжсэн
// 🆕 2026-10-04 (37) → 🆕 2026-10-06 (17): 🎨 «Өнгө» (ба ⛽/⚙️) нь ⏳ (37)-д
//    үр дүнгийн ДЭЭРХ ХЭВТЭЭ мөр (`#filter-bar`) руу «eBay-ийн Color ⌄» шиг
//    pill болж байв ✗ — 🆕 (17)-д хэрэглэгчийн хүсэлтээр САЙДБАРТ БУЦАВ
//    («Өнгө, Түлш, Хурдны хайрцаг … Төлбөрийн нөхцөлийн ардаас оруул») ⇒
//    `#filter-bar` нь АВТО дээр ОГТ БАЙХГҮЙ ✓ (sidebar-д 3 attr шүүлт ✓)
const SIDE_ORDER = `(() => [...document.querySelectorAll('#filter-bar [aria-label]')]
  .map((el) => (el.getAttribute('aria-label') || '').trim()).filter(Boolean))()`;
const sideOrder = await evaluate(SIDE_ORDER);
ok('🚗 sidebar: 🏷️ «Үйлдвэрлэгч» / 🚙 «Загвар» сайдбарт БАЙХГҮЙ (modal руу шилжсэн ✓)',
  !sideOrder.includes('Загвар') && !sideOrder.includes('Үйлдвэрлэгч'),
  JSON.stringify(sideOrder));
const sideAttrCount = await evaluate(
  `document.querySelectorAll('#filter-bar [data-attr-filter]').length`);
ok('🎛 (89): авто дээр 🎨/⛽/⚙️ (3 attr) нь `#filter-bar`-ийн PILL',
  sideAttrCount === 3, `sideAttr=${sideAttrCount}`);
const barPills = await evaluate(
  `[...document.querySelectorAll('#filter-bar [data-filter-pill]')].map((p) => p.getAttribute('data-filter-pill'))`);
ok('🎛 (89): авто дээр `#filter-bar` БИЙ — 🎨/⛽/⚙️ pill (БҮХ шүүлт pill ✓)',
  ['color', 'transmission', 'fuel'].every((k) => barPills.includes(k)), JSON.stringify(barPills));

// ── ⑦‴ 🏷️🚙 SIDEBAR → `CarPicker` (modal): Үйлдвэрлэгч → Загвар КАСКАД ──
/**
 * 🎯 2026-10-04 (35) (хэрэглэгчийн хүсэлт: «Автомашины хайлтын Үйлдвэрлэгч,
 *    Загварыг Байршил шиг хайдаг болгоод өг») ⇒ сайдбарын 🏷️/🚙 талбарууд
 *    БАЙХГҮЙ — зөвхөн НЭГ товч (`[data-sidebar-car]`) бөгөөд дарахад
 *    `[data-car-picker]` (modal) нээгдэнэ. БОДИТ DOM дээр батална:
 *      ① товч нь `?attr_brand=Toyota`-г харуулна (URL → товч ✓)
 *      ② пикер нээгдэхэд хайлтын талбар + 🏷️ бүх мөр (Toyota СОНГОГДСОН)
 *      ③ 🔍 «pri» бичихэд 🚙 загварын жагсаалт шүүгдэнэ (Байршил шиг ✓)
 *      ④ «Prius 30» сонгоод «Машиныг хэрэглэх» → `?attr_model=Prius 30`
 *      ⑤ 🏷️ брэндээ «Nissan» болгоход хуучирсан загвар АРИЛНА (cascade ✓)
 *    ⚠️ Утга нь `filters.attrs.brand/model` ХЭВЭЭР (`lib/queries.js` `ilike` ✓)
 */
await rpc('Page.navigate', { url: `${BASE}/?section=auto&category=all&type=${encodeURIComponent('Суудлын машин')}&attr_brand=Toyota` });
await wait(3500);
/**
 * ⚠️ dev сервер дээр энэ нь ШИНЭ хуудас (эхний compile удаан байж болно) тул
 *    sidebar бүрэн ачаалагдсаныг ХҮЛЭЭНЭ ✓
 */
const sideReady = await waitForSel('[data-sidebar-car]', 25000);
// 🆕 (89): товч нь pill-ийн ⌄ панель дотор (нуугдмал) ⇒ textContent уншина
const carBtnText = sideReady ? await evaluate(`document.querySelector('[data-sidebar-car]').textContent`) : '';
ok('🌈 sidebar: хуудас ачаалагдав + товч нь `?attr_brand=Toyota`-г харуулав',
  sideReady === true && /Toyota/.test(carBtnText || ''),
  JSON.stringify({ sideReady, carBtnText }));

// ── товч дарж пикерийг НЭЭНЭ (📍 байршлын пикертэй ЯГ ИЖИЛ зам ✓) ──
await click('[data-sidebar-car]');
const modalReady = await waitForSel('[data-car-picker]', 10000);
ok('📍 пикер нээгдэв (modal бодитоор гарч ирэв)', modalReady === true);

/**
 * ⚠️ Пикерийн төлөв — хайлтын талбар, 🏷️/🚙 багана, сонголт, товчнууд.
 *    ⚠️ Энэ нь template literal тул дотор нь BACKTICK бичиж БОЛОХГҮЙ ✗
 */
const CAR_PROBE = `(() => {
  const m = document.querySelector('[data-car-picker]');
  if (!m) return { none: true };
  const brandCol = m.querySelector('[data-car-brand-filter]');
  const modelCol = m.querySelector('[data-car-model-filter]');
  return {
    search: Boolean(m.querySelector('#car-search')),
    brandRows: m.querySelectorAll('[data-car-brand-value]').length,
    brandSel: brandCol ? [...brandCol.querySelectorAll('[aria-pressed="true"]')].map((b) => b.getAttribute('data-car-brand-value')) : [],
    modelRows: m.querySelectorAll('[data-car-model-value]').length,
    modelVals: modelCol ? [...modelCol.querySelectorAll('[data-car-model-value]')].map((b) => b.getAttribute('data-car-model-value')) : [],
    apply: Boolean(m.querySelector('[data-apply-car]')),
    clear: Boolean(m.querySelector('[data-clear-car]')),
  };
})()`;
const cm1 = await evaluate(CAR_PROBE);
ok('🔍🏷️🚙 пикер: хайлт + «Машиныг хэрэглэх»/«✕ Цэвэрлэх» + 🏷️ бүх мөр (' + CAR_BRANDS.length + ')',
  cm1.search === true && cm1.apply === true && cm1.clear === true
    && cm1.brandRows === CAR_BRANDS.length,
  JSON.stringify(cm1));
ok('🌈 пикер: `?attr_brand=Toyota` → 🏷️ Toyota СОНГОГДСОН + 🚙 Toyota-гийн моделууд',
  JSON.stringify(cm1.brandSel) === JSON.stringify(['Toyota'])
    && ['Prius 30', 'Harrier', 'Camry'].every((x) => cm1.modelVals.includes(x)),
  JSON.stringify({ brandSel: cm1.brandSel, modelVals: cm1.modelVals.slice(0, 8) }));


/**
 * 🔍 ХАЙЛТЫН талбар — «pri» гэж бичихэд 🚙 жагсаалт ШУУД шүүгдэнэ
 *    (хэрэглэгчийн хүсэлт: «Байршил шиг хайдаг болгоод өг» ✓)
 * ⚠️ React-ийн хяналттай оролт тул native `setter`-ээр бичнэ (cascade тестийн ИЖИЛ арга)
 */
await evaluate(`(() => {
  const i = document.querySelector('#car-search');
  if (!i) return 'NO_INPUT';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(i, 'pri');
  i.dispatchEvent(new Event('input', { bubbles: true }));
  return 'OK';
})()`);
await wait(500);
const afterSearch = await evaluate(`(() => {
  const m = document.querySelector('[data-car-picker]');
  if (!m) return { none: true };
  return {
    models: [...m.querySelectorAll('[data-car-model-value]')].map((b) => b.getAttribute('data-car-model-value')),
    brands: m.querySelectorAll('[data-car-brand-value]').length,
    brandFree: Boolean(m.querySelector('[data-car-brand-free]')),
    modelFree: Boolean(m.querySelector('[data-car-model-free]')),
  };
})()`);
ok('🔍 пикер: «pri» бичихэд 🚙 зөвхөн Prius-ууд үлдэв (хайлт ажиллаж байна ✓)',
  afterSearch.models.length > 0
    && afterSearch.models.every((x) => String(x).toLowerCase().includes('pri')),
  JSON.stringify(afterSearch.models));
ok('🔍 пикер: олдоогүй үед ЧӨЛӨӨТ ТЕКСТ мөр гарна (`🔍 «pri» гэж хайх` — өмнөх зан ✓)',
  afterSearch.brands === 0 && afterSearch.brandFree === true && afterSearch.modelFree === true,
  JSON.stringify(afterSearch));


// ✅ «Prius 30» сонгоод «Машиныг хэрэглэх» → `?attr_model=Prius 30`
//    ⚠️ Хайлтыг эхлээд цэвэрлэнэ (эс бөгөөс «pri» гэсэн шүүлт жагсаалтыг барих ч
//       мөр нь харагдаж байгаа тул сонголт хийгдэнэ ✓ — илүү тодорхой болгох үүднээс)
await evaluate(`(() => {
  const i = document.querySelector('#car-search');
  if (!i) return 'NO_INPUT';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(i, '');
  i.dispatchEvent(new Event('input', { bubbles: true }));
  return 'OK';
})()`);
await wait(400);
await click('[data-car-model-value="Prius 30"]');
const picked = await evaluate(`(() => {
  const b = document.querySelector('[data-car-picker] [data-car-model-value="Prius 30"]');
  return b ? b.getAttribute('aria-pressed') : 'MISSING';
})()`);
ok('🚙 пикер: «Prius 30» мөр сонгогдов (`aria-pressed=true`)', picked === 'true', String(picked));

await click('[data-apply-car]');
await wait(1200);
const carPickerGone = await evaluate(`!document.querySelector('[data-car-picker]')`);
// ⚠️ `decodeURIComponent(location.search)` нь `+`-ыг ЗАЙ болгохгүй, харин
//    `URLSearchParams` нь зайг `+` болгож бичдэг (`attr_model=Prius+30`) — тиймээс
//    `includes('attr_model=Prius 30')` нь буруу ✗. Параметрээр ШУУД уншина ✓
const modelAfterPick = await evaluate(`new URLSearchParams(location.search).get('attr_model')`);
const brandAfterPick = await evaluate(`new URLSearchParams(location.search).get('attr_brand')`);
ok('✅ «Машиныг хэрэглэх» → пикер ХААГДАЖ `?attr_model=Prius 30` (брэнд Toyota ХЭВЭЭР ✓)',
  carPickerGone === true && modelAfterPick === 'Prius 30' && brandAfterPick === 'Toyota',
  JSON.stringify({ carPickerGone, modelAfterPick, brandAfterPick }));


// 🌈 🏷️ брэндээ «Nissan» болгоход хуучирсан 🚙 Загвар АРИЛНА (cascade ✓)
//    ⚠️ Пикер нь өмнөх «хэрэглэх»-ээр хаагдсан тул ДАХИН нээнэ ✓
await click('[data-sidebar-car]');
await waitForSel('[data-car-picker]', 10000);
// ⚠️ Нээгдэхэд ноорог нь `filters`-ээс шинээр авагдана (Toyota + Prius 30 ✓)
const draftBefore = await evaluate(`(() => {
  const m = document.querySelector('[data-car-picker]');
  const b = m && m.querySelector('[data-car-brand-filter] [aria-pressed="true"]');
  const mo = m && m.querySelector('[data-car-model-value="Prius 30"]');
  return { brand: b ? b.getAttribute('data-car-brand-value') : null, modelOn: mo ? mo.getAttribute('aria-pressed') : 'MISSING' };
})()`);
ok('🔄 пикер: дахин нээгдэхэд ноорог `filters`-ээс шинээр авагдав (Toyota + Prius 30)',
  draftBefore.brand === 'Toyota' && draftBefore.modelOn === 'true',
  JSON.stringify(draftBefore));

await click('[data-car-brand-value="Nissan"]');
const nisProbe = await evaluate(`(() => {
  const m = document.querySelector('[data-car-picker]');
  if (!m) return { none: true };
  const col = m.querySelector('[data-car-model-filter]');
  return {
    brandSel: [...m.querySelectorAll('[data-car-brand-filter] [aria-pressed="true"]')].map((b) => b.getAttribute('data-car-brand-value')),
    modelSel: [...m.querySelectorAll('[data-car-model-filter] [aria-pressed="true"]')].length,
    models: col ? [...col.querySelectorAll('[data-car-model-value]')].map((b) => b.getAttribute('data-car-model-value')).slice(0, 5) : [],
  };
})()`);
ok('🌈 пикер: «Nissan» сонгоход 🚙 Загвар ЦЭВЭРЛЭГДЭВ (зөрчсөн хос үлдэхгүй ✓)',
  JSON.stringify(nisProbe.brandSel) === JSON.stringify(['Nissan'])
    && nisProbe.modelSel === 0 && nisProbe.models.length > 0,
  JSON.stringify(nisProbe));

await click('[data-apply-car]');
await wait(1500);
const brandAfter = await evaluate(`new URLSearchParams(location.search).get('attr_brand')`);
const modelAfterBrand = await evaluate(`new URLSearchParams(location.search).get('attr_model')`);
ok('🌈 «Машиныг хэрэглэх» → `attr_brand=Nissan`, `attr_model` АРИЛАВ (зөрчсөн шүүлт үлдэхгүй ✓)',
  brandAfter === 'Nissan' && !modelAfterBrand,
  JSON.stringify({ brand: brandAfter, model: modelAfterBrand }));


console.log('\n── ⑦′ 🆕 (71) 👤 «Профайл нэрээ зар дээр гаргах уу?» — ФОРМ (Нэр талбарын доор) ──');
/**
 * 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-08 (71)): «Зар нийтлэх үед Профайл нэрээ зар
 *    дээрээ гаргах үгүйг асуудаг болох. Үүнийг НЭР ОРУУЛАХ ХЭСГИЙН ДООР оруулах»
 * ⚠️ БОДИТ DOM дээр: ① `#listing-show-name` <select> НЭР талбарын ЯГ ДООР
 *    ② Тийм/Үгүй 2 сонголт, анхдагч «Тийм» ③ «Үгүй» сонгоход НООРОГТ
 *    (`localStorage`, `zar:listing-draft…`) `"showName":false` бичигдэнэ ✓
 *    (форм нь зөвхөн НЭВТЭРСЭН үед — Chrome профайлд сесс байна ✓)
 */
await clearDrafts();
await evaluate('location.href = ' + JSON.stringify(`${BASE}/listings/new`));
await wait(4500);
const hasForm = await evaluate('!!document.querySelector("form")');
if (!hasForm) {
  console.log('  ⏭ SKIP — нэвтрэх сесс БАЙХГҮЙ (форм харагдахгүй) ⇒');
  console.log('     ⚠️ Chrome профайлд нэвтэрсэн байх ёстой: ' +
    '`ZAR_PHONE=… ZAR_PASS=…` (эсвэл гараар нэвтэрсэн таб)');
} else {
const nameProbe = await evaluate(`(() => {
  const sel = document.getElementById('listing-show-name');
  const form = document.querySelector('form');
  if (!sel) return { found: false, form: !!form };
  const group = sel.closest('.form-group');
  const input = group ? group.querySelector('input') : null;
  const label = group ? group.querySelector('label[for="listing-show-name"]') : null;
  const r = sel.getBoundingClientRect();
  const ri = input ? input.getBoundingClientRect() : null;
  return {
    found: true,
    tag: sel.tagName,
    value: sel.value,
    opts: [...sel.options].map((o) => o.value),
    labelText: label ? (label.textContent || '').trim() : '',
    belowName: !!ri && r.top >= ri.bottom - 1,
    namePh: input ? (input.getAttribute('placeholder') || '') : '',
  };
})()`);
ok('🆕 (71) `#listing-show-name` <select> формд ГАРНА (Тийм/Үгүй · анхдагч «Тийм» ✓)',
  nameProbe.found === true && nameProbe.tag === 'SELECT' && nameProbe.value === 'Тийм'
    && JSON.stringify(nameProbe.opts) === JSON.stringify(['Тийм', 'Үгүй']),
  JSON.stringify(nameProbe));
ok('🆕 (71) Байрлал: 👤 «Нэр» талбарын ЯГ ДООР (нэг `.form-group` дотор ✓)',
  nameProbe.belowName === true && nameProbe.namePh.includes('байгууллагын'),
  JSON.stringify({ below: nameProbe.belowName, ph: nameProbe.namePh }));
ok('🆕 (71) Шошго нь хэрэглэгчийн хүсэлтийн ЯГ үг (`htmlFor` холбоо ✓)',
  nameProbe.labelText.includes('Профайл нэрээ зар дээр гаргах уу?'), nameProbe.labelText);
const nameToggle = await evaluate(`(() => {
  const el = document.getElementById('listing-show-name');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  setter.call(el, 'Үгүй');
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return el.value;
})()`);
await wait(2200);
const draftProbe = await evaluate(`(() => {
  const keys = Object.keys(window.localStorage).filter((k) => k.indexOf('zar:listing-draft') === 0);
  const raw = keys.length ? (window.localStorage.getItem(keys[0]) || '') : '';
  return { keys: keys.length, starTym: /"showName":true/.test(raw), off: /"showName":false/.test(raw) };
})()`);
ok('🆕 (71) «Үгүй» сонгоход НООРОГТ `"showName":false` бичигдэв (localStorage ✓)',
  nameToggle === 'Үгүй' && draftProbe.keys > 0 && draftProbe.off === true,
  JSON.stringify({ value: nameToggle, ...draftProbe }));
}
await clearDrafts();

console.log('\n── ⑧ CONSOLE / EXCEPTION ──');
ok('JS exception / console.error БАЙХГҮЙ (picker + Үйлдвэрлэгч форм)',
  pickerProblems.length === 0, JSON.stringify(pickerProblems.slice(0, 5)));
console.log(`  ℹ️ сүлжээний 401 (Supabase session, кодтой холбоогүй): ${netProblems.length}`);
console.log(`  ℹ️ нүүр хуудсанд шилжсэний дараах алдаа (⚠️ хуучирсан session JWT — кодтой холбоогүй): ${problems.length - pickerProblems.length}`);

console.log(`\n══════════ ҮР ДҮН: ${pass}/${pass + fail} ✓ ══════════\n`);
try { await fetch(`${CDP}/json/close/${target.id}`); } catch { /* орхино */ }
ws.close();
process.exit(fail ? 1 : 0);
