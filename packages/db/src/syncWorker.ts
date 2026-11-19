import {
  type HiraHospitalRecord,
  type HiraNonPaymentRecord,
  type ParsedExternalPlatformOffer,
  parseHiraHospitalBasisJson,
  parseHiraNonPaymentJson,
  parsePlatformOfferFeed,
} from '@medi-bridge/parsers';
import { scoreClinicResolution } from '@medi-bridge/shared';

export interface SyncWorkerInput {
  readonly hiraBasisPayload: unknown;
  readonly hiraNonPaymentPayload: unknown;
  readonly platformFeedPayload: unknown;
}

export interface SyncWorkerResult {
  readonly ok: boolean;
  readonly hospitalsParsed: number;
  readonly nonPaymentItemsParsed: number;
  readonly offersMatched: number;
  readonly matchedYkihoList: readonly string[];
  readonly errors: readonly string[];
}

/**
 * 심평원 병원·비급여 데이터와 다중 플랫폼 이벤트 피드를 요양기호(ykiho)·주소 기반으로 병합하는 배치 동기화 워커입니다.
 */
export function runHiraAndPlatformSync(input: SyncWorkerInput): SyncWorkerResult {
  const errors: string[] = [];

  const basisRes = parseHiraHospitalBasisJson(input.hiraBasisPayload);
  let hospitals: readonly HiraHospitalRecord[] = [];
  if (basisRes.kind === 'parse_error') {
    errors.push(`basis:${basisRes.reason}`);
  } else if (basisRes.kind === 'found') {
    hospitals = basisRes.items;
  }

  const nonPayRes = parseHiraNonPaymentJson(input.hiraNonPaymentPayload);
  let nonPaymentItems: readonly HiraNonPaymentRecord[] = [];
  if (nonPayRes.kind === 'parse_error') {
    errors.push(`nonpay:${nonPayRes.reason}`);
  } else if (nonPayRes.kind === 'found') {
    nonPaymentItems = nonPayRes.items;
  }

  const feedRes = parsePlatformOfferFeed(input.platformFeedPayload);
  let externalOffers: readonly ParsedExternalPlatformOffer[] = [];
  if (feedRes.kind === 'parse_error') {
    errors.push(`feed:${feedRes.reason}`);
  } else if (feedRes.kind === 'found') {
    externalOffers = feedRes.items;
  }

  const matchedYkiho = new Set<string>();
  let offersMatched = 0;

  for (const ext of externalOffers) {
    let bestYkiho: string | null = null;
    let bestScore = -1;
    for (const hosp of hospitals) {
      const score = scoreClinicResolution(
        {
          name: hosp.name,
          roadAddress: hosp.roadAddress,
          ykiho: hosp.ykiho,
          lat: hosp.lat,
          lng: hosp.lng,
        },
        {
          name: ext.hospitalName,
          regionHint: ext.hospitalAddress,
        },
      );
      if (score !== null && score > bestScore) {
        bestScore = score;
        bestYkiho = hosp.ykiho;
      }
    }
    if (bestYkiho) {
      matchedYkiho.add(bestYkiho);
      offersMatched += 1;
    }
  }

  return {
    ok: errors.length === 0,
    hospitalsParsed: hospitals.length,
    nonPaymentItemsParsed: nonPaymentItems.length,
    offersMatched,
    matchedYkihoList: Array.from(matchedYkiho),
    errors,
  };
}
