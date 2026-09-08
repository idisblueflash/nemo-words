#!/usr/bin/env node
// PoC CLI for bulk word-frequency lookup against Google Books Ngram
// Viewer's JSON endpoint (the same undocumented endpoint the public
// ngrams.google.com page itself calls -- no official API, no key). Takes
// hundreds of words at once, chunks them into requests the endpoint
// handles reliably, and prints one row per word.
//
// Usage:
//   node scripts/word-freq.js word1 word2 word3
//   node scripts/word-freq.js --file words.txt        # one word per line
//   cat words.txt | node scripts/word-freq.js          # stdin
//
// Options:
//   --year-start=YYYY   default 2015
//   --year-end=YYYY     default 2019 (last year in the en-2019 corpus)
//   --corpus=NAME       default en-2019
//   --chunk=N           words per HTTP request, default 400
//
// Output: word<TAB>freq (mean of the timeseries over the year range) or
// word<TAB>(not found) if the corpus has no data for that word.
//
// Probed empirically against the live endpoint: single requests up to
// ~700 comma-joined words return 200 with partial results (words absent
// from the corpus are just missing from the response, not an error).
// No documented rate limit or batch cap -- 400/request is a conservative
// default, not a discovered ceiling.

'use strict';

const https = require('https');
const net = require('net');
const tls = require('tls');
const { URL } = require('url');

function parseArgs(argv) {
  const opts = { yearStart: 2015, yearEnd: 2019, corpus: 'en-2019', chunk: 400, words: [], file: null };
  for (const arg of argv) {
    if (arg.startsWith('--year-start=')) opts.yearStart = Number(arg.slice(13));
    else if (arg.startsWith('--year-end=')) opts.yearEnd = Number(arg.slice(11));
    else if (arg.startsWith('--corpus=')) opts.corpus = arg.slice(9);
    else if (arg.startsWith('--chunk=')) opts.chunk = Number(arg.slice(8));
    else if (arg.startsWith('--file=')) opts.file = arg.slice(7);
    else if (arg === '--file') opts.fileNext = true;
    else if (opts.fileNext) { opts.file = arg; opts.fileNext = false; }
    else opts.words.push(arg);
  }
  return opts;
}

function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) { resolve(''); return; }
    let data = '';
    // No args/--file and stdin isn't a TTY: could be a real pipe, or just an
    // unattached stdin in a non-interactive shell (which never emits 'end').
    // Give it a short grace window rather than blocking forever.
    const timer = setTimeout(() => resolve(data), 200);
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => { data += chunk; clearTimeout(timer); });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
  });
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const PROXY_URL = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;

// Node's https module doesn't honor HTTPS_PROXY/HTTP_PROXY on its own (that's
// curl's behavior, not Node's) -- when one is set, tunnel manually: open a
// plain TCP socket to the proxy, issue CONNECT to upgrade it to a tunnel,
// then layer TLS on top of that raw socket for the real request.
function httpsGetViaProxy(urlStr, headers) {
  return new Promise((resolve, reject) => {
    const target = new URL(urlStr);
    const proxy = new URL(PROXY_URL);
    const socket = net.connect(Number(proxy.port) || 80, proxy.hostname, () => {
      socket.write(`CONNECT ${target.hostname}:443 HTTP/1.1\r\nHost: ${target.hostname}:443\r\n\r\n`);
    });
    socket.once('data', (chunk) => {
      const statusLine = chunk.toString('utf8', 0, chunk.indexOf('\r\n'));
      if (!/^HTTP\/1\.[01] 200/.test(statusLine)) {
        reject(new Error(`Proxy CONNECT failed: ${statusLine}`));
        socket.destroy();
        return;
      }
      const tlsSocket = tls.connect({ socket, servername: target.hostname }, () => {
        const path = target.pathname + target.search;
        const reqHeaders = Object.entries({ Host: target.hostname, Connection: 'close', ...headers })
          .map(([k, v]) => `${k}: ${v}`).join('\r\n');
        tlsSocket.write(`GET ${path} HTTP/1.1\r\n${reqHeaders}\r\n\r\n`);
      });
      // Some local proxies (e.g. Clash-style tunnels) don't propagate the
      // upstream server's `Connection: close` by half-closing their end, so
      // the socket's 'end' event can simply never fire even once the full
      // response has arrived. Track Content-Length ourselves and resolve as
      // soon as the declared body size is in hand, instead of waiting on 'end'.
      let raw = Buffer.alloc(0);
      let headerEnd = -1;
      let contentLength = null;
      const finish = () => {
        const head = raw.slice(0, headerEnd).toString('utf8');
        const body = raw.slice(headerEnd + 4, headerEnd + 4 + contentLength).toString('utf8');
        const status = Number(head.match(/^HTTP\/1\.[01] (\d+)/)[1]);
        tlsSocket.destroy();
        resolve({ status, body });
      };
      tlsSocket.on('data', (d) => {
        raw = Buffer.concat([raw, d]);
        if (headerEnd === -1) {
          headerEnd = raw.indexOf('\r\n\r\n');
          if (headerEnd !== -1) {
            const head = raw.slice(0, headerEnd).toString('utf8');
            const m = head.match(/^content-length:\s*(\d+)/im);
            contentLength = m ? Number(m[1]) : 0;
          }
        }
        if (headerEnd !== -1 && raw.length >= headerEnd + 4 + contentLength) finish();
      });
      tlsSocket.on('end', () => { if (headerEnd !== -1) finish(); else reject(new Error('connection closed before headers')); });
      tlsSocket.on('error', reject);
    });
    socket.on('error', reject);
    socket.setTimeout(60000, () => { socket.destroy(new Error('proxy tunnel timed out')); });
  });
}

function httpsGetDirect(urlStr, headers) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, { headers, timeout: 60000 }, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
      res.on('error', reject);
    }).on('error', reject).on('timeout', function () { this.destroy(new Error('request timed out')); });
  });
}

async function fetchChunk(words, opts) {
  const content = encodeURIComponent(words.join(','));
  const url = `https://books.google.com/ngrams/json?content=${content}&year_start=${opts.yearStart}&year_end=${opts.yearEnd}&corpus=${opts.corpus}&smoothing=0`;
  const headers = { 'User-Agent': 'Mozilla/5.0' };
  const { status, body } = PROXY_URL ? await httpsGetViaProxy(url, headers) : await httpsGetDirect(url, headers);
  if (status !== 200) throw new Error(`HTTP ${status} for chunk of ${words.length} words`);
  return JSON.parse(body);
}

function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  let words = opts.words.slice();
  if (opts.file) {
    const fs = require('fs');
    words.push(...fs.readFileSync(opts.file, 'utf8').split('\n'));
  }
  const stdinText = await readStdin();
  if (stdinText) words.push(...stdinText.split('\n'));

  words = words.map((w) => w.trim().toLowerCase()).filter(Boolean);
  words = [...new Set(words)];

  if (!words.length) {
    console.error('No words given. Pass them as args, --file <path>, or via stdin.');
    process.exit(1);
  }

  console.error(`Looking up ${words.length} words in ${Math.ceil(words.length / opts.chunk)} request(s)...`);

  const results = new Map();
  const batches = chunkArray(words, opts.chunk);
  for (let i = 0; i < batches.length; i++) {
    console.error(`  chunk ${i + 1}/${batches.length} (${batches[i].length} words)...`);
    const data = await fetchChunk(batches[i], opts);
    for (const entry of data) {
      if (entry.type !== 'NGRAM') continue; // skip CASE_INSENSITIVE/EXPANSION rows
      const key = entry.ngram.toLowerCase();
      if (!results.has(key)) results.set(key, []);
      results.get(key).push(...entry.timeseries);
    }
  }

  for (const w of words) {
    const series = results.get(w);
    if (!series || !series.length) {
      console.log(`${w}\t(not found)`);
    } else {
      console.log(`${w}\t${mean(series).toExponential(4)}`);
    }
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
