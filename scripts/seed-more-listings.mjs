// ============================================================
// seed-more-listings.js — Үл хөдлөхийн ТӨРӨЛ БҮРТ 10 зар нэмэх
//
// Ажиллуулах:  npm run seed:more
//              npm run seed:more -- 88093663      (өөр хэрэглэгчийн нэр дээр)
//
// • 8 төрөл × 10 = 80 зар (5 зарах + 5 түрээслэх)
// • Реалист үнэ/өрөө/талбай/давхар/дүүрэг/тайлбар (төрөл бүрт тохирсон)
// • Дахин ажиллуулахад ДАВХАРДАХГҮЙ — өмнөх үүсгэсэн заруудыг устгаад шинээр оруулна
//   (ялгах тэмдэг: description дотор #demo-turul10)
// • Зургууд нь public/uploads/property-*.svg (20 зураг, эргэлдүүлж ашиглана)
// ============================================================
import { createRequire } from 'node:module';
import { PROPERTY_TYPE_DEFS, UB_DISTRICTS } from '../lib/locationData.js';

const require = createRequire(import.meta.url);
const { getAdminClient, findUserByPhone } = require('../lib/authServer');

const MARKER = '#demo-turul10';
const PER_TYPE = 10;
const DEMO_PHONE = process.argv[2] || '99112233';

// ---- Реалист параметрүүд (төрөл бүрт) ----------------------------------
// П (сая ₮) — зарах үнэ, түрээс (₮/сар), rooms/area хязгаар, давхар хамаарах эсэх
const P = {
  'Орон сууц': {
    sell: [120e6, 550e6], rent: [800e3, 3.5e6], rooms: [1, 4], area: [28, 130],
    floors: true, apartment: true,
    texts: ['Засвартай, цэвэрхэн орон сууц. Төвд ойрхон, нийтийн тээвэр сайн.', 'Шинэ засвартай, тавилгатай байр. Лифт, зогсоолтой.', 'Гэр бүлд тохиромжтой, гэрэлтэй байр. Сургууль, цэцэрлэг ойрхон.', 'Бүрэн засвартай, орчин үеийн байр. Хамгаалалттай хотхон.'],
  },
  'Газар': {
    sell: [40e6, 400e6], rent: [500e3, 3e6], rooms: [0, 0], area: [300, 3000],
    texts: ['Хашаатай, тэгш газар. Цахилгаан, ус ойрхон.', 'Байршил сайн, төвд ойрхон газар. Барилга барихад тохиромжтой.', 'Зуслангийн бүсэд ойн дунд, амрахад тохиромжтой газар.', 'Голын эрэг дээр, цэвэр агаартай газар.'],
  },
  'Худалдаа, үйлчилгээний талбай': {
    sell: [250e6, 1.5e9], rent: [2e6, 12e6], rooms: [0, 0], area: [40, 500],
    floors: true, apartment: false,
    texts: ['Их дэлгүүрийн 1-р давхарт, хүн ихтэй газар. Витринтэй.', 'Гудамжны нүүр талд, өөрийн орцтой талбай.', 'Шинэ барилгын 1-2 давхар, ресторан/дэлгүүрт тохиромжтой.', 'Оффисын төвийн 1-р давхар, зогсоолтой.'],
  },
  'АОС, хаус, зуслан, амралтын газар': {
    sell: [300e6, 2.5e9], rent: [2e6, 15e6], rooms: [4, 7], area: [150, 600],
    floors: false, apartment: false,
    texts: ['2 давхар хаус, хашаатай, зогсоолтой. Зуслангийн бүсэд.', 'Ойн дунд, цэвэр агаартай амралтын газар. Тавилгатай.', 'Голын эрэг дээр, 6 өрөөтэй хаус. Бүрэн тохижуулсан.', 'Уулын энгэрт, панорама харагдацтай хаус.'],
  },
  'Үйлдвэр, агуулах, обьект': {
    sell: [400e6, 3e9], rent: [3e6, 20e6], rooms: [0, 2], area: [200, 2000],
    floors: false, apartment: false,
    texts: ['Төмөр замын ойролцоо агуулах. Ачих буулгах талбайтай.', 'Үйлдвэрийн зориулалттай обьект, 3 фазын цахилгаантай.', 'Том агуулах, харуул хамгаалалттай. Хүнд машин орох замтай.', 'Хүнсний үйлдвэрийн барилга, тоног төхөөрөмжтэй.'],
  },
  'Оффис': {
    sell: [200e6, 1.2e9], rent: [1.2e6, 8e6], rooms: [0, 4], area: [30, 300],
    floors: true, apartment: false,
    texts: ['Бизнес төвийн оффис, эргэлтэт хаалгатай. Зогсоолтой.', 'Цонхтой, гэрэлтэй оффис. Төвд, нийтийн тээвэр ойрхон.', 'Шинэ оффисын төв, 24/7 хамгаалалттай, лифттэй.', 'Тавилгатай оффис, хурлын өрөөтэй.'],
  },
  'Хашаа байшин': {
    sell: [150e6, 900e6], rent: [1.5e6, 6e6], rooms: [3, 6], area: [100, 400],
    floors: false, apartment: false,
    texts: ['Хашаа байшин, цэцэрлэгтэй. Худаг, цахилгаантай.', '2 давхар хашаа байшин, зогсоол, гаражтай.', 'Хотын төвд ойрхон, тайван гудамжинд байрлалтай хашаа байшин.', 'Урсгал устай, цэвэрхэн хашаа байшин. Засвар шинэ.'],
  },
  'Гараж, контейнер, зөөврийн сууц': {
    sell: [15e6, 80e6], rent: [200e3, 1e6], rooms: [0, 0], area: [15, 60],
    texts: ['Хамгаалалттай зогсоолын гараж. Хаалга автомат.', 'Гаражийн хамтрагт, хяналттай. Машин 2 орох хэмжээтэй.', 'Зөөврийн контейнер, агуулах/оффис болгож ашиглаж болно.', 'Төмөр хаалгатай гараж, хамгаалалттай хотхонд.'],
  },
};

const AIMAGS = ['Дархан-Уул', 'Орхон', 'Сэлэнгэ', 'Өмнөговь', 'Төв'];
const NAME_TEMPLATES = ['Баян', 'Хангай', 'Цэцэг', 'Нарны', 'Гэрэлт', 'Шинэ', 'Туушин', 'Заяа', 'Мөнх', 'Их'];
const NAME_SUFFIX = ['байр', 'хотхон', 'төв', 'хаус', 'плаза', 'агуулах', 'оффис', 'хашаа'];

/** Тогтмол үр дүн гарах PRNG (дахин ажиллуулахад ижил дата) */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rand = makeRng(20260920);
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const round = (n, unit) => Math.round(n / unit) * unit;

const UB_DISTRICT_NAMES = Object.keys(UB_DISTRICTS);

// ---- Нэг зар үүсгэх ----
function buildListing(def, k) {
  const p = P[def.value];
  const category = k % 2 === 0 ? 'sell' : 'rent'; // 5 зарах + 5 түрээс
  const isSell = category === 'sell';

  // Байршил: 9 дэх нь аймаг, бусад нь УБ-ын эргэлдэх дүүрэг/хороо
  const useAimag = k === 9;
  let city = 'Улаанбаатар';
  let district = null;
  let khoroo = null;
  if (useAimag) {
    city = pick(AIMAGS);
  } else {
    district = UB_DISTRICT_NAMES[(k * 3 + randInt(0, 2)) % UB_DISTRICT_NAMES.length];
    const khs = UB_DISTRICTS[district] || [];
    khoroo = khs.length ? pick(khs) : null;
  }

  const area = randInt(p.area[0], p.area[1]);
  const rooms = p.rooms[0] === p.rooms[1] ? p.rooms[0] : randInt(p.rooms[0], p.rooms[1]);

  let floor = null;
  let totalFloors = null;
  if (p.floors) {
    totalFloors = randInt(4, p.apartment ? 16 : 12);
    floor = randInt(1, totalFloors);
  }

  const price = isSell
    ? round(randInt(p.sell[0], p.sell[1]), 1e6) // 1 сая хүртэл дугуйруулна
    : round(randInt(p.rent[0], p.rent[1]), 10e3); // 10 мянга хүртэл

  const namePrefix = pick(NAME_TEMPLATES);
  const addressDetail = useAimag
    ? `${namePrefix} ${pick(NAME_SUFFIX)}`
    : `${namePrefix} ${pick(NAME_SUFFIX)}, ${randInt(1, 40)}-р байр`;

  const imgCount = randInt(2, 4);
  const start = k % 20;
  const images = Array.from({ length: imgCount }, (_, i) => `/uploads/property-${((start + i * 3) % 20) + 1}.svg`);

  const roomsText = rooms > 0 ? `${rooms} өрөө, ` : '';
  const floorText = floor ? `, ${floor}/${totalFloors} давхар` : '';
  const description =
    `${pick(p.texts)}\n` +
    `${roomsText}${area} м²${floorText}\n` +
    `${isSell ? 'Зарах үнэ' : 'Түрээс (сард)'}: ₮${price.toLocaleString('en-US')}\n` +
    `${MARKER}`;

  return {
    category,
    property_type: def.value,
    rooms,
    area,
    city,
    district,
    khoroo,
    address_detail: addressDetail,
    latitude: Number((47.85 + rand() * 0.12).toFixed(6)),
    longitude: Number((106.75 + rand() * 0.3).toFixed(6)),
    price,
    price_type: isSell ? 'total' : 'month',
    description,
    phone: `976${String(DEMO_PHONE).replace(/\D/g, '').slice(-8)}`,
    contact_name: pick(['Бат-Эрдэнэ', 'Сүхбаатар', 'Ганбаатар', 'Энхбат', 'Мөнхбат', 'Оюунчимэг', 'Тэмүүлэн']),
    images,
    build_year: p.apartment ? randInt(1995, 2023) : null,
    floor,
    total_floors: totalFloors,
    balconies: p.apartment ? randInt(1, 4) : null,
    has_garage: p.apartment || def.value === 'Оффис' ? rand() > 0.4 : null,
  };
}

// ---- Ажиллуулах ----
(async () => {
  const admin = getAdminClient();
  const user = await findUserByPhone(DEMO_PHONE);
  if (!user) {
    console.error(`❌ ${DEMO_PHONE} дугаартай хэрэглэгч олдсонгүй. Эхлээд: node scripts/seed-supabase.js`);
    process.exit(1);
  }
  const name = (user.user_metadata && user.user_metadata.name) || '(нэргүй)';
  console.log(`👤 Эзэн: ${name} (${DEMO_PHONE})\n`);

  // 1) Өмнөх үүсгэсэн заруудыг устгах (зөвхөн MARKER-тай — давхардалгүй)
  const { data: old } = await admin.from('listings').select('id').like('description', `%${MARKER}%`);
  if (old && old.length) {
    await admin.from('listings').delete().in('id', old.map((o) => o.id));
    console.log(`🗑  Өмнөх ${old.length} demo зарыг устгав (давхардахгүй)\n`);
  }

  // 2) Зарууд үүсгэх
  const rows = [];
  for (const def of PROPERTY_TYPE_DEFS) {
    for (let k = 0; k < PER_TYPE; k += 1) rows.push(buildListing(def, k));
  }
  console.log(`📦 ${PROPERTY_TYPE_DEFS.length} төрөл × ${PER_TYPE} = ${rows.length} зар үүсгэж байна...`);

  // 3) 20-аар багцлан оруулах
  for (let i = 0; i < rows.length; i += 20) {
    const chunk = rows.slice(i, i + 20).map((r) => ({ ...r, user_id: user.id }));
    const { error } = await admin.from('listings').insert(chunk);
    if (error) {
      console.error(`\n❌ Оруулахад алдаа: ${error.message}`);
      if (/column|schema cache/i.test(error.message)) {
        console.error('   → supabase/migrations/0003_listing_details.sql-ийг SQL Editor-т ажиллуулна уу.');
      }
      process.exit(1);
    }
    console.log(`   ✓ ${Math.min(i + 20, rows.length)}/${rows.length}`);
  }

  // 4) Дүн
  const { data: all } = await admin.from('listings').select('property_type, category');
  const stats = {};
  (all || []).forEach((r) => {
    stats[r.property_type] = stats[r.property_type] || { sell: 0, rent: 0 };
    stats[r.property_type][r.category] = (stats[r.property_type][r.category] || 0) + 1;
  });

  console.log('\n=== Төрөл бүрийн нийт зар ===');
  for (const def of PROPERTY_TYPE_DEFS) {
    const c = stats[def.value] || { sell: 0, rent: 0 };
    console.log(
      `  ${def.icon} ${def.value.padEnd(34)} зарах: ${String(c.sell || 0).padStart(2)}  түрээс: ${String(c.rent || 0).padStart(2)}  нийт: ${(c.sell || 0) + (c.rent || 0)}`
    );
  }
  console.log(`\n🎉 DB-д нийт ${(all || []).length} зар байна`);
  console.log('👉 http://localhost:3000 — төрлийн табууд дээр тоонууд харагдана');
  process.exit(0);
})().catch((err) => {
  console.error('❌ Алдаа:', (err && err.message) || err);
  process.exit(1);
});

