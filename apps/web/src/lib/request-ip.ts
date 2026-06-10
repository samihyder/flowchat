export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ip = forwarded.split(',')[0]?.trim();
    if (ip) return ip;
  }
  return req.headers.get('x-real-ip') ?? req.headers.get('cf-connecting-ip') ?? null;
}
