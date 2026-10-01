'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useToast, useUI } from './AppProviders';
import { createListing, updateListing, uploadImages, fetchListingById } from '../lib/queries';
import { CITIES, getDistricts, getKhoroos, hasApartmentFields, hasFloorFields, hasRoomsFields, hasBathroomFields, hasSimpleForm, BALCONY_OPTIONS, GARAGE_OPTIONS, SECTIONS, getSubtypes, hasCategoryChoice, getSubtypeGroups, getAttrFields } from '../lib/locationData';
import { normalizePhone, getPropertyTypeLabel, formatThousands, digitCount, shortPrice, isNegotiablePrice, NEGOTIABLE_PRICE_LABEL } from '../lib/format';
import phoneEmail from '../lib/phoneEmail';
import YouTubeField from './YouTubeField';
import SearchableSelect from './SearchableSelect';
import { parseYouTube } from '../lib/youtube.mjs';
import { compressImages, formatBytes } from '../lib/imageUtils';

/**
 * 🪜 «ЗАР НЭМЭХ» — ТУСДАА ХУУДАС (`/listings/new`) + АЛХАМТ ФОРМ (2026-10-01)
 *
 *  Хэрэглэгчийн хүсэлт: «бүх мэдээлэл оруулах талбарыг нэг дор харуулахгүй,
 *  хэсэг хэсгээр ойлгомжтой харуулах» ба «хэрэглэгчид ХААНА ЯВААГАА мэдэгдүүлэх»
 *  (unegui.mn / eBay загвар).
 *
 *  ⚠️ ӨМНӨ МОДАЛ байсан (`AddListingModal`) — одоо ТУСДАА ХУУДАС:
 *     • «хаана явж байна» нь URL (`/listings/new?step=2`) + breadcrumb +
 *       алхмын заагч (stepper) дээр ГУРВАНААС харагдана ✓
 *     • refresh / линк хуваалцсан ч тухайн алхам дээр нээгдэнэ ✓
 *     • засах горим: `/listings/new?edit=<id>` — зарыг id-аар татаж бөглөнө ✓
 *     • мобайл доод цэс / header товч нь `openAdd()` → энэ хуудас руу шилжүүлнэ
 *       (`AppProviders` → `router.push('/listings/new')`) ✓
 *
 *  ⚠️ Алхмууд нь ТОГТМОЛ 5 — хэсэг/дэд төрөл солигдоход тоо нь ХӨДӨЛӨХГҮЙ
 *     (тиймээс `form`-оос хамаарахгүй). «Дэлгэрэнгүй» алхам дээр тухайн хэсэгт
 *     тохирох талбарууд л харагдана; тохирох талбаргүй бол «Үргэлжлүүлэх»
 *     дарж болно (алдаа ГАРАХГҮЙ ✓).
 *  ⚠️ «Одоогийн алхам» нь URL-аас уншигдана (`step`), `setStep` гэж БАЙХГҮЙ ✓
 *     Дууссан алхам дээр дарж ХОЙШ буцаж болно (зөвхөн `i < step`).
 */
const STEPS = [
  { key: 'category', label: 'Ангилал',     short: 'Юу зарах вэ?' },
  { key: 'details',  label: 'Дэлгэрэнгүй', short: 'Үндсэн үзүүлэлт' },
  { key: 'location', label: 'Байршил',     short: 'Хаана байрлах вэ?' },
  { key: 'price',    label: 'Үнэ',         short: 'Үнэ ба тайлбар' },
  { key: 'media',    label: 'Зураг',       short: 'Зураг ба холбоо' },
];

/** Зарын DB мөр → форм (засах горимд) */
function listingToForm(l) {
  return {
    category: l.category || 'sell',
    // ---- ХЭСЭГ ба attr (0016) ----
    section: l.section || 'real-estate',
    attrs: (l.attrs && typeof l.attrs === 'object') ? { ...l.attrs } : {},
    propertyType: l.property_type || '',
    rooms: l.rooms ? String(l.rooms) : '',
    area: l.area ? String(l.area) : '',
    city: l.city || 'Улаанбаатар',
    district: l.district || '',
    khoroo: l.khoroo || '',
    addressDetail: l.address_detail || '',
    price: l.price ? String(l.price) : '',
    // 🤝 «Үнэ тохирно» — үнэ 0/хоосон бол чекбокс асаалттай нээгдэнэ (lib/format.js)
    negotiable: isNegotiablePrice(l),
    priceType: l.price_type || 'total',
    phone: phoneEmail.toLocalPhone(l.phone),
    contactName: l.contact_name || '',
    description: l.description || '',
    // YouTube видео линк (0011). Хадгалагдсан нь КАНОНИК линк байна.
    videoUrl: l.video_url || '',
    // ---- Орон сууцны нэмэлт мэдээлэл ----
    buildYear: l.build_year ? String(l.build_year) : '',
    floor: l.floor ? String(l.floor) : '',
    totalFloors: l.total_floors ? String(l.total_floors) : '',
    balconies: l.balconies ? String(l.balconies) : '',
    hasGarage: l.has_garage === true ? 'yes' : l.has_garage === false ? 'no' : '',
    // Угаалгын өрөөний тоо (0012) — зөвхөн 3+ өрөөтэй орон сууц / АОС/хаус дээр
    bathrooms: l.bathrooms ? String(l.bathrooms) : '',
  };
}

export default function AddListingClient() {
  const { user, profileName, authLoading } = useAuth();
  const { showToast } = useToast();
  const { openAuth, notifyListingsChanged } = useUI();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 🪜 URL-ААР УДИРДАНА: `/listings/new?step=2` (засах: `?edit=<id>`).
  //    ⚠️ Ингэснээр «хаана явж байна» нь ХАЯГ дээр ч харагдана, refresh хийсэн ч,
  //    линк хуваалцсан ч тухайн алхам дээр нээгдэнэ ✓ (модал байсан үеийн
  //    хэрэглэгчид хаана байгаагаа мэдэхгүй байсан гол дутагдлыг зассан)
  const editId = searchParams.get('edit') || '';
  const stepRaw = Number(searchParams.get('step') || '1');
  const step = Math.min(STEPS.length - 1, Math.max(0, (Number.isFinite(stepRaw) ? stepRaw : 1) - 1));

  const userId = user ? user.id : null;
  const displayName = profileName || (user && user.phone) || '';
  const userPhone = (user && user.phone) || '';

  // Засах горимд зарыг id-аар татна (шууд линк/refresh ч ажиллана)
  const [editing, setEditing] = useState(null);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const isEdit = !!(editing && editing.id);

  const emptyForm = () => ({
    category: 'sell',
    // ---- ХЭСЭГ ба attr (0016) — анхдагч нь үл хөдлөх ----
    section: 'real-estate',
    attrs: {},
    propertyType: '',
    rooms: '',
    area: '',
    city: 'Улаанбаатар',
    district: '',
    khoroo: '',
    addressDetail: '',
    price: '',
    // 🤝 «Үнэ тохирно» — үнэ нь ЗААВАЛ БИШ (2026-09-29). Шинэ зар дээр
    //    анхдагчаар УНТРААЛТТАЙ (хэрэглэгч үнэ бичих нь элбэг ✓).
    negotiable: false,
    priceType: 'total',
    // ⚠️ ЗАСВАР: өмнө нь энд `displayName` (хэрэглэгчийн НЭР) орж байсан нь алдаа байв —
    // «Холбоо барих утас» талбарт нэр бөглөгдөж харагддаг байсан.
    // Одоо нэвтэрсэн хэрэглэгчийн БОДИТ утасны дугаарыг бөглөнө ('+97688093663' → '88093663').
    phone: phoneEmail.toLocalPhone(userPhone),
    // Нэр нь «Холбоо барих хүн» (contact_name) талбарт хэвээр — тэр талбар нуугдсан ч
    // зар хадгалахдаа нэрийг хамт хадгална.
    contactName: displayName || '',
    description: '',
    videoUrl: '', // YouTube линк (сонголтоор) — Storage-д файл хадгалахгүй
    // ---- Орон сууцны нэмэлт мэдээлэл ----
    buildYear: '',    // Ашиглалтанд орсон он
    floor: '',        // Тухайн байр хэдэн давхарт
    totalFloors: '',  // Барилгын нийт давхар
    balconies: '',    // Тагтны тоо (1-4)
    hasGarage: '',    // '' | 'yes' | 'no'
    bathrooms: '',    // Угаалгын өрөөний тоо (3+ өрөө / АОС/хаус)
  });

  const [form, setForm] = useState(emptyForm);
  const [pending, setPending] = useState([]); // {file,url} — шинээр нэмэх зурагнууд
  const [existingImages, setExistingImages] = useState([]); // засах үед үлдээх хуучин зургууд
  const [submitting, setSubmitting] = useState(false);
  const [compressing, setCompressing] = useState(false); // 🗜 зураг шахаж байна
  const [lastReport, setLastReport] = useState(null); // сүүлийн шахалтын тайлан
  const [error, setError] = useState('');
  const baselineRef = useRef(''); // анхны төлөв (өөрчлөгдсөн эсэхийг шалгах)

  // 🪜 Хуудас ачаалахад: нэвтэрсэн бол шинэ/засах формыг бэлдэнэ.
  //    «Одоогийн алхам» нь URL-аас (`?step=`) уншигдана — энд `setStep` БАЙХГҮЙ ✓
  useEffect(() => {
    if (authLoading || !userId) return undefined;

    if (!editId) {
      const initial = emptyForm();
      setEditing(null);
      setForm(initial);
      setPending([]);
      setExistingImages([]);
      setError('');
      baselineRef.current = JSON.stringify(initial);
      setLoadingEdit(false);
      return undefined;
    }

    let mounted = true;
    setLoadingEdit(true);
    (async () => {
      try {
        const l = await fetchListingById(editId);
        if (!mounted) return;
        if (!l) { setError('Зар олдсонгүй эсвэл устгагдсан байна.'); return; }
        if (l.user_id !== userId) { setError('Энэ зарыг засах эрх танд байхгүй.'); return; }
        setEditing(l);
        const initial = listingToForm(l);
        setForm(initial);
        setPending([]);
        setExistingImages(Array.isArray(l.images) ? l.images : []);
        setError('');
        baselineRef.current = JSON.stringify(initial);
      } catch (err) {
        if (mounted) setError((err && err.message) || 'Зарыг татахад алдаа гарлаа');
      } finally {
        if (mounted) setLoadingEdit(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId, editId]);

  const originalImageCount = isEdit && Array.isArray(editing.images) ? editing.images.length : 0;
  const isDirty = () =>
    JSON.stringify(form) !== baselineRef.current ||
    pending.length > 0 ||
    existingImages.length !== originalImageCount;

  /**
   * Хуудсаас гарах. ⚠️ Оруулсан мэдээлэл алдагдахаас сэргийлж: өөрчлөлт байвал
   * баталгаажуулна. ⚠️ Модал байсан тул `onClose()` байсныг ОДОО NAVIGATION
   * болгосон (`/my-listings` эсвэл нүүр хуудас) ✓
   */
  const goHome = () => router.push(isEdit ? '/my-listings' : '/');
  const requestCancel = () => {
    if (submitting) return;
    if (isDirty() && !window.confirm('Оруулсан мэдээлэл хадгалагдахгүй УСТАНА. Гарахдаа итгэлтэй байна уу?')) {
      return;
    }
    goHome();
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const changeCity = (city) => setForm((f) => ({ ...f, city, district: '', khoroo: '' }));
  const changeDistrict = (district) => setForm((f) => ({ ...f, district, khoroo: '' }));

  const districts = getDistricts(form.city);
  const khoroos = getKhoroos(form.city, form.district);

  // ===== ХЭСЭГ ба ATTR (0016) =====
  // ⚠️ `real-estate` нь уламжлалт: дэд төрөл нь `PROPERTY_TYPES`, нэмэлт
  //    талбарууд нь `rooms`/`floor`/`build_year` … тусдаа БАГАНА дээр.
  //    Бусад хэсэг (авто/ажил/компьютер/бараа/үйлчилгээ) нь `attrs` jsonb.
  const isRealEstate = (form.section || 'real-estate') === 'real-estate';
  const subtypes = getSubtypes(form.section || 'real-estate');
  /**
   * 🛠 БҮЛГҮҮД (3 дахь түвшин, 2026-09-27) — зөвхөн `services` хэсэгт.
   * ⚠️ Формд `optgroup` болгож харуулна: 30 дэд төрөл нь нэг хавтгай
   *    `<select>`-д ойлгомжгүй болно ✗; `optgroup` нь браузерын төрөлх
   *    бүлэглэлт (нэмэлт CSS/JS шаардлагагүй ✓).
   * ⚠️ Доод түвшингүй бүлэг (ж: «Хэвлэл, реклам, медиа») нь ШУУД
   *    сонгогдох `<option>` болно (тэр нь хамгийн доод түвшин).
   * ⚠️ Бүлгийн `collapsed` туг (💻 компьютерийн 4 бүлэг, 2026-09-29) нь
   *    ЗӨВХӨН шүүлтийн панелийн (`HomeClient`) харагдацын анхдагч төлөв —
   *    формд ХҮЧИНГҮЙ ✓: энд бүх 45 дэд төрөл `<optgroup>`-оор бүгд
   *    харагдана (хэрэглэгч зар нэмэхдээ бүх сонголтыг харах ёстой ✓)
   */
  const subtypeGroups = getSubtypeGroups(form.section || 'real-estate');
  /** «Зарах / Түрээслэх» сонголт харагдах эсэх — ⚠️ ЗӨВХӨН үл хөдлөхөд */
  const showCategoryChoice = hasCategoryChoice(form.section || 'real-estate');
  /**
   * Тухайн хэсгийн attr талбарууд (форм автоматаар үүсгэнэ).
   *
   * ⚠️ 2026-09-30 (6): `getAttrFields(section, subtype)` — талбар нь
   *    `onlySubtypes` жагсаалттай бол ЗӨВХӨН тэр дэд төрөлд харагдана
   *    (💻 Notebook-ийн Дэлгэц/CPU/RAM/Хард — хэрэглэгчийн хүсэлт ✓).
   *    `onlySubtypes` байхгүй талбар нь өмнөх шигээ бүх дэд төрөлд ✓
   */
  const attrFields = getAttrFields(form.section || 'real-estate', form.propertyType);

  /**
   * ⚡ ХЯЛБАР ФОРМ (2026-09-29, хэрэглэгчийн хүсэлт; ⚠️ 2026-09-30 (5)-д өргөжсөн) —
   *    `lib/locationData.js` → `hasSimpleForm(section)`. Одоогоор 7 хэсэг:
   *    ⚽ `hobby` (Аялал, Спорт, Хобби — 6 дэд төрөл), 🧺 `home` (Гэр ахуйн бараа —
   *    «мөн адил ийм форматтай болго»), ⚡ `electric` (Цахилгаан бараа), 🧱
   *    `construction` (Барилгын материал), 🏭 `equipment` (Тоног төхөөрөмж) ба
   *    🆕 🛋️ `furniture` (Тавилга) / 🧳 `travel` (Аяны бараа — 2026-09-30 (5)-д
   *    «Аяллын хэрэгсэл»-ээс тусдаа хэсэг болсон ✓).
   * ⚠️ Ийм хэсэгт форм нь ЗӨВХӨН байршил (хот+дүүрэг) · шинэ/хуучин · үнэ ·
   *    утас · тайлбар · зураг асууна — хороо/дэлгэрэнгүй хаяг ба YouTube
   *    видео линк ХАРАГДАХГҮЙ (хэрэглэгчийн хүсэлт: «зөвхөн … асуудаг байя»).
   * ⚠️ ХАДГАЛАХ үед далд талбаруудын ХУУЧИН утга УСТАХГҮЙ (payload-д
   *    `form`-оосоо хэвээр явна) — зөвхөн UI-д харагдахгүй ✓
   */
  const simpleForm = hasSimpleForm(form.section || 'real-estate');

  /** ATTR утга тавих/хоослох (хоосон бол `delete` — DB-д хог үлдээхгүй) */
  const setAttr = (key, value) => {
    setForm((f) => {
      const attrs = { ...(f.attrs || {}) };
      if (value !== '') attrs[key] = value;
      else delete attrs[key];
      return { ...f, attrs };
    });
  };

  // Орон сууцны нэмэлт талбарууд төрлөөс хамаарч харагдана
  const showApartment = hasApartmentFields(form.propertyType);
  const showFloors = hasFloorFields(form.propertyType);
  const showRooms = hasRoomsFields(form.propertyType); // ← зөвхөн Орон сууц, АОС/хаус
  // «Угаалгын өрөө» — АОС/хаус төрөлд үргэлж, 3+ өрөөтэй орон сууцанд нэмж харагдана
  const showBathrooms = hasBathroomFields(form.propertyType, form.rooms);

  const onPickFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (pending.length + files.length > 10) {
      setError('Хамгийн ихдээ 10 зураг оруулах боломжтой');
      return;
    }
    setError('');
    setCompressing(true);
    try {
      // 🗜 Storage хэмнэх: илгээхээс өмнө resize + JPEG шахалт (lib/imageUtils.js)
      const report = await compressImages(files);
      const mapped = report.items.map((it) => ({
        file: it.file,
        url: URL.createObjectURL(it.file),
        originalSize: it.originalSize,
        newSize: it.newSize,
        savedPercent: it.savedPercent,
        skipped: !!it.skipped,
      }));
      setPending((p) => [...p, ...mapped]);
      setLastReport({
        count: report.items.length,
        totalOriginal: report.totalOriginal,
        totalNew: report.totalNew,
        savedPercent: report.savedPercent,
      });
    } catch (err) {
      setError(`Зураг боловсруулахад алдаа: ${(err && err.message) || err}`);
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = (idx) => setPending((p) => p.filter((_, i) => i !== idx));

  /**
   * 🪜 Тухайн алхмын шалгалт → алдааны мессеж (эсвэл '').
   * ⚠️ «Үнэ» ба «Зураг» (media)-ийн шалгалт нь `handleSubmit`-ийн
   *    ЕРӨНХИЙ шалгалттай ЯГ ИЖИЛ — давхардсан логик үлдээхгүйн тулд
   *    хоёулаа ЭНЭ функцээр дамжина ✓
   */
  const validateStep = (i) => {
    const key = (STEPS[i] || {}).key;
    if (key === 'category') {
      if (!form.propertyType) return 'Зарын төрлөө сонгоно уу';
      return '';
    }
    if (key === 'location') {
      if (!form.city) return 'Хот/Аймгаа сонгоно уу';
      return '';
    }
    if (key === 'price') {
      // ⚠️ Үнэ нь ЗӨВХӨН ЦИФР хэлбэрээр хадгалагдана (formatThousands нь зөвхөн
      //    ХАРАГДАЦЫГ таслалтай болгоно). lib/queries.js → toNumber() нь «,»-г
      //    аравтын бутархай гэж үздэг тул таслалтай утга илгээвэл үнэ 0 болно.
      // ⚠️ Үнэ нь ЗААВАЛ БИШ (2026-09-29): «Үнэ тохирно» тэмдэглэсэн бол үнэ
      //    огт шаардахгүй — карт/дэлгэрэнгүй дээр «Үнэ тохирно» харагдана
      //    (lib/format.js). ⚠️ Хэрэглэгчийн шаардлага: «Үнэ тохирно»-г
      //    ТЭМДЭГЛЭСЭН Ч үнэ бичсэн бол утга нь ХЭВЭЭР хадгалагдана ✓
      const priceDigits = String(form.price || '').replace(/\D/g, '');
      if (priceDigits) {
        if (Number(priceDigits) <= 0) return 'Үнэ 0-ээс их байх ёстой';
        if (priceDigits.length > 15) return 'Үнэ хэт урт байна (15 цифр хүртэл)';
      } else if (!form.negotiable) {
        return `Үнээ оруулна уу (эсвэл «${NEGOTIABLE_PRICE_LABEL}»-г тэмдэглэнэ үү)`;
      }
      // 🎥 Видео линк: хоосон бол зүгээр; бичсэн бол YouTube линк БАЙХ ЁСТОЙ
      // (буруу линк хадгалагдвал дэлгэрэнгүй хуудас дээр видео харагдахгүй).
      if (form.videoUrl && form.videoUrl.trim() && !parseYouTube(form.videoUrl).ok) {
        return 'YouTube линк буруу байна. Жишээ: https://youtu.be/dQw4w9WgXcQ';
      }
      return '';
    }
    if (key === 'media') {
      if (!form.phone) return 'Холбоо барих утас оруулна уу';
      return '';
    }
    return '';
  };

  /** Бүх алхмаас ЭХНИЙ алдаатайг олно — `handleSubmit`-д хэрэглэнэ ✓ */
  const firstInvalidStep = () => {
    for (let i = 0; i < STEPS.length; i += 1) {
      const msg = validateStep(i);
      if (msg) return { index: i, msg };
    }
    return null;
  };

  /**
   * 🪜 URL-ийн `?step=`-ийг солино (scroll-гүй). ⚠️ Алхам нь URL-д 1-based —
   *    хэрэглэгчид «2/5» гэж ойлгомжтой, хаяг дээр ч тодорхой харагдана ✓
   */
  const gotoStep = (n) => {
    const qs = new URLSearchParams();
    if (editId) qs.set('edit', editId);
    qs.set('step', String(n + 1));
    router.replace(`/listings/new?${qs.toString()}`, { scroll: false });
  };

  /** 🪜 Дараагийн алхам — эхлээд ОДООГИЙН алхмаа шалгана */
  const goNext = () => {
    const msg = validateStep(step);
    if (msg) { setError(msg); return; }
    setError('');
    gotoStep(Math.min(step + 1, STEPS.length - 1));
  };

  /** 🪜 Буцах — эхний алхамд байвал хуудсаас гарна (цуцлах) */
  const goBack = () => {
    if (submitting) return;
    setError('');
    if (step === 0) { requestCancel(); return; }
    gotoStep(Math.max(step - 1, 0));
  };

  /** 🪜 Дууссан алхам руу ҮСРЭХ (зөвхөн хойш — `i < step`) */
  const goToStep = (i) => {
    if (i < step) { setError(''); gotoStep(i); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // 🪜 Бүх алхмыг шалгана — алдаатай бол ТЭР алхам руу шилжиж, мессеж харуулна
    const invalid = firstInvalidStep();
    if (invalid) { setError(invalid.msg); gotoStep(invalid.index); return; }

    setSubmitting(true);
    try {
      const uploaded = pending.length ? await uploadImages(userId, pending.map((p) => p.file)) : [];
      const payload = {
        ...form,
        phone: normalizePhone(form.phone).replace(/^\+/, ''),
        // Засах үед хуучин зургуудыг хадгалаад шинээр нэмсэнийг залгана
        images: [...existingImages, ...uploaded],
        // Тухайн төрөлд хамаарахгүй нэмэлт талбаруудыг хоосолж хадгална
        // ⚠️ 0016: үл хөдлөхийн талбарууд (өрөө, талбай, давхар…) нь ЗӨВХӨН
        //    үл хөдлөх хэсэгт утгатай — бусад хэсэгт хоосон хадгална.
        rooms: showRooms ? form.rooms : '',
        area: isRealEstate ? form.area : '',
        // 🤝 «Үнэ тохирно» — `attrs.negotiable = 'yes'` (jsonb, 0016) гэж
        //    хадгална. ⚠️ Тусдаа багана нэмэхгүй (migration 0 ✓) ба үнэ
        //    БИЧСЭН бол утга нь ХЭВЭЭР явна (`price: form.price`) ✓
        //    Тэмдэглэл АВАХАД түлхүүрийг УСТГАНА (хуучин тэмдэг үлдэхгүй ✓).
        attrs: (() => {
          const a = { ...(form.attrs || {}) };
          if (form.negotiable) a.negotiable = 'yes';
          else delete a.negotiable;
          return a;
        })(),
        price: form.price,
        // ⚠️ «Зарах / Түрээслэх» нь зөвхөн үл хөдлөхөд — бусад хэсэгт `sell`
        category: isRealEstate ? form.category : 'sell',
        buildYear: showApartment ? form.buildYear : '',
        floor: showFloors ? form.floor : '',
        totalFloors: showFloors ? form.totalFloors : '',
        balconies: showApartment ? form.balconies : '',
        hasGarage: showApartment ? form.hasGarage : '',
        // Угаалгын өрөө — талбар харагдахгүй бол утгыг хоосолж хадгална
        bathrooms: showBathrooms ? form.bathrooms : '',
      };

      if (isEdit) {
        await updateListing(userId, editing.id, payload);
      } else {
        await createListing(userId, payload);
      }

      notifyListingsChanged();
      showToast(isEdit ? 'Зар амжилттай засагдлаа ✅' : 'Зар амжилттай нийтлэгдлээ ✅');
      router.push('/my-listings');
    } catch (err) {
      setError(err.message || (isEdit ? 'Зар засахад алдаа гарлаа' : 'Зар нэмэхэд алдаа гарлаа'));
    } finally {
      setSubmitting(false);
    }
  };

  // ===== ⛔ ХАМГААЛАЛТ: ачаалж байна / нэвтрээгүй =====
  if (authLoading) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      </div>
    );
  }
  if (!userId) {
    return (
      <div className="page-container">
        <div className="mx-auto mt-6 max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-card">
          <div className="mb-4 text-6xl">🔑</div>
          <h1 className="text-xl font-semibold">Зар оруулахын тулд нэвтрэх шаардлагатай</h1>
          <p className="mt-2 text-[13px] text-gray-500">
            Утасны дугаараараа нэвтэрсний дараа зарыг үргэлжлүүлэн оруулна.
          </p>
          <button type="button" className="btn btn-primary btn-lg mt-6" onClick={openAuth}>
            Нэвтрэх
          </button>
          <div className="mt-4">
            <Link href="/" className="text-[13px] font-semibold text-primary hover:underline">
              ← Нүүр хуудас
            </Link>
          </div>
        </div>
      </div>
    );
  }
  if (loadingEdit) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Зарыг ачаалж байна...</p>
        </div>
      </div>
    );
  }

  const currentStep = STEPS[step];

  return (
    <div className="page-container">
      {/* 🧭 БАЙРШЛЫН ЗААЛТ (breadcrumb) — «хаана явж байна» */}
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-[13px] text-gray-500">
        <Link href="/" className="hover:text-primary hover:underline">Нүүр</Link>
        <span className="text-gray-300">›</span>
        {isEdit ? (
          <>
            <Link href="/my-listings" className="hover:text-primary hover:underline">Миний зарууд</Link>
            <span className="text-gray-300">›</span>
            <span className="font-semibold text-gray-800">Зарыг засах</span>
          </>
        ) : (
          <>
            <span>Зар нэмэх</span>
            <span className="text-gray-300">›</span>
            <span className="font-semibold text-gray-800">{step + 1}. {currentStep.label}</span>
          </>
        )}
      </nav>

      <div className="mx-auto w-full max-w-3xl">
        <div className="section-card !p-0">
          {/* Толгой + алхмын заагч — гүйлгэх үед дээгүүрээ наалдана (sticky) */}
          <div className="sticky top-16 z-20 rounded-t-xl border-b border-gray-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between px-6 py-5">
              <div>
                <h1 className="text-xl font-bold">{isEdit ? '✏️ Зарыг засах' : '➕ Зар нэмэх'}</h1>
                <p className="mt-0.5 text-[12.5px] text-gray-500">
                  {step + 1}/{STEPS.length} · {currentStep.label}
                </p>
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg transition hover:bg-gray-200"
                onClick={requestCancel}
                aria-label="Цуцлах"
                title="Цуцлах"
              >
                ×
              </button>
            </div>

          {/* 🪜 АЛХМЫН ЗААГЧ — дууссан алхам дээр дарж буцаж болно */}
          <div className="px-4 pb-4 sm:px-6" aria-label="Зарын алхмууд">
            <div className="flex items-start justify-between gap-1">
              {STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => goToStep(i)}
                    disabled={!done}
                    aria-current={active ? 'step' : undefined}
                    className={`flex flex-1 flex-col items-center gap-1.5 ${done ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold transition-all duration-150 ${
                        done || active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                      } ${active ? 'ring-4 ring-primary-light' : ''}`}
                    >
                      {done ? '✓' : i + 1}
                    </span>
                    <span
                      className={`text-center text-[10px] font-semibold leading-tight sm:text-[11px] ${
                        active ? 'text-primary' : done ? 'text-gray-600' : 'text-gray-400'
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Дэвшлийн зурвас */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-2.5 text-red-800">{error}</div>}

            {/* 🪜 Алхмын гарчиг — энэ алхамд юу асуухыг товч тайлбарлана */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {step + 1}/{STEPS.length}-р алхам
              </p>
              <h3 className="text-lg font-semibold text-gray-900">{STEPS[step].label}</h3>
              <p className="text-[13px] text-gray-500">{STEPS[step].short}</p>
            </div>

            {/* ═══ 1-р алхам · АНГИЛАЛ (хэсэг · дэд төрөл · зарах/түрээслэх) ═══ */}
            {step === 0 && (
            <div className="form-row">
              {/* ===== ХЭСЭГ (0016) — Автомашин / Ажлын зар / Компьютер … =====
                  ⚠️ Хэсэг солиход дэд төрөл (propertyType) ба attr утгууд нь
                     тухайн хэсэгт тохирохгүй тул ЦЭВЭРЛЭНЭ. */}
              <div className="form-group">
                <label>Хэсэг *</label>
                <select
                  value={form.section || 'real-estate'}
                  onChange={(e) => {
                    const next = e.target.value;
                    setForm((f) => ({
                      ...f,
                      section: next,
                      propertyType: '',
                      attrs: {},
                      // ⚠️ «Зарах / Түрээслэх» нь зөвхөн үл хөдлөхөд — бусад
                      //    хэсэгт `sell` болж буцна (select нь харагдахгүй).
                      category: hasCategoryChoice(next) ? f.category : 'sell',
                    }));
                  }}
                >
                  {SECTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.icon} {s.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Дэд төрөл *</label>
                <select value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
                  <option value="">Сонгох</option>
                  {/* 🛠 БҮЛЭГТЭЙ хэсэг (`services`) — `optgroup`-оор бүлэглэнэ */}
                  {subtypeGroups.length > 0
                    ? subtypeGroups.map((g) =>
                        g.items.length ? (
                          <optgroup key={g.label} label={g.label}>
                            {g.items.map((t) => (
                              <option key={t} value={t}>{getPropertyTypeLabel(t, form.category)}</option>
                            ))}
                          </optgroup>
                        ) : (
                          /* доод түвшингүй бүлэг — өөрөө сонгогдоно */
                          <option key={g.label} value={g.label}>{getPropertyTypeLabel(g.label, form.category)}</option>
                        )
                      )
                    : subtypes.map((t) => (
                        <option key={t} value={t}>{getPropertyTypeLabel(t, form.category)}</option>
                      ))}
                </select>
              </div>
              {/* «Зар эсвэл түрээс» — ⚠️ ЗӨВХӨН үл хөдлөхөд (хэрэглэгчийн хүсэлт).
                  Бусад хэсэгт `category` нь `sell` (DB-ийн default) байна. */}
              {showCategoryChoice && (
              <div className="form-group">
                <label>Зар эсвэл түрээс *</label>
                <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                  <option value="sell">💰 Зарах</option>
                  <option value="rent">🔑 Түрээслэх</option>
                </select>
              </div>
              )}
            </div>
            )}

            {/* ═══ 2-р алхам · ДЭЛГЭРЭНГҮЙ (үндсэн үзүүлэлт ба нэмэлт талбарууд) ═══ */}
            {step === 1 && (
            <>
            {/* ⚠️ Энэ хэсэг/төрөлд тохирох нэмэлт талбар БАЙХГҮЙ бол
                хэрэглэгчид ойлгуулна (ж: «Газар» төрөлд өрөө/давхар байхгүй) ✓ */}
            {!(showRooms || showFloors || showApartment || showBathrooms || attrFields.length > 0) && (
              <p className="mb-3 rounded-lg bg-gray-50 p-3 text-[13px] text-gray-500">
                Энэ төрөлд нэмэлт талбар байхгүй — «Үргэлжлүүлэх» дээр дарна уу.
              </p>
            )}
            {/* ===== ХЭСГИЙН НЭМЭЛТ ТАЛБАРУУД (attrs jsonb, 0016) =====
                ⚠️ Хэсэг тус бүрд өөр (Авто: брэнд/он/гүйлт/түлш; Ажил: компани/
                   цалин; Компьютер: дэд төрлөөс хамаарч — 💻 Notebook-ийн
                   Дэлгэц/CPU/RAM/Хард, 2026-09-30 (6)). `attrFields`-ээс
                   автоматаар үүснэ — шинэ талбар нэмэхэд код засахгүй ✓
                ⚠️ ХАРАГДАХ талбарууд нь `getAttrFields(section, subtype)`-ээр
                   шүүгдэнэ: `onlySubtypes` БАЙХГҮЙ талбар нь бүх дэд төрөлд ✓,
                   байгаа бол ЗӨВХӨН тэр дэд төрөлд (ж: 💻 Notebook-ийн 21 брэнд,
                   «Иж бүрэн компьютер», «Процессор, сервер») ✓
                🔎 `searchable: true` (ж: 🏷️ Үйлдвэрлэгч — 95 сонголт) нь ХАЙЛТТАЙ
                   COMBOBOX: бичнэ → жагсаалт шүүгдэнэ; жагсаалтад байхгүй
                   брэндийг ГАРААР бичиж болно ✓ (хэрэглэгчийн хүсэлт). */}
            {attrFields.length > 0 && (
              <div className="form-row">
                {attrFields.map((f) => {
                  const value = (form.attrs || {})[f.key] || '';
                  /**
                   * ⚠️ ХУУЧИН/ГАРААР бичсэн утга (2026-09-30 (6)) — 💻
                   *    Дэлгэц/CPU/RAM/Хард нь ЧӨЛӨӨТ ТЕКСТ байснаа СОНГОЛТ
                   *    болсон тул хуучин зар дээр «512 GB SSD + 1 TB HDD» шиг
                   *    жагсаалтад БАЙХГҮЙ утга байж болно. `<select>`-д
                   *    таарах `<option>` байхгүй бол браузер «Сонгох»-ыг
                   *    харуулж, ХАДГАЛАХ үед утга АЛГА БОЛНО ✗ → тэр утгыг
                   *    нэмэлт `option` болгож харуулна (хэрэглэгч өөр сонголт
                   *    хийхгүй бол ХУУЧИН утга ХЭВЭЭР үлдэнэ ✓)
                   */
                  const legacy = f.type === 'select' && value && !(f.options || []).includes(value)
                    ? value : '';
                  return (
                  <div key={f.key} className="form-group">
                    <label>{f.icon ? `${f.icon} ` : ''}{f.label}</label>
                    {f.type === 'select' && f.searchable ? (
                      // ⚠️ `commitOnType` — форм дотор сервер рүү query явахгүй
                      //    тул бичих БҮРД хадгална (Enter дарахад «Хадгалах»-ыг
                      //    дарахгүйн тулд компонент Enter-ийг зогсоодог ✓)
                      <SearchableSelect
                        value={value}
                        options={f.options}
                        onChange={(v) => setAttr(f.key, v)}
                        placeholder="Бичиж хайх эсвэл өөрөө бичих"
                        ariaLabel={f.label}
                        commitOnType
                      />
                    ) : f.type === 'select' ? (
                      <select
                        value={value}
                        onChange={(e) => setAttr(f.key, e.target.value)}
                      >
                        <option value="">Сонгох</option>
                        {/* ⚠️ Хуучин утга (жагсаалтад байхгүй) — дээрх тайлбар */}
                        {legacy && <option value={legacy}>{legacy}</option>}
                        {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={f.type === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => setAttr(f.key, e.target.value)}
                        placeholder={f.placeholder || ''}
                      />
                    )}
                  </div>
                  );
                })}
                {/* ⚠️ Дэд төрөлд нь хамаарах талбар байгаа үед л тэмдэглэл —
                    «заавал биш» гэдгийг ойлгуулна (хэрэглэгчийн хүсэлт:
                    «аль нэгийг эсвэл хэд хэдийг сонгож болно») */}
                {attrFields.some((f) => Array.isArray(f.onlySubtypes)) && (
                  <p className="form-hint sm:col-span-2">
                    💻 Notebook-ийн үзүүлэлтүүд — заавал биш: дээрээс мэдэх хэсгээ л сонгоно уу
                  </p>
                )}
              </div>
            )}

            <div className="form-row">
              {/* «Өрөө» нь зөвхөн Орон сууц, АОС/хаус төрөлд харагдана (lib/locationData.js) */}
              {showRooms && (
                <div className="form-group">
                  <label>Өрөө</label>
                  <input type="number" min="0" value={form.rooms} onChange={(e) => set('rooms', e.target.value)} placeholder="3" />
                </div>
              )}
              {/* ⚠️ «Талбай» нь ЗӨВХӨН үл хөдлөх хэсэгт (0016) */}
              {isRealEstate && (
              <div className={`form-group ${showRooms ? '' : 'sm:col-span-2'}`}>
                <label>Талбай (м²)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={form.area}
                  onChange={(e) => set('area', e.target.value.replace(/[^\d.,]/g, ''))}
                  placeholder="75.5"
                />
                <p className="form-hint">Аравтын бутархайг «.» эсвэл «,»-ээр бичиж болно (ж: 75,5)</p>
              </div>
              )}
            </div>
            {/* ===== 🚿 УГААЛГЫН ӨРӨӨ (0012_listing_bathrooms.sql) =====
                АОС/хаус төрөлд ҮРГЭЛЖ, мөн 3 ба түүнээс олон өрөөтэй зарт
                харагдана (lib/locationData.js → hasBathroomFields). */}
            {showBathrooms && (
              <div className="form-row">
                <div className="form-group">
                  <label>Угаалгын өрөө</label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={form.bathrooms}
                    onChange={(e) => set('bathrooms', e.target.value)}
                    placeholder="1"
                  />
                  <p className="form-hint">Хэдэн угаалгын өрөөтэй вэ? (сонголтоор)</p>
                </div>
              </div>
            )}

            {/* ===== Орон сууцны нэмэлт мэдээлэл (зөвхөн Орон сууц сонгосон үед) ===== */}
            {showFloors && (
              <div className="form-row">
                {showApartment && (
                  <div className="form-group">
                    <label>Ашиглалтанд орсон ооон</label>
                    <input
                      type="number"
                      min="1900"
                      max="2100"
                      value={form.buildYear}
                      onChange={(e) => set('buildYear', e.target.value)}
                      placeholder="2015"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Барилгын нийт давхар</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={form.totalFloors}
                    onChange={(e) => set('totalFloors', e.target.value)}
                    placeholder="9"
                  />
                </div>
              </div>
            )}

            {showFloors && (
              <div className="form-row">
                <div className="form-group">
                  <label>Тухайн байрны давхар</label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={form.floor}
                    onChange={(e) => set('floor', e.target.value)}
                    placeholder="5"
                  />
                </div>
                {showApartment && (
                  <div className="form-group">
                    <label>Тагт (1-4)</label>
                    <select value={form.balconies} onChange={(e) => set('balconies', e.target.value)}>
                      <option value="">Сонгох</option>
                      {BALCONY_OPTIONS.map((n) => <option key={n} value={n}>{n} тагт</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {showApartment && (
              <div className="form-row">
                <div className="form-group">
                  <label>Гараж</label>
                  <select value={form.hasGarage} onChange={(e) => set('hasGarage', e.target.value)}>
                    <option value="">Сонгох</option>
                    {GARAGE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </div>
            )}
            </>
            )}

            {/* ═══ 3-р алхам · БАЙРШИЛ (хот · дүүрэг · хороо · хаяг) ═══ */}
            {step === 2 && (
            <>
            <div className="form-row">
              <div className="form-group">
                <label>Хот / Аймаг *</label>
                <select value={form.city} onChange={(e) => changeCity(e.target.value)}>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Дүүрэг / Сум</label>
                <select value={form.district} onChange={(e) => changeDistrict(e.target.value)}>
                  <option value="">Сонгох</option>
                  {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* ⚡ ХЯЛБАР ФОРМ (hobby): хороо/дэлгэрэнгүй хаяг ХАРАГДАХГҮЙ —
                байршил нь «Хот/Аймаг + Дүүрэг/Сум» хангалттай (хэрэглэгчийн хүсэлт).
                ⚠️ Засах горимд хуучин утга нь `form` дотор хэвээр — устгагдахгүй ✓ */}
            {!simpleForm && (
            <div className="form-row">
              <div className="form-group">
                <label>Хороо</label>
                <select value={form.khoroo} onChange={(e) => set('khoroo', e.target.value)}>
                  <option value="">Сонгох</option>
                  {khoroos.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Дэлгэрэнгүй хаяг</label>
                <input type="text" value={form.addressDetail} onChange={(e) => set('addressDetail', e.target.value)} placeholder="Байр, гудамж, байшингийн дугаар" />
              </div>
            </div>
            )}
            </>
            )}

            {/* ═══ 4-р алхам · ҮНЭ ба ТАЙЛБАР (үнэ · үнэ тохирно · тайлбар · видео) ═══ */}
            {step === 3 && (
            <>
            <div className="form-row">
              <div className="form-group">
                <label>Үнэ </label>
                {/* ⚠️ type="number" БИШ: number input нь «250,000,000» гэсэн
                    таслалтай утгыг ХҮЛЭЭХГҮЙ (хоосон болгочихдог). Тиймээс
                    type="text" + inputMode="numeric" ашиглаж, бичих үед нь
                    мянгатаар хувааж харуулаад, төлөвт ЗӨВХӨН ЦИФР хадгална.

                    ⚠️ ₮-г input ДОТОР absolute-аар БАЙРЛУУЛАХГҮЙ: CSS
                    specificity-ийн улмаас `.form-group :is(input…)` (0,1,1) нь
                    `.pl-7` (0,1,0)-г дардаг тул input-ийн padding-left 12px
                    хэвээр үлдэж, ₮ нь ЭХНИЙ ТООН ДЭЭР ДАВХАРЛАДАГ байв.
                    Одоо ₮ нь хөрш элемент (input group) — давхарлах боломжгүй.

                    🤝 «Үнэ тохирно» (2026-09-29): үнэ нь ЗААВАЛ БИШ тул чекбоксыг
                    нэмэв. ⚠️ Хэрэглэгчийн шаардлага: чекбокс нь ҮНИЙГ
                    УСТГАХГҮЙ / идэвхгүй болгохгүй ✗ — бичсэн үнэ ХЭВЭЭР
                    үлдэж, зар дээр үнийн ЯГ ДОР нь «Үнэ тохирно» мөр нэмэгдэнэ
                    (`negotiableNote`, lib/format.js) ✓ */}
                <div className="flex items-stretch gap-2">
                  <span className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm font-bold text-gray-500">
                    ₮
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    className="min-w-0 flex-1 font-semibold tabular-nums"
                    value={formatThousands(form.price)}
                    onChange={(e) => set('price', e.target.value.replace(/\D/g, ''))}
                    placeholder="250,000,000"
                  />
                </div>
                {/* Дээрх талбартай ДАВХАРДАХГҮЙ — зөвхөн нэмэлт мэдээлэл:
                    хэдэн орон (тэг тоолох алдаа арилна) + «сая/тэрбум» уншилт.
                    ⚠️ «Үнэ тохирно»-гийн талаарх ТАЙЛБАР ЭНД БАЙХГҮЙ —
                       хэрэглэгчийн шаардлага: илүү тайлбар бүү оруул ✗ */}
                {form.price ? (
                  <p className="form-hint">
                    {digitCount(form.price)} орон
                    {shortPrice(form.price) ? ` · ≈ ${shortPrice(form.price)} ₮` : ''}
                  </p>
                ) : null}
                {/* Чекбокс — зүгээр checkbox + текст (гаднах box БАЙХГҮЙ, 🤝 emoji БАЙХГҮЙ).
                    ⚠️ 2026-10-01 (CSS SPECIFICITY — ₮-гийн асуудалтай ИЖИЛ):
                       `.form-group label { display:block }` (globals.css, (0,1,1)) нь
                       label-ийн `flex` (0,1,0)-ийг ДАРДАГ тул чекбокс+текст текстийн
                       ДЭЭР БИШ, зөвхөн ЯГ ЗҮҮН талд гарахын тулд ДОТООД
                       `<span class="flex">` (label-ийг БИШ) ашиглав ✓
                    ⚠️ checkbox-ийн `w-full`-ийг globals.css дээр `:not([type="checkbox"])`
                       -оор зассан (эс бөгөөс чекбокс бүтэн өргөн болно) ✓
                    ⚠️ `price`-ыг ХӨНДӨХГҮЙ, input-ыг disabled БОЛГОХГҮЙ ✗ —
                       хоёулаа зэрэг байж болно: «₮5,000,000» + «Үнэ тохирно» ✓ */}
                <label className="mt-2 block w-fit cursor-pointer">
                  <span className="flex w-fit items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.negotiable}
                      onChange={(e) => setForm((f) => ({ ...f, negotiable: e.target.checked }))}
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="text-[13px] font-normal text-gray-700">{NEGOTIABLE_PRICE_LABEL}</span>
                  </span>
                </label>
              </div>
              {/* <div className="form-group">
                <label>Үнийн төрөл</label>
                <select value={form.priceType} onChange={(e) => set('priceType', e.target.value)}>
                  <option value="total">Нийт үнэ</option>
                  <option value="month">Сард</option>
                  <option value="day">Өдөрт</option>
                  <option value="sqm">м² тутамд</option>
                </select>
              </div> */}
            </div>
            </>
            )}

            {/* ═══ 5-р алхам · ЗУРАГ ба ХОЛБОО (утас · зураг) ═══ */}
            {step === 4 && (
            <>
            <div className="form-row">
              <div className="form-group">
                <label>Холбоо барих утас *</label>
                <input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="99112233" required />
              </div>
              {/* <div className="form-group">
                <label>Холбоо барих хүн</label>
                <input type="text" value={form.contactName} onChange={(e) => set('contactName', e.target.value)} placeholder="Таны нэр" />
              </div> */}
            </div>
            </>
            )}

            {/* ═══ 4-р алхам (үргэлжлэл) · ТАЙЛБАР + видео ═══ */}
            {step === 3 && (
            <>
            <div className="form-group">
              <label>Нэмэлт тайлбар</label>
              <textarea rows="4" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Зарын дэлгэрэнгүй мэдээлэл, онцлог шинж чанарууд..." />
            </div>

            {/* 🎥 YouTube видео линк — Storage 0 MB (файл биш, линк хадгална).
                ⚡ ХЯЛБАР ФОРМ (hobby) дээр ХАРАГДАХГҮЙ — хэрэглэгчийн хүсэлт:
                зөвхөн байршил · шинэ/хуучин · үнэ · утас · тайлбар. */}
            {!simpleForm && <YouTubeField value={form.videoUrl} onChange={(v) => set('videoUrl', v)} />}
            </>
            )}

            {/* ═══ 5-р алхам (үргэлжлэл) · ЗУРАГ — одоогийн ба шинэ зураг ═══ */}
            {step === 4 && (
            <>
            {isEdit && existingImages.length > 0 && (
              <div className="form-group">
                <label>Одоогийн зурагнууд ({existingImages.length})</label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {existingImages.map((url, i) => (
                    <div key={`${url}-${i}`} className="relative aspect-square overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        title="Устгах"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm leading-none text-white"
                        onClick={() => setExistingImages((p) => p.filter((_, idx) => idx !== i))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <p className="form-hint">× дарж хуучин зургийг устгаж болно (хадгалахад шинэчлэгдэнэ)</p>
              </div>
            )}

            <div className="form-group">
              <label>Зураг оруулах</label>
              <div
                className={`cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-10 text-center transition hover:border-primary hover:bg-primary-light ${
                  compressing ? 'pointer-events-none opacity-60' : ''
                }`}
                onClick={() => document.getElementById('imageInput')?.click()}
              >
                <div className="text-[40px]">{compressing ? '⏳' : '📷'}</div>
                <p>{compressing ? 'Зургуудыг шахаж байна...' : 'Зураг оруулахын тулд дарна уу'}</p>
                <p className="form-hint">
                  Дээд тал нь 10 зураг (jpg, png, webp) · 🗜 автоматаар <b>1600px / 82%</b> болж шахагдана
                </p>
              </div>
              <input
                type="file"
                id="imageInput"
                accept="image/*"
                multiple
                className="hidden"
                disabled={compressing}
                onChange={onPickFiles}
              />

              {lastReport && (
                <p className="form-hint">
                  🗜 <b>{lastReport.count} зураг</b> шахагдлаа: {formatBytes(lastReport.totalOriginal)} →{' '}
                  <b>{formatBytes(lastReport.totalNew)}</b>
                  {lastReport.savedPercent > 0 && ` · ${lastReport.savedPercent}% хэмнэлт 🎉`}
                </p>
              )}

              {pending.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                  {pending.map((p, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm leading-none text-white"
                        onClick={() => removeImage(i)}
                      >
                        ×
                      </button>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1.5 py-0.5 text-center text-[10px] text-white">
                        {formatBytes(p.newSize)}
                        {p.savedPercent > 0 ? ` · −${p.savedPercent}%` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            </>
            )}

            {/* 🪜 АЛХМЫН НАВИГАЦ — Буцах / Үргэлжлүүлэх / Нийтлэх */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={goBack}
                className="btn btn-ghost"
                disabled={submitting || compressing}
              >
                {step === 0 ? 'Цуцлах' : '← Буцах'}
              </button>
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={goNext} className="btn btn-primary btn-lg">
                  Үргэлжлүүлэх →
                </button>
              ) : (
                <button type="submit" className="btn btn-primary btn-lg" disabled={submitting || compressing}>
                  {compressing
                    ? '🗜 Зургуудыг шахаж байна...'
                    : submitting
                      ? isEdit ? 'Хадгалж байна...' : 'Нийтэлж байна...'
                      : isEdit ? '💾 Өөрчлөлтийг хадгалах' : '✅ Зар нийтлэх'}
                </button>
              )}
            </div>
          </form>
          </div>
        </div>
      </div>
    </div>
  );
}
