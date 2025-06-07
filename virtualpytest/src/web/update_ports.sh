#!/bin/bash

# Function to update a file with the new port pattern
update_file() {
    local file="$1"
    echo "Updating $file..."
    
    # Create a backup
    cp "$file" "$file.bak"
    
    # Replace hardcoded localhost:5009 with environment variable pattern
    sed -i.tmp 's|http://localhost:5009|http://localhost:${(import.meta as any).env.VITE_SERVER_PORT || '\''5119'\''}|g' "$file"
    
    # Clean up temp file
    rm -f "$file.tmp"
    
    echo "Updated $file"
}

# List of files to update
files=(
    "./components/power/USBPowerPanel.tsx"
    "./components/modals/remote/HDMIStreamModal.tsx"
    "./components/user-interface/StreamClickOverlay.tsx"
    "./components/user-interface/VerificationEditor.tsx"
    "./components/user-interface/ScreenDefinitionEditor.tsx"
    "./components/user-interface/VideoCapture.tsx"
    "./components/user-interface/ScreenshotCapture.tsx"
    "./components/verification/VerificationTextComparisonDisplay.tsx"
    "./components/verification/TextComparisonDisplay.tsx"
    "./components/verification/ImageComparisonThumbnails.tsx"
    "./components/DebugModal.tsx"
    "./components/validation/ValidationPreviewClient.tsx"
    "./hooks/remote/useControllerTypes.ts"
    "./hooks/remote/useRemoteConnection.ts"
    "./hooks/verification/useVerificationReferences.ts"
    "./hooks/verification/useImageComparisonModal.ts"
    "./hooks/navigation/useNavigationCRUD.ts"
    "./hooks/useControllers.ts"
    "./hooks/useNavigationEditor.ts"
)

# Update each file
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        update_file "$file"
    else
        echo "File not found: $file"
    fi
done

echo "All files updated!" 