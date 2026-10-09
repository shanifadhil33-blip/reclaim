"use client";

import { useEffect } from "react";

/** A tap must not leave a focus ring. Tab brings the keyboard ring back. */
export function PointerFocus() {
  useEffect(() => {
    const root = document.documentElement;
    const onPointer = () => root.classList.add("using-pointer");
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Tab") root.classList.remove("using-pointer");
    };
    root.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
