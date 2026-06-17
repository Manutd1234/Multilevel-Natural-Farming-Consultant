import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);

// Load .env file so GEMINI_API_KEY and other vars work without a global export.
const envPath = path.join(root, ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !Object.prototype.hasOwnProperty.call(process.env, key)) process.env[key] = value;
  }
  console.log("  Loaded .env");
}
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jsonl": "application/x-ndjson; charset=utf-8",
  ".svg": "image/svg+xml"
};

function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const requested = pathname === "/" ? "index.html" : pathname;
  const safePath = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  });
}

async function serveApi(req, res) {
  const url = new URL(req.url, `http://localhost:${port}`);
  const route = url.pathname.replace(/^\/api\//, "").replace(/[^a-z-]/gi, "");
  const filePath = path.join(root, "api", `${route}.js`);
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "API route not found" }));
  }
  for (const cachedPath of Object.keys(require.cache)) {
    if (cachedPath.startsWith(path.join(root, "api")) || cachedPath.startsWith(path.join(root, "lib"))) {
      delete require.cache[cachedPath];
    }
  }
  const handler = require(filePath);
  await handler(req, res);
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    serveApi(req, res).catch((error) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message }));
    });
  } else {
    serveStatic(req, res);
  }
});

server.listen(port, () => {
  console.log(`\nKisaanVaani dev server running at http://localhost:${port}`);
  if (!process.env.GEMINI_API_KEY) {
    console.warn("  WARNING: GEMINI_API_KEY is not set — Gemini AI will not work.");
    console.warn("  Create a .env file with GEMINI_API_KEY=<your-key> and restart.");
  } else {
    console.log("  GEMINI_API_KEY is set — Gemini AI enabled.\n");
  }
});
