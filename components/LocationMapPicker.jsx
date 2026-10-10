'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
/** (114): `✕` тэмдэгтийн оронд SVG — фонтоос хамаарахгүй, өнгийг дагана ✓ */
import { CloseIcon } from './HeaderIcons';
import {
  DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, PICK_ZOOM, PICK_ZOOM_FOUND, isValidCoord,
  geocodeUrl, parseGeocodeResults, reverseGeocodeUrl, parseReverseResult,
  districtPolygonUrl, extractPolygon, pointInGeoJson,
} from '../lib/locationGeo.mjs';

/* ============================================================
   🗺 ГАЗРЫН ЗУРАГ ДЭЭРХ БАЙРШИЛ (LocationMapPicker) — 2026-10-06
   ------------------------------------------------------------
   🎯 ХЭРЭГЛЭГЧИЙН ГОМДОЛ: «Газрын зураг дээр … 23-р хороо, Хан-Уул …
   энэ зар чинь харагдахгүй байна даа. Жишиг сайт дээр бол хэрэглэгч хаягаа
   оруулсны дараа шууд газрын зураг дээр зааж өгөх боломжтой хэсэг тухайн
   цонхон дээр нь гараад ирдэг юм байна (Хавсралт хараарай)».

   ⇒ `жишиг сайт`-ийн цонхыг ДАГНАСАН: газрын зураг дээр пин тавьж,
     «Үргэлжлүүлэх» дарвал тэр солбицол зарын хамт хадгалагдана ✓

   🆕 2026-10-06 (3 дахь засвар — хэрэглэгчийн хүсэлт: «Пин ийг газрын
      зураг дээр зөөгөөд явхад лайтай юм. Зүгээр гарын зургаа хөдөлгөөд
      Пин нь төвдөө байвал, газрын зургаараа тааруулчиж болохоор байна»):
      ⇒ пин нь ОДОО **ТӨВД ТОГТМОЛ** (`PinIcon` — DOM overlay; Leaflet
        marker-ийн ЧИРЭЛТ бүрэн ХАСАГДАВ ✗):
        ① газрын ЗУРГИЙГ ЧИРЭХЭД (pan) пин төвдөө үлдэж, солбицол нь
           `map.getCenter()`-ээс уншигдана (`move` — rAF-throttle ✓)
        ② газрын зураг дээр ДАРЖ БОЛНО — `map.panTo(дарсан цэг)` тул зураг
           ГУЛСАЖ, пин тэр цэг рүү буулгана ✓
        ③ 🆕 🔍 ХАЙЛТ (Nominatim/OSM) + 📍 МИНИЙ БАЙРШИЛ (geolocation)
           ⇒ ХОРООНЫ НАРИЙВЧЛАЛ (`lib/locationGeo.mjs → geocodeUrl`)
      ⏳ Яагаад сольсон: marker-ийг ЧИРЭХ нь жижиг зурагт/мобайлд тааруу ✗ —
         зургийг чирэх нь илүү жигд (smooth), тааруулахад хялбар ✓
      ⚠️ (2 дахь засвар: marker `draggable` — тэр механизм ОДОО БАЙХГҮЙ ✓)

   ⚠️ Зөвхөн ЭНЭ модаль leaflet-ыг динамик импортолно (`MapView`-тэй ижил
      арга) — SSR дээр `window` байхгүй тул `useEffect` дотор ✓
   ⚠️ Read-only `MapView`-г ХӨНДӨХГҮЙ — тэр нь зөвхөн заруудыг зурдаг хэвээр ✓
   ============================================================ */

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTR = '&copy; OpenStreetMap';

/** Modal-ийн ТЕКСТ — ⚠️ нэг эх сурвалж (UI ба `test-location-map` ижил мөр) */
export const MAP_PICKER_TITLE = 'Газрын зураг дээрх байршил';
export const MAP_PICKER_HINT = 'Газрын зургийг чирж, пинь төвд байгаа цэг дээр таарна уу';
export const MAP_PICKER_BACK = 'Байршлын жагсаалт руу буцах';
export const MAP_PICKER_CONFIRM = 'Үргэлжлүүлэх';
/** 🆕 🔍 ХОРООНЫ НАРИЙВЧЛАЛ (3 дахь засвар) — хайлт ба «миний байршил» */
export const MAP_PICKER_SEARCH_PH = 'Дүүрэг, гудамж, байрны нэр хайх…';
export const MAP_PICKER_SEARCH_BTN = 'Хайх';
export const MAP_PICKER_MY_LOCATION = 'Миний байршил';
export const MAP_PICKER_SEARCH_ERR = 'Хайлт амжилтгүй — интернэт холболтоо шалгана уу';
/** ⚠️ ШУДАРГА мессеж: OpenStreetMap-д Монголын хороо БҮГД байхгүй ✗ —
 *  хэрэглэгчид «яагаад олдохгүй байна» гэдгийг шууд хэлж, ДАРААГИЙН АЛХМЫГ заана ✓ */
export const MAP_PICKER_NOT_FOUND =
  'Юу ч олдсонгүй — «Хан-Уул, Улаанбаатар» гэх мэт бичиж үзнэ үү (OSM-д хороо бүр байхгүй), эсвэл «Миний байршил» товч / газрын зургийг гараар тааруулна уу';
export const MAP_PICKER_GEO_ERR = 'Байршил тодорхойлогдсонгүй (зөвшөөрөл?)';
/** 🆕 🗺 ОДООГИЙН пингийн ХАЯГ (reverse-geocode) — 6 дахь засвар (2026-10-06).
 *  ⚠️ OSM-д хороо байхгүй тул хаяг (гудамж · хороолол · дүүрэг) л гарна ✓ */
export const MAP_PICKER_PLACE_LOADING = 'Хаяг тодорхойлж байна…';
export const MAP_PICKER_PLACE_ERR = 'Хаяг тодорхойлогдсонгүй';

/** 🆕 📐 Дүүргийн хилээс ГАДНА пин тавив — accuracy сануулга (7 дахь засвар) */
export const MAP_PICKER_OUTSIDE_WARN =
  'Пин нь сонгосон дүүргийн хилээс ГАДНА байна — байршлаа тааруулна уу';

/** 📐 Дүүргийн хил — пин ДОТОР (хөх) / ГАДНА (улаан) */
const BOUNDARY_STYLE_OK = { color: '#2563eb', weight: 2, opacity: 0.7, fill: true, fillColor: '#2563eb', fillOpacity: 0.05 };
const BOUNDARY_STYLE_BAD = { color: '#dc2626', weight: 2.5, opacity: 0.9, fill: true, fillColor: '#dc2626', fillOpacity: 0.08 };

/**
 * 🗺 ПИНГИЙН ДҮРС (SVG) — газрын зургийн ТӨВД **ТОГТМОЛ** байрлана.
 *    ⚠️ `-translate-y-full` тул пингийн ЗҮҮН үзүүр нь ЯГ төвд бууна ✓
 *    ⚠️ Гадаад зураг/сүлжээ ХЭРЭГГҮЙ (⏳ `MapView` нь unpkg-аас PNG татдаг —
 *       энэ модальд тэр хамаарлыг оруулахгүй, SVG нь шууд зурагдана ✓)
 */
function PinIcon() {
  return (
    <svg
      data-map-picker-pin
      width="34"
      height="44"
      viewBox="0 0 34 44"
      aria-hidden="true"
      className="drop-shadow-[0_3px_3px_rgba(0,0,0,0.35)]"
    >
      <path
        d="M17 1C8.3 1 1.3 8 1.3 16.7c0 12 15.7 25.6 15.7 25.6s15.7-13.6 15.7-25.6C32.7 8 25.7 1 17 1z"
        fill="#2563eb"
        stroke="#ffffff"
        strokeWidth="2"
      />
      <circle cx="17" cy="16.7" r="6" fill="#ffffff" />
    </svg>
  );
}

/**
 * @param {object} props
 * @param {{lat:number,lng:number}} [props.center] газрын зургийг нээх анхдагч төв
 * @param {{lat:number,lng:number}|null} [props.value] аль хэдийн тавьсан пин
 * @param {number} [props.zoom] анхдагч зум (байхгүй бол `PICK_ZOOM`)
 * @param {string} [props.subtitle] толгойн доорх байршлын мөр
 * @param {string} [props.city] хот/аймаг (дүүргийн хил ачаалахад)
 * @param {string} [props.district] дүүрэг/сум (БОДИТ хилээр пин шалгана)
 * @param {(coords:{lat:number,lng:number}) => void} props.onConfirm «Үргэлжлүүлэх»
 * @param {() => void} props.onClose «Буцах» / ✕
 */
export default function LocationMapPicker({ center, value, zoom, subtitle, city, district, onConfirm, onClose }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  /** 🆕 🔍 ХАЙЛТ/ГЕОЛОКАЦИ — хороо/гудамж хайж, пинээ тэр цэг рүү гулсуулна */
  const [q, setQ] = useState(() => (typeof subtitle === 'string' ? subtitle : ''));
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  /** 🗺 Газрын зургийг нээх АНХДАГЧ солбицол (аль хэдийн тавьсан пин эсвэл дүүргийн төв) */
  const startRef = useRef(null);
  if (!startRef.current) {
    if (value && isValidCoord(value.lat, value.lng)) startRef.current = { lat: value.lat, lng: value.lng };
    else if (center && isValidCoord(center.lat, center.lng)) startRef.current = { lat: center.lat, lng: center.lng };
    else startRef.current = { ...DEFAULT_MAP_CENTER };
  }
  const initialZoom = Number.isFinite(zoom) ? zoom : (value ? PICK_ZOOM : DEFAULT_MAP_ZOOM);
  const [coords, setCoords] = useState(() => ({ ...startRef.current }));
  /** 🗺 Газрын зураг бэлэн болсон эсэх (хилийн `L.geoJSON` нэмэхэд хэрэгтэй) */
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let map = null;
    let cancelled = false;
    /** 🧹 `move`-ийн rAF-ийг unmount үед цэвэрлэнэ (pan дунд хаагдахад ✓) */
    let cleanupRaf = null;

    const init = async () => {
      if (!elRef.current) return;
      const module = await import('leaflet');
      // StrictMode-д effect хоёр удаа ажилладаг — unmount болсон бол болих
      // (эс бөгөөс «Map container is already initialized» алдаа гарна ✗)
      if (cancelled || !elRef.current) return;
      const L = module;
      const start = startRef.current;
      map = L.map(elRef.current, { zoomControl: true, attributionControl: true })
        .setView([start.lat, start.lng], initialZoom);
      mapRef.current = map;
      setMapReady(true);
      L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);

      // 🆕 🗺 ПИН НЬ ТӨВД **ТОГТМОЛ** (`PinIcon` — DOM overlay) ⇒ маркер
      //    ЧИРЭХГҮЙ/ҮҮСГЭХГҮЙ (`L.marker`/`L.divIcon` ашиглахгүй ✓).
      //    Газрын ЗУРГИЙГ чирэхэд пин төвдөө үлдэнэ ✓
      const sync = () => {
        if (!map) return;
        const c = map.getCenter();
        setCoords({ lat: Number(c.lat.toFixed(6)), lng: Number(c.lng.toFixed(6)) });
      };
      // ⚠️ `move` нь ХҮРЭЭ БҮРТ ажилладаг ⇒ `requestAnimationFrame`-ээр
      //    тооруулна (React-ийн re-render нь pan-ыг удаашруулахгүй ✓ = jankгүй)
      let raf = 0;
      const onMove = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => { raf = 0; sync(); });
      };
      map.on('move', onMove);
      map.on('moveend', sync);
      // ② Газрын зураг дээр ДАРЖ/ТАП хийвэл зураг ГУЛСАЖ, пин тэр цэг рүү
      //    буулгана (`panTo` нь `move`→`moveend` үүсгэнэ ⇒ солбицол шинэчлэгдэнэ ✓)
      map.on('click', (e) => { map.panTo(e.latlng); });
      // Modal дотор нээгддэг тул хэмжээг зөв тооцно (эс бөгөөс саарал хэсэг ✗)
      requestAnimationFrame(() => {
        if (!map) return;
        map.invalidateSize();
        sync();
      });
      // 🧹 `raf`-ыг цэвэрлэхийн тулд map-тай хамт хадгална
      cleanupRaf = () => cancelAnimationFrame(raf);
    };

    init().catch((e) => console.error('LocationMapPicker init error', e));

    return () => {
      cancelled = true;
      if (cleanupRaf) cleanupRaf();
      if (map) {
        map.remove();
        map = null;
      }
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 🆕 🗺 ОДООГИЙН пингийн ХАЯГ (reverse-geocode) — «зөв цэг мөн үү?» баталгаажуулалт
   *    (2026-10-06 — 6 дахь засвар). ⚠️ Debounce (500мс) + цэвэрлэлт ⇒ газрыг
   *    чирэх БҮРД fetch ХИЙХГҮЙ, зөвхөн тогтсоны дараа НЭГ удаа ✓ (Nominatim-ийг
   *    хэт ачаалахгүй). ⚠️ OSM-д хороо (`khoroo`) БАЙХГҮЙ тул хаяг нь гудамж ·
   *    хороолол (`suburb`) · дүүрэг л хүртэл — гэхдээ хэрэглэгчид пинээ зөв
   *    эсэхийг ШУУД батлах боломж өгнө ✓
   */
  const [place, setPlace] = useState(null);
  const [placeState, setPlaceState] = useState('loading'); // 'loading' | 'ok' | 'err'
  useEffect(() => {
    const url = reverseGeocodeUrl(coords.lat, coords.lng);
    if (!url) {
      setPlace(null);
      setPlaceState('err');
      return undefined;
    }
    let cancelled = false;
    setPlaceState('loading');
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const r = parseReverseResult(await res.json());
        if (cancelled) return;
        setPlace(r);
        setPlaceState(r ? 'ok' : 'err');
      } catch (e) {
        if (cancelled) return;
        console.error('reverse geocode error', e);
        setPlace(null);
        setPlaceState('err');
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [coords.lat, coords.lng]);

  /**
   * 🆕 📐 ДҮҮРГИЙН БОДИТ ХИЛ (polygon) — Nominatim `polygon_geojson=1` (7 дахь засвар).
   *    Пин нь сонгосон дүүргийн БОДИТ хил дотор эсэхийг шалгаж, хилээс ГАДНА бол
   *    сануулга гаргана ✓ (accuracy — буруу дүүрэг рүү пин тавихаас сэргийлнэ).
   *    ⚠️ УБ-ын дүүргүүд OSM-д БОДИТ полигонтой; байхгүй бол чимээгүй өнгөрнө ✓
   */
  const [districtGeo, setDistrictGeo] = useState(null);
  useEffect(() => {
    const url = districtPolygonUrl(city, district);
    if (!url) {
      setDistrictGeo(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const geo = extractPolygon(await res.json());
        if (!cancelled) setDistrictGeo(geo);
      } catch (e) {
        if (!cancelled) setDistrictGeo(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [city, district]);

  /** Пин нь дүүргийн хил ДОТОР эсэх (`null` = хил ачаалагдаагүй/мэдэгдэхгүй) */
  const districtInside =
    districtGeo && isValidCoord(coords.lat, coords.lng)
      ? pointInGeoJson(coords.lat, coords.lng, districtGeo)
      : null;
  /** Хил ачаалагдсан + пин ГАДНА ⇒ сануулга харуулна */
  const outsideDistrict = districtInside === false;

  /** 🗺 ХИЛИЙН ЗУРАГ (Leaflet `L.geoJSON`) — `mapReady` болсны дараа нэмнэ; өнгө нь
   *  пин дотор/гадна байдлаас хамаарна (`boundaryStyleRef`) */
  const boundaryRef = useRef(null);
  const boundaryStyleRef = useRef(BOUNDARY_STYLE_OK);
  boundaryStyleRef.current = outsideDistrict ? BOUNDARY_STYLE_BAD : BOUNDARY_STYLE_OK;
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return undefined;
    let layer = null;
    let cancelled = false;
    import('leaflet')
      .then((module) => {
        if (cancelled || !mapRef.current) return;
        if (boundaryRef.current) {
          try { mapRef.current.removeLayer(boundaryRef.current); } catch (e) { /* noop */ }
          boundaryRef.current = null;
        }
        if (!districtGeo) return;
        layer = module.geoJSON(districtGeo, { style: () => boundaryStyleRef.current });
        layer.addTo(mapRef.current);
        boundaryRef.current = layer;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (layer && mapRef.current) {
        try { mapRef.current.removeLayer(layer); } catch (e) { /* noop */ }
      }
      if (boundaryRef.current === layer) boundaryRef.current = null;
    };
  }, [districtGeo, mapReady]);

  /** Хил дотор/гадна солигдоход өнгийг шууд сольж будана */
  useEffect(() => {
    const layer = boundaryRef.current;
    if (layer && layer.setStyle) layer.setStyle(boundaryStyleRef.current);
  }, [outsideDistrict]);

  /** ✅ Үргэлжлүүлэх — ТӨВД байгаа пингийн солбицлыг буцаана (хүчингүй бол эхлэлийг) */
  const confirm = () => {
    const c = coords && isValidCoord(coords.lat, coords.lng) ? coords : startRef.current;
    onConfirm({ lat: c.lat, lng: c.lng });
  };

  /**
   * 🆕 🔍 ХАЙХ — Nominatim/OpenStreetMap-оос ХОРОО/ГУДАМЖ/БАРИЛГА хайна.
   *    ⇒ Энэ бол «ХОРООНЫ НАРИЙВЧЛАЛ»-ын шийдэл: Монголын ~202 хорооны
   *      солбицлыг гараар бичихгүй (таамгийн утга = ХУДЛАА) — харин
   *      БОДИТ эх сурвалжаас хайна ✓
   */
  const runSearch = async () => {
    const url = geocodeUrl(q);
    if (!url) return;
    setBusy(true);
    setErr('');
    setResults([]);
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const found = parseGeocodeResults(await res.json());
      setResults(found);
      if (!found.length) setErr(MAP_PICKER_NOT_FOUND);
    } catch (e) {
      console.error('geocode error', e);
      setErr(MAP_PICKER_SEARCH_ERR);
    } finally {
      setBusy(false);
    }
  };
  const onSearchSubmit = (e) => { e.preventDefault(); runSearch(); };

  /** 🎯 Олдсон цэг рүү ГУЛСУУЛНА (`moveend` → солбицол автоматаар шинэчлэгдэнэ ✓) */
  const pickResult = (r) => {
    setResults([]);
    setErr('');
    if (mapRef.current) mapRef.current.setView([r.lat, r.lng], PICK_ZOOM_FOUND);
  };

  /** 📍 МИНИЙ БАЙРШИЛ — геолокаци (мобайлд хамгийн НАРИЙН түвшин ✓) */
  const goMyLocation = () => {
    setErr('');
    setResults([]);
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setErr(MAP_PICKER_GEO_ERR);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current && isValidCoord(latitude, longitude)) {
          mapRef.current.setView([latitude, longitude], PICK_ZOOM_FOUND);
        } else {
          setErr(MAP_PICKER_GEO_ERR);
        }
      },
      () => setErr(MAP_PICKER_GEO_ERR),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };


  return (
    <div
      data-map-picker
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={MAP_PICKER_TITLE}
    >
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Толгой */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h3 className="text-[17px] font-bold text-gray-900">{MAP_PICKER_TITLE}</h3>
          <button
            type="button"
            data-map-picker-close
            aria-label="Хаах"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <CloseIcon className="h-[15px] w-[15px]" />
          </button>
        </div>

        {/* Байршлын мөр */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-5 py-2.5 text-[13.5px] font-medium text-gray-700">
          <PinIcon className="h-[15px] w-[15px] shrink-0 text-gray-400" />
          <span className="min-w-0 truncate">{subtitle || 'Байршил'}</span>
        </div>

        {/* 🆕 🔍 ХАЙЛТ / 📍 МИНИЙ БАЙРШИЛ — ХОРООНЫ НАРИЙВЧЛАЛ (3 дахь засвар).
            `z-20` нь газрын зургийн `z-0`-оос ДЭЭР тул унах жагсаалт харагдана ✓ */}
        <div className="relative z-20 border-b border-gray-100 bg-white px-5 py-3">
          <form className="flex flex-wrap items-center gap-2" onSubmit={onSearchSubmit}>
            <input
              data-map-picker-search
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={MAP_PICKER_SEARCH_PH}
              aria-label={MAP_PICKER_SEARCH_PH}
              className="min-w-0 flex-1 rounded-xl border border-gray-300 px-3.5 py-2.5 text-[14px] text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-gray-900"
            />
            <button
              type="submit"
              data-map-picker-search-btn
              disabled={busy}
              className="rounded-xl bg-gray-900 px-4 py-2.5 text-[14px] font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              {busy ? '…' : MAP_PICKER_SEARCH_BTN}
            </button>
            <button
              type="button"
              data-map-picker-my-location
              onClick={goMyLocation}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-[14px] font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              <PinIcon className="h-[16px] w-[16px]" />
              <span className="hidden sm:inline">{MAP_PICKER_MY_LOCATION}</span>
            </button>
          </form>
          {(err || results.length > 0) && (
            <div
              data-map-picker-results
              className="absolute inset-x-5 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl"
            >
              {err ? (
                <p className="px-4 py-3 text-[13px] font-medium text-red-600">{err}</p>
              ) : null}
              {results.map((r, i) => (
                <button
                  key={`${r.lat}-${r.lng}-${i}`}
                  type="button"
                  data-map-picker-result
                  onClick={() => pickResult(r)}
                  className="block w-full border-t border-gray-100 px-4 py-2.5 text-left text-[13px] text-gray-700 transition first:border-t-0 hover:bg-gray-50"
                >
                  <PinIcon className="mr-1 inline-block h-[14px] w-[14px] align-[-2px] text-gray-400" />
                  {r.label || `${r.lat}, ${r.lng}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Газрын зураг + ТӨВД ТОГТМОЛ пин (DOM overlay — Leaflet `marker` БИШ ✓) */}
        <div className="relative z-0">
          <div ref={elRef} className="h-[380px] w-full sm:h-[440px]" />
          {/* 🗺 ПИН нь газрын зургийн ЯГ ТӨВД — газрыг ЧИРЭХЭД пин хөдлөхгүй,
              ЗУРАГ л хөдөлнө ✓ (⏳ урьд нь `Leaflet marker`-ийг чирдэг байв)

              ⚠️⚠️ `z-[1000]` ЗААВАЛ БАЙХ ЁСТОЙ (2026-10-06 — 5 дахь засвар):
              Leaflet-ийн ДАВХАРГУУД нь `z-index: 200…800`-тай
              (`.leaflet-tile-pane: 200` · `overlay-pane: 400` · `marker-pane: 600` ·
               `popup-pane: 700` · удирдлага `control: 800`). `z-index` БАЙХГҮЙ
              (`auto` = 0) overlay нь ТЭДГЭЭС ДООР буудаг тул **ГАЗРЫН
              ЗУРГИЙН ПЛИТА ПИНГИЙГ БҮРЭН ДАРЖ, ПИН ХАРАГДАХГҮЙ** байв ✗
              («Газрын зураг дээр пин байхгүй байна» гэсэн гомдол).
              `pointer-events-none` тул зургийг чирэхэд ХААЛТ болохгүй ✓ */}
          <div data-map-picker-overlay className="pointer-events-none absolute inset-0 z-[1000]">
            {/* Яг төвийн цэг — пингийн ЗҮҮН үзүүр энд бууна ✓ */}
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900/50" />
            <span className="map-pin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
              <PinIcon />
            </span>
            <span className="absolute inset-x-0 top-3 flex justify-center">
              <span className="rounded-md bg-gray-900/80 px-3 py-1.5 text-center text-[12.5px] font-medium text-white shadow-lg">
                {MAP_PICKER_HINT}
              </span>
            </span>
          </div>
        </div>

        {/* Доод үйлдэл */}
        <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span data-map-picker-center className="inline-flex items-center gap-1.5 text-[12.5px] text-gray-500">
              <PinIcon className="h-[13px] w-[13px] shrink-0 text-gray-400" />
              {coords.lat}, {coords.lng}
            </span>
            {/* 🆕 🗺 ОДООГИЙН пингийн ХАЯГ (reverse-geocode) — 6 дахь засвар (2026-10-06).
                ⚠️ `placeState` нь CDP/тестэд (loading/ok/err) — хаяг заавал
                гарна гэсэн баталгаа ХЭРЭГГҮЙ (сүлжээгүй ч UI зөв ✓) */}
            <span
              data-map-picker-place
              data-map-picker-place-state={placeState}
              className={`min-w-0 truncate text-[12.5px] ${placeState === 'ok' ? 'font-medium text-gray-700' : 'text-gray-400'}`}
            >
              {placeState === 'ok' && place
                ? place.label
                : placeState === 'loading'
                  ? MAP_PICKER_PLACE_LOADING
                  : MAP_PICKER_PLACE_ERR}
            </span>
            {outsideDistrict && (
              <span
                data-map-picker-outside
                className="min-w-0 text-[12.5px] font-semibold text-red-600"
              >
                {MAP_PICKER_OUTSIDE_WARN}
              </span>
            )}
          </span>
          <span className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              data-map-picker-back
              onClick={onClose}
              className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-[15px] font-semibold text-gray-800 transition hover:bg-gray-50"
            >
              {MAP_PICKER_BACK}
            </button>
            <button
              type="button"
              data-map-picker-confirm
              onClick={confirm}
              className="rounded-xl bg-gray-900 px-6 py-3 text-[15px] font-bold text-white transition hover:bg-gray-800"
            >
              {MAP_PICKER_CONFIRM}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
