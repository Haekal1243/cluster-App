"use client";

import { Star } from "lucide-react";

/** Tampilan bintang read-only (mendukung nilai desimal untuk rata-rata, dibulatkan ke bintang terdekat). */
export function BintangTampil({ nilai, size = 14 }) {
  const bulat = Math.round(nilai);
  return (
    <span className="fb-bintang" role="img" aria-label={`${nilai} dari 5 bintang`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= bulat ? "fb-bintang-on" : "fb-bintang-off"} />
      ))}
    </span>
  );
}

const LABEL = ["", "Kurang", "Cukup", "Baik", "Bagus", "Sangat bagus"];

/** Input bintang 1–5 (klik / keyboard). */
export function BintangInput({ value, onChange, size = 30, disabled = false }) {
  return (
    <div className="fb-bintang-input" role="radiogroup" aria-label="Penilaian">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} bintang`}
          disabled={disabled}
          className="fb-bintang-btn"
          onClick={() => onChange(n)}
        >
          <Star size={size} className={n <= value ? "fb-bintang-on" : "fb-bintang-off"} />
        </button>
      ))}
      <span className="fb-bintang-label">{value ? LABEL[value] : "Pilih bintang"}</span>
    </div>
  );
}
