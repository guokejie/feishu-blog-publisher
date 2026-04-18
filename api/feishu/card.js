const {
  sendJson,
  makePostPathFromDraft,
  githubBlobUrl,
  feishuSendText,
  ghGetRawFile,
  ghPutFile
} = require("../../lib/common");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { ok: false, message: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    if (body.type === "url_verification") {
      return sendJson(res, 200, { challenge: body.challenge });
    }

    if (
        process.env.FEISHU_VERIFICATION_TOKEN &&
        body.token &&
        body.token !== process.env.FEISHU_VERIFICATION_TOKEN
    ) {
      return sendJson(res, 401, { ok: false, message: "Invalid token" });
    }

    const action = body.action?.value || {};
    const chatId = body.open_chat_id || body.chat_id;

    if (!action.action || !chatId) {
      return sendJson(res, 200, { ok: true, ignored: true });
    }

    if (action.action === "cancel") {
      await feishuSendText(chatId, "已取消，本次不会发布。");
      return sendJson(res, 200, {});
    }

    if (action.action === "publish") {
      const draftBranch = process.env.GITHUB_DRAFT_BRANCH || "feishu-drafts";
      const mainBranch = process.env.GITHUB_MAIN_BRANCH || "main";
      const draftPath = action.draftPath;
      const postPath = makePostPathFromDraft(draftPath);

      const rawMarkdown = await ghGetRawFile({
        path: draftPath,
        branch: draftBranch
      });

      await ghPutFile({
        path: postPath,
        branch: mainBranch,
        content: rawMarkdown,
        message: `feat(post): publish from Feishu ${postPath}`
      });

      const githubUrl = githubBlobUrl(mainBranch, postPath);

      await feishuSendText(
          chatId,
          `已发布到 GitHub 主分支：\n${githubUrl}\n\n如果你的 GitHub Actions 已配置为 push main 自动部署，现在就会开始部署。`
      );

      return sendJson(res, 200, {});
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { ok: false, error: error.message });
  }
};