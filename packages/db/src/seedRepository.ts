import {
  type BoundsComparisonRequest,
  type BoundsSortBy,
  type HiraBaselineItem,
  type HospitalComparisonSummary,
  type MatchHospitalQuery,
  type NormalizedPriceOffer,
  normalizeDepartmentCategory,
  type RawPlatformOffer,
  rankOffersByEffectivePrice,
  STANDARD_TREATMENTS,
  scoreClinicResolution,
  type TreatmentCategory,
} from '@medi-bridge/shared';
import { SEED_HOSPITALS, type SeedHospitalRecord } from './seedDataset';

export interface ListHospitalsFilter {
  readonly query?: string | undefined;
  readonly department?: string | undefined;
  readonly region?: string | undefined;
  readonly treatmentCode?: string | undefined;
  readonly includeVat?: boolean | undefined;
  readonly sortBy?: BoundsSortBy | undefined;
}

export interface TreatmentCatalogStats {
  readonly code: string;
  readonly category: TreatmentCategory;
  readonly label: string;
  readonly clinicCount: number;
  readonly avgHiraPrice: number;
  readonly lowestEffectivePrice: number;
}

export interface ComparisonRepository {
  matchHospital(query: MatchHospitalQuery): Promise<HospitalComparisonSummary | null>;
  compareBounds(req: BoundsComparisonRequest): Promise<HospitalComparisonSummary[]>;
  listHospitals(filter?: ListHospitalsFilter): Promise<HospitalComparisonSummary[]>;
  getHospitalBySlug(slug: string, includeVat?: boolean): Promise<HospitalComparisonSummary | null>;
  getTreatmentCatalogStats(includeVat?: boolean): Promise<TreatmentCatalogStats[]>;
}

export function buildHospitalComparisonSummary(
  record: {
    readonly hospitalId: string;
    readonly slug: string;
    readonly ykiho: string | null;
    readonly name: string;
    readonly department: TreatmentCategory;
    readonly sido: string;
    readonly sigungu: string;
    readonly roadAddress: string;
    readonly lat: number;
    readonly lng: number;
    readonly rating: number | null;
    readonly reviewCount: number;
    readonly hiraVerified: boolean;
    readonly hiraBaselineItems: readonly HiraBaselineItem[];
    readonly rawOffers: readonly RawPlatformOffer[];
  },
  includeVat: boolean,
  treatmentCodeFilter?: string,
): HospitalComparisonSummary {
  const baselineByTreatment: Record<string, number> = {};
  for (const item of record.hiraBaselineItems) {
    baselineByTreatment[item.treatmentCode] = item.minPrice;
  }

  const filteredRaw = treatmentCodeFilter
    ? record.rawOffers.filter((offer) => offer.treatmentCode === treatmentCodeFilter)
    : record.rawOffers;

  const offers: NormalizedPriceOffer[] = rankOffersByEffectivePrice(
    filteredRaw,
    includeVat,
    baselineByTreatment,
  );

  const lowestOffer =
    offers.find((offer) => offer.platform !== 'hira' && offer.effectivePrice > 0) ?? null;

  let maxSavingsAmount = 0;
  let maxSavingsPercent = 0;
  for (const offer of offers) {
    if (offer.savingsAmount > maxSavingsAmount) {
      maxSavingsAmount = offer.savingsAmount;
    }
    if (offer.savingsPercent > maxSavingsPercent) {
      maxSavingsPercent = offer.savingsPercent;
    }
  }

  return {
    hospitalId: record.hospitalId,
    slug: record.slug,
    ykiho: record.ykiho,
    name: record.name,
    department: record.department,
    sido: record.sido,
    sigungu: record.sigungu,
    roadAddress: record.roadAddress,
    lat: record.lat,
    lng: record.lng,
    rating: record.rating,
    reviewCount: record.reviewCount,
    hiraVerified: record.hiraVerified,
    hiraBaselineItems: [...record.hiraBaselineItems],
    offers,
    lowestOffer,
    maxSavingsAmount,
    maxSavingsPercent,
  };
}

export function sortSummaries(
  items: HospitalComparisonSummary[],
  sortBy: BoundsSortBy,
): HospitalComparisonSummary[] {
  const copy = [...items];
  copy.sort((a, b) => {
    if (sortBy === 'discount_rate') {
      if (b.maxSavingsPercent !== a.maxSavingsPercent) {
        return b.maxSavingsPercent - a.maxSavingsPercent;
      }
      const aPrice = a.lowestOffer?.effectivePrice ?? Number.MAX_SAFE_INTEGER;
      const bPrice = b.lowestOffer?.effectivePrice ?? Number.MAX_SAFE_INTEGER;
      return aPrice - bPrice;
    }

    if (sortBy === 'rating') {
      const aRating = a.rating ?? 0;
      const bRating = b.rating ?? 0;
      if (bRating !== aRating) {
        return bRating - aRating;
      }
      return b.reviewCount - a.reviewCount;
    }

    const aPrice = a.lowestOffer?.effectivePrice ?? Number.MAX_SAFE_INTEGER;
    const bPrice = b.lowestOffer?.effectivePrice ?? Number.MAX_SAFE_INTEGER;
    if (aPrice !== bPrice) {
      return aPrice - bPrice;
    }
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
  return copy;
}

export class SeedComparisonRepository implements ComparisonRepository {
  private readonly records: readonly SeedHospitalRecord[];

  constructor(records: readonly SeedHospitalRecord[] = SEED_HOSPITALS) {
    this.records = records;
  }

  async matchHospital(query: MatchHospitalQuery): Promise<HospitalComparisonSummary | null> {
    let bestRecord: SeedHospitalRecord | null = null;
    let bestScore = -1;

    for (const record of this.records) {
      const score = scoreClinicResolution(
        {
          name: record.name,
          roadAddress: record.roadAddress,
          ykiho: record.ykiho,
          lat: record.lat,
          lng: record.lng,
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
        bestRecord = record;
      }
    }

    if (!bestRecord) {
      return null;
    }

    return buildHospitalComparisonSummary(bestRecord, query.includeVat);
  }

  async compareBounds(req: BoundsComparisonRequest): Promise<HospitalComparisonSummary[]> {
    const matchedMap = new Map<string, HospitalComparisonSummary>();

    for (const clinic of req.clinics) {
      const summary = await this.matchHospital({
        name: clinic.name,
        regionHint: clinic.regionHint,
        department: clinic.department,
        includeVat: req.includeVat,
        ...(clinic.lat !== undefined ? { lat: clinic.lat } : {}),
        ...(clinic.lng !== undefined ? { lng: clinic.lng } : {}),
      });

      if (!summary) {
        continue;
      }

      if (req.department && req.department !== '전체') {
        const normalizedDept = normalizeDepartmentCategory(req.department);
        if (summary.department !== normalizedDept) {
          continue;
        }
      }

      const finalSummary = req.treatmentCode
        ? (() => {
            const rawRecord = this.records.find((r) => r.hospitalId === summary.hospitalId);
            return rawRecord
              ? buildHospitalComparisonSummary(rawRecord, req.includeVat, req.treatmentCode)
              : summary;
          })()
        : summary;

      if (req.treatmentCode && finalSummary.offers.length === 0) {
        continue;
      }

      if (!matchedMap.has(finalSummary.hospitalId)) {
        matchedMap.set(finalSummary.hospitalId, finalSummary);
      }
    }

    return sortSummaries(Array.from(matchedMap.values()), req.sortBy);
  }

  async listHospitals(filter: ListHospitalsFilter = {}): Promise<HospitalComparisonSummary[]> {
    const includeVat = filter.includeVat ?? true;
    const sortBy = filter.sortBy ?? 'lowest_price';
    const q = (filter.query ?? '').trim().toLowerCase();
    const region = (filter.region ?? '').trim().toLowerCase();

    const filtered = this.records.filter((record) => {
      if (filter.department && filter.department !== '전체') {
        if (record.department !== normalizeDepartmentCategory(filter.department)) {
          return false;
        }
      }
      if (region && region !== '전체') {
        const fullAddr = `${record.sido} ${record.sigungu} ${record.roadAddress}`.toLowerCase();
        if (!fullAddr.includes(region)) {
          return false;
        }
      }
      if (q) {
        const haystack = [
          record.name,
          record.department,
          record.roadAddress,
          ...record.rawOffers.map((o) => `${o.treatmentName} ${o.rawTitle}`),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }
      return true;
    });

    const summaries = filtered
      .map((record) => buildHospitalComparisonSummary(record, includeVat, filter.treatmentCode))
      .filter((summary) => !filter.treatmentCode || summary.offers.length > 0);

    return sortSummaries(summaries, sortBy);
  }

  async getHospitalBySlug(
    slug: string,
    includeVat = true,
  ): Promise<HospitalComparisonSummary | null> {
    const found = this.records.find((r) => r.slug === slug || r.hospitalId === slug);
    return found ? buildHospitalComparisonSummary(found, includeVat) : null;
  }

  async getTreatmentCatalogStats(includeVat = true): Promise<TreatmentCatalogStats[]> {
    const stats: TreatmentCatalogStats[] = [];

    for (const treatment of STANDARD_TREATMENTS) {
      let clinicCount = 0;
      let hiraSum = 0;
      let hiraCount = 0;
      let lowestEffectivePrice = Number.MAX_SAFE_INTEGER;

      for (const record of this.records) {
        const summary = buildHospitalComparisonSummary(record, includeVat, treatment.code);
        const baseline = record.hiraBaselineItems.find((b) => b.treatmentCode === treatment.code);
        if (summary.offers.length > 0 || baseline) {
          clinicCount += 1;
        }
        if (baseline) {
          hiraSum += baseline.minPrice;
          hiraCount += 1;
        }
        if (
          summary.lowestOffer &&
          summary.lowestOffer.effectivePrice > 0 &&
          summary.lowestOffer.effectivePrice < lowestEffectivePrice
        ) {
          lowestEffectivePrice = summary.lowestOffer.effectivePrice;
        }
      }

      stats.push({
        code: treatment.code,
        category: treatment.category,
        label: treatment.label,
        clinicCount,
        avgHiraPrice: hiraCount > 0 ? Math.round(hiraSum / hiraCount) : 0,
        lowestEffectivePrice:
          lowestEffectivePrice === Number.MAX_SAFE_INTEGER ? 0 : lowestEffectivePrice,
      });
    }

    return stats;
  }
}
