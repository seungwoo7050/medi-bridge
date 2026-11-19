import type { NextRequest } from 'next/server';
import { comparisonRepo, jsonWithCors, optionsCors } from '@/lib/repo';

export function OPTIONS() {
  return optionsCors();
}

export async function GET(request: NextRequest) {
  const includeVat = request.nextUrl.searchParams.get('includeVat') !== 'false';
  const treatments = await comparisonRepo.getTreatmentCatalogStats(includeVat);
  return jsonWithCors({ includeVat, treatments });
}
