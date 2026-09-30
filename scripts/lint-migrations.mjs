// ============================================================
// lint-migrations.mjs — migration SQL-ийн БҮТЦИЙН шалгалт (DB ХОЛБОГДОХГҮЙ)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-09-30 (5)):
//   `0026_furniture_travel_sections.sql`-ийн `comment on column … is '…'`
//   statement-ийн хамгийн сүүлийн мөр ТАСАРСАН байв — өгүүлбэрийн үлдэгдэл
//   («ТААРАХ ёстой.») ба төгсгөлийн `;` алга болсон тул Postgres дараагийн
//   `update public.listings`-ийг ХОЛГОЖ уншаад:
//     ERROR: 42601: syntax error at or near "update"   ✗
//   гэж SQL Editor дээр мэдээлсэн — алдаа нь АРДЫН комментийн мөрөнд
//   (LINE 73) заасан тул шалтгааныг олоход хэцүү байсан ✗
//   → энэ скрипт тэр ангиллын алдааг COMMIT-ИЙН ӨМНӨ 1 секундэд барина ✓
//
// АЖИЛЛУУЛАХ:  npm run lint:migrations
//   (эсвэл: node scripts/lint-migrations.mjs <файл.sql> …  — зөвхөн тэр файл)
//
// ⚠️ Энэ нь Postgres-ийн БҮРЭН parser БИШ — зөвхөн ЛЕКСИК (бүтцийн) шалгалт:
//   ① statement дотор `(`/`)` тэнцэлтэй эсэх        → `;` дээр depth ≠ 0 ❌
//   ② `'…'` / `"…"` / `$$…$$` / `/*…*/` хаагдсан эсэх → файлын төгсгөл ❌
//   ③ `;`-ээс хойш «хөвөгч» текст үлдсэн эсэх        → statement `;`-гүй ❌
//   ④ ШИНЭ statement нь ИШЛЭЛ/ТООНЫ дараа ШУУД эхэлсэн эсэх            ❌
//      (яг 0026-ын алдаа: `… → SECTIONS-тэй ЯГ '` → `update public.listings`)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';

const dir = path.join(new URL('..', import.meta.url).pathname, 'supabase', 'migrations');

// Statement ЭХЛҮҮЛЭХ түлхүүр үгс. `set` нь `update … set`-тэй, `with` нь
// `create policy … with check`-тай мөргөлддөг тул ЗОРИУДААР ороогүй ✓
const STARTERS = new Set([
  'select', 'insert', 'update', 'delete', 'create', 'alter', 'drop',
  'comment', 'do', 'grant', 'revoke', 'truncate', 'begin', 'commit',
  'rollback', 'call', 'values', 'analyze', 'vacuum', 'refresh', 'notify',
]);

const isWordChar = (c) => !!c && /[A-Za-z0-9_$]/.test(c);

// Ишлэл/коммент/dollar-quote-ийг `~` ба зай болгож ХАМААРНА (мөр шилжилт
// ХЭВЭЭР — ингэснээр мөрийн дугаар бүрэн зөв үлдэнэ ✓)
function mask(sql) {
  const out = sql.split('');
  const n = sql.length;
  let i = 0;
  while (i < n) {
    const c = sql[i];
    // ---- Mөрийн коммент: `--` … \n ----
    if (c === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') { out[i] = ' '; i += 1; }
      continue;
    }
    // ---- Блок коммент: /* … */ (nested-тэй) ----
    if (c === '/' && sql[i + 1] === '*') {
      let depth = 1;
      out[i] = out[i + 1] = ' ';
      i += 2;
      while (i < n && depth > 0) {
        if (sql[i] === '/' && sql[i + 1] === '*') { depth += 1; out[i] = out[i + 1] = ' '; i += 2; continue; }
        if (sql[i] === '*' && sql[i + 1] === '/') { depth -= 1; out[i] = out[i + 1] = ' '; i += 2; continue; }
        if (sql[i] !== '\n') out[i] = ' ';
        i += 1;
      }
      if (depth > 0) return { masked: out.join(''), errorAt: n, error: 'блок коммент `/*` хаагдаагүй' };
      continue;
    }
    // ---- Ишлэл: '…' (текст) ба "…" (identifier) — '' / "" нь escape ✓ ----
    if (c === "'" || c === '"') {
      const q = c;
      i += 1;
      let closed = false;
      while (i < n) {
        if (sql[i] === q) {
          if (sql[i + 1] === q) { out[i] = '~'; out[i + 1] = '~'; i += 2; continue; }
          closed = true;
          i += 1;
          break;
        }
        if (sql[i] !== '\n') out[i] = '~';
        i += 1;
      }
      if (!closed) return { masked: out.join(''), errorAt: i - 1, error: `ишлэл \`${q}\` хаагдаагүй` };
      continue;
    }
    // ---- Dollar-quote: $tag$ … $tag$ (function body) ----
    if (c === '$') {
      const m = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i, i + 64));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        if (end < 0) return { masked: out.join(''), errorAt: i, error: `dollar-quote \`${tag}\` хаагдаагүй` };
        for (let k = i; k < end + tag.length; k += 1) if (sql[k] !== '\n') out[k] = '~';
        i = end + tag.length;
        continue;
      }
    }
    i += 1;
  }
  return { masked: out.join(''), error: null };
}

// ---------- 1 файл шалгах ----------
function lintFile(file) {
  const sql = fs.readFileSync(file, 'utf8');
  const rawLines = sql.split('\n');
  const lineAt = new Int32Array(sql.length + 1);
  let ln = 1;
  for (let i = 0; i < sql.length; i += 1) {
    lineAt[i] = ln;
    if (sql[i] === '\n') ln += 1;
  }
  lineAt[sql.length] = ln;
  const L = (o) => lineAt[Math.max(0, Math.min(o, sql.length))];

  const errors = [];
  const { masked, error, errorAt } = mask(sql);
  if (error) errors.push({ line: L(errorAt), msg: `② ${error} (файлын төгсгөл хүртэл хаагдаагүй)` });

  let depth = 0;
  let semis = 0;
  let lastSemi = -1;
  let stmtStartLine = 1;
  const n = masked.length;
  let i = 0;
  while (i < n) {
    const c = masked[i];
    if (c === '(') { depth += 1; i += 1; continue; }
    if (c === ')') {
      depth -= 1;
      if (depth < 0) { errors.push({ line: L(i), msg: '① илүүдэл `)` — хаалт тэнцэхгүй (`;` дутуу байж болзошгүй)' }); depth = 0; }
      i += 1; continue;
    }
    if (c === ';') {
      if (depth !== 0) {
        errors.push({ line: L(i), msg: `① хаалт хаагдаагүй — \`;\` дээр ${depth} нээлттэй \`(\` үлдсэн` });
        depth = 0;
      }
      semis += 1;
      lastSemi = i;
      stmtStartLine = L(i) + 1;
      i += 1; continue;
    }
    if (/[A-Za-z_]/.test(c) && !isWordChar(masked[i - 1])) {
      let j = i;
      while (j < n && isWordChar(masked[j])) j += 1;
      const word = masked.slice(i, j);
      if (depth === 0 && STARTERS.has(word.toLowerCase())) {
        let k = i - 1;
        while (k >= 0 && /\s/.test(masked[k])) k -= 1;
        const prev = k >= 0 ? masked[k] : '';
        if (prev === "'" || prev === '"' || /[0-9]/.test(prev)) {
          const kind = prev === "'" ? 'текст ишлэлийн' : prev === '"' ? 'identifier ишлэлийн' : 'тоон утгын';
          const prevLine = rawLines[L(i) - 2] !== undefined ? rawLines[L(i) - 2].trim().slice(0, 88) : '';
          errors.push({
            line: L(i),
            msg: `④ \`;\` ДУТУУ — «${word}» нь ${kind} дараа ШУУД эхэлсэн`
              + `\n         ⤷ өмнөх statement мөр ${stmtStartLine}-аас эхэлсэн → мөр ${L(i) - 1}-ийн төгсгөлд \`;\` байх ёстой`
              + (prevLine ? `\n         ⤷ мөр ${L(i) - 1}: ${prevLine}` : ''),
          });
        }
      }
      i = j; continue;
    }
    i += 1;
  }

  const tail = masked.slice(lastSemi + 1);
  if (/\S/.test(tail)) {
    errors.push({
      line: L(lastSemi + 1 + tail.search(/\S/)),
      msg: '③ `;`-ээр төгсөөгүй ХӨВӨГЧ текст файлын төгсгөлд үлдсэн (сүүлийн statement-д `;` нэмнэ)',
    });
  }
  if (depth !== 0) errors.push({ line: L(n - 1), msg: `① файлын төгсгөлд ${depth} нээлттэй \`(\` үлдсэн` });

  return { semis, errors };
}

// ---------- Ажиллуулах ----------
const args = process.argv.slice(2);
let files;
if (args.length) {
  files = args.map((a) => path.resolve(a));
} else {
  files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((f) => path.join(dir, f));
}

console.log('\n🧪 Migration SQL-ийн бүтцийн шалгалт (лексик lint — DB ХОЛБОГДОХГҮЙ)\n');
let bad = 0;
let totalStmts = 0;
for (const file of files) {
  const name = path.basename(file);
  if (!fs.existsSync(file)) {
    console.log(`  ❌ ${name} — файл олдсонгүй`);
    bad += 1;
    continue;
  }
  const { semis, errors } = lintFile(file);
  totalStmts += semis;
  if (errors.length === 0) {
    console.log(`  ✓ ${name.padEnd(46)} ${String(semis).padStart(3)} statement`);
  } else {
    bad += 1;
    console.log(`  ❌ ${name.padEnd(46)} ${String(semis).padStart(3)} statement`);
    for (const e of errors) console.log(`       ⛔ мөр ${e.line}: ${e.msg}`);
  }
}

console.log(`\n📊 ${files.length} файл · ${files.length - bad} ✓ · ${bad} ❌ · нийт ${totalStmts} statement`);
if (bad) {
  console.log('\n❌ Бүтцийн алдаа олдлоо — SQL Editor-т ажиллуулахаас ӨМНӨ засна уу ✗\n');
  process.exit(1);
}
console.log('✅ Бүх migration бүтцийн хувьд зөв — SQL Editor-т ажиллуулж болно ✓\n');

