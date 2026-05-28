import { Router } from "express";
  import { requireAuth, AuthRequest } from "../middlewares/auth";
  import { logger } from "../lib/logger";

  const router = Router();

  const MODELS = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-latest"];

  interface GeminiResult { ok: boolean; text: string; status?: number; rawError?: string }

  async function callGemini(apiKey: string, model: string, systemInstruction: string, prompt: string): Promise<GeminiResult> {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
        }),
      });

      if (!response.ok) {
        const errBody = await response.text().catch(() => "");
        // Extract meaningful message from Gemini error JSON
        let friendlyError = errBody.slice(0, 300);
        try {
          const parsed = JSON.parse(errBody) as { error?: { message?: string; status?: string } };
          if (parsed.error?.message) friendlyError = `${parsed.error.status ?? ""} — ${parsed.error.message}`;
        } catch { /* keep raw */ }
        return { ok: false, status: response.status, text: friendlyError, rawError: errBody };
      }

      const data = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (!reply) return { ok: false, text: "Gemini returned an empty response." };
      return { ok: true, text: reply };
    } catch (err) {
      return { ok: false, text: `Network error calling Gemini: ${String(err)}` };
    }
  }

  router.post("/ai/assist", requireAuth, async (req: AuthRequest, res): Promise<void> => {
    const { prompt, context } = req.body;
    if (!prompt) { res.json({ response: "Please provide a question.", error: "no_prompt" }); return; }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.json({
        response: "⚠️ GEMINI_API_KEY is not set on the server. Go to your Render dashboard → your API service → Environment tab → add GEMINI_API_KEY.",
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

    const errors: string[] = [];
    for (const model of MODELS) {
      const result = await callGemini(apiKey, model, systemInstruction, prompt);
      if (result.ok) {
        res.json({ response: result.text, model });
        return;
      }
      const errMsg = `[${model}] HTTP ${result.status ?? "?"}: ${result.text}`;
      errors.push(errMsg);
      logger.warn({ model, error: result.text, status: result.status }, "Gemini model failed");
    }

    // Surface the ACTUAL Gemini errors so the user knows exactly what to fix
    const firstError = errors[0] ?? "Unknown error";
    let userMessage: string;

    if (firstError.includes("API_KEY_INVALID") || firstError.includes("400") && firstError.includes("key")) {
      userMessage = `⚠️ Your GEMINI_API_KEY is invalid. Get a fresh one at https://aistudio.google.com/app/apikey and update it on Render.`;
    } else if (firstError.includes("PERMISSION_DENIED") || firstError.includes("403")) {
      userMessage = `⚠️ API key permission denied. Make sure "Generative Language API" is enabled in Google Cloud Console for your project (console.cloud.google.com → APIs & Services → Enable APIs).`;
    } else if (firstError.includes("429") || firstError.includes("RESOURCE_EXHAUSTED")) {
      userMessage = `⚠️ Gemini quota exceeded. Your free tier limit may be reached — wait a minute and try again, or upgrade your Google AI plan.`;
    } else {
      userMessage = `⚠️ Gemini error: ${firstError.slice(0, 250)}`;
    }

    res.json({ response: userMessage, error: "all_models_failed", details: errors });
  });

  export default router;
  