"use client";

import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function RiwayatItem({ kegiatan: k, img, akanDatang }) {
  const [buka, setBuka] = useState(false);
  const masukan = k.masukan;
  const tgl = new Date(k.tanggalAcara);
  const tglPanjang = tgl.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  useEffect(() => {
    if (!buka) return;
    const onKey = (e) => e.key === "Escape" && setBuka(false);
    document.addEventListener("keydown", onKey);
    const lama = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = lama;
    };
  }, [buka]);

  return (
    <li className="rk-item rk-item-klik" onClick={() => setBuka(true)}>
      <div className="rk-date" aria-label={tglPanjang}>
        <span className="rk-day">{tgl.getDate()}</span>
        <span className="rk-month">{BULAN[tgl.getMonth()]}</span>
      </div>

      <div className="rk-text">
        {akanDatang && <span className="rk-badge">Akan datang</span>}
        <h3>
          <button type="button" className="rk-judul-btn" onClick={() => setBuka(true)}>{k.judul}</button>
        </h3>
        {k.deskripsi && <p>{k.deskripsi}</p>}
      </div>

      <div className="rk-thumb">{img && <img src={img} alt={k.judul} loading="lazy" />}</div>

      {buka && (
        <div className="rk-modal-overlay" onClick={(e) => { e.stopPropagation(); setBuka(false); }}>
          <div className="rk-modal" role="dialog" aria-modal="true" aria-label={k.judul} onClick={(e) => e.stopPropagation()}>
            <button type="button" className="rk-modal-tutup" onClick={() => setBuka(false)} aria-label="Tutup">
              <X size={18} />
            </button>
            {img && <img className="rk-modal-img" src={img} alt={k.judul} />}
            <div className="rk-modal-isi">
              {akanDatang && <span className="rk-badge">Akan datang</span>}
              <p className="rk-modal-tgl">{tglPanjang}</p>
              <h3>{k.judul}</h3>
              {k.deskripsi && <p className="rk-modal-desk">{k.deskripsi}</p>}

              {masukan && masukan.jumlah > 0 && (
                <section className="rk-fb" aria-label="Masukan warga">
                  <div className="rk-fb-head">
                    <h4>Masukan warga</h4>
                    <span className="rk-fb-rata">
                      <Star size={15} fill="currentColor" /> {String(masukan.rata).replace(".", ",")} <small>({masukan.jumlah} penilaian)</small>
                    </span>
                  </div>
                  {masukan.komentar.length > 0 ? (
                    <ul className="rk-fb-list">
                      {masukan.komentar.map((f, i) => (
                        <li key={i}>
                          <div className="rk-fb-bintang" aria-label={`${f.rating} dari 5 bintang`}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} size={13} fill={n <= f.rating ? "currentColor" : "none"} />
                            ))}
                            <span>Warga · {new Date(f.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                          <p>{f.komentar}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rk-fb-kosong">Belum ada komentar tertulis.</p>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}
