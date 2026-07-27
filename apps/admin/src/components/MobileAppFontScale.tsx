"use client";

import { useEffect } from "react";
import { isMobileApp } from "@/lib/mobile-bridge";

/** Shrinks rem-based typography inside the Android WebView admin pages. */
export function MobileAppFontScale() {
  useEffect(() => {
    const root = document.documentElement;
    if (!isMobileApp()) return;

    root.classList.add("swarka-mobile-app");
    return () => {
      root.classList.remove("swarka-mobile-app");
    };
  }, []);

  return null;
}
