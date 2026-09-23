// ============================================================
// test-youtube.mjs — YouTube линк шалгах/хөрвүүлэх тест (lib/youtube.mjs)
//
// ЯАГААД ЧУХАЛ ВЭ:
//   1. БУРУУ линк хадгалагдвал дэлгэрэнгүй хуудсан дээр видео ХАРАГДАХГҮЙ
//      (хэрэглэгч «нэмсэн» гэж бодож байтал хоосон цагаан хайрцаг гарна).
//   2. ХАМГИЙН ЧУХАЛ — АЮУЛГҮЙ БАЙДАЛ: хэрэглэгчийн бичсэн текстийг шууд
//      `<iframe src>`-д хийвэл XSS/clickjacking боломжтой. Энэ тест нь
//      ЗӨВХӨН youtube.com ба i.ytimg.com руу embed/thumb үүсгэдгийг батална.
//
// АЖИЛЛУУЛАХ:  npm run test:youtube
// ============================================================
import assert from 'node:assert/strict';
import {
  YOUTUBE_ID_RE,
  extractYouTubeId,
  youTubeWatchUrl,
  youTubeEmbedUrl,
  youTubeThumbUrl,
  parseYouTube,
  normalizeYouTubeUrl,
} from '../lib/youtube.mjs';

const ID = 'dQw4w9WgXcQ';

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 YouTube линк (lib/youtube.mjs)\n');

// ---------------- extractYouTubeId — дэмжих хэлбэрүүд ----------------
t('watch?v=ID', () => {
  assert.equal(extractYouTubeId(`https://www.youtube.com/watch?v=${ID}`), ID);
  assert.equal(extractYouTubeId(`http://youtube.com/watch?v=${ID}`), ID);
});

t('youtu.be/ID (богино линк)', () => {
  assert.equal(extractYouTubeId(`https://youtu.be/${ID}`), ID);
  assert.equal(extractYouTubeId(`youtu.be/${ID}`), ID, 'схемгүй бичсэн ч');
});

t('shorts / embed / live / v', () => {
  assert.equal(extractYouTubeId(`https://www.youtube.com/shorts/${ID}`), ID);
  assert.equal(extractYouTubeId(`https://www.youtube.com/embed/${ID}`), ID);
  assert.equal(extractYouTubeId(`https://www.youtube.com/live/${ID}`), ID);
  assert.equal(extractYouTubeId(`https://www.youtube.com/v/${ID}`), ID);
});

t('m. / music. / nocookie subdomain', () => {
  assert.equal(extractYouTubeId(`https://m.youtube.com/watch?v=${ID}`), ID);
  assert.equal(extractYouTubeId(`https://music.youtube.com/watch?v=${ID}`), ID);
  assert.equal(extractYouTubeId(`https://www.youtube-nocookie.com/embed/${ID}`), ID);
});

t('нэмэлт параметр үл тоомсорлогдоно (&t, &list, ?si)', () => {
  assert.equal(extractYouTubeId(`https://www.youtube.com/watch?v=${ID}&t=30s&list=PL123`), ID);
  assert.equal(extractYouTubeId(`https://youtu.be/${ID}?si=abcDEF&t=42`), ID);
});

t('зөвхөн ID бичсэн ч болно', () => {
  assert.equal(extractYouTubeId(ID), ID);
  assert.equal(extractYouTubeId(`  ${ID}  `), ID, 'зайтай ч');
});

// ---------------- extractYouTubeId — БУРУУ / АЮУЛТАЙ оролт ----------------
t('⚠️ ХОС дээрх линкүүд ТАТГАЛЗАХГҮЙ (XSS-ээс сэргийлнэ)', () => {
  assert.equal(extractYouTubeId('https://evil.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(extractYouTubeId('https://youtube.evil.com/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(extractYouTubeId('javascript:alert(1)'), null);
  assert.equal(extractYouTubeId('data:text/html,<script>alert(1)</script>'), null);
  assert.equal(extractYouTubeId('<script>alert(1)</script>'), null);
});

t('⚠️ youtube.com-ийн буруу зам → null', () => {
  assert.equal(extractYouTubeId('https://www.youtube.com/'), null);
  assert.equal(extractYouTubeId('https://www.youtube.com/watch'), null);
  assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=tooSHORT'), null);
  assert.equal(extractYouTubeId('https://www.youtube.com/channel/UC1234567890'), null);
});

t('хоосон / null / undefined → null', () => {
  assert.equal(extractYouTubeId(''), null);
  assert.equal(extractYouTubeId('   '), null);
  assert.equal(extractYouTubeId(null), null);
  assert.equal(extractYouTubeId(undefined), null);
});

t('YOUTUBE_ID_RE: яг 11 тэмдэгт', () => {
  assert.equal(YOUTUBE_ID_RE.test(ID), true);
  assert.equal(YOUTUBE_ID_RE.test('short'), false);
  assert.equal(YOUTUBE_ID_RE.test('x'.repeat(12)), false);
  assert.equal(YOUTUBE_ID_RE.test('dQw4w9 WgXcQ'), false, 'зай агуулахгүй');
});

// ---------------- parseYouTube ----------------
t('parseYouTube: ok=true үед 3 URL бүгд зөв', () => {
  const r = parseYouTube(`https://youtu.be/${ID}?t=10`);
  assert.equal(r.ok, true);
  assert.equal(r.id, ID);
  assert.equal(r.watchUrl, `https://www.youtube.com/watch?v=${ID}`);
  assert.equal(r.embedUrl, `https://www.youtube.com/embed/${ID}?rel=0&modestbranding=1`);
  assert.equal(r.thumbUrl, `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
});

t('parseYouTube: буруу линк → ok=false, бүх URL null', () => {
  const r = parseYouTube('https://example.com');
  assert.equal(r.ok, false);
  assert.equal(r.id, null);
  assert.equal(r.watchUrl, null);
  assert.equal(r.embedUrl, null);
  assert.equal(r.thumbUrl, null);
});

t('⚠️ АЮУЛГҮЙ: embed ба thumb нь ЗӨВХӨН youtube.com / i.ytimg.com руу явна', () => {
  const inputs = [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    ID,
  ];
  for (const i of inputs) {
    const r = parseYouTube(i);
    assert.match(r.embedUrl, /^https:\/\/www\.youtube\.com\/embed\//);
    assert.match(r.thumbUrl, /^https:\/\/i\.ytimg\.com\/vi\//);
  }
});

t('youTubeEmbedUrl: autoplay / start / mute параметр', () => {
  const u = youTubeEmbedUrl(ID, { autoplay: true, start: 42.9, mute: true });
  assert.match(u, /autoplay=1/);
  assert.match(u, /start=42/, 'бутархай нь бүхэл болно');
  assert.match(u, /mute=1/);
  assert.match(u, /rel=0/);
});

t('youTubeThumbUrl / youTubeWatchUrl: зөв хэлбэр', () => {
  assert.equal(youTubeThumbUrl(ID), `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
  assert.equal(youTubeWatchUrl(ID), `https://www.youtube.com/watch?v=${ID}`);
});

// ---------------- normalizeYouTubeUrl (DB-д хадгалах утга) ----------------
t('normalizeYouTubeUrl: БҮХ хэлбэр НЭГ каноник линк болно', () => {
  const expected = `https://www.youtube.com/watch?v=${ID}`;
  const variants = [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=xyz&t=99`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://music.youtube.com/watch?v=${ID}&list=PL1`,
    ID,
  ];
  for (const v of variants) {
    assert.equal(normalizeYouTubeUrl(v), expected, `'${v}' каноник болох ёстой`);
  }
});

t('normalizeYouTubeUrl: буруу линк → null (DB-д null хадгална)', () => {
  assert.equal(normalizeYouTubeUrl('https://example.com/video'), null);
  assert.equal(normalizeYouTubeUrl(''), null);
  assert.equal(normalizeYouTubeUrl(null), null);
});

t('round-trip: хадгалсан утга → дахин задлахад ижил ID', () => {
  for (const v of [`https://youtu.be/${ID}`, `https://www.youtube.com/shorts/${ID}`, ID]) {
    const stored = normalizeYouTubeUrl(v);
    assert.equal(extractYouTubeId(stored), ID);
  }
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);

