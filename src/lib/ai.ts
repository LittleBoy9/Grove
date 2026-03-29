import { GroveSettings } from "./settings";

export const AI_PROVIDERS = [
  { id: "anthropic", name: "Anthropic (Claude)" },
  { id: "openai",    name: "OpenAI (GPT)" },
  { id: "gemini",    name: "Google Gemini" },
] as const;

export const AI_MODELS: Record<string, { id: string; name: string }[]> = {
  anthropic: [
    { id: "claude-opus-4-6",          name: "Claude Opus 4.6" },
    { id: "claude-sonnet-4-6",        name: "Claude Sonnet 4.6" },
    { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5" },
  ],
  openai: [
    { id: "gpt-4o",       name: "GPT-4o" },
    { id: "gpt-4o-mini",  name: "GPT-4o Mini" },
    { id: "gpt-4-turbo",  name: "GPT-4 Turbo" },
    { id: "o1",           name: "o1" },
    { id: "o1-mini",      name: "o1 Mini" },
  ],
  gemini: [
    { id: "gemini-2.5-pro",       name: "Gemini 2.5 Pro" },
    { id: "gemini-2.5-flash",     name: "Gemini 2.5 Flash" },
    { id: "gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
    { id: "gemini-2.0-flash",     name: "Gemini 2.0 Flash" },
  ],
};

function buildPrompt(diff: string): string {
  return `You are a git expert. Generate a concise conventional commit message for the following staged diff.

Rules:
- Format: type(scope): short description  (max 72 chars total)
- Types: feat, fix, refactor, docs, style, test, chore, perf
- Scope is optional — only include if it meaningfully narrows the change
- Be specific about what changed, not how the code works
- Return ONLY the commit message — no explanation, no markdown, no quotes

Diff:
${diff.slice(0, 8000)}`;
}

export async function generateCommitMessage(diff: string, settings: GroveSettings): Promise<string> {
  const { aiProvider, aiKey, aiModel } = settings;
  if (!aiProvider || !aiKey || !aiModel) {
    throw new Error("AI not configured — add a provider, model, and API key in Settings");
  }

  const prompt = buildPrompt(diff);

  if (aiProvider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": aiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err?.error?.message ?? `Anthropic error ${res.status}`);
    }
    const data = await res.json() as { content?: { text: string }[] };
    return (data.content?.[0]?.text ?? "").trim();
  }

  if (aiProvider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        max_tokens: 256,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err?.error?.message ?? `OpenAI error ${res.status}`);
    }
    const data = await res.json() as { choices?: { message: { content: string } }[] };
    return (data.choices?.[0]?.message?.content ?? "").trim();
  }

  if (aiProvider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${aiModel}:generateContent?key=${aiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 256 },
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err?.error?.message ?? `Gemini error ${res.status}`);
    }
    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[] };
    return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
  }

  throw new Error("Unknown AI provider");
}
