import type React from 'react';
import { buildModoodocSearchUrl } from '../domain/modoodocUrl';

export interface ModoodocListChipProps {
  readonly hospitalName: string;
  readonly regionHint: string;
  readonly onSelect?: () => void;
}

function stopBubble(event: React.SyntheticEvent): void {
  event.stopPropagation();
}

export function ModoodocListChip({
  hospitalName,
  regionHint,
  onSelect,
}: ModoodocListChipProps): React.JSX.Element {
  const targetUrl = buildModoodocSearchUrl(hospitalName, regionHint);

  return (
    <div className="modoodoc-list-chip-wrapper">
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="modoodoc-list-chip"
        title={`'${hospitalName}' 모두닥 리뷰 바로 보기 (새 탭)`}
        aria-label={`${hospitalName} 모두닥 리뷰 보기`}
        onPointerDown={stopBubble}
        onMouseDown={stopBubble}
        onClick={(event) => {
          event.stopPropagation();
          onSelect?.();
        }}
      >
        <span className="modoodoc-list-chip-dot" aria-hidden="true" />
        <span className="modoodoc-list-chip-label">모두닥 리뷰</span>
        <span className="modoodoc-list-chip-arrow" aria-hidden="true">
          ↗
        </span>
      </a>
    </div>
  );
}
