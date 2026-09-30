# Data Qlean — Project Log & Product Spec (v1)

**Date:** 2026-09-29  
**Status:** Active build  
**Goal:** A practical app to open messy CSV/Excel data, understand it, find quality issues, get suggestions, approve changes, edit structure, and export clean data.

---

## 1. What this app is

**Data Qlean** is a local data cleaning workbench.

You load a CSV or Excel file. The app never changes your original file. It works on a **working copy**. It shows you:

- How many rows and columns you have  
- What each column looks like (type, missing values, samples)  
- What is messy (quality findings)  
- What you *could* do about it (suggestions)  
- A place to approve or reject those suggestions  
- Ways to rearrange / rename columns and edit data  
- Export to CSV or Excel when you are happy  

**Core rule:** Nothing is applied to the data until **you** approve it (or you edit it yourself).

---

## 2. Problem it solves

Most real data lives in Excel and CSV. It is often:

- Missing values  
- Mixed formats (dates, numbers as text)  
- Duplicate rows  
- Empty columns  
- Inconsistent naming  

People need a simple tool to **see** the mess, **decide** what to fix, and **export** clean data — without writing code every time.

---

## 3. User journeys (MVP)

### Journey 1 — Load & see
1. User uploads CSV or XLSX  
2. App stores original + creates working copy  
3. User sees row count, column count, column profile  

### Journey 2 — Quality findings
1. User opens Quality Findings  
2. App runs rules (missing values, empty columns, duplicates, numeric-as-text, etc.)  
3. User sees a clear list of issues with severity  

### Journey 3 — Reconcile / suggestions
1. Each issue becomes a suggestion (e.g. “Fill missing”, “Drop empty column”, “Remove duplicates”)  
2. User can Approve or Reject  
3. On Approve, working copy is updated  
4. Original file stays untouched  

### Journey 4 — Manual transform
1. Rename columns  
2. Drop columns  
3. Reorder columns (basic)  
4. View current table  

### Journey 5 — Export
1. Download current working data as CSV or XLSX  
2. Optional: simple note of what was applied  

---

## 4. Screens

| Screen | Purpose |
|--------|---------|
| **Upload** | Load CSV / Excel |
| **Dashboard** | Rows, columns, issue count, pending suggestions |
| **Data View** | Spreadsheet-like view of current working data |
| **Quality Findings** | List of issues found by rules |
| **Reconcile** | Suggestions with Approve / Reject |
| **Transform** | Rename / drop columns (manual tools) |
| **Export** | Download cleaned file |

---

## 5. Quality rules (v1)

| Rule ID | What it detects | Typical suggestion |
|---------|-----------------|--------------------|
| HIGH_NULLS | Column with ≥30% missing | Fill with placeholder or leave |
| EMPTY_COL | Column entirely empty | Drop column |
| DUP_ROWS | Fully duplicate rows | Drop duplicates |
| NUM_AS_TEXT | Numbers stored as text | Convert to numeric |
| WHITESPACE | Leading/trailing spaces in text | Trim |

(More rules can be added later: dates, phones, emails, inconsistent categories.)

---

## 6. Technical decisions

| Area | Choice |
|------|--------|
| Backend | Python + FastAPI + pandas + openpyxl |
| Frontend | React + Vite + Tailwind (dashboard + side panels) |
| Storage | File-based: `data/uploads/{session}` + `data/working/{session}` |
| Safety | Original file never overwritten |
| Session | UUID per upload; all API calls use `session_id` |

---

## 7. Phase 0 — locked product decisions

These are product constraints we treat as fixed for v1 and should guide both roadmap and implementation.

### 7.1 Cyclic UI model

The UI is not a one-way pipeline. After every approve or manual edit, the app must re-run:

1. profile generation  
2. quality finding detection  
3. suggestion regeneration  
4. data view refresh  

This is required because once data changes, earlier findings and suggestions may be stale or invalid.

### 7.2 Suggestion lifecycle and reject semantics

Each suggestion must have a stable identity and explicit state:

- `pending` — newly detected and not yet acted on  
- `approved` — applied to the working copy  
- `rejected` — dismissed for the session  
- `stale` — no longer valid after data change  

Rejected suggestions are not permanently deleted. They are dismissed for the current session until the user explicitly refreshes findings or chooses a future “Do not ask again” option. This avoids the confusing behavior where a rejected issue reappears on every re-detect.

### 7.3 Apply-order rationale

Suggestions must be applied in a clear, auditable order so the user can understand why the working data looks different after each action. The default order should be:

1. drop empty columns  
2. drop duplicate rows  
3. trim whitespace / normalize strings  
4. fix obvious type coercions  
5. fill/replace nulls  
6. user-approved custom transform steps  

The rationale is simple: structural cleanup first, then row-level correction, then value-level data repair. This reduces cascade errors and makes the change log easier to explain.

### 7.4 Undo strategy

Undo is not implemented as pure inverse operations. That is too fragile for drop, dedup, type conversion, and multi-column edits. Instead, the app should snapshot the working data before each approved apply or transformation batch.

This gives us a safe recovery point for:

- dropping columns  
- removing duplicates  
- type conversion  
- bulk fill / replace operations  
- manual edit sequences  

The change log stores an action record plus the snapshot reference, so the user can review and undo reliably.

### 7.5 Validation v1 scope

Validation in v1 is intentionally narrow. We will support only:

- not-null checks  
- allowed set / categorical checks  
- regex pattern checks  

This keeps the feature grounded and avoids turning validation into a full rules engine before the core workbench is working.

### 7.6 Frontend priority

The frontend is not an afterthought. For a local data workbench, UX is the product. Frontend work should start in parallel with Phase 2, including:

- paged / virtualized table view  
- suggestion before/after preview  
- clear loading and recalculation states  
- approve / reject feedback with immediate refresh  

This is the part users experience directly, and the workbench will fail product adoption if it feels slow or confusing.

### 7.7 Known ingest gaps

The product should explicitly document known limitations for v1:

- multi-sheet Excel files  
- delimiter detection for ambiguous imports  
- full category clustering / semantic grouping  

These are not blockers for the initial app but must be identified as out-of-scope or deferred features, not silent failures.

### 7.8 Recipes and history

Recipes can become a later headline feature, but only after the system has stable change history and suggestion IDs. Until then, recipe support should be treated as a Phase 4 capability rather than a Phase 5 optional extra.

### 7.9 Logging and observability

For a local tool, structured logs and rule hit counts are sufficient for v1. The minimum required logging is:

- upload failures  
- session creation and teardown  
- rule execution counts  
- suggestion generation counts  
- apply action records  

This is enough to debug user workflows without introducing heavy external monitoring products at this stage.

---

## 8. API surface (MVP)

- `POST /upload` — upload file → session_id + basic info  
- `GET /profile/{session_id}` — row/column stats  
- `GET /data/{session_id}` — preview rows (paginated)  
- `GET /quality/{session_id}` — quality findings  
- `GET /suggestions/{session_id}` — actionable suggestions  
- `POST /suggestions/{session_id}/{id}` — approve / reject  
- `POST /transform/{session_id}` — rename / drop column  
- `GET /export/{session_id}?format=csv|xlsx` — download  

---

## 9. Out of scope for v1

- Multi-file merge / cross-file reconciliation  
- Live database connectors  
- ML models  
- Multi-user accounts  
- Auto-apply without user approval  

---

## 10. Build order

1. Project log (this document) ✅  
2. Phase 0 lock: safety, suggestion state, undo snapshots, validation scope, UI lifecycle, known gaps  
3. Solid backend: upload → load → profile → quality → suggestions → apply → export  
4. Frontend work in parallel: paged table, suggestion preview, approval UX, refresh flow  
5. Smoke-test in environment  
6. Zip for local download  

---

## 11. Success for v1

- Upload a messy CSV  
- See profile and findings  
- Approve at least one suggestion and see data change  
- Clear reject flow without confusing reappearance  
- Export a cleaned file  
- Original upload file still intact  

---

**Next:** Implement and verify the safety contract, suggestion lifecycle, undo snapshots, and working frontend flow before extending the product scope.
