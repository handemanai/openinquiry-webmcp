"use client";

import { useEffect } from "react";

/** Gives a provider-issued fragment a visible, keyboard-announced focus. */
export function DeepLinkFocus() {
  useEffect(() => {
    const focusTarget = () => {
      let id: string;
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }

      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;

      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      target.scrollIntoView({
        block: "center",
        behavior: reduceMotion ? "auto" : "smooth",
      });
      target.focus({ preventScroll: true });
    };

    focusTarget();
    window.addEventListener("hashchange", focusTarget);
    return () => window.removeEventListener("hashchange", focusTarget);
  }, []);

  return null;
}
