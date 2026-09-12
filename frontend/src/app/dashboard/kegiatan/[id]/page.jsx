"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { kegiatanApi } from "@/lib/api";
import { showMessage } from "@/lib/message";

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function formatEventDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function KegiatanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await kegiatanApi.getById(params.id);
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
        onClick={() => router.push("/dashboard/kegiatan")}
      >
        <ArrowLeft size={16} />
        Kembali ke daftar kegiatan
      </button>

      <div className="content-card">
        {isLoading && <p>Memuat data...</p>}

        {!isLoading && notFound && <p>Kegiatan tidak ditemukan.</p>}

        {!isLoading && data && (
          <div className="detail-card">
            {data.gambarUrl && (
              <img
                src={kegiatanApi.imageUrl(data.gambarUrl)}
                alt={data.judul}
                className="detail-image"
              />
            )}

            <div className="detail-row">
              <span className="detail-label">Judul Kegiatan</span>
              <span
                className="detail-value"
                style={{ fontSize: "1.15rem", fontWeight: 700 }}
              >
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
              <span className="detail-label">Tanggal Acara</span>
              <span className="detail-value">
                {formatEventDate(data.tanggalAcara)}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">Deskripsi</span>
              <p className="detail-value">{data.deskripsi || "-"}</p>
            </div>

            <div className="detail-meta">
              <div className="detail-row">
                <span className="detail-label">Dibuat Oleh</span>
                <span className="detail-value">{data.createBy || "-"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tanggal Dibuat</span>
                <span className="detail-value">
                  {formatDate(data.createdAt)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Diubah Oleh</span>
                <span className="detail-value">{data.updateBy || "-"}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Tanggal Diubah</span>
                <span className="detail-value">
                  {formatDate(data.updatedAt)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
