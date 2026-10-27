"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";

/* Warna cadangan kalau sebuah area RT di file GeoJSON belum diberi `warna`. */
const PALET = ["#0D9488", "#1D4ED8", "#B45309", "#7C3AED", "#BE123C", "#4D7C0F", "#0369A1", "#A21CAF"];
/* Warna tiap blok rumah (satu nama blok = satu warna, walau areanya terpisah). */
const PALET_BLOK = [
  "#2563EB", "#F59E0B", "#DC2626", "#92400E", "#0891B2", "#65A30D", // tanpa ungu: ungu dipakai fasilitas umum
  "#DB2777", "#EA580C", "#4F46E5", "#0D9488", "#CA8A04", "#475569",
];
/* Warna fasilitas umum: tiap nama beda. Urutan cek: properti `warna` > kata kunci nama > palet otomatis. */
const WARNA_FAS_KATA = [
  [/masjid|musholla|mushola/i, "#047857"],
  [/taman|lapangan/i, "#16A34A"],
  [/danau|kolam|sungai/i, "#0EA5E9"],
  [/posyandu|puskesmas|klinik/i, "#E11D48"],
  [/bank sampah/i, "#7C3AED"],
  [/satpam|pos/i, "#1F2937"],
  [/saung/i, "#D946EF"],
];
const PALET_FAS = ["#EA580C", "#0F766E", "#BE185D", "#4338CA", "#A16207", "#0369A1"];
const warnaFasilitas = (nama, props, urutan) =>
  props.warna ||
  props.fill ||
  (WARNA_FAS_KATA.find(([re]) => re.test(nama)) ?? [])[1] ||
  PALET_FAS[urutan % PALET_FAS.length];
const ZOOM_LABEL_FAS = 18; // label fasilitas baru tampil dari zoom ini ke atas

const SUMBER = "/peta-rt.geojson";
const SUMBER_BLOK = "/peta-blok.geojson"; // opsional: batas tiap blok rumah (properti `blok`, mis. "E3")
const SUMBER_FAS = "/peta-fasilitas.geojson"; // opsional: masjid, bank sampah, posyandu, dll. (properti `fasilitas`)

const ambil = (url) =>
  fetch(url, { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => (data?.features ?? []).filter((x) => x?.geometry))
    .catch(() => []);

/* Hover hanya berlaku di perangkat dengan mouse. Di layar sentuh, mouseover tidak pernah dilepas dan
   sorotan lama akan menempel serta menimpa pilihan. */
const bisaHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* "E2" < "E10": urut dengan angka, bukan huruf. */
const urutAlami = (a, b) => a.localeCompare(b, "id", { numeric: true });

export default function PetaRt() {
  const wadahRef = useRef(null);
  const petaRef = useRef(null);
  const grupRef = useRef({}); // { rt, blok, fas } = featureGroup Leaflet
  const rtRef = useRef({}); // id -> { layer, warna }
  const blokRef = useRef({}); // nama -> { layers: [], warna }
  const fasRef = useRef({}); // nama -> [layer]
  const penundaRef = useRef(null);

  const [data, setData] = useState({ rt: [], blok: [], fas: [] });
  const [dimuat, setDimuat] = useState(false);
  const [tampilan, setTampilan] = useState("rt"); // "rt" | "blok"
  const [daftarRt, setDaftarRt] = useState([]); // [{ id, nama, warna, keterangan }]
  const [daftarBlok, setDaftarBlok] = useState([]); // [{ id, nama, warna }]
  const [daftarFas, setDaftarFas] = useState([]); // [{ id, nama, warna }]
  const [aktif, setAktif] = useState(null); // sorotan sementara (hover): { jenis: "rt" | "blok" | "fas", id }
  const [dipilih, setDipilih] = useState(null); // pilihan tetap (klik/ketuk): { jenis, id }

  /* Tahap 1: ambil data. Tanpa data RT, bagian ini tidak ditampilkan sama sekali. */
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

  /* Tahap 2: setelah wadah peta tampil di halaman, bangun petanya (sekali). */
  useEffect(() => {
    if (!dimuat || data.rt.length === 0) return;
    let batal = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (batal || !wadahRef.current) return;

      // zoomSnap kecil: fitBounds bisa pas ke area cluster, tidak dibulatkan ke zoom bulat yang terlalu jauh.
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
      // Peta jalan jadi tampilan awal: bentuk tiap bangunan lebih jelas. Satelit tinggal pilih.
      jalan.addTo(peta);
      L.control.layers({ Jalan: jalan, Satelit: satelit }, null, { position: "topright" }).addTo(peta);
      // bottomleft: pojok kanan bawah layar sering tertutup lencana "kembali ke atas" (ScrollFx)
      L.control.zoom({ position: "bottomleft", zoomInTitle: "Perbesar", zoomOutTitle: "Perkecil" }).addTo(peta);

      const grup = { rt: L.featureGroup(), blok: L.featureGroup(), fas: L.featureGroup() };
      grupRef.current = grup;

      /* Label di peta mengikuti warna areanya (dibaca CSS lewat --lab). */
      const warnai = (layer, warna) =>
        layer.on("tooltipopen", (e) => e.tooltip.getElement()?.style.setProperty("--lab", warna));

      /* --- Wilayah RT --- */
      const rtBaru = [];
      data.rt.forEach((f, i) => {
        const p = f.properties ?? {};
        // `fill`/`stroke` = kunci bawaan tab Styles di geojson.io; `warna` = kunci kita sendiri.
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

      /* --- Blok rumah: satu nama blok = satu warna --- */
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

      /* --- Fasilitas umum: tampil di kedua tampilan, tiap nama beda warna --- */
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
        fasRef.current[nama].push(layer); // nama sama (mis. beberapa taman) digabung jadi satu entri legenda
      });

      grup.rt.addTo(peta);
      grup.fas.addTo(peta);

      // Label fasilitas baru tampil kalau peta sudah di-zoom dekat; kalau tidak, labelnya bertumpuk.
      const aturLabel = () =>
        wadahRef.current?.classList.toggle("lp-peta-zoom-fas", peta.getZoom() >= ZOOM_LABEL_FAS);
      peta.on("zoomend", aturLabel);
      aturLabel();

      const pasKan = () => {
        peta.invalidateSize();
        peta.fitBounds(grup.rt.getBounds(), { padding: [30, 30], maxZoom: 19 });
      };
      pasKan();
      // Wadah peta sedang dianimasikan (Reveal) saat dibuat, ukurannya belum final: hitung ulang sesudahnya.
      penundaRef.current = setTimeout(pasKan, 900);
      // Zoom dengan roda mouse baru aktif setelah peta diklik, supaya tidak membajak scroll halaman.
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

  /* Ganti tampilan: RT atau blok (fasilitas selalu ada). */
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

  /* Sorot area yang sedang di-hover atau dipilih (dari peta atau dari daftar). */
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

  /* Klik/ketuk item di daftar: pilih + zoom ke areanya. */
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

  /* Tutup kartu info: lepas pilihan dan kembali melihat seluruh cluster. */
  const lepasPilihan = () => {
    setDipilih(null);
    const peta = petaRef.current;
    const g = grupRef.current[tampilan === "rt" ? "rt" : "blok"];
    if (peta && g?.getBounds().isValid()) peta.fitBounds(g.getBounds(), { padding: [30, 30], maxZoom: 19 });
  };

  const ganti = (t) => {
    setTampilan(t);
    setDipilih(null);
    setAktif(null); // area yang dilepas dari peta tidak sempat mengirim "mouse keluar"
  };

  if (!dimuat || data.rt.length === 0) return null;

  const adaBlok = data.blok.length > 0;
  const tampilanAktif = adaBlok ? tampilan : "rt";

  /* Keterangan untuk kartu info di atas peta. */
  const infoDari = (s) => {
    if (!s) return null;
    if (s.jenis === "rt") {
      const d = daftarRt.find((x) => x.id === s.id);
      return d && { nama: d.nama, warna: d.warna, sub: d.keterangan || "Wilayah RT" };
    }
    if (s.jenis === "blok") {
      const d = daftarBlok.find((x) => x.id === s.id);
      const n = blokRef.current[s.id]?.layers.length ?? 1;
      return d && { nama: `Blok ${d.nama}`, warna: d.warna, sub: n > 1 ? `Blok rumah · ${n} area` : "Blok rumah" };
    }
    const d = daftarFas.find((x) => x.id === s.id);
    const n = fasRef.current[s.id]?.length ?? 1;
    return d && { nama: d.nama, warna: d.warna, sub: n > 1 ? `Fasilitas umum · ${n} lokasi` : "Fasilitas umum" };
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
                Peta Cluster Topaz
                {/* titik tujuan logo menempel di kanan judul, sejajar tulisan (lihat .tz-anchor-sebaris) */}
                <span className="tz-anchor tz-anchor-sebaris tz-v-f" data-tz-anchor="f" aria-hidden="true" />
              </h2>
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
                          {(blokRef.current[d.id]?.layers.length ?? 1) > 1 && (
                            <small>{blokRef.current[d.id].layers.length} area</small>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}

              </ul>

              {/* Fasilitas umum: grup tersendiri (di HP jadi baris di bawah daftar RT/blok, bukan menyambung) */}
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
