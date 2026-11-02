import passport from "passport";

export const requireAuth = (req, res, next) =>
  passport.authenticate("jwt", { session: false }, (err, user) => {
    if (err) return next(err);
    if (!user) {
      return res.status(401).json({ error: "Please log in to continue" });
    }
    req.user = user;
    req.userId = user._id;
    next();
  })(req, res, next);