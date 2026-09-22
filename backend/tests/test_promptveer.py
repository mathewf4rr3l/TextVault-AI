"""PromptVeer backend regression tests (iteration 5)."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://textvault-ai.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def guest_token(s):
    device_id = f"test_device_{uuid.uuid4().hex[:12]}"
    r = s.post(f"{API}/auth/guest", json={"device_id": device_id}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "session_token" in data and "user" in data
    assert data["user"].get("is_guest") is True
    return data["session_token"], data["user"]


@pytest.fixture(scope="session")
def guest_token_2(s):
    device_id = f"test_device2_{uuid.uuid4().hex[:12]}"
    r = s.post(f"{API}/auth/guest", json={"device_id": device_id}, timeout=15)
    assert r.status_code == 200
    return r.json()["session_token"], r.json()["user"]


def auth_headers(tok):
    return {"Authorization": f"Bearer {tok}"}


# ==================== HEALTH & META ====================

def test_health(s):
    r = s.get(f"{API}/health", timeout=10)
    assert r.status_code == 200
    j = r.json()
    assert j.get("status") == "ok"


def test_taxonomy(s):
    r = s.get(f"{API}/taxonomy", timeout=10)
    assert r.status_code == 200
    j = r.json()
    for key in ("categories", "tools", "industries", "difficulties", "content_types", "ranks"):
        assert key in j, f"missing key: {key}"
    assert len(j["categories"]) == 30, f"expected 30 categories, got {len(j['categories'])}"
    assert len(j["ranks"]) == 10
    # Verify structure
    cat0 = j["categories"][0]
    assert "name" in cat0 and "emoji" in cat0 and "subcategories" in cat0
    assert isinstance(cat0["subcategories"], list) and len(cat0["subcategories"]) > 0
    rank0 = j["ranks"][0]
    assert rank0["name"] == "Ghatotkach" and rank0["level"] == 1
    assert j["ranks"][-1]["name"] == "Arjuna" and j["ranks"][-1]["level"] == 10


# ==================== PROMPTS LIST + FILTERS ====================

def test_list_prompts_trending(s):
    r = s.get(f"{API}/prompts?sort=trending&limit=30", timeout=15)
    assert r.status_code == 200
    j = r.json()
    assert isinstance(j, list)
    assert len(j) > 0, "no seeded prompts returned"
    p = j[0]
    for f in ("id", "title", "content", "category", "author_id", "likes", "shares"):
        assert f in p
    assert "_id" not in p  # ObjectId excluded


def test_list_prompts_newest(s):
    r = s.get(f"{API}/prompts?sort=newest&limit=10", timeout=15)
    assert r.status_code == 200
    arr = r.json()
    assert len(arr) > 0
    # check descending created_at
    dates = [p["created_at"] for p in arr]
    assert dates == sorted(dates, reverse=True)


def test_list_prompts_top(s):
    r = s.get(f"{API}/prompts?sort=top&limit=10", timeout=15)
    assert r.status_code == 200
    arr = r.json()
    assert len(arr) > 0
    likes = [p["likes"] for p in arr]
    assert likes == sorted(likes, reverse=True)


def test_list_prompts_search(s):
    r = s.get(f"{API}/prompts?q=marketing&limit=20", timeout=15)
    assert r.status_code == 200
    arr = r.json()
    # Not strict on count, but should not error
    assert isinstance(arr, list)


def test_list_prompts_filter_difficulty(s):
    r = s.get(f"{API}/prompts?difficulty=Beginner&limit=10", timeout=15)
    assert r.status_code == 200
    arr = r.json()
    for p in arr:
        assert p.get("difficulty") == "Beginner"


# ==================== DISCOVER ====================

def test_discover(s):
    r = s.get(f"{API}/discover", timeout=15)
    assert r.status_code == 200
    j = r.json()
    for key in ("trending", "newest", "top", "categories"):
        assert key in j
    assert len(j["categories"]) == 30
    cat0 = j["categories"][0]
    assert "count" in cat0 and "name" in cat0 and "emoji" in cat0
    total_counts = sum(c["count"] for c in j["categories"])
    assert total_counts > 0
    assert len(j["trending"]) > 0


# ==================== SINGLE PROMPT ====================

def test_get_prompt_by_id(s):
    r = s.get(f"{API}/prompts?limit=1", timeout=10)
    assert r.status_code == 200
    pid = r.json()[0]["id"]
    r2 = s.get(f"{API}/prompts/{pid}", timeout=10)
    assert r2.status_code == 200
    assert r2.json()["id"] == pid


def test_get_prompt_404(s):
    r = s.get(f"{API}/prompts/nonexistent_id_xyz", timeout=10)
    assert r.status_code == 404


# ==================== AUTH GUEST ====================

def test_auth_guest_creates_session(guest_token):
    tok, user = guest_token
    assert tok.startswith("guest_")
    assert user["user_id"].startswith("guest_")


def test_auth_me(s, guest_token):
    tok, _ = guest_token
    r = s.get(f"{API}/auth/me", headers=auth_headers(tok), timeout=10)
    assert r.status_code == 200
    assert r.json().get("is_guest") is True


def test_auth_me_no_token(s):
    r = s.get(f"{API}/auth/me", timeout=10)
    assert r.status_code == 401


def test_auth_me_bad_token(s):
    r = s.get(f"{API}/auth/me", headers={"Authorization": "Bearer invalid_xyz"}, timeout=10)
    assert r.status_code == 401


# ==================== CREATE PROMPT + GAMIFICATION ====================

_created_prompt = {"id": None}


def test_create_prompt(s, guest_token):
    tok, _ = guest_token
    payload = {
        "title": "TEST_ Best prompt for viral hooks",
        "content": "Write 10 viral hook ideas for the topic {topic}. Make each punchy, under 15 words.",
        "category": "Marketing",
        "subcategory": "Content Marketing",
        "tool": "ChatGPT",
        "difficulty": "Beginner",
        "content_type": "Text",
    }
    r = s.post(f"{API}/prompts", json=payload, headers=auth_headers(tok), timeout=15)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["title"] == payload["title"]
    assert j["category"] == "Marketing"
    assert j["author_id"].startswith("guest_")
    assert j["likes"] == 0
    _created_prompt["id"] = j["id"]

    # Verify persistence via GET
    r2 = s.get(f"{API}/prompts/{j['id']}", timeout=10)
    assert r2.status_code == 200
    assert r2.json()["title"] == payload["title"]


def test_profile_after_upload(s, guest_token):
    tok, _ = guest_token
    r = s.get(f"{API}/profile", headers=auth_headers(tok), timeout=10)
    assert r.status_code == 200
    j = r.json()
    assert "user" in j and "stats" in j
    stats = j["stats"]
    assert stats["prompts_uploaded"] >= 1
    assert stats["score"] >= 10  # upload = 10 pts
    assert "rank" in stats and stats["rank"]["level"] >= 1
    assert "progress" in stats and 0.0 <= stats["progress"] <= 1.0


def test_create_prompt_requires_auth(s):
    payload = {"title": "Should fail", "content": "no auth token here", "category": "Marketing"}
    r = s.post(f"{API}/prompts", json=payload, timeout=10)
    assert r.status_code == 401


def test_create_prompt_validation(s, guest_token):
    tok, _ = guest_token
    r = s.post(f"{API}/prompts", json={"title": "x", "content": "y", "category": "X"},
               headers=auth_headers(tok), timeout=10)
    assert r.status_code == 422  # too short title/content


# ==================== LIKE / SHARE ====================

def test_like_prompt_toggle(s, guest_token_2):
    tok, _ = guest_token_2
    # get any seeded prompt
    r = s.get(f"{API}/prompts?limit=1", timeout=10)
    pid = r.json()[0]["id"]
    pre_likes = r.json()[0]["likes"]

    r1 = s.post(f"{API}/prompts/{pid}/like", headers=auth_headers(tok), timeout=10)
    assert r1.status_code == 200
    j1 = r1.json()
    assert j1["is_liked"] is True
    assert j1["likes"] == pre_likes + 1

    # toggle off
    r2 = s.post(f"{API}/prompts/{pid}/like", headers=auth_headers(tok), timeout=10)
    assert r2.status_code == 200
    j2 = r2.json()
    assert j2["is_liked"] is False
    assert j2["likes"] == pre_likes


def test_share_prompt(s, guest_token):
    tok, _ = guest_token
    r = s.get(f"{API}/prompts?limit=1", timeout=10)
    pid = r.json()[0]["id"]
    pre = r.json()[0]["shares"]
    r1 = s.post(f"{API}/prompts/{pid}/share", headers=auth_headers(tok), timeout=10)
    assert r1.status_code == 200
    assert r1.json()["shares"] == pre + 1


def test_like_requires_auth(s):
    r = s.get(f"{API}/prompts?limit=1", timeout=10)
    pid = r.json()[0]["id"]
    r2 = s.post(f"{API}/prompts/{pid}/like", timeout=10)
    assert r2.status_code == 401


# ==================== LIBRARY ====================

def test_library_uploads(s, guest_token):
    tok, _ = guest_token
    r = s.get(f"{API}/library?type=uploads", headers=auth_headers(tok), timeout=10)
    assert r.status_code == 200
    arr = r.json()
    assert isinstance(arr, list)
    assert len(arr) >= 1
    assert all(p["author_id"].startswith("guest_") for p in arr)


def test_library_liked(s, guest_token_2):
    tok, _ = guest_token_2
    # like a prompt first
    r = s.get(f"{API}/prompts?limit=1", timeout=10)
    pid = r.json()[0]["id"]
    s.post(f"{API}/prompts/{pid}/like", headers=auth_headers(tok), timeout=10)

    r2 = s.get(f"{API}/library?type=liked", headers=auth_headers(tok), timeout=10)
    assert r2.status_code == 200
    arr = r2.json()
    assert any(p["id"] == pid for p in arr)


# ==================== AUTHORIZATION on PUT/DELETE ====================

def test_update_prompt_unauthorized(s, guest_token_2):
    """User 2 should not be able to update user 1's prompt."""
    tok2, _ = guest_token_2
    pid = _created_prompt["id"]
    assert pid is not None
    r = s.put(f"{API}/prompts/{pid}", json={"title": "hacked title xyz"},
              headers=auth_headers(tok2), timeout=10)
    assert r.status_code == 403


def test_update_prompt_authorized(s, guest_token):
    tok, _ = guest_token
    pid = _created_prompt["id"]
    r = s.put(f"{API}/prompts/{pid}", json={"title": "TEST_ Updated title"},
              headers=auth_headers(tok), timeout=10)
    assert r.status_code == 200
    assert r.json()["title"] == "TEST_ Updated title"


def test_delete_prompt_unauthorized(s, guest_token_2):
    tok2, _ = guest_token_2
    pid = _created_prompt["id"]
    r = s.delete(f"{API}/prompts/{pid}", headers=auth_headers(tok2), timeout=10)
    assert r.status_code == 403


def test_delete_prompt_authorized(s, guest_token):
    tok, _ = guest_token
    pid = _created_prompt["id"]
    r = s.delete(f"{API}/prompts/{pid}", headers=auth_headers(tok), timeout=10)
    assert r.status_code == 200
    # verify 404
    r2 = s.get(f"{API}/prompts/{pid}", timeout=10)
    assert r2.status_code == 404


# ==================== LEADERBOARD ====================

def test_leaderboard(s):
    r = s.get(f"{API}/leaderboard?limit=10", timeout=10)
    assert r.status_code == 200
    arr = r.json()
    assert isinstance(arr, list)
    if arr:
        e = arr[0]
        for k in ("user_id", "name", "score", "prompts_uploaded", "rank"):
            assert k in e
        # sorted desc
        scores = [x["score"] for x in arr]
        assert scores == sorted(scores, reverse=True)
