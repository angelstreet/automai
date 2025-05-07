const fs = require('fs');
const path = require('path');

/**
 * Write script execution metadata to metadata.json in the script folder.
 * @param {string} scriptFolderPath - The path to the script folder.
 * @param {object} metadata - The metadata object (job_id, script_id, script_name, script_path, parameters, start_time, end_time, status).
 */
function writeScriptMetadata(scriptFolderPath, metadata) {
  const metadataPath = path.join(scriptFolderPath, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`[@metadataUtils] Wrote metadata.json to ${metadataPath}`);
}

/**
 * Write job execution metadata to the specified file path.
 * @param {string} metadataPath - The full path to the metadata file.
 * @param {object} metadata - The metadata object (job_id, start_time, config_name, env, etc.).
 */
function writeJobMetadata(metadataPath, metadata) {
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`[@metadataUtils] Wrote job metadata to ${metadataPath}`);
}

module.exports = { writeScriptMetadata, writeJobMetadata };
