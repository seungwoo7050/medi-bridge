import type React from 'react';
import { ClinicExplorer } from '@/components/ClinicExplorer';
import { comparisonRepo } from '@/lib/repo';

export default async function HomePage(): Promise<React.JSX.Element> {
  const [clinics, stats] = await Promise.all([
    comparisonRepo.listHospitals({ includeVat: true, sortBy: 'lowest_price' }),
    comparisonRepo.getTreatmentCatalogStats(true),
  ]);

  return <ClinicExplorer initialClinics={clinics} stats={stats} />;
}
