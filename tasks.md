# HandyDad AI — Feature Tasks

> Intended for use with Claude Code. Each task is scoped to be completable independently.
> Work top-to-bottom within each epic; later epics may depend on earlier ones.
> All DB changes go through Supabase. All new UI must use existing CSS classes from `globals.css`.

---

## Epic 1 — Multi-turn Conversation

Replace the current single-shot Q&A with a persistent, scrollable chat thread where HandyDad remembers the full context of the current session.

---

### TASK 1.1 — Refactor API route to accept a message array

**File:** `app/api/chat/route.ts`

**Description:**
Change the request body from `{ question: string }` to `{ messages: { role: 'user' | 'assistant', content: string }[] }`. Pass the full array directly to the Groq API so it has conversation history. Keep the system prompt prepended as the first message on the server side.

**Notes:**
- Maintain backward-compatible validation: if `messages` is missing or empty, return a 400.
- The system prompt must always be injected server-side — never trust the client to send it.
- Keep `max_tokens: 1024` and `temperature: 0.48` unchanged.

**Acceptance criteria:**
- `POST /api/chat` accepts `{ messages: [{role, content}] }`.
- Sending a multi-message array results in a contextually aware reply from Groq.
- Sending an empty or malformed body still returns `400`.
- Existing single-message calls (one user message in the array) continue to work identically.

---

### TASK 1.2 — Replace input/response state with a messages array in the home page

**File:** `app/page.tsx`

**Description:**
Replace the current `input`, `response`, and `error` state with a `messages` array of `{ role: 'user' | 'assistant' | 'error', content: string, id: string }`. On submit, append the user message immediately, call the API with the full history, then append the assistant reply.

**Notes:**
- User messages should appear right-aligned or with a distinct style; assistant messages left-aligned. Add the necessary classes to `globals.css` rather than inline styles.
- Keep the textarea for new input at the bottom, fixed in place.
- The "Clear" button should reset the entire thread.
- Preserve the `⌘↵ to send` keyboard shortcut.
- Do not lose the loading bar or the spinner — show them while awaiting the reply.

**Acceptance criteria:**
- Submitting a message appends it to the thread and shows a loading indicator.
- The assistant reply appears below the user message when the response arrives.
- Sending a follow-up ("What tools do I need for step 3?") produces a contextually correct answer, not a generic one.
- Clearing resets to an empty thread.

---

### TASK 1.3 — Update history to save and restore full threads

**File:** `app/components/HistoryDrawer.tsx`

**Description:**
Change the `HistoryEntry` type so `response` is replaced by `messages: { role: string, content: string }[]`. Update `useHistory` accordingly. When a history entry is selected, restore the full message array into the chat, not just the last response.

**Notes:**
- The history entry's display preview in the drawer should show the first user message (already the case — no visual change needed).
- Bump the `STORAGE_KEY` to `handydad-history-v2` to avoid parsing errors from old data; silently discard entries that don't match the new shape.
- `MAX_ENTRIES` stays at 50.

**Acceptance criteria:**
- Saving a multi-turn conversation stores all messages.
- Clicking a history entry restores the full thread visually.
- Old `v1` history entries in localStorage do not crash the app.

---

## Epic 2 — Project Tracker

Let users create named repair projects, attach conversations to them, and track a checklist of steps. Supabase is the backing store.

---

### TASK 2.1 — Create Supabase schema for projects and project messages

**File:** create as `supabase/migrations/001_projects.sql`

**Description:**
Write the SQL migration to create two tables:

```sql
projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  status      text not null default 'active',  -- 'active' | 'completed' | 'archived'
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
)

project_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  role        text not null,   -- 'user' | 'assistant'
  content     text not null,
  created_at  timestamptz not null default now()
)
```

Enable Row Level Security on both tables. Add policies so users can only SELECT, INSERT, UPDATE, DELETE their own rows (match on `user_id` for `projects`; join through `projects` for `project_messages`).

**Notes:**
- Add an index on `projects(user_id)` and `project_messages(project_id)`.
- Include a trigger or updated_at policy to auto-update `projects.updated_at` when a new message is inserted into `project_messages`.

**Acceptance criteria:**
- Migration runs without errors on a fresh Supabase project.
- RLS enforced: a user querying another user's project ID receives zero rows, not an error.
- `updated_at` on a project updates automatically when a child message is inserted.

---

### TASK 2.2 — Build a project selector / creator sidebar panel

**Files:** `app/components/ProjectPanel.tsx` (new), `app/globals.css`

**Description:**
Create a `ProjectPanel` component that lists the current user's projects fetched from Supabase, allows creating a new project (name + optional description), and emits an `onSelect(project)` callback when a project is chosen. The panel should be toggled from the main header (a "Projects" button alongside the existing "History" button).

**Notes:**
- Fetch projects ordered by `updated_at desc`.
- Creating a project inserts a row and immediately selects it.
- Active project should be visually highlighted.
- Use the existing `.drawer-*` CSS classes as a pattern — the panel can be a second drawer or an inline panel above the chat card.
- Show project `status` as a small badge (`active` / `completed`).
- Empty state: "No projects yet — start one to save your conversations."

**Acceptance criteria:**
- Projects list loads from Supabase and is scoped to the logged-in user.
- Creating a project with a blank name shows a client-side validation error.
- Selecting a project emits the project object to the parent page.
- Panel closes after a project is selected.

---

### TASK 2.3 — Persist chat messages to the active project

**File:** `app/page.tsx`, `app/api/chat/route.ts` (minor)

**Description:**
When a project is selected, every sent user message and every received assistant message should be written to `project_messages` in Supabase in addition to the existing localStorage history. On selecting a project, load its message history from Supabase and populate the chat thread.

**Notes:**
- If no project is selected, behavior is unchanged (localStorage only).
- Insert messages one at a time after they are finalised (user message on send; assistant message on receipt).
- On project load, map `project_messages` rows to the internal message shape.
- Do not block the UI on the Supabase write — fire-and-forget with a silent `console.error` on failure.

**Acceptance criteria:**
- Sending messages while a project is active results in rows in `project_messages`.
- Switching away from a project and back restores the full conversation from Supabase.
- No project selected → no Supabase writes, no regression.

---

### TASK 2.4 — Add project status controls and a checklist widget

**File:** `app/components/ProjectPanel.tsx`, `app/globals.css`

**Description:**
Below the project name in the panel, add:
1. A status toggle — buttons to move the project between `active → completed → archived`.
2. A simple free-text checklist — users can add short task items (e.g. "Buy 3/8 copper pipe"), check them off, and delete them. Store the checklist as a `jsonb` column on the `projects` table (`checklist: [{id, text, done}]`).

**Notes:**
- Add the `checklist` column to the migration (or a new migration `002_checklist.sql`).
- Checklist state is saved on every change with a debounced Supabase update (300 ms).
- Checked items should render with a strikethrough style.
- Max 30 checklist items per project; show a count.

**Acceptance criteria:**
- Adding, checking, and deleting checklist items persists across page refreshes.
- Status changes are reflected immediately in the project list badge.
- Checklist is not shown when no project is selected.

---

## Epic 3 — Saved Repair Guides

Let users bookmark any assistant message as a named, searchable guide stored in Supabase, separate from the raw conversation history.

---

### TASK 3.1 — Create Supabase schema for saved guides

**File:** `supabase/migrations/003_guides.sql`

**Description:**
Create the table:

```sql
saved_guides (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  content     text not null,
  tags        text[] default '{}',
  note        text,
  created_at  timestamptz not null default now()
)
```

Enable RLS; users can only access their own rows.

**Acceptance criteria:**
- Migration runs cleanly.
- RLS blocks cross-user access.
- `tags` column accepts an array of strings.

---

### TASK 3.2 — Add a "Save as Guide" action to assistant messages

**Files:** `app/page.tsx`, `app/components/SaveGuideModal.tsx` (new), `app/globals.css`

**Description:**
Each assistant message bubble should show a small bookmark icon button on hover. Clicking it opens a compact modal with:
- A pre-filled title field (first non-empty line of the response, truncated to 60 chars).
- An optional tags field (comma-separated, stored as an array).
- An optional personal note textarea.
- Save and Cancel buttons.

On save, insert a row into `saved_guides`.

**Notes:**
- Modal should use the existing `.card`, `.card-header`, `.input-section`, `.btn-primary`, `.btn-ghost` classes.
- Show a brief inline "Saved ✓" confirmation on the message bubble after saving; auto-dismiss after 2 seconds.
- Only available when the user is logged in (always true given the auth guard, but worth an assertion).

**Acceptance criteria:**
- Hovering an assistant message reveals the bookmark button.
- Opening the modal pre-fills the title correctly.
- Saving inserts a row in Supabase; the confirmation flash appears.
- Cancelling leaves no row inserted.

---

### TASK 3.3 — Build a Saved Guides library page

**File:** `app/guides/page.tsx` (new), `app/globals.css`

**Description:**
A new protected page at `/guides` listing all the user's saved guides. Each guide shows its title, tags, creation date, and a truncated preview of the content. Clicking a guide expands it (either in-place accordion or a detail panel) showing the full `ResponseBlock`-rendered content and the personal note. Users can delete a guide or edit its title/note/tags.

**Notes:**
- Add a "Guides" link to the header nav in `app/page.tsx` (and the landing/login/signup headers can omit it).
- Use the existing `ResponseBlock` component to render guide content.
- Support basic client-side text search across title and tags.
- Empty state: "No guides saved yet. Bookmark any answer from the chat."
- Page is protected by the same auth redirect as `app/page.tsx`.

**Acceptance criteria:**
- All saved guides appear, newest first.
- Search filters the list in real time without a Supabase call.
- Deleting a guide removes it from Supabase and the UI immediately.
- Editing title/note/tags persists on blur/save.
- Navigating to `/guides` while logged out redirects to `/landing`.

---

## Epic 4 — Difficulty & Time Estimate Badge

Before the full answer body, show a quick-read summary card with difficulty, estimated time, and estimated cost so users can decide whether to DIY before reading the steps.

---

### TASK 4.1 — Add structured estimate to the API response

**File:** `app/api/chat/route.ts`

**Description:**
Update the system prompt to instruct the model to begin every response with a YAML front-matter block (before any other content) in exactly this shape:

```
---
difficulty: Beginner | Intermediate | Advanced
time: e.g. "30–45 min" | "2–3 hours" | "Half day"
cost: e.g. "$10–30" | "$50–120" | "Varies"
diy: true | false
---
```

Parse this block server-side using a simple regex before returning the response. Return it as a separate `estimate` object alongside `text` (with the front-matter stripped from `text`):

```json
{
  "text": "## What We're Doing\n...",
  "estimate": {
    "difficulty": "Intermediate",
    "time": "1–2 hours",
    "cost": "$20–50",
    "diy": true
  }
}
```

If parsing fails (model didn't follow the format), return `estimate: null` and the full text unmodified.

**Notes:**
- The regex should be lenient about whitespace.
- Never surface a parsing error to the user — degrade gracefully.
- Test with: "How do I replace a light switch?" (should be Beginner) and "How do I move a load-bearing wall?" (should produce `diy: false`).

**Acceptance criteria:**
- API returns `estimate` object for well-formed responses.
- `text` field no longer contains the front-matter block.
- Malformed or missing front-matter results in `estimate: null`, not a 500.

---

### TASK 4.2 — Render the estimate badge card in the chat UI

**Files:** `app/page.tsx`, `app/globals.css`

**Description:**
When an assistant message includes a non-null `estimate`, render an `EstimateBadge` component above the `ResponseBlock`. It should display four items in a horizontal strip:

- 🎚 Difficulty — colour-coded: green (Beginner), amber (Intermediate), red (Advanced)
- ⏱ Time estimate
- 💰 Cost estimate  
- 🔨 DIY Friendly: Yes / ⚠ Call a Pro

**Notes:**
- Component can live inline in `page.tsx` or as `app/components/EstimateBadge.tsx`.
- Use CSS custom properties for the colour coding — do not hardcode hex values.
- The badge should be compact (single row on desktop, 2×2 grid on mobile).
- If `estimate` is null, render nothing — no empty placeholder.

**Acceptance criteria:**
- Badge appears above the response text when `estimate` is present.
- Difficulty colour changes correctly across the three levels.
- `diy: false` renders the "⚠ Call a Pro" variant.
- No badge rendered when `estimate` is null.

---

## Epic 5 — "When to Call a Pro" Escalation

Surface the professional-referral advice more prominently when the AI determines a task is genuinely dangerous or beyond DIY scope.

---

### TASK 5.1 — Detect escalation flag in the API response

**File:** `app/api/chat/route.ts`

**Description:**
Extend the front-matter block from Epic 4 Task 4.1 with one additional field:

```
escalate: true | false
escalate_reason: short plain-text sentence explaining why (only when escalate: true)
```

Parse these fields server-side and include them in the returned `estimate` object:

```json
{
  "estimate": {
    "difficulty": "Advanced",
    "diy": false,
    "escalate": true,
    "escalate_reason": "This involves the main electrical panel and carries risk of electrocution or fire."
  }
}
```

Update the system prompt to instruct the model to set `escalate: true` for tasks involving: main electrical panels, gas lines, load-bearing structures, asbestos or lead paint, sewage main lines, or roof structural work.

**Notes:**
- `escalate_reason` should be one sentence, plain English, no markdown.
- If `escalate` is false, `escalate_reason` can be omitted or empty.
- This builds directly on Task 4.1 — the front-matter parser just needs two extra fields.

**Acceptance criteria:**
- "How do I replace my electrical panel?" returns `escalate: true` with a reason.
- "How do I unclog a drain?" returns `escalate: false`.
- `escalate_reason` is present and non-empty when `escalate` is true.

---

### TASK 5.2 — Render the escalation warning card in the chat UI

**Files:** `app/page.tsx`, `app/globals.css`

**Description:**
When `estimate.escalate` is true, render a prominent warning card **above** the `EstimateBadge` and the response body. The card should contain:

- A bold heading: "⚠ Professional Work Recommended"
- The `escalate_reason` text.
- A secondary line: "HandyDad will still walk you through what's involved so you understand the job."
- A CTA button: "Find a Local Pro →" that links to `https://www.angi.com` (opens in new tab).

**Notes:**
- The card must be visually distinct from normal content — use `--danger` as the accent colour for the border and heading, but keep the background subtle (mix `--danger` at ~10% opacity over `--surface`).
- Do not replace the normal response — always show the full answer below the warning. The user may be asking to understand the job even if they plan to hire out.
- Add `.escalation-card` styles to `globals.css` using existing variable patterns.

**Acceptance criteria:**
- Escalation card renders above the estimate badge and response when `escalate: true`.
- The card is visually prominent but does not prevent reading the answer.
- "Find a Local Pro →" opens Angi in a new tab.
- No card rendered when `escalate: false` or `estimate` is null.

---

## Cross-cutting notes for all epics

- **No inline styles.** All new styles go in `globals.css` using CSS custom properties.
- **TypeScript types.** Add new shared types to a `app/lib/types.ts` file rather than inlining them.
- **Supabase client.** Use the existing singleton from `lib/supabase.ts` — do not create additional clients.
- **Error handling.** Every Supabase call needs a try/catch or `.catch()`. Surface user-facing errors using the existing `.error-section` / `.error-msg` pattern.
- **Auth guard.** Any new page under `app/` that requires login should mirror the `useEffect` redirect pattern from `app/page.tsx`.
- **Mobile.** Check all new components at 375 px width. Use the existing `@media (max-width: 600px)` breakpoint.
