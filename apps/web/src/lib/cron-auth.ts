/**
 * Fail-closed cron auth: require CRON_SECRET and a matching Bearer token.
 * Returns a Response when unauthorized; null when the request may proceed.
 */
export function requireCronAuth(req: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json(
      { error: 'CRON_SECRET is not configured' },
      { status: 503 }
    );
  }
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
