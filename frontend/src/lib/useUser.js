"use client";

import { useEffect, useState } from "react";
import { getUser } from "./session";

export function useUser() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setUser(getUser());
    sync();
    setReady(true);
    window.addEventListener("user-updated", sync);
    return () => window.removeEventListener("user-updated", sync);
  }, []);

  return { user, ready };
}
