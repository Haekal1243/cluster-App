"use client";

import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { getToken } from "@/lib/session";

/**
 * Gambar dari endpoint terautentikasi (mis. bukti transfer IPL/setoran/kas).
 * `<img src>` biasa tidak bisa membawa header Authorization, jadi filenya
 * diambil sebagai blob lalu ditampilkan lewat object URL.
 */
export default function ProtectedImage({ path, alt, className, emptyText = "Tidak ada file bukti." }) {
  const [objectUrl, setObjectUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!path) {
      setObjectUrl(null);
      return;
    }
    let url;
    let cancelled = false;
    setError(false);
    (async () => {
      try {
        const token = getToken();
        const response = await fetch(`${API_BASE_URL}${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!response.ok) throw new Error("gagal");
        const blob = await response.blob();
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path]);

  if (!path || error) {
    return <div className="review-bukti-empty">{emptyText}</div>;
  }
  if (!objectUrl) {
    return <div className="review-bukti-empty">Memuat…</div>;
  }
  return (
    <a href={objectUrl} target="_blank" rel="noopener noreferrer">
      <img src={objectUrl} alt={alt} className={className} />
    </a>
  );
}
