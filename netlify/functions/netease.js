const NETEASE_HEADERS = {
  Referer: "https://music.163.com/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

function normalizeMusicText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\s　"'“”‘’()（）[\]【】《》<>?？!！,，.。:：;；·_\-—]/g, "");
}

function scoreSongCandidate(song, requestedTitle, requestedArtist = "") {
  const title = normalizeMusicText(song.name || "");
  const wantedTitle = normalizeMusicText(requestedTitle);
  const artists = Array.isArray(song.artists) ? song.artists.map((artist) => artist.name || "") : [];
  const artistText = normalizeMusicText(artists.join(" "));
  const wantedArtist = normalizeMusicText(requestedArtist);

  let score = 0;
  if (title === wantedTitle) {
    score += 100;
  } else if (wantedTitle && title.includes(wantedTitle)) {
    score += 45;
  } else if (title && wantedTitle.includes(title)) {
    score += 25;
  }

  if (wantedArtist) {
    score += artistText.includes(wantedArtist) ? 80 : -60;
  }

  if (title.includes("伴奏") || title.includes("纯音乐")) {
    score -= 25;
  }
  if (title.includes("cover") || title.includes("翻唱")) {
    score -= 15;
  }
  if (title.includes("live")) {
    score -= 8;
  }

  return score;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: NETEASE_HEADERS });
  if (!response.ok) {
    throw new Error(`Music service returned ${response.status}`);
  }
  return response.json();
}

async function getNeteasePlayerUrl(songId) {
  const id = encodeURIComponent(String(songId || ""));
  const apiUrl = `https://music.163.com/api/song/enhance/player/url?id=${id}&ids=[${id}]&br=320000`;
  const data = await fetchJson(apiUrl);
  const items = data.data || [];
  const info = items[0] || {};
  return {
    mediaUrl: data.code === 200 && info.code === 200 && info.url ? info.url : null,
    data,
  };
}

async function searchBestNeteaseSong(songName, artistName = "") {
  const keyword = `${artistName || ""} ${songName || ""}`.trim();
  const url = `https://music.163.com/api/search/get?s=${encodeURIComponent(keyword)}&type=1&limit=20`;
  const data = await fetchJson(url);
  const songs = (((data || {}).result || {}).songs || []).slice();
  const rankedSongs = songs.sort(
    (left, right) =>
      scoreSongCandidate(right, songName, artistName) -
      scoreSongCandidate(left, songName, artistName),
  );

  for (const song of rankedSongs) {
    const { mediaUrl, data: checkData } = await getNeteasePlayerUrl(song.id);
    const info = ((checkData || {}).data || [])[0] || {};
    if (mediaUrl && info.code === 200) {
      const artists = Array.isArray(song.artists) ? song.artists.map((artist) => artist.name || "") : [];
      return {
        id: song.id,
        name: song.name || "",
        artist: artists[0] || "未知",
        artists,
        score: scoreSongCandidate(song, songName, artistName),
      };
    }
  }

  return null;
}

function jsonResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(data),
  };
}

function errorResponse(message, statusCode = 500) {
  return jsonResponse({ error: message }, statusCode);
}

module.exports = {
  NETEASE_HEADERS,
  normalizeMusicText,
  scoreSongCandidate,
  fetchJson,
  getNeteasePlayerUrl,
  searchBestNeteaseSong,
  jsonResponse,
  errorResponse,
};
