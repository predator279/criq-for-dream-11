/**
 * Harness-tested control flow for api/ai.mjs (no network calls, no keys).
 * Run: node tests/test-ai-proxy.mjs
 */
import assert from 'node:assert';
import handler from '../api/ai.mjs';

function stubRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(obj) { this.body = obj; return this; }
  };
  return res;
}

async function run(method, body, env) {
  // Snapshot / restore env
  const savedKey = process.env.GEMINI_API_KEY;
  const savedGroq = process.env.GROQ_API_KEY;
  if (env?.GEMINI_API_KEY !== undefined) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  if (env?.GROQ_API_KEY !== undefined) process.env.GROQ_API_KEY = env.GROQ_API_KEY;
  const req = { method, body };
  const res = stubRes();
  let thrown = null;
  try {
    await handler(req, res);
  } catch (e) {
    thrown = e;
  } finally {
    if (savedKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = savedKey;
    if (savedGroq === undefined) delete process.env.GROQ_API_KEY; else process.env.GROQ_API_KEY = savedGroq;
  }
  assert.ok(thrown === null, `handler threw: ${thrown}`);
  return { status: res.statusCode, body: res.body };
}

// 1. Health check without keys
{
  const { status, body } = await run('GET', undefined, {});
  assert.strictEqual(status, 200);
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.providers.gemini, false);
  assert.strictEqual(body.providers.groq, false);
  console.log('✅ health check without keys');
}

// 2. Health check with keys flagged present
{
  const { status, body } = await run('GET', undefined, { GEMINI_API_KEY: 'x', GROQ_API_KEY: 'y' });
  assert.strictEqual(status, 200);
  assert.strictEqual(body.providers.gemini, true);
  assert.strictEqual(body.providers.groq, true);
  console.log('✅ health check with keys');
}

// 3. POST without prompt → 400
{
  const { status } = await run('POST', {}, {});
  assert.strictEqual(status, 400);
  console.log('✅ POST without prompt rejected with 400');
}

// 4. Unsupported method → 405
{
  const { status } = await run('DELETE', undefined, {});
  assert.strictEqual(status, 405);
  console.log('✅ unsupported method rejected with 405');
}

// 5. POST with prompt but NO keys → Gemini throws status 0 (no key) → falls to Groq → no key → 502
{
  const { status, body } = await run('POST', { prompt: 'hello' }, {});
  assert.strictEqual(status, 502);
  assert.ok(String(body.error).includes('GROQ_API_KEY is missing too'), 'expected Groq-missing error, got: ' + body.error);
  console.log('✅ no keys → falls through Gemini to Groq, then 502 with clear message');
}

console.log('✅ all api/ai.mjs control-flow tests passed');
