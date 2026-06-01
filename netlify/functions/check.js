const { errorResponse, getNeteasePlayerUrl, jsonResponse } = require("./netease");

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const id = String(params.id || "").trim();

  if (!id) {
    return errorResponse("Missing id parameter", 400);
  }

  try {
    const { data } = await getNeteasePlayerUrl(id);
    return jsonResponse(data);
  } catch (error) {
    return errorResponse(error.message || String(error), 500);
  }
};
