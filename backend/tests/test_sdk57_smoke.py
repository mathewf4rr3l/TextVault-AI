"""TextVault AI - SDK 57 Post-Upgrade Smoke Tests"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_session():
    """Create guest session and return authenticated requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    device_id = f"test_sdk57_{int(time.time())}"
    r = session.post(f"{BASE_URL}/api/auth/guest", json={"device_id": device_id})
    assert r.status_code == 200, f"Guest session failed: {r.text}"
    token = r.json().get("session_token")
    assert token, "No session_token returned"
    session.headers.update({"Authorization": f"Bearer {token}"})
    return session

# Health check
class TestHealth:
    def test_health(self):
        r = requests.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"
        print("PASS: Health check OK")

# Auth flow
class TestGuestAuth:
    def test_guest_session_creation(self):
        r = requests.post(f"{BASE_URL}/api/auth/guest", json={"device_id": f"smoke_test_{int(time.time())}"})
        assert r.status_code == 200
        data = r.json()
        assert "session_token" in data
        assert "user" in data
        print(f"PASS: Guest session created, user_id={data['user'].get('id','?')}")

# PIN flow
class TestPinFlow:
    def test_setup_pin(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/pin/setup", json={"pin": "9876"})
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        print("PASS: PIN setup successful")

    def test_verify_correct_pin(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/pin/verify", json={"pin": "9876"})
        assert r.status_code == 200
        assert r.json().get("success") is True
        print("PASS: Correct PIN verified")

    def test_verify_wrong_pin(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/pin/verify", json={"pin": "0000"})
        assert r.status_code == 200
        assert r.json().get("success") is False
        print("PASS: Wrong PIN rejected")

    def test_pin_status(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/pin/status")
        assert r.status_code == 200
        data = r.json()
        # API returns hasPin (camelCase)
        has_pin = data.get("has_pin") or data.get("hasPin")
        assert has_pin is True
        print("PASS: PIN status has_pin=true")

# Vault entries
class TestVaultEntries:
    created_id = None

    def test_create_entry(self, auth_session):
        r = auth_session.post(f"{BASE_URL}/api/entries", json={
            "content": "Call John at +1 555 123 4567"
        })
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data.get("content") == "Call John at +1 555 123 4567"
        TestVaultEntries.created_id = data["id"]
        print(f"PASS: Entry created id={data['id']}, category={data.get('category','?')}")

    def test_get_entries(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/entries")
        assert r.status_code == 200
        entries = r.json()
        assert isinstance(entries, list)
        print(f"PASS: Got {len(entries)} entries")

    def test_search_entries(self, auth_session):
        # Search is a POST endpoint
        r = auth_session.post(f"{BASE_URL}/api/entries/search", json={"query": "John"})
        assert r.status_code == 200
        results = r.json()
        assert isinstance(results, list)
        print(f"PASS: Search returned {len(results)} results")

    def test_get_stats(self, auth_session):
        r = auth_session.get(f"{BASE_URL}/api/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        print(f"PASS: Stats total={data.get('total')}")

    def test_delete_entry(self, auth_session):
        if not TestVaultEntries.created_id:
            pytest.skip("No entry to delete")
        r = auth_session.delete(f"{BASE_URL}/api/entries/{TestVaultEntries.created_id}")
        assert r.status_code == 200
        print("PASS: Entry deleted")
