"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface MenuAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

type MenuState<T> = { x: number; y: number; target: T };

/**
 * 우클릭 컨텍스트 메뉴 상태 훅.
 * `open(event, target)` 으로 커서 위치와 대상을 저장하고, `state.target` 으로 어떤
 * 항목이 눌렸는지 구분한다 (대상이 필요 없으면 `undefined`).
 */
export function useContextMenu<T = undefined>() {
  const [state, setState] = useState<MenuState<T> | null>(null);

  const open = useCallback((event: React.MouseEvent, target: T) => {
    event.preventDefault();
    event.stopPropagation();
    setState({ x: event.clientX, y: event.clientY, target });
  }, []);

  const close = useCallback(() => setState(null), []);

  return { state, open, close };
}

export function ContextMenu({
  position,
  onClose,
  actions,
}: {
  position: { x: number; y: number } | null;
  onClose: () => void;
  actions: MenuAction[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!position) return;
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
    };
  }, [position, onClose]);

  if (!position || typeof document === "undefined") return null;

  const MENU_WIDTH = 176;
  const rowHeight = 34;
  const style: React.CSSProperties = {
    top: Math.max(
      8,
      Math.min(position.y, window.innerHeight - actions.length * rowHeight - 8),
    ),
    left: Math.max(
      8,
      Math.min(position.x, window.innerWidth - MENU_WIDTH - 8),
    ),
    width: MENU_WIDTH,
  };

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={style}
      className="fixed z-[90] overflow-hidden rounded-md border border-line bg-surface py-1 shadow-lg"
    >
      {actions.map((action, i) => (
        <button
          key={i}
          type="button"
          role="menuitem"
          disabled={action.disabled}
          onClick={() => {
            action.onSelect();
            onClose();
          }}
          className={`block w-full px-3 py-1.5 text-left text-sm disabled:opacity-40 ${
            action.danger
              ? "font-medium text-red-600 hover:bg-red-50"
              : "text-ink hover:bg-raised"
          }`}
        >
          {action.label}
        </button>
      ))}
    </div>,
    document.body,
  );
}

export default ContextMenu;
