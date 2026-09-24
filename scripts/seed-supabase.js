// ============================================================
// SEED — Supabase-д демо хэрэглэгч + заруудыг оруулна
// Ажиллуулах: node scripts/seed-supabase.js
// Шаардлагатай: .env.local дотор NEXT_PUBLIC_SUPABASE_URL,
//                NEXT_PUBLIC_SUPABASE_ANON_KEY,
//                SUPABASE_SERVICE_ROLE_KEY байх ёстой.
// ============================================================
const { createClient } = require('@supabase/supabase-js');
// ⚠️ Бүртгэлийн логикийг давхардуулахгүйн тулд сервер талын модулийг ашиглана
const { createVerifiedUser, findUserByPhone, isPhoneProviderEnabled } = require('../lib/authServer');
const { phoneToEmail } = require('../lib/phoneEmail');
const fs = require('fs');
const path = require('path');

// Багахан .env.local parser (dotenv ашиглахгүй)
function loadEnvLocal() {
  try {
    const file = path.join(__dirname, '..', '.env.local');
    const content = fs.readFileSync(file, 'utf8');
    content.split('\n').forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    });
  } catch (e) {
    console.error('⚠️  .env.local олдсонгүй. cp .env.local.example .env.local хийгээд тохируулна уу.');
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL тодорхойгүй байна.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const DEMO_PHONE = '+97699112233';
const DEMO_PASSWORD = 'ZarDemo123!';

// Демо зарууд (зургууд нь public/uploads-ийн svg файлууд)
const LISTINGS1 = [
  { category: 'sell', property_type: 'Орон сууц', rooms: 3, area: 75, build_year: 2015, floor: 5, total_floors: 9, balconies: 2, has_garage: true, bathrooms: 2, city: 'Улаанбаатар', district: 'Баянгол', khoroo: '5-р хороо', address_detail: 'Хангай дүүрэг, 16-р байр', latitude: 47.9065, longitude: 106.9050, price: 280000000, price_type: 'total', description: '3 өрөө байр, засвартай, тавилгатай.', phone: '99112233', contact_name: 'Бат-Эрдэнэ', images: ['/uploads/property-1.svg', '/uploads/property-2.svg'] },
  { category: 'sell', property_type: 'АОС, хаус, зуслан, амралтын газар', rooms: 6, area: 300, build_year: 2012, total_floors: 2, bathrooms: 3, city: 'Улаанбаатар', district: 'Хан-Уул', khoroo: '11-р хороо', address_detail: 'Зайсан, Арц-13 тоот', latitude: 47.8800, longitude: 106.9200, price: 650000000, price_type: 'total', description: '2 давхар хувийн сууц, 300 м².', phone: '99887766', contact_name: 'Сүхбаатар', images: ['/uploads/property-3.svg', '/uploads/property-4.svg'] },
  { category: 'sell', property_type: 'Газар', rooms: 0, area: 750, city: 'Улаанбаатар', district: 'Сонгинохайрхан', khoroo: '32-р хороо', address_detail: 'Толгойт', latitude: 47.8700, longitude: 106.7800, price: 95000000, price_type: 'total', description: '7.5 ам газар, хашаатай.', phone: '99001122', contact_name: 'Ганбаатар', images: ['/uploads/property-5.svg'] },
  { category: 'sell', property_type: 'Худалдаа, үйлчилгээний талбай', rooms: 0, area: 120, floor: 1, total_floors: 5, has_garage: true, city: 'Улаанбаатар', district: 'Чингэлтэй', khoroo: '4-р хороо', address_detail: 'Их дэлгүүрийн 1-р давхар', latitude: 47.9150, longitude: 106.9250, price: 450000000, price_type: 'total', description: '120 м² худалдааны талбай.', phone: '99776655', contact_name: 'Энхбат', images: ['/uploads/property-6.svg', '/uploads/property-7.svg'] },
];
const LISTINGS2 = [
  { category: 'rent', property_type: 'Орон сууц', rooms: 3, area: 90, build_year: 2019, floor: 12, total_floors: 16, balconies: 3, has_garage: false, bathrooms: 2, city: 'Улаанбаатар', district: 'Баянзүрх', khoroo: '26-р хороо', address_detail: '26-р хороолол', latitude: 47.9000, longitude: 106.9900, price: 2200000, price_type: 'month', description: '3 өрөө, тавилгатай, лифттэй.', phone: '99112233', contact_name: 'Дэмо', images: ['/uploads/property-11.svg', '/uploads/property-12.svg'] },
  { category: 'rent', property_type: 'Оффис', rooms: 0, area: 45, floor: 4, total_floors: 12, has_garage: true, city: 'Улаанбаатар', district: 'Сүхбаатар', khoroo: '1-р хороо', address_detail: 'Хатанбаатар, Б-10', latitude: 47.9180, longitude: 106.9080, price: 1800000, price_type: 'month', description: '45 м² оффис, төвд.', phone: '99112233', contact_name: 'Дэмо', images: ['/uploads/property-13.svg'] },
  { category: 'rent', property_type: 'Хашаа байшин', rooms: 5, area: 220, build_year: 2005, total_floors: 2, has_garage: true, bathrooms: 2, city: 'Улаанбаатар', district: 'Хан-Уул', khoroo: '11-р хороо', address_detail: 'Зайсан', latitude: 47.8850, longitude: 106.9100, price: 3500000, price_type: 'month', description: '5 өрөө хашаа байшин.', phone: '99112233', contact_name: 'Дэмо', images: ['/uploads/property-15.svg', '/uploads/property-16.svg'] },
  { category: 'rent', property_type: 'Орон сууц', rooms: 1, area: 35, build_year: 2008, floor: 3, total_floors: 5, balconies: 1, has_garage: false, city: 'Дархан-Уул', district: 'Дархан', khoroo: '8-р хороо', address_detail: 'Олимп, 8-р байр', latitude: 49.4700, longitude: 105.9500, price: 450000, price_type: 'month', description: '1 өрөө байр, тавилгатай.', phone: '88001122', contact_name: 'Мөнхбат', images: ['/uploads/property-17.svg', '/uploads/property-18.svg'] },
];
const LISTINGS = [...LISTINGS1, ...LISTINGS2];

async function main() {
  let uid = null;

  // Демо хэрэглэгчийг хайх (lib/authServer нь phone, дотоод имэйл болон
  // user_metadata.phone гэсэн гурван хэлбэрийг шалгана)
  const found = await findUserByPhone(DEMO_PHONE);
  if (found) {
    uid = found.id;
    console.log('👤 Демо хэрэглэгч олдлоо:', found.phone || found.email || DEMO_PHONE);
  }

  // Олдохгүй бол үүсгэх.
  // `createVerifiedUser` нь phone provider идэвхтэй эсэхийг өөрөө шалгаж,
  // идэвхгүй бол ДОТООД имэйлээр (`976...@phone.zarmn.mn`) бүртгэнэ —
  // ингэснээр dashboard дээр юу ч солихгүйгээр нэвтэрч чадна.
  if (!uid) {
    try {
      const user = await createVerifiedUser({
        phone: DEMO_PHONE,
        password: DEMO_PASSWORD,
        name: 'Демо хэрэглэгч',
      });
      uid = user.id;
      console.log('👤 Демо хэрэглэгч үүслээ:', DEMO_PHONE, '(password:', DEMO_PASSWORD + ')');
    } catch (e) {
      // "аль хэдийн бүртгэгдсэн" гарвал жагсаалтаас дахин хайна
      if (!/бүртгэгдсэн|already/i.test(e.message)) throw e;
      const again = await findUserByPhone(DEMO_PHONE);
      uid = again && again.id;
      if (!uid) throw e;
    }
  }

  // ----- Хуучин (зөвхөн phone-той) хэрэглэгчийг засах -----
  // phone provider идэвхгүй үед `phone`-той хэрэглэгч НЭВТЭРЧ ЧАДАХГҮЙ
  // (422 phone_provider_disabled). Тиймээс тэр хэрэглэгчид дотоод имэйл
  // нэмж өгснөөр нэвтрэх боломжтой болно.
  const current = (await findUserByPhone(DEMO_PHONE)) || null;
  if (current && !current.email) {
    const phoneAuthOn = await isPhoneProviderEnabled();
    if (!phoneAuthOn) {
      const { error: fixErr } = await admin.auth.admin.updateUserById(current.id, {
        email: phoneToEmail(DEMO_PHONE),
        email_confirm: true,
      });
      if (fixErr) throw fixErr;
      console.log('🔧 Демо хэрэглэгчид дотоод имэйл нэмлээ (phone provider идэвхгүй тул):', phoneToEmail(DEMO_PHONE));
    }
  }

  if (!uid) throw new Error('Демо хэрэглэгчийн id олдсонгүй');

  const { error: profileErr } = await admin.from('profiles').upsert({ id: uid, name: 'Демо хэрэглэгч' }, { onConflict: 'id' });
  if (profileErr) throw profileErr;

  const { error: delErr } = await admin.from('listings').delete().eq('user_id', uid);
  if (delErr) throw delErr;

  let count = 0;
  for (const l of LISTINGS) {
    const { error } = await admin.from('listings').insert({ ...l, user_id: uid });
    if (error) { console.error('❌ Зар оруулахад алдаа:', l.property_type, error.message); continue; }
    count++;
  }

  console.log(`🎉 Нийт ${count} зар амжилттай орууллаа!`);
  console.log(`\n📱 Нэвтрэлт: утасны дугаар + нууц үг`);
  console.log(`   Дугаар:  ${DEMO_PHONE.replace('+976', '')}    Нууц үг: ${DEMO_PASSWORD}`);
  console.log('   (phone provider идэвхтэй эсэхээс үл хамааран ажиллана — lib/authServer.js)');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Алдаа:', err.message);
  process.exit(1);
});
