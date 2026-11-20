import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseModoodocSearchResult } from '../src/index';

const FIXTURES_DIR = resolve(import.meta.dirname, '../__fixtures__');

describe('Modoodoc SSR parser', () => {
  it('extracts hospital summary from offline SSR HTML fixture and formats KRW prices', () => {
    const html = readFileSync(resolve(FIXTURES_DIR, 'modoodoc-search-ssr.html'), 'utf8');
    const result = parseModoodocSearchResult(html, '강남케이안과의원', '서울 강남구');
    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(result.summary.hospitalId).toBe(86566);
      expect(result.summary.topPrices[0]?.displayPrice).toBe('2,090,000원');
      expect(result.summary.topPrices[0]?.originalPrice).toBe('3,500,000원');
      expect(result.summary.topPrices[0]?.discountPercent).toBe(40);
    }

    expect(parseModoodocSearchResult('<html><body>no next data</body></html>', '테스트').kind).toBe(
      'parse_error',
    );
  });

  it('guards against 80-pt branch prefix matches when targetRegionHint is empty', () => {
    const html = readFileSync(resolve(FIXTURES_DIR, 'modoodoc-search-ssr.html'), 'utf8');
    expect(parseModoodocSearchResult(html, '강남케이안과의원 잠실점', '').kind).toBe('not_found');
    expect(parseModoodocSearchResult(html, '강남케이안과의원', '').kind).toBe('found');
  });
});
