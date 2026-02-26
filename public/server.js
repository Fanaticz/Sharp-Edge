const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Proxy endpoint for Claude Vision API (Sharp Edge)
app.post("/api/parse", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const { image_base64, media_type, book_hint } = req.body;

    if (!image_base64 || !media_type) {
      return res.status(400).json({ error: "Missing image_base64 or media_type" });
    }

    const hint = book_hint ? ` The sportsbook is likely: ${book_hint}.` : "";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type, data: image_base64 },
              },
              {
                type: "text",
                text: `Analyze this sportsbook screenshot and extract ALL odds shown.${hint}

Return ONLY valid JSON (no markdown, no backticks):
{
  "book_name": "name of sportsbook (e.g. Circa, FanDuel, DraftKings, BetMGM, Bet365, etc.)",
  "market": "market description (e.g. AL East 2026 Division Winner)",
  "odds": {
    "Full Team Name": american_odds_integer,
    "Full Team Name 2": american_odds_integer
  }
}

Rules:
- Use FULL team names (e.g. "New York Yankees" not just "Yankees")
- American odds as integers (+185 → 185, -150 → -150)
- If multiple markets/divisions visible, include ALL teams from ALL visible markets in a single odds object
- Include partially visible teams too
- Identify the sportsbook from logos, branding, colors, or UI elements`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Anthropic API error: ${errText}` });
    }

    const data = await response.json();
    let text = data.content.map((c) => c.text || "").join("");
    text = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err) {
    console.error("Parse error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── SGP Scanner: Parse fair value screenshot ───
app.post("/api/parse-sgp", async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const { image_base64, media_type } = req.body;

    if (!image_base64 || !media_type) {
      return res.status(400).json({ error: "Missing image_base64 or media_type" });
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type, data: image_base64 },
              },
              {
                type: "text",
                text: `Extract every row from this betting fair value table as JSON. Return ONLY a JSON array, no markdown, no backticks, no explanation.

Each element should be:
{"playerName":"Full Name","market":"Player Points or Player Rebounds or Player Assists or Player Threes or Player Steals or Player Blocks","direction":"Over","line":number,"bookOdds":number,"fairOdds":number,"book":"book name","ev":number}

Parsing rules:
- The "bet_name" column has format like "Gui Santos Over 16.5" → playerName:"Gui Santos", direction:"Over", line:16.5
- The "odds" column has format like "+115 / nan" or "+115 / -145" → take the FIRST number as bookOdds
- The "avg_fv" column has the fair value odds in American format like "+106" or "-120" → use as fairOdds
- The "market" column says "Player Points", "Player Rebounds", etc → use as market
- The "book" column has the sportsbook name → use as book
- The "ev" column has the EV percentage like "4.6%" → parse as number 4.6
- The "fbc" column has a decimal like "6.1%" → you can ignore this
- Include ALL rows visible in the image
- American odds as integers (+115 → 115, -130 → -130)`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Anthropic API error: ${errText}` });
    }

    const data = await response.json();
    let text = data.content.map((c) => c.text || "").join("");
    text = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err) {
    console.error("SGP parse error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasKey: !!ANTHROPIC_API_KEY });
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Sharp Edge running on port ${PORT}`);
});
