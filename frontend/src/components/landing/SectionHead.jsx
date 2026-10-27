import Reveal from "./Reveal";

/**
 * Judul bagian yang seragam di seluruh landing page: label kecil, judul besar, uraian singkat.
 * `varian` (a–g) menentukan di mana logo Topaz yang terbang mendarat di samping judul ini.
 * `sebaris`: titik tujuannya dipasang tepat di ujung kanan teks judul (logo menempel di sebelah judul, sejajar tulisan).
 * Penanda tujuan biasa (tz-anchor) sengaja di luar <Reveal> supaya posisinya tidak ikut bergeser oleh animasi masuk.
 * `children` = slot opsional di kanan judul (mis. tombol panah slider).
 */
export default function SectionHead({ label, title, lead, dark = false, varian = "a", sebaris = false, children }) {
  return (
    <div className={`sh-wrap sh-v-${varian}`}>
      {!sebaris && <span className={`tz-anchor tz-v-${varian}`} data-tz-anchor={varian} aria-hidden="true" />}
      <Reveal variant="blur">
        <div className={`sh${dark ? " sh-dark" : ""}`}>
          <div className="sh-teks">
            <p className="sh-kicker">{label}</p>
            <h2 className="sh-title">
              {title}
              {sebaris && (
                <span className={`tz-anchor tz-anchor-sebaris tz-v-${varian}`} data-tz-anchor={varian} aria-hidden="true" />
              )}
            </h2>
            {lead && <p className="sh-lead">{lead}</p>}
          </div>
          {children}
        </div>
      </Reveal>
    </div>
  );
}
