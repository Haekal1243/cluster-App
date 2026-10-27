"use client";

import { useEffect, useRef } from "react";

const UKURAN_DASAR = 420; // sama dengan ukuran logo di Hero (px); bagian lain diskalakan dari sini
const GARIS_ACUAN = 0.28; // garis acuan di layar (28% dari atas): logo tepat di sebuah judul saat judul itu ada di garis ini
const DIAM = 0.18; // di awal dan akhir tiap ruas (18%) logo diam di judulnya; bergerak hanya di bagian tengah ruas
const KELEMBAMAN = 0.13; // 0–1: makin kecil makin lembut/menyusul pelan; 1 = langsung mengikuti tanpa jeda

const lerp = (a, b, t) => a + (b - a) * t;
const klem = (t) => Math.min(1, Math.max(0, t));
const halus = (t) => t * t * t * (t * (t * 6 - 15) + 10); // smootherstep: awal dan akhirnya lebih landai dari smoothstep

/**
 * SATU logo Topaz yang bergerak mengikuti scroll: mulai di Hero, lalu bergeser ke samping judul tiap bagian
 * (Panduan, Layanan, ...). Tidak ada lompatan: target posisi, ukuran, kemiringan, dan keburaman dihitung dari posisi
 * gulir, dan logo menyusul targetnya dengan sedikit kelembaman, jadi gerakannya mengalir lembut dan tetap kembali
 * mundur kalau digulir balik. Di tiap judul logo diam sejenak, lalu meluncur ke judul berikutnya sambil berputar satu
 * putaran penuh. Titik tujuannya adalah elemen kosong [data-tz-anchor] di Hero dan di tiap judul bagian (posisi,
 * ukuran, --rot, --op dibaca dari CSS-nya). Koordinat relatif ke <main>. Dekoratif: aria-hidden, tidak bisa diklik.
 */
export default function LogoTerbang() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    const main = el?.parentElement;
    if (!el || !main) return;

    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const k = kurangiGerak ? 1 : KELEMBAMAN;
    let frame = 0;
    let cur = null; // keadaan logo saat ini (disusulkan ke target tiap frame)

    const hitungTarget = () => {
      const anchors = [...document.querySelectorAll("[data-tz-anchor]")];
      if (!anchors.length) return null;

      const mr = main.getBoundingClientRect();
      const titik = anchors.map((a) => {
        const r = a.getBoundingClientRect();
        const cs = getComputedStyle(a);
        return {
          hero: a.dataset.tzAnchor === "hero",
          cx: r.left - mr.left + r.width / 2,
          cy: r.top - mr.top + r.height / 2,
          s: r.width / UKURAN_DASAR,
          rot: parseFloat(cs.getPropertyValue("--rot")) || 0,
          op: parseFloat(cs.getPropertyValue("--op")) || 1,
        };
      });

      // Garis acuan dalam koordinat <main>; cari ruas (titik i → titik i+1) yang sedang dilewati.
      const acuan = window.innerHeight * GARIS_ACUAN - mr.top;
      let i = -1;
      titik.forEach((p, idx) => {
        if (p.cy <= acuan) i = idx;
      });

      if (i < 0) return { ...titik[0] };
      if (i >= titik.length - 1) return { ...titik[titik.length - 1] };

      const a = titik[i];
      const b = titik[i + 1];
      const jarak = b.cy - a.cy;
      const t = jarak > 0 ? klem((acuan - a.cy) / jarak) : 1;
      const e = halus(klem((t - DIAM) / (1 - 2 * DIAM))); // diam di judul sendiri, bergerak di tengah ruas
      return {
        hero: a.hero && e < 0.5,
        cx: lerp(a.cx, b.cx, e),
        cy: lerp(a.cy, b.cy, e),
        s: lerp(a.s, b.s, e),
        // satu putaran penuh selama perjalanan; mendarat tegak
        rot: lerp(a.rot, b.rot, e) + (kurangiGerak ? 0 : 360 * e),
        op: lerp(a.op, b.op, e),
      };
    };

    const tick = () => {
      frame = 0;
      const target = hitungTarget();
      if (!target) return;
      if (!cur) cur = { ...target }; // pemasangan pertama langsung di tempat, tanpa menyusul dari pojok

      const selisih =
        Math.abs(target.cx - cur.cx) + Math.abs(target.cy - cur.cy) + Math.abs(target.rot - cur.rot) * 0.5 +
        Math.abs(target.s - cur.s) * 100 + Math.abs(target.op - cur.op) * 50;

      if (selisih < 0.05) {
        cur = { ...target };
      } else {
        cur.cx = lerp(cur.cx, target.cx, k);
        cur.cy = lerp(cur.cy, target.cy, k);
        cur.s = lerp(cur.s, target.s, k);
        cur.rot = lerp(cur.rot, target.rot, k);
        cur.op = lerp(cur.op, target.op, k);
      }
      cur.hero = target.hero;

      el.style.transform = `translate(${cur.cx - UKURAN_DASAR / 2}px, ${cur.cy - UKURAN_DASAR / 2}px) rotate(${cur.rot}deg) scale(${cur.s})`;
      el.style.opacity = String(cur.op);
      el.classList.toggle("tz-terbang-hero", !!cur.hero);

      // lanjut menyusul sampai tiba di target (terus berjalan selama masih ada selisih)
      if (selisih >= 0.05) frame = requestAnimationFrame(tick);
    };

    const jadwalkan = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };

    tick();
    window.addEventListener("scroll", jadwalkan, { passive: true });
    window.addEventListener("resize", jadwalkan);
    // tinggi halaman berubah saat data dimuat / animasi masuk selesai: hitung ulang titik tujuannya
    const ro = new ResizeObserver(jadwalkan);
    ro.observe(main);
    const t = [300, 1200, 3000].map((ms) => setTimeout(jadwalkan, ms));

    return () => {
      window.removeEventListener("scroll", jadwalkan);
      window.removeEventListener("resize", jadwalkan);
      ro.disconnect();
      t.forEach(clearTimeout);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={ref} className="tz-terbang" aria-hidden="true">
      <span className="tz-terbang-glow" />
      <img src="/LogoTopaz.svg" alt="" className="tz-terbang-img" />
    </div>
  );
}
