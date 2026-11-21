import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { type BrowserContext, chromium, expect, test } from '@playwright/test';

const EXTENSION_PATH = resolve(import.meta.dirname, '../output/chrome-mv3');

const MODOODOC_DETAIL_SLUG = '드라마치과병원-경기-성남시';
const MODOODOC_DETAIL_URL = `https://www.modoodoc.com/hospital/17593/${encodeURIComponent(
  MODOODOC_DETAIL_SLUG,
)}`;

const MODOODOC_DRAMA_PAYLOAD = {
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
                        treatmentName: '오스템 임플란트',
                        normalPrice: { lowestPrice: 3_500_000, highestPrice: 3_500_000 },
                        eventPrice: { lowestPrice: 2_090_000, highestPrice: 2_090_000 },
                      },
                      {
                        treatmentName: '지르코니아 크라운',
                        normalPrice: { lowestPrice: 2_600_000, highestPrice: 2_600_000 },
                      },
                      {
                        treatmentName: '스케일링 정밀',
                        normalPrice: { lowestPrice: 2_800_000, highestPrice: 2_800_000 },
                      },
                    ],
                    hiraTreatmentPrices: [
                      {
                        treatmentGroup: { id: 10, name: '오스템 임플란트' },
                        lowestPrice: 3_500_000,
                        highestPrice: 3_500_000,
                      },
                    ],
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

const MODOODOC_TOKS_PAYLOAD = {
  props: {
    pageProps: {
      dehydratedState: {
        queries: [
          {
            queryKey: ['hospitalsWithQuery', '톡스앤필의원 강남본점'],
            state: {
              data: {
                hospitals: [
                  {
                    id: 22100,
                    name: '톡스앤필의원 강남본점',
                    slug: '톡스앤필의원-강남본점',
                    address: '서울 서초구 서초동 1303',
                    totalScore: 9.0,
                    numOfReview: 210,
                    treatments: [{ name: '보톡스', count: 80 }],
                    treatmentPrices: [
                      {
                        treatmentName: '인모드 FX 풀페이스',
                        normalPrice: { lowestPrice: 240_000, highestPrice: 240_000 },
                        eventPrice: { lowestPrice: 185_000, highestPrice: 185_000 },
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

const UNNI_DRAMA_SEARCH_HTML = `<!doctype html><html><head><meta charset="utf-8" /></head><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
  {
    props: {
      pageProps: {
        hospitals: [
          {
            id: 9001,
            name: '드라마치과병원',
            rating: 9.5,
            reviewCount: 120,
            sido: '경기',
            districtName: '정자역',
          },
        ],
      },
    },
  },
)}</script></body></html>`;

const UNNI_DRAMA_DETAIL_HTML = `<!doctype html><html><head><meta charset="utf-8" /></head><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
  {
    props: {
      pageProps: {
        data: {
          hospital: {
            hospitalId: 9001,
            name: '드라마치과병원',
            location: {
              sido: '경기',
              sigungu: '성남시',
              address: '경기 성남시 분당구 정자일로 198',
            },
            statistic: { rating: 9.5, reviewCount: 120 },
          },
          events: [
            {
              id: 73535,
              title: '오스템 임플란트 특가 (VAT별도)',
              price: {
                originalAmount: 3_000_000,
                discountedAmount: 1_950_000,
                discountPercentage: 35,
              },
              includeVat: false,
            },
            {
              id: 73536,
              title: '세라믹 인레이',
              price: {
                originalAmount: 2_900_000,
                discountedAmount: 2_900_000,
                discountPercentage: 0,
              },
              includeVat: true,
            },
          ],
        },
      },
    },
  },
)}</script></body></html>`;

const UNNI_TOKS_SEARCH_HTML = `<!doctype html><html><head><meta charset="utf-8" /></head><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
  {
    props: {
      pageProps: {
        hospitals: [
          {
            id: 3702,
            name: '톡스앤필의원-강남본점',
            rating: 9.1,
            reviewCount: 1344,
            sido: '서울',
            districtName: '강남역',
          },
        ],
      },
    },
  },
)}</script></body></html>`;

const UNNI_TOKS_DETAIL_HTML = `<!doctype html><html><head><meta charset="utf-8" /></head><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(
  {
    props: {
      pageProps: {
        data: {
          hospital: {
            hospitalId: 3702,
            name: '톡스앤필의원-강남본점',
            location: { sido: '서울', sigungu: '서초구', address: '서울 서초구 강남대로 415' },
            statistic: { rating: 9.1, reviewCount: 1344 },
          },
          events: [
            {
              id: 79224,
              title: '포텐자 모공 1회',
              price: { originalAmount: 250_000, discountedAmount: 218_900, discountPercentage: 12 },
              includeVat: true,
            },
          ],
        },
      },
    },
  },
)}</script></body></html>`;

const YEOSHIN_DRAMA_SEARCH_JSON = {
  code: 'SUCCESS',
  payload: {
    hospitals: [{ id: 4401, name: '드라마치과병원', address: '경기도 성남시 분당구 정자동' }],
    hospitalStats: [{ hospitalId: 4401, starPointAverage: 9.1, reviewCount: 84 }],
  },
};

const YEOSHIN_DRAMA_EVENTS_JSON = {
  code: 'SUCCESS',
  payload: {
    salesEvents: [
      {
        id: 5501,
        hospitalId: 4401,
        name: '지르코니아 크라운 이벤트',
        representativeSalesProductId: 6601,
        trash: false,
        use: true,
        view: true,
      },
    ],
    salesProducts: [
      {
        id: 6601,
        salesEventId: 5501,
        currency: 'KRW',
        name: '지르코니아 크라운',
        price: 2_800_000,
        discountPrice: 2_500_000,
        oneTimeRegularPrice: 2_800_000,
        view: true,
      },
    ],
  },
};

const YEOSHIN_TOKS_SEARCH_JSON = {
  code: 'SUCCESS',
  payload: {
    hospitals: [{ id: 4439, name: '톡스앤필의원(강남본점)', address: '서울특별시 서초구 서초동' }],
    hospitalStats: [{ hospitalId: 4439, starPointAverage: 9.2, reviewCount: 6309 }],
  },
};

const YEOSHIN_TOKS_EVENTS_JSON = {
  code: 'SUCCESS',
  payload: {
    salesEvents: [
      {
        id: 18757,
        hospitalId: 4439,
        name: '코어톡스 50U',
        representativeSalesProductId: 299141,
        trash: false,
        use: true,
        view: true,
      },
    ],
    salesProducts: [
      {
        id: 299141,
        salesEventId: 18757,
        currency: 'KRW',
        name: '사각턱 코어톡스 50U',
        price: 180_000,
        discountPrice: 150_000,
        oneTimeRegularPrice: 180_000,
        view: true,
      },
    ],
  },
};

const BABITALK_TOKS_SEARCH_JSON = {
  data: [
    {
      id: 4845,
      name: '톡스앤필의원(강남본점)',
      region: '서울 강남역',
      address: '서울 서초구 강남대로 415',
      star_avg: 4.9,
      review_count: 404,
    },
  ],
};

const BABITALK_TOKS_EVENTS_JSON = {
  data: [
    {
      id: 77620,
      hid: 4845,
      name: '리프테라2 리프팅 300샷',
      sub_category_name: '리프테라',
      price: 240_000,
      discount_price: 120_000,
      include_vat: true,
      is_hot: 1,
    },
  ],
};

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
        <li class="DWs4Q z23xh" data-testid="toks-clinic">
          <div class="IPtqD">
            <div class="uMPdj">
              <a href="#" class="uD1F4 gADnZ">
                <span class="q2LdB">톡스앤필의원 강남본점</span>
                <span class="lHBM6">피부과</span>
              </a>
            </div>
            <div class="_XGt_"><span class="suKMR">서울 서초구 서초동</span></div>
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

function wrapNextDataHtml(payload: unknown): string {
  return `<!doctype html><html><head><meta charset="utf-8" /></head><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(payload)}</script></body></html>`;
}

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

test('다중 플랫폼 수집, 부가세 포함 최저가순 정렬, 지도 내 비교 드로어, /photo 릴레이 및 Popup 토글을 검증한다', async () => {
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

    for (const pattern of [
      'https://www.modoodoc.com/**',
      'https://unni.app/**',
      'https://www.yeoshin.co.kr/**',
      'https://babitalk.com/**',
    ]) {
      await context.route(pattern, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: `<html><body><h1>${route.request().url()}</h1></body></html>`,
        });
      });
    }

    let [bgWorker] = context.serviceWorkers();
    if (!bgWorker) {
      bgWorker = await context.waitForEvent('serviceworker', { timeout: 10_000 });
    }

    const fixtures = {
      modoodocDramaHtml: wrapNextDataHtml(MODOODOC_DRAMA_PAYLOAD),
      modoodocToksHtml: wrapNextDataHtml(MODOODOC_TOKS_PAYLOAD),
      unniDramaSearchHtml: UNNI_DRAMA_SEARCH_HTML,
      unniDramaDetailHtml: UNNI_DRAMA_DETAIL_HTML,
      unniToksSearchHtml: UNNI_TOKS_SEARCH_HTML,
      unniToksDetailHtml: UNNI_TOKS_DETAIL_HTML,
      yeoshinDramaSearchJson: YEOSHIN_DRAMA_SEARCH_JSON,
      yeoshinDramaEventsJson: YEOSHIN_DRAMA_EVENTS_JSON,
      yeoshinToksSearchJson: YEOSHIN_TOKS_SEARCH_JSON,
      yeoshinToksEventsJson: YEOSHIN_TOKS_EVENTS_JSON,
      babitalkToksSearchJson: BABITALK_TOKS_SEARCH_JSON,
      babitalkToksEventsJson: BABITALK_TOKS_EVENTS_JSON,
    };

    // MV3 서비스 워커의 fetch는 Playwright context.route를 우회하므로 워커 내부에서 결정론적으로 모킹·계측
    await bgWorker.evaluate((fx) => {
      const g = globalThis as typeof globalThis & { __fetchQueries?: string[] };
      g.__fetchQueries = [];
      const origFetch = globalThis.fetch.bind(globalThis);
      globalThis.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

        if (url.includes('www.modoodoc.com/hospitals/query-search')) {
          g.__fetchQueries?.push(url);
          const body = url.includes(encodeURIComponent('톡스앤필'))
            ? fx.modoodocToksHtml
            : fx.modoodocDramaHtml;
          return new Response(body, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        if (url.includes('unni.app/search')) {
          g.__fetchQueries?.push(url);
          const body = url.includes(encodeURIComponent('톡스앤필'))
            ? fx.unniToksSearchHtml
            : fx.unniDramaSearchHtml;
          return new Response(body, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        if (url.includes('unni.app/hospitals/9001')) {
          g.__fetchQueries?.push(url);
          return new Response(fx.unniDramaDetailHtml, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        if (url.includes('unni.app/hospitals/3702')) {
          g.__fetchQueries?.push(url);
          return new Response(fx.unniToksDetailHtml, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        }
        if (url.includes('api.yeoshin.co.kr/hospitals/search')) {
          g.__fetchQueries?.push(url);
          const body = url.includes(encodeURIComponent('톡스앤필'))
            ? fx.yeoshinToksSearchJson
            : fx.yeoshinDramaSearchJson;
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('api.yeoshin.co.kr/hospitals/4401/sales-events')) {
          g.__fetchQueries?.push(url);
          return new Response(JSON.stringify(fx.yeoshinDramaEventsJson), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('api.yeoshin.co.kr/hospitals/4439/sales-events')) {
          g.__fetchQueries?.push(url);
          return new Response(JSON.stringify(fx.yeoshinToksEventsJson), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('web-api.babitalk.com/v2/search/hospitals')) {
          g.__fetchQueries?.push(url);
          return new Response(JSON.stringify(fx.babitalkToksSearchJson), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('web-api.babitalk.com/v2/hospitals/4845/events')) {
          g.__fetchQueries?.push(url);
          return new Response(JSON.stringify(fx.babitalkToksEventsJson), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return origFetch(input, init);
      };
    }, fixtures);

    const getWorkerQueries = (): Promise<string[]> =>
      bgWorker.evaluate(() => {
        const g = globalThis as typeof globalThis & { __fetchQueries?: string[] };
        return g.__fetchQueries ?? [];
      });

    const mapPage = await context.newPage();
    await test.step('1. 검색 목록 칩 마운트, ↗ 미포함, 초기 외부 요청 0건 확인', async () => {
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

      const dramaChipButton = searchFrame.locator(
        '[data-testid="drama-hospital"] medi-bridge-list-chip button.mb-list-chip',
      );
      await expect(dramaChipButton).toContainText('가격 비교');
      await expect(dramaChipButton).not.toContainText('↗');
      expect(await getWorkerQueries()).toHaveLength(0);
    });

    const searchFrame = mapPage.frame({ name: 'searchIframe' });
    expect(searchFrame).not.toBeNull();
    if (!searchFrame) return;

    await test.step('2. 목록 가격 비교 클릭 시 새 탭 열리지 않고 지도 내 드로어가 열리며 부가세 토글로 최저가 순위가 갱신된다', async () => {
      let unexpectedTabOpened = false;
      const onPage = () => {
        unexpectedTabOpened = true;
      };
      context.on('page', onPage);

      await searchFrame
        .locator('[data-testid="drama-hospital"] medi-bridge-list-chip button.mb-list-chip')
        .click();

      const drawer = searchFrame.locator('medi-bridge-compare-drawer .mb-compare-drawer');
      await expect(drawer).toBeVisible({ timeout: 10_000 });
      await expect(drawer.locator('.mb-offer-row')).toHaveCount(7, { timeout: 10_000 });
      expect(unexpectedTabOpened).toBe(false);
      context.off('page', onPage);

      // 부가세 포함가(ON) 기준: 1위 모두닥 2,090,000원, 2위 강남언니 2,145,000원
      const firstRowVatOn = drawer.locator('.mb-offer-row').nth(0);
      await expect(firstRowVatOn.locator('.mb-platform-pill')).toHaveText('모두닥');
      await expect(firstRowVatOn.locator('.mb-offer-price')).toContainText('2,090,000원');

      const secondRowVatOn = drawer.locator('.mb-offer-row').nth(1);
      await expect(secondRowVatOn.locator('.mb-platform-pill')).toHaveText('강남언니');
      await expect(secondRowVatOn.locator('.mb-offer-price')).toContainText('2,145,000원');

      // 부가세 포함가 스위치 OFF -> 플랫폼 표기가 기준: 1위 강남언니 1,950,000원
      await drawer.getByRole('switch').click();
      const firstRowVatOff = drawer.locator('.mb-offer-row').nth(0);
      await expect(firstRowVatOff.locator('.mb-platform-pill')).toHaveText('강남언니');
      await expect(firstRowVatOff.locator('.mb-offer-price')).toContainText('1,950,000원');

      // 다시 부가세 포함가 ON 복구
      await drawer.getByRole('switch').click();
      await expect(drawer.locator('.mb-offer-row').nth(0).locator('.mb-platform-pill')).toHaveText(
        '모두닥',
      );
    });

    await test.step('3. 드로어에서 강남언니 오퍼 클릭 시 모두닥이 아닌 강남언니 URL로 열리고 목록 칩에 최저가가 반영된다', async () => {
      const drawer = searchFrame.locator('medi-bridge-compare-drawer .mb-compare-drawer');
      const gangnamRow = drawer.locator('.mb-offer-row[data-platform="gangnamunni"]').first();

      const [newTab] = await Promise.all([
        context.waitForEvent('page', { timeout: 10_000 }),
        gangnamRow.click(),
      ]);
      await newTab.waitForLoadState('domcontentloaded');
      expect(newTab.url()).toBe('https://unni.app/events/73535');
      await newTab.close();

      const dramaChip = searchFrame.locator(
        '[data-testid="drama-hospital"] medi-bridge-list-chip button.mb-list-chip',
      );
      await expect(dramaChip).toHaveClass(/is-visited/, { timeout: 5_000 });
      await expect(dramaChip).toContainText('최저 2,090,000원');
    });

    await test.step('4. 피부과 병원 클릭 시 바비톡 포함 4개 플랫폼이 수집·최저가순 정렬된다', async () => {
      await searchFrame
        .locator('[data-testid="toks-clinic"] medi-bridge-list-chip button.mb-list-chip')
        .click();

      const drawer = searchFrame.locator('medi-bridge-compare-drawer .mb-compare-drawer');
      await expect(drawer).toContainText('톡스앤필의원 강남본점', { timeout: 10_000 });
      await expect(drawer.locator('.mb-offer-row')).toHaveCount(4, { timeout: 10_000 });
      // 바비톡 120,000원 < 여신티켓 150,000원 < 모두닥 185,000원 < 강남언니 218,900원
      await expect(drawer.locator('.mb-offer-row').nth(0).locator('.mb-platform-pill')).toHaveText(
        '바비톡',
      );
      await expect(drawer.locator('.mb-offer-row').nth(0).locator('.mb-offer-price')).toContainText(
        '120,000원',
      );
      await expect(drawer.locator('.mb-offer-row').nth(1).locator('.mb-platform-pill')).toHaveText(
        '여신티켓',
      );
      await expect(drawer.locator('.mb-offer-row').nth(2).locator('.mb-platform-pill')).toHaveText(
        '모두닥',
      );
      await expect(drawer.locator('.mb-offer-row').nth(3).locator('.mb-platform-pill')).toHaveText(
        '강남언니',
      );

      await drawer.getByRole('button', { name: '가격 비교 닫기' }).click();
      await expect(searchFrame.locator('medi-bridge-compare-drawer')).toHaveCount(0);
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

    const entryFrame = mapPage.frame({ name: 'entryIframe' });
    expect(entryFrame).not.toBeNull();
    if (!entryFrame) return;

    await test.step('5. /photo 상세 카드가 릴레이 지역 힌트로 최저가순 정렬·인라인 펼치기를 제공한다', async () => {
      const entryCard = entryFrame.locator('medi-bridge-entry-card .mb-bento-card');
      await expect(entryCard).toBeVisible({ timeout: 10_000 });

      const queries = await getWorkerQueries();
      expect(queries.some((q) => q.includes('www.modoodoc.com'))).toBe(true);
      expect(queries.some((q) => q.includes('unni.app'))).toBe(true);
      expect(queries.some((q) => q.includes('api.yeoshin.co.kr'))).toBe(true);
      expect(queries.some((q) => q.includes('web-api.babitalk.com'))).toBe(true);

      await expect(entryCard.locator('.mb-offer-row')).toHaveCount(5);
      await expect(
        entryCard.locator('.mb-offer-row').nth(0).locator('.mb-offer-price'),
      ).toContainText('2,090,000원');
      await expect(
        entryCard.locator('.mb-offer-row').nth(0).locator('.mb-discount-text'),
      ).toContainText('-40%');

      // 카드 내 펼치기 클릭 시 외부 탭 없이 전체 7개 행 노출
      await entryCard.locator('button.mb-more-link').click();
      await expect(entryCard.locator('.mb-offer-row')).toHaveCount(7);

      const modoodocPlatformLink = entryCard.locator('.mb-platform-summary-link').first();
      expect(await modoodocPlatformLink.getAttribute('href')).toBe(MODOODOC_DETAIL_URL);
    });

    const extId = await test.step('6. 확장 ID 추출 및 Popup 이력·토글 연동 검증', async () => {
      const workerHost = new URL(bgWorker.url()).host;
      return workerHost || resolveExtensionId(context);
    });

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extId}/popup.html`, {
      waitUntil: 'domcontentloaded',
    });

    await expect(popupPage.locator('.history-name')).toContainText(['드라마치과병원']);
    await expect(popupPage.locator('.status-text')).toContainText(
      '네이버 지도 실시간 병원 가격·리뷰 연동 중',
    );

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
  } finally {
    await context.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
