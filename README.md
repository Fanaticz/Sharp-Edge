# Sharp Edge 🎯

Find +EV bets by comparing sharp book odds against soft books. Upload screenshots, get edges.

## Deploy to Railway

1. Push this folder to a GitHub repo (or use Railway CLI)

2. In Railway dashboard:
   - **New Project → Deploy from GitHub repo**
   - Add environment variable: `ANTHROPIC_API_KEY` = your key

3. That's it. Railway auto-detects Node.js and runs `npm start`.

## How to Use

1. **Drop sharp book screenshots** (left zone) — Circa, FanDuel, Pinnacle
2. **Drop soft book screenshots** (right zone) — DraftKings, BetMGM, etc.
3. **View the Best Bets table** — sorted by EV% with Kelly sizing

Multiple screenshots per book are merged automatically (e.g. 2 Circa screenshots = 1 combined Circa card).

## Project Structure

```
sharp-edge/
├── server.js          # Express backend (proxies Anthropic API)
├── package.json
├── public/
│   └── index.html     # Full frontend (single file)
└── README.md
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `PORT` | No | Auto-set by Railway |
