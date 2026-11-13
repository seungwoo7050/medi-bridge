import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { parseModoodocSearchResult } from '../adapters/modoodocSearchParser';
import {
  attachSummaryToRecentHospital,
  getCachedHospitalSummary,
  markHospitalClicked,
  setCachedHospitalSummary,
} from '../domain/bridgeStorage';
import { applyHistoryMutation } from '../domain/historyGateway';
import {
  buildHospitalKey,
  buildModoodocSearchUrl,
  extractRegionHintFromAddress,
  normalizeHospitalName,
} from '../domain/modoodocUrl';
import type {
  FetchModoodocSummaryRequest,
  FetchModoodocSummaryResponse,
  HistoryMutation,
  MutateHistoryRequest,
  OpenModoodocHospitalRequest,
  OpenModoodocHospitalResponse,
} from '../types/place';

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFetchModoodocSummaryRequest(value: unknown): value is FetchModoodocSummaryRequest {
  if (!isRecordObject(value)) {
    return false;
  }
  return (
    value.type === 'FETCH_MODOODOC_SUMMARY' &&
    typeof value.hospitalName === 'string' &&
    typeof value.regionHint === 'string' &&
    typeof value.department === 'string'
  );
}

function isOpenModoodocHospitalRequest(value: unknown): value is OpenModoodocHospitalRequest {
  if (!isRecordObject(value)) {
    return false;
  }
  return (
    value.type === 'OPEN_MODOODOC_HOSPITAL' &&
    typeof value.hospitalName === 'string' &&
    typeof value.regionHint === 'string' &&
    typeof value.department === 'string'
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
    default:
      return false;
  }
}

function isMutateHistoryRequest(value: unknown): value is MutateHistoryRequest {
  return (
    isRecordObject(value) && value.type === 'MUTATE_HISTORY' && isHistoryMutation(value.mutation)
  );
}

const inFlight = new Map<string, Promise<FetchModoodocSummaryResponse>>();

async function fetchHospitalSummary(
  req: FetchModoodocSummaryRequest,
): Promise<FetchModoodocSummaryResponse> {
  const cleanName = normalizeHospitalName(req.hospitalName);
  const cleanRegion = extractRegionHintFromAddress(req.regionHint);
  const key = buildHospitalKey(cleanName, cleanRegion);

  const cached = await getCachedHospitalSummary(req.hospitalName, req.regionHint);
  if (cached.hit) {
    if (cached.summary !== null) {
      await attachSummaryToRecentHospital(req.hospitalName, req.regionHint, cached.summary);
    }
    return { ok: true, summary: cached.summary };
  }

  const running = inFlight.get(key);
  if (running) {
    return running;
  }

  const task = (async (): Promise<FetchModoodocSummaryResponse> => {
    try {
      const searchUrl = buildModoodocSearchUrl(req.hospitalName, req.regionHint);
      const res = await fetch(searchUrl, {
        signal: AbortSignal.timeout(6000),
        headers: { Accept: 'text/html' },
      });

      if (!res.ok) {
        return { ok: false, summary: null };
      }

      const html = await res.text();
      const parsed = parseModoodocSearchResult(html, req.hospitalName, req.regionHint);
      if (parsed.kind === 'parse_error') {
        // 응답 구조를 읽지 못한 것은 미등록이 아니므로 캐시하지 않아 다음 시도에서 다시 조회한다.
        return { ok: false, summary: null };
      }
      const summary = parsed.kind === 'found' ? parsed.summary : null;

      await setCachedHospitalSummary(req.hospitalName, req.regionHint, summary);
      if (summary !== null) {
        await attachSummaryToRecentHospital(req.hospitalName, req.regionHint, summary);
      }

      return { ok: true, summary };
    } catch {
      return { ok: false, summary: null };
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, task);
  return task;
}

async function openHospitalInModoodoc(
  req: OpenModoodocHospitalRequest,
): Promise<OpenModoodocHospitalResponse> {
  const resolved = await fetchHospitalSummary({
    type: 'FETCH_MODOODOC_SUMMARY',
    hospitalName: req.hospitalName,
    regionHint: req.regionHint,
    department: req.department,
  });

  const targetUrl =
    resolved.summary?.detailUrl ?? buildModoodocSearchUrl(req.hospitalName, req.regionHint);
  await browser.tabs.create({ url: targetUrl });
  // 탭이 실제로 열린 뒤에 기록한다. 요약은 위에서 캐시에 저장되어 기록에 함께 합쳐진다.
  await markHospitalClicked({
    name: req.hospitalName,
    department: req.department,
    regionHint: req.regionHint,
  });
  return { ok: true, targetUrl };
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (isFetchModoodocSummaryRequest(message)) {
      fetchHospitalSummary(message)
        .then((response) => {
          sendResponse(response);
        })
        .catch(() => {
          sendResponse({ ok: false, summary: null });
        });
      return true;
    }

    if (isMutateHistoryRequest(message)) {
      applyHistoryMutation(message.mutation)
        .then((recentHospitals) => {
          sendResponse({ ok: true, recentHospitals });
        })
        .catch(() => {
          sendResponse({ ok: false, recentHospitals: [] });
        });
      return true;
    }

    if (isOpenModoodocHospitalRequest(message)) {
      openHospitalInModoodoc(message)
        .then((response) => {
          sendResponse(response);
        })
        .catch(async () => {
          const fallbackUrl = buildModoodocSearchUrl(message.hospitalName, message.regionHint);
          try {
            await browser.tabs.create({ url: fallbackUrl });
          } catch {
            // ignore tab creation fallback failure
          }
          sendResponse({ ok: false, targetUrl: fallbackUrl });
        });
      return true;
    }

    return false;
  });
});
