import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Gemini Kurulumu
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// IP-based 30s lock (anti spam)
const locks = new Map();

async function analyzeWithAI(codeContent, retries = 2) {
  try {
    const prompt = `You are a Roblox Lua security scanner. Analyze behavior, not variable names.
    Return ONLY:
    Risk: (Low/Medium/High)
    Score: (0-100)
    Reason: (Short Turkish explanation)

    Script:
    ${codeContent}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();

  } catch (err) {
    if (retries > 0) {
      console.log("Retrying AI request...");
      return analyzeWithAI(codeContent, retries - 1);
    }
    return null;
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
    return res.json({ status: "error", message: "No script provided." });
  }

  const aiResult = await analyzeWithAI(code);

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
  res.send("Roblox AI Scanner running ✅ - 7/24 Active");
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
