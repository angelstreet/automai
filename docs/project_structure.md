# Project Structure

```
automai/
├── .env.development            # Development environment variables
├── .env.production             # Production environment variables
├── src/                        # Source code directory
│   ├── app/                    # Next.js app directory (pages and routes)
│   │   ├── [locale]/          # Internationalization routes
│   │   │   ├── (auth)/        # Authentication routes group
│   │   │   │   ├── login/     # Login page
│   │   │   │   ├── signup/    # Signup page
│   │   │   │   └── layout.tsx # Auth layout
│   │   │   ├── [tenant]/      # Tenant-specific routes
│   │   │   │   ├── dashboard/ # Dashboard page
│   │   │   │   ├── hosts/     # Hosts management page
│   │   │   │   ├── profile/   # User profile page
│   │   │   │   └── layout.tsx # Tenant layout
│   │   │   └── page.tsx       # Home page
│   │   └── api/               # API routes (Next.js Route Handlers)
│   │       ├── auth/          # Auth API endpoints
│   │       └── hosts/         # Host management endpoints
│   ├── lib/                   # Utility functions and hooks
│   │   ├── contexts/          # React contexts
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── services/          # Service layer
│   │       ├── hosts.ts       # Host service functions
│   │       └── index.ts       # Service exports
│   ├── components/            # React components
│   │   ├── ui/                # UI components (buttons, cards, etc.)
│   │   ├── virtualization/    # Terminal and virtualization components
│   │   └── layout/            # Layout components
│   ├── i18n/                  # i18n messages and configuration
│   │   ├── messages/          # Translation files
│   │   │   ├── en.json        # English translations
│   │   │   └── fr.json        # French translations
│   │   └── index.ts           # i18n configuration
│   ├── middleware.ts          # Next.js middleware
│   └── config.ts              # Frontend configuration
├── server/                    # Legacy server code (to be migrated)
├── prisma/                    # Prisma configuration
│   └── schema.prisma          # Database schema
├── docs/                      # Documentation
├── public/                    # Static files
│   └── avatars/               # User avatar images
├── package.json               # Project dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── next.config.js             # Next.js configuration
└── README.md                  # Project documentation
```

## Key Directories

### Frontend (`src/app/`)

- Next.js 13+ app directory structure
- Internationalized routes with `[locale]`
- Tenant-specific routes with `[tenant]`
- API routes using Next.js Route Handlers

### Service Layer (`src/lib/services/`)

- Separation of data access logic from API routes
- Reusable service functions for database operations
- Organized by domain (hosts, users, etc.)

### Database Access (`src/lib/prisma.ts`)

- Singleton Prisma client to prevent connection pool issues
- Centralized database access point

### Components (`src/components/`)

- Reusable UI components
- Terminal virtualization components
- Layout components for different sections

### Internationalization

- Messages in `src/i18n/messages/`
- Supported locales: English (en) and French (fr)
- Route-based language switching

### Configuration

- Environment variables in root `.env.*` files
- Database schema in `prisma/schema.prisma`
- TypeScript and Next.js configurations

## Main Features

- Multi-tenant architecture
- SSH and terminal connections
- Host management system
- Internationalization support
- Authentication system
- Role-based access control
- Database management with Prisma
- Connection logging and monitoring
