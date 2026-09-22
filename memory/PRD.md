# PromptVeer — Product Requirements Document

**Last Updated:** 2026-06 (rebuild)
**Version:** 2.0.0 MVP

---

## Problem Statement
PromptVeer is a **public AI prompt marketplace/library** for tools like ChatGPT, Claude, Gemini, Midjourney, Sora, etc. Anyone can browse, copy, like, share, and submit prompts. A Mahabharata-warrior gamification system rewards contributors. Monetization (Stripe) infrastructure is planned but all prompts remain FREE for the MVP.

---

## Architecture
- **Frontend:** Expo React Native (SDK 57, React 19), expo-router, TypeScript
- **Backend:** FastAPI + MongoDB (Motor async), db `promptveer_db`
- **Auth:** Auto guest session on launch (device-id based) + optional Emergent-managed Google sign-in
- **Navigation:** 5 tabs — Discover, Browse, Search, Library, Profile
- **Theme:** Deep Purple + Gold (`constants/theme.ts`)

---

## Taxonomy
2-level: 30 Categories → Subcategories (see `backend/taxonomy.py`), plus filters: Tool, Industry, Difficulty (Beginner/Intermediate/Advanced), Content Type (Text/Image/Video/Audio/Code), Use Case. Served via `GET /api/taxonomy`.

## Gamification (Mahabharata ranks)
`score = prompts_uploaded*10 + likes_received*3 + shares_received*5`
Ranks 1–10: Ghatotkach → Satyaki → Bhagadatta → Abhimanyu → Bhisma → Bhima → Ashwatthama → Karna → Drona → Arjuna. Each rank has a default medal + color + title. Thresholds in `backend/taxonomy.py`.

---

## Implemented (Backend — all tested 28/28)
- Auth: `POST /api/auth/session` (Google), `POST /api/auth/guest`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET /api/taxonomy`
- `GET /api/prompts` (filters: category, subcategory, tool, industry, difficulty, content_type, use_case, q; sort: trending/newest/top; pagination) — PUBLIC
- `GET /api/discover` (trending, newest, top, category counts) — PUBLIC
- `GET /api/prompts/{id}` — PUBLIC
- `POST /api/prompts` (auth) — updates gamification
- `PUT /api/prompts/{id}`, `DELETE /api/prompts/{id}` (author only, 403 otherwise)
- `POST /api/prompts/{id}/like` (auth, toggle), `POST /api/prompts/{id}/share` (auth)
- `GET /api/library?type=uploads|liked` (auth)
- `GET /api/profile` (auth — rank, next_rank, progress, points_to_next, stats)
- `GET /api/leaderboard` — PUBLIC
- Startup seeds ~60 real sample prompts (author: "PromptVeer" official)

## Implemented (Frontend — ~90% tested, fixes applied)
- Discover: trending carousel, category grid, fresh drops, +Submit
- Browse: category chips + sort + difficulty + tool filters, prompt list
- Search: debounced search with example chips
- Library: My Prompts / Liked tabs
- Profile: rank medal, progress bar, stats grid, 10-rank ladder, optional Google sign-in, logout
- Prompt detail: copy, like, share (web uses clipboard fallback), author delete
- Submit: title/content/category (req) + subcategory/tool/difficulty/content-type pickers
- Reusable components: PromptCard, RankBadge, Chip, DifficultyBadge; taxonomy cache in `src/lib/taxonomy.ts`

---

## Backlog / Next
### Done this round
- [x] Ratings & Reviews — `POST /api/prompts/{id}/rate` (1–5 stars + optional review), `GET /api/prompts/{id}/reviews`; denormalized `avg_rating`/`rating_count`; `sort=top_rated`; stars on cards + rating/review UI on detail
- [x] Collections Tab — dedicated 6th "Packs" tab (`app/(tabs)/collections.tsx`)
- [x] Streak Reminders — `GET /api/streak` (at_risk when copied yesterday but not today) + dismissible banner on Discover
- [x] App logo integrated (icon/splash/adaptive + Discover header, splash, sign-in)

### Done previously
- [x] Stripe paywall **infrastructure** (emergentintegrations StripeCheckout; server-side pricing; transactions collection; webhook). All content free. `STRIPE_API_KEY=sk_test_emergent` is a deploy-time placeholder → `PAYMENTS_ENABLED=false` in preview, checkout returns a graceful 503; real key injected at publish.
- [x] Leaderboard UI (`app/leaderboard.tsx`, `GET /api/leaderboard`)
- [x] Copy Streaks — `POST /api/prompts/{id}/copy` daily streak + bonus points (Spark/On Fire/Blazing/Legendary); score folds in bonus; streak card on Profile; toast on prompt detail
- [x] Curated Collections — `GET /api/collections`, `GET /api/collections/{id}`; swipeable packs on Discover

### P2 (Future)
- [ ] Activate paywall: gate premium prompts/bundles once a real Stripe key is live (entitlement is intentionally separate from payment_status)
- [ ] Ratings/reviews, comments
- [ ] Report/moderation for user submissions
- [ ] Prompt Collections as a dedicated tab/surface

---

## Test Credentials
See `/app/memory/test_credentials.md`. No login needed (auto guest). Base API: https://textvault-ai.preview.emergentagent.com/api
