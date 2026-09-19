// ============================================================
// test-verify-mn.js — verifyPhone() функцийн тест (OFFLINE, mock verify.mn)
//
// Ажиллуулах: node scripts/test-verify-mn.js   (npm run test:verify)
//
// ЯАГААД MOCK ВЭ: бодит SMS нь хэрэглэгчид 150₮ төлбөртэй тул автомат тест
// бодит verify.mn руу хандах ЁСГҮЙ. Энэ тест локал mock сервер ашигладаг тул
// интернэтгүй ч, ямар ч зардалгүй ажиллана. Бодит интеграцийг
// `npm run check:verify -- 99112233` -аар (нэг удаа, гараар) шалгана.
//
// Хамрах хүрээ:
//   1. PENDING → VERIFIED                    → true
//   2. VERIFIED болмогц polling ШУУД зогсох
//   3. EXPIRED                               → false (graceful)
//   4. timeout (хэзээ ч VERIFIED болохгүй)   → false
//   5. 401 (буруу API key)                   → Error ШИДНЭ (тохиргооны алдаа)
//   6. VERIFY_MN_API_KEY дутуу               → Error ШИДНЭ
//   7. Буруу утасны дугаар                   → Error ШИДНЭ
// ============================================================
const http = require('http');
const assert = require('assert');

const MOCK_PORT = 4399;
const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;
const TEST_KEY = 'test-key-123';

// ⚠️ loadEnvLocal() нь зөвхөн ХООСОН хувьсагчийг .env.local-аас бөглөдөг тул
// эхлээд эдгээрийг тавьснаар бодит түлхүүр/URL-г дарж, тест тусгаарлагдана.
process.env.VERIFY_MN_API_KEY = TEST_KEY;
process.env.VERIFY_MN_API_URL = MOCK_URL;

const verifyMn = require('../lib/verifyMn');

// ---------------- Mock verify.mn ----------------
let mode = 'verify'; // 'verify' | 'expired' | 'pending'
let sessions = new Map();
let counts = { post: 0, get: 0 };

function createMock() {
  return http.createServer((req, res) => {
    const json = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    const auth = req.headers.authorization || '';

    if (req.method === 'POST' && req.url === '/sessions') {
      counts.post += 1;
      if (auth !== `Bearer ${TEST_KEY}`) return json(401, { message: 'invalid api key' });
      let body = '';
      req.on('data', (c) => {
        body += c;
      });
      req.on('end', () => {
        let p = {};
        try {
          p = JSON.parse(body);
        } catch (e) {
          return json(400, { message: 'bad json' });
        }
        if (!p.phone || !p.text) return json(400, { message: 'phone/text required' });
        const id = `mock-${counts.post}`;
        const expiresAt = new Date(Date.now() + verifyMn.TTL_SECONDS * 1000).toISOString();
        sessions.set(id, { phone: p.phone, text: p.text, polls: 0, expiresAt });
        return json(200, {
          sessionId: id,
          phone: p.phone,
          shortcode: verifyMn.SHORTCODE,
          text: p.text,
          smsUri: `sms:${verifyMn.SHORTCODE}?body=${p.text}`,
          displayInstruction: `Та өөрийн ${p.phone} дугаараас ${verifyMn.SHORTCODE} дугаарт "${p.text}" гэж SMS илгээнэ үү.`,
          expiresAt,
        });
      });
      return undefined;
    }

    const m = req.url.match(/^\/sessions\/([^?]+)$/);
    if (req.method === 'GET' && m) {
      counts.get += 1;
      const s = sessions.get(decodeURIComponent(m[1]));
      if (!s) return json(404, { message: 'SESSION олдсонгүй.' });
      s.polls += 1;
      let status = 'PENDING';
      if (mode === 'expired') status = 'EXPIRED';
      else if (mode === 'pending') status = 'PENDING';
      else status = s.polls >= 2 ? 'VERIFIED' : 'PENDING'; // 1-р poll PENDING, 2-т VERIFIED
      return json(200, {
        sessionId: m[1],
        sessionStatus: status,
        callbackStatus: 'SENT',
        verifiedAt: status === 'VERIFIED' ? new Date().toISOString() : null,
        expiresAt: s.expiresAt,
      });
    }
    return json(404, { message: 'not found' });
  });
}

// ---------------- Тест runner ----------------
let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed += 1;
  } catch (e) {
    console.log(`❌ ${name}\n     ${(e && e.message) || e}`);
    failed += 1;
  }
}

async function main() {
  const server = createMock();
  await new Promise((r) => server.listen(MOCK_PORT, '127.0.0.1', r));
  console.log(`🔎 verifyPhone() тест (mock verify.mn: ${MOCK_URL})\n`);

  await test('1. PENDING → VERIFIED → true, session мэдээлэл бүрэн', async () => {
    mode = 'verify';
    sessions = new Map();
    counts = { post: 0, get: 0 };
    let captured = null;
    const ok = await verifyMn.verifyPhone('99112233', {
      intervalMs: 40,
      timeoutMs: 4000,
      onSession: (s) => {
        captured = s;
      },
    });
    assert.strictEqual(ok, true, 'true буцаах ёстой');
    assert.ok(captured, 'onSession дуудагдах ёстой');
    assert.match(captured.text, /^\d{6}$/, `text 6 оронтой тоо байх ёстой (${captured.text})`);
    assert.strictEqual(captured.shortcode, verifyMn.SHORTCODE, 'shortcode = 144773');
    assert.ok(captured.smsUri.startsWith(`sms:${verifyMn.SHORTCODE}?body=`), `smsUri: ${captured.smsUri}`);
    assert.ok(captured.displayInstruction.includes(captured.text), 'displayInstruction нь кодыг агуулна');
    assert.ok(new Date(captured.expiresAt).getTime() > Date.now(), 'expiresAt ирээдүйд байх ёстой');
    assert.strictEqual(counts.post, 1, 'зөвхөн 1 session үүсэх ёстой');
  });

  await test('2. VERIFIED болмогц polling ШУУД зогсоно (нэмэлт хүсэлт явахгүй)', async () => {
    const before = counts.get;
    await new Promise((r) => setTimeout(r, 300));
    assert.strictEqual(counts.get, before, `VERIFIED-ийн дараа ${counts.get - before} нэмэлт хүсэлт явсан`);
  });

  await test('3. EXPIRED → false (graceful, шидэхгүй)', async () => {
    mode = 'expired';
    const ok = await verifyMn.verifyPhone('99112234', { intervalMs: 40, timeoutMs: 2000 });
    assert.strictEqual(ok, false, 'false буцаах ёстой');
  });

  await test('4. timeout (хэзээ ч VERIFIED болохгүй) → false', async () => {
    mode = 'pending';
    const t0 = Date.now();
    const ok = await verifyMn.verifyPhone('99112235', { intervalMs: 40, timeoutMs: 400 });
    assert.strictEqual(ok, false, 'false буцаах ёстой');
    assert.ok(Date.now() - t0 >= 350, 'timeout хүртэл хүлээх ёстой');
  });

  await test('5. 401 (буруу API key) → Error ШИДНЭ (false биш)', async () => {
    process.env.VERIFY_MN_API_KEY = 'wrong-key';
    let err = null;
    try {
      await verifyMn.verifyPhone('99112236', { intervalMs: 40, timeoutMs: 800 });
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'Error шидэх ёстой');
    assert.strictEqual(err.code, 'VERIFY_MN_UNAUTHORIZED', `code=${err.code}`);
    process.env.VERIFY_MN_API_KEY = TEST_KEY;
  });

  await test('6. VERIFY_MN_API_KEY дутуу → Error ШИДНЭ', async () => {
    process.env.VERIFY_MN_API_KEY = 'tanii_verify_mn_api_key'; // placeholder = тохируулаагүй гэж үзнэ
    let err = null;
    try {
      await verifyMn.verifyPhone('99112237');
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'Error шидэх ёстой');
    assert.strictEqual(err.code, 'VERIFY_MN_KEY_MISSING', `code=${err.code}`);
    process.env.VERIFY_MN_API_KEY = TEST_KEY;
  });

  await test('7. Буруу утасны дугаар → Error ШИДНЭ', async () => {
    let err = null;
    try {
      await verifyMn.verifyPhone('1234');
    } catch (e) {
      err = e;
    }
    assert.ok(err, 'Error шидэх ёстой');
    assert.strictEqual(err.code, 'INVALID_PHONE', `code=${err.code}`);
  });

  await test('8. +976 / 976 / зураастай хэлбэрийг зөв хөрвүүлнэ', async () => {
    mode = 'verify';
    sessions = new Map();
    let captured = null;
    const ok = await verifyMn.verifyPhone('+976 9911-2233', {
      intervalMs: 40,
      timeoutMs: 4000,
      onSession: (s) => {
        captured = s;
      },
    });
    assert.strictEqual(ok, true);
    assert.strictEqual(captured.phone, '99112233', `phone=${captured.phone}`);
  });

  server.close();
  console.log(`\n${failed === 0 ? '🎉 Бүх тест амжилттай' : `⚠️  ${failed} тест амжилтгүй`} (${passed}/${passed + failed})`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('❌ Тестийн алдаа:', (err && err.message) || err);
  process.exit(1);
});

