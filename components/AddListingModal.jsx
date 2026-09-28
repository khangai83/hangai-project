'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast, useUI } from './AppProviders';
import { createListing, updateListing, uploadImages } from '../lib/queries';
import { CITIES, getDistricts, getKhoroos, hasApartmentFields, hasFloorFields, hasRoomsFields, hasBathroomFields, BALCONY_OPTIONS, GARAGE_OPTIONS, SECTIONS, getSubtypes, hasCategoryChoice, getSubtypeGroups } from '../lib/locationData';
import { normalizePhone, getPropertyTypeLabel, formatThousands, digitCount, shortPrice } from '../lib/format';
import phoneEmail from '../lib/phoneEmail';
import YouTubeField from './YouTubeField';
import SearchableSelect from './SearchableSelect';
import { parseYouTube } from '../lib/youtube.mjs';
import { compressImages, formatBytes } from '../lib/imageUtils';

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

export default function AddListingModal({ open, onClose, userId, displayName, userPhone, editing }) {
  const { showToast } = useToast();
  const { notifyListingsChanged } = useUI();

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

  useEffect(() => {
    if (!open) return;
    const initial = isEdit ? listingToForm(editing) : emptyForm();
    setForm(initial);
    setPending([]);
    setExistingImages(isEdit && Array.isArray(editing.images) ? editing.images : []);
    setError('');
    baselineRef.current = JSON.stringify(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  const originalImageCount = isEdit && Array.isArray(editing.images) ? editing.images.length : 0;
  const isDirty = () =>
    JSON.stringify(form) !== baselineRef.current ||
    pending.length > 0 ||
    existingImages.length !== originalImageCount;

  /**
   * Цонх хаах. ⚠️ Гадна (хар дэвсгэр) дарж санамсаргүй хаагдаж, оруулсан
   * мэдээлэл алдагдахаас сэргийлж: өөрчлөлт байвал баталгаажуулна.
   */
  const requestClose = () => {
    if (submitting) return;
    if (isDirty() && !window.confirm('Оруулсан мэдээлэл хадгалагдахгүй УСТАНА. Гарахдаа итгэлтэй байна уу?')) {
      return;
    }
    onClose();
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
   */
  const subtypeGroups = getSubtypeGroups(form.section || 'real-estate');
  /** «Зарах / Түрээслэх» сонголт харагдах эсэх — ⚠️ ЗӨВХӨН үл хөдлөхөд */
  const showCategoryChoice = hasCategoryChoice(form.section || 'real-estate');
  /** Тухайн хэсгийн attr талбарүүд (форм автоматаар үүсгэнэ) */
  const attrFields = (SECTIONS.find((s) => s.value === (form.section || 'real-estate')) || SECTIONS[0]).attrFields || [];

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.propertyType) { setError('Зарын төрлөө сонгоно уу'); return; }
    if (!form.city) { setError('Хот/Аймгаа сонгоно уу'); return; }
    // ⚠️ Үнэ нь ЗӨВХӨН ЦИФР хэлбэрээр хадгалагдана (formatThousands нь зөвхөн
    //    ХАРАГДАЦЫГ таслалтай болгоно). quires.js → toNumber() нь «,»-г
    //    аравтын бутархай гэж үздэг тул таслалтай утга илгээвэл үнэ 0 болно.
    const priceDigits = String(form.price || '').replace(/\D/g, '');
    if (!priceDigits) { setError('Үнээ оруулна уу'); return; }
    if (Number(priceDigits) <= 0) { setError('Үнэ 0-ээс их байх ёстой'); return; }
    if (priceDigits.length > 15) { setError('Үнэ хэт урт байна (15 цифр хүртэл)'); return; }
    // 🎥 Видео линк: хоосон бол зүгээр; бичсэн бол YouTube линк БАЙХ ЁСТОЙ
    // (буруу линк хадгалагдвал дэлгэрэнгүй хуудас дээр видео харагдахгүй).
    if (form.videoUrl && form.videoUrl.trim() && !parseYouTube(form.videoUrl).ok) {
      setError('YouTube линк буруу байна. Жишээ: https://youtu.be/dQw4w9WgXcQ');
      return;
    }
    if (!form.phone) { setError('Холбоо барих утас оруулна уу'); return; }

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
      onClose();
    } catch (err) {
      setError(err.message || (isEdit ? 'Зар засахад алдаа гарлаа' : 'Зар нэмэхэд алдаа гарлаа'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-5" onClick={requestClose}>
      <div
        className="max-h-[90vh] w-full max-w-[760px] overflow-y-auto rounded-2xl bg-white shadow-card-hover"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <h2 className="text-xl font-semibold">{isEdit ? '✏️ Зарыг засах' : '➕ Зар нэмэх'}</h2>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg transition hover:bg-gray-200"
            onClick={requestClose}
            aria-label="Хаах"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {error && <div className="mb-3 rounded-lg bg-red-50 p-2.5 text-red-800">{error}</div>}

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

            {/* ===== ХЭСГИЙН НЭМЭЛТ ТАЛБАРУУД (attrs jsonb, 0016) =====
                ⚠️ Хэсэг тус бүрд өөр (Авто: брэнд/он/гүйлт/түлш; Ажил: компани/
                   цалин; Компьютер: CPU/RAM …). `SECTIONS[].attrFields`-ээс
                   автоматаар үүснэ — шинэ талбар нэмэхэд код засахгүй.
                🔎 `searchable: true` (ж: 🏷️ Брэнд — 38 сонголт) нь ХАЙЛТТАЙ
                   COMBOBOX: бичнэ → жагсаалт шүүгдэнэ; жагсаалтад байхгүй
                   брэндийг ГАРААР бичиж болно ✓ (хэрэглэгчийн хүсэлт). */}
            {attrFields.length > 0 && (
              <div className="form-row">
                {attrFields.map((f) => (
                  <div key={f.key} className="form-group">
                    <label>{f.icon ? `${f.icon} ` : ''}{f.label}</label>
                    {f.type === 'select' && f.searchable ? (
                      // ⚠️ `commitOnType` — форм дотор сервер рүү query явахгүй
                      //    тул бичих БҮРД хадгална (Enter дарахад «Хадгалах»-ыг
                      //    дарахгүйн тулд компонент Enter-ийг зогсоодог ✓)
                      <SearchableSelect
                        value={(form.attrs || {})[f.key] || ''}
                        options={f.options}
                        onChange={(v) => setAttr(f.key, v)}
                        placeholder="Бичиж хайх эсвэл өөрөө бичих"
                        ariaLabel={f.label}
                        commitOnType
                      />
                    ) : f.type === 'select' ? (
                      <select
                        value={(form.attrs || {})[f.key] || ''}
                        onChange={(e) => setAttr(f.key, e.target.value)}
                      >
                        <option value="">Сонгох</option>
                        {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        type={f.type === 'number' ? 'number' : 'text'}
                        value={(form.attrs || {})[f.key] || ''}
                        onChange={(e) => setAttr(f.key, e.target.value)}
                        placeholder={f.placeholder || ''}
                      />
                    )}
                  </div>
                ))}
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

            <div className="form-row">
              <div className="form-group">
                <label>Үнэ *</label>
                {/* ⚠️ type="number" БИШ: number input нь «250,000,000» гэсэн
                    таслалтай утгыг ХҮЛЭЭХГҮЙ (хоосон болгочихдог). Тиймээс
                    type="text" + inputMode="numeric" ашиглаж, бичих үед нь
                    мянгатаар хувааж харуулаад, төлөвт ЗӨВХӨН ЦИФР хадгална.

                    ⚠️ ₮-г input ДОТОР absolute-аар БАЙРЛУУЛАХГҮЙ: CSS
                    specificity-ийн улмаас `.form-group :is(input…)` (0,1,1) нь
                    `.pl-7` (0,1,0)-г дардаг тул input-ийн padding-left 12px
                    хэвээр үлдэж, ₮ нь ЭХНИЙ ТООН ДЭЭР ДАВХАРЛАДАГ байв.
                    Одоо ₮ нь хөрш элемент (input group) — давхарлах боломжгүй. */}
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
                    required
                  />
                </div>
                {/* Дээрх талбартай ДАВХАРДАХГҮЙ — зөвхөн нэмэлт мэдээлэл:
                    хэдэн орон (тэг тоолох алдаа арилна) + «сая/тэрбум» уншилт */}
                {form.price ? (
                  <p className="form-hint">
                    {digitCount(form.price)} орон
                    {shortPrice(form.price) ? ` · ≈ ${shortPrice(form.price)} ₮` : ''}
                  </p>
                ) : (
                  <p className="form-hint">Мянгатаар автоматаар хуваагдана</p>
                )}
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

            <div className="form-group">
              <label>Нэмэлт тайлбар</label>
              <textarea rows="4" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Үл хөдлөх хөрөнгийн дэлгэрэнгүй мэдээлэл, онцлог шинж чанарууд..." />
            </div>

            {/* 🎥 YouTube видео линк — Storage 0 MB (файл биш, линк хадгална) */}
            <YouTubeField value={form.videoUrl} onChange={(v) => set('videoUrl', v)} />

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

            <button type="submit" className="btn btn-primary btn-lg mt-4 w-full" disabled={submitting || compressing}>
              {compressing
                ? '🗜 Зургуудыг шахаж байна...'
                : submitting
                  ? isEdit ? 'Хадгалж байна...' : 'Нийтэлж байна...'
                  : isEdit ? '💾 Өөрчлөлтийг хадгалах' : '✅ Зар нийтлэх'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
