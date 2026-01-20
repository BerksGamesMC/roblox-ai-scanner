import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// IP-based 30s lock (anti spam)
const locks = new Map();

async function analyzeWithAI(prompt, retries = 2) {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20000); // 20s timeout

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0
      })
    });

    if (!response.ok) throw new Error("OpenAI response error");

    const data = await response.json();
    const result = data?.choices?.[0]?.message?.content;

    if (!result) throw new Error("Empty AI response");

    return result;

  } catch (err) {
    if (retries > 0) {
      return analyzeWithAI(prompt, retries - 1);
    }
    return null; // IMPORTANT: never throw to user
  }
}

app.post("/scan", async (req, res) => {
  const ip = req.ip;
  const now = Date.now();

  if (locks.has(ip) && now - locks.get(ip) < 30000) {
    return res.json({
      status: "wait",
      message: "⏳ Please wait 30 seconds before scanning again."
    });
  }

  locks.set(ip, now);

  const { code } = req.body;
  if (!code) {
    return res.json({
      status: "error",
      message: "No script provided."
    });
  }

  const prompt = `
You are a Roblox Lua security scanner.
Analyze behavior, not variable names.

Return ONLY:
Risk:
Score:
Reason:

Script:
${code}
`;

  const aiResult = await analyzeWithAI(prompt);

  if (!aiResult) {
    return res.json({
      status: "busy",
      message: "⚠️ AI is busy right now. Please try again in a few seconds."
    });
  }

  res.json({
    status: "ok",
    result: aiResult
  });
});

app.get("/", (_, res) => {
  res.send("Roblox AI Scanner running ✅");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
