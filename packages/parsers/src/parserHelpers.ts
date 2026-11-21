export function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function extractNextDataJson(html: string): Record<string, unknown> | null {
  if (!html) {
    return null;
  }
  const scriptMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  const scriptContent = scriptMatch?.[1];
  if (!scriptContent) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(scriptContent);
    return isRecordObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  return null;
}

export function toPositiveInt(value: unknown): number | null {
  const num = toFiniteNumber(value);
  if (num === null || num <= 0) {
    return null;
  }
  return Math.round(num);
}

export function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
