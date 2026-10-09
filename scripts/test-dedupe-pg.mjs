// ============================================================
// test-dedupe-pg.mjs — 🚫 0014 (V2) давхардлын хамгаалалтыг БОДИТ
// PostgreSQL 16 дээр ажиллуулж батална (түр кластер үүсгэнэ).
//
//   npm run test:dedupe:pg
//
// ЮУ ХИЙДЭГ ВЭ:
//   ① Түр кластер (initdb) — UNIX socket-оор (TCP порт хэрэглэхгүй ⇒ зөрчилгүй)
//   ② Хамгийн бага схем: `auth.users`, `public.profiles`, `public.listings`
//      + Supabase-ийн 3 роль (anon/authenticated/service_role)
//   ③ `supabase/migrations/0014_listing_dedupe.sql`-ийг 2 УДАА ажиллуулна
//      (идемпотент эсэх) ✓
//   ④ `scripts/dedupe-pg-tests.sql` — 21+ тест (дүрэм 1-4, агент, cooldown,
//      tombstone, fallback, 30 хоногийн цонх, dedupe_status())
//   ⑤ Дүнг хэвлэж, FAIL байвал exit 1
//
// ⚠️ PostgreSQL (initdb/pg_ctl/psql) суугаагүй бол SKIP (exit 0) — бусад
//    тест (`test:dedupe`) статик гэрээгээр л шалгана ✓
// ============================================================
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

const real = (cmd) => spawnSync('bash', ['-lc', `command -v ${cmd}`], { encoding: 'utf8' }).stdout.trim();
const NEEDED = ['initdb', 'pg_ctl', 'psql'];
const missing = NEEDED.filter((c) => !real(c));
if (missing.length) {
  console.log(`\n⚠️  SKIP: ${missing.join(', ')} олдсонгүй (PostgreSQL суулгаагүй).`);
  console.log('   ⚠️ Тестийг SKIP хийлээ — алдаа БИШ (exit 0).\n');
  process.exit(0);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zar-dedupe-pg-'));
const sock = path.join(dir, 'sock');
const data = path.join(dir, 'data');
const log = path.join(dir, 'pg.log');
fs.mkdirSync(sock);

let started = false;

/** psql-ийг socket-оор дуудах */
function psql(args, opts = {}) {
  return spawnSync(
    'psql',
    ['-h', sock, '-U', 'postgres', '-d', 'postgres', '-X', '-v', 'ON_ERROR_STOP=1', ...args],
    { encoding: 'utf8', ...opts }
  );
}

function fail(msg, out) {
  console.error(`\n❌ ${msg}`);
  if (out && out.trim()) console.error(out.trim().slice(0, 4000));
  cleanup();
  process.exit(1);
}

function cleanup() {
  try {
    if (started) spawnSync('pg_ctl', ['-D', data, '-m', 'immediate', 'stop'], { encoding: 'utf8' });
  } catch { /* ignore */ }
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

process.on('SIGINT', () => { cleanup(); process.exit(130); });

console.log('\n🐘 0014 (V2) давхардлын хамгаалалт — БОДИТ PostgreSQL тест\n');

// ---------- ① Түр кластер ----------
{
  const init = spawnSync('initdb', ['-D', data, '-U', 'postgres', '--encoding=UTF8', '--locale=C'], {
    encoding: 'utf8',
  });
  if (init.status !== 0) {
    console.log('⚠️  SKIP: initdb ажилласангүй (энэ орчинд PostgreSQL кластер үүсгэх боломжгүй).');
    console.log((init.stderr || '').trim().slice(0, 400));
    cleanup();
    process.exit(0);
  }
}

{
  const start = spawnSync(
    'pg_ctl',
    ['-D', data, '-l', log, '-o', `-k ${sock} -c listen_addresses='' -c fsync=off`, 'start', '-w'],
    { encoding: 'utf8' }
  );
  if (start.status !== 0) fail('Кластер ажилласангүй.', start.stderr || start.stdout);
  started = true;
}

// ---------- ② Хамгийн бага схем (Supabase-ийн шаардлагатай хэсэг) ----------
const SCHEMA = `
create role anon;
create role authenticated;
create role service_role;
create schema if not exists auth;

create table auth.users (
  id uuid primary key,
  email text unique,
  raw_app_meta_data jsonb not null default '{}'::jsonb
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  -- ⚠️ ТЕСТ: auth.users руу FOREIGN KEY ХИЙХГҮЙ — «auth.users-д мөр байхгүй»
  --    тохиолдлыг (T21) шалгахын тулд (бодит DB-д FK бий, гэхдээ триггер
  --    нь мөр олдохгүй ч унах ЁСГҮЙ — анхдагч лимит рүү шилжинэ ✓)
  user_id uuid not null,
  category text not null default 'sell',
  property_type text not null default '',
  section text,
  attrs jsonb default '{}'::jsonb,
  rooms integer not null default 0,
  area real not null default 0,
  floor integer,
  build_year integer,
  city text not null default 'Улаанбаатар',
  district text,
  khoroo text,
  address_detail text,
  price bigint not null default 0,
  phone text,
  images jsonb not null default '[]'::jsonb,
  title text,
  -- ⚠️ ТЕСТИЙН ТОХИРГОО: 5 минутын өмнөх огноо — ингэснээр 60 секундын
  --    COOLDOWN тестүүд хоорондоо саад болохгүй (cooldown-ыг зөвхөн T10
  --    нь created_at = now() гэж ШУУД бичиж шалгана ✓).
  created_at timestamptz not null default (now() - interval '5 minutes')
);
`;
{
  const r = psql(['-q', '-c', SCHEMA]);
  if (r.status !== 0) fail('Хамгийн бага схем үүсгэж чадсангүй.', r.stderr);
  console.log('✅ Хамгийн бага схем үүслээ (auth.users · profiles · listings)');
}

// ---------- ③ Migration-ыг 2 УДАА (идемпотент) ----------
const MIG = path.join(ROOT, 'supabase/migrations/0014_listing_dedupe.sql');
for (const pass of [1, 2]) {
  const r = psql(['-q', '-f', MIG]);
  if (r.status !== 0) fail(`0014 ажилласангүй (${pass}-р удаа).`, r.stderr);
  console.log(`✅ 0014 ажиллалаа (${pass}-р удаа — идемпотент ✓)`);
}

// ---------- ④ Тестүүд ----------
const TESTS = path.join(ROOT, 'scripts/dedupe-pg-tests.sql');
{
  const r = psql(['-q', '-f', TESTS]);
  if (r.status !== 0) fail('Тестийн SQL ажилласангүй.', r.stderr);
}

// ---------- ⑤ Дүн ----------
{
  const bad = psql(['-t', '-A', '-c',
    "select coalesce(json_agg(json_build_object('n', n, 'name', name, 'detail', detail) order by n)::text, '[]') from public._t_results where not ok"]);
  const all = psql(['-t', '-A', '-c',
    "select n || '. ' || case when ok then 'PASS' else 'FAIL' end || '  ' || name from public._t_results order by n"]);
  const sum = psql(['-t', '-A', '-c',
    "select count(*) || ' тест, ' || count(*) filter (where ok) || ' ✓, ' || count(*) filter (where not ok) || ' ✗' from public._t_results"]);

  const lines = (all.stdout || '').trim().split('\n').filter(Boolean);
  lines.forEach((l) => console.log(`   ${l.includes('FAIL') ? '❌' : '✓'} ${l}`));
  console.log(`\n📊 ${(sum.stdout || '').trim()}`);

  let failures = [];
  try {
    failures = JSON.parse((bad.stdout || '[]').trim() || '[]');
  } catch { failures = []; }

  if (failures.length) {
    console.log('\n❌ БҮТГЭЭГҮЙ ТЕСТҮҮД:');
    failures.forEach((f) => console.log(`   ${f.n}. ${f.name}\n      → ${f.detail}`));
    cleanup();
    process.exit(1);
  }
}

console.log('\n✅ БҮХ ТЕСТ ДАВАВ (бодит PostgreSQL 16)\n');
cleanup();
