export async function enrichmentFetch(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<{ status: number; json: unknown; text: string }> {
  const { timeoutMs = 25_000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...rest, signal: controller.signal });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { message: text.slice(0, 500) };
    }
    return { status: res.status, json, text };
  } finally {
    clearTimeout(timer);
  }
}

export function basicAuthHeader(apiKey: string): string {
  const token = Buffer.from(`${apiKey}:`, 'utf8').toString('base64');
  return `Basic ${token}`;
}

export function pickString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}
