// ============================================================
// make-admin.js — Хэрэглэгчид админ эрх олгох / авах (CLI)
//
// Ажиллуулах:
//   node scripts/make-admin.js 88093663          # админ болгох
//   node scripts/make-admin.js 88093663 --revoke # эрх авах
//   node scripts/make-admin.js --list            # админуудыг харуулах
//
// Эрх нь `app_metadata.is_admin`-д хадгалагдана (клиент хуурах боломжгүй).
// ⚠️ service_role түлхүүр шаардана (.env.local).
// ============================================================
const { findUserByPhone, getAdminClient } = require('../lib/authServer');
const { listAllUsers, setUserAdmin, isUserAdmin } = require('../lib/adminAuth');
const { toLocalPhone } = require('../lib/phoneEmail');

async function main() {
  const args = process.argv.slice(2);
  const revoke = args.includes('--revoke');
  const list = args.includes('--list');
  const phone = args.find((a) => !a.startsWith('--'));

  const admin = getAdminClient();

  if (list) {
    const users = await listAllUsers();
    const admins = users.filter(isUserAdmin);
    console.log(`\n🛠  Админууд (${admins.length}/${users.length}):`);
    admins.forEach((u) => {
      const who = u.phone || (u.user_metadata && u.user_metadata.phone) || u.email;
      console.log(`   • ${(u.user_metadata && u.user_metadata.name) || '(нэргүй)'}  ${who}  (${u.id})`);
    });
    if (!admins.length) console.log('   (одоогоор админ байхгүй)');
    console.log('\n   Админ болгох: node scripts/make-admin.js <дугаар>');
    return;
  }

  if (!phone) {
    console.error('❌ Утасны дугаараа өгнө үү. Жишээ: node scripts/make-admin.js 88093663');
    console.error('   Эрх авах:  node scripts/make-admin.js 88093663 --revoke');
    console.error('   Жагсаалт:  node scripts/make-admin.js --list');
    process.exit(1);
  }

  const user = await findUserByPhone(phone);
  if (!user) {
    console.error(`❌ ${toLocalPhone(phone)} дугаартай хэрэглэгч олдсонгүй.`);
    process.exit(1);
  }

  const name = (user.user_metadata && user.user_metadata.name) || '(нэргүй)';
  const before = isUserAdmin(user);
  const target = !revoke;

  if (before === target) {
    console.log(`ℹ️  ${toLocalPhone(phone)} (${name}) аль хэдийн ${target ? 'админ' : 'админ биш'} байна.`);
    return;
  }

  const updated = await setUserAdmin(user.id, target);
  console.log(`\n${target ? '🛠  АДМИН БОЛЛОО' : '👤 АДМИН ЭРХ АВАГДЛАА'}: ${toLocalPhone(phone)} (${name})`);
  console.log(`   user id : ${updated.id}`);
  console.log(`   is_admin: ${!!(updated.app_metadata && updated.app_metadata.is_admin)}`);

  if (target) {
    console.log('\n   ⚠️  Тэр хэрэглэгч browser дээрээ ДАХИН НЭВТРЭХ (эсвэл хуудас refresh) хийх ёстой');
    console.log('      → дараа нь header дээр «🛠 Админ» цэс гарч ирнэ.');
  }
}

main().catch((err) => {
  console.error('❌ Алдаа:', (err && err.message) || err);
  process.exit(1);
});
