// ============================================================
// normalize-condition.mjs — ХУУЧИН «Төлөв» утгуудыг «Шинэ / Шинэвтэр / Хуучин»
//                            болгож НЭГТГЭХ (2026-09-29 · 2026-10-02)
//
// Ажиллуулах:
//   npm run normalize:condition            # DRY RUN — зөвхөн харна (юу ч бичихгүй)
//   npm run normalize:condition -- --apply # БИЧНЭ (service_role шаардана)
//
// ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ (хэрэглэгчийн хүсэлт):
//   ФОРМ ба SIDEBAR-ийн шүүлт одоо ЯГ 3 сонголттой: «Шинэ» / «Шинэвтэр» /
//   «Хуучин» (`lib/locationData.js` → CONDITION_OPTIONS; `Шинэвтэр` нь
//   2026-10-02-нд нэмэгдэв). Гэтэл ХУУЧИН заруудын
//   `attrs.condition` нь «Хэрэглэсэн — сайн», «Хэрэглэсэн — хэвийн»,
//   «Засвар шаардлагатай», «Хэвийн» гэж үлдсэн тул:
//     ① «Хуучин» гэж шүүхэд ХУУЧИН зарууд ОЛДОХГҮЙ (0 үр дүн) ✗
//     ② Карт дээрх мөрөнд «Хэрэглэсэн — сайн» гэсэн ХУУЧИН текст хэвээр ✗
//   → энэ скрипт тэдгээрийг «Хуучин» болгож нэгтгэнэ ✓
//
// ⚠️ ЗӨВХӨН `attrs.condition`-д хүрнэ — бусад талбар (brand/model/…) ба
//    үнэ/зураг ХӨНДӨГДӨХГҮЙ ✓ Мөн «Шинэ» утга хэвээр үлдэнэ ✓
// ============================================================
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getAdminClient } = require('../lib/authServer');

/** 📜 ХУУЧИН утга → ШИНЭ утга (бүгд «Хуучин» болно) */
const MAP = {
  'Хэрэглэсэн — сайн': 'Хуучин',
  'Хэрэглэсэн — хэвийн': 'Хуучин',
  'Хэрэглэсэн - сайн': 'Хуучин', // ⚠️ зураас нь ASCII «-» хувилбар (гараар бичсэн)
  'Хэрэглэсэн - хэвийн': 'Хуучин',
  'Засвар шаардлагатай': 'Хуучин',
  'Хэвийн': 'Хуучин',
  'Хуучин': 'Хуучин',
  'Шинэ': 'Шинэ',
  // 🆕 2026-10-02: `Шинэвтэр` нь мөн ХҮЧИНТЭЙ утга тул ХӨНДӨХГҮЙ ✓
  'Шинэвтэр': 'Шинэвтэр',
};

const APPLY = process.argv.includes('--apply');
const PAGE = 500; // PostgREST-ийн мөрийн дээд хязгаар (1000) — аюулгүй бага

async function main() {
  const sb = getAdminClient();

  const { data, error } = await sb
    .from('listings')
    .select('id, section, attrs')
    .not('attrs->>condition', 'is', null)
    .order('id', { ascending: true });

  if (error) throw new Error(`Уншиж чадсангүй: ${error.message}`);

  const rows = (data || []).filter((r) => r.attrs && r.attrs.condition != null);
  const byValue = new Map();
  const toFix = [];
  rows.forEach((r) => {
    const cur = String(r.attrs.condition);
    byValue.set(cur, (byValue.get(cur) || 0) + 1);
    const next = MAP[cur];
    if (next && next !== cur) toFix.push({ id: r.id, cur, next, attrs: r.attrs });
  });

  console.log('\n🩹 «Шинэ / Шинэвтэр / Хуучин» нэгтгэл (attrs.condition)\n');
  console.log(`   Нийт condition-той зар: ${rows.length}`);
  [...byValue.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([v, n]) => console.log(`   • «${v}» — ${n}`));

  if (!toFix.length) {
    console.log('\n✅ Бүх зар аль хэдийн зөв — засах зүйл алга.\n');
    return;
  }

  console.log(`\n⚠️  Засах шаардлагатай: ${toFix.length} зар → «Хуучин»`);
  const sample = toFix.slice(0, 5).map((r) => `${r.id.slice(0, 8)} «${r.cur}»`);
  console.log(`   Жишээ: ${sample.join(', ')}${toFix.length > 5 ? ' …' : ''}`);

  if (!APPLY) {
    console.log('\n🧪 DRY RUN — юу ч бичээгүй. Бичих бол:');
    console.log('   npm run normalize:condition -- --apply\n');
    return;
  }

  let done = 0;
  for (let i = 0; i < toFix.length; i += 1) {
    const r = toFix[i];
    const { error: upErr } = await sb
      .from('listings')
      .update({ attrs: { ...r.attrs, condition: r.next } })
      .eq('id', r.id);
    if (upErr) throw new Error(`${r.id}: ${upErr.message}`);
    done += 1;
    if (done % 50 === 0 || done === toFix.length) {
      process.stdout.write(`\r   ✍️  ${done}/${toFix.length} хадгалсан…`);
    }
  }
  console.log('\n\n✅ БОЛЛОО — хуучин утгууд «Хуучин» болов (шүүлт одоо зөв ажиллана ✓)\n');
}

main().catch((err) => {
  console.error('\n❌ Алдаа:', (err && err.message) || err);
  process.exit(1);
});
