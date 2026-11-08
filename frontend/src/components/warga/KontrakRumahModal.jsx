"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { wargaApi } from "@/lib/api";
import { showMessage } from "@/lib/message";
import Select from "@/components/ui/Select";

const SETELAH = [
  { value: "KOSONG", label: "Kosong (pemilik tidak menempati)" },
  { value: "DIHUNI_TETAP", label: "Dihuni tetap (pemilik kembali tinggal)" },
];

const tgl = (d) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

export default function KontrakRumahModal({ rumah, onClose, onSelesai }) {
  const [users, setUsers] = useState([]);
  const [penyewaId, setPenyewaId] = useState("");
  const [statusSetelah, setStatusSetelah] = useState(rumah?.userId ? "DIHUNI_TETAP" : "KOSONG");
  const [menyimpan, setMenyimpan] = useState(false);

  const aktif = !!rumah?.penyewa;

  useEffect(() => {
    if (!rumah || aktif) return;
    wargaApi
      .getAllUsers()
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]));
  }, [rumah, aktif]);

  if (!rumah) return null;

  const pilihan = users
    .filter((u) => u.id !== rumah.userId)
    .map((u) => ({ value: String(u.id), label: u.namaUser }));

  const jalankan = async (aksi, pesanBerhasil) => {
    setMenyimpan(true);
    try {
      await aksi();
      showMessage("Berhasil", pesanBerhasil, "success");
      onSelesai?.();
    } catch (err) {
      showMessage("Gagal", err.message, "error");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Kontrak Penyewa · {rumah.blokRumah}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p className="field-hint" style={{ marginBottom: 12 }}>
            Pemilik: <strong>{rumah.penghuni?.namaUser ?? "belum punya akun"}</strong>
          </p>

          {aktif ? (
            <>
              <p style={{ marginBottom: 4 }}>
                Penyewa saat ini: <strong>{rumah.penyewa.namaUser}</strong>
              </p>
              {rumah.kontrakMulai && <p className="field-hint">Sejak {tgl(rumah.kontrakMulai)}</p>}
              <p className="field-hint" style={{ margin: "10px 0 14px" }}>
                Tagihan IPL baru dan notifikasi rumah ini masuk ke penyewa. Tagihan yang sudah terbit sebelum
                kontrak dan belum lunas tetap tampil di pemilik dan penyewa.
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="statusSetelah">Status rumah setelah kontrak berakhir</label>
                <Select
                  id="statusSetelah"
                  value={statusSetelah}
                  onChange={setStatusSetelah}
                  options={rumah.userId ? SETELAH : SETELAH.slice(0, 1)}
                />
              </div>
            </>
          ) : (
            <div className="form-group">
              <label className="form-label" htmlFor="penyewa">Akun penyewa</label>
              <Select
                id="penyewa"
                value={penyewaId}
                onChange={setPenyewaId}
                options={[{ value: "", label: "Pilih akun warga..." }, ...pilihan]}
              />
              <span className="field-hint">
                Belum punya akun? Buat dulu lewat Tambah Warga dengan opsi penyewa kontrak.
              </span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>Batal</button>
          {aktif ? (
            <button
              type="button"
              className="btn-primary"
              disabled={menyimpan}
              onClick={() =>
                jalankan(
                  () => wargaApi.akhiriKontrak(rumah.id, statusSetelah),
                  "Kontrak diakhiri. Tagihan berikutnya kembali ke pemilik.",
                )
              }
            >
              {menyimpan ? "Menyimpan..." : "Akhiri Kontrak"}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary"
              disabled={menyimpan || !penyewaId}
              onClick={() => jalankan(() => wargaApi.mulaiKontrak(rumah.id, Number(penyewaId)), "Kontrak dimulai.")}
            >
              {menyimpan ? "Menyimpan..." : "Mulai Kontrak"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
