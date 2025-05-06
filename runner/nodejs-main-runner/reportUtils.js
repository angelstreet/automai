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
  customJobFolder = null,
  customScriptFolder = null,
  isScriptReport = false,
  extra_data = {},
) {
  try {
    console.log(
      `[generateAndUploadReport] Generating report for ${isScriptReport ? 'script' : 'job'} ${jobId}`,
    );
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

    // Only include associated files for script reports, not for job reports
    const associatedFiles = isScriptReport ? output.associated_files || [] : [];

    // Build the report data with the isScriptReport flag
    const reportData = {
      jobId,
      configId: config_id,
      startTime,
      endTime,
      duration,
      status,
      scripts,
      envVars,
      isScriptReport,
      associatedFiles: associatedFiles.map((file) => ({
        name: file.name,
        relative_path: file.relative_path,
        size: file.size,
        creation_date: file.creation_date,
        public_url: file.public_url || 'N/A',
      })),
      ...extra_data,
    };

    // If this is a script report, include additional script-specific fields
    if (isScriptReport) {
      reportData.stdout = output.stdout || '';
      reportData.stderr = output.stderr || '';
      reportData.script_path = extra_data.script_path || '';
      reportData.script_name = extra_data.script_name || '';
      reportData.parameters = extra_data.parameters || '';
      reportData.parent_job_id = extra_data.parent_job_id || '';
      reportData.host_info = extra_data.host_info || '';
    }

    const htmlReport = ejs.render(reportTemplate, reportData).trim();

    // Use custom folder path if provided, otherwise generate from date
    let folderName;
    if (customJobFolder) {
      folderName = customJobFolder;
      console.log(`[generateAndUploadReport] Using custom job folder: ${folderName}`);
    } else {
      // Use a simpler date_time format for folder naming with underscores
      const dateStr = new Date(created_at)
        .toISOString()
        .replace(/[:.]/g, '_')
        .slice(0, 19)
        .replace('T', '_');
      folderName = `${dateStr}_${jobId}`;
    }

    // Determine the report path based on whether this is a job or script report
    let reportPath;
    if (isScriptReport && customScriptFolder) {
      reportPath = `${folderName}/scripts/${customScriptFolder}/script_report.html`;
      console.log(`[generateAndUploadReport] Using script subfolder: ${customScriptFolder}`);
    } else {
      reportPath = `${folderName}/report.html`;
    }

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
        `[generateAndUploadReport] Failed to upload report for ${isScriptReport ? 'script' : 'job'} ${jobId}: ${uploadError.message}`,
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
      `[generateAndUploadReport] Error generating/uploading report for ${isScriptReport ? 'script' : 'job'} ${jobId}: ${error.message}`,
    );
    return null;
  }
}

// Function to upload a single file to R2
async function uploadFileToR2(filePath, r2Path, contentType = 'application/octet-stream') {
  console.log(`[reportUtils:uploadFileToR2] Uploading file to R2: ${filePath} -> ${r2Path}`);

  try {
    // Configure AWS S3 client for Cloudflare R2
    const s3 = new AWS.S3({
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
    });

    // Read file content
    const fileContent = fs.readFileSync(filePath);

    // Set upload parameters
    const params = {
      Bucket: 'reports',
      Key: r2Path,
      Body: fileContent,
      ContentType: contentType,
      ContentDisposition:
        contentType.startsWith('text') || contentType.startsWith('image') ? 'inline' : 'attachment',
    };

    // Upload to R2
    const uploadResult = await s3.upload(params).promise();
    console.log(
      `[reportUtils:uploadFileToR2] Successfully uploaded file to: ${uploadResult.Location}`,
    );

    // Generate a presigned URL valid for 7 days
    const presignedUrl = s3.getSignedUrl('getObject', {
      Bucket: 'reports',
      Key: r2Path,
      Expires: 604800, // 7 days in seconds
    });

    return presignedUrl;
  } catch (error) {
    console.error(`[reportUtils:uploadFileToR2] Error uploading file: ${error.message}`);
    return null;
  }
}

module.exports = {
  generateAndUploadReport,
  uploadFileToR2,
};
