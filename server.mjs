#!/usr/bin/env node
/**
 * CricIQ — local development server
 *
 * Serves the static frontend (index.html, /js, /css) AND the serverless API
 * functions from /api so the same-origin calls the frontend makes
 * (POST /api/ai, POST /api/live-match) work without Vercel.
 *
 * Usage:   npm run dev                      → http://localhost:4173
 * Env:     CRICAPI_API_KEY=... npm run dev  → live match data via CricAPI
 *          GEMINI_API_KEY=...  npm run dev  → AI actions work locally too
 *
 * Vercel note: this file is only for local development. On Vercel the api/
 * directory is deployed as serverless functions and this file is ignored.
 */

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import aiHandler from './api/ai.mjs';
import liveMatchHandler from './api/live-match.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = __dirname;

const PORT = Number(process.env.PORT) || 4173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8',
  '.pdf': 'application/pdf'
};

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

// Wrap the Vercel-style (req, res) handlers so they receive a parsed body.
async function callApi(handler, req, res) {
  const body = await readJsonBody(req);
  req.body = body;
  try {
    await handler(req, res);
  } catch (err) {
    console.error('[server] api error:', err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
  }
}

const server = http.createServer(async (req, res) => {
  // The api/*.mjs handlers use the Vercel serverless style (res.status().json(),
  // req.method). We get raw Node primitives here, so wrap them once at the edge
  // and pass through res untouched otherwise.
  res.status = (code) => {
    res.statusCode = code;
    return {
      json: (obj) => {
        if (res.headersSent) return;
        res.writeHead(res.statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(obj));
      }
    };
  };
  const url = new URL(req.url, `http://${req.headers.host}`);

  // ---- API routes ----
  if (url.pathname === '/api/ai') {
    return callApi(aiHandler, req, res);
  }
  if (url.pathname === '/api/live-match') {
    return callApi(liveMatchHandler, req, res);
  }

  // ---- Static files ----
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';

  // Path traversal guard.
  const filePath = normalize(join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    sendJson(res, 403, { error: 'Forbidden' });
    return;
  }

  try {
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 — not found');
  }
});

server.listen(PORT, () => {
  const cricapi = process.env.CRICAPI_API_KEY ? 'CricAPI key detected → live matches enabled' : 'no CRICAPI_API_KEY → demo mode only';
  console.log(`CricIQ dev server → http://localhost:${PORT} (${cricapi})`);
});
