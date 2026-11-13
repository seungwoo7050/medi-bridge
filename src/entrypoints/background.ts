import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { parseModoodocSearchHtml } from '../adapters/modoodocSearchParser';
import {
  attachSummaryToRecentHospital,
  getCachedHospitalSummary,
  setCachedHospitalSummary,
} from '../domain/bridgeStorage';
import {
  buildHospitalKey,
  buildModoodocSearchUrl,
  extractRegionHintFromAddress,
  normalizeHospitalName,
} from '../domain/modoodocUrl';
import type { FetchModoodocSummaryRequest, FetchModoodocSummaryResponse } from '../types/place';

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
      const summary = parseModoodocSearchHtml(html, req.hospitalName, req.regionHint);

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
    return false;
  });
});
