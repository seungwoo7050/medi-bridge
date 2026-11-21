import {
  parseBabitalkHospitalEvents,
  parseBabitalkHospitalSearch,
  parseGangnamunniHospitalDetail,
  parseGangnamunniSearchCandidates,
  parseModoodocSearchResult,
  parseYeoshinHospitalSearch,
  parseYeoshinSalesEvents,
} from '@medi-bridge/parsers';
import {
  type CollectablePlatformSource,
  type HospitalComparisonResult,
  normalizeCompareName,
  normalizeDepartmentCategory,
  PLATFORM_LABELS,
  type PlatformSummaryItem,
  type RawPlatformOffer,
  resolveTargetPlatformsForDepartment,
  type TreatmentCategory,
} from '@medi-bridge/shared';
import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import {
  attachComparisonToRecentHospital,
  getBridgeState,
  getCachedHospitalComparison,
  markHospitalClicked,
  setCachedHospitalComparison,
  subscribeBridgeEnabled,
} from '../domain/bridgeStorage';
import { applyHistoryMutation } from '../domain/historyGateway';
import {
  buildHospitalKey,
  buildModoodocSearchUrl,
  extractRegionHintFromAddress,
  normalizeHospitalName,
} from '../domain/modoodocUrl';
import type {
  FetchHospitalComparisonRequest,
  FetchHospitalComparisonResponse,
  HistoryMutation,
  MutateHistoryRequest,
  OpenPlatformTargetRequest,
  OpenPlatformTargetResponse,
  RegisterSearchRegionHintsRequest,
} from '../types/place';

const MAX_SEARCH_REGION_HINTS = 300;
const PLATFORM_TIMEOUT_MS = 5000;

const ACTIVE_ICON_PATHS = {
  16: 'icon/active-16.png',
  32: 'icon/active-32.png',
  48: 'icon/active-48.png',
  128: 'icon/active-128.png',
} as const;

const INACTIVE_ICON_PATHS = {
  16: 'icon/inactive-16.png',
  32: 'icon/inactive-32.png',
  48: 'icon/inactive-48.png',
  128: 'icon/inactive-128.png',
} as const;

async function syncToolbarActionIcon(enabled: boolean): Promise<void> {
  try {
    await browser.action?.setIcon({
      path: enabled ? ACTIVE_ICON_PATHS : INACTIVE_ICON_PATHS,
    });
  } catch {
    // 테스트·헤드리스 환경에서 action API 미지원 시 무시
  }
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFetchHospitalComparisonRequest(value: unknown): value is FetchHospitalComparisonRequest {
  return (
    isRecordObject(value) &&
    value.type === 'FETCH_HOSPITAL_COMPARISON' &&
    typeof value.hospitalName === 'string' &&
    typeof value.regionHint === 'string' &&
    typeof value.department === 'string'
  );
}

function isRegisterSearchRegionHintsRequest(
  value: unknown,
): value is RegisterSearchRegionHintsRequest {
  return (
    isRecordObject(value) &&
    value.type === 'REGISTER_SEARCH_REGION_HINTS' &&
    Array.isArray(value.items)
  );
}

function isOpenPlatformTargetRequest(value: unknown): value is OpenPlatformTargetRequest {
  return (
    isRecordObject(value) &&
    value.type === 'OPEN_PLATFORM_TARGET' &&
    typeof value.hospitalName === 'string' &&
    typeof value.regionHint === 'string' &&
    typeof value.department === 'string' &&
    typeof value.targetUrl === 'string' &&
    value.targetUrl.startsWith('https://')
  );
}

function isHistoryMutation(value: unknown): value is HistoryMutation {
  if (!isRecordObject(value)) {
    return false;
  }
  switch (value.op) {
    case 'view':
    case 'click':
      return (
        typeof value.name === 'string' &&
        typeof value.department === 'string' &&
        typeof value.regionHint === 'string'
      );
    case 'remove':
      return typeof value.id === 'string';
    case 'clear':
      return true;
    case 'attach':
      return (
        typeof value.name === 'string' &&
        typeof value.regionHint === 'string' &&
        isRecordObject(value.summary)
      );
    case 'attach_comparison':
      return (
        typeof value.name === 'string' &&
        typeof value.regionHint === 'string' &&
        isRecordObject(value.comparison)
      );
    default:
      return false;
  }
}

function isMutateHistoryRequest(value: unknown): value is MutateHistoryRequest {
  return (
    isRecordObject(value) && value.type === 'MUTATE_HISTORY' && isHistoryMutation(value.mutation)
  );
}

const inFlightComparison = new Map<string, Promise<FetchHospitalComparisonResponse>>();
const searchRegionHints = new Map<string, string>();

function registerSearchRegionHints(items: readonly unknown[]): void {
  for (const raw of items) {
    if (!isRecordObject(raw)) continue;
    if (typeof raw.name !== 'string' || typeof raw.regionHint !== 'string') continue;
    const cleanName = normalizeCompareName(normalizeHospitalName(raw.name));
    const cleanRegion = extractRegionHintFromAddress(raw.regionHint);
    if (!cleanName || !cleanRegion) continue;
    searchRegionHints.delete(cleanName);
    searchRegionHints.set(cleanName, cleanRegion);
    while (searchRegionHints.size > MAX_SEARCH_REGION_HINTS) {
      const oldest = searchRegionHints.keys().next().value;
      if (oldest === undefined) break;
      searchRegionHints.delete(oldest);
    }
  }
}

function resolveEffectiveRegion(hospitalName: string, regionHint: string): string {
  const direct = extractRegionHintFromAddress(regionHint);
  if (direct) {
    return direct;
  }
  const key = normalizeCompareName(normalizeHospitalName(hospitalName));
  return searchRegionHints.get(key) ?? '';
}

interface PlatformCollectResult {
  readonly summary: PlatformSummaryItem;
  readonly offers: readonly RawPlatformOffer[];
  readonly hiraOffers?: readonly RawPlatformOffer[];
  readonly topTreatments?: readonly { readonly name: string; readonly count: number }[];
}

function buildFailedSummary(
  platform: CollectablePlatformSource,
  status: 'not_found' | 'error',
): PlatformCollectResult {
  return {
    summary: {
      platform,
      platformLabel: PLATFORM_LABELS[platform],
      status,
      hospitalUrl: null,
      rating: null,
      ratingScale: platform === 'babitalk' ? 5 : 10,
      reviewCount: 0,
      offerCount: 0,
    },
    offers: [],
  };
}

async function fetchTextWithTimeout(url: string, accept: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(PLATFORM_TIMEOUT_MS),
      headers: { Accept: accept },
    });
    if (!res.ok) {
      return null;
    }
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(PLATFORM_TIMEOUT_MS),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

async function collectModoodoc(
  hospitalName: string,
  effectiveRegion: string,
  categoryHint: TreatmentCategory,
): Promise<PlatformCollectResult> {
  const searchUrl = buildModoodocSearchUrl(hospitalName, effectiveRegion);
  const html = await fetchTextWithTimeout(searchUrl, 'text/html');
  if (html === null) {
    return buildFailedSummary('modoodoc', 'error');
  }

  const parsed = parseModoodocSearchResult(html, hospitalName, effectiveRegion, categoryHint);
  if (parsed.kind === 'parse_error') {
    return buildFailedSummary('modoodoc', 'error');
  }
  if (parsed.kind === 'not_found') {
    return buildFailedSummary('modoodoc', 'not_found');
  }

  const modoodocOffers = parsed.summary.modoodocOffers ?? [];
  const hiraOffers = parsed.summary.hiraOffers ?? [];

  return {
    summary: {
      platform: 'modoodoc',
      platformLabel: PLATFORM_LABELS.modoodoc,
      status: 'matched',
      hospitalUrl: parsed.summary.detailUrl,
      rating: parsed.summary.totalScore,
      ratingScale: 10,
      reviewCount: parsed.summary.reviewCount,
      offerCount: modoodocOffers.length,
    },
    offers: modoodocOffers,
    hiraOffers,
    topTreatments: parsed.summary.topTreatments,
  };
}

async function collectGangnamunni(
  hospitalName: string,
  effectiveRegion: string,
  categoryHint: TreatmentCategory,
): Promise<PlatformCollectResult> {
  const cleanName = normalizeHospitalName(hospitalName);
  const searchUrl = `https://unni.app/search?q=${encodeURIComponent(cleanName)}`;
  const searchHtml = await fetchTextWithTimeout(searchUrl, 'text/html');
  if (searchHtml === null) {
    return buildFailedSummary('gangnamunni', 'error');
  }

  const candidatesRes = parseGangnamunniSearchCandidates(searchHtml, hospitalName, effectiveRegion);
  if (candidatesRes.kind === 'parse_error') {
    return buildFailedSummary('gangnamunni', 'error');
  }
  if (candidatesRes.kind === 'not_found') {
    return buildFailedSummary('gangnamunni', 'not_found');
  }

  let sawError = false;
  for (const candidate of candidatesRes.candidates) {
    const detailHtml = await fetchTextWithTimeout(
      `https://unni.app/hospitals/${candidate.id}`,
      'text/html',
    );
    if (detailHtml === null) {
      sawError = true;
      continue;
    }

    const detailRes = parseGangnamunniHospitalDetail(
      detailHtml,
      hospitalName,
      effectiveRegion,
      categoryHint,
    );
    if (detailRes.kind === 'parse_error') {
      sawError = true;
      continue;
    }
    if (detailRes.kind === 'found') {
      const { summary } = detailRes;
      return {
        summary: {
          platform: 'gangnamunni',
          platformLabel: PLATFORM_LABELS.gangnamunni,
          status: 'matched',
          hospitalUrl: summary.detailUrl,
          rating: summary.rating,
          ratingScale: 10,
          reviewCount: summary.reviewCount,
          offerCount: summary.offers.length,
        },
        offers: summary.offers,
      };
    }
  }

  return buildFailedSummary('gangnamunni', sawError ? 'error' : 'not_found');
}

async function collectYeoshin(
  hospitalName: string,
  effectiveRegion: string,
  categoryHint: TreatmentCategory,
): Promise<PlatformCollectResult> {
  const cleanName = normalizeHospitalName(hospitalName);
  let searchJson: unknown;
  try {
    searchJson = await fetchJsonWithTimeout(
      `https://api.yeoshin.co.kr/hospitals/search?query=${encodeURIComponent(cleanName)}`,
    );
  } catch {
    return buildFailedSummary('yeoshin', 'error');
  }

  const hospRes = parseYeoshinHospitalSearch(searchJson, hospitalName, effectiveRegion);
  if (hospRes.kind === 'parse_error') {
    return buildFailedSummary('yeoshin', 'error');
  }
  if (hospRes.kind === 'not_found') {
    return buildFailedSummary('yeoshin', 'not_found');
  }

  let eventsJson: unknown;
  try {
    eventsJson = await fetchJsonWithTimeout(
      `https://api.yeoshin.co.kr/hospitals/${hospRes.hospital.hospitalId}/sales-events`,
    );
  } catch {
    return buildFailedSummary('yeoshin', 'error');
  }

  const eventsRes = parseYeoshinSalesEvents(eventsJson, hospRes.hospital.hospitalId, categoryHint);
  if (eventsRes.kind === 'parse_error') {
    return buildFailedSummary('yeoshin', 'error');
  }

  const offers = eventsRes.kind === 'found' ? eventsRes.offers : [];
  return {
    summary: {
      platform: 'yeoshin',
      platformLabel: PLATFORM_LABELS.yeoshin,
      status: 'matched',
      hospitalUrl: hospRes.hospital.detailUrl,
      rating: hospRes.hospital.rating,
      ratingScale: 10,
      reviewCount: hospRes.hospital.reviewCount,
      offerCount: offers.length,
    },
    offers,
  };
}

async function collectBabitalk(
  hospitalName: string,
  effectiveRegion: string,
  categoryHint: TreatmentCategory,
): Promise<PlatformCollectResult> {
  const cleanName = normalizeHospitalName(hospitalName);
  let searchJson: unknown;
  try {
    searchJson = await fetchJsonWithTimeout(
      `https://web-api.babitalk.com/v2/search/hospitals?query=${encodeURIComponent(cleanName)}`,
    );
  } catch {
    return buildFailedSummary('babitalk', 'error');
  }

  const hospRes = parseBabitalkHospitalSearch(searchJson, hospitalName, effectiveRegion);
  if (hospRes.kind === 'parse_error') {
    return buildFailedSummary('babitalk', 'error');
  }
  if (hospRes.kind === 'not_found') {
    return buildFailedSummary('babitalk', 'not_found');
  }

  let eventsJson: unknown;
  try {
    eventsJson = await fetchJsonWithTimeout(
      `https://web-api.babitalk.com/v2/hospitals/${hospRes.hospital.hospitalId}/events`,
    );
  } catch {
    return buildFailedSummary('babitalk', 'error');
  }

  const eventsRes = parseBabitalkHospitalEvents(
    eventsJson,
    hospRes.hospital.hospitalId,
    categoryHint,
  );
  if (eventsRes.kind === 'parse_error') {
    return buildFailedSummary('babitalk', 'error');
  }

  const offers = eventsRes.kind === 'found' ? eventsRes.offers : [];
  return {
    summary: {
      platform: 'babitalk',
      platformLabel: PLATFORM_LABELS.babitalk,
      status: 'matched',
      hospitalUrl: hospRes.hospital.detailUrl,
      rating: hospRes.hospital.rating,
      ratingScale: 5,
      reviewCount: hospRes.hospital.reviewCount,
      offerCount: offers.length,
    },
    offers,
  };
}

function runCollector(
  platform: CollectablePlatformSource,
  hospitalName: string,
  effectiveRegion: string,
  categoryHint: TreatmentCategory,
): Promise<PlatformCollectResult> {
  switch (platform) {
    case 'modoodoc':
      return collectModoodoc(hospitalName, effectiveRegion, categoryHint);
    case 'gangnamunni':
      return collectGangnamunni(hospitalName, effectiveRegion, categoryHint);
    case 'yeoshin':
      return collectYeoshin(hospitalName, effectiveRegion, categoryHint);
    case 'babitalk':
      return collectBabitalk(hospitalName, effectiveRegion, categoryHint);
  }
}

async function fetchHospitalMultiPlatformComparison(
  hospitalName: string,
  regionHint: string,
  department: string,
): Promise<FetchHospitalComparisonResponse> {
  const cleanName = normalizeHospitalName(hospitalName);
  const directRegion = extractRegionHintFromAddress(regionHint);
  const effectiveRegion = resolveEffectiveRegion(hospitalName, regionHint);
  const hasEffectiveRegion = effectiveRegion.length > 0;
  const categoryHint = normalizeDepartmentCategory(department);
  const key = `${buildHospitalKey(cleanName, effectiveRegion)}::${categoryHint}`;

  const cached = await getCachedHospitalComparison(hospitalName, effectiveRegion);
  if (cached.hit && (cached.comparison !== null || hasEffectiveRegion)) {
    if (cached.comparison !== null) {
      await attachComparisonToRecentHospital(hospitalName, effectiveRegion, cached.comparison);
      if (directRegion !== effectiveRegion) {
        await attachComparisonToRecentHospital(hospitalName, directRegion, cached.comparison);
      }
    }
    return { ok: true, comparison: cached.comparison };
  }

  const running = inFlightComparison.get(key);
  if (running) {
    return running;
  }

  const task = (async (): Promise<FetchHospitalComparisonResponse> => {
    try {
      const targetPlatforms = resolveTargetPlatformsForDepartment(department);
      const settled = await Promise.allSettled(
        targetPlatforms.map((platform) =>
          runCollector(platform, hospitalName, effectiveRegion, categoryHint),
        ),
      );

      const matchedPlatforms: PlatformSummaryItem[] = [];
      const rawOffers: RawPlatformOffer[] = [];
      const hiraOffers: RawPlatformOffer[] = [];
      const hiraBaselines: Record<string, number> = {};
      let topTreatments: { name: string; count: number }[] = [];
      let modoodocHospitalUrl: string | null = null;

      for (let idx = 0; idx < targetPlatforms.length; idx += 1) {
        const platform = targetPlatforms[idx];
        const outcome = settled[idx];
        if (!platform || !outcome) continue;

        if (outcome.status === 'rejected') {
          matchedPlatforms.push(buildFailedSummary(platform, 'error').summary);
          continue;
        }

        const result = outcome.value;
        matchedPlatforms.push(result.summary);
        rawOffers.push(...result.offers);

        if (platform === 'modoodoc' && result.summary.status === 'matched') {
          modoodocHospitalUrl = result.summary.hospitalUrl;
          if (result.topTreatments) {
            topTreatments = result.topTreatments.map((t) => ({ name: t.name, count: t.count }));
          }
          if (result.hiraOffers && result.hiraOffers.length > 0) {
            hiraOffers.push(...result.hiraOffers);
            for (const hiraOffer of result.hiraOffers) {
              const existing = hiraBaselines[hiraOffer.treatmentCode];
              if (existing === undefined || hiraOffer.listedPrice < existing) {
                hiraBaselines[hiraOffer.treatmentCode] = hiraOffer.listedPrice;
              }
            }
          }
        }
      }

      if (hiraOffers.length > 0) {
        matchedPlatforms.push({
          platform: 'hira',
          platformLabel: PLATFORM_LABELS.hira,
          status: 'matched',
          hospitalUrl: modoodocHospitalUrl,
          rating: null,
          ratingScale: 10,
          reviewCount: 0,
          offerCount: hiraOffers.length,
        });
        rawOffers.push(...hiraOffers);
      }

      const hasMatched = matchedPlatforms.some((item) => item.status === 'matched');
      const hadAnyError = matchedPlatforms.some((item) => item.status === 'error');

      if (!hasMatched) {
        if (!hadAnyError && hasEffectiveRegion) {
          await setCachedHospitalComparison(hospitalName, effectiveRegion, null);
        }
        return { ok: !hadAnyError, comparison: null };
      }

      const comparison: HospitalComparisonResult = {
        hospitalName: cleanName,
        regionHint: effectiveRegion,
        department,
        matchedPlatforms,
        rawOffers,
        hiraBaselines,
        topTreatments,
        fetchedAt: Date.now(),
      };

      if (!hadAnyError) {
        await setCachedHospitalComparison(hospitalName, effectiveRegion, comparison);
      }
      await attachComparisonToRecentHospital(hospitalName, effectiveRegion, comparison);
      if (directRegion !== effectiveRegion) {
        await attachComparisonToRecentHospital(hospitalName, directRegion, comparison);
      }

      return { ok: true, comparison };
    } catch {
      return { ok: false, comparison: null };
    } finally {
      inFlightComparison.delete(key);
    }
  })();

  inFlightComparison.set(key, task);
  return task;
}

async function openPlatformTarget(
  req: OpenPlatformTargetRequest,
): Promise<OpenPlatformTargetResponse> {
  const effectiveRegion = resolveEffectiveRegion(req.hospitalName, req.regionHint);
  await browser.tabs.create({ url: req.targetUrl });
  await markHospitalClicked({
    name: req.hospitalName,
    department: req.department,
    regionHint: effectiveRegion,
  });

  return { ok: true, targetUrl: req.targetUrl };
}

export default defineBackground(() => {
  void browser.storage.local
    .remove(['mediBridgeComparisonCache', 'vatIncluded'])
    .catch(() => undefined);
  void getBridgeState().then((state) => syncToolbarActionIcon(state.bridgeEnabled));
  subscribeBridgeEnabled((enabled) => {
    void syncToolbarActionIcon(enabled);
  });

  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (isRegisterSearchRegionHintsRequest(message)) {
      registerSearchRegionHints(message.items);
      sendResponse({ ok: true });
      return false;
    }

    if (isFetchHospitalComparisonRequest(message)) {
      fetchHospitalMultiPlatformComparison(
        message.hospitalName,
        message.regionHint,
        message.department,
      )
        .then((response) => sendResponse(response))
        .catch(() => sendResponse({ ok: false, comparison: null }));
      return true;
    }

    if (isMutateHistoryRequest(message)) {
      const mutation =
        (message.mutation.op === 'view' || message.mutation.op === 'click') &&
        !message.mutation.regionHint
          ? {
              ...message.mutation,
              regionHint: resolveEffectiveRegion(
                message.mutation.name,
                message.mutation.regionHint,
              ),
            }
          : message.mutation;
      applyHistoryMutation(mutation)
        .then((recentHospitals) => sendResponse({ ok: true, recentHospitals }))
        .catch(() => sendResponse({ ok: false, recentHospitals: [] }));
      return true;
    }

    if (isOpenPlatformTargetRequest(message)) {
      openPlatformTarget(message)
        .then((response) => sendResponse(response))
        .catch(async () => {
          try {
            await browser.tabs.create({ url: message.targetUrl });
          } catch {
            // ignore tab creation fallback failure
          }
          sendResponse({ ok: false, targetUrl: message.targetUrl });
        });
      return true;
    }

    return false;
  });
});
