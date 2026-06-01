const CITY_MAP = {
  北京: "Beijing",
  上海: "Shanghai",
  广州: "Guangzhou",
  深圳: "Shenzhen",
  汕头: "Shantou",
  汕头市: "Shantou",
  杭州: "Hangzhou",
  成都: "Chengdu",
  武汉: "Wuhan",
  南京: "Nanjing",
  西安: "Xian",
  重庆: "Chongqing",
  天津: "Tianjin",
  苏州: "Suzhou",
  长沙: "Changsha",
  郑州: "Zhengzhou",
  青岛: "Qingdao",
  大连: "Dalian",
  厦门: "Xiamen",
  昆明: "Kunming",
  哈尔滨: "Harbin",
};

const WEATHER_CN_MAP = {
  Clear: "晴",
  Sunny: "晴",
  "Partly cloudy": "多云",
  "Partly Cloudy": "多云",
  Cloudy: "阴",
  Overcast: "阴",
  Mist: "薄雾",
  Fog: "雾",
  Haze: "霾",
  "Light rain": "小雨",
  "Patchy rain possible": "局部阵雨",
  "Patchy rain nearby": "局部阵雨",
  "Moderate rain": "中雨",
  "Heavy rain": "大雨",
  "Torrential rain": "暴雨",
  "Light rain shower": "小阵雨",
  Thunderstorm: "雷阵雨",
  "Light snow": "小雪",
  "Moderate snow": "中雪",
  "Heavy snow": "大雪",
};

function parseWeatherCity(input = "") {
  let text = String(input || "").trim();
  text = text
    .replace(/[，。！？、,.!?]/g, "")
    .replace(/^(?:请|帮我|帮忙|麻烦|小锋|你好|我想|想要|给我|查一下|查查|查询|查)+/g, "")
    .replace(/(今天|今日|明天|现在|当前|实时|目前|此刻|一下|情况|怎么样|如何|多少|的)/g, "")
    .replace(/(天气预报|天气情况|天气|气温|温度|会不会下雨|下雨|带伞|冷不冷|热不热|穿什么)/g, "")
    .trim();

  text = text.replace(/市$/g, "").trim();
  return text;
}

function resolveWeatherLocation(city = "") {
  const cleanCity = parseWeatherCity(city) || String(city || "").trim();
  return CITY_MAP[cleanCity] || CITY_MAP[`${cleanCity}市`] || cleanCity;
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

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const rawCity = String(params.city || "").trim();
  const rawQuery = String(params.q || "").trim();
  const city = parseWeatherCity(rawCity) || parseWeatherCity(rawQuery);

  if (!city) {
    return jsonResponse({ error: "Missing city parameter" }, 400);
  }

  try {
    const location = resolveWeatherLocation(city);
    const response = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1&lang=zh`);
    if (!response.ok) {
      throw new Error(`Weather service returned ${response.status}`);
    }
    const data = await response.json();
    const cur = data.current_condition && data.current_condition[0];
    if (!cur) {
      throw new Error("Weather data is empty");
    }
    const rawDesc = String((cur.weatherDesc && cur.weatherDesc[0] && cur.weatherDesc[0].value) || "").trim();
    const desc = WEATHER_CN_MAP[rawDesc] || rawDesc || "未知";
    return jsonResponse({
      code: 200,
      city,
      description: desc,
      temp: cur.temp_C,
      feelsLike: cur.FeelsLikeC,
      wind: cur.windspeedKmph,
      humidity: cur.humidity,
    });
  } catch (error) {
    return jsonResponse({ error: error.message || String(error), city }, 500);
  }
};

exports.parseWeatherCity = parseWeatherCity;
exports.resolveWeatherLocation = resolveWeatherLocation;
