import { beforeEach, describe, expect, it, vi } from 'vitest';

const store: Record<string, unknown> = {};
type StorageListener = (
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  areaName: string,
) => void;
const listeners = new Set<StorageListener>();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (keys?: string | string[] | null) => {
          if (typeof keys === 'string') {
            return keys in store ? { [keys]: store[keys] } : {};
          }
          if (Array.isArray(keys)) {
            const result: Record<string, unknown> = {};
            for (const key of keys) {
              if (key in store) {
                result[key] = store[key];
              }
            }
            return result;
          }
          return { ...store };
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          const changes: Record<string, { newValue?: unknown; oldValue?: unknown }> = {};
          for (const [key, value] of Object.entries(items)) {
            changes[key] = { oldValue: store[key], newValue: value };
            store[key] = value;
          }
          for (const listener of listeners) {
            listener(changes, 'local');
          }
        }),
      },
      onChanged: {
        addListener: vi.fn((listener: StorageListener) => {
          listeners.add(listener);
        }),
        removeListener: vi.fn((listener: StorageListener) => {
          listeners.delete(listener);
        }),
      },
    },
  },
}));

import {
  clearRecentHospitals,
  getBridgeState,
  MAX_RECENT_HOSPITALS,
  markHospitalClicked,
  recordHospitalView,
  removeRecentHospital,
  setBridgeEnabled,
  subscribeBridgeEnabled,
} from '../src/domain/bridgeStorage';

describe('bridgeStorage', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    listeners.clear();
  });

  it('초기 상태는 bridgeEnabled=true, recentHospitals=[]를 반환한다', async () => {
    const state = await getBridgeState();
    expect(state).toEqual({
      bridgeEnabled: true,
      recentHospitals: [],
    });
  });

  it('병원 열람과 모두닥 클릭 여부를 LRU 순서로 저장하고 clickedModoodoc 상태를 보존한다', async () => {
    await recordHospitalView({
      name: '강남밝은안과의원',
      department: '안과',
      regionHint: '서울 강남구',
    });
    await markHospitalClicked({
      name: '강남밝은안과의원',
      department: '안과',
      regionHint: '서울 강남구',
    });
    await recordHospitalView({
      name: '서초바른치과의원',
      department: '치과',
      regionHint: '서울 서초구',
    });
    // 다시 첫 번째 병원을 열람해도 clickedModoodoc=true는 유지되어야 함
    const list = await recordHospitalView({
      name: '강남밝은안과의원',
      department: '안과',
      regionHint: '서울 강남구',
    });

    expect(list).toHaveLength(2);
    expect(list[0]?.name).toBe('강남밝은안과의원');
    expect(list[0]?.clickedModoodoc).toBe(true);
    expect(list[1]?.name).toBe('서초바른치과의원');
    expect(list[1]?.clickedModoodoc).toBe(false);
  });

  it('최근 본 병원은 최대 20건까지만 유지한다', async () => {
    for (let i = 1; i <= MAX_RECENT_HOSPITALS + 5; i += 1) {
      await recordHospitalView({
        name: `테스트의원 ${i}`,
        department: '내과',
        regionHint: '서울 강남구',
      });
    }

    const state = await getBridgeState();
    expect(state.recentHospitals).toHaveLength(MAX_RECENT_HOSPITALS);
    expect(state.recentHospitals[0]?.name).toBe(`테스트의원 ${MAX_RECENT_HOSPITALS + 5}`);
  });

  it('개별 삭제와 전체 비우기가 정상 동작한다', async () => {
    const list = await recordHospitalView({
      name: '연세피부과의원',
      department: '피부과',
      regionHint: '서울 마포구',
    });
    await recordHospitalView({
      name: '신촌한의원',
      department: '한의원',
      regionHint: '서울 서대문구',
    });

    const firstId = list[0]?.id ?? '';
    const afterRemove = await removeRecentHospital(firstId);
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove[0]?.name).toBe('신촌한의원');

    await clearRecentHospitals();
    const afterClear = await getBridgeState();
    expect(afterClear.recentHospitals).toEqual([]);
  });

  it('subscribeBridgeEnabled는 토글 변경을 실시간으로 전달하고 구독 해제가 가능하다', async () => {
    const callback = vi.fn();
    const unsubscribe = subscribeBridgeEnabled(callback);

    await setBridgeEnabled(false);
    await setBridgeEnabled(true);
    expect(callback).toHaveBeenNthCalledWith(1, false);
    expect(callback).toHaveBeenNthCalledWith(2, true);

    unsubscribe();
    await setBridgeEnabled(false);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
