const fs = require('fs');

/**
 * Write script execution metadata to the specified file path.
 * @param {string} metadataPath - The full path to the metadata file.
 * @param {object} metadata - The metadata object (job_id, script_id, script_name, script_path, parameters, start_time, end_time, status).
 */
function writeScriptMetadata(metadataPath, metadata) {
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`[@metadataUtils] Wrote script metadata to ${metadataPath}`);
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
