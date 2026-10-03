"use client";

import { useEffect, useState } from "react";

/**
 * Hook matchMedia reaktif. Aman untuk SSR (render pertama selalu false,
 * nilai sebenarnya di-sync setelah mount + saat viewport berubah).
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    // Sinkronisasi awal subscription; state berikutnya mengalir dari event change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMatches(mql.matches);
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
