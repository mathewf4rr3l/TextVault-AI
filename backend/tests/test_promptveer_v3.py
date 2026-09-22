"""
PromptVeer iteration 7 — backend tests for the 3 NEW features
(Ratings & Reviews, Streak Reminders, Collections regression)
+ ratings/streak-focused regression.

  1. Ratings & Reviews    (POST /api/prompts/{id}/rate, GET /api/prompts/{id}/reviews,
                           GET /api/prompts/{id} — my_rating/avg_rating/rating_count,
                           GET /api/prompts?sort=top_rated)
  2. Streak Reminders     (GET /api/streak)
  3. Collections regression (GET /api/collections returns 8, /api/collections/{id})
  4. General regression   (/api/discover, /api/profile)
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


def _new_guest(api_client):
    device_id = f"TEST_ratings_{uuid.uuid4().hex[:12]}"
    r = api_client.post(f"{API}/auth/guest", json={"device_id": device_id})
    assert r.status_code == 200, f"guest auth failed: {r.status_code} {r.text}"
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def guest_token(api_client):
    return _new_guest(api_client)


@pytest.fixture(scope="module")
def guest_token_2(api_client):
    return _new_guest(api_client)


@pytest.fixture(scope="module")
def guest_token_3(api_client):
    return _new_guest(api_client)


@pytest.fixture(scope="module")
def auth_headers(guest_token):
    return {"Authorization": f"Bearer {guest_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def auth_headers_2(guest_token_2):
    return {"Authorization": f"Bearer {guest_token_2}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def auth_headers_3(guest_token_3):
    return {"Authorization": f"Bearer {guest_token_3}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def sample_prompt_id(api_client):
    r = api_client.get(f"{API}/prompts", params={"limit": 1, "sort": "top"})
    assert r.status_code == 200
    lst = r.json()
    assert isinstance(lst, list) and len(lst) > 0
    return lst[0]["id"]


@pytest.fixture(scope="module")
def other_prompt_id(api_client):
    r = api_client.get(f"{API}/prompts", params={"limit": 5, "sort": "top"})
    assert r.status_code == 200
    lst = r.json()
    assert len(lst) >= 2, "need at least 2 prompts"
    return lst[1]["id"]


# ---------- 1. Ratings & Reviews ----------

class TestRatings:
    def test_rate_requires_auth(self, api_client, sample_prompt_id):
        r = api_client.post(f"{API}/prompts/{sample_prompt_id}/rate", json={"stars": 4})
        assert r.status_code == 401

    def test_rate_unknown_prompt_404(self, api_client, auth_headers):
        r = api_client.post(
            f"{API}/prompts/does_not_exist_xyz/rate",
            headers=auth_headers, json={"stars": 5}
        )
        assert r.status_code == 404

    def test_rate_rejects_stars_out_of_range_low(self, api_client, auth_headers, sample_prompt_id):
        r = api_client.post(
            f"{API}/prompts/{sample_prompt_id}/rate",
            headers=auth_headers, json={"stars": 0}
        )
        assert r.status_code == 422, f"expected 422, got {r.status_code}"

    def test_rate_rejects_stars_out_of_range_high(self, api_client, auth_headers, sample_prompt_id):
        r = api_client.post(
            f"{API}/prompts/{sample_prompt_id}/rate",
            headers=auth_headers, json={"stars": 6}
        )
        assert r.status_code == 422

    def test_rate_success_and_response_shape(self, api_client, auth_headers, sample_prompt_id):
        r = api_client.post(
            f"{API}/prompts/{sample_prompt_id}/rate",
            headers=auth_headers, json={"stars": 4, "review": "Great prompt for testing"}
        )
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("avg_rating", "rating_count", "my_rating"):
            assert k in d, f"missing '{k}' in response"
        assert d["my_rating"] == 4
        assert d["rating_count"] >= 1
        assert 1 <= d["avg_rating"] <= 5

    def test_rate_again_updates_not_duplicates(self, api_client, auth_headers, sample_prompt_id):
        # 1st rating
        r1 = api_client.post(
            f"{API}/prompts/{sample_prompt_id}/rate",
            headers=auth_headers, json={"stars": 4, "review": "first"}
        )
        assert r1.status_code == 200
        count_before = r1.json()["rating_count"]

        # 2nd rating from same user — should update, not add
        r2 = api_client.post(
            f"{API}/prompts/{sample_prompt_id}/rate",
            headers=auth_headers, json={"stars": 5, "review": "updated"}
        )
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["my_rating"] == 5
        assert d2["rating_count"] == count_before, \
            f"rating_count changed from {count_before} to {d2['rating_count']} — user duplicated!"

    def test_avg_rating_recomputes_across_users(self, api_client, auth_headers, auth_headers_2, other_prompt_id):
        # user1: 2 stars
        r1 = api_client.post(
            f"{API}/prompts/{other_prompt_id}/rate",
            headers=auth_headers, json={"stars": 2}
        )
        assert r1.status_code == 200
        # user2: 4 stars
        r2 = api_client.post(
            f"{API}/prompts/{other_prompt_id}/rate",
            headers=auth_headers_2, json={"stars": 4}
        )
        assert r2.status_code == 200
        d = r2.json()
        assert d["rating_count"] >= 2
        # Avg should be somewhere between 2 and 4 inclusive
        assert 2.0 <= d["avg_rating"] <= 4.0, \
            f"avg {d['avg_rating']} not in expected range 2..4"

    def test_prompt_detail_exposes_my_rating(self, api_client, auth_headers, sample_prompt_id):
        r = api_client.get(f"{API}/prompts/{sample_prompt_id}", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("avg_rating", "rating_count", "my_rating"):
            assert k in d, f"prompt detail missing '{k}'"
        # We rated 5 in test_rate_again_updates_not_duplicates
        assert d["my_rating"] == 5

    def test_prompt_detail_my_rating_zero_for_unrated_user(self, api_client, auth_headers_3, sample_prompt_id):
        # Fresh guest has not rated this prompt yet
        r = api_client.get(f"{API}/prompts/{sample_prompt_id}", headers=auth_headers_3)
        assert r.status_code == 200
        assert r.json()["my_rating"] == 0

    def test_prompt_detail_my_rating_zero_when_unauth(self, api_client, sample_prompt_id):
        r = api_client.get(f"{API}/prompts/{sample_prompt_id}")
        assert r.status_code == 200
        d = r.json()
        assert d["my_rating"] == 0
        assert "avg_rating" in d and "rating_count" in d


class TestReviews:
    def test_reviews_only_include_text_reviews(self, api_client, auth_headers_2, other_prompt_id):
        # user2 already rated 4 stars (no review). Now add a rating WITH review.
        rr = api_client.post(
            f"{API}/prompts/{other_prompt_id}/rate",
            headers=auth_headers_2, json={"stars": 4, "review": "TEST review text 123"}
        )
        assert rr.status_code == 200

        r = api_client.get(f"{API}/prompts/{other_prompt_id}/reviews")
        assert r.status_code == 200
        reviews = r.json()
        assert isinstance(reviews, list)
        for rv in reviews:
            assert rv.get("review"), f"empty review returned: {rv}"
            for k in ("author_name", "stars", "review"):
                assert k in rv, f"review missing '{k}'"

    def test_reviews_newest_first(self, api_client, auth_headers, auth_headers_2, other_prompt_id):
        # Ensure at least 2 reviews exist and are ordered by created_at desc
        api_client.post(
            f"{API}/prompts/{other_prompt_id}/rate",
            headers=auth_headers, json={"stars": 5, "review": "TEST first review"}
        )
        api_client.post(
            f"{API}/prompts/{other_prompt_id}/rate",
            headers=auth_headers_2, json={"stars": 3, "review": "TEST second review"}
        )
        r = api_client.get(f"{API}/prompts/{other_prompt_id}/reviews")
        assert r.status_code == 200
        reviews = r.json()
        if len(reviews) >= 2:
            dates = [rv["created_at"] for rv in reviews if rv.get("created_at")]
            assert dates == sorted(dates, reverse=True), \
                f"reviews not newest-first: {dates}"

    def test_reviews_does_not_leak_user_id(self, api_client, other_prompt_id):
        r = api_client.get(f"{API}/prompts/{other_prompt_id}/reviews")
        assert r.status_code == 200
        for rv in r.json():
            assert "user_id" not in rv, "review must not expose user_id"


class TestTopRatedSort:
    def test_top_rated_sort_returns_list(self, api_client):
        r = api_client.get(f"{API}/prompts", params={"sort": "top_rated", "limit": 20})
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_top_rated_sort_orders_by_avg_desc(self, api_client):
        r = api_client.get(f"{API}/prompts", params={"sort": "top_rated", "limit": 20})
        assert r.status_code == 200
        data = r.json()
        # Filter to prompts with rating_count > 0; among those, avg_rating must be desc
        rated = [(p.get("avg_rating", 0), p.get("rating_count", 0))
                 for p in data if p.get("rating_count", 0) > 0]
        if len(rated) >= 2:
            avgs = [x[0] for x in rated]
            assert avgs == sorted(avgs, reverse=True), \
                f"top_rated not sorted by avg desc: {avgs}"


# ---------- 2. Streak Reminders ----------

class TestStreakEndpoint:
    def test_streak_requires_auth(self, api_client):
        r = api_client.get(f"{API}/streak")
        assert r.status_code == 401

    def test_streak_shape_for_new_guest(self, api_client, auth_headers_3):
        # Fresh guest — should have streak=0, copied_today=False, at_risk=False
        r = api_client.get(f"{API}/streak", headers=auth_headers_3)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("copy_streak", "longest_streak", "copied_today", "at_risk", "badge"):
            assert k in d, f"streak response missing '{k}'"
        assert d["copy_streak"] == 0
        assert d["longest_streak"] == 0
        assert d["copied_today"] is False
        assert d["at_risk"] is False, \
            "at_risk must be False for brand-new guest (no prior streak)"
        assert "emoji" in d["badge"] and "label" in d["badge"]

    def test_streak_after_copy_today(self, api_client, auth_headers, sample_prompt_id):
        # Trigger a copy (may already have happened this session — idempotent for same day)
        api_client.post(f"{API}/prompts/{sample_prompt_id}/copy", headers=auth_headers)
        r = api_client.get(f"{API}/streak", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["copy_streak"] >= 1
        assert d["copied_today"] is True
        # If they copied today, they are NOT at risk (definition: copied yesterday but not today)
        assert d["at_risk"] is False, \
            f"at_risk should be False right after copying today, got {d}"


# ---------- 3. Collections regression ----------

class TestCollectionsRegression:
    def test_collections_still_8(self, api_client):
        r = api_client.get(f"{API}/collections")
        assert r.status_code == 200
        assert len(r.json()) == 8

    def test_collection_detail_ok(self, api_client):
        r = api_client.get(f"{API}/collections/midjourney-mastery")
        assert r.status_code == 200
        assert r.json()["id"] == "midjourney-mastery"
        assert "prompts" in r.json()

    def test_collection_unknown_404(self, api_client):
        r = api_client.get(f"{API}/collections/does-not-exist-x")
        assert r.status_code == 404


# ---------- 4. General regression ----------

class TestGeneralRegression:
    def test_discover_ok(self, api_client):
        r = api_client.get(f"{API}/discover")
        assert r.status_code == 200
        for k in ("trending", "newest", "top", "categories"):
            assert k in r.json()

    def test_profile_ok(self, api_client, auth_headers):
        r = api_client.get(f"{API}/profile", headers=auth_headers)
        assert r.status_code == 200
        assert "user" in r.json() and "stats" in r.json()

    def test_prompt_list_default_has_rating_fields(self, api_client):
        r = api_client.get(f"{API}/prompts", params={"limit": 5})
        assert r.status_code == 200
        for p in r.json():
            assert "avg_rating" in p and "rating_count" in p
