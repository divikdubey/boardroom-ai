import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

// Strategy 1 (local): email + password se login
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() });
      const ok = user && (await bcrypt.compare(password, user.password));
      if (!ok) return done(null, false, { message: "Email ya password galat hai" });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// Strategy 2 (jwt): token dekh ke pehchano ki kaun user hai
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
    },
    async (payload, done) => {
      try {
        const user = await User.findById(payload.id);
        return done(null, user || false);
      } catch (err) {
        return done(err, false);
      }
    }
  )
);

export default passport;