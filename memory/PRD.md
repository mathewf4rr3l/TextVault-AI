# TextVault AI — Product Requirements Document

**Last Updated:** 2026-09-02  
**Version:** 1.0.0 MVP

---

## Problem Statement
Build a production-ready mobile application called **TextVault AI** — a secure, intelligent vault designed exclusively for storing and organizing text-based content. The app uses AI-powered auto-categorization to automatically classify saved text into categories like URLs, phone numbers, emails, financial info, IDs, and more.

---

## Architecture
- **Frontend:** Expo React Native (SDK 54), expo-router v6, TypeScript
- **Backend:** FastAPI + Python, MongoDB (Motor async)
- **AI Engine:** Claude Haiku 4.5 (via Emergent Universal Key + emergentintegrations library)
- **Auth:** PIN-based lock (4-digit, stored in SecureStore + hashed in MongoDB)
- **Storage:** MongoDB cloud (textvault_db database)

---

## User Personas
1. **Power Users** — professionals who save snippets, API keys, addresses, and notes regularly
2. **Privacy-Conscious Users** — want a secure local-first vault with PIN protection
3. **Daily Mobile Users** — need quick paste-and-save functionality

---

## Core Requirements (Static)

### Security
- 4-digit PIN setup on first launch
- PIN lock screen on every app open and background return
- Auto-lock when app moves to background (AppState monitoring)
- PIN stored hashed (SHA-256) on server, encrypted in SecureStore

### AI Classification
- Auto-detect content type: Notes, URL, Phone, Email, Date, Address, Financial, ID, Custom
- Confidence scoring (0-100%)
- Auto-generated tags and summaries via Claude Haiku 4.5
- Regex + NLP hybrid fallback

### Vault Core
- Add entry with universal text input + paste from clipboard
- Real-time AI classification preview while typing
- Category override by user
- Card-based vault list with category filter chips
- Entry detail with smart actions (Open Link, Call, Email, Maps)
- In-place content editing
- Favorite / Archive / Delete actions
- Pull-to-refresh

### Search
- Keyword search with regex-based matching
- MongoDB text search across content + tags + summary
- Suggested search examples

### Categories
- 9 built-in categories with color coding and emoji
- Per-category entry counts with progress bars

### Settings
- Export vault as JSON or TXT (copies to clipboard)
- Change PIN with confirmation
- Immediate lock option
- Delete all entries (with double confirmation)

---

## What's Been Implemented (2026-09-02)

### Backend (FastAPI)
- [x] `POST /api/entries` — create with AI auto-classification
- [x] `GET /api/entries` — list with filters (category, archived, favorites)
- [x] `GET /api/entries/{id}` — get single entry
- [x] `PUT /api/entries/{id}` — update (content, category, tags, favorite, archive)
- [x] `DELETE /api/entries/{id}` — delete
- [x] `POST /api/entries/search` — text search
- [x] `POST /api/ai/classify` — standalone classification endpoint
- [x] `POST /api/ai/summarize` — text summarization
- [x] `GET /api/categories/stats` — per-category entry counts
- [x] `GET /api/stats` — total + favorites count
- [x] `POST /api/pin/setup` — set/update PIN (SHA-256 hashed)
- [x] `POST /api/pin/verify` — verify PIN
- [x] `GET /api/pin/status` — check if PIN exists
- [x] `DELETE /api/pin/reset` — reset PIN
- [x] `GET /api/export` — export as JSON or TXT

### Frontend (React Native)
- [x] PIN Setup Screen (2-step with confirmation + step indicator)
- [x] PIN Lock Screen (numeric keypad, shake on wrong PIN)
- [x] Auto-lock on background (AppState monitoring)
- [x] Vault Home (category filter, FlatList, FAB, action modal)
- [x] Add Entry (universal input, AI live classification, category override)
- [x] Entry Detail (full content, smart actions, in-place edit, copy)
- [x] Search Screen (debounced search, example chips)
- [x] Categories Screen (grid with counts + progress bars)
- [x] Settings Screen (export JSON/TXT, change PIN, delete all)
- [x] 4-tab navigation (Vault, Search, Categories, Settings)

### Critical Bug Fixed
- expo-secure-store web implementation is empty ({}) on web preview; all SecureStore calls wrapped in try/catch with backend API fallback

---

## Test Credentials
- **PIN:** `1234`
- **Backend:** https://textvault-ai.preview.emergentagent.com/api

---

## Prioritized Backlog

### P0 (Next Sprint)
- [ ] Biometric auth (TouchID/FaceID) — requires native build, not available in Expo Go
- [ ] Offline mode — full local SQLite/MMKV storage fallback
- [ ] Duplicate detection — detect and merge similar entries

### P1 (Phase 2)
- [ ] Voice-to-text input
- [ ] OTP/expiry date reminder detection
- [ ] Natural language semantic search (vector embeddings)
- [ ] Share-to-vault from other apps (share extension)
- [ ] Encrypted backup file export

### P2 (Future)
- [ ] AI Chat Assistant ("What did I save about X?")
- [ ] Cross-device sync with conflict resolution
- [ ] Chrome extension integration
- [ ] Home screen widget for quick capture
- [ ] Auto-summarization of long notes
- [ ] Smart linking (connect related entries)

---

## Next Tasks
1. Add biometric auth fallback for PIN (after generating native build)
2. Implement swipe-to-delete and swipe-to-favorite on home screen cards
3. Add reminder detection for OTPs and expiry dates
4. Implement offline-first with local SQLite storage
5. Add share extension for "Save to TextVault" from other apps
