import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import { panduan } from "@/lib/landing-data";

export default function Panduan({ items = panduan }) {
  return (
    <section id="panduan" className="lp-section tz-terang">
      <div className="tz-wrap">
        <SectionHead varian="a" label="Cara memakai portal" title="Tiga langkah, dari akun sampai selesai" />

        <ol className="tz-steps">
          {items.map((s, i) => (
            <li key={s.no}>
              <Reveal variant="zoom" delay={i * 140} style={{ height: "100%" }}>
                <div className="tz-step lp-card">
                  <span className="tz-step-no" aria-hidden="true">{String(s.no).padStart(2, "0")}</span>
                  <h3>{s.judul}</h3>
                  <p>{s.isi}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
