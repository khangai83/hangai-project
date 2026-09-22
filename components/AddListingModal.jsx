'use client';

import { useEffect, useRef, useState } from 'react';
import { useToast, useUI } from './AppProviders';
import { createListing, updateListing, uploadImages } from '../lib/queries';
import { CITIES, getDistricts, getKhoroos, PROPERTY_TYPES, hasApartmentFields, hasFloorFields, hasRoomsFields, BALCONY_OPTIONS, GARAGE_OPTIONS } from '../lib/locationData';
import { normalizePhone, getPropertyTypeLabel } from '../lib/format';
import phoneEmail from '../lib/phoneEmail';
import { compressImages, formatBytes } from '../lib/imageUtils';

/** Зарын DB мөр → форм (засах горимд) */
function listingToForm(l) {
  return {
    category: l.category || 'sell',
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
    // ---- Орон сууцны нэмэлт мэдээлэл ----
    buildYear: l.build_year ? String(l.build_year) : '',
    floor: l.floor ? String(l.floor) : '',
    totalFloors: l.total_floors ? String(l.total_floors) : '',
    balconies: l.balconies ? String(l.balconies) : '',
    hasGarage: l.has_garage === true ? 'yes' : l.has_garage === false ? 'no' : '',
  };
}

export default function AddListingModal({ open, onClose, userId, displayName, userPhone, editing }) {
  const { showToast } = useToast();
  const { notifyListingsChanged } = useUI();

  const isEdit = !!(editing && editing.id);

  const emptyForm = () => ({
    category: 'sell',
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
    // ---- Орон сууцны нэмэлт мэдээлэл ----
    buildYear: '',    // Ашиглалтанд орсон он
    floor: '',        // Тухайн байр хэдэн давхарт
    totalFloors: '',  // Барилгын нийт давхар
    balconies: '',    // Тагтны тоо (1-4)
    hasGarage: '',    // '' | 'yes' | 'no'
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

  // Орон сууцны нэмэлт талбарууд төрлөөс хамаарч харагдана
  const showApartment = hasApartmentFields(form.propertyType);
  const showFloors = hasFloorFields(form.propertyType);
  const showRooms = hasRoomsFields(form.propertyType); // ← зөвхөн Орон сууц, АОС/хаус

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
    if (!form.propertyType) { setError('Үл хөдлөх хөрөнгийн төрлөө сонгоно уу'); return; }
    if (!form.city) { setError('Хот/Аймгаа сонгоно уу'); return; }
    if (!form.price) { setError('Үнээ оруулна уу'); return; }
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
        rooms: showRooms ? form.rooms : '',
        buildYear: showApartment ? form.buildYear : '',
        floor: showFloors ? form.floor : '',
        totalFloors: showFloors ? form.totalFloors : '',
        balconies: showApartment ? form.balconies : '',
        hasGarage: showApartment ? form.hasGarage : '',
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
              <div className="form-group">
                <label>Зар эсвэл түрээс *</label>
                <select value={form.category} onChange={(e) => set('category', e.target.value)}>
                  <option value="sell">💰 Зарах</option>
                  <option value="rent">🔑 Түрээслэх</option>
                </select>
              </div>
              <div className="form-group">
                <label>Үл хөдлөх хөрөнгийн төрөл *</label>
                <select value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
                  <option value="">Сонгох</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>{getPropertyTypeLabel(t, form.category)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              {/* «Өрөө» нь зөвхөн Орон сууц, АОС/хаус төрөлд харагдана (lib/locationData.js) */}
              {showRooms && (
                <div className="form-group">
                  <label>Өрөө</label>
                  <input type="number" min="0" value={form.rooms} onChange={(e) => set('rooms', e.target.value)} placeholder="3" />
                </div>
              )}
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
            </div>

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
                <input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="₮" required />
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
