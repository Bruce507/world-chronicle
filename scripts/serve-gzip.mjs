#!/usr/bin/env node
/* Dev server with gzip, approximating GitHub Pages' transfer behaviour.
   Usage: node scripts/serve-gzip.mjs [port] [dir] */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
const port = Number(process.argv[2] || 8002);
const root = path.resolve(process.argv[3] || ".");
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || "/").split("?")[0]);
  let file = path.join(root, url === "/" ? "index.html" : url);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end("not found"); }
    const ext = path.extname(file);
    res.setHeader("Content-Type", types[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Vary", "Accept-Encoding");
    const gz = /\bgzip\b/.test(req.headers["accept-encoding"] || "") && [".html", ".js", ".css", ".json", ".svg"].includes(ext);
    if (!gz) { res.writeHead(200); return fs.createReadStream(file).pipe(res); }
    res.setHeader("Content-Encoding", "gzip");
    res.writeHead(200);
    fs.createReadStream(file).pipe(zlib.createGzip({ level: 9 })).pipe(res);
  });
}).listen(port, () => console.log(`gzip server: http://localhost:${port}`));
