import { getToken, clearSession } from "./session";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (error) {
    throw new Error(
      "Tidak dapat terhubung ke server. Pastikan server backend berjalan.",
      { cause: error },
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json().catch(() => null)
    : null;

  if (!response.ok) {
    if (response.status === 401) clearSession();
    const message = body?.message || "Terjadi kesalahan pada server.";
    throw new Error(Array.isArray(message) ? message.join(", ") : message);
  }

  return body;
}

/** Unduh file yang dilindungi (butuh login), lalu buka di tab baru. */
export async function openProtectedFile(path) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error("File tidak dapat dibuka.");
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function buildFormData(payload) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, value);
  });
  return formData;
}

function json(method, payload) {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload ?? {}),
  };
}

function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || v === "SEMUA") return;
    sp.set(k, v);
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ── Auth ────────────────────────────────────────────────────────────────
export const authApi = {
  login: ({ username, password }) => request("/auth/login", json("POST", { username, password })),
  me: () => request("/auth/me"),
  gantiPassword: ({ passwordLama, passwordBaru }) =>
    request("/auth/ganti-password", json("POST", { passwordLama, passwordBaru })),
};

// ── Pengumuman & Kegiatan (per area, dengan alur pengajuan ke RW) ───────
export const pengumumanApi = {
  getAll: (params) => request(`/pengumuman${qs(params)}`),
  getFeed: () => request("/pengumuman/feed"),
  getActive: ({ scope } = {}) => request(`/pengumuman/active${qs({ scope })}`),
  getById: (id) => request(`/pengumuman/${id}`),

  create: (payload) => request("/pengumuman", { method: "POST", body: buildFormData(payload) }),
  update: (id, payload) =>
    request(`/pengumuman/${id}`, { method: "PATCH", body: buildFormData(payload) }),
  updateStatus: (id, status) => request(`/pengumuman/${id}/status`, json("PATCH", { status })),
  remove: (id) => request(`/pengumuman/${id}`, { method: "DELETE" }),

  ajukan: (id) => request(`/pengumuman/${id}/ajukan`, { method: "POST" }),
  putuskanPengajuan: (id, payload) => request(`/pengumuman/${id}/pengajuan`, json("PATCH", payload)),

  fileUrl: (filename) => (filename ? `${API_BASE_URL}/uploads/pengumuman/${filename}` : null),
};

export const kegiatanApi = {
  getAll: (params) => request(`/kegiatan${qs(params)}`),
  getFeed: () => request("/kegiatan/feed"),
  getActive: ({ scope } = {}) => request(`/kegiatan/active${qs({ scope })}`),
  getPortofolio: () => request("/kegiatan/portofolio"),
  getById: (id) => request(`/kegiatan/${id}`),

  create: (payload) => request("/kegiatan", { method: "POST", body: buildFormData(payload) }),
  update: (id, payload) =>
    request(`/kegiatan/${id}`, { method: "PATCH", body: buildFormData(payload) }),
  updateStatus: (id, status) => request(`/kegiatan/${id}/status`, json("PATCH", { status })),
  remove: (id) => request(`/kegiatan/${id}`, { method: "DELETE" }),

  ajukan: (id) => request(`/kegiatan/${id}/ajukan`, { method: "POST" }),
  putuskanPengajuan: (id, payload) => request(`/kegiatan/${id}/pengajuan`, json("PATCH", payload)),

  imageUrl: (filename) => (filename ? `${API_BASE_URL}/uploads/kegiatan/${filename}` : null),
};

// ── Warga & rumah ───────────────────────────────────────────────────────
export const wargaApi = {
  getAll: ({ search, rt } = {}) => request(`/warga${qs({ search, rt })}`),
  getAllUsers: () => request("/warga/users"),
  create: (payload) => request("/warga", json("POST", payload)),
  update: (id, payload) => request(`/warga/${id}`, json("PATCH", payload)),
  remove: (id) => request(`/warga/${id}`, { method: "DELETE" }),
  resetPassword: (id) => request(`/warga/${id}/reset-password`, { method: "POST" }),

  // Rumah / blok
  getAllRumah: () => request("/warga/rumah/list"),
  createRumah: (payload) => request("/warga/rumah", json("POST", payload)),
  updateRumah: (id, payload) => request(`/warga/rumah/${id}`, json("PATCH", payload)),
  deleteRumah: (id) => request(`/warga/rumah/${id}`, { method: "DELETE" }),

  // Registrasi mandiri (Bagian 3) — dua yang pertama publik, tanpa token.
  getRumahKosong: (rt) => request(`/warga/rumah-kosong${qs({ rt })}`),
  daftarMandiri: (payload) => request("/warga/daftar", json("POST", payload)),
  getPendaftaran: (status) => request(`/warga/pendaftaran${qs({ status })}`),
  setujuiPendaftaran: (id) => request(`/warga/pendaftaran/${id}/setuju`, { method: "PATCH" }),
  tolakPendaftaran: (id, alasan) =>
    request(`/warga/pendaftaran/${id}/tolak`, json("PATCH", { alasan })),
};

export const portalApi = {
  // Portal Warga endpoints
  getRumahByUser: (userId) => request(`/warga/portal/rumah/${userId}`),
  getTagihanByRumah: (rumahId) => request(`/warga/portal/tagihan/${rumahId}`),
  getTagihanByUser: (userId, { bulan, tahun, dari, sampai, status, search } = {}) => {
    // Range diutamakan bila diberikan (mirror filter keuangan/tagihan admin)
    const params = dari || sampai ? { dari, sampai } : { bulan, tahun };
    return request(`/warga/portal/tagihan/user/${userId}${qs({ ...params, status, search })}`);
  },

  // Selalu atas nama user yang login; idUser dari klien diabaikan backend.
  uploadBuktiPembayaran: (payload) =>
    request("/warga/portal/bayar", { method: "POST", body: buildFormData(payload) }),

  buktiUrl: (filename) => (filename ? `${API_BASE_URL}/uploads/bukti-bayar/${filename}` : null),
};

// ── Tagihan IPL: warga membayar total (IPL + kas RT) ────────────────────
export const iplApi = {
  // Generate tagihan massal untuk RT pembuat: { bulanPeriode, tahunPeriode, nominalIpl, nominalKas, rt? }
  generate: (payload) => request("/ipl/generate", json("POST", payload)),

  // Filter: bulan+tahun tunggal atau range dari/sampai (YYYY-MM); rt hanya berlaku untuk scope ALL
  getAll: ({ bulan, tahun, dari, sampai, status, search, rt } = {}) => {
    const periode = dari || sampai ? { dari, sampai } : { bulan, tahun };
    return request(`/ipl${qs({ ...periode, status, search, rt })}`);
  },

  // Statistik ringkasan untuk dashboard (filter rentang periode YYYY-MM, maks 12 bulan)
  getDashboardStats: ({ dari, sampai, rt } = {}) =>
    request(`/ipl/dashboard-stats${qs({ dari, sampai, rt })}`),

  // Rekap terkumpul & disetor per RT (tampilan RW)
  getRekapRt: ({ dari, sampai } = {}) => request(`/ipl/rekap-rt${qs({ dari, sampai })}`),

  // Konfirmasi atau tolak pembayaran
  konfirmasi: (pembayaranId, payload) =>
    request(`/ipl/konfirmasi/${pembayaranId}`, json("PATCH", payload)),

  update: (id, payload) => request(`/ipl/${id}`, json("PATCH", payload)),
  remove: (id) => request(`/ipl/${id}`, { method: "DELETE" }),
};

// ── Setoran IPL: RT menyetor porsi IPL ke bendahara RW ──────────────────
export const setoranApi = {
  getSiapSetor: ({ rt } = {}) => request(`/setoran/siap-setor${qs({ rt })}`),
  create: ({ bukti, rt }) =>
    request("/setoran", { method: "POST", body: buildFormData({ bukti, rt }) }),
  getAll: ({ status, rt } = {}) => request(`/setoran${qs({ status, rt })}`),
  getById: (id) => request(`/setoran/${id}`),
  konfirmasi: (id, payload) => request(`/setoran/${id}/konfirmasi`, json("PATCH", payload)),
  buktiUrl: (filename) => (filename ? `${API_BASE_URL}/uploads/setoran/${filename}` : null),
};

export const keuanganApi = {
  // Riwayat transaksi kas manual dengan filter opsional
  getAll: ({ dari, sampai, tipe, kategori, search, area } = {}) =>
    request(`/keuangan${qs({ dari, sampai, tipe, kategori, search, area })}`),

  // Ringkasan pemasukan otomatis (kas RT / setoran IPL) + kas manual, per area
  getRingkasan: ({ dari, sampai, area } = {}) =>
    request(`/keuangan/ringkasan${qs({ dari, sampai, area })}`),

  getById: (id) => request(`/keuangan/${id}`),
  create: (payload) => request("/keuangan", { method: "POST", body: buildFormData(payload) }),
  update: (id, payload) =>
    request(`/keuangan/${id}`, { method: "PATCH", body: buildFormData(payload) }),
  remove: (id) => request(`/keuangan/${id}`, { method: "DELETE" }),

  buktiUrl: (filename) => (filename ? `${API_BASE_URL}/uploads/keuangan/${filename}` : null),
};

export const pengaduanApi = {
  getAll: () => request("/pengaduan"),
  getByUser: (userId) => request(`/pengaduan/user/${userId}`),
  getById: (id) => request(`/pengaduan/${id}`),
  getTujuanPilihan: () => request("/pengaduan/tujuan"),
  create: (payload) => request("/pengaduan", { method: "POST", body: buildFormData(payload) }),
  respond: (id, payload) => request(`/pengaduan/${id}/respond`, json("PATCH", payload)),
  imageUrl: (filename) => (filename ? `${API_BASE_URL}/uploads/pengaduan/${filename}` : null),
};

export const notifikasiApi = {
  getAll: () => request("/notifikasi"),
  markRead: (id) => request(`/notifikasi/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request("/notifikasi/read-all", { method: "PATCH" }),
};

// ── Catatan rapat: notulen per wilayah (RW / tiap RT) ───────────────────
export const catatanRapatApi = {
  getAll: ({ search, area } = {}) => request(`/catatan-rapat${qs({ search, area })}`),
  getById: (id) => request(`/catatan-rapat/${id}`),
  create: (payload) => request("/catatan-rapat", { method: "POST", body: buildFormData(payload) }),
  update: (id, payload) =>
    request(`/catatan-rapat/${id}`, { method: "PATCH", body: buildFormData(payload) }),
  remove: (id) => request(`/catatan-rapat/${id}`, { method: "DELETE" }),
  // File notulen tidak disajikan publik; dibuka lewat endpoint yang mengecek login & wilayah.
  openFile: (id) => openProtectedFile(`/catatan-rapat/${id}/file`),
};

// ── Admin: role, permission, pengurus ───────────────────────────────────
export const rbacApi = {
  getMatrix: () => request("/rbac/matrix"),
  createRole: (payload) => request("/rbac/roles", json("POST", payload)),
  updateRole: (id, payload) => request(`/rbac/roles/${id}`, json("PATCH", payload)),
  removeRole: (id) => request(`/rbac/roles/${id}`, { method: "DELETE" }),
  setRolePermissions: (id, grants) =>
    request(`/rbac/roles/${id}/permissions`, json("PUT", { grants })),
  getAudit: (limit = 100) => request(`/rbac/audit${qs({ limit })}`),
};

export const pengurusApi = {
  getSlots: () => request("/pengurus"),
  getKandidat: (area) => request(`/pengurus/kandidat${qs({ area })}`),
  tetapkan: (payload) => request("/pengurus/tetapkan", json("POST", payload)),
  kosongkan: (payload) => request("/pengurus/kosongkan", json("POST", payload)),
};
