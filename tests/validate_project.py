from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read_json(relative: str):
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def read_jsonl(relative: str):
    return [
        json.loads(line)
        for line in (ROOT / relative).read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def test_required_files_exist() -> None:
    required = [
        "index.html",
        "src/app.js",
        "src/styles.css",
        "api/advisor.js",
        "api/disease.js",
        "api/market.js",
        "api/transcribe.js",
        "api/weather.js",
        "lib/shared.js",
        "knowledge_base/districts.json",
        "knowledge_base/market_fallback.json",
        "knowledge_base/diseases.jsonl",
        "knowledge_base/zbnf_practices.jsonl",
        "knowledge_base/crop_calendar.jsonl",
        "scripts/download-whisper.mjs",
        "scripts/dev-server.mjs",
        "README.md",
        "docs/architecture.md",
        "docs/prompt-guardrails.md",
        "docs/demo-script.md",
        "docs/deployment.md",
        "vercel.json",
    ]
    missing = [path for path in required if not (ROOT / path).exists()]
    assert not missing, missing


def test_knowledge_base_is_parseable() -> None:
    districts = read_json("knowledge_base/districts.json")
    market = read_json("knowledge_base/market_fallback.json")
    diseases = read_jsonl("knowledge_base/diseases.jsonl")
    zbnf = read_jsonl("knowledge_base/zbnf_practices.jsonl")
    calendar = read_jsonl("knowledge_base/crop_calendar.jsonl")
    assert {"hisar", "karnal"}.issubset({item["id"] for item in districts})
    assert {"onion", "bajra", "moong"}.issubset({item["id"] for item in market["crops"]})
    assert all(item["organicTreatment"] for item in diseases)
    assert all("guardrail" in item for item in zbnf)
    assert any(item["cropId"] == "general" for item in calendar)


def test_api_guardrails_and_integrations_are_present() -> None:
    shared = (ROOT / "lib/shared.js").read_text(encoding="utf-8")
    disease = (ROOT / "api/disease.js").read_text(encoding="utf-8")
    transcribe = (ROOT / "api/transcribe.js").read_text(encoding="utf-8")
    weather = (ROOT / "api/weather.js").read_text(encoding="utf-8")
    assert "GEMINI_API_KEY" in shared
    assert "responseFormat" in shared
    assert "inline_data" in disease
    assert "synthetic chemical pesticides" in disease
    assert "api-inference.huggingface.co" in transcribe
    assert "openai/whisper-small" in transcribe
    assert "api.open-meteo.com/v1/forecast" in weather


def test_vercel_config_and_gitignore() -> None:
    vercel = read_json("vercel.json")
    gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")
    assert vercel["functions"]["api/*.js"]["maxDuration"] == 30
    assert "models/" in gitignore


if __name__ == "__main__":
    test_required_files_exist()
    test_knowledge_base_is_parseable()
    test_api_guardrails_and_integrations_are_present()
    test_vercel_config_and_gitignore()
    print("Project validation passed")
