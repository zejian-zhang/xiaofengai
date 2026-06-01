const { errorResponse, jsonResponse, searchBestNeteaseSong } = require("./netease");

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const song = String(params.song || "").trim();
  const artist = String(params.artist || "").trim();

  if (!song) {
    return errorResponse("Missing song parameter", 400);
  }

  try {
    const result = await searchBestNeteaseSong(song, artist);
    if (!result) {
      return jsonResponse({ code: 404, error: "No playable song found" }, 404);
    }
    return jsonResponse({ code: 200, song: result });
  } catch (error) {
    return errorResponse(error.message || String(error), 500);
  }
};
