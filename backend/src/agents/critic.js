import { callGemini } from "./callGemini.js";

const SYSTEM =
  "You are a Critic (devil's advocate) on a startup advisory panel. " +
  "You will get the idea plus the Market Researcher and Competitor Analyst reports. " +
  "Challenge their claims directly: name which claim you doubt and why. " +
  "Then give the 3 biggest reasons this idea could fail. " +
  "Be blunt but fair, under 200 words, simple English.";

export function runCritic(idea, reports, onToken) {
  const message =
    `Startup idea: ${idea}\n\n` +
    `Market Researcher said:\n${reports.market}\n\n` +
    `Competitor Analyst said:\n${reports.competitors}`;
  return callGemini(SYSTEM, message, onToken);
}