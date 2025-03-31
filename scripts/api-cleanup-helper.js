/**
 * Archive an API route by moving it
 * @param {Object} apiRoute - API route object to archive
 */
function archiveApiRoute(apiRoute) {
  try {
    // Create archive directory structure
    const targetDir = path.dirname(path.join(ARCHIVE_DIR, apiRoute.relativePath));
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(ARCHIVE_DIR, apiRoute.relativePath);

    // Read the original file
    const content = fs.readFileSync(apiRoute.path, 'utf8');

    // Add an archived comment at the top
    const archivedContent = `// ARCHIVED: This API route was moved on ${new Date().toISOString()}
// Original path: ${apiRoute.path}
// Route: ${apiRoute.route}
// This file is preserved for reference purposes only and is no longer in use.

${content}`;

    // Write to archive location
    fs.writeFileSync(targetPath, archivedContent);

    // Delete the original file
    fs.unlinkSync(apiRoute.path);

    console.log(`Moved ${apiRoute.path} to ${targetPath}`);
  } catch (error) {
    console.error(`Error moving API route ${apiRoute.path}:`, error);
  }
}
