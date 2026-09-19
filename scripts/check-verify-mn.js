// ============================================================
// check-verify-mn.js — verify.mn (SMS баталгаажуулалт) интеграцийг турших
//
// Ажиллуулах:
//   node scripts/check-verify-mn.js 99112233
//   (эсвэл: npm run check:verify -- 99112233)
//
// Юу хийдэг вэ:
//   1. VERIFY_MN_API_KEY байгаа эсэхийг шалгана
//   2. Шинэ session үүсгэж 6 оронтой код + зааврыг хэвлэнэ
//   3. Та 144773 руу кодыг SMS-ээр илгээхэд 3 секунд тутам төлөв шалгана
//   4. VERIFIED болмогц 🎉 хэвлээд дуусна (EXPIRED бол ⏱)
//
// ⚠️ Нэг SMS нь хэрэглэгчид 150₮ төлбөртэй — зөвхөн тест хийхэд ашиглаарай.
// ============================================================
const verifyMn = require('../lib/verifyMn');

async function main() {
  const phone = process.argv[2];

  if (!phone) {
    console.error('❌ Утасны дугаараа өгнө үү. Жишээ: node scripts/check-verify-mn.js 99112233');
    process.exit(1);
  }
  if (!verifyMn.isValidMnPhone(phone)) {
    console.error(`❌ «${phone}» нь Монгол утасны дугаар биш байна (жишээ: 99112233).`);
    process.exit(1);
  }
  if (!verifyMn.getApiKey()) {
    console.error('❌ VERIFY_MN_API_KEY тохируулаагүй байна.');
    console.error('   verify.mn → Developer Console → API KEY-г .env.local-д нэмнэ үү.');
    process.exit(1);
  }

  console.log('🔎 verify.mn интеграцийг туршиж байна...\n');
  console.log(`   Base URL: ${verifyMn.getBaseUrl()}`);
  console.log(`   Дугаар:   ${verifyMn.toLocalPhone(phone)}\n`);

  let ok = false;

  try {
    // ⬇️ Бүх урсгалыг нэг функцээр: session үүсгэх → 3 сек тутам шалгах → boolean
    ok = await verifyMn.verifyPhone(phone, {
      onSession: (s) => {
        console.log(`✅ Session үүслээ: ${s.sessionId}`);
        console.log(`   Код:        ${s.text}`);
        console.log(`   Shortcode:  ${s.shortcode || verifyMn.SHORTCODE}`);
        console.log(`   smsUri:     ${s.smsUri}`);
        console.log(`   Дуусах:     ${s.expiresAt}\n`);
        console.log('👉 Заавар (хэрэглэгчид үгчлэн харуулах ёстой текст):');
        console.log(`   ${s.displayInstruction}\n`);
        console.log('⏳ 3 секунд тутам төлөв шалгаж байна (5 минут хүртэл)...');
      },
      onTick: (s) => {
        const t = new Date().toISOString().slice(11, 19);
        console.log(`   [${t}] ${s.sessionStatus}${s.verifiedAt ? ` (verifiedAt: ${s.verifiedAt})` : ''}`);
      },
    });
  } catch (err) {
    // Тохиргооны алдаа (API key буруу/дутуу, дугаар буруу) — энд шидэгдэнэ
    console.error('\n❌ Тохиргооны алдаа:', err.message);
    if (err.code) console.error(`   code: ${err.code}`);
    if (err.body) console.error('   Хариу:', JSON.stringify(err.body));
    process.exit(1);
  }

  if (ok) {
    console.log(`\n🎉 VERIFIED — ${verifyMn.toLocalPhone(phone)} дугаар амжилттай баталгаажлаа!`);
    process.exit(0);
  }
  console.log('\n⏱  EXPIRED / хугацаа дууссан (эсвэл SMS ирээгүй). Дахин туршихдаа скриптийг дахин ажиллуулна уу.');
  process.exit(1);
}

main().catch((err) => {
  console.error('❌ Шалгалтын алдаа:', (err && err.message) || err);
  process.exit(1);
});
