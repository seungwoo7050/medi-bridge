import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { type BrowserContext, chromium, expect, test } from '@playwright/test';

const EXTENSION_PATH = resolve(import.meta.dirname, '../output/chrome-mv3');

const MODOODOC_DETAIL_SLUG = '강남케이안과의원-서울-역삼동';
const MODOODOC_DETAIL_URL = `https://www.modoodoc.com/hospital/86566/${encodeURIComponent(
  MODOODOC_DETAIL_SLUG,
)}`;
const GS_DETAIL_SLUG = '지에스안과의원-서울-역삼동';
const GS_DETAIL_URL = `https://www.modoodoc.com/hospital/91234/${encodeURIComponent(
  GS_DETAIL_SLUG,
)}`;

const MODOODOC_SSR_DATA = {
  props: {
    pageProps: {
      dehydratedState: {
        queries: [
          {
            queryKey: ['hospitalsWithQuery', { searchQuery: '서울 강남구 강남케이안과의원' }],
            state: {
              data: {
                hospitals: [
                  {
                    id: 4550,
                    name: 'YK안과의원',
                    slug: 'yk안과의원-서울-삼성동',
                    address: '서울 강남구 삼성2동',
                    numOfReview: 20,
                    totalScore: 8.6,
                    treatments: [{ name: '인공눈물 처방', count: 4 }],
                    treatmentPrices: [],
                    hiraTreatmentPrices: [],
                  },
                  {
                    id: 91234,
                    name: '지에스안과의원',
                    slug: GS_DETAIL_SLUG,
                    address: '서울 강남구 역삼1동',
                    numOfReview: 25,
                    totalScore: 9.4,
                    treatments: [{ name: '라섹', count: 12 }],
                    treatmentPrices: [],
                    hiraTreatmentPrices: [],
                  },
                  {
                    id: 86566,
                    name: '강남케이안과의원',
                    slug: MODOODOC_DETAIL_SLUG,
                    address: '서울 강남구 역삼1동',
                    numOfReview: 10,
                    totalScore: 10,
                    treatments: [
                      { name: '스마일라식', count: 9 },
                      { name: '인공눈물 처방', count: 1 },
                    ],
                    treatmentPrices: [
                      {
                        treatmentGroup: { name: '시력교정술 검진' },
                        normalPrice: { lowestPrice: 0, highestPrice: 0 },
                        eventPrice: null,
                        specialPrice: null,
                      },
                      {
                        treatmentGroup: { name: '스마일라식' },
                        normalPrice: { lowestPrice: 3500000, highestPrice: 3500000 },
                        eventPrice: { lowestPrice: 2090000, highestPrice: 2090000 },
                        specialPrice: null,
                      },
                      {
                        treatmentGroup: { name: '렌즈삽입술' },
                        normalPrice: { lowestPrice: 6000000, highestPrice: 6000000 },
                        eventPrice: { lowestPrice: 4800000, highestPrice: 4800000 },
                        specialPrice: null,
                      },
                      {
                        treatmentGroup: { name: '아벨리노 DNA 검사' },
                        normalPrice: { lowestPrice: 100000, highestPrice: 100000 },
                        eventPrice: null,
                        specialPrice: null,
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

const MODOODOC_SEARCH_HTML = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(MODOODOC_SSR_DATA)}</script>
  </head>
  <body><h1>모두닥 검색</h1></body>
</html>`;

const SEARCH_IFRAME_HTML = `<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8" /></head>
  <body>
    <div id="_pcmap_list_scroll_container">
      <ul>
        <li class="DWs4Q z23xh" data-testid="ad-hospital">
          <div class="IPtqD">
            <div class="uMPdj">
              <a href="#" class="uD1F4 gADnZ" data-nlog-params='{"item_type":"place_type","item_name":"hospital"}'>
                <span class="q2LdB">지에스안과의원</span>
              </a>
            </div>
            <div class="_XGt_"><span class="suKMR">서울 강남구 역삼동</span></div>
            <div class="wt0BA"><span class="D1dXu">전문의</span><span class="D1dXu">안과 7명</span></div>
          </div>
        </li>
        <li class="DWs4Q z23xh" data-testid="organic-hospital">
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

const ENTRY_IFRAME_HTML = `<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8" /></head>
  <body>
    <div role="main">
      <div class="place_section no_margin OP4V8 xtZml" data-nclicks-area-code="btp">
        <div class="WmLT9"><span class="PbnXW">강남케이안과의원</span></div>
        <div>
          <div class="HzrWS">
            <span class="mwWcl">안과</span>
            <span class="mwWcl"><a href="/hospital/1399571178/review/visitor">리뷰 307</a></span>
          </div>
        </div>
      </div>
      <div class="place_section no_margin">
        <div class="O8qbU tQY7D">
          <div class="vV_z_">
            <span class="pz7wy">서울 강남구 강남대로 374 13층</span>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>`;

const PARENT_MAP_HTML = `<!doctype html>
<html lang="ko">
  <head><meta charset="utf-8" /></head>
  <body>
    <iframe id="searchIframe" name="searchIframe" src="https://pcmap.place.naver.com/hospital/list?query=test"></iframe>
    <iframe id="entryIframe" name="entryIframe" src="https://pcmap.place.naver.com/hospital/1399571178/home"></iframe>
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

test('네이버 지도 요약 카드·딥링크, 저채도 목록 칩 전환, Popup 비교함 및 실시간 토글을 검증한다', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'modoodoc-e2e-'));
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
      const body = url.includes('/list') ? SEARCH_IFRAME_HTML : ENTRY_IFRAME_HTML;
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body,
      });
    });

    await context.route('https://www.modoodoc.com/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/hospitals/query-search')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: MODOODOC_SEARCH_HTML,
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: '<html><body><h1>강남케이안과의원 상세</h1></body></html>',
      });
    });

    let [bgWorker] = context.serviceWorkers();
    if (!bgWorker) {
      bgWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    }
    await bgWorker.evaluate((mockHtml: string) => {
      const origFetch = globalThis.fetch.bind(globalThis);
      globalThis.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.startsWith('https://www.modoodoc.com/hospitals/query-search')) {
          return new Response(mockHtml, {
            status: 200,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          });
        }
        return origFetch(input, init);
      };
    }, MODOODOC_SEARCH_HTML);

    const mapPage = await context.newPage();
    await mapPage.goto('https://map.naver.com/p/search/test', {
      waitUntil: 'load',
    });

    await expect
      .poll(() => mapPage.frame({ name: 'searchIframe' }) !== null, {
        timeout: 5_000,
      })
      .toBe(true);
    await expect
      .poll(() => mapPage.frame({ name: 'entryIframe' }) !== null, {
        timeout: 5_000,
      })
      .toBe(true);

    const searchFrame = mapPage.frame({ name: 'searchIframe' });
    const entryFrame = mapPage.frame({ name: 'entryIframe' });
    expect(searchFrame).not.toBeNull();
    expect(entryFrame).not.toBeNull();

    if (!searchFrame || !entryFrame) {
      return;
    }

    // 1. 검색 목록: 병원 2건에만 Ghost 미니 칩 마운트, 동물병원·카페 미노출
    const listChipLocator = searchFrame.locator('modoodoc-naver-list-chip');
    await expect(listChipLocator).toHaveCount(2, { timeout: 10_000 });
    await expect(
      searchFrame.locator('[data-testid="vet-hospital"] modoodoc-naver-list-chip'),
    ).toHaveCount(0);
    await expect(
      searchFrame.locator('[data-testid="cafe-place"] modoodoc-naver-list-chip'),
    ).toHaveCount(0);

    // 2. 상세 패널: 3단 컴팩트 브릿지 카드 마운트, 가격·시술·상세 페이지 딥링크 검증
    const entryBadgeHost = entryFrame.locator('modoodoc-naver-bridge');
    await expect(entryBadgeHost).toHaveCount(1, { timeout: 10_000 });

    const entryCard = entryFrame.locator('modoodoc-naver-bridge .modoodoc-bridge-card');
    await expect(entryCard).toBeVisible({ timeout: 10_000 });
    await expect(entryCard.locator('.modoodoc-card-score')).toContainText('10.0');
    await expect(entryCard.locator('.modoodoc-card-reviews')).toContainText('10건');
    await expect(entryCard.locator('.modoodoc-card-tags')).toContainText('#스마일라식');
    await expect(entryCard.locator('.modoodoc-card-prices')).toContainText('209만원');
    await expect(entryCard.locator('.modoodoc-card-more')).toContainText('외 1개');

    const ctaHref = await entryCard.locator('a.modoodoc-card-cta').getAttribute('href');
    expect(ctaHref).toBe(MODOODOC_DETAIL_URL);

    // 3. Popup 비교함에서 평점·대표 시술 가격 요약 및 토글 OFF/ON 검증
    const extId = await resolveExtensionId(context);
    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extId}/popup.html`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(popupPage.locator('.history-name')).toContainText(['강남케이안과의원']);
    await expect(popupPage.locator('.history-summary-row')).toContainText('10.0');
    await expect(popupPage.locator('.history-summary-row')).toContainText('스마일라식 209만원');

    const toggleSwitch = popupPage.getByRole('switch');
    await expect(toggleSwitch).toHaveAttribute('aria-checked', 'true');
    await toggleSwitch.click();
    await expect(toggleSwitch).toHaveAttribute('aria-checked', 'false');

    await expect(entryFrame.locator('modoodoc-naver-bridge')).toHaveCount(0, {
      timeout: 5_000,
    });
    await expect(searchFrame.locator('modoodoc-naver-list-chip')).toHaveCount(0, {
      timeout: 5_000,
    });

    await toggleSwitch.click();
    await expect(entryFrame.locator('modoodoc-naver-bridge .modoodoc-bridge-card')).toHaveCount(1, {
      timeout: 5_000,
    });
    await expect(searchFrame.locator('modoodoc-naver-list-chip')).toHaveCount(2, {
      timeout: 5_000,
    });

    // 4. 미열람 검색 목록 칩 클릭 시 상세 페이지 직결 + 방문 상태('모두닥 리뷰' 유지 / Popup '모두닥 열어봄') 검증
    const adChip = searchFrame.locator(
      '[data-testid="ad-hospital"] modoodoc-naver-list-chip a.modoodoc-list-chip',
    );
    const [gsTab] = await Promise.all([context.waitForEvent('page'), adChip.click()]);
    await gsTab.waitForLoadState('domcontentloaded');
    expect(gsTab.url()).toBe(GS_DETAIL_URL);

    await expect(adChip).toHaveClass(/is-visited/, { timeout: 5_000 });
    await expect(adChip).toContainText('모두닥 리뷰');
    await expect(adChip).not.toContainText('리뷰 확인함');
    expect(await adChip.getAttribute('href')).toBe(GS_DETAIL_URL);

    // 5. 카드 [리뷰 보기 ↗] 클릭 시 상세 페이지 직결 + Popup/목록 칩 방문 표시 실시간 전환
    const [newTab] = await Promise.all([
      context.waitForEvent('page'),
      entryFrame.locator('modoodoc-naver-bridge a.modoodoc-card-cta').click(),
    ]);
    await newTab.waitForLoadState('domcontentloaded');
    expect(newTab.url()).toBe(MODOODOC_DETAIL_URL);

    await expect(popupPage.locator('.visited-pill').first()).toContainText('모두닥 열어봄');
    await expect(popupPage.locator('text=리뷰 확인함')).toHaveCount(0);

    const organicChip = searchFrame.locator(
      '[data-testid="organic-hospital"] modoodoc-naver-list-chip a.modoodoc-list-chip',
    );
    await expect(organicChip).toHaveClass(/is-visited/, { timeout: 5_000 });
    await expect(organicChip).toContainText('모두닥 리뷰');
    expect(await organicChip.getAttribute('href')).toBe(MODOODOC_DETAIL_URL);
  } finally {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
