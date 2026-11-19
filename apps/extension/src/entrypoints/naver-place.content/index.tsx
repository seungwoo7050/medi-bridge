import ReactDOM from 'react-dom/client';
import type { ContentScriptContext } from 'wxt/utils/content-script-context';
import {
  createShadowRootUi,
  type ShadowRootContentScriptUi,
} from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { extractHospitalFromEntryDocument } from '../../adapters/naverEntryDom';
import { extractHospitalsFromSearchList } from '../../adapters/naverSearchListDom';
import { ModoodocBadge } from '../../components/ModoodocBadge';
import { ModoodocListChip } from '../../components/ModoodocListChip';
import {
  getBridgeState,
  subscribeBridgeEnabled,
  subscribeRecentHospitals,
} from '../../domain/bridgeStorage';
import {
  markHospitalClickedViaWorker,
  recordHospitalViewViaWorker,
} from '../../domain/historyGateway';
import { buildHospitalKey } from '../../domain/modoodocUrl';
import type { ExtractedSearchListHospital, RecentHospitalRecord } from '../../types/place';
import './style.css';

const ENTRY_SHADOW_HOST_NAME = 'modoodoc-naver-bridge';
const LIST_SHADOW_HOST_NAME = 'modoodoc-naver-list-chip';
const DEBOUNCE_MS = 120;

interface MountedListChip {
  readonly key: string;
  readonly item: ExtractedSearchListHospital;
  readonly root: ReactDOM.Root;
  readonly ui: ShadowRootContentScriptUi<ReactDOM.Root>;
}

export default defineContentScript({
  matches: ['https://pcmap.place.naver.com/*', 'https://map.naver.com/*'],
  // 네이버 지도 상세 패널(#entryIframe)과 검색 목록(#searchIframe) 모두에서 동작
  allFrames: true,
  cssInjectionMode: 'ui',

  main(ctx: ContentScriptContext) {
    let bridgeEnabled = true;
    let currentEntrySignature: string | null = null;
    let lastRecordedSignature: string | null = null;
    let activeEntryUi: ShadowRootContentScriptUi<ReactDOM.Root> | null = null;
    let isSyncing = false;
    let pendingResync = false;
    let debounceTimer: number | null = null;

    const recentHospitalsMap = new Map<string, RecentHospitalRecord>();
    const mountedListChips = new Map<HTMLElement, MountedListChip>();

    const updateRecentHospitalsMemory = (records: readonly RecentHospitalRecord[]) => {
      recentHospitalsMap.clear();
      for (const record of records) {
        recentHospitalsMap.set(record.id, record);
      }
    };

    const renderChipIntoRoot = (root: ReactDOM.Root, item: ExtractedSearchListHospital) => {
      const hospitalKey = buildHospitalKey(item.name, item.regionHint);
      const historyRecord = recentHospitalsMap.get(hospitalKey);
      const isVisited = historyRecord?.clickedModoodoc === true;
      const detailUrl = historyRecord?.summary?.detailUrl ?? null;

      root.render(
        <ModoodocListChip
          hospitalName={item.name}
          regionHint={item.regionHint}
          department={item.matchedDepartment}
          isVisited={isVisited}
          detailUrl={detailUrl}
          onSelect={() => {
            void markHospitalClickedViaWorker({
              name: item.name,
              department: item.matchedDepartment,
              regionHint: item.regionHint,
            });
          }}
        />,
      );
    };

    const rerenderAllMountedListChips = () => {
      for (const mounted of mountedListChips.values()) {
        renderChipIntoRoot(mounted.root, mounted.item);
      }
    };

    const cleanupEntryUi = () => {
      if (activeEntryUi) {
        activeEntryUi.remove();
        activeEntryUi = null;
      }
      currentEntrySignature = null;
    };

    const cleanupDisconnectedListChips = () => {
      for (const [itemEl, mounted] of mountedListChips.entries()) {
        if (!itemEl.isConnected) {
          mounted.ui.remove();
          mountedListChips.delete(itemEl);
        }
      }
    };

    const cleanupAllListChips = () => {
      for (const mounted of mountedListChips.values()) {
        mounted.ui.remove();
      }
      mountedListChips.clear();
    };

    const syncEntryBadge = async () => {
      const place = extractHospitalFromEntryDocument(document);
      if (!place) {
        cleanupEntryUi();
        return;
      }

      const nextSignature = `${place.name}::${place.regionHint}`;
      const existingHost = document.querySelector(ENTRY_SHADOW_HOST_NAME);
      if (currentEntrySignature === nextSignature && existingHost) {
        return;
      }

      cleanupEntryUi();

      const ui = await createShadowRootUi(ctx, {
        name: ENTRY_SHADOW_HOST_NAME,
        position: 'inline',
        anchor: place.anchorElement,
        append: 'after',
        onMount: (container) => {
          const mountNode = document.createElement('div');
          container.append(mountNode);
          const root = ReactDOM.createRoot(mountNode);
          root.render(
            <ModoodocBadge
              hospitalName={place.name}
              regionHint={place.regionHint}
              department={place.matchedDepartment}
              onSelect={() => {
                void markHospitalClickedViaWorker({
                  name: place.name,
                  department: place.matchedDepartment,
                  regionHint: place.regionHint,
                });
              }}
            />,
          );
          return root;
        },
        onRemove: (root) => {
          root?.unmount();
        },
      });

      if (ctx.isInvalid || !bridgeEnabled) {
        ui.remove();
        return;
      }

      ui.mount();
      activeEntryUi = ui;
      currentEntrySignature = nextSignature;

      if (lastRecordedSignature !== nextSignature) {
        lastRecordedSignature = nextSignature;
        void recordHospitalViewViaWorker({
          name: place.name,
          department: place.matchedDepartment,
          regionHint: place.regionHint,
        });
      }
    };

    const syncSearchListChips = async () => {
      cleanupDisconnectedListChips();

      const listHospitals = extractHospitalsFromSearchList(document);
      if (listHospitals.length === 0) {
        cleanupAllListChips();
        return;
      }

      const activeSet = new Set(listHospitals.map((item) => item.itemElement));
      for (const [itemEl, mounted] of mountedListChips.entries()) {
        if (!activeSet.has(itemEl)) {
          mounted.ui.remove();
          mountedListChips.delete(itemEl);
        }
      }

      for (const item of listHospitals) {
        if (ctx.isInvalid || !bridgeEnabled) {
          return;
        }

        const existing = mountedListChips.get(item.itemElement);
        if (
          existing &&
          existing.key === item.itemKey &&
          item.itemElement.querySelector(LIST_SHADOW_HOST_NAME) !== null
        ) {
          continue;
        }

        if (existing) {
          existing.ui.remove();
          mountedListChips.delete(item.itemElement);
        }

        let chipRoot: ReactDOM.Root | null = null;

        const ui = await createShadowRootUi(ctx, {
          name: LIST_SHADOW_HOST_NAME,
          position: 'inline',
          anchor: item.anchorElement,
          append: 'after',
          isolateEvents: ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup'],
          onMount: (container) => {
            const mountNode = document.createElement('div');
            container.append(mountNode);
            const root = ReactDOM.createRoot(mountNode);
            chipRoot = root;
            renderChipIntoRoot(root, item);
            return root;
          },
          onRemove: (root) => {
            root?.unmount();
          },
        });

        if (ctx.isInvalid || !bridgeEnabled || !item.itemElement.isConnected) {
          ui.remove();
          continue;
        }

        ui.mount();
        if (chipRoot) {
          mountedListChips.set(item.itemElement, {
            key: item.itemKey,
            item,
            root: chipRoot,
            ui,
          });
        }
      }
    };

    const runSync = async () => {
      if (ctx.isInvalid) {
        return;
      }
      if (isSyncing) {
        pendingResync = true;
        return;
      }

      isSyncing = true;
      try {
        if (!bridgeEnabled) {
          cleanupEntryUi();
          cleanupAllListChips();
          return;
        }
        await syncEntryBadge();
        await syncSearchListChips();
      } finally {
        isSyncing = false;
        if (pendingResync && !ctx.isInvalid) {
          pendingResync = false;
          void runSync();
        }
      }
    };

    const scheduleSync = () => {
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = ctx.setTimeout(() => {
        void runSync();
      }, DEBOUNCE_MS);
    };

    const observer = new MutationObserver(() => {
      scheduleSync();
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    const unsubscribeStorage = subscribeBridgeEnabled((enabled) => {
      bridgeEnabled = enabled;
      if (!enabled) {
        cleanupEntryUi();
        cleanupAllListChips();
      } else {
        scheduleSync();
      }
    });

    const unsubscribeRecent = subscribeRecentHospitals((records) => {
      updateRecentHospitalsMemory(records);
      rerenderAllMountedListChips();
    });

    void getBridgeState().then((state) => {
      if (ctx.isInvalid) {
        return;
      }
      bridgeEnabled = state.bridgeEnabled;
      updateRecentHospitalsMemory(state.recentHospitals);
      if (bridgeEnabled) {
        void runSync();
      }
    });

    ctx.onInvalidated(() => {
      observer.disconnect();
      unsubscribeStorage();
      unsubscribeRecent();
      if (debounceTimer !== null) {
        window.clearTimeout(debounceTimer);
      }
      cleanupEntryUi();
      cleanupAllListChips();
    });
  },
});
