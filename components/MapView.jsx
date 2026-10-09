'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import { priceLabel } from '../lib/format';

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MARKER_ICON = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const MARKER_RETINA = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const MARKER_SHADOW = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
/**
 * 🆕 2026-10-07 — ГАНЦ ПИНТЭЙ газрын зургийн зум (дэлгэрэнгүй хуудас).
 * ⚠️ `fitBounds` нь НЭГ цэг дээр ХЭТ их зум (maxZoom ≈ 18) болгодог тул
 *    гудамжны түвшний ТОГТМОЛ зум хэрэглэнэ ✓ (жишиг сайтын хэв)
 */
const SINGLE_ZOOM = 15;

export default function MapView({ listings }) {
  const elRef = useRef(null);

  useEffect(() => {
    let map = null;
    let markers = [];
    let L = null;
    let cancelled = false;

    const init = async () => {
      if (!elRef.current) return;
      const module = await import('leaflet');
      // StrictMode-д effect хоёр удаа ажилладаг: unmount болсон бол болих
      // (эс бөгөөс «Map container is already initialized» алдаа гарна)
      if (cancelled || !elRef.current) return;
      L = module;
      map = L.map(elRef.current).setView([47.92, 106.92], 12);
      L.tileLayer(TILE_URL, { attribution: '&copy; OpenStreetMap' }).addTo(map);

      const icon = L.icon({
        iconUrl: MARKER_ICON,
        iconRetinaUrl: MARKER_RETINA,
        shadowUrl: MARKER_SHADOW,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
      });

      const points = (listings || []).filter((l) => l.latitude && l.longitude);
      points.forEach((l) => {
        const popup = `
          <div class="min-w-[180px]">
            <a href="/listings/${l.id}" class="block no-underline">
              <strong class="block text-sm font-semibold text-gray-900">${l.property_type}</strong>
              <span class="block text-base font-bold text-primary">${priceLabel(l)}</span>
            </a>
          </div>`;
        const m = L.marker([l.latitude, l.longitude], { icon }).addTo(map).bindPopup(popup);
        markers.push(m);
      });

      if (points.length === 1) {
        // ⚠️ ГАНЦ пин (дэлгэрэнгүй хуудас) — `fitBounds` ХЭТ их зум болгоно ✗
        //    ⇒ гудамжны түвшний тогтмол зум (`SINGLE_ZOOM`) ✓
        map.setView([points[0].latitude, points[0].longitude], SINGLE_ZOOM);
      } else if (markers.length) {
        map.fitBounds(markers.map((m) => m.getLatLng()), { padding: [40, 40] });
      }
    };

    init().catch((e) => console.error('Map init error', e));

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        map = null;
      }
      markers = [];
    };
  }, [listings]);

  return <div ref={elRef} className="map-container" style={{ height: '100%', width: '100%' }} />;
}
