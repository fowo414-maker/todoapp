"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface Props {
  /** 팝업 제목 */
  title?: string;
  /** 본문 안내 문구 */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** true(기본) 면 확인 버튼을 빨간색(위험)으로 표시한다. */
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * 확인/취소 팝업. 브라우저 `window.confirm` 대신 편집 다이얼로그와
 * 같은 모양의 모달로 되묻는 용도.
 */
export function ConfirmDialog({
  title = "확인",
  message,
  confirmLabel = "삭제",
  cancelLabel = "취소",
  danger = true,
  onConfirm,
  onClose,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-4 rounded-lg border border-line bg-surface p-5 shadow-xl"
      >
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="text-sm text-ink-soft">{message}</p>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm text-ink-soft hover:bg-raised"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={
              danger
                ? "rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                : "rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmDialog;
