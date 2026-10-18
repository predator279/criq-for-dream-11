/**
 * Tests for scripts/load-env.mjs. Uses throwaway temp files with dummy values,
 * so no real secret is read, written, or printed.
 *
 * Run: node tests/test-env-loader.mjs
 */
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { loadEnv } = await import('../scripts/load-env.mjs');

const dir = mkdtempSync(join(tmpdir(), 'criciq-env-'));
const keys = ['GEMINI_API_KEY', 'GROQ_API_KEY', 'CRICAPI_API_KEY', 'NOT_IN_ANY_FILE'];

function resetEnv() {
  for (const key of keys) delete process.env[key];
}

try {
  // 1. .env.local is read, quotes stripped, comments ignored
  {
    resetEnv();
    writeFileSync(join(dir, '.env.local'), [
      '# comment line',
      '',
      'GEMINI_API_KEY=dummy-gemini-value',
      'export GROQ_API_KEY="dummy-groq-value"',
      "CRICAPI_API_KEY='dummy-cricapi-value'",
      'NOT A KEY LINE'
    ].join('\n'));

    const loaded = loadEnv({ root: dir, files: ['.env.local'] });
    assert.strictEqual(process.env.GEMINI_API_KEY, 'dummy-gemini-value');
    assert.strictEqual(process.env.GROQ_API_KEY, 'dummy-groq-value');
    assert.strictEqual(process.env.CRICAPI_API_KEY, 'dummy-cricapi-value');
    assert.deepStrictEqual(loaded[0].keys.sort(), ['CRICAPI_API_KEY', 'GEMINI_API_KEY', 'GROQ_API_KEY']);
    assert.ok(!('NOT A KEY LINE' in process.env), 'malformed line should be ignored');
    console.log('✅ .env.local parsed, comments ignored, quotes stripped');
  }

  // 2. secrets.toml flat pairs and section headers
  {
    resetEnv();
    writeFileSync(join(dir, 'secrets.toml'), [
      '# optional TOML file',
      '[ai]',
      'GEMINI_API_KEY = "toml-gemini"',
      'GROQ_API_KEY = ""',
      '[live]',
      'CRICAPI_API_KEY = "toml-live"  # trailing comment'
    ].join('\n'));

    const loaded = loadEnv({ root: dir, files: ['secrets.toml'] });
    assert.strictEqual(process.env.GEMINI_API_KEY, 'toml-gemini');
    assert.strictEqual(process.env.CRICAPI_API_KEY, 'toml-live');
    assert.strictEqual(process.env.GROQ_API_KEY, undefined, 'empty values must not be set');
    assert.deepStrictEqual(loaded[0].keys, ['GEMINI_API_KEY', 'CRICAPI_API_KEY']);
    console.log('✅ secrets.toml flat pairs parsed, empty values skipped');
  }

  // 3. A real environment variable always wins over a file
  {
    resetEnv();
    process.env.GEMINI_API_KEY = 'from-shell';
    writeFileSync(join(dir, '.env.local'), 'GEMINI_API_KEY=from-file\n');

    loadEnv({ root: dir, files: ['.env.local'] });
    assert.strictEqual(process.env.GEMINI_API_KEY, 'from-shell', 'file overrode the real environment');
    console.log('✅ real environment variables take precedence over files');
  }

  // 4. Missing files are a no-op, not a crash
  {
    resetEnv();
    const empty = mkdtempSync(join(tmpdir(), 'criciq-empty-'));
    const loaded = loadEnv({ root: empty, files: ['.env.local', 'secrets.toml'] });
    assert.deepStrictEqual(loaded, []);
    assert.strictEqual(process.env.GEMINI_API_KEY, undefined);
    rmSync(empty, { recursive: true, force: true });
    console.log('✅ missing secret files are skipped silently');
  }

  // 5. Files are discovered in the documented order
  {
    resetEnv();
    writeFileSync(join(dir, '.env.local'), 'GROQ_API_KEY=local-wins\n');
    writeFileSync(join(dir, '.env'), 'GROQ_API_KEY=dotenv-loses\n');
    loadEnv({ root: dir, files: ['.env.local', 'secrets.toml', '.env'] });
    assert.strictEqual(process.env.GROQ_API_KEY, 'local-wins', '.env should not override .env.local');
    console.log('✅ lookup order is .env.local → secrets.toml → .env');
  }

  // 6. The repo ships templates and ignores the real files
  {
    const { readFileSync } = await import('node:fs');
    const root = new URL('..', import.meta.url);
    const gitignore = readFileSync(new URL('.gitignore', root), 'utf8');
    assert.ok(/^\.env\.\*$/m.test(gitignore), '.env.* is not ignored');
    assert.ok(/^secrets\.toml$/m.test(gitignore), 'secrets.toml is not ignored');
    assert.ok(/^!\.env\.example$/m.test(gitignore), '.env.example should stay tracked');

    const example = readFileSync(new URL('.env.example', root), 'utf8');
    for (const key of ['GEMINI_API_KEY', 'GROQ_API_KEY', 'CRICAPI_API_KEY']) {
      assert.ok(example.includes(`${key}=`), `${key} missing from .env.example`);
    }
    assert.ok(!/=\S+/.test(example.replace(/^#.*$/gm, '')), '.env.example must not contain values');
    console.log('✅ templates committed, real secret files ignored');
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
  resetEnv();
}

console.log('\n✅ all env loader tests passed');
