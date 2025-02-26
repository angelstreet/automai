import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { PrismaClient } from '@prisma/client';

const prismaClient = new PrismaClient();

// Serialize user for the session
passport.serializeUser((user: any, done: any) => {
  console.log('Serializing user:', user.id);
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser(async (id: string, done: any) => {
  try {
    console.log('Deserializing user:', id);
    const user = await prismaClient.user.findUnique({
      where: { id },
      include: { tenant: true },
    });
    console.log('Deserialized user found:', user ? 'yes' : 'no');
    done(null, user);
  } catch (error) {
    console.error('Error deserializing user:', error);
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
        console.log('Google OAuth Profile:', {
          id: profile.id,
          displayName: profile.displayName,
          email: profile.emails?.[0]?.value,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });

        // Check if user exists
        let user = await prismaClient.user.findFirst({
          where: {
            email: profile.emails[0].value,
            provider: 'google'
          },
          include: { tenant: true },
        });

        console.log('Existing Google user found:', user ? 'yes' : 'no');

        if (!user) {
          // Check if email is already registered
          user = await prismaClient.user.findUnique({
            where: { email: profile.emails[0].value },
            include: { tenant: true },
          });

          if (user) {
            console.log('Email already registered with different provider:', profile.emails[0].value);
            return done(null, false, {
              message: 'Email already registered with different method',
            });
          }

          console.log('Creating new Google user:', profile.emails[0].value);
          // Create new user
          user = await prismaClient.user.create({
            data: {
              email: profile.emails[0].value,
              name: profile.displayName,
              provider: 'google',
              emailVerified: new Date(),
              role: 'ADMIN',
            },
            include: { tenant: true },
          });
          console.log('New Google user created:', { id: user.id, email: user.email });
        } else {
          console.log('Updating existing Google user:', user.email);
          // Update existing user
          user = await prismaClient.user.update({
            where: { id: user.id },
            data: {
              name: profile.displayName,
              emailVerified: new Date(),
            },
            include: { tenant: true },
          });
          console.log('Google user updated:', { id: user.id, email: user.email });
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
        console.log('GitHub OAuth attempt:', {
          id: profile.id,
          username: profile.username,
          displayName: profile.displayName,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        });

        // Check if user exists
        let user = await prismaClient.user.findFirst({
          where: {
            email: profile.emails?.[0]?.value,
            provider: 'github'
          },
          include: { tenant: true },
        });

        console.log('Existing GitHub user found:', user ? 'yes' : 'no');

        if (!user) {
          // Get primary email from GitHub
          const primaryEmail = profile.emails?.find((email: any) => email.primary)?.value;
          if (!primaryEmail) {
            console.error('No primary email found in GitHub profile');
            return done(null, false, { message: 'No primary email found' });
          }

          console.log('Found GitHub primary email:', primaryEmail);

          // Check if email is already registered
          user = await prismaClient.user.findUnique({
            where: { email: primaryEmail },
            include: { tenant: true },
          });

          if (user) {
            console.error('Email already registered with different provider:', primaryEmail);
            return done(null, false, {
              message: 'Email already registered with different method',
            });
          }

          console.log('Creating new GitHub user:', primaryEmail);
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

          console.log('New GitHub user created:', { id: user.id, email: user.email });
        } else {
          console.log('Updating existing GitHub user:', user.email);
          // Update existing user
          user = await prismaClient.user.update({
            where: { id: user.id },
            data: {
              name: profile.displayName || profile.username,
              emailVerified: new Date(),
            },
            include: { tenant: true },
          });

          console.log('GitHub user updated:', { id: user.id, email: user.email });
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
