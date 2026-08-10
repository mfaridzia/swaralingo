# SwaraLingo

AI-powered English learning app for Indonesian speakers. Practice diary writing, sentence chunking, shadowing pronunciation, and journaling — with real-time grammar feedback powered by Gemini.

## Language

**Diary Entry (Log)**:
A practice writing session where the user types or speaks an English sentence, receives AI grammar analysis, and saves the result with optional audio recording.
_Avoid_: Post, note, practice entry, journal (see Journal)

**Sentence Chunk**:
A reusable English phrase saved to the user's vocabulary bank. Each chunk has a meaning translation (Bahasa), category tag, and spaced-repetition review schedule.
_Avoid_: Flashcard, card, phrase, vocabulary item

**Journal**:
A reflective writing session guided by an AI-generated prompt. The user writes a longer-form response and receives coaching feedback. Distinct from Diary (grammar-focused, short-form).
_Avoid_: Diary entry, reflection post, long-form practice

**Shadowing**:
A pronunciation practice mode where the user listens to a natural audio version of a sentence, then records themselves repeating it. AI compares the two and scores pronunciation similarity.
_Avoid_: Echo practice, mimic mode, repeat mode

**Streak**:
The count of consecutive days with at least one diary entry. Drives badge achievements (Starter 3, Rising 5, Dedicated 7, Elite 14+).
_Avoid_: Chain, run, consecutive days

**Badge**:
An achievement unlocked by meeting streak thresholds or other milestones. Displayed on the Dashboard.
_Avoid_: Trophy, award, medal

**Analysis Cache**:
Server-side cache of Gemini grammar analysis results, keyed by input text hash. Avoids redundant API calls for identical sentences.
_Avoid_: Grammar cache, result cache

**Daily Challenge**:
An AI-generated personalized practice task, derived from the user's recent grammar mistakes. Displayed on the Dashboard. Regenerated each calendar day.
_Avoid_: Daily task, daily goal, practice target

**Offline Sync**:
The protocol by which locally-created data (diary entries, chunks, journals, audio recordings) is pushed to the server when connectivity returns. Uses client-push with last-write-wins conflict resolution.
_Avoid_: Background sync, offline upload, queue flush

**Pending Mutation**:
A local database write that has not yet been pushed to the server. Includes the operation type (insert/update/delete), table, payload, and client timestamp.
_Avoid_: Dirty record, unsaved change, queued write, sync item

**Sync Conflict**:
A state where a record was modified both locally and on the server since the last successful sync. Resolved by last-write-wins using `clientUpdatedAt` timestamp.
_Avoid_: Merge conflict, data collision, divergence
