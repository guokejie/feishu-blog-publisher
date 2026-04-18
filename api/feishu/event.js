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
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    // 飞书回调地址校验
    if (body.type === "url_verification") {
      return sendJson(res, 200, { challenge: body.challenge });
    }

    // 可选：校验 verification token
    if (
        process.env.FEISHU_VERIFICATION_TOKEN &&
        body.token &&
        body.token !== process.env.FEISHU_VERIFICATION_TOKEN
    ) {
      return sendJson(res, 401, { ok: false, message: "Invalid token" });
    }

    const eventType = body.header?.event_type;
    if (eventType !== "im.message.receive_v1") {
      return sendJson(res, 200, { ok: true, ignored: true });
    }

    const event = body.event || {};
    const message = event.message || {};
    const senderOpenId = event.sender?.sender_id?.open_id || "";

    if (
        process.env.FEISHU_ALLOWED_OPEN_ID &&
        senderOpenId !== process.env.FEISHU_ALLOWED_OPEN_ID
    ) {
      return sendJson(res, 200, { ok: true, ignored: true });
    }

    const chatId = message.chat_id;
    if (message.message_type !== "text") {
      await feishuSendText(
          chatId,
          "只支持文本消息。\n格式：第一行写标题（可带 /post），从第二行开始写正文。"
      );
      return sendJson(res, 200, { ok: true });
    }

    const text = parseFeishuText(message.content);
    const parsed = parsePostText(text);

    if (!parsed) {
      await feishuSendText(
          chatId,
          "格式不对。\n请这样发：\n/post 我的标题\n这里开始写正文"
      );
      return sendJson(res, 200, { ok: true });
    }

    const draftPath = makeDraftPath();
    const markdown = buildMarkdown(parsed.title, parsed.body);

    await ghPutFile({
      path: draftPath,
      branch: process.env.GITHUB_DRAFT_BRANCH || "feishu-drafts",
      content: markdown,
      message: `feat(draft): create Feishu draft ${draftPath}`
    });

    const card = buildConfirmCard({
      title: parsed.title,
      excerpt: parsed.body,
      draftPath
    });

    await feishuSendCard(chatId, card);

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { ok: false, error: error.message });
  }
};