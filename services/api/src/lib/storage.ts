import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} = process.env;

export const r2Configured =
  !!R2_ACCOUNT_ID && !!R2_ACCESS_KEY_ID && !!R2_SECRET_ACCESS_KEY && !!R2_BUCKET_NAME;

const client = r2Configured
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

export async function getUploadUrl(key: string, contentType: string) {
  if (!client || !R2_BUCKET_NAME) throw new Error('Storage not configured');

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: 300 });
  const publicUrl = `${R2_PUBLIC_URL ?? ''}/${key}`;

  return { uploadUrl, publicUrl };
}
