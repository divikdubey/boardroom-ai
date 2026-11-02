import { callGemini } from "./callGemini.js";

const SYSTEM =
  "You are the Judge of a startup advisory panel. You will get a startup idea " +
  "and reports from a Market Researcher, Competitor Analyst, Critic and Financial Planner. " +
  "Read all of them and give a final verdict. " +
  "Reply with ONLY valid JSON, no markdown, no extra text, in this shape: " +
  '{"score": number from 1 to 10, "verdict": "one line", ' +
  '"strengths": ["..", ".."], "risks": ["..", ".."], "nextSteps": ["..", "..", ".."]}';

function parseJSON(text) {
  const clean = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    return { raw: text };
  }
}

export async function runJudge(idea, reports) {
  const message =
    `Startup idea: ${idea}\n\n` +
    `Market Researcher:\n${reports.market}\n\n` +
    `Competitor Analyst:\n${reports.competitors}\n\n` +
    `Critic:\n${reports.critic}\n\n` +
    `Financial Planner:\n${reports.financial}`;

  const text = await callGemini(SYSTEM, message);
  return parseJSON(text);
}