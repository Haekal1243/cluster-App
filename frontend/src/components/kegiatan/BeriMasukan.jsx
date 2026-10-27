"use client";

import { useEffect, useState } from "react";
import { kegiatanApi } from "@/lib/api";
import { can } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showMessage } from "@/lib/message";
import { BintangInput } from "./Bintang";

const MAKS_KOMENTAR = 500;

/**
 * Panel masukan di dalam detail kegiatan: bintang + komentar + anonim.
 * Hanya tampil kalau kegiatannya sudah berlangsung dan user punya izin memberi masukan.
 */
export default function BeriMasukan({ kegiatan }) {
  const { user } = useUser();
  const sudahLewat = new Date(kegiatan.tanggalAcara) <= new Date();
  const bolehBeri = !!user && can(user, "kegiatan.feedback_beri");
  const boleh = bolehBeri && sudahLewat;

  const [status, setStatus] = useState("memuat"); // memuat | bisa | tutup
  const [pernah, setPernah] = useState(false);
  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState("");
  const [anonim, setAnonim] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  // Masukan milik sendiri ikut dimuat supaya form berisi nilai sebelumnya (bisa diubah).
  useEffect(() => {
    if (!boleh) return;
    let batal = false;
    kegiatanApi
      .feedbackBisaDiberi()
      .then((daftar) => {
        if (batal) return;
        const ini = daftar.find((k) => k.id === kegiatan.id);
        if (!ini) return setStatus("tutup"); // lewat batas waktu memberi masukan
        if (ini.feedbackSaya) {
          setPernah(true);
          setRating(ini.feedbackSaya.rating);
          setKomentar(ini.feedbackSaya.komentar ?? "");
          setAnonim(ini.feedbackSaya.anonim);
        }
        setStatus("bisa");
      })
      .catch(() => !batal && setStatus("tutup"));
    return () => { batal = true; };
  }, [boleh, kegiatan.id]);

  // Belum berlangsung: kasih tahu kapan formnya muncul, supaya tidak dikira hilang.
  if (bolehBeri && !sudahLewat) {
    return <p className="fb-sub fb-panel-info">Penilaian dan komentar bisa diberikan di sini setelah kegiatan selesai.</p>;
  }
  if (!boleh || status !== "bisa") return null;

  const kirim = async (e) => {
    e.preventDefault();
    if (!rating) {
      showMessage("Pilih Bintang", "Beri nilai 1 sampai 5 bintang dulu ya.", "warning");
      return;
    }
    setMenyimpan(true);
    try {
      const res = await kegiatanApi.feedbackBeri(kegiatan.id, { rating, komentar: komentar.trim(), anonim });
      setPernah(true);
      showMessage("Berhasil", res.message, "success");
    } catch (err) {
      showMessage("Gagal Mengirim", err.message, "error");
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <form className="fb-panel" onSubmit={kirim}>
      <h4>{pernah ? "Masukan Anda" : "Bagaimana kegiatannya?"}</h4>
      <p className="fb-sub">Masukan hanya dibaca pengurus.</p>

      <BintangInput value={rating} onChange={setRating} />

      <textarea
        className="form-control"
        rows={3}
        maxLength={MAKS_KOMENTAR}
        placeholder="Komentar (boleh dikosongkan): apa yang sudah baik, atau yang bisa diperbaiki?"
        value={komentar}
        onChange={(e) => setKomentar(e.target.value)}
        aria-label="Komentar"
      />

      <label className="fb-anonim-cek">
        <input type="checkbox" checked={anonim} onChange={(e) => setAnonim(e.target.checked)} />
        <span>
          Kirim sebagai anonim
          <small>Nama Anda tidak ditampilkan ke pengurus.</small>
        </span>
      </label>

      <button type="submit" className="btn-primary" disabled={menyimpan}>
        {menyimpan ? "Mengirim..." : pernah ? "Simpan Perubahan" : "Kirim Masukan"}
      </button>
    </form>
  );
}
