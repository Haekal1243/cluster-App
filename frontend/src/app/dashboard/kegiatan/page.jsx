"use client";

import { useState } from "react";
import PublikasiManager from "@/components/publikasi/PublikasiManager";
import KegiatanFormModal from "@/components/kegiatan/KegiatanFormModal";
import KegiatanDetailModal from "@/components/kegiatan/KegiatanDetailModal";
import FeedbackTab from "@/components/kegiatan/FeedbackTab";
import { kegiatanApi } from "@/lib/api";
import { can } from "@/lib/session";
import { useUser } from "@/lib/useUser";

const SEARCH_FIELDS = ["judul", "deskripsi"];

export default function KegiatanPage() {
  const { user, ready } = useUser();
  const [tab, setTab] = useState("daftar");
  const bolehLihatFeedback = ready && can(user, "kegiatan.feedback_lihat");

  return (
    <div className="page-stack">
      {bolehLihatFeedback && (
        <div className="db-section-toggle" role="tablist" aria-label="Daftar kegiatan atau feedback">
          <button type="button" role="tab" aria-selected={tab === "daftar"} className={`db-toggle-btn ${tab === "daftar" ? "is-active" : ""}`} onClick={() => setTab("daftar")}>
            Daftar Kegiatan
          </button>
          <button type="button" role="tab" aria-selected={tab === "feedback"} className={`db-toggle-btn ${tab === "feedback" ? "is-active" : ""}`} onClick={() => setTab("feedback")}>
            Feedback
          </button>
        </div>
      )}

      {tab === "feedback" && bolehLihatFeedback ? (
        <>
          <div className="page-toolbar">
            <div>
              <h2>Feedback Kegiatan</h2>
              <p>Penilaian dan komentar warga setelah kegiatan. Warga yang memilih anonim tidak tampil namanya.</p>
            </div>
          </div>
          <FeedbackTab user={user} />
        </>
      ) : (
        <PublikasiManager
          menu="kegiatan"
          title="Kegiatan"
          subtitle="Kegiatan RT tampil untuk warga RT nya. Ajukan ke RW agar tampil ke seluruh warga."
          noun="Kegiatan"
          searchPlaceholder="Cari judul atau deskripsi..."
          api={kegiatanApi}
          FormModal={KegiatanFormModal}
          DetailModal={KegiatanDetailModal}
          dateField="tanggalAcara"
          dateLabel="Acara"
          searchFields={SEARCH_FIELDS}
        />
      )}
    </div>
  );
}
