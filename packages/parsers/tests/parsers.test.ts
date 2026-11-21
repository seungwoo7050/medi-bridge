import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseBabitalkHospitalEvents,
  parseBabitalkHospitalSearch,
  parseGangnamunniHospitalDetail,
  parseGangnamunniSearchCandidates,
  parseModoodocSearchResult,
  parseYeoshinHospitalSearch,
  parseYeoshinSalesEvents,
} from '../src/index';

const FIXTURES_DIR = resolve(import.meta.dirname, '../__fixtures__');

function readJsonFixture(filename: string): unknown {
  return JSON.parse(readFileSync(resolve(FIXTURES_DIR, filename), 'utf8')) as unknown;
}

describe('Modoodoc SSR parser', () => {
  it('extracts hospital summary, modoodocOffers, and hiraOffers from offline SSR HTML fixture', () => {
    const html = readFileSync(resolve(FIXTURES_DIR, 'modoodoc-search-ssr.html'), 'utf8');
    const result = parseModoodocSearchResult(html, '강남케이안과의원', '서울 강남구', '안과');
    expect(result.kind).toBe('found');
    if (result.kind === 'found') {
      expect(result.summary.hospitalId).toBe(86566);
      expect(result.summary.topPrices[0]?.displayPrice).toBe('2,090,000원');
      expect(result.summary.topPrices[0]?.originalPrice).toBe('3,500,000원');
      expect(result.summary.topPrices[0]?.discountPercent).toBe(40);
      expect(result.summary.modoodocOffers).toHaveLength(1);
      expect(result.summary.modoodocOffers?.[0]?.platform).toBe('modoodoc');
      expect(result.summary.modoodocOffers?.[0]?.listedPrice).toBe(2_090_000);
      expect(result.summary.hiraOffers).toHaveLength(1);
      expect(result.summary.hiraOffers?.[0]?.platform).toBe('hira');
      expect(result.summary.hiraOffers?.[0]?.listedPrice).toBe(2_900_000);
      expect(result.summary.hiraOffers?.[0]?.hasRange).toBe(true);
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

describe('Gangnamunni SSR parser', () => {
  it('parses search candidates and verifies region + events from hospital detail fixture', () => {
    const searchHtml = readFileSync(resolve(FIXTURES_DIR, 'gangnamunni-search-ssr.html'), 'utf8');
    const candidatesRes = parseGangnamunniSearchCandidates(
      searchHtml,
      '톡스앤필의원 강남본점',
      '서울 서초구',
    );
    expect(candidatesRes.kind).toBe('found');
    if (candidatesRes.kind === 'found') {
      expect(candidatesRes.candidates[0]?.id).toBe(3702);
    }

    const detailHtml = readFileSync(resolve(FIXTURES_DIR, 'gangnamunni-hospital-ssr.html'), 'utf8');
    const detailRes = parseGangnamunniHospitalDetail(
      detailHtml,
      '톡스앤필의원 강남본점',
      '서울 서초구',
      '피부과',
    );
    expect(detailRes.kind).toBe('found');
    if (detailRes.kind === 'found') {
      expect(detailRes.summary.rating).toBe(9.1);
      expect(detailRes.summary.reviewCount).toBe(1344);
      expect(detailRes.summary.offers).toHaveLength(2);
      expect(detailRes.summary.offers[1]?.listedPrice).toBe(30000);
      expect(detailRes.summary.offers[1]?.vatIncluded).toBe(false);
      expect(detailRes.summary.offers[1]?.bookingUrl).toBe('https://unni.app/events/73535');
    }

    expect(
      parseGangnamunniHospitalDetail(detailHtml, '톡스앤필의원 강남본점', '부산 해운대구').kind,
    ).toBe('not_found');
    expect(parseGangnamunniHospitalDetail('<html></html>', '톡스앤필').kind).toBe('parse_error');
  });
});

describe('Yeoshin Ticket API parser', () => {
  it('matches hospital by address and joins active KRW sales events', () => {
    const searchJson = readJsonFixture('yeoshin-hospitals.json');
    const hospRes = parseYeoshinHospitalSearch(searchJson, '톡스앤필의원 강남본점', '서울 서초구');
    expect(hospRes.kind).toBe('found');
    if (hospRes.kind === 'found') {
      expect(hospRes.hospital.hospitalId).toBe(4439);
      expect(hospRes.hospital.rating).toBe(9.2);
      expect(hospRes.hospital.detailUrl).toBe('https://www.yeoshin.co.kr/hospitals/4439');
    }

    expect(
      parseYeoshinHospitalSearch(searchJson, '톡스앤필의원 강남본점', '대구 수성구').kind,
    ).toBe('not_found');
    expect(parseYeoshinHospitalSearch({ code: 'ERROR' }, '톡스앤필').kind).toBe('parse_error');

    const eventsJson = readJsonFixture('yeoshin-sales-events.json');
    const eventsRes = parseYeoshinSalesEvents(eventsJson, 4439, '피부과');
    expect(eventsRes.kind).toBe('found');
    if (eventsRes.kind === 'found') {
      expect(eventsRes.offers).toHaveLength(1);
      expect(eventsRes.offers[0]?.listedPrice).toBe(39000);
      expect(eventsRes.offers[0]?.originalPrice).toBe(79000);
      expect(eventsRes.offers[0]?.treatmentCode).toBe('PLASTIC_BOTOX');
    }
  });
});

describe('Babitalk API parser', () => {
  it('matches hospital by region and extracts event offers with VAT flags', () => {
    const hospJson = readJsonFixture('babitalk-hospitals.json');
    const hospRes = parseBabitalkHospitalSearch(hospJson, '톡스앤필의원 강남본점', '서울 서초구');
    expect(hospRes.kind).toBe('found');
    if (hospRes.kind === 'found') {
      expect(hospRes.hospital.hospitalId).toBe(4845);
      expect(hospRes.hospital.rating).toBe(4.9);
      expect(hospRes.hospital.detailUrl).toBe('https://babitalk.com/hospitals/4845');
    }

    expect(parseBabitalkHospitalSearch(hospJson, '톡스앤필의원 강남본점', '인천 남동구').kind).toBe(
      'not_found',
    );
    expect(parseBabitalkHospitalSearch({}, '톡스앤필').kind).toBe('parse_error');

    const eventsJson = readJsonFixture('babitalk-events.json');
    const eventsRes = parseBabitalkHospitalEvents(eventsJson, 4845, '피부과');
    expect(eventsRes.kind).toBe('found');
    if (eventsRes.kind === 'found') {
      expect(eventsRes.offers).toHaveLength(2);
      expect(eventsRes.offers[0]?.badge).toBe('특가');
      expect(eventsRes.offers[0]?.listedPrice).toBe(120000);
      expect(eventsRes.offers[1]?.vatIncluded).toBe(false);
      expect(eventsRes.offers[1]?.bookingUrl).toBe('https://babitalk.com/events/77621');
    }
  });
});
