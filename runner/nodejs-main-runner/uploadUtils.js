const fs = require('fs');
const path = require('path');

const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
  signatureVersion: 'v4',
});

console.log('[@uploadUtils:init] S3 client initialized for Cloudflare R2.');

/**
 * Collects metadata for files in a directory.
 * @param {string} directory - The directory to scan for files.
 * @param {string} scriptName - The script name to prefix relative paths.
 * @returns {Array<Object>} - Array of file metadata objects.
 */
function collectFileMetadata(directory, scriptName) {
  console.log(`[@uploadUtils:collectFileMetadata] Collecting file metadata from ${directory}`);
  const associatedFiles = [];

  function walkDir(currentDir) {
    try {
      const files = fs.readdirSync(currentDir);
      files.forEach((file) => {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
          const relativePath = path.relative(directory, filePath);
          const creationTime = stat.ctime;
          associatedFiles.push({
            name: file,
            path: filePath,
            relative_path: `${scriptName}/${relativePath}`,
            size: stat.size,
            creation_date: creationTime.toISOString(),
          });
        } else if (stat.isDirectory()) {
          walkDir(filePath);
        }
      });
    } catch (error) {
      console.error(
        `[@uploadUtils:collectFileMetadata] ERROR: Failed to collect metadata from ${currentDir}: ${error.message}`,
      );
    }
  }

  walkDir(directory);
  console.log(
    `[@uploadUtils:collectFileMetadata] Found ${associatedFiles.length} files in ${directory}`,
  );
  return associatedFiles;
}

/**
 * Uploads files to Cloudflare R2 and generates presigned URLs.
 * @param {string} jobId - The job ID for organizing uploads.
 * @param {string} createdAt - The creation timestamp for folder naming.
 * @param {Array<Object>} files - Array of file metadata objects to upload.
 * @returns {Array<Object>} - Array of file metadata with public URLs.
 */
async function uploadFilesToR2(jobId, createdAt, files) {
  console.log(
    `[@uploadUtils:uploadFilesToR2] Starting upload of ${files.length} files for job ${jobId}`,
  );
  const bucketName = 'reports';
  const folderName = `${createdAt.replace(/:/g, '-').replace(/\./g, '-')}_${jobId.replace(/:/g, '_').replace(/\//g, '_')}`;
  const uploadedFiles = [];

  for (const fileInfo of files) {
    const filePath = fileInfo.path;
    const fileName = fileInfo.name;
    const relativePath = fileInfo.relative_path || fileName;

    if (!fs.existsSync(filePath)) {
      console.error(`[@uploadUtils:uploadFilesToR2] File not found for upload: ${fileName}`);
      uploadedFiles.push(fileInfo);
      continue;
    }

    // Determine content type based on file extension
    const ext = path.extname(fileName).toLowerCase();
    const contentType =
      {
        '.html': 'text/html',
        '.json': 'application/json',
        '.txt': 'text/plain',
        '.log': 'text/plain',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webm': 'video/webm',
        '.py': 'text/plain',
      }[ext] || 'application/octet-stream';

    const contentDisposition =
      contentType.startsWith('text') || contentType.startsWith('image') ? 'inline' : 'attachment';

    const r2Path = `${folderName}/${relativePath}`;
    console.log(`[@uploadUtils:uploadFilesToR2] Uploading file to R2: ${fileName} -> ${r2Path}`);

    try {
      const fileStream = fs.createReadStream(filePath);
      const uploadParams = {
        Bucket: bucketName,
        Key: r2Path,
        Body: fileStream,
        ContentType: contentType,
        ContentDisposition: contentDisposition,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      // Generate presigned URL (valid for 7 days)
      const presignedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: bucketName,
          Key: r2Path,
        }),
        { expiresIn: 604800 },
      );

      fileInfo.public_url = presignedUrl;
      console.log(`[@uploadUtils:uploadFilesToR2] Uploaded file to R2: ${fileName}, URL generated`);
      uploadedFiles.push(fileInfo);
    } catch (error) {
      console.error(
        `[@uploadUtils:uploadFilesToR2] ERROR: Failed to upload ${fileName} to R2: ${error.message}`,
      );
      uploadedFiles.push(fileInfo);
    }
  }

  console.log(
    `[@uploadUtils:uploadFilesToR2] Successfully uploaded ${uploadedFiles.length} files to R2 for job: ${jobId}`,
  );
  return uploadedFiles;
}

/**
 * Parses the JSON output from upload_to_r2.py to extract associated files.
 * @param {string} output - The JSON string output from upload_to_r2.py.
 * @returns {Object} - Object containing status and associated_files array.
 */
function parseUploadOutput(output) {
  console.log('[@uploadUtils:parseUploadOutput] Parsing upload script output.');
  try {
    const parsed = JSON.parse(output);
    console.log(
      `[@uploadUtils:parseUploadOutput] Parsed upload output with status: ${parsed.status}`,
    );
    return {
      status: parsed.status || 'unknown',
      associated_files: parsed.uploaded_files || [],
      error: parsed.error || '',
    };
  } catch (error) {
    console.error(
      `[@uploadUtils:parseUploadOutput] ERROR: Failed to parse upload output: ${error.message}`,
    );
    return {
      status: 'failure',
      associated_files: [],
      error: `Failed to parse upload output: ${error.message}`,
    };
  }
}

module.exports = {
  collectFileMetadata,
  uploadFilesToR2,
  parseUploadOutput,
};
