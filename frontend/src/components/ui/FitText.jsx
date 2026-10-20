"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Teks satu baris yang mengecil otomatis sampai muat di lebar wadahnya
 * (untuk nominal Rupiah di kartu ringkasan: tampil penuh, tidak disingkat,
 * tidak terpotong "…"). Ukuran font bawaan CSS tetap dipakai selama masih muat.
 */
export default function FitText({
  as: Tag = "span",
  className = "ipl-summary-value",
  min = 9,
  children,
  ...rest
}) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      el.style.fontSize = "";
      let size = parseFloat(getComputedStyle(el).fontSize);
      while (el.scrollWidth > el.clientWidth && size > min) {
        size -= 0.5;
        el.style.fontSize = `${size}px`;
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el.parentElement || el);
    return () => ro.disconnect();
  }, [children, min]);

  return (
    <Tag ref={ref} className={className} {...rest}>
      {children}
    </Tag>
  );
}
