const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const cardHandler = require("./api/feishu/card");
const eventHandler = require("./api/feishu/event");

const port = Number(process.env.PORT || 3000);
const distDir = path.join(__dirname, "dist");

const routes = new Map([
  ["POST /api/feishu/card", cardHandler],
  ["POST /api/feishu/event", eventHandler]
]);

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on("data", chunk => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");

      if (!text) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(text));
      } catch {
        resolve(text);
      }
    });
  });
}

function contentTypeFor(filePath) {
  switch (path.extname(filePath)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.normalize(path.join(distDir, requestedPath));

  if (!filePath.startsWith(distDir + path.sep)) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.statusCode = 404;
      res.end("Not Found");
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", contentTypeFor(filePath));
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const handler = routes.get(`${req.method} ${url.pathname}`);

  if (!handler) {
    serveStatic(req, res);
    return;
  }

  try {
    req.body = await readBody(req);
    await handler(req, res);
  } catch (error) {
    console.error(error);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }

    res.end(JSON.stringify({ ok: false, error: error.message }));
  }
});

server.listen(port, () => {
  console.log(`feishu-blog-publisher listening on ${port}`);
});
