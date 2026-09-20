// ============================================================
// find.js — Код доторх ТЕКСТ-ээр хайх туслах
//
// ЯАГААД: grep-ийн flag/зам санахад хэцүү тул нэг командаар хайна.
//
// Ашиглах:
//   npm run find -- "Талбай"           # бүх файлаас
//   npm run find -- "type=\"number\""   # HTML attribute хайх
//   npm run find -- "openEdit" api     # зөвхөн api/ дотор
//
// Гаралт:  файл:мөр:  текст
// ============================================================
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const needle = args.find((a) => !a.startsWith('--'));
const dirFilter = args.find((a) => a.startsWith('--dir='))?.slice(6) || args[1];

if (!needle) {
  console.log('Ашиглах:  npm run find -- "хайх текст" [--dir=components]');
  console.log('Жишээ:    npm run find -- "Талбай (м²)"');
  console.log('          npm run find -- "type=\\"number\\"" --dir=components');
  process.exit(0);
}

const ROOT = path.join(__dirname, '..');
const SKIP = new Set(['node_modules', '.next', '.git', 'public', 'out']);
const EXTS = new Set(['.js', '.jsx', '.mjs', '.json', '.sql', '.md', '.css']);

let found = 0;
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.env.local.example') continue;
    if (SKIP.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (EXTS.has(path.extname(entry.name))) files.push(full);
  }
}

walk(ROOT);

const needleLower = needle.toLowerCase();
for (const file of files) {
  const rel = path.relative(ROOT, file);
  if (dirFilter && !rel.startsWith(dirFilter)) continue;

  let lines;
  try {
    lines = fs.readFileSync(file, 'utf8').split('\n');
  } catch (e) {
    continue;
  }

  lines.forEach((line, i) => {
    if (line.toLowerCase().includes(needleLower)) {
      found += 1;
      const text = line.trim().slice(0, 130);
      console.log(`${rel}:${i + 1}: ${text}`);
    }
  });
}

console.log(`\n${found ? `✅ ${found} газар олдлоо` : `❌ «${needle}» олдсонгүй`}`);
if (found) {
  console.log('👉 Файлыг VS Code дээр нээх:  Cmd+P → файлын нэрийг бичнэ');
  console.log('👉 Тухайн мөр рүү очих:        Cmd+G → мөрийн дугаарыг бичнэ');
}
process.exit(found ? 0 : 1);
