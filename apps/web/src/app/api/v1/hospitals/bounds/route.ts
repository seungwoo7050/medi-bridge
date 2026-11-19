import { BoundsComparisonRequestSchema, BoundsComparisonResponseSchema } from '@medi-bridge/shared';
import type { NextRequest } from 'next/server';
import { comparisonRepo, jsonWithCors, optionsCors } from '@/lib/repo';

export function OPTIONS() {
  return optionsCors();
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonWithCors({ error: 'INVALID_JSON' }, 400);
  }

  const parsed = BoundsComparisonRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonWithCors({ error: 'INVALID_BODY', issues: parsed.error.issues }, 400);
  }

  const items = await comparisonRepo.compareBounds(parsed.data);
  const payload = BoundsComparisonResponseSchema.parse({
    includeVat: parsed.data.includeVat,
    sortBy: parsed.data.sortBy,
    matchedCount: items.length,
    items,
  });

  return jsonWithCors(payload);
}
