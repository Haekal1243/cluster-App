"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export const DEFAULT_PAGE_SIZE = 10;

/**
 * Kontrol pagination seragam untuk semua tabel data.
 * Hanya tampil bila totalPages > 1 (lebih dari 10 data).
 */
export default function Pagination({ page, totalPages, total, onPrev, onNext }) {
  if (!totalPages || totalPages <= 1) return null;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  return (
    <div className="list-pagination">
      <span className="list-pagination-info">
        Halaman {currentPage} dari {totalPages} · {total} data
      </span>
      <div className="list-pagination-actions">
        <button
          type="button"
          className="btn-ipl-secondary list-pagination-btn"
          disabled={currentPage <= 1}
          onClick={onPrev}
          aria-label="Halaman sebelumnya"
          title="Halaman sebelumnya"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          className="btn-ipl-secondary list-pagination-btn"
          disabled={currentPage >= totalPages}
          onClick={onNext}
          aria-label="Halaman berikutnya"
          title="Halaman berikutnya"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
