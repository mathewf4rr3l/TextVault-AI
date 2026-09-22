"""
PromptVeer iteration 6 — incremental backend tests for the 4 new features
+ regression on core endpoints.

  1. Curated Collections    (GET /api/collections, /api/collections/{id})
  2. Copy Streaks           (POST /api/prompts/{id}/copy, GET /api/profile)
  3. Payments infra         (GET /api/payments/packages, POST /api/payments/checkout,
                             GET /api/payments/status/{session_id})
  4. Leaderboard            (GET /api/leaderboard)
  5. Core regression        (prompts list/filters/sort, discover, create, like, share)
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") \
    or os.environ.get("EXPO_BACKEND_URL") \
    or "https://textvault-ai.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


# ---------- Fixtures ----------

@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def guest_token(api_client):
    device_id = f"TEST_device_streak_{uuid.uuid4().hex[:12]}"
    r = api_client.post(f"{API}/auth/guest", json={"device_id": device_id})
    assert r.status_code == 200, f"guest auth failed: {r.status_code} {r.text}"
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def guest_token_2(api_client):
    device_id = f"TEST_device_other_{uuid.uuid4().hex[:12]}"
    r = api_client.post(f"{API}/auth/guest", json={"device_id": device_id})
    assert r.status_code == 200
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def auth_headers(guest_token):
    return {"Authorization": f"Bearer {guest_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def auth_headers_2(guest_token_2):
    return {"Authorization": f"Bearer {guest_token_2}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def sample_prompt_id(api_client):
    r = api_client.get(f"{API}/prompts", params={"limit": 1, "sort": "top"})
    assert r.status_code == 200
    lst = r.json()
    assert isinstance(lst, list) and len(lst) > 0, "No seeded prompts found"
    return lst[0]["id"]


# ---------- 1. Curated Collections ----------

class TestCollections:
    def test_list_collections_returns_8(self, api_client):
        r = api_client.get(f"{API}/collections")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 8, f"expected 8 collections, got {len(data)}"

    def test_collections_shape(self, api_client):
        r = api_client.get(f"{API}/collections")
        assert r.status_code == 200
        required = {"id", "title", "subtitle", "emoji", "color", "count", "preview"}
        for c in r.json():
            missing = required - set(c.keys())
            assert not missing, f"collection {c.get('id')} missing keys: {missing}"
            assert isinstance(c["preview"], list)
            assert len(c["preview"]) <= 4
            assert isinstance(c["count"], int)
            # preview prompts must look like real prompt docs
            for p in c["preview"]:
                assert "id" in p and "title" in p

    def test_get_single_collection_ok(self, api_client):
        r = api_client.get(f"{API}/collections/midjourney-mastery")
        assert r.status_code == 200
        data = r.json()
        assert data["id"] == "midjourney-mastery"
        assert "prompts" in data and isinstance(data["prompts"], list)
        assert data["count"] == len(data["prompts"])

    def test_midjourney_collection_only_midjourney_tool(self, api_client):
        r = api_client.get(f"{API}/collections/midjourney-mastery")
        assert r.status_code == 200
        prompts = r.json()["prompts"]
        # If any prompts exist, they must all have tool == "Midjourney"
        for p in prompts:
            assert p.get("tool") == "Midjourney", \
                f"prompt {p.get('id')} has tool={p.get('tool')}, expected Midjourney"

    def test_collection_prompts_sorted_by_likes_desc(self, api_client):
        r = api_client.get(f"{API}/collections/chatgpt-essentials")
        assert r.status_code == 200
        prompts = r.json()["prompts"]
        likes = [p.get("likes", 0) for p in prompts]
        assert likes == sorted(likes, reverse=True), "prompts not sorted by likes desc"

    def test_unknown_collection_404(self, api_client):
        r = api_client.get(f"{API}/collections/does-not-exist")
        assert r.status_code == 404


# ---------- 2. Copy Streaks ----------

class TestCopyStreak:
    def test_first_copy_awards_points_and_streak(self, api_client, auth_headers, sample_prompt_id):
        r = api_client.post(f"{API}/prompts/{sample_prompt_id}/copy", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "copies" in data and "streak" in data and "points_awarded" in data
        assert "badge" in data and "emoji" in data["badge"] and "label" in data["badge"]
        assert data["streak"] >= 1
        assert data["points_awarded"] >= 2, \
            f"expected first-copy of the day to award >=2 points, got {data['points_awarded']}"

    def test_second_copy_same_day_awards_zero(self, api_client, auth_headers, sample_prompt_id):
        # Any subsequent copy same day should yield 0 additional streak points.
        r1 = api_client.post(f"{API}/prompts/{sample_prompt_id}/copy", headers=auth_headers)
        assert r1.status_code == 200
        streak_before = r1.json()["streak"]

        r2 = api_client.post(f"{API}/prompts/{sample_prompt_id}/copy", headers=auth_headers)
        assert r2.status_code == 200
        data = r2.json()
        assert data["points_awarded"] == 0, \
            f"second copy same day should award 0, got {data['points_awarded']}"
        assert data["streak"] == streak_before, "streak should not change on same-day repeat"

    def test_copy_increments_copies_counter(self, api_client, auth_headers, sample_prompt_id):
        before = api_client.get(f"{API}/prompts/{sample_prompt_id}").json().get("copies", 0)
        api_client.post(f"{API}/prompts/{sample_prompt_id}/copy", headers=auth_headers)
        after = api_client.get(f"{API}/prompts/{sample_prompt_id}").json().get("copies", 0)
        assert after >= before + 1

    def test_copy_unauth_401(self, api_client, sample_prompt_id):
        r = api_client.post(f"{API}/prompts/{sample_prompt_id}/copy")
        assert r.status_code == 401

    def test_copy_unknown_prompt_404(self, api_client, auth_headers):
        r = api_client.post(f"{API}/prompts/does_not_exist_xyz/copy", headers=auth_headers)
        assert r.status_code == 404


# ---------- Profile reflects streak stats ----------

class TestProfileStreakStats:
    def test_profile_includes_streak_fields(self, api_client, auth_headers, sample_prompt_id):
        # Ensure at least one copy for this user (idempotent for streak, so safe)
        api_client.post(f"{API}/prompts/{sample_prompt_id}/copy", headers=auth_headers)

        r = api_client.get(f"{API}/profile", headers=auth_headers)
        assert r.status_code == 200, r.text
        stats = r.json()["stats"]
        for key in ("copy_streak", "longest_streak", "total_copies",
                    "bonus_points", "streak_badge"):
            assert key in stats, f"stats missing '{key}'"
        assert stats["copy_streak"] >= 1
        assert stats["total_copies"] >= 1
        assert stats["bonus_points"] >= 2
        assert "emoji" in stats["streak_badge"] and "label" in stats["streak_badge"]

    def test_profile_score_includes_bonus_points(self, api_client, auth_headers):
        r = api_client.get(f"{API}/profile", headers=auth_headers)
        assert r.status_code == 200
        stats = r.json()["stats"]
        # Guest has no uploads/likes/shares → score should equal bonus_points
        expected = stats["prompts_uploaded"] * 10 \
            + stats["likes_received"] * 3 \
            + stats["shares_received"] * 5 \
            + stats["bonus_points"]
        assert stats["score"] == expected, \
            f"score {stats['score']} != expected {expected}"


# ---------- 3. Payments infra ----------

class TestPayments:
    def test_packages_disabled_in_preview(self, api_client):
        r = api_client.get(f"{API}/payments/packages")
        assert r.status_code == 200
        data = r.json()
        assert data["enabled"] is False, \
            "PAYMENTS_ENABLED should be false with placeholder STRIPE_API_KEY"
        pkgs = data["packages"]
        assert isinstance(pkgs, list) and len(pkgs) == 3
        ids = {p["id"] for p in pkgs}
        assert ids == {"supporter", "pro_monthly", "lifetime"}, f"unexpected ids: {ids}"
        for p in pkgs:
            for k in ("name", "amount", "currency", "tagline", "perks"):
                assert k in p, f"package {p['id']} missing '{k}'"
            assert isinstance(p["perks"], list) and len(p["perks"]) >= 1
            assert p["currency"] == "usd"
            assert isinstance(p["amount"], (int, float))

    def test_checkout_503_when_disabled(self, api_client, auth_headers):
        body = {"package_id": "supporter", "origin_url": BASE_URL}
        r = api_client.post(f"{API}/payments/checkout", headers=auth_headers, json=body)
        # Expected/designed behavior: 503 with a helpful message.
        assert r.status_code == 503, \
            f"expected 503 in preview, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "")
        assert "publish" in detail.lower() or "activate" in detail.lower(), \
            f"unexpected detail: {detail}"

    def test_checkout_requires_auth(self, api_client):
        body = {"package_id": "supporter", "origin_url": BASE_URL}
        r = api_client.post(f"{API}/payments/checkout", json=body)
        assert r.status_code == 401

    def test_status_unknown_session_404(self, api_client, auth_headers):
        fake = f"cs_test_nonexistent_{uuid.uuid4().hex}"
        r = api_client.get(f"{API}/payments/status/{fake}", headers=auth_headers)
        assert r.status_code == 404

    def test_status_ownership_403(self, api_client, auth_headers, auth_headers_2):
        # Seed a fake txn belonging to user #1 by inserting via mongo is not accessible
        # from this test — but we can trigger the ownership check by giving user #2 a
        # session_id we know exists for user #1. Since checkout is 503 in preview and
        # transactions aren't created, we cannot easily seed one via public API.
        # We assert instead that a random session_id yields 404 for both users
        # (ownership check code path is exercised only when a txn exists).
        fake = f"cs_test_{uuid.uuid4().hex}"
        r1 = api_client.get(f"{API}/payments/status/{fake}", headers=auth_headers)
        r2 = api_client.get(f"{API}/payments/status/{fake}", headers=auth_headers_2)
        assert r1.status_code == 404
        assert r2.status_code == 404


# ---------- 4. Leaderboard ----------

class TestLeaderboard:
    def test_leaderboard_returns_list(self, api_client):
        r = api_client.get(f"{API}/leaderboard")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)

    def test_leaderboard_sorted_desc(self, api_client):
        r = api_client.get(f"{API}/leaderboard")
        assert r.status_code == 200
        scores = [row["score"] for row in r.json()]
        assert scores == sorted(scores, reverse=True), "leaderboard not sorted desc"

    def test_leaderboard_row_shape(self, api_client):
        r = api_client.get(f"{API}/leaderboard")
        rows = r.json()
        if not rows:
            pytest.skip("empty leaderboard")
        row = rows[0]
        for k in ("user_id", "name", "score", "prompts_uploaded", "rank"):
            assert k in row, f"leaderboard row missing '{k}'"
        rank = row["rank"]
        for k in ("level", "name", "medal", "color"):
            assert k in rank, f"rank missing '{k}'"


# ---------- 5. Core regression ----------

class TestRegression:
    def test_health(self, api_client):
        r = api_client.get(f"{API}/health")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_prompts_list_default(self, api_client):
        r = api_client.get(f"{API}/prompts", params={"limit": 5})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_prompts_filter_by_tool(self, api_client):
        r = api_client.get(f"{API}/prompts", params={"tool": "ChatGPT", "limit": 10})
        assert r.status_code == 200
        for p in r.json():
            assert p["tool"] == "ChatGPT"

    def test_prompts_sort_newest(self, api_client):
        r = api_client.get(f"{API}/prompts", params={"sort": "newest", "limit": 5})
        assert r.status_code == 200
        data = r.json()
        dates = [p["created_at"] for p in data]
        assert dates == sorted(dates, reverse=True), "newest sort broken"

    def test_prompts_sort_top(self, api_client):
        r = api_client.get(f"{API}/prompts", params={"sort": "top", "limit": 5})
        assert r.status_code == 200
        likes = [p.get("likes", 0) for p in r.json()]
        assert likes == sorted(likes, reverse=True)

    def test_discover(self, api_client):
        r = api_client.get(f"{API}/discover")
        assert r.status_code == 200
        d = r.json()
        for k in ("trending", "newest", "top", "categories"):
            assert k in d

    def test_create_like_share_flow(self, api_client, auth_headers, sample_prompt_id):
        # create
        payload = {
            "title": f"TEST_prompt_{uuid.uuid4().hex[:8]}",
            "content": "This is a test prompt content for regression testing.",
            "category": "Marketing",
            "difficulty": "Beginner",
        }
        c = api_client.post(f"{API}/prompts", headers=auth_headers, json=payload)
        assert c.status_code == 200, c.text
        new_id = c.json()["id"]

        # like (toggle on)
        l1 = api_client.post(f"{API}/prompts/{new_id}/like", headers=auth_headers)
        assert l1.status_code == 200
        assert l1.json()["is_liked"] is True
        assert l1.json()["likes"] == 1

        # like (toggle off)
        l2 = api_client.post(f"{API}/prompts/{new_id}/like", headers=auth_headers)
        assert l2.status_code == 200
        assert l2.json()["is_liked"] is False
        assert l2.json()["likes"] == 0

        # share
        s = api_client.post(f"{API}/prompts/{new_id}/share", headers=auth_headers)
        assert s.status_code == 200
        assert s.json()["shares"] == 1

        # cleanup
        api_client.delete(f"{API}/prompts/{new_id}", headers=auth_headers)
