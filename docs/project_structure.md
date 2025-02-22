# Project Structure

```
automai/
├── src/                          # Source code directory
│   ├── app/                      # Next.js app directory (pages and routes)
│   │   ├── [locale]/            # Internationalization routes
│   │   │   ├── (auth)/          # Authentication routes group
│   │   │   │   ├── login/       # Login page
│   │   │   │   ├── signup/      # Signup page
│   │   │   │   └── layout.tsx   # Auth layout
│   │   │   ├── [tenant]/        # Tenant-specific routes
│   │   │   │   ├── dashboard/   # Dashboard page
│   │   │   │   ├── profile/     # User profile page
│   │   │   │   └── layout.tsx   # Tenant layout
│   │   │   └── page.tsx         # Home page
│   │   └── api/                 # API routes
│   │       └── auth/            # Auth API endpoints
│   ├── server/                  # Backend server code
│   │   ├── api/                 # API endpoints
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   └── routes.ts       # API routes configuration
│   │   ├── config/             # Server configuration
│   │   │   ├── env/           # Environment configurations
│   │   │   └── passport.ts    # Passport.js configuration
│   │   ├── middleware/        # Express middleware
│   │   ├── prisma/           # Prisma ORM
│   │   │   ├── schema.prisma # Database schema
│   │   │   └── seed.ts      # Database seeding
│   │   └── scripts/         # Utility scripts
│   ├── components/          # React components
│   │   ├── ui/             # UI components (buttons, cards, etc.)
│   │   └── layout/         # Layout components
│   ├── lib/                # Utility functions and hooks
│   │   └── contexts/       # React contexts
│   ├── messages/           # i18n messages
│   │   ├── en.json        # English translations
│   │   └── fr.json        # French translations
│   └── config.ts          # Frontend configuration
├── docs/                  # Documentation
├── tests/                 # Test files
│   └── e2e/              # End-to-end tests
├── public/               # Static files
├── package.json          # Project dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── tailwind.config.js    # Tailwind CSS configuration
├── next.config.js        # Next.js configuration
└── README.md            # Project documentation
```

## Key Directories

### Frontend (`src/app/`)
- Next.js 13+ app directory structure
- Internationalized routes with `[locale]`
- Tenant-specific routes with `[tenant]`
- Authentication pages in `(auth)` group

### Backend (`src/server/`)
- Express.js server
- Prisma ORM for database management
- Passport.js for authentication
- Environment-specific configurations

### Components (`src/components/`)
- Reusable UI components
- Layout components for different sections
- Shadcn UI components in `ui/`

### Internationalization
- Messages in `src/messages/`
- Supported locales: English (en) and French (fr)
- Route-based language switching

### Configuration
- Environment variables in `src/server/config/env/`
- TypeScript configuration in `tsconfig.json`
- Next.js configuration in `next.config.js`
- Tailwind CSS styling in `tailwind.config.js`

## Main Features
- Multi-tenant architecture
- Internationalization support
- Authentication system
- Role-based access control
- Database management with Prisma
- Modern UI with Tailwind CSS
- End-to-end testing setup 