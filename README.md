# MEDI BRIDGE (메디 브릿지)

네이버 지도 위에서 건강보험심사평가원(심평원) 비급여 진료비 신고 정가와 여러 미용·진료 플랫폼의 이벤트 가격을 한 화면에서 대조하고, 자체 반응형 웹으로도 병원별 실질 결제 금액을 비교할 수 있는 Chrome Extension(MV3) + Next.js 모노레포 프로젝트입니다.

- **라이브 비교 웹**: [medi-bridge.seungwoo7050.workers.dev](https://medi-bridge.seungwoo7050.workers.dev) (`/` 가격 비교 보드 · `/intro` VAT 시뮬레이터 · `/privacy` 개인정보처리방침)

![메디 브릿지 웹 및 Medical Bento 가격 비교 화면](./assets/preview.png)

---

## 왜 단일 브릿지에서 통합 비교기로 전환했는가

기존 `modoodoc-naver-bridge`는 네이버 지도에서 모두닥 상세 페이지로 바로 넘겨 주는 단일 플랫폼 브릿지였습니다. 하지만 실제 병원 가격 비교를 할 때는 모두닥 외에도 강남언니, 여신티켓, 바비톡, 굿닥의 이벤트 공지를 번갈아 확인해야 하고, 광고 표기 가격에 부가가치세(VAT 10%) 포함 여부가 제각각 섞여 있어 실제 결제 기준 순위를 한눈에 가늠하기 어렵습니다.

`MEDI BRIDGE`는 이 문제를 해결하기 위해 세 가지를 중심에 두고 확장했습니다.

1. **기준선과 이벤트가의 동시 비교**: 모든 병·의원이 법적으로 공개하는 심평원 비급여 정가를 기준선으로 두고, 5개 플랫폼(모두닥, 강남언니, 여신티켓, 바비톡, 굿닥)의 이벤트·할인가를 같은 표준 시술 키 아래 정렬합니다.
2. **VAT 10% 실질가 정규화**: `vatIncluded: false`로 게시된 이벤트가는 `1.1`을 곱해 VAT 포함 실질 결제 금액으로 환산하고, 사용자가 상세 카드와 드로어, 웹 시뮬레이터에서 `VAT 포함` 토글로 순위 변화를 즉시 확인할 수 있습니다.
3. **네이버 지도 오버레이 + 자체 반응형 웹 이중 접점**: 지도 탐색 중에는 확장프로그램의 Shadow DOM Bento 카드와 반경 최저가 드로어가 바로 동작하고, 검색·공유·상세 비교는 Next.js 웹 앱과 정규화 API(`/api/v1/*`)가 담당합니다.

---

## 주요 기능

### 1. Chrome Extension MV3 (`apps/extension`)
- **상세 패널 Medical Bento 비교 카드 (`#entryIframe`)**: 심평원 정가 대비 할인율 배지, `VAT 포함 / 표기가` 전환 스위치, 플랫폼별 실질 최저가 순위표(1위 하이라이트) 및 예약처 직행 링크를 Shadow DOM 내부에 독립 마운트합니다.
- **검색 목록 Ghost 칩 및 반경 최저가 드로어 (`#searchIframe`)**: 목록 초기 로딩에서는 외부 API를 호출하지 않고(자동 호출 0건) 심평원 기준 칩만 붙이며, 사용자가 좌측 하단 플로팅 드로어를 열 때만 반경 내 병원을 온디맨드로 조회해 최저가순·할인율순·평점순으로 정렬합니다.
- **Dual-Source 조회 및 장애 안전성**: 백엔드 API(`/api/v1/hospitals/match`) 조회를 우선 시도하되 실패 시 브라우저 안전 시드(`@medi-bridge/db/seed`)와 모두닥 SSR 파서(`__NEXT_DATA__`) 폴백으로 이어집니다. `parse_error` 응답은 캐시에 저장하지 않고, 동일 병원 중복 요청은 `inFlight` 맵으로 합치며, 스토리지 기록은 `enqueueWrite` 직렬 큐로 경합을 막습니다.
- **Popup 비교함 및 툴바 상태 아이콘**: 오버레이 ON/OFF 토글에 따라 확장 툴바 아이콘을 활성/비활성 리소스로 전환하고, 최근 본 병원 최대 20건 비교함과 라이브 비교 웹(`https://medi-bridge.seungwoo7050.workers.dev` 및 `/intro`) 바로가기를 제공합니다. (`WXT_PUBLIC_WEB_URL` 환경 변수로 운영 도메인/로컬 도메인을 전환합니다.)

### 2. 자체 비교 웹 및 API (`apps/web`)
- **반응형 비교 보드 (`/`)**: 진료과·지역 필터, 검색어 입력, VAT 포함 토글, 좌표 핀 뷰어, 심평원 정가 대비 플랫폼 최저가 카드를 제공합니다.
- **병원 상세 (`/hospitals/[slug]`) 및 홍보 시뮬레이터 (`/intro`)**: 병원별 전체 시술·플랫폼 비교표와 VAT 별도 광고가 실질가 순위에서 어떻게 뒤집히는지 체험할 수 있는 인터랙티브 시뮬레이터, 확장프로그램 권한 안내(`/privacy`)를 제공합니다.
- **정규화 조회 API (`/api/v1/*`)**:
  - `POST /api/v1/hospitals/match`: 병원명, 지역 힌트, 좌표, VAT 기준을 받아 단일 병원 매칭 결과 반환
  - `POST /api/v1/hospitals/bounds`: 현재 지도 반경 내 병원 배열과 정렬 기준(`lowest_price`, `discount_rate`, `rating`)을 받아 비교 순위 반환
  - `GET /api/v1/treatments`: 표준 시술 카테고리 및 키워드 목록 반환

---

## 모노레포 구조

```text
medi-bridge/
├── apps/
│   ├── extension/        # WXT + React 19 Chrome Extension MV3 (Shadow DOM UI, Background SW, Popup)
│   └── web/              # Next.js 16 App Router 웹 비교 보드, /intro 시뮬레이터, /api/v1/* 엔드포인트
├── packages/
│   ├── shared/           # Zod 스키마, VAT +10% 정규화, 표준 시술 키, ykiho·좌표(Haversine) 매칭기
│   ├── parsers/          # 심평원(HIRA) 공공데이터·모두닥 SSR 파서, 5개 플랫폼 오퍼 정규화기
│   ├── db/               # Drizzle PostgreSQL 스키마, 브라우저 안전 시드(@medi-bridge/db/seed), Repository
│   └── ui/               # Medical Bento 디자인 토큰(Deep Indigo / Mint / Slate) 및 공용 배지 컴포넌트
└── assets/               # README 프리뷰 이미지
```

---

## 로컬 실행, 엣지 배포 및 Chrome 웹스토어 패키징

사전 요구사항: Node.js 22+, `pnpm`

```bash
# 1. 의존성 설치
pnpm install

# 2. 전체 패키지 빌드 (확장프로그램 output/chrome-mv3 + Next.js 프로덕션 빌드)
pnpm build
```

확장프로그램은 기본으로 운영 Cloudflare Workers 도메인(`https://medi-bridge.seungwoo7050.workers.dev`)을 참조합니다. 로컬 Next.js API 서버와 붙여 테스트할 때만 `WXT_PUBLIC_WEB_URL=http://localhost:3000`을 지정합니다.

```bash
# Next.js 비교 웹 개발 서버 (기본 http://localhost:3000)
pnpm dev:web

# Chrome Extension WXT 개발 모드 (로컬 API 연결)
WXT_PUBLIC_WEB_URL=http://localhost:3000 pnpm dev:ext

# Cloudflare Workers 정적 웹 + 엣지 API(/api/v1/*) 번들 빌드 및 배포
pnpm --filter @medi-bridge/web run build:cf
pnpm --filter @medi-bridge/web run deploy:cf
```

빌드된 확장프로그램을 Chrome에 로드하거나 웹스토어 제출용 아카이브로 묶는 순서:

1. 주소창에서 `chrome://extensions` 로 이동합니다.
2. 우측 상단 **개발자 모드**를 켭니다.
3. **압축해제된 확장 프로그램을 로드합니다**를 클릭하고 `apps/extension/output/chrome-mv3` 디렉터리를 선택합니다.
4. [네이버 지도](https://map.naver.com)에서 치과, 안과, 피부과 등을 검색해 상세 비교 카드와 좌측 하단 반경 최저가 보드를 확인합니다.

```bash
# Chrome 웹스토어 제출용 압축 아카이브 생성 (localhost 권한 제외, apps/extension/output/medi-bridgeextension-1.0.0-chrome.zip)
pnpm zip:ext
```

---

## 검증 명령어

```bash
# 전체 6개 워크스페이스 TypeScript 타입 체크 + Biome 린트/포맷 + Vitest 단위 테스트
pnpm verify

# 빌드된 Chrome Extension(Shadow DOM, VAT 토글, 반경 드로어, Popup) + Next.js 웹 Playwright E2E
pnpm test:e2e
```
