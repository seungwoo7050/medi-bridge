'use client';

import { Check, Copy } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';

export interface CopyInstallLinkButtonProps {
  readonly label?: string;
  readonly copiedLabel?: string;
  readonly className?: string;
}

export function CopyInstallLinkButton({
  label = 'PC 설치용 링크 복사',
  copiedLabel = '✓ 링크 복사 완료 (PC로 보내기)',
  className = '',
}: CopyInstallLinkButtonProps): React.JSX.Element {
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCopied(false);
    }, 2500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => {
        void handleCopy();
      }}
      className={className}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{copied ? copiedLabel : label}</span>
    </button>
  );
}

export function MobileCopyLinkBar(): React.JSX.Element {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 md:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">PC Chrome 전용 확장프로그램</p>
          <p className="text-[11px] text-slate-500 truncate">
            PC 브라우저에서 열어 바로 설치하세요
          </p>
        </div>
        <CopyInstallLinkButton
          label="PC 설치용 링크 복사"
          copiedLabel="✓ 링크 복사 완료 (PC로 보내기)"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#1E2456] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#252D6B] transition shrink-0 whitespace-nowrap cursor-pointer"
        />
      </div>
    </div>
  );
}
