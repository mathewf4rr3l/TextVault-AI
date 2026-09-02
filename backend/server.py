from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import re
import json
import hashlib
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
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
    content: str
    category: Optional[str] = None
    tags: Optional[List[str]] = None


class VaultEntryUpdate(BaseModel):
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    summary: Optional[str] = None
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
    query: str
    category: Optional[str] = None
    limit: int = 20


class PinRequest(BaseModel):
    pin: str


class PinResponse(BaseModel):
    success: bool
    message: str


# ==================== HELPERS ====================

def doc_to_entry(doc: dict) -> VaultEntry:
    doc = dict(doc)
    doc['id'] = str(doc['_id'])
    doc.pop('_id', None)
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
            raise ValueError("No LLM key configured")

        chat = LlmChat(
            api_key=llm_key,
            session_id=f"clf-{hashlib.md5(content[:100].encode()).hexdigest()[:8]}",
            system_message="You are a text classification AI for a secure vault app. Respond ONLY with valid JSON, no markdown or extra text."
        ).with_model("anthropic", "claude-haiku-4-5-20251001")

        prompt = f"""Classify this text into ONE of these categories: Notes, URL, PhoneNumber, Email, Date, Address, Financial, ID, Custom

Text: "{content[:500]}"

Respond ONLY with JSON (no markdown):
{{"category": "Notes", "tags": ["tag1", "tag2"], "confidence": 0.9, "metadata": {{}}, "summary": "brief one-sentence description"}}"""

        response = await chat.send_message(UserMessage(text=prompt))
        # Extract JSON: find outermost { ... }
        start = response.find('{')
        end = response.rfind('}') + 1
        json_match = None
        if start >= 0 and end > start:
            try:
                result = json.loads(response[start:end])
                json_match = True
            except json.JSONDecodeError:
                json_match = None
        if json_match:
            return ClassificationResult(
                category=result.get('category', regex_cat or 'Notes'),
                tags=result.get('tags', [])[:5],
                confidence=float(result.get('confidence', 0.85)),
                metadata=result.get('metadata', {}),
                summary=result.get('summary'),
            )
    except Exception as e:
        logger.warning(f"AI classification failed: {e}")

    return ClassificationResult(
        category=regex_cat or 'Notes',
        tags=[],
        confidence=0.65 if regex_cat else 0.4,
        metadata={},
        summary=None,
    )


# ==================== ROUTES ====================

@api_router.get("/health")
async def health():
    return {"status": "ok", "service": "TextVault AI"}


# AI Endpoints
@api_router.post("/ai/classify", response_model=ClassificationResult)
async def classify_endpoint(req: ClassifyRequest):
    return await ai_classify(req.content)


@api_router.post("/ai/summarize")
async def summarize_endpoint(req: ClassifyRequest):
    try:
        llm_key = os.environ.get('EMERGENT_LLM_KEY', '')
        chat = LlmChat(
            api_key=llm_key,
            session_id=f"sum-{hashlib.md5(req.content[:100].encode()).hexdigest()[:8]}",
            system_message="You are a concise summarizer."
        ).with_model("anthropic", "claude-haiku-4-5-20251001")
        response = await chat.send_message(
            UserMessage(text=f"Summarize in 1-2 sentences:\n{req.content[:1500]}")
        )
        return {"summary": response.strip()}
    except Exception as e:
        logger.error(f"Summarize error: {e}")
        return {"summary": None}


# Entries CRUD
@api_router.post("/entries", response_model=VaultEntry)
async def create_entry(entry: VaultEntryCreate):
    classification = await ai_classify(entry.content)
    now = datetime.now(timezone.utc)
    doc = {
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
    doc['created_at'] = now.isoformat()
    doc['updated_at'] = now.isoformat()
    return VaultEntry(**doc)


@api_router.get("/entries", response_model=List[VaultEntry])
async def list_entries(
    category: Optional[str] = Query(None),
    archived: bool = Query(False),
    favorites: bool = Query(False),
    limit: int = Query(100),
    skip: int = Query(0),
):
    query: Dict[str, Any] = {"is_archived": archived}
    if category and category != "All":
        query["category"] = category
    if favorites:
        query["is_favorite"] = True
    cursor = db.vault_entries.find(query).sort("created_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(limit)
    return [doc_to_entry(d) for d in docs]


@api_router.post("/entries/search", response_model=List[VaultEntry])
async def search_entries(req: SearchRequest):
    query: Dict[str, Any] = {"is_archived": False}
    if req.category and req.category != "All":
        query["category"] = req.category
    if req.query.strip():
        query["$or"] = [
            {"content": {"$regex": req.query, "$options": "i"}},
            {"tags": {"$elemMatch": {"$regex": req.query, "$options": "i"}}},
            {"summary": {"$regex": req.query, "$options": "i"}},
        ]
    cursor = db.vault_entries.find(query).sort("created_at", -1).limit(req.limit)
    docs = await cursor.to_list(req.limit)
    return [doc_to_entry(d) for d in docs]


@api_router.get("/entries/{entry_id}", response_model=VaultEntry)
async def get_entry(entry_id: str):
    try:
        doc = await db.vault_entries.find_one({"_id": ObjectId(entry_id)})
    except Exception:
        raise HTTPException(400, "Invalid entry ID")
    if not doc:
        raise HTTPException(404, "Entry not found")
    return doc_to_entry(doc)


@api_router.put("/entries/{entry_id}", response_model=VaultEntry)
async def update_entry(entry_id: str, update: VaultEntryUpdate):
    update_dict: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
    if update.content is not None:
        update_dict["content"] = update.content
    if update.category is not None:
        update_dict["category"] = update.category
    if update.tags is not None:
        update_dict["tags"] = update.tags
    if update.summary is not None:
        update_dict["summary"] = update.summary
    if update.is_favorite is not None:
        update_dict["is_favorite"] = update.is_favorite
    if update.is_archived is not None:
        update_dict["is_archived"] = update.is_archived
    try:
        doc = await db.vault_entries.find_one_and_update(
            {"_id": ObjectId(entry_id)},
            {"$set": update_dict},
            return_document=True,
        )
    except Exception:
        raise HTTPException(400, "Invalid entry ID")
    if not doc:
        raise HTTPException(404, "Entry not found")
    return doc_to_entry(doc)


@api_router.delete("/entries/{entry_id}")
async def delete_entry(entry_id: str):
    try:
        result = await db.vault_entries.delete_one({"_id": ObjectId(entry_id)})
    except Exception:
        raise HTTPException(400, "Invalid entry ID")
    if result.deleted_count == 0:
        raise HTTPException(404, "Entry not found")
    return {"success": True}


@api_router.get("/categories/stats")
async def category_stats():
    pipeline = [
        {"$match": {"is_archived": False}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    result = await db.vault_entries.aggregate(pipeline).to_list(50)
    return [{"category": r["_id"], "count": r["count"]} for r in result]


@api_router.get("/stats")
async def get_stats():
    total = await db.vault_entries.count_documents({"is_archived": False})
    favorites = await db.vault_entries.count_documents({"is_favorite": True, "is_archived": False})
    return {"total": total, "favorites": favorites}


# PIN Management
@api_router.post("/pin/setup", response_model=PinResponse)
async def setup_pin(req: PinRequest):
    if len(req.pin) < 4:
        raise HTTPException(400, "PIN must be at least 4 digits")
    pin_hash = hashlib.sha256(req.pin.encode()).hexdigest()
    await db.settings.update_one(
        {"key": "pin"},
        {"$set": {"key": "pin", "value": pin_hash, "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )
    return PinResponse(success=True, message="PIN set successfully")


@api_router.post("/pin/verify", response_model=PinResponse)
async def verify_pin(req: PinRequest):
    pin_hash = hashlib.sha256(req.pin.encode()).hexdigest()
    stored = await db.settings.find_one({"key": "pin"})
    if not stored:
        return PinResponse(success=True, message="No PIN set")
    if stored["value"] == pin_hash:
        return PinResponse(success=True, message="PIN verified")
    return PinResponse(success=False, message="Incorrect PIN")


@api_router.get("/pin/status")
async def pin_status():
    stored = await db.settings.find_one({"key": "pin"})
    return {"hasPin": bool(stored)}


@api_router.delete("/pin/reset")
async def reset_pin():
    await db.settings.delete_one({"key": "pin"})
    return {"success": True}


# Export
@api_router.get("/export")
async def export_entries(
    format: str = Query("json"),
    category: Optional[str] = Query(None),
):
    query: Dict[str, Any] = {"is_archived": False}
    if category and category != "All":
        query["category"] = category
    projection = {"_id": 1, "content": 1, "category": 1, "tags": 1, "summary": 1,
                  "is_favorite": 1, "created_at": 1, "updated_at": 1, "confidence": 1}
    cursor = db.vault_entries.find(query, projection).sort("created_at", -1)
    docs = await cursor.to_list(10000)
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


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
