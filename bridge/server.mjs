import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const PORT = Number(process.env.JATCAM_BRIDGE_PORT || 8765);
const ALLOWED_ORIGINS = new Set([
  "https://jeffthomasiii.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
]);

const oneDriveRoot =
  process.env.JATCAM_ONEDRIVE_ROOT ||
  process.env.OneDriveConsumer ||
  process.env.OneDrive ||
  process.env.OneDriveCommercial ||
  "";

if (!oneDriveRoot) {
  console.error(
    "JATcam Bridge could not locate OneDrive. Set JATCAM_ONEDRIVE_ROOT to your local OneDrive folder."
  );
  process.exit(1);
}

const libraryRoot = path.resolve(
  process.env.JATCAM_LIBRARY_DIR || path.join(oneDriveRoot, "Apps", "JATcam")
);
const originalsRoot = path.join(libraryRoot, "Originals");
const editedRoot = path.join(libraryRoot, "Edited");
const exportsRoot = path.join(libraryRoot, "Exports");
const metadataRoot = path.join(libraryRoot, ".jatcam");

for (const dir of [libraryRoot, originalsRoot, editedRoot, exportsRoot, metadataRoot]) {
  fs.mkdirSync(dir, { recursive: true });
}

const DISPLAYABLE = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);
const SUPPORTED = new Set([
  ...DISPLAYABLE,
  ".cr2",
  ".cr3",
  ".dng",
  ".heic",
  ".heif"
]);

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
}

function safeRelative(input = "") {
  const decoded = decodeURIComponent(input).replaceAll("\\", "/");
  const normalized = path.posix.normalize(decoded).replace(/^\.\.\/(?:\.\.\/?)*/, "");
  if (
    !normalized ||
    normalized === "." ||
    normalized.startsWith("/") ||
    normalized.includes("../")
  ) {
    throw new Error("Invalid path");
  }
  return normalized;
}

function resolveWithin(root, relative) {
  const full = path.resolve(root, relative);
  const prefix = root.endsWith(path.sep) ? root : root + path.sep;
  if (full !== root && !full.startsWith(prefix)) throw new Error("Path escaped library root");
  return full;
}

function contentType(file) {
  switch (path.extname(file).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".heic":
    case ".heif":
      return "image/heic";
    default:
      return "application/octet-stream";
  }
}

function uniqueDestination(directory, filename) {
  const parsed = path.parse(filename);
  let candidate = path.join(directory, filename);
  let i = 1;
  while (fs.existsSync(candidate)) {
    candidate = path.join(directory, `${parsed.name} (${i})${parsed.ext}`);
    i += 1;
  }
  return candidate;
}

async function walk(directory, relativeBase = "") {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const out = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const relative = path.posix.join(relativeBase, entry.name);
    const full = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      out.push(...(await walk(full, relative)));
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (!SUPPORTED.has(ext)) continue;

    const stat = await fs.promises.stat(full);
    out.push({
      relative,
      full,
      name: entry.name,
      ext,
      size: stat.size,
      modified: stat.mtime.toISOString()
    });
  }

  return out;
}

function findPreview(item, items) {
  if (DISPLAYABLE.has(item.ext)) return item.relative;
  const base = path.posix.join(
    path.posix.dirname(item.relative),
    path.posix.basename(item.relative, item.ext)
  ).toLowerCase();

  const sibling = items.find(candidate => {
    if (!DISPLAYABLE.has(candidate.ext)) return false;
    const candidateBase = path.posix.join(
      path.posix.dirname(candidate.relative),
      path.posix.basename(candidate.relative, candidate.ext)
    ).toLowerCase();
    return candidateBase === base;
  });

  return sibling?.relative || null;
}

async function listPhotos() {
  const items = await walk(originalsRoot);
  return items
    .map(item => ({
      id: Buffer.from(item.relative).toString("base64url"),
      name: item.name,
      path: item.relative,
      size: item.size,
      modified: item.modified,
      type: item.ext.replace(".", "").toUpperCase(),
      previewPath: findPreview(item, items)
    }))
    .sort((a, b) => b.modified.localeCompare(a.modified));
}

async function handleFile(req, res, url) {
  const relative = safeRelative(url.searchParams.get("path") || "");
  const full = resolveWithin(originalsRoot, relative);
  const stat = await fs.promises.stat(full);
  if (!stat.isFile()) throw new Error("Not a file");

  res.writeHead(200, {
    "Content-Type": contentType(full),
    "Content-Length": stat.size,
    "Cache-Control": "private, max-age=300"
  });

  await pipeline(fs.createReadStream(full), res);
}

async function handleUpload(req, res, url) {
  const rawName = url.searchParams.get("filename") || "";
  const filename = path.basename(decodeURIComponent(rawName));

  if (!filename || filename === "." || filename === "..") {
    return json(res, 400, { error: "A valid filename is required." });
  }

  const ext = path.extname(filename).toLowerCase();
  if (!SUPPORTED.has(ext)) {
    return json(res, 415, { error: `Unsupported file type: ${ext || "unknown"}` });
  }

  const destination = uniqueDestination(originalsRoot, filename);
  const temp = destination + ".uploading";

  try {
    await pipeline(req, fs.createWriteStream(temp, { flags: "wx" }));
    await fs.promises.rename(temp, destination);
  } catch (error) {
    await fs.promises.rm(temp, { force: true }).catch(() => {});
    throw error;
  }

  const stat = await fs.promises.stat(destination);
  return json(res, 201, {
    ok: true,
    name: path.basename(destination),
    size: stat.size,
    path: path.relative(originalsRoot, destination).split(path.sep).join("/")
  });
}

async function handleDelete(res, url) {
  const relative = safeRelative(url.searchParams.get("path") || "");
  const full = resolveWithin(originalsRoot, relative);
  await fs.promises.rm(full);
  return json(res, 200, { ok: true, deleted: relative });
}

const server = http.createServer(async (req, res) => {
  cors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      return json(res, 200, {
        ok: true,
        name: "JATcam Bridge",
        version: "0.1.0",
        storage: "Local OneDrive sync folder",
        libraryRoot,
        originalsRoot
      });
    }

    if (req.method === "GET" && url.pathname === "/api/photos") {
      return json(res, 200, { value: await listPhotos() });
    }

    if (req.method === "GET" && url.pathname === "/api/file") {
      return await handleFile(req, res, url);
    }

    if (req.method === "POST" && url.pathname === "/api/photos") {
      return await handleUpload(req, res, url);
    }

    if (req.method === "DELETE" && url.pathname === "/api/photos") {
      return await handleDelete(res, url);
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return json(res, 500, { error: error.message || "Bridge error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log("");
  console.log("JATcam Bridge is running.");
  console.log(`Local endpoint: http://${HOST}:${PORT}`);
  console.log(`Library: ${libraryRoot}`);
  console.log("");
  console.log("For private phone access, expose this local port with Tailscale Serve:");
  console.log(`  tailscale serve --bg ${PORT}`);
  console.log("");
});
