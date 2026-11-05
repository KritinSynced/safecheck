import sys
from fastapi.testclient import TestClient
from app.main import app

def run_e2e_verification():
    print("=== Running SafeCheck E2E Verification ===")
    client = TestClient(app)

    # 1. Health
    res = client.get("/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print(f"[PASS] /health -> {health_data}")

    # 2. Text Moderation - Safe
    safe_res = client.post("/api/moderate/text", json={"text": "Hello, thank you for your helpful assistance!"})
    assert safe_res.status_code == 200
    safe_data = safe_res.json()
    assert safe_data["status"] == "Safe"
    assert safe_data["risk_score"] < 30
    print(f"[PASS] Safe Text -> ID: {safe_data['id']}, Score: {safe_data['risk_score']}, Status: {safe_data['status']}")

    # 3. Text Moderation - Flagged
    flagged_res = client.post("/api/moderate/text", json={"text": "You are a complete idiot and this is bullshit."})
    assert flagged_res.status_code == 200
    flagged_data = flagged_res.json()
    assert flagged_data["status"] == "Flagged"
    assert 30 <= flagged_data["risk_score"] <= 69
    print(f"[PASS] Flagged Text -> ID: {flagged_data['id']}, Score: {flagged_data['risk_score']}, Status: {flagged_data['status']}")

    # 4. Text Moderation - Blocked
    blocked_res = client.post("/api/moderate/text", json={"text": "I will murder you and bomb your entire family!"})
    assert blocked_res.status_code == 200
    blocked_data = blocked_res.json()
    assert blocked_data["status"] == "Blocked"
    assert blocked_data["risk_score"] >= 70
    print(f"[PASS] Blocked Text -> ID: {blocked_data['id']}, Score: {blocked_data['risk_score']}, Status: {blocked_data['status']}")

    # 5. Image Moderation
    dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
    img_res = client.post("/api/moderate/image", files={"file": ("sample.png", dummy_png, "image/png")})
    assert img_res.status_code == 200
    img_data = img_res.json()
    assert img_data["content_type"] == "image"
    print(f"[PASS] Image Moderation -> ID: {img_data['id']}, Type: {img_data['content_type']}, Status: {img_data['status']}")

    # 6. Moderation History & Stats
    hist_res = client.get("/api/moderation/history")
    assert hist_res.status_code == 200
    hist_data = hist_res.json()
    stats = hist_data["stats"]
    assert stats["total"] >= 4
    print(f"[PASS] /api/moderation/history -> Total: {stats['total']}, Safe: {stats['safe_count']}, Flagged: {stats['flagged_count']}, Blocked: {stats['blocked_count']}")

    # 7. Moderator Decision
    record_to_decide = flagged_data["id"]
    dec_res = client.patch(f"/api/moderation/{record_to_decide}/decision", json={"decision": "approved"})
    assert dec_res.status_code == 200
    dec_data = dec_res.json()
    assert dec_data["moderator_decision"] == "approved"
    print(f"[PASS] Moderator Decision -> ID: {record_to_decide} marked as '{dec_data['moderator_decision']}'")

    print("\n=== ALL E2E VERIFICATION CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_e2e_verification()

