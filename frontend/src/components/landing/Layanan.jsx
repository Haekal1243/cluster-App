import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import { layanan } from "@/lib/landing-data";

const AKSES = {
  publik: "Terbuka untuk umum",
  login: "Perlu login warga",
  pengurus: "Khusus pengurus",
};

export default function Layanan({ items = layanan }) {
  return (
    <section id="layanan" className="lp-section tz-gelap">
      <div className="tz-wrap">
        <SectionHead
          dark
          varian="b"
          label="Layanan"
          title="Urusan warga yang kini bisa selesai lewat portal"
          lead="Yang dulu lewat grup WhatsApp dan catatan tangan, sekarang tercatat rapi dan bisa dipantau."
        />

        <ul className="tz-ledger">
          {items.map((s, i) => (
            <li key={s.id} id={s.id === "pengaduan" ? "pengaduan" : undefined}>
              <Reveal variant={i % 2 === 0 ? "left" : "right"} delay={i * 80}>
                <div className="tz-row">
                  <span className="tz-row-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="tz-row-judul">{s.judul}</h3>
                  <p className="tz-row-isi">{s.deskripsi}</p>
                  <span className={`tz-tag tz-tag-${s.akses}`}>{AKSES[s.akses] ?? s.akses}</span>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
