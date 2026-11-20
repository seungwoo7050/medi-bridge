import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { type BrowserContext, chromium, expect, test } from '@playwright/test';

const EXTENSION_PATH = resolve(import.meta.dirname, '../output/chrome-mv3');

const MODOODOC_DETAIL_SLUG = '드라마치과병원-경기-성남시';
const MODOODOC_DETAIL_URL = `https://www.modoodoc.com/hospital/17593/${encodeURIComponent(
  MODOODOC_DETAIL_SLUG,
)}`;

const MODOODOC_SSR_PAYLOAD = {
  props: {
    pageProps: {
      dehydratedState: {
        queries: [
          {
            queryKey: ['hospitalsWithQuery', '드라마치과병원'],
            state: {
              data: {
                hospitals: [
                  {
                    id: 17593,
                    name: '드라마치과병원',
                    slug: MODOODOC_DETAIL_SLUG,
                    address: '경기 성남시 분당구 정자일로 198번길 15',
                    totalScore: 9.2,
                    numOfReview: 418,
                    treatments: [{ name: '임플란트', count: 142 }],
                    treatmentPrices: [
                      {
                        treatmentName: '오스템 임플란트 (특가)',
                        normalPrice: { lowestPrice: 3_500_000, highestPrice: 3_500_000 },
                        eventPrice: { lowestPrice: 2_090_000, highestPrice: 2_090_000 },
                      },
                    ],
                    hiraTreatmentPrices: [],
                  },
                ],
                premiumAdHospitals: [],
              },
            },
          },
        ],
      },
    },
  },
};

const MODOODOC_SEARCH_HTML = `<!doctype html><html><head><meta charset="utf-8" /></head><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(MODOODOC_SSR_PAYLOAD)}</script></body></html>`;

const SEARCH_IFRAME_HTML = `<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8" /></head>
  <body>
    <div id="_pcmap_list_scroll_container">
      <ul>
        <li class="DWs4Q z23xh" data-testid="drama-hospital">
          <div class="IPtqD">
            <div class="uMPdj">
              <a
                href="#"
                class="uD1F4 gADnZ"
                data-nlog-params='{"item_type":"place_type","item_name":"hospital"}'
              >
                <span class="q2LdB">드라마치과병원</span>
              </a>
            </div>
            <div class="_XGt_"><span class="suKMR">경기 성남시 분당구 정자동</span></div>
            <div class="KJzzB">
              <span class="D1dXu">휴게시간</span>
              <span class="D1dXu">14:00에 진료 시작</span>
            </div>
          </div>
        </li>
        <li class="DWs4Q z23xh" data-testid="k-eye">
          <div class="IPtqD">
            <div class="uMPdj">
              <a href="#" class="uD1F4 gADnZ">
                <span class="q2LdB">강남케이안과의원</span>
                <span class="lHBM6">안과</span>
              </a>
            </div>
            <div class="_XGt_"><span class="suKMR">서울 강남구 역삼동</span></div>
          </div>
        </li>
        <li class="DWs4Q z23xh" data-testid="vet-hospital">
          <div class="IPtqD">
            <div class="uMPdj">
              <a href="#" class="uD1F4 gADnZ">
                <span class="q2LdB">24시센트럴동물병원</span>
                <span class="lHBM6">동물병원</span>
              </a>
            </div>
            <div class="_XGt_"><span class="suKMR">서울 강남구 논현동</span></div>
          </div>
        </li>
        <li class="DWs4Q z23xh" data-testid="cafe-place">
          <div class="IPtqD">
            <div class="uMPdj">
              <a href="#" class="uD1F4 gADnZ">
                <span class="q2LdB">스타벅스 강남역점</span>
                <span class="lHBM6">카페,디저트</span>
              </a>
            </div>
            <div class="_XGt_"><span class="suKMR">서울 서초구 서초동</span></div>
          </div>
        </li>
      </ul>
    </div>
  </body>
</html>`;

// /photo 뷰처럼 주소(.pz7wy)와 진료과 배지가 없고 상단 헤더·탭바만 존재하는 상세 프레임 시나리오
const ENTRY_PHOTO_IFRAME_HTML = `<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8" /></head>
  <body>
    <div role="main">
      <header class="place_tab_shadow FFTct" role="banner">
        <h1 id="_header" class="bh9OH">드라마치과병원</h1>
      </header>
      <div class="place_fixed_maintab place_stuck">
        <div role="tablist">홈리뷰사진정보</div>
      </div>
    </div>
  </body>
</html>`;

const PARENT_MAP_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0;
        height: 100vh;
        display: flex;
      }
      iframe {
        border: 0;
        width: 420px;
        height: 100vh;
      }
    </style>
  </head>
  <body>
    <iframe id="searchIframe" name="searchIframe" src="https://pcmap.place.naver.com/hospital/list?query=%EC%A0%95%EC%9E%90%EB%8F%99%20%EC%B9%98%EA%B3%BC"></iframe>
    <iframe id="entryIframe" name="entryIframe" src="about:blank"></iframe>
  </body>
</html>`;

async function resolveExtensionId(context: BrowserContext): Promise<string> {
  const page = await context.newPage();
  await page.goto('chrome://extensions/', { waitUntil: 'domcontentloaded' });
  const extId = await page.evaluate(() => {
    const manager = document.querySelector('extensions-manager');
    const itemList = manager?.shadowRoot?.querySelector('extensions-item-list');
    const item = itemList?.shadowRoot?.querySelector('extensions-item');
    return item?.getAttribute('id') ?? '';
  });
  await page.close();
  if (!extId) {
    throw new Error('Failed to resolve loaded Chrome extension ID');
  }
  return extId;
}

test('네이버 지도 실시간 SSR 매칭, 크로스 프레임 지역 힌트 릴레이(/photo), 타 플랫폼 링크 및 Popup 토글을 검증한다', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'medi-bridge-e2e-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: true,
    args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
  });

  try {
    await context.route('https://map.naver.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: PARENT_MAP_HTML,
      });
    });

    await context.route('https://pcmap.place.naver.com/**', async (route) => {
      const url = route.request().url();
      const body = url.includes('/list') ? SEARCH_IFRAME_HTML : ENTRY_PHOTO_IFRAME_HTML;
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body,
      });
    });

    await context.route('https://www.modoodoc.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<html><body><h1>드라마치과병원 상세</h1></body></html>',
      });
    });

    let [bgWorker] = context.serviceWorkers();
    if (!bgWorker) {
      bgWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    }

    // MV3 서비스 워커의 fetch는 Playwright context.route를 우회하므로 워커 내부에서 결정론적으로 모킹·계측
    await bgWorker.evaluate((ssrHtml: string) => {
      const g = globalThis as typeof globalThis & { __modoodocQueries?: string[] };
      g.__modoodocQueries = [];
      const origFetch = globalThis.fetch.bind(globalThis);
      globalThis.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.includes('www.modoodoc.com/hospitals/query-search')) {
          g.__modoodocQueries?.push(url);
          return new Response(ssrHtml, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        return origFetch(input, init);
      };
    }, MODOODOC_SEARCH_HTML);

    const getWorkerQueries = (): Promise<string[]> =>
      bgWorker.evaluate(() => {
        const g = globalThis as typeof globalThis & { __modoodocQueries?: string[] };
        return g.__modoodocQueries ?? [];
      });

    const mapPage = await context.newPage();
    await test.step('1. 검색 목록 칩 마운트, 반경 드로어 미존재 및 자동 SSR 배치 호출 0건', async () => {
      await mapPage.goto('https://map.naver.com/p/search/test', {
        waitUntil: 'load',
      });

      await expect
        .poll(() => mapPage.frame({ name: 'searchIframe' }) !== null, { timeout: 5_000 })
        .toBe(true);

      const searchFrame = mapPage.frame({ name: 'searchIframe' });
      expect(searchFrame).not.toBeNull();
      if (!searchFrame) return;

      await expect(searchFrame.locator('medi-bridge-list-chip')).toHaveCount(2, {
        timeout: 10_000,
      });
      await expect(
        searchFrame.locator('[data-testid="vet-hospital"] medi-bridge-list-chip'),
      ).toHaveCount(0);
      await expect(
        searchFrame.locator('[data-testid="cafe-place"] medi-bridge-list-chip'),
      ).toHaveCount(0);
      await expect(searchFrame.locator('medi-bridge-radius-drawer')).toHaveCount(0);
      expect(await getWorkerQueries()).toHaveLength(0);
    });

    // 목록 힌트 등록 후 썸네일(/photo) 클릭으로 주소 DOM 없는 상세 뷰가 열리는 흐름 재현
    await mapPage.evaluate(() => {
      const entryFrameEl = document.getElementById('entryIframe') as HTMLIFrameElement | null;
      if (entryFrameEl) {
        entryFrameEl.src = 'https://pcmap.place.naver.com/hospital/20139861/photo';
      }
    });

    await expect
      .poll(() => mapPage.frame({ name: 'entryIframe' })?.url() ?? '', { timeout: 5_000 })
      .toContain('/photo');

    const searchFrame = mapPage.frame({ name: 'searchIframe' });
    const entryFrame = mapPage.frame({ name: 'entryIframe' });
    expect(searchFrame).not.toBeNull();
    expect(entryFrame).not.toBeNull();
    if (!searchFrame || !entryFrame) return;

    await test.step('2. /photo 상세 카드가 릴레이된 지역 힌트로 실시간 SSR 매칭·표시', async () => {
      const entryCard = entryFrame.locator('medi-bridge-entry-card .mb-bento-card');
      await expect(entryCard).toBeVisible({ timeout: 10_000 });

      const queries = await getWorkerQueries();
      expect(queries.length).toBeGreaterThanOrEqual(1);
      const searchQuery = new URL(queries[0] ?? '').searchParams.get('search_query') ?? '';
      expect(searchQuery).toContain('드라마치과병원');
      expect(searchQuery).toContain('경기 성남시');

      await expect(entryCard.locator('.mb-rating')).toContainText('9.2');
      await expect(entryCard.locator('.mb-reviews')).toContainText('418');
      await expect(entryCard.locator('.mb-tag-chip').first()).toContainText('#임플란트 142');
      await expect(entryCard.locator('.mb-savings-pill')).toContainText('-40%');
      await expect(entryCard.locator('.mb-hira-price')).toContainText('3,500,000원');
      await expect(entryCard.locator('.mb-offer-price')).toContainText('2,090,000원');
      await expect(entryCard.locator('.mb-ext-chip')).toContainText(['강남언니 ↗', '굿닥 ↗']);

      const ctaHref = await entryCard.locator('a.mb-primary-cta').getAttribute('href');
      expect(ctaHref).toBe(MODOODOC_DETAIL_URL);
    });

    const extId = await test.step('3. 확장 ID 추출 및 Popup 이력·토글 검증', async () => {
      const workerHost = new URL(bgWorker.url()).host;
      return workerHost || resolveExtensionId(context);
    });

    const popupPage = await context.newPage();
    await test.step('4. Popup 최근 병원 및 ON/OFF 토글 연동', async () => {
      await popupPage.goto(`chrome-extension://${extId}/popup.html`, {
        waitUntil: 'domcontentloaded',
      });

      await expect(popupPage.locator('.history-name')).toContainText(['드라마치과병원']);
      await expect(popupPage.locator('.status-text')).toContainText(
        '네이버 지도 실시간 병원 가격·리뷰 연동 중',
      );
      await expect(popupPage.locator('.vat-pill')).toHaveCount(0);

      const overlaySwitch = popupPage.getByRole('switch', {
        name: '네이버 지도 내 메디 브릿지 자동 표시',
      });
      await expect(overlaySwitch).toHaveAttribute('aria-checked', 'true');
      await overlaySwitch.click();
      await expect(overlaySwitch).toHaveAttribute('aria-checked', 'false');

      await expect(entryFrame.locator('medi-bridge-entry-card')).toHaveCount(0, { timeout: 5_000 });
      await expect(searchFrame.locator('medi-bridge-list-chip')).toHaveCount(0, { timeout: 5_000 });

      await overlaySwitch.click();
      await expect(entryFrame.locator('medi-bridge-entry-card .mb-bento-card')).toHaveCount(1, {
        timeout: 5_000,
      });
      await expect(searchFrame.locator('medi-bridge-list-chip')).toHaveCount(2, { timeout: 5_000 });
    });

    await test.step('5. 상세 CTA 클릭 시 새 탭 이동 및 리스트 칩 방문 상태 동기화', async () => {
      const [newTab] = await Promise.all([
        context.waitForEvent('page', { timeout: 10_000 }),
        entryFrame.locator('medi-bridge-entry-card a.mb-primary-cta').click(),
      ]);
      await newTab.waitForLoadState('domcontentloaded');
      expect(newTab.url()).toBe(MODOODOC_DETAIL_URL);

      await expect(popupPage.locator('.visited-pill').first()).toContainText('상세 열람함');

      const dramaChip = searchFrame.locator(
        '[data-testid="drama-hospital"] medi-bridge-list-chip a.mb-list-chip',
      );
      await expect(dramaChip).toHaveClass(/is-visited/, { timeout: 5_000 });
    });
  } finally {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
