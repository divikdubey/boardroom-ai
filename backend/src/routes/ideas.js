import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import Report from "../models/Report.js";
import { runMarketResearcher } from "../agents/marketResearcher.js";
import { runCompetitorAnalyst } from "../agents/competitorAnalyst.js";
import { runCritic } from "../agents/critic.js";
import { runFinancialPlanner } from "../agents/financialPlanner.js";
import { runJudge } from "../agents/judge.js";
import { analyzeLimiter } from "../middleware/rateLimit.js";

const router = Router();

// Ek agent chalao, shuru/khatam/tokens ki khabar bhejo
async function step(name, emit, fn) {
  emit("agent_start", { agent: name });
  const onToken = (text) => emit("token", { agent: name, text });
  const result = await fn(onToken);
  emit("agent_done", { agent: name, result });
  return result;
}

// Poora pipeline: 3 phases
async function runPipeline(idea, emit = () => {}) {
  // Phase 1: dono saath mein
  const [market, competitors] = await Promise.all([
    step("market", emit, (t) => runMarketResearcher(idea, t)),
    step("competitors", emit, (t) => runCompetitorAnalyst(idea, t)),
  ]);

  // Phase 2: dono pehle ka jawab padh ke, saath mein
  const [critic, financial] = await Promise.all([
    step("critic", emit, (t) => runCritic(idea, { market, competitors }, t)),
    step("financial", emit, (t) =>
      runFinancialPlanner(idea, { market, competitors }, t)
    ),
  ]);

  // Phase 3: Judge (stream nahi hota)
  const judge = await step("judge", emit, () =>
    runJudge(idea, { market, competitors, critic, financial })
  );

  return { market, competitors, critic, financial, judge };
}

// Report save karo. Save fail ho toh bhi analysis user ko milna chahiye
async function saveReport(userId, idea, result) {
  try {
    const report = await Report.create({ user: userId, idea, ...result });
    return report._id;
  } catch (err) {
    console.error("Save failed:", err.message);
    return null;
  }
}

// Poora jawab ek saath (login zaroori)
router.post("/analyze", requireAuth, analyzeLimiter, async (req, res) => {
  const idea = req.body.idea?.trim();
  if (!idea) return res.status(400).json({ error: "Idea is required" });

  try {
    const result = await runPipeline(idea);
    const id = await saveReport(req.userId, idea, result);
    res.json({ id, ...result });
  } catch (err) {
    console.error("AI call failed:", err.message);
    res.status(500).json({ error: "AI call failed" });
  }
});

// Live events (SSE). Ab POST hai, taaki token header mein aa sake
router.post("/analyze-stream", requireAuth, analyzeLimiter, async (req, res) => {
  const idea = req.body.idea?.trim();
  if (!idea) return res.status(400).json({ error: "Idea is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const emit = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await runPipeline(idea, emit);
    const id = await saveReport(req.userId, idea, result);
    emit("saved", { id });
    emit("done", {});
  } catch (err) {
    console.error("AI call failed:", err.message);
    emit("error", { message: "AI call failed" });
  }
  res.end();
});

export default router;