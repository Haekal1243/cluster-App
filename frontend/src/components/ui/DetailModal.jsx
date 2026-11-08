"use client";

import { X } from "lucide-react";

export default function DetailModal({
  title,
  icon: Icon,
  onClose,
  foto,
  fotoAlt = "",
  judul,
  badge,
  info = [],
  kolomInfo = 2,
  deskripsiLabel = "Deskripsi",
  deskripsi,
  deskripsiKosong,
  aksi,
  children,
}) {
  return (
    <div className="ipl-modal-overlay" onClick={onClose}>
      <div className="ipl-modal ipl-modal-review detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ipl-modal-header">
          <h3>
            {Icon && <Icon size={16} />} {title}
          </h3>
          <button type="button" className="ipl-modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="ipl-modal-body">
          {foto && (
            <div className="detail-foto">
              <img src={foto} alt={fotoAlt} onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }} />
            </div>
          )}

          {(judul || badge) && (
            <div className="detail-judul-row">
              {judul && <h3 className="detail-judul">{judul}</h3>}
              {badge}
            </div>
          )}

          {info.length > 0 && (
            <div className={`review-info-grid kolom-${kolomInfo}`}>
              {info.map((it) => (
                <div key={it.label} className={`review-info-item${it.penuh ? " penuh" : ""}`}>
                  <span className="review-info-label">{it.label}</span>
                  <span className="review-info-value">{it.value}</span>
                </div>
              ))}
            </div>
          )}

          {deskripsi ? (
            <div className="review-desc-card">
              <span className="review-info-label">{deskripsiLabel}</span>
              <p className="review-desc-text">{deskripsi}</p>
            </div>
          ) : (
            deskripsiKosong && <p className="field-hint">{deskripsiKosong}</p>
          )}

          {children}

          {aksi && <div className="detail-aksi">{aksi}</div>}
        </div>
      </div>
    </div>
  );
}
