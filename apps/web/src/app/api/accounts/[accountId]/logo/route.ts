import { neon } from '@neondatabase/serverless';
import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { ACCOUNT_LOGO_MAX_BYTES, ACCOUNT_LOGO_SERVER_MAX_BYTES } from '@/lib/branding/logo';
import { putObject, r2Configured } from '@/lib/storage';

type Params = { params: Promise<{ accountId: string }> };

const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function extensionForType(contentType: string): string {
  if (contentType === 'image/jpeg') return 'jpg';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/gif') return 'gif';
  return 'png';
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (auth.role !== 'administrator') {
    return Response.json({ error: 'Admin access required' }, { status: 403 });
  }

  if (!r2Configured) {
    return Response.json(
      {
        error:
          'Logo upload is not configured yet. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME on the web service.',
      },
      { status: 503 }
    );
  }

  if (!process.env.R2_PUBLIC_URL?.trim()) {
    return Response.json(
      { error: 'R2_PUBLIC_URL is not set. Enable public access on your R2 bucket and add the public URL.' },
      { status: 503 }
    );
  }

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'file is required' }, { status: 400 });
  }

  const contentType = file.type && ALLOWED_TYPES.has(file.type) ? file.type : 'image/png';
  if (file.type && !ALLOWED_TYPES.has(file.type)) {
    return Response.json({ error: 'Logo must be PNG, JPEG, WebP, or GIF' }, { status: 400 });
  }
  if (file.size > ACCOUNT_LOGO_MAX_BYTES) {
    return Response.json(
      { error: `Logo must be ${ACCOUNT_LOGO_MAX_BYTES / (1024 * 1024)} MB or smaller` },
      { status: 400 }
    );
  }
  if (file.size > ACCOUNT_LOGO_SERVER_MAX_BYTES) {
    return Response.json(
      {
        error: `Files over ${ACCOUNT_LOGO_SERVER_MAX_BYTES / (1024 * 1024)} MB must use direct storage upload. Compress the image or use the presigned upload flow.`,
        usePresignedUpload: true,
      },
      { status: 413 }
    );
  }

  const ext = extensionForType(contentType);
  const key = `logos/${accountId}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { publicUrl } = await putObject(key, bytes, contentType);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return Response.json({ error: 'DATABASE_URL not configured' }, { status: 503 });

  const sql = neon(databaseUrl);
  const rows = await sql`
    UPDATE accounts SET logo_url = ${publicUrl}, updated_at = NOW()
    WHERE id = ${accountId}::uuid
    RETURNING id, name, slug, timezone, locale, logo_url as "logoUrl"
  `;

  if (!rows[0]) return Response.json({ error: 'Account not found' }, { status: 404 });

  return Response.json({ account: rows[0], publicUrl });
}
