import { BrandInfinityIcon } from '@medi-bridge/ui';
import type React from 'react';

export interface MediBridgeListChipProps {
  readonly hospitalName: string;
  readonly isVisited?: boolean;
  readonly isActive?: boolean;
  readonly lowestLabel?: string | null;
  readonly platformLabel?: string | null;
  readonly onCompareClick: () => void;
}

function stopBubble(event: React.SyntheticEvent): void {
  event.stopPropagation();
}

export function MediBridgeListChip({
  hospitalName,
  isVisited = false,
  isActive = false,
  lowestLabel = null,
  platformLabel = null,
  onCompareClick,
}: MediBridgeListChipProps): React.JSX.Element {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    onCompareClick();
  };

  const labelText = lowestLabel
    ? `${platformLabel ? `${platformLabel} · ` : ''}최저 ${lowestLabel}`
    : '가격 비교';

  return (
    <div className="mb-list-chip-wrapper">
      <button
        type="button"
        className={`mb-list-chip${isVisited ? ' is-visited' : ''}${isActive ? ' is-active' : ''}`}
        title={`'${hospitalName}' 플랫폼별 가격 비교 열기`}
        aria-label={`${hospitalName} 가격 비교`}
        aria-pressed={isActive}
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
        <span className="mb-list-chip-label">{labelText}</span>
      </button>
    </div>
  );
}
