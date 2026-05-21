// ============ STATE ============
let currentUser = null;
let currentCategory = 'all';
let uploadedImages = [];
let currentCode = null;
let currentViewMode = 'grid';
let mapInstance = null;
let mapMarkers = [];
let allListings = [];

// UB District & Khoroo data
const UB_DATA = {
  'Улаанбаатар': {
    'Баянгол': ['1-р хороо','2-р хороо','3-р хороо','4-р хороо','5-р хороо','6-р хороо','7-р хороо','8-р хороо','9-р хороо','10-р хороо','11-р хороо','12-р хороо','13-р хороо','14-р хороо','15-р хороо','16-р хороо','17-р хороо','18-р хороо','19-р хороо','20-р хороо','21-р хороо','22-р хороо','23-р хороо','24-р хороо','25-р хороо'],
    'Баянзүрх': ['1-р хороо','2-р хороо','3-р хороо','4-р хороо','5-р хороо','6-р хороо','7-р хороо','8-р хороо','9-р хороо','10-р хороо','11-р хороо','12-р хороо','13-р хороо','14-р хороо','15-р хороо','16-р хороо','17-р хороо','18-р хороо','19-р хороо','20-р хороо','21-р хороо','22-р хороо','23-р хороо','24-р хороо','25-р хороо','26-р хороо','27-р хороо','28-р хороо','29-р хороо'],
    'Сүхбаатар': ['1-р хороо','2-р хороо','3-р хороо','4-р хороо','5-р хороо','6-р хороо','7-р хороо','8-р хороо','9-р хороо','10-р хороо','11-р хороо','12-р хороо','13-р хороо','14-р хороо','15-р хороо','16-р хороо','17-р хороо','18-р хороо','19-р хороо','20-р хороо'],
    'Хан-Уул': ['1-р хороо','2-р хороо','3-р хороо','4-р хороо','5-р хороо','6-р хороо','7-р хороо','8-р хороо','9-р хороо','10-р хороо','11-р хороо','12-р хороо','13-р хороо','14-р хороо','15-р хороо','16-р хороо'],
    'Чингэлтэй': ['1-р хороо','2-р хороо','3-р хороо','4-р хороо','5-р хороо','6-р хороо','7-р хороо','8-р хороо','9-р хороо','10-р хороо','11-р хороо','12-р хороо','13-р хороо','14-р хороо','15-р хороо','16-р хороо','17-р хороо','18-р хороо','19-р хороо','20-р хороо'],
    'Сонгинохайрхан': ['1-р хороо','2-р хороо','3-р хороо','4-р хороо','5-р хороо','6-р хороо','7-р хороо','8-р хороо','9-р хороо','10-р хороо','11-р хороо','12-р хороо','13-р хороо','14-р хороо','15-р хороо','16-р хороо','17-р хороо','18-р хороо','19-р хороо','20-р хороо','21-р хороо','22-р хороо','23-р хороо','24-р хороо','25-р хороо','26-р хороо','27-р хороо','28-р хороо','29-р хороо','30-р хороо','31-р хороо','32-р хороо','33-р хороо','34-р хороо','35-р хороо','36-р хороо','37-р хороо','38-р хороо','39-р хороо','40-р хороо','41-р хороо'],
    'Налайх': ['1-р хороо','2-р хороо','3-р хороо','4-р хороо','5-р хороо','6-р хороо','7-р хороо'],
    'Багануур': ['1-р хороо','2-р хороо','3-р хороо','4-р хороо'],
    'Багахангай': ['1-р хороо','2-р хороо','3-р хороо']
  }
};

function getDistricts(city) {
  const data = UB_DATA[city];
  return data ? Object.keys(data) : [];
}

function getKhoroos(city, district) {
  if (!city || !district) return [];
  const data = UB_DATA[city];
  return data && data[district] ? data[district] : [];
}


// ============ UTILITY FUNCTIONS ============
function $(id) { return document.getElementById(id); }

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function formatPrice(price) {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function getPriceTypeLabel(type) {
  const labels = { total: '', month: '/сар', day: '/өдөр', sqm: '/м²' };
  return labels[type] || '';
}

function getCategoryLabel(cat) {
  return cat === 'sell' ? '💰 Зарах' : '🔑 Түрээслэх';
}

function getPropertyIcon(type) {
  const icons = {
    'Орон сууц': '🏢',
    'House': '🏠',
    'Худалдаа үйлчилгээний талбай': '🏪',
    'Обьект, үйлдвэр, агуулах': '🏭',
    'Газар': '🌳',
    'Оффис': '🏢',
    'Хашаа байшин': '🏡'
  };
  return icons[type] || '🏠';
}

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Саяхан';
  if (diff < 3600) return Math.floor(diff / 60) + ' мин өмнө';
  if (diff < 86400) return Math.floor(diff / 3600) + ' цаг өмнө';
  if (diff < 2592000) return Math.floor(diff / 86400) + ' өдөр өмнө';
  return date.toLocaleDateString('mn-MN');
}

// ============ DYNAMIC DISTRICT & KHOROO LOADING ============
function updateDistricts(city, selectId) {
  const select = $(selectId);
  select.innerHTML = '<option value="">Бүгд</option>';
  
  const districts = getDistricts(city);
  districts.forEach(d => {
    select.innerHTML += `<option value="${d}">${d}</option>`;
  });
}

function updateKhoroos(city, district, selectId) {
  const select = $(selectId);
  select.innerHTML = '<option value="">Бүгд</option>';
  
  const khoroos = getKhoroos(city, district);
  khoroos.forEach(k => {
    select.innerHTML += `<option value="${k}">${k}</option>`;
  });
}

function onCityChange() {
  const city = $('filterCity').value;
  updateDistricts(city, 'filterDistrict');
  updateKhoroos(city, '', 'filterKhoroo');
  loadListings();
}

function onDistrictChange() {
  const city = $('filterCity').value;
  const district = $('filterDistrict').value;
  updateKhoroos(city, district, 'filterKhoroo');
  loadListings();
}


// ============ PAGE NAVIGATION ============
function showPage(page) {
  document.querySelectorAll('[id^="page-"]').forEach(p => p.style.display = 'none');
  if (page === 'home') {
    $('page-home').style.display = 'block';
    loadListings();
  } else if (page === 'detail') {
    $('page-detail').style.display = 'block';
  } else if (page === 'my-listings') {
    if (!currentUser) {
      showToast('Эхлээд нэвтрэх шаардлагатай', 'error');
      openAuthModal();
      return;
    }
    $('page-my-listings').style.display = 'block';
    loadMyListings();
  }
}

// ============ AUTH ============
function openAuthModal() {
  resetAuth();
  $('authModal').classList.add('active');
}

function closeModal(id) {
  $(id).classList.remove('active');
}

function resetAuth() {
  $('authStep1').classList.add('active');
  $('authStep2').classList.remove('active');
  $('authPhone').value = '';
  $('authName').value = '';
  document.querySelectorAll('.code-input').forEach(i => i.value = '');
  currentCode = null;
}

async function sendCode() {
  const phone = $('authPhone').value.trim();
  if (phone.length < 6) {
    showToast('Зөв утасны дугаар оруулна уу', 'error');
    return;
  }

  try {
    const res = await fetch('/api/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '976' + phone })
    });
    const data = await res.json();
    if (data.success) {
      currentCode = data.code;
      $('authPhoneDisplay').textContent = '+976 ' + phone;
      $('authStep1').classList.remove('active');
      $('authStep2').classList.add('active');
      document.querySelector('.code-input').focus();
      showToast('Код илгээгдлээ: ' + data.code, 'info');
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Алдаа гарлаа', 'error');
  }
}

function moveToNext(input, index) {
  if (input.value.length === 1 && index < 6) {
    document.querySelectorAll('.code-input')[index].focus();
  }
  const allFilled = Array.from(document.querySelectorAll('.code-input')).every(i => i.value.length === 1);
  if (allFilled) {
    verifyCode();
  }
}

async function verifyCode() {
  const phone = '976' + $('authPhone').value.trim();
  const name = $('authName').value.trim();
  const code = Array.from(document.querySelectorAll('.code-input')).map(i => i.value).join('');

  if (code.length !== 6) {
    showToast('6 оронтой кодоо бүрэн оруулна уу', 'error');
    return;
  }

  try {
    const res = await fetch('/api/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code, name })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      updateUI();
      closeModal('authModal');
      showToast('Амжилттай нэвтэрлээ! 🎉');
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Алдаа гарлаа', 'error');
  }
}

function updateUI() {
  if (currentUser) {
    $('loginBtn').style.display = 'none';
    $('userBtn').style.display = 'inline-flex';
    $('userPhoneDisplay').textContent = currentUser.phone.slice(-8);
    $('myPhoneDisplay').textContent = '+976 ' + currentUser.phone.slice(-8);
    $('myNameDisplay').textContent = currentUser.name || 'Хэрэглэгч';
  } else {
    $('loginBtn').style.display = 'inline-flex';
    $('userBtn').style.display = 'none';
  }
}

// ============ VIEW MODE ============
function setViewMode(mode) {
  currentViewMode = mode;
  $('viewGridBtn').classList.toggle('active', mode === 'grid');
  $('viewMapBtn').classList.toggle('active', mode === 'map');
  
  if (mode === 'map') {
    $('listingsGrid').style.display = 'none';
    $('mapContainer').style.display = 'block';
    initMap();
  } else {
    $('listingsGrid').style.display = 'grid';
    $('mapContainer').style.display = 'none';
  }
}

// ============ MAP ============
function initMap() {
  if (!mapInstance) {
    mapInstance = L.map('mapContainer').setView([47.92, 106.92], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18
    }).addTo(mapInstance);
  }
  
  // Clear old markers
  mapMarkers.forEach(m => mapInstance.removeLayer(m));
  mapMarkers = [];
  
  // Add markers for listings with coordinates
  const listingsWithCoords = allListings.filter(l => l.latitude && l.longitude);
  
  if (listingsWithCoords.length === 0) {
    // Show UB center if no listings with coords
    mapInstance.setView([47.92, 106.92], 12);
    return;
  }
  
  const bounds = [];
  listingsWithCoords.forEach(l => {
    const firstImage = l.images && l.images.length > 0 ? l.images[0] : null;
    const location = [l.city, l.district, l.khoroo].filter(Boolean).join(', ');
    
    const icon = L.divIcon({
      html: `<div style="background:${l.category === 'sell' ? '#2563eb' : '#059669'};color:white;padding:4px 8px;border-radius:20px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3)">₮${formatPrice(l.price)}</div>`,
      className: '',
      iconSize: [80, 24],
      iconAnchor: [40, 12]
    });
    
    const marker = L.marker([l.latitude, l.longitude], { icon }).addTo(mapInstance);
    
    const popupContent = `
      <div class="map-popup" onclick="showDetail(${l.id})" style="cursor:pointer">
        ${firstImage ? `<img src="${firstImage}" alt="">` : `<div style="height:100px;background:#e5e7eb;display:flex;align-items:center;justify-content:center;font-size:32px;border-radius:4px;margin-bottom:6px">${getPropertyIcon(l.property_type)}</div>`}
        <h4>${getPropertyIcon(l.property_type)} ${l.property_type}</h4>
        <div class="price">₮${formatPrice(l.price)} ${getPriceTypeLabel(l.price_type)}</div>
        <div class="location">📍 ${location}</div>
      </div>`;
    
    marker.bindPopup(popupContent);
    mapMarkers.push(marker);
    bounds.push([l.latitude, l.longitude]);
  });
  
  if (bounds.length > 0) {
    mapInstance.fitBounds(bounds, { padding: [50, 50] });
  }
  
  // Fix map rendering after showing
  setTimeout(() => mapInstance.invalidateSize(), 300);
}

// ============ LISTINGS ============
async function loadListings() {
  const grid = $('listingsGrid');
  grid.innerHTML = '<div class="loading" style="grid-column:1/-1"><div class="spinner"></div><p>Заруудыг татаж байна...</p></div>';

  const params = new URLSearchParams();
  if (currentCategory !== 'all') params.append('category', currentCategory);
  
  const propertyType = $('filterPropertyType').value;
  const rooms = $('filterRooms').value;
  const city = $('filterCity').value;
  const district = $('filterDistrict').value;
  const khoroo = $('filterKhoroo').value;
  const minPrice = $('filterMinPrice').value;
  const maxPrice = $('filterMaxPrice').value;
  const minArea = $('filterMinArea').value;
  const maxArea = $('filterMaxArea').value;
  const search = $('searchInput').value;

  if (propertyType) params.append('property_type', propertyType);
  if (rooms) params.append('rooms', rooms);
  if (city) params.append('city', city);
  if (district) params.append('district', district);
  if (khoroo) params.append('khoroo', khoroo);
  if (minPrice) params.append('min_price', minPrice);
  if (maxPrice) params.append('max_price', maxPrice);
  if (minArea) params.append('min_area', minArea);
  if (maxArea) params.append('max_area', maxArea);
  if (search) params.append('search', search);

  try {
    const res = await fetch('/api/listings?' + params.toString());
    const data = await res.json();
    allListings = data.listings;
    renderListings(allListings);
    
    // Update map if visible
    if (currentViewMode === 'map' && mapInstance) {
      initMap();
    }
  } catch (err) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="icon">❌</div><h3>Алдаа гарлаа</h3></div>';
  }
}

function renderListings(listings) {
  const grid = $('listingsGrid');
  
  if (listings.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="icon">📭</div>
        <h3>Зарууд олдсонгүй</h3>
        <p>Та шүүлтүүрээ өөрчлөн үзнэ үү</p>
      </div>`;
    return;
  }

  grid.innerHTML = listings.map(l => {
    const firstImage = l.images && l.images.length > 0 ? l.images[0] : null;
    const location = [l.city, l.district, l.khoroo].filter(Boolean).join(', ');
    const roomsInfo = l.rooms > 0 ? `${l.rooms} өрөө` : '';
    const areaInfo = l.area > 0 ? `${l.area} м²` : '';
    
    return `
      <div class="listing-card" onclick="showDetail(${l.id})">
        <div class="listing-card-image">
          ${firstImage 
            ? `<img src="${firstImage}" alt="Зураг" loading="lazy">`
            : `<div class="no-image">${getPropertyIcon(l.property_type)}</div>`
          }
          <span class="listing-card-badge ${l.category === 'sell' ? 'badge-sell' : 'badge-rent'}">
            ${getCategoryLabel(l.category)}
          </span>
        </div>
        <div class="listing-card-body">
          <div class="listing-card-price">
            ₮${formatPrice(l.price)} 
            <span class="price-type">${getPriceTypeLabel(l.price_type)}</span>
          </div>
          <div class="listing-card-title">
            ${getPropertyIcon(l.property_type)} ${l.property_type}
          </div>
          <div class="listing-card-location">
            📍 ${location}
          </div>
          <div style="display:flex;gap:12px;font-size:13px;color:var(--gray-500);margin-bottom:8px">
            ${roomsInfo ? `<span>🛏 ${roomsInfo}</span>` : ''}
            ${areaInfo ? `<span>📐 ${areaInfo}</span>` : ''}
          </div>
          <div class="listing-card-meta">
            <span>📅 ${timeAgo(l.created_at)}</span>
            <span>📞 ${l.phone.slice(-4)}</span>
          </div>
        </div>
      </div>`;
  }).join('');
}

function filterByCategory(category) {
  currentCategory = category;
  document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.category-tab').forEach(t => {
    if ((category === 'all' && t.textContent === 'Бүгд') ||
        (category === 'sell' && t.textContent.includes('Зарах')) ||
        (category === 'rent' && t.textContent.includes('Түрээслэх'))) {
      t.classList.add('active');
    }
  });
  loadListings();
}

function searchListings() {
  loadListings();
}

function resetFilters() {
  $('filterPropertyType').value = '';
  $('filterRooms').value = '';
  $('filterCity').value = '';
  $('filterDistrict').innerHTML = '<option value="">Бүгд</option>';
  $('filterKhoroo').value = '';
  $('filterMinPrice').value = '';
  $('filterMaxPrice').value = '';
  $('filterMinArea').value = '';
  $('filterMaxArea').value = '';
  $('searchInput').value = '';
  currentCategory = 'all';
  document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.category-tab').classList.add('active');
  loadListings();
}

// ============ LISTING DETAIL ============
async function showDetail(id) {
  showPage('detail');
  $('detailContent').innerHTML = '<div class="loading"><div class="spinner"></div><p>Түр хүлээнэ үү...</p></div>';

  try {
    const res = await fetch('/api/listings/' + id);
    const data = await res.json();
    renderDetail(data.listing);
  } catch (err) {
    $('detailContent').innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Зар олдсонгүй</h3></div>';
  }
}

function renderDetail(l) {
  const location = [l.city, l.district, l.khoroo, l.address_detail].filter(Boolean).join(', ');
  const images = l.images && l.images.length > 0 ? l.images : [];
  
  let galleryHtml = '';
  if (images.length > 0) {
    galleryHtml = `<div class="detail-gallery">`;
    images.forEach((img, i) => {
      galleryHtml += `<img src="${img}" alt="Зураг ${i+1}" class="${i === 0 ? 'main-image' : ''}" onclick="window.open('${img}')">`;
    });
    galleryHtml += `</div>`;
  } else {
    galleryHtml = `<div style="background:var(--gray-200);border-radius:var(--radius-lg);padding:60px;text-align:center;font-size:64px;margin-bottom:24px">${getPropertyIcon(l.property_type)}</div>`;
  }

  // Detail map
  let detailMapHtml = '';
  if (l.latitude && l.longitude) {
    detailMapHtml = `
      <div class="detail-section">
        <h3>🗺️ Байршил</h3>
        <div id="detailMap" style="width:100%;height:300px;border-radius:var(--radius);overflow:hidden"></div>
      </div>`;
  }

  $('detailContent').innerHTML = `
    <div class="detail-header">
      <a class="detail-back" onclick="showPage('home')">← Буцах</a>
      <h1 class="detail-title">${getPropertyIcon(l.property_type)} ${l.property_type}</h1>
      <div class="detail-price">
        ₮${formatPrice(l.price)} 
        <span class="price-type">${getPriceTypeLabel(l.price_type)}</span>
      </div>
    </div>

    ${galleryHtml}

    <div class="detail-info">
      <div>
        <div class="detail-section">
          <h3>📋 Дэлгэрэнгүй мэдээлэл</h3>
          <div class="detail-meta-grid">
            <div class="detail-meta-item">
              <div class="label">Зар төрөл</div>
              <div class="value">${getCategoryLabel(l.category)}</div>
            </div>
            <div class="detail-meta-item">
              <div class="label">Үл хөдлөх төрөл</div>
              <div class="value">${l.property_type}</div>
            </div>
            ${l.rooms > 0 ? `
            <div class="detail-meta-item">
              <div class="label">Өрөө</div>
              <div class="value">${l.rooms} өрөө</div>
            </div>` : ''}
            ${l.area > 0 ? `
            <div class="detail-meta-item">
              <div class="label">Талбай</div>
              <div class="value">${l.area} м²</div>
            </div>` : ''}
            <div class="detail-meta-item">
              <div class="label">Хот / Аймаг</div>
              <div class="value">${l.city}</div>
            </div>
            <div class="detail-meta-item">
              <div class="label">Дүүрэг / Сум</div>
              <div class="value">${l.district || '-'}</div>
            </div>
            <div class="detail-meta-item">
              <div class="label">Хороо</div>
              <div class="value">${l.khoroo || '-'}</div>
            </div>
            <div class="detail-meta-item">
              <div class="label">Үнэ</div>
              <div class="value">₮${formatPrice(l.price)} ${getPriceTypeLabel(l.price_type)}</div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>📍 Байршил</h3>
          <p style="font-size:16px">${location}</p>
        </div>

        ${detailMapHtml}

        ${l.description ? `
        <div class="detail-section">
          <h3>📝 Тайлбар</h3>
          <div class="detail-description">${l.description}</div>
        </div>` : ''}

        <div class="detail-section">
          <h3>📅 Зарын мэдээлэл</h3>
          <div class="detail-meta-grid">
            <div class="detail-meta-item">
              <div class="label">Нийтэлсэн</div>
              <div class="value">${timeAgo(l.created_at)}</div>
            </div>
            <div class="detail-meta-item">
              <div class="label">Зар №</div>
              <div class="value">#${l.id}</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div class="detail-contact">
          <h3>📞 Холбоо барих</h3>
          <div class="contact-info">
            <div class="contact-item">
              <span class="icon">📱</span>
              <div>
                <div class="text">+976 ${l.phone}</div>
                <div style="font-size:12px;color:var(--gray-400)">Утас</div>
              </div>
            </div>
            ${l.contact_name ? `
            <div class="contact-item">
              <span class="icon">👤</span>
              <div>
                <div class="text">${l.contact_name}</div>
                <div style="font-size:12px;color:var(--gray-400)">Холбоо барих хүн</div>
              </div>
            </div>` : ''}
          </div>
          <a href="tel:+976${l.phone}" class="btn btn-primary btn-lg" style="width:100%;margin-top:16px;justify-content:center">
            📞 Захиалах
          </a>
        </div>
      </div>
    </div>`;

  // Initialize detail map
  if (l.latitude && l.longitude) {
    setTimeout(() => {
      const detailMap = L.map('detailMap').setView([l.latitude, l.longitude], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
      }).addTo(detailMap);
      L.marker([l.latitude, l.longitude]).addTo(detailMap)
        .bindPopup(`<b>${l.property_type}</b><br>₮${formatPrice(l.price)}`)
        .openPopup();
    }, 200);
  }
}

// ============ ADD LISTING ============
function openAddListing() {
  if (!currentUser) {
    showToast('Зар нэмэхийн тулд нэвтрэх шаардлагатай', 'error');
    openAuthModal();
    return;
  }
  
  $('listingForm').reset();
  uploadedImages = [];
  $('imagePreviewGrid').innerHTML = '';
  $('formPhone').value = currentUser.phone.slice(-8);
  $('formDistrict').innerHTML = '<option value="">Сонгох</option>';
  
  $('addListingModal').classList.add('active');
}

// Image handling
function handleImageSelect(event) {
  const files = Array.from(event.target.files);
  const remaining = 10 - uploadedImages.length;
  
  if (files.length > remaining) {
    showToast(`Зөвхөн ${remaining} зураг үлдлээ`, 'error');
    return;
  }

  files.forEach(file => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('Зурагны хэмжээ 5MB-с хэтэрсэн', 'error');
      return;
    }
    uploadedImages.push(file);
  });

  renderImagePreviews();
  event.target.value = '';
}

function renderImagePreviews() {
  const grid = $('imagePreviewGrid');
  grid.innerHTML = uploadedImages.map((file, index) => {
    const url = URL.createObjectURL(file);
    return `
      <div class="image-preview-item">
        <img src="${url}" alt="Preview">
        <button class="remove-image" onclick="removeImage(${index})">&times;</button>
      </div>`;
  }).join('');
}

function removeImage(index) {
  uploadedImages.splice(index, 1);
  renderImagePreviews();
}

async function submitListing(event) {
  event.preventDefault();
  
  if (!currentUser) {
    showToast('Нэвтрэх шаардлагатай', 'error');
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ Хадгалж байна...';

  try {
    let imageUrls = [];
    if (uploadedImages.length > 0) {
      const formData = new FormData();
      uploadedImages.forEach(file => formData.append('images', file));
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();
      if (uploadData.success) {
        imageUrls = uploadData.files;
      }
    }

    const listingData = {
      user_id: currentUser.id,
      category: $('formCategory').value,
      property_type: $('formPropertyType').value,
      rooms: parseInt($('formRooms').value) || 0,
      area: parseFloat($('formArea').value) || 0,
      city: $('formCity').value,
      district: $('formDistrict').value,
      khoroo: $('formKhoroo').value,
      address_detail: $('formAddress').value,
      price: parseInt($('formPrice').value),
      price_type: $('formPriceType').value,
      description: $('formDescription').value,
      phone: $('formPhone').value,
      contact_name: $('formContactName').value,
      images: imageUrls
    };

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listingData)
    });
    const data = await res.json();
    
    if (data.success) {
      showToast('Зар амжилттай нийтлэгдлээ! 🎉');
      closeModal('addListingModal');
      showPage('home');
      loadListings();
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Алдаа гарлаа', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '✅ Зар нийтлэх';
  }
}

// ============ MY LISTINGS ============
async function loadMyListings() {
  const container = $('myListingsContainer');
  container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Татаж байна...</p></div>';

  try {
    const res = await fetch(`/api/user/${currentUser.id}/listings`);
    const data = await res.json();
    
    if (data.listings.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📝</div>
          <h3>Танд зарууд байхгүй байна</h3>
          <p>Та эхний зарыг нэмэх үү?</p>
          <button class="btn btn-primary" style="margin-top:16px" onclick="openAddListing()">➕ Зар нэмэх</button>
        </div>`;
      return;
    }

    container.innerHTML = `<div class="my-listings">${data.listings.map(l => {
      const firstImage = l.images && l.images.length > 0 ? l.images[0] : null;
      return `
        <div class="my-listing-item">
          <div class="thumb">
            ${firstImage 
              ? `<img src="${firstImage}" alt="">`
              : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:24px">${getPropertyIcon(l.property_type)}</div>`
            }
          </div>
          <div class="info">
            <h4>${getPropertyIcon(l.property_type)} ${l.property_type}</h4>
            <p>📍 ${[l.city, l.district].filter(Boolean).join(', ')}</p>
            <p>💰 ₮${formatPrice(l.price)} ${getPriceTypeLabel(l.price_type)}</p>
            ${l.rooms > 0 ? `<p>🛏 ${l.rooms} өрөө</p>` : ''}
            ${l.area > 0 ? `<p>📐 ${l.area} м²</p>` : ''}
            <p style="font-size:12px;color:var(--gray-400)">📅 ${timeAgo(l.created_at)}</p>
          </div>
          <div class="actions">
            <button class="btn btn-primary btn-sm" onclick="showDetail(${l.id})">👁 Харах</button>
            <button class="btn btn-danger btn-sm" onclick="deleteListing(${l.id})">🗑 Устгах</button>
          </div>
        </div>`;
    }).join('')}</div>`;
  } catch (err) {
    container.innerHTML = '<div class="empty-state"><div class="icon">❌</div><h3>Алдаа гарлаа</h3></div>';
  }
}

async function deleteListing(id) {
  if (!confirm('Та энэ зарыг устгахдаа итгэлтэй байна уу?')) return;
  
  try {
    const res = await fetch('/api/listings/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('Зар амжилттай устгагдлаа');
      loadMyListings();
    } else {
      showToast(data.error, 'error');
    }
  } catch (err) {
    showToast('Алдаа гарлаа', 'error');
  }
}

// ============ FORM CITY -> DISTRICT -> KHOROO SYNC ============
document.addEventListener('DOMContentLoaded', () => {
  const formCity = $('formCity');
  const formDistrict = $('formDistrict');
  
  if (formCity) {
    formCity.addEventListener('change', function() {
      updateDistricts(this.value, 'formDistrict');
      updateKhoroos(this.value, '', 'formKhoroo');
    });
  }
  
  if (formDistrict) {
    formDistrict.addEventListener('change', function() {
      const city = $('formCity').value;
      updateKhoroos(city, this.value, 'formKhoroo');
    });
  }
  
  loadListings();
  updateUI();
});

