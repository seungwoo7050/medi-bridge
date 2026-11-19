import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseHiraHospitalBasisJson,
  parseHiraNonPaymentJson,
  parseModoodocSearchResult,
  parsePlatformOfferFeed,
} from '../src/index';

const FIXTURES_DIR = resolve(import.meta.dirname, '../__fixtures__');

describe('HIRA parsers', () => {
  it('parses hospital basis and non-payment official price fixtures', () => {
    const basisJson = JSON.parse(
      readFileSync(resolve(FIXTURES_DIR, 'hira-hosp-basis.json'), 'utf8'),
    );
    const basisResult = parseHiraHospitalBasisJson(basisJson);
    expect(basisResult.kind).toBe('found');
    if (basisResult.kind === 'found') {
      expect(basisResult.items).toHaveLength(2);
      expect(basisResult.items[0]?.ykiho).toBe('JDQ4MTg4MTI1MDA1');
      expect(basisResult.items[0]?.department).toBe('안과');
    }

    const nonpayJson = JSON.parse(
      readFileSync(resolve(FIXTURES_DIR, 'hira-nonpayment.json'), 'utf8'),
    );
    const nonpayResult = parseHiraNonPaymentJson(nonpayJson);
    expect(nonpayResult.kind).toBe('found');
    if (nonpayResult.kind === 'found') {
      expect(nonpayResult.items[0]?.treatmentCode).toBe('OPHTH_SMILE');
      expect(nonpayResult.items[0]?.minPrice).toBe(3_500_000);
      expect(nonpayResult.items[1]?.treatmentCode).toBe('DERM_INMODE');
    }
  });

  it('returns parse_error on malformed HIRA payloads', () => {
    expect(parseHiraHospitalBasisJson({ broken: true }).kind).toBe('parse_error');
    expect(
      parseHiraNonPaymentJson({
        response: { header: { resultCode: '99' }, body: {} },
      }).kind,
    ).toBe('parse_error');
  });
});

describe('Modoodoc SSR parser', () => {
  it('extracts hospital summary from offline SSR HTML fixture and separates parse_error', () => {
    const html = readFileSync(resolve(FIXTURES_DIR, 'modoodoc-search-ssr.html'), 'utf8');
    const result = parseModoodocSearchResult(html, '강남케이안과의원', '서울 강남구');
    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(result.summary.hospitalId).toBe(86566);
      expect(result.summary.topPrices[0]?.displayPrice).toBe('209만원');
    }

    expect(parseModoodocSearchResult('<html><body>no next data</body></html>', '테스트').kind).toBe(
      'parse_error',
    );
  });
});

describe('Platform offer feed normalizer', () => {
  it('classifies standard codes and extracts VAT flags from sample feed', () => {
    const feedJson = JSON.parse(
      readFileSync(resolve(FIXTURES_DIR, 'platform-offers-sample.json'), 'utf8'),
    );
    const result = parsePlatformOfferFeed(feedJson);
    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.offer.treatmentCode).toBe('OPHTH_SMILE');
      expect(result.items[0]?.offer.vatIncluded).toBe(false);
      expect(result.items[1]?.offer.badge).toBe('첫방문');
    }

    expect(parsePlatformOfferFeed({ wrong: 123 }).kind).toBe('parse_error');
  });
});
