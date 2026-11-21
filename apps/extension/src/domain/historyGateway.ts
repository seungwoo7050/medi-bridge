import type { HospitalComparisonResult } from '@medi-bridge/shared';
import { browser } from 'wxt/browser';
import type {
  HistoryMutation,
  ModoodocHospitalSummary,
  MutateHistoryRequest,
  MutateHistoryResponse,
  RecentHospitalRecord,
} from '../types/place';
import {
  attachComparisonToRecentHospital,
  attachSummaryToRecentHospital,
  clearRecentHospitals,
  getBridgeState,
  markHospitalClicked,
  recordHospitalView,
  removeRecentHospital,
} from './bridgeStorage';

/**
 * 최근 본 병원 기록 변경을 실행합니다. Service Worker 단일 쓰기 큐를 거쳐 Lost Update를 차단합니다.
 */
export async function applyHistoryMutation(
  mutation: HistoryMutation,
): Promise<readonly RecentHospitalRecord[]> {
  switch (mutation.op) {
    case 'view':
      return recordHospitalView(mutation);
    case 'click':
      return markHospitalClicked(mutation);
    case 'remove':
      return removeRecentHospital(mutation.id);
    case 'clear':
      await clearRecentHospitals();
      return (await getBridgeState()).recentHospitals;
    case 'attach':
      return attachSummaryToRecentHospital(mutation.name, mutation.regionHint, mutation.summary);
    case 'attach_comparison':
      return attachComparisonToRecentHospital(
        mutation.name,
        mutation.regionHint,
        mutation.comparison,
      );
  }
}

async function requestHistoryMutation(
  mutation: HistoryMutation,
): Promise<readonly RecentHospitalRecord[]> {
  const req: MutateHistoryRequest = { type: 'MUTATE_HISTORY', mutation };
  try {
    const res = (await browser.runtime.sendMessage(req)) as MutateHistoryResponse | undefined;
    if (res?.ok) {
      return res.recentHospitals;
    }
  } catch {
    // Service Worker 슬립·미응답 시 로컬 폴백
  }
  return applyHistoryMutation(mutation);
}

interface HospitalInput {
  readonly name: string;
  readonly department: string;
  readonly regionHint: string;
}

export function recordHospitalViewViaWorker(
  input: HospitalInput,
): Promise<readonly RecentHospitalRecord[]> {
  return requestHistoryMutation({ op: 'view', ...input });
}

export function markHospitalClickedViaWorker(
  input: HospitalInput,
): Promise<readonly RecentHospitalRecord[]> {
  return requestHistoryMutation({ op: 'click', ...input });
}

export function removeRecentHospitalViaWorker(
  id: string,
): Promise<readonly RecentHospitalRecord[]> {
  return requestHistoryMutation({ op: 'remove', id });
}

export function clearRecentHospitalsViaWorker(): Promise<readonly RecentHospitalRecord[]> {
  return requestHistoryMutation({ op: 'clear' });
}

export function attachSummaryViaWorker(
  name: string,
  regionHint: string,
  summary: ModoodocHospitalSummary,
): Promise<readonly RecentHospitalRecord[]> {
  return requestHistoryMutation({ op: 'attach', name, regionHint, summary });
}

export function attachComparisonViaWorker(
  name: string,
  regionHint: string,
  comparison: HospitalComparisonResult,
): Promise<readonly RecentHospitalRecord[]> {
  return requestHistoryMutation({ op: 'attach_comparison', name, regionHint, comparison });
}
