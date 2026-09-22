"""PromptVeer iteration 9 — tests for 4 new features:
Prompt of the Day, Trending This Week, Author Profiles, Save to Folders.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://textvault-ai.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def guest_token(api_client):
    """Fresh guest session for authed calls (folders etc.)."""
    r = api_client.post(f"{BASE_URL}/api/auth/guest",
                        json={"device_id": f"TEST_iter9_{uuid.uuid4().hex[:16]}"})
    assert r.status_code == 200, f"Guest auth failed: {r.text}"
    return r.json()["session_token"]


@pytest.fixture(scope="module")
def authed(api_client, guest_token):
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json",
                      "Authorization": f"Bearer {guest_token}"})
    return s


@pytest.fixture(scope="module")
def sample_prompt(api_client):
    r = api_client.get(f"{BASE_URL}/api/prompts?limit=1")
    assert r.status_code == 200
    data = r.json()
    assert data, "No prompts in DB"
    return data[0]


# ---------- Prompt of the Day ----------
class TestPromptOfTheDay:
    def test_returns_valid_prompt(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/prompt-of-the-day")
        assert r.status_code == 200
        p = r.json()
        for field in ("id", "title", "content", "category", "author_id", "author_name", "likes"):
            assert field in p, f"Missing field {field}"
        assert "_id" not in p
        assert isinstance(p["is_liked"], bool)

    def test_deterministic_within_day(self, api_client):
        r1 = api_client.get(f"{BASE_URL}/api/prompt-of-the-day").json()
        r2 = api_client.get(f"{BASE_URL}/api/prompt-of-the-day").json()
        assert r1["id"] == r2["id"], "POTD changed within the same day"

    def test_is_liked_reflects_auth(self, api_client, authed):
        potd = api_client.get(f"{BASE_URL}/api/prompt-of-the-day").json()
        before = authed.get(f"{BASE_URL}/api/prompt-of-the-day").json()["is_liked"]
        # toggle like on POTD
        authed.post(f"{BASE_URL}/api/prompts/{potd['id']}/like")
        after = authed.get(f"{BASE_URL}/api/prompt-of-the-day").json()["is_liked"]
        assert after != before, "POTD is_liked did not reflect auth state"
        # restore
        authed.post(f"{BASE_URL}/api/prompts/{potd['id']}/like")


# ---------- Trending This Week ----------
class TestTrendingWeek:
    def test_returns_list(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/trending-week")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        for p in data:
            assert "id" in p and "title" in p and "_id" not in p

    def test_limit_respected(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/trending-week?limit=5")
        assert r.status_code == 200
        assert len(r.json()) <= 5

    def test_liked_prompt_boosts_weekly_rank(self, api_client, authed, sample_prompt):
        """A prompt liked within the last 7 days should appear in trending-week."""
        authed.post(f"{BASE_URL}/api/prompts/{sample_prompt['id']}/like")  # like
        data = api_client.get(f"{BASE_URL}/api/trending-week?limit=30").json()
        ids = [p["id"] for p in data]
        assert sample_prompt["id"] in ids, "Recently liked prompt not in trending-week"
        authed.post(f"{BASE_URL}/api/prompts/{sample_prompt['id']}/like")  # unlike (restore)


# ---------- Author Profiles ----------
class TestAuthorProfile:
    def test_profile_for_real_author(self, api_client, sample_prompt):
        author_id = sample_prompt["author_id"]
        r = api_client.get(f"{BASE_URL}/api/users/{author_id}/profile")
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["user_id"] == author_id
        assert "name" in data["user"]
        stats = data["stats"]
        for f in ("prompts_uploaded", "likes_received", "score", "rank"):
            assert f in stats, f"Missing stat {f}"
        assert "level" in stats["rank"] and "medal" in stats["rank"]
        assert isinstance(data["prompts"], list)
        # author's prompts all belong to this author
        for p in data["prompts"]:
            assert p["author_id"] == author_id
            assert "_id" not in p
        # stats count consistent with returned prompts (cap 100)
        assert stats["prompts_uploaded"] >= len(data["prompts"])

    def test_official_author_has_prompts(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/users/promptveer_official/profile")
        assert r.status_code == 200
        data = r.json()
        assert data["user"]["name"] == "PromptVeer"
        assert len(data["prompts"]) > 0
        assert data["stats"]["prompts_uploaded"] > 0

    def test_unknown_user_404(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/users/user_doesnotexist_xyz/profile")
        assert r.status_code == 404


# ---------- Folders CRUD ----------
class TestFolders:
    def test_unauth_401(self, api_client, sample_prompt):
        assert api_client.get(f"{BASE_URL}/api/folders").status_code == 401
        assert api_client.post(f"{BASE_URL}/api/folders", json={"name": "x"}).status_code == 401
        assert api_client.get(f"{BASE_URL}/api/folders/abc").status_code == 401
        assert api_client.post(f"{BASE_URL}/api/folders/abc/items",
                               json={"prompt_id": sample_prompt["id"]}).status_code == 401
        assert api_client.delete(f"{BASE_URL}/api/folders/abc/items/{sample_prompt['id']}").status_code == 401
        assert api_client.delete(f"{BASE_URL}/api/folders/abc").status_code == 401

    def test_folder_crud_lifecycle(self, authed, api_client, sample_prompt):
        # CREATE
        r = authed.post(f"{BASE_URL}/api/folders", json={"name": "TEST_Iter9 Folder"})
        assert r.status_code == 200, r.text
        folder = r.json()
        assert folder["name"] == "TEST_Iter9 Folder"
        assert folder["count"] == 0
        fid = folder["id"]

        # LIST shows it
        folders = authed.get(f"{BASE_URL}/api/folders").json()
        assert any(f["id"] == fid for f in folders)

        # ADD ITEM -> count 1
        r = authed.post(f"{BASE_URL}/api/folders/{fid}/items",
                        json={"prompt_id": sample_prompt["id"]})
        assert r.status_code == 200
        assert r.json()["count"] == 1

        # ADD same item again -> idempotent (count stays 1)
        r = authed.post(f"{BASE_URL}/api/folders/{fid}/items",
                        json={"prompt_id": sample_prompt["id"]})
        assert r.json()["count"] == 1

        # GET folder shows the prompt
        detail = authed.get(f"{BASE_URL}/api/folders/{fid}").json()
        assert detail["id"] == fid and detail["count"] == 1
        assert detail["prompts"][0]["id"] == sample_prompt["id"]
        assert "_id" not in detail["prompts"][0]

        # List count updated
        folders = authed.get(f"{BASE_URL}/api/folders").json()
        f = next(x for x in folders if x["id"] == fid)
        assert f["count"] == 1

        # REMOVE ITEM -> count 0
        r = authed.delete(f"{BASE_URL}/api/folders/{fid}/items/{sample_prompt['id']}")
        assert r.status_code == 200
        assert r.json()["count"] == 0
        detail = authed.get(f"{BASE_URL}/api/folders/{fid}").json()
        assert detail["prompts"] == []

        # DELETE folder -> 404 afterwards
        r = authed.delete(f"{BASE_URL}/api/folders/{fid}")
        assert r.status_code == 200
        assert authed.get(f"{BASE_URL}/api/folders/{fid}").status_code == 404
        folders = authed.get(f"{BASE_URL}/api/folders").json()
        assert not any(x["id"] == fid for x in folders)

    def test_add_nonexistent_prompt_404(self, authed):
        r = authed.post(f"{BASE_URL}/api/folders", json={"name": "TEST_Iter9 Temp"})
        fid = r.json()["id"]
        try:
            r = authed.post(f"{BASE_URL}/api/folders/{fid}/items",
                            json={"prompt_id": "no_such_prompt_xyz"})
            assert r.status_code == 404
        finally:
            authed.delete(f"{BASE_URL}/api/folders/{fid}")

    def test_other_users_folder_inaccessible(self, api_client, authed, sample_prompt):
        r = authed.post(f"{BASE_URL}/api/folders", json={"name": "TEST_Iter9 Private"})
        fid = r.json()["id"]
        # second guest
        r2 = api_client.post(f"{BASE_URL}/api/auth/guest",
                             json={"device_id": f"TEST_iter9_other_{uuid.uuid4().hex[:12]}"})
        other = requests.Session()
        other.headers.update({"Content-Type": "application/json",
                              "Authorization": f"Bearer {r2.json()['session_token']}"})
        try:
            assert other.get(f"{BASE_URL}/api/folders/{fid}").status_code == 404
            assert other.post(f"{BASE_URL}/api/folders/{fid}/items",
                              json={"prompt_id": sample_prompt["id"]}).status_code == 404
            # NOTE: delete_folder returns 403 (exists, not owned) while other routes
            # return 404 — inconsistent but both correctly block access.
            assert other.delete(f"{BASE_URL}/api/folders/{fid}").status_code in (403, 404)
        finally:
            authed.delete(f"{BASE_URL}/api/folders/{fid}")

    def test_folder_name_validation(self, authed):
        assert authed.post(f"{BASE_URL}/api/folders", json={"name": ""}).status_code == 422
        assert authed.post(f"{BASE_URL}/api/folders",
                           json={"name": "x" * 61}).status_code == 422
