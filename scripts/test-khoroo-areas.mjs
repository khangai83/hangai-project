// ============================================================
// test-khoroo-areas.mjs — 🏘 «ХОРООНЫ ГАЗРЫН НЭРШИЛ» тест (2026-10-10 (117))
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «add to хороо by дүүрэг» — дүүрэг тус бүрийн албан
//   ёсны «N-р хороо»-ны ДАРАА амын ярианд түгээмэл газрын нэр (Яармаг,
//   Зайсан, Нисэх, Саппоро, Цирк …) нэмэгдэв.
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/locationData.js` → `UB_KHOROO_AREAS` (нэг эх сурвалж) ба
//      `getKhoroos()` / `getKhorooAreas()` / `getKhoroosForDistricts()`
//   ② ДҮРЭМ: нэр trim · дүүрэг дотор давхцалгүй · дүүрэг ХООРОНД давхцалгүй ·
//      «N-р хороо» маягийн нэр БИШ · ⚠️ ТАСЛАЛ (`,`) БАЙХГҮЙ (URL-д таслалаар
//      нэгтгэгддэг тул нэг утга 2 сонголт болж ХАГАЦНА ✗)
//   ③ ГАЗРЫН ЗУРАГ: дугааргүй нэр нь `khorooCenter()` → `null` ⇒ авто пин нь
//      дүүргийн төв рүү буцна (`autoCenterFor`) — ДУГААРТАЙ хорооны зам ХЭВЭЭР ✓
//   ④ ЭХ ФАЙЛЫН ГЭРЭЭ: UI (форм + пикер) нь жагсаалтыг `getKhoroos*`-аас авна;
//      компонент дотор газрын нэр ХАТУУ бичсэн давхардал БАЙХГҮЙ ✓
//
// АЖИЛЛУУЛАХ:  npm run test:khoroo-areas
// ⚠️ DB/React/хөтөч ХОЛБОГДОХГҮЙ — зөвхөн Node (`locationData.js` нь зөвхөн
//    цэвэр .mjs модулиудыг импортолдог; `locationGeo.mjs` ч мөн адил ✓)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  UB_DISTRICTS, UB_KHOROO_AREAS, getKhoroos, getKhorooAreas,
  getKhoroosForDistricts, getDistricts, CITIES,
} from '../lib/locationData.js';
import { khorooNumber, khorooCenter, autoCenterFor, districtCenter } from '../lib/locationGeo.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

/** Коммент (`//` мөр ба блок) салгаж, ЗӨВХӨН кодыг буцаана (эх файлын гэрээг шалгахад) */
const codeOnly = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

/** Хэрэглэгчийн хүсэлтээр ирсэн дүүргүүд (энэ 6 дүүрэгт нэр нэмэгдсэн) */
const AREA_DISTRICTS = ['Хан-Уул', 'Баянгол', 'Сонгинохайрхан', 'Сүхбаатар', 'Чингэлтэй', 'Баянзүрх'];

console.log('\n── ① `UB_KHOROO_AREAS` — бүтэц ба хамрах хүрээ ──');

t('① 6 дүүрэгт нэр нэмэгдсэн ба тус бүр 1+ нэртэй', () => {
  assert.deepEqual(Object.keys(UB_KHOROO_AREAS).slice().sort(), AREA_DISTRICTS.slice().sort());
  AREA_DISTRICTS.forEach((d) => {
    const list = UB_KHOROO_AREAS[d];
    assert.ok(Array.isArray(list) && list.length > 0, `${d}: нэр хоосон ✗`);
  });
});

t('① Нэр нь ЗӨВХӨН УБ-ын дүүрэгт харьяалагдана (`UB_DISTRICTS`-тэй нийцнэ)', () => {
  Object.keys(UB_KHOROO_AREAS).forEach((d) => {
    assert.ok(UB_DISTRICTS[d], `${d} нь UB_DISTRICTS-д байхгүй ✗`);
  });
  // Дүүргийн тоо/дараалал ХӨНДӨӨГДӨӨГҮЙ (регресс: 9 дүүрэг)
  assert.equal(getDistricts('Улаанбаатар').length, 9);
});

t('① Дүүрэг тус бүрийн нэрийн ТОО (хэрэглэгчийн жагсаалттай ЯГ ижил)', () => {
  const expected = {
    'Хан-Уул': 30, Баянгол: 10, Сонгинохайрхан: 13,
    Сүхбаатар: 8, Чингэлтэй: 10, Баянзүрх: 17,
  };
  Object.entries(expected).forEach(([d, n]) => {
    assert.equal(UB_KHOROO_AREAS[d].length, n, `${d}: ${n} байх ёстой ✗`);
  });
  const total = Object.values(UB_KHOROO_AREAS).reduce((s, l) => s + l.length, 0);
  assert.equal(total, 88, 'нийт нэрийн тоо 88 биш ✗');
});

console.log('\n── ② ДҮРЭМ — trim · давхцалгүй · таслалгүй ──');

t('② Нэр бүр ХООСОН БИШ ба ирмэгийн зайгүй (trim)', () => {
  Object.entries(UB_KHOROO_AREAS).forEach(([d, list]) => {
    list.forEach((n) => {
      assert.equal(typeof n, 'string', `${d}: нэр string биш ✗`);
      assert.ok(n.length > 0, `${d}: хоосон нэр ✗`);
      assert.equal(n, n.trim(), `${d}: «${n}» ирмэгийн зайтай ✗`);
      assert.ok(!/\s{2,}/.test(n), `${d}: «${n}» давхар зайтай ✗`);
    });
  });
});

t('② ⚠️ Нэр дотор ТАСЛАЛ (`,`) БАЙХГҮЙ (URL-ийн нэгдлийн дүрэм)', () => {
  Object.entries(UB_KHOROO_AREAS).forEach(([d, list]) => {
    list.forEach((n) => {
      assert.ok(!n.includes(','), `${d}: «${n}» таслалтай — URL-д 2 сонголт болж хагацна ✗`);
    });
  });
});

t('② `N-р хороо` маягийн нэр БИШ (албан ёсны жагсаалттай давхцахгүй)', () => {
  const OFFICIAL = /^\d{1,3}-р хороо$/;
  Object.entries(UB_KHOROO_AREAS).forEach(([d, list]) => {
    list.forEach((n) => {
      assert.ok(!OFFICIAL.test(n), `${d}: «${n}» нь албан ёсны хорооны хэвтэй ✗`);
      assert.ok(!UB_DISTRICTS[d].includes(n), `${d}: «${n}» нь UB_DISTRICTS-д байна ✗`);
    });
  });
});

t('② Дүүрэг БҮРД давхцалгүй (нэг нэр 2 удаа БАЙХГҮЙ)', () => {
  Object.entries(UB_KHOROO_AREAS).forEach(([d, list]) => {
    assert.equal(new Set(list).size, list.length, `${d}: дотор нь давхцал бий ✗`);
  });
});

t('② Дүүрэг ХООРОНД давхцалгүй (нэгдэл дээр нэг нэр 2 дүүргээс ИРЭХГҮЙ)', () => {
  const seen = new Map();
  Object.entries(UB_KHOROO_AREAS).forEach(([d, list]) => {
    list.forEach((n) => {
      if (seen.has(n)) assert.fail(`«${n}» нь ${seen.get(n)} ба ${d} хоёуланд байна ✗`);
      seen.set(n, d);
    });
  });
  assert.equal(seen.size, 88);
});

t('② Хэрэглэгчийн хүсэлтээр ирсэн НЭРС БҮРЭН бий (регресс гэрээ)', () => {
  const must = {
    'Хан-Уул': ['Яармаг', 'Зайсан', 'Нисэх', '120 мянгат', 'Bella Vista', 'Нэхмэлийн шар'],
    Баянгол: ['3 ба 4-р хороолол', '10-р хороолол', 'Вокзал'],
    Сонгинохайрхан: ['Саппоро', 'Баянхошуу', 'Таван шар'],
    Сүхбаатар: ['100 айл', 'Цирк', 'Бэлх', 'Сэлбэ'],
    Чингэлтэй: ['40 мянгат', 'Гандан', 'Баянбүрд', 'Тэнгис'],
    Баянзүрх: ['Ботаник', 'Нарантуул', 'Дүнжингарав', 'Чулуун овоо'],
  };
  Object.entries(must).forEach(([d, names]) => {
    names.forEach((n) => assert.ok(UB_KHOROO_AREAS[d].includes(n), `${d}: «${n}» байхгүй ✗`));
  });
});

console.log('\n── ③ `getKhoroos` / `getKhorooAreas` (нэг эх сурвалж) ──');

t('③ `getKhoroos` = эхлээд `N-р хороо`, дараа нь газрын нэрс (дараалал ЧУХАЛ)', () => {
  const list = getKhoroos('Улаанбаатар', 'Хан-Уул');
  const official = UB_DISTRICTS['Хан-Уул'];
  assert.equal(list.length, official.length + 30, 'Хан-Уул: 24 + 30 = 54 байх ёстой ✗');
  assert.deepEqual(list.slice(0, official.length), official, 'эхний хэсэг нь албан ёсны хороо ✗');
  assert.deepEqual(list.slice(official.length), UB_KHOROO_AREAS['Хан-Уул'], 'дараа нь газрын нэрс ✗');
  assert.equal(new Set(list).size, list.length, 'давхцал бий ✗');
});

t('③ Нэр байхгүй дүүрэг (Налайх) ХӨНДӨӨГДӨХГҮЙ (зөвхөн хорооны дугаар)', () => {
  assert.deepEqual(getKhoroos('Улаанбаатар', 'Налайх'), UB_DISTRICTS['Налайх']);
  assert.equal(getKhoroos('Улаанбаатар', 'Налайх').length, 8);
  assert.deepEqual(getKhorooAreas('Улаанбаатар', 'Налайх'), []);
});

t('③ УБ биш / танихгүй дүүрэг → `[]` (регресс)', () => {
  assert.deepEqual(getKhoroos('Дархан-Уул', 'Дархан'), []);
  assert.deepEqual(getKhoroos('Улаанбаатар', 'Байхгүй'), []);
  assert.deepEqual(getKhorooAreas('Улаанбаатар', ''), []);
  assert.deepEqual(getKhoroos('', 'Хан-Уул'), []);
});

t('③ Буцаасан массив нь ХУУЛБАР — эх дата мутацлагдахгүй ✓', () => {
  const a = getKhorooAreas('Улаанбаатар', 'Баянгол');
  a.push('ХУУЛМАГ');
  const b = getKhoroos('Улаанбаатар', 'Баянгол');
  b.length = 0;
  assert.ok(!UB_KHOROO_AREAS['Баянгол'].includes('ХУУЛМАГ'), 'эх дата мутацлагдав ✗');
  assert.equal(UB_KHOROO_AREAS['Баянгол'].length, 10, 'эх дараалал эвдэрлэв ✗');
  assert.equal(UB_DISTRICTS['Баянгол'].length, 33, 'UB_DISTRICTS мутацлагдав ✗');
});

t('③ `CITIES` / `UB_DISTRICTS` / `getDistricts` ХӨНДӨӨГДӨӨГҮЙ (регресс)', () => {
  assert.equal(CITIES.length, 22);
  assert.equal(Object.keys(UB_DISTRICTS).length, 9);
  assert.equal(UB_DISTRICTS['Баянгол'].length, 33);
  assert.equal(UB_DISTRICTS['Сүхбаатар'].length, 20);
});

console.log('\n── ④ ОЛОН дүүрэг — НЭГДЭЛ (`getKhoroosForDistricts`) ──');

t('④ 1 дүүрэг = `getKhoroos`-той ЯГ ижил (регресс гэрээ)', () => {
  AREA_DISTRICTS.forEach((d) => {
    assert.deepEqual(getKhoroosForDistricts('Улаанбаатар', [d]), getKhoroos('Улаанбаатар', d));
    assert.deepEqual(getKhoroosForDistricts('Улаанбаатар', d), getKhoroos('Улаанбаатар', d));
  });
  assert.deepEqual(getKhoroosForDistricts('Улаанбаатар', ['Налайх']), UB_DISTRICTS['Налайх']);
});

t('④ 2 дүүрэг → нэрээр давхцалгүй НЭГДЭЛ (газрын нэрс ч багтана)', () => {
  const list = ['Баянгол', 'Сүхбаатар'];
  const out = getKhoroosForDistricts('Улаанбаатар', list);
  // Баянгол (33+10) ∪ Сүхбаатар (20+8) — «1-р хороо»…«20-р хороо» давхцана
  assert.equal(out.length, 33 + 10 + 8, 'нийт (33+10+20+8) - 20 = 51 байх ёстой ✗');
  assert.deepEqual(out, [...new Set(list.flatMap((d) => getKhoroos('Улаанбаатар', d)))]);
  assert.equal(new Set(out).size, out.length, 'давхцал бий ✗');
  assert.ok(out.includes('Вокзал') && out.includes('Цирк'), 'газрын нэрс нэгдэлд байх ёстой ✗');
  assert.ok(out.includes('33-р хороо'), 'Баянгол 33 дахь хороо нэгдэлд байх ёстой ✗');
});

t('④ 3 дүүрэг ч зөв (эхний дүүрэг ТҮРҮҮЛНЭ, давхцалгүй ✓)', () => {
  const list = ['Хан-Уул', 'Баянзүрх', 'Чингэлтэй'];
  const a = getKhoroos('Улаанбаатар', 'Хан-Уул');
  const out = getKhoroosForDistricts('Улаанбаатар', list);
  assert.deepEqual(out.slice(0, a.length), a);
  assert.deepEqual(out, [...new Set(list.flatMap((d) => getKhoroos('Улаанбаатар', d)))]);
  assert.equal(out.length, 24 + 30 + 43 + 17 + 24 + 10 - 24 * 2, '3 дүүргийн нэгдлийн тоо ✗');
  assert.equal(new Set(out).size, out.length);
});

t('④ Хоосон/танихгүй хот → `[]` (хорооны блок НУУГДАНА)', () => {
  assert.deepEqual(getKhoroosForDistricts('Улаанбаатар', []), []);
  assert.deepEqual(getKhoroosForDistricts('Улаанбаатар', null), []);
  assert.deepEqual(getKhoroosForDistricts('Дархан-Уул', ['Дархан']), []);
});


console.log('\n── ⑤ URL-ийн гэрээ (таслалаар нэгтгэх → салгахад ЭВДРЭХГҮЙ) ──');

t('⑤ Газрын нэрсийг URL-д бичиж буцааж уншихад ЯГ ижил (HomeClient-ийн дүрэм)', () => {
  // `HomeClient`: `params.set('khoroo', filters.khoroos.join(','))` → `parseListParam` (split(','))
  const picked = ['Яармаг', 'Зайсан', '120 мянгат', '19-р хороолол'];
  const raw = picked.join(',');
  const back = raw.split(',').map((s) => s.trim()).filter(Boolean);
  assert.deepEqual(back, picked, 'URL round-trip эвдэрсэн ✗');
  // ⚠️ Нэр бүр таслалгүй тул БҮГД дээр round-trip үнэн ✓
  const all = Object.values(UB_KHOROO_AREAS).flat();
  const joined = [...all, ...all].join(',');
  assert.equal(joined.split(',').map((s) => s.trim()).filter(Boolean).length, all.length * 2);
});

t('⑤ Бүх нэр нь `encodeURIComponent` → `decodeURIComponent` дамжина', () => {
  Object.values(UB_KHOROO_AREAS).flat().forEach((n) => {
    assert.equal(decodeURIComponent(encodeURIComponent(n)), n, `«${n}» кодлоход эвдэрлээ ✗`);
  });
});

console.log('\n── ⑥ ГАЗРЫН ЗУРАГ — авто төв (дугааргүй нэр → дүүргийн төв) ──');

t('⑥ `khorooNumber` / `khorooCenter`: газрын нэр → `null` (пин дүүргийн төвд)', () => {
  assert.equal(khorooNumber('Яармаг'), null);
  assert.equal(khorooNumber('Bella Vista'), null);
  // ⚠️ «120 мянгат» нь 120 гэж уншигдана — гэхдээ KHOROO_CENTERS-д 120 дугаар
  //    байхгүй тул хуучин fallback (ойролцоо) замд орно (хор хөнөөлгүй ✓)
  assert.equal(khorooCenter('Улаанбаатар', 'Хан-Уул', 'Яармаг'), null);
  assert.ok(khorooCenter('Улаанбаатар', 'Хан-Уул', '11-р хороо'), 'дугаартай хороо төвтэй байх ёстой ✗');
});

t('⑥ `autoCenterFor`: газрын нэр сонгоход ДҮҮРГИЙН төв рүү буцна', () => {
  const d = districtCenter('Улаанбаатар', 'Хан-Уул');
  const c = autoCenterFor({ city: 'Улаанбаатар', district: 'Хан-Уул', khoroo: 'Яармаг' });
  assert.deepEqual(c, d, 'дүүргийн төв рүү буцах ёстой ✗');
  // Дугаартай хороо нь дүүргийн төвөөс ЯЛГААТАЙ (регресс: нарийвчлал ХЭВЭЭР) ✓
  const num = autoCenterFor({ city: 'Улаанбаатар', district: 'Хан-Уул', khoroo: '11-р хороо' });
  assert.notDeepEqual(num, d, 'дугаартай хорооны нарийвчлал алдагдав ✗');
});

console.log('\n── ⑦ ЭХ ФАЙЛЫН ГЭРЭЭ — UI нь нэг эх сурвалжийг УНШИНА ──');

t('⑦ Форм нь жагсаалтыг `getKhoroos`-оос авна (хатуу бичсэн нэр БАЙХГҮЙ)', () => {
  const src = codeOnly('components/AddListingClient.jsx');
  assert.match(src, /getKhoroos\(form\.city, form\.district\)/, 'формын хороо нэг эх сурвалжтай биш ✗');
  ['Яармаг', 'Зайсан', 'Саппоро', 'Ботаник'].forEach((n) => {
    assert.ok(!src.includes(n), `форм дотор «${n}» ХАТУУ бичигдсэн ✗`);
  });
});

t('⑦ Пикер нь `getKhoroosForDistricts` / `getKhoroos`-оос авна (давхардал БАЙХГҮЙ)', () => {
  const src = codeOnly('components/LocationPicker.jsx');
  assert.match(src, /getKhoroosForDistricts\(draftCity, draftDistricts\)/, 'пикер нэгдлээ олдоггүй ✗');
  assert.match(src, /getKhoroos\(draftCity, d\)\.length > 0/, 'дотоод орох дүрэм эвдэрсэн ✗');
  ['Яармаг', 'Зайсан', 'Саппоро'].forEach((n) => {
    assert.ok(!src.includes(n), `пикер дотор «${n}» ХАТУУ бичигдсэн ✗`);
  });
});

t('⑦ `UB_KHOROO_AREAS` нь ЯГ нэг газар тодорхойлогдоно (нэг эх сурвалж)', () => {
  const files = ['lib/locationData.js', 'lib/locationGeo.mjs', 'components/HomeClient.jsx',
    'components/AddListingClient.jsx', 'components/LocationPicker.jsx'];
  const defs = files.filter((f) => /export const UB_KHOROO_AREAS/.test(codeOnly(f)));
  assert.deepEqual(defs, ['lib/locationData.js'], 'нэрний жагсаалт зөвхөн нэг файлд байх ёстой ✗');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);

