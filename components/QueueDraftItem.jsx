'use client';

import { useState } from 'react';
import { useToast, useUI } from './AppProviders';
import { publishDraftAsListing, rejectDraft, draftToPayload } from '../lib/draftQueries';
import { getDistricts, getKhoroos, CITIES, PROPERTY_TYPES, hasApartmentFields, hasFloorFields, BALCONY_OPTIONS, GARAGE_OPTIONS } from '../lib/locationData';
import { formatPrice, timeAgo, getPropertyTypeLabel } from '../lib/format';

export const STATUS_LABELS = { pending: '⏳ Хүлээж байна', approved: '✅ Баталсан', published: '📣 Нийтлэгдсэн', rejected: '🗑 Татгалзсан' };
const STATUS_BADGE = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  published: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};
const PRICE_TYPES = [['total', 'Нийт үнэ'], ['month', 'Сард'], ['day', 'Өдөрт'], ['sqm', 'м² тутамд']];

function jsonArr(v) {
  if (Array.isArray(v)) return v;
  try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch (e) { return []; }
}

// ---------- Нэг draft-ийн баталгаажуулалтын карт ----------
export default function QueueDraftItem({ draft, userId, onActionDone }) {
  const { showToast } = useToast();
  const { notifyListingsChanged } = useUI();
  const [vals, setVals] = useState(() => ({
    category: draft.category || 'sell',
    propertyType: draft.property_type || '',
    rooms: draft.rooms || '',
    area: draft.area || '',
    city: draft.city || 'Улаанбаатар',
    district: draft.district || '',
    khoroo: draft.khoroo || '',
    addressDetail: draft.address_detail || '',
    price: draft.price || '',
    priceType: draft.price_type || 'total',
    description: draft.description || '',
    phone: draft.phone || '',
    contactName: draft.contact_name || '',
    // ---- Орон сууцны нэмэлт мэдээлэл ----
    buildYear: draft.build_year || '',
    floor: draft.floor || '',
    totalFloors: draft.total_floors || '',
    balconies: draft.balconies || '',
    hasGarage: typeof draft.has_garage === 'boolean' ? (draft.has_garage ? 'yes' : 'no') : '',
  }));
  const [imagesText, setImagesText] = useState(() => {
    const imgs = jsonArr(draft.images).length ? jsonArr(draft.images) : jsonArr(draft.raw_images);
    return imgs.join('\n');
  });
  const [busy, setBusy] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const set = (k, v) => setVals((s) => ({ ...s, [k]: v }));
  const changeCity = (c) => setVals((s) => ({ ...s, city: c, district: '', khoroo: '' }));
  const changeDistrict = (d) => setVals((s) => ({ ...s, district: d, khoroo: '' }));

  const districts = getDistricts(vals.city);
  const khoroos = getKhoroos(vals.city, vals.district);
  const draftImages = jsonArr(draft.raw_images);
  const done = draft.status === 'published' || draft.status === 'rejected';
  const rejected = draft.status === 'rejected';

  // Орон сууцны нэмэлт талбарууд төрлөөс хамаарч харагдана
  const showApartment = hasApartmentFields(vals.propertyType);
  const showFloors = hasFloorFields(vals.propertyType);

  const handlePublish = async () => {
    if (!vals.propertyType) { showToast('Үл хөдлөх хөрөнгийн төрөл сонгоно уу', 'error'); return; }
    if (!vals.price) { showToast('Үнэ оруулна уу', 'error'); return; }
    if (!vals.phone) { showToast('Холбоо барих утас оруулна уу', 'error'); return; }
    setBusy(true);
    try {
      const payload = draftToPayload(draft, {
        category: vals.category,
        property_type: vals.propertyType,
        rooms: vals.rooms,
        area: vals.area,
        city: vals.city,
        district: vals.district,
        khoroo: vals.khoroo,
        address_detail: vals.addressDetail,
        price: vals.price,
        price_type: vals.priceType,
        description: vals.description,
        phone: vals.phone,
        contact_name: vals.contactName,
        build_year: showApartment ? vals.buildYear : '',
        floor: showFloors ? vals.floor : '',
        total_floors: showFloors ? vals.totalFloors : '',
        balconies: showApartment ? vals.balconies : '',
        has_garage: showApartment && vals.hasGarage ? vals.hasGarage === 'yes' : '',
      });
      const images = imagesText.split('\n').map((s) => s.trim()).filter(Boolean);
      await publishDraftAsListing(userId, draft, payload, images);
      notifyListingsChanged();
      showToast('Зарыг нийтэлсэн ✅');
      onActionDone();
    } catch (err) {
      showToast(err.message || 'Нийтлэхэд алдаа', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    const note = window.prompt('Татгалзах шалтгаан (заавал биш):') ?? null;
    setBusy(true);
    try {
      await rejectDraft(userId, draft.id, note);
      showToast('Зарыг татгалзлаа');
      onActionDone();
    } catch (err) {
      showToast(err.message || 'Алдаа', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-card sm:p-5 ${rejected ? 'bg-gray-50 opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <strong className="mr-2 text-base">{draft.title || 'Гарчиггүй зар'}</strong>
          <span className={`inline-block rounded-full px-2.5 py-0.5 align-middle text-[11px] font-medium ${STATUS_BADGE[draft.status] || 'bg-gray-100 text-gray-700'}`}>
            {STATUS_LABELS[draft.status]}
          </span>
        </div>
        <div className="flex flex-wrap gap-3.5 text-[13px] text-gray-500">
          {draft.group_name && <span>👥 {draft.group_name}</span>}
          {draft.posted_by && <span>✍️ {draft.posted_by}</span>}
          {draft.posted_at && <span>📅 {timeAgo(draft.posted_at)}</span>}
        </div>
        {draft.post_url && (
          <a href={draft.post_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">🔗 Facebook</a>
        )}
      </div>

      <div className="mt-3 mb-1">
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowRaw((v) => !v)}>
          {showRaw ? '▲ Анхны текстыг нуух' : '▼ Анхны FB текстыг харах'}
        </button>
        {showRaw && (
          <pre className="mt-2 max-h-[200px] overflow-auto whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 p-3 text-[13px] text-gray-700 [word-break:break-word]">
            {draft.raw_text}
          </pre>
        )}
      </div>

      {draftImages.length > 0 && (
        <div className="my-2.5 flex gap-2 overflow-x-auto">
          {draftImages.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt="" loading="lazy" className="h-[90px] w-[90px] shrink-0 rounded-[10px] border border-gray-200 object-cover" />
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-col gap-2.5">
        <div className="form-row">
          <div className="form-group">
            <label>Категори</label>
            <select value={vals.category} onChange={(e) => set('category', e.target.value)} disabled={done}>
              <option value="rent">🔑 Түрээслэх</option>
              <option value="sell">💰 Зарах</option>
            </select>
          </div>
          <div className="form-group">
            <label>Үл хөдлөх хөрөнгийн төрөл *</label>
            <select value={vals.propertyType} onChange={(e) => set('propertyType', e.target.value)} disabled={done}>
              <option value="">Сонгох</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>{getPropertyTypeLabel(t, vals.category)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group"><label>Өрөө</label><input type="number" min="0" value={vals.rooms} onChange={(e) => set('rooms', e.target.value)} disabled={done} /></div>
          <div className="form-group"><label>Талбай (м²)</label><input type="number" min="0" value={vals.area} onChange={(e) => set('area', e.target.value)} disabled={done} /></div>
          <div className="form-group"><label>Үнэ (₮) *</label><input type="number" min="0" value={vals.price} onChange={(e) => set('price', e.target.value)} disabled={done} /></div>
          <div className="form-group">
            <label>Үнийн төрөл</label>
            <select value={vals.priceType} onChange={(e) => set('priceType', e.target.value)} disabled={done}>
              {PRICE_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {showFloors && (
          <div className="form-row">
            {showApartment && (
              <div className="form-group">
                <label>Ашиглалтанд орсон он</label>
                <input type="number" min="1900" max="2100" value={vals.buildYear} onChange={(e) => set('buildYear', e.target.value)} placeholder="2015" disabled={done} />
              </div>
            )}
            <div className="form-group">
              <label>Барилгын нийт давхар</label>
              <input type="number" min="1" max="200" value={vals.totalFloors} onChange={(e) => set('totalFloors', e.target.value)} placeholder="9" disabled={done} />
            </div>
          </div>
        )}

        {showFloors && (
          <div className="form-row">
            <div className="form-group">
              <label>Тухайн байрны давхар</label>
              <input type="number" min="1" max="200" value={vals.floor} onChange={(e) => set('floor', e.target.value)} placeholder="5" disabled={done} />
            </div>
            {showApartment && (
              <div className="form-group">
                <label>Тагт (1-4)</label>
                <select value={vals.balconies} onChange={(e) => set('balconies', e.target.value)} disabled={done}>
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
              <select value={vals.hasGarage} onChange={(e) => set('hasGarage', e.target.value)} disabled={done}>
                <option value="">Сонгох</option>
                {GARAGE_OPTIONS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label>Хот/Аймаг</label>
            <select value={vals.city} onChange={(e) => changeCity(e.target.value)} disabled={done}>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Дүүрэг/Сум</label>
            <select value={vals.district} onChange={(e) => changeDistrict(e.target.value)} disabled={done}>
              <option value="">Сонгох</option>
              {districts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Хороо</label>
            <select value={vals.khoroo} onChange={(e) => set('khoroo', e.target.value)} disabled={done}>
              <option value="">Сонгох</option>
              {khoroos.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Дэлгэрэнгүй хаяг</label>
            <input type="text" value={vals.addressDetail} onChange={(e) => set('addressDetail', e.target.value)} placeholder="Байр, гудамж" disabled={done} />
          </div>
        </div>


        <div className="form-row">
          <div className="form-group">
            <label>Утас *</label>
            <input type="tel" value={vals.phone} onChange={(e) => set('phone', e.target.value)} disabled={done} />
          </div>
          <div className="form-group">
            <label>Холбоо барих хүн</label>
            <input type="text" value={vals.contactName} onChange={(e) => set('contactName', e.target.value)} disabled={done} />
          </div>
        </div>
        <div className="form-group">
          <label>Тайлбар</label>
          <textarea rows="3" value={vals.description} onChange={(e) => set('description', e.target.value)} disabled={done} />
        </div>


        <div className="form-group">
          <label>Зургийн URL (мөр бүр дээр нэг URL)</label>
          <textarea rows="2" value={imagesText} onChange={(e) => setImagesText(e.target.value)} disabled={done} placeholder="https://...jpg" />
        </div>

        {vals.price > 0 && <p className="font-semibold text-green-700">💰 Нийтлэх үнэ: ₮{formatPrice(vals.price)}</p>}
      </div>
      {!done && (
        <div className="mt-3.5 flex gap-2.5">
          <button className="btn btn-primary" onClick={handlePublish} disabled={busy}>
            {busy ? 'Нийтэлж байна...' : '✅ Нийтлэх'}
          </button>
          <button className="btn btn-danger" onClick={handleReject} disabled={busy}>🗑 Татгалзах</button>
        </div>
      )}
      {rejected && draft.notes && <p className="mt-2.5 text-[13px] text-red-800">Шалтгаан: {draft.notes}</p>}
    </div>
  );
}

