import { MatchHospitalQuerySchema, MatchHospitalResponseSchema } from '@medi-bridge/shared';
import type { NextRequest } from 'next/server';
import { comparisonRepo, jsonWithCors, optionsCors } from '@/lib/repo';

export function OPTIONS() {
  return optionsCors();
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsed = MatchHospitalQuerySchema.safeParse({
    name: sp.get('name') ?? '',
    regionHint: sp.get('regionHint') ?? '',
    department: sp.get('department') ?? '',
    ykiho: sp.get('ykiho') ?? undefined,
    includeVat: sp.get('includeVat') !== 'false',
  });

  if (!parsed.success) {
    return jsonWithCors({ error: 'INVALID_QUERY', issues: parsed.error.issues }, 400);
  }

  const hospital = await comparisonRepo.matchHospital(parsed.data);
  const payload = MatchHospitalResponseSchema.parse({
    matched: hospital !== null,
    includeVat: parsed.data.includeVat,
    hospital,
  });

  return jsonWithCors(payload);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonWithCors({ error: 'INVALID_JSON' }, 400);
  }

  const parsed = MatchHospitalQuerySchema.safeParse(body);
  if (!parsed.success) {
    return jsonWithCors({ error: 'INVALID_BODY', issues: parsed.error.issues }, 400);
  }

  const hospital = await comparisonRepo.matchHospital(parsed.data);
  const payload = MatchHospitalResponseSchema.parse({
    matched: hospital !== null,
    includeVat: parsed.data.includeVat,
    hospital,
  });

  return jsonWithCors(payload);
}
