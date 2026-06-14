const { sendJson, loadKnowledge, findDistrict } = require("../lib/shared");

function summarizeWeather(data, district) {
  const today = data.daily?.time?.[0] || "today";
  const rainProbability = data.daily?.precipitation_probability_max?.[0] ?? 0;
  const rainSum = data.daily?.precipitation_sum?.[0] ?? 0;
  const maxWind = data.daily?.wind_speed_10m_max?.[0] ?? 0;
  const currentTemp = data.current?.temperature_2m ?? data.hourly?.temperature_2m?.[0] ?? null;
  const sprayWindow = rainProbability > 40 || rainSum > 2
    ? "Avoid neem or bio-spray today; choose a dry morning window after rain risk drops."
    : "Morning or late afternoon is suitable for neem or bio-input spray if wind stays low.";
  const sowingSignal = rainProbability > 60
    ? "Wait before sowing and protect seed from heavy rain."
    : rainProbability > 25
      ? "Sow only where soil moisture is right and drainage is good."
      : "Irrigate or wait for useful rain if topsoil is dry.";

  return {
    date: today,
    district: district.name,
    temperatureC: currentTemp,
    rainProbability,
    rainMm: rainSum,
    windKmph: maxWind,
    sprayWindow,
    sowingSignal,
    voiceResponse: `${district.name} mein rain chance ${rainProbability}% hai. ${sprayWindow} ${sowingSignal}`
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") return sendJson(res, 405, { error: "Use GET /api/weather" });

  const knowledge = loadKnowledge();
  const url = new URL(req.url, "http://localhost");
  const district = findDistrict(knowledge, url.searchParams.get("district") || "hisar");
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
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) return sendJson(res, response.status, { error: "Open-Meteo request failed", detail: data });
    return sendJson(res, 200, {
      source: "Open-Meteo",
      endpoint: `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
      summary: summarizeWeather(data, district),
      raw: data
    });
  } catch (error) {
    return sendJson(res, 500, { error: "Weather fetch failed", detail: error.message });
  }
};
