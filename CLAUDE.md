# CLAUDE.md — HandyDad AI

This file gives Claude (and any contributor) a complete orientation to the codebase so you can navigate, extend, and debug it confidently.

---

## What this project is

**HandyDad AI** is a Next.js 14 web app that lets authenticated users ask home-repair questions and get structured, step-by-step tutorials from an AI persona ("a calm handyman with 40+ years of experience"). Answers always follow a fixed template: *What We're Doing → Tools Needed → Safety Check → Step-by-Step → What Could Go Wrong → Dad Tip → When to Call a Professional*.

**Live demo:** https://handy-dad-ai-lorikmusiqis-projects.vercel.app

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) + React 18 + TypeScript |
| Auth & sessions | Supabase (`@supabase/supabase-js`) |
| LLM backend | Groq API — model `llama-3.3-70b-versatile` |
| Styling | Plain CSS with CSS custom properties (no Tailwind utilities at runtime) |
| Fonts | JetBrains Mono, Oswald, Source Serif 4 (Google Fonts) |

---

## Repository layout

```
/
├── app/
│   ├── layout.tsx                  Root layout — injects ThemeScript + AuthProvider
│   ├── globals.css                 All styles: design tokens, components, themes
│   ├── page.tsx                    Home/chat page (protected, redirects to /landing if logged out)
│   ├── landing/page.tsx            Public marketing page; redirects to / if already logged in
│   ├── login/page.tsx              Sign-in form
│   ├── signup/page.tsx             Sign-up form
│   ├── api/
│   │   └── chat/route.ts           Server-side proxy → Groq chat completions API
│   ├── components/
│   │   ├── ThemePicker.tsx         Dropdown to switch themes; persists choice to localStorage
│   │   ├── ThemeScript.tsx         Inline <head> script; applies saved theme before first paint
│   │   └── HistoryDrawer.tsx       Slide-in drawer + useHistory hook (localStorage-backed)
│   ├── context/
│   │   └── AuthContext.tsx         Supabase auth provider + useAuth hook
│   └── lib/
│       └── themes.ts               Theme registry, ThemeId type, load/save/apply helpers
├── lib/
│   └── supabase.ts                 Browser Supabase client (singleton)
├── package.json
├── tsconfig.json
├── tailwind.config.js              Content paths only — Tailwind used for its reset/base, not utilities
├── postcss.config.js
└── .gitignore
```

---

## Environment variables

Create `.env.local` in the project root (never commit it):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GROQ_API_KEY=gsk_your_groq_key
```

`NEXT_PUBLIC_*` variables are exposed to the browser. `GROQ_API_KEY` is server-only and used exclusively in `app/api/chat/route.ts`.

---

## Key data flows

### Authentication flow

```
User visits /  →  AuthProvider reads Supabase session from localStorage
                  ├── Session exists → render home page
                  └── No session     → redirect to /landing

Login / Signup forms call supabase.auth.signInWithPassword / signUp
  └── On success: Supabase writes session to localStorage, onAuthStateChange fires,
      AuthContext updates user state, router.push('/')
```

### Chat request flow

```
User types question → handleSubmit() in app/page.tsx
  → POST /api/chat  { question }
      → app/api/chat/route.ts (server)
          → Groq API (llama-3.3-70b-versatile)
          ← { text: "..." }
      ← { text: "..." }
  → ResponseBlock renders markdown-like text
  → useHistory().add() saves question + response to localStorage
```

### Theme flow

```
app/layout.tsx injects <ThemeScript /> in <head>
  → Inline JS reads localStorage before first paint → sets data-theme on <html>
  → CSS [data-theme="..."] rules apply correct CSS custom properties
ThemePicker dropdown → applyTheme() sets data-theme + saveTheme() writes to localStorage
```

---

## Theming system

All visual styling is driven by CSS custom properties defined in `app/globals.css`. Every component uses variables (`--bg`, `--surface`, `--surface-alt`, `--border`, `--accent`, `--accent-hover`, `--accent-text`, `--text`, `--text-muted`). Two utility colors (`--danger`, `--success`) are theme-independent.

**To add a new theme:**
1. Add `[data-theme="my-theme"] { --bg: ...; --surface: ...; ... }` to `globals.css` (populate all 9 variables).
2. Register it in `app/lib/themes.ts` — add an entry to the `THEMES` object with `label` and `swatch` color.
3. Add the slug string to the `VALID_THEMES` array in `app/components/ThemeScript.tsx`.

The picker, localStorage persistence, and pre-paint script all pick it up automatically.

---

## History system (`useHistory`)

Defined in `app/components/HistoryDrawer.tsx`. Stores up to 50 entries in `localStorage` under the key `handydad-history`. Each entry has:

```ts
{
  id: string       // crypto.randomUUID()
  question: string
  response: string
  ts: number       // Date.now()
}
```

The `HistoryDrawer` component renders as a slide-in `<aside>` with a backdrop. Selecting an entry repopulates the textarea and response panel without making a new API call.

---

## API route (`app/api/chat/route.ts`)

A simple Next.js Route Handler that:
- Validates the `question` field (non-empty string).
- Checks `GROQ_API_KEY` is present (500 if missing).
- Calls Groq at `https://api.groq.com/openai/v1/chat/completions` with a fixed system prompt and the user's question.
- Returns `{ text: string }` on success or `{ error: string }` with an appropriate HTTP status on failure.

The system prompt is hardcoded in the file. To change the AI persona or output format, edit `SYSTEM_PROMPT` at the top of that file.

---

## Markdown rendering (`ResponseBlock`)

A lightweight custom renderer in `app/page.tsx`. It splits the response on newlines and maps each line to a React element:

| Pattern | Output |
|---|---|
| `# ` | `<h1 className="resp-h1">` |
| `## ` | `<h2 className="resp-h2">` |
| `### ` | `<h3 className="resp-h3">` |
| `---` | `<hr className="resp-hr">` |
| `- ` or `* ` | `<li className="resp-li">` |
| `N. ` | `<li className="resp-li resp-li-num">` |
| blank | `<div className="resp-gap">` |
| anything else | `<p className="resp-p">` |

Inline `renderInline()` handles `**bold**` and `` `code` `` within lines.

---

## Running locally

```bash
npm install
# create .env.local (see above)
npm run dev       # http://localhost:3000
npm run build     # production build
npm run start     # serve production build
```

Node.js 18.17+ required (Next.js 14 constraint).

---

## Common gotchas

- **Flash of default theme** — handled by `ThemeScript` injected into `<head>`. Do not remove it or move it to `<body>`.
- **`suppressHydrationWarning` on `<html>`** — required because `ThemeScript` mutates `dataset.theme` before React hydrates.
- **Supabase email confirmation** — by default Supabase requires email confirmation in production. New sign-ups may appear to succeed client-side but the user won't be able to log in until they confirm. Disable in Supabase dashboard for local dev if needed.
- **Groq key logging** — `route.ts` logs the first 8 characters of the key in dev for debugging. Remove before deploying publicly.
- **No server-side rendering of auth state** — auth is fully client-side via `AuthContext`. All protected pages redirect at runtime, not at the server/middleware level.
