"""PromptVeer iteration 8 backend tests.

Covers: min_rating filter, weekly warriors, collection following (+ library
'following' tab), review reactions (helpful) with stable review id, curated
library idempotency & shape. Reuses fresh guest sessions per test class.
"""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("EXPO_BACKEND_URL", "https://textvault-ai.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"


# ---------------- fixtures ----------------

@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


def _guest(sess, tag: str) -> str:
    r = sess.post(f"{API}/auth/guest", json={"device_id": f"TEST_iter8_{tag}_{uuid.uuid4().hex[:8]}"})
    assert r.status_code == 200, r.text
    return r.json()["session_token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="session")
def guest_a(s):
    return _guest(s, "a")


@pytest.fixture(scope="session")
def guest_b(s):
    return _guest(s, "b")


# ---------------- 1. min_rating filter ----------------

class TestMinRating:
    def test_min_rating_4_only_returns_4plus(self, s):
        r = s.get(f"{API}/prompts?min_rating=4&limit=100")
        assert r.status_code == 200
        for p in r.json():
            assert p.get("avg_rating", 0) >= 4, p

    def test_min_rating_3_only_returns_3plus(self, s):
        r = s.get(f"{API}/prompts?min_rating=3&limit=100")
        assert r.status_code == 200
        for p in r.json():
            assert p.get("avg_rating", 0) >= 3, p

    def test_min_rating_invalid_rejected(self, s):
        r = s.get(f"{API}/prompts?min_rating=99")
        assert r.status_code == 422

    def test_min_rating_default_returns_mixed(self, s):
        # no min_rating -> may return unrated prompts
        r = s.get(f"{API}/prompts?limit=50")
        assert r.status_code == 200
        avgs = [p.get("avg_rating", 0) for p in r.json()]
        # at least one 0-rated should typically be here (seed data)
        assert any(a == 0 for a in avgs) or len(avgs) < 5


# ---------------- 2. weekly warriors ----------------

class TestWeeklyWarriors:
    def test_returns_list(self, s):
        r = s.get(f"{API}/weekly-warriors")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for w in data:
            assert w["user_id"] != "promptveer_official"
            assert "weekly_score" in w
            assert w["weekly_score"] > 0
            assert "rank" in w and "medal" in w["rank"]

    def test_upload_makes_uploader_appear(self, s, guest_a):
        # upload a prompt as guest_a; then check warriors
        r = s.post(f"{API}/prompts", headers=_auth(guest_a), json={
            "title": f"TEST_ww_{uuid.uuid4().hex[:6]}",
            "content": "TEST weekly warrior candidate content" * 3,
            "category": "Writing",
            "difficulty": "Beginner",
        })
        assert r.status_code == 200, r.text
        me = s.get(f"{API}/auth/me", headers=_auth(guest_a)).json()
        r2 = s.get(f"{API}/weekly-warriors?limit=20")
        assert r2.status_code == 200
        ids = [w["user_id"] for w in r2.json()]
        assert me["user_id"] in ids, f"uploader {me['user_id']} missing from {ids}"


# ---------------- 3. collection follow ----------------

class TestCollectionFollow:
    def _first_collection_id(self, s):
        r = s.get(f"{API}/collections")
        assert r.status_code == 200
        cols = r.json()
        assert len(cols) >= 1
        for c in cols:
            assert "is_following" in c
        return cols[0]["id"]

    def test_toggle_follow_and_unfollow(self, s, guest_b):
        cid = self._first_collection_id(s)
        # unauth listing => is_following False
        cols = s.get(f"{API}/collections").json()
        assert all(c["is_following"] is False for c in cols)

        r = s.post(f"{API}/collections/{cid}/follow", headers=_auth(guest_b))
        assert r.status_code == 200 and r.json()["is_following"] is True

        # authed listing shows is_following True for that one
        cols = s.get(f"{API}/collections", headers=_auth(guest_b)).json()
        assert next(c for c in cols if c["id"] == cid)["is_following"] is True

        detail = s.get(f"{API}/collections/{cid}", headers=_auth(guest_b)).json()
        assert detail["is_following"] is True

        # toggle off
        r = s.post(f"{API}/collections/{cid}/follow", headers=_auth(guest_b))
        assert r.status_code == 200 and r.json()["is_following"] is False

    def test_follow_unknown_id_404(self, s, guest_b):
        r = s.post(f"{API}/collections/does_not_exist/follow", headers=_auth(guest_b))
        assert r.status_code == 404

    def test_follow_requires_auth(self, s):
        cid = self._first_collection_id(s)
        r = s.post(f"{API}/collections/{cid}/follow")
        assert r.status_code == 401


# ---------------- 4. library ?type=following ----------------

class TestLibraryFollowing:
    def test_empty_when_not_following_anything(self, s):
        # fresh guest with nothing followed
        tok = _guest(s, "libempty")
        r = s.get(f"{API}/library?type=following", headers=_auth(tok))
        assert r.status_code == 200
        assert r.json() == []

    def test_returns_newest_from_followed(self, s):
        tok = _guest(s, "libfollow")
        cid = s.get(f"{API}/collections").json()[0]["id"]
        s.post(f"{API}/collections/{cid}/follow", headers=_auth(tok))
        r = s.get(f"{API}/library?type=following", headers=_auth(tok))
        assert r.status_code == 200
        docs = r.json()
        assert isinstance(docs, list)
        # non-empty (seeded curated prompts exist for every collection typically)
        # check ordering desc by created_at
        dates = [d.get("created_at") for d in docs]
        assert dates == sorted(dates, reverse=True)

    def test_following_requires_auth(self, s):
        r = s.get(f"{API}/library?type=following")
        assert r.status_code == 401


# ---------------- 5. reviews with stable id + helpful ----------------

class TestReviewsAndHelpful:
    @pytest.fixture(scope="class")
    def prompt_id(self, s):
        r = s.get(f"{API}/prompts?limit=5")
        assert r.status_code == 200
        return r.json()[0]["id"]

    def test_rate_returns_avg_and_review_id_persists(self, s, prompt_id):
        tok = _guest(s, "rate1")
        r = s.post(f"{API}/prompts/{prompt_id}/rate", headers=_auth(tok),
                   json={"stars": 5, "review": "TEST_iter8 helpful review one"})
        assert r.status_code == 200
        body = r.json()
        assert body["my_rating"] == 5
        assert body["rating_count"] >= 1

        # confirm the review shows up with an id
        revs = s.get(f"{API}/prompts/{prompt_id}/reviews").json()
        assert isinstance(revs, list) and len(revs) >= 1
        mine = [r for r in revs if r.get("review", "").startswith("TEST_iter8 helpful review one")]
        assert mine, revs
        assert mine[0].get("id"), "review missing id"
        assert mine[0].get("helpful_count", 0) == 0
        assert "is_helpful" in mine[0]
        # user_id must NOT leak
        assert all("user_id" not in r for r in revs)

    def test_helpful_toggle_and_count_and_sort(self, s, prompt_id, guest_a, guest_b):
        # create two reviews from a and b so we can test sort
        s.post(f"{API}/prompts/{prompt_id}/rate", headers=_auth(guest_a),
               json={"stars": 5, "review": "TEST_iter8 review A"})
        s.post(f"{API}/prompts/{prompt_id}/rate", headers=_auth(guest_b),
               json={"stars": 4, "review": "TEST_iter8 review B"})

        revs = s.get(f"{API}/prompts/{prompt_id}/reviews").json()
        rev_a = next((r for r in revs if r["review"].endswith("review A")), None)
        rev_b = next((r for r in revs if r["review"].endswith("review B")), None)
        assert rev_a and rev_b, revs

        # give rev_b helpful votes from BOTH guests
        r1 = s.post(f"{API}/reviews/{rev_b['id']}/helpful", headers=_auth(guest_a))
        assert r1.status_code == 200 and r1.json()["is_helpful"] is True
        assert r1.json()["helpful_count"] >= 1

        r2 = s.post(f"{API}/reviews/{rev_b['id']}/helpful", headers=_auth(guest_b))
        assert r2.status_code == 200 and r2.json()["is_helpful"] is True
        b_count = r2.json()["helpful_count"]
        assert b_count >= 2

        # now sort: rev_b should be before rev_a
        revs2 = s.get(f"{API}/prompts/{prompt_id}/reviews").json()
        idx_b = next(i for i, r in enumerate(revs2) if r["id"] == rev_b["id"])
        idx_a = next(i for i, r in enumerate(revs2) if r["id"] == rev_a["id"])
        assert idx_b < idx_a, f"rev_b at {idx_b}, rev_a at {idx_a}"

        # is_helpful reflects for guest_a
        revs3 = s.get(f"{API}/prompts/{prompt_id}/reviews", headers=_auth(guest_a)).json()
        this = next(r for r in revs3 if r["id"] == rev_b["id"])
        assert this["is_helpful"] is True

        # untoggle from guest_a
        r3 = s.post(f"{API}/reviews/{rev_b['id']}/helpful", headers=_auth(guest_a))
        assert r3.status_code == 200 and r3.json()["is_helpful"] is False
        assert r3.json()["helpful_count"] == b_count - 1

    def test_helpful_unknown_rating_404(self, s, guest_a):
        r = s.post(f"{API}/reviews/nonexistent_id_xyz/helpful", headers=_auth(guest_a))
        assert r.status_code == 404

    def test_helpful_requires_auth(self, s, prompt_id):
        revs = s.get(f"{API}/prompts/{prompt_id}/reviews").json()
        if revs and revs[0].get("id"):
            r = s.post(f"{API}/reviews/{revs[0]['id']}/helpful")
            assert r.status_code == 401


# ---------------- 6. curated library shape ----------------

class TestCuratedLibrary:
    def test_total_count_around_364(self, s):
        d = s.get(f"{API}/discover").json()
        total = sum(c["count"] for c in d["categories"])
        # 300 curated + 64 seed = 364 (allow tests to add a few)
        assert total >= 364, total
        assert len(d["categories"]) == 30

    def test_ai_video_has_content_type_video(self, s):
        r = s.get(f"{API}/prompts?category=AI Video&limit=100")
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 1
        # at least one Video content_type
        assert any(p.get("content_type") == "Video" for p in docs), docs

    def test_ai_tool_specific_has_tool(self, s):
        r = s.get(f"{API}/prompts?category=AI Tool-Specific&limit=100")
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 1
        tools = {p.get("tool") for p in docs if p.get("tool")}
        # ChatGPT/Claude/Gemini/etc expected
        assert tools, f"no tools present: {docs[:2]}"

    def test_industry_specific_has_industry(self, s):
        r = s.get(f"{API}/prompts?category=Industry-Specific&limit=100")
        assert r.status_code == 200
        docs = r.json()
        assert len(docs) >= 1
        inds = {p.get("industry") for p in docs if p.get("industry") and p.get("industry") != "General"}
        assert inds, f"no industries set: {docs[:2]}"

    def test_curated_idempotent_no_dupes(self, s):
        # Query all prompts by official author (paginate) and ensure (title, category) unique
        seen = set()
        skip = 0
        total = 0
        while True:
            r = s.get(f"{API}/prompts?limit=100&skip={skip}&sort=newest")
            batch = r.json()
            if not batch:
                break
            for p in batch:
                if p.get("author_name") != "PromptVeer":
                    continue
                key = (p["title"], p["category"])
                assert key not in seen, f"dup: {key}"
                seen.add(key)
                total += 1
            if len(batch) < 100:
                break
            skip += 100
            if skip > 2000:
                break
        assert total >= 300, total


# ---------------- 7. regressions ----------------

class TestRegressions:
    def test_like_share_copy_still_work(self, s, guest_a):
        pid = s.get(f"{API}/prompts?limit=1").json()[0]["id"]
        r = s.post(f"{API}/prompts/{pid}/like", headers=_auth(guest_a))
        assert r.status_code == 200 and "is_liked" in r.json()
        r = s.post(f"{API}/prompts/{pid}/share", headers=_auth(guest_a))
        assert r.status_code == 200 and "shares" in r.json()
        r = s.post(f"{API}/prompts/{pid}/copy", headers=_auth(guest_a))
        assert r.status_code == 200 and "streak" in r.json()

    def test_top_rated_sort(self, s):
        r = s.get(f"{API}/prompts?sort=top_rated&limit=20")
        assert r.status_code == 200
        rats = [p.get("avg_rating", 0) for p in r.json()]
        assert rats == sorted(rats, reverse=True)

    def test_leaderboard(self, s):
        r = s.get(f"{API}/leaderboard")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_collections_still_has_all(self, s):
        cols = s.get(f"{API}/collections").json()
        assert len(cols) >= 8

    def test_submit_prompt_flow(self, s, guest_a):
        r = s.post(f"{API}/prompts", headers=_auth(guest_a), json={
            "title": f"TEST_regr_{uuid.uuid4().hex[:6]}",
            "content": "TEST regression prompt body content valid",
            "category": "Writing",
        })
        assert r.status_code == 200
        pid = r.json()["id"]
        got = s.get(f"{API}/prompts/{pid}").json()
        assert got["id"] == pid
