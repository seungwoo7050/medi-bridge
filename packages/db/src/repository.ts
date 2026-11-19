import {
  type BoundsComparisonRequest,
  type HiraBaselineItem,
  type HospitalComparisonSummary,
  type MatchHospitalQuery,
  normalizeDepartmentCategory,
  OfferBadgeSchema,
  PlatformSourceSchema,
  type RawPlatformOffer,
  STANDARD_TREATMENTS,
  scoreClinicResolution,
} from '@medi-bridge/shared';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { hiraOfficialPrices, hospitals, platformEventOffers } from './schema';
import {
  buildHospitalComparisonSummary,
  type ComparisonRepository,
  type ListHospitalsFilter,
  SeedComparisonRepository,
  sortSummaries,
  type TreatmentCatalogStats,
} from './seedRepository';

export type {
  ComparisonRepository,
  ListHospitalsFilter,
  TreatmentCatalogStats,
} from './seedRepository';
export { SeedComparisonRepository } from './seedRepository';

export class DrizzleComparisonRepository implements ComparisonRepository {
  private readonly db: ReturnType<typeof drizzle>;
  private readonly fallback = new SeedComparisonRepository();

  constructor(databaseUrl: string) {
    const client = postgres(databaseUrl, { max: 5 });
    this.db = drizzle(client);
  }

  private async loadAllAsSummaries(
    includeVat: boolean,
    treatmentCodeFilter?: string,
  ): Promise<HospitalComparisonSummary[]> {
    const hospitalRows = await this.db.select().from(hospitals);
    if (hospitalRows.length === 0) {
      return this.fallback.listHospitals({ includeVat, treatmentCode: treatmentCodeFilter });
    }

    const hiraRows = await this.db.select().from(hiraOfficialPrices);
    const offerRows = await this.db.select().from(platformEventOffers);

    const hiraByHospital = new Map<string, HiraBaselineItem[]>();
    for (const row of hiraRows) {
      const arr = hiraByHospital.get(row.hospitalId) ?? [];
      arr.push({
        treatmentCode: row.treatmentCode,
        treatmentName: row.treatmentName,
        minPrice: row.minPrice,
        maxPrice: row.maxPrice,
        reportedDate: row.reportedDate,
      });
      hiraByHospital.set(row.hospitalId, arr);
    }

    const offersByHospital = new Map<string, RawPlatformOffer[]>();
    for (const row of offerRows) {
      const platformParsed = PlatformSourceSchema.safeParse(row.platform);
      const badgeParsed = OfferBadgeSchema.safeParse(row.badge);
      if (!platformParsed.success) {
        continue;
      }
      const arr = offersByHospital.get(row.hospitalId) ?? [];
      arr.push({
        id: row.id,
        platform: platformParsed.data,
        treatmentCode: row.treatmentCode,
        treatmentName: row.treatmentName,
        rawTitle: row.rawTitle,
        listedPrice: row.listedPrice,
        vatIncluded: row.vatIncluded,
        badge: badgeParsed.success ? badgeParsed.data : null,
        bookingUrl: row.bookingUrl,
        updatedAt: row.updatedAt,
      });
      offersByHospital.set(row.hospitalId, arr);
    }

    return hospitalRows.map((row) =>
      buildHospitalComparisonSummary(
        {
          hospitalId: row.id,
          slug: row.slug,
          ykiho: row.ykiho,
          name: row.name,
          department: normalizeDepartmentCategory(row.department),
          sido: row.sido,
          sigungu: row.sigungu,
          roadAddress: row.roadAddress,
          lat: row.lat,
          lng: row.lng,
          rating: row.rating,
          reviewCount: row.reviewCount,
          hiraVerified: row.hiraVerified,
          hiraBaselineItems: hiraByHospital.get(row.id) ?? [],
          rawOffers: offersByHospital.get(row.id) ?? [],
        },
        includeVat,
        treatmentCodeFilter,
      ),
    );
  }

  async matchHospital(query: MatchHospitalQuery): Promise<HospitalComparisonSummary | null> {
    const all = await this.loadAllAsSummaries(query.includeVat);
    let best: HospitalComparisonSummary | null = null;
    let bestScore = -1;

    for (const candidate of all) {
      const score = scoreClinicResolution(
        {
          name: candidate.name,
          roadAddress: candidate.roadAddress,
          ykiho: candidate.ykiho,
          lat: candidate.lat,
          lng: candidate.lng,
        },
        {
          name: query.name,
          regionHint: query.regionHint,
          ...(query.ykiho ? { ykiho: query.ykiho } : {}),
          ...(query.lat !== undefined ? { lat: query.lat } : {}),
          ...(query.lng !== undefined ? { lng: query.lng } : {}),
        },
      );
      if (score !== null && score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    return best;
  }

  async compareBounds(req: BoundsComparisonRequest): Promise<HospitalComparisonSummary[]> {
    const all = await this.loadAllAsSummaries(req.includeVat, req.treatmentCode);
    const matched = new Map<string, HospitalComparisonSummary>();

    for (const clinic of req.clinics) {
      let best: HospitalComparisonSummary | null = null;
      let bestScore = -1;
      for (const candidate of all) {
        const score = scoreClinicResolution(
          {
            name: candidate.name,
            roadAddress: candidate.roadAddress,
            ykiho: candidate.ykiho,
            lat: candidate.lat,
            lng: candidate.lng,
          },
          {
            name: clinic.name,
            regionHint: clinic.regionHint,
          },
        );
        if (score !== null && score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }
      if (!best) continue;
      if (req.department && req.department !== '전체') {
        if (best.department !== normalizeDepartmentCategory(req.department)) continue;
      }
      if (req.treatmentCode && best.offers.length === 0) continue;
      matched.set(best.hospitalId, best);
    }

    return sortSummaries(Array.from(matched.values()), req.sortBy);
  }

  async listHospitals(filter: ListHospitalsFilter = {}): Promise<HospitalComparisonSummary[]> {
    const includeVat = filter.includeVat ?? true;
    const sortBy = filter.sortBy ?? 'lowest_price';
    const all = await this.loadAllAsSummaries(includeVat, filter.treatmentCode);

    const q = (filter.query ?? '').trim().toLowerCase();
    const region = (filter.region ?? '').trim().toLowerCase();

    const filtered = all.filter((item) => {
      if (filter.department && filter.department !== '전체') {
        if (item.department !== normalizeDepartmentCategory(filter.department)) return false;
      }
      if (region && region !== '전체') {
        const addr = `${item.sido} ${item.sigungu} ${item.roadAddress}`.toLowerCase();
        if (!addr.includes(region)) return false;
      }
      if (q) {
        const hay = `${item.name} ${item.department} ${item.roadAddress} ${item.offers
          .map((o) => `${o.treatmentName} ${o.rawTitle}`)
          .join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filter.treatmentCode && item.offers.length === 0) {
        return false;
      }
      return true;
    });

    return sortSummaries(filtered, sortBy);
  }

  async getHospitalBySlug(
    slug: string,
    includeVat = true,
  ): Promise<HospitalComparisonSummary | null> {
    const rows = await this.db.select().from(hospitals).where(eq(hospitals.slug, slug));
    const target = rows[0];
    if (!target) {
      return this.fallback.getHospitalBySlug(slug, includeVat);
    }
    const all = await this.loadAllAsSummaries(includeVat);
    return all.find((item) => item.slug === slug) ?? null;
  }

  async getTreatmentCatalogStats(includeVat = true): Promise<TreatmentCatalogStats[]> {
    const all = await this.loadAllAsSummaries(includeVat);
    return STANDARD_TREATMENTS.map((treatment) => {
      let clinicCount = 0;
      let hiraSum = 0;
      let hiraCount = 0;
      let lowest = Number.MAX_SAFE_INTEGER;
      for (const clinic of all) {
        const offers = clinic.offers.filter((o) => o.treatmentCode === treatment.code);
        const baseline = clinic.hiraBaselineItems.find((b) => b.treatmentCode === treatment.code);
        if (offers.length > 0 || baseline) clinicCount += 1;
        if (baseline) {
          hiraSum += baseline.minPrice;
          hiraCount += 1;
        }
        const firstOffer = offers[0];
        if (firstOffer && firstOffer.effectivePrice > 0 && firstOffer.effectivePrice < lowest) {
          lowest = firstOffer.effectivePrice;
        }
      }
      return {
        code: treatment.code,
        category: treatment.category,
        label: treatment.label,
        clinicCount,
        avgHiraPrice: hiraCount > 0 ? Math.round(hiraSum / hiraCount) : 0,
        lowestEffectivePrice: lowest === Number.MAX_SAFE_INTEGER ? 0 : lowest,
      };
    });
  }
}

export function createComparisonRepository(
  databaseUrl = process.env.DATABASE_URL,
): ComparisonRepository {
  if (databaseUrl && databaseUrl.trim().length > 0) {
    return new DrizzleComparisonRepository(databaseUrl.trim());
  }
  return new SeedComparisonRepository();
}
