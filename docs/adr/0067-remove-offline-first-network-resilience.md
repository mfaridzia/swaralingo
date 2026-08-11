# ADR-067: Remove Offline-First, Replace with Network Resilience + PWA Enhancements

**Supersedes**: [ADR-058](0058-offline-first-pwa.md), [ADR-059](#) (sync/interceptor fixes)

**Status**: Accepted & Implemented

**Date**: 2026-08-11

---

## Context

ADR-058 established an offline-first PWA architecture using Dexie.js (IndexedDB), a client-push sync protocol (`POST /api/sync`), and last-write-wins conflict resolution. The feature shipped with an opt-in toggle in Settings but was **never enabled by default** because it was buggy, not smooth, and the toggle mechanism itself was broken (`getOfflineStore()` hardcoded to return `false`).

A comprehensive architecture review was conducted to decide: fix the offline-first implementation or remove it entirely.

## Architectural Review Findings

### Critical Bugs Found

1. **`getOfflineStore()` always returned `false`** — the Zustand store's `offlineModeEnabled` was set from localStorage but the exported getter was hardcoded. The toggle literally could never work. Users who enabled "Offline Mode" in Settings were still operating entirely online.

2. **`client_uuid` never selected in GET queries** — the sync protocol relied on `client_uuid` for idempotency (deduplication on INSERT), but `SELECT * FROM practice_logs` did not include the `client_uuid` column. Records synced from client to server would be invisible to the deduplication check, guaranteeing duplicate rows on every sync.

3. **Last-Write-Wins silent data loss** — if a user edited a diary entry offline while another edit happened from another device, the sync would silently discard one version with zero user feedback. No merge, no notification, just data gone.

4. **Query-key mismatches** — `useQuery(['journals', userId])` vs `setQueryData(['journals', userId, journalsLimit])` — cache writes targeted wrong keys, so optimistic updates never rendered. User would save a journal, see a toast saying "saved," but the list wouldn't update until a manual refresh.

5. **Audio blob sync deadlock** — audio recordings were stored in a separate Dexie table (`audioBlobs`). If the audio upload failed mid-sync, the sync engine had no retry mechanism for blob-only failures. The diary entry would sync (text), but the audio recording would be permanently orphaned on the client.

### Architectural Mismatch: SwaraLingo Is AI-Dependent

The core value proposition of SwaraLingo depends entirely on server-side AI:

| Feature | AI Dependency |
|---|---|
| Grammar analysis (`/api/analyze`) | Gemini `gemini-3.5-flash-lite` |
| Daily challenge generation | Gemini |
| Journal mood detection + reflection | Gemini |
| Interview Simulator (Evelyn) | Gemini (streaming) |
| Audio transcription (Whisper fallback) | Cloudflare Workers AI / Gemini |
| Pronunciation shadowing score | Gemini multimodal |

**None of these work offline.** The only features that could function offline are:
- Viewing previously-fetched diary logs (stale cache)
- Viewing previously-fetched sentence chunks (stale cache)
- Typing a diary entry that can't be analyzed or saved

This means offline-first adds ~30KB of dependencies (Dexie + dexie-react-hooks), ~500 lines of sync/merge/retry/backfill engine code, a dedicated backend endpoint, and Playwright E2E tests — all to let users... type text they can't analyze and view stale data.

### When Would Offline-First Make Sense for SwaraLingo?

Only if the AI model runs **on-device** (e.g., ONNX runtime with a quantized model, or MediaPipe/Transformers.js for browser-local inference). At that point, grammar analysis, journal reflection, and pronunciation scoring could all happen locally. The app would become a true offline-capable AI coach. Until on-device AI is feasible (model size, inference speed, browser API maturity), offline-first is premature optimization.

## Decision

**Remove offline-first entirely.** Replace with:

### 1. Network Resilience (No New Dependencies)

| Mechanism | Implementation |
|---|---|
| **Automatic retry with exponential backoff** | TanStack Query defaults: `retry: 3` (queries), `retry: 2` (mutations), delay `min(500 * 2^n, 5000ms)` |
| **localStorage draft auto-save** | Diary input saved to `localStorage` every 2 seconds (debounced). Restored on mount. Cleared on successful save. |
| **Stale-while-revalidate** | `staleTime: 60_000` — data stays fresh for 60s before background refetch |
| **Network mode: always** | Queries don't pause when `navigator.onLine` blips (WiFi micro-disconnects) — they try and fail fast instead of freezing the UI |
| **Refetch on window focus** | `refetchOnWindowFocus: true` — when user returns to tab, data refreshes automatically |

### 2. PWA Shell (vite-plugin-pwa, Already Present)

| Enhancement | Implementation |
|---|---|
| **Workbox runtime caching** | `StaleWhileRevalidate` for JS/CSS bundles, `CacheFirst` for static assets (SVG, PNG, fonts). API calls NOT cached — TanStack Query handles retry. |
| **Navigation fallback** | `navigateFallback: '/index.html'` with `/api/` denylist — SPA routes work offline (shell only, no data). |

### 3. PWA UX Enhancements (New)

| Enhancement | Component | Behavior |
|---|---|---|
| **Add-to-Home-Screen prompt** | `InstallPrompt.tsx` | Listens for `beforeinstallprompt` event. Shows dismissible banner: "📲 Install SwaraLingo — Quick access from your home screen." Dismissal stored in `sessionStorage`. |
| **New version banner** | `UpdateBanner.tsx` | Uses `useRegisterSW` from `virtual:pwa-register/react` with `registerType: 'prompt'`. Shows banner when new SW detected. Hourly update checks via `setInterval(r.update, 3600000)`. "Update" button calls `updateServiceWorker(true)` to activate new SW + reload. |

## Changes Summary

### Deleted (~2055 lines)

| What | Why |
|---|---|
| `frontend/src/offline/` (entire directory) | Dexie schema, sync engine, merge logic, retry, backfill, triggers, indicator, store — all removed |
| `backend/src/routes/sync.ts` | `POST /api/sync` batch endpoint — no longer needed |
| `frontend/e2e/offline-sync.spec.ts` | Playwright E2E for offline→online sync flow |
| `dexie`, `dexie-react-hooks` from `package.json` | ~30KB gzip removed |
| `fake-indexeddb` from both `package.json` | Vitest mock for IndexedDB |
| `client_uuid` from all Zod schemas (logs, chunks, journals) | Idempotency key for sync — no longer sent by client |
| `client_uuid` deduplication blocks in backend routes | Dead code after schema change |

### Added (~100 lines)

| What | File |
|---|---|
| TanStack Query resilience defaults | `frontend/src/main.tsx` |
| localStorage draft auto-save + restore | `frontend/src/App.tsx` |
| InstallPrompt component | `frontend/src/components/InstallPrompt.tsx` (new) |
| UpdateBanner component | `frontend/src/components/UpdateBanner.tsx` (new) |
| PWA type declarations | `frontend/src/vite-env.d.ts` (new) |
| Workbox runtime caching config | `frontend/vite.config.ts` |

### Modified (Cleanup)

| File | Change |
|---|---|
| `frontend/src/api.ts` | ~290 → ~50 lines. Removed offline interceptor (Dexie read-through, write queue, optimistic responses). Now pure auth wrapper around `fetch`. |
| `frontend/src/App.tsx` | Removed `SyncBanner`, `swaralingo:synced` event listener, offline save branch in `handleSaveLog`. Added draft auto-save/restore. |
| `frontend/src/main.tsx` | Removed `initSyncTriggers` import/call. Renamed `OfflineErrorBoundary` → `AppErrorBoundary`. Added QueryClient defaults. |
| `frontend/src/components/SavedDiaryLogs.tsx` | Removed `SyncDot`, Dexie audio Blob loading branches. |
| `frontend/src/components/Settings.tsx` | Removed entire "Offline Mode Panel" (~65 lines), offline states/functions/useEffects. |
| `frontend/src/components/JournalCoach.tsx` | Removed `clientUuid` from request body. Fixed query-key mismatch. |
| `backend/src/routes/logs.ts` | Removed `clientUuid` from Zod schema, destructuring, dedupe block. |
| `backend/src/routes/chunks.ts` | Same as logs. |
| `backend/src/routes/journals.ts` | Same as logs (both POST and POST/stream). |
| `backend/src/index.ts` | Removed `syncRouter` import and route. |

## Database Impact

`client_uuid` columns and unique indexes remain in the Turso/Libsql database (logs, chunks, journals tables). These are **harmless** — the column is nullable and no longer populated by the application. Dropping them requires a migration tool (Drizzle Kit not configured for this project) and carries risk. They can be cleaned up during the next schema migration cycle.

## Net Positive

| Metric | Before | After |
|---|---|---|
| Frontend bundle (dependencies) | Dexie + dexie-react-hooks ~30KB | 0KB |
| `api.ts` complexity | ~290 lines (interceptor, cache, queue) | ~50 lines (auth wrapper) |
| Frontend source lines | +~800 (offline module) | -~2055 (net) |
| Backend endpoints | +1 (`/api/sync`) | -1 |
| Test infrastructure | fake-indexeddb, Dexie unit tests | Clean (no offline tests needed) |
| Mental model | Two data paths (online + offline) | One path (online with retry) |
| Bug surface | Sync conflicts, stale cache, idempotency | None (stateless client) |

## When to Revisit Offline-First

Re-evaluate when:
1. **On-device AI becomes viable** — Transformers.js or ONNX runtime can run grammar analysis, journal reflection, and pronunciation scoring locally in the browser at acceptable latency
2. **User demand** — significant portion of users (not just edge cases) report using SwaraLingo in environments with zero connectivity for extended periods
3. **The AI dependency graph shifts** — if core features no longer require server-side inference, the "AI-dependent app" argument weakens

Until then, the network resilience + PWA shell approach covers the 95% case: spotty WiFi, brief disconnections, and slow mobile data.
