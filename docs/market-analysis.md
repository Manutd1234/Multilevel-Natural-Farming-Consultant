# Market Analysis

## Target Users

- Small and marginal farmers in Haryana who are moving from chemical input farming to natural farming.
- Family members who help farmers use smartphones and can interpret simple visual signals.
- Field volunteers and CDF facilitators supporting demos, training, and adoption.

## Primary Pain Points

- Weather timing is hard to translate into field decisions such as sowing, irrigation, and seed protection.
- Mandi prices change quickly, and farmers often rely on local hearsay before selling.
- Seed choice and seed quantity are confusing when farmers change crop, season, or acreage.
- First-season natural farming costs feel risky even when home-made inputs can reduce cash outlay.
- Government support is fragmented across state departments, KVKs, and national schemes.

## Product Positioning

Kheti Saathi is not a generic chatbot. It is a short-answer field assistant that turns a spoken question into:

- a weather signal,
- a mandi price signal,
- a seed quantity estimate,
- a first-season natural-input cost range,
- and a local verification reminder.

## Data Strategy

Weather:

- Use Open-Meteo for prototype forecasts because it has a simple public Forecast API and latitude/longitude requests.
- Prefer IMD district forecasts or state advisories in production when available through official channels.

Market:

- Use demo price bands for the assignment to avoid presenting stale prices as live prices.
- Production should ingest Agmarknet/eNAM/state mandi data, normalize commodity names, and stamp every response with market, date, and unit.

Seed and finance:

- Keep seed rate, seed cost, and natural-input estimates editable in JSON.
- Show a conservative range instead of a single number.
- Link subsidy and loan guidance to official pages or local agriculture offices rather than promising eligibility.

## High-Value Features

1. Voice question with instant spoken answer.
2. Rain-before-sowing signal for the selected district.
3. Mandi band and trend with a verification reminder.
4. Seed quantity and first-season cost calculator by acre.
5. Localized Hinglish/Hindi response mode with replay.

## Sources

- [Agmarknet](https://agmarknet.gov.in/)
- [eNAM](https://www.enam.gov.in/)
- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- [India Meteorological Department](https://mausam.imd.gov.in/)
- [National Mission on Natural Farming](https://naturalfarming.dac.gov.in/)
