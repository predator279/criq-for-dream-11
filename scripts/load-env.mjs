/**
 * CricIQ — local key loader
 *
 * Reads secrets from gitignored files into process.env before the dev server
 * starts handling requests. No dependency, no .env package.
 *
 * Lookup order (first file wins for a given key; real environment variables
 * always win over every file):
 *   1. .env.local     — the recommended file
 *   2. secrets.toml   — optional, flat `KEY = "value"` pairs only
 *   3. .env           — fallback
 *
 * On Vercel none of these files exist: the platform injects the same variable
 * names into process.env, so nothing changes in production.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('..', import.meta.url));

const CANDIDATES = ['.env.local', 'secrets.toml', '.env'];

function stripQuotes(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

/** KEY=value, optional `export`, ignored comments. */
function parseDotEnv(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const normalised = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = normalised.indexOf('=');
    if (eq === -1) continue;
    const key = normalised.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    out[key] = stripQuotes(normalised.slice(eq + 1));
  }
  return out;
}

/**
 * Deliberately small TOML subset: flat `KEY = "value"` pairs. Section headers
 * are skipped, so `[gemini]` followed by `GEMINI_API_KEY = "..."` still works.
 * Nested tables/arrays are out of scope — use .env.local for anything exotic.
 */
function parseFlatToml(text) {
  const out = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('[')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    out[key] = stripQuotes(line.slice(eq + 1).split('#')[0]);
  }
  return out;
}

/**
 * Load every existing candidate file. Existing process.env values are never
 * overwritten, so `GEMINI_API_KEY=... npm run dev` still takes precedence.
 *
 * @returns {{file: string, keys: string[]}[]} what was read (names only, never values)
 */
export function loadEnv({ root = PROJECT_ROOT, files = CANDIDATES } = {}) {
  const loaded = [];

  for (const file of files) {
    const path = join(root, file);
    if (!existsSync(path)) continue;

    let pairs = {};
    try {
      const text = readFileSync(path, 'utf8');
      pairs = file.endsWith('.toml') ? parseFlatToml(text) : parseDotEnv(text);
    } catch (err) {
      console.warn(`[env] could not read ${file}: ${err.message}`);
      continue;
    }

    const keys = [];
    for (const [key, value] of Object.entries(pairs)) {
      if (process.env[key] === undefined && value !== '') {
        process.env[key] = value;
        keys.push(key);
      }
    }

    // Recorded even when empty, so the dev server can tell "file missing" apart
    // from "file present but no keys pasted yet".
    loaded.push({ file, keys });
  }

  return loaded;
}

// Importing this module is what loads the file, matching how server.mjs uses it.
export const loadedEnvFiles = loadEnv();
