const { errorResponse, getNeteasePlayerUrl } = require("./netease");

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const id = String(params.id || "").trim();

  if (!id) {
    return errorResponse("Missing id parameter", 400);
  }

  try {
    const { mediaUrl } = await getNeteasePlayerUrl(id);
    if (!mediaUrl) {
      return errorResponse("Song is not playable", 404);
    }

    return {
      statusCode: 302,
      headers: {
        Location: mediaUrl,
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
      body: "",
    };
  } catch (error) {
    return errorResponse(error.message || String(error), 500);
  }
};
