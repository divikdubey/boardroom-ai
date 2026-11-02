import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import passport from "passport";
import User from "../models/User.js";
import { requireAuth } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();

const makeToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
});

// Signup: Passport isme kuch nahi karta, ye humara apna kaam hai
router.post("/signup", authLimiter, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email aur password chahiye" });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ error: "Email sahi nahi hai" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password kam se kam 6 akshar ka ho" });
  }

  try {
    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: "Ye email pehle se registered hai" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    res.status(201).json({ token: makeToken(user), user: publicUser(user) });
  } catch (err) {
    console.error("Signup failed:", err.message);
    res.status(500).json({ error: "Signup nahi ho paya" });
  }
});

// Login: Passport ki local strategy check karti hai
router.post("/login", authLimiter, (req, res, next) => {
  if (!req.body.email || !req.body.password) {
    return res.status(400).json({ error: "Email aur password chahiye" });
  }

  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: info?.message || "Login fail ho gaya" });
    }
    res.json({ token: makeToken(user), user: publicUser(user) });
  })(req, res, next);
});

// Token sahi hai ya nahi, aur kaun user hai
router.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});

export default router;