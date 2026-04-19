const fs = require("node:fs");
const path = require("node:path");

const distDir = path.join(__dirname, "..", "dist");

fs.mkdirSync(distDir, { recursive: true });

fs.writeFileSync(
  path.join(distDir, "index.html"),
  `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>feishu-blog-publisher</title>
    <style>
      :root {
        color-scheme: light;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f6f2ea;
        color: #1d201f;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
      }

      main {
        width: min(680px, calc(100vw - 48px));
        padding: 40px;
        border: 1px solid #ded4c2;
        border-radius: 24px;
        background: #fffaf1;
        box-shadow: 0 20px 60px rgb(58 42 20 / 12%);
      }

      h1 {
        margin: 0 0 12px;
        font-size: clamp(28px, 6vw, 56px);
        line-height: 1;
      }

      p {
        margin: 0;
        font-size: 18px;
        line-height: 1.7;
      }

      code {
        padding: 2px 6px;
        border-radius: 6px;
        background: #ece2d0;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>feishu-blog-publisher</h1>
      <p>静态托管已部署。飞书回调接口需要单独部署为云函数或托管到支持 <code>api/</code> 路由的 Node.js 平台。</p>
    </main>
  </body>
</html>
`,
  "utf8"
);

console.log(`Built static hosting files into ${distDir}`);
