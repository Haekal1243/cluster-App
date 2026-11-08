"use client";

import { useEffect, useRef } from "react";

export function useAutoRefresh(callback, intervalMs = 30_000) {
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    let interval = null;
    const mulai = () => {
      if (interval) return;
      interval = setInterval(() => callbackRef.current(), intervalMs);
    };
    const berhenti = () => {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    };

    const handleVisibility = () => {
      if (document.hidden) {
        berhenti();
      } else {
        callbackRef.current();
        mulai();
      }
    };

    if (!document.hidden) mulai();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      berhenti();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [intervalMs]);
}
