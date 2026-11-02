import "dotenv/config";
import express from "express";
import cors from "cors";
import passport from "passport";
import { connectDB } from "./config/db.js";
import "./config/passport.js";
import ideaRoutes from "./routes/ideas.js";
import reportRoutes from "./routes/reports.js";
import authRoutes from "./routes/auth.js";

const app = express();
// Behind Render's proxy, trust it so req.ip is the real user IP (needed after deploy)
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(passport.initialize());

app.use("/api", ideaRoutes);
app.use("/api", reportRoutes);
app.use("/api/auth", authRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "Boardroom AI" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});