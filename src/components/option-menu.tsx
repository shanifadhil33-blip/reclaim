"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type OptionItem = {
  value: string;
  label: string;
};

export function OptionMenu({
  label,
  value,
  options,
  onChange,
  widthClass = "w-[12.5rem]",
}: {
  label: string;
  value: string;
  options: OptionItem[];
  onChange: (value: string) => void;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = rect.width;
      const menuHeight = Math.min(options.length * 44 + 8, 280);
      const below = rect.bottom + 6;
      const top = below + menuHeight > window.innerHeight - 8 ? Math.max(8, rect.top - menuHeight - 6) : below;
      const left = Math.min(rect.left, window.innerWidth - width - 8);
      setBox({ top, left: Math.max(8, left), width });
    };
    place();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, options.length]);

  return (
    <div className={widthClass}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        className={`${widthClass} relative flex h-11 items-center rounded-lg border border-white/15 bg-neutral-900 px-3 pr-8 text-left text-sm text-white`}
      >
        <span className="sr-only">{label}: </span>
        <span className="truncate">{current?.label}</span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 h-0 w-0 -translate-y-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-neutral-300"
        />
      </button>
      {open && box && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              id={listId}
              role="listbox"
              aria-label={label}
              className="fixed z-[60] overflow-hidden rounded-lg border border-white/15 bg-neutral-900 py-1 shadow-2xl"
              style={{ top: box.top, left: box.left, width: box.width }}
            >
              {options.map((option) => {
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    className="flex h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm text-neutral-100 hover:bg-white/10"
                  >
                    <span className="truncate">{option.label}</span>
                    {selected ? <span aria-hidden="true">✓</span> : <span className="w-3" />}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
