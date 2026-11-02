import { callGemini } from "./callGemini.js";
import { webSearch } from "../tools/websearch.js";

const SYSTEM =
  "You are a Competitor Analyst on a startup advisory panel. " +
  "You will get a startup idea and real web search results. " +
  "Use ONLY companies that appear in the search results. " +
  "List 3-4 competitors, what they do well, and the gap this idea could fill. " +
  "If the results are weak, say so honestly. Under 200 words, simple English.";

export async function runCompetitorAnalyst(idea, onToken) {
  let results = [];
  try {
    results = await webSearch(`${idea} startup competitors alternatives`);
  } catch (err) {
    console.error("Search failed:", err.message);
  }

  const sources = results
    .map((r, i) => `${i + 1}. ${r.title} (${r.url}): ${r.content.slice(0, 300)}`)
    .join("\n");

  const message =
    `Startup idea: ${idea}\n\n` +
    `Web search results:\n${sources || "No results found."}`;

  return callGemini(SYSTEM, message, onToken);
}