// ... existing code ...
const fs = require('fs');
const path = require('path');

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const ejs = require('ejs');

const reportTemplate = require('./reportTemplate');

// Configure S3 client for Cloudflare R2
const r2Client = new S3Client({
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  region: 'auto', // Cloudflare R2 uses 'auto' for region
  forcePathStyle: true, // Required for R2 compatibility
});

async function generateAndUploadReport(
  jobId,
  config_id,
  output,
  created_at,
  started_at,
  completed_at,
  status,
  decryptedEnvVars = {},
  loggerPrefix = 'runner',
) {
  try {
    console.log(`[@${loggerPrefix}:generateAndUploadReport] Generating report for job ${jobId}`);
    const runnerId = process.env.RUNNER_ID || 'default-runner';
    const startTime = started_at || 'N/A';
    const endTime = completed_at || 'N/A';
    const duration =
      startTime !== 'N/A' && endTime !== 'N/A'
        ? ((new Date(endTime) - new Date(startTime)) / 1000).toFixed(2)
        : 'N/A';

    // Mask sensitive environment variables
    const envVars =
      Object.keys(decryptedEnvVars || {})
        .map((key) => `${key}=***MASKED***`)
        .join(', ') || 'None';

    const scripts = output.scripts || [];
    const associatedFiles = output.associated_files || [];
    const reportData = {
      jobId,
      configId: config_id,
      runnerId,
      startTime,
      endTime,
      duration,
      status,
      scripts,
      envVars,
      associatedFiles,
    };

    const htmlReport = ejs.render(reportTemplate, reportData).trim();
    // Use a simpler date_time format for folder naming with underscores
    const dateStr = new Date(created_at)
      .toISOString()
      .replace(/[:.]/g, '_')
      .slice(0, 19)
      .replace('T', '_');
    const folderName = `${dateStr}_${jobId}`;
    // Correct the path to avoid duplicating 'reports'
    const reportPath = `${folderName}/report.html`;
    // Write report temporarily to disk
    const tempReportPath = path.join('/tmp', `report_${jobId}.html`);
    fs.writeFileSync(tempReportPath, htmlReport);

    // Upload report to Cloudflare R2 using S3-compatible API
    const bucketName = 'reports';
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: reportPath,
      Body: fs.createReadStream(tempReportPath),
      ContentType: 'text/html',
      ContentDisposition: 'inline',
    });

    try {
      await r2Client.send(putObjectCommand);
    } catch (uploadError) {
      console.error(
        `[@${loggerPrefix}:generateAndUploadReport] Failed to upload report for job ${jobId}: ${uploadError.message}`,
      );
      return null;
    }

    // Generate a presigned URL for the report with a 7-day expiration
    const getObjectCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: reportPath,
    });
    const reportUrl = await getSignedUrl(r2Client, getObjectCommand, { expiresIn: 604800 }); // 7 days in seconds

    // Clean up temporary file
    fs.unlinkSync(tempReportPath);

    // Upload associated files if any
    if (associatedFiles && associatedFiles.length > 0) {
      console.log(
        `[@${loggerPrefix}:generateAndUploadReport] Uploading ${associatedFiles.length} associated files for job ${jobId}`,
      );
      for (const file of associatedFiles) {
        try {
          // Check if file has a public_url (already uploaded by Python runner)
          if (file.public_url) {
            console.log(
              `[@${loggerPrefix}:generateAndUploadReport] File already uploaded by Python runner: ${file.name}, URL: ${file.public_url}`,
            );
            continue;
          }
          // If file content is not available, log placeholder
          console.log(
            `[@${loggerPrefix}:generateAndUploadReport] Placeholder for uploading file: ${file.name}`,
          );
          // TODO: Implement actual file upload logic if file content is accessible
        } catch (fileError) {
          console.error(
            `[@${loggerPrefix}:generateAndUploadReport] Failed to upload associated file ${file.name} for job ${jobId}: ${fileError.message}`,
          );
        }
      }
    } else {
      console.log(
        `[@${loggerPrefix}:generateAndUploadReport] No associated files to upload for job ${jobId}`,
      );
    }

    // Upload the executed script if available
    if (scripts.length > 0 && scripts[0].script_path) {
      let scriptPath = scripts[0].script_path;
      const scriptName = path.basename(scriptPath);
      // Check if the script is already in associatedFiles with a public_url
      const existingScript = associatedFiles.find(
        (file) => file.name === scriptName && file.public_url,
      );
      if (existingScript) {
        console.log(
          `[@${loggerPrefix}:generateAndUploadReport] Script ${scriptName} already uploaded by Python runner with URL: ${existingScript.public_url}. Skipping upload.`,
        );
      } else {
        const scriptUploadPath = `${folderName}/${scriptName}`;
        const tempScriptPath = path.join('/tmp', `script_${jobId}_${scriptName}`);
        try {
          // Use the provided script path directly
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
              `[@${loggerPrefix}:generateAndUploadReport] Script file not found at provided path: ${scriptPath}. Unable to upload script file.`,
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
      }
    } else {
      console.log(
        `[@${loggerPrefix}:generateAndUploadReport] No script path available to upload for job ${jobId}`,
      );
    }

    return reportUrl;
  } catch (error) {
    console.error(
      `[@${loggerPrefix}:generateAndUploadReport] Error generating/uploading report for job ${jobId}: ${error.message}`,
    );
    return null;
  }
}

module.exports = { generateAndUploadReport };
// ... existing code ...
