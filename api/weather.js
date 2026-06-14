const { sendJson, loadKnowledge, findDistrict, fetchJsonWithTimeout } = require("../lib/shared");

function fallbackWeatherData(district) {
  return {
    current: {
      temperature_2m: 31,
      relative_humidity_2m: 68,
      precipitation: 0,
      wind_speed_10m: 11
    },
    hourly: {
      time: ["demo-now"],
      temperature_2m: [31],
      precipitation_probability: [35],
      precipitation: [0.2],
      wind_speed_10m: [11]
    },
    daily: {
      time: [new Date().toISOString().slice(0, 10)],
      precipitation_probability_max: [35],
      precipitation_sum: [1.4],
      wind_speed_10m_max: [16]
    },
    fallbackDistrict: district.name
  };
}

function weatherCopy(language, rainProbability, rainSum) {
  const rainRisk = rainProbability > 40 || rainSum > 2;
  const heavyRain = rainProbability > 60;
  const moderateRain = rainProbability > 25;

  const copy = {
    en: {
      sprayWindow: rainRisk
        ? "Avoid neem or bio-spray today; choose a dry morning window after rain risk drops."
        : "Morning or late afternoon is suitable for neem or bio-input spray if wind stays low.",
      sowingSignal: heavyRain
        ? "Wait before sowing and protect seed from heavy rain."
        : moderateRain
          ? "Sow only where soil moisture is right and drainage is good."
          : "Irrigate or wait for useful rain if topsoil is dry.",
      voice: (districtName, sprayWindow, sowingSignal) =>
        `Rain chance in ${districtName} is ${rainProbability}%. ${sprayWindow} ${sowingSignal}`
    },
    hi: {
      sprayWindow: rainRisk
        ? "आज नीम या bio-spray न करें; बारिश का खतरा कम होने के बाद सूखी सुबह चुनें।"
        : "अगर हवा कम रहे तो सुबह या शाम नीम/bio-input spray के लिए ठीक है।",
      sowingSignal: heavyRain
        ? "बुवाई से पहले रुकें और बीज को तेज बारिश से बचाएं।"
        : moderateRain
          ? "जहां मिट्टी में सही नमी और drainage हो, वहीं बुवाई करें।"
          : "ऊपरी मिट्टी सूखी हो तो सिंचाई करें या उपयोगी बारिश का इंतजार करें।",
      voice: (districtName, sprayWindow, sowingSignal) =>
        `${districtName} में बारिश की संभावना ${rainProbability}% है। ${sprayWindow} ${sowingSignal}`
    },
    hinglish: {
      sprayWindow: rainRisk
        ? "Aaj neem ya bio-spray avoid karein; rain risk kam hone ke baad dry morning window choose karein."
        : "Wind low rahe to morning ya late afternoon neem/bio-input spray ke liye suitable hai.",
      sowingSignal: heavyRain
        ? "Sowing se pehle ruk jaayein aur seed ko heavy rain se protect karein."
        : moderateRain
          ? "Sirf jahan soil moisture aur drainage sahi ho, wahan sowing karein."
          : "Topsoil dry ho to irrigation karein ya useful rain ka wait karein.",
      voice: (districtName, sprayWindow, sowingSignal) =>
        `${districtName} mein rain chance ${rainProbability}% hai. ${sprayWindow} ${sowingSignal}`
    }
  };

  return copy[language] || copy.hinglish;
}

function summarizeWeather(data, district, language) {
  const today = data.daily?.time?.[0] || "today";
  const rainProbability = data.daily?.precipitation_probability_max?.[0] ?? 0;
  const rainSum = data.daily?.precipitation_sum?.[0] ?? 0;
  const maxWind = data.daily?.wind_speed_10m_max?.[0] ?? 0;
  const currentTemp = data.current?.temperature_2m ?? data.hourly?.temperature_2m?.[0] ?? null;
  const copy = weatherCopy(language, rainProbability, rainSum);

  return {
    date: today,
    district: district.name,
    temperatureC: currentTemp,
    rainProbability,
    rainMm: rainSum,
    windKmph: maxWind,
    sprayWindow: copy.sprayWindow,
    sowingSignal: copy.sowingSignal,
    voiceResponse: copy.voice(district.name, copy.sprayWindow, copy.sowingSignal)
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Use GET /api/weather" });

  const knowledge = loadKnowledge();
  const url = new URL(req.url, "http://localhost");
  const district = findDistrict(knowledge, url.searchParams.get("district") || "hisar");
  const language = url.searchParams.get("language") || "hinglish";
  const latitude = url.searchParams.get("latitude") || district.latitude;
  const longitude = url.searchParams.get("longitude") || district.longitude;

  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
    hourly: "temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,wind_speed_10m",
    daily: "precipitation_probability_max,precipitation_sum,wind_speed_10m_max",
    forecast_days: "5",
    timezone: "Asia/Kolkata"
  });

  try {
    const endpoint = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const { response, data } = await fetchJsonWithTimeout(endpoint, {}, 10_000);
    if (!response.ok) throw new Error(data.reason || data.error || `Open-Meteo HTTP ${response.status}`);
    return sendJson(res, 200, {
      source: "Open-Meteo",
      live: true,
      endpoint,
      summary: summarizeWeather(data, district, language),
      raw: data
    });
  } catch (error) {
    const data = fallbackWeatherData(district);
    return sendJson(res, 200, {
      source: "Open-Meteo fallback",
      live: false,
      warning: error.message,
      summary: summarizeWeather(data, district, language),
      raw: data
    });
  }
};
