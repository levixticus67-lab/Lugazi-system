import { Router } from "express";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

const SYSTEM_PROMPT = `You are an intelligent assistant for DCL Lugazi ERP — the digital management system for Deliverance Church Lugazi (The House of Kingdom Giants) in Uganda.
You assist church administrators, leaders, workforce, and members with insights and guidance on:
- Member management and spiritual growth tracking
- Attendance patterns and service planning
- Financial stewardship, tithes, and offerings
- Welfare coordination and community support
- Prayer requests, sermons, and spiritual development
- Cell fellowship and group management
- Pipeline follow-up and member engagement
Keep responses concise (max 3–4 sentences), practical, faith-based, and relevant to the Ugandan church context.`;

router.post("/ai/assist", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { prompt, context } = req.body;
  if (!prompt) { res.status(400).json({ error: "prompt required" }); return; }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.json({
      response: "AI Assistant is not yet configured. To enable it, add your GEMINI_API_KEY to the Render environment variables. Get a free key at aistudio.google.com → Get API Key (no credit card needed).",
      error: "no_api_key",
    });
    return;
  }

  const model = "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: {
      parts: [{ text: `${SYSTEM_PROMPT}\nCurrent page context: ${context || "General church management"}` }],
    },
    contents: [
      { role: "user", parts: [{ text: prompt }] },
    ],
    generationConfig: {
      maxOutputTokens: 400,
      temperature: 0.7,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error({ status: response.status, err }, "Gemini API error");
      res.status(500).json({ response: "AI service temporarily unavailable. Please try again shortly.", error: "api_error" });
      return;
    }

    const data = await response.json() as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response received.";
    res.json({ response: reply });
  } catch (err) {
    logger.error({ err }, "Gemini AI assist error");
    res.status(500).json({ response: "Unable to reach the AI service right now. Please try again.", error: "network_error" });
  }
});

export default router;
