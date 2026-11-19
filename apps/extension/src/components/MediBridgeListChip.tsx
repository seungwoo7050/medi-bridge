import { BrandInfinityIcon } from '@medi-bridge/ui';
import type React from 'react';
import { useState } from 'react';
import { browser } from 'wxt/browser';
import { buildModoodocSearchUrl } from '../domain/modoodocUrl';
import type { OpenModoodocHospitalRequest } from '../types/place';

export interface MediBridgeListChipProps {
  readonly hospitalName: string;
  readonly regionHint: string;
  readonly department: string;
  readonly isVisited?: boolean;
  readonly detailUrl?: string | null;
  readonly lowestLabel?: string | null;
  readonly onSelect?: () => void;
}

function stopBubble(event: React.SyntheticEvent): void {
  event.stopPropagation();
}

export function MediBridgeListChip({
  hospitalName,
  regionHint,
  department,
  isVisited = false,
  detailUrl = null,
  lowestLabel = null,
  onSelect,
}: MediBridgeListChipProps): React.JSX.Element {
  const [opening, setOpening] = useState<boolean>(false);
  const fallbackUrl = buildModoodocSearchUrl(hospitalName, regionHint);
  const targetUrl = detailUrl ?? fallbackUrl;

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();

    if (detailUrl !== null) {
      onSelect?.();
      return;
    }

    const isPlainLeftClick =
      event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    if (!isPlainLeftClick) {
      onSelect?.();
      return;
    }

    event.preventDefault();
    if (opening) {
      return;
    }
    setOpening(true);

    const req: OpenModoodocHospitalRequest = {
      type: 'OPEN_MODOODOC_HOSPITAL',
      hospitalName,
      regionHint,
      department,
    };

    void browser.runtime
      .sendMessage(req)
      .catch(() => {
        onSelect?.();
        window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      })
      .finally(() => {
        setOpening(false);
      });
  };

  return (
    <div className="mb-list-chip-wrapper">
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mb-list-chip${isVisited ? ' is-visited' : ''}${opening ? ' is-opening' : ''}`}
        title={`'${hospitalName}' 통합 가격 비교${isVisited ? ' (열람 완료)' : ''} (새 탭)`}
        aria-label={`${hospitalName} 가격 비교`}
        onPointerDown={stopBubble}
        onMouseDown={stopBubble}
        onClick={handleClick}
      >
        {isVisited ? (
          <span className="mb-list-chip-check" aria-hidden="true">
            ✓
          </span>
        ) : (
          <span className="mb-list-chip-icon" aria-hidden="true">
            <BrandInfinityIcon size={12} />
          </span>
        )}
        <span className="mb-list-chip-label">
          {lowestLabel ? `최저 ${lowestLabel}` : '가격 비교'}
        </span>
        <span className="mb-list-chip-arrow" aria-hidden="true">
          ↗
        </span>
      </a>
    </div>
  );
}
