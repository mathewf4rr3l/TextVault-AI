from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import hashlib
import httpx
import uuid
import time
import secrets
from collections import defaultdict
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta, date

from taxonomy import (
    CATEGORIES, TOOLS, INDUSTRIES, DIFFICULTIES, CONTENT_TYPES, RANKS,
    COLLECTIONS, COLLECTIONS_BY_ID, PACKAGES,
    compute_score, rank_for_score, next_rank_for_score, streak_badge,
)
from seed_data import SEED_PROMPTS
from emergentintegrations.payments.stripe.checkout import (
    StripeCheckout, CheckoutSessionRequest,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'promptveer_db')]

app = FastAPI(title="PromptVeer")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OFFICIAL_AUTHOR_ID = "promptveer_official"
OFFICIAL_AUTHOR_NAME = "PromptVeer"


# ==================== RATE LIMITING ====================

class RateLimiter:
    """Simple in-memory sliding-window rate limiter."""

    def __init__(self, max_calls: int, window_seconds: int):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._calls: Dict[str, List[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.window_seconds
        calls = self._calls[key]
        self._calls[key] = [t for t in calls if t > window_start]
        if len(self._calls[key]) >= self.max_calls:
            return False
        self._calls[key].append(now)
        return True


guest_rate_limiter = RateLimiter(max_calls=5, window_seconds=60)
auth_session_rate_limiter = RateLimiter(max_calls=5, window_seconds=60)
create_rate_limiter = RateLimiter(max_calls=30, window_seconds=60)


# ==================== MODELS ====================

class SessionExchangeRequest(BaseModel):
    session_id: str


class GuestSessionRequest(BaseModel):
    device_id: str = Field(..., min_length=8, max_length=256)


class PromptCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=140)
    content: str = Field(..., min_length=10, max_length=8000)
    category: str = Field(..., max_length=60)
    subcategory: Optional[str] = Field(None, max_length=80)
    tool: Optional[str] = Field(None, max_length=40)
    industry: Optional[str] = Field(None, max_length=40)
    difficulty: Optional[str] = Field("Beginner", max_length=20)
    use_case: Optional[str] = Field(None, max_length=80)
    content_type: Optional[str] = Field("Text", max_length=20)


class PromptUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=140)
    content: Optional[str] = Field(None, max_length=8000)
    category: Optional[str] = Field(None, max_length=60)
    subcategory: Optional[str] = Field(None, max_length=80)
    tool: Optional[str] = Field(None, max_length=40)
    industry: Optional[str] = Field(None, max_length=40)
    difficulty: Optional[str] = Field(None, max_length=20)
    use_case: Optional[str] = Field(None, max_length=80)
    content_type: Optional[str] = Field(None, max_length=20)


# ==================== AUTH HELPERS ====================

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.split(" ", 1)[1]

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    expires_at = session.get("expires_at")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None


def user_to_dict(user: dict) -> dict:
    u = dict(user)
    u.pop("_id", None)
    if isinstance(u.get("created_at"), datetime):
        u["created_at"] = u["created_at"].isoformat()
    return u


# ==================== GAMIFICATION ====================

async def recompute_gamification(user_id: str) -> dict:
    """Recompute a user's stats/rank from their prompts + accrued bonus points."""
    uploads = await db.prompts.count_documents({"author_id": user_id})
    agg = await db.prompts.aggregate([
        {"$match": {"author_id": user_id}},
        {"$group": {"_id": None, "likes": {"$sum": "$likes"}, "shares": {"$sum": "$shares"}}},
    ]).to_list(1)
    likes_received = agg[0]["likes"] if agg else 0
    shares_received = agg[0]["shares"] if agg else 0
    existing = await db.gamification.find_one({"user_id": user_id}, {"_id": 0, "bonus_points": 1})
    bonus = (existing or {}).get("bonus_points", 0)
    score = compute_score(uploads, likes_received, shares_received) + bonus
    rank = rank_for_score(score)
    stats = {
        "user_id": user_id,
        "prompts_uploaded": uploads,
        "likes_received": likes_received,
        "shares_received": shares_received,
        "score": score,
        "level": rank["level"],
        "rank_name": rank["name"],
        "medal": rank["medal"],
        "updated_at": datetime.now(timezone.utc),
    }
    await db.gamification.update_one({"user_id": user_id}, {"$set": stats}, upsert=True)
    return await db.gamification.find_one({"user_id": user_id}, {"_id": 0})


def build_profile_stats(stats: dict) -> dict:
    score = stats.get("score", 0)
    rank = rank_for_score(score)
    nxt = next_rank_for_score(score)
    progress = 1.0
    to_next = 0
    if nxt:
        span = nxt["min_score"] - rank["min_score"]
        progress = (score - rank["min_score"]) / span if span > 0 else 0.0
        to_next = nxt["min_score"] - score
    return {
        "prompts_uploaded": stats.get("prompts_uploaded", 0),
        "likes_received": stats.get("likes_received", 0),
        "shares_received": stats.get("shares_received", 0),
        "score": score,
        "copy_streak": stats.get("copy_streak", 0),
        "longest_streak": stats.get("longest_streak", 0),
        "total_copies": stats.get("total_copies", 0),
        "bonus_points": stats.get("bonus_points", 0),
        "streak_badge": streak_badge(stats.get("copy_streak", 0)),
        "rank": {"level": rank["level"], "name": rank["name"], "medal": rank["medal"],
                 "color": rank["color"], "title": rank["title"]},
        "next_rank": ({"level": nxt["level"], "name": nxt["name"], "medal": nxt["medal"],
                       "color": nxt["color"], "min_score": nxt["min_score"]} if nxt else None),
        "progress": round(max(0.0, min(1.0, progress)), 3),
        "points_to_next": max(0, to_next),
    }


# ==================== PROMPT SERIALIZATION ====================

def prompt_to_dict(doc: dict, liked_ids: Optional[set] = None) -> dict:
    d = dict(doc)
    d.pop("_id", None)
    if isinstance(d.get("created_at"), datetime):
        d["created_at"] = d["created_at"].isoformat()
    if isinstance(d.get("updated_at"), datetime):
        d["updated_at"] = d["updated_at"].isoformat()
    d["is_liked"] = bool(liked_ids and d.get("id") in liked_ids)
    return d


async def liked_ids_for(user_id: Optional[str], prompt_ids: List[str]) -> set:
    if not user_id or not prompt_ids:
        return set()
    cursor = db.prompt_likes.find(
        {"user_id": user_id, "prompt_id": {"$in": prompt_ids}}, {"_id": 0, "prompt_id": 1})
    return {r["prompt_id"] for r in await cursor.to_list(len(prompt_ids))}


# ==================== AUTH ROUTES ====================

@api_router.post("/auth/session")
async def exchange_session(body: SessionExchangeRequest, request: Request):
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    if not auth_session_rate_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="Too many authentication requests.")
    try:
        async with httpx.AsyncClient() as hclient:
            response = await hclient.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": body.session_id},
                timeout=15.0,
            )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session")

        data = response.json()
        email = data.get("email")
        name = data.get("name", "")
        picture = data.get("picture", "")
        session_token = data.get("session_token")

        if not email or not session_token:
            raise HTTPException(status_code=401, detail="Invalid session data")

        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if existing:
            user_id = existing["user_id"]
            await db.users.update_one({"email": email}, {"$set": {"name": name, "picture": picture}})
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": user_id, "email": email, "name": name, "picture": picture,
                "created_at": datetime.now(timezone.utc),
            })
            await recompute_gamification(user_id)

        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        await db.user_sessions.insert_one({
            "session_token": session_token, "user_id": user_id,
            "expires_at": expires_at, "created_at": datetime.now(timezone.utc),
        })

        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        return {"session_token": session_token, "user": user_to_dict(user)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session exchange error: {e}")
        raise HTTPException(status_code=401, detail="Authentication failed")


@api_router.post("/auth/guest")
async def create_guest_session(body: GuestSessionRequest, request: Request):
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    if not guest_rate_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait before trying again.")
    try:
        device_hash = hashlib.sha256(body.device_id[:128].encode()).hexdigest()[:16]
        user_id = f"guest_{device_hash}"
        guest_email = f"guest_{device_hash}@local.promptveer"

        await db.users.update_one(
            {"user_id": user_id},
            {"$setOnInsert": {
                "user_id": user_id, "email": guest_email,
                "name": f"Warrior {device_hash[:4].upper()}", "picture": "",
                "is_guest": True, "created_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
        await recompute_gamification(user_id)

        session_token = f"guest_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        await db.user_sessions.insert_one({
            "session_token": session_token, "user_id": user_id,
            "expires_at": expires_at, "created_at": datetime.now(timezone.utc),
        })

        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        return {"session_token": session_token, "user": user_to_dict(user)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Guest session error: {e}")
        raise HTTPException(status_code=500, detail="Could not create guest session")


@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return user_to_dict(current_user)


@api_router.post("/auth/logout")
async def logout_user(request: Request):
    auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1]
        await db.user_sessions.delete_one({"session_token": token})
    return {"success": True}


# ==================== TAXONOMY / META ====================

@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "PromptVeer"}


@api_router.get("/taxonomy")
async def get_taxonomy():
    return {
        "categories": CATEGORIES,
        "tools": TOOLS,
        "industries": INDUSTRIES,
        "difficulties": DIFFICULTIES,
        "content_types": CONTENT_TYPES,
        "ranks": RANKS,
    }


# ==================== PROMPTS ====================

def _build_prompt_query(category, subcategory, tool, industry, difficulty, content_type, use_case, q):
    query: Dict[str, Any] = {}
    if category and category != "All":
        query["category"] = category
    if subcategory:
        query["subcategory"] = subcategory
    if tool:
        query["tool"] = tool
    if industry:
        query["industry"] = industry
    if difficulty:
        query["difficulty"] = difficulty
    if content_type:
        query["content_type"] = content_type
    if use_case:
        query["use_case"] = use_case
    if q and q.strip():
        escaped = re.escape(q.strip())
        query["$or"] = [
            {"title": {"$regex": escaped, "$options": "i"}},
            {"content": {"$regex": escaped, "$options": "i"}},
            {"category": {"$regex": escaped, "$options": "i"}},
            {"subcategory": {"$regex": escaped, "$options": "i"}},
            {"tool": {"$regex": escaped, "$options": "i"}},
        ]
    return query


@api_router.get("/prompts")
async def list_prompts(
    request: Request,
    category: Optional[str] = Query(None),
    subcategory: Optional[str] = Query(None),
    tool: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    content_type: Optional[str] = Query(None),
    use_case: Optional[str] = Query(None),
    q: Optional[str] = Query(None, max_length=200),
    sort: str = Query("trending"),
    limit: int = Query(30, ge=1, le=100),
    skip: int = Query(0, ge=0, le=10000),
):
    query = _build_prompt_query(category, subcategory, tool, industry, difficulty, content_type, use_case, q)
    if sort == "newest":
        sort_spec = [("created_at", -1)]
    elif sort == "top":
        sort_spec = [("likes", -1), ("created_at", -1)]
    else:  # trending
        sort_spec = [("trending_score", -1), ("created_at", -1)]
    cursor = db.prompts.find(query, {"_id": 0}).sort(sort_spec).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    user = await get_optional_user(request)
    liked = await liked_ids_for(user["user_id"] if user else None, [d["id"] for d in docs])
    return [prompt_to_dict(d, liked) for d in docs]


@api_router.get("/discover")
async def discover(request: Request):
    user = await get_optional_user(request)
    uid = user["user_id"] if user else None
    trending = await db.prompts.find({}, {"_id": 0}).sort([("trending_score", -1)]).limit(10).to_list(10)
    newest = await db.prompts.find({}, {"_id": 0}).sort([("created_at", -1)]).limit(10).to_list(10)
    top = await db.prompts.find({}, {"_id": 0}).sort([("likes", -1)]).limit(10).to_list(10)
    all_ids = [d["id"] for d in trending + newest + top]
    liked = await liked_ids_for(uid, all_ids)
    # Categories with counts
    counts = await db.prompts.aggregate([
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]).to_list(100)
    count_map = {c["_id"]: c["count"] for c in counts}
    cats = [{"name": c["name"], "emoji": c["emoji"], "count": count_map.get(c["name"], 0)}
            for c in CATEGORIES]
    return {
        "trending": [prompt_to_dict(d, liked) for d in trending],
        "newest": [prompt_to_dict(d, liked) for d in newest],
        "top": [prompt_to_dict(d, liked) for d in top],
        "categories": cats,
    }


@api_router.get("/prompts/{prompt_id}")
async def get_prompt(prompt_id: str, request: Request):
    doc = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Prompt not found")
    user = await get_optional_user(request)
    liked = await liked_ids_for(user["user_id"] if user else None, [prompt_id])
    return prompt_to_dict(doc, liked)


@api_router.post("/prompts")
async def create_prompt(body: PromptCreate, request: Request, current_user: dict = Depends(get_current_user)):
    if not create_rate_limiter.is_allowed(current_user["user_id"]):
        raise HTTPException(status_code=429, detail="Too many uploads. Please slow down.")
    now = datetime.now(timezone.utc)
    doc = {
        "id": uuid.uuid4().hex,
        "title": body.title.strip(),
        "content": body.content.strip(),
        "category": body.category,
        "subcategory": body.subcategory,
        "tool": body.tool,
        "industry": body.industry,
        "difficulty": body.difficulty or "Beginner",
        "use_case": body.use_case,
        "content_type": body.content_type or "Text",
        "author_id": current_user["user_id"],
        "author_name": current_user.get("name") or "Anonymous",
        "likes": 0,
        "shares": 0,
        "trending_score": 0,
        "created_at": now,
        "updated_at": now,
    }
    await db.prompts.insert_one(doc)
    await recompute_gamification(current_user["user_id"])
    return prompt_to_dict(doc, set())


@api_router.put("/prompts/{prompt_id}")
async def update_prompt(prompt_id: str, body: PromptUpdate, current_user: dict = Depends(get_current_user)):
    doc = await db.prompts.find_one({"id": prompt_id})
    if not doc:
        raise HTTPException(404, "Prompt not found")
    if doc["author_id"] != current_user["user_id"]:
        raise HTTPException(403, "You can only edit your own prompts")
    update_dict: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
    for field in ("title", "content", "category", "subcategory", "tool", "industry",
                  "difficulty", "use_case", "content_type"):
        val = getattr(body, field)
        if val is not None:
            update_dict[field] = val
    await db.prompts.update_one({"id": prompt_id}, {"$set": update_dict})
    updated = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    return prompt_to_dict(updated, set())


@api_router.delete("/prompts/{prompt_id}")
async def delete_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.prompts.find_one({"id": prompt_id})
    if not doc:
        raise HTTPException(404, "Prompt not found")
    if doc["author_id"] != current_user["user_id"]:
        raise HTTPException(403, "You can only delete your own prompts")
    await db.prompts.delete_one({"id": prompt_id})
    await db.prompt_likes.delete_many({"prompt_id": prompt_id})
    await recompute_gamification(doc["author_id"])
    return {"success": True}


@api_router.post("/prompts/{prompt_id}/like")
async def toggle_like(prompt_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.prompts.find_one({"id": prompt_id})
    if not doc:
        raise HTTPException(404, "Prompt not found")
    uid = current_user["user_id"]
    existing = await db.prompt_likes.find_one({"user_id": uid, "prompt_id": prompt_id})
    if existing:
        await db.prompt_likes.delete_one({"user_id": uid, "prompt_id": prompt_id})
        await db.prompts.update_one({"id": prompt_id}, {"$inc": {"likes": -1, "trending_score": -3}})
        liked = False
    else:
        await db.prompt_likes.insert_one({"user_id": uid, "prompt_id": prompt_id,
                                          "created_at": datetime.now(timezone.utc)})
        await db.prompts.update_one({"id": prompt_id}, {"$inc": {"likes": 1, "trending_score": 3}})
        liked = True
    await recompute_gamification(doc["author_id"])
    updated = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    return {"is_liked": liked, "likes": updated["likes"]}


@api_router.post("/prompts/{prompt_id}/share")
async def share_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    doc = await db.prompts.find_one({"id": prompt_id})
    if not doc:
        raise HTTPException(404, "Prompt not found")
    await db.prompts.update_one({"id": prompt_id}, {"$inc": {"shares": 1, "trending_score": 2}})
    await recompute_gamification(doc["author_id"])
    updated = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    return {"shares": updated["shares"]}


@api_router.post("/prompts/{prompt_id}/copy")
async def copy_prompt(prompt_id: str, current_user: dict = Depends(get_current_user)):
    """Record a copy event and update the copier's daily streak + bonus points."""
    doc = await db.prompts.find_one({"id": prompt_id})
    if not doc:
        raise HTTPException(404, "Prompt not found")
    await db.prompts.update_one({"id": prompt_id}, {"$inc": {"copies": 1, "trending_score": 1}})

    uid = current_user["user_id"]
    g = await db.gamification.find_one({"user_id": uid}) or {}
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    last = g.get("last_copy_date")
    streak = g.get("copy_streak", 0)
    longest = g.get("longest_streak", 0)
    bonus = g.get("bonus_points", 0)
    total = g.get("total_copies", 0) + 1
    awarded = 0

    if last != today:
        streak = streak + 1 if last == yesterday else 1
        awarded += 2  # base reward for showing up
        if streak == 3:
            awarded += 10
        elif streak == 7:
            awarded += 25
        elif streak == 30:
            awarded += 100
        bonus += awarded
        longest = max(longest, streak)
        last = today

    await db.gamification.update_one(
        {"user_id": uid},
        {"$set": {
            "user_id": uid,
            "copy_streak": streak,
            "longest_streak": longest,
            "last_copy_date": last,
            "bonus_points": bonus,
            "total_copies": total,
        }},
        upsert=True,
    )
    await recompute_gamification(uid)  # folds bonus into score

    updated = await db.prompts.find_one({"id": prompt_id}, {"_id": 0})
    return {
        "copies": updated.get("copies", 0),
        "streak": streak,
        "points_awarded": awarded,
        "badge": streak_badge(streak),
    }


# ==================== LIBRARY / PROFILE ====================

@api_router.get("/library")
async def get_library(
    request: Request,
    type: str = Query("uploads"),
    current_user: dict = Depends(get_current_user),
):
    uid = current_user["user_id"]
    if type == "liked":
        likes = await db.prompt_likes.find({"user_id": uid}, {"_id": 0, "prompt_id": 1}) \
            .sort("created_at", -1).to_list(200)
        ids = [l["prompt_id"] for l in likes]
        docs = await db.prompts.find({"id": {"$in": ids}}, {"_id": 0}).to_list(200)
        order = {pid: i for i, pid in enumerate(ids)}
        docs.sort(key=lambda d: order.get(d["id"], 9999))
        return [prompt_to_dict(d, set(ids)) for d in docs]
    # uploads
    docs = await db.prompts.find({"author_id": uid}, {"_id": 0}).sort("created_at", -1).to_list(200)
    liked = await liked_ids_for(uid, [d["id"] for d in docs])
    return [prompt_to_dict(d, liked) for d in docs]


@api_router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    uid = current_user["user_id"]
    stats = await db.gamification.find_one({"user_id": uid}, {"_id": 0})
    if not stats:
        stats = await recompute_gamification(uid)
    return {
        "user": user_to_dict(current_user),
        "stats": build_profile_stats(stats),
    }


@api_router.get("/leaderboard")
async def leaderboard(limit: int = Query(20, ge=1, le=50)):
    top = await db.gamification.find({"score": {"$gt": 0}}, {"_id": 0}) \
        .sort("score", -1).limit(limit).to_list(limit)
    result = []
    for s in top:
        u = await db.users.find_one({"user_id": s["user_id"]}, {"_id": 0, "name": 1, "picture": 1})
        rank = rank_for_score(s.get("score", 0))
        result.append({
            "user_id": s["user_id"],
            "name": (u or {}).get("name", "Warrior"),
            "picture": (u or {}).get("picture", ""),
            "score": s.get("score", 0),
            "prompts_uploaded": s.get("prompts_uploaded", 0),
            "rank": {"level": rank["level"], "name": rank["name"], "medal": rank["medal"],
                     "color": rank["color"]},
        })
    return result


# ==================== COLLECTIONS ====================

def _collection_filter(spec: dict) -> dict:
    q: Dict[str, Any] = {}
    for k, v in spec.items():
        q[k] = v
    return q


@api_router.get("/collections")
async def list_collections(request: Request):
    user = await get_optional_user(request)
    uid = user["user_id"] if user else None
    out = []
    for c in COLLECTIONS:
        q = _collection_filter(c["filter"])
        count = await db.prompts.count_documents(q)
        preview = await db.prompts.find(q, {"_id": 0}).sort([("likes", -1)]).limit(4).to_list(4)
        liked = await liked_ids_for(uid, [p["id"] for p in preview])
        out.append({
            "id": c["id"], "title": c["title"], "subtitle": c["subtitle"],
            "emoji": c["emoji"], "color": c["color"], "count": count,
            "preview": [prompt_to_dict(p, liked) for p in preview],
        })
    return out


@api_router.get("/collections/{collection_id}")
async def get_collection(collection_id: str, request: Request):
    c = COLLECTIONS_BY_ID.get(collection_id)
    if not c:
        raise HTTPException(404, "Collection not found")
    q = _collection_filter(c["filter"])
    docs = await db.prompts.find(q, {"_id": 0}).sort([("likes", -1)]).limit(100).to_list(100)
    user = await get_optional_user(request)
    liked = await liked_ids_for(user["user_id"] if user else None, [d["id"] for d in docs])
    return {
        "id": c["id"], "title": c["title"], "subtitle": c["subtitle"],
        "emoji": c["emoji"], "color": c["color"], "count": len(docs),
        "prompts": [prompt_to_dict(d, liked) for d in docs],
    }


# ==================== PAYMENTS (Stripe infra — all content free for MVP) ====================

class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str = Field(..., max_length=300)


STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
PAYMENTS_ENABLED = STRIPE_API_KEY not in ("", "sk_test_emergent")


def _stripe_client(origin_url: str) -> StripeCheckout:
    # /api routes to this backend via ingress, so the webhook lives under the app origin.
    webhook_url = f"{origin_url.rstrip('/')}/api/webhook/stripe"
    return StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)


@api_router.get("/payments/packages")
async def payment_packages():
    return {
        "enabled": PAYMENTS_ENABLED,
        "packages": [{"id": pid, **{k: v for k, v in pkg.items()}} for pid, pkg in PACKAGES.items()],
    }


@api_router.post("/payments/checkout")
async def create_checkout(body: CheckoutRequest, current_user: dict = Depends(get_current_user)):
    if not PAYMENTS_ENABLED:
        raise HTTPException(503, "Payments activate after the app is published.")
    pkg = PACKAGES.get(body.package_id)
    if not pkg:
        raise HTTPException(400, "Unknown package")
    # Amount is chosen SERVER-SIDE from the package table — never from the client.
    amount = float(pkg["amount"])
    currency = pkg["currency"]
    origin = body.origin_url.rstrip("/")
    success_url = f"{origin}/upgrade?status=success"
    cancel_url = f"{origin}/upgrade?status=cancel"
    try:
        stripe = _stripe_client(origin)
        req = CheckoutSessionRequest(
            amount=amount,
            currency=currency,
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": current_user["user_id"], "package_id": body.package_id},
        )
        session = await stripe.create_checkout_session(req)
    except Exception as e:
        logger.error(f"Stripe checkout error: {e}")
        raise HTTPException(502, "Could not start checkout")

    await db.payment_transactions.update_one(
        {"session_id": session.session_id},
        {"$setOnInsert": {
            "session_id": session.session_id,
            "user_id": current_user["user_id"],
            "package_id": body.package_id,
            "amount": amount,
            "currency": currency,
            "payment_status": "initiated",
            "status": "open",
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return {"url": session.url, "session_id": session.session_id}


@api_router.get("/payments/status/{session_id}")
async def payment_status(session_id: str, current_user: dict = Depends(get_current_user)):
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(404, "Transaction not found")
    if txn["user_id"] != current_user["user_id"]:
        raise HTTPException(403, "Not your transaction")
    try:
        stripe = _stripe_client(current_user.get("origin", "https://example.com"))
        status = await stripe.get_checkout_status(session_id)
    except Exception as e:
        logger.error(f"Stripe status error: {e}")
        raise HTTPException(502, "Could not fetch status")

    # Only update once; do not re-process an already-paid transaction.
    if txn.get("payment_status") != "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": status.payment_status,
                "status": status.status,
                "amount_total": getattr(status, "amount_total", None),
                "last_checked_at": datetime.now(timezone.utc),
            }},
        )
    return {
        "session_id": session_id,
        "status": status.status,
        "payment_status": status.payment_status,
        "paid": status.payment_status == "paid",
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature")
    try:
        stripe = _stripe_client(os.environ.get("FRONTEND_URL", "https://example.com"))
        event = await stripe.handle_webhook(body, sig)
    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        raise HTTPException(400, "Invalid webhook")

    session_id = getattr(event, "session_id", None)
    if session_id:
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {
                "payment_status": getattr(event, "payment_status", None),
                "status": getattr(event, "status", None),
                "webhook_at": datetime.now(timezone.utc),
            }},
        )
    return {"received": True}


# ==================== APP SETUP ====================

app.include_router(api_router)

_ALLOWED_ORIGINS = [
    os.environ.get("FRONTEND_URL", "https://textvault-ai.preview.emergentagent.com"),
    "http://localhost:3000",
    "http://localhost:8001",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


async def seed_prompts_if_empty():
    count = await db.prompts.count_documents({})
    if count > 0:
        return
    logger.info("Seeding sample prompts...")
    await db.users.update_one(
        {"user_id": OFFICIAL_AUTHOR_ID},
        {"$setOnInsert": {
            "user_id": OFFICIAL_AUTHOR_ID,
            "email": "team@promptveer.app",
            "name": OFFICIAL_AUTHOR_NAME,
            "picture": "",
            "is_official": True,
            "created_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    now = datetime.now(timezone.utc)
    docs = []
    for i, p in enumerate(SEED_PROMPTS):
        likes = int(p.get("likes", 0))
        shares = int(p.get("shares", 0))
        docs.append({
            "id": uuid.uuid4().hex,
            "title": p["title"],
            "content": p["content"],
            "category": p["category"],
            "subcategory": p.get("subcategory"),
            "tool": p.get("tool"),
            "industry": p.get("industry"),
            "difficulty": p.get("difficulty", "Beginner"),
            "use_case": p.get("use_case"),
            "content_type": p.get("content_type", "Text"),
            "author_id": OFFICIAL_AUTHOR_ID,
            "author_name": OFFICIAL_AUTHOR_NAME,
            "likes": likes,
            "shares": shares,
            "trending_score": likes * 3 + shares * 2,
            # Spread created_at so "newest" ordering looks natural
            "created_at": now - timedelta(hours=i),
            "updated_at": now - timedelta(hours=i),
        })
    if docs:
        await db.prompts.insert_many(docs)
    await recompute_gamification(OFFICIAL_AUTHOR_ID)
    logger.info(f"Seeded {len(docs)} prompts")


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True, sparse=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index([("expires_at", 1)], expireAfterSeconds=0)
        await db.prompts.create_index("id", unique=True)
        await db.prompts.create_index([("category", 1), ("created_at", -1)])
        await db.prompts.create_index([("trending_score", -1)])
        await db.prompts.create_index([("author_id", 1)])
        await db.prompt_likes.create_index([("user_id", 1), ("prompt_id", 1)], unique=True)
        await db.gamification.create_index("user_id", unique=True)
        await db.gamification.create_index([("score", -1)])
        await db.payment_transactions.create_index("session_id", unique=True)
        await db.payment_transactions.create_index([("user_id", 1), ("created_at", -1)])
        logger.info("DB indexes created")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")
    try:
        await seed_prompts_if_empty()
    except Exception as e:
        logger.error(f"Seeding error: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
