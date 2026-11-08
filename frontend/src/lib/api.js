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

export const PROTECTED_FILE_EVENT = "protected-file:open";

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
  window.dispatchEvent(new CustomEvent(PROTECTED_FILE_EVENT, { detail: { url, type: blob.type } }));
}

export const fileUrl = (id) => (id ? `${API_BASE_URL}/files/${id}` : null);

export async function fetchProtectedFileBlob(path) {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    if (response.status === 401) clearSession();
    throw new Error("File tidak dapat diambil.");
  }
  return response.blob();
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

export const authApi = {
  login: ({ username, password, remember }) =>
    request("/auth/login", json("POST", { username, password, remember: remember === true })),
  me: () => request("/auth/me"),
  gantiPassword: ({ passwordLama, passwordBaru }) =>
    request("/auth/ganti-password", json("POST", { passwordLama, passwordBaru })),
};

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

  fileUrl: fileUrl,
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

  feedbackRekap: () => request("/kegiatan/feedback/rekap"),
  feedbackDaftar: (id) => request(`/kegiatan/${id}/feedback`),
  feedbackBisaDiberi: () => request("/kegiatan/feedback/bisa-diberi"),
  feedbackBeri: (id, payload) => request(`/kegiatan/${id}/feedback`, json("PUT", payload)),
  feedbackSembunyi: (id, disembunyikan) =>
    request(`/kegiatan/feedback/${id}/sembunyi`, json("PATCH", { disembunyikan })),

  imageUrl: fileUrl,
};

export const wargaApi = {
  getAll: ({ search, rt } = {}) => request(`/warga${qs({ search, rt })}`),
  getAllUsers: () => request("/warga/users"),
  saranUsername: ({ nama, noHp, abaikanId }) => request(`/warga/username/saran${qs({ nama, noHp, abaikanId })}`),
  cekUsername: ({ username, abaikanId }) => request(`/warga/username/cek${qs({ username, abaikanId })}`),
  create: (payload) => request("/warga", json("POST", payload)),
  update: (id, payload) => request(`/warga/${id}`, json("PATCH", payload)),
  remove: (id) => request(`/warga/${id}`, { method: "DELETE" }),
  resetPassword: (id) => request(`/warga/${id}/reset-password`, { method: "POST" }),

  ajukanHapus: (id, alasan) => request(`/warga/${id}/ajukan-hapus`, json("POST", { alasan })),
  getPengajuanHapus: (status) => request(`/warga/pengajuan-hapus${qs({ status })}`),
  setujuiHapus: (id) => request(`/warga/pengajuan-hapus/${id}/setuju`, { method: "PATCH" }),
  tolakHapus: (id, alasan) => request(`/warga/pengajuan-hapus/${id}/tolak`, json("PATCH", { alasan })),

  getAllRumah: () => request("/warga/rumah/list"),
  createRumah: (payload) => request("/warga/rumah", json("POST", payload)),
  updateRumah: (id, payload) => request(`/warga/rumah/${id}`, json("PATCH", payload)),
  deleteRumah: (id) => request(`/warga/rumah/${id}`, { method: "DELETE" }),
  mulaiKontrak: (id, penyewaId) => request(`/warga/rumah/${id}/kontrak`, json("POST", { penyewaId })),
  akhiriKontrak: (id, statusSetelah) => request(`/warga/rumah/${id}/kontrak`, json("DELETE", { statusSetelah })),

  getRumahKosong: (rt) => request(`/warga/rumah-kosong${qs({ rt })}`),
  daftarMandiri: (payload) => request("/warga/daftar", json("POST", payload)),
  getPendaftaran: (status) => request(`/warga/pendaftaran${qs({ status })}`),
  setujuiPendaftaran: (id, status) =>
    request(`/warga/pendaftaran/${id}/setuju`, json("PATCH", status ? { status } : {})),
  tolakPendaftaran: (id, alasan) =>
    request(`/warga/pendaftaran/${id}/tolak`, json("PATCH", { alasan })),
};

export const portalApi = {
  getRumahByUser: (userId) => request(`/warga/portal/rumah/${userId}`),
  getTagihanByRumah: (rumahId) => request(`/warga/portal/tagihan/${rumahId}`),
  getTagihanByUser: (userId, { bulan, tahun, dari, sampai, status, search } = {}) => {
    const params = dari || sampai ? { dari, sampai } : { bulan, tahun };
    return request(`/warga/portal/tagihan/user/${userId}${qs({ ...params, status, search })}`);
  },

  uploadBuktiPembayaran: (payload) =>
    request("/warga/portal/bayar", { method: "POST", body: buildFormData(payload) }),

  buktiPath: (pembayaranId) => (pembayaranId ? `/ipl/pembayaran/${pembayaranId}/bukti` : null),
};

export const iplApi = {
  generate: (payload) => request("/ipl/generate", json("POST", payload)),

  getAll: ({ bulan, tahun, dari, sampai, status, search, rt } = {}) => {
    const periode = dari || sampai ? { dari, sampai } : { bulan, tahun };
    return request(`/ipl${qs({ ...periode, status, search, rt })}`);
  },

  getDashboardStats: ({ dari, sampai, rt } = {}) =>
    request(`/ipl/dashboard-stats${qs({ dari, sampai, rt })}`),

  getRekapRt: ({ dari, sampai, status, rt } = {}) => request(`/ipl/rekap-rt${qs({ dari, sampai, status, rt })}`),

  konfirmasi: (pembayaranId, payload) =>
    request(`/ipl/konfirmasi/${pembayaranId}`, json("PATCH", payload)),

  update: (id, payload) => request(`/ipl/${id}`, json("PATCH", payload)),
  remove: (id) => request(`/ipl/${id}`, { method: "DELETE" }),
};

export const setoranApi = {
  getSiapSetor: ({ rt } = {}) => request(`/setoran/siap-setor${qs({ rt })}`),
  create: ({ bukti, rt }) =>
    request("/setoran", { method: "POST", body: buildFormData({ bukti, rt }) }),
  getAll: ({ status, rt, dari, sampai } = {}) => request(`/setoran${qs({ status, rt, dari, sampai })}`),
  getById: (id) => request(`/setoran/${id}`),
  konfirmasi: (id, payload) => request(`/setoran/${id}/konfirmasi`, json("PATCH", payload)),
  buktiPath: (id) => (id ? `/setoran/${id}/bukti` : null),
};

export const auditApi = {
  getAll: ({ aksi, search, dari, sampai, limit } = {}) =>
    request(`/audit${qs({ aksi, search, dari, sampai, limit })}`),
};

export const dashboardRwApi = {
  get: ({ dari, sampai } = {}) =>
    request(`/dashboard/rw${qs({ dari, sampai })}`),
};

export const keuanganApi = {
  getAll: ({ dari, sampai, tipe, kategori, search, area } = {}) =>
    request(`/keuangan${qs({ dari, sampai, tipe, kategori, search, area })}`),

  getRingkasan: ({ dari, sampai, area } = {}) =>
    request(`/keuangan/ringkasan${qs({ dari, sampai, area })}`),

  getById: (id) => request(`/keuangan/${id}`),
  exportFile: async ({ format, dari, sampai, tipe, kategori, search, area, fallbackFilename } = {}) => {
    const token = getToken();
    const response = await fetch(
      `${API_BASE_URL}/keuangan/export${qs({ format, dari, sampai, tipe, kategori, search, area })}`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    );
    if (!response.ok) {
      if (response.status === 401) clearSession();
      const body = await response.json().catch(() => null);
      const message = body?.message || "Gagal mengekspor data.";
      throw new Error(Array.isArray(message) ? message.join(", ") : message);
    }
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename =
      match?.[1] || fallbackFilename || `Laporan Kas.${format === "xlsx" ? "xlsx" : "csv"}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return filename;
  },
  create: (payload) => request("/keuangan", { method: "POST", body: buildFormData(payload) }),
  update: (id, payload) =>
    request(`/keuangan/${id}`, { method: "PATCH", body: buildFormData(payload) }),
  remove: (id) => request(`/keuangan/${id}`, { method: "DELETE" }),

  buktiPath: (id) => (id ? `/keuangan/${id}/bukti` : null),
};

export const pengaduanApi = {
  getAll: () => request("/pengaduan"),
  getByUser: (userId) => request(`/pengaduan/user/${userId}`),
  getById: (id) => request(`/pengaduan/${id}`),
  getTujuanPilihan: () => request("/pengaduan/tujuan"),
  create: (payload) => request("/pengaduan", { method: "POST", body: buildFormData(payload) }),
  respond: (id, payload) => request(`/pengaduan/${id}/respond`, json("PATCH", payload)),
  imageUrl: fileUrl,
};

export const notifikasiApi = {
  getAll: () => request("/notifikasi"),
  markRead: (id) => request(`/notifikasi/${id}/read`, { method: "PATCH" }),
  markAllRead: () => request("/notifikasi/read-all", { method: "PATCH" }),
};

export const pushApi = {
  getVapidKey: () => request("/push/vapid-public-key"),
  subscribe: (subscription) => request("/push/subscribe", json("POST", subscription)),
  unsubscribe: (endpoint) => request("/push/subscribe", json("DELETE", { endpoint })),
};

export const catatanRapatApi = {
  getAll: ({ search, area } = {}) => request(`/catatan-rapat${qs({ search, area })}`),
  getById: (id) => request(`/catatan-rapat/${id}`),
  create: (payload) => request("/catatan-rapat", { method: "POST", body: buildFormData(payload) }),
  update: (id, payload) =>
    request(`/catatan-rapat/${id}`, { method: "PATCH", body: buildFormData(payload) }),
  remove: (id) => request(`/catatan-rapat/${id}`, { method: "DELETE" }),
  openFile: (id) => openProtectedFile(`/catatan-rapat/${id}/file`),
  getFileBlob: (id) => fetchProtectedFileBlob(`/catatan-rapat/${id}/file`),
};

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
  getPublik: () => request("/pengurus/publik"),
  getSlots: () => request("/pengurus"),
  getKandidat: (area) => request(`/pengurus/kandidat${qs({ area })}`),
  tetapkan: (payload) => request("/pengurus/tetapkan", json("POST", payload)),
  kosongkan: (payload) => request("/pengurus/kosongkan", json("POST", payload)),
  uploadFoto: (userId, foto) =>
    request(`/pengurus/${userId}/foto`, { method: "POST", body: buildFormData({ foto }) }),
  setKontak: (userId, kontak) => request(`/pengurus/${userId}/kontak`, json("PATCH", { kontak })),
  hapusFoto: (userId) => request(`/pengurus/${userId}/foto`, { method: "DELETE" }),
  fotoUrl: fileUrl,
};
