import type React from 'react';
import { ClinicExplorer } from '@/components/ClinicExplorer';
import { comparisonRepo } from '@/lib/repo';

export default async function HomePage(): Promise<React.JSX.Element> {
  const [clinics, stats] = await Promise.all([
    comparisonRepo.listHospitals({ includeVat: true, sortBy: 'lowest_price' }),
    comparisonRepo.getTreatmentCatalogStats(true),
  ]);

  const hasDynamicMapKey = Boolean(
    process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID,
  );

  return (
    <ClinicExplorer initialClinics={clinics} stats={stats} hasDynamicMapKey={hasDynamicMapKey} />
  );
}
