const { jsonResponse } = require("./netease");

exports.handler = async () =>
  jsonResponse({
    ok: true,
    app: "xiaofeng-ai-assistant",
    target: "小锋超级助手.html",
    version: "xiaofeng-netlify-music-v1",
  });
