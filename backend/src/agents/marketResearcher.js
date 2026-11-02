import { callGemini } from "./callGemini.js";

const SYSTEM =
  "You are a Market Researcher on a startup advisory panel. " +
  "Analyze the idea: target audience, market size, demand signals, " +
  "and key trends. Be specific, under 200 words, simple English.";

export function runMarketResearcher(idea, onToken) {
  return callGemini(SYSTEM, `Startup idea: ${idea}`, onToken);
}