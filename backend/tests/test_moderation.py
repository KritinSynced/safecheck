import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.services.text_moderation import moderate_text
from app.services.image_moderation import calculate_image_risk_score

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "SafeCheck"


def test_text_moderation_safe():
    safe_text = "Good morning! Hope you have a wonderful and productive day."
    result = moderate_text(safe_text)
    assert result["risk_score"] < 30
    assert result["status"] == "Safe"
    assert len(result["categories"]) == 0


def test_text_moderation_flagged():
    flagged_text = "Hey you idiot, that was total bullshit!"
    result = moderate_text(flagged_text)
    assert 30 <= result["risk_score"] <= 69
    assert result["status"] == "Flagged"
    assert any("Profanity" in c or "Harassment" in c for c in result["categories"])


def test_text_moderation_blocked():
    blocked_text = "I will find you and murder you and bomb your office!"
    result = moderate_text(blocked_text)
    assert result["risk_score"] >= 70
    assert result["status"] == "Blocked"
    assert "Threats & Violence" in result["categories"]


def test_text_moderation_spam():
    spam_text = "CLICK HERE NOW TO WIN FREE MONEY AND CLAIM YOUR PRIZE IMMEDIATE CRYPTO GIVEAWAY!!!!!"
    result = moderate_text(spam_text)
    assert result["risk_score"] >= 30
    assert result["status"] in ("Flagged", "Blocked")
    assert "Spam & Unsolicited Promotion" in result["categories"]


def test_image_risk_score_calculation():
    # Empty labels -> Safe
    score, status, conf, cats, labels = calculate_image_risk_score([])
    assert score == 0.0
    assert status == "Safe"

    # Suggestive content -> Flagged
    suggestive_labels = [
        {"Name": "Suggestive", "ParentName": "Suggestive", "Confidence": 75.0}
    ]
    score, status, conf, cats, labels = calculate_image_risk_score(suggestive_labels)
    assert 30 <= score <= 69
    assert status == "Flagged"

    # Explicit violence -> Blocked
    violence_labels = [
        {"Name": "Graphic Violence", "ParentName": "Violence", "Confidence": 85.0}
    ]
    score, status, conf, cats, labels = calculate_image_risk_score(violence_labels)
    assert score >= 70
    assert status == "Blocked"


def test_api_text_moderation_and_history_and_decision():
    # 1. Post text moderation
    post_res = client.post("/api/moderate/text", json={"text": "You are a total idiot and a loser."})
    assert post_res.status_code == 200
    res_data = post_res.json()
    record_id = res_data["id"]
    assert res_data["status"] == "Flagged"
    assert res_data["moderator_decision"] is None

    # 2. Get history
    hist_res = client.get("/api/moderation/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    assert hist_data["stats"]["total"] >= 1
    found = any(item["id"] == record_id for item in hist_data["items"])
    assert found

    # 3. Patch decision (Approve)
    patch_res = client.patch(f"/api/moderation/{record_id}/decision", json={"decision": "approved"})
    assert patch_res.status_code == 200
    assert patch_res.json()["moderator_decision"] == "approved"

    # 4. Patch decision (Reject)
    patch_res2 = client.patch(f"/api/moderation/{record_id}/decision", json={"decision": "rejected"})
    assert patch_res2.status_code == 200
    assert patch_res2.json()["moderator_decision"] == "rejected"


def test_api_image_moderation_endpoint():
    # 1x1 transparent PNG file bytes
    sample_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
    
    files = {"file": ("test_sample.png", sample_png, "image/png")}
    response = client.post("/api/moderate/image", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["content_type"] == "image"
    assert data["status"] == "Safe"
    assert data["risk_score"] == 0.0
    assert data["preview_url"] is not None

