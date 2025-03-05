#!/bin/bash
# Script to help migrate from Prisma to Supabase

echo "Starting migration from Prisma to Supabase..."

# Find all files that import Prisma
echo "Finding files that import from @/lib/prisma..."
FILES_WITH_PRISMA=$(grep -r "from ['\"]@/lib/prisma['\"]" --include="*.ts" --include="*.tsx" src/)

# Replace prisma with db in those files
echo "Replacing imports in files..."
for FILE in $FILES_WITH_PRISMA; do
  FILENAME=$(echo $FILE | cut -d ':' -f 1)
  echo "Processing $FILENAME..."
  sed -i '' 's/import { prisma } from '\''@\/lib\/prisma'\''/import db from '\''@\/lib\/db'\''/g' "$FILENAME"
  sed -i '' 's/import prisma from '\''@\/lib\/prisma'\''/import db from '\''@\/lib\/db'\''/g' "$FILENAME"
done

# Replace prisma usage with db
echo "Replacing prisma usage with db..."
for FILE in $FILES_WITH_PRISMA; do
  FILENAME=$(echo $FILE | cut -d ':' -f 1)
  echo "Processing $FILENAME for usage..."
  sed -i '' 's/prisma\./db\./g' "$FILENAME"
done

echo "Migration completed! Please review the changes."
echo "You should now run the Supabase setup commands to create tables."
echo "Next steps:"
echo "1. Update all .env files to include Supabase credentials"
echo "2. Test the application with 'npm run dev'"
echo "3. Deploy the SQL schema to Supabase with 'npm run supabase:migrate'"