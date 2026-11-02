import { GoogleGenAI } from "@google/genai";

const MODELS = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function callGemini(systemInstruction, userMessage, onToken) {
  // Mock mode: no real AI call
  if (process.env.MOCK_AI === "true") {
    // Judge: fake structured JSON so the score meter can be tested
    if (systemInstruction.includes("You are the Judge")) {
      await sleep(500);
      return JSON.stringify({
        score: 6,
        verdict: "Large market, but competition and churn are serious risks.",
        strengths: ["Large addressable market", "Clear pain point", "Low break-even"],
        risks: ["High churn", "Strong competitors", "AI hallucination risk"],
        nextSteps: ["Pick one niche first", "Talk to 10 users", "Build a small MVP"],
      });
    }

    const text =
      `[MOCK] ${systemInstruction.slice(0, 45)}... ` +
      `(input: ${userMessage.length} chars) ` +
      `This is a mock response streaming word by word so you can test the UI.`;

    if (onToken) {
      for (const word of text.split(" ")) {
        onToken(word + " ");
        await sleep(80);
      }
    } else {
      await sleep(500);
    }
    return text;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const config = {
    httpOptions: { timeout: 15000 },
    maxOutputTokens: 1000,
    systemInstruction,
  };
  let lastError;
  let sent = false; // has any text already reached the user?

  for (let round = 1; round <= 3; round++) {
    for (const model of MODELS) {
      try {
        if (onToken) {
          const stream = await ai.models.generateContentStream({
            model,
            contents: userMessage,
            config,
          });
          let full = "";
          for await (const chunk of stream) {
            if (chunk.text) {
              sent = true;
              full += chunk.text;
              onToken(chunk.text);
            }
          }
          return full;
        }

        const response = await ai.models.generateContent({
          model,
          contents: userMessage,
          config,
        });
        return response.text;
      } catch (err) {
        console.error(`${model} failed:`, err.message.slice(0, 80));
        lastError = err;
        if (sent) throw err; // half the text is already out, a retry would duplicate it
      }
    }
    await sleep(3000 * round);
  }
  throw lastError;
}