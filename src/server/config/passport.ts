import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

// Serialize user for the session
passport.serializeUser((user: any, done: any) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done: any) => {
  try {
    const user = await prismaClient.user.findUnique({
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
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '',
      scope: ['profile', 'email'],
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        // Check if user exists
        let user = await prismaClient.user.findFirst({
          where: {
            email: profile.emails[0].value,
            provider: 'google'
          },
          include: { tenant: true },
        });

        if (!user) {
          // Check if email is already registered
          user = await prismaClient.user.findUnique({
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
          user = await prismaClient.user.create({
            data: {
              email: profile.emails[0].value,
              name: profile.displayName,
              provider: 'google',
              emailVerified: new Date(),
            },
            include: { tenant: true },
          });
        } else {
          // Update existing user
          user = await prismaClient.user.update({
            where: { id: user.id },
            data: {
              name: profile.displayName,
              emailVerified: new Date(),
            },
            include: { tenant: true },
          });
        }

        return done(null, user);
      } catch (error) {
        console.error('Error in Google strategy:', error);
        return done(error);
      }
    },
  ),
);

// GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL: process.env.GITHUB_CALLBACK_URL || '',
      scope: ['user:email'],
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      try {
        console.log('GitHub profile:', JSON.stringify(profile, null, 2));

        // Check if user exists
        let user = await prismaClient.user.findFirst({
          where: {
            email: profile.emails?.[0]?.value,
            provider: 'github'
          },
          include: { tenant: true },
        });

        if (!user) {
          // Get primary email from GitHub
          const primaryEmail = profile.emails?.find((email: any) => email.primary)?.value;
          if (!primaryEmail) {
            console.error('No primary email found in GitHub profile');
            return done(null, false, { message: 'No primary email found' });
          }

          console.log('Found primary email:', primaryEmail);

          // Check if email is already registered
          user = await prismaClient.user.findUnique({
            where: { email: primaryEmail },
            include: { tenant: true },
          });

          if (user) {
            console.error('Email already registered:', primaryEmail);
            // Email exists but with different provider
            return done(null, false, {
              message: 'Email already registered with different method',
            });
          }

          // Create new user
          user = await prismaClient.user.create({
            data: {
              email: primaryEmail,
              name: profile.displayName || profile.username,
              provider: 'github',
              emailVerified: new Date(),
            },
            include: { tenant: true },
          });

          console.log('Created new user:', user.email);
        } else {
          // Update existing user
          user = await prismaClient.user.update({
            where: { id: user.id },
            data: {
              name: profile.displayName || profile.username,
              emailVerified: new Date(),
            },
            include: { tenant: true },
          });

          console.log('Updated existing user:', user.email);
        }

        return done(null, user);
      } catch (error) {
        console.error('Error in GitHub strategy:', error);
        return done(error);
      }
    },
  ),
);

export default passport;
