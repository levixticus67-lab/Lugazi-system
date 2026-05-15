import { Router } from "express";
import { requireAuth, AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.post("/ai/assist", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { prompt, context } = req.body;
  if (!prompt) { res.status(400).json({ error: "prompt required" }); return; }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.json({
      response: "AI Assistant is not yet configured. To enable AI features, add your OPENAI_API_KEY to the Render environment variables in your Render dashboard under Environment → Environment Variables.",
      error: "no_api_key",
    });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an intelligent assistant for DCL Lugazi ERP — the digital management system for Deliverance Church Lugazi (The House of Kingdom Giants) in Uganda.
You assist church administrators, leaders, workforce, and members with insights and guidance on:
- Member management and spiritual growth tracking
- Attendance patterns and service planning
- Financial stewardship, tithes, and offerings
- Welfare coordination and community support
- Prayer requests, sermons, and spiritual development
- Cell fellowship and group management
- Pipeline follow-up and member engagement
Keep responses concise (max 3-4 sentences), practical, faith-based, and relevant to Uganda context.
Current context: ${context || "General church administration"}`,
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 400,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error({ status: response.status, err }, "OpenAI API error");
      res.status(500).json({ response: "AI service temporarily unavailable.", error: "api_error" });
      return;
    }

    const data = await response.json() as { choices: { message: { content: string } }[] };
    const reply = data.choices?.[0]?.message?.content ?? "No response received.";
    res.json({ response: reply });
  } catch (err) {
    logger.error({ err }, "AI assist error");
    res.status(500).json({ response: "Unable to get AI response at this time.", error: "network_error" });
  }
});

export default router;
