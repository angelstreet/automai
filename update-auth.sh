#\!/bin/bash

# Find all API route files that use createServerClient
grep -r "createServerClient" --include="*.ts" src/app/api

# Update all files with the correct import and usage
find src/app/api -name "*.ts" -exec sed -i '' 's/import { createServerClient } from/import { createClient } from/g' {} \;
find src/app/api -name "*.ts" -exec sed -i '' 's/const supabase = createServerClient/const supabase = createClient/g' {} \;

# Add null check for Supabase client
files_to_update=$(grep -l "const supabase = createClient" src/app/api/**/route.ts)
for file in $files_to_update; do
  echo "Updating $file"
  sed -i '' '/const supabase = createClient/,/const { data: { session }/c\
    const supabase = createClient(cookieStore);\
    \
    // If Supabase client is null, fall back to a simple check\
    if (\!supabase) {\
      return NextResponse.json(\
        {\
          success: false,\
          error: "Authentication not available",\
        },\
        { status: 401 },\
      );\
    }\
    \
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();' "$file"
done
