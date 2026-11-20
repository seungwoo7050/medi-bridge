import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  createComparisonRepository,
  runHiraAndPlatformSync,
  SeedComparisonRepository,
} from '../src/index';

describe('SeedComparisonRepository', () => {
  it('reorders lowest offer dynamically when includeVat toggles for 강남케이안과의원', async () => {
    const repo = new SeedComparisonRepository();

    const withVat = await repo.matchHospital({
      name: '강남케이안과의원',
      regionHint: '서울 강남구',
      department: '안과',
      includeVat: true,
    });
    expect(withVat).not.toBeNull();
    expect(withVat?.lowestOffer?.effectivePrice).toBe(2_090_000);
    const smileWithVat = withVat?.offers.filter((o) => o.treatmentCode === 'OPHTH_SMILE') ?? [];
    expect(smileWithVat[0]?.platform).toBe('modoodoc');
    expect(smileWithVat[0]?.effectivePrice).toBe(2_090_000);
    expect(smileWithVat[0]?.isLowest).toBe(true);
    expect(withVat?.maxSavingsAmount).toBe(1_410_000);

    const withoutVat = await repo.matchHospital({
      name: '강남케이안과의원',
      regionHint: '서울 강남구',
      department: '안과',
      includeVat: false,
    });
    const smileWithoutVat =
      withoutVat?.offers.filter((o) => o.treatmentCode === 'OPHTH_SMILE') ?? [];
    expect(smileWithoutVat[0]?.platform).toBe('gangnamunni');
    expect(smileWithoutVat[0]?.effectivePrice).toBe(1_950_000);
    expect(smileWithoutVat[0]?.isLowest).toBe(true);
  });

  it('compares batch bounds clinics and filters out wrong districts', async () => {
    const repo = createComparisonRepository('');
    const results = await repo.compareBounds({
      clinics: [
        { name: '강남케이안과의원', regionHint: '서울 강남구', department: '안과' },
        { name: '지에스안과의원', regionHint: '서울 강남구', department: '안과' },
        { name: '강남케이안과의원', regionHint: '부산 해운대구', department: '안과' },
      ],
      includeVat: true,
      sortBy: 'lowest_price',
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.name).toBe('강남케이안과의원');
    expect(results[0]?.lowestOffer?.effectivePrice).toBe(2_090_000);
  });
});

describe('runHiraAndPlatformSync', () => {
  it('matches HIRA hospital basis fixtures against platform offer feeds', () => {
    const fixturesDir = resolve(import.meta.dirname, '../../parsers/__fixtures__');
    const basis = JSON.parse(readFileSync(resolve(fixturesDir, 'hira-hosp-basis.json'), 'utf8'));
    const nonpay = JSON.parse(readFileSync(resolve(fixturesDir, 'hira-nonpayment.json'), 'utf8'));
    const feed = JSON.parse(
      readFileSync(resolve(fixturesDir, 'platform-offers-sample.json'), 'utf8'),
    );

    const result = runHiraAndPlatformSync({
      hiraBasisPayload: basis,
      hiraNonPaymentPayload: nonpay,
      platformFeedPayload: feed,
    });

    expect(result.ok).toBe(true);
    expect(result.hospitalsParsed).toBe(2);
    expect(result.nonPaymentItemsParsed).toBe(2);
    expect(result.offersMatched).toBe(2);
    expect(result.matchedYkihoList).toContain('JDQ4MTg4MTI1MDA1');
  });
});
