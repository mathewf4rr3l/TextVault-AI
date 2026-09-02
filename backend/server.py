from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import json
import hashlib
import httpx
import uuid
import time
import secrets
from collections import defaultdict
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'textvault_db')]

app = FastAPI(title="TextVault AI")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


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
        # Purge expired entries
        self._calls[key] = [t for t in calls if t > window_start]
        if len(self._calls[key]) >= self.max_calls:
            return False
        self._calls[key].append(now)
        return True


# 5 guest session requests per IP per minute
guest_rate_limiter = RateLimiter(max_calls=5, window_seconds=60)
# 10 PIN verify attempts per user per 5 minutes
pin_verify_rate_limiter = RateLimiter(max_calls=10, window_seconds=300)
# 5 session exchanges per IP per minute (Google auth)
auth_session_rate_limiter = RateLimiter(max_calls=5, window_seconds=60)


# ==================== PIN HASHING HELPERS ====================

PBKDF2_ITERATIONS = 260_000  # NIST recommendation 2024

def _hash_pin_pbkdf2(pin: str, salt_hex: Optional[str] = None) -> tuple:
    """Return (hash_hex, salt_hex) using PBKDF2-HMAC-SHA256."""
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, PBKDF2_ITERATIONS)
    return dk.hex(), salt.hex()


def _verify_pin(pin: str, stored_doc: dict) -> bool:
    """Verify PIN against stored document; handles both PBKDF2 and legacy SHA-256."""
    hash_type = stored_doc.get("hash_type", "sha256")
    stored_hash = stored_doc.get("value", "")
    if hash_type == "pbkdf2":
        salt_hex = stored_doc.get("salt", "")
        dk = hashlib.pbkdf2_hmac("sha256", pin.encode(), bytes.fromhex(salt_hex), PBKDF2_ITERATIONS)
        return secrets.compare_digest(dk.hex(), stored_hash)
    # Legacy SHA-256 (unsalted) — constant-time compare
    legacy = hashlib.sha256(pin.encode()).hexdigest()
    return secrets.compare_digest(legacy, stored_hash)


# ==================== MODELS ====================

class VaultEntry(BaseModel):
    id: Optional[str] = None
    content: str
    category: str = "Notes"
    tags: List[str] = []
    confidence: float = 0.0
    metadata: Dict[str, Any] = {}
    summary: Optional[str] = None
    is_favorite: bool = False
    is_archived: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class VaultEntryCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    category: Optional[str] = Field(None, max_length=50)
    tags: Optional[List[str]] = None


class VaultEntryUpdate(BaseModel):
    content: Optional[str] = Field(None, max_length=10000)
    category: Optional[str] = Field(None, max_length=50)
    tags: Optional[List[str]] = None
    summary: Optional[str] = Field(None, max_length=500)
    is_favorite: Optional[bool] = None
    is_archived: Optional[bool] = None


class ClassifyRequest(BaseModel):
    content: str


class ClassificationResult(BaseModel):
    category: str
    tags: List[str] = []
    confidence: float = 0.8
    metadata: Dict[str, Any] = {}
    summary: Optional[str] = None


class SearchRequest(BaseModel):
    query: str = Field(..., max_length=200)
    category: Optional[str] = Field(None, max_length=50)
    limit: int = Field(default=20, ge=1, le=100)


class PinRequest(BaseModel):
    pin: str


class PinResponse(BaseModel):
    success: bool
    message: str


class SessionExchangeRequest(BaseModel):
    session_id: str


class GuestSessionRequest(BaseModel):
    device_id: str = Field(..., min_length=8, max_length=256)


class User(BaseModel):
    user_id: str
    email: str
    name: str = ""
    picture: str = ""
    created_at: Optional[str] = None


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


def user_to_dict(user: dict) -> dict:
    u = dict(user)
    u.pop("_id", None)
    if isinstance(u.get("created_at"), datetime):
        u["created_at"] = u["created_at"].isoformat()
    return u


# ==================== VAULT HELPERS ====================

def doc_to_entry(doc: dict) -> VaultEntry:
    doc = dict(doc)
    doc['id'] = str(doc['_id'])
    doc.pop('_id', None)
    doc.pop('user_id', None)
    if isinstance(doc.get('created_at'), datetime):
        doc['created_at'] = doc['created_at'].isoformat()
    if isinstance(doc.get('updated_at'), datetime):
        doc['updated_at'] = doc['updated_at'].isoformat()
    return VaultEntry(**doc)


CATEGORY_PATTERNS = {
    "URL": [r'https?://[^\s]+', r'www\.[^\s]+\.[a-zA-Z]{2,}'],
    "PhoneNumber": [r'\+?[\d\s\-\(\)]{10,15}'],
    "Email": [r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'],
    "Date": [r'\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}', r'\d{4}[/\-]\d{2}[/\-]\d{2}'],
    "Financial": [
        r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b',
        r'UPI[:\s]\S+',
        r'\b[A-Z]{4}\d{7}\b',
    ],
    "ID": [r'\b[A-Z]{1,2}\d{6,10}\b', r'\b[A-Z]{5}\d{4}[A-Z]{1}\b'],
    "Address": [r'\b(street|st\.|avenue|ave|road|rd\.?|lane|drive|dr\.?|blvd|boulevard|nagar|colony)\b'],
}


def regex_classify(content: str) -> Optional[str]:
    for category, patterns in CATEGORY_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, content, re.IGNORECASE):
                return category
    return None


async def ai_classify(content: str) -> ClassificationResult:
    regex_cat = regex_classify(content)
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY', '')
        if not llm_key:
            raise ValueError("No LLM key")

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"clf-{hashlib.md5(content[:100].encode()).hexdigest()[:8]}",
            system_message="You are a text classification AI. Respond ONLY with valid JSON, no markdown."
        ).with_model("anthropic", "claude-haiku-4-5-20251001")

        prompt = f"""Classify this text. Categories: Notes, URL, PhoneNumber, Email, Date, Address, Financial, ID, Custom

Text: "{content[:500]}"

Respond ONLY with JSON:
{{"category": "Notes", "tags": ["tag1"], "confidence": 0.9, "metadata": {{}}, "summary": "brief description"}}"""

        response = await chat.send_message(UserMessage(text=prompt))
        start = response.find('{')
        end = response.rfind('}') + 1
        if start >= 0 and end > start:
            try:
                result = json.loads(response[start:end])
                return ClassificationResult(
                    category=result.get('category', regex_cat or 'Notes'),
                    tags=result.get('tags', [])[:5],
                    confidence=float(result.get('confidence', 0.85)),
                    metadata=result.get('metadata', {}),
                    summary=result.get('summary'),
                )
            except json.JSONDecodeError:
                pass
    except Exception as e:
        logger.warning(f"AI classification failed: {e}")

    return ClassificationResult(
        category=regex_cat or 'Notes',
        tags=[],
        confidence=0.65 if regex_cat else 0.4,
        metadata={},
        summary=None,
    )


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

        # Upsert user by email
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if existing:
            user_id = existing["user_id"]
            await db.users.update_one(
                {"email": email},
                {"$set": {"name": name, "picture": picture}}
            )
        else:
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            await db.users.insert_one({
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "created_at": datetime.now(timezone.utc),
            })

        # Store session
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        await db.user_sessions.insert_one({
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
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
    """Create or retrieve an anonymous guest session tied to a device ID."""
    client_ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown").split(",")[0].strip()
    if not guest_rate_limiter.is_allowed(client_ip):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait before trying again.")
    try:
        # Derive a stable user_id from the device_id
        device_hash = hashlib.sha256(body.device_id[:128].encode()).hexdigest()[:16]
        user_id = f"guest_{device_hash}"
        guest_email = f"guest_{device_hash}@local.textvault"

        # Upsert the guest user (create only if not exists)
        await db.users.update_one(
            {"user_id": user_id},
            {"$setOnInsert": {
                "user_id": user_id,
                "email": guest_email,
                "name": "Guest",
                "picture": "",
                "is_guest": True,
                "created_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

        # Create new session — 30-day expiry for guest (down from 365)
        session_token = f"guest_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=30)
        await db.user_sessions.insert_one({
            "session_token": session_token,
            "user_id": user_id,
            "expires_at": expires_at,
            "created_at": datetime.now(timezone.utc),
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


# ==================== AI ROUTES ====================

@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "TextVault AI"}


@api_router.post("/ai/classify", response_model=ClassificationResult)
async def classify_endpoint(req: ClassifyRequest, current_user: dict = Depends(get_current_user)):
    return await ai_classify(req.content)


@api_router.post("/ai/summarize")
async def summarize_endpoint(req: ClassifyRequest, current_user: dict = Depends(get_current_user)):
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY', '')
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"sum-{hashlib.md5(req.content[:100].encode()).hexdigest()[:8]}",
            system_message="You are a concise summarizer."
        ).with_model("anthropic", "claude-haiku-4-5-20251001")
        response = await chat.send_message(UserMessage(
            text=f"Summarize in 1-2 sentences:\n{req.content[:1500]}"
        ))
        return {"summary": response.strip()}
    except Exception as e:
        return {"summary": None}


# ==================== VAULT ENTRIES ====================

@api_router.post("/entries", response_model=VaultEntry)
async def create_entry(entry: VaultEntryCreate, current_user: dict = Depends(get_current_user)):
    classification = await ai_classify(entry.content)
    now = datetime.now(timezone.utc)
    doc = {
        "user_id": current_user["user_id"],
        "content": entry.content,
        "category": entry.category or classification.category,
        "tags": entry.tags if entry.tags is not None else classification.tags,
        "confidence": classification.confidence,
        "metadata": classification.metadata,
        "summary": classification.summary,
        "is_favorite": False,
        "is_archived": False,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.vault_entries.insert_one(doc)
    doc['id'] = str(result.inserted_id)
    doc.pop('_id', None)
    doc.pop('user_id', None)
    doc['created_at'] = now.isoformat()
    doc['updated_at'] = now.isoformat()
    return VaultEntry(**doc)


@api_router.get("/entries", response_model=List[VaultEntry])
async def list_entries(
    category: Optional[str] = Query(None),
    archived: bool = Query(False),
    favorites: bool = Query(False),
    limit: int = Query(100, ge=1, le=200),
    skip: int = Query(0, ge=0, le=10000),
    current_user: dict = Depends(get_current_user),
):
    query: Dict[str, Any] = {"user_id": current_user["user_id"], "is_archived": archived}
    if category and category != "All":
        query["category"] = category
    if favorites:
        query["is_favorite"] = True
    cursor = db.vault_entries.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    return [doc_to_entry(d) for d in docs]


@api_router.post("/entries/search", response_model=List[VaultEntry])
async def search_entries(req: SearchRequest, current_user: dict = Depends(get_current_user)):
    query: Dict[str, Any] = {"user_id": current_user["user_id"], "is_archived": False}
    if req.category and req.category != "All":
        query["category"] = req.category
    if req.query.strip():
        # Escape user input before using as regex to prevent ReDoS
        escaped = re.escape(req.query.strip())
        query["$or"] = [
            {"content": {"$regex": escaped, "$options": "i"}},
            {"tags": {"$elemMatch": {"$regex": escaped, "$options": "i"}}},
            {"summary": {"$regex": escaped, "$options": "i"}},
        ]
    limit = min(req.limit, 100)
    cursor = db.vault_entries.find(query).sort("created_at", -1).limit(limit)
    docs = await cursor.to_list(limit)
    return [doc_to_entry(d) for d in docs]


@api_router.get("/entries/{entry_id}", response_model=VaultEntry)
async def get_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    try:
        doc = await db.vault_entries.find_one(
            {"_id": ObjectId(entry_id), "user_id": current_user["user_id"]}
        )
    except Exception:
        raise HTTPException(400, "Invalid entry ID")
    if not doc:
        raise HTTPException(404, "Entry not found")
    return doc_to_entry(doc)


@api_router.put("/entries/{entry_id}", response_model=VaultEntry)
async def update_entry(entry_id: str, update: VaultEntryUpdate, current_user: dict = Depends(get_current_user)):
    update_dict: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
    if update.content is not None: update_dict["content"] = update.content
    if update.category is not None: update_dict["category"] = update.category
    if update.tags is not None: update_dict["tags"] = update.tags
    if update.summary is not None: update_dict["summary"] = update.summary
    if update.is_favorite is not None: update_dict["is_favorite"] = update.is_favorite
    if update.is_archived is not None: update_dict["is_archived"] = update.is_archived
    try:
        doc = await db.vault_entries.find_one_and_update(
            {"_id": ObjectId(entry_id), "user_id": current_user["user_id"]},
            {"$set": update_dict},
            return_document=True,
        )
    except Exception:
        raise HTTPException(400, "Invalid entry ID")
    if not doc:
        raise HTTPException(404, "Entry not found")
    return doc_to_entry(doc)


@api_router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str, current_user: dict = Depends(get_current_user)):
    try:
        result = await db.vault_entries.delete_one(
            {"_id": ObjectId(entry_id), "user_id": current_user["user_id"]}
        )
    except Exception:
        raise HTTPException(400, "Invalid entry ID")
    if result.deleted_count == 0:
        raise HTTPException(404, "Entry not found")
    return {"success": True}


@api_router.get("/categories/stats")
async def category_stats(current_user: dict = Depends(get_current_user)):
    pipeline = [
        {"$match": {"user_id": current_user["user_id"], "is_archived": False}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    result = await db.vault_entries.aggregate(pipeline).to_list(50)
    return [{"category": r["_id"], "count": r["count"]} for r in result]


@api_router.get("/stats")
async def get_stats(current_user: dict = Depends(get_current_user)):
    uid = current_user["user_id"]
    total = await db.vault_entries.count_documents({"user_id": uid, "is_archived": False})
    favorites = await db.vault_entries.count_documents({"user_id": uid, "is_favorite": True, "is_archived": False})
    return {"total": total, "favorites": favorites}


# ==================== PIN ====================

@api_router.post("/pin/setup", response_model=PinResponse)
async def setup_pin(req: PinRequest, current_user: dict = Depends(get_current_user)):
    if len(req.pin) < 4 or not req.pin.isdigit():
        raise HTTPException(400, "PIN must be at least 4 digits (numeric only)")
    # Use PBKDF2 with a random salt
    pin_hash, salt_hex = _hash_pin_pbkdf2(req.pin)
    await db.settings.update_one(
        {"key": "pin", "user_id": current_user["user_id"]},
        {"$set": {
            "key": "pin",
            "user_id": current_user["user_id"],
            "value": pin_hash,
            "salt": salt_hex,
            "hash_type": "pbkdf2",
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    return PinResponse(success=True, message="PIN set successfully")


@api_router.post("/pin/verify", response_model=PinResponse)
async def verify_pin(req: PinRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    # Rate-limit PIN attempts per user
    if not pin_verify_rate_limiter.is_allowed(user_id):
        raise HTTPException(status_code=429, detail="Too many PIN attempts. Please wait before trying again.")

    stored = await db.settings.find_one({"key": "pin", "user_id": user_id})
    if not stored:
        # No PIN configured — treat as unverified (do not silently succeed)
        return PinResponse(success=False, message="No PIN configured")

    if _verify_pin(req.pin, stored):
        # Migrate legacy SHA-256 hash to PBKDF2 on successful verify
        if stored.get("hash_type", "sha256") == "sha256":
            new_hash, salt_hex = _hash_pin_pbkdf2(req.pin)
            await db.settings.update_one(
                {"key": "pin", "user_id": user_id},
                {"$set": {"value": new_hash, "salt": salt_hex, "hash_type": "pbkdf2", "updated_at": datetime.now(timezone.utc)}}
            )
        return PinResponse(success=True, message="PIN verified")

    return PinResponse(success=False, message="Incorrect PIN")


@api_router.get("/pin/status")
async def pin_status(current_user: dict = Depends(get_current_user)):
    stored = await db.settings.find_one({"key": "pin", "user_id": current_user["user_id"]})
    return {"hasPin": bool(stored)}


@api_router.delete("/pin/reset")
async def reset_pin(current_user: dict = Depends(get_current_user)):
    await db.settings.delete_one({"key": "pin", "user_id": current_user["user_id"]})
    return {"success": True}


# ==================== EXPORT ====================

@api_router.get("/export")
async def export_entries(
    format: str = Query("json"),
    category: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    query: Dict[str, Any] = {"user_id": current_user["user_id"], "is_archived": False}
    if category and category != "All":
        query["category"] = category
    projection = {"_id": 1, "content": 1, "category": 1, "tags": 1, "summary": 1,
                  "is_favorite": 1, "created_at": 1, "updated_at": 1, "confidence": 1}
    cursor = db.vault_entries.find(query, projection).sort("created_at", -1)
    docs = await cursor.to_list(1000)  # Cap at 1000 for export
    entries = []
    for doc in docs:
        doc.pop('_id', None)
        if isinstance(doc.get('created_at'), datetime):
            doc['created_at'] = doc['created_at'].isoformat()
        if isinstance(doc.get('updated_at'), datetime):
            doc['updated_at'] = doc['updated_at'].isoformat()
        entries.append(doc)

    if format == "txt":
        lines = []
        for e in entries:
            lines.append(f"[{e.get('category', '?')}] {e.get('content', '')}")
            tags = e.get('tags', [])
            if tags:
                lines.append(f"  Tags: {', '.join(tags)}")
            lines.append(f"  Saved: {str(e.get('created_at', ''))[:10]}")
            lines.append("")
        return {"data": "\n".join(lines), "format": "txt", "count": len(entries)}

    return {"data": entries, "format": "json", "count": len(entries)}


# ==================== APP SETUP ====================

app.include_router(api_router)

# Restrict CORS to known origins only
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


@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("user_id", unique=True)
        await db.user_sessions.create_index("session_token", unique=True)
        await db.user_sessions.create_index("user_id")
        await db.user_sessions.create_index([("expires_at", 1)], expireAfterSeconds=0)
        await db.vault_entries.create_index([("user_id", 1), ("created_at", -1)])
        logger.info("DB indexes created")
    except Exception as e:
        logger.warning(f"Index creation warning: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
