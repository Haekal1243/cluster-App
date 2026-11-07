"use client";

import { useState } from "react";
import Reveal from "./Reveal";
import SectionHead from "./SectionHead";
import { faq } from "@/lib/landing-data";

export default function Faq({ items = faq }) {
  const [active, setActive] = useState(null);

  return (
    <section id="faq" className="lp-section tz-terang">
      <div className="tz-wrap tz-wrap-sempit">
        <SectionHead varian="g" label="Pertanyaan umum" title="Yang sering ditanyakan warga" />

        <div className="tz-faq">
          {items.map((f, i) => {
            const open = active === i;
            return (
              <Reveal key={i} delay={i * 70}>
                <div className={`tz-faq-item${open ? " tz-faq-item-buka" : ""}`}>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`faq-isi-${i}`}
                    onClick={() => setActive(open ? null : i)}
                    className="tz-faq-btn"
                  >
                    <span className="tz-faq-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                    <span className="tz-faq-tanya">{f.q}</span>
                    <span className="tz-faq-ikon" aria-hidden="true" />
                  </button>
                  <div id={`faq-isi-${i}`} className="tz-faq-isi" hidden={!open}>
                    <p>{f.a}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
