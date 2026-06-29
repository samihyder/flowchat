import { authorizeAccount, getBearerToken } from '@/lib/db-auth';
import { workflowsDeprecatedResponse } from '@/lib/marketing/workflows-deprecated';

type Params = { params: Promise<{ accountId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { accountId } = await params;
  const token = getBearerToken(req);
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const auth = await authorizeAccount(token, accountId);
  if (!auth) return Response.json({ error: 'Forbidden' }, { status: 403 });
  void req;
  return workflowsDeprecatedResponse();
}
