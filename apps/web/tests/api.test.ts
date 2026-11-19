import type { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { POST as postBounds } from '../src/app/api/v1/hospitals/bounds/route';
import { GET as getMatch } from '../src/app/api/v1/hospitals/match/route';
import { GET as getTreatments } from '../src/app/api/v1/treatments/route';

function makeNextRequest(url: string, init?: { method?: string; body?: string }): NextRequest {
  return {
    nextUrl: new URL(url),
    json: async () => (init?.body ? JSON.parse(init.body) : {}),
  } as unknown as NextRequest;
}

describe('apps/web API v1 routes', () => {
  it('matches 강남케이안과의원 and flips SMILE lowest platform by includeVat flag', async () => {
    const resVatOn = await getMatch(
      makeNextRequest(
        'http://localhost:3000/api/v1/hospitals/match?name=강남케이안과의원&regionHint=서울%20강남구&includeVat=true',
      ),
    );
    expect(resVatOn.status).toBe(200);
    const dataOn = await resVatOn.json();
    expect(dataOn.matched).toBe(true);
    const smileOn = dataOn.hospital.offers.filter(
      (o: { treatmentCode: string }) => o.treatmentCode === 'OPHTH_SMILE',
    );
    expect(smileOn[0].platform).toBe('modoodoc');

    const resVatOff = await getMatch(
      makeNextRequest(
        'http://localhost:3000/api/v1/hospitals/match?name=강남케이안과의원&regionHint=서울%20강남구&includeVat=false',
      ),
    );
    const dataOff = await resVatOff.json();
    const smileOff = dataOff.hospital.offers.filter(
      (o: { treatmentCode: string }) => o.treatmentCode === 'OPHTH_SMILE',
    );
    expect(smileOff[0].platform).toBe('gangnamunni');
  });

  it('compares batch bounds clinics and validates malformed body with 400', async () => {
    const res = await postBounds(
      makeNextRequest('http://localhost:3000/api/v1/hospitals/bounds', {
        method: 'POST',
        body: JSON.stringify({
          clinics: [
            { name: '강남케이안과의원', regionHint: '서울 강남구', department: '안과' },
            { name: '연세봄피부과의원', regionHint: '서울 서초구', department: '피부과' },
          ],
          includeVat: true,
          sortBy: 'lowest_price',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matchedCount).toBe(2);
    expect(json.items[0].name).toBe('연세봄피부과의원');

    const bad = await postBounds(
      makeNextRequest('http://localhost:3000/api/v1/hospitals/bounds', {
        method: 'POST',
        body: JSON.stringify({ clinics: 'not-an-array' }),
      }),
    );
    expect(bad.status).toBe(400);
  });

  it('returns standard treatment catalog stats', async () => {
    const res = await getTreatments(
      makeNextRequest('http://localhost:3000/api/v1/treatments?includeVat=true'),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.treatments.length).toBeGreaterThanOrEqual(9);
  });
});
