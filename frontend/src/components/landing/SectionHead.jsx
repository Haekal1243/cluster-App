import Reveal from "./Reveal";
import LogoMuncul from "./LogoMuncul";

const SISI = { a: "kanan", b: "kiri", c: "kiri", d: "kanan", e: "kiri", g: "kanan" };

export default function SectionHead({ label, title, lead, dark = false, varian = "a", sebaris = false, children }) {
  return (
    <div className={`sh-wrap sh-v-${varian} sh-${SISI[varian] ?? "kiri"}`}>
      <LogoMuncul sisi={SISI[varian] ?? "kiri"} />
      <Reveal variant="blur">
        <div className={`sh${dark ? " sh-dark" : ""}`}>
          <div className="sh-teks">
            <p className="sh-kicker">{label}</p>
            <h2 className="sh-title">
              {title}
            </h2>
            {lead && <p className="sh-lead">{lead}</p>}
          </div>
          {children}
        </div>
      </Reveal>
    </div>
  );
}
