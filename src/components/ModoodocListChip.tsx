import type React from 'react';
import { useState } from 'react';
import { browser } from 'wxt/browser';
import { buildModoodocSearchUrl } from '../domain/modoodocUrl';
import type { OpenModoodocHospitalRequest } from '../types/place';

export interface ModoodocListChipProps {
  readonly hospitalName: string;
  readonly regionHint: string;
  readonly department: string;
  readonly isVisited?: boolean;
  readonly detailUrl?: string | null;
  readonly onSelect?: () => void;
}

function stopBubble(event: React.SyntheticEvent): void {
  event.stopPropagation();
}

export function ModoodocListChip({
  hospitalName,
  regionHint,
  department,
  isVisited = false,
  detailUrl = null,
  onSelect,
}: ModoodocListChipProps): React.JSX.Element {
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
    <div className="modoodoc-list-chip-wrapper">
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`modoodoc-list-chip${isVisited ? ' is-visited' : ''}${opening ? ' is-opening' : ''}`}
        title={`'${hospitalName}' 모두닥 병원 페이지 보기${isVisited ? ' (열어본 병원)' : ''} (새 탭)`}
        aria-label={`${hospitalName} 모두닥 리뷰 보기`}
        onPointerDown={stopBubble}
        onMouseDown={stopBubble}
        onClick={handleClick}
      >
        {isVisited ? (
          <span className="modoodoc-list-chip-check" aria-hidden="true">
            ✓
          </span>
        ) : (
          <span className="modoodoc-list-chip-dot" aria-hidden="true" />
        )}
        <span className="modoodoc-list-chip-label">모두닥 리뷰</span>
        <span className="modoodoc-list-chip-arrow" aria-hidden="true">
          ↗
        </span>
      </a>
    </div>
  );
}
