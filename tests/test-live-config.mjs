/**
 * Tests for the CricAPI configuration path in api/live-match.mjs.
 *
 * The deployed-site problem this covers: "the banner says the key is missing"
 * has three different causes (never added, added empty, added to the wrong
 * environment) and they are indistinguishable to the user. The GET probe makes
 * them distinguishable without ever returning the value.
 *
 * Run: node tests/test-live-config.mjs
 */
import assert from 'node:assert';
import handler from '../api/live-match.mjs';

function stubRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; }
  };
  return res;
}

async function call(method, body = {}) {
  const res = stubRes();
  await handler({ method, body }, res);
  return { status: res.statusCode, body: res.body, raw: JSON.stringify(res.body) };
}

const saved = process.env.CRICAPI_API_KEY;
const restore = () => {
  if (saved === undefined) delete process.env.CRICAPI_API_KEY;
  else process.env.CRICAPI_API_KEY = saved;
};

try {
  // 1. Not configured at all
  {
    delete process.env.CRICAPI_API_KEY;
    const { status, body } = await call('GET');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.provider, 'cricapi');
    assert.strictEqual(body.present, false, 'present should be false when the variable is undefined');
    assert.strictEqual(body.configured, false);
    console.log('✅ probe: variable missing → present=false, configured=false');
  }

  // 2. Added but empty — the classic Vercel mistake
  {
    process.env.CRICAPI_API_KEY = '';
    const { body } = await call('GET');
    assert.strictEqual(body.present, true, 'an empty variable is still present');
    assert.strictEqual(body.configured, false, 'an empty variable must not count as configured');
    console.log('✅ probe: variable present but empty → present=true, configured=false');
  }

  // 3. Whitespace only (trailing newline pasted from a dashboard)
  {
    process.env.CRICAPI_API_KEY = '   \n';
    const { body } = await call('GET');
    assert.strictEqual(body.present, true);
    assert.strictEqual(body.configured, false, 'whitespace should be trimmed before judging');
    console.log('✅ probe: whitespace-only value → configured=false');
  }

  // 4. Configured — and the value is never echoed back
  {
    const dummy = 'dummy-cricapi-value-for-tests';
    process.env.CRICAPI_API_KEY = dummy;
    const { body, raw } = await call('GET');
    assert.strictEqual(body.present, true);
    assert.strictEqual(body.configured, true);
    assert.ok(!raw.includes(dummy), 'the probe leaked the key value');
    assert.ok(!('key' in body) && !('apiKey' in body), 'probe should not return the key under any name');
    console.log('✅ probe: configured=true, value never returned');
  }

  // 5. Without a key, the real endpoints fail soft with an actionable reason
  {
    delete process.env.CRICAPI_API_KEY;
    const { status, body } = await call('POST', { action: 'getMatches' });
    assert.strictEqual(status, 200, 'missing key must not be a 5xx');
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.reason, 'CRICAPI_API_KEY not set on the server');
    assert.deepStrictEqual(body.matches, []);
    console.log('✅ missing key → ok:false with the "not set" reason the banner looks for');
  }

  // 6. getScore without a key also fails soft
  {
    delete process.env.CRICAPI_API_KEY;
    const { status, body } = await call('POST', { action: 'getScore', matchId: 'abc' });
    assert.strictEqual(status, 200);
    assert.strictEqual(body.ok, false);
    assert.match(body.reason, /not set/);
    console.log('✅ getScore without a key fails soft');
  }
} finally {
  restore();
}

console.log('\n✅ all live-config tests passed');
