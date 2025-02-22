const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Serialize user for the session
passport.serializeUser((user: any, done: any) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { tenant: true },
    });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Check if user exists
        let user = await prisma.user.findFirst({
          where: {
            provider: 'google',
            providerId: profile.id,
          },
          include: { tenant: true },
        });

        if (!user) {
          // Check if email is already registered
          user = await prisma.user.findUnique({
            where: { email: profile.emails[0].value },
            include: { tenant: true },
          });

          if (user) {
            // Email exists but with different provider
            return done(null, false, {
              message: 'Email already registered with different method',
            });
          }

          // Create new user
          user = await prisma.user.create({
            data: {
              email: profile.emails[0].value,
              name: profile.displayName,
              provider: 'google',
              providerId: profile.id,
              providerAccessToken: accessToken,
              providerRefreshToken: refreshToken,
              emailVerified: true, // Google emails are verified
            },
            include: { tenant: true },
          });
        } else {
          // Update existing user
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              providerAccessToken: accessToken,
              providerRefreshToken: refreshToken,
            },
            include: { tenant: true },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: process.env.GITHUB_CALLBACK_URL,
      scope: ['user:email'],
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Check if user exists
        let user = await prisma.user.findFirst({
          where: {
            provider: 'github',
            providerId: profile.id.toString(),
          },
          include: { tenant: true },
        });

        if (!user) {
          // Get primary email from GitHub
          const primaryEmail = profile.emails?.find((email: any) => email.primary)?.value;
          if (!primaryEmail) {
            return done(null, false, { message: 'No primary email found' });
          }

          // Check if email is already registered
          user = await prisma.user.findUnique({
            where: { email: primaryEmail },
            include: { tenant: true },
          });

          if (user) {
            // Email exists but with different provider
            return done(null, false, {
              message: 'Email already registered with different method',
            });
          }

          // Create new user
          user = await prisma.user.create({
            data: {
              email: primaryEmail,
              name: profile.displayName || profile.username,
              provider: 'github',
              providerId: profile.id.toString(),
              providerAccessToken: accessToken,
              providerRefreshToken: refreshToken,
              emailVerified: true, // GitHub emails are verified
            },
            include: { tenant: true },
          });
        } else {
          // Update existing user
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              providerAccessToken: accessToken,
              providerRefreshToken: refreshToken,
            },
            include: { tenant: true },
          });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

module.exports = passport; 