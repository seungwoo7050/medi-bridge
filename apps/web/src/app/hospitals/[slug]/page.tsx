import { notFound } from 'next/navigation';
import type React from 'react';
import { HospitalDetailClient } from '@/components/HospitalDetailClient';
import { comparisonRepo } from '@/lib/repo';

export default async function HospitalDetailPage({
  params,
}: {
  readonly params: Promise<{ slug: string }>;
}): Promise<React.JSX.Element> {
  const { slug } = await params;
  const clinic = await comparisonRepo.getHospitalBySlug(slug, true);
  if (!clinic) {
    notFound();
  }

  return <HospitalDetailClient clinic={clinic} />;
}
