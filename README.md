# HandyDad AI

Your expert guide for home repairs. Type a question like _"How do I fix a leaky faucet?"_ and HandyDad — a calm, safety-first virtual handyman with 40+ years of experience — walks you through the job step by step.

Built with Next.js 14 (App Router), Supabase Auth, and the Groq API.

---

## Features

- **Structured tutorials** — every answer covers _What We're Doing_, _Tools Needed_, _Safety Check_, _Step-by-Step Instructions_, _What Could Go Wrong_, a _Dad Tip_, and _When to Call a Professional_.
- **Email & password auth** via Supabase. Sessions persist across reloads.
- **Five themes** (Workbench, Garage Blue, Safety Orange, Forest Green, Steel Gray) with a unified design system. Theme choice is saved to `localStorage` and applied before first paint to avoid flash.
- **Lightweight Markdown rendering** for headings, lists, bold, and inline code.
- **Quick-start chips** with common repair questions.

---

## Tech stack

| Layer        | Tool                                                      |
| ------------ | --------------------------------------------------------- |
| Framework    | Next.js 14 (App Router) + React 18 + TypeScript           |
| Auth & DB    | [Supabase](https://supabase.com)                          |
| LLM          | [Groq](https://groq.com) (`openai/gpt-oss-120b`)          |
| Styling      | Plain CSS with CSS custom properties for themes           |

---

## Getting started

### 1. Prerequisites

- Node.js 18.17+ (or 20+)
- A Supabase project (free tier is fine)
- A Groq API key

### 2. Install

```bash
npm install
```

### 3. Configure environment

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GROQ_API_KEY=gsk_your_groq_key
```

`.env.local` is gitignored — never commit it.

### 4. Run

```bash
npm run dev
```

Open http://localhost:3000, sign up, and ask HandyDad something.

---

## Project structure

```
app/
  api/chat/route.ts      Server-side proxy to the Groq chat completions API
  components/
    ThemePicker.tsx      Theme dropdown (client)
    ThemeScript.tsx      Inline <head> script that applies saved theme pre-paint
  context/
    AuthContext.tsx      Supabase auth provider + useAuth hook
  lib/
    themes.ts            Theme registry, persistence helpers
  login/page.tsx         Sign-in form
  signup/page.tsx        Sign-up form
  page.tsx               Home page (the chat UI)
  layout.tsx             Root layout — injects ThemeScript + AuthProvider
  globals.css            Design tokens + all component styles
lib/
  supabase.ts            Browser Supabase client
```

### Theming

All themes share the same CSS variable shape (`--bg`, `--surface`, `--surface-alt`, `--border`, `--accent`, `--accent-hover`, `--accent-text`, `--text`, `--text-muted`). Each theme is a single CSS rule keyed on `[data-theme="..."]` in [`app/globals.css`](app/globals.css). To add a new theme:

1. Add a `[data-theme="my-theme"] { ... }` block in `globals.css` with values for every variable.
2. Register it in [`app/lib/themes.ts`](app/lib/themes.ts) with a label and swatch color.
3. Add its slug to the `VALID_THEMES` array in [`app/components/ThemeScript.tsx`](app/components/ThemeScript.tsx).

That's it — the picker, persistence, and pre-paint script pick it up automatically.

---

## Scripts

| Command         | What it does                  |
| --------------- | ----------------------------- |
| `npm run dev`   | Start the dev server          |
| `npm run build` | Production build              |
| `npm run start` | Start the production server   |

---

## Notes & disclaimer

HandyDad AI is a learning aid, not a replacement for a licensed professional. Always verify electrical, gas, plumbing, and structural work with a qualified tradesperson before starting — and never skip the Safety Check section.
