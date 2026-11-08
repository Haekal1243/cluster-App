"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";

const PALET = ["#0D9488", "#1D4ED8", "#B45309", "#7C3AED", "#BE123C", "#4D7C0F", "#0369A1", "#A21CAF"];
const PALET_BLOK = [
  "#2563EB", "#F59E0B", "#DC2626", "#92400E", "#0891B2", "#65A30D",
  "#DB2777", "#EA580C", "#4F46E5", "#0D9488", "#CA8A04", "#475569",
];
const WARNA_FAS_KATA = [
  [/masjid|musholla|mushola/i, "#C4B5FD"],
  [/taman|lapangan/i, "#4ADE80"],
  [/posyandu|puskesmas|klinik/i, "#FDA4AF"],
  [/bank sampah/i, "#E879F9"],
  [/satpam|pos/i, "#000000"],
  [/saung/i, "#FDE047"],
];
const PALET_FAS = ["#D4D4D8", "#5EEAD4", "#FDBA74"];
const warnaFasilitas = (nama, props, urutan) =>
  props.warna ||
  props.fill ||
  (WARNA_FAS_KATA.find(([re]) => re.test(nama)) ?? [])[1] ||
  PALET_FAS[urutan % PALET_FAS.length];
const ZOOM_LABEL_FAS = 18;

const SUMBER = "/peta-rt.geojson";
const SUMBER_BLOK = "/peta-blok.geojson";
const SUMBER_FAS = "/peta-fasilitas.geojson";

const ambil = (url) =>
  fetch(url, { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => (data?.features ?? []).filter((x) => x?.geometry))
    .catch(() => []);

const bisaHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const urutAlami = (a, b) => a.localeCompare(b, "id", { numeric: true });

export default function PetaRt() {
  const wadahRef = useRef(null);
  const petaRef = useRef(null);
  const grupRef = useRef({});
  const rtRef = useRef({});
  const blokRef = useRef({});
  const fasRef = useRef({});
  const penundaRef = useRef(null);

  const [data, setData] = useState({ rt: [], blok: [], fas: [] });
  const [dimuat, setDimuat] = useState(false);
  const [tampilan, setTampilan] = useState("rt");
  const [daftarRt, setDaftarRt] = useState([]);
  const [daftarBlok, setDaftarBlok] = useState([]);
  const [daftarFas, setDaftarFas] = useState([]);
  const [aktif, setAktif] = useState(null);
  const [dipilih, setDipilih] = useState(null);

  useEffect(() => {
    let batal = false;
    Promise.all([ambil(SUMBER), ambil(SUMBER_BLOK), ambil(SUMBER_FAS)]).then(([rt, blok, fas]) => {
      if (batal) return;
      setData({ rt, blok, fas });
      setDimuat(true);
    });
    return () => {
      batal = true;
    };
  }, []);

  useEffect(() => {
    if (!dimuat || data.rt.length === 0) return;
    let batal = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (batal || !wadahRef.current) return;

      const peta = L.map(wadahRef.current, { scrollWheelZoom: false, zoomSnap: 0.25, zoomControl: false });
      petaRef.current = peta;

      const jalan = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap",
      });
      const satelit = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles &copy; Esri" }
      );
      jalan.addTo(peta);
      L.control.layers({ Jalan: jalan, Satelit: satelit }, null, { position: "topright" }).addTo(peta);
      L.control.zoom({ position: "bottomleft", zoomInTitle: "Perbesar", zoomOutTitle: "Perkecil" }).addTo(peta);

      const grup = { rt: L.featureGroup(), blok: L.featureGroup(), fas: L.featureGroup() };
      grupRef.current = grup;

      const warnai = (layer, warna) =>
        layer.on("tooltipopen", (e) => e.tooltip.getElement()?.style.setProperty("--lab", warna));

      const rtBaru = [];
      data.rt.forEach((f, i) => {
        const p = f.properties ?? {};
        const warna = p.warna || p.fill || p.stroke || PALET[i % PALET.length];
        const nama = p.rt ?? p.RT ?? p.nama ?? p.name ?? `Area ${i + 1}`;
        const id = String(p.id ?? nama ?? i);
        rtBaru.push({ id, nama, warna, keterangan: p.keterangan ?? "" });

        const layer = L.geoJSON(f, {
          style: { color: warna, weight: 2, fillColor: warna, fillOpacity: 0.35 },
        }).addTo(grup.rt);
        rtRef.current[id] = { layer, warna };
        layer.bindTooltip(nama, { permanent: true, direction: "center", className: "peta-rt-label" });
        warnai(layer, warna);
        layer.on("mouseover", () => bisaHover() && setAktif({ jenis: "rt", id }));
        layer.on("mouseout", () => setAktif(null));
        layer.on("click", () => {
          setAktif(null);
          setDipilih({ jenis: "rt", id });
          peta.fitBounds(layer.getBounds(), { padding: [40, 40] });
        });
      });

      const namaDari = (p, i) => String(p.blok ?? p.Blok ?? p.nama ?? p.name ?? `Blok ${i + 1}`).replace(/^blok\s*/i, "");
      const namaBlok = [];
      data.blok.forEach((f, i) => {
        const nama = namaDari(f.properties ?? {}, i);
        if (!blokRef.current[nama]) {
          namaBlok.push(nama);
          blokRef.current[nama] = { layers: [], warna: "" };
        }
      });
      namaBlok.sort(urutAlami);
      namaBlok.forEach((n, i) => (blokRef.current[n].warna = PALET_BLOK[i % PALET_BLOK.length]));

      data.blok.forEach((f, i) => {
        const nama = namaDari(f.properties ?? {}, i);
        const { warna } = blokRef.current[nama];
        const layer = L.geoJSON(f, {
          style: { color: warna, weight: 2, fillColor: warna, fillOpacity: 0.4 },
        }).addTo(grup.blok);
        layer.bindTooltip(nama, { permanent: true, direction: "center", className: "peta-blok-label" });
        warnai(layer, warna);
        layer.on("mouseover", () => bisaHover() && setAktif({ jenis: "blok", id: nama }));
        layer.on("mouseout", () => setAktif(null));
        layer.on("click", () => {
          setAktif(null);
          setDipilih({ jenis: "blok", id: nama });
          const ls = blokRef.current[nama].layers;
          const batas = ls[0].getBounds();
          ls.slice(1).forEach((l) => batas.extend(l.getBounds()));
          peta.fitBounds(batas, { padding: [60, 60], maxZoom: 19 });
        });
        blokRef.current[nama].layers.push(layer);
      });

      const fasBaru = [];
      data.fas.forEach((f, i) => {
        const p = f.properties ?? {};
        const nama = String(p.fasilitas ?? p.nama ?? p.name ?? `Fasilitas ${i + 1}`);
        if (!fasRef.current[nama]) {
          fasRef.current[nama] = [];
          fasBaru.push({ id: nama, nama, warna: warnaFasilitas(nama, p, fasBaru.length) });
        }
        const { warna } = fasBaru.find((x) => x.id === nama);
        const layer = L.geoJSON(f, {
          style: { color: warna, weight: 2.5, fillColor: warna, fillOpacity: 0.45 },
          pointToLayer: (_, latlng) =>
            L.circleMarker(latlng, { radius: 8, color: "#FFFFFF", weight: 2, fillColor: warna, fillOpacity: 1 }),
        }).addTo(grup.fas);
        layer.bindTooltip(nama, { permanent: true, direction: "top", offset: [0, -6], className: "peta-fas-label" });
        warnai(layer, warna);
        layer.on("mouseover", () => bisaHover() && setAktif({ jenis: "fas", id: nama }));
        layer.on("mouseout", () => setAktif(null));
        layer.on("click", () => {
          setAktif(null);
          setDipilih({ jenis: "fas", id: nama });
          const ls = fasRef.current[nama];
          const batas = ls[0].getBounds();
          ls.slice(1).forEach((l) => batas.extend(l.getBounds()));
          peta.fitBounds(batas, { padding: [60, 60], maxZoom: 19 });
        });
        fasRef.current[nama].push(layer);
      });

      grup.rt.addTo(peta);
      grup.fas.addTo(peta);

      const aturLabel = () =>
        wadahRef.current?.classList.toggle("lp-peta-zoom-fas", peta.getZoom() >= ZOOM_LABEL_FAS);
      peta.on("zoomend", aturLabel);
      aturLabel();

      const pasKan = () => {
        peta.invalidateSize();
        peta.fitBounds(grup.rt.getBounds(), { padding: [30, 30], maxZoom: 19 });
      };
      pasKan();
      penundaRef.current = setTimeout(pasKan, 900);
      peta.on("click", () => peta.scrollWheelZoom.enable());
      peta.on("mouseout", () => peta.scrollWheelZoom.disable());

      setDaftarRt(rtBaru);
      setDaftarBlok(namaBlok.map((n) => ({ id: n, nama: n, warna: blokRef.current[n].warna })));
      setDaftarFas(fasBaru);
    })();

    return () => {
      batal = true;
      clearTimeout(penundaRef.current);
      if (petaRef.current) {
        petaRef.current.remove();
        petaRef.current = null;
      }
      grupRef.current = {};
      rtRef.current = {};
      blokRef.current = {};
      fasRef.current = {};
    };
  }, [dimuat, data]);

  useEffect(() => {
    const peta = petaRef.current;
    const { rt, blok } = grupRef.current;
    if (!peta || !rt || !blok) return;
    const [tampil, sembunyi] = tampilan === "rt" ? [rt, blok] : [blok, rt];
    if (peta.hasLayer(sembunyi)) peta.removeLayer(sembunyi);
    if (!peta.hasLayer(tampil)) peta.addLayer(tampil);
    const batas = tampil.getBounds();
    if (batas.isValid()) peta.fitBounds(batas, { padding: [30, 30], maxZoom: 19 });
  }, [tampilan, daftarRt.length]);

  useEffect(() => {
    const sorot = aktif ?? dipilih;
    Object.entries(rtRef.current).forEach(([id, { layer, warna }]) => {
      const menyala = sorot?.jenis === "rt" && sorot.id === id;
      layer.setStyle({ weight: menyala ? 4 : 2, fillOpacity: menyala ? 0.6 : 0.35, color: warna, fillColor: warna });
      if (menyala) layer.bringToFront();
    });
    Object.entries(blokRef.current).forEach(([nama, { layers, warna }]) => {
      const menyala = sorot?.jenis === "blok" && sorot.id === nama;
      layers.forEach((l) => {
        l.setStyle({ weight: menyala ? 4 : 2, fillOpacity: menyala ? 0.7 : 0.4, color: warna, fillColor: warna });
        if (menyala) l.bringToFront();
      });
    });
  }, [aktif, dipilih]);

  const gabungBatas = (layers) => {
    const batas = layers[0].getBounds();
    layers.slice(1).forEach((l) => batas.extend(l.getBounds()));
    return batas;
  };

  const pilih = (jenis, id) => {
    setAktif(null);
    setDipilih({ jenis, id });
    const peta = petaRef.current;
    if (!peta) return;
    const layers =
      jenis === "rt" ? [rtRef.current[id]?.layer] : jenis === "blok" ? blokRef.current[id]?.layers : fasRef.current[id];
    const ada = (layers ?? []).filter(Boolean);
    if (ada.length) peta.fitBounds(gabungBatas(ada), jenis === "rt" ? { padding: [40, 40] } : { padding: [60, 60], maxZoom: 19 });
  };

  const lepasPilihan = () => {
    setDipilih(null);
    const peta = petaRef.current;
    const g = grupRef.current[tampilan === "rt" ? "rt" : "blok"];
    if (peta && g?.getBounds().isValid()) peta.fitBounds(g.getBounds(), { padding: [30, 30], maxZoom: 19 });
  };

  const ganti = (t) => {
    setTampilan(t);
    setDipilih(null);
    setAktif(null);
  };

  if (!dimuat || data.rt.length === 0) return null;

  const adaBlok = data.blok.length > 0;
  const tampilanAktif = adaBlok ? tampilan : "rt";

  const infoDari = (s) => {
    if (!s) return null;
    if (s.jenis === "rt") {
      const d = daftarRt.find((x) => x.id === s.id);
      return d && { nama: d.nama, warna: d.warna, sub: d.keterangan || "Wilayah RT" };
    }
    if (s.jenis === "blok") {
      const d = daftarBlok.find((x) => x.id === s.id);
      return d && { nama: `Blok ${d.nama}`, warna: d.warna, sub: "Blok rumah" };
    }
    const d = daftarFas.find((x) => x.id === s.id);
    return d && { nama: d.nama, warna: d.warna, sub: "Fasilitas umum" };
  };
  const info = infoDari(aktif ?? dipilih);

  const kelasItem = (jenis, id) => {
    const s = aktif ?? dipilih;
    return `lp-peta-item${s?.jenis === jenis && s.id === id ? " lp-peta-item-aktif" : ""}`;
  };

  return (
    <section id="peta" className="lp-section lp-peta-section">
      <div className="lp-peta-inner">
        <div className="sh-wrap">
        <Reveal variant="blur">
          <div className="lp-peta-head">
            <div className="sh-teks">
              <p className="lp-peta-kicker">Peta wilayah</p>
              <h2 className="lp-peta-title">
                Peta Cluster Topaz              </h2>
              <p className="lp-peta-lead">
                Lihat pembagian RT, blok rumah, dan fasilitas umum. Ketuk sebuah area untuk memperbesarnya.
              </p>
            </div>
            <dl className="lp-peta-stats">
              <div>
                <dt>RT</dt>
                <dd>{daftarRt.length}</dd>
              </div>
              {adaBlok && (
                <div>
                  <dt>Blok</dt>
                  <dd>{daftarBlok.length}</dd>
                </div>
              )}
              {daftarFas.length > 0 && (
                <div>
                  <dt>Fasilitas</dt>
                  <dd>{daftarFas.length}</dd>
                </div>
              )}
            </dl>
          </div>
        </Reveal>
        </div>

        {adaBlok && (
          <div className="lp-peta-tab" role="tablist" aria-label="Pilih tampilan peta" data-aktif={tampilanAktif}>
            <span className="lp-peta-tab-ind" aria-hidden="true" />
            <button type="button" role="tab" aria-selected={tampilanAktif === "rt"} onClick={() => ganti("rt")}>
              Wilayah RT
            </button>
            <button type="button" role="tab" aria-selected={tampilanAktif === "blok"} onClick={() => ganti("blok")}>
              Blok Rumah
            </button>
          </div>
        )}

        <Reveal variant="zoom">
          <div className="lp-peta-card">
            <div className="lp-peta-wrap">
              <div ref={wadahRef} className="lp-peta" />

              {info && (
                <div className="lp-peta-info" role="status">
                  <span className="lp-peta-info-dot" style={{ background: info.warna }} />
                  <span className="lp-peta-info-teks">
                    <strong>{info.nama}</strong>
                    <small>{info.sub}</small>
                  </span>
                  {dipilih && !aktif && (
                    <button type="button" className="lp-peta-info-tutup" onClick={lepasPilihan} aria-label="Tutup dan lihat semua area">
                      ×
                    </button>
                  )}
                </div>
              )}
            </div>

            <aside className="lp-peta-panel" aria-label="Daftar area">
              <div className="lp-peta-gulir">
              <p className="lp-peta-panel-judul">{tampilanAktif === "rt" ? "Daftar RT" : "Daftar blok"}</p>
              <ul className="lp-peta-list">
                {tampilanAktif === "rt" &&
                  daftarRt.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        className={kelasItem("rt", d.id)}
                        onMouseEnter={() => bisaHover() && setAktif({ jenis: "rt", id: d.id })}
                        onMouseLeave={() => setAktif(null)}
                        onClick={() => pilih("rt", d.id)}
                      >
                        <span className="lp-peta-swatch" style={{ background: d.warna }} />
                        <span className="lp-peta-item-teks">
                          <strong>{d.nama}</strong>
                          {d.keterangan && <small>{d.keterangan}</small>}
                        </span>
                      </button>
                    </li>
                  ))}

                {tampilanAktif === "blok" &&
                  daftarBlok.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        className={kelasItem("blok", d.id)}
                        onMouseEnter={() => bisaHover() && setAktif({ jenis: "blok", id: d.id })}
                        onMouseLeave={() => setAktif(null)}
                        onClick={() => pilih("blok", d.id)}
                      >
                        <span className="lp-peta-swatch" style={{ background: d.warna }} />
                        <span className="lp-peta-item-teks">
                          <strong>Blok {d.nama}</strong>
                        </span>
                      </button>
                    </li>
                  ))}

              </ul>

              {daftarFas.length > 0 && <p className="lp-peta-judul-grup">Fasilitas umum</p>}
              <ul className="lp-peta-list lp-peta-list-fas">
                {daftarFas.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className={kelasItem("fas", d.id)}
                      onMouseEnter={() => bisaHover() && setAktif({ jenis: "fas", id: d.id })}
                      onMouseLeave={() => setAktif(null)}
                      onClick={() => pilih("fas", d.id)}
                    >
                      <span className="lp-peta-swatch lp-peta-swatch-fas" style={{ background: d.warna }} />
                      <span className="lp-peta-item-teks">
                        <strong>{d.nama}</strong>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              </div>
            </aside>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
