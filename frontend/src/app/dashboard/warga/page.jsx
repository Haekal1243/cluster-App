"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Home,
  Users,
  Search,
  PhoneCall,
  KeyRound,
  UserCheck,
  Check,
  X as XIcon,
} from "lucide-react";
import Swal from "sweetalert2";
import { wargaApi } from "@/lib/api";
import { areaLabel, can, scopeOf } from "@/lib/session";
import { useUser } from "@/lib/useUser";
import { showConfirm, showCredentials, showMessage } from "@/lib/message";
import FilterPopover, { FilterField } from "@/components/ui/FilterPopover";
import RumahFormModal from "@/components/warga/RumahFormModal";
import WargaFormModal from "@/components/warga/WargaFormModal";

const ALL_RT = ["RT_01", "RT_02", "RT_03", "RT_04"];
const STATUS_RUMAH = {
  KOSONG: { label: "Kosong", cls: "unactived" },
  DIHUNI_TETAP: { label: "Tetap", cls: "active" },
  DIHUNI_KONTRAK: { label: "Kontrak", cls: "kontrak" },
};

const waLink = (noTelp) => {
  if (!noTelp) return null;
  const clean = noTelp.replace(/\D/g, "");
  return `https://wa.me/${clean.startsWith("0") ? `62${clean.slice(1)}` : clean}`;
};

/** Pengurus RT yang hak tulisnya berjangkauan AREA hanya boleh memilih RT-nya sendiri. */
function rtYangBoleh(user, kode) {
  if (scopeOf(user, kode) === "AREA" && user?.area && user.area !== "RW") return [user.area];
  return ALL_RT;
}

export default function WargaPage() {
  const { user } = useUser();
  const [tab, setTab] = useState("warga");
  const [warga, setWarga] = useState([]);
  const [rumah, setRumah] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterRT, setFilterRT] = useState("SEMUA");
  const [filterStatus, setFilterStatus] = useState("SEMUA");
  const [draftRT, setDraftRT] = useState("SEMUA");
  const [draftStatus, setDraftStatus] = useState("SEMUA");

  const [wargaModal, setWargaModal] = useState({ open: false, mode: "create", data: null });
  const [rumahModal, setRumahModal] = useState({ open: false, mode: "create", data: null });

  const bolehTambah = can(user, "warga.create");
  const bolehUbah = can(user, "warga.update");
  const bolehHapus = can(user, "warga.delete");
  const bolehReset = can(user, "warga.reset_password");
  const bolehApprove = can(user, "warga.approve_registrasi");
  const rtTulis = useMemo(() => rtYangBoleh(user, "warga.create"), [user]);

  const [pendaftaran, setPendaftaran] = useState([]);
  const [loadingPendaftaran, setLoadingPendaftaran] = useState(false);

  const loadPendaftaran = async () => {
    setLoadingPendaftaran(true);
    try {
      const data = await wargaApi.getPendaftaran();
      setPendaftaran(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage("Gagal Memuat Data", error.message, "error");
    } finally {
      setLoadingPendaftaran(false);
    }
  };

  useEffect(() => {
    if (bolehApprove) loadPendaftaran();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bolehApprove]);

  const handleSetujuiPendaftaran = async (item) => {
    const ok = await showConfirm(
      "Setujui pendaftaran?",
      `${item.namaUser} akan dibuatkan akun warga untuk blok ${item.rumah?.blokRumah}.`,
      "question",
      "Ya, setujui",
      "Batal",
    );
    if (!ok) return;
    try {
      const res = await wargaApi.setujuiPendaftaran(item.id);
      showMessage("Berhasil", res.message, "success");
      loadPendaftaran();
      loadData();
    } catch (error) {
      showMessage("Gagal", error.message, "error");
    }
  };

  const handleTolakPendaftaran = async (item) => {
    const { value: alasan } = await Swal.fire({
      title: `Tolak pendaftaran ${item.namaUser}?`,
      input: "textarea",
      inputLabel: "Alasan penolakan",
      inputPlaceholder: "Contoh: data tidak sesuai, atau rumah sudah dihuni warga lain",
      showCancelButton: true,
      confirmButtonText: "Tolak Pendaftaran",
      cancelButtonText: "Batal",
      inputValidator: (v) => (!v?.trim() ? "Alasan wajib diisi" : undefined),
    });
    if (!alasan) return;
    try {
      const res = await wargaApi.tolakPendaftaran(item.id, alasan.trim());
      showMessage("Berhasil", res.message, "success");
      loadPendaftaran();
    } catch (error) {
      showMessage("Gagal", error.message, "error");
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [w, r] = await Promise.all([wargaApi.getAll(), wargaApi.getAllRumah()]);
      setWarga(Array.isArray(w) ? w : []);
      setRumah(Array.isArray(r) ? r : []);
    } catch (error) {
      showMessage("Gagal Memuat Data", error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const dihuni = rumah.filter((r) => r.userId !== null);
    return {
      total: rumah.length,
      tetap: dihuni.filter((r) => r.status === "DIHUNI_TETAP").length,
      kontrak: dihuni.filter((r) => r.status === "DIHUNI_KONTRAK").length,
      kosong: rumah.length - dihuni.length,
      warga: warga.length,
    };
  }, [rumah, warga]);

  const rumahKosong = useMemo(() => rumah.filter((r) => r.userId === null), [rumah]);

  const q = search.trim().toLowerCase();

  const wargaFiltered = useMemo(
    () =>
      warga.filter((w) => {
        const matchSearch =
          !q ||
          w.namaUser.toLowerCase().includes(q) ||
          (w.username ?? "").toLowerCase().includes(q) ||
          (w.noTelp ?? "").toLowerCase().includes(q) ||
          w.rumah.some((r) => r.blokRumah.toLowerCase().includes(q));
        const matchRT = filterRT === "SEMUA" || w.rumah.some((r) => r.rt === filterRT) || w.area === filterRT;
        return matchSearch && matchRT;
      }),
    [warga, q, filterRT],
  );

  const rumahFiltered = useMemo(
    () =>
      rumah.filter((r) => {
        const matchSearch =
          !q ||
          r.blokRumah.toLowerCase().includes(q) ||
          (r.penghuni?.namaUser ?? "").toLowerCase().includes(q);
        const matchRT = filterRT === "SEMUA" || r.rt === filterRT;
        const matchStatus = filterStatus === "SEMUA" || r.status === filterStatus;
        return matchSearch && matchRT && matchStatus;
      }),
    [rumah, q, filterRT, filterStatus],
  );

  // ── Warga ──────────────────────────────────────────────────────────
  const handleSubmitWarga = async (payload) => {
    try {
      if (wargaModal.mode === "edit" && wargaModal.data) {
        await wargaApi.update(wargaModal.data.id, payload);
        showMessage("Berhasil", "Data warga berhasil diperbarui.", "success");
      } else {
        const res = await wargaApi.create(payload);
        setWargaModal({ open: false, mode: "create", data: null });
        await loadData();
        if (res.passwordAwal) {
          await showCredentials({
            title: "Akun warga dibuat",
            nama: res.data?.namaUser,
            username: res.data?.username,
            password: res.passwordAwal,
          });
        } else {
          showMessage("Berhasil", "Akun warga dan data rumah berhasil dibuat.", "success");
        }
        return;
      }
      setWargaModal({ open: false, mode: "create", data: null });
      loadData();
    } catch (error) {
      showMessage("Gagal Menyimpan", error.message, "error");
    }
  };

  const handleResetPassword = async (w) => {
    const ok = await showConfirm(
      "Atur ulang kata sandi?",
      `Kata sandi ${w.namaUser} akan diganti dengan kata sandi sementara. Warga wajib menggantinya saat masuk.`,
      "warning",
      "Ya, atur ulang",
      "Batal",
    );
    if (!ok) return;
    try {
      const res = await wargaApi.resetPassword(w.id);
      await showCredentials({
        title: "Kata sandi diatur ulang",
        nama: w.namaUser,
        username: w.username,
        password: res.passwordSementara,
      });
    } catch (error) {
      showMessage("Gagal Mengatur Ulang Kata Sandi", error.message, "error");
    }
  };

  const handleDeleteWarga = async (w) => {
    const ok = await showConfirm(
      "Hapus warga?",
      `Akun ${w.namaUser} akan dihapus dan rumahnya dikosongkan.`,
      "warning",
      "Ya, hapus",
      "Batal",
    );
    if (!ok) return;
    try {
      await wargaApi.remove(w.id);
      showMessage("Berhasil", "Warga berhasil dihapus.", "success");
      loadData();
    } catch (error) {
      showMessage("Gagal Menghapus", error.message, "error");
    }
  };

  // ── Rumah ──────────────────────────────────────────────────────────
  const handleSubmitRumah = async (payload) => {
    try {
      if (rumahModal.mode === "edit" && rumahModal.data) {
        await wargaApi.updateRumah(rumahModal.data.id, payload);
        showMessage("Berhasil", "Data rumah berhasil diperbarui.", "success");
      } else {
        await wargaApi.createRumah(payload);
        showMessage("Berhasil", "Rumah baru berhasil ditambahkan.", "success");
      }
      setRumahModal({ open: false, mode: "create", data: null });
      loadData();
    } catch (error) {
      showMessage("Gagal Menyimpan", error.message, "error");
    }
  };

  const handleDeleteRumah = async (item) => {
    const ok = await showConfirm(
      "Hapus data rumah?",
      `Rumah ${item.blokRumah} akan dihapus.`,
      "warning",
      "Ya, hapus",
      "Batal",
    );
    if (!ok) return;
    try {
      await wargaApi.deleteRumah(item.id);
      showMessage("Berhasil", "Data rumah berhasil dihapus.", "success");
      loadData();
    } catch (error) {
      showMessage("Gagal Menghapus", error.message, "error");
    }
  };

  const filterAktif = filterRT !== "SEMUA" || filterStatus !== "SEMUA";

  return (
    <div className="page-stack">
      {bolehApprove && (
        <div className="db-section-toggle" role="tablist" aria-label="Tampilan Data Warga">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "warga"}
            className={`db-toggle-btn ${tab === "warga" ? "is-active" : ""}`}
            onClick={() => setTab("warga")}
          >
            Data Warga
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "pendaftaran"}
            className={`db-toggle-btn ${tab === "pendaftaran" ? "is-active" : ""}`}
            onClick={() => setTab("pendaftaran")}
          >
            Pendaftaran Masuk{pendaftaran.length > 0 ? ` (${pendaftaran.length})` : ""}
          </button>
        </div>
      )}

      {tab === "pendaftaran" && bolehApprove ? (
        <div className="table-card">
          <div className="ipl-table-header">
            <span className="ipl-table-title">Pendaftaran Menunggu Persetujuan</span>
            <span className="ipl-table-count">{pendaftaran.length} data</span>
          </div>
          <div className="table-wrapper warga-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>No. HP</th>
                  <th>Rumah</th>
                  <th>Tanggal Daftar</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {!loadingPendaftaran &&
                  pendaftaran.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="penghuni-cell">
                          <span className="penghuni-avatar">{p.namaUser.charAt(0).toUpperCase()}</span>
                          <div>
                            <span className="penghuni-name">{p.namaUser}</span>
                            <span className="penghuni-email">{p.email || "—"}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        {p.noTelp ? (
                          <a href={waLink(p.noTelp)} target="_blank" rel="noopener noreferrer" className="wa-link">
                            <PhoneCall size={13} /> {p.noTelp}
                          </a>
                        ) : "—"}
                      </td>
                      <td>{p.rumah?.blokRumah} · {areaLabel(p.rumah?.rt)}</td>
                      <td>{new Date(p.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</td>
                      <td>
                        <div className="table-actions">
                          <button type="button" className="btn-icon" title="Setujui" aria-label="Setujui pendaftaran" onClick={() => handleSetujuiPendaftaran(p)}>
                            <Check size={15} />
                          </button>
                          <button type="button" className="btn-icon danger" title="Tolak" aria-label="Tolak pendaftaran" onClick={() => handleTolakPendaftaran(p)}>
                            <XIcon size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {loadingPendaftaran && <div className="table-loading">Memuat data pendaftaran…</div>}
          {!loadingPendaftaran && pendaftaran.length === 0 && (
            <div className="table-empty">Tidak ada pendaftaran yang menunggu persetujuan.</div>
          )}
        </div>
      ) : (
      <>
      <div className="ipl-summary-grid keu-summary-grid">
        <div className="ipl-summary-card keu-card keu-teal">
          <div className="keu-card-head">
            <div className="keu-icon-circle"><Users size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Penghuni Terdaftar</span>
          </div>
          <span className="ipl-summary-value">{stats.warga}</span>
          <span className="ipl-summary-sub">seluruh cluster</span>
        </div>
        <div className="ipl-summary-card keu-card keu-green">
          <div className="keu-card-head">
            <div className="keu-icon-circle"><Home size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Rumah Tetap</span>
          </div>
          <span className="ipl-summary-value">{stats.tetap}</span>
          <span className="ipl-summary-sub">dihuni tetap</span>
        </div>
        <div className="ipl-summary-card keu-card keu-purple">
          <div className="keu-card-head">
            <div className="keu-icon-circle"><Home size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Rumah Kontrak</span>
          </div>
          <span className="ipl-summary-value">{stats.kontrak}</span>
          <span className="ipl-summary-sub">dihuni kontrak</span>
        </div>
        <div className="ipl-summary-card keu-card keu-muted">
          <div className="keu-card-head">
            <div className="keu-icon-circle"><Home size={18} strokeWidth={2} /></div>
            <span className="ipl-summary-label">Rumah Kosong</span>
          </div>
          <span className="ipl-summary-value">{stats.kosong}</span>
          <span className="ipl-summary-sub">belum berpenghuni</span>
        </div>
      </div>

      <div className="page-toolbar-row">
        <div className="warga-filter-bar">
          <div className="warga-search-wrap">
            <Search size={15} className="warga-search-icon" />
            <input
              type="text"
              className="warga-search-input"
              placeholder="Cari nama, no. HP, atau blok…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <FilterPopover
            active={filterRT !== "SEMUA"}
            onOpen={() => {
              setDraftRT(filterRT);
            }}
            onApply={() => {
              setFilterRT(draftRT);
            }}
            onReset={() => {
              setFilterRT("SEMUA");
              setDraftRT("SEMUA");
            }}
          >
            <FilterField label="RT">
              <select className="form-control warga-filter-select" value={draftRT} onChange={(e) => setDraftRT(e.target.value)}>
                <option value="SEMUA">Semua RT</option>
                {ALL_RT.map((rt) => (
                  <option key={rt} value={rt}>{areaLabel(rt)}</option>
                ))}
              </select>
            </FilterField>
          </FilterPopover>
        </div>

        {bolehTambah && (
          <button type="button" className="btn-primary" onClick={() => setWargaModal({ open: true, mode: "create", data: null })}>
            <Plus size={16} /> Tambah Warga
          </button>
        )}
      </div>

      {/* ── Data Warga ─────────────────────────────────────────── */}
      <div className="table-card">
        <div className="ipl-table-header">
            <span className="ipl-table-title">Daftar Warga</span>
            <span className="ipl-table-count">{wargaFiltered.length} data</span>
          </div>
          <div className="table-wrapper warga-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>Akun Masuk</th>
                  <th>Rumah</th>
                  <th>Kontak</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading &&
                  wargaFiltered.map((w, index) => {
                    // Warga biasa boleh diubah; pengurus yang kebetulan tinggal di RT ini hanya bisa dilihat.
                    const bisaDiubah = w.role?.level === 3;
                    return (
                      <tr key={w.id}>
                        <td>{index + 1}</td>
                        <td>
                          <div className="penghuni-cell">
                            <span className="penghuni-avatar">{w.namaUser.charAt(0).toUpperCase()}</span>
                            <div>
                              <span className="penghuni-name">{w.namaUser}</span>
                              {!bisaDiubah && <span className="penghuni-multi-badge">{w.role?.nama}</span>}
                              {w.rumah.length > 1 && <span className="penghuni-multi-badge">{w.rumah.length} rumah</span>}
                              <span className="penghuni-email">{w.email || "—"}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="penghuni-name">{w.username}</span>
                          {w.wajibGantiPassword && <span className="penghuni-email">Belum ganti kata sandi</span>}
                        </td>
                        <td>
                          <div className="rumah-chip-list">
                            {w.rumah.length === 0 && <span className="penghuni-empty">—</span>}
                            {w.rumah.map((r) => (
                              <span key={r.id} className={`rumah-chip ${STATUS_RUMAH[r.status]?.cls}`} title={`${areaLabel(r.rt)} · ${STATUS_RUMAH[r.status]?.label}`}>
                                {r.blokRumah}
                                <em>{STATUS_RUMAH[r.status]?.label}</em>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          {w.noTelp ? (
                            <a href={waLink(w.noTelp)} target="_blank" rel="noopener noreferrer" className="wa-link" title={`Chat WhatsApp ${w.namaUser}`}>
                              <PhoneCall size={13} />
                              {w.noTelp}
                            </a>
                          ) : (
                            <span style={{ color: "var(--db-slate-400)" }}>—</span>
                          )}
                        </td>
                        <td>
                          <div className="table-actions">
                            {bisaDiubah && bolehUbah && (
                              <button type="button" className="btn-icon" title="Ubah" aria-label="Ubah warga" onClick={() => setWargaModal({ open: true, mode: "edit", data: w })}>
                                <Pencil size={15} />
                              </button>
                            )}
                            {bisaDiubah && bolehReset && (
                              <button type="button" className="btn-icon" title="Atur ulang kata sandi" aria-label="Atur ulang kata sandi" onClick={() => handleResetPassword(w)}>
                                <KeyRound size={15} />
                              </button>
                            )}
                            {bisaDiubah && bolehHapus && (
                              <button type="button" className="btn-icon danger" title="Hapus" aria-label="Hapus warga" onClick={() => handleDeleteWarga(w)}>
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          <div className="warga-grid">
            {!isLoading &&
              wargaFiltered.map((w) => (
                <div key={w.id} className="warga-grid-card">
                  <h3 className="warga-grid-title">{w.namaUser}</h3>
                  <div className="rumah-chip-list">
                    {w.rumah.map((r) => (
                      <span key={r.id} className={`rumah-chip ${STATUS_RUMAH[r.status]?.cls}`}>
                        {r.blokRumah}
                        <em>{STATUS_RUMAH[r.status]?.label}</em>
                      </span>
                    ))}
                  </div>
                  <span className="meta-item warga-grid-penghuni">{w.username}</span>
                  {w.role?.level === 3 && (
                    <div className="warga-grid-footer">
                      <div className="table-actions">
                        {bolehUbah && (
                          <button type="button" className="btn-icon" aria-label="Ubah warga" onClick={() => setWargaModal({ open: true, mode: "edit", data: w })}>
                            <Pencil size={14} />
                          </button>
                        )}
                        {bolehReset && (
                          <button type="button" className="btn-icon" aria-label="Atur ulang kata sandi" onClick={() => handleResetPassword(w)}>
                            <KeyRound size={14} />
                          </button>
                        )}
                        {bolehHapus && (
                          <button type="button" className="btn-icon danger" aria-label="Hapus warga" onClick={() => handleDeleteWarga(w)}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>

          {isLoading && <div className="table-loading">Memuat data warga…</div>}
          {!isLoading && wargaFiltered.length === 0 && (
            <div className="table-empty">
              {warga.length === 0
                ? bolehTambah
                  ? 'Belum ada warga. Klik "+ Tambah Warga" untuk membuatkan akun.'
                  : "Belum ada data warga."
                : "Tidak ada warga yang sesuai pencarian/filter."}
            </div>
          )}
        </div>
      </>
      )}

      <WargaFormModal
        open={wargaModal.open}
        mode={wargaModal.mode}
        initialData={wargaModal.data}
        allowedRts={rtTulis}
        rumahKosong={rumahKosong}
        onClose={() => setWargaModal({ open: false, mode: "create", data: null })}
        onSubmit={handleSubmitWarga}
      />
      <RumahFormModal
        open={rumahModal.open}
        mode={rumahModal.mode}
        initialData={rumahModal.data}
        allowedRts={rtTulis}
        onClose={() => setRumahModal({ open: false, mode: "create", data: null })}
        onSubmit={handleSubmitRumah}
      />
    </div>
  );
}
