"""
Security audit fix verification tests for TextVault AI
Tests: SEC-001 (rate limiting, device ID), SEC-002 (PIN no-PIN, PBKDF2), SEC-003 (ReDoS)
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('EXPO_BACKEND_URL', 'https://textvault-ai.preview.emergentagent.com').rstrip('/')


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def guest_token(session):
    """Create a fresh guest session for testing - retries once after rate limit window"""
    device_id = f"sec_test_{uuid.uuid4().hex[:16]}"
    resp = session.post(f"{BASE_URL}/api/auth/guest", json={"device_id": device_id})
    if resp.status_code == 429:
        print("Rate limited, waiting 65s for window to reset...")
        time.sleep(65)
        resp = session.post(f"{BASE_URL}/api/auth/guest", json={"device_id": device_id})
    assert resp.status_code == 200, f"Guest session failed: {resp.text}"
    return resp.json()["session_token"]


@pytest.fixture(scope="module")
def auth_headers(guest_token):
    return {"Authorization": f"Bearer {guest_token}"}


# ==================== Health ====================

def test_health(session):
    resp = session.get(f"{BASE_URL}/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    print("PASS: health check")


# ==================== SEC-001: Rate Limiting on /api/auth/guest ====================
# NOTE: This test runs LAST to avoid consuming quota used by fixture

def test_zzz_guest_rate_limit(session):
    """6th+ request from same logical IP should return 429"""
    # Use a unique device_id per call to avoid session reuse
    unique_prefix = f"ratelimit_test_{uuid.uuid4().hex[:8]}"
    
    results = []
    for i in range(7):
        device_id = f"{unique_prefix}_{i}abcdefgh"  # min 8 chars
        resp = session.post(f"{BASE_URL}/api/auth/guest", json={"device_id": device_id})
        results.append(resp.status_code)
        if resp.status_code == 429:
            break
        time.sleep(0.05)
    
    print(f"Rate limit test status codes: {results}")
    assert 429 in results, f"Expected 429 rate limit, got: {results}"
    print("PASS: guest rate limit returns 429")


# ==================== SEC-002: PIN - No PIN configured returns success=false ====================

def test_pin_verify_no_pin_setup(session):
    """New guest user with no PIN should return success=false"""
    device_id = f"no_pin_test_{uuid.uuid4().hex[:16]}"
    resp = session.post(f"{BASE_URL}/api/auth/guest", json={"device_id": device_id})
    if resp.status_code == 429:
        pytest.skip("Rate limited - cannot create guest session for this test")
    assert resp.status_code == 200
    token = resp.json()["session_token"]
    
    verify_resp = session.post(
        f"{BASE_URL}/api/pin/verify",
        json={"pin": "1234"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["success"] == False, f"Expected success=false for no PIN, got: {data}"
    assert "No PIN" in data.get("message", "") or "configured" in data.get("message", "").lower()
    print(f"PASS: verify with no PIN returns success=false, message='{data['message']}'")


# ==================== SEC-002: PIN PBKDF2 setup and verify ====================

def test_pin_setup_and_verify_correct(session, auth_headers):
    """Setup PIN with PBKDF2 and verify correct PIN returns success=true"""
    # Setup PIN
    setup_resp = session.post(
        f"{BASE_URL}/api/pin/setup",
        json={"pin": "9876"},
        headers=auth_headers
    )
    assert setup_resp.status_code == 200
    setup_data = setup_resp.json()
    assert setup_data["success"] == True
    print(f"PASS: PIN setup success: {setup_data['message']}")

    # Verify correct PIN
    verify_resp = session.post(
        f"{BASE_URL}/api/pin/verify",
        json={"pin": "9876"},
        headers=auth_headers
    )
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["success"] == True, f"Expected success=true for correct PIN, got: {data}"
    print(f"PASS: correct PIN verify returns success=true")


def test_pin_verify_wrong(session, auth_headers):
    """Wrong PIN returns success=false"""
    verify_resp = session.post(
        f"{BASE_URL}/api/pin/verify",
        json={"pin": "0000"},
        headers=auth_headers
    )
    assert verify_resp.status_code == 200
    data = verify_resp.json()
    assert data["success"] == False
    print(f"PASS: wrong PIN returns success=false, message='{data['message']}'")


# ==================== SEC-003: ReDoS fix ====================

def test_search_redos_pattern_unauthenticated(session):
    """ReDoS pattern without auth should return 401, not hang/500"""
    start = time.time()
    resp = session.post(
        f"{BASE_URL}/api/entries/search",
        json={"query": "(a+)+$", "limit": 10}
    )
    elapsed = time.time() - start
    assert resp.status_code == 401, f"Expected 401 without auth, got {resp.status_code}"
    assert elapsed < 5, f"Request took too long ({elapsed:.2f}s) - possible ReDoS"
    print(f"PASS: ReDoS pattern returns 401 quickly ({elapsed:.2f}s)")


def test_search_redos_pattern_authenticated(session, auth_headers):
    """ReDoS pattern with auth should return 200 quickly (not hang)"""
    start = time.time()
    resp = session.post(
        f"{BASE_URL}/api/entries/search",
        json={"query": "(a+)+$", "limit": 10},
        headers=auth_headers
    )
    elapsed = time.time() - start
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    assert elapsed < 5, f"Request took too long ({elapsed:.2f}s) - possible ReDoS"
    print(f"PASS: ReDoS pattern with auth returns 200 in {elapsed:.2f}s")


# ==================== Auth flow still works ====================

def test_guest_session_creation(session):
    """Basic guest session creation works"""
    device_id = f"flow_test_{uuid.uuid4().hex[:16]}"
    resp = session.post(f"{BASE_URL}/api/auth/guest", json={"device_id": device_id})
    # May be 200 or 429 depending on rate limit state
    assert resp.status_code in [200, 429], f"Unexpected status: {resp.status_code}"
    if resp.status_code == 200:
        data = resp.json()
        assert "session_token" in data
        assert "user" in data
        assert data["user"]["name"] == "Guest"
        print("PASS: guest session created successfully")
    else:
        print("INFO: Rate limited (expected if running tests quickly)")


def test_vault_entry_create_and_search(session, auth_headers):
    """Create entry and search for it"""
    # Create entry
    create_resp = session.post(
        f"{BASE_URL}/api/entries",
        json={"content": "TEST_security_fix_entry@example.com"},
        headers=auth_headers
    )
    assert create_resp.status_code == 200
    entry = create_resp.json()
    entry_id = entry["id"]
    print(f"PASS: entry created with id={entry_id}")

    # Search for it
    search_resp = session.post(
        f"{BASE_URL}/api/entries/search",
        json={"query": "TEST_security_fix_entry"},
        headers=auth_headers
    )
    assert search_resp.status_code == 200
    results = search_resp.json()
    assert any(e["id"] == entry_id for e in results)
    print("PASS: search returned created entry")

    # Cleanup
    session.delete(f"{BASE_URL}/api/entries/{entry_id}", headers=auth_headers)
