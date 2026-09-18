// Management API-гаар schema SQL-ийг Supabase төсөлд ажиллуулна
// Шаардлагатай: .env.local дотор SUPABASE_ACCESS_TOKEN (sbp_... формат)
const fs = require('fs');
const path = require('path');

let env = {};
const root = path.join(__dirname, '..');
const envFile = path.join(root, '.env.local');
(fs.readFileSync(envFile, 'utf8') || '')
  .split('\n')
  .forEach((l) => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  });

const ref = env.NEXT_PUBLIC_SUPABASE_URL
  ? env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')
  : '';
const token = env.SUPABASE_ACCESS_TOKEN || '';
const sql = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', process.argv[2] || '0001_schema.sql'),
  'utf8'
);

if (!token) {
  console.error('❌ SUPABASE_ACCESS_TOKEN олдсонгүй (.env.local-д нэмэх шаардлагатай).');
  process.exit(1);
}
if (!ref) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL олдсонгүй.');
  process.exit(1);
}

(async () => {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (res.ok) {
    console.log('✅ Schema амжилттай ажиллалаа (хүснэгтүүд үүслээ).');
  } else {
    console.log('❌ Алдаа (' + res.status + '):', text.slice(0, 2000));
  }
})();
