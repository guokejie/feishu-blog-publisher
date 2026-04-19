const {
  sendJson,
  parseFeishuText,
  parsePostText,
  buildMarkdown,
  makeDraftPath,
  buildConfirmCard,
  feishuSendText,
  feishuSendCard,
  ghPutFile
} = require("../../lib/common");

module.exports = async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.statusCode = 405;
      return res.end("Method Not Allowed");
    }

    let body = req.body || {};

    if (typeof body === "string") {
      body = JSON.parse(body || "{}");
    }

    // 飞书配置请求地址时会先发这个 challenge
    if (body.type === "url_verification") {
      res.statusCode = 200;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      return res.end(JSON.stringify({ challenge: body.challenge }));
    }

    // 先保证任何其他请求都快速返回 200
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.end(JSON.stringify({ ok: true }));
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    return res.end("error");
  }
};