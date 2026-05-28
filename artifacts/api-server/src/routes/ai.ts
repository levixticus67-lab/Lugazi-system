import { Router } from "express";
  import { requireAuth, AuthRequest } from "../middlewares/auth";
  import { logger } from "../lib/logger";

  const router = Router();

  const MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
  ];

  async function callGemini(apiKey: string, model: string, systemInstruction: string, prompt: string): Promise<{ ok: boolean; text: string }> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
    });
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body });
    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      return { ok: false, text: `Gemini ${model} error ${response.status}: ${errText.slice(0, 200)}` };
    }
    const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!reply) return { ok: false, text: "Gemini returned an empty response." };
    return { ok: true, text: reply };
  }

  // Diagnostic endpoint — returns status without needing a real prompt
  router.get("/ai/test", requireAuth, async (_req, res): Promise<void> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) { res.json({ status: "no_key", message: "GEMINI_API_KEY is not set in environment variables." }); return; }
    const result = await callGemini(apiKey, "gemini-2.0-flash", "You are a test assistant.", "Say: AI is working correctly.").catch(e => ({ ok: false, text: String(e) }));
    res.json({ status: result.ok ? "ok" : "error", model: "gemini-2.0-flash", message: result.text });
  });

  router.post("/ai/assist", requireAuth, async (req: AuthRequest, res): Promise<void> => {
    const { prompt, context } = req.body;
    if (!prompt) { res.json({ response: "Please provide a question.", error: "no_prompt" }); return; }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.json({
        response: "⚠️ AI is not yet configured. Please add GEMINI_API_KEY to your Render environment variables (Dashboard → your service → Environment).",
        error: "no_api_key",
      });
      return;
    }

    const systemInstruction = `You are an intelligent assistant for DCL Lugazi ERP — the digital management system for Deliverance Church Lugazi (The House of Kingdom Giants) in Uganda.
  You assist church administrators, leaders, workforce, and members with insights and guidance on:
  - Member management and spiritual growth tracking
  - Attendance patterns and service planning
  - Financial stewardship, tithes, and offerings
  - Welfare coordination and community support
  - Prayer requests, sermons, and spiritual development
  - Cell fellowship and group management
  - Pipeline follow-up and member engagement
  Keep responses concise (max 3-4 sentences), practical, faith-based, and relevant to Uganda context.
  Current context: ${context || "General church administration"}`;

    // Try each model in order, return the first success
    for (const model of MODELS) {
      try {
        const result = await callGemini(apiKey, model, systemInstruction, prompt);
        if (result.ok) {
          res.json({ response: result.text, model });
          return;
        }
        logger.warn({ model, error: result.text }, "Gemini model failed, trying next");
      } catch (err) {
        logger.warn({ model, err }, "Gemini model threw, trying next");
      }
    }

    // All models failed — return 200 with a helpful message (not 500, so the UI shows it gracefully)
    logger.error({ prompt }, "All Gemini models failed");
    res.json({
      response: "⚠️ Could not reach the AI service right now. Please check that your GEMINI_API_KEY on Render is valid and has the Generative Language API enabled in Google Cloud Console.",
      error: "all_models_failed",
    });
  });

  export default router;
  