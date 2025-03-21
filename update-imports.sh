#!/bin/bash

# Find all files importing from UserContext directly
files=$(grep -l "from ['\"]@/context/UserContext['\"]" --include="*.tsx" --exclude="src/hooks/useUser.ts" --exclude="src/context/AppContext.tsx" $(find src -type f))

# Update each file
for file in $files; do
  echo "Updating $file"
  # Replace the import with our hooks import
  sed -i '' 's/import { useUser } from '"'"'@\/context\/UserContext'"'"';/import { useUser } from '"'"'@\/hooks\/useUser'"'"';/g' $file
done

# Check for layout file using UserProvider directly
layout_file=$(grep -l "import { UserProvider } from ['\"]@/context/UserContext['\"]" --include="*.tsx" $(find src -type f))

if [ ! -z "$layout_file" ]; then
  echo "Updating layout file: $layout_file"
  # Comment out the UserProvider import
  sed -i '' 's/import { UserProvider } from '"'"'@\/context\/UserContext'"'"';/\/\/ UserProvider is now handled by AppContext\n\/\/ import { UserProvider } from '"'"'@\/context\/UserContext'"'"';/g' $layout_file
  
  # Remove UserProvider wrapper - this requires manual check as structure varies
  echo "NOTE: You may need to manually remove UserProvider wrapper in $layout_file"
fi

echo "Import updates complete. Please review changes." 