import { Router } from "express";
import mongoose from "mongoose";
import { requireAuth } from "../middleware/auth.js";
import Report from "../models/Report.js";

const router = Router();

// History: sirf is user ki latest 20 reports
router.get("/reports", requireAuth, async (req, res) => {
  try {
    const reports = await Report.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("idea judge.score createdAt");
    res.json(reports);
  } catch (err) {
    console.error("List failed:", err.message);
    res.status(500).json({ error: "Could not load reports" });
  }
});

// Ek report, sirf agar is user ki ho
router.get("/reports/:id", requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ error: "Invalid report id" });
  }

  try {
    const report = await Report.findOne({ _id: id, user: req.userId });
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err) {
    console.error("Fetch failed:", err.message);
    res.status(500).json({ error: "Could not load report" });
  }
});

export default router;