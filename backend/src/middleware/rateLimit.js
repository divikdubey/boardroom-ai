import rateLimit from "express-rate-limit";

// Brute-force protection for login and signup (per IP)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

// Each analysis costs AI credits, so limit per logged-in user
export const analyzeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.ANALYZE_LIMIT) || 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId),
  message: { error: "Analysis limit reached. Please try again in an hour." },
});