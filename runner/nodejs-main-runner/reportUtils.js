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
      associatedFiles: associatedFiles.map((file) => ({
        name: file.name,
        relative_path: file.relative_path,
        size: file.size,
        creation_date: file.creation_date,
        public_url: file.public_url || 'N/A',
      })),
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

    return reportUrl;
  } catch (error) {
    console.error(
      `[@${loggerPrefix}:generateAndUploadReport] Error generating/uploading report for job ${jobId}: ${error.message}`,
    );
    return null;
  }
}

module.exports = { generateAndUploadReport };
