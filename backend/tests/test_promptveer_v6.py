"""PromptVeer iteration 10 tests — Report, Publish/Community Packs, Follow.

Covers the 3 new features added this session:
  1) POST /api/prompts/{id}/report
  2) POST /api/folders/{id}/publish + is_public + followers on folder objects
  3) GET /api/community-folders, GET /api/community-folders/{id},
     POST /api/community-folders/{id}/follow
Plus a light regression on the earlier POTD/Trending/Folders flows.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://textvault-ai.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


# ---------- Fixtures ----------

def _guest_session(device_suffix: str = "") -> dict:
    device_id = f"TEST_iter10_{device_suffix}_{uuid.uuid4().hex[:8]}"
    r = requests.post(f"{API}/auth/guest", json={"device_id": device_id}, timeout=15)
    assert r.status_code == 200, f"guest auth failed: {r.status_code} {r.text}"
    data = r.json()
    return {"token": data["session_token"], "user_id": data["user"]["user_id"], "device_id": device_id}


@pytest.fixture(scope="module")
def owner():
    return _guest_session("owner")


@pytest.fixture(scope="module")
def viewer():
    return _guest_session("viewer")


@pytest.fixture(scope="module")
def other_user():
    return _guest_session("other")


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def some_prompt_id():
    r = requests.get(f"{API}/prompts", params={"limit": 1}, timeout=15)
    assert r.status_code == 200
    lst = r.json()
    assert lst, "no seeded prompts available"
    return lst[0]["id"]


@pytest.fixture(scope="module")
def owner_folder(owner, some_prompt_id):
    """Create a folder owned by `owner`, add one prompt, return the folder id."""
    name = f"TEST_pack_{uuid.uuid4().hex[:6]}"
    r = requests.post(f"{API}/folders", json={"name": name}, headers=_auth(owner["token"]), timeout=15)
    assert r.status_code == 200, r.text
    fid = r.json()["id"]
    r2 = requests.post(f"{API}/folders/{fid}/items", json={"prompt_id": some_prompt_id},
                       headers=_auth(owner["token"]), timeout=15)
    assert r2.status_code == 200, r2.text
    yield fid
    # teardown
    requests.delete(f"{API}/folders/{fid}", headers=_auth(owner["token"]), timeout=15)


# ---------- Feature 1: Report Prompt ----------

class TestReportPrompt:

    def test_requires_auth(self, some_prompt_id):
        r = requests.post(f"{API}/prompts/{some_prompt_id}/report", json={"reason": "spam"}, timeout=15)
        assert r.status_code == 401

    def test_valid_reason(self, viewer, some_prompt_id):
        r = requests.post(f"{API}/prompts/{some_prompt_id}/report",
                          json={"reason": "spam", "details": "TEST_spam"},
                          headers=_auth(viewer["token"]), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["success"] is True
        assert data["reason"] == "spam"

    def test_invalid_reason_coerced_to_other(self, viewer, some_prompt_id):
        r = requests.post(f"{API}/prompts/{some_prompt_id}/report",
                          json={"reason": "notarealreason"},
                          headers=_auth(viewer["token"]), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["reason"] == "other"

    def test_idempotent_upsert(self, other_user, some_prompt_id):
        # First report
        r1 = requests.post(f"{API}/prompts/{some_prompt_id}/report",
                           json={"reason": "copied"},
                           headers=_auth(other_user["token"]), timeout=15)
        assert r1.status_code == 200
        # Second report same user+prompt should still succeed (upsert), not error
        r2 = requests.post(f"{API}/prompts/{some_prompt_id}/report",
                           json={"reason": "low_quality"},
                           headers=_auth(other_user["token"]), timeout=15)
        assert r2.status_code == 200
        assert r2.json()["reason"] == "low_quality"

    def test_report_prompt_still_visible(self, some_prompt_id):
        r = requests.get(f"{API}/prompts/{some_prompt_id}", timeout=15)
        assert r.status_code == 200
        assert r.json()["id"] == some_prompt_id

    def test_report_nonexistent_returns_404(self, viewer):
        r = requests.post(f"{API}/prompts/ffffffffffffffffffffffffffffffff/report",
                          json={"reason": "spam"},
                          headers=_auth(viewer["token"]), timeout=15)
        assert r.status_code == 404


# ---------- Feature 2: Publish Folder ----------

class TestPublishFolder:

    def test_publish_toggles_true(self, owner, owner_folder):
        r = requests.post(f"{API}/folders/{owner_folder}/publish",
                          headers=_auth(owner["token"]), timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["is_public"] is True

    def test_folder_get_shows_public_and_followers(self, owner, owner_folder):
        r = requests.get(f"{API}/folders/{owner_folder}", headers=_auth(owner["token"]), timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["is_public"] is True
        assert "followers" in data and isinstance(data["followers"], int)

    def test_folders_list_includes_public_and_followers(self, owner, owner_folder):
        r = requests.get(f"{API}/folders", headers=_auth(owner["token"]), timeout=15)
        assert r.status_code == 200
        folders = r.json()
        mine = next((f for f in folders if f["id"] == owner_folder), None)
        assert mine is not None
        assert mine["is_public"] is True
        assert "followers" in mine

    def test_publish_owner_only(self, other_user, owner_folder):
        r = requests.post(f"{API}/folders/{owner_folder}/publish",
                          headers=_auth(other_user["token"]), timeout=15)
        assert r.status_code == 404

    def test_publish_requires_auth(self, owner_folder):
        r = requests.post(f"{API}/folders/{owner_folder}/publish", timeout=15)
        assert r.status_code == 401

    def test_publish_toggles_back_to_false(self, owner, owner_folder):
        # Currently True (from first test). Toggle -> False.
        r = requests.post(f"{API}/folders/{owner_folder}/publish",
                          headers=_auth(owner["token"]), timeout=15)
        assert r.status_code == 200
        assert r.json()["is_public"] is False
        # Set back to True for subsequent tests
        r2 = requests.post(f"{API}/folders/{owner_folder}/publish",
                           headers=_auth(owner["token"]), timeout=15)
        assert r2.json()["is_public"] is True


# ---------- Feature 3: Community Folders & Follow ----------

class TestCommunityFolders:

    def test_list_returns_public_only_with_count(self, viewer, owner_folder):
        # Ensure our folder is public before listing
        r = requests.get(f"{API}/community-folders", headers=_auth(viewer["token"]), timeout=15)
        assert r.status_code == 200
        packs = r.json()
        assert isinstance(packs, list)
        # Should include the owner_folder (public + count>=1)
        found = next((p for p in packs if p["id"] == owner_folder), None)
        assert found is not None, "public folder not in community list"
        # Required fields
        for k in ("owner_name", "followers", "is_following", "is_mine", "emoji", "count", "name"):
            assert k in found, f"missing {k} in community pack"
        assert found["count"] >= 1
        assert found["is_mine"] is False  # viewer != owner
        assert found["is_following"] is False

    def test_list_excludes_empty_folders(self, owner, viewer):
        # Create an empty published folder — should NOT show in community list
        r = requests.post(f"{API}/folders", json={"name": f"TEST_empty_{uuid.uuid4().hex[:6]}"},
                          headers=_auth(owner["token"]), timeout=15)
        assert r.status_code == 200
        empty_fid = r.json()["id"]
        requests.post(f"{API}/folders/{empty_fid}/publish",
                      headers=_auth(owner["token"]), timeout=15)
        try:
            r2 = requests.get(f"{API}/community-folders", headers=_auth(viewer["token"]), timeout=15)
            assert r2.status_code == 200
            packs = r2.json()
            assert not any(p["id"] == empty_fid for p in packs), "empty folder leaked into community list"
        finally:
            requests.delete(f"{API}/folders/{empty_fid}", headers=_auth(owner["token"]), timeout=15)

    def test_detail_public_folder(self, viewer, owner_folder):
        r = requests.get(f"{API}/community-folders/{owner_folder}",
                         headers=_auth(viewer["token"]), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["id"] == owner_folder
        assert "prompts" in data and isinstance(data["prompts"], list)
        assert data["is_mine"] is False
        assert "owner_name" in data
        assert "followers" in data

    def test_detail_unpublished_returns_404(self, owner, viewer):
        # Create private folder, try to fetch as viewer
        r = requests.post(f"{API}/folders", json={"name": f"TEST_priv_{uuid.uuid4().hex[:6]}"},
                          headers=_auth(owner["token"]), timeout=15)
        priv_fid = r.json()["id"]
        try:
            r2 = requests.get(f"{API}/community-folders/{priv_fid}",
                              headers=_auth(viewer["token"]), timeout=15)
            assert r2.status_code == 404
        finally:
            requests.delete(f"{API}/folders/{priv_fid}", headers=_auth(owner["token"]), timeout=15)

    def test_follow_requires_auth(self, owner_folder):
        r = requests.post(f"{API}/community-folders/{owner_folder}/follow", timeout=15)
        assert r.status_code == 401

    def test_follow_toggles(self, viewer, owner_folder):
        # follow
        r = requests.post(f"{API}/community-folders/{owner_folder}/follow",
                          headers=_auth(viewer["token"]), timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["is_following"] is True
        assert data["followers"] >= 1
        first_count = data["followers"]

        # detail should reflect is_following=True
        d = requests.get(f"{API}/community-folders/{owner_folder}",
                         headers=_auth(viewer["token"]), timeout=15).json()
        assert d["is_following"] is True
        assert d["followers"] == first_count

        # unfollow
        r2 = requests.post(f"{API}/community-folders/{owner_folder}/follow",
                           headers=_auth(viewer["token"]), timeout=15)
        assert r2.status_code == 200
        assert r2.json()["is_following"] is False
        assert r2.json()["followers"] == first_count - 1

    def test_follow_non_public_returns_404(self, owner, viewer):
        r = requests.post(f"{API}/folders", json={"name": f"TEST_priv2_{uuid.uuid4().hex[:6]}"},
                          headers=_auth(owner["token"]), timeout=15)
        priv_fid = r.json()["id"]
        try:
            r2 = requests.post(f"{API}/community-folders/{priv_fid}/follow",
                               headers=_auth(viewer["token"]), timeout=15)
            assert r2.status_code == 404
        finally:
            requests.delete(f"{API}/folders/{priv_fid}", headers=_auth(owner["token"]), timeout=15)

    def test_is_mine_true_for_owner(self, owner, owner_folder):
        r = requests.get(f"{API}/community-folders", headers=_auth(owner["token"]), timeout=15)
        assert r.status_code == 200
        mine = next((p for p in r.json() if p["id"] == owner_folder), None)
        assert mine is not None
        assert mine["is_mine"] is True


# ---------- Regression on previous features ----------

class TestRegression:

    def test_potd_stable(self):
        r1 = requests.get(f"{API}/prompt-of-the-day", timeout=15)
        r2 = requests.get(f"{API}/prompt-of-the-day", timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        assert r1.json()["id"] == r2.json()["id"]

    def test_trending_week(self):
        r = requests.get(f"{API}/trending-week", params={"limit": 5}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) <= 5

    def test_save_to_folder_flow(self, owner, some_prompt_id):
        r = requests.post(f"{API}/folders", json={"name": f"TEST_reg_{uuid.uuid4().hex[:6]}"},
                          headers=_auth(owner["token"]), timeout=15)
        fid = r.json()["id"]
        try:
            r2 = requests.post(f"{API}/folders/{fid}/items", json={"prompt_id": some_prompt_id},
                               headers=_auth(owner["token"]), timeout=15)
            assert r2.status_code == 200
            assert r2.json()["count"] == 1
            r3 = requests.get(f"{API}/folders/{fid}", headers=_auth(owner["token"]), timeout=15)
            assert r3.status_code == 200
            assert len(r3.json()["prompts"]) == 1
        finally:
            requests.delete(f"{API}/folders/{fid}", headers=_auth(owner["token"]), timeout=15)
