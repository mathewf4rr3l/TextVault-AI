"""TextVault AI Backend Tests"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

# Health
class TestHealth:
    def test_health(self, client):
        r = client.get(f"{BASE_URL}/api/health")
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        print(f"Health: {data}")

# PIN
class TestPin:
    def test_setup_pin(self, client):
        r = client.post(f"{BASE_URL}/api/pin/setup", json={"pin": "1234"})
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        print(f"Setup PIN: {data}")

    def test_verify_pin_correct(self, client):
        r = client.post(f"{BASE_URL}/api/pin/verify", json={"pin": "1234"})
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is True
        print(f"Verify PIN correct: {data}")

    def test_verify_pin_wrong(self, client):
        r = client.post(f"{BASE_URL}/api/pin/verify", json={"pin": "9999"})
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is False
        print(f"Verify PIN wrong: {data}")

    def test_pin_status(self, client):
        r = client.get(f"{BASE_URL}/api/pin/status")
        assert r.status_code == 200
        data = r.json()
        assert "hasPin" in data
        print(f"PIN status: {data}")

# AI Classify
class TestAIClassify:
    def test_classify_url(self, client):
        r = client.post(f"{BASE_URL}/api/ai/classify", json={"content": "https://github.com/openai/gpt-4"})
        assert r.status_code == 200
        data = r.json()
        assert "category" in data
        assert "confidence" in data
        print(f"Classify URL: {data}")

    def test_classify_email(self, client):
        r = client.post(f"{BASE_URL}/api/ai/classify", json={"content": "test@example.com"})
        assert r.status_code == 200
        data = r.json()
        assert data["category"] in ["Email", "Notes", "Custom"]
        print(f"Classify email: {data}")

    def test_classify_phone(self, client):
        r = client.post(f"{BASE_URL}/api/ai/classify", json={"content": "+1 555 234 5678"})
        assert r.status_code == 200
        data = r.json()
        assert "category" in data
        print(f"Classify phone: {data}")

# Entries CRUD
class TestEntries:
    created_id = None

    def test_create_entry(self, client):
        r = client.post(f"{BASE_URL}/api/entries", json={"content": "TEST_entry https://example.com"})
        assert r.status_code == 200
        data = r.json()
        assert "id" in data
        assert data["content"] == "TEST_entry https://example.com"
        TestEntries.created_id = data["id"]
        print(f"Created entry: {data['id']}")

    def test_get_entries(self, client):
        r = client.get(f"{BASE_URL}/api/entries")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"Entries count: {len(data)}")

    def test_get_entry_by_id(self, client):
        if not TestEntries.created_id:
            pytest.skip("No entry created")
        r = client.get(f"{BASE_URL}/api/entries/{TestEntries.created_id}")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == TestEntries.created_id

    def test_update_entry(self, client):
        if not TestEntries.created_id:
            pytest.skip("No entry created")
        r = client.put(f"{BASE_URL}/api/entries/{TestEntries.created_id}", json={"is_favorite": True})
        assert r.status_code == 200
        data = r.json()
        assert data["is_favorite"] is True

    def test_search_entries(self, client):
        r = client.post(f"{BASE_URL}/api/entries/search", json={"query": "TEST_entry"})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        print(f"Search results: {len(data)}")

    def test_delete_entry(self, client):
        if not TestEntries.created_id:
            pytest.skip("No entry created")
        r = client.delete(f"{BASE_URL}/api/entries/{TestEntries.created_id}")
        assert r.status_code == 200
        # Verify deletion
        r2 = client.get(f"{BASE_URL}/api/entries/{TestEntries.created_id}")
        assert r2.status_code == 404

# Stats & Export
class TestStatsExport:
    def test_stats(self, client):
        r = client.get(f"{BASE_URL}/api/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert "favorites" in data

    def test_category_stats(self, client):
        r = client.get(f"{BASE_URL}/api/categories/stats")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_export_json(self, client):
        r = client.get(f"{BASE_URL}/api/export?format=json")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert data["format"] == "json"

    def test_export_txt(self, client):
        r = client.get(f"{BASE_URL}/api/export?format=txt")
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert data["format"] == "txt"
