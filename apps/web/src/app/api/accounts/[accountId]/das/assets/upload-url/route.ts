import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { isDasAssetKind } from '@/lib/das/types';
import { getAttachmentUploadUrl, r2Configured } from '@/lib/storage';

type Params = { params: Promise<{ accountId: string }> };

function isAllowedContentType(contentType: string): boolean {
  return contentType.startsWith('image/') || contentType === 'application/pdf';
}

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });

  if (!r2Configured) {
    return Response.json({ error: 'File storage is not configured' }, { status: 503 });
  }

  const body = (await req.json()) as {
    contentType?: string;
    kind?: string;
    fileName?: string;
  };

  const contentType = body.contentType?.trim() ?? '';
  const kind = body.kind?.trim() ?? '';
  const fileName = body.fileName?.trim() ?? '';

  if (!contentType || !kind || !fileName) {
    return Response.json(
      { error: 'contentType, kind, and fileName are required' },
      { status: 400 }
    );
  }
  if (!isDasAssetKind(kind)) {
    return Response.json(
      { error: 'kind must be stamp, seal, signature, initials, logo, or other' },
      { status: 400 }
    );
  }
  if (!isAllowedContentType(contentType)) {
    return Response.json(
      { error: 'contentType must be image/* or application/pdf' },
      { status: 400 }
    );
  }

  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const storageKey = `das/assets/${accountId}/${kind}/${crypto.randomUUID()}-${safeFileName}`;
  const { uploadUrl, publicUrl } = await getAttachmentUploadUrl(storageKey, contentType);

  return Response.json({ uploadUrl, publicUrl, storageKey });
}
