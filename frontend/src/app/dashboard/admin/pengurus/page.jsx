"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { UserCog, UserMinus, UserPlus, X } from "lucide-react";
import { pengurusApi } from "@/lib/api";
import { areaLabel } from "@/lib/session";
import { showConfirm, showMessage } from "@/lib/message";

const URUTAN_AREA = ["RW", "RT_01", "RT_02", "RT_03", "RT_04"];

function TetapkanModal({ slot, onClose, onSubmit }) {
  const [kandidat, setKandidat] = useState(null);
  const [userId, setUserId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    pengurusApi
      .getKandidat(slot.area)
      .then(setKandidat)
      .catch((err) => {
        showMessage("Gagal Memuat Warga", err.message, "error");
        onClose();
      });
    // onClose berubah tiap render induk; cukup sekali per slot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.area]);

  const submit = async (e) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      await onSubmit(Number(userId));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>{slot.role.nama} {areaLabel(slot.area)}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup"><X size={18} /></button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {slot.pemegang && (
              <p className="field-hint" style={{ marginBottom: 10 }}>
                Saat ini dijabat <b>{slot.pemegang.namaUser}</b>. Bila diganti, yang bersangkutan otomatis kembali
                menjadi warga biasa.
              </p>
            )}
            <div className="form-group">
              <label htmlFor="kandidat">Pilih warga <span className="required-star">*</span></label>
              <select id="kandidat" className="form-control" value={userId} onChange={(e) => setUserId(e.target.value)} disabled={!kandidat} required>
                <option value="">{kandidat ? "— Pilih warga —" : "Memuat..."}</option>
                {(kandidat ?? []).map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.namaUser} · {areaLabel(k.area)}{k.rumah?.length ? ` · ${k.rumah.map((r) => r.blokRumah).join(", ")}` : ""}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                {slot.role.level === 2
                  ? `Hanya warga ${areaLabel(slot.area)} yang bisa menjadi ${slot.role.nama}.`
                  : "Pengurus RW dipilih dari seluruh warga."}
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-outline-neutral" onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving || !userId}>{saving ? "Menyimpan..." : "Tetapkan"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PengurusPage() {
  const [slots, setSlots] = useState(null);
  const [tetapkan, setTetapkan] = useState(null);

  const load = useCallback(async () => {
    try {
      setSlots(await pengurusApi.getSlots());
    } catch (err) {
      showMessage("Gagal Memuat Data", err.message, "error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const perArea = useMemo(() => {
    const map = new Map(URUTAN_AREA.map((a) => [a, []]));
    for (const s of slots ?? []) map.get(s.area)?.push(s);
    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [slots]);

  const submitTetapkan = async (userId) => {
    try {
      const res = await pengurusApi.tetapkan({ roleId: tetapkan.role.id, area: tetapkan.area, userId });
      showMessage("Berhasil", res.message, "success");
      setTetapkan(null);
      load();
    } catch (err) {
      showMessage("Gagal Menetapkan", err.message, "error");
    }
  };

  const kosongkan = async (slot) => {
    const ok = await showConfirm(
      "Kosongkan jabatan?",
      `${slot.pemegang.namaUser} dilepas dari ${slot.role.nama} ${areaLabel(slot.area)} dan kembali menjadi warga biasa.`,
      "warning",
      "Ya, kosongkan",
      "Batal",
    );
    if (!ok) return;
    try {
      const res = await pengurusApi.kosongkan({ roleId: slot.role.id, area: slot.area });
      showMessage("Berhasil", res.message, "success");
      load();
    } catch (err) {
      showMessage("Gagal", err.message, "error");
    }
  };

  if (!slots) return <div className="table-loading">Memuat data pengurus...</div>;

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <div>
          <h2>Pengurus RW &amp; RT</h2>
          <p>
            Tetapkan siapa yang menjabat ketua, bendahara, dan sekretaris di RW serta tiap RT. Satu jabatan satu
            orang per wilayah; pemegang lama otomatis kembali menjadi warga.
          </p>
        </div>
      </div>

      <div className="pengurus-grid">
        {perArea.map(([area, list]) => (
          <div key={area} className="content-card pengurus-card">
            <div className="db-section-header">
              <UserCog size={17} />
              <h3>{area === "RW" ? "Pengurus RW" : `Pengurus ${areaLabel(area)}`}</h3>
            </div>
            <ul className="pengurus-list">
              {list.map((s) => (
                <li key={`${s.role.id}-${s.area}`} className="pengurus-item">
                  <div className="pengurus-info">
                    <span className="pengurus-role">{s.role.nama}</span>
                    {s.pemegang ? (
                      <>
                        <span className="pengurus-nama">{s.pemegang.namaUser}</span>
                        <span className="pengurus-sub">{s.pemegang.username}</span>
                      </>
                    ) : (
                      <span className="pengurus-kosong">Belum ada pemegang</span>
                    )}
                  </div>
                  <div className="table-actions">
                    <button type="button" className="btn-icon" title={s.pemegang ? "Ganti pemegang" : "Tetapkan"} aria-label="Tetapkan" onClick={() => setTetapkan(s)}>
                      <UserPlus size={16} />
                    </button>
                    {s.pemegang && (
                      <button type="button" className="btn-icon danger" title="Kosongkan jabatan" aria-label="Kosongkan" onClick={() => kosongkan(s)}>
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {tetapkan && <TetapkanModal slot={tetapkan} onClose={() => setTetapkan(null)} onSubmit={submitTetapkan} />}
    </div>
  );
}
