# CLAUDE.md — Sharp Edge

## Project Overview

Sharp Edge is a sports betting edge-finding platform. It identifies positive expected value (+EV) bets by comparing odds between "sharp" bookmakers (Circa, FanDuel, Pinnacle) and "soft" bookmakers (DraftKings, BetMGM, Caesars, Bet365). It uses the Anthropic Claude Vision API to extract odds from sportsbook screenshots automatically.

## Tech Stack

- **Runtime:** Node.js
- **Backend:** Express.js (single `server.js` file, 227 lines)
- **Frontend:** Vanilla HTML/CSS/JavaScript — no frameworks, no build step
- **AI:** Anthropic Claude Sonnet (Vision API for image analysis)
- **External API:** MLB Stats API (statsapi.mlb.com), proxied through the backend
- **Deployment:** Railway (auto-detects Node.js, runs `npm start`)
- **Fonts:** Google Fonts (DM Sans, JetBrains Mono, Syne, Outfit)

## Project Structure

```
sharp-edge/
├── server.js              # Express backend — API proxy for Anthropic + MLB Stats
├── package.json           # Minimal: only express dependency
├── README.md              # Deployment instructions
├── CLAUDE.md              # This file
├── mlb_sgp.html           # Root-level copy of MLB correlations (1144 lines)
└── public/                # Static frontend served by Express
    ├── index.html         # Main Sharp Edge tool (740 lines)
    ├── sgp.html           # SGP Scanner & Correlations (342 lines)
    ├── mlb_sgp.html       # MLB Player Correlations (1070 lines)
    └── server.js          # Legacy/duplicate copy — not used at runtime
```

**Note:** `public/server.js` is a stale duplicate of the root `server.js`. The root-level `mlb_sgp.html` is a slightly larger variant of `public/mlb_sgp.html`. Both are likely accidental uploads.

## Architecture

```
Browser (Vanilla JS SPAs)
  │
  │  POST /api/parse          → Claude Vision (odds extraction)
  │  POST /api/parse-sgp      → Claude Vision (fair value tables)
  │  GET  /api/mlb/schedule   → MLB Stats API proxy
  │  GET  /api/mlb/teams      → MLB Stats API proxy
  │  GET  /api/mlb/roster/:id → MLB Stats API proxy
  │  GET  /api/mlb/game/:pk   → MLB Stats API proxy
  │  GET  /api/health         → Health check
  │  GET  /*                  → SPA fallback (index.html)
  │
Express.js Backend (server.js)
  │
  ├── Anthropic API (https://api.anthropic.com/v1/messages)
  └── MLB Stats API (https://statsapi.mlb.com/api/v1/)
```

All frontend pages are self-contained single-file SPAs with inline CSS and JS (no separate .css or .js files).

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | — | Anthropic API key for Claude Vision |
| `PORT` | No | `3000` | HTTP port (auto-set by Railway) |

Without `ANTHROPIC_API_KEY`, parse endpoints return 500: `"ANTHROPIC_API_KEY not configured"`.

## Commands

```bash
# Install dependencies
npm install

# Run the server locally
export ANTHROPIC_API_KEY="sk-ant-..."
npm start
# → Sharp Edge running on port 3000

# No build step — HTML/CSS/JS served directly
# No test suite currently exists
# No linter configured
```

## Pages & Features

### `index.html` — Main +EV Finder
- Drag-and-drop upload of sportsbook screenshots
- Two-column layout: sharp books (left) vs soft books (right)
- Claude Vision extracts book name, market, and odds from images
- Calculates: fair probability (via devigging), EV%, quarter-Kelly sizing
- Multiple screenshots per book are merged automatically

### `sgp.html` — SGP Scanner & Correlations
- Two tabs: SGP Scanner and Correlations
- Scanner: upload fair value table screenshots, extract player props via Claude Vision
- Correlations: player-pair correlation analysis with filters and detail panels

### `mlb_sgp.html` — MLB Cross-Player Correlations
- 2023–2025 historical correlation data (1,308 pairs, 373 players)
- Filters: team, player, stat category, min games, min correlation
- Detail panels with correlation matrices and SGP combo recommendations

## Key Code Patterns

### Frontend (Vanilla JS)

**State management** — global variables:
```javascript
let sharpOdds = {};   // {bookName: {team: americanOdds}}
let softOdds = {};
let fairProbs = {};   // {team: probability}
let market = null;
```

**Core math functions** (in `index.html`):
- `americanToImplied(am)` — American odds → implied probability
- `impliedToAmerican(p)` — probability → American odds
- `devigMult(odds)` — remove vig using multiplicative method
- `calcEV(fairProb, odds)` — expected value percentage
- `calcKelly(fairProb, odds)` — quarter-Kelly fraction

**Rendering** — functional `render()` clears the DOM and rebuilds via innerHTML. Helper functions: `renderBookCard()`, `renderFairTable()`, `renderEVTable()`.

**Team name normalization** — `normTeam(name)` lowercases and strips whitespace for matching across books.

### Backend (Express.js)

**API proxy pattern** — each endpoint validates input, calls external API with `fetch()`, strips markdown fences from Claude responses, parses JSON, returns to client.

**Claude Vision calls** use model `claude-sonnet-4-5-20250929`, with max_tokens of 1500 (parse) or 4000 (SGP). Prompts instruct Claude to return raw JSON only.

**MLB proxy** — `/api/mlb/*` routes forward requests to `statsapi.mlb.com` to avoid browser CORS restrictions.

## Conventions

- **No build tooling** — no bundler, transpiler, or minifier. All code runs as-is.
- **Single-file pages** — each HTML page contains its own `<style>` and `<script>` blocks inline.
- **Dark theme UI** — CSS variables for colors defined in `:root` (e.g., `--bg: #0a0a0c`, `--sharp: #00e676`).
- **No framework** — DOM manipulation uses direct innerHTML and event listeners.
- **No tests** — no test suite or testing framework is configured.
- **No linting** — no ESLint or Prettier configured.
- **Minimal dependencies** — only `express` in package.json. The Anthropic API is called via native `fetch()`.
- **Commit style** — short descriptive messages (e.g., "Update mlb_sgp.html", "Add files via upload").

## Important Notes for AI Assistants

1. **All frontend code is inline** — when editing a page, the CSS, JS, and HTML are all in one file. Be careful with large edits.
2. **No build or compile step** — changes to HTML/JS/CSS take effect immediately on server restart.
3. **The Anthropic model ID** in `server.js` is `claude-sonnet-4-5-20250929`. Update this if switching models.
4. **50MB request limit** — `express.json({ limit: "50mb" })` supports large base64 image uploads.
5. **SPA fallback** — `app.get("*")` serves `index.html` for all unmatched routes. New HTML pages in `public/` must be accessed by exact path (e.g., `/sgp.html`).
6. **Duplicate files** — `public/server.js` and the root `mlb_sgp.html` appear to be stale copies. The authoritative server is `./server.js` and pages are served from `public/`.
7. **No authentication** — the app has no user auth. The only secret is `ANTHROPIC_API_KEY` on the server side.
8. **No database** — all state is client-side in memory. Nothing persists between page reloads.
