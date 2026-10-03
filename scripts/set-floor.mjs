// ============================================================
// set-floor.mjs — «БАРИЛГЫН НИЙТ ДАВХАР» / «БАЙРНЫ ДАВХАР»-ыг DB дээр ШУУД засах
//
// ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Форм (UI) нь `FLOOR_MAX = 150` (`lib/numberChoices.mjs`) хүртэл сонгуулдаг
//   (🆕 2026-10-03: 26 → 150) тул 150-аас ДЭЭШ (ж: 300) утгыг UI-аас
//   ОРУУЛАХ БОЛОМЖГҮЙ ✗. Харин DB-д `listings.floor` / `listings.total_floors`
//   баганад CHECK хязгаар БАЙХГҮЙ
//   (`0003_listing_details.sql` — зөвхөн `integer`) ⇒ SQL-ээр ШУУД бичиж болно ✓
//
// Ажиллуулах (⚠️ өгөгдмөл нь DRY RUN — юу ч өөрчлөхгүй, зөвхөн харна):
//   # 1 зарыг id-аар нь (ж: floor=150, total=150 болгох):
//   npm run set:floor -- <listing-id> --floor 150 --total 150
//   npm run set:floor -- <listing-id> --floor 150 --total 150 --apply
//
//   # Олон зарыг id-аар (зайгаар тусгаарлана):
//   npm run set:floor -- <id1> <id2> --floor 150 --total 150 --apply
//
//   # Төрлөөр нь (ж: зөвхөн «Орон сууц»):
//   npm run set:floor -- --type "Орон сууц" --floor 150 --total 150 --apply
//
//   # ОЛОН төрлөөр — төрөл тус бүрийг ТУСДАА `--type`-ээр давтана
//   # ⚠️ Таслалаар ХУВААХГҮЙ: «Худалдаа, үйлчилгээний талбай» нэр өөрөө таслалтай!
//   npm run set:floor -- --type "Орон сууц" --type "Худалдаа, үйлчилгээний талбай" --type "Оффис" --floor 150 --total 150 --apply
//
//   # БҮХ зарыг (⚠️ БОЛГООМЖТОЙ — бүх зарыг өөрчилнө):
//   npm run set:floor -- --all --floor 150 --total 150 --apply
//
// ⚠️ Зөвхөн `floor` эсвэл зөвхөн `total_floors`-ыг тусад нь ч сольж болно:
//   npm run set:floor -- <id> --total 150 --apply
//
// ⚠️ service_role түлхүүрийг ашиглана (`.env.local`) — RLS-ыг тойрч, БҮХ зарыг
//    засна. Тимоос зөвхөн ЛОКАЛ дээр ажиллуулна (нууц түлхүүр).
//
// ℹ️ `0014_listing_dedupe.sql`-ийн триггер нь ЗӨВХӨН давхардлын түлхүүр
//    (property_type/city/district/khoroo/address/rooms/area) солигдоход л
//    ажиллана — `floor`/`total_floors` тэр түлхүүрт ОРООГҮЙ тул энэ засвар
//    давхардлын шалгалт өдөөхгүй ✓
// 🚫 2026-10-03 ШИЙДВЭР — ХУУЧИН ЗАРУУДЫГ ШИНЭЧЛЭХ БИЧИЛТ ХИЙХГҮЙ:
//    Хуучин заруудын `floor`/`total_floors` (одоогоор 12 зар хуучин утгатай)
//    -ыг 150 болгож ШИНЭЧЛЭХ шаардлагагүй гэж хэрэглэгч шийдсэн ⇒
//    `npm run set:floor … --apply` ажиллуулахгүй. Хуучин утга нь `integer`
//    тул DB дээр ямар ч алдаа/зөрчил үүсгэхгүй ✓ (форм зөвхөн НОВЫГ л хязгаарлана).
//    Энэ скрипт нь цаашид ЗӨВХӨН шаардлага гарвал (ж: 150-аас дээш давхартай
//    зарыг гараар тааруулах) гараар ашиглана ✓ (өгөгдмөл нь DRY RUN).
//
// ============================================================
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getAdminClient } = require('../lib/authServer');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

/** Аргументуудыг { opts, types, ids } болгож задлана */
function parseArgs() {
  const opts = {};
  const types = [];
  const ids = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--type') {
      /**
       * ⚠️ ТАСЛАЛААР ХУВААХГҮЙ — «Худалдаа, үйлчилгээний талбай» гэсэн
       * нэр өөрөө таслал агуулдаг тул нэг `--type` = нэг БҮТЭН утга.
       * Олон төрөл бол `--type A --type B` гэж ДАВТАНА ✓
       */
      const v = String(args[i + 1] ?? '').trim();
      if (v) types.push(v);
      i += 1;
    } else if (a === '--floor' || a === '--total') {
      opts[a] = args[i + 1];
      i += 1;
    } else if (a === '--apply' || a === '--all') {
      opts[a] = true;
    } else {
      ids.push(a);
    }
  }
  return { opts, types, ids };
}

/** `'150'` → `150` · тоо биш → `NaN` · байхгүй → `null` */
function toIntOrNull(v) {
  if (v === undefined) return null;
  if (!/^-?\d+$/.test(String(v).trim())) return NaN;
  return Number.parseInt(String(v).trim(), 10);
}

const CHUNK = 200; // нэг update хүсэлтэд бичих мөрийн тоо

async function main() {
  const sb = getAdminClient();
  const { opts, types, ids } = parseArgs();

  const floor = toIntOrNull(opts['--floor']);
  const total = toIntOrNull(opts['--total']);
  const ALL = !!opts['--all'];

  if (Number.isNaN(floor) || Number.isNaN(total)) {
    throw new Error('--floor / --total нь бүхэл тоо байх ёстой (ж: --floor 150).');
  }
  if (floor === null && total === null) {
    throw new Error('Хамгийн багадаа --floor ЭСВЭЛ --total өгнө үү.');
  }
  if (floor !== null && floor < 1) throw new Error('--floor нь 1-ээс багагүй байх ёстой.');
  if (total !== null && total < 1) throw new Error('--total нь 1-ээс багагүй байх ёстой.');
  if (floor !== null && total !== null && floor > total) {
    console.warn(`⚠️  Анхаар: floor (${floor}) > total_floors (${total}) — UI дүрмээр давхар нь нийт давхраас хэтрэх ёсгүй.`);
  }

  // ---- Бичих утгууд (зөвхөн өгөгдсөнийг нь) ----
  const patch = {};
  if (floor !== null) patch.floor = floor;
  if (total !== null) patch.total_floors = total;

  // ---- Зорилтын заруудыг олно (зөвхөн УНШИНА) ----
  let query = sb.from('listings').select('id, property_type, floor, total_floors');
  let target = '';
  if (ids.length) {
    query = query.in('id', ids);
    target = `ID-аар (${ids.length}): ${ids.join(', ')}`;
  } else if (types.length) {
    query = query.in('property_type', types);
    target = `Төрлүүд (${types.length}): ${types.map((t) => `«${t}»`).join(', ')}`;
  } else if (ALL) {
    target = 'БҮХ зар';
  } else {
    throw new Error('Зорилт өгөөгүй. id бичнэ, эсвэл --type "...", эсвэл --all.');
  }

  const { data, error } = await query;
  if (error) throw new Error(`Уншихад алдаа: ${error.message}`);
  const rows = data || [];

  console.log('\n🏢 «Давхар» талбарыг DB дээр шууд засах\n');
  console.log(`   🎯 Зорилт : ${target}`);
  console.log(`   ✏️  Утга  : ${JSON.stringify(patch)}`);
  console.log(`   📊 Олдсон: ${rows.length} зар\n`);

  if (!rows.length) {
    console.log('ℹ️  Тохирох зар олдсонгүй — юу ч хийсэнгүй.\n');
    return;
  }

  const preview = (r) => {
    const before = `${r.floor ?? '—'}/${r.total_floors ?? '—'}`;
    const after = `${patch.floor ?? r.floor ?? '—'}/${patch.total_floors ?? r.total_floors ?? '—'}`;
    return `   • ${r.id}  ${String(r.property_type || '').padEnd(28)} ${before} → ${after}`;
  };
  rows.slice(0, 20).forEach((r) => console.log(preview(r)));
  if (rows.length > 20) console.log(`   … мөн ${rows.length - 20} зар`);

  if (!APPLY) {
    console.log('\n🧪 DRY RUN — юу ч өөрчлөгдөөгүй.');
    console.log('   Бичихийн тулд төгсгөлд нь `--apply` нэмнэ үү:\n');
    return;
  }

  // ---- Бичих (service_role — RLS тойрно) ----
  const idsToWrite = rows.map((r) => r.id);
  let done = 0;
  for (let i = 0; i < idsToWrite.length; i += CHUNK) {
    const chunk = idsToWrite.slice(i, i + CHUNK);
    const { error: upErr } = await sb.from('listings').update(patch).in('id', chunk);
    if (upErr) throw new Error(`Бичихэд алдаа: ${upErr.message}`);
    done += chunk.length;
    console.log(`   ✓ ${done}/${idsToWrite.length}`);
  }

  console.log(`\n🎉 ${done} зар шинэчлэгдлээ → ${JSON.stringify(patch)}\n`);
}

main().catch((err) => {
  console.error('❌ Алдаа:', (err && err.message) || err);
  process.exit(1);
});
