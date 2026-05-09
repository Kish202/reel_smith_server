import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import { signToken } from '../utils/jwt.js';

const router = express.Router();

// Called from index.js AFTER dotenv.config() runs
export function initGoogleStrategy() {
  passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = await User.create({
          googleId: profile.id,
          email:    profile.emails[0].value,
          name:     profile.displayName,
          avatar:   profile.photos?.[0]?.value,
        });
        console.log(`New user: ${user.email}`);
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
}

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

router.get('/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}?error=auth_failed`
  }),
  (req, res) => {
    const token = signToken({ id: req.user._id });
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  }
);

router.get('/me', async (req, res) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.json({ user: null });

  const { verifyToken } = await import('../utils/jwt.js');
  const decoded = verifyToken(header.split(' ')[1]);
  if (!decoded) return res.json({ user: null });

  const user = await User.findById(decoded.id).select('-__v');
  res.json({ user });
});

router.post('/logout', (req, res) => {
  res.json({ success: true });
});

export default router;
