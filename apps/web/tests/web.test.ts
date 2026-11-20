import { computeEffectivePrice, formatPriceKRW } from '@medi-bridge/shared';
import { describe, expect, it, vi } from 'vitest';
import worker from '../cloudflare/worker';

describe('apps/web static Worker & VAT calculator', () => {
  it('RSC: 1 프리페치 헤더 요청은 404로 응답해 정적 404 루프를 방지한다', async () => {
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
    const res = await worker.fetch(
      new Request('https://medibridge.example.com/vat?_rsc=1', {
        headers: { RSC: '1' },
      }),
      { ASSETS: { fetch: fetchMock } },
    );

    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('/intro 경로 요청은 루트(/)로 301 영구 리다이렉트한다', async () => {
    const fetchMock = vi.fn(async () => new Response('ok', { status: 200 }));
    const res = await worker.fetch(new Request('https://medibridge.example.com/intro'), {
      ASSETS: { fetch: fetchMock },
    });

    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('https://medibridge.example.com/');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('일반 정적 문서 요청(/, /vat, /privacy)은 ASSETS 바인딩에 그대로 위임한다', async () => {
    const fetchMock = vi.fn(async () => new Response('<html>landing</html>', { status: 200 }));

    for (const path of ['/', '/vat', '/privacy']) {
      const req = new Request(`https://medibridge.example.com${path}`);
      const res = await worker.fetch(req, { ASSETS: { fetch: fetchMock } });
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('landing');
    }

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('시뮬레이터의 부가세 10% 가산 계산이 원화 천 단위 포맷과 정확히 일치한다', () => {
    const excludedOffer = computeEffectivePrice(1_950_000, false, true);
    expect(excludedOffer).toBe(2_145_000);
    expect(formatPriceKRW(excludedOffer)).toBe('2,145,000원');

    const includedOffer = computeEffectivePrice(2_090_000, true, true);
    expect(includedOffer).toBe(2_090_000);
    expect(formatPriceKRW(includedOffer)).toBe('2,090,000원');
  });
});
