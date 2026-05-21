const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./unegui.db');

// ============ SELL (Зарах) - 10 listings ============
const sellListings = [
  {
    category: 'sell',
    property_type: 'Орон сууц',
    rooms: 3,
    area: 75,
    city: 'Улаанбаатар',
    district: 'Баянгол',
    khoroo: '5-р хороо',
    address_detail: 'Хангай дүүрэг, 16-р байр, 3-р орц',
    latitude: 47.9065,
    longitude: 106.9050,
    price: 280000000,
    price_type: 'total',
    description: '3 өрөө байр, засвартай, тавилгатай, цонхны харагдац сайтай. Лифт, хогны хоолойтой. Гараашны ойролцоо. Бүх дэд бүтэц хөгжсөн. Хурдан зарах болзолтой.',
    phone: '99112233',
    contact_name: 'Бат-Эрдэнэ',
    images: ['/uploads/property-1.svg', '/uploads/property-2.svg']
  },
  {
    category: 'sell',
    property_type: 'House',
    rooms: 6,
    area: 300,
    city: 'Улаанбаатар',
    district: 'Хан-Уул',
    khoroo: '11-р хороо',
    address_detail: 'Зайсан, Арц-13 тоот',
    latitude: 47.8800,
    longitude: 106.9200,
    price: 650000000,
    price_type: 'total',
    description: '2 давхар хувийн сууц, 300 м² талбайтай. Гарааш, зуслангийн газартай. Хаалттай хороололд байрладаг. Орчин үеийн засвартай, бүх тавилга шинэ. Урд талдаа цэцэрлэгтэй.',
    phone: '99887766',
    contact_name: 'Сүхбаатар',
    images: ['/uploads/property-3.svg', '/uploads/property-4.svg']
  },
  {
    category: 'sell',
    property_type: 'Газар',
    rooms: 0,
    area: 750,
    city: 'Улаанбаатар',
    district: 'Сонгинохайрхан',
    khoroo: '32-р хороо',
    address_detail: 'Толгойт, Хүчит шунхан',
    latitude: 47.8700,
    longitude: 106.7800,
    price: 95000000,
    price_type: 'total',
    description: '7.5 ам газар, хашаатай. Ус, цахилгаан, зам харилцаа холбоонд холбогдсон. Үйлдвэр, агуулах, худалдааны төв барихад тохиромжтой. Зам дагуу байрлалтай.',
    phone: '99001122',
    contact_name: 'Ганбаатар',
    images: ['/uploads/property-5.svg']
  },
  {
    category: 'sell',
    property_type: 'Худалдаа үйлчилгээний талбай',
    rooms: 0,
    area: 120,
    city: 'Улаанбаатар',
    district: 'Чингэлтэй',
    khoroo: '4-р хороо',
    address_detail: 'Их дэлгүүрийн 1-р давхар',
    latitude: 47.9150,
    longitude: 106.9250,
    price: 450000000,
    price_type: 'total',
    description: '120 м² худалдааны талбай, их дэлгүүрийн 1-р давхарт. Шилэн харуултай, засвартай. Хувцас, хүнс, цахилгаан барааны дэлгүүрт тохиромжтой. Хүн ихтэй газар.',
    phone: '99776655',
    contact_name: 'Энхбат',
    images: ['/uploads/property-6.svg', '/uploads/property-7.svg']
  },
  {
    category: 'sell',
    property_type: 'Обьект, үйлдвэр, агуулах',
    rooms: 0,
    area: 1000,
    city: 'Улаанбаатар',
    district: 'Сонгинохайрхан',
    khoroo: '35-р хороо',
    address_detail: 'Хархорин үйлдвэрийн бүс',
    latitude: 47.8500,
    longitude: 106.7500,
    price: 1200000000,
    price_type: 'total',
    description: '1000 м² үйлдвэрийн байр, 2 давхар. Том оврын машин механизм орох хаалгатай. 380V цахилгаан, ус, дулаан, агаар сэлгэлттэй. Агуулах, үйлдвэрлэлийн зориулалтаар тохиромжтой.',
    phone: '99334455',
    contact_name: 'Болд',
    images: ['/uploads/property-8.svg']
  },
  {
    category: 'sell',
    property_type: 'Орон сууц',
    rooms: 2,
    area: 65,
    city: 'Дархан-Уул',
    district: 'Дархан',
    khoroo: '6-р хороо',
    address_detail: 'Шинэ хотхон, 12-р байр',
    latitude: 49.4800,
    longitude: 105.9600,
    price: 120000000,
    price_type: 'total',
    description: '2 өрөө байр, 65 м². Шинэ барилга, 2024 онд ашиглалтад орсон. Дулаан шал, металл хаалга, PVC цонхтой. Цэвэр засвартай. Бүх дэд бүтэц шинэ. Хурдан зарах.',
    phone: '88001122',
    contact_name: 'Мөнхбат',
    images: ['/uploads/property-9.svg', '/uploads/property-10.svg']
  },
  {
    category: 'sell',
    property_type: 'Орон сууц',
    rooms: 4,
    area: 95,
    city: 'Улаанбаатар',
    district: 'Баянзүрх',
    khoroo: '13-р хороо',
    address_detail: 'Нарантуул төвийн ойролцоо, 23-р байр',
    latitude: 47.9100,
    longitude: 106.9300,
    price: 380000000,
    price_type: 'total',
    description: '4 өрөө байр, 95 м². Европ засвартай, шинэ тавилгатай. 2 угаалгын өрөөтэй. Том гал тогоотой. Бүх цонх нарлаг тал руу харсан. Лифт, хогны хоолойтой.',
    phone: '99556677',
    contact_name: 'Сарантуяа',
    images: ['/uploads/property-11.svg']
  },
  {
    category: 'sell',
    property_type: 'Газар',
    rooms: 0,
    area: 500,
    city: 'Улаанбаатар',
    district: 'Хан-Уул',
    khoroo: '15-р хороо',
    address_detail: 'Хүйтэн толгой, Шинэ бүс',
    latitude: 47.8600,
    longitude: 106.8900,
    price: 150000000,
    price_type: 'total',
    description: '5 ам газар, хашаатай. Ус, цахилгаан холбогдсон. Хаалттай хороололд байрладаг. Гэр, хашаа байшин барихад тохиромжтой. Зам дагуу, автобусны буудал ойролцоо.',
    phone: '99882233',
    contact_name: 'Батбаяр',
    images: ['/uploads/property-12.svg', '/uploads/property-13.svg']
  },
  {
    category: 'sell',
    property_type: 'Орон сууц',
    rooms: 1,
    area: 40,
    city: 'Улаанбаатар',
    district: 'Сүхбаатар',
    khoroo: '2-р хороо',
    address_detail: 'Сансар, 45-р байр',
    latitude: 47.9220,
    longitude: 106.9080,
    price: 150000000,
    price_type: 'total',
    description: '1 өрөө байр, 40 м². Төвд байрлалтай, бүх дэд бүтэц хөгжсөн. Засвартай, тавилгатай. Хөрөнгө оруулалтад тохиромжтой. Оюутан, залуу гэр бүлд зориулав.',
    phone: '88113344',
    contact_name: 'Долгор',
    images: ['/uploads/property-14.svg']
  },
  {
    category: 'sell',
    property_type: 'House',
    rooms: 5,
    area: 250,
    city: 'Улаанбаатар',
    district: 'Баянгол',
    khoroo: '20-р хороо',
    address_detail: 'Баруун 4-н зам, Хайлааст',
    latitude: 47.8900,
    longitude: 106.8700,
    price: 520000000,
    price_type: 'total',
    description: '5 өрөө хашаа байшин, 250 м². 2 давхар, гарааштай. Орчин үеийн загвартай, дулаан шал, каминтай. Том цэцэрлэгтэй, жимсний модтой. Аюулгүй хороололд байрладаг.',
    phone: '99009900',
    contact_name: 'Эрдэнэтуяа',
    images: ['/uploads/property-15.svg', '/uploads/property-16.svg']
  }
];

// ============ RENT (Түрээслэх) - 10 listings ============
const rentListings = [
  {
    category: 'rent',
    property_type: 'Орон сууц',
    rooms: 1,
    area: 35,
    city: 'Улаанбаатар',
    district: 'Сүхбаатар',
    khoroo: '1-р хороо',
    address_detail: 'Улсын их дэлгүүрийн ард, 45-р байр',
    latitude: 47.9180,
    longitude: 106.9170,
    price: 2500000,
    price_type: 'month',
    description: '1 өрөө байр, төвд байрлалтай. Шинэ засвартай, интернет, кабель ТВ-тэй. Гал тогооны бүрэн тавилгатай. Оюутан, залуу гэр бүлд тохиромжтой.',
    phone: '88112233',
    contact_name: 'Оюунчимэг',
    images: ['/uploads/property-17.svg']
  },
  {
    category: 'rent',
    property_type: 'Оффис',
    rooms: 0,
    area: 50,
    city: 'Улаанбаатар',
    district: 'Баянзүрх',
    khoroo: '16-р хороо',
    address_detail: 'Сүхбаатарын талбайн ойролцоо, Бизнес төв',
    latitude: 47.9200,
    longitude: 106.9100,
    price: 5000000,
    price_type: 'month',
    description: '50 м² оффисын талбай, 3-р давхарт. Лифт, халаалт, кондиционертой. Засвартай, шинэ тавилгатай. Хуралдааны өрөө, гал тогооны өрөөтэй. 24/7 хамгаалалттай.',
    phone: '99554433',
    contact_name: 'Дэлгэрмаа',
    images: ['/uploads/property-18.svg', '/uploads/property-19.svg']
  },
  {
    category: 'rent',
    property_type: 'Хашаа байшин',
    rooms: 3,
    area: 200,
    city: 'Улаанбаатар',
    district: 'Баянгол',
    khoroo: '22-р хороо',
    address_detail: 'Баруун 4-н зам, 45-р гудамж',
    latitude: 47.8950,
    longitude: 106.8800,
    price: 3500000,
    price_type: 'month',
    description: '3 өрөө хашаа байшин, 200 м² талбайтай. Гарааштай, цэцэрлэгтэй. Зуны цагаан байшин, халуун ус, халаалттай. Гэр бүлээрээ амьдрахад тохиромжтой. Урд талдаа хүүхдийн тоглоомын талбайтай.',
    phone: '88223344',
    contact_name: 'Нарантуяа',
    images: ['/uploads/property-20.svg']
  },
  {
    category: 'rent',
    property_type: 'Газар',
    rooms: 0,
    area: 10000,
    city: 'Төв',
    district: 'Зуунмод',
    khoroo: '',
    address_detail: 'Зуунмод хотын ойролцоо, жуулчны баазын бүс',
    latitude: 47.7000,
    longitude: 106.9500,
    price: 2000000,
    price_type: 'month',
    description: '1 га газар, жуулчны бааз, амралтын газар байгуулахад тохиромжтой. Ус, цахилгаан, замтай. Ой мод, гол горхины ойролцоо. Урт хугацааны түрээсээр өгнө.',
    phone: '99667788',
    contact_name: 'Цэцэгмаа',
    images: ['/uploads/property-1.svg', '/uploads/property-2.svg']
  },
  {
    category: 'rent',
    property_type: 'Орон сууц',
    rooms: 2,
    area: 55,
    city: 'Улаанбаатар',
    district: 'Баянзүрх',
    khoroo: '12-р хороо',
    address_detail: 'Амгалан, 8-р байр',
    latitude: 47.9080,
    longitude: 106.9400,
    price: 1800000,
    price_type: 'month',
    description: '2 өрөө байр, 55 м². Шинэ засвартай, гал тогооны тавилгатай. Цонхны харагдац сайтай, нам гүм орчинтой. Гэр бүлээрээ амьдрахад тохиромжтой. Автобусны буудал ойролцоо.',
    phone: '88334455',
    contact_name: 'Гэрэлтуяа',
    images: ['/uploads/property-3.svg']
  },
  {
    category: 'rent',
    property_type: 'Оффис',
    rooms: 0,
    area: 30,
    city: 'Улаанбаатар',
    district: 'Сүхбаатар',
    khoroo: '8-р хороо',
    address_detail: 'СБД, 8-р хороо, Олимпийн гудамж',
    latitude: 47.9160,
    longitude: 106.9150,
    price: 2500000,
    price_type: 'month',
    description: '30 м² жижиг оффис, төвд байрлалтай. Интернет, цахилгаан, халаалттай. Жижиг бизнес эрхлэгчдэд тохиромжтой. Хурлын өрөө ашиглах боломжтой.',
    phone: '99118822',
    contact_name: 'Баттулга',
    images: ['/uploads/property-4.svg', '/uploads/property-5.svg']
  },
  {
    category: 'rent',
    property_type: 'Орон сууц',
    rooms: 3,
    area: 80,
    city: 'Улаанбаатар',
    district: 'Хан-Уул',
    khoroo: '10-р хороо',
    address_detail: 'Зайсан, Шинэ хотхон',
    latitude: 47.8850,
    longitude: 106.9250,
    price: 3200000,
    price_type: 'month',
    description: '3 өрөө байр, 80 м². Шинэ барилга, 2023 онд ашиглалтад орсон. Дулаан шал, металл хаалга, PVC цонх. Цэвэр засвартай. Гаражтай. Гэр бүлээрээ амьдрахад тохиромжтой.',
    phone: '88445566',
    contact_name: 'Мөнхзул',
    images: ['/uploads/property-6.svg']
  },
  {
    category: 'rent',
    property_type: 'Хашаа байшин',
    rooms: 4,
    area: 180,
    city: 'Улаанбаатар',
    district: 'Сонгинохайрхан',
    khoroo: '28-р хороо',
    address_detail: 'Толгойт, Шинэ суурин',
    latitude: 47.8750,
    longitude: 106.8000,
    price: 2800000,
    price_type: 'month',
    description: '4 өрөө хашаа байшин, 180 м². Гарааштай, цэцэрлэгтэй. Зуны гал тогоотой. Халуун ус, халаалттай. Том гэр бүлд тохиромжтой. Нам гүм, аюулгүй орчинтой.',
    phone: '99778899',
    contact_name: 'Оюунгэрэл',
    images: ['/uploads/property-7.svg', '/uploads/property-8.svg']
  },
  {
    category: 'rent',
    property_type: 'Газар',
    rooms: 0,
    area: 5000,
    city: 'Улаанбаатар',
    district: 'Баянгол',
    khoroo: '25-р хороо',
    address_detail: 'Хангайн ойролцоо, Үйлдвэрийн бүс',
    latitude: 47.8650,
    longitude: 106.8500,
    price: 5000000,
    price_type: 'month',
    description: '0.5 га газар, үйлдвэр, агуулах, авто засварын газар байгуулахад тохиромжтой. Ус, цахилгаан, замтай. Том оврын машин механизм нэвтрэх боломжтой. Урт хугацааны түрээсээр өгнө.',
    phone: '88556677',
    contact_name: 'Батсайхан',
    images: ['/uploads/property-9.svg']
  },
  {
    category: 'rent',
    property_type: 'Орон сууц',
    rooms: 1,
    area: 32,
    city: 'Эрдэнэт',
    district: 'Эрдэнэт',
    khoroo: '1-р хороо',
    address_detail: 'Төв талбайн ойролцоо, 5-р байр',
    latitude: 49.0278,
    longitude: 104.0444,
    price: 800000,
    price_type: 'month',
    description: '1 өрөө байр, 32 м². Төвд байрлалтай, засвартай. Гал тогооны тавилгатай. Оюутан, ганц бие хүмүүст тохиромжтой. Автобусны буудал, дэлгүүр ойролцоо.',
    phone: '88667788',
    contact_name: 'Энхжаргал',
    images: ['/uploads/property-10.svg', '/uploads/property-11.svg']
  }
];

const allListings = [...sellListings, ...rentListings];

// Create tables and insert data
db.serialize(() => {
  // Drop existing tables to start fresh
  db.run(`DROP TABLE IF EXISTS listings`);
  db.run(`DROP TABLE IF EXISTS verification_codes`);
  db.run(`DROP TABLE IF EXISTS users`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    verified INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('sell', 'rent')),
    property_type TEXT NOT NULL,
    rooms INTEGER DEFAULT 0,
    area REAL DEFAULT 0,
    city TEXT NOT NULL,
    district TEXT,
    khoroo TEXT,
    address_detail TEXT,
    latitude REAL,
    longitude REAL,
    price INTEGER NOT NULL,
    price_type TEXT DEFAULT 'month',
    description TEXT,
    phone TEXT NOT NULL,
    contact_name TEXT,
    images TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS verification_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create demo user
  db.run(`INSERT OR IGNORE INTO users (id, phone, name, verified) VALUES (1, '97699112233', 'Демо хэрэглэгч', 1)`);

  // Insert sample listings
  let count = 0;
  const stmt = db.prepare(`INSERT INTO listings (user_id, category, property_type, rooms, area, city, district, khoroo, address_detail, latitude, longitude, price, price_type, description, phone, contact_name, images) 
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  allListings.forEach(l => {
    stmt.run([l.category, l.property_type, l.rooms, l.area, l.city, l.district, l.khoroo, l.address_detail, l.latitude, l.longitude, l.price, l.price_type, l.description, l.phone, l.contact_name, JSON.stringify(l.images)], function(err) {
      if (err) {
        console.error('❌ Error:', err.message);
      } else {
        count++;
        const catLabel = l.category === 'sell' ? 'Зарах' : 'Түрээслэх';
        console.log(`✅ [${count}] ${l.property_type} - ${catLabel} - ₮${l.price.toLocaleString()} - ${l.city}, ${l.district} (${l.images.length} зураг)`);
      }
    });
  });

  stmt.finalize();
});

setTimeout(() => {
  const sellCount = sellListings.length;
  const rentCount = rentListings.length;
  console.log(`\n🎉 Нийт ${allListings.length} зарыг амжилттай орууллаа!`);
  console.log(`   📌 Зарах: ${sellCount} зар`);
  console.log(`   📌 Түрээслэх: ${rentCount} зар`);
  console.log(`   🖼️ Бүх зар зурагтай`);
  console.log('📱 Демо хэрэглэгч: 99112233');
  db.close();
}, 1000);
