# GitHub Codespaces Setup Guide

## PostgreSQL Setup with Docker

1. First, create the Docker Compose configuration:

```yaml
// filepath: /workspaces/automai/docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_USER: automai_user
      POSTGRES_PASSWORD: automai_password_123
      POSTGRES_DB: automai_db
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

2. Create or update your environment file:

```bash
// filepath: /workspaces/automai/.env
DATABASE_URL="postgresql://automai_user:automai_password_123@localhost:5432/automai_db"
```

3. Run these commands in the terminal:

```bash
# Start PostgreSQL container
docker-compose up -d

# Verify container is running
docker-compose ps

# Apply database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## Troubleshooting

If you encounter database connection issues:

1. Check container status:
```bash
docker-compose ps
docker-compose logs postgres
```

2. Verify database connection:
```bash
docker exec -it automai-postgres-1 psql -U automai_user -d automai_db
```

3. Reset if needed:
```bash
# Stop and remove containers
docker-compose down

# Remove volumes if you want to start fresh
docker-compose down -v

# Start again
docker-compose up -d
```

## Port Forwarding

GitHub Codespaces automatically forwards these ports:
- 3000: Next.js application
- 5432: PostgreSQL database

## Environment Variables

Make sure these environment variables are set in your Codespace:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_URL`: Authentication callback URL
- `NEXTAUTH_SECRET`: Secret key for NextAuth.js

You can set these in the Codespace Secrets section of your repository settings.