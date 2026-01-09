const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT) || 8080;
const ROOT_DIR = path.resolve(__dirname);
const PUBLIC_COCKPITS_DIR = path.join(ROOT_DIR, "public_cockpits");

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8"
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const isInsideRoot = filePath => {
  const rel = path.relative(ROOT_DIR, filePath);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
};

const getCockpitEntries = async () => {
  const entries = await fs.promises.readdir(PUBLIC_COCKPITS_DIR, { withFileTypes: true });
  return entries.map(entry => ({
    label: entry.name,
    value: `/public_cockpits/${entry.name}${entry.isDirectory() ? "/" : ""}`,
    type: entry.isDirectory() ? "directory" : "file"
  }));
};

const serveStatic = (req, res, pathname) => {
  let rawPath = pathname === "/" ? "/public_content/index.html" : pathname;
  if (/^\/(css|js|images)\//.test(rawPath)) {
    rawPath = `/public_content${rawPath}`;
  }
  const decoded = decodeURIComponent(rawPath).replace(/^\/+/, "");
  const filePath = path.join(ROOT_DIR, decoded);

  if (!isInsideRoot(filePath)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    if (stat.isDirectory()) {
      const indexPath = path.join(filePath, "index.html");
      fs.stat(indexPath, (indexErr) => {
        if (indexErr) {
          sendJson(res, 403, { error: "Directory listing disabled" });
          return;
        }
        serveStatic(req, res, path.join(decoded, "index.html"));
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = contentTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    fs.createReadStream(filePath).pipe(res);
  });
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (url.pathname === "/api/cockpits") {
    try {
      const items = await getCockpitEntries();
      sendJson(res, 200, { items });
    } catch (error) {
      sendJson(res, 500, { error: "Failed to read cockpit list" });
    }
    return;
  }

  serveStatic(req, res, url.pathname);
});

server.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});
