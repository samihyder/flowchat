import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { getAttachmentUploadUrl, r2Configured } from '@/lib/storage';

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

  let contentType = 'image/png';
  try {
    const body = (await req.json()) as { contentType?: string };
    if (body.contentType && ALLOWED_TYPES.has(body.contentType)) {
      contentType = body.contentType;
    }
  } catch {
    // empty body is fine — default to PNG
  }

  const ext = extensionForType(contentType);
  const key = `logos/${accountId}/${crypto.randomUUID()}.${ext}`;
  const { uploadUrl, publicUrl } = await getAttachmentUploadUrl(key, contentType);

  if (!uploadUrl || !publicUrl) {
    return Response.json({ error: 'Storage not configured' }, { status: 503 });
  }

  return Response.json({ uploadUrl, publicUrl });
}
