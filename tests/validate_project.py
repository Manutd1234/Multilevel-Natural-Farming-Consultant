from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_json(relative: str) -> dict:
    path = ROOT / relative
    assert path.exists(), f"Missing {relative}"
    return json.loads(path.read_text(encoding="utf-8"))


def test_required_files_exist() -> None:
    required = [
        "index.html",
        "src/app.js",
        "src/advisor.js",
        "src/styles.css",
        "data/market-signals.json",
        "data/seed-finance.json",
        "data/disease-knowledge.json",
        "data/knowledge-base.json",
        "api/disease.js",
        "docs/market-analysis.md",
        "docs/model-analysis.md",
        "docs/prompt-design.md",
        "docs/disease-treatment.md",
        "docs/demo-script.md",
        "README.md",
        "vercel.json",
    ]
    missing = [path for path in required if not (ROOT / path).exists()]
    assert not missing, f"Missing files: {missing}"


def test_market_data_has_core_entities() -> None:
    data = load_json("data/market-signals.json")
    crop_ids = {crop["id"] for crop in data["crops"]}
    district_ids = {district["id"] for district in data["districts"]}
    assert {"wheat", "bajra", "moong"}.issubset(crop_ids)
    assert {"hisar", "karnal", "sirsa"}.issubset(district_ids)
    for crop in data["crops"]:
        band = crop["priceBand"]
        assert band["low"] <= band["modal"] <= band["high"], crop["id"]
        assert crop["aliases"], crop["id"]


def test_seed_finance_matches_market_crops() -> None:
    market = load_json("data/market-signals.json")
    finance = load_json("data/seed-finance.json")
    crop_ids = {crop["id"] for crop in market["crops"]}
    finance_ids = {item["cropId"] for item in finance["guidance"]}
    assert crop_ids.issubset(finance_ids)
    for item in finance["guidance"]:
        assert item["seedRateKgPerAcre"] > 0
        assert item["seedCostPerKg"]["low"] <= item["seedCostPerKg"]["high"]
        assert item["naturalInputsPerAcre"]["low"] <= item["naturalInputsPerAcre"]["high"]


def test_guardrails_include_market_verification() -> None:
    kb = load_json("data/knowledge-base.json")
    joined = " ".join(kb["systemGuardrails"]).lower()
    assert "demo market prices" in joined
    assert "local agriculture officer" in joined
    assert all(note for note in kb["safetyNotes"].values())


def test_disease_feature_has_guardrails() -> None:
    disease = load_json("data/disease-knowledge.json")
    assert disease["commonIssues"], "Disease knowledge must include common issues"
    assert "hinglish" in disease["safetyCopy"]
    joined = " ".join(disease["organicPrinciples"]).lower()
    assert "local agriculture officer" in joined
    assert "unknown remedies" in joined


def test_vercel_gemini_function_is_configured() -> None:
    api_file = (ROOT / "api" / "disease.js").read_text(encoding="utf-8")
    vercel = load_json("vercel.json")
    assert "GEMINI_API_KEY" in api_file
    assert "generativelanguage.googleapis.com" in api_file
    assert "inline_data" in api_file
    assert "api/disease.js" in vercel["functions"]


if __name__ == "__main__":
    test_required_files_exist()
    test_market_data_has_core_entities()
    test_seed_finance_matches_market_crops()
    test_guardrails_include_market_verification()
    test_disease_feature_has_guardrails()
    test_vercel_gemini_function_is_configured()
    print("Project validation passed")
