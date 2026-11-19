import { browser } from 'wxt/browser';
import type {
  HistoryMutation,
  ModoodocHospitalSummary,
  MutateHistoryRequest,
  MutateHistoryResponse,
  RecentHospitalRecord,
} from '../types/place';
import {
  attachSummaryToRecentHospital,
  clearRecentHospitals,
  getBridgeState,
  markHospitalClicked,
  recordHospitalView,
  removeRecentHospital,
} from './bridgeStorage';

/**
 * 최근 본 병원 기록을 바꾸는 작업을 실제로 실행한다. service worker가 메시지를 받아 호출하고,
 * 모든 갱신이 service worker 한 곳의 쓰기 큐(bridgeStorage.ts)에 줄을 선다.
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
  }
}

/**
 * content script와 팝업은 기록을 직접 쓰지 않고 service worker에 맡긴다. 환경마다 쓰기 큐가 따로라
 * 직접 쓰면 서로의 변경을 덮을 수 있기 때문이다. service worker에 닿지 못할 때만 직접 실행한다.
 */
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
    // service worker에 닿지 못하면 아래에서 직접 실행한다.
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
