"use client";

import Link from "next/link";
import FitText from "@/components/ui/FitText";

// tone StatCard -> varian warna .keu-card (dipakai juga oleh Keuangan/Iuran/Setoran).
const TONE_KEU = {
  teal: "keu-teal",
  green: "keu-green",
  amber: "keu-amber",
  red: "keu-red",
  muted: "keu-muted",
  purple: "keu-purple",
};

/**
 * Kartu KPI: markup identik dengan card ringkasan di menu lain (.keu-card),
 * jadi tampilannya seragam di semua halaman.
 *
 * Seluruh card adalah link ke `href` (render <div> bila href kosong).
 */
export default function StatCard({ tone = "teal", icon, label, value, href }) {
  const Tag = href ? Link : "div";
  const tagProps = href ? { href } : {};
  return (
    <Tag
      {...tagProps}
      className={`ipl-summary-card keu-card ${TONE_KEU[tone] || TONE_KEU.teal}`}
    >
      <div className="keu-icon-circle" aria-hidden="true">
        {icon}
      </div>
      <div className="keu-card-text">
        <span className="ipl-summary-label">{label}</span>
        <FitText title={typeof value === "string" ? value : undefined}>{value}</FitText>
      </div>
    </Tag>
  );
}
