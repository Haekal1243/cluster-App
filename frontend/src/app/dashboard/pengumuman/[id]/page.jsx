"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { pengumumanApi } from "@/lib/api";
import { showMessage } from "@/lib/message";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export default function PengumumanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await pengumumanApi.getById(params.id);
        setData(result);
      } catch (error) {
        setNotFound(true);
        showMessage("Gagal Memuat Data", error.message, "error");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) load();
  }, [params.id]);

  return (
    <div className="page-stack">
      <button
        type="button"
        className="btn-link-back"
        onClick={() => router.push("/dashboard/pengumuman")}
      >
        <ArrowLeft size={16} />
        Kembali ke daftar pengumuman
      </button>

      <div className="content-card">
        {isLoading && <p>Memuat data...</p>}

        {!isLoading && notFound && <p>Pengumuman tidak ditemukan.</p>}

        {!isLoading && data && (
          <div className="detail-card">
            <div className="detail-row">
              <span className="detail-label">Judul Pengumuman</span>
              <span className="detail-value" style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                {data.judul}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className={`status-badge ${data.status}`}>
                {data.status === "active" ? "Active" : "Unactived"}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Keterangan</span>
              <p className="detail-value">
                {data.keteranganPengumuman || "Tidak ada keterangan."}
              </p>
            </div>

            <div className="detail-row">
              <span className="detail-label">File Pengumuman</span>
              {data.filePengumuman ? (
                <a
                  className="detail-file-link"
                  href={pengumumanApi.fileUrl(data.filePengumuman)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileText size={16} />
                  {data.filePengumuman}
                </a>
              ) : (
                <span className="detail-value">Tidak ada file terlampir.</span>
              )}
            </div>

            <div className="detail-meta">
              <div className="detail-row">
                <span className="detail-label">Dibuat Oleh</span>
                <span className="detail-value">{data.createBy || "-"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tanggal Dibuat</span>
                <span className="detail-value">
                  {formatDate(data.createDate)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Diubah Oleh</span>
                <span className="detail-value">{data.updateBy || "-"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tanggal Diubah</span>
                <span className="detail-value">
                  {formatDate(data.updateDate)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
