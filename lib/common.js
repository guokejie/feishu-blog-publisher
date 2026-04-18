const GH_API = "https://api.github.com";
const FEISHU_API = "https://open.feishu.cn/open-apis";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function escapeYaml(str) {
  return String(str || "").replace(/"/g, '\\"');
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function buildMarkdown(title, body) {
  const now = new Date().toISOString();
  return `---
title: "${escapeYaml(title)}"
date: "${now}"
source: "feishu"
---

${body.trim()}
`;
}

function parseFeishuText(content) {
  try {
    const obj = typeof content === "string" ? JSON.parse(content) : content;
    return obj?.text || "";
  } catch {
    return typeof content === "string" ? content : "";
  }
}

function parsePostText(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const lines = raw.split("\n");
  if (lines.length < 2) return null;

  let title = lines[0].trim();
  title = title.replace(/^\/post\s*/, "").trim();

  const body = lines.slice(1).join("\n").trim();
  if (!title || !body) return null;

  return { title, body };
}

function makeDraftPath() {
  return `drafts/${nowStamp()}.md`;
}

function makePostPathFromDraft(draftPath) {
  const fileName = draftPath.split("/").pop();
  const postsDir = (process.env.BLOG_POSTS_DIR || "content/posts").replace(/^\/+|\/+$/g, "");
  return `${postsDir}/${fileName}`;
}

function githubBlobUrl(branch, path) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  return `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
}

async function getTenantAccessToken() {
  const resp = await fetch(`${FEISHU_API}/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      app_id: process.env.FEISHU_APP_ID,
      app_secret: process.env.FEISHU_APP_SECRET
    })
  });

  const data = await resp.json();
  if (!resp.ok || data.code !== 0) {
    throw new Error(`Get tenant_access_token failed: ${JSON.stringify(data)}`);
  }

  return data.tenant_access_token;
}

async function feishuSendText(chatId, text) {
  const token = await getTenantAccessToken();

  const resp = await fetch(`${FEISHU_API}/im/v1/messages?receive_id_type=chat_id`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      receive_id: chatId,
      msg_type: "text",
      content: JSON.stringify({ text })
    })
  });

  const data = await resp.json();
  if (!resp.ok || data.code !== 0) {
    throw new Error(`Send text message failed: ${JSON.stringify(data)}`);
  }

  return data;
}

async function feishuSendCard(chatId, card) {
  const token = await getTenantAccessToken();

  const resp = await fetch(`${FEISHU_API}/im/v1/messages?receive_id_type=chat_id`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      receive_id: chatId,
      msg_type: "interactive",
      card
    })
  });

  const data = await resp.json();
  if (!resp.ok || data.code !== 0) {
    throw new Error(`Send card failed: ${JSON.stringify(data)}`);
  }

  return data;
}

async function ghPutFile({ path, branch, content, message }) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  const resp = await fetch(`${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch
    })
  });

  const data = await resp.json();
  if (!resp.ok) {
    throw new Error(`GitHub put file failed: ${JSON.stringify(data)}`);
  }

  return data;
}

async function ghGetRawFile({ path, branch }) {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;

  const resp = await fetch(
      `${GH_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/vnd.github.raw+json",
          "X-GitHub-Api-Version": "2022-11-28"
        }
      }
  );

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`GitHub get raw file failed: ${text}`);
  }

  return await resp.text();
}

function buildConfirmCard({ title, excerpt, draftPath }) {
  return {
    config: {
      wide_screen_mode: true
    },
    header: {
      template: "blue",
      title: {
        tag: "plain_text",
        content: "确认发布这篇随笔？"
      }
    },
    elements: [
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**标题：** ${title}\n\n**预览：** ${excerpt.slice(0, 140)}`
        }
      },
      {
        tag: "div",
        text: {
          tag: "lark_md",
          content: `**草稿路径：** \`${draftPath}\``
        }
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: {
              tag: "plain_text",
              content: "发布"
            },
            type: "primary",
            value: {
              action: "publish",
              draftPath,
              title
            }
          },
          {
            tag: "button",
            text: {
              tag: "plain_text",
              content: "取消"
            },
            type: "default",
            value: {
              action: "cancel",
              draftPath,
              title
            }
          }
        ]
      }
    ]
  };
}

module.exports = {
  sendJson,
  parseFeishuText,
  parsePostText,
  buildMarkdown,
  makeDraftPath,
  makePostPathFromDraft,
  githubBlobUrl,
  feishuSendText,
  feishuSendCard,
  ghPutFile,
  ghGetRawFile,
  buildConfirmCard
};