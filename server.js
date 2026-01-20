import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/scan", async (req, res) => {
  const code = req.body.code;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENAI_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You analyze Roblox scripts for account stealing or malware."
        },
        {
          role: "user",
          content: `
Analyze this Roblox script.
Reply ONLY JSON:
{
 "risk":"LOW|MEDIUM|HIGH",
 "score":0-100,
 "reason":"short explanation"
}

SCRIPT:
${code}
`
        }
      ]
    })
  });

  const data = await response.json();
  res.json(data.choices[0].message.content);
});

app.listen(3000);
