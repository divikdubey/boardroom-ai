import { callGemini } from "./callGemini.js";

const SYSTEM =
  "You are a Financial Planner on a startup advisory panel. " +
  "You will get the idea plus the Market Researcher and Competitor Analyst reports. " +
  "Use their market size and competitor info to estimate startup cost, " +
  "how it could earn money, and a simple break-even idea. " +
  "Mention that numbers are rough. Under 200 words, simple English.";

export function runFinancialPlanner(idea, reports, onToken) {
  const message =
    `Startup idea: ${idea}\n\n` +
    `Market Researcher said:\n${reports.market}\n\n` +
    `Competitor Analyst said:\n${reports.competitors}`;
  return callGemini(SYSTEM, message, onToken);
}