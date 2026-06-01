const NETEASE_HEADERS = {
  Referer: "https://music.163.com/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

function normalizeMusicText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[\s　"'“”‘’()（）[\]【】《》<>?？!！,，.。:：;；·_\-—]/g, "");
}

function normalizeRequestedArtist(text) {
  return String(text || "")
    .trim()
    .replace(/[，。！？、\s]+$/g, "")
    .replace(/(?:唱的|演唱的|原唱的|唱|演唱|原唱|老师|歌手|的)$/g, "")
    .trim();
}

function parseSongAndArtist(songName, artistName = "") {
  let song = String(songName || "").trim();
  let artist = normalizeRequestedArtist(artistName);
  song = song.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  if (!artist) {
    const bracketMatch = song.match(/^(.+?)(?:唱的|演唱的|原唱的|的)?[《"'](.+?)[》"']$/);
    if (bracketMatch) {
      artist = normalizeRequestedArtist(bracketMatch[1]);
      song = bracketMatch[2].trim();
    } else {
      const deMatch = song.match(/^(.+?)(?:唱的|演唱的|原唱的|的)(.+)$/);
      if (deMatch && deMatch[1].trim().length >= 2 && deMatch[2].trim().length >= 1) {
        artist = normalizeRequestedArtist(deMatch[1]);
        song = deMatch[2].replace(/^["'《]+|["'》]+$/g, "").trim();
      }
    }
  } else {
    artist = normalizeRequestedArtist(artist);
  }

  return { song, artist };
}

function getArtistNames(song) {
  return Array.isArray(song.artists) ? song.artists.map((artist) => artist.name || "") : [];
}

function scoreSongCandidate(song, requestedTitle, requestedArtist = "") {
  const title = normalizeMusicText(song.name || "");
  const wantedTitle = normalizeMusicText(requestedTitle);
  const artists = getArtistNames(song);
  const artistText = normalizeMusicText(artists.join(" "));
  const wantedArtist = normalizeMusicText(normalizeRequestedArtist(requestedArtist));

  let score = 0;
  if (title === wantedTitle) {
    score += 100;
  } else if (wantedTitle && title.includes(wantedTitle)) {
    score += 45;
  } else if (title && wantedTitle.includes(title)) {
    score += 25;
  }

  if (wantedArtist) {
    score += artistText.includes(wantedArtist) ? 100 : -160;
  }

  if (title.includes("伴奏") || title.includes("纯音乐")) {
    score -= 60;
  }
  if (title.includes("cover") || title.includes("翻唱")) {
    score -= 140;
  }
  if (title.includes("live")) {
    score -= 8;
  }

  return score;
}

function isAcceptableSongCandidate(song, requestedTitle, requestedArtist = "") {
  const wantedArtist = normalizeMusicText(normalizeRequestedArtist(requestedArtist));
  if (!wantedArtist) {
    return scoreSongCandidate(song, requestedTitle, requestedArtist) >= 20;
  }

  const artistText = normalizeMusicText(getArtistNames(song).join(" "));
  return artistText.includes(wantedArtist) && scoreSongCandidate(song, requestedTitle, requestedArtist) >= 100;
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
  const request = parseSongAndArtist(songName, artistName);
  const keyword = `${request.artist || ""} ${request.song || ""}`.trim();
  const url = `https://music.163.com/api/search/get?s=${encodeURIComponent(keyword)}&type=1&limit=30`;
  const data = await fetchJson(url);
  const songs = (((data || {}).result || {}).songs || []).slice();
  const rankedSongs = songs.sort(
    (left, right) =>
      scoreSongCandidate(right, request.song, request.artist) -
      scoreSongCandidate(left, request.song, request.artist),
  );

  for (const song of rankedSongs) {
    if (!isAcceptableSongCandidate(song, request.song, request.artist)) {
      continue;
    }
    const { mediaUrl, data: checkData } = await getNeteasePlayerUrl(song.id);
    const info = ((checkData || {}).data || [])[0] || {};
    if (mediaUrl && info.code === 200) {
      const artists = getArtistNames(song);
      return {
        id: song.id,
        name: song.name || "",
        artist: artists[0] || "未知",
        artists,
        score: scoreSongCandidate(song, request.song, request.artist),
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
  normalizeRequestedArtist,
  parseSongAndArtist,
  scoreSongCandidate,
  isAcceptableSongCandidate,
  fetchJson,
  getNeteasePlayerUrl,
  searchBestNeteaseSong,
  jsonResponse,
  errorResponse,
};
