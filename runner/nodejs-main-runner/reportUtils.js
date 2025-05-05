// ... existing code ...
// Upload the executed script if available
if (scripts.length > 0 && scripts[0].script_path) {
  const scriptPath = scripts[0].script_path;
  const scriptName = path.basename(scriptPath);
  const scriptUploadPath = `${folderName}/${scriptName}`;
  const tempScriptPath = path.join('/tmp', `script_${jobId}_${scriptName}`);
  try {
    // Attempt to copy the script file to a temporary location in /tmp
    if (fs.existsSync(scriptPath)) {
      fs.copyFileSync(scriptPath, tempScriptPath);
      console.log(
        `[@${loggerPrefix}:generateAndUploadReport] Copied script ${scriptName} to temporary location: ${tempScriptPath}`,
      );
      // Upload the script from the temporary location to R2
      const scriptPutCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: scriptUploadPath,
        Body: fs.createReadStream(tempScriptPath),
        ContentType: 'text/plain',
        ContentDisposition: 'attachment',
      });
      await r2Client.send(scriptPutCommand);
      console.log(
        `[@${loggerPrefix}:generateAndUploadReport] Uploaded script ${scriptName} for job ${jobId} to ${scriptUploadPath}`,
      );
      // Add script to associated files for report linking
      const scriptGetCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: scriptUploadPath,
      });
      const scriptUrl = await getSignedUrl(r2Client, scriptGetCommand, { expiresIn: 604800 });
      associatedFiles.push({
        name: scriptName,
        size: fs.statSync(tempScriptPath).size,
        public_url: scriptUrl,
      });
      // Clean up temporary script file
      fs.unlinkSync(tempScriptPath);
      console.log(
        `[@${loggerPrefix}:generateAndUploadReport] Cleaned up temporary script file: ${tempScriptPath}`,
      );
    } else {
      console.log(
        `[@${loggerPrefix}:generateAndUploadReport] Script file not found at specified path: ${scriptPath}. Unable to copy to temporary location for upload. Skipping upload of script file.`,
      );
    }
  } catch (scriptUploadError) {
    console.error(
      `[@${loggerPrefix}:generateAndUploadReport] Failed to upload script ${scriptName} for job ${jobId}: ${scriptUploadError.message}`,
    );
    // Clean up temporary script file if it exists
    if (fs.existsSync(tempScriptPath)) {
      fs.unlinkSync(tempScriptPath);
      console.log(
        `[@${loggerPrefix}:generateAndUploadReport] Cleaned up temporary script file after error: ${tempScriptPath}`,
      );
    }
  }
} else {
  console.log(
    `[@${loggerPrefix}:generateAndUploadReport] No script path available to upload for job ${jobId}`,
  );
}
// ... existing code ...
