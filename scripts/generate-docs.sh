#!/bin/bash

# Generate codebase structure documentation
echo "Generating codebase structure documentation..."
node scripts/generate-structure.js

echo "Documentation generated successfully at docs/codebase-structure.md" 